"""Serbest Mod: setup screen, boss/wave starts, presets, no storage writes, Tekrar/Kurulum. Short summary; full report in .tmp/check_sandbox.json.
Usage: TANK_TEST_PORT=8830 python3 tests/check_sandbox.py"""
from common import *  # noqa: F401,F403

fails, rep = [], {}
def ck(name, ok, info=None):
    rep[name] = {'ok': bool(ok), 'info': info}
    if not ok: fails.append(name)

STORE = "(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; })()"
INFO = "(() => { const G = __tank.G; return { sandbox: G.sandbox, state: G.state, phase: G.phase, wave: G.wave, tank: G.tank, up: Object.assign({}, G.up), stage: G.stage ? G.stage.id : null, boss: G.boss ? G.boss.def.id : null, theme: G.map && G.map.theme ? G.map.theme.key : null, noEvo: G.noEvo }; })()"
vis = lambda page, id: page.evaluate(f"!document.getElementById('{id}').classList.contains('hidden')")

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = new_ctx(b, 'sbx', viewport={'width': 390, 'height': 844}, device_scale_factor=1, is_mobile=True, has_touch=True)
    page = ctx.new_page(); seed(page)
    before = page.evaluate(STORE)
    # 1. menu opens
    page.tap('#btnSandbox'); page.wait_for_timeout(300)
    ck('menu_opens', vis(page, 'sbx') and not vis(page, 'menu') and page.locator('#sbxTanks .sbx-tank').count() >= 10, page.locator('#sbxTanks .sbx-tank').count())
    bosses = page.evaluate("[...document.querySelectorAll('#sbxTargets button[data-b]')].map(b => b.dataset.b).filter(Boolean)")
    defs = page.evaluate("Object.keys(__tank.BOSS_DEFS)")
    ck('boss_list_matches_defs', sorted(bosses) == sorted(defs), {'ui': bosses, 'defs': defs})
    # 2. defaults start a run (Orta, wave 8, Çöl, Standart)
    page.tap('#btnSbxGo'); page.wait_for_timeout(400)
    i = page.evaluate(INFO)
    ck('defaults_start', i['sandbox'] and i['state'] == 'play' and i['wave'] == 8 and i['tank'] == 'std' and i['theme'] == 'desert' and i['noEvo'] and not vis(page, 'sbx'), i)
    ck('sbx_tag_visible', page.evaluate("getComputedStyle(document.getElementById('sbxTag')).display !== 'none'"))
    # 3. presets
    page.evaluate('__tank.pauseGame()'); page.wait_for_timeout(100)
    ck('pause_has_kurulum', vis(page, 'btnPauseSbx'))
    page.tap('#btnPauseSbx'); page.wait_for_timeout(300)
    ck('pause_kurulum_opens_setup', vis(page, 'sbx') and page.evaluate(INFO)['sandbox'] is False)
    res = {}
    for pid in ['none', 'mid', 'full']:
        page.tap(f'#sbxPresets button[data-p="{pid}"]')
        pressed = page.evaluate("document.querySelector('#sbxPresets button[aria-pressed=true]').dataset.p")
        page.tap('#btnSbxGo'); page.wait_for_timeout(250)
        up = page.evaluate(INFO)['up']
        res[pid] = {'up': up, 'pressed': pressed}
        page.evaluate('__tank.pauseGame()'); page.tap('#btnPauseSbx'); page.wait_for_timeout(200)
    full_ok = page.evaluate("(up) => Object.keys(up).length === 11 && Object.entries(up).every(([k, v]) => v >= 1)", res['full']['up'])
    ck('preset_yok', res['none']['up'] == {} and res['none']['pressed'] == 'none', res['none'])
    ck('preset_orta', res['mid']['up'] == {'armor': 3, 'engine': 2, 'loader': 3, 'caliber': 2, 'barrel': 2, 'repair': 2, 'magnet': 1, 'boost': 2} and res['mid']['pressed'] == 'mid', res['mid'])
    ck('preset_tam', full_ok and res['full']['up'].get('armor') == 5 and res['full']['up'].get('thermal') == 1 and res['full']['pressed'] == 'full', res['full'])
    # card tap cycles and wraps
    page.tap('#sbxPresets button[data-p="none"]')
    for _ in range(3): page.tap('#sbxCards .sbx-card[data-k="thermal"]')  # max 1: 1, 0, 1
    for _ in range(2): page.tap('#sbxCards .sbx-card[data-k="engine"]')
    page.tap('#sbxPresets button[data-p="none"]')
    for _ in range(5): page.tap('#sbxCards .sbx-card[data-k="barrel"]')  # max 3: 1,2,3,0,1
    for _ in range(3): page.tap('#sbxCards .sbx-card[data-k="engine"]')
    # 4. each boss with a chosen tank and cards
    page.tap('#sbxTanks .sbx-tank[data-t="rayli"]')
    page.tap('#sbxPresets button[data-p="none"]'); page.tap('#sbxCards .sbx-card[data-k="armor"]'); page.tap('#sbxCards .sbx-card[data-k="armor"]')
    bres = {}
    for bid in bosses:
        page.tap(f'#sbxTargets button[data-b="{bid}"]'); page.tap('#btnSbxGo'); page.wait_for_timeout(300)
        i = page.evaluate(INFO)
        bres[bid] = i
        ck(f'boss_{bid}', i['sandbox'] and i['stage'] == bid and i['boss'] == bid and i['tank'] == 'rayli' and i['up'] == {'armor': 2} and i['state'] == 'play', i)
        if bid == 'kiragi':  # the Donmuş Göl stage: snow theme, the 5x3 lake (15 water tiles) on the map, Kırağı alive with its stealth state
            kk = page.evaluate("(() => { const G = __tank.G, e = G.boss; return { theme: G.map.theme && G.map.theme.key, lake: e && e.kr ? e.kr.lake.length : -1, name: e && e.def.arena, water: e && e.kr ? e.kr.lake.filter(q => G.map.t[q.r * G.map.n + q.c] === __tank.WATER).length : -1 }; })()")
            ck('boss_kiragi_donmus_gol', kk['theme'] == 'snow' and kk['name'] == 'gol' and kk['lake'] == 15 and kk['water'] == 15, kk)
        page.evaluate('__tank.pauseGame()'); page.tap('#btnPauseSbx'); page.wait_for_timeout(200)
    # boss win -> end screen with Tekrar / Kurulum
    bid = bosses[0] if bosses else None
    if bid:
        page.tap(f'#sbxTargets button[data-b="{bid}"]'); page.tap('#btnSbxGo'); page.wait_for_timeout(200)
        page.evaluate('__tank.bossSkip()'); page.evaluate('__tank.step(1)')
        page.evaluate('(() => { const G = __tank.G; __tank.hurtBoss(1e9); })()')
        for _ in range(40):
            page.evaluate('__tank.step(1)')
            if page.evaluate('__tank.G.state') != 'play': break
        ck('boss_win_end_screen', vis(page, 'sbxEnd') and page.evaluate('__tank.G.state') == 'over' and 'YENİLDİ' in page.inner_text('#sbxEndTitle'), page.evaluate('__tank.info()'))
        page.tap('#btnSbxAgain'); page.wait_for_timeout(300)
        i = page.evaluate(INFO)
        ck('win_tekrar', i['sandbox'] and i['stage'] == bid and i['state'] == 'play' and not vis(page, 'sbxEnd'), i)
        page.evaluate('__tank.gameOver()'); page.wait_for_timeout(100)
        ck('death_end_screen', vis(page, 'sbxEnd') and 'İMHA' in page.inner_text('#sbxEndTitle'))
        page.tap('#btnSbxSetup'); page.wait_for_timeout(300)
        ck('death_kurulum', vis(page, 'sbx') and not vis(page, 'sbxEnd') and page.evaluate(INFO)['state'] == 'menu')
    # 5. wave mode: wave + theme
    page.tap('#sbxTargets button[data-b=""]'); page.tap('#sbxMaps button[data-m="2"]')
    for _ in range(4): page.tap('#sbxPlus')
    wn = int(page.inner_text('#sbxWaveN'))
    page.tap('#btnSbxGo'); page.wait_for_timeout(300)
    i = page.evaluate(INFO)
    ck('wave_mode', i['state'] == 'play' and i['stage'] is None and i['wave'] == wn and i['theme'] == 'snow', {'want': wn, **i})
    # workshop still happens between waves
    page.evaluate('__tank.killAll(); __tank.step(0.1)')
    for _ in range(12):
        page.evaluate('__tank.step(0.5)')
        if page.evaluate('__tank.G.phase') == 'upgrade': break
    ck('workshop_in_wave_mode', page.evaluate('__tank.G.phase') == 'upgrade' and vis(page, 'upgrade'), page.evaluate('__tank.G.phase'))
    # Tekrar after dying in wave mode keeps the same setup
    page.evaluate('__tank.gameOver()'); page.tap('#btnSbxAgain'); page.wait_for_timeout(300)
    i = page.evaluate(INFO)
    ck('death_tekrar', i['wave'] == wn and i['theme'] == 'snow' and i['sandbox'] and i['state'] == 'play', i)
    # wave bounds
    page.evaluate('__tank.pauseGame()'); page.tap('#btnPauseSbx')
    for _ in range(45): page.tap('#sbxPlus') if _ < 3 else None
    page.evaluate("(() => { for (let i = 0; i < 50; i++) document.getElementById('sbxPlus').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); document.getElementById('sbxPlus').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); })()")
    hi = int(page.inner_text('#sbxWaveN'))
    page.evaluate("(() => { for (let i = 0; i < 60; i++) document.getElementById('sbxMinus').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); document.getElementById('sbxMinus').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); })()")
    lo = int(page.inner_text('#sbxWaveN'))
    ck('wave_bounds', hi == 40 and lo == 1, [lo, hi])
    # Ağır Topçu in a chosen Kar wave 23+ (no boss beaten: the region rule has not removed anything)
    page.evaluate('__tank.toMenu()'); page.tap('#btnSandbox'); page.wait_for_timeout(300)
    page.tap('#sbxTargets button[data-b=""]'); page.tap('#sbxMaps button[data-m="2"]')
    page.evaluate("(() => { for (let i = 0; i < 40; i++) document.getElementById('sbxPlus').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); document.getElementById('sbxPlus').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); })()")
    page.evaluate("(() => { for (let i = 0; i < 14; i++) document.getElementById('sbxMinus').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); document.getElementById('sbxMinus').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); })()")
    w26 = int(page.inner_text('#sbxWaveN'))
    page.tap('#btnSbxGo'); page.wait_for_timeout(300)
    tp = page.evaluate("(() => { const t = __tank, G = t.G; let n = 0; for (let i = 0; i < 60; i++) if (t.buildRoster(G.wave).list.includes('topcu')) n++; return { wave: G.wave, theme: G.map.theme && G.map.theme.key, draws: n, banned: t.typeBanned('topcu') }; })()")
    ck('sandbox_kar_wave_has_topcu', tp['wave'] == w26 and w26 >= 23 and tp['theme'] == 'snow' and tp['draws'] > 30 and not tp['banned'], {'want': w26, **tp})
    # 6. storage untouched
    after = page.evaluate(STORE)
    changed = {k: [before.get(k), after.get(k)] for k in set(before) | set(after) if before.get(k) != after.get(k)}
    ck('no_storage_writes', not changed, changed)
    # normal game afterwards still records
    page.evaluate('__tank.toMenu()'); page.tap('#btnStart'); page.wait_for_timeout(300)
    page.evaluate('__tank.gameOver()'); page.wait_for_timeout(100)
    rec = page.evaluate("localStorage.getItem('tankArena.records')")
    ck('normal_run_still_records', rec is not None and not page.evaluate(INFO)['sandbox'], rec)
    ctx.close(); b.close()
ck('no_page_errors', not real_errors(), real_errors())
write_report('check_sandbox', rep)
print(f"check_sandbox: {sum(v['ok'] for v in rep.values())}/{len(rep)} ok")
for n in fails: print('FAIL', n, short(rep[n]['info'], 200))
print('ERRORS:', real_errors() or 'none')
sys.exit(1 if fails else 0)
