/**
 * Game.jsx — Cyber-Runner  (final edition: audio + persistence + start screen)
 *
 * New in this version
 * ───────────────────
 *  • useAudioEngine   — Web Audio API synthesised SFX: shoot, explosion, gameOver
 *  • useHighScore     — localStorage high-score read on mount, written on death
 *  • Three-phase flow — 'idle' → 'playing' → 'dead' → 'playing' (seamless loop)
 *  • Start screen     — animated title overlay with "PRESS START" prompt
 *  • Mute button      — top-right corner, persists across restarts
 *  • High-score HUD   — shown in the header bar and on the Game Over card
 *
 * State model
 * ───────────
 *  gameRef.current  — all mutable game data (player, bullets, enemies, particles)
 *                     mutated every RAF tick, never triggers React renders
 *
 *  React state (drives DOM only):
 *    phase        'idle' | 'playing' | 'dead'
 *    score        current run score (updated on each kill)
 *    enemyCount   live enemy count (updated on each kill)
 *    muted        audio mute toggle
 *    highScore    from useHighScore — read localStorage on mount
 */
import { useRef, useCallback, useState, useEffect } from 'react';
import { useInputVector  } from '../hooks/useInputVector';
import { useGameLoop     } from '../hooks/useGameLoop';
import { useAudioEngine  } from '../hooks/useAudioEngine';
import { useHighScore    } from '../hooks/useHighScore';
import { ParticleSystem  } from '../game/systems/ParticleSystem';
import {
  makeBulletState,
  updateBullets,
  drawBullets,
  FIRE_COOLDOWN,
} from '../game/systems/BulletSystem';
import {
  makeEnemyState,
  updateEnemies,
  ENEMY_RADIUS,
} from '../game/systems/EnemySystem';
import {
  checkBulletEnemyCollisions,
  checkPlayerEnemyCollision,
} from '../game/systems/CollisionSystem';
import styles from './Game.module.css';

/* ════════════════════════════════════════════════════════════════════
   CONSTANTS
════════════════════════════════════════════════════════════════════ */
export const PLAYER_RADIUS = 14;
const PLAYER_SPEED   = 220;
const SHIP_COLOR     = '#00ffe7';
const GLOW_COLOR     = '#00ffe7';
const GRID_COLOR     = 'rgba(0,255,231,0.05)';
const GRID_CELL      = 44;
const TRAIL_INTERVAL = 28; // ms

const lerp = (a, b, t) => a + (b - a) * t;

/* ════════════════════════════════════════════════════════════════════
   GAME STATE FACTORY
════════════════════════════════════════════════════════════════════ */
function makeGameState() {
  return {
    player: {
      x: 0, y: 0, px: 0, py: 0,
      vx: 0, vy: 0,
      initialised: false,
      angle: -Math.PI / 2,
      pulsePhase: 0,
      lastTrailMs: 0,
    },
    bullets:   makeBulletState(),
    enemies:   makeEnemyState(),
    particles: new ParticleSystem(),
    score:     0,
    // Track previous bullet count so we can detect the frame a shot fires
    prevBulletCount: 0,
  };
}

/* ════════════════════════════════════════════════════════════════════
   DRAW HELPERS
════════════════════════════════════════════════════════════════════ */
function drawGrid(ctx, W, H, playerX, playerY) {
  ctx.save();
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth   = 1;
  const ox = ((playerX % GRID_CELL) + GRID_CELL) % GRID_CELL;
  const oy = ((playerY % GRID_CELL) + GRID_CELL) % GRID_CELL;
  for (let x = -ox; x <= W; x += GRID_CELL) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = -oy; y <= H; y += GRID_CELL) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.restore();
}

