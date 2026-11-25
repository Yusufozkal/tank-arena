"""Boss stuck check: the bot fights each boss (invulnerable player) in its arena; the boss must never spend more than 3 s without progress while it is supposed to walk.
Usage: TANK_TEST_PORT=8800 python3 tests/check_boss_stuck.py [runs=3]    (rows: .tmp/check_boss_stuck_rows.json)"""
import sys
from common import *  # noqa: F401,F403

report_on_exit('check_boss_stuck', R)
runs = int(sys.argv[1]) if len(sys.argv) > 1 else 3
LIMIT = 3.0
CASES = [(5, 'komutan'), (15, 'komutan'), (35, 'komutan'), (10, 'sari'), (20, 'demirkok'), (40, 'sonhisar'), (25, 'kapatici')]
CARDS = {'armor': 3, 'caliber': 1, 'engine': 1}
rows, bad = [], []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = new_ctx(b, 'stuck', viewport={'width': 1280, 'height': 800})
    page = ctx.new_page(); seed(page)
    page.click('#btnStart'); page.wait_for_timeout(300)
    for w, name in CASES:
        worst = 0
        for i in range(runs):
            r = page.evaluate("([w, up, t, k]) => __tank.bossWatch(w, up, t, 150, k)", [w, CARDS, 'std', name if name == 'kapatici' else None])
            r.update(wave=w, boss=name); rows.append(r); worst = max(worst, r['worst'])
            if r['worst'] > LIMIT: bad.append(r)
        print(f"wave {w:2d} {name:9s} worst no-progress {worst:4.1f}s")
    b.close()
(TMP).mkdir(exist_ok=True)
(TMP / 'check_boss_stuck_rows.json').write_text(json.dumps(rows))
for r in bad: print('FAIL stuck', r)
print('stuck cases:', len(bad), '| page errors:', real_errors()[:3] or 'none')
sys.exit(1 if bad else 0)
