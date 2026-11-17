import speciesData from "./data/species.json";
import moveData from "./data/moves.json";
import type { Move, Pokemon, Type } from "./battle";
export const CATALOG_VERSION =
  "PokéAPI · 89aa167e4867 · instantánea 17/11/2026";
export interface SpeciesEntry {
  id: number;
  name: string;
  types: Type[];
}
export interface MoveEntry extends Omit<Move, "source" | "damageKind"> {
  id: number;
}
export const SPECIES = speciesData as SpeciesEntry[];
export const MOVES = moveData as MoveEntry[];
export const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
export function search<T extends { name: string; id: number }>(
  entries: T[],
  query: string,
): T[] {
  const q = normalize(query);
  if (!q) return [];
  return entries
    .filter((e) => normalize(e.name).includes(q) || String(e.id) === q)
    .sort(
      (a, b) =>
        Number(normalize(b.name) === q) - Number(normalize(a.name) === q) ||
        Number(normalize(b.name).startsWith(q)) -
          Number(normalize(a.name).startsWith(q)) ||
        a.name.localeCompare(b.name, "es"),
    );
}
export function selectSpecies(p: Pokemon, entry: SpeciesEntry): Pokemon {
  return {
    ...p,
    species: entry.name,
    types: [...entry.types],
    typesKnown: true,
    secondType: entry.types.length === 1 ? "none" : "known",
  };
}
// Ataques de un impacto cuya potencia fija y estadísticas usadas son ordinarias.
// Los efectos secundarios y posteriores al golpe no se simulan.
export const SIMPLE_MOVE_IDS = new Set([
  1, 5, 7, 8, 9, 10, 11, 15, 17, 22, 25, 29, 33, 34, 44, 52, 53, 55, 56, 57, 58,
  59, 60, 61, 65, 70, 71, 72, 84, 85, 87, 89, 93, 94, 98, 123, 126, 127, 129,
  145, 157, 158, 172, 188, 196, 202, 209, 225, 247, 249, 337, 352, 399, 403,
  414, 430, 442, 482, 583, 585, 605,
]);
export function selectMove(entry: MoveEntry): Move {
  const { id, ...data } = entry;
  return {
    ...data,
    damageKind:
      SIMPLE_MOVE_IDS.has(id) && data.powerMode === "number"
        ? "direct"
        : "special",
    source: `${CATALOG_VERSION} · movimiento #${id}`,
  };
}
export function powerLabel(m: Move): string {
  return m.category === "Estado"
    ? "Estado"
    : m.powerMode === "variable"
      ? "Variable"
      : m.powerMode === "fixed"
        ? "Daño especial"
        : m.powerMode === "number"
          ? String(m.power)
          : "Desconocida";
}
