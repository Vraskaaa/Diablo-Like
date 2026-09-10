// Lightweight self-check for the deterministic crafting + stat systems.
// Run with: unset NODE_OPTIONS; tsc && node dist/tests/craft.test.js
//
// This is NOT a full test framework — it's a set of assertions that exit
// non-zero on failure, so it can gate the build in CI or manual verification.

import { Character } from "../game/character.js";
import { Item } from "../game/items/item.js";
import {
  fabricateBase,
  addAffix,
  upgradeAffix,
  removeAffix,
  affixTierCost,
} from "../game/crafting/crafting.js";
import { getAffix } from "../game/items/affixes.js";
import { startingMaterials } from "../game/crafting/drops.js";

let failures = 0;
function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error("  ✗ FAIL:", msg);
    failures++;
  } else {
    console.log("  ✓", msg);
  }
}

function approx(a: number, b: number, eps = 1e-6): boolean {
  return Math.abs(a - b) <= eps;
}

console.log("== Crafting determinism ==");
{
  // The SAME craft steps must always produce the SAME item values.
  function craftItem(): Item {
    const c = new Character("Test", "warrior");
    c.materials = { shard: 999, essence: 999, rune: 999, catalyst: 999, prime: 999 };
    // runed_greatsword is itemLevel 45, which permits phys_inc tier 2 (req 32).
    const fab = fabricateBase(c, "runed_greatsword", true);
    const item = fab.preview!;
    addAffix(c, item, "phys_inc", 3, true);
    addAffix(c, item, "attack_speed", 3, true);
    upgradeAffix(c, item, "phys_inc", true); // 3 -> 2
    return item;
  }
  const a = craftItem();
  const b = craftItem();
  const av = JSON.stringify(a.affixes.slice().sort((x, y) => x.affixId.localeCompare(y.affixId)));
  const bv = JSON.stringify(b.affixes.slice().sort((x, y) => x.affixId.localeCompare(y.affixId)));
  assert(av === bv, "Identical craft steps yield identical affixes");

  const physTier = a.affixes.find((x) => x.affixId === "phys_inc")!.tier;
  assert(physTier === 2, "Upgrade moved phys_inc from tier 3 to tier 2");

  // The value must match the tier table exactly (no range/roll).
  const expected = getAffix("phys_inc").tiers.find((t) => t.tier === 2)!.value;
  const mods = a.toModifiers();
  const physMod = mods.find((m) => m.source === getAffix("phys_inc").name)!;
  assert(approx(physMod.value, expected), `phys_inc value is exactly tier-2 (${expected})`);
}

console.log("== Item level gates affix tiers ==");
{
  const c = new Character("Test", "warrior");
  c.materials = { shard: 999, essence: 999, rune: 999, catalyst: 999, prime: 999 };
  // iron_sword is itemLevel 18; phys_inc tier 2 requires itemLevel 32.
  const item = fabricateBase(c, "iron_sword", true).preview!;
  const low = addAffix(c, item, "phys_inc", 2, false);
  assert(!low.ok, "Low-ilvl base rejects a high tier (phys_inc T2 on iron_sword)");
  const okTier = addAffix(c, item, "phys_inc", 4, false);
  assert(okTier.ok, "Same base accepts a permitted tier (phys_inc T4)");
}

console.log("== Cost model is a pure function of tier ==");
{
  const affix = getAffix("life_flat");
  const c1 = JSON.stringify(affixTierCost(affix, 1));
  const c1b = JSON.stringify(affixTierCost(affix, 1));
  assert(c1 === c1b, "Same tier => same cost");
  const c5 = JSON.stringify(affixTierCost(affix, 5));
  assert(c1 !== c5, "Different tiers => different cost");
}

console.log("== Validation rules ==");
{
  const c = new Character("Test", "warrior");
  c.materials = { shard: 999, essence: 999, rune: 999, catalyst: 999, prime: 999 };
  const item = fabricateBase(c, "iron_sword", true).preview!;
  // Add a life prefix.
  const r1 = addAffix(c, item, "life_flat", 5, true);
  assert(r1.ok, "Can add life_flat to a weapon");
  // Adding the SAME group again must fail.
  const r2 = addAffix(c, item, "life_flat", 4, false);
  assert(!r2.ok, "Cannot add a second modifier of the same group");
  // Slot restriction: move_speed is boots-only.
  const r3 = addAffix(c, item, "move_speed", 5, false);
  assert(!r3.ok, "Cannot add boots-only affix (move_speed) to a weapon");
}

console.log("== Prefix/suffix caps ==");
{
  const c = new Character("Test", "warrior");
  c.materials = { shard: 9999, essence: 9999, rune: 9999, catalyst: 9999, prime: 9999 };
  // Use a high-ilvl base so tiers are allowed.
  const item = fabricateBase(c, "runed_greatsword", true).preview!;
  assert(addAffix(c, item, "phys_inc", 5, true).ok, "prefix 1 (phys)");
  assert(addAffix(c, item, "fire_inc", 5, true).ok, "prefix 2 (fire)");
  assert(addAffix(c, item, "cold_inc", 5, true).ok, "prefix 3 (cold)");
  const over = addAffix(c, item, "light_inc", 5, false);
  assert(!over.ok, "prefix 4 rejected (cap of 3 prefixes)");
}

console.log("== Character stats & leveling ==");
{
  const c = new Character("Hero", "warrior");
  const base = c.computeStats();
  assert(base.maxHealth > 50, "Warrior has bonus health from STR/VIT/identity");
  const before = c.level;
  const gained = c.gainXp(100000);
  assert(c.level > before, "Gained levels from a large XP grant");
  assert(c.unspentAttributePoints === gained * 3, "Attribute points match levels gained");
}

console.log("== Serialization round-trip ==");
{
  const c = new Character("Hero", "summoner");
  c.materials = startingMaterials();
  const item = fabricateBase(c, "bone_scepter", true).preview!;
  addAffix(c, item, "minion_dmg_inc", 4, true);
  c.equip(item);
  c.gainXp(5000);
  const json = JSON.stringify(c.toJSON());
  const c2 = Character.fromJSON(JSON.parse(json));
  assert(c2.name === c.name && c2.classId === c.classId, "Identity preserved");
  assert(!!c2.equipment.weapon, "Equipped weapon preserved");
  assert(
    approx(c2.computeStats().minionDamage, c.computeStats().minionDamage),
    "Computed stats identical after round-trip"
  );
}

console.log("");
if (failures > 0) {
  console.error(`RESULT: ${failures} assertion(s) FAILED`);
  // Signal failure to the shell without needing @types/node.
  (globalThis as unknown as { process?: { exit: (n: number) => void } }).process?.exit(1);
  throw new Error(`${failures} assertion(s) failed`);
} else {
  console.log("RESULT: all assertions passed ✓");
}
