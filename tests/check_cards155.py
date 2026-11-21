"""1.5.5 workshop cards: Antitank mermisi (part damage x2, side/rear bonus), Eğimli zırh (glancing hits by direction), Refleks (rare, sideways slide) and the boss-stage nuke fill.
Usage: TANK_TEST_PORT=8800 python3 tests/check_cards155.py"""
from common import *  # noqa: F401,F403

report_on_exit('check_cards155', R)
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
  const t = __tank, G = t.G; window.VOL = 500;
  // empty arena, the player at tile (px, py) facing east (hull angle 0), full armour, not a god
  window.arena = (up, px, py) => { t.setUp(up || {}); G.god = false; t.dbg.freeze = false; t.killAll(); G.bullets = []; G.queue = []; G.portals = []; t.clearArena(); G.phase = 'fight';
    const p = G.player; p.x = (px || 10) * 48 + 24; p.y = (py || 10) * 48 + 24; p.vx = p.vy = 0; p.angle = 0; p.hp = p.maxHp; G.buffs.shield = 0; p.shield1T = 0; p.rf = null; p.rfCd = 0; const dm = t.spawn('basic', 33 * 48 + 24, 33 * 48 + 24); dm.hp = dm.maxHp = 1e6; dm.speedMul = 0; /* keeps the wave open */ Math.random = window.RND0; return p; };
  window.RND0 = Math.random.bind(Math); window.REAL = Math.random;
  // a player shell (owner 0) at (x, y) with velocity (vx, vy)
  window.pshell = (x, y, vx, vy, dmg) => ({ x, y, vx, vy, r: 4, owner: 0, dmg: dmg === undefined ? 1 : dmg, life: 2, big: false, dead: false, pierce: false, bounce: 0, splash: null, look: 'player', hits: null, bricks: null, sx: x, sy: y, dist: 0, bounced: false, vol: ++window.VOL, volN: 1, pn: 0 });
  // an enemy bullet aimed at the player from the given side (E: east, W, N, S) at 160 px
  window.ebullet = (side, sp, extra) => { const p = G.player, d = { E: [1, 0], W: [-1, 0], N: [0, -1], S: [0, 1] }[side];
    return Object.assign({ x: p.x + d[0] * 160, y: p.y + d[1] * 160, vx: -d[0] * (sp || 300), vy: -d[1] * (sp || 300), r: 5, owner: 1, dmg: 10, life: 3, big: false, dead: false, pierce: false, bounce: 0, splash: null, look: 'enemy', hits: null, bricks: null, sx: 0, sy: 0, dist: 0, bounced: false, vol: 0, volN: 0, pn: 0 }, extra || {}); };
  // run until the bullet is gone (or sec passes); returns the armour lost
  window.fly = (b, sec) => { const p = G.player, hp0 = p.hp; G.bullets.push(b); for (let i = 0; i < 60 * (sec || 1.2) && !b.dead; i++) t.step(1 / 60); return +(hp0 - p.hp).toFixed(2); };
  window.freeOf = (x, y) => { const m = G.map; return !t.blocksTank(m.at(x, y)); };
}"""

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = new_ctx(b, 'desktop', viewport={'width': 1000, 'height': 760})
    page = ctx.new_page(); seed(page)
    page.click('#btnStart'); page.wait_for_timeout(300)
    ev(page, HELPERS)

    # ---- the cards exist ----
    cd = ev(page, "(() => { const U = __tank.UPS; return ['antitank', 'slope', 'reflex'].map(k => [k, !!U[k], U[k] && U[k].max, !!(U[k] && U[k].rare), __tank.UP_KEYS.includes(k), U[k] ? [U[k].desc(1), U[k].desc(U[k].max)].every(x => typeof x === 'string' && x.length > 10) : false]); })()")
    check('cards_defined', cd == [['antitank', True, 3, False, True, True], ['slope', True, 3, False, True, True], ['reflex', True, 2, True, True, True]], cd)

    # ---- Antitank mermisi: part damage x2 (one hit breaks a part of a basic tank), side/rear +15% per level, boss halving ----
    PART = """([L, side]) => { const t = __tank, G = t.G; window.arena(L ? { antitank: L } : {}, 5, 5); const e = t.spawn('basic', 15 * 48 + 24, 15 * 48 + 24); e.angle = 0; e.hp = e.maxHp = 100; e.cool = 99;
      const v = { front: [-300, 0], side: [0, 300], rear: [300, 0] }[side]; const b = window.pshell(e.x - v[0] * 0.05, e.y - v[1] * 0.05, v[0], v[1], 1); t.damageEnemy(e, b);
      const pt = e.pt; return { tread: pt ? pt.tread > 0 : false, barrel: pt ? pt.barrel > 0 : false, engine: pt ? pt.engine > 0 : false, lost: +(100 - e.hp).toFixed(3) }; }"""
    base = {s: ev(page, PART, [0, s]) for s in ('front', 'side', 'rear')}
    at1 = {s: ev(page, PART, [1, s]) for s in ('front', 'side', 'rear')}
    check('antitank_no_card_one_hit_breaks_nothing', not any(any(v[k] for k in ('tread', 'barrel', 'engine')) for v in base.values()), base)
    check('antitank_one_hit_breaks_part', at1['front']['barrel'] and at1['side']['tread'] and at1['rear']['engine'], at1)
    lv = {L: {s: ev(page, PART, [L, s])['lost'] for s in ('front', 'side', 'rear')} for L in (1, 2, 3)}
    check('antitank_front_unchanged', all(abs(lv[L]['front'] - 1) < 0.01 for L in lv), lv)
    check('antitank_side_rear_bonus_per_level', all(abs(lv[L][s] - (1 + 0.15 * L)) < 0.01 for L in lv for s in ('side', 'rear')), lv)
    BOSS = """([L, k]) => { const t = __tank, G = t.G; window.arena(L ? { antitank: L } : {}, 5, 5); t.bossStart(5); t.bossSkip(); t.step(0.5); const e = G.boss; e.parts = []; e.stunT = 0; e.invuln = false; e.angle = 0; e.hp = e.maxHp; Math.random = window.REAL;
      const mx = e.hp, cx = e.x, cy = e.y; const pos = { hull: [cx, cy, 0, 300], tread: [cx, cy + e.spec.wid / 2 - 2, 0, -300] }[k];
      const dir = k === 'hull' ? Math.atan2(-0, -300) : Math.atan2(300, 0); // hull: from the side; tread: shooter on the side
      const b = window.pshell(pos[0], pos[1], k === 'hull' ? 0 : 0, k === 'hull' ? 300 : -300, 1); b.x = pos[0]; b.y = pos[1] + (k === 'tread' ? 0 : 0);
      if (k === 'hull') { t.damageEnemy(e, b); return { lost: +((mx - e.hp)).toFixed(3) }; }
      b.x = e.x + 3; b.y = e.y + e.spec.wid / 2 - 3; b.vx = 0; b.vy = -300; const hp0 = Math.max(...e.tr.map(x => x.hp)); const i = e.tr[1].hp < hp0 ? 1 : 1; const h0 = e.tr[1].hp; t.damageEnemy(e, b); return { tread: +(h0 - e.tr[1].hp).toFixed(3), max: e.tr[1].max }; }"""
    bh0, bh1, bh3 = (ev(page, BOSS, [L, 'hull'])['lost'] for L in (0, 1, 3))
    check('antitank_boss_bonus_halved', bh0 > 0 and abs(bh1 / bh0 - 1.075) < 0.02 and abs(bh3 / bh0 - 1.225) < 0.02, [bh0, bh1, bh3])
    bt0, bt1 = ev(page, BOSS, [0, 'tread']), ev(page, BOSS, [1, 'tread'])
    check('antitank_boss_part_damage_x1_5', bt0['tread'] > 0 and abs(bt1['tread'] / bt0['tread'] - 1.5 * (1 + 0.075)) < 0.05, [bt0, bt1])

    # ---- Eğimli zırh: the chance by direction (hull facing east): front 40/50/60, side 20/25/30, rear 0; boss bullets half; Topçu / heavy / lasers never ----
    CH = """(L) => { const t = __tank, G = t.G; window.arena({ slope: L }); const c = side => +t.slopeChance(window.ebullet(side)).toFixed(3); const cb = side => +t.slopeChance(window.ebullet(side, 300, { boss: true })).toFixed(3);
      return { front: c('E'), side: [c('N'), c('S')], rear: c('W'), bossFront: cb('E'), bossSide: cb('N'), shell: t.slopeChance(window.ebullet('E', 150, { shell: true })), heavy: t.slopeChance(window.ebullet('E', 150, { boss: true, heavy: true })) }; }"""
    c1, c2, c3 = ev(page, CH, 1), ev(page, CH, 2), ev(page, CH, 3)
    check('slope_chance_level1', c1['front'] == 0.4 and c1['side'] == [0.2, 0.2] and c1['rear'] == 0 and c1['bossFront'] == 0.2 and c1['bossSide'] == 0.1, c1)
    check('slope_chance_level2', c2['front'] == 0.5 and c2['side'] == [0.25, 0.25] and c2['rear'] == 0, c2)
    check('slope_chance_level3', c3['front'] == 0.6 and c3['side'] == [0.3, 0.3] and c3['rear'] == 0, c3)
    check('slope_never_shell_or_heavy', all(c['shell'] == 0 and c['heavy'] == 0 for c in (c1, c2, c3)), [c1['shell'], c1['heavy']])
    # the hull, not the turret: turning the hull moves the front
    hullc = ev(page, "(() => { window.arena({ slope: 1 }); const t = __tank, p = t.G.player; p.turret = Math.PI; const a = t.slopeChance(window.ebullet('E')); p.angle = Math.PI; const b = t.slopeChance(window.ebullet('E')); return [a, b]; })()")
    check('slope_uses_hull_facing', hullc == [0.4, 0], hullc)
    DEF = """([L, rnd, kind]) => { const t = __tank, G = t.G; const p = window.arena({ slope: L }); Math.random = () => rnd; let b;
      if (kind === 'bullet') b = window.ebullet('E');
      else if (kind === 'boss') b = window.ebullet('E', 300, { boss: true });
      else if (kind === 'heavy') b = window.ebullet('E', 200, { boss: true, heavy: true, r: 9 });
      else { const e = t.spawn('topcu', p.x + 5 * 48, p.y); e.angle = e.turret = Math.PI; t.topcuFire(e); b = G.bullets.find(x => x.shell); }
      const n0 = G.enemies.length, hp0 = G.enemies.map(e => e.hp); const lost = kind === 'topcu' ? (() => { for (let i = 0; i < 60 * 3 && G.bullets.some(x => x.shell && !x.dead); i++) t.step(1 / 60); return +(p.hp0 === undefined ? 0 : 0); })() : window.fly(b, 1.2);
      Math.random = window.REAL; return { lost: kind === 'topcu' ? +(p.maxHp - p.hp).toFixed(2) : lost, inert: !!b.inert, dfl: b.dfl, enemiesHurt: G.enemies.some((e, i) => hp0[i] !== undefined && e.hp < hp0[i]) }; }"""
    d_hit = ev(page, DEF, [3, 0, 'bullet'])
    d_miss = ev(page, DEF, [3, 0.999, 'bullet'])
    d_none = ev(page, DEF, [0, 0, 'bullet'])
    check('slope_deflected_bullet_harmless', d_hit['lost'] == 0 and d_hit['inert'] and not d_hit['enemiesHurt'], d_hit)
    check('slope_failed_roll_hurts', d_miss['lost'] > 0 and not d_miss['inert'], d_miss)
    check('no_card_no_deflection', d_none['lost'] > 0 and d_none['dfl'] is False, d_none)
    d_boss = ev(page, DEF, [3, 0.25, 'boss'])  # boss front chance 0.3: a roll of 0.25 deflects, 0.35 does not
    d_boss2 = ev(page, DEF, [3, 0.35, 'boss'])
    check('slope_boss_chance_halved', d_boss['lost'] == 0 and d_boss2['lost'] > 0, [d_boss, d_boss2])
    d_heavy = ev(page, DEF, [3, 0, 'heavy']); d_shell = ev(page, DEF, [3, 0, 'topcu'])
    check('slope_never_deflects_heavy_boss_shell', d_heavy['lost'] > 0 and not d_heavy['inert'], d_heavy)
    check('slope_never_deflects_topcu_shell', d_shell['lost'] > 0, d_shell)
    nb = ev(page, """() => { const t = __tank, G = t.G; const p = window.arena({ slope: 3 }); Math.random = () => 0; const hp0 = p.hp; t.damagePlayer({ x: p.x, y: p.y, dmg: 12, owner: 1, vx: 0, vy: 0 }); const a = hp0 - p.hp;
      const hp1 = p.hp; t.bossBlast(p.x, p.y, 60, 20); const bl = hp1 - p.hp; Math.random = window.REAL; return { ram: a, blast: bl }; }""")
    check('slope_never_rams_blasts_lasers', nb['ram'] > 0 and nb['blast'] > 0, nb)

    # ---- Refleks: slides sideways out of the way, cooldown 3 s / 2 s, no walls, no lasers/blasts, after the slope roll ----
    RF = """([L, side, sp]) => { const t = __tank, G = t.G; const p = window.arena({ reflex: L }, 10, 10); const x0 = p.x, y0 = p.y; const b = window.ebullet(side, sp || 300); G.bullets.push(b); let cd0 = null, hp0 = p.hp; for (let i = 0; i < 60 && !b.dead; i++) { t.step(1 / 60); if (cd0 === null && p.rf) cd0 = +p.rfCd.toFixed(2); } const lost = +(hp0 - p.hp).toFixed(2);
      return { cd0, lost, dx: +(p.x - x0).toFixed(1), dy: +(p.y - y0).toFixed(1), cd: +p.rfCd.toFixed(2), rf: !!p.rf }; }"""
    r1 = ev(page, RF, [1, 'E']); r2 = ev(page, RF, [2, 'E']); r3 = ev(page, RF, [1, 'N'])
    check('reflex_card_rare_max2', ev(page, "(() => [__tank.UPS.reflex.rare, __tank.UPS.reflex.max])()") == [True, 2])
    check('reflex_slides_perpendicular_and_avoids_hit', r1['lost'] == 0 and abs(r1['dx']) < 2 and 28 <= abs(r1['dy']) <= 50 and r3['lost'] == 0 and abs(r3['dy']) < 2 and 28 <= abs(r3['dx']) <= 50, [r1, r3])
    check('reflex_cooldown_3s_level1_2s_level2', 2.95 <= r1['cd0'] <= 3.0 and 1.95 <= r2['cd0'] <= 2.0, [r1['cd0'], r2['cd0']])
    # without the card the same bullet hits
    r0 = ev(page, RF, [0, 'E']); check('no_card_no_slide', r0['lost'] > 0 and r0['dx'] == 0 and r0['dy'] == 0, r0)
    # the slide takes about 0.12 s
    tm = ev(page, """() => { const t = __tank, G = t.G; const p = window.arena({ reflex: 1 }, 10, 10); const y0 = p.y; G.bullets.push(window.ebullet('E', 300)); let t0 = null, t1 = null;
      for (let i = 0; i < 60 && t1 === null; i++) { t.step(1 / 60); if (t0 === null && p.rf) t0 = i; if (t0 !== null && !p.rf) t1 = i; } return { frames: t1 - t0, d: +Math.abs(p.y - y0).toFixed(1) }; }""")
    check('reflex_slide_takes_about_0_12s', 5 <= tm['frames'] <= 10, tm)
    # cooldown: a second bullet during it hits, one after it slides again
    cdn = ev(page, """() => { const t = __tank, G = t.G; const p = window.arena({ reflex: 1 }, 10, 10); const a = window.fly(window.ebullet('E'), 0.6); const b2 = window.fly(window.ebullet('W'), 0.6); t.step(3.2); const y0 = p.y, x0 = p.x; const c = window.fly(window.ebullet('E'), 0.6);
      return { first: a, during: b2, after: c, moved: Math.hypot(p.x - x0, p.y - y0) > 20 }; }""")
    check('reflex_cooldown_blocks_second_slide', cdn['first'] == 0 and cdn['during'] > 0 and cdn['after'] == 0 and cdn['moved'], cdn)
    # topcu shell: the slide takes the player out of it; it explodes where it lands
    ts = ev(page, """() => { const t = __tank, G = t.G; const p = window.arena({ reflex: 1 }, 10, 10); const e = t.spawn('topcu', p.x + 6 * 48, p.y); e.angle = e.turret = Math.PI; t.topcuFire(e); const sh = G.bullets.find(x => x.shell); const x0 = p.x, y0 = p.y;
      for (let i = 0; i < 60 * 7 && !sh.dead; i++) t.step(1 / 60); return { lost: +(p.maxHp - p.hp).toFixed(2), moved: +Math.hypot(p.x - x0, p.y - y0).toFixed(1), dead: sh.dead, hitP: !!sh.hitP, cd: +p.rfCd.toFixed(2) }; }""")
    check('reflex_dodges_topcu_shell', ts['lost'] == 0 and ts['moved'] >= 28 and ts['dead'] and not ts['hitP'], ts)
    # walls: never slides into one; one side blocked -> the other side; both blocked -> the bullet passes through, harmless, cooldown spent
    wl = ev(page, """() => { const t = __tank, G = t.G, m = G.map, n = m.n, I = (c, r) => r * n + c; const out = {};
      // a steel tile directly north of the player: a bullet from the east sends it south (the way away from the bullet line is picked first, the free side second)
      let p = window.arena({ reflex: 1 }, 10, 10); m.t[I(10, 9)] = 2; p.y -= 6; p.x = 10 * 48 + 24; let b = window.ebullet('E'); b.y = p.y - 8; const lost1 = window.fly(b, 0.6); out.north = { lost: lost1, free: window.freeOf(p.x, p.y), r: [p.x | 0, p.y | 0], tileY: Math.floor(p.y / 48) };
      // corridor: steel above and below -> no room
      p = window.arena({ reflex: 1 }, 10, 10); for (const dx of [-1, 0, 1, 2]) { m.t[I(10 + dx, 9)] = 2; m.t[I(10 + dx, 11)] = 2; } const x0 = p.x, y0 = p.y; b = window.ebullet('E'); const lost2 = window.fly(b, 0.8);
      out.corridor = { lost: lost2, moved: Math.hypot(p.x - x0, p.y - y0), cd: +p.rfCd.toFixed(2), rf: !!p.rf };
      // a map edge: the player at the left edge, a bullet from the south pushes sideways (west is out of the map)
      p = window.arena({ reflex: 1 }, 1, 10); b = window.ebullet('S'); const lost3 = window.fly(b, 0.8); out.edge = { lost: lost3, free: window.freeOf(p.x, p.y), x: p.x | 0 };
      return out; }""")
    check('reflex_never_into_wall_uses_free_side', wl['north']['lost'] == 0 and wl['north']['free'] and wl['north']['tileY'] >= 10, wl['north'])
    check('reflex_no_room_passes_through', wl['corridor']['lost'] == 0 and wl['corridor']['moved'] < 1 and 1.5 <= wl['corridor']['cd'] <= 3.0, wl['corridor'])
    check('reflex_stays_on_the_map', wl['edge']['lost'] == 0 and wl['edge']['free'] and wl['edge']['x'] >= 48, wl['edge'])
    # blasts, rings, rams, lasers: no slide
    nr = ev(page, """() => { const t = __tank, G = t.G; const p = window.arena({ reflex: 2 }); const x0 = p.x, y0 = p.y; const hp0 = p.hp; t.damagePlayer({ x: p.x, y: p.y, dmg: 10, owner: 1, vx: 0, vy: 0 }); t.bossBlast(p.x, p.y, 60, 20); t.step(0.3);
      return { lost: hp0 - p.hp, cd: p.rfCd, moved: Math.hypot(p.x - x0, p.y - y0) }; }""")
    check('reflex_ignores_blasts_rams_lasers', nr['lost'] > 0 and nr['cd'] == 0 and nr['moved'] < 1, nr)
    # the order: Eğimli zırh rolls first; a deflection means no Refleks
    od = ev(page, """() => { const t = __tank, G = t.G; const p = window.arena({ reflex: 1, slope: 3 }, 10, 10); Math.random = () => 0; const lost = window.fly(window.ebullet('E'), 0.8); Math.random = window.REAL; const dfl = { lost, cd: p.rfCd, rf: !!p.rf };
      const q = window.arena({ reflex: 1, slope: 3 }, 10, 10); Math.random = () => 0.99; const lost2 = window.fly(window.ebullet('E'), 0.8); Math.random = window.REAL; return { dfl, miss: { lost: lost2, cd: q.rfCd } }; }""")
    check('reflex_not_used_when_slope_deflects', od['dfl']['lost'] == 0 and od['dfl']['cd'] == 0 and not od['dfl']['rf'], od['dfl'])
    check('reflex_used_when_slope_roll_fails', od['miss']['lost'] == 0 and od['miss']['cd'] > 2, od['miss'])

    # ---- Nükleer bomba, boss stage: fills at 34% of the boss HP, at most once per fight; normal waves unchanged ----
    nk = ev(page, """() => { const t = __tank, G = t.G; window.arena({}); t.bossStart(10); t.bossSkip(); t.step(0.5); const e = G.boss; e.invuln = false; const mx = e.maxHp; G.nuke.meter = 0; G.nuke.bossAcc = 0; G.nuke.bossWave = G.wave; const out = {};
      t.nukeOnBossDamage(e, mx * 0.17); out.half = +G.nuke.meter.toFixed(3); t.nukeOnBossDamage(e, mx * 0.17); out.first = +G.nuke.meter.toFixed(3);
      t.nukeOnBossDamage(e, mx * 0.5); out.full = +G.nuke.meter.toFixed(3); G.nuke.meter = 0; t.nukeOnBossDamage(e, mx * 0.34); out.second = +G.nuke.meter.toFixed(3); out.fill = t.NUKE_BOSS_FILL; return out; }""")
    check('nuke_boss_fill_34_percent_once', nk['half'] == 0.5 and nk['first'] == 1 and nk['full'] == 1 and nk['second'] == 0 and nk['fill'] == 0.34, nk)
    nw = ev(page, """() => { const t = __tank, G = t.G; window.arena({}); G.wave = 8; G.phase = 'fight'; G.nuke.meter = 0; G.nuke.firing = false; const e = t.spawn('basic', G.player.x + 200, G.player.y); t.nukeOnKill(e); return { d: G.nuke.meter, want: t.NUKE_WEIGHT.basic / (t.NUKE_WAVES * t.nukeWaveWeight(8)), waves: t.NUKE_WAVES }; }""")
    check('nuke_normal_waves_unchanged', nw['waves'] == 3.5 and abs(nw['d'] - nw['want']) < 1e-9 and nw['d'] > 0.005, nw)
    # the real thing: the bot fights a wave-10 boss with medium cards, the bomb is ready about the middle of the fight and at most twice
    fights = ev(page, """() => { const out = []; for (let i = 0; i < 4; i++) { Math.random = window.REAL; out.push(__tank.bossFight(10, { armor: 2, caliber: 2, engine: 1, loader: 2, barrel: 1, repair: 1 }, 'std', 400, null, true)); } return out; }""")
    shares = [f['nukeReady'][0] / f['secs'] for f in fights if f['win'] and f['nukeReady']]
    check('nuke_boss_ready_in_the_middle', len(shares) >= 3 and 0.3 <= sum(shares) / len(shares) <= 0.62 and all(len(f['nukeReady']) <= 1 for f in fights), [[round(s, 2) for s in shares], [f['nukeReady'] for f in fights]])
    b.close()

errs = real_errors()
check('no_page_errors', not errs, errs[:3])
print('check_cards155:', 'FAILED ' + ', '.join(FAILS) if FAILS else 'all ok')
print('ERRORS:', errs or 'none')
sys.exit(1 if FAILS else 0)
