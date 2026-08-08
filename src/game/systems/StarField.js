/**
 * StarField.js — Three-layer parallax star field + shooting stars.
 *
 * Layer 0 (far)  — 180 tiny dim stars,  scroll at 0.05× player speed
 * Layer 1 (mid)  — 90  medium stars,    scroll at 0.15× player speed
 * Layer 2 (near) — 40  bright stars,    scroll at 0.30× player speed
 *
 * Stars wrap at screen edges so the field is infinite.
 * Shooting stars spawn randomly and streak across the screen.
 */

const LAYERS = [
  { count: 180, speedMult: 0.05, minR: 0.4, maxR: 0.9,  minA: 0.25, maxA: 0.55 },
  { count: 90,  speedMult: 0.15, minR: 0.8, maxR: 1.4,  minA: 0.4,  maxA: 0.75 },
  { count: 40,  speedMult: 0.30, minR: 1.2, maxR: 2.2,  minA: 0.6,  maxA: 1.0  },
];

const SHOOT_INTERVAL_MIN = 3.0;  // s
const SHOOT_INTERVAL_MAX = 7.0;  // s

export function makeStarField(W, H) {
  const layers = LAYERS.map(def => ({
    ...def,
    stars: Array.from({ length: def.count }, () => ({
      x:     Math.random() * W,
      y:     Math.random() * H,
      r:     def.minR + Math.random() * (def.maxR - def.minR),
      alpha: def.minA + Math.random() * (def.maxA - def.minA),
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.5 + Math.random() * 1.5,
      // Star colour: mostly white, some slightly blue/yellow tinted
      hue: Math.random() < 0.15 ? `rgba(180,200,255,` : Math.random() < 0.1 ? `rgba(255,240,180,` : `rgba(220,230,255,`,
    })),
  }));

  return {
    layers,
    shootingStars: [],
    nextShootTimer: SHOOT_INTERVAL_MIN + Math.random() * (SHOOT_INTERVAL_MAX - SHOOT_INTERVAL_MIN),
    // Track last player position for delta calculation
    lastPX: 0,
    lastPY: 0,
  };
}

export function updateStarField(sf, playerX, playerY, dt, W, H) {
  // Delta movement this frame
  const dx = playerX - sf.lastPX;
  const dy = playerY - sf.lastPY;
  sf.lastPX = playerX;
  sf.lastPY = playerY;

  // Scroll each layer by its parallax multiplier
  for (const layer of sf.layers) {
    for (const star of layer.stars) {
      star.x -= dx * layer.speedMult;
      star.y -= dy * layer.speedMult;
      star.twinklePhase = (star.twinklePhase + dt * star.twinkleSpeed) % (Math.PI * 2);

      // Wrap horizontally
      if (star.x < -4)      star.x += W + 8;
      if (star.x > W + 4)   star.x -= W + 8;
      // Wrap vertically
      if (star.y < -4)      star.y += H + 8;
      if (star.y > H + 4)   star.y -= H + 8;
    }
  }

  // Shooting star timer
  sf.nextShootTimer -= dt;
  if (sf.nextShootTimer <= 0) {
    sf.nextShootTimer = SHOOT_INTERVAL_MIN + Math.random() * (SHOOT_INTERVAL_MAX - SHOOT_INTERVAL_MIN);
    // Spawn from a random top/left edge point
    const angle  = (Math.random() * 0.4 + 0.1) * Math.PI; // mostly diagonal downward
    const speed  = 600 + Math.random() * 400;
    sf.shootingStars.push({
      x:     Math.random() * W,
      y:     Math.random() * H * 0.4,
      vx:    Math.cos(angle) * speed,
      vy:    Math.sin(angle) * speed,
      len:   80 + Math.random() * 120,
      alpha: 1,
      life:  1,
    });
  }

  // Update shooting stars
  sf.shootingStars = sf.shootingStars.filter(s => {
    s.x    += s.vx * dt;
    s.y    += s.vy * dt;
    s.life -= dt * 1.4;
    s.alpha = Math.max(0, s.life);
    return s.life > 0 && s.x < W + 200 && s.y < H + 200;
  });
}

export function drawStarField(ctx, sf) {
  // Far → near layers
  for (let li = 0; li < sf.layers.length; li++) {
    const layer = sf.layers[li];
    for (const star of layer.stars) {
      const twinkle = 0.85 + 0.15 * Math.sin(star.twinklePhase);
      const alpha   = star.alpha * twinkle;
      ctx.save();
      if (li === 2) {
        // Near stars get a subtle glow
        ctx.shadowColor = 'rgba(180,220,255,0.8)';
        ctx.shadowBlur  = 4;
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = `${star.hue}${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Shooting stars
  for (const s of sf.shootingStars) {
    ctx.save();
    ctx.globalAlpha = s.alpha * 0.9;
    const spd = Math.hypot(s.vx, s.vy);
    const nx  = s.vx / spd;
    const ny  = s.vy / spd;
    const grad = ctx.createLinearGradient(
      s.x - nx * s.len, s.y - ny * s.len,
      s.x, s.y,
    );
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.6, 'rgba(200,220,255,0.4)');
    grad.addColorStop(1, 'rgba(255,255,255,0.95)');
    ctx.strokeStyle = grad;
    ctx.lineWidth   = 1.5;
    ctx.lineCap     = 'round';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur  = 6;
    ctx.beginPath();
    ctx.moveTo(s.x - nx * s.len, s.y - ny * s.len);
    ctx.lineTo(s.x, s.y);
    ctx.stroke();
    // Bright tip
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle   = '#ffffff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}