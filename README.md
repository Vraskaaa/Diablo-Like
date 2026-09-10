# Aetherfall

A high-fantasy action RPG (Diablo / Path of Exile 2–style) that runs entirely in
the browser. Built in **TypeScript + HTML5 Canvas with zero external
dependencies** — no game engine, no npm packages, no bundler.

Its defining feature is a **fully deterministic, non-RNG crafting system**: you
choose the exact modifier and tier you want and pay a known material cost. No
gambling, no slamming, no wasted currency.

---

## How to play

Because the game is pure static files, you just need to serve the folder (or open
`index.html`) in a modern browser.

### Quickest way (already built)

The compiled output in `dist/` is committed, so you can run it with any static
file server:

```bash
# from the project root
python3 -m http.server 8000
# then open http://localhost:8000 in your browser
```

> Opening `index.html` via a plain `file://` URL may be blocked by the browser's
> ES-module security rules — use a static server as shown above.

### Building from source

```bash
./build.sh          # compiles src/ -> dist/
# or:
npm run build
```

If `tsc` fails to start in your shell with a `proxy-bootstrap` error, run
`unset NODE_OPTIONS` first (a sandbox quirk; harmless elsewhere).

---

## Controls

| Input | Action |
|-------|--------|
| **Left-click** | Move to point |
| **Mouse** | Aim skills |
| **Q / W / E / R** | Cast skill 1–4 (also selects it as active) |
| **Right-click** | Cast the currently active skill |
| **C** | Character sheet (stats & attribute points) |
| **I** | Inventory & equipment |
| **B** | Crafting bench |

Clear five escalating waves in **The Hollow Crypts** and defeat the boss,
**Malgareth, the Hollow King**.

---

## Classes

Four archetypes, each with four unique skills and a distinct stat identity:

- **Warrior** — *The Ironclad Vanguard.* Melee juggernaut (Cleave, Shield Slam,
  War Cry, Whirlwind). Scales with Strength; high life & armour.
- **Ranger** — *The Stormfletch Archer.* Ranged marksman (Power Shot, Multishot,
  Poison Arrow, Dash). Scales with Dexterity; attack speed & crits.
- **Summoner** — *The Bone Sovereign.* Commands minions (Raise Skeleton, Summon
  Golem, Bone Spear, Command). Minions scale with the Summoner's Intelligence.
- **Elementalist** — *The Aether Weaver.* Elemental caster (Fireball, Frost Nova,
  Chain Lightning, Teleport). Glass-cannon fire/cold/lightning damage.

---

## The deterministic crafting system

This is the heart of the game and the design constraint it was built around:
**crafting outcomes are never random.**

**Approach: recipes + player-chosen affixes (fully deterministic).**

1. **Fabricate a base.** Spend materials to create any item base (weapon, armour,
   jewelry). The base has an item level that gates which affix tiers you may use.
2. **Inscribe affixes you choose.** Pick an exact affix *and* an exact tier. Each
   tier has a **fixed value** (not a range), so the result is always identical.
   Items can hold up to 3 prefixes and 3 suffixes, one per modifier group.
3. **Upgrade or remove.** Improve an existing affix one tier at a time, or cleanly
   strip an affix — again for a known, fixed cost.

### Materials

| Material | Use |
|----------|-----|
| Aether Shard | Base fabrication & low-tier affixes |
| Vital Essence | Mid-tier affixes & tier upgrades |
| Elder Rune | High-tier affixes |
| Dissolving Catalyst | Removing affixes |
| Prime Sigil | Unlocking the pinnacle Tier 1 of any affix |

Materials drop from enemies in **fixed amounts per enemy type** — even the loot
flow is non-random, reinforcing the "no gambling" identity end to end.

---

## Progression

- **Attributes:** Strength, Dexterity, Intelligence, Vitality. Each level grants
  points you allocate on the Character screen (C).
- **Derived stats:** life, mana, damage by type, attack speed, crit, armour,
  minion power, area, projectiles, and more — all computed deterministically
  from attributes + class identity + equipped/crafted gear.
- **Saving:** your hero (level, attributes, equipment, inventory, materials)
  autosaves to browser local storage. Use **Continue** on the title screen to
  resume.

---

## Architecture

```
src/
  engine/        Reusable, game-agnostic pieces
    math.ts        vectors & helpers
    loop.ts        fixed-timestep game loop (60 ups)
    input.ts       keyboard + mouse state
    camera.ts      world <-> screen transforms
    tilemap.ts     tile world + collision + rendering
    entity.ts      base Entity + World interface
    rng.ts         seeded RNG (COSMETIC ONLY — never gameplay/crafting)
  game/
    stats.ts       attributes, stat keys, flat/increased/more pipeline
    damage.ts      deterministic damage packets & mitigation
    leveling.ts    XP curve & rewards
    resources.ts   health/mana pools
    classes.ts     the four archetypes
    skills.ts      all 16 skills + effects interface
    character.ts   persistent hero model (stats aggregation, save)
    world.ts       GameWorld: simulation + combat side-effects
    zone.ts        wave/boss pacing
    game.ts        orchestrator: input -> intent, loop, HUD
    persistence.ts local-storage save/load
    entities/      player, enemy, minion, projectile, effect, combatant
    items/         affixes (tier tables), bases, item instances
    crafting/      materials, deterministic crafting ops, drop tables
  ui/
    ui.ts          DOM overlay: class select, HUD, inventory, crafting bench
    format.ts      stat/modifier/tooltip formatting
  tests/           headless self-checks (no browser needed)
```

### Design notes

- **Determinism.** Crafting and base damage are fully deterministic. The only
  probabilistic element in combat is a critical-strike roll, which is isolated
  and injectable. The seeded RNG (`engine/rng.ts`) is used *only* for cosmetic
  variety (terrain decoration, spawn placement).
- **Data-driven.** Classes, skills, affixes, bases, enemies, and waves are all
  plain data, so the content can be expanded without touching engine code.

---

## Tests

Three headless suites verify the systems that most need to be correct:

```bash
./build.sh
node dist/tests/craft.test.js     # crafting determinism, validation, cost model
node dist/tests/smoke.test.js     # full sim: combat, waves, minions (no browser)
node dist/tests/persist.test.js   # save/load round-trip
```

All three should print `all ... assertions passed ✓`.

---

## Roadmap (post-vertical-slice)

- More zones and a hub town
- Skill points / passive tree (skill points already accrue on level-up)
- Second ring slot, flasks, and unique items
- Additional affixes and crafting recipes (imprint/transfer)
- Sprite art to replace the current geometric rendering

## License

MIT
