// Adaptador aislado y probado exclusivamente con @smogon/calc 0.12.0.
// No ejecuta el constructor basado en especie/IV/EV. Usa estadísticas finales
// públicas y un clone propio; NaN marca datos que realmente no conocemos.
import {
  Pokemon as CalcPokemon,
  Move as CalcMove,
  Generations,
  calculate,
  Field,
  type StatsTable,
} from "@smogon/calc";
import { getFinalSpeed } from "@smogon/calc/dist/mechanics/util";
import type { Pokemon, Move, Type } from "./battle";
import type { Resolved } from "./effects";
export const GEN = Generations.get(9);
const typeMap: Record<Type, string> = {
  Normal: "Normal",
  Fuego: "Fire",
  Agua: "Water",
  Eléctrico: "Electric",
  Planta: "Grass",
  Hielo: "Ice",
  Lucha: "Fighting",
  Veneno: "Poison",
  Tierra: "Ground",
  Volador: "Flying",
  Psíquico: "Psychic",
  Bicho: "Bug",
  Roca: "Rock",
  Fantasma: "Ghost",
  Dragón: "Dragon",
  Siniestro: "Dark",
  Acero: "Steel",
  Hada: "Fairy",
};
const unknown = () => ({
  hp: NaN,
  atk: NaN,
  def: NaN,
  spa: NaN,
  spd: NaN,
  spe: NaN,
});
function cloneManual(this: CalcPokemon): CalcPokemon {
  return Object.assign(Object.create(CalcPokemon.prototype), this, {
    species: { ...this.species },
    types: [...this.types],
    rawStats: { ...this.rawStats },
    stats: { ...this.stats },
    boosts: { ...this.boosts },
    ivs: { ...this.ivs },
    evs: { ...this.evs },
    moves: [...this.moves],
    clone: cloneManual,
  });
}
// El motor recorre todas las etapas aun si el movimiento no las usa.
// Las etapas desconocidas SOLO reciben un neutro interno tras validar las usadas;
// no se escribe en la partida. Las estadísticas desconocidas permanecen NaN.
export function manualPokemon(p: Pokemon, e: Resolved): CalcPokemon {
  const rawStats: StatsTable = {
    hp: p.maxHp ?? NaN,
    atk: p.attack ?? NaN,
    def: p.defense ?? NaN,
    spa: p.spAttack ?? NaN,
    spd: p.spDefense ?? NaN,
    spe: p.speed ?? NaN,
  };
  const types = p.types.map((t) => typeMap[t]);
  return Object.assign(Object.create(CalcPokemon.prototype), {
    gen: GEN,
    name: "ZLockeManual",
    species: {
      name: "ZLockeManual",
      types,
      baseStats: unknown(),
      weightkg: NaN,
    },
    types,
    weightkg: NaN,
    level: p.level ?? NaN,
    ability: e.ability,
    item: e.item,
    abilityOn: e.abilityOn,
    nature: "Serious",
    ivs: unknown(),
    evs: unknown(),
    boosts: {
      hp: 0,
      atk: p.stages.attack ?? 0,
      def: p.stages.defense ?? 0,
      spa: p.stages.spAttack ?? 0,
      spd: p.stages.spDefense ?? 0,
      spe: p.stages.speed ?? 0,
    },
    rawStats,
    stats: { ...rawStats },
    originalCurHP: p.hp ?? NaN,
    status:
      p.burn === "burned" ? "brn" : p.paralysis === "paralyzed" ? "par" : "",
    moves: [],
    clone: cloneManual,
  });
}
export function engineDamage(
  a: Pokemon,
  d: Pokemon,
  m: Move,
  ae: Resolved,
  de: Resolved,
): number[] {
  const move = new CalcMove(GEN, "Tackle", {
    overrides: {
      basePower: m.power!,
      type: typeMap[m.type as Type] as never,
      category: m.category === "Físico" ? "Physical" : "Special",
      priority: m.priority ?? NaN,
    },
  });
  const damage = calculate(
    GEN,
    manualPokemon(a, ae),
    manualPokemon(d, de),
    move,
    new Field({ gameType: "Singles" }),
  ).damage;
  if (typeof damage === "number") return [damage];
  if (damage.some(Array.isArray))
    throw Error("Impactos múltiples fuera del alcance.");
  return damage as number[];
}
export function engineSpeed(p: Pokemon, e: Resolved): number {
  return getFinalSpeed(
    GEN,
    manualPokemon(p, e),
    new Field(),
    new Field().attackerSide,
  );
}
