import { describe, it, expect } from "vitest";
import {
  calculate,
  Generations,
  Pokemon as CalcPokemon,
  Move as CalcMove,
} from "@smogon/calc";
import {
  blankPokemon,
  newStages,
  parseSession,
  type Pokemon,
  type Move,
  type Type,
} from "./battle";
import { predictDamage } from "./damage";
import { MOVES, search, selectMove } from "./catalog";
import v2 from "../tests/fixtures/session-v2.json";
function pair() {
  const a = blankPokemon(),
    d = blankPokemon();
  Object.assign(a, {
    level: 50,
    attack: 100,
    spAttack: 120,
    types: ["Fuego"],
    typesKnown: true,
    secondType: "none",
    burn: "none",
    abilityState: "none",
    itemState: "none",
  });
  Object.assign(d, {
    defense: 100,
    spDefense: 100,
    types: ["Planta"],
    typesKnown: true,
    secondType: "none",
    hp: 100,
    maxHp: 200,
    abilityState: "none",
    itemState: "none",
  });
  const m: Move = {
    ...selectMove(search(MOVES, "Lanzallamas")[0]),
    category: "Físico",
    power: 80,
  };
  return { a, d, m };
}
function result(a: Pokemon, d: Pokemon, m: Move) {
  const r = predictDamage(a, d, m);
  if (!r.ok) throw Error(r.reasons.join(" / "));
  return r;
}
describe("Daño simple generación IX", () => {
  it("daño físico, STAB, porcentaje y debilitamiento sin modificar PS", () => {
    const { a, d, m } = pair();
    const before = JSON.stringify({ a, d, m });
    const r = result(a, d, m);
    expect([r.min, r.max]).toEqual([92, 110]);
    expect(r.percent).toEqual([46, 55]);
    expect(r.ko).toBe("possible");
    expect(JSON.stringify({ a, d, m })).toBe(before);
    d.hp = 92;
    expect(result(a, d, m).ko).toBe("guaranteed");
    d.hp = 111;
    expect(result(a, d, m).ko).toBe("no");
    d.hp = null;
    d.maxHp = null;
    expect(result(a, d, m)).toMatchObject({ percent: null, ko: "unknown" });
  });
  it("dobles tipos y resistencia, inmunidad sin pedir estadísticas irrelevantes", () => {
    const { a, d, m } = pair();
    d.types = ["Planta", "Acero"];
    d.secondType = "known";
    expect(result(a, d, m).min).toBe(184);
    d.types = ["Agua"];
    d.secondType = "none";
    expect(result(a, d, m).min).toBe(23);
    m.type = "Normal";
    d.types = ["Fantasma"];
    a.level = null;
    a.attack = null;
    a.types = [];
    a.typesKnown = false;
    a.stages.attack = null;
    d.defense = null;
    expect(result(a, d, m)).toMatchObject({ min: 0, max: 0 });
  });
  it("etapas ofensivas y defensivas, y quemadura física", () => {
    const { a, d, m } = pair();
    a.stages.attack = 2;
    expect(result(a, d, m).min).toBeGreaterThan(92);
    d.stages.defense = 2;
    expect(result(a, d, m).min).toBe(92);
    a.burn = "burned";
    expect(result(a, d, m).min).toBe(46);
    m.category = "Especial";
    const burned = result(a, d, m);
    a.burn = "unknown";
    expect(result(a, d, m).rolls).toEqual(burned.rolls);
  });
  it("pide exclusivamente los datos que usa cada categoría; no exige nivel defensor ni PS", () => {
    const { a, d, m } = pair();
    a.spAttack = null;
    d.spDefense = null;
    d.level = null;
    d.hp = null;
    d.maxHp = null;
    a.speed = null;
    d.speed = null;
    a.stages.spAttack = null;
    d.stages.spDefense = null;
    expect(predictDamage(a, d, m).ok).toBe(true);
    m.category = "Especial";
    const r = predictDamage(a, d, m);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reasons).toContain("Falta Ataque especial real del atacante.");
      expect(r.reasons).toContain("Falta Defensa especial real del defensor.");
      expect(r.reasons.join()).not.toContain("Velocidad");
    }
    m.category = "Físico";
    a.attack = null;
    expect(predictDamage(a, d, m).ok).toBe(false);
  });
  it("no calcula estado, potencia variable, daño fijo ni efectos sin verificar", () => {
    const { a, d } = pair();
    for (const name of [
      "Protección",
      "Patada Baja",
      "Furia Dragón",
      "Plancha Corporal",
    ]) {
      const r = predictDamage(a, d, selectMove(search(MOVES, name)[0]));
      expect(r.ok, name).toBe(false);
    }
    const { m } = pair();
    m.damageKind = "unknown";
    expect(predictDamage(a, d, m).ok).toBe(false);
  });
  it("respeta potencia, tipo y categoría manuales; precisión no modifica las tiradas", () => {
    const { a, d, m } = pair();
    const old = result(a, d, m);
    m.power = 100;
    expect(result(a, d, m).min).toBeGreaterThan(old.min);
    m.type = "Agua";
    expect(result(a, d, m).max).toBeLessThan(old.max);
    const rolls = result(a, d, m).rolls;
    m.accuracy = 1;
    expect(result(a, d, m).rolls).toEqual(rolls);
    m.category = "Especial";
    expect(result(a, d, m).rolls).not.toEqual(rolls);
  });
  it("desconocidos nunca son ausencia; habilidades y objetos indicados tampoco se aplican", () => {
    const { a, d, m } = pair();
    expect(result(a, d, m).conditions).toEqual([]);
    a.abilityState = "unknown";
    d.itemState = "known";
    d.item = "Banda Focus";
    const r = result(a, d, m);
    expect(r.conditions.join(" ")).toContain("desconocido");
    expect(r.conditions.join(" ")).toContain("Banda Focus");
    a.burn = "unknown";
    expect(predictDamage(a, d, m).ok).toBe(false);
    a.burn = "none";
    d.typesKnown = false;
    expect(predictDamage(a, d, m).ok).toBe(false);
  });
  it("migra v2 sin completar etapas, estados ni mecánicas por nombre", () => {
    const s = parseSession(JSON.stringify(v2));
    expect(s.version).toBe(4);
    expect(s.rules).toBe("gen9-standard");
    expect(s.team[0].stages).toEqual(newStages(null));
    expect(s.team[0]).toMatchObject({
      burn: "unknown",
      abilityState: "unknown",
      itemState: "unknown",
      hp: v2.team[0].hp,
    });
    expect(s.team[0].moves[0].damageKind).toBe("unknown");
    expect(parseSession(JSON.stringify(s))).toEqual(s);
    const invalid = { ...s, rules: "fangame" };
    expect(() => parseSession(JSON.stringify(invalid))).toThrow();
    s.team[0].stages.attack = 7;
    expect(() => parseSession(JSON.stringify(s))).toThrow();
  });
});
const english = [
  "Normal",
  "Fire",
  "Water",
  "Electric",
  "Grass",
  "Ice",
  "Fighting",
  "Poison",
  "Ground",
  "Flying",
  "Psychic",
  "Bug",
  "Rock",
  "Ghost",
  "Dragon",
  "Dark",
  "Steel",
  "Fairy",
] as const;
const spanish = [
  "Normal",
  "Fuego",
  "Agua",
  "Eléctrico",
  "Planta",
  "Hielo",
  "Lucha",
  "Veneno",
  "Tierra",
  "Volador",
  "Psíquico",
  "Bicho",
  "Roca",
  "Fantasma",
  "Dragón",
  "Siniestro",
  "Acero",
  "Hada",
] as Type[];
describe("Contraste con @smogon/calc 0.12.0, generación 9", () => {
  // IV/EV del motor solo construyen fixtures independientes de referencia.
  // ZLocke recibe sus estadísticas finales como datos reales; nunca resuelve IV/EV.
  for (const category of ["Physical", "Special"] as const)
    for (const boost of [-6, -2, 0, 1, 6])
      for (const burn of [false, true]) {
        it(`${category}, etapa ${boost}, quemadura ${burn}`, () => {
          const gen = Generations.get(9);
          const ca = new CalcPokemon(gen, "Charizard", {
            level: 50,
            ability: "Illuminate",
            boosts: { atk: boost, spa: boost },
            status: burn ? "brn" : "",
          });
          const cd = new CalcPokemon(gen, "Ferrothorn", {
            level: 50,
            ability: "Illuminate",
            boosts: { def: 1, spd: 1 },
          });
          const cm = new CalcMove(gen, "Tackle", {
            overrides: { basePower: 80, type: "Fire", category },
          });
          const reference = calculate(gen, ca, cd, cm);
          const a = blankPokemon(),
            d = blankPokemon();
          Object.assign(a, {
            level: ca.level,
            attack: ca.rawStats.atk,
            spAttack: ca.rawStats.spa,
            types: ca.types.map(
              (t) => spanish[english.indexOf(t as (typeof english)[number])],
            ),
            typesKnown: true,
            secondType: "known",
            burn: burn ? "burned" : "none",
            stages: { ...newStages(), attack: boost, spAttack: boost },
          });
          Object.assign(d, {
            defense: cd.rawStats.def,
            spDefense: cd.rawStats.spd,
            types: ["Planta", "Acero"],
            typesKnown: true,
            secondType: "known",
            stages: { ...newStages(), defense: 1, spDefense: 1 },
          });
          const m: Move = {
            ...selectMove(search(MOVES, "Lanzallamas")[0]),
            category: category === "Physical" ? "Físico" : "Especial",
            power: 80,
          };
          expect(result(a, d, m).rolls).toEqual(reference.damage);
        });
      }
});
describe("Matriz de tipos contra Smogon (STAB, resistencias e inmunidades)", () => {
  for (let i = 0; i < 18; i++)
    it(`tipo ${spanish[i]}`, () => {
      const gen = Generations.get(9);
      const ca = new CalcPokemon(gen, "Charizard", {
        level: 50,
        ability: "Illuminate",
      });
      const cd = new CalcPokemon(gen, "Gardevoir", {
        level: 50,
        ability: "Illuminate",
      });
      const cm = new CalcMove(gen, "Tackle", {
        overrides: { basePower: 90, type: english[i], category: "Special" },
      });
      const a = blankPokemon(),
        d = blankPokemon();
      Object.assign(a, {
        level: ca.level,
        spAttack: ca.rawStats.spa,
        types: ["Fuego", "Volador"],
        typesKnown: true,
        secondType: "known",
      });
      Object.assign(d, {
        spDefense: cd.rawStats.spd,
        types: ["Psíquico", "Hada"],
        typesKnown: true,
        secondType: "known",
      });
      const m: Move = {
        ...selectMove(search(MOVES, "Rayo")[0]),
        type: spanish[i],
        power: 90,
      };
      const expected = calculate(gen, ca, cd, cm).damage;
      const r = result(a, d, m);
      expect(typeof expected === "number" ? [r.min, r.max] : r.rolls).toEqual(
        typeof expected === "number" ? [expected, expected] : expected,
      );
    });
});
it("conserva ajustes manuales en migración v2 y exige verificación del comportamiento", () => {
  const legacy = structuredClone(v2);
  Object.assign(legacy.team[0].moves[0], {
    power: 95,
    powerMode: "number",
    accuracy: 87,
    accuracyMode: "number",
    priority: 1,
    source: "Ajuste manual",
  });
  const s = parseSession(JSON.stringify(legacy));
  expect(s.team[0].moves[0]).toMatchObject({
    name: legacy.team[0].moves[0].name,
    power: 95,
    powerMode: "number",
    accuracy: 87,
    priority: 1,
    source: "Ajuste manual",
    damageKind: "unknown",
  });
});
it("identifica etapa/quemadura y límites sin convertir desconocidos en neutros", () => {
  const { a, d, m } = pair();
  a.stages.attack = null;
  a.burn = "unknown";
  const r = predictDamage(a, d, m);
  expect(r.ok).toBe(false);
  if (!r.ok) {
    expect(r.reasons).toContain("Falta la etapa de Ataque del atacante.");
    expect(r.reasons).toContain(
      "Falta confirmar el estado de quemadura del atacante.",
    );
  }
  a.stages.attack = 0;
  a.burn = "none";
  m.power = 300;
  expect(predictDamage(a, d, m).ok).toBe(false);
  m.power = 80;
  a.attack = 1000;
  expect(predictDamage(a, d, m).ok).toBe(false);
});
