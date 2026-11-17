import { useState } from "react";
import type { Pokemon } from "./battle";
import type { EvPolicy } from "./statTypes";
import { intervalSpeed, intervalOrder } from "./uncertainty";
export function SpeedPanel({
  active,
  rival,
  policy,
}: {
  active: Pokemon;
  rival: Pokemon;
  policy: EvPolicy;
}) {
  const [own, setOwn] = useState(0),
    [enemy, setEnemy] = useState(0);
  return (
    <article className="panel">
      <div className="eyebrow">VELOCIDAD Y ORDEN</div>
      <h3>Velocidad efectiva</h3>
      <div className="results">
        {[
          [active, "Tu Pokémon"],
          [rival, "Rival"],
        ].map(([mon, title]) => {
          const p = mon as Pokemon;
          const r = intervalSpeed(p, policy);
          return (
            <div key={String(title)}>
              <h4>{String(title)}</h4>
              <small>
                {
                  {
                    manual: "Ficha manual",
                    calculated: "Ficha calculada",
                    estimated: "Ficha estimada",
                  }[p.statMode]
                }
              </small>
              {r.ok ? (
                <>
                  <strong className="damage-range">
                    {r.min === r.max ? r.value : `${r.min}–${r.max}`}
                  </strong>
                  {r.estimated && (
                    <p>Estimado · referencia {r.value}; no es un promedio.</p>
                  )}
                  {r.conditions.map((c) => (
                    <p key={c}>{c}</p>
                  ))}
                  {r.notes.map((c) => (
                    <small key={c}>{c} </small>
                  ))}
                </>
              ) : (
                <ul>
                  {r.reasons.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      <h3>Orden de los movimientos elegidos</h3>
      <div className="fields identity">
        <label>
          Tu movimiento
          <select
            aria-label="Tu movimiento para orden"
            value={own}
            onChange={(e) => setOwn(Number(e.target.value))}
          >
            {active.moves.map((m, i) => (
              <option key={i} value={i}>
                {m.name || `Movimiento ${i + 1}`} · prioridad{" "}
                {m.priority ?? "?"}
              </option>
            ))}
          </select>
        </label>
        <label>
          Movimiento rival
          <select
            aria-label="Movimiento rival para orden"
            value={enemy}
            onChange={(e) => setEnemy(Number(e.target.value))}
          >
            {rival.moves.map((m, i) => (
              <option key={i} value={i}>
                {m.name || `Movimiento ${i + 1}`} · prioridad{" "}
                {m.priority ?? "?"}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p>
        {intervalOrder(
          active,
          rival,
          active.moves[own],
          rival.moves[enemy],
          policy,
        )}
      </p>
      <div className="footnote">
        Referencia condicionada a los efectos conocidos/compatibles. No predice
        si se ejecutará el movimiento. Excluye Espacio Raro, Viento Afín,
        cambios automáticos de prioridad, ataques retrasados y desempates
        especiales. Una habilidad u objeto desconocido/no compatible podría
        cambiar este orden.
      </div>
    </article>
  );
}
