import { useRef, useCallback, useState, useEffect } from 'react';
import { useInputVector  } from '../hooks/useInputVector';
import { useGameLoop     } from '../hooks/useGameLoop';
import { useAudioEngine  } from '../hooks/useAudioEngine';
import { useHighScore    } from '../hooks/useHighScore';
import { ParticleSystem  } from '../game/systems/ParticleSystem';
import {
  makeBulletState, updateBullets, drawBullets, BASE_FIRE_COOLDOWN,
} from '../game/systems/BulletSystem';
import {
  makeEnemyState, updateEnemies, drawEnemies,
  spawnNormalEnemy, spawnBoss, ENEMY_RADIUS,
} from '../game/systems/EnemySystem';
import {
  checkBulletEnemyCollisions, checkPlayerEnemyCollision,
} from '../game/systems/CollisionSystem';
import {
  makeWaveState, updateWave, isBossWave,
} from '../game/systems/WaveSystem';
import {
  makePowerUpState, updatePowerUps, drawPowerUps, drawActiveBuffs,
  maybeDropPickup, consumeShieldHit, isActive,
  currentFireCooldown, currentPlayerSpeed,
} from '../game/systems/PowerUpSystem';
import styles from './Game.module.css';

export const PLAYER_RADIUS  = 14;
const BASE_PLAYER_SPEED     = 220;
const SHIP_COLOR            = '#00ffe7';
const GLOW_COLOR            = '#00ffe7';
const GRID_COLOR            = 'rgba(0,255,231,0.05)';
const GRID_CELL             = 44;
const TRAIL_INTERVAL        = 28;
const lerp = (a, b, t) => a + (b - a) * t;

function makeGameState() {
  return {
    player: {
      x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0,
      initialised: false,
      angle: -Math.PI / 2,
      pulsePhase: 0,
      lastTrailMs: 0,
    },
    bullets:   makeBulletState(),
    enemies:   makeEnemyState(),
    particles: new ParticleSystem(),
    powerUps:  makePowerUpState(),
    wave:      makeWaveState(),
    score:     0,
    shake:     { x: 0, y: 0, magnitude: 0 },
  };
}

function triggerShake(shake, magnitude) {
  shake.magnitude = Math.max(shake.magnitude, magnitude);
}

function updateShake(shake, dt) {
  if (shake.magnitude < 0.1) { shake.x = 0; shake.y = 0; shake.magnitude = 0; return; }
  shake.magnitude = Math.max(0, shake.magnitude - 8 * dt);
  shake.x = (Math.random() * 2 - 1) * shake.magnitude;
  shake.y = (Math.random() * 2 - 1) * shake.magnitude;
}

function drawGrid(ctx, W, H, px, py) {
  ctx.save();
  ctx.strokeStyle = GRID_COLOR; ctx.lineWidth = 1;
  const ox = ((px % GRID_CELL) + GRID_CELL) % GRID_CELL;
  const oy = ((py % GRID_CELL) + GRID_CELL) % GRID_CELL;
  for (let x = -ox; x <= W; x += GRID_CELL) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = -oy; y <= H; y += GRID_CELL) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  ctx.restore();
}

