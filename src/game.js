/* UI/state coordinator. Only this module knows about menus, focus or the DOM. */
(function(){
'use strict';
const {World,AI,Keyboard,MAPS,MOVES,clamp}=LexCombat,$=id=>document.getElementById(id);
const renderer=new LexRender.Renderer($('arena')),bank=new LexAudio.AudioBank(),keys=MAPS.map(m=>new Keyboard(m));
let world=new World(2718),ais=[new AI(0),new AI(1)],modes=['human','ai'];
let playing=false,paused=false,screen='menu',intro=0,ko=0,round=1,wins=[0,0],seed=2718;
let visualTime=0,last=0,acc=0,inputFrame=0,debug=false,loading=false,embeddedReady=false,audioJob=null,toastTime=0;
let tutorial=false,lesson=0,lessonDelay=0,lessonMoved=false,lessonJumped=false,bookSeat=0;
const lessons=[
 ['先动起来','A  D   ·   W','左右移动，再跳一下。'],
 ['先握为敬','J','靠近木桩，用掌击命中一次。'],
 ['接上三连','J  →  J  →  K','掌击命中后接掌，再接刀。不要同时按。'],
 ['守住这一刀','L','按住防御，挡下木桩的一次攻击。'],
 ['释放忍术','U','用影分身十字斩命中木桩。'],
 ['奥义解放','J ＋ K ＋ L','三格怒气已充满，同时按下三键。']
];
const bindings={
 cross:['U / ↓ → J','4 / ↓ → 1'],flame:['↓ → K','↓ → 2'],yoyo:['I / ↓ ← J','5 / ↓ ← 1'],blink:['O / ↓ ← K','6 / ↓ ← 2'],rock:['↓ ＋ L','↓ ＋ 3'],dragon:['→ ↓ K','→ ↓ 2'],death:['J ＋ K','1 ＋ 2'],ultimate:['J ＋ K ＋ L · 三格怒气','1 ＋ 2 ＋ 3 · 三格怒气']
};
const defaults={master:.65,voice:.9,sfx:.7,mute:false,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches};
let options={...defaults};try{const old=JSON.parse(localStorage.getItem('lexninja-v02-options')||'{}');for(const k of ['master','voice','sfx'])if(Number.isFinite(old[k]))options[k]=clamp(old[k],0,1);for(const k of ['mute','reduced'])if(typeof old[k]==='boolean')options[k]=old[k];}catch{}
function saveOptions(){try{localStorage.setItem('lexninja-v02-options',JSON.stringify(options));}catch{}}
function applyOptions(){
 bank.setVolume(options.master);bank.setVoiceVolume(options.voice);bank.setSfxVolume(options.sfx);bank.setMuted(options.mute);
 for(const [id,key,out]of [['masterVolume','master','masterValue'],['voiceVolume','voice','voiceValue'],['sfxVolume','sfx','sfxValue'],['pauseVolume','master','pauseVolumeValue']]){$(id).value=options[key];$(out).textContent=Math.round(options[key]*100)+'%';}
 $('mute').checked=options.mute;$('reduced').checked=options.reduced;
}
for(const [id,key]of [['masterVolume','master'],['voiceVolume','voice'],['sfxVolume','sfx'],['pauseVolume','master']])$(id).oninput=e=>{options[key]=Number(e.target.value);applyOptions();saveOptions();};
$('mute').onchange=e=>{options.mute=e.target.checked;applyOptions();saveOptions();};$('reduced').onchange=e=>{options.reduced=e.target.checked;applyOptions();saveOptions();};applyOptions();
function toast(message){$('toast').textContent=message;$('toast').classList.remove('hidden');toastTime=150;}
function clearInput(){keys.forEach(k=>k.clear());acc=0;document.activeElement?.blur();}
function setPause(value){if(!playing)return;paused=!!value;clearInput();$('paused').classList.toggle('hidden',!paused);$('pauseBtn').innerHTML=paused?'▷ <span>继续</span>':'Ⅱ <span>暂停</span>';if(paused)bank.stopAll();}
function closeDialogs(){for(const d of document.querySelectorAll('dialog[open]'))d.close();}
function openDialog(id){if(playing)setPause(true);bank.stop('preview');closeDialogs();$(id).showModal();}
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>$(b.dataset.close).close();
for(const d of document.querySelectorAll('dialog'))d.addEventListener('close',()=>{bank.stop('preview');document.activeElement?.blur();});
async function ensureAudio(){
 await bank.unlock();if(embeddedReady)return;
 if(!audioJob)audioJob=bank.embedded(window.LEX_AUDIO||{},(n,total)=>{$('loadProgress').style.width=(total?n/total*100:100)+'%';$('loadStatus').textContent=`忍术就位 ${n} / ${total}`;}).then(()=>{embeddedReady=true;soundUI();}).finally(()=>audioJob=null);
 await audioJob;
}
function soundUI(){
 const n=bank.buffers.size||Object.keys(window.LEX_AUDIO||{}).length;$('audioCount').textContent=n;
 const q=$('soundSearch').value.trim().toLowerCase();$('soundList').replaceChildren();
 for(const name of [...bank.buffers.keys()].sort((a,b)=>a.localeCompare(b,'zh-CN'))){if(q&&!name.toLowerCase().includes(q))continue;const b=document.createElement('button');b.textContent=name;b.onclick=()=>bank.play(name);$('soundList').append(b);}
 $('importStatus').textContent=bank.buffers.size?`${bank.buffers.size} 段原声 · 点击试听`:'可导入「忍术.zip」或多选音频文件，仅在本机读取。';
}
function newRound(first=false){
 const rage=first?[0,0]:world.fighters.map(f=>f.rage);world=new World(++seed);world.fighters.forEach((f,i)=>f.rage=rage[i]);ais=[new AI(0),new AI(1)];intro=tutorial?35:95;ko=0;clearInput();renderer.reset();bank.stopAll();
 if(first&&!tutorial)bank.play('吓我一跳我释放忍术','intro');
 if(tutorial)setupLesson();
}
async function start(kind='match'){
 if(loading)return;loading=true;closeDialogs();$('loading').classList.remove('hidden');$('loadProgress').style.width='0';
 try{await ensureAudio();}catch(e){toast('声音未就绪，可在原声大碟重新导入。');console.warn('Audio initialization:',e.message);}
 finally{$('loading').classList.add('hidden');loading=false;}
 tutorial=kind==='tutorial';lesson=0;lessonDelay=0;round=1;wins=[0,0];modes=tutorial?['human','dummy']:[$('p1mode').value,$('p2mode').value];playing=true;paused=false;screen='fight';
 $('stage').classList.add('playing');$('menu').classList.add('hidden');$('paused').classList.add('hidden');$('result').classList.add('hidden');$('pauseBtn').classList.remove('hidden');$('pauseBtn').innerHTML='Ⅱ <span>暂停</span>';$('guide').classList.toggle('hidden',!tutorial);$('toast').classList.add('hidden');newRound(true);
}
function toMenu(){
 closeDialogs();playing=false;paused=false;screen='menu';tutorial=false;intro=0;ko=0;world=new World();renderer.reset();bank.stopAll();clearInput();
 $('stage').classList.remove('playing');for(const id of ['paused','result','guide','pauseBtn','toast'])$(id).classList.add('hidden');$('menu').classList.remove('hidden');soundUI();
}
function setupLesson(){
 lessonMoved=false;lessonJumped=false;lessonDelay=0;const [a,b]=world.fighters;
 Object.assign(a,{x:lesson===0?350:490,h:0,vh:0,kx:0,energy:100,hp:100,rage:lesson===5?300:0,move:null,stun:0,face:1,combo:0,comboActive:false,buffer:null,guard:false,shield:0,invul:0,cd:{}});
 Object.assign(b,{x:lesson===0?930:625,h:0,vh:0,kx:0,hp:100,move:null,stun:0,face:-1,buffer:null,guard:false,shield:0,invul:0});world.projectiles=[];world.freeze=0;world.cinematic=0;clearInput();drawLesson();
}
function drawLesson(){const data=lessons[lesson];$('lessonCount').textContent=`${String(lesson+1).padStart(2,'0')} / 06`;$('lessonTitle').textContent=data[0];$('lessonKeys').textContent=data[1];$('lessonHint').textContent=data[2];$('lessonDots').innerHTML=lessons.map((_,i)=>`<i class="${i<=lesson?'done':''}"></i>`).join('');}
function passedLesson(){if(lessonDelay)return;lessonDelay=48;$('lessonTitle').textContent='漂亮，下一式。';bank.tone(660,880,.09,.09,'triangle');}
function finishTutorial(){
 playing=false;paused=false;$('guide').classList.add('hidden');$('pauseBtn').classList.add('hidden');$('result').classList.remove('hidden');$('resultEyebrow').textContent='TRAINING COMPLETE';$('resultTitle').textContent='入门完成';$('resultStats').textContent='接下来，找个人切磋。';$('rematchBtn').innerHTML='开始对决 <span>→</span>';bank.stopAll();try{localStorage.setItem('lexninja-tutorial-done','1');}catch{}
}
function matchResult(){playing=false;paused=false;bank.stopAll();$('pauseBtn').classList.add('hidden');$('result').classList.remove('hidden');$('resultEyebrow').textContent='VICTORY';const winner=wins[0]>wins[1]?0:1;$('resultTitle').textContent=winner?'贰号忍者胜':'壹号忍者胜';$('resultStats').textContent=`${wins[0]} : ${wins[1]}　 /　 本回合最高 ${world.fighters[winner].maxCombo} 连击`;$('rematchBtn').innerHTML='再战一场 <span>→</span>';}
function openBook(){openDialog('book');bookUI();}
function bookUI(){
 $('basicKeys').textContent=bookSeat?'← → 移动　↑ 跳跃　1 掌击　2 拔刀　3 防御　1 → 1 → 2 三连':'A D 移动　W 跳跃　J 掌击　K 拔刀　L 防御　J → J → K 三连';$('moveList').replaceChildren();
 for(const [id,k]of Object.entries(bindings)){const b=document.createElement('button'),title=document.createElement('strong'),hint=document.createElement('span');title.textContent=MOVES[id].name;hint.textContent=k[bookSeat];b.append(title,hint);b.title='试听 '+MOVES[id].name;b.onclick=async()=>{try{await ensureAudio();bank.play(MOVES[id].name);}catch{toast('尚未载入原声');}};$('moveList').append(b);}
 for(const b of document.querySelectorAll('[data-book]'))b.classList.toggle('active',Number(b.dataset.book)===bookSeat);
}
for(const b of document.querySelectorAll('[data-book]'))b.onclick=()=>{bookSeat=Number(b.dataset.book);bookUI();};
for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>{for(const x of document.querySelectorAll('[data-mode]'))x.classList.toggle('active',x===b);const v=b.dataset.mode;$('p1mode').value=v==='watch'?'ai':'human';$('p2mode').value=v==='versus'?'human':'ai';};
for(const id of ['p1mode','p2mode'])$(id).onchange=()=>{for(const b of document.querySelectorAll('[data-mode]'))b.classList.remove('active');};
$('startBtn').onclick=()=>openDialog('setup');$('fightBtn').onclick=()=>start();$('tutorialBtn').onclick=()=>start('tutorial');$('bookBtn').onclick=openBook;$('pauseBookBtn').onclick=openBook;$('settingsBtn').onclick=()=>openDialog('settings');
$('pauseBtn').onclick=()=>setPause(!paused);$('resumeBtn').onclick=()=>setPause(false);$('restartBtn').onclick=()=>start(tutorial?'tutorial':'match');$('pauseMenuBtn').onclick=toMenu;$('resultMenuBtn').onclick=toMenu;
$('rematchBtn').onclick=()=>{if(tutorial){tutorial=false;toMenu();openDialog('setup');}else start();};
$('skipLesson').onclick=()=>{if(lesson===5)finishTutorial();else{lesson++;setupLesson();}};
$('testAudio').onclick=async()=>{try{await ensureAudio();bank.play('影分身十字斩');bank.thump(false);}catch{toast('浏览器尚未允许声音');}};
$('fullBtn').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('stage').requestFullscreen();}catch{toast('当前浏览器未允许全屏');}};
$('soundBtn').onclick=async()=>{openDialog('sounds');$('importStatus').textContent='原声就位…';try{await ensureAudio();soundUI();}catch{soundUI();}};$('soundSearch').oninput=soundUI;
$('importBtn').onclick=()=>$('audioFiles').click();
$('audioFiles').onchange=async e=>{if(playing)setPause(true);$('importBtn').disabled=true;$('importStatus').textContent='正在本地导入…';try{const result=await bank.importFiles(e.target.files);soundUI();if(result.failures.length)$('importStatus').textContent=`导入 ${result.added} 段；${result.failures.length} 段失败：${result.failures.slice(0,2).join('；')}`;}catch(err){$('importStatus').textContent=err.message;}finally{$('importBtn').disabled=false;e.target.value='';}};
function isDialogOpen(){return !!document.querySelector('dialog[open]');}
window.addEventListener('keydown',e=>{
 if(e.isComposing)return;
 if(e.code==='Escape'){if(isDialogOpen())return;if(playing){e.preventDefault();if(!e.repeat)setPause(!paused);}return;}
 if(isDialogOpen()||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
 if(e.code==='KeyM'&&!e.repeat){options.mute=!options.mute;applyOptions();saveOptions();toast(options.mute?'已静音':'声音开启');return;}
 if(e.code==='F2'&&!e.repeat){e.preventDefault();debug=!debug;return;}
 if(e.code==='Enter'&&!playing&&!loading&&screen==='menu'){e.preventDefault();openDialog('setup');return;}
 if(!playing||paused||loading)return;
 let used=false;for(const k of keys)used=k.key(e.code,true)||used;if(used)e.preventDefault();
});
window.addEventListener('keyup',e=>{for(const k of keys)k.key(e.code,false);});
window.addEventListener('blur',()=>{clearInput();if(playing)setPause(true);else bank.stopAll();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();bank.stopAll();if(playing)setPause(true);}});
window.addEventListener('pagehide',()=>bank.stopAll());
function tutorialCommands(){
 const b=world.fighters[1],a=world.fighters[0];a.energy=100;if(a.hp<45)a.hp=100;if(b.hp<35)b.hp=100;world.time=99*60;
 if(!lessonDelay&&lesson>0&&!a.move&&!b.move&&!a.stun&&!b.stun&&Math.abs(a.x-b.x)>195){b.x=clamp(a.x+a.face*135,85,1195);b.face=-a.face;}
 if(lesson===3&&!lessonDelay&&world.frame%105===0&&!b.move&&!b.stun)return {action:'heavy'};
 return {};
}
function tick(){
 if(!playing||paused||loading)return;inputFrame++;
 if(intro>0){intro--;keys.forEach(k=>{k.edges.clear();k.pending=null;});return;}
 if(ko>0){ko--;if(ko===0){if(Math.max(...wins)>=2)matchResult();else{round++;newRound(false);}}return;}
 if(tutorial&&lessonDelay>0){lessonDelay--;if(!lessonDelay){if(lesson===5){finishTutorial();return;}lesson++;setupLesson();}}
 const commands=modes.map((m,i)=>m==='human'?keys[i].sample(inputFrame,world.fighters[i].face):m==='ai'?ais[i].sample(world):{});
 if(tutorial)commands[1]=tutorialCommands();else if(modes.includes('dummy')){world.time=99*60;for(const f of world.fighters)if(f.hp<35)f.hp=100;}
 for(let i=0;i<2;i++)if(commands[i].action==='ultimate'&&world.fighters[i].rage<300&&modes[i]==='human')toast('奥义需要三格怒气');
 const events=world.step(commands);
 for(const e of events){renderer.event(e);
  if(e.type==='cast'){if(!['light','light2','heavy'].includes(e.id))bank.play(e.name,'p'+e.fighter);}
  if(e.type==='active')bank.cast(e.id);
  if(e.type==='hit'){bank.impact(e);if(!e.guarded)bank.stop('p'+e.fighter);}
  if(e.type==='end'){ko=95;if(e.winner>=0)wins[e.winner]++;bank.stopAll();bank.tone(110,35,.7,.27);}
 }
 if(tutorial&&!lessonDelay){
  if(lesson===0){if(Math.abs(world.fighters[0].x-350)>55)lessonMoved=true;if(events.some(e=>e.type==='jump'&&e.fighter===0))lessonJumped=true;if(lessonMoved&&lessonJumped)passedLesson();}
  else if(lesson===1&&events.some(e=>e.type==='hit'&&e.attacker===0))passedLesson();
  else if(lesson===2&&events.some(e=>e.type==='hit'&&e.attacker===0&&e.combo>=3))passedLesson();
  else if(lesson===3&&events.some(e=>e.type==='hit'&&e.fighter===0&&e.guarded))passedLesson();
  else if(lesson===4&&events.some(e=>e.type==='hit'&&e.attacker===0&&e.id==='cross'))passedLesson();
  else if(lesson===5&&events.some(e=>e.type==='hit'&&e.attacker===0&&e.id==='ultimate'))passedLesson();
 }
}
function loop(now){
 const dt=Math.min((now-last)/1000||0,.075);last=now;
 if(!paused&&!loading){visualTime+=dt;renderer.update(dt);if(toastTime>0){toastTime-=dt*60;if(toastTime<=0)$('toast').classList.add('hidden');}}
 if(playing&&!paused&&!loading){acc+=dt;let steps=0;while(acc>=1/60&&steps<5){tick();acc-=1/60;steps++;}}else acc=0;
 renderer.render(world,{t:visualTime,screen,reduced:options.reduced,modes,wins,round,intro,ko,tutorial,debug});requestAnimationFrame(loop);
}
soundUI();bookUI();requestAnimationFrame(loop);
window.__LEX={get world(){return world;},keys,bank,renderer,start,pause:setPause,menu:toMenu,get running(){return playing;},get paused(){return paused;},get intro(){return intro;},get lesson(){return lesson;},get tutorial(){return tutorial;},snapshot:()=>({frame:world.frame,time:world.time,over:world.over,winner:world.winner,modes:[...modes],sounds:bank.buffers.size,paused,round,wins:[...wins],intro,ko,tutorial,lesson,cinematic:world.cinematic,fighters:world.fighters.map(f=>({hp:f.hp,energy:f.energy,rage:f.rage,x:f.x,h:f.h,move:f.move?.def.id||null,stun:f.stun,shield:f.shield,face:f.face,combo:f.combo,comboActive:f.comboActive,comboDamage:f.comboDamage}))})};
})();
