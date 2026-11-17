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
import { Search } from "./Search";
type Props = {
  p: Pokemon;
  onChange: (p: Pokemon) => void;
  label: string;
  compact?: boolean;
};
export function QuickStats({ p, onChange, label }: Props) {
  return (
    <div className="fields" aria-label={`${label} datos rápidos`}>
      {(["hp", "maxHp", "speed"] as const).map((key, i) => (
        <label key={key}>
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
              const n = e.target.value === "" ? null : Number(e.target.value);
              if (
                n !== null &&
                (!Number.isSafeInteger(n) ||
                  n < (key === "hp" ? 0 : 1) ||
                  n > 99999)
              )
                return;
              if (key === "hp" && n !== null && p.maxHp !== null && n > p.maxHp)
                return;
              if (key === "maxHp" && n !== null && p.hp !== null && n < p.hp)
                return;
              onChange({ ...p, [key]: n });
            }}
          />
        </label>
      ))}
    </div>
  );
}
export function Editor({ p, onChange, label, compact = false }: Props) {
  const set = (patch: Partial<Pokemon>) => onChange({ ...p, ...patch });
  const stats = (
    <>
      <div className="fields">
        {(["level", "attack", "defense", "spAttack", "spDefense"] as const).map(
          (key, i) => (
            <label key={key}>
              {
                [
                  "Nivel",
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
      <small>
        Estadísticas reales de la ficha, antes de efectos temporales y etapas.
      </small>
    </>
  );
  return (
    <div className="editor" aria-label={label}>
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
            onChange={(e) => set({ species: e.target.value })}
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
      <QuickStats p={p} onChange={onChange} label={label} />
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
        simples confirmados. Precisión y prioridad se mantienen separadas del
        daño y del orden. Los efectos especiales y cambios dinámicos de tipo no
        se aplican.
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
      <label>
        Comportamiento para el motor
        <select
          aria-label={`${label} comportamiento daño`}
          value={m.damageKind}
          onChange={(e) =>
            set({ damageKind: e.target.value as Move["damageKind"] })
          }
        >
          <option value="unknown">Sin verificar</option>
          <option value="special">
            Efectos especiales / fuera del alcance
          </option>
          <option value="direct">
            Confirmo: daño directo simple, un impacto
          </option>
        </select>
      </label>
      <small>
        Confirmar manualmente es declarar que el movimiento no cambia las
        estadísticas usadas ni tiene potencia, tipo o número de impactos
        dinámicos. Estado y potencia variable/fija especial siguen sin
        calcularse.
      </small>
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
