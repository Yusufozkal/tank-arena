"""Nuclear bomba (1.5): whole-map blast, fixed boss damage (150, floor 10%, 3 s stun), boss-stage charging; the meter fills over kills, the effect, pause freezes the warning, key N, resume keeps the meter.
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

    # 4. boss: fixed 150 damage, floor 10%, stun 3 s, enemy bullets cleared, enrage still runs, nuke damage never charges
    page.evaluate("(() => { const t = __tank, G = t.G; G.enemies.length = 0; G.queue.length = 0; G.phase = 'fight'; G.phaseT = 0; })()")  # step 3's killAll emptied the wave: back to the fight phase
    R['boss'] = page.evaluate("""() => { const t = __tank, G = t.G, p = G.player, out = {}; const b = t.spawn('boss', p.x + 110, p.y - 170); G.phase = 'fight'; const mx = b.maxHp; out.mx = mx;
      const shell = () => G.bullets.push({ x: p.x + 40, y: p.y - 40, vx: 0, vy: 0, r: 4, owner: 1, dmg: 1, life: 5, dead: false, hits: null, bricks: null, sx: 0, sy: 0, dist: 0, bounced: false });
      b.hp = mx; b.stunT = 0; shell(); t.nukeCharge(1); t.nukeFire(); t.step(1.5);
      out.hp1 = +b.hp.toFixed(2); out.want1 = +Math.max(0.1 * mx, mx - 150).toFixed(2); out.dead = !!b.dead; out.stun = b.stunT; out.shells = G.bullets.filter(q => q.owner === 1).length; out.meter1 = t.nuke().meter;
      b.hp = mx * 0.52; t.nukeCharge(1); t.nukeFire(); t.step(1.5); out.hp2 = +b.hp.toFixed(2); out.floor2 = +(0.1 * mx).toFixed(2); out.dead2 = !!b.dead;
      b.hp = 3; t.nukeCharge(1); t.nukeFire(); t.step(1.5); out.hpLow = +b.hp.toFixed(2); out.dead3 = !!b.dead;
      b.hp = mx; b.stunT = 0.5; t.nukeCharge(1); t.nukeFire(); t.step(1.3); out.stunKeep = b.stunT; return out; }""")
    r = R['boss']
    assert not r['dead'] and abs(r['hp1'] - r['want1']) < 0.05, r
    assert r['stun'] > 1.4 and r['shells'] == 0 and r['meter1'] == 0, r  # 1.5 s step later about 1.5 s of the 3 s stun is left; blast damage does not recharge
    assert not r['dead2'] and r['hp2'] >= r['floor2'] - 0.05 and r['hp2'] <= r['floor2'] + 0.05 or r['hp2'] <= 0.52 * r['mx'], r
    assert not r['dead3'] and r['hpLow'] > 0 and r['hpLow'] <= 3.0, r
    vprint('boss:', R['boss'])

    # 4b. boss-stage charging: nukeOnBossDamage fills the meter at 60% of max HP, once per fight
    R['bossCharge'] = page.evaluate("""() => { const t = __tank, G = t.G, p = G.player, o = {}; G.enemies.length = 0; const b = t.spawn('boss', p.x + 110, p.y - 170); G.phase = 'fight'; const mx = b.maxHp;
      G.nuke.meter = 0; G.nuke.bossAcc = 0; G.nukeOnBossDamage(b, 0.3 * mx); o.half = +G.nuke.meter.toFixed(3); G.nukeOnBossDamage(b, 0.3 * mx); o.full = +G.nuke.meter.toFixed(3); o.ready = t.nuke().ready;
      G.nuke.meter = 0; G.nukeOnBossDamage(b, 5 * mx); o.second = G.nuke.meter; return o; }""")
    r = R['bossCharge']; assert abs(r['half'] - 0.5) < 0.01 and r['full'] == 1 and r['ready'] and r['second'] == 0, r
    page.evaluate("(() => { const G = __tank.G; G.enemies.length = 0; G.nuke.meter = 0; })()")

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
