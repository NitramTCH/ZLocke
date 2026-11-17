import { displayName, type Session, type Pokemon, type Move } from "./battle";
import { RULES_LABEL, DAMAGE_SCOPE, predictDamage } from "./damage";
export function DamagePanel({ session: s }: { session: Session }) {
  const active = s.team.find((p) => p.id === s.activeId)!;
  return (
    <section className="damage-section panel">
      <div className="section-title">
        <h2>Predicción de daño</h2>
        <small>Consulta; no modifica PS</small>
      </div>
      <label>
        Perfil explícito de cálculo
        <select
          value={s.rules}
          aria-label="Perfil de reglas"
          onChange={() => {}}
        >
          <option value="gen9-standard">{RULES_LABEL}</option>
        </select>
      </label>
      <p className="footnote">{DAMAGE_SCOPE}</p>
      <div className="results">
        <DamageSide
          title={`${displayName(active)} → ${displayName(s.rival)}`}
          attacker={active}
          defender={s.rival}
        />
        <DamageSide
          title={`${displayName(s.rival)} → ${displayName(active)}`}
          attacker={s.rival}
          defender={active}
        />
      </div>
    </section>
  );
}
function DamageSide({
  title,
  attacker: a,
  defender: d,
}: {
  title: string;
  attacker: Pokemon;
  defender: Pokemon;
}) {
  return (
    <div className="damage-side">
      <h3>{title}</h3>
      {a.moves.map((m, i) => (
        <DamageRow key={i} move={m} attacker={a} defender={d} index={i} />
      ))}
    </div>
  );
}
function DamageRow({
  move: m,
  attacker: a,
  defender: d,
  index,
}: {
  move: Move;
  attacker: Pokemon;
  defender: Pokemon;
  index: number;
}) {
  const result = predictDamage(a, d, m);
  const koText = {
    guaranteed: "Garantiza debilitar en este escenario",
    possible: "Puede debilitar en este escenario",
    no: "No debilita de un golpe en este escenario",
    fainted: "Defensor ya debilitado (0 PS)",
    unknown: "Faltan PS actuales del defensor para valorar el debilitamiento",
  };
  return (
    <article className="damage-row" data-testid="damage-result">
      <h4>{m.name || `Movimiento ${index + 1}`}</h4>
      {result.ok ? (
        <>
          <strong className="damage-range">
            {result.min}–{result.max} PS
          </strong>
          <p>
            {result.percent
              ? `${(Math.floor(result.percent[0] * 10) / 10).toFixed(1)}–${(Math.ceil(result.percent[1] * 10) / 10).toFixed(1)}% de los PS máximos`
              : "Faltan PS máximos del defensor para mostrar porcentaje."}
          </p>
          {result.immunity && (
            <p>
              {result.immunity === "types"
                ? "Inmunidad por tipos en este escenario."
                : "Inmunidad por habilidad/objeto compatible; distinta de la tabla de tipos."}
            </p>
          )}
          {result.applied.length > 0 && (
            <details>
              <summary>Efectos compatibles contemplados</summary>
              <ul>
                {result.applied.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </details>
          )}
          <p className="ko-label">{koText[result.ko]}</p>
          <div className="conditional">
            Cálculo condicionado a acertar y al escenario descrito. No es una
            garantía absoluta.
            {result.conditions.length > 0 && (
              <ul>
                {result.conditions.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <>
          <strong className="not-calculable">No calculable</strong>
          <ul>
            {result.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </>
      )}
      <small>
        Precisión separada:{" "}
        {m.accuracyMode === "number"
          ? `${m.accuracy}% de referencia`
          : m.accuracyMode === "special"
            ? "especial / sin tirada estándar"
            : "desconocida"}
        . No se combina con la distribución de daño ni aplica modificadores de
        precisión.
      </small>
    </article>
  );
}
