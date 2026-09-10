// Item instances: a base plus a set of chosen affixes at specific tiers.
//
// Rarity is DERIVED from affix count (Normal=0, Magic=1-2, Rare=3-6), matching
// the ARPG convention. Rarity also caps how many affixes crafting may add.
//
// There is NO hidden roll stored on an item — every value comes from the affix
// tier tables, so an item is fully described by (baseId, [{affixId, tier}]).
// This is what makes crafting deterministic and items reproducible.

import { StatModifier } from "../stats.js";
import { ItemBase, getBase, EquipSlot } from "./bases.js";
import { AffixDef, getAffix, tierOf } from "./affixes.js";

export type Rarity = "normal" | "magic" | "rare" | "unique";

export const RARITY_COLORS: Record<Rarity, string> = {
  normal: "#c8c8c8",
  magic: "#6f8fff",
  rare: "#e6d54a",
  unique: "#cf7a30",
};

export interface RolledAffix {
  affixId: string;
  tier: number;
}

let NEXT_ITEM_ID = 1;

export class Item {
  readonly uid: number;
  baseId: string;
  affixes: RolledAffix[];
  /** For unique items, a fixed display name overriding the generated one. */
  uniqueName?: string;

  constructor(baseId: string, affixes: RolledAffix[] = [], uid?: number) {
    this.uid = uid ?? NEXT_ITEM_ID++;
    this.baseId = baseId;
    this.affixes = affixes;
  }

  get base(): ItemBase {
    return getBase(this.baseId);
  }

  get slot(): EquipSlot {
    return this.base.slot;
  }

  get itemLevel(): number {
    return this.base.itemLevel;
  }

  prefixes(): RolledAffix[] {
    return this.affixes.filter((a) => getAffix(a.affixId).type === "prefix");
  }

  suffixes(): RolledAffix[] {
    return this.affixes.filter((a) => getAffix(a.affixId).type === "suffix");
  }

  get rarity(): Rarity {
    if (this.uniqueName) return "unique";
    const n = this.affixes.length;
    if (n === 0) return "normal";
    if (n <= 2) return "magic";
    return "rare";
  }

  /** Whether this item currently has a given affix group (dedupe rule). */
  hasGroup(group: string): boolean {
    return this.affixes.some((a) => getAffix(a.affixId).group === group);
  }

  /** Convert base implicit + affixes into a flat list of stat modifiers. */
  toModifiers(): StatModifier[] {
    const mods: StatModifier[] = [];
    const base = this.base;
    mods.push({
      stat: base.implicit.stat,
      kind: base.implicit.kind,
      value: base.implicit.value,
      source: base.name,
    });
    for (const roll of this.affixes) {
      const affix = getAffix(roll.affixId);
      const t = tierOf(affix, roll.tier);
      mods.push({ stat: affix.stat, kind: affix.kind, value: t.value, source: affix.name });
    }
    return mods;
  }

  displayName(): string {
    if (this.uniqueName) return this.uniqueName;
    const base = this.base;
    const pre = this.prefixes();
    const suf = this.suffixes();
    let name = base.name;
    if (pre.length > 0) name = `${getAffix(pre[0].affixId).name} ${name}`;
    if (suf.length > 0) name = `${name} ${getAffix(suf[0].affixId).name}`;
    return name;
  }

  clone(): Item {
    return new Item(
      this.baseId,
      this.affixes.map((a) => ({ ...a })),
      this.uid
    );
  }

  toJSON(): SerializedItem {
    return {
      uid: this.uid,
      baseId: this.baseId,
      affixes: this.affixes.map((a) => ({ ...a })),
      uniqueName: this.uniqueName,
    };
  }

  static fromJSON(data: SerializedItem): Item {
    const item = new Item(data.baseId, data.affixes ?? [], data.uid);
    if (data.uniqueName) item.uniqueName = data.uniqueName;
    return item;
  }
}

export interface SerializedItem {
  uid: number;
  baseId: string;
  affixes: RolledAffix[];
  uniqueName?: string;
}

/** Max affixes allowed by rarity when crafting. */
export const MAX_PREFIXES = 3;
export const MAX_SUFFIXES = 3;

/** A couple of starter items for each class, deterministic (fixed tiers). */
export function starterItemsFor(classId: string): Item[] {
  switch (classId) {
    case "warrior":
      return [
        new Item("iron_sword", [
          { affixId: "phys_inc", tier: 4 },
          { affixId: "attack_speed", tier: 5 },
        ]),
        new Item("padded_vest", [{ affixId: "life_flat", tier: 4 }]),
      ];
    case "ranger":
      return [
        new Item("hunting_bow", [
          { affixId: "attack_speed", tier: 4 },
          { affixId: "crit_chance", tier: 5 },
        ]),
        new Item("worn_boots", [{ affixId: "move_speed", tier: 5 }]),
      ];
    case "summoner":
      return [
        new Item("bone_scepter", [{ affixId: "minion_dmg_inc", tier: 4 }]),
        new Item("bone_charm", [{ affixId: "minion_life_inc", tier: 4 }]),
      ];
    case "elementalist":
      return [
        new Item("aether_wand", [
          { affixId: "fire_inc", tier: 4 },
          { affixId: "crit_chance", tier: 5 },
        ]),
        new Item("bone_charm", [{ affixId: "mana_flat", tier: 4 }]),
      ];
    default:
      return [];
  }
}
