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

# ---- 1.4 nuke button (#btnNuke): tap starts the warning, stays inside the viewport, overlaps no HUD element, steals no stick touches ----
NUKE_RECTS = """() => { const r = id => { const q = document.querySelector(id).getBoundingClientRect(); return { l: q.left, t: q.top, r: q.right, b: q.bottom, w: q.width, h: q.height }; };
  const G = __tank.G, v = __tank.view, R = { s: 46, m: 56, l: 68 }[__tank.SET.stickSize] || 56, y = v.h - v.sb - R - 56, lx = v.sl + R + 40, rx = v.w - v.sr - R - 40;
  return { btn: r('#btnNuke'), pause: r('#btnPause'), sound: r('#btnSound'), mini: r('#mini'), top: r('.hud-top'), vw: innerWidth, vh: innerHeight, R, y, lx, rx }; }"""
def inter(a, c, pad=0):
    return a['l'] < c['r'] + pad and a['r'] > c['l'] - pad and a['t'] < c['b'] + pad and a['b'] > c['t'] - pad
def circ_hits(btn, cx, cy, R):
    nx, ny = min(max(cx, btn['l']), btn['r']), min(max(cy, btn['t']), btn['b'])
    return (nx - cx) ** 2 + (ny - cy) ** 2 < R * R
SETUP = "(() => { const t = __tank, p = t.G.player; t.G.god = true; t.G.queue.length = 0; t.G.portals.length = 0; t.G.enemies.length = 0; t.spawn('basic', p.x + 50, p.y - 90); })()"
with sync_playwright() as p:
    b = p.chromium.launch()
    for vp, (w, h) in {'p390': (390, 844), 'p360': (360, 740), 'l844': (844, 390), 'l740': (740, 360)}.items():
        ctx = new_ctx(b, vp + '-nuke', viewport={'width': w, 'height': h}, device_scale_factor=2, is_mobile=True, has_touch=True)
        pg = ctx.new_page(); seed(pg); pg.tap('#btnStart'); pg.wait_for_timeout(400)
        pg.evaluate('__tank.wave(3)'); pg.wait_for_timeout(2700)
        pg.evaluate(SETUP); pg.evaluate('__tank.nukeCharge(0.45)'); pg.wait_for_timeout(250)
        c = pg.evaluate(NUKE_RECTS); pg.screenshot(path=f'{OUT}/nuke_{vp}_charging.png')
        pg.evaluate('__tank.nukeCharge(1)'); pg.wait_for_timeout(250)
        rd = pg.evaluate(NUKE_RECTS); pg.screenshot(path=f'{OUT}/nuke_{vp}_ready.png')
        for tag, q in (('charging', c), ('ready', rd)):
            bt = q['btn']
            assert bt['l'] >= 0 and bt['t'] >= 0 and bt['r'] <= q['vw'] and bt['b'] <= q['vh'], f'{vp} {tag}: button outside the viewport {bt}'
            for nm in ('pause', 'sound', 'mini', 'top'):
                assert not inter(bt, q[nm]), f'{vp} {tag}: button overlaps {nm}'
            for cx in (q['lx'], q['rx']):
                assert not circ_hits(bt, cx, q['y'], q['R']), f'{vp} {tag}: button overlaps a stick base'
                lab = {'l': cx - 36, 'r': cx + 36, 't': q['y'] + q['R'] + 4, 'b': q['y'] + q['R'] + 24}
                assert not inter(bt, lab), f'{vp} {tag}: button overlaps a stick label'
        # touches: centre of the button never starts a stick, a touch 8 px beside it does
        cdp = ctx.new_cdp_session(pg)
        def touch(x, y, dx=0, dy=0):
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y, 'id': 1}]})
            pg.wait_for_timeout(60)
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x + dx, 'y': y + dy, 'id': 1}]})
            pg.wait_for_timeout(60)
            st = pg.evaluate('[__tank.sticks.move.id !== null, __tank.sticks.aim.id !== null, Math.hypot(__tank.sticks.move.vx + __tank.sticks.aim.vx, __tank.sticks.move.vy + __tank.sticks.aim.vy)]')
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); pg.wait_for_timeout(60)
            return st
        # Chrome snaps touches near a button to it (measured: up to about 8 px around the 60 px ready button, 12 px around the 44 px charging one); beyond that a stick starts
        for tag, q, off in (('ready', rd, 12), ('charging', c, 14)):
            pg.evaluate(f'__tank.nukeCharge({1 if tag == "ready" else 0.45})'); pg.wait_for_timeout(250)
            bt = q['btn']; cy = (bt['t'] + bt['b']) / 2
            left = touch(bt['l'] - off, cy, -30, 0); right = touch(bt['r'] + off, cy, 30, 0)
            assert left[0] and left[2] > 0.3, f'{vp} {tag}: touch {off} px left of the button must drive the move stick {left}'
            assert right[1] and right[2] > 0.3, f'{vp} {tag}: touch {off} px right of the button must drive the aim stick {right}'
        pg.evaluate('__tank.nukeCharge(1)'); pg.wait_for_timeout(250); bt = rd['btn']
        # the real tap: the warning starts
        pg.evaluate('__tank.G.nuke.warnT = 0'); pg.tap('#btnNuke'); pg.wait_for_timeout(200)
        warn = pg.evaluate('__tank.nuke()'); pg.screenshot(path=f'{OUT}/nuke_{vp}_warn.png')
        assert warn['warnT'] > 0, f'{vp}: tapping the button did not start the warning {warn}'
        pg.wait_for_timeout(1250); pg.screenshot(path=f'{OUT}/nuke_{vp}_flash.png')
        print(f"{vp}: nuke button charging {c['btn']['w']:.0f}px at ({c['btn']['l']:.0f},{c['btn']['t']:.0f}), ready {bt['w']:.0f}px at ({bt['l']:.0f},{bt['t']:.0f})-({bt['r']:.0f},{bt['b']:.0f}) in {rd['vw']}x{rd['vh']} | no overlap with pause/sound/mini/top HUD, stick bases, stick labels | stick touches just outside ok (12px ready, 14px charging) | tap -> warnT {warn['warnT']}")
        ctx.close()
    b.close()

