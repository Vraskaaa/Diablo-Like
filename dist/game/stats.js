// The stat system.
//
// Design: characters have four PRIMARY ATTRIBUTES (Strength, Dexterity,
// Intelligence, Vitality). Everything else is a DERIVED STAT computed from
// attributes plus a set of modifiers contributed by class, level, and equipped
// items / crafted affixes.
//
// Modifiers use the familiar ARPG three-layer model:
//   final = (base + sum(flat)) * (1 + sum(increased)) * product(1 + more)
// This is deterministic and additive-friendly, which suits our non-RNG crafting.
export const ATTRIBUTES = ["str", "dex", "int", "vit"];
export const ATTRIBUTE_NAMES = {
    str: "Strength",
    dex: "Dexterity",
    int: "Intelligence",
    vit: "Vitality",
};
export const ALL_STATS = [
    "maxHealth",
    "maxMana",
    "healthRegen",
    "manaRegen",
    "moveSpeed",
    "physicalDamage",
    "fireDamage",
    "coldDamage",
    "lightningDamage",
    "attackSpeed",
    "critChance",
    "critMultiplier",
    "armor",
    "damageReduction",
    "minionDamage",
    "minionLife",
    "areaOfEffect",
    "projectileCount",
];
export const STAT_NAMES = {
    maxHealth: "Maximum Life",
    maxMana: "Maximum Mana",
    healthRegen: "Life Regeneration",
    manaRegen: "Mana Regeneration",
    moveSpeed: "Movement Speed",
    physicalDamage: "Physical Damage",
    fireDamage: "Fire Damage",
    coldDamage: "Cold Damage",
    lightningDamage: "Lightning Damage",
    attackSpeed: "Attack Speed",
    critChance: "Critical Strike Chance",
    critMultiplier: "Critical Strike Multiplier",
    armor: "Armour",
    damageReduction: "Damage Reduction",
    minionDamage: "Minion Damage",
    minionLife: "Minion Life",
    areaOfEffect: "Area of Effect",
    projectileCount: "Additional Projectiles",
};
export function emptyAttributes() {
    return { str: 0, dex: 0, int: 0, vit: 0 };
}
/**
 * Attributes contribute to derived stats via fixed, deterministic conversions.
 * These conversions define the "feel" of each attribute:
 *   STR -> life + physical damage
 *   DEX -> attack speed + crit chance
 *   INT -> mana + elemental damage
 *   VIT -> life + life regen
 */
export function attributeModifiers(attr) {
    const mods = [];
    // Strength
    mods.push({ stat: "maxHealth", kind: "flat", value: attr.str * 2, source: "Strength" });
    mods.push({ stat: "physicalDamage", kind: "increased", value: attr.str * 0.01, source: "Strength" });
    // Dexterity
    mods.push({ stat: "attackSpeed", kind: "increased", value: attr.dex * 0.005, source: "Dexterity" });
    mods.push({ stat: "critChance", kind: "flat", value: attr.dex * 0.001, source: "Dexterity" });
    // Intelligence
    mods.push({ stat: "maxMana", kind: "flat", value: attr.int * 2, source: "Intelligence" });
    mods.push({ stat: "fireDamage", kind: "increased", value: attr.int * 0.008, source: "Intelligence" });
    mods.push({ stat: "coldDamage", kind: "increased", value: attr.int * 0.008, source: "Intelligence" });
    mods.push({ stat: "lightningDamage", kind: "increased", value: attr.int * 0.008, source: "Intelligence" });
    // Vitality
    mods.push({ stat: "maxHealth", kind: "flat", value: attr.vit * 4, source: "Vitality" });
    mods.push({ stat: "healthRegen", kind: "flat", value: attr.vit * 0.1, source: "Vitality" });
    return mods;
}
/** Base derived-stat values before any modifiers are applied. */
export function baseStats() {
    return {
        maxHealth: 50,
        maxMana: 30,
        healthRegen: 1,
        manaRegen: 2,
        moveSpeed: 190,
        physicalDamage: 0,
        fireDamage: 0,
        coldDamage: 0,
        lightningDamage: 0,
        attackSpeed: 1,
        critChance: 0.05,
        critMultiplier: 1.5,
        armor: 0,
        damageReduction: 0,
        minionDamage: 0,
        minionLife: 0,
        areaOfEffect: 0,
        projectileCount: 0,
    };
}
/**
 * Compute final stats deterministically from a base block plus modifiers.
 * Applies the flat -> increased -> more pipeline per stat.
 */
export function computeStats(base, mods) {
    const flat = {};
    const increased = {};
    const moreFactors = {};
    for (const m of mods) {
        if (m.kind === "flat")
            flat[m.stat] = (flat[m.stat] ?? 0) + m.value;
        else if (m.kind === "increased")
            increased[m.stat] = (increased[m.stat] ?? 0) + m.value;
        else
            moreFactors[m.stat] = (moreFactors[m.stat] ?? 1) * (1 + m.value);
    }
    const out = {};
    for (const key of ALL_STATS) {
        const b = base[key] + (flat[key] ?? 0);
        const inc = 1 + (increased[key] ?? 0);
        const more = moreFactors[key] ?? 1;
        out[key] = b * inc * more;
    }
    // Clamp a few stats to sensible ranges.
    out.critChance = Math.max(0, Math.min(1, out.critChance));
    out.damageReduction = Math.max(0, Math.min(0.9, out.damageReduction));
    out.moveSpeed = Math.max(40, out.moveSpeed);
    return out;
}
//# sourceMappingURL=stats.js.map