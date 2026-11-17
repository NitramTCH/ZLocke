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
export interface Move {
  name: string;
  type: Type | "";
  category: "Desconocida" | "Físico" | "Especial" | "Estado";
}
export interface Pokemon {
  id: string;
  name: string;
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
  moves: Move[];
}
export interface Session {
  version: 1;
  demo: boolean;
  team: Pokemon[];
  rival: Pokemon;
  activeId: string;
}
export const blankPokemon = (): Pokemon => ({
  id: crypto.randomUUID(),
  name: "",
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
  moves: Array.from({ length: 4 }, () => ({
    name: "",
    type: "",
    category: "Desconocida",
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
  return {
    version: 1,
    demo: false,
    team: [p],
    rival: blankPokemon(),
    activeId: p.id,
  };
}
export function demoSession(): Session {
  const s = newSession();
  Object.assign(s.team[0], {
    name: "Volt · ejemplo",
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
    types: ["Fuego", "Volador"],
    typesKnown: true,
    hp: 86,
    maxHp: 100,
    speed: 75,
  });
  s.team.push(p);
  Object.assign(s.rival, {
    name: "Rival · ejemplo",
    types: ["Agua", "Tierra"],
    typesKnown: true,
    moves: [
      { name: "Terremoto", type: "Tierra", category: "Físico" },
      { name: "Rayo hielo", type: "Hielo", category: "Especial" },
      { name: "", type: "", category: "Desconocida" },
      { name: "", type: "", category: "Desconocida" },
    ],
  });
  s.demo = true;
  return s;
}
export function parseSession(text: string): Session {
  const s = JSON.parse(text);
  const validP = (p: Pokemon) =>
    p &&
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    typeof p.ability === "string" &&
    typeof p.item === "string" &&
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
    (p.hp === null || p.maxHp === null || p.hp <= p.maxHp) &&
    Array.isArray(p.moves) &&
    p.moves.length === 4 &&
    p.moves.every(
      (m) =>
        m &&
        typeof m.name === "string" &&
        (m.type === "" || TYPES.includes(m.type)) &&
        ["Desconocida", "Físico", "Especial", "Estado"].includes(m.category),
    );
  if (
    s.version !== 1 ||
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
      "Partida incompatible o datos inválidos. Revisa el JSON (versión 1).",
    );
  return s;
}
