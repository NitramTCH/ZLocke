import species from "./data/species.json";
import natureData from "./data/natures.json";
import {
  STAT_KEYS,
  type StatKey,
  type StatValues,
  type StatInputs,
  type EvPolicy,
} from "./statTypes";
import type { Pokemon } from "./battle";
export { STAT_KEYS };
export const STAT_LABELS: Record<StatKey, string> = {
  hp: "PS máximos",
  attack: "Ataque",
  defense: "Defensa",
  spAttack: "At. especial",
  spDefense: "Def. especial",
  speed: "Velocidad",
};
export interface Nature {
  id: number;
  name: string;
  english: string;
  up: StatKey;
  down: StatKey;
}
export const NATURES = natureData as Nature[];
export interface Scenario {
  stats: StatValues;
  ivs: StatValues;
  evs: StatValues;
  natureId: number;
}
export interface StatRange {
  min: number;
  reference: number;
  max: number;
}
export type StatModel =
  | { ok: false; reasons: string[] }
  | {
      ok: true;
      ranges: Record<StatKey, StatRange | null>;
      reference: Scenario | null;
      bases: StatValues | null;
      estimated: boolean;
      assumptions: string[];
    };
export function currentHp(p: Pokemon): number | null {
  return p.hpReview ? null : p.hp;
}
export function basesFor(p: Pokemon): StatValues | null {
  return (
    p.statParams.customBases ??
    species.find((e) => e.id === p.speciesId)?.baseStats ??
    null
  );
}
export function statFormula(
  base: number,
  level: number,
  iv: number,
  ev: number,
  key: StatKey,
  nature: Nature,
  oneHp = false,
): number {
  if (key === "hp" && oneHp) return 1;
  const x = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100);
  if (key === "hp") return x + level + 10;
  return Math.floor(
    ((x + 5) *
      (nature.up === nature.down
        ? 100
        : nature.up === key
          ? 110
          : nature.down === key
            ? 90
            : 100)) /
      100,
  );
}
const minEV = (p: Pokemon, k: StatKey, policy: EvPolicy) =>
  p.statParams.evs[k] ?? (policy === "zero" ? 0 : p.statParams.evMin[k]);
function options(
  p: Pokemon,
  policy: EvPolicy,
): {
  reasons: string[];
  bases: StatValues | null;
  natures: Nature[];
  one: boolean;
} {
  const bases = basesFor(p),
    reasons: string[] = [];
  if (!bases)
    reasons.push(
      "Selecciona una especie del catálogo o introduce seis bases personalizadas.",
    );
  if (p.level === null)
    reasons.push("Introduce el nivel (no se supone nivel 100).");
  else if (p.level < 1 || p.level > 100)
    reasons.push("El perfil admite niveles 1–100.");
  if (
    policy === "zero" &&
    STAT_KEYS.some((k) => (p.statParams.evs[k] ?? 0) !== 0)
  )
    reasons.push(
      "EV a cero entra en conflicto con EV conocidos no nulos; se conservan. Revisa la configuración o los EV.",
    );
  if (
    policy === "zero" &&
    STAT_KEYS.some(
      (k) => p.statParams.evs[k] === null && p.statParams.evMin[k] > 0,
    )
  )
    reasons.push("EV a cero entra en conflicto con un intervalo mínimo de EV.");
  if (STAT_KEYS.reduce((n, k) => n + minEV(p, k, policy), 0) > 510)
    reasons.push("Los EV mínimos/conocidos superan el total legal de 510.");
  if (p.statMode === "calculated") {
    if (p.statParams.natureId === null)
      reasons.push("Falta naturaleza conocida para el modo calculado.");
    for (const k of STAT_KEYS) {
      if (p.statParams.ivs[k] === null)
        reasons.push(`Falta IV de ${STAT_LABELS[k]}.`);
      if (policy !== "zero" && p.statParams.evs[k] === null)
        reasons.push(`Falta EV de ${STAT_LABELS[k]}.`);
    }
  }
  return {
    bases,
    reasons,
    natures:
      p.statParams.natureId === null
        ? NATURES
        : NATURES.filter((n) => n.id === p.statParams.natureId),
    one:
      p.statParams.hpRule === "one" ||
      (p.statParams.hpRule === "auto" && p.speciesId === 292),
  };
}
interface Candidate {
  value: number;
  iv: number;
  ev: number;
}
const fingerprint = (p: Pokemon) =>
  JSON.stringify([
    p.level,
    p.speciesId,
    p.statMode,
    p.hp,
    p.hpReview,
    p.maxHp,
    p.attack,
    p.defense,
    p.spAttack,
    p.spDefense,
    p.speed,
    p.statParams,
  ]);
