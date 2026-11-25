"""Dikenli zırh (1.5.6 card): 3 levels, normal card; an enemy that touches the player takes L hits per touch (0.7 s per enemy); contact damage (boss rams) -20/-35/-50%, half of that against a boss,
the boss takes a small fixed hit with a longer cooldown (2.2 s); bullets, mines and Topçu blasts are not contact.
Usage: TANK_TEST_PORT=8821 python3 tests/check_dikenli.py"""
from common import *  # noqa: F401,F403

report_on_exit('check_dikenli', R)
FAILS = []


def check(name, ok, info=None):
    R[name] = info if info is not None else ok
    vprint(('ok   ' if ok else 'FAIL ') + name, info if not ok else '')
    if not ok:
        FAILS.append(name)
        print('FAIL', name, info)


def ev(page, js, arg=None):
    return page.evaluate(js, arg) if arg is not None else page.evaluate(js)


SETUP = """() => { const t = __tank, G = t.G; window.t = t; window.G = G;
  window.arena = (L) => { t.wave(12); G.god = false; t.dbg.freeze = false; t.killAll(); G.bullets = []; G.queue = []; G.portals = []; t.clearArena(); G.phase = 'fight'; G.contactT = G.time; G.silT = G.time;
    t.setUp(L ? { thorns: L } : {}); const dm = t.spawn('tamirci', 30 * 48, 30 * 48); dm.hp = dm.maxHp = 999;
    const p = G.player; p.x = p.y = 15 * 48; p.vx = p.vy = 0; p.hp = p.maxHp = 100; const V = t.view; V.bx0 = V.by0 = -1e6; V.bx1 = V.by1 = 1e6; return p; };
  // an enemy pinned against the player for `sec` seconds; returns hp lost
  window.touch = (L, type, sec) => { const p = window.arena(L); const e = t.spawn(type, p.x + 30, p.y); e.hp = e.maxHp = 5000; const h0 = e.hp; let hits = 0, last = e.thT || 0;
    for (let i = 0; i < Math.round(sec * 60); i++) { e.x = p.x + e.r + p.r - 2; e.y = p.y; e.stunT = 99; t.step(1 / 60); if ((e.thT || 0) !== last) { hits++; last = e.thT; } }
    return { lost: +(h0 - e.hp).toFixed(2), hits, thT: +(e.thT - G.time).toFixed(2), type: e.type }; };
}"""
RAM = "([L, near, extra]) => { const p = window.arena(L); if (near) { const e = t.spawn(near, p.x + 30, p.y); e.hp = e.maxHp = 9999; } const hp0 = p.hp; t.damagePlayer(Object.assign({ x: p.x, y: p.y, dmg: 20, owner: 1, vx: 0, vy: 0 }, extra || {})); return +(hp0 - p.hp).toFixed(2); }"

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = new_ctx(b, 'desktop', viewport={'width': 1000, 'height': 760})
    page = ctx.new_page(); seed(page)
    page.click('#btnStart'); page.wait_for_timeout(300)
    ev(page, SETUP)

    d = ev(page, "(() => { const u = t.UPS.thorns; return [!!u, u && u.max, !!(u && u.rare), t.UP_KEYS.includes('thorns'), u && u.name, [1, 2, 3].map(L => u.desc(L).length > 20)]; })()")
    check('card_defined', d[0] and d[1] == 3 and not d[2] and d[3] and d[4] == 'Dikenli zırh' and all(d[5]), d)
    for L in (1, 2, 3):
        r = ev(page, "([L]) => window.touch(L, 'basic', 0.5)", [L])
        check(f'touch_damage_level{L}', r['hits'] == 1 and r['lost'] == L, r)
    r = ev(page, "window.touch(1, 'basic', 2.0)")
    check('touch_cooldown_07s', r['hits'] == 3 and r['lost'] == 3, r)
    r = ev(page, "window.touch(0, 'basic', 1.0)")
    check('no_card_no_damage', r['lost'] == 0 and r['hits'] == 0, r)
    kill = ev(page, "(() => { const p = window.arena(3); const e = t.spawn('basic', p.x + 30, p.y); e.hp = e.maxHp = 2; e.x = p.x + e.r + p.r - 2; e.y = p.y; e.stunT = 99; t.step(1 / 60); return e.dead || e.hp <= 0; })()")
    check('touch_can_kill_enemy', kill)

    base = ev(page, RAM, [0, None])
    check('no_card_full_damage', base == 20, base)
    red = [ev(page, RAM, [L, 'basic']) for L in (1, 2, 3)]
    check('contact_reduction_20_35_50', red == [16, 13, 10], red)
    check('no_reduction_without_touch', ev(page, RAM, [3, None]) == 20)
    check('bullets_not_contact', ev(page, RAM, [3, 'basic', {'life': 1.0, 'vx': 300}]) == 20)
    check('mines_and_explicit_false_not_contact', ev(page, RAM, [3, 'basic', {'ram': False}]) == 20 and ev(page, RAM, [3, 'basic', {'mine': True}]) == 20)
    bred = [ev(page, RAM, [L, 'boss']) for L in (1, 2, 3)]
    check('boss_reduction_half_value', bred == [18, 16.5, 15], bred)

    r = ev(page, "window.touch(2, 'boss', 0.2)")
    check('boss_touch_cooldown_longer', r['type'] == 'boss' and 2.0 <= r['thT'] <= 2.2, r)
    ratio = ev(page, "(() => { const a = window.touch(1, 'basic', 0.1).thT, b = window.touch(1, 'boss', 0.1).thT; return [a, b]; })()")
    check('boss_cooldown_vs_normal', ratio[1] > ratio[0] * 2, ratio)
    check('boss_thorn_small', ev(page, "t.THORN.boss.every(v => v <= 6) && t.THORN.boss[0] >= 1"))

    sp = ev(page, "(() => { window.arena(3); return document.querySelector('#guide') ? true : true; })()")
    page.screenshot(path='.tmp/shots/dikenli.png')
    b.close()

errs = real_errors()
check('no_page_errors', not errs, errs[:3])
print('check_dikenli:', 'FAILED ' + ', '.join(FAILS) if FAILS else 'all ok')
print('ERRORS:', errs or 'none')
sys.exit(1 if FAILS else 0)
