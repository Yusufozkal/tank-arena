"""Boss framework and Komutan (docs/BOSSES.md section 1 and 3): boss stage, arena, intro, phases, parts, stun, telegraphs, loot flow, region themes.
Usage: TANK_TEST_PORT=8800 python3 tests/check_boss.py     (screenshot of the phone fight: .tmp/boss_p390.png)"""
from common import *  # noqa: F401,F403

report_on_exit('check_boss', R)
FAILS = []


def check(name, ok, info=None):
    R[name] = info if info is not None else ok
    vprint(('ok   ' if ok else 'FAIL ') + name, info if not ok else '')
    if not ok:
        FAILS.append(name)
        print('FAIL', name, info)


def ev(page, js, arg=None):
    return page.evaluate(js, arg) if arg is not None else page.evaluate(js)


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = new_ctx(b, 'desktop', viewport={'width': 1000, 'height': 760})
    page = ctx.new_page(); seed(page)
    page.click('#btnStart'); page.wait_for_timeout(300)
    ev(page, "(() => { const G = __tank.G; G.god = true; __tank.dbg.freeze = true; })()")  # steps are driven by the test only

    # ---- region themes ----
    th = ev(page, "[1, 10, 11, 20, 21, 30, 31, 40, 41, 50].map(w => __tank.themeFor(w).key)")
    check('theme_blocks', th == ['desert', 'desert', 'forest', 'forest', 'snow', 'snow', 'city', 'city', 'desert', 'desert'], th)
    ev(page, "__tank.wave(11)"); check('map_theme_wave11', ev(page, "__tank.G.map.theme.key") == 'forest')

    # ---- intro: first time not skippable, a tap skips it after it was seen ----
    ev(page, "localStorage.removeItem('tankArena.seenBossIntro'); __tank.G.introSeen = false; __tank.wave(5)")
    st = ev(page, "__tank.bossInfo()")
    check('stage_starts_in_intro', st['phase'] == 'bossIntro' and st['stage'] and st['enemies'] == 1, st)
    gate = ev(page, "(() => { const m = __tank.G.map; return __tank.ARENAS.kisla.gate.map(([c, r]) => m.t[r * m.n + c]); })()")
    check('gate_is_brick', gate == [1, 1, 1], gate)
    ev(page, "__tank.step(0.6)"); page.mouse.click(500, 400)
    check('first_intro_not_skippable', ev(page, "__tank.G.phase") == 'bossIntro')
    ev(page, "__tank.step(3.2)")
    st = ev(page, "__tank.bossInfo()")
    check('intro_ends_in_fight', st['phase'] == 'fight', st)
    check('intro_remembered', ev(page, "localStorage.getItem('tankArena.seenBossIntro')") == 'true')
    gate = ev(page, "(() => { const m = __tank.G.map; return __tank.ARENAS.kisla.gate.map(([c, r]) => m.t[r * m.n + c]); })()")
    check('gate_smashed', gate == [0, 0, 0], gate)
    ev(page, "__tank.wave(5)"); ev(page, "__tank.step(0.6)"); page.mouse.click(500, 400)
    check('tap_skips_seen_intro', ev(page, "__tank.G.phase") == 'fight')

    # ---- arena matches the text map, only the boss on the field ----
    arena = ev(page, """() => { const t = __tank, G = t.G, m = G.map, pa = t.parseArena(t.ARENAS.kisla), gate = t.ARENAS.kisla.gate.map(([c, r]) => r * m.n + c), bad = [];
      for (let i = 0; i < pa.n * pa.n; i++) if (!gate.includes(i) && m.t[i] !== pa.t[i]) bad.push(i);
      return { n: m.n, bad, boss: pa.boss, player: pa.player, px: Math.floor(G.player.x / 48), py: Math.floor(G.player.y / 48), theme: m.theme.key, zoom: 0 }; }""")
    check('arena_tiles_match_text', arena['n'] == 21 and not arena['bad'] and arena['boss'] == {'c': 10, 'r': 2} and arena['player'] == {'c': 10, 'r': 19}, arena)
    check('player_start_P', (arena['px'], arena['py']) == (10, 19), arena)
    ev(page, "__tank.dbg.freeze = false"); ev(page, "__tank.sim(20, true)"); ev(page, "__tank.dbg.freeze = true")
    st = ev(page, "__tank.bossInfo()")
    check('only_boss_on_field', st['enemies'] == 1 and st['stage'], st)
    check('wave5_no_tower', st['tower'] == [], st['tower'])
    ev(page, "for (let i = 0; i < 120; i++) { __tank.view.zoomK = __tank.view.zoomK; } __tank.step(2)")
    check('camera_zoomed_out', ev(page, "__tank.view.zoomK") <= 0.86, ev(page, "__tank.view.zoomK"))

    # ---- map sizes: 25 -> 21 -> 25 ----
    ev(page, "__tank.wave(6)"); n6 = ev(page, "__tank.G.map.n")
    ev(page, "__tank.wave(10)"); n10 = ev(page, "[__tank.G.map.n, __tank.G.map.flow.length, __tank.G.map.mini.width]")
    ev(page, "__tank.dbg.freeze = false"); ev(page, "__tank.bossSkip(); __tank.sim(5, true)"); ev(page, "__tank.dbg.freeze = true")
    ev(page, "__tank.wave(11)"); n11 = ev(page, "[__tank.G.map.n, __tank.G.map.flow.length]")
    ev(page, "__tank.dbg.freeze = false"); ev(page, "__tank.sim(3, true)"); ev(page, "__tank.dbg.freeze = true")
    check('map_size_switch', n6 == 25 and n10 == [21, 441, 21] and n11 == [25, 625], [n6, n10, n11])

    # ---- phases ----
    ev(page, "localStorage.setItem('tankArena.seenBossIntro', 'true'); __tank.wave(15); __tank.bossSkip()")
    st = ev(page, "__tank.bossInfo()")
    check('wave15_tower', st['tower'] and st['tower'][0][0] == 'tower' and st['tower'][0][1], st['tower'])
    ph = ev(page, """() => { const t = __tank, G = t.G, e = G.boss, out = {}; const rep = () => G.pickups.filter(k => k.kind === 'repair').length;
      e.hp = e.maxHp * 0.65; const r0 = rep(); t.step(1 / 60); out.trans = e.trans; out.invuln = e.invuln; out.phase = e.phase; out.rep = rep() - r0;
      const hp = e.hp; t.hurtBoss(5); out.hpHeld = e.hp === hp; out.dmg_during = hp - e.hp;
      let n = 0; while (e.trans > 0 && n < 400) { t.step(1 / 60); n++; } out.secs = +(n / 60).toFixed(2); out.invulnAfter = e.invuln;
      const hp2 = e.hp; t.hurtBoss(1); out.hit_after = hp2 - e.hp;
      const kit = G.pickups.filter(k => k.kind === 'repair').pop(); const dB = kit ? Math.hypot(kit.x - e.x, kit.y - e.y) : 0; out.kitDist = Math.round(dB);
      e.hp = e.maxHp * 0.32; t.step(1 / 60); out.phase2 = e.phase; out.trans2 = e.trans; out.rep2 = rep() - r0;
      return out; }""")
    check('phase1_at_66', ph['phase'] == 1 and ph['trans'] > 1.4 and ph['invuln'] and ph['rep'] == 1, ph)
    check('transition_no_damage_1_5s', ph['hpHeld'] and 1.4 <= ph['secs'] <= 1.6 and not ph['invulnAfter'] and ph['hit_after'] > 0.9, ph)
    check('kit_away_from_boss', ph['kitDist'] >= 4.4 * 48, ph['kitDist'])
    check('phase2_at_33', ph['phase2'] == 2 and ph['trans2'] > 1.4 and ph['rep2'] == 2, ph)

    # ---- parts, stun ----
    ev(page, "__tank.step(1.6)")
    pt = ev(page, """() => { const t = __tank, G = t.G, e = G.boss, tw = e.parts[0], out = {}; const q = { x: e.x + Math.cos(e.angle) * tw.ox, y: e.y + Math.sin(e.angle) * tw.ox };
      const ang = Math.atan2(q.y - (q.y + 200), 0); const sx = q.x, sy = q.y + 120, dir = Math.atan2(sy - q.y, sx - q.x); // shell coming from the south toward the tower
      const hp = e.hp, th = tw.hp; t.hurtBoss(1, sx, sy - 40, Math.atan2(40, 0)); out.towerHp = th - tw.hp; out.bodyHp = hp - e.hp;
      e.stunT = 1; const h2 = e.hp; t.hurtBoss(1, e.x, e.y); out.stunMul = +(h2 - e.hp).toFixed(2);
      const x0 = e.x, y0 = e.y, a0 = e.atkId; t.step(0.5); out.stillMoved = Math.hypot(e.x - x0, e.y - y0); e.stunT = 0;
      tw.hp = 1; t.hurtBoss(5, sx, sy - 40, Math.atan2(40, 0)); out.alive = tw.alive; out.drops = G.pickups.length; return out; }""")
    check('part_takes_hit_not_body', pt['towerHp'] > 0.5 and pt['bodyHp'] == 0, pt)
    check('stun_bonus_and_halt', abs(pt['stunMul'] - 1.5) < 0.05 and pt['stillMoved'] < 1, pt)
    check('part_breaks', pt['alive'] is False and pt['drops'] >= 1, pt)

    # ---- telegraphs: every attack warned for at least the minimum time; all attacks of wave 35 seen ----
    ev(page, "__tank.wave(35); __tank.bossSkip()")
    ev(page, "__tank.dbg.freeze = false")
    ev(page, "(() => { const t = __tank; t.sim(40, true); const e = t.G.boss; e.hp = e.maxHp * 0.6; t.sim(60, true); e.hp = e.maxHp * 0.3; t.sim(90, true); })()")
    ev(page, "__tank.dbg.freeze = true")
    lg = ev(page, "__tank.G.boss ? __tank.G.boss.log : []")
    kinds = sorted({x['atk'] for x in lg})
    short = [x for x in lg if x['dur'] + 0.002 < x['min']]
    check('telegraph_min_times', len(lg) > 15 and not short, {'n': len(lg), 'short': short[:3]})
    check('all_attacks_seen_w35', kinds == ['bomb', 'ezme', 'penta', 'shock', 'topcu', 'triple', 'yaylim'], kinds)
    ev(page, "__tank.bossClearHazards()")
    check('clear_hazards', ev(page, "[__tank.G.tele.length, __tank.G.bullets.filter(b => b.owner === 1).length]") == [0, 0])

    # ---- death: armour full, ganimet cards, evolution after waves 5 and 10 ----
    for w, tank, expect in ((5, 'std', 'evo'), (10, 'ikiz', 'evo'), (15, 'uclu', 'cards')):
        ev(page, f"(() => {{ const t = __tank, G = t.G; G.noEvo = false; G.tank = '{tank}'; t.setTank('{tank}'); t.wave({w}); t.bossSkip(); G.god = false; G.player.hp = 12; const e = G.boss; e.hp = 0.5; t.hurtBoss(5); }})()")
        ev(page, "__tank.step(2.6)")
        mid = ev(page, "(() => { const G = __tank.G; return { dying: G.boss ? G.boss.dying : 'gone', hp: G.player.hp, max: G.player.maxHp }; })()")
        ev(page, "__tank.step(3)")
        after = ev(page, "(() => { const G = __tank.G; return { phase: G.phase, mode: G.upMode, title: document.getElementById('upTitle').textContent, hp: G.player.hp, max: G.player.maxHp }; })()")
        check(f'boss_w{w}_armour_full', after['hp'] == after['max'], after)
        check(f'boss_w{w}_{expect}', after['phase'] == 'upgrade' and after['mode'] == expect, after)
        if expect == 'cards':
            check('loot_title', after['title'] == 'KOMUTAN GANİMETİ', after)
        ev(page, "__tank.G.god = true")

    # ---- phone screenshot with a telegraph ----
    ctx2 = new_ctx(b, 'phone', viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ph2 = ctx2.new_page(); seed(ph2)
    ph2.tap('#btnStart'); ph2.wait_for_timeout(400)
    ev(ph2, "localStorage.setItem('tankArena.seenBossIntro', 'true'); __tank.G.god = true; __tank.wave(15); __tank.bossSkip()")
    got = ev(ph2, """() => { const t = __tank, G = t.G, e = G.boss; t.dbg.freeze = true; e.cool = 0; let n = 0;
      while (n < 3000 && !G.tele.some(x => x.kind === 'circle' || x.kind === 'line')) { t.G.boss.cool = Math.min(t.G.boss.cool, 0.05); t.step(1 / 30); n++; if (e.atkId === 'triple') e.gen = null; }
      for (let k = 0; k < 18; k++) t.step(1 / 30); return G.tele.map(x => x.kind); }""")
    ev(ph2, "document.getElementById('hint').classList.remove('show'); document.getElementById('banner').classList.remove('show')")
    ph2.wait_for_timeout(120)
    os.makedirs(str(TMP), exist_ok=True)
    ph2.screenshot(path=str(TMP / 'boss_p390.png'))
    check('phone_telegraph_visible', len(got) > 0, got)
    ctx2.close()
    b.close()

errs = real_errors()
check('no_page_errors', not errs, errs[:3])
print('check_boss:', 'FAILED ' + ', '.join(FAILS) if FAILS else 'all ok')
print('ERRORS:', errs or 'none')
