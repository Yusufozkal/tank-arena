"""Part damage (docs/BOSSES.md section 2): normal enemies lose a tread / barrel / engine by hit direction, bosses have treads with HP and barrels that go silent.
Usage: TANK_TEST_PORT=8840 python3 tests/check_parts.py     (phone screenshot: .tmp/parts_p390.png)"""
from common import *  # noqa: F401,F403

report_on_exit('check_parts', R)
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
  // one player shell flying at tank e from the direction `a` (angle of the shooter seen from e); vol: volley id (default a new one); returns after the shell landed
  window.shoot = (e, a, o) => {
    o = o || {}; const d = 36, x = e.x + Math.cos(a) * d, y = e.y + Math.sin(a) * d;
    const b = { x, y, vx: -Math.cos(a) * 600, vy: -Math.sin(a) * 600, r: 4, owner: 0, dmg: o.dmg || 2, life: 2, big: false, dead: false, pierce: false, bounce: 0, splash: null, look: 'player',
      hits: null, bricks: null, sx: x, sy: y, dist: 0, bounced: false, vol: o.vol === undefined ? ++window.VOL : o.vol, volN: 1, pn: 0, h: 0 };
    G.bullets.push(b); for (let i = 0; i < 6 && !b.dead; i++) t.stepBullets(1 / 60); return b.dead;
  };
  window.fresh = (x, y, type, ang) => { const e = t.spawn(type || 'basic', x, y); e.hp = e.maxHp = 1000; e.angle = ang || 0; e.turret = ang || 0; e.cool = 99; return e; };
}"""

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = new_ctx(b, 'desktop', viewport={'width': 1000, 'height': 760})
    page = ctx.new_page(); seed(page)
    page.click('#btnStart'); page.wait_for_timeout(300)
    ev(page, "(() => { const G = __tank.G; G.god = true; __tank.dbg.freeze = true; __tank.killAll(); __tank.clearArena(); })()")
    ev(page, HELPERS)
    ev(page, "(() => { const G = __tank.G, p = G.player; p.x = 2.5 * 48; p.y = 2.5 * 48; })()")  # the player waits in a corner

    PT = ev(page, '__tank.PART_T')
    # ---- break by direction: side tread, front barrel, rear engine ----
    out = ev(page, """() => { const o = {}; const read = e => __tank.partInfo(e);
      for (const [k, a] of [['side', Math.PI / 2], ['front', 0], ['rear', Math.PI]]) { const e = fresh(600, 600); window.shoot(e, a); o[k] = read(e); e.dead = true; }
      const e = fresh(600, 600); window.shoot(e, -Math.PI / 2); o.sideL = e.pt.side; e.dead = true;
      const e2 = fresh(600, 600); window.shoot(e2, Math.PI / 2); o.sideR = e2.pt.side; e2.dead = true; __tank.G.enemies = []; return o; }""")
    check('side_hit_breaks_tread', abs(out['side']['tread'] - PT['tread']) < 0.01 and out['side']['barrel'] == 0 and out['side']['engine'] == 0, out['side'])
    check('front_hit_jams_barrel', abs(out['front']['barrel'] - PT['barrel']) < 0.01 and out['front']['tread'] == 0 and out['front']['engine'] == 0, out['front'])
    check('rear_hit_damages_engine', abs(out['rear']['engine'] - PT['engine']) < 0.01 and out['rear']['tread'] == 0 and out['rear']['barrel'] == 0, out['rear'])
    check('tread_side_follows_hit', out['sideL'] == 0 and out['sideR'] == 1, [out['sideL'], out['sideR']])

    # ---- tread: cannot move for 2.5 s, turret still turns; ring; repair; 1.5 s immunity ----
    tr = ev(page, """() => { const t = __tank, G = t.G, o = {}; G.enemies = [];
      const a = fresh(700, 700), c = fresh(700, 300); a.cool = c.cool = 99; a.hp = c.hp = c.maxHp = a.maxHp = 1e6;
      for (const q of [a, c]) q.canSee = false;
      window.shoot(a, Math.PI / 2); const ax = a.x, ay = a.y, cx = c.x, cy = c.y;
      const ang0 = a.turret; G.player.x = 120; G.player.y = 700; // the turret has something to follow
      t.step(0.8); o.movedBroken = Math.hypot(a.x - ax, a.y - ay); o.movedControl = Math.hypot(c.x - cx, c.y - cy); o.left = a.pt.tread;
      t.step(0.6); o.at24 = a.pt.tread; t.step(0.2); o.after = a.pt.tread; o.imm = +a.pt.imm.tread.toFixed(2);
      window.shoot(a, Math.PI / 2); o.immuneHit = a.pt.tread;               // right after the repair: cannot break again
      t.step(1.5); a.angle = 0; window.shoot(a, Math.PI / 2); o.again = +a.pt.tread.toFixed(2); // after 1.5 s: can
      G.enemies = []; return o; }""")
    check('tread_blocks_movement', tr['movedBroken'] < 1 and tr['movedControl'] > 1 and tr['at24'] > 0 and tr['after'] == 0, tr)
    check('repair_then_immune_1_5s', 1.3 < tr['imm'] <= 1.5 and tr['immuneHit'] == 0, tr)
    check('breaks_again_after_immunity', tr['again'] > PT['tread'] - 0.1, tr)

    # ---- barrel: cannot fire for 2 s, then it fires; engine: half speed ----
    bj = ev(page, """() => { const t = __tank, G = t.G, o = {}; G.enemies = []; const p = G.player; p.x = 700; p.y = 300;
      const mk = () => { const e = fresh(700, 560, 'basic', -Math.PI / 2); e.cool = 0; e.canSee = true; e.senseT = 99; e.distP = 260; e.hp = e.maxHp = 1e6; return e; };
      const e = mk(), c = mk(); c.x = 500; c.y = 560; window.shoot(e, -Math.PI / 2); const t0 = G.time; o.jam = e.pt.barrel;
      t.step(1.1); o.firedWhileJam = e.lastShot > t0; o.controlFired = c.lastShot > t0;
      t.step(0.5); o.firedAfter = e.lastShot > t0 + 1.1; G.enemies = []; return o; }""")
    check('barrel_jam_blocks_fire', bj['jam'] > PT['barrel'] - 0.1 and not bj['firedWhileJam'] and bj['controlFired'] and bj['firedAfter'], bj)
    en = ev(page, """() => { const t = __tank, G = t.G, o = {}; G.enemies = []; const p = G.player; p.x = 900; p.y = 900;
      const mk = (x, y) => { const e = fresh(x, y, 'basic', 0); e.speedMul = 1; e.cool = 99; return e; };
      const a = mk(150, 300), c = mk(150, 560); window.shoot(a, Math.PI); let ma = 0, mc = 0;
      for (let i = 0; i < 100; i++) { t.step(1 / 60); ma = Math.max(ma, Math.hypot(a.avx, a.avy)); mc = Math.max(mc, Math.hypot(c.avx, c.avy)); }
      o.broken = ma; o.control = mc; o.ratio = ma / Math.max(1, mc); o.left = a.pt.engine; G.enemies = []; return o; }""")
    check('engine_half_speed', 0.3 < en['ratio'] < 0.7 and en['left'] > 0, en)

    # ---- volley counts once; lob and flame do not break ----
    vo = ev(page, """() => { const o = {}; __tank.G.enemies = [];
      const a = fresh(600, 600); window.shoot(a, Math.PI / 2, { vol: 7 }); window.shoot(a, 0, { vol: 7 }); o.same = [a.pt.tread > 0, a.pt.barrel > 0];
      window.shoot(a, 0, { vol: 8 }); o.next = [a.pt.tread > 0, a.pt.barrel > 0];
      const e = fresh(300, 600); __tank.partBreak(e, { owner: 0, lob: { kind: 'obus' }, vx: -1, vy: 0, vol: 20 }); o.lob = !e.pt;
      const e2 = fresh(300, 900); __tank.partBreak(e2, { owner: 1, vx: -1, vy: 0, vol: 0 }); o.enemyShell = !e2.pt;
      const f = fresh(300, 300); for (let i = 0; i < 30; i++) __tank.hurtEnemy(f, 0.001, f.x, f.y, 0, true); o.flame = !f.pt; return o; }""")
    check('volley_counts_once', vo['same'] == [True, False] and vo['next'] == [True, True], vo)
    check('lob_flame_enemy_shells_do_not_break', vo['lob'] and vo['flame'] and vo['enemyShell'], vo)
    # the real Obüs lob shell
    real = ev(page, """() => { const t = __tank, G = t.G, p = G.player; G.enemies = []; if (!t.TANKS.obus) return null;
      t.setTank('obus'); G.god = true; p.x = 600; p.y = 600; p.turret = 0; p.angle = 0; p.aimDist = 5 * 48; p.cool = 0;
      const e = fresh(600 + 5 * 48, 600, 'basic', Math.PI); e.hp = e.maxHp = 1e6; t.fire(); t.step(2.2);
      const o = { hurt: e.hp < e.maxHp, pt: !!e.pt }; t.setTank('std'); G.enemies = []; return o; }""")
    check('obus_lob_hurts_but_breaks_nothing', real is not None and real['hurt'] and not real['pt'], real)

    # ---- damage threshold: hits add up per part and direction; below PART_HP nothing breaks ----
    acc = ev(page, """() => { const o = {}; const e = fresh(600, 600), P = __tank.PART_HP;
      window.shoot(e, Math.PI / 2, { dmg: P / 2 }); o.one = e.pt ? e.pt.tread : 0;
      window.shoot(e, 0, { dmg: P / 2 }); o.otherPart = [e.pt.tread, e.pt.barrel];
      window.shoot(e, Math.PI / 2, { dmg: P / 2 }); o.two = e.pt.tread; o.acc = e.pt.acc.tread; e.dead = true; __tank.G.enemies = []; o.hp = P; return o; }""")
    check('part_breaks_by_accumulated_damage', acc['one'] == 0 and acc['otherPart'][0] == 0 and acc['otherPart'][1] == 0 and acc['two'] > 0 and acc['acc'] == 0, acc)

    # ---- after wave 20 repairs are 30% faster ----
    w = ev(page, """() => { const G = __tank.G, o = {}; G.enemies = [];
      for (const wv of [20, 21]) { G.wave = wv; G.enemies = []; const e = fresh(600, 600); window.shoot(e, Math.PI / 2); o[wv] = e.pt ? +e.pt.tread.toFixed(3) : ['nopt', e.dead, e.hp, G.enemies.length, G.state, G.phase, G.player.alive]; } G.wave = 3; G.enemies = []; return o; }""")
    check('repair_30pct_faster_after_wave_20', abs(w['20'] - PT['tread']) < 0.01 and abs(w['21'] - PT['tread'] / 1.3) < 0.01, w)

    # ---- the player is never affected ----
    pl = ev(page, """() => { const t = __tank, G = t.G, p = G.player, o = {}; G.enemies = []; G.god = false; p.hp = p.maxHp; p.x = 600; p.y = 600; const sp = p.spec.speed;
      for (const a of [0, Math.PI / 2, Math.PI]) { const x = p.x + Math.cos(a) * 30, y = p.y + Math.sin(a) * 30;
        G.bullets.push({ x, y, vx: -Math.cos(a) * 400, vy: -Math.sin(a) * 400, r: 4, owner: 1, dmg: 1, life: 1, big: false, dead: false, pierce: false, bounce: 0, splash: null, look: 'enemy', hits: null, bricks: null, sx: x, sy: y, dist: 0, bounced: false, vol: 0, volN: 0, pn: 0 });
        t.stepBullets(1 / 30); t.stepBullets(1 / 30); }
      o.hurt = p.hp < p.maxHp; o.pt = !!p.pt; o.spec = p.spec.speed === sp; G.god = true; return o; }""")
    check('player_never_affected', pl['hurt'] and not pl['pt'] and pl['spec'], pl)

    # ---- bosses: treads with HP, 4 s halt, +50% on the second break ----
    ev(page, "localStorage.setItem('tankArena.seenBossIntro', 'true'); __tank.G.god = true; __tank.wave(5); __tank.bossSkip(); __tank.step(0.2)")
    ev(page, "(() => { const e = __tank.G.boss; e.cool = 99; __tank.G.player.x = e.x; __tank.G.player.y = e.y + 8 * 48; })()")
    bo = ev(page, """() => { const t = __tank, G = t.G, e = G.boss, o = {}; e.angle = e.turret = Math.PI / 2; const shot = (a, d) => t.hurtBoss(d, e.x + Math.cos(a) * 40, e.y + Math.sin(a) * 40, a);
      o.max = e.maxHp; o.tr = t.partInfo().tr.map(x => x.max); const hp0 = e.hp;
      shot(Math.PI, 5); o.hit1 = t.partInfo().tr[1].hp; o.hullTook = hp0 - e.hp;                // dir = angle + 90deg: the shooter is on the hull's right (index 1)
      shot(Math.PI, 20); o.br = t.partInfo().tr[1]; o.halt = t.partInfo().treadT;
      const x0 = e.x, y0 = e.y; t.step(3.8); o.moved = Math.hypot(e.x - x0, e.y - y0); o.left = t.partInfo().treadT;
      t.step(0.5); o.after = t.partInfo().tr; o.moves = t.partInfo().treadT;
      shot(Math.PI, 20); o.second = t.partInfo().tr[1].t; shot(Math.PI, 6); o.second2 = t.partInfo().tr[1].t; o.left2 = t.partInfo().tr[0];
      return o; }""")
    check('boss_tread_hp_8pct', bo['tr'] == [round(bo['max'] * 0.08)] * 2, bo['tr'])
    check('boss_tread_takes_side_hits_and_hull_too', bo['hit1'] < bo['tr'][1] and bo['hullTook'] > 4.9, [bo['hit1'], bo['hullTook']])
    check('boss_tread_break_halts_4s', bo['br']['br'] == 1 and abs(bo['halt'] - 4) < 0.01 and bo['moved'] < 1 and bo['left'] > 0, bo)
    check('boss_tread_repaired_refilled_plus50', bo['after'][1]['t'] == 0 and bo['after'][1]['max'] == int(bo['tr'][1] * 1.5 + 0.5) and bo['after'][1]['hp'] == bo['after'][1]['max'], bo['after'])
    check('boss_second_break_needs_50pct_more', bo['second'] == 0 and bo['second2'] > 3.9 and bo['left2']['t'] == 0, [bo['second'], bo['second2']])

    # ---- charge cancelled by a tread break during the red line; not before ----
    ch = ev(page, """() => { const t = __tank, G = t.G, e = G.boss, o = {}; G.enemies = [e]; e.cool = 99; t.step(5); e.stunT = 0; e.angle = e.turret = Math.PI / 2; G.tele.length = 0;
      const at = e.def.attacks.find(a => a.id === 'ezme'); e.atkId = 'ezme'; e.gen = at.run(e); e.wait = 0; e.distP = 400; t.step(0.4);
      o.line = G.tele.some(x => x.kind === 'line'); o.atk = e.atkId;
      t.hurtBoss(e.maxHp * 0.1, e.x + 40, e.y, 0); // from the hull's left side: the other tread (full HP, 8%)
      o.atkAfter = e.atkId; o.tele = G.tele.length; o.cancels = e.cancels; o.treadT = e.treadT; o.okMov = e.def.attacks.filter(a => a.mov).map(a => a.id);
      return o; }""")
    check('tread_break_cancels_charge', ch['line'] and ch['atk'] == 'ezme' and ch['atkAfter'] == '' and ch['tele'] == 0 and ch['cancels'] == 1 and ch['treadT'] > 3.9, ch)
    check('charge_not_started_while_tread_broken', ch['okMov'] == ['ezme'], ch['okMov'])

    # ---- barrel: accumulated hits silence the middle barrel for 3 s; a glow in progress is cancelled ----
    ba = ev(page, """() => { const t = __tank, G = t.G, e = G.boss, o = {}; t.step(5); e.stunT = 0; e.x = 10.5 * 48; e.y = 12.5 * 48; e.angle = e.turret = Math.PI / 2; G.tele.length = 0; e.cool = 99; e.gen = null; e.atkId = ''; const c0 = e.cancels;
      const front = d => t.hurtBoss(d, e.x + Math.cos(Math.PI / 2) * 56, e.y + Math.sin(Math.PI / 2) * 56, Math.PI / 2);
      o.thr = t.partInfo().bars[0].thr; front(o.thr * 0.4); front(o.thr * 0.4); o.acc = t.partInfo().bars[0]; // below the threshold
      const at = e.def.attacks.find(a => a.id === 'triple'); e.atkId = 'triple'; e.gen = at.run(e); e.wait = 0; t.step(0.2); o.glow = G.tele.some(x => x.kind === 'glow');
      front(o.thr * 0.4); const bar = t.partInfo().bars[0]; o.silent = bar.t; o.atkAfter = e.atkId; o.tele = G.tele.length; o.cancels = e.cancels - c0;
      const cnt = () => { G.bullets = G.bullets.filter(b => b.owner !== 1); bossVolleyDbg(); return G.bullets.filter(b => b.owner === 1).length; };
      o.shellsSilent = cnt(); t.step(2.9); o.still = t.partInfo().bars[0].t > 0; t.step(0.2); o.back = t.partInfo().bars[0].t; o.shellsAfter = cnt();
      return o;
      function bossVolleyDbg() { t.bossVolley(e, [-0.2, 0, 0.2]); } }""")
    check('barrel_below_threshold_no_silence', ba['acc']['t'] == 0 and ba['acc']['acc'] > 0, ba['acc'])
    check('barrel_silent_3s_cancels_glow', ba['glow'] and abs(ba['silent'] - 3) < 0.01 and ba['atkAfter'] == '' and ba['tele'] == 0 and ba['cancels'] == 1, ba)
    check('silent_barrel_skips_its_shell', ba['shellsSilent'] == 2 and ba['still'] and ba['back'] == 0 and ba['shellsAfter'] == 3, ba)

    # ---- the bot plays a stretch of the boss fight ----
    bot = ev(page, """() => { const t = __tank, G = t.G; G.enemies = [G.boss]; G.boss.cool = 1; t.dbg.freeze = false; t.sim(60, true); t.dbg.freeze = true; const e = G.boss; const info = e && e.tr ? t.partInfo() : null;
      return { alive: !!e, breaks: info ? info.tr[0].br + info.tr[1].br : -1, cancels: info ? info.cancels : -1, hp: e ? +(e.hp / e.maxHp).toFixed(2) : 0 }; }""")
    R['bot_60s'] = bot
    vprint('bot 60 s:', bot)

    # ---- phone screenshot: a broken tread, a jammed barrel and a damaged engine ----
    ctx2 = new_ctx(b, 'phone', viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ph = ctx2.new_page(); seed(ph)
    ph.tap('#btnStart'); ph.wait_for_timeout(400)
    ev(ph, HELPERS)
    ev(ph, """() => { const t = __tank, G = t.G; G.god = true; t.dbg.freeze = true; t.killAll(); t.clearArena(); const p = G.player; p.x = 600; p.y = 600; p.angle = p.turret = -Math.PI / 2;
      const mk = (dx, dy, a) => { const e = fresh(p.x + dx, p.y + dy, 'basic', Math.PI / 2); e.turret = Math.PI / 2; e.hp = e.maxHp = 1e6; window.shoot(e, a); return e; };
      mk(-70, -150, Math.PI / 2); mk(70, -150, 0); mk(0, -250, Math.PI); mk(-110, -60, Math.PI / 2);
      t.step(0.35); t.step(0.3); const q = G.enemies.length; return q; }""")
    ev(ph, "document.getElementById('hint').classList.remove('show'); document.getElementById('banner').classList.remove('show')")
    ph.wait_for_timeout(120)
    os.makedirs(str(TMP), exist_ok=True)
    ph.screenshot(path=str(TMP / 'parts_p390.png'))
    ctx2.close()
    b.close()

errs = real_errors()
check('no_page_errors', not errs, errs[:3])
print('check_parts:', 'FAILED ' + ', '.join(FAILS) if FAILS else 'all ok')
print('ERRORS:', errs or 'none')

sys.exit(1 if FAILS else 0)
