"""Balance probe: the autopilot plays waves; per wave we log player firepower vs enemy toughness and incoming damage.

mode 'pressure': armour is refilled every 0.25 s so the run never ends; we record how much damage the wave dealt.
mode 'survive' : a normal run; we record the wave where the tank dies.
strategy 'random' picks workshop cards at random, 'offense' always takes the strongest damage card on offer.

Usage: python3 tests/balance_probe.py <survive|pressure> <random|offense> <max waves> <runs> [tank] [nuke] [seed]
  tank: random (the bot picks a random offered tank at each evolution screen), a tank id, or all (run i plays tank i mod 10: std, ikiz, nisanci, makineli, uclu, cift, rayli, obus, alev, sarapnel)
        a tier-2 id: the bot takes its parent at wave 5 and that tank at wave 10; a tier-1 id: takes it at wave 5 and then stays (no wave-10 evolution) so the tier-1 tank is measured
        over the whole run; std: no evolution at all (the 1.3 baseline)
  nuke: on (default; the bot fires the bomb when >= 3 enemies are on screen or the Komutan is alive) or off
  seed: optional integer; runs become deterministic (seeded Math.random, requestAnimationFrame stubbed so only sim() runs), run i uses seed+i
e.g.   TANK_TEST_PORT=8800 python3 tests/balance_probe.py survive random 40 30 all on   (results in .tmp/balance/survive_random_all_on.json)
Then:  python3 tests/balance_report.py
Enemy hp comes from the real SPECS / bossHp exposed on window.__tank.
"""
import json, sys
from common import *  # noqa: F401,F403

WAVE_JS = r"""
([mode, strategy, maxT, target]) => {
  const t = __tank, G = t.G;
  const PRI = ['caliber', 'loader', 'blast', 'ricochet', 'armor', 'repair', 'barrel', 'engine', 'boost', 'magnet', 'thermal', 'prep', 'fix', 'bounty'];
  const w = G.wave, sp = t.playerSpec(), up = Object.assign({}, G.up);
  const roster = G.queue.slice().concat(G.enemies.map(e => e.type));
  // real enemy hp: SPECS * mods.hp; the boss ignores mods.hp and uses bossHp(w)
  const ehp = roster.reduce((s, ty) => s + (ty === 'boss' ? t.bossHp(w) : t.SPECS[ty].hp * G.mods.hp), 0);
  const out = { wave: w, tank: G.tank, target, dps: +sp.dps.toFixed(2), shell: +sp.dmg.toFixed(2), cool: +sp.cool.toFixed(3), nuke0: G.nuke.used, heatMax: 0, heatSum: 0, heatN: 0,
    ehp: +ehp.toFixed(1), n: roster.length, mix: roster.reduce((m, ty) => (m[ty] = (m[ty] || 0) + 1, m), {}), hpMul: +G.mods.hp.toFixed(2),
    eCool: +G.mods.cool.toFixed(2), eErr: +G.mods.err.toFixed(3), maxHp: G.player.maxHp, up };
  let dmg = 0, fightT = 0, t0 = G.time, k0 = G.kills, s0 = G.shots, h0 = G.hits;
  while (G.state === 'play' && G.time - t0 < maxT) {
    if (G.phase === 'upgrade' && G.upMode === 'evo') { // evolution screen: walk from the target up to the tank on offer; a tier-1 target stays tier 1 afterwards
      const ch = t.choices();
      let id = target, hit = null;
      while (id && !hit) { if (ch.includes(id)) hit = id; else id = t.TANKS[id] && t.TANKS[id].parent; }
      t.choose(hit || ch[Math.floor(Math.random() * ch.length)]);
      if (t.TANKS[target] && t.TANKS[target].tier === 1 && G.tank === target) t.noEvo(true);
      continue;
    }
    if (G.phase === 'upgrade') {
      const ch = t.choices();
      const k = strategy === 'offense' ? (PRI.find(x => ch.includes(x)) || ch[0]) : ch[Math.floor(Math.random() * ch.length)];
      t.choose(k); out.pick = k; break;
    }
    if (G.phase === 'cleared' || G.phase === 'out') { t.step(0.25); continue; }
    const fighting = G.phase === 'fight', hp0 = G.player.hp;
    t.sim(0.25, false);
    if (fighting) { fightT += 0.25; const h = G.player ? G.player.heat || 0 : 0; out.heatSum += h; out.heatN++; if (h > out.heatMax) out.heatMax = h; }
    if (G.player && G.player.hp < hp0) dmg += hp0 - G.player.hp;
    if (mode === 'pressure' && G.player && G.state === 'play') G.player.hp = G.player.maxHp;
  }
  out.nuke = G.nuke.used - out.nuke0; out.heatMean = out.heatN ? +(out.heatSum / out.heatN).toFixed(2) : 0; out.heatMax = +out.heatMax.toFixed(2); delete out.heatSum; delete out.heatN; delete out.nuke0;
  Object.assign(out, { fightT: +fightT.toFixed(1), dmg: Math.round(dmg), kills: G.kills - k0, acc: G.shots > s0 ? +((G.hits - h0) / (G.shots - s0)).toFixed(2) : null,
    state: G.state, dead: G.state !== 'play' });
  // wait for the next wave's roster to exist (out -> intro)
  for (let i = 0; i < 40 && G.state === 'play' && G.phase !== 'intro'; i++) t.step(0.1);
  return out;
}
"""

