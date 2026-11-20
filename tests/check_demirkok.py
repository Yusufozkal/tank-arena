"""Demirkök and Orman Kalesi (docs/BOSSES.md section 5): arena, intro, shield, turrets, heavy gun, Deprem, Havan, rooting, Demir kökler, Döner ateş, rear weak point, death.
Usage: TANK_TEST_PORT=8800 python3 tests/check_demirkok.py     (phone screenshot in phase 3: .tmp/demir_p390.png)"""
from common import *  # noqa: F401,F403

report_on_exit('check_demirkok', R)
FAILS = []


def check(name, ok, info=None):
    R[name] = info if info is not None else ok
    vprint(('ok   ' if ok else 'FAIL ') + name, info if not ok else '')
    if not ok:
        FAILS.append(name)
        print('FAIL', name, info)


def ev(page, js, arg=None):
    return page.evaluate(js, arg) if arg is not None else page.evaluate(js)


START = "localStorage.setItem('tankArena.seenBossIntro','true'); __tank.G.god = true; __tank.dbg.freeze = true; __tank.wave(20); __tank.bossSkip(); (() => { const e = __tank.G.boss; for (const a of e.def.attacks) e.acd[a.id] = 1e12; })();"
# park the boss at tile (c, r) facing east, the player at tile (pc, pr); attacks off
PLACE = """([c, r, pc, pr]) => { const t = __tank, G = t.G, e = G.boss, p = G.player; e.x = c * 48 + 24; e.y = r * 48 + 24; p.x = pc * 48 + 24; p.y = pr * 48 + 24; p.vx = p.vy = 0;
  e.gen = null; e.atkId = ''; e.cool = 99; for (const a of e.def.attacks) e.acd[a.id] = 1e12; e.stunT = 0; e.angle = e.turret = 0; G.tele.length = 0; G.bullets.length = 0; e.dk.lift = 0; }"""
