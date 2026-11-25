import os
"""Son Hisar and İkinci Tur (docs/BOSSES.md section 7): wave 40 stage and arena, spec, modules (hull takes 30% while both live, hull floor), phases (modules / 60 / 30), charge (barricades, steel stun + 3 brick heaps,
shock ring afterwards), open core (double damage), death scene, İkinci Tur (wave 41 Çöl, region rule reset, round multipliers), Serbest Mod entry.
Usage: TANK_TEST_PORT=8800 python3 tests/check_sonhisar.py     (phone screenshots: .tmp/sonhisar_p390.png)"""
from common import *  # noqa: F401,F403

report_on_exit('check_sonhisar', R)
FAILS = []


def check(name, ok, info=None):
    R[name] = info if info is not None else ok
    vprint(('ok   ' if ok else 'FAIL ') + name, info if not ok else '')
    if not ok:
        FAILS.append(name)
        print('FAIL', name, info)


def ev(page, js, arg=None):
    return page.evaluate(js, arg) if arg is not None else page.evaluate(js)


START = "(w) => { localStorage.setItem('tankArena.seenBossIntro','true'); const t = __tank, G = t.G; G.god = true; t.dbg.freeze = true; t.wave(w || 40); t.bossSkip(); const e = G.boss; for (const a of e.def.attacks) e.acd[a.id] = 1e12; e.cool = 1e9; }"
# park the boss at tile (c, r) facing angle a, the player at (pc, pr); attacks off
PLACE = """([c, r, pc, pr, a]) => { const t = __tank, G = t.G, e = G.boss, p = G.player; e.x = c * 48 + 24; e.y = r * 48 + 24; p.x = pc * 48 + 24; p.y = pr * 48 + 24; p.vx = p.vy = 0; p.cool = 1e9;
  e.gen = null; e.atkId = ''; e.cool = 1e9; e.stunT = 0; e.angle = e.turret = a || 0; G.tele.length = 0; G.bullets.length = 0; }"""
