import { describe, it, expect } from "vitest";
import {
  Pokemon as CalcPokemon,
  Move as CalcMove,
  calculate,
  Generations,
  Field,
} from "@smogon/calc";
import { getFinalSpeed } from "@smogon/calc/dist/mechanics/util";
import {
  blankPokemon,
  newSession,
  parseSession,
  type Pokemon,
  type Type,
} from "./battle";
import {
  ABILITIES,
  ITEMS,
  ABILITY_SUPPORT,
  ITEM_SUPPORT,
  applyEffect,
} from "./effects";
import { MOVES, search, selectMove, selectSpecies, SPECIES } from "./catalog";
import { predictDamage } from "./damage";
import { effectiveSpeed, actionOrder } from "./speed";
import { entryScenario } from "./DefensiveCell";
import legacy from "../tests/fixtures/session-v3-damage.json";
function ability(p: Pokemon, slug: string) {
  const next = applyEffect(
    p,
    "ability",
    ABILITIES.find((e) => e.slug === slug)!,
  );
  next.abilityActivation = "active";
  return next;
}
function item(p: Pokemon, slug: string) {
  const next = applyEffect(
    p,
    "item",
    ITEMS.find((e) => e.slug === slug)!,
  );
  next.itemActivation = "active";
  return next;
}
function pair() {
  const a = blankPokemon(),
    d = blankPokemon();
  for (const p of [a, d])
    Object.assign(p, {
      level: 50,
      hp: 150,
      maxHp: 150,
      attack: 100,
      defense: 100,
      spAttack: 100,
      spDefense: 100,
      speed: 100,
      types: ["Normal"],
      typesKnown: true,
      secondType: "none",
      burn: "none",
      paralysis: "none",
      abilityState: "none",
      itemState: "none",
    });
  return { a, d, m: selectMove(search(MOVES, "Placaje")[0]) };
}
function good(r: ReturnType<typeof predictDamage>) {
  if (!r.ok) throw Error(r.reasons.join(" / "));
  return r;
}
describe("Efectos compatibles y anulaciones", () => {
  it("Levitación, Rompemoldes, Escudo Habilidad y Globo Helio son distintos de tipos", () => {
    let { a, d, m } = pair();
    m = { ...m, type: "Tierra" };
    d = ability(d, "levitate");
    expect(good(predictDamage(a, d, m))).toMatchObject({
      min: 0,
      immunity: "effects",
    });
    a = ability(a, "mold-breaker");
    expect(good(predictDamage(a, d, m)).min).toBeGreaterThan(0);
    d = item(d, "ability-shield");
    expect(good(predictDamage(a, d, m)).min).toBe(0);
    d.abilitySuppressed = true;
    expect(good(predictDamage(a, d, m)).min).toBeGreaterThan(0);
    d = item(d, "air-balloon");
    expect(good(predictDamage(a, d, m)).min).toBe(0);
    d.itemActivation = "inactive";
    expect(good(predictDamage(a, d, m)).min).toBeGreaterThan(0);
  });
  it("Zoquete anula Cinta Elección y Globo Helio sin consumirlos", () => {
    let { a, d, m } = pair();
    const base = good(predictDamage(a, d, m)).min;
    a = item(a, "choice-band");
    expect(good(predictDamage(a, d, m)).min).toBeGreaterThan(base);
    a = ability(a, "klutz");
    expect(good(predictDamage(a, d, m)).min).toBe(base);
    d = ability(item(d, "air-balloon"), "klutz");
    m.type = "Tierra";
    expect(good(predictDamage(a, d, m)).min).toBeGreaterThan(0);
    expect(d.itemState).toBe("known");
  });
  it("Absorbe Fuego no supone su potenciación, pero conserva inmunidad defensiva", () => {
    let { a, d, m } = pair();
    m.type = "Fuego";
    a = applyEffect(
      a,
      "ability",
      ABILITIES.find((e) => e.slug === "flash-fire")!,
    );
    expect(predictDamage(a, d, m).ok).toBe(false);
    a.abilityActivation = "inactive";
    const base = good(predictDamage(a, d, m)).min;
    a.abilityActivation = "active";
    expect(good(predictDamage(a, d, m)).min).toBeGreaterThan(base);
    d = applyEffect(
      d,
      "ability",
      ABILITIES.find((e) => e.slug === "flash-fire")!,
    );
    expect(good(predictDamage(a, d, m)).min).toBe(0);
  });
  it("Multiescamas pide PS; Ignorante ignora solo las etapas relevantes y Rompemoldes lo anula", () => {
    let { a, d, m } = pair();
    d = ability(d, "multiscale");
    d.hp = null;
    expect(predictDamage(a, d, m).ok).toBe(false);
    d.hp = 150;
    const full = good(predictDamage(a, d, m)).max;
    d.hp = 149;
    expect(good(predictDamage(a, d, m)).max).toBeGreaterThan(full);
    d = ability(d, "unaware");
    a.stages.attack = null;
    expect(predictDamage(a, d, m).ok).toBe(true);
    a = ability(a, "mold-breaker");
    expect(predictDamage(a, d, m).ok).toBe(false);
  });
  it("desconocidos y contenido manual dan referencias condicionadas; no infiere identidad del nombre", () => {
    const { a, d, m } = pair();
    a.abilityState = "unknown";
    expect(good(predictDamage(a, d, m)).conditions.join()).toContain(
      "desconocido",
    );
    a.abilityState = "known";
    a.ability = "Levitación";
    a.abilityId = null;
    expect(good(predictDamage(a, d, m)).conditions.join()).toContain(
      "no implementado",
    );
    a.itemState = "known";
    a.item = "Objeto de fangame";
    expect(good(predictDamage(a, d, m)).conditions.join()).toContain(
      "Objeto de fangame",
    );
  });
  it("cualquier especie puede llevar cualquier habilidad, sin cambiar estadísticas", () => {
    const { a } = pair();
    for (const entry of ABILITIES) {
      const p = applyEffect(
        selectSpecies(a, search(SPECIES, "Pikachu")[0]),
        "ability",
        entry,
      );
      expect(p.abilityId).toBe(entry.id);
      expect(p.attack).toBe(a.attack);
      expect(selectSpecies(p, search(SPECIES, "Charizard")[0]).abilityId).toBe(
        entry.id,
      );
    }
  });
  it("ninguna consulta altera PS, etapas, objeto ni activación", () => {
    let { a, d, m } = pair();
    a = ability(item(a, "life-orb"), "huge-power");
    d = ability(item(d, "air-balloon"), "thick-fat");
    const before = JSON.stringify([a, d, m]);
    predictDamage(a, d, m);
    effectiveSpeed(a);
    entryScenario(d);
    expect(JSON.stringify([a, d, m])).toBe(before);
  });
});
describe("Velocidad efectiva y orden", () => {
  it("etapas, parálisis, Pañuelo y Zoquete", () => {
    let { a } = pair();
    a.stages.speed = 1;
    a.paralysis = "paralyzed";
    expect(effectiveSpeed(a)).toMatchObject({ ok: true, value: 75 });
    a.paralysis = "none";
    a = item(a, "choice-scarf");
    expect(effectiveSpeed(a)).toMatchObject({ ok: true, value: 225 });
    a = ability(a, "klutz");
    expect(effectiveSpeed(a)).toMatchObject({ ok: true, value: 150 });
  });
  it("Liviano e Inicio Lento exigen activación; entrar pierde Liviano y no reutiliza etapas", () => {
    let { a } = pair();
    a = applyEffect(
      a,
      "ability",
      ABILITIES.find((e) => e.slug === "unburden")!,
    );
    expect(effectiveSpeed(a).ok).toBe(false);
    a.abilityActivation = "active";
    expect(effectiveSpeed(a)).toMatchObject({ ok: true, value: 200 });
    expect(effectiveSpeed(entryScenario(a))).toMatchObject({
      ok: true,
      value: 100,
    });
    a = ability(a, "slow-start");
    expect(effectiveSpeed(a)).toMatchObject({ ok: true, value: 50 });
    a.abilityActivation = "inactive";
    expect(effectiveSpeed(a)).toMatchObject({ ok: true, value: 100 });
  });
  it("prioridad conocida supera velocidad; no declara orden absoluto", () => {
    const { a, d, m } = pair();
    a.speed = 10;
    d.speed = 200;
    m.priority = 1;
    const dm = { ...m, priority: 0 };
    expect(actionOrder(a, d, m, dm)).toContain("tu Pokémon");
    m.priority = 0;
    expect(actionOrder(a, d, m, dm)).toContain("el rival");
    dm.priority = null as never;
    expect(actionOrder(a, d, m, dm)).toContain("falta prioridad");
    a.paralysis = "unknown";
    expect(effectiveSpeed(a).ok).toBe(false);
  });
});
describe("Persistencia v4", () => {
  it("migra v3 sin inferir habilidades y sin perder los valores", () => {
    const s = parseSession(JSON.stringify(legacy));
    expect(s.version).toBe(4);
    expect(s.team[0]).toMatchObject({
      abilityId: null,
      itemId: null,
      abilityActivation: "unknown",
      paralysis: "unknown",
      hp: legacy.team[0].hp,
    });
    let p = ability(item(s.team[0], "choice-band"), "levitate");
    p.abilitySuppressed = true;
    s.team[0] = p;
    expect(parseSession(JSON.stringify(s))).toEqual(s);
    s.team[0].abilityId = 37;
    expect(() => parseSession(JSON.stringify(s))).toThrow();
  });
  it("todos los objetos de catálogo preservan un ID estable en JSON", () => {
    const s = newSession();
    for (const e of ITEMS) {
      s.team[0] = applyEffect(s.team[0], "item", e);
      expect(parseSession(JSON.stringify(s)).team[0].itemId).toBe(e.id);
    }
  });
});
const esTypes: Record<string, Type> = {
  Normal: "Normal",
  Fire: "Fuego",
  Flying: "Volador",
  Psychic: "Psíquico",
  Grass: "Planta",
};
describe("Contraste independiente con calc 0.12.0", () => {
  for (const [kind, entries, supported] of [
    ["ability", ABILITIES, ABILITY_SUPPORT],
    ["item", ITEMS, ITEM_SUPPORT],
  ] as const)
    for (const [slug, support] of Object.entries(supported))
      for (const role of ["attacker", "defender"]) {
        it(`${kind} ${slug} ${role}`, () => {
          const gen = Generations.get(9);
          const ca = new CalcPokemon(gen, "Charizard", {
            level: 50,
            ability:
              kind === "ability" && role === "attacker"
                ? support.calc
                : "Illuminate",
            abilityOn: true,
            status: slug === "guts" ? "brn" : "",
            ...(kind === "item" && role === "attacker"
              ? { item: support.calc }
              : {}),
          });
          const cd = new CalcPokemon(gen, "Mew", {
            level: 50,
            ability:
              kind === "ability" && role === "defender"
                ? support.calc
                : "Illuminate",
            abilityOn: true,
            ...(kind === "item" && role === "defender"
              ? { item: support.calc }
              : {}),
            overrides: { types: ["Grass"] },
          });
          const a = blankPokemon(),
            d = blankPokemon();
          for (const [p, c] of [
            [a, ca],
            [d, cd],
          ] as const)
            Object.assign(p, {
              level: c.level,
              hp: c.curHP(),
              maxHp: c.maxHP(),
              attack: c.rawStats.atk,
              defense: c.rawStats.def,
              spAttack: c.rawStats.spa,
              spDefense: c.rawStats.spd,
              speed: c.rawStats.spe,
              types: c.types.map((t) => esTypes[t]),
              secondType: c.types.length === 2 ? "known" : "none",
              typesKnown: true,
              burn: c.status === "brn" ? "burned" : "none",
              paralysis: "none",
              abilityState: "none",
              itemState: "none",
            });
          const ae = entries.find((e) => e.slug === slug)!;
          let ap = role === "attacker" ? applyEffect(a, kind, ae) : a,
            dp = role === "defender" ? applyEffect(d, kind, ae) : d;
          ap.abilityActivation = dp.abilityActivation = "active";
          ap.itemActivation = dp.itemActivation = "active";
          const m = {
            ...selectMove(search(MOVES, "Placaje")[0]),
            type: (slug === "levitate" || slug === "air-balloon"
              ? "Tierra"
              : slug === "water-absorb"
                ? "Agua"
                : slug === "volt-absorb"
                  ? "Eléctrico"
                  : "Fuego") as Type,
            category:
              slug === "ice-scales" ||
              slug === "choice-specs" ||
              slug === "assault-vest"
                ? ("Especial" as const)
                : ("Físico" as const),
            power: 80,
          };
          const en = {
            Tierra: "Ground",
            Agua: "Water",
            Eléctrico: "Electric",
            Fuego: "Fire",
          };
          const cm = new CalcMove(gen, "Tackle", {
            overrides: {
              basePower: 80,
              type: en[m.type as keyof typeof en] as never,
              category: m.category === "Físico" ? "Physical" : "Special",
            },
          });
          const expected = calculate(gen, ca, cd, cm).damage;
          const actual = good(predictDamage(ap, dp, m));
          expect(
            typeof expected === "number"
              ? [actual.min, actual.max]
              : actual.rolls,
          ).toEqual(
            typeof expected === "number" ? [expected, expected] : expected,
          );
          if (slug !== "unburden" || ap.itemState === "none") {
            const speed = effectiveSpeed(ap);
            expect(speed).toMatchObject({
              ok: true,
              value: getFinalSpeed(
                gen,
                ca,
                new Field(),
                new Field().attackerSide,
              ),
            });
          }
        });
      }
});
it("no bloquea un cálculo por activaciones que no intervienen en ese sentido/categoría", () => {
  let { a, d, m } = pair();
  a = applyEffect(
    a,
    "item",
    ITEMS.find((e) => e.slug === "assault-vest")!,
  );
  expect(predictDamage(a, d, m).ok).toBe(true);
  m.category = "Especial";
  d = applyEffect(
    d,
    "ability",
    ABILITIES.find((e) => e.slug === "slow-start")!,
  );
  a = applyEffect(
    a,
    "ability",
    ABILITIES.find((e) => e.slug === "guts")!,
  );
  a.paralysis = "unknown";
  expect(predictDamage(a, d, m).ok).toBe(true);
});
