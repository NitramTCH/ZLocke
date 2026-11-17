import { displayName, type Pokemon, type Session, type Move } from "./battle";
import { moveCapability, MOVES } from "./catalog";
import { currentHp, statModel } from "./stats";
import { supportFor } from "./effects";
import { entryScenario } from "./entry";
import {
  intervalDamage,
  intervalSpeed,
  compareActionOrder,
  type IntervalDamage,
  type IntervalSpeed,
  type OrderComparison,
} from "./uncertainty";
export type Visibility = "unrevealed" | "partial" | "identified";
export interface OrderPair {
  rivalIndex: number;
  name: string;
  comparison: OrderComparison;
}
export interface TacticalMove {
  index: number;
  name: string;
  move: Move;
  visibility: Visibility;
  capability: ReturnType<typeof moveCapability>;
  result: IntervalDamage;
  explanation: string;
  orders: OrderPair[];
  mayRivalFirst: boolean;
  orderReason: string;
}
export interface ReceivedHit {
  index: number;
  name: string;
  move: Move;
  result: IntervalDamage;
  remaining: [number, number] | null;
  explanation: string;
}
export interface SwitchComparison {
  id: string;
  name: string;
  pokemon: Pokemon;
  entry: Pokemon;
  hits: ReceivedHit[];
  worstMax: number | null;
  coverage: number;
  expectedCoverage: number;
  comparable: boolean;
  entrySpeed: IntervalSpeed;
  hp: number | null;
  warnings: string[];
}
export interface TacticalData {
  confirmed: string[];
  assumptions: string[];
  missing: string[];
}
export interface TacticalSummary {
  active: Pokemon;
  rival: Pokemon;
  activeFainted: boolean;
  offense: TacticalMove[];
  threats: ReceivedHit[];
  switches: SwitchComparison[];
  excludedFainted: string[];
  unidentified: number;
  partial: number;
  unrevealed: number;
  expectedCoverage: number;
  knownThreatMessage: string;
  data: TacticalData;
}
export function moveVisibility(m: Move): Visibility {
  if (m.catalogId !== null || m.name.trim()) return "identified";
  return m.type !== "" ||
    m.category !== "Desconocida" ||
    m.power !== null ||
    m.priority !== null ||
    m.accuracy !== null
    ? "partial"
    : "unrevealed";
}
export const moveName = (m: Move, i: number) =>
  m.name.trim() ||
  MOVES.find((e) => e.id === m.catalogId)?.name ||
  `Movimiento ${i + 1} ${moveVisibility(m) === "partial" ? "parcial" : "sin identificar"}`;
