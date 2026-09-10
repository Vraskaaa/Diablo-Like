// Item base types and equipment slots.
//
// A "base" is the underlying item (e.g. "Iron Sword", "Leather Cap") before any
// affixes. Bases carry an IMPLICIT modifier (a small guaranteed stat) and an
// item level that gates which affix tiers can be crafted onto them.

import { StatKey, ModKind, StatModifier } from "../stats.js";

export type EquipSlot =
  | "weapon"
  | "helmet"
  | "chest"
  | "gloves"
  | "boots"
  | "shield"
  | "amulet"
  | "ring";

export const EQUIP_SLOTS: EquipSlot[] = [
  "weapon",
  "helmet",
  "chest",
  "gloves",
  "boots",
  "shield",
  "amulet",
  "ring",
];

export const SLOT_NAMES: Record<EquipSlot, string> = {
  weapon: "Weapon",
  helmet: "Helmet",
  chest: "Body Armour",
  gloves: "Gloves",
  boots: "Boots",
  shield: "Shield",
  amulet: "Amulet",
  ring: "Ring",
};

export interface ImplicitMod {
  stat: StatKey;
  kind: ModKind;
  value: number;
}

export interface ItemBase {
  id: string;
  name: string;
  slot: EquipSlot;
  /** Base item level — the "quality" of the base, gates craftable tiers. */
  itemLevel: number;
  /** Guaranteed implicit modifier for this base type. */
  implicit: ImplicitMod;
  glyph: string;
}

export const ITEM_BASES: ItemBase[] = [
  // Weapons
  { id: "rusted_blade", name: "Rusted Blade", slot: "weapon", itemLevel: 4, glyph: "🗡️", implicit: { stat: "physicalDamage", kind: "flat", value: 6 } },
  { id: "iron_sword", name: "Iron Sword", slot: "weapon", itemLevel: 18, glyph: "⚔️", implicit: { stat: "physicalDamage", kind: "flat", value: 14 } },
  { id: "runed_greatsword", name: "Runed Greatsword", slot: "weapon", itemLevel: 45, glyph: "⚔️", implicit: { stat: "physicalDamage", kind: "flat", value: 30 } },
  { id: "hunting_bow", name: "Hunting Bow", slot: "weapon", itemLevel: 8, glyph: "🏹", implicit: { stat: "attackSpeed", kind: "increased", value: 0.1 } },
  { id: "aether_wand", name: "Aether Wand", slot: "weapon", itemLevel: 20, glyph: "🪄", implicit: { stat: "fireDamage", kind: "increased", value: 0.15 } },
  { id: "bone_scepter", name: "Bone Scepter", slot: "weapon", itemLevel: 22, glyph: "🦴", implicit: { stat: "minionDamage", kind: "increased", value: 0.15 } },

  // Helmets
  { id: "leather_cap", name: "Leather Cap", slot: "helmet", itemLevel: 5, glyph: "🎩", implicit: { stat: "armor", kind: "flat", value: 12 } },
  { id: "iron_helm", name: "Iron Helm", slot: "helmet", itemLevel: 25, glyph: "⛑️", implicit: { stat: "armor", kind: "flat", value: 40 } },

  // Chest
  { id: "padded_vest", name: "Padded Vest", slot: "chest", itemLevel: 6, glyph: "🧥", implicit: { stat: "maxHealth", kind: "flat", value: 20 } },
  { id: "plate_armour", name: "Plate Armour", slot: "chest", itemLevel: 30, glyph: "🛡️", implicit: { stat: "armor", kind: "flat", value: 90 } },

  // Gloves
  { id: "cloth_gloves", name: "Cloth Gloves", slot: "gloves", itemLevel: 5, glyph: "🧤", implicit: { stat: "attackSpeed", kind: "increased", value: 0.05 } },
  { id: "gauntlets", name: "Steel Gauntlets", slot: "gloves", itemLevel: 28, glyph: "🧤", implicit: { stat: "physicalDamage", kind: "increased", value: 0.1 } },

  // Boots
  { id: "worn_boots", name: "Worn Boots", slot: "boots", itemLevel: 5, glyph: "🥾", implicit: { stat: "moveSpeed", kind: "increased", value: 0.05 } },
  { id: "traveler_boots", name: "Traveler's Boots", slot: "boots", itemLevel: 26, glyph: "🥾", implicit: { stat: "moveSpeed", kind: "increased", value: 0.12 } },

  // Shield
  { id: "wooden_shield", name: "Wooden Shield", slot: "shield", itemLevel: 6, glyph: "🛡️", implicit: { stat: "armor", kind: "flat", value: 18 } },
  { id: "tower_shield", name: "Tower Shield", slot: "shield", itemLevel: 32, glyph: "🛡️", implicit: { stat: "damageReduction", kind: "flat", value: 0.05 } },

  // Amulet
  { id: "bone_charm", name: "Bone Charm", slot: "amulet", itemLevel: 10, glyph: "📿", implicit: { stat: "maxMana", kind: "flat", value: 15 } },
  { id: "gilded_amulet", name: "Gilded Amulet", slot: "amulet", itemLevel: 35, glyph: "📿", implicit: { stat: "critMultiplier", kind: "flat", value: 0.2 } },

  // Ring
  { id: "copper_ring", name: "Copper Ring", slot: "ring", itemLevel: 8, glyph: "💍", implicit: { stat: "maxHealth", kind: "flat", value: 12 } },
  { id: "sapphire_ring", name: "Sapphire Ring", slot: "ring", itemLevel: 30, glyph: "💍", implicit: { stat: "maxMana", kind: "flat", value: 40 } },
];

const BASE_BY_ID = new Map(ITEM_BASES.map((b) => [b.id, b]));

export function getBase(id: string): ItemBase {
  const b = BASE_BY_ID.get(id);
  if (!b) throw new Error(`Unknown item base: ${id}`);
  return b;
}

export function basesForSlot(slot: EquipSlot): ItemBase[] {
  return ITEM_BASES.filter((b) => b.slot === slot);
}
