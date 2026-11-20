"""Shared harness for the browser checks.

Serves game/ on http://127.0.0.1:8766 (or $TANK_TEST_PORT, so parallel runs don't collide), answers Google Fonts requests from tests/fonts (no network needed),
collects console errors in `errors`, and writes screenshots under .tmp/shots.
The game exposes its debug API as window.__tank when the URL contains #debug (see the end of game/index.html).

Usage in a check:  from common import *   (then: with sync_playwright() as p: ...)
"""
import atexit
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


# ---- short output ----
# By default a check prints one line per group plus its status lines; the full report goes to .tmp/<name>.json.
# TANK_VERBOSE=1 restores the full printed output.
VERBOSE = os.environ.get('TANK_VERBOSE') == '1'
_written = set()


def vprint(*a, **k):
    """A detail line that is printed only with TANK_VERBOSE=1."""
    if VERBOSE:
        print(*a, **k)


def short(v, n=60):
    s = v if isinstance(v, str) else json.dumps(v, ensure_ascii=False, default=str)
    return s if len(s) <= n else s[:n - 3] + '...'


def pack(items, width=110, sep=' | '):
    """Joins short items into lines no wider than `width`."""
    lines, cur = [], ''
    for it in items:
        nxt = it if not cur else cur + sep + it
        if len(nxt) > width and cur:
            lines.append(cur)
            cur = it
        else:
            cur = nxt
    if cur:
        lines.append(cur)
    return lines


def write_report(name, data):
    TMP.mkdir(parents=True, exist_ok=True)
    path = TMP / f'{name}.json'
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1, default=str), encoding='utf-8')
    _written.add(name)
    return path


def report(name, data):
    """The full report goes to .tmp/<name>.json. With TANK_VERBOSE=1 it is printed in full too; otherwise only its path."""
    path = write_report(name, data)
    if VERBOSE:
        print(json.dumps(data, ensure_ascii=False, indent=1, default=str))
    else:
        print(f'full report: {path}')


def report_on_exit(name, data):
    """For a script that stops at an assert: the report file is still written."""
    atexit.register(lambda: name not in _written and write_report(name, data))


def show_checks(checks):
    """Check results ({name: bool or {'ok', 'info'}}): PASS names packed into a few lines, one line per FAIL with its details."""
    if VERBOSE:
        return
    passed = []
    for name, v in checks.items():
        ok, info = (v['ok'], v.get('info')) if isinstance(v, dict) else (v, None)
        if ok:
            passed.append(name)
        else:
            print(f'FAIL {name}' + (f': {short(info, 400)}' if info is not None else ''))
    for line in pack([f'PASS ({len(passed)}):'] + passed, sep=' '):
        print(line)


def show_items(d):
    """Measured values as packed 'key=value' lines (default output only)."""
    if not VERBOSE:
        for line in pack([f'{k}={short(v, 28)}' for k, v in d.items()]):
            print(line)


# finish the current wave and run until the workshop opens
TO_WORKSHOP = """() => { const t = __tank, G = t.G; t.killAll(); for (let i = 0; i < 400 && G.phase !== 'upgrade'; i++) t.sim(1 / 60, true); return G.phase; }"""
