"""Seven minutes of autopilot with power-ups raining, then a frame-time benchmark at full upgrades."""
from common import *  # noqa: F401,F403
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = new_ctx(b, 'stress', viewport={'width': 412, 'height': 915}, device_scale_factor=2.6, is_mobile=True, has_touch=True)
    page = ctx.new_page(); seed(page)
    page.tap('#btnStart'); page.wait_for_timeout(200)
    R['stress'] = page.evaluate("""() => { const t = __tank, G = t.G, kinds = ['shield','triple','rapid','speed','pierce','freeze','stealth','air','repair'];
      const log = []; let gives = 0;
      for (let s = 0; s < 420 && G.state === 'play'; s++) {
        if (s % 4 === 0 && G.phase === 'fight') { t.give(kinds[gives++ % kinds.length]); }
        t.sim(1, true);
        if (s % 60 === 59) log.push([G.wave, G.kills, Object.values(G.up).reduce((a, b) => a + b, 0), G.player.maxHp]);
      }
      return { info: t.info(), log, gives }; }""")
    R['bench_ms_per_frame'] = page.evaluate("""() => { const t = __tank, G = t.G, p = G.player;
      t.setUp({ armor: 5, engine: 4, loader: 5, caliber: 4, barrel: 3, repair: 3, ricochet: 2, blast: 2, magnet: 2, thermal: 1, boost: 3 });
      G.buffs.triple = 9; G.buffs.pierce = 9; G.buffs.freeze = 3; t.dbg.freeze = false;
      for (let i = 0; i < 120; i++) t.sim(1 / 60, true);
      return [+t.bench(60).toFixed(2), G.bullets.length, t.parts.length, G.enemies.length]; }""")
    # every tank with full cards: render ms per frame vs the Standart tank, same static scene (8 enemies, a few volleys in flight, triple shot on)
    R['bench_per_tank_ms'] = page.evaluate("""() => { const t = __tank, G = t.G, p = G.player, T = 48, out = {};
      t.noEvo(true); G.phase = 'fight'; G.queue = ['basic']; G.maxAlive = 0; G.god = true; t.dbg.freeze = true;
      for (const id of t.tanks().concat(['std'])) { G.enemies.length = 0; G.bullets.length = 0; t.parts.length = 0; t.setTank(id);
        t.setUp({ armor: 5, engine: 4, loader: 5, caliber: 4, barrel: 3, repair: 3, ricochet: 2, blast: 2, magnet: 2, thermal: 1, boost: 3 }); G.buffs.triple = 9;
        for (let i = 0; i < 8; i++) t.spawn(['basic', 'fast', 'heavy', 'hunter'][i % 4], p.x + Math.cos(i) * 4 * T, p.y + Math.sin(i) * 4 * T);
        for (let v = 0; v < 4; v++) { p.cool = 0; p.turret = v * 1.5; t.fire(); }
        t.cam.x = p.x; t.cam.y = p.y; t.bench(20);
        out[id === 'std' && out.std ? 'std_again' : id] = +t.bench(80).toFixed(2); }
      t.dbg.freeze = false; G.god = false; out.worst_vs_std = +(Math.max(...Object.values(out)) / Math.min(out.std, out.std_again)).toFixed(2); return out; }""")
    page.screenshot(path=f'{OUT}/m_stress_end.png')
    report('stress', R)
    show_items(R)
    print('ERRORS:', [e for e in errors if '404' not in e] or 'none')
    b.close()
