/* User-selected audio stays in this browser. No upload, scraping or external requests. */
(function(root){
'use strict';
class AudioBank{
 constructor(){this.ctx=null;this.buffers=new Map();this.lanes=new Map();this.volume=.6;this.muted=false;this.errors=[];}
 async unlock(){if(!this.ctx){this.ctx=new (window.AudioContext||window.webkitAudioContext)();this.gain=this.ctx.createGain();this.gain.gain.value=this.volume;this.compressor=this.ctx.createDynamicsCompressor();this.compressor.threshold.value=-12;this.gain.connect(this.compressor);this.compressor.connect(this.ctx.destination);}if(this.ctx.state==='suspended')await this.ctx.resume();}
 setVolume(value){this.volume=value;if(this.gain)this.gain.gain.value=this.muted?0:value;}
 async add(name,bytes){await this.unlock();const key=name.replace(/^.*[\\/]/,'').replace(/\.(wav|mp3|ogg|m4a)$/i,'');const decoded=await this.ctx.decodeAudioData(bytes.slice(0));if(decoded.duration>60)throw Error('音频超过 60 秒：'+name);this.buffers.set(key,decoded);}
 async embedded(data){await this.unlock();for(const [name,b64]of Object.entries(data||{})){try{const raw=atob(b64),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));await this.add(name,bytes.buffer);}catch(e){this.errors.push(name+': '+e.message);}}}
 stop(lane){const old=this.lanes.get(lane);if(old){try{old.stop();}catch{}this.lanes.delete(lane);}}
 stopAll(){for(const lane of [...this.lanes.keys()])this.stop(lane);}
 play(name,lane='preview'){if(!this.ctx||this.ctx.state!=='running')return false;const b=this.buffers.get(name);if(!b)return false;this.stop(lane);const s=this.ctx.createBufferSource();s.buffer=b;s.connect(this.gain);s.start();this.lanes.set(lane,s);s.onended=()=>{if(this.lanes.get(lane)===s)this.lanes.delete(lane);};return true;}
 thump(guarded){if(!this.ctx||this.muted)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain(),t=this.ctx.currentTime;o.type=guarded?'triangle':'sine';o.frequency.setValueAtTime(guarded?400:150,t);o.frequency.exponentialRampToValueAtTime(40,t+.1);g.gain.setValueAtTime(.12,t);g.gain.exponentialRampToValueAtTime(.001,t+.12);o.connect(g);g.connect(this.gain);o.start(t);o.stop(t+.13);}
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
  const name=new TextDecoder(flags&2048?'utf-8':'gb18030').decode(u.slice(off+46,off+46+nl));off+=46+nl+el+cl;
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
root.LexAudio={AudioBank,unzipAudio};
})(window);
