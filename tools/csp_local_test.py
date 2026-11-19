"""Serve site/ with the headers and redirects from vercel.json and check that nothing breaks under the CSP."""
import http.server, json, os, re, socketserver, sys, threading
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import paths as P  # noqa: E402
from playwright.sync_api import sync_playwright
SITE = str(P.SITE)
V = json.load(open(P.REPO / 'vercel.json'))
P.TMP.mkdir(exist_ok=True)
def rx(src): return re.compile('^' + re.escape(src).replace(re.escape('(.*)'), '(.*)') + '$')
RULES = [(rx(h['source']), h['headers']) for h in V['headers']]
REDIR = [(rx(r['source']), r['destination']) for r in V['redirects']]
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=SITE, **k)
    def log_message(self, *a): pass
    def send_head(self):
        path = self.path.split('?')[0]
        for r, d in REDIR:
            if r.match(path):
                self.send_response(307); self.send_header('Location', d); self.end_headers(); return None
        return super().send_head()
    def end_headers(self):
        path = self.path.split('?')[0]
        for r, hs in RULES:
            if r.match(path):
                for h in hs: self.send_header(h['key'], h['value'])
        super().end_headers()
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 8771), H); srv.daemon_threads = True
threading.Thread(target=srv.serve_forever, daemon=True).start()
errors, violations, R = [], [], {}
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script("document.addEventListener('securitypolicyviolation', e => (window.__v = window.__v || []).push(e.violatedDirective + ' ' + e.blockedURI))")
    ctx.on('page', lambda pg: (pg.on('console', lambda m: errors.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None), pg.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))))
    pg = ctx.new_page()
    resp = pg.goto('http://127.0.0.1:8771/'); pg.wait_for_timeout(800)
    R['landing_csp'] = (resp.headers.get('content-security-policy') or '')[:60]
    R['landing_fonts'] = pg.evaluate('''() => document.fonts.check('900 40px "Big Shoulders Stencil"') && document.fonts.check('500 20px "Barlow Condensed"', 'ğşıİ')''')
    R['steel_bg'] = pg.evaluate("getComputedStyle(document.querySelector('.steel')).backgroundImage.slice(0, 30)")
    R['apk_href'] = pg.eval_on_selector('.btn-apk', 'a => a.href')
    R['landing_violations'] = pg.evaluate('window.__v || []')
    pg.goto('http://127.0.0.1:8771/oyna/#debug'); pg.wait_for_timeout(1000)
    R['game_fonts'] = pg.evaluate('''() => document.fonts.check('900 40px "Big Shoulders Stencil"')''')
    pg.tap('#btnStart'); pg.wait_for_timeout(500)
    R['workshop'] = pg.evaluate("""() => { const t = __tank, G = t.G; t.killAll(); for (let i = 0; i < 400 && G.phase !== 'upgrade'; i++) t.sim(1 / 60, true); return [G.phase, document.querySelectorAll('#upCards .up-card').length]; }""")
    pg.wait_for_timeout(700)
    pg.tap('#upCards .up-card:nth-child(1)'); pg.wait_for_timeout(1500)
    pg.evaluate("() => { const G = __tank.G; for (const k of ['speed','shield','pierce','freeze']) { G.buffs[k] = 5; G.buffMax[k] = 8; } __tank.step(1 / 60); }")
    pg.wait_for_timeout(200)
    R['buff_chip_color'] = pg.evaluate("() => { const b = document.querySelector('#buffs b'); return b ? getComputedStyle(b).backgroundColor : null; }")
    R['game_violations'] = pg.evaluate('window.__v || []')
    R['state'] = pg.evaluate('[__tank.G.state, __tank.G.wave]')
    pg.screenshot(path=str(P.TMP / 'csp_game.png'))
    r = pg.request.get('http://127.0.0.1:8771/TankArena-1.2.apk', max_redirects=0)
    R['apk_redirect'] = [r.status, r.headers.get('location')]
    b.close()
print(json.dumps(R, ensure_ascii=False)); print('errors:', errors or 'none')
