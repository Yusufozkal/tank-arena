"""Smoke test of the live site on a phone viewport. Each run is ~40 requests against the firewall's 300 per 10 min per IP limit."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import paths as P  # noqa: E402
from playwright.sync_api import sync_playwright
P.TMP.mkdir(exist_ok=True)
B = 'https://tank-arena-taupe.vercel.app'
errors, R = [], {}
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale='tr-TR')
    ctx.on('page', lambda pg: (pg.on('console', lambda m: errors.append(f'{pg.url} {m.type}: {m.text}') if m.type in ('error', 'warning') else None), pg.on('pageerror', lambda e: errors.append(f'{pg.url} pageerror: {e}'))))
    pg = ctx.new_page()
    pg.goto(B + '/', wait_until='networkidle')
    R['title'] = pg.title()
    R['og'] = pg.eval_on_selector('meta[property="og:image"]', 'm => m.content')
    R['fonts'] = pg.evaluate('''() => document.fonts.check('900 40px "Big Shoulders Stencil"') && document.fonts.check('500 20px "Barlow Condensed"', 'ğşıİ')''')
    R['apk_link'] = pg.eval_on_selector('.btn-apk', 'a => [a.getAttribute("href"), a.hasAttribute("download")]')
    pg.screenshot(path=str(P.TMP / 'live_m_top.png'))
    pg.tap('.hero .btn-play'); pg.wait_for_load_state('networkidle'); pg.wait_for_timeout(1000)
    R['game_url'] = pg.url
    R['game_fonts'] = pg.evaluate('''() => document.fonts.check('900 40px "Big Shoulders Stencil"')''')
    pg.tap('#btnStart'); pg.wait_for_timeout(2500)
    R['game_running'] = pg.evaluate('() => { const h = document.getElementById("hud"); return [!h.classList.contains("hidden"), document.getElementById("waveNum") ? document.getElementById("waveNum").textContent : null]; }')
    pg.screenshot(path=str(P.TMP / 'live_m_game.png'))
    ctx.close(); b.close()
print(json.dumps(R, ensure_ascii=False)); print('errors:', errors or 'none')
