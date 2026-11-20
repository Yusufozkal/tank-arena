/* ================= rules, settings, records ================= */
const RULES = { dmg: 1, cool: 1, err: 1, count: 1.25, alive: 0, fastFrom: 4, heavyFrom: 7, hunterFrom: 12, tamirciFrom: 13, maxAlive: 6, maxHunters: 3, dodge: 0.65, score: 1, heal: 25, hpGrow: 0.04 };
const SET_DEFAULTS = { volume: 80, lastVolume: 80, vibration: true, shake: true, aimAssist: true, minimap: true, stickSize: 'm', swapSticks: false, effects: 'high', orientation: 'auto' };
const SET = (() => {
  const saved = store.get('tankArena.settings', null);
  const s = Object.assign({}, SET_DEFAULTS, saved && typeof saved === 'object' ? saved : {});
  if (!saved && store.get('tankArena.sound', true) === false) s.volume = 0; // keep the old mute choice from version 1.0
  delete s.difficulty; // version 1.2 had a difficulty choice
  if (!['s', 'm', 'l'].includes(s.stickSize)) s.stickSize = 'm';
  if (!['high', 'low'].includes(s.effects)) s.effects = 'high';
  if (!['auto', 'portrait', 'landscape'].includes(s.orientation)) s.orientation = 'auto';
  s.volume = clamp(Math.round(+s.volume || 0), 0, 100);
  s.lastVolume = clamp(Math.round(+s.lastVolume || 80), 5, 100);
  for (const k of ['vibration', 'shake', 'aimAssist', 'minimap', 'swapSticks']) s[k] = !!s[k];
  return s;
})();
const saveSettings = () => store.set('tankArena.settings', SET);
function loadRecords() {
  let r = store.get('tankArena.records', null);
  if (!r || typeof r !== 'object') {
    r = { best: {}, kills: 0, games: 0 };
    const old = store.get('tankArena.best', null); // version 1.0 kept a single best score
    if (old && old.score > 0) r.best.normal = { score: old.score | 0, wave: old.wave | 0 };
  }
  if (!r.best || typeof r.best !== 'object') r.best = {};
  // version 1.3 has one record list; old per-difficulty entries (r.best) stay untouched in case the player rolls back to an older APK
  if (!r.top || typeof r.top !== 'object') {
    let sc = 0, wv = 0;
    for (const k in r.best) { const e = r.best[k]; if (e && typeof e === 'object') { sc = Math.max(sc, e.score | 0); wv = Math.max(wv, e.wave | 0); } }
    r.top = { score: sc, wave: wv };
  }
  r.top.score = r.top.score | 0; r.top.wave = r.top.wave | 0;
  r.kills = r.kills | 0; r.games = r.games | 0;
  return r;
}
let REC = loadRecords();

/* ================= sprites ================= */
function glowSprite(c0, c1, c2) {
  const s = 64, cv = document.createElement('canvas'); cv.width = cv.height = s;
  const g = cv.getContext('2d'), gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, c0); gr.addColorStop(0.45, c1); gr.addColorStop(1, c2);
  g.fillStyle = gr; g.fillRect(0, 0, s, s); return cv;
}
const SPR = {
  fire: glowSprite('rgba(255,248,215,1)', 'rgba(255,165,55,.75)', 'rgba(255,80,20,0)'),
  flash: glowSprite('rgba(255,255,240,1)', 'rgba(255,225,150,.5)', 'rgba(255,200,100,0)'),
  smoke: glowSprite('rgba(62,58,52,.62)', 'rgba(62,58,52,.32)', 'rgba(62,58,52,0)'),
  smokeK: glowSprite('rgba(16,14,12,.85)', 'rgba(16,14,12,.5)', 'rgba(16,14,12,0)'),
  blue: glowSprite('rgba(230,248,255,1)', 'rgba(110,195,240,.6)', 'rgba(60,140,220,0)')
};
for (const k in PU) { PU[k].glow = glowSprite(`rgba(${PU[k].rgb},.95)`, `rgba(${PU[k].rgb},.4)`, `rgba(${PU[k].rgb},0)`); SPR['pu_' + k] = PU[k].glow; }
const dustCache = {};
const dustSprite = rgb => dustCache[rgb] || (dustCache[rgb] = glowSprite(`rgba(${rgb},.55)`, `rgba(${rgb},.28)`, `rgba(${rgb},0)`));

