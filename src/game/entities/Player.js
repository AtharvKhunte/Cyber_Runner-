/**
 * Player.js — exports the PLAYER_RADIUS constant used by CollisionSystem.
 * Full player logic lives in Game.jsx (via playerRef) to keep the RAF
 * callbacks together, but collision geometry must be importable independently.
 */
export const PLAYER_RADIUS = 14;
