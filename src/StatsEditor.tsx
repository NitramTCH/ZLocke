import { ScenarioView } from "./ScenarioView";
import { useState } from "react";
import type { Pokemon } from "./battle";
import {
  NATURES,
  STAT_KEYS,
  STAT_LABELS,
  statModel,
  basesFor,
  markStatChange,
} from "./stats";
import {
  validParams,
  statRecord,
  type EvPolicy,
  type StatParams,
  type StatKey,
  type StatValues,
} from "./statTypes";
export function StatsEditor({
  p,
  onChange,
  label,
  policy,
}: {
  p: Pokemon;
  onChange: (p: Pokemon) => void;
  label: string;
  policy: EvPolicy;
}) {
  const [error, setError] = useState("");
  const model = statModel(p, policy),
    bases = basesFor(p);
  const params = (next: StatParams) => {
    if (!validParams(next)) {
      setError(
        "Parámetros no válidos: IV 0–31, EV 0–252 y total ≤510; intervalos mínimo ≤ máximo. No se han cambiado los datos.",
      );
      return;
    }
    setError("");
    onChange(markStatChange(p, { statParams: next }));
  };
  function numberParam(
    kind: "ivs" | "evs" | "ivMin" | "ivMax" | "evMin" | "evMax",
    key: StatKey,
    value: string,
  ) {
    const n = value === "" ? null : Number(value);
    if (n !== null && !Number.isInteger(n)) return;
    if (n === null && kind !== "ivs" && kind !== "evs") return;
    params({ ...p.statParams, [kind]: { ...p.statParams[kind], [key]: n } });
  }
  return (
    <section className="stat-editor">
      <label>
        Modo de estadísticas
        <select
          aria-label={`${label} modo estadísticas`}
          value={p.statMode}
          onChange={(e) =>
            onChange(
              markStatChange(p, {
                statMode: e.target.value as Pokemon["statMode"],
              }),
            )
          }
        >
          <option value="manual">Manual · valores reales confirmados</option>
          <option value="calculated">
            Calculado · naturaleza, IV y EV conocidos
          </option>
          <option value="estimated">
            Estimado · intervalos y supuestos explícitos
          </option>
        </select>
      </label>
      <p>
        Modos automáticos: fórmulas estándar de generación IX. Referencia; no
        garantiza compatibilidad con fangames.
      </p>
      {p.statMode === "manual" && (
        <p>
          Se conservan tus valores reales. Si faltan estadísticas, puedes elegir
          Estimado; no se activa silenciosamente para guardados antiguos.
        </p>
      )}
      {p.statMode === "manual" &&
        [p.maxHp, p.attack, p.defense, p.spAttack, p.spDefense, p.speed].every(
          (v) => v === null,
        ) && (
          <button
            onClick={() =>
              onChange(markStatChange(p, { statMode: "estimated" }))
            }
          >
            Activar modo estimado
          </button>
        )}
      <label>
        Nivel
        <input
          aria-label={`${label} nivel`}
          type="number"
          min="1"
          max="100"
          value={p.level ?? ""}
          placeholder="Necesario para calcular o estimar"
          onChange={(e) => {
            const n = e.target.value === "" ? null : Number(e.target.value);
            if (n === null || (Number.isInteger(n) && n >= 1 && n <= 100))
              onChange(
                p.statMode === "manual"
                  ? { ...p, level: n }
                  : markStatChange(p, { level: n }),
              );
          }}
        />
      </label>
      <p>
        Bases {p.statParams.customBases ? "personalizadas" : "de catálogo"}:{" "}
        {bases
          ? STAT_KEYS.map((k) => `${STAT_LABELS[k]} ${bases[k]}`).join(" · ")
          : "selecciona especie o introduce bases"}
        . Son referencias base, no estadísticas finales al nivel actual.
      </p>
      {p.statMode !== "manual" && (
        <>
          <label>
            Naturaleza
            <select
              aria-label={`${label} naturaleza`}
              value={p.statParams.natureId ?? ""}
              onChange={(e) =>
                params({
                  ...p.statParams,
                  natureId:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
            >
              <option value="">Desconocida · considerar las posibles</option>
              {NATURES.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name} ·{" "}
                  {n.up === n.down
                    ? "neutra"
                    : `+${STAT_LABELS[n.up]} / −${STAT_LABELS[n.down]}`}
                </option>
              ))}
            </select>
          </label>
          <div className="actions stat-actions">
            <button
              onClick={() => params({ ...p.statParams, ivs: statRecord(31) })}
            >
              Fijar todos los IV a 31
            </button>
            <button
              onClick={() => params({ ...p.statParams, evs: statRecord(0) })}
            >
              Confirmar todos los EV a 0
            </button>
            <button
              onClick={() =>
                params({
                  ...p.statParams,
                  ivs: statRecord(null),
                  evs: statRecord(null),
                  natureId: null,
                })
              }
            >
              Dejar IV/EV y naturaleza desconocidos
            </button>
          </div>
          <small>
            Tabla desplazable: los IV y EV conocidos están a la derecha.
          </small>
          <div className="scroll">
            <table className="stat-table">
              <thead>
                <tr>
                  <th>Estadística</th>
                  <th>Mín.</th>
                  <th>
                    <abbr title="Referencia no probabilística">Ref.</abbr>
                  </th>
                  <th>Máx.</th>
                  <th>IV conocido</th>
                  <th>EV conocido</th>
                </tr>
              </thead>
              <tbody>
                {STAT_KEYS.map((k) => (
                  <tr key={k}>
                    <th>{STAT_LABELS[k]}</th>
                    {["min", "reference", "max"].map((v) => (
                      <td key={v}>
                        {model.ok
                          ? (model.ranges[k]?.[
                              v as "min" | "reference" | "max"
                            ] ?? "?")
                          : "?"}
                      </td>
                    ))}
                    <td>
                      <input
                        aria-label={`${label} IV ${k}`}
                        type="number"
                        min="0"
                        max="31"
                        value={p.statParams.ivs[k] ?? ""}
                        placeholder="?"
                        onChange={(e) => numberParam("ivs", k, e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`${label} EV ${k}`}
                        type="number"
                        min="0"
                        max="252"
                        value={p.statParams.evs[k] ?? ""}
                        placeholder={policy === "zero" ? "0 confirmado" : "?"}
                        onChange={(e) => numberParam("evs", k, e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Cada intervalo es marginal: sus máximos no forman necesariamente un
            único set. El combate usa escenarios conjuntos legales por
            movimiento.
          </p>
          <p>
            EV conocidos:{" "}
            {Object.values(p.statParams.evs).reduce<number>(
              (a, b) => a + (b ?? 0),
              0,
            )}{" "}
            / 510. Campo vacío = desconocido; no es cero salvo configuración de
            EV confirmados a cero.
          </p>
          {p.statMode === "estimated" && (
            <details>
              <summary>Ajustar intervalos de IV y EV desconocidos</summary>
              <p>
                Los datos conocidos prevalecen. Los límites globales mantienen
                EV totales ≤510.
              </p>
              {STAT_KEYS.map((k) => (
                <div key={k}>
                  <strong>{STAT_LABELS[k]}</strong>
                  <div className="fields">
                    {(["ivMin", "ivMax", "evMin", "evMax"] as const).map(
                      (kind, i) => (
                        <label key={kind}>
                          {
                            [
                              "IV mínimo",
                              "IV máximo",
                              "EV mínimo",
                              "EV máximo",
                            ][i]
                          }
                          <input
                            aria-label={`${label} ${kind} ${k}`}
                            type="number"
                            min="0"
                            max={kind.startsWith("iv") ? 31 : 252}
                            value={p.statParams[kind][k]}
                            onChange={(e) =>
                              numberParam(kind, k, e.target.value)
                            }
                          />
                        </label>
                      ),
                    )}
                  </div>
                </div>
              ))}
            </details>
          )}
        </>
      )}
      <details>
        <summary>Bases personalizadas y excepción de PS</summary>
        <p>Se guarda una copia personalizada; el catálogo no se sobrescribe.</p>
        <button
          onClick={() =>
            params({
              ...p.statParams,
              customBases: bases
                ? { ...bases }
                : (statRecord(50) as StatValues),
            })
          }
        >
          Crear copia editable de bases (50 inicial si no hay catálogo)
        </button>
        {p.statParams.customBases && (
          <>
            <div className="fields">
              {STAT_KEYS.map((k) => (
                <label key={k}>
                  {STAT_LABELS[k]} base
                  <input
                    aria-label={`${label} base ${k}`}
                    type="number"
                    min="1"
                    max="999"
                    value={p.statParams.customBases![k]}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isInteger(n) && n > 0 && n <= 999)
                        params({
                          ...p.statParams,
                          customBases: { ...p.statParams.customBases!, [k]: n },
                        });
                    }}
                  />
                </label>
              ))}
            </div>
            <button
              onClick={() => params({ ...p.statParams, customBases: null })}
            >
              Volver a bases del catálogo
            </button>
          </>
        )}
        <label>
          Regla de PS
          <select
            aria-label={`${label} regla PS`}
            value={p.statParams.hpRule}
            onChange={(e) =>
              params({
                ...p.statParams,
                hpRule: e.target.value as StatParams["hpRule"],
              })
            }
          >
            <option value="auto">Estándar · Shedinja tiene 1 PS</option>
            <option value="standard">Fórmula estándar sin excepción</option>
            <option value="one">Excepción personalizada: 1 PS</option>
          </select>
        </label>
      </details>
      {error && <p role="alert">{error}</p>}
      {!model.ok ? (
        <div className="footnote">
          {model.reasons.map((r) => (
            <p key={r}>{r}</p>
          ))}
        </div>
      ) : (
        p.statMode !== "manual" && (
          <div className="footnote">
            {model.assumptions.map((r) => (
              <p key={r}>{r}</p>
            ))}
            <p>
              No se incluyen habilidades, objetos, etapas ni estados en la
              ficha.
            </p>
            <details>
              <summary>Parámetros de la referencia (escenario legal)</summary>
              <ScenarioView scenario={model.reference} />
            </details>
          </div>
        )
      )}
    </section>
  );
}
