import speciesData from "./data/species.json";
import moveData from "./data/moves.json";
import type { StatValues } from "./statTypes";
import type { Move, Pokemon, Type } from "./battle";
export const CATALOG_VERSION =
  "PokéAPI · 89aa167e4867 · instantánea 17/11/2026";
export interface SpeciesEntry {
  id: number;
  name: string;
  types: Type[];
  baseStats: StatValues;
}
export interface MoveEntry extends Omit<
  Move,
  "source" | "damageKind" | "catalogId"
> {
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
    speciesId: entry.id,
    hpReview: (p.statMode !== "manual" && p.hp !== null) || p.hpReview,
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
    catalogId: id,
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

export function moveCapability(m: Move): {
  label: string;
  reason: string;
  canCalculate: boolean;
} {
  if (m.category === "Estado" || m.powerMode === "status")
    return {
      label: "Movimiento de estado",
      reason: "Sus efectos no son daño directo.",
      canCalculate: false,
    };
  if (m.powerMode === "variable")
    return {
      label: "Efecto todavía no implementado",
      reason: "Potencia variable o condicionada.",
      canCalculate: false,
    };
  if (m.powerMode === "fixed")
    return {
      label: "Efecto todavía no implementado",
      reason: "Daño fijo, proporcional, de respuesta o KO directo.",
      canCalculate: false,
    };
  if (m.catalogId === null || !SIMPLE_MOVE_IDS.has(m.catalogId))
    return {
      label: "Efecto todavía no implementado",
      reason:
        m.catalogId === null
          ? "Movimiento manual sin una base de catálogo verificada: selecciona un movimiento compatible del buscador; sus ajustes se conservarán al editarlos."
          : "La mecánica de este movimiento no está verificada para el adaptador actual.",
      canCalculate: false,
    };
  return {
    label:
      [1, 5, 10, 11, 15, 17, 22, 25, 33, 55, 65, 70, 84, 98].includes(
        m.catalogId,
      ) && !m.source.includes("Ajuste manual")
        ? "Calculable"
        : "Calculable con limitaciones",
    reason:
      "Daño de un impacto con tipo, categoría y potencia introducidos. Otros efectos no se simulan; los datos que falten se indican en combate.",
    canCalculate: true,
  };
}
