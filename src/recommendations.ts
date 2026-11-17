import {
  TYPES,
  effectiveness,
  completeTypes,
  displayName,
  moveFactor,
  type Session,
  type Pokemon,
  type Move,
} from "./battle";
import {
  analyzeTactics,
  moveName,
  moveVisibility,
  damageText,
} from "./tactics";
import {
  intervalDamage,
  compareActionOrder,
  type IntervalDamage,
} from "./uncertainty";
import { currentHp, statModel, referencePokemon } from "./stats";
import { effectEntry, supportFor } from "./effects";
import { predictDamage } from "./damage";
import { entryScenario } from "./entry";
import { moveCapability } from "./catalog";
export type EntryContext = "normal" | "free";
export type Safety = "avoids" | "risk" | "falls" | "unknown";
export interface ExchangeEvidence {
  entryIndex: number | null;
  nextIndex: number;
  entryDamage: IntervalDamage | null;
  incoming: IntervalDamage;
  outgoing: IntervalDamage;
  order: ReturnType<typeof compareActionOrder>;
  hpAfterEntry: [number, number] | null;
  hpBeforeReply: [number, number] | null;
  response: "all" | "some" | "none" | "unknown";
  survival?: "all" | "some" | "none" | "unknown";
  note: string;
}
export interface SuggestedOption {
  id: string;
  kind: "attack" | "stay" | "switch";
  pokemonId: string;
  name: string;
  moveIndex: number | null;
  safety: Safety;
  coverage: number;
  expected: number;
  complete: boolean;
  offense: IntervalDamage | null;
  accuracy: number | null;
  preempts: boolean;
  evidence: ExchangeEvidence[];
  reasons: string[];
  risks: string[];
  missing: string[];
}
export interface Recommendation {
  action: string;
  label: string;
  reasons: string[];
  risk: string;
  primary: SuggestedOption | null;
  alternatives: SuggestedOption[];
  options: SuggestedOption[];
  context: EntryContext;
  coverage: string;
  limits: string[];
  typesOnly: string[];
  unscored: string[];
  needed: string[];
}
const known = (p: Pokemon) =>
  p.moves
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => moveVisibility(m) !== "unrevealed");
const accurate = (m: Move) => m.accuracyMode === "number" && m.accuracy === 100;
function effectLimits(p: Pokemon): string[] {
  const lines: string[] = [];
  if (p.paralysis === "paralyzed")
    lines.push(
      `${displayName(p)}: la pérdida de acción por parálisis no se simula; el orden solo contempla su reducción de velocidad.`,
    );
  if (p.burn === "burned")
    lines.push(
      `${displayName(p)}: el daño residual de quemadura no se descuenta; puede debilitar después del golpe.`,
    );
  for (const k of ["ability", "item"] as const) {
    const state = p[`${k}State`],
      entry = effectEntry(p, k),
      sup = supportFor(p, k);
    if (state === "unknown")
      lines.push(
        `${displayName(p)}: ${k === "ability" ? "habilidad desconocida" : "objeto desconocido"}; referencia sin sus efectos.`,
      );
    if (state === "known" && !sup)
      lines.push(
        `${displayName(p)}: ${p[k]} no implementado; puede invalidar la comparación.`,
      );
    if (k === "item" && state === "known" && entry?.slug.startsWith("choice-"))
      lines.push(
        `${displayName(p)}: bloqueo de movimiento por ${p.item} no implementado; confirma qué movimiento puede ejecutar. No se garantiza su disponibilidad.`,
      );
    if (k === "item" && entry?.slug === "assault-vest")
      lines.push(
        `${displayName(p)}: la restricción de movimientos de estado del Chaleco Asalto no se aplica aquí; esas opciones no se recomiendan automáticamente.`,
      );
  }
  return lines;
}
const safetyFrom = (
  responses: ExchangeEvidence["response"][],
  complete: boolean,
): Safety =>
  !complete || !responses.length || responses.includes("unknown")
    ? "unknown"
    : responses.every((r) => r === "all")
      ? "avoids"
      : responses.some((r) => r === "none")
        ? "falls"
        : "risk";
const hpRange = (
  hp: number | null,
  r: IntervalDamage,
): [number, number] | null =>
  hp === null || !r.ok
    ? null
    : [Math.max(0, hp - r.max), Math.max(0, hp - r.min)];
