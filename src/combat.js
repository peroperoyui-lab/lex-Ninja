/* Pure, fixed-step combat and input. No browser APIs; also loaded by node:test. */
(function(root){
'use strict';
const FPS=60, GROUND=505, WIDTH=1280;
const defs=[
 ['light','掌击',6,5,12,6,120,0,0,'punch','#e9c477'],
 ['heavy','拔刀',12,7,23,11,175,0,0,'slash','#eee6c9'],
 ['cross','影分身十字斩',13,12,23,17,190,24,100,'cross','#b4d9ee'],
 ['flame','一刀一刀燃烧刀',18,24,30,8,205,32,150,'flame','#ff963e'],
 ['yoyo','纳米悠悠球',16,1,24,10,0,20,110,'yoyo','#b7e286'],
 ['blink','哎呦卧槽闪现',7,1,15,0,0,22,125,'blink','#b3b4ef'],
 ['rock','岩石耐击术',9,1,21,0,0,24,200,'rock','#83cbbb'],
 ['dragon','奥义升龙',11,17,31,22,160,35,170,'dragon','#f4c271'],
 ['death','死神的手',10,5,26,15,120,18,95,'throw','#d5a7cb'],
 ['ultimate','黑龙武神',42,18,46,38,850,90,360,'beam','#edcc79']
].map(([id,name,startup,active,recovery,damage,range,cost,cooldown,mode,color])=>({id,name,startup,active,recovery,damage,range,cost,cooldown,mode,color}));
const MOVES=Object.fromEntries(defs.map(d=>[d.id,d]));
const MAPS=[{left:'KeyA',right:'KeyD',up:'KeyW',down:'KeyS',j:'KeyJ',k:'KeyK',l:'KeyL',u:'KeyU',i:'KeyI',o:'KeyO'}, {left:'ArrowLeft',right:'ArrowRight',up:'ArrowUp',down:'ArrowDown',j:'Numpad1',k:'Numpad2',l:'Numpad3',u:'Numpad4',i:'Numpad5',o:'Numpad6'}];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
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
 key(code,on){const key=Object.keys(this.map).find(k=>this.map[k]===code);if(!key)return false;if(on){if(!this.held.has(key))this.edges.add(key);this.held.add(key);}else this.held.delete(key);return true;}
 sample(frame,face){
  const h=this.held,e=this.edges;
  if(e.has('down'))this.history.push({dir:'d',frame});
  for(const key of ['left','right'])if(e.has(key))this.history.push({dir:(key==='right'?1:-1)===face?'f':'b',frame});
  this.history=this.history.filter(v=>frame-v.frame<=26);
  let action=null;
  if(e.has('j')||e.has('k')){
   if(!this.pending)this.pending={at:frame+4,button:e.has('k')?'k':'j',seen:new Set()};
  }
  if(this.pending){
   for(const key of ['j','k','l'])if(h.has(key)||e.has(key))this.pending.seen.add(key);
   if(frame>=this.pending.at){const p=this.pending;this.pending=null;
    if(h.size<=3){action=p.seen.has('j')&&p.seen.has('k')?(p.seen.has('l')?'ultimate':'death'):motion(this.history,p.button,frame);}
   }
  }
  if(!action&&!this.pending&&h.size<=3){
   if(e.has('u'))action='cross';else if(e.has('i'))action='yoyo';else if(e.has('o'))action='blink';else if(e.has('l')&&h.has('down'))action='rock';
  }
  if(action)this.history=[];
  const cmd={move:(h.has('right')?1:0)-(h.has('left')?1:0),jump:e.has('up'),crouch:h.has('down'),guard:h.has('l')&&!this.pending,action};
  this.edges.clear();return cmd;
 }
}
function fighter(id){return {id,x:id?910:370,h:0,vh:0,kx:0,face:id?-1:1,hp:100,energy:65,guard:false,crouch:false,stun:0,blocked:false,shield:0,invul:0,move:null,buffer:null,cd:{},combo:0,comboUntil:0,lastName:'',lastAt:-999,walk:0};}
class World{
 constructor(seed=1387){this.seed=seed>>>0;this.fighters=[fighter(0),fighter(1)];this.frame=0;this.time=99*FPS;this.projectiles=[];this.events=[];this.freeze=0;this.over=false;this.winner=null;}
 random(){let x=this.seed;x^=x<<13;x^=x>>>17;x^=x<<5;this.seed=x>>>0;return this.seed/4294967296;}
 emit(type,data={}){this.events.push({type,...data});}
 can(f,id){const d=MOVES[id];return !!d&&!f.move&&f.stun===0&&f.hp>0&&f.energy>=d.cost&&!(f.cd[id]>0);}
 start(f,id){
  if(!this.can(f,id))return false;const d=MOVES[id];f.energy-=d.cost;f.cd[id]=d.cooldown;f.guard=false;f.move={def:d,age:0,hit:new Set(),spawned:false};f.lastName=d.name;f.lastAt=this.frame;
  if(id==='blink')f.invul=14;
  this.emit('cast',{fighter:f.id,id,name:d.name});return true;
 }
 hit(a,b,d,token){
  if(b.invul>0||b.hp<=0)return;
  const guarded=d.mode!=='throw'&&(b.shield>0||(b.guard&&(a.x-b.x)*b.face>=0));
  const damage=guarded?Math.max(1,Math.ceil(d.damage*.12)):d.damage;
  b.hp=clamp(b.hp-damage,0,100);b.stun=guarded?8:Math.min(24,10+Math.floor(damage/2));b.blocked=guarded;
  if(!guarded){b.move=null;b.buffer=null;b.kx=Math.sign(b.x-a.x||a.face)*(d.mode==='beam'?13:6);b.energy=clamp(b.energy+damage*.3,0,100);}
  a.energy=clamp(a.energy+(guarded?1:3),0,100);
  if(!guarded){a.combo=this.frame<a.comboUntil?a.combo+1:1;a.comboUntil=this.frame+65;}
  this.freeze=Math.max(this.freeze,guarded?2:4);
  this.emit('hit',{fighter:b.id,attacker:a.id,guarded,damage,x:b.x,y:GROUND-b.h-85,color:d.color,token});
 }
 step(commands=[{},{}]){
  this.events=[];if(this.over)return this.events;
  // Capture edge-triggered intents even during hit-stop; consume after the freeze.
  for(const f of this.fighters)if(commands[f.id]?.action)f.buffer={id:commands[f.id].action,ttl:10};
  if(this.freeze>0){this.freeze--;return this.events;}
  this.frame++;this.time--;
  for(const f of this.fighters){
   const c=commands[f.id]||{},other=this.fighters[1-f.id];
   for(const id of Object.keys(f.cd))f.cd[id]=Math.max(0,f.cd[id]-1);
   f.stun=Math.max(0,f.stun-1);if(!f.stun)f.blocked=false;f.shield=Math.max(0,f.shield-1);f.invul=Math.max(0,f.invul-1);f.energy=clamp(f.energy+.075,0,100);
   if(!f.move&&!f.stun)f.face=Math.sign(other.x-f.x)||f.face;
   if(f.buffer){if(this.start(f,f.buffer.id))f.buffer=null;else if(--f.buffer.ttl<=0)f.buffer=null;}
   f.guard=!!c.guard&&!f.move&&f.h===0&&(!f.stun||f.blocked);f.crouch=!!c.crouch&&!f.move&&f.h===0;
   if(c.jump&&!f.move&&!f.stun&&f.h===0){f.vh=12.4;f.guard=false;}
   f.walk=(!f.move&&!f.stun&&!f.guard&&!f.crouch)?(c.move||0):0;
   f.x+=f.walk*4.1+f.kx;f.kx*=.76;
   if(f.vh||f.h){f.h+=f.vh;f.vh-=.62;if(f.h<=0){f.h=0;f.vh=0;}}
   const m=f.move;
   if(m){m.age++;const d=m.def;
    if(d.mode==='cross'&&m.age>=d.startup-5&&m.age<d.startup+8)f.x+=f.face*7.5;
    if(d.mode==='dragon'&&m.age===d.startup)f.vh=10;
    if(m.age===d.startup){
     if(d.mode==='blink'){f.x=clamp(other.x-other.face*145,70,1210);f.face=Math.sign(other.x-f.x)||f.face;this.emit('blink',{fighter:f.id});}
     if(d.mode==='rock')f.shield=100;
     if(d.mode==='yoyo')this.projectiles.push({owner:f.id,x:f.x+f.face*75,h:f.h+85,v:f.face*9,age:0,def:d,hit:new Set()});
    }
    if(m.age>=d.startup+d.active+d.recovery)f.move=null;
   }
   f.x=clamp(f.x,70,1210);
  }
  const [a,b]=this.fighters;
  if(Math.abs(a.h-b.h)<105&&Math.abs(a.x-b.x)<118){const s=Math.sign(b.x-a.x)||1,over=(118-Math.abs(b.x-a.x))/2;a.x=clamp(a.x-s*over,70,1210);b.x=clamp(b.x+s*over,70,1210);}
  // Collect first, then apply: same-tick strikes may trade rather than favour P1.
  const strikes=[];
  for(const f of this.fighters){const m=f.move;if(!m)continue;const d=m.def,other=this.fighters[1-f.id];
   if(m.age<d.startup||m.age>=d.startup+d.active||!d.damage||d.mode==='yoyo')continue;
   const segment=d.mode==='flame'?Math.floor((m.age-d.startup)/8):0;
   if(m.hit.has(segment))continue;
   const dx=(other.x-f.x)*f.face,dy=Math.abs(other.h-f.h);
   if(dx>=-30&&dx<=d.range&&dy<(d.mode==='dragon'?180:105)&&other.invul===0){m.hit.add(segment);strikes.push([f,other,d,`${f.id}-${f.lastAt}-${segment}`]);}
  }
  for(const p of this.projectiles){p.age++;p.x+=p.v;const other=this.fighters[1-p.owner];const segment=p.age<34?0:1;
   if(p.age===34)p.v=-p.v;
   if(Math.abs(p.x-other.x)<55&&Math.abs(p.h-(other.h+85))<75&&!p.hit.has(segment)&&other.invul===0){p.hit.add(segment);strikes.push([this.fighters[p.owner],other,p.def,`p-${p.owner}-${p.age}`]);}
  }
  this.projectiles=this.projectiles.filter(p=>p.age<72&&p.x>-100&&p.x<1380);
  for(const hit of strikes)this.hit(...hit);
  if(a.hp<=0||b.hp<=0||this.time<=0){this.over=true;this.winner=a.hp===b.hp?-1:(a.hp>b.hp?0:1);this.emit('end',{winner:this.winner});}
  return this.events;
 }
}
class AI{
 constructor(id){this.id=id;this.next=0;this.intent={move:0};}
 sample(w){const f=w.fighters[this.id],b=w.fighters[1-this.id];
  if(w.frame<this.next)return {...this.intent,action:null,jump:false};
  this.next=w.frame+18+Math.floor(w.random()*10);
  const dist=Math.abs(f.x-b.x),toward=Math.sign(b.x-f.x),c={move:dist>155?toward:0,guard:false,jump:false,action:null};
  if(b.move&&dist<235&&w.random()<.52){c.guard=true;c.move=0;}
  else if(!f.move&&!f.stun){
   let choices=dist>280?['yoyo','cross','blink']:['light','heavy','flame','dragon','death','cross'];
   if(f.energy>=90)choices.push('ultimate');if(f.hp<40)choices.push('rock');
   choices=choices.filter(id=>w.can(f,id));if(choices.length&&w.random()<.82)c.action=choices[Math.floor(w.random()*choices.length)];
   if(dist<125&&w.random()<.2)c.move=-toward;
   if(dist>190&&w.random()<.15)c.jump=true;
  }
  this.intent=c;return c;
 }
}
const api={FPS,GROUND,WIDTH,MOVES,MAPS,Keyboard,World,AI,motion,clamp};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LexCombat=api;
})(typeof globalThis!=='undefined'?globalThis:this);
