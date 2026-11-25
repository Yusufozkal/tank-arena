/* ================= game flow ================= */
function startGame(resume, sbx) { // sbx: Serbest Mod setup {tank, ups, boss, wave, theme} (13a)
  Sound.init(); Sound.resume();
  for (const x of [el.menu, el.over, el.pause, el.upgrade, $('settings'), $('guide'), $('sbx'), $('sbxEnd')]) x.classList.add('hidden');
  G.sandbox = !!sbx; G.sbx = sbx || null; G.sbxWin = false; G.noEvo = !!sbx; el.hud.classList.toggle('sbx', !!sbx);
  el.hud.classList.remove('hidden');
  hideBanner();
  G.state = 'play'; G.timeScale = 1; G.hurt = 0; G.boss = null;
  G.wave = 0; G.score = 0; G.kills = 0; G.shots = 0; G.hits = 0;
  G.buffs = freshBuffs(); G.buffMax = freshBuffs(); G.strikes = []; G.jet = null; G.airQ = 0;
  G.D = RULES;
  G.dodges = 0; G.covers = 0;
  G.beaten = new Set(resume && Array.isArray(resume.beaten) ? resume.beaten.filter(id => typeof id === 'string') : []); // bosses beaten this run: the region rule (11)
  nukeReset(resume && resume.nuke); // nuke meter: restored on resume
  G.up = {}; G.tank = 'std'; G.upMode = 'cards'; G.evoWait = 0;
  if (resume && resume.ups && typeof resume.ups === 'object') for (const k of UP_KEYS) { const L = resume.ups[k] | 0; if (L > 0) G.up[k] = Math.min(L, UPS[k].max); }
  if (resume) { // saved tank; an old save that owned the removed twin card becomes the Ikiz tank; unknown ids fall back to Standart
    if (typeof resume.tank === 'string' && Object.prototype.hasOwnProperty.call(TANKS, resume.tank)) G.tank = resume.tank;
    else if (!resume.tank && resume.ups && typeof resume.ups === 'object' && LEGACY_UPS.some(k => (resume.ups[k] | 0) > 0)) G.tank = 'ikiz';
  }
  if (sbx) { G.up = Object.assign({}, sbx.ups); G.tank = sbx.tank; }
  G.player = makeTank('player', 0, 0);
  refreshPlayer(); G.player.hp = G.player.maxHp;
  if (sbx) G.wave = Math.max(0, sbx.wave - 1);
  if (resume) {
    G.wave = Math.max(0, (resume.wave | 0) - 1); G.score = resume.score | 0; G.kills = resume.kills | 0;
    G.shots = resume.shots | 0; G.hits = resume.hits | 0; G.player.hp = clamp(resume.hp | 0, 10, G.player.maxHp);
  }
  G.resume = null;
  releaseInput(); resetUI();
  nextWave(sbx && sbx.boss ? BOSS_DEFS[sbx.boss] : null);
  sizeMini(); measureHud();
  if (G.wave === 1) showHint(input.touch ? 'Sol başparmakla sür, sağ başparmakla nişan al ve ateş et' : 'WASD ile sür, fareyle nişan al, tıklayarak ateş et', 5);
}
const prevBoss = w => { const bd = bossDefAt(w - 1); return bd && G.beaten.has(bd.id) ? bd.id : ''; }; // the boss of the wave before w, if it was a boss wave and is beaten
function nextWave(forceBd) { // forceBd: Serbest Mod starts a chosen boss stage
  G.wave++;
  if (!G.sandbox && G.wave > 1 && (G.wave - 1) % 40 === 0) G.beaten.clear(); // İkinci Tur (and later rounds): the regions start again and every enemy type returns (region rule reset)
  const w = G.wave, bd = forceBd || bossDefAt(w), theme = G.sandbox && G.sbx && !bd ? THEMES[G.sbx.theme] || themeFor(w) : themeFor(w); // theme: 10-wave regions; boss waves get a fixed arena (11a)
  G.map = bd ? loadArena(bd.arena, theme) : makeArena(generate(), theme);
  G.stage = null; G.tele = []; G.pieces = [];
  G.enemies = []; G.bullets = []; G.pickups = []; G.portals = []; G.texts = []; G.strikes = []; G.jet = null; parts.length = 0; tm.n = 0; tm.head = 0;
  const p = G.player, start = bd ? G.map.playerAt : { x: HALF * T + T / 2, y: HALF * T + T / 2 };
  p.x = start.x; p.y = start.y; p.vx = p.vy = p.avx = p.avy = 0; p.angle = p.turret = -Math.PI / 2; p.pl = p.pr = null;
  p.heat = 0; p.overheatT = 0; p.pushT = 0; p.flameOn = false; // Makineli heat etc. start cold every wave
  const ro = buildRoster(w); G.queue = ro.list; G.maxAlive = ro.maxAlive; G.mods = waveMods(w); G.spawnTimer = 0.4; G.boss = null;
  G.phase = 'intro'; G.phaseT = 0; G.fade = 1;
  cam.x = p.x; cam.y = p.y; cam.shake = 0; clampCam(); computeView();
  if (bd) { startBossStage(bd); return; } // fade-in, siren, name title, boss breaks out of the gate
  if (!G.sandbox && w > 1 && (w - 1) % 40 === 0) { const rd = bossRound(w); Sound.wave(false); showBanner(rd === 1 ? 'İKİNCİ TUR' : (rd + 1) + '. TUR', theme.name + ' · bosslar daha güçlü', 3.2); return; } // a new round: the regions start again
  if (!G.sandbox && w > 1 && w % 10 === 1 && regionGone(prevBoss(w)).length) showBanner(theme.name.toLocaleUpperCase('tr-TR'), regionGone(prevBoss(w)).join(' ve ') + ' artık seyrek geliyor', 3); // first wave of a new region: who now comes rarely
  else showBanner('DALGA ' + w, theme.name, 2.2);
  Sound.wave(false);
}
function waveCleared() {
  G.phase = 'cleared'; G.phaseT = 0;
  if (G.sandbox && G.sbx.boss) { G.sbxWin = true; Sound.cleared(); return; } // Serbest Mod boss target: the end screen follows, no bonus or loot
  if (G.sandbox) { /* no region rule state in Serbest Mod */ } else if (G.wave % 5 === 0) { const bd = bossDefAt(G.wave); if (bd) G.beaten.add(bd.id); } // the region rule: this boss's enemy types stop coming (11)
  const bonus = Math.round(100 * G.wave * G.D.score), p = G.player, heal = Math.min(Math.max(8, G.D.heal - Math.max(0, G.wave - 10)), p.maxHp - p.hp); // field repairs shrink after wave 10 (25 -> 8)
  G.score += bonus; p.hp += heal;
  G.bullets = G.bullets.filter(b => b.owner === 0);
  showBanner('DALGA TEMİZLENDİ', '+' + fmt(bonus) + ' bonus' + (heal >= 1 ? ', +' + Math.round(heal) + ' zırh' : ''), 2.3);
  Sound.cleared();
}
function updatePhase(rdt) {
  G.phaseT += rdt;
  switch (G.phase) {
    case 'bossIntro': bossIntroTick(rdt); break;
    case 'intro': G.fade = clamp(1 - G.phaseT / 0.5, 0, 1); if (G.phaseT > 1.5) { G.phase = 'fight'; G.phaseT = 0; } break;
    case 'fight': if (!G.queue.length && !G.enemies.length && !G.portals.length) waveCleared(); break;
    case 'cleared': if (G.sbxWin) { if (G.phaseT > 2.4) sandboxEnd(true); } else if (G.phaseT > 2.2) showUpgrades(); break;
    case 'upgrade': break; // waits for the player's card
    case 'out': G.fade = clamp(G.phaseT / 0.45, 0, 1); if (G.phaseT >= 0.5) nextWave(); break;
    case 'dying': if (G.phaseT > 1.7) gameOver(); break;
  }
}
/* ---- workshop: pick one of three upgrades between waves ---- */
let upChoices = [], upShownAt = 0;
function rollUpgrades() {
  const p = G.player, pool = UP_KEYS.filter(k => upL(k) < UPS[k].max), out = [];
  const wt = k => (UPS[k].rare ? 3.5 : 10);
  const take = list => { let r = Math.random() * list.reduce((a, k) => a + wt(k), 0); for (const k of list) { r -= wt(k); if (r <= 0) return k; } return list[list.length - 1]; };
  if (G.wave % 5 === 0) { const rares = pool.filter(k => UPS[k].rare); if (rares.length) out.push(pick(rares)); } // the Komutan always leaves a rare part
  while (out.length < 3) { const left = pool.filter(k => !out.includes(k)); if (!left.length) break; out.push(take(left)); }
  if (p && p.hp < p.maxHp * 0.4) { if (out.length >= 3) out[out.length - 1] = 'fix'; else out.push('fix'); }
  const spare = p && p.hp < p.maxHp * 0.95 ? ['fix', 'bounty', 'prep'] : ['bounty', 'prep', 'fix'];
  for (const k of spare) if (out.length < 3 && !out.includes(k)) out.push(k);
  return shuffle(out);
}
function cardHTML(k, i) {
  const u = UPS[k], L = upL(k) + 1, sb = u.extra ? '' : synBadgeHTML(k);
  let lv = '';
  if (!u.extra) {
    const pips = u.max > 1 ? Array.from({ length: u.max }, (_, j) => `<i class="${j < L - 1 ? 'on' : j === L - 1 ? 'new' : ''}"></i>`).join('') : '';
    lv = `<span class="up-lv">${pips}<span>${u.max > 1 ? `Seviye ${L}/${u.max}` : 'Tek parça'}</span>${u.rare ? '<b>Nadir</b>' : ''}</span>`;
  }
  return `<button type="button" class="up-card${u.rare ? ' rare' : ''}${u.extra ? ' extra' : ''}${sb ? ' has-syn' : ''}" data-k="${k}">`
    + `<span class="ico"><svg class="ico-svg" viewBox="0 0 24 24" aria-hidden="true">${u.svg}</svg></span>`
    + `<span class="up-name">${u.name}</span>${lv}<span class="up-desc">${u.desc(L)}</span>${sb}`
    + `<span class="up-key only-fine" aria-hidden="true">${i + 1}</span></button>`;
}
// Tank evolution: debt rule. The player should own a tank of tier needTier(wave); a missed evolution comes back at the next workshop
const evoDue = () => !G.noEvo && TANKS[G.tank].tier < needTier(G.wave) && TANKS[G.tank].kids.length > 0;
const evoRel = id => { const a = TANKS[id], b = TANKS.std; const fp = a.dmg * tankShells(a) / a.cool / (b.dmg * tankShells(b) / b.cool); return { fp, fpHot: a.tr && a.tr.rateGain ? fp * (1 + a.tr.rateGain) : 0, spd: a.speedMul, bs: a.bSpeed / b.bSpeed }; }; // fp: firepower (dps) vs Standart; fpHot: at full heat
function tankCardHTML(id, i) {
  const tk = TANKS[id], r = evoRel(id);
  return `<button type="button" class="up-card tank" data-k="${id}">`
    + `<span class="ico evo"><canvas data-evo="${id}" width="64" height="64" aria-hidden="true"></canvas></span>`
    + `<span class="up-name">${tk.name}</span>`
    + `<span class="evo-stats"><span>Ateş gücü <b>×${dec2(r.fp)}${r.fpHot ? '–' + dec2(r.fpHot) : ''}</b></span><span>Hız <b>×${dec2(r.spd)}</b></span><span>Mermi hızı <b>×${dec2(r.bs)}</b></span></span>`
    + `<span class="up-desc"><b>${tk.traitName}.</b> ${tk.blurb}</span>`
    + `<span class="up-key only-fine" aria-hidden="true">${i + 1}</span></button>`;
}
// small tank sprites on the evolution cards (the same drawTank as in play, bare tank without workshop parts)
function drawEvoSprites() {
  const d = Math.min(window.devicePixelRatio || 1, 2), px = Math.round(64 * d), k = px / 64;
  el.upCards.querySelectorAll('canvas[data-evo]').forEach(cv => {
    cv.width = cv.height = px;
    const g = cv.getContext('2d');
    g.setTransform(k * 0.95, 0, 0, k * 0.95, px / 2, px / 2 + 3 * k);
    drawTank({ id: 0, type: 'player', spec: playerSpec(cv.dataset.evo, true), x: 0, y: 0, angle: -Math.PI / 2, turret: -Math.PI / 2, treadL: 0, treadR: 0, recoil: 0, flash: 0, heat: 0, overheatT: 0, evoT: 0 }, 1, g);
  });
}
function showUpgrades() {
  G.phase = 'upgrade'; G.phaseT = 0; G.evoWait = 0;
  releaseInput(); hideBanner(); canvas.classList.remove('aim');
  const evo = evoDue();
  G.upMode = evo ? 'evo' : 'cards';
  if (evo) {
    upChoices = TANKS[G.tank].kids.slice();
    $('upTitle').textContent = 'TANK EVRİMİ';
    $('upSub').textContent = TANKS[G.tank].tier === 0 ? `Dalga ${G.wave} bitti. Tankın yeni bir biçime geçiyor, birini seç.` : `${TANKS[G.tank].name} dalı ikiye ayrılıyor, birini seç.`;
    el.upCards.innerHTML = upChoices.map(tankCardHTML).join('');
    drawEvoSprites();
  } else {
    upChoices = rollUpgrades();
    const boss = G.wave % 5 === 0;
    $('upTitle').textContent = boss ? (G.stage ? G.stage.loot : 'KOMUTAN GANİMETİ') : 'ATÖLYE';
    $('upSub').textContent = `Dalga ${G.wave} bitti. Tankına bir yükseltme seç.`;
    el.upCards.innerHTML = upChoices.map(cardHTML).join('');
  }
  el.upgrade.classList.remove('hidden');
  const panel = $('upPanel'); if (panel) panel.scrollTop = 0;
  upShownAt = performance.now();
}
// The evolution screen was answered: switch tank, flash, 1 s shield; the card screen follows after a moment (or at once, evoWait = 0)
function chooseTank(id) {
  const p = G.player, tk = TANKS[id], oldMax = p.maxHp;
  G.tank = id; refreshPlayer();
  p.hp = Math.min(p.maxHp, Math.max(1, p.hp * p.maxHp / oldMax)); // keep the armour ratio when the tank has more or less hull
  p.heat = 0; p.overheatT = 0; p.pushT = 0; p.shield1T = 1; p.evoT = 0.7; p.volId = 0;
  upChoices = []; G.upMode = 'cards';
  el.upgrade.classList.add('hidden');
  showBanner(tk.name.toLocaleUpperCase('tr'), tk.traitName + ': ' + tk.blurb, 2.4);
  addPart('ring', p.x, p.y, 0, 0, 0.6, 14, 220, 0, '255,255,255');
  addPart('flash', p.x, p.y, 0, 0, 0.25, 130, 0, 0);
  for (let k = 0; k < 14; k++) { const a = rand(0, TAU); addPart('spark', p.x, p.y, Math.cos(a) * 260, Math.sin(a) * 260, rand(0.3, 0.6), 1, 0, 3, '#ffffff'); }
  Sound.evolve(); vibrate([20, 30, 40]); shake(4);
  G.evoWait = 1.5; // world stays frozen (phase 'upgrade'); updatePlay opens the card screen when the wait is over
}
// open the card screen that follows an evolution (or the next evolution if one is still due)
function finishEvo() { if (G.evoWait > 0 && G.phase === 'upgrade') { G.evoWait = 0; hideBanner(); showUpgrades(); } }
function chooseUpgrade(k) {
  if (G.phase !== 'upgrade' || !upChoices.includes(k)) return;
  if (G.upMode === 'evo') { chooseTank(k); return; }
  const p = G.player, u = UPS[k];
  let label, unlocked = [];
  if (k === 'fix') { p.hp = p.maxHp; label = 'Zırh tam'; }
  else if (k === 'bounty') { const pts = bountyPts(); G.score += pts; label = '+' + fmt(pts) + ' puan'; }
  else if (k === 'prep') { const d = 10 * (1 + 0.25 * upL('boost')); for (const b of ['shield', 'rapid']) { G.buffs[b] = d; G.buffMax[b] = d; } label = 'Kalkan ve seri atış hazır'; }
  else {
    const synBefore = synList().map(sy => sy.id);
    G.up[k] = Math.min(u.max, upL(k) + 1); refreshPlayer();
    unlocked = synUnlocked(synBefore);
    if (k === 'armor') p.hp = Math.min(p.maxHp, p.hp + 20);
    label = u.name + (u.max > 1 ? ' ' + G.up[k] : '');
  }
  upChoices = [];
  el.upgrade.classList.add('hidden');
  addText(p.x, p.y - 34, label, '#f2c14e', 18);
  addPart('ring', p.x, p.y, 0, 0, 0.5, 14, 170, 0, '242,193,78');
  G.phase = 'out'; G.phaseT = -0.55; // a moment to see the new part before the next wave fades in
  if (unlocked.length) { showBanner('BİRLEŞİM AÇILDI', unlocked.map(sy => sy.name + ': ' + sy.desc).join('\n'), 3.2); G.phaseT = -3; } // longer pause: the wave banner must not overwrite it
  Sound.upgrade(); vibrate(20);
}
function upChipsHTML() {
  return UP_KEYS.filter(k => upL(k) > 0).map(k => {
    const u = UPS[k];
    return `<span class="up-chip${u.rare ? ' rare' : ''}"><svg class="ico-svg" viewBox="0 0 24 24" aria-hidden="true">${u.svg}</svg>${u.name}${u.max > 1 ? ` <b>${upL(k)}</b>` : ''}</span>`;
  }).join('');
}
function renderUpList(wrap, list) { const h = upChipsHTML(); $(list).innerHTML = h; $(wrap).classList.toggle('hidden', !h); }