# ---- 1.5.5.2 rounded display corners: with --rcTL/--rcTR = 48px the HUD corner points stay inside a rounded rectangle of the viewport ----
RC = 48
def in_round(x, y, w, h, r):
    cx = r if x < r else (w - r if x > w - r else None); cy = r if y < r else (h - r if y > h - r else None)
    return cx is None or cy is None or (x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.01
with sync_playwright() as p:
    b = p.chromium.launch()
    for vp, (w, h) in {'p390': (390, 844), 'l844': (844, 390)}.items():
        ctx = new_ctx(b, vp + '-rc', viewport={'width': w, 'height': h}, device_scale_factor=2, is_mobile=True, has_touch=True)
        pg = ctx.new_page(); seed(pg); pg.tap('#btnStart'); pg.wait_for_timeout(500)
        pg.evaluate(f"['--rcTL','--rcTR','--rcBL','--rcBR'].forEach(n => document.documentElement.style.setProperty(n, '{RC}px'))"); pg.wait_for_timeout(100)
        rects = pg.evaluate("(() => ['btnSound', 'btnPause', 'armor'].map(id => { const q = document.getElementById(id).getBoundingClientRect(); return [id, q.left, q.top, q.right, q.bottom]; }))()")
        for id, l, t, r, bt in rects:
            for x, y in ((l, t), (r, t), (l, bt), (r, bt)):
                assert in_round(x, y, w, h, RC), f'{vp}: {id} corner ({x:.1f},{y:.1f}) is outside the rounded screen (radius {RC})'
        hud = pg.evaluate("(() => { const q = document.getElementById('hud').getBoundingClientRect(), t = document.querySelector('.hud-top').getBoundingClientRect(); return t.bottom / innerHeight * 100; })()")
        print(f'{vp}: rounded corners {RC}px -> sound/pause/armour corners inside the arc | HUD bottom at {hud:.1f}% of the screen')
        ctx.close()
    b.close()
print('ERRORS:', [e for e in errors if '404' not in e] or 'none')
