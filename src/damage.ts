import {
  completeTypes,
  effectiveness,
  type Move,
  type Pokemon,
  type Type,
  type StageKey,
} from "./battle";
export const RULES_LABEL = "Reglas estándar de generación IX";
export const DAMAGE_SCOPE =
  "Referencia para individuales; no garantiza compatibilidad con fangames. Un impacto, sin crítico; contempla nivel, estadísticas reales antes de etapas, etapas, STAB 1,5×, tipos, 16 tiradas (85–100) y quemadura física. Escenario sin clima, terreno, pantallas, protección, teracristalización ni otros estados/efectos. Omite habilidades, objetos, efectos especiales y efectos secundarios o posteriores al golpe. Precisión separada; no decide el orden ni la mejor jugada.";
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
    };
function staged(stat: number, stage: number): number {
  return Math.max(
    1,
    Math.floor(stat * (stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage))),
  );
}
// Redondeo Pokémon: los empates exactos en .5 se redondean hacia abajo.
const pokeRound = (value: number) => Math.ceil(value - 0.5);
function conditions(a: Pokemon, d: Pokemon): string[] {
  return (
    [
      ["atacante", a],
      ["defensor", d],
    ] as const
  ).flatMap(([side, p]) =>
    (["ability", "item"] as const).flatMap((key) => {
      const state = key === "ability" ? p.abilityState : p.itemState;
      return state === "none"
        ? []
        : [
            `${key === "ability" ? "Habilidad" : "Objeto"} ${side}: ${state === "unknown" ? "desconocido; se omiten sus posibles efectos" : `${p[key]} indicado, pero su efecto no se aplica`}.`,
          ];
    }),
  );
}
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
  const eff = effectiveness(m.type, d.types, completeTypes(d));
  // Una inmunidad en este escenario no depende de ataque, defensa, nivel ni STAB.
  if (!reasons.length && eff === 0) return finish([0], a, d);
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
      if (p.stages[key] === null)
        reasons.push(`Falta la etapa de ${label} del ${side}.`);
    }
  if (physical && a.burn === "unknown")
    reasons.push("Falta confirmar el estado de quemadura del atacante.");
  if (reasons.length) return { ok: false, reasons };
  const attack = staged(a[atk]!, a.stages[atk]!);
  const defense = staged(d[def]!, d.stages[def]!);
  const base =
    Math.floor(
      Math.floor(
        ((Math.floor((2 * a.level!) / 5) + 2) * m.power! * attack) / defense,
      ) / 50,
    ) + 2;
  const hasSTAB = a.types.includes(m.type as Type);
  const rolls = Array.from({ length: 16 }, (_, i) => {
    let n = Math.floor((base * (85 + i)) / 100);
    if (hasSTAB) n = pokeRound(n * 1.5);
    n = Math.floor(n * eff!);
    if (physical && a.burn === "burned") n = Math.floor(n / 2);
    return Math.max(1, n);
  });
  if (base > 65535 || rolls.some((n) => n > 65535))
    return {
      ok: false,
      reasons: [
        "Resultado fuera del alcance numérico validado; no se simulan desbordamientos internos del juego.",
      ],
    };
  return finish(rolls, a, d);
}
function finish(rolls: number[], a: Pokemon, d: Pokemon): DamageResult {
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
    conditions: conditions(a, d),
  };
}
