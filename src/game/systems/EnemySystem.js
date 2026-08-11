export const ENEMY_RADIUS = 13;
export const BOSS_RADIUS  = 52;
export const BOSS_HP      = 12;

const BASE_SPEEDS      = { normal:78, fast:200, tank:50, boss:35 };
const WAVE_SPEED_BONUS = { normal:7,  fast:9,   tank:4,  boss:2  };
const FIRE_RATE        = { normal:2.8, fast:null, tank:1.6, boss:0.9 };

export function makeEnemyState(){ return { enemies:[] }; }

function edgeSpawn(W,H,margin){
  const edge=Math.floor(Math.random()*4); let x,y;
  switch(edge){
    case 0:x=Math.random()*W;y=-margin;break;
    case 1:x=W+margin;y=Math.random()*H;break;
    case 2:x=Math.random()*W;y=H+margin;break;
    default:x=-margin;y=Math.random()*H;break;
  }
  return{x,y};
}

function makeEnemy(type,x,y,hp,radius){
  return{
    x,y,px:x,py:y,vx:0,vy:0,
    rotPhase:Math.random()*Math.PI*2,
    type,hp,maxHp:hp,radius,
    flashTimer:0,
    fireTimer: FIRE_RATE[type] ? FIRE_RATE[type]*Math.random() : Infinity,
  };
}

export function spawnNormalEnemy(es,W,H,wave){
  const roll=Math.random();
  let type='normal';
  if(wave>=3 && roll<0.28) type='fast';
  if(wave>=4 && roll<0.13) type='tank';
  const r  = type==='tank' ? ENEMY_RADIUS*1.5 : ENEMY_RADIUS;
  const hp = type==='tank' ? 5 : 2;
  const pos= edgeSpawn(W,H,r+4);
  es.enemies.push(makeEnemy(type,pos.x,pos.y,hp,r));
}

export function spawnBoss(es,W){
  es.enemies.push(makeEnemy('boss',W/2,-BOSS_RADIUS-4,BOSS_HP,BOSS_RADIUS));
}

export function updateEnemies(es,playerX,playerY,wave,dt){
  const newBullets=[];
  for(const e of es.enemies){
    e.px=e.x; e.py=e.y;
    let speed = BASE_SPEEDS[e.type] + WAVE_SPEED_BONUS[e.type]*wave;
    if(e.type==='boss' && e.hp/e.maxHp < 0.4) speed *= 1.7;

    const dx=playerX-e.x, dy=playerY-e.y;
    const dist=Math.hypot(dx,dy)||0.001;
    e.vx=(dx/dist)*speed; e.vy=(dy/dist)*speed;
    e.x+=e.vx*dt; e.y+=e.vy*dt;
    e.rotPhase=(e.rotPhase+dt*(e.type==='boss'?0.5:e.type==='fast'?3.5:1.6))%(Math.PI*2);
    if(e.flashTimer>0) e.flashTimer-=dt;

    if(wave>=2 && FIRE_RATE[e.type] && e.fireTimer!==Infinity){
      e.fireTimer-=dt;
      if(e.fireTimer<=0){
        e.fireTimer=FIRE_RATE[e.type];
        const angle=Math.atan2(playerY-e.y,playerX-e.x);
        const ESPEED=e.type==='boss'?270:210;
        if(e.type==='boss'){
          const spread=e.hp/e.maxHp<0.4?0.35:0.24;
          [-spread*2,-spread,0,spread,spread*2].forEach(off=>{
            const a=angle+off;
            newBullets.push({x:e.x,y:e.y,vx:Math.cos(a)*ESPEED,vy:Math.sin(a)*ESPEED,fromBoss:true});
          });
        } else if(e.type==='tank'){
          [-0.28,0,0.28].forEach(off=>{
            const a=angle+off;
            newBullets.push({x:e.x,y:e.y,vx:Math.cos(a)*ESPEED,vy:Math.sin(a)*ESPEED,fromBoss:false});
          });
        } else {
          newBullets.push({x:e.x,y:e.y,vx:Math.cos(angle)*ESPEED,vy:Math.sin(angle)*ESPEED,fromBoss:false});
        }
      }
    }
  }
  return newBullets;
}

