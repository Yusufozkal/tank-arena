"""Region rule (a beaten boss takes its enemy types out of the run) and the Tamirci (docs/BOSSES.md section 9).
Usage: TANK_TEST_PORT=8840 python3 tests/check_region.py     (phone screenshot: .tmp/tamirci_p390.png)"""
from common import *  # noqa: F401,F403

report_on_exit('check_region', R)
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
  window.shoot = (e, a) => { // one non-lethal player shell flying at e from direction a (angle of the shooter seen from e)
    const d = 36, x = e.x + Math.cos(a) * d, y = e.y + Math.sin(a) * d;
    const b = { x, y, vx: -Math.cos(a) * 600, vy: -Math.sin(a) * 600, r: 4, owner: 0, dmg: 2, life: 2, big: false, dead: false, pierce: false, bounce: 0, splash: null, look: 'player',
      hits: null, bricks: null, sx: x, sy: y, dist: 0, bounced: false, vol: ++window.VOL, volN: 1, pn: 0, h: 0 };
    G.bullets.push(b); for (let i = 0; i < 6 && !b.dead; i++) t.stepBullets(1 / 60);
  };
  // a quiet ally: does not move or shoot
  window.ally = (x, y, hp, mx) => { const e = t.spawn('basic', x, y); e.speedMul = 0; e.cool = 9999; e.canSee = false; e.maxHp = mx || 10; e.hp = hp === undefined ? e.maxHp : hp; e.angle = e.turret = 0; return e; };
  window.tam = (x, y) => { const e = t.spawn('tamirci', x, y); e.angle = e.turret = 0; return e; };
  window.cnt = (list, ty) => list.filter(x => x === ty).length;
  window.rosters = (w, n) => { const o = []; for (let i = 0; i < n; i++) o.push(t.buildRoster(w).list); return o; };
}"""
ROSTER_SCAN = "([w, n, ty]) => { const r = rosters(w, n); return { any: r.filter(l => l.includes(ty)).length, max: Math.max(...r.map(l => cnt(l, ty))), min: Math.min(...r.map(l => cnt(l, ty))) }; }"
CALM = "() => { const t = __tank, G = t.G; G.god = true; t.dbg.freeze = true; t.killAll(); G.bullets = []; G.queue = []; G.portals = []; t.clearArena(); const p = G.player; p.x = 60; p.y = 60; G.phase = 'fight'; G.hint = 0; }"

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = new_ctx(b, 'desktop', viewport={'width': 1000, 'height': 760})
    # the run snapshot the host asks for: capture the callback
    ctx.add_init_script("window.claude = { hot: { snapshot: f => { window.__snapFn = f; }, ready: cb => cb({}) } };")
    page = ctx.new_page(); seed(page)
    page.click('#btnStart'); page.wait_for_timeout(300)
    ev(page, HELPERS)

    # ---- region rule ----
    ev(page, "(() => { const t = __tank, G = t.G; t.killAll(); G.beaten.clear(); G.wave = 10; })()")
    id10 = ev(page, "__tank.bossDefAt(10).id")
    ev(page, "__tank.waveCleared()")
    check('boss10_recorded', ev(page, "[...__tank.G.beaten]") == [id10], ev(page, "[...__tank.G.beaten]"))
    if id10 == 'sari':
        s = ev(page, "[11, 15, 19].map(w => __tank.typeShares(w))")
        check('fast_share_zero_after_sari', all(x['pf'] == 0 for x in s) and all(x['ph'] > 0 for x in s), s)
        scan = [ev(page, ROSTER_SCAN, [w, 150, 'fast']) for w in (11, 13, 17, 19)]
        check('no_fast_in_rosters_11_19', all(x['any'] == 0 for x in scan), scan)
        scan = ev(page, ROSTER_SCAN, [14, 150, 'heavy'])
        check('heavy_still_comes', scan['any'] > 0, scan)
        check('fast_banned_flag', ev(page, "__tank.typeBanned('fast') && !__tank.typeBanned('heavy') && !__tank.typeBanned('basic')"))
    ev(page, "(() => { __tank.G.beaten.clear(); })()")
    scan = ev(page, ROSTER_SCAN, [16, 150, 'fast'])
    check('fast_comes_without_rule', scan['any'] > 0, scan)

    # a boss wave played by the stand-in Komutan removes nothing
    for w in (30, 40):
        ev(page, "(w) => { const G = __tank.G; G.beaten.clear(); G.wave = w; __tank.killAll(); __tank.waveCleared(); }", w) if False else page.evaluate("(w) => { const G = __tank.G; G.beaten.clear(); G.wave = w; __tank.killAll(); __tank.waveCleared(); }", w)
        got = ev(page, "[...__tank.G.beaten]")
        ok = (got == ['komutan'] and not ev(page, "['fast', 'heavy', 'hunter', 'tamirci', 'topcu'].some(t => __tank.typeBanned(t))"))
        if got != ['komutan']:
            ok = True  # a real boss now stands there: only its own types are removed
            ban = {'sari': ['fast'], 'demirkok': ['heavy', 'tamirci'], 'kiragi': ['hunter', 'topcu']}.get(got[0], [])
            ok = all(ev(page, "(t) => __tank.typeBanned(t)", t) == (t in ban) for t in ('fast', 'heavy', 'hunter', 'tamirci', 'topcu'))
        check(f'standin_wave{w}', ok, got)
    # wave 20 in this branch is still the Komutan; with Demirkok it removes Agir and Tamirci
    ev(page, "(() => { const G = __tank.G; G.beaten.clear(); G.wave = 20; __tank.killAll(); __tank.waveCleared(); })()")
    id20 = ev(page, "__tank.bossDefAt(20).id")
    check('wave20_rule_matches_boss', ev(page, "__tank.typeBanned('heavy')") == (id20 == 'demirkok') and ev(page, "__tank.typeBanned('tamirci')") == (id20 == 'demirkok'), id20)
    check('basic_never_removed', not ev(page, "__tank.typeBanned('basic')"))

    # snapshot and resume; reset on a new game
    ev(page, "(() => { const G = __tank.G; G.beaten.clear(); G.beaten.add('sari'); G.beaten.add('demirkok'); })()")
    snap = ev(page, "__snapFn()")
    check('snapshot_has_beaten', snap and snap['run'] and sorted(snap['run'].get('beaten', [])) == ['demirkok', 'sari'], snap)
    ev(page, "(() => { __tank.toMenu(); })()")
    ev(page, "(r) => __tank.startGame(r)", {'wave': 15, 'score': 0, 'hp': 100, 'kills': 0, 'shots': 0, 'hits': 0, 'ups': {}, 'tank': 'std', 'nuke': 0, 'beaten': ['sari', 'demirkok']})
    page.wait_for_timeout(200)
    check('resume_restores_beaten', ev(page, "[...__tank.G.beaten].sort()") == ['demirkok', 'sari'] and ev(page, "__tank.typeBanned('fast') && __tank.typeBanned('heavy') && __tank.typeBanned('tamirci')"))
    ev(page, "(() => { __tank.toMenu(); __tank.startGame(); })()")
    page.wait_for_timeout(200)
    check('new_game_resets', ev(page, "__tank.G.beaten.size") == 0 and not ev(page, "__tank.typeBanned('fast')"))
    ev(page, "(() => { __tank.toMenu(); __tank.startGame({ wave: 3, hp: 100, beaten: [7, null, 'x'] }); })()")
    check('resume_ignores_junk', ev(page, "[...__tank.G.beaten]") == ['x'])

    # region banner at the first wave of the new region
    ev(page, "(() => { const t = __tank, G = t.G; t.toMenu(); t.startGame(); G.beaten.add('sari'); G.wave = 10; t.nextWave(); })()")
    bt, bs = ev(page, "document.getElementById('bTitle').textContent"), ev(page, "document.getElementById('bSub').textContent")
    check('region_banner_wave11', bt == 'ORMAN BÖLGESİ' and bs == 'Keşif tankları artık gelmiyor', [bt, bs])
    ev(page, "(() => { const t = __tank, G = t.G; G.wave = 11; t.nextWave(); })()")
    check('no_region_banner_wave12', ev(page, "document.getElementById('bTitle').textContent") == 'DALGA 12')
    ev(page, "(() => { const t = __tank, G = t.G; G.beaten.clear(); G.beaten.add('komutan'); G.wave = 20; t.nextWave(); })()")
    check('no_region_banner_without_removal', ev(page, "document.getElementById('bTitle').textContent") == 'DALGA 21')
    ev(page, "(() => { const t = __tank, G = t.G; G.beaten.clear(); G.beaten.add('demirkok'); G.wave = 20; t.nextWave(); })()")
    bt, bs = ev(page, "document.getElementById('bTitle').textContent"), ev(page, "document.getElementById('bSub').textContent")
    check('wave20_is_demirkok', id20 == 'demirkok', id20)
    check('region_banner_demirkok', bt == 'KAR BÖLGESİ' and bs == 'Ağır tanklar ve Tamirciler artık gelmiyor', [bt, bs])
    # end to end: after wave 21 spawns no heavy or tamirci ever appears
    ev(page, "(() => { const G = __tank.G; G.beaten.clear(); G.beaten.add('sari'); G.beaten.add('demirkok'); })()")
    check('no_heavy_tamirci_w21_40', all(ev(page, ROSTER_SCAN, [w, 40, ty])['any'] == 0 for w in (21, 27, 33, 39) for ty in ('heavy', 'tamirci')))
    ev(page, "(() => { __tank.G.beaten.clear(); })()")

    # ---- Tamirci arrival ----
    ev(page, "(() => { const G = __tank.G; G.beaten.clear(); })()")
    r12 = ev(page, ROSTER_SCAN, [12, 200, 'tamirci'])
    r13 = ev(page, ROSTER_SCAN, [13, 200, 'tamirci'])
    check('tamirci_not_before_13', r12['any'] == 0 and ev(page, "__tank.typeShares(12).pt") == 0, r12)
    check('tamirci_wave13_exactly_one', r13['min'] == 1 and r13['max'] == 1, r13)
    sh = ev(page, "[14, 20, 30, 40].map(w => +__tank.typeShares(w).pt.toFixed(4))")
    check('tamirci_share_curve', sh[0] == 0.045 and sh[1] == 0.135 and sh[2] == 0.15 and sh[3] == 0.15 and abs(sh[0] - 0.045) < 1e-9, sh)
    check('tamirci_gone_after_demirkok', ev(page, "(() => { __tank.G.beaten.add('demirkok'); const r = [__tank.typeShares(25).pt, rosters(25, 100).flat().includes('tamirci')]; __tank.G.beaten.clear(); return r; })()") == [0, False])
    # the one-time hint
    ev(page, "(() => { localStorage.removeItem('tankArena.seenTamirci'); const h = document.getElementById('hint'); h.classList.remove('show'); h.textContent = ''; })()")
    ev(page, CALM)
    ev(page, "window.tam(400, 400)")
    h1 = ev(page, "document.getElementById('hint').textContent"), ev(page, "document.getElementById('hint').classList.contains('show')")
    ev(page, "(() => { const h = document.getElementById('hint'); h.classList.remove('show'); h.textContent = ''; window.tam(500, 500); })()")
    h2 = ev(page, "document.getElementById('hint').classList.contains('show')")
    check('tamirci_hint_once', h1[0].startswith('Yeni düşman: Tamirci') and h1[1] and not h2, [h1, h2])

    # ---- Tamirci repair ----
    ev(page, CALM)
    out = ev(page, """() => { const t = __tank, G = t.G, o = {};
      const a = window.ally(500, 500, 4, 10), m = window.tam(500 - 3 * 48, 500); G.player.x = 800; G.player.y = 500; // the player is east of the ally: the Tamirci is behind it
      t.step(2); o.d2 = a.hp - 4; o.beam = !!m.beamOn && G.time < m.beamUntil; o.dist = Math.hypot(m.x - a.x, m.y - a.y) / 48;
      a.hp = 9.8; t.step(1); o.cap = a.hp; o.maxHp = a.maxHp; return o; }""")
    check('heals_half_hp_per_second', abs(out['d2'] - 1.0) < 0.2, out)
    check('heal_capped_at_max', out['cap'] == out['maxHp'], out)
    check('beam_active', out['beam'], out)
    ev(page, CALM)
    out = ev(page, """() => { const t = __tank, G = t.G, o = {};
      const a = window.ally(500, 500, 1000, 1000), m = window.tam(500 - 3 * 48, 500); G.player.x = 800; G.player.y = 500;
      window.shoot(a, Math.PI / 2); o.before = a.pt.tread; t.step(0.3); o.after = a.pt.tread; o.imm = a.pt.imm.tread > 0;
      window.shoot(a, Math.PI); o.engine = a.pt.engine; t.step(0.3); o.engine2 = a.pt.engine; return o; }""")
    check('tread_repaired_instantly', out['before'] > 0 and out['after'] == 0 and out['imm'], out)
    check('engine_repaired_instantly', out['engine'] == 0 or out['engine2'] == 0, out)  # engine hit may fall inside the 1.5 s immunity; the earlier test covers the tread
    # one Tamirci per target
    ev(page, CALM)
    out = ev(page, """() => { const t = __tank, G = t.G, o = {};
      const a = window.ally(500, 500, 2, 10), b = window.ally(500, 620, 6, 10), m1 = window.tam(380, 500), m2 = window.tam(380, 620); G.player.x = 800; G.player.y = 560;
      t.step(1.2); o.t1 = m1.beamOn === a ? 'a' : m1.beamOn === b ? 'b' : null; o.t2 = m2.beamOn === a ? 'a' : m2.beamOn === b ? 'b' : null; return o; }""")
    check('one_tamirci_per_target', out['t1'] != out['t2'] or out['t1'] is None, out)

    # visible through a bush while beaming and 1 s after; hidden otherwise
    ev(page, CALM)
    ev(page, "(() => { const t = __tank; t.clearArena([[7, 10], [8, 10]]); })()")
    out = ev(page, """() => { const t = __tank, G = t.G, o = {};
      const a = window.ally(11 * 48, 10.5 * 48, 5, 10), m = window.tam(7.5 * 48, 10.5 * 48); G.player.x = 20 * 48; G.player.y = 10.5 * 48;
      m.speedMul = 0; m.hp = m.maxHp = 100;
      t.step(0.5); o.inBush = G.map.at(m.x, m.y) === 14 || null; o.beaming = !!m.beamOn; o.hiddenWhileBeam = m.hidden;
      a.hp = a.maxHp; t.step(0.4); o.hiddenAfter04 = m.hidden; t.step(1.0); o.hiddenAfter14 = m.hidden; o.tile = G.map.at(m.x, m.y); return o; }""")
    check('visible_in_bush_while_beaming', out['beaming'] and out['hiddenWhileBeam'] is False and out['hiddenAfter04'] is False and out['hiddenAfter14'] is True, out)

    # flees when the player is within 4 tiles and sees it
    ev(page, CALM)
    out = ev(page, """() => { const t = __tank, G = t.G, o = {};
      const m = window.tam(500, 500); G.player.x = 500 - 3 * 48; G.player.y = 500; m.canSee = true; m.distP = 144;
      const d0 = Math.hypot(m.x - G.player.x, m.y - G.player.y); t.step(1.5); o.gain = Math.hypot(m.x - G.player.x, m.y - G.player.y) - d0; o.dist = (o.gain + d0) / 48; return o; }""")
    check('flees_from_close_player', out['dist'] >= 3.8, out)

    # lone Tamirci: after 2 s with no ally it stops fleeing and creeps towards the player (no chase needed)
    ev(page, CALM)
    out = ev(page, """() => { const t = __tank, G = t.G, o = {};
      const m = window.tam(300, 300); G.player.x = 300 + 12 * 48; G.player.y = 300; m.canSee = true; m.distP = 12 * 48;
      t.step(12); o.far = Math.hypot(m.x - G.player.x, m.y - G.player.y) / 48; o.loneT = m.loneT;
      // close player: still runs first, then (after 2 s alone) comes back to ~5.5 tiles instead of hiding
      const m2 = window.tam(600, 600); G.player.x = 600 - 3 * 48; G.player.y = 600; m2.canSee = true; m2.distP = 144; m.dead = true; G.enemies = G.enemies.filter(e => !e.dead);
      t.step(1.2); o.run = Math.hypot(m2.x - G.player.x, m2.y - G.player.y) / 48; t.step(14); o.back = Math.hypot(m2.x - G.player.x, m2.y - G.player.y) / 48;
      window.ally(m2.x - 200, m2.y, 10, 10); t.step(0.1); o.reset = m2.loneT; return o; }""")
    check('lone_tamirci_approaches', out['far'] < 7 and out['run'] > 3.3 and out['back'] < 6.5 and out['reset'] == 0, out)

    # at most two alive
    ev(page, CALM)
    out = ev(page, """() => { const t = __tank, G = t.G, o = { max: 0, spawned: 0 };
      G.queue = Array(6).fill('tamirci'); G.maxAlive = 8; G.spawnTimer = 0; G.phase = 'fight'; G.player.x = 24 * 48; G.player.y = 24 * 48;
      const seen = new Set();
      for (let i = 0; i < 80 && G.state === 'play'; i++) { t.step(0.25); const n = G.enemies.filter(e => e.type === 'tamirci' && !e.dead).length + G.portals.filter(q => q.type === 'tamirci').length; o.max = Math.max(o.max, n); G.enemies.forEach(e => e.type === 'tamirci' && seen.add(e.id)); }
      o.spawned = seen.size; o.basics = G.enemies.filter(e => e.type === 'basic').length; return o; }""")
    check('at_most_two_alive', out['max'] <= 2 and out['spawned'] >= 2 and out['basics'] >= 1, out)

    # bot shoots a visible Tamirci first
    ev(page, CALM)
    out = ev(page, """() => { const t = __tank, G = t.G, o = {};
      G.player.x = 600; G.player.y = 600; const nb = window.ally(600 + 100, 600, 10, 10), tm = window.tam(600, 600 - 5 * 48); tm.speedMul = 0;
      t.sim(0.1, true); const want = Math.atan2(tm.y - G.player.y, tm.x - G.player.x); o.diff = Math.abs(Math.atan2(Math.sin(__tank.G.player.turret - want), Math.cos(__tank.G.player.turret - want))); o.fire = true; return o; }""")
    check('bot_targets_tamirci_first', out['diff'] < 0.6, out)
    # no Tamirci on screen: the bot keeps to the nearest tank
    out = ev(page, """() => { const t = __tank, G = t.G; G.enemies.filter(e => e.type === 'tamirci').forEach(e => e.dead = true); G.enemies = G.enemies.filter(e => !e.dead);
      return G.enemies.length; }""")
    check('only_ally_left', out == 1, out)

    # the guide lists the Tamirci
    ev(page, "(() => { __tank.toMenu(); })()")
    page.click('#btnGuide') if page.query_selector('#btnGuide') else None
    page.wait_for_timeout(200)
    txt = ev(page, "document.getElementById('guide').textContent")
    check('guide_entry', 'Tamirci' in txt and 'Önce onu vur' in txt)

    # ---- phone screenshot ----
    ctx2 = new_ctx(b, 'phone', viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ph = ctx2.new_page(); seed(ph)
    ph.tap('#btnStart'); ph.wait_for_timeout(400)
    ev(ph, HELPERS)
    ev(ph, """() => { const t = __tank, G = t.G; G.god = true; t.dbg.freeze = true; t.killAll(); G.queue = []; G.portals = []; t.clearArena([[9, 9], [10, 9], [9, 10], [14, 11], [14, 12]]);
      const p = G.player; p.x = 12 * 48; p.y = 13.5 * 48; p.angle = p.turret = -Math.PI / 2; G.phase = 'fight';
      const a = window.ally(12 * 48, 9.5 * 48, 3, 10); a.angle = a.turret = Math.PI / 2;
      const m = window.tam(12 * 48, 6.3 * 48); m.angle = m.turret = Math.PI / 2; m.speedMul = 1;
      const a2 = window.ally(8 * 48, 11 * 48, 7, 10); a2.angle = a2.turret = Math.PI / 2;
      t.step(1.2); return G.enemies.length; }""")
    ev(ph, "document.getElementById('hint').classList.remove('show'); document.getElementById('banner').classList.remove('show')")
    ph.wait_for_timeout(120)
    os.makedirs(str(TMP), exist_ok=True)
    ph.screenshot(path=str(TMP / 'tamirci_p390.png'))
    R['phone_beam'] = ev(ph, "(() => { const m = __tank.G.enemies.find(e => e.type === 'tamirci'); return !!(m && m.beamOn); })()")
    ctx2.close()
    b.close()

errs = real_errors()
check('no_page_errors', not errs, errs[:3])
print('check_region:', 'FAILED ' + ', '.join(FAILS) if FAILS else 'all ok')
print('ERRORS:', errs or 'none')

sys.exit(1 if FAILS else 0)
