#!/usr/bin/env python3
"""Build one offline HTML. Third-party audio is optional and never fetched remotely."""
import argparse
import base64
import json
from pathlib import Path
import re
import zipfile


def audio_script(path: Path) -> str:
    clips = {}
    with zipfile.ZipFile(path) as archive:
        entries = archive.infolist()
        if len(entries) > 512 or sum(x.file_size for x in entries) > 128 * 1024 * 1024:
            raise ValueError('Audio archive exceeds the 512-file / 128 MB limit')
        for item in entries:
            name = item.filename
            if not item.flag_bits & 2048:
                try:
                    raw = name.encode('cp437')
                    try:
                        name = raw.decode('utf-8')
                    except UnicodeDecodeError:
                        name = raw.decode('gb18030')
                except UnicodeError:
                    pass
            if not name.lower().endswith(('.mp3', '.wav', '.ogg', '.m4a')):
                continue
            stem = Path(name.replace('\\', '/')).stem
            if stem in clips:
                raise ValueError('Duplicate audio name: ' + stem)
            clips[stem] = base64.b64encode(archive.read(item)).decode('ascii')
    return 'window.LEX_AUDIO = ' + json.dumps(clips, ensure_ascii=False) + ';\n'


def build(root: Path, output: Path, audio: Path | None = None,
          audio_zip: Path | None = None) -> None:
    html = (root / 'index.html').read_text(encoding='utf-8')
    css = (root / 'style.css').read_text(encoding='utf-8')
    html = html.replace('<link rel="stylesheet" href="style.css">', '<style>' + css + '</style>')

    def inline(match: re.Match) -> str:
        name = match.group(1)
        if name == 'assets/audio-data.js' and audio_zip:
            script = audio_script(audio_zip)
        else:
            path = audio if name == 'assets/audio-data.js' and audio else root / name
            script = path.read_text(encoding='utf-8')
        return '<script>' + script.replace('</script', '<\\/script') + '</script>'

    html = re.sub(r'<script src="([^"]+)"></script>', inline, html)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(html, encoding='utf-8')
    print(f'{output}: {output.stat().st_size:,} bytes')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path('lexburner-play.html'))
    audio_group = parser.add_mutually_exclusive_group()
    audio_group.add_argument('--audio-js', type=Path)
    audio_group.add_argument('--audio-zip', type=Path)
    args = parser.parse_args()
    try:
        build(Path(__file__).resolve().parents[1], args.output, args.audio_js, args.audio_zip)
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        parser.exit(1, f'Build failed: {error}\n')
