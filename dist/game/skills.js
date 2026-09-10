// The skill system.
//
// A Skill is data + a cast() behavior. Skills read the caster's computed stats
// so that gear, attributes, and crafting all flow into skill power automatically.
// Damage is deterministic (crit is the only roll, handled in damage.ts).
import { normalize, add, scale, distance, angleTo } from "../engine/math.js";
import { buildDamage } from "./damage.js";
import { Projectile } from "./entities/projectile.js";
import { Combatant } from "./entities/combatant.js";
import { isHostile } from "./entities/projectile.js";
// -------- helpers --------
function aimDir(caster, target) {
    return normalize({ x: target.x - caster.pos.x, y: target.y - caster.pos.y });
}
/** Spread N projectiles evenly across a total angle (radians). */
function spreadAngles(count, spread, baseAngle) {
    if (count <= 1)
        return [baseAngle];
    const out = [];
    const start = baseAngle - spread / 2;
    const stepA = spread / (count - 1);
    for (let i = 0; i < count; i++)
        out.push(start + stepA * i);
    return out;
}
// ============================================================
// WARRIOR SKILLS
// ============================================================
const cleave = {
    id: "cleave",
    name: "Cleave",
    description: "Swing in a wide arc, striking all enemies in front of you with physical damage.",
    manaCost: 0,
    cooldown: 0,
    castTime: 0.45,
    targeting: "direction",
    icon: "🪓",
    isAttack: true,
    cast: ({ caster, target, fx }) => {
        const ang = angleTo(caster.pos, target);
        caster.facing = ang;
        fx.meleeArc(caster, ang, Math.PI * 0.9, 78 * (1 + caster.stats.areaOfEffect), {
            physical: 14 + caster.level * 3,
        });
        fx.spawnFx("arc", caster.pos, 78, "#e08b5b");
    },
};
const shield_slam = {
    id: "shield_slam",
    name: "Shield Slam",
    description: "Bash forward, dealing heavy physical damage to a single target and knocking it back.",
    manaCost: 8,
    cooldown: 3,
    castTime: 0.5,
    targeting: "direction",
    icon: "🛡️",
    isAttack: true,
    cast: ({ caster, target, fx }) => {
        const ang = angleTo(caster.pos, target);
        caster.facing = ang;
        fx.meleeArc(caster, ang, Math.PI * 0.4, 70, { physical: 30 + caster.level * 5 });
        fx.spawnFx("slam", add(caster.pos, scale(aimDir(caster, target), 50)), 40, "#f2d488");
    },
};
const war_cry = {
    id: "war_cry",
    name: "War Cry",
    description: "Unleash a rallying shout that damages nearby foes and briefly bolsters you.",
    manaCost: 15,
    cooldown: 8,
    castTime: 0.4,
    targeting: "self",
    icon: "📢",
    isAttack: false,
    cast: ({ caster, fx }) => {
        fx.areaBurst(caster.pos, 140 * (1 + caster.stats.areaOfEffect), { physical: 10 + caster.level * 2 }, caster);
        fx.spawnFx("shout", caster.pos, 140, "#f2d488");
        // Small self-heal as a rally.
        caster.resources.heal(caster.stats.maxHealth * 0.08, caster.stats);
    },
};
const whirlwind = {
    id: "whirlwind",
    name: "Whirlwind",
    description: "Spin violently, hitting everything around you. High mana cost.",
    manaCost: 20,
    cooldown: 5,
    castTime: 0.6,
    targeting: "self",
    icon: "🌀",
    isAttack: true,
    cast: ({ caster, fx }) => {
        fx.areaBurst(caster.pos, 100 * (1 + caster.stats.areaOfEffect), { physical: 22 + caster.level * 4 }, caster);
        fx.spawnFx("whirl", caster.pos, 100, "#e08b5b");
    },
};
// ============================================================
// RANGER SKILLS
// ============================================================
const power_shot = {
    id: "power_shot",
    name: "Power Shot",
    description: "Fire a piercing arrow that impales enemies in a line.",
    manaCost: 0,
    cooldown: 0,
    castTime: 0.35,
    targeting: "point",
    icon: "🏹",
    isAttack: true,
    cast: ({ caster, target, fx }) => {
        const dir = aimDir(caster, target);
        const dmg = buildDamage({ physical: 12 + caster.level * 3 }, caster.stats);
        fx.spawnProjectile(new Projectile({
            pos: { ...caster.pos },
            dir,
            speed: 560,
            damage: dmg,
            faction: caster.faction,
            color: "#a9e08b",
            pierce: 2 + caster.stats.projectileCount,
            maxRange: 760,
        }));
    },
};
const multishot = {
    id: "multishot",
    name: "Multishot",
    description: "Loose a fan of arrows in a cone. Additional Projectiles add more arrows.",
    manaCost: 10,
    cooldown: 0,
    castTime: 0.5,
    targeting: "point",
    icon: "🎯",
    isAttack: true,
    cast: ({ caster, target, fx }) => {
        const baseAngle = angleTo(caster.pos, target);
        const count = 5 + caster.stats.projectileCount;
        for (const a of spreadAngles(count, Math.PI * 0.5, baseAngle)) {
            const dir = { x: Math.cos(a), y: Math.sin(a) };
            const dmg = buildDamage({ physical: 7 + caster.level * 2 }, caster.stats);
            fx.spawnProjectile(new Projectile({
                pos: { ...caster.pos },
                dir,
                speed: 520,
                damage: dmg,
                faction: caster.faction,
                color: "#a9e08b",
                maxRange: 520,
            }));
        }
    },
};
const poison_arrow = {
    id: "poison_arrow",
    name: "Poison Arrow",
    description: "Fire a toxic arrow that deals cold-as-chaos damage and poisons on hit.",
    manaCost: 12,
    cooldown: 2,
    castTime: 0.4,
    targeting: "point",
    icon: "🟢",
    isAttack: true,
    cast: ({ caster, target, fx }) => {
        const dir = aimDir(caster, target);
        const dmg = buildDamage({ cold: 10 + caster.level * 2 }, caster.stats);
        fx.spawnProjectile(new Projectile({
            pos: { ...caster.pos },
            dir,
            speed: 500,
            damage: dmg,
            faction: caster.faction,
            color: "#5fd08b",
            maxRange: 640,
            onHit: (t) => {
                // Apply a simple poison DoT via a status hook on the target.
                applyDot(t, 3 + caster.level, 4);
            },
        }));
    },
};
const dash = {
    id: "dash",
    name: "Dash",
    description: "Quickly roll a short distance toward the cursor, evading danger.",
    manaCost: 8,
    cooldown: 2.5,
    castTime: 0.15,
    targeting: "point",
    icon: "💨",
    isAttack: false,
    cast: ({ caster, target, world, fx }) => {
        const dir = aimDir(caster, target);
        const dist = Math.min(180, distance(caster.pos, target));
        const dest = add(caster.pos, scale(dir, dist));
        if (!world.isBlocked(dest.x, dest.y)) {
            caster.pos.x = dest.x;
            caster.pos.y = dest.y;
        }
        fx.spawnFx("dash", caster.pos, 30, "#a9e08b");
    },
};
// ============================================================
// SUMMONER SKILLS
// ============================================================
const raise_skeleton = {
    id: "raise_skeleton",
    name: "Raise Skeleton",
    description: "Summon a skeletal warrior to fight for you, up to your minion cap.",
    manaCost: 14,
    cooldown: 0.4,
    castTime: 0.35,
    targeting: "point",
    icon: "💀",
    isAttack: false,
    cast: ({ caster, target, world }) => {
        if (caster.requestSummon)
            caster.requestSummon("skeleton", target, world);
    },
};
const summon_golem = {
    id: "summon_golem",
    name: "Summon Golem",
    description: "Raise a hulking stone golem — a durable tank that taunts enemies.",
    manaCost: 40,
    cooldown: 12,
    castTime: 0.6,
    targeting: "point",
    icon: "🗿",
    isAttack: false,
    cast: ({ caster, target, world }) => {
        if (caster.requestSummon)
            caster.requestSummon("golem", target, world);
    },
};
const bone_spear = {
    id: "bone_spear",
    name: "Bone Spear",
    description: "Hurl a piercing shard of bone. The Summoner's personal attack.",
    manaCost: 6,
    cooldown: 0,
    castTime: 0.4,
    targeting: "point",
    icon: "🦴",
    isAttack: true,
    cast: ({ caster, target, fx }) => {
        const dir = aimDir(caster, target);
        const dmg = buildDamage({ physical: 9 + caster.level * 2 }, caster.stats);
        fx.spawnProjectile(new Projectile({
            pos: { ...caster.pos },
            dir,
            speed: 540,
            damage: dmg,
            faction: caster.faction,
            color: "#dcd0f0",
            pierce: 1 + caster.stats.projectileCount,
            maxRange: 700,
        }));
    },
};
const command = {
    id: "command",
    name: "Command",
    description: "Order all your minions to converge and attack near the cursor.",
    manaCost: 5,
    cooldown: 1,
    castTime: 0.2,
    targeting: "point",
    icon: "❗",
    isAttack: false,
    cast: ({ caster, target, world }) => {
        if (caster.commandMinions)
            caster.commandMinions(target, world);
    },
};
// ============================================================
// ELEMENTALIST SKILLS
// ============================================================
const fireball = {
    id: "fireball",
    name: "Fireball",
    description: "Launch a fiery orb that explodes on impact for fire damage in an area.",
    manaCost: 10,
    cooldown: 0,
    castTime: 0.45,
    targeting: "point",
    icon: "🔥",
    isAttack: true,
    cast: ({ caster, target, fx }) => {
        const dir = aimDir(caster, target);
        const dmg = buildDamage({ fire: 14 + caster.level * 3 }, caster.stats);
        fx.spawnProjectile(new Projectile({
            pos: { ...caster.pos },
            dir,
            speed: 420,
            damage: dmg,
            faction: caster.faction,
            color: "#ff7a3c",
            radius: 9,
            maxRange: 620,
            onHit: (t, world) => {
                fx.areaBurst(t.pos, 70 * (1 + caster.stats.areaOfEffect), { fire: 8 + caster.level * 2 }, caster);
                fx.spawnFx("explosion", t.pos, 70, "#ff7a3c");
            },
        }));
    },
};
const frost_nova = {
    id: "frost_nova",
    name: "Frost Nova",
    description: "Erupt with a ring of ice, dealing cold damage to all nearby enemies.",
    manaCost: 18,
    cooldown: 4,
    castTime: 0.4,
    targeting: "self",
    icon: "❄️",
    isAttack: false,
    cast: ({ caster, fx }) => {
        fx.areaBurst(caster.pos, 150 * (1 + caster.stats.areaOfEffect), { cold: 16 + caster.level * 3 }, caster);
        fx.spawnFx("nova", caster.pos, 150, "#7fd0ff");
    },
};
const chain_lightning = {
    id: "chain_lightning",
    name: "Chain Lightning",
    description: "A bolt that arcs between nearby enemies, dealing lightning damage to each.",
    manaCost: 16,
    cooldown: 1.5,
    castTime: 0.45,
    targeting: "point",
    icon: "⚡",
    isAttack: true,
    cast: ({ caster, target, world, fx }) => {
        // Deterministic chain: hit nearest enemy to target, then jump to nearest
        // un-hit enemy within jump range, up to a max chain count.
        const maxJumps = 4;
        const jumpRange = 180;
        let origin = target;
        const hit = new Set();
        let prevPos = caster.pos;
        for (let i = 0; i < maxJumps; i++) {
            let best = null;
            let bestD = Infinity;
            for (const e of world.entities) {
                if (!(e instanceof Combatant) || e.dead)
                    continue;
                if (!isHostile(caster.faction, e.faction))
                    continue;
                if (hit.has(e.id))
                    continue;
                const d = distance(origin, e.pos);
                if (d < bestD && d <= jumpRange) {
                    best = e;
                    bestD = d;
                }
            }
            if (!best)
                break;
            const dmg = buildDamage({ lightning: 13 + caster.level * 3 }, caster.stats);
            best.receiveDamage(dmg, world);
            hit.add(best.id);
            fx.spawnFx("bolt-line", best.pos, 0, "#ffe98a");
            prevPos = best.pos;
            origin = best.pos;
        }
        fx.spawnFx("spark", target, 20, "#ffe98a");
    },
};
const teleport = {
    id: "teleport",
    name: "Teleport",
    description: "Blink instantly to the target location.",
    manaCost: 12,
    cooldown: 3,
    castTime: 0.1,
    targeting: "point",
    icon: "✨",
    isAttack: false,
    cast: ({ caster, target, world, fx }) => {
        if (!world.isBlocked(target.x, target.y)) {
            fx.spawnFx("blink", caster.pos, 24, "#7fd0ff");
            caster.pos.x = target.x;
            caster.pos.y = target.y;
            fx.spawnFx("blink", caster.pos, 24, "#7fd0ff");
        }
    },
};
const dotRegistry = new WeakMap();
function applyDot(target, dps, duration) {
    dotRegistry.set(target, { dps, remaining: duration });
}
/** Called each tick by the game loop for all combatants. */
export function tickDots(target, dt, world) {
    const dot = dotRegistry.get(target);
    if (!dot)
        return;
    dot.remaining -= dt;
    const damage = dot.dps * dt;
    target.receiveDamage({ physical: 0, fire: 0, cold: damage, lightning: 0, isCrit: false }, world);
    if (dot.remaining <= 0)
        dotRegistry.delete(target);
}
// ============================================================
// Registry
// ============================================================
export const SKILLS = {
    cleave,
    shield_slam,
    war_cry,
    whirlwind,
    power_shot,
    multishot,
    poison_arrow,
    dash,
    raise_skeleton,
    summon_golem,
    bone_spear,
    command,
    fireball,
    frost_nova,
    chain_lightning,
    teleport,
};
export function getSkill(id) {
    const s = SKILLS[id];
    if (!s)
        throw new Error(`Unknown skill: ${id}`);
    return s;
}
//# sourceMappingURL=skills.js.map