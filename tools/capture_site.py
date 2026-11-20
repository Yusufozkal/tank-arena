"""Fresh screenshots (Alev Topu on the phone, Raylı Top sideways, a boss fight) for the Tank Arena website (phone portrait, workshop, landscape)."""
import http.server, json, os, socketserver, sys, threading
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import paths as P  # noqa: E402
from playwright.sync_api import sync_playwright

GAME = str(P.GAME_DIR)
OUT = str(P.RAW)
os.makedirs(OUT, exist_ok=True)
CSS = P.FONTS_CSS.read_text(encoding='utf-8')
URL = 'http://127.0.0.1:8768/index.html#debug'

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=GAME, **k)
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 8768), H); srv.daemon_threads = True
threading.Thread(target=srv.serve_forever, daemon=True).start()

def route_fonts(route):
    url = route.request.url
    if 'fonts.googleapis.com' in url:
        return route.fulfill(status=200, content_type='text/css', body=CSS, headers={'Access-Control-Allow-Origin': '*'})
    fp = str(P.FONTS_DIR / url.split('fonts.gstatic.com/')[1])
    with open(fp, 'rb') as f:
        return route.fulfill(status=200, content_type='font/woff2', body=f.read(), headers={'Access-Control-Allow-Origin': '*'})

FIND_JS = """(q) => {
  const t = __tank, G = t.G, v = t.view;
  const on = (x, y, m) => x > v.x0 + m && x < v.x1 - m && y > v.y0 + m && y < v.y1 - m;
  let last = null;
  for (let i = 0; i < q.steps; i++) {
    if (G.wave !== q.wave || G.state !== 'play') { if (G.state !== 'play') return { dead: true }; t.wave(q.wave); t.setUp(q.up); if (q.tank) t.setTank(q.tank); }
    t.sim(1 / 60, true);
    if (G.phase !== 'fight' || !G.player.alive || !on(G.player.x, G.player.y, 110)) continue;
    const a = { i, enemiesOn: G.enemies.filter(e => !e.hidden && on(e.x, e.y, 60)).length,
      fire: t.parts.filter(p => p.k === 'fire' && p.life / p.max > 0.5 && on(p.x, p.y, 70)).length,
      bullets: G.bullets.filter(b => on(b.x, b.y, 20)).length,
      mine: G.bullets.filter(b => b.owner === 0 && on(b.x, b.y, 20)).length, theirs: G.bullets.filter(b => b.owner === 1 && on(b.x, b.y, 20)).length, pick: G.pickups.filter(k => on(k.x, k.y, 40)).length };
    last = a;
    if (a.enemiesOn >= q.e && a.fire >= q.f && a.mine >= (q.m || 0) && a.theirs >= (q.t || 0) && a.bullets >= q.b && a.pick >= q.k) return a;
  }
  return Object.assign({ fallback: true }, last);
}"""

def page_for(b, vp, dpr, touch):
    ctx = b.new_context(viewport=vp, device_scale_factor=dpr, is_mobile=touch, has_touch=touch)
    ctx.route('https://fonts.googleapis.com/**', route_fonts); ctx.route('https://fonts.gstatic.com/**', route_fonts)
    page = ctx.new_page()
    page.goto('http://127.0.0.1:8768/seed'); page.evaluate("() => { localStorage.clear(); localStorage.setItem('tankArena.seenHunter','true'); }")
    page.goto(URL); page.wait_for_timeout(900)
    (page.tap if touch else page.click)('#btnStart'); page.wait_for_timeout(300)
    page.evaluate('__tank.dbg.freeze = true')
    return ctx, page

def sticks(ctx, page, vp):
    cdp = ctx.new_cdp_session(page)
    x2, y = vp['width'] - 96, vp['height'] - 112
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': 96, 'y': y, 'id': 1}, {'x': x2, 'y': y, 'id': 2}]})
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': 120, 'y': y - 28, 'id': 1}, {'x': x2 - 34, 'y': y - 34, 'id': 2}]})
    page.wait_for_timeout(80)

