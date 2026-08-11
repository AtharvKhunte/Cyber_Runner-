import { useRef, useCallback, useState, useEffect } from 'react';
import { useInputVector    } from '../hooks/useInputVector';
import { useGameLoop       } from '../hooks/useGameLoop';
import { useAudioEngine    } from '../hooks/useAudioEngine';
import { useMetaProgression, buildMetaBonus, computeCredits, upgradeCost, SHIPS } from '../hooks/useMetaProgression';
import { ParticleSystem    } from '../game/systems/ParticleSystem';
import { makeBulletState, updateBullets, drawBullets, BASE_FIRE_COOLDOWN } from '../game/systems/BulletSystem';
import { makeEnemyState, updateEnemies, drawEnemies, spawnNormalEnemy, spawnBoss, ENEMY_RADIUS } from '../game/systems/EnemySystem';
import { makeEnemyBulletState, addEnemyBullets, updateEnemyBullets, checkEnemyBulletPlayerCollision, drawEnemyBullets } from '../game/systems/EnemyBulletSystem';
import { checkBulletEnemyCollisions, checkPlayerEnemyCollision } from '../game/systems/CollisionSystem';
import { makeWaveState, updateWave, isBossWave } from '../game/systems/WaveSystem';
import { makePowerUpState, updatePowerUps, drawPowerUps, drawActiveBuffs, maybeDropPickup, consumeShieldHit, isActive, currentFireCooldown, currentPlayerSpeed } from '../game/systems/PowerUpSystem';
import { makeRunState, rollUpgrades, updateRunState } from '../game/systems/UpgradeSystem';
import { makeOrbitState, updateOrbit, checkOrbitCollisions, drawOrbit } from '../game/systems/OrbitSystem';
import { makeStarField, updateStarField, drawStarField } from '../game/systems/StarField';
import { drawScout, drawTank, drawAssassin } from '../game/entities/ShipRenderer';
import UpgradeScreen from './UpgradeScreen';
import ShopScreen    from './ShopScreen';
import styles from './Game.module.css';

export const PLAYER_RADIUS = 14;
const BASE_PLAYER_SPEED   = 220;
const MAX_PLAYER_HP       = 3;
const GRID_COLOR          = 'rgba(0,255,231,0.04)';
const GRID_CELL           = 44;
const TRAIL_INTERVAL      = 28;
const lerp = (a, b, t) => a + (b - a) * t;

function makeGameState(metaBonus = {}) {
  return {
    player: {
      x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0,
      initialised: false,
      angle: -Math.PI / 2,
      pulsePhase: 0, navPhase: 0,
      lastTrailMs: 0,
      hp: MAX_PLAYER_HP,
      invincibleTimer: 0,
    },
    bullets:      makeBulletState(),
    enemyBullets: makeEnemyBulletState(),
    enemies:      makeEnemyState(),
    particles:    new ParticleSystem(),
    powerUps:     makePowerUpState(),
    wave:         makeWaveState(),
    orbit:        makeOrbitState(),
    run:          makeRunState(metaBonus),
    starField:    null,
    score:        0,
    shake:        { x: 0, y: 0, magnitude: 0 },
  };
}

function triggerShake(shake, mag) {
  shake.magnitude = Math.max(shake.magnitude, mag);
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
  for (let x = -ox; x <= W; x += GRID_CELL) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = -oy; y <= H; y += GRID_CELL) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.restore();
}

