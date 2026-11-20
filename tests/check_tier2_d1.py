"""Tier-2 tanks of package D1 (1.4): Uclu, Cift Yon, Alev Topu, Sarapnel. Shell layouts, the four traits, 60 s of bot play each at wave 12, and screenshots
(.tmp/shots/d1_*.png). Run: TANK_TEST_PORT=8800 python3 tests/check_tier2_d1.py     (prints a JSON report, then ERRORS: none)"""
from common import *  # noqa: F401,F403
from PIL import Image

FAILS = []


def check(name, ok, info=None):
    R.setdefault('checks', {})[name] = bool(ok) if info is None else {'ok': bool(ok), 'info': info}
    if not ok:
        FAILS.append(name)


# clear arena, fight phase, nothing spawning, player at (cx, 10.5 T) facing east
SETUP = """([wave, cx]) => { const t = __tank, G = t.G, p = G.player, T = 48;
  t.noEvo(true); t.wave(wave || 3); G.queue = ['basic']; G.maxAlive = 0; G.portals.length = 0; G.enemies.length = 0; G.bullets.length = 0; G.phase = 'fight'; G.fade = 0; t.hold(true);
  t.setUp({}); t.clearArena(); p.x = (cx || 10.5) * T; p.y = 10.5 * T; p.turret = 0; p.angle = 0; p.vx = p.vy = 0; p.hp = p.maxHp; p.cool = 0; t.cam.x = p.x; t.cam.y = p.y; t.dbg.freeze = false;
  t.sticks.aim.id = null; t.sticks.move.id = null; t.step(0.3); return true; }"""
