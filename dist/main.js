// Aetherfall entry point. Wires the canvas + UI overlay and boots the Game.
import { Game } from "./game/game.js";
function boot() {
    const canvas = document.getElementById("game");
    const uiRoot = document.getElementById("ui-root");
    if (!canvas || !uiRoot) {
        console.error("Aetherfall: missing #game canvas or #ui-root element");
        return;
    }
    const game = new Game(canvas, uiRoot);
    game.boot();
}
window.addEventListener("DOMContentLoaded", boot);
//# sourceMappingURL=main.js.map