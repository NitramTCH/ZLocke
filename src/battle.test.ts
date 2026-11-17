import { describe, it, expect } from "vitest";
import {
  CHART,
  TYPES,
  effectiveness,
  stab,
  speedOrder,
  newSession,
  demoSession,
  parseSession,
} from "./battle";
describe("Tabla moderna de tipos", () => {
  it("incluye las 324 relaciones", () => {
    expect(TYPES).toHaveLength(18);
    expect(CHART).toHaveLength(18);
    for (const r of CHART) {
      expect(r).toHaveLength(18);
      expect(r.every((x) => [0, 0.5, 1, 2].includes(x))).toBe(true);
    }
  });
  it("multiplica dobles tipos y resistencias", () => {
    expect(effectiveness("Hielo", ["Dragón", "Volador"])).toBe(4);
    expect(effectiveness("Planta", ["Fuego", "Volador"])).toBe(0.25);
    expect(effectiveness("Fuego", ["Agua", "Planta"])).toBe(1);
  });
  it("respeta inmunidades incluso con otro tipo débil", () => {
    expect(effectiveness("Eléctrico", ["Agua", "Tierra"])).toBe(0);
    expect(effectiveness("Lucha", ["Normal", "Fantasma"])).toBe(0);
    expect(effectiveness("Dragón", ["Hada"])).toBe(0);
    expect(effectiveness("Veneno", ["Acero"])).toBe(0);
  });
  it("no convierte información desconocida en neutralidad", () => {
    expect(effectiveness("", ["Agua"])).toBeNull();
    expect(effectiveness("Fuego", [])).toBeNull();
    expect(effectiveness("Fuego", ["Planta"], false)).toBeNull();
  });
});
it("STAB solo depende del tipo manual confirmado", () => {
  expect(stab("Agua", ["Agua", "Tierra"])).toBe(1.5);
  expect(stab("Hielo", ["Agua"])).toBe(1);
  expect(stab("Agua", ["Agua"], false)).toBeNull();
  expect(stab("", [])).toBeNull();
});
it("velocidad desconocida, empate y orden", () => {
  expect(speedOrder(null, 80)).toContain("desconocido");
  expect(speedOrder(80, 80)).toContain("Empate");
  expect(speedOrder(81, 80)).toContain("Tu Pokémon");
  expect(speedOrder(79, 80)).toContain("rival");
});
describe("Persistencia", () => {
  it("acepta partidas vacías y demo sin alterar datos", () => {
    for (const s of [newSession(), demoSession()])
      expect(parseSession(JSON.stringify(s))).toEqual(s);
  });
  it("rechaza estructura y números inválidos", () => {
    expect(() => parseSession("{}")).toThrow();
    const s = newSession();
    s.rival.speed = -1;
    expect(() => parseSession(JSON.stringify(s))).toThrow();
  });
  it("rechaza tipos duplicados, PS imposibles y activos inexistentes", () => {
    const s = demoSession();
    s.rival.types = ["Agua", "Agua"];
    expect(() => parseSession(JSON.stringify(s))).toThrow();
    const t = newSession();
    t.team[0].statMode = "manual";
    t.team[0].hp = 20;
    t.team[0].maxHp = 10;
    expect(() => parseSession(JSON.stringify(t))).toThrow();
    const u = newSession();
    u.activeId = "missing";
    expect(() => parseSession(JSON.stringify(u))).toThrow();
  });
});
