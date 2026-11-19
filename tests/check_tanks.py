"""Tank framework check (1.4, package A): TANKS table, firepower formula, evolution flow, legacy saves, tier-1 traits
(Ikiz stun, Makineli heat, Keskin Nisanci zoom) and the screenshots listed in the task (.tmp/shots/tank_*.png).
Run: TANK_TEST_PORT=8800 python3 tests/check_tanks.py     (prints a JSON report, then ERRORS: none)"""
from common import *  # noqa: F401,F403
from PIL import Image

FAILS = []


def check(name, ok, info=None):
    R.setdefault('checks', {})[name] = bool(ok) if info is None else {'ok': bool(ok), 'info': info}
    if not ok:
        FAILS.append(name)


# clear arena, fight phase, nothing spawning, player in the middle facing east
SETUP = """() => { const t = __tank, G = t.G, p = G.player, T = 48;
  t.noEvo(true); t.wave(3); G.queue = ['basic']; G.maxAlive = 0; G.portals.length = 0; G.enemies.length = 0; G.bullets.length = 0; G.phase = 'fight'; G.fade = 0; t.hold(true);
  t.setUp({}); t.clearArena(); p.x = 10.5 * T; p.y = 10.5 * T; p.turret = 0; p.angle = 0; p.hp = p.maxHp; p.cool = 0; t.cam.x = p.x; t.cam.y = p.y; t.step(0.3); return true; }"""

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = new_ctx(b, 'tanks', viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    seed(page)
    page.tap('#btnStart'); page.wait_for_timeout(300)

    # ---------- table sanity ----------
    tab = page.evaluate("""() => { const t = __tank, T = t.TANKS, ids = t.tanks(), out = { ids, bad: [] };
      const want = ['std','ikiz','nisanci','makineli','uclu','cift','rayli','obus','alev','sarapnel'];
      out.sameIds = JSON.stringify(ids.slice().sort()) === JSON.stringify(want.slice().sort());
      for (const id of ids) { const k = T[id];
        if (k.id !== id || !k.name || !k.blurb || !k.traitName || !k.col || !k.muzzles || !k.muzzles.length) out.bad.push(id + ': fields');
        if (id === 'std' ? k.tier !== 0 || k.parent !== null : k.tier !== T[k.parent].tier + 1) out.bad.push(id + ': tier/parent');
        if (id !== 'std' && !T[k.parent].kids.includes(id)) out.bad.push(id + ': not in parent.kids');
        for (const kid of k.kids) if (!T[kid] || T[kid].parent !== id) out.bad.push(id + ': kid ' + kid);
        if (k.tier < 2 ? !k.kids.length : k.kids.length) out.bad.push(id + ': kids count');
        const s = t.playerSpec(id); if (!(s.dps > 0 && s.cool > 0 && s.dmg > 0 && s.speed > 0 && s.muzzles.length)) out.bad.push(id + ': spec');
      }
      out.tiers = ids.map(id => id + ':' + T[id].tier); out.std_kids = T.std.kids; out.kids = Object.fromEntries(ids.map(id => [id, T[id].kids]));
      out.stubs = ids.filter(id => T[id].stub); return out; }""")
    R['table'] = tab
    check('table_10_ids', tab['sameIds'] and len(tab['ids']) == 10)
    check('table_consistent', not tab['bad'], tab['bad'])
    check('tier1_branches', tab['std_kids'] == ['ikiz', 'nisanci', 'makineli'] and tab['kids']['ikiz'] == ['uclu', 'cift'] and tab['kids']['nisanci'] == ['rayli', 'obus'] and tab['kids']['makineli'] == ['alev', 'sarapnel'])

    # ---------- Standart playerSpec identical to the 1.3 formula (no twin card) ----------
    ident = page.evaluate("""() => { const t = __tank, G = t.G, base = t.SPECS.player, bad = [], sets = [{}, { caliber: 2, loader: 3 }, { caliber: 4, loader: 5, thermal: 1, barrel: 3, engine: 4, armor: 5, blast: 2 }, { loader: 1 }, { thermal: 1, caliber: 1 }];
      t.setTank('std');
      for (const up of sets) { t.setUp(up); const s = t.playerSpec(), c = up.caliber | 0, l = up.loader | 0, br = up.barrel | 0, e = up.engine | 0, th = up.thermal ? 1 : 0;
        const rate = 1 + 0.18 * l, F = Math.max(1 + 0.25 * c + 0.18 * l + 0 + 0.15 * th, rate * 1);
        const old = { speed: base.speed * (1 + 0.1 * e), cool: base.cool / rate, dmg: Math.max(base.dmg, base.dmg * F / (rate * 1)), bW: base.bW + 0.8 * c, bR: base.bR + 0.5 * c, bSpeed: base.bSpeed * (1 + 0.15 * br), barrel: base.barrel + 3 * br, fire: F, turn: base.turn };
        for (const k in old) if (s[k] !== old[k]) bad.push(JSON.stringify(up) + ' ' + k + ' ' + s[k] + ' vs ' + old[k]);
        if (G.player.maxHp !== 100 + 20 * (up.armor | 0)) bad.push('maxHp ' + G.player.maxHp);
        if (Math.abs(s.dps - s.dmg / s.cool) > 1e-9) bad.push('dps');
      } t.setUp({}); return bad; }""")
    check('standart_spec_identical_to_1_3', not ident, ident)

    # ---------- per-tank fire(): shell counts ----------
    fire = page.evaluate(SETUP) and page.evaluate("""() => { const t = __tank, G = t.G, p = G.player, out = {}, bad = [];
      const exp = { std: 1, ikiz: 2, nisanci: 1, makineli: 1 };
      for (const id of t.tanks()) { t.setTank(id); G.bullets.length = 0; p.cool = 0; p.heat = 0; p.overheatT = 0; t.fire(); const n = G.bullets.length, k = t.TANKS[id];
        out[id] = { shells: n, dps: +t.playerSpec().dps.toFixed(3), dmg: +t.playerSpec().dmg.toFixed(3), cool: +t.playerSpec().cool.toFixed(3), speed: Math.round(t.playerSpec().speed), maxHp: p.maxHp, range: Math.round(t.tankRange(k)), zoom: k.zoom, vols: new Set(G.bullets.map(b => b.vol)).size, volN: G.bullets[0] && G.bullets[0].volN };
        if (k.mode === 'shell' && n !== k.muzzles.length * (k.pellets || 1)) bad.push(id + ' fired ' + n);
        if (exp[id] !== undefined && n !== exp[id]) bad.push(id + ' expected ' + exp[id] + ' got ' + n);
        if (n && out[id].vols !== 1) bad.push(id + ' volley ids');
      } t.setTank('std'); out.bad = bad; return out; }""")
    R['fire'] = fire
    check('fire_shell_counts', not fire['bad'], fire['bad'])
    std_dps = fire['std']['dps']
    R['dps_vs_standart'] = {k: round(v['dps'] / std_dps, 2) for k, v in fire.items() if k != 'bad'}

    # ---------- evolution flow ----------
    page.evaluate("() => { const t = __tank; t.noEvo(false); t.startGame(null); t.wave(5); t.botTank('random'); }")
    page.wait_for_timeout(200)
    evo = page.evaluate("""() => { const t = __tank, G = t.G; t.killAll(); for (let i = 0; i < 600 && G.phase !== 'upgrade'; i++) t.step(1 / 30);
      return { phase: G.phase, mode: G.upMode, wave: G.wave, due: t.evoDue(), choices: t.choices(), title: document.getElementById('upTitle').textContent,
        cards: document.querySelectorAll('#upCards .up-card.tank').length, sprites: document.querySelectorAll('#upCards canvas[data-evo]').length,
        buttons: document.querySelectorAll('#upPanel button').length, stats: [...document.querySelectorAll('.evo-stats')].map(n => n.textContent) }; }""")
    R['evo5'] = evo
    check('evo5_screen', evo['mode'] == 'evo' and evo['due'] and evo['choices'] == ['ikiz', 'nisanci', 'makineli'] and evo['title'] == 'TANK EVRİMİ' and evo['cards'] == 3 and evo['sprites'] == 3, evo)
    check('evo_no_skip_button', evo['buttons'] == 3)
    page.wait_for_timeout(600)
    page.screenshot(path=f'{OUT}/tank_evo_p390.png')
    R['evo_fit_p390'] = page.evaluate("() => { const p = document.getElementById('upPanel'); return { fits: p.scrollHeight <= p.clientHeight + 1, scrollH: p.scrollHeight, clientH: p.clientHeight, overflowY: getComputedStyle(p).overflowY }; }")
    # keys 1-3 work: press 2 -> nisanci
    page.keyboard.press('2')
    after = page.evaluate("() => { const G = __tank.G, p = G.player; return { tank: G.tank, shield: p.shield1T, evoT: +p.evoT.toFixed(2), mode: G.upMode, choices: __tank.choices(), phase: G.phase, wait: G.evoWait, banner: document.getElementById('bTitle').textContent, hp: p.maxHp }; }")
    R['evo5_after_pick'] = after
    check('evo5_choose_key2', after['tank'] == 'nisanci' and after['shield'] == 1 and after['evoT'] > 0 and after['phase'] == 'upgrade' and after['choices'] == [] and after['banner'] == 'KESKİN NİŞANCI', after)
    page.wait_for_timeout(300)
    page.screenshot(path=f'{OUT}/tank_evo_flash.png')
    page.evaluate("() => __tank.step(1.7)")
    cards = page.evaluate("() => { const t = __tank; return { mode: t.G.upMode, title: document.getElementById('upTitle').textContent, n: t.choices().length, kinds: document.querySelectorAll('#upCards .up-card.tank').length, shown: !document.getElementById('upgrade').classList.contains('hidden') }; }")
    R['evo5_then_cards'] = cards
    check('evo5_then_boss_cards', cards['mode'] == 'cards' and cards['title'] == 'KOMUTAN GANİMETİ' and cards['n'] == 3 and cards['kinds'] == 0 and cards['shown'], cards)
    page.wait_for_timeout(600)
    page.keyboard.press('1')
    check('evo5_cards_pick_works', page.evaluate("__tank.G.phase") == 'out')
    # the 1 s shield blocks a shell and runs only while enemies can shoot
    sh = page.evaluate("""() => { const t = __tank, G = t.G, p = G.player; for (let i = 0; i < 400 && G.phase !== 'fight'; i++) t.step(1 / 30);
      const s0 = p.shield1T; G.bullets.push({ x: p.x + 5, y: p.y, vx: 0, vy: 0, r: 4, owner: 1, dmg: 30, life: 1, big: false, dead: false, look: 'enemy', pierce: false, bounce: 0, splash: null, hits: null, bricks: null, sx: 0, sy: 0, dist: 0, bounced: false });
      const hp0 = p.hp; t.stepBullets(1 / 60); const blocked = p.hp === hp0; t.step(1.2); return { s0, blocked, after: +p.shield1T.toFixed(2), phase: G.phase }; }""")
    R['shield'] = sh
    check('transformation_shield', sh['s0'] > 0 and sh['blocked'] and sh['after'] == 0, sh)

    # wave 10 -> the two children of the chosen branch (and the debt rule)
    for branch, kids in (('ikiz', ['uclu', 'cift']), ('nisanci', ['rayli', 'obus']), ('makineli', ['alev', 'sarapnel'])):
        r = page.evaluate("""([branch]) => { const t = __tank, G = t.G; t.setTank(branch); G.wave = 10; t.showUpgrades(); return { mode: G.upMode, choices: t.choices(), cards: document.querySelectorAll('#upCards .up-card.tank').length, title: document.getElementById('upTitle').textContent }; }""", [branch])
        check(f'evo10_{branch}', r['mode'] == 'evo' and r['choices'] == kids and r['cards'] == 2 and r['title'] == 'TANK EVRİMİ', r)
    page.wait_for_timeout(600)
    page.screenshot(path=f'{OUT}/tank_evo10_p390.png')
    debt = page.evaluate("""() => { const t = __tank, G = t.G, out = {}; t.setTank('std'); G.wave = 7; out.w7_std_due = t.evoDue(); t.showUpgrades(); out.w7_mode = G.upMode; out.w7_choices = t.choices();
      t.setTank('ikiz'); G.wave = 7; out.w7_ikiz_due = t.evoDue(); G.wave = 4; t.setTank('std'); out.w4_std_due = t.evoDue(); G.wave = 5; out.w5_std_due = t.evoDue();
      t.setTank('std'); G.wave = 10; out.w10_std_due = t.evoDue(); t.showUpgrades(); out.first = t.choices(); t.choose('makineli'); out.second_mode = G.upMode; out.second = t.choices(); out.tank_after_first = G.tank;
      t.choose('sarapnel'); out.final_tank = G.tank; out.final_due = t.evoDue(); out.after_mode = G.upMode; out.cards = t.choices().length;
      G.wave = 20; out.w20_due_for_tier2 = t.evoDue(); return out; }""")
    R['debt'] = debt
    check('debt_rule', debt['w7_std_due'] and debt['w7_mode'] == 'evo' and not debt['w7_ikiz_due'] and not debt['w4_std_due'] and debt['w5_std_due'] and debt['w10_std_due']
          and debt['first'] == ['ikiz', 'nisanci', 'makineli'] and debt['second_mode'] == 'evo' and debt['second'] == ['alev', 'sarapnel'] and debt['final_tank'] == 'sarapnel' and not debt['final_due'] and debt['after_mode'] == 'cards' and not debt['w20_due_for_tier2'], debt)

    # ---------- legacy resume ----------
    errs0 = len(real_errors())
    res = page.evaluate("""() => { const t = __tank, G = t.G, out = {}, go = r => { t.startGame(r); const o = { tank: G.tank, wave: G.wave, up: Object.assign({}, G.up), hp: Math.round(G.player.hp), due: t.evoDue() }; t.sim(2, true); return o; };
      out.twin = go({ wave: 7, score: 900, hp: 80, kills: 5, ups: { twin: 1, caliber: 2 } });
      out.bogus = go({ wave: 7, hp: 80, tank: 'bogus', ups: {} });
      out.proto = go({ wave: 7, hp: 80, tank: 'toString', ups: {} });
      out.saved = go({ wave: 12, hp: 80, tank: 'rayli', ups: { loader: 2 } });
      out.no_ups = go({ wave: 3, tank: 'makineli' });
      out.old_no_tank = go({ wave: 7, hp: 60, ups: { armor: 1 } });
      out.tank_and_twin = go({ wave: 7, hp: 60, tank: 'makineli', ups: { twin: 1 } });
      out.fresh = go(null); return out; }""")
    R['resume'] = res
    check('resume_twin_to_ikiz', res['twin']['tank'] == 'ikiz' and 'twin' not in res['twin']['up'] and res['twin']['up'].get('caliber') == 2 and not res['twin']['due'] and res['twin']['wave'] == 7, res['twin'])
    check('resume_unknown_ids', res['bogus']['tank'] == 'std' and res['proto']['tank'] == 'std' and res['bogus']['due'])
    check('resume_saved_tank', res['saved']['tank'] == 'rayli' and res['no_ups']['tank'] == 'makineli' and res['tank_and_twin']['tank'] == 'makineli')
    check('resume_old_save_gets_debt', res['old_no_tank']['tank'] == 'std' and res['old_no_tank']['due'] and res['fresh']['tank'] == 'std')
    check('resume_no_console_errors', len(real_errors()) == errs0, real_errors()[errs0:])
    snap = page.evaluate("""() => { const t = __tank, G = t.G; t.startGame({ wave: 7, tank: 'ikiz', ups: {} }); return G.tank; }""")
    check('resume_roundtrip', snap == 'ikiz')

    # ---------- Ikiz stun ----------
    page.evaluate(SETUP)
    stun = page.evaluate("""() => { const t = __tank, G = t.G, p = G.player, T = 48, out = {};
      const volley = (id) => { t.setTank(id); G.enemies.length = 0; G.bullets.length = 0; p.cool = 0; const e = t.spawn('heavy', p.x + 4 * T, p.y); e.speedMul = 0; t.fire();
        for (let i = 0; i < 60 && G.bullets.length; i++) { t.stepBullets(1 / 60); if (e.stunT > 0) break; } return e; };
      let e = volley('ikiz'); out.ikiz_stunT = +e.stunT.toFixed(2); out.ikiz_hp = +e.hp.toFixed(2);
      const x0 = e.x, y0 = e.y; e.speedMul = 1; e.cool = 99; e.senseT = 0; t.step(0.3); out.moved_while_stunned = Math.round(Math.hypot(e.x - x0, e.y - y0)); out.stunT_after = +e.stunT.toFixed(2);
      t.step(0.5); out.stun_over = e.stunT <= 0;
      e = volley('std'); out.std_stunT = e.stunT; e = volley('makineli'); out.mg_stunT = e.stunT;
      // a lone shell (the other one wall-blocked / missing) does not stun: fire two volleys, one shell each by killing one bullet
      t.setTank('ikiz'); G.enemies.length = 0; G.bullets.length = 0; p.cool = 0; e = t.spawn('heavy', p.x + 4 * T, p.y); e.speedMul = 0; t.fire(); G.bullets.pop(); for (let i = 0; i < 60 && G.bullets.length; i++) t.stepBullets(1 / 60); out.single_shell_stunT = e.stunT;
      return out; }""")
    R['stun'] = stun
    check('ikiz_stun', 0.28 <= stun['ikiz_stunT'] <= 0.3 and stun['moved_while_stunned'] < 2 and stun['stun_over'] and stun['std_stunT'] == 0 and stun['mg_stunT'] == 0 and stun['single_shell_stunT'] == 0, stun)

    # ---------- Makineli heat ----------
    page.evaluate(SETUP)
    heat = page.evaluate("""() => { const t = __tank, G = t.G, p = G.player, out = { windows: [] };
      t.setTank('makineli'); const am = t.sticks.aim; am.id = 7; am.vx = 1; am.vy = 0; am.ox = 0; am.oy = 0;
      let overAt = -1, shotsAtOver = 0, time = 0, lastShots = G.shots;
      for (let i = 0; i < 60 * 8; i++) { t.step(1 / 60); time += 1 / 60;
        if (i % 30 === 29) { out.windows.push([+time.toFixed(1), G.shots - lastShots, +p.heat.toFixed(2)]); lastShots = G.shots; }
        if (p.overheatT > 0 && overAt < 0) { overAt = time; shotsAtOver = G.shots; break; } }
      out.overheat_after_s = +overAt.toFixed(2); out.heat_at_over = +p.heat.toFixed(2); out.overT = +p.overheatT.toFixed(2);
      // locked: no shots for the 1.5 s
      const s0 = G.shots; t.step(1.4); out.shots_during_lock = G.shots - s0; out.overT_after_1_4 = +p.overheatT.toFixed(2);
      t.step(0.2); out.after_lock_heat = +p.heat.toFixed(2); const s1 = G.shots; t.step(0.3); out.shots_after_lock = G.shots - s1;
      // release: heat cools down
      am.id = null; am.vx = 0; const h0 = p.heat; t.step(1); out.cooled = +(h0 - p.heat).toFixed(2);
      out.cold_cool = +t.playerSpec().cool.toFixed(3); return out; }""")
    R['heat'] = heat
    w = heat['windows']
    check('mg_heat_rises_and_speeds_up', len(w) >= 3 and w[-1][1] >= w[0][1] and w[-1][2] > 0.5, w)
    check('mg_overheat_lockout', 0 < heat['overheat_after_s'] < 8 and heat['heat_at_over'] >= 1 and heat['shots_during_lock'] == 0 and heat['overT_after_1_4'] > 0 and heat['shots_after_lock'] > 0 and abs(heat['after_lock_heat'] - 0.25) < 0.2, heat)
    check('mg_cools_when_released', heat['cooled'] >= 0.3, heat['cooled'])
    # overheated screenshot (barrel red, smoke) on desert
    page.evaluate(SETUP)
    page.evaluate("""() => { const t = __tank, G = t.G, p = G.player; t.setTank('makineli'); p.heat = 1; p.overheatT = 1.4; p.turret = -0.5; p.angle = -0.5; t.cam.x = p.x; t.cam.y = p.y - 20; t.step(0.1); p.overheatT = 1.4; t.dbg.freeze = true; }""")
    page.wait_for_timeout(250)

    def shot_around(path, size=130):
        pos = page.evaluate("() => { const t = __tank, p = t.G.player, v = t.view; return [(p.x - t.cam.x) * v.scale + v.w / 2, (p.y - t.cam.y) * v.scale + v.h / 2]; }")
        page.screenshot(path=path, clip={'x': max(0, pos[0] - size / 2), 'y': max(0, pos[1] - size / 2), 'width': size, 'height': size})

    shot_around(f'{OUT}/tank_mg_overheat_desert.png')
    page.screenshot(path=f'{OUT}/tank_mg_overheat_full.png')
    page.evaluate("() => { const t = __tank; t.dbg.freeze = false; t.G.player.overheatT = 0; t.G.player.heat = 0; }")

    # ---------- Keskin Nisanci zoom ----------
    page.evaluate(SETUP)
    zoom = page.evaluate("""() => { const t = __tank, G = t.G, p = G.player, v = t.view, T = 48, out = {};
      t.setTank('std'); t.step(0.3); out.std_w = +(v.x1 - v.x0).toFixed(1); out.std_k = v.zoomK;
      // the real transformation eases the camera
      G.tank = 'nisanci'; G.player.spec = t.playerSpec(); t.step(0.1); out.k_mid = +v.zoomK.toFixed(3); t.step(3); out.k_end = +v.zoomK.toFixed(3); out.sn_w = +(v.x1 - v.x0).toFixed(1); out.ratio = +(out.sn_w / out.std_w).toFixed(3);
      out.base_w = +(v.bx1 - v.bx0).toFixed(1); out.unzoomed_equals_std = Math.abs(out.base_w - out.std_w) < 1;
      // enemies between the zoomed and the unzoomed edge do not fire, enemies inside the unzoomed view do
      const place = (x, y) => { G.enemies.length = 0; G.bullets.length = 0; const e = t.spawn('basic', x, y); e.speedMul = 0; e.cool = 0; e.canSee = true; e.senseT = 99; e.distP = 150; return e; };
      const test = (x, y) => { const e = place(x, y); let shot = 0; for (let i = 0; i < 180; i++) { e.canSee = true; e.senseT = 99; t.stepEnemies(1 / 60); shot += G.bullets.filter(b => b.owner === 1).length ? 1 : 0; G.bullets.length = 0; } return shot > 0; };
      const farX = v.bx0 - T * 0.3 - 6 - 0.4 * (v.bx0 - v.x0); // outside the unzoomed fire view, still inside the zoomed view
      out.far_in_zoomed_view = farX > v.x0 && !t.G.enemies.some(() => false);
      out.far_fires = test(farX, p.y); out.near_fires = test(v.bx0 + 60, p.y);
      out.far_x_inside_zoomed = farX > v.x0 && farX < v.bx0 - T * 0.3;
      G.enemies.length = 0; G.bullets.length = 0; t.setTank('std'); t.step(0.2); return out; }""")
    R['zoom'] = zoom
    check('sniper_zoom', zoom['std_k'] == 1 and abs(zoom['k_end'] - 0.82) < 0.002 and 0 < 1 - zoom['k_mid'] < 0.18 and abs(zoom['ratio'] - 1 / 0.82) < 0.02 and zoom['unzoomed_equals_std'], zoom)
    check('sniper_enemies_outside_unzoomed_view_do_not_fire', zoom['far_x_inside_zoomed'] and not zoom['far_fires'] and zoom['near_fires'], zoom)
    # screenshots: std vs sniper zoom (full screen)
    page.evaluate(SETUP)
    page.evaluate("""() => { const t = __tank, G = t.G, p = G.player, T = 48; t.setTank('std'); t.step(0.3); p.turret = -Math.PI / 2; p.angle = -Math.PI / 2; t.spawn('basic', p.x + 3 * T, p.y - 6 * T); t.spawn('basic', p.x - 2 * T, p.y + 5 * T); t.spawn('fast', p.x + 1.5 * T, p.y - 9 * T); t.cam.x = p.x; t.cam.y = p.y; t.step(0.05); t.dbg.freeze = true; }""")
    page.wait_for_timeout(200); page.screenshot(path=f'{OUT}/tank_zoom_std.png')
    page.evaluate("""() => { const t = __tank; t.dbg.freeze = false; t.setTank('nisanci'); t.step(0.2); t.dbg.freeze = true; }""")
    page.wait_for_timeout(200); page.screenshot(path=f'{OUT}/tank_zoom_sniper.png')
    page.evaluate("() => { __tank.dbg.freeze = false; __tank.G.enemies.length = 0; }")

    # ---------- tier-1 tanks in play on desert and snow ----------
    crops = []
    for theme_wave, label in ((1, 'desert'), (7, 'snow')):
        for tid in ('std', 'ikiz', 'nisanci', 'makineli'):
            page.evaluate("""([w, tid]) => { const t = __tank, G = t.G, p = G.player, T = 48; t.noEvo(true); t.wave(w); G.queue = ['basic']; G.maxAlive = 0; G.portals.length = 0; G.enemies.length = 0; G.phase = 'fight'; G.fade = 0; t.hold(true);
              t.setUp({ armor: 1, loader: 1 }); t.clearArena(); t.setTank(tid); p.x = 10.5 * T; p.y = 10.5 * T; p.angle = -0.5; p.turret = -0.5; p.cool = 0; p.hp = p.maxHp; t.cam.x = p.x; t.cam.y = p.y; G.bullets.length = 0;
              t.fire(); t.step(0.07); t.dbg.freeze = true; }""", [theme_wave, tid])
            page.wait_for_timeout(180)
            path = f'{OUT}/tank_play_{label}_{tid}.png'
            shot_around(path, 130)
            crops.append((label, tid, path))
            page.evaluate("() => { __tank.dbg.freeze = false; }")
        page.evaluate("() => { __tank.setUp({}); }")
    sheet = Image.new('RGB', (4 * 390, 2 * 390), (20, 20, 20))
    for i, (label, tid, path) in enumerate(crops):
        im = Image.open(path).convert('RGB').resize((390, 390), Image.LANCZOS)
        sheet.paste(im, ((i % 4) * 390, (i // 4) * 390))
    sheet.save(f'{OUT}/tank_tier1_sheet.png')
    R['tier1_sheet'] = f'{OUT}/tank_tier1_sheet.png (row 1 desert, row 2 snow; Standart, Ikiz, Nisanci, Makineli)'
    ctx.close()

    # ---------- evolution screen on a phone turned landscape ----------
    ctx = new_ctx(b, 'tanks-land', viewport={'width': 740, 'height': 360}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = ctx.new_page(); seed(page)
    page.tap('#btnStart'); page.wait_for_timeout(300)
    page.evaluate("() => { const t = __tank, G = t.G; t.wave(5); t.killAll(); for (let i = 0; i < 600 && G.phase !== 'upgrade'; i++) t.step(1 / 30); }")
    page.wait_for_timeout(700)
    page.screenshot(path=f'{OUT}/tank_evo_l740.png')
    land = page.evaluate("() => { const p = document.getElementById('upPanel'), r = p.getBoundingClientRect(); return { mode: __tank.G.upMode, fits: p.scrollHeight <= p.clientHeight + 1, scrollH: p.scrollHeight, clientH: p.clientHeight, top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, overflowY: getComputedStyle(p).overflowY }; }")
    R['evo_fit_l740'] = land
    check('evo_l740_fits_or_scrolls', land['mode'] == 'evo' and (land['fits'] or land['overflowY'] in ('auto', 'scroll')), land)
    # wave 10 two-card screen on the same viewport
    page.evaluate("() => { const t = __tank; t.setTank('makineli'); t.G.wave = 10; t.showUpgrades(); }")
    page.wait_for_timeout(700)
    page.screenshot(path=f'{OUT}/tank_evo10_l740.png')
    ctx.close()
    b.close()

print(json.dumps(R, ensure_ascii=False, indent=1))
print('FAILED CHECKS:', FAILS or 'none')
print('ERRORS:', real_errors() or 'none')
assert not FAILS, FAILS