// A turn-boundary response is deliberately narrower than a one-hit prediction.
// Do not carry activated/consumed/time-dependent effects through an unmodelled transition.
function transitionProblem(p: Pokemon): string | null {
  const a = effectEntry(p, "ability")?.slug,
    item = effectEntry(p, "item")?.slug;
  if (
    p.abilityState === "known" &&
    !p.abilitySuppressed &&
    ["flash-fire", "unburden", "slow-start"].includes(a ?? "")
  )
    return `${p.ability}: evolución de activación/tiempo no contemplada entre entrada y respuesta.`;
  if (
    p.itemState === "known" &&
    p.itemActivation !== "inactive" &&
    ["air-balloon", "life-orb"].includes(item ?? "")
  )
    return `${p.item}: consumo/retroceso entre golpes no simulado; respuesta posterior no evaluada.`;
  const stableAbilities = [
    "huge-power",
    "pure-power",
    "adaptability",
    "levitate",
    "water-absorb",
    "volt-absorb",
    "thick-fat",
    "fur-coat",
    "ice-scales",
    "filter",
    "solid-rock",
    "multiscale",
    "mold-breaker",
    "guts",
    "unaware",
    "klutz",
  ];
  const stableItems = [
    "choice-band",
    "choice-specs",
    "choice-scarf",
    "expert-belt",
    "assault-vest",
    "macho-brace",
    "ability-shield",
  ];
  if (
    p.abilityState === "known" &&
    supportFor(p, "ability") &&
    !p.abilitySuppressed &&
    !stableAbilities.includes(a ?? "")
  )
    return `${p.ability}: transición todavía no verificada.`;
  if (
    p.itemState === "known" &&
    supportFor(p, "item") &&
    p.itemActivation !== "inactive" &&
    !stableItems.includes(item ?? "")
  )
    return `${p.item}: transición todavía no verificada.`;
  return null;
}
function fixed(p: Pokemon, s: Session): Pokemon | null {
  const model = statModel(p, s.evPolicy);
  return model.ok && !model.estimated ? referencePokemon(p, s.evPolicy) : null;
}
// Exact-stat paths enumerate real damage rolls for the entering blow. Each path
// retains its own HP; subsequent calculations reuse the engine with that HP.
// No Cartesian product of independent IV/EV/nature envelopes is used.
function responseEvidence(
  s: Session,
  p: Pokemon,
  move: Move,
  entryMove: { m: Move; i: number } | null,
  next: { m: Move; i: number },
): ExchangeEvidence {
  const r = s.rival,
    entryDamage = entryMove
      ? intervalDamage(r, p, entryMove.m, s.evPolicy)
      : null;
  const outgoing = intervalDamage(p, r, move, s.evPolicy),
    incoming = intervalDamage(r, p, next.m, s.evPolicy);
  const order = compareActionOrder(p, r, move, next.m, s.evPolicy);
  const hp = currentHp(p),
    afterEntry = entryDamage
      ? hpRange(hp, entryDamage)
      : hp === null
        ? null
        : ([hp, hp] as [number, number]);
  const base: ExchangeEvidence = {
    entryIndex: entryMove?.i ?? null,
    nextIndex: next.i,
    entryDamage,
    incoming,
    outgoing,
    order,
    hpAfterEntry: afterEntry,
    hpBeforeReply: null,
    response: "unknown",
    note: "",
  };
  if (!incoming.ok || !outgoing.ok || (entryDamage && !entryDamage.ok)) {
    base.note = "Faltan cálculos para esta ruta.";
    return base;
  }
  if (hp === null) {
    base.note = "Faltan PS actuales confirmados; no se supone salud completa.";
    return base;
  }
  const fp = fixed(p, s),
    fr = fixed(r, s),
    transition = [transitionProblem(p), transitionProblem(r)].filter(Boolean);
  if (!fp || !fr) {
    base.note =
      "Respuesta posterior sin evaluar: hacen falta fichas Manual/Calculado con parámetros conocidos; no se suman extremos de escenarios estimados.";
    return base;
  }
  if (transition.length) {
    base.note = transition.join(" ");
    return base;
  }
  const entryRolls =
    entryDamage && entryDamage.ok ? [...new Set(entryDamage.rolls)] : [0];
  const outcomes: boolean[] = [],
    ends: boolean[] = [],
    remaining: number[] = [],
    nextResults: Extract<IntervalDamage, { ok: true }>[] = [];
  let hiddenKO = false;
  for (const amount of entryRolls) {
    const hpIn = Math.max(0, hp - amount);
    if (!hpIn) {
      outcomes.push(false);
      ends.push(false);
      remaining.push(0);
      continue;
    }
    const atEntry = { ...fp, hp: hpIn, hpReview: false };
    const before = predictDamage(atEntry, fr, move),
      hit = predictDamage(fr, atEntry, next.m);
    if (!before.ok || !hit.ok) {
      base.note =
        "El motor no puede evaluar una ruta con los PS posteriores a la entrada.";
      return base;
    }
    nextResults.push(hit);
    // If order is uncertain, include both orders; it is not a probability.
    if (order.relation !== "rival") {
      outcomes.push(true);
      remaining.push(hpIn);
      const targetHp = currentHp(fr),
        stop = targetHp !== null && before.min >= targetHp && accurate(move);
      if (stop) ends.push(true);
      else {
        if (targetHp === null && hit.max >= hpIn) hiddenKO = true;
        if (targetHp !== null && before.max >= targetHp) ends.push(true);
        for (const damage of new Set(hit.rolls)) ends.push(hpIn > damage);
      }
    }
    if (order.relation !== "own")
      for (const damage of new Set(hit.rolls)) {
        const hpReply = Math.max(0, hpIn - damage);
        outcomes.push(hpReply > 0);
        ends.push(hpReply > 0);
        remaining.push(hpReply);
      }
  }
  base.hpBeforeReply = [Math.min(...remaining), Math.max(...remaining)];
  base.response = outcomes.every(Boolean)
    ? "all"
    : outcomes.some(Boolean)
      ? "some"
      : "none";
  base.survival = ends.every(Boolean)
    ? "all"
    : hiddenKO
      ? "unknown"
      : ends.some(Boolean)
        ? "some"
        : "none";
  if (nextResults.length) {
    const first = nextResults[0];
    base.incoming = {
      ...first,
      rolls: nextResults.flatMap((r) => r.rolls),
      min: Math.min(...nextResults.map((r) => r.min)),
      max: Math.max(...nextResults.map((r) => r.max)),
      percent: nextResults.every((r) => r.percent)
        ? [
            Math.min(...nextResults.map((r) => r.percent![0])),
            Math.max(...nextResults.map((r) => r.percent![1])),
          ]
        : null,
      ko: "unknown",
    };
  }
  base.note = `${entryMove ? "Golpe al entrar y siguiente intercambio" : "Entrada libre: solo siguiente intercambio"}, condicionado a ataques rivales acertados, sin efectos secundarios/residuales ni cambios de elección/estado. ${base.response === "all" ? "Puede llegar a ejecutar la respuesta en todas las rutas calculadas." : base.response === "none" ? "Cae antes de responder en todas las rutas calculadas de este par." : "No se garantiza llegar a responder; depende de la ruta u orden."}`;
  return base;
}
function attackOption(
  s: Session,
  p: Pokemon,
  m: Move,
  index: number,
): SuggestedOption {
  const threats = known(s.rival).filter(
      ({ m }) => moveCapability(m).canCalculate,
    ),
    out = intervalDamage(p, s.rival, m, s.evPolicy),
    hp = currentHp(p);
  const evidence: ExchangeEvidence[] = threats.map(({ m: enemy, i }) => {
    const incoming = intervalDamage(s.rival, p, enemy, s.evPolicy),
      order = compareActionOrder(p, s.rival, m, enemy, s.evPolicy);
    let response: ExchangeEvidence["response"] = "unknown";
    if (hp !== null && hp > 0 && incoming.ok && out.ok) {
      const stops =
        out.ko === "guaranteed" && order.relation === "own" && accurate(m);
      if (stops || incoming.max < hp) response = "all";
      else if (
        incoming.min >= hp &&
        (order.relation === "rival" || out.ko === "no")
      )
        response = "none";
      else response = "some";
    }
    return {
      entryIndex: null,
      nextIndex: i,
      entryDamage: null,
      incoming,
      outgoing: out,
      order,
      hpAfterEntry: null,
      hpBeforeReply:
        hp === null
          ? null
          : order.relation === "own"
            ? [hp, hp]
            : order.relation === "uncertain" && incoming.ok
              ? [Math.max(0, hp - incoming.max), hp]
              : hpRange(hp, incoming),
      response,
      note: "Intercambio actual; un KO previo solo evita el golpe si el ataque puede ejecutarse y acierta. Los PS previos a responder respetan el orden; no son los PS finales del intercambio.",
    };
  });
  const coverage = evidence.filter(
      (e) => e.incoming.ok && e.outgoing.ok,
    ).length,
    complete = threats.length > 0 && coverage === threats.length;
  const preempts =
    complete &&
    out.ok &&
    out.ko === "guaranteed" &&
    evidence.every((e) => e.order.relation === "own");
  return {
    id: `attack-${index}`,
    kind: "attack",
    pokemonId: p.id,
    name: `Atacar con ${moveName(m, index)}`,
    moveIndex: index,
    safety: safetyFrom(
      evidence.map((e) => e.response),
      complete,
    ),
    coverage,
    expected: threats.length,
    complete,
    offense: out,
    accuracy: m.accuracyMode === "number" ? m.accuracy : null,
    preempts,
    evidence,
    reasons: [
      out.ok
        ? `${moveName(m, index)}: ${damageText(out)}.`
        : out.reasons.join(" "),
      preempts
        ? "Debilita antes de los ataques conocidos calculables en todos los escenarios del cálculo si acierta."
        : "El orden se contrasta con cada ataque rival conocido calculable.",
      `Precisión separada: ${m.accuracyMode === "number" ? m.accuracy + "%" : "especial/desconocida"}; no es probabilidad de ganar.`,
    ],
    risks: [
      ...effectLimits(p),
      ...effectLimits(s.rival),
      ...(!accurate(m)
        ? [
            "Un fallo o una precisión no confirmada puede dejar que el rival golpee.",
          ]
        : []),
    ],
    missing: [
      ...(hp === null ? ["PS actuales del activo."] : []),
      ...(!out.ok ? out.reasons : []),
    ],
  };
}
function switchOptions(s: Session, context: EntryContext): SuggestedOption[] {
  const threats = known(s.rival).filter(
    ({ m }) => moveCapability(m).canCalculate,
  );
  return s.team
    .filter((p) => p.id !== s.activeId && currentHp(p) !== 0)
    .flatMap((original) => {
      const p = entryScenario(original),
        moves = p.moves
          .map((m, i) => ({ m, i }))
          .filter(({ m }) => moveCapability(m).canCalculate);
      // Keep an unevaluated candidate instead of making absent offense score as zero.
      return (moves.length ? moves : [{ m: null, i: null }]).map(
        ({ m, i }): SuggestedOption => {
          const entries = context === "normal" ? threats : [null];
          const evidence = m
            ? entries.flatMap((entry) =>
                threats.map((next) => responseEvidence(s, p, m, entry, next)),
              )
            : [];
          const hits = threats.map((t) =>
            intervalDamage(s.rival, p, t.m, s.evPolicy),
          );
          const coverage = hits.filter((r) => r.ok).length,
            complete = threats.length > 0 && coverage === threats.length;
          const out = m ? intervalDamage(p, s.rival, m, s.evPolicy) : null;
          const missing = [
            ...(currentHp(p) === null ? ["PS actuales del compañero."] : []),
            ...(!m
              ? [
                  "Movimiento ofensivo compatible del compañero; las opciones de estado siguen sin puntuar.",
                ]
              : []),
            ...evidence
              .filter((e) => e.response === "unknown")
              .map((e) => e.note),
            ...hits.flatMap((h) => (h.ok ? [] : h.reasons)),
          ];
          return {
            id: `switch-${p.id}-${i ?? "pending"}`,
            kind: "switch",
            pokemonId: p.id,
            name: `${context === "free" ? "Dar entrada libre" : "Cambiar"} a ${displayName(p)}${m ? `; responder con ${moveName(m, i!)}` : ""}`,
            moveIndex: i,
            safety: safetyFrom(
              evidence.map((e) => e.survival ?? "unknown"),
              complete,
            ),
            coverage,
            expected: threats.length,
            complete,
            offense: out,
            accuracy: m?.accuracyMode === "number" ? m.accuracy : null,
            preempts:
              !!out?.ok &&
              out.ko === "guaranteed" &&
              evidence.length > 0 &&
              evidence.every((e) => e.order.relation === "own"),
            evidence,
            reasons: [
              context === "normal"
                ? "El cambio consume el turno: recibe el golpe de entrada aunque sea más rápido."
                : "No se carga un golpe de entrada: contexto de reemplazo libre, no cambio voluntario.",
              m
                ? `Respuesta ${moveName(m, i!)}: ${out ? damageText(out) : "sin daño comparable"}.`
                : "Capacidad ofensiva pendiente; no se interpreta como daño cero.",
              `Cobertura ${coverage}/${threats.length} amenazas compatibles; etapas reiniciadas, sin heredar las del activo.`,
            ],
            risks: [
              ...effectLimits(p),
              ...effectLimits(s.rival),
              ...(context === "normal"
                ? [
                    "Ataques ocultos o efectos excluidos pueden invalidar la respuesta prevista; el cálculo supone que los estados no cambian entre golpes.",
                  ]
                : []),
              "Responder no implica sobrevivir después de responder ni ganar el combate.",
            ],
            missing: [...new Set(missing)],
          };
        },
      );
    });
}
function offenseDominates(a: SuggestedOption, b: SuggestedOption): boolean {
  if (
    !a.offense?.ok ||
    !b.offense?.ok ||
    a.accuracy === null ||
    b.accuracy === null
  )
    return false;
  const aKO = a.offense.ko === "guaranteed",
    bKO = b.offense.ko === "guaranteed";
  // Within equally survivable options, require no worse KO, precision, order
  // and damage endpoints. Do not add PS, percentages and precision in a score.
  return (
    (!bKO || aKO) &&
    a.accuracy >= b.accuracy &&
    (!b.preempts || a.preempts) &&
    a.offense.min >= b.offense.min &&
    a.offense.max >= b.offense.max &&
    (a.accuracy > b.accuracy ||
      (a.preempts && !b.preempts) ||
      (aKO && !bKO) ||
      a.offense.min > b.offense.min ||
      a.offense.max > b.offense.max)
  );
}
export function recommend(s: Session, requested: EntryContext): Recommendation {
  const t = analyzeTactics(s),
    context = t.activeFainted ? "free" : requested,
    active = t.active;
  if (currentHp(s.rival) === 0)
    return {
      action:
        "Rival confirmado debilitado: confirma el siguiente enfrentamiento",
      label: "Sin acción de combate disponible contra este rival",
      reasons: ["El rival tiene 0 PS confirmados; no se recomienda atacarlo."],
      risk: "Los datos del siguiente rival todavía no están introducidos.",
      primary: null,
      alternatives: [],
      options: [],
      context,
      coverage: "Sin enfrentamiento activo que comparar.",
      limits: [],
      typesOnly: [],
      unscored: [],
      needed: ["Introduce el siguiente rival y sus PS conocidos."],
    };
  const attacks =
    context === "normal" && !t.activeFainted
      ? active.moves
          .map((m, i) => ({ m, i }))
          .filter(({ m }) => moveCapability(m).canCalculate)
          .map(({ m, i }) => attackOption(s, active, m, i))
      : [];
  const switches = switchOptions(s, context);
  const stay: SuggestedOption = {
    id: "stay",
    kind: "stay",
    pokemonId: active.id,
    name: `Mantener a ${displayName(active)} en campo`,
    moveIndex: null,
    safety: "unknown",
    coverage: t.threats.filter((e) => e.result.ok).length,
    expected: t.expectedCoverage,
    complete: false,
    offense: null,
    accuracy: null,
    preempts: false,
    evidence: [],
    reasons: [
      "Mantener el activo evita gastar un turno en el cambio; no significa pasar turno ni elegir un movimiento de estado automáticamente.",
    ],
    risks: [
      "Falta valorar qué acción concreta usaría; los movimientos de estado no se puntúan.",
    ],
    missing: [],
  };
  if (
    currentHp(active) !== null &&
    currentHp(active) !== 0 &&
    t.expectedCoverage > 0 &&
    stay.coverage === t.expectedCoverage
  ) {
    stay.complete = true;
    stay.safety = t.threats
      .filter((e) => e.result.ok)
      .every((e) => e.result.ok && e.result.max < currentHp(active)!)
      ? "avoids"
      : "risk";
  }
  const options = [
    ...attacks,
    ...(context === "normal" && !t.activeFainted ? [stay] : []),
    ...switches,
  ];
  const complete = options.filter((o) => o.complete),
    survives = complete.filter((o) => o.safety === "avoids");
  // A voluntary switch is preferred only to avoid risk that no evaluated active
  // attack (or staying) avoids. A free entry is an independent decision.
  const activeSafe = survives.filter(
    (o) => o.kind === "attack" && o.offense?.ok && o.offense.max > 0,
  );
  const pool = activeSafe.length
    ? activeSafe
    : context === "normal" && stay.safety === "avoids"
      ? [stay]
      : survives.filter((o) => o.kind === "switch");
  const frontier = pool.filter(
    (b) => !pool.some((a) => a !== b && offenseDominates(a, b)),
  );
  const primary: SuggestedOption | null =
    frontier.length === 1 ? frontier[0] : null;
  // Several equivalent responses of the same companion are real alternatives;
  // avoid silently picking one by slot/order.
  let action = "",
    reasons: string[] = [],
    risk = "";
  if (primary) {
    action = primary.name;
    reasons = [
      primary.kind === "switch"
        ? "Este compañero llega a responder y evita el debilitamiento hasta el final del intercambio acotado, dentro de todas las rutas calculadas."
        : "Evita el debilitamiento en el intercambio evaluado, condicionado a ejecutar la acción y a los efectos contemplados.",
      ...primary.reasons,
    ].slice(0, 3);
    risk =
      primary.risks[0] ??
      "Solo cubre ataques conocidos calculables y efectos contemplados; no garantiza el resultado real.";
  } else if (frontier.length > 1) {
    action = "Comparar alternativas antes de elegir";
    reasons = [
      "Hay opciones que evitan el debilitamiento dentro del alcance, pero ninguna domina en todos los criterios.",
      "Daño, precisión y orden ofrecen ventajas contrapuestas; no se impone un ganador por una puntuación.",
    ];
    risk = "La información disponible no justifica una única acción.";
  } else {
    action =
      context === "free"
        ? "Elegir una entrada libre con cautela"
        : "No hay una acción calculable que descarte el riesgo";
    reasons = [
      "Ninguna opción demuestra evitar el debilitamiento y responder con la cobertura exigida.",
      "Los datos incompletos no cuentan como daño cero ni como supervivencia.",
    ];
    risk =
      "Puede haber opciones útiles de estado o efectos no evaluados; los cálculos disponibles no resuelven la decisión.";
  }
  const compatible = t.threats.filter(
    (e) => moveCapability(e.move).canCalculate,
  );
  const common = compatible.filter((e) =>
    options
      .filter((o) => o.kind !== "stay")
      .every((o) =>
        o.evidence.some((v) => v.nextIndex === e.index && v.incoming.ok),
      ),
  );
  const unidentified = t.unidentified;
  const unscored = [
    ...active.moves.map((m, i) => ({ m, i, owner: displayName(active) })),
    ...s.team
      .filter((p) => p.id !== active.id && currentHp(p) !== 0)
      .flatMap((p) => p.moves.map((m, i) => ({ m, i, owner: displayName(p) }))),
    ...known(s.rival).map(({ m, i }) => ({ m, i, owner: "Rival" })),
  ]
    .filter(
      ({ m }) =>
        moveVisibility(m) !== "unrevealed" && !moveCapability(m).canCalculate,
    )
    .map(
      ({ m, i, owner }) =>
        `${owner}: ${moveName(m, i)} · ${moveCapability(m).label}; opción no evaluada, no inútil.`,
    );
  const limits = [
    ...(unidentified
      ? [
          `${unidentified} ranuras rivales sin identificar; no se cubren sus ataques ni su prioridad.`,
        ]
      : []),
    ...new Set(options.flatMap((o) => o.risks)),
    "Sin peligros de entrada, críticos, protección, cambios de estado/etapas, daño residual, curación, retrocesos, consumo o efectos secundarios entre golpes. No se eligen jugadas rivales ni se simulan turnos sucesivos.",
  ];
  const needed = [...new Set(options.flatMap((o) => o.missing))];
  if (!compatible.length)
    needed.unshift(
      "Revela al menos un movimiento rival compatible y sus datos.",
    );
  if (unidentified)
    needed.unshift("Revela los movimientos rivales que faltan y su prioridad.");
  if (
    options.some((o) =>
      o.evidence.some((e) => e.order.relation === "uncertain"),
    )
  )
    needed.push(
      "Confirma prioridades, velocidad efectiva o intervalos más estrechos; empate/solapamiento no decide orden.",
    );
  const typesOnly: string[] = [];
  if (!compatible.length || !options.some((o) => o.offense?.ok)) {
    for (const row of t.offense) {
      const factor = moveFactor(row.move, s.rival);
      if (
        factor !== null &&
        row.move.category !== "Estado" &&
        row.move.category !== "Desconocida"
      )
        typesOnly.push(
          `${row.name}: efectividad por tipos ×${factor}; no es daño ni supervivencia.`,
        );
    }
    for (const sw of t.switches) {
      for (const hit of sw.hits) {
        const factor = moveFactor(hit.move, sw.entry);
        if (
          factor !== null &&
          hit.move.category !== "Estado" &&
          hit.move.category !== "Desconocida"
        )
          typesOnly.push(
            `${sw.name} frente a ${hit.name}: tipos ×${factor}; no prueba que sobreviva al cambiar.`,
          );
      }
    }
  }
  if (
    !typesOnly.length &&
    !options.some((o) => o.offense?.ok) &&
    completeTypes(s.rival)
  ) {
    const weaknesses = TYPES.map((type) => ({
      type,
      factor: effectiveness(type, s.rival.types, true)!,
    })).filter((x) => x.factor > 1);
    typesOnly.push(
      `Rival por tipos: ${weaknesses.length ? weaknesses.map((x) => `${x.type} ×${x.factor}`).join(", ") : "sin debilidades de tipo"}. Orientación de tipos, no daño; no se supone que dispongas de esos movimientos ni se aplican habilidades/objetos.`,
    );
  }
  const relevant = primary
    ? [
        primary,
        ...options.filter(
          (o) =>
            o !== primary &&
            (o.kind !== primary.kind ||
              !primary.offense?.ok ||
              !o.offense?.ok ||
              !offenseDominates(primary, o)),
        ),
      ]
    : frontier.length
      ? frontier
      : options.filter((o) => o.kind !== "stay");
  // Show at most two distinct alternatives, preferring useful coverage. Unknown
  // options remain explicitly unranked, never win by having less information.
  const alternatives: SuggestedOption[] = [];
  for (const o of relevant) {
    if (o === primary || alternatives.some((a) => a.id === o.id)) continue;
    alternatives.push(o);
    if (alternatives.length === 2) break;
  }
  if (primary && unscored.length)
    risk =
      "Hay movimientos de estado o efectos sin evaluar que pueden cambiar esta lectura. " +
      risk;
  if (primary && unidentified)
    risk = `Quedan ${unidentified} ranuras rivales sin identificar. ${risk}`;
  if (
    primary?.kind === "attack" &&
    primary.preempts &&
    !accurate(active.moves[primary.moveIndex!])
  )
    risk =
      "Si falla, el rival puede golpear antes de que lo debilites. " + risk;
  return {
    action,
    label:
      typesOnly.length && !primary
        ? "Orientación por tipos · sin recomendación de daño"
        : "Recomendación provisional",
    reasons,
    risk,
    primary,
    alternatives,
    options,
    context,
    coverage: `Amenazas comunes evaluables entre todas las opciones: ${common.length}/${compatible.length}${common.length ? " (" + common.map((e) => e.name).join(", ") + ")" : ""}. Se exige cobertura completa de las ${compatible.length} amenazas compatibles conocidas para destacar supervivencia; las opciones incompletas no ganan por datos ausentes.`,
    limits: [...new Set(limits)],
    typesOnly,
    unscored,
    needed: [...new Set(needed)],
  };
}
