import { STAGE_KEYS, type Pokemon } from "./battle";
type Props = { p: Pokemon; onChange: (p: Pokemon) => void; label: string };
export function BattleConditions({ p, onChange, label }: Props) {
  return (
    <details className="battle-conditions">
      <summary>Etapas y quemadura · datos para el cálculo</summary>
      <p>
        Introduce estadísticas reales antes de etapas. Etapa 0 = sin cambios; ?
        = desconocida. No apliques las etapas dos veces.
      </p>
      <div className="fields">
        {STAGE_KEYS.map((key, i) => (
          <label key={key}>
            Etapa:{" "}
            {
              [
                "Ataque",
                "Defensa",
                "At. especial",
                "Def. especial",
                "Velocidad",
              ][i]
            }
            <select
              aria-label={`${label} etapa ${key}`}
              value={p.stages[key] ?? "?"}
              onChange={(e) =>
                onChange({
                  ...p,
                  stages: {
                    ...p.stages,
                    [key]:
                      e.target.value === "?" ? null : Number(e.target.value),
                  },
                })
              }
            >
              <option value="?">Desconocida</option>
              {Array.from({ length: 13 }, (_, j) => j - 6).map((n) => (
                <option key={n} value={n}>
                  {n > 0 ? "+" : ""}
                  {n}
                  {n === 0 ? " · sin cambios" : ""}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <label>
        Quemadura
        <select
          aria-label={`${label} quemadura`}
          value={p.burn}
          onChange={(e) =>
            onChange({ ...p, burn: e.target.value as Pokemon["burn"] })
          }
        >
          <option value="unknown">Desconocida</option>
          <option value="none">Sin quemadura confirmado</option>
          <option value="burned">Quemado</option>
        </select>
      </label>
      <small>
        Solo se aplica quemadura al daño físico simple. La velocidad mostrada
        sigue siendo la comparación de valores reales, sin etapas ni otros
        efectos.
      </small>
    </details>
  );
}
