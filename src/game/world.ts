// GameWorld: the authoritative simulation container. Implements the engine's
// World interface (used by entities) and the SkillFx interface (used by skills),
// owns all entities, and drives spawning, combat resolution side-effects
// (floating text, XP, loot), and the boss encounter.

import { Entity, World as IWorld, Faction } from "../engine/entity.js";
import { Camera } from "../engine/camera.js";
import { TileMap, isBlocked as tileBlocked, TILE_SIZE } from "../engine/tilemap.js";
import { RNG } from "../engine/rng.js";
import { Vec2, distance, normalize, add, scale, vec2, angleTo } from "../engine/math.js";
import { Combatant, FloatingText } from "./entities/combatant.js";
import { Player } from "./entities/player.js";
import { Enemy, EnemyKind } from "./entities/enemy.js";
import { Projectile, isHostile } from "./entities/projectile.js";
import { Effect, EffectKind } from "./entities/effect.js";
import { SkillFx, Caster, tickDots } from "./skills.js";
import { DamageType, buildDamage, DamagePacket } from "./damage.js";
import { xpForKill } from "./leveling.js";

export interface LootDrop {
  pos: Vec2;
  /** Material id + amount, or an item to be resolved by the game layer. */
  materials: { id: string; amount: number }[];
}

export interface WaveConfig {
  enemyLevel: number;
  spawns: { kind: EnemyKind; count: number }[];
}

export class GameWorld implements IWorld, SkillFx {
  entities: Entity[] = [];
  map: TileMap;
  time = 0;
  player!: Player;
  rng: RNG;

  floatingTexts: FloatingText[] = [];
  pendingLoot: LootDrop[] = [];
  /** Callback so the game layer can react to a kill (grant XP, drop loot). */
  onEnemyKilled?: (enemy: Enemy) => void;
  /** Callback when the player dies. */
  onPlayerDeath?: () => void;
  /** Callback when the boss dies (victory). */
  onBossKilled?: () => void;

  private toSpawn: Entity[] = [];

  constructor(map: TileMap, seed: number) {
    this.map = map;
    this.rng = new RNG(seed);
  }

  // ---- IWorld interface ----

  spawn(e: Entity): void {
    // Defer additions so we don't mutate the array mid-iteration.
    this.toSpawn.push(e);
  }

  isBlocked(worldX: number, worldY: number): boolean {
    return tileBlocked(this.map, worldX, worldY);
  }

  nearestEnemyOf(e: Entity, maxDist: number): Entity | null {
    let best: Entity | null = null;
    let bestD = maxDist;
    for (const other of this.entities) {
      if (other.dead || other === e) continue;
      if (!(other instanceof Combatant)) continue;
      if (!isHostile(e.faction, other.faction)) continue;
      const d = distance(e.pos, other.pos);
      if (d < bestD) {
        best = other;
        bestD = d;
      }
    }
    return best;
  }

  enemiesOf(faction: Faction): Entity[] {
    return this.entities.filter(
      (e) => e instanceof Combatant && !e.dead && isHostile(faction, e.faction)
    );
  }

  // ---- SkillFx interface ----

  spawnProjectile(p: Projectile): void {
    this.spawn(p);
  }

  spawnFx(kind: string, at: Vec2, radius: number, color: string): void {
    this.spawn(new Effect(kind as EffectKind, { ...at }, radius, color));
  }

  areaBurst(
    center: Vec2,
    radius: number,
    baseByType: Partial<Record<DamageType, number>>,
    caster: Caster
  ): number {
    let hits = 0;
    for (const e of this.entities) {
      if (!(e instanceof Combatant) || e.dead) continue;
      if (!isHostile(caster.faction, e.faction)) continue;
      if (distance(center, e.pos) <= radius + e.radius) {
        const dmg = buildDamage(baseByType, caster.stats);
        e.receiveDamage(dmg, this);
        hits++;
      }
    }
    return hits;
  }

  meleeArc(
    caster: Caster,
    angle: number,
    arc: number,
    range: number,
    baseByType: Partial<Record<DamageType, number>>
  ): number {
    let hits = 0;
    for (const e of this.entities) {
      if (!(e instanceof Combatant) || e.dead) continue;
      if (!isHostile(caster.faction, e.faction)) continue;
      const d = distance(caster.pos, e.pos);
      if (d > range + e.radius) continue;
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

  pushFloatingText(text: string, pos: Vec2, color: string): void {
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

  update(dt: number): void {
    this.time += dt;

    // Update all entities.
    for (const e of this.entities) {
      if (e.dead) continue;
      e.update(dt, this);
    }

    // Tick DoTs on all combatants.
    for (const e of this.entities) {
      if (e instanceof Combatant && !e.dead) tickDots(e, dt, this);
    }

    // Separate overlapping combatants a little to avoid stacking.
    this.resolveSoftCollisions();

    // Handle deaths (XP, loot) for enemies that died this frame.
    for (const e of this.entities) {
      if (e instanceof Enemy && e.dead && !e.awardedDeath) {
        e.awardedDeath = true;
        if (this.onEnemyKilled) this.onEnemyKilled(e);
        if (e.kind === "boss" && this.onBossKilled) this.onBossKilled();
      }
    }

    // Player death.
    if (this.player && this.player.dead) {
      if (this.onPlayerDeath) this.onPlayerDeath();
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

  private resolveSoftCollisions(): void {
    const combs = this.entities.filter(
      (e): e is Combatant => e instanceof Combatant && !e.dead
    );
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

  makeEnemyRangedAttack(from: Vec2, to: Vec2, damage: number): void {
    const dir = normalize({ x: to.x - from.x, y: to.y - from.y });
    const packet: DamagePacket = {
      physical: 0,
      fire: damage,
      cold: 0,
      lightning: 0,
      isCrit: false,
    };
    this.spawn(
      new Projectile({
        pos: { ...from },
        dir,
        speed: 320,
        damage: packet,
        faction: "enemy",
        color: "#b06fd4",
        radius: 7,
        maxRange: 340,
      })
    );
  }

  // ---- Rendering ----

  draw(ctx: CanvasRenderingContext2D, cam: Camera): void {
    // Sort by y for a pseudo-depth ordering.
    const drawList = [...this.entities].sort((a, b) => a.pos.y - b.pos.y);
    for (const e of drawList) {
      if (e.dead && e !== this.player) continue;
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

function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
