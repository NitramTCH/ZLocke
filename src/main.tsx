import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  TYPES,
  CHART,
  blankPokemon,
  newSession,
  demoSession,
  parseSession,
  stab,
  type Pokemon,
  type Session,
  completeTypes,
  displayName,
  moveFactor,
} from "./battle";
import "./style.css";
import { ShowdownImporter } from "./ShowdownImporter";
import { TacticalSummary } from "./TacticalSummary";
import { statModel } from "./stats";
import { DefensiveCell } from "./DefensiveCell";
import { SpeedPanel } from "./SpeedPanel";
import { EffectEditor } from "./EffectEditor";
import { DamagePanel } from "./DamagePanel";
import { BattleConditions } from "./BattleConditions";
import { Editor, QuickStats } from "./Editor";
import { CATALOG_VERSION, powerLabel } from "./catalog";
const KEY = "zlocke-session-v1";
function initial() {
  try {
    const raw = localStorage.getItem(KEY);
    const session = raw ? parseSession(raw) : newSession();
    if (
      raw &&
      JSON.parse(raw).version < 5 &&
      !localStorage.getItem(`${KEY}-backup`)
    )
      localStorage.setItem(`${KEY}-backup`, raw);
    if (
      raw &&
      JSON.parse(raw).version < 5 &&
      !localStorage.getItem(`${KEY}-backup-v${JSON.parse(raw).version}`)
    )
      localStorage.setItem(`${KEY}-backup-v${JSON.parse(raw).version}`, raw);
    return { session, error: "" };
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
  const [showdownOpen, setShowdownOpen] = useState(false);
  const [showdownBackup, setShowdownBackup] = useState(() => {
    try {
      return localStorage.getItem(`${KEY}-backup-showdown`) ?? "";
    } catch {
      return "";
    }
  });
  const [moveSelection, setMoveSelection] = useState<[number, number]>([0, 0]);
  const selectMoves = (own: number, rival: number) =>
    setMoveSelection([own, rival]);
  const [saveBlocked, setSaveBlocked] = useState(!!boot.error);
  const file = useRef<HTMLInputElement>(null);
  const active = s.team.find((p) => p.id === s.activeId)!;
  useEffect(() => {
    if (saveBlocked) {
      setSave("Guardado detenido: importa una copia o inicia otra partida.");
      return;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
      setSave("Guardado en este navegador");
    } catch {
      setSave("No se pudo guardar: exporta una copia JSON.");
    }
  }, [s, saveBlocked]);
  const update = (p: Pokemon, rival = false) =>
    setS((old) => ({
      ...old,
      ...(rival
        ? { rival: p }
        : { team: old.team.map((x) => (x.id === p.id ? p : x)) }),
    }));
  function downloadJson(content: string, filename: string) {
    const url = URL.createObjectURL(
      new Blob([content], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
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
        setSaveBlocked(false);
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
                  setSaveBlocked(false);
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
            <button onClick={() => setShowdownOpen(true)}>
              Importar Showdown
            </button>
            {showdownBackup && (
              <button
                onClick={() =>
                  downloadJson(showdownBackup, "zlocke-respaldo-showdown.json")
                }
              >
                Descargar respaldo Showdown
              </button>
            )}
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
          {["Equipo", "Combate", "Tabla de tipos", "Acerca de"].map((t) => (
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
        {showdownOpen && (
          <ShowdownImporter
            session={s}
            onCancel={() => setShowdownOpen(false)}
            onImport={(next, summary, replace) => {
              if (replace) {
                const backup = saveBlocked
                  ? (localStorage.getItem(KEY) ?? JSON.stringify(s))
                  : JSON.stringify(s);
                localStorage.setItem(`${KEY}-backup-showdown`, backup);
                setShowdownBackup(backup);
              }
              setS(next);
              setSaveBlocked(false);
              setShowdownOpen(false);
              setTab("Equipo");
              setMessage(summary);
            }}
          />
        )}
        {s.demo && (
          <div className="demo">
            MODO DEMOSTRACIÓN · Datos ficticios editables. No representan
            habilidades ni movimientos habituales de ninguna especie.{" "}
            <button
              onClick={() => {
                if (confirm("¿Crear una partida vacía?")) {
                  setSaveBlocked(false);
                  setS(newSession());
                }
              }}
            >
              Empezar mi partida
            </button>
          </div>
        )}
        <details className="panel party-settings">
          <summary>Configuración de EV de la partida</summary>
          <label>
            EV para estadísticas automáticas
            <select
              aria-label="Configuración EV"
              value={s.evPolicy}
              onChange={(e) => {
                const evPolicy = e.target.value as typeof s.evPolicy;
                setS({
                  ...s,
                  evPolicy,
                  team: s.team.map((p) =>
                    p.statMode !== "manual" && p.hp !== null
                      ? { ...p, hpReview: true }
                      : p,
                  ),
                  rival:
                    s.rival.statMode !== "manual" && s.rival.hp !== null
                      ? { ...s.rival, hpReview: true }
                      : s.rival,
                });
              }}
            >
              <option value="unknown">
                Personalizados/desconocidos · no suponer cero en límites
              </option>
              <option value="zero">EV confirmados a cero</option>
            </select>
          </label>
          <p>
            Los valores conocidos se conservan. Si son incompatibles con EV
            cero, se pide revisarlos; no se sobrescriben.
          </p>
        </details>
        {tab === "Combate" || tab === "Equipo" ? (
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
                    <strong>{displayName(p)}</strong>
                    <span>
                      {completeTypes(p)
                        ? p.types.join(" / ")
                        : `${p.types.join(" / ") || "Tipo 1 ?"} / Tipo 2 ?`}
                    </span>
                    <small>
                      PS {p.hpReview ? "? (revisar)" : (p.hp ?? "?")} /{" "}
                      {p.statMode === "manual"
                        ? (p.maxHp ?? "?")
                        : (() => {
                            const model = statModel(p, s.evPolicy);
                            return model.ok
                              ? `${model.ranges.hp?.min}–${model.ranges.hp?.max} (${p.statMode === "estimated" ? "estimado" : "calculado"})`
                              : "?";
                          })()}
                    </small>
                  </button>
                ))}
                {tab === "Equipo" && s.team.length < 6 && (
                  <button
                    className="slot add"
                    onClick={() => {
                      const p = blankPokemon();
                      p.statMode = "estimated";
                      setS({ ...s, team: [...s.team, p], activeId: p.id });
                    }}
                  >
                    ＋<span>Añadir Pokémon</span>
                  </button>
                )}
              </div>
            </section>
            {tab === "Combate" && (
              <TacticalSummary
                session={s}
                selection={moveSelection}
                onSelection={selectMoves}
              />
            )}
            <div className={tab === "Equipo" ? "team-editor" : "editors"}>
              <section className="panel">
                <div className="section-title">
                  <h2>
                    <span>02</span> En tu lado
                  </h2>
                  {tab === "Equipo" && s.team.length > 1 && (
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
                {tab === "Equipo" ? (
                  <Editor
                    key={active.id}
                    p={active}
                    onChange={(p) => update(p)}
                    label="Tu Pokémon"
                    policy={s.evPolicy}
                  />
                ) : (
                  <>
                    <h3>{displayName(active)}</h3>
                    <QuickStats
                      p={active}
                      onChange={(p) => update(p)}
                      label="Tu Pokémon"
                      policy={s.evPolicy}
                    />
                    <p>Modifica especie, tipos y movimientos en Equipo.</p>
                    <button onClick={() => setTab("Equipo")}>
                      Editar Pokémon en Equipo
                    </button>
                    <EffectEditor
                      p={active}
                      onChange={(p) => update(p)}
                      label="Tu Pokémon"
                    />
                    <BattleConditions
                      p={active}
                      onChange={(p) => update(p)}
                      label="Tu Pokémon"
                    />
                    <div className="battle-moves">
                      {active.moves.map((m, i) => (
                        <div key={i}>
                          <strong>{m.name || `Movimiento ${i + 1}`}</strong>
                          <small>
                            {m.type || "Tipo ?"} · {m.category} · Potencia:{" "}
                            {powerLabel(m)} · Precisión:{" "}
                            {m.accuracyMode === "number"
                              ? `${m.accuracy}%`
                              : m.accuracyMode === "special"
                                ? "Especial / sin tirada estándar"
                                : "?"}{" "}
                            · Prioridad: {m.priority ?? "?"}
                          </small>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>
              {tab === "Combate" && (
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
                    policy={s.evPolicy}
                    compact
                  />
                </section>
              )}
            </div>
            {tab === "Combate" && <DamagePanel session={s} />}
            {tab === "Combate" && (
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
                        <strong>
                          {m.name || `Movimiento ${i + 1}`}
                          <small className="move-note">
                            {m.powerMode === "variable"
                              ? "Potencia variable · no se resuelve"
                              : m.powerMode === "fixed"
                                ? "Daño especial · no se evalúa"
                                : m.category === "Estado"
                                  ? "Estado · no se evalúa"
                                  : ""}
                          </small>
                        </strong>
                        <span>{m.type || "?"}</span>
                        <b
                          className={moveFactor(m, s.rival)! > 1 ? "good" : ""}
                        >
                          {m.category === "Desconocida"
                            ? "?"
                            : m.category === "Estado" || m.powerMode === "fixed"
                              ? "—"
                              : factor(moveFactor(m, s.rival))}
                        </b>
                        <span>
                          {m.category === "Desconocida"
                            ? "?"
                            : m.category === "Estado" || m.powerMode === "fixed"
                              ? "—"
                              : factor(
                                  stab(
                                    m.type,
                                    active.types,
                                    completeTypes(active),
                                  ),
                                )}
                        </span>
                      </div>
                    ))}
                    <div className="footnote">
                      ? = información insuficiente. Estado: no se evalúan sus
                      efectos. STAB estándar: 1,5× al compartir tipo. No se
                      aplican habilidades, objetos ni daño en estos factores de
                      tipo: consulta la predicción separada. Los tipos de
                      catálogo son nominales: ajusta manualmente movimientos
                      cuyo tipo cambie. La potencia variable no se resuelve.
                    </div>
                  </article>
                  <SpeedPanel
                    active={active}
                    rival={s.rival}
                    policy={s.evPolicy}
                    selection={moveSelection}
                    onSelection={selectMoves}
                  />
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
                              {displayName(p)}
                              {p.id === s.activeId && <small>EN CAMPO</small>}
                            </th>
                            {s.rival.moves.map((m, i) => (
                              <td key={i}>
                                {m.category === "Desconocida"
                                  ? "Categoría desconocida"
                                  : m.category === "Estado" ||
                                      m.powerMode === "fixed"
                                    ? "Efecto especial: sin evaluar"
                                    : factor(moveFactor(m, p))}
                                <DefensiveCell
                                  attacker={s.rival}
                                  defender={p}
                                  move={m}
                                  active={p.id === s.activeId}
                                  policy={s.evPolicy}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="footnote">
                    La cifra de tipo no incluye habilidades ni objetos.
                    Despliega cada referencia para ver los efectos compatibles y
                    datos que faltan. Al cambiar, se reinician etapas; no se
                    simulan peligros ni activaciones automáticas de entrada.
                    Consultar no altera PS ni objetos.
                  </div>
                </article>
              </section>
            )}
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
              Un campo vacío significa desconocido. «Sin segundo tipo» confirma
              un monotipo; «Segundo tipo desconocido» bloquea la efectividad
              exacta. Los guardados antiguos con un único tipo necesitan
              confirmación. La tabla moderna y el STAB estándar son los
              supuestos explícitos de esta versión.
            </p>
            <h3>Catálogo local</h3>
            <p>
              {CATALOG_VERSION}. Incluye especies por defecto y movimientos en
              español; las formas no incluidas se introducen manualmente. No
              representa un juego concreto. Seleccionar especie no cambia
              habilidades, movimientos ni estadísticas reales. Los datos de
              movimientos se pueden ajustar; no se aplican sus efectos. Consulta
              las fuentes y criterios en README.
            </p>
            <h3>Lo que vendrá después</h3>
            <p>
              Ampliación del cálculo de daño, reglas por juego, habilidades,
              objetos, prioridad y efectos de campo. Esta versión no integra
              Pokelocke ni recomienda automáticamente una mejor jugada.
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
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
