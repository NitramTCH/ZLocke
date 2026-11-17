import {
  TYPES,
  blankPokemon,
  parseSession,
  type Pokemon,
  type Session,
} from "./battle";
import {
  MOVES,
  SPECIES,
  normalize,
  selectMove,
  selectSpecies,
} from "./catalog";
import { ABILITIES, ITEMS } from "./effects";
import { NATURES, STAT_LABELS, statModel } from "./stats";
import { STAT_KEYS, validParams, type StatKey } from "./statTypes";
import aliases from "./data/showdown-aliases.json";

export interface ShowdownInfo {
  sex: "M" | "F" | null;
  shiny: boolean;
  happiness: number;
  origins: string[];
  raw: string;
}
export interface ShowdownRow {
  p: Pokemon;
  selected: boolean;
  syntaxErrors: string[];
  notices: string[];
}
export type EvChoice = "" | "file" | "zero";
export type ImportMode = "replace" | "append";
export const showKey = (s: string) =>
  normalize(s).replace(/[^a-z0-9♀♂]/g, "");
const tables = {
  species: SPECIES,
  moves: MOVES,
  abilities: ABILITIES,
  items: ITEMS,
};
export function resolveShowdown(
  kind: keyof typeof tables,
  value: string,
): number | null {
  const genderSpecies: Record<string, number> = { nidoranf: 29, nidoranm: 32 };
  if (kind === "species" && genderSpecies[showKey(value)])
    return genderSpecies[showKey(value)];
  const key = showKey(value);
  if (!key) return null;
  const entries = tables[kind];
  const matches = entries.filter(
    (e) =>
      showKey(e.name) === key ||
      showKey((aliases[kind] as Record<string, string>)[e.id] ?? "") === key,
  );
  return matches.length === 1 ? matches[0].id : null;
}
export function setShowdownSpecies(p: Pokemon, value: string): Pokemon {
  const id = resolveShowdown("species", value),
    e = SPECIES.find((e) => e.id === id);
  return e
    ? selectSpecies(p, e)
    : {
        ...p,
        species: value,
        speciesId: null,
        types: [],
        typesKnown: false,
        secondType: "unknown",
      };
}
export function setShowdownEffect(
  p: Pokemon,
  kind: "ability" | "item",
  value: string,
): Pokemon {
  const id = resolveShowdown(kind === "ability" ? "abilities" : "items", value);
  const e = (kind === "ability" ? ABILITIES : ITEMS).find((e) => e.id === id);
  const none = /^(none|ninguno|ninguna|sin objeto|sin habilidad)$/i.test(
    value.trim(),
  );
  return {
    ...p,
    [kind]: none ? "" : (e?.name ?? value),
    [`${kind}Id`]: none ? null : id,
    [`${kind}State`]: none ? "none" : value.trim() ? "known" : "unknown",
  };
}
export function setShowdownMove(p: Pokemon, i: number, value: string): Pokemon {
  const hidden = value.match(/^(.*?)\s*\[([^\]]+)\]$/);
  const hiddenId = hidden ? resolveShowdown("moves", hidden[1]) : null;
  const englishTypes = [
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
  ];
  const typeIndex = hidden
    ? TYPES.findIndex(
        (t, i) =>
          showKey(t) === showKey(hidden[2]) ||
          showKey(englishTypes[i]) === showKey(hidden[2]),
      )
    : -1;
  const id =
      hidden && hiddenId === 237 && typeIndex >= 0
        ? 237
        : resolveShowdown("moves", value),
    e = MOVES.find((e) => e.id === id);
  const m = e ? selectMove(e) : { ...blankPokemon().moves[0], name: value };
  if (hidden && id === 237) {
    m.name = `${e!.name} [${TYPES[typeIndex]}]`;
    m.type = TYPES[typeIndex];
    m.source += " · Showdown: tipo explícito";
  }
  return { ...p, moves: p.moves.map((old, j) => (i === j ? m : old)) };
}
const statAliases: Record<string, StatKey> = {
  hp: "hp",
  ps: "hp",
  atk: "attack",
  attack: "attack",
  ataque: "attack",
  def: "defense",
  defense: "defense",
  defensa: "defense",
  spa: "spAttack",
  spatk: "spAttack",
  spattack: "spAttack",
  spe: "speed",
  speed: "speed",
  vel: "speed",
  velocidad: "speed",
  spd: "spDefense",
  spdef: "spDefense",
  spdefense: "spDefense",
};
const numeric = (s: string) =>
  /^[-+]?(?:\d+\.?\d*|\.\d+)$/.test(s.trim()) ? Number(s) : NaN;

