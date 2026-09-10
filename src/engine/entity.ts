// Base entity for all moving/interacting things in the world.
// We keep this deliberately lightweight (no full ECS) — an inheritance-based
// entity model is plenty for a game of this scope and is easier to read.

import { Vec2, vec2 } from "./math.js";
import { Camera } from "./camera.js";

export type Faction = "player" | "ally" | "enemy" | "neutral";

let NEXT_ID = 1;

export abstract class Entity {
  readonly id: number;
  pos: Vec2;
  vel: Vec2 = vec2(0, 0);
  radius: number;
  faction: Faction;
  dead = false;
  /** Facing angle in radians, used for directional rendering/attacks. */
  facing = 0;

  constructor(pos: Vec2, radius: number, faction: Faction) {
    this.id = NEXT_ID++;
    this.pos = { x: pos.x, y: pos.y };
    this.radius = radius;
    this.faction = faction;
  }

  /** Advance simulation by a fixed dt (seconds). */
  abstract update(dt: number, world: World): void;

  /** Draw in screen space using the camera transform. */
  abstract draw(ctx: CanvasRenderingContext2D, cam: Camera): void;
}

// Forward-declared shape of the world passed to entities. The concrete World
// class lives in the game layer; entities only need this minimal surface.
export interface World {
  entities: Entity[];
  spawn(e: Entity): void;
  isBlocked(worldX: number, worldY: number): boolean;
  time: number; // total elapsed seconds
  /** Convenience queries. */
  nearestEnemyOf(e: Entity, maxDist: number): Entity | null;
  enemiesOf(faction: Faction): Entity[];
}