const candidateCache = new WeakMap<Pokemon, Map<string, Candidate[]>>();
function candidates(
  p: Pokemon,
  k: StatKey,
  n: Nature,
  b: StatValues,
  policy: EvPolicy,
  one: boolean,
): Candidate[] {
  let cache = candidateCache.get(p);
  if (!cache) {
    cache = new Map();
    candidateCache.set(p, cache);
  }
  const cacheKey = `${k}:${n.up === n.down ? 100 : n.up === k ? 110 : n.down === k ? 90 : 100}:${policy}:${fingerprint(p)}`;
  const existing = cache.get(cacheKey);
  if (existing) return existing;
  const par = p.statParams;
  const ivs =
    par.ivs[k] === null
      ? Array.from(
          { length: par.ivMax[k] - par.ivMin[k] + 1 },
          (_, i) => i + par.ivMin[k],
        )
      : [par.ivs[k]!];
  const evs: number[] = [];
  if (par.evs[k] !== null) evs.push(par.evs[k]!);
  else if (policy === "zero") evs.push(0);
  else
    for (let ev = par.evMin[k]; ev <= par.evMax[k]; ev++)
      if (
        ev === par.evMin[k] ||
        Math.floor(ev / 4) !== Math.floor((ev - 1) / 4)
      )
        evs.push(ev);
  const map = new Map<number, Candidate>();
  for (const iv of ivs)
    for (const ev of evs) {
      const value = statFormula(b[k], p.level!, iv, ev, k, n, one);
      const old = map.get(value);
      if (
        !old ||
        ev < old.ev ||
        (ev === old.ev && Math.abs(iv - 15) < Math.abs(old.iv - 15))
      )
        map.set(value, { value, iv, ev });
    }
  const result = [...map.values()].sort((a, b) => a.value - b.value);
  cache.set(cacheKey, result);
  return result;
}
function baseScenario(
  p: Pokemon,
  n: Nature,
  b: StatValues,
  policy: EvPolicy,
  one: boolean,
): Scenario {
  const ivs = {} as StatValues,
    evs = {} as StatValues,
    stats = {} as StatValues;
  for (const k of STAT_KEYS) {
    ivs[k] =
      p.statParams.ivs[k] ??
      Math.min(p.statParams.ivMax[k], Math.max(p.statParams.ivMin[k], 15));
    evs[k] = minEV(p, k, policy);
    stats[k] = statFormula(b[k], p.level!, ivs[k], evs[k], k, n, one);
  }
  return { stats, ivs, evs, natureId: n.id };
}
export function* legalScenarios(
  p: Pokemon,
  keys: StatKey[],
  policy: EvPolicy,
): Generator<Scenario> {
  const o = options(p, policy);
  if (o.reasons.length || !o.bases) return;
  const actual = currentHp(p);
  const selected = [
    ...new Set([...keys, ...(actual === null ? [] : ["hp" as const])]),
  ];
  const natureSeen = new Set<string>();
  for (const n of o.natures) {
    const signature = selected
      .map((k) =>
        k === "hp" || n.up === n.down
          ? 100
          : n.up === k
            ? 110
            : n.down === k
              ? 90
              : 100,
      )
      .join(",");
    if (natureSeen.has(signature)) continue;
    natureSeen.add(signature);
    const base = baseScenario(p, n, o.bases, policy, o.one);
    const lists = selected.map((k) =>
      candidates(p, k, n, o.bases!, policy, o.one).filter(
        (c) => k !== "hp" || actual === null || c.value >= actual,
      ),
    );
    const unused = STAT_KEYS.filter((k) => !selected.includes(k)).reduce(
      (sum, k) => sum + base.evs[k],
      0,
    );
    function* walk(i: number, cost: number, sc: Scenario): Generator<Scenario> {
      if (i === selected.length) {
        yield sc;
        return;
      }
      const key = selected[i];
      for (const c of lists[i])
        if (cost + c.ev <= 510)
          yield* walk(i + 1, cost + c.ev, {
            natureId: sc.natureId,
            stats: { ...sc.stats, [key]: c.value },
            ivs: { ...sc.ivs, [key]: c.iv },
            evs: { ...sc.evs, [key]: c.ev },
          });
    }
    yield* walk(0, unused, base);
  }
}
function buildStatModel(p: Pokemon, policy: EvPolicy): StatModel {
  if (p.statMode === "manual") {
    const ranges = {} as Record<StatKey, StatRange | null>;
    for (const k of STAT_KEYS) {
      const value = k === "hp" ? p.maxHp : p[k];
      ranges[k] =
        value === null ? null : { min: value, max: value, reference: value };
    }
    return {
      ok: true,
      ranges,
      reference: null,
      bases: basesFor(p),
      estimated: false,
      assumptions: ["Valores manuales confirmados; no se infieren IV/EV."],
    };
  }
  const o = options(p, policy);
  if (o.reasons.length || !o.bases) return { ok: false, reasons: o.reasons };
  const refNature = o.natures.find((n) => n.id === 1) ?? o.natures[0];
  let reference = baseScenario(p, refNature, o.bases, policy, o.one);
  const actual = currentHp(p);
  if (actual !== null && reference.stats.hp < actual) {
    const sc = [...legalScenarios(p, ["hp"], policy)]
      .filter((s) => s.natureId === refNature.id)
      .sort((a, b) => a.stats.hp - b.stats.hp)[0];
    if (!sc)
      return {
        ok: false,
        reasons: ["PS actuales incompatibles con los parámetros; revísalos."],
      };
    reference = sc;
  }
  const ranges = {} as Record<StatKey, StatRange>;
  for (const k of STAT_KEYS) {
    let min = Infinity,
      max = -Infinity;
    for (const sc of legalScenarios(p, [k], policy)) {
      min = Math.min(min, sc.stats[k]);
      max = Math.max(max, sc.stats[k]);
    }
    if (!Number.isFinite(min))
      return {
        ok: false,
        reasons: [
          "No hay escenarios legales con los EV, límites y PS confirmados.",
        ],
      };
    ranges[k] = { min, max, reference: reference.stats[k] };
  }
  return {
    ok: true,
    ranges,
    reference,
    bases: o.bases,
    estimated: p.statMode === "estimated",
    assumptions:
      p.statMode === "calculated"
        ? ["Naturaleza, IV y EV conocidos; fórmula de ficha de generación IX."]
        : [
            "Referencia no probabilística: naturaleza neutra si es desconocida, IV 15 si son desconocidos (ajustados al intervalo) y EV mínimos permitidos (0 por defecto). Los datos fijados prevalecen.",
            policy === "zero"
              ? "EV confirmados a cero."
              : "Límites incluyen EV desconocidos y total legal ≤510.",
          ],
  };
}
export function scenarioPokemon(p: Pokemon, sc: Scenario): Pokemon {
  const s = sc.stats;
  return {
    ...p,
    maxHp: s.hp,
    attack: s.attack,
    defense: s.defense,
    spAttack: s.spAttack,
    spDefense: s.spDefense,
    speed: s.speed,
    hp: currentHp(p),
  };
}
export function referencePokemon(p: Pokemon, policy: EvPolicy): Pokemon | null {
  const model = statModel(p, policy);
  return !model.ok
    ? null
    : model.reference
      ? scenarioPokemon(p, model.reference)
      : { ...p, hp: currentHp(p) };
}
export function markStatChange(p: Pokemon, patch: Partial<Pokemon>): Pokemon {
  return { ...p, ...patch, hpReview: p.hp !== null || p.hpReview };
}

const modelCache = new WeakMap<Pokemon, Map<string, StatModel>>();
export function statModel(p: Pokemon, policy: EvPolicy): StatModel {
  let cache = modelCache.get(p);
  if (!cache) {
    cache = new Map();
    modelCache.set(p, cache);
  }
  const key = policy + fingerprint(p);
  let result = cache.get(key);
  if (!result) {
    result = buildStatModel(p, policy);
    cache.set(key, result);
  }
  return result;
}
const scenarioCache = new WeakMap<Pokemon, Map<string, Scenario[]>>();
export function scenariosFor(
  p: Pokemon,
  keys: StatKey[],
  policy: EvPolicy,
): Scenario[] {
  let cache = scenarioCache.get(p);
  if (!cache) {
    cache = new Map();
    scenarioCache.set(p, cache);
  }
  const key = [policy, ...keys, fingerprint(p)].join(":");
  let value = cache.get(key);
  if (!value) {
    value = [...legalScenarios(p, keys, policy)];
    cache.set(key, value);
  }
  return value;
}
