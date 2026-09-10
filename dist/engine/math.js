// Small, dependency-free math utilities used across the engine and game.
export function vec2(x = 0, y = 0) {
    return { x, y };
}
export function add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y };
}
export function sub(a, b) {
    return { x: a.x - b.x, y: a.y - b.y };
}
export function scale(a, s) {
    return { x: a.x * s, y: a.y * s };
}
export function length(a) {
    return Math.hypot(a.x, a.y);
}
export function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}
export function normalize(a) {
    const len = Math.hypot(a.x, a.y);
    if (len === 0)
        return { x: 0, y: 0 };
    return { x: a.x / len, y: a.y / len };
}
export function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
}
export function lerp(a, b, t) {
    return a + (b - a) * t;
}
/** Angle in radians from a -> b. */
export function angleTo(a, b) {
    return Math.atan2(b.y - a.y, b.x - a.x);
}
/** Axis-aligned circle overlap test. */
export function circlesOverlap(a, ar, b, br) {
    const r = ar + br;
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy <= r * r;
}
//# sourceMappingURL=math.js.map