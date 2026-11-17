import { describe, expect, it } from "vitest";
import { newSession, parseSession } from "./battle";
import {
  buildShowdownImport,
  parseShowdown,
  previewPokemon,
  resolveShowdown,
  rowProblems,
  setShowdownEffect,
  setShowdownMove,
  setShowdownSpecies,
} from "./showdown";
import { intervalDamage } from "./uncertainty";
import { statModel } from "./stats";
import { moveCapability } from "./catalog";

const set = `¡Luz, mi amiga! (Pikachu) (F) @ King's Rock
Ability: Levitate
Level: 50
Shiny: Yes
Happiness: 123
EVs: 252 SpA / 4 SpD / 252 Spe
IVs: 0 Atk / 30 Def
Timid Nature
- Thunderbolt
- Protect
- Low Kick
- Surf`;
const importSet = (text = set) =>
  buildShowdownImport(newSession(), parseShowdown(text), "file", "replace")
    .session;
describe("importador Showdown", () => {
  it("separa apodo Unicode y signos, especie, sexo y objeto con apóstrofo; conserva IDs", () => {
    const p = importSet().team[0];
    expect(p.name).toBe("¡Luz, mi amiga!");
    expect(p.speciesId).toBe(25);
    expect(p.showdown).toMatchObject({ sex: "F", shiny: true, happiness: 123 });
    expect(p.item).toBe("Roca del Rey");
    expect(p.itemId).not.toBeNull();
    expect(p.abilityId).toBe(26);
    expect(p.moves.map((m) => m.catalogId)).toEqual([85, 182, 67, 57]);
    expect(p.statParams.ivs).toEqual({
      hp: 31,
      attack: 0,
      defense: 30,
      spAttack: 31,
      spDefense: 31,
      speed: 31,
    });
    expect(p.statParams.evs.hp).toBe(0);
    expect(p.statParams.evs.spAttack).toBe(252);
    expect(p.statMode).toBe("calculated");
    expect(p.hp).toBeNull();
    expect(p.attack).toBeNull();
  });
  it("acepta nombres españoles, acentos y naturaleza estándar", () => {
    const p = importSet(
      set
        .replace("King's Rock", "Roca del Rey")
        .replace("Levitate", "Levitación")
        .replace("Timid", "Miedosa")
        .replace("Thunderbolt", "Rayo")
        .replace("Protect", "Protección"),
    ).team[0];
    expect(p.moves[0].catalogId).toBe(85);
    expect(p.statParams.natureId).toBe(5);
    expect(p.abilityId).toBe(26);
    expect(resolveShowdown("moves", "Puño Trueno")).toBe(9);
  });
  it("tolera CRLF, BOM, espacios y bloques vacíos", () => {
    const rows = parseShowdown(
      "\uFEFF\r\n" +
        set.replaceAll("\n", "\r\n") +
        "\r\n\r\n  \r\nFarfetch’d (M)\r\nLevel: 40\r\n",
    );
    expect(rows).toHaveLength(2);
    expect(rows[1].p.speciesId).toBe(83);
    expect(rows[1].p.name).toBe("");
    expect(rows[1].p.showdown?.sex).toBe("M");
    expect(parseShowdown(" \r\n \r\n")).toHaveLength(0);
  });
  it("no sustituye formas desconocidas por especie base ni infiere sets", () => {
    const rows = parseShowdown("Amigo (Charizard-Mega-X)\nLevel: 50\n- Surf");
    expect(rows[0].p.speciesId).toBeNull();
    expect(rows[0].p.species).toBe("Charizard-Mega-X");
    expect(rows[0].p.types).toEqual([]);
    expect(rows[0].p.statMode).toBe("estimated");
    expect(rows[0].p.abilityState).toBe("unknown");
    const p = buildShowdownImport(newSession(), rows, "file", "replace").session
      .team[0];
    expect(p.moves[0].catalogId).toBe(57);
    expect(p.speciesId).toBeNull();
  });
  it("valores omitidos tienen procedencia y falta nivel requiere confirmación", () => {
    const rows = parseShowdown("Pikachu\n- Surf"),
      p = rows[0].p;
    expect(p.level).toBeNull();
    expect(p.statParams.natureId).toBeNull();
    expect(p.statMode).toBe("estimated");
    expect(p.itemState).toBe("none");
    expect(p.showdown?.shiny).toBe(false);
    expect(p.showdown?.happiness).toBe(255);
    expect(p.showdown?.origins.join(" ")).toContain("IV omitidos: 31");
    expect(() =>
      buildShowdownImport(newSession(), rows, "file", "replace"),
    ).toThrow("nivel");
    rows[0].p.level = 42;
    expect(
      buildShowdownImport(newSession(), rows, "file", "replace").session.team[0]
        .level,
    ).toBe(42);
  });
  it("exige elección explícita de EV y nunca altera originales al ponerlos a cero", () => {
    const rows = parseShowdown(set),
      before = JSON.stringify(rows);
    expect(() =>
      buildShowdownImport(newSession(), rows, "", "replace"),
    ).toThrow("Elige");
    expect(previewPokemon(rows[0], "zero").statParams.evs.speed).toBe(0);
    const p = buildShowdownImport(newSession(), rows, "zero", "replace").session
      .team[0];
    expect(p.statParams.evs.spAttack).toBe(0);
    expect(p.statParams.ivs.attack).toBe(0);
    expect(JSON.stringify(rows)).toBe(before);
    expect(p.showdown?.raw).toContain("252 SpA");
  });
  it("conserva EV no estándar, rechaza total >510 y permite excluir solo esa entrada", () => {
    const rows = parseShowdown(
      set + "\n\nPikachu\nLevel: 50\nEVs: 300 Atk / 252 Spe / 252 HP",
    );
    expect(rows[1].p.statParams.evs.attack).toBe(300);
    expect(rowProblems(rows[1], "file", "unknown").join(" ")).toContain("510");
    expect(() =>
      buildShowdownImport(newSession(), rows, "file", "replace"),
    ).toThrow("IV deben");
    rows[1].selected = false;
    expect(
      buildShowdownImport(newSession(), rows, "file", "replace").session.team,
    ).toHaveLength(1);
    rows[1].selected = true;
    expect(
      buildShowdownImport(newSession(), rows, "zero", "replace").session.team,
    ).toHaveLength(2);
    const total = parseShowdown(
      "Pikachu\nLevel: 50\nEVs: 252 Atk / 252 Def / 252 Spe",
    );
    expect(rowProblems(total[0], "file", "unknown").length).toBeGreaterThan(0);
  });
  it("rechaza IV ilegales y felicidad inválida sin recortar", () => {
    const r = parseShowdown(
      "Pikachu\nLevel: 50\nIVs: 42 Atk\nHappiness: 300",
    )[0];
    expect(r.p.statParams.ivs.attack).toBe(42);
    expect(rowProblems(r, "file", "unknown").length).toBe(2);
  });
  it("sintaxis extra/duplicados no se ignoran y no bloquean las entradas excluidas", () => {
    for (const extra of [
      "Level: 40",
      "Tera Type: Water",
      "EVs: 4 Atk / 4 Atk",
      "EVs: 10 Unknown",
      "- Tackle",
    ]) {
      const rows = parseShowdown(set + "\n" + extra);
      expect(rows[0].syntaxErrors.length).toBeGreaterThan(0);
      expect(() =>
        buildShowdownImport(newSession(), rows, "file", "replace"),
      ).toThrow();
    }
  });
  it("conserva movimientos/efectos no compatibles y nombres manuales", () => {
    let p = importSet().team[0];
    expect(moveCapability(p.moves[1]).canCalculate).toBe(false);
    expect(p.moves[1].category).toBe("Estado");
    expect(moveCapability(p.moves[2]).canCalculate).toBe(false);
    expect(p.moves[2].powerMode).toBe("variable");
    p = setShowdownEffect(p, "ability", "Habilidad de Añil");
    p = setShowdownEffect(p, "item", "Objeto inventado");
    p = setShowdownMove(p, 0, "Ataque único");
    expect(p.abilityState).toBe("known");
    expect(p.abilityId).toBeNull();
    expect(p.itemId).toBeNull();
    expect(p.moves[0].name).toBe("Ataque único");
    expect(p.moves[0].catalogId).toBeNull();
    expect(p.abilityActivation).toBe("unknown");
    expect(p.itemActivation).toBe("unknown");
    expect(p.burn).toBe("unknown");
    expect(p.paralysis).toBe("unknown");
  });
  it("corrige especie/naturaleza/modo sin completar habilidades ni estadísticas manuales", () => {
    const rows = parseShowdown(
      "Apodo (Pikachu-FormaX)\nLevel: 50\nNaturaleza: Inexistente",
    );
    rows[0].p = setShowdownSpecies(rows[0].p, "Pikachu");
    rows[0].p.statParams.natureId = 5;
    rows[0].p.statMode = "calculated";
    const p = buildShowdownImport(newSession(), rows, "file", "replace").session
      .team[0];
    expect(statModel(p, "unknown").ok).toBe(true);
    expect(p.abilityState).toBe("unknown");
    expect(p.speed).toBeNull();
  });
  it("reemplazo y añadido son atómicos; conservan rival/configuración y activo al añadir", () => {
    const s = newSession(),
      before = JSON.stringify(s),
      rows = parseShowdown(set);
    const replaced = buildShowdownImport(s, rows, "file", "replace").session;
    expect(replaced.rival).toEqual(s.rival);
    expect(replaced.evPolicy).toBe(s.evPolicy);
    expect(replaced.rules).toBe(s.rules);
    expect(replaced.activeId).toBe(rows[0].p.id);
    const added = buildShowdownImport(s, rows, "file", "append").session;
    expect(added.team[0]).toEqual(s.team[0]);
    expect(added.activeId).toBe(s.activeId);
    expect(added.rival).toEqual(s.rival);
    const tooMany = Array.from({ length: 6 }, () => parseShowdown(set)[0]);
    expect(() => buildShowdownImport(s, tooMany, "file", "append")).toThrow(
      "seis",
    );
    expect(JSON.stringify(s)).toBe(before);
    expect(() => buildShowdownImport(s, [], "file", "replace")).toThrow(
      "Selecciona",
    );
  });
  it("respeta política EV de partida, sin cambiarla ni borrar EV", () => {
    const s = newSession();
    s.evPolicy = "zero";
    const rows = parseShowdown(set);
    expect(() => buildShowdownImport(s, rows, "file", "replace")).toThrow(
      "conflicto",
    );
    expect(
      buildShowdownImport(s, rows, "zero", "replace").session.evPolicy,
    ).toBe("zero");
    expect(rows[0].p.statParams.evs.speed).toBe(252);
  });
  it("PS completos solo por acción explícita y cuando máximo exacto, no elige estimación", () => {
    const s = newSession(),
      rows = parseShowdown(set);
    const p = buildShowdownImport(s, rows, "file", "replace", true).session
      .team[0];
    const model = statModel(p, "unknown");
    expect(model.ok && p.hp === model.ranges.hp?.max).toBe(true);
    rows[0].p.statMode = "estimated";
    rows[0].p.statParams.ivs.hp = null;
    expect(
      buildShowdownImport(s, rows, "file", "replace", true).session.team[0].hp,
    ).toBeNull();
    rows[0].p = setShowdownSpecies(rows[0].p, "Pikachu-Manual");
    expect(
      buildShowdownImport(s, rows, "file", "replace", true).session.team[0].hp,
    ).toBeNull();
  });
  it("parámetros importados alimentan fichas y daño, y sobreviven JSON sin pérdida", () => {
    const s = importSet(),
      p = s.team[0];
    expect(statModel(p, "unknown")).toMatchObject({
      ok: true,
      estimated: false,
      ranges: { speed: { min: 156, max: 156 } },
    });
    const defender = importSet("Blastoise\nLevel: 50\nCalm Nature").team[0];
    defender.statMode = "calculated";
    const result = intervalDamage(p, defender, p.moves[0], "unknown");
    expect(result.ok).toBe(true);
    const rows = parseShowdown(set);
    rows[0].p.statParams.evs.spAttack = 0;
    const weaker = buildShowdownImport(newSession(), rows, "file", "replace")
      .session.team[0];
    const weakDamage = intervalDamage(
      weaker,
      defender,
      weaker.moves[0],
      "unknown",
    );
    expect(result.ok && weakDamage.ok && result.max > weakDamage.max).toBe(
      true,
    );
    expect(parseSession(JSON.stringify(s))).toEqual(s);
    expect(p.showdown?.raw).toBe(set);
  });
  it("reconoce Nidoran y excepciones explícitas de Poder Oculto y Frustración sin fingir IV", () => {
    expect(resolveShowdown("species", "Nidoran-F")).toBe(29);
    expect(resolveShowdown("species", "Nidoran-M")).toBe(32);
    const rows = parseShowdown(
      "Pikachu\nLevel: 50\nTimid Nature\n- Hidden Power [Ice]\n- Frustration",
    );
    expect(rows[0].p.moves[0]).toMatchObject({
      catalogId: 237,
      type: "Hielo",
      powerMode: "variable",
    });
    expect(rows[0].p.statParams.ivs.hp).toBeNull();
    expect(rows[0].p.statMode).toBe("estimated");
    expect(rows[0].p.showdown?.happiness).toBe(0);
    const explicit = parseShowdown(
      "Pikachu\nLevel: 50\nIVs: 0 Atk\nHappiness: 120\nTimid Nature\n- Hidden Power [Hielo]\n- Frustration",
    )[0];
    expect(explicit.p.statParams.ivs.hp).toBe(31);
    expect(explicit.p.statParams.ivs.attack).toBe(0);
    expect(explicit.p.showdown?.happiness).toBe(120);
  });
  it("conserva decimales inválidos en la vista previa en vez de normalizarlos", () => {
    const row = parseShowdown(
      "Pikachu\nLevel: 50.5\nEVs: 10.5 Atk\nIVs: -1.5 Spe",
    )[0];
    expect(row.p.level).toBe(50.5);
    expect(row.p.statParams.evs.attack).toBe(10.5);
    expect(row.p.statParams.ivs.speed).toBe(-1.5);
    expect(rowProblems(row, "file", "unknown").length).toBeGreaterThan(0);
  });
  it("valida metadatos opcionales sin requerir migración de guardados v5", () => {
    const s = importSet();
    s.team[0].showdown!.happiness = 999;
    expect(() => parseSession(JSON.stringify(s))).toThrow();
    expect(parseSession(JSON.stringify(newSession())).version).toBe(5);
  });
});
