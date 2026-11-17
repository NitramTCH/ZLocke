import v4 from "../tests/fixtures/session-v4-manual.json";
import { it, expect, describe } from "vitest";
import { calcStat } from "@smogon/calc";
import { blankPokemon, newSession, parseSession } from "./battle";
import {
  SPECIES,
  selectSpecies,
  selectMove,
  MOVES,
  search,
  moveCapability,
} from "./catalog";
import {
  STAT_KEYS,
  NATURES,
  statFormula,
  statModel,
  legalScenarios,
  markStatChange,
  currentHp,
  referencePokemon,
} from "./stats";
import {
  newStatParams,
  statRecord,
  validParams,
  type StatKey,
} from "./statTypes";
import { intervalDamage, intervalSpeed, intervalOrder } from "./uncertainty";
import { predictDamage } from "./damage";
import legacy from "../tests/fixtures/session-v3-damage.json";
const ids: Record<StatKey, "hp" | "atk" | "def" | "spa" | "spd" | "spe"> = {
  hp: "hp",
  attack: "atk",
  defense: "def",
  spAttack: "spa",
  spDefense: "spd",
  speed: "spe",
};
function estimated(name = "Pikachu", level = 50) {
  const p = selectSpecies(blankPokemon(), search(SPECIES, name)[0]);
  Object.assign(p, {
    statMode: "estimated",
    level,
    burn: "none",
    paralysis: "none",
    abilityState: "none",
    itemState: "none",
  });
  return p;
}
function model(
  p: ReturnType<typeof blankPokemon>,
  policy: "zero" | "unknown" = "unknown",
) {
  const m = statModel(p, policy);
  if (!m.ok) throw Error(m.reasons.join("/"));
  return m;
}
describe("Fórmulas de ficha y fuentes", () => {
  it("contiene seis bases de cada especie y 25 naturalezas en español", () => {
    expect(NATURES).toHaveLength(25);
    for (const p of SPECIES)
      for (const k of STAT_KEYS) expect(p.baseStats[k]).toBeGreaterThan(0);
    expect(search(SPECIES, "Pikachu")[0].baseStats).toEqual({
      hp: 35,
      attack: 55,
      defense: 40,
      spAttack: 50,
      spDefense: 50,
      speed: 90,
    });
  });
  it("contrasta niveles 1/50/100, las 25 naturalezas, IV extremos y EV con Smogon", () => {
    const base = search(SPECIES, "Charizard")[0].baseStats;
    for (const level of [1, 50, 100])
      for (const n of NATURES)
        for (const iv of [0, 31])
          for (const ev of [0, 252])
            for (const k of STAT_KEYS)
              expect(statFormula(base[k], level, iv, ev, k, n)).toBe(
                calcStat(9, ids[k], base[k], iv, ev, level, n.english),
              );
  });
  it("Shedinja tiene 1 PS sin confundir una base personalizada 1 con su excepción", () => {
    let p = estimated("Shedinja");
    expect(model(p).ranges.hp).toEqual({ min: 1, reference: 1, max: 1 });
    p = { ...p, statParams: { ...p.statParams, hpRule: "standard" } };
    expect(model(p).ranges.hp!.max).toBeGreaterThan(1);
  });
  it("calculado exige datos conocidos, valida EV y no incluye modificadores temporales", () => {
    let p = estimated();
    p.statMode = "calculated";
    expect(statModel(p, "unknown").ok).toBe(false);
    p.statParams = {
      ...newStatParams(),
      natureId: 11,
      ivs: statRecord(31),
      evs: { ...statRecord(0), attack: 252, speed: 252 },
    };
    const m = model(p);
    expect(m.ranges.attack!.min).toBe(
      calcStat(9, "atk", 55, 31, 252, 50, "Adamant"),
    );
    p = {
      ...p,
      burn: "burned",
      stages: { ...p.stages, attack: 6 },
      itemState: "known",
      item: "Cinta Elección",
    };
    expect(model(p).ranges.attack).toEqual(m.ranges.attack);
    expect(validParams({ ...p.statParams, evs: statRecord(252) })).toBe(false);
  });
});
describe("Estimación legal y conservación de información", () => {
  it("no supone nivel 100 ni EV 0 en límites desconocidos", () => {
    let p = estimated();
    p.level = null;
    expect(statModel(p, "unknown")).toMatchObject({ ok: false });
    p.level = 50;
    const zero = model(p, "zero"),
      unknown = model(p);
    expect(unknown.ranges.speed!.max).toBeGreaterThan(zero.ranges.speed!.max);
    expect(unknown.reference!.ivs.speed).toBe(15);
    expect(unknown.reference!.evs.speed).toBe(0);
    expect(unknown.reference!.natureId).toBe(1);
  });
  it("datos conocidos e intervalos editables estrechan límites; no convierte EV conocidos a cero", () => {
    const p = estimated();
    const full = model(p);
    p.statParams = {
      ...p.statParams,
      natureId: 5,
      ivs: { ...p.statParams.ivs, speed: 31 },
      evs: { ...p.statParams.evs, speed: 252 },
    };
    const fixed = model(p);
    expect(fixed.ranges.speed!.min).toBe(fixed.ranges.speed!.max);
    expect(fixed.ranges.speed!.max).toBeLessThanOrEqual(full.ranges.speed!.max);
    expect(statModel(p, "zero").ok).toBe(false);
    expect(p.statParams.evs.speed).toBe(252);
  });
  it("cada escenario usa una sola naturaleza y EV legales conjuntamente", () => {
    const p = estimated("Blastoise");
    p.statParams.evs.attack = 252;
    const scenarios = [...legalScenarios(p, ["defense", "hp"], "unknown")];
    expect(scenarios.length).toBeGreaterThan(100);
    const bases = search(SPECIES, "Blastoise")[0].baseStats;
    expect(
      scenarios.every(
        (sc) =>
          Object.values(sc.evs).reduce((a, b) => a + b, 0) <= 510 &&
          STAT_KEYS.every(
            (k) =>
              sc.stats[k] ===
              statFormula(
                bases[k],
                50,
                sc.ivs[k],
                sc.evs[k],
                k,
                NATURES.find((n) => n.id === sc.natureId)!,
              ),
          ),
      ),
    ).toBe(true);
    expect(
      scenarios.some((sc) => sc.evs.hp === 252 && sc.evs.defense === 252),
    ).toBe(false);
  });
  it("subir nivel no cura PS ni borra valores manuales; pide revisión", () => {
    const p = estimated();
    p.hp = 40;
    p.maxHp = 88;
    p.attack = 777;
    p.statMode = "calculated";
    p.statParams = {
      ...newStatParams(),
      natureId: 1,
      ivs: statRecord(31),
      evs: statRecord(0),
    };
    const next = markStatChange(p, { level: 51 });
    expect(next.hp).toBe(40);
    expect(currentHp(next)).toBeNull();
    expect(next.attack).toBe(777);
    expect(referencePokemon(next, "unknown")!.maxHp).toBeGreaterThan(
      model(p).ranges.hp!.reference,
    );
    const back = markStatChange(next, { statMode: "manual" });
    expect(back.attack).toBe(777);
    expect(back.statParams).toEqual(p.statParams);
  });
  it("bases personalizadas no alteran el catálogo y persisten junto a parámetros/modo", () => {
    const s = newSession();
    s.team[0] = estimated();
    s.activeId = s.team[0].id;
    s.team[0].statParams.customBases = {
      ...SPECIES[24].baseStats,
      attack: 120,
    };
    const restored = parseSession(JSON.stringify(s));
    expect(restored.team[0].statParams.customBases!.attack).toBe(120);
    expect(search(SPECIES, "Pikachu")[0].baseStats.attack).toBe(55);
    expect(restored.evPolicy).toBe("unknown");
  });
  it("migra valores antiguos a manual y conserva desconocidos", () => {
    const s = parseSession(JSON.stringify(legacy));
    expect(s.version).toBe(5);
    expect(s.team[0].statMode).toBe("manual");
    expect(s.team[0].attack).toBe(legacy.team[0].attack);
    expect(s.team[0].statParams.ivs.attack).toBeNull();
    expect(s.team[0].statParams.evs.hp).toBeNull();
    expect(s.rival.statMode).toBe("manual");
  });
});
describe("Uso en combate sin falsas garantías", () => {
  it("velocidad: intervalo, prioridad y empate posible; aplica etapas una sola vez", () => {
    let a = estimated(),
      d = estimated();
    const m = selectMove(search(MOVES, "Placaje")[0]);
    const sa = intervalSpeed(a, "unknown");
    expect(sa.ok).toBe(true);
    expect(intervalOrder(a, d, m, m, "unknown")).toContain("se solapan");
    a.stages.speed = 6;
    expect(intervalOrder(a, d, m, m, "zero")).toContain("tu Pokémon supera");
    const speed = intervalSpeed(a, "zero");
    if (speed.ok)
      expect(speed.min).toBe(model(a, "zero").ranges.speed!.min * 4);
    const fast = { ...m, priority: 1 };
    expect(intervalOrder(d, a, fast, m, "unknown")).toContain("tu Pokémon");
  });
  it("daño incluye escenarios concretos, separa azar y estadísticas y no supone salud completa", () => {
    const a = estimated("Charizard"),
      d = estimated("Blastoise");
    const m = selectMove(search(MOVES, "Placaje")[0]);
    const r = intervalDamage(a, d, m, "zero");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.uncertainty).toBeDefined();
    expect(r.ko).toBe("unknown");
    for (const nature of [1, 2, 11])
      for (const iv of [0, 31]) {
        const ap = {
          ...a,
          statMode: "calculated" as const,
          statParams: {
            ...a.statParams,
            natureId: nature,
            ivs: statRecord(iv),
            evs: statRecord(0),
          },
        };
        const dp = {
          ...d,
          statMode: "calculated" as const,
          statParams: {
            ...d.statParams,
            natureId: nature,
            ivs: statRecord(31 - iv),
            evs: statRecord(0),
          },
        };
        const sample = predictDamage(
          referencePokemon(ap, "zero")!,
          referencePokemon(dp, "zero")!,
          m,
        );
        expect(sample.ok).toBe(true);
        if (sample.ok) {
          expect(sample.min).toBeGreaterThanOrEqual(r.min);
          expect(sample.max).toBeLessThanOrEqual(r.max);
          expect(sample.percent![0]).toBeGreaterThanOrEqual(r.percent![0]);
          expect(sample.percent![1]).toBeLessThanOrEqual(r.percent![1]);
        }
      }
  });
  it("ninguna casilla antigua convierte un especial en simple y respeta ajustes de un ID compatible", () => {
    const special = selectMove(search(MOVES, "Patada Baja")[0]);
    special.damageKind = "direct";
    special.powerMode = "number";
    special.power = 80;
    expect(moveCapability(special).canCalculate).toBe(false);
    const normal = selectMove(search(MOVES, "Placaje")[0]);
    normal.damageKind = "unknown";
    normal.power = 95;
    expect(moveCapability(normal).canCalculate).toBe(true);
    expect(moveCapability({ ...normal, catalogId: null }).canCalculate).toBe(
      false,
    );
  });
});
it("no presenta dos naturalezas ventajosas incompatibles como un solo Pokémon", () => {
  const p = estimated("Blastoise");
  p.statParams.ivs = statRecord(31);
  p.statParams.evs = statRecord(0);
  const all = [...legalScenarios(p, ["attack", "spAttack"], "zero")];
  const neutral = NATURES.find((n) => n.id === 1)!;
  const b = search(SPECIES, "Blastoise")[0].baseStats;
  const atk = statFormula(b.attack, 50, 31, 0, "attack", neutral),
    spa = statFormula(b.spAttack, 50, 31, 0, "spAttack", neutral);
  expect(
    all.some((sc) => sc.stats.attack > atk && sc.stats.spAttack > spa),
  ).toBe(false);
});
it("daño y porcentajes con EV desconocidos contienen escenarios legales de presupuestos compartidos", () => {
  const a = estimated("Charizard"),
    d = estimated("Blastoise");
  d.statParams.evs.attack = 252;
  const m = selectMove(search(MOVES, "Rayo")[0]);
  const r = intervalDamage(a, d, m, "unknown");
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.ko).toBe("unknown");
  for (const evHp of [0, 128, 252])
    for (const evDef of [0, 128, 252]) {
      if (252 + evHp + evDef > 510) continue;
      const sc = {
        ...d,
        statMode: "calculated" as const,
        statParams: {
          ...d.statParams,
          natureId: 4,
          ivs: statRecord(31),
          evs: { ...statRecord(0), attack: 252, hp: evHp, spDefense: evDef },
        },
      };
      const sample = predictDamage(
        referencePokemon(a, "unknown")!,
        referencePokemon(sc, "unknown")!,
        m,
      );
      expect(sample.ok).toBe(true);
      if (sample.ok) {
        expect(sample.min).toBeGreaterThanOrEqual(r.min);
        expect(sample.max).toBeLessThanOrEqual(r.max);
        expect(sample.percent![0]).toBeGreaterThanOrEqual(r.percent![0]);
        expect(sample.percent![1]).toBeLessThanOrEqual(r.percent![1]);
      }
    }
  for (const sc of Object.values(r.uncertainty!.witnesses))
    if (sc)
      expect(
        Object.values(sc.evs).reduce((a, b) => a + b, 0),
      ).toBeLessThanOrEqual(510);
});
it("consultar estimaciones no modifica PS, manuales, parámetros, etapas ni objetos", () => {
  const a = estimated("Charizard"),
    d = estimated("Blastoise");
  const m = selectMove(search(MOVES, "Placaje")[0]);
  const before = JSON.stringify({ a, d, m });
  intervalDamage(a, d, m, "unknown");
  intervalSpeed(a, "unknown");
  expect(JSON.stringify({ a, d, m })).toBe(before);
  const old = model(a).ranges.speed!.reference;
  a.level = 51;
  expect(model(a).ranges.speed!.reference).not.toBe(old);
});

it("v4 conserva datos reales en manual, recupera solo ID con procedencia y rechaza parámetros ilegales", () => {
  const s = parseSession(JSON.stringify(v4));
  expect(s.team[0].statMode).toBe("manual");
  expect(s.team[0].attack).toBe(v4.team[0].attack);
  expect(s.team[0].moves[0].catalogId).toBe(33);
  expect(s.rival.moves[0].catalogId).toBeNull();
  expect(s.team[0].statParams.natureId).toBeNull();
  expect(s.evPolicy).toBe("unknown");
  s.team[0].statParams.ivs.hp = 32;
  expect(() => parseSession(JSON.stringify(s))).toThrow();
});
