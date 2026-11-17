export const STAT_KEYS = [
  "hp",
  "attack",
  "defense",
  "spAttack",
  "spDefense",
  "speed",
] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type StatValues = Record<StatKey, number>;
export type StatInputs = Record<StatKey, number | null>;
export type StatMode = "manual" | "calculated" | "estimated";
export type EvPolicy = "unknown" | "zero";
export const statRecord = (n: number | null): StatInputs =>
  Object.fromEntries(STAT_KEYS.map((k) => [k, n])) as StatInputs;
export interface StatParams {
  natureId: number | null;
  ivs: StatInputs;
  evs: StatInputs;
  ivMin: StatValues;
  ivMax: StatValues;
  evMin: StatValues;
  evMax: StatValues;
  customBases: StatValues | null;
  hpRule: "auto" | "standard" | "one";
}
export const newStatParams = (): StatParams => ({
  natureId: null,
  ivs: statRecord(null),
  evs: statRecord(null),
  ivMin: statRecord(0) as StatValues,
  ivMax: statRecord(31) as StatValues,
  evMin: statRecord(0) as StatValues,
  evMax: statRecord(252) as StatValues,
  customBases: null,
  hpRule: "auto",
});
export function validParams(p: StatParams): boolean {
  const int = (n: unknown, min: number, max: number) =>
    typeof n === "number" && Number.isSafeInteger(n) && n >= min && n <= max;
  return (
    !!p &&
    (p.natureId === null || int(p.natureId, 1, 25)) &&
    ["auto", "standard", "one"].includes(p.hpRule) &&
    STAT_KEYS.every(
      (k) =>
        (p.ivs?.[k] === null || int(p.ivs?.[k], 0, 31)) &&
        (p.evs?.[k] === null || int(p.evs?.[k], 0, 252)) &&
        int(p.ivMin?.[k], 0, 31) &&
        int(p.ivMax?.[k], p.ivMin[k], 31) &&
        int(p.evMin?.[k], 0, 252) &&
        int(p.evMax?.[k], p.evMin[k], 252),
    ) &&
    Object.values(p.evs).reduce<number>((n, v) => n + (v ?? 0), 0) <= 510 &&
    (p.customBases === null ||
      STAT_KEYS.every((k) => int(p.customBases?.[k], 1, 999)))
  );
}
