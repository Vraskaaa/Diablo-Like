// Live resource pools (health & mana) derived from computed stats.
// Handles regeneration, spending, and clamping. Kept separate from stats so the
// same logic serves the player, minions, and enemies.

import { StatKey } from "./stats.js";

export class ResourcePool {
  health: number;
  mana: number;

  constructor(stats: Record<StatKey, number>) {
    this.health = stats.maxHealth;
    this.mana = stats.maxMana;
  }

  /** Regenerate over dt seconds and clamp to current maxima. */
  regen(dt: number, stats: Record<StatKey, number>): void {
    this.health = Math.min(stats.maxHealth, this.health + stats.healthRegen * dt);
    this.mana = Math.min(stats.maxMana, this.mana + stats.manaRegen * dt);
  }

  /** Clamp pools when max values change (e.g. after re-equipping gear). */
  clampTo(stats: Record<StatKey, number>): void {
    this.health = Math.min(this.health, stats.maxHealth);
    this.mana = Math.min(this.mana, stats.maxMana);
  }

  isAlive(): boolean {
    return this.health > 0;
  }

  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
  }

  heal(amount: number, stats: Record<StatKey, number>): void {
    this.health = Math.min(stats.maxHealth, this.health + amount);
  }

  canAfford(manaCost: number): boolean {
    return this.mana >= manaCost;
  }

  spendMana(manaCost: number): boolean {
    if (this.mana < manaCost) return false;
    this.mana -= manaCost;
    return true;
  }

  fill(stats: Record<StatKey, number>): void {
    this.health = stats.maxHealth;
    this.mana = stats.maxMana;
  }
}