/* ================= sound (synthesised, no files) ================= */
const Sound = (() => {
  let ac = null, master = null, noise = null, vol = SET.volume / 100;
  const gates = {};
  function init() {
    if (ac) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      ac = new AC();
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.25;
      master = ac.createGain(); master.gain.value = vol * 0.9;
      master.connect(comp); comp.connect(ac.destination);
      const len = Math.floor(ac.sampleRate * 2.5);
      noise = ac.createBuffer(1, len, ac.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; }
  }
  function resume() { if (ac && ac.state === 'suspended') ac.resume().catch(() => {}); }
  const ok = (key, ms) => {
    if (!ac || vol <= 0 || ac.state !== 'running') return false;
    const now = performance.now(); if (gates[key] && now - gates[key] < ms) return false; gates[key] = now; return true;
  };
  function nz(t, dur, f0, f1, vol, type, q) {
    const src = ac.createBufferSource(); src.buffer = noise;
    const f = ac.createBiquadFilter(); f.type = type || 'lowpass'; f.Q.value = q || 0.7;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(Math.max(0.0002, vol), t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t, Math.random() * 0.8); src.stop(t + dur + 0.05);
  }
  function tn(t, dur, f0, f1, vol, type) {
    const o = ac.createOscillator(); o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  return {
    init, resume,
    setVolume(v) { vol = clamp(v, 0, 1); if (master) master.gain.setTargetAtTime(vol * 0.9, ac.currentTime, 0.03); },
    shoot(player, big, v) { if (!ok(player ? 'sp' : 'se', 45)) return; const t = ac.currentTime, vol = (player ? 0.45 : 0.3) * v; nz(t, big ? 0.24 : 0.14, big ? 1500 : 2800, 200, vol); tn(t, big ? 0.22 : 0.12, big ? 115 : 175, 45, vol * 0.9); },
    boom(pw, v) { if (!ok('bm', 55)) return; const t = ac.currentTime, vol = Math.min(1, 0.55 + pw * 0.25) * v; nz(t, 0.55 + pw * 0.35, 1800, 55, vol); tn(t, 0.4 + pw * 0.25, 92, 26, vol * 0.85); },
    metal(v) { if (!ok('mt', 35)) return; const t = ac.currentTime; tn(t, 0.08, 1900, 1150, 0.11 * v, 'triangle'); nz(t, 0.05, 6000, 2600, 0.1 * v, 'highpass'); },
    brick(v) { if (!ok('br', 35)) return; nz(ac.currentTime, 0.11, 1000, 260, 0.32 * v, 'bandpass', 1.1); },
    crumble(v) { if (!ok('cr', 60)) return; nz(ac.currentTime, 0.35, 700, 90, 0.42 * v, 'lowpass', 0.9); },
    hurt() { if (!ok('hu', 90)) return; const t = ac.currentTime; tn(t, 0.2, 150, 60, 0.2, 'sawtooth'); nz(t, 0.14, 1400, 220, 0.3); },
    shield() { if (!ok('sh', 60)) return; tn(ac.currentTime, 0.12, 900, 1500, 0.1, 'sine'); },
    pickup() { if (!ok('pk', 80)) return; const t = ac.currentTime; tn(t, 0.09, 620, 640, 0.2, 'triangle'); tn(t + 0.08, 0.16, 930, 1250, 0.2, 'triangle'); },
    spawn(v) { if (!ok('sw', 250)) return; tn(ac.currentTime, 0.55, 180, 420, 0.07 * v, 'sine'); },
    wave(boss) { if (!ok('wv', 300)) return; const t = ac.currentTime; (boss ? [196, 196, 147] : [330, 440, 660]).forEach((f, i) => tn(t + i * 0.16, i === 2 ? 0.38 : 0.14, f, f, 0.12, 'square')); },
    cleared() { if (!ok('cl', 300)) return; const t = ac.currentTime; [523, 659, 784, 1047].forEach((f, i) => tn(t + i * 0.09, 0.2, f, f, 0.13, 'triangle')); },
    upgrade() { if (!ok('ug', 200)) return; const t = ac.currentTime; [392, 523, 659, 784].forEach((f, i) => tn(t + i * 0.07, 0.24, f, f * 1.01, 0.13, 'triangle')); },
    evolve() { if (!ok('ev', 400)) return; const t = ac.currentTime; nz(t, 0.5, 400, 3000, 0.16, 'bandpass', 1); [196, 294, 392, 587].forEach((f, i) => tn(t + 0.05 + i * 0.09, 0.3, f, f * 1.02, 0.14, 'sawtooth')); },
    jet() { if (!ok('jt', 500)) return; const t = ac.currentTime; nz(t, 1.3, 300, 2600, 0.24, 'bandpass', 0.9); nz(t + 0.3, 1.1, 2400, 220, 0.18, 'lowpass'); },
    freeze() { if (!ok('fz', 300)) return; const t = ac.currentTime; [1568, 2093, 2637].forEach((f, i) => tn(t + i * 0.05, 0.5, f, f * 0.98, 0.06, 'sine')); nz(t, 0.4, 7000, 3000, 0.08, 'highpass'); },
    zap() { if (!ok('zp', 60)) return; const t = ac.currentTime; tn(t, 0.16, 2400, 380, 0.22, 'sawtooth'); tn(t, 0.1, 5200, 1400, 0.1, 'square'); nz(t, 0.14, 6000, 900, 0.18, 'bandpass', 1.2); tn(t + 0.02, 0.22, 140, 60, 0.3, 'sine'); },
    cloak() { if (!ok('ck', 300)) return; const t = ac.currentTime; tn(t, 0.35, 600, 200, 0.1, 'sine'); nz(t, 0.3, 3000, 600, 0.08, 'bandpass', 1); },
    flame() { if (!ok('fl', 100)) return; const t = ac.currentTime; nz(t, 0.16, 900, 380, 0.2, 'bandpass', 0.7); tn(t, 0.14, 85, 60, 0.1, 'sawtooth'); },
    bounce(v) { if (!ok('bc', 40)) return; tn(ac.currentTime, 0.07, 2600, 1700, 0.09 * v, 'triangle'); },
    pop(v) { if (!ok('pp', 70)) return; const t = ac.currentTime; nz(t, 0.22, 1600, 120, 0.3 * v); tn(t, 0.16, 140, 50, 0.22 * v); },
    over() { if (!ok('ov', 300)) return; const t = ac.currentTime; [392, 330, 262, 196].forEach((f, i) => tn(t + i * 0.18, 0.32, f, f * 0.98, 0.14, 'triangle')); },
    siren() { if (!ok('sr', 800)) return; const t = ac.currentTime; for (let i = 0; i < 4; i++) { tn(t + i * 0.7, 0.7, 420, 760, 0.13, 'sawtooth'); tn(t + i * 0.7 + 0.35, 0.35, 760, 420, 0.1, 'sawtooth'); } },
    wind(v, dur) { // swelling, wavering gust of filtered noise (Sarı Fırtına: intro whirlwind, Rüzgâr)
      if (!ok('wd', 400)) return; dur = dur || 3;
      const t = ac.currentTime, src = ac.createBufferSource(); src.buffer = noise; src.loop = true;
      const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.4;
      f.frequency.setValueAtTime(260, t); f.frequency.linearRampToValueAtTime(900, t + dur * 0.45); f.frequency.linearRampToValueAtTime(320, t + dur);
      const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.9; lg.gain.value = 160; lfo.connect(lg); lg.connect(f.frequency);
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.28 * v, t + dur * 0.4); g.gain.linearRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(master); src.start(t); src.stop(t + dur + 0.1); lfo.start(t); lfo.stop(t + dur + 0.1);
    },
    warnRise(v) { if (!ok('wr', 300)) return; const t = ac.currentTime; tn(t, 1.2, 180, 900, 0.14 * v, 'sawtooth'); tn(t, 1.2, 360, 1500, 0.06 * v, 'square'); },
    nukeWarn() { if (!ok('nw', 600)) return; const t = ac.currentTime; for (let i = 0; i < 6; i++) tn(t + i * 0.2, 0.19, i & 1 ? 560 : 820, i & 1 ? 560 : 820, 0.16, 'square'); },
    nuke() { if (!ok('nk', 500)) return; const t = ac.currentTime; nz(t, 1.8, 2400, 45, 0.95, 'lowpass', 0.8); tn(t, 1.5, 78, 20, 0.75, 'sine'); nz(t + 0.25, 2.1, 700, 40, 0.5, 'lowpass', 0.9); tn(t, 0.5, 1200, 200, 0.12, 'sawtooth'); }
  };
})();

