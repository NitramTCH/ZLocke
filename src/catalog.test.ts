import { describe, it, expect } from "vitest";
import { SPECIES, MOVES, search, selectSpecies, selectMove } from "./catalog";
import {
  blankPokemon,
  completeTypes,
  effectiveness,
  moveFactor,
  parseSession,
  demoSession,
  stab,
} from "./battle";
import legacy from "../tests/fixtures/session-v1.json";
describe("Catálogos locales", () => {
  it("busca en español sin tildes ni distinción de mayúsculas y prioriza coincidencia exacta", () => {
    expect(search(MOVES, "punO hielo")[0].name).toBe("Puño Hielo");
    expect(search(SPECIES, "PIKACHU")[0].name).toBe("Pikachu");
    expect(search(MOVES, "zzzzzz")).toEqual([]);
    expect(search(MOVES, "")).toEqual([]);
  });
  it("solo aplica especie y tipos; conserva apodo, estadísticas, sets y objetos", () => {
    const p = blankPokemon();
    p.name = "Mi mote";
    p.speed = 73;
    p.ability = "Aleatoria";
    p.item = "Objeto";
    p.moves[0].name = "Movimiento inventado";
    const next = selectSpecies(p, search(SPECIES, "Pikachu")[0]);
    expect(next).toEqual({
      ...p,
      species: "Pikachu",
      types: ["Eléctrico"],
      secondType: "none",
      typesKnown: true,
    });
    expect(p.species).toBe("");
    const dual = selectSpecies(p, search(SPECIES, "Charizard")[0]);
    expect(dual.types).toEqual(["Fuego", "Volador"]);
    expect(completeTypes(dual)).toBe(true);
  });
  it("completa metadatos sin restricciones por especie", () => {
    const m = selectMove(search(MOVES, "Rayo")[0]);
    expect(m).toMatchObject({
      type: "Eléctrico",
      category: "Especial",
      power: 90,
      accuracy: 100,
      priority: 0,
    });
    expect(m.source).toContain("89aa167e4867");
    expect(selectMove(search(MOVES, "Ataque Rápido")[0]).priority).toBe(1);
  });
  it("distingue estado, potencia variable, daño especial y precisión sin valor numérico", () => {
    expect(selectMove(search(MOVES, "Protección")[0])).toMatchObject({
      category: "Estado",
      power: null,
      powerMode: "status",
      accuracy: null,
      accuracyMode: "special",
      priority: 4,
    });
    for (const name of [
      "Patada Baja",
      "Giro Bola",
      "Salpicar",
      "Dracoenergía",
      "Poder Reserva",
    ])
      expect(selectMove(search(MOVES, name)[0])).toMatchObject({
        power: null,
        powerMode: "variable",
      });
    expect(selectMove(search(MOVES, "Furia Dragón")[0]).powerMode).toBe(
      "fixed",
    );
    expect(
      moveFactor(
        selectMove(search(MOVES, "Furia Dragón")[0]),
        demoSession().rival,
      ),
    ).toBeNull();
  });
  it("todos los registros tienen tipos y metadatos válidos para el formato de partida", () => {
    const s = demoSession();
    for (const m of MOVES) {
      s.team[0].moves[0] = selectMove(m);
      expect(() => parseSession(JSON.stringify(s)), m.name).not.toThrow();
    }
    for (const entry of SPECIES) {
      s.team[0] = selectSpecies(s.team[0], entry);
      expect(() => parseSession(JSON.stringify(s)), entry.name).not.toThrow();
    }
  });
});
describe("Información parcial y migración", () => {
  it("no interpreta el antiguo vacío de segundo tipo como monotipo confirmado", () => {
    const migrated = parseSession(JSON.stringify(legacy));
    expect(migrated.version).toBe(2);
    expect(migrated.team[0]).toMatchObject({
      name: legacy.team[0].name,
      species: "",
      secondType: "unknown",
      typesKnown: false,
      hp: legacy.team[0].hp,
      speed: legacy.team[0].speed,
    });
    expect(migrated.team[0].moves[0]).toMatchObject({
      name: "Rayo",
      power: null,
      accuracy: null,
      priority: null,
      source: "",
    });
    expect(migrated.team[1].types).toEqual(legacy.team[1].types);
    expect(migrated.team[1].secondType).toBe("known");
    expect(parseSession(JSON.stringify(migrated))).toEqual(migrated);
  });
  it("mantiene el dato rival desconocido y no calcula un factor dependiente del segundo tipo", () => {
    const s = parseSession(JSON.stringify(legacy));
    const p = s.team[0];
    expect(s.rival.speed).toBeNull();
    expect(effectiveness("Tierra", p.types, completeTypes(p))).toBeNull();
    expect(stab("Eléctrico", p.types, completeTypes(p))).toBeNull();
    p.secondType = "none";
    p.typesKnown = true;
    expect(effectiveness("Tierra", p.types, completeTypes(p))).toBe(2);
    p.secondType = "known";
    p.types.push("Volador");
    expect(effectiveness("Tierra", p.types, completeTypes(p))).toBe(0);
  });
  it("rechaza v2 incoherente, metadatos ausentes y versiones futuras sin migrar", () => {
    const s = demoSession();
    s.team[0].secondType = "unknown";
    expect(() => parseSession(JSON.stringify(s))).toThrow();
    const t = demoSession();
    t.team[0].moves[0].accuracy = 101;
    expect(() => parseSession(JSON.stringify(t))).toThrow();
    expect(() => parseSession(JSON.stringify({ ...t, version: 3 }))).toThrow();
  });
});
