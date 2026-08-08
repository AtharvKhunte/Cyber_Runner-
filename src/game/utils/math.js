export const clamp  = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lerp   = (a, b, t)   => a + (b - a) * t;
export const dist2D = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
