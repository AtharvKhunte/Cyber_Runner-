export const UPGRADE_POOL=[
  {id:'damage_up',   label:'OVERCHARGE',   icon:'⚡',desc:'Bullet damage +1',                   color:'#ffe600',apply:(r)=>{r.bulletDamage+=1;}},
  {id:'fire_rate_up',label:'RAPID FIRE',   icon:'🔫',desc:'Fire cooldown −20%',                 color:'#ff8800',apply:(r)=>{r.fireCooldownMult*=0.80;}},
  {id:'bullet_size', label:'WARHEAD',      icon:'💣',desc:'Bullet radius +3 px',                color:'#ff4444',apply:(r)=>{r.bulletRadiusBonus+=3;}},
  {id:'move_speed',  label:'AFTERBURNER',  icon:'💨',desc:'Move speed +25 px/s',               color:'#00ff88',apply:(r)=>{r.speedBonus+=25;}},
  {id:'piercing',    label:'RAILGUN',      icon:'🎯',desc:'Bullets pierce through enemies',    color:'#c060ff',apply:(r)=>{r.piercing=true;}},
  {id:'orbit_shield',label:'ORBIT SHIELD', icon:'🌀',desc:'+3 orbiting shield bullets',         color:'#00cfff',apply:(r)=>{r.orbitCount=Math.min((r.orbitCount||0)+3,6);}},
  {id:'magnet',      label:'MAGNET',       icon:'🧲',desc:'Double power-up collect range',     color:'#ff60cc',apply:(r)=>{r.magnetRange*=2;}},
  {id:'double_pts',  label:'DOUBLE XP',    icon:'✖️',desc:'Score multiplier ×2',               color:'#ffe600',apply:(r)=>{r.scoreMultiplier*=2;}},
  {id:'ricochet',    label:'RICOCHET',     icon:'↩️',desc:'Bullets bounce off edges once',     color:'#80ffcc',apply:(r)=>{r.ricochet=true;}},
  {id:'shield_regen',label:'PHASE SHIELD', icon:'🛡',desc:'Shield recharges 8s after breaking',color:'#00cfff',apply:(r)=>{r.shieldRegen=true;}},
  {id:'triple_shot', label:'SPREAD SHOT',  icon:'🔱',desc:'Fire 3 bullets per shot',           color:'#c060ff',apply:(r)=>{r.tripleShot=true;}},
  {id:'score_kill',  label:'EXECUTIONER',  icon:'💀',desc:'+5 bonus score per kill',            color:'#ff2d6b',apply:(r)=>{r.bonusScorePerKill+=5;}},
];

export function rollUpgrades(count=3,exclude=[]){
  const pool=UPGRADE_POOL.filter(u=>!exclude.includes(u.id));
  return [...pool].sort(()=>Math.random()-0.5).slice(0,count);
}

export function makeRunState(metaBonus={}){
  return {
    bulletDamage:      1+(metaBonus.bulletDamage||0),
    fireCooldownMult:  1*(metaBonus.fireCooldownMult||1),
    bulletRadiusBonus: 0+(metaBonus.bulletRadiusBonus||0),
    speedBonus:        0+(metaBonus.speedBonus||0),
    piercing:          metaBonus.piercing||false,
    orbitCount:        metaBonus.orbitCount||0,
    magnetRange:       1*(metaBonus.magnetRange||1),
    scoreMultiplier:   1*(metaBonus.scoreMultiplier||1),
    ricochet:          metaBonus.ricochet||false,
    shieldRegen:       metaBonus.shieldRegen||false,
    tripleShot:        metaBonus.tripleShot||false,
    bonusScorePerKill: 0+(metaBonus.bonusScorePerKill||0),
    shieldRegenTimer:  0,
    pickedUpgrades:    [],
  };
}

export function updateRunState(run,powerUps,dt){
  if(run.shieldRegen&&powerUps.shieldHp===0){
    run.shieldRegenTimer-=dt;
    if(run.shieldRegenTimer<=0){powerUps.shieldHp=1;run.shieldRegenTimer=8;}
  }
}