function gameOver() {
  if (G.sandbox) { sandboxEnd(false); return; } // Serbest Mod: no records
  G.state = 'over'; G.timeScale = 1; G.fade = 0;
  el.hud.classList.add('hidden'); el.upgrade.classList.add('hidden'); hideBanner(); el.hint.classList.remove('show');
  renderUpList('overUpsWrap', 'overUps');
  const prev = REC.top, isNew = G.score > prev.score;
  REC.top = { score: Math.max(prev.score, G.score), wave: Math.max(prev.wave, G.wave) };
  REC.kills += G.kills; REC.games += 1;
  store.set('tankArena.records', REC);
  el.sScore.textContent = fmt(G.score); el.sWave.textContent = G.wave; el.sKills.textContent = G.kills;
  el.sAcc.textContent = '%' + Math.round(G.shots ? Math.min(1, G.hits / G.shots) * 100 : 0);
  el.newRec.classList.toggle('hidden', !isNew);
  el.over.classList.remove('hidden');
  G.overFree = freeArea(el.overPanel);
  canvas.classList.remove('aim');
  Sound.over();
}
/* ---- menu records, settings and guide screens ---- */
const SUBS = ['settings', 'guide', 'sbx'];
const subOpen = () => SUBS.some(id => !$(id).classList.contains('hidden'));
function openSub(id) {
  for (const x of [el.menu, el.pause]) x.classList.add('hidden');
  $('resetConfirm').classList.add('hidden');
  const scr = $(id); scr.classList.remove('hidden');
  const panel = scr.querySelector('.panel'); if (panel) panel.scrollTop = 0;
  if (id === 'guide') renderGuideSprites();
  syncSettingsUI();
}
function closeSub() {
  for (const id of SUBS) $(id).classList.add('hidden');
  if (G.state === 'paused') el.pause.classList.remove('hidden');
  else if (G.state === 'menu') { el.menu.classList.remove('hidden'); updateRecords(); }
}
function updateRecords() {
  const b = REC.top;
  $('recScore').textContent = b && b.score > 0 ? fmt(b.score) : '—';
  $('recWave').textContent = b && b.wave > 0 ? String(b.wave) : '—';
  $('recKills').textContent = fmt(REC.kills);
  $('recGames').textContent = fmt(REC.games);
}
function syncSettingsUI() {
  document.querySelectorAll('.seg[data-key]').forEach(seg => {
    const key = seg.dataset.key, val = key === 'swapSticks' ? (SET.swapSticks ? '1' : '0') : String(SET[key]);
    seg.querySelectorAll('button[data-v]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === val)));
  });
  document.querySelectorAll('.switch[data-key]').forEach(sw => sw.setAttribute('aria-checked', String(!!SET[sw.dataset.key])));
  $('setVolume').value = SET.volume; $('setVolumeOut').textContent = SET.volume;
  updateRecords();
}
function applySettings(skipResize) {
  STICK_R = { s: 46, m: 56, l: 68 }[SET.stickSize] || 56;
  fxScale = SET.effects === 'low' ? 0.45 : 1; MAX_PARTS = SET.effects === 'low' ? 240 : 520;
  Sound.setVolume(SET.volume / 100);
  renderSoundBtn(SET.volume > 0);
  miniCv.classList.toggle('hidden', !SET.minimap);
  if (NATIVE && typeof NATIVE.setOrientation === 'function') { try { NATIVE.setOrientation(SET.orientation); } catch (e) { /* older app */ } }
  saveSettings();
  if (!skipResize) resize();
}
function bindUI() {
  $('rowOrient').classList.toggle('hidden', !(NATIVE && typeof NATIVE.setOrientation === 'function'));
  el.upCards.addEventListener('click', ev => {
    const b = ev.target.closest('button[data-k]'); if (!b) return;
    if (performance.now() - upShownAt < 550) return; // a tap meant for the arena should not pick a card
    chooseUpgrade(b.dataset.k);
  });
  document.querySelectorAll('.seg[data-key]').forEach(seg => seg.addEventListener('click', ev => {
    const b = ev.target.closest('button[data-v]'); if (!b) return;
    const key = seg.dataset.key;
    SET[key] = key === 'swapSticks' ? b.dataset.v === '1' : b.dataset.v;
    applySettings(key !== 'effects');
    syncSettingsUI();
  }));
  document.querySelectorAll('.switch[data-key]').forEach(sw => sw.addEventListener('click', () => {
    const key = sw.dataset.key;
    SET[key] = !SET[key];
    applySettings(key !== 'minimap');
    syncSettingsUI();
    if (key === 'vibration') vibrate(40);
  }));
  const vr = $('setVolume');
  vr.addEventListener('input', () => {
    SET.volume = clamp(Math.round(+vr.value || 0), 0, 100);
    if (SET.volume > 0) SET.lastVolume = SET.volume;
    $('setVolumeOut').textContent = SET.volume;
    applySettings(true);
  });
  vr.addEventListener('change', () => { Sound.init(); Sound.resume(); Sound.pickup(); });
  $('btnSettings').addEventListener('click', () => openSub('settings'));
  $('btnGuide').addEventListener('click', () => openSub('guide'));
  $('btnPauseSettings').addEventListener('click', () => openSub('settings'));
  $('btnPauseGuide').addEventListener('click', () => openSub('guide'));
  $('btnSettingsBack').addEventListener('click', closeSub);
  $('btnGuideBack').addEventListener('click', closeSub);
  $('btnReset').addEventListener('click', () => $('resetConfirm').classList.remove('hidden'));
  $('btnResetNo').addEventListener('click', () => $('resetConfirm').classList.add('hidden'));
  $('btnResetYes').addEventListener('click', () => {
    REC = { best: {}, top: { score: 0, wave: 0 }, kills: 0, games: 0 };
    store.set('tankArena.records', REC); store.set('tankArena.best', null);
    $('resetConfirm').classList.add('hidden');
    $('btnReset').textContent = 'Rekorlar silindi';
    setTimeout(() => { $('btnReset').textContent = 'Rekorları sıfırla'; }, 2500);
    updateRecords();
  });
}
function renderGuideLists() {
  $('guidePus').innerHTML = Object.keys(PU).map(k => {
    const P = PU[k], I = ICONS[k];
    const paint = I.stroke ? `fill="none" stroke="${P.col}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"` : `fill="${P.col}"`;
    return `<li><svg viewBox="-16 -16 32 32" aria-hidden="true"><circle r="13.5" fill="#1d2015" stroke="${P.col}" stroke-width="2.5"/><path d="${I.d}" ${paint}/></svg>${P.name}<small>${P.note}</small></li>`;
  }).join('');
  $('guideUps').innerHTML = UP_KEYS.map(k => {
    const u = UPS[k];
    return `<li${u.rare ? ' class="rare"' : ''}><span class="ico"><svg class="ico-svg" viewBox="0 0 24 24" aria-hidden="true">${u.svg}</svg></span>${u.name}<small>${u.brief}</small><small>${u.max > 1 ? u.max + ' seviye' : 'Tek parça'}</small></li>`;
  }).join('');
  $('guideSyn').innerHTML = SYN.map(sy => `<li><b>${sy.name}</b><small>${UPS[sy.a].name} + ${UPS[sy.b].name}</small><span>${sy.desc}</span></li>`).join('');
}
let guideDrawn = false;
function renderGuideSprites() {
  if (guideDrawn) return;
  guideDrawn = true;
  document.querySelectorAll('canvas[data-tank]').forEach(cv => {
    const type = cv.dataset.tank, d = Math.min(window.devicePixelRatio || 1, 2), px = Math.round(64 * d), k = px / 64;
    cv.width = cv.height = px;
    const g = cv.getContext('2d');
    g.setTransform(k, 0, 0, k, px / 2, px / 2 + 3 * k); // one scale for every tank, so the Komutan really looks bigger
    if (type === 'sonhisar') { // the last boss: its own drawing (15f), scaled down to fit
      const mod = oy => ({ ox: -8, oy, hp: 1, maxHp: 1, alive: true, flash: 0 });
      g.scale(0.4, 0.4); drawSonhisar({ x: 0, y: 8, angle: -Math.PI / 2, turret: -Math.PI / 2, treadL: 0, treadR: 0, recoil: 0, glow: 0, flash: 0, scorch: [], lost: {}, sh: { fan: 0.6, core: 0 }, spec: Object.assign({}, SPECS.boss, SH_SPEC), parts: [mod(-36), mod(36)] }, g, 1);
      return;
    }
    drawTank({ id: 0, type, spec: SPECS[type], x: 0, y: 0, angle: -Math.PI / 2, turret: -Math.PI / 2, treadL: 0, treadR: 0, recoil: 0, flash: 0 }, 1, g);
  });
}
function toMenu() {
  G.sandbox = false; G.sbx = null; G.sbxWin = false; G.noEvo = false;
  G.state = 'menu'; G.phase = 'intro'; G.timeScale = 1; G.fade = 0; G.boss = null; G.stage = null; G.tele = []; G.pieces = []; G.hurt = 0;
  for (const x of [el.hud, el.over, el.pause, el.upgrade, $('settings'), $('guide'), $('sbx'), $('sbxEnd')]) x.classList.add('hidden');
  el.menu.classList.remove('hidden');
  hideBanner(); el.hint.classList.remove('show'); hintT = 0;
  G.enemies = []; G.bullets = []; G.pickups = []; G.portals = []; G.texts = []; G.queue = []; parts.length = 0; tm.n = 0; tm.head = 0;
  G.buffs = freshBuffs(); G.buffMax = freshBuffs(); G.strikes = []; G.jet = null; G.airQ = 0; G.up = {}; upChoices = [];
  G.tank = 'std'; G.upMode = 'cards'; G.evoWait = 0; view.zoomK = 1; view.scale = view.base;
  canvas.classList.remove('aim'); releaseInput(); updateRecords();
  el.btnContinue.classList.toggle('hidden', !G.resume);
  if (G.resume) el.btnContinue.textContent = `Kaldığın yerden devam et (dalga ${G.resume.wave})`;
  G.map = makeArena(generate(), pick(THEMES));
  cam.x = G.map.w / 2; cam.y = G.map.h / 2; cam.shake = 0; clampCam(); computeView();
  G.player = makeTank('player', 0, 0);
  placeMenuTank();
  menu.aim = null; menu.shot = false; menu.fired = false; menu.hintA = 1;
}
function placeMenuTank() {
  const m = G.map, p = G.player, f = freeArea(el.menuPanel), w = toWorld(f.x, f.y);
  const c = clamp(Math.floor(w.x / T), 2, m.n - 3), r = clamp(Math.floor(w.y / T), 2, m.n - 3);
  let changed = false;
  for (let y = r - 1; y <= r + 1; y++) for (let x = c - 1; x <= c + 1; x++) {
    const i = y * m.n + x; if (m.t[i] !== EMPTY) { m.t[i] = EMPTY; m.hp[i] = 0; miniTile(m, x, y); changed = true; }
  }
  if (changed) paintRegion(m, c - 2, r - 2, c + 2, r + 2);
  p.x = c * T + T / 2; p.y = r * T + T / 2;
}
function pauseGame() {
  if (G.state !== 'play') return;
  G.state = 'paused'; el.pause.classList.remove('hidden'); $('btnPauseSbx').classList.toggle('hidden', !G.sandbox); el.upgrade.classList.add('hidden'); releaseInput();
  renderUpList('pauseUpsWrap', 'pauseUps'); renderSynList('pauseSynWrap', 'pauseSyn');
}
function resumeGame() {
  if (G.state !== 'paused') return;
  G.state = 'play'; el.pause.classList.add('hidden');
  if (G.phase === 'upgrade' && upChoices.length) { el.upgrade.classList.remove('hidden'); upShownAt = performance.now(); }
  lastT = performance.now(); Sound.resume();
}
function renderSoundBtn(on) { el.btnSound.innerHTML = on ? ICON_ON : ICON_OFF; el.btnSound.setAttribute('aria-label', on ? 'Sesi kapat' : 'Sesi aç'); }
function toggleSound() {
  Sound.init(); Sound.resume();
  if (SET.volume > 0) { SET.lastVolume = SET.volume; SET.volume = 0; } else SET.volume = SET.lastVolume > 0 ? SET.lastVolume : 80;
  applySettings(true);
  syncSettingsUI();
}

const blurAfter = fn => e => { fn(); if (e.currentTarget && e.currentTarget.blur) e.currentTarget.blur(); };
el.btnStart.addEventListener('click', () => startGame(null));
el.btnContinue.addEventListener('click', () => startGame(G.resume));
el.btnAgain.addEventListener('click', () => startGame(null));
el.btnMenu.addEventListener('click', toMenu);
el.btnResume.addEventListener('click', blurAfter(resumeGame));
el.btnRestart.addEventListener('click', () => { if (G.sandbox) sandboxRun(); else startGame(null); });
el.btnQuit.addEventListener('click', toMenu);
el.btnPause.addEventListener('click', blurAfter(() => { if (G.state === 'play') pauseGame(); else resumeGame(); }));
el.btnSound.addEventListener('click', blurAfter(toggleSound));