TANK_IDS = ['std', 'ikiz', 'nisanci', 'makineli', 'uclu', 'cift', 'rayli', 'obus', 'alev', 'sarapnel']
SEED_JS = """(() => { let a = %d >>> 0; Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  window.requestAnimationFrame = () => 0; })()"""


def run(page, mode, strategy, waves, target, nuke):
    seed(page, {'effects': 'low', 'volume': 0})
    page.evaluate('([tg, nk]) => { __tank.botNuke(nk); __tank.noEvo(tg === "std"); }', [target, nuke])
    page.evaluate('__tank.startGame()')
    page.evaluate('() => { for (let i = 0; i < 40 && __tank.G.phase !== "intro"; i++) __tank.step(0.05); }')
    rows = []
    for _ in range(waves):  # one wave per evaluate
        r = page.evaluate(WAVE_JS, [mode, strategy, 240, target])
        rows.append(r)
        if r['dead']:
            break
    return rows


if __name__ == '__main__':
    mode, strategy, waves, runs = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
    tank = sys.argv[5] if len(sys.argv) > 5 else 'random'
    nuke = (sys.argv[6] if len(sys.argv) > 6 else 'on') == 'on'
    sd = int(sys.argv[7]) if len(sys.argv) > 7 else None
    assert tank in ('random', 'all') or tank in TANK_IDS, tank
    allruns = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = None if sd is not None else new_ctx(b, 'probe', viewport={'width': 1280, 'height': 800})
        page = ctx.new_page() if ctx else None
        for i in range(runs):
            if sd is not None:  # deterministic: a fresh context per run with its own seed
                c = new_ctx(b, 'probe', viewport={'width': 1280, 'height': 800})
                c.add_init_script(SEED_JS % (sd + i))
                page = c.new_page()
            tg = TANK_IDS[i % 10] if tank == 'all' else tank
            allruns.append(run(page, mode, strategy, waves, tg, nuke))
            if sd is not None:
                c.close()
        b.close()
    (TMP / 'balance').mkdir(parents=True, exist_ok=True)
    out = str(TMP / 'balance' / f'{mode}_{strategy}_{tank}_{"on" if nuke else "off"}{"" if sd is None else "_s" + str(sd)}.json')
    json.dump(allruns, open(out, 'w'))
    print('saved', out, 'waves reached per run:', [len(r) for r in allruns], 'ERRORS:', real_errors()[:3] or 'none')
