// Base entity for all moving/interacting things in the world.
// We keep this deliberately lightweight (no full ECS) — an inheritance-based
// entity model is plenty for a game of this scope and is easier to read.
import { vec2 } from "./math.js";
let NEXT_ID = 1;
export class Entity {
    id;
    pos;
    vel = vec2(0, 0);
    radius;
    faction;
    dead = false;
    /** Facing angle in radians, used for directional rendering/attacks. */
    facing = 0;
    constructor(pos, radius, faction) {
        this.id = NEXT_ID++;
        this.pos = { x: pos.x, y: pos.y };
        this.radius = radius;
        this.faction = faction;
    }
}
//# sourceMappingURL=entity.js.map