FIRE_ON = "() => { const a = __tank.sticks.aim; a.id = 7; a.vx = 1; a.vy = 0; a.ox = 0; a.oy = 0; }"
FIRE_OFF = "() => { const a = __tank.sticks.aim; a.id = null; a.vx = 0; a.vy = 0; }"
ENEMY = """(t, type, x, y, hp) => { const e = t.spawn(type, x, y); e.speedMul = 0; e.cool = 99; e.hp = e.maxHp = hp || 1000; return e; }"""

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = new_ctx(b, 'd1', viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    seed(page)
    page.tap('#btnStart'); page.wait_for_timeout(300)

    # ---------- table: numbers, dps vs Standart, stub flag ----------
    tab = page.evaluate("""() => { const t = __tank, out = {}; t.setTank('std'); const sd = t.playerSpec('std').dps;
      for (const id of ['uclu', 'cift', 'alev', 'sarapnel']) { const k = t.TANKS[id], s = t.playerSpec(id); out[id] = { stub: !!k.stub, dps: +s.dps.toFixed(3), vs_std: +(s.dps / sd).toFixed(2), shape: k.shape, mode: k.mode, muzzles: k.muzzles.length, pellets: k.pellets || 1, range: Math.round(t.tankRange(k)), botRange: k.botRange, tr: k.tr || null, tier: k.tier, parent: k.parent }; }
      out.std_dps = +sd.toFixed(3); return out; }""")
    R['table'] = tab
    want = {'uclu': 0.81, 'cift': 1.21, 'alev': 1.3, 'sarapnel': 1.5}
    check('entries_full_no_stub', all(not tab[k]['stub'] for k in want), tab)
    check('dps_vs_standart', all(abs(tab[k]['vs_std'] - v) <= 0.06 for k, v in want.items()), {k: tab[k]['vs_std'] for k in want})
    check('shapes_distinct', len({tab[k]['shape'] for k in want}) == 4 and all(tab[k]['botRange'] for k in want))

    # ---------- Uclu: fan layout, middle shell pierces exactly one tank ----------
    page.evaluate(SETUP, [3])
    uc = page.evaluate("""([E]) => { const t = __tank, G = t.G, p = G.player, T = 48, out = {}, mk = eval(E);
      t.setTank('uclu'); p.cool = 0; G.bullets.length = 0; t.fire();
      out.angles = G.bullets.map(b => +Math.atan2(b.vy, b.vx).toFixed(3)).sort((a, b) => a - b); out.pn = G.bullets.slice().sort((a, b) => Math.atan2(a.vy, a.vx) - Math.atan2(b.vy, b.vx)).map(b => b.pn);
      out.vols = new Set(G.bullets.map(b => b.vol)).size; out.dmg = G.bullets.map(b => b.dmg);
      // in a line: e1 3 tiles, e2 5, e3 7 -> the middle shell hits e1 and e2 only
      G.bullets.length = 0; G.enemies.length = 0; const e1 = mk(t, 'basic', p.x + 3 * T, p.y), e2 = mk(t, 'basic', p.x + 5 * T, p.y), e3 = mk(t, 'basic', p.x + 7 * T, p.y);
      t.fire(); for (let i = 0; i < 90 && G.bullets.length; i++) t.stepBullets(1 / 60);
      out.line = [e1, e2, e3].map(e => +(1000 - e.hp).toFixed(2));
      // a side shell hits the first tank only: e3 at +0.2 rad, e4 behind it
      G.bullets.length = 0; G.enemies.length = 0; const c = Math.cos(0.2), s = Math.sin(0.2);
      const f1 = mk(t, 'basic', p.x + c * 3 * T, p.y + s * 3 * T), f2 = mk(t, 'basic', p.x + c * 5 * T, p.y + s * 5 * T);
      t.fire(); for (let i = 0; i < 90 && G.bullets.length; i++) t.stepBullets(1 / 60);
      out.side = [f1, f2].map(e => +(1000 - e.hp).toFixed(2)); return out; }""", [ENEMY])
    R['uclu'] = uc
    check('uclu_three_shells_fan', len(uc['angles']) == 3 and abs(uc['angles'][0] + 0.2) < 0.01 and abs(uc['angles'][1]) < 0.01 and abs(uc['angles'][2] - 0.2) < 0.01 and uc['vols'] == 1, uc)
    check('uclu_only_middle_pierces', uc['pn'] == [0, 1, 0], uc['pn'])
    check('uclu_middle_hits_two_not_three', uc['line'][0] > 0 and uc['line'][1] > 0 and uc['line'][2] == 0 and abs(uc['line'][1] - uc['dmg'][1]) < 0.01, uc['line'])
    check('uclu_side_shell_stops_at_first', uc['side'][0] > 0 and uc['side'][1] == 0, uc['side'])

    # ---------- Cift Yon: rear shell, no recoil, push ----------
    page.evaluate(SETUP, [3, 4.5])
    cf = page.evaluate("""() => { const t = __tank, G = t.G, p = G.player, T = 48, out = {};
      t.setTank('cift'); p.cool = 0; G.bullets.length = 0; t.fire();
      out.n = G.bullets.length; out.dirs = G.bullets.map(b => +Math.atan2(b.vy, b.vx).toFixed(2)); out.dmg = G.bullets.map(b => +b.dmg.toFixed(3)); out.kick = t.playerSpec().kick;
      const front = G.bullets.find(b => b.vx > 0), rear = G.bullets.find(b => b.vx < 0); out.rear_ratio = rear && front ? +(rear.dmg / front.dmg).toFixed(2) : null; out.rear_ahead = rear ? rear.x < p.x : false;
      const x0 = p.x; t.step(0.05); out.recoil_px = +(x0 - p.x).toFixed(2); // no recoil: the volley does not shove the tank backwards
      // drive east with and without shooting
      const run = fireOn => { p.x = 4.5 * T; p.y = 10.5 * T; p.vx = p.vy = 0; p.pushT = 0; p.angle = 0; p.turret = 0; G.bullets.length = 0; t.sticks.move.id = 3; t.sticks.move.vx = 1; t.sticks.move.vy = 0;
        const a = t.sticks.aim; if (fireOn) { a.id = 7; a.vx = 1; a.vy = 0; a.ox = 0; a.oy = 0; } else a.id = null;
        t.step(0.5); const x1 = p.x; t.step(0.5); const d = p.x - x1; a.id = null; t.sticks.move.id = null; return d; };
      out.dist_plain = +run(false).toFixed(1); out.dist_firing = +run(true).toFixed(1); out.ratio = +(out.dist_firing / out.dist_plain).toFixed(2);
      p.pushT = 0; t.step(0.8); out.push_decays = p.pushT === 0; return out; }""")
    R['cift'] = cf
    check('cift_two_barrels', cf['n'] == 2 and sorted(cf['dirs'])[0] != sorted(cf['dirs'])[1] and cf['rear_ahead'], cf)
    check('cift_rear_dmg_0_8', cf['rear_ratio'] is not None and abs(cf['rear_ratio'] - 0.8) < 0.02, cf)
    check('cift_no_recoil', cf['kick'] == 0 and cf['recoil_px'] > -1, cf)
    check('cift_push_faster', cf['ratio'] >= 1.2 and cf['push_decays'], cf)

    # ---------- Alev Topu: cone, burn, shells, walls, boss ----------
    page.evaluate(SETUP, [3])
    av = page.evaluate("""([E, ON, OFF]) => { const t = __tank, G = t.G, p = G.player, T = 48, out = {}, mk = eval(E), on = eval(ON), off = eval(OFF);
      t.setTank('alev'); const s = t.playerSpec(); out.dps = +s.dps.toFixed(2);
      const reset = () => { G.enemies.length = 0; G.bullets.length = 0; p.turret = 0; p.angle = 0; p.cool = 0; off(); t.step(0.05); };
      // in the cone (80 px ahead)
      reset(); let e = mk(t, 'basic', p.x + 80, p.y); on(); const sh0 = G.shots, hi0 = G.hits; t.step(0.5); out.cone_dmg = +(1000 - e.hp).toFixed(2); out.burnT_in = +e.burnT.toFixed(2); out.shots = G.shots - sh0; out.hits = G.hits - hi0;
      // leave the cone: stop firing and keep burning
      off(); const hp1 = e.hp, bt1 = e.burnT; t.step(1.0); out.burn_after_leave = +(hp1 - e.hp).toFixed(2); out.burnT_drop = +(bt1 - e.burnT).toFixed(2); t.step(2.5); out.burn_ends = e.burnT <= 0; const hp2 = e.hp; t.step(0.5); out.stops_after_burn = hp2 === e.hp;
      // out of range (200 px) and outside the half-angle (80 px ahead, 70 px to the side)
      reset(); e = mk(t, 'basic', p.x + 200, p.y); const f = mk(t, 'basic', p.x + 60, p.y + 70); on(); t.step(0.5); out.far_dmg = +(1000 - e.hp).toFixed(2); out.side_dmg = +(1000 - f.hp).toFixed(2); off();
      // enemy shell inside the cone is destroyed with a spark
      reset(); on(); G.bullets.push({ x: p.x + 70, y: p.y, vx: -100, vy: 0, r: 4, owner: 1, dmg: 12, life: 2, big: false, dead: false, look: 'enemy', pierce: false, bounce: 0, splash: null, hits: null, bricks: null, sx: 0, sy: 0, dist: 0, bounced: false, vol: 0, volN: 1, pn: 0 });
      const hp0 = p.hp; t.step(0.1); out.shell_gone = !G.bullets.some(b => b.owner === 1); out.player_unhurt = p.hp >= hp0 - 0.01; off();
      // a shell outside the cone survives
      reset(); G.bullets.push({ x: p.x + 70, y: p.y + 90, vx: 0, vy: 0, r: 4, owner: 1, dmg: 12, life: 2, big: false, dead: false, look: 'enemy', pierce: false, bounce: 0, splash: null, hits: null, bricks: null, sx: 0, sy: 0, dist: 0, bounced: false, vol: 0, volN: 1, pn: 0 }); on(); t.step(0.1); out.outside_shell_survives = G.bullets.some(b => b.owner === 1); off();
      // behind a wall: no damage, no burn
      reset(); const m = G.map, n = m.n, wall = m.t[0], col = Math.floor(p.x / T) + 1; m.t[Math.floor(p.y / T) * n + col] = wall; m.hp[Math.floor(p.y / T) * n + col] = 9;
      e = mk(t, 'basic', p.x + 2.2 * T, p.y); on(); t.step(0.5); out.wall_dmg = +(1000 - e.hp).toFixed(2); out.wall_burn = e.burnT; off();
      m.t[Math.floor(p.y / T) * n + col] = 0; m.hp[Math.floor(p.y / T) * n + col] = 0;
      // the Komutan burns at half rate (same dps, same time)
      const rate = type => { reset(); const q = mk(t, type, p.x + 80, p.y); on(); t.step(1.0); off(); const d = 1000 - q.hp; return d; };
      const db = rate('basic'), dk = rate('boss'); out.basic_dmg_1s = +db.toFixed(2); out.boss_dmg_1s = +dk.toFixed(2); out.boss_ratio = +(dk / db).toFixed(2);
      reset(); out.lastShot_set = (() => { p.lastShot = -99; on(); t.step(0.1); return G.time - p.lastShot < 0.1; })(); off();
      // accuracy stays <= 100%
      reset(); mk(t, 'basic', p.x + 80, p.y); const s2 = G.shots, h2 = G.hits; on(); t.step(2); out.acc = +((G.hits - h2) / Math.max(1, G.shots - s2)).toFixed(2); out.shots_2s = G.shots - s2; off();
      // particle budget: at most 4 new particles per frame from the flame
      reset(); t.parts.length = 0; on(); t.step(1 / 60); const n1 = t.parts.length; out.parts_first_frame = n1; off(); return out; }""", [ENEMY, FIRE_ON, FIRE_OFF])
    R['alev'] = av
    check('alev_cone_damage', av['cone_dmg'] > 0.5 and av['burnT_in'] > 2.5 and av['shots'] >= 1, av)
    check('alev_keeps_burning', av['burn_after_leave'] > 0.4 and av['burnT_drop'] > 0.8 and av['burn_ends'] and av['stops_after_burn'], av)
    check('alev_range_and_angle', av['far_dmg'] == 0 and av['side_dmg'] == 0, av)
    check('alev_destroys_enemy_shells', av['shell_gone'] and av['player_unhurt'] and av['outside_shell_survives'], av)
    check('alev_wall_blocks', av['wall_dmg'] == 0 and av['wall_burn'] == 0, av)
    check('alev_boss_half_rate', 0.4 <= av['boss_ratio'] <= 0.6, av)
    check('alev_stats_sane', av['lastShot_set'] and av['acc'] <= 1 and 6 <= av['shots_2s'] <= 10 and av['parts_first_frame'] <= 5, av)

    # ---------- Sarapnel: pellets and knockback ----------
    page.evaluate(SETUP, [3, 6])
    sa = page.evaluate("""([E]) => { const t = __tank, G = t.G, p = G.player, T = 48, out = {}, mk = eval(E);
      t.setTank('sarapnel'); const s = t.playerSpec(); p.cool = 0; G.bullets.length = 0; G.enemies.length = 0; const sh0 = G.shots; t.fire();
      out.n = G.bullets.length; out.spread = +Math.max(...G.bullets.map(b => Math.abs(Math.atan2(b.vy, b.vx)))).toFixed(3); out.life = G.bullets[0].life; out.dmg = +G.bullets[0].dmg.toFixed(3); out.vols = new Set(G.bullets.map(b => b.vol)).size; out.shots = G.shots - sh0;
      const kb = (type, dx) => { G.bullets.length = 0; G.enemies.length = 0; p.turret = 0; p.cool = 0; const e = mk(t, type, p.x + dx, p.y); const x0 = e.x, h0 = G.hits; t.fire(); t.step(1.0); const hits = G.hits - h0; return { dx: +(e.x - x0).toFixed(1), hits, perHit: hits ? +((e.x - x0) / hits).toFixed(2) : 0 }; };
      out.kb_basic = kb('basic', 70); out.kb_fast = kb('fast', 70); out.kb_heavy = kb('heavy', 70); out.kb_boss = kb('boss', 70); out.kb_far = kb('basic', 190); out.kb_edge = kb('basic', 165);
      // knockback needs walls not to eat it: a tank pushed into a wall stops (tickStatus uses moveTank)
      return out; }""", [ENEMY])
    R['sarapnel'] = sa
    check('sarapnel_pellets', sa['n'] == 7 and 0.2 < sa['spread'] <= 0.33 and abs(sa['life'] - 0.42) < 0.01 and sa['vols'] == 1 and sa['shots'] == 7, sa)
    pb, ph, pk = sa['kb_basic']['perHit'], sa['kb_heavy']['perHit'], sa['kb_boss']['perHit']
    check('sarapnel_knockback_by_mass', sa['kb_basic']['dx'] > 25 and pb > 0 and abs(ph / pb - 0.5) < 0.12 and abs(pk / pb - 0.25) < 0.1 and sa['kb_fast']['perHit'] > pb and sa['kb_boss']['dx'] < 0.5 * sa['kb_basic']['dx'], sa)
    check('sarapnel_far_no_knockback', abs(sa['kb_far']['dx']) < 1 and abs(sa['kb_edge']['dx']) < 1 and sa['kb_far']['hits'] + sa['kb_edge']['hits'] > 0, sa)

    # ---------- 60 s of bot play per tank at wave 12 ----------
    sims = {}
    for tid in ('uclu', 'cift', 'alev', 'sarapnel'):
        e0 = len(real_errors())
        r = page.evaluate("""([tid]) => { const t = __tank, G = t.G; t.startGame(null); t.noEvo(true); t.hold(false); t.setUp({ caliber: 1, loader: 1, armor: 2 }); t.wave(12); t.setTank(tid); const k0 = G.kills, s0 = G.shots, h0 = G.hits;
          t.sim(60, true); return { kills: G.kills - k0, shots: G.shots - s0, hits: G.hits - h0, wave: G.wave, state: G.state, tank: G.tank, hp: Math.round(G.player.hp) }; }""", [tid])
        r['errors'] = real_errors()[e0:]
        sims[tid] = r
        check(f'sim60_{tid}', not r['errors'] and r['state'] == 'play' and r['kills'] >= 3 and r['tank'] == tid, r)
    R['sim60'] = sims

    # ---------- screenshots ----------
    def shot_around(path, size=130):
        pos = page.evaluate("() => { const t = __tank, p = t.G.player, v = t.view; return [(p.x - t.cam.x) * v.scale + v.w / 2, (p.y - t.cam.y) * v.scale + v.h / 2]; }")
        page.screenshot(path=path, clip={'x': max(0, pos[0] - size / 2), 'y': max(0, pos[1] - size / 2), 'width': size, 'height': size})

    crops = []
    ids = ('uclu', 'cift', 'alev', 'sarapnel')
    for wave, label in ((1, 'desert'), (7, 'snow')):
        for tid in ids:
            page.evaluate(SETUP, [wave])
            page.evaluate("""([tid]) => { const t = __tank, G = t.G, p = G.player; t.setUp({ armor: 1, loader: 1 }); t.setTank(tid); p.angle = -0.5; p.turret = -0.5; p.cool = 0; t.cam.x = p.x; t.cam.y = p.y; G.bullets.length = 0;
              if (tid === 'alev') { const a = t.sticks.aim; a.id = 7; a.vx = Math.cos(-0.5); a.vy = Math.sin(-0.5); a.ox = 0; a.oy = 0; t.step(0.12); a.id = null; } else { t.fire(); t.step(0.07); } t.dbg.freeze = true; }""", [tid])
            page.wait_for_timeout(180)
            path = f'{OUT}/d1_play_{label}_{tid}.png'
            shot_around(path, 130)
            crops.append(path)
            page.evaluate("() => { __tank.dbg.freeze = false; __tank.sticks.aim.id = null; }")
    sheet = Image.new('RGB', (4 * 390, 2 * 390), (20, 20, 20))
    for i, path in enumerate(crops):
        sheet.paste(Image.open(path).convert('RGB').resize((390, 390), Image.LANCZOS), ((i % 4) * 390, (i // 4) * 390))
    sheet.save(f'{OUT}/d1_tier2_sheet.png')
    R['sheet'] = f'{OUT}/d1_tier2_sheet.png (row 1 desert, row 2 snow; Uclu, Cift Yon, Alev, Sarapnel)'

    # flame cone with a burning enemy (full screen and a close crop)
    page.evaluate(SETUP, [1])
    page.evaluate("""([E]) => { const t = __tank, G = t.G, p = G.player, T = 48, mk = eval(E); t.setTank('alev'); p.angle = -0.3; p.turret = -0.3; const a = t.sticks.aim; a.id = 7; a.vx = Math.cos(-0.3); a.vy = Math.sin(-0.3); a.ox = 0; a.oy = 0;
      mk(t, 'basic', p.x + Math.cos(-0.3) * 85, p.y + Math.sin(-0.3) * 85); mk(t, 'heavy', p.x + Math.cos(-0.12) * 100, p.y + Math.sin(-0.12) * 100 + 4); t.step(0.45); t.dbg.freeze = true; }""", [ENEMY])
    page.wait_for_timeout(200)
    page.screenshot(path=f'{OUT}/d1_flame_full.png')
    shot_around(f'{OUT}/d1_flame_cone.png', 260)
    page.evaluate("() => { __tank.dbg.freeze = false; __tank.sticks.aim.id = null; }")

    # Sarapnel knockback moment: 0.1 s after a volley hits a basic tank at close range
    page.evaluate(SETUP, [7])
    page.evaluate("""([E]) => { const t = __tank, G = t.G, p = G.player, T = 48, mk = eval(E); t.setTank('sarapnel'); mk(t, 'basic', p.x + 70, p.y); mk(t, 'heavy', p.x + 90, p.y + 60); p.cool = 0; t.fire(); t.step(0.1); t.dbg.freeze = true; }""", [ENEMY])
    page.wait_for_timeout(200)
    page.screenshot(path=f'{OUT}/d1_sarapnel_knock_full.png')
    shot_around(f'{OUT}/d1_sarapnel_knock.png', 260)
    page.evaluate("() => { __tank.dbg.freeze = false; }")
    ctx.close()
    b.close()

report('check_tier2_d1', R)
show_checks(R.get('checks', {}))
print('FAILED CHECKS:', FAILS or 'none')
print('ERRORS:', real_errors() or 'none')
assert not FAILS, FAILS
