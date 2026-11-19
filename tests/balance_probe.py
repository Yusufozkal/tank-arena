"""Balance probe: the autopilot plays waves; per wave we log player firepower vs enemy toughness and incoming damage.

mode 'pressure': armour is refilled every 0.25 s so the run never ends; we record how much damage the wave dealt.
mode 'survive' : a normal run; we record the wave where the tank dies.
strategy 'random' picks workshop cards at random, 'offense' always takes the strongest damage card on offer.

Usage: python3 tests/balance_probe.py <easy|normal|hard> <survive|pressure> <random|offense> <max waves> <runs>
e.g.   python3 tests/balance_probe.py normal survive random 40 20   (~20 s; results in .tmp/balance/)
Then:  python3 tests/balance_report.py
HP below must match the enemy hp values in SPECS in game/index.html.
"""
import json, sys
from common import *  # noqa: F401,F403

WAVE_JS = r"""
([mode, strategy, maxT]) => {
  const t = __tank, G = t.G, HP = { basic: 2, fast: 1, heavy: 5, boss: 34, hunter: 3 };
  const PRI = ['twin', 'caliber', 'loader', 'blast', 'ricochet', 'armor', 'repair', 'barrel', 'engine', 'boost', 'magnet', 'thermal', 'prep', 'fix', 'bounty'];
  const w = G.wave, sp = t.playerSpec(), up = Object.assign({}, G.up);
  const roster = G.queue.slice().concat(G.enemies.map(e => e.type));
  const ehp = roster.reduce((s, ty) => s + (HP[ty] || 0), 0) * G.mods.hp;
  const out = { wave: w, dps: +(sp.dmg * (sp.twin ? 2 : 1) / sp.cool).toFixed(2), shell: +sp.dmg.toFixed(2), cool: +sp.cool.toFixed(3), twin: sp.twin,
    ehp: +ehp.toFixed(1), n: roster.length, mix: roster.reduce((m, ty) => (m[ty] = (m[ty] || 0) + 1, m), {}), hpMul: +G.mods.hp.toFixed(2),
    eCool: +G.mods.cool.toFixed(2), eErr: +G.mods.err.toFixed(3), maxHp: G.player.maxHp, up };
  let dmg = 0, fightT = 0, t0 = G.time, k0 = G.kills, s0 = G.shots, h0 = G.hits;
  while (G.state === 'play' && G.time - t0 < maxT) {
    if (G.phase === 'upgrade') {
      const ch = t.choices();
      const k = strategy === 'offense' ? (PRI.find(x => ch.includes(x)) || ch[0]) : ch[Math.floor(Math.random() * ch.length)];
      t.choose(k); out.pick = k; break;
    }
    if (G.phase === 'cleared' || G.phase === 'out') { t.step(0.25); continue; }
    const fighting = G.phase === 'fight', hp0 = G.player.hp;
    t.sim(0.25, false);
    if (fighting) fightT += 0.25;
    if (G.player && G.player.hp < hp0) dmg += hp0 - G.player.hp;
    if (mode === 'pressure' && G.player && G.state === 'play') G.player.hp = G.player.maxHp;
  }
  Object.assign(out, { fightT: +fightT.toFixed(1), dmg: Math.round(dmg), kills: G.kills - k0, acc: G.shots > s0 ? +((G.hits - h0) / (G.shots - s0)).toFixed(2) : null,
    state: G.state, dead: G.state !== 'play' });
  // wait for the next wave's roster to exist (out -> intro)
  for (let i = 0; i < 40 && G.state === 'play' && G.phase !== 'intro'; i++) t.step(0.1);
  return out;
}
"""

def run(page, mode, strategy, waves, label):
    seed(page, {'effects': 'low', 'volume': 0})
    page.evaluate('__tank.startGame()')
    page.evaluate('() => { for (let i = 0; i < 40 && __tank.G.phase !== "intro"; i++) __tank.step(0.05); }')
    rows = []
    for _ in range(waves):  # one wave per evaluate
        r = page.evaluate(WAVE_JS, [mode, strategy, 240])
        rows.append(r)
        if r['dead']:
            break
    return rows

if __name__ == '__main__':
    mode, strategy, waves, runs = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
    allruns = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = new_ctx(b, 'probe', viewport={'width': 1280, 'height': 800})
        page = ctx.new_page()
        for i in range(runs):
            allruns.append(run(page, mode, strategy, waves, f'{strategy}{i}'))
        b.close()
    (TMP / 'balance').mkdir(parents=True, exist_ok=True)
    out = str(TMP / 'balance' / f'{mode}_{strategy}.json')
    json.dump(allruns, open(out, 'w'))
    print('saved', out, 'waves reached per run:', [len(r) for r in allruns], 'ERRORS:', real_errors()[:3] or 'none')
