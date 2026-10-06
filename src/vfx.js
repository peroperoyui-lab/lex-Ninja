/* Skill VFX and hit feedback only. Render-only; never touches combat state. */
(function(root){
'use strict';
const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),ease=x=>x*x*(3-2*x),rnd=i=>{const s=Math.sin(i*127.1+311.7)*43758.5453;return s-Math.floor(s);};
const SANS="'Microsoft YaHei','Noto Sans CJK SC',sans-serif";
function create(ctx,opt){
 const {GROUND,reduced}=opt;
 const S={particles:[],floats:[],bursts:[],flash:null,prevX:[0,0],paused:false};
 const line=(pts,col,w=2)=>{ctx.strokeStyle=col;ctx.lineWidth=w;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();};
 const ellipse=(x,y,rx,ry,col)=>{ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fill();};
 function outlined(s,x,y,size,fill,stroke='#12070c',align='center',font='serif',sw=5){ctx.font=`900 ${size}px ${font==='serif'?"'STKaiti','KaiTi',serif":SANS}`;ctx.textAlign=align;ctx.lineJoin='round';ctx.lineWidth=sw;ctx.strokeStyle=stroke;ctx.strokeText(s,x,y);ctx.fillStyle=fill;ctx.fillText(s,x,y);}
 function crescent(cx,cy,rx,ry,a0,a1,thick,fill){
  const N=22;ctx.beginPath();
  for(let k=0;k<=N;k++){const a=a0+(a1-a0)*k/N;ctx[k?'lineTo':'moveTo'](cx+Math.cos(a)*rx,cy+Math.sin(a)*ry);}
  for(let k=N;k>=0;k--){const a=a0+(a1-a0)*k/N,th=Math.sin(k/N*Math.PI)*thick;ctx.lineTo(cx+Math.cos(a)*(rx-th),cy+Math.sin(a)*(ry-th*1.15));}
  ctx.closePath();ctx.fillStyle=fill;ctx.fill();
 }
 function spawn(p){if(S.paused||S.particles.length>600)return;S.particles.push(Object.assign({vx:0,vy:0,g:0,life:20,size:2,kind:'line',color:'#fff'},p,{max:p.life||20}));}
 function update(paused){S.paused=paused;}
// ---------------------------------------------------------------- skill VFX
 function fx(f,t,world){
  const m=f.move;if(!m)return;const d=m.def,p=(m.age-d.startup)/d.active,x=f.x,y=GROUND-f.h-90,L=d.range;
  const still=reduced();
  if(m.age<d.startup){
   const w=m.age/d.startup;
   if(d.cost>0&&d.mode!=='beam'){ctx.save();ctx.translate(x+f.face*58,y+22);ctx.strokeStyle=d.color+'aa';ctx.lineWidth=2;for(let i=0;i<3;i++){const r=(1-((w+i/3)%1))*46+4;ctx.globalAlpha=.9-r/60;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.stroke();}ctx.restore();}
   if(d.mode==='blink'){ctx.save();ctx.translate(x,y+20);for(let i=0;i<3;i++){ctx.globalAlpha=.55*w;ctx.strokeStyle='#c3c4ff';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,(1-w)*90+18+i*14,(1-w)*110+26+i*16,t*3+i,0,TAU*.7);ctx.stroke();}ctx.restore();}
   if(d.mode==='beam'){
    ctx.fillStyle=`rgba(7,10,20,${.3*w})`;ctx.fillRect(0,0,1280,640);
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
 function drawFlash(){const fl=S.flash;if(!fl||S.paused)return;if(!S.paused)fl.life--;if(fl.life<=0){S.flash=null;return;}ctx.globalAlpha=fl.alpha*fl.life/fl.max;ctx.fillStyle=fl.color;ctx.fillRect(0,0,1280,640);ctx.globalAlpha=1;}
 function track(world){for(const f of world.fighters)S.prevX[f.id]=f.x;}
 function reset(){S.particles=[];S.floats=[];S.bursts=[];S.flash=null;}
  return {fx,projectile,drawBursts,drawParticles,drawFloats,drawFlash,event,track,reset,update};
}
root.LexVfx={create};
})(typeof globalThis!=='undefined'?globalThis:this);
