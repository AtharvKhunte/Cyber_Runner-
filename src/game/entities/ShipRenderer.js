/**
 * ShipRenderer.js — Detailed vector art player ship.
 *
 * Draws in local space (0,0 = ship centre, nose pointing up = -Y).
 * Caller does ctx.translate(x,y) + ctx.rotate(angle + PI/2) before calling.
 *
 * Anatomy:
 *   Hull       — tapered hexagonal fuselage
 *   Wings      — swept delta wings with panel lines
 *   Engine pods — one per wing, with animated exhaust flame
 *   Cockpit    — teardrop dome with reflection highlight
 *   Nav lights — port (red) / starboard (green) blinking
 *   Nose       — sharp pointed tip with glow
 */

export function drawPlayerShip(ctx, pulse, shipColor = '#00ffe7', navPhase = 0) {
  const C = shipColor;

  ctx.save();

  /* ─── 1. ENGINE EXHAUST (behind everything) ──────────────────── */
  _drawExhaust(ctx, -10, 18, pulse, '#ff6030', '#ffaa00');
  _drawExhaust(ctx,  10, 18, pulse, '#ff6030', '#ffaa00');

  /* ─── 2. WINGS ───────────────────────────────────────────────── */
  ctx.save();
  ctx.shadowColor = C;
  ctx.shadowBlur  = 12 + pulse * 8;

  // Left wing
  ctx.beginPath();
  ctx.moveTo(0, -12);          // nose-side wing root
  ctx.lineTo(-26, 14);         // wingtip
  ctx.lineTo(-18, 20);         // engine pod front
  ctx.lineTo(-4,  16);         // trailing edge root
  ctx.closePath();
  const lwGrad = ctx.createLinearGradient(-26, 0, 0, 0);
  lwGrad.addColorStop(0, 'rgba(0,180,160,0.45)');
  lwGrad.addColorStop(1, `${_hex2rgba(C, 0.75)}`);
  ctx.fillStyle = lwGrad;
  ctx.fill();

  // Wing panel lines (left)
  ctx.strokeStyle = `${_hex2rgba(C, 0.5)}`;
  ctx.lineWidth   = 0.7;
  ctx.beginPath(); ctx.moveTo(-4, 12); ctx.lineTo(-20, 12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-8,  6); ctx.lineTo(-16,  9); ctx.stroke();

  // Right wing (mirror)
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(26, 14);
  ctx.lineTo(18, 20);
  ctx.lineTo( 4, 16);
  ctx.closePath();
  const rwGrad = ctx.createLinearGradient(26, 0, 0, 0);
  rwGrad.addColorStop(0, 'rgba(0,180,160,0.45)');
  rwGrad.addColorStop(1, `${_hex2rgba(C, 0.75)}`);
  ctx.fillStyle = rwGrad;
  ctx.fill();

  ctx.strokeStyle = `${_hex2rgba(C, 0.5)}`;
  ctx.beginPath(); ctx.moveTo(4,  12); ctx.lineTo(20, 12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8,   6); ctx.lineTo(16,  9); ctx.stroke();

  ctx.restore();

  /* ─── 3. ENGINE PODS ─────────────────────────────────────────── */
  _drawEnginePod(ctx, -14, 16, C, pulse);
  _drawEnginePod(ctx,  14, 16, C, pulse);

  /* ─── 4. MAIN HULL ───────────────────────────────────────────── */
  ctx.save();
  ctx.shadowColor = C;
  ctx.shadowBlur  = 18 + pulse * 12;

  ctx.beginPath();
  ctx.moveTo(0,   -22);   // nose tip
  ctx.lineTo(5,   -10);
  ctx.lineTo(7,     4);
  ctx.lineTo(5,    18);
  ctx.lineTo(0,    20);
  ctx.lineTo(-5,   18);
  ctx.lineTo(-7,    4);
  ctx.lineTo(-5,  -10);
  ctx.closePath();

  const hullGrad = ctx.createLinearGradient(0, -22, 0, 20);
  hullGrad.addColorStop(0,    '#ffffff');
  hullGrad.addColorStop(0.25, C);
  hullGrad.addColorStop(0.7,  'rgba(0,160,140,0.85)');
  hullGrad.addColorStop(1,    'rgba(0,80,70,0.6)');
  ctx.fillStyle = hullGrad;
  ctx.fill();

  // Hull outline
  ctx.strokeStyle = '#aaffee';
  ctx.lineWidth   = 0.9;
  ctx.stroke();

  // Hull centre line detail
  ctx.strokeStyle = `${_hex2rgba(C, 0.6)}`;
  ctx.lineWidth   = 0.6;
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 16); ctx.stroke();

  // Hull panel line
  ctx.beginPath(); ctx.moveTo(-5, 2); ctx.lineTo(5, 2); ctx.stroke();

  ctx.restore();

  /* ─── 5. COCKPIT DOME ────────────────────────────────────────── */
  ctx.save();
  ctx.shadowColor = '#80ffff';
  ctx.shadowBlur  = 14;

  // Dome body
  ctx.beginPath();
  ctx.ellipse(0, -8, 4, 6, 0, 0, Math.PI * 2);
  const domeGrad = ctx.createRadialGradient(-1.5, -10, 0.5, 0, -8, 6);
  domeGrad.addColorStop(0,   'rgba(255,255,255,0.95)');
  domeGrad.addColorStop(0.3, 'rgba(120,240,255,0.85)');
  domeGrad.addColorStop(0.8, 'rgba(0,180,220,0.7)');
  domeGrad.addColorStop(1,   'rgba(0,80,120,0.5)');
  ctx.fillStyle = domeGrad;
  ctx.fill();

  // Dome reflection streak
  ctx.globalAlpha = 0.7;
  ctx.fillStyle   = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.ellipse(-1.2, -11, 1.0, 2.2, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  /* ─── 6. NOSE TIP GLOW ───────────────────────────────────────── */
  ctx.save();
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur  = 16 + pulse * 8;
  ctx.fillStyle   = '#ffffff';
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.arc(0, -22, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  /* ─── 7. NAV LIGHTS ──────────────────────────────────────────── */
  // Port (left) = red, Starboard (right) = green, blink alternating
  const blink = (Math.sin(navPhase) + 1) / 2;
  _drawNavLight(ctx, -26, 14, `rgba(255,60,60,${0.4 + blink * 0.6})`);
  _drawNavLight(ctx,  26, 14, `rgba(60,255,100,${0.4 + (1 - blink) * 0.6})`);

  ctx.restore();
}

/* ─── Sub-draw helpers ──────────────────────────────────────────── */

function _drawEnginePod(ctx, x, y, color, pulse) {
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = color;
  ctx.shadowBlur  = 8;

  // Pod body
  ctx.beginPath();
  ctx.ellipse(0, 0, 4, 6, 0, 0, Math.PI * 2);
  const pg = ctx.createRadialGradient(0, -2, 0, 0, 0, 6);
  pg.addColorStop(0,   'rgba(200,255,245,0.9)');
  pg.addColorStop(0.6, _hex2rgba(color, 0.8));
  pg.addColorStop(1,   'rgba(0,60,50,0.6)');
  ctx.fillStyle = pg;
  ctx.fill();

  ctx.strokeStyle = _hex2rgba(color, 0.7);
  ctx.lineWidth   = 0.8;
  ctx.stroke();

  ctx.restore();
}

function _drawExhaust(ctx, x, y, pulse, innerColor, outerColor) {
  ctx.save();
  ctx.translate(x, y);

  const flameH = 10 + pulse * 14;
  const flameW = 4  + pulse * 2;

  const fg = ctx.createRadialGradient(0, 0, 0, 0, flameH * 0.6, flameH);
  fg.addColorStop(0,   'rgba(255,255,200,0.95)');
  fg.addColorStop(0.2, innerColor.replace(')', ',0.9)').replace('rgb', 'rgba'));
  fg.addColorStop(0.6, outerColor.replace(')', ',0.5)').replace('rgb', 'rgba'));
  fg.addColorStop(1,   'rgba(255,80,0,0)');

  ctx.globalAlpha = 0.85 + pulse * 0.15;
  ctx.shadowColor = outerColor;
  ctx.shadowBlur  = 14 + pulse * 10;
  ctx.fillStyle   = fg;

  // Teardrop flame shape
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-flameW, flameH * 0.4,  -flameW * 0.5, flameH * 0.8, 0, flameH);
  ctx.bezierCurveTo( flameW * 0.5, flameH * 0.8,  flameW, flameH * 0.4, 0, 0);
  ctx.fill();

  ctx.restore();
}

function _drawNavLight(ctx, x, y, color) {
  ctx.save();
  ctx.fillStyle   = color;
  ctx.shadowColor = color;
  ctx.shadowBlur  = 8;
  ctx.beginPath();
  ctx.arc(x, y, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function _hex2rgba(hex, alpha) {
  // Accepts '#rrggbb' or CSS colour strings
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}