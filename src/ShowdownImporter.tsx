import { useState } from "react";
import type { Pokemon, Session } from "./battle";
import { displayName } from "./battle";
import { moveCapability } from "./catalog";
import { supportFor } from "./effects";
import { NATURES, STAT_LABELS } from "./stats";
import { STAT_KEYS } from "./statTypes";
import {
  buildShowdownImport,
  parseShowdown,
  pendingData,
  previewPokemon,
  rowProblems,
  setShowdownEffect,
  setShowdownMove,
  setShowdownSpecies,
  type EvChoice,
  type ImportMode,
  type ShowdownRow,
} from "./showdown";

function PreviewCard({
  row,
  index,
  ev,
  session,
  onChange,
}: {
  row: ShowdownRow;
  index: number;
  ev: EvChoice;
  session: Session;
  onChange: (r: ShowdownRow) => void;
}) {
  const [raw, setRaw] = useState(row.p.showdown?.raw ?? "");
  const [rawError, setRawError] = useState("");
  const p = row.p,
    final = previewPokemon(row, ev);
  const patch = (next: Pokemon) => onChange({ ...row, p: next });
  const problems = rowProblems(row, ev, session.evPolicy);
  return (
    <article
      className="showdown-card"
      aria-label={`Vista previa Pokémon ${index + 1}`}
    >
      <h3>
        {index + 1}. {displayName(p)}
      </h3>
      <label className="check">
        <input
          type="checkbox"
          checked={row.selected}
          onChange={(e) => onChange({ ...row, selected: e.target.checked })}
        />
        Incluir Pokémon {index + 1}
      </label>
      <div className="showdown-grid">
        <label>
          Especie o forma
          <input
            aria-label={`Especie ${index + 1}`}
            value={p.species}
            onChange={(e) => patch(setShowdownSpecies(p, e.target.value))}
          />
        </label>
        <label>
          Apodo
          <input
            aria-label={`Apodo ${index + 1}`}
            value={p.name}
            onChange={(e) => patch({ ...p, name: e.target.value })}
          />
        </label>
        <label>
          Nivel obligatorio
          <input
            aria-label={`Nivel ${index + 1}`}
            type="number"
            min="1"
            max="100"
            value={Number.isFinite(p.level) ? (p.level ?? "") : ""}
            onChange={(e) =>
              patch({
                ...p,
                level: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </label>
        <label>
          Modo de ficha
          <select
            aria-label={`Modo de ficha ${index + 1}`}
            value={p.statMode}
            onChange={(e) =>
              patch({ ...p, statMode: e.target.value as Pokemon["statMode"] })
            }
          >
            <option value="calculated">Calculado</option>
            <option value="estimated">Estimado</option>
          </select>
        </label>
        <label>
          Naturaleza
          <select
            aria-label={`Naturaleza ${index + 1}`}
            value={p.statParams.natureId ?? ""}
            onChange={(e) =>
              patch({
                ...p,
                statParams: {
                  ...p.statParams,
                  natureId: e.target.value ? Number(e.target.value) : null,
                },
              })
            }
          >
            <option value="">Desconocida · usar Estimado</option>
            {NATURES.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name} / {n.english} ·{" "}
                {n.up === n.down
                  ? "neutra"
                  : `+10% ${STAT_LABELS[n.up]} / −10% ${STAT_LABELS[n.down]}`}
              </option>
            ))}
          </select>
        </label>
        <label>
          Habilidad
          <input
            aria-label={`Habilidad ${index + 1}`}
            placeholder="Vacío: desconocida; ninguna: ausencia"
            value={p.abilityState === "none" ? "ninguna" : p.ability}
            onChange={(e) =>
              patch(setShowdownEffect(p, "ability", e.target.value))
            }
          />
        </label>
        <label>
          Objeto
          <input
            aria-label={`Objeto ${index + 1}`}
            placeholder="Vacío: desconocido; ninguno: ausencia"
            value={p.itemState === "none" ? "ninguno" : p.item}
            onChange={(e) =>
              patch(setShowdownEffect(p, "item", e.target.value))
            }
          />
        </label>
      </div>
      <p>
        {p.speciesId
          ? `Especie reconocida #${p.speciesId} · ${p.types.join(" / ")}.`
          : "Especie/forma sin resolver: no se sustituye por la base. Corrige el nombre o importa en Estimado con tipos y bases pendientes."}{" "}
        Habilidad #{p.abilityId ?? "?"}; objeto #{p.itemId ?? "?"}. Cualquier
        combinación está permitida.
      </p>
      {(["ability", "item"] as const).map((k) => {
        const support = supportFor(p, k);
        return (
          <p key={k}>
            {k === "ability" ? "Habilidad" : "Objeto"}:{" "}
            {p[`${k}State`] === "none"
              ? "ausencia confirmada"
              : p[`${k}State`] === "unknown"
                ? "desconocido"
                : support
                  ? `${support.scope}${support.conditional ? " Activación pendiente: " + support.conditional : ""}`
                  : "Efecto no implementado; se conserva como dato conocido/manual y condicionará el cálculo."}
          </p>
        );
      })}
      <div className="scroll">
        <table>
          <caption>
            IV y EV originales/editados · los vacíos se mantienen desconocidos
          </caption>
          <thead>
            <tr>
              <th>Estadística</th>
              <th>IV</th>
              <th>EV del archivo</th>
              {ev === "zero" && <th>EV al importar</th>}
            </tr>
          </thead>
          <tbody>
            {STAT_KEYS.map((k) => (
              <tr key={k}>
                <th>{STAT_LABELS[k]}</th>
                {(["ivs", "evs"] as const).map((kind) => (
                  <td key={kind}>
                    <input
                      aria-label={`${kind === "ivs" ? "IV" : "EV"} ${STAT_LABELS[k]} ${index + 1}`}
                      type="number"
                      value={
                        Number.isFinite(p.statParams[kind][k])
                          ? (p.statParams[kind][k] ?? "")
                          : ""
                      }
                      onChange={(e) =>
                        patch({
                          ...p,
                          statParams: {
                            ...p.statParams,
                            [kind]: {
                              ...p.statParams[kind],
                              [k]:
                                e.target.value === ""
                                  ? null
                                  : Number(e.target.value),
                            },
                          },
                        })
                      }
                    />
                  </td>
                ))}
                {ev === "zero" && <td>→ 0</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Total EV del archivo/editado:{" "}
        {STAT_KEYS.reduce((s, k) => s + (p.statParams.evs[k] ?? 0), 0)}; al
        importar:{" "}
        {STAT_KEYS.reduce((s, k) => s + (final.statParams.evs[k] ?? 0), 0)}. No
        se recortan valores no estándar.
      </p>
      <div className="showdown-grid">
        {p.moves.map((m, i) => (
          <label key={i}>
            Movimiento {i + 1}
            <input
              aria-label={`Movimiento ${i + 1} Pokémon ${index + 1}`}
              value={m.name}
              onChange={(e) => patch(setShowdownMove(p, i, e.target.value))}
            />
            <small>
              #{m.catalogId ?? "?"} ·{" "}
              {m.name ? moveCapability(m).label : "Ranura vacía"}
              {m.name ? " · " + moveCapability(m).reason : ""}
            </small>
          </label>
        ))}
      </div>
      {p.showdown && (
        <details>
          <summary>Sexo, shiny y felicidad</summary>
          <div className="showdown-grid">
            <label>
              Sexo
              <select
                aria-label={`Sexo ${index + 1}`}
                value={p.showdown.sex ?? ""}
                onChange={(e) =>
                  patch({
                    ...p,
                    showdown: {
                      ...p.showdown!,
                      sex: (e.target.value || null) as "M" | "F" | null,
                    },
                  })
                }
              >
                <option value="">Desconocido</option>
                <option value="M">Macho</option>
                <option value="F">Hembra</option>
              </select>
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={p.showdown.shiny}
                onChange={(e) =>
                  patch({
                    ...p,
                    showdown: { ...p.showdown!, shiny: e.target.checked },
                  })
                }
              />
              Shiny {index + 1}
            </label>
            <label>
              Felicidad
              <input
                aria-label={`Felicidad ${index + 1}`}
                type="number"
                value={
                  Number.isFinite(p.showdown.happiness)
                    ? p.showdown.happiness
                    : ""
                }
                onChange={(e) =>
                  patch({
                    ...p,
                    showdown: {
                      ...p.showdown!,
                      happiness:
                        e.target.value === "" ? NaN : Number(e.target.value),
                    },
                  })
                }
              />
            </label>
          </div>
        </details>
      )}
      <details>
        <summary>Procedencia: explícito, derivado y desconocido</summary>
        <p>
          Registro del texto original. Las correcciones de esta vista prevalecen
          en la ficha final; se conservan ambos al exportar.
        </p>
        <ul>
          {p.showdown?.origins.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      </details>
      <ul className="showdown-warnings">
        {[...row.notices, ...pendingData(final), ...problems].map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
      {problems.length > 0 && (
        <p role="status">
          Esta entrada necesita correcciones antes de incluirla. Puedes
          desmarcarla e importar el resto.
        </p>
      )}
      <details>
        <summary>Corregir texto original o campos no compatibles</summary>
        <label>
          Bloque {index + 1}
          <textarea
            aria-label={`Bloque original ${index + 1}`}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
          />
        </label>
        <button
          onClick={() => {
            try {
              const rows = parseShowdown(raw);
              if (rows.length !== 1)
                throw new Error("Debe contener exactamente un Pokémon.");
              onChange({ ...rows[0], selected: row.selected });
              setRawError("");
            } catch (e) {
              setRawError((e as Error).message);
            }
          }}
        >
          Reinterpretar bloque {index + 1}
        </button>
        <p>
          Reinterpretar sustituye las correcciones de esta tarjeta por este
          texto. Los campos no compatibles no se ignoran silenciosamente.
        </p>
        {rawError && <p role="alert">{rawError}</p>}
      </details>
    </article>
  );
}

export function ShowdownImporter({
  session,
  onCancel,
  onImport,
}: {
  session: Session;
  onCancel: () => void;
  onImport: (next: Session, summary: string, replace: boolean) => void;
}) {
  const [text, setText] = useState(""),
    [rows, setRows] = useState<ShowdownRow[] | null>(null),
    [error, setError] = useState("");
  const [ev, setEv] = useState<EvChoice>(""),
    [mode, setMode] = useState<ImportMode>("replace"),
    [level, setLevel] = useState(""),
    [full, setFull] = useState(false);
  function preview() {
    try {
      const result = parseShowdown(text);
      if (!result.length) throw new Error("Pega un equipo o carga un TXT.");
      setRows(result);
      setError("");
      setEv("");
      setFull(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function apply() {
    try {
      const result = buildShowdownImport(session, rows ?? [], ev, mode, full);
      onImport(result.session, result.summary, mode === "replace");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const selected = rows?.filter((r) => r.selected) ?? [];
  const blocked =
    !ev ||
    !selected.length ||
    selected.some((r) => rowProblems(r, ev, session.evPolicy).length > 0) ||
    (mode === "append" ? session.team.length : 0) + selected.length > 6;
  return (
    <section className="panel showdown-import" aria-label="Importar Showdown">
      <div className="section-title">
        <h2>Importar Showdown</h2>
        <button onClick={onCancel}>Cancelar importación</button>
      </div>
      <p>
        Reglas estándar de generación IX · referencia, sin garantía para Añil u
        otros fangames. Solo se prepara el equipo; no se cambia el rival ni la
        configuración.
      </p>
      {!rows ? (
        <>
          <label>
            Cargar archivo TXT
            <input
              type="file"
              accept=".txt,text/plain"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  if (f.size > 1_000_000)
                    throw new Error("El archivo supera 1 MB.");
                  setText(await f.text());
                  setError("");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            />
          </label>
          <label>
            Texto Showdown
            <textarea
              aria-label="Texto Showdown"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                "Apodo (Pikachu) @ Light Ball\nAbility: Levitate\nLevel: 50\nTimid Nature\n- Thunderbolt"
              }
            />
          </label>
          <button onClick={preview}>Revisar equipo</button>
        </>
      ) : (
        <>
          <p>
            <strong>
              Vista previa: {rows.length} Pokémon; {selected.length}{" "}
              seleccionados.
            </strong>{" "}
            Nada se ha guardado todavía. Puedes corregir nombres en inglés o
            español, cifras y naturaleza, o excluir entradas con errores.
          </p>
          <div className="notice">
            Convenciones: IV omitidos = 31; EV omitidos = 0 solo tras tu
            elección; objeto omitido = ninguno; shiny omitido = no; felicidad
            omitida = 255 (0 con Frustración). Habilidad, sexo y naturaleza
            omitidos permanecen desconocidos. Aunque Showdown usa nivel 100 por
            defecto, aquí debes confirmarlo. Poder Oculto tipado sin IV
            explícitos queda con IV desconocidos y un aviso. PS actuales y
            activaciones no se deducen del formato.
          </div>
          <div className="showdown-grid">
            <label>
              Nivel compartido
              <input
                aria-label="Nivel compartido"
                type="number"
                min="1"
                max="100"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              />
            </label>
            <button
              onClick={() => {
                const n = Number(level);
                if (!Number.isInteger(n) || n < 1 || n > 100) {
                  setError("El nivel compartido debe ser un entero 1–100.");
                  return;
                }
                setRows(rows.map((r) => ({ ...r, p: { ...r.p, level: n } })));
                setError("");
              }}
            >
              Aplicar este nivel a todos
            </button>
            <label>
              Tratamiento de EV
              <select
                aria-label="Tratamiento de EV"
                value={ev}
                onChange={(e) => setEv(e.target.value as EvChoice)}
              >
                <option value="">Elige explícitamente…</option>
                <option value="file">Usar los EV del archivo</option>
                <option value="zero">Poner EV a cero</option>
              </select>
            </label>
            <label>
              Destino
              <select
                aria-label="Destino Showdown"
                value={mode}
                onChange={(e) => setMode(e.target.value as ImportMode)}
              >
                <option value="replace">
                  Reemplazar equipo (con respaldo)
                </option>
                <option value="append">
                  Añadir al equipo actual ({session.team.length}/6)
                </option>
              </select>
            </label>
          </div>
          {ev === "zero" && (
            <p className="notice">
              Elección: todos los EV seleccionados pasarán a 0. Las tarjetas
              muestran los originales y el resultado antes de confirmar; IV y
              naturaleza se conservan.
            </p>
          )}
          <label className="check">
            <input
              type="checkbox"
              checked={full}
              onChange={(e) => setFull(e.target.checked)}
            />
            Equipo a PS completos
          </label>
          <p>
            Acción explícita: solo rellena PS cuando el máximo calculado es
            exacto. Si faltan bases o los PS máximos son un intervalo, siguen
            desconocidos; no se elige un escenario.
          </p>
          {rows.map((r, i) => (
            <PreviewCard
              key={r.p.id}
              row={r}
              index={i}
              ev={ev}
              session={session}
              onChange={(next) =>
                setRows(rows.map((r, j) => (j === i ? next : r)))
              }
            />
          ))}
          <p>
            {mode === "append"
              ? `Resultado: ${session.team.length + selected.length}/6, sin eliminar los Pokémon actuales.`
              : `Se reemplazará el equipo por ${selected.length} Pokémon, con respaldo previo de la partida.`}{" "}
            El rival, las reglas y la configuración EV se conservan.
          </p>
          {blocked && (
            <p role="status">
              Para confirmar: elige EV, incluye de uno a seis Pokémon dentro del
              límite y corrige o excluye las entradas con errores.
            </p>
          )}
          <div className="actions">
            <button disabled={blocked} onClick={apply}>
              Confirmar importación Showdown
            </button>
            <button
              onClick={() => {
                setRows(null);
                setError("");
              }}
            >
              Volver al texto
            </button>
            <button onClick={onCancel}>Cancelar sin cambios</button>
          </div>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
