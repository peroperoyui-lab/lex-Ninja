(function(){
'use strict';
const {World,AI,Keyboard,MAPS,MOVES,GROUND,clamp}=LexCombat;
const $=id=>document.getElementById(id),canvas=$('arena'),ctx=canvas.getContext('2d');
const keys=MAPS.map(m=>new Keyboard(m)),bank=new LexAudio.AudioBank();
let world=new World(2718),ais=[new AI(0),new AI(1)],modes=['human','ai'],running=false,paused=false,intro=0,debug=false,shake=0,last=0,acc=0,visualTime=0,loadedEmbedded=false,audioBusy=null,round=0;
const DPR=Math.min(window.devicePixelRatio||1,2);canvas.width=1280*DPR;canvas.height=640*DPR;
const reduced=()=> $('motionOff').checked;
$('motionOff').checked=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const moveInfo={cross:['↓ → 轻 / U','突进交叉斩；可被格挡'],flame:['↓ → 重','三段火刀，每段 8 伤害'],yoyo:['↓ ← 轻 / I','往返飞行物；可跳跃躲避'],blink:['↓ ← 重 / O','移至敌方背后；短暂无敌'],rock:['↓ ＋ 防','100 帧护盾；投技可穿透'],dragon:['→ ↓ 重','升龙；腾空追击'],death:['轻 ＋ 重','近身投技；无视防御'],ultimate:['轻 ＋ 重 ＋ 防','长前摇远距冲击；可防可躲']};
for(const [id,info]of Object.entries(moveInfo)){const d=MOVES[id],tr=document.createElement('tr');for(const text of [d.name,info[0],`${d.startup} / ${d.active} / ${d.recovery} f`,d.cost,info[1]]){const td=document.createElement('td');td.textContent=text;tr.append(td);}$('moveRows').append(tr);}
function soundUI(){const n=bank.buffers.size||Object.keys(window.LEX_AUDIO||{}).length;$('audioCount').textContent=n;$('startNote').textContent=n?`${n} 段原声就绪 · 点击开场启用声音`:'先导入原声包，或直接进入无语音练习。';$('importStatus').textContent=bank.buffers.size?`已解码 ${bank.buffers.size} 段原声。只保留在当前页面，刷新后重新导入；内置版无需导入。`:'尚未解码音源。';const q=$('soundSearch').value.trim().toLowerCase();$('soundList').replaceChildren();for(const name of [...bank.buffers.keys()].sort((a,b)=>a.localeCompare(b,'zh-CN'))){if(q&&!name.toLowerCase().includes(q))continue;const button=document.createElement('button');button.textContent=name;button.onclick=()=>bank.play(name,'preview');$('soundList').append(button);}}
async function ensureAudio(){await bank.unlock();if(loadedEmbedded)return;if(!audioBusy)audioBusy=bank.embedded(window.LEX_AUDIO||{}).then(()=>{loadedEmbedded=true;soundUI();});await audioBusy;}
async function start(){
 if($('startBtn').disabled)return;$('startBtn').disabled=true;$('startNote').textContent='正在解码原声…';
 try{await ensureAudio();}catch(e){$('status').textContent='声音初始化失败，可继续无语音练习：'+e.message;}
 $('startBtn').disabled=false;world=new World(2718+(++round));ais=[new AI(0),new AI(1)];modes=[$('p1mode').value,$('p2mode').value];running=true;paused=false;intro=120;art.reset();acc=0;keys.forEach(k=>k.clear());bank.stopAll();
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
function events(list){for(const e of list){art.event(e,world);if(e.type==='cast'){if(!['light','heavy'].includes(e.id)){bank.play(e.name,`p${e.fighter}`);$('status').textContent=`P${e.fighter+1} · ${e.name}`;}}
 if(e.type==='hit'){if(!e.guarded)bank.stop(`p${e.fighter}`);bank.thump(e.guarded);shake=e.guarded?2:e.damage>=15?9:6;}
 if(e.type==='end'){$('resultText').textContent=e.winner===-1?'不分高下':`P${e.winner+1} 胜出`;$('result').classList.remove('hidden');keys.forEach(k=>k.clear());bank.stopAll();}
}}
function tick(){if(!running||paused||world.over)return;if(intro>0){intro--;keys.forEach(k=>{k.edges.clear();});return;}const commands=modes.map((m,i)=>m==='human'?keys[i].sample(world.frame,world.fighters[i].face):m==='ai'?ais[i].sample(world):{});events(world.step(commands));}
const art=LexArt.create(ctx,{DPR,GROUND,reduced,make:()=>document.createElement('canvas')});
function render(t){
 ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,1280,640);art.update(paused);art.track(world);
 const mood=art.mood(world);if(art.beamShake(world))shake=Math.max(shake,3);
 ctx.save();if(shake>0&&!reduced()){ctx.translate(Math.sin(t*180)*shake,Math.cos(t*160)*shake*.4);shake=Math.max(0,shake-.45);}
 if(world.freeze>0&&!reduced()){ctx.translate(640,320);ctx.scale(1.012,1.012);ctx.translate(-640,-320);}
 art.backdrop(t,mood,world);
 for(const f of world.fighters){if(f.move?.def.mode==='cross'&&f.move.age>6&&f.move.age<28){art.fighter(f,t,world,running,true,-f.face*85);art.fighter(f,t,world,running,true,-f.face*165);}if(f.move?.def.mode==='blink'&&f.move.age<16)art.fighter(f,t,world,running,true,-f.face*100);if(f.move?.def.mode==='dragon'&&f.move.age>=f.move.def.startup&&f.move.age<f.move.def.startup+8)art.fighter(f,t,world,running,true,-f.face*30);}
 for(const f of [...world.fighters].sort((a,b)=>b.h-a.h)){art.fighter(f,t,world,running);art.shield(f,t);}
 art.drawTrails();
 for(const f of world.fighters)art.fx(f,t,world);
 for(const p of world.projectiles)art.projectile(p,t,world);
 art.drawBursts();art.drawParticles();art.drawFloats();
 if(debug)art.debug(world);
 ctx.restore();art.drawFlash();art.hud(world,running,modes,debug,t);
 if(running&&!paused&&intro>0)art.intro(intro);
}
function loop(now){const dt=Math.min((now-last)/1000||0,0.1);last=now;if(!paused)visualTime+=dt;acc+=dt;let steps=0;while(acc>=1/60&&steps<6){tick();acc-=1/60;steps++;}render(visualTime);requestAnimationFrame(loop);}
soundUI();requestAnimationFrame(loop);
window.__LEX={get world(){return world;},keys,bank,get running(){return running;},get paused(){return paused;},start,pause:setPause,snapshot:()=>({frame:world.frame,time:world.time,over:world.over,winner:world.winner,modes:[...modes],sounds:bank.buffers.size,fighters:world.fighters.map(f=>({hp:f.hp,energy:f.energy,x:f.x,h:f.h,move:f.move?.def.id||null,stun:f.stun,shield:f.shield,face:f.face}))})};
})();
