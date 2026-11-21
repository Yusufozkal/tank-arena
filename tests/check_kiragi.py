"""Kırağı and Donmuş Göl (docs/BOSSES.md section 6): wave 30 stage and arena, stealth rules (bush, 3 s in the open, visible after a shot, tracks, shimmer), laser (line 1 s, locked, stops at steel),
part damage cancel, ice copies (one hit, slow nearby, harmless lines), the lake (impassable until phase 3), frost front and ground (player 30% slower, Kırağı faster), death text, second loop (three copies), region rule.
Usage: TANK_TEST_PORT=8800 python3 tests/check_kiragi.py     (phone screenshot with the copies and frost: .tmp/kiragi_p390.png)"""
from common import *  # noqa: F401,F403

report_on_exit('check_kiragi', R)
FAILS = []


def check(name, ok, info=None):
    R[name] = info if info is not None else ok
    vprint(('ok   ' if ok else 'FAIL ') + name, info if not ok else '')
    if not ok:
        FAILS.append(name)
        print('FAIL', name, info)


def ev(page, js, arg=None):
    return page.evaluate(js, arg) if arg is not None else page.evaluate(js)


START = "(w) => { localStorage.setItem('tankArena.seenBossIntro','true'); __tank.G.god = true; __tank.dbg.freeze = true; __tank.wave(w || 30); __tank.bossSkip(); const e = __tank.G.boss; for (const a of e.def.attacks) e.acd[a.id] = 1e12; }"
# park the boss at tile (c, r) facing east and held still (rooted), the player at tile (pc, pr); attacks off; stealth state reset
PLACE = """([c, r, pc, pr]) => { const t = __tank, G = t.G, e = G.boss, p = G.player, kr = e.kr; e.x = c * 48 + 24; e.y = r * 48 + 24; p.x = pc * 48 + 24; p.y = pr * 48 + 24; p.vx = p.vy = 0; p.cool = 1e9;
  e.gen = null; e.atkId = ''; e.cool = 99; e.stunT = 0; e.angle = e.turret = 0; e.rooted = true; G.tele.length = 0; G.bullets.length = 0; kr.open = 0; kr.lock = 0; kr.shot = 0; kr.force = 0; kr.boost = 1; kr.slowT = 0; kr.pSlow = 0;
  kr.front = null; kr.frost.fill(0); kr.beams.length = 0; kr.trail.length = 0; kr.dtrail.length = 0; kr.dec.length = 0; }"""
