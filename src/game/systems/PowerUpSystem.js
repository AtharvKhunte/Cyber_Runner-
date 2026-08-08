export const DROP_CHANCE    = 0.18;
export const POWERUP_RADIUS = 10;

export const POWERUP_DEFS = {
  shield:     { label: '🛡', color: '#00cfff', duration: 8,  instant: false },
  rapidFire:  { label: '⚡', color: '#ffe600', duration: 6,  instant: false },
  tripleShot: { label: '🔱', color: '#c060ff', duration: 6,  instant: false },
  speedBoost: { label: '💨', color: '#00ff88', duration: 6,  instant: false },
  nuke:       { label: '💥', color: '#ff6020', duration: 0,  instant: true  },
  extraLife:  { label: '❤️', color: '#ff4060', duration: 0,  instant: true  },
};

const TYPES = Object.keys(POWERUP_DEFS);

export function makePowerUpState() {
  return {
    pickups:   [],
    activeMap: {},
    shieldHp:  0,
  };
}

export function maybeDropPickup(ps, x, y) {
  if (Math.random() >= DROP_CHANCE) return;
  const type = TYPES[Math.floor(Math.random() * TYPES.length)];
  ps.pickups.push({ x, y, type, bobPhase: Math.random() * Math.PI * 2, radius: POWERUP_RADIUS });
}

export function updatePowerUps(ps, playerX, playerY, currentScore, dt) {
  const result = { collected: [], nukeTriggered: false, extraScoreDelta: 0 };

  for (const p of ps.pickups) {
    p.bobPhase = (p.bobPhase + dt * 3) % (Math.PI * 2);
  }

  const COLLECT_R = POWERUP_RADIUS + 14;
  ps.pickups = ps.pickups.filter((p) => {
    const dist = Math.hypot(playerX - p.x, playerY - p.y);
    if (dist < COLLECT_R) {
      applyPowerUp(ps, p.type, currentScore, result);
      result.collected.push(p.type);
      return false;
    }
    return true;
  });

  for (const type of Object.keys(ps.activeMap)) {
    ps.activeMap[type].remaining -= dt;
    if (ps.activeMap[type].remaining <= 0) delete ps.activeMap[type];
  }

  return result;
}

function applyPowerUp(ps, type, currentScore, result) {
  const def = POWERUP_DEFS[type];
  if (def.instant) {
    if (type === 'nuke')      result.nukeTriggered = true;
    if (type === 'extraLife') {
      if (ps.shieldHp === 0) ps.shieldHp = 1;
      else result.extraScoreDelta = 50;
    }
  } else {
    ps.activeMap[type] = { remaining: def.duration };
    if (type === 'shield') ps.shieldHp = 1;
  }
}

export function isActive(ps, type)   { return !!ps.activeMap[type]; }

export function consumeShieldHit(ps) {
  if (ps.shieldHp > 0) {
    ps.shieldHp = 0;
    delete ps.activeMap['shield'];
    return true;
  }
  return false;
}

export function currentFireCooldown(ps, base) {
  return isActive(ps, 'rapidFire') ? base / 3 : base;
}

export function currentPlayerSpeed(ps, base) {
  return isActive(ps, 'speedBoost') ? base * 1.6 : base;
}

export function drawPowerUps(ctx, ps) {
  for (const p of ps.pickups) {
    const def  = POWERUP_DEFS[p.type];
    const bobY = Math.sin(p.bobPhase) * 5;
    ctx.save();
    ctx.shadowColor = def.color;
    ctx.shadowBlur  = 18;
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = def.color;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y + bobY, p.radius + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle   = 'rgba(5,10,20,0.85)';
    ctx.beginPath();
    ctx.arc(p.x, p.y + bobY, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha      = 1;
    ctx.shadowBlur       = 0;
    ctx.font             = `${p.radius * 1.3}px serif`;
    ctx.textAlign        = 'center';
    ctx.textBaseline     = 'middle';
    ctx.fillText(def.label, p.x, p.y + bobY);
    ctx.restore();
  }
}

export function drawActiveBuffs(ctx, ps, x, y) {
  const entries = Object.entries(ps.activeMap);
  if (entries.length === 0 && ps.shieldHp === 0) return;

  const SLOT = 38;
  ctx.save();
  ctx.font         = '14px serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  entries.forEach(([type, { remaining }], i) => {
    const def   = POWERUP_DEFS[type];
    const sx    = x + i * (SLOT + 6);
    const ratio = Math.max(0, remaining / def.duration);
    ctx.fillStyle   = 'rgba(5,10,20,0.8)';
    ctx.strokeStyle = def.color;
    ctx.lineWidth   = 1.5;
    ctx.shadowColor = def.color;
    ctx.shadowBlur  = 8;
    roundRect(ctx, sx, y, SLOT, SLOT, 4); ctx.fill(); ctx.stroke();
    ctx.shadowBlur  = 0;
    ctx.fillStyle   = def.color;
    ctx.globalAlpha = 0.5;
    roundRect(ctx, sx, y + SLOT - 5, SLOT * ratio, 5, 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillText(def.label, sx + SLOT / 2, y + SLOT / 2 - 2);
  });

  if (ps.shieldHp > 0 && !ps.activeMap['shield']) {
    const def = POWERUP_DEFS.shield;
    const sx  = x + entries.length * (SLOT + 6);
    ctx.fillStyle   = 'rgba(5,10,20,0.8)';
    ctx.strokeStyle = def.color;
    ctx.lineWidth   = 1.5;
    ctx.shadowColor = def.color;
    ctx.shadowBlur  = 8;
    roundRect(ctx, sx, y, SLOT, SLOT, 4); ctx.fill(); ctx.stroke();
    ctx.shadowBlur  = 0;
    ctx.fillText(def.label, sx + SLOT / 2, y + SLOT / 2 - 2);
  }

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}