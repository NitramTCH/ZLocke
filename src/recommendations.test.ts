import { describe, it, expect } from "vitest";
import { blankPokemon, newSession, parseSession, type Pokemon } from "./battle";
import { MOVES, selectMove, selectSpecies, SPECIES } from "./catalog";
import { recommend } from "./recommendations";
import { intervalDamage } from "./uncertainty";
import { entryScenario } from "./entry";
import { ABILITIES, ITEMS, applyEffect } from "./effects";
const move = (id: number) => selectMove(MOVES.find((m) => m.id === id)!);
function mon(name: string): Pokemon {
  return {
    ...blankPokemon(),
    name,
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
function fixture() {
  const s = newSession(),
    a = mon("Activo"),
    b = mon("Reserva"),
    r = mon("Rival");
  a.speed = 200;
  b.speed = 50;
  r.speed = 100;
  a.moves[0] = move(33);
  b.moves[0] = move(33);
  r.moves[0] = move(33);
  s.team = [a, b];
  s.activeId = a.id;
  s.rival = r;
  return s;
}
function hit(s: ReturnType<typeof fixture>, p: Pokemon) {
  const r = intervalDamage(s.rival, p, s.rival.moves[0], s.evPolicy);
  if (!r.ok) throw Error("fixture");
  return r;
}
describe("Sugerencias transparentes y horizonte acotado", () => {
  it("recomienda atacar y no cambiar si resuelve antes con menor riesgo", () => {
    const s = fixture();
    s.rival.hp = 1;
    s.team[0].hp = 1;
    const r = recommend(s, "normal");
    expect(r.primary?.kind).toBe("attack");
    expect(r.primary?.preempts).toBe(true);
    expect(r.primary?.evidence[0].hpBeforeReply).toEqual([1, 1]);
    expect(r.primary?.safety).toBe("avoids");
    expect(r.action).toContain("Placaje");
  });
  it("recomienda cambiar para evitar un KO si el compañero entra y responde", () => {
    const s = fixture();
    s.team[0].hp = 1;
    s.team[0].speed = 1;
    const r = recommend(s, "normal");
    expect(r.primary?.kind).toBe("switch");
    expect(r.primary?.safety).toBe("avoids");
    expect(r.primary?.evidence[0].hpBeforeReply?.[0]).toBeGreaterThan(0);
  });
  it("compañero resiste entrada pero cae antes de responder: no se recomienda", () => {
    const s = fixture();
    s.team[0].hp = 1;
    s.team[0].speed = 1;
    s.team[1].hp = hit(s, s.team[1]).max + 1;
    const r = recommend(s, "normal"),
      o = r.options.find((o) => o.kind === "switch")!;
    expect(o.evidence[0].hpAfterEntry?.[0]).toBeGreaterThan(0);
    expect(o.evidence[0].response).toBe("none");
    expect(o.safety).toBe("falls");
    expect(r.primary).toBeNull();
  });
  it("entrada libre no cobra el golpe de entrada y evalúa un único intercambio", () => {
    const s = fixture();
    s.team[1].hp = hit(s, s.team[1]).max + 1;
    const r = recommend(s, "free");
    expect(r.primary?.kind).toBe("switch");
    expect(r.options.every((o) => o.kind === "switch")).toBe(true);
    expect(r.primary?.evidence[0].entryDamage).toBeNull();
    expect(r.primary?.evidence[0].hpAfterEntry).toEqual([
      s.team[1].hp,
      s.team[1].hp,
    ]);
  });
  it("activo debilitado fuerza entrada libre, excluye ataques y compañeros debilitados", () => {
    const s = fixture();
    s.team[0].hp = 0;
    const faint = mon("Fuera");
    faint.hp = 0;
    s.team.push(faint);
    const r = recommend(s, "normal");
    expect(r.context).toBe("free");
    expect(
      r.options.every((o) => o.kind === "switch" && o.pokemonId !== faint.id),
    ).toBe(true);
  });
  it("no recomienda acciones contra rival confirmado debilitado", () => {
    const s = fixture();
    s.rival.hp = 0;
    expect(recommend(s, "normal").options).toEqual([]);
  });
  it("mayor daño con menor prioridad no vence a un ataque que evita el golpe", () => {
    const s = fixture();
    s.team[0].hp = 1;
    s.rival.hp = 1;
    s.team[0].moves[0] = { ...move(33), power: 200, priority: -1 };
    s.team[0].moves[1] = move(98);
    const r = recommend(s, "normal");
    expect(r.primary?.moveIndex).toBe(1);
    expect(r.options.find((o) => o.id === "attack-0")?.safety).toBe("falls");
  });
  it("empate no se convierte en actuar antes ni en evitar KO", () => {
    const s = fixture();
    s.team[0].speed = 100;
    s.team[0].hp = 1;
    s.rival.hp = 1;
    const r = recommend(s, "normal"),
      a = r.options.find((o) => o.kind === "attack")!;
    expect(a.evidence[0].order.relation).toBe("uncertain");
    expect(a.preempts).toBe(false);
    expect(a.safety).toBe("risk");
  });
  it("precisión baja conserva riesgo de fallo, no mezcla probabilidad con KO", () => {
    const s = fixture();
    s.team[0].hp = 1;
    s.rival.hp = 1;
    s.team[0].moves[0].accuracy = 70;
    const a = recommend(s, "normal").options.find((o) => o.kind === "attack")!;
    expect(a.preempts).toBe(true);
    expect(a.safety).toBe("risk");
    expect(a.accuracy).toBe(70);
    expect(a.risks.join(" ")).toContain("fallo");
  });
  it("no fuerza ordenar daño frente a precisión cuando no hay dominancia", () => {
    const s = fixture();
    s.team[0].moves[1] = {
      ...move(33),
      name: "Más fuerte",
      power: 100,
      accuracy: 70,
    };
    const r = recommend(s, "normal");
    expect(r.primary).toBeNull();
    expect(r.action).toContain("Comparar alternativas");
    expect(r.alternatives).toHaveLength(2);
  });
  it("PS desconocidos no equivalen a completos ni a supervivencia", () => {
    const s = fixture();
    s.team[0].hp = null;
    s.team[1].hp = null;
    const r = recommend(s, "normal");
    expect(r.primary).toBeNull();
    expect(
      r.options
        .filter((o) => o.kind !== "stay")
        .every((o) => o.safety === "unknown"),
    ).toBe(true);
    expect(r.needed.join(" ")).toContain("PS actuales");
  });
  it("ataques rivales ocultos condicionan siempre una recomendación útil", () => {
    const s = fixture();
    s.rival.hp = 1;
    const r = recommend(s, "normal");
    expect(r.label).toBe("Recomendación provisional");
    expect(r.risk).toContain("3 ranuras");
    expect(r.coverage).toContain("1/1");
  });
  it("un compañero con menos cálculos no gana por falta de información", () => {
    const s = fixture();
    s.team[0].hp = 1;
    s.team[0].speed = 1;
    const missing = mon("Incompleto");
    missing.defense = null;
    missing.moves[0] = move(33);
    s.team.push(missing);
    const r = recommend(s, "normal");
    expect(r.primary?.pokemonId).toBe(s.team[1].id);
    expect(r.options.find((o) => o.pokemonId === missing.id)?.safety).toBe(
      "unknown",
    );
    expect(r.coverage).toContain("0/1");
  });
  it("solo tipos ofrece orientación identificada sin inventar daño", () => {
    const s = fixture();
    for (const p of [...s.team, s.rival]) {
      p.attack = null;
      p.defense = null;
      p.speed = null;
      p.hp = null;
    }
    const r = recommend(s, "normal");
    expect(r.primary).toBeNull();
    expect(r.label).toContain("Orientación por tipos");
    expect(r.typesOnly.join(" ")).toContain("no es daño");
  });
  it("mantener el activo es opción si no hay ataque evaluable útil y no urge cambiar", () => {
    const s = fixture();
    s.team[0].moves[0] = move(182);
    const r = recommend(s, "normal");
    expect(r.primary?.kind).toBe("stay");
    expect(r.unscored.join(" ")).toContain("Protección");
    expect(r.unscored.join(" ")).toContain("no inútil");
  });
  it("no sugiere golpear una inmunidad si mantener permite revisar otras opciones", () => {
    const s = fixture();
    s.rival.types = ["Fantasma"];
    const r = recommend(s, "normal");
    expect(r.options.find((o) => o.kind === "attack")?.offense).toMatchObject({
      ok: true,
      max: 0,
      immunity: "types",
    });
    expect(r.primary?.kind).toBe("stay");
  });
  it("habilidades y objetos desconocidos o no implementados no crean garantías absolutas", () => {
    const s = fixture();
    s.rival.hp = 1;
    s.team[0].abilityState = "unknown";
    s.rival.itemState = "known";
    s.rival.item = "Objeto Añil";
    const r = recommend(s, "normal");
    expect(r.label).toContain("provisional");
    expect(r.limits.join(" ")).toContain("no implementado");
    expect(r.primary?.risks.join(" ")).toContain("desconocida");
  });
  it("señala bloqueo por objetos Choice sin asumir que puede usar cualquier movimiento", () => {
    const s = fixture();
    s.team[0] = applyEffect(
      s.team[0],
      "item",
      ITEMS.find((e) => e.slug === "choice-band")!,
    );
    s.team[0].itemActivation = "active";
    const r = recommend(s, "normal");
    expect(r.limits.join(" ")).toContain("bloqueo de movimiento");
  });
  it("no arrastra etapas del activo ni efectos consumibles por la transición", () => {
    const s = fixture();
    s.team[0].stages.attack = 6;
    s.team[1].stages.defense = 6;
    s.team[1] = applyEffect(
      s.team[1],
      "item",
      ITEMS.find((e) => e.slug === "air-balloon")!,
    );
    s.team[1].itemActivation = "active";
    const r = recommend(s, "normal"),
      o = r.options.find((o) => o.kind === "switch")!;
    expect(o.safety).toBe("unknown");
    expect(o.missing.join(" ")).toContain("consumo");
    expect(s.team[1].stages.defense).toBe(6);
  });
  it("estadísticas estimadas solapadas no se combinan en una ruta inventada", () => {
    const s = fixture();
    s.team[1] = selectSpecies(s.team[1], SPECIES.find((e) => e.id === 25)!);
    s.team[1].statMode = "estimated";
    const r = recommend(s, "normal"),
      o = r.options.find((o) => o.kind === "switch")!;
    expect(o.safety).toBe("unknown");
    expect(o.missing.join(" ")).toContain("no se suman extremos");
  });
  it("puede llegar a responder pero caer después: no se destaca como supervivencia", () => {
    const s = fixture();
    s.team[0].hp = 1;
    s.team[0].speed = 1;
    s.team[1].speed = 300;
    s.team[1].hp = hit(s, s.team[1]).max + 1;
    const r = recommend(s, "normal"),
      o = r.options.find((o) => o.kind === "switch")!;
    expect(o.evidence[0].response).toBe("all");
    expect(o.safety).not.toBe("avoids");
    expect(r.primary).toBeNull();
  });
  it("recalcula Multiescamas con los PS reales posteriores a cada golpe", () => {
    const s = fixture();
    s.team[1] = applyEffect(
      s.team[1],
      "ability",
      ABILITIES.find((e) => e.slug === "multiscale")!,
    );
    const r = recommend(s, "normal"),
      e = r.options.find((o) => o.kind === "switch")!.evidence[0];
    expect(
      e.entryDamage?.ok && e.incoming.ok && e.incoming.max > e.entryDamage.max,
    ).toBe(true);
  });
  it("analiza pares distintos de entrada y siguiente ataque, no solo repetir el mismo", () => {
    const s = fixture();
    s.rival.moves[1] = move(55);
    const o = recommend(s, "normal").options.find((o) => o.kind === "switch")!;
    expect(o.evidence).toHaveLength(4);
    expect(
      o.evidence.some((e) => e.entryIndex === 0 && e.nextIndex === 1),
    ).toBe(true);
  });
  it("consultar no cambia guardado, activaciones, objetos, PS ni etapas; JSON permanece compatible", () => {
    const s = fixture(),
      before = JSON.stringify(s);
    recommend(s, "normal");
    recommend(s, "free");
    expect(JSON.stringify(s)).toBe(before);
    expect(parseSession(before)).toEqual(s);
    const o = recommend(s, "normal").options.find((o) => o.kind === "switch")!;
    expect(o.evidence[0].entryDamage).toEqual(
      intervalDamage(
        s.rival,
        entryScenario(s.team[1]),
        s.rival.moves[0],
        s.evPolicy,
      ),
    );
  });
});
