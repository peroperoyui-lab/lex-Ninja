/* User-selected audio stays in this browser. No upload, scraping or external requests. */
(function(root){
'use strict';
class AudioBank{
 constructor(){this.ctx=null;this.buffers=new Map();this.lanes=new Map();this.sources=new Set();this.volume=.65;this.voiceVolume=.9;this.sfxVolume=.7;this.muted=false;this.errors=[];}
 async unlock(){
  if(!this.ctx){
   this.ctx=new (window.AudioContext||window.webkitAudioContext)();this.gain=this.ctx.createGain();this.voiceGain=this.ctx.createGain();this.sfxGain=this.ctx.createGain();
   this.compressor=this.ctx.createDynamicsCompressor();this.compressor.threshold.value=-12;this.compressor.ratio.value=8;
   this.voiceGain.connect(this.gain);this.sfxGain.connect(this.gain);this.gain.connect(this.compressor);this.compressor.connect(this.ctx.destination);this.applyLevels();
  }
  if(this.ctx.state==='suspended')await this.ctx.resume();
 }
 applyLevels(){if(this.gain){this.gain.gain.value=this.muted?0:this.volume;this.voiceGain.gain.value=this.voiceVolume;this.sfxGain.gain.value=this.sfxVolume;}}
 setVolume(v){this.volume=Math.min(1,Math.max(0,Number(v)||0));this.applyLevels();}
 setVoiceVolume(v){this.voiceVolume=Math.min(1,Math.max(0,Number(v)||0));this.applyLevels();}
 setSfxVolume(v){this.sfxVolume=Math.min(1,Math.max(0,Number(v)||0));this.applyLevels();}
 setMuted(v){this.muted=!!v;this.applyLevels();}
 async add(name,bytes){await this.unlock();const key=name.replace(/^.*[\\/]/,'').replace(/\.(wav|mp3|ogg|m4a)$/i,'');const decoded=await this.ctx.decodeAudioData(bytes.slice(0));if(decoded.duration>60)throw Error('音频超过 60 秒：'+name);this.buffers.set(key,decoded);}
 async embedded(data,onProgress=()=>{}){await this.unlock();const entries=Object.entries(data||{});for(let i=0;i<entries.length;i++){const [name,b64]=entries[i];try{const raw=atob(b64),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));await this.add(name,bytes.buffer);}catch(e){this.errors.push(name+': '+e.message);}onProgress(i+1,entries.length);}}
 stop(lane){const old=this.lanes.get(lane);if(old){try{old.stop();}catch{}this.lanes.delete(lane);}}
 stopAll(){for(const lane of [...this.lanes.keys()])this.stop(lane);for(const s of this.sources){try{s.stop();}catch{}}this.sources.clear();}
 play(name,lane='preview'){if(!this.ctx||this.ctx.state!=='running')return false;const b=this.buffers.get(name);if(!b)return false;this.stop(lane);const s=this.ctx.createBufferSource();s.buffer=b;s.connect(this.voiceGain);s.start();this.lanes.set(lane,s);s.onended=()=>{if(this.lanes.get(lane)===s)this.lanes.delete(lane);};return true;}
 tone(f0,f1,duration=.16,volume=.15,type='sine',delay=0){
  if(!this.ctx||this.ctx.state!=='running')return;const o=this.ctx.createOscillator(),g=this.ctx.createGain(),t=this.ctx.currentTime+delay;o.type=type;o.frequency.setValueAtTime(Math.max(20,f0),t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+duration);g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(volume,t+.007);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(this.sfxGain);this.sources.add(o);o.onended=()=>{this.sources.delete(o);o.disconnect();g.disconnect();};o.start(t);o.stop(t+duration+.02);
 }
 noise(duration=.15,volume=.13,cutoff=2400){
  if(!this.ctx||this.ctx.state!=='running')return;const rate=this.ctx.sampleRate,b=this.ctx.createBuffer(1,Math.ceil(rate*duration),rate),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*(1-i/a.length);const s=this.ctx.createBufferSource(),g=this.ctx.createGain(),f=this.ctx.createBiquadFilter();s.buffer=b;f.type='lowpass';f.frequency.value=cutoff;g.gain.value=volume;s.connect(f);f.connect(g);g.connect(this.sfxGain);this.sources.add(s);s.onended=()=>{this.sources.delete(s);s.disconnect();g.disconnect();f.disconnect();};s.start();
 }
 impact(e){if(e.parry){this.tone(1100,680,.3,.1,'triangle');this.tone(1740,920,.22,.06,'sine');}else if(e.guarded){this.tone(600,160,.13,.14,'triangle');this.noise(.08,.13,4400);}else{this.tone(e.id==='ultimate'?110:180,36,.22,.25);this.noise(.11,.19,3900);this.tone(830,260,.08,.075,'triangle');}}
 thump(guarded){this.impact({guarded});}
 cast(id){if(['heavy','cross','flame','dragon'].includes(id)){this.noise(id==='flame'?.22:.13,.09,2100);}if(id==='blink'){this.tone(420,1900,.16,.075,'sine');}if(id==='ultimate'){this.tone(72,38,.65,.3);this.tone(280,780,.55,.05,'sawtooth');}}
 async importFiles(files){await this.unlock();let added=0;const failures=[];
  for(const file of files){try{if(file.size>64*1024*1024)throw Error('文件超过 64 MB');if(/\.zip$/i.test(file.name)){
    const entries=await unzipAudio(await file.arrayBuffer());for(const entry of entries){try{await this.add(entry.name,entry.bytes);added++;}catch(e){failures.push(entry.name+': '+e.message);}}
   }else if(/\.(wav|mp3|ogg|m4a)$/i.test(file.name)){await this.add(file.name,await file.arrayBuffer());added++;}
  }catch(e){failures.push(file.name+': '+e.message);}}
  return {added,failures};
 }
}
async function unzipAudio(buffer){
 const v=new DataView(buffer),u=new Uint8Array(buffer);let end=-1;
 for(let i=u.length-22;i>=Math.max(0,u.length-65557);i--)if(v.getUint32(i,true)===0x06054b50){end=i;break;}
 if(end<0)throw Error('未找到 ZIP 目录');
 const count=v.getUint16(end+10,true);let off=v.getUint32(end+16,true),total=0;const out=[];
 if(count>512)throw Error('最多支持 512 个文件');
 for(let n=0;n<count;n++){
  if(off+46>u.length||v.getUint32(off,true)!==0x02014b50)throw Error('ZIP 目录损坏');
  const flags=v.getUint16(off+8,true),method=v.getUint16(off+10,true),size=v.getUint32(off+20,true),plain=v.getUint32(off+24,true),nl=v.getUint16(off+28,true),el=v.getUint16(off+30,true),cl=v.getUint16(off+32,true),local=v.getUint32(off+42,true);
  const name=zipName(u.slice(off+46,off+46+nl),u.slice(off+46+nl,off+46+nl+el),flags);off+=46+nl+el+cl;
  if(!/\.(wav|mp3|ogg|m4a)$/i.test(name))continue;
  if(flags&1)throw Error('不支持加密 ZIP');if(plain>16*1024*1024||(total+=plain)>128*1024*1024)throw Error('解压大小超限');
  if(local+30>u.length||v.getUint32(local,true)!==0x04034b50)throw Error('ZIP 文件头损坏');
  const start=local+30+v.getUint16(local+26,true)+v.getUint16(local+28,true);if(start+size>u.length)throw Error('ZIP 数据不完整');
  let bytes=u.slice(start,start+size);
  if(method===8){if(typeof DecompressionStream==='undefined')throw Error('浏览器不支持 ZIP 解压，请先解压后多选 WAV');
   const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();const chunks=[];let len=0;
   for(;;){const r=await reader.read();if(r.done)break;len+=r.value.length;if(len>plain||len>16*1024*1024){await reader.cancel();throw Error('ZIP 解压长度超限');}chunks.push(r.value);}
   bytes=new Uint8Array(len);let p=0;for(const chunk of chunks){bytes.set(chunk,p);p+=chunk.length;}
  }else if(method!==0)throw Error('不支持的 ZIP 压缩方式 '+method);
  if(bytes.length!==plain)throw Error('ZIP 文件长度校验失败：'+name);
  out.push({name,bytes:bytes.buffer});
 }
 return out;
}
// Some Windows ZIPs contain UTF-8 names with bit 11 unset, plus Info-ZIP 0x7075.
function zipName(raw,extra,flags){
 const utf8=new TextDecoder('utf-8',{fatal:true});
 if(flags&2048)return utf8.decode(raw);
 const view=new DataView(extra.buffer,extra.byteOffset,extra.byteLength);
 for(let p=0;p+4<=extra.length;){const id=view.getUint16(p,true),n=view.getUint16(p+2,true);if(p+4+n>extra.length)break;
  if(id===0x7075&&n>=5&&extra[p+4]===1){try{return utf8.decode(extra.slice(p+9,p+4+n));}catch{}}
  p+=4+n;
 }
 try{return utf8.decode(raw);}catch{return new TextDecoder('gb18030').decode(raw);}
}
root.LexAudio={AudioBank,unzipAudio,zipName};
})(window);
