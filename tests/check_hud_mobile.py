"""Phone HUD footprint: full-screen screenshots (portrait + landscape, two states) and how far down the top HUD reaches.
Usage: python3 tests/check_hud_mobile.py <tag>   (shots in .tmp/hud/<tag>_*.png)
After the 1.2.1 compaction: portrait 106 px of 844 (12.6%), landscape 70 px of 390 (17.9%)."""
import sys
from common import *  # noqa: F401,F403
TAG = sys.argv[1]
OUT = str(TMP / 'hud'); os.makedirs(OUT, exist_ok=True)
VPS = {'p390': (390, 844), 'p360': (360, 740), 'l844': (844, 390), 'l740': (740, 360)}
STATES = {
    'mid':  "(() => { const t = __tank, G = t.G; for (const k of Object.keys(G.buffs)) G.buffs[k] = 0; G.buffs.shield = 6; G.buffMax.shield = 8; G.buffs.speed = 4; G.buffMax.speed = 8; G.score = 12450; t.step(1/60); })()",
    'boss': "(() => { const t = __tank, G = t.G, p = G.player; t.spawn('boss', p.x + 160, p.y - 220); ['shield','triple','rapid','speed','pierce'].forEach((k, i) => { G.buffs[k] = 6 - i * 0.7; G.buffMax[k] = 8; }); G.score = 98760; t.step(1/60); })()",
}
rects = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    for vp, (w, h) in VPS.items():
        ctx = new_ctx(b, vp, viewport={'width': w, 'height': h}, device_scale_factor=2, is_mobile=True, has_touch=True)
        page = ctx.new_page(); seed(page)
        page.tap('#btnStart'); page.wait_for_timeout(500)
        page.evaluate('__tank.G.god = true; __tank.wave(3);'); page.wait_for_timeout(2700)
        for st, js in STATES.items():
            page.evaluate(js); page.wait_for_timeout(250)
            page.evaluate('__tank.dbg.freeze = true'); page.wait_for_timeout(60)
            page.screenshot(path=f'{OUT}/{TAG}_{vp}_{st}.png')
            r = page.evaluate("""() => { const u = (id) => { const r = document.getElementById(id).getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
                return { left: u('leftCol'), right: u('rightCol'), vh: innerHeight, vw: innerWidth }; }""")
            bottom = max(r['left'][3], r['right'][3])
            rects[f'{vp}_{st}'] = (bottom, r['vh'], r['left'], r['right'])
            page.evaluate('__tank.dbg.freeze = false')
        ctx.close()
    b.close()
for k, (bottom, vh, l, r) in rects.items():
    print(f'{k:12s} HUD bottom={bottom:4d}px of {vh} ({100*bottom/vh:4.1f}% of height)  left={l} right={r}')
print('ERRORS:', [e for e in errors if '404' not in e] or 'none')
