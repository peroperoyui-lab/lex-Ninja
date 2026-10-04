const test=require('node:test');const assert=require('node:assert/strict');const {World,Keyboard,MAPS}=require('../src/combat.js');
function ticks(w,n){for(let i=0;i<n;i++)w.step([{},{}]);}

test('special input is retained during hit-stop',()=>{const w=new World();w.freeze=4;w.step([{action:'yoyo'},{}]);ticks(w,4);assert.equal(w.fighters[0].move.def.id,'yoyo');});
test('simultaneous lethal hits trade into a draw',()=>{const w=new World();w.fighters[0].x=500;w.fighters[1].x=619;for(const f of w.fighters){f.hp=6;w.start(f,'light');}ticks(w,6);assert.equal(w.winner,-1);assert.ok(w.over);});
test('opposite directions are neutral',()=>{const k=new Keyboard(MAPS[0]);k.key('KeyA',true);k.key('KeyD',true);assert.equal(k.sample(1,1).move,0);});

const vm=require('node:vm'),fs=require('node:fs');const sandbox={window:{},TextDecoder,Uint8Array,DataView};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../src/audio.js'),'utf8'),sandbox);
const zipName=sandbox.window.LexAudio.zipName;
test('unflagged UTF-8 ZIP filenames stay readable',()=>{const raw=new TextEncoder().encode('影分身十字斩.wav');assert.equal(zipName(raw,new Uint8Array(),0),'影分身十字斩.wav');});
test('GB18030 ZIP filename fallback works',()=>{const raw=Uint8Array.from([0xc8,0xcc,0xca,0xf5,0x2e,0x77,0x61,0x76]);assert.equal(zipName(raw,new Uint8Array(),0),'忍术.wav');});
