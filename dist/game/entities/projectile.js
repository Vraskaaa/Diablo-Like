// A projectile entity: travels in a direction, hits the first valid enemy or
// wall, and applies a damage packet. Used by ranged skills (arrows, bone spear,
// fireball, etc.).
import { Entity } from "../../engine/entity.js";
import { add, scale, distance } from "../../engine/math.js";
import { Combatant } from "./combatant.js";
export class Projectile extends Entity {
    dir;
    speed;
    damage;
    color;
    traveled = 0;
    maxRange;
    pierce;
    hitIds = new Set();
    onHit;
    constructor(opts) {
        super(opts.pos, opts.radius ?? 6, opts.faction);
        this.dir = opts.dir;
        this.speed = opts.speed;
        this.damage = opts.damage;
        this.color = opts.color;
        this.maxRange = opts.maxRange ?? 700;
        this.pierce = opts.pierce ?? 0;
        this.onHit = opts.onHit;
        this.facing = Math.atan2(opts.dir.y, opts.dir.x);
    }
    update(dt, world) {
        const step = scale(this.dir, this.speed * dt);
        this.pos = add(this.pos, step);
        this.traveled += this.speed * dt;
        if (this.traveled >= this.maxRange || world.isBlocked(this.pos.x, this.pos.y)) {
            this.dead = true;
            return;
        }
        // Check collision with hostile combatants.
        for (const e of world.entities) {
            if (e.dead || e === this)
                continue;
            if (!(e instanceof Combatant))
                continue;
            if (!isHostile(this.faction, e.faction))
                continue;
            if (this.hitIds.has(e.id))
                continue;
            if (distance(this.pos, e.pos) <= this.radius + e.radius) {
                e.receiveDamage(this.damage, world);
                if (this.onHit)
                    this.onHit(e, world);
                this.hitIds.add(e.id);
                if (this.pierce <= 0) {
                    this.dead = true;
                    return;
                }
                this.pierce--;
            }
        }
    }
    draw(ctx, cam) {
        const s = cam.worldToScreen(this.pos);
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(this.facing);
        // Glowing bolt.
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius + 4, this.radius, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
export function isHostile(a, b) {
    const aEnemy = a === "enemy";
    const bEnemy = b === "enemy";
    // player & ally are friendly to each other; enemy is hostile to both.
    return aEnemy !== bEnemy;
}
//# sourceMappingURL=projectile.js.map