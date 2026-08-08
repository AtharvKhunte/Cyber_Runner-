import { BULLET_RADIUS } from './BulletSystem';
import { PLAYER_RADIUS  } from '../entities/Player';

function circlesOverlap(ax, ay, ar, bx, by, br) {
  const dx = ax-bx, dy = ay-by, rSum = ar+br;
  return dx*dx+dy*dy < rSum*rSum;
}

export function checkBulletEnemyCollisions(bullets, enemies, bulletDamage = 1, piercing = false) {
  const deadEnemies     = new Set();
  const deadBullets     = new Set();
  let   scoreDelta      = 0;
  const killedPositions = [];

  for (let bi = 0; bi < bullets.length; bi++) {
    const b = bullets[bi];
    for (let ei = 0; ei < enemies.length; ei++) {
      const e = enemies[ei];
      if (!circlesOverlap(b.x, b.y, BULLET_RADIUS + (b.radiusBonus||0), e.x, e.y, e.radius)) continue;
      if (!piercing) deadBullets.add(bi);
      e.hp -= bulletDamage;
      e.flashTimer = 0.12;
      if (e.hp <= 0) {
        deadEnemies.add(ei);
        scoreDelta += e.type === 'boss' ? 100 : 10;
        killedPositions.push({ x: e.x, y: e.y });
      }
      if (!piercing) break;
    }
  }

  return {
    scoreDelta,
    killedPositions,
    bullets: bullets.filter((_,i) => !deadBullets.has(i)),
    enemies: enemies.filter((_,i) => !deadEnemies.has(i)),
  };
}

export function checkPlayerEnemyCollision(playerX, playerY, enemies) {
  const F = 0.88;
  for (const e of enemies) {
    if (circlesOverlap(playerX,playerY,PLAYER_RADIUS*F, e.x,e.y,e.radius*F)) return true;
  }
  return false;
}