// Deterministic damage model.
//
// IMPORTANT: combat damage is fully deterministic given the same inputs. Crit
// is the ONLY probabilistic element and is explicitly rolled here with an
// injectable roll function so it can be made deterministic in tests. Base
// damage numbers never "roll" — they are computed exactly from stats.

import { StatKey } from "./stats.js";

export type DamageType = "physical" | "fire" | "cold" | "lightning";

export interface DamagePacket {
  physical: number;
  fire: number;
  cold: number;
  lightning: number;
  isCrit: boolean;
}

export function emptyPacket(): DamagePacket {
  return { physical: 0, fire: 0, cold: 0, lightning: 0, isCrit: false };
}

export function packetTotal(p: DamagePacket): number {
  return p.physical + p.fire + p.cold + p.lightning;
}

const DAMAGE_STAT: Record<DamageType, StatKey> = {
  physical: "physicalDamage",
  fire: "fireDamage",
  cold: "coldDamage",
  lightning: "lightningDamage",
};

/**
 * Build a damage packet from a skill's base damage per type, scaled by the
 * attacker's stats and (optionally) crit. `rollCrit` defaults to Math.random
 * but can be injected for determinism.
 */
export function buildDamage(
  baseByType: Partial<Record<DamageType, number>>,
  stats: Record<StatKey, number>,
  opts: { canCrit?: boolean; rollCrit?: () => number } = {}
): DamagePacket {
  const roll = opts.rollCrit ?? Math.random;
  const isCrit = (opts.canCrit ?? true) && roll() < stats.critChance;
  const critMult = isCrit ? stats.critMultiplier : 1;

  const packet = emptyPacket();
  packet.isCrit = isCrit;

  (Object.keys(baseByType) as DamageType[]).forEach((type) => {
    const raw = baseByType[type] ?? 0;
    if (raw <= 0) return;
    // Each damage type is scaled by its matching "increased" stat, which is
    // already folded into stats[...] as a multiplier baseline. We treat the
    // stat value as an additive percentage bucket on top of the raw skill
    // damage: scaled = raw * (1 + stats[typeDamage]).
    const scaled = raw * (1 + stats[DAMAGE_STAT[type]]) * critMult;
    packet[type] += scaled;
  });

  return packet;
}

/**
 * Apply a damage packet to a defender's stats, returning the final HP loss.
 * Physical damage is reduced by armor (diminishing), then all damage is scaled
 * by fractional damage reduction.
 */
export function applyMitigation(
  packet: DamagePacket,
  defenderStats: Record<StatKey, number>
): number {
  // Armor reduces physical using a diminishing-returns curve.
  const armor = Math.max(0, defenderStats.armor);
  const phys = packet.physical;
  const physMitigated = armor > 0 ? phys * (armor / (armor + 10 + phys * 4)) : 0;
  const physFinal = Math.max(0, phys - physMitigated);

  const elemental = packet.fire + packet.cold + packet.lightning;
  const preReduction = physFinal + elemental;
  const final = preReduction * (1 - defenderStats.damageReduction);
  return Math.max(0, final);
}
