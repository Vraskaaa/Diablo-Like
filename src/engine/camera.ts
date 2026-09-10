// A simple 2D camera that follows a world-space target and converts between
// world and screen coordinates.

import { Vec2, vec2, lerp } from "./math.js";

export class Camera {
  pos: Vec2 = vec2(0, 0); // world-space center of the view
  viewWidth: number;
  viewHeight: number;

  constructor(viewWidth: number, viewHeight: number) {
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
  }

  /** Smoothly follow a world-space point. */
  follow(target: Vec2, smoothing = 0.15): void {
    this.pos.x = lerp(this.pos.x, target.x, smoothing);
    this.pos.y = lerp(this.pos.y, target.y, smoothing);
  }

  snapTo(target: Vec2): void {
    this.pos.x = target.x;
    this.pos.y = target.y;
  }

  worldToScreen(world: Vec2): Vec2 {
    return {
      x: world.x - this.pos.x + this.viewWidth / 2,
      y: world.y - this.pos.y + this.viewHeight / 2,
    };
  }

  screenToWorld(screen: Vec2): Vec2 {
    return {
      x: screen.x + this.pos.x - this.viewWidth / 2,
      y: screen.y + this.pos.y - this.viewHeight / 2,
    };
  }
}
