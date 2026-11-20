"""Package D2 (1.4): the two Keskin Nisanci tier-2 tanks, Rayli Top (laser line, pierce) and Obus (lob shell, area damage, aim distance).
Logic checks run through __tank (no waiting for real time), then 60 s of autopilot per tank at wave 12, then screenshots in .tmp/shots (d2_*.png).
Run: TANK_TEST_PORT=8840 python3 tests/check_tier2_d2.py     (prints a JSON report, then ERRORS: none)"""
from common import *  # noqa: F401,F403

FAILS = []


def check(name, ok, info=None):
    R.setdefault('checks', {})[name] = bool(ok) if info is None else {'ok': bool(ok), 'info': info}
    if not ok:
        FAILS.append(name)


# clear arena in fight phase, player in the middle facing east, nothing spawning; the tank is `tid`
SETUP = """([tid, up, w]) => { const t = __tank, G = t.G, p = G.player, T = 48;
  t.noEvo(true); t.wave(w || 3); G.queue = ['basic']; G.maxAlive = 0; G.portals.length = 0; G.enemies.length = 0; G.bullets.length = 0; G.phase = 'fight'; G.fade = 0; t.hold(true);
  t.setUp(up || {}); t.setTank(tid); t.clearArena(); p.x = 10.5 * T; p.y = 10.5 * T; p.turret = 0; p.angle = 0; p.vx = p.vy = 0; p.hp = p.maxHp; p.cool = 0; p.aimDist = 6 * T;
  t.cam.x = p.x; t.cam.y = p.y; G.texts.length = 0; G.buffs.pierce = 0; t.step(0.2); p.x = 10.5 * T; p.y = 10.5 * T; p.turret = 0; return true; }"""

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = new_ctx(b, 'd2', viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True)
    page = ctx.new_page(); seed(page)
    page.tap('#btnStart'); page.wait_for_timeout(300)
    ev = page.evaluate

    # ---------- table ----------
    tab = ev("""() => { const t = __tank, out = {}; for (const id of ['std', 'rayli', 'obus']) { const s = t.playerSpec(id); out[id] = { dps: +s.dps.toFixed(3), dmg: s.dmg, cool: s.cool, stub: !!t.TANKS[id].stub, mode: s.mode, shape: s.shape }; }
      out.ratioR = +(out.rayli.dps / out.std.dps).toFixed(3); out.ratioO = +(out.obus.dps / out.std.dps).toFixed(3); return out; }""")
    R['table'] = tab
    check('no_stub', not tab['rayli']['stub'] and not tab['obus']['stub'])
    check('dps_ratio', abs(tab['ratioR'] - 0.92) < 0.03 and abs(tab['ratioO'] - 1.31) < 0.03, tab)
    check('modes', tab['rayli']['mode'] == 'shell' and tab['obus']['mode'] == 'lob' and tab['rayli']['shape'] == 'rail' and tab['obus']['shape'] == 'obus')

    # ---------- Rayli: pierce, steel, laser ----------
    RAY = """([up]) => { const t = __tank, G = t.G, p = G.player, T = 48; (""" + SETUP + """)(['rayli', up]); const m = G.map, n = m.n;
      const row = 10; for (const c of [13, 14]) { m.t[row * n + c] = 1; m.hp[row * n + c] = 3; } m.t[row * n + 19] = 2;
      const e1 = t.spawn('heavy', 16.5 * T, 10.5 * T), e2 = t.spawn('heavy', 17.5 * T, 10.5 * T); e1.hp = e1.maxHp = 100; e2.hp = e2.maxHp = 100;
      t.fire(); const b = G.bullets[0], out = { pierce: !!b.pierce, look: b.look, speed: Math.hypot(b.vx, b.vy), dmg: b.dmg };
      let bouncedAt = -1, vxNeg = false;
      for (let i = 0; i < 90 && !b.dead; i++) { t.stepBullets(1 / 60); if (b.bounced && bouncedAt < 0) { bouncedAt = i; vxNeg = b.vx < 0; } if (bouncedAt >= 0 && i > bouncedAt + 6) break; }
      out.brick1 = m.hp[row * n + 13]; out.brick2 = m.hp[row * n + 14]; out.hp1 = e1.hp; out.hp2 = e2.hp; out.dead = b.dead; out.bounced = bouncedAt >= 0; out.vxNeg = vxNeg;
      out.steelStays = m.t[row * n + 19] === 2; out.x = Math.round(b.x); return out; }"""
    plain = ev(RAY, [{}])
    R['rayli_plain'] = plain
    check('rayli_pierce_flag', plain['pierce'] and plain['look'] == 'rail' and plain['speed'] >= 1000, plain)
    check('rayli_through_two_bricks', plain['brick1'] == 2 and plain['brick2'] == 2, plain)
    check('rayli_through_two_tanks', plain['hp1'] < 100 and plain['hp2'] < 100, plain)
    check('rayli_stopped_by_steel', plain['dead'] and not plain['bounced'] and plain['steelStays'] and plain['x'] <= 19 * 48 + 2, plain)
    sek = ev(RAY, [{'ricochet': 1}])
    R['rayli_sekme'] = sek
    check('rayli_sekme_bounces', sek['bounced'] and sek['vxNeg'] and not sek['dead'], sek)

    laser = ev("""() => { const t = __tank, G = t.G, T = 48; (""" + SETUP + """)(['rayli', {}]); const m = G.map, n = m.n;
      const out = {}; const x0 = 10.5 * T + 43, y0 = 10.5 * T;
      let L = t.rayLaser(x0, y0, 0); out.edge = L; // nothing but the border: ends at the world edge (x = 24 * T)
      m.t[10 * n + 16] = 1; m.hp[10 * n + 16] = 3; L = t.rayLaser(x0, y0, 0); out.brick = L; // a brick does not stop the line
      m.t[10 * n + 17] = 2; L = t.rayLaser(x0, y0, 0); out.steel = L; out.steelTile = m.at(L.x + 1, L.y);
      // diagonal against a brute-force march
      m.t[14 * n + 15] = 2; const a = Math.atan2(4 * T, 5 * T); L = t.rayLaser(x0, y0, a); let bx = x0, by = y0, g = 0; while (!(m.at(bx, by) === 2) && g++ < 5000) { bx += Math.cos(a) * 0.25; by += Math.sin(a) * 0.25; }
      out.diag = { x: L.x, y: L.y, bx, by }; return out; }""")
    R['laser'] = laser
    check('laser_edge', abs(laser['edge']['x'] - 24 * 48) < 1 and laser['edge']['steel'], laser['edge'])
    check('laser_ignores_bricks', abs(laser['brick']['x'] - 24 * 48) < 1, laser['brick'])
    check('laser_ends_at_first_steel', abs(laser['steel']['x'] - 17 * 48) < 1 and laser['steelTile'] == 2, laser['steel'])
    check('laser_diagonal', abs(laser['diag']['x'] - laser['diag']['bx']) < 1.5 and abs(laser['diag']['y'] - laser['diag']['by']) < 1.5, laser['diag'])

    # ---------- Obus ----------
    LOB = """([up, extra]) => { const t = __tank, G = t.G, p = G.player, T = 48; (""" + SETUP + """)(['obus', up]); const m = G.map, n = m.n;
      for (let r = 8; r <= 12; r++) { m.t[r * n + 13] = 2; } // steel wall between the player and the landing point
      const tx = p.x + 6 * T, ty = p.y; p.aimDist = 6 * T;
      const A = t.spawn('basic', tx + 30, ty), B = t.spawn('basic', 11.9 * T, ty), C = t.spawn('basic', tx, ty + 95), D = t.spawn('basic', tx, ty);
      for (const e of [A, B, C, D]) e.hp = e.maxHp = 100;
      m.t[10 * n + 17] = 1; m.hp[10 * n + 17] = 3; m.t[10 * n + 18] = 1; m.hp[10 * n + 18] = 3; // next to / beyond the reach of the landing
      const dec0 = m.decals.length; t.fire(); const b = G.bullets[0];
      const out = { lob: !!b.lob, pierce: !!b.pierce, bounce: b.bounce, far: b.far, bb: b.bb, ambush: b.ambush, T: b.lob.T, R: b.lob.R, tx: b.lob.tx, ty: b.lob.ty, hmax: 0, flew: 0 };
      let enemyShot = null;
      for (let i = 0; i < 120 && !b.dead; i++) {
        t.stepBullets(1 / 60); out.hmax = Math.max(out.hmax, b.h || 0); if (!b.dead) out.flew++;
        if (i === 10) { enemyShot = { x: b.x, y: b.y, vx: 0, vy: 0, r: 4, owner: 1, dmg: 1, life: 2, dead: false, look: 'enemy' }; G.bullets.push(enemyShot); }
        if (i === 12 && enemyShot) { out.enemyShotAlive = !enemyShot.dead; out.lobAliveAfterEnemy = !b.dead; }
      }
      out.landed = b.dead; out.hpA = A.hp; out.hpB = B.hp; out.hpC = C.hp; out.hpD = D.hp; out.brickNear = m.hp[10 * n + 17]; out.brickFar = m.hp[10 * n + 18]; out.decal = m.decals.length - dec0;
      out.steelStays = m.t[10 * n + 13] === 2; out.dmg = b.dmg; out.Dd = Math.hypot(D.x - tx, D.y - ty); return out; }"""
    lob = ev(LOB, [{}, None])
    R['obus_lob'] = lob
    check('obus_is_lob', lob['lob'] and not lob['pierce'] and lob['bounce'] == 0 and abs(lob['R'] - 70) < 0.01, lob)
    check('obus_lands_behind_wall', lob['landed'] and lob['steelStays'] and abs(lob['tx'] - (10.5 + 6) * 48) < 1 and lob['hpA'] < 100 and lob['hpD'] < 100, lob)
    check('obus_flies_over_tank', lob['hpB'] == 100 and lob['hpC'] == 100 and lob['hmax'] > 0.9, lob)
    check('obus_falloff', lob['hpD'] < lob['hpA'] and abs((100 - lob['hpD']) - lob['dmg']) < 0.01 and (100 - lob['hpA']) > 0.5 * lob['dmg'] - 1e-6, lob)
    check('obus_bricks_in_reach', lob['brickNear'] == 2 and lob['brickFar'] == 3, lob)
    check('obus_scorch_decal', lob['decal'] >= 1, lob)
    check('obus_enemy_shell_passes', lob.get('enemyShotAlive') and lob.get('lobAliveAfterEnemy'), lob)

    # area falloff at exact distances (centre, half, rim) and the Patlayici enlargement
    fall = ev("""() => { const t = __tank, G = t.G, p = G.player, T = 48; (""" + SETUP + """)(['obus', {}]);
      const tx = p.x + 6 * T, ty = p.y, out = { R: t.lobArea() }, es = [];
      for (const d of [0, 30, 58]) { const e = t.spawn('basic', tx, ty + d); e.hp = e.maxHp = 100; es.push(e); }
      t.fire(); const b = G.bullets[0]; for (let i = 0; i < 90 && !b.dead; i++) t.stepBullets(1 / 60);
      out.drops = es.map(e => +(100 - e.hp).toFixed(3)); out.dmg = b.dmg; return out; }""")
    R['obus_falloff'] = fall
    d0, d30, d58 = fall['drops']
    check('obus_falloff_numbers', abs(d0 - fall['dmg']) < 0.01 and abs(d30 - fall['dmg'] * (1 - 0.5 * 30 / fall['R'])) < 0.01 and abs(d58 - fall['dmg'] * (1 - 0.5 * 58 / fall['R'])) < 0.01, fall)

    blast = ev("""([lv]) => { const t = __tank, G = t.G, p = G.player, T = 48; (""" + SETUP + """)(['obus', lv ? { blast: lv } : {}]);
      const tx = p.x + 6 * T, ty = p.y, R = t.lobArea(), e = t.spawn('basic', tx, ty); e.hp = e.maxHp = 100; const d = 70 + e.r + 6; e.y = ty + d;
      t.fire(); const b = G.bullets[0]; for (let i = 0; i < 90 && !b.dead; i++) t.stepBullets(1 / 60);
      return { R, hit: e.hp < 100, d }; }""", [0])
    blast1 = ev(blast if False else """([lv]) => { const t = __tank, G = t.G, p = G.player, T = 48; (""" + SETUP + """)(['obus', lv ? { blast: lv } : {}]);
      const tx = p.x + 6 * T, ty = p.y, R = t.lobArea(), e = t.spawn('basic', tx, ty); e.hp = e.maxHp = 100; const d = 70 + e.r + 6; e.y = ty + d;
      t.fire(); const b = G.bullets[0]; for (let i = 0; i < 90 && !b.dead; i++) t.stepBullets(1 / 60);
      return { R, hit: e.hp < 100, d }; }""", [2])
    R['obus_blast'] = [blast, blast1]
    check('obus_patlayici_enlarges', abs(blast['R'] - 70) < 0.01 and not blast['hit'] and abs(blast1['R'] - 105) < 0.01 and blast1['hit'], [blast, blast1])

    # Delici / Sekme do nothing; Uzak vuruş and Seken patlama flags are off for a lob; Pusu works
    flags = ev("""() => { const t = __tank, G = t.G, p = G.player; (""" + SETUP + """)(['obus', { caliber: 1, barrel: 1, ricochet: 1, blast: 1, thermal: 1 }]);
      G.buffs.pierce = 9; t.fire(); const b = G.bullets[0]; const syn = t.syn(); const e = t.spawn('basic', p.x + 200, p.y); e.canSee = false; e.hp = e.maxHp = 100; e.hidden = true;
      const m = t.synDmg(b, e); return { syn, pierce: b.pierce, bounce: b.bounce, far: b.far, bb: b.bb, ambush: b.ambush, mult: m }; }""")
    R['obus_flags'] = flags
    check('obus_syn_flags', {'far', 'bb', 'amb'} <= set(flags['syn']) and not flags['far'] and not flags['bb'] and flags['ambush'] and flags['mult'] == 2 and not flags['pierce'] and flags['bounce'] == 0, flags)

    # aim distance follows the stick deflection
    stick = ev("""() => { const t = __tank, G = t.G, p = G.player, T = 48, out = []; (""" + SETUP + """)(['obus', {}]);
      for (const mag of [0.3, 0.4, 0.66, 0.85, 1]) { p.cool = 99; t.sticks.aim.id = 7; t.sticks.aim.vx = mag; t.sticks.aim.vy = 0; t.step(0.05); out.push([mag, +(p.aimDist / T).toFixed(2), +(t.lobTarget().x - p.x).toFixed(1)]); }
      t.sticks.aim.id = null; t.sticks.aim.vx = t.sticks.aim.vy = 0; return out; }""")
    R['obus_stick'] = stick
    exp = lambda mag: 2.5 if mag < 0.32 else 2.5 + 8.5 * min(1, max(0, (mag - 0.32) / 0.68))
    check('obus_stick_distance', all(abs(d - exp(m)) < 0.06 for m, d, _ in stick) and stick[-1][1] > stick[2][1] > stick[0][1], stick)
    ctx.close()

    # mouse (desktop context)
    ctx = new_ctx(b, 'd2-desktop', viewport={'width': 1280, 'height': 800})
    pg = ctx.new_page(); seed(pg); pg.click('#btnStart'); pg.wait_for_timeout(300)
    pg.evaluate(SETUP, ['obus', {}, 3]); pg.wait_for_timeout(100)
    pg.evaluate("() => { const p = __tank.G.player; p.x = p.y = __tank.G.map.n * 24; }")  # 25-tile map: stand on the centre so the camera is not clamped
    res = []
    for k, (dx, dy) in enumerate([(120, 0), (260, 40), (420, -60), (560, 0)]):
        info = pg.evaluate("() => { const v = __tank.view; return { w: v.w, h: v.h, s: v.scale }; }")
        pg.mouse.move(info['w'] / 2 + 5, info['h'] / 2); pg.mouse.move(info['w'] / 2 + dx, info['h'] / 2 + dy)
        pg.evaluate("() => { const p = __tank.G.player; p.cool = 99; __tank.cam.x = p.x; __tank.cam.y = p.y; }")
        r = pg.evaluate("""([dx, dy]) => { const t = __tank, p = t.G.player, v = t.view; t.step(0.03); const cdx = dx / v.scale, cdy = dy / v.scale, T = 48;
          return { want: Math.min(12 * T, Math.max(2.5 * T, Math.hypot(cdx, cdy))), got: p.aimDist, ring: Math.hypot(t.lobTarget().x - p.x, t.lobTarget().y - p.y) }; }""", [dx, dy])
        res.append(r)
    R['obus_mouse'] = res
    check('obus_mouse_distance', all(abs(r['want'] - r['got']) < 6 for r in res) and res[-1]['got'] > res[0]['got'], res)
    ctx.close()

    # ---------- 60 s of autopilot at wave 12, both tanks ----------
    ctx = new_ctx(b, 'd2-sim', viewport={'width': 390, 'height': 844}, device_scale_factor=1, is_mobile=True, has_touch=True)
    page = ctx.new_page(); seed(page)
    page.tap('#btnStart'); page.wait_for_timeout(300)
    for tid in ('rayli', 'obus'):
        n0 = len(real_errors())
        out = page.evaluate("""(tid) => { const t = __tank, G = t.G; t.noEvo(true); t.wave(12); t.setUp({ armor: 2, loader: 1 }); t.setTank(tid); G.player.hp = G.player.maxHp;
          const i0 = t.info(); const i1 = t.sim(60, true); return { tank: i1.tank, shots: i1.shots - i0.shots, hits: i1.hits - i0.hits, kills: i1.kills - i0.kills, wave: i1.wave, state: i1.state }; }""", tid)
        R['sim_' + tid] = out
        check(f'sim60_{tid}', out['tank'] == tid and out['shots'] > 10 and out['kills'] > 0 and out['state'] == 'play' and len(real_errors()) == n0, out)
    ctx.close()

    # ---------- screenshots: phone portrait, desert / snow / city ----------
    ctx = new_ctx(b, 'd2-shots', viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page(); seed(page)
    page.tap('#btnStart'); page.wait_for_timeout(300)
    page.add_style_tag(content='#banner,#hint{display:none !important}')
    for w, label in ((1, 'desert'), (7, 'snow'), (10, 'city')):
        for tid in ('rayli', 'obus'):
            page.evaluate("""([w, tid, label]) => { const t = __tank, G = t.G, p = G.player, T = 48; t.noEvo(true); t.wave(w); const m = G.map; G.queue = []; G.maxAlive = 0; G.portals.length = 0; G.enemies.length = 0; G.enemies.length = 0; G.phase = 'fight'; G.fade = 0; t.hold(true);
              t.setUp({ armor: 1 }); t.clearArena(); t.setTank(tid); const n = m.n; p.x = 10.5 * T; p.y = 14.5 * T; p.angle = -Math.PI / 2; p.turret = -Math.PI / 2; p.cool = 0; p.hp = p.maxHp; G.bullets.length = 0;
              for (let r = 5; r <= 9; r++) { m.t[r * n + 12] = 1; m.hp[r * n + 12] = 3; } for (let c = 9; c <= 11; c++) { m.t[6 * n + c] = 2; }
              p.turret = -Math.PI / 2 + 0.0; t.spawn('basic', 10.5 * T, 4 * T); t.spawn('heavy', 8.5 * T, 8.8 * T); t.spawn('basic', 10.9 * T, 2.6 * T);
              if (tid === 'obus') p.aimDist = 8.2 * T; t.cam.x = p.x; t.cam.y = p.y - 3 * T; t.step(0.25); p.cool = 0; p.aimDist = 8.2 * T; if (tid === 'rayli') { t.fire(); t.step(0.03); } t.dbg.freeze = true; }""", [w, tid, label])
            page.wait_for_timeout(200); page.screenshot(path=f'{OUT}/d2_{tid}_{label}.png')
            page.evaluate("() => { __tank.dbg.freeze = false; }")
    # an Obus shell in flight (shadow) and the landing explosion
    page.evaluate("""() => { const t = __tank, G = t.G, p = G.player, T = 48; t.noEvo(true); t.wave(1); G.queue = []; G.maxAlive = 0; G.enemies.length = 0; G.phase = 'fight'; G.fade = 0; t.hold(true);
      t.setUp({}); t.clearArena(); t.setTank('obus'); p.x = 10.5 * T; p.y = 14.5 * T; p.angle = -Math.PI / 2; p.turret = -Math.PI / 2; p.cool = 0; p.hp = p.maxHp; G.bullets.length = 0;
      t.spawn('basic', 10.5 * T, 7 * T); t.spawn('heavy', 9.4 * T, 7.6 * T); t.cam.x = p.x; t.cam.y = p.y - 3 * T; t.step(0.25); p.aimDist = 7.2 * T; p.cool = 0; t.fire(); for (let i = 0; i < 20; i++) t.stepBullets(1 / 60); t.dbg.freeze = true; }""")
    page.wait_for_timeout(200); page.screenshot(path=f'{OUT}/d2_obus_flight.png')
    page.evaluate("() => { const t = __tank; t.dbg.freeze = false; t.step(0.35); t.dbg.freeze = true; }")
    page.wait_for_timeout(200); page.screenshot(path=f'{OUT}/d2_obus_boom.png')
    page.evaluate("() => { __tank.dbg.freeze = false; }")
    ctx.close()
    R['screens'] = [f'{OUT}/d2_{t}_{l}.png' for l in ('desert', 'snow', 'city') for t in ('rayli', 'obus')] + [f'{OUT}/d2_obus_flight.png', f'{OUT}/d2_obus_boom.png']

report('check_tier2_d2', R)
show_checks(R.get('checks', {}))
print('FAILS:', FAILS or 'none')
print('ERRORS:', real_errors() or 'none')
