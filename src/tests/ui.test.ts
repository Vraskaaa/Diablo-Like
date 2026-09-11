// DOM-level test for the crafting bench. Reproduces the user flow: open the
// crafting modal, click Fabricate, and verify an item is actually created and
// appears selectable. Uses the minimal DOM stub (no browser).
//
// Run: unset NODE_OPTIONS; tsc && node dist/tests/ui.test.js

export {}; // module marker for top-level await

import { installDomStub, StubNode } from "./dom-stub.js";

const { root } = installDomStub();

const { UI } = await import("../ui/ui.js");
const { Character } = await import("../game/character.js");
const { startingMaterials } = await import("../game/crafting/drops.js");

let failures = 0;
function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error("  ✗ FAIL:", msg);
    failures++;
  } else {
    console.log("  ✓", msg);
  }
}

// A character the UI will read and the fabricate flow will mutate.
const character = new Character("Tester", "warrior");
character.materials = { ...startingMaterials() } as Record<string, number>;

let craftChangedCalls = 0;
const ui = new (UI as any)(root, {
  onSelectClass: () => {},
  onEquip: () => {},
  onUnequip: () => {},
  onAllocateAttribute: () => {},
  onCraftChanged: () => craftChangedCalls++,
  getCharacter: () => character,
  onSkillClick: () => {},
  onRestart: () => {},
});

console.log("== Crafting bench: Fabricate button ==");
{
  ui.showCrafting();

  // Find the Fabricate button in the rendered modal.
  const fabBtn = (root as StubNode).findByText("BUTTON", "Fabricate");
  assert(!!fabBtn, "Fabricate button is rendered");
  assert(!!fabBtn && fabBtn.hasListener("click"), "Fabricate button has a click listener attached");

  const before = character.inventory.length;
  fabBtn!.click();
  const after = character.inventory.length;

  assert(after === before + 1, `Clicking Fabricate created an item (before=${before}, after=${after})`);
  assert(craftChangedCalls > 0, "onCraftChanged was invoked after fabricate");

  // After fabricate, the modal re-renders; the new item should be selectable.
  const item = character.inventory[character.inventory.length - 1];
  assert(!!item, "The created item exists in inventory");

  // Materials should have been spent (fabricate has a non-zero cost).
  const shardStart = (startingMaterials().shard ?? 0);
  assert(
    character.materialCount("shard") < shardStart,
    `Materials were spent (shard ${shardStart} -> ${character.materialCount("shard")})`
  );
}

console.log("== Crafting bench: Add affix button ==");
{
  // Select the freshly-created item and add an affix via its button.
  const item = character.inventory[character.inventory.length - 1];
  (ui as any).craftingSelectedUid = item.uid;
  ui.showCrafting();

  const addBtn = (root as StubNode).findByText("BUTTON", "Add");
  assert(!!addBtn, "An 'Add' affix button is rendered for the selected item");
  const affixesBefore = item.affixes.length;
  addBtn!.click();
  assert(item.affixes.length === affixesBefore + 1, "Clicking Add inscribed an affix");
}

console.log("");
if (failures > 0) {
  console.error(`RESULT: ${failures} assertion(s) FAILED`);
  (globalThis as unknown as { process?: { exit: (n: number) => void } }).process?.exit(1);
  throw new Error(`${failures} assertion(s) failed`);
} else {
  console.log("RESULT: all UI assertions passed ✓");
}