def shoot(page, path, buffs=None):
    page.evaluate("""(bf) => { const t = __tank, G = t.G;
      if (bf) { for (const [k, v] of Object.entries(bf)) { G.buffs[k] = v; G.buffMax[k] = 10; } }
      t.dbg.freeze = false; t.step(1 / 60); t.dbg.freeze = true; t.dbg.clean = false;
      document.getElementById('banner').classList.remove('show'); document.getElementById('hint').classList.remove('show'); }""", buffs)
    page.wait_for_timeout(200)
    page.screenshot(path=path, type='jpeg', quality=90)

with sync_playwright() as p:
    b = p.chromium.launch()
    res = {}
    # 1. phone, portrait, mid-fight
    vp = {'width': 390, 'height': 844}
    ctx, page = page_for(b, vp, 2, True)
    up = {'armor': 2, 'caliber': 1, 'engine': 1}
    page.evaluate("(u) => { __tank.wave(9); __tank.setUp(u); __tank.setTank('ikiz'); __tank.sim(1.8, true); }", up)
    res['play_phone'] = page.evaluate(FIND_JS, dict(steps=9000, wave=9, e=2, f=0, b=3, m=1, t=1, k=0, up=up, tank='ikiz'))
    sticks(ctx, page, vp)
    shoot(page, f'{OUT}/play-phone.jpg', {'speed': 6.5})
    ctx.close()
    # 2. phone, workshop with one rare card
    ctx, page = page_for(b, vp, 2, True)
    res['workshop'] = page.evaluate("""() => { const t = __tank, G = t.G; t.wave(3); t.setUp({ armor: 1, loader: 2 }); t.killAll();
      for (let i = 0; i < 400 && G.phase !== 'upgrade'; i++) t.sim(1 / 60, true);
      const rare = ['ricochet', 'blast', 'thermal'];
      for (let i = 0; i < 300; i++) { const c = t.choices(); if (c.filter(k => rare.includes(k)).length === 1 && c.some(k => k === 'loader' || k === 'armor') && !c.includes('fix')) break; t.showUpgrades(); }
      return t.choices(); }""")
    page.wait_for_timeout(900)
    page.evaluate("document.getElementById('banner').classList.remove('show')")
    page.screenshot(path=f'{OUT}/workshop-phone.jpg', type='jpeg', quality=90)
    ctx.close()
    # 3. phone turned sideways
    vp = {'width': 844, 'height': 390}
    ctx, page = page_for(b, vp, 2, True)
    up = {'armor': 3, 'engine': 2, 'loader': 2, 'magnet': 1}
    page.evaluate("(u) => { __tank.wave(8); __tank.setUp(u); __tank.setTank('rayli'); __tank.sim(1.8, true); }", up)
    res['play_wide'] = page.evaluate(FIND_JS, dict(steps=9000, wave=8, e=2, f=0, b=3, m=0, t=1, k=0, up=up, tank='rayli'))
    sticks(ctx, page, vp)
    shoot(page, f'{OUT}/play-wide.jpg', {'pierce': 7, 'shield': 4})
    ctx.close()
    # 4. phone, boss stage: Demirkök (wave 20) hurt to about 60%, so the big boss bar shows its lighter lost-HP chunk
    ctx, page = page_for(b, vp := {'width': 390, 'height': 844}, 2, True)
    page.evaluate("__tank.dbg.freeze = false")
    res['boss'] = page.evaluate("""() => { const t = __tank, G = t.G; t.setUp({ armor: 3, caliber: 1, engine: 1 }); t.wave(20); t.bossSkip();
      for (let i = 0; i < 6; i++) t.sim(1, true);
      for (let i = 0; i < 30; i++) t.sim(0.3, true);
      t.hurtBoss(G.boss.maxHp * 0.42); t.sim(0.4, true); t.dbg.clean = false; const q = t.bossInfo(); return [q.hp, q.maxHp]; }""")
    page.wait_for_timeout(200)
    page.screenshot(path=f'{OUT}/boss-phone.jpg', type='jpeg', quality=90)
    ctx.close()
    b.close()
print(json.dumps(res))
