// GameWorld: the authoritative simulation container. Implements the engine's
// World interface (used by entities) and the SkillFx interface (used by skills),
// owns all entities, and drives spawning, combat resolution side-effects
// (floating text, XP, loot), and the boss encounter.
import { isBlocked as tileBlocked } from "../engine/tilemap.js";
import { RNG } from "../engine/rng.js";
import { distance, normalize, angleTo } from "../engine/math.js";
import { Combatant } from "./entities/combatant.js";
import { Enemy } from "./entities/enemy.js";
import { Projectile, isHostile } from "./entities/projectile.js";
import { Effect } from "./entities/effect.js";
import { tickDots } from "./skills.js";
import { buildDamage } from "./damage.js";
export class GameWorld {
    entities = [];
    map;
    time = 0;
    player;
    rng;
    floatingTexts = [];
    pendingLoot = [];
    /** Callback so the game layer can react to a kill (grant XP, drop loot). */
    onEnemyKilled;
    /** Callback when the player dies. */
    onPlayerDeath;
    /** Callback when the boss dies (victory). */
    onBossKilled;
    toSpawn = [];
    constructor(map, seed) {
        this.map = map;
        this.rng = new RNG(seed);
    }
    // ---- IWorld interface ----
    spawn(e) {
        // Defer additions so we don't mutate the array mid-iteration.
        this.toSpawn.push(e);
    }
    isBlocked(worldX, worldY) {
        return tileBlocked(this.map, worldX, worldY);
    }
    nearestEnemyOf(e, maxDist) {
        let best = null;
        let bestD = maxDist;
        for (const other of this.entities) {
            if (other.dead || other === e)
                continue;
            if (!(other instanceof Combatant))
                continue;
            if (!isHostile(e.faction, other.faction))
                continue;
            const d = distance(e.pos, other.pos);
            if (d < bestD) {
                best = other;
                bestD = d;
            }
        }
        return best;
    }
    enemiesOf(faction) {
        return this.entities.filter((e) => e instanceof Combatant && !e.dead && isHostile(faction, e.faction));
    }
    // ---- SkillFx interface ----
    spawnProjectile(p) {
        this.spawn(p);
    }
    spawnFx(kind, at, radius, color) {
        this.spawn(new Effect(kind, { ...at }, radius, color));
    }
    areaBurst(center, radius, baseByType, caster) {
        let hits = 0;
        for (const e of this.entities) {
            if (!(e instanceof Combatant) || e.dead)
                continue;
            if (!isHostile(caster.faction, e.faction))
                continue;
            if (distance(center, e.pos) <= radius + e.radius) {
                const dmg = buildDamage(baseByType, caster.stats);
                e.receiveDamage(dmg, this);
                hits++;
            }
        }
        return hits;
    }
    meleeArc(caster, angle, arc, range, baseByType) {
        let hits = 0;
        for (const e of this.entities) {
            if (!(e instanceof Combatant) || e.dead)
                continue;
            if (!isHostile(caster.faction, e.faction))
                continue;
            const d = distance(caster.pos, e.pos);
            if (d > range + e.radius)
                continue;
            const toTarget = angleTo(caster.pos, e.pos);
            let diff = Math.abs(normalizeAngle(toTarget - angle));
            if (diff <= arc / 2) {
                const dmg = buildDamage(baseByType, caster.stats);
                e.receiveDamage(dmg, this);
                hits++;
            }
        }
        return hits;
    }
    // ---- Floating combat text ----
    pushFloatingText(text, pos, color) {
        this.floatingTexts.push({
            text,
            pos: { x: pos.x, y: pos.y },
            color,
            age: 0,
            life: 0.9,
            vy: -40,
        });
    }
    // ---- Simulation ----
    update(dt) {
        this.time += dt;
        // Update all entities.
        for (const e of this.entities) {
            if (e.dead)
                continue;
            e.update(dt, this);
        }
        // Tick DoTs on all combatants.
        for (const e of this.entities) {
            if (e instanceof Combatant && !e.dead)
                tickDots(e, dt, this);
        }
        // Separate overlapping combatants a little to avoid stacking.
        this.resolveSoftCollisions();
        // Handle deaths (XP, loot) for enemies that died this frame.
        for (const e of this.entities) {
            if (e instanceof Enemy && e.dead && !e.awardedDeath) {
                e.awardedDeath = true;
                if (this.onEnemyKilled)
                    this.onEnemyKilled(e);
                if (e.kind === "boss" && this.onBossKilled)
                    this.onBossKilled();
            }
        }
        // Player death.
        if (this.player && this.player.dead) {
            if (this.onPlayerDeath)
                this.onPlayerDeath();
        }
        // Advance floating text.
        for (const ft of this.floatingTexts) {
            ft.age += dt;
            ft.pos.y += ft.vy * dt;
        }
        this.floatingTexts = this.floatingTexts.filter((f) => f.age < f.life);
        // Flush spawns and remove dead entities.
        if (this.toSpawn.length) {
            this.entities.push(...this.toSpawn);
            this.toSpawn.length = 0;
        }
        this.entities = this.entities.filter((e) => !e.dead || e === this.player);
    }
    resolveSoftCollisions() {
        const combs = this.entities.filter((e) => e instanceof Combatant && !e.dead);
        for (let i = 0; i < combs.length; i++) {
            for (let j = i + 1; j < combs.length; j++) {
                const a = combs[i];
                const b = combs[j];
                const minDist = a.radius + b.radius;
                const dx = b.pos.x - a.pos.x;
                const dy = b.pos.y - a.pos.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 0 && dist < minDist) {
                    const overlap = (minDist - dist) / 2;
                    const nx = dx / dist;
                    const ny = dy / dist;
                    // Enemies push each other; player is immovable by enemies to keep
                    // control tight, but still separates from allies gently.
                    const aPush = a === this.player ? 0 : overlap;
                    const bPush = b === this.player ? 0 : overlap;
                    a.pos.x -= nx * aPush;
                    a.pos.y -= ny * aPush;
                    b.pos.x += nx * bPush;
                    b.pos.y += ny * bPush;
                }
            }
        }
    }
    // ---- Enemy ranged attacks (for caster enemies) ----
    makeEnemyRangedAttack(from, to, damage) {
        const dir = normalize({ x: to.x - from.x, y: to.y - from.y });
        const packet = {
            physical: 0,
            fire: damage,
            cold: 0,
            lightning: 0,
            isCrit: false,
        };
        this.spawn(new Projectile({
            pos: { ...from },
            dir,
            speed: 320,
            damage: packet,
            faction: "enemy",
            color: "#b06fd4",
            radius: 7,
            maxRange: 340,
        }));
    }
    // ---- Rendering ----
    draw(ctx, cam) {
        // Sort by y for a pseudo-depth ordering.
        const drawList = [...this.entities].sort((a, b) => a.pos.y - b.pos.y);
        for (const e of drawList) {
            if (e.dead && e !== this.player)
                continue;
            e.draw(ctx, cam);
        }
        // Floating combat text on top.
        ctx.textAlign = "center";
        for (const ft of this.floatingTexts) {
            const s = cam.worldToScreen(ft.pos);
            const alpha = 1 - ft.age / ft.life;
            ctx.globalAlpha = Math.max(0, alpha);
            ctx.fillStyle = ft.color;
            ctx.font = "bold 15px 'Trebuchet MS', sans-serif";
            ctx.fillText(ft.text, s.x, s.y);
            ctx.globalAlpha = 1;
        }
    }
}
function normalizeAngle(a) {
    while (a > Math.PI)
        a -= Math.PI * 2;
    while (a < -Math.PI)
        a += Math.PI * 2;
    return a;
}
//# sourceMappingURL=world.js.map