import { useMemo, useState } from "react";
import type { Session } from "./battle";
import { currentHp } from "./stats";
import {
  recommend,
  type EntryContext,
  type SuggestedOption,
} from "./recommendations";
import { damageText, moveName, koExplanation } from "./tactics";
function Evidence({ option, s }: { option: SuggestedOption; s: Session }) {
  return (
    <details>
      <summary>Ver cálculos: {option.name}</summary>
      <p>
        Cobertura: {option.coverage}/{option.expected}.{" "}
        {option.complete
          ? "Cubre todas las amenazas compatibles conocidas."
          : "Cobertura incompleta: no se ordena como si los datos ausentes fueran favorables."}
      </p>
      {option.offense && (
        <p>
          Daño de respuesta: {damageText(option.offense)}. Precisión:{" "}
          {option.accuracy === null
            ? "especial/desconocida"
            : option.accuracy + "%"}{" "}
          (separada).
        </p>
      )}
      {option.offense && <p>{koExplanation(option.offense)}</p>}
      {option.missing.length > 0 && (
        <ul>
          {option.missing.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      )}
      {option.evidence.map((e, i) => (
        <article className="recommendation-route" key={i}>
          <h5>
            {e.entryIndex === null
              ? "Sin golpe de entrada"
              : `Entrada frente a ${moveName(s.rival.moves[e.entryIndex], e.entryIndex)}`}{" "}
            → {moveName(s.rival.moves[e.nextIndex], e.nextIndex)}
          </h5>
          {e.entryDamage && (
            <p>
              Recibido al entrar: {damageText(e.entryDamage)}. PS después:{" "}
              {e.hpAfterEntry?.join("–") ?? "desconocidos"}.
            </p>
          )}
          <p>
            {option.kind === "switch" && !e.survival
              ? "Referencia aislada del golpe rival; ruta posterior no evaluada"
              : "Golpe rival del intercambio"}
            : {damageText(e.incoming)}. Ataque propio: {damageText(e.outgoing)}.
          </p>
          <p>{e.order.text}</p>
          <p>{e.note}</p>
          {e.hpBeforeReply && (
            <p>
              PS antes de poder responder: {e.hpBeforeReply.join("–")} (incluye
              rutas con 0 si las hay; no es PS final del turno).
            </p>
          )}
          {e.survival && (
            <p>
              Supervivencia al final de este intercambio:{" "}
              {e.survival === "all"
                ? "en todas las rutas calculadas"
                : e.survival === "none"
                  ? "ninguna ruta calculada"
                  : e.survival === "some"
                    ? "no garantizada; varía según la ruta"
                    : "sin determinar"}
              .
            </p>
          )}
          <details>
            <summary>Condiciones y efectos del motor</summary>
            {[e.entryDamage, e.incoming, e.outgoing].map((r, j) =>
              r ? (
                <div key={j}>
                  {r.ok ? (
                    <>
                      <p>{r.conditions.join(" ")}</p>
                      <p>{r.applied.join(" ")}</p>
                      {r.uncertainty && (
                        <p>
                          Incertidumbre estadística separada del azar del daño:{" "}
                          {r.uncertainty.assumptions.join(" ")}
                        </p>
                      )}
                    </>
                  ) : (
                    <p>{r.reasons.join(" ")}</p>
                  )}
                </div>
              ) : null,
            )}
          </details>
        </article>
      ))}
    </details>
  );
}
export function RecommendationCard({ session: s }: { session: Session }) {
  const active = s.team.find((p) => p.id === s.activeId)!;
  const [chosen, setChosen] = useState<EntryContext | null>(null);
  const context = currentHp(active) === 0 ? "free" : (chosen ?? "normal");
  const r = useMemo(() => recommend(s, context), [s, context]);
  return (
    <article className="recommendation-card" aria-label="Sugerencia de ZLocke">
      <div className="section-title">
        <h3>Sugerencia de ZLocke</h3>
        <strong>{r.label}</strong>
      </div>
      <label>
        Contexto de entrada
        <select
          aria-label="Contexto de entrada"
          value={r.context}
          onChange={(e) => setChosen(e.target.value as EntryContext)}
        >
          <option value="normal" disabled={currentHp(active) === 0}>
            Cambio voluntario · recibe ataque al entrar
          </option>
          <option value="free">
            Entrada libre tras debilitamiento · sin golpe al entrar
          </option>
        </select>
      </label>
      <p>
        El contexto es una selección de consulta. No cambia el activo, PS,
        objetos ni etapas.{" "}
        {r.context === "free"
          ? "Solo es válido si realmente hay un reemplazo libre; se excluye atacar o mantener el activo saliente."
          : "El cambio normal gasta el turno: la velocidad del compañero no evita el golpe de entrada."}
      </p>
      <h4 data-testid="suggested-action">{r.action}</h4>
      <ul>
        {r.reasons.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
      <p className="recommendation-risk">
        <strong>Riesgo principal:</strong> {r.risk}
      </p>
      <p>{r.coverage}</p>
      {r.primary && <Evidence option={r.primary} s={s} />}
      {r.alternatives.length > 0 && (
        <div>
          <h4>Alternativas · sin orden óptimo</h4>
          {r.alternatives.map((o) => (
            <section key={o.id}>
              <h5>{o.name}</h5>
              <p>{o.reasons.join(" ")}</p>
              <p>
                Riesgo: {o.risks[0] ?? "Referencia condicionada."}{" "}
                {o.safety === "unknown"
                  ? "No se determina supervivencia con los datos disponibles."
                  : o.safety !== "avoids"
                    ? "No descarta el debilitamiento."
                    : "Evita el debilitamiento solo dentro del horizonte y efectos calculados."}
              </p>
              <Evidence option={o} s={s} />
            </section>
          ))}
        </div>
      )}
      {r.typesOnly.length > 0 && (
        <div>
          <h4>Orientación por tipos</h4>
          <ul>
            {r.typesOnly.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
          <p>
            Son factores por tipos; habilidades y objetos pueden introducir
            inmunidades o modificadores distintos. No bastan para ordenar
            acciones por supervivencia.
          </p>
        </div>
      )}
      <details>
        <summary>Qué dato ayudaría a decidir</summary>
        <ul>
          {r.needed.length ? (
            r.needed.map((x, i) => <li key={i}>{x}</li>)
          ) : (
            <li>
              Confirma efectos excluidos y la disponibilidad real de los
              movimientos; las jugadas del rival no se conocen.
            </li>
          )}
        </ul>
      </details>
      <details>
        <summary>Opciones sin puntuar y límites</summary>
        <ul>
          {[...r.unscored, ...r.limits].map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
        <p>
          Criterios: evitar debilitamiento, conservar el activo si ya resuelve
          con menor riesgo y comparar daño, precisión y orden sin sumar
          puntuaciones. Las estimaciones no reciben probabilidades. Ninguna
          garantía supera los escenarios contemplados.
        </p>
      </details>
      <details>
        <summary>Todas las opciones y sus cálculos</summary>
        {r.options.map((o) => (
          <div key={o.id}>
            <p>
              {o.name}:{" "}
              {o.safety === "avoids"
                ? "evita KO en el alcance"
                : o.safety === "unknown"
                  ? "datos insuficientes"
                  : o.safety === "falls"
                    ? "hay una amenaza que fuerza KO dentro del alcance"
                    : "riesgo no descartado"}
              .
            </p>
            <Evidence option={o} s={s} />
          </div>
        ))}
      </details>
    </article>
  );
}
