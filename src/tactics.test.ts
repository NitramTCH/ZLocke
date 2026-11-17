import { describe, it, expect } from "vitest";
import { blankPokemon, newSession, parseSession, type Pokemon } from "./battle";
import { selectMove, search, MOVES, selectSpecies, SPECIES } from "./catalog";
import {
  analyzeTactics,
  sortOffense,
  sortSwitches,
  moveVisibility,
  koExplanation,
} from "./tactics";
import { intervalDamage, compareActionOrder } from "./uncertainty";
import { entryScenario } from "./entry";
import { ABILITIES, ITEMS, applyEffect } from "./effects";
import { currentHp } from "./stats";
function mon(name: string): Pokemon {
  return {
    ...blankPokemon(),
    name,
    statMode: "manual",
    level: 50,
    types: ["Normal"],
    typesKnown: true,
    secondType: "none",
    hp: 100,
    maxHp: 100,
    attack: 100,
    defense: 100,
    spAttack: 100,
    spDefense: 100,
    speed: 100,
    burn: "none",
    paralysis: "none",
    abilityState: "none",
    itemState: "none",
  };
}
const move = (name: string) => selectMove(search(MOVES, name)[0]);
function fixture() {
  const s = newSession();
  const a = mon("Activo"),
    d = mon("Rival"),
    b = mon("Reserva");
  a.moves[0] = move("Placaje");
  d.moves[0] = move("Placaje");
  s.team = [a, b];
  s.activeId = a.id;
  s.rival = d;
  return s;
}
describe("Interpretación de motores, sin nuevas fórmulas", () => {
  it("debilitamiento posible/garantizado coincide con daño y PS del motor", () => {
    const s = fixture();
    let row = analyzeTactics(s).offense[0];
    expect(row.result).toEqual(
      intervalDamage(s.team[0], s.rival, s.team[0].moves[0], s.evPolicy),
    );
    if (!row.result.ok) throw Error("fixture");
    s.rival.hp = row.result.max;
    row = analyzeTactics(s).offense[0];
    expect(row.result).toMatchObject({ ok: true, ko: "possible" });
    expect(row.explanation).toContain("algunos escenarios");
    s.rival.hp = row.result.ok ? row.result.min : 0;
    row = analyzeTactics(s).offense[0];
    expect(row.result).toMatchObject({ ok: true, ko: "guaranteed" });
    expect(row.explanation).toContain(
      "todos los escenarios calculados si acierta",
    );
  });
  it("un ataque fuerte de menor prioridad no se convierte en una recomendación", () => {
    const s = fixture();
    s.team[0].moves[0] = { ...move("Placaje"), power: 200, priority: -1 };
    s.team[0].moves[1] = move("Ataque Rápido");
    s.team[0].speed = 999;
    s.rival.speed = 1;
    s.rival.hp = 1;
    const model = analyzeTactics(s);
    const row = model.offense[0];
    expect(row.result).toMatchObject({ ok: true, ko: "guaranteed" });
    expect(row.orders[0].comparison).toMatchObject({
      basis: "priority",
      relation: "rival",
    });
    expect(row.mayRivalFirst).toBe(true);
    expect(row.explanation).toContain("podría actuar antes");
    expect(sortOffense(model.offense, true)[0].index).toBe(0);
    expect(row.explanation).not.toMatch(/mejor jugada|victoria/);
  });
  it("velocidad estimada solapada y empate no determinan el orden", () => {
    const s = fixture();
    s.team[0] = selectSpecies(s.team[0], search(SPECIES, "Pikachu")[0]);
    s.rival = selectSpecies(s.rival, search(SPECIES, "Pikachu")[0]);
    s.activeId = s.team[0].id;
    s.team[0].statMode = s.rival.statMode = "estimated";
    const pair = analyzeTactics(s).offense[0].orders[0].comparison;
    expect(pair).toMatchObject({ relation: "uncertain", basis: "speed" });
    expect(pair.text).toContain("se solapan");
    s.team[0].statMode = s.rival.statMode = "manual";
    s.team[0].speed = s.rival.speed = 100;
    expect(
      compareActionOrder(
        s.team[0],
        s.rival,
        s.team[0].moves[0],
        s.rival.moves[0],
        s.evPolicy,
      ).relation,
    ).toBe("uncertain");
  });
  it("ranuras ocultas y parciales se cuentan sin inventar sets", () => {
    const s = fixture();
    s.rival.moves[1].type = "Fuego";
    s.rival.moves[2] = move("Protección");
    const r = analyzeTactics(s);
    expect(r.unrevealed).toBe(1);
    expect(r.partial).toBe(1);
    expect(r.unidentified).toBe(2);
    expect(r.threats).toHaveLength(3);
    expect(r.offense[0].mayRivalFirst).toBe(true);
    expect(moveVisibility(s.rival.moves[3])).toBe("unrevealed");
    expect(r.threats.map((x) => x.move.name)).toEqual([
      "Placaje",
      "",
      "Protección",
    ]);
  });
  it("estado/no implementado siguen visibles y no reciben daño cero ni utilidad ficticia", () => {
    const s = fixture();
    s.team[0].moves[1] = move("Protección");
    s.team[0].moves[2] = move("Patada Baja");
    s.rival.moves[0] = move("Protección");
    const r = analyzeTactics(s);
    expect(r.offense).toHaveLength(4);
    expect(r.offense[1].result.ok).toBe(false);
    expect(r.offense[1].explanation).toContain("No se puntúa su utilidad");
    expect(r.knownThreatMessage).toContain("No equivale a estar a salvo");
    expect(r.switches[0].worstMax).toBeNull();
    expect(r.switches[0].comparable).toBe(false);
  });
  it("PS desconocidos y pendientes de revisión no se tratan como completos ni como supervivencia", () => {
    const s = fixture();
    s.team[0].hp = null;
    s.rival.hp = null;
    s.team[1].hp = 0;
    s.team[1].hpReview = true;
    const r = analyzeTactics(s);
    expect(r.threats[0].result).toMatchObject({ ok: true, ko: "unknown" });
    expect(r.threats[0].remaining).toBeNull();
    expect(r.threats[0].explanation).toContain("no se concluye");
    expect(r.switches).toHaveLength(1);
    expect(r.switches[0].hp).toBeNull();
    expect(r.switches[0].warnings.join()).toContain("no se suponen completos");
  });
  it("habilidades/objetos desconocidos o manuales sin compatibilidad condicionan explicación", () => {
    const s = fixture();
    s.team[0].abilityState = "unknown";
    s.rival.itemState = "known";
    s.rival.item = "Objeto de fangame";
    const r = analyzeTactics(s);
    expect(r.data.missing.join()).toContain("no implementado");
    expect(r.data.missing.join()).toContain("desconocida");
    expect(
      r.offense[0].result.ok && r.offense[0].result.conditions.join(),
    ).toContain("Objeto de fangame");
    expect(r.offense[0].mayRivalFirst).toBe(true);
  });
});
describe("Cambios: golpe de entrada y cobertura", () => {
  it("un compañero rápido recibe el golpe y no hereda etapas del activo ni conserva sus propias etapas al entrar", () => {
    const s = fixture();
    s.team[0].stages.defense = 6;
    s.team[1].stages.defense = 6;
    s.team[1].speed = 999;
    s.rival.speed = 1;
    const r = analyzeTactics(s).switches[0];
    expect(r.entry.stages.defense).toBe(0);
    expect(r.hits[0].result).toEqual(
      intervalDamage(
        s.rival,
        entryScenario(s.team[1]),
        s.rival.moves[0],
        s.evPolicy,
      ),
    );
    expect(r.hits[0].result.ok && r.hits[0].result.max).toBeGreaterThan(0);
    expect(r.warnings.join()).toContain("su velocidad no evita ese golpe");
    expect(r.hits[0].remaining).not.toBeNull();
    expect(s.team[1].stages.defense).toBe(6);
  });
  it("excluye debilitados confirmados y conserva candidatos de PS desconocidos", () => {
    const s = fixture();
    s.team[1].hp = 0;
    s.team.push({ ...mon("Sin PS revelados"), hp: null });
    const r = analyzeTactics(s);
    expect(r.switches.map((x) => x.name)).toEqual(["Sin PS revelados"]);
    expect(r.excludedFainted).toEqual(["Reserva"]);
    expect(r.switches[0].hits[0].remaining).toBeNull();
  });
  it("inmunidades siguen separadas de tipos y dejan PS restantes sin consumir Globo", () => {
    const s = fixture();
    s.rival.moves[0] = { ...move("Terremoto") };
    s.team[1] = applyEffect(
      s.team[1],
      "item",
      ITEMS.find((x) => x.slug === "air-balloon")!,
    );
    s.team[1].itemActivation = "active";
    const before = JSON.stringify(s);
    const r = analyzeTactics(s).switches[0];
    expect(r.hits[0].result).toMatchObject({
      ok: true,
      min: 0,
      max: 0,
      immunity: "effects",
    });
    expect(r.hits[0].remaining).toEqual([100, 100]);
    expect(JSON.stringify(s)).toBe(before);
  });
  it("ordena el peor máximo de igual cobertura y deja las coberturas incompletas aparte", () => {
    const s = fixture();
    s.rival.moves[1] = move("Rayo");
    s.team.push(mon("Defensa alta"), mon("Datos parciales"));
    s.team[2].defense = 250;
    s.team[2].spDefense = 250;
    s.team[3].defense = null;
    const model = analyzeTactics(s);
    const ordered = sortSwitches(model.switches, true);
    expect(ordered[0].name).toBe("Defensa alta");
    expect(ordered[0].coverage).toBe(2);
    expect(ordered[0].expectedCoverage).toBe(2);
    expect(ordered.at(-1)?.name).toBe("Datos parciales");
    expect(ordered.at(-1)?.comparable).toBe(false);
    expect(ordered[0].worstMax).toBe(
      Math.max(...ordered[0].hits.map((x) => (x.result.ok ? x.result.max : 0))),
    );
    expect(model.switches[0].name).toBe("Reserva");
  });
  it("conserva comportamientos de entrada compatibles y declara la acción posterior sin simularla", () => {
    const s = fixture();
    s.team[1] = applyEffect(
      s.team[1],
      "ability",
      ABILITIES.find((x) => x.slug === "unburden")!,
    );
    s.team[1].abilityActivation = "active";
    s.team[1].itemState = "none";
    const r = analyzeTactics(s).switches[0];
    expect(r.entry.abilityActivation).toBe("inactive");
    expect(r.entrySpeed).toMatchObject({ ok: true, value: 100 });
    expect(r.warnings.join()).toContain("no se simula el siguiente turno");
    expect(s.team[1].abilityActivation).toBe("active");
  });
  it("consulta y ordenación no alteran datos ni el esquema de guardado", () => {
    const s = fixture();
    const before = JSON.stringify(s);
    const r = analyzeTactics(s);
    sortOffense(r.offense, true);
    sortSwitches(r.switches, true);
    expect(JSON.stringify(s)).toBe(before);
    expect(parseSession(JSON.stringify(s))).toEqual(s);
    expect(currentHp(s.team[0])).toBe(100);
    expect(koExplanation(r.threats[0].result)).toBe(r.threats[0].explanation);
  });
});
it("las amenazas posibles y garantizadas, sus PS restantes y sus motivos proceden del mismo resultado", () => {
  const s = fixture();
  const initial = analyzeTactics(s).threats[0].result;
  if (!initial.ok) throw Error("fixture");
  s.team[0].hp = initial.max;
  let row = analyzeTactics(s).threats[0];
  expect(row.result).toMatchObject({ ok: true, ko: "possible" });
  expect(row.remaining).toEqual([0, initial.max - initial.min]);
  expect(row.explanation).toContain("algunos escenarios");
  s.team[0].hp = initial.min;
  row = analyzeTactics(s).threats[0];
  expect(row.remaining).toEqual([0, 0]);
  expect(row.explanation).toContain("todos los escenarios");
});
it("los datos de orden insuficientes se explican junto a los datos de daño", () => {
  const s = fixture();
  s.team[0].paralysis = "unknown";
  s.rival.speed = null;
  const model = analyzeTactics(s);
  expect(model.offense[0].orders[0].comparison.relation).toBe("uncertain");
  expect(model.data.missing.join()).toContain("Falta confirmar parálisis");
  expect(model.data.missing.join()).toContain("Falta velocidad de la ficha");
});