function drawShip(ctx, x, y, angle, pulse) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);

  const L = PLAYER_RADIUS * 1.6;
  const W = PLAYER_RADIUS * 0.9;

  const hullPath = () => {
    ctx.beginPath();
    ctx.moveTo(0, -L);
    ctx.lineTo( W,  L * 0.55);
    ctx.lineTo(-W,  L * 0.55);
    ctx.closePath();
  };

  ctx.globalAlpha = 0.18 + pulse * 0.08;
  ctx.shadowColor = GLOW_COLOR;
  ctx.shadowBlur  = 55 + pulse * 20;
  ctx.fillStyle   = GLOW_COLOR;
  hullPath(); ctx.fill();

  ctx.globalAlpha = 1;
  ctx.shadowColor = GLOW_COLOR;
  ctx.shadowBlur  = 22 + pulse * 14;
  const grad = ctx.createLinearGradient(0, -L, 0, L * 0.55);
  grad.addColorStop(0,    '#ffffff');
  grad.addColorStop(0.35, SHIP_COLOR);
  grad.addColorStop(0.75, 'rgba(0,200,180,0.6)');
  grad.addColorStop(1,    'rgba(0,100,90,0.2)');
  ctx.fillStyle = grad;
  hullPath(); ctx.fill();

  ctx.globalAlpha = 0.7 + pulse * 0.3;
  ctx.shadowBlur  = 8;
  ctx.strokeStyle = '#80fff5';
  ctx.lineWidth   = 0.8;
  hullPath(); ctx.stroke();

  const exhaustY = L * 0.55;
  const exhaustR = W * (0.6 + pulse * 0.5);
  const eg = ctx.createRadialGradient(0, exhaustY, 0, 0, exhaustY, exhaustR * 2.2);
  eg.addColorStop(0,   `rgba(0,255,231,${0.6 + pulse * 0.4})`);
  eg.addColorStop(0.3, `rgba(255,120,60,${0.3 + pulse * 0.25})`);
  eg.addColorStop(0.7, `rgba(255,60,20,${0.12 + pulse * 0.1})`);
  eg.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.globalAlpha = 1;
  ctx.shadowColor = '#ff6030';
  ctx.shadowBlur  = 18 + pulse * 14;
  ctx.fillStyle   = eg;
  ctx.beginPath();
  ctx.arc(0, exhaustY, exhaustR * 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.9;
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur  = 10;
  ctx.fillStyle   = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, -L + 2, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawEnemies(ctx, enemies, alpha) {
  for (const e of enemies) {
    const x = e.px + (e.x - e.px) * alpha;
    const y = e.py + (e.y - e.py) * alpha;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(e.rotPhase);

    ctx.globalAlpha = 0.22;
    ctx.shadowColor = '#ff2d6b';
    ctx.shadowBlur  = 40;
    ctx.fillStyle   = '#ff2d6b';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      i === 0
        ? ctx.moveTo(Math.cos(a) * (ENEMY_RADIUS + 6), Math.sin(a) * (ENEMY_RADIUS + 6))
        : ctx.lineTo(Math.cos(a) * (ENEMY_RADIUS + 6), Math.sin(a) * (ENEMY_RADIUS + 6));
    }
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.shadowColor = '#ff2d6b';
    ctx.shadowBlur  = 20;
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, ENEMY_RADIUS);
    gr.addColorStop(0,   'rgba(255,130,160,0.95)');
    gr.addColorStop(0.5, '#ff2d6b');
    gr.addColorStop(1,   'rgba(180,20,55,0.5)');
    ctx.fillStyle = gr;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      i === 0
        ? ctx.moveTo(Math.cos(a) * ENEMY_RADIUS, Math.sin(a) * ENEMY_RADIUS)
        : ctx.lineTo(Math.cos(a) * ENEMY_RADIUS, Math.sin(a) * ENEMY_RADIUS);
    }
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur  = 12;
    ctx.strokeStyle = '#ff90b8';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    ctx.globalAlpha = 0.35;
    ctx.shadowBlur  = 4;
    ctx.strokeStyle = '#ffb8d0';
    ctx.lineWidth   = 0.8;
    ctx.beginPath();
    ctx.moveTo(-ENEMY_RADIUS * 0.5, 0);
    ctx.lineTo( ENEMY_RADIUS * 0.5, 0);
    ctx.moveTo(0, -ENEMY_RADIUS * 0.5);
    ctx.lineTo(0,  ENEMY_RADIUS * 0.5);
    ctx.stroke();

    ctx.restore();
  }
}

