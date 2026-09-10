// Experience and leveling curve.
//
// The XP curve is a smooth escalating polynomial. Each level grants attribute
// points (allocated per class growth) and a skill point.

export const MAX_LEVEL = 60;

/** Total cumulative XP required to REACH a given level (level 1 = 0). */
export function xpToReachLevel(level: number): number {
  if (level <= 1) return 0;
  // Cumulative curve: sum of per-level costs. Per-level cost grows ~level^1.5.
  let total = 0;
  for (let l = 2; l <= level; l++) {
    total += Math.floor(40 * Math.pow(l - 1, 1.6) + 25 * (l - 1));
  }
  return total;
}

/** XP needed to go from `level` to `level + 1`. */
export function xpForNextLevel(level: number): number {
  if (level >= MAX_LEVEL) return Infinity;
  return xpToReachLevel(level + 1) - xpToReachLevel(level);
}

/** Given total accumulated XP, return the current level. */
export function levelForXp(totalXp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && totalXp >= xpToReachLevel(level + 1)) {
    level++;
  }
  return level;
}

/** Attribute + skill points awarded per level-up. */
export interface LevelReward {
  attributePoints: number;
  skillPoints: number;
}

export function rewardForLevel(level: number): LevelReward {
  return {
    attributePoints: 3,
    // A skill point every level, with a bonus point every 5th level.
    skillPoints: level % 5 === 0 ? 2 : 1,
  };
}

/** XP granted for killing an enemy of a given level relative to the player. */
export function xpForKill(enemyLevel: number, playerLevel: number): number {
  const base = 12 + enemyLevel * 8;
  const diff = enemyLevel - playerLevel;
  // Scale down XP for over-leveled players, up slightly for tough kills.
  const scale = Math.max(0.1, Math.min(1.5, 1 + diff * 0.1));
  return Math.floor(base * scale);
}
