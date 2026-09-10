// Persistence round-trip test. Stubs localStorage (Node has none) and verifies
// saveCharacter/loadCharacter preserve class, level, attributes, materials,
// inventory, and equipment exactly.
//
// Run: unset NODE_OPTIONS; tsc && node dist/tests/persist.test.js

export {}; // mark as a module so top-level await is permitted

// ---- localStorage stub (must be installed before importing persistence) ----
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => Array.from(store.keys())[i] ?? null,
  get length() {
    return store.size;
  },
} as Storage;

const { Character } = await import("../game/character.js");
const { fabricateBase, addAffix } = await import("../game/crafting/crafting.js");
const { saveCharacter, loadCharacter, hasSave, clearSave } = await import(
  "../game/persistence.js"
);

let failures = 0;
function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error("  ✗ FAIL:", msg);
    failures++;
  } else {
    console.log("  ✓", msg);
  }
}

console.log("== Persistence round-trip ==");
{
  const c = new Character("Saveling", "ranger");
  c.materials = { shard: 50, essence: 10, rune: 3, catalyst: 2, prime: 1 };
  c.gainXp(8000);
  // Craft and equip an item.
  const item = fabricateBase(c, "hunting_bow", true).preview!;
  addAffix(c, item, "attack_speed", 4, true);
  c.equip(item);
  // Put a spare item in the bag.
  const spare = fabricateBase(c, "worn_boots", true).preview!;

  assert(!hasSave(), "No save before writing");
  saveCharacter(c);
  assert(hasSave(), "Save exists after writing");

  const loaded = loadCharacter()!;
  assert(!!loaded, "Loaded a character");
  assert(loaded.name === "Saveling", "Name preserved");
  assert(loaded.classId === "ranger", "Class preserved");
  assert(loaded.level === c.level, `Level preserved (${loaded.level})`);
  assert(
    loaded.materialCount("shard") === c.materialCount("shard"),
    `Materials preserved exactly (shard=${loaded.materialCount("shard")})`
  );
  assert(loaded.materialCount("prime") === 1, "Rare material (prime) preserved");
  assert(!!loaded.equipment.weapon, "Equipped weapon preserved");
  assert(
    loaded.equipment.weapon!.affixes.length === 1,
    "Weapon affix preserved through save"
  );
  assert(loaded.inventory.length === c.inventory.length, "Inventory count preserved");
  assert(
    Math.abs(loaded.computeStats().attackSpeed - c.computeStats().attackSpeed) < 1e-9,
    "Computed attackSpeed identical after load"
  );

  clearSave();
  assert(!hasSave(), "Save cleared");
}

console.log("");
if (failures > 0) {
  console.error(`RESULT: ${failures} assertion(s) FAILED`);
  (globalThis as unknown as { process?: { exit: (n: number) => void } }).process?.exit(1);
  throw new Error(`${failures} assertion(s) failed`);
} else {
  console.log("RESULT: all persistence assertions passed ✓");
}
