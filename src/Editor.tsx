import { TYPES, type Pokemon, type Move, type Type } from "./battle";
import {
  SPECIES,
  MOVES,
  CATALOG_VERSION,
  selectSpecies,
  selectMove,
  powerLabel,
} from "./catalog";
import { EffectEditor } from "./EffectEditor";
import { BattleConditions } from "./BattleConditions";
import { StatsEditor } from "./StatsEditor";
import { statModel } from "./stats";
import type { EvPolicy } from "./statTypes";
import { moveCapability } from "./catalog";
import { Search } from "./Search";
type Props = {
  p: Pokemon;
  onChange: (p: Pokemon) => void;
  label: string;
  compact?: boolean;
  policy?: EvPolicy;
};
export function QuickStats({ p, onChange, label, policy = "unknown" }: Props) {
  const model = statModel(p, policy);
  const limit =
    p.statMode === "manual"
      ? p.maxHp
      : model.ok
        ? (model.ranges.hp?.max ?? null)
        : null;
  const hpValid = p.hp === null || limit === null || p.hp <= limit;
  return (
    <div className="fields" aria-label={`${label} datos rápidos`}>
      {(["hp", "maxHp", "speed"] as const).map((key, i) => (
        <label key={key}>
          {p.statMode !== "manual" && key !== "hp" ? (
            <>
              <span>
                {key === "maxHp"
                  ? "PS máximos derivados"
                  : "Velocidad de ficha derivada"}
              </span>
              <output>
                {model.ok
                  ? `${model.ranges[key === "maxHp" ? "hp" : "speed"]?.min}–${model.ranges[key === "maxHp" ? "hp" : "speed"]?.max} (ref. ${model.ranges[key === "maxHp" ? "hp" : "speed"]?.reference})`
                  : "Faltan parámetros"}
              </output>
            </>
          ) : (
            <>
              {["PS actuales", "PS máximos", "Velocidad real"][i]}
              <input
                aria-label={`${label} ${["PS actuales", "PS máximos", "Velocidad real"][i]}`}
                type="number"
                min={key === "hp" ? 0 : 1}
                max={99999}
                step="1"
                placeholder="?"
                value={p[key] ?? ""}
                onChange={(e) => {
                  const n =
                    e.target.value === "" ? null : Number(e.target.value);
                  if (
                    n !== null &&
                    (!Number.isSafeInteger(n) ||
                      n < (key === "hp" ? 0 : 1) ||
                      n > 99999)
                  )
                    return;
                  if (key === "hp" && n !== null && limit !== null && n > limit)
                    return;
                  if (
                    key === "maxHp" &&
                    n !== null &&
                    p.hp !== null &&
                    n < p.hp
                  )
                    return;
                  onChange({
                    ...p,
                    [key]: n,
                    hpReview: key === "hp" ? false : p.hpReview,
                  });
                }}
              />
            </>
          )}
          {key === "hp" && p.hpReview && (
            <>
              <small>
                PS pendientes de revisión por cambios de ficha; no se usan para
                KO ni salud completa.
              </small>
              <button
                disabled={!hpValid}
                onClick={() => onChange({ ...p, hpReview: false })}
              >
                Confirmar PS actuales
              </button>
              {!hpValid && (
                <small>
                  El valor guardado supera el máximo posible: corrige PS
                  actuales.
                </small>
              )}
            </>
          )}
        </label>
      ))}
    </div>
  );
}
export function Editor({
  p,
  onChange,
  label,
  compact = false,
  policy = "unknown",
}: Props) {
  const set = (patch: Partial<Pokemon>) => onChange({ ...p, ...patch });
  const stats = (
    <>
      {p.statMode === "manual" && (
        <div className="fields">
          {(["attack", "defense", "spAttack", "spDefense"] as const).map(
            (key, i) => (
              <label key={key}>
                {
                  [
                    "Ataque real",
                    "Defensa real",
                    "At. especial real",
                    "Def. especial real",
                  ][i]
                }
                <input
                  type="number"
                  min="1"
                  max="99999"
                  value={p[key] ?? ""}
                  placeholder="?"
                  onChange={(e) => {
                    const n =
                      e.target.value === "" ? null : Number(e.target.value);
                    if (
                      n === null ||
                      (Number.isSafeInteger(n) && n >= 1 && n <= 99999)
                    )
                      set({ [key]: n });
                  }}
                />
              </label>
            ),
          )}
        </div>
      )}
      <small>
        Estadísticas reales de la ficha, antes de efectos temporales y etapas.
      </small>
    </>
  );
  return (
    <div className="editor" aria-label={label}>
      {p.showdown && (
        <details className="showdown-metadata">
          <summary>Procedencia Showdown y datos adicionales</summary>
          <p>
            Sexo: {p.showdown.sex ?? "desconocido"} · Shiny:{" "}
            {p.showdown.shiny ? "sí" : "no"} · Felicidad: {p.showdown.happiness}
            . No se aplican efectos nuevos por estos datos.
          </p>
          <p>
            Registro del texto original; las correcciones posteriores de la
            ficha prevalecen.
          </p>
          <ul>
            {p.showdown.origins.map((origin, i) => (
              <li key={i}>{origin}</li>
            ))}
          </ul>
          <details>
            <summary>Texto original importado</summary>
            <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {p.showdown.raw}
            </pre>
          </details>
        </details>
      )}
      <Search
        entries={SPECIES}
        label={`${label}: buscar especie`}
        onSelect={(entry) => onChange(selectSpecies(p, entry))}
      />
      <div className="fields identity">
        <label>
          Especie / forma (manual)
          <input
            aria-label={`${label} especie manual`}
            value={p.species}
            placeholder="Especie o forma no incluida"
            onChange={(e) =>
              set({
                species: e.target.value,
                speciesId: null,
                hpReview:
                  (p.statMode !== "manual" && p.hp !== null) || p.hpReview,
              })
            }
          />
        </label>
        <label>
          Apodo
          <input
            aria-label={`${label} apodo`}
            value={p.name}
            placeholder="Opcional"
            onChange={(e) => set({ name: e.target.value })}
          />
        </label>
      </div>
      <small>
        Elegir especie aplica sus tipos del catálogo. Ajusta manualmente formas
        y juegos modificados; nunca rellena sets ni estadísticas.
      </small>
      <div className="fields identity">
        <label>
          Tipo 1
          <select
            aria-label={`${label} tipo 1`}
            value={p.types[0] || ""}
            onChange={(e) => {
              const t = e.target.value as Type;
              const second = p.types[1];
              const keep = !!second && second !== t;
              set({
                types: t ? [t, ...(keep ? [second] : [])] : [],
                secondType: keep
                  ? "known"
                  : p.secondType === "none"
                    ? "none"
                    : "unknown",
                typesKnown: !!t && (keep || p.secondType === "none"),
              });
            }}
          >
            <option value="">Desconocido</option>
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Tipo 2
          <select
            aria-label={`${label} tipo 2`}
            disabled={!p.types[0]}
            value={
              p.secondType === "unknown"
                ? "unknown"
                : p.secondType === "none"
                  ? "none"
                  : p.types[1]
            }
            onChange={(e) => {
              const v = e.target.value;
              set({
                types:
                  v === "unknown" || v === "none"
                    ? p.types.slice(0, 1)
                    : [p.types[0], v as Type],
                secondType:
                  v === "unknown" ? "unknown" : v === "none" ? "none" : "known",
                typesKnown: v !== "unknown",
              });
            }}
          >
            <option value="unknown">Segundo tipo desconocido</option>
            <option value="none">Sin segundo tipo (monotipo confirmado)</option>
            {TYPES.filter((t) => t !== p.types[0]).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>
      {p.secondType !== "unknown" && (
        <label className="checkbox">
          <input
            type="checkbox"
            checked={p.typesKnown}
            onChange={(e) => set({ typesKnown: e.target.checked })}
          />
          Tipos introducidos confirmados
        </label>
      )}
      {(p.secondType === "unknown" || !p.typesKnown) && (
        <p className="type-warning">
          Tipos incompletos: confirma si no tiene segundo tipo. La efectividad
          exacta permanece desconocida.
        </p>
      )}
      <StatsEditor p={p} onChange={onChange} label={label} policy={policy} />
      <QuickStats p={p} onChange={onChange} label={label} policy={policy} />
      <EffectEditor p={p} onChange={onChange} label={label} />
      <BattleConditions p={p} onChange={onChange} label={label} />
      {compact ? (
        <details>
          <summary>
            Más datos revelados: estadísticas, habilidad y objeto
          </summary>
          {stats}
        </details>
      ) : (
        stats
      )}
      <h3>Movimientos</h3>
      <small>
        Cualquier movimiento para cualquier especie · catálogo local
      </small>
      {p.moves.map((m, i) => (
        <MoveEditor
          key={`${p.id}-${i}`}
          move={m}
          label={`${label} movimiento ${i + 1}`}
          onChange={(move) =>
            set({ moves: p.moves.map((x, j) => (j === i ? move : x)) })
          }
        />
      ))}
      <div className="footnote">
        {CATALOG_VERSION}. La predicción usa potencia fija solo en ataques
        compatibles reconocidos automáticamente por ID. Precisión y prioridad se
        mantienen separadas del daño y del orden. Los efectos especiales y
        cambios dinámicos de tipo no se aplican.
      </div>
    </div>
  );
}
function MoveEditor({
  move: m,
  onChange,
  label,
}: {
  move: Move;
  onChange: (m: Move) => void;
  label: string;
}) {
  const set = (patch: Partial<Move>) =>
    onChange({ ...m, ...patch, source: "Ajuste manual" });
  const numeric = (
    key: "power" | "accuracy" | "priority",
    title: string,
    min: number,
    max: number,
  ) => (
    <label>
      {title}
      <input
        aria-label={`${label} ${title}`}
        type="number"
        min={min}
        max={max}
        value={m[key] ?? ""}
        placeholder="?"
        onChange={(e) => {
          const n = e.target.value === "" ? null : Number(e.target.value);
          if (n !== null && (!Number.isSafeInteger(n) || n < min || n > max))
            return;
          set({
            [key]: n,
            ...(key === "power"
              ? { powerMode: n === null ? "unknown" : "number" }
              : key === "accuracy"
                ? { accuracyMode: n === null ? "unknown" : "number" }
                : {}),
          });
        }}
      />
    </label>
  );
  return (
    <details className="move-editor">
      <summary>
        {m.name || label}
        <small>
          {m.type || "Tipo ?"} · {m.category} · Potencia: {powerLabel(m)} ·
          Prioridad: {m.priority ?? "?"}
        </small>
      </summary>
      <Search
        entries={MOVES}
        label={`${label}: buscar movimiento`}
        onSelect={(entry) => onChange(selectMove(entry))}
      />
      <div className="footnote">
        <strong>{moveCapability(m).label}</strong>
        {m.catalogId !== null && (
          <p>
            Base de catálogo:{" "}
            {MOVES.find((entry) => entry.id === m.catalogId)?.name} · #
            {m.catalogId}. Cambiar el nombre no cambia esta mecánica de
            referencia.
          </p>
        )}
        <p>{moveCapability(m).reason}</p>
      </div>
      <div className="fields">
        <label>
          Nombre manual
          <input
            aria-label={`${label} nombre manual`}
            value={m.name}
            onChange={(e) =>
              set({ name: e.target.value, damageKind: "unknown" })
            }
          />
        </label>
        <label>
          Tipo
          <select
            aria-label={`${label} tipo`}
            value={m.type}
            onChange={(e) => set({ type: e.target.value as Type | "" })}
          >
            <option value="">Desconocido</option>
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Categoría
          <select
            aria-label={`${label} categoría`}
            value={m.category}
            onChange={(e) => {
              const category = e.target.value as Move["category"];
              set({
                category,
                ...(category === "Estado"
                  ? { power: null, powerMode: "status" }
                  : m.category === "Estado"
                    ? { power: null, powerMode: "unknown" }
                    : {}),
              });
            }}
          >
            {["Desconocida", "Físico", "Especial", "Estado"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="fields">
        <label>
          Clase de potencia
          <select
            aria-label={`${label} clase de potencia`}
            value={m.category === "Estado" ? "status" : m.powerMode}
            disabled={m.category === "Estado"}
            onChange={(e) =>
              set({
                powerMode: e.target.value as Move["powerMode"],
                power: null,
              })
            }
          >
            <option value="unknown">Desconocida</option>
            <option value="number" disabled>
              Numérica (introduce potencia fija)
            </option>
            <option value="variable">Variable / condicionada</option>
            <option value="fixed">Daño fijo / efecto especial</option>
            <option value="status" disabled>
              Estado
            </option>
          </select>
        </label>
        {m.powerMode === "number" ? (
          <label>Potencia actual del catálogo: {m.power}</label>
        ) : null}
        {m.category !== "Estado" &&
          numeric("power", "Potencia manual (fija)", 1, 99999)}
        {numeric("priority", "Prioridad", -7, 7)}
      </div>
      <div className="fields">
        <label>
          Clase de precisión
          <select
            aria-label={`${label} clase de precisión`}
            value={m.accuracyMode}
            onChange={(e) =>
              set({
                accuracyMode: e.target.value as Move["accuracyMode"],
                accuracy: null,
              })
            }
          >
            <option value="unknown">Desconocida</option>
            <option value="number" disabled>
              Numérica (introduce precisión)
            </option>
            <option value="special">Especial / sin tirada estándar</option>
          </select>
        </label>
        {numeric("accuracy", "Precisión (%)", 1, 100)}
      </div>
      <small>
        Precisión:{" "}
        {m.accuracyMode === "number"
          ? `${m.accuracy}%`
          : m.accuracyMode === "special"
            ? "Especial / sin tirada estándar"
            : "Desconocida"}
        . {m.source || "Entrada manual; sin datos de catálogo"}.
      </small>
      <p>
        Potencia variable y daño especial no se resuelven. Introducir potencia
        manual fija es una modificación explícita del usuario. No se simulan los
        efectos del movimiento.
      </p>
    </details>
  );
}
