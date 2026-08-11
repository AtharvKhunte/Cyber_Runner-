export function drawScout(ctx,pulse,navPhase){
  const C='#00ffe7';
  ctx.save();
  _exhaust(ctx,-9,20,pulse,'#00ffe7','#0080ff');
  _exhaust(ctx,9,20,pulse,'#00ffe7','#0080ff');
  ctx.shadowColor=C;ctx.shadowBlur=10+pulse*8;
  [1,-1].forEach(s=>{
    ctx.beginPath();
    ctx.moveTo(0,-14);ctx.lineTo(s*28,16);ctx.lineTo(s*18,22);ctx.lineTo(s*4,17);
    ctx.closePath();
    const wg=ctx.createLinearGradient(s*28,0,0,0);
    wg.addColorStop(0,'rgba(0,160,140,0.4)');wg.addColorStop(1,'rgba(0,255,231,0.75)');
    ctx.fillStyle=wg;ctx.fill();
    ctx.strokeStyle='rgba(0,255,231,0.45)';ctx.lineWidth=0.7;
    ctx.beginPath();ctx.moveTo(s*4,13);ctx.lineTo(s*22,13);ctx.stroke();
    ctx.beginPath();ctx.moveTo(s*7,6);ctx.lineTo(s*16,9);ctx.stroke();
  });
  _pod(ctx,-12,18,C,pulse);_pod(ctx,12,18,C,pulse);
  ctx.shadowColor=C;ctx.shadowBlur=18+pulse*12;
  ctx.beginPath();
  ctx.moveTo(0,-24);ctx.lineTo(5,-10);ctx.lineTo(7,5);
  ctx.lineTo(5,20);ctx.lineTo(0,22);ctx.lineTo(-5,20);
  ctx.lineTo(-7,5);ctx.lineTo(-5,-10);ctx.closePath();
  const hg=ctx.createLinearGradient(0,-24,0,22);
  hg.addColorStop(0,'#ffffff');hg.addColorStop(0.3,C);
  hg.addColorStop(0.75,'rgba(0,180,160,0.7)');hg.addColorStop(1,'rgba(0,60,50,0.5)');
  ctx.fillStyle=hg;ctx.fill();
  ctx.strokeStyle='#80ffee';ctx.lineWidth=0.9;ctx.stroke();
  ctx.strokeStyle='rgba(0,255,231,0.5)';ctx.lineWidth=0.6;
  ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(0,18);ctx.stroke();
  ctx.beginPath();ctx.moveTo(-5,2);ctx.lineTo(5,2);ctx.stroke();
  _cockpit(ctx,0,-9,'#80ffff','rgba(120,240,255,0.85)');
  ctx.shadowColor='#ffffff';ctx.shadowBlur=16+pulse*8;ctx.fillStyle='#ffffff';ctx.globalAlpha=0.95;
  ctx.beginPath();ctx.arc(0,-24,1.5,0,Math.PI*2);ctx.fill();
  const blink=(Math.sin(navPhase)+1)/2;
  _navLight(ctx,-28,16,`rgba(255,60,60,${0.4+blink*0.6})`);
  _navLight(ctx,28,16,`rgba(60,255,100,${0.4+(1-blink)*0.6})`);
  ctx.restore();
}

