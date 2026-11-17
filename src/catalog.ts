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
export interface MoveEntry extends Omit<Move, "source"> {
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
export function selectMove(entry: MoveEntry): Move {
  const { id, ...data } = entry;
  return { ...data, source: `${CATALOG_VERSION} · movimiento #${id}` };
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