RUN = "(id) => { const t = __tank, e = t.G.boss; e.gen = t.BOSS_DEFS.kiragi.attacks.find(a => a.id === id).run(e); e.atkId = id; e.wait = 0; }"
DONE = "(max) => { const t = __tank, e = t.G.boss; let n = 0; while (e.gen && n < max * 60) { t.step(1 / 60); n++; } return n / 60; }"
INFO = "() => { const e = __tank.G.boss, kr = e.kr; return { inv: kr.inv, a: +kr.a.toFixed(2), vis: +e.def.vis(e).toFixed(2), open: +kr.open.toFixed(2), lock: +kr.lock.toFixed(2), shot: +kr.shot.toFixed(2), sm: +e.speedMul.toFixed(2) }; }"

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = new_ctx(b, 'desktop', viewport={'width': 1000, 'height': 760})
    page = ctx.new_page(); seed(page)
    page.click('#btnStart'); page.wait_for_timeout(300)

    # ---- wave 30 is a boss stage with only Kırağı, in Donmuş Göl ----
    ev(page, "localStorage.removeItem('tankArena.seenBossIntro'); __tank.G.god = true; __tank.dbg.freeze = true; __tank.wave(30)")
    st = ev(page, "__tank.bossInfo()")
    ban = ev(page, "document.getElementById('banner').textContent")
    check('wave30_kiragi_stage', st['phase'] == 'bossIntro' and st['enemies'] == 1 and ev(page, "__tank.G.boss.def.id") == 'kiragi' and 'KIRAĞI' in ban and 'Donmuş Göl' in ban, [st['phase'], st['enemies'], ban])
    ev(page, "__tank.step(3.2)")
    check('intro_ends_in_fight', ev(page, "__tank.G.phase") == 'fight')
    arena = ev(page, """() => { const t = __tank, G = t.G, m = G.map, a = t.ARENAS.gol, pa = t.parseArena(a), bad = [];
      for (let i = 0; i < pa.n * pa.n; i++) if (m.t[i] !== pa.t[i]) bad.push(i);
      return { n: m.n, bad, arena: m.arena, theme: m.theme.key, boss: pa.boss, player: pa.player, enemies: G.enemies.length, water: Array.from(pa.t).filter(v => v === 3).length, bush: Array.from(pa.t).filter(v => v === 4).length }; }""")
    check('arena_gol_matches_spec', arena['n'] == 21 and arena['arena'] == 'gol' and not arena['bad'] and arena['boss'] == {'c': 10, 'r': 2} and arena['player'] == {'c': 10, 'r': 18} and arena['water'] == 15, arena)
    check('snow_theme_only_boss', arena['theme'] == 'snow' and arena['enemies'] == 1 and ev(page, "__tank.G.boss.kr.lake.length") == 15, arena)
    ids = ev(page, "[__tank.bossDefAt(30).id, __tank.bossDefAt(70).id, __tank.bossDefAt(25).id, Object.keys(__tank.BOSS_DEFS).includes('kiragi')]")
    check('wave30_and_70_kiragi_serbest_list', ids == ['kiragi', 'kiragi', 'komutan', True], ids)
    spec = ev(page, "(() => { const e = __tank.G.boss, s = e.spec; return [s.len, s.wid, s.speed, s.col.body, s.col.dk, s.col.hi, s.col.acc]; })()")
    check('spec_size_speed_colours', spec == [90, 44, 125, '#6c4fa3', '#432f6b', '#9d84d1', '#7ef0d0'], spec)

    # ---- stealth: bush = invisible; open ground: invisible up to 3 s, then 2 s visible; a shot = 1.5 s visible and slower ----
    ev(page, START); ev(page, f"({PLACE})([3, 3, 10, 15])")
    ev(page, "__tank.step(0.6)")
    inb = ev(page, INFO)
    check('invisible_in_bush', inb['inv'] and inb['vis'] < 0.1, inb)
    ev(page, f"({PLACE})([10, 5, 10, 15])")
    ev(page, "__tank.step(2.8)"); a = ev(page, INFO)
    ev(page, "__tank.step(0.4)"); b3 = ev(page, INFO)
    ev(page, "__tank.step(1.5)"); c1 = ev(page, INFO)
    ev(page, "__tank.step(0.8)"); d2 = ev(page, INFO)
    check('open_ground_3s_invisible_then_2s_visible', a['inv'] and not b3['inv'] and not c1['inv'] and d2['inv'], [a, b3, c1, d2])
    ev(page, f"({PLACE})([10, 5, 10, 15])"); ev(page, RUN, 'keskin')
    ev(page, "(() => { const t = __tank, e = t.G.boss; let n = 0; while (!e.kr.beams.length && n < 400) { t.step(1 / 60); n++; } })()")
    ev(page, "__tank.step(0.05)"); f0 = ev(page, INFO)
    ev(page, "__tank.step(1.25)"); f1 = ev(page, INFO)
    ev(page, "__tank.step(0.5)"); f2 = ev(page, INFO)
    check('visible_and_slow_after_shot', not f0['inv'] and f0['shot'] > 1.4 and f0['sm'] < 0.6 and not f1['inv'] and f1['sm'] < 0.6 and f2['shot'] == 0 and f2['sm'] == 1, [f0, f1, f2])

    # ---- tracks (2 s) while invisible and the shimmer; the laser line is shown even when invisible ----
    ev(page, f"({PLACE})([10, 9, 10, 17])"); ev(page, "(() => { const e = __tank.G.boss; e.rooted = false; })()")
    ev(page, "__tank.step(1.2)")
    tr = ev(page, "(() => { const e = __tank.G.boss, kr = e.kr; return { n: kr.trail.length, oldest: kr.trail.length ? +(__tank.G.time - kr.trail[0].t).toFixed(2) : 0, vis: e.def.vis(e), inv: kr.inv, moved: Math.hypot(e.x - 10 * 48 - 24, e.y - 9 * 48 - 24) }; })()")
    ev(page, "(() => { __tank.G.boss.rooted = true; })()"); ev(page, "__tank.step(2.3)")
    tr2 = ev(page, "__tank.G.boss.kr.trail.length")
    check('tracks_2s_while_moving', tr['n'] > 4 and tr['oldest'] <= 2.02 and tr['moved'] > 20 and tr2 == 0, [tr, tr2])
    shim = ev(page, "(() => { const e = __tank.G.boss; e.kr.a = 0; e.kr.inv = true; const ms = __tank.bench(3); return { ms: +ms.toFixed(2), vis: e.def.vis(e) }; })()")
    check('shimmer_renders_when_invisible', shim['vis'] < 0.02 and shim['ms'] < 40, shim)
    ev(page, f"({PLACE})([10, 5, 10, 15])")
    ev(page, "(() => { const e = __tank.G.boss; e.kr.a = 0; e.kr.inv = true; e.flash = 0.1; })()")
    check('hit_flash_shows_invisible_boss', ev(page, "__tank.G.boss.def.vis(__tank.G.boss)") >= 0.5)

    # ---- laser: line 1 s (last 0.25 s locked), mint, stops at steel, one hit damage ----
    ev(page, START); ev(page, f"({PLACE})([10, 8, 10, 15])"); ev(page, "(() => { const G = __tank.G, p = G.player; G.god = false; p.hp = p.maxHp; })()")
    ev(page, RUN, 'keskin')
    ev(page, "__tank.step(0.3)")
    tl = ev(page, "(() => { const tl = __tank.G.tele.find(x => x.kind === 'line'); return tl ? { lock: tl.lock, dur: tl.dur, rgb: tl.rgb, hasGlow: __tank.G.tele.some(x => x.kind === 'glow') } : null; })()")
    ev(page, DONE, 3)
    lg = ev(page, "(() => { const e = __tank.G.boss, l = e.log.filter(x => x.atk === 'keskin').pop(); return { dur: l && l.dur, hurt: __tank.G.player.maxHp - __tank.G.player.hp }; })()")
    check('laser_line_1s_lock_025_mint', tl and tl['lock'] == 0.25 and tl['dur'] >= 1.0 and tl['rgb'] == '126,240,208' and tl['hasGlow'] and lg['dur'] >= 1.0, [tl, lg])
    check('laser_hits_player_once', 8 <= lg['hurt'] <= 40, lg)
    ev(page, f"({PLACE})([8, 8, 1, 8])"); ev(page, "(() => { const e = __tank.G.boss; e.angle = e.turret = Math.PI; const p = __tank.G.player; p.hp = p.maxHp; })()")
    ev(page, RUN, 'keskin'); ev(page, "__tank.step(0.5)")
    ln = ev(page, "(() => { const tl = __tank.G.tele.find(x => x.kind === 'line'); return tl.len; })()")
    ev(page, DONE, 3)
    behind = ev(page, "__tank.G.player.maxHp - __tank.G.player.hp")
    check('laser_stops_at_steel', ln < 140 and behind == 0, [ln, behind])

    # ---- part damage: tread or barrel broken during the laser warning cancels it ----
    ev(page, "(() => { __tank.G.god = true; })()")
    for what, js in (('tread', "(() => { const t = __tank, e = t.G.boss; t.hurtBoss(200, e.x, e.y + 30, e.angle + Math.PI / 2); return e.cancels; })()"),
                     ('barrel', "(() => { const t = __tank, e = t.G.boss; t.hurtBoss(200, e.x + 60, e.y, e.turret); return e.cancels; })()")):
        ev(page, START); ev(page, f"({PLACE})([10, 8, 10, 15])"); ev(page, RUN, 'keskin'); ev(page, "__tank.step(0.4)")
        before = ev(page, "[__tank.G.boss.cancels, __tank.G.tele.length]")
        got = ev(page, js)
        after = ev(page, "[!!__tank.G.boss.gen, __tank.G.tele.length]")
        check(f'{what}_break_cancels_laser', before[1] >= 2 and got == 1 and after == [False, 0], [before, got, after])

    # ---- phase 2: ice copies ----
    ev(page, START); ev(page, "(() => { const e = __tank.G.boss; e.phase = 1; e.phased = false; })()")
    ev(page, f"({PLACE})([10, 6, 10, 15])"); ev(page, "(() => { const G = __tank.G, p = G.player; G.god = false; p.hp = p.maxHp; })()"); ev(page, RUN, 'suret')
    ev(page, "__tank.step(0.7)")
    dc = ev(page, "(() => { const e = __tank.G.boss, T = __tank.G.tele; return { n: e.kr.dec.length, lines: T.filter(x => x.kind === 'line').length, fake: T.filter(x => x.fake).length, fakeSafe: T.filter(x => x.fake).every(x => x.nodanger), glow: e.kr.dec.every(d => true) }; })()")
    check('two_copies_three_laser_lines', dc['n'] == 2 and dc['lines'] == 3 and dc['fake'] == 2 and dc['fakeSafe'], dc)
    ev(page, DONE, 4)
    hl = ev(page, "(() => { const e = __tank.G.boss, p = __tank.G.player; return { hurt: p.maxHp - p.hp, one: Math.max(1, Math.round(14 * __tank.G.mods.dmg * __tank.G.boss.tune.dmg)), logs: e.log.filter(x => x.atk === 'suret').length, left: e.kr.dec.length }; })()")
    check('copy_lines_do_no_damage_only_real_hits', hl['hurt'] == hl['one'] and hl['logs'] == 1 and hl['left'] == 2, hl)
    # one hit breaks a copy (a real shell through updateBullets), the player standing next to it is slowed 2 s
    sl = ev(page, """() => { const t = __tank, G = t.G, e = G.boss, p = G.player, kr = e.kr; G.god = true; e.cool = 99; const d = kr.dec[0]; d.x = 10 * 48 + 24; d.y = 5 * 48 + 24; d.goal = null;
      p.x = d.x + 70; p.y = d.y; p.vx = p.vy = 0; kr.pSlow = 0;
      G.bullets.push({ x: d.x + 40, y: d.y, vx: -660, vy: 0, r: 4, owner: 0, dmg: 1, life: 2, big: false, dead: false, pierce: false, bounce: 0, splash: null, look: 'player', hits: null, bricks: null, sx: d.x + 40, sy: d.y, dist: 0, bounced: false, vol: 0, volN: 0, pn: 0 });
      for (let i = 0; i < 6; i++) t.stepBullets(1 / 60);
      return { left: kr.dec.length, pSlow: +kr.pSlow.toFixed(2), k: t.playerSlowK(), bullets: G.bullets.filter(b => b.owner === 0).length }; }""")
    check('copy_breaks_in_one_hit_and_slows_near_player', sl['left'] == 1 and sl['pSlow'] > 1.9 and abs(sl['k'] - 0.6) < 1e-6 and sl['bullets'] == 0, sl)
    ev(page, "__tank.step(2.2)")
    check('slow_lasts_2s', ev(page, "__tank.playerSlowK()") == 1)
    far = ev(page, """() => { const t = __tank, G = t.G, e = G.boss, p = G.player, kr = e.kr, d = kr.dec[0]; p.x = d.x + 400; p.y = d.y; e.x = d.x + 60; e.y = d.y; kr.slowT = 0; kr.pSlow = 0;
      t.G.bullets.length = 0; const hit = t.krDecoyHit({ x: d.x, y: d.y, r: 4 }); return { hit, left: kr.dec.length, bossSlow: +kr.slowT.toFixed(2), pSlow: kr.pSlow }; }""")
    check('copy_slows_boss_near_not_far_player', far['hit'] and far['left'] == 0 and far['bossSlow'] > 1.9 and far['pSlow'] == 0, far)

    # ---- lake: impassable before phase 3, passable in phase 3 ----
    ev(page, START); ev(page, f"({PLACE})([10, 3, 3, 3])")
    walk = """(() => { const t = __tank, G = t.G, p = G.player; p.x = 7 * 48 + 24; p.y = 10 * 48 + 24; p.vx = 0; p.vy = 0; for (let i = 0; i < 60; i++) { p.vx = 200; p.vy = 0; t.step(1 / 60); } return Math.round(p.x); })()"""
    x0 = ev(page, walk)
    fit0 = ev(page, "__tank.bossFitMap(__tank.G.boss)[10 * 21 + 10]")
    water0 = ev(page, "(() => { const m = __tank.G.map; return [m.t[10 * 21 + 10], __tank.G.boss.phase]; })()")
    check('lake_impassable_before_phase3', x0 < 8 * 48 and water0 == [3, 0], [x0, water0])
    ev(page, "(() => { const e = __tank.G.boss; e.rooted = false; e.cool = 99; e.invuln = false; e.hp = e.maxHp * 0.3; })()")
    ev(page, "__tank.step(4)")
    ev(page, "(() => { const e = __tank.G.boss; e.rooted = true; e.invuln = false; })()")
    x1 = ev(page, walk)
    water1 = ev(page, "(() => { const m = __tank.G.map, e = __tank.G.boss; return [m.t[10 * 21 + 10], m.t[9 * 21 + 8], m.t[11 * 21 + 12], e.phase, e.kr.lakeOpen]; })()")
    check('lake_passable_in_phase3', x1 > 9 * 48 and water1 == [0, 0, 0, 2, True], [x1, water1])
    fit1 = ev(page, "__tank.bossFitMap(__tank.G.boss)[10 * 21 + 10]")
    check('boss_fits_lake_only_after_freeze', fit0 == 0 and fit1 == 1, [fit0, fit1])

    # ---- frost ground: player 30% slower, Kırağı faster; the front: line 1.5 s ahead, ground frosted 6 s ----
    ev(page, START); ev(page, "(() => { const e = __tank.G.boss; e.phase = 2; e.phased = false; })()"); ev(page, f"({PLACE})([10, 9, 2, 15])")
    ev(page, "(() => { __tank.G.boss.x = 10 * 48 + 24; __tank.G.boss.y = 3 * 48 + 24; })()")
    page.keyboard.down('ArrowRight')
    def run_row(frost):
        ev(page, "(f) => { const t = __tank, G = t.G, p = G.player, kr = G.boss.kr; p.x = 2 * 48 + 24; p.y = 15 * 48 + 24; p.vx = p.vy = 0; kr.frost.fill(f ? 99 : 0); }", frost)
        ev(page, "__tank.step(0.4)")
        return ev(page, "(() => { const p = __tank.G.player, x0 = p.x; __tank.step(0.6); return p.x - x0; })()")
    d_free, d_frost = run_row(False), run_row(True)
    page.keyboard.up('ArrowRight')
    ratio = d_frost / d_free if d_free else 0
    check('frost_slows_player_30pct', abs(ratio - 0.7) < 0.04 and abs(ev(page, "__tank.playerSlowK()") - 0.7) < 1e-6, [d_free, d_frost, ratio])
    fs = ev(page, """() => { const e = __tank.G.boss, kr = e.kr; kr.frost.fill(0); const i = (Math.floor(e.y / 48)) * 21 + Math.floor(e.x / 48); __tank.step(0.05); const free = e.speedMul; kr.frost[i] = 5; __tank.step(0.05); return { free, frost: e.speedMul }; }""")
    check('kiragi_faster_on_frost', abs(fs['free'] - 1.0) < 1e-6 and abs(fs['frost'] - 1.4) < 1e-6, fs)
    ev(page, f"({PLACE})([10, 3, 10, 17])"); ev(page, "(() => { __tank.G.boss.rooted = true; })()"); ev(page, RUN, 'don')
    ev(page, "__tank.step(0.5)")
    fr0 = ev(page, "(() => { const e = __tank.G.boss, tl = __tank.G.tele.find(x => x.front); return { tl: !!tl, nodanger: tl && tl.nodanger, none: Array.from(e.kr.frost).filter(v => v > 0).length, danger: __tank.bossDanger(tl.x + 5, tl.y + 5, 10) }; })()")
    ev(page, DONE, 3)
    fr1 = ev(page, "(() => { const e = __tank.G.boss, l = e.log.filter(x => x.atk === 'don').pop(); const f = Array.from(e.kr.frost).filter(v => v > 0); return { dur: l && l.dur, n: f.length, max: Math.max(0, ...f), front: !!e.kr.front }; })()")
    ev(page, "__tank.step(6.5)")
    fr2 = ev(page, "Array.from(__tank.G.boss.kr.frost).filter(v => v > 0).length")
    check('front_line_1_5s_ahead_then_frost_6s', fr0['tl'] and fr0['none'] == 0 and fr0['nodanger'] and not fr0['danger'] and fr1['dur'] >= 1.5 and fr1['n'] > 20 and fr1['max'] <= 6.0001 and fr2 == 0, [fr0, fr1, fr2])

    # ---- death ----
    ev(page, START); ev(page, f"({PLACE})([10, 6, 10, 15])"); ev(page, "(() => { const e = __tank.G.boss; e.rooted = true; e.phase = 2; e.phased = false; e.hp = 5; e.invuln = false; __tank.hurtBoss(20, e.x + 40, e.y, 0); })()")
    ev(page, "__tank.step(1)")
    ban = ev(page, "document.getElementById('banner').textContent")
    ev(page, "__tank.step(5)")
    after = ev(page, "(() => { const G = __tank.G; return { phase: G.phase, hp: G.player.hp, max: G.player.maxHp, boss: !!G.boss && !G.boss.dead, beaten: [...G.beaten] }; })()")
    check('death_text_kiragi_eridi', 'KIRAĞI ERİDİ' in ban, ban)
    check('death_armour_full_loot_region', after['hp'] == after['max'] and after['phase'] == 'upgrade', after)

    # ---- second loop: wave 70 has three copies and the copies leave 0.5 s tracks ----
    ev(page, START, 70)
    chk = ev(page, "(() => { const e = __tank.G.boss; return [e.def.id, e.kr.loop2, __tank.G.wave]; })()")
    ev(page, "(() => { const e = __tank.G.boss; e.phase = 1; e.phased = false; })()")
    ev(page, f"({PLACE})([10, 6, 10, 15])"); ev(page, RUN, "suret"); ev(page, "__tank.step(1.2)")
    l2 = ev(page, "(() => { const e = __tank.G.boss, kr = e.kr, now = __tank.G.time; return { n: kr.dec.length, trail: kr.dtrail.length, old: kr.dtrail.length ? +(now - kr.dtrail[0].t).toFixed(2) : 0 }; })()")
    check('second_loop_three_copies_short_tracks', chk == ['kiragi', True, 70] and l2['n'] == 3 and l2['trail'] > 0 and l2['old'] <= 0.52, [chk, l2])
    ev(page, START, 30); ev(page, "(() => { const e = __tank.G.boss; e.phase = 1; e.phased = false; })()")
    ev(page, f"({PLACE})([10, 6, 10, 15])"); ev(page, RUN, "suret"); ev(page, "__tank.step(1.2)")
    l1 = ev(page, "(() => { const kr = __tank.G.boss.kr; return { n: kr.dec.length, trail: kr.dtrail.length, loop2: kr.loop2 }; })()")
    check('first_loop_two_copies_no_tracks', l1 == {'n': 2, 'trail': 0, 'loop2': False}, l1)

    # ---- region rule: after Kırağı no Avcı and no Ağır Topçu; the banner at wave 31 names both ----
    ev(page, "(() => { const t = __tank, G = t.G; t.toMenu(); t.startGame(); G.beaten.clear(); G.wave = 30; t.killAll(); t.waveCleared(); })()")
    got = ev(page, "[[...__tank.G.beaten], __tank.typeBanned('hunter'), __tank.typeBanned('topcu'), __tank.typeBanned('basic')]")
    ev(page, "(() => { const t = __tank, G = t.G; G.wave = 30; G.phase = 'fight'; G.state = 'play'; t.nextWave(); })()")
    bt, bs = ev(page, "document.getElementById('bTitle').textContent"), ev(page, "document.getElementById('bSub').textContent")
    check('region_rule_kiragi_bans_hunter_topcu', got[0] == ['kiragi'] and got[1] and got[2] and not got[3] and bt == 'ŞEHİR BÖLGESİ' and bs == 'Avcılar ve Ağır Topçular artık gelmiyor', [got, bt, bs])

    # ---- the bot can fight it: 70 s with strong cards, the boss loses a good share of its HP ----
    ev(page, "(() => { const t = __tank; t.toMenu(); t.startGame(); })()"); page.wait_for_timeout(200)
    bf = ev(page, "__tank.bossFight(30, { caliber: 3, loader: 4, armor: 4, barrel: 2, engine: 3, repair: 2 }, 'std', 70)")
    check('bot_fights_invisible_boss', bf['bossHp'] < 0.9 and bf['secs'] > 5, bf)

    # ---- phone screenshot: copies and frost ----
    ctx2 = new_ctx(b, 'phone', viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ph = ctx2.new_page(); seed(ph); ph.tap('#btnStart'); ph.wait_for_timeout(400)
    ev(ph, START)
    ev(ph, "(() => { const e = __tank.G.boss; e.cool = 99; e.hp = e.maxHp * 0.3; __tank.step(3.6); })()")
    ev(ph, "(() => { const t = __tank, e = t.G.boss, G = t.G; e.gen = null; G.tele.length = 0; e.x = 10 * 48 + 24; e.y = 10 * 48 + 24; G.player.x = 10 * 48 + 24; G.player.y = 16 * 48 + 24; e.kr.frost.fill(0); for (let i = 0; i < 441; i++) if (i % 21 > 11) e.kr.frost[i] = 4; })()")
    ev(ph, "(() => { const t = __tank, e = t.G.boss; e.cool = 99; e.gen = t.BOSS_DEFS.kiragi.attacks.find(a => a.id === 'suret').run(e); e.atkId = 'suret'; e.wait = 0; t.step(1.0); })()")
    ev(ph, "document.getElementById('hint').classList.remove('show'); document.getElementById('banner').classList.remove('show')")
    ph.wait_for_timeout(150); os.makedirs(str(TMP), exist_ok=True); ph.screenshot(path=str(TMP / 'kiragi_p390.png'))
    check('phone_copies_and_frost', ev(ph, "__tank.G.boss.kr.dec.length") == 2)
    ctx2.close(); b.close()

errs = real_errors()
check('no_page_errors', not errs, errs[:3])
print('check_kiragi:', 'FAILED ' + ', '.join(FAILS) if FAILS else 'all ok')
print('ERRORS:', errs or 'none')

sys.exit(1 if FAILS else 0)
