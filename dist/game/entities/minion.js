// Minion entity — an ally combatant controlled by simple AI. Used by the
// Summoner's Raise Skeleton / Summon Golem skills.
//
// AI states:
//   - follow: stay near the owner when no enemies are around
//   - seek: move toward the current attack target (from Command) or nearest enemy
//   - attack: when in range, strike on a cooldown
//
// Minion stats are derived from the owner's minionDamage / minionLife stats so
// they scale with the Summoner's investment.
import { distance } from "../../engine/math.js";
import { baseStats } from "../stats.js";
import { Combatant } from "./combatant.js";
import { buildDamage } from "../damage.js";
export const MINION_CONFIGS = {
    skeleton: {
        kind: "skeleton",
        color: "#e8e2d0",
        radius: 12,
        baseHealth: 40,
        baseDamage: 8,
        attackRange: 34,
        attackCooldown: 0.9,
        speed: 175,
        lifespan: Infinity,
    },
    golem: {
        kind: "golem",
        color: "#7a8a7f",
        radius: 20,
        baseHealth: 220,
        baseDamage: 18,
        attackRange: 42,
        attackCooldown: 1.4,
        speed: 130,
        lifespan: Infinity,
    },
};
export class Minion extends Combatant {
    kind;
    cfg;
    owner;
    attackTimer = 0;
    age = 0;
    /** Explicit rally point set by the Summoner's Command skill. */
    commandTarget = null;
    ownerMinionDamage;
    constructor(kind, pos, owner) {
        const cfg = MINION_CONFIGS[kind];
        // Derive stats from the owner's minion modifiers.
        const stats = baseStats();
        const lifeMult = 1 + owner.stats.minionLife;
        const dmgMult = 1 + owner.stats.minionDamage;
        stats.maxHealth = cfg.baseHealth * lifeMult + owner.level * 6;
        stats.moveSpeed = cfg.speed;
        stats.armor = kind === "golem" ? 30 : 5;
        super(pos, cfg.radius, "ally", stats);
        this.kind = kind;
        this.cfg = cfg;
        this.owner = owner;
        this.level = owner.level;
        this.ownerMinionDamage = cfg.baseDamage * dmgMult + owner.level * 1.5;
        this.resources.fill(stats);
    }
    update(dt, world) {
        this.updateCommon(dt, world);
        this.age += dt;
        if (this.cfg.lifespan !== Infinity && this.age >= this.cfg.lifespan) {
            this.dead = true;
            return;
        }
        if (this.attackTimer > 0)
            this.attackTimer -= dt;
        // Determine target: command target's nearest enemy, else nearest enemy,
        // else follow owner.
        const searchAnchor = this.commandTarget ?? this.pos;
        const enemy = this.findNearestEnemy(world, searchAnchor, 520);
        if (enemy) {
            const d = distance(this.pos, enemy.pos);
            if (d <= this.cfg.attackRange + enemy.radius) {
                this.tryAttack(enemy, world);
            }
            else {
                this.moveToward(enemy.pos, this.stats.moveSpeed, dt, world);
            }
        }
        else if (this.commandTarget && distance(this.pos, this.commandTarget) > 20) {
            this.moveToward(this.commandTarget, this.stats.moveSpeed, dt, world);
        }
        else {
            // Follow the owner, keeping a small standoff distance.
            const d = distance(this.pos, this.owner.pos);
            if (d > 70)
                this.moveToward(this.owner.pos, this.stats.moveSpeed, dt, world);
        }
    }
    tryAttack(enemy, world) {
        if (this.attackTimer > 0)
            return;
        this.attackTimer = this.cfg.attackCooldown;
        this.facing = Math.atan2(enemy.pos.y - this.pos.y, enemy.pos.x - this.pos.x);
        const dmg = buildDamage({ physical: this.ownerMinionDamage }, { ...this.stats, physicalDamage: 0 });
        enemy.receiveDamage(dmg, world);
    }
    findNearestEnemy(world, from, maxDist) {
        let best = null;
        let bestD = maxDist;
        for (const e of world.entities) {
            if (!(e instanceof Combatant) || e.dead)
                continue;
            if (e.faction !== "enemy")
                continue;
            const d = distance(from, e.pos);
            if (d < bestD) {
                best = e;
                bestD = d;
            }
        }
        return best;
    }
    draw(ctx, cam) {
        const s = cam.worldToScreen(this.pos);
        ctx.save();
        // Body
        ctx.fillStyle = this.hitFlash > 0 ? "#ffffff" : this.cfg.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        // Outline to distinguish allies (blue tint ring)
        ctx.strokeStyle = "#6f8fff";
        ctx.lineWidth = 2;
        ctx.stroke();
        // Facing tick
        ctx.strokeStyle = "#2b2b2b";
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + Math.cos(this.facing) * this.radius, s.y + Math.sin(this.facing) * this.radius);
        ctx.stroke();
        ctx.restore();
        this.drawHealthBar(ctx, cam, this.radius * 2.4);
    }
}
//# sourceMappingURL=minion.js.map