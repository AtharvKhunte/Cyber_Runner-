/**
 * EnemySystem.js
 *
 * Spawns and drives enemies that hunt the player.
 *
 * Design:
 *  - Enemies spawn at a random point on any screen edge (with a margin so
 *    they don't flicker in at the corner).
 *  - Each enemy re-calculates its heading toward the player every tick —
 *    simple but effective homing that requires the player to dodge.
 *  - Speed and spawn rate both increase with score, providing a difficulty
 *    curve without any separate difficulty state.
 *  - Enemies are drawn as glowing pink hexagons to contrast with the cyan
 *    player palette.
 */

export const ENEMY_BASE_SPEED  = 90;   // px / s at score 0
export const ENEMY_SPEED_SCALE = 0.4;  // extra px/s per 10 pts
export const ENEMY_RADIUS      = 13;
export const ENEMY_COLOR       = '#ff2d6b';
export const ENEMY_GLOW        = '#ff2d6b';

const BASE_SPAWN_INTERVAL = 2.2;  // seconds between spawns at score 0
const MIN_SPAWN_INTERVAL  = 0.55; // floor — never faster than this

/**
 * makeEnemyState — initial enemy-system state.
 */
export function makeEnemyState() {
  return {
    enemies:       [],  // [{ x, y, px, py, vx, vy, rotPhase }]
    spawnTimer:    0,   // seconds until next spawn
    spawnInterval: BASE_SPAWN_INTERVAL,
  };
}

/**
 * spawnEnemy — pick a random point on one of the four screen edges.
 */
function spawnEnemy(W, H) {
  const edge = Math.floor(Math.random() * 4); // 0=top 1=right 2=bottom 3=left
  const MARGIN = ENEMY_RADIUS + 2;
  let x, y;
  switch (edge) {
    case 0: x = Math.random() * W;         y = -MARGIN;      break; // top
    case 1: x = W + MARGIN;                y = Math.random() * H; break; // right
    case 2: x = Math.random() * W;         y = H + MARGIN;   break; // bottom
    default: x = -MARGIN;                  y = Math.random() * H; break; // left
  }
  return { x, y, px: x, py: y, vx: 0, vy: 0, rotPhase: Math.random() * Math.PI * 2 };
}

/**
 * updateEnemies
 *
 * @param {object} es      — enemy state from makeEnemyState()
 * @param {number} playerX — player X this tick
 * @param {number} playerY — player Y
 * @param {number} score   — current score (used for difficulty scaling)
 * @param {number} dt      — elapsed seconds
 * @param {number} W       — canvas logical width
 * @param {number} H       — canvas logical height
 */
export function updateEnemies(es, playerX, playerY, score, dt, W, H) {
  // Difficulty: speed and spawn rate tighten with score
  const speed         = ENEMY_BASE_SPEED + (score / 10) * ENEMY_SPEED_SCALE;
  es.spawnInterval    = Math.max(MIN_SPAWN_INTERVAL, BASE_SPAWN_INTERVAL - score * 0.015);

  // Spawn timer
  es.spawnTimer -= dt;
  if (es.spawnTimer <= 0) {
    es.spawnTimer = es.spawnInterval;
    es.enemies.push(spawnEnemy(W, H));
  }

  // Move each enemy toward the player
  for (const e of es.enemies) {
    e.px = e.x;
    e.py = e.y;

    const dx   = playerX - e.x;
    const dy   = playerY - e.y;
    const dist = Math.hypot(dx, dy) || 0.001;

    e.vx = (dx / dist) * speed;
    e.vy = (dy / dist) * speed;
    e.x += e.vx * dt;
    e.y += e.vy * dt;

    // Slow rotation phase for the hex animation
    e.rotPhase = (e.rotPhase + dt * 1.8) % (Math.PI * 2);
  }
}

/**
 * drawEnemies — renders each enemy as a rotating glowing hexagon.
 */
export function drawEnemies(ctx, enemies, alpha) {
  for (const e of enemies) {
    const x = e.px + (e.x - e.px) * alpha;
    const y = e.py + (e.y - e.py) * alpha;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(e.rotPhase);

    ctx.shadowColor = ENEMY_GLOW;
    ctx.shadowBlur  = 20;

    // Hexagon path
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a  = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * ENEMY_RADIUS;
      const py = Math.sin(a) * ENEMY_RADIUS;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();

    // Fill: radial gradient — bright core, transparent edge
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, ENEMY_RADIUS);
    grad.addColorStop(0,   'rgba(255,100,130,0.9)');
    grad.addColorStop(0.6, ENEMY_COLOR);
    grad.addColorStop(1,   'rgba(255,45,107,0.2)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Bright outline
    ctx.strokeStyle = '#ff80a8';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    ctx.restore();
  }
}
