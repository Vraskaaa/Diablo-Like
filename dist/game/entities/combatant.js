// Combatant: the shared base for any entity that has stats, a health/mana pool,
// and can deal/receive damage. Player, minions, and enemies all extend this.
import { Entity } from "../../engine/entity.js";
import { normalize, scale } from "../../engine/math.js";
import { ResourcePool } from "../resources.js";
import { applyMitigation } from "../damage.js";
export class Combatant extends Entity {
    stats;
    resources;
    level = 1;
    /** Brief flash timer when hit, for visual feedback. */
    hitFlash = 0;
    /** Callback invoked when this combatant dies (set by owner/world). */
    onDeath;
    constructor(pos, radius, faction, stats) {
        super(pos, radius, faction);
        this.stats = stats;
        this.resources = new ResourcePool(stats);
    }
    receiveDamage(packet, world) {
        const dmg = applyMitigation(packet, this.stats);
        this.resources.takeDamage(dmg);
        this.hitFlash = 0.12;
        // Route floating combat text through the world if it supports it.
        const sink = world;
        if (sink.pushFloatingText && dmg > 0) {
            const color = packet.isCrit ? "#ffd34a" : this.faction === "enemy" ? "#ffffff" : "#ff6b6b";
            const label = packet.isCrit ? `${Math.round(dmg)}!` : `${Math.round(dmg)}`;
            sink.pushFloatingText(label, { x: this.pos.x, y: this.pos.y - this.radius }, color);
        }
        if (!this.resources.isAlive() && !this.dead) {
            this.dead = true;
            if (this.onDeath)
                this.onDeath(this, world);
        }
    }
    /**
     * Move toward a world target with collision against blocked tiles.
     * Tries full move, then axis-separated moves to allow sliding along walls.
     */
    moveToward(target, speed, dt, world) {
        const dir = normalize({ x: target.x - this.pos.x, y: target.y - this.pos.y });
        this.tryMove(scale(dir, speed * dt), world);
        if (dir.x !== 0 || dir.y !== 0)
            this.facing = Math.atan2(dir.y, dir.x);
    }
    tryMove(delta, world) {
        const nx = { x: this.pos.x + delta.x, y: this.pos.y };
        if (!world.isBlocked(nx.x + Math.sign(delta.x) * this.radius, nx.y)) {
            this.pos.x = nx.x;
        }
        const ny = { x: this.pos.x, y: this.pos.y + delta.y };
        if (!world.isBlocked(ny.x, ny.y + Math.sign(delta.y) * this.radius)) {
            this.pos.y = ny.y;
        }
    }
    updateCommon(dt, world) {
        if (this.hitFlash > 0)
            this.hitFlash = Math.max(0, this.hitFlash - dt);
        this.resources.regen(dt, this.stats);
    }
    /** Draw a small health bar above the combatant. */
    drawHealthBar(ctx, cam, width = 40) {
        if (this.resources.health >= this.stats.maxHealth)
            return;
        const s = cam.worldToScreen(this.pos);
        const pct = Math.max(0, this.resources.health / this.stats.maxHealth);
        const x = s.x - width / 2;
        const y = s.y - this.radius - 12;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(x - 1, y - 1, width + 2, 6);
        ctx.fillStyle = "#c0392b";
        ctx.fillRect(x, y, width * pct, 4);
    }
}
//# sourceMappingURL=combatant.js.map