export function koExplanation(r: IntervalDamage): string {
  if (!r.ok) return r.reasons.join(" ");
  switch (r.ko) {
    case "guaranteed":
      return "Debilita en todos los escenarios calculados si acierta.";
    case "possible":
      return "Puede debilitar en algunos escenarios calculados si acierta; no en todos.";
    case "no":
      return "Este golpe no debilita dentro de los escenarios calculados. Esto no garantiza sobrevivir al turno ni a efectos excluidos.";
    case "fainted":
      return "El objetivo figura ya debilitado (0 PS confirmados).";
    default:
      return "Faltan PS actuales confirmados del objetivo: no se concluye si debilita ni que sobreviva.";
  }
}
export function remainingHp(
  p: Pokemon,
  r: IntervalDamage,
): [number, number] | null {
  const hp = currentHp(p);
  return hp === null || !r.ok
    ? null
    : [Math.max(0, hp - r.max), Math.max(0, hp - r.min)];
}
function unmodeledOrderEffect(p: Pokemon): boolean {
  return (["ability", "item"] as const).some((kind) => {
    const state = kind === "ability" ? p.abilityState : p.itemState;
    return state === "unknown" || (state === "known" && !supportFor(p, kind));
  });
}
function dataFor(
  p: Pokemon,
  s: Session,
  role: "Activo" | "Rival",
): TacticalData {
  const name = `${role} (${displayName(p)})`;
  const out: TacticalData = { confirmed: [], assumptions: [], missing: [] };
  const hp = currentHp(p);
  if (hp === null)
    out.missing.push(
      `${name}: PS actuales ${p.hpReview ? "pendientes de revisión" : "desconocidos"}; no se supone salud completa.`,
    );
  else out.confirmed.push(`${name}: PS actuales confirmados ${hp}.`);
  if (p.statMode === "manual")
    out.confirmed.push(
      `${name}: modo Manual; solo se usan valores introducidos, no estadísticas de especie.`,
    );
  else {
    const model = statModel(p, s.evPolicy);
    out.assumptions.push(
      `${name}: ficha ${p.statMode === "estimated" ? "estimada; límites de escenarios, no probabilidades" : "calculada con parámetros conocidos"}.`,
    );
    if (model.ok)
      out.assumptions.push(...model.assumptions.map((x) => `${name}: ${x}`));
    else out.missing.push(...model.reasons.map((x) => `${name}: ${x}`));
  }
  for (const kind of ["ability", "item"] as const) {
    const state = kind === "ability" ? p.abilityState : p.itemState,
      label = kind === "ability" ? "Habilidad" : "Objeto";
    if (state === "none")
      out.confirmed.push(
        `${name}: ${kind === "ability" ? "habilidad: ninguna (ausencia confirmada)" : "objeto: ninguno (ausencia confirmada)"}.`,
      );
    else if (state === "unknown")
      out.missing.push(
        `${name}: ${label.toLowerCase()} ${kind === "ability" ? "desconocida" : "desconocido"}; referencia sin sus posibles efectos.`,
      );
    else {
      const sup = supportFor(p, kind);
      out.confirmed.push(
        `${name}: ${label.toLowerCase()} ${kind === "ability" ? "indicada" : "indicado"} ${p[kind]}.`,
      );
      if (!sup)
        out.missing.push(
          `${name}: efecto de ${p[kind]} no implementado; se omite en la referencia.`,
        );
      else if (
        (kind === "item" && p.itemActivation === "unknown") ||
        (kind === "ability" &&
          sup.conditional &&
          p.abilityActivation === "unknown")
      )
        out.missing.push(
          `${name}: activación de ${p[kind]} sin confirmar; puede requerirse según el cálculo.`,
        );
    }
  }
  return out;
}
export function analyzeTactics(s: Session): TacticalSummary {
  const active = s.team.find((p) => p.id === s.activeId)!;
  const rival = s.rival;
  const visibility = rival.moves.map(moveVisibility);
  const known = rival.moves
    .map((m, index) => ({ m, index }))
    .filter((x) => visibility[x.index] !== "unrevealed");
  const unrevealed = visibility.filter((v) => v === "unrevealed").length,
    partial = visibility.filter((v) => v === "partial").length,
    unidentified = unrevealed + partial;
  const threats: ReceivedHit[] = known.map(({ m, index }) => {
    const result = intervalDamage(rival, active, m, s.evPolicy);
    return {
      index,
      name: moveName(m, index),
      move: m,
      result,
      remaining: remainingHp(active, result),
      explanation: koExplanation(result),
    };
  });
  const offense = active.moves.map((m, index): TacticalMove => {
    const result = intervalDamage(active, rival, m, s.evPolicy);
    const orders = known.map(({ m: enemy, index: rivalIndex }) => ({
      rivalIndex,
      name: moveName(enemy, rivalIndex),
      comparison: compareActionOrder(active, rival, m, enemy, s.evPolicy),
    }));
    const before = orders.filter((x) => x.comparison.relation === "rival");
    const unresolved = orders.some(
      (x) => x.comparison.relation === "uncertain",
    );
    const hiddenEffect =
      unmodeledOrderEffect(active) || unmodeledOrderEffect(rival);
    const mayRivalFirst =
      before.length > 0 || unresolved || unidentified > 0 || hiddenEffect;
    const orderReason = before.length
      ? `El rival podría actuar antes frente a ${before.map((x) => x.name).join(", ")}; consulta su prioridad o velocidad.`
      : unresolved
        ? "No se determina el orden frente a todos los movimientos revelados."
        : unidentified > 0
          ? "No se puede descartar que el rival actúe antes: quedan movimientos sin identificar."
          : hiddenEffect
            ? "Habilidades u objetos desconocidos/no compatibles pueden cambiar el orden de la referencia."
            : "Frente a los movimientos revelados, esta referencia lo adelanta por prioridad o velocidad; no garantiza ejecutar la acción.";
    return {
      index,
      name: moveName(m, index),
      move: m,
      visibility: moveVisibility(m),
      capability: moveCapability(m),
      result,
      orders,
      mayRivalFirst,
      orderReason,
      explanation: result.ok
        ? `${koExplanation(result)} ${orderReason}`
        : `${moveCapability(m).label}. No se puntúa su utilidad. ${result.reasons.join(" ")}`,
    };
  });
  const expectedCoverage = known.filter(
    (x) => moveCapability(x.m).canCalculate,
  ).length;
  const excludedFainted: string[] = [];
  const switches: SwitchComparison[] = s.team
    .filter((p) => p.id !== active.id)
    .filter((p) => {
      if (currentHp(p) === 0) {
        excludedFainted.push(displayName(p));
        return false;
      }
      return true;
    })
    .map((p) => {
      const entry = entryScenario(p);
      const hits = known.map(({ m, index }): ReceivedHit => {
        const result = intervalDamage(rival, entry, m, s.evPolicy);
        return {
          index,
          name: moveName(m, index),
          move: m,
          result,
          remaining: remainingHp(entry, result),
          explanation: koExplanation(result),
        };
      });
      const computable = hits.filter((x) => x.result.ok);
      return {
        id: p.id,
        name: displayName(p),
        pokemon: p,
        entry,
        hits,
        hp: currentHp(p),
        worstMax: computable.length
          ? Math.max(...computable.map((x) => (x.result.ok ? x.result.max : 0)))
          : null,
        coverage: computable.length,
        expectedCoverage,
        comparable:
          expectedCoverage > 0 && computable.length === expectedCoverage,
        entrySpeed: intervalSpeed(entry, s.evPolicy),
        warnings: [
          "Al cambiar normalmente recibe el ataque rival; su velocidad no evita ese golpe.",
          "La velocidad mostrada corresponde a la ficha de entrada. Solo serviría para una acción posterior si permanece en combate y no cambian estados o efectos; no se simula el siguiente turno.",
          "Se reinician etapas en una copia y se aplica la entrada compatible. No se simulan peligros de entrada, otros efectos ni cambios posteriores al golpe.",
          ...(currentHp(p) === null
            ? [
                "PS actuales desconocidos o pendientes de revisión: no se suponen completos ni se afirma que sobreviva.",
              ]
            : []),
          ...(unidentified
            ? ["Quedan movimientos rivales sin identificar."]
            : []),
          ...(computable.length < expectedCoverage
            ? [
                "Faltan cálculos de movimientos compatibles: esta cobertura parcial no se compara con coberturas completas.",
              ]
            : []),
        ],
      };
    });
  const count = threats.filter((t) => t.result.ok).length;
  const knownThreatMessage =
    count === 0
      ? "Ninguna amenaza conocida calculable. No equivale a estar a salvo: los movimientos sin evaluar pueden ser decisivos."
      : `${count} movimiento${count === 1 ? "" : "s"} rival${count === 1 ? "" : "es"} conocido${count === 1 ? "" : "s"} calculable${count === 1 ? "" : "s"}; solo cubren los golpes y efectos contemplados.`;
  const ad = dataFor(active, s, "Activo"),
    rd = dataFor(rival, s, "Rival");
  const data: TacticalData = {
    confirmed: [...ad.confirmed, ...rd.confirmed],
    assumptions: [...ad.assumptions, ...rd.assumptions],
    missing: [...ad.missing, ...rd.missing],
  };
  if (unidentified)
    data.missing.push(
      `${unidentified} ranura${unidentified === 1 ? "" : "s"} rival${unidentified === 1 ? "" : "es"} sin identificar (${unrevealed} sin revelar y ${partial} con datos parciales).`,
    );
  for (const row of [...offense, ...threats])
    if (!row.result.ok)
      data.missing.push(`${row.name}: ${row.result.reasons.join(" ")}`);
  for (const [p, role] of [
    [active, "Activo"],
    [rival, "Rival"],
  ] as const) {
    const speed = intervalSpeed(p, s.evPolicy);
    if (!speed.ok)
      data.missing.push(
        ...speed.reasons.map((x) => `${role}, velocidad: ${x}`),
      );
    if (p.typesKnown)
      data.confirmed.push(`${role}: tipos confirmados ${p.types.join(" / ")}.`);
    else data.missing.push(`${role}: faltan tipos completos confirmados.`);
  }
  for (const row of offense) {
    if (row.move.priority === null)
      data.missing.push(`Prioridad sin confirmar de ${row.name} (propio).`);
  }
  for (const { m, index } of known) {
    if (m.priority === null)
      data.missing.push(
        `Prioridad sin confirmar de ${moveName(m, index)} (rival).`,
      );
  }
  data.missing = [...new Set(data.missing)];
  data.assumptions = [...new Set(data.assumptions)];
  return {
    active,
    rival,
    activeFainted: currentHp(active) === 0,
    offense,
    threats,
    switches,
    excludedFainted,
    unidentified,
    partial,
    unrevealed,
    expectedCoverage,
    knownThreatMessage,
    data,
  };
}
export function sortOffense(
  rows: TacticalMove[],
  byDamage: boolean,
): TacticalMove[] {
  return [...rows].sort((a, b) =>
    byDamage
      ? a.result.ok && b.result.ok
        ? b.result.max - a.result.max || a.index - b.index
        : a.result.ok
          ? -1
          : b.result.ok
            ? 1
            : a.index - b.index
      : a.index - b.index,
  );
}
export function sortSwitches(
  rows: SwitchComparison[],
  byWorst: boolean,
): SwitchComparison[] {
  return [...rows].sort((a, b) =>
    byWorst
      ? a.comparable && b.comparable
        ? a.worstMax! - b.worstMax!
        : a.comparable
          ? -1
          : b.comparable
            ? 1
            : 0
      : 0,
  );
}
export function damageText(r: IntervalDamage): string {
  return r.ok
    ? `${r.min}–${r.max} PS${r.percent ? ` · ${(Math.floor(r.percent[0] * 10) / 10).toFixed(1)}–${(Math.ceil(r.percent[1] * 10) / 10).toFixed(1)}% de PS máximos` : ""}`
    : "Sin daño comparable";
}
export function precisionText(m: Move): string {
  return m.accuracyMode === "number"
    ? `${m.accuracy}% de referencia`
    : m.accuracyMode === "special"
      ? "Especial / sin tirada estándar"
      : "Desconocida";
}