export function drawTank(ctx,pulse,navPhase){
  const C='#00cfff';
  ctx.save();
  [-14,0,14].forEach(xo=>_exhaust(ctx,xo,26,pulse*0.8,'#0080ff','#0040aa'));
  ctx.shadowColor=C;ctx.shadowBlur=10+pulse*6;
  [1,-1].forEach(s=>{
    ctx.beginPath();
    ctx.moveTo(s*4,-10);ctx.lineTo(s*34,2);ctx.lineTo(s*36,18);
    ctx.lineTo(s*20,26);ctx.lineTo(s*6,22);ctx.closePath();
    const wg=ctx.createLinearGradient(s*36,0,0,0);
    wg.addColorStop(0,'rgba(0,80,140,0.55)');wg.addColorStop(1,'rgba(0,180,220,0.7)');
    ctx.fillStyle=wg;ctx.fill();
    ctx.strokeStyle='rgba(0,200,255,0.4)';ctx.lineWidth=0.8;
    ctx.beginPath();ctx.moveTo(s*8,0);ctx.lineTo(s*30,8);ctx.stroke();
    ctx.beginPath();ctx.moveTo(s*12,10);ctx.lineTo(s*28,15);ctx.stroke();
    ctx.fillStyle='rgba(0,150,200,0.9)';
    ctx.fillRect(s>0?30:-(30+6),6,6,16);
    ctx.strokeStyle='rgba(0,200,255,0.7)';ctx.lineWidth=0.8;ctx.strokeRect(s>0?30:-(30+6),6,6,16);
  });
  ctx.shadowColor=C;ctx.shadowBlur=20+pulse*10;
  ctx.beginPath();
  ctx.moveTo(-3,-22);ctx.lineTo(3,-22);ctx.lineTo(8,-10);
  ctx.lineTo(10,8);ctx.lineTo(8,26);ctx.lineTo(0,28);
  ctx.lineTo(-8,26);ctx.lineTo(-10,8);ctx.lineTo(-8,-10);ctx.closePath();
  const hg=ctx.createLinearGradient(0,-22,0,28);
  hg.addColorStop(0,'#cceeff');hg.addColorStop(0.25,C);
  hg.addColorStop(0.7,'rgba(0,100,180,0.85)');hg.addColorStop(1,'rgba(0,30,80,0.6)');
  ctx.fillStyle=hg;ctx.fill();ctx.strokeStyle='#88ddff';ctx.lineWidth=1.2;ctx.stroke();
  ctx.strokeStyle='rgba(0,200,255,0.3)';ctx.lineWidth=0.7;
  ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(8,0);ctx.stroke();
  ctx.beginPath();ctx.moveTo(-7,12);ctx.lineTo(7,12);ctx.stroke();
  ctx.save();ctx.shadowColor='#aaeeff';ctx.shadowBlur=12;
  ctx.beginPath();ctx.ellipse(0,-12,7,9,0,0,Math.PI*2);
  const dg=ctx.createRadialGradient(-2,-14,0.5,0,-12,9);
  dg.addColorStop(0,'rgba(255,255,255,0.95)');dg.addColorStop(0.3,'rgba(180,240,255,0.85)');
  dg.addColorStop(0.8,'rgba(0,160,220,0.7)');dg.addColorStop(1,'rgba(0,60,120,0.5)');
  ctx.fillStyle=dg;ctx.fill();
  ctx.globalAlpha=0.7;ctx.fillStyle='rgba(255,255,255,0.8)';
  ctx.beginPath();ctx.ellipse(-2,-15,1.5,3,-0.3,0,Math.PI*2);ctx.fill();
  ctx.restore();
  ctx.shadowColor='#ffffff';ctx.shadowBlur=12+pulse*6;ctx.fillStyle='#cceeff';ctx.globalAlpha=0.9;
  ctx.beginPath();ctx.arc(0,-22,2,0,Math.PI*2);ctx.fill();
  const blink=(Math.sin(navPhase)+1)/2;
  _navLight(ctx,-36,10,`rgba(255,60,60,${0.4+blink*0.6})`);
  _navLight(ctx,36,10,`rgba(60,255,100,${0.4+(1-blink)*0.6})`);
  ctx.restore();
}

