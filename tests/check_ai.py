"""Enemy AI: the Avcı's dodge range and far-hit cover, and awareness (last-known position, search, hint).
Usage: TANK_TEST_PORT=8811 python3 tests/check_ai.py     (full report: .tmp/check_ai.json)"""
from common import *  # noqa: F401,F403

report_on_exit('check_ai', R)
FAILS = []


def check(name, ok, info=None):
    R[name] = info if info is not None else ok
    vprint(('ok   ' if ok else 'FAIL ') + name, info if not ok else '')
    if not ok:
        FAILS.append(name)
        print('FAIL', name, info)


def ev(page, js, arg=None):
    return page.evaluate(js, arg) if arg is not None else page.evaluate(js)


# empty arena, player parked (optionally in a bush tile), god mode, AI running
SETUP = """([bush, px, py]) => { const t = __tank, G = t.G, T = 48; G.god = true; t.dbg.freeze = false; t.killAll(); G.bullets = []; G.queue = []; G.portals = []; G.pickups = [];
  t.clearArena(bush ? [[px, py]] : []); const p = G.player; p.x = px * T + T / 2; p.y = py * T + T / 2; p.lastShot = -99; G.phase = 'fight'; G.hint = 0; G.mods.dodge = 1; G.contactT = G.time; return true; }"""

