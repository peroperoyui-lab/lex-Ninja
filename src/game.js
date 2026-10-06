(function(){
'use strict';
const {World,AI,Keyboard,MAPS,MOVES,GROUND,clamp}=LexCombat;
const $=id=>document.getElementById(id),canvas=$('arena'),ctx=canvas.getContext('2d');
const keys=MAPS.map(m=>new Keyboard(m)),bank=new LexAudio.AudioBank();
let world=new World(2718),ais=[new AI(0),new AI(1)],modes=['human','ai'],running=false,paused=false,intro=0,debug=false,shake=0,last=0,acc=0,visualTime=0,loadedEmbedded=false,audioBusy=null,round=0;
const DPR=Math.min(window.devicePixelRatio||1,2);canvas.width=1280*DPR;canvas.height=640*DPR;
const reduced=()=> $('motionOff').checked;
const vfx=LexVfx.create(ctx,{GROUND,reduced});
$('motionOff').checked=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const moveInfo={cross:['↓ → 轻 / U','突进交叉斩；可被格挡'],flame:['↓ → 重','三段火刀，每段 8 伤害'],yoyo:['↓ ← 轻 / I','往返飞行物；可跳跃躲避'],blink:['↓ ← 重 / O','移至敌方背后；短暂无敌'],rock:['↓ ＋ 防','100 帧护盾；投技可穿透'],dragon:['→ ↓ 重','升龙；腾空追击'],death:['轻 ＋ 重','近身投技；无视防御'],ultimate:['轻 ＋ 重 ＋ 防','长前摇远距冲击；可防可躲']};
for(const [id,info]of Object.entries(moveInfo)){const d=MOVES[id],tr=document.createElement('tr');for(const text of [d.name,info[0],`${d.startup} / ${d.active} / ${d.recovery} f`,d.cost,info[1]]){const td=document.createElement('td');td.textContent=text;tr.append(td);}$('moveRows').append(tr);}
function soundUI(){const n=bank.buffers.size||Object.keys(window.LEX_AUDIO||{}).length;$('audioCount').textContent=n;$('startNote').textContent=n?`${n} 段原声就绪 · 点击开场启用声音`:'先导入原声包，或直接进入无语音练习。';$('importStatus').textContent=bank.buffers.size?`已解码 ${bank.buffers.size} 段原声。只保留在当前页面，刷新后重新导入；内置版无需导入。`:'尚未解码音源。';const q=$('soundSearch').value.trim().toLowerCase();$('soundList').replaceChildren();for(const name of [...bank.buffers.keys()].sort((a,b)=>a.localeCompare(b,'zh-CN'))){if(q&&!name.toLowerCase().includes(q))continue;const button=document.createElement('button');button.textContent=name;button.onclick=()=>bank.play(name,'preview');$('soundList').append(button);}}
async function ensureAudio(){await bank.unlock();if(loadedEmbedded)return;if(!audioBusy)audioBusy=bank.embedded(window.LEX_AUDIO||{}).then(()=>{loadedEmbedded=true;soundUI();});await audioBusy;}
async function start(){
 if($('startBtn').disabled)return;$('startBtn').disabled=true;$('startNote').textContent='正在解码原声…';
 try{await ensureAudio();}catch(e){$('status').textContent='声音初始化失败，可继续无语音练习：'+e.message;}
 $('startBtn').disabled=false;world=new World(2718+(++round));ais=[new AI(0),new AI(1)];modes=[$('p1mode').value,$('p2mode').value];running=true;paused=false;intro=120;vfx.reset();acc=0;keys.forEach(k=>k.clear());bank.stopAll();
 $('menu').classList.add('hidden');$('result').classList.add('hidden');$('paused').classList.add('hidden');$('pauseBtn').textContent='暂停 Esc';document.activeElement?.blur();
 bank.play('吓我一跳我释放忍术','intro');$('status').textContent=`${modes.map((m,i)=>`P${i+1} ${m==='human'?'玩家':m==='ai'?'AI':'木桩'}`).join(' / ')} · 前后随朝向翻转`;
}
function setPause(value){if(!running||world.over)return;paused=value;keys.forEach(k=>k.clear());acc=0;$('paused').classList.toggle('hidden',!value);$('pauseBtn').textContent=value?'继续 Esc':'暂停 Esc';if(value)bank.stopAll();}
function menu(){running=false;paused=false;world=new World();keys.forEach(k=>k.clear());bank.stopAll();$('menu').classList.remove('hidden');$('result').classList.add('hidden');$('paused').classList.add('hidden');$('pauseBtn').textContent='暂停 Esc';soundUI();}
$('startBtn').onclick=start;$('againBtn').onclick=start;$('resetBtn').onclick=()=>{if(running)start();};$('menuBtn').onclick=menu;$('pausedMenuBtn').onclick=menu;$('resumeBtn').onclick=()=>setPause(false);$('pauseBtn').onclick=()=>setPause(!paused);
$('volume').oninput=e=>bank.setVolume(Number(e.target.value));
$('bookBtn').onclick=()=>{setPause(true);$('book').showModal();};$('soundBtn').onclick=async()=>{setPause(true);$('sounds').showModal();try{await ensureAudio();soundUI();}catch(e){$('importStatus').textContent=e.message;}};
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>{bank.stop('preview');$(b.dataset.close).close();};
$('soundSearch').oninput=soundUI;
for(const id of ['importBtn','importMenu'])$(id).onclick=()=>{$('audioFiles').click();};
$('audioFiles').onchange=async e=>{setPause(true);if(!$('sounds').open)$('sounds').showModal();$('importBtn').disabled=true;$('importStatus').textContent='正在解压并解码原声，文件不离开当前页面…';try{const r=await bank.importFiles(e.target.files);soundUI();$('importStatus').textContent=`本次导入 ${r.added} 段，音库共 ${bank.buffers.size} 段。`+(r.failures.length?` ${r.failures.length} 项失败：${r.failures.slice(0,3).join('；')}`:' 所有音频均在本地读取。');}catch(err){$('importStatus').textContent=err.message;}finally{$('importBtn').disabled=false;e.target.value='';}};
window.addEventListener('keydown',e=>{
 if(e.ctrlKey||e.metaKey||e.altKey)return;if(document.querySelector('dialog[open]'))return;
 if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
 if(e.code==='Escape'){e.preventDefault();if(!e.repeat)setPause(!paused);return;}
 if(e.code==='F2'){e.preventDefault();if(!e.repeat)debug=!debug;return;}
 if(e.code==='KeyR'){if(running&&!e.repeat){e.preventDefault();start();}return;}
 if(!running||paused||world.over)return;let used=false;for(const k of keys)used=k.key(e.code,true)||used;if(used)e.preventDefault();
});
window.addEventListener('keyup',e=>{for(const k of keys)k.key(e.code,false);});
window.addEventListener('blur',()=>{keys.forEach(k=>k.clear());setPause(true);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true);});
function events(list){for(const e of list){vfx.event(e,world);if(e.type==='cast'){if(!['light','heavy'].includes(e.id)){bank.play(e.name,`p${e.fighter}`);$('status').textContent=`P${e.fighter+1} · ${e.name}`;}}
 if(e.type==='hit'){if(!e.guarded)bank.stop(`p${e.fighter}`);bank.thump(e.guarded);shake=e.guarded?2:e.damage>=15?9:6;}
 if(e.type==='end'){$('resultText').textContent=e.winner===-1?'不分高下':`P${e.winner+1} 胜出`;$('result').classList.remove('hidden');keys.forEach(k=>k.clear());bank.stopAll();}
}}
function tick(){if(!running||paused||world.over)return;if(intro>0){intro--;keys.forEach(k=>{k.edges.clear();});return;}const commands=modes.map((m,i)=>m==='human'?keys[i].sample(world.frame,world.fighters[i].face):m==='ai'?ais[i].sample(world):{});events(world.step(commands));}
function rect(x,y,w,h,c,r=0){ctx.fillStyle=c;if(r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}else ctx.fillRect(x,y,w,h);}
function line(points,color,width=2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
function text(s,x,y,size=14,color='#e0e1d2',align='left',font='sans-serif'){ctx.fillStyle=color;ctx.font=`${size}px ${font==='serif'?"'STKaiti','KaiTi',serif":"'Microsoft YaHei','Noto Sans CJK SC',sans-serif"}`;ctx.textAlign=align;ctx.fillText(s,x,y);}
function backdrop(t){
 const g=ctx.createLinearGradient(0,0,0,640);g.addColorStop(0,'#16242a');g.addColorStop(.65,'#293530');g.addColorStop(1,'#11191d');rect(0,0,1280,640,g);
 const halo=ctx.createRadialGradient(680,185,25,680,185,255);halo.addColorStop(0,'#d3c48c22');halo.addColorStop(1,'#d3c48c00');rect(0,0,1280,500,halo);ellipse(684,165,62,62,'#b5ba9d22');ellipse(671,153,57,57,'#202e30');
 for(let layer=0;layer<3;layer++){const base=320+layer*53;ctx.fillStyle=['#34423d','#293c38','#1b2c2b'][layer];ctx.beginPath();ctx.moveTo(0,base+100);for(let x=0;x<=1280;x+=40){const y=base-Math.sin(x*.007+layer*2.5)*45-Math.cos(x*.014-layer)*28;ctx.lineTo(x,y);}ctx.lineTo(1280,540);ctx.lineTo(0,540);ctx.fill();}
 // Distant shrine, original procedural scenery.
 for(const side of [0,1]){ctx.save();ctx.translate(side?1130:150,280);const sc=side?.78:1;ctx.scale(sc,sc);rect(-6,-5,12,170,'#132222');rect(100,-5,12,170,'#132222');line([[-33,-10],[50,0],[142,-10]],'#172625',15);line([[-23,24],[128,24]],'#172625',8);line([[46,1],[46,24]],'#172625',5);ctx.restore();}
 for(let i=0;i<8;i++){const x=i*167+30;line([[x,444],[x-4,380],[x+5,325]],'#192a28',5);}
 rect(0,489,1280,151,'#152023');rect(0,489,1280,4,'#647064');rect(0,500,1280,2,'#39473f');
 for(let x=-400;x<1800;x+=150)line([[640+(x-640)*.66,503],[x,640]],'#74817113',1);
 for(const y of [525,555,595,638])line([[0,y],[1280,y]],'#74817116',1);
 for(let i=0;i<14;i++){const x=(i*107+t*(8+i%3))%1340-30,y=270+Math.sin(t*.25+i)*115;ellipse(x,y,1.3,1.3,'#e1c77d44');}
 text('雾隐道场',47,163,13,'#85978a');line([[47,178],[47,225]],'#768d7144',1);text('一期一会',1233,165,13,'#85978a','right');
}
function hand(x,y,angle=0){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ellipse(0,0,17,18,'#3d301e');ellipse(-1,-2,14,16,'#eab33e');ellipse(-4,-6,10,10,'#ffda6d');for(let j=-1;j<=1;j++)line([[j*6,-12],[j*6,-4]],'#c8922d',1.5);ellipse(10,3,6,10,'#f9c557');ctx.restore();}
function sword(x,y,angle,color='#d7e6db'){ctx.save();ctx.translate(x,y);ctx.rotate(angle);line([[-7,6],[12,-8]],'#554e35',9);line([[6,-13],[18,0]],'#d6b669',5);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(13,-10);ctx.lineTo(86,-102);ctx.lineTo(93,-114);ctx.lineTo(89,-91);ctx.lineTo(22,-4);ctx.closePath();ctx.fill();line([[18,-10],[88,-106]],'#ffffff77',1.4);ctx.restore();}
function ninja(f,t,ghost=false,offset=0){
 const bob=reduced()?0:Math.sin(t*3.5+f.id)*3,y=GROUND-f.h-20+bob+(f.crouch?30:0),m=f.move,d=m?.def,age=m?.age||0;
 const active=!!m&&age>=d.startup&&age<d.startup+d.active;
 if(!ghost){ellipse(f.x,GROUND+4,57*(1-f.h/700),8,'#030c1099');if(f.shield>0){ctx.strokeStyle='#92d4bd88';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(f.x,y-60,84,105,0,0,Math.PI*2);ctx.stroke();for(let i=0;i<6;i++){const a=t+i*Math.PI/3;ellipse(f.x+Math.cos(a)*85,y-60+Math.sin(a)*100,7,7,'#88ba9dcc');}}}
 ctx.save();ctx.translate(f.x+offset,y);ctx.scale(f.face,1);if(ghost)ctx.globalAlpha=.17;else if(f.invul>0)ctx.globalAlpha=.52+Math.sin(t*40)*.25;
 const lean=f.stun&&!f.blocked?-.15:f.walk*.04*f.face;ctx.rotate(lean);
 // Upper-body emoji silhouette only: hood, shoulders, floating hands; no legs.
 ctx.fillStyle='#0a1117';ctx.strokeStyle='#46535a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-31,-29);ctx.quadraticCurveTo(-62,-13,-65,10);ctx.quadraticCurveTo(0,23,65,10);ctx.quadraticCurveTo(62,-13,31,-29);ctx.closePath();ctx.fill();ctx.stroke();
 ellipse(0,-73,55,61,'#071019');ellipse(-5,-78,49,56,'#19232d');ellipse(4,-71,46,52,'#0d1722');
 rect(-39,-92,78,39,'#a97423',14);rect(-38,-92,76,34,'#f7ce65',12);rect(-34,-89,67,9,'#ffe79b',7);
 ellipse(-16,-74,5,6.5,'#322819');ellipse(17,-74,5,6.5,'#322819');ellipse(-17,-76,1.4,1.6,'#fff1c4');ellipse(16,-76,1.4,1.6,'#fff1c4');
 ctx.fillStyle='#0b1520';ctx.beginPath();ctx.moveTo(-48,-60);ctx.quadraticCurveTo(0,-74,48,-60);ctx.lineTo(35,-32);ctx.quadraticCurveTo(0,-9,-35,-32);ctx.closePath();ctx.fill();line([[-37,-53],[0,-48],[36,-55]],'#28323d',2);line([[-33,-41],[-5,-34],[30,-43]],'#202c35',2);
 line([[-43,-101],[-15,-110],[30,-105]],'#3d4952',3);line([[-44,-96],[40,-96]],f.id?'#c18056':'#c3a462',4);
 ctx.fillStyle=f.id?'#bf805977':'#c4a36377';ctx.beginPath();ctx.moveTo(-47,-98);ctx.lineTo(-85,-86+Math.sin(t*5)*6);ctx.lineTo(-68,-106);ctx.closePath();ctx.fill();
 let hx=67,hy=-14,angle=-.25;
 if(f.guard){hx=36;hy=-63;angle=.65;}
 if(m){const wind=Math.min(1,age/d.startup);hx=50-wind*23;hy=-20-wind*28;angle=-1.2*wind;
  if(active){const p=(age-d.startup)/d.active;hx=55+Math.sin(p*Math.PI)*58;hy=-38+Math.sin(p*Math.PI)*30;angle=-.4+Math.sin(p*Math.PI)*2.4;}
  if(age>=d.startup+d.active){const p=(age-d.startup-d.active)/d.recovery;hx=90-23*p;hy=-10;angle=1.3*(1-p);}
  if(d.mode==='beam'){hx=52;hy=-60;angle=.9;}
 }
 hand(-58,-10+(f.guard?-30:Math.sin(t*3)*3),-.3);if(!m||!['punch','rock','yoyo','blink','throw','beam'].includes(d.mode))sword(hx,hy,angle,active&&d.mode==='flame'?'#ffd082':'#d3ddd5');hand(hx,hy,angle*.2);
 if(d?.mode==='punch'&&active){hand(hx+20,hy,0);}
 if(f.guard){line([[12,-90],[48,-114],[78,-80]],'#9ccec1aa',3);}
 ctx.restore();
 if(!ghost){text(`P${f.id+1}`,f.x,y-150,11,f.id?'#ce9475':'#d7c28b','center');if(running&&world.frame-f.lastAt<95&&f.lastName&&!['掌击','拔刀'].includes(f.lastName)){text(f.lastName,f.x,y-171,16,d?.color||'#dfd1a3','center');}}
}
function hud(){
 const [a,b]=world.fighters;for(const f of [a,b]){const x=f.id?819:41,y=47,width=420;const label=f.id?'贰 · 二号忍者':'壹 · 一号忍者';text(label,f.id?1239:41,32,14,'#dfe0ce',f.id?'right':'left');text(running?(modes[f.id]==='human'?'PLAYER':modes[f.id]==='ai'?'CPU':'DUMMY'):'READY',f.id?819:461,32,10,'#a5b1a2',f.id?'left':'right');
 rect(x,y,width,16,'#0a1418',3);const hp=f.hp/100*width;rect(f.id?x+width-hp:x,y,hp,16,f.hp<30?'#c47c62':f.id?'#c79d74':'#c6bd86',3);for(let i=1;i<5;i++)rect(x+i*width/5,y,1,16,'#10171988');
 rect(x,y+24,width,5,'#0c1417',2);const energy=f.energy/100*width;rect(f.id?x+width-energy:x,y+24,energy,5,f.id?'#bd9397':'#87b9b1',2);
 text(`蕾克拉 ${Math.floor(f.energy)}`,f.id?1239:41,96,11,'#93afa7',f.id?'right':'left');
 const m=f.move,state=f.stun?'受击硬直':m?(m.age<m.def.startup?'前摇':m.age<m.def.startup+m.def.active?'生效':'后摇'):f.guard?'防御':f.shield?'护盾':f.h?'腾空':'就绪';text(state,f.id?819:461,96,11,m?.def.color||'#949e94',f.id?'left':'right');
 if(f.combo>1&&world.frame<f.comboUntil){text(f.combo+' HIT',f.id?1160:120,224,33,'#e7c47a',f.id?'right':'left');}
 }
 line([[505,49],[541,49]],'#5a6652',1);line([[739,49],[775,49]],'#5a6652',1);text(String(Math.ceil(world.time/60)).padStart(2,'0'),640,66,44,'#e4d2a3','center','serif');text('一局定胜负',640,91,10,'#919c8e','center');
 text('宗 门 大 比',640,583,13,'#9aaa9355','center');line([[560,599],[720,599]],'#80917d22',1);text(debug?'DEBUG / HITBOX ON':'LEX NINJA • LOCAL ARENA',640,619,9,'#647b7555','center');
}
function render(t){
 ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,1280,640);vfx.update(paused);vfx.track(world);ctx.save();if(shake>0&&!reduced()){ctx.translate(Math.sin(t*180)*shake,Math.cos(t*160)*shake*.4);shake=Math.max(0,shake-.45);}backdrop(t);
 for(const f of world.fighters){if(f.move?.def.mode==='cross'&&f.move.age>6&&f.move.age<28){ninja(f,t,true,-f.face*85);ninja(f,t,true,-f.face*165);}if(f.move?.def.mode==='blink'&&f.move.age<16)ninja(f,t,true,-f.face*100);}
 for(const f of [...world.fighters].sort((a,b)=>b.h-a.h))ninja(f,t);
 for(const f of world.fighters)vfx.fx(f,t,world);
 for(const p of world.projectiles)vfx.projectile(p,t,world);
 vfx.drawBursts();vfx.drawParticles();vfx.drawFloats();
 if(debug){for(const f of world.fighters){ctx.strokeStyle='#73e4ba';ctx.lineWidth=1;ctx.strokeRect(f.x-48,GROUND-f.h-145,96,145);const m=f.move;if(m&&m.age>=m.def.startup&&m.age<m.def.startup+m.def.active){ctx.strokeStyle='#ff7777';ctx.strokeRect(f.face>0?f.x:f.x-m.def.range,GROUND-f.h-145,m.def.range,145);}}}
 ctx.restore();vfx.drawFlash();hud();if(running&&!paused&&intro>0){text(intro>60?'准 备':'释 放 忍 术',640,290,intro>60?42:54,'#efd497','center','serif');text('ROUND 1',640,324,13,'#c2c5ab','center');}
}
function loop(now){const dt=Math.min((now-last)/1000||0,0.1);last=now;if(!paused)visualTime+=dt;acc+=dt;let steps=0;while(acc>=1/60&&steps<6){tick();acc-=1/60;steps++;}render(visualTime);requestAnimationFrame(loop);}
soundUI();requestAnimationFrame(loop);
window.__LEX={get world(){return world;},keys,bank,get running(){return running;},get paused(){return paused;},start,pause:setPause,snapshot:()=>({frame:world.frame,time:world.time,over:world.over,winner:world.winner,modes:[...modes],sounds:bank.buffers.size,fighters:world.fighters.map(f=>({hp:f.hp,energy:f.energy,x:f.x,h:f.h,move:f.move?.def.id||null,stun:f.stun,shield:f.shield,face:f.face}))})};
})();