function drawShip(ctx, x, y, angle, pulse, shielded, shipId, navPhase, invincible) {
  ctx.save();
  if (invincible && Math.floor(Date.now() / 80) % 2 === 0) { ctx.restore(); return; }
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);
  if (shipId === 'tank')          drawTank(ctx, pulse, navPhase);
  else if (shipId === 'assassin') drawAssassin(ctx, pulse, navPhase);
  else                            drawScout(ctx, pulse, navPhase);
  ctx.restore();
  if (shielded) {
    ctx.save();
    ctx.strokeStyle = '#00cfff'; ctx.shadowColor = '#00cfff'; ctx.shadowBlur = 20;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6 + 0.3 * Math.sin(Date.now() * 0.006);
    ctx.beginPath(); ctx.arc(x, y, PLAYER_RADIUS + 14, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

function drawJoystick(ctx, j) {
  ctx.save();
  ctx.globalAlpha = 0.35; ctx.shadowColor = '#00ffe7'; ctx.shadowBlur = 12;
  ctx.strokeStyle = '#00ffe7'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(j.originX, j.originY, j.radius, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.5;
  ctx.beginPath(); ctx.moveTo(j.originX, j.originY); ctx.lineTo(j.stickX, j.stickY); ctx.stroke();
  ctx.globalAlpha = 0.75; ctx.fillStyle = '#00ffe7';
  ctx.beginPath(); ctx.arc(j.stickX, j.stickY, 10, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawHealthBar(ctx, hp, maxHp, W) {
  const bW = 130, bH = 10, bX = (W - bW) / 2, bY = 46;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(bX, bY, bW, bH);
  const ratio = hp / maxHp;
  const col = ratio > 0.5 ? '#00ff88' : ratio > 0.25 ? '#ffe600' : '#ff2d6b';
  ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10;
  ctx.fillRect(bX, bY, bW * ratio, bH);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
  ctx.strokeRect(bX, bY, bW, bH);
  for (let i = 1; i < maxHp; i++) {
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.moveTo(bX + (bW / maxHp) * i, bY);
    ctx.lineTo(bX + (bW / maxHp) * i, bY + bH);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`HP ${hp}/${maxHp}`, bX + bW / 2, bY + bH / 2);
  ctx.restore();
}

function drawRunStats(ctx, run, H) {
  const parts = [];
  if (run.scoreMultiplier > 1)  parts.push(`×${run.scoreMultiplier} SCORE`);
  if (run.piercing)              parts.push('PIERCE');
  if (run.ricochet)              parts.push('RICOCHET');
  if (run.tripleShot)            parts.push('TRIPLE');
  if (run.orbitCount > 0)        parts.push(`ORBIT×${run.orbitCount}`);
  if (!parts.length) return;
  ctx.save();
  ctx.font = '10px monospace'; ctx.fillStyle = 'rgba(0,255,231,0.28)';
  ctx.textAlign = 'left';
  ctx.fillText(parts.join('  '), 10, H - 22);
  ctx.restore();
}

export default function Game() {
  const canvasRef    = useRef(null);
  const inputRef     = useInputVector(canvasRef);
  const audio        = useAudioEngine();
  const { meta, addCredits, spendCredits, updateHighScore, buyShopItem, selectShip, unlockShip } = useMetaProgression();
  const gameRef      = useRef(null);
  const touchFireRef = useRef(false);

  const [score,          setScore]          = useState(0);
  const [wave,           setWave]           = useState(1);
  const [phase,          setPhase]          = useState('idle');
  const [wavePhase,      setWavePhase]      = useState('announce');
  const [announcement,   setAnnouncement]   = useState('WAVE 1');
  const [muted,          setMuted]          = useState(false);
  const [isBoss,         setIsBoss]         = useState(false);
  const [showUpgrades,   setShowUpgrades]   = useState(false);
  const [pendingUpgrades,setPendingUpgrades]= useState([]);
  const [showShop,       setShowShop]       = useState(false);
  const [earnedCredits,  setEarnedCredits]  = useState(0);
  const [playerHp,       setPlayerHp]       = useState(MAX_PLAYER_HP);
  const [upgradeCostNow, setUpgradeCostNow] = useState(0);

  // All refs — readable inside RAF callbacks without stale closures
  const phaseRef           = useRef('idle');
  const showUpgradesRef    = useRef(false);
  const waveRef            = useRef(1);
  const audioRef           = useRef(audio);
  const addCreditsRef      = useRef(addCredits);
  const updateHighScoreRef = useRef(updateHighScore);
  const spendCreditsRef    = useRef(spendCredits);
  const setScoreRef        = useRef(setScore);
  const setWaveRef         = useRef(setWave);
  const setPhaseRef        = useRef(setPhase);
  const setWavePhaseRef    = useRef(setWavePhase);
  const setAnnouncementRef = useRef(setAnnouncement);
  const setIsBossRef       = useRef(setIsBoss);
  const setShowUpgradesRef = useRef(setShowUpgrades);
  const setPendingRef      = useRef(setPendingUpgrades);
  const setPlayerHpRef     = useRef(setPlayerHp);
  const setUpgradeCostRef  = useRef(setUpgradeCostNow);
  const setEarnedCreditsRef= useRef(setEarnedCredits);

  useEffect(() => { audioRef.current = audio; },             [audio]);
  useEffect(() => { addCreditsRef.current = addCredits; },   [addCredits]);
  useEffect(() => { updateHighScoreRef.current = updateHighScore; }, [updateHighScore]);
  useEffect(() => { spendCreditsRef.current = spendCredits; },[spendCredits]);

  const activeShip = SHIPS.find(s => s.id === meta.activeShip) || SHIPS[0];

  /* ── startGame ──────────────────────────────────────────────── */
  const startGame = useCallback(() => {
    const metaBonus = buildMetaBonus(meta);
    gameRef.current          = makeGameState(metaBonus);
    phaseRef.current         = 'playing';
    showUpgradesRef.current  = false;
    waveRef.current          = 1;
    setPhaseRef.current('playing');
    setScoreRef.current(0);
    setWaveRef.current(1);
    setWavePhaseRef.current('announce');
    setAnnouncementRef.current('WAVE 1');
    setIsBossRef.current(false);
    setShowUpgradesRef.current(false);
    setPlayerHpRef.current(MAX_PLAYER_HP);
    setUpgradeCostRef.current(0);
    setEarnedCreditsRef.current(0);
  }, [meta]);

  /* ── pickUpgrade ────────────────────────────────────────────── */
  const pickUpgrade = useCallback((upgrade) => {
    const gs = gameRef.current; if (!gs) return;
    const cost = upgradeCost(waveRef.current);
    if (cost > 0) spendCreditsRef.current(cost);
    upgrade.apply(gs.run);
    gs.run.pickedUpgrades.push(upgrade.id);
    showUpgradesRef.current = false;
    setShowUpgradesRef.current(false);
    const ws = gs.wave;
    ws.phase = 'announce'; ws.phaseTimer = 2.5;
    ws.announcement = isBossWave(ws.wave) ? `⚠ BOSS WAVE ${ws.wave} ⚠` : `WAVE ${ws.wave}`;
    setAnnouncementRef.current(ws.announcement);
    setWavePhaseRef.current('announce');
  }, []);

  /* ── Keyboard shortcuts ─────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e) => {
      if ((phaseRef.current === 'idle' || phaseRef.current === 'dead') &&
          (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault(); startGame();
      }
      if (showUpgradesRef.current && ['Digit1','Digit2','Digit3'].includes(e.code)) {
        const idx = parseInt(e.code.replace('Digit', '')) - 1;
        setPendingUpgrades(prev => { if (prev[idx]) pickUpgrade(prev[idx]); return prev; });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [startGame, pickUpgrade]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, []);

  const toggleMute = useCallback(() => { setMuted(!audio.toggle()); }, [audio]);

  /* ── handlePlayerHit — uses only stable refs ────────────────── */
  const handlePlayerHit = useCallback((p, pu, ps, gs, sfx, ws) => {
    if (consumeShieldHit(pu)) {
      triggerShake(gs.shake, 10);
      ps.emitEnemyExplosion(p.x, p.y, PLAYER_RADIUS * 2);
    } else {
      p.hp = Math.max(0, p.hp - 1);
      p.invincibleTimer = 1.5;
      setPlayerHpRef.current(p.hp);
      triggerShake(gs.shake, 10);
      ps.emitEnemyExplosion(p.x, p.y, PLAYER_RADIUS * 1.5);
      if (p.hp <= 0) {
        phaseRef.current = 'dead';
        setPhaseRef.current('dead');
        const earned = computeCredits(gs.score, ws.wave);
        setEarnedCreditsRef.current(earned);
        addCreditsRef.current(earned);
        updateHighScoreRef.current(gs.score);
        sfx.gameOver();
        triggerShake(gs.shake, 20);
      }
    }
  }, []);

  /* ══════════════════════════════════════════════════════════════
     UPDATE — fixed 60 Hz tick
  ══════════════════════════════════════════════════════════════ */
  const update = useCallback((dt) => {
    if (phaseRef.current !== 'playing') return;
    if (showUpgradesRef.current) return;          // paused during upgrade pick
    const canvas = canvasRef.current; if (!canvas) return;
    const gs = gameRef.current; if (!gs) return;

    const p   = gs.player;
    const ps  = gs.particles;
    const pu  = gs.powerUps;
    const ws  = gs.wave;
    const run = gs.run;
    const inp = inputRef.current;
    const sfx = audioRef.current;
    const W   = canvas.clientWidth;
    const H   = canvas.clientHeight;

    if (!p.initialised) { p.x = p.px = W / 2; p.y = p.py = H / 2; p.initialised = true; }

    // Star field
    if (!gs.starField) {
      gs.starField = makeStarField(W, H);
      gs.starField.lastPX = p.x; gs.starField.lastPY = p.y;
    }
    updateStarField(gs.starField, p.x, p.y, dt, W, H);

    updateShake(gs.shake, dt);
    updateRunState(run, pu, dt);

    if (p.invincibleTimer > 0) p.invincibleTimer -= dt;

    // Movement
    p.px = p.x; p.py = p.y;
    const speed = currentPlayerSpeed(pu, BASE_PLAYER_SPEED + run.speedBonus);
    p.vx = inp.x * speed; p.vy = inp.y * speed;
    p.x += p.vx * dt; p.y += p.vy * dt;
    const PAD = PLAYER_RADIUS + 4;
    p.x = Math.max(PAD, Math.min(W - PAD, p.x));
    p.y = Math.max(PAD, Math.min(H - PAD, p.y));

    // Heading
    if (Math.abs(p.vx) > 1 || Math.abs(p.vy) > 1) {
      const target = Math.atan2(p.vy, p.vx);
      const da = target - p.angle;
      const wrapped = ((da + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      p.angle += wrapped * Math.min(dt * 12, 1);
    }

    // Pulse + nav + trail
    const moving = Math.abs(inp.x) > 0.05 || Math.abs(inp.y) > 0.05;
    p.pulsePhase = (p.pulsePhase + dt * (moving ? 8 : 3)) % (Math.PI * 2);
    p.navPhase   = (p.navPhase + dt * 3.5) % (Math.PI * 2);
    const nowMs = performance.now();
    if (moving && nowMs - p.lastTrailMs > TRAIL_INTERVAL) {
      p.lastTrailMs = nowMs;
      ps.emitPlayerTrail(
        p.x - Math.cos(p.angle) * PLAYER_RADIUS * 0.7,
        p.y - Math.sin(p.angle) * PLAYER_RADIUS * 0.7,
      );
    }

    // Wave state machine
    const wr = updateWave(ws, dt, gs.enemies.enemies.length);
    if (wr.spawnNormal) spawnNormalEnemy(gs.enemies, W, H, ws.wave);
    if (wr.spawnBoss) {
      spawnBoss(gs.enemies, W);
      setIsBossRef.current(true);
      triggerShake(gs.shake, 12);
    }
    if (wr.waveClear) {
      setWavePhaseRef.current('clear');
      setIsBossRef.current(false);
      const cost = upgradeCost(ws.wave);
      setUpgradeCostRef.current(cost);
      const picks = rollUpgrades(3, run.pickedUpgrades);
      setPendingRef.current(picks);
      showUpgradesRef.current = true;
      setShowUpgradesRef.current(true);
    }
    if (wr.nextWaveAnnounce) {
      waveRef.current = ws.wave;
      setWaveRef.current(ws.wave);
      setAnnouncementRef.current(ws.announcement);
      setWavePhaseRef.current('announce');
    }

    // Player bullets
    const firing = inp.fire || touchFireRef.current;
    const prevCount = gs.bullets.bullets.length;
    updateBullets(
      gs.bullets, firing, p.x, p.y, p.angle, dt, W, H,
      run.tripleShot || isActive(pu, 'tripleShot'),
      currentFireCooldown(pu, BASE_FIRE_COOLDOWN * run.fireCooldownMult),
    );
    if (gs.bullets.bullets.length > prevCount) sfx.shoot();

    // Ricochet
    if (run.ricochet) {
      for (const b of gs.bullets.bullets) {
        if (!b.bounced) {
          if (b.x < 0 || b.x > W) { b.vx *= -1; b.bounced = true; }
          if (b.y < 0 || b.y > H) { b.vy *= -1; b.bounced = true; }
        }
      }
    }

    // Orbit bullets
    updateOrbit(gs.orbit, run.orbitCount, p.x, p.y, dt);
    if (run.orbitCount > 0) {
      const or = checkOrbitCollisions(gs.orbit, gs.enemies.enemies);
      if (or.scoreDelta > 0) {
        const deadSet = new Set(or.killedIndices);
        gs.enemies.enemies.forEach((e, i) => {
          if (deadSet.has(i)) { ps.emitEnemyExplosion(e.x, e.y, e.radius); maybeDropPickup(pu, e.x, e.y); }
        });
        gs.enemies.enemies = or.enemies;
        gs.score += Math.round(or.scoreDelta * run.scoreMultiplier);
        setScoreRef.current(gs.score);
        triggerShake(gs.shake, 3);
      }
    }

    // Enemy movement + return new enemy bullets
    const newEBullets = updateEnemies(gs.enemies, p.x, p.y, ws.wave, dt);
    addEnemyBullets(gs.enemyBullets, newEBullets);
    updateEnemyBullets(gs.enemyBullets, dt, W, H);

    // Player bullet × enemy collision
    const { scoreDelta, bullets: liveBullets, enemies: liveEnemies, killedPositions } =
      checkBulletEnemyCollisions(gs.bullets.bullets, gs.enemies.enemies, run.bulletDamage, run.piercing);
    if (scoreDelta > 0) {
      gs.bullets.bullets = liveBullets;
      gs.enemies.enemies = liveEnemies;
      const bonus = run.bonusScorePerKill * killedPositions.length;
      gs.score += Math.round((scoreDelta + bonus) * run.scoreMultiplier);
      setScoreRef.current(gs.score);
      killedPositions.forEach((pos, i) => {
        ps.emitEnemyExplosion(pos.x, pos.y, ENEMY_RADIUS);
        maybeDropPickup(pu, pos.x, pos.y);
        setTimeout(() => sfx.explosion(), i * 55);
      });
      if (killedPositions.length) triggerShake(gs.shake, 5);
    }

    // Power-ups
    const pur = updatePowerUps(pu, p.x, p.y, gs.score, dt, run.magnetRange);
    if (pur.nukeTriggered) {
      gs.enemies.enemies.forEach(e => ps.emitEnemyExplosion(e.x, e.y, e.radius));
      gs.score += gs.enemies.enemies.length * 10;
      gs.enemies.enemies = [];
      setScoreRef.current(gs.score);
      triggerShake(gs.shake, 18); sfx.explosion();
    }
    if (pur.extraScoreDelta > 0) { gs.score += pur.extraScoreDelta; setScoreRef.current(gs.score); }

    ps.update(dt);

    // Hit detection — enemy bullets
    if (p.invincibleTimer <= 0 && checkEnemyBulletPlayerCollision(gs.enemyBullets, p.x, p.y, PLAYER_RADIUS)) {
      handlePlayerHit(p, pu, ps, gs, sfx, ws);
    }

    // Hit detection — enemy body contact
    if (p.invincibleTimer <= 0 && checkPlayerEnemyCollision(p.x, p.y, gs.enemies.enemies)) {
      handlePlayerHit(p, pu, ps, gs, sfx, ws);
    }

  }, [inputRef, handlePlayerHit]);

  /* ══════════════════════════════════════════════════════════════
     RENDER — once per visual frame
  ══════════════════════════════════════════════════════════════ */
  const render = useCallback((ctx, alpha) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    const gs = gameRef.current;
    if (!gs) { ctx.fillStyle = '#050a14'; ctx.fillRect(0, 0, W, H); return; }
    const p  = gs.player;
    const pu = gs.powerUps;

    const drawX = p.initialised ? lerp(p.px, p.x, alpha) + gs.shake.x : W / 2;
    const drawY = p.initialised ? lerp(p.py, p.y, alpha) + gs.shake.y : H / 2;

    ctx.fillStyle = '#050a14'; ctx.fillRect(0, 0, W, H);
    if (gs.starField) drawStarField(ctx, gs.starField);
    drawGrid(ctx, W, H, drawX, drawY);

    if (phaseRef.current !== 'idle') {
      gs.particles.draw(ctx, alpha);
      drawEnemyBullets(ctx, gs.enemyBullets.bullets, alpha);
      drawBullets(ctx, gs.bullets.bullets, alpha);
      drawOrbit(ctx, gs.orbit);
      drawEnemies(ctx, gs.enemies.enemies, alpha);
      drawPowerUps(ctx, pu);
      const pulse = (Math.sin(p.pulsePhase) + 1) / 2;
      drawShip(ctx, drawX, drawY, p.angle, pulse, pu.shieldHp > 0, meta.activeShip, p.navPhase, p.invincibleTimer > 0);
      if (inputRef.current.joystick) drawJoystick(ctx, inputRef.current.joystick);
      drawActiveBuffs(ctx, pu, 10, H - 58);
      drawHealthBar(ctx, p.hp, MAX_PLAYER_HP, W);
      drawRunStats(ctx, gs.run, H);
    }
  }, [inputRef, meta.activeShip]);

  useGameLoop(canvasRef, { update, render });

  const bossWave = isBossWave(wave);
  const canAffordUpgrade = meta.credits >= upgradeCostNow;

  return (
    <div className={styles.gameWrapper}>
      <canvas ref={canvasRef} className={styles.canvas} aria-label="Cyber-Runner" />

      {/* HUD bar */}
      <header className={styles.hudBar}>
        <span className={styles.hudLeft}>
          <span className={styles.hudLabel}>SCORE</span>
          <span className={styles.hudValue}>{String(score).padStart(6, '0')}</span>
        </span>
        <span className={styles.hudCenter}>
          <span className={`${styles.waveLabel} ${bossWave && phase === 'playing' ? styles.bossLabel : ''}`}>
            {phase === 'playing' ? (bossWave ? `⚠ BOSS WAVE ${wave}` : `WAVE ${wave}`) : 'CYBER-RUNNER'}
          </span>
        </span>
        <span className={styles.hudRight}>
          <span className={styles.hudLabel}>BEST</span>
          <span className={styles.hudValue}>{String(meta.highScore).padStart(6, '0')}</span>
        </span>
      </header>

      {/* Util buttons */}
      <div className={styles.utilButtons}>
        <button className={styles.utilBtn} onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted ? '🔇' : '🔊'}
        </button>
        <button className={styles.utilBtn} onClick={toggleFullscreen} aria-label="Fullscreen">⛶</button>
      </div>

      {/* Wave banner */}
      {phase === 'playing' && (wavePhase === 'announce' || wavePhase === 'clear') && !showUpgrades && (
        <div className={`${styles.waveBanner} ${bossWave ? styles.bossBanner : ''}`}>
          {wavePhase === 'clear' ? '✓ WAVE CLEAR' : announcement}
        </div>
      )}

      {/* Mobile fire button */}
      {phase === 'playing' && (
        <button
          className={styles.fireBtn}
          onPointerDown={() => { touchFireRef.current = true; }}
          onPointerUp={()   => { touchFireRef.current = false; }}
          onPointerLeave={() => { touchFireRef.current = false; }}
          aria-label="Fire"
        >🔥</button>
      )}

      {/* Upgrade screen */}
      {showUpgrades && (
        <UpgradeScreen
          upgrades={pendingUpgrades}
          onPick={pickUpgrade}
          wave={wave}
          cost={upgradeCostNow}
          credits={meta.credits}
          canAfford={canAffordUpgrade}
        />
      )}

      {/* Shop */}
      {showShop && (
        <ShopScreen
          meta={meta}
          onBuy={buyShopItem}
          onSelectShip={selectShip}
          onUnlockShip={unlockShip}
          onClose={() => setShowShop(false)}
        />
      )}

      {/* Start / Idle screen */}
      {phase === 'idle' && !showShop && (
        <div className={styles.overlay}>
          <div className={`${styles.overlayCard} ${styles.startCard}`}>
            <p className={styles.overlayEyebrow}>INITIALISING SYSTEMS</p>
            <h1 className={`${styles.overlayTitle} ${styles.startTitle}`}>CYBER-RUNNER</h1>
            <p style={{ color:'#ffe600', fontFamily:'monospace', fontSize:'13px', letterSpacing:'0.1em' }}>
              ⬡ {meta.credits} CREDITS
            </p>
            <ul className={styles.controls}>
              <li><kbd>WASD</kbd> / <kbd>↑↓←→</kbd> Move</li>
              <li><kbd>Space</kbd> / 🔥 Fire</li>
              <li>3 HP · enemies fire back from wave 2</li>
              <li>Boss every 5 waves · enrages at 40% HP</li>
            </ul>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center' }}>
              <button className={styles.restartBtn} onClick={startGame} autoFocus>START GAME</button>
              <button
                className={styles.restartBtn}
                style={{ background:'rgba(255,230,0,0.1)', borderColor:'rgba(255,230,0,0.5)', color:'#ffe600' }}
                onClick={() => setShowShop(true)}
              >⬡ SHOP</button>
            </div>
            <p className={styles.overlayHint}>or press Enter / Space</p>
            {meta.highScore > 0 && (
              <p className={styles.overlayHighScore}>BEST <strong>{String(meta.highScore).padStart(6, '0')}</strong></p>
            )}
          </div>
        </div>
      )}

      {/* Game Over */}
      {phase === 'dead' && (
        <div className={styles.overlay}>
          <div className={styles.overlayCard}>
            <p className={styles.overlayEyebrow}>SYSTEM FAILURE</p>
            <h1 className={styles.overlayTitle}>GAME OVER</h1>
            <p className={styles.overlayScore}>SCORE <strong>{String(score).padStart(6, '0')}</strong></p>
            {score >= meta.highScore && score > 0 && <p className={styles.newRecord}>✦ NEW RECORD ✦</p>}
            <p className={styles.overlayScore}>REACHED WAVE <strong>{wave}</strong></p>
            <p className={styles.overlayScore} style={{ color:'#ffe600' }}>
              +{earnedCredits} CREDITS EARNED
            </p>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center' }}>
              <button className={styles.restartBtn} onClick={startGame} autoFocus>PLAY AGAIN</button>
              <button
                className={styles.restartBtn}
                style={{ background:'rgba(255,230,0,0.1)', borderColor:'rgba(255,230,0,0.5)', color:'#ffe600' }}
                onClick={() => setShowShop(true)}
              >⬡ SHOP</button>
            </div>
            <p className={styles.overlayHint}>or press Enter / Space</p>
          </div>
        </div>
      )}
    </div>
  );
}