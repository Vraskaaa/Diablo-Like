// A simple 2D camera that follows a world-space target and converts between
// world and screen coordinates.
import { vec2, lerp } from "./math.js";
export class Camera {
    pos = vec2(0, 0); // world-space center of the view
    viewWidth;
    viewHeight;
    constructor(viewWidth, viewHeight) {
        this.viewWidth = viewWidth;
        this.viewHeight = viewHeight;
    }
    /** Smoothly follow a world-space point. */
    follow(target, smoothing = 0.15) {
        this.pos.x = lerp(this.pos.x, target.x, smoothing);
        this.pos.y = lerp(this.pos.y, target.y, smoothing);
    }
    snapTo(target) {
        this.pos.x = target.x;
        this.pos.y = target.y;
    }
    worldToScreen(world) {
        return {
            x: world.x - this.pos.x + this.viewWidth / 2,
            y: world.y - this.pos.y + this.viewHeight / 2,
        };
    }
    screenToWorld(screen) {
        return {
            x: screen.x + this.pos.x - this.viewWidth / 2,
            y: screen.y + this.pos.y - this.viewHeight / 2,
        };
    }
}
//# sourceMappingURL=camera.js.map