function drawJoystick(ctx, joystick) {
  const { originX, originY, stickX, stickY, radius } = joystick;
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.shadowColor = SHIP_COLOR;
  ctx.shadowBlur  = 12;
  ctx.strokeStyle = SHIP_COLOR;
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.arc(originX, originY, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(stickX, stickY);
  ctx.stroke();
  ctx.globalAlpha = 0.75;
  ctx.fillStyle   = SHIP_COLOR;
  ctx.beginPath();
  ctx.arc(stickX, stickY, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.arc(originX, originY, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* ════════════════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════════════════ */
export default function Game() {
  const canvasRef = useRef(null);
  const inputRef  = useInputVector(canvasRef);
  const audio     = useAudioEngine();
  const { highScore, saveIfBest } = useHighScore();
  const gameRef   = useRef(makeGameState());

  // ── React state — DOM HUD + overlays only ──────────────────────────────
  const [score,      setScore]      = useState(0);
  const [phase,      setPhase]      = useState('idle');    // 'idle'|'playing'|'dead'
  const [enemyCount, setEnemyCount] = useState(0);
  const [muted,      setMuted]      = useState(false);

  // Stable refs to setters + phase — readable inside RAF without stale closure
  const setScoreRef      = useRef(setScore);
  const setPhaseRef      = useRef(setPhase);
  const setEnemyCountRef = useRef(setEnemyCount);
  const phaseRef         = useRef('idle');
  const audioRef         = useRef(audio);     // stable ref so update() can call SFX
  useEffect(() => { audioRef.current = audio; }, [audio]);

  /* ── startGame ──────────────────────────────────────────────────────── */
  const startGame = useCallback(() => {
    gameRef.current  = makeGameState();
    phaseRef.current = 'playing';
    setPhaseRef.current('playing');
    setScoreRef.current(0);
    setEnemyCountRef.current(0);
  }, []);

  /* ── Keyboard shortcuts ─────────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e) => {
      const p = phaseRef.current;
      if ((p === 'idle' || p === 'dead') &&
          (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        startGame();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [startGame]);

  /* ── Mute toggle ────────────────────────────────────────────────────── */
  const toggleMute = useCallback(() => {
    const nowEnabled = audio.toggle();
    setMuted(!nowEnabled);
  }, [audio]);

  /* ── UPDATE (60 Hz fixed tick) ──────────────────────────────────────── */
  const update = useCallback((dt) => {
    if (phaseRef.current !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const gs  = gameRef.current;
    const p   = gs.player;
    const ps  = gs.particles;
    const inp = inputRef.current;
    const sfx = audioRef.current;
    const W   = canvas.clientWidth;
    const H   = canvas.clientHeight;

    /* 1. Centre player on first tick */
    if (!p.initialised) {
      p.x = p.px = W / 2;
      p.y = p.py = H / 2;
      p.initialised = true;
    }

    /* 2. Movement */
    p.px = p.x; p.py = p.y;
    p.vx = inp.x * PLAYER_SPEED;
    p.vy = inp.y * PLAYER_SPEED;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    const PAD = PLAYER_RADIUS + 4;
    p.x = Math.max(PAD, Math.min(W - PAD, p.x));
    p.y = Math.max(PAD, Math.min(H - PAD, p.y));

    /* 3. Heading */
    if (Math.abs(p.vx) > 1 || Math.abs(p.vy) > 1) {
      const target  = Math.atan2(p.vy, p.vx);
      const da      = target - p.angle;
      const wrapped = ((da + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      p.angle += wrapped * Math.min(dt * 12, 1);
    }

    /* 4. Engine pulse */
    const moving = Math.abs(inp.x) > 0.05 || Math.abs(inp.y) > 0.05;
    p.pulsePhase = (p.pulsePhase + dt * (moving ? 8 : 3)) % (Math.PI * 2);

    /* 5. Trail */
    const nowMs = performance.now();
    if (moving && nowMs - p.lastTrailMs > TRAIL_INTERVAL) {
      p.lastTrailMs = nowMs;
      const bx = p.x - Math.cos(p.angle) * PLAYER_RADIUS * 0.7;
      const by = p.y - Math.sin(p.angle) * PLAYER_RADIUS * 0.7;
      ps.emitPlayerTrail(bx, by);
    }

    /* 6. Bullets — detect new shots for audio */
    const prevCount = gs.bullets.bullets.length;
    updateBullets(gs.bullets, inp.fire, p.x, p.y, p.angle, dt, W, H);

    // A bullet was added this tick → fire SFX
    // (new count > prev, accounting for culling — check cooldown hit 0)
    if (gs.bullets.bullets.length > prevCount) {
      sfx.shoot();
    }

    /* 7. Enemies */
    updateEnemies(gs.enemies, p.x, p.y, gs.score, dt, W, H);

    /* 8. Bullet × Enemy collisions */
    const { scoreDelta, bullets: liveBullets, enemies: liveEnemies } =
      checkBulletEnemyCollisions(gs.bullets.bullets, gs.enemies.enemies);

    if (scoreDelta > 0) {
      const liveSet = new Set(liveEnemies);
      let killCount = 0;
      for (const e of gs.enemies.enemies) {
        if (!liveSet.has(e)) {
          ps.emitEnemyExplosion(e.x, e.y, ENEMY_RADIUS);
          killCount++;
        }
      }
      // One explosion SFX per enemy killed this tick (staggered to avoid clipping)
      for (let k = 0; k < killCount; k++) {
        setTimeout(() => sfx.explosion(), k * 55);
      }

      gs.bullets.bullets = liveBullets;
      gs.enemies.enemies = liveEnemies;
      gs.score          += scoreDelta;
      setScoreRef.current(gs.score);
      setEnemyCountRef.current(liveEnemies.length);
    }

    /* 9. Update particles */
    ps.update(dt);

    /* 10. Player × Enemy collision → Game Over */
    if (checkPlayerEnemyCollision(p.x, p.y, gs.enemies.enemies)) {
      phaseRef.current = 'dead';
      setPhaseRef.current('dead');

      // Persist high score and play game-over SFX
      saveIfBest(gs.score);
      sfx.gameOver();
    }

  }, [inputRef, saveIfBest]);

  /* ── RENDER ─────────────────────────────────────────────────────────── */
  const render = useCallback((ctx, alpha) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const W  = canvas.clientWidth;
    const H  = canvas.clientHeight;
    const gs = gameRef.current;
    const p  = gs.player;

    // Background
    ctx.fillStyle = '#050a14';
    ctx.fillRect(0, 0, W, H);

    // On the idle screen, just draw an animated grid — no player/enemies yet
    const drawX = p.initialised ? lerp(p.px, p.x, alpha) : W / 2;
    const drawY = p.initialised ? lerp(p.py, p.y, alpha) : H / 2;

    drawGrid(ctx, W, H, drawX, drawY);

    if (phaseRef.current !== 'idle') {
      gs.particles.draw(ctx, alpha);
      drawBullets(ctx, gs.bullets.bullets, alpha);
      drawEnemies(ctx, gs.enemies.enemies, alpha);
      const pulse = (Math.sin(p.pulsePhase) + 1) / 2;
      drawShip(ctx, drawX, drawY, p.angle, pulse);
      if (inputRef.current.joystick) drawJoystick(ctx, inputRef.current.joystick);
    }

    // Particle pool debug (bottom-left)
    ctx.save();
    ctx.font      = '10px "Share Tech Mono",monospace';
    ctx.fillStyle = 'rgba(0,255,231,0.22)';
    ctx.fillText(
      `PARTICLES  active:${String(gs.particles.activeCount).padStart(3,' ')}  pool:${String(gs.particles.poolCount).padStart(3,' ')}`,
      10, H - 10,
    );
    ctx.restore();

  }, [inputRef]);

  useGameLoop(canvasRef, { update, render });

  /* ── JSX ─────────────────────────────────────────────────────────────── */
  return (
    <div className={styles.gameWrapper}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="Cyber-Runner — WASD/touch to move, Space to fire"
      />

      {/* ── HUD bar ─────────────────────────────────────────────────── */}
      <header className={styles.hudBar}>
        {/* Score (left) */}
        <span className={styles.hudLeft}>
          <span className={styles.hudLabel}>SCORE</span>
          <span className={styles.hudValue}>{String(score).padStart(6, '0')}</span>
        </span>

        {/* Title (centre) */}
        <span className={styles.hudTitle}>CYBER-RUNNER</span>

        {/* High score + mute (right) */}
        <span className={styles.hudRight}>
          <span className={styles.hudLabel}>BEST</span>
          <span className={styles.hudValue}>{String(highScore).padStart(6, '0')}</span>
        </span>
      </header>

      {/* ── Mute button (fixed top-right corner) ────────────────────── */}
      <button
        className={styles.muteBtn}
        onClick={toggleMute}
        aria-label={muted ? 'Unmute audio' : 'Mute audio'}
        title={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? '🔇' : '🔊'}
      </button>

      {/* ── Start screen (idle phase) ────────────────────────────────── */}
      {phase === 'idle' && (
        <div className={styles.overlay} role="dialog" aria-label="Start screen">
          <div className={`${styles.overlayCard} ${styles.startCard}`}>
            <p className={styles.overlayEyebrow}>INITIALISING SYSTEMS</p>
            <h1 className={`${styles.overlayTitle} ${styles.startTitle}`}>
              CYBER-RUNNER
            </h1>
            <ul className={styles.controls}>
              <li><kbd>WASD</kbd> / <kbd>↑↓←→</kbd> Move</li>
              <li><kbd>Space</kbd> Fire</li>
              <li>Touch &amp; drag on mobile</li>
            </ul>
            <button
              className={styles.restartBtn}
              onClick={startGame}
              autoFocus
            >
              START GAME
            </button>
            <p className={styles.overlayHint}>or press Enter / Space</p>
            {highScore > 0 && (
              <p className={styles.overlayHighScore}>
                BEST&nbsp;<strong>{String(highScore).padStart(6, '0')}</strong>
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Game Over overlay (dead phase) ──────────────────────────── */}
      {phase === 'dead' && (
        <div className={styles.overlay} role="dialog" aria-label="Game Over">
          <div className={styles.overlayCard}>
            <p className={styles.overlayEyebrow}>SYSTEM FAILURE</p>
            <h1 className={styles.overlayTitle}>GAME OVER</h1>

            <p className={styles.overlayScore}>
              SCORE&nbsp;<strong>{String(score).padStart(6, '0')}</strong>
            </p>

            {score >= highScore && score > 0 && (
              <p className={styles.newRecord}>✦ NEW RECORD ✦</p>
            )}

            <p className={styles.overlayScore}>
              BEST&nbsp;<strong>{String(highScore).padStart(6, '0')}</strong>
            </p>

            <button
              className={styles.restartBtn}
              onClick={startGame}
              autoFocus
            >
              PLAY AGAIN
            </button>
            <p className={styles.overlayHint}>or press Enter / Space</p>
          </div>
        </div>
      )}
    </div>
  );
}
