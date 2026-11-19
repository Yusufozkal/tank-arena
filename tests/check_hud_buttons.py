"""The small phone HUD buttons still take taps: pause (centre and 4 px below, the widened hit area) and sound."""
from common import *  # noqa: F401,F403
with sync_playwright() as p:
    b = p.chromium.launch()
    for vp, (w, h) in {'p390': (390, 844), 'l844': (844, 390)}.items():
        ctx = new_ctx(b, vp, viewport={'width': w, 'height': h}, device_scale_factor=2, is_mobile=True, has_touch=True)
        pg = ctx.new_page(); seed(pg); pg.tap('#btnStart'); pg.wait_for_timeout(600)
        r = pg.evaluate("(() => { const r = document.getElementById('btnPause').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })()")
        cx, cy = r[0] + r[2] / 2, r[1] + r[3] / 2
        pg.touchscreen.tap(cx, cy); pg.wait_for_timeout(250); s1 = pg.evaluate('__tank.G.state')
        pg.evaluate('__tank.resumeGame()'); pg.wait_for_timeout(250)
        pg.touchscreen.tap(cx, r[1] + r[3] + 4); pg.wait_for_timeout(250); s2 = pg.evaluate('__tank.G.state')
        pg.evaluate('__tank.resumeGame()'); pg.wait_for_timeout(250)
        snd0 = pg.evaluate("document.getElementById('btnSound').getAttribute('aria-label')")
        pg.tap('#btnSound'); pg.wait_for_timeout(150)
        snd1 = pg.evaluate("document.getElementById('btnSound').getAttribute('aria-label')")
        print(f'{vp}: pause button {r[2]:.0f}x{r[3]:.0f} | tap centre -> {s1} | tap 4px below -> {s2} | sound: {snd0} -> {snd1}')
        ctx.close()
    b.close()
print('ERRORS:', [e for e in errors if '404' not in e] or 'none')
