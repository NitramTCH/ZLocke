import speciesCatalog from "./data/species.json";
import moveCatalog from "./data/moves.json";
import {
  newStatParams,
  validParams,
  type StatMode,
  type StatParams,
  type EvPolicy,
} from "./statTypes";
import abilityCatalog from "./data/ability-catalog.json";
import itemCatalog from "./data/item-catalog.json";
export const TYPES = [
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
] as const;
export type Type = (typeof TYPES)[number];
// Filas: atacante. Columnas: defensor. Tabla moderna (generación VI en adelante).
const rows = [
  "1 1 1 1 1 1 1 1 1 1 1 1 .5 0 1 1 .5 1",
  "1 .5 .5 1 2 2 1 1 1 1 1 2 .5 1 .5 1 2 1",
  "1 2 .5 1 .5 1 1 1 2 1 1 1 2 1 .5 1 1 1",
  "1 1 2 .5 .5 1 1 1 0 2 1 1 1 1 .5 1 1 1",
  "1 .5 2 1 .5 1 1 .5 2 .5 1 .5 2 1 .5 1 .5 1",
  "1 .5 .5 1 2 .5 1 1 2 2 1 1 1 1 2 1 .5 1",
  "2 1 1 1 1 2 1 .5 1 .5 .5 .5 2 0 1 2 2 .5",
  "1 1 1 1 2 1 1 .5 .5 1 1 1 .5 .5 1 1 0 2",
  "1 2 1 2 .5 1 1 2 1 0 1 .5 2 1 1 1 2 1",
  "1 1 1 .5 2 1 2 1 1 1 1 2 .5 1 1 1 .5 1",
  "1 1 1 1 1 1 2 2 1 1 .5 1 1 1 1 0 .5 1",
  "1 .5 1 1 2 1 .5 .5 1 .5 2 1 1 .5 1 2 .5 .5",
  "1 2 1 1 1 2 .5 1 .5 2 1 2 1 1 1 1 .5 1",
  "0 1 1 1 1 1 1 1 1 1 2 1 1 2 1 .5 1 1",
  "1 1 1 1 1 1 1 1 1 1 1 1 1 1 2 1 .5 0",
  "1 1 1 1 1 1 .5 1 1 1 2 1 1 2 1 .5 1 .5",
  "1 .5 .5 .5 1 2 1 1 1 1 1 1 2 1 1 1 .5 2",
  "1 .5 1 1 1 1 2 .5 1 1 1 1 1 1 2 2 .5 1",
];
export const CHART = rows.map((row) => row.split(" ").map(Number));
export type StageKey =
  "attack" | "defense" | "spAttack" | "spDefense" | "speed";