export function drawAssassin(ctx,pulse,navPhase){
  const C='#c060ff';
  ctx.save();
  _exhaust(ctx,0,22,pulse*1.3,'#8020cc','#ff00ff');
  ctx.shadowColor=C;ctx.shadowBlur=8+pulse*6;
  [1,-1].forEach(s=>{
    ctx.beginPath();
    ctx.moveTo(s*2,-5);ctx.lineTo(s*22,18);ctx.lineTo(s*14,22);ctx.lineTo(s*2,12);
    ctx.closePath();
    const wg=ctx.createLinearGradient(s*22,0,0,0);
    wg.addColorStop(0,'rgba(140,0,200,0.3)');wg.addColorStop(1,'rgba(180,80,255,0.65)');
    ctx.fillStyle=wg;ctx.fill();
    ctx.strokeStyle='rgba(192,96,255,0.5)';ctx.lineWidth=0.7;
    ctx.beginPath();ctx.moveTo(s*3,5);ctx.lineTo(s*18,17);ctx.stroke();
  });
  ctx.shadowColor=C;ctx.shadowBlur=22+pulse*14;
  ctx.beginPath();
  ctx.moveTo(0,-30);ctx.lineTo(4,-14);ctx.lineTo(5,4);
  ctx.lineTo(4,22);ctx.lineTo(0,24);ctx.lineTo(-4,22);
  ctx.lineTo(-5,4);ctx.lineTo(-4,-14);ctx.closePath();
  const hg=ctx.createLinearGradient(0,-30,0,24);
  hg.addColorStop(0,'#ffffff');hg.addColorStop(0.2,C);
  hg.addColorStop(0.6,'rgba(140,0,200,0.85)');hg.addColorStop(1,'rgba(60,0,100,0.5)');
  ctx.fillStyle=hg;ctx.fill();ctx.strokeStyle='#e090ff';ctx.lineWidth=0.8;ctx.stroke();
  ctx.strokeStyle='rgba(192,96,255,0.4)';ctx.lineWidth=0.6;
  ctx.beginPath();ctx.moveTo(-4,-2);ctx.lineTo(4,-2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(-4,10);ctx.lineTo(4,10);ctx.stroke();
  ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(0,20);ctx.stroke();
  ctx.save();ctx.shadowColor='#ff80ff';ctx.shadowBlur=10;
  ctx.beginPath();ctx.ellipse(0,-12,2.5,5,0,0,Math.PI*2);
  const dg=ctx.createRadialGradient(-0.8,-14,0.3,0,-12,5);
  dg.addColorStop(0,'rgba(255,255,255,0.95)');dg.addColorStop(0.4,'rgba(220,140,255,0.9)');
  dg.addColorStop(1,'rgba(120,0,200,0.5)');
  ctx.fillStyle=dg;ctx.fill();ctx.restore();
  ctx.shadowColor='#ffffff';ctx.shadowBlur=20+pulse*12;ctx.fillStyle='#ffffff';ctx.globalAlpha=1;
  ctx.beginPath();ctx.arc(0,-30,1.2,0,Math.PI*2);ctx.fill();
  const blink=(Math.sin(navPhase)+1)/2;
  _navLight(ctx,-22,20,`rgba(200,80,255,${0.4+blink*0.6})`);
  _navLight(ctx,22,20,`rgba(200,80,255,${0.4+(1-blink)*0.6})`);
  ctx.restore();
}

function _exhaust(ctx,x,y,pulse,inner,outer){
  ctx.save();ctx.translate(x,y);
  const h=9+pulse*14,w=4+pulse*2;
  const fg=ctx.createRadialGradient(0,0,0,0,h*0.6,h);
  fg.addColorStop(0,'rgba(255,255,200,0.95)');
  fg.addColorStop(0.2,inner+'cc');fg.addColorStop(0.6,outer+'88');fg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.globalAlpha=0.85+pulse*0.15;ctx.shadowColor=outer;ctx.shadowBlur=12+pulse*10;
  ctx.fillStyle=fg;
  ctx.beginPath();
  ctx.moveTo(0,0);ctx.bezierCurveTo(-w,h*0.4,-w*0.5,h*0.8,0,h);
  ctx.bezierCurveTo(w*0.5,h*0.8,w,h*0.4,0,0);
  ctx.fill();ctx.restore();
}

function _pod(ctx,x,y,color,pulse){
  ctx.save();ctx.translate(x,y);ctx.shadowColor=color;ctx.shadowBlur=8;
  ctx.beginPath();ctx.ellipse(0,0,4,6,0,0,Math.PI*2);
  const pg=ctx.createRadialGradient(0,-2,0,0,0,6);
  pg.addColorStop(0,'rgba(200,255,245,0.9)');pg.addColorStop(0.6,color+'cc');pg.addColorStop(1,'rgba(0,60,50,0.6)');
  ctx.fillStyle=pg;ctx.fill();ctx.strokeStyle=color+'bb';ctx.lineWidth=0.8;ctx.stroke();ctx.restore();
}

function _cockpit(ctx,x,y,glowColor,fillColor){
  ctx.save();ctx.shadowColor=glowColor;ctx.shadowBlur=14;
  ctx.beginPath();ctx.ellipse(x,y,4,6,0,0,Math.PI*2);
  const dg=ctx.createRadialGradient(x-1.5,y-2,0.5,x,y,6);
  dg.addColorStop(0,'rgba(255,255,255,0.95)');dg.addColorStop(0.3,fillColor);
  dg.addColorStop(0.8,'rgba(0,180,220,0.7)');dg.addColorStop(1,'rgba(0,80,120,0.5)');
  ctx.fillStyle=dg;ctx.fill();
  ctx.globalAlpha=0.7;ctx.fillStyle='rgba(255,255,255,0.8)';
  ctx.beginPath();ctx.ellipse(x-1.2,y-2,1,2.2,-0.3,0,Math.PI*2);ctx.fill();ctx.restore();
}

function _navLight(ctx,x,y,color){
  ctx.save();ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=8;
  ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.fill();ctx.restore();
}