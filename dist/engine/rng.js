// A small seeded pseudo-random generator (mulberry32).
//
// DESIGN NOTE: Aetherfall's *gameplay-defining* systems — crafting outcomes and
// combat damage — are fully DETERMINISTIC and do NOT use this RNG. This
// generator exists only for cosmetic/procedural variety (decorative tile
// choices, ambient particle jitter, enemy spawn placement) where variety is
// desirable and has no bearing on player-facing determinism guarantees.
export class RNG {
    state;
    constructor(seed) {
        // Ensure a non-zero 32-bit state.
        this.state = seed >>> 0 || 0x9e3779b9;
    }
    /** Next float in [0, 1). */
    next() {
        this.state |= 0;
        this.state = (this.state + 0x6d2b79f5) | 0;
        let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    /** Integer in [min, max] inclusive. */
    int(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }
    float(min, max) {
        return this.next() * (max - min) + min;
    }
    pick(arr) {
        return arr[Math.floor(this.next() * arr.length)];
    }
    chance(p) {
        return this.next() < p;
    }
}
//# sourceMappingURL=rng.js.map