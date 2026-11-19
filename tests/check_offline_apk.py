"""The APK build of the game (android/assets/game, fonts embedded) with every network request blocked, plus the
Android bridge: orientation calls, back button, workshop, rotation. Run python3 android/tools/build_assets.py first."""
import http.server, json, socketserver, sys, threading
from pathlib import Path
from playwright.sync_api import sync_playwright
ASSETS = Path(__file__).resolve().parents[1] / 'android' / 'assets'
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=str(ASSETS), **k)
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 8767), H); srv.daemon_threads = True
threading.Thread(target=srv.serve_forever, daemon=True).start()
errors, external, r = [], [], {}
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True)
    ctx.add_init_script("window.__orient = []; window.TankAndroid = { setOrientation(m) { window.__orient.push(m); } };")
    page = ctx.new_page()
    def gate(route):
        if route.request.url.startswith('http://127.0.0.1:8767/'): return route.continue_()
        external.append(route.request.url); return route.abort()
    page.route('**/*', gate)
    page.on('console', lambda m: errors.append(m.text) if m.type in ('error', 'warning') else None)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('http://127.0.0.1:8767/game/index.html#debug'); page.wait_for_timeout(1200)
    r['fonts'] = page.evaluate('''() => document.fonts.check('900 40px "Big Shoulders Stencil"') && document.fonts.check('600 16px "Barlow Condensed"', 'ğüşıöçİ')''')
    r['version'] = page.inner_text('.version')
    r['boot_orientation'] = page.evaluate('window.__orient.slice()')
    page.tap('#btnSettings'); page.wait_for_timeout(200)
    page.eval_on_selector('#rowOrient', 'n => n.scrollIntoView()')
    page.tap('#rowOrient button[data-v="portrait"]')
    r['portrait_tap'] = page.evaluate('window.__orient.slice(-1)[0]')
    page.tap('#rowOrient button[data-v="auto"]')
    r['back_closes_settings'] = [page.evaluate('window.tankBack()'), page.is_visible('#menuPanel')]
    page.tap('#btnStart'); page.wait_for_timeout(600)
    r['workshop'] = page.evaluate("() => { const t = __tank, G = t.G; t.killAll(); for (let i = 0; i < 400 && G.phase !== 'upgrade'; i++) t.sim(1 / 60, true); return [G.phase, t.choices().length]; }")
    page.wait_for_timeout(300)
    r['back_in_workshop'] = [page.evaluate('window.tankBack()'), page.is_visible('#btnResume'), page.is_visible('#upPanel')]
    r['back_again'] = [page.evaluate('window.tankBack()'), page.is_visible('#upPanel')]
    page.wait_for_timeout(700)
    page.tap('#upCards .up-card:nth-child(3)'); page.wait_for_timeout(1500)
    r['after_pick'] = page.evaluate("[__tank.G.wave, __tank.G.phase, JSON.stringify(__tank.G.up)]")
    page.set_viewport_size({'width': 844, 'height': 390}); page.wait_for_timeout(400)
    r['turned'] = page.evaluate("[__tank.view.w, __tank.view.h, __tank.G.state]")
    page.evaluate("__tank.sim(5, true)")
    r['still_playing'] = page.evaluate("[__tank.G.state, __tank.G.wave]")
    b.close()
srv.shutdown()
print(json.dumps(r, ensure_ascii=False)); print('external:', external); print('errors:', errors)
