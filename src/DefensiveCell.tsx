import { type Pokemon, type Move, newStages } from "./battle";
import type { EvPolicy } from "./statTypes";
import { intervalDamage } from "./uncertainty";
import { effectEntry } from "./effects";
export function entryScenario(p: Pokemon): Pokemon {
  const slug = effectEntry(p, "ability")?.slug;
  return {
    ...p,
    stages: newStages(),
    abilityActivation: ["unburden", "flash-fire"].includes(slug || "")
      ? "inactive"
      : slug === "slow-start"
        ? "unknown"
        : p.abilityActivation,
  };
}
export function DefensiveCell({
  attacker,
  defender,
  move,
  active,
  policy,
}: {
  attacker: Pokemon;
  defender: Pokemon;
  move: Move;
  active: boolean;
  policy: EvPolicy;
}) {
  const p = active ? defender : entryScenario(defender);
  const r = intervalDamage(attacker, p, move, policy);
  return (
    <details className="defensive-reference">
      <summary>
        {active ? "En campo" : "Al entrar"} ·{" "}
        {r.ok
          ? r.immunity === "effects"
            ? "Inmune por efecto"
            : r.immunity === "types"
              ? "Inmune por tipos"
              : `${r.min}–${r.max} PS (referencia)`
          : "Referencia incompleta"}
      </summary>
      {!active && (
        <p>
          Etapas se reinician a 0. Potenciación de Absorbe Fuego/Liviano se
          pierde al salir. No simulamos peligros de entrada ni otros efectos que
          se activarían al entrar; PS son los introducidos antes de recibir daño
          de entrada.
        </p>
      )}
      {r.ok ? (
        <>
          <p>Predicción condicionada; no es garantía.</p>
          {[...r.applied, ...r.conditions].map((x, i) => (
            <p key={i}>{x}</p>
          ))}
        </>
      ) : (
        <ul>
          {r.reasons.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}
    </details>
  );
}