export function parseShowdown(text: string): ShowdownRow[] {
  if (text.length > 1_000_000) throw new Error("El texto supera 1 MB.");
  const blocks = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n\s*\n/)
    .filter((x) => x.trim());
  if (blocks.length > 100)
    throw new Error(
      "Máximo 100 bloques en la vista previa; importa hasta seis cada vez.",
    );
  return blocks.map((raw) => {
    const lines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    let p = blankPokemon();
    p.statMode = "calculated";
    p.statParams.ivs = Object.fromEntries(
      STAT_KEYS.map((k) => [k, 31]),
    ) as typeof p.statParams.ivs;
    p.statParams.evs = Object.fromEntries(
      STAT_KEYS.map((k) => [k, 0]),
    ) as typeof p.statParams.evs;
    // Showdown describes a set, not the current battle state.
    const origins = [
      "IV omitidos: 31 (convención del formato).",
      "EV omitidos: 0 (solo al elegir usar los EV del archivo).",
      "Nivel omitido: pendiente; no se aplica el 100 del simulador.",
      "Naturaleza omitida: desconocida; no se presume Fuerte.",
      "PS actuales y estados de combate: desconocidos.",
    ];
    const info: ShowdownInfo = {
      sex: null,
      shiny: false,
      happiness: 255,
      origins,
      raw,
    };
    const syntaxErrors: string[] = [],
      notices: string[] = [];
    const header = lines.shift() ?? "";
    const at = header.indexOf(" @ ");
    let identity = at < 0 ? header : header.slice(0, at);
    if (at >= 0) {
      p = setShowdownEffect(p, "item", header.slice(at + 3));
      origins.push(`Objeto explícito: ${header.slice(at + 3)}.`);
    } else {
      p.itemState = "none";
      origins.push(
        "Objeto omitido: ninguno según el formato; confirma que el exportador sigue esta convención.",
      );
    }
    const gender = identity.match(/\s+\(([MF])\)$/i);
    if (gender) {
      info.sex = gender[1].toUpperCase() as "M" | "F";
      identity = identity.slice(0, gender.index).trim();
    }
    const named = identity.match(/^(.*)\s+\(([^()]+)\)$/);
    p = setShowdownSpecies(p, named ? named[2] : identity.trim());
    p.name = named ? named[1].trim() : "";
    const seen = new Set<string>();
    let moveIndex = 0;
    for (const line of lines) {
      if (/^[-–]\s*/.test(line)) {
        if (moveIndex >= 4)
          syntaxErrors.push(
            "Más de cuatro movimientos: corrige el bloque; no se descartan silenciosamente.",
          );
        else p = setShowdownMove(p, moveIndex, line.replace(/^[-–]\s*/, ""));
        moveIndex++;
        continue;
      }
      const nature =
        line.match(/^(.+?)\s+(?:Nature|Naturaleza)$/i) ??
        line.match(/^Naturaleza:\s*(.+)$/i);
      if (nature) {
        if (seen.has("nature")) syntaxErrors.push("Naturaleza duplicada.");
        seen.add("nature");
        const e = NATURES.find((n) =>
          [n.name, n.english].some((n) => showKey(n) === showKey(nature[1])),
        );
        p.statParams.natureId = e?.id ?? null;
        origins.push(`Naturaleza explícita: ${nature[1]}.`);
        if (!e)
          notices.push(
            `Naturaleza no reconocida: ${nature[1]}; queda desconocida hasta corregirla.`,
          );
        continue;
      }
      const field = line.match(/^([^:]+):\s*(.*)$/);
      if (!field) {
        syntaxErrors.push(`Línea no reconocida: ${line}`);
        continue;
      }
      const key = showKey(field[1]),
        value = field[2];
      if (seen.has(key)) syntaxErrors.push(`Campo duplicado: ${field[1]}.`);
      seen.add(key);
      if (key === "ability" || key === "habilidad")
        p = setShowdownEffect(p, "ability", value);
      else if (key === "level" || key === "nivel") p.level = numeric(value);
      else if (key === "shiny") {
        if (!/^(yes|no|si|sí)$/i.test(value))
          syntaxErrors.push(`Shiny no reconocido: ${value}.`);
        else info.shiny = !/^no$/i.test(value);
      } else if (key === "happiness" || key === "felicidad")
        info.happiness = numeric(value);
      else if (key === "evs" || key === "ivs") {
        const used = new Set<StatKey>();
        for (const token of value.split("/")) {
          const m = token.trim().match(/^([-+]?(?:\d+\.?\d*|\.\d+))\s+(.+)$/),
            stat = m && statAliases[showKey(m[2])];
          if (!m || !stat) {
            syntaxErrors.push(`${field[1]} no reconocido: ${token}.`);
            continue;
          }
          if (used.has(stat))
            syntaxErrors.push(
              `${field[1]} duplicados para ${STAT_LABELS[stat]}.`,
            );
          used.add(stat);
          p.statParams[key][stat] = numeric(m[1]);
        }
      } else {
        syntaxErrors.push(
          `Campo no compatible: ${field[1]}. Se conserva en el texto original; revisa antes de importar.`,
        );
      }
      origins.push(`${field[1]} explícito: ${value}.`);
    }
    if (
      !seen.has("happiness") &&
      !seen.has("felicidad") &&
      p.moves.some((m) => m.catalogId === 218)
    ) {
      info.happiness = 0;
      origins.push(
        "Felicidad omitida con Frustración: 0 según la convención especial de Showdown.",
      );
    }
    if (
      !seen.has("ivs") &&
      p.moves.some((m) => m.catalogId === 237 && m.name.includes("["))
    ) {
      STAT_KEYS.forEach((k) => {
        p.statParams.ivs[k] = null;
      });
      notices.push(
        "Poder Oculto con tipo explícito y sin IV: Showdown puede derivar un reparto especial. No se inventa aquí: IV desconocidos, confirma los de la ficha.",
      );
      origins.push(
        "Excepción a IV omitidos = 31: Poder Oculto tipado sin IV explícitos queda desconocido.",
      );
    }
    origins.push(
      `Sexo: ${info.sex ?? "desconocido"}; shiny ${seen.has("shiny") ? "explícito" : "omitido → no"}; felicidad ${seen.has("happiness") || seen.has("felicidad") ? "explícita" : `omitida → ${info.happiness}`}.`,
    );
    p.showdown = info;
    if (
      p.statParams.natureId === null ||
      STAT_KEYS.some(
        (k) => p.statParams.ivs[k] === null || p.statParams.evs[k] === null,
      )
    )
      p.statMode = "estimated";
    return { p, selected: true, syntaxErrors, notices };
  });
}
export function previewPokemon(row: ShowdownRow, ev: EvChoice): Pokemon {
  const p = structuredClone(row.p);
  if (ev === "zero")
    STAT_KEYS.forEach((k) => {
      p.statParams.evs[k] = 0;
    });
  return p;
}
export function rowProblems(
  row: ShowdownRow,
  ev: EvChoice,
  policy: Session["evPolicy"],
): string[] {
  const p = previewPokemon(row, ev),
    problems = [...row.syntaxErrors];
  if (
    !Number.isInteger(p.level) ||
    p.level === null ||
    p.level < 1 ||
    p.level > 100
  )
    problems.push("Introduce un nivel entero entre 1 y 100.");
  if (!validParams(p.statParams))
    problems.push(
      "IV deben ser enteros 0–31; EV 0–252 por estadística y total ≤510. Se conservan los originales: corrígelos, excluye este Pokémon o elige EV cero si procede.",
    );
  if (!p.species.trim()) problems.push("Falta especie.");
  if (
    p.showdown &&
    (!Number.isInteger(p.showdown.happiness) ||
      p.showdown.happiness < 0 ||
      p.showdown.happiness > 255)
  )
    problems.push("Felicidad debe estar entre 0 y 255.");
  if (
    policy === "zero" &&
    STAT_KEYS.some((k) => (p.statParams.evs[k] ?? 0) !== 0)
  )
    problems.push(
      "La partida tiene EV cero confirmados; los EV del archivo no nulos entran en conflicto. Cambia la configuración fuera del importador o elige EV cero explícitamente.",
    );
  if (p.statMode === "calculated") {
    if (!p.speciesId && !p.statParams.customBases)
      problems.push(
        "Especie/forma no resuelta: corrígela o elige Estimado y déjala pendiente.",
      );
    if (
      p.statParams.natureId === null ||
      STAT_KEYS.some(
        (k) => p.statParams.ivs[k] === null || p.statParams.evs[k] === null,
      )
    )
      problems.push(
        "Calculado necesita naturaleza, IV y EV completos; corrige o elige Estimado.",
      );
  }
  return problems;
}
export function pendingData(p: Pokemon): string[] {
  return [
    p.speciesId === null
      ? "Especie/forma pendiente; tipos y bases desconocidos."
      : "",
    p.hp === null ? "PS actuales desconocidos." : "",
    p.statParams.natureId === null ? "Naturaleza desconocida." : "",
    p.abilityState === "unknown" ? "Habilidad desconocida." : "",
    p.statMode === "estimated"
      ? "Ficha en modo Estimado; consulta sus supuestos."
      : "",
    ...STAT_KEYS.filter(
      (k) => p.statParams.ivs[k] === null || p.statParams.evs[k] === null,
    ).map((k) => `IV/EV desconocidos de ${STAT_LABELS[k]}.`),
  ].filter(Boolean);
}
export function buildShowdownImport(
  session: Session,
  rows: ShowdownRow[],
  ev: EvChoice,
  mode: ImportMode,
  fullHp = false,
): { session: Session; summary: string } {
  if (!ev) throw new Error("Elige usar los EV del archivo o ponerlos a cero.");
  const selected = rows.filter((r) => r.selected);
  if (!selected.length) throw new Error("Selecciona al menos un Pokémon.");
  const count = (mode === "append" ? session.team.length : 0) + selected.length;
  if (count > 6)
    throw new Error(
      "El equipo resultante supera seis. Excluye entradas o elige reemplazar.",
    );
  const problems = selected.flatMap((r, i) =>
    rowProblems(r, ev, session.evPolicy).map((e) => `Pokémon ${i + 1}: ${e}`),
  );
  if (problems.length) throw new Error(problems.join(" "));
  const imported = selected.map((r) => {
    const p = previewPokemon(r, ev);
    if (p.showdown)
      p.showdown.origins.push(
        "La ficha final incorpora las correcciones confirmadas en la vista previa; el texto original se conserva sin cambios.",
      );
    if (p.showdown)
      p.showdown.origins.push(
        ev === "zero"
          ? "Elección explícita: EV puestos a cero al importar."
          : "Elección explícita: usar los EV del archivo y sus convenciones.",
      );
    if (fullHp) {
      const model = statModel(p, session.evPolicy),
        hp = model.ok ? model.ranges.hp : null;
      if (hp && hp.min === hp.max) {
        p.hp = hp.max;
        p.hpReview = false;
      }
    }
    return p;
  });
  const team = mode === "append" ? [...session.team, ...imported] : imported;
  const next = parseSession(
    JSON.stringify({
      ...session,
      team,
      activeId: mode === "append" ? session.activeId : team[0].id,
    }),
  );
  const pending = imported.filter((p) => pendingData(p).length > 0).length;
  return {
    session: next,
    summary: `${imported.length} Pokémon importados. ${pending} con datos pendientes. ${fullHp ? "PS completos solo donde el máximo es exacto; los demás siguen desconocidos." : "PS actuales desconocidos; no se han rellenado."}`,
  };
}
