"""Package B: the six card synergies (Birleşimler). For each one the two cards are set with __tank.setUp, syn() must list it and the effect is measured against
the same setup without one of the two cards. Also checks the workshop badge/hint texts, the unlock banner, the pause list, the Rehber list and phone layouts.
Screenshots go to .tmp/shots (syn_*.png)."""
from common import *  # noqa: F401,F403

PREP = """() => { const t = __tank, G = t.G, p = G.player;
  t.wave(3); G.queue = ['basic']; G.maxAlive = 0; G.portals.length = 0; G.enemies.length = 0; G.phase = 'fight'; t.hold(true);
  t.clearArena(); p.x = 10.5 * 48; p.y = 10.5 * 48; p.turret = 0; p.angle = 0; p.vx = p.vy = 0; p.hp = p.maxHp = 100; G.bullets.length = 0; G.texts.length = 0; }"""
CK = {}
report_on_exit('check_syn', CK)


def ck(name, ok, info=None):
    CK[name] = {'ok': bool(ok), 'info': info}
    assert ok, f'{name}: {info}'


with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = new_ctx(b, 'desktop', viewport={'width': 1280, 'height': 800})
    page = ctx.new_page(); seed(page)
    page.click('#btnStart'); page.wait_for_timeout(300)
    ev = page.evaluate

    # ---- 0. which cards give which synergy ----
    pairs = {'bb': ['ricochet', 'blast'], 'mov': ['engine', 'repair'], 'far': ['caliber', 'barrel'], 'amb': ['thermal', 'caliber'], 'fort': ['armor', 'loader'], 'chain': ['magnet', 'boost']}
    for sid, (a, c) in pairs.items():
        on = ev('(o) => { __tank.setUp(o); return __tank.syn(); }', {a: 1, c: 1})
        off1 = ev('(o) => { __tank.setUp(o); return __tank.syn(); }', {a: 1})
        off2 = ev('(o) => { __tank.setUp(o); return __tank.syn(); }', {c: 1})
        ck(f'syn_list_{sid}', sid in on and sid not in off1 and sid not in off2, [on, off1, off2])

    # ---- 1. Seken patlama: blast radius of a ricocheted shell (second tank sits outside the plain radius, inside the widened one) ----
    BB = """(o) => { const t = __tank, G = t.G, p = G.player, T = 48; (""" + PREP + """)(); t.setUp(o);
      const e1 = t.spawn('heavy', p.x + 5 * T, p.y), e2 = t.spawn('heavy', p.x + 5 * T, p.y + 32 + e1.r + 9);
      p.cool = 0; t.fire(); const b = G.bullets[0]; b.bounced = true; const probe = Object.assign({}, b), r = t.splashFor(probe).r;
      for (let i = 0; i < 40; i++) t.stepBullets(1 / 60);
      return { r, flagged: !!b.bb, hp2: e2.hp, max2: e2.maxHp, e1: e1.hp }; }"""
    with_syn, without = ev(BB, {'ricochet': 1, 'blast': 1}), ev(BB, {'blast': 1})
    ck('bb_radius', with_syn['r'] > without['r'] * 1.5, [with_syn, without])
    ck('bb_flagged_only_with_syn', with_syn['flagged'] and not without['flagged'])
    ck('bb_second_tank_hurt_only_with_syn', with_syn['hp2'] < with_syn['max2'] and without['hp2'] == without['max2'], [with_syn, without])
    # only the first blast is widened
    once = ev("""() => { const t = __tank, G = t.G; t.setUp({ ricochet: 1, blast: 1 }); G.player.cool = 0; t.fire(); const b = G.bullets[0]; b.bounced = true;
      return [t.splashFor(b).r, t.splashFor(b).r]; }""")
    ck('bb_first_hit_only', once[0] > once[1], once)
    # an enemy shell is never flagged
    fl = ev("""() => { const t = __tank, G = t.G; (""" + PREP + """)(); t.setUp({ ricochet: 1, blast: 1, caliber: 1, barrel: 1, thermal: 1 }); G.player.cool = 0; t.fire();
      const f = G.bullets[0], e = { owner: 1 }; t.synFlags(e); return [!!f.bb, !!f.far, !!f.ambush, e.bb, e.far, e.ambush]; }""")
    ck('syn_flags_player_only', fl == [True, True, True, None, None, None], fl)

    # ---- 2. Hareketli onarım: regen rate after 3+ s of driving ----
    MOV = """(o) => { const t = __tank, G = t.G, p = G.player; (""" + PREP + """)(); t.setUp(o); p.hp = 40; p.hurtT = G.time - 100;
      t.sticks.move.id = 99; t.sticks.move.vx = 1; t.sticks.move.vy = 0;
      t.step(0.3); p.x = 6 * 48; // head start inside the arena
      t.step(3.2); const mv3 = p.mvT, h0 = p.hp; t.step(1.5); const h1 = p.hp; const x = p.x;
      p.hurtT = G.time; t.step(1 / 60); const afterHit = p.mvT;
      t.sticks.move.id = null; t.sticks.move.vx = 0; return { mv3, rate: (h1 - h0) / 1.5, afterHit, x }; }"""
    m_on, m_off = ev(MOV, {'engine': 1, 'repair': 1}), ev(MOV, {'repair': 1})
    ck('mov_rate_doubles', abs(m_on['rate'] / m_off['rate'] - 2) < 0.15 and m_off['rate'] > 0.3, [m_on, m_off])
    ck('mov_hit_resets', m_on['afterHit'] < 0.05, m_on)

    # ---- 3. Uzak vuruş: damage grows with flight distance ----
    FAR = """([o, tiles]) => { const t = __tank, G = t.G, p = G.player, T = 48; (""" + PREP + """)(); t.setUp(o);
      const e = t.spawn('heavy', p.x + tiles * T, p.y); e.canSee = true; const hp0 = e.hp; p.cool = 0; t.fire();
      for (let i = 0; i < 60; i++) t.stepBullets(1 / 60); return { lost: hp0 - e.hp, dmg: G.shots }; }"""
    f_near, f_far = ev(FAR, [{'caliber': 1, 'barrel': 1}, 2]), ev(FAR, [{'caliber': 1, 'barrel': 1}, 8])
    c_near, c_far = ev(FAR, [{'caliber': 1}, 2]), ev(FAR, [{'caliber': 1}, 8])
    ck('far_damage_grows', f_far['lost'] / c_far['lost'] > 1.2 and f_near['lost'] / c_near['lost'] < 1.1 and abs(c_far['lost'] / c_near['lost'] - 1) < 0.01, [f_near, f_far, c_near, c_far])
    cap = ev("""() => { const t = __tank; return [t.synDmg({ owner: 0, far: true, dist: 12 * 48 }, {}), t.synDmg({ owner: 0, far: true, dist: 99 * 48 }, {}), t.synDmg({ owner: 0, far: true, lob: true, dist: 99 * 48 }, {})]; }""")
    ck('far_cap', abs(cap[0] - 1.4) < 1e-9 and abs(cap[1] - 1.4) < 1e-9 and cap[2] == 1, cap)

    # ---- 4. Pusu: double damage on an unaware or bushed enemy, once per 2 s per enemy ----
    AMB = """([o, st]) => { const t = __tank, G = t.G, p = G.player, T = 48; (""" + PREP + """)(); t.setUp(o);
      const e = t.spawn('heavy', p.x + 4 * T, p.y); e.canSee = st === 'sees' || st === 'bush'; e.hidden = st === 'bush';
      const shot = () => { const h = e.hp; p.cool = 0; t.fire(); for (let i = 0; i < 40; i++) t.stepBullets(1 / 60); return h - e.hp; };
      const a = shot(), a2 = shot(); return { first: a, second: a2, text: G.texts.some(q => q.s === 'PUSU') }; }"""
    S = {'thermal': 1, 'caliber': 1}
    unaware, sees, bush, ctrl = ev(AMB, [S, 'blind']), ev(AMB, [S, 'sees']), ev(AMB, [S, 'bush']), ev(AMB, [{'caliber': 1}, 'blind'])
    ck('amb_unaware_double', abs(unaware['first'] / sees['first'] - 2) < 0.05 and unaware['text'] and not sees['text'], [unaware, sees])
    ck('amb_bush_double', abs(bush['first'] / sees['first'] - 2) < 0.05, [bush, sees])
    ck('amb_once_per_2s', abs(unaware['second'] / unaware['first'] - 0.5) < 0.05, unaware)
    ck('amb_needs_synergy', abs(ctrl['first'] - 1.25) < 0.05 and not ctrl['text'], [ctrl, sees])

    # ---- 5. Kale: damage taken while standing and firing ----
    FORT = """([o, state]) => { const t = __tank, G = t.G, p = G.player, T = 48; (""" + PREP + """)(); t.setUp(o); p.hurtT = G.time - 100;
      if (state === 'move') { p.vx = 200; } p.lastShot = G.time; p.cool = 5; t.step(1 / 60); if (state === 'late') { p.lastShot = G.time - 1; }
      const still = p.still; p.hp = 100; p.lastShot = state === 'late' ? G.time - 1 : G.time; if (state !== 'move') { p.vx = p.vy = 0; } p.still = state === 'still';
      G.bullets.push({ x: p.x + 20, y: p.y, vx: -300, vy: 0, r: 4, owner: 1, dmg: 10, life: 2, big: false, dead: false, look: 'enemy', hits: null, bricks: null, dist: 0, sx: 0, sy: 0, bounced: false });
      t.stepBullets(1 / 60); return { still, lost: 100 - p.hp }; }"""
    k_still, k_move, k_late, k_ctrl = ev(FORT, [{'armor': 1, 'loader': 1}, 'still']), ev(FORT, [{'armor': 1, 'loader': 1}, 'move']), ev(FORT, [{'armor': 1, 'loader': 1}, 'late']), ev(FORT, [{'armor': 1}, 'still'])
    ck('fort_reduces', abs(k_still['lost'] - 7.5) < 0.01 and abs(k_move['lost'] - 10) < 0.01 and abs(k_late['lost'] - 10) < 0.01 and abs(k_ctrl['lost'] - 10) < 0.01, [k_still, k_move, k_late, k_ctrl])
    # the tracking itself (synTrack) from a real step: standing and having just fired
    trk = ev("""() => { const t = __tank, G = t.G, p = G.player; (""" + PREP + """)(); t.setUp({ armor: 1, loader: 1 }); p.lastShot = G.time; t.step(1 / 60); const a = p.still;
      p.vx = 150; t.step(1 / 60); const b = p.still; return [a, b]; }""")
    ck('fort_tracking', trk == [True, False], trk)

    # ---- 6. Zincir: other active power-ups grow by 3 s on a pickup ----
    CH = """(o) => { const t = __tank, G = t.G; (""" + PREP + """)(); t.setUp(o); G.buffs.shield = 0; t.give('shield'); const s0 = G.buffs.shield, m0 = G.buffMax.shield;
      t.give('rapid'); return { dShield: G.buffs.shield - s0, dMax: G.buffMax.shield - m0, rapid: G.buffs.rapid }; }"""
    z_on, z_off = ev(CH, {'magnet': 1, 'boost': 1}), ev(CH, {'magnet': 1})
    ck('chain_extends', abs(z_on['dShield'] - 3) < 1e-9 and abs(z_on['dMax'] - 3) < 1e-9 and z_off['dShield'] == 0, [z_on, z_off])

    # ---- 7. workshop badge / hint texts and the unlock banner ----
    ev('() => { __tank.setUp({ ricochet: 1, armor: 1 }); }')
    txt = ev("""() => ({ blast: __tank.synBadgeHTML('blast'), ric: __tank.synBadgeHTML('ricochet'), loader: __tank.synBadgeHTML('loader'), caliber: __tank.synBadgeHTML('caliber'),
      engine: __tank.synBadgeHTML('engine'), fix: __tank.synBadgeHTML('fix'), armor: __tank.synBadgeHTML('armor') })""")
    ck('badge_completes', 'Birleşim: Seken patlama' in txt['blast'] and 'class="up-syn on"' in txt['blast'], txt)
    ck('badge_loader_completes_kale', 'Birleşim: Kale' in txt['loader'], txt)
    ck('hint_other', 'ile birleşir' in txt['caliber'] and 'Büyük kalibre' not in txt['caliber'] and 'up-syn on' not in txt['caliber'] and 'Uzun namlu ile birleşir' in txt['caliber'], txt)
    ck('hint_owned_partner_missing', txt['armor'].count('Otomatik yükleyici ile birleşir') == 1, txt)
    ck('no_badge_without_synergy', txt['fix'] == '', txt)
    ck('no_badge_when_already_active', ev("() => { __tank.setUp({ ricochet: 1, blast: 1 }); return __tank.synBadgeHTML('blast'); }") == '')

    # draw a workshop with a completing card, choose it, check the banner survives the next wave intro
    def workshop(pg):
        return pg.evaluate("""() => { const t = __tank, G = t.G; t.setUp({ ricochet: 1, engine: 1 });
          for (let i = 0; i < 400; i++) { G.wave = 3; G.player.hp = G.player.maxHp; t.showUpgrades(); const c = t.choices();
            if (c.includes('blast') && c.some(k => k !== 'blast' && ['repair', 'caliber', 'armor', 'magnet', 'thermal', 'barrel', 'loader', 'boost'].includes(k))) return c; }
          return null; }""")
    ch = workshop(page)
    ck('workshop_roll', ch is not None, ch)
    page.wait_for_timeout(700)
    html = page.inner_html('#upCards')
    ck('dom_badge', 'Birleşim: Seken patlama' in html and 'ile birleşir' in html, html[:200])
    page.screenshot(path=f'{OUT}/syn_workshop_desktop.png')
    ev("() => { __tank.choose('blast'); }")
    page.wait_for_timeout(250)
    b1 = ev("() => [document.getElementById('bTitle') ? document.getElementById('bTitle').textContent : null, document.querySelector('#banner').className]")
    ck('banner_text', b1[0] == 'BİRLEŞİM AÇILDI' and 'Seken patlama' in page.inner_text('#banner'), b1)
    page.screenshot(path=f'{OUT}/syn_banner.png')
    page.wait_for_timeout(1000)
    b2 = ev("() => [__tank.G.phase, __tank.G.wave, document.getElementById('bTitle').textContent]")
    ck('banner_not_overwritten', b2[2] == 'BİRLEŞİM AÇILDI' and b2[0] == 'out', b2)
    page.wait_for_timeout(2600)
    b3 = ev("() => [__tank.G.wave, document.getElementById('bTitle').textContent]")
    ck('wave_banner_after', b3[1].startswith('DALGA'), b3)
    # no banner for a card without a new synergy
    ev("() => { __tank.setUp({ ricochet: 1 }); __tank.G.wave = 3; __tank.showUpgrades(); }")
    nb = ev("() => { const t = __tank; const c = t.choices(); const k = c.find(x => x !== 'blast') ; document.getElementById('bTitle').textContent = '-'; t.choose(k); return document.getElementById('bTitle').textContent; }")
    ck('no_banner_without_synergy', nb == '-', nb)

    # ---- 8. pause list and Rehber ----
    ev("() => { const t = __tank; t.G.phase = 'fight'; t.G.state = 'play'; t.setUp({ ricochet: 1, blast: 1, armor: 1, loader: 1, engine: 1 }); t.pauseGame(); }")
    page.wait_for_timeout(300)
    chips = page.eval_on_selector_all('#pauseSyn .syn-row b', 'cs => cs.map(c => c.textContent)')
    ck('pause_list', chips == ['Seken patlama', 'Kale'] and page.eval_on_selector('#pauseSynWrap', 'n => !n.classList.contains("hidden")'), chips)
    page.screenshot(path=f'{OUT}/syn_pause_desktop.png')
    page.click('#btnPauseGuide'); page.wait_for_timeout(300)
    gl = page.eval_on_selector_all('#guideSyn li', 'ls => ls.map(l => l.innerText.replace(/\\n/g, " | "))')
    ck('guide_list', len(gl) == 6 and all('|' in x for x in gl), gl)
    page.eval_on_selector('#guideSyn', 'n => n.scrollIntoView({ block: "center" })'); page.wait_for_timeout(150)
    page.screenshot(path=f'{OUT}/syn_guide_desktop.png')
    page.click('#btnGuideBack'); ev('() => __tank.resumeGame()')

    # ---- 9. phones: workshop with a badge and a hint, nothing clipped; pause list ----
    for tag, (w, h) in {'p390': (390, 844), 'l740': (740, 360), 'l844': (844, 390), 'p360': (360, 740)}.items():
        c2 = new_ctx(b, tag, viewport={'width': w, 'height': h}, device_scale_factor=2, is_mobile=True, has_touch=True)
        pg = c2.new_page(); seed(pg); pg.tap('#btnStart'); pg.wait_for_timeout(500)
        ch = workshop(pg); pg.wait_for_timeout(700)
        m = pg.evaluate("""() => { const P = document.getElementById('upPanel'), cs = [...document.querySelectorAll('#upCards .up-card')];
          return { panel: [P.scrollHeight, P.clientHeight], vh: innerHeight, vw: innerWidth, cards: cs.map(c => { const r = c.getBoundingClientRect(); const s = c.querySelector('.up-syn');
            return { k: c.dataset.k, syn: s ? s.textContent : null, over: [c.scrollWidth - c.clientWidth, c.scrollHeight - c.clientHeight], r: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], synOver: s ? s.scrollWidth - s.clientWidth : 0 }; }) }; }""")
        ck(f'{tag}_cards_unclipped', all(c['over'][0] <= 0 and c['over'][1] <= 0 and c['synOver'] <= 0 and c['r'][0] >= 0 and c['r'][2] <= w for c in m['cards']) and len(m['cards']) == 3, m)
        ck(f'{tag}_has_badge_and_hint', any(c['syn'] and c['syn'].startswith('Birleşim') for c in m['cards']) and any(c['syn'] and 'ile birleşir' in c['syn'] for c in m['cards']), m)
        pg.screenshot(path=f'{OUT}/syn_workshop_{tag}.png')
        if tag in ('p390', 'l740'):
            pg.evaluate("() => { const t = __tank; t.G.phase = 'fight'; t.setUp({ ricochet: 1, blast: 1, armor: 1, loader: 1, engine: 1, repair: 1 }); t.pauseGame(); }")
            pg.wait_for_timeout(300); pg.screenshot(path=f'{OUT}/syn_pause_{tag}.png')
            pg.evaluate('() => __tank.resumeGame()')
        c2.close()
    b.close()

report('check_syn', CK)
show_checks(CK)
print('CHECKS:', len(CK), 'all ok')
print('ERRORS:', [e for e in errors if '404' not in e] or 'none')
