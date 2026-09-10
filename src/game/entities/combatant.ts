// Combatant: the shared base for any entity that has stats, a health/mana pool,
// and can deal/receive damage. Player, minions, and enemies all extend this.

import { Entity, World, Faction } from "../../engine/entity.js";
import { Camera } from "../../engine/camera.js";
import { Vec2, normalize, add, scale, distance } from "../../engine/math.js";
import { StatKey } from "../stats.js";
import { ResourcePool } from "../resources.js";
import { DamagePacket, applyMitigation, packetTotal } from "../damage.js";

export interface FloatingText {
  text: string;
  pos: Vec2;
  color: string;
  age: number;
  life: number;
  vy: number;
}

export abstract class Combatant extends Entity {
  stats: Record<StatKey, number>;
  resources: ResourcePool;
  level = 1;

  /** Brief flash timer when hit, for visual feedback. */
  hitFlash = 0;
  /** Callback invoked when this combatant dies (set by owner/world). */
  onDeath?: (self: Combatant, world: World) => void;

  constructor(pos: Vec2, radius: number, faction: Faction, stats: Record<StatKey, number>) {
    super(pos, radius, faction);
    this.stats = stats;
    this.resources = new ResourcePool(stats);
  }

  receiveDamage(packet: DamagePacket, world: World): void {
    const dmg = applyMitigation(packet, this.stats);
    this.resources.takeDamage(dmg);
    this.hitFlash = 0.12;
    // Route floating combat text through the world if it supports it.
    const sink = world as unknown as {
      pushFloatingText?: (t: string, p: Vec2, c: string) => void;
    };
    if (sink.pushFloatingText && dmg > 0) {
      const color = packet.isCrit ? "#ffd34a" : this.faction === "enemy" ? "#ffffff" : "#ff6b6b";
      const label = packet.isCrit ? `${Math.round(dmg)}!` : `${Math.round(dmg)}`;
      sink.pushFloatingText(label, { x: this.pos.x, y: this.pos.y - this.radius }, color);
    }
    if (!this.resources.isAlive() && !this.dead) {
      this.dead = true;
      if (this.onDeath) this.onDeath(this, world);
    }
  }

  /**
   * Move toward a world target with collision against blocked tiles.
   * Tries full move, then axis-separated moves to allow sliding along walls.
   */
  protected moveToward(target: Vec2, speed: number, dt: number, world: World): void {
    const dir = normalize({ x: target.x - this.pos.x, y: target.y - this.pos.y });
    this.tryMove(scale(dir, speed * dt), world);
    if (dir.x !== 0 || dir.y !== 0) this.facing = Math.atan2(dir.y, dir.x);
  }

  protected tryMove(delta: Vec2, world: World): void {
    const nx = { x: this.pos.x + delta.x, y: this.pos.y };
    if (!world.isBlocked(nx.x + Math.sign(delta.x) * this.radius, nx.y)) {
      this.pos.x = nx.x;
    }
    const ny = { x: this.pos.x, y: this.pos.y + delta.y };
    if (!world.isBlocked(ny.x, ny.y + Math.sign(delta.y) * this.radius)) {
      this.pos.y = ny.y;
    }
  }

  protected updateCommon(dt: number, world: World): void {
    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.resources.regen(dt, this.stats);
  }

  /** Draw a small health bar above the combatant. */
  protected drawHealthBar(ctx: CanvasRenderingContext2D, cam: Camera, width = 40): void {
    if (this.resources.health >= this.stats.maxHealth) return;
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
