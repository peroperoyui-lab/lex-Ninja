#!/usr/bin/env python3
"""Build one offline HTML. Optional --audio-zip embeds user-supplied WAVs (no downloads)."""
import argparse,base64,json,re,zipfile,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def build(audio_zip=None,output=None):
    html=(ROOT/'index.html').read_text(encoding='utf-8')
    audio={};manifest=[]
    if audio_zip:
        with zipfile.ZipFile(audio_zip) as z:
            if len(z.infolist())>512: raise ValueError('Too many ZIP entries')
            total=0
            for i in z.infolist():
                name=i.filename
                if not i.flag_bits&2048:
                    try:name=name.encode('cp437').decode('gb18030')
                    except (UnicodeError,LookupError):pass
                if not name.lower().endswith(('.wav','.mp3','.ogg','.m4a')):continue
                total+=i.file_size
                if i.file_size>16*1024*1024 or total>128*1024*1024:raise ValueError('Archive size limit exceeded')
                b=z.read(i);key=Path(name.replace('\\','/')).stem
                if key in audio:raise ValueError('Duplicate audio name: '+key)
                audio[key]=base64.b64encode(b).decode('ascii')
                manifest.append({'name':key,'original':name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
    def script(m):
        path=m.group(1)
        source='window.LEX_AUDIO='+json.dumps(audio,ensure_ascii=False)+';' if path=='assets/audio-data.js' else (ROOT/path).read_text(encoding='utf-8')
        return '<script>'+source.replace('</script','<\\/script')+'</script>'
    html=html.replace('<link rel="stylesheet" href="style.css">','<style>'+(ROOT/'style.css').read_text(encoding='utf-8')+'</style>')
    html=re.sub(r'<script src="([^"]+)"></script>',script,html)
    out=Path(output) if output else ROOT/'dist'/'lexburner-play.html'
    out.parent.mkdir(parents=True,exist_ok=True);out.write_text(html,encoding='utf-8')
    (out.parent/'audio-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'Built {out}: {out.stat().st_size:,} bytes; {len(audio)} embedded audio clips')
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--audio-zip',type=Path);p.add_argument('--output',type=Path);a=p.parse_args();build(a.audio_zip,a.output)
