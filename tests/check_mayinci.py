"""Mayıncı (Şehir, wave 34+; 1.5.6): roster (first at 34, Şehir only, shares to 10%, at most 2 alive), mines (cap 3 each / 6 on the map, arm after 1 s, hurt the player, ignore enemies,
shot off by a player shell, gone when the wave ends), knowledge (only seen / heard positions), the one-time tip, no page errors.
Usage: TANK_TEST_PORT=8820 python3 tests/check_mayinci.py"""
from common import *  # noqa: F401,F403

report_on_exit('check_mayinci', R)
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
  window.arena = (w) => { t.wave(w || 36); G.god = false; t.dbg.freeze = false; t.killAll(); G.bullets = []; G.queue = []; G.portals = []; G.mines = []; t.clearArena(); G.phase = 'fight'; G.contactT = G.time; G.silT = G.time; const dm = t.spawn('tamirci', 40 * 48, 40 * 48); dm.hp = dm.maxHp = 999; // a far weaponless tank keeps the wave from ending
    const p = G.player; p.x = 24 * 48; p.y = 24 * 48; p.vx = p.vy = 0; p.hp = p.maxHp; const V = t.view; V.bx0 = V.by0 = -1e6; V.bx1 = V.by1 = 1e6; return p; };
  window.mine = (x, y, age) => { const q = { x, y, age: age === undefined ? 5 : age, armed: (age === undefined ? 5 : age) >= 1, dead: false, own: 1, w: G.wave, ph: 0 }; G.mines.push(q); return q; };
  window.cnt = (list, ty) => list.filter(x => x === ty).length;
}"""
ROSTER = "([w, n]) => { let any = 0, mx = 0, mn = 99; for (let i = 0; i < n; i++) { const c = cnt(t.buildRoster(w).list, 'mayinci'); if (c) any++; mx = Math.max(mx, c); mn = Math.min(mn, c); } return { any, mx, mn }; }"

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = new_ctx(b, 'desktop', viewport={'width': 1000, 'height': 760})
    page = ctx.new_page(); seed(page)
    page.click('#btnStart'); page.wait_for_timeout(300)
    ev(page, SETUP)
    ev(page, "(() => { G.beaten.clear(); G.beaten.add('sari'); G.beaten.add('demirkok'); G.beaten.add('kiragi'); })()")

    # ---- roster ----
    sp = ev(page, "t.SPECS.mayinci")
    check('spec', sp['hp'] == 3 and sp['miner'] and sp['dmg'] == 0, sp)
    pm = ev(page, "[24, 30, 33, 34, 36, 37, 38, 39, 40, 41, 45].map(w => +t.typeShares(w).pm.toFixed(4))")
    check('share_curve', pm == [0, 0, 0, 0, 0.054, 0.066, 0.078, 0.09, 0.1, 0, 0], pm)
    r34, r33, r37 = ev(page, ROSTER, [34, 200]), ev(page, ROSTER, [33, 200]), ev(page, ROSTER, [37, 200])
    check('first_wave_34_exactly_one', r34['mn'] == 1 and r34['mx'] == 1 and r33['any'] == 0, [r34, r33])
    check('comes_in_city_waves', r37['any'] > 150, r37)
    check('boss_waves_clean', ev(page, "[35, 40].map(w => t.buildRoster(w).list)") == [['boss'], ['boss']])
    check('not_in_other_regions', ev(page, "[11, 22, 26, 29].every(w => cnt(t.buildRoster(w).list, 'mayinci') === 0)"))
    check('no_region_ban', ev(page, "['sari', 'demirkok', 'kiragi', 'komutan', 'hisar'].every(id => !(t.REGION_BAN ? (t.REGION_BAN[id] || []).includes('mayinci') : false)) && !t.typeBanned('mayinci')"))
    mx = ev(page, """() => { t.wave(36); G.god = true; t.dbg.freeze = false; t.killAll(); G.queue = Array(8).fill('mayinci'); G.maxAlive = 12; G.spawnTimer = 0; let most = 0;
      for (let i = 0; i < 60 * 40; i++) { t.step(1 / 60); most = Math.max(most, G.enemies.filter(e => e.type === 'mayinci').length + G.portals.filter(q => q.type === 'mayinci').length); } return most; }""")
    check('at_most_two_alive', mx == 2, mx)
    ev(page, "localStorage.removeItem('tankArena.seenMayinci')")
    ev(page, "(() => { const h = document.getElementById('hint'); h.classList.remove('show'); h.textContent = ''; t.spawn('mayinci', 500, 500); })()")
    check('first_time_hint', 'Mayıncı' in ev(page, "document.getElementById('hint').textContent"))

    # ---- mines: laid on the move, capped, armed after 1 s ----
    r = ev(page, """() => { const p = window.arena(36); const e = t.spawn('mayinci', p.x + 600, p.y); G.god = true; let mx = 0, first = null, armedAfter = null;
      for (let i = 0; i < 60 * 45; i++) { t.step(1 / 60); mx = Math.max(mx, G.mines.length); const q = G.mines[0]; if (q && first === null) first = { age: q.age, armed: q.armed }; if (q && armedAfter === null && q.age > 1.05) armedAfter = q.armed; }
      return { mx, first, armedAfter, own: t.mineCount(e.id) }; }""")
    check('lays_mines_max_three', 1 <= r['mx'] <= 3 and r['own'] <= 3, r)
    check('arms_after_one_second', r['first'] and not r['first']['armed'] and r['armedAfter'] is True, r)
    r = ev(page, """() => { const p = window.arena(36); G.god = true; t.spawn('mayinci', 300, 300); t.spawn('mayinci', 1800, 1800); let mx = 0, lay = 0;
      for (let i = 0; i < 60 * 90; i++) { t.step(1 / 60); mx = Math.max(mx, G.mines.length); } return { mx, n: G.enemies.filter(e => e.type === 'mayinci').length }; }""")
    check('map_cap_six', r['mx'] <= 6 and r['mx'] >= 2, r)

    # ---- the mine: hurts the player, spares enemies, can be shot, wave end clears it ----
    r = ev(page, """() => { const p = window.arena(36); const q = window.mine(p.x + 300, p.y, 0.3); const un = (() => { p.x = q.x; p.y = q.y; t.step(0.1); return { gone: q.dead, hp: p.hp }; })();
      const q2 = window.mine(p.x + 5, p.y, 3); p.x = q2.x; p.y = q2.y; t.step(0.05); return { un, hp: p.hp, max: p.maxHp, dead: q2.dead, left: G.mines.length }; }""")
    check('unarmed_mine_harmless', not r['un']['gone'] and r['un']['hp'] == r['max'], r)
    check('armed_mine_hurts_player', r['dead'] and r['hp'] < r['max'] and r['left'] >= 0, r)
    r = ev(page, """() => { const p = window.arena(36); const q = window.mine(p.x + 400, p.y, 3); const e = t.spawn('basic', q.x, q.y); const hp0 = e.hp; t.step(1.0); return { alive: !q.dead, hp: e.hp === hp0, mines: G.mines.length }; }""")
    check('enemies_dont_trigger', r['alive'] and r['hp'] and r['mines'] == 1, r)
    r = ev(page, """() => { const p = window.arena(36); const q = window.mine(p.x + 240, p.y, 3); const hp0 = p.hp; t.fire(); p.turret = 0; G.bullets.push({ x: p.x + 40, y: p.y, vx: 660, vy: 0, r: 4, owner: 0, dmg: 1, life: 2, dead: false, pierce: false, bounce: 0, splash: null, look: 'player', hits: null, bricks: null, sx: p.x, sy: p.y, dist: 0, bounced: false, vol: 1, volN: 1, pn: 0 });
      t.step(0.6); return { gone: q.dead, hp: p.hp === hp0 }; }""")
    check('shot_detonates_safely', r['gone'] and r['hp'], r)
    r = ev(page, """() => { const p = window.arena(36); window.mine(p.x + 300, p.y, 3); window.mine(p.x + 400, p.y + 100, 0.2); const n0 = G.mines.length; G.phase = 'cleared'; t.step(0.1); return { n0, n1: G.mines.length }; }""")
    check('cleared_at_wave_end', r['n0'] == 2 and r['n1'] == 0, r)

    # ---- knowledge: it knows only what it saw or heard ----
    r = ev(page, """() => { const p = window.arena(36); const e = t.spawn('mayinci', p.x + 700, p.y); e.turret = e.angle = 0; t.step(1); const before = !!e.lk;
      e.x = p.x + 5 * 48; e.y = p.y; e.angle = e.turret = 0; p.lastShot = G.time; e.heardShot = undefined; t.step(0.2); const lk = e.lk ? Math.hypot(e.lk.x - p.x, e.lk.y - p.y) / 48 : null; return { before, lk, goalNear: e.my && e.my.g ? Math.hypot(e.my.g.x - p.x, e.my.g.y - p.y) / 48 : null }; }""")
    check('knows_nothing_until_seen_or_heard', r['before'] is False, r)
    check('heard_shot_gives_rough_position', r['lk'] is not None and r['lk'] <= 3.6, r)
    r = ev(page, """() => { const p = window.arena(36); const e = t.spawn('mayinci', p.x + 4 * 48, p.y); e.turret = e.angle = Math.PI; t.step(0.3); const d0 = Math.hypot(e.x - p.x, e.y - p.y); t.step(3); return { seen: e.canSee, d0, d1: Math.hypot(e.x - p.x, e.y - p.y) }; }""")
    check('runs_from_player_it_sees', r['d1'] > r['d0'] - 10, r)
    page.screenshot(path='.tmp/shots/mayinci.png')
    b.close()

errs = real_errors()
check('no_page_errors', not errs, errs[:3])
print('check_mayinci:', 'FAILED ' + ', '.join(FAILS) if FAILS else 'all ok')
print('ERRORS:', errs or 'none')
sys.exit(1 if FAILS else 0)
