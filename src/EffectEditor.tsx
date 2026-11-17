import type { Pokemon } from "./battle";
import {
  ABILITIES,
  ITEMS,
  applyEffect,
  effectEntry,
  supportFor,
} from "./effects";
import { CATALOG_VERSION } from "./catalog";
import { Search } from "./Search";
export function EffectEditor({
  p,
  onChange,
  label,
}: {
  p: Pokemon;
  onChange: (p: Pokemon) => void;
  label: string;
}) {
  return (
    <details className="effect-editor">
      <summary>Habilidad y objeto · efectos y activación</summary>
      <p>
        Cualquier habilidad para cualquier especie. Valores de la ficha antes de
        efectos temporales: no multipliques estadísticas ni etapas manualmente.
      </p>
      {(["ability", "item"] as const).map((kind) => {
        const isAbility = kind === "ability";
        const title = isAbility ? "habilidad" : "objeto";
        const state = isAbility ? p.abilityState : p.itemState;
        const entry = effectEntry(p, kind),
          support = supportFor(p, kind);
        return (
          <section key={kind}>
            <Search
              entries={isAbility ? ABILITIES : ITEMS}
              label={`${label}: buscar ${title}`}
              onSelect={(e) => onChange(applyEffect(p, kind, e))}
            />
            <div className="fields identity">
              <label>
                Estado de {title}
                <select
                  aria-label={`${label} estado ${title}`}
                  value={state}
                  onChange={(e) =>
                    onChange({ ...p, [`${kind}State`]: e.target.value })
                  }
                >
                  <option value="unknown">Desconocido</option>
                  <option value="none">Ninguno confirmado</option>
                  <option value="known" disabled={!p[kind].trim()}>
                    Valor conocido
                  </option>
                </select>
              </label>
              <label>
                {title} manual (fangame)
                <input
                  aria-label={`${label} ${title} manual`}
                  disabled={state === "none"}
                  value={p[kind]}
                  placeholder="Entrada libre sin efecto automático"
                  onChange={(e) =>
                    onChange({
                      ...p,
                      [kind]: e.target.value,
                      [`${kind}Id`]: null,
                      [`${kind}State`]: e.target.value.trim()
                        ? "known"
                        : "unknown",
                      ...(isAbility
                        ? {
                            abilityActivation: "unknown",
                            abilitySuppressed: false,
                          }
                        : { itemActivation: "unknown" }),
                    })
                  }
                />
              </label>
            </div>
            {state === "known" && (
              <>
                <p>
                  {entry?.description ||
                    "Contenido manual: no se infiere efecto por el nombre."}
                </p>
                <div className="footnote">
                  {support
                    ? `Compatible parcialmente: ${support.scope}`
                    : "Efecto no implementado. Se permite una referencia condicionada sin aplicarlo."}{" "}
                  {entry && `ID PokéAPI: ${entry.id} · ${entry.slug}.`}
                </div>
                {isAbility && (
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={p.abilitySuppressed}
                      onChange={(e) =>
                        onChange({ ...p, abilitySuppressed: e.target.checked })
                      }
                    />
                    Confirmo que la habilidad está anulada actualmente (no se
                    predice la causa)
                  </label>
                )}
                {(isAbility ? support?.conditional : !!support) && (
                  <label>
                    {isAbility
                      ? support!.conditional
                      : "Objeto activo/disponible, sin consumir ni anular"}
                    <select
                      aria-label={`${label} activación ${title}`}
                      value={isAbility ? p.abilityActivation : p.itemActivation}
                      onChange={(e) =>
                        onChange({
                          ...p,
                          [isAbility ? "abilityActivation" : "itemActivation"]:
                            e.target.value,
                        })
                      }
                    >
                      <option value="unknown">
                        Desconocida · necesita confirmación
                      </option>
                      <option value="active">Sí, activo</option>
                      <option value="inactive">No, inactivo / consumido</option>
                    </select>
                  </label>
                )}
              </>
            )}
          </section>
        );
      })}
      <small>
        {CATALOG_VERSION}. Incluir un nombre en el catálogo no implica
        implementar todo su efecto. Las consultas no consumen objetos ni cambian
        PS o etapas.
      </small>
    </details>
  );
}
