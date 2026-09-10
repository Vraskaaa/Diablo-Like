// Game orchestrator: owns the character, world, zone, camera, input, and UI.
// Translates input into player intents each frame, drives the simulation via
// the fixed-timestep loop, renders the world to canvas, and updates the DOM HUD.

import { GameLoop } from "../engine/loop.js";
import { Input } from "../engine/input.js";
import { Camera } from "../engine/camera.js";
import { generateArena, drawTileMap, TILE_SIZE } from "../engine/tilemap.js";
import { vec2 } from "../engine/math.js";
import { GameWorld } from "./world.js";
import { Player } from "./entities/player.js";
import { Enemy } from "./entities/enemy.js";
import { ZoneRunner, CRYPT_ZONE } from "./zone.js";
import { Character } from "./character.js";
import { ClassId } from "./classes.js";
import { getSkill } from "./skills.js";
import { xpForKill, xpToReachLevel, xpForNextLevel } from "./leveling.js";
import { DROP_TABLE, startingMaterials } from "./crafting/drops.js";
import { MaterialId } from "./crafting/materials.js";
import { Item } from "./items/item.js";
import { EquipSlot } from "./items/bases.js";
import { UI } from "../ui/ui.js";
import { saveCharacter, loadCharacter, clearSave } from "./persistence.js";

