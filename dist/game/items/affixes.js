// Affix definitions.
//
// An affix is a named modifier family (e.g. "of the Bear" -> increased life)
// with discrete TIERS. Each tier has an exact, fixed value — NOT a range. This
// is the cornerstone of the deterministic crafting system: crafting lets the
// player pick an affix and a tier, and the outcome value is always the same.
//
// Affixes are split into PREFIXES and SUFFIXES (as in Diablo/PoE), and each is
// restricted to certain equipment slots via `allowedSlots`.
const ALL_ARMOUR = ["helmet", "chest", "gloves", "boots", "shield"];
const ALL_SLOTS = [
    "weapon",
    "helmet",
    "chest",
    "gloves",
    "boots",
    "shield",
    "amulet",
    "ring",
];
function tiers(entries) {
    // entries: [tier, value, itemLevel]
    return entries.map(([tier, value, itemLevel]) => ({ tier, value, itemLevel }));
}
export const AFFIXES = [
    // ---------- PREFIXES ----------
    {
        id: "life_flat",
        name: "Sanguine",
        type: "prefix",
        stat: "maxHealth",
        kind: "flat",
        group: "life",
        allowedSlots: ALL_SLOTS,
        tiers: tiers([
            [1, 90, 45],
            [2, 65, 30],
            [3, 45, 18],
            [4, 25, 6],
            [5, 12, 1],
        ]),
    },
    {
        id: "phys_inc",
        name: "Honed",
        type: "prefix",
        stat: "physicalDamage",
        kind: "increased",
        group: "phys_damage",
        allowedSlots: ["weapon", "gloves", "ring", "amulet"],
        tiers: tiers([
            [1, 0.6, 50],
            [2, 0.42, 32],
            [3, 0.28, 18],
            [4, 0.16, 8],
            [5, 0.08, 1],
        ]),
    },
    {
        id: "fire_inc",
        name: "Flaming",
        type: "prefix",
        stat: "fireDamage",
        kind: "increased",
        group: "fire_damage",
        allowedSlots: ["weapon", "amulet", "ring"],
        tiers: tiers([
            [1, 0.55, 48],
            [2, 0.4, 30],
            [3, 0.26, 16],
            [4, 0.14, 6],
            [5, 0.07, 1],
        ]),
    },
    {
        id: "cold_inc",
        name: "Freezing",
        type: "prefix",
        stat: "coldDamage",
        kind: "increased",
        group: "cold_damage",
        allowedSlots: ["weapon", "amulet", "ring"],
        tiers: tiers([
            [1, 0.55, 48],
            [2, 0.4, 30],
            [3, 0.26, 16],
            [4, 0.14, 6],
            [5, 0.07, 1],
        ]),
    },
    {
        id: "light_inc",
        name: "Crackling",
        type: "prefix",
        stat: "lightningDamage",
        kind: "increased",
        group: "lightning_damage",
        allowedSlots: ["weapon", "amulet", "ring"],
        tiers: tiers([
            [1, 0.55, 48],
            [2, 0.4, 30],
            [3, 0.26, 16],
            [4, 0.14, 6],
            [5, 0.07, 1],
        ]),
    },
    {
        id: "armor_flat",
        name: "Plated",
        type: "prefix",
        stat: "armor",
        kind: "flat",
        group: "armour",
        allowedSlots: ALL_ARMOUR,
        tiers: tiers([
            [1, 120, 45],
            [2, 80, 30],
            [3, 50, 16],
            [4, 28, 6],
            [5, 14, 1],
        ]),
    },
    {
        id: "mana_flat",
        name: "Arcane",
        type: "prefix",
        stat: "maxMana",
        kind: "flat",
        group: "mana",
        allowedSlots: ALL_SLOTS,
        tiers: tiers([
            [1, 70, 45],
            [2, 50, 30],
            [3, 32, 16],
            [4, 18, 6],
            [5, 9, 1],
        ]),
    },
    {
        id: "minion_dmg_inc",
        name: "Necromantic",
        type: "prefix",
        stat: "minionDamage",
        kind: "increased",
        group: "minion_damage",
        allowedSlots: ["amulet", "ring", "helmet", "gloves"],
        tiers: tiers([
            [1, 0.5, 50],
            [2, 0.35, 32],
            [3, 0.22, 16],
            [4, 0.12, 6],
            [5, 0.06, 1],
        ]),
    },
    // ---------- SUFFIXES ----------
    {
        id: "attack_speed",
        name: "of Swiftness",
        type: "suffix",
        stat: "attackSpeed",
        kind: "increased",
        group: "attack_speed",
        allowedSlots: ["weapon", "gloves", "ring"],
        tiers: tiers([
            [1, 0.24, 50],
            [2, 0.17, 32],
            [3, 0.11, 16],
            [4, 0.06, 6],
            [5, 0.03, 1],
        ]),
    },
    {
        id: "crit_chance",
        name: "of Precision",
        type: "suffix",
        stat: "critChance",
        kind: "flat",
        group: "crit_chance",
        allowedSlots: ["weapon", "amulet", "ring", "gloves"],
        tiers: tiers([
            [1, 0.08, 50],
            [2, 0.055, 32],
            [3, 0.035, 16],
            [4, 0.02, 6],
            [5, 0.01, 1],
        ]),
    },
    {
        id: "crit_mult",
        name: "of Devastation",
        type: "suffix",
        stat: "critMultiplier",
        kind: "flat",
        group: "crit_mult",
        allowedSlots: ["weapon", "amulet"],
        tiers: tiers([
            [1, 0.5, 50],
            [2, 0.35, 32],
            [3, 0.22, 16],
            [4, 0.12, 6],
            [5, 0.06, 1],
        ]),
    },
    {
        id: "move_speed",
        name: "of Haste",
        type: "suffix",
        stat: "moveSpeed",
        kind: "increased",
        group: "move_speed",
        allowedSlots: ["boots"],
        tiers: tiers([
            [1, 0.3, 45],
            [2, 0.22, 30],
            [3, 0.15, 16],
            [4, 0.1, 6],
            [5, 0.05, 1],
        ]),
    },
    {
        id: "life_regen",
        name: "of Recovery",
        type: "suffix",
        stat: "healthRegen",
        kind: "flat",
        group: "life_regen",
        allowedSlots: ALL_SLOTS,
        tiers: tiers([
            [1, 12, 45],
            [2, 8, 30],
            [3, 5, 16],
            [4, 3, 6],
            [5, 1.5, 1],
        ]),
    },
    {
        id: "damage_reduction",
        name: "of the Bulwark",
        type: "suffix",
        stat: "damageReduction",
        kind: "flat",
        group: "damage_reduction",
        allowedSlots: ["chest", "shield", "helmet"],
        tiers: tiers([
            [1, 0.12, 50],
            [2, 0.08, 32],
            [3, 0.05, 16],
            [4, 0.03, 6],
            [5, 0.015, 1],
        ]),
    },
    {
        id: "aoe_inc",
        name: "of Expansion",
        type: "suffix",
        stat: "areaOfEffect",
        kind: "increased",
        group: "area",
        allowedSlots: ["amulet", "helmet"],
        tiers: tiers([
            [1, 0.3, 48],
            [2, 0.22, 30],
            [3, 0.14, 16],
            [4, 0.08, 6],
            [5, 0.04, 1],
        ]),
    },
    {
        id: "extra_projectile",
        name: "of Barrage",
        type: "suffix",
        stat: "projectileCount",
        kind: "flat",
        group: "projectiles",
        allowedSlots: ["weapon", "amulet"],
        tiers: tiers([
            [1, 2, 45],
            [2, 1, 20],
        ]),
    },
    {
        id: "minion_life_inc",
        name: "of the Legion",
        type: "suffix",
        stat: "minionLife",
        kind: "increased",
        group: "minion_life",
        allowedSlots: ["amulet", "ring", "chest", "boots"],
        tiers: tiers([
            [1, 0.5, 50],
            [2, 0.35, 32],
            [3, 0.22, 16],
            [4, 0.12, 6],
            [5, 0.06, 1],
        ]),
    },
];
const AFFIX_BY_ID = new Map(AFFIXES.map((a) => [a.id, a]));
export function getAffix(id) {
    const a = AFFIX_BY_ID.get(id);
    if (!a)
        throw new Error(`Unknown affix: ${id}`);
    return a;
}
export function affixesForSlot(slot, type) {
    return AFFIXES.filter((a) => a.allowedSlots.includes(slot) && (type === undefined || a.type === type));
}
export function tierOf(affix, tier) {
    const t = affix.tiers.find((x) => x.tier === tier);
    if (!t)
        throw new Error(`Affix ${affix.id} has no tier ${tier}`);
    return t;
}
/** Best (lowest-number) tier available at a given item level. */
export function bestTierForItemLevel(affix, itemLevel) {
    const eligible = affix.tiers
        .filter((t) => t.itemLevel <= itemLevel)
        .sort((a, b) => a.tier - b.tier);
    return eligible[0] ?? null;
}
//# sourceMappingURL=affixes.js.map