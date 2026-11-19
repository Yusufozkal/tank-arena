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
      t.setUp({ armor: 5, engine: 4, loader: 5, caliber: 4, barrel: 3, repair: 3, twin: 1, ricochet: 2, blast: 2, magnet: 2, thermal: 1, boost: 3 });
      G.buffs.triple = 9; G.buffs.pierce = 9; G.buffs.freeze = 3; t.dbg.freeze = false;
      for (let i = 0; i < 120; i++) t.sim(1 / 60, true);
      return [+t.bench(60).toFixed(2), G.bullets.length, t.parts.length, G.enemies.length]; }""")
    page.screenshot(path=f'{OUT}/m_stress_end.png')
    print(json.dumps(R, ensure_ascii=False, indent=1)); print('ERRORS:', [e for e in errors if '404' not in e] or 'none')
    b.close()
