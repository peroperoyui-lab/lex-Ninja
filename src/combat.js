/* Fixed 60 Hz combat. Rendering/audio do not change these rules. */
(function(root){
'use strict';
const FPS=60,GROUND=565,WIDTH=1280,MAX_RAGE=300;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const defs=[
 ['light','掌击',6,5,12,6,142,0,0,'punch','#ffe19a'],
 ['light2','反手掌',5,5,13,5,156,0,0,'punch','#fff3c0'],
 ['heavy','拔刀',12,7,23,11,190,0,0,'slash','#c5f5ff'],
 ['cross','影分身十字斩',13,16,23,8,224,24,100,'cross','#69dcff'],
 ['flame','一刀一刀燃烧刀',18,24,30,7,238,32,150,'flame','#ff913c'],
 ['yoyo','纳米悠悠球',16,1,24,9,0,20,110,'yoyo','#c6ff5c'],
 ['blink','哎呦卧槽闪现',7,1,15,0,0,22,125,'blink','#b18aff'],
 ['rock','岩石耐击术',9,1,21,0,0,24,200,'rock','#89e7d1'],
 ['dragon','奥义升龙',11,20,31,18,190,35,170,'dragon','#fbb8ff'],
 ['death','死神的手',10,5,26,15,148,18,95,'throw','#c097ff'],
 ['ultimate','黑龙武神',26,36,40,9,970,0,240,'beam','#bbadff']
].map(([id,name,startup,active,recovery,damage,range,cost,cooldown,mode,color])=>({id,name,startup,active,recovery,damage,range,cost,cooldown,mode,color,rageCost:id==='ultimate'?MAX_RAGE:0}));
const MOVES=Object.fromEntries(defs.map(d=>[d.id,d]));
const MAPS=[
 {left:'KeyA',right:'KeyD',up:'KeyW',down:'KeyS',j:'KeyJ',k:'KeyK',l:'KeyL',u:'KeyU',i:'KeyI',o:'KeyO'},
 {left:'ArrowLeft',right:'ArrowRight',up:'ArrowUp',down:'ArrowDown',j:'Numpad1',k:'Numpad2',l:'Numpad3',u:'Numpad4',i:'Numpad5',o:'Numpad6'}
];
const CANCELS={light:['light2','heavy','cross','flame','dragon','ultimate'],light2:['heavy','cross','flame','dragon','ultimate'],heavy:['cross','flame','dragon','ultimate'],cross:['ultimate'],flame:['ultimate'],dragon:['ultimate']};
function motion(history,button,frame){
 const h=history.filter(v=>frame-v.frame<=26).map(v=>v.dir).slice(-2).join('');
 if(h==='df')return button==='j'?'cross':'flame';
 if(h==='db')return button==='j'?'yoyo':'blink';
 if(h==='fd'&&button==='k')return 'dragon';
 return button==='j'?'light':'heavy';
}
class Keyboard{
 constructor(map){this.map=map;this.clear();}
 clear(){this.held=new Set();this.edges=new Set();this.history=[];this.pending=null;}
 key(code,on){const k=Object.keys(this.map).find(k=>this.map[k]===code);if(!k)return false;if(on){if(!this.held.has(k))this.edges.add(k);this.held.add(k);}else this.held.delete(k);return true;}
 sample(frame,face){
  const h=this.held,e=this.edges;
  if(e.has('down'))this.history.push({dir:'d',frame});
  for(const k of ['left','right'])if(e.has(k))this.history.push({dir:(k==='right'?1:-1)===face?'f':'b',frame});
  this.history=this.history.filter(v=>frame-v.frame<=26);
  let action=null;
  if((e.has('j')||e.has('k'))&&!this.pending)this.pending={at:frame+4,button:e.has('k')?'k':'j',seen:new Set(),invalid:false};
  if(this.pending){
   for(const k of ['j','k','l'])if(h.has(k)||e.has(k))this.pending.seen.add(k);
   if(h.size>3)this.pending.invalid=true;
   if(frame>=this.pending.at){const p=this.pending;this.pending=null;if(!p.invalid&&h.size<=3)action=p.seen.has('j')&&p.seen.has('k')?(p.seen.has('l')?'ultimate':'death'):motion(this.history,p.button,frame);}
  }
  if(!action&&!this.pending&&h.size<=3){if(e.has('u'))action='cross';else if(e.has('i'))action='yoyo';else if(e.has('o'))action='blink';else if(h.has('down')&&h.has('l')&&(e.has('down')||e.has('l')))action='rock';}
  if(action)this.history=[];
  const cmd={move:(h.has('right')?1:0)-(h.has('left')?1:0),jump:e.has('up'),crouch:h.has('down'),guard:h.has('l')&&!this.pending,action};
  e.clear();return cmd;
 }
}
function fighter(id){return {id,x:id?930:350,h:0,vh:0,kx:0,face:id?-1:1,hp:100,energy:65,rage:0,guard:false,guardMeter:100,guardAt:-999,crouch:false,stun:0,blocked:false,shield:0,invul:0,move:null,buffer:null,cd:{},combo:0,comboActive:false,comboUntil:0,comboDamage:0,maxCombo:0,totalDamage:0,lastHitAt:-999,lastName:'',lastAt:-999,walk:0};}
class World{
 constructor(seed=1387){this.seed=seed>>>0;this.fighters=[fighter(0),fighter(1)];this.frame=0;this.time=99*FPS;this.projectiles=[];this.events=[];this.freeze=0;this.cinematic=0;this.cinematicFighter=0;this.over=false;this.winner=null;}
 random(){let x=this.seed;x^=x<<13;x^=x>>>17;x^=x<<5;this.seed=x>>>0;return this.seed/4294967296;}
 emit(type,data={}){this.events.push({type,...data});}
 resolved(f,id){return id==='light'&&f.move?.def.id==='light'?'light2':id;}
 can(f,id){
  id=this.resolved(f,id);const d=MOVES[id];if(!d||f.hp<=0||f.stun||f.energy<d.cost||f.rage<d.rageCost||f.cd[id]>0)return false;
  if(!f.move)return id!=='light2';
  const m=f.move;return m.confirmed&&m.age>=m.def.startup&&m.age<=m.def.startup+m.def.active+14&&(CANCELS[m.def.id]||[]).includes(id);
 }
 start(f,id){
  if(!this.can(f,id))return false;id=this.resolved(f,id);const d=MOVES[id],cancel=!!f.move;
  f.energy-=d.cost;f.rage-=d.rageCost;f.cd[id]=d.cooldown;f.guard=false;f.move={def:d,age:0,hit:new Set(),confirmed:false};f.lastName=d.name;f.lastAt=this.frame;
  if(id==='blink')f.invul=15;
  if(id==='ultimate'){this.cinematic=38;this.cinematicFighter=f.id;}
  this.emit('cast',{fighter:f.id,id,name:d.name,cancel});return true;
 }
 hit(a,b,d,token){
  if(b.invul>0||b.hp<=0)return;
  let guarded=d.mode!=='throw'&&(b.shield>0||(b.guard&&(a.x-b.x)*b.face>=0));
  const parry=guarded&&b.shield<=0&&this.frame-b.guardAt<=5;
  let broken=false;
  if(guarded&&!parry&&b.shield<=0){b.guardMeter=clamp(b.guardMeter-d.damage*2.5-8,0,100);if(b.guardMeter===0){guarded=false;broken=true;b.guard=false;}}
  if(!guarded){if(!a.comboActive){a.combo=0;a.comboDamage=0;}a.combo++;a.comboActive=true;a.comboUntil=this.frame+95;a.maxCombo=Math.max(a.maxCombo,a.combo);}
  const scale=guarded?1:Math.max(.42,1-(a.combo-1)*.10);
  const damage=parry?0:guarded?Math.max(1,Math.ceil(d.damage*.12)):Math.max(1,Math.round(d.damage*scale));
  b.hp=clamp(b.hp-damage,0,100);b.stun=parry?3:guarded?9:broken?42:d.mode==='flame'?16:d.mode==='beam'?16:d.id==='light'||d.id==='light2'?24:30;b.blocked=guarded;
  if(!guarded){
   b.move=null;b.buffer=null;b.kx=Math.sign(b.x-a.x||a.face)*(d.mode==='beam'?3:d.mode==='punch'?2.4:6);b.energy=clamp(b.energy+damage*.22,0,100);
   if(d.mode==='dragon'||(d.id==='heavy'&&a.combo>=3)){b.vh=8.8;b.h=Math.max(b.h,1);}
   if(a.move&&a.move.def.id===d.id)a.move.confirmed=true;
   a.comboDamage+=damage;a.totalDamage+=damage;a.lastHitAt=this.frame;
  }
  a.energy=clamp(a.energy+(guarded?1:3),0,100);
  // Rage is earned from exchanges, never passive regeneration; supers cannot refund themselves.
  if(d.id!=='ultimate')a.rage=clamp(a.rage+(guarded?4:12+damage*1.3),0,MAX_RAGE);
  b.rage=clamp(b.rage+(parry?16:damage*2.5),0,MAX_RAGE);
  this.freeze=Math.max(this.freeze,parry?9:guarded?4:d.mode==='punch'?6:d.mode==='beam'?6:9);
  this.emit('hit',{fighter:b.id,attacker:a.id,guarded,parry,broken,damage,x:b.x,y:GROUND-b.h-91,color:d.color,id:d.id,token,combo:a.combo});
 }
 step(commands=[{},{}]){
  this.events=[];if(this.over)return this.events;
  if(this.cinematic>0){this.cinematic--;return this.events;}
  // Edge-triggered actions survive hit-stop, but only enter a legal cancel window.
  for(const f of this.fighters)if(commands[f.id]?.action)f.buffer={id:commands[f.id].action,ttl:12};
  if(this.freeze>0){this.freeze--;return this.events;}
  this.frame++;this.time--;
  for(const f of this.fighters){
   const c=commands[f.id]||{},other=this.fighters[1-f.id];
   for(const id of Object.keys(f.cd))f.cd[id]=Math.max(0,f.cd[id]-1);
   f.stun=Math.max(0,f.stun-1);if(!f.stun)f.blocked=false;
   f.shield=Math.max(0,f.shield-1);f.invul=Math.max(0,f.invul-1);f.energy=clamp(f.energy+.095,0,100);
   if(!f.guard&&!f.stun)f.guardMeter=clamp(f.guardMeter+.3,0,100);
   if(!f.move&&!f.stun)f.face=Math.sign(other.x-f.x)||f.face;
   if(f.buffer){if(this.start(f,f.buffer.id))f.buffer=null;else if(--f.buffer.ttl<=0)f.buffer=null;}
   const g=!!c.guard&&!f.move&&f.h===0&&(!f.stun||f.blocked)&&f.guardMeter>0;
   if(g&&!f.guard)f.guardAt=this.frame;f.guard=g;f.crouch=!!c.crouch&&!f.move&&f.h===0;
   if(c.jump&&!f.move&&!f.stun&&f.h===0){f.vh=12.4;f.guard=false;this.emit('jump',{fighter:f.id});}
   f.walk=(!f.move&&!f.stun&&!f.guard&&!f.crouch)?(c.move||0):0;f.x+=f.walk*4.9+f.kx;f.kx*=.75;
   if(f.vh||f.h){f.h+=f.vh;f.vh-=.64;if(f.h<=0){f.h=0;f.vh=0;}}
   const m=f.move;
   if(m){m.age++;const d=m.def;
    if(d.mode==='cross'&&m.age>=d.startup-5&&m.age<d.startup+8)f.x+=f.face*8.0;
    if(d.mode==='dragon'&&m.age===d.startup)f.vh=9.5;
    if(m.age===d.startup){
     this.emit('active',{fighter:f.id,id:d.id,x:f.x,y:GROUND-f.h-90});
     if(d.mode==='blink'){const from=f.x;f.x=clamp(other.x-other.face*145,70,1210);f.face=Math.sign(other.x-f.x)||f.face;this.emit('blink',{fighter:f.id,from,to:f.x});}
     if(d.mode==='rock')f.shield=100;
     if(d.mode==='yoyo')this.projectiles.push({owner:f.id,x:f.x+f.face*78,h:f.h+87,v:f.face*11,age:0,def:d,hit:new Set()});
    }
    if(m.age>=d.startup+d.active+d.recovery)f.move=null;
   }
   f.x=clamp(f.x,70,1210);
  }
  const [a,b]=this.fighters;
  if(Math.abs(a.h-b.h)<105&&Math.abs(a.x-b.x)<118){const s=Math.sign(b.x-a.x)||1,o=(118-Math.abs(b.x-a.x))/2;a.x=clamp(a.x-s*o,70,1210);b.x=clamp(b.x+s*o,70,1210);}
  const strikes=[];
  for(const f of this.fighters){const m=f.move;if(!m)continue;const d=m.def,o=this.fighters[1-f.id];
   if(m.age<d.startup||m.age>=d.startup+d.active||!d.damage||d.mode==='yoyo')continue;
   const span=d.mode==='flame'?8:d.mode==='cross'?8:d.mode==='beam'?9:999,segment=Math.floor((m.age-d.startup)/span);
   if(m.hit.has(segment))continue;const dx=(o.x-f.x)*f.face,dy=Math.abs(o.h-f.h);
   if(dx>=-38&&dx<=d.range&&dy<(d.mode==='dragon'?200:120)&&o.invul===0){m.hit.add(segment);strikes.push([f,o,d,`${f.id}-${f.lastAt}-${segment}`]);}
  }
  for(const p of this.projectiles){p.age++;p.x+=p.v;const o=this.fighters[1-p.owner],segment=p.age<34?0:1;if(p.age===34)p.v=-p.v;
   if(Math.abs(p.x-o.x)<58&&Math.abs(p.h-(o.h+87))<78&&!p.hit.has(segment)&&o.invul===0){p.hit.add(segment);strikes.push([this.fighters[p.owner],o,p.def,`p-${p.owner}-${p.age}`]);}
  }
  this.projectiles=this.projectiles.filter(p=>p.age<72&&p.x>-100&&p.x<1380);
  for(const args of strikes)this.hit(...args);
  for(const f of this.fighters){const o=this.fighters[1-f.id];if(!o.stun)f.comboActive=false;}
  if(a.hp<=0||b.hp<=0||this.time<=0){this.over=true;this.winner=a.hp===b.hp?-1:(a.hp>b.hp?0:1);this.emit('end',{winner:this.winner});}
  return this.events;
 }
}
class AI{
 constructor(id){this.id=id;this.next=0;this.intent={move:0};}
 sample(w){
  const f=w.fighters[this.id],b=w.fighters[1-this.id];
  if(w.frame<this.next)return {...this.intent,action:null,jump:false};this.next=w.frame+10+Math.floor(w.random()*12);
  const dist=Math.abs(f.x-b.x),toward=Math.sign(b.x-f.x),c={move:dist>148?toward:0,guard:false,jump:false,action:null};
  if(f.move?.confirmed){const next=f.move.def.id==='light'?'light':f.move.def.id==='light2'?'heavy':f.rage>=300?'ultimate':'cross';if(w.can(f,next)){c.action=next;this.next=w.frame+8;}}
  else if(b.move&&dist<260&&w.random()<.44){c.guard=true;c.move=0;}
  else if(!f.move&&!f.stun){
   let choices=dist>280?['yoyo','cross','blink']:['light','light','heavy','flame','dragon','death','cross'];
   if(f.rage>=300)choices.push('ultimate','ultimate');if(f.hp<40)choices.push('rock');choices=choices.filter(id=>w.can(f,id));
   if(choices.length&&w.random()<.84)c.action=choices[Math.floor(w.random()*choices.length)];if(dist<120&&w.random()<.15)c.move=-toward;if(dist>190&&w.random()<.12)c.jump=true;
  }
  this.intent=c;return c;
 }
}
const api={FPS,GROUND,WIDTH,MAX_RAGE,MOVES,MAPS,CANCELS,Keyboard,World,AI,motion,clamp};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LexCombat=api;
})(typeof globalThis!=='undefined'?globalThis:this);
