import { ENEMY_RADIUS } from './EnemySystem';

const ORBIT_SPEED         = 2.2;
const ORBIT_RADIUS        = 38;
const ORBIT_BULLET_RADIUS = 7;

export function makeOrbitState() {
  return { bullets: [], phase: 0 };
}

export function updateOrbit(orbit, count, playerX, playerY, dt) {
  orbit.phase = (orbit.phase + ORBIT_SPEED * dt) % (Math.PI * 2);

  while (orbit.bullets.length < count) {
    orbit.bullets.push({ angle: 0, x: playerX, y: playerY });
  }
  orbit.bullets.length = count;

  for (let i = 0; i < orbit.bullets.length; i++) {
    const a = orbit.phase + (i / Math.max(count, 1)) * Math.PI * 2;
    orbit.bullets[i].angle = a;
    orbit.bullets[i].x     = playerX + Math.cos(a) * ORBIT_RADIUS;
    orbit.bullets[i].y     = playerY + Math.sin(a) * ORBIT_RADIUS;
  }
}

export function checkOrbitCollisions(orbit, enemies) {
  if (!orbit.bullets.length) return { enemies, scoreDelta: 0, killedIndices: [] };

  const dead = new Set();
  let scoreDelta = 0;

  for (const ob of orbit.bullets) {
    for (let ei = 0; ei < enemies.length; ei++) {
      if (dead.has(ei)) continue;
      const e    = enemies[ei];
      const dist = Math.hypot(ob.x - e.x, ob.y - e.y);
      if (dist < ORBIT_BULLET_RADIUS + e.radius) {
        e.hp -= 1;
        if (e.hp <= 0) {
          dead.add(ei);
          scoreDelta += e.type === 'boss' ? 100 : 10;
        }
      }
    }
  }

  return {
    enemies:       enemies.filter((_, i) => !dead.has(i)),
    scoreDelta,
    killedIndices: [...dead],
  };
}

export function drawOrbit(ctx, orbit) {
  for (const ob of orbit.bullets) {
    ctx.save();
    ctx.shadowColor = '#00cfff';
    ctx.shadowBlur  = 20;
    ctx.fillStyle   = '#00cfff';
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(ob.x, ob.y, ORBIT_BULLET_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle   = '#ffffff';
    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    ctx.arc(ob.x, ob.y, ORBIT_BULLET_RADIUS * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}