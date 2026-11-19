"""Shared harness for the browser checks.

Serves game/ on http://127.0.0.1:8766 (or $TANK_TEST_PORT, so parallel runs don't collide), answers Google Fonts requests from tests/fonts (no network needed),
collects console errors in `errors`, and writes screenshots under .tmp/shots.
The game exposes its debug API as window.__tank when the URL contains #debug (see the end of game/index.html).

Usage in a check:  from common import *   (then: with sync_playwright() as p: ...)
"""
import http.server
import json  # noqa: F401  (re-exported for the checks)
import os
import socketserver
import sys
import threading
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from paths import FONTS_CSS, FONTS_DIR, GAME_DIR, REPO, TMP  # noqa: E402,F401
from playwright.sync_api import sync_playwright  # noqa: E402,F401

PORT = int(os.environ.get('TANK_TEST_PORT', '8766'))
URL = f'http://127.0.0.1:{PORT}/index.html#debug'
OUT = str(TMP / 'shots')
os.makedirs(OUT, exist_ok=True)
CSS = FONTS_CSS.read_text(encoding='utf-8')
errors, R = [], {}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(GAME_DIR), **k)

    def log_message(self, *a):
        pass


socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.ThreadingTCPServer(('127.0.0.1', PORT), Handler)
srv.daemon_threads = True
threading.Thread(target=srv.serve_forever, daemon=True).start()


def route_fonts(route):
    url = route.request.url
    if 'fonts.googleapis.com' in url:
        return route.fulfill(status=200, content_type='text/css', body=CSS, headers={'Access-Control-Allow-Origin': '*'})
    fp = FONTS_DIR / url.split('fonts.gstatic.com/')[1]
    if fp.exists():
        return route.fulfill(status=200, content_type='font/woff2', body=fp.read_bytes(), headers={'Access-Control-Allow-Origin': '*'})
    return route.abort()


def new_ctx(browser, label, **kw):
    """A browser context with local fonts and console errors collected under `label`."""
    ctx = browser.new_context(**kw)
    ctx.route('https://fonts.googleapis.com/**', route_fonts)
    ctx.route('https://fonts.gstatic.com/**', route_fonts)
    ctx.on('page', lambda pg: (pg.on('console', lambda m: errors.append(f'[{label}] {m.type}: {m.text}') if m.type in ('error', 'warning') else None),
                               pg.on('pageerror', lambda e: errors.append(f'[{label}] pageerror: {e}'))))
    return ctx


def seed(page, settings=None):
    """Fresh storage (optionally with saved settings), then open the game in debug mode."""
    page.goto(f'http://127.0.0.1:{PORT}/seed-page')
    page.evaluate("(s) => { localStorage.clear(); localStorage.setItem('tankArena.seenHunter', 'true'); if (s) localStorage.setItem('tankArena.settings', JSON.stringify(s)); }", settings)
    page.goto(URL)
    page.wait_for_timeout(900)


def real_errors():
    return [e for e in errors if '404' not in e]


# finish the current wave and run until the workshop opens
TO_WORKSHOP = """() => { const t = __tank, G = t.G; t.killAll(); for (let i = 0; i < 400 && G.phase !== 'upgrade'; i++) t.sim(1 / 60, true); return G.phase; }"""
