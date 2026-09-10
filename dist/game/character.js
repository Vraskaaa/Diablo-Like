// The Character model: the persistent, out-of-combat representation of a hero.
// Holds class, level/XP, allocated attributes, equipment, inventory, and
// crafting materials. Computes final stats by combining class identity, level,
// attributes, and equipped items.
import { baseStats, computeStats, attributeModifiers, } from "./stats.js";
import { CLASSES } from "./classes.js";
import { EQUIP_SLOTS } from "./items/bases.js";
import { Item } from "./items/item.js";
import { levelForXp, rewardForLevel } from "./leveling.js";
function emptyEquipment() {
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
    name;
    classId;
    totalXp;
    level;
    /** Base attributes = class starting + all allocated points. */
    attributes;
    unspentAttributePoints;
    unspentSkillPoints;
    equipment;
    inventory;
    /** Crafting materials keyed by material id. */
    materials;
    constructor(name, classId) {
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
    allModifiers() {
        const mods = [];
        mods.push(...this.classDef.identityMods);
        mods.push(...attributeModifiers(this.attributes));
        // Per-level baseline growth: a little life & mana per level.
        mods.push({ stat: "maxHealth", kind: "flat", value: (this.level - 1) * 6, source: "Level" });
        mods.push({ stat: "maxMana", kind: "flat", value: (this.level - 1) * 3, source: "Level" });
        for (const slot of EQUIP_SLOTS) {
            const item = this.equipment[slot];
            if (item)
                mods.push(...item.toModifiers());
        }
        return mods;
    }
    computeStats() {
        return computeStats(baseStats(), this.allModifiers());
    }
    /** Grant XP and process any resulting level-ups. Returns levels gained. */
    gainXp(amount) {
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
    allocateAttribute(attr) {
        if (this.unspentAttributePoints <= 0)
            return false;
        this.attributes[attr]++;
        this.unspentAttributePoints--;
        return true;
    }
    /** Equip an item from inventory; returns the previously equipped item (if any). */
    equip(item) {
        const slot = item.slot;
        const idx = this.inventory.findIndex((i) => i.uid === item.uid);
        if (idx >= 0)
            this.inventory.splice(idx, 1);
        const prev = this.equipment[slot];
        this.equipment[slot] = item;
        if (prev)
            this.inventory.push(prev);
        return prev;
    }
    unequip(slot) {
        const item = this.equipment[slot];
        if (!item)
            return false;
        this.equipment[slot] = null;
        this.inventory.push(item);
        return true;
    }
    addItem(item) {
        this.inventory.push(item);
    }
    removeItem(uid) {
        const idx = this.inventory.findIndex((i) => i.uid === uid);
        if (idx < 0)
            return null;
        return this.inventory.splice(idx, 1)[0];
    }
    addMaterial(id, amount) {
        this.materials[id] = (this.materials[id] ?? 0) + amount;
    }
    materialCount(id) {
        return this.materials[id] ?? 0;
    }
    spendMaterials(cost) {
        for (const [id, amt] of Object.entries(cost)) {
            if (this.materialCount(id) < amt)
                return false;
        }
        for (const [id, amt] of Object.entries(cost)) {
            this.materials[id] -= amt;
        }
        return true;
    }
    // ---- Serialization ----
    toJSON() {
        const equip = {};
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
    static fromJSON(data) {
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
//# sourceMappingURL=character.js.map