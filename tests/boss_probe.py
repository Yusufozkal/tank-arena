"""Boss probe: the bot fights only the boss stage (no waves before it) with a given card set; reports fight duration and death rate.

Usage: TANK_TEST_PORT=8800 python3 tests/boss_probe.py [waves=5,15,25,35] [runs=20] [sets=weak,medium,strong] [tank=auto] [boss=]
  weak: no cards   medium: a typical mixed set (one card per earlier wave)   strong: damage cards first   full (tam güç): every card at its maximum (needs wave >= 35 for all 34 cards)
  boss: a BOSS_DEFS key to fight instead of the wave's boss (e.g. kapatici, the sandbox-only boss: python3 tests/boss_probe.py 40,25 6 full,medium auto kapatici)
  tank: auto = Standart at wave 5, the tier-2 tanks in turn later; or a tank id
Short output: one line per wave and set; the full rows go to .tmp/boss_probe.json.
"""
import statistics as st
import sys
from common import *  # noqa: F401,F403

waves = [int(x) for x in (sys.argv[1] if len(sys.argv) > 1 else '5,15,25,35').split(',')]
runs = int(sys.argv[2]) if len(sys.argv) > 2 else 20
sets = (sys.argv[3] if len(sys.argv) > 3 else 'weak,medium,strong').split(',')
tank_arg = sys.argv[4] if len(sys.argv) > 4 else 'auto'
boss_key = sys.argv[5] if len(sys.argv) > 5 else None
T2 = ['uclu', 'cift', 'rayli', 'obus', 'alev', 'sarapnel']
MAXL = {'armor': 5, 'engine': 4, 'loader': 5, 'caliber': 4, 'barrel': 3, 'repair': 3, 'blast': 2, 'ricochet': 2, 'magnet': 2, 'thermal': 1, 'boost': 3}
ORDER = {
    'full': ['caliber'] * 4 + ['loader'] * 5 + ['barrel'] * 3 + ['armor'] * 5 + ['engine'] * 4 + ['repair'] * 3 + ['blast'] * 2 + ['thermal'] + ['boost'] * 3 + ['ricochet'] * 2 + ['magnet'] * 2,
    'medium': ['armor', 'caliber', 'engine', 'loader', 'barrel', 'armor', 'repair', 'loader', 'caliber', 'boost', 'armor', 'blast', 'magnet', 'caliber', 'engine', 'loader', 'barrel',
               'armor', 'ricochet', 'repair', 'boost', 'loader', 'caliber', 'armor', 'thermal', 'engine', 'magnet', 'repair', 'blast', 'boost', 'engine', 'barrel', 'armor', 'loader', 'ricochet'],
    'strong': ['caliber', 'loader', 'caliber', 'loader', 'thermal', 'blast', 'caliber', 'loader', 'armor', 'blast', 'caliber', 'loader', 'armor', 'loader', 'barrel', 'armor', 'barrel', 'armor',
               'engine', 'barrel', 'repair', 'engine', 'repair', 'boost', 'ricochet', 'ricochet', 'engine', 'repair', 'boost', 'boost', 'engine', 'magnet', 'magnet'],
}


def cards(kind, w):
    out, n = {}, 0
    if kind == 'weak':
        return out
    for k in ORDER[kind]:
        if n >= w - 1:
            break
        if out.get(k, 0) < MAXL[k]:
            out[k] = out.get(k, 0) + 1
            n += 1
    return out


FIGHT = "([w, up, tank, key]) => __tank.bossFight(w, up, tank, 540, key)"
rows = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = new_ctx(b, 'probe', viewport={'width': 1280, 'height': 800})
    page = ctx.new_page(); seed(page)
    page.click('#btnStart'); page.wait_for_timeout(300)
    for w in waves:
        for kind in sets:
            res = []
            for i in range(runs):
                tank = tank_arg if tank_arg != 'auto' else ('std' if w < 10 else T2[i % len(T2)])
                r = page.evaluate(FIGHT, [w, cards(kind, w), tank, boss_key]); r.update(wave=w, set=kind, tank=tank, boss=boss_key or ''); res.append(r)
                if r['hpLeft'] <= 0 or not r['win']:
                    page.evaluate("() => { const G = __tank.G; G.state = 'play'; G.player.alive = true; G.player.dead = false; G.phase = 'fight'; G.timeScale = 1; }")
            rows += res
            wins = [r for r in res if r['win']]
            secs = [r['secs'] for r in wins] or [0]
            print(f"wave {w:2d} {kind:6s} bossHP {res[0]['maxHp']:3d}  win {len(wins):2d}/{runs}  mean {st.mean(secs):5.0f}s  median {st.median(secs):5.0f}s  max {max(secs):4.0f}s  "
                  f"dmg {st.mean(r['dmg'] for r in res):4.0f}  deaths {sum(1 for r in res if r['hpLeft'] <= 0):2d}  timeouts {sum(1 for r in res if not r['win'] and r['hpLeft'] > 0):2d}")
    b.close()
(TMP).mkdir(exist_ok=True)
(TMP / 'boss_probe.json').write_text(json.dumps(rows))
print('page errors:', real_errors()[:3] or 'none')
