"""Copies game/index.html into android/assets/game/ and embeds its fonts so the app runs fully offline (android/build.sh runs this)."""
import base64
import collections
import os
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]

SRC = REPO / 'game' / 'index.html'
FONT_CSS = REPO / 'tests' / 'fonts' / 'fonts.css'
FONT_DIR = REPO / 'tests' / 'fonts' / 'gstatic'
OUT = REPO / 'android' / 'assets' / 'game' / 'index.html'

html = open(SRC, encoding='utf-8').read()
lines = [l for l in html.split('\n') if 'fonts.googleapis.com' not in l and 'fonts.gstatic.com' not in l]
html = '\n'.join(lines)
assert 'fonts.googleapis' not in html and 'fonts.gstatic' not in html

css = open(FONT_CSS, encoding='utf-8').read()
groups = collections.OrderedDict()
for subset, body in re.findall(r'/\* ([a-z-]+) \*/\s*@font-face \{(.*?)\}', css, re.S):
    if subset not in ('latin', 'latin-ext'):
        continue
    family = re.search(r"font-family: '([^']+)'", body).group(1)
    weight = int(re.search(r'font-weight: (\d+)', body).group(1))
    url = re.search(r'url\((https://fonts\.gstatic\.com/[^)]+)\)', body).group(1)
    urange = re.search(r'unicode-range: ([^;]+);', body).group(1)
    g = groups.setdefault((family, url), {'weights': [], 'range': urange})
    g['weights'].append(weight)

faces = []
for (family, url), g in groups.items():
    with open(os.path.join(FONT_DIR, url.split('fonts.gstatic.com/')[1]), 'rb') as f:
        b64 = base64.b64encode(f.read()).decode()
    ws = sorted(g['weights'])
    weight = str(ws[0]) if len(ws) == 1 else f'{ws[0]} {ws[-1]}'
    faces.append(f"@font-face{{font-family:'{family}';font-style:normal;font-weight:{weight};font-display:swap;"
                 f"src:url(data:font/woff2;base64,{b64}) format('woff2');unicode-range:{g['range']};}}")

html = html.replace('<style>', '<style id="fonts">\n' + '\n'.join(faces) + '\n</style>\n<style>', 1)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    f.write(html)
print(f'{len(faces)} font faces embedded, {len(html) // 1024} KB -> {OUT}')
