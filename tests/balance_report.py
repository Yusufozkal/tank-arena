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


files = sorted(DIR.glob('survive_*.json'))
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
