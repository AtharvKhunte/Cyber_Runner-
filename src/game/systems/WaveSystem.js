const ANNOUNCE_DURATION = 2.5;
const CLEAR_DURATION    = 1.5;
const BASE_QUOTA        = 8;
const QUOTA_GROWTH      = 3;

export const BOSS_EVERY = 5;
export function isBossWave(wave){ return wave % BOSS_EVERY === 0; }

export function makeWaveState(){
  return {
    wave:         1,
    phase:        'announce',
    phaseTimer:   ANNOUNCE_DURATION,
    spawnTimer:   0,
    quota:        0,
    bossSpawned:  false,
    announcement: 'WAVE 1',
  };
}

export function waveQuota(wave){ return BASE_QUOTA + (wave-1)*QUOTA_GROWTH; }
export function waveSpawnInterval(wave){ return Math.max(0.4, 1.8 - wave*0.07); }

export function updateWave(ws, dt, activeEnemies){
  const result = { spawnNormal:false, spawnBoss:false, waveClear:false, nextWaveAnnounce:false };

  if(ws.phase === 'announce'){
    ws.phaseTimer -= dt;
    if(ws.phaseTimer <= 0){
      ws.phase       = 'active';
      ws.quota       = waveQuota(ws.wave);
      ws.spawnTimer  = 0;
      ws.bossSpawned = false;
    }
    return result;
  }

  if(ws.phase === 'active'){
    if(isBossWave(ws.wave) && !ws.bossSpawned){
      result.spawnBoss = true;
      ws.bossSpawned   = true;
    }
    ws.spawnTimer -= dt;
    if(ws.spawnTimer <= 0 && ws.quota > 0){
      ws.spawnTimer      = waveSpawnInterval(ws.wave);
      ws.quota          -= 1;
      result.spawnNormal = true;
    }
    // Only clear if quota done AND all enemies dead
    if(ws.quota <= 0 && activeEnemies === 0){
      ws.phase      = 'clear';
      ws.phaseTimer = 9999; // frozen — pickUpgrade resets this
      result.waveClear = true;
    }
    return result;
  }

  if(ws.phase === 'clear'){
    // Timer is frozen at 9999 until pickUpgrade resets it
    ws.phaseTimer -= dt;
    if(ws.phaseTimer <= 0){
      ws.phase        = 'announce';
      ws.phaseTimer   = ANNOUNCE_DURATION;
      ws.announcement = isBossWave(ws.wave) ? `⚠ BOSS WAVE ${ws.wave} ⚠` : `WAVE ${ws.wave}`;
      result.nextWaveAnnounce = true;
    }
    return result;
  }

  return result;
}