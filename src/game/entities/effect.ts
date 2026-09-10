// Transient visual effects: expanding rings, slashes, explosions, sparks.
// Purely cosmetic; they have a short lifetime and no gameplay interaction.

import { Entity, World } from "../../engine/entity.js";
import { Camera } from "../../engine/camera.js";
import { Vec2 } from "../../engine/math.js";

export type EffectKind =
  | "arc"
  | "slam"
  | "shout"
  | "whirl"
  | "nova"
  | "explosion"
  | "dash"
  | "spark"
  | "blink"
  | "bolt-line"
  | "levelup";

export class Effect extends Entity {
  kind: EffectKind;
  age = 0;
  life: number;
  maxRadius: number;
  color: string;

  constructor(kind: EffectKind, at: Vec2, radius: number, color: string) {
    super(at, 1, "neutral");
    this.kind = kind;
    this.maxRadius = radius;
    this.color = color;
    this.life = kind === "explosion" || kind === "nova" ? 0.35 : 0.25;
    if (kind === "levelup") this.life = 0.9;
  }

  update(dt: number, _world: World): void {
    this.age += dt;
    if (this.age >= this.life) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D, cam: Camera): void {
    const s = cam.worldToScreen(this.pos);
    const t = this.age / this.life; // 0..1
    ctx.save();
    ctx.globalAlpha = 1 - t;
    const r = this.maxRadius * (0.3 + t * 0.7);

    switch (this.kind) {
      case "nova":
      case "shout":
      case "whirl":
      case "explosion":
      case "arc":
      case "slam":
      case "levelup":
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4 * (1 - t) + 1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case "dash":
      case "blink":
      case "spark":
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r * 0.6, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "bolt-line":
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 6 * (1 - t), 0, Math.PI * 2);
        ctx.fill();
        break;
    }
    ctx.restore();
  }
}
