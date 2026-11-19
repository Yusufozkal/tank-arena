"""Screenshots of the built site (phone + desktop) for review; with the argument og it also renders site/img/og.jpg from tools/og.html."""
import http.server, os, socketserver, threading, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import paths as P  # noqa: E402
P.TMP.mkdir(exist_ok=True)
OG = (P.TOOLS / 'og.html').read_text(encoding='utf-8')
from playwright.sync_api import sync_playwright
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=str(P.SITE), **k)
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 8770), H); srv.daemon_threads = True
threading.Thread(target=srv.serve_forever, daemon=True).start()
errors, external = [], []
with sync_playwright() as p:
    b = p.chromium.launch()
    def ctx(**kw):
        c = b.new_context(**kw)
        def gate(route):
            if route.request.url == 'http://127.0.0.1:8770/og-template.html': return route.fulfill(status=200, content_type='text/html', body=OG)
            if route.request.url.startswith('http://127.0.0.1:8770/'): return route.continue_()
            external.append(route.request.url); return route.abort()
        c.route('**/*', gate)
        c.on('page', lambda pg: (pg.on('console', lambda m: errors.append(m.text) if m.type in ('error', 'warning') else None), pg.on('pageerror', lambda e: errors.append(str(e)))))
        return c
    if 'og' in sys.argv:
        c = ctx(viewport={'width': 1200, 'height': 630}); pg = c.new_page(); pg.goto('http://127.0.0.1:8770/og-template.html'); pg.wait_for_timeout(700)
        pg.screenshot(path=str(P.SITE / 'img' / 'og.jpg'), type='jpeg', quality=86); c.close()
    c = ctx(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg = c.new_page(); pg.goto('http://127.0.0.1:8770/'); pg.wait_for_timeout(600); pg.evaluate('async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); }'); pg.wait_for_timeout(600)
    pg.screenshot(path=str(P.TMP / 'm_top.png'))
    pg.screenshot(path=str(P.TMP / 'm_full.png'), full_page=True)
    info = pg.evaluate("() => ({ h: document.documentElement.scrollHeight, overflowX: document.documentElement.scrollWidth > innerWidth, fonts: document.fonts.check('900 40px \"Big Shoulders Stencil\"') && document.fonts.check('500 20px \"Barlow Condensed\"', 'ğşıİ') })")
    c.close()
    c = ctx(viewport={'width': 1440, 'height': 900})
    pg = c.new_page(); pg.goto('http://127.0.0.1:8770/'); pg.wait_for_timeout(600); pg.evaluate('async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); }'); pg.wait_for_timeout(600)
    pg.screenshot(path=str(P.TMP / 'd_top.png'))
    pg.screenshot(path=str(P.TMP / 'd_full.png'), full_page=True)
    info['desk_h'] = pg.evaluate('document.documentElement.scrollHeight')
    c.close(); b.close()
print(json.dumps(info), 'external:', external, 'errors:', errors)
