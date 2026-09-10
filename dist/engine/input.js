// Centralized keyboard + mouse input state.
// Tracks "held" keys and edge events (just-pressed) so systems can poll cleanly.
import { vec2 } from "./math.js";
export class Input {
    held = new Set();
    justPressed = new Set();
    justReleased = new Set();
    /** Mouse position in canvas (screen) coordinates. */
    mouse = vec2(0, 0);
    mouseDown = false;
    mouseJustDown = false;
    rightMouseDown = false;
    rightMouseJustDown = false;
    canvas;
    constructor(canvas) {
        this.canvas = canvas;
        window.addEventListener("keydown", (e) => {
            // Avoid capturing keys while typing in an input field.
            if (isTextField(e.target))
                return;
            const k = e.key.toLowerCase();
            if (!this.held.has(k))
                this.justPressed.add(k);
            this.held.add(k);
            if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) {
                e.preventDefault();
            }
        });
        window.addEventListener("keyup", (e) => {
            const k = e.key.toLowerCase();
            this.held.delete(k);
            this.justReleased.add(k);
        });
        canvas.addEventListener("mousemove", (e) => this.updateMouse(e));
        canvas.addEventListener("mousedown", (e) => {
            this.updateMouse(e);
            if (e.button === 0) {
                if (!this.mouseDown)
                    this.mouseJustDown = true;
                this.mouseDown = true;
            }
            else if (e.button === 2) {
                if (!this.rightMouseDown)
                    this.rightMouseJustDown = true;
                this.rightMouseDown = true;
            }
        });
        window.addEventListener("mouseup", (e) => {
            if (e.button === 0)
                this.mouseDown = false;
            else if (e.button === 2)
                this.rightMouseDown = false;
        });
        // Disable the context menu so right-click can be a game action.
        canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    }
    updateMouse(e) {
        const rect = this.canvas.getBoundingClientRect();
        // Account for CSS scaling of the canvas.
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        this.mouse.x = (e.clientX - rect.left) * scaleX;
        this.mouse.y = (e.clientY - rect.top) * scaleY;
    }
    isDown(key) {
        return this.held.has(key.toLowerCase());
    }
    wasPressed(key) {
        return this.justPressed.has(key.toLowerCase());
    }
    wasReleased(key) {
        return this.justReleased.has(key.toLowerCase());
    }
    /** Clear per-frame edge state. Call at the very end of each frame. */
    postUpdate() {
        this.justPressed.clear();
        this.justReleased.clear();
        this.mouseJustDown = false;
        this.rightMouseJustDown = false;
    }
}
function isTextField(target) {
    if (!(target instanceof HTMLElement))
        return false;
    const tag = target.tagName.toLowerCase();
    return tag === "input" || tag === "textarea" || target.isContentEditable;
}
//# sourceMappingURL=input.js.map