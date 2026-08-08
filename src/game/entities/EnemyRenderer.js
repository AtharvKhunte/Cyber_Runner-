/**
 * EnemyRenderer.js — Detailed vector art for all 4 enemy types.
 *
 * normal  — angular drone with side fins and glowing core
 * fast    — needle interceptor, long nose, swept fins
 * tank    — heavy armored hexagon with corner turrets and plating
 * boss    — cruiser with bridge, wing cannons, rotating shield rings
 *
 * All drawn in local space. Caller handles translate + rotate.
 */

/* ═══════════════════════════════════════════════════════════════
   NORMAL ENEMY — angular drone
═══════════════════════════════════════════════════════════════ */
export function drawNormalEnemy(ctx, r, flash) {
  const C = flash ? '#ffffff' : '#ff2d6b';
  const G = flash ? '#ffffff' : '#ff2d6b';

  ctx.save();
  ctx.shadowColor = G;
  ctx.shadowBlur  = flash ? 40 : 20;

  // Main body — angular diamond
  ctx.beginPath();
  ctx.moveTo(0,   -r);
  ctx.lineTo(r * 0.6,  0);
  ctx.lineTo(0,    r * 0.7);
  ctx.lineTo(-r * 0.6, 0);
  ctx.closePath();
  const bg = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  bg.addColorStop(0,   flash ? '#ffffff' : 'rgba(255,100,140,0.95)');
  bg.addColorStop(0.5, C);
  bg.addColorStop(1,   'rgba(120,0,40,0.6)');
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = flash ? '#ffffff' : '#ff80a8';
  ctx.lineWidth   = 1.2;
  ctx.stroke();

  // Side fins
  ctx.beginPath();
  ctx.moveTo(r * 0.5, -r * 0.1);
  ctx.lineTo(r * 1.1,  r * 0.25);
  ctx.lineTo(r * 0.45, r * 0.35);
  ctx.closePath();
  ctx.fillStyle = `rgba(255,45,107,0.55)`;
  ctx.fill();
  ctx.strokeStyle = '#ff2d6b'; ctx.lineWidth = 0.8; ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.1);
  ctx.lineTo(-r * 1.1,  r * 0.25);
  ctx.lineTo(-r * 0.45, r * 0.35);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Glowing core
  ctx.shadowColor = '#ffaacc';
  ctx.shadowBlur  = 16;
  const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.3);
  cg.addColorStop(0,   '#ffffff');
  cg.addColorStop(0.4, '#ff80a8');
  cg.addColorStop(1,   'rgba(255,45,107,0)');
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2); ctx.fill();

  // Cross detail
  ctx.strokeStyle = `rgba(255,180,200,0.5)`;
  ctx.lineWidth   = 0.6;
  ctx.beginPath(); ctx.moveTo(0, -r*0.55); ctx.lineTo(0, r*0.45); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-r*0.4, 0); ctx.lineTo(r*0.4, 0); ctx.stroke();

  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════════
   FAST ENEMY — needle interceptor
