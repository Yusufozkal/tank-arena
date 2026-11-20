"""Tank sprites (from the game's own drawing), web icons and web-sized screenshots for site/img.

Run: python3 tools/assets.py   (then python3 tools/build_site.py)
Needs Playwright with Chromium. Re-run after changing how tanks are drawn or the screenshots in tools/raw.
"""
import base64, http.server, os, socketserver, threading, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import paths as P  # noqa: E402
from playwright.sync_api import sync_playwright
from PIL import Image

SITE = str(P.SITE)
RAW = str(P.RAW)
CSS = P.FONTS_CSS.read_text(encoding='utf-8')

# The game's debug API gets one extra call, sprite(), in a scratch copy: it draws a tank alone on a transparent canvas.
SPRITE_HOOK = '''    sprite(type, px, up, tank) { // tank: a TANKS id, draws that player tank (bare, or with the cards in up)
      const cv = document.createElement('canvas'); cv.width = cv.height = px; const k = px / 64, g = cv.getContext('2d');
      g.setTransform(k, 0, 0, k, px / 2, px / 2 + 3 * k);
      const spec = type === 'player' ? (G.up = up || {}, playerSpec(tank || 'std', !up)) : SPECS[type];
      drawTank({ id: 0, type, spec, x: 0, y: 0, angle: -Math.PI / 2, turret: -Math.PI / 2, treadL: 0, treadR: 0, recoil: 0, flash: 0, heat: 0, overheatT: 0, evoT: 0 }, 1, g);
      G.up = {}; return cv.toDataURL('image/png');
    },
'''
BOSS_HOOK = '''    bossSprite(w, px, span) { // the real boss drawing (drawBoss) of the boss at wave w, alone and idle on a transparent canvas, nose up
      G.wave = w - 1; nextWave(); G.introSeen = true; endBossIntro(true);
      const e = G.boss, keep = [e.x, e.y, e.angle, e.turret], cv = document.createElement('canvas'); cv.width = cv.height = px;
      const k = px / span, g = cv.getContext('2d'); g.setTransform(k, 0, 0, k, px / 2, px / 2 + 3 * k);
      e.x = e.y = 0; e.angle = -Math.PI / 2; e.turret = -Math.PI / 2; e.flash = 0; drawBoss(e, 1, g);
      [e.x, e.y, e.angle, e.turret] = keep; return cv.toDataURL('image/png');
    },
'''
ANCHOR = '    hold(v) { bot.hold = !!v; },\n'
_src = P.GAME.read_text(encoding='utf-8')
assert ANCHOR in _src, 'debug API anchor not found in game/index.html; update ANCHOR in tools/assets.py'
SPRITE_GAME = P.TMP / 'spritegame'
SPRITE_GAME.mkdir(parents=True, exist_ok=True)
(SPRITE_GAME / 'index.html').write_text(_src.replace(ANCHOR, ANCHOR + SPRITE_HOOK + BOSS_HOOK, 1), encoding='utf-8')

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=str(SPRITE_GAME), **k)
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 8769), H); srv.daemon_threads = True
threading.Thread(target=srv.serve_forever, daemon=True).start()

def route_fonts(route):
    url = route.request.url
    if 'fonts.googleapis.com' in url:
        return route.fulfill(status=200, content_type='text/css', body=CSS, headers={'Access-Control-Allow-Origin': '*'})
    with open(P.FONTS_DIR / url.split('fonts.gstatic.com/')[1], 'rb') as f:
        return route.fulfill(status=200, content_type='font/woff2', body=f.read(), headers={'Access-Control-Allow-Origin': '*'})

def save(data_url, path):
    with open(path, 'wb') as f: f.write(base64.b64decode(data_url.split(',', 1)[1]))

exec(open(P.ANDROID / 'tools' / 'make_icons.py', encoding='utf-8').read().split('with sync_playwright() as p:')[0])  # PAGE with render()/art()

with sync_playwright() as p:
    b = p.chromium.launch()
    # tank sprites at 4x
    page = b.new_page(); page.route('https://fonts.googleapis.com/**', route_fonts); page.route('https://fonts.gstatic.com/**', route_fonts)
    page.goto('http://127.0.0.1:8769/index.html#debug'); page.wait_for_timeout(800)
    for t in ['basic', 'fast', 'heavy', 'hunter', 'tamirci', 'player']:
        save(page.evaluate(f"__tank.sprite('{t}', 256)"), f'{SITE}/img/tank-{t}.png')
    page.click('#btnStart'); page.wait_for_timeout(300)
    for name, w in (('komutan', 5), ('sari', 10), ('demirkok', 20)):  # the three bosses, drawn by the game itself
        save(page.evaluate(f"__tank.bossSprite({w}, 512, 170)"), f'{SITE}/img/boss-{name}.png')
    for tid in page.evaluate('__tank.tanks()'):  # all player tanks (Tank ağacı section): tank-<id>.png
        save(page.evaluate(f"__tank.sprite('player', 256, null, '{tid}')"), f'{SITE}/img/tank-{tid}.png')
    save(page.evaluate("__tank.sprite('player', 256, { armor: 4, engine: 3, loader: 3, caliber: 2, barrel: 2, repair: 1, magnet: 1, thermal: 1 })"), f'{SITE}/img/tank-player-upgraded.png')
    page.close()
    # icons from the launcher artwork
    page = b.new_page(); page.set_content(PAGE)
    page.evaluate("""() => { window.full = (size) => { const cv = document.createElement('canvas'); cv.width = cv.height = size; const g = cv.getContext('2d');
      g.fillStyle = '#262a1d'; g.fillRect(0, 0, size, size); g.scale(size / 108, size / 108); art(g); return cv.toDataURL('image/png'); }; }""")
    for name, size in (('favicon-32.png', 32), ('favicon-48.png', 48), ('icon-192.png', 192), ('icon-512.png', 512)):
        save(page.evaluate(f'render({size}, true)'), f'{SITE}/img/{name}')
    save(page.evaluate('full(180)'), f'{SITE}/img/apple-touch-icon.png')
    save(page.evaluate('full(512)'), f'{SITE}/img/icon-maskable-512.png')
    page.close()
    b.close()

# web-sized screenshots
for name, w in (('play-phone', 720), ('workshop-phone', 720), ('boss-phone', 720), ('play-wide', 1400)):
    im = Image.open(f'{RAW}/{name}.jpg').convert('RGB')
    h = round(im.height * w / im.width)
    im.resize((w, h), Image.LANCZOS).save(f'{SITE}/img/{name}.jpg', quality=82, optimize=True, progressive=True)
    print(name, (w, h), os.path.getsize(f'{SITE}/img/{name}.jpg') // 1024, 'KB')
print('sprites + icons done')

# the screenshots above are saved at quality 82; shrink them (and the PNGs) the way the live site has them
import optimize_images  # noqa: E402
optimize_images.main()
