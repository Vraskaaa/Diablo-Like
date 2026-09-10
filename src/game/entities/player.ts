// The player entity. Ties together the character model (class, attributes,
// level, equipment), the skill system, movement, and Summoner minion control.
//
// The player does NOT own input directly; the Game layer feeds it intents
// (moveTarget, aim, requested skill index) so the same entity could be reused
// for replays/AI if desired.

import { World } from "../../engine/entity.js";
import { Camera } from "../../engine/camera.js";
import { Vec2, distance, normalize, scale, add } from "../../engine/math.js";
import { Combatant } from "./combatant.js";
import { Minion, MinionKind, MINION_CONFIGS } from "./minion.js";
import { StatKey } from "../stats.js";
import { ClassDef } from "../classes.js";
import { Skill, SkillContext, SkillFx, Caster } from "../skills.js";

export interface PlayerModel {
  classDef: ClassDef;
  stats: Record<StatKey, number>;
  level: number;
}

export class Player extends Combatant implements Caster {
  classDef: ClassDef;
  minionCount = 0;
  minionCap = 6;

  /** Movement destination (click-to-move); null = idle. */
  moveTarget: Vec2 | null = null;
  /** Current aim point in world space (follows mouse). */
  aim: Vec2;

  /** Per-skill cooldown timers keyed by skill id. */
  private cooldowns = new Map<string, number>();
  /** Global cast lockout (cast time) remaining. */
  private castLock = 0;

  /** Owned minions (for cap + command). */
  minions: Minion[] = [];

  private fx: SkillFx;
  requestSummon: (kind: string, at: Vec2, world: World) => void;
  commandMinions: (target: Vec2, world: World) => void;

  constructor(model: PlayerModel, pos: Vec2, fx: SkillFx) {
    super(pos, 14, "player", model.stats);
    this.classDef = model.classDef;
    this.level = model.level;
    this.aim = { x: pos.x + 10, y: pos.y };
    this.fx = fx;
    this.resources.fill(model.stats);

    this.requestSummon = (kind, at, world) => this.summon(kind as MinionKind, at, world);
    this.commandMinions = (target, world) => {
      for (const m of this.minions) if (!m.dead) m.commandTarget = { ...target };
    };
  }

  /** Refresh stats (e.g. after equipping gear) and clamp resources. */
  setStats(stats: Record<StatKey, number>): void {
    this.stats = stats;
    this.resources.clampTo(stats);
  }

  getCooldown(skillId: string): number {
    return Math.max(0, this.cooldowns.get(skillId) ?? 0);
  }

  isCasting(): boolean {
    return this.castLock > 0;
  }

  update(dt: number, world: World): void {
    this.updateCommon(dt, world);

    // Tick cooldowns.
    for (const [id, t] of this.cooldowns) {
      if (t > 0) this.cooldowns.set(id, Math.max(0, t - dt));
    }
    if (this.castLock > 0) this.castLock = Math.max(0, this.castLock - dt);

    // Prune dead minions.
    if (this.minions.some((m) => m.dead)) {
      this.minions = this.minions.filter((m) => !m.dead);
      this.minionCount = this.minions.length;
    }

    // Movement (click-to-move / hold), suppressed while casting a rooted skill.
    if (this.moveTarget && this.castLock <= 0) {
      const d = distance(this.pos, this.moveTarget);
      if (d > 6) {
        this.moveToward(this.moveTarget, this.stats.moveSpeed, dt, world);
      } else {
        this.moveTarget = null;
      }
    }
  }

  /** Attempt to cast a skill toward the current aim. Returns true if cast. */
  tryCast(skill: Skill, world: World): boolean {
    if (this.castLock > 0) return false;
    if (this.getCooldown(skill.id) > 0) return false;
    if (!this.resources.canAfford(skill.manaCost)) return false;

    this.resources.spendMana(skill.manaCost);

    // Attack skills have their cast time reduced by attack speed.
    const effectiveCast = skill.isAttack
      ? skill.castTime / Math.max(0.3, this.stats.attackSpeed)
      : skill.castTime;
    this.castLock = effectiveCast;
    if (skill.cooldown > 0) this.cooldowns.set(skill.id, skill.cooldown);

    // Stop moving to cast (except mobility skills, which handle their own move).
    if (skill.targeting !== "point" || skill.isAttack) {
      this.moveTarget = null;
    }

    const ctx: SkillContext = {
      caster: this,
      target: { ...this.aim },
      world,
      fx: this.fx,
    };
    skill.cast(ctx);
    return true;
  }

  private summon(kind: MinionKind, at: Vec2, world: World): void {
    if (this.minions.length >= this.minionCap) {
      // Replace the oldest minion when at cap (FIFO).
      const oldest = this.minions.shift();
      if (oldest) oldest.dead = true;
    }
    const cfg = MINION_CONFIGS[kind];
    // Golems count differently but we keep a single shared cap for simplicity.
    const spawnPos = world.isBlocked(at.x, at.y) ? { ...this.pos } : { ...at };
    const minion = new Minion(kind, spawnPos, this);
    minion.onDeath = this.minionOnDeath;
    this.minions.push(minion);
    this.minionCount = this.minions.length;
    world.spawn(minion);
  }

  private minionOnDeath = (): void => {
    // Count is reconciled in update()'s prune step.
  };

  draw(ctx: CanvasRenderingContext2D, cam: Camera): void {
    const s = cam.worldToScreen(this.pos);

    // Move-target marker.
    if (this.moveTarget) {
      const m = cam.worldToScreen(this.moveTarget);
      ctx.strokeStyle = "rgba(217,180,91,0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.save();
    // Body
    ctx.fillStyle = this.hitFlash > 0 ? "#ffffff" : this.classDef.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f2d488";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Facing / aim indicator.
    const aimAngle = Math.atan2(this.aim.y - this.pos.y, this.aim.x - this.pos.x);
    ctx.strokeStyle = "#f2d488";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x + Math.cos(aimAngle) * (this.radius + 8), s.y + Math.sin(aimAngle) * (this.radius + 8));
    ctx.stroke();
    ctx.restore();

    this.drawHealthBar(ctx, cam, 44);
  }
}