export function drawEnemies(ctx,enemies,alpha){
  for(const e of enemies){
    const x=e.px+(e.x-e.px)*alpha;
    const y=e.py+(e.y-e.py)*alpha;
    const flash=e.flashTimer>0;
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(e.rotPhase);
    switch(e.type){
      case 'normal':_drawNormal(ctx,e.radius,flash);break;
      case 'fast':  _drawFast(ctx,e.radius,flash);break;
      case 'tank':  _drawTank(ctx,e.radius,flash);break;
      case 'boss':  _drawBoss(ctx,e.radius,flash,e.rotPhase,e.hp,e.maxHp);break;
    }
    if(e.type==='tank'||e.type==='boss'){
      ctx.rotate(-e.rotPhase);
      const bW=e.radius*2.4,bH=e.type==='boss'?8:5;
      const bX=-bW/2,bY=e.radius+(e.type==='boss'?16:10);
      const rat=e.hp/e.maxHp;
      ctx.shadowBlur=0;ctx.globalAlpha=0.92;
      ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(bX,bY,bW,bH);
      ctx.fillStyle=rat>0.5?'#00ff88':rat>0.25?'#ffe600':'#ff2d6b';
      ctx.fillRect(bX,bY,bW*rat,bH);
      ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=1;ctx.strokeRect(bX,bY,bW,bH);
    }
    ctx.restore();
  }
}

function _drawNormal(ctx,r,flash){
  const C=flash?'#ffffff':'#ff2d6b';
  ctx.shadowColor=C;ctx.shadowBlur=flash?40:18;
  ctx.beginPath();
  ctx.moveTo(0,-r);ctx.lineTo(r*0.6,0);ctx.lineTo(0,r*0.7);ctx.lineTo(-r*0.6,0);
  ctx.closePath();
  const g=ctx.createRadialGradient(0,0,0,0,0,r);
  g.addColorStop(0,flash?'#ffffff':'rgba(255,100,140,0.95)');
  g.addColorStop(0.5,C);g.addColorStop(1,'rgba(120,0,40,0.5)');
  ctx.fillStyle=g;ctx.fill();
  ctx.strokeStyle=flash?'#ffffff':'#ff80a8';ctx.lineWidth=1.2;ctx.stroke();
  [1,-1].forEach(s=>{
    ctx.beginPath();
    ctx.moveTo(s*r*0.5,-r*0.1);ctx.lineTo(s*r*1.1,r*0.25);ctx.lineTo(s*r*0.45,r*0.35);
    ctx.closePath();ctx.fillStyle='rgba(255,45,107,0.5)';ctx.fill();
    ctx.strokeStyle='#ff2d6b';ctx.lineWidth=0.7;ctx.stroke();
  });
  const cg=ctx.createRadialGradient(0,0,0,0,0,r*0.3);
  cg.addColorStop(0,'#ffffff');cg.addColorStop(0.5,'#ff80a8');cg.addColorStop(1,'rgba(255,45,107,0)');
  ctx.fillStyle=cg;ctx.shadowBlur=14;ctx.shadowColor='#ffaacc';
  ctx.beginPath();ctx.arc(0,0,r*0.3,0,Math.PI*2);ctx.fill();
}

function _drawFast(ctx,r,flash){
  const C=flash?'#ffffff':'#ff8800';
  ctx.shadowColor=flash?'#ffffff':'#ff6600';ctx.shadowBlur=flash?40:18;
  ctx.beginPath();
  ctx.moveTo(0,-r*1.7);ctx.lineTo(r*0.3,r*0.2);ctx.lineTo(r*0.18,r*0.85);
  ctx.lineTo(0,r*0.65);ctx.lineTo(-r*0.18,r*0.85);ctx.lineTo(-r*0.3,r*0.2);
  ctx.closePath();
  const ng=ctx.createLinearGradient(0,-r*1.7,0,r*0.85);
  ng.addColorStop(0,'#ffffff');ng.addColorStop(0.3,C);
  ng.addColorStop(0.8,'rgba(180,60,0,0.8)');ng.addColorStop(1,'rgba(80,20,0,0.4)');
  ctx.fillStyle=ng;ctx.fill();
  ctx.strokeStyle=flash?'#ffffff':'#ffbb55';ctx.lineWidth=1;ctx.stroke();
  [1,-1].forEach(s=>{
    ctx.beginPath();
    ctx.moveTo(s*r*0.28,0);ctx.lineTo(s*r*1.05,r*0.75);ctx.lineTo(s*r*0.18,r*0.7);
    ctx.closePath();ctx.fillStyle='rgba(255,120,0,0.45)';ctx.fill();
    ctx.strokeStyle='#ff8800';ctx.lineWidth=0.7;ctx.stroke();
  });
  const eg=ctx.createRadialGradient(0,r*0.5,0,0,r*0.5,r*0.45);
  eg.addColorStop(0,'rgba(255,200,80,0.9)');eg.addColorStop(1,'rgba(255,50,0,0)');
  ctx.fillStyle=eg;ctx.shadowBlur=18;ctx.shadowColor='#ff6600';
  ctx.beginPath();ctx.arc(0,r*0.5,r*0.45,0,Math.PI*2);ctx.fill();
  ctx.shadowColor='#ffffff';ctx.shadowBlur=12;ctx.fillStyle='#ffffff';
  ctx.beginPath();ctx.arc(0,-r*1.7,1.2,0,Math.PI*2);ctx.fill();
}

