// The deterministic crafting engine.
//
// CORE PRINCIPLE: every crafting operation produces an EXACT, PRE-DETERMINED
// result chosen by the player. There is no randomness anywhere in this file.
// The player selects the affix and the tier; the cost is a pure function of
// that selection; the resulting item is fully determined.
//
// Operations (approach D — recipes + chosen affixes):
//   1. fabricateBase(baseId)              -> create a Normal item from materials
//   2. addAffix(item, affixId, tier)      -> inscribe a chosen affix at a tier
//   3. upgradeAffix(item, affixId)        -> improve an existing affix one tier
//   4. removeAffix(item, affixId)         -> cleanly strip a chosen affix
//   5. augmentTier(item, affixId, tier)   -> set an existing affix to a tier
//
// Each returns a CraftResult describing feasibility, cost, and (on preview) the
// resulting item, so the UI can show costs BEFORE committing.
import { Item, MAX_PREFIXES, MAX_SUFFIXES } from "../items/item.js";
import { getBase } from "../items/bases.js";
import { getAffix, affixesForSlot, tierOf, } from "../items/affixes.js";
// ---------------------------------------------------------------------------
// Deterministic cost model. Cost is a pure function of the operation and the
// exact tier chosen. Better tiers cost more and require rarer materials.
// ---------------------------------------------------------------------------
/** Material cost to add or set an affix to a specific tier. */
export function affixTierCost(affix, tier) {
    const t = tierOf(affix, tier);
    // Tier 1 is the best. Lower tier number => higher cost + rarer materials.
    const cost = {};
    if (tier === 1) {
        cost.prime = 1;
        cost.rune = 2;
        cost.essence = 3;
    }
    else if (tier === 2) {
        cost.rune = 2;
        cost.essence = 3;
        cost.shard = 4;
    }
    else if (tier === 3) {
        cost.essence = 3;
        cost.shard = 5;
    }
    else if (tier === 4) {
        cost.essence = 1;
        cost.shard = 4;
    }
    else {
        cost.shard = 3;
    }
    // Scale slightly with the item level requirement of the tier.
    if (t.itemLevel >= 45)
        cost.rune = (cost.rune ?? 0) + 1;
    return cost;
}
export function fabricateCost(base) {
    // Higher item-level bases cost more shards and some essence.
    const shards = 3 + Math.floor(base.itemLevel / 5);
    const cost = { shard: shards };
    if (base.itemLevel >= 20)
        cost.essence = 2;
    if (base.itemLevel >= 40)
        cost.rune = 1;
    return cost;
}
export function removeCost() {
    return { catalyst: 1 };
}
// ---------------------------------------------------------------------------
// Validation helpers.
// ---------------------------------------------------------------------------
function countByType(item, type) {
    return item.affixes.filter((a) => getAffix(a.affixId).type === type).length;
}
function canHostAffix(item, affix) {
    if (!affix.allowedSlots.includes(item.slot)) {
        return { ok: false, reason: `${affix.name} cannot be placed on a ${item.slot}.` };
    }
    if (item.hasGroup(affix.group)) {
        return { ok: false, reason: `This item already has a ${affix.group.replace("_", " ")} modifier.` };
    }
    if (affix.type === "prefix" && countByType(item, "prefix") >= MAX_PREFIXES) {
        return { ok: false, reason: "This item already has the maximum number of prefixes (3)." };
    }
    if (affix.type === "suffix" && countByType(item, "suffix") >= MAX_SUFFIXES) {
        return { ok: false, reason: "This item already has the maximum number of suffixes (3)." };
    }
    return { ok: true };
}
function tierAllowedByItemLevel(item, affix, tier) {
    const t = tierOf(affix, tier);
    return item.itemLevel >= t.itemLevel;
}
// ---------------------------------------------------------------------------
// Operations. `commit=false` returns a preview + cost without spending.
// When `commit=true` and the character can afford it, materials are spent and
// the (mutated clone) item is returned in `preview`.
// ---------------------------------------------------------------------------
export function fabricateBase(character, baseId, commit) {
    const base = getBase(baseId);
    const cost = fabricateCost(base);
    if (commit) {
        if (!character.spendMaterials(cost)) {
            return { ok: false, reason: "Not enough materials.", cost };
        }
        const item = new Item(baseId, []);
        character.addItem(item);
        return { ok: true, cost, preview: item };
    }
    return { ok: true, cost, preview: new Item(baseId, []) };
}
export function addAffix(character, item, affixId, tier, commit) {
    const affix = getAffix(affixId);
    const cost = affixTierCost(affix, tier);
    const host = canHostAffix(item, affix);
    if (!host.ok)
        return { ok: false, reason: host.reason, cost };
    if (!tierAllowedByItemLevel(item, affix, tier)) {
        return {
            ok: false,
            reason: `This item's level is too low for tier ${tier} of ${affix.name}.`,
            cost,
        };
    }
    const preview = item.clone();
    preview.affixes.push({ affixId, tier });
    if (commit) {
        if (!character.spendMaterials(cost)) {
            return { ok: false, reason: "Not enough materials.", cost };
        }
        item.affixes.push({ affixId, tier });
        return { ok: true, cost, preview: item };
    }
    return { ok: true, cost, preview };
}
export function upgradeAffix(character, item, affixId, commit) {
    const affix = getAffix(affixId);
    const existing = item.affixes.find((a) => a.affixId === affixId);
    if (!existing) {
        return { ok: false, reason: "That affix is not on this item.", cost: {} };
    }
    if (existing.tier <= 1) {
        return { ok: false, reason: `${affix.name} is already at the best tier.`, cost: {} };
    }
    const newTier = existing.tier - 1;
    const cost = affixTierCost(affix, newTier);
    if (!tierAllowedByItemLevel(item, affix, newTier)) {
        return {
            ok: false,
            reason: `This item's level is too low for tier ${newTier} of ${affix.name}.`,
            cost,
        };
    }
    const preview = item.clone();
    const pv = preview.affixes.find((a) => a.affixId === affixId);
    pv.tier = newTier;
    if (commit) {
        if (!character.spendMaterials(cost)) {
            return { ok: false, reason: "Not enough materials.", cost };
        }
        existing.tier = newTier;
        return { ok: true, cost, preview: item };
    }
    return { ok: true, cost, preview };
}
export function removeAffix(character, item, affixId, commit) {
    const existing = item.affixes.find((a) => a.affixId === affixId);
    if (!existing) {
        return { ok: false, reason: "That affix is not on this item.", cost: {} };
    }
    const cost = removeCost();
    const preview = item.clone();
    preview.affixes = preview.affixes.filter((a) => a.affixId !== affixId);
    if (commit) {
        if (!character.spendMaterials(cost)) {
            return { ok: false, reason: "Not enough materials.", cost };
        }
        item.affixes = item.affixes.filter((a) => a.affixId !== affixId);
        return { ok: true, cost, preview: item };
    }
    return { ok: true, cost, preview };
}
// ---------------------------------------------------------------------------
// Query helpers for the crafting UI.
// ---------------------------------------------------------------------------
/** Affixes that could legally be ADDED to this item right now. */
export function addableAffixes(item) {
    return affixesForSlot(item.slot).filter((affix) => canHostAffix(item, affix).ok);
}
/** The tiers of an affix that this item's level permits. */
export function permittedTiers(item, affix) {
    return affix.tiers
        .filter((t) => item.itemLevel >= t.itemLevel)
        .map((t) => t.tier)
        .sort((a, b) => a - b);
}
//# sourceMappingURL=crafting.js.map