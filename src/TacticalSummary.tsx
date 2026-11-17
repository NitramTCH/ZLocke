import { useMemo, useState } from "react";
import { displayName, type Session, type Pokemon } from "./battle";
import { currentHp } from "./stats";
import { RULES_LABEL, DAMAGE_SCOPE } from "./damage";
import {
  compareActionOrder,
  type IntervalDamage,
  type IntervalSpeed,
} from "./uncertainty";
import {
  analyzeTactics,
  sortOffense,
  sortSwitches,
  damageText,
  precisionText,
  type TacticalMove,
  type ReceivedHit,
  type SwitchComparison,
} from "./tactics";
const modeName = (p: Pokemon) =>
  ({
    manual: "manual confirmado",
    calculated: "ficha calculada",
    estimated: "estimado",
  })[p.statMode];
export function TacticalSummary({
  session: s,
  selection,
  onSelection,
}: {
  session: Session;
  selection: [number, number];
  onSelection: (own: number, rival: number) => void;
}) {
  const model = useMemo(() => analyzeTactics(s), [s]);
  const [view, setView] = useState("Panorama"),
    [damageSort, setDamageSort] = useState(false),
    [switchSort, setSwitchSort] = useState(false);
  const [own, enemy] = selection;
  const order = compareActionOrder(
    model.active,
    model.rival,
    model.active.moves[own],
    model.rival.moves[enemy],
    s.evPolicy,
  );
  const attacks = sortOffense(model.offense, damageSort),
    changes = sortSwitches(model.switches, switchSort);
  const kOs = model.offense.filter(
    (x) =>
      x.result.ok &&
      (x.result.ko === "guaranteed" || x.result.ko === "possible"),
  );
  const threats = model.threats.filter(
    (x) =>
      x.result.ok &&
      (x.result.ko === "guaranteed" || x.result.ko === "possible"),
  );
  const comparable = sortSwitches(model.switches, true).filter(
    (x) => x.comparable,
  );
  const lowest = comparable[0]?.worstMax;
  const lowestNames = comparable
    .filter((x) => x.worstMax === lowest)
    .map((x) => x.name);
  return (
    <section className="panel tactical-summary" aria-label="Resumen táctico">
      <div className="section-title">
        <div>
          <div className="eyebrow">LECTURA EXPLICADA · UN GOLPE</div>
          <h2>Resumen del enfrentamiento</h2>
        </div>
        <small>{RULES_LABEL}</small>
      </div>
      <p>
        {displayName(model.active)} frente a {displayName(model.rival)} ·
        Atacante propio {modeName(model.active)} · Rival {modeName(model.rival)}
        .
      </p>
      {model.activeFainted && (
        <div className="notice">
          El activo figura debilitado con 0 PS confirmados. Las proyecciones no
          significan que pueda atacar. Un reemplazo tras debilitamiento puede
          tener un contexto distinto del cambio normal mostrado aquí.
        </div>
      )}
      <div
        className="tactical-tabs"
        role="group"
        aria-label="Vistas del resumen"
      >
        {["Panorama", "Ataques", "Amenazas", "Cambios", "Datos y límites"].map(
          (tab) => (
            <button
              aria-pressed={view === tab}
              key={tab}
              onClick={() => setView(tab)}
            >
              {tab}
            </button>
          ),
        )}
      </div>
      {view === "Panorama" && (
        <>
          <div className="tactical-order">
            <h3>Orden de actuación de este par</h3>
            <div className="fields identity">
              <label>
                Tu movimiento
                <select
                  aria-label="Tu movimiento para resumen"
                  value={own}
                  onChange={(e) => onSelection(Number(e.target.value), enemy)}
                >
                  {model.offense.map((x) => (
                    <option value={x.index} key={x.index}>
                      {x.name} · prioridad {x.move.priority ?? "?"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Movimiento rival
                <select
                  aria-label="Movimiento rival para resumen"
                  value={enemy}
                  onChange={(e) => onSelection(own, Number(e.target.value))}
                >
                  {model.rival.moves.map((m, i) => (
                    <option value={i} key={i}>
                      {m.name || `Ranura rival ${i + 1} sin identificar`} ·
                      prioridad {m.priority ?? "?"}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p data-testid="tactical-order">{order.text}</p>
            <div className="tactical-speeds">
              <SpeedEvidence
                title="Tu velocidad efectiva"
                result={order.ownSpeed}
              />
              <SpeedEvidence
                title="Velocidad efectiva rival"
                result={order.rivalSpeed}
              />
            </div>
            {order.basis === "priority" && (
              <small>
                Decide la prioridad introducida para este par, no la velocidad.
                Los modificadores de prioridad no implementados y la información
                oculta siguen siendo límites.
              </small>
            )}
          </div>
          <div className="tactical-overview">
            <article>
              <h3>Opciones ofensivas</h3>
              <p>
                {model.offense.filter((x) => x.result.ok).length} movimientos
                con daño calculable.{" "}
                {currentHp(model.rival) === null
                  ? "Faltan PS actuales rivales para valorar el debilitamiento."
                  : `${kOs.length} cálculos detectan debilitamiento posible o garantizado si aciertan.`}
              </p>
              <p>
                Prioridad, precisión y datos desconocidos pueden cambiar el
                resultado de la acción.
              </p>
              <button onClick={() => setView("Ataques")}>
                Comparar ataques
              </button>
            </article>
            <article>
              <h3>Amenazas conocidas</h3>
              <p>{model.knownThreatMessage}</p>
              <p>
                {currentHp(model.active) === null
                  ? "Faltan PS actuales del activo: no podemos concluir que sobreviva ni contar las amenazas de debilitamiento."
                  : `Debilitamiento posible o garantizado detectado en ${threats.length} cálculos, condicionado a acertar; los movimientos sin evaluar quedan fuera.`}
              </p>
              <p>
                {model.unidentified} ranuras sin identificar: {model.unrevealed}{" "}
                sin revelar y {model.partial} parciales.
              </p>
              <button onClick={() => setView("Amenazas")}>
                Ver amenazas reveladas
              </button>
            </article>
            <article>
              <h3>Cambios defensivos</h3>
              <p>
                {model.switches.length} compañeros disponibles; los PS
                desconocidos no se tratan como completos.
              </p>
              <p>
                {lowest !== undefined
                  ? comparable.length > 1
                    ? `${lowestNames.join(", ")}: menor peor máximo recibido (${lowest} PS) entre referencias condicionadas de cobertura completa. No cubre movimientos sin identificar, estado ni efectos excluidos.`
                    : `${lowestNames.join(", ")} tiene una referencia con cobertura completa (${lowest} PS de peor máximo). No hay otra cobertura completa con la que compararla.`
                  : "No hay una comparación completa de daño recibido entre compañeros."}
              </p>
              <button onClick={() => setView("Cambios")}>
                Comparar entradas
              </button>
            </article>
            <article>
              <h3>Información que condiciona</h3>
              <p>
                {model.data.missing.length} datos insuficientes o efectos sin
                evaluar.
              </p>
              <p>
                {model.data.missing[0] ||
                  "Las conclusiones siguen limitadas al perfil y a los efectos contemplados."}
              </p>
              <button onClick={() => setView("Datos y límites")}>
                Revisar datos y supuestos
              </button>
            </article>
          </div>
        </>
      )}
      {view === "Ataques" && (
        <>
          <label>
            Orden de los ataques
            <select
              aria-label="Ordenar ataques del resumen"
              value={damageSort ? "damage" : "slot"}
              onChange={(e) => setDamageSort(e.target.value === "damage")}
            >
              <option value="slot">Orden de las ranuras</option>
              <option value="damage">
                Mayor daño máximo en PS · solo calculables
              </option>
            </select>
          </label>
          <p>
            Ordenar por daño no incorpora prioridad, precisión ni utilidad de
            los efectos no evaluados.
          </p>
          {attacks.map((row, i) => (
            <div key={row.index}>
              {damageSort &&
                !row.result.ok &&
                (i === 0 || attacks[i - 1].result.ok) && (
                  <h3>
                    Movimientos sin daño comparable · utilidad no puntuada
                  </h3>
                )}
              <AttackCard row={row} />
            </div>
          ))}
        </>
      )}
      {view === "Amenazas" && (
        <>
          <p className="tactical-important">{model.knownThreatMessage}</p>
          <p>
            {model.unidentified} ranuras sin identificar ({model.unrevealed} sin
            revelar, {model.partial} con datos parciales). No se completan por
            especie.
          </p>
          {model.threats.length === 0 && (
            <p>
              No se han introducido movimientos rivales. No se concluye que el
              activo sobreviva.
            </p>
          )}
          {model.threats.map((row) => (
            <ThreatCard key={row.index} row={row} />
          ))}
        </>
      )}
      {view === "Cambios" && (
        <>
          <label>
            Orden de los compañeros
            <select
              aria-label="Ordenar cambios del resumen"
              value={switchSort ? "worst" : "team"}
              onChange={(e) => setSwitchSort(e.target.value === "worst")}
            >
              <option value="team">Orden del equipo</option>
              <option value="worst">
                Menor peor máximo recibido (PS) · cobertura completa
              </option>
            </select>
          </label>
          <p>
            Se compara el mayor máximo de daño entre los mismos movimientos
            conocidos compatibles. Las coberturas incompletas quedan aparte.
            Menos PS de daño no equivale a un cambio seguro ni compara por sí
            solo la proporción de salud.
          </p>
          <p>
            Quedan {model.unidentified} ranuras sin identificar. La comparación
            no cubre movimientos de estado, ataques ocultos ni efectos
            excluidos.
          </p>
          {model.switches.length === 0 && (
            <p>No hay compañeros disponibles para comparar.</p>
          )}
          {model.excludedFainted.length > 0 && (
            <p>
              Excluidos por 0 PS confirmados: {model.excludedFainted.join(", ")}
              .
            </p>
          )}
          {changes.map((row) => (
            <SwitchCard key={row.id} row={row} />
          ))}
        </>
      )}
      {view === "Datos y límites" && (
        <>
          <div className="tactical-overview">
            {[
              ["Datos confirmados", model.data.confirmed],
              ["Resultados bajo supuestos", model.data.assumptions],
              [
                "Datos insuficientes / efectos no implementados",
                model.data.missing,
              ],
            ].map(([title, lines]) => (
              <article key={String(title)}>
                <h3>{String(title)}</h3>
                <ul>
                  {(lines as string[]).map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <p>{DAMAGE_SCOPE}</p>
        </>
      )}
      <div className="footnote">
        Lectura determinista de los cálculos existentes; sin IA externa ni
        simulación de varios turnos. No anuncia victoria ni una estrategia
        óptima. Cada referencia depende de los datos y efectos contemplados;
        precisión, azar del daño e incertidumbre estadística se mantienen
        separados. No se consumen objetos ni se modifican PS o etapas.
        Prioridad/velocidad excluyen Espacio Raro, Viento Afín y otras
        excepciones ya documentadas. Perfil de generación IX de referencia, sin
        garantía de compatibilidad con fangames.
      </div>
    </section>
  );
}
function SpeedEvidence({
  title,
  result,
}: {
  title: string;
  result?: IntervalSpeed;
}) {
  if (!result) return null;
  return (
    <div>
      <small>{title}</small>
      {result.ok ? (
        <>
          <strong>
            {result.min === result.max
              ? result.value
              : `${result.min}–${result.max}`}
          </strong>
          {result.estimated && (
            <small>Estimado · referencia {result.value}</small>
          )}
        </>
      ) : (
        <ul>
          {result.reasons.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
function ResultEvidence({ result: r }: { result: IntervalDamage }) {
  return (
    <>
      {r.ok ? (
        <>
          <strong className="tactical-damage">{damageText(r)}</strong>
          <small>
            Referencia condicionada a acertar y a los efectos contemplados; no
            es una garantía real. Consulta el fundamento y sus omisiones.
          </small>
          {r.percent === null && (
            <small>No hay porcentaje sin PS máximos utilizables.</small>
          )}
          {r.uncertainty && (
            <p>
              Envolvente de estadísticas y azar. Azar en la referencia:{" "}
              {r.uncertainty.randomReference[0]}–
              {r.uncertainty.randomReference[1]} PS; a tirada 100, incertidumbre
              estadística: {r.uncertainty.statsAtMaxRoll[0]}–
              {r.uncertainty.statsAtMaxRoll[1]} PS. No se asignan probabilidades
              a IV o naturalezas.
            </p>
          )}
          {r.immunity && (
            <p>
              {r.immunity === "types"
                ? "Inmunidad por tipos en este escenario."
                : "Inmunidad por habilidad/objeto compatible, separada de tipos."}
            </p>
          )}
          <details>
            <summary>Condiciones y fundamento del cálculo</summary>
            <p>Un golpe, condicionado a acertar y al alcance del motor.</p>
            <ul>
              {[
                ...r.conditions,
                ...r.applied,
                ...(r.uncertainty?.assumptions ?? []),
              ].map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </details>
        </>
      ) : (
        <>
          <strong>{"Sin daño comparable"}</strong>
          <ul>
            {r.reasons.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
function AttackCard({ row }: { row: TacticalMove }) {
  return (
    <article className="tactical-card" data-testid="tactical-attack">
      <h3>{row.name}</h3>
      <small>
        {row.capability.label} · Precisión separada: {precisionText(row.move)} ·
        Prioridad {row.move.priority ?? "?"}
      </small>
      <p className="tactical-explanation">{row.explanation}</p>
      <ResultEvidence result={row.result} />
      {row.orders.length > 0 && (
        <details>
          <summary>
            Prioridad y velocidad frente a cada movimiento revelado
          </summary>
          {row.orders.map((pair) => (
            <div key={pair.rivalIndex}>
              <h4>{pair.name}</h4>
              <p>{pair.comparison.text}</p>
              <small>
                Prioridades: propia {pair.comparison.ownPriority ?? "?"} · rival{" "}
                {pair.comparison.rivalPriority ?? "?"}
              </small>
              <div className="tactical-speeds">
                <SpeedEvidence
                  title="Propia"
                  result={pair.comparison.ownSpeed}
                />
                <SpeedEvidence
                  title="Rival"
                  result={pair.comparison.rivalSpeed}
                />
              </div>
            </div>
          ))}
        </details>
      )}
    </article>
  );
}
function ThreatCard({ row }: { row: ReceivedHit }) {
  return (
    <article className="tactical-card" data-testid="tactical-threat">
      <h3>{row.name}</h3>
      <small>
        Precisión separada: {precisionText(row.move)} · Prioridad{" "}
        {row.move.priority ?? "?"}
      </small>
      <p className="tactical-explanation">{row.explanation}</p>
      <ResultEvidence result={row.result} />
      {row.result.ok && (
        <p>
          {row.remaining
            ? `PS restantes tras este golpe: ${row.remaining[0]}–${row.remaining[1]}. No incluye otros efectos del turno.`
            : "PS restantes no determinables: faltan PS actuales confirmados."}
        </p>
      )}
    </article>
  );
}
function SwitchCard({ row }: { row: SwitchComparison }) {
  return (
    <article className="tactical-card" data-testid="tactical-switch">
      <h3>{row.name}</h3>
      <small>
        Ficha {modeName(row.pokemon)} · PS actuales{" "}
        {row.hp ?? "desconocidos / revisar"}
      </small>
      <p>
        {row.worstMax === null
          ? "Sin peor daño comparable."
          : `Peor máximo recibido entre los calculados: ${row.worstMax} PS.`}{" "}
        Cobertura: {row.coverage}/{row.expectedCoverage} movimientos conocidos
        compatibles.{" "}
        {row.comparable
          ? "Cobertura completa dentro de este subconjunto."
          : "Cobertura parcial o sin movimientos compatibles; no se ordena como comparación completa."}
      </p>
      <ul>
        {row.warnings.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      <SpeedEvidence
        title="Velocidad efectiva de entrada · solo referencia para una posible acción posterior"
        result={row.entrySpeed}
      />
      {row.hits.map((hit) => (
        <ThreatCard key={hit.index} row={hit} />
      ))}
      {row.hits.length === 0 && (
        <p>
          No hay ataques revelados con los que evaluar la entrada; no se
          califica como segura.
        </p>
      )}
    </article>
  );
}
