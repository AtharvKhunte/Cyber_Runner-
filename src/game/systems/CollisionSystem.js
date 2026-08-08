/**
 * CollisionSystem.js
 *
 * Broadphase-free circle-to-circle collision detection.
 *
 * For the entity counts in Cyber-Runner (tens of bullets, tens of enemies)
 * a simple O(b × e) sweep is fast enough and avoids the overhead of a
 * spatial hash. Revisit if counts exceed ~200 each.
 *
 * Exports two pure functions:
 *   checkBulletEnemyCollisions  → returns { score delta, filtered arrays }
 *   checkPlayerEnemyCollision   → returns boolean (game-over trigger)
 */

import { BULLET_RADIUS } from './BulletSystem';
import { ENEMY_RADIUS   } from './EnemySystem';
import { PLAYER_RADIUS  } from '../entities/Player';

/**
 * circlesOverlap — returns true when two circles intersect.
 * Uses squared distance to avoid a square-root per pair.
 */
function circlesOverlap(ax, ay, ar, bx, by, br) {
  const dx   = ax - bx;
  const dy   = ay - by;
  const rSum = ar + br;
  return dx * dx + dy * dy < rSum * rSum;
}

/**
 * checkBulletEnemyCollisions
 *
 * Iterates every bullet × every enemy pair.
 * Both parties are destroyed on contact; returns the score increment
 * (10 per enemy hit) and the survivors.
 *
 * Returns { scoreDelta, bullets, enemies }
 */
export function checkBulletEnemyCollisions(bullets, enemies) {
  const deadEnemies  = new Set();
  const deadBullets  = new Set();
  let   scoreDelta   = 0;

  for (let bi = 0; bi < bullets.length; bi++) {
    const b = bullets[bi];
    for (let ei = 0; ei < enemies.length; ei++) {
      if (deadEnemies.has(ei)) continue; // already destroyed this tick
      const e = enemies[ei];
      if (circlesOverlap(b.x, b.y, BULLET_RADIUS, e.x, e.y, ENEMY_RADIUS)) {
        deadBullets.add(bi);
        deadEnemies.add(ei);
        scoreDelta += 10;
        break; // a bullet can only hit one enemy
      }
    }
  }

  return {
    scoreDelta,
    bullets: bullets.filter((_, i) => !deadBullets.has(i)),
    enemies: enemies.filter((_, i) => !deadEnemies.has(i)),
  };
}

/**
 * checkPlayerEnemyCollision
 *
 * Returns true the moment any enemy centre overlaps the player circle.
 * A 10% radius reduction acts as a forgiveness margin — feels fair, hides
 * the circle approximation of the triangular ship hull.
 */
export function checkPlayerEnemyCollision(playerX, playerY, enemies) {
  const FORGIVENESS = 0.9; // 10 % smaller effective hit-box
  for (const e of enemies) {
    if (circlesOverlap(
      playerX, playerY, PLAYER_RADIUS * FORGIVENESS,
      e.x,     e.y,     ENEMY_RADIUS  * FORGIVENESS,
    )) return true;
  }
  return false;
}
