#!/usr/bin/env python3
"""Transcode an explicitly supplied audio ZIP into a smaller browser pack; keep names.
Requires ffmpeg. Original archive is never modified. No network requests.
"""
import argparse,concurrent.futures,hashlib,io,json,subprocess,tempfile,zipfile
from pathlib import Path

def prepare(source,output):
    rows=[]
    with zipfile.ZipFile(source) as z, tempfile.TemporaryDirectory() as tmp:
        entries=z.infolist()
        if len(entries)>512 or sum(i.file_size for i in entries)>128*1024*1024:
            raise ValueError('Audio archive limit exceeded')
        jobs=[];names=set()
        for i,item in enumerate(entries):
            name=item.filename
            if not item.flag_bits&2048:
                try:
                    raw_name=name.encode('cp437')
                    try:name=raw_name.decode('utf-8')
                    except UnicodeDecodeError:name=raw_name.decode('gb18030')
                except UnicodeError:pass
            if not name.lower().endswith(('.wav','.mp3','.ogg','.m4a')):continue
            stem=Path(name.replace('\\','/')).stem
            if stem in names:raise ValueError('Duplicate name: '+stem)
            names.add(stem);data=z.read(item)
            raw=Path(tmp)/f'{i:03d}{Path(name).suffix}'
            out=Path(tmp)/f'{i:03d}.mp3'
            raw.write_bytes(data)
            rows.append({'name':stem,'original':name,'original_bytes':len(data),'original_sha256':hashlib.sha256(data).hexdigest()})
            jobs.append((raw,out,stem))
        def convert(job):
            raw,out,stem=job
            subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-nostdin','-y','-i',str(raw),'-vn','-ac','1','-ar','22050','-codec:a','libmp3lame','-b:a','64k','-map_metadata','-1',str(out)],check=True,timeout=30)
            return stem,out.read_bytes()
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            converted=list(pool.map(convert,jobs))
        Path(output).parent.mkdir(parents=True,exist_ok=True)
        with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED) as target:
            for stem,data in converted:target.writestr(stem+'.mp3',data)
    index={name:data for name,data in converted}
    for r in rows:
        r['browser_bytes']=len(index[r['name']]);r['browser_sha256']=hashlib.sha256(index[r['name']]).hexdigest();r['encoding']='MP3 / 64 kbit/s / mono / 22050 Hz'
    Path(output).with_suffix('.manifest.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'{len(converted)} clips; {Path(output).stat().st_size:,} byte ZIP; originals unchanged')
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('output',type=Path);a=p.parse_args();prepare(a.source,a.output)
