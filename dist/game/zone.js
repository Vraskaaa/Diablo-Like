// Zone: defines the playable area, its wave-based spawning, and the boss
// encounter. A Zone drives the pacing of the vertical slice: clear escalating
// waves of enemies, then face the boss.
import { Enemy } from "./entities/enemy.js";
import { TILE_SIZE, TileType, tileAt } from "../engine/tilemap.js";
import { distance, vec2 } from "../engine/math.js";
export const CRYPT_ZONE = {
    name: "The Hollow Crypts",
    waves: [
        { label: "Wave 1 — Stirring Dead", enemyLevel: 1, groups: [{ kind: "grunt", count: 5 }] },
        {
            label: "Wave 2 — Restless Horde",
            enemyLevel: 2,
            groups: [
                { kind: "grunt", count: 6 },
                { kind: "caster", count: 1 },
            ],
        },
        {
            label: "Wave 3 — Blighted Ranks",
            enemyLevel: 3,
            groups: [
                { kind: "grunt", count: 6 },
                { kind: "brute", count: 1 },
                { kind: "caster", count: 2 },
            ],
        },
        {
            label: "Wave 4 — The Vanguard",
            enemyLevel: 4,
            groups: [
                { kind: "grunt", count: 8 },
                { kind: "brute", count: 2 },
                { kind: "caster", count: 2 },
            ],
        },
        {
            label: "Wave 5 — Malgareth, the Hollow King",
            enemyLevel: 5,
            groups: [{ kind: "boss", count: 1 }],
            isBossWave: true,
        },
    ],
};
export class ZoneRunner {
    world;
    def;
    currentWave = -1;
    waveActive = false;
    cleared = false;
    /** Seconds to wait between clearing a wave and starting the next. */
    interWaveDelay = 3;
    delayTimer = 0;
    /** Callback fired when a new wave starts (for UI banners). */
    onWaveStart;
    onZoneCleared;
    constructor(world, def) {
        this.world = world;
        this.def = def;
    }
    get totalWaves() {
        return this.def.waves.length;
    }
    get zoneName() {
        return this.def.name;
    }
    /** Begin the first wave. */
    start() {
        this.delayTimer = 1.5;
    }
    update(dt) {
        if (this.cleared)
            return;
        if (this.waveActive) {
            // Wave is cleared when no living enemies remain.
            const remaining = this.world.entities.filter((e) => e instanceof Enemy && !e.dead).length;
            if (remaining === 0) {
                this.waveActive = false;
                if (this.currentWave >= this.def.waves.length - 1) {
                    this.cleared = true;
                    if (this.onZoneCleared)
                        this.onZoneCleared();
                    return;
                }
                this.delayTimer = this.interWaveDelay;
            }
            return;
        }
        // Between waves: count down then spawn the next.
        this.delayTimer -= dt;
        if (this.delayTimer <= 0) {
            this.spawnNextWave();
        }
    }
    enemiesRemaining() {
        return this.world.entities.filter((e) => e instanceof Enemy && !e.dead).length;
    }
    spawnNextWave() {
        this.currentWave++;
        if (this.currentWave >= this.def.waves.length) {
            this.cleared = true;
            return;
        }
        const wave = this.def.waves[this.currentWave];
        for (const group of wave.groups) {
            for (let i = 0; i < group.count; i++) {
                const pos = this.pickSpawnPoint();
                const enemy = new Enemy(group.kind, pos, wave.enemyLevel);
                // Caster enemies fire projectiles through the world.
                if (group.kind === "caster") {
                    enemy.rangedAttack = (from, to, damage) => this.world.makeEnemyRangedAttack(from, to, damage);
                }
                this.world.spawn(enemy);
            }
        }
        this.waveActive = true;
        if (this.onWaveStart) {
            this.onWaveStart(wave, this.currentWave, this.def.waves.length);
        }
    }
    /** Pick a walkable spawn point away from the player, near the map edges. */
    pickSpawnPoint() {
        const map = this.world.map;
        const player = this.world.player;
        for (let attempt = 0; attempt < 60; attempt++) {
            const tx = this.world.rng.int(1, map.width - 2);
            const ty = this.world.rng.int(1, map.height - 2);
            if (tileAt(map, tx, ty) !== TileType.Floor && tileAt(map, tx, ty) !== TileType.Rubble) {
                continue;
            }
            const pos = vec2(tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE + TILE_SIZE / 2);
            if (!player || distance(pos, player.pos) > 260)
                return pos;
        }
        // Fallback: a corner.
        return vec2(TILE_SIZE * 2, TILE_SIZE * 2);
    }
}
//# sourceMappingURL=zone.js.map