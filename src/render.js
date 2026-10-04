/* Original canvas artwork: shaded emoji bust + detached hands, not a full-body rig. */
(function(root){
'use strict';
const {GROUND,clamp}=LexCombat,W=1280,H=720,TAU=Math.PI*2;
const font="'Microsoft YaHei','Noto Sans CJK SC',sans-serif";
const brush="'STKaiti','KaiTi','AR PL KaitiM GB','Noto Serif CJK SC',serif";
function ellipse(c,x,y,rx,ry,fill){c.fillStyle=fill;c.beginPath();c.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,TAU);c.fill();}
function line(c,points,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.stroke();}
function poly(c,points,fill,stroke=null,width=1){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function rect(c,x,y,w,h,fill,r=0){if(w<=0||h<=0)return;c.fillStyle=fill;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function text(c,s,x,y,size,color='#fff',align='left',family=font,weight=800){c.fillStyle=color;c.font=`${weight} ${size}px ${family}`;c.textAlign=align;c.textBaseline='alphabetic';c.fillText(s,x,y);}
function strokeText(c,s,x,y,size,color,align='left',family=font){c.font=`italic 900 ${size}px ${family}`;c.textAlign=align;c.textBaseline='alphabetic';c.lineJoin='round';c.lineWidth=6;c.strokeStyle='#08101e';c.strokeText(s,x,y);c.fillStyle=color;c.fillText(s,x,y);}
function grad(c,x0,y0,x1,y1,stops){const g=c.createLinearGradient(x0,y0,x1,y1);stops.forEach(([s,k])=>g.addColorStop(s,k));return g;}
function sword(c,x,y,a,fire=false,size=1){
 c.save();c.translate(x,y);c.rotate(a);c.scale(size,size);
 poly(c,[[-4,-5],[-6,-115],[0,-138],[6,-116],[5,-5]],grad(c,-7,0,7,0,[[0,'#788ca5'],[.4,'#f0ffff'],[.55,fire?'#fff5a9':'#fff'],[1,'#b5d1e6']]),'#59657e',1.5);
 line(c,[[0,-129],[0,-15]],'#fff',1.5);rect(c,-17,-7,34,6,fire?'#ef9231':'#bfa56e',2);rect(c,-5,0,10,29,'#131d2d',2);
 for(let i=0;i<5;i++)line(c,[[-5,3+i*5],[5,8+i*5]],'#a09979',2);ellipse(c,0,28,6,3,'#c9a865');c.restore();
}
function hand(c,x,y,a=0,open=false){
 c.save();c.translate(x,y);c.rotate(a);c.lineWidth=1.5;c.strokeStyle='#bd7a10';
 const g=grad(c,-16,-20,19,18,[[0,'#fff1a5'],[.32,'#ffdc63'],[.75,'#eeb531'],[1,'#cc8b16']]);
 if(open){
  for(let i=0;i<4;i++){const px=-13+i*8,top=-32+(i===1?-4:i===2?-2:4);c.fillStyle=g;c.beginPath();c.roundRect(px,top,8,33,5);c.fill();c.stroke();}
  ellipse(c,1,1,20,22,g);ellipse(c,-19,3,8,15,g);line(c,[[-9,0],[0,7],[9,4]],'#cc972c',1.5);
 }else{
  rect(c,-19,-13,36,29,g,10);for(let i=0;i<4;i++){rect(c,-18+i*8,-16,10,18,g,5);line(c,[[-10+i*8,-11],[-10+i*8,-2]],'#d4a337',1);}
  ellipse(c,12,10,11,8,g);line(c,[[-12,11],[3,15],[9,11]],'#c59227',1.2);
 }
 ellipse(c,-8,-8,5,3,'#fff6bf99');c.restore();
}
function ninja(c,x,y,scale=1,face=1,pose={},t=0,accent='#58d6e8'){
 const d=pose.move?.def,age=pose.move?.age||0,active=d&&age>=d.startup&&age<d.startup+d.active;
 const wind=d?clamp(age/d.startup,0,1):0;
 let tilt=pose.stun&&!pose.blocked?-.15:pose.walk?.05:0;
 if(active&&d?.mode==='slash')tilt=.16;
 c.save();c.translate(x,y+(pose.crouch?23:0)+Math.sin(t*3.4)*2);c.scale(scale*face,scale);c.rotate(tilt);
 // Back scabbard and wrapped grip.
 c.save();c.translate(-39,-38);c.rotate(-.39);rect(c,-8,-135,16,133,'#141e2c',4);rect(c,-7,-179,14,48,'#4d626b',3);for(let i=0;i<5;i++)poly(c,[[-7,-174+i*8],[0,-169+i*8],[7,-174+i*8],[0,-178+i*8]],'#192637');rect(c,-17,-133,34,6,'#7a9297',2);c.restore();
 // Broad shoulders taper into a cropped bust; the mask is the dominant shape.
 let g=grad(c,-74,-40,70,30,[[0,'#4f5864'],[.28,'#262f3b'],[.72,'#101925'],[1,'#080f18']]);
 c.beginPath();c.moveTo(-34,-55);c.bezierCurveTo(-61,-39,-80,-19,-80,13);c.quadraticCurveTo(0,28,80,13);c.bezierCurveTo(77,-18,56,-39,33,-55);c.closePath();c.fillStyle=g;c.fill();c.strokeStyle='#71808966';c.lineWidth=1.3;c.stroke();
 poly(c,[[-62,-22],[-32,-46],[30,15],[7,21]],'#3f4c58');poly(c,[[43,-41],[66,-19],[17,21],[-2,18]],'#151f2c');line(c,[[-63,-24],[6,20]],'#82909655',2);line(c,[[47,-35],[13,12]],'#66758166',3);
 line(c,[[-69,5],[-55,-7]],'#1a2330',4);line(c,[[57,4],[48,-8]],'#0c1421',5);
 // Soft-lit hood; no coloured headband, no exposed lower face.
 const hood=c.createRadialGradient(-26,-160,3,-2,-105,98);hood.addColorStop(0,'#67717b');hood.addColorStop(.38,'#343f4a');hood.addColorStop(.72,'#202a35');hood.addColorStop(1,'#0d1722');
 c.beginPath();c.moveTo(0,-181);c.bezierCurveTo(-49,-181,-64,-151,-63,-101);c.bezierCurveTo(-62,-51,-41,-34,0,-29);c.bezierCurveTo(43,-36,65,-60,63,-107);c.bezierCurveTo(64,-158,47,-181,0,-181);c.closePath();c.fillStyle=hood;c.fill();c.strokeStyle='#86909a66';c.lineWidth=1.3;c.stroke();
 c.beginPath();c.moveTo(-44,-156);c.bezierCurveTo(-59,-99,-49,-75,-36,-53);c.strokeStyle='#80909a22';c.lineWidth=5;c.stroke();
 c.beginPath();c.moveTo(39,-166);c.bezierCurveTo(54,-126,58,-96,44,-65);c.strokeStyle='#07101b66';c.lineWidth=6;c.stroke();
 line(c,[[-17,-173],[-18,-158],[-18,-146]],'#a8b1b515',2);
 // Golden face aperture: round glossy eyes supply the classic emoji expression.
 c.beginPath();c.moveTo(-43,-126);c.quadraticCurveTo(0,-144,44,-126);c.quadraticCurveTo(47,-108,37,-95);c.quadraticCurveTo(0,-83,-39,-96);c.quadraticCurveTo(-48,-108,-43,-126);c.closePath();
 c.fillStyle=grad(c,0,-137,0,-88,[[0,'#fbd46b'],[.28,'#ffe778'],[.65,'#f6bf28'],[1,'#d98c04']]);c.fill();c.strokeStyle='#b2823a';c.lineWidth=2;c.stroke();
 for(const ex of [-22,22]){
  ellipse(c,ex,-115,13.6,14.2,'#fff5be');ellipse(c,ex+2.0,-114,9.6,11.8,'#704312');ellipse(c,ex+2.6,-114,7.3,9.7,'#120e0b');ellipse(c,ex-1.2,-121,4,4.7,'#fff');ellipse(c,ex+7,-111,1.8,2,'#ffecb1');
  c.beginPath();c.ellipse(ex,-116,14,14,0,Math.PI,TAU);c.strokeStyle='#ac772780';c.lineWidth=2;c.stroke();
 }
 if(pose.stun&&!pose.blocked){line(c,[[-33,-120],[-12,-114]],'#513812',4);line(c,[[14,-114],[35,-120]],'#513812',4);}
 // Raised centre of mask covers the nose and closes the aperture.
 c.beginPath();c.moveTo(-54,-104);c.bezierCurveTo(-38,-88,-13,-110,0,-106);c.bezierCurveTo(17,-105,34,-88,54,-103);c.bezierCurveTo(55,-66,31,-38,0,-32);c.bezierCurveTo(-32,-40,-54,-64,-54,-104);c.closePath();c.fillStyle=grad(c,-28,-100,36,-32,[[0,'#42505b'],[.4,'#273440'],[1,'#14202c']]);c.fill();
 c.beginPath();c.moveTo(-43,-78);c.quadraticCurveTo(-3,-51,39,-80);c.strokeStyle='#6a7b8744';c.lineWidth=2;c.stroke();c.beginPath();c.moveTo(-34,-64);c.quadraticCurveTo(0,-44,30,-63);c.strokeStyle='#131c2888';c.lineWidth=3;c.stroke();
 // Seat colour is a small lapel pin, not a different ninja costume.
 poly(c,[[55,-4],[64,2],[57,10],[49,2]],accent,'#a9dee533',1);
 let hx=81,hy=-43,a=.46,backx=-77,backy=-32;
 if(pose.guard){hx=36;hy=-98;a=.8;backx=-38;backy=-94;}
 if(d){
  if(age<d.startup){hx=59-wind*18;hy=-44-wind*35;a=-.72-wind*.8;}
  else if(active){const p=(age-d.startup)/d.active,q=d.mode==='flame'||d.mode==='cross'?((age-d.startup)%8)/8:p;hx=76+Math.sin(q*Math.PI)*45;hy=-67+Math.sin(q*Math.PI)*35;a=-.9+q*2.8;backx=-58;backy=-42;}
  else{const p=clamp((age-d.startup-d.active)/d.recovery,0,1);hx=114-33*p;hy=-27-16*p;a=1.7-1.24*p;}
  if(d.mode==='beam'){hx=78;hy=-94;a=.1;backx=43;backy=-66;}
  if(d.mode==='rock'){hx=32;hy=-90;backx=-32;backy=-90;}
  if(d.mode==='punch'&&active){hx=133;hy=d.id==='light2'?-68:-74;a=0;}
  if(d.mode==='throw'&&active){hx=124;hy=-90;backx=77;backy=-43;}
 }
 hand(c,backx,backy,-.25,pose.guard||d?.mode==='beam');
 if(!d||['slash','cross','flame','dragon'].includes(d.mode))sword(c,hx,hy,a,active&&d.mode==='flame');
 hand(c,hx,hy,a*.2,pose.guard||['throw','beam','rock'].includes(d?.mode));
 c.restore();
}
function roof(c,x,y,s,color){c.save();c.translate(x,y);c.scale(s,s);poly(c,[[-110,5],[-75,-7],[0,-45],[74,-7],[110,5],[67,2],[0,-27],[-67,2]],color);rect(c,-69,2,138,6,color);c.restore();}
function gate(c,x,y,s,alpha=1){c.save();c.translate(x,y);c.scale(s,s);c.globalAlpha=alpha;rect(c,-113,-5,16,183,'#452927');rect(c,97,-5,16,183,'#452927');rect(c,-118,160,25,17,'#171e2b');rect(c,93,160,25,17,'#171e2b');roof(c,0,-14,1.45,'#111b2c');rect(c,-135,-8,270,15,'#6d3030');rect(c,-101,22,202,11,'#281f28');for(const p of [-80,80]){line(c,[[p,31],[p,56]],'#d69357',2);ellipse(c,p,69,10,15,'#e69350');line(c,[[p,84],[p,96]],'#dcad6c',1);}c.restore();}
class Renderer{
 constructor(canvas){this.canvas=canvas;this.c=canvas.getContext('2d');this.dpr=Math.min(root.devicePixelRatio||1,2);canvas.width=W*this.dpr;canvas.height=H*this.dpr;this.parts=[];this.rings=[];this.labels=[];this.shake=0;this.flash=0;this.trails=[];this.shownHP=[100,100];this.back=document.createElement('canvas');this.back.width=W;this.back.height=H;this.makeBackdrop(this.back.getContext('2d'));}
 makeBackdrop(c){
  rect(c,0,0,W,H,grad(c,0,0,0,H,[[0,'#080f21'],[.47,'#283248'],[.76,'#9b605a'],[1,'#171b2a']]));
  const halo=c.createRadialGradient(825,227,20,825,227,260);halo.addColorStop(0,'#ffe6a91e');halo.addColorStop(.5,'#ffc8aa10');halo.addColorStop(1,'#d8899c00');rect(c,515,0,620,520,halo);ellipse(c,825,222,83,83,'#eddcba');ellipse(c,855,206,22,16,'#c4bcb140');ellipse(c,793,242,18,12,'#c4bcb136');
  for(let layer=0;layer<3;layer++){const pts=[[0,570]],base=430+layer*42;for(let x=-50;x<=1380;x+=47){const y=base-(Math.sin(x*.007+layer*1.9)+Math.sin(x*.016+layer)*.38)*61-layer*7;pts.push([x,y]);}pts.push([W,590]);poly(c,pts,['#273349','#263041','#202739'][layer]);}
  // Temple silhouette and soft horizon; all artwork is local and reproducible.
  for(let i=0;i<3;i++){rect(c,635+i*11,362-i*43,72-i*13,44,'#202536');roof(c,670,353-i*43,.62-i*.12,'#1d2435');}
  gate(c,177,349,1.05,.84);gate(c,1109,386,.72,.74);
  for(let x=-20;x<W+20;x+=92){rect(c,x,501,5,45,'#1b2231');rect(c,x,513,95,5,'#1b2231');}
  const mist=grad(c,0,436,0,574,[[0,'#eac6ad00'],[.4,'#d7aa9544'],[1,'#131d2b00']]);rect(c,0,429,W,157,mist);
  poly(c,[[0,563],[1280,563],[1280,720],[0,720]],grad(c,0,562,0,720,[[0,'#4d4b53'],[.14,'#383641'],[1,'#111623']]));
  line(c,[[0,563],[1280,563]],'#d4bfb073',3);line(c,[[0,571],[1280,571]],'#0b1420',4);
  for(const y of [594,632,699])line(c,[[0,y],[W,y]],'#9090941c',1);
  for(let i=-5;i<18;i++){const x=i*105;line(c,[[640+(x-640)*.8,574],[x,720]],'#030c1744',2);}
  for(const pts of [[[136,595],[171,603],[168,618],[214,629]],[[1014,572],[993,593],[1000,606],[954,629]],[[691,678],[713,651],[724,637]]])line(c,pts,'#0c131d99',2);
  rect(c,0,0,W,160,grad(c,0,0,0,160,[[0,'#040914aa'],[1,'#04091400']]));
 }
 reset(){this.parts=[];this.rings=[];this.labels=[];this.trails=[];this.shake=0;this.flash=0;this.shownHP=[100,100];}
 event(e){
  if(e.type==='hit'){
   const color=e.parry?'#bffaff':e.guarded?'#80bce5':e.color;this.shake=Math.max(this.shake,e.guarded?3:e.id==='ultimate'?17:e.id==='light'?6:11);if(!e.guarded)this.flash=Math.max(this.flash,e.id==='ultimate'?.11:.04);
   this.rings.push({x:e.x,y:e.y,r:8,life:.32,total:.32,color});
   for(let i=0;i<(e.guarded?13:30);i++){const a=Math.random()*TAU,s=70+Math.random()*490;this.parts.push({x:e.x,y:e.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.18+Math.random()*.3,total:.48,color,w:i<5?5:2});}
   if(e.parry||e.broken)this.labels.push({x:e.x,y:e.y-105,text:e.parry?'精准防御':'破 防',life:.75,color:e.parry?'#a4f7ff':'#ffbc68'});
  }
  if(e.type==='blink'){for(const x of [e.from,e.to])for(let i=0;i<26;i++)this.parts.push({x:x+(Math.random()-.5)*85,y:GROUND-40-Math.random()*160,vx:(Math.random()-.5)*190,vy:-20-Math.random()*100,life:.5,total:.5,color:'#c4acff',w:4});}
  if(e.type==='active'&&e.id==='ultimate'){this.flash=.17;this.shake=18;}
  if(e.type==='active'&&['cross','flame','dragon'].includes(e.id))this.rings.push({x:e.x,y:GROUND+5,r:15,life:.45,total:.45,color:LexCombat.MOVES[e.id].color});
 }
 update(dt){
  this.shake=Math.max(0,this.shake-dt*27);this.flash=Math.max(0,this.flash-dt*.7);
  for(const p of this.parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=220*dt;p.life-=dt;}
  for(const r of this.rings){r.r+=dt*360;r.life-=dt;}
  for(const l of this.labels){l.y-=dt*20;l.life-=dt;}
  this.parts=this.parts.filter(p=>p.life>0).slice(-400);this.rings=this.rings.filter(p=>p.life>0);this.labels=this.labels.filter(p=>p.life>0);
 }
 backdrop(t){const c=this.c;c.drawImage(this.back,0,0);for(let i=0;i<24;i++){const x=(i*79+t*(8+i%4))%1330-25,y=170+(i*43+t*(3+i%5))%375;c.save();c.translate(x,y);c.rotate(t*.8+i);ellipse(c,0,0,3+i%3,1.5,i%3===0?'#f3c19b77':'#d5808266');c.restore();}}
 aura(f,t){
  const c=this.c,x=f.x,y=GROUND-f.h-87,color=f.id?'#ff805c':'#54dce9';
  if(f.rage>=300||f.move?.def.id==='ultimate'){c.save();c.globalCompositeOperation='lighter';const g=c.createRadialGradient(x,y,5,x,y,115);g.addColorStop(0,color+'27');g.addColorStop(1,color+'00');ellipse(c,x,y,114,146,g);for(let i=0;i<14;i++){const p=((t*.7+i/14)%1),a=i*2.4;line(c,[[x+Math.cos(a)*80*(1-p),y+92-p*200],[x+Math.cos(a)*80*(1-p),y+104-p*200]],color+'99',1.5);}c.restore();}
  if(f.shield>0){c.save();c.strokeStyle='#9ce7dbb0';c.lineWidth=3;const r=93;for(let i=0;i<8;i++){const a=i*TAU/8+t*.5,b=a+.4;line(c,[[x+Math.cos(a)*r,y+Math.sin(a)*110],[x+Math.cos(b)*r,y+Math.sin(b)*110]],'#93edd3',3);}c.restore();}
 }
 slash(f,t){
  const m=f.move;if(!m)return;const d=m.def,c=this.c,x=f.x,y=GROUND-f.h-95,p=(m.age-d.startup)/d.active;
  if(m.age<d.startup){
   if(d.cost||d.rageCost){c.save();c.translate(x+f.face*54,y);c.globalCompositeOperation='lighter';const r=12+m.age/d.startup*30;c.strokeStyle=d.color+'aa';c.lineWidth=2;c.beginPath();c.arc(0,0,r,t*5,t*5+4.9);c.stroke();ellipse(c,0,0,8+windPulse(t),8+windPulse(t),d.color+'bb');c.restore();}return;
  }
  if(p<0||p>=1)return;c.save();c.translate(x,y);c.scale(f.face,1);c.globalCompositeOperation='lighter';c.shadowColor=d.color;c.shadowBlur=this.reduced?0:21;
  if(['slash','cross','flame','dragon'].includes(d.mode)){
   const phase=['flame','cross'].includes(d.mode)?((m.age-d.startup)%8)/8:p,n=d.mode==='cross'?2:1;
   for(let j=0;j<n;j++){c.save();if(j)c.scale(1,-1);if(d.mode==='dragon')c.rotate(-1.05);const start=-1.8+phase*.4,end=.7+phase*.9;
    for(let k=3;k>=0;k--){c.strokeStyle=k?d.color+['ff','bb','66','22'][k]:'#fffcf0';c.lineWidth=(k+1)*(d.mode==='flame'?10:6);c.beginPath();c.ellipse(78,5,d.range*.68,108,0,start,end);c.stroke();}
    if(d.mode==='flame'){for(let i=0;i<16;i++){const a=start+(end-start)*i/16,xx=78+Math.cos(a)*d.range*.68,yy=5+Math.sin(a)*108;poly(c,[[xx-8,yy],[xx+5,yy-18-16*Math.sin(t*45+i)],[xx+15,yy+8]],i%2?'#ffd969':'#ff542799');}}
    c.restore();
   }
  }
  if(d.mode==='throw'){for(let i=0;i<3;i++){c.save();c.translate(96+i*18,(i-1)*37);c.scale(1.35,1.35);hand(c,0,0,.3,true);c.restore();}}
  if(d.mode==='beam'){
   const grow=Math.min(1,p*5),g=grad(c,40,0,1000,0,[[0,'#fff9e8e8'],[.18,'#c2afffbb'],[.65,'#6f67ff77'],[1,'#693cea00']]);
   c.fillStyle=g;c.beginPath();c.moveTo(57,-24);c.quadraticCurveTo(400,-105*grow,1000,-92*grow);c.lineTo(1000,92*grow);c.quadraticCurveTo(350,75*grow,57,24);c.closePath();c.fill();
   for(let i=0;i<7;i++){const points=[];for(let q=0;q<12;q++)points.push([65+q*84,Math.sin(q*.9+t*34+i)*((22+i*5)*grow)]);line(c,points,i%2?'#fcf2ffd9':'#958cff',i%2?2:5);}
   for(let i=0;i<5;i++){const dx=180+i*155+Math.sin(t*9)*25;c.strokeStyle='#e3d8ff88';c.lineWidth=3;c.beginPath();c.ellipse(dx,0,13,55+20*Math.sin(i+t*8),0,0,TAU);c.stroke();}
   // Serpentine dragon head, horns and jaw lead the energy stream.
   const xx=210+grow*610,yy=Math.sin(t*18)*9;c.save();c.translate(xx,yy);c.globalCompositeOperation='source-over';poly(c,[[-110,-45],[-50,-59],[-16,-42],[22,-42],[64,-15],[99,-10],[78,15],[24,17],[62,47],[8,48],[-47,22],[-86,29]],'#202341','#bca7ff',3);poly(c,[[-51,-53],[-65,-106],[-25,-66],[3,-79],[-7,-42]],'#817bc2','#d1c4ff',2);poly(c,[[24,17],[71,12],[44,34]],'#f1e5ff');ellipse(c,10,-23,13,7,'#ffdb75');ellipse(c,17,-22,3,7,'#19122c');line(c,[[54,-12],[116,-35],[147,-14]],'#e5ddff',2);c.restore();
  }
  c.restore();
 }
 hud(w,o){
  const c=this.c,t=o.t;
  for(const f of w.fighters){const right=f.id===1,x=right?789:63,accent=right?'#ff795d':'#60dce5',end=right?1208:72;
   this.shownHP[f.id]+=(f.hp-this.shownHP[f.id])*.075;
   c.save();if(right){c.translate(1280,0);c.scale(-1,1);}
   poly(c,[[31,33],[468,33],[509,81],[69,81]],'#091321d9','#7f919351',1);
   poly(c,[[87,53],[466,53],[488,75],[87,75]],'#232935');
   c.save();c.beginPath();c.moveTo(89,54);c.lineTo(465,54);c.lineTo(484,73);c.lineTo(89,73);c.closePath();c.clip();rect(c,89,54,this.shownHP[f.id]/100*398,20,'#f9d990');rect(c,89,54,f.hp/100*398,20,grad(c,0,54,0,75,[[0,right?'#ffbca0':'#d4f899'],[.5,right?'#ff845e':'#97d878'],[1,right?'#b83930':'#48a779']]));c.restore();
   poly(c,[[90,83],[461,83],[450,90],[90,90]],'#101a2d');rect(c,91,84,f.energy/100*366,5,accent);ninja(c,56,82,.29,1,{},t,accent);c.restore();
   text(c,right?'贰号忍者':'壹号忍者',end,43,18,'#f5e8d5',right?'right':'left');text(c,o.modes[f.id]==='human'?'PLAYER':o.modes[f.id]==='dummy'?'TRAINING':'CPU',right?835:445,44,10,accent,right?'left':'right');
   text(c,'蕾克拉',right?1190:91,106,10,'#98b8b9',right?'right':'left');
   for(let i=0;i<2;i++){const cx=right?908-i*19:372+i*19;ellipse(c,cx,103,4.3,4.3,(o.wins[f.id]||0)>i?'#ffdc7c':'#6e798d55');}
   // Three visible rage stocks; independent of the regenerating jutsu meter.
   const bx=right?906:62;const full=f.rage>=300;
   poly(c,[[bx-7,650],[bx+303,650],[bx+315,677],[bx-7,677]],'#060d1bd9',full?'#ffa453':'#8e71834f');
   for(let i=0;i<3;i++){rect(c,bx+i*102,657,96,12,'#28313d');const v=clamp((f.rage-i*100)/100,0,1);rect(c,bx+i*102,657,96*v,12,grad(c,0,655,0,673,[[0,'#ffe38c'],[.55,'#ff9e50'],[1,'#e44c48']]));}
   text(c,'怒气',right?1196:62,640,13,'#c1a68c',right?'right':'left');text(c,full?'奥义就绪':`${Math.floor(f.rage/100)} / 3`,right?915:356,639,12,full?'#ffcf73':'#bda1a0',right?'left':'right');
   text(c,right?'1  掌   2  刀   3  守':'J  掌   K  刀   L  守',right?1205:64,699,11,'#b2aaa4',right?'right':'left');
   if(f.combo>1&&w.frame<f.comboUntil){const cx=right?1145:129,age=w.frame-f.lastHitAt;c.save();c.translate(cx,225);const s=1+Math.max(0,10-age)*.012;c.scale(s,s);strokeText(c,String(f.combo).padStart(2,'0'),0,0,76,'#ffdf90',right?'right':'left');text(c,'连 击',right?-3:5,28,18,'#f6ddca',right?'right':'left');text(c,`${f.comboDamage} DAMAGE`,right?-3:7,47,10,'#b6c3d2',right?'right':'left');c.restore();}
  }
  poly(c,[[603,22],[677,22],[691,66],[640,101],[590,66]],'#0c1222ed','#bd9b7966',1);text(c,o.tutorial?'∞':String(Math.ceil(w.time/60)).padStart(2,'0'),640,68,43,'#ffe9c4','center',font,900);text(c,`ROUND ${o.round}`,640,121,10,'#c2a69b','center');
 }
 intro(n,round){const c=this.c;if(n>65){const p=(95-n)/30;rect(c,0,245,W,140,'#0b101cba');poly(c,[[0,255],[560,255],[514,376],[0,376]],'#ff664922');poly(c,[[W,255],[720,255],[766,376],[W,376]],'#65dfee22');text(c,`第 ${round} 回合`,640,330,57,'#f7e6c8','center',brush);}else{const s=1+Math.max(0,(n-47)/18)*.3;c.save();c.translate(640,336);c.scale(s,s);strokeText(c,'开 战',0,0,83,'#ffe6a3','center',brush);c.restore();}}
 cutin(w,t){
  const c=this.c,f=w.fighters[w.cinematicFighter],p=(38-w.cinematic)/38,entry=clamp(p*6,0,1),dir=f.id?-1:1;
  rect(c,0,0,W,H,'#030814a0');rect(c,0,0,W,74,'#02050b');rect(c,0,647,W,73,'#02050b');
  c.save();c.translate((1-entry)*W*-dir,0);poly(c,[[0,204],[W,158],[W,466],[0,533]],grad(c,0,260,W,350,[[0,'#312b58'],[.44,'#13182f'],[1,'#7a365a']]),'#c6adf1',2);
  for(let i=0;i<33;i++){const yy=212+i*9,xx=((t*2100+i*141)%1700)-300;line(c,[[xx,yy],[xx+240,yy-13]],i%3?'#c3b4ff33':'#faf3d899',i%3?1:3);}
  ninja(c,f.id?1003:280,500,2.05,f.id?-1:1,{move:{def:LexCombat.MOVES.ultimate,age:30}},t,'#d4b4ff');
  const tx=f.id?356:855;strokeText(c,'黑龙武神',tx,385,83,'#fff0c5','center',brush);text(c,'奥 义 解 放',tx,271,19,'#cbabf7','center');text(c,'吓我一跳，我释放忍术。',tx,426,14,'#b6a7cf','center');
  poly(c,[[0,199],[W,153],[W,164],[0,211]],'#ff7f52');poly(c,[[0,532],[W,465],[W,473],[0,540]],'#fad084');c.restore();
 }
 render(w,o){
  const c=this.c,t=o.t;this.reduced=o.reduced;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,W,H);c.save();
  if(!o.reduced&&this.shake>0)c.translate(Math.sin(t*131)*this.shake,Math.cos(t*153)*this.shake*.35);
  this.backdrop(t);
  if(o.screen==='menu'){
   const halo=c.createRadialGradient(967,440,10,967,440,285);halo.addColorStop(0,'#ffa06620');halo.addColorStop(1,'#ffa06600');ellipse(c,967,440,285,280,halo);
   c.save();c.globalAlpha=.5;for(let i=0;i<3;i++){c.strokeStyle='#e6956430';c.lineWidth=1;c.beginPath();c.arc(967,376,190+i*27,0,TAU);c.stroke();}c.restore();
   ellipse(c,963,674,178,19,'#0009');ninja(c,968,643,2.52,-1,{},t,'#e29356');
   rect(c,0,0,W,H,grad(c,0,0,900,0,[[0,'#07101cf2'],[.48,'#091221bb'],[.9,'#0b122600'],[1,'#09122100']]));
  }else{
   for(const f of w.fighters){this.aura(f,t);ellipse(c,f.x,GROUND+9,66*(1-f.h/800),10,'#04091688');if(f.move?.def.mode==='cross'&&f.move.age<30){for(let i=3;i>0;i--){c.save();c.globalAlpha=.12+i*.025;ninja(c,f.x-f.face*i*64,GROUND-f.h,1,f.face,f,t,f.id?'#ff8764':'#65dae6');c.restore();}}}
   for(const f of [...w.fighters].sort((a,b)=>b.h-a.h)){c.save();if(f.invul>0)c.globalAlpha=.36+Math.sin(t*36)*.2;ninja(c,f.x,GROUND-f.h,1,f.face,f,t,f.id?'#ff8764':'#65dae6');c.restore();}
   for(const f of w.fighters)this.slash(f,t);
   for(const p of w.projectiles){const y=GROUND-p.h;c.save();c.translate(p.x,y);c.rotate(t*23);c.globalCompositeOperation='lighter';c.shadowColor='#c1ff64';c.shadowBlur=o.reduced?0:22;for(let i=0;i<3;i++){c.rotate(TAU/3);poly(c,[[0,-31],[10,-8],[38,2],[10,9],[0,30],[-8,9],[-34,0],[-10,-8]],'#bff96799');}ellipse(c,0,0,12,12,'#f0ffd1');ellipse(c,0,0,6,6,'#396844');c.restore();}
   c.save();c.globalCompositeOperation='lighter';for(const p of this.parts){c.globalAlpha=clamp(p.life/.22,0,1);line(c,[[p.x,p.y],[p.x-p.vx*.035,p.y-p.vy*.035]],p.color,p.w);}for(const r of this.rings){c.globalAlpha=r.life/r.total;c.strokeStyle=r.color;c.lineWidth=2.5;c.beginPath();c.ellipse(r.x,r.y,r.r,r.r*.48,0,0,TAU);c.stroke();}c.restore();
   for(const l of this.labels){c.save();c.globalAlpha=clamp(l.life/.2,0,1);strokeText(c,l.text,l.x,l.y,30,l.color,'center',brush);c.restore();}
   if(o.debug){for(const f of w.fighters){c.strokeStyle='#79ffc9';c.strokeRect(f.x-48,GROUND-f.h-175,96,175);if(f.move){c.strokeStyle='#ff716b';c.strokeRect(f.face>0?f.x:f.x-f.move.def.range,GROUND-f.h-170,f.move.def.range,160);}}}
  }
  c.restore();
  if(o.screen!=='menu'){this.hud(w,o);if(o.intro>0)this.intro(o.intro,o.round);if(w.cinematic>0)this.cutin(w,t);if(o.ko>0){c.save();c.globalAlpha=clamp(o.ko/20,0,1);strokeText(c,w.winner===-1?'平 局':'胜 负 已 分',640,334,70,'#ffe1a0','center',brush);c.restore();}}
  if(this.flash>0&&!o.reduced)rect(c,0,0,W,H,`rgba(244,231,255,${this.flash})`);
 }
}
function windPulse(t){return Math.sin(t*25)*2;}
root.LexRender={Renderer,ninja,hand,sword};
})(window);
