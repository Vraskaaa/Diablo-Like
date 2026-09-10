// Character class archetypes.
//
// Each class defines: starting attributes, per-level attribute growth (which
// attribute points are auto-suggested / thematic), a base stat identity, and
// the set of skill IDs it has access to. Classes are data — the actual skill
// behavior lives in skills.ts.

import { AttributeBlock, StatModifier } from "./stats.js";

export type ClassId = "warrior" | "ranger" | "summoner" | "elementalist";

export interface ClassDef {
  id: ClassId;
  name: string;
  title: string;
  description: string;
  /** Primary color used for the character's visual identity. */
  color: string;
  startingAttributes: AttributeBlock;
  /** Passive class identity modifiers applied at all times. */
  identityMods: StatModifier[];
  /** Skill IDs available to this class, in bar order. */
  skills: string[];
  /** Which attribute this class thematically favors for auto-leveling hints. */
  primaryAttribute: keyof AttributeBlock;
}

export const CLASSES: Record<ClassId, ClassDef> = {
  warrior: {
    id: "warrior",
    name: "Warrior",
    title: "The Ironclad Vanguard",
    description:
      "A frontline juggernaut who crushes foes in melee. High life and armour, " +
      "converts Strength into devastating physical blows.",
    color: "#c0563b",
    startingAttributes: { str: 14, dex: 6, int: 4, vit: 10 },
    identityMods: [
      { stat: "armor", kind: "flat", value: 20, source: "Warrior" },
      { stat: "maxHealth", kind: "increased", value: 0.15, source: "Warrior" },
      { stat: "physicalDamage", kind: "increased", value: 0.1, source: "Warrior" },
    ],
    skills: ["cleave", "shield_slam", "war_cry", "whirlwind"],
    primaryAttribute: "str",
  },
  ranger: {
    id: "ranger",
    name: "Ranger",
    title: "The Stormfletch Archer",
    description:
      "A nimble marksman raining arrows from range. Scales with Dexterity for " +
      "attack speed and critical strikes, and pins foes from afar.",
    color: "#3ba55d",
    startingAttributes: { str: 6, dex: 14, int: 6, vit: 8 },
    identityMods: [
      { stat: "attackSpeed", kind: "increased", value: 0.15, source: "Ranger" },
      { stat: "critChance", kind: "flat", value: 0.05, source: "Ranger" },
      { stat: "moveSpeed", kind: "increased", value: 0.08, source: "Ranger" },
    ],
    skills: ["power_shot", "multishot", "poison_arrow", "dash"],
    primaryAttribute: "dex",
  },
  summoner: {
    id: "summoner",
    name: "Summoner",
    title: "The Bone Sovereign",
    description:
      "A commander of the dead. Raises skeletal minions to fight in their stead " +
      "and empowers them with Intelligence. Fragile alone, unstoppable with an army.",
    color: "#8e6fd4",
    startingAttributes: { str: 5, dex: 6, int: 14, vit: 9 },
    identityMods: [
      { stat: "minionDamage", kind: "increased", value: 0.25, source: "Summoner" },
      { stat: "minionLife", kind: "increased", value: 0.25, source: "Summoner" },
      { stat: "maxMana", kind: "increased", value: 0.2, source: "Summoner" },
    ],
    skills: ["raise_skeleton", "summon_golem", "bone_spear", "command"],
    primaryAttribute: "int",
  },
  elementalist: {
    id: "elementalist",
    name: "Elementalist",
    title: "The Aether Weaver",
    description:
      "A master of raw elemental fury. Hurls fire, ice, and lightning, scaling " +
      "with Intelligence. Glass-cannon damage from a safe distance.",
    color: "#3b8fc0",
    startingAttributes: { str: 5, dex: 7, int: 15, vit: 7 },
    identityMods: [
      { stat: "fireDamage", kind: "increased", value: 0.15, source: "Elementalist" },
      { stat: "coldDamage", kind: "increased", value: 0.15, source: "Elementalist" },
      { stat: "lightningDamage", kind: "increased", value: 0.15, source: "Elementalist" },
    ],
    skills: ["fireball", "frost_nova", "chain_lightning", "teleport"],
    primaryAttribute: "int",
  },
};

export const PLAYABLE_CLASSES: ClassId[] = ["warrior", "ranger", "summoner", "elementalist"];
