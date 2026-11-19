"""Screenshot the mouse crosshair on every map theme (waves 1/4/7/10) and check the cursor class."""
import os, sys, threading, http.server, functools
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from paths import GAME_DIR, TMP  # noqa: E402
from playwright.sync_api import sync_playwright
from PIL import Image

OUT = str(TMP / (sys.argv[1] if len(sys.argv) > 1 else 'crosshair'))   # output image prefix
ROOT = str(GAME_DIR)
os.makedirs(TMP, exist_ok=True)
PORT = int(os.environ.get('TANK_TEST_PORT', '8766')) + 24   # 8790 by default
srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT))
srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1280, 'height': 800})
    pg.route('**/*', lambda r: r.abort() if 'fonts.g' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{PORT}/index.html#debug'); pg.wait_for_timeout(600)
    pg.mouse.move(600, 380); pg.mouse.move(640, 400, steps=4)
    pg.evaluate('__tank.startGame()'); pg.wait_for_timeout(300)
    tiles = []
    for w, name in ((1, 'desert'), (4, 'forest'), (7, 'snow'), (10, 'city')):
        pg.evaluate(f'__tank.wave({w}); __tank.clearArena(); __tank.G.god = true;')
        pg.wait_for_timeout(2600)          # let the wave banner fade
        pg.evaluate('for (const e of __tank.G.enemies) e.cool = 99; __tank.G.player.cool = __tank.G.player.spec.cool * 0.45;')
        pg.mouse.move(820, 300, steps=3); pg.mouse.move(840, 310, steps=3)
        pg.wait_for_timeout(120)
        pg.evaluate('__tank.dbg.freeze = true; __tank.G.player.cool = __tank.G.player.spec.cool * 0.4;'); pg.wait_for_timeout(80)
        theme = pg.evaluate('__tank.G.map.theme.key')
        pg.screenshot(path=str(TMP / '_x.png'), clip={'x': 790, 'y': 260, 'width': 100, 'height': 100})
        tiles.append((theme, Image.open(TMP / '_x.png').convert('RGB').resize((200, 200), Image.NEAREST)))
        cls = pg.evaluate("document.getElementById('game').classList.contains('aim')")
        pg.evaluate('__tank.dbg.freeze = false')
        print(f'wave {w:2d} theme={theme:7s} cursor-hidden={cls}')
    # cursor class outside active aiming
    pg.evaluate('__tank.input.mouseAim = false'); pg.wait_for_timeout(150)
    print('mouse idle cursor-hidden=', pg.evaluate("document.getElementById('game').classList.contains('aim')"))
    pg.mouse.move(760, 320, steps=3); pg.wait_for_timeout(150)
    print('mouse back cursor-hidden=', pg.evaluate("document.getElementById('game').classList.contains('aim')"))
    pg.evaluate('__tank.pauseGame()'); pg.wait_for_timeout(150)
    print('paused     cursor-hidden=', pg.evaluate("document.getElementById('game').classList.contains('aim')"))
    pg.evaluate('__tank.resumeGame()'); pg.mouse.move(700, 300, steps=3); pg.wait_for_timeout(150)
    print('resumed    cursor-hidden=', pg.evaluate("document.getElementById('game').classList.contains('aim')"))
    pg.evaluate('__tank.gameOver()'); pg.wait_for_timeout(300)
    print('game over  cursor-hidden=', pg.evaluate("document.getElementById('game').classList.contains('aim')"))
    pg.evaluate('__tank.toMenu()'); pg.wait_for_timeout(300)
    print('menu       cursor-hidden=', pg.evaluate("document.getElementById('game').classList.contains('aim')"))
    print('page errors:', errs or 'none')
    sheet = Image.new('RGB', (200 * len(tiles), 200))
    for i, (_, im) in enumerate(tiles): sheet.paste(im, (200 * i, 0))
    sheet.save(f'{OUT}.png')
    b.close()
srv.shutdown()
