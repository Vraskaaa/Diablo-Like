// DOM overlay UI: class-select screen, HUD, character sheet, inventory, and the
// crafting bench. The UI reads from the Character and calls back into the Game
// for actions (equip, allocate, craft). Canvas draws the world; DOM draws the UI.
import { PLAYABLE_CLASSES, CLASSES } from "../game/classes.js";
import { RARITY_COLORS } from "../game/items/item.js";
import { EQUIP_SLOTS, SLOT_NAMES, ITEM_BASES } from "../game/items/bases.js";
import { ATTRIBUTES, ATTRIBUTE_NAMES, STAT_NAMES } from "../game/stats.js";
import { MATERIALS, MATERIAL_IDS, formatCost } from "../game/crafting/materials.js";
import { addableAffixes, permittedTiers, affixTierCost, fabricateCost, removeCost, addAffix, upgradeAffix, removeAffix, fabricateBase, } from "../game/crafting/crafting.js";
import { getAffix, tierOf } from "../game/items/affixes.js";
import { itemTooltipHtml, formatStatValue, formatModifier } from "./format.js";
import { getSkill } from "../game/skills.js";
export class UI {
    root;
    cb;
    craftingSelectedUid = null;
    constructor(root, cb) {
        this.root = root;
        this.cb = cb;
    }
    clear() {
        this.root.innerHTML = "";
    }
    // ---------------- Class selection ----------------
    showClassSelect() {
        this.clear();
        const saved = this.cb.savedSummary ? this.cb.savedSummary() : null;
        const screen = el("div", "screen");
        screen.innerHTML = `
      <div style="text-align:center">
        <h1>AETHERFALL</h1>
        <div class="subtitle">Choose your path into the Hollow Crypts</div>
        <div id="continue-row" style="margin-bottom:20px"></div>
        <div class="class-grid" id="class-grid"></div>
        <div class="name-row">
          <input id="hero-name" placeholder="Name your hero" maxlength="18" />
          <button class="primary" id="begin-btn" disabled>Begin New Hero</button>
        </div>
      </div>`;
        this.root.appendChild(screen);
        // Continue banner if a save exists.
        const contRow = screen.querySelector("#continue-row");
        if (saved) {
            const box = el("div");
            box.style.cssText =
                "display:inline-flex;gap:12px;align-items:center;background:var(--panel);border:1px solid var(--gold);border-radius:8px;padding:12px 18px";
            box.innerHTML = `<span style="color:var(--text)">Saved hero: <b style="color:var(--gold-bright)">${saved.name}</b> — Level ${saved.level} ${saved.className}</span>`;
            const cont = el("button", "primary");
            cont.textContent = "Continue";
            cont.addEventListener("click", () => this.cb.onContinue?.());
            const del = el("button", "tab-btn");
            del.textContent = "Delete";
            del.addEventListener("click", () => {
                this.cb.onDeleteSave?.();
                this.showClassSelect();
            });
            box.appendChild(cont);
            box.appendChild(del);
            contRow.appendChild(box);
        }
        const grid = screen.querySelector("#class-grid");
        let selected = null;
        for (const id of PLAYABLE_CLASSES) {
            const cls = CLASSES[id];
            const card = el("div", "class-card");
            card.innerHTML = `
        <div class="icon" style="background:${cls.color}"></div>
        <h3>${cls.name}</h3>
        <div class="title">${cls.title}</div>
        <p>${cls.description}</p>`;
            card.addEventListener("click", () => {
                selected = id;
                grid.querySelectorAll(".class-card").forEach((c) => c.style.removeProperty("border-color"));
                card.style.borderColor = cls.color;
                screen.querySelector("#begin-btn").disabled = false;
            });
            grid.appendChild(card);
        }
        const nameInput = screen.querySelector("#hero-name");
        const beginBtn = screen.querySelector("#begin-btn");
        beginBtn.addEventListener("click", () => {
            if (!selected)
                return;
            const name = nameInput.value.trim() || "Wanderer";
            this.cb.onSelectClass(selected, name);
        });
    }
    // ---------------- HUD ----------------
    hudEl = null;
    buildHud() {
        this.clear();
        const hud = el("div");
        hud.style.pointerEvents = "none";
        hud.innerHTML = `
      <div class="top-left">
        <div class="name" id="hud-name"></div>
        <div class="lvl" id="hud-lvl"></div>
      </div>
      <div class="hint-bar">Left-click move · Right-click / Q W E R skills · Aim with mouse · C Character · I Inventory · B Crafting</div>
      <div class="top-right">
        <div class="wave-banner" id="hud-wave"></div>
        <div class="wave-sub" id="hud-wave-sub"></div>
      </div>
      <div class="hud-bottom">
        <div class="orb hp"><div class="fill" id="hp-fill"></div><div class="label" id="hp-label"></div></div>
        <div class="skillbar" id="skillbar"></div>
        <div class="orb mana"><div class="fill" id="mana-fill"></div><div class="label" id="mana-label"></div></div>
      </div>
      <div class="buttons-right">
        <button class="tab-btn" id="btn-char">Character (C)</button>
        <button class="tab-btn" id="btn-inv">Inventory (I)</button>
        <button class="tab-btn" id="btn-craft">Crafting (B)</button>
      </div>
      <div class="xp-bar"><div class="fill" id="xp-fill"></div></div>
    `;
        this.root.appendChild(hud);
        this.hudEl = hud;
        hud.querySelector("#btn-char").addEventListener("click", () => this.showCharacter());
        hud.querySelector("#btn-inv").addEventListener("click", () => this.showInventory());
        hud.querySelector("#btn-craft").addEventListener("click", () => this.showCrafting());
        this.buildSkillbar();
    }
    buildSkillbar() {
        const c = this.cb.getCharacter();
        if (!c || !this.hudEl)
            return;
        const bar = this.hudEl.querySelector("#skillbar");
        bar.innerHTML = "";
        const keys = ["Q", "W", "E", "R"];
        c.classDef.skills.forEach((skillId, i) => {
            const skill = getSkill(skillId);
            const slot = el("div", "skill-slot");
            slot.innerHTML = `<span class="key">${keys[i] ?? ""}</span>${skill.icon}<div class="cd" id="cd-${i}" style="display:none"></div>`;
            slot.title = `${skill.name}\n${skill.description}\nMana: ${skill.manaCost}${skill.cooldown ? ` · CD ${skill.cooldown}s` : ""}`;
            slot.style.pointerEvents = "auto";
            slot.addEventListener("mousedown", (e) => {
                e.preventDefault();
                this.cb.onSkillClick(i);
            });
            bar.appendChild(slot);
        });
    }
    /** Called each frame with live values. */
    updateHud(data) {
        if (!this.hudEl)
            return;
        const q = (id) => this.hudEl.querySelector(id);
        q("#hud-name").textContent = data.name;
        q("#hud-lvl").textContent = `Level ${data.level}`;
        q("#hp-fill").style.height = `${clampPct(data.hp / data.maxHp)}%`;
        q("#hp-label").textContent = `${Math.ceil(data.hp)}/${Math.round(data.maxHp)}`;
        q("#mana-fill").style.height = `${clampPct(data.mana / data.maxMana)}%`;
        q("#mana-label").textContent = `${Math.ceil(data.mana)}/${Math.round(data.maxMana)}`;
        q("#xp-fill").style.width = `${clampPct(data.xpPct)}%`;
        q("#hud-wave").textContent = data.waveText;
        q("#hud-wave-sub").textContent = data.waveSub;
        data.cooldowns.forEach((cd, i) => {
            const cdEl = this.hudEl.querySelector(`#cd-${i}`);
            if (!cdEl)
                return;
            if (cd > 0.05) {
                cdEl.style.display = "flex";
                cdEl.textContent = cd.toFixed(1);
            }
            else {
                cdEl.style.display = "none";
            }
        });
        const slots = this.hudEl.querySelectorAll(".skill-slot");
        slots.forEach((s, i) => s.classList.toggle("active", i === data.activeSkill));
    }
    // ---------------- Modal helper ----------------
    modal = null;
    openModal(title, bodyBuilder) {
        this.closeModal();
        const modal = el("div", "modal");
        const panel = el("div", "panel");
        const h = el("h2");
        h.innerHTML = `<span>${title}</span><span class="close">✕</span>`;
        h.querySelector(".close").addEventListener("click", () => this.closeModal());
        panel.appendChild(h);
        const body = el("div");
        panel.appendChild(body);
        modal.appendChild(panel);
        modal.addEventListener("mousedown", (e) => {
            if (e.target === modal)
                this.closeModal();
        });
        this.root.appendChild(modal);
        this.modal = modal;
        bodyBuilder(body);
    }
    closeModal() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
    }
    isModalOpen() {
        return this.modal !== null;
    }
    // ---------------- Character sheet ----------------
    showCharacter() {
        const c = this.cb.getCharacter();
        if (!c)
            return;
        this.openModal("Character", (body) => {
            const stats = c.computeStats();
            const wrap = el("div", "two-col");
            // Left: attributes.
            const left = el("div", "col");
            left.innerHTML = `<h3 style="color:var(--gold-bright);margin-bottom:8px">${c.classDef.name} · Level ${c.level}</h3>`;
            const ap = el("div");
            ap.style.color = "var(--gold)";
            ap.textContent = `Unspent attribute points: ${c.unspentAttributePoints}`;
            left.appendChild(ap);
            for (const attr of ATTRIBUTES) {
                const row = el("div", "attr-row");
                const plus = el("div", "plus");
                plus.textContent = "+";
                if (c.unspentAttributePoints <= 0)
                    plus.style.opacity = "0.3";
                plus.addEventListener("click", () => {
                    this.cb.onAllocateAttribute(attr);
                    this.showCharacter();
                });
                const label = el("div");
                label.style.flex = "1";
                label.innerHTML = `<span class="k">${ATTRIBUTE_NAMES[attr]}</span> <span class="v">${c.attributes[attr]}</span>`;
                row.appendChild(plus);
                row.appendChild(label);
                left.appendChild(row);
            }
            // Right: derived stats.
            const right = el("div", "col");
            right.innerHTML = `<h3 style="color:var(--gold-bright);margin-bottom:8px">Statistics</h3>`;
            const showStats = [
                "maxHealth", "maxMana", "healthRegen", "manaRegen", "moveSpeed",
                "physicalDamage", "fireDamage", "coldDamage", "lightningDamage",
                "attackSpeed", "critChance", "critMultiplier", "armor", "damageReduction",
                "minionDamage", "minionLife", "areaOfEffect", "projectileCount",
            ];
            for (const s of showStats) {
                const line = el("div", "stat-line");
                line.innerHTML = `<span class="k">${STAT_NAMES[s]}</span><span class="v">${formatStatValue(s, stats[s])}</span>`;
                right.appendChild(line);
            }
            wrap.appendChild(left);
            wrap.appendChild(right);
            body.appendChild(wrap);
        });
    }
    // ---------------- Inventory ----------------
    showInventory() {
        const c = this.cb.getCharacter();
        if (!c)
            return;
        this.openModal("Inventory & Equipment", (body) => {
            const wrap = el("div", "two-col");
            // Equipment.
            const left = el("div", "col");
            left.innerHTML = `<h3 style="color:var(--gold-bright);margin-bottom:8px">Equipped</h3>`;
            const eqGrid = el("div", "slot-grid");
            for (const slot of EQUIP_SLOTS) {
                const cell = el("div");
                const box = el("div", "equip-cell");
                const item = c.equipment[slot];
                if (item) {
                    box.textContent = item.base.glyph;
                    box.style.borderColor = RARITY_COLORS[item.rarity];
                    box.title = item.displayName();
                    this.attachTooltip(box, item);
                    box.addEventListener("click", () => {
                        this.cb.onUnequip(slot);
                        this.showInventory();
                    });
                }
                cell.appendChild(box);
                const lbl = el("div", "equip-slot-label");
                lbl.textContent = SLOT_NAMES[slot];
                cell.appendChild(lbl);
                eqGrid.appendChild(cell);
            }
            left.appendChild(eqGrid);
            // Inventory bag.
            const right = el("div", "col");
            right.innerHTML = `<h3 style="color:var(--gold-bright);margin-bottom:8px">Bag (click to equip)</h3>`;
            const bag = el("div", "inv-grid");
            if (c.inventory.length === 0) {
                const empty = el("div");
                empty.style.color = "var(--text-dim)";
                empty.textContent = "Empty. Fabricate & craft gear at the Crafting bench (B).";
                right.appendChild(empty);
            }
            for (const item of c.inventory) {
                const cell = el("div", "inv-cell");
                cell.textContent = item.base.glyph;
                cell.style.borderColor = RARITY_COLORS[item.rarity];
                cell.title = item.displayName();
                this.attachTooltip(cell, item);
                cell.addEventListener("click", () => {
                    this.cb.onEquip(item);
                    this.showInventory();
                });
                bag.appendChild(cell);
            }
            right.appendChild(bag);
            wrap.appendChild(left);
            wrap.appendChild(right);
            body.appendChild(wrap);
        });
    }
    attachTooltip(cell, item) {
        let tip = null;
        cell.addEventListener("mouseenter", () => {
            tip = el("div", "panel");
            tip.style.position = "fixed";
            tip.style.zIndex = "999";
            tip.style.pointerEvents = "none";
            tip.style.maxWidth = "260px";
            tip.innerHTML =
                `<div style="color:${RARITY_COLORS[item.rarity]};font-weight:bold;margin-bottom:4px">${item.displayName()}</div>` +
                    itemTooltipHtml(item);
            document.body.appendChild(tip);
            const r = cell.getBoundingClientRect();
            tip.style.left = `${r.right + 8}px`;
            tip.style.top = `${r.top}px`;
        });
        cell.addEventListener("mouseleave", () => {
            if (tip)
                tip.remove();
            tip = null;
        });
    }
    // ---------------- Crafting bench ----------------
    showCrafting() {
        const c = this.cb.getCharacter();
        if (!c)
            return;
        this.openModal("Crafting Bench — Deterministic (no RNG)", (body) => {
            // Materials strip.
            const mats = el("div", "mats");
            for (const id of MATERIAL_IDS) {
                const m = MATERIALS[id];
                const chip = el("div", "mat");
                chip.innerHTML = `<span style="color:${m.color}">${m.glyph}</span> ${m.name}: <b>${c.materialCount(id)}</b>`;
                chip.title = m.description;
                mats.appendChild(chip);
            }
            body.appendChild(mats);
            const note = el("div");
            note.style.color = "var(--text-dim)";
            note.style.fontSize = "12px";
            note.style.margin = "4px 0 12px";
            note.textContent =
                "Pick an exact affix and tier — the result is guaranteed. No slamming, no gambling.";
            body.appendChild(note);
            const wrap = el("div", "two-col");
            // Left: fabricate + item list.
            const left = el("div", "col");
            left.innerHTML = `<h3 style="color:var(--gold-bright);margin-bottom:8px">Fabricate a Base</h3>`;
            const baseSelect = el("select");
            baseSelect.style.cssText =
                "background:var(--panel-2);color:var(--text);border:1px solid var(--border);padding:6px;border-radius:5px;width:100%;margin-bottom:6px";
            for (const b of ITEM_BASES) {
                const opt = document.createElement("option");
                opt.value = b.id;
                opt.textContent = `${b.glyph} ${b.name} (iLvl ${b.itemLevel}) — ${formatCost(fabricateCost(b))}`;
                baseSelect.appendChild(opt);
            }
            left.appendChild(baseSelect);
            const fabBtn = el("button", "craft-btn");
            fabBtn.textContent = "Fabricate";
            fabBtn.addEventListener("click", () => {
                const res = fabricateBase(c, baseSelect.value, true);
                if (!res.ok) {
                    this.flash(res.reason ?? "Cannot fabricate");
                }
                else {
                    this.craftingSelectedUid = res.preview.uid;
                    this.cb.onCraftChanged();
                    this.showCrafting();
                }
            });
            left.appendChild(fabBtn);
            left.appendChild(el("div", undefined, { style: "height:14px" }));
            const selectHeading = el("h3");
            selectHeading.style.cssText = "color:var(--gold-bright);margin:8px 0";
            selectHeading.textContent = "Select an Item to Craft";
            left.appendChild(selectHeading);
            const itemList = el("div", "craft-list");
            const craftable = c.inventory;
            if (craftable.length === 0) {
                const empty = el("div");
                empty.style.color = "var(--text-dim)";
                empty.textContent = "Fabricate a base above to begin crafting.";
                itemList.appendChild(empty);
            }
            for (const item of craftable) {
                const row = el("div", "craft-row");
                row.style.cursor = "pointer";
                if (item.uid === this.craftingSelectedUid)
                    row.style.borderColor = "var(--gold-bright)";
                row.innerHTML = `<div class="info"><span style="color:${RARITY_COLORS[item.rarity]}">${item.base.glyph} ${item.displayName()}</span><br><span class="cost">iLvl ${item.itemLevel} · ${item.affixes.length} affixes</span></div>`;
                row.addEventListener("click", () => {
                    this.craftingSelectedUid = item.uid;
                    this.showCrafting();
                });
                itemList.appendChild(row);
            }
            left.appendChild(itemList);
            // Right: crafting actions on the selected item.
            const right = el("div", "col");
            right.style.minWidth = "360px";
            const selected = c.inventory.find((i) => i.uid === this.craftingSelectedUid) ?? null;
            this.buildCraftActions(right, c, selected);
            wrap.appendChild(left);
            wrap.appendChild(right);
            body.appendChild(wrap);
        });
    }
    buildCraftActions(right, c, item) {
        right.innerHTML = `<h3 style="color:var(--gold-bright);margin-bottom:8px">Crafting Actions</h3>`;
        if (!item) {
            const p = el("div");
            p.style.color = "var(--text-dim)";
            p.textContent = "Select an item from the left to craft on it.";
            right.appendChild(p);
            return;
        }
        // Current item preview.
        const preview = el("div", "panel");
        preview.style.marginBottom = "10px";
        preview.innerHTML =
            `<div style="color:${RARITY_COLORS[item.rarity]};font-weight:bold;margin-bottom:4px">${item.displayName()}</div>` +
                itemTooltipHtml(item);
        right.appendChild(preview);
        // Equip button.
        const equipBtn = el("button", "craft-btn");
        equipBtn.textContent = `Equip this ${SLOT_NAMES[item.slot]}`;
        equipBtn.style.marginBottom = "10px";
        equipBtn.addEventListener("click", () => {
            this.cb.onEquip(item);
            this.craftingSelectedUid = null;
            this.cb.onCraftChanged();
            this.showCrafting();
        });
        right.appendChild(equipBtn);
        // ---- Add affix ----
        const addHeading = el("div");
        addHeading.style.cssText = "color:var(--gold);margin:6px 0 4px";
        addHeading.textContent = "Add an Affix";
        right.appendChild(addHeading);
        const addList = el("div", "craft-list");
        const options = addableAffixes(item);
        if (options.length === 0) {
            const none = el("div");
            none.style.color = "var(--text-dim)";
            none.style.fontSize = "12px";
            none.textContent = "No further affixes can be added (caps reached or none valid for this slot).";
            addList.appendChild(none);
        }
        for (const affix of options) {
            const tiers = permittedTiers(item, affix);
            if (tiers.length === 0)
                continue;
            const row = el("div", "craft-row");
            const tierSelect = el("select");
            tierSelect.style.cssText =
                "background:var(--panel-2);color:var(--text);border:1px solid var(--border);border-radius:4px";
            for (const t of tiers) {
                const tv = tierOf(affix, t);
                const opt = document.createElement("option");
                opt.value = String(t);
                opt.textContent = `T${t} (${formatModifier({ stat: affix.stat, kind: affix.kind, value: tv.value })})`;
                tierSelect.appendChild(opt);
            }
            const info = el("div", "info");
            info.innerHTML = `<b style="color:#6f8fff">${affix.name}</b> <span class="cost" id="cost-${affix.id}"></span>`;
            const addBtn = el("button", "craft-btn");
            addBtn.textContent = "Add";
            const updateCost = () => {
                const t = Number(tierSelect.value);
                const cost = affixTierCost(affix, t);
                info.querySelector(`#cost-${affix.id}`).textContent = `— ${formatCost(cost)}`;
            };
            tierSelect.addEventListener("change", updateCost);
            updateCost();
            addBtn.addEventListener("click", () => {
                const t = Number(tierSelect.value);
                const res = addAffix(c, item, affix.id, t, true);
                if (!res.ok)
                    this.flash(res.reason ?? "Cannot add");
                else {
                    this.cb.onCraftChanged();
                    this.showCrafting();
                }
            });
            row.appendChild(info);
            row.appendChild(tierSelect);
            row.appendChild(addBtn);
            addList.appendChild(row);
        }
        right.appendChild(addList);
        // ---- Modify existing affixes (upgrade / remove) ----
        if (item.affixes.length > 0) {
            const modHeading = el("div");
            modHeading.style.cssText = "color:var(--gold);margin:10px 0 4px";
            modHeading.textContent = "Modify Existing Affixes";
            right.appendChild(modHeading);
            const modList = el("div", "craft-list");
            for (const roll of [...item.affixes]) {
                const affix = getAffix(roll.affixId);
                const row = el("div", "craft-row");
                const info = el("div", "info");
                info.innerHTML = `<b style="color:#6f8fff">${affix.name}</b> <span class="cost">T${roll.tier}</span>`;
                row.appendChild(info);
                // Upgrade (if not tier 1 and item level permits).
                const canUpgrade = roll.tier > 1 && item.itemLevel >= tierOf(affix, roll.tier - 1).itemLevel;
                const upBtn = el("button", "craft-btn");
                upBtn.textContent = canUpgrade ? `↑ T${roll.tier - 1} (${formatCost(affixTierCost(affix, roll.tier - 1))})` : "Max";
                upBtn.disabled = !canUpgrade;
                upBtn.addEventListener("click", () => {
                    const res = upgradeAffix(c, item, roll.affixId, true);
                    if (!res.ok)
                        this.flash(res.reason ?? "Cannot upgrade");
                    else {
                        this.cb.onCraftChanged();
                        this.showCrafting();
                    }
                });
                row.appendChild(upBtn);
                // Remove.
                const rmBtn = el("button", "craft-btn");
                rmBtn.textContent = `Remove (${formatCost(removeCost())})`;
                rmBtn.addEventListener("click", () => {
                    const res = removeAffix(c, item, roll.affixId, true);
                    if (!res.ok)
                        this.flash(res.reason ?? "Cannot remove");
                    else {
                        this.cb.onCraftChanged();
                        this.showCrafting();
                    }
                });
                row.appendChild(rmBtn);
                modList.appendChild(row);
            }
            right.appendChild(modList);
        }
    }
    // ---------------- Center messages ----------------
    showCenterMessage(big, small, death = false) {
        const existing = this.root.querySelector(".center-msg");
        if (existing)
            existing.remove();
        const msg = el("div", `center-msg${death ? " death" : ""}`);
        msg.innerHTML = `<div class="big">${big}</div><div class="small">${small}</div>`;
        this.root.appendChild(msg);
    }
    clearCenterMessage() {
        const existing = this.root.querySelector(".center-msg");
        if (existing)
            existing.remove();
    }
    showGameOver(victory) {
        this.closeModal();
        this.clear();
        const screen = el("div", "screen");
        screen.innerHTML = `
      <div style="text-align:center">
        <h1 style="color:${victory ? "var(--gold-bright)" : "#e0503f"}">${victory ? "VICTORY" : "YOU HAVE FALLEN"}</h1>
        <div class="subtitle">${victory ? "Malgareth is vanquished. The Hollow Crypts fall silent." : "The dark claims another hero."}</div>
        <button class="primary" id="restart-btn">Return to Character Select</button>
      </div>`;
        this.root.appendChild(screen);
        screen.querySelector("#restart-btn").addEventListener("click", () => this.cb.onRestart());
    }
    flash(text) {
        const f = el("div");
        f.textContent = text;
        f.style.cssText =
            "position:fixed;top:20%;left:50%;transform:translateX(-50%);background:#2a1416;border:1px solid #e0503f;color:#ffbcb4;padding:8px 16px;border-radius:6px;z-index:9999;font-size:13px";
        document.body.appendChild(f);
        setTimeout(() => f.remove(), 1800);
    }
}
// ---- tiny DOM helper ----
function el(tag, className, attrs) {
    const e = document.createElement(tag);
    if (className)
        e.className = className;
    if (attrs)
        for (const [k, v] of Object.entries(attrs))
            e.setAttribute(k, v);
    return e;
}
function clampPct(v) {
    return Math.max(0, Math.min(100, v * 100));
}
//# sourceMappingURL=ui.js.map