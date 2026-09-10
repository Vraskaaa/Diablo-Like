// Crafting materials.
//
// Materials are the deterministic "currency" of crafting. Unlike Diablo/PoE
// orbs (which randomize outcomes), Aetherfall's materials are SPENT to pay for
// a chosen, known result. There is no gambling: you decide the exact affix and
// tier, and pay the material cost for it.
export const MATERIALS = {
    shard: {
        id: "shard",
        name: "Aether Shard",
        description: "Common crystalline dust. Fabricates bases and inscribes minor affixes.",
        color: "#9fb3c8",
        glyph: "🔹",
    },
    essence: {
        id: "essence",
        name: "Vital Essence",
        description: "Condensed life-force. Powers mid-tier affixes and tier upgrades.",
        color: "#5fd08b",
        glyph: "🟢",
    },
    rune: {
        id: "rune",
        name: "Elder Rune",
        description: "An ancient glyph of power. Required for high-tier affixes.",
        color: "#b48ce0",
        glyph: "🟣",
    },
    catalyst: {
        id: "catalyst",
        name: "Dissolving Catalyst",
        description: "A reactive reagent used to cleanly remove or transfer affixes.",
        color: "#e0b45f",
        glyph: "🟠",
    },
    prime: {
        id: "prime",
        name: "Prime Sigil",
        description: "A perfect sigil. Unlocks the pinnacle Tier 1 of any affix.",
        color: "#f2d488",
        glyph: "⭐",
    },
};
export const MATERIAL_IDS = ["shard", "essence", "rune", "catalyst", "prime"];
export function formatCost(cost) {
    const parts = [];
    for (const id of MATERIAL_IDS) {
        const amt = cost[id];
        if (amt && amt > 0)
            parts.push(`${amt} ${MATERIALS[id].name}`);
    }
    return parts.length ? parts.join(", ") : "Free";
}
//# sourceMappingURL=materials.js.map