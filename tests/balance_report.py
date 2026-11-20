"""Summarises .tmp/balance/*.json from tests/balance_probe.py: where runs end, and how hard waves are for runs that keep going.

The 1.2.1 baseline (40 runs on the old normal difficulty, half random cards, half offense-first) is in docs/BALANCE.md.
"""
import collections
import json
import statistics as st
import sys
from pathlib import Path

DIR = Path(__file__).resolve().parents[1] / '.tmp' / 'balance'
GROUPS = ('1-4', '5', '6-9', '10', '11-39', '40+')


def group(w, dead):
    if not dead:
        return '40+'
    return '1-4' if w < 5 else '5' if w == 5 else '6-9' if w < 10 else '10' if w == 10 else '11-39' if w < 40 else '40+'


files = sorted(f for f in DIR.glob('survive_*.json') if '_s' not in f.stem.rsplit('_', 1)[-1] or not f.stem.rsplit('_', 1)[-1][1:].isdigit())  # seeded A/B files (…_s<N>) are not part of the tables
if not files:
    sys.exit(f'no survive results in {DIR}; run tests/balance_probe.py first')

by_strat = collections.defaultdict(collections.Counter)
survivors = collections.defaultdict(list)
for f in files:
    strat = f.stem.split('_', 1)[1]
    for run in json.load(open(f)):
        last = run[-1]
        by_strat[strat][group(last['wave'], last['dead'])] += 1
        if not last['dead']:
            survivors[strat] += run

print('Where runs end (count per wave group):')
print(f"  {'':8s}" + ''.join(f'{g:>7s}' for g in GROUPS))
for strat, c in by_strat.items():
    print(f'  {strat:8s}' + ''.join(f'{c[g]:7d}' for g in GROUPS))

print('\nEnd-wave summary (a run that reaches the cap counts as the cap):')
allw = []
for f in files:
    strat = f.stem.split('_', 1)[1]
    runs = json.load(open(f))
    ends = [r[-1]['wave'] for r in runs]
    allw += ends
    cap = max(len(r) for r in runs)
    reach = sum(1 for r in runs if not r[-1]['dead'])
    ec = collections.Counter(r[-1]['wave'] for r in runs if r[-1]['dead'])
    w, c = ec.most_common(1)[0] if ec else (0, 0)
    print(f'  {strat:8s} runs {len(runs):3d}  mean {st.mean(ends):5.1f}  median {st.median(ends):5.1f}  reach cap {reach}/{len(runs)} ({100*reach/len(runs):.0f}%)'
          f'  worst wave {w} ends {c}/{len(runs)} ({100*c/len(runs):.0f}%)')
print(f'  all      mean {st.mean(allw):5.1f}  median {st.median(allw):5.1f}')
ends1_4 = sum(1 for f in files for r in json.load(open(f)) if r[-1]['dead'] and r[-1]['wave'] < 5)
print(f'  waves 1-4 end {ends1_4}/{len(allw)} runs')
for f in sorted(DIR.glob('pressure_*.json')):
    rows = [x for r in json.load(open(f)) for x in r]
    print(f'  {f.stem}: damage per wave, mean by band: ' + '  '.join(
        f"{lo}-{hi}: {st.mean(x['dmg'] for x in rows if lo <= x['wave'] <= hi):.1f}" for lo, hi in ((1, 4), (5, 10), (11, 20), (21, 30), (31, 40)) if any(lo <= x['wave'] <= hi for x in rows)))

print('\nRuns that reach the cap, per wave band (non-boss waves): fight seconds, damage taken, player dps, enemy hp in the wave')
for strat, rows in survivors.items():
    for lo, hi in ((1, 4), (6, 9), (11, 14), (16, 19), (21, 29), (31, 40)):
        xs = [x for x in rows if lo <= x['wave'] <= hi and x['wave'] % 5]
        if xs:
            print(f"  {strat:8s} waves {lo:>2}-{hi:<2}  fight {st.mean(x['fightT'] for x in xs):5.1f}s  dmg {st.mean(x['dmg'] for x in xs):5.1f}"
                  f"  dps {st.mean(x['dps'] for x in xs):5.1f}  enemy hp {st.mean(x['ehp'] for x in xs):6.1f}")


# ---------------------------------------------------------------- 1.4: per tank, dominance, nuke
TIER = {'std': 0, 'ikiz': 1, 'nisanci': 1, 'makineli': 1, 'uclu': 2, 'cift': 2, 'rayli': 2, 'obus': 2, 'alev': 2, 'sarapnel': 2}


def tank_of(run):
    tg = run[0].get('target')
    return tg if tg in TIER else run[-1].get('tank', 'std')  # random-tank runs count for the tank they ended with


per = collections.defaultdict(list)  # tank -> list of runs
allruns = [r for f in files for r in json.load(open(f))]
for r in allruns:
    per[tank_of(r)].append(r)
