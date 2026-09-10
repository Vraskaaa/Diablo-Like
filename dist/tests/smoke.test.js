// Headless smoke test: exercises the full game simulation WITHOUT a browser by
// stubbing the minimal DOM/canvas/localStorage surface the code touches. This
// verifies the Game boots, a run starts, waves spawn, the player can cast, and
// combat resolves — catching integration bugs the type-checker cannot.
//
// Run: unset NODE_OPTIONS; tsc && node dist/tests/smoke.test.js
import { GameWorld } from "../game/world.js";
import { generateArena } from "../engine/tilemap.js";
import { Player } from "../game/entities/player.js";
import { Character } from "../game/character.js";
import { ZoneRunner, CRYPT_ZONE } from "../game/zone.js";
import { getSkill } from "../game/skills.js";
import { Enemy } from "../game/entities/enemy.js";
let failures = 0;
function assert(cond, msg) {
    if (!cond) {
        console.error("  ✗ FAIL:", msg);
        failures++;
    }
    else {
        console.log("  ✓", msg);
    }
}
console.log("== Headless world simulation ==");
{
    const map = generateArena(24, 18, 1337);
    const world = new GameWorld(map, 42);
    const character = new Character("Smoke", "warrior");
    const stats = character.computeStats();
    const player = new Player({ classDef: character.classDef, stats, level: 1 }, { ...map.spawn }, world);
    player.resources.fill(stats);
    world.player = player;
    world.spawn(player);
    let killed = 0;
    world.onEnemyKilled = () => killed++;
    const zone = new ZoneRunner(world, CRYPT_ZONE);
    zone.start();
    // spawn() defers additions; they flush on the next update() tick.
    world.update(1 / 60);
    assert(world.entities.some((e) => e === player), "Player is present in the world after the first update tick");
    // Simulate ~8 seconds at 60fps. The player auto-attacks the nearest enemy
    // with its first skill each frame to exercise combat + spawning.
    const dt = 1 / 60;
    let framesWithEnemies = 0;
    const attackSkill = getSkill(character.classDef.skills[0]);
    for (let i = 0; i < 60 * 8; i++) {
        zone.update(dt);
        // Aim at the nearest enemy and attack.
        const nearest = world.entities.find((e) => e instanceof Enemy && !e.dead);
        if (nearest) {
            player.aim = { ...nearest.pos };
            player.tryCast(attackSkill, world);
            framesWithEnemies++;
        }
        world.update(dt);
    }
    assert(framesWithEnemies > 0, "Enemies spawned and were present during the run");
    assert(killed > 0, `Player killed at least one enemy (killed=${killed})`);
    assert(player.resources.isAlive(), "Player survived the smoke run");
    assert(world.time > 7, "Simulation advanced its clock");
}
console.log("== Summoner minions ==");
{
    const map = generateArena(24, 18, 7);
    const world = new GameWorld(map, 7);
    const character = new Character("Necro", "summoner");
    const stats = character.computeStats();
    const player = new Player({ classDef: character.classDef, stats, level: 5 }, { ...map.spawn }, world);
    player.resources.fill(stats);
    world.player = player;
    world.spawn(player);
    // Cast Raise Skeleton a few times (mana permitting).
    const raise = getSkill("raise_skeleton");
    player.aim = { x: map.spawn.x + 40, y: map.spawn.y };
    for (let i = 0; i < 5; i++) {
        // Refill mana so the cap (not mana) is what limits minions here.
        player.resources.fill(stats);
        player.tryCast(raise, world);
        // Advance a frame so deferred spawns flush and cast lock clears.
        for (let f = 0; f < 40; f++)
            world.update(1 / 60);
    }
    assert(player.minions.length > 0, `Summoner raised minions (count=${player.minions.length})`);
    assert(player.minions.length <= player.minionCap, "Minion count respects the cap");
}
console.log("");
if (failures > 0) {
    console.error(`RESULT: ${failures} assertion(s) FAILED`);
    globalThis.process?.exit(1);
    throw new Error(`${failures} assertion(s) failed`);
}
else {
    console.log("RESULT: all smoke assertions passed ✓");
}
//# sourceMappingURL=smoke.test.js.map