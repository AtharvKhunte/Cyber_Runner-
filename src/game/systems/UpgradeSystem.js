export const UPGRADE_POOL = [
  {
    id: 'damage_up',
    label: 'OVERCHARGE',
    icon: '⚡',
    desc: 'Bullet damage +1',
    color: '#ffe600',
    apply: (run) => { run.bulletDamage += 1; },
  },
  {
    id: 'fire_rate_up',
    label: 'RAPID FIRE',
    icon: '🔫',
    desc: 'Fire cooldown −20%',
    color: '#ff8800',
    apply: (run) => { run.fireCooldownMult *= 0.80; },
  },
  {
    id: 'bullet_size_up',
    label: 'WARHEAD',
    icon: '💣',
    desc: 'Bullet radius +3 px',
    color: '#ff4444',
    apply: (run) => { run.bulletRadiusBonus += 3; },
  },
  {
    id: 'move_speed_up',
    label: 'AFTERBURNER',
    icon: '💨',
    desc: 'Move speed +25 px/s',
    color: '#00ff88',
    apply: (run) => { run.speedBonus += 25; },
  },
  {
    id: 'piercing',
    label: 'RAILGUN',
    icon: '🎯',
    desc: 'Bullets pierce through enemies',
    color: '#c060ff',
    apply: (run) => { run.piercing = true; },
  },
  {
    id: 'orbit_shield',
    label: 'ORBIT SHIELD',
    icon: '🌀',
    desc: '3 orbiting bullets protect you',
    color: '#00cfff',
    apply: (run) => { run.orbitCount = Math.min((run.orbitCount || 0) + 3, 6); },
  },
  {
    id: 'magnet',
    label: 'MAGNET',
    icon: '🧲',
    desc: 'Power-ups auto-collect from twice the range',
    color: '#ff60cc',
    apply: (run) => { run.magnetRange *= 2; },
  },
  {
    id: 'double_points',
    label: 'DOUBLE XP',
    icon: '✖️',
    desc: 'Score multiplier ×2',
    color: '#ffe600',
    apply: (run) => { run.scoreMultiplier *= 2; },
  },
  {
    id: 'ricochet',
    label: 'RICOCHET',
    icon: '↩️',
    desc: 'Bullets bounce off screen edges once',
    color: '#80ffcc',
    apply: (run) => { run.ricochet = true; },
  },
  {
    id: 'shield_regen',
    label: 'PHASE SHIELD',
    icon: '🛡',
    desc: 'Shield recharges 8s after breaking',
    color: '#00cfff',
    apply: (run) => { run.shieldRegen = true; },
  },
  {
    id: 'triple_shot',
    label: 'SPREAD SHOT',
    icon: '🔱',
    desc: 'Fire 3 bullets per shot permanently',
    color: '#c060ff',
    apply: (run) => { run.tripleShot = true; },
  },
  {
    id: 'score_on_kill',
    label: 'EXECUTIONER',
    icon: '💀',
    desc: '+5 bonus score per kill',
    color: '#ff2d6b',
    apply: (run) => { run.bonusScorePerKill += 5; },
  },
];

export function rollUpgrades(count = 3) {
  const shuffled = [...UPGRADE_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function makeRunState(metaBonus = {}) {
  return {
    bulletDamage:      1  + (metaBonus.bulletDamage      || 0),
    fireCooldownMult:  1  * (metaBonus.fireCooldownMult  || 1),
    bulletRadiusBonus: 0  + (metaBonus.bulletRadiusBonus || 0),
    speedBonus:        0  + (metaBonus.speedBonus        || 0),
    piercing:          metaBonus.piercing    || false,
    orbitCount:        metaBonus.orbitCount  || 0,
    magnetRange:       1  * (metaBonus.magnetRange       || 1),
    scoreMultiplier:   1  * (metaBonus.scoreMultiplier   || 1),
    ricochet:          metaBonus.ricochet    || false,
    shieldRegen:       metaBonus.shieldRegen || false,
    tripleShot:        metaBonus.tripleShot  || false,
    bonusScorePerKill: 0  + (metaBonus.bonusScorePerKill || 0),
    shieldRegenTimer:  0,
    pickedUpgrades:    [],
  };
}

export function updateRunState(run, powerUps, dt) {
  if (run.shieldRegen && powerUps.shieldHp === 0) {
    run.shieldRegenTimer -= dt;
    if (run.shieldRegenTimer <= 0) {
      powerUps.shieldHp    = 1;
      run.shieldRegenTimer = 8;
    }
  }
}