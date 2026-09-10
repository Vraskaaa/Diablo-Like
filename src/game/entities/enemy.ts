// Enemy entity with simple chase-and-attack AI. Targets the nearest hostile
// (player or ally minion). On death, awards XP and may drop loot via callbacks.

import { World } from "../../engine/entity.js";
import { Camera } from "../../engine/camera.js";
import { Vec2, distance } from "../../engine/math.js";
import { baseStats } from "../stats.js";
import { Combatant } from "./combatant.js";
import { buildDamage } from "../damage.js";

export type EnemyKind = "grunt" | "brute" | "caster" | "boss";

export interface EnemyConfig {
  kind: EnemyKind;
  name: string;
  color: string;
  radius: number;
  health: number;
  damage: number;
  armor: number;
  attackRange: number;
  attackCooldown: number;
  speed: number;
  xpValue: number;
}

export const ENEMY_CONFIGS: Record<EnemyKind, EnemyConfig> = {
  grunt: {
    kind: "grunt",
    name: "Corrupted Ghoul",
    color: "#7a5b8e",
    radius: 13,
    health: 34,
    damage: 6,
    armor: 0,
    attackRange: 30,
    attackCooldown: 1.1,
    speed: 120,
    xpValue: 1,
  },
  brute: {
    kind: "brute",
    name: "Ravager",
    color: "#8e4b3b",
    radius: 20,
    health: 110,
    damage: 14,
    armor: 12,
    attackRange: 38,
    attackCooldown: 1.5,
    speed: 95,
    xpValue: 3,
  },
  caster: {
    kind: "caster",
    name: "Blight Acolyte",
    color: "#4b8e7a",
    radius: 14,
    health: 48,
    damage: 10,
    armor: 2,
    attackRange: 260,
    attackCooldown: 1.8,
    speed: 100,
    xpValue: 2,
  },
  boss: {
    kind: "boss",
    name: "Malgareth, the Hollow King",
    color: "#c0392b",
    radius: 34,
    health: 1400,
    damage: 26,
    armor: 25,
    attackRange: 60,
    attackCooldown: 1.4,
    speed: 85,
    xpValue: 40,
  },
};

export class Enemy extends Combatant {
  readonly kind: EnemyKind;
  readonly cfg: EnemyConfig;
  /** Set once the world has processed this enemy's death (XP/loot). */
  awardedDeath = false;
  private attackTimer = 0;
  private baseDamage: number;
  /** Set by the world to spawn projectiles for caster-type enemies. */
  rangedAttack?: (from: Vec2, to: Vec2, damage: number, world: World) => void;

  constructor(kind: EnemyKind, pos: Vec2, level: number) {
    const cfg = ENEMY_CONFIGS[kind];
    const stats = baseStats();
    // Scale enemy stats with level.
    const lvlScale = 1 + (level - 1) * 0.12;
    stats.maxHealth = cfg.health * lvlScale;
    stats.moveSpeed = cfg.speed;
    stats.armor = cfg.armor;
    super(pos, cfg.radius, "enemy", stats);
    this.kind = kind;
    this.cfg = cfg;
    this.level = level;
    this.baseDamage = cfg.damage * lvlScale;
    this.resources.fill(stats);
  }

  update(dt: number, world: World): void {
    this.updateCommon(dt, world);
    if (this.attackTimer > 0) this.attackTimer -= dt;

    const target = this.findTarget(world);
    if (!target) return;

    const d = distance(this.pos, target.pos);
    if (d <= this.cfg.attackRange + target.radius) {
      this.tryAttack(target, world);
    } else {
      this.moveToward(target.pos, this.stats.moveSpeed, dt, world);
    }
  }

  private tryAttack(target: Combatant, world: World): void {
    if (this.attackTimer > 0) return;
    this.attackTimer = this.cfg.attackCooldown;
    this.facing = Math.atan2(target.pos.y - this.pos.y, target.pos.x - this.pos.x);

    if (this.cfg.kind === "caster" && this.rangedAttack) {
      this.rangedAttack(this.pos, target.pos, this.baseDamage, world);
      return;
    }
    const dmg = buildDamage({ physical: this.baseDamage }, { ...this.stats, physicalDamage: 0 });
    target.receiveDamage(dmg, world);
  }

  private findTarget(world: World): Combatant | null {
    // Prefer the player, but will attack ally minions that are closer.
    let best: Combatant | null = null;
    let bestD = Infinity;
    for (const e of world.entities) {
      if (!(e instanceof Combatant) || e.dead) continue;
      if (e.faction !== "player" && e.faction !== "ally") continue;
      const d = distance(this.pos, e.pos);
      // Slight preference toward the player.
      const weighted = e.faction === "player" ? d * 0.8 : d;
      if (weighted < bestD) {
        best = e;
        bestD = weighted;
      }
    }
    return best;
  }

  draw(ctx: CanvasRenderingContext2D, cam: Camera): void {
    const s = cam.worldToScreen(this.pos);
    ctx.save();
    // Body
    ctx.fillStyle = this.hitFlash > 0 ? "#ffffff" : this.cfg.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Menacing eye
    ctx.fillStyle = "#ff4a4a";
    const ex = s.x + Math.cos(this.facing) * this.radius * 0.4;
    const ey = s.y + Math.sin(this.facing) * this.radius * 0.4;
    ctx.beginPath();
    ctx.arc(ex, ey, Math.max(2, this.radius * 0.18), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Boss gets a name label + wider health bar.
    if (this.kind === "boss") {
      ctx.fillStyle = "#f2d488";
      ctx.font = "13px 'Trebuchet MS', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(this.cfg.name, s.x, s.y - this.radius - 18);
      this.drawHealthBar(ctx, cam, 90);
    } else {
      this.drawHealthBar(ctx, cam, this.radius * 2.4);
    }
  }
}
