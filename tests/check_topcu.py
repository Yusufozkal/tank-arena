"""Ağır Topçu (Kar, wave 23+; docs/BOSSES.md 1.5.5): first at wave 23 (one, alone, with the one-time tip), Kar roster only, at most 2 alive, short wide hull / thick barrel / big slow shell,
0.8 s barrel glow, 6 s reload, the shell takes exactly 3 player shells (any damage; piercing counts once), blast breaks bricks and never steel, barrel part damage calls the charge off,
the nuke wipes the shell, banned after Kırağı.
Usage: TANK_TEST_PORT=8800 python3 tests/check_topcu.py"""
from common import *  # noqa: F401,F403

report_on_exit('check_topcu', R)
FAILS = []


def check(name, ok, info=None):
    R[name] = info if info is not None else ok
    vprint(('ok   ' if ok else 'FAIL ') + name, info if not ok else '')
    if not ok:
        FAILS.append(name)
        print('FAIL', name, info)


def ev(page, js, arg=None):
    return page.evaluate(js, arg) if arg is not None else page.evaluate(js)


HELPERS = """() => {
  const t = __tank, G = t.G; window.VOL = 100;
  window.cnt = (list, ty) => list.filter(x => x === ty).length;
  window.rosters = (w, n) => { const o = []; for (let i = 0; i < n; i++) o.push(t.buildRoster(w).list); return o; };
  // a player shell (owner 0) at (x, y) flying in direction (vx, vy)
  window.pshell = (x, y, vx, vy, dmg, pierce) => ({ x, y, vx, vy, r: 4, owner: 0, dmg: dmg === undefined ? 1 : dmg, life: 2, big: false, dead: false, pierce: !!pierce, bounce: 0, splash: null, look: 'player',
    hits: null, bricks: null, sx: x, sy: y, dist: 0, bounced: false, vol: ++window.VOL, volN: 1, pn: 0 });
  // empty snow arena, the player at tile (px, py), one Topçu at tile (tx, ty) facing east, the turret already on the player
  window.setup = (px, py, tx, ty, ang) => { G.god = true; t.dbg.freeze = false; t.killAll(); G.bullets = []; G.queue = []; G.portals = []; t.clearArena(); G.phase = 'fight';
    const p = G.player; p.x = px * 48 + 24; p.y = py * 48 + 24; p.vx = p.vy = 0;
    const e = t.spawn('topcu', tx * 48 + 24, ty * 48 + 24); e.angle = e.turret = ang || 0; e.cool = 0; const V = t.view; V.bx0 = V.by0 = -1e6; V.bx1 = V.by1 = 1e6; return e; };
}"""
ROSTER_SCAN = "([w, n, ty]) => { const r = rosters(w, n); return { any: r.filter(l => l.includes(ty)).length, max: Math.max(...r.map(l => cnt(l, ty))), min: Math.min(...r.map(l => cnt(l, ty))) }; }"
SHELLS = "() => __tank.G.bullets.filter(b => b.shell && !b.dead)"

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = new_ctx(b, 'desktop', viewport={'width': 1000, 'height': 760})
    page = ctx.new_page(); seed(page)
    page.click('#btnStart'); page.wait_for_timeout(300)
    ev(page, HELPERS)
    ev(page, "(() => { const G = __tank.G; G.beaten.clear(); G.beaten.add('sari'); G.beaten.add('demirkok'); })()")  # the normal Kar state: Hızlı, Ağır and Tamirci are gone

    # ---- arrival: wave 23 exactly one, none before; shares 24-29; Kar only; at most 2 alive ----
    r22, r23 = ev(page, ROSTER_SCAN, [22, 200, 'topcu']), ev(page, ROSTER_SCAN, [23, 200, 'topcu'])
    check('topcu_not_before_23', r22['any'] == 0 and ev(page, "__tank.typeShares(22).pa") == 0 and ev(page, "__tank.typeShares(21).pa") == 0, r22)
    check('topcu_wave23_exactly_one', r23['min'] == 1 and r23['max'] == 1, r23)
    sh = ev(page, "[24, 26, 29].map(w => +__tank.typeShares(w).pa.toFixed(4))")
    check('topcu_share_curve_24_29', sh == [0.04, 0.06, 0.09], sh)
    r27 = ev(page, ROSTER_SCAN, [27, 200, 'topcu'])
    check('topcu_comes_in_kar_waves', r27['any'] > 100, r27)
    city = ev(page, "[31, 33, 39, 41, 45].map(w => __tank.typeShares(w).pa)")
    check('topcu_never_outside_kar', all(x == 0 for x in city), city)
    boss = ev(page, "__tank.buildRoster(30).list")
    check('topcu_not_in_boss_stage', boss == ['boss'], boss)
    mx = ev(page, """() => { const t = __tank, G = t.G; t.wave(24); G.god = true; t.dbg.freeze = false; t.killAll(); G.queue = Array(8).fill('topcu'); G.maxAlive = 12; G.spawnTimer = 0; let most = 0;
      for (let i = 0; i < 60 * 40; i++) { t.step(1 / 60); G.enemies.forEach(e => { e.cool = 99; }); most = Math.max(most, G.enemies.filter(e => e.type === 'topcu').length + G.portals.filter(q => q.type === 'topcu').length); if (!G.queue.length && !G.portals.length) break; }
      return { most, all: G.enemies.length, types: G.enemies.map(e => e.type).join() }; }""")
    check('at_most_2_alive_counts_toward_limits', mx['most'] == 2 and mx['all'] == 8, mx)

    # ---- the one-time tip, like the Tamirci ----
    ev(page, "(() => { localStorage.removeItem('tankArena.seenTopcu'); const h = document.getElementById('hint'); h.classList.remove('show'); h.textContent = ''; })()")
    ev(page, "(() => { const t = __tank; t.wave(23); t.G.god = true; t.dbg.freeze = false; t.killAll(); t.G.queue = []; t.spawn('topcu', 400, 400); })()")
    h1 = ev(page, "document.getElementById('hint').textContent"), ev(page, "document.getElementById('hint').classList.contains('show')")
    ev(page, "(() => { const h = document.getElementById('hint'); h.classList.remove('show'); h.textContent = ''; __tank.spawn('topcu', 500, 500); })()")
    h2 = ev(page, "document.getElementById('hint').classList.contains('show')")
    check('topcu_hint_once', h1[0].startswith('Yeni düşman: Ağır Topçu') and h1[1] and not h2, [h1, h2])

    # ---- body and shell: short wide hull, one very thick barrel, a big slow shell ----
    sp = ev(page, "(() => { const s = __tank.SPECS; return { topcu: [s.topcu.len, s.topcu.wid, s.topcu.bW, s.topcu.bR, s.topcu.bSpeed, s.topcu.speed, s.topcu.hp, s.topcu.dmg], heavy: [s.heavy.bW, s.heavy.bR, s.heavy.bSpeed, s.heavy.speed, s.heavy.dmg], basic: [s.basic.bR, s.basic.speed] }; })()")
    t_, h_ = sp['topcu'], sp['heavy']
    check('short_wide_thick_barrel_big_slow_shell', t_[0] < t_[1] and t_[2] >= 2 * h_[0] and t_[3] >= 1.8 * h_[1] and t_[3] >= 2 * sp['basic'][0] and t_[4] <= 0.5 * h_[2] and t_[5] < h_[3] and t_[6] >= 4 and t_[7] > h_[4], sp)

    # ---- charge: glow 0.8 s, then one shell; reload ~6 s; the shell hits hard ----
    ev(page, "(() => { __tank.G.beaten.clear(); })()")
    t0 = ev(page, """() => { const t = __tank, G = t.G, e = setup(10, 13, 10, 8, Math.PI / 2); e.tp = { charge: 0, repos: 0, tf: null, spot: null }; const st = { c0: null, f1: null, f2: null, e: 0 }; let n = 0;
      let first = null, second = null, seen = new Set(), chargeStart = null; const hp0 = G.player.hp;
      while (n < 60 * 24 && !second) {
        t.step(1 / 60); n++; e.avx = 0;
        if (chargeStart === null && e.tp.charge > 0) chargeStart = G.time;
        for (const b of G.bullets) if (b.shell && !seen.has(b)) { seen.add(b); if (!first) first = { t: G.time, r: b.r, v: Math.round(Math.hypot(b.vx, b.vy)), dmg: b.dmg, sh: b.sh }; else second = { t: G.time }; }
        G.player.x = 10 * 48 + 24; G.player.y = 13 * 48 + 24;
      }
      return { chargeS: first && chargeStart !== null ? +(first.t - chargeStart).toFixed(2) : null, first, reload: second ? +(second.t - first.t).toFixed(2) : null }; }""")
    check('charge_0_8s_before_shell', t0['chargeS'] is not None and 0.78 <= t0['chargeS'] <= 0.9, t0)
    check('reload_about_6s', t0['reload'] is not None and 5.2 <= t0['reload'] <= 9.5, t0)
    check('shell_big_slow_hard', t0['first'] and t0['first']['r'] >= 10 and t0['first']['v'] <= 160 and t0['first']['dmg'] >= 25 and t0['first']['sh'] == 3, t0)
    # a direct hit: the player takes the full damage, once (no extra blast damage on top)
    hit = ev(page, """() => { const t = __tank, G = t.G, e = setup(10, 12, 10, 8, Math.PI / 2); G.god = false; const p = G.player; p.hp = p.maxHp; e.cool = 99; t.topcuFire(e);
      for (let i = 0; i < 60 * 4 && t.G.bullets.some(b => b.shell); i++) t.step(1 / 60); G.god = true; return { hurt: p.maxHp - p.hp, one: Math.max(1, Math.round(28 * G.mods.dmg)) }; }""")
    check('direct_hit_hard_not_doubled', hit['hurt'] == hit['one'], hit)

    # ---- the shell takes exactly 3 player shells, whatever the damage ----
    sd = ev(page, """() => { const t = __tank, G = t.G, e = setup(10, 13, 10, 8, Math.PI / 2); e.cool = 99; t.topcuFire(e); const sh = G.bullets.find(b => b.shell); sh.vx = sh.vy = 0; sh.life = 99; sh.x = 10 * 48 + 24; sh.y = 11 * 48; const p = G.player; const hp0 = p.hp, sc0 = G.score; const out = [];
      for (const dmg of [0.2, 40, 1]) { const b = pshell(sh.x, sh.y + 30, 0, -660, dmg); G.bullets.push(b); for (let i = 0; i < 4 && !b.dead; i++) t.stepBullets(1 / 60); out.push([sh.sh, !!sh.dead, b.dead]); }
      return { out, hp: p.hp - hp0, score: G.score - sc0, shells: G.bullets.filter(b => b.shell && !b.dead).length }; }""")
    check('shell_pops_after_exactly_3_hits', sd['out'] == [[2, False, True], [1, False, True], [0, True, True]] and sd['hp'] == 0 and sd['score'] == 25 and sd['shells'] == 0, sd)
    pr = ev(page, """() => { const t = __tank, G = t.G, e = setup(10, 13, 10, 8, Math.PI / 2); e.cool = 99; t.topcuFire(e); const sh = G.bullets.find(b => b.shell); sh.vx = sh.vy = 0; sh.life = 99; sh.x = 10 * 48 + 24; sh.y = 11 * 48;
      const b = pshell(sh.x, sh.y + 30, 0, -660, 1, true); G.bullets.push(b); const seq = []; for (let i = 0; i < 8; i++) { t.stepBullets(1 / 60); seq.push(sh.sh); }
      return { seq, alive: !b.dead, left: sh.sh }; }""")
    check('piercing_counts_once_per_shell_and_flies_on', pr['left'] == 2 and pr['alive'] and pr['seq'][-1] == 2, pr)
    rc = ev(page, """() => { const t = __tank, G = t.G, e = setup(10, 13, 10, 8, Math.PI / 2); e.cool = 99; t.topcuFire(e); const sh = G.bullets.find(b => b.shell); sh.vx = sh.vy = 0; sh.life = 99; sh.x = 10 * 48 + 24; sh.y = 11 * 48;
      const b = pshell(sh.x, sh.y + 30, 0, -660, 1); b.bounce = 1; b.bounced = true; G.bullets.push(b); for (let i = 0; i < 4; i++) t.stepBullets(1 / 60); return sh.sh; }""")
    check('bounced_shell_counts_like_any', rc == 2, rc)

    # ---- blast: bricks inside are destroyed, steel never; walls stop the shell ----
    bl = ev(page, """() => { const t = __tank, G = t.G, m = G.map, e = setup(2, 15, 6, 10, 0); e.cool = 99; const I = (c, r) => r * m.n + c;
      m.t[I(10, 10)] = 1; m.hp[I(10, 10)] = 3; m.t[I(10, 11)] = 1; m.hp[I(10, 11)] = 3; m.t[I(10, 9)] = 2; m.t[I(13, 10)] = 2; m.t[I(13, 11)] = 1; m.hp[I(13, 11)] = 3; m.t[I(11, 10)] = 0;
      t.topcuFire(e); for (let i = 0; i < 60 * 4 && G.bullets.some(b => b.shell); i++) t.step(1 / 60);
      const r1 = [m.t[I(10, 10)], m.t[I(10, 11)], m.t[I(10, 9)]];
      e.x = 11 * 48 + 24; e.y = 10 * 48 + 24; e.angle = e.turret = 0; t.topcuFire(e); for (let i = 0; i < 60 * 3 && G.bullets.some(b => b.shell); i++) t.step(1 / 60);
      return { brick: r1, steel2: m.t[I(13, 10)], brick2: m.t[I(13, 11)], steel1: m.t[I(10, 9)] }; }""")
    check('shell_breaks_bricks_not_steel', bl['brick'] == [0, 0, 2] and bl['steel2'] == 2 and bl['brick2'] == 0 and bl['steel1'] == 2, bl)
    sp2 = ev(page, """() => { const t = __tank, G = t.G, m = G.map, e = setup(2, 15, 6, 10, 0); e.cool = 99; G.god = false; const p = G.player; p.hp = p.maxHp; p.x = 462; p.y = 550; const I = (c, r) => r * m.n + c; m.t[I(10, 10)] = 2;
      t.topcuFire(e); for (let i = 0; i < 60 * 4 && G.bullets.some(b => b.shell); i++) t.step(1 / 60); G.god = true; return { steel: m.t[I(10, 10)], hurt: +(p.maxHp - p.hp).toFixed(1), full: Math.max(1, Math.round(28 * G.mods.dmg)) }; }""")
    check('blast_small_radius_splash_60pct', sp2['steel'] == 2 and 0 < sp2['hurt'] < sp2['full'], sp2)

    # ---- part damage: a jammed barrel calls the charge off; the nuke wipes the shell ----
    pd = ev(page, """() => { const t = __tank, G = t.G, e = setup(10, 13, 10, 8, Math.PI / 2); e.angle = e.turret = Math.PI / 2; t.step(0.4); const c0 = e.tp ? e.tp.charge : 0;
      const b = { x: e.x, y: e.y + 36, vx: 0, vy: -600, r: 4, owner: 0, dmg: 2, life: 2, dead: false, vol: 7777, volN: 1 }; t.damageEnemy(e, b);
      const jam = e.pt ? e.pt.barrel : 0; t.step(0.2); return { c0, jam: +jam.toFixed(2), charge: e.tp.charge, shells: G.bullets.filter(x => x.shell).length, hp: e.hp, max: e.maxHp }; }""")
    check('barrel_part_damage_cancels_charge', pd['c0'] > 0 and pd['jam'] > 0 and pd['charge'] == 0 and pd['shells'] == 0 and pd['hp'] < pd['max'], pd)
    nk = ev(page, """() => { const t = __tank, G = t.G, e = setup(10, 13, 10, 8, Math.PI / 2); e.cool = 99; t.topcuFire(e); const before = G.bullets.filter(b => b.shell).length; t.nukeCharge(1); t.nukeFire(); t.step(1.6);
      return { before, after: G.bullets.filter(b => b.shell).length, alive: G.enemies.some(x => x.type === 'topcu') }; }""")
    check('nuke_wipes_shell_and_topcu', nk['before'] == 1 and nk['after'] == 0 and not nk['alive'], nk)

    # ---- repositions after the shot (a new spot around the player), keeps its distance ----
    rp = ev(page, """() => { const t = __tank, G = t.G, e = setup(10, 13, 10, 8, Math.PI / 2); e.angle = e.turret = Math.PI / 2; const x0 = e.x, y0 = e.y; let n = 0, fired = false, moved = 0, minD = 1e9;
      while (n < 60 * 12) { t.step(1 / 60); n++; G.player.x = 10 * 48 + 24; G.player.y = 13 * 48 + 24; if (!fired && G.bullets.some(b => b.shell)) { fired = true; G.bullets.length = 0; n = 0; } if (fired) { moved = Math.max(moved, Math.hypot(e.x - x0, e.y - y0)); minD = Math.min(minD, Math.hypot(e.x - G.player.x, e.y - G.player.y)); } if (fired && n > 60 * 4) break; }
      return { fired, moved: Math.round(moved), minD: Math.round(minD / 48 * 10) / 10 }; }""")
    check('repositions_after_firing_keeps_distance', rp['fired'] and rp['moved'] > 60 and rp['minD'] >= 2.8, rp)

    # ---- banned after Kırağı ----
    ev(page, "(() => { const t = __tank, G = t.G; G.beaten.clear(); G.beaten.add('kiragi'); })()")
    ban = ev(page, "[__tank.typeBanned('topcu'), __tank.typeBanned('hunter'), __tank.typeShares(26).pa, __tank.typeShares(26).pu]")
    sc = ev(page, ROSTER_SCAN, [26, 100, 'topcu'])
    check('topcu_banned_after_kiragi', ban[0] and ban[1] and ban[2] == 0 and ban[3] == 0 and sc['any'] == 0, [ban, sc])
    ev(page, "(() => { __tank.G.beaten.clear(); })()")
    ev(page, "(() => { const t = __tank, G = t.G, ms = []; G.beaten.clear(); G.beaten.add('kiragi'); window.__rm = t.waveMods(31).cool; G.beaten.clear(); window.__r0 = t.waveMods(31).cool; })()")
    check('region_compensation_includes_topcu', ev(page, "window.__rm < window.__r0"))
    ev(page, "(() => { __tank.G.beaten.clear(); __tank.G.beaten.add('kiragi'); __tank.G.wave = 30; __tank.nextWave(); })()")
    bt, bs = ev(page, "document.getElementById('bTitle').textContent"), ev(page, "document.getElementById('bSub').textContent")
    check('wave31_banner_names_both', bt == 'ŞEHİR BÖLGESİ' and bs == 'Avcılar ve Ağır Topçular artık gelmiyor', [bt, bs])

    # ---- Rehber (guide) texts ----
    g = ev(page, "(() => { const t = document.getElementById('guide').textContent; return [t.includes('Ağır Topçu'), t.includes('Kırağı'), t.includes('Ağır Topçular')]; })()")
    check('guide_has_entries_and_rule', g == [True, True, True], g)
    b.close()

errs = real_errors()
check('no_page_errors', not errs, errs[:3])
print('check_topcu:', 'FAILED ' + ', '.join(FAILS) if FAILS else 'all ok')
print('ERRORS:', errs or 'none')

sys.exit(1 if FAILS else 0)
