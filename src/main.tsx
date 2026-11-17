import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  TYPES,
  CHART,
  blankPokemon,
  newSession,
  demoSession,
  parseSession,
  effectiveness,
  stab,
  speedOrder,
  type Pokemon,
  type Session,
  type Type,
} from "./battle";
import "./style.css";
const KEY = "zlocke-session-v1";
function initial() {
  try {
    const raw = localStorage.getItem(KEY);
    return { session: raw ? parseSession(raw) : newSession(), error: "" };
  } catch {
    return {
      session: newSession(),
      error:
        "No se pudo recuperar la partida local. Puedes importar una copia JSON.",
    };
  }
}
const boot = initial();
const factor = (n: number | null) => (n === null ? "?" : `${n}×`);
function App() {
  const [s, setS] = useState<Session>(boot.session);
  const [message, setMessage] = useState(boot.error);
  const [tab, setTab] = useState("Combate");
  const [save, setSave] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const active = s.team.find((p) => p.id === s.activeId)!;
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
      setSave("Guardado en este navegador");
    } catch {
      setSave("No se pudo guardar: exporta una copia JSON.");
    }
  }, [s]);
  const update = (p: Pokemon, rival = false) =>
    setS((old) => ({
      ...old,
      ...(rival
        ? { rival: p }
        : { team: old.team.map((x) => (x.id === p.id ? p : x)) }),
    }));
  function exportFile() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(s, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "zlocke-partida.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  async function importFile(f?: File) {
    if (!f) return;
    try {
      if (f.size > 1_000_000) throw new Error("El archivo supera 1 MB.");
      const next = parseSession(await f.text());
      if (confirm("¿Reemplazar la partida actual por el archivo?")) {
        setS(next);
        setMessage("Partida importada.");
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "No se pudo importar.");
    }
    if (file.current) file.current.value = "";
  }
  return (
    <>
      <header>
        <a className="brand" href="#">
          <span className="logo">Z</span>ZLOCKE
          <span className="beta">BETA / 01</span>
        </a>
        <span className="tagline">Menos azar. Más estrategia.</span>
        <span className="save">● {save}</span>
      </header>
      <main>
        <div className="heading">
          <div>
            <div className="eyebrow">TU COMPAÑERO DE RANDOMLOCKE</div>
            <h1>
              El azar pone las reglas.
              <br />
              <span>Tú eliges la estrategia.</span>
            </h1>
            <p>
              Lee el combate. Contrasta tus opciones. Decide con lo que sabes.
            </p>
          </div>
          <div className="actions">
            <button
              onClick={() => {
                if (
                  confirm(
                    "¿Cargar la demostración y reemplazar la partida actual?",
                  )
                ) {
                  setS(demoSession());
                  setMessage(
                    "Demostración cargada: datos ficticios, sin sets de especie.",
                  );
                }
              }}
            >
              Cargar demostración ↗
            </button>
            <button onClick={exportFile}>Exportar JSON ↓</button>
            <button onClick={() => file.current?.click()}>
              Importar JSON ↑
            </button>
            <input
              ref={file}
              hidden
              type="file"
              accept=".json,application/json"
              onChange={(e) => void importFile(e.target.files?.[0])}
            />
          </div>
        </div>
        <nav>
          {["Combate", "Tabla de tipos", "Acerca de"].map((t) => (
            <button
              className={tab === t ? "selected" : ""}
              onClick={() => setTab(t)}
              key={t}
            >
              {t}
            </button>
          ))}
        </nav>
        {message && (
          <div role="status" className="notice">
            {message}
            <button onClick={() => setMessage("")} aria-label="Cerrar mensaje">
              ×
            </button>
          </div>
        )}
        {s.demo && (
          <div className="demo">
            MODO DEMOSTRACIÓN · Datos ficticios editables. No representan
            habilidades ni movimientos habituales de ninguna especie.{" "}
            <button
              onClick={() => {
                if (confirm("¿Crear una partida vacía?")) setS(newSession());
              }}
            >
              Empezar mi partida
            </button>
          </div>
        )}
        {tab === "Combate" ? (
          <>
            <section className="team">
              <div className="section-title">
                <h2>
                  <span>01</span> Tu equipo
                </h2>
                <small>
                  {s.team.length} / 6 Pokémon · selecciona el activo
                </small>
              </div>
              <div className="slots">
                {s.team.map((p, i) => (
                  <button
                    key={p.id}
                    className={`slot ${p.id === s.activeId ? "active" : ""}`}
                    onClick={() => setS({ ...s, activeId: p.id })}
                  >
                    <span className="slot-number">
                      0{i + 1} {p.id === s.activeId ? " / EN CAMPO" : ""}
                    </span>
                    <strong>{p.name || "Sin nombre"}</strong>
                    <span>
                      {p.typesKnown
                        ? p.types.join(" / ")
                        : "Tipos sin confirmar"}
                    </span>
                    <small>
                      PS {p.hp ?? "?"} / {p.maxHp ?? "?"}
                    </small>
                  </button>
                ))}
                {s.team.length < 6 && (
                  <button
                    className="slot add"
                    onClick={() => {
                      const p = blankPokemon();
                      setS({ ...s, team: [...s.team, p], activeId: p.id });
                    }}
                  >
                    ＋<span>Añadir Pokémon</span>
                  </button>
                )}
              </div>
            </section>
            <div className="editors">
              <section className="panel">
                <div className="section-title">
                  <h2>
                    <span>02</span> En tu lado
                  </h2>
                  {s.team.length > 1 && (
                    <button
                      className="text-button"
                      onClick={() => {
                        if (confirm("¿Eliminar este Pokémon?")) {
                          const team = s.team.filter((p) => p.id !== active.id);
                          setS({ ...s, team, activeId: team[0].id });
                        }
                      }}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
                <Editor
                  p={active}
                  onChange={(p) => update(p)}
                  label="Tu Pokémon"
                />
              </section>
              <section className="panel">
                <div className="section-title">
                  <h2>
                    <span>VS</span> Rival
                  </h2>
                  <small>Introduce solo lo conocido</small>
                </div>
                <Editor
                  p={s.rival}
                  onChange={(p) => update(p, true)}
                  label="Rival"
                />
              </section>
            </div>
            <section className="analysis">
              <div className="section-title">
                <h2>
                  <span>03</span> Lectura del combate
                </h2>
                <small>Información, no una mejor jugada automática</small>
              </div>
              <div className="results">
                <article className="panel">
                  <div className="eyebrow">TUS MOVIMIENTOS</div>
                  <h3>Encuentra la ventaja de tipo</h3>
                  <p>
                    Compara efectividad y STAB por separado. Estos factores no
                    son daño.
                  </p>
                  <div className="move-result header-row">
                    <span>Movimiento</span>
                    <span>Tipo</span>
                    <span>Efect.</span>
                    <span>STAB</span>
                  </div>
                  {active.moves.map((m, i) => (
                    <div className="move-result" key={i}>
                      <strong>{m.name || `Movimiento ${i + 1}`}</strong>
                      <span>{m.type || "?"}</span>
                      <b
                        className={
                          effectiveness(
                            m.type,
                            s.rival.types,
                            s.rival.typesKnown,
                          )! > 1
                            ? "good"
                            : ""
                        }
                      >
                        {m.category === "Desconocida"
                          ? "?"
                          : m.category === "Estado"
                            ? "—"
                            : factor(
                                effectiveness(
                                  m.type,
                                  s.rival.types,
                                  s.rival.typesKnown,
                                ),
                              )}
                      </b>
                      <span>
                        {m.category === "Desconocida"
                          ? "?"
                          : m.category === "Estado"
                            ? "—"
                            : factor(
                                stab(m.type, active.types, active.typesKnown),
                              )}
                      </span>
                    </div>
                  ))}
                  <div className="footnote">
                    ? = información insuficiente. Estado: no se evalúan sus
                    efectos. STAB estándar: 1,5× al compartir tipo. No se
                    aplican habilidades, objetos, potencia, precisión ni reglas
                    particulares del juego.
                  </div>
                </article>
                <article className="panel">
                  <div className="eyebrow">ORDEN DE ACCIÓN</div>
                  <h3>¿Quién se mueve antes?</h3>
                  <div className="speed">
                    <div>
                      <strong>{active.speed ?? "?"}</strong>
                      <span>Tu velocidad real</span>
                    </div>
                    <span>vs</span>
                    <div>
                      <strong>{s.rival.speed ?? "?"}</strong>
                      <span>Velocidad rival</span>
                    </div>
                  </div>
                  <p className="speed-verdict">
                    {speedOrder(active.speed, s.rival.speed)}
                  </p>
                  <div className="footnote">
                    Comparación de valores introducidos. Prioridad, estados,
                    habilidades, objetos, cambios de estadísticas y efectos de
                    campo pueden cambiar el orden; no se aplican aquí.
                  </div>
                </article>
              </div>
              <article className="panel defense">
                <h3>Antes de cambiar, mira qué puedes recibir</h3>
                <p>
                  Efectividad de los movimientos ofensivos rivales conocidos
                  contra cada miembro. Un multiplicador menor indica menor
                  efectividad por tipos, no menos daño garantizado.
                </p>
                <div className="scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Tu equipo</th>
                        {s.rival.moves.map((m, i) => (
                          <th key={i}>
                            {m.name || `Rival ${i + 1}`}
                            <small>{m.type || "Tipo desconocido"}</small>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.team.map((p) => (
                        <tr key={p.id}>
                          <th>
                            {p.name || "Sin nombre"}
                            {p.id === s.activeId && <small>EN CAMPO</small>}
                          </th>
                          {s.rival.moves.map((m, i) => (
                            <td key={i}>
                              {m.category === "Desconocida"
                                ? "Categoría desconocida"
                                : m.category === "Estado"
                                  ? "Estado: sin evaluar"
                                  : factor(
                                      effectiveness(
                                        m.type,
                                        p.types,
                                        p.typesKnown,
                                      ),
                                    )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="footnote">
                  No se evalúan habilidades, objetos, PS, estadísticas
                  defensivas ni efectos al entrar al campo. Los movimientos
                  desconocidos siguen siendo un riesgo sin evaluar.
                </div>
              </article>
            </section>
          </>
        ) : tab === "Tabla de tipos" ? (
          <section className="panel">
            <h2>Los 18 tipos, de un vistazo</h2>
            <p>
              Filas: ataque → columnas: defensa. Tabla moderna, desde generación
              VI. Para dos tipos defensivos, multiplica sus factores. No aplica
              cambios de reglas de juegos anteriores.
            </p>
            <div className="scroll">
              <table className="chart">
                <thead>
                  <tr>
                    <th>Ataque ↓ / Defensa →</th>
                    {TYPES.map((t) => (
                      <th key={t}>{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TYPES.map((t, i) => (
                    <tr key={t}>
                      <th>{t}</th>
                      {CHART[i].map((n, j) => (
                        <td
                          className={
                            n === 0
                              ? "immune"
                              : n > 1
                                ? "super"
                                : n < 1
                                  ? "resist"
                                  : ""
                          }
                          key={j}
                        >
                          {n}×
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="panel about">
            <h2>Decide con información, también cuando falta.</h2>
            <p>
              ZLocke acompaña combates individuales de aventura y contra amigos
              en randomlockes. Todos los datos se introducen manualmente: nunca
              inferimos movimientos, habilidades o estadísticas por especie.
            </p>
            <h3>Conocido, desconocido y supuesto</h3>
            <p>
              Un campo vacío significa desconocido. Los tipos solo se usan si
              marcas su combinación como confirmada. La tabla moderna y el STAB
              estándar son los supuestos explícitos de esta versión.
            </p>
            <h3>Lo que vendrá después</h3>
            <p>
              Cálculo completo de daño, reglas por juego, habilidades, objetos,
              prioridad y efectos de campo. Esta versión no integra Pokelocke ni
              recomienda automáticamente una mejor jugada.
            </p>
            <h3>Tus datos se quedan aquí</h3>
            <p>
              Guardamos la partida en este navegador. Exporta JSON para
              respaldarla o trasladarla. Importar y cargar la demostración
              reemplazan la partida tras confirmación.
            </p>
          </section>
        )}
        <footer>
          <strong>ZLOCKE</strong>
          <span>Menos azar. Más estrategia.</span>
          <small>Entrada manual · Combates individuales · v0.1</small>
        </footer>
      </main>
    </>
  );
}
function Editor({
  p,
  onChange,
  label,
}: {
  p: Pokemon;
  onChange: (p: Pokemon) => void;
  label: string;
}) {
  const set = (patch: Partial<Pokemon>) => onChange({ ...p, ...patch });
  const num = (key: keyof Pokemon, title: string) => (
    <label key={key}>
      {title}
      <input
        type="number"
        min={key === "hp" ? 0 : 1}
        max={99999}
        step="1"
        placeholder="?"
        value={(p[key] as number) ?? ""}
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
          set({ [key]: n });
        }}
      />
    </label>
  );
  return (
    <div className="editor" aria-label={label}>
      <label>
        Nombre
        <input
          placeholder="Nombre o mote"
          value={p.name}
          onChange={(e) => set({ name: e.target.value })}
        />
      </label>
      <div className="fields">
        <label>
          Tipo 1
          <select
            value={p.types[0] || ""}
            onChange={(e) => {
              const t = e.target.value as Type;
              set({
                types: t ? [t, ...p.types.slice(1).filter((x) => x !== t)] : [],
                typesKnown: t ? p.typesKnown : false,
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
            value={p.types[1] || ""}
            disabled={!p.types[0]}
            onChange={(e) =>
              set({
                types: e.target.value
                  ? [p.types[0], e.target.value as Type]
                  : p.types.slice(0, 1),
              })
            }
          >
            <option value="">Ninguno / desconocido</option>
            {TYPES.filter((t) => t !== p.types[0]).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        {num("level", "Nivel")}
      </div>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={p.typesKnown}
          disabled={!p.types.length}
          onChange={(e) => set({ typesKnown: e.target.checked })}
        />{" "}
        Combinación de tipos completa y confirmada
      </label>
      <div className="fields">
        {num("hp", "PS actuales")}
        {num("maxHp", "PS máximos")}
        {num("speed", "Velocidad real")}
      </div>
      <details>
        <summary>Estadísticas, habilidad y objeto</summary>
        <div className="fields">
          {num("attack", "Ataque")}
          {num("defense", "Defensa")}
          {num("spAttack", "At. especial")}
          {num("spDefense", "Def. especial")}
        </div>
        <div className="fields">
          <label>
            Habilidad
            <input
              placeholder="Desconocida"
              value={p.ability}
              onChange={(e) => set({ ability: e.target.value })}
            />
          </label>
          <label>
            Objeto
            <input
              placeholder="Desconocido"
              value={p.item}
              onChange={(e) => set({ item: e.target.value })}
            />
          </label>
        </div>
        <small>
          Se guardan como referencia; sus efectos aún no se calculan.
        </small>
      </details>
      <div className="moves-label">
        MOVIMIENTOS <span>Nombre libre · sin sets presupuestos</span>
      </div>
      {p.moves.map((m, i) => (
        <div className="move-fields" key={i}>
          <span>{i + 1}</span>
          <input
            aria-label={`${label} movimiento ${i + 1}`}
            placeholder="Movimiento desconocido"
            value={m.name}
            onChange={(e) =>
              set({
                moves: p.moves.map((v, j) =>
                  j === i ? { ...v, name: e.target.value } : v,
                ),
              })
            }
          />
          <select
            aria-label={`${label} tipo movimiento ${i + 1}`}
            value={m.type}
            onChange={(e) =>
              set({
                moves: p.moves.map((v, j) =>
                  j === i ? { ...v, type: e.target.value as Type | "" } : v,
                ),
              })
            }
          >
            <option value="">Tipo ?</option>
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select
            aria-label={`${label} categoría movimiento ${i + 1}`}
            value={m.category}
            onChange={(e) =>
              set({
                moves: p.moves.map((v, j) =>
                  j === i
                    ? { ...v, category: e.target.value as typeof m.category }
                    : v,
                ),
              })
            }
          >
            {["Desconocida", "Físico", "Especial", "Estado"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