═══════════════════════════════════════════════════════════════ */
export function drawFastEnemy(ctx, r, flash) {
  const C = flash ? '#ffffff' : '#ff8800';
  ctx.save();
  ctx.shadowColor = flash ? '#ffffff' : '#ff6600';
  ctx.shadowBlur  = flash ? 40 : 18;

  // Long needle body
  ctx.beginPath();
  ctx.moveTo(0,        -r * 1.6);   // nose tip
  ctx.lineTo(r * 0.35,  r * 0.2);
  ctx.lineTo(r * 0.2,   r * 0.8);
  ctx.lineTo(0,         r * 0.6);
  ctx.lineTo(-r * 0.2,  r * 0.8);
  ctx.lineTo(-r * 0.35, r * 0.2);
  ctx.closePath();
  const ng = ctx.createLinearGradient(0, -r * 1.6, 0, r * 0.8);
  ng.addColorStop(0,   '#ffffff');
  ng.addColorStop(0.3, C);
  ng.addColorStop(0.8, 'rgba(180,60,0,0.8)');
  ng.addColorStop(1,   'rgba(80,20,0,0.4)');
  ctx.fillStyle = ng;
  ctx.fill();
  ctx.strokeStyle = flash ? '#ffffff' : '#ffbb55';
  ctx.lineWidth   = 1;
  ctx.stroke();

  // Swept back fins
  ctx.beginPath();
  ctx.moveTo(r * 0.3, 0);
  ctx.lineTo(r * 1.0, r * 0.7);
  ctx.lineTo(r * 0.2, r * 0.65);
  ctx.closePath();
  ctx.fillStyle = `rgba(255,120,0,0.5)`;
  ctx.fill();
  ctx.strokeStyle = '#ff8800'; ctx.lineWidth = 0.7; ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-r * 0.3, 0);
  ctx.lineTo(-r * 1.0, r * 0.7);
  ctx.lineTo(-r * 0.2, r * 0.65);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Engine glow at tail
  const eg = ctx.createRadialGradient(0, r * 0.5, 0, 0, r * 0.5, r * 0.4);
  eg.addColorStop(0,   'rgba(255,200,80,0.9)');
  eg.addColorStop(0.5, 'rgba(255,100,0,0.5)');
  eg.addColorStop(1,   'rgba(255,50,0,0)');
  ctx.fillStyle   = eg;
  ctx.shadowBlur  = 20;
  ctx.shadowColor = '#ff6600';
  ctx.beginPath(); ctx.arc(0, r * 0.5, r * 0.4, 0, Math.PI * 2); ctx.fill();

  // Nose tip
  ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 12;
  ctx.fillStyle   = '#ffffff';
  ctx.beginPath(); ctx.arc(0, -r * 1.6, 1.2, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════════
   TANK ENEMY — heavy armored
═══════════════════════════════════════════════════════════════ */
export function drawTankEnemy(ctx, r, flash) {
  const C = flash ? '#ffffff' : '#cc00ff';
  ctx.save();
  ctx.shadowColor = flash ? '#ffffff' : '#aa00dd';
  ctx.shadowBlur  = flash ? 40 : 22;

  // Armored octagon body with plating
  const sides = 8;
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a  = (i / sides) * Math.PI * 2 - Math.PI / 8;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  const tg = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  tg.addColorStop(0,   flash ? '#ffffff' : 'rgba(200,80,255,0.95)');
  tg.addColorStop(0.5, C);
  tg.addColorStop(0.85,'rgba(80,0,120,0.9)');
  tg.addColorStop(1,   'rgba(30,0,60,0.7)');
  ctx.fillStyle = tg;
  ctx.fill();
  ctx.strokeStyle = flash ? '#ffffff' : '#dd88ff';
  ctx.lineWidth   = 2;
  ctx.stroke();

  // Plating panel lines
  ctx.strokeStyle = `rgba(200,100,255,0.35)`;
  ctx.lineWidth   = 0.8;
  for (let i = 0; i < sides; i++) {
    const a  = (i / sides) * Math.PI * 2 - Math.PI / 8;
    const px = Math.cos(a) * r * 0.65;
    const py = Math.sin(a) * r * 0.65;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(px, py); ctx.stroke();
  }

  // Inner armour ring
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a  = (i / sides) * Math.PI * 2 - Math.PI / 8;
    const px = Math.cos(a) * r * 0.65;
    const py = Math.sin(a) * r * 0.65;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.strokeStyle = `rgba(220,150,255,0.5)`;
  ctx.lineWidth   = 1.2;
  ctx.stroke();

  // Corner turrets
  for (let i = 0; i < 4; i++) {
    const a  = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const tx = Math.cos(a) * r * 0.88;
    const ty = Math.sin(a) * r * 0.88;
    ctx.shadowBlur  = 10;
    ctx.shadowColor = '#cc00ff';
    ctx.fillStyle   = flash ? '#ffffff' : '#dd88ff';
    ctx.beginPath(); ctx.arc(tx, ty, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#cc00ff'; ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Central core
  const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.28);
  cg.addColorStop(0,   '#ffffff');
  cg.addColorStop(0.4, '#cc00ff');
  cg.addColorStop(1,   'rgba(100,0,180,0)');
  ctx.fillStyle = cg; ctx.shadowBlur = 20; ctx.shadowColor = '#dd88ff';
  ctx.beginPath(); ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════════
   BOSS ENEMY — cruiser
═══════════════════════════════════════════════════════════════ */
export function drawBossEnemy(ctx, r, flash, rotPhase) {
  const C = flash ? '#ffffff' : '#ff0044';
  ctx.save();
  ctx.shadowColor = flash ? '#ffffff' : '#ff0044';
  ctx.shadowBlur  = flash ? 60 : 35;

  // Main hull — wide flat body
  ctx.beginPath();
  ctx.moveTo(0,      -r * 0.9);   // bridge top
  ctx.lineTo(r * 0.5, -r * 0.5);
  ctx.lineTo(r * 0.9, -r * 0.1);
  ctx.lineTo(r,        r * 0.4);
  ctx.lineTo(r * 0.6,  r * 0.9);
  ctx.lineTo(0,        r * 0.75);
  ctx.lineTo(-r * 0.6, r * 0.9);
  ctx.lineTo(-r,       r * 0.4);
  ctx.lineTo(-r * 0.9, -r * 0.1);
  ctx.lineTo(-r * 0.5, -r * 0.5);
  ctx.closePath();
  const hg = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  hg.addColorStop(0,    flash ? '#ffffff' : 'rgba(255,80,100,0.95)');
  hg.addColorStop(0.45, C);
  hg.addColorStop(0.8,  'rgba(120,0,30,0.9)');
  hg.addColorStop(1,    'rgba(40,0,10,0.8)');
  ctx.fillStyle = hg;
  ctx.fill();
  ctx.strokeStyle = flash ? '#ffffff' : '#ff6680';
  ctx.lineWidth   = 2;
  ctx.stroke();

  // Hull panel lines
  ctx.strokeStyle = 'rgba(255,100,120,0.3)';
  ctx.lineWidth   = 0.8;
  ctx.beginPath(); ctx.moveTo(-r*0.8, 0); ctx.lineTo(r*0.8, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-r*0.6, -r*0.4); ctx.lineTo(r*0.6, -r*0.4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-r*0.5,  r*0.5); ctx.lineTo(r*0.5,  r*0.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -r*0.85); ctx.lineTo(0, r*0.7); ctx.stroke();

  // Wing cannons
  _drawCannon(ctx,  r * 0.85, r * 0.2, flash);
  _drawCannon(ctx, -r * 0.85, r * 0.2, flash);

  // Bridge superstructure
  ctx.save();
  ctx.shadowColor = '#ff4466'; ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, -r * 0.85);
  ctx.lineTo( r * 0.3, -r * 0.85);
  ctx.lineTo( r * 0.4, -r * 0.35);
  ctx.lineTo(-r * 0.4, -r * 0.35);
  ctx.closePath();
  const brg = ctx.createLinearGradient(0, -r * 0.85, 0, -r * 0.35);
  brg.addColorStop(0, flash ? '#ffffff' : 'rgba(255,120,140,0.95)');
  brg.addColorStop(1, 'rgba(180,0,40,0.8)');
  ctx.fillStyle = brg; ctx.fill();
  ctx.strokeStyle = flash ? '#ffffff' : '#ff8899'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.restore();

  // Bridge windows
  if (!flash) {
    for (let i = -1; i <= 1; i++) {
      ctx.save();
      ctx.fillStyle   = 'rgba(255,200,210,0.9)';
      ctx.shadowColor = '#ff8899'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(i * r * 0.18, -r * 0.6, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  // Rotating shield rings
  ctx.save();
  ctx.rotate(rotPhase);
  ctx.strokeStyle = flash ? 'rgba(255,255,255,0.6)' : 'rgba(255,80,100,0.45)';
  ctx.lineWidth   = 1.5;
  ctx.shadowColor = '#ff0044'; ctx.shadowBlur = 15;
  ctx.setLineDash([8, 6]);
  ctx.beginPath(); ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2); ctx.stroke();
  ctx.rotate(-rotPhase * 2);
  ctx.strokeStyle = flash ? 'rgba(255,255,255,0.4)' : 'rgba(255,120,140,0.3)';
  ctx.lineWidth   = 1;
  ctx.setLineDash([4, 10]);
  ctx.beginPath(); ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Core reactor
  const rg = ctx.createRadialGradient(0, r*0.1, 0, 0, r*0.1, r*0.25);
  rg.addColorStop(0,   '#ffffff');
  rg.addColorStop(0.3, '#ff4466');
  rg.addColorStop(1,   'rgba(200,0,40,0)');
  ctx.fillStyle   = rg;
  ctx.shadowColor = '#ff0044'; ctx.shadowBlur = 30;
  ctx.beginPath(); ctx.arc(0, r*0.1, r*0.25, 0, Math.PI*2); ctx.fill();

  ctx.restore();

  // HP bar (drawn in world space, outside the local transform)
}

function _drawCannon(ctx, x, y, flash) {
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = flash ? '#ffffff' : '#ff0044';
  ctx.shadowBlur  = 15;

  // Cannon body
  ctx.fillStyle = flash ? '#ffffff' : 'rgba(180,0,40,0.9)';
  ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = flash ? '#ffffff' : '#ff6680'; ctx.lineWidth = 1.5; ctx.stroke();

  // Barrel
  ctx.fillStyle = flash ? '#ffffff' : '#ff2244';
  ctx.fillRect(-3, -12, 6, 12);
  ctx.strokeStyle = flash ? '#ffffff' : '#ff8899'; ctx.lineWidth = 1; ctx.strokeRect(-3, -12, 6, 12);

  // Muzzle glow
  const mg = ctx.createRadialGradient(0, -12, 0, 0, -12, 8);
  mg.addColorStop(0,   'rgba(255,150,170,0.8)');
  mg.addColorStop(1,   'rgba(255,0,40,0)');
  ctx.fillStyle = mg;
  ctx.beginPath(); ctx.arc(0, -12, 8, 0, Math.PI*2); ctx.fill();

  ctx.restore();
}