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

export const BULLET_SPEED       = 520;
export const BULLET_RADIUS      = 5;
export const BASE_FIRE_COOLDOWN = 0.18;

const COLOR_CORE   = '#ffffff';
const COLOR_MID    = '#ffe600';
const COLOR_BLOOM  = '#ffaa00';
const COLOR_TRIPLE = '#c060ff';
const COLOR_TBLOOM = '#8020cc';

export function makeBulletState() {
  return { bullets: [], cooldown: 0 };
}

export function updateBullets(
  bs, firing, shipX, shipY, angle, dt, W, H,
  tripleShot = false, cooldown = BASE_FIRE_COOLDOWN
) {
  bs.cooldown = Math.max(0, bs.cooldown - dt);

  if (firing && bs.cooldown === 0) {
    bs.cooldown = cooldown;
    if (tripleShot) {
      const SPREAD = 0.22;
      [-SPREAD, 0, SPREAD].forEach((offset) => {
        const a = angle + offset;
        bs.bullets.push({
          x: shipX, y: shipY, px: shipX, py: shipY,
          vx: Math.cos(a) * BULLET_SPEED,
          vy: Math.sin(a) * BULLET_SPEED,
          triple: true,
        });
      });
    } else {
      bs.bullets.push({
        x: shipX, y: shipY, px: shipX, py: shipY,
        vx: Math.cos(angle) * BULLET_SPEED,
        vy: Math.sin(angle) * BULLET_SPEED,
        triple: false,
      });
    }
  }

  const M = 24;
  bs.bullets = bs.bullets.filter((b) => {
    b.px = b.x; b.py = b.y;
    b.x += b.vx * dt; b.y += b.vy * dt;
    return b.x > -M && b.x < W + M && b.y > -M && b.y < H + M;
  });
}

export function drawBullets(ctx, bullets, alpha) {
  if (!bullets.length) return;
  for (const b of bullets) {
    const x  = b.px + (b.x - b.px) * alpha;
    const y  = b.py + (b.y - b.py) * alpha;
    const ta = Math.max(0, alpha - 0.18);
    const tx = b.px + (b.x - b.px) * ta;
    const ty = b.py + (b.y - b.py) * ta;
    const mid   = b.triple ? COLOR_TRIPLE : COLOR_MID;
    const bloom = b.triple ? COLOR_TBLOOM : COLOR_BLOOM;

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.shadowColor = bloom; ctx.shadowBlur = 40;
    ctx.fillStyle   = bloom;
    ctx.beginPath(); ctx.arc(x, y, BULLET_RADIUS * 2.2, 0, Math.PI * 2); ctx.fill();

    ctx.globalAlpha = 0.55;
    ctx.shadowColor = mid; ctx.shadowBlur = 22;
    ctx.strokeStyle = mid; ctx.lineWidth  = BULLET_RADIUS * 1.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();

    ctx.globalAlpha = 0.9;
    ctx.shadowColor = mid; ctx.shadowBlur = 10;
    ctx.fillStyle   = mid;
    ctx.beginPath(); ctx.arc(x, y, BULLET_RADIUS, 0, Math.PI * 2); ctx.fill();

    ctx.globalAlpha = 1;
    ctx.shadowColor = COLOR_CORE; ctx.shadowBlur = 6;
    ctx.fillStyle   = COLOR_CORE;
    ctx.beginPath(); ctx.arc(x, y, BULLET_RADIUS * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}