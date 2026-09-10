// Formatting helpers for displaying stats, modifiers, and items in the UI.

import { StatKey, STAT_NAMES, StatModifier } from "../game/stats.js";
import { Item } from "../game/items/item.js";
import { getAffix, tierOf } from "../game/items/affixes.js";

/** Stats that read best as percentages. */
const PERCENT_STATS = new Set<StatKey>([
  "critChance",
  "damageReduction",
]);

/** Stats where an "increased"/"flat" modifier is naturally a percentage. */
const INCREASED_AS_PERCENT = new Set<StatKey>([
  "physicalDamage",
  "fireDamage",
  "coldDamage",
  "lightningDamage",
  "attackSpeed",
  "moveSpeed",
  "minionDamage",
  "minionLife",
  "areaOfEffect",
]);

export function formatStatValue(stat: StatKey, value: number): string {
  if (PERCENT_STATS.has(stat)) return `${(value * 100).toFixed(1)}%`;
  if (stat === "critMultiplier") return `${(value * 100).toFixed(0)}%`;
  if (stat === "moveSpeed") return value.toFixed(0);
  if (
    stat === "physicalDamage" ||
    stat === "fireDamage" ||
    stat === "coldDamage" ||
    stat === "lightningDamage"
  ) {
    // These are stored as an additive multiplier bucket; show as %.
    return `${(value * 100).toFixed(0)}%`;
  }
  return value.toFixed(value < 10 ? 1 : 0);
}

/** Human-readable one-line description of a single modifier. */
export function formatModifier(mod: StatModifier): string {
  const name = STAT_NAMES[mod.stat];
  const asPercent =
    mod.kind === "increased" ||
    INCREASED_AS_PERCENT.has(mod.stat) ||
    PERCENT_STATS.has(mod.stat) ||
    mod.stat === "critMultiplier";

  if (mod.kind === "increased") {
    return `${signed(mod.value * 100)}% increased ${name}`;
  }
  if (mod.kind === "more") {
    return `${signed(mod.value * 100)}% more ${name}`;
  }
  // flat
  if (asPercent) {
    return `${signed(mod.value * 100)}% ${name}`;
  }
  return `${signed(mod.value)} ${name}`;
}

function signed(v: number): string {
  const rounded = Math.abs(v) < 10 ? Math.round(v * 10) / 10 : Math.round(v);
  return (v >= 0 ? "+" : "") + rounded;
}

/** Build the HTML lines for an item tooltip. */
export function itemTooltipHtml(item: Item): string {
  const base = item.base;
  const lines: string[] = [];
  lines.push(`<div class="tooltip-line implicit">${base.name} (iLvl ${base.itemLevel})</div>`);
  // Implicit.
  lines.push(
    `<div class="tooltip-line implicit">${formatModifier({
      stat: base.implicit.stat,
      kind: base.implicit.kind,
      value: base.implicit.value,
    })}</div>`
  );
  // Affixes.
  for (const roll of item.affixes) {
    const affix = getAffix(roll.affixId);
    const t = tierOf(affix, roll.tier);
    lines.push(
      `<div class="tooltip-line mod">${formatModifier({
        stat: affix.stat,
        kind: affix.kind,
        value: t.value,
      })} <span style="color:#6b7583">(T${roll.tier})</span></div>`
    );
  }
  return lines.join("");
}