RUN = "(id) => { const t = __tank, e = t.G.boss; e.gen = t.BOSS_DEFS.demirkok.attacks.find(a => a.id === id).run(e); e.atkId = id; e.wait = 0; }"
# step until the attack ends (or max seconds); returns seconds used
DONE = "(max) => { const t = __tank, e = t.G.boss; let n = 0; while (e.gen && n < max * 60) { t.step(1 / 60); n++; } return n / 60; }"
HIT = "([lx, ly, dir, dmg]) => { const t = __tank, e = t.G.boss, h0 = e.hp; t.hurtBoss(dmg, e.x + lx, e.y + ly, dir); return +(h0 - e.hp).toFixed(3); }"

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = new_ctx(b, 'desktop', viewport={'width': 1000, 'height': 760})
    page = ctx.new_page(); seed(page)
    page.click('#btnStart'); page.wait_for_timeout(300)
    ev(page, "localStorage.removeItem('tankArena.seenBossIntro'); __tank.G.god = true; __tank.dbg.freeze = true; __tank.wave(20)")
    st = ev(page, "__tank.bossInfo()")
    ban = ev(page, "document.getElementById('banner').textContent")
    check('wave20_demirkok_stage', st['phase'] == 'bossIntro' and st['enemies'] == 1 and ev(page, "__tank.G.boss.def.id") == 'demirkok' and 'DEMİRKÖK' in ban, [st['phase'], st['enemies'], ban])
    ev(page, "__tank.step(1.4)")
    check('intro_three_thumps', ev(page, "__tank.G.boss.dk.step") == [True, True, True])
    ev(page, "__tank.step(2)")
    check('intro_ends_in_fight', ev(page, "__tank.G.phase") == 'fight')
    arena = ev(page, """() => { const t = __tank, G = t.G, m = G.map, a = t.ARENAS.kale, pa = t.parseArena(a), gate = a.gate.map(([c, r]) => r * m.n + c), bad = [];
      for (let i = 0; i < pa.n * pa.n; i++) if (!gate.includes(i) && m.t[i] !== pa.t[i]) bad.push(i);
      return { n: m.n, bad, arena: m.arena, theme: m.theme.key, boss: pa.boss, player: pa.player, gate: gate.map(i => m.t[i]), enemies: G.enemies.length }; }""")
    check('arena_kale_matches_text', arena['n'] == 21 and arena['arena'] == 'kale' and not arena['bad'] and arena['boss'] == {'c': 10, 'r': 2} and arena['player'] == {'c': 10, 'r': 18}, arena)
    check('gate_smashed_forest_only_boss', arena['gate'] == [0, 0, 0] and arena['theme'] == 'forest' and arena['enemies'] == 1, arena)
    ev(page, "(() => { const e = __tank.G.boss; e.dk.step = [true, true, true]; })()")

    # ---- shield: half damage while a turret lives, full after both are gone; a broken turret drops a power-up ----
    ev(page, START); ev(page, f"({PLACE})([10, 9, 10, 15])")
    d1 = ev(page, HIT, [46, 0, 0, 10])
    n0 = ev(page, "__tank.G.pickups.length")
    for side in (27, -27):
        ev(page, "(() => { const e = __tank.G.boss; e.invuln = false; })()")
        for _ in range(40):
            ev(page, HIT, [38, side, 0, 10])
            if not ev(page, "__tank.G.boss.parts.find(q => q.oy === " + str(side) + ").alive"):
                break
    alive = ev(page, "__tank.G.boss.parts.map(q => q.alive)")
    n1 = ev(page, "__tank.G.pickups.length")
    d2 = ev(page, HIT, [46, 0, 0, 10])
    check('shield_half_damage_then_full', abs(d1 - 5) < 0.01 and abs(d2 - 10) < 0.01 and alive == [False, False], [d1, d2, alive])
    check('turret_break_drops_powerup', n1 >= n0 + 2, [n0, n1])
    check('turret_hp_12pct', ev(page, "(() => { const e = __tank.G.boss; return e.parts.every(q => q.maxHp === Math.round(e.maxHp * 0.12)); })()"))

    # ---- heavy gun: glow 0.8 s, two big slow shells, one hit breaks a brick ----
    ev(page, START); ev(page, f"({PLACE})([10, 9, 10, 15])"); ev(page, RUN, 'agir')
    ev(page, DONE, 3)
    heavy = ev(page, """() => { const e = __tank.G.boss, l = e.log.filter(x => x.atk === 'agir').pop(), bs = __tank.G.bullets.filter(b => b.heavy);
      return { dur: l && l.dur, n: bs.length, speed: bs[0] ? Math.round(Math.hypot(bs[0].vx, bs[0].vy)) : 0 }; }""")
    check('heavy_glow_0_8s_two_slow_shells', heavy['dur'] is not None and heavy['dur'] >= 0.8 and heavy['n'] == 2 and heavy['speed'] < 250, heavy)
    br = ev(page, """() => { const t = __tank, G = t.G, m = G.map, e = G.boss; G.bullets.length = 0; e.x = 10 * 48 + 24; e.y = 8 * 48 + 24;
      const c = 10, r = 11, i = r * m.n + c; m.t[i] = 1; m.hp[i] = 3; G.player.x = 10 * 48 + 24; G.player.y = 14 * 48 + 24;
      e.angle = e.turret = Math.PI / 2; e.gen = t.BOSS_DEFS.demirkok.attacks.find(a => a.id === 'agir').run(e); e.wait = 0; e.atkId = 'agir';
      let n = 0; while (e.gen && n < 300) { t.step(1 / 60); n++; } for (let k = 0; k < 120 && m.t[i] === 1; k++) t.step(1 / 60); return m.t[i]; }""")
    check('heavy_shell_breaks_brick_in_one_hit', br == 0, br)

    # ---- Deprem: ring 1.2 s, damage inside, nothing behind steel, bricks lose 1 HP ----
    ev(page, START); ev(page, "(() => { const e = __tank.G.boss; e.phase = 1; e.phased = false; })()")
    ev(page, f"({PLACE})([10, 9, 10, 12])")
    qk = ev(page, """() => { const t = __tank, G = t.G, e = G.boss, p = G.player, m = G.map; G.god = false; p.hp = p.maxHp; const h0 = p.hp;
      const bi = 9 * m.n + 14; m.t[bi] = 1; m.hp[bi] = 3; e.gen = t.BOSS_DEFS.demirkok.attacks.find(a => a.id === 'deprem').run(e); e.atkId = 'deprem'; e.wait = 0;
      let n = 0; while (e.gen && n < 400) { t.step(1 / 60); n++; } const l = e.log.filter(x => x.atk === 'deprem').pop();
      return { dur: l && l.dur, hurt: +(h0 - p.hp).toFixed(1), brick: m.hp[bi], moved: Math.round(Math.hypot(p.x - (10 * 48 + 24), p.y - (12 * 48 + 24))) }; }""")
    check('quake_ring_1_2s_damage_knockback', qk['dur'] is not None and qk['dur'] >= 1.2 and qk['hurt'] > 0 and qk['moved'] > 20, qk)
    check('quake_bricks_lose_1hp', qk['brick'] == 2, qk)
    ev(page, f"({PLACE})([10, 9, 10, 12])")
    qs = ev(page, """() => { const t = __tank, G = t.G, e = G.boss, p = G.player, m = G.map; G.god = false; p.hp = p.maxHp; const h0 = p.hp, si = 11 * m.n + 10; m.t[si] = 2;
      e.gen = t.BOSS_DEFS.demirkok.attacks.find(a => a.id === 'deprem').run(e); e.atkId = 'deprem'; e.wait = 0; let n = 0; while (e.gen && n < 400) { t.step(1 / 60); n++; }
      m.t[si] = 0; G.god = true; return +(h0 - p.hp).toFixed(1); }""")
    check('quake_steel_protects', qs == 0, qs)
    check('quake_ring_is_bot_danger', ev(page, """() => { const t = __tank, G = t.G, e = G.boss; G.tele.length = 0; G.tele.push({ kind: 'ring', r: 216, t: 1, dur: 1.2, e }); const r = [t.bossDanger(e.x + 100, e.y, 10), t.bossDanger(e.x + 300, e.y, 10)]; G.tele.length = 0; return r; }""") == [True, False])

    # ---- Havan: five circles for 1.2 s ----
    ev(page, f"({PLACE})([10, 9, 10, 15])"); ev(page, RUN, 'havan')
    hv = ev(page, """() => { const t = __tank, e = t.G.boss; t.step(0.2); const n = t.G.tele.filter(x => x.kind === 'circle').length; let k = 0; while (e.gen && k < 300) { t.step(1 / 60); k++; }
      const l = e.log.filter(x => x.atk === 'havan'); return { n, logs: l.length, min: Math.min(...l.map(x => x.dur)) }; }""")
    check('havan_five_circles_1_2s', hv['n'] == 5 and hv['logs'] == 5 and hv['min'] >= 1.2, hv)

    # ---- phase 3: walks to the centre and roots ----
    ev(page, START); ev(page, f"({PLACE})([10, 3, 10, 18])")
    ev(page, "(() => { const e = __tank.G.boss; e.cool = 0.5; e.acd.kok = 0; e.hp = e.maxHp * 0.3; })()")
    ev(page, "__tank.step(1.7)")
    r3 = ev(page, """() => { const t = __tank, G = t.G, e = G.boss; let n = 0; while (!e.rooted && n < 60 * 40) { t.step(1 / 60); n++; }
      return { rooted: e.rooted, phase: e.phase, dx: Math.round(e.x - 504), dy: Math.round(e.y - 504), secs: +(n / 60).toFixed(1) }; }""")
    check('phase3_roots_at_centre', r3['rooted'] and r3['phase'] == 2 and abs(r3['dx']) < 12 and abs(r3['dy']) < 12, r3)
    mv = ev(page, "(() => { const t = __tank, e = t.G.boss; t.step(3); return Math.hypot(e.x - 504, e.y - 504); })()")
    check('rooted_does_not_move', mv < 12, mv)

    # ---- Demir kökler: red line >= 1 s, steel for 8 s, blocks movement and path finding, pushes the player off, visible on the minimap ----
    ev(page, "(() => { const e = __tank.G.boss; e.gen = null; e.cool = 99; __tank.G.tele.length = 0; __tank.G.bullets.length = 0; })()")
    ev(page, "(() => { const G = __tank.G, p = G.player; p.x = 504; p.y = 504 + 48 * 4; G.god = false; p.hp = p.maxHp; })()")
    ev(page, RUN, 'koker')
    rt = ev(page, """() => { const t = __tank, G = t.G, e = G.boss, p = G.player, m = G.map; t.step(0.1); const tl = G.tele.find(x => x.kind === 'line'); if (!tl) return { err: 'no line' };
      const tiles0 = Array.from(m.t); p.x = e.x + Math.cos(tl.a) * 120; p.y = e.y + Math.sin(tl.a) * 120; p.vx = p.vy = 0; const h0 = p.hp;
      t.step(1.2); const steel = []; for (let i = 0; i < m.n * m.n; i++) if (m.t[i] === 2 && tiles0[i] !== 2) steel.push(i);
      const l = e.log.filter(x => x.atk === 'kok'); const onSteel = m.at(p.x, p.y) === 2;
      return { lines: l.length, lineMin: Math.min(...l.map(x => x.dur)), steel: steel.length, hurt: +(h0 - p.hp).toFixed(1), onSteel, tiles0: null, first: steel[0], n: m.n }; }""")
    check('roots_red_line_then_steel', 'err' not in rt and rt['lineMin'] >= 1.0 and 4 <= rt['steel'] <= 18 and rt['lines'] >= 2, rt)
    check('roots_push_player_off_with_damage', rt.get('hurt', 0) > 0 and not rt.get('onSteel', True), rt)
    blk = ev(page, """() => { const t = __tank, G = t.G, e = G.boss, p = G.player, m = G.map, n = m.n; let ci = -1;
      for (let i = 0; i < n * n; i++) if (e.dk.roots.some(q => q.r * n + q.c === i)) { ci = i; break; } const c = ci % n, r = (ci - c) / n;
      const cv = document.createElement('canvas'); cv.width = cv.height = n; const cg = cv.getContext('2d', { willReadFrequently: true }); cg.drawImage(m.mini, 0, 0);
      const mini = Array.from(cg.getImageData(c, r, 1, 1).data).join(','); const ref = Array.from(cg.getImageData(0, 10, 1, 1).data).join(',');
      m.flowDirty = true; t.step(0.5); const flowBlocked = m.flow[ci] > 1e8 && m.flowFrom >= 0;
      // walk into the root from a free neighbour
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => m.get(c + dx, r + dy) === 0 && !e.dk.roots.some(q => q.c === c + dx && q.r === r + dy));
      p.x = (c + nb[0]) * 48 + 24; p.y = (r + nb[1]) * 48 + 24; for (let k = 0; k < 60; k++) { p.vx = -nb[0] * 200; p.vy = -nb[1] * 200; t.step(1 / 60); }
      const inside = Math.floor(p.x / 48) === c && Math.floor(p.y / 48) === r;
      return { mini, ref, flowBlocked, inside, nroots: e.dk.roots.length }; }""")
    check('roots_block_movement_and_pathfinding', blk['flowBlocked'] and not blk['inside'], blk)
    check('roots_visible_on_minimap', blk['mini'] != blk['ref'], blk)
    gone = ev(page, """() => { const t = __tank, G = t.G, e = G.boss, m = G.map, pa = t.parseArena(t.ARENAS.kale), gate = t.ARENAS.kale.gate.map(([c, r]) => r * m.n + c); G.god = true; t.step(8.5); let bad = 0;
      for (let i = 0; i < m.n * m.n; i++) if (!gate.includes(i) && m.t[i] !== pa.t[i] && !(pa.t[i] === 1)) bad++; return { roots: e.dk.roots.length, bad }; }""")
    check('roots_vanish_after_8s', gone['roots'] == 0 and gone['bad'] == 0, gone)

    # ---- Döner ateş: sweep line 1 s ahead, stream follows, a full circle ----
    ev(page, "(() => { const e = __tank.G.boss; e.gen = null; e.cool = 99; __tank.G.tele.length = 0; __tank.G.bullets.length = 0; __tank.G.player.x = 504; __tank.G.player.y = 504 + 48 * 6; })()")
    ev(page, RUN, 'doner')
    sw = ev(page, """() => { const t = __tank, G = t.G, e = G.boss; let n = 0, firstLead = null, shots = 0, ang0 = null, total = 0, last = null, tick = 0;
      while (e.gen && n < 60 * 14) { t.step(1 / 60); n++; const s = e.dk.sw;
        if (s && s.fired) { if (firstLead === null) { firstLead = Math.abs(s.lead - s.bar); ang0 = s.bar; } }
        if (s && s.fired) { if (last !== null) total += Math.abs(s.bar - last); last = s.bar; } G.bullets.length = Math.min(G.bullets.length, 400); }
      const l = e.log.filter(x => x.atk === 'doner').pop(); return { dur: l && l.dur, lead: firstLead, total: +total.toFixed(2), secs: +(n / 60).toFixed(1) }; }""")
    check('sweep_line_1s_ahead_full_circle', sw['dur'] is not None and sw['dur'] >= 1.0 and sw['lead'] is not None and abs(sw['lead'] - 1.1) < 0.05 and abs(sw['total'] - 6.28) < 0.3, sw)
    shots = ev(page, """() => { const t = __tank, G = t.G, e = G.boss; G.bullets.length = 0; G.player.y = 504 + 48 * 6; e.gen = t.BOSS_DEFS.demirkok.attacks.find(a => a.id === 'doner').run(e); e.atkId = 'doner'; e.wait = 0;
      let n = 0, fired = 0, maxB = 0; const seen = new Set(); while (e.gen && n < 60 * 4) { t.step(1 / 60); n++; for (const b of G.bullets) if (b.owner === 1) seen.add(b); } return seen.size; }""")
    check('sweep_continuous_stream', shots > 20, shots)
    sd = ev(page, """() => { const t = __tank, G = t.G, e = G.boss; e.dk.sw = { a0: 0, W: 1.1, t: 1.5, lead: 2.1, bar: 1.0, end: 8, fired: true }; const a = 1.5708, r = [t.bossDanger(e.x + Math.cos(a) * 200, e.y + Math.sin(a) * 200, 10), t.bossDanger(e.x + Math.cos(a + 3) * 200, e.y + Math.sin(a + 3) * 200, 10)];
      e.dk.sw = null; return r; }""")
    check('sweep_is_bot_danger', sd == [True, False], sd)

    # ---- rear weak point: x1.5 while rooted, front unchanged; steel between blocks the danger ----
    ev(page, "(() => { const e = __tank.G.boss; e.parts.forEach(q => { q.alive = false; }); e.gen = null; e.cool = 99; e.angle = e.turret = 0; e.invuln = false; e.hp = e.maxHp * 0.3; })()")
    rear = ev(page, HIT, [-46, 0, 3.14159265, 10]); front = ev(page, HIT, [46, 0, 0, 10])
    ev(page, "(() => { __tank.G.boss.rooted = false; })()"); unrooted = ev(page, HIT, [-46, 0, 3.14159265, 10]); ev(page, "(() => { __tank.G.boss.rooted = true; })()")
    check('rear_hit_1_5x_while_rooted', abs(rear - 15) < 0.01 and abs(front - 10) < 0.01 and abs(unrooted - 10) < 0.01, [rear, front, unrooted])

    # ---- death ----
    ev(page, "(() => { const G = __tank.G, e = G.boss; G.god = true; e.dk.roots.length || null; e.hp = 5; })()")
    ev(page, "(() => { const t = __tank, G = t.G, e = G.boss, m = G.map; e.cool = 99; e.dk.roots.push({ c: 7, r: 10, t: 0, orig: 0, seed: 1 }); m.t[10 * 21 + 7] = 2; t.hurtBoss(20, e.x - 46, e.y, Math.PI); })()")
    ev(page, "__tank.step(1)")
    ban = ev(page, "document.getElementById('banner').textContent")
    ev(page, "__tank.step(0.8)")
    mid = ev(page, "(() => { const e = __tank.G.boss; return { dying: e ? e.dying : 'gone', tile: __tank.G.map.t[10 * 21 + 7] }; })()")
    ev(page, "__tank.step(3)")
    after = ev(page, "(() => { const G = __tank.G; return { phase: G.phase, hp: G.player.hp, max: G.player.maxHp, boss: !!G.boss && !G.boss.dead }; })()")
    check('death_text_roots_dissolve', 'DEMİRKÖK DEVRİLDİ' in ban and mid['tile'] == 0, [ban, mid])
    check('death_armour_full_loot', after['hp'] == after['max'] and after['phase'] == 'upgrade', after)

    # ---- phone screenshot: phase 3 with roots and the sweep line ----
    ctx2 = new_ctx(b, 'phone', viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ph = ctx2.new_page(); seed(ph); ph.tap('#btnStart'); ph.wait_for_timeout(400)
    ev(ph, START)
    ev(ph, "(() => { const e = __tank.G.boss; e.hp = e.maxHp * 0.3; e.cool = 0.2; e.acd.kok = 0; })()")
    ev(ph, "(() => { const t = __tank, e = t.G.boss; let n = 0; while (!e.rooted && n < 3000) { t.step(1 / 30); n++; } e.cool = 99; e.gen = null; t.G.tele.length = 0; })()")
    ev(ph, "(() => { const t = __tank, e = t.G.boss; e.gen = t.BOSS_DEFS.demirkok.attacks.find(a => a.id === 'koker').run(e); e.atkId = 'koker'; e.wait = 0; let n = 0; while (e.gen && n < 300) { t.step(1 / 30); n++; } })()")
    got = ev(ph, "(() => { const t = __tank, e = t.G.boss; e.cool = 99; e.gen = t.BOSS_DEFS.demirkok.attacks.find(a => a.id === 'doner').run(e); e.atkId = 'doner'; e.wait = 0; for (let k = 0; k < 75; k++) t.step(1 / 30); return [e.dk.roots.length, !!e.dk.sw]; })()")
    ev(ph, "document.getElementById('hint').classList.remove('show'); document.getElementById('banner').classList.remove('show')")
    ph.wait_for_timeout(150); os.makedirs(str(TMP), exist_ok=True); ph.screenshot(path=str(TMP / 'demir_p390.png'))
    check('phone_roots_and_sweep', got[0] >= 4 and got[1], got)
    ctx2.close(); b.close()

errs = real_errors()
check('no_page_errors', not errs, errs[:3])
print('check_demirkok:', 'FAILED ' + ', '.join(FAILS) if FAILS else 'all ok')
print('ERRORS:', errs or 'none')

sys.exit(1 if FAILS else 0)
