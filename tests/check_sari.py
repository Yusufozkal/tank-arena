"""Sarı Fırtına and Kum Çukuru (docs/BOSSES.md section 4): arena, charge lines, stun, sand strips, wind, phases, death, evolution.
Usage: TANK_TEST_PORT=8880 python3 tests/check_sari.py     (phone screenshot with a charge line: .tmp/sari_p390.png)"""
from common import *  # noqa: F401,F403

report_on_exit('check_sari', R)
FAILS = []


def check(name, ok, info=None):
    R[name] = info if info is not None else ok
    vprint(('ok   ' if ok else 'FAIL ') + name, info if not ok else '')
    if not ok:
        FAILS.append(name)
        print('FAIL', name, info)


def ev(page, js):
    return page.evaluate(js)


START = "localStorage.setItem('tankArena.seenBossIntro','true'); __tank.G.god = true; __tank.dbg.freeze = true; __tank.wave(10); __tank.bossSkip();"
# park the boss at tile (c, r) facing the player at tile (pc, pr), attacks off (cool high)
PLACE = """([c, r, pc, pr]) => { const t = __tank, G = t.G, e = G.boss, p = G.player; e.x = c * 48 + 24; e.y = r * 48 + 24; p.x = pc * 48 + 24; p.y = pr * 48 + 24; p.vx = p.vy = 0;
  e.gen = null; e.atkId = ''; e.cool = 99; e.stunT = 0; e.angle = Math.atan2(p.y - e.y, p.x - e.x); G.tele.length = 0; G.bullets.length = 0; }"""
