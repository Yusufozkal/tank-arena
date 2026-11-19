"""Broad gameplay check (desktop, phone, Android bridge): workshop cards, power-ups, shell types,
rotation, a long autopilot run. Prints a JSON report to read through; screenshots go to .tmp/shots."""
from common import *  # noqa: F401,F403

# ---- package A changes this block (twin becomes a tank in 1.4) ----
# Every `twin` card reference of this check lives here. The JS snippets below use @@TOKENS@@ that A() expands,
# so package A edits only these constants. Today they reproduce the 1.3 text exactly.
TWIN_RARES = "'twin','ricochet','blast','thermal'"   # rare-card list in the boss-wave check
TWIN_KEYS = "'armor','engine','loader','caliber','barrel','repair','twin','ricochet','blast','magnet','thermal','boost'"  # maxed pool
TWIN_SPEC = ", barrel: s.barrel, twin: s.twin"                          # extra field in maxed_spec
TWIN_SHOOT = "t.setUp({ twin: 1 }); out.twin = shoot();"  # shell-type sample
TWIN_FULL = "twin: 1, "                               # twin level in the visual-set upgrade mix
def A(js):
    for k, v in (('TWIN_RARES', TWIN_RARES), ('TWIN_KEYS', TWIN_KEYS), ('TWIN_SPEC', TWIN_SPEC), ('TWIN_SHOOT', TWIN_SHOOT), ('TWIN_FULL', TWIN_FULL)):
        js = js.replace('@@' + k + '@@', v)
    return js
# ---- end of package A block ----

