/**
 * BulletSystem.js
 *
 * Player projectile management — spawn, move, cull, and render.
 *
 * Glow rendering strategy
 * ───────────────────────
 * A single bullet is painted in four overlapping layers, each with a
 * different shadowBlur radius and opacity.  This approximates the look
 * of a real laser/plasma bolt without expensive per-pixel effects:
 *
 *   Layer 1  wide diffuse outer bloom  (shadowBlur 40, low alpha)
 *   Layer 2  medium glow halo          (shadowBlur 22)
 *   Layer 3  coloured core disc        (shadowBlur 10)
 *   Layer 4  white-hot centre point    (shadowBlur 6, full alpha)
 *
 * The motion-streak is a tapered line from the previous tick position to
 * the current one — interpolated with the sub-frame alpha so it stays
 * smooth at 120 + Hz.
 *
 * All ctx.save() / ctx.restore() calls are scoped to a single bullet to
 * keep state leakage impossible.
 */

export const BULLET_SPEED  = 520;   // px / s
export const BULLET_RADIUS = 5;
export const FIRE_COOLDOWN = 0.18;  // s  (~5.5 rounds/sec)

/* Neon yellow-white palette */
const COLOR_CORE   = '#ffffff';
const COLOR_MID    = '#ffe600';
const COLOR_BLOOM  = '#ffaa00';

export function makeBulletState() {
  return {
    bullets:  [],  // [{ x, y, px, py, vx, vy }]
    cooldown: 0,
  };
}

/**
 * updateBullets
 * @param {object}  bs
 * @param {boolean} firing
 * @param {number}  shipX
 * @param {number}  shipY
 * @param {number}  angle   — radians
 * @param {number}  dt      — seconds
 * @param {number}  W       — canvas logical width
 * @param {number}  H       — canvas logical height
 */
export function updateBullets(bs, firing, shipX, shipY, angle, dt, W, H) {
  bs.cooldown = Math.max(0, bs.cooldown - dt);

  if (firing && bs.cooldown === 0) {
    bs.cooldown = FIRE_COOLDOWN;
    bs.bullets.push({
      x:  shipX,
      y:  shipY,
      px: shipX,
      py: shipY,
      vx: Math.cos(angle) * BULLET_SPEED,
      vy: Math.sin(angle) * BULLET_SPEED,
    });
  }

  const MARGIN = 24;
  bs.bullets = bs.bullets.filter((b) => {
    b.px = b.x; b.py = b.y;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    return b.x > -MARGIN && b.x < W + MARGIN &&
           b.y > -MARGIN && b.y < H + MARGIN;
  });
}

/**
 * drawBullets
 * Renders each bullet with a multi-layer neon glow + motion streak.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array}  bullets
 * @param {number} alpha  — sub-frame interpolation from useGameLoop
 */
export function drawBullets(ctx, bullets, alpha) {
  if (bullets.length === 0) return;

  for (const b of bullets) {
    /* Interpolate position for silky 120Hz rendering */
    const x  = b.px + (b.x - b.px) * alpha;
    const y  = b.py + (b.y - b.py) * alpha;

    /* Tail origin — a few px behind the interpolated point */
    const tailAlpha = Math.max(0, alpha - 0.18);
    const tx = b.px + (b.x - b.px) * tailAlpha;
    const ty = b.py + (b.y - b.py) * tailAlpha;

    ctx.save();

    /* ── Layer 1: Wide outer bloom ────────────────────────────── */
    ctx.globalAlpha = 0.18;
    ctx.shadowColor = COLOR_BLOOM;
    ctx.shadowBlur  = 40;
    ctx.fillStyle   = COLOR_BLOOM;
    ctx.beginPath();
    ctx.arc(x, y, BULLET_RADIUS * 2.2, 0, Math.PI * 2);
    ctx.fill();

    /* ── Layer 2: Motion streak ───────────────────────────────── */
    ctx.globalAlpha = 0.55;
    ctx.shadowColor = COLOR_MID;
    ctx.shadowBlur  = 22;
    ctx.strokeStyle = COLOR_MID;
    ctx.lineWidth   = BULLET_RADIUS * 1.4;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(x, y);
    ctx.stroke();

    /* ── Layer 3: Coloured core disc ──────────────────────────── */
    ctx.globalAlpha = 0.9;
    ctx.shadowColor = COLOR_MID;
    ctx.shadowBlur  = 10;
    ctx.fillStyle   = COLOR_MID;
    ctx.beginPath();
    ctx.arc(x, y, BULLET_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    /* ── Layer 4: White-hot centre ────────────────────────────── */
    ctx.globalAlpha = 1;
    ctx.shadowColor = COLOR_CORE;
    ctx.shadowBlur  = 6;
    ctx.fillStyle   = COLOR_CORE;
    ctx.beginPath();
    ctx.arc(x, y, BULLET_RADIUS * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
