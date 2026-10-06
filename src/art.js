/* Procedural art layer: scenery, poses, skill VFX, hit feedback, HUD. Render-only; never touches combat state. */
(function(root){
'use strict';
const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),ease=x=>x*x*(3-2*x),rnd=i=>{const s=Math.sin(i*127.1+311.7)*43758.5453;return s-Math.floor(s);};
const SANS="'Microsoft YaHei','Noto Sans CJK SC',sans-serif",SERIF="'STKaiti','KaiTi','Noto Serif CJK SC',serif";
function tools(c){
 return {
  rect(x,y,w,h,col,r=0){c.fillStyle=col;if(r){c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}else c.fillRect(x,y,w,h);},
  line(pts,col,w=2){c.strokeStyle=col;c.lineWidth=w;c.lineCap='round';c.lineJoin='round';c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();},
  ellipse(x,y,rx,ry,col){c.fillStyle=col;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();}
 };
}
function create(ctx,opt){
 const {DPR,GROUND,reduced,make}=opt;
 const {rect,line,ellipse}=tools(ctx);
 const S={particles:[],floats:[],bursts:[],flash:null,trails:[[],[]],prevX:[0,0],prevH:[0,0],squash:[0,0],ghost:[{hp:100,en:0},{hp:100,en:0}],paused:false,mw:0,mg:0,bg:null};
 function text(s,x,y,size=14,color='#e0e1d2',align='left',font='sans'){ctx.fillStyle=color;ctx.font=`${size}px ${font==='serif'?SERIF:SANS}`;ctx.textAlign=align;ctx.fillText(s,x,y);}
 function outlined(s,x,y,size,fill,stroke='#12070c',align='center',font='serif',sw=5){ctx.font=`900 ${size}px ${font==='serif'?SERIF:SANS}`;ctx.textAlign=align;ctx.lineJoin='round';ctx.lineWidth=sw;ctx.strokeStyle=stroke;ctx.strokeText(s,x,y);ctx.fillStyle=fill;ctx.fillText(s,x,y);}
 function crescent(cx,cy,rx,ry,a0,a1,thick,fill){
  const N=22;ctx.beginPath();
  for(let k=0;k<=N;k++){const a=a0+(a1-a0)*k/N;ctx[k?'lineTo':'moveTo'](cx+Math.cos(a)*rx,cy+Math.sin(a)*ry);}
  for(let k=N;k>=0;k--){const a=a0+(a1-a0)*k/N,th=Math.sin(k/N*Math.PI)*thick;ctx.lineTo(cx+Math.cos(a)*(rx-th),cy+Math.sin(a)*(ry-th*1.15));}
  ctx.closePath();ctx.fillStyle=fill;ctx.fill();
 }
 function spawn(p){if(S.paused||S.particles.length>600)return;S.particles.push(Object.assign({vx:0,vy:0,g:0,life:20,max:20,size:2,kind:'line',color:'#fff'},p,{max:p.life||20}));}
 // ---------------------------------------------------------------- scenery
 function bamboo(g,T,x,h,lean,col){
  for(let k=0,y=0;y<h;k++){const seg=48+rnd(x+k)*18,x0=x+lean*y/h*30,x1=x+lean*(y+seg)/h*30;T.line([[x0,640-y],[x1,640-y-seg]],col,7);T.line([[x1-5,640-y-seg],[x1+5,640-y-seg]],'#00000055',2);y+=seg;}
  for(let k=0;k<7;k++){const yy=640-h*(.35+rnd(x+k*3)*.6),xx=x+lean*(1-(yy-640+h)/h)*0;g.fillStyle=col;g.beginPath();const s=k%2?1:-1;g.moveTo(xx,yy);g.quadraticCurveTo(xx+s*40,yy-16,xx+s*84,yy+10);g.quadraticCurveTo(xx+s*40,yy-3,xx,yy);g.fill();}
 }
 function pagoda(g,T,x,base,s,col){
  for(let k=0;k<5;k++){const w=(112-k*17)*s,y=base-k*46*s;T.rect(x-w*.32,y-34*s,w*.64,34*s,col);g.fillStyle=col;g.beginPath();g.moveTo(x-w/2-16*s,y-30*s);g.quadraticCurveTo(x,y-44*s,x+w/2+16*s,y-30*s);g.lineTo(x+w/2,y-38*s);g.quadraticCurveTo(x,y-58*s,x-w/2,y-38*s);g.closePath();g.fill();}
  T.line([[x,base-230*s],[x,base-266*s]],col,3*s);
 }
 function buildStatic(){
  const c=make();c.width=1280*DPR;c.height=640*DPR;const g=c.getContext('2d');g.scale(DPR,DPR);const T=tools(g);
  const sky=g.createLinearGradient(0,0,0,500);[[0,'#080b26'],[.4,'#241a4a'],[.7,'#6a2d5a'],[.9,'#c75b6c'],[1,'#f2a06c']].forEach(([o,col])=>sky.addColorStop(o,col));g.fillStyle=sky;g.fillRect(0,0,1280,640);
  for(let i=0;i<110;i++){const y=rnd(i+300)*300;T.ellipse(rnd(i)*1280,y,rnd(i+600)*1.3+.3,rnd(i+600)*1.3+.3,`rgba(255,244,214,${.75-y/420})`);}
  // Moon framed by a torii gate.
  const moon=g.createRadialGradient(610,225,10,640,255,115);moon.addColorStop(0,'#fffbe8');moon.addColorStop(1,'#ffdc9a');g.fillStyle=moon;g.beginPath();g.arc(640,255,112,0,TAU);g.fill();
  for(const [cx,cy,r] of [[600,220,16],[675,280,22],[630,310,10],[690,215,8]])T.ellipse(cx,cy,r,r*.8,'#e9c88a55');
  const layers=['#4b2a5c','#2f1c48','#1b1031'];
  for(let layer=0;layer<3;layer++){const base=320+layer*54;g.fillStyle=layers[layer];g.beginPath();g.moveTo(0,560);for(let x=0;x<=1280;x+=32)g.lineTo(x,base-Math.sin(x*.0065+layer*2.4)*48-Math.cos(x*.013-layer)*26);g.lineTo(1280,560);g.fill();
   const mist=g.createLinearGradient(0,base-30,0,base+60);mist.addColorStop(0,'rgba(255,190,200,0)');mist.addColorStop(1,'rgba(255,190,200,.13)');g.fillStyle=mist;g.fillRect(0,base-30,1280,110);}
  pagoda(g,T,160,440,1,'#1f1236');pagoda(g,T,1130,445,.8,'#1f1236');
  const wood='#2a0e1b';
  T.rect(425,150,26,345,wood);T.rect(829,150,26,345,wood);T.rect(421,470,34,26,'#1b0a13');T.rect(825,470,34,26,'#1b0a13');T.rect(425,150,5,345,'#8c2c3e');T.rect(829,150,5,345,'#8c2c3e');
  g.fillStyle=wood;g.beginPath();g.moveTo(320,126);g.quadraticCurveTo(640,152,960,126);g.lineTo(944,160);g.quadraticCurveTo(640,182,336,160);g.closePath();g.fill();
  g.strokeStyle='#8c2c3e';g.lineWidth=2;g.beginPath();g.moveTo(322,127);g.quadraticCurveTo(640,153,958,127);g.stroke();
  T.rect(404,196,472,16,wood);T.rect(404,196,472,3,'#8c2c3e');T.rect(626,166,28,32,'#12060d');
  g.fillStyle='#d9b45a';g.font=`900 20px ${SERIF}`;g.textAlign='center';g.fillText('忍',640,191);
  bamboo(g,T,38,430,.4,'#150a26');bamboo(g,T,92,360,-.3,'#1b0e2e');bamboo(g,T,1240,440,-.4,'#150a26');bamboo(g,T,1186,350,.3,'#1b0e2e');
  // Dojo floor with perspective planks.
  const fl=g.createLinearGradient(0,489,0,640);fl.addColorStop(0,'#3a2230');fl.addColorStop(.2,'#241320');fl.addColorStop(1,'#0c070d');g.fillStyle=fl;g.fillRect(0,489,1280,151);
  T.rect(0,489,1280,3,'#f2b878aa');T.rect(0,492,1280,6,'#00000066');
  for(let x=-600;x<1900;x+=120)T.line([[640+(x-640)*.62,497],[x,640]],'#00000077',2);
  for(let k=1;k<7;k++){const y=497+Math.pow(k/6,1.7)*143;T.line([[0,y],[1280,y]],'#e5a97a16',1);}
  for(let i=0;i<30;i++){const y=500+rnd(i)*140;T.line([[rnd(i+9)*1280,y],[rnd(i+9)*1280+40+rnd(i+4)*60,y]],'#ffffff08',1);}
  S.bg=c;
 }
 const CH=['吓','我','一','跳','我','释','放','忍','术'];
 function backdrop(t,m,world){
  if(!S.bg)buildStatic();
  S.mw+=(m.warm-S.mw)*.18;S.mg+=(m.gold-S.mg)*.18;
  ctx.drawImage(S.bg,0,0,1280,640);
  const still=reduced(),pulse=still?0:Math.sin(t*.8)*.05;
  const halo=ctx.createRadialGradient(640,255,100,640,255,440);halo.addColorStop(0,`rgba(255,226,170,${.28+pulse})`);halo.addColorStop(1,'rgba(255,226,170,0)');ctx.fillStyle=halo;ctx.fillRect(0,0,1280,560);
  for(let i=0;i<4;i++){const x=((t*5+i*400)%1700)-210;ellipse(x,200+i*58,190,13,'rgba(255,214,226,.11)');ellipse(x+80,205+i*58,110,9,'rgba(255,214,226,.09)');}
  // Lantern string spelling the intro line.
  ctx.strokeStyle='#2a1420';ctx.lineWidth=2;ctx.beginPath();for(let x=0;x<=1280;x+=40)ctx[x?'lineTo':'moveTo'](x,106+Math.sin(x/1280*Math.PI)*24);ctx.stroke();
  for(let i=0;i<9;i++){
   const u=(i+1)/10,x=u*1280,y=106+Math.sin(u*Math.PI)*24,a=still?0:Math.sin(t*1.3+i*.9)*.08;
   ctx.save();ctx.translate(x,y);ctx.rotate(a);
   const glow=ctx.createRadialGradient(0,32,2,0,32,58);glow.addColorStop(0,'rgba(255,128,60,.42)');glow.addColorStop(1,'rgba(255,128,60,0)');ctx.fillStyle=glow;ctx.fillRect(-60,-30,120,130);
   line([[0,0],[0,10]],'#2a1420',2);rect(-9,8,18,5,'#2b1418',2);ellipse(0,32,18,22,'#d6403a');ellipse(-4,27,9,13,'#ef6b50');
   ctx.strokeStyle='#8f1f2a';ctx.lineWidth=1;for(const k of [-9,0,9]){ctx.beginPath();ctx.ellipse(0,32,Math.abs(k)+4,22,0,0,TAU);ctx.stroke();}
   rect(-9,51,18,4,'#2b1418',2);line([[0,55],[0,66]],'#e6b04c',2);text(CH[i],0,38,15,'#ffe9b0','center','serif');
   ctx.restore();
  }
  for(let i=0;i<38;i++){const sp=22+rnd(i)*26,x=((rnd(i)*1500+t*sp*.9+Math.sin(t*.7+i)*40)%1380)-50,y=((rnd(i+50)*700+t*sp)%700)-40;ctx.save();ctx.translate(x,y);ctx.rotate(t*(.6+rnd(i+7))+i);ellipse(0,0,4.5,2.4,'rgba(255,190,214,.7)');ctx.restore();}
  // Floor seal.
  ctx.strokeStyle='rgba(240,190,110,.24)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(640,548,360,42,0,0,TAU);ctx.stroke();ctx.strokeStyle='rgba(240,190,110,.13)';ctx.beginPath();ctx.ellipse(640,548,250,28,0,0,TAU);ctx.stroke();
  for(let i=0;i<16;i++){const a=t*.15+i*TAU/16;ellipse(640+Math.cos(a)*305,548+Math.sin(a)*35,3,1.6,'rgba(255,212,130,.55)');}
  if(S.mw>.01){const w=ctx.createRadialGradient(640,520,10,640,520,620);w.addColorStop(0,`rgba(255,110,30,${.34*S.mw})`);w.addColorStop(1,'rgba(255,110,30,0)');ctx.fillStyle=w;ctx.fillRect(0,0,1280,640);}
  if(S.mg>.01){const w=ctx.createRadialGradient(640,430,10,640,430,560);w.addColorStop(0,`rgba(255,226,130,${.25*S.mg})`);w.addColorStop(1,'rgba(255,226,130,0)');ctx.fillStyle=w;ctx.fillRect(0,0,1280,640);}
  if(m.dim>0){
   ctx.fillStyle=`rgba(6,3,12,${m.dim*.82})`;ctx.fillRect(0,0,1280,640);
   ctx.save();ctx.translate(640,330);ctx.strokeStyle=`rgba(255,226,140,${m.dim*.38})`;for(let i=0;i<46;i++){const a=i*TAU/46+t*.15,r0=150+rnd(i)*90,r1=r0+120+rnd(i+5)*520;ctx.lineWidth=1+rnd(i+2)*2;ctx.beginPath();ctx.moveTo(Math.cos(a)*r0,Math.sin(a)*r0*.62);ctx.lineTo(Math.cos(a)*r1,Math.sin(a)*r1*.62);ctx.stroke();}ctx.restore();
  }
 }
 function mood(world){
  let dim=0,warm=0,gold=0;
  for(const f of world.fighters){const m=f.move;if(!m)continue;const d=m.def,a=m.age,e=d.startup+d.active;
   if(d.mode==='beam')dim=Math.max(dim,a<d.startup?a/d.startup:a<e?1:1-(a-e)/d.recovery);
   if(d.mode==='flame'&&a>=d.startup&&a<e+6)warm=1;
   if(d.mode==='dragon'&&a>=d.startup&&a<e)gold=1;}
  return {dim,warm,gold};
 }
 // ---------------------------------------------------------------- fighters
 function hand(x,y,angle=0){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ellipse(0,0,17,18,'#3d301e');ellipse(-1,-2,14,16,'#eab33e');ellipse(-4,-6,10,10,'#ffda6d');for(let j=-1;j<=1;j++)line([[j*6,-12],[j*6,-4]],'#c8922d',1.5);ellipse(10,3,6,10,'#f9c557');ctx.restore();}
 function sword(x,y,angle,color='#d7e6db'){ctx.save();ctx.translate(x,y);ctx.rotate(angle);line([[-7,6],[12,-8]],'#554e35',9);line([[6,-13],[18,0]],'#d6b669',5);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(13,-10);ctx.lineTo(86,-102);ctx.lineTo(93,-114);ctx.lineTo(89,-91);ctx.lineTo(22,-4);ctx.closePath();ctx.fill();line([[18,-10],[88,-106]],'#ffffff77',1.4);ctx.restore();}
 function pose(f,t){
  const m=f.move,d=m?.def,age=m?.age||0,still=reduced();
  const P={ox:0,oy:0,rot:0,sx:1,sy:1,hx:67,hy:-14,ang:-.25,lx:-58,ly:-10+(f.guard?-30:Math.sin(t*3)*3),lang:-.3,sword:true,lsword:false,active:false,glow:null,seal:false};
  if(f.guard){P.hx=36;P.hy=-63;P.ang=.65;P.sy=.97;}
  if(f.h>0){P.sy=1+Math.min(.1,Math.abs(f.vh)*.008);P.sx=1/P.sy;P.ly-=14;P.hy-=8;}
  if(S.squash[f.id]>0){const q=S.squash[f.id]/7;P.sy=1-.12*q;P.sx=1+.1*q;}
  if(f.walk&&!still)P.oy=-Math.abs(Math.sin(t*14))*3;
  if(f.stun&&!f.blocked){P.rot=-.12;P.sy=.96;if(!still&&f.stun>4)P.ox=Math.sin(t*90)*3;P.hx=40;P.hy=-30;P.lx=-45;P.ly=-35;}
  if(f.stun&&f.blocked){P.ox=-4;P.sx=1.04;}
  if(!m&&f.shield>0){P.hx=30;P.hy=-52;P.ang=0;P.lx=8;P.ly=-46;P.sword=false;P.seal=true;P.sx=1.05;P.sy=.95;if(!still)P.ox=Math.sin(t*50)*1.2;}
  if(!m)return P;
  const ph=age<d.startup?0:age<d.startup+d.active?1:2,w=Math.min(1,age/d.startup),p=clamp((age-d.startup)/d.active,0,1),r=clamp((age-d.startup-d.active)/d.recovery,0,1),pe=ease(p),sp=Math.sin(p*Math.PI),re=1-ease(r);
  P.active=ph===1;P.sword=!['punch','rock','yoyo','blink','throw','beam'].includes(d.mode);
  P.ox=ph===0?-w*9:ph===1?-9+pe*30:21*re;P.rot=ph===0?-w*.1:ph===1?-.1+pe*.2:.1*re;P.sy=1-(ph===0?w*.05:0);
  // generic sweep: wind-up, slash, recover
  if(ph===0){P.hx=50-w*23;P.hy=-20-w*28;P.ang=-1.2*w;P.lx=-58+w*8;}
  else if(ph===1){P.hx=55+sp*58;P.hy=-38+sp*30;P.ang=-.4+sp*2.4;}
  else{P.hx=90-23*r;P.hy=-10-8*re;P.ang=1.3*(1-r)-.25*r;}
  switch(d.mode){
   case 'punch':
    if(ph===0){P.hx=62-w*30;P.hy=-18;P.ang=0;}else if(ph===1){P.hx=32+pe*95;P.hy=-18;P.ang=0;P.lx=-58-pe*14;}else{P.hx=127-r*60;P.hy=-18+r*4;P.ang=0;}
    break;
   case 'slash':
    if(ph===0){P.hx=44-w*26;P.hy=-24-w*66;P.ang=-1.4*w;}else if(ph===1){P.hx=18+pe*80;P.hy=-90+pe*76;P.ang=-1.4+pe*2.9;}else{P.hx=98-r*30;P.hy=-14;P.ang=1.5-r*1.75;}
    break;
   case 'cross':
    P.lsword=true;
    if(ph===0){P.lx=-30+w*20;P.ly=-20-w*30;}else if(ph===1){P.lx=20+sp*40;P.ly=-70+pe*50;}else{P.lx=-58+(1-r)*60;P.ly=-10;}
    P.sx=1+(ph===1?.08*sp:0);
    break;
   case 'flame':
    if(ph===1){const seg=((age-d.startup)%8)/8;P.hx=62+Math.sin(seg*Math.PI)*40;P.hy=-62+seg*52;P.ang=-1.35+seg*2.7;P.ox=-6+Math.sin(seg*Math.PI)*10;}
    P.glow='#ff8a2a';
    break;
   case 'dragon':
    if(ph===0){P.hx=38;P.hy=-4;P.ang=1.2;P.oy=w*14;P.sy=1-.08*w;}else if(ph===1){P.hx=40+pe*30;P.hy=-4-pe*128;P.ang=1.2-pe*1.6;P.oy=-pe*6;P.sy=1+pe*.08;P.ox=-4+pe*14;P.rot=-.05;}else{P.hx=70-r*18;P.hy=-132+r*120;P.ang=-.4+r*1.2;P.oy=0;P.rot=0;}
    P.glow='#ffd57a';
    break;
   case 'yoyo':
    if(ph===0){P.hx=62-w*35;P.hy=-14-w*30;P.ang=-.5*w;}else if(ph===1){P.hx=30+pe*80;P.hy=-44;P.ang=.2;P.lx=-58-pe*10;}else{P.hx=110-r*45;P.hy=-44+r*30;P.ang=.2-r*.3;}
    break;
   case 'blink':
    P.hx=67-w*30;P.hy=-14-w*30;P.lx=-58+w*80;P.ly=-10-w*26;P.ang=0;P.lang=0;P.seal=true;P.sx=ph===0?1-.08*w:1.12-r*.12;P.sy=ph===0?1+.06*w:1;
    if(ph>0){P.hx=37;P.hy=-44;P.lx=22;P.ly=-36;}
    break;
   case 'rock':
    P.hx=67-w*37;P.hy=-14-w*38;P.lx=-58+w*70;P.ly=-10-w*38;P.ang=0;P.sx=1+.05*w;P.sy=1-.05*w;if(!reduced())P.ox=Math.sin(t*60)*1.5;P.seal=true;
    break;
   case 'throw':
    if(ph===0){P.hx=62-w*20;P.hy=-14-w*20;P.lx=-58+w*50;P.ly=-10-w*10;P.ang=0;}else if(ph===1){P.hx=60+pe*50;P.hy=-24;P.lx=45+pe*55;P.ly=-4;P.ang=0;}else{P.hx=110-r*43;P.hy=-24+r*10;P.lx=100-r*158;P.ly=-4;P.ang=0;}
    break;
   case 'beam':
    if(ph===0){P.hx=60-w*40;P.hy=-14-w*105;P.lx=-58+w*40;P.ly=-10-w*110;P.ang=-.2*w;P.lang=.2*w;P.ox=Math.sin(t*80)*w*2;P.oy=-w*6;P.sy=1+.04*w;}
    else if(ph===1){P.hx=20+pe*55;P.hy=-119+pe*75;P.lx=-18+pe*65;P.ly=-120+pe*85;P.ang=.9*pe;P.ox=-12+pe*0;P.rot=.12;}
    else{P.hx=75-r*8;P.hy=-44+r*30;P.lx=47-r*105;P.ly=-35+r*25;P.ang=.9*(1-r);}
    P.glow='#ffd96a';
    break;
  }
  return P;
 }
 function shield(f,t){
  if(f.shield<=0)return;const y=GROUND-f.h-20-60,a=f.shield<24?(Math.sin(f.shield*1.4)>0?.9:.25):1;
  ctx.save();ctx.translate(f.x,y);ctx.globalAlpha=a;
  const g=ctx.createRadialGradient(0,0,40,0,0,110);g.addColorStop(0,'rgba(120,230,200,0)');g.addColorStop(1,'rgba(120,230,200,.3)');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,88,110,0,0,TAU);ctx.fill();
  ctx.strokeStyle='#9ae6cc';ctx.lineWidth=2;ctx.setLineDash([10,8]);ctx.lineDashOffset=-t*30;ctx.beginPath();ctx.ellipse(0,0,86,108,0,0,TAU);ctx.stroke();ctx.setLineDash([]);
  for(let i=0;i<6;i++){const ang=t*1.3+i*TAU/6,x=Math.cos(ang)*88,yy=Math.sin(ang)*110;ctx.save();ctx.translate(x,yy);ctx.rotate(ang*2);ctx.fillStyle='#4e6f66';ctx.strokeStyle='#bff3df';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-12,-6);ctx.lineTo(-3,-14);ctx.lineTo(11,-8);ctx.lineTo(13,6);ctx.lineTo(2,13);ctx.lineTo(-11,8);ctx.closePath();ctx.fill();ctx.stroke();line([[-4,-8],[0,0],[7,4]],'#bff3df88',1);ctx.restore();}
  ctx.restore();
 }
 function fighter(f,t,world,running,ghost=false,offset=0){
  const P=pose(f,t),bob=reduced()?0:Math.sin(t*3.5+f.id)*3,y=GROUND-f.h-20+bob+(f.crouch?30:0),m=f.move,d=m?.def;
  if(!ghost){
   const sc=1-f.h/700,col=f.id?'255,150,110':'255,215,120';
   const g=ctx.createRadialGradient(f.x,GROUND+5,4,f.x,GROUND+5,90*sc);g.addColorStop(0,`rgba(${col},.28)`);g.addColorStop(1,`rgba(${col},0)`);ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(f.x,GROUND+5,90*sc,14*sc,0,0,TAU);ctx.fill();
   ellipse(f.x,GROUND+4,57*sc,8,'#030c1099');
  }
  ctx.save();ctx.translate(f.x+offset,y);ctx.scale(f.face,1);if(ghost)ctx.globalAlpha=.17;else if(f.invul>0)ctx.globalAlpha=.52+Math.sin(t*40)*.25;
  ctx.rotate(f.walk*.04*f.face+P.rot);ctx.translate(P.ox,P.oy);ctx.scale(P.sx,P.sy);
  // Upper-body silhouette only: hood, shoulders, floating hands; no legs.
  ctx.fillStyle='#0a1117';ctx.strokeStyle='#46535a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-31,-29);ctx.quadraticCurveTo(-62,-13,-65,10);ctx.quadraticCurveTo(0,23,65,10);ctx.quadraticCurveTo(62,-13,31,-29);ctx.closePath();ctx.fill();ctx.stroke();
  ellipse(0,-73,55,61,'#071019');ellipse(-5,-78,49,56,'#19232d');ellipse(4,-71,46,52,'#0d1722');
  rect(-39,-92,78,39,'#a97423',14);rect(-38,-92,76,34,'#f7ce65',12);rect(-34,-89,67,9,'#ffe79b',7);
  ellipse(-16,-74,5,6.5,'#322819');ellipse(17,-74,5,6.5,'#322819');ellipse(-17,-76,1.4,1.6,'#fff1c4');ellipse(16,-76,1.4,1.6,'#fff1c4');
  ctx.fillStyle='#0b1520';ctx.beginPath();ctx.moveTo(-48,-60);ctx.quadraticCurveTo(0,-74,48,-60);ctx.lineTo(35,-32);ctx.quadraticCurveTo(0,-9,-35,-32);ctx.closePath();ctx.fill();line([[-37,-53],[0,-48],[36,-55]],'#28323d',2);line([[-33,-41],[-5,-34],[30,-43]],'#202c35',2);
  line([[-43,-101],[-15,-110],[30,-105]],'#3d4952',3);line([[-44,-96],[40,-96]],f.id?'#c18056':'#c3a462',4);
  ctx.fillStyle=f.id?'#bf805977':'#c4a36377';ctx.beginPath();ctx.moveTo(-47,-98);ctx.lineTo(-85-(P.active?18:0),-86+Math.sin(t*5)*6);ctx.lineTo(-68,-106);ctx.closePath();ctx.fill();
  if(P.glow&&!reduced()&&!ghost){ctx.shadowColor=P.glow;ctx.shadowBlur=P.active?20:8;}
  hand(P.lx,P.ly,P.lang);
  if(P.lsword)sword(P.lx,P.ly,-P.ang*.6-.3,'#a6d4ee');
  if(P.sword)sword(P.hx,P.hy,P.ang,P.active&&d.mode==='flame'?'#ffd082':P.active&&d.mode==='cross'?'#d6f0ff':'#d3ddd5');
  hand(P.hx,P.hy,P.ang*.2);
  ctx.shadowBlur=0;
  if(f.guard)line([[12,-90],[48,-114],[78,-80]],'#9ccec1aa',3);
  ctx.restore();
  if(!ghost){
   if(P.active&&P.sword){const c=Math.cos(P.ang),s=Math.sin(P.ang),tx=P.hx+93*c+114*s,ty=P.hy+93*s-114*c,tr=S.trails[f.id];if(!S.paused)tr.unshift({x:f.x+f.face*(P.ox+tx*P.sx),y:y+P.oy+ty*P.sy,life:12,color:d.color});}
   const tag=f.id?'#ce9475':'#d7c28b';rect(f.x-15,y-168,30,16,'#0a1117cc',8);text(`P${f.id+1}`,f.x,y-156,11,tag,'center');
   if(running&&world.frame-f.lastAt<95&&f.lastName&&!['掌击','拔刀'].includes(f.lastName))outlined(f.lastName,f.x,y-182,18,d?.color||'#f2e3b0','#12070c','center','sans',4);
  }
 }
 function drawTrails(){
  for(const tr of S.trails){
   for(let i=tr.length-1;i>=0;i--){if(!S.paused)tr[i].life--;if(tr[i].life<=0)tr.splice(i,1);}
   for(let i=1;i<tr.length;i++){const a=tr[i-1],b=tr[i],k=b.life/12;ctx.save();ctx.globalAlpha=k*.8;line([[a.x,a.y],[b.x,b.y]],b.color,10*k+1);ctx.globalAlpha=k;line([[a.x,a.y],[b.x,b.y]],'#ffffff',2.5*k);ctx.restore();}
  }
 }
 // ---------------------------------------------------------------- skill VFX
 function fx(f,t,world){
  const m=f.move;if(!m)return;const d=m.def,p=(m.age-d.startup)/d.active,x=f.x,y=GROUND-f.h-90,L=d.range;
  const still=reduced();
  if(m.age<d.startup){
   const w=m.age/d.startup;
   if(d.cost>0&&d.mode!=='beam'){ctx.save();ctx.translate(x+f.face*58,y+22);ctx.strokeStyle=d.color+'aa';ctx.lineWidth=2;for(let i=0;i<3;i++){const r=(1-((w+i/3)%1))*46+4;ctx.globalAlpha=.9-r/60;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.stroke();}ctx.restore();}
   if(d.mode==='blink'){ctx.save();ctx.translate(x,y+20);for(let i=0;i<3;i++){ctx.globalAlpha=.55*w;ctx.strokeStyle='#c3c4ff';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,(1-w)*90+18+i*14,(1-w)*110+26+i*16,t*3+i,0,TAU*.7);ctx.stroke();}ctx.restore();}
   if(d.mode==='beam'){
    ctx.save();ctx.translate(x+f.face*30,y-20);
    for(let i=0;i<5;i++){const r=(1-((w*1.6+i/5)%1))*160+10;ctx.strokeStyle=`rgba(255,226,130,${.8*(1-r/180)})`;ctx.lineWidth=2+w*3;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.stroke();}
    ctx.restore();
    ctx.save();ctx.globalAlpha=clamp(w*2,0,1);outlined('黑 龙 武 神',640,250+(still?0:Math.sin(t*30)*1.5),clamp(44+w*14,44,60),'#f6d680','#1a0a12','center','serif',8);outlined('蓄 力 · 吓 我 一 跳',640,292,15,'#fff1c4','#1a0a12','center','sans',4);ctx.restore();
    if(!still&&Math.random()<.7)spawn({x:x+(Math.random()-.5)*160,y:y+60,vx:0,vy:-3-Math.random()*3,life:30,kind:'dot',size:3,color:'#ffd96a'});
   }
   return;
  }
  if(p<0||p>1)return;
  ctx.save();ctx.translate(x,y);ctx.scale(f.face,1);
  const a=1-p*.55;
  if(d.mode==='punch'){ctx.globalAlpha=1-p;ctx.strokeStyle='#fff3c6';for(let i=0;i<3;i++){ctx.lineWidth=3-i*.7;ctx.beginPath();ctx.arc(110+i*12,-18,18+p*28+i*8,-.9,.9);ctx.stroke();}for(let i=0;i<4;i++)line([[60,-18+i*9-14],[104-i*6,-18+i*9-14]],'#ffffff99',2);}
  if(d.mode==='slash'){
   ctx.shadowColor=d.color;ctx.shadowBlur=still?0:20;const g=ctx.createLinearGradient(0,-90,L,60);g.addColorStop(0,'rgba(255,255,240,0)');g.addColorStop(.6,'rgba(244,236,205,.9)');g.addColorStop(1,'#ffffff');
   const head=-1.5+Math.min(1,p*1.7)*3,tail=-1.5+Math.max(0,p*1.5-.35)*3;ctx.globalAlpha=a;crescent(30,-6,L*.78,100,tail,head,34,g);
   ctx.globalAlpha=(1-p)*.9;ctx.shadowBlur=0;line([[20,-12+p*10],[L+40,-8+p*10]],'#ffffff',3);line([[40,-4],[L-10,-4]],'#ffffffaa',9);
  }
  if(d.mode==='cross'){
   ctx.shadowColor=d.color;ctx.shadowBlur=still?0:18;
   for(let i=0;i<2;i++){ctx.save();if(i)ctx.scale(1,-1);const g=ctx.createLinearGradient(0,-80,L,0);g.addColorStop(0,'rgba(180,225,255,0)');g.addColorStop(.7,'#bfe6ff');g.addColorStop(1,'#ffffff');ctx.globalAlpha=a;crescent(40,4,L*.7,86,-1.35+p*.2,1.25+p*.25,26,g);ctx.restore();}
   const k=Math.sin(Math.min(1,p*1.4)*Math.PI);ctx.globalAlpha=k;ctx.shadowBlur=0;const cx=L*.66;line([[cx-70*k,-70*k],[cx+70*k,70*k]],'#e8f8ff',5);line([[cx-70*k,70*k],[cx+70*k,-70*k]],'#e8f8ff',5);line([[cx-70*k,-70*k],[cx+70*k,70*k]],'#7fc4ee66',14);line([[cx-70*k,70*k],[cx+70*k,-70*k]],'#7fc4ee66',14);
  }
  if(d.mode==='flame'){
   const seg=Math.floor((m.age-d.startup)/8),ph=(m.age-d.startup)%8/8;
   ctx.shadowColor='#ff7a1a';ctx.shadowBlur=still?0:26;
   const g=ctx.createLinearGradient(0,-80,L,60);g.addColorStop(0,'rgba(255,90,20,0)');g.addColorStop(.5,'#ff8a2a');g.addColorStop(1,'#ffe28a');
   const dir=seg%2?-1:1;ctx.save();ctx.scale(1,dir);crescent(34,-4,L*.7,92,-1.3+ph*.5,1.1+ph*.5,34,g);ctx.restore();
   ctx.shadowBlur=0;ctx.globalAlpha=.95;
   for(let k=0;k<9;k++){const ang=(-1.2+ph*.5+k*.26)*dir,fx=34+Math.cos(ang)*L*.7,fy=-4+Math.sin(ang)*92*dir*dir,h=26+Math.sin(t*30+k*2)*10+seg*6;ctx.fillStyle=k%2?'#ffb23a':'#ff6a1f';ctx.beginPath();ctx.moveTo(fx-9,fy);ctx.quadraticCurveTo(fx-6,fy-h*.6,fx+Math.sin(t*20+k)*5,fy-h);ctx.quadraticCurveTo(fx+7,fy-h*.5,fx+9,fy);ctx.closePath();ctx.fill();}
   ctx.globalAlpha=1;if(!still)for(let k=0;k<2;k++)spawn({x:x+f.face*(40+Math.random()*L*.8),y:y+(Math.random()-.5)*150,vx:f.face*Math.random()*2,vy:-1-Math.random()*3,g:-.04,life:28,kind:'ember',size:2+Math.random()*3,color:Math.random()<.5?'#ffb23a':'#ff6a1f'});
   if(m.age===d.startup+seg*8)S.flash={life:5,max:5,color:'#ff8a2a',alpha:.18};
  }
  if(d.mode==='dragon'){
   ctx.shadowColor='#ffd57a';ctx.shadowBlur=still?0:22;
   const g=ctx.createLinearGradient(0,40,0,-210);g.addColorStop(0,'rgba(255,214,120,0)');g.addColorStop(.4,'rgba(255,214,120,.38)');g.addColorStop(1,'rgba(255,255,230,.05)');ctx.fillStyle=g;ctx.fillRect(10,-220,100,260);
   for(let j=0;j<3;j++){ctx.strokeStyle=['#fff3c0','#ffd57a','#f2a93b'][j];ctx.lineWidth=7-j*1.6;ctx.globalAlpha=a;ctx.beginPath();const top=-60-p*200;for(let yy=30;yy>=top;yy-=6){const xx=60+Math.sin(yy*.055+t*14+j*2.1)*(28+(30-yy)*.06);yy===30?ctx.moveTo(xx,yy):ctx.lineTo(xx,yy);}ctx.stroke();}
   ctx.globalAlpha=a;const hy=Math.max(-250,-60-p*200);ctx.shadowBlur=0;ctx.fillStyle='#fff3c0';ctx.beginPath();ctx.moveTo(40,hy+14);ctx.lineTo(60,hy-34);ctx.lineTo(82,hy+14);ctx.quadraticCurveTo(60,hy+30,40,hy+14);ctx.fill();ellipse(52,hy+2,3.5,5,'#7b2d1a');ellipse(68,hy+2,3.5,5,'#7b2d1a');
  }
  if(d.mode==='throw'){
   const cx=L*.78,k=ease(Math.min(1,p*1.6)),sc=.7+k*.5;
   ctx.save();ctx.translate(cx,10);ctx.scale(sc,sc);ctx.shadowColor='#d27de0';ctx.shadowBlur=still?0:26;ctx.globalAlpha=.4+.5*Math.sin(p*Math.PI);
   const open=(1-k);
   ctx.fillStyle='#2b0f3a';ctx.strokeStyle='#e6b0f0';ctx.lineWidth=3;
   for(let i=0;i<4;i++){const ang=-1.9+i*.55+open*(i-1.5)*.5,len=64+Math.sin(i*1.7)*10;ctx.save();ctx.rotate(ang+Math.PI);ctx.beginPath();ctx.roundRect(-9,0,18,len,9);ctx.fill();ctx.stroke();line([[0,len*.4],[0,len*.4+1]],'#f6d5ff',4);ctx.restore();}
   ctx.save();ctx.rotate(-.9+open*.6);ctx.beginPath();ctx.roundRect(-9,-4,18,54,9);ctx.fill();ctx.stroke();ctx.restore();
   ctx.beginPath();ctx.ellipse(0,6,40,34,0,0,TAU);ctx.fill();ctx.stroke();
   for(let i=0;i<3;i++)line([[-22+i*22,-8],[-16+i*22,12]],'#e6b0f066',2);
   ctx.restore();
   ctx.globalAlpha=.35;ellipse(cx,50,90,16,'#5a2a73');ctx.globalAlpha=1;
   if(!still&&Math.random()<.5)spawn({x:x+f.face*cx,y:y+70,vx:(Math.random()-.5)*1.5,vy:-1-Math.random()*2,life:34,kind:'dot',size:3+Math.random()*3,color:'#b86bd0'});
  }
  if(d.mode==='beam')beam(p,L,t,still);
  ctx.restore();
 }
 function beam(p,L,t,still){
  const grow=ease(Math.min(1,p*1.5)),hx=70+grow*Math.min(L,880),fade=p>.8?1-(p-.8)/.2:1;
  ctx.globalAlpha=fade;ctx.shadowColor='#f2c75c';ctx.shadowBlur=still?0:30;
  const halo=ctx.createLinearGradient(40,0,900,0);halo.addColorStop(0,'rgba(255,242,180,.85)');halo.addColorStop(.6,'rgba(197,164,103,.45)');halo.addColorStop(1,'rgba(115,81,122,0)');ctx.fillStyle=halo;ctx.beginPath();ctx.moveTo(55,-18);ctx.lineTo(hx+60,-110);ctx.lineTo(hx+60,110);ctx.lineTo(55,18);ctx.closePath();ctx.fill();
  const N=60,top=[],bot=[];
  for(let k=0;k<=N;k++){const u=k/N,xx=55+(hx-55)*u,amp=34*(1-u*.35),yy=Math.sin(u*10-t*16)*amp*Math.min(1,u*3),th=4+Math.pow(u,1.4)*34;top.push([xx,yy-th]);bot.push([xx,yy+th]);}
  ctx.beginPath();top.forEach(([xx,yy],i)=>i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy));for(let i=N;i>=0;i--)ctx.lineTo(bot[i][0],bot[i][1]);ctx.closePath();ctx.fillStyle='#0b0710';ctx.fill();ctx.strokeStyle='#f2c75c';ctx.lineWidth=3;ctx.stroke();ctx.shadowBlur=0;
  ctx.strokeStyle='#f2c75c88';ctx.lineWidth=1.5;for(let k=3;k<N;k+=3){const [x1,y1]=top[k],[x2,y2]=bot[k];ctx.beginPath();ctx.arc((x1+x2)/2,(y1+y2)/2,Math.abs(y2-y1)/2,-1.2,1.2);ctx.stroke();}
  line(top.map(([xx,yy],i)=>[xx,(yy+bot[i][1])/2]),'#f2c75c55',2);
  const [hx0,hy0]=[hx,(top[N][1]+bot[N][1])/2];
  ctx.save();ctx.translate(hx0,hy0);
  for(let i=0;i<5;i++){const a=-2.5+i*.38;ctx.fillStyle=i%2?'#f2a93b':'#ffe28a';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*60-6,Math.sin(a)*60);ctx.lineTo(Math.cos(a+.2)*34,Math.sin(a+.2)*34);ctx.closePath();ctx.fill();}
  ctx.fillStyle='#0b0710';ctx.strokeStyle='#f2c75c';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-34,-30);ctx.lineTo(48,-14);ctx.lineTo(74,-4);ctx.lineTo(14,4);ctx.lineTo(-34,34);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(14,4);ctx.lineTo(70,12);ctx.lineTo(40,24);ctx.lineTo(-20,34);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#fff';for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(18+i*14,-9+i*1.5);ctx.lineTo(23+i*14,0);ctx.lineTo(28+i*14,-8+i*1.5);ctx.fill();}
  ctx.shadowColor='#ffe27a';ctx.shadowBlur=still?0:16;ellipse(0,-12,7,5,'#ffe27a');ctx.shadowBlur=0;
  line([[-20,-30],[-62,-72],[-100,-66]],'#f2c75c',4);line([[-8,-33],[-40,-82],[-76,-92]],'#f2c75c',3);
  ctx.restore();
  ctx.strokeStyle='#fff0bc';ctx.lineWidth=2;for(let i=0;i<5;i++){ctx.globalAlpha=fade*.8;ctx.beginPath();let px=60,py=0;ctx.moveTo(px,py);for(let k=1;k<9;k++){px+=(hx-60)/8;py=(Math.sin(t*37+i*3+k*7)*70)*(.3+k/12);ctx.lineTo(px,py);}ctx.stroke();}
 }
 function projectile(p,t,world){
  const o=world.fighters[p.owner],y=GROUND-p.h,hx=o.x+o.face*58,hy=GROUND-o.h-90+8,still=reduced();
  ctx.save();ctx.strokeStyle='#e8ffc5aa';ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(hx,hy);const mx=(hx+p.x)/2,my=(hy+y)/2+Math.sin(t*20)*(still?0:6)+18;ctx.quadraticCurveTo(mx,my,p.x,y);ctx.stroke();ctx.restore();
  for(let i=3;i>=0;i--){ctx.save();ctx.translate(p.x-p.v*i*3.2,y);ctx.globalAlpha=i?.14:1;ctx.rotate(t*18);
   if(!i){ctx.shadowColor='#b7e286';ctx.shadowBlur=still?0:20;}
   ellipse(0,0,24,24,'#1e3328');ctx.strokeStyle='#c6e49a';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,22,0,TAU);ctx.stroke();
   for(let k=0;k<4;k++){ctx.save();ctx.rotate(k*Math.PI/2);ctx.fillStyle='#b7e286';ctx.beginPath();ctx.moveTo(8,-4);ctx.lineTo(32,0);ctx.lineTo(8,4);ctx.closePath();ctx.fill();ctx.restore();}
   ellipse(0,0,10,10,'#c6e49a');ellipse(0,0,5,5,'#294338');ctx.restore();}
 }
 // ---------------------------------------------------------------- feedback
 function event(e,world){
  if(e.type==='hit'){
   const big=e.damage>=15,col=e.color||'#fff0b0';
   S.bursts.push({kind:e.guarded?'guard':'hit',x:e.x,y:e.y,life:e.guarded?12:big?14:10,max:e.guarded?12:big?14:10,color:col,big,ang:Math.random()*TAU,seed:Math.random()*100});
   if(!e.guarded&&big)S.flash={life:7,max:7,color:col,alpha:.28};
   S.floats.push({x:e.x+(Math.random()-.5)*20,y:e.y-35,text:e.guarded?'防御 −'+e.damage:'−'+e.damage,life:48,max:48,color:e.guarded?'#bff0e8':big?'#ffd35a':'#fff3d0',big,guarded:e.guarded});
   const n=e.guarded?10:big?26:16;
   for(let i=0;i<n;i++){const a=Math.random()*TAU,s=2+Math.random()*(big?10:7);spawn({x:e.x,y:e.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,g:.2,life:18+Math.random()*15,color:i%3?col:'#ffffff',kind:'line'});}
  }
  if(e.type==='cast'){
   const f=world.fighters[e.fighter],d=world.fighters[e.fighter].move?.def;
   if(d?.mode==='dragon')S.bursts.push({kind:'ground',x:f.x,y:GROUND+4,life:18,max:18,color:'#ffd57a'});
   if(d?.mode==='beam')S.flash={life:10,max:10,color:'#ffe9a8',alpha:.22};
  }
  if(e.type==='blink'){
   const f=world.fighters[e.fighter],from=S.prevX[e.fighter],y=GROUND-f.h-90;
   S.bursts.push({kind:'vortex',x:from,y,life:22,max:22,color:'#b3b4ef',out:false},{kind:'vortex',x:f.x,y,life:22,max:22,color:'#d8d9ff',out:true});
   for(let i=0;i<24;i++){const a=Math.random()*TAU;spawn({x:f.x,y,vx:Math.cos(a)*4,vy:Math.sin(a)*4,life:20,color:'#c9caff',kind:'line'});}
   S.floats.push({x:f.x,y:y-90,text:'！？',life:40,max:40,color:'#e0e1ff',big:true});
  }
  if(e.type==='end')S.flash={life:16,max:16,color:'#ffffff',alpha:.5};
 }
 function drawParticles(){
  const ps=S.particles;for(let i=ps.length-1;i>=0;i--){const p=ps[i];if(!S.paused){p.x+=p.vx;p.y+=p.vy;p.vy+=p.g;p.life--;}if(p.life<=0){ps.splice(i,1);continue;}}
  for(const p of ps){const k=Math.min(1,p.life/p.max*1.6);ctx.globalAlpha=k;
   if(p.kind==='line')line([[p.x,p.y],[p.x-p.vx*1.8,p.y-p.vy*1.8]],p.color,2);
   else{ctx.shadowColor=p.color;ctx.shadowBlur=p.kind==='ember'?10:6;ellipse(p.x,p.y,p.size*(p.kind==='ember'?k:1),p.size*(p.kind==='ember'?k:1),p.color);ctx.shadowBlur=0;}}
  ctx.globalAlpha=1;
 }
 function drawBursts(){
  const bs=S.bursts;for(let i=bs.length-1;i>=0;i--){if(!S.paused)bs[i].life--;if(bs[i].life<=0)bs.splice(i,1);}
  for(const b of bs){const k=1-b.life/b.max;ctx.save();ctx.translate(b.x,b.y);
   if(b.kind==='hit'){
    const R=(b.big?80:52)*(.4+k*.9);ctx.globalAlpha=1-k*.8;ctx.fillStyle=k<.35?'#ffffff':b.color;ctx.beginPath();const n=b.big?12:9;for(let j=0;j<n*2;j++){const a=b.ang+j*Math.PI/n,r=j%2?R*.32:R*(.75+rnd(j+b.seed)*.5);ctx[j?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();
    ctx.strokeStyle='#fff';ctx.lineWidth=3*(1-k);ctx.beginPath();ctx.arc(0,0,R*1.1+k*30,0,TAU);ctx.stroke();
    ctx.rotate(b.ang);line([[-R*1.5,0],[R*1.5,0]],'#ffffffcc',3*(1-k)+1);
   }
   if(b.kind==='guard'){const R=26+k*44;ctx.globalAlpha=1-k;ctx.strokeStyle='#bff3df';ctx.lineWidth=4*(1-k)+1;ctx.beginPath();for(let j=0;j<=6;j++){const a=j*Math.PI/3+.5;ctx[j?'lineTo':'moveTo'](Math.cos(a)*R,Math.sin(a)*R);}ctx.stroke();for(let j=0;j<6;j++){const a=j*Math.PI/3+.5;line([[Math.cos(a)*R,Math.sin(a)*R],[Math.cos(a)*(R+14),Math.sin(a)*(R+14)]],'#ffffffcc',2);}}
   if(b.kind==='vortex'){ctx.globalAlpha=1-k;ctx.strokeStyle=b.color;ctx.lineWidth=4*(1-k)+1;for(let j=0;j<3;j++){const r=b.out?(k*90+j*18):(90-k*85)+j*14;ctx.beginPath();ctx.ellipse(0,0,Math.max(2,r),Math.max(2,r*1.25),k*5+j,0,TAU*.75);ctx.stroke();}}
   if(b.kind==='ground'){ctx.globalAlpha=1-k;ctx.strokeStyle=b.color;ctx.lineWidth=4*(1-k)+1;ctx.beginPath();ctx.ellipse(0,0,20+k*190,4+k*22,0,0,TAU);ctx.stroke();for(let j=-3;j<=3;j++)line([[j*10,0],[j*26*(1+k),-60*(1-k)*(1-Math.abs(j)/4)]],b.color,2);}
   ctx.restore();}
 }
 function drawFloats(){
  const fs=S.floats;for(let i=fs.length-1;i>=0;i--){if(!S.paused){fs[i].y-=.7;fs[i].life--;}if(fs[i].life<=0)fs.splice(i,1);}
  for(const f of fs){const age=f.max-f.life,pop=age<8?1+(8-age)*.08:1;ctx.save();ctx.globalAlpha=Math.min(1,f.life/15);ctx.translate(f.x,f.y);ctx.scale(pop,pop);outlined(f.text,0,0,f.big?32:22,f.color,'#12070c','center','sans',5);ctx.restore();}
 }
 function drawFlash(){const fl=S.flash;if(!fl)return;if(!S.paused)fl.life--;if(fl.life<=0){S.flash=null;return;}ctx.globalAlpha=fl.alpha*fl.life/fl.max;ctx.fillStyle=fl.color;ctx.fillRect(0,0,1280,640);ctx.globalAlpha=1;}
 function track(world){
  const sq=S.squash;for(const f of world.fighters){if(!S.paused){if(S.prevH[f.id]>0&&f.h===0)sq[f.id]=7;sq[f.id]=Math.max(0,sq[f.id]-1);}S.prevH[f.id]=f.h;S.prevX[f.id]=f.x;}
 }
 function reset(){S.particles=[];S.floats=[];S.bursts=[];S.flash=null;S.trails=[[],[]];S.squash=[0,0];S.ghost=[{hp:100,en:0},{hp:100,en:0}];}
 // ---------------------------------------------------------------- HUD
 function bar(x,y,w,h,sk,id,frac,ghost,grad,bg){
  const path=()=>{ctx.beginPath();ctx.moveTo(x+sk,y);ctx.lineTo(x+w+sk,y);ctx.lineTo(x+w-sk,y+h);ctx.lineTo(x-sk,y+h);ctx.closePath();};
  path();ctx.fillStyle=bg;ctx.fill();ctx.save();path();ctx.clip();
  const fw=Math.max(0,w+sk*2)*frac,gw=Math.max(0,w+sk*2)*ghost,x0=x-sk,right=id===1;
  if(gw>fw){ctx.fillStyle='#fff4d6cc';ctx.fillRect(right?x0+w+sk*2-gw:x0,y,gw,h);}
  ctx.fillStyle=grad;ctx.fillRect(right?x0+w+sk*2-fw:x0,y,fw,h);
  ctx.fillStyle='rgba(255,255,255,.28)';ctx.fillRect(x0,y,w+sk*2,h*.35);
  ctx.restore();path();ctx.strokeStyle='#0a0508';ctx.lineWidth=2.5;ctx.stroke();
 }
 function badge(cx,cy,id,t){
  ctx.save();ctx.translate(cx,cy);ctx.fillStyle='#0a0508';ctx.beginPath();ctx.arc(0,0,27,0,TAU);ctx.fill();ctx.strokeStyle=id?'#e0785a':'#e8c96a';ctx.lineWidth=3;ctx.stroke();
  ctx.save();ctx.beginPath();ctx.arc(0,0,23,0,TAU);ctx.clip();ellipse(0,-2,23,23,'#0d1722');rect(-15,-12,30,16,'#f7ce65',6);ellipse(-5,-4,2,3,'#322819');ellipse(6,-4,2,3,'#322819');ellipse(0,18,26,12,'#0b1520');line([[-16,-14],[16,-14]],id?'#c18056':'#c3a462',2.5);ctx.restore();
  ctx.restore();
 }
 function hud(world,running,modes,debug,t){
  const sk=9,bw=364,y=44,[A,B]=world.fighters;
  if(world.frame<2)S.ghost.forEach((g,i)=>{g.hp=world.fighters[i].hp;});
  for(const f of world.fighters){
   const id=f.id,right=id===1,x=right?1280-41-27*2-bw-12+0:41+27*2+12,g=S.ghost[id];
   if(!S.paused)g.hp=Math.max(f.hp,g.hp-.35);
   const low=f.hp<30,pulse=low?.6+.4*Math.sin(t*10):1,hpGrad=ctx.createLinearGradient(0,y,0,y+18);
   if(low){hpGrad.addColorStop(0,'#ff8c6a');hpGrad.addColorStop(1,`rgba(214,60,50,${pulse})`);}else if(right){hpGrad.addColorStop(0,'#ffb08a');hpGrad.addColorStop(1,'#e0624a');}else{hpGrad.addColorStop(0,'#fff09a');hpGrad.addColorStop(1,'#f0a53a');}
   badge(right?1239-0:41+0+27,y+10,id,t);
   const bx=right?1239-27*2-12-bw:41+27*2+12;
   bar(bx,y,bw,18,sk,id,f.hp/100,g.hp/100,hpGrad,'#1a0d14ee');
   const en=f.energy/100,ready=f.energy>=90,eg=ctx.createLinearGradient(0,y+26,0,y+34);if(ready){eg.addColorStop(0,'#fff0a0');eg.addColorStop(1,'#f2b43a');}else if(right){eg.addColorStop(0,'#ffa8d0');eg.addColorStop(1,'#bf4f90');}else{eg.addColorStop(0,'#9af0e0');eg.addColorStop(1,'#3fa8b8');}
   bar(bx+2,y+26,bw-4,8,sk*.5,id,en,en,eg,'#120a10ee');
   ctx.fillStyle='#00000066';for(let i=1;i<10;i++){const xx=bx+2+(bw-4)*i/10;ctx.fillRect(xx,y+26,1,8);}
   if(ready&&running){ctx.save();ctx.globalAlpha=.55+.45*Math.sin(t*8);outlined('黑龙武神 READY',right?bx+bw:bx,y+58,12,'#ffe27a','#12070c',right?'right':'left','sans',3);ctx.restore();}
   else text(`蕾克拉 ${Math.floor(f.energy)}`,right?bx+bw:bx,y+54,11,'#cfc2b4',right?'right':'left');
   const label=id?'贰 · 二号忍者':'壹 · 一号忍者';outlined(label,right?bx+bw:bx,y-9,15,'#f4ead0','#0a0508',right?'right':'left','sans',4);
   const mv=f.move,state=f.stun?'受击硬直':mv?(mv.age<mv.def.startup?'前摇':mv.age<mv.def.startup+mv.def.active?'生效':'后摇'):f.guard?'防御':f.shield?'护盾':f.h?'腾空':'就绪';
   text((running?(modes[id]==='human'?'PLAYER':modes[id]==='ai'?'CPU':'DUMMY'):'READY')+' · '+state,right?bx:bx+bw,y+54,11,mv?.def.color||'#b7aaa0',right?'left':'right');
   if(f.combo>1&&world.frame<f.comboUntil){const age=65-(f.comboUntil-world.frame),pop=age<8?1+(8-age)*.06:1;ctx.save();ctx.translate(right?1160:120,224);ctx.scale(pop,pop);outlined(f.combo+' HIT',0,0,36,'#ffd35a','#2a0c10',right?'right':'left','sans',6);ctx.restore();}
  }
  // Timer seal
  const secs=Math.ceil(world.time/60),hot=secs<=10&&running,pop=hot&&!reduced()?1+.05*Math.abs(Math.sin(t*6)):1;
  ctx.save();ctx.translate(640,56);ctx.scale(pop,pop);ctx.fillStyle='#0a0508';ctx.beginPath();ctx.arc(0,0,36,0,TAU);ctx.fill();ctx.strokeStyle=hot?'#ff5a4a':'#e8c96a';ctx.lineWidth=4;ctx.stroke();ctx.strokeStyle='#ffffff22';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,30,0,TAU);ctx.stroke();
  ctx.strokeStyle=hot?'#ff9a8a':'#fff0b0';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,41,-Math.PI/2,-Math.PI/2+TAU*clamp(world.time/(99*60),0,1));ctx.stroke();
  text(String(secs).padStart(2,'0'),0,13,38,hot?'#ffb0a0':'#f6e3b0','center','serif');ctx.restore();
  text('一局定胜负',640,112,10,'#d6c9b8','center');
  text(debug?'DEBUG / HITBOX ON':'LEX NINJA • LOCAL ARENA',640,626,9,'#ffffff55','center');
 }
 function intro(n){
  const stage=n>60?0:1,k=stage?60-n:120-n,pop=1+Math.max(0,8-k)*.09,a=Math.min(1,k/6)*(n<12?n/12:1),msg=stage?'释 放 忍 术':'准 备';
  ctx.save();ctx.globalAlpha=a;ctx.translate(640,300);ctx.rotate(-.05);
  ctx.fillStyle='#b8261f';ctx.beginPath();ctx.moveTo(-330,-62);ctx.lineTo(310,-70);ctx.lineTo(340,-30);ctx.lineTo(320,52);ctx.lineTo(-310,60);ctx.lineTo(-344,-6);ctx.closePath();ctx.fill();ctx.strokeStyle='#2a0a0e';ctx.lineWidth=4;ctx.stroke();
  ctx.scale(pop,pop);outlined(msg,0,22,stage?64:52,'#ffe9a8','#2a0a0e','center','serif',9);ctx.restore();
  ctx.save();ctx.globalAlpha=a;text('ROUND 1',640,376,13,'#f2e6c4','center');ctx.restore();
 }
 function debug(world){
  for(const f of world.fighters){ctx.strokeStyle='#73e4ba';ctx.lineWidth=1;ctx.strokeRect(f.x-48,GROUND-f.h-145,96,145);const m=f.move;if(m&&m.age>=m.def.startup&&m.age<m.def.startup+m.def.active){ctx.strokeStyle='#ff7777';const x0=f.face>0?f.x-30:f.x-m.def.range;ctx.strokeRect(x0,GROUND-f.h-145,m.def.range+30,145);}}
  ctx.strokeStyle='#ffd35a';for(const p of world.projectiles){ctx.beginPath();ctx.arc(p.x,GROUND-p.h,55,0,TAU);ctx.stroke();}
 }
 function update(paused){S.paused=paused;}
 return {backdrop,mood,fighter,shield,fx,projectile,drawTrails,drawParticles,drawBursts,drawFloats,drawFlash,hud,intro,debug,event,track,reset,update,beamShake:world=>world.fighters.some(f=>f.move?.def.mode==='beam'&&f.move.age>=f.move.def.startup&&f.move.age<f.move.def.startup+f.move.def.active)};
}
root.LexArt={create};
})(typeof globalThis!=='undefined'?globalThis:this);
