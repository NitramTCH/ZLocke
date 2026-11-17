import abilities from "./data/ability-catalog.json";
import items from "./data/item-catalog.json";
import type { Pokemon } from "./battle";
export interface EffectEntry {
  id: number;
  slug: string;
  name: string;
  description: string;
}
export interface Support {
  calc: string;
  scope: string;
  conditional?: string;
}
export const ABILITIES = abilities as EffectEntry[],
  ITEMS = items as EffectEntry[];
export const ABILITY_SUPPORT: Record<string, Support> = {
  "huge-power": {
    calc: "Huge Power",
    scope: "Duplica Ataque físico; no cambia la ficha.",
  },
  "pure-power": { calc: "Pure Power", scope: "Duplica Ataque físico." },
  adaptability: { calc: "Adaptability", scope: "STAB ×2 en lugar de ×1,5." },
  levitate: {
    calc: "Levitate",
    scope: "Inmunidad a Tierra; Rompemoldes puede ignorarla.",
  },
  "flash-fire": {
    calc: "Flash Fire",
    scope:
      "Inmunidad a Fuego; aumento ofensivo Fuego ×1,5 solo con activación confirmada.",
    conditional:
      "Potenciación por haber recibido Fuego (la inmunidad no necesita activación)",
  },
  "water-absorb": {
    calc: "Water Absorb",
    scope: "Inmunidad a Agua. No cura PS en la predicción.",
  },
  "volt-absorb": {
    calc: "Volt Absorb",
    scope: "Inmunidad a Eléctrico. No cura PS en la predicción.",
  },
  "thick-fat": { calc: "Thick Fat", scope: "Reduce daño Fuego/Hielo." },
  "fur-coat": {
    calc: "Fur Coat",
    scope: "Duplica Defensa ante ataques físicos simples.",
  },
  "ice-scales": {
    calc: "Ice Scales",
    scope: "Reduce a la mitad daño especial.",
  },
  filter: { calc: "Filter", scope: "Reduce daño supereficaz a ×0,75." },
  "solid-rock": {
    calc: "Solid Rock",
    scope: "Reduce daño supereficaz a ×0,75.",
  },
  multiscale: {
    calc: "Multiscale",
    scope: "Mitad de daño a PS completos; exige PS actuales y máximos.",
  },
  "mold-breaker": {
    calc: "Mold Breaker",
    scope:
      "Ignora habilidades defensivas compatibles durante el golpe, salvo Escudo Habilidad. No anula velocidad de forma permanente.",
  },
  guts: {
    calc: "Guts",
    scope:
      "Ataque ×1,5 con quemadura/parálisis confirmada; evita reducción por quemadura. Otros estados no implementados.",
  },
  unaware: {
    calc: "Unaware",
    scope:
      "Ignora etapas ofensivas del rival al defender y defensivas al atacar.",
  },
  unburden: {
    calc: "Unburden",
    scope:
      "Velocidad ×2 tras perder objeto; requiere sin objeto confirmado y activación explícita. Se pierde al salir.",
    conditional: "Activación tras perder el objeto en esta estancia en campo",
  },
  "slow-start": {
    calc: "Slow Start",
    scope:
      "Mitad de Ataque y velocidad mientras esté activo; no cuenta turnos.",
    conditional: "¿Sigue dentro de los turnos de Inicio Lento?",
  },
  klutz: {
    calc: "Klutz",
    scope:
      "Anula los objetos compatibles equipados. No elimina el objeto del guardado.",
  },
};
export const ITEM_SUPPORT: Record<string, Support> = {
  "choice-band": {
    calc: "Choice Band",
    scope: "Ataque físico ×1,5. No simula bloqueo de movimiento.",
  },
  "choice-specs": {
    calc: "Choice Specs",
    scope: "Ataque especial ×1,5. No simula bloqueo de movimiento.",
  },
  "choice-scarf": {
    calc: "Choice Scarf",
    scope: "Velocidad ×1,5. No simula bloqueo de movimiento.",
  },
  "life-orb": {
    calc: "Life Orb",
    scope: "Daño ×1,3 con redondeos del motor. No resta PS por retroceso.",
  },
  "expert-belt": { calc: "Expert Belt", scope: "Daño supereficaz ×1,2." },
  "assault-vest": {
    calc: "Assault Vest",
    scope:
      "Defensa especial ×1,5. No impide seleccionar movimientos de estado.",
  },
  "air-balloon": {
    calc: "Air Balloon",
    scope:
      "Inmunidad a Tierra mientras esté intacto/activo; no se consume en una consulta.",
  },
  "macho-brace": {
    calc: "Macho Brace",
    scope: "Mitad de velocidad. No simula EV.",
  },
  "ability-shield": {
    calc: "Ability Shield",
    scope:
      "Protege la habilidad defensiva frente a Rompemoldes. Sin otras anulaciones automáticas.",
  },
};
export function effectEntry(p: Pokemon, kind: "ability" | "item") {
  const id = kind === "ability" ? p.abilityId : p.itemId;
  return (kind === "ability" ? ABILITIES : ITEMS).find((e) => e.id === id);
}
export function supportFor(p: Pokemon, kind: "ability" | "item") {
  const entry = effectEntry(p, kind);
  return entry
    ? (kind === "ability" ? ABILITY_SUPPORT : ITEM_SUPPORT)[entry.slug]
    : undefined;
}
export function applyEffect(
  p: Pokemon,
  kind: "ability" | "item",
  e: EffectEntry,
): Pokemon {
  return {
    ...p,
    [kind]: e.name,
    [`${kind}Id`]: e.id,
    [`${kind}State`]: "known",
    ...(kind === "ability"
      ? { abilityActivation: "unknown", abilitySuppressed: false }
      : { itemActivation: "unknown" }),
  };
}
export interface Resolved {
  ability: string;
  item: string;
  abilityOn: boolean;
  conditions: string[];
  missing: string[];
  notes: string[];
}
export function resolveEffects(
  p: Pokemon,
  context: "damage" | "speed" | "defense",
  side: string,
  fireAttack = false,
  switchIn = false,
  physicalAttack = true,
): Resolved {
  const r: Resolved = {
    ability: "",
    item: "",
    abilityOn: false,
    conditions: [],
    missing: [],
    notes: [],
  };
  for (const kind of ["ability", "item"] as const) {
    const state = kind === "ability" ? p.abilityState : p.itemState;
    const label = kind === "ability" ? "Habilidad" : "Objeto";
    if (state === "none") continue;
    if (state === "unknown") {
      r.conditions.push(
        `${label} ${side}: desconocido; referencia sin sus posibles efectos.`,
      );
      continue;
    }
    const sup = supportFor(p, kind);
    if (!sup) {
      r.conditions.push(
        `${label} ${side}: ${p[kind]} no implementado; referencia sin ese efecto.`,
      );
      continue;
    }
    if (kind === "ability") {
      if (p.abilitySuppressed) {
        r.notes.push(
          `${p.ability}: anulada actualmente por confirmación manual; no se aplica.`,
        );
        continue;
      }
      r.ability = sup.calc;
      const conditional =
        sup.conditional &&
        ((sup.calc === "Flash Fire" && context !== "speed" && fireAttack) ||
          (sup.calc === "Slow Start" &&
            (context === "speed" || (side === "atacante" && physicalAttack))) ||
          (sup.calc === "Unburden" && context === "speed"));
      if (conditional) {
        const activation =
          switchIn && ["Unburden", "Flash Fire"].includes(sup.calc)
            ? "inactive"
            : switchIn && sup.calc === "Slow Start"
              ? "unknown"
              : p.abilityActivation;
        if (activation === "unknown")
          r.missing.push(
            `Falta confirmar activación de ${p.ability} (${side}).`,
          );
        r.abilityOn = activation === "active";
        if (sup.calc === "Unburden" && r.abilityOn && p.itemState !== "none")
          r.missing.push(
            `Liviano activo (${side}) requiere sin objeto confirmado.`,
          );
      }
    } else {
      const relevant =
        context === "speed"
          ? ["Choice Scarf", "Macho Brace"].includes(sup.calc)
          : side === "atacante"
            ? [
                physicalAttack ? "Choice Band" : "Choice Specs",
                "Life Orb",
                "Expert Belt",
              ].includes(sup.calc)
            : [
                physicalAttack ? "" : "Assault Vest",
                "Air Balloon",
                "Ability Shield",
              ].includes(sup.calc);
      if (!relevant) {
        r.notes.push(
          `${p.item}: no modifica este cálculo en el alcance actual.`,
        );
        continue;
      }
      if (r.ability === "Klutz") {
        r.notes.push(`${p.item}: anulado por Zoquete.`);
        continue;
      }
      if (p.itemActivation === "unknown") {
        r.missing.push(
          `Falta confirmar si ${p.item} está activo/disponible (${side}).`,
        );
        continue;
      }
      if (p.itemActivation === "inactive") {
        r.notes.push(
          `${p.item}: inactivo o consumido confirmado; no se aplica.`,
        );
        continue;
      }
      r.item = sup.calc;
    }
  }
  return r;
}
