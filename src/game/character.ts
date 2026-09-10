// The Character model: the persistent, out-of-combat representation of a hero.
// Holds class, level/XP, allocated attributes, equipment, inventory, and
// crafting materials. Computes final stats by combining class identity, level,
// attributes, and equipped items.

import {
  AttributeBlock,
  StatKey,
  StatModifier,
  baseStats,
  computeStats,
  attributeModifiers,
} from "./stats.js";
import { ClassId, CLASSES } from "./classes.js";
import { EquipSlot, EQUIP_SLOTS } from "./items/bases.js";
import { Item, SerializedItem } from "./items/item.js";
import { levelForXp, rewardForLevel } from "./leveling.js";

export interface Equipment {
  // A ring slot pair could be added; we keep one ring for the slice.
  weapon: Item | null;
  helmet: Item | null;
  chest: Item | null;
  gloves: Item | null;
  boots: Item | null;
  shield: Item | null;
  amulet: Item | null;
  ring: Item | null;
}

function emptyEquipment(): Equipment {
  return {
    weapon: null,
    helmet: null,
    chest: null,
    gloves: null,
    boots: null,
    shield: null,
    amulet: null,
    ring: null,
  };
}

export class Character {
  name: string;
  classId: ClassId;
  totalXp: number;
  level: number;
  /** Base attributes = class starting + all allocated points. */
  attributes: AttributeBlock;
  unspentAttributePoints: number;
  unspentSkillPoints: number;

  equipment: Equipment;
  inventory: Item[];
  /** Crafting materials keyed by material id. */
  materials: Record<string, number>;

  constructor(name: string, classId: ClassId) {
    this.name = name;
    this.classId = classId;
    this.totalXp = 0;
    this.level = 1;
    const cls = CLASSES[classId];
    this.attributes = { ...cls.startingAttributes };
    this.unspentAttributePoints = 0;
    this.unspentSkillPoints = 0;
    this.equipment = emptyEquipment();
    this.inventory = [];
    this.materials = {};
  }

  get classDef() {
    return CLASSES[this.classId];
  }

  /** Gather all modifiers: class identity + attributes + equipped items. */
  private allModifiers(): StatModifier[] {
    const mods: StatModifier[] = [];
    mods.push(...this.classDef.identityMods);
    mods.push(...attributeModifiers(this.attributes));
    // Per-level baseline growth: a little life & mana per level.
    mods.push({ stat: "maxHealth", kind: "flat", value: (this.level - 1) * 6, source: "Level" });
    mods.push({ stat: "maxMana", kind: "flat", value: (this.level - 1) * 3, source: "Level" });
    for (const slot of EQUIP_SLOTS) {
      const item = this.equipment[slot];
      if (item) mods.push(...item.toModifiers());
    }
    return mods;
  }

  computeStats(): Record<StatKey, number> {
    return computeStats(baseStats(), this.allModifiers());
  }

  /** Grant XP and process any resulting level-ups. Returns levels gained. */
  gainXp(amount: number): number {
    this.totalXp += amount;
    const newLevel = levelForXp(this.totalXp);
    let gained = 0;
    while (this.level < newLevel) {
      this.level++;
      gained++;
      const reward = rewardForLevel(this.level);
      this.unspentAttributePoints += reward.attributePoints;
      this.unspentSkillPoints += reward.skillPoints;
    }
    return gained;
  }

  allocateAttribute(attr: keyof AttributeBlock): boolean {
    if (this.unspentAttributePoints <= 0) return false;
    this.attributes[attr]++;
    this.unspentAttributePoints--;
    return true;
  }

  /** Equip an item from inventory; returns the previously equipped item (if any). */
  equip(item: Item): Item | null {
    const slot = item.slot;
    const idx = this.inventory.findIndex((i) => i.uid === item.uid);
    if (idx >= 0) this.inventory.splice(idx, 1);
    const prev = this.equipment[slot];
    this.equipment[slot] = item;
    if (prev) this.inventory.push(prev);
    return prev;
  }

  unequip(slot: EquipSlot): boolean {
    const item = this.equipment[slot];
    if (!item) return false;
    this.equipment[slot] = null;
    this.inventory.push(item);
    return true;
  }

  addItem(item: Item): void {
    this.inventory.push(item);
  }

  removeItem(uid: number): Item | null {
    const idx = this.inventory.findIndex((i) => i.uid === uid);
    if (idx < 0) return null;
    return this.inventory.splice(idx, 1)[0];
  }

  addMaterial(id: string, amount: number): void {
    this.materials[id] = (this.materials[id] ?? 0) + amount;
  }

  materialCount(id: string): number {
    return this.materials[id] ?? 0;
  }

  spendMaterials(cost: Record<string, number>): boolean {
    for (const [id, amt] of Object.entries(cost)) {
      if (this.materialCount(id) < amt) return false;
    }
    for (const [id, amt] of Object.entries(cost)) {
      this.materials[id] -= amt;
    }
    return true;
  }

  // ---- Serialization ----

  toJSON(): SerializedCharacter {
    const equip: Record<string, SerializedItem | null> = {};
    for (const slot of EQUIP_SLOTS) {
      const item = this.equipment[slot];
      equip[slot] = item ? item.toJSON() : null;
    }
    return {
      name: this.name,
      classId: this.classId,
      totalXp: this.totalXp,
      attributes: { ...this.attributes },
      unspentAttributePoints: this.unspentAttributePoints,
      unspentSkillPoints: this.unspentSkillPoints,
      equipment: equip,
      inventory: this.inventory.map((i) => i.toJSON()),
      materials: { ...this.materials },
    };
  }

  static fromJSON(data: SerializedCharacter): Character {
    const c = new Character(data.name, data.classId);
    c.totalXp = data.totalXp;
    c.level = levelForXp(data.totalXp);
    c.attributes = { ...data.attributes };
    c.unspentAttributePoints = data.unspentAttributePoints;
    c.unspentSkillPoints = data.unspentSkillPoints;
    c.materials = { ...data.materials };
    c.inventory = (data.inventory ?? []).map((i) => Item.fromJSON(i));
    for (const slot of EQUIP_SLOTS) {
      const raw = data.equipment[slot];
      c.equipment[slot] = raw ? Item.fromJSON(raw) : null;
    }
    return c;
  }
}

export interface SerializedCharacter {
  name: string;
  classId: ClassId;
  totalXp: number;
  attributes: AttributeBlock;
  unspentAttributePoints: number;
  unspentSkillPoints: number;
  equipment: Record<string, SerializedItem | null>;
  inventory: SerializedItem[];
  materials: Record<string, number>;
}
