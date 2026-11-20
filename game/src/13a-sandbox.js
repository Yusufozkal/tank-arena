/* ================= Serbest Mod (sandbox): one setup screen, then a normal run with the chosen tank, cards and target ================= */
// Nothing is saved in this mode: store.set (01) ignores everything but settings while G.sandbox is on; gameOver (13) skips the records.
const SBX = { tank: 'std', ups: {}, boss: '', wave: 8, theme: 0 }; // boss '' = "Dalgalar"; theme = index into THEMES; the setup survives Tekrar and Kurulum
const SBX_PRESETS = [['none', 'Yok'], ['mid', 'Orta'], ['full', 'Tam']];
const SBX_THEME_NAMES = ['Çöl', 'Orman', 'Kar', 'Şehir']; // same order as THEMES
// Yok: no cards. Orta: half of every ordinary card, no rare ones. Tam: every card at its top level.
function sbxPreset(id) {
  const o = {};
  if (id !== 'none') for (const k of UP_KEYS) { const u = UPS[k], L = id === 'full' ? u.max : (u.rare ? 0 : Math.ceil(u.max / 2)); if (L > 0) o[k] = L; }
  return o;
}
SBX.ups = sbxPreset('mid');
const sbxSame = (a, b) => UP_KEYS.every(k => (a[k] | 0) === (b[k] | 0));
const sbxBosses = () => Object.values(BOSS_DEFS).filter(d => d && d.id && d.name); // never hard-coded: a boss shows up when its def exists
// the wave a boss target is run at (decides its strength): its own sandboxWave, else the middle one of its natural boss waves
function sbxBossWave(def) {
  if (def.sandboxWave) return def.sandboxWave;
  const ws = []; for (let w = 5; w <= 40; w += 5) if (bossDefAt(w) === def) ws.push(w);
  return ws.length ? ws[(ws.length - 1) >> 1] : 30;
}
const sbxBossName = d => d.name.split(' ').map(w => w.charAt(0) + w.slice(1).toLocaleLowerCase('tr')).join(' ');
function sbxSprite(cv, id) {
  const d = Math.min(window.devicePixelRatio || 1, 2), px = Math.round(56 * d), k = px / 64;
  cv.width = cv.height = px;
  const g = cv.getContext('2d');
  g.setTransform(k * 0.95, 0, 0, k * 0.95, px / 2, px / 2 + 3 * k);
  drawTank({ id: 0, type: 'player', spec: playerSpec(id, true), x: 0, y: 0, angle: -Math.PI / 2, turret: -Math.PI / 2, treadL: 0, treadR: 0, recoil: 0, flash: 0, heat: 0, overheatT: 0, evoT: 0 }, 1, g);
}
let sbxBuilt = false;
function sbxBuild() {
  if (!sbxBuilt) {
    sbxBuilt = true;
    $('sbxTanks').innerHTML = TANK_IDS.map(id => `<button type="button" class="sbx-tank" data-t="${id}"><canvas aria-hidden="true"></canvas><span>${TANKS[id].name}</span></button>`).join('');
    $('sbxTanks').querySelectorAll('.sbx-tank').forEach(b => sbxSprite(b.querySelector('canvas'), b.dataset.t));
    $('sbxPresets').innerHTML = SBX_PRESETS.map(([id, nm]) => `<button type="button" data-p="${id}">${nm}</button>`).join('');
    $('sbxCards').innerHTML = UP_KEYS.map(k => {
      const u = UPS[k];
      return `<button type="button" class="sbx-card${u.rare ? ' rare' : ''}" data-k="${k}"><svg class="ico-svg" viewBox="0 0 24 24" aria-hidden="true">${u.svg}</svg><span class="nm">${u.name}</span><span class="pips">${Array.from({ length: u.max }, () => '<i></i>').join('')}</span></button>`;
    }).join('');
    $('sbxMaps').innerHTML = SBX_THEME_NAMES.map((nm, i) => `<button type="button" data-m="${i}">${nm}</button>`).join('');
  }
  const bs = sbxBosses();
  if (SBX.boss && !bs.some(d => d.id === SBX.boss)) SBX.boss = '';
  $('sbxTargets').innerHTML = [['', 'Dalgalar']].concat(bs.map(d => [d.id, sbxBossName(d)])).map(([id, nm]) => `<button type="button" data-b="${id}">${nm}</button>`).join('');
  sbxSync();
}
function sbxSync() {
  document.querySelectorAll('#sbxTanks .sbx-tank').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.t === SBX.tank)));
  const cur = SBX_PRESETS.find(([id]) => sbxSame(SBX.ups, sbxPreset(id)));
  document.querySelectorAll('#sbxPresets button').forEach(b => b.setAttribute('aria-pressed', String(!!cur && b.dataset.p === cur[0])));
  document.querySelectorAll('#sbxCards .sbx-card').forEach(b => {
    const k = b.dataset.k, L = SBX.ups[k] | 0;
    b.classList.toggle('on', L > 0);
    b.querySelectorAll('.pips i').forEach((p, i) => p.classList.toggle('on', i < L));
    b.setAttribute('aria-label', `${UPS[k].name}, seviye ${L}/${UPS[k].max}`);
  });
  document.querySelectorAll('#sbxTargets button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.b === SBX.boss)));
  document.querySelectorAll('#sbxMaps button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.m === SBX.theme)));
  const boss = !!SBX.boss, bd = boss ? BOSS_DEFS[SBX.boss] : null;
  $('sbxWaveRow').classList.toggle('hidden', boss);
  $('sbxMaps').classList.toggle('hidden', boss);
  $('sbxNote').classList.toggle('hidden', !boss);
  if (bd) $('sbxNote').textContent = `Kendi arenasında, dalga ${sbxBossWave(bd)} gücünde.`;
  $('sbxWaveN').textContent = SBX.wave;
}
function openSandbox() { // from the main menu, the pause menu or the end screen
  if (G.state !== 'menu') toMenu();
  sbxBuild(); openSub('sbx');
}
function sandboxRun() {
  const bd = SBX.boss ? BOSS_DEFS[SBX.boss] : null;
  startGame(null, { tank: SBX.tank, ups: Object.assign({}, SBX.ups), boss: bd ? bd.id : '', wave: bd ? sbxBossWave(bd) : SBX.wave, theme: SBX.theme });
}
function sandboxEnd(win) {
  G.state = 'over'; G.timeScale = 1; G.fade = 0;
  el.hud.classList.add('hidden'); el.upgrade.classList.add('hidden'); hideBanner(); el.hint.classList.remove('show');
  $('sbxEndTitle').textContent = win ? 'BOSS YENİLDİ' : 'TANKIN İMHA EDİLDİ';
  const bd = G.sbx && G.sbx.boss ? BOSS_DEFS[G.sbx.boss] : null;
  $('sbxEndSub').textContent = bd ? sbxBossName(bd) + ' · ' + TANKS[G.tank].name : `Dalga ${G.wave} · ${G.kills} tank imha · ${TANKS[G.tank].name}`;
  $('sbxEnd').classList.remove('hidden');
  G.overFree = freeArea($('sbxEndPanel'));
  canvas.classList.remove('aim');
  if (win) Sound.cleared(); else Sound.over();
}
function sbxStepper(btn, d) { // tap = one step, hold = repeat
  let t = null, iv = null;
  const step = () => { SBX.wave = clamp(SBX.wave + d, 1, 40); sbxSync(); };
  const stop = () => { clearTimeout(t); clearInterval(iv); t = iv = null; };
  btn.addEventListener('pointerdown', e => { if (e.button) return; step(); stop(); t = setTimeout(() => { iv = setInterval(step, 90); }, 420); });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) btn.addEventListener(ev, stop);
  btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); step(); } });
}
$('btnSandbox').addEventListener('click', openSandbox);
$('btnSbxBack').addEventListener('click', closeSub);
$('btnSbxGo').addEventListener('click', sandboxRun);
$('btnSbxAgain').addEventListener('click', sandboxRun);
$('btnSbxSetup').addEventListener('click', openSandbox);
$('btnPauseSbx').addEventListener('click', openSandbox);
sbxStepper($('sbxMinus'), -1); sbxStepper($('sbxPlus'), 1);
$('sbxPanel').addEventListener('click', ev => {
  const t = ev.target.closest('button'); if (!t) return;
  if (t.dataset.t) SBX.tank = t.dataset.t;
  else if (t.dataset.p) SBX.ups = sbxPreset(t.dataset.p);
  else if (t.dataset.k) { const k = t.dataset.k, L = (SBX.ups[k] | 0) + 1; if (L > UPS[k].max) delete SBX.ups[k]; else SBX.ups[k] = L; }
  else if (t.dataset.b !== undefined) SBX.boss = t.dataset.b;
  else if (t.dataset.m !== undefined) SBX.theme = +t.dataset.m;
  else return;
  sbxSync();
});