STUNWAIT = "() => { const t = __tank, e = t.G.boss; let n = 0; while (n < 400 && !(e.stunT > 0)) { t.step(1 / 60); n++; } return { stun: +e.stunT.toFixed(2), y: Math.round(e.y / 48 * 10) / 10 }; }"
RUSH = "() => { const e = __tank.G.boss; e.gen = __tank.BOSS_DEFS.sari.attacks.find(a => a.id === 'hucum').run(e); e.atkId = 'hucum'; e.wait = 0; }"

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = new_ctx(b, 'desktop', viewport={'width': 1000, 'height': 760})
    page = ctx.new_page(); seed(page)
    page.click('#btnStart'); page.wait_for_timeout(300)
    ev(page, "localStorage.removeItem('tankArena.seenBossIntro'); __tank.G.god = true; __tank.dbg.freeze = true; __tank.wave(10)")
    st = ev(page, "__tank.bossInfo()")
    check('wave10_sari_stage', st['phase'] == 'bossIntro' and st['enemies'] == 1 and ev(page, "__tank.G.boss.def.id") == 'sari', st)
    ev(page, "__tank.step(3.3)")
    check('intro_ends_in_fight', ev(page, "__tank.G.phase") == 'fight')
    arena = ev(page, """() => { const t = __tank, G = t.G, m = G.map, a = t.ARENAS.kum, pa = t.parseArena(a), gate = a.gate.map(([c, r]) => r * m.n + c), bad = [];
      for (let i = 0; i < pa.n * pa.n; i++) if (!gate.includes(i) && m.t[i] !== pa.t[i]) bad.push(i);
      return { n: m.n, bad, arena: m.arena, theme: m.theme.key, boss: pa.boss, player: pa.player, gate: a.gate.map(([c, r]) => m.t[r * m.n + c]), enemies: G.enemies.length, hp: G.boss.maxHp }; }""")
    check('arena_kum_matches_text', arena['n'] == 21 and arena['arena'] == 'kum' and not arena['bad'] and arena['boss'] == {'c': 10, 'r': 2} and arena['player'] == {'c': 10, 'r': 19}, arena)
    check('gate_smashed_in_intro', arena['gate'] == [0, 0, 0] and arena['theme'] == 'desert' and arena['enemies'] == 1, arena)

    # ---- charge lines: first two 1.3 s, later 1 s, last 0.3 s locked ----
    ev(page, START)
    ev(page, "(() => { const e = __tank.G.boss; e.sari.chargeN = 0; })()")
    res = []
    for i in range(4):
        ev(page, f"({PLACE})([10, 6, 10, 15])"); ev(page, f"({RUSH})()")
        r = ev(page, """() => { const t = __tank, G = t.G, e = G.boss; let n = 0, lockA = null, moved = 0, a0 = null, x0 = e.x, y0 = e.y;
          while (n < 600 && e.gen) { t.step(1 / 60); n++; const tl = G.tele.find(x => x.kind === 'line');
            if (tl && tl.t >= tl.dur - tl.lock - 0.02) { if (a0 === null) a0 = tl.a; lockA = tl.a; } if (e.stunT > 0) break; }
          const l = e.log.filter(x => x.atk === 'hucum').pop(); return { dur: l.dur, locked: a0 === null || Math.abs(lockA - a0) < 1e-6, stun: +e.stunT.toFixed(2) }; }""")
        res.append(r)
    check('line_first_two_1_3s', all(x['dur'] >= 1.3 for x in res[:2]), res)
    check('line_later_1s', all(1.0 <= x['dur'] < 1.3 for x in res[2:]), res)
    check('line_locked_last_0_3s', all(x['locked'] for x in res), res)

    # ---- steel stuns 2.5 s (1.8 s in phase 3); open ground does not ----
    ev(page, f"({PLACE})([10, 6, 10, 15])"); ev(page, f"({RUSH})()")
    s1 = ev(page, STUNWAIT)
    check('steel_stun_2_5s', 2.4 <= s1['stun'] <= 2.5 and s1['y'] < 10, s1)
    ev(page, "(() => { const e = __tank.G.boss; e.phase = 2; })()")
    ev(page, f"({PLACE})([10, 6, 10, 15])"); ev(page, f"({RUSH})()")
    s3 = ev(page, STUNWAIT)['stun']
    check('steel_stun_1_8s_phase3', 1.7 <= s3 <= 1.8, s3)
    ev(page, "(() => { const e = __tank.G.boss; e.phase = 0; e.stunT = 0; e.sari.wind.st = 'idle'; })()")

    # ---- sand strip: slows 35% for 4 s ----
    ev(page, START); ev(page, f"({PLACE})([2, 3, 10, 15])")
    sl = ev(page, """() => { const t = __tank, G = t.G, e = G.boss, p = G.player, S = e.sari;
      const run = () => { p.x = 10 * 48 + 24; p.y = 15 * 48 + 24; p.vx = 150; p.vy = 0; p.angle = 0; const x0 = p.x; t.step(1 / 60); return p.x - x0; };
      S.sand.length = 0; const free = run();
      S.sand.push({ x1: 300, y1: 15 * 48 + 24, x2: 700, y2: 15 * 48 + 24, w: 64, t: 0 }); const slow = run();
      p.x = 10 * 48 + 24; p.y = 15 * 48 + 24; const mid = (t.step(3.9), S.sand.length); t.step(0.3); const gone = S.sand.length; const after = run();
      return { free, slow, ratio: slow / free, mid, gone, after: after / free }; }""")
    check('sand_slows_35pct', abs(sl['ratio'] - 0.65) < 0.05, sl)
    check('sand_lasts_4s', sl['mid'] == 1 and sl['gone'] == 0 and abs(sl['after'] - 1) < 0.05, sl)
    ev(page, f"({PLACE})([2, 3, 10, 15])")
    check('sand_is_bot_danger', ev(page, "(() => { const e = __tank.G.boss; e.sari.sand.push({ x1: 300, y1: 700, x2: 600, y2: 700, w: 64, t: 0 }); return [__tank.bossDanger(450, 700, 10), __tank.bossDanger(450, 500, 10)]; })()") == [True, False])
    ev(page, "__tank.G.boss.sari.sand.length = 0")

    # ---- phase 2 charge leaves a strip ----
    ev(page, "(() => { const e = __tank.G.boss; e.phase = 1; })()")
    ev(page, f"({PLACE})([10, 6, 10, 15])"); ev(page, f"({RUSH})()"); ev(page, "__tank.step(1.6)")
    check('phase2_charge_leaves_sand', ev(page, "__tank.G.boss.sari.sand.length") >= 1)
    ev(page, "(() => { const e = __tank.G.boss; e.phase = 0; e.sari.sand.length = 0; })()")

    # ---- wind: arrows 1.5 s before the push, then 5 s ----
    ev(page, START); ev(page, "(() => { const e = __tank.G.boss; e.phase = 2; e.sari.windT = 0.05; e.cool = 99; })()")
    wd = ev(page, """() => { const t = __tank, G = t.G, e = G.boss, p = G.player, W = e.sari.wind; p.x = 10 * 48 + 24; p.y = 15 * 48 + 24; const out = { warn: null, blow: null, end: null, push: 0 };
      let n = 0, x0 = p.x, y0 = p.y;
      while (n < 900) { t.step(1 / 60); n++; const tm = n / 60; if (W.st === 'warn' && out.warn === null) { out.warn = tm; W.a = Math.PI; }
        if (W.st === 'blow' && out.blow === null) { out.blow = tm; x0 = p.x; y0 = p.y; out.pushBefore = Math.hypot(p.x - 10 * 48 - 24, p.y - 15 * 48 - 24); }
        if (out.blow !== null && W.st === 'idle') { out.end = tm; out.push = Math.hypot(p.x - x0, p.y - y0); break; } }
      return out; }""")
    check('wind_arrows_then_push', wd['warn'] is not None and wd['blow'] - wd['warn'] > 1.45 and wd['blow'] - wd['warn'] < 1.65 and 4.9 < wd['end'] - wd['blow'] < 5.2 and wd['pushBefore'] < 3, wd)
    check('wind_pushes_tanks', wd['push'] > 100, wd)

    # ---- phases ----
    ev(page, START)
    ph = ev(page, """() => { const t = __tank, G = t.G, e = G.boss, out = {}; const rep = () => G.pickups.filter(k => k.kind === 'repair').length; e.cool = 99;
      e.hp = e.maxHp * 0.65; const r0 = rep(); t.step(1 / 60); out.phase = e.phase; out.trans = e.trans; out.invuln = e.invuln; out.rep = rep() - r0; out.spd = e.speedMul;
      const hp = e.hp; t.hurtBoss(5); out.held = e.hp === hp; t.step(1.6); out.after = e.invuln;
      e.hp = e.maxHp * 0.32; t.step(1 / 60); out.phase2 = e.phase; out.rep2 = rep() - r0; out.trans2 = e.trans; return out; }""")
    check('phase_66_invuln_kit', ph['phase'] == 1 and ph['trans'] > 1.4 and ph['invuln'] and ph['rep'] == 1 and ph['held'] and not ph['after'] and abs(ph['spd'] - 1.15) < 0.01, ph)
    check('phase_33', ph['phase2'] == 2 and ph['rep2'] == 2 and ph['trans2'] > 1.4, ph)
    check('no_parts', ev(page, "__tank.G.boss.parts.length") == 0)
    ev(page, "__tank.step(1.6)")
    sx = ev(page, "(() => { const t = __tank, e = t.G.boss; e.stunT = 1; const h = e.hp; t.hurtBoss(1); return +(h - e.hp).toFixed(2); })()")
    check('stun_bonus_50pct', abs(sx - 1.5) < 0.05, sx)

    # ---- bot hazards: attacks used, all warned long enough ----
    ev(page, START); ev(page, "__tank.dbg.freeze = false")
    ev(page, "(() => { const t = __tank, e = t.G.boss; window.__lg = []; const L = () => { window.__lg = window.__lg.concat(e.log.slice(window.__lg.length)); }; t.G.player.maxHp = 9999; t.G.player.hp = 9999; for (let i = 0; i < 160 && !e.dead; i++) { t.sim(1, true); L(); if (i === 30) e.hp = e.maxHp * 0.6; if (i === 60) e.hp = e.maxHp * 0.3; if (e.hp < e.maxHp * 0.1) e.hp = e.maxHp * 0.1; } })()")
    ev(page, "__tank.dbg.freeze = true")
    lg = ev(page, "window.__lg")
    kinds = sorted({x['atk'] for x in lg}); short = [x for x in lg if x['dur'] + 0.002 < x['min']]
    check('attacks_seen_and_warned', not short and {'cevik', 'hucum'} <= set(kinds) and len(lg) > 12, {'kinds': kinds, 'n': len(lg), 'short': short[:2]})

    # ---- death: text, armour full, second evolution ----
    ev(page, "__tank.G.noEvo = false; __tank.G.tank = 'ikiz'; __tank.setTank('ikiz'); __tank.dbg.freeze = true; __tank.wave(10); __tank.bossSkip(); (() => { const G = __tank.G; G.god = false; G.player.hp = 12; const e = G.boss; e.hp = 0.5; __tank.hurtBoss(5); })()")
    ev(page, "__tank.step(1)")
    ban = ev(page, "document.getElementById('banner').textContent")
    ev(page, "__tank.step(1.6)")
    mid = ev(page, "(() => { const e = __tank.G.boss; return { dying: e ? e.dying : 'gone', boom: e ? e.sari.boom : 'gone' }; })()")
    ev(page, "__tank.step(3)")
    after = ev(page, "(() => { const G = __tank.G; return { phase: G.phase, mode: G.upMode, hp: G.player.hp, max: G.player.maxHp }; })()")
    check('death_text', 'SARI FIRTINA DİNDİ' in ban, ban)
    check('death_big_boom', mid['dying'] is True and mid['boom'] is True or mid['dying'] == 'gone', mid)
    check('death_armour_full_evolution', after['hp'] == after['max'] and after['phase'] == 'upgrade' and after['mode'] == 'evo', after)

    # ---- phone screenshot ----
    ctx2 = new_ctx(b, 'phone', viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ph2 = ctx2.new_page(); seed(ph2); ph2.tap('#btnStart'); ph2.wait_for_timeout(400)
    ev(ph2, START)
    got = ev(ph2, """() => { const t = __tank, G = t.G, e = G.boss; e.cool = 0; let n = 0;
      while (n < 3000 && !G.tele.some(x => x.kind === 'line')) { t.step(1 / 30); n++; } for (let k = 0; k < 12; k++) t.step(1 / 30); return G.tele.map(x => x.kind); }""")
    ev(ph2, "document.getElementById('hint').classList.remove('show'); document.getElementById('banner').classList.remove('show')")
    ph2.wait_for_timeout(120); os.makedirs(str(TMP), exist_ok=True); ph2.screenshot(path=str(TMP / 'sari_p390.png'))
    check('phone_line_visible', 'line' in got, got)
    ctx2.close(); b.close()

errs = real_errors()
check('no_page_errors', not errs, errs[:3])
print('check_sari:', 'FAILED ' + ', '.join(FAILS) if FAILS else 'all ok')
print('ERRORS:', errs or 'none')
