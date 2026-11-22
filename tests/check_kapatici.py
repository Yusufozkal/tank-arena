"""Kapatıcı (docs/BOSSES.md section 7b), the sandbox-only boss: registration, arena, the four attacks with their telegraphs, the open window (full damage) against half damage,
Kapanış (the edge ring at 90 s and 120 s), fair senses (a hidden passive player is not known until it hears or sees him), the Serbest Mod start call, page errors.
Usage: TANK_TEST_PORT=8800 python3 tests/check_kapatici.py     (short summary; full report .tmp/check_kapatici.json; exit 1 on failure; phone screenshot: .tmp/kapatici_p390.png)"""
import sys
from common import *  # noqa: F401,F403

report_on_exit('check_kapatici', R)
FAILS = []


def check(name, ok, info=None):
    R[name] = info if info is not None else ok
    vprint(('ok   ' if ok else 'FAIL ') + name, info if not ok else '')
    if not ok:
        FAILS.append(name)
        print('FAIL', name, info if info is not None else '')


def ev(page, js, arg=None):
    return page.evaluate(js, arg) if arg is not None else page.evaluate(js)


# a fresh fight: god mode, boss started with the debug helper, intro skipped
START = "() => { localStorage.setItem('tankArena.seenBossIntro','true'); const t = __tank; t.G.god = true; t.bossStart('kapatici', 25); t.bossSkip(); t.step(0.1); }"
# park the boss at tile (c, r) facing east and freeze it (a tread kept broken, no attacks); the player at tile (pc, pr); senses reset
PLACE = """([c, r, pc, pr]) => { const t = __tank, G = t.G, e = G.boss, p = G.player, kp = e.kp; e.x = c * 48 + 24; e.y = r * 48 + 24; p.x = pc * 48 + 24; p.y = pr * 48 + 24; p.vx = p.vy = 0;
  e.gen = null; e.atkId = ''; e.cool = 1e9; e.tr[0].t = 1e6; e.treadT = 1e6; e.stunT = 0; e.angle = 0; e.turret = Math.atan2(p.y - e.y, p.x - e.x); G.tele.length = 0; G.bullets.length = 0; G.pickups.length = 0;
  kp.openUntil = 0; kp.dodge = null; kp.dodgeCd = 99; kp.vis = false; kp.seeT = 0; kp.unseen = 0; kp.esc = { L: 0, R: 0, away: 0, toward: 0 }; e.invuln = false; e.log.length = 0; e.hp = e.maxHp; e.canSee = false; }"""
