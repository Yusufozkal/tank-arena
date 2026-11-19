"""Renders the launcher icons (legacy + adaptive foreground) with the game's own tank drawing."""
import base64
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

DENSITIES = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}

PAGE = r"""<!DOCTYPE html><html><body><script>
const TAU = Math.PI * 2;
function rrectPath(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function rrect(g, x, y, w, h, r) { g.beginPath(); rrectPath(g, x, y, w, h, r); }
const S = { len: 40, wid: 34, tread: 8, tR: 10, barrel: 26, bW: 6, col: { body: '#3d86ad', dk: '#235b7b', hi: '#7cc0e2', acc: '#f2c14e' } };
function barrel(g, s, c) {
  const x0 = s.tR * 0.4, len = s.barrel - s.tR * 0.4;
  g.fillStyle = c.dk; g.fillRect(x0, -s.bW / 2, len, s.bW);
  g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(x0, -s.bW / 2 + 1, len, 1.2);
  g.fillStyle = '#1f1d19'; g.fillRect(x0 + len - 5, -s.bW / 2 - 1, 5, s.bW + 2);
}
function tank(g, x, y, angle) {
  const s = S, c = s.col, L = s.len, W = s.wid, tw = s.tread, tr = s.tR;
  g.save(); g.translate(x + 2.6, y + 3.6); g.rotate(angle); g.fillStyle = 'rgba(70,45,15,.38)'; rrect(g, -L / 2, -W / 2, L, W, 6); g.fill(); g.restore();
  g.save(); g.translate(x, y); g.rotate(angle);
  g.fillStyle = '#1f1d19'; rrect(g, -L / 2, -W / 2, L, tw, 3); g.fill(); rrect(g, -L / 2, W / 2 - tw, L, tw, 3); g.fill();
  g.fillStyle = '#4b473e';
  for (let k = -L / 2 + 2; k < L / 2 - 1.5; k += 5) { g.fillRect(k, -W / 2 + 1.3, 1.7, tw - 2.6); g.fillRect(k, W / 2 - tw + 1.3, 1.7, tw - 2.6); }
  const hx = -L / 2 + 2.5, hw = L - 5, hy = -W / 2 + tw - 2.5, hh = W - 2 * tw + 5;
  g.fillStyle = c.dk; rrect(g, hx, hy, hw, hh, 4); g.fill();
  g.fillStyle = c.body; rrect(g, hx + 1.5, hy + 1.5, hw - 3, hh - 3, 3); g.fill();
  g.globalAlpha = 0.75; g.fillStyle = c.hi; g.fillRect(hx + hw - 8.5, hy + 3, 4, hh - 6); g.globalAlpha = 1;
  g.fillStyle = c.dk; for (let k = 0; k < 3; k++) g.fillRect(hx + 3.5 + k * 3.2, hy + 4, 1.6, hh - 8);
  g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1.3; rrect(g, -L / 2, -W / 2, L, W, 4); g.stroke();
  barrel(g, s, c);
  g.fillStyle = c.dk; rrect(g, -tr * 1.05 - 1.5, -tr * 0.9 - 1.5, tr * 1.95 + 3, tr * 1.8 + 3, tr * 0.55); g.fill();
  g.fillStyle = c.body; rrect(g, -tr * 1.05, -tr * 0.9, tr * 1.95, tr * 1.8, tr * 0.5); g.fill();
  g.globalAlpha = 0.5; g.fillStyle = c.hi; rrect(g, -tr * 0.85, -tr * 0.72, tr * 1.45, tr * 0.5, tr * 0.25); g.fill(); g.globalAlpha = 1;
  g.fillStyle = c.dk; g.beginPath(); g.arc(-tr * 0.35, tr * 0.28, tr * 0.3, 0, TAU); g.fill();
  g.fillStyle = c.acc; g.beginPath(); g.moveTo(tr * 0.6, 0); g.lineTo(tr * 0.05, -tr * 0.4); g.lineTo(tr * 0.05, tr * 0.4); g.closePath(); g.fill();
  g.restore();
}
// Foreground artwork in a 108-unit square (adaptive icon grid); safe zone is the central 66-unit circle.
function art(g) {
  const cx = 54, cy = 54, R = 31, a = -Math.PI / 4;
  g.save();
  g.beginPath(); g.arc(cx, cy, R, 0, TAU);
  const gr = g.createRadialGradient(cx - 6, cy - 8, 4, cx, cy, R);
  gr.addColorStop(0, '#dcc497'); gr.addColorStop(1, '#c4a879');
  g.fillStyle = gr; g.fill();
  g.clip();
  // pebbles
  g.fillStyle = '#ad9168';
  [[34, 40, 1.4], [70, 32, 1.1], [76, 66, 1.6], [40, 72, 1.2], [58, 80, 1], [30, 58, 1]].forEach(([x, y, r]) => { g.beginPath(); g.ellipse(x, y, r * 1.4, r, 0.4, 0, TAU); g.fill(); });
  // tread marks leading into the tank from the lower left
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux, off = S.wid / 2 - S.tread / 2;
  g.strokeStyle = 'rgba(84,60,32,.30)'; g.lineWidth = 5.5; g.lineCap = 'butt';
  for (const sgn of [-1, 1]) {
    g.beginPath();
    g.moveTo(cx - ux * 40 + nx * off * sgn, cy - uy * 40 + ny * off * sgn);
    g.lineTo(cx - ux * 12 + nx * off * sgn, cy - uy * 12 + ny * off * sgn);
    g.stroke();
  }
  g.restore();
  g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 1.2; g.beginPath(); g.arc(cx, cy, R - 0.6, 0, TAU); g.stroke();
  tank(g, cx + 1, cy - 1, a);
}
function render(size, legacy) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const g = cv.getContext('2d');
  if (legacy) {
    const k = size / 48;
    g.scale(k, k);
    g.fillStyle = '#262a1d'; rrect(g, 0, 0, 48, 48, 10.5); g.fill();
    g.save(); rrect(g, 0, 0, 48, 48, 10.5); g.clip();
    g.translate(-12, -12); g.scale(48 / 72, 48 / 72);
    art(g); g.restore();
  } else {
    const k = size / 108; g.scale(k, k); art(g);
  }
  return cv.toDataURL('image/png');
}
function preview(size) {
  // what a phone launcher shows for the adaptive icon (circle mask) next to the legacy icon
  const cv = document.createElement('canvas'); cv.width = size * 2 + 60; cv.height = size + 40;
  const g = cv.getContext('2d'); g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, cv.width, cv.height);
  const fg = document.createElement('canvas'); fg.width = fg.height = size * 1.5;
  const fgc = fg.getContext('2d'); fgc.scale(size * 1.5 / 108, size * 1.5 / 108); art(fgc);
  g.save(); g.beginPath(); g.arc(20 + size / 2, 20 + size / 2, size / 2, 0, TAU); g.clip();
  g.fillStyle = '#262a1d'; g.fillRect(20, 20, size, size);
  g.drawImage(fg, 20 - size * 0.25, 20 - size * 0.25); g.restore();
  const lg = new Image(); return new Promise(res => { lg.onload = () => { g.drawImage(lg, size + 40, 20, size, size); res(cv.toDataURL('image/png')); }; lg.src = render(size, true); });
}
</script></body></html>"""

with sync_playwright() as p:
    ANDROID = Path(__file__).resolve().parents[1]  # set here: tools/assets.py reuses the code above this block
    RES = str(ANDROID / 'res')
    browser = p.chromium.launch()
    page = browser.new_page()
    page.set_content(PAGE)
    for name, d in DENSITIES.items():
        folder = os.path.join(RES, f'mipmap-{name}')
        os.makedirs(folder, exist_ok=True)
        for fname, size, legacy in (('ic_launcher.png', round(48 * d), True), ('ic_launcher_foreground.png', round(108 * d), False)):
            data = page.evaluate(f'render({size}, {"true" if legacy else "false"})')
            with open(os.path.join(folder, fname), 'wb') as f:
                f.write(base64.b64decode(data.split(',', 1)[1]))
    data = page.evaluate('preview(256)')
    (ANDROID.parent / '.tmp').mkdir(exist_ok=True)
    with open(ANDROID.parent / '.tmp' / 'icon_preview.png', 'wb') as f:
        f.write(base64.b64decode(data.split(',', 1)[1]))
    browser.close()
print('icons written')