function _drawTank(ctx,r,flash){
  const C=flash?'#ffffff':'#cc00ff';
  ctx.shadowColor=flash?'#ffffff':'#aa00dd';ctx.shadowBlur=flash?40:22;
  ctx.beginPath();
  for(let i=0;i<8;i++){
    const a=(i/8)*Math.PI*2-Math.PI/8;
    i===0?ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r):ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
  }
  ctx.closePath();
  const tg=ctx.createRadialGradient(0,0,0,0,0,r);
  tg.addColorStop(0,flash?'#ffffff':'rgba(200,80,255,0.95)');
  tg.addColorStop(0.5,C);tg.addColorStop(0.85,'rgba(80,0,120,0.9)');tg.addColorStop(1,'rgba(30,0,60,0.7)');
  ctx.fillStyle=tg;ctx.fill();
  ctx.strokeStyle=flash?'#ffffff':'#dd88ff';ctx.lineWidth=2;ctx.stroke();
  ctx.beginPath();
  for(let i=0;i<8;i++){
    const a=(i/8)*Math.PI*2-Math.PI/8;
    i===0?ctx.moveTo(Math.cos(a)*r*0.65,Math.sin(a)*r*0.65):ctx.lineTo(Math.cos(a)*r*0.65,Math.sin(a)*r*0.65);
  }
  ctx.closePath();ctx.strokeStyle='rgba(220,150,255,0.5)';ctx.lineWidth=1.2;ctx.stroke();
  ctx.strokeStyle='rgba(200,100,255,0.25)';ctx.lineWidth=0.7;
  for(let i=0;i<8;i++){
    const a=(i/8)*Math.PI*2-Math.PI/8;
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*r*0.65,Math.sin(a)*r*0.65);ctx.stroke();
  }
  for(let i=0;i<4;i++){
    const a=(i/4)*Math.PI*2+Math.PI/4;
    const tx=Math.cos(a)*r*0.88,ty=Math.sin(a)*r*0.88;
    ctx.shadowBlur=10;ctx.shadowColor='#cc00ff';ctx.fillStyle=flash?'#ffffff':'#dd88ff';
    ctx.beginPath();ctx.arc(tx,ty,3.5,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#cc00ff';ctx.lineWidth=1;ctx.stroke();
  }
  const cg=ctx.createRadialGradient(0,0,0,0,0,r*0.28);
  cg.addColorStop(0,'#ffffff');cg.addColorStop(0.4,'#cc00ff');cg.addColorStop(1,'rgba(100,0,180,0)');
  ctx.fillStyle=cg;ctx.shadowBlur=20;ctx.shadowColor='#dd88ff';
  ctx.beginPath();ctx.arc(0,0,r*0.28,0,Math.PI*2);ctx.fill();
}