export const STAGE_KEYS: StageKey[] = [
  "attack",
  "defense",
  "spAttack",
  "spDefense",
  "speed",
];
export const newStages = (
  value: number | null = 0,
): Record<StageKey, number | null> => ({
  attack: value,
  defense: value,
  spAttack: value,
  spDefense: value,
  speed: value,
});
export interface Move {
  name: string;
  catalogId: number | null;
  type: Type | "";
  category: "Desconocida" | "Físico" | "Especial" | "Estado";
  power: number | null;
  powerMode: "unknown" | "number" | "variable" | "fixed" | "status";
  accuracy: number | null;
  accuracyMode: "unknown" | "number" | "special";
  priority: number | null;
  source: string;
  damageKind: "unknown" | "direct" | "special";
}
export interface Pokemon {
  id: string;
  name: string;
  species: string;
  speciesId: number | null;
  statMode: StatMode;
  statParams: StatParams;
  hpReview: boolean;
  secondType: "unknown" | "none" | "known";
  types: Type[];
  typesKnown: boolean;
  level: number | null;
  hp: number | null;
  maxHp: number | null;
  attack: number | null;
  defense: number | null;
  spAttack: number | null;
  spDefense: number | null;
  speed: number | null;
  ability: string;
  item: string;
  abilityState: "unknown" | "none" | "known";
  itemState: "unknown" | "none" | "known";
  stages: Record<StageKey, number | null>;
  burn: "unknown" | "none" | "burned";
  abilityId: number | null;
  itemId: number | null;
  abilityActivation: "unknown" | "active" | "inactive";
  itemActivation: "unknown" | "active" | "inactive";
  abilitySuppressed: boolean;
  paralysis: "unknown" | "none" | "paralyzed";
  moves: Move[];
}
export interface Session {
  version: 5;
  evPolicy: EvPolicy;
  rules: "gen9-standard";
  demo: boolean;
  team: Pokemon[];
  rival: Pokemon;
  activeId: string;
}
export const blankPokemon = (): Pokemon => ({
  id: crypto.randomUUID(),
  name: "",
  species: "",
  speciesId: null,
  statMode: "manual",
  statParams: newStatParams(),
  hpReview: false,
  secondType: "unknown",
  types: [],
  typesKnown: false,
  level: null,
  hp: null,
  maxHp: null,
  attack: null,
  defense: null,
  spAttack: null,
  spDefense: null,
  speed: null,
  ability: "",
  item: "",
  abilityState: "unknown",
  itemState: "unknown",
  stages: newStages(),
  burn: "unknown",
  paralysis: "unknown",
  abilityId: null,
  itemId: null,
  abilityActivation: "unknown",
  itemActivation: "unknown",
  abilitySuppressed: false,
  moves: Array.from({ length: 4 }, () => ({
    name: "",
    catalogId: null,
    type: "",
    category: "Desconocida",
    power: null,
    powerMode: "unknown",
    accuracy: null,
    accuracyMode: "unknown",
    priority: null,
    source: "",
    damageKind: "unknown",
  })),
});
export function effectiveness(
  attack: Type | "",
  defense: Type[],
  known = true,
): number | null {
  if (!attack || !known || !defense.length) return null;
  return defense.reduce(
    (n, t) => n * CHART[TYPES.indexOf(attack)][TYPES.indexOf(t)],
    1,
  );
}
export function stab(
  type: Type | "",
  own: Type[],
  known = true,
): number | null {
  return !type || !known || !own.length ? null : own.includes(type) ? 1.5 : 1;
}
export function speedOrder(a: number | null, b: number | null): string {
  return a === null || b === null
    ? "Orden desconocido: falta la velocidad real."
    : a === b
      ? "Empate de velocidad: el orden no está asegurado."
      : a > b
        ? "Tu Pokémon es más rápido."
        : "El rival es más rápido.";
}
export function newSession(): Session {
  const p = blankPokemon();
  p.statMode = "estimated";
  const rival = blankPokemon();
  rival.statMode = "estimated";
  return {
    version: 5,
    evPolicy: "unknown",
    rules: "gen9-standard",
    demo: false,
    team: [p],
    rival,
    activeId: p.id,
  };
}
export function demoSession(): Session {
  const s = newSession();
  Object.assign(s.team[0], {
    name: "Volt · ejemplo",
    secondType: "none",
    types: ["Eléctrico"],
    typesKnown: true,
    level: 32,
    hp: 74,
    maxHp: 90,
    speed: 96,
    attack: 67,
    defense: 58,
    spAttack: 81,
    spDefense: 63,
    ability: "Desconocida",
    item: "Sin confirmar",
    moves: [
      { name: "Rayo", type: "Eléctrico", category: "Especial" },
      { name: "Surf", type: "Agua", category: "Especial" },
      { name: "Puño hielo", type: "Hielo", category: "Físico" },
      { name: "Protección", type: "Normal", category: "Estado" },
    ],
  });
  const p = blankPokemon();
  Object.assign(p, {
    name: "Brasa · ejemplo",
    secondType: "known",
    types: ["Fuego", "Volador"],
    typesKnown: true,
    hp: 86,
    maxHp: 100,
    speed: 75,
  });
  s.team.push(p);
  Object.assign(s.rival, {
    name: "Rival · ejemplo",
    secondType: "known",
    types: ["Agua", "Tierra"],
    typesKnown: true,
    moves: [
      { name: "Terremoto", type: "Tierra", category: "Físico" },
      { name: "Rayo hielo", type: "Hielo", category: "Especial" },
      { name: "", type: "", category: "Desconocida" },
      { name: "", type: "", category: "Desconocida" },
    ],
  });
  for (const p of [...s.team, s.rival])
    p.moves = p.moves.map(
      (m) =>
        ({
          ...m,
          catalogId: m.catalogId ?? null,
          power: null,
          powerMode: "unknown",
          accuracy: null,
          accuracyMode: "unknown",
          priority: null,
          source: "",
          damageKind: "unknown",
        }) as Move,
    );
  // Valores ficticios explícitos para demostrar ambos sentidos del daño.
  Object.assign(s.rival, {
    level: 32,
    hp: 95,
    maxHp: 120,
    attack: 80,
    defense: 72,
    spAttack: 70,
    spDefense: 64,
  });
  for (const p of [...s.team, s.rival]) {
    p.statMode = "manual";
    p.burn = "none";
    p.paralysis = "none";
    p.stages = newStages();
  }
  const demoMoves = [
    { power: 90, powerMode: "number", damageKind: "direct" },
    { power: 90, powerMode: "number", damageKind: "direct" },
    { power: 75, powerMode: "number", damageKind: "direct" },
    { power: null, powerMode: "status", damageKind: "special" },
  ] as const;
  s.team[0].moves = s.team[0].moves.map((m, i) => ({
    ...m,
    ...demoMoves[i],
    accuracy: i === 3 ? null : 100,
    accuracyMode: i === 3 ? "special" : "number",
    priority: i === 3 ? 4 : 0,
    catalogId: [85, 57, 8, 182][i],
    source: "Demostración ficticia",
  }));
  s.rival.moves = s.rival.moves.map((m, i) =>
    i < 2
      ? {
          ...m,
          power: i === 0 ? 100 : 90,
          powerMode: "number",
          damageKind: "direct",
          accuracy: 100,
          accuracyMode: "number",
          priority: 0,
          catalogId: i === 0 ? 89 : 58,
          source: "Demostración ficticia",
        }
      : m,
  );
  s.demo = true;
  return s;
}
export function parseSession(text: string): Session {
  const s = JSON.parse(text);
  const integer = (n: unknown, min: number, max: number) =>
    n === null ||
    (typeof n === "number" && Number.isSafeInteger(n) && n >= min && n <= max);
  const validP = (p: Pokemon) =>
    p &&
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    (s.version === 1 ||
      (typeof p.species === "string" &&
        ["unknown", "none", "known"].includes(p.secondType) &&
        (p.secondType !== "known" || p.types?.length === 2) &&
        (p.secondType !== "none" || p.types?.length === 1) &&
        (p.secondType !== "unknown" ||
          (!p.typesKnown && p.types?.length <= 1)) &&
        (!p.typesKnown || p.secondType !== "unknown"))) &&
    typeof p.ability === "string" &&
    typeof p.item === "string" &&
    (s.version < 3 ||
      (["unknown", "none", "known"].includes(p.abilityState) &&
        ["unknown", "none", "known"].includes(p.itemState) &&
        ["unknown", "none", "burned"].includes(p.burn) &&
        !!p.stages &&
        STAGE_KEYS.every((k) => integer(p.stages[k], -6, 6)) &&
        (p.abilityState !== "known" || p.ability.trim().length > 0) &&
        (p.itemState !== "known" || p.item.trim().length > 0))) &&
    (s.version < 4 ||
      (integer(p.abilityId, 1, 99999) &&
        integer(p.itemId, 1, 99999) &&
        (p.abilityId === null ||
          abilityCatalog.some(
            (e) => e.id === p.abilityId && e.name === p.ability,
          )) &&
        (p.itemId === null ||
          itemCatalog.some((e) => e.id === p.itemId && e.name === p.item)) &&
        ["unknown", "active", "inactive"].includes(p.abilityActivation) &&
        ["unknown", "active", "inactive"].includes(p.itemActivation) &&
        typeof p.abilitySuppressed === "boolean" &&
        ["unknown", "none", "paralyzed"].includes(p.paralysis) &&
        !(p.burn === "burned" && p.paralysis === "paralyzed"))) &&
    (s.version < 5 ||
      ((p.speciesId === null ||
        speciesCatalog.some(
          (e) => e.id === p.speciesId && e.name === p.species,
        )) &&
        ["manual", "calculated", "estimated"].includes(p.statMode) &&
        typeof p.hpReview === "boolean" &&
        validParams(p.statParams))) &&
    typeof p.typesKnown === "boolean" &&
    Array.isArray(p.types) &&
    p.types.length <= 2 &&
    new Set(p.types).size === p.types.length &&
    p.types.every((t) => TYPES.includes(t)) &&
    (!p.typesKnown || p.types.length > 0) &&
    [
      "level",
      "hp",
      "maxHp",
      "attack",
      "defense",
      "spAttack",
      "spDefense",
      "speed",
    ].every((k) => {
      const n = p[k as keyof Pokemon];
      return (
        n === null ||
        (typeof n === "number" &&
          Number.isSafeInteger(n) &&
          n >= (k === "hp" ? 0 : 1) &&
          n <= 99999)
      );
    }) &&
    ((s.version >= 5 && (p.statMode !== "manual" || p.hpReview)) ||
      p.hp === null ||
      p.maxHp === null ||
      p.hp <= p.maxHp) &&
    Array.isArray(p.moves) &&
    p.moves.length === 4 &&
    p.moves.every(
      (m) =>
        m &&
        typeof m.name === "string" &&
        (s.version < 5 ||
          m.catalogId === null ||
          moveCatalog.some((e) => e.id === m.catalogId)) &&
        (m.type === "" || TYPES.includes(m.type)) &&
        ["Desconocida", "Físico", "Especial", "Estado"].includes(m.category) &&
        (s.version === 1 ||
          (integer(m.power, 1, 99999) &&
            integer(m.accuracy, 1, 100) &&
            integer(m.priority, -7, 7) &&
            typeof m.source === "string" &&
            (s.version < 3 ||
              ["unknown", "direct", "special"].includes(m.damageKind)) &&
            ["unknown", "number", "variable", "fixed", "status"].includes(
              m.powerMode,
            ) &&
            ["unknown", "number", "special"].includes(m.accuracyMode) &&
            (m.powerMode !== "number" || m.power !== null) &&
            (m.accuracyMode !== "number" || m.accuracy !== null))),
    );
  if (
    !s ||
    ![1, 2, 3, 4, 5].includes(s.version) ||
    (s.version >= 3 && s.rules !== "gen9-standard") ||
    (s.version === 5 && !["unknown", "zero"].includes(s.evPolicy)) ||
    typeof s.demo !== "boolean" ||
    !Array.isArray(s.team) ||
    s.team.length < 1 ||
    s.team.length > 6 ||
    !s.team.every(validP) ||
    !validP(s.rival) ||
    new Set(s.team.map((p: Pokemon) => p.id)).size !== s.team.length ||
    !s.team.some((p: Pokemon) => p.id === s.activeId)
  )
    throw new Error(
      "Partida incompatible o datos inválidos. Revisa el JSON (versiones 1, 2, 3, 4 y 5).",
    );
  if (s.version === 1) {
    const migrate = (p: Pokemon): Pokemon => ({
      ...p,
      species: "",
      secondType: p.types.length === 2 ? "known" : "unknown",
      typesKnown: p.types.length === 2 && p.typesKnown,
      moves: p.moves.map((m) => ({
        ...m,
        power: null,
        powerMode: "unknown",
        accuracy: null,
        accuracyMode: "unknown",
        priority: null,
        source: "",
      })),
    });
    s.team = s.team.map(migrate);
    s.rival = migrate(s.rival);
  }
  if (s.version < 3) {
    const migrateDamage = (p: Pokemon): Pokemon => ({
      ...p,
      abilityState: "unknown",
      itemState: "unknown",
      stages: newStages(null),
      burn: "unknown",
      moves: p.moves.map((m) => ({ ...m, damageKind: "unknown" })),
    });
    s.team = s.team.map(migrateDamage);
    s.rival = migrateDamage(s.rival);
    s.rules = "gen9-standard";
  }
  if (s.version < 4) {
    const migrateEffects = (p: Pokemon): Pokemon => ({
      ...p,
      abilityId: null,
      itemId: null,
      abilityActivation: "unknown",
      itemActivation: "unknown",
      abilitySuppressed: false,
      paralysis: p.burn === "burned" ? "none" : "unknown",
    });
    s.team = s.team.map(migrateEffects);
    s.rival = migrateEffects(s.rival);
  }
  if (s.version < 5) {
    const migrateStats = (p: Pokemon): Pokemon => ({
      ...p,
      speciesId: speciesCatalog.find((e) => e.name === p.species)?.id ?? null,
      statMode: "manual",
      statParams: newStatParams(),
      hpReview: false,
      moves: p.moves.map((m) => {
        const found = m.source.match(/movimiento #(\d+)/);
        const id = found ? Number(found[1]) : null;
        return {
          ...m,
          catalogId: id && moveCatalog.some((e) => e.id === id) ? id : null,
        };
      }),
    });
    return {
      ...s,
      version: 5,
      evPolicy: "unknown",
      team: s.team.map(migrateStats),
      rival: migrateStats(s.rival),
    };
  }
  return s;
}

export function completeTypes(p: Pokemon) {
  return p.typesKnown && p.secondType !== "unknown";
}
export function displayName(p: Pokemon) {
  return p.name || p.species || "Sin nombre";
}
export function moveFactor(m: Move, p: Pokemon): number | null {
  if (
    m.category === "Estado" ||
    m.category === "Desconocida" ||
    m.powerMode === "fixed"
  )
    return null;
  return effectiveness(m.type, p.types, completeTypes(p));
}
