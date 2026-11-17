import { type Pokemon, newStages } from "./battle";
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
