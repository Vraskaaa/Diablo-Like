// Deterministic material drops from enemies.
//
// To keep the game's REWARD flow non-frustrating while its CRAFTING remains
// fully deterministic, material drops are fixed per enemy kind (not rolled).
// You always know exactly what a kill yields — reinforcing the game's
// "no gambling" identity from monsters through to the crafting bench.

import { EnemyKind } from "../entities/enemy.js";
import { MaterialCost } from "./materials.js";

export const DROP_TABLE: Record<EnemyKind, MaterialCost> = {
  grunt: { shard: 2 },
  caster: { shard: 2, essence: 1 },
  brute: { shard: 3, essence: 2 },
  boss: { shard: 20, essence: 12, rune: 6, catalyst: 4, prime: 2 },
};

/** Starting materials so a new character can immediately try crafting. */
export function startingMaterials(): MaterialCost {
  return { shard: 20, essence: 8, rune: 2, catalyst: 3, prime: 0 };
}
