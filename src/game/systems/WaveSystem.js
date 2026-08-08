const ANNOUNCE_DURATION = 2.5;
const CLEAR_DURATION    = 1.5;
const BASE_QUOTA        = 8;
const QUOTA_GROWTH      = 3;

export const BOSS_EVERY = 5;

export function isBossWave(wave) {
  return wave % BOSS_EVERY === 0;
}

export function makeWaveState() {
  return {
    wave:         1,
    phase:        'announce',
    phaseTimer:   ANNOUNCE_DURATION,
    quota:        0,
    bossSpawned:  false,
    announcement: 'WAVE 1',
  };
}

export function waveQuota(wave) {
  return BASE_QUOTA + (wave - 1) * QUOTA_GROWTH;
}

export function waveEnemySpeed(wave) {
  return 80 + wave * 8;
}

export function waveSpawnInterval(wave) {
  return Math.max(0.45, 2.0 - wave * 0.08);
}

export function updateWave(ws, dt, activeEnemies) {
  const result = {
    spawnNormal:      false,
    spawnBoss:        false,
    waveClear:        false,
    nextWaveAnnounce: false,
  };

  ws.phaseTimer -= dt;

  if (ws.phase === 'announce') {
    if (ws.phaseTimer <= 0) {
      ws.phase       = 'active';
      ws.phaseTimer  = 0;
      ws.quota       = waveQuota(ws.wave);
      ws.bossSpawned = false;
    }
    return result;
  }

  if (ws.phase === 'active') {
    if (isBossWave(ws.wave) && !ws.bossSpawned) {
      result.spawnBoss  = true;
      ws.bossSpawned    = true;
    }

    if (ws.phaseTimer <= 0 && ws.quota > 0) {
      ws.phaseTimer      = waveSpawnInterval(ws.wave);
      ws.quota          -= 1;
      result.spawnNormal = true;
    }

    if (ws.quota <= 0 && activeEnemies === 0) {
      ws.phase      = 'clear';
      ws.phaseTimer = CLEAR_DURATION;
      result.waveClear = true;
    }
    return result;
  }

  if (ws.phase === 'clear') {
    if (ws.phaseTimer <= 0) {
      ws.wave        += 1;
      ws.phase        = 'announce';
      ws.phaseTimer   = ANNOUNCE_DURATION;
      ws.announcement = isBossWave(ws.wave)
        ? `⚠  BOSS WAVE ${ws.wave}  ⚠`
        : `WAVE ${ws.wave}`;
      result.nextWaveAnnounce = true;
    }
    return result;
  }

  return result;
}