// Aetherfall entry point. Wires the canvas + UI overlay and boots the Game.

import { Game } from "./game/game.js";

// Bump this on every meaningful change. It is logged on boot so you can confirm
// (in the browser console) that fresh code is actually running and not a stale
// cached bundle. If the console does not show the latest version after a pull,
// do a hard refresh (Ctrl/Cmd+Shift+R) to clear the cached ES modules.
export const BUILD_VERSION = "2 (crafting-fix)";

function boot(): void {
  console.log(`Aetherfall build ${BUILD_VERSION}`);
  const canvas = document.getElementById("game") as HTMLCanvasElement | null;
  const uiRoot = document.getElementById("ui-root") as HTMLElement | null;
  if (!canvas || !uiRoot) {
    console.error("Aetherfall: missing #game canvas or #ui-root element");
    return;
  }

  const game = new Game(canvas, uiRoot);
  game.boot();
}

window.addEventListener("DOMContentLoaded", boot);
