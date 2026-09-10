// Crafting materials.
//
// Materials are the deterministic "currency" of crafting. Unlike Diablo/PoE
// orbs (which randomize outcomes), Aetherfall's materials are SPENT to pay for
// a chosen, known result. There is no gambling: you decide the exact affix and
// tier, and pay the material cost for it.

export type MaterialId =
  | "shard" // common: base fabrication, low-tier affixes
  | "essence" // uncommon: mid-tier affixes, tier upgrades
  | "rune" // rare: high-tier affixes
  | "catalyst" // utility: removing / imprinting affixes
  | "prime"; // top-tier: unlock the best tier-1 affixes

export interface MaterialDef {
  id: MaterialId;
  name: string;
  description: string;
  color: string;
  glyph: string;
}

export const MATERIALS: Record<MaterialId, MaterialDef> = {
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

export const MATERIAL_IDS: MaterialId[] = ["shard", "essence", "rune", "catalyst", "prime"];

export type MaterialCost = Partial<Record<MaterialId, number>>;

export function formatCost(cost: MaterialCost): string {
  const parts: string[] = [];
  for (const id of MATERIAL_IDS) {
    const amt = cost[id];
    if (amt && amt > 0) parts.push(`${amt} ${MATERIALS[id].name}`);
  }
  return parts.length ? parts.join(", ") : "Free";
}