function _drawBoss(ctx,r,flash,rotPhase){
  const C=flash?'#ffffff':'#ff0044';
  ctx.shadowColor=flash?'#ffffff':'#ff0044';ctx.shadowBlur=flash?60:35;
  ctx.beginPath();
  ctx.moveTo(0,-r*0.9);ctx.lineTo(r*0.5,-r*0.5);ctx.lineTo(r*0.95,-r*0.05);
  ctx.lineTo(r,r*0.4);ctx.lineTo(r*0.6,r*0.9);ctx.lineTo(0,r*0.75);
  ctx.lineTo(-r*0.6,r*0.9);ctx.lineTo(-r,r*0.4);ctx.lineTo(-r*0.95,-r*0.05);
  ctx.lineTo(-r*0.5,-r*0.5);ctx.closePath();
  const hg=ctx.createRadialGradient(0,0,0,0,0,r);
  hg.addColorStop(0,flash?'#ffffff':'rgba(255,80,100,0.95)');
  hg.addColorStop(0.45,C);hg.addColorStop(0.8,'rgba(120,0,30,0.9)');hg.addColorStop(1,'rgba(40,0,10,0.8)');
  ctx.fillStyle=hg;ctx.fill();
  ctx.strokeStyle=flash?'#ffffff':'#ff6680';ctx.lineWidth=2.5;ctx.stroke();
  ctx.strokeStyle='rgba(255,100,120,0.28)';ctx.lineWidth=0.8;
  [[-r*0.8,0,r*0.8,0],[-r*0.6,-r*0.4,r*0.6,-r*0.4],[-r*0.5,r*0.5,r*0.5,r*0.5],[0,-r*0.85,0,r*0.7]].forEach(([x1,y1,x2,y2])=>{
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  });
  [1,-1].forEach(s=>{
    ctx.save();ctx.translate(s*r*0.88,r*0.18);
    ctx.shadowColor=flash?'#ffffff':'#ff0044';ctx.shadowBlur=15;
    ctx.fillStyle=flash?'#ffffff':'rgba(180,0,40,0.9)';
    ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=flash?'#ffffff':'#ff6680';ctx.lineWidth=1.5;ctx.stroke();
    ctx.fillStyle=flash?'#ffffff':'#ff2244';ctx.fillRect(-3.5,-14,7,14);
    ctx.strokeStyle=flash?'#ffffff':'#ff8899';ctx.lineWidth=1;ctx.strokeRect(-3.5,-14,7,14);
    const mg=ctx.createRadialGradient(0,-14,0,0,-14,9);
    mg.addColorStop(0,'rgba(255,150,170,0.8)');mg.addColorStop(1,'rgba(255,0,40,0)');
    ctx.fillStyle=mg;ctx.beginPath();ctx.arc(0,-14,9,0,Math.PI*2);ctx.fill();
    ctx.restore();
  });
  ctx.save();
  ctx.shadowColor='#ff4466';ctx.shadowBlur=20;
  ctx.beginPath();
  ctx.moveTo(-r*0.32,-r*0.88);ctx.lineTo(r*0.32,-r*0.88);
  ctx.lineTo(r*0.42,-r*0.34);ctx.lineTo(-r*0.42,-r*0.34);ctx.closePath();
  const brg=ctx.createLinearGradient(0,-r*0.88,0,-r*0.34);
  brg.addColorStop(0,flash?'#ffffff':'rgba(255,120,140,0.95)');brg.addColorStop(1,'rgba(180,0,40,0.8)');
  ctx.fillStyle=brg;ctx.fill();
  ctx.strokeStyle=flash?'#ffffff':'#ff8899';ctx.lineWidth=1.2;ctx.stroke();
  if(!flash){
    [-1,0,1].forEach(i=>{
      ctx.fillStyle='rgba(255,200,210,0.9)';ctx.shadowColor='#ff8899';ctx.shadowBlur=8;
      ctx.beginPath();ctx.arc(i*r*0.2,-r*0.62,3,0,Math.PI*2);ctx.fill();
    });
  }
  ctx.restore();
  ctx.save();ctx.rotate(rotPhase*0.7);
  ctx.shadowColor='#ff0044';ctx.shadowBlur=15;ctx.setLineDash([10,7]);
  ctx.strokeStyle=flash?'rgba(255,255,255,0.6)':'rgba(255,80,100,0.5)';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(0,0,r*1.18,0,Math.PI*2);ctx.stroke();
  ctx.rotate(-rotPhase*1.4);
  ctx.strokeStyle=flash?'rgba(255,255,255,0.35)':'rgba(255,120,140,0.3)';ctx.lineWidth=1.2;
  ctx.setLineDash([5,12]);
  ctx.beginPath();ctx.arc(0,0,r*1.38,0,Math.PI*2);ctx.stroke();
  ctx.setLineDash([]);ctx.restore();
  const rg=ctx.createRadialGradient(0,r*0.1,0,0,r*0.1,r*0.28);
  rg.addColorStop(0,'#ffffff');rg.addColorStop(0.3,'#ff4466');rg.addColorStop(1,'rgba(200,0,40,0)');
  ctx.fillStyle=rg;ctx.shadowColor='#ff0044';ctx.shadowBlur=32;
  ctx.beginPath();ctx.arc(0,r*0.1,r*0.28,0,Math.PI*2);ctx.fill();
}