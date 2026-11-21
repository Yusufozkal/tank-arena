"""Demirkök, the iron fortress, and Orman Kalesi (docs/BOSSES.md section 5): arena, intro, planted mevzi (no charge, no chase, no havan), rolling between mevzi over open ground, shield, independent turret aims,
heavy gun, Deprem, Kök fışkırması (crack line 1 s, root wall that blocks then vanishes, never on the player, the rear always reachable), phase 3 centre plant and 1.5x rear, Döner ateş, second loop, death.
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

    # ---- no charge, no havan: the attack list ----
    ids = ev(page, "__tank.BOSS_DEFS.demirkok.attacks.map(a => a.id)")
    check('no_charge_no_havan_attacks', 'ezme' not in ids and 'havan' not in ids and 'fisk' in ids and 'tasin' in ids, ids)

    # ---- planted at a mevzi, then rolls (open ground only, no heavy gun while rolling, no brick crushed) ----
    ev(page, "localStorage.setItem('tankArena.seenBossIntro','true'); __tank.G.god = true; __tank.dbg.freeze = true; __tank.wave(20); __tank.bossSkip();")
    pl = ev(page, """() => { const t = __tank, G = t.G, e = G.boss, m = G.map, p = G.player, MV = [[10, 2], [4, 10], [16, 10]]; p.x = 10 * 48 + 24; p.y = 18 * 48 + 24;
      const x0 = e.x, y0 = e.y; let n = 0, tWalk = null, tPlant = null, drift = 0, wasWalk = false, heavyWalk = 0, onWall = 0, ezme = 0, arrive = null, px = e.x, py = e.y, pt0 = 0;
      while (n < 60 * 60 && !(arrive && !e.gen)) { p.hp = p.maxHp; e.hp = e.maxHp; t.step(1 / 60); n++; const w = e.dk.walk;
        if (e.atkId === 'ezme' || e.atkId === 'havan') ezme++;
        if (w && e.atkId === 'agir') heavyWalk++;
        const v = m.at(e.x, e.y); if (v !== 0 && v !== 4 && v !== undefined && ![0, 4].includes(v)) onWall++;
        if (!w && !wasWalk && tWalk === null) drift = Math.max(drift, Math.hypot(e.x - x0, e.y - y0));
        if (w && !wasWalk && tWalk === null) tWalk = n / 60;
        if (!w && wasWalk) { arrive = { t: n / 60, x: e.x, y: e.y }; }
        wasWalk = w; }
      const best = arrive ? MV.map(([c, r]) => Math.hypot(arrive.x - (c * 48 + 24), arrive.y - (r * 48 + 24))) : [999];
      return { tWalk, drift: +drift.toFixed(1), heavyWalk, onWall, ezme, arrive: arrive && { t: arrive.t, at: e.dk.at, dist: Math.round(Math.min(...best)) }, n }; }""")
    check('planted_8_10s_no_chase', pl['tWalk'] is not None and 7.5 <= pl['tWalk'] <= 16 and pl['drift'] < 10, pl)
    check('rolls_to_other_mevzi_open_ground', pl['arrive'] is not None and pl['arrive']['at'] in (1, 2) and pl['arrive']['dist'] < 12 and pl['onWall'] == 0, pl)
    check('no_heavy_gun_while_rolling_no_charge', pl['heavyWalk'] == 0 and pl['ezme'] == 0, pl)
    rl = ev(page, """() => { const t = __tank, G = t.G, e = G.boss, m = G.map, p = G.player, MV = [[10, 2], [4, 10], [16, 10]], out = []; p.x = 10 * 48 + 24; p.y = 19 * 48 + 24;
      const bricks0 = (() => { let k = 0; for (let i = 0; i < m.n * m.n; i++) if (m.t[i] === 1) k++; return k; })();
      for (let k = 0; k < 12; k++) { e.gen = null; e.atkId = ''; e.cool = 99; G.tele.length = 0; G.bullets.length = 0; e.dk.plantT = 0; e.hp = e.maxHp; const from = e.dk.at;
        e.gen = t.BOSS_DEFS.demirkok.attacks.find(a => a.id === 'tasin').run(e); e.atkId = 'tasin'; e.wait = 0; let n = 0, wall = 0, sp = 0, lx = e.x, ly = e.y, path = 0; const hv0 = e.log.filter(x => x.atk === 'agir').length;
        while (e.gen && n < 60 * 45) { p.hp = p.maxHp; e.hp = e.maxHp; t.step(1 / 60); n++; const v = m.at(e.x, e.y); if (v !== 0 && v !== 4) wall++; path += Math.hypot(e.x - lx, e.y - ly); lx = e.x; ly = e.y; }
        sp = path / Math.max(1, n / 60);
        const best = Math.min(...MV.map(([c, r]) => Math.hypot(e.x - (c * 48 + 24), e.y - (r * 48 + 24))));
        out.push({ from, to: e.dk.at, secs: +(n / 60).toFixed(1), dist: Math.round(best), wall, sp: Math.round(sp), heavy: e.log.filter(x => x.atk === 'agir').length - hv0 }); }
      let bricks1 = 0; for (let i = 0; i < m.n * m.n; i++) if (m.t[i] === 1) bricks1++;
      return { out, bricks0, bricks1 }; }""")
    ok_roll = all(r['to'] in (0, 1, 2) and r['to'] != r['from'] and r['dist'] < 12 and r['secs'] < 40 and r['wall'] == 0 and 25 < r['sp'] < 62 and r['heavy'] == 0 for r in rl['out'])
    check('rolls_all_mevzi_pairs_reach_slowly', ok_roll and rl['bricks1'] >= rl['bricks0'] - 4 and len({(r['from'], r['to']) for r in rl['out']}) >= 3, rl)

    # ---- independent turret aims: one straight at the player, one leading their movement, each with its own red eye (0.45 s) ----
    ev(page, START); ev(page, f"({PLACE})([10, 9, 10, 15])")
    ta = ev(page, """() => { const t = __tank, G = t.G, e = G.boss, p = G.player; e.gen = t.BOSS_DEFS.demirkok.attacks.find(a => a.id === 'taret').run(e); e.atkId = 'taret'; e.wait = 0;
      let n = 0, both = 0, maxGlow = 0; const dev = { tl: [], tr: [] }, shells = [];
      while (e.gen && n < 60 * 14) { p.vx = 240; p.vy = 0; t.step(1 / 60); n++; const gl = G.tele.filter(x => x.kind === 'glow'); maxGlow = Math.max(maxGlow, gl.length); if (gl.length === 2) both++;
        for (const pt of e.parts) if (pt.alive && pt.eye > 0.8) { const ca = Math.cos(e.angle), sa = Math.sin(e.angle), x = e.x + ca * pt.ox - sa * pt.oy, y = e.y + sa * pt.ox + ca * pt.oy;
          dev[pt.id].push(Math.abs(Math.atan2(Math.sin(pt.aim - Math.atan2(p.y - y, p.x - x)), Math.cos(pt.aim - Math.atan2(p.y - y, p.x - x))))); }
        G.bullets.length = Math.min(G.bullets.length, 0); }
      const l = e.log.filter(x => x.atk === 'taret'), avg = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : -1;
      return { logs: l.length, minDur: Math.min(...l.map(x => x.dur)), both, maxGlow, devTl: +avg(dev.tl).toFixed(3), devTr: +avg(dev.tr).toFixed(3), secs: +(n / 60).toFixed(1) }; }""")
    check('turret_eyes_0_45s_each_overlapping', ta['logs'] >= 8 and ta['minDur'] >= 0.45 and ta['maxGlow'] == 2 and ta['both'] > 5, ta)
    check('turret_aims_independent_direct_and_lead', 0 <= ta['devTl'] < 0.06 and ta['devTr'] > 0.12, ta)

    # ---- Deprem: ring 1.2 s, damage inside, nothing behind steel, bricks lose 1 HP (planted) ----
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
    check('quake_only_while_planted', ev(page, "(() => { const e = __tank.G.boss; e.dk.walk = false; const a = e.def.attacks.find(x => x.id === 'deprem'); e.phase = 1; e.distP = 100; return a.ok(e) && !e.def.attacks.some(x => x.id === 'deprem' && x.mov); })()"))
    check('quake_ring_is_bot_danger', ev(page, """() => { const t = __tank, G = t.G, e = G.boss; G.tele.length = 0; G.tele.push({ kind: 'ring', r: 216, t: 1, dur: 1.2, e }); const r = [t.bossDanger(e.x + 100, e.y, 10), t.bossDanger(e.x + 300, e.y, 10)]; G.tele.length = 0; return r; }""") == [True, False])

    # ---- Kök fışkırması: crack line 1 s toward the player, roots erupt (damage once), steel-root wall for ~6 s that blocks tanks and bullets ----
    ev(page, START); ev(page, "(() => { const e = __tank.G.boss; e.phase = 1; e.phased = false; })()")
    ev(page, f"({PLACE})([10, 9, 10, 15])"); ev(page, RUN, 'fisk')
    ck = ev(page, """() => { const t = __tank, G = t.G, e = G.boss, p = G.player, m = G.map; t.step(0.1); const tl = G.tele.filter(x => x.kind === 'line'); if (!tl.length) return { err: 'no line' };
      const a0 = tl[0].a, want = Math.atan2(p.y - e.y, p.x - e.x), fromBoss = Math.hypot(tl[0].x - e.x, tl[0].y - e.y), crack = !!tl[0].crack, len = tl[0].len, w = tl[0].w;
      const tiles0 = Array.from(m.t); let n = 0; while (e.gen && n < 60 * 3 && !e.log.some(x => x.atk === 'fisk')) { t.step(1 / 60); n++; }
      const l = e.log.filter(x => x.atk === 'fisk'), steel = []; for (let i = 0; i < m.n * m.n; i++) if (m.t[i] === 2 && tiles0[i] !== 2) steel.push(i);
      const life = e.dk.roots.map(q => q.life), minDur = Math.min(...l.map(x => x.dur));
      return { n: tl.length, angOff: +Math.abs(a0 - want).toFixed(3), fromBoss, crack, len: Math.round(len), w: Math.round(w), logs: l.length, minDur, steel: steel.length, life: life[0], first: steel[0], n2: m.n }; }""")
    check('crack_line_1s_toward_player', 'err' not in ck and ck['n'] == 1 and ck['crack'] and ck['fromBoss'] < 1 and ck['angOff'] < 0.3 and ck['logs'] == 1 and ck['minDur'] >= 1.0, ck)
    check('roots_erupt_into_wall_life_6s', ck.get('steel', 0) >= 3 and ck.get('steel', 99) <= 6 and ck.get('life') == 6, ck)
    ev(page, DONE, 3)
    blk = ev(page, """() => { const t = __tank, G = t.G, e = G.boss, p = G.player, m = G.map, n = m.n; const q0 = e.dk.roots[0]; const c = q0.c, r = q0.r, ci = r * n + c;
      const cv = document.createElement('canvas'); cv.width = cv.height = n; const cg = cv.getContext('2d', { willReadFrequently: true }); cg.drawImage(m.mini, 0, 0);
      const mini = Array.from(cg.getImageData(c, r, 1, 1).data).join(','), ref = Array.from(cg.getImageData(0, 10, 1, 1).data).join(',');
      m.flowDirty = true; t.step(0.5); const flowBlocked = m.flow[ci] > 1e8 && m.flowFrom >= 0;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => m.get(c + dx, r + dy) === 0 && !e.dk.roots.some(q => q.c === c + dx && q.r === r + dy));
      const sp = { x: p.x, y: p.y }; p.x = (c + nb[0]) * 48 + 24; p.y = (r + nb[1]) * 48 + 24; for (let k = 0; k < 60; k++) { p.vx = -nb[0] * 200; p.vy = -nb[1] * 200; t.step(1 / 60); }
      const inside = Math.floor(p.x / 48) === c && Math.floor(p.y / 48) === r; p.vx = p.vy = 0;
      // a boss shell straight into the wall does not get through
      G.bullets.length = 0; const wx = c * 48 + 24, wy = r * 48 + 24, ang = Math.atan2(wy - e.y, wx - e.x); p.x = 24; p.y = 24; e.turret = ang; t.bossVolley(e, [0], {}); let past = 0;
      for (let k = 0; k < 90; k++) { t.step(1 / 60); for (const b of G.bullets) if (b.owner === 1 && Math.hypot(b.x - e.x, b.y - e.y) > Math.hypot(wx - e.x, wy - e.y) + 60 && Math.abs(Math.atan2(b.y - e.y, b.x - e.x) - ang) < 0.2) past++; }
      return { mini, ref, flowBlocked, inside, past, nroots: e.dk.roots.length }; }""")
    check('roots_block_movement_pathfinding_bullets', blk['flowBlocked'] and not blk['inside'] and blk['past'] == 0, blk)
    check('roots_visible_on_minimap', blk['mini'] != blk['ref'], blk)
    gone = ev(page, """() => { const t = __tank, G = t.G, e = G.boss, m = G.map, pa = t.parseArena(t.ARENAS.kale), gate = t.ARENAS.kale.gate.map(([c, r]) => r * m.n + c); G.god = true; const left = 6 - e.dk.roots[0].t;
      t.step(Math.max(0, left - 0.4)); const still = e.dk.roots.length; t.step(1.2); let bad = 0;
      for (let i = 0; i < m.n * m.n; i++) if (!gate.includes(i) && m.t[i] !== pa.t[i] && !(pa.t[i] === 1)) bad++; return { still, roots: e.dk.roots.length, bad, rest: e.dk.roots.map(q => [q.t, q.life]), gen: !!e.gen }; }""")
    check('roots_vanish_after_6s', gone['still'] > 0 and gone['roots'] == 0 and gone['bad'] == 0, gone)

    # ---- fairness: roots never on the player, the player is damaged on the line only once, a path to the rear always exists, no sealed pocket ----
    fair = ev(page, """() => { const t = __tank, G = t.G, e = G.boss, p = G.player, m = G.map, n = m.n, out = { trials: 0, onPlayer: 0, hurt: 0, hurtAgain: 0, rearLost: 0, pocket: 0, trapped: 0, cap: 0, walls: 0, minReg: 1 };
      const rearOf = () => { const ca = Math.cos(e.angle), sa = Math.sin(e.angle), r = []; for (let i = 0; i < n * n; i++) { if (m.t[i] === 2 || m.t[i] === 3 || m.t[i] === 1) continue; const dx = (i % n) * 48 + 24 - e.x, dy = Math.floor(i / n) * 48 + 24 - e.y, lx = dx * ca + dy * sa, ly = -dx * sa + dy * ca; if (lx < -55 && lx > -55 - 105 && Math.abs(ly) < 77) r.push(i); } return r; };
      const bfs = () => { const seen = new Uint8Array(n * n), s0 = Math.floor(p.y / 48) * n + Math.floor(p.x / 48), bi = Math.floor(e.y / 48) * n + Math.floor(e.x / 48), ok = i => m.t[i] !== 1 && m.t[i] !== 2 && m.t[i] !== 3 && i !== bi;
        if (!ok(s0)) return seen; const q = [s0]; seen[s0] = 1; for (let h = 0; h < q.length; h++) { const i = q[h], c = i % n, r = (i - c) / n; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = c + dx, y = r + dy; if (x < 0 || y < 0 || x >= n || y >= n) continue; const j = y * n + x; if (!seen[j] && ok(j)) { seen[j] = 1; q.push(j); } } } return seen; };
      const open = []; for (let i = 0; i < n * n; i++) if (m.t[i] === 0 || m.t[i] === 4) open.push(i);
      for (let k = 0; k < 48; k++) {
        const ph3 = k >= 24; e.phase = ph3 ? 2 : 1; e.phased = false; e.rooted = ph3; e.dying = false; e.hp = e.maxHp; e.invuln = false; e.stunT = 0; e.trans = 0; G.god = false;
        if (k % 4 === 0) { for (const q of e.dk.roots) q.t = q.life; t.step(0.05); }
        e.x = (ph3 ? 10 : [10, 4, 16][k % 3]) * 48 + 24; e.y = (ph3 ? 10 : [2, 10, 10][k % 3]) * 48 + 24; e.angle = e.turret = (k * 1.7) % 6.28; e.gen = null; e.cool = 99; G.tele.length = 0; G.bullets.length = 0;
        let i0, tries = 0; do { i0 = open[Math.floor(Math.random() * open.length)]; tries++; } while (tries < 200 && (Math.hypot((i0 % n) * 48 + 24 - e.x, Math.floor(i0 / n) * 48 + 24 - e.y) < 110 || e.dk.roots.some(q => q.r * n + q.c === i0)));
        p.x = (i0 % n) * 48 + 24 + (Math.random() - 0.5) * 20; p.y = Math.floor(i0 / n) * 48 + 24 + (Math.random() - 0.5) * 20; p.vx = p.vy = 0; p.hp = p.maxHp; p.alive = true;
        const rear = rearOf(), b0 = bfs(), had = rear.some(i => b0[i]); let nb = 0; for (let i = 0; i < n * n; i++) nb += b0[i];
        e.gen = t.BOSS_DEFS.demirkok.attacks.find(a => a.id === 'fisk').run(e); e.atkId = 'fisk'; e.wait = 0; let px = p.x, py = p.y, h0 = p.hp, st = 0;
        while (e.gen && st < 60 * 4) { px = p.x; py = p.y; const nl = e.log.length; t.step(1 / 60); st++; if (e.log.length > nl) { px = px; break; } }
        out.trials++; const stepsAfter = () => { for (const q of e.dk.roots) { if (q.t > 0.5) continue; const x = q.c * 48 + 24, y = q.r * 48 + 24, h = 24 + p.r + 6; if (Math.abs(px - x) < h && Math.abs(py - y) < h) out.onPlayer++; } };
        t.step(0.02); stepsAfter(); if (p.hp < h0) out.hurt++; const h1 = p.hp; t.step(1.5); if (p.hp < h1) out.hurtAgain++;
        const b1 = bfs(); let nr = 0; for (let i = 0; i < n * n; i++) nr += b1[i];
        if (had && !rear.some(i => b1[i])) out.rearLost++; out.minReg = Math.min(out.minReg, nr / Math.max(1, nb)); if (nr < nb * 0.5) out.pocket++;
        if (m.t[Math.floor(p.y / 48) * n + Math.floor(p.x / 48)] === 2) out.trapped++; if (e.dk.roots.length > 16) out.cap++; out.walls += e.dk.roots.length; }
      for (const q of e.dk.roots) q.t = q.life; t.step(0.05); G.god = true; return out; }""")
    check('roots_never_on_player', fair['trials'] == 48 and fair['onPlayer'] == 0 and fair['trapped'] == 0, fair)
    check('roots_path_to_rear_always_and_no_pocket', fair['rearLost'] == 0 and fair['pocket'] == 0 and fair['cap'] == 0 and fair['walls'] > 40, fair)
    ev(page, START); ev(page, "(() => { const e = __tank.G.boss; e.phase = 1; e.phased = false; })()"); ev(page, f"({PLACE})([10, 9, 10, 13])")
    cdm = ev(page, """() => { const t = __tank, G = t.G, e = G.boss, p = G.player; G.god = false; p.hp = p.maxHp; e.gen = t.BOSS_DEFS.demirkok.attacks.find(a => a.id === 'fisk').run(e); e.atkId = 'fisk'; e.wait = 0;
      let n = 0, hp = p.maxHp, hits = 0; while (e.gen && n < 600) { t.step(1 / 60); n++; if (p.hp < hp) { hits++; hp = p.hp; } } t.step(2); if (p.hp < hp) hits++; G.god = true; return { hits, lost: p.maxHp - p.hp }; }""")
    check('crack_damage_once_on_the_line', cdm['hits'] == 1 and cdm['lost'] > 0 and fair['hurtAgain'] == 0 and fair['hurt'] >= 8, [cdm, fair])

    # ---- phase 3: walks to the centre, plants for good, hull faces the player ----
    ev(page, START); ev(page, f"({PLACE})([10, 3, 10, 18])")
    ev(page, "(() => { const e = __tank.G.boss; e.cool = 0.5; e.acd.kok = 0; e.hp = e.maxHp * 0.3; })()")
    ev(page, "__tank.step(1.7)")
    r3 = ev(page, """() => { const t = __tank, G = t.G, e = G.boss; let n = 0; while (!e.rooted && n < 60 * 40) { t.step(1 / 60); n++; }
      const p = G.player, face = Math.abs(Math.atan2(Math.sin(e.angle - Math.atan2(p.y - e.y, p.x - e.x)), Math.cos(e.angle - Math.atan2(p.y - e.y, p.x - e.x))));
      return { rooted: e.rooted, phase: e.phase, dx: Math.round(e.x - 504), dy: Math.round(e.y - 504), secs: +(n / 60).toFixed(1), face: +face.toFixed(2), at: e.dk.at }; }""")
    check('phase3_plants_at_centre', r3['rooted'] and r3['phase'] == 2 and abs(r3['dx']) < 12 and abs(r3['dy']) < 12 and r3['face'] < 0.9, r3)
    mv = ev(page, "(() => { const t = __tank, e = t.G.boss; t.step(3); return Math.hypot(e.x - 504, e.y - 504); })()")
    check('rooted_does_not_move', mv < 12, mv)
    ev(page, "(() => { const e = __tank.G.boss; e.gen = null; e.cool = 99; __tank.G.tele.length = 0; __tank.G.bullets.length = 0; for (const a of e.def.attacks) e.acd[a.id] = 1e12; })()")
    ev(page, "(() => { const G = __tank.G, p = G.player; p.x = 504; p.y = 504 + 48 * 4; })()"); ev(page, RUN, 'fisk')
    p3 = ev(page, """() => { const t = __tank, G = t.G, e = G.boss; t.step(0.1); const lines = G.tele.filter(x => x.kind === 'line' && x.crack).length; let n = 0; while (e.gen && n < 60 * 3) { t.step(1 / 60); n++; }
      return { lines, life: e.dk.roots.length ? e.dk.roots[0].life : 0, roots: e.dk.roots.length }; }""")
    check('phase3_two_lines_longer_walls', p3['lines'] == 2 and p3['life'] == 9 and p3['roots'] >= 3, p3)
    ev(page, "(() => { const G = __tank.G, e = G.boss; for (const q of e.dk.roots) q.t = q.life; __tank.step(0.1); })()")

    # ---- Döner ateş: sweep line 1 s ahead, stream follows, a full circle ----
    ev(page, "(() => { const e = __tank.G.boss; e.gen = null; e.cool = 99; __tank.G.tele.length = 0; __tank.G.bullets.length = 0; __tank.G.player.x = 504; __tank.G.player.y = 504 + 48 * 6; })()")
    ev(page, RUN, 'doner')
    sw = ev(page, """() => { const t = __tank, G = t.G, e = G.boss; let n = 0, firstLead = null, ang0 = null, total = 0, last = null;
      while (e.gen && n < 60 * 14) { t.step(1 / 60); n++; const s = e.dk.sw;
        if (s && s.fired) { if (firstLead === null) { firstLead = Math.abs(s.lead - s.bar); ang0 = s.bar; } }
        if (s && s.fired) { if (last !== null) total += Math.abs(s.bar - last); last = s.bar; } G.bullets.length = Math.min(G.bullets.length, 400); }
      const l = e.log.filter(x => x.atk === 'doner').pop(); return { dur: l && l.dur, lead: firstLead, total: +total.toFixed(2), secs: +(n / 60).toFixed(1) }; }""")
    check('sweep_line_1s_ahead_full_circle', sw['dur'] is not None and sw['dur'] >= 1.0 and sw['lead'] is not None and abs(sw['lead'] - 1.1) < 0.05 and abs(sw['total'] - 6.28) < 0.3, sw)
    shots = ev(page, """() => { const t = __tank, G = t.G, e = G.boss; G.bullets.length = 0; G.player.y = 504 + 48 * 6; e.gen = t.BOSS_DEFS.demirkok.attacks.find(a => a.id === 'doner').run(e); e.atkId = 'doner'; e.wait = 0;
      let n = 0; const seen = new Set(); while (e.gen && n < 60 * 4) { t.step(1 / 60); n++; for (const b of G.bullets) if (b.owner === 1) seen.add(b); } return seen.size; }""")
    check('sweep_continuous_stream', shots > 20, shots)
    sd = ev(page, """() => { const t = __tank, G = t.G, e = G.boss; e.dk.sw = { a0: 0, W: 1.1, t: 1.5, lead: 2.1, bar: 1.0, end: 8, fired: true }; const a = 1.5708, r = [t.bossDanger(e.x + Math.cos(a) * 200, e.y + Math.sin(a) * 200, 10), t.bossDanger(e.x + Math.cos(a + 3) * 200, e.y + Math.sin(a + 3) * 200, 10)];
      e.dk.sw = null; return r; }""")
    check('sweep_is_bot_danger', sd == [True, False], sd)
    cd = ev(page, """() => { const t = __tank, G = t.G, e = G.boss; G.tele.length = 0; G.tele.push({ kind: 'line', a: 0, x: e.x, y: e.y, len: 240, w: 41, t: 0.5, dur: 1, lock: 0.3, e }); const r = [t.bossDanger(e.x + 150, e.y, 10), t.bossDanger(e.x + 150, e.y + 150, 10)]; G.tele.length = 0; return r; }""")
    check('crack_line_is_bot_danger', cd == [True, False], cd)

    # ---- rear weak point: x1.5 while rooted, front unchanged ----
    ev(page, "(() => { const e = __tank.G.boss; e.parts.forEach(q => { q.alive = false; }); e.gen = null; e.cool = 99; e.angle = e.turret = 0; e.invuln = false; e.hp = e.maxHp * 0.3; })()")
    rear = ev(page, HIT, [-46, 0, 3.14159265, 10]); front = ev(page, HIT, [46, 0, 0, 10])
    ev(page, "(() => { __tank.G.boss.rooted = false; })()"); unrooted = ev(page, HIT, [-46, 0, 3.14159265, 10]); ev(page, "(() => { __tank.G.boss.rooted = true; })()")
    check('rear_hit_1_5x_while_rooted', abs(rear - 15) < 0.01 and abs(front - 10) < 0.01 and abs(unrooted - 10) < 0.01, [rear, front, unrooted])

    # ---- second loop (wave > 40): two crack lines in phase 2, each turret rebuilds once after 30 s ----
    ev(page, START.replace('wave(20)', 'wave(60)'))
    ev(page, "(() => { const e = __tank.G.boss; e.phase = 1; e.phased = false; })()"); ev(page, f"({PLACE})([10, 9, 10, 15])"); ev(page, RUN, 'fisk')
    l2 = ev(page, "(() => { const t = __tank; t.step(0.1); const r = { lines: t.G.tele.filter(x => x.kind === 'line' && x.crack).length, wave: t.G.wave, boss: t.G.boss.def.id }; t.step(3); return r; })()")
    check('loop2_two_crack_lines_in_phase2', l2['lines'] == 2 and l2['wave'] == 60 and l2['boss'] == 'demirkok', l2)
    ev(page, "(() => { const e = __tank.G.boss; e.phase = 0; e.phased = false; for (const q of e.dk.roots) q.t = q.life; __tank.step(0.1); e.gen = null; e.cool = 99; })()")
    brk = """(side) => { const t = __tank, e = t.G.boss; e.invuln = false; for (let k = 0; k < 80; k++) { t.hurtBoss(10, e.x + 38, e.y + side, 0); if (!e.parts.find(q => q.oy === side).alive) break; } return e.parts.find(q => q.oy === side).alive; }"""
    ev(page, brk, -27); ev(page, brk, 27)
    t29 = ev(page, "(() => { const t = __tank, e = t.G.boss; e.cool = 99; t.step(29); return e.parts.map(q => q.alive); })()")
    t31 = ev(page, "(() => { const t = __tank, e = t.G.boss; t.step(2.2); return e.parts.map(q => [q.alive, q.hp === q.maxHp]); })()")
    ev(page, brk, -27); ev(page, brk, 27)
    t60 = ev(page, "(() => { const t = __tank, e = t.G.boss; e.cool = 99; t.step(40); return e.parts.map(q => q.alive); })()")
    check('loop2_turrets_rebuild_once_after_30s', t29 == [False, False] and t31 == [[True, True], [True, True]] and t60 == [False, False], [t29, t31, t60])
    ev(page, START); ev(page, "(() => { const e = __tank.G.boss; e.phase = 1; e.phased = false; })()"); ev(page, f"({PLACE})([10, 9, 10, 15])"); ev(page, RUN, 'fisk')
    l1 = ev(page, "(() => { const t = __tank; t.step(0.1); return t.G.tele.filter(x => x.kind === 'line' && x.crack).length; })()")
    check('first_loop_one_crack_line_in_phase2', l1 == 1, l1)
    ev(page, START); ev(page, "(() => { const e = __tank.G.boss; e.parts.forEach(q => { q.alive = false; }); })()"); ev(page, "__tank.step(40)")
    check('first_loop_turrets_do_not_rebuild', ev(page, "__tank.G.boss.parts.map(q => q.alive)") == [False, False])

    # ---- death ----
    ev(page, START); ev(page, "(() => { const G = __tank.G, e = G.boss; G.god = true; e.parts.forEach(q => { q.alive = false; }); e.rooted = true; e.hp = 5; })()")
    ev(page, "(() => { const t = __tank, G = t.G, e = G.boss, m = G.map; e.cool = 99; e.dk.roots.push({ c: 7, r: 10, t: 0, orig: 0, seed: 1, life: 6 }); m.t[10 * 21 + 7] = 2; t.hurtBoss(20, e.x - 46, e.y, Math.PI); })()")
    ev(page, "__tank.step(1)")
    ban = ev(page, "document.getElementById('banner').textContent")
    ev(page, "__tank.step(0.8)")
    mid = ev(page, "(() => { const e = __tank.G.boss; return { dying: e ? e.dying : 'gone', tile: __tank.G.map.t[10 * 21 + 7] }; })()")
    ev(page, "__tank.step(3)")
    after = ev(page, "(() => { const G = __tank.G; return { phase: G.phase, hp: G.player.hp, max: G.player.maxHp, boss: !!G.boss && !G.boss.dead }; })()")
    check('death_text_roots_dissolve', 'DEMİRKÖK DEVRİLDİ' in ban and mid['tile'] == 0, [ban, mid])
    check('death_armour_full_loot', after['hp'] == after['max'] and after['phase'] == 'upgrade', after)

    # ---- phone screenshot: phase 3 with a root wall, a crack line and the planted anchors ----
    ctx2 = new_ctx(b, 'phone', viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ph = ctx2.new_page(); seed(ph); ph.tap('#btnStart'); ph.wait_for_timeout(400)
    ev(ph, START)
    ev(ph, "(() => { const e = __tank.G.boss; e.hp = e.maxHp * 0.3; e.cool = 0.2; e.acd.kok = 0; })()")
    ev(ph, "(() => { const t = __tank, e = t.G.boss; let n = 0; while (!e.rooted && n < 3000) { t.step(1 / 30); n++; } e.cool = 99; e.gen = null; t.G.tele.length = 0; })()")
    ev(ph, "(() => { const t = __tank, e = t.G.boss; e.gen = t.BOSS_DEFS.demirkok.attacks.find(a => a.id === 'fisk').run(e); e.atkId = 'fisk'; e.wait = 0; let n = 0; while (e.gen && n < 300) { t.step(1 / 30); n++; } })()")
    got = ev(ph, "(() => { const t = __tank, e = t.G.boss; e.cool = 99; t.G.player.x = 504 + 48 * 3; t.G.player.y = 504 + 48 * 5; t.G.player.vx = t.G.player.vy = 0; e.gen = t.BOSS_DEFS.demirkok.attacks.find(a => a.id === 'fisk').run(e); e.atkId = 'fisk'; e.wait = 0; for (let k = 0; k < 24; k++) t.step(1 / 30); return [e.dk.roots.length, t.G.tele.some(x => x.crack)]; })()")
    ev(ph, "document.getElementById('hint').classList.remove('show'); document.getElementById('banner').classList.remove('show')")
    ph.wait_for_timeout(150); os.makedirs(str(TMP), exist_ok=True); ph.screenshot(path=str(TMP / 'demir_p390.png'))
    check('phone_roots_and_crack_line', got[0] >= 3 and got[1], got)
    ctx2.close(); b.close()

errs = real_errors()
check('no_page_errors', not errs, errs[:3])
print('check_demirkok:', 'FAILED ' + ', '.join(FAILS) if FAILS else 'all ok')
print('ERRORS:', errs or 'none')

sys.exit(1 if FAILS else 0)
