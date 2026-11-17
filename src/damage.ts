import {
  completeTypes,
  effectiveness,
  type Move,
  type Pokemon,
  type Type,
  type StageKey,
} from "./battle";
import { resolveEffects } from "./effects";
import { engineDamage } from "./calcAdapter";
export const RULES_LABEL = "Reglas estándar de generación IX";
export const DAMAGE_SCOPE =
  "Referencia para individuales; no garantiza compatibilidad con fangames. Un impacto, sin crítico; contempla nivel, estadísticas reales antes de etapas, etapas, STAB 1,5×, tipos, 16 tiradas (85–100) y quemadura física. Escenario sin clima, terreno, pantallas, protección, teracristalización ni otros estados/efectos. Aplica solo habilidades/objetos compatibles y activados; desconocidos y no implementados se omiten en una referencia condicionada. No simula efectos secundarios o posteriores al golpe. Precisión separada; no decide el orden ni la mejor jugada.";
export type DamageResult =
  | { ok: false; reasons: string[] }
  | {
      ok: true;
      rolls: number[];
      min: number;
      max: number;
      percent: [number, number] | null;
      ko: "guaranteed" | "possible" | "no" | "fainted" | "unknown";
      conditions: string[];
      applied: string[];
      immunity: "types" | "effects" | null;
    };
export function predictDamage(a: Pokemon, d: Pokemon, m: Move): DamageResult {
  const reasons: string[] = [];
  if (m.category === "Estado" || m.powerMode === "status")
    return {
      ok: false,
      reasons: ["Movimiento de estado: sus efectos no son daño directo."],
    };
  if (m.powerMode === "variable")
    return {
      ok: false,
      reasons: ["Potencia variable/condicionada: no está implementada."],
    };
  if (m.powerMode === "fixed")
    return {
      ok: false,
      reasons: [
        "Daño fijo, proporcional, de respuesta o KO directo: no está implementado.",
      ],
    };
  if (m.damageKind !== "direct")
    reasons.push(
      "Efectos especiales o sin verificar: selecciona un ataque simple del catálogo o confirma manualmente un impacto de daño directo simple.",
    );
  if (!m.type) reasons.push("Falta el tipo del movimiento.");
  if (m.category === "Desconocida")
    reasons.push("Falta la categoría física/especial del movimiento.");
  if (m.powerMode !== "number" || m.power === null)
    reasons.push("Falta potencia fija del movimiento.");
  else if (m.power < 1 || m.power > 250 || !Number.isInteger(m.power))
    reasons.push("Potencia fuera del alcance validado (1–250).");
  if (!completeTypes(d))
    reasons.push("Faltan los tipos completos y confirmados del defensor.");
  const ae = resolveEffects(
    a,
    "damage",
    "atacante",
    m.type === "Fuego",
    false,
    m.category === "Físico",
  );
  const de = resolveEffects(
    d,
    "damage",
    "defensor",
    false,
    false,
    m.category === "Físico",
  );
  reasons.push(...ae.missing, ...de.missing);
  const ignored = ae.ability === "Mold Breaker" && de.item !== "Ability Shield";
  const eff = effectiveness(m.type, d.types, completeTypes(d));
  // Una inmunidad en este escenario no depende de ataque, defensa, nivel ni STAB.
  if (!reasons.length) {
    try {
      const early = engineDamage(a, d, m, ae, de);
      if (early.every((n) => n === 0)) return finish(early, a, d, eff, ae, de);
    } catch {
      /* La validación siguiente enumera las dependencias reales. */
    }
  }
  if (
    de.ability === "Multiscale" &&
    !ignored &&
    (d.hp === null || d.maxHp === null)
  )
    reasons.push("Multiescamas necesita PS actuales y máximos del defensor.");
  if (
    m.category === "Físico" &&
    ae.ability === "Guts" &&
    a.burn !== "burned" &&
    a.paralysis === "unknown"
  )
    reasons.push("Agallas necesita confirmar parálisis del atacante.");
  if (!completeTypes(a))
    reasons.push(
      "Faltan los tipos completos y confirmados del atacante (STAB).",
    );
  if (a.level === null) reasons.push("Falta el nivel del atacante.");
  else if (a.level < 1 || a.level > 100)
    reasons.push("Nivel del atacante fuera del perfil (1–100).");
  const physical = m.category === "Físico";
  const atk: StageKey = physical ? "attack" : "spAttack";
  const def: StageKey = physical ? "defense" : "spDefense";
  const needed = [
    ["atacante", a, atk, physical ? "Ataque" : "Ataque especial"],
    ["defensor", d, def, physical ? "Defensa" : "Defensa especial"],
  ] as const;
  if (m.category !== "Desconocida")
    for (const [side, p, key, label] of needed) {
      if (p[key] === null) reasons.push(`Falta ${label} real del ${side}.`);
      else if (p[key]! < 1 || p[key]! > 999)
        reasons.push(
          `${label} real del ${side} fuera del alcance validado (1–999).`,
        );
      const ignoreStage =
        side === "atacante"
          ? de.ability === "Unaware" && !ignored
          : ae.ability === "Unaware";
      if (!ignoreStage && p.stages[key] === null)
        reasons.push(`Falta la etapa de ${label} del ${side}.`);
    }
  if (physical && a.burn === "unknown")
    reasons.push("Falta confirmar el estado de quemadura del atacante.");
  if (reasons.length) return { ok: false, reasons };
  try {
    const rolls = engineDamage(a, d, m, ae, de);
    if (
      !rolls.length ||
      rolls.some((n) => !Number.isFinite(n) || n < 0 || n > 65535)
    )
      return {
        ok: false,
        reasons: [
          "El motor necesita datos o mecánicas adicionales fuera del alcance; no se sustituyen por valores ficticios.",
        ],
      };
    return finish(rolls, a, d, eff, ae, de);
  } catch {
    return {
      ok: false,
      reasons: [
        "Interacción no compatible con el adaptador de estadísticas manuales.",
      ],
    };
  }
}

function finish(
  rolls: number[],
  a: Pokemon,
  d: Pokemon,
  eff: number | null,
  ae: ReturnType<typeof resolveEffects>,
  de: ReturnType<typeof resolveEffects>,
): DamageResult {
  const min = Math.min(...rolls),
    max = Math.max(...rolls);
  return {
    ok: true,
    rolls,
    min,
    max,
    percent:
      d.maxHp === null ? null : [(100 * min) / d.maxHp, (100 * max) / d.maxHp],
    ko:
      d.hp === null
        ? "unknown"
        : d.hp === 0
          ? "fainted"
          : min >= d.hp
            ? "guaranteed"
            : max >= d.hp
              ? "possible"
              : "no",
    conditions: [...ae.conditions, ...de.conditions],
    applied: [
      ...ae.notes,
      ...de.notes,
      ...[
        [a, ae],
        [d, de],
      ].flatMap(([p, e]) => {
        const mon = p as Pokemon;
        const effects = e as typeof ae;
        return [
          ...(effects.ability
            ? [
                `${mon.ability}: habilidad compatible contemplada${effects.abilityOn ? " (activación confirmada)" : ""}.`,
              ]
            : []),
          ...(effects.item
            ? [`${mon.item}: objeto compatible activo contemplado.`]
            : []),
        ];
      }),
    ],
    immunity: min === 0 && max === 0 ? (eff === 0 ? "types" : "effects") : null,
  };
}