SETKAP = "(o) => { Object.assign(__tank.KAP, o); }"
RUN = "(id) => { const t = __tank, e = t.G.boss; e.gen = t.BOSS_DEFS.kapatici.attacks.find(a => a.id === id).run(e); e.atkId = id; e.wait = 0; }"
# step until the attack ends (or max seconds); returns [seconds used, frames with the open window up]
DONE = "(max) => { const t = __tank, e = t.G.boss; let n = 0, o = 0; while (e.gen && n < max * 60) { t.step(1 / 60); n++; if (t.G.time < e.kp.openUntil) o++; } return [n / 60, o]; }"
HIT = "([lx, ly, dir, dmg]) => { const t = __tank, e = t.G.boss, h0 = e.hp; t.hurtBoss(dmg, e.x + lx, e.y + ly, dir); return +(h0 - e.hp).toFixed(3); }"

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = new_ctx(b, 'desktop', viewport={'width': 1000, 'height': 760})
    page = ctx.new_page(); seed(page)
    page.click('#btnStart'); page.wait_for_timeout(300)

    # ---- registration: sandbox only, never in the normal run ----
    reg = ev(page, """() => { const t = __tank, d = t.BOSS_DEFS.kapatici, on = Object.values(t.BOSS_ON), seen = new Set();
      for (let w = 1; w <= 120; w++) { const bd = t.bossDefAt(w); if (bd) seen.add(bd.id); }
      return { d: !!d, sandbox: d && d.sandboxOnly === true, name: d && d.name, arena: d && d.arena, inOn: on.includes('kapatici'), seen: [...seen], attacks: d ? d.attacks.map(a => a.id) : [] }; }""")
    check('registered_sandbox_only', reg['d'] and reg['sandbox'] and reg['name'] == 'KAPATICI' and reg['arena'] == 'kapanis', reg)
    check('not_in_boss_on_or_waves', not reg['inOn'] and 'kapatici' not in reg['seen'], reg)
    check('attack_list', reg['attacks'] == ['kesin', 'sekme', 'kesme', 'havan'], reg['attacks'])

    # ---- arena 21x21, dark floor, steel gaps 0 or >= 3, no gate; the Serbest Mod call works with only G.wave set ----
    ev(page, START)
    arena = ev(page, """() => { const t = __tank, G = t.G, m = G.map, a = t.ARENAS.kapanis, pa = t.parseArena(a), bad = [];
      for (let i = 0; i < pa.n * pa.n; i++) if (m.t[i] !== pa.t[i]) bad.push(i);
      return { n: m.n, bad, arena: m.arena, theme: m.theme.key, ground: m.theme.ground, boss: pa.boss, player: pa.player, enemies: G.enemies.length, def: G.boss.def.id, hp: G.boss.maxHp, r: G.boss.r }; }""")
    check('arena_matches_text', arena['n'] == 21 and arena['arena'] == 'kapanis' and not arena['bad'] and arena['boss'] == {'c': 10, 'r': 2} and arena['player'] == {'c': 10, 'r': 18} and arena['enemies'] == 1 and arena['def'] == 'kapatici', arena)
    check('dark_metal_floor', arena['ground'] == '#222428', arena['ground'])
    rows = ev(page, "__tank.ARENAS.kapanis.rows")
    S = [(c, r) for r, row in enumerate(rows) for c, ch in enumerate(row) if ch == 'S']
    gaps = []
    for i, (c, r) in enumerate(S):  # per pair of steel tiles in different blocks: the empty gap along a row or column
        for (c2, r2) in S[i + 1:]:
            if (abs(c - c2) <= 1 and abs(r - r2) <= 1):
                continue
            if r == r2 or c == c2:
                g = max(abs(c - c2), abs(r - r2)) - 1
                lo = (min(c, c2), min(r, r2)); hi = (max(c, c2), max(r, r2))
                between = [rows[y][x] for x in range(lo[0], hi[0] + 1) for y in range(lo[1], hi[1] + 1)][1:-1]
                if all(ch != 'S' for ch in between) and 0 < g < 3:
                    gaps.append(((c, r), (c2, r2), g))
    edge = [min(c, r, 20 - c, 20 - r) for c, r in S]
    check('steel_gap_rule', not gaps and all(e == 0 or e >= 3 for e in edge), {'gaps': gaps[:4], 'edge': sorted(set(edge))})
    start = ev(page, """() => { const t = __tank, G = t.G; G.wave = 7; const d = t.BOSS_DEFS.kapatici; G.map = t.loadArena(d.arena, G.map.theme); G.boss = null; G.enemies = []; G.player.x = G.map.playerAt.x; G.player.y = G.map.playerAt.y;
      t.startBossStage(d); t.step(4); return { phase: G.phase, boss: G.boss && G.boss.def.id, stage: !!G.stage, y: Math.round(G.boss.y) }; }""")
    check('serbest_mod_start_call', start['boss'] == 'kapatici' and start['stage'] and start['phase'] == 'fight', start)
    ev(page, START)

    # ---- attacks: telegraph first, then the strike ----
    ev(page, SETKAP, {'feintP': 0})  # the old checks look at plain Kesin Atış; feints are tested below
    ev(page, PLACE, [10, 4, 13, 12]); ev(page, "__tank.step(0.8)")
    check('sees_player_in_open', ev(page, "__tank.G.boss.canSee") is True)
    # Kesin Atış
    ev(page, RUN, 'kesin'); s1 = ev(page, "(() => { const t = __tank, e = t.G.boss; let n = 0, seen = null, b0 = null; while (e.gen && n < 600) { t.step(1 / 60); n++; if (e.log.length && !seen) { seen = e.log[0]; b0 = t.G.bullets.filter(b => b.boss).map(b => ({ v: Math.hypot(b.vx, b.vy), dmg: b.dmg })); } } return { seen, b0, maxHp: t.G.player.maxHp, mods: t.G.mods.dmg, open: e.kp.openUntil - t.G.time }; })()")
    k = s1['seen'] or {}
    check('kesin_telegraph_0_6s', k.get('atk') == 'kesin' and k.get('kind') == 'line' and 0.58 <= k.get('dur', 0) <= 0.75 and k.get('min') == 0.6, s1)
    sh = (s1['b0'] or [{}])[0]
    check('kesin_fast_shell_52pct', sh.get('v', 0) >= 850 and abs(sh.get('dmg', 0) - 0.4 * 1.3 * s1['maxHp']) <= 0.06 * s1['maxHp'] + 1, {'shell': sh, 'maxHp': s1['maxHp'], 'mods': s1['mods']})
    # Sekme Atışı (a player the boss cannot hit straight: behind the centre block)
    ev(page, PLACE, [10, 4, 10, 15]); ev(page, "__tank.G.boss.lk = { x: 10 * 48 + 24, y: 15 * 48 + 24, t: __tank.G.time }; __tank.G.boss.kp.vis = false")
    can = ev(page, "(() => { const e = __tank.G.boss; return e.def.attacks.find(a => a.id === 'sekme').ok(e) && !!e.kp.sol; })()")
    check('sekme_finds_corner_shot', can is True)
    ev(page, RUN, 'sekme')
    s2 = ev(page, "(() => { const t = __tank, e = t.G.boss; let n = 0, dash = null, bnc = false, bl = 0; while (e.gen && n < 600) { t.step(1 / 60); n++; if (!dash && t.G.tele.length) dash = t.G.tele.map(q => ({ kind: q.kind, dash: !!q.dash })); for (const b of t.G.bullets) if (b.boss && b.bounced) bnc = true; if (e.log.length && !bl) bl = e.log.length; } for (let i = 0; i < 120; i++) { t.step(1 / 60); for (const b of t.G.bullets) if (b.boss && b.bounced) bnc = true; } return { dash, bnc, log: e.log.map(l => [l.atk, l.kind, l.dur, l.min]) }; })()")
    lg = s2['log']
    check('sekme_dashed_line_then_bounce', len(lg) >= 1 and lg[0][0] == 'sekme' and lg[0][1] == 'line' and lg[0][2] >= 0.78 and s2['dash'] and all(d['dash'] for d in s2['dash']) and s2['bnc'], s2)
    # Kesme Hamlesi
    ev(page, PLACE, [10, 4, 10, 13]); ev(page, "__tank.step(0.8)")
    ev(page, "(() => { const e = __tank.G.boss; e.y = 2 * 48 + 24; e.x = 6 * 48 + 24; __tank.G.player.x = 14 * 48 + 24; __tank.G.player.y = 6 * 48 + 24; __tank.step(0.6); })()")
    x0 = ev(page, "(() => { const e = __tank.G.boss; return [e.x, e.y]; })()")
    ev(page, RUN, 'kesme'); s3 = ev(page, DONE, 8)
    s3b = ev(page, "(() => { const e = __tank.G.boss; return { moved: Math.hypot(e.x - " + str(x0[0]) + ", e.y - " + str(x0[1]) + "), log: e.log.map(l => [l.atk, l.kind, l.dur, l.min]) }; })()")
    lg = s3b['log']
    check('kesme_line_then_dash', lg and lg[0][0] == 'kesme' and lg[0][1] == 'line' and lg[0][2] >= 0.98 and s3b['moved'] > 120, s3b)
    # Havan on a hidden player: circles on the bushes around the last-known spot, never on his true position
    ev(page, PLACE, [10, 8, 15, 14])  # (15, 14) is a bush tile
    hv = ev(page, """() => { const t = __tank, G = t.G, e = G.boss, p = G.player, kp = e.kp; p.x = 15 * 48 + 24; p.y = 14 * 48 + 24; e.lk = { x: 14 * 48 + 24, y: 14 * 48 + 24, t: G.time }; kp.unseen = 4; kp.vis = false;
      const ok = e.def.attacks.find(a => a.id === 'havan').ok(e); e.gen = e.def.attacks.find(a => a.id === 'havan').run(e); e.atkId = 'havan'; e.wait = 0; let n = 0, circ = [];
      while (e.gen && n < 900) { t.step(1 / 60); n++; for (const q of G.tele) if (q.kind === 'circle' && !circ.some(c => c.x === q.x && c.y === q.y)) circ.push({ x: q.x, y: q.y }); }
      return { ok, circ: circ.length, arc: e.def.attacks.find(a => a.id === 'havan').arc, log: e.log.map(l => [l.atk, l.kind, l.dur, l.min]), seeP: e.canSee }; }""")
    check('havan_circles_1_2s_arc', hv['ok'] and hv['arc'] is True and hv['circ'] >= 1 and hv['log'] and hv['log'][0][1] == 'circle' and hv['log'][0][2] >= 1.18, hv)

    # ---- open window: full damage, otherwise half ----
    ev(page, PLACE, [10, 4, 10, 13]); ev(page, "__tank.step(0.05)")
    ev(page, "(() => { const e = __tank.G.boss; e.kp.openUntil = 0; })()")
    d_half = ev(page, HIT, [30, 0, 0, 10])
    ev(page, "(() => { const t = __tank, e = t.G.boss; e.kp.openUntil = t.G.time + 5; })()")
    d_full = ev(page, HIT, [30, 0, 0, 10])
    check('hull_half_damage_closed', abs(d_half - 5) < 0.01, d_half)
    check('open_window_full_damage', abs(d_full - 10) < 0.01, d_full)
    # the open window after an attack lasts about a second and the barrel glow field is set
    ev(page, PLACE, [10, 4, 13, 12]); ev(page, "__tank.step(0.8)"); ev(page, RUN, 'kesin'); od = ev(page, DONE, 5)
    check('open_window_about_1_4s_after_attack', 1.25 <= od[1] / 60 <= 1.55, od)
    # no side-step while attacking: a shell aimed at the boss during an attack does not move it sideways
    ev(page, PLACE, [10, 4, 13, 12]); ev(page, "__tank.step(0.8)"); ev(page, "(() => { const e = __tank.G.boss; e.kp.dodgeCd = 0; })()")
    ev(page, RUN, 'kesin')
    dd = ev(page, """() => { const t = __tank, G = t.G, e = G.boss, p = G.player; const x0 = e.x, y0 = e.y; let moved = 0;
      for (let i = 0; i < 20; i++) { t.step(1 / 60); G.bullets.push({ x: e.x + 180, y: e.y, vx: -600, vy: 0, r: 4, owner: 0, dmg: 0, life: 1, dead: false, pierce: false, bounce: 0, hits: null, big: false }); }
      return { moved: Math.hypot(e.x - x0, e.y - y0), dodge: !!e.kp.dodge }; }""")
    check('no_sidestep_while_attacking', dd['moved'] < 4 and not dd['dodge'], dd)

    # ---- Kapanış: the edge ring at 90 s and 120 s; nobody is crushed ----
    ev(page, START); ev(page, PLACE, [10, 4, 10, 16])
    ev(page, "(() => { const t = __tank, e = t.G.boss, p = t.G.player; e.kp.t = 80; p.x = 0 * 48 + 24; p.y = 10 * 48 + 24; t.step(8); })()")
    r0 = ev(page, "(() => { const t = __tank, m = t.G.map, e = t.G.boss, n = m.n; return { closed: e.kp.closed, warn: e.kp.warn, edge: m.t[10 * n + 0], inner: m.t[10 * n + 1], kt: +e.kp.t.toFixed(1) }; })()")
    check('ring_not_closed_before_90', r0['closed'] == 0 and r0['edge'] == 0, r0)
    ev(page, "(() => { const t = __tank, e = t.G.boss; e.kp.t = 87.8; t.step(0.3); })()")
    w1 = ev(page, "(() => { const e = __tank.G.boss; return { warn: e.kp.warn, closed: e.kp.closed, banner: document.getElementById('banner').textContent }; })()")
    check('warning_2s_before_ring', w1['warn'] is True and w1['closed'] == 0, w1)
    ev(page, "__tank.step(2.0)")
    r1 = ev(page, "(() => { const t = __tank, m = t.G.map, e = t.G.boss, p = t.G.player, n = m.n, S = 2; return { closed: e.kp.closed, edgeSteel: [0, 5, 10, 20].every(i => m.t[i * n] === S && m.t[i] === S && m.t[(n - 1) * n + i] === S && m.t[i * n + n - 1] === S), inner: m.t[10 * n + 1], px: Math.round(p.x), alive: p.alive }; })()")
    check('ring_closes_at_90', r1['closed'] == 1 and r1['edgeSteel'] and r1['inner'] == 0 and r1['alive'] and r1['px'] >= 48 + 17, r1)
    ev(page, "(() => { const t = __tank, e = t.G.boss; e.kp.t = 118.0; t.step(0.5); })()")
    r2a = ev(page, "__tank.G.boss.kp.closed")
    ev(page, "__tank.step(2.0)")
    r2 = ev(page, "(() => { const t = __tank, m = t.G.map, e = t.G.boss, n = m.n, S = 2; return { closed: e.kp.closed, ring1: [2, 6, 10, 18].every(i => m.t[n + i] === S && m.t[i * n + 1] === S && m.t[(n - 2) * n + i] === S && m.t[i * n + n - 2] === S), inner: m.t[10 * n + 2], bossIn: e.x > 2 * 48 && e.x < 19 * 48 }; })()")
    check('ring_moves_in_at_120', r2a == 1 and r2['closed'] == 2 and r2['ring1'] and r2['inner'] == 0 and r2['bossIn'], [r2a, r2])

    # ---- fair senses: a hidden passive player is not known until the boss hears or sees him ----
    ev(page, START); ev(page, PLACE, [10, 8, 15, 13])
    hid = ev(page, """() => { const t = __tank, G = t.G, e = G.boss, p = G.player, kp = e.kp; const lk0 = { x: e.lk.x, y: e.lk.y }; t.step(6);
      const far = Math.hypot(e.lk.x - p.x, e.lk.y - p.y), seen = e.canSee, hidden = G.map.at(p.x, p.y) === 5 || G.map.at(p.x, p.y) === 4 || true;
      return { seen, vis: kp.vis, lkAge: +(G.time - e.lk.t).toFixed(1), lkFar: +far.toFixed(0), unseen: +kp.unseen.toFixed(1), tile: G.map.at(p.x, p.y), lk0 }; }""")
    check('hidden_passive_unknown', hid['seen'] is False and hid['vis'] is False and hid['lkFar'] > 3 * 48 and hid['unseen'] > 5, hid)
    heard = ev(page, """() => { const t = __tank, G = t.G, e = G.boss, p = G.player; p.lastShot = G.time; t.step(0.1);
      return { seen: e.canSee, lkAge: +(G.time - e.lk.t).toFixed(2), lkErr: Math.round(Math.hypot(e.lk.x - p.x, e.lk.y - p.y)), hearErr: 3 * 48 }; }""")
    check('shot_is_heard_with_error', heard['seen'] is False and heard['lkAge'] < 0.3 and heard['lkErr'] <= 3 * 48 + 2, heard)
    ev(page, "(() => { const t = __tank, p = t.G.player, e = t.G.boss; p.x = 16 * 48 + 24; p.y = 6 * 48 + 24; e.turret = Math.atan2(p.y - e.y, p.x - e.x); t.step(0.12); })()")  # turret on him: the cone, not the random search direction, is what is tested
    early = ev(page, "__tank.G.boss.canSee"); ev(page, "__tank.step(0.5)")
    late = ev(page, "__tank.G.boss.canSee")
    check('sees_in_open_after_reaction', early is False and late is True, [early, late])

    # ---- 1.5.6 smarter: reads dodges, feints, baits Refleks, follows treads, never touches pickups ----
    ev(page, START)
    AIMAT = """(m) => { const t = __tank, e = t.G.boss, p = t.G.player; let a = null; e.gen = e.def.attacks.find(x => x.id === 'kesin').run(e); e.atkId = 'kesin'; e.wait = 0; let n = 0;
      while (e.gen && n < 400) { t.step(1 / 60); n++; const tl = t.G.tele.find(q => q.e === e && q.kind === 'line' && !q.feint); if (tl && tl.t >= 0.45 && a === null) a = e.turret; }
      return { a, to: Math.atan2(p.y - e.y, p.x - e.x) }; }"""
    ev(page, SETKAP, {'feintP': 0})
    ev(page, PLACE, [10, 4, 13, 12]); ev(page, "(() => { const e = __tank.G.boss; e.kp.dodges = []; __tank.step(0.8); })()")
    base = ev(page, AIMAT, 0)
    ev(page, PLACE, [10, 4, 13, 12]); ev(page, "(() => { const t = __tank, e = t.G.boss; e.kp.dodges = []; for (let i = 0; i < 5; i++) e.kp.dodges.push({ k: 'R', t: t.G.time - i, lat: 120, rad: 0 }); t.step(0.8); })()")
    shifted = ev(page, AIMAT, 0)
    dsh = (shifted['a'] - base['a'] + 3.14159) % 6.28318 - 3.14159
    off = ev(page, "(() => { const t = __tank, e = t.G.boss; return t.kapReadOffset(e); })()")
    check('dodge_read_shifts_aim', dsh > 0.02 and off and 0 < (off['x'] ** 2 + off['y'] ** 2) ** 0.5 < 120, {'dsh': dsh, 'off': off})
    mix = ev(page, """() => { const t = __tank, e = t.G.boss, now = t.G.time, d = []; for (let i = 0; i < 3; i++) d.push({ k: 'R', t: now, lat: 100, rad: 0 }, { k: 'L', t: now, lat: -100, rad: 0 }); e.kp.dodges = d; const a = t.kapReadOffset(e);
      e.kp.dodges = [1, 2, 3, 4].map(i => ({ k: 'R', t: now - 90, lat: 100, rad: 0 })); const b = t.kapReadOffset(e); return { mixed: a, old: b }; }""")
    check('dodge_read_needs_pattern_and_fades', mix['mixed'] is None and mix['old'] is None, mix)
    # a scripted player who always runs the same way after the line appears: the samples fill in
    ev(page, "(() => { const e = __tank.G.boss; e.kp.dodges = []; })()")
    for _ in range(4):
        ev(page, PLACE, [10, 4, 13, 12]); ev(page, "__tank.step(0.8)")
        ev(page, """() => { const t = __tank, e = t.G.boss, p = t.G.player; e.gen = e.def.attacks.find(x => x.id === 'kesin').run(e); e.atkId = 'kesin'; e.wait = 0; let n = 0;
          while (e.gen && n < 300) { t.step(1 / 60); n++; if (t.G.tele.length) { const dx = p.x - e.x, dy = p.y - e.y, u = Math.hypot(dx, dy); p.x += (dy / u) * 140 / 60; p.y += (-dx / u) * 140 / 60; } } }""")
    pat = ev(page, "(() => { const t = __tank, e = t.G.boss; const c = {}; for (const s of e.kp.dodges) c[s.k] = (c[s.k] || 0) + 1; return { c, off: !!t.kapReadOffset(e) }; })()")
    check('dodge_samples_recorded', max(pat['c'].values() or [0]) >= 3 and pat['off'], pat)

    # feint: the line is cancelled at ~0.35 s, then a real full line; never twice in a row; every shell had a full line
    ev(page, SETKAP, {'feintP': 1})
    ev(page, "(() => { const e = __tank.G.boss; e.kp.feinted = false; e.kp.baitT = 1e9; })()")
    FE = """() => { const t = __tank, e = t.G.boss; const out = []; for (let r = 0; r < 3; r++) { e.log.length = 0; let sh = 0, n = 0; e.gen = e.def.attacks.find(x => x.id === 'kesin').run(e); e.atkId = 'kesin'; e.wait = 0; const seen = new Set();
      while (e.gen && n < 900) { t.step(1 / 60); n++; for (const b of t.G.bullets) if (b.boss && !seen.has(b)) { seen.add(b); sh++; } }
      out.push({ log: e.log.map(l => [l.atk, l.dur]), shells: sh }); t.G.bullets.length = 0; e.cool = 1e9; } return out; }"""
    ev(page, PLACE, [10, 4, 13, 12]); ev(page, "__tank.step(0.8)")
    fe = ev(page, FE)
    pattern = [[l[0] for l in r['log']] for r in fe]
    fine = all(r['shells'] == sum(1 for l in r['log'] if l[0] in ('kesin', 'bait') and l[1] >= 0.58) for r in fe) and all(l[1] >= 0.58 for r in fe for l in r['log'] if l[0] == 'kesin')
    check('feint_then_real_full_line', pattern[0] == ['feint', 'kesin'] and pattern[1] == ['kesin'] and pattern[2] == ['feint', 'kesin'] and 0.3 <= fe[0]['log'][0][1] <= 0.42 and fine, fe)
    ev(page, SETKAP, {'feintP': 0})

    # Refleks bait: with the ready dot visible a cheap shell comes first (full line too), then the real shot; without Refleks nothing changes
    BA = """(rf) => { const t = __tank, G = t.G, e = G.boss, p = G.player; G.up.reflex = rf; p.rfCd = 0; e.kp.baitT = -99; e.kp.feinted = false; e.log.length = 0; G.bullets.length = 0; const dm = []; const seen = new Set(); let n = 0;
      e.gen = e.def.attacks.find(x => x.id === 'kesin').run(e); e.atkId = 'kesin'; e.wait = 0;
      while (e.gen && n < 900) { t.step(1 / 60); n++; p.hp = p.maxHp; for (const b of G.bullets) if (b.boss && !seen.has(b)) { seen.add(b); dm.push(+b.dmg.toFixed(2)); } }
      G.up.reflex = 0; return { dm, log: e.log.map(l => [l.atk, l.dur]) }; }"""
    ev(page, PLACE, [10, 4, 13, 12]); ev(page, "__tank.step(0.8)")
    ba = ev(page, BA, 1)
    check('refleks_bait_cheap_shot_first', len(ba['dm']) == 2 and ba['dm'][0] < 0.5 * ba['dm'][1] and ba['log'][0][0] == 'bait' and ba['log'][0][1] >= 0.58 and ba['log'][1][0] == 'kesin', ba)
    ev(page, PLACE, [10, 4, 13, 12]); ev(page, "__tank.step(0.8)")
    nb = ev(page, BA, 0)
    check('no_bait_without_refleks', len(nb['dm']) == 1 and nb['log'][0][0] == 'kesin', nb)

    # tread tracking: hidden player, last-known spot stale; the visible tread marks (laid east along row 14, ending at the bush) pull the search point close to him; with tracking off it stays stale
    TR = """(on) => { const t = __tank, G = t.G, e = G.boss, p = G.player, tm = t.tm; t.KAP.track = on; e.kp.vis = false; e.canSee = false; e.kp.search = false;
      e.lk = { x: 4 * 48 + 24, y: 10 * 48 + 24, t: G.time - 3 }; e.kp.trail = null; e.kp.trT = 0; tm.n = 0; tm.head = 0;
      for (let k = 0; k < 6; k++) { const i = tm.head; const x = (8 + k) * 48 + 24; tm.x1[i] = x; tm.y1[i] = 14 * 48 + 20; tm.x2[i] = x + 30; tm.y2[i] = 14 * 48 + 20; tm.t[i] = G.time - 2 + k * 0.25; tm.o[i] = 1; tm.head = (i + 1) % 1400; tm.n++; }
      e.turret = Math.PI; t.step(0.5); return { d: Math.round(Math.hypot(e.lk.x - p.x, e.lk.y - p.y)), seen: e.canSee }; }"""
    ev(page, PLACE, [8, 13, 15, 14]); ev(page, "(() => { const t = __tank; t.step(0.1); })()")
    t_on = ev(page, TR, True)
    ev(page, PLACE, [8, 13, 15, 14]); ev(page, "__tank.step(0.1)")
    t_off = ev(page, TR, False)
    ev(page, SETKAP, {'track': True})
    check('tread_tracking_closer_than_blind', not t_on['seen'] and not t_off['seen'] and t_on['d'] < t_off['d'] - 200, {'on': t_on, 'off': t_off})

    # no pickups: a repair kit and a power-up lie around, the boss fights; no shell is ever aimed at them, they stay; the source touches pickups only to push them in when a ring closes
    ev(page, START); ev(page, PLACE, [10, 2, 10, 18])
    pk = ev(page, """() => { const t = __tank, G = t.G, e = G.boss, p = G.player; e.tr[0].t = 0; e.treadT = 0; e.cool = 0.5; e.gen = null; e.kp.dodgeCd = 0;
      G.pickups.push({ x: 3 * 48 + 24, y: 6 * 48 + 24, kind: 'repair', life: 1e6, t: 0, seed: 1 }, { x: 17 * 48 + 24, y: 6 * 48 + 24, kind: 'shield', life: 1e6, t: 0, seed: 2 }); const P = G.pickups.map(q => [q.x, q.y]);
      let shots = 0, bad = 0, goalNear = 0; const seen = new Set();
      for (let i = 0; i < 60 * 25; i++) { t.step(1 / 60); p.hp = p.maxHp; e.kp.t = Math.min(e.kp.t, 80); for (const q of G.pickups) q.life = 1e6;
        for (const b of G.bullets) if (b.boss && !seen.has(b)) { seen.add(b); shots++; const a = Math.atan2(b.vy, b.vx); for (const q of P) { const d = Math.atan2(q[1] - b.y, q[0] - b.x); if (Math.abs(((a - d + 9.42478) % 6.28318) - 3.14159) < 0.12) bad++; } }
        const g = e.kp.goal; if (g) for (const q of P) if (Math.hypot(g.x - q[0], g.y - q[1]) < 1.2 * 48 && Math.hypot(p.x - q[0], p.y - q[1]) > 4 * 48) goalNear++; }
      return { shots, bad, goalNear, left: G.pickups.length, same: G.pickups.every((q, i) => q.x === P[i][0] && q.y === P[i][1]) }; }""")
    src = (Path(__file__).resolve().parent.parent / 'game' / 'src' / '11e-boss-kapatici.js').read_text().replace('\r', '')
    uses = [ln for ln in src.splitlines() if 'pickups' in ln and not ln.lstrip().startswith('//')]
    check('never_touches_pickups', pk['shots'] >= 2 and pk['bad'] == 0 and pk['left'] == 2 and pk['same'] and len(uses) == 1 and src[:src.index(uses[0])].rsplit('function', 1)[1].startswith(' kapClose'), {'pk': pk, 'uses': len(uses)})

    # ---- phone screenshot mid-fight, then the death title ----
    page.close()
    ctx2 = new_ctx(b, 'phone', viewport={'width': 390, 'height': 844}); pg2 = ctx2.new_page(); seed(pg2)
    pg2.click('#btnStart'); pg2.wait_for_timeout(300)
    ev(pg2, START); ev(pg2, "(() => { const t = __tank, e = t.G.boss, p = t.G.player; e.cool = 1e9; e.x = 10 * 48 + 24; e.y = 6 * 48 + 24; p.x = 7 * 48 + 24; p.y = 11 * 48 + 24; t.step(3.6); e.turret = e.angle = Math.atan2(p.y - e.y, p.x - e.x); e.kp.openUntil = t.G.time + 6; t.hurtBoss(180, e.x + 20, e.y + 10, e.angle); t.step(0.15); })()")
    TMP.mkdir(exist_ok=True); pg2.screenshot(path=str(TMP / 'kapatici_p390.png'))
    dead = ev(pg2, """() => { const t = __tank, G = t.G, e = G.boss; e.kp.openUntil = 0; t.hurtBoss(1e6, e.x + 20, e.y, 0); const bn = document.getElementById('banner').textContent; t.step(3); return { dying: e.dying || e.dead, banner: bn, bossGone: !G.boss || G.boss.dead }; }""")
    check('death_title_kapatici_dustu', 'KAPATICI DÜŞTÜ' in dead['banner'], dead)
    b.close()

errs = real_errors()
check('no_page_errors', not errs, errs[:3])
R['fails'] = FAILS
print(f"Kapatici: {len(R) - 1 - len(FAILS)} ok, {len(FAILS)} fail |", 'page errors:', errs[:2] or 'none')
sys.exit(1 if FAILS else 0)