function drawShip(ctx, x, y, angle, pulse, shielded) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);
  const L = PLAYER_RADIUS * 1.6, W = PLAYER_RADIUS * 0.9;
  const hull = () => {
    ctx.beginPath();
    ctx.moveTo(0,-L); ctx.lineTo(W, L*0.55); ctx.lineTo(-W, L*0.55); ctx.closePath();
  };
  ctx.globalAlpha = 0.18 + pulse * 0.08;
  ctx.shadowColor = GLOW_COLOR; ctx.shadowBlur = 55 + pulse * 20;
  ctx.fillStyle   = GLOW_COLOR; hull(); ctx.fill();
  ctx.globalAlpha = 1; ctx.shadowColor = GLOW_COLOR; ctx.shadowBlur = 22 + pulse * 14;
  const g = ctx.createLinearGradient(0,-L,0,L*0.55);
  g.addColorStop(0,'#ffffff'); g.addColorStop(0.35,SHIP_COLOR);
  g.addColorStop(0.75,'rgba(0,200,180,0.6)'); g.addColorStop(1,'rgba(0,100,90,0.2)');
  ctx.fillStyle = g; hull(); ctx.fill();
  ctx.globalAlpha = 0.7 + pulse * 0.3; ctx.shadowBlur = 8;
  ctx.strokeStyle = '#80fff5'; ctx.lineWidth = 0.8; hull(); ctx.stroke();
  const ey = L*0.55, er = W*(0.6+pulse*0.5);
  const eg = ctx.createRadialGradient(0,ey,0,0,ey,er*2.2);
  eg.addColorStop(0,`rgba(0,255,231,${0.6+pulse*0.4})`);
  eg.addColorStop(0.3,`rgba(255,120,60,${0.3+pulse*0.25})`);
  eg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.globalAlpha = 1; ctx.shadowColor = '#ff6030'; ctx.shadowBlur = 18+pulse*14;
  ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(0,ey,er*2.2,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha = 0.9; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 10;
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0,-L+2,2,0,Math.PI*2); ctx.fill();
  ctx.restore();

  if (shielded) {
    ctx.save();
    ctx.strokeStyle = '#00cfff'; ctx.shadowColor = '#00cfff'; ctx.shadowBlur = 20;
    ctx.lineWidth   = 2;
    ctx.globalAlpha = 0.6 + 0.3 * Math.sin(Date.now() * 0.006);
    ctx.beginPath(); ctx.arc(x, y, PLAYER_RADIUS + 10, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

function drawJoystick(ctx, joystick) {
  const { originX, originY, stickX, stickY, radius } = joystick;
  ctx.save();
  ctx.globalAlpha = 0.35; ctx.shadowColor = SHIP_COLOR; ctx.shadowBlur = 12;
  ctx.strokeStyle = SHIP_COLOR; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(originX, originY, radius, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.5;
  ctx.beginPath(); ctx.moveTo(originX, originY); ctx.lineTo(stickX, stickY); ctx.stroke();
  ctx.globalAlpha = 0.75; ctx.fillStyle = SHIP_COLOR;
  ctx.beginPath(); ctx.arc(stickX, stickY, 10, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export default function Game() {
  const canvasRef    = useRef(null);
  const inputRef     = useInputVector(canvasRef);
  const audio        = useAudioEngine();
  const { highScore, saveIfBest } = useHighScore();
  const gameRef      = useRef(makeGameState());
  const touchFireRef = useRef(false);

  const [score,        setScore]        = useState(0);
  const [wave,         setWave]         = useState(1);
  const [phase,        setPhase]        = useState('idle');
  const [wavePhase,    setWavePhase]    = useState('announce');
  const [announcement, setAnnouncement] = useState('WAVE 1');
  const [muted,        setMuted]        = useState(false);
  const [isBoss,       setIsBoss]       = useState(false);

  const setScoreRef        = useRef(setScore);
  const setWaveRef         = useRef(setWave);
  const setPhaseRef        = useRef(setPhase);
  const setWavePhaseRef    = useRef(setWavePhase);
  const setAnnouncementRef = useRef(setAnnouncement);
  const setIsBossRef       = useRef(setIsBoss);
  const phaseRef           = useRef('idle');
  const wavePhaseRef       = useRef('announce');
  const audioRef           = useRef(audio);
  useEffect(() => { audioRef.current = audio; }, [audio]);

  const startGame = useCallback(() => {
    gameRef.current       = makeGameState();
    phaseRef.current      = 'playing';
    wavePhaseRef.current  = 'announce';
    setPhaseRef.current('playing');
    setScoreRef.current(0);
    setWaveRef.current(1);
    setWavePhaseRef.current('announce');
    setAnnouncementRef.current('WAVE 1');
    setIsBossRef.current(false);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((phaseRef.current === 'idle' || phaseRef.current === 'dead') &&
          (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault(); startGame();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [startGame]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, []);

  const toggleMute = useCallback(() => {
    setMuted(!audio.toggle());
  }, [audio]);

  const update = useCallback((dt) => {
    if (phaseRef.current !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gs  = gameRef.current;
    const p   = gs.player;
    const ps  = gs.particles;
    const pu  = gs.powerUps;
    const ws  = gs.wave;
    const inp = inputRef.current;
    const sfx = audioRef.current;
    const W   = canvas.clientWidth;
    const H   = canvas.clientHeight;

    if (!p.initialised) {
      p.x = p.px = W / 2; p.y = p.py = H / 2; p.initialised = true;
    }

    updateShake(gs.shake, dt);

    p.px = p.x; p.py = p.y;
    const speed = currentPlayerSpeed(pu, BASE_PLAYER_SPEED);
    p.vx = inp.x * speed; p.vy = inp.y * speed;
    p.x += p.vx * dt; p.y += p.vy * dt;
    const PAD = PLAYER_RADIUS + 4;
    p.x = Math.max(PAD, Math.min(W - PAD, p.x));
    p.y = Math.max(PAD, Math.min(H - PAD, p.y));

    if (Math.abs(p.vx) > 1 || Math.abs(p.vy) > 1) {
      const target = Math.atan2(p.vy, p.vx);
      const da = target - p.angle;
      const wrapped = ((da + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      p.angle += wrapped * Math.min(dt * 12, 1);
    }

    const moving = Math.abs(inp.x) > 0.05 || Math.abs(inp.y) > 0.05;
    p.pulsePhase = (p.pulsePhase + dt * (moving ? 8 : 3)) % (Math.PI * 2);
    const nowMs = performance.now();
    if (moving && nowMs - p.lastTrailMs > TRAIL_INTERVAL) {
      p.lastTrailMs = nowMs;
      ps.emitPlayerTrail(
        p.x - Math.cos(p.angle) * PLAYER_RADIUS * 0.7,
        p.y - Math.sin(p.angle) * PLAYER_RADIUS * 0.7,
      );
    }

    const waveResult = updateWave(ws, dt, gs.enemies.enemies.length);
    if (waveResult.spawnNormal) spawnNormalEnemy(gs.enemies, W, H, ws.wave);
    if (waveResult.spawnBoss) {
      spawnBoss(gs.enemies, W);
      setIsBossRef.current(true);
      triggerShake(gs.shake, 12);
    }
    if (waveResult.waveClear) {
      setWavePhaseRef.current('clear');
      wavePhaseRef.current = 'clear';
      setIsBossRef.current(false);
    }
    if (waveResult.nextWaveAnnounce) {
      setWaveRef.current(ws.wave);
      setAnnouncementRef.current(ws.announcement);
      setWavePhaseRef.current('announce');
      wavePhaseRef.current = 'announce';
    }

    const firing = inp.fire || touchFireRef.current;
    const prevCount = gs.bullets.bullets.length;
    updateBullets(
      gs.bullets, firing, p.x, p.y, p.angle, dt, W, H,
      isActive(pu, 'tripleShot'),
      currentFireCooldown(pu, BASE_FIRE_COOLDOWN),
    );
    if (gs.bullets.bullets.length > prevCount) sfx.shoot();

    updateEnemies(gs.enemies, p.x, p.y, ws.wave, dt);

    const { scoreDelta, bullets: liveBullets, enemies: liveEnemies, killedPositions } =
      checkBulletEnemyCollisions(gs.bullets.bullets, gs.enemies.enemies);

    if (scoreDelta > 0) {
      gs.bullets.bullets = liveBullets;
      gs.enemies.enemies = liveEnemies;
      gs.score          += scoreDelta;
      setScoreRef.current(gs.score);
      killedPositions.forEach((pos, i) => {
        ps.emitEnemyExplosion(pos.x, pos.y, ENEMY_RADIUS);
        maybeDropPickup(pu, pos.x, pos.y);
        setTimeout(() => sfx.explosion(), i * 55);
      });
      if (killedPositions.length) triggerShake(gs.shake, 5);
    }

    const puResult = updatePowerUps(pu, p.x, p.y, gs.score, dt);
    if (puResult.nukeTriggered) {
      gs.enemies.enemies.forEach(e => ps.emitEnemyExplosion(e.x, e.y, e.radius));
      gs.score += gs.enemies.enemies.length * 10;
      gs.enemies.enemies = [];
      setScoreRef.current(gs.score);
      triggerShake(gs.shake, 18);
      sfx.explosion();
    }
    if (puResult.extraScoreDelta > 0) {
      gs.score += puResult.extraScoreDelta;
      setScoreRef.current(gs.score);
    }

    ps.update(dt);

    if (checkPlayerEnemyCollision(p.x, p.y, gs.enemies.enemies)) {
      if (consumeShieldHit(pu)) {
        triggerShake(gs.shake, 10);
        ps.emitEnemyExplosion(p.x, p.y, PLAYER_RADIUS * 2);
      } else {
        phaseRef.current = 'dead';
        setPhaseRef.current('dead');
        saveIfBest(gs.score);
        sfx.gameOver();
        triggerShake(gs.shake, 20);
      }
    }
  }, [inputRef, saveIfBest]);

  const render = useCallback((ctx, alpha) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W  = canvas.clientWidth;
    const H  = canvas.clientHeight;
    const gs = gameRef.current;
    const p  = gs.player;
    const pu = gs.powerUps;

    const drawX = p.initialised ? lerp(p.px, p.x, alpha) + gs.shake.x : W / 2;
    const drawY = p.initialised ? lerp(p.py, p.y, alpha) + gs.shake.y : H / 2;

    ctx.fillStyle = '#050a14';
    ctx.fillRect(0, 0, W, H);
    drawGrid(ctx, W, H, drawX, drawY);

    if (phaseRef.current !== 'idle') {
      gs.particles.draw(ctx, alpha);
      drawBullets(ctx, gs.bullets.bullets, alpha);
      drawEnemies(ctx, gs.enemies.enemies, alpha);
      drawPowerUps(ctx, pu);
      const pulse = (Math.sin(p.pulsePhase) + 1) / 2;
      drawShip(ctx, drawX, drawY, p.angle, pulse, pu.shieldHp > 0);
      if (inputRef.current.joystick) drawJoystick(ctx, inputRef.current.joystick);
      drawActiveBuffs(ctx, pu, 10, H - 58);
      ctx.save();
      ctx.font = '10px monospace'; ctx.fillStyle = 'rgba(0,255,231,0.2)';
      ctx.fillText(`P:${gs.particles.activeCount}/${gs.particles.poolCount}`, 10, H - 8);
      ctx.restore();
    }
  }, [inputRef]);

  useGameLoop(canvasRef, { update, render });

  const bossWave = isBossWave(wave);

  return (
    <div className={styles.gameWrapper}>
      <canvas ref={canvasRef} className={styles.canvas} aria-label="Cyber-Runner" />

      <header className={styles.hudBar}>
        <span className={styles.hudLeft}>
          <span className={styles.hudLabel}>SCORE</span>
          <span className={styles.hudValue}>{String(score).padStart(6,'0')}</span>
        </span>
        <span className={styles.hudCenter}>
          <span className={`${styles.waveLabel} ${bossWave && phase === 'playing' ? styles.bossLabel : ''}`}>
            {phase === 'playing' ? (bossWave ? `⚠ BOSS WAVE ${wave}` : `WAVE ${wave}`) : 'CYBER-RUNNER'}
          </span>
        </span>
        <span className={styles.hudRight}>
          <span className={styles.hudLabel}>BEST</span>
          <span className={styles.hudValue}>{String(highScore).padStart(6,'0')}</span>
        </span>
      </header>

      <div className={styles.utilButtons}>
        <button className={styles.utilBtn} onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted ? '🔇' : '🔊'}
        </button>
        <button className={styles.utilBtn} onClick={toggleFullscreen} aria-label="Fullscreen">⛶</button>
      </div>

      {phase === 'playing' && (wavePhase === 'announce' || wavePhase === 'clear') && (
        <div className={`${styles.waveBanner} ${bossWave ? styles.bossBanner : ''}`}>
          {wavePhase === 'clear' ? '✓ WAVE CLEAR' : announcement}
        </div>
      )}

      {phase === 'playing' && (
        <button
          className={styles.fireBtn}
          onPointerDown={() => { touchFireRef.current = true; }}
          onPointerUp={()   => { touchFireRef.current = false; }}
          onPointerLeave={()=> { touchFireRef.current = false; }}
          aria-label="Fire"
        >🔥</button>
      )}

      {phase === 'idle' && (
        <div className={styles.overlay}>
          <div className={`${styles.overlayCard} ${styles.startCard}`}>
            <p className={styles.overlayEyebrow}>INITIALISING SYSTEMS</p>
            <h1 className={`${styles.overlayTitle} ${styles.startTitle}`}>CYBER-RUNNER</h1>
            <ul className={styles.controls}>
              <li><kbd>WASD</kbd> / <kbd>↑↓←→</kbd> Move</li>
              <li><kbd>Space</kbd> / 🔥 Fire</li>
              <li>Collect power-ups 🛡⚡🔱💨💥❤️</li>
              <li>Boss every 5 waves</li>
            </ul>
            <button className={styles.restartBtn} onClick={startGame} autoFocus>START GAME</button>
            <p className={styles.overlayHint}>or press Enter / Space</p>
            {highScore > 0 && (
              <p className={styles.overlayHighScore}>BEST <strong>{String(highScore).padStart(6,'0')}</strong></p>
            )}
          </div>
        </div>
      )}

      {phase === 'dead' && (
        <div className={styles.overlay}>
          <div className={styles.overlayCard}>
            <p className={styles.overlayEyebrow}>SYSTEM FAILURE</p>
            <h1 className={styles.overlayTitle}>GAME OVER</h1>
            <p className={styles.overlayScore}>SCORE <strong>{String(score).padStart(6,'0')}</strong></p>
            {score >= highScore && score > 0 && <p className={styles.newRecord}>✦ NEW RECORD ✦</p>}
            <p className={styles.overlayScore}>BEST <strong>{String(highScore).padStart(6,'0')}</strong></p>
            <p className={styles.overlayScore} style={{fontSize:'0.85em',opacity:0.6}}>REACHED WAVE {wave}</p>
            <button className={styles.restartBtn} onClick={startGame} autoFocus>PLAY AGAIN</button>
            <p className={styles.overlayHint}>or press Enter / Space</p>
          </div>
        </div>
      )}
    </div>
  );
}