SHELL = """(o) => { const mk = (e, fromT, nowT, dmg) => { const T = 48, a = 0.3; // a shell flying at e along angle a (+pi: towards e)
    const dx = Math.cos(a), dy = Math.sin(a), sp = 660;
    return { x: e.x - dx * nowT * T, y: e.y - dy * nowT * T, vx: dx * sp, vy: dy * sp, r: 4, owner: 0, dmg: dmg || 1, life: 2, big: false, dead: false, pierce: false, bounce: 0, splash: null, look: 'player', hits: null, bricks: null,
      sx: e.x - dx * fromT * T, sy: e.y - dy * fromT * T, dist: 0, bounced: false, vol: 0, volN: 1, pn: 0 }; };
  window.mkShell = mk; return true; }"""

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = new_ctx(b, 'desktop', viewport={'width': 1000, 'height': 760})
    page = ctx.new_page(); seed(page)
    page.click('#btnStart'); page.wait_for_timeout(300)
    ev(page, SHELL, 0)

    # ---- Avcı dodge: far-fired shells never, close ones always (dodge chance forced to 1) ----
    ev(page, SETUP, [False, 3, 3])
    out = ev(page, """() => { const t = __tank, G = t.G, T = 48, o = { far: 0, near: 0, farInView: 0, w: [] }; G.wave = 15; G.mods.dodge = 1;
      const trial = (from, now) => { t.killAll(); const e = t.spawn('hunter', 17 * T + 24, 17 * T + 24); e.dodge = null; e.dodgeCd = 0; e.pt = null;
        const b = window.mkShell(e, from, now); G.bullets.push(b); t.checkDodge(e); const r = !!e.dodge; G.bullets = []; return r; };
      for (let i = 0; i < 30; i++) { if (trial(12, 3)) o.far++; if (trial(4, 3)) o.near++; if (trial(12, 6)) o.farInView++; }
      for (const w of [10, 20, 30, 40]) { G.wave = w; o.w.push(+t.waveMods(w).dodge.toFixed(2)); } return o; }""")
    check('dodge_zero_far_shells', out['far'] == 0 and out['farInView'] == 0, out)
    check('dodge_works_close', out['near'] >= 28, out)
    check('dodge_growth_capped', max(out['w']) <= 0.75, out['w'])

    # ---- Avcı: a hit from far sends it to cover, a near hit does not ----
    out = ev(page, """() => { const t = __tank, G = t.G, T = 48, o = {}; G.wave = 15;
      const hit = (from) => { t.killAll(); for (let r = 8; r < 27; r++) G.map.t[r * G.map.n + 15] = 2; /* a wall: cover from the (west) direction of the shot */ const e = t.spawn('hunter', 17 * T + 24, 17 * T + 24); e.hp = e.maxHp = 3; G.mods.dodge = 0;
        const b = window.mkShell(e, from, 0.3); b.x = e.x - 20; b.y = e.y - 6; t.damageEnemy(e, b); t.step(0.3); const r = [e.mode, +(e.coverT || 0).toFixed(2), e.hp]; return r; };
      o.far = hit(11); o.near = hit(3); o.mid = hit(6); return o; }""")
    check('far_hit_sends_avci_to_cover', out['far'][0] == 'cover' and out['far'][1] > 0.8 and out['far'][2] < 3, out)
    check('near_hit_no_cover', out['near'][0] != 'cover' and out['mid'][0] != 'cover', out)
    miss = ev(page, """() => { const t = __tank, G = t.G, T = 48; t.killAll(); const e = t.spawn('hunter', 17 * T + 24, 17 * T + 24); e.dodgeCd = 0;
      const b = window.mkShell(e, 12, 3); b.y += 6 * T; G.bullets.push(b); t.step(0.3); G.bullets = []; return e.mode; }""")
    check('far_miss_no_cover', miss != 'cover', miss)

    # ---- last-known position: the player sits unseen in a bush; the enemy walks to where it last saw him, then searches ----
    out = ev(page, """() => { const t = __tank, G = t.G, T = 48; G.wave = 4; G.mods.dodge = 0;
      const e = t.spawn('basic', 28 * T + 24, 28 * T + 24); e.speedMul = 1; const A = { x: 28 * T + 24, y: 16 * T + 24 };
      e.lk = { x: A.x, y: A.y, t: G.time }; e.goal = null; e.search = false; e.sn = 0; e.hintT = G.time; G.contactT = G.time; const P = G.player;
      const d0A = Math.hypot(A.x - e.x, A.y - e.y), d0P = Math.hypot(P.x - e.x, P.y - e.y), x0 = e.x, y0 = e.y; t.step(2.5);
      const o = { dA: [d0A, Math.hypot(A.x - e.x, A.y - e.y)], dP: [d0P, Math.hypot(P.x - e.x, P.y - e.y)], dx: e.x - x0, dy: e.y - y0, sees: e.canSee };
      for (let i = 0; i < 30 && !e.search; i++) t.step(0.5);
      o.search = e.search; o.atA = Math.hypot(A.x - e.x, A.y - e.y) / T; t.step(0.5);
      const g = e.goal; o.goal = g ? [+(g.x / T).toFixed(1), +(g.y / T).toFixed(1)] : null; o.goalToA = g ? Math.hypot(g.x - A.x, g.y - A.y) / T : -1; o.goalToP = g ? Math.hypot(g.x - P.x, g.y - P.y) / T : -1; o.sees2 = e.canSee; return o; }""") if ev(page, SETUP, [True, 8, 28]) else None
    check('heads_to_last_known_not_player', out['dA'][1] < out['dA'][0] - 80 and abs(out['dy']) > 2 * abs(out['dx']) and out['dP'][1] > out['dP'][0] - 40 and not out['sees'], out)
    check('searches_near_last_known', out['search'] and out['atA'] < 2 and out['goal'] is not None and 1.5 < out['goalToA'] < 7.5 and not out['sees2'], out)

    # ---- spread: several searchers get different goals ----
    out = ev(page, """() => { const t = __tank, G = t.G, T = 48; t.killAll(); G.bullets = []; G.contactT = G.time; const es = [];
      for (let i = 0; i < 4; i++) { const e = t.spawn('basic', (24 + i) * T + 24, 28 * T + 24); e.canSee = false; e.lk = { x: 28 * T, y: 20 * T, t: G.time }; e.goal = null; e.search = true; e.hintT = G.time; es.push(e); }
      t.step(0.2); const g = es.map(e => e.goal ? [Math.round(e.goal.x / T), Math.round(e.goal.y / T)] : null); return { g, distinct: new Set(g.map(x => x && x.join(','))).size }; }""")
    check('searchers_spread_out', out['distinct'] >= 3, out)

    # ---- a hidden, passive player is found in reasonable time; and seen when very close ----
    ev(page, SETUP, [True, 8, 8])
    out = ev(page, """() => { const t = __tank, G = t.G, T = 48; G.wave = 6; const e = t.spawn('basic', 28 * T + 24, 28 * T + 24); e.speedMul = 1; const o = { found: -1, bushSees: false }; const t0 = G.time;
      for (let i = 0; i < 160; i++) { t.step(0.5); if (e.canSee) { o.found = +(G.time - t0).toFixed(1); break; } if (G.state !== 'play') break; } return o; }""")
    check('hidden_player_found_in_time', 0 < out['found'] <= 60, out)
    out = ev(page, """() => { const t = __tank, G = t.G, T = 48; t.killAll(); const P = G.player; const e = t.spawn('basic', P.x + 1.6 * T, P.y); e.canSee = false; e.senseT = 0; t.step(0.4); return { sees: e.canSee }; }""")
    check('close_enemy_sees_player_in_bush', out['sees'], out)

    # ---- no contact for a long time: a hint is given (enemy never idles forever) ----
    out = ev(page, """() => { const t = __tank, G = t.G, T = 48; t.killAll(); const P = G.player, e = t.spawn('basic', 28 * T + 24, 4 * T + 24); e.canSee = false; e.lk = { x: e.x, y: e.y, t: G.time }; e.hintT = 0; G.contactT = G.time; e.goal = null; e.search = true; G.silT = 0;
      const lk0 = e.lk; t.step(16.5); return { newLk: e.lk !== lk0, dist: Math.hypot(e.lk.x - P.x, e.lk.y - P.y) / T }; }""")
    check('hint_after_long_silence', out['newLk'] and out['dist'] <= 7.2, out)

    # ---- homing metric: enemies that do NOT see the player; how often do they head straight for his true position? ----
    # sampled every 0.25 s during bot-played waves (god mode); cos = angle between the enemy's displacement and the direction to the player
    HOME = """([wave, secs]) => { const t = __tank, G = t.G; t.killAll(); G.bullets = []; t.wave(wave); G.god = true; const o = { n: 0, cos: 0, toward: 0, homing: 0, blindSec: 0, allSec: 0, dec: 0, by: { fresh: [0, 0], old: [0, 0], none: [0, 0] } };
      for (let i = 0; i < secs * 4 && G.state === 'play'; i++) {
        const before = G.enemies.filter(e => !e.dead && e.type !== 'boss' && !e.spec.medic).map(e => [e, e.x, e.y]); const P0 = { x: G.player.x, y: G.player.y };
        t.sim(0.25, true);
        for (const [e, x, y] of before) { if (e.dead) continue; o.allSec += 0.25; if (e.canSee) continue; o.blindSec += 0.25;
          const dx = e.x - x, dy = e.y - y, l = Math.hypot(dx, dy); if (l < 1.5) continue; // standing still: not heading anywhere
          const px = P0.x - x, py = P0.y - y, pl = Math.hypot(px, py) || 1, c = (dx * px + dy * py) / (l * pl);
          const age = e.lk ? G.time - e.lk.t : 1e9, k = age < 6 ? 'fresh' : e.lk ? 'old' : 'none'; const mx = 2 * G.map.n * 24 - P0.x, my = 2 * G.map.n * 24 - P0.y, dc = Math.hypot(mx - x, my - y) || 1; o.dec += (dx * (mx - x) + dy * (my - y)) / (l * dc); o.by[k][0]++; o.by[k][1] += c; o.n++; o.cos += c; if (c > 0) o.toward++; if (c > 0.7) o.homing++; } }
      return { moveSamples: o.n, decoyCos: +(o.dec / Math.max(1, o.n)).toFixed(3), meanCos: +(o.cos / Math.max(1, o.n)).toFixed(3), towardShare: +(o.toward / Math.max(1, o.n)).toFixed(3), homingShare: +(o.homing / Math.max(1, o.n)).toFixed(3), blindShare: +(o.blindSec / Math.max(1, o.allSec)).toFixed(3), by: Object.fromEntries(Object.entries(o.by).map(([k, v]) => [k, [v[0], +(v[1] / Math.max(1, v[0])).toFixed(2)]])) }; }"""
    runs = [ev(page, HOME, [w, 70]) for w in (8, 12, 16)]
    tot = sum(r['moveSamples'] for r in runs) or 1
    homing = {k: round(sum(r[k] * r['moveSamples'] for r in runs) / tot, 3) for k in ('meanCos', 'decoyCos', 'towardShare', 'homingShare')}
    homing['blindShare'] = round(sum(r['blindShare'] for r in runs) / len(runs), 3)
    print([r['by'] for r in runs])
    R['homing_metric'] = {'runs': runs, 'avg': homing}
    print('HOMING (no sight): decoyCos(player mirrored through the centre) %s  meanCos %s  towardShare %s  homingShare(cos>0.7) %s  blindShare %s' % (homing['decoyCos'], homing['meanCos'], homing['towardShare'], homing['homingShare'], homing['blindShare']))
    homing['baseline_1_5_2'] = {'meanCos': 0.683, 'decoyCos': 0.242, 'towardShare': 0.958, 'homingShare': 0.586}
    check('blind_enemies_do_not_home_in', homing['meanCos'] - homing['decoyCos'] < 0.2 and homing['homingShare'] < 0.5 and homing['towardShare'] < 0.85, homing)

    b.close()

errs = real_errors()
check('no_page_errors', not errs, errs[:3])
print('check_ai:', 'FAILED ' + ', '.join(FAILS) if FAILS else 'all ok')
print('ERRORS:', errs or 'none')
sys.exit(1 if FAILS else 0)
