"""Nuclear bomba (1.5): whole-map blast, boss damage by wave (150 up to wave 15, +6 per wave, at most 30% of max HP, floor 10%, 3 s stun), boss-stage charging; the meter fills over kills, the effect, pause freezes the warning, key N, resume keeps the meter.
Waves-to-fill is measured with the autopilot and bot.nuke off (kills made by the nuke itself never count). Screenshots under .tmp/shots."""
from common import *  # noqa: F401,F403

report_on_exit('check_nuke', R)
FIND_FILL = """(w0) => { const t = __tank, G = t.G; t.wave(w0); G.nuke.meter = 0; const k0 = G.kills; let wStart = w0, killsAtWave = G.kills, last = G.wave, total = 0;
  for (let i = 0; i < 40000 && !t.nuke().ready; i++) {
    t.sim(1 / 60, true);
    if (G.wave !== last) { last = G.wave; killsAtWave = G.kills; }
  }
  const left = G.queue.length + G.enemies.length + G.portals.length, done = G.kills - killsAtWave;
  return { start: w0, wave: G.wave, waves: +((G.wave - w0) + done / Math.max(1, done + left)).toFixed(2), ready: t.nuke().ready }; }"""

with sync_playwright() as p:
    b = p.chromium.launch()
    # ---------- desktop ----------
    ctx = new_ctx(b, 'desktop', viewport={'width': 1280, 'height': 800})
    ctx.add_init_script("window.claude = { hot: { snapshot: fn => { window.__snapFn = fn; } } };")
    page = ctx.new_page(); seed(page)
    page.click('#btnStart'); page.wait_for_timeout(300)

    # 1. meter fill (autopilot, bot.nuke off)
    fills = [page.evaluate(FIND_FILL, w0) for w0 in (1, 6, 11, 21)]
    R['fill'] = fills
    for f in fills:
        assert f['ready'] and 2.0 <= f['waves'] <= 4.2, f'meter should fill in about 3 waves: {f}'
    vprint('waves to fill (start wave -> waves):', [(f['start'], f['waves']) for f in fills])

    # 2. effect on a normal wave
    page.evaluate("__tank.G.god = true; __tank.wave(3);"); page.wait_for_timeout(2700)
    setup = """() => { const t = __tank, G = t.G, p = G.player; G.queue.length = 0; G.portals.length = 0; G.enemies.length = 0; G.pickups.length = 0; G.mods.drop = 1000;
      const on = [t.spawn('basic', p.x + 90, p.y - 120), t.spawn('fast', p.x - 100, p.y - 90), t.spawn('heavy', p.x + 30, p.y - 160)];
      const far = t.spawn('basic', p.x, p.y + 4000); // far off screen: the whole-map blast kills it too
      G.bullets.push({ x: p.x + 40, y: p.y - 40, vx: 0, vy: 0, r: 4, owner: 1, dmg: 1, life: 5, dead: false, hits: null, bricks: null, sx: 0, sy: 0, dist: 0, bounced: false });
      t.nukeCharge(1); return { on: on.length, far: !!far, onScreen: t.nuke().onScreen, enemyShells: G.bullets.filter(b => b.owner === 1).length }; }"""
    R['effect_setup'] = page.evaluate(setup); assert R['effect_setup']['onScreen'] == 4, R['effect_setup']  # debug name kept: counts every living enemy on the map
    k0 = page.evaluate('__tank.G.kills')
    assert page.evaluate('__tank.nukeFire()') is True
    R['warn'] = page.evaluate('__tank.nuke()'); assert R['warn']['warnT'] > 0
    page.screenshot(path=f'{OUT}/nuke_d_warn.png')
    page.wait_for_timeout(1700)
    R['effect'] = page.evaluate("""() => { const t = __tank, G = t.G; return { meter: t.nuke().meter, used: t.nuke().used, alive: G.enemies.filter(e => !e.dead).length, shells: G.bullets.filter(b => b.owner === 1).length,
      pickups: G.pickups.length, dropMod: G.mods.drop, kills: G.kills }; }""")
    assert R['effect']['meter'] == 0 and R['effect']['used'] == 1, R['effect']
    assert R['effect']['alive'] == 0 and R['effect']['shells'] == 0 and R['effect']['pickups'] == 0 and R['effect']['dropMod'] == 1000, R['effect']
    assert R['effect']['kills'] - k0 == 4, R['effect']
    vprint('effect:', R['effect'])

    # 3. kills made by the nuke do not refill the meter; ordinary kills do
    page.evaluate("(() => { const t = __tank, p = t.G.player; t.G.nuke.meter = 0; t.spawn('basic', p.x + 60, p.y - 90); t.killAll(); })()")
    R['meter_after_normal_kill'] = page.evaluate('__tank.nuke().meter'); assert R['meter_after_normal_kill'] > 0, 'a normal kill must fill the meter'

    # 4. boss stage, real fight at wave 5 and wave 35: blast damage by wave, floor 10%, 3 s stun, hazards cleared,
    #    no blast while invulnerable (phase transition), body hits charge the meter once per fight
    START = """(w) => { const t = __tank, G = t.G; t.dbg.freeze = true; G.god = true; localStorage.setItem('tankArena.seenBossIntro', 'true'); t.wave(w); t.bossSkip();
      for (let i = 0; i < 1200; i++) { t.step(1 / 60); const b = t.bossInfo(); if (b.phase === 'fight' && b.boss && !b.invuln) return i; }
      return -1; }"""
    BLAST = """() => { const t = __tank, G = t.G, e = G.boss, mx = e.maxHp; e.hp = mx; e.stunT = 0; G.nuke.bossAcc = 0;
      t.nukeCharge(1); const fired = t.nukeFire(); const u0 = t.nuke().used; let before = e.hp, n = 0;
      while (t.nuke().used === u0 && n < 300) { before = e.hp; t.step(1 / 60); n++; }
      const o = { fired, wave: G.wave, mx, want: Math.min(0.3 * mx, 150 + 6 * Math.max(0, G.wave - 15)), dmg: before - e.hp, hp: e.hp,
        stunAfter: e.stunT, tele: G.tele.length, shells: G.bullets.filter(b => b.owner === 1).length, meter: t.nuke().meter, dead: !!e.dead };
      const x0 = e.x, y0 = e.y; t.step(1); o.moved = Math.hypot(e.x - x0, e.y - y0); o.stunLeft = e.stunT; return o; }"""
    FLOOR = """() => { const t = __tank, G = t.G, e = G.boss, mx = e.maxHp; e.stunT = 0; e.hp = 0.12 * mx;
      for (let i = 0; i < 420; i++) t.step(1 / 60); // the phase changes this low HP triggers finish first (no damage while invulnerable)
      const ok = !e.invuln; t.nukeCharge(1); t.nukeFire(); const u0 = t.nuke().used; let n = 0;
      while (t.nuke().used === u0 && n < 300) { t.step(1 / 60); n++; }
      return { ok, hp: e.hp, floor: 0.1 * mx, dead: !!e.dead }; }"""
    BOT = """() => { const t = __tank, G = t.G, e = G.boss, o = {}; for (let i = G.enemies.length - 1; i >= 0; i--) if (G.enemies[i] !== e) G.enemies.splice(i, 1);
      G.queue.length = 0; G.portals.length = 0; e.hp = e.maxHp; e.stunT = 0; e.trans = 1.5; e.invuln = true; t.nukeCharge(1); t.botNuke(true);
      const u0 = t.nuke().used; t.sim(1.0, true); o.blocked = t.nuke().used - u0 + (t.nuke().warnT > 0 ? 1 : 0); o.invulnKept = e.invuln;
      e.trans = 0; e.invuln = false; t.sim(0.1, true); o.fired = t.nuke().warnT > 0 || t.nuke().used > u0; t.botNuke(false); t.step(1.4); return o; }"""
    CHARGE = """() => { const t = __tank, G = t.G, e = G.boss, mx = e.maxHp, o = {}; e.hp = mx; e.stunT = 0; e.invuln = false; e.trans = 0;
      G.nuke.meter = 0; G.nuke.warnT = 0; G.nuke.bossAcc = 0;
      t.hurtBoss(0.3 * mx); o.half = G.nuke.meter; t.hurtBoss(0.3 * mx); o.full = G.nuke.meter; o.ready = t.nuke().ready;
      t.hurtBoss(0.3 * mx); o.afterExtra = G.nuke.meter; return o; }"""
    for w in (5, 10, 20, 35):
        ready = page.evaluate(START, w); assert ready >= 0, f'boss fight at wave {w} did not start'
        a = page.evaluate(BLAST); f = page.evaluate(FLOOR); c = page.evaluate(BOT); d = page.evaluate(CHARGE)
        R[f'boss_w{w}'] = {'blast': a, 'floor': f, 'bot': c, 'charge': d}
        assert a['fired'] and a['wave'] == w and abs(a['dmg'] - a['want']) < 0.05, a
        assert not a['dead'] and a['hp'] >= 0.1 * a['mx'] - 0.05 and a['meter'] == 0, a
        assert a['stunAfter'] >= 3 - 1e-6 and a['stunLeft'] > 1.9 and a['moved'] < 1, a      # stunned right after the blast and halted
        assert a['tele'] == 0 and a['shells'] == 0, a                                       # telegraphs and boss shells cleared
        assert f['ok'] and not f['dead'] and abs(f['hp'] - f['floor']) < 0.05, f                       # never below 10 %
        assert c['blocked'] == 0 and c['invulnKept'] and c['fired'], c                      # bot waits out the invulnerable phase
        assert abs(d['half'] - 0.5) < 0.01 and d['full'] == 1 and d['ready'] and d['afterExtra'] == 1, d  # one full charge per fight
        vprint(f'boss w{w}: dmg {a["dmg"]:.1f} want {a["want"]:.1f} of max {a["mx"]}, stun {a["stunAfter"]:.2f}')
    # 4c. invulnerable boss (intro, phase change, death): no blast may start, manual or bot; the charge is kept; after it ends the nuke works
    assert page.evaluate(START, 5) >= 0
    INV = """() => { const t = __tank, G = t.G, e = G.boss, o = {}; e.hp = e.maxHp; e.stunT = 0; e.trans = 1.5; e.invuln = true; t.nukeCharge(1);
      t.step(1 / 60); const u0 = t.nuke().used; o.fire = t.nukeFire(); o.warn = G.nuke.warnT; o.meter = G.nuke.meter; o.used = t.nuke().used - u0;
      o.btnReady = document.getElementById('btnNuke').classList.contains('ready'); o.hint = document.getElementById('hint').textContent; return o; }"""
    R['invuln_block'] = page.evaluate(INV)
    u_before = page.evaluate('__tank.nuke().used'); page.keyboard.press('n'); page.wait_for_timeout(100)
    R['invuln_key'] = page.evaluate("({ warn: __tank.nuke().warnT, meter: __tank.nuke().meter, used: __tank.nuke().used })")
    R['invuln_key']['changed'] = R['invuln_key']['used'] - u_before
    assert R['invuln_block']['fire'] is False and R['invuln_block']['warn'] == 0 and R['invuln_block']['meter'] == 1, R['invuln_block']
    assert R['invuln_block']['used'] == 0 and not R['invuln_block']['btnReady'] and 'hasar almıyor' in R['invuln_block']['hint'], R['invuln_block']
    assert R['invuln_key']['warn'] == 0 and R['invuln_key']['meter'] == 1 and R['invuln_key']['changed'] == 0, R['invuln_key']
    R['invuln_end'] = page.evaluate("""() => { const t = __tank, G = t.G, e = G.boss; e.trans = 0; e.invuln = false; t.step(1 / 60); const ok = t.nukeFire(); return { ok, warn: G.nuke.warnT }; }""")
    assert R['invuln_end']['ok'] is True and R['invuln_end']['warn'] > 0, R['invuln_end']
    vprint('invuln:', R['invuln_block'], R['invuln_end'])
    page.evaluate("(() => { const t = __tank; t.step(1.4); t.G.nuke.meter = 0; })()")
    # 4d. a phase change starts while the warning runs: the blast skips the invulnerable boss, its damage and stun wait and land when invulnerability ends
    assert page.evaluate(START, 5) >= 0
    PEND = """() => { const t = __tank, G = t.G, e = G.boss, mx = e.maxHp; e.hp = mx; e.stunT = 0; e.trans = 0; e.invuln = false; G.nuke.meter = 0; G.nuke.bossAcc = 0;
      t.nukeCharge(1); const f = t.nukeFire(); t.step(0.3); e.trans = 1.5; e.invuln = true;
      const u0 = t.nuke().used; let n = 0; while (t.nuke().used === u0 && n < 300) { t.step(1 / 60); n++; }
      const o = { fired: f, mx, hpAtBlast: e.hp, stunAtBlast: e.stunT, invulAtBlast: e.invuln, pending: e.nukePending ? e.nukePending.want : 0, meterAtBlast: t.nuke().meter };
      n = 0; while (e.invuln && n < 600) { t.step(1 / 60); n++; }
      o.hpAfter = e.hp; o.stunAfter = e.stunT; o.pendingAfter = !!e.nukePending; o.meterAfter = t.nuke().meter; o.dead = !!e.dead; return o; }"""
    R['pending'] = page.evaluate(PEND)
    r = R['pending']; want = min(0.3 * r['mx'], 150)
    assert r['fired'] and r['invulAtBlast'] and r['hpAtBlast'] == r['mx'] and r['stunAtBlast'] == 0 and abs(r['pending'] - want) < 0.05, r
    assert abs(r['hpAfter'] - (r['mx'] - want)) < 0.05 and r['stunAfter'] >= 3 - 1e-6 and not r['pendingAfter'] and r['meterAfter'] == 0 and not r['dead'], r
    vprint('pending:', r)
    page.evaluate("(() => { const t = __tank, G = t.G; t.dbg.freeze = false; G.enemies.length = 0; G.queue.length = 0; G.portals.length = 0; G.nuke.meter = 0; })()")

    # 5. conditions: not ready, no enemy on the map, outside the fight phase
    R['cond'] = page.evaluate("""() => { const t = __tank, G = t.G, p = G.player, o = {}; G.enemies.length = 0; G.queue.length = 0; G.portals.length = 0;
      t.nukeCharge(1); o.noEnemy = t.nukeFire();
      t.spawn('basic', p.x + 60, p.y - 90); t.nukeCharge(0.5); o.notReady = t.nukeFire(); t.nukeCharge(1); G.phase = 'cleared'; o.wrongPhase = t.nukeFire(); G.phase = 'fight'; return o; }""")
    assert R['cond'] == {'noEnemy': False, 'notReady': False, 'wrongPhase': False}, R['cond']

    # 6. pause freezes the warning
    page.evaluate("(() => { const t = __tank; t.G.enemies.length = 0; const p = t.G.player; t.spawn('basic', p.x + 60, p.y - 90); t.nukeCharge(1); t.nukeFire(); t.step(0.3); })()")
    page.evaluate('__tank.pauseGame()'); page.wait_for_timeout(100); w0 = page.evaluate('__tank.nuke().warnT'); page.wait_for_timeout(900)
    w1 = page.evaluate('__tank.nuke().warnT'); st = page.evaluate('__tank.G.state')
    page.evaluate('__tank.resumeGame()'); page.wait_for_timeout(200)
    R['pause'] = [w0, w1, st]; assert st == 'paused' and w0 == w1 and w0 > 0, R['pause']
    page.wait_for_timeout(1300)
    assert page.evaluate('__tank.nuke().used') >= 1 and page.evaluate('__tank.nuke().warnT') == 0

    # 7. key N on desktop
    page.evaluate("(() => { const t = __tank; t.G.enemies.length = 0; t.G.phase = 'fight'; const p = t.G.player; t.spawn('basic', p.x + 60, p.y - 90); t.nukeCharge(0.4); })()")
    page.keyboard.press('n'); R['n_not_ready'] = page.evaluate('__tank.nuke().warnT'); assert R['n_not_ready'] == 0
    page.evaluate('__tank.nukeCharge(1)'); page.wait_for_timeout(150)
    page.screenshot(path=f'{OUT}/nuke_d_ready.png')
    page.keyboard.press('n'); page.wait_for_timeout(100)
    R['n_ready'] = page.evaluate('__tank.nuke().warnT'); assert R['n_ready'] > 0, 'N must start the warning'
    R['key_chip_visible'] = page.evaluate("getComputedStyle(document.querySelector('#btnNuke .nk-key')).display !== 'none'"); assert R['key_chip_visible']
    page.wait_for_timeout(1500)

    # 8. resume keeps the meter (snapshot -> startGame)
    page.evaluate("__tank.nukeCharge(0.62)")
    snap = page.evaluate("window.__snapFn()"); R['snapshot_nuke'] = snap['run']['nuke']; assert abs(R['snapshot_nuke'] - 0.62) < 0.01, snap
    page.evaluate("(r) => __tank.startGame(r)", snap['run'])
    R['resumed_meter'] = page.evaluate('__tank.nuke().meter'); assert abs(R['resumed_meter'] - 0.62) < 0.01
    page.evaluate("__tank.startGame(null)"); assert page.evaluate('__tank.nuke().meter') == 0, 'a new run starts empty'
    page.evaluate("__tank.startGame({ wave: 3, score: 0, hp: 80, kills: 0, shots: 0, hits: 0, ups: {} })"); assert page.evaluate('__tank.nuke().meter') == 0, 'old saves without a meter start empty'
    ctx.close()

    # ---------- low effects: no white flash, still works ----------
    ctx = new_ctx(b, 'low', viewport={'width': 800, 'height': 500})
    page = ctx.new_page(); seed(page, {'effects': 'low'})
    page.click('#btnStart'); page.wait_for_timeout(300)
    page.evaluate("__tank.G.god = true; __tank.wave(3);"); page.wait_for_timeout(2700)
    page.evaluate("(() => { const t = __tank, p = t.G.player; t.G.enemies.length = 0; t.G.queue.length = 0; t.spawn('basic', p.x + 60, p.y - 90); t.nukeCharge(1); t.nukeFire(); t.step(1.3); })()")
    R['low_fx'] = page.evaluate("[__tank.nuke().used, __tank.SET.effects]"); assert R['low_fx'][0] == 1
    ctx.close(); b.close()
report('check_nuke', R)
if not VERBOSE:
    print('asserts: all passed')
    show_items(R)
print('ERRORS:', real_errors() or 'none')
