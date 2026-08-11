import { useState, useCallback } from 'react';

const KEY='cyberRunner_meta';

export const SHIPS=[
  {id:'scout',   name:'SCOUT',    icon:'🚀',desc:'Balanced fighter. Fast, agile, twin engine pods.',         unlockCost:0,   color:'#00ffe7',metaBonus:{}},
  {id:'tank',    name:'TANK',     icon:'🛡',desc:'Heavy cruiser. Starts with shield regen. Slower.',         unlockCost:300, color:'#00cfff',metaBonus:{speedBonus:-35,shieldRegen:true}},
  {id:'assassin',name:'ASSASSIN', icon:'⚡',desc:'Needle dart. Extremely fast, triple shot. No shield.',     unlockCost:600, color:'#c060ff',metaBonus:{speedBonus:50,tripleShot:true,fireCooldownMult:0.75}},
];

export const SHOP_ITEMS=[
  {id:'start_speed',   label:'BOOT JETS',  icon:'👟',desc:'+15 speed per level',            cost:80, max:3,bonus:{speedBonus:15}},
  {id:'start_cooldown',label:'QUICK DRAW', icon:'🔫',desc:'-10% fire cooldown per level',   cost:100,max:3,bonus:{fireCooldownMult:0.9}},
  {id:'start_magnet',  label:'ATTRACTOR',  icon:'🧲',desc:'Double power-up pickup range',   cost:120,max:1,bonus:{magnetRange:2}},
  {id:'start_score',   label:'SCORE CHIP', icon:'💰',desc:'+5 bonus score per kill',         cost:150,max:3,bonus:{bonusScorePerKill:5}},
  {id:'start_pierce',  label:'PENETRATOR', icon:'🎯',desc:'Start every run with Piercing',  cost:200,max:1,bonus:{piercing:true}},
];

function defaultMeta(){return{credits:0,totalCredits:0,shopLevels:{},activeShip:'scout',highScore:0};}

function readMeta(){
  try{const r=localStorage.getItem(KEY);return r?{...defaultMeta(),...JSON.parse(r)}:defaultMeta();}
  catch{return defaultMeta();}
}

function writeMeta(m){try{localStorage.setItem(KEY,JSON.stringify(m));}catch{}}

export function computeCredits(score,wave){return Math.floor(score*0.1+wave*5);}
export function upgradeCost(wave){return Math.max(0,(wave-1)*15);}

export function buildMetaBonus(meta){
  const ship=SHIPS.find(s=>s.id===meta.activeShip)||SHIPS[0];
  const bonus={...ship.metaBonus};
  for(const item of SHOP_ITEMS){
    const level=meta.shopLevels[item.id]||0;
    if(!level) continue;
    for(const [k,v] of Object.entries(item.bonus)){
      if(typeof v==='boolean'){bonus[k]=v;}
      else if(['fireCooldownMult','magnetRange','scoreMultiplier'].includes(k)){bonus[k]=(bonus[k]||1)*Math.pow(v,level);}
      else{bonus[k]=(bonus[k]||0)+v*level;}
    }
  }
  return bonus;
}

export function useMetaProgression(){
  const [meta,setMeta]=useState(readMeta);

  const addCredits=useCallback((amount)=>{
    setMeta(prev=>{const next={...prev,credits:prev.credits+amount,totalCredits:(prev.totalCredits||0)+amount};writeMeta(next);return next;});
  },[]);

  const spendCredits=useCallback((amount)=>{
    let ok=false;
    setMeta(prev=>{if(prev.credits<amount)return prev;ok=true;const next={...prev,credits:prev.credits-amount};writeMeta(next);return next;});
    return ok;
  },[]);

  const updateHighScore=useCallback((score)=>{
    setMeta(prev=>{if(score<=prev.highScore)return prev;const next={...prev,highScore:score};writeMeta(next);return next;});
  },[]);

  const buyShopItem=useCallback((itemId)=>{
    setMeta(prev=>{
      const item=SHOP_ITEMS.find(i=>i.id===itemId);
      const level=prev.shopLevels[itemId]||0;
      if(!item||level>=item.max||prev.credits<item.cost)return prev;
      const next={...prev,credits:prev.credits-item.cost,shopLevels:{...prev.shopLevels,[itemId]:level+1}};
      writeMeta(next);return next;
    });
  },[]);

  const selectShip=useCallback((shipId)=>{
    setMeta(prev=>{
      const ship=SHIPS.find(s=>s.id===shipId);
      if(!ship)return prev;
      const next={...prev,activeShip:shipId};writeMeta(next);return next;
    });
  },[]);

  const unlockShip=useCallback((shipId)=>{
    setMeta(prev=>{
      const ship=SHIPS.find(s=>s.id===shipId);
      if(!ship||prev.credits<ship.unlockCost)return prev;
      const next={...prev,credits:prev.credits-ship.unlockCost};writeMeta(next);return next;
    });
  },[]);

  return{meta,addCredits,spendCredits,updateHighScore,buyShopItem,selectShip,unlockShip};
}