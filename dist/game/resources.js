// Live resource pools (health & mana) derived from computed stats.
// Handles regeneration, spending, and clamping. Kept separate from stats so the
// same logic serves the player, minions, and enemies.
export class ResourcePool {
    health;
    mana;
    constructor(stats) {
        this.health = stats.maxHealth;
        this.mana = stats.maxMana;
    }
    /** Regenerate over dt seconds and clamp to current maxima. */
    regen(dt, stats) {
        this.health = Math.min(stats.maxHealth, this.health + stats.healthRegen * dt);
        this.mana = Math.min(stats.maxMana, this.mana + stats.manaRegen * dt);
    }
    /** Clamp pools when max values change (e.g. after re-equipping gear). */
    clampTo(stats) {
        this.health = Math.min(this.health, stats.maxHealth);
        this.mana = Math.min(this.mana, stats.maxMana);
    }
    isAlive() {
        return this.health > 0;
    }
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
    }
    heal(amount, stats) {
        this.health = Math.min(stats.maxHealth, this.health + amount);
    }
    canAfford(manaCost) {
        return this.mana >= manaCost;
    }
    spendMana(manaCost) {
        if (this.mana < manaCost)
            return false;
        this.mana -= manaCost;
        return true;
    }
    fill(stats) {
        this.health = stats.maxHealth;
        this.mana = stats.maxMana;
    }
}
//# sourceMappingURL=resources.js.map