if len(per) > 1 or any(k != 'std' for k in per):
    print('\nPer tank (survive runs; a tank id is a run that targeted that tank, random runs count for the tank they ended with; tier-1 targets stay tier 1):')
    print(f"  {'tank':9s}{'n':>4s}{'mean':>7s}{'median':>8s}{'reach40':>9s}{'worst wave':>13s}   pressure dmg/wave")
    pdmg = collections.defaultdict(list)
    for f in sorted(DIR.glob('pressure_*.json')):
        for r in json.load(open(f)):
            for x in r:
                pdmg[x.get('tank', 'std')].append(x['dmg'])
    means = {}
    for t in TIER:
        rs = per.get(t, [])
        if not rs:
            continue
        ends = [r[-1]['wave'] for r in rs]
        means[t] = st.mean(ends)
        ec = collections.Counter(r[-1]['wave'] for r in rs if r[-1]['dead'])
        w, c = ec.most_common(1)[0] if ec else (0, 0)
        reach = sum(1 for r in rs if not r[-1]['dead'])
        pd = f'{st.mean(pdmg[t]):6.1f}' if pdmg.get(t) else '     -'
        print(f"  {t:9s}{len(rs):4d}{means[t]:7.1f}{st.median(ends):8.1f}{100*reach/len(rs):8.0f}%  w{w:<3d}{100*c/len(rs):3.0f}%      {pd}")
    print('\nDominance check (end-wave mean within +-3 waves or +-20% of the group mean; std is the 1.3 baseline of a player who never evolves, compared separately):')
    for name, grp in (('tier 1', ['ikiz', 'nisanci', 'makineli']), ('tier 2', ['uclu', 'cift', 'rayli', 'obus', 'alev', 'sarapnel'])):
        have = [t for t in grp if t in means]
        if len(have) < 2:
            continue
        gm = st.mean(means[t] for t in have)
        lim = max(3.0, 0.2 * gm)
        bad = [t for t in have if abs(means[t] - gm) > lim]
        print(f"  {name:14s} group mean {gm:5.1f}  limit +-{lim:.1f}  " + ('OK' if not bad else 'OUT: ' + ', '.join(f'{t} {means[t]:.1f}' for t in bad)))

if 'std' in means and all(t in means for t in ('ikiz', 'nisanci', 'makineli')):
    t1 = st.mean(means[t] for t in ('ikiz', 'nisanci', 'makineli'))
    print(f"  std (baseline) {means['std']:5.1f}  vs tier-1 mean {t1:.1f}  (evolution is expected to help: std is lower)")

rows_all = [x for r in allruns for x in r]
if rows_all and 'nuke' in rows_all[0]:
    print('\nNuke uses per wave played (survive runs), by wave band, and the Komutan waves:')
    for lo, hi in ((1, 4), (5, 9), (10, 14), (15, 19), (20, 29), (30, 40)):
        xs = [x for x in rows_all if lo <= x['wave'] <= hi]
        if xs:
            print(f"  waves {lo:>2}-{hi:<2} {sum(x['nuke'] for x in xs)/len(xs):5.2f} per wave  ({len(xs)} waves)")
    print(f"  all waves   {sum(x['nuke'] for x in rows_all)/len(rows_all):5.2f} per wave  (target about 0.33)")
    boss = [x for x in rows_all if x['wave'] % 5 == 0]
    norm = [x for x in rows_all if x['wave'] % 5]
    deaths_b = sum(1 for x in boss if x['dead'])
    print(f"  Komutan waves: {len(boss)} played, {deaths_b} deaths ({100*deaths_b/max(1, len(boss)):.0f}%), mean damage {st.mean(x['dmg'] for x in boss):.1f}, nuke used {sum(x['nuke'] for x in boss)/max(1, len(boss)):.2f}/wave")
    print(f"  other waves:   {len(norm)} played, {sum(1 for x in norm if x['dead'])} deaths ({100*sum(1 for x in norm if x['dead'])/max(1, len(norm)):.1f}%), mean damage {st.mean(x['dmg'] for x in norm):.1f}")


# ---------------------------------------------------------------- 1.4.1: pacing targets (all survive files together)
_runs = [r for r in allruns if r]
if _runs:
    _deaths = [r[-1]['wave'] for r in _runs if r[-1]['dead']]
    _lost = [100 * x['dmg'] / max(1, x['maxHp']) for r in _runs for x in r if x['wave'] > 3]
    _by = collections.Counter(_deaths)
    _top = _by.most_common(1)[0] if _by else (0, 0)
    print('\nPacing (1.4.1 targets: deaths before wave 10 <= ~15%, armour lost per wave after wave 3 >= ~15%, one wave <= ~12% of deaths, reach 40 <= ~15%):')
    print(f"  runs {len(_runs)}  died before wave 10: {sum(1 for w in _deaths if w < 10)} ({100*sum(1 for w in _deaths if w < 10)/len(_runs):.0f}%)"
          f"  mean end wave {st.mean(r[-1]['wave'] for r in _runs):.1f}  reach 40: {sum(1 for r in _runs if not r[-1]['dead'])} ({100*sum(1 for r in _runs if not r[-1]['dead'])/len(_runs):.0f}%)")
    print(f"  armour lost per wave after wave 3 (% of max armour, mean over waves played): {st.mean(_lost):.1f}%"
          + '   by band: ' + '  '.join(f"{lo}-{hi}: {st.mean([100*x['dmg']/max(1, x['maxHp']) for r in _runs for x in r if lo <= x['wave'] <= hi]):.1f}%" for lo, hi in ((4, 9), (10, 19), (20, 29), (30, 40)) if any(lo <= x['wave'] <= hi for r in _runs for x in r)))
    print(f"  busiest death wave: {_top[0]} with {_top[1]} of {len(_deaths)} deaths ({100*_top[1]/max(1, len(_deaths)):.0f}%)")
