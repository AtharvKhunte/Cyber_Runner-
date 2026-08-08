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

export const ENEMY_RADIUS = 13;
export const BOSS_RADIUS  = 36;
export const BOSS_HP      = 5;

const COLORS = {
  normal: { fill: '#ff2d6b', glow: '#ff2d6b', outline: '#ff90b8' },
  fast:   { fill: '#ff8800', glow: '#ff6600', outline: '#ffbb55' },
  tank:   { fill: '#cc00ff', glow: '#aa00dd', outline: '#dd88ff' },
  boss:   { fill: '#ff0044', glow: '#ff0044', outline: '#ff88aa' },
};

export function makeEnemyState() {
  return { enemies: [], spawnTimer: 0 };
}

function edgeSpawn(W, H, margin) {
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  switch (edge) {
    case 0: x = Math.random() * W; y = -margin;    break;
    case 1: x = W + margin;        y = Math.random() * H; break;
    case 2: x = Math.random() * W; y = H + margin; break;
    default: x = -margin;          y = Math.random() * H; break;
  }
  return { x, y };
}

export function spawnNormalEnemy(es, W, H, wave) {
  const roll = Math.random();
  let type = 'normal';
  if (wave >= 3 && roll < 0.25) type = 'fast';
  if (wave >= 5 && roll < 0.12) type = 'tank';
  const r   = type === 'tank' ? ENEMY_RADIUS * 1.4 : ENEMY_RADIUS;
  const pos = edgeSpawn(W, H, r + 4);
  es.enemies.push({
    ...pos, px: pos.x, py: pos.y,
    vx: 0, vy: 0,
    rotPhase: Math.random() * Math.PI * 2,
    type, hp: 1, maxHp: 1,
    radius: r,
    flashTimer: 0,
  });
}

export function spawnBoss(es, W) {
  es.enemies.push({
    x: W / 2, y: -BOSS_RADIUS - 4,
    px: W / 2, py: -BOSS_RADIUS - 4,
    vx: 0, vy: 0,
    rotPhase: 0,
    type: 'boss', hp: BOSS_HP, maxHp: BOSS_HP,
    radius: BOSS_RADIUS,
    flashTimer: 0,
  });
}

export function updateEnemies(es, playerX, playerY, wave, dt) {
  for (const e of es.enemies) {
    e.px = e.x; e.py = e.y;
    const baseSpeed =
      e.type === 'boss' ? 55 + wave * 2 :
      e.type === 'fast' ? 160 + wave * 6 :
      e.type === 'tank' ? 60 + wave * 4 :
      80 + wave * 8;
    const dx = playerX - e.x, dy = playerY - e.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    e.vx = (dx / dist) * baseSpeed;
    e.vy = (dy / dist) * baseSpeed;
    e.x += e.vx * dt; e.y += e.vy * dt;
    e.rotPhase = (e.rotPhase + dt * (e.type === 'boss' ? 0.6 : 1.8)) % (Math.PI * 2);
    if (e.flashTimer > 0) e.flashTimer -= dt;
  }
}

export function drawEnemies(ctx, enemies, alpha) {
  for (const e of enemies) {
    const x     = e.px + (e.x - e.px) * alpha;
    const y     = e.py + (e.y - e.py) * alpha;
    const pal   = COLORS[e.type];
    const r     = e.radius;
    const sides = e.type === 'tank' ? 8 : e.type === 'fast' ? 3 : 6;
    const flash = e.flashTimer > 0;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(e.rotPhase);

    ctx.globalAlpha = flash ? 0.7 : 0.22;
    ctx.shadowColor = flash ? '#ffffff' : pal.glow;
    ctx.shadowBlur  = flash ? 60 : 40;
    ctx.fillStyle   = flash ? '#ffffff' : pal.glow;
    polygon(ctx, sides, r + 6); ctx.fill();

    ctx.globalAlpha = 1;
    ctx.shadowColor = flash ? '#ffffff' : pal.glow;
    ctx.shadowBlur  = 20;
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    gr.addColorStop(0,   flash ? '#ffffff' : 'rgba(255,130,160,0.95)');
    gr.addColorStop(0.5, flash ? '#ffaaaa' : pal.fill);
    gr.addColorStop(1,   'rgba(0,0,0,0.3)');
    ctx.fillStyle = gr;
    polygon(ctx, sides, r); ctx.fill();

    ctx.shadowBlur  = 10;
    ctx.strokeStyle = flash ? '#ffffff' : pal.outline;
    ctx.lineWidth   = e.type === 'boss' ? 2.5 : 1.5;
    ctx.stroke();

    if (e.type === 'boss') {
      const barW = r * 2.2, barH = 5, barX = -r * 1.1, barY = r + 8;
      const ratio = e.hp / e.maxHp;
      ctx.shadowBlur  = 0; ctx.globalAlpha = 0.85;
      ctx.fillStyle   = 'rgba(0,0,0,0.6)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = ratio > 0.5 ? '#00ff88' : ratio > 0.25 ? '#ffe600' : '#ff2d6b';
      ctx.fillRect(barX, barY, barW * ratio, barH);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth   = 1;
      ctx.strokeRect(barX, barY, barW, barH);
    }

    ctx.restore();
  }
}

function polygon(ctx, sides, r) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    i === 0
      ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
      : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
}