RUN = "(id) => { const t = __tank, e = t.G.boss; e.gen = t.BOSS_DEFS.sonhisar.attacks.find(a => a.id === id).run(e); e.atkId = id; e.wait = 0; }"
DONE = "(max) => { const t = __tank, e = t.G.boss; let n = 0; while (e.gen && n < max * 60) { t.step(1 / 60); n++; } return n / 60; }"
HIT = "(d) => { const t = __tank, e = t.G.boss, h0 = e.hp; t.hurtBoss(d, e.x + 50, e.y, 0); return +(h0 - e.hp).toFixed(3); }"  # a front hit on the centre line: misses both modules
PHASE = "(f) => { const e = __tank.G.boss; e.hp = e.maxHp * f; __tank.step(1.8); return [e.phase, e.trans]; }"

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = new_ctx(b, 'desktop', viewport={'width': 1000, 'height': 760})
    page = ctx.new_page(); seed(page)
    page.click('#btnStart'); page.wait_for_timeout(300)

    # ---- wave 40: a boss stage with only Son Hisar, in Şehir Meydanı ----
    ev(page, "localStorage.removeItem('tankArena.seenBossIntro'); __tank.G.god = true; __tank.dbg.freeze = true; __tank.wave(40)")
    st = ev(page, "__tank.bossInfo()")
    ban = ev(page, "document.getElementById('banner').textContent")
    check('wave40_sonhisar_stage', st['phase'] == 'bossIntro' and st['enemies'] == 1 and ev(page, "__tank.G.boss.def.id") == 'sonhisar' and 'SON HİSAR' in ban and 'Şehir Meydanı' in ban, [st['phase'], st['enemies'], ban])
    ev(page, "__tank.step(3.2)")
    check('intro_ends_in_fight', ev(page, "__tank.G.phase") == 'fight')
    arena = ev(page, """() => { const t = __tank, G = t.G, m = G.map, a = t.ARENAS.sehir, pa = t.parseArena(a), bad = [];
      for (let i = 0; i < pa.n * pa.n; i++) if (m.t[i] !== pa.t[i]) bad.push(i);
      return { n: m.n, bad, arena: m.arena, theme: m.theme.key, boss: pa.boss, player: pa.player, enemies: G.enemies.length }; }""")
    check('arena_sehir_21x21_city', arena['n'] == 21 and arena['arena'] == 'sehir' and not arena['bad'] and arena['boss'] == {'c': 10, 'r': 4} and arena['player'] == {'c': 10, 'r': 16} and arena['theme'] == 'city' and arena['enemies'] == 1, arena)
    ids = ev(page, "[__tank.bossDefAt(40).id, __tank.bossDefAt(80).id, __tank.bossDefAt(35).id, Object.keys(__tank.BOSS_DEFS).includes('sonhisar')]")
    check('wave40_and_80_sonhisar_serbest_list', ids == ['sonhisar', 'sonhisar', 'komutan', True], ids)
    spec = ev(page, "(() => { const e = __tank.G.boss, s = e.spec; return [s.len, s.wid, s.speed, s.col.body, s.col.dk, s.col.hi, s.col.acc, e.parts.length, e.parts[0].maxHp / e.maxHp, e.maxHp, e.round]; })()")
    check('spec_size_speed_colours_modules', spec[:7] == [120, 110, 30, '#4a4e55', '#2c2f34', '#7a808a', '#f2a530'] and spec[7] == 2 and abs(spec[8] - 0.08) < 0.002 and spec[10] == 0, spec)

    # ---- modules: hull takes 30% while both live (floor 62%), a module takes full damage, one module down = full hull damage ----
    ev(page, START); ev(page, f"({PLACE})([10, 8, 10, 16, 0])")
    d_both = ev(page, HIT, 10)
    check('hull_takes_30pct_while_both_modules_live', abs(d_both - 3) < 0.01, d_both)
    mod = ev(page, "(() => { const t = __tank, e = t.G.boss, q = e.parts[0], h0 = q.hp; t.hurtBoss(10, e.x + 50, e.y + q.oy, 0); return [h0 - q.hp, e.hp === e.maxHp - 3]; })()")
    check('module_takes_full_damage_hull_untouched', mod == [10, True], mod)
    fl = ev(page, "(() => { const e = __tank.G.boss; e.hp = e.maxHp * 0.5; __tank.step(0.1); return +(e.hp / e.maxHp).toFixed(3); })()")
    check('hull_floor_62pct_while_module_lives', fl >= 0.619, fl)
    ev(page, "(() => { const e = __tank.G.boss; e.hp = e.maxHp; })()")
    ev(page, "(() => { const t = __tank, e = t.G.boss, q = e.parts[0]; t.hurtBoss(q.hp + 5, e.x + 50, e.y + q.oy, 0); })()")
    one = ev(page, "[__tank.G.boss.parts.map(q => q.alive), __tank.G.boss.phase]")
    d_one = ev(page, HIT, 10)
    check('one_module_down_full_hull_damage_still_phase1', one == [[False, True], 0] and abs(d_one - 10) < 0.01, [one, d_one])

    # ---- phases: both modules -> 2; 60% -> 3; 30% -> 4 ----
    ev(page, "(() => { const t = __tank, e = t.G.boss, q = e.parts[1]; t.hurtBoss(q.hp + 5, e.x + 50, e.y + q.oy, 0); __tank.step(1.8); })()")
    ph1 = ev(page, "[__tank.G.boss.phase, __tank.G.boss.parts.every(q => !q.alive)]")
    ph2 = ev(page, PHASE, 0.58); ph3 = ev(page, PHASE, 0.28)
    check('phases_modules_60_30', ph1 == [1, True] and ph2[0] == 2 and ph3[0] == 3, [ph1, ph2, ph3])
    ev(page, "__tank.step(1.0)")
    d_core = ev(page, HIT, 10)
    core = ev(page, "__tank.G.boss.sh.core")
    check('open_core_double_damage_phase4', abs(d_core - 20) < 0.01 and core > 0.9, [d_core, core])

    # ---- charge (phase 3): barricades break; steel = 2 s stun + 3 brick heaps; a 3.5-tile shock ring follows ----
    ev(page, START); ev(page, "(() => { const e = __tank.G.boss; for (const q of e.parts) { q.alive = false; q.hp = 0; } e.hp = e.maxHp * 0.5; __tank.step(3.4); })()")
    ev(page, "(() => { const e = __tank.G.boss; for (const a of e.def.attacks) e.acd[a.id] = 1e12; e.cool = 1e9; })()")
    check('phase3_hucum_reached', ev(page, "__tank.G.boss.phase") == 2)
    bricks0 = ev(page, "(() => { const m = __tank.G.map; let n = 0; for (let i = 0; i < m.n * m.n; i++) if (m.t[i] === 1) n++; return n; })()")
    ev(page, f"({PLACE})([15, 10, 3, 10, Math.PI])"); ev(page, "__tank.G.boss.e = 0")
    ev(page, RUN, 'hucum')
    ev(page, "__tank.step(1.0)")
    wl = ev(page, "(() => { const t = __tank, G = t.G, tl = G.tele.find(x => x.kind === 'line'); return tl ? [+tl.t.toFixed(2), tl.dur, tl.lock, tl.w] : null; })()")
    ev(page, DONE, 8)
    info = ev(page, "(() => { const t = __tank, G = t.G, e = G.boss, m = G.map; let n = 0; for (let i = 0; i < m.n * m.n; i++) if (m.t[i] === 1) n++; return { bricks: n, x: Math.round(e.x), log: e.log.map(l => [l.atk, l.kind, l.dur]) }; })()")
    check('charge_line_1_2s_and_barricade_falls', wl and wl[1] == 1.2 and wl[2] == 0.3 and info["bricks"] == bricks0 - 3 and any(l[0] == 'hucum' and l[2] >= 1.2 for l in info['log']), [wl, info, bricks0])
    check('shock_ring_after_charge', any(l[0] == 'sok' and l[1] == 'ring' and l[2] >= 1.2 for l in info['log']), info['log'])
    # steel: charge west along row 8, into the steel block at (6-7, 6-7)
    ev(page, f"({PLACE})([10, 8, 3, 8, Math.PI])")
    ev(page, RUN, 'hucum'); ev(page, "__tank.step(2.2)")
    ev(page, "(() => { const t = __tank, e = t.G.boss; let n = 0; while (e.gen && !(e.stunT > 0) && n < 600) { t.step(1 / 60); n++; } })()")
    stun = ev(page, "(() => { const e = __tank.G.boss; return [+e.stunT.toFixed(2), e.sh.deb.length, e.sh.deb.every(q => __tank.G.map.t[q.r * 21 + q.c] === 1)]; })()")
    check('steel_stun_2s_and_3_brick_heaps', 1.5 < stun[0] <= 2 and stun[1] == 3 and stun[2], stun)
    ev(page, DONE, 8)
    gone = ev(page, "(() => { const e = __tank.G.boss; e.sh.deb.forEach(q => q.t = 99); __tank.step(0.1); return e.sh.deb.length; })()")
    check('brick_heaps_expire', gone == 0, gone)

    # ---- last phase: it walks to the middle of the square and stays; spin and shock + mortar run ----
    ev(page, START); ev(page, "(() => { const e = __tank.G.boss; for (const q of e.parts) { q.alive = false; q.hp = 0; } e.hp = e.maxHp * 0.25; __tank.step(5); e.cool = 1e9; })()")
    ev(page, "(() => { const t = __tank, G = t.G, e = G.boss; G.god = true; e.cool = 1e9; e.x = 10 * 48 + 24; e.y = 5 * 48 + 24; G.player.x = 10 * 48 + 24; G.player.y = 16 * 48 + 24; })()")
    ev(page, "__tank.step(25)")
    pos = ev(page, "(() => { const e = __tank.G.boss; return [Math.round(e.x / 48 - 0.5), Math.round(e.y / 48 - 0.5), e.phase]; })()")
    print('phase4 pos', pos) if os.environ.get('TANK_VERBOSE') else None
    check('phase4_stops_in_square_centre', abs(pos[0] - 10) <= 1 and abs(pos[1] - 8) <= 1 and pos[2] == 3, pos)  # within a tile: the boss settles near the centre, rounding flips at tile edges
    ev(page, "(() => { const t = __tank, e = t.G.boss; e.tune = Object.assign({}, e.tune); e.log.length = 0; })()")
    ev(page, RUN, 'doner'); t1 = ev(page, DONE, 8)
    ev(page, RUN, 'sokhavan'); t2 = ev(page, DONE, 8)
    lg = ev(page, "__tank.G.boss.log.map(l => [l.atk, l.kind, l.dur])")
    check('spin_and_shock_mortar_telegraphs', any(l[0] == 'doner' and l[1] == 'line' and l[2] >= 1.1 for l in lg) and any(l[0] == 'sok' and l[2] >= 1.2 for l in lg) and sum(1 for l in lg if l[0] == 'havan') == 5 and t1 > 3, [lg, t1, t2])
    gap = ev(page, "(() => { const e = __tank.G.boss; return +(e.tune.gap / __tank.BOSS_TUNE.sonhisar.gap).toFixed(3); })()")
    check('phase4_attacks_25pct_faster', abs(gap - 0.75) < 0.01, gap)

    # ---- death: a long scene, slow motion, title, then İkinci Tur ----
    ev(page, START); ev(page, "(() => { const t = __tank, e = t.G.boss; for (const q of e.parts) { q.alive = false; q.hp = 0; } e.hp = e.maxHp * 0.25; t.step(5); e.cool = 1e9; e.hp = 1; t.G.beaten.add('kiragi'); t.hurtBoss(20, e.x + 50, e.y, 0); })()")
    d0 = ev(page, "(() => { const e = __tank.G.boss; return [e.dying, document.getElementById('bTitle').textContent, __tank.G.timeScale]; })()")
    ev(page, "__tank.step(2.0)"); mid = ev(page, "[__tank.G.timeScale, !!__tank.G.boss]")
    ev(page, "__tank.step(10)")
    end = ev(page, "[!!__tank.G.boss, __tank.G.timeScale, __tank.G.phase, [...__tank.G.beaten]]")
    check('death_scene_title_slowmo_then_cleared', d0[0] and d0[1] == 'SON HİSAR DÜŞTÜ' and mid[0] < 1 and mid[1] and not end[0] and end[1] == 1 and end[2] in ('cleared', 'fight', 'upgrade') and 'sonhisar' in end[3], [d0, mid, end])
    ev(page, "(() => { const t = __tank, G = t.G; G.god = true; G.phase = 'fight'; G.wave = 40; t.nextWave(); })()")
    r2 = ev(page, "(() => { const t = __tank, G = t.G; return { wave: G.wave, theme: G.map.theme.key, beaten: G.beaten.size, hunter: t.typeBanned('hunter'), bt: document.getElementById('bTitle').textContent, bs: document.getElementById('bSub').textContent, boss: !!G.boss }; })()")
    check('ikinci_tur_wave41_col_region_rule_reset', r2['wave'] == 41 and r2['theme'] == 'desert' and r2['beaten'] == 0 and not r2['hunter'] and r2['bt'] == 'İKİNCİ TUR' and not r2['boss'], r2)
    ev(page, "(() => { const t = __tank, G = t.G; G.phase = 'fight'; G.wave = 44; t.nextWave(); })()")
    k = ev(page, "(() => { const t = __tank, G = t.G, e = G.boss; return { id: e.def.id, round: e.round, maxHp: e.maxHp, base: Math.round(t.bossHp(45) * 1.3), dmg: e.tune.dmg, base_dmg: t.BOSS_TUNE.komutan.dmg, theme: G.map.theme.key }; })()")
    check('wave45_komutan_round2_stronger', k['id'] == 'komutan' and k['round'] == 1 and k['maxHp'] == k['base'] and abs(k['dmg'] - k['base_dmg'] * 1.3) < 1e-6, k)
    chain = []
    for w in (50, 60, 70, 80, 85, 120):
        chain.append(ev(page, "(w) => { const t = __tank, G = t.G; G.phase = 'fight'; G.wave = w - 1; t.nextWave(); const e = G.boss; return [w, e && e.def.id, e && e.round, e && e.maxHp, G.map.theme.key, G.beaten.size]; }", w))
    base = ev(page, "[__tank.BOSS_DEFS.sari.hp(10), __tank.BOSS_DEFS.demirkok.hp(20), __tank.BOSS_DEFS.kiragi.hp(30), __tank.BOSS_DEFS.sonhisar.hp(40)]")
    exp = [('sari', 1, round(base[0] * 1.3), 'desert'), ('demirkok', 1, round(base[1] * 1.3), 'forest'), ('kiragi', 1, round(base[2] * 1.3), 'snow'), ('sonhisar', 1, round(base[3] * 1.3), 'city')]
    ok = all(chain[i][1] == exp[i][0] and chain[i][2] == exp[i][1] and abs(chain[i][3] - exp[i][2]) <= 1 and chain[i][4] == exp[i][3] for i in range(4))
    check('round2_bosses_at_region_waves_130pct_hp', ok, [chain[:4], base])
    check('round3_boss_169pct', chain[4][1] == 'komutan' and chain[4][2] == 2 and chain[5][1] == 'sonhisar' and chain[5][2] == 2 and abs(chain[5][3] - round(base[3] * 1.69)) <= 1, chain[4:])

    # ---- phone screenshots: phase 1 (modules) and the open core ----
    ctx2 = new_ctx(b, 'phone', viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ph = ctx2.new_page(); seed(ph); ph.tap('#btnStart'); ph.wait_for_timeout(400)
    ev(ph, START)
    ev(ph, "(() => { const t = __tank, G = t.G, e = G.boss; e.x = 10 * 48 + 24; e.y = 9 * 48 + 24; G.player.x = 10 * 48 + 24; G.player.y = 14 * 48 + 24; e.parts[0].hp = e.parts[0].maxHp * 0.3; e.angle = Math.PI / 2; e.turret = Math.PI / 2; e.gen = t.BOSS_DEFS.sonhisar.attacks.find(a => a.id === 'lazer').run(e); e.atkId = 'lazer'; e.wait = 0; t.step(0.8); })()")
    ev(ph, "document.getElementById('hint').classList.remove('show'); document.getElementById('banner').classList.remove('show')")
    ph.wait_for_timeout(150); os.makedirs(str(TMP), exist_ok=True); ph.screenshot(path=str(TMP / 'sonhisar_p390.png'))
    check('phone_lasers_screenshot', ev(ph, "__tank.G.tele.length") >= 3)
    ctx2.close(); b.close()

errs = real_errors()
check('no_page_errors', not errs, errs[:3])
print('check_sonhisar:', 'FAILED ' + ', '.join(FAILS) if FAILS else 'all ok')
print('ERRORS:', errs or 'none')

sys.exit(1 if FAILS else 0)
