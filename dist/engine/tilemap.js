// A tile-based world map with simple collision and a procedurally decorated
// look. Tiles are large (world units) and drawn relative to the camera.
import { RNG } from "./rng.js";
import { vec2 } from "./math.js";
export const TILE_SIZE = 64;
export var TileType;
(function (TileType) {
    TileType[TileType["Floor"] = 0] = "Floor";
    TileType[TileType["Wall"] = 1] = "Wall";
    TileType[TileType["Rubble"] = 2] = "Rubble";
    TileType[TileType["Water"] = 3] = "Water";
})(TileType || (TileType = {}));
export function tileAt(map, tx, ty) {
    if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height)
        return TileType.Wall;
    return map.tiles[ty * map.width + tx];
}
export function isBlocked(map, worldX, worldY) {
    const tx = Math.floor(worldX / TILE_SIZE);
    const ty = Math.floor(worldY / TILE_SIZE);
    const t = tileAt(map, tx, ty);
    return t === TileType.Wall || t === TileType.Water;
}
/**
 * Generate a bounded arena-style map: solid wall border, open interior with a
 * few scattered wall clusters and decorative rubble. Uses a seeded RNG so the
 * same seed always yields the same layout (cosmetic determinism).
 */
export function generateArena(width, height, seed) {
    const rng = new RNG(seed);
    const tiles = new Array(width * height).fill(TileType.Floor);
    const set = (x, y, t) => {
        if (x >= 0 && y >= 0 && x < width && y < height)
            tiles[y * width + x] = t;
    };
    // Border walls.
    for (let x = 0; x < width; x++) {
        set(x, 0, TileType.Wall);
        set(x, height - 1, TileType.Wall);
    }
    for (let y = 0; y < height; y++) {
        set(0, y, TileType.Wall);
        set(width - 1, y, TileType.Wall);
    }
    // Scatter a handful of wall pillars/clusters, avoiding the center spawn area.
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    const clusterCount = Math.floor((width * height) / 90);
    for (let i = 0; i < clusterCount; i++) {
        const px = rng.int(2, width - 3);
        const py = rng.int(2, height - 3);
        if (Math.abs(px - cx) < 3 && Math.abs(py - cy) < 3)
            continue; // keep spawn clear
        const size = rng.int(1, 2);
        for (let dx = 0; dx < size; dx++) {
            for (let dy = 0; dy < size; dy++) {
                set(px + dx, py + dy, TileType.Wall);
            }
        }
    }
    // Decorative rubble on some floor tiles.
    for (let i = 0; i < tiles.length; i++) {
        if (tiles[i] === TileType.Floor && rng.chance(0.06))
            tiles[i] = TileType.Rubble;
    }
    return {
        width,
        height,
        tiles,
        spawn: vec2(cx * TILE_SIZE + TILE_SIZE / 2, cy * TILE_SIZE + TILE_SIZE / 2),
    };
}
const FLOOR_COLORS = ["#171c24", "#1a2029", "#151a21"];
export function drawTileMap(ctx, map, cam) {
    // Only draw tiles within the camera view (with a margin).
    const halfW = cam.viewWidth / 2;
    const halfH = cam.viewHeight / 2;
    const minTx = Math.max(0, Math.floor((cam.pos.x - halfW) / TILE_SIZE) - 1);
    const maxTx = Math.min(map.width - 1, Math.ceil((cam.pos.x + halfW) / TILE_SIZE) + 1);
    const minTy = Math.max(0, Math.floor((cam.pos.y - halfH) / TILE_SIZE) - 1);
    const maxTy = Math.min(map.height - 1, Math.ceil((cam.pos.y + halfH) / TILE_SIZE) + 1);
    for (let ty = minTy; ty <= maxTy; ty++) {
        for (let tx = minTx; tx <= maxTx; tx++) {
            const t = tileAt(map, tx, ty);
            const world = vec2(tx * TILE_SIZE, ty * TILE_SIZE);
            const s = cam.worldToScreen(world);
            switch (t) {
                case TileType.Floor:
                    ctx.fillStyle = FLOOR_COLORS[(tx * 31 + ty * 17) % FLOOR_COLORS.length];
                    ctx.fillRect(s.x, s.y, TILE_SIZE, TILE_SIZE);
                    break;
                case TileType.Rubble:
                    ctx.fillStyle = "#1a2029";
                    ctx.fillRect(s.x, s.y, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = "#2a323d";
                    ctx.fillRect(s.x + 18, s.y + 22, 10, 8);
                    ctx.fillRect(s.x + 36, s.y + 40, 8, 6);
                    break;
                case TileType.Water:
                    ctx.fillStyle = "#12314a";
                    ctx.fillRect(s.x, s.y, TILE_SIZE, TILE_SIZE);
                    break;
                case TileType.Wall:
                    ctx.fillStyle = "#2b333f";
                    ctx.fillRect(s.x, s.y, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = "#3a4553";
                    ctx.fillRect(s.x + 3, s.y + 3, TILE_SIZE - 6, TILE_SIZE - 6);
                    ctx.fillStyle = "#222932";
                    ctx.fillRect(s.x + 3, s.y + TILE_SIZE - 10, TILE_SIZE - 6, 7);
                    break;
            }
            // Subtle grid line.
            ctx.strokeStyle = "rgba(0,0,0,0.25)";
            ctx.lineWidth = 1;
            ctx.strokeRect(s.x + 0.5, s.y + 0.5, TILE_SIZE, TILE_SIZE);
        }
    }
}
//# sourceMappingURL=tilemap.js.map