export const ENEMY_BULLET_RADIUS = 5;

export function makeEnemyBulletState() { return { bullets:[] }; }

export function addEnemyBullets(ebs,newBullets){
  for(const b of newBullets) ebs.bullets.push({...b,px:b.x,py:b.y,life:3.5});
}

export function updateEnemyBullets(ebs,dt,W,H){
  const M=30;
  ebs.bullets=ebs.bullets.filter(b=>{
    b.px=b.x;b.py=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
    return b.life>0&&b.x>-M&&b.x<W+M&&b.y>-M&&b.y<H+M;
  });
}

export function checkEnemyBulletPlayerCollision(ebs,playerX,playerY,playerRadius){
  let hit=false;
  const threshold=(ENEMY_BULLET_RADIUS+playerRadius*0.85)**2;
  ebs.bullets=ebs.bullets.filter(b=>{
    const dx=b.x-playerX,dy=b.y-playerY;
    if(dx*dx+dy*dy<threshold){hit=true;return false;}
    return true;
  });
  return hit;
}

export function drawEnemyBullets(ctx,bullets,alpha){
  for(const b of bullets){
    const x=b.px+(b.x-b.px)*alpha;
    const y=b.py+(b.y-b.py)*alpha;
    const ta=Math.max(0,alpha-0.2);
    const tx=b.px+(b.x-b.px)*ta;
    const ty=b.py+(b.y-b.py)*ta;
    const col=b.fromBoss?'#ff0044':'#ff8800';
    const glo=b.fromBoss?'#ff0044':'#ff6600';
    ctx.save();
    ctx.globalAlpha=0.45;ctx.shadowColor=glo;ctx.shadowBlur=18;
    ctx.strokeStyle=col;ctx.lineWidth=b.fromBoss?4:3;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(x,y);ctx.stroke();
    ctx.globalAlpha=0.9;ctx.shadowBlur=12;ctx.fillStyle=col;
    ctx.beginPath();ctx.arc(x,y,b.fromBoss?ENEMY_BULLET_RADIUS+2:ENEMY_BULLET_RADIUS,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;ctx.shadowBlur=6;ctx.shadowColor='#ffffff';ctx.fillStyle='#ffffff';
    ctx.beginPath();ctx.arc(x,y,b.fromBoss?3:2,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
}