with sync_playwright() as p:
    b = p.chromium.launch()

    # ================= desktop =================
    ctx = new_ctx(b, 'desktop', viewport={'width': 1280, 'height': 800})
    page = ctx.new_page()
    seed(page)
    R['menu_no_difficulty'] = page.evaluate('() => !document.querySelector("#diffSeg, #diffNote, #lbDiff, #overDiff") && !/Zorluk|Talim|Cephe|Kıyamet/.test(document.body.innerText)')
    R['menu_records'] = page.eval_on_selector_all('.records dd', 'ds => ds.map(d => d.textContent)')
    assert R['menu_no_difficulty'] and len(R['menu_records']) == 4, 'menu still shows difficulty or records are missing'
    R['tag'] = page.inner_text('#menuPanel .tag')
    R['orient_row_hidden_on_web'] = page.eval_on_selector('#rowOrient', 'n => n.classList.contains("hidden")')
    page.click('#btnGuide'); page.wait_for_timeout(250)
    R['guide_hunter'] = page.eval_on_selector_all('.foes b', 'bs => bs.map(b => b.textContent)')
    R['guide_pus'] = page.eval_on_selector_all('#guidePus li', 'ls => ls.map(l => l.textContent)')
    R['guide_ups'] = len(page.query_selector_all('#guideUps li'))
    page.screenshot(path=f'{OUT}/d_guide_top.png')
    page.eval_on_selector('#guide .panel', 'p => p.scrollTop = p.scrollHeight * 0.42')
    page.wait_for_timeout(100)
    page.screenshot(path=f'{OUT}/d_guide_lists.png')
    page.click('#btnGuideBack')

    # ---- first workshop ----
    page.click('#btnStart'); page.wait_for_timeout(300)
    R['ws1_phase'] = page.evaluate(TO_WORKSHOP)
    page.wait_for_timeout(450)
    R['ws1_cards'] = page.eval_on_selector_all('#upCards .up-card', 'cs => cs.map(c => c.dataset.k + ": " + c.innerText.replace(/\\n/g, " | "))')
    R['ws1_title'] = page.inner_text('#upTitle') + ' / ' + page.inner_text('#upSub')
    page.screenshot(path=f'{OUT}/d_workshop.png')
    # an instant click is ignored (guard), a deliberate one counts
    first = page.evaluate("__tank.choices()[0]")
    # re-open the workshop and tap at once: the guard must swallow a tap that lands in the first half second
    page.evaluate("() => { __tank.showUpgrades(); document.querySelector('#upCards .up-card').click(); }")
    R['instant_click_ignored'] = page.evaluate("__tank.G.phase") == 'upgrade'
    # pause hides the workshop, resume brings it back
    page.keyboard.press('p')
    R['pause_hides_ws'] = page.evaluate("[__tank.G.state, document.getElementById('upgrade').classList.contains('hidden')]")
    page.keyboard.press('p')
    R['resume_shows_ws'] = page.evaluate("[__tank.G.state, document.getElementById('upgrade').classList.contains('hidden')]")
    page.wait_for_timeout(650)
    page.click('#upCards .up-card:nth-child(1)')
    R['clicked_choice'] = page.evaluate("[__tank.G.phase, JSON.stringify(__tank.G.up)]")
    page.wait_for_timeout(1300)
    R['after_choice'] = page.evaluate("[__tank.G.wave, __tank.G.phase]")

    # ---- keyboard choice ----
    page.evaluate(TO_WORKSHOP); page.wait_for_timeout(200)
    second = page.evaluate("__tank.choices()[1]")
    page.keyboard.press('2')
    R['key2_choice'] = [second, page.evaluate("JSON.stringify(__tank.G.up)")]

    # ---- boss wave gives a rare, low armour gives a repair card ----
    rare = page.evaluate(A("""() => { const t = __tank, G = t.G; let rares = 0, fixes = 0;
      for (let i = 0; i < 40; i++) { t.setUp({}); G.wave = 5; G.player.hp = 100; t.showUpgrades(); const c = t.choices(); if (c.some(k => [@@TWIN_RARES@@].includes(k))) rares++; }
      for (let i = 0; i < 20; i++) { G.wave = 3; G.player.hp = 20; t.showUpgrades(); if (t.choices().includes('fix')) fixes++; }
      G.player.hp = 100; t.showUpgrades(); return { rares, fixes, title5: (G.wave = 5, t.showUpgrades(), document.getElementById('upTitle').textContent) }; }"""))
    R['boss_rare_40of40_and_fix_20of20'] = rare
    full = page.evaluate(A("""() => { const t = __tank, G = t.G; const o = {}; for (const k of [@@TWIN_KEYS@@]) o[k] = 9; t.setUp(o);
      G.player.hp = G.player.maxHp; G.wave = 7; t.showUpgrades(); return { up: G.up, choices: t.choices(), maxHp: G.player.maxHp }; }"""))
    R['maxed_pool'] = full
    page.wait_for_timeout(600)
    page.screenshot(path=f'{OUT}/d_workshop_extras.png')
    page.evaluate("__tank.choose(__tank.choices()[0])")

    # ---- the upgraded tank spec ----
    R['maxed_spec'] = page.evaluate(A("""() => { const s = __tank.playerSpec(); return { speed: s.speed, cool: +s.cool.toFixed(3), dmg: s.dmg, bW: +s.bW.toFixed(1), bR: s.bR, big: s.big, bSpeed: +s.bSpeed.toFixed(0)@@TWIN_SPEC@@ }; }"""))

    # ---- shells: twin, ricochet, blast, pierce (empty arena, steel border only) ----
    R['shells'] = page.evaluate(A("""() => {
      const t = __tank, G = t.G, p = G.player, T = 48, out = {};
      t.wave(3); G.queue = ['basic']; G.maxAlive = 0; G.portals.length = 0; G.enemies.length = 0; G.phase = 'fight'; t.hold(true);
      t.clearArena(); p.x = 10.5 * T; p.y = 10.5 * T; p.turret = 0; p.angle = 0;
      const shoot = () => { G.bullets.length = 0; p.cool = 0; t.fire(); return G.bullets.map(b => ({ y: Math.round(b.y), vx: Math.round(b.vx), look: b.look, dmg: b.dmg, r: b.r })); };
      @@TWIN_SHOOT@@
      t.setUp({ ricochet: 1 }); out.ricochet_start = shoot();
      for (let i = 0; i < 70; i++) t.stepBullets(1 / 60);
      out.ricochet_after = G.bullets.map(b => ({ vx: Math.round(b.vx), bounce: b.bounce, x: Math.round(b.x) }));
      t.setUp({ blast: 2 });
      const e1 = t.spawn('basic', p.x + 5 * T, p.y), e2 = t.spawn('basic', p.x + 5 * T, p.y + 40);
      shoot(); for (let i = 0; i < 40; i++) t.stepBullets(1 / 60);
      out.blast_hp = [e1.hp, e2.hp];
      G.enemies.length = 0; t.setUp({}); G.buffs.pierce = 5;
      const a1 = t.spawn('heavy', p.x + 3 * T, p.y), a2 = t.spawn('heavy', p.x + 6 * T, p.y);
      out.pierce_look = shoot().map(b => b.look); for (let i = 0; i < 40; i++) t.stepBullets(1 / 60);
      out.pierce_hp = [a1.hp, a2.hp]; G.buffs.pierce = 0; G.enemies.length = 0;
      t.setUp({ caliber: 2 }); out.caliber2 = shoot(); t.setUp({});
      return out;
    }"""))

    # ---- power-ups and support upgrades ----
    R['powerups'] = page.evaluate("""() => {
      const t = __tank, G = t.G, p = G.player, T = 48, out = {};
      G.enemies.length = 0; G.bullets.length = 0; G.pickups.length = 0; G.phase = 'fight'; G.queue = ['basic']; G.maxAlive = 0; t.hold(true);
      p.x = 10.5 * T; p.y = 10.5 * T;
      const e = t.spawn('basic', p.x + 5 * T, p.y);
      t.give('freeze'); const x0 = e.x, y0 = e.y;
      t.sim(2, true); out.freeze_moved = Math.round(Math.hypot(e.x - x0, e.y - y0)); out.freeze_left = +G.buffs.freeze.toFixed(2);
      t.sim(2.6, true); out.after_freeze_moved = Math.round(Math.hypot(e.x - x0, e.y - y0));
      G.enemies.length = 0; p.x = 10.5 * T; p.y = 10.5 * T;
      const s1 = t.spawn('basic', p.x + 5 * T, p.y); t.give('stealth'); s1.senseT = 0; t.stepEnemies(1 / 60); out.stealth_cansee = s1.canSee;
      G.buffs.stealth = 0; s1.senseT = 0; t.stepEnemies(1 / 60); out.no_stealth_cansee = s1.canSee; G.enemies.length = 0;
      t.give('speed'); out.speed_buff = +G.buffs.speed.toFixed(2);
      const sx = p.x, sy = p.y; t.sim(1, true); out.turbo_dist_1s = Math.round(Math.hypot(p.x - sx, p.y - sy)); G.buffs.speed = 0;
      t.setUp({ boost: 2 }); t.give('shield'); out.boosted_shield = +G.buffs.shield.toFixed(2); G.buffs.shield = 0; t.setUp({});
      p.x = 10.5 * T; p.y = 10.5 * T;
      const list = [t.spawn('basic', p.x + 3 * T, p.y), t.spawn('fast', p.x - 3 * T, p.y), t.spawn('heavy', p.x, p.y + 3 * T)];
      t.give('air'); out.strikes = G.strikes.length; out.jet = !!G.jet;
      for (let i = 0; i < 150; i++) t.stepStrikes(1 / 60);
      out.air_result = list.map(q => q.dead ? 'dead' : q.hp);
      G.enemies.length = 0;
      t.give('air'); out.air_queued = G.airQ;
      t.spawn('basic', p.x + 4 * T, p.y); t.stepStrikes(1 / 60); out.air_fired_on_spawn = [G.airQ, G.strikes.length];
      G.strikes.length = 0; G.jet = null; G.enemies.length = 0;
      t.setUp({ magnet: 1 }); G.pickups.length = 0; t.drop('rapid', 3.5 * T, 0); const k = G.pickups[0]; const d0 = Math.round(Math.hypot(k.x - p.x, k.y - p.y));
      t.sim(1, true); out.magnet_from_to = [d0, G.pickups.length, +G.buffs.rapid.toFixed(1) > 0];
      t.setUp({}); G.pickups.length = 0; t.drop('rapid', 3.5 * T, 0); t.sim(1, true); out.no_magnet_left = G.pickups.length; G.pickups.length = 0;
      t.setUp({ repair: 3 }); p.hp = 50; p.hurtT = G.time; t.sim(1.5, true); out.regen_wait = Math.round(p.hp); t.sim(2, true); out.regen_after = +p.hp.toFixed(1);
      t.setUp({ armor: 2 }); out.armor_max = p.maxHp; t.hold(false);
      return out;
    }""")

    # ---- visual set: every power-up on the ground, an upgraded tank, frozen and hidden enemies, a strike mark ----
    page.evaluate(A("""() => { const t = __tank, G = t.G, p = G.player, T = 48;
      t.wave(4); G.queue = ['basic']; G.maxAlive = 0; G.portals.length = 0; G.enemies.length = 0; G.phase = 'fight'; G.fade = 0;
      t.clearArena([[13, 7], [14, 7], [13, 8], [6, 12], [7, 12]]);
      p.x = 10.5 * T; p.y = 10.5 * T; p.angle = -Math.PI / 2; p.turret = -0.6;
      t.setUp({ armor: 4, engine: 3, loader: 3, caliber: 2, barrel: 2, repair: 1, @@TWIN_FULL@@magnet: 1, thermal: 1 }); p.hp = 150;
      ['repair','shield','triple','rapid','speed','pierce','freeze','stealth','air'].forEach((k, i) => t.drop(k, (i % 5 - 2) * 62, 120 + Math.floor(i / 5) * 62));
      t.spawn('heavy', p.x + 4 * T, p.y - 1.5 * T); t.spawn('basic', p.x - 4 * T, p.y - 2.5 * T);
      const h = t.spawn('hunter', 13.5 * T, 7.5 * T); h.hidden = true;
      G.buffs.freeze = 3; G.buffs.speed = 5; G.buffs.pierce = 6; G.buffMax.speed = 8; G.buffMax.pierce = 10; G.buffMax.freeze = 4;
      G.strikes.push({ e: null, x: p.x - 1.5 * T, y: p.y - 4 * T, t: 0.3, dur: 0.8, done: false });
      t.cam.x = p.x; t.cam.y = p.y - 20; t.dbg.freeze = true; }"""))
    page.wait_for_timeout(300)
    page.screenshot(path=f'{OUT}/d_powerups_parts.png')
    page.evaluate("() => { __tank.view.scale *= 3; __tank.cam.x = __tank.G.player.x; __tank.cam.y = __tank.G.player.y; }")
    page.wait_for_timeout(150)
    page.screenshot(path=f'{OUT}/d_tank_zoom.png', clip={'x': 490, 'y': 250, 'width': 300, 'height': 300})
    page.evaluate("() => { __tank.view.scale /= 3; __tank.dbg.freeze = false; __tank.G.strikes.length = 0; }")
    page.keyboard.press('p'); page.wait_for_timeout(200)
    R['pause_chips'] = page.inner_text('#pauseUps')
    page.screenshot(path=f'{OUT}/d_pause_chips.png')
    page.keyboard.press('p')

    # ---- long autopilot run with automatic card picks ----
    run = page.evaluate("""() => { const t = __tank, G = t.G; t.startGame(null); t.sim(240, true); return t.info(); }""")
    R['long_run'] = {k: run[k] for k in ('state', 'wave', 'kills', 'score', 'maxHp', 'up', 'parts')}
    page.evaluate("() => { const G = __tank.G; G.god = false; __tank.gameOver(); }")
    page.wait_for_timeout(500)
    R['over_chips'] = page.inner_text('#overUps')
    page.screenshot(path=f'{OUT}/d_over.png')
    ctx.close()

    # ================= phone, portrait then turned to landscape mid-game =================
    ctx = new_ctx(b, 'phone', viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    seed(page)
    page.screenshot(path=f'{OUT}/m_menu.png')
    page.tap('#btnStart'); page.wait_for_timeout(300)
    page.evaluate(TO_WORKSHOP); page.wait_for_timeout(500)
    page.screenshot(path=f'{OUT}/m_workshop_portrait.png')
    R['m_cards_fit'] = page.evaluate("() => { const p = document.getElementById('upPanel'); return [p.scrollHeight <= p.clientHeight + 1, Math.round(p.getBoundingClientRect().height)]; }")
    page.set_viewport_size({'width': 844, 'height': 390}); page.wait_for_timeout(500)
    R['m_view_after_turn'] = page.evaluate("[__tank.view.w, __tank.view.h]")
    R['m_cards_fit_land'] = page.evaluate("() => { const p = document.getElementById('upPanel'); return [p.scrollHeight <= p.clientHeight + 1, Math.round(p.getBoundingClientRect().height)]; }")
    page.screenshot(path=f'{OUT}/m_workshop_landscape.png')
    page.wait_for_timeout(300)
    page.tap('#upCards .up-card:nth-child(2)'); page.wait_for_timeout(1400)
    R['m_after_tap'] = page.evaluate("[__tank.G.wave, __tank.G.phase, JSON.stringify(__tank.G.up)]")
    page.evaluate("() => { __tank.sim(4, true); }")
    page.screenshot(path=f'{OUT}/m_play_landscape.png')
    # a held stick is released when the phone turns back
    page.evaluate("() => { const s = __tank.sticks.move; s.id = 7; s.vx = 1; }")
    page.set_viewport_size({'width': 390, 'height': 844}); page.wait_for_timeout(500)
    R['m_stick_released_on_turn'] = page.evaluate("__tank.sticks.move.id === null")
    R['m_view_back'] = page.evaluate("[__tank.view.w, __tank.view.h, __tank.view.hudRects.length]")
    page.evaluate("() => { __tank.sim(3, true); }")
    page.screenshot(path=f'{OUT}/m_play_portrait.png')
    page.tap('#btnPause'); page.wait_for_timeout(250)
    page.screenshot(path=f'{OUT}/m_pause.png')
    page.tap('#btnPauseGuide'); page.wait_for_timeout(250)
    page.eval_on_selector('#guide .panel', 'p => p.scrollTop = p.scrollHeight * 0.45')
    page.wait_for_timeout(100)
    page.screenshot(path=f'{OUT}/m_guide_lists.png')
    ctx.close()

    # ================= Android bridge: the orientation row appears and reaches the app =================
    ctx = new_ctx(b, 'android', viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True)
    ctx.add_init_script("window.__orient = []; window.TankAndroid = { setOrientation(m) { window.__orient.push(m); } };")
    page = ctx.new_page()
    seed(page)
    R['bridge_boot_calls'] = page.evaluate("window.__orient.slice()")
    page.tap('#btnSettings'); page.wait_for_timeout(250)
    R['bridge_row_visible'] = page.eval_on_selector('#rowOrient', 'n => !n.classList.contains("hidden")')
    page.eval_on_selector('#rowOrient', 'n => n.scrollIntoView()')
    page.tap('#rowOrient button[data-v="landscape"]'); page.wait_for_timeout(150)
    page.screenshot(path=f'{OUT}/a_settings_orient.png')
    R['bridge_after_tap'] = page.evaluate("[window.__orient.slice(-1)[0], JSON.parse(localStorage.getItem('tankArena.settings')).orientation]")
    page.tap('#rowOrient button[data-v="auto"]')
    R['bridge_back_auto'] = page.evaluate("window.__orient.slice(-1)[0]")
    ctx.close()
    b.close()

print(json.dumps(R, ensure_ascii=False, indent=1))
print('ERRORS:', real_errors() or 'none')  # 404s are the seed page and favicon