const KEY_TO_SKILL: Record<string, number> = { q: 0, w: 1, e: 2, r: 3 };

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private input: Input;
  private camera: Camera;
  private loop: GameLoop;
  private ui: UI;

  private character: Character | null = null;
  private world: GameWorld | null = null;
  private zone: ZoneRunner | null = null;
  private player: Player | null = null;

  private running = false;
  private gameOver = false;
  private activeSkillIndex = 0;
  private autosaveTimer = 0;

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");
    this.ctx = ctx;
    this.input = new Input(canvas);
    this.camera = new Camera(canvas.width, canvas.height);

    this.ui = new UI(uiRoot, {
      onSelectClass: (classId, name) => this.startNewGame(classId, name),
      onEquip: (item) => this.equip(item),
      onUnequip: (slot) => this.unequip(slot),
      onAllocateAttribute: (attr) => {
        this.character?.allocateAttribute(attr);
        this.refreshStats();
      },
      onCraftChanged: () => this.refreshStats(),
      getCharacter: () => this.character,
      onSkillClick: (i) => {
        this.activeSkillIndex = i;
        this.castActiveSkill();
      },
      onRestart: () => this.ui.showClassSelect(),
      onContinue: () => {
        const c = loadCharacter();
        if (c) this.beginRun(c);
        else this.ui.showClassSelect();
      },
      onDeleteSave: () => clearSave(),
      savedSummary: () => {
        const c = loadCharacter();
        if (!c) return null;
        return { name: c.name, className: c.classDef.name, level: c.level };
      },
    });

    this.loop = new GameLoop(
      { update: (dt) => this.update(dt), render: () => this.render() },
      60
    );
  }

  /** Boot into the class-select screen (or resume via loadInto). */
  boot(existing?: Character): void {
    this.loop.start();
    if (existing) {
      this.beginRun(existing);
    } else {
      this.ui.showClassSelect();
    }
  }

  private startNewGame(classId: ClassId, name: string): void {
    const c = new Character(name, classId);
    c.materials = { ...startingMaterials() } as Record<string, number>;
    saveCharacter(c); // persist immediately so "Continue" works right away
    this.beginRun(c);
  }

  private beginRun(character: Character): void {
    this.character = character;
    this.gameOver = false;
    this.ui.clearCenterMessage();

    const map = generateArena(24, 18, 1337);
    const world = new GameWorld(map, 20250910);
    this.world = world;

    const stats = character.computeStats();
    const player = new Player(
      { classDef: character.classDef, stats, level: character.level },
      { ...map.spawn },
      world
    );
    player.resources.fill(stats);
    player.onDeath = () => {};
    world.player = player;
    world.spawn(player);
    this.player = player;
    this.camera.snapTo(player.pos);

    world.onEnemyKilled = (enemy) => this.handleEnemyKilled(enemy);
    world.onPlayerDeath = () => this.handlePlayerDeath();
    world.onBossKilled = () => {};

    const zone = new ZoneRunner(world, CRYPT_ZONE);
    zone.onWaveStart = (wave) => {
      this.ui.showCenterMessage(wave.label, `${zone.currentWave + 1} / ${zone.totalWaves}`);
      setTimeout(() => {
        if (!this.gameOver) this.ui.clearCenterMessage();
      }, 1800);
    };
    zone.onZoneCleared = () => this.handleVictory();
    zone.start();
    this.zone = zone;

    this.ui.buildHud();
    this.running = true;
  }

  // ---- input -> player intent ----

  private handleInput(): void {
    if (!this.player || !this.world || this.gameOver) return;
    if (this.ui.isModalOpen()) return; // don't act while a panel is open

    // Toggle panels.
    if (this.input.wasPressed("c")) this.ui.showCharacter();
    if (this.input.wasPressed("i")) this.ui.showInventory();
    if (this.input.wasPressed("b")) this.ui.showCrafting();

    // Aim follows the mouse (screen -> world).
    const worldAim = this.camera.screenToWorld(this.input.mouse);
    this.player.aim = worldAim;

    // Left-click to move.
    if (this.input.mouseDown) {
      this.player.moveTarget = { ...worldAim };
    }

    // Skill hotkeys select + cast; right-click casts the active skill.
    for (const [key, idx] of Object.entries(KEY_TO_SKILL)) {
      if (this.input.isDown(key)) {
        this.activeSkillIndex = idx;
        this.castActiveSkill();
      }
    }
    if (this.input.rightMouseDown) {
      this.castActiveSkill();
    }
  }

  private castActiveSkill(): void {
    if (!this.player || !this.world || !this.character) return;
    const skillId = this.character.classDef.skills[this.activeSkillIndex];
    if (!skillId) return;
    this.player.tryCast(getSkill(skillId), this.world);
  }

  // ---- simulation ----

  private update(dt: number): void {
    if (!this.running) return;
    this.handleInput();

    if (this.world && !this.gameOver) {
      this.zone?.update(dt);
      this.world.update(dt);
      if (this.player) this.camera.follow(this.player.pos, 0.12);

      // Autosave every ~5s.
      this.autosaveTimer += dt;
      if (this.autosaveTimer >= 5) {
        this.autosaveTimer = 0;
        if (this.character) saveCharacter(this.character);
      }
    }

    this.input.postUpdate();
  }

  private handleEnemyKilled(enemy: Enemy): void {
    if (!this.character) return;
    // XP.
    const gained = this.character.gainXp(xpForKill(enemy.level, this.character.level));
    if (gained > 0 && this.world) {
      this.refreshStats(true);
      this.world.spawnFx("levelup", this.player!.pos, 60, "#f2d488");
      this.world.pushFloatingText("LEVEL UP!", this.player!.pos, "#f2d488");
    }
    // Deterministic material drop.
    const drop = DROP_TABLE[enemy.kind];
    for (const [id, amt] of Object.entries(drop)) {
      if (amt) this.character.addMaterial(id, amt);
    }
    if (this.world) {
      this.world.pushFloatingText("+loot", enemy.pos, "#9fb3c8");
    }
  }

  private handlePlayerDeath(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.running = false;
    this.ui.showGameOver(false);
  }

  private handleVictory(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.running = false;
    if (this.character) saveCharacter(this.character);
    this.ui.showGameOver(true);
  }

  // ---- equipment ----

  private equip(item: Item): void {
    if (!this.character) return;
    this.character.equip(item);
    this.refreshStats();
  }

  private unequip(slot: EquipSlot): void {
    if (!this.character) return;
    this.character.unequip(slot);
    this.refreshStats();
  }

  /** Recompute the player's live stats from the character (after gear/level). */
  private refreshStats(fillOnLevel = false): void {
    if (!this.character || !this.player) return;
    const stats = this.character.computeStats();
    this.player.level = this.character.level;
    this.player.setStats(stats);
    if (fillOnLevel) {
      // On level up, top off resources as a reward.
      this.player.resources.fill(stats);
    }
    if (this.character) saveCharacter(this.character);
  }

  // ---- rendering ----

  private render(): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#05070a";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.world) {
      drawTileMap(ctx, this.world.map, this.camera);
      this.world.draw(ctx, this.camera);
    }

    // HUD update.
    if (this.character && this.player && this.zone && !this.gameOver) {
      const c = this.character;
      const stats = this.player.stats;
      const curLevelXp = xpToReachLevel(c.level);
      const nextReq = xpForNextLevel(c.level);
      const intoLevel = c.totalXp - curLevelXp;
      const xpPct = nextReq === Infinity ? 1 : intoLevel / nextReq;

      const cooldowns = c.classDef.skills.map((id) => this.player!.getCooldown(id));
      const waveText = this.zone.cleared
        ? "Zone Cleared"
        : this.zone.waveActive
        ? `Enemies: ${this.zone.enemiesRemaining()}`
        : "Next wave incoming…";

      this.ui.updateHud({
        name: c.name,
        level: c.level,
        hp: this.player.resources.health,
        maxHp: stats.maxHealth,
        mana: this.player.resources.mana,
        maxMana: stats.maxMana,
        xpPct,
        waveText,
        waveSub: this.zone.zoneName,
        cooldowns,
        activeSkill: this.activeSkillIndex,
      });
    }
  }
}
