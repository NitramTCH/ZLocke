import type { Pokemon, Move } from "./battle";
import { resolveEffects } from "./effects";
import { engineSpeed } from "./calcAdapter";
export type SpeedResult =
  | { ok: false; reasons: string[] }
  | { ok: true; value: number; conditions: string[]; notes: string[] };
export function effectiveSpeed(p: Pokemon): SpeedResult {
  const e = resolveEffects(p, "speed", "Pokémon");
  const reasons = [...e.missing];
  if (p.speed === null) reasons.push("Falta velocidad de la ficha.");
  if (p.stages.speed === null) reasons.push("Falta etapa de velocidad.");
  if (p.paralysis === "unknown") reasons.push("Falta confirmar parálisis.");
  if (reasons.length) return { ok: false, reasons };
  const value = engineSpeed(p, e);
  return Number.isFinite(value)
    ? {
        ok: true,
        value,
        conditions: e.conditions,
        notes: [
          ...e.notes,
          ...(e.ability
            ? [
                `${p.ability}: ${["Unburden", "Slow Start"].includes(e.ability) ? "efecto de velocidad compatible contemplado" : "sin modificador de velocidad en este alcance"}.`,
              ]
            : []),
          ...(e.item
            ? [`${p.item}: efecto compatible contemplado si corresponde.`]
            : []),
        ],
      }
    : { ok: false, reasons: ["Velocidad fuera del alcance del adaptador."] };
}
export function actionOrder(
  a: Pokemon,
  d: Pokemon,
  am: Move,
  dm: Move,
): string {
  if (am.priority === null || dm.priority === null)
    return "Orden no determinado: falta prioridad de uno de los movimientos seleccionados.";
  if (am.priority !== dm.priority)
    return `Referencia por prioridad: ${am.priority > dm.priority ? "tu Pokémon" : "el rival"} actuaría antes (${am.priority} frente a ${dm.priority}).`;
  const av = effectiveSpeed(a),
    dv = effectiveSpeed(d);
  if (!av.ok || !dv.ok)
    return "Misma prioridad; faltan datos para comparar velocidad efectiva.";
  return av.value === dv.value
    ? "Misma prioridad y empate de velocidad efectiva: orden no asegurado."
    : `Misma prioridad; ${av.value > dv.value ? "tu Pokémon" : "el rival"} actuaría antes por velocidad efectiva.`;
}
