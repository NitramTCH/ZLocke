import { moveCapability } from "./catalog";
import type { Pokemon, Move } from "./battle";
import type { EvPolicy, StatKey } from "./statTypes";
import {
  statModel,
  scenariosFor,
  scenarioPokemon,
  currentHp,
  type Scenario,
  referencePokemon,
} from "./stats";
import { predictDamage, type DamageResult } from "./damage";
import { effectiveSpeed } from "./speed";
export interface DamageUncertainty {
  randomReference: [number, number];
  statsAtMaxRoll: [number, number];
  witnesses: {
    minimum: Scenario | null;
    maximum: Scenario | null;
    defenderMinimum: Scenario | null;
    defenderMaximum: Scenario | null;
  };
  assumptions: string[];
}
export type IntervalDamage = DamageResult & { uncertainty?: DamageUncertainty };
interface Point {
  p: Pokemon;
  witness: Scenario | null;
}
function points(p: Pokemon, keys: StatKey[], policy: EvPolicy): Point[] {
  return p.statMode === "manual"
    ? [{ p: { ...p, hp: currentHp(p) }, witness: null }]
    : scenariosFor(p, keys, policy).map((sc) => ({
        p: scenarioPokemon(p, sc),
        witness: sc,
      }));
}
function buildIntervalDamage(
  a: Pokemon,
  d: Pokemon,
  m: Move,
  policy: EvPolicy,
): IntervalDamage {
  const capability = moveCapability(m);
  if (!capability.canCalculate)
    return {
      ok: false,
      reasons: [`${capability.label}: ${capability.reason}`],
    };
  const am = statModel(a, policy),
    dm = statModel(d, policy);
  if (!am.ok || !dm.ok)
    return {
      ok: false,
      reasons: [
        ...(!am.ok ? am.reasons.map((x) => `Atacante: ${x}`) : []),
        ...(!dm.ok ? dm.reasons.map((x) => `Defensor: ${x}`) : []),
      ],
    };
  const ar = referencePokemon(a, policy)!,
    dr = referencePokemon(d, policy)!;
  const ref = predictDamage(ar, dr, m);
  if (!ref.ok) return ref;
  const review = [
    ...(a.hpReview
      ? ["PS actuales del atacante pendientes de revisión; no se utilizan."]
      : []),
    ...(d.hpReview
      ? ["PS actuales del defensor pendientes de revisión; no se utilizan."]
      : []),
  ];
  if (!am.estimated && !dm.estimated)
    return { ...ref, conditions: [...ref.conditions, ...review] };
  const off = m.category === "Físico" ? "attack" : "spAttack",
    def = m.category === "Físico" ? "defense" : "spDefense";
  // En este subconjunto, el daño es monótono en Ataque y Defensa. Se evita el
  // dominio de desbordamientos antes de utilizar esa propiedad para los límites.
  const maxAtk = am.ranges[off]?.max,
    minDef = dm.ranges[def]?.min;
  const stageFactor = (s: number | null) =>
    s === null ? 1 : s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
  if (ref.max > 0 && maxAtk !== undefined && minDef !== undefined) {
    const conservative =
      (((Math.floor((2 * ar.level!) / 5) + 2) *
        m.power! *
        maxAtk *
        Math.max(1, stageFactor(ar.stages[off])) *
        3) /
        Math.max(
          1,
          Math.floor(minDef * Math.min(1, stageFactor(dr.stages[def]))),
        ) /
        50 +
        4) *
      2 *
      4 *
      1.3;
    if (conservative > 65535)
      return {
        ok: false,
        reasons: [
          "Los intervalos alcanzan un dominio numérico no verificado. Estrecha IV/EV o etapas para evitar desbordamientos del motor.",
        ],
      };
  }
  const candidates = points(a, [off], policy);
  if (!candidates.length)
    return { ok: false, reasons: ["No hay escenarios legales del atacante."] };
  let amin = candidates[0],
    amax = candidates[0];
  for (const sc of candidates) {
    if (sc.p[off]! < amin.p[off]!) amin = sc;
    if (sc.p[off]! > amax.p[off]!) amax = sc;
  }
  const attackers = amin.p[off] === amax.p[off] ? [amin] : [amin, amax];
  const defenders = points(d, dm.reference ? [def, "hp"] : [def], policy);
  if (!defenders.length)
    return { ok: false, reasons: ["No hay escenarios legales del defensor."] };
  let min = Infinity,
    max = -Infinity,
    pmin = Infinity,
    pmax = -Infinity,
    smin = Infinity,
    smax = -Infinity;
  let minA: Scenario | null = null,
    maxA: Scenario | null = null,
    minD: Scenario | null = null,
    maxD: Scenario | null = null;
  const cache = new Map<string, Extract<DamageResult, { ok: true }>>();
  for (const ap of attackers)
    for (const dp of defenders) {
      const full = dp.p.hp !== null && dp.p.hp === dp.p.maxHp;
      const key = `${ap.p[off]}:${dp.p[def]}:${full}`;
      let r = cache.get(key);
      if (!r) {
        const computed = predictDamage(ap.p, dp.p, m);
        if (!computed.ok) return computed;
        r = computed;
        cache.set(key, r);
      }
      if (r.min < min) {
        min = r.min;
        minA = ap.witness;
        minD = dp.witness;
      }
      if (r.max > max) {
        max = r.max;
        maxA = ap.witness;
        maxD = dp.witness;
      }
      smin = Math.min(smin, r.max);
      smax = Math.max(smax, r.max);
      if (dp.p.maxHp !== null) {
        pmin = Math.min(pmin, (100 * r.min) / dp.p.maxHp);
        pmax = Math.max(pmax, (100 * r.max) / dp.p.maxHp);
      }
    }
  const hp = currentHp(d);
  return {
    ...ref,
    min,
    max,
    percent: Number.isFinite(pmin) ? [pmin, pmax] : null,
    ko:
      hp === null
        ? "unknown"
        : hp === 0
          ? "fainted"
          : min >= hp
            ? "guaranteed"
            : max >= hp
              ? "possible"
              : "no",
    conditions: [
      ...ref.conditions,
      ...review,
      "Envolvente de escenarios legales, no distribución probabilística de naturalezas/IV.",
    ],
    uncertainty: {
      randomReference: [ref.min, ref.max],
      statsAtMaxRoll: [smin, smax],
      witnesses: {
        minimum: minA,
        maximum: maxA,
        defenderMinimum: minD,
        defenderMaximum: maxD,
      },
      assumptions: [...am.assumptions, ...dm.assumptions],
    },
  };
}
export type IntervalSpeed =
  | { ok: false; reasons: string[] }
  | {
      ok: true;
      value: number;
      min: number;
      max: number;
      estimated: boolean;
      conditions: string[];
      notes: string[];
    };
