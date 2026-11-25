"""Boss reach check: every tile where the player can stand in a boss arena must be reachable by the boss, or lie within ~1.5 tiles of a tile the boss reaches
with a clear line of fire (ram or direct shot). Walls are tiles that block tanks (steel, brick, water); the player hull is r=17, boss hulls come from the boss defs.
Usage: python3 tests/check_boss_reach.py     (full report: .tmp/check_boss_reach.json)"""
import math
import sys
from common import *  # noqa: F401,F403

T = 48
PLAYER_R = 17           # largest player hull incl. margin the tank collider uses
BOSSES = {'komutan': ('kisla', 38), 'sari': ('kum', 27), 'demirkok': ('kale', 46), 'kapatici': ('kapanis', 27), 'sonhisar': ('sehir', 52)}
BLOCK = set('SBW'); SHOT_BLOCK = set('SB')
FAR_MAX = 0.08          # largest share of inner open tiles that may lie 2+ tiles from every boss tile
GAP = T                 # hull-to-hull gap the boss closes by itself (ram or charge): reach = boss r + player r + GAP


def load_arenas():
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = new_ctx(b, 'reach').new_page(); seed(pg)
        pg.click('#btnStart'); pg.wait_for_timeout(200)
        a = pg.evaluate("JSON.stringify(Object.fromEntries(Object.entries(__tank.ARENAS).map(([k, v]) => [k, v.rows])))")
        b.close()
    return json.loads(a)


def fit_map(rows, rad):
    n = len(rows); k = math.ceil(rad / T) + 1

    def blk(c, r): return c < 0 or r < 0 or c >= n or r >= n or rows[r][c] in BLOCK
    fit = [[1] * n for _ in range(n)]
    for r in range(n):
        for c in range(n):
            cx, cy = c * T + T / 2, r * T + T / 2
            for dy in range(-k, k + 1):
                for dx in range(-k, k + 1):
                    if not blk(c + dx, r + dy): continue
                    bx, by = (c + dx) * T, (r + dy) * T
                    ex, ey = cx - min(max(cx, bx), bx + T), cy - min(max(cy, by), by + T)
                    if ex * ex + ey * ey < rad * rad: fit[r][c] = 0
    return fit


def flood(fit, start):
    n = len(fit); seen = {start}; q = [start]
    for c, r in q:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            x, y = c + dx, r + dy
            if 0 <= x < n and 0 <= y < n and fit[y][x] and (x, y) not in seen: seen.add((x, y)); q.append((x, y))
    return seen


def clear(rows, a, b):
    (c0, r0), (c1, r1) = a, b; x0, y0, x1, y1 = c0 * T + 24, r0 * T + 24, c1 * T + 24, r1 * T + 24
    n = max(1, int(math.hypot(x1 - x0, y1 - y0) / 6))
    for i in range(1, n):
        x, y = x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n
        if rows[int(y // T)][int(x // T)] in SHOT_BLOCK: return False
    return True


def audit(rows, boss_r):
    start = None
    for r, row in enumerate(rows):
        if 'X' in row: start = (row.index('X'), r)
    pl = flood(fit_map(rows, PLAYER_R), next((row.index('P'), r) for r, row in enumerate(rows) if 'P' in row))
    bo = flood(fit_map(rows, boss_r + 2), start)
    bad = []
    for (c, r) in sorted(pl, key=lambda t: (t[1], t[0])):
        if (c, r) in bo: continue
        near = [q for q in bo if math.hypot((q[0] - c) * T, (q[1] - r) * T) <= boss_r + PLAYER_R + GAP and clear(rows, q, (c, r))]
        if not near: bad.append((c, r))
    # shape rule: boss tiles must cover the open ground, not just a thin spine. Share of inner player tiles (not on the border ring) lying 2+ tiles from every boss tile must stay small.
    # The broken 1.5.3 Kale (leftover steel on rows 8/12) had 11%; the fixed arenas have 0-6%.
    inner = [q for q in pl if 1 <= q[0] <= len(rows) - 2 and 1 <= q[1] <= len(rows) - 2 and q not in bo]
    far = [q for q in inner if min(math.hypot(q[0] - x, q[1] - y) for x, y in bo) >= 2]
    if inner and len(far) / len(inner) > FAR_MAX: bad += [q for q in far if q not in bad]
    return bad, len(pl), len(bo)


def ok(o):
    """hurt, touched, or had the player in a clear line of fire (within 9 tiles) for at least 2 s"""
    return o['hit'] >= 0 or o['closest'] <= 15 or o['seen'] >= 2


if __name__ == '__main__':
    arenas = load_arenas(); rep, fails = {}, 0
    for boss, (ak, rad) in BOSSES.items():
        bad, npl, nbo = audit(arenas[ak], rad)
        rep[boss] = {'arena': ak, 'player_tiles': npl, 'boss_tiles': nbo, 'unreachable': bad}
        print(f"{boss:9s} arena {ak:6s} player tiles {npl:3d} boss tiles {nbo:3d} unreachable pockets {len(bad)} {bad[:8]}")
        fails += len(bad)
    # live check (not for Kapatici: it only knows what it sees or hears, a passive player far away is not hunted by design): a passive player on the player-reachable tiles farthest from the boss's own tiles; the boss must touch or hurt it in time (slow Demirkok gets longer)
    LIVE = {'komutan': (15, 25), 'sari': (10, 20), 'demirkok': (20, 70), 'sonhisar': (40, 60)}  # Son Hisar is slow (speed 30): it reaches a far player with its mortar, shells and charges
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = new_ctx(b, 'reach2').new_page(); seed(pg); pg.click('#btnStart'); pg.wait_for_timeout(200)
        for boss, (w, secs) in LIVE.items():
            rows = arenas[BOSSES[boss][0]]
            st = next((row.index('X'), r) for r, row in enumerate(rows) if 'X' in row)
            pl = flood(fit_map(rows, PLAYER_R), next((row.index('P'), r) for r, row in enumerate(rows) if 'P' in row)); bo = flood(fit_map(rows, BOSSES[boss][1] + 2), st)
            far = sorted(pl, key=lambda q: -min(math.hypot(q[0] - x, q[1] - y) for x, y in bo))
            spots = []
            for q in far:
                if all(math.hypot(q[0] - o[0], q[1] - o[1]) > 4 for o in spots): spots.append(q)
                if len(spots) == 5: break
            res = []
            for (c, r) in spots:
                o = pg.evaluate("([w, c, r, t]) => __tank.bossReach(w, c, r, t)", [w, c, r, secs]); o.update(tile=[c, r]); res.append(o)
                if not ok(o): fails += 1; print('  FAIL live', boss, o)
            rep[boss]['live'] = res
            print(f"{boss:9s} live spots {len(res)} hit or touched in {secs}s: {sum(1 for o in res if ok(o))}")
        b.close()
    TMP.mkdir(exist_ok=True); (TMP / 'check_boss_reach.json').write_text(json.dumps(rep, indent=1))
    print('FAIL' if fails else 'OK', '| tiles:', fails)
    sys.exit(1 if fails else 0)