export function intervalSpeed(p: Pokemon, policy: EvPolicy): IntervalSpeed {
  const model = statModel(p, policy);
  if (!model.ok) return model;
  const ref = effectiveSpeed(referencePokemon(p, policy)!);
  if (!ref.ok) return ref;
  if (!model.estimated)
    return { ...ref, min: ref.value, max: ref.value, estimated: false };
  const samples = points(p, ["speed"], policy);
  let lo = samples[0],
    hi = samples[0];
  if (!lo)
    return { ok: false, reasons: ["No hay escenarios legales de velocidad."] };
  for (const sc of samples) {
    if (sc.p.speed! < lo.p.speed!) lo = sc;
    if (sc.p.speed! > hi.p.speed!) hi = sc;
  }
  const min = effectiveSpeed(lo.p),
    max = effectiveSpeed(hi.p);
  if (!min.ok || !max.ok)
    return !min.ok ? min : (max as { ok: false; reasons: string[] });
  return {
    ...ref,
    min: min.value,
    max: max.value,
    estimated: true,
    conditions: [...ref.conditions, ...model.assumptions],
  };
}
export function intervalOrder(
  a: Pokemon,
  d: Pokemon,
  am: Move,
  dm: Move,
  policy: EvPolicy,
): string {
  if (am.priority === null || dm.priority === null)
    return "Orden no determinado: falta prioridad de uno de los movimientos seleccionados.";
  if (am.priority !== dm.priority)
    return `Referencia por prioridad: ${am.priority > dm.priority ? "tu Pokémon" : "el rival"} actuaría antes (${am.priority} frente a ${dm.priority}).`;
  const av = intervalSpeed(a, policy),
    dv = intervalSpeed(d, policy);
  if (!av.ok || !dv.ok)
    return "Misma prioridad; faltan datos para comparar velocidad efectiva.";
  if (av.min > dv.max)
    return "Misma prioridad: tu Pokémon supera estrictamente todo el intervalo de velocidad rival.";
  if (dv.min > av.max)
    return "Misma prioridad: el rival supera estrictamente todo tu intervalo de velocidad.";
  return "Misma prioridad: los intervalos se solapan o hay empate posible; el orden no queda determinado.";
}

// Caché acotada por atacante; la clave incluye todos los datos, también para
// clientes que editen un objeto en vez de reemplazarlo. No modifica la partida.
const damageCache = new WeakMap<Pokemon, Map<string, IntervalDamage>>();
export function intervalDamage(
  a: Pokemon,
  d: Pokemon,
  m: Move,
  policy: EvPolicy,
): IntervalDamage {
  let cache = damageCache.get(a);
  if (!cache) {
    cache = new Map();
    damageCache.set(a, cache);
  }
  const key = JSON.stringify([a, d, m, policy]);
  const existing = cache.get(key);
  if (existing) return existing;
  const result = buildIntervalDamage(a, d, m, policy);
  if (cache.size >= 32) cache.delete(cache.keys().next().value!);
  cache.set(key, result);
  return result;
}
