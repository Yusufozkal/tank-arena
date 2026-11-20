
(() => {
'use strict';

const DEBUG = /[?&#]debug/.test(location.href);
const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

/* ================= helpers ================= */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU; return d; };
const turnTo = (a, t, s) => { const d = angDiff(a, t); return Math.abs(d) <= s ? t : a + (d > 0 ? s : -s); };
const dist2 = (ax, ay, bx, by) => { const x = ax - bx, y = ay - by; return x * x + y * y; };
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
function mulberry32(a) { return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const seedOf = (c, r, s) => (Math.imul(c + 7, 73856093) ^ Math.imul(r + 13, 19349663) ^ Math.imul(s + 1, 83492791)) >>> 0;
const fmt = n => Math.round(n).toLocaleString('tr-TR');
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
};
const vibrate = p => { if (!SET.vibration) return; try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* ignore */ } };
function rrectPath(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function rrect(g, x, y, w, h, r) { g.beginPath(); rrectPath(g, x, y, w, h, r); }

/* ================= constants ================= */
const T = 48, MAP_N = 35, HALF = (MAP_N - 1) / 2;
const EMPTY = 0, BRICK = 1, STEEL = 2, WATER = 3, BUSH = 4, BRICK_HP = 3;
const isWall = v => v === BRICK || v === STEEL;
const blocksTank = v => v === BRICK || v === STEEL || v === WATER;
const UI_FONT = '"Barlow Condensed","Avenir Next Condensed","Roboto Condensed","Arial Narrow",sans-serif';
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const THEMES = [
  { key: 'desert', name: 'Çöl bölgesi', bg: '#2b2418',
    ground: '#d1b78a', ground2: '#c8ac7d', detail: '#ad9168', detail2: '#e2cfa7',
    brick: '#b6623b', brickHi: '#d88a5f', brickDk: '#7c3e22', mortar: '#8b4b2c',
    steel: '#9a968b', steelHi: '#c6c1b4', steelDk: '#615e56',
    water: '#3f8e96', waterDk: '#2e6f76', waterHi: '#a8e2dc', shore: '#efe2c0',
    bush: '#7c8b3c', bushDk: '#58662b', bushHi: '#a7b85a',
    shadow: 'rgba(72,46,16,.30)', tread: '84,60,32', scorch: '42,28,14', dust: '186,160,118' },
  { key: 'forest', name: 'Orman bölgesi', bg: '#1a2313',
    ground: '#6d8b4a', ground2: '#668344', detail: '#557139', detail2: '#8aa860',
    brick: '#a9583a', brickHi: '#c97a55', brickDk: '#6c331f', mortar: '#7b3f27',
    steel: '#8b908c', steelHi: '#b6bbb6', steelDk: '#585e5a',
    water: '#2f6e98', waterDk: '#245679', waterHi: '#9bcde9', shore: '#90ab6b',
    bush: '#2f6b36', bushDk: '#1f4c26', bushHi: '#56985a',
    shadow: 'rgba(16,32,10,.34)', tread: '40,50,24', scorch: '24,28,14', dust: '120,110,80' },
  { key: 'snow', name: 'Kar bölgesi', bg: '#1d252c',
    ground: '#e1e8ed', ground2: '#d7e0e7', detail: '#c2ced8', detail2: '#f7fbfd',
    brick: '#9c5a49', brickHi: '#bd7d6b', brickDk: '#653a2f', mortar: '#7a4537',
    steel: '#6e7985', steelHi: '#9ba7b3', steelDk: '#46505a',
    water: '#3a6c92', waterDk: '#2b5375', waterHi: '#bcd9ee', shore: '#ffffff',
    bush: '#3d6b57', bushDk: '#294f3f', bushHi: '#f2f7f9',
    shadow: 'rgba(40,60,92,.26)', tread: '118,134,150', scorch: '46,52,60', dust: '232,238,244' },
  { key: 'city', name: 'Şehir bölgesi', bg: '#141517',
    ground: '#57595d', ground2: '#505256', detail: '#46484c', detail2: '#6c6f73',
    brick: '#b4693e', brickHi: '#d58b5c', brickDk: '#794123', mortar: '#894e2c',
    steel: '#a3a7ab', steelHi: '#cdd0d3', steelDk: '#6b6f74',
    water: '#2d5f7d', waterDk: '#214a62', waterHi: '#95c2dc', shore: '#8d9094',
    bush: '#406f3c', bushDk: '#2b502a', bushHi: '#66985e',
    shadow: 'rgba(0,0,0,.34)', tread: '20,20,22', scorch: '12,12,12', dust: '150,150,150' }
];

const SPECS = {
  player: { hp: 100, speed: 165, turn: 8.5, tTurn: 15, r: 17, mass: 1, len: 40, wid: 34, tread: 8, tR: 10, barrel: 26, bW: 6, cool: 0.3, bSpeed: 660, dmg: 1, bR: 4,
    col: { body: '#3d86ad', dk: '#235b7b', hi: '#7cc0e2', acc: '#f2c14e' } },
  basic: { hp: 2, speed: 80, turn: 3.2, tTurn: 2.8, r: 17, mass: 1, len: 40, wid: 34, tread: 8, tR: 10, barrel: 25, bW: 6, cool: 1.8, bSpeed: 380, dmg: 12, bR: 4, score: 100, hold: 4, drop: 0.16,
    col: { body: '#b4472d', dk: '#7a2c1b', hi: '#dc7758', acc: '#2a2622' } },
  fast: { hp: 1, speed: 138, turn: 5.2, tTurn: 4, r: 15, mass: 0.7, len: 34, wid: 28, tread: 6.5, tR: 8, barrel: 21, bW: 5, cool: 1.35, bSpeed: 440, dmg: 9, bR: 3.5, score: 150, hold: 1.6, drop: 0.14,
    col: { body: '#cf9f30', dk: '#8c691b', hi: '#efca60', acc: '#2a2622' } },
  heavy: { hp: 5, speed: 55, turn: 2.2, tTurn: 2.1, r: 20, mass: 2, len: 46, wid: 40, tread: 10, tR: 12.5, barrel: 28, bW: 6.5, cool: 2.4, bSpeed: 330, dmg: 22, bR: 6, score: 250, hold: 5.5, drop: 0.32, twin: true,
    col: { body: '#60656c', dk: '#3b3f44', hi: '#8c929a', acc: '#c9402d' } },
  boss: { hp: 34, speed: 45, turn: 1.7, tTurn: 1.8, r: 38, mass: 4, len: 90, wid: 70, tread: 14, tR: 24, barrel: 58, bW: 9, cool: 1.6, bSpeed: 400, dmg: 9, bR: 5.5, score: 1500, hold: 5, drop: 1, triple: true,
    col: { body: '#7d2431', dk: '#4b131d', hi: '#ad4356', acc: '#f2c14e' } },
  // Avcı: the smart tank. Dodges shells, fires from cover, sneaks around open ground
  hunter: { hp: 3, speed: 106, turn: 4.6, tTurn: 4.4, r: 16, mass: 1, len: 38, wid: 32, tread: 7.5, tR: 9.5, barrel: 27, bW: 5.5, cool: 1.25, bSpeed: 480, dmg: 14, bR: 4, score: 300, hold: 4.5, drop: 0.3, smart: true,
    col: { body: '#6c4fa3', dk: '#432f6b', hi: '#9d84d1', acc: '#7ef0d0' } },
  // Tamirci (Orman): no weapon; a crane arm repairs the wounded allies near it (11-enemies updateTamirci)
  tamirci: { hp: 3, speed: 95, turn: 3.6, tTurn: 4.5, r: 16, mass: 1, len: 36, wid: 30, tread: 7, tR: 9.5, barrel: 24, bW: 5, cool: 99, bSpeed: 0, dmg: 0, bR: 0, score: 200, hold: 0, drop: 0.3, medic: true,
    col: { body: '#6f8a3a', dk: '#46591f', hi: '#9fbf5a', acc: '#f2c14e' } }
};

// Komutan HP per boss wave, tuned with tests/boss_probe.py so that a medium card set (and the bot) takes about 3-4 minutes from wave 15 on; the wave-5 Komutan is the easy one
const BOSS_HP_AT = [[5, 185], [15, 960], [25, 1130], [35, 1350]];
const bossHp = w => {
  const P = BOSS_HP_AT, last = P[P.length - 1];
  if (w <= P[0][0]) return P[0][1];
  if (w >= last[0]) return Math.round(last[1] + (w - last[0]) * 25);
  for (let i = 1; i < P.length; i++) if (w <= P[i][0]) return Math.round(P[i - 1][1] + (P[i][1] - P[i - 1][1]) * (w - P[i - 1][0]) / (P[i][0] - P[i - 1][0]));
};

const PU = {
  repair: { col: '#6fd46b', rgb: '111,212,107', name: 'Tamir', dur: 0, w: 3, from: 1, note: '+35 zırh (Uzun etkiyle daha fazla)' },
  shield: { col: '#5fb4dd', rgb: '95,180,221', name: 'Kalkan', dur: 7, w: 2, from: 1, note: '7 sn hasarsız' },
  triple: { col: '#f2913f', rgb: '242,145,63', name: 'Üçlü atış', dur: 10, w: 2, from: 1, note: '10 sn' },
  rapid: { col: '#f2c14e', rgb: '242,193,78', name: 'Seri atış', dur: 10, w: 2, from: 1, note: '10 sn, iki kat atış' },
  speed: { col: '#3fe0c5', rgb: '63,224,197', name: 'Turbo', dur: 8, w: 1.6, from: 2, note: '8 sn, %45 hız' },
  pierce: { col: '#ff6fae', rgb: '255,111,174', name: 'Delici mermi', dur: 10, w: 1.5, from: 2, note: '10 sn, tuğla ve tank deler' },
  freeze: { col: '#a8e4ff', rgb: '168,228,255', name: 'Dondurucu', dur: 4, w: 1.1, from: 3, note: '4 sn, düşmanlar donar' },
  stealth: { col: '#c9ccbd', rgb: '201,204,189', name: 'Kamuflaj', dur: 7, w: 1.1, from: 3, note: '7 sn, seni göremezler' },
  air: { col: '#ff5a4a', rgb: '255,90,74', name: 'Hava saldırısı', dur: 0, w: 0.7, from: 4, note: 'En yakın 8 düşmana bomba' }
};
const ICONS = {
  repair: { d: 'M-2.3-7.5h4.6v5.2h5.2v4.6h-5.2v5.2h-4.6V2.3h-5.2v-4.6h5.2z' },
  shield: { d: 'M0-8.5L7-5.6 6.2 1.5Q4.6 6.6 0 8.8-4.6 6.6-6.2 1.5L-7-5.6z' },
  triple: { d: 'M0 7L-6.5-6M0 7V-8M0 7L6.5-6', stroke: true },
  rapid: { d: 'M2.2-9.5L-5.5 1.2h4.6L-2.4 9.5 5.5-1.4H.9z' },
  speed: { d: 'M-7-6L-1 0-7 6M1-6L7 0 1 6', stroke: true },
  pierce: { d: 'M-8 0H7M3-4L7 0 3 4M-3-8V-3M-3 3V8', stroke: true },
  freeze: { d: 'M0-8V8M-6.9-4L6.9 4M-6.9 4L6.9-4M-2.2-6.3L0-4.2 2.2-6.3M-2.2 6.3L0 4.2 2.2 6.3', stroke: true },
  stealth: { d: 'M-8.5 0Q0-8.5 8.5 0Q0 8.5-8.5 0ZM-6.5 6.5L6.5-6.5', stroke: true },
  air: { d: 'M0-9.5c.9 0 1.4.9 1.4 2.1V-3l7.1 4.1v2L1.4.7v4.1l2.4 1.9v1.6L0 7.3l-3.8 1V6.7l2.4-1.9V.7l-7.1 2.4v-2L-1.4-3v-4.4c0-1.2.5-2.1 1.4-2.1z' }
};
const puGlyph = k => { const I = ICONS[k], c = PU[k].col; return `<svg viewBox="-10 -10 20 20" aria-hidden="true"><path d="${I.d}" ${I.stroke ? `fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"` : `fill="${c}"`}/></svg>`; };
const ICON_PATHS = {};
for (const k in ICONS) ICON_PATHS[k] = new Path2D(ICONS[k].d);
const BUFFS = Object.keys(PU).filter(k => PU[k].dur > 0);
const freshBuffs = () => { const o = {}; for (const k of BUFFS) o[k] = 0; return o; };
const JET_PATH = new Path2D('M40 0L30-5H8L-6-38h-9L-5-5h-20l-8-13h-7l4 18-4 18h7l8-13h20L-15 38h9L8 5h22z');
const dec = v => String(Math.round(v * 10) / 10).replace('.', ',');
const dec2 = v => (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');
const tot = (L, txt) => (L > 1 ? ` (toplam ${txt})` : '');
const DOT = (x, y) => `<circle cx="${x}" cy="${y}" r="1.15" fill="currentColor" stroke="none"/>`;
// Workshop upgrades: one card is picked after every wave; desc(L) describes the level the card would give
// Firepower cards add up (not multiply): F = 1 + 0.25 caliber + 0.18 loader + 0.15 thermal, at most 3.05 (the twin card became the Ikiz tank in 1.4)
// F scales the tank's own base weapon; a shell never hits for less than the tank's base damage
const firepower = (up = G.up) => 1 + 0.25 * (up.caliber | 0) + 0.18 * (up.loader | 0) + 0.15 * (up.thermal ? 1 : 0);
const fpLine = (k, L) => `Ateş gücü ×${dec2(firepower(Object.assign({}, G.up, { [k]: L - 1 })))} → ×${dec2(firepower(Object.assign({}, G.up, { [k]: L })))}`;
const UPS = {
  armor: { name: 'Zırh plakası', max: 5, brief: '+20 azami zırh',
    svg: '<rect x="3" y="5" width="18" height="14" rx="1.5"/>' + DOT(7, 9) + DOT(17, 9) + DOT(7, 15) + DOT(17, 15),
    desc: L => `Azami zırh ${80 + 20 * L} → ${100 + 20 * L}, üstüne 20 zırh onarır` },
  engine: { name: 'Turbo motor', max: 4, brief: '+%10 hız',
    svg: '<path d="M4 5l7 7-7 7M13 5l7 7-7 7"/>',
    desc: L => `Sürüş hızı +%10${tot(L, '+%' + 10 * L)}` },
  loader: { name: 'Otomatik yükleyici', max: 5, brief: '+%18 ateş gücü, sık atış',
    svg: '<path d="M4 20v-9a2 2 0 0 1 4 0v9zM10 20v-9a2 2 0 0 1 4 0v9zM16 20v-9a2 2 0 0 1 4 0v9zM4 16h4M10 16h4M16 16h4"/>',
    desc: L => `Atış hızı +%18${tot(L, '+%' + 18 * L)}. ${fpLine('loader', L)}` },
  caliber: { name: 'Büyük kalibre', max: 4, brief: '+%25 ateş gücü, büyük mermi',
    svg: '<path d="M7 21V10a5 5 0 0 1 10 0v11zM7 16h10"/>',
    desc: L => `Büyük mermi${L === 2 ? ', tuğlaya çift hasar' : ''}. ${fpLine('caliber', L)}` },
  barrel: { name: 'Uzun namlu', max: 3, brief: 'Hızlı mermi, uzun menzil',
    svg: '<path d="M2 9h15M17 6.5h4v5h-4zM3 17h18M6 14.5L3 17l3 2.5M18 14.5l3 2.5-3 2.5"/>',
    desc: L => `Mermi hızı ve menzili +%15${tot(L, '+%' + 15 * L)}` },
  repair: { name: 'Onarım robotu', max: 3, brief: 'Zırhı kendisi onarır',
    svg: '<rect x="5" y="8" width="14" height="11" rx="2"/><path d="M12 8V5M9 19v2.5M15 19v2.5"/><circle cx="12" cy="4" r="1.3"/>' + DOT(9.5, 13) + DOT(14.5, 13),
    desc: L => `2 sn hasar almazsan saniyede ${dec(0.5 * L)} zırh onarır` },
  ricochet: { name: 'Sekme', max: 2, rare: true, brief: 'Çelikten seker',
    svg: '<path d="M21 3v18M3 18l16.5-6L3 6M5.6 9.1L3 6l3.9-.7"/>',
    desc: L => L === 1 ? 'Mermilerin çelik duvardan bir kez seker' : 'Mermilerin çelikten iki kez seker' },
  blast: { name: 'Patlayıcı mermi', max: 2, rare: true, brief: 'Alan hasarı',
    svg: '<path d="M12 2L14 7.5 19 5 16.5 10 22 12 16.5 14 19 19 14 16.5 12 22 10 16.5 5 19 7.5 14 2 12 7.5 10 5 5 10 7.5Z"/>',
    desc: L => L === 1 ? 'Mermi isabette patlar, yakındaki tanklara %50 hasar verir' : 'Patlama büyür, yakındaki tanklara %75 hasar' },
  magnet: { name: 'Mıknatıs', max: 2, brief: 'Güçlendirmeleri çeker, daha sık düşer',
    svg: '<path d="M4 3h5v9a3 3 0 0 0 6 0V3h5v9a8 8 0 0 1-16 0zM4 7h5M15 7h5"/>',
    desc: L => `Güçlendirmeleri ${2 + 2 * L} kare öteden çeker, düşme şansı +%${25 * L}` },
  thermal: { name: 'Termal kamera', max: 1, rare: true, brief: 'Çalıdakileri görür, +%15 ateş gücü',
    svg: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    desc: L => `Çalıdaki düşmanları görür, nişan onları da seçer. ${fpLine('thermal', L)}` },
  boost: { name: 'Uzun etki', max: 3, brief: 'Güçlendirmeler uzar, Tamir artar',
    svg: '<path d="M6 3h12M6 21h12M7.5 3c0 4.5 3.5 6 3.5 9s-3.5 4.5-3.5 9M16.5 3c0 4.5-3.5 6-3.5 9s3.5 4.5 3.5 9"/>',
    desc: L => `Güçlendirme süresi +%25${tot(L, '+%' + 25 * L)}, Tamir ${35 + 10 * L} zırh` },
  // extra cards: never levelled, only offered when they matter or the pool runs dry
  fix: { name: 'Acil onarım', max: 99, extra: true,
    svg: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v9M7.5 12h9"/>',
    desc: () => `Zırh ${Math.ceil(G.player.hp)} → ${G.player.maxHp}, hemen dolar` },
  bounty: { name: 'Ganimet', max: 99, extra: true,
    svg: '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z"/>',
    desc: () => `+${fmt(bountyPts())} puan` },
  prep: { name: 'Hazırlık', max: 99, extra: true,
    svg: '<path d="M12 3l7 3v5c0 5-3.2 8.3-7 10-3.8-1.7-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
    desc: () => `Sonraki dalgaya ${dec(10 * (1 + 0.25 * upL('boost')))} sn kalkan ve seri atışla başlarsın` }
};
const UP_KEYS = Object.keys(UPS).filter(k => !UPS[k].extra);
const LEGACY_UPS = ['twin']; // cards removed in 1.4; an old save with one of them is converted (twin -> the Ikiz tank)

/* ===== TANKS (data) ===== */
// Owner: package A (tank framework). D1/D2 only append entries.
// Tank tree (1.4): Standart -> wave 5 -> Ikiz / Nisanci / Makineli -> wave 10 -> two children each. Ids are ASCII.
// Weapon base per tank; the workshop cards scale it in playerSpec(). dps = dmg * shells / cool (derived, see playerSpec).
//   hpMul/speedMul/turnMul  multipliers on SPECS.player        dmg/cool/bSpeed/bR/bW/life/barrel  the weapon (life = shell flight time, s)
//   muzzles [{off, ang, rear?, dmgK?, pierceN?}]  barrel layout, shared by fireTank and drawTank (off = sideways px, ang = radians from the turret)
//   spread/pellets  random angle / shells per muzzle     zoom  camera factor (1 = normal)      mode  'shell' | 'lob' | 'flame'
//   tr  trait numbers (read by TT)     shape  barrel look (drawTank)     col  palette     botRange  autopilot preferred distance (px), undefined = Standart behaviour
//   stub  tier-2 entry that still clones its parent's weapon and look (D2's rayli / obus until they land)
const TANKS = {
  std: { name: 'Standart', tier: 0, parent: null, kids: ['ikiz', 'nisanci', 'makineli'], traitName: 'Dengeli', blurb: 'Dengeli başlangıç tankı.',
    hpMul: 1, speedMul: 1, turnMul: 1, dmg: 1, cool: 0.3, bSpeed: 660, bR: 4, bW: 6, life: 1.02, barrel: 26, shape: 'std', zoom: 1, mode: 'shell',
    muzzles: [{ off: 0, ang: 0 }], col: { body: '#3d86ad', dk: '#235b7b', hi: '#7cc0e2', acc: '#f2c14e' } },
  ikiz: { name: 'İkiz', tier: 1, parent: 'std', kids: ['uclu', 'cift'], traitName: 'Çift darbe', blurb: 'İki mermi aynı tanka birlikte isabet ederse tank 0,3 sn sersemler.',
    hpMul: 1, speedMul: 1, turnMul: 1, dmg: 0.42, cool: 0.3, bSpeed: 660, bR: 3.6, bW: 4.4, life: 1.02, barrel: 26, shape: 'twin', zoom: 1, mode: 'shell',
    muzzles: [{ off: -5, ang: 0 }, { off: 5, ang: 0 }], tr: { stun: 0.3, stunCd: 1.5, win: 0.12 }, botRange: 330,
    col: { body: '#2f9e8f', dk: '#1a6258', hi: '#7fd6c8', acc: '#ffe27a' } },
  nisanci: { name: 'Keskin Nişancı', tier: 1, parent: 'std', kids: ['rayli', 'obus'], traitName: 'Uzak görüş', blurb: 'Kamera geri çekilir, geniş alan görünür; mermisi hızlı ve güçlü, tankı yavaş.',
    hpMul: 1, speedMul: 0.9, turnMul: 0.9, dmg: 1.9, cool: 0.43, bSpeed: 900, bR: 4.5, bW: 5, life: 1.01, barrel: 34, shape: 'long', zoom: 0.82, mode: 'shell',
    muzzles: [{ off: 0, ang: 0 }], botRange: 250,
    col: { body: '#4a5bb0', dk: '#2b3670', hi: '#8f9de4', acc: '#ff9f43' } },
  makineli: { name: 'Makineli', tier: 1, parent: 'std', kids: ['alev', 'sarapnel'], traitName: 'Isınma', blurb: 'Sürekli ateşte atış hızı artar; çok ısınırsa namlu kızarır ve 1,5 sn soğur.',
    hpMul: 1, speedMul: 1, turnMul: 1, dmg: 0.95, cool: 0.16, bSpeed: 640, bR: 3.4, bW: 6.5, life: 0.9, barrel: 24, shape: 'mg', zoom: 1, mode: 'shell', spread: 0.04,
    muzzles: [{ off: 0, ang: 0 }], tr: { heatUp: 0.04, heatDown: 0.5, cd: 1.5, rateGain: 0.8 }, botRange: 260,
    col: { body: '#6bb23a', dk: '#3e6e1f', hi: '#a9de7a', acc: '#ff5a36' } }
};
// Tier-2 stubs for D1 / D2: right name, tier, parent, blurb, trait name and palette; weapon, muzzles and look are the parent's until D1 / D2 replace the call
function stubTank(id, parent, o) { TANKS[id] = Object.assign(JSON.parse(JSON.stringify(TANKS[parent])), { kids: [], stub: true }, o); }
TANKS.uclu = { name: 'Üçlü', tier: 2, parent: 'ikiz', kids: [], traitName: 'Delici orta mermi', blurb: 'Üç mermilik yelpaze; ortadaki mermi bir tankı delip arkasındakine gider.',
  hpMul: 1, speedMul: 1, turnMul: 1, dmg: 0.27, cool: 0.3, bSpeed: 660, bR: 3.6, bW: 4.6, life: 1.02, barrel: 26, shape: 'tri', zoom: 1, mode: 'shell',
  muzzles: [{ off: 0, ang: -0.2, len: 23 }, { off: 0, ang: 0, len: 30, pierceN: 1 }, { off: 0, ang: 0.2, len: 23 }], botRange: 340, // D1: dps 1.2 x Standart (3 shells of 0.4 per 0.3 s)
  col: { body: '#1f7f93', dk: '#124a58', hi: '#6cc6d9', acc: '#ff8fd0' } };
TANKS.cift = { name: 'Çift Yön', tier: 2, parent: 'ikiz', kids: [], traitName: 'İtici arka namlu', blurb: 'Arkaya da ateş eder (arka mermi %80 hasar); her atışta tank ileri hızlanır, geri tepme yok.',
  hpMul: 1, speedMul: 1, turnMul: 1, dmg: 0.67, cool: 0.3, bSpeed: 660, bR: 3.8, bW: 5, life: 1.02, barrel: 26, shape: 'duo', zoom: 1, mode: 'shell', kick: 0,
  muzzles: [{ off: 0, ang: 0 }, { off: 0, ang: Math.PI, rear: true, dmgK: 0.8, len: 21 }], tr: { push: 0.6, pushK: 0.3, impulse: 70 }, botRange: 300, // D1: dps 1.1 x Standart (1.8 shells of 0.61 per 0.3 s)
  col: { body: '#35b07a', dk: '#1d6c48', hi: '#86e0b4', acc: '#fff0a0' } };
// D2 (Keskin Nisanci branch): full entries, same table as above. dps vs Standart (3.33): rayli 4.5 / 1.08 = 4.17 (x1.25), obus 4 / 1.09 = 3.67 (x1.1, per target in the blast)
TANKS.rayli = { name: 'Raylı Top', tier: 2, parent: 'nisanci', kids: [], traitName: 'Lazer çizgisi',
  blurb: 'Lazer çizgisi merminin yolunu gösterir; hızlı mermi tuğlayı ve tankı deler, çeliği delemez (Sekme varsa seker).',
  hpMul: 0.95, speedMul: 0.9, turnMul: 0.9, dmg: 2.6, cool: 0.85, bSpeed: 1100, bR: 3.8, bW: 4.2, life: 0.83, barrel: 42, shape: 'rail', zoom: 0.82, mode: 'shell',
  muzzles: [{ off: 0, ang: 0 }], tr: { pierce: true, zap: true }, botRange: 300,
  col: { body: '#3578d8', dk: '#1b4687', hi: '#86b4f4', acc: '#7ef0ff' } };
TANKS.obus = { name: 'Obüs', tier: 2, parent: 'nisanci', kids: [], traitName: 'Mesafe ayarı',
  blurb: 'Nişan çubuğu ne kadar itilirse mermi o kadar uzağa, duvarın üstünden düşer ve alanda patlar.',
  hpMul: 1, speedMul: 0.8, turnMul: 0.9, dmg: 3.5, cool: 0.8, bSpeed: 380, bR: 5.2, bW: 9.5, life: 3, barrel: 24, shape: 'obus', zoom: 0.8, mode: 'lob', range: 12 * T, kick: 1,
  muzzles: [{ off: 0, ang: 0 }], tr: { area: 70, edge: 0.5, blastK: 0.25, vFly: 380, tMin: 0.35, minD: 2.5, maxD: 12, hgt: 34 }, botRange: 300,
  col: { body: '#6f7f35', dk: '#414c1c', hi: '#a9ba6a', acc: '#ffd24a' } };
TANKS.alev = { name: 'Alev Topu', tier: 2, parent: 'makineli', kids: [], traitName: 'Alev perdesi', blurb: 'Kısa menzilli sürekli alev (2,6 kare); düşman mermilerini yakar, vurduğu tank 3 sn yanar. Komutan yarı hızda yanar.',
  hpMul: 1, speedMul: 1, turnMul: 1, dmg: 0.87, cool: 0.2, bSpeed: 600, bR: 4, bW: 7, life: 0.2, range: 125, barrel: 22, shape: 'flame', zoom: 1, mode: 'flame',
  muzzles: [{ off: 0, ang: 0 }], tr: { range: 125, half: 0.3, direct: 0.65, burnK: 0.35, burn: 3, bossK: 0.5 }, botRange: 140, // D1: dps 1.3 x Standart at range (65% direct, 35% burn)
  col: { body: '#e0801f', dk: '#8a4a0c', hi: '#f5b868', acc: '#fff2a0' } };
TANKS.sarapnel = { name: 'Şarapnel', tier: 2, parent: 'makineli', kids: [], traitName: 'Geri itme', blurb: 'Yedi saçma atar; yakından (2 kare) vurduğu tankları geri iter, ağırları pek oynatamaz.',
  hpMul: 1, speedMul: 1, turnMul: 1, dmg: 0.36, cool: 0.5, bSpeed: 620, bR: 2.7, bW: 6.5, life: 0.42, barrel: 22, shape: 'bell', zoom: 1, mode: 'shell', spread: 0.32, pellets: 7,
  muzzles: [{ off: 0, ang: 0 }], tr: { kb: 60, kbRange: 105, kbMax: 420 }, botRange: 150, // D1: dps 1.5 x Standart with all 7 pellets, about 0.4 far away
  col: { body: '#3f8c3a', dk: '#235a20', hi: '#82c47c', acc: '#e8e0b0' } };
for (const id in TANKS) TANKS[id].id = id;
const TANK_IDS = Object.keys(TANKS);
const tankShells = tk => tk.muzzles.reduce((a, m) => a + (m.dmgK || 1), 0) * (tk.pellets || 1);
const tankRange = tk => tk.range || tk.bSpeed * tk.life;
const needTier = w => (w >= 10 ? 2 : w >= 5 ? 1 : 0); // the tank tier the player should have reached at wave w (debt rule)
/* ===== TANKS end ===== */

const ICON_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6"/><path d="M18.3 6.3a8 8 0 0 1 0 11.4"/></svg>';
const ICON_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';

/* ===== SYNERGY ===== */
// Owner: package B (synergies). Two cards together unlock one extra effect. All numbers are here (the balance package tunes them).
// Hooks called from shared code: synFlags (fireTank), synDmg (damageEnemy), synTaken (damagePlayer), synRegen / synRegenGlow (regen), synPickup (applyPickup),
// synTrack (updatePlay, player movement bookkeeping), splashFor (blastAt), synBadgeHTML (cardHTML), synUnlocked (chooseUpgrade).
const SYN_K = {
  bbR: 1.6,        // Seken patlama: blast radius factor for the first hit of a shell that has ricocheted
  movNeed: 3,      // Hareketli onarım: seconds of driving (mvT) before the bonus starts
  movCap: 4,       // mvT ceiling, so a short stop does not lose the bonus at once
  movDecay: 1.5,   // mvT falls this fast (per second) while standing still
  movRate: 2,      // Onarım robotu rate factor once mvT >= movNeed
  farMax: 0.4,     // Uzak vuruş: bonus damage at full distance
  farDist: 12,     // ... reached at this many tiles of flight
  ambMul: 2,       // Pusu: damage factor against an enemy that does not see the player or sits in a bush
  ambCd: 2,        // ... at most once per enemy per this many seconds
  ambHunt: 1.5,    // Avcı counts as unaware when it last saw the player longer ago than this
  fortMul: 0.75,   // Kale: damage taken while standing still and firing
  fortStill: 20,   // ... standing still means speed below this (px/s)
  fortFire: 0.4,   // ... and a shot within this many seconds
  chainAdd: 3      // Zincir: seconds added to every other active power-up on a pickup
};
const synPct = x => Math.round(x * 100);
const SYN = [
  { id: 'bb', name: 'Seken patlama', a: 'ricochet', b: 'blast', desc: `Duvardan seken mermi, ilk isabetinde %${synPct(SYN_K.bbR - 1)} daha geniş alanda patlar` },
  { id: 'mov', name: 'Hareketli onarım', a: 'engine', b: 'repair', desc: `${SYN_K.movNeed} sn hareket edersen Onarım robotu ${SYN_K.movRate} kat hızlı çalışır` },
  { id: 'far', name: 'Uzak vuruş', a: 'caliber', b: 'barrel', desc: `Mermi uzağa gittikçe daha sert vurur, en çok +%${synPct(SYN_K.farMax)} hasar` },
  { id: 'amb', name: 'Pusu', a: 'thermal', b: 'caliber', desc: `Seni görmeyen ya da çalıdaki düşmana ilk isabet ${SYN_K.ambMul} kat hasar verir` },
  { id: 'fort', name: 'Kale', a: 'armor', b: 'loader', desc: `Durup ateş ederken aldığın hasar %${synPct(1 - SYN_K.fortMul)} azalır` },
  { id: 'chain', name: 'Zincir', a: 'magnet', b: 'boost', desc: `Güçlendirme alınca etkin diğerleri ${SYN_K.chainAdd} sn uzar` }
];
const synOnS = (sy, up = G.up) => ((up[sy.a] | 0) > 0) && ((up[sy.b] | 0) > 0);
const synOn = id => synOnS(SYN.find(x => x.id === id));
const synList = (up = G.up) => SYN.filter(sy => synOnS(sy, up));
function synFlags(b) { // player shells only; read later by synDmg / splashFor
  if (b.owner !== 0) return;
  b.bb = synOn('bb'); b.far = synOn('far'); b.ambush = synOn('amb');
}
// Splash settings for the blast of shell b (called once per blast from blastAt): Seken patlama widens the first blast of a ricocheted shell
function splashFor(b) {
  const sp = b.splash;
  if (!sp || !b.bb || !b.bounced || b.bbDone) return sp;
  b.bbDone = true;
  addPart('ring', b.x, b.y, 0, 0, 0.4, 8, sp.r * SYN_K.bbR * 3.6, 0, '150,215,255');
  addText(b.x, b.y - 26, 'SEKEN PATLAMA', '#9fd8ff', 14);
  return { r: sp.r * SYN_K.bbR, k: sp.k };
}
// Pusu: the enemy has not noticed the player (or hides in a bush)
const synUnaware = e => e.type === 'hunter' ? (e.hidden || G.time - e.seenT > SYN_K.ambHunt) : (e.hidden || !e.canSee);
function synDmg(b, e) { // damage multiplier for a player shell hitting enemy e
  if (b.owner !== 0) return 1;
  let m = 1;
  if (b.far && !b.lob && !b.flame) m *= 1 + SYN_K.farMax * Math.min(1, b.dist / (SYN_K.farDist * T));
  if (b.ambush && synUnaware(e) && G.time - (e.ambT === undefined ? -99 : e.ambT) >= SYN_K.ambCd) {
    e.ambT = G.time; m *= SYN_K.ambMul;
    addText(e.x, e.y - 30, 'PUSU', '#ff8a5c', 17);
  }
  return m;
}
function synTaken(b) { // damage multiplier for a shell hitting the player
  const p = G.player;
  if (p && p.still && synOn('fort')) {
    addPart('ring', p.x, p.y, 0, 0, 0.3, p.r, p.r + 16, 0, '170,190,210');
    return SYN_K.fortMul;
  }
  return 1;
}
// Per-frame player bookkeeping: mvT (seconds of driving, falls when idle, zeroed by a hit) and still (standing and shooting)
function synTrack(p, dt) {
  const sp = Math.hypot(p.vx, p.vy);
  if (p.hurtT !== p.synHurt) { p.synHurt = p.hurtT; p.mvT = 0; }
  p.mvT = sp > 50 ? Math.min(SYN_K.movCap, (p.mvT || 0) + dt) : Math.max(0, (p.mvT || 0) - SYN_K.movDecay * dt);
  p.still = sp < SYN_K.fortStill && G.time - p.lastShot < SYN_K.fortFire;
}
const synMoving = p => (p.mvT || 0) >= SYN_K.movNeed && synOn('mov');
function synRegen(p) { return synMoving(p) ? SYN_K.movRate : 1; } // multiplier on the Onarım robotu rate
const synRegenGlow = p => synMoving(p) ? 'pu_speed' : 'pu_repair';
function synPickup(kind) { // Zincir: every other active power-up grows
  if (!synOn('chain')) return;
  let n = 0;
  for (const k of BUFFS) if (k !== kind && G.buffs[k] > 0) { G.buffs[k] += SYN_K.chainAdd; G.buffMax[k] += SYN_K.chainAdd; n++; }
  if (n) { const p = G.player; addText(p.x, p.y - 46, 'Zincir +' + SYN_K.chainAdd + ' sn', '#7fd0ff', 15); addPart('ring', p.x, p.y, 0, 0, 0.45, 10, 90, 0, '127,208,255'); }
}
// Workshop: a card shows a synergy block only for synergies whose partner the player already owns (picking the card completes them); none otherwise
function synBadgeHTML(k) {
  if (upL(k)) return '';
  const done = SYN.filter(sy => (sy.a === k || sy.b === k) && upL(sy.a === k ? sy.b : sy.a) > 0);
  if (!done.length) return '';
  return `<span class="up-syn on">${done.map(sy => `<b>Birleşim: ${sy.name}</b><i>${sy.desc}</i>`).join('')}</span>`;
}
// chooseUpgrade: before = ids active before the card, returns the new ones; the banner is shown by the caller's phase delay
function synUnlocked(before) { return synList().filter(sy => !before.includes(sy.id)); }
function synChipsHTML() { return synList().map(sy => `<div class="syn-row"><b>${sy.name}</b><span>${sy.desc}</span></div>`).join(''); }
function renderSynList(wrap, list) { const h = synChipsHTML(); $(list).innerHTML = h; $(wrap).classList.toggle('hidden', !h); }

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

/* ================= DOM ================= */
const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d', { alpha: false });
const miniCv = $('mini'), mctx = miniCv.getContext('2d');
const el = {
  hud: $('hud'), leftCol: $('leftCol'), rightCol: $('rightCol'), armor: $('armor'), hpFill: $('hpFill'), hpNum: $('hpNum'), waveT: $('waveT'), waveS: $('waveS'),
  bossBar: $('bossBar'), bossFill: $('bossFill'), bossLost: $('bossLost'), waveChip: $('waveT').parentElement, bossName: $('bossName'), bossPct: $('bossPct'), bossMarks: $('bossMarks'), buffs: $('buffs'), score: $('scoreNum'), btnPause: $('btnPause'), btnSound: $('btnSound'), btnNuke: $('btnNuke'),
  banner: $('banner'), bTitle: $('bTitle'), bSub: $('bSub'), hint: $('hint'),
  menu: $('menu'), menuPanel: $('menuPanel'), pause: $('pause'), over: $('over'), overPanel: $('overPanel'),
  btnStart: $('btnStart'), btnContinue: $('btnContinue'), btnResume: $('btnResume'), btnRestart: $('btnRestart'),
  btnQuit: $('btnQuit'), btnAgain: $('btnAgain'), btnMenu: $('btnMenu'),
  newRec: $('newRec'), sScore: $('sScore'), sWave: $('sWave'), sKills: $('sKills'), sAcc: $('sAcc'), probe: $('probe'),
  upgrade: $('upgrade'), upCards: $('upCards')
};
const NATIVE = window.TankAndroid || null; // bridge object added by the Android app

/* ================= game state ================= */
const G = {
  state: 'menu', phase: 'intro', phaseT: 0, time: 0, timeScale: 1,
  map: null, player: null, enemies: [], bullets: [], pickups: [], portals: [], texts: [],
  queue: [], maxAlive: 3, spawnTimer: 0, mods: null, boss: null,
  wave: 0, score: 0, kills: 0, shots: 0, hits: 0, hurt: 0, fade: 0, god: false,
  buffs: freshBuffs(), buffMax: freshBuffs(), bushHint: false, beaten: new Set(), resume: null, overFree: null,
  D: RULES, dodges: 0, covers: 0,
  up: {}, strikes: [], jet: null, airQ: 0, stage: null, tele: [], pieces: [], introGate: false, introSeen: false,
  tank: 'std', upMode: 'cards', evoWait: 0, noEvo: false
};
const upL = k => G.up[k] | 0;
const bountyPts = () => Math.round(250 * Math.max(1, G.wave) * G.D.score);
const parts = [];
const menu = { aim: null, aimAt: 0, shot: false, fired: false, hintA: 1 };
const dbg = { freeze: false, clean: false }; // debug-only: freeze the world / hide overlay markers for screenshots

/* ================= view / camera ================= */
const view = { w: 1, h: 1, dpr: 1, base: 1, zoomK: 1, scale: 1, x0: 0, y0: 0, x1: 0, y1: 0, bx0: 0, by0: 0, bx1: 0, by1: 0, st: 0, sr: 0, sb: 0, sl: 0, hudRects: [] };
const cam = { x: 0, y: 0, shake: 0 };
function readSafe() {
  const cs = getComputedStyle(el.probe);
  view.st = parseFloat(cs.paddingTop) || 0; view.sr = parseFloat(cs.paddingRight) || 0;
  view.sb = parseFloat(cs.paddingBottom) || 0; view.sl = parseFloat(cs.paddingLeft) || 0;
}
function sizeMini() { const cs = miniCv.clientWidth; if (!cs) return; const px = Math.round(cs * view.dpr); if (miniCv.width !== px) { miniCv.width = px; miniCv.height = px; } }
function measureHud() {
  if (el.hud.classList.contains('hidden')) return;
  view.hudRects = [el.leftCol, el.rightCol, el.btnNuke].filter(n => n.offsetWidth).map(n => { const r = n.getBoundingClientRect(); return { l: r.left - 8, t: r.top - 8, r: r.right + 8, b: r.bottom + 8 }; });
}
const LAYER_MPX = 6.5e6; // cap on the static map layer's backing size (the 35-tile map would be ~11 Mpx at scale 2)
const layerRes = m => Math.min(clamp(view.base * view.dpr, 1, 2), Math.sqrt(LAYER_MPX) / (m ? m.w : MAP_N * T));
function resize() {
  const wasTall = view.h > view.w;
  view.dpr = Math.min(window.devicePixelRatio || 1, SET.effects === 'low' ? 1.25 : 2);
  view.w = Math.max(1, window.innerWidth); view.h = Math.max(1, window.innerHeight);
  // the phone turned mid-game: thumbs leave the screen, so drop the old stick origins
  if ((view.h > view.w) !== wasTall) for (const st of [sticks.move, sticks.aim]) { st.id = null; st.vx = st.vy = 0; }
  canvas.width = Math.round(view.w * view.dpr); canvas.height = Math.round(view.h * view.dpr);
  const minSide = Math.min(view.w, view.h);
  view.base = minSide / (T * (9.5 + clamp((minSide - 400) / 400, 0, 1) * 2.5)); view.scale = view.base * view.zoomK; // base = the unzoomed scale; zoomK follows the tank's camera factor
  readSafe(); sizeMini(); measureHud();
  if (G.map && Math.abs(layerRes(G.map) - G.map.res) / G.map.res > 0.2) buildLayer(G.map);
  if (G.state === 'menu' && G.map && G.player) { cam.x = G.map.w / 2; cam.y = G.map.h / 2; clampCam(); computeView(); placeMenuTank(); }
  if (G.state === 'over') G.overFree = freeArea(el.overPanel);
}
function clampCam() {
  const m = G.map; if (!m) return;
  const hw = view.w / view.scale / 2, hh = view.h / view.scale / 2, pad = T * 0.35;
  cam.x = (m.w + pad * 2 <= hw * 2) ? m.w / 2 : clamp(cam.x, hw - pad, m.w - hw + pad);
  cam.y = (m.h + pad * 2 <= hh * 2) ? m.h / 2 : clamp(cam.y, hh - pad, m.h - hh + pad);
}
function computeView() {
  const hw = view.w / view.scale / 2, hh = view.h / view.scale / 2;
  view.x0 = cam.x - hw; view.x1 = cam.x + hw; view.y0 = cam.y - hh; view.y1 = cam.y + hh;
  const bw = view.w / view.base / 2, bh = view.h / view.base / 2; // the same view without the tank's zoom: enemies fire only inside it
  view.bx0 = cam.x - bw; view.bx1 = cam.x + bw; view.by0 = cam.y - bh; view.by1 = cam.y + bh;
}
const onScreen = (x, y, m) => x > view.x0 - m && x < view.x1 + m && y > view.y0 - m && y < view.y1 + m;
const onFireView = (x, y, m) => x > view.bx0 - m && x < view.bx1 + m && y > view.by0 - m && y < view.by1 + m;
const toWorld = (sx, sy) => ({ x: (sx - view.w / 2) / view.scale + cam.x, y: (sy - view.h / 2) / view.scale + cam.y });
const volAt = (x, y) => clamp(1.15 - Math.hypot(x - cam.x, y - cam.y) / 850, 0.08, 1);
const prox = (x, y) => clamp(1.2 - Math.hypot(x - cam.x, y - cam.y) / 650, 0, 1);
function shake(a) { if (!REDUCED && SET.shake) cam.shake = Math.min(16, cam.shake + a); }
function freeArea(panel) {
  const r = panel.getBoundingClientRect();
  if (!r.width) return { x: view.w / 2, y: view.h / 2 };
  if (view.w < view.h) return { x: view.w / 2, y: Math.max(70, r.top * 0.5) };
  return { x: (r.right + view.w) / 2, y: view.h / 2 };
}

/* ================= map generation ================= */
const STAMPS = [
  { p: ['BB', 'BB'], w: 4 }, { p: ['BBB'], w: 3 }, { p: ['B', 'B', 'B'], w: 3 }, { p: ['BB', 'B.'], w: 2 },
  { p: ['BBBB'], w: 1.4 }, { p: ['B', 'B', 'B', 'B'], w: 1.4 }, { p: ['S'], w: 2 }, { p: ['SS'], w: 1 }, { p: ['S', 'S'], w: 1 },
  { p: ['SB', 'BB'], w: 1.2 }, { p: ['BSB'], w: 0.8 }, { p: ['GG', 'GG'], w: 2.2 }, { p: ['GGG', '.GG'], w: 1.4 },
  { p: ['G'], w: 1.2 }, { p: ['GG'], w: 1 }, { p: ['WW', 'WW'], w: 0.8 }, { p: ['WWW', '.W.'], w: 0.5 }
];
const STAMP_W = STAMPS.reduce((s, x) => s + x.w, 0);
const CH = { B: BRICK, S: STEEL, W: WATER, G: BUSH };

function connected(t, n, spawns) {
  const seen = new Uint8Array(n * n), q = new Int32Array(n * n); let head = 0, tail = 0;
  const s0 = HALF * n + HALF; seen[s0] = 1; q[tail++] = s0;
  while (head < tail) {
    const i = q[head++], c = i % n, r = (i - c) / n;
    for (const [dx, dy] of DIRS) {
      const x = c + dx, y = r + dy; if (x < 0 || y < 0 || x >= n || y >= n) continue;
      const j = y * n + x; if (seen[j]) continue;
      const v = t[j]; if (v === STEEL || v === WATER) continue;
      seen[j] = 1; q[tail++] = j;
    }
  }
  for (const [c, r] of spawns) if (!seen[r * n + c]) return false;
  for (let i = 0; i < n * n; i++) { const v = t[i]; if (v !== STEEL && v !== WATER && !seen[i]) return false; }
  return true;
}
function generate() {
  const n = MAP_N, h = HALF;
  const spawns = [[1, 1], [n - 2, 1], [1, n - 2], [n - 2, n - 2], [h, 1], [1, h], [n - 2, h], [h, n - 2]];
  const border = t => { for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!r || !c || r === n - 1 || c === n - 1) t[r * n + c] = STEEL; };
  for (let attempt = 0; attempt < 80; attempt++) {
    const t = new Uint8Array(n * n), res = new Uint8Array(n * n);
    border(t);
    const reserve = (c, r, k) => { for (let y = r - k; y <= r + k; y++) for (let x = c - k; x <= c + k; x++) if (x > 0 && y > 0 && x < n - 1 && y < n - 1) res[y * n + x] = 1; };
    reserve(h, h, 1); for (const [c, r] of spawns) reserve(c, r, 1);
    const rot = Math.random() < 0.5;
    const put = (c, r, v) => {
      const pts = rot ? [[c, r], [n - 1 - r, c], [n - 1 - c, n - 1 - r], [r, n - 1 - c]] : [[c, r], [n - 1 - c, r], [c, n - 1 - r], [n - 1 - c, n - 1 - r]];
      for (const [x, y] of pts) { if (x <= 0 || y <= 0 || x >= n - 1 || y >= n - 1) continue; const i = y * n + x; if (!res[i]) t[i] = v; }
    };
    if (Math.random() < 0.35) { put(h - 2, h - 2, BRICK); put(h - 1, h - 2, BRICK); put(h - 2, h - 1, BRICK); }
    const count = randInt(26, 38); // same stamp density per area as the 21-tile map (33x33 inner)
    for (let k = 0; k < count; k++) {
      let x = Math.random() * STAMP_W, st = STAMPS[0];
      for (const s of STAMPS) { x -= s.w; if (x <= 0) { st = s; break; } }
      const c0 = randInt(1, h), r0 = randInt(1, h);
      st.p.forEach((row, yy) => {
        for (let xx = 0; xx < row.length; xx++) {
          const ch = row[xx]; if (ch === '.') continue;
          const c = c0 + xx, r = r0 + yy; if (c > h || r > h) continue;
          put(c, r, CH[ch]);
        }
      });
    }
    let solid = 0, bush = 0; const inner = (n - 2) * (n - 2);
    for (let r = 1; r < n - 1; r++) for (let c = 1; c < n - 1; c++) { const v = t[r * n + c]; if (v === BUSH) bush++; else if (v) solid++; }
    if (solid / inner < 0.14 || solid / inner > 0.36 || bush / inner > 0.16) continue;
    if (!connected(t, n, spawns)) continue;
    return { n, t, spawns };
  }
  const t = new Uint8Array(n * n); border(t);
  for (let r = 3; r < n - 3; r += 4) for (let c = 3; c < n - 3; c += 4) if (!(Math.abs(c - h) <= 1 && Math.abs(r - h) <= 1)) t[r * n + c] = BRICK;
  return { n, t, spawns };
}

const LAYER = document.createElement('canvas');
function makeArena(gen, theme) {
  const n = gen.n;
  const m = {
    n, t: gen.t, hp: new Uint8Array(n * n), theme, w: n * T, h: n * T,
    spawns: gen.spawns.map(([c, r]) => ({ c, r, x: c * T + T / 2, y: r * T + T / 2 })),
    decals: [], seed: randInt(1, 999999), flow: new Float32Array(n * n), flowFrom: -1, flowDirty: true, flowT: 0,
    sflow: new Float32Array(n * n), expo: new Uint8Array(n * n), sflowT: 0,
    dust: dustSprite(theme.dust), layer: LAYER, lg: null, res: 1, mini: null, mg: null,
    get(c, r) { return (c < 0 || r < 0 || c >= n || r >= n) ? STEEL : this.t[r * n + c]; },
    at(x, y) { return this.get(Math.floor(x / T), Math.floor(y / T)); }
  };
  for (let i = 0; i < n * n; i++) if (m.t[i] === BRICK) m.hp[i] = BRICK_HP;
  buildLayer(m); buildMini(m);
  return m;
}
function buildLayer(m) {
  const res = layerRes(m);
  m.layer.width = Math.ceil(m.w * res); m.layer.height = Math.ceil(m.h * res);
  m.lg = m.layer.getContext('2d'); m.res = res;
  paintRegion(m, 0, 0, m.n - 1, m.n - 1);
}
function buildMini(m) {
  const cv = document.createElement('canvas'); cv.width = cv.height = m.n;
  m.mini = cv; m.mg = cv.getContext('2d');
  for (let r = 0; r < m.n; r++) for (let c = 0; c < m.n; c++) miniTile(m, c, r);
}
function miniTile(m, c, r) {
  const th = m.theme, v = m.t[r * m.n + c];
  m.mg.fillStyle = v === BRICK ? th.brick : v === STEEL ? th.steelDk : v === WATER ? th.water : v === BUSH ? th.bushDk : th.ground;
  m.mg.fillRect(c, r, 1, 1);
}

/* ---- static layer painting (ground, decals, water, shadows, walls) ---- */
function paintRegion(m, c0, r0, c1, r1) {
  const n = m.n;
  c0 = Math.max(0, c0); r0 = Math.max(0, r0); c1 = Math.min(n - 1, c1); r1 = Math.min(n - 1, r1);
  if (c1 < c0 || r1 < r0) return;
  const g = m.lg, th = m.theme;
  g.setTransform(m.res, 0, 0, m.res, 0, 0);
  g.save();
  g.beginPath(); g.rect(c0 * T, r0 * T, (c1 - c0 + 1) * T, (r1 - r0 + 1) * T); g.clip();
  drawGroundBase(g, m, c0, r0, c1, r1);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) drawGroundDetail(g, m, c, r);
  const X0 = c0 * T, Y0 = r0 * T, X1 = (c1 + 1) * T, Y1 = (r1 + 1) * T;
  for (const d of m.decals) if (d.x + d.r > X0 && d.x - d.r < X1 && d.y + d.r > Y0 && d.y - d.r < Y1) drawDecal(g, m, d);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (m.t[r * n + c] === WATER) drawWaterTile(g, m, c, r);
  g.fillStyle = th.shadow; g.beginPath();
  for (let r = r0 - 1; r <= r1; r++) for (let c = c0 - 1; c <= c1; c++) { if (c < 0 || r < 0) continue; if (isWall(m.t[r * n + c])) g.rect(c * T + 6, r * T + 8, T, T); }
  g.fill();
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const v = m.t[r * n + c]; if (v === BRICK) drawBrick(g, m, c, r); else if (v === STEEL) drawSteel(g, m, c, r); }
  g.restore();
}
function drawGroundBase(g, m, c0, r0, c1, r1) {
  const th = m.theme;
  g.fillStyle = th.ground; g.fillRect(c0 * T, r0 * T, (c1 - c0 + 1) * T, (r1 - r0 + 1) * T);
  g.fillStyle = th.ground2;
  if (th.key === 'city') {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if ((c + r) & 1) g.fillRect(c * T, r * T, T, T);
    return;
  }
  for (let r = r0 - 1; r <= r1 + 1; r++) for (let c = c0 - 1; c <= c1 + 1; c++) {
    const rng = mulberry32(seedOf(c, r, m.seed));
    if (rng() < 0.5) { g.beginPath(); g.ellipse(c * T + rng() * T, r * T + rng() * T, T * (0.35 + rng() * 0.45), T * (0.25 + rng() * 0.35), rng() * Math.PI, 0, TAU); g.fill(); }
  }
}
function drawGroundDetail(g, m, c, r) {
  const th = m.theme, x = c * T, y = r * T, rng = mulberry32(seedOf(c, r, m.seed + 7));
  if (th.key === 'desert') {
    g.fillStyle = th.detail;
    for (let k = 0; k < 4; k++) if (rng() < 0.5) { const s = 1 + rng() * 2; g.beginPath(); g.ellipse(x + 4 + rng() * (T - 8), y + 4 + rng() * (T - 8), s * 1.4, s, rng() * 3, 0, TAU); g.fill(); }
    if (rng() < 0.3) { g.strokeStyle = th.detail2; g.lineWidth = 1.4; const yy = y + 10 + rng() * (T - 20); g.beginPath(); g.moveTo(x + 6, yy); g.quadraticCurveTo(x + T / 2, yy - 4 - rng() * 4, x + T - 6, yy); g.stroke(); }
  } else if (th.key === 'forest') {
    g.strokeStyle = th.detail; g.lineWidth = 1.3; g.lineCap = 'round';
    for (let k = 0; k < 5; k++) if (rng() < 0.55) { const px = x + 5 + rng() * (T - 10), py = y + 8 + rng() * (T - 12); g.beginPath(); g.moveTo(px - 2.5, py - 4); g.lineTo(px, py); g.lineTo(px + 2.5, py - 4.5); g.moveTo(px, py); g.lineTo(px, py - 5); g.stroke(); }
    if (rng() < 0.14) { g.fillStyle = rng() < 0.5 ? '#efd76a' : '#f4f1e6'; g.beginPath(); g.arc(x + 6 + rng() * (T - 12), y + 6 + rng() * (T - 12), 1.7, 0, TAU); g.fill(); }
  } else if (th.key === 'snow') {
    g.fillStyle = th.detail;
    for (let k = 0; k < 3; k++) if (rng() < 0.5) { g.beginPath(); g.ellipse(x + 5 + rng() * (T - 10), y + 5 + rng() * (T - 10), 2 + rng() * 4, 1 + rng() * 2, rng() * 3, 0, TAU); g.fill(); }
    g.fillStyle = th.detail2; for (let k = 0; k < 3; k++) if (rng() < 0.4) g.fillRect(x + rng() * T, y + rng() * T, 1.5, 1.5);
  } else {
    g.strokeStyle = 'rgba(0,0,0,.16)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
    if (rng() < 0.2) { g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 1.1; let px = x + rng() * T, py = y + rng() * T; g.beginPath(); g.moveTo(px, py); for (let s = 0; s < 3; s++) { px += (rng() - 0.5) * 20; py += (rng() - 0.5) * 20; g.lineTo(clamp(px, x, x + T), clamp(py, y, y + T)); } g.stroke(); }
    if (rng() < 0.05) { g.fillStyle = 'rgba(10,10,12,.22)'; g.beginPath(); g.ellipse(x + T / 2, y + T / 2, 10 + rng() * 8, 6 + rng() * 6, rng() * 3, 0, TAU); g.fill(); }
    g.fillStyle = th.detail2; for (let k = 0; k < 2; k++) if (rng() < 0.5) g.fillRect(x + rng() * T, y + rng() * T, 1.4, 1.4);
  }
}
function drawWaterTile(g, m, c, r) {
  const th = m.theme, x = c * T, y = r * T;
  const up = m.get(c, r - 1) !== WATER, dn = m.get(c, r + 1) !== WATER, lf = m.get(c - 1, r) !== WATER, rt = m.get(c + 1, r) !== WATER;
  g.fillStyle = th.water; g.fillRect(x, y, T, T);
  g.fillStyle = th.waterDk; if (up) g.fillRect(x, y, T, 7); if (lf) g.fillRect(x, y, 5, T);
  g.globalAlpha = 0.75; g.fillStyle = th.shore;
  if (up) g.fillRect(x, y, T, 2); if (dn) g.fillRect(x, y + T - 2, T, 2); if (lf) g.fillRect(x, y, 2, T); if (rt) g.fillRect(x + T - 2, y, 2, T);
  g.globalAlpha = 1;
}
const SIDE = 7;
function edgeLines(g, m, c, r) {
  const x = c * T, y = r * T;
  g.fillStyle = 'rgba(0,0,0,.35)';
  if (!isWall(m.get(c - 1, r))) g.fillRect(x, y, 1.5, T);
  if (!isWall(m.get(c + 1, r))) g.fillRect(x + T - 1.5, y, 1.5, T);
  if (!isWall(m.get(c, r - 1))) g.fillRect(x, y, T, 1.5);
  if (!isWall(m.get(c, r + 1))) g.fillRect(x, y + T - 1.5, T, 1.5);
}
function drawBrick(g, m, c, r) {
  const th = m.theme, x = c * T, y = r * T, hp = m.hp[r * m.n + c];
  const side = isWall(m.get(c, r + 1)) ? 0 : SIDE, top = T - side;
  if (side) {
    g.fillStyle = th.brickDk; g.fillRect(x, y + top, T, side);
    g.fillStyle = 'rgba(0,0,0,.22)'; for (let k = 1; k < 4; k++) g.fillRect(x + k * 12 + ((k & 1) ? 3 : -3), y + top, 1.2, side);
  }
  g.fillStyle = th.brick; g.fillRect(x, y, T, top);
  const rng = mulberry32(seedOf(c, r, 11)), rows = 4, rh = top / rows;
  for (let k = 0; k < rows; k++) {
    const off = (k & 1) ? T / 4 : 0;
    for (let j = 0; j < 3; j++) {
      const a = Math.max(0, j * T / 2 - off), b = Math.min(T, (j + 1) * T / 2 - off); if (b <= a) continue;
      const v = rng();
      if (v < 0.35) { g.fillStyle = 'rgba(0,0,0,.09)'; g.fillRect(x + a, y + k * rh, b - a, rh); }
      else if (v > 0.8) { g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x + a, y + k * rh, b - a, rh); }
    }
  }
  g.fillStyle = th.mortar;
  for (let k = 1; k < rows; k++) g.fillRect(x, y + k * rh - 0.8, T, 1.6);
  for (let k = 0; k < rows; k++) { const off = (k & 1) ? T / 4 : 0; for (let j = 1; j < 3; j++) { const bx = j * T / 2 - off; if (bx > 0.5 && bx < T - 0.5) g.fillRect(x + bx - 0.8, y + k * rh, 1.6, rh); } }
  g.globalAlpha = 0.55; g.fillStyle = th.brickHi; for (let k = 0; k < rows; k++) g.fillRect(x, y + k * rh + 0.8, T, 1.2); g.globalAlpha = 1;
  edgeLines(g, m, c, r);
  if (hp < BRICK_HP) drawCracks(g, x, y, top, hp, seedOf(c, r, 5));
}
function drawCracks(g, x, y, top, hp, seed) {
  const rng = mulberry32(seed);
  g.strokeStyle = 'rgba(30,12,5,.78)'; g.lineWidth = 1.7; g.lineCap = 'round';
  for (let k = 0; k < (hp === 2 ? 2 : 4); k++) {
    let px = x + 8 + rng() * (T - 16), py = y + 6 + rng() * (top - 12);
    g.beginPath(); g.moveTo(px, py);
    for (let s = 0; s < 3; s++) { px += (rng() - 0.5) * 18; py += (rng() - 0.5) * 16; g.lineTo(clamp(px, x + 2, x + T - 2), clamp(py, y + 2, y + top - 2)); }
    g.stroke();
  }
  if (hp === 1) { g.fillStyle = 'rgba(25,12,6,.55)'; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x + 8 + rng() * (T - 16), y + 6 + rng() * (top - 12), 2.5 + rng() * 3.5, 0, TAU); g.fill(); } }
}
function drawSteel(g, m, c, r) {
  const th = m.theme, x = c * T, y = r * T;
  const side = isWall(m.get(c, r + 1)) ? 0 : SIDE, top = T - side;
  if (side) { g.fillStyle = th.steelDk; g.fillRect(x, y + top, T, side); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x, y + top, T, 1.5); }
  g.fillStyle = th.steelDk; g.fillRect(x, y, T, top);
  g.fillStyle = th.steel; g.fillRect(x + 3, y + 3, T - 6, top - 6);
  g.fillStyle = th.steelHi; g.fillRect(x + 3, y + 3, T - 6, 2); g.fillRect(x + 3, y + 3, 2, top - 6);
  g.strokeStyle = 'rgba(0,0,0,.13)'; g.lineWidth = 2; g.beginPath();
  g.moveTo(x + 9, y + 9); g.lineTo(x + T - 9, y + top - 9); g.moveTo(x + T - 9, y + 9); g.lineTo(x + 9, y + top - 9); g.stroke();
  const pts = [[8, 8], [T - 8, 8], [8, top - 8], [T - 8, top - 8]];
  g.fillStyle = th.steelDk; for (const [ax, ay] of pts) { g.beginPath(); g.arc(x + ax, y + ay, 2.1, 0, TAU); g.fill(); }
  g.fillStyle = th.steelHi; for (const [ax, ay] of pts) { g.beginPath(); g.arc(x + ax - 0.6, y + ay - 0.6, 0.9, 0, TAU); g.fill(); }
  edgeLines(g, m, c, r);
}
function drawDecal(g, m, d) {
  const th = m.theme;
  if (d.k === 'scorch') {
    const gr = g.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
    gr.addColorStop(0, `rgba(${th.scorch},.6)`); gr.addColorStop(0.55, `rgba(${th.scorch},.28)`); gr.addColorStop(1, `rgba(${th.scorch},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(d.x, d.y, d.r, 0, TAU); g.fill();
  } else if (d.k === 'wreck') {
    g.save(); g.translate(d.x, d.y); g.rotate(d.a);
    g.fillStyle = 'rgba(30,26,22,.7)'; rrect(g, -d.L / 2, -d.W / 2, d.L, d.W, 4); g.fill();
    g.fillStyle = 'rgba(70,56,44,.62)'; rrect(g, -d.L / 2 + 3, -d.W / 2 + d.tw - 1, d.L - 6, d.W - 2 * d.tw + 2, 3); g.fill();
    g.translate(d.tox || 0, d.toy || 0); g.rotate(d.ta);
    g.fillStyle = 'rgba(22,19,16,.78)'; g.fillRect(d.tR * 0.3, -d.bW / 2, d.barrel * 0.7, d.bW);
    g.beginPath(); g.arc(0, 0, d.tR * 0.95, 0, TAU); g.fill();
    g.fillStyle = 'rgba(165,78,32,.4)'; g.beginPath(); g.arc(-d.tR * 0.2, -d.tR * 0.2, d.tR * 0.45, 0, TAU); g.fill();
    g.restore();
  } else if (d.k === 'rubble') {
    const rng = mulberry32(d.seed);
    for (let i = 0; i < 10; i++) {
      const s = 3 + rng() * 6; g.save(); g.translate(d.x + (rng() - 0.5) * T * 0.85, d.y + (rng() - 0.5) * T * 0.85); g.rotate(rng() * 3);
      g.fillStyle = rng() < 0.5 ? th.brickDk : th.brick; g.fillRect(-s / 2, -s / 3, s, s * 0.66); g.restore();
    }
  }
}
function addDecals(m, list) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const d of list) { m.decals.push(d); x0 = Math.min(x0, d.x - d.r); y0 = Math.min(y0, d.y - d.r); x1 = Math.max(x1, d.x + d.r); y1 = Math.max(y1, d.y + d.r); }
  while (m.decals.length > 160) m.decals.shift();
  paintRegion(m, Math.floor(x0 / T), Math.floor(y0 / T), Math.floor(x1 / T), Math.floor(y1 / T));
}

/* ================= path finding ================= */
const HK = [], HV = [];
function hpush(k, v) { let i = HK.length; HK.push(k); HV.push(v); while (i > 0) { const p = (i - 1) >> 1; if (HK[p] <= k) break; HK[i] = HK[p]; HV[i] = HV[p]; i = p; } HK[i] = k; HV[i] = v; }
function hpop() {
  const top = HV[0], lk = HK.pop(), lv = HV.pop(), n = HK.length;
  if (n > 0) {
    let i = 0;
    for (;;) { const l = 2 * i + 1, r = l + 1; let s = -1, sk = lk; if (l < n && HK[l] < sk) { s = l; sk = HK[l]; } if (r < n && HK[r] < sk) s = r; if (s < 0) break; HK[i] = HK[s]; HV[i] = HV[s]; i = s; }
    HK[i] = lk; HV[i] = lv;
  }
  return top;
}
let flowDone = null;
function dijkstra(m, start, dist, expo) {
  const n = m.n, N = n * n;
  if (!flowDone || flowDone.length !== N) flowDone = new Uint8Array(N); else flowDone.fill(0);
  dist.fill(1e9); HK.length = 0; HV.length = 0;
  dist[start] = 0; hpush(0, start);
  while (HK.length) {
    const i = hpop(); if (flowDone[i]) continue; flowDone[i] = 1;
    const c = i % n, r = (i - c) / n, d = dist[i];
    for (let k = 0; k < 4; k++) {
      const x = c + DIRS[k][0], y = r + DIRS[k][1]; if (x < 0 || y < 0 || x >= n || y >= n) continue;
      const j = y * n + x, v = m.t[j]; if (v === STEEL || v === WATER) continue;
      const nd = d + (v === BRICK ? 6 : 1) + (expo && expo[j] ? 3 : 0); if (nd < dist[j]) { dist[j] = nd; hpush(nd, j); }
    }
  }
}
const computeFlow = (m, start) => dijkstra(m, start, m.flow, null);
// Hunters path through tiles the player cannot see, so they approach from cover and arrive from the flanks
function computeSneakyFlow(m, start, px, py) {
  const n = m.n, ex = m.expo, R2 = (T * 9) * (T * 9);
  for (let i = 0; i < n * n; i++) {
    ex[i] = 0;
    const v = m.t[i]; if (v === STEEL || v === WATER || v === BRICK) continue;
    const c = i % n, x = c * T + T / 2, y = (i - c) / n * T + T / 2;
    if (dist2(x, y, px, py) < R2 && los(x, y, px, py)) ex[i] = 1;
  }
  dijkstra(m, start, m.sflow, ex);
}
function updateFlow(dt) {
  const m = G.map, p = G.player; if (!m || !p) return;
  m.flowT -= dt;
  const pc = clamp(Math.floor(p.x / T), 0, m.n - 1), pr = clamp(Math.floor(p.y / T), 0, m.n - 1), pi = pr * m.n + pc;
  if ((pi !== m.flowFrom || m.flowDirty) && m.flowT <= 0) { computeFlow(m, pi); m.flowFrom = pi; m.flowDirty = false; m.flowT = 0.2; }
  if (G.enemies.some(e => e.spec.smart && !e.dead)) {
    m.sflowT -= dt;
    if (m.sflowT <= 0) { computeSneakyFlow(m, pi, p.x, p.y); m.sflowT = 0.4; }
  }
}
function nextWaypoint(e, field) {
  const m = G.map, fl = field || m.flow, n = m.n, c = clamp(Math.floor(e.x / T), 0, n - 1), r = clamp(Math.floor(e.y / T), 0, n - 1);
  let best = null, bestV = fl[r * n + c];
  for (const [dx, dy] of shuffle(DIRS.slice())) {
    const x = c + dx, y = r + dy, v = m.get(x, y); if (v === STEEL || v === WATER) continue;
    let f = fl[y * n + x];
    for (const o of G.enemies) if (o !== e && o.wp && o.wp.c === x && o.wp.r === y) f += 1.5;
    if (f < bestV) { bestV = f; best = { c: x, r: y }; }
  }
  if (!best) return null;
  best.x = best.c * T + T / 2; best.y = best.r * T + T / 2;
  return best;
}
function randomNeighbor(e) {
  const m = G.map, c = Math.floor(e.x / T), r = Math.floor(e.y / T), opts = [];
  for (const [dx, dy] of DIRS) { const v = m.get(c + dx, r + dy); if (v !== STEEL && v !== WATER) opts.push({ c: c + dx, r: r + dy }); }
  if (!opts.length) return null;
  const o = pick(opts); o.x = o.c * T + T / 2; o.y = o.r * T + T / 2; return o;
}
function los(x0, y0, x1, y1) {
  const m = G.map, dx = x1 - x0, dy = y1 - y0, n = Math.ceil(Math.hypot(dx, dy) / 12);
  for (let i = 1; i < n; i++) { const t = i / n; if (isWall(m.at(x0 + dx * t, y0 + dy * t))) return false; }
  return true;
}

/* ================= tanks ================= */
let tankSeq = 0;
function makeTank(type, x, y) {
  const s = SPECS[type];
  return { id: ++tankSeq, type, spec: s, x, y, vx: 0, vy: 0, avx: 0, avy: 0, angle: -Math.PI / 2, turret: -Math.PI / 2, r: s.r, hp: s.hp, maxHp: s.hp,
    cool: 0, flash: 0, recoil: 0, treadL: 0, treadR: 0, trackAcc: 0, pl: null, pr: null, alive: true, dead: false, lastShot: -99,
    wp: null, wpBest: 1e9, stuckT: 0, senseT: 0, canSee: false, distP: 1e9, hidden: false, blast: null, aimErr: 0,
    speedMul: 1, coolMul: 1, enraged: false, smokeT: 0,
    mode: 'hunt', modeT: 0, path: null, pathI: 0, pathT: 0, dodge: null, dodgeCd: 0, seenT: -99, seenX: 0, seenY: 0, reconDone: true, fled: false, lock: false,
    hurtT: -99, fxT: 0, chargeT: 0,
    stunT: 0, kvx: 0, kvy: 0, burnT: 0, burnTick: 0, burnDps: 0, lastVol: 0, lastVolT: -99, // enemy status (tickStatus)
    heat: 0, overheatT: 0, pushT: 0, shield1T: 0, volId: 0, evoT: 0, flameOn: false, smkT: 0, aimDist: 6 * T }; // player tank state (TT)
}
function collideWalls(t) {
  const m = G.map, r = t.r;
  const c0 = Math.floor((t.x - r) / T), c1 = Math.floor((t.x + r) / T), r0 = Math.floor((t.y - r) / T), r1 = Math.floor((t.y + r) / T);
  for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
    if (!blocksTank(m.get(cx, cy))) continue;
    const bx0 = cx * T, by0 = cy * T, bx1 = bx0 + T, by1 = by0 + T;
    const nx = clamp(t.x, bx0, bx1), ny = clamp(t.y, by0, by1), dx = t.x - nx, dy = t.y - ny, dd = dx * dx + dy * dy;
    if (dd >= r * r) continue;
    if (dd > 1e-6) { const d = Math.sqrt(dd), k = (r - d) / d; t.x += dx * k; t.y += dy * k; }
    else {
      const l = t.x - bx0, rr = bx1 - t.x, u = t.y - by0, b = by1 - t.y, mn = Math.min(l, rr, u, b);
      if (mn === l) t.x = bx0 - r; else if (mn === rr) t.x = bx1 + r; else if (mn === u) t.y = by0 - r; else t.y = by1 + r;
    }
  }
}
function moveTank(t, dx, dy) {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 5));
  for (let i = 0; i < steps; i++) { t.x += dx / steps; t.y += dy / steps; collideWalls(t); collideWalls(t); }
}

/* tread marks: ring buffer of line segments */
const TM = 1400;
const tm = { x1: new Float32Array(TM), y1: new Float32Array(TM), x2: new Float32Array(TM), y2: new Float32Array(TM), t: new Float32Array(TM), n: 0, head: 0 };
function addTread(x1, y1, x2, y2) { const i = tm.head; tm.x1[i] = x1; tm.y1[i] = y1; tm.x2[i] = x2; tm.y2[i] = y2; tm.t[i] = G.time; tm.head = (i + 1) % TM; if (tm.n < TM) tm.n++; }
function trackUpdate(t, moved, dA) {
  const s = t.spec, half = s.wid * 0.5;
  t.treadL += moved + dA * half; t.treadR += moved - dA * half;
  t.trackAcc += Math.abs(moved) + Math.abs(dA) * half;
  if (t.trackAcc < 6) return;
  t.trackAcc = 0;
  const off = half - s.tread * 0.5, nx = -Math.sin(t.angle), ny = Math.cos(t.angle);
  const lx = t.x + nx * off, ly = t.y + ny * off, rx = t.x - nx * off, ry = t.y - ny * off;
  if (t.pl && dist2(t.pl[0], t.pl[1], lx, ly) < 400) { addTread(t.pl[0], t.pl[1], lx, ly); addTread(t.pr[0], t.pr[1], rx, ry); }
  t.pl = [lx, ly]; t.pr = [rx, ry];
  if (fxScale === 1 && Math.abs(moved) > 0.5 && Math.random() < 0.35) {
    const bx = t.x - Math.cos(t.angle) * s.len * 0.5, by = t.y - Math.sin(t.angle) * s.len * 0.5;
    addPart('dust', bx + rand(-5, 5), by + rand(-5, 5), rand(-12, 12), rand(-12, 12), rand(0.5, 0.8), rand(9, 14), 22, 2);
  }
}
// Player spec with the workshop upgrades applied; the levels ride along in spec.up so drawTank can show the parts
// The player's tank = the tank's own weapon (TANKS) scaled by the workshop cards. spec.dps = dmg * shells / cool, exported for the balance probe
function playerSpec(id, bare) { // bare: the tank without workshop cards (evolution card sprites)
  const base = SPECS.player, tk = TANKS[id || G.tank] || TANKS.std, up = bare ? {} : G.up, cal = up.caliber | 0, bar = up.barrel | 0, ld = up.loader | 0, F = firepower(up);
  const spec = Object.assign({}, base, {
    speed: base.speed * tk.speedMul * (1 + 0.1 * (up.engine | 0)), turn: base.turn * tk.turnMul, cool: tk.cool / (1 + 0.18 * ld),
    dmg: Math.max(tk.dmg, tk.dmg * F / (1 + 0.18 * ld)), fire: F, bW: tk.bW + 0.8 * cal, bR: tk.bR + 0.5 * cal, big: cal >= 2,
    bSpeed: tk.bSpeed * (1 + 0.15 * bar), barrel: tk.barrel + 3 * bar, life: tk.life, up: Object.assign({}, up),
    tankId: tk.id, muzzles: tk.muzzles, spread: tk.spread || 0, pellets: tk.pellets || 1, mode: tk.mode, kick: tk.kick, shape: tk.shape, tr: tk.tr || null, zoom: tk.zoom, col: tk.col
  });
  spec.dps = spec.dmg * tankShells(tk) / spec.cool;
  return spec;
}
function refreshPlayer() {
  const p = G.player; if (!p) return;
  p.spec = playerSpec(); p.maxHp = Math.round(100 * TANKS[G.tank].hpMul) + 20 * upL('armor'); p.hp = Math.min(p.hp, p.maxHp);
}
// Muzzle layouts for tanks without a muzzles list (enemies): one barrel, or the Komutan's three
const M_ONE = [{ off: 0, ang: 0 }], M_TRIPLE = [{ off: 0, ang: -0.2 }, { off: 0, ang: 0 }, { off: 0, ang: 0.2 }];
const FAN = [-0.16, 0, 0.16], NOFAN = [0];
function fireTank(t) {
  const s = t.spec, isP = t === G.player, m = G.map;
  if (TT.fire(t, { s, isP, m })) return; // hook (A): a tank trait may take over firing; false = normal path
  const muz = s.muzzles || (s.triple ? M_TRIPLE : M_ONE), fan = isP && G.buffs.triple > 0 ? FAN : NOFAN, np = isP ? (s.pellets | 0) || 1 : 1;
  const vol = isP ? ++t.volId : 0, volN = muz.length * fan.length * np; // volley id: shells of one volley share it (Ikiz stun)
  const big = !!s.big || s.bR >= 5.5, bl = isP ? upL('blast') : 0, splash = bl ? { r: bl > 1 ? 46 : 32, k: bl > 1 ? 0.75 : 0.5 } : null;
  const rail = isP && !!(s.tr && s.tr.pierce), pierce = isP && (G.buffs.pierce > 0 || rail), bounce = isP ? upL('ricochet') : 0;
  const look = !isP ? 'enemy' : rail ? 'rail' : pierce ? 'pierce' : splash ? 'blast' : bounce ? 'bounce' : 'player';
  for (const mz of muz) {
    const base = t.turret + (mz.ang || 0), o = mz.off || 0, mlen = mz.len || s.barrel;
    for (const f of fan) for (let q = 0; q < np; q++) {
      const a = base + f + (s.spread ? rand(-s.spread, s.spread) : 0);
      const ca = Math.cos(a), sa = Math.sin(a);
      const ox = t.x - sa * o, oy = t.y + ca * o;
      let bx = ox, by = oy, blocked = false;
      for (let d = 6; d <= mlen; d += 6) { bx = ox + ca * d; by = oy + sa * d; if (isWall(m.at(bx, by))) { blocked = true; break; } }
      const b = { x: bx, y: by, vx: ca * s.bSpeed, vy: sa * s.bSpeed, r: s.bR, owner: isP ? 0 : 1,
        dmg: isP ? s.dmg * (mz.dmgK || 1) : Math.max(1, Math.round(s.dmg * (G.mods ? G.mods.dmg : 1))), life: s.life || 2.4, big, dead: false,
        pierce, bounce, splash, look, hits: null, bricks: null,
        sx: bx, sy: by, dist: 0, bounced: false, // origin, path length so far, has ricocheted (read by packages A/B)
        vol, volN, pn: mz.pierceN | 0 }; // volley id / size, remaining limited tank penetrations
      synFlags(b); // hook (B): synergy flags on the new shell
      if (blocked) { hitTile(b, bx, by); if (splash) blastAt(b, bx, by, null); } else G.bullets.push(b);
      if (isP) G.shots++;
    }
  }
  t.recoil = 1;
  const ct = Math.cos(t.turret), st = Math.sin(t.turret);
  for (const mz of (isP && s.muzzles ? muz : M_ONE)) { // one puff per barrel; the Komutan's three barrels share one
    const o = mz.off || 0, ma = t.turret + (mz.ang || 0), cm = Math.cos(ma), sm = Math.sin(ma), ml = (mz.len || s.barrel) + 3;
    const mx = t.x - st * o + cm * ml, my = t.y + ct * o + sm * ml;
    addPart('fire', mx, my, cm * 60, sm * 60, 0.08, 14 + s.bW * 1.6, 40, 0);
    addPart('smoke', mx, my, cm * 40 + rand(-10, 10), sm * 40 + rand(-10, 10), rand(0.5, 0.8), 10 + s.bW, 28, 3);
  }
  const kick = s.kick === undefined ? 1.4 : s.kick;
  if (kick) moveTank(t, -ct * kick, -st * kick);
  t.lastShot = G.time;
  if (isP && s.tr && s.tr.zap) Sound.zap(); else Sound.shoot(isP, big, isP ? 1 : volAt(t.x, t.y)); // D2: Rayli has its own zap
}
/* ===== TANK TRAITS ===== */
// Owner: package A (tank traits); D1/D2 append. Every tank-specific spot is a `switch` marked `// D1:` (Uclu, Cift, Alev, Sarapnel) or `// D2:` (Rayli, Obus)
// that adds case lines; D1/D2 keep their code in named sub-blocks (`/* -- obus -- */`).
const TT = {
  // Called first by fireTank for every shot. true = the trait handled the shot itself (lob / flame), false = continue the normal fire path
  fire(t, ctx) {
    if (!ctx.isP) return false;
    const s = ctx.s, tr = s.tr;
    if (tr && tr.heatUp) { // Makineli: every shot heats the barrel; at 1 it overheats and the gun is locked for tr.cd seconds
      t.heat = Math.min(1, t.heat + tr.heatUp);
      if (t.heat >= 1) { t.overheatT = tr.cd; Sound.metal(1); }
    }
    switch (s.mode) {
      case 'lob': return TT_obus.fire(t, ctx);
      case 'flame': return true; // D1: Alev Topu: the cone is ticked in playerTick, no shells
      default: return false;
    }
  },
  // Cooldown multiplier for the next shot (Makineli: heat raises the fire rate)
  coolK(p) { const tr = p.spec.tr; return tr && tr.rateGain ? 1 / (1 + tr.rateGain * p.heat) : 1; },
  // True while the gun may not fire (Makineli overheat)
  locked(p) { return p.overheatT > 0; },
  // Once per frame for the player while the world runs. firing = the fire input is held
  playerTick(p, dt, firing) {
    const s = p.spec, tr = s.tr;
    if (tr && tr.heatUp) {
      if (p.overheatT > 0) {
        p.overheatT -= dt; p.smkT -= dt;
        if (p.smkT <= 0) { p.smkT = fxScale === 1 ? 0.07 : 0.16; const ml = s.barrel + 2; addPart('smoke', p.x + Math.cos(p.turret) * ml, p.y + Math.sin(p.turret) * ml, rand(-14, 14), rand(-30, -12), rand(0.5, 0.9), rand(7, 11), 24, 2); }
        if (p.overheatT <= 0) { p.overheatT = 0; p.heat = 0.25; }
      } else if (!firing && p.heat > 0) p.heat = Math.max(0, p.heat - tr.heatDown * dt);
    }
    if (p.pushT > 0) p.pushT = Math.max(0, p.pushT - dt);
    if (p.shield1T > 0 && G.phase === 'fight') p.shield1T = Math.max(0, p.shield1T - dt); // the transformation shield runs while enemies can shoot
    switch (s.tankId) {
      case 'alev': flameTick(p, dt, firing); break; // D1
      case 'cift': ciftTick(p, dt); break; // D1
    }
  },
  // While the workshop freezes the world: only the transformation flash runs
  frozenTick(rdt) { const p = G.player; if (p && p.evoT > 0) p.evoT = Math.max(0, p.evoT - rdt); },
  // Called by updateBullets before a shell moves. true = the trait moved the shell itself (lob shells skip walls and tanks while they fly)
  bulletStep(b, dt) {
    if (!b.lob) return false;
    const L = b.lob; L.t += dt;
    const k = Math.min(1, L.t / L.T);
    b.x = L.sx + (L.tx - L.sx) * k; b.y = L.sy + (L.ty - L.sy) * k; b.h = Math.sin(k * Math.PI); // b.h: arc height 0..1 for drawing
    b.dist = Math.hypot(b.x - L.sx, b.y - L.sy);
    if (k >= 1) {
      b.dead = true;
      switch (L.kind) {
        case 'obus': TT_obus.land(b, L); break;
        default: break;
      }
    }
    return true;
  },
  // A player shell hit enemy tank e (before the shell is marked dead and the damage applied)
  bulletHit(b, e) {
    const s = G.player && G.player.spec, tr = s && s.tr;
    if (tr && tr.stun && b.volN > 1 && b.vol) { // Ikiz: two shells of one volley hitting the same tank within tr.win stun it
      if (e.lastVol === b.vol && G.time - e.lastVolT <= tr.win && G.time >= (e.stunReadyT || 0)) { // stunReadyT: a stunned tank is not stunned again at once (tr.stunCd)
        e.stunT = tr.stun; e.lastVol = 0; e.stunReadyT = G.time + tr.stun + (tr.stunCd || 0);
        for (let k = 0; k < 7; k++) { const a = rand(0, TAU); addPart('spark', e.x, e.y, Math.cos(a) * 140, Math.sin(a) * 140, rand(0.25, 0.4), 1, 0, 3, '#ffe27a'); }
        addPart('ring', e.x, e.y, 0, 0, 0.3, 10, 90, 0, '255,226,122');
        addText(e.x, e.y - 30, 'Sersem', '#ffe27a', 14);
      } else { e.lastVol = b.vol; e.lastVolT = G.time; }
    }
    switch (s && s.tankId) {
      case 'sarapnel': sarapnelHit(b, e); break; // D1
      default: break;
    }
  }
};
/* -- uclu -- */
// Üçlü needs no code of its own: the three muzzles and the middle one's pierceN are data (TANKS.uclu); updateBullets handles b.pn.
/* -- cift -- */
// Çift Yön: every volley (p.volId changes) pushes the tank forward for tr.push seconds: speed x(1 + pushK) in updatePlayer plus a small impulse along the hull
function ciftTick(p, dt) {
  const tr = p.spec.tr;
  if (p.pv === undefined || p.volId < p.pv) p.pv = p.volId;
  if (p.volId !== p.pv) {
    p.pv = p.volId; p.pushT = tr.push;
    p.vx += Math.cos(p.angle) * tr.impulse; p.vy += Math.sin(p.angle) * tr.impulse;
    if (fxScale === 1) addPart('dust', p.x - Math.cos(p.angle) * 22, p.y - Math.sin(p.angle) * 22, -Math.cos(p.angle) * 40 + rand(-12, 12), -Math.sin(p.angle) * 40 + rand(-12, 12), rand(0.3, 0.5), rand(7, 11), 20, 2);
  }
}
const pushK = p => (p.pushT > 0 && p.spec.tr && p.spec.tr.pushK ? 1 + p.spec.tr.pushK * Math.min(1, p.pushT / p.spec.tr.push) : 1); // speed factor while a Çift Yön volley pushes
/* -- alev -- */
// Alev Topu: a flame cone, not shells. Enemies in the cone with a clear line take dps * direct quietly and burn for tr.burn s (burnDps = dps * burnK; tickStatus ticks it);
// enemy shells in the cone are destroyed; the Komutan burns at tr.bossK. Particle budget: 4 per frame (1 with low effects).
function inCone(ox, oy, a, R, half, x, y, r) {
  const dx = x - ox, dy = y - oy, d = Math.hypot(dx, dy);
  if (d - r > R) return false;
  if (d < r + 4) return true;
  return Math.abs(angDiff(a, Math.atan2(dy, dx))) <= half + Math.atan2(r * 0.7, d);
}
function flameTick(p, dt, firing) {
  const s = p.spec, tr = s.tr;
  p.flameOn = !!firing;
  if (!firing) { p.flameShotT = 0; p.flameSnd = 0; return; }
  p.lastShot = G.time;
  const a = p.turret, ca = Math.cos(a), sa = Math.sin(a), ox = p.x + ca * s.barrel * 0.7, oy = p.y + sa * s.barrel * 0.7;
  const dps = s.dps * (G.buffs.rapid > 0 ? 2 : 1);
  let touched = 0;
  for (const e of G.enemies) {
    if (e.dead || !inCone(ox, oy, a, tr.range, tr.half, e.x, e.y, e.r) || !los(p.x, p.y, e.x, e.y)) continue;
    touched++;
    const k = e.type === 'boss' ? tr.bossK : 1, fl = e.flash;
    hurtEnemy(e, dps * tr.direct * k * dt, e.x, e.y, 0, true);
    if (e.dead) continue;
    e.flash = fl; // no white flash every frame; the burn ticks flash it a little
    e.burnT = tr.burn; e.burnDps = dps * tr.burnK * k;
  }
  for (const b of G.bullets) { // enemy shells burn up in the flame
    if (b.dead || b.owner !== 1 || !inCone(ox, oy, a, tr.range, tr.half, b.x, b.y, b.r)) continue;
    b.dead = true; sparks(b.x, b.y, 4, '#ffb04a', 150);
  }
  p.flameShotT = (p.flameShotT || 0) - dt; if (p.flameShotT <= 0) { p.flameShotT = 0.25; G.shots++; if (touched || p.flameHit) G.hits++; p.flameHit = false; } // accuracy stays <= 100%: one shot per 0.25 s
  if (touched) p.flameHit = true;
  p.flameSnd = (p.flameSnd || 0) - dt; if (p.flameSnd <= 0) { p.flameSnd = 0.11; Sound.flame(); }
  const n = fxScale === 1 ? 4 : 1;
  for (let i = 0; i < n; i++) {
    const aa = a + rand(-tr.half, tr.half) * 0.9, v = rand(380, 500);
    addPart('fire', ox, oy, Math.cos(aa) * v, Math.sin(aa) * v, rand(0.22, 0.34), rand(9, 15), 22, 1.5);
  }
}
// Flame cone outline under the shells, and a glow on every burning enemy
function flameFx(p) {
  const tr = p.spec.tr;
  if (!p.flameOn) return;
  const a = p.turret, ox = p.x + Math.cos(a) * p.spec.barrel * 0.7, oy = p.y + Math.sin(a) * p.spec.barrel * 0.7;
  ctx.globalAlpha = fxScale === 1 ? 0.13 : 0.1; ctx.fillStyle = '#ff9a30';
  ctx.beginPath(); ctx.moveTo(ox, oy); ctx.arc(ox, oy, tr.range, a - tr.half, a + tr.half); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
}
function burnFx() {
  for (const e of G.enemies) {
    if (!(e.burnT > 0) || e.dead || !onScreen(e.x, e.y, 60)) continue;
    const f = 0.5 + 0.5 * Math.sin(G.time * 17 + e.id * 2), gs = e.r * 2.4;
    if (fxScale === 1) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.28 + 0.22 * f; ctx.drawImage(SPR.fire, e.x - gs / 2, e.y - gs / 2, gs, gs); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    else { ctx.globalAlpha = 0.3 + 0.2 * f; ctx.fillStyle = '#ff8a30'; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 0.8, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  }
}
/* -- sarapnel -- */
// Şarapnel: a pellet that hits a tank within tr.kbRange px of the muzzle shoves it along the pellet's path (impulse tr.kb / mass, capped at tr.kbMax / mass); tickStatus moves it
function sarapnelHit(b, e) {
  const tr = G.player.spec.tr;
  if (!tr || !tr.kb || b.dist > tr.kbRange) return;
  const sp = Math.hypot(b.vx, b.vy) || 1, m = e.spec.mass || 1;
  e.kvx += b.vx / sp * tr.kb / m; e.kvy += b.vy / sp * tr.kb / m;
  const v = Math.hypot(e.kvx, e.kvy), cap = tr.kbMax / m; if (v > cap) { e.kvx *= cap / v; e.kvy *= cap / v; }
}
/* -- rayli -- */
// Rayli Top (D2): a fast shell with pierce (fireTank sets it from tr.pierce; steel stops it unless Sekme is owned, see updateBullets) and a laser line showing its path
const TT_rayli = {
  // DDA over the tile grid from (x0, y0) along angle a: the first steel tile (or the world edge, which the map reports as steel) ends the line. Bricks and tanks do not.
  laser(x0, y0, a, maxLen) {
    const m = G.map, dx = Math.cos(a), dy = Math.sin(a), lim = maxLen || 4000;
    let c = Math.floor(x0 / T), r = Math.floor(y0 / T);
    if (m.get(c, r) === STEEL) return { x: x0, y: y0, steel: true, len: 0 };
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, tDx = dx !== 0 ? Math.abs(T / dx) : Infinity, tDy = dy !== 0 ? Math.abs(T / dy) : Infinity;
    let tMx = dx > 0 ? ((c + 1) * T - x0) / dx : dx < 0 ? (c * T - x0) / dx : Infinity, tMy = dy > 0 ? ((r + 1) * T - y0) / dy : dy < 0 ? (r * T - y0) / dy : Infinity;
    for (let i = 0; i < 400; i++) {
      let t;
      if (tMx < tMy) { t = tMx; tMx += tDx; c += sx; } else { t = tMy; tMy += tDy; r += sy; }
      if (t >= lim) return { x: x0 + dx * lim, y: y0 + dy * lim, steel: false, len: lim };
      if (m.get(c, r) === STEEL) return { x: x0 + dx * t, y: y0 + dy * t, steel: true, len: t };
    }
    return { x: x0 + dx * lim, y: y0 + dy * lim, steel: false, len: lim };
  },
  fx(p) {
    const s = p.spec, ca = Math.cos(p.turret), sa = Math.sin(p.turret), x0 = p.x + ca * (s.barrel + 1), y0 = p.y + sa * (s.barrel + 1);
    const L = this.laser(x0, y0, p.turret), pulse = 0.78 + 0.22 * Math.sin(G.time * 14);
    ctx.lineCap = 'butt';
    ctx.strokeStyle = 'rgba(10,28,52,.38)'; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(L.x, L.y); ctx.stroke(); // dark rim: reads on sand and snow
    if (fxScale === 1) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.16 * pulse; ctx.strokeStyle = '#7ef0ff'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(L.x, L.y); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; }
    ctx.globalAlpha = 0.9 * pulse; ctx.strokeStyle = '#46e4ff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(L.x, L.y); ctx.stroke();
    ctx.globalAlpha = 1; ctx.fillStyle = '#e8fdff'; ctx.strokeStyle = 'rgba(10,28,52,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(L.x, L.y, L.steel ? 3.4 : 2.4, 0, TAU); ctx.fill(); ctx.stroke(); // end mark
  }
};

/* -- obus -- */
// Obus (D2): mode 'lob'. The shell is thrown to p.aimDist along the turret, flies above everything (TT.bulletStep moves it) and lands with area damage.
const TT_obus = {
  area(s) { return s.tr.area * (1 + s.tr.blastK * upL('blast')); }, // Patlayici mermi: +25% per level. Delici and Sekme do nothing for a lob
  target(t, s) { // where the next shell will land
    const tr = s.tr, D = clamp(t.aimDist, tr.minD * T, tr.maxD * T), n = G.map.n, ca = Math.cos(t.turret), sa = Math.sin(t.turret);
    return { x: clamp(t.x + ca * D, T * 0.5, (n - 0.5) * T), y: clamp(t.y + sa * D, T * 0.5, (n - 0.5) * T) };
  },
  fire(t, ctx) {
    const s = ctx.s, tr = s.tr, ca = Math.cos(t.turret), sa = Math.sin(t.turret), sx = t.x + ca * s.barrel, sy = t.y + sa * s.barrel, g = this.target(t, s);
    const dist = Math.hypot(g.x - sx, g.y - sy), T0 = Math.max(tr.tMin, dist / tr.vFly), ang = Math.atan2(g.y - sy, g.x - sx);
    const b = { x: sx, y: sy, vx: Math.cos(ang) * tr.vFly, vy: Math.sin(ang) * tr.vFly, r: s.bR, owner: 0, dmg: s.dmg, life: T0 + 1, big: !!s.big, dead: false,
      pierce: false, bounce: 0, splash: null, look: 'lob', hits: null, bricks: null, sx, sy, dist: 0, bounced: false, vol: ++t.volId, volN: 1, pn: 0, h: 0,
      lob: { sx, sy, tx: g.x, ty: g.y, t: 0, T: T0, kind: 'obus', R: this.area(s) } };
    synFlags(b); b.bb = false; b.far = false; // Seken patlama / Uzak vuruş do not apply to a lob; Pusu (b.ambush) does, through synDmg
    G.bullets.push(b); G.shots++;
    t.recoil = 1; moveTank(t, -ca * s.kick, -sa * s.kick); t.lastShot = G.time;
    addPart('fire', sx + ca * 4, sy + sa * 4, ca * 60, sa * 60, 0.1, 20, 40, 0);
    for (let k = 0, nk = Math.max(2, Math.round(5 * fxScale)); k < nk; k++) addPart('smoke', sx + ca * 6, sy + sa * 6, ca * rand(30, 90) + rand(-18, 18), sa * rand(30, 90) + rand(-18, 18), rand(0.5, 0.9), rand(11, 17), 30, 3);
    Sound.shoot(true, true, 1); Sound.pop(1);
    return true;
  },
  land(b, L) { // area damage (full at the centre, tr.edge at the rim), bricks in reach take one hit, scorch decal, explosion
    const tr = TANKS.obus.tr, R = L.R, x = L.tx, y = L.ty, m = G.map;
    explode(x, y, 0.85 * R / 60);
    addPart('ring', x, y, 0, 0, 0.35, 8, (R - 8) / 0.35, 0, '255,210,90');
    let any = false;
    for (const e of G.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - x, e.y - y); if (d >= R + e.r) continue;
      any = true; hurtEnemy(e, b.dmg * (1 - (1 - tr.edge) * clamp(d / R, 0, 1)) * synDmg(b, e), e.x, e.y, Math.atan2(e.y - y, e.x - x));
    }
    if (any) G.hits++;
    const pseudo = { vx: 0, vy: 0, big: b.big };
    for (let r = Math.floor((y - R) / T); r <= Math.floor((y + R) / T); r++) for (let c = Math.floor((x - R) / T); c <= Math.floor((x + R) / T); c++) {
      if (m.get(c, r) !== BRICK) continue;
      const nx = clamp(x, c * T, c * T + T), ny = clamp(y, r * T, r * T + T);
      if ((nx - x) * (nx - x) + (ny - y) * (ny - y) <= R * R) hitTile(pseudo, c * T + T / 2, r * T + T / 2);
    }
    addDecals(m, [{ k: 'scorch', x, y, r: R * 0.8 }]);
  },
  ring(x, y, R, a, k) { // a landing mark: a dashed yellow ring with a dark rim and a cross; k (0..1) shrinks an inner ring for shells in flight
    ctx.setLineDash([]); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(255,210,74,.14)'; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(30,22,6,.6)'; ctx.lineWidth = 4.4; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 2.2; ctx.setLineDash([9, 6]); ctx.lineDashOffset = -G.time * 24; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(30,22,6,.6)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y); ctx.moveTo(x, y - 8); ctx.lineTo(x, y + 8); ctx.stroke();
    ctx.strokeStyle = '#fff2b0'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y); ctx.moveTo(x, y - 8); ctx.lineTo(x, y + 8); ctx.stroke();
    if (k !== undefined) { ctx.strokeStyle = '#fff2b0'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, R * (1 - k), 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
  },
  fx(p) {
    const s = p.spec, g = this.target(p, s);
    for (const b of G.bullets) if (b.lob && !b.dead) this.ring(b.lob.tx, b.lob.ty, b.lob.R, 0.55, clamp(b.lob.t / b.lob.T, 0, 1));
    this.ring(g.x, g.y, this.area(s), 0.95);
  },
  draw(b) { // in flight: a ground shadow, then the shell lifted by its arc height and drawn bigger (the 3 passes of drawBullets skip lobs)
    const h = b.h || 0, hy = b.y - h * TANKS.obus.tr.hgt, rr = b.r * (1 + 0.9 * h);
    ctx.fillStyle = 'rgba(0,0,0,.34)'; ctx.beginPath(); ctx.ellipse(b.x, b.y + 2, b.r * (1.5 - 0.35 * h), b.r * (1.5 - 0.35 * h) * 0.6, 0, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55; const gs = rr * 6; ctx.drawImage(SPR.fire, b.x - gs / 2, hy - gs / 2, gs, gs); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffd89a'; ctx.strokeStyle = 'rgba(40,24,6,.85)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(b.x, hy, rr, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8a5a1c'; ctx.beginPath(); ctx.arc(b.x - rr * 0.25, hy + rr * 0.25, rr * 0.45, 0, TAU); ctx.fill();
  }
};
// Enemy status effects, once per frame per enemy before its AI. Returns true while the tank is stunned (it stands still and holds fire, like Dondurucu).
// stunT: Ikiz.   kvx/kvy: knockback velocity (px/s, divided by mass where it is set), decays quickly.   burnT/burnDps: Alev Topu burn, ticks every 0.25 s.
function tickStatus(e, dt) {
  if (e.pt) partTick(e, dt); // 11: part damage timers
  if (e.kvx || e.kvy) { // D1: Sarapnel / Cift knockback
    moveTank(e, e.kvx * dt, e.kvy * dt);
    const k = Math.exp(-8 * dt); e.kvx *= k; e.kvy *= k;
    if (Math.abs(e.kvx) + Math.abs(e.kvy) < 6) e.kvx = e.kvy = 0;
  }
  if (e.burnT > 0) { // D1: Alev Topu burn
    e.burnT -= dt; e.burnTick -= dt;
    if (e.burnTick <= 0 && !e.dead) {
      e.burnTick = 0.25; hurtEnemy(e, e.burnDps * 0.25, e.x, e.y, 0, true);
      if (!e.dead && fxScale === 1) addPart('fire', e.x + rand(-8, 8), e.y + rand(-8, 8), rand(-10, 10), rand(-40, -15), rand(0.25, 0.45), rand(8, 14), 10, 2);
    }
  }
  if (e.stunT > 0) { e.stunT -= dt; return !e.dead; }
  return false;
}
function damageSmoke(t, dt) {
  if (t.hp / t.maxHp >= 0.35) return;
  t.smokeT -= dt;
  if (t.smokeT <= 0) { t.smokeT = 0.12; addPart('smoke', t.x + rand(-6, 6), t.y + rand(-6, 6), rand(-10, 10), rand(-10, 10), rand(0.8, 1.3), rand(10, 16), 22, 1.5); }
}
function separateTanks() {
  const list = G.player && G.player.alive ? [G.player, ...G.enemies] : G.enemies;
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j]; if (a.dead || b.dead) continue;
    const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r, dd = dx * dx + dy * dy;
    if (dd >= rr * rr) continue;
    const d = Math.sqrt(dd), push = rr - d, ma = a.spec.mass, mb = b.spec.mass, tot = ma + mb;
    const nx = d > 1e-4 ? dx / d : 1, ny = d > 1e-4 ? dy / d : 0;
    a.x -= nx * push * (mb / tot); a.y -= ny * push * (mb / tot);
    b.x += nx * push * (ma / tot); b.y += ny * push * (ma / tot);
    collideWalls(a); collideWalls(b);
  }
}

/* ================= particles, texts, effects ================= */
let MAX_PARTS = 520, fxScale = 1; // lowered by the "Efektler: Düşük" setting
function addPart(k, x, y, vx, vy, life, size, grow, drag, col) {
  if (parts.length >= MAX_PARTS) return;
  parts.push({ k, x, y, vx, vy, life, max: life, size, grow: grow || 0, drag: drag || 0, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 9, col });
}
function updateParticles(dt) {
  let j = 0;
  for (let i = 0; i < parts.length; i++) {
    const q = parts[i]; q.life -= dt; if (q.life <= 0) continue;
    const dr = Math.exp(-q.drag * dt); q.vx *= dr; q.vy *= dr;
    q.x += q.vx * dt; q.y += q.vy * dt; q.size += q.grow * dt; q.rot += q.vr * dt;
    parts[j++] = q;
  }
  parts.length = j;
}
function sparks(x, y, n, col, speed, dir, spread) {
  n = Math.max(2, Math.round(n * fxScale));
  for (let i = 0; i < n; i++) {
    const a = dir === undefined ? rand(0, TAU) : dir + rand(-spread, spread), s = rand(0.35, 1) * speed;
    addPart('spark', x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.14, 0.32), 1, 0, 5, col);
  }
}
function explode(x, y, pw) {
  addPart('flash', x, y, 0, 0, 0.14, 110 * pw, 0, 0);
  addPart('ring', x, y, 0, 0, 0.42, 12 * pw, 280 * pw, 0, '255,226,170');
  const sq = Math.sqrt(pw);
  for (let i = 0, n = Math.round((12 * pw + 5) * fxScale); i < n; i++) { const a = rand(0, TAU), s = rand(15, 140) * pw; addPart('fire', x + rand(-6, 6) * pw, y + rand(-6, 6) * pw, Math.cos(a) * s, Math.sin(a) * s, rand(0.3, 0.65), rand(14, 30) * sq, 34, 3.2); }
  for (let i = 0, n = Math.round((10 * pw + 4) * fxScale); i < n; i++) { const a = rand(0, TAU), s = rand(160, 420) * sq; addPart('spark', x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.25, 0.55), 1, 0, 3.5, '#ffd27a'); }
  for (let i = 0, n = Math.round((8 * pw + 4) * fxScale); i < n; i++) { const a = rand(0, TAU), s = rand(10, 60) * pw; addPart('smoke', x + rand(-10, 10) * pw, y + rand(-10, 10) * pw, Math.cos(a) * s, Math.sin(a) * s, rand(1.1, 2.2), rand(20, 34) * sq, 30, 1.6); }
  for (let i = 0, n = Math.round((6 * pw + 2) * fxScale); i < n; i++) { const a = rand(0, TAU), s = rand(90, 260) * sq; addPart('debris', x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.7, 1.3), rand(3, 6), 0, 3.4, '#2a2620'); }
  shake(9 * pw * prox(x, y));
  Sound.boom(pw, volAt(x, y));
}
function addText(x, y, s, col, size) { G.texts.push({ x, y, s, col, size: size || 15, life: 1.15, max: 1.15 }); }
function updateTexts(dt) {
  for (const q of G.texts) { q.life -= dt; q.y -= 24 * dt; }
  if (G.texts.some(q => q.life <= 0)) G.texts = G.texts.filter(q => q.life > 0);
}

/* ================= hits & damage ================= */
function hitTile(b, x, y) {
  const m = G.map, c = Math.floor(x / T), r = Math.floor(y / T);
  if (c < 0 || r < 0 || c >= m.n || r >= m.n) return;
  const i = r * m.n + c, v = m.t[i], vol = volAt(x, y);
  const sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp, uy = b.vy / sp, hx = x - ux * 4, hy = y - uy * 4, back = Math.atan2(-uy, -ux);
  if (v === BRICK) {
    m.hp[i] = Math.max(0, m.hp[i] - (b.big ? 2 : 1));
    for (let k = 0; k < 5; k++) { const a = back + rand(-1, 1), s = rand(60, 180); addPart('debris', hx, hy, Math.cos(a) * s, Math.sin(a) * s, rand(0.4, 0.8), rand(2.5, 4.5), 0, 4, m.theme.brick); }
    addPart('dust', hx, hy, -ux * 20, -uy * 20, 0.6, 16, 30, 2);
    if (m.hp[i] === 0) destroyBrick(m, c, r, vol); else { paintRegion(m, c - 1, r - 1, c + 1, r + 1); Sound.brick(vol); }
  } else if (v === STEEL) {
    sparks(hx, hy, 7, '#ffe3a1', 230, back, 1.3);
    Sound.metal(vol);
  }
}
function destroyBrick(m, c, r, vol) {
  const i = r * m.n + c; m.t[i] = EMPTY; m.hp[i] = 0; m.flowDirty = true;
  const x = c * T + T / 2, y = r * T + T / 2;
  for (let k = 0, nk = Math.round(12 * fxScale); k < nk; k++) { const a = rand(0, TAU), s = rand(50, 200); addPart('debris', x + rand(-14, 14), y + rand(-14, 14), Math.cos(a) * s, Math.sin(a) * s, rand(0.5, 1), rand(3, 6), 0, 3.5, k & 1 ? m.theme.brick : m.theme.brickDk); }
  for (let k = 0; k < 5; k++) addPart('dust', x + rand(-14, 14), y + rand(-14, 14), rand(-20, 20), rand(-20, 20), rand(0.7, 1.2), rand(22, 34), 26, 1.5);
  miniTile(m, c, r);
  addDecals(m, [{ k: 'rubble', x, y, r: T * 0.6, seed: randInt(1, 1e9) }]);
  Sound.crumble(vol);
}
const wreckOf = t => {
  const s = t.spec;
  return { k: 'wreck', x: t.x, y: t.y, a: t.angle, ta: t.turret - t.angle + rand(-0.7, 0.7), tox: rand(-7, 7), toy: rand(-7, 7),
    L: s.len, W: s.wid, tw: s.tread, tR: s.tR, bW: s.bW, barrel: s.barrel, r: s.len * 0.75 };
};
function hurtEnemy(e, dmg, x, y, dir, quiet) { // quiet: burn ticks and flame, no sparks or sound
  if (e.dead) return;
  if (e.isBoss) { bossHurt(e, dmg, x, y, dir, quiet); return; } // 11a: phases, parts, stun bonus
  e.hp -= dmg; e.flash = 0.1;
  if (!quiet) sparks(x, y, 6, '#ffd27a', 200, dir, 1.4);
  if (e.hp <= 0.001) { killEnemy(e); return; }
  if (!quiet) Sound.metal(volAt(e.x, e.y));
}
function damageEnemy(e, b) {
  hurtEnemy(e, b.dmg * synDmg(b, e), b.x, b.y, Math.atan2(-b.vy, -b.vx));
  if (!e.dead) { alertHit(e, b); partBreak(e, b); } // 11: a surviving enemy tank loses a part by the hit direction
}
// Explosive shells (Patlayıcı mermi): a small blast that hurts every other enemy tank in reach
function blastAt(b, x, y, skip) {
  const sp = splashFor(b); // hook (B): Seken patlama
  addPart('flash', x, y, 0, 0, 0.12, sp.r * 2.2, 0, 0);
  addPart('ring', x, y, 0, 0, 0.3, 6, sp.r * 3.3, 0, '255,170,90');
  for (let i = 0, n = Math.max(2, Math.round(5 * fxScale)); i < n; i++) { const a = rand(0, TAU), v = rand(30, 110); addPart('fire', x, y, Math.cos(a) * v, Math.sin(a) * v, rand(0.2, 0.4), rand(10, 18), 30, 3); }
  Sound.pop(volAt(x, y));
  for (const e of G.enemies) {
    if (e.dead || e === skip) continue;
    const rr = sp.r + e.r; if (dist2(x, y, e.x, e.y) < rr * rr) hurtEnemy(e, b.dmg * sp.k, e.x, e.y);
  }
}
function killEnemy(e) {
  if (e.dead) return;
  e.dead = true;
  const s = e.spec, pw = e.type === 'boss' ? 2.2 : e.type === 'heavy' ? 1.35 : 1;
  explode(e.x, e.y, pw);
  addDecals(G.map, [{ k: 'scorch', x: e.x, y: e.y, r: 34 * pw }, wreckOf(e)]);
  const pts = Math.round(s.score * G.D.score);
  G.score += pts; G.kills++;
  nukeOnKill(e); // hook (C): nuke meter
  addText(e.x, e.y - 12, '+' + fmt(pts), '#f2c14e', e.type === 'boss' ? 22 : 16);
  if (e.type === 'boss') {
    G.boss = null;
    if (e.isBoss) bossDefeated(e); // armour back to full, hazards gone (11a)
    else showBanner('KOMUTAN İMHA EDİLDİ', '+' + fmt(pts) + ' puan', 1.9);
    ['repair', 'shield', pick(['triple', 'rapid', 'pierce', 'freeze', 'air'])].forEach((k, i) => dropPickup(e.x + Math.cos(i * 2.1) * 26, e.y + Math.sin(i * 2.1) * 26, k, e.x, e.y));
    vibrate([40, 30, 80]);
  } else if (Math.random() < s.drop * G.mods.drop * (1 + 0.25 * upL('magnet'))) dropPickup(e.x, e.y);
}
function damagePlayer(b) {
  const p = G.player;
  if (G.god) return;
  if (G.buffs.shield > 0 || p.shield1T > 0) {
    for (let k = 0; k < 6; k++) { const a = rand(0, TAU); addPart('glow', b.x, b.y, Math.cos(a) * 90, Math.sin(a) * 90, 0.3, 12, 0, 4, 'blue'); }
    Sound.shield(); return;
  }
  p.hp -= b.dmg * synTaken(b); p.flash = 0.12; p.hurtT = G.time; G.hurt = 0.45; shake(7); Sound.hurt(); vibrate(35);
  sparks(b.x, b.y, 6, '#ffb08a', 200);
  if (p.hp <= 0) { p.hp = 0; killPlayer(); }
}
function killPlayer() {
  const p = G.player; p.alive = false; p.dead = true;
  explode(p.x, p.y, 1.8);
  addDecals(G.map, [{ k: 'scorch', x: p.x, y: p.y, r: 56 }, wreckOf(p)]);
  shake(16); vibrate([70, 40, 140]);
  G.phase = 'dying'; G.phaseT = 0; G.timeScale = 0.35;
  releaseInput();
}

/* ================= pickups ================= */
function dropPickup(x, y, kind, fx, fy) {
  const m = G.map;
  if (blocksTank(m.at(x, y))) { if (fx === undefined) return; x = fx; y = fy; }
  if (!kind) {
    const low = G.player && G.player.hp < G.player.maxHp * 0.45, w = [];
    let tot = 0;
    for (const k in PU) { if (PU[k].from > G.wave) continue; const v = k === 'repair' && low ? 5 : PU[k].w; w.push([k, v]); tot += v; }
    let r = Math.random() * tot; kind = 'repair';
    for (const [k, v] of w) { r -= v; if (r <= 0) { kind = k; break; } }
  }
  G.pickups.push({ x, y, kind, life: 14, t: 0, seed: Math.random() * 10 });
}
function applyPickup(k) {
  const p = G.player, P = PU[k.kind];
  if (k.kind === 'repair') { const amt = 35 + 10 * upL('boost'), h = Math.min(amt, p.maxHp - p.hp); p.hp = Math.min(p.maxHp, p.hp + amt); addText(p.x, p.y - 28, h > 0.5 ? '+' + Math.round(h) + ' zırh' : 'Zırh tam', P.col, 16); }
  else if (k.kind === 'air') { addText(p.x, p.y - 28, P.name, P.col, 16); callAirStrike(); }
  else {
    const d = P.dur * (1 + 0.25 * upL('boost'));
    G.buffs[k.kind] = d; G.buffMax[k.kind] = d;
    addText(p.x, p.y - 28, P.name, P.col, 16);
    if (k.kind === 'freeze') { addPart('ring', p.x, p.y, 0, 0, 0.6, 10, 700, 0, P.rgb); Sound.freeze(); }
    else if (k.kind === 'stealth') Sound.cloak();
  }
  G.score += Math.round(50 * G.D.score);
  addPart('ring', k.x, k.y, 0, 0, 0.4, 8, 110, 0, P.rgb);
  Sound.pickup(); vibrate(15);
  synPickup(k.kind); // hook (B)
}
function updatePickups(dt) {
  const p = G.player, mag = upL('magnet'), R = (2 + 2 * mag) * T;
  for (const k of G.pickups) {
    k.life -= dt; k.t += dt;
    if (!p || !p.alive) continue;
    const dx = p.x - k.x, dy = p.y - k.y, d = Math.hypot(dx, dy) || 1;
    if (G.phase === 'cleared') { const v = Math.min(d, 520 * dt); k.x += dx / d * v; k.y += dy / d * v; k.life = Math.max(k.life, 2); }
    else if (mag && d < R) { const v = Math.min(d, (180 + 150 * mag) * dt); k.x += dx / d * v; k.y += dy / d * v; k.life = Math.max(k.life, 1); }
    if (dist2(k.x, k.y, p.x, p.y) < (p.r + 15) * (p.r + 15)) { applyPickup(k); k.life = 0; }
  }
  if (G.pickups.some(k => k.life <= 0)) G.pickups = G.pickups.filter(k => k.life > 0);
}
// Hava saldırısı: a jet crosses the arena and bombs up to eight of the nearest enemies; with none around it waits for the next one
function callAirStrike() {
  const p = G.player;
  const list = G.enemies.filter(e => !e.dead).sort((a, b) => dist2(a.x, a.y, p.x, p.y) - dist2(b.x, b.y, p.x, p.y)).slice(0, 8);
  if (!list.length) { G.airQ++; return; }
  showBanner('HAVA SALDIRISI', list.length === 1 ? 'Hedef işaretlendi' : list.length + ' hedef işaretlendi', 1.5);
  G.jet = { t: 0, dur: 1.7, a: rand(0, TAU), x: p.x, y: p.y };
  list.forEach((e, i) => G.strikes.push({ e, x: e.x, y: e.y, t: -(0.5 + i * 0.12), dur: 0.8, done: false }));
  Sound.jet();
}
function updateStrikes(dt) {
  if (G.jet) { G.jet.t += dt; if (G.jet.t >= G.jet.dur) G.jet = null; }
  if (G.airQ > 0 && G.phase === 'fight' && G.enemies.some(e => !e.dead)) { G.airQ--; callAirStrike(); }
  if (!G.strikes.length) return;
  for (const q of G.strikes) {
    q.t += dt;
    if (q.e && !q.e.dead) { q.x = q.e.x; q.y = q.e.y; }
    if (q.t < q.dur || q.done) continue;
    q.done = true;
    explode(q.x, q.y, 1.05);
    addDecals(G.map, [{ k: 'scorch', x: q.x, y: q.y, r: 38 }]);
    for (const e of G.enemies) { if (e.dead) continue; const rr = 40 + e.r; if (dist2(q.x, q.y, e.x, e.y) < rr * rr) hurtEnemy(e, 3, e.x, e.y); }
  }
  G.strikes = G.strikes.filter(q => !q.done);
}
// Onarım robotu: repairs the hull after two seconds without taking a hit
function regen(p, dt) {
  const L = upL('repair');
  if (!L || G.phase !== 'fight' || p.hp >= p.maxHp || G.time - p.hurtT < 2) return;
  p.hp = Math.min(p.maxHp, p.hp + 0.5 * L * synRegen(p) * dt);
  p.fxT -= dt;
  if (p.fxT <= 0) { p.fxT = 0.45; addPart('glow', p.x + rand(-12, 12), p.y + rand(-12, 12), 0, -26, 0.55, 11, 0, 1, synRegenGlow(p)); }
}

/* ===== NUKE ===== */
// Owner: package C (nuclear bomb).
// Hooks called from shared code: nukeOnKill (killEnemy), nukeUpdate (updatePlay), nukeKey (keydown), nukeHud (updateHUD), drawNuke (render).
// Meter: every kill adds weight / (NUKE_WAVES * expected weight of a whole wave), so a wave of any size gives about 1/NUKE_WAVES of the meter.
const NUKE_WAVES = 3.5;                                                  // waves of kills to fill the meter (E tunes this)
const NUKE_WEIGHT = { basic: 1, fast: 1, hunter: 1.5, heavy: 2, boss: 3 }; // meter weight per enemy type
const NUKE_WARN = 1.2;      // seconds of warning (game time) before the blast
const NUKE_BOSS_CAP = 0.3;   // blast damage to a boss is at most this share of its max HP
const NUKE_BOSS_BASE = 150;  // blast damage to a boss up to wave 15
const NUKE_BOSS_PER_WAVE = 6; // extra blast damage to a boss per wave after wave 15
const NUKE_BOSS_FLOOR = 0.1; // a boss keeps at least this share of its max HP after the blast
// blast damage to a boss at wave w: 150 up to wave 15, +6 per wave after, never above 30% of the boss's max HP
const nukeBossDmg = (w, maxHp) => Math.min(NUKE_BOSS_CAP * maxHp, NUKE_BOSS_BASE + NUKE_BOSS_PER_WAVE * Math.max(0, w - 15));
const NUKE_BOSS_STUN = 3;   // seconds a boss is stunned
const NUKE_BOSS_FILL = 0.6; // share of a boss's max HP that, dealt as damage, fills the meter once (boss stage)
const NUKE_FLASH = 0.6;     // seconds the white flash fades
// expected total weight of wave w's roster; mirrors buildRoster without touching its random numbers
function nukeWaveWeight(w) {
  const W = NUKE_WEIGHT;
  if (w % 5 === 0) {
    const list = [];
    for (let i = 0, esc = 1 + Math.floor(w / 5); i < esc; i++) list.push(i % 2 && w >= G.D.fastFrom ? 'fast' : 'basic');
    if (w >= Math.max(20, G.D.hunterFrom)) list[list.length - 1] = 'hunter';
    if (w >= 20) { list[0] = 'heavy'; list[2] = 'hunter'; }
    list.push('boss');
    return list.reduce((a, t) => a + W[t], 0);
  }
  const D = G.D, total = clamp(Math.round((3 + w + Math.floor(w / 2)) * D.count), 3, 24 + Math.floor(Math.max(0, w - 20) / 2));
  const { pf, ph, pu } = typeShares(w);
  return total * (ph * W.heavy + pf * W.fast + pu * W.hunter + Math.max(0, 1 - ph - pf - pu) * W.basic);
}
const nukeFresh = m => ({ meter: clamp(+m || 0, 0, 1), warnT: 0, flashT: -1e9, firing: false, used: 0, hinted: false, bossAcc: 0, bossWave: 0 });
G.nuke = nukeFresh(0);
const nukeReady = () => G.nuke.meter >= 0.9999;
const nukeSave = () => +G.nuke.meter.toFixed(4);
function nukeReset(saved) { G.nuke = nukeFresh(saved); } // startGame: new run or resume
function nukeOnKill(e) {
  const n = G.nuke;
  if (n.firing || G.phase === 'dying' || !G.player || !G.player.alive) return; // blast kills and kills while dying do not count
  n.meter = Math.min(1, n.meter + NUKE_WEIGHT[e.type] / (NUKE_WAVES * nukeWaveWeight(G.wave)));
}
const nukeIsBoss = e => e.isBoss === true || e.type === 'boss';
// a living boss that takes no damage now (intro, phase transition, death scene): no blast may start
const nukeBossSafe = () => G.enemies.some(e => !e.dead && nukeIsBoss(e) && (e.invuln || e.invulnerable));
// boss-stage charging: the boss agent calls this from the boss damage path with the damage applied to the boss body.
// 60% of max HP dealt fills the meter once; at most one charge per fight (per wave). The blast's own damage never counts.
function nukeOnBossDamage(e, amount) {
  const n = G.nuke;
  if (n.firing || !(amount > 0) || !e || !(e.maxHp > 0) || G.phase === 'dying' || !G.player || !G.player.alive) return;
  if (n.bossWave !== G.wave) { n.bossWave = G.wave; n.bossAcc = 0; }
  const room = 1 - n.bossAcc; if (room <= 0) return;
  const add = Math.min(room, amount / (NUKE_BOSS_FILL * e.maxHp));
  n.bossAcc += add; n.meter = Math.min(1, n.meter + add);
}
G.nukeOnBossDamage = nukeOnBossDamage; // also reachable for tests (module 19 is not edited here)
// every living enemy on the whole map (not only the visible screen); the name stays because the debug API reads it
const nukeOnScreen = () => G.enemies.filter(e => !e.dead);
// true when the warning started; says why not (hint) when the player asked for it by hand
function nukeFire(manual) {
  const n = G.nuke, p = G.player;
  if (G.state !== 'play' || G.phase !== 'fight' || !p || !p.alive || n.warnT > 0) return false;
  if (!nukeReady()) { if (manual) showHint('Nükleer bomba %' + Math.floor(n.meter * 100) + ' şarjlı, kill yaparak doldur', 2); return false; }
  if (!nukeOnScreen().length) { if (manual) showHint('Haritada düşman yok', 2); return false; }
  if (nukeBossSafe()) { if (manual) showHint('Boss şu an hasar almıyor', 2); return false; } // the charge is kept
  n.warnT = NUKE_WARN;
  hintT = 0; el.hint.classList.remove('show'); // the "ready" hint is done
  showBanner('NÜKLEER BOMBA', '', NUKE_WARN);
  Sound.nukeWarn(); vibrate([40, 60, 40, 60, 40]);
  return true;
}
// the boss damage and stun of a blast: the floor applies at the moment of the hit; the stun bonus (+50%) does not apply to it
function nukeApplyBoss(b, want) {
  const n = G.nuke, dmg = Math.min(want, b.hp - NUKE_BOSS_FLOOR * b.maxHp); // never lethal, never below the floor
  const st = b.stunT || 0; b.stunT = 0;
  n.firing = true; // blast damage does not charge the meter
  if (dmg > 0) hurtEnemy(b, dmg, b.x, b.y, 0); // enrage checks still run
  n.firing = false;
  b.stunT = Math.max(st, NUKE_BOSS_STUN);
}
const nukeInvuln = b => !!(b.invuln || b.invulnerable);
function nukeBlast() {
  const n = G.nuke, p = G.player;
  n.firing = true; n.used++;
  const mods = G.mods, drop = mods.drop; mods.drop = 0; // no pickup drops from blast kills
  for (const e of G.enemies.slice()) if (!e.dead && !nukeIsBoss(e)) killEnemy(e); // the whole map, on or off screen
  mods.drop = drop;
  for (const b of G.enemies.slice()) {
    if (b.dead || !nukeIsBoss(b)) continue;
    const want = nukeBossDmg(G.wave, b.maxHp);
    if (nukeInvuln(b)) { b.nukePending = { want: (b.nukePending ? b.nukePending.want : 0) + want }; continue; } // invulnerable now: applied when it ends
    nukeApplyBoss(b, want);
  }
  G.bullets = G.bullets.filter(q => q.owner === 0);
  if (typeof bossClearHazards === 'function') bossClearHazards();
  n.firing = false; n.meter = 0; n.hinted = false; n.flashT = G.time;
  const mx = G.map.w / 2, my = G.map.h / 2, R = Math.hypot(G.map.w, G.map.h) * 0.75; // shockwave from the arena centre reaches every corner
  addPart('ring', mx, my, 0, 0, 0.9, 30, R, 0, '255,244,214');
  addPart('ring', mx, my, 0, 0, 1.3, 20, R * 0.8, 0, '255,170,90');
  shake(16); Sound.nuke(); vibrate([80, 40, 160, 40, 260]);
}
function nukeUpdate(dt) {
  const n = G.nuke, p = G.player;
  for (const b of G.enemies) { // blast damage that waited for an invulnerable boss: applied when its invulnerability ends
    if (!b.dead && b.nukePending && !nukeInvuln(b)) { const w = b.nukePending.want; b.nukePending = null; nukeApplyBoss(b, w); }
  }
  if (n.warnT > 0) {
    if (G.phase !== 'fight' || !p.alive) n.warnT = 0; // wave ended or player died during the warning: the charge is kept
    else if ((n.warnT -= dt) <= 0) { n.warnT = 0; nukeBlast(); }
  } else if (bot.on && bot.nuke && G.phase === 'fight' && p.alive && nukeReady()) {
    if (nukeOnScreen().length >= 3 || G.enemies.some(e => !e.dead && nukeIsBoss(e) && !e.invuln && !e.invulnerable)) nukeFire();
  }
}
function nukeKey(e) {
  if (e.code !== 'KeyN' || e.ctrlKey || e.metaKey || e.altKey) return false;
  if (G.state === 'play' && !e.repeat) nukeFire(true);
  return G.state === 'play';
}
el.btnNuke.addEventListener('click', e => { Sound.init(); Sound.resume(); nukeFire(true); e.currentTarget.blur(); });
function nukeHud() {
  const n = G.nuke, st = n.warnT > 0 ? 'w' : nukeReady() && !nukeBossSafe() ? 'r' : 'c', pct = Math.floor(n.meter * 100);
  const key = st + pct;
  if (ui.nk === key) return;
  const stChanged = ui.nkSt !== st; ui.nk = key; ui.nkSt = st;
  el.btnNuke.style.setProperty('--p', (n.meter).toFixed(3));
  if (stChanged) {
    el.btnNuke.classList.toggle('ready', st !== 'c');
    el.btnNuke.classList.toggle('warn', st === 'w');
    el.btnNuke.setAttribute('aria-label', st === 'c' ? 'Nükleer bomba, %' + pct + ' şarjlı' : st === 'r' ? 'Nükleer bomba hazır' : 'Nükleer bomba başlıyor');
    measureHud();
    if (st === 'r' && !n.hinted && G.phase === 'fight') { n.hinted = true; showHint(input.touch ? 'Nükleer bomba hazır: düğmeye dokun' : 'Nükleer bomba hazır: N tuşuna bas', 3.5); }
  }
}
function drawNuke() {
  if (G.state !== 'play' && G.state !== 'paused') return;
  const n = G.nuke, w = view.w, h = view.h;
  if (n.warnT > 0) { // pulsing red edge, faster as the blast nears
    const k = 1 - n.warnT / NUKE_WARN, a = (0.28 + 0.2 * Math.sin(G.time * (14 + 10 * k))) * (0.6 + 0.4 * k);
    const gr = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.68);
    gr.addColorStop(0, 'rgba(224,50,30,0)'); gr.addColorStop(1, `rgba(224,50,30,${clamp(a, 0.05, 0.75).toFixed(3)})`);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
  }
  const f = (G.time - n.flashT) / NUKE_FLASH;
  if (f >= 0 && f < 1 && SET.effects !== 'low' && !REDUCED) { ctx.fillStyle = `rgba(255,255,255,${(0.95 * (1 - f) * (1 - f)).toFixed(3)})`; ctx.fillRect(0, 0, w, h); }
}

/* ================= bullets ================= */
// Sekme: reflect off the face of the steel tile the shell just entered, then step back out of it
function ricochet(b, px, py) {
  const m = G.map, c0 = Math.floor(px / T), r0 = Math.floor(py / T), c1 = Math.floor(b.x / T), r1 = Math.floor(b.y / T);
  let fx = c1 !== c0 && isWall(m.get(c1, r0)), fy = r1 !== r0 && isWall(m.get(c0, r1));
  if (!fx && !fy) { fx = c1 !== c0; fy = r1 !== r0; }
  if (fx) b.vx = -b.vx;
  if (fy) b.vy = -b.vy;
  b.x = px; b.y = py; b.bounced = true; b.bounce--; b.life = Math.max(b.life, 0.9); b.seenBy = null; b.hits = null;
  sparks(px, py, 5, '#cfe8ff', 180); Sound.bounce(volAt(px, py));
}
function updateBullets(dt) {
  const m = G.map, p = G.player;
  for (const b of G.bullets) {
    if (b.dead) continue;
    b.life -= dt; if (b.life <= 0) { b.dead = true; continue; }
    if (TT.bulletStep(b, dt) || b.dead) continue; // hook (A): lob shells fly over everything and are moved by the trait
    b.dist += Math.hypot(b.vx, b.vy) * dt; // path length for packages A/B
    const steps = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * dt / 8));
    for (let k = 0; k < steps && !b.dead; k++) {
      const px = b.x, py = b.y;
      b.x += b.vx * dt / steps; b.y += b.vy * dt / steps;
      const v = m.at(b.x, b.y);
      if (isWall(v)) {
        if (v === BRICK && b.pierce) {
          // Delici mermi: damage each brick once and keep flying
          const i = Math.floor(b.y / T) * m.n + Math.floor(b.x / T);
          if (!b.bricks) b.bricks = [];
          if (!b.bricks.includes(i)) { b.bricks.push(i); hitTile(b, b.x, b.y); }
        } else if (v === STEEL && b.bounce > 0) { ricochet(b, px, py); continue; }
        else { hitTile(b, b.x, b.y); if (b.splash) blastAt(b, b.x, b.y, null); b.dead = true; break; }
      }
      if (b.owner === 0) {
        let hit = null;
        for (const e of G.enemies) {
          if (e.dead || (b.hits && b.hits.includes(e.id))) continue;
          const rr = e.r + b.r; if (dist2(b.x, b.y, e.x, e.y) < rr * rr) { hit = e; break; }
        }
        if (hit) {
          G.hits++;
          TT.bulletHit(b, hit); // hook (A): stun / knockback etc., before the shell is marked dead
          if (b.pierce || b.pn > 0) { (b.hits || (b.hits = [])).push(hit.id); if (!b.pierce) b.pn--; } else b.dead = true; // pn: a limited number of tank penetrations (Uclu)
          damageEnemy(hit, b);
          if (b.splash) blastAt(b, b.x, b.y, hit);
        }
      } else if (p && p.alive) {
        const rr = p.r + b.r + (G.buffs.shield > 0 || p.shield1T > 0 ? 8 : 0);
        if (dist2(b.x, b.y, p.x, p.y) < rr * rr) { b.dead = true; damagePlayer(b); }
      }
    }
  }
  for (const a of G.bullets) {
    if (a.dead || a.owner !== 0 || a.lob) continue; // lob shells fly above enemy shells
    for (const c of G.bullets) {
      if (c.dead || c.owner !== 1 || c.boss) continue; // boss shells are not shot down by the player's shells
      const rr = a.r + c.r + 3;
      if (dist2(a.x, a.y, c.x, c.y) < rr * rr) { c.dead = true; if (!a.pierce) a.dead = true; sparks((a.x + c.x) / 2, (a.y + c.y) / 2, 8, '#fff0c0', 200); Sound.metal(volAt(a.x, a.y)); if (a.dead) break; }
    }
  }
  if (G.bullets.some(b => b.dead)) G.bullets = G.bullets.filter(b => !b.dead);
}

/* ================= enemies ================= */
// Enemy pressure. Early waves (1-10) are the old ramp; after that nothing gets more HP, only sharper:
// fire rate, aim, lead, speed and damage keep creeping up slowly, and buildRoster adds heavies / Avcı / tanks alive at once.
// 1.5.3: with sight limited to the screen and the player's shells cut to ~14 tiles, tanks fire a little faster and truer to keep the pressure of 1.5.2
const SHARP = { cool: 0.88, err: 0.75 };
function waveMods(w) {
  const D = G.D, late = Math.max(0, w - 10), rn = removedN();
  const err0 = Math.max(0.035, 0.13 - (w - 1) * 0.010);
  return { speed: 1 + Math.min(0.3, (w - 1) * 0.03) + Math.min(0.3, late * 0.015), cool: Math.max(0.35, 1 - 0.05 * Math.min(9, w - 1) - 0.013 * late) * D.cool * (1 - 0.07 * rn) * SHARP.cool,
    err: Math.max(0.012, err0 - Math.max(0, w - 9) * 0.0008) * D.err * (1 - 0.1 * rn) * SHARP.err,
    lead: Math.min(0.85, (w - 1) * 0.14) + Math.min(0.15, Math.max(0, w - 7) * 0.01),
    dmg: D.dmg * (1 + Math.min(0.6, Math.max(0, w - 13) * 0.018) + Math.max(0, w - 25) * 0.04),
    dodge: Math.min(0.75, D.dodge + late * 0.005), // Avcı sidesteps more of the player's shells as waves go on
    drop: Math.max(0.5, 1 - late * 0.02), // supplies thin out: fewer power-ups (shields!) from late-wave wrecks
    pace: Math.max(0.25, 1 - late * 0.015 - Math.max(0, w - 25) * 0.02), // spawn interval factor: reinforcements arrive faster in late waves
    hp: 1 + Math.min(0.75, Math.max(0, w - 6) * D.hpGrow) + Math.max(0, w - 20) * 0.09 };
}
// Region rule (docs/BOSSES.md section 9): a defeated boss takes its enemy types out of the rest of the run. G.beaten holds the ids of the bosses beaten in this run (13 waveCleared).
// A boss wave still played by the stand-in Komutan records 'komutan', which removes nothing.
const REGION_BAN = { sari: ['fast'], demirkok: ['heavy', 'tamirci'], kiragi: ['hunter'] };
const REGION_NAME = { fast: 'Keşif tankları', heavy: 'Ağır tanklar', tamirci: 'Tamirciler', hunter: 'Avcılar' };
const typeBanned = type => { for (const id of G.beaten) { const l = REGION_BAN[id]; if (l && l.includes(type)) return true; } return false; };
const regionGone = id => (REGION_BAN[id] || []).map(t => REGION_NAME[t]); // names removed by boss id
// Share of Hızlı / Ağır / Avcı / Tamirci among normal-wave tanks. Each type is absent before its first wave (RULES.fastFrom / heavyFrom / hunterFrom / tamirciFrom), then grows slowly; a beaten boss's types stay at 0.
// Thinner waves after a region change are made up with numbers and sharper fire, never with HP: +12% tanks, -7% reload time, -10% aim error per removed type
const removedN = () => ['fast', 'heavy', 'hunter', 'tamirci'].filter(typeBanned).length;
function typeShares(w) {
  const D = G.D, ok = t => !typeBanned(t);
  return {
    pf: ok('fast') && w > D.fastFrom ? Math.min(0.28, 0.04 + 0.02 * (w - D.fastFrom)) - Math.max(0, w - 20) * 0.005 : 0,
    ph: ok('heavy') && w > D.heavyFrom ? Math.min(0.45, 0.04 + 0.02 * (w - D.heavyFrom)) : 0,
    pu: ok('hunter') && w > D.hunterFrom ? Math.min(0.5, 0.04 + 0.03 * (w - D.hunterFrom)) : 0,
    pt: ok('tamirci') && w > D.tamirciFrom ? Math.min(0.15, 0.03 + 0.015 * (w - D.tamirciFrom)) : 0 };
}
function buildRoster(w) {
  const D = G.D, list = [];
  if (w % 5 === 0) return { list: ['boss'], maxAlive: 1 }; // boss stage: only the boss on the field, no escorts (startBossStage spawns it)
  const rk = 1 + 0.12 * removedN(), total = clamp(Math.round((3 + w + Math.floor(w / 2)) * D.count * rk), 3, Math.round((20 + Math.floor(Math.max(0, w - 20) / 3)) * rk));
  const { pf, ph, pu, pt } = typeShares(w);
  for (let i = 0; i < total; i++) { const r = Math.random(); list.push(r < ph ? 'heavy' : r < ph + pf ? 'fast' : r < ph + pf + pu ? 'hunter' : r < ph + pf + pu + pt ? 'tamirci' : 'basic'); }
  shuffle(list);
  // a type's first wave: exactly one of it (the roster above has none yet), placed a little way into the wave; never for a type the region rule removed
  const first = w === D.fastFrom ? 'fast' : w === D.heavyFrom ? 'heavy' : w === D.hunterFrom ? 'hunter' : w === D.tamirciFrom ? 'tamirci' : null;
  if (first && !typeBanned(first)) list[Math.min(list.length - 1, first === 'tamirci' ? 3 : 1 + Math.floor(Math.random() * 2))] = first;
  const alive = Math.min(6, 3 + Math.ceil(w / 2)) + (w > 12 ? Math.min(6, 1 + Math.floor((w - 13) / 5)) : 0) + D.alive;
  return { list, maxAlive: Math.min(D.maxAlive, alive) };
}
/* ================= awareness: enemies only know where the player was last seen / heard ================= */
// e.lk = last-known player position {x, y, t}; e.goal = where the tank is walking now (lk, then search points around it, or a patrol point while it knows nothing); e.tf = its own flow field to that goal.
// Sight: SIGHT tiles (about the visible screen) inside a cone of CONE (full angle) around the turret, plus a 360-degree NEAR radius; a tank that already sees the player keeps seeing him (its turret tracks him).
// A shot is heard within HEAR tiles (error HEAR_ERR); a hit tells the target only the direction the shell came from (HIT_BACK tiles back along its path, error HIT_ERR) and turns its turret that way.
// Silence for HINT_T s: one or two tanks get a coarse hint (circle of HINT_R tiles around the player, HINT_R2 after HINT_T2 s) so a hidden passive player is still found. New tanks patrol (toward the map centre). Boss and Tamirci have their own logic.
const AWARE = { sight: 8.5, near: 2.5, cone: 2.1, hear: 6, hearErr: 3, hitBack: 5, hitErr: 2, hintT: 15, hintT2: 30, hintR: 7, hintR2: 4, searchMin: 2, searchMax: 6, reach: 0.9 };
function setLk(e, x, y, err) {
  const a = rand(0, TAU), r = err ? rand(0.3, 1) * err * T : 0, m = G.map, n = m.n;
  let px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
  if (blocksTank(m.at(px, py))) { px = x; py = y; }
  e.lk = { x: clamp(px, T * 1.5, (n - 1.5) * T), y: clamp(py, T * 1.5, (n - 1.5) * T), t: G.time };
  e.goal = null; e.sn = 0; e.search = false; e.lookA = Math.atan2(e.lk.y - e.y, e.lk.x - e.x); e.lookT = 1.5;
}
function hintAt(e, p) { // a coarse idea: somewhere within hintR tiles of the player (on a free tile); closer once the silence has gone on
  const R = (G.time - G.contactT > AWARE.hintT2 ? AWARE.hintR2 : AWARE.hintR) * T;
  for (let k = 0; k < 8; k++) {
    const a = rand(0, TAU), r = Math.sqrt(Math.random()) * R, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
    if (!blocksTank(G.map.at(x, y))) { setLk(e, x, y, 0); e.hintT = G.time; return; }
  }
  setLk(e, p.x, p.y, 2); e.hintT = G.time;
}
function alertHit(e, b) { // a player's shell hit e: it knows the direction the shot came from, not the shooter's position
  if (b.owner !== 0 || e.dead || e.isBoss || e.type === 'boss' || e.spec.medic) return;
  const sp = Math.hypot(b.vx, b.vy) || 1, back = AWARE.hitBack * T;
  setLk(e, e.x - b.vx / sp * back, e.y - b.vy / sp * back, AWARE.hitErr); G.contactT = G.time;
  if (e.spec.smart && b.sx !== undefined && Math.hypot(b.sx - e.x, b.sy - e.y) > 7 * T) { // Avcı: a hit from far away sends it to cover for a moment
    e.mode = 'cover'; e.path = null; e.coverT = 1.8; e.coverFar = true; G.covers++;
  }
}
function patrolSpot(e) { // a free tile 6-18 tiles away, the map centre favoured (not the player)
  const m = G.map, n = m.n, mid = n * T / 2; let best = null, bs = 1e9;
  for (let k = 0; k < 10; k++) {
    const a = rand(0, TAU), r = rand(6, 18) * T, x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r, c = Math.floor(x / T), rr = Math.floor(y / T);
    if (c < 2 || rr < 2 || c > n - 3 || rr > n - 3 || blocksTank(m.get(c, rr))) continue;
    const sc = Math.hypot(x - mid, y - mid) / T * 0.2 + Math.random() * 9;
    if (sc < bs) { bs = sc; best = { c, r: rr, x: c * T + T / 2, y: rr * T + T / 2 }; }
  }
  return best;
}
function sees(e, p, fov) { // sight check from e toward the player: range (hidden / stealth shorten it), cone around the turret, line of sight
  const d = Math.hypot(p.x - e.x, p.y - e.y);
  const hid = G.map.at(p.x, p.y) === BUSH && G.time - p.lastShot > 1.2, rng = G.buffs.stealth > 0 ? T * 1.6 : hid ? T * 2.3 : T * (AWARE.sight + (fov || 0));
  if (d >= rng) return false;
  if (!e.canSee && d > AWARE.near * T && Math.abs(angDiff(e.turret, Math.atan2(p.y - e.y, p.x - e.x))) > AWARE.cone / 2) return false;
  return los(e.x, e.y, p.x, p.y);
}
function searchSpot(e) { // a free tile 2-6 tiles around the last-known spot: bushes and corners preferred, away from other searchers' goals
  const m = G.map, n = m.n, lk = e.lk; let best = null, bs = 1e9;
  for (let k = 0; k < 16; k++) {
    const a = rand(0, TAU), r = rand(AWARE.searchMin, AWARE.searchMax) * T, x = lk.x + Math.cos(a) * r, y = lk.y + Math.sin(a) * r;
    const c = Math.floor(x / T), rr = Math.floor(y / T);
    if (c < 1 || rr < 1 || c > n - 2 || rr > n - 2 || blocksTank(m.get(c, rr))) continue;
    const cx = c * T + T / 2, cy = rr * T + T / 2;
    let sc = Math.random() * 1.2 + (m.get(c, rr) === BUSH ? -3 : 0);
    let walls = 0; for (const [dx, dy] of DIRS) if (blocksTank(m.get(c + dx, rr + dy))) walls++;
    if (walls >= 2) sc -= 1.5;
    for (const o of G.enemies) if (o !== e && !o.dead && o.goal && dist2(o.goal.x, o.goal.y, cx, cy) < (3 * T) * (3 * T)) sc += 4;
    if (sc < bs) { bs = sc; best = { c, r: rr, x: cx, y: cy }; }
  }
  return best;
}
function setGoal(e, g) {
  e.goal = g; e.goalT = G.time; if (!g) return;
  const n = G.map.n; if (!e.tf || e.tf.length !== n * n) e.tf = new Float32Array(n * n);
  dijkstra(G.map, clamp(Math.floor(g.y / T), 0, n - 1) * n + clamp(Math.floor(g.x / T), 0, n - 1), e.tf, null);
}
function updateAware(e, dt) { // called after the sense step; fills e.lk / e.goal / e.tf for an enemy that cannot see the player
  const p = G.player, now = G.time;
  if (!p.alive) return;
  if (G.contactT === undefined) G.contactT = now;
  if (e.lookT > 0) e.lookT -= dt || 0;
  if (e.canSee) { e.lk = { x: p.x, y: p.y, t: now }; e.goal = null; e.sn = 0; e.search = false; e.patrol = false; G.contactT = now; return; }
  if (e.heardShot !== p.lastShot && now - p.lastShot < 0.3 && Math.hypot(p.x - e.x, p.y - e.y) < AWARE.hear * T) { // heard (or saw the flash of) a shot: a position with a big error
    e.heardShot = p.lastShot; setLk(e, p.x, p.y, AWARE.hearErr); e.patrol = false; G.contactT = now;
  }
  if (now - Math.max(G.contactT, G.silT || 0) > AWARE.hintT && now - (e.hintT || -99) > 3) { // long silence: one or two tanks get a coarse hint
    hintAt(e, p); e.patrol = false; G.hintN = (G.hintN || 0) + 1;
    if (G.hintN >= 2 || G.enemies.filter(o => !o.dead && !o.spec.medic && o.type !== 'boss').length < 2) { G.silT = now; G.hintN = 0; }
  }
  if (e.goal && now - e.goalT > 14) e.goal = null;
  if (e.goal && dist2(e.goal.x, e.goal.y, e.x, e.y) < (AWARE.reach * T) * (AWARE.reach * T)) { if (e.search) e.sn++; e.search = true; e.goal = null; }
  if (!e.goal) {
    if (!e.lk) { const g = patrolSpot(e); e.patrol = true; if (g) setGoal(e, g); }
    else if (!e.search) setGoal(e, { c: Math.floor(e.lk.x / T), r: Math.floor(e.lk.y / T), x: e.lk.x, y: e.lk.y });
    else { const g = searchSpot(e); if (g) setGoal(e, g); else e.search = false; }
    e.wp = null;
  }
}
const fieldFor = (e, seenField) => e.canSee ? seenField : (e.goal && e.tf ? e.tf : null); // the flow field an enemy follows: the real one only while it sees the player

function chooseSpawn() {
  const p = G.player, m = G.map;
  const free = m.spawns.filter(s => !G.portals.some(q => q.x === s.x && q.y === s.y) && !G.enemies.some(e => dist2(e.x, e.y, s.x, s.y) < 44 * 44));
  let c = free.filter(s => dist2(s.x, s.y, p.x, p.y) > (T * 6) * (T * 6));
  if (!c.length) c = free.filter(s => dist2(s.x, s.y, p.x, p.y) > (T * 3) * (T * 3));
  if (!c.length) return null;
  const off = c.filter(s => !onScreen(s.x, s.y, T));
  const pool = off.length ? off : c;
  // late waves: reinforcements come out of the nearest hatches instead of any hatch
  if (G.wave > 20) pool.sort((a, b) => dist2(a.x, a.y, p.x, p.y) - dist2(b.x, b.y, p.x, p.y));
  return G.wave > 20 ? pool[Math.floor(Math.random() * Math.min(3, pool.length))] : pick(pool);
}
const NEW_FOE = {
  fast: ['tankArena.seenFast', 'Yeni düşman: Hızlı. Küçük ve çevik, hızla yaklaşır ama az dayanır.'],
  heavy: ['tankArena.seenHeavy', 'Yeni düşman: Ağır. Yavaş ama çok sağlam, çift namlu ateş eder.'],
  hunter: ['tankArena.seenHunter', 'Yeni düşman: Avcı. Yakından gelen mermiden kaçar, uzaktan vurulunca siper alır; ateş etmeden önce yeşil hedef ışığı yakar.'],
  tamirci: ['tankArena.seenTamirci', 'Yeni düşman: Tamirci. Silahı yok; yanındaki tankları onarır. Önce onu vur.'] };
function spawnEnemy(type, x, y) {
  if (type === 'boss') { // debug / old paths: a boss in an ordinary wave (no phases, no stage)
    const a = Math.atan2(G.player.y - y, G.player.x - x), e = spawnBoss(bossDefAt(G.wave) || BOSS_DEFS.komutan, x, y, a);
    addPart('ring', x, y, 0, 0, 0.4, 10, 120, 0, '224,83,58'); return e;
  }
  const e = makeTank(type, x, y), p = G.player;
  const a = Math.atan2(G.map.n * T / 2 - y, G.map.n * T / 2 - x); // a new tank faces the map centre (it knows nothing of the player)
  e.angle = Math.round(a / (Math.PI / 2)) * (Math.PI / 2); e.turret = e.angle;
  e.cool = rand(0.9, 1.7) * G.mods.cool; e.speedMul = G.mods.speed; e.coolMul = G.mods.cool; e.aimErr = rand(-G.mods.err, G.mods.err);
  if (G.mods.hp > 1) e.hp = e.maxHp = Math.max(1, Math.round(e.spec.hp * G.mods.hp)); // later waves bring tougher tanks
  if (!(G.contactT <= G.time)) G.contactT = G.time; // no hint: a new tank patrols until it sees or hears something
  G.enemies.push(e);
  const intro = NEW_FOE[type];
  if (intro && !store.get(intro[0], false)) { store.set(intro[0], true); showHint(intro[1], 6); }
  for (let k = 0; k < 10; k++) { const an = rand(0, TAU), sp = rand(30, 90); addPart('dust', x, y, Math.cos(an) * sp, Math.sin(an) * sp, rand(0.5, 0.9), rand(16, 26), 26, 3); }
  addPart('ring', x, y, 0, 0, 0.4, 10, 120, 0, '224,83,58');
}
function updateSpawns(dt) {
  G.spawnTimer -= dt;
  if (G.queue.length && G.enemies.length + G.portals.length < G.maxAlive && G.spawnTimer <= 0) {
    const sp = chooseSpawn();
    if (sp) {
      let ty = G.queue.shift();
      if (ty === 'tamirci' && G.enemies.filter(o => o.type === 'tamirci').length + G.portals.filter(q => q.type === 'tamirci').length >= 2) ty = 'basic'; // at most two Tamirci on the field
      if (ty === 'hunter' && G.enemies.filter(o => o.type === 'hunter').length + G.portals.filter(q => q.type === 'hunter').length >= RULES.maxHunters) ty = 'basic'; // and a few Avcı at once
      G.portals.push({ x: sp.x, y: sp.y, t: 0, dur: 1.15, type: ty, done: false }); G.spawnTimer = rand(0.7, 1.5) * G.mods.pace; Sound.spawn(volAt(sp.x, sp.y));
    } else G.spawnTimer = 0.25;
  }
  const p = G.player;
  for (const q of G.portals) {
    q.t += dt;
    if (q.t >= q.dur) {
      const blocked = (p.alive && dist2(q.x, q.y, p.x, p.y) < 40 * 40) || G.enemies.some(e => dist2(q.x, q.y, e.x, e.y) < 38 * 38);
      if (!blocked) { spawnEnemy(q.type, q.x, q.y); q.done = true; }
    } else if (Math.random() < dt * 10) {
      const a = rand(0, TAU); addPart('dust', q.x + Math.cos(a) * 26, q.y + Math.sin(a) * 26, -Math.cos(a) * 40, -Math.sin(a) * 40, 0.5, 10, 10, 1);
    }
  }
  if (G.portals.some(q => q.done)) G.portals = G.portals.filter(q => !q.done);
}
function updateEnemy(e, dt) {
  const s = e.spec, p = G.player, m = G.map;
  if (s.smart) { updateHunter(e, dt); return; }
  if (s.medic) { updateTamirci(e, dt); return; }
  e.cool -= dt; e.flash = Math.max(0, e.flash - dt); e.recoil = Math.max(0, e.recoil - dt * 6);
  e.hidden = m.at(e.x, e.y) === BUSH;
  e.senseT -= dt;
  if (e.senseT <= 0) {
    e.senseT = 0.1 + Math.random() * 0.08;
    if (p.alive) {
      e.distP = Math.hypot(p.x - e.x, p.y - e.y); e.canSee = sees(e, p, 0);
    } else e.canSee = false;
  }
  updateAware(e, dt);
  const wantMove = !(e.canSee && e.distP < s.hold * T);
  e.blast = null;
  let tx = 0, ty = 0, hasT = false;
  if (wantMove) {
    if (!e.wp || dist2(e.wp.x, e.wp.y, e.x, e.y) < 25) { const f = fieldFor(e, G.map.flow); e.wp = f ? nextWaypoint(e, f) : null; e.wpBest = 1e9; e.stuckT = 0; }
    if (e.wp) {
      const v = m.get(e.wp.c, e.wp.r);
      if (v === BRICK) e.blast = e.wp;
      else if (blocksTank(v)) e.wp = null;
      else { tx = e.wp.x; ty = e.wp.y; hasT = true; }
    }
  }
  const before = e.angle, ox = e.x, oy = e.y, trB = !!e.pt && e.pt.tread > 0, jam = !!e.pt && e.pt.barrel > 0, pk = e.pt && e.pt.engine > 0 ? 0.5 : 1; // part damage: broken tread / jammed barrel / damaged engine
  if (hasT && !trB) {
    const desired = Math.atan2(ty - e.y, tx - e.x);
    e.angle = turnTo(e.angle, desired, s.turn * dt);
    const diff = Math.abs(angDiff(e.angle, desired));
    const spd = diff < 0.55 ? s.speed * e.speedMul * pk * (1 - diff * 0.9) : 0;
    moveTank(e, Math.cos(e.angle) * spd * dt, Math.sin(e.angle) * spd * dt);
    const dw = Math.hypot(tx - e.x, ty - e.y);
    if (dw < e.wpBest - 0.5) { e.wpBest = dw; e.stuckT = 0; } else e.stuckT += dt;
    if (e.stuckT > 1.2) { e.wp = randomNeighbor(e); e.wpBest = 1e9; e.stuckT = 0; }
  } else if (e.blast && !trB) {
    e.angle = turnTo(e.angle, Math.atan2(e.blast.y - e.y, e.blast.x - e.x), s.turn * dt);
  }
  if (dt > 0) { e.avx = (e.x - ox) / dt; e.avy = (e.y - oy) / dt; }
  trackUpdate(e, (e.x - ox) * Math.cos(e.angle) + (e.y - oy) * Math.sin(e.angle), angDiff(before, e.angle));
  let aim = null, may = false;
  if (e.canSee && p.alive) {
    const tt = e.distP / s.bSpeed * G.mods.lead;
    aim = Math.atan2(p.y + p.avy * tt - e.y, p.x + p.avx * tt - e.x) + e.aimErr;
    may = onFireView(e.x, e.y, T * 0.3);
  } else if (e.blast) { aim = Math.atan2(e.blast.y - e.y, e.blast.x - e.x); may = true; }
  if (e.type === 'boss') e.chargeT = e.canSee && p.alive && e.cool < 0.55 ? e.chargeT + dt : 0; // Komutan's barrels glow while charging
  if (aim !== null) {
    e.turret = turnTo(e.turret, aim, s.tTurn * dt);
    if (may && e.cool <= 0 && !jam && Math.abs(angDiff(e.turret, aim)) < 0.07 && (e.type !== 'boss' || !e.canSee || e.chargeT >= 0.45)) {
      fireTank(e); e.cool = s.cool * e.coolMul * rand(0.85, 1.25); e.aimErr = rand(-G.mods.err, G.mods.err);
      if (e.type === 'boss') e.chargeT = 0;
    }
  } else e.turret = turnTo(e.turret, e.lookT > 0 ? e.lookA : e.angle, s.tTurn * 0.6 * dt);
  damageSmoke(e, dt);
}

/* ================= Avcı: the smart tank ================= */
// Sidestep a player shell that is on course to hit; each shell gets one roll against the difficulty's dodge chance
const DODGE = { fromT: 5.5, seeT: 4.5 }; // only shells fired within 5.5 tiles, and only once within 4.5 tiles of the Avcı, can be dodged
function checkDodge(e) {
  const m = G.map;
  for (const b of G.bullets) {
    if (b.dead || b.owner !== 0) continue;
    const v2 = b.vx * b.vx + b.vy * b.vy; if (!v2) continue;
    const t = ((e.x - b.x) * b.vx + (e.y - b.y) * b.vy) / v2;
    if (t < 0.1 || t > 0.55) continue; // too late to react / not yet in view
    if (b.sx !== undefined && Math.hypot(b.sx - e.x, b.sy - e.y) > DODGE.fromT * T) continue; // fired from far away: the Avcı cannot dodge it
    if (Math.hypot(b.x - e.x, b.y - e.y) > DODGE.seeT * T) continue;
    const cx = b.x + b.vx * t - e.x, cy = b.y + b.vy * t - e.y, hit = e.r + b.r + 6;
    if (cx * cx + cy * cy > hit * hit) continue;
    if (!b.seenBy) b.seenBy = [];
    if (b.seenBy.includes(e.id)) continue;
    b.seenBy.push(e.id);
    if (Math.random() > G.mods.dodge) continue;
    const sp = Math.sqrt(v2), nx = -b.vy / sp, ny = b.vx / sp, side = cx * nx + cy * ny;
    for (const sg of side > 0 ? [-1, 1] : [1, -1]) {
      if (blocksTank(m.at(e.x + nx * sg * (e.r + 30), e.y + ny * sg * (e.r + 30)))) continue;
      e.dodge = { x: nx * sg, y: ny * sg, t: 0.3 }; e.dodgeCd = 0.85; G.dodges++;
      for (let k = 0; k < 4; k++) addPart('dust', e.x - nx * sg * 10 + rand(-6, 6), e.y - ny * sg * 10 + rand(-6, 6), -nx * sg * 40, -ny * sg * 40, 0.5, 14, 20, 3);
      return;
    }
  }
}
// Nearest reachable tile the player cannot see (bushes preferred); returns the tile path from the hunter's tile
function findCover(e, radius) {
  const m = G.map, n = m.n, p = G.player, kp = e.canSee ? p : e.lk; // the player's position as the Avcı knows it
  const c0 = clamp(Math.floor(e.x / T), 0, n - 1), r0 = clamp(Math.floor(e.y / T), 0, n - 1), s0 = r0 * n + c0;
  const prev = new Map([[s0, -1]]), q = [[s0, 0]];
  let best = -1, bestScore = 1e9;
  for (let h = 0; h < q.length; h++) {
    const [i, d] = q[h], c = i % n, r = (i - c) / n, x = c * T + T / 2, y = r * T + T / 2;
    const dp = p.alive && kp ? Math.hypot(kp.x - x, kp.y - y) / T : 9;
    const exposed = p.alive && kp && dp < 14 && los(x, y, kp.x, kp.y);
    const taken = G.enemies.some(o => o !== e && !o.dead && dist2(o.x, o.y, x, y) < 30 * 30);
    const score = d * 1.2 + (exposed ? 100 : 0) + (dp < 2.5 ? 30 : 0) + (taken ? 20 : 0) + (m.t[i] === BUSH ? -1.5 : 0) + Math.abs(dp - 5) * 0.3;
    if (score < bestScore) { bestScore = score; best = i; }
    if (d >= radius) continue;
    for (const [dx, dy] of DIRS) {
      const xx = c + dx, yy = r + dy; if (blocksTank(m.get(xx, yy))) continue;
      const k = yy * n + xx; if (prev.has(k)) continue;
      prev.set(k, i); q.push([k, d + 1]);
    }
  }
  if (best < 0 || bestScore >= 100) return null;
  const path = [];
  for (let k = best; k !== -1; k = prev.get(k)) path.push(k);
  path.reverse();
  return path.map(k => { const c = k % n, r = (k - c) / n; return { c, r, x: c * T + T / 2, y: r * T + T / 2 }; });
}
function updateHunter(e, dt) {
  const s = e.spec, p = G.player, m = G.map;
  e.cool -= dt; e.flash = Math.max(0, e.flash - dt); e.recoil = Math.max(0, e.recoil - dt * 6); e.dodgeCd = Math.max(0, e.dodgeCd - dt);
  e.hidden = m.at(e.x, e.y) === BUSH;
  e.senseT -= dt;
  if (e.senseT <= 0) {
    e.senseT = 0.08 + Math.random() * 0.04;
    if (p.alive) {
      e.distP = Math.hypot(p.x - e.x, p.y - e.y); e.canSee = sees(e, p, 0.5);
      if (e.canSee) { e.seenX = p.x; e.seenY = p.y; e.seenT = G.time; e.reconDone = false; }
    } else e.canSee = false;
    if (!e.dodge && e.dodgeCd <= 0) checkDodge(e);
  }
  updateAware(e, dt);
  // modes: hunt (sneak in and shoot), cover (duck out of sight while reloading), retreat (once, when badly hurt)
  if (!e.fled && e.hp <= 1 && e.maxHp > 1) { e.fled = true; e.mode = 'retreat'; e.modeT = 3; e.path = null; }
  if (e.mode === 'retreat') { e.modeT -= dt; if (e.modeT <= 0) { e.mode = 'hunt'; e.path = null; } }
  else if (e.mode === 'cover') { e.coverT = Math.max(0, (e.coverT || 0) - dt); if ((e.cool <= 0.3 && e.coverT <= 0) || !p.alive) { e.mode = 'hunt'; e.path = null; e.coverFar = false; } }
  else if (e.canSee && G.time - e.lastShot < 0.25 && e.cool > 0.7) { e.mode = 'cover'; e.path = null; G.covers++; }

  const before = e.angle, ox = e.x, oy = e.y, trB = !!e.pt && e.pt.tread > 0, jam = !!e.pt && e.pt.barrel > 0, pk = e.pt && e.pt.engine > 0 ? 0.5 : 1; // part damage
  let goal = null;
  e.blast = null;
  if (trB) e.dodge = null;
  if (e.dodge) {
    e.dodge.t -= dt;
    const sp = s.speed * 1.6 * e.speedMul * pk;
    moveTank(e, e.dodge.x * sp * dt, e.dodge.y * sp * dt);
    if (e.dodge.t <= 0) { e.dodge = null; e.wp = null; e.path = null; }
  } else if (e.mode === 'cover' || e.mode === 'retreat') {
    e.pathT -= dt;
    if (!e.path || e.pathT <= 0) {
      e.path = findCover(e, e.mode === 'retreat' || e.coverFar ? 6 : 4); e.pathI = 1; e.pathT = 0.7;
      if (!e.path && e.mode === 'cover') e.mode = 'hunt';
    }
    if (e.path && e.pathI < e.path.length) {
      const wp = e.path[e.pathI];
      if (dist2(wp.x, wp.y, e.x, e.y) < 30) e.pathI++; else goal = wp;
    }
  } else if (!(e.canSee && e.distP < s.hold * T)) {
    if (!e.wp || dist2(e.wp.x, e.wp.y, e.x, e.y) < 25) { { const f = fieldFor(e, m.sflow); e.wp = f ? nextWaypoint(e, f) : null; } e.wpBest = 1e9; e.stuckT = 0; }
    if (e.wp) {
      const v = m.get(e.wp.c, e.wp.r);
      if (v === BRICK) e.blast = e.wp; else if (blocksTank(v)) e.wp = null; else goal = e.wp;
    }
  }
  if (goal && !trB) {
    const desired = Math.atan2(goal.y - e.y, goal.x - e.x);
    e.angle = turnTo(e.angle, desired, s.turn * dt);
    const diff = Math.abs(angDiff(e.angle, desired));
    const spd = diff < 0.6 ? s.speed * e.speedMul * pk * (1 - diff * 0.8) : 0;
    moveTank(e, Math.cos(e.angle) * spd * dt, Math.sin(e.angle) * spd * dt);
    const dw = Math.hypot(goal.x - e.x, goal.y - e.y);
    if (dw < e.wpBest - 0.5) { e.wpBest = dw; e.stuckT = 0; } else e.stuckT += dt;
    if (e.stuckT > 1) { e.wp = randomNeighbor(e); e.path = null; e.wpBest = 1e9; e.stuckT = 0; }
  } else if (e.blast && !trB) e.angle = turnTo(e.angle, Math.atan2(e.blast.y - e.y, e.blast.x - e.x), s.turn * dt);
  if (dt > 0) { e.avx = (e.x - ox) / dt; e.avy = (e.y - oy) / dt; }
  trackUpdate(e, (e.x - ox) * Math.cos(e.angle) + (e.y - oy) * Math.sin(e.angle), angDiff(before, e.angle));

  // turret: full lead on a visible player, one shot into the spot where it lost the player, or a brick in the way
  let aim = null, may = false;
  if (e.canSee && p.alive) {
    const tt = e.distP / s.bSpeed;
    let tx = p.x + p.avx * tt, ty = p.y + p.avy * tt;
    if (!los(e.x, e.y, tx, ty)) { tx = p.x; ty = p.y; }
    aim = Math.atan2(ty - e.y, tx - e.x) + e.aimErr * 0.3;
    may = onFireView(e.x, e.y, T * 0.3);
  } else if (p.alive && !e.reconDone && G.time - e.seenT < 2.2 && dist2(e.x, e.y, e.seenX, e.seenY) < (T * 9) * (T * 9) && los(e.x, e.y, e.seenX, e.seenY)) {
    aim = Math.atan2(e.seenY - e.y, e.seenX - e.x);
    may = onFireView(e.x, e.y, T * 0.3);
  } else if (e.blast) { aim = Math.atan2(e.blast.y - e.y, e.blast.x - e.x); may = true; }
  e.lock = false;
  if (aim !== null) {
    e.turret = turnTo(e.turret, aim, s.tTurn * dt);
    const off = Math.abs(angDiff(e.turret, aim));
    e.lock = e.canSee && may && e.cool < 0.45 && off < 0.3;
    if (may && e.cool <= 0 && !jam && off < 0.06) {
      fireTank(e);
      e.cool = s.cool * e.coolMul * rand(0.9, 1.15);
      e.aimErr = rand(-G.mods.err, G.mods.err);
      if (!e.canSee && !e.blast) e.reconDone = true;
    }
  } else e.turret = turnTo(e.turret, e.lookT > 0 ? e.lookA : e.angle, s.tTurn * 0.6 * dt);
  damageSmoke(e, dt);
}


/* ================= parça hasarı (docs/BOSSES.md section 2) ================= */
// A shell hit that does not kill breaks a part by the direction it came from (against the hull): side -> tread (cannot move), front -> barrel (cannot fire), rear -> engine (half speed).
// e.pt = { tread, barrel, engine: seconds left broken; imm: seconds of immunity after the repair; dur: the repair time (ring); side }. Boss treads and barrels: 11a.
const PART_T = { tread: 1.5, barrel: 1.2, engine: 1.8, imm: 1.5, fast: 1.3, fastFrom: 20 }, PART_NAME = { tread: 'Palet kırıldı', barrel: 'Namlu tutukluk', engine: 'Motor hasarlı' };
const partSeen = {};
function partWorld(e, k) { // world position of a part: tread (the broken side), barrel (muzzle), engine (rear deck)
  const s = e.spec, ca = Math.cos(e.angle), sa = Math.sin(e.angle);
  if (k === 'barrel') return { x: e.x + Math.cos(e.turret) * s.barrel, y: e.y + Math.sin(e.turret) * s.barrel };
  const lx = k === 'engine' ? -s.len / 2 : 0, ly = k === 'tread' ? (e.pt.side ? 1 : -1) * (s.wid / 2 - s.tread / 2) : 0;
  return { x: e.x + ca * lx - sa * ly, y: e.y + sa * lx + ca * ly };
}
// Parts break by accumulated damage, not chance or wave: hits from one direction add up per part (e.pt.acc) and the part breaks at PART_HP damage (a fixed amount, not a share of max HP).
const PART_HP = 2;
function partBreak(e, b) { // called from damageEnemy: a direct shell of the player hit tank e and did not kill it
  if (e.dead || e.isBoss || e.type === 'boss' || b.owner !== 0 || b.lob || G.boss === e) return;
  if (b.vol && e.pvol === b.vol) return; // the other shells of one volley (Ikiz, Uclu, Sarapnel) count once
  e.pvol = b.vol;
  const a = angDiff(e.angle, Math.atan2(-b.vy, -b.vx)), aa = Math.abs(a); // direction towards the shooter, against the hull
  const k = aa < 0.785 ? 'barrel' : aa > 2.356 ? 'engine' : 'tread';
  if (k === 'barrel' && e.spec.medic) return; // the Tamirci has no barrel to jam
  const pt = e.pt || (e.pt = { tread: 0, barrel: 0, engine: 0, imm: { tread: 0, barrel: 0, engine: 0 }, acc: { tread: 0, barrel: 0, engine: 0 }, dur: { tread: 0, barrel: 0, engine: 0 }, side: 0, fx: 0 });
  if (pt[k] > 0 || pt.imm[k] > 0) return;
  pt.acc[k] += b.dmg || 1;
  if (pt.acc[k] < PART_HP) return;
  pt.acc[k] = 0;
  pt[k] = pt.dur[k] = PART_T[k] / (G.wave > PART_T.fastFrom ? PART_T.fast : 1);
  if (k === 'tread') pt.side = a > 0 ? 1 : 0;
  const q = partWorld(e, k), vl = volAt(e.x, e.y);
  if (k === 'tread') {
    for (let i = 0, n = Math.max(3, Math.round(7 * fxScale)); i < n; i++) { const an = rand(0, TAU), v = rand(40, 170); addPart('debris', q.x + rand(-8, 8), q.y + rand(-8, 8), Math.cos(an) * v, Math.sin(an) * v, rand(0.7, 1.3), rand(3, 5.5), 0, 3.4, i & 1 ? '#4b473e' : '#1f1d19'); }
    sparks(q.x, q.y, 9, '#ffd27a', 240);
  } else if (k === 'barrel') { sparks(q.x, q.y, 8, '#ffb04a', 220); for (let i = 0; i < 3; i++) addPart('smoke', q.x, q.y, rand(-20, 20), rand(-30, -8), rand(0.6, 1), rand(10, 15), 22, 2); }
  else { for (let i = 0, n = Math.max(2, Math.round(5 * fxScale)); i < n; i++) addPart('smoke', q.x + rand(-4, 4), q.y + rand(-4, 4), rand(-40, 10) - Math.cos(e.angle) * 20, rand(-30, 5), rand(0.8, 1.4), rand(12, 20), 26, 1.6, 'k'); sparks(q.x, q.y, 5, '#ffb04a', 160); }
  Sound.metal(vl);
  if (!partSeen[k]) { partSeen[k] = true; addText(e.x, e.y - e.r - 12, PART_NAME[k], '#ffd27a', 13); }
}
function partTick(e, dt) { // timers, repair, smoke; once per frame per enemy (tickStatus)
  const pt = e.pt;
  pt.fx -= dt; const fx = pt.fx <= 0; if (fx) pt.fx = 0.1;
  for (const k of ['tread', 'barrel', 'engine']) {
    if (pt[k] > 0) {
      pt[k] -= dt;
      if (pt[k] <= 0) { // repaired: a spark burst and a ring, then 1.5 s immune
        pt[k] = 0; pt.imm[k] = PART_T.imm; const q = partWorld(e, k);
        sparks(q.x, q.y, 5, '#fff0b0', 150); addPart('ring', q.x, q.y, 0, 0, 0.3, 4, 40, 0, '255,230,150');
      } else if (fx) {
        const q = partWorld(e, k);
        if (k === 'tread') { if (Math.random() < 0.5) addPart('spark', q.x, q.y, rand(-60, 60), rand(-90, -20), rand(0.15, 0.3), 1, 0, 4, '#ffb04a'); }
        else if (k === 'barrel') addPart('smoke', q.x, q.y, rand(-8, 8), rand(-30, -14), rand(0.7, 1.1), rand(8, 13), 20, 1.5);
        else if (fxScale === 1 || Math.random() < 0.5) addPart('smoke', q.x, q.y, rand(-10, 10) - Math.cos(e.angle) * 22, rand(-30, -12), rand(0.8, 1.3), rand(10, 16), 24, 1.5, 'k');
      }
    } else if (pt.imm[k] > 0) pt.imm[k] -= dt;
  }
}

/* ================= Tamirci (docs/BOSSES.md section 9) ================= */
// No weapon. Picks the most damaged ally within 6 tiles, stays 2-4 tiles behind it (ally between it and the player, bush preferred), beams it green: +0.5 HP/s and broken parts fixed at once.
// One Tamirci per target. While beaming and 1 s after, it is not hidden by a bush. It runs when the player is within 4 tiles and sees it.
NUKE_WEIGHT.tamirci = 1; // meter weight (10 is not edited here)
const TAM = { pick: 6, flee: 4, beam: 4.8, heal: 0.5, vis: 1 };
const partsBroken = o => !!o.pt && (o.pt.tread > 0 || o.pt.barrel > 0 || o.pt.engine > 0);
const needOf = o => (1 - o.hp / o.maxHp) + (partsBroken(o) ? 0.6 : 0);
function tamTarget(e) { // most damaged ally in reach that no other Tamirci is already beaming
  let best = null, bs = 0.001;
  for (const o of G.enemies) {
    if (o === e || o.dead || o.isBoss || o.type === 'boss' || o.type === 'tamirci' || dist2(o.x, o.y, e.x, e.y) > (T * TAM.pick) * (T * TAM.pick)) continue;
    if (o.repBy && o.repBy !== e.id && G.time - o.repT < 0.5) continue;
    const n = needOf(o) + (e.tam === o ? 0.15 : 0); // a small bonus keeps the current target
    if (n > bs) { bs = n; best = o; }
  }
  return best;
}
function tamFollow(e) { // nobody hurt: trail the nearest ally
  let best = null, bd = (T * 9) * (T * 9);
  for (const o of G.enemies) { if (o === e || o.dead || o.isBoss || o.type === 'boss' || o.type === 'tamirci') continue; const d = dist2(o.x, o.y, e.x, e.y); if (d < bd) { bd = d; best = o; } }
  return best;
}
function tamSpot(e, a) { // a tile 2-4 tiles from ally a, on the far side from the player, with a clear line to a; bushes and spots out of the player's sight score higher
  const m = G.map, p = G.player, dx = a.x - p.x, dy = a.y - p.y, dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl;
  let best = null, bs = -1e9;
  for (let k = 0; k < 16; k++) for (const rad of [2.2 * T, 3 * T, 3.8 * T]) {
    const an = k * TAU / 16, x = a.x + Math.cos(an) * rad, y = a.y + Math.sin(an) * rad, v = m.at(x, y);
    if (blocksTank(v) || !los(x, y, a.x, a.y)) continue;
    const behind = ((x - a.x) * ux + (y - a.y) * uy) / rad, dP = Math.hypot(x - p.x, y - p.y);
    const sc = behind * 2.5 + (v === BUSH ? 1.2 : 0) + (!los(x, y, p.x, p.y) ? 0.6 : 0) - Math.hypot(x - e.x, y - e.y) / T * 0.25 - (dP < TAM.flee * T ? 3 : 0);
    if (sc > bs) { bs = sc; best = { x, y }; }
  }
  return best;
}
function tamSteer(e, gx, gy, dt, k) { // turn towards (gx, gy) and drive; returns true when it made progress
  const s = e.spec, desired = Math.atan2(gy - e.y, gx - e.x), pk = e.pt && e.pt.engine > 0 ? 0.5 : 1;
  e.angle = turnTo(e.angle, desired, s.turn * dt * 1.4);
  const diff = Math.abs(angDiff(e.angle, desired)), spd = diff < 0.7 ? s.speed * e.speedMul * pk * k * (1 - diff * 0.7) : 0;
  moveTank(e, Math.cos(e.angle) * spd * dt, Math.sin(e.angle) * spd * dt);
}
function tamFlee(e) { // best of 16 headings: away from the player, not into a wall
  const m = G.map, p = G.player; let best = null, bs = -1e9;
  for (let k = 0; k < 16; k++) {
    const an = k * TAU / 16, c = Math.cos(an), sn = Math.sin(an);
    if (blocksTank(m.at(e.x + c * 34, e.y + sn * 34)) || blocksTank(m.at(e.x + c * 70, e.y + sn * 70))) continue;
    const away = (e.x - p.x) * c + (e.y - p.y) * sn, sc = away / Math.max(1, e.distP) * 3 + (m.at(e.x + c * 70, e.y + sn * 70) === BUSH ? 0.8 : 0) - Math.abs(angDiff(e.angle, an)) * 0.4;
    if (sc > bs) { bs = sc; best = an; }
  }
  return best;
}
function updateTamirci(e, dt) {
  const s = e.spec, p = G.player, m = G.map;
  e.flash = Math.max(0, e.flash - dt); e.recoil = 0; e.cool = 9; e.vis = Math.max(0, (e.vis || 0) - dt); e.spotT = (e.spotT || 0) - dt;
  e.senseT -= dt;
  if (e.senseT <= 0) {
    e.senseT = 0.1 + Math.random() * 0.08;
    if (p.alive) { const d = Math.hypot(p.x - e.x, p.y - e.y); e.distP = d; e.canSee = d < T * AWARE.sight && los(e.x, e.y, p.x, p.y); } else { e.canSee = false; e.distP = 1e9; }
  }
  const trB = !!e.pt && e.pt.tread > 0, before = e.angle, ox = e.x, oy = e.y;
  const hurt = tamTarget(e), a = hurt || tamFollow(e);
  e.tam = hurt;
  // lone: no other tank alive or still to come (only Tamirciler left). After 2 s it stops running and hiding and creeps up to the player's area, so the wave can end without a chase
  const lone = !G.enemies.some(o => o !== e && !o.dead && o.type !== 'tamirci') && !G.queue.some(t => t !== 'tamirci') && !G.portals.some(q => q.type !== 'tamirci');
  e.loneT = lone ? (e.loneT || 0) + dt : 0;
  const seen = p.alive && e.canSee && e.distP < TAM.flee * T && (m.at(e.x, e.y) !== BUSH || e.vis > 0 || e.distP < 2 * T);
  if (!trB) {
    if (e.loneT > 2) { // approach to about 5.5 tiles, never closer than the flee radius
      if (p.alive && (e.distP === undefined || e.distP > 5.5 * T)) tamSteer(e, p.x, p.y, dt, 0.55);
    } else if (seen) { // run
      if (e.fleeT === undefined || e.fleeT <= 0) { e.fleeA = tamFlee(e); e.fleeT = 0.25; }
      e.fleeT -= dt;
      if (e.fleeA !== null && e.fleeA !== undefined) tamSteer(e, e.x + Math.cos(e.fleeA) * 80, e.y + Math.sin(e.fleeA) * 80, dt, 1.05);
    } else if (a) {
      if (!e.spot || e.spotT <= 0 || e.spotFor !== a.id) { e.spot = tamSpot(e, a); e.spotT = 0.5; e.spotFor = a.id; }
      const sp = e.spot;
      if (sp && Math.hypot(sp.x - e.x, sp.y - e.y) > 12) {
        tamSteer(e, sp.x, sp.y, dt, 1);
        const dw = Math.hypot(sp.x - e.x, sp.y - e.y);
        if (dw < (e.wpBest || 1e9) - 0.5) { e.wpBest = dw; e.stuckT = 0; } else e.stuckT += dt;
        if (e.stuckT > 0.9) { const w = randomNeighbor(e); e.spot = w; e.spotT = 0.7; e.wpBest = 1e9; e.stuckT = 0; }
      } else { e.wpBest = 1e9; e.stuckT = 0; }
    } else { // alone: drift towards the player's side of the map, but keep out of sight range
      if (!e.wp || dist2(e.wp.x, e.wp.y, e.x, e.y) < 25) { updateAware(e, 0); const f = e.goal && e.tf ? e.tf : null; e.wp = f ? nextWaypoint(e, f) : null; e.wpBest = 1e9; e.stuckT = 0; }
      if (e.wp && !blocksTank(m.get(e.wp.c, e.wp.r)) && !(e.canSee && e.distP < 7 * T)) {
        tamSteer(e, e.wp.x, e.wp.y, dt, 0.8);
        const dw = Math.hypot(e.wp.x - e.x, e.wp.y - e.y);
        if (dw < e.wpBest - 0.5) { e.wpBest = dw; e.stuckT = 0; } else e.stuckT += dt;
        if (e.stuckT > 1.2) { e.wp = randomNeighbor(e); e.wpBest = 1e9; e.stuckT = 0; }
      } else if (e.wp && blocksTank(m.get(e.wp.c, e.wp.r))) e.wp = null;
    }
  }
  // the beam
  let beam = null;
  if (hurt && needOf(hurt) > 0 && Math.hypot(hurt.x - e.x, hurt.y - e.y) < TAM.beam * T && los(e.x, e.y, hurt.x, hurt.y)) beam = hurt;
  if (beam) {
    beam.repBy = e.id; beam.repT = G.time; e.vis = TAM.vis; e.beamUntil = G.time + 0.12; e.beamOn = beam;
    beam.hp = Math.min(beam.maxHp, beam.hp + TAM.heal * dt);
    if (beam.pt) for (const k of ['tread', 'barrel', 'engine']) if (beam.pt[k] > 0) { // broken part: fixed at once, then the usual short immunity
      beam.pt[k] = 0; beam.pt.imm[k] = PART_T.imm; const q = partWorld(beam, k);
      sparks(q.x, q.y, 6, '#bfffa8', 160); addPart('ring', q.x, q.y, 0, 0, 0.35, 4, 44, 0, '150,255,140');
    }
    if (Math.random() < dt * 9) addPart('spark', beam.x + rand(-10, 10), beam.y + rand(-8, 8), rand(-15, 15), rand(-70, -30), rand(0.3, 0.55), 1, 0, 3, '#9dff90');
  } else e.beamOn = null;
  e.hidden = m.at(e.x, e.y) === BUSH && e.vis <= 0 && !(e.loneT > 2);
  const ta = beam ? Math.atan2(beam.y - e.y, beam.x - e.x) : e.angle;
  e.turret = turnTo(e.turret, ta, s.tTurn * dt);
  if (dt > 0) { e.avx = (e.x - ox) / dt; e.avy = (e.y - oy) / dt; }
  trackUpdate(e, (e.x - ox) * Math.cos(e.angle) + (e.y - oy) * Math.sin(e.angle), angDiff(before, e.angle));
  damageSmoke(e, dt);
}
/* ================= boss framework ================= */
// Data-driven boss stage (docs/BOSSES.md section 1). A boss is an enemy with isBoss = true, a def from BOSS_DEFS (11b registers Komutan; later bosses add
// their own def with the same fields), phases (HP thresholds in %), parts with their own HP and a list of attacks written as generators.
// Boss waves: arena + intro + fight with only the boss on the field (nextWave -> startBossStage).

// Region themes: 10-wave blocks (Çöl, Orman, Kar, Şehir, then again)
const themeFor = w => THEMES[Math.floor((w - 1) / 10) % THEMES.length];

/* ---- fixed arenas (21x21 text maps: S steel, B brick, W water, G bush, . empty, X boss start, P player start) ---- */
const ARENAS = {
  kisla: { name: 'Kışla', gate: [[9, 3], [10, 3], [11, 3]], rows: [
    'SS...BBBB...BBBB...SS',
    'SS...BSSB...BSSB...SS',
    '.....BBBB.X.BBBB.....',
    '.....................',
    '.....................',
    '.....................',
    '...S..BBB...BBB..S...',
    '...S.............S...',
    '.....................',
    'SS.................SS',
    'SS......S.S.S......SS',
    'SS.................SS',
    '.....................',
    '...S.............S...',
    '...S..BBB...BBB..S...',
    '.....................',
    '.....................',
    '.....................',
    '.....BBBB...BBBB.....',
    'SS...BSSB.P.BSSB...SS',
    'SS...BBBB...BBBB...SS'] }
};
function parseArena(a) {
  const n = a.rows.length, t = new Uint8Array(n * n); let boss = null, player = null;
  a.rows.forEach((row, r) => {
    for (let c = 0; c < n; c++) {
      const ch = row[c];
      if (CH[ch]) t[r * n + c] = CH[ch]; else if (ch === 'X') boss = { c, r }; else if (ch === 'P') player = { c, r };
    }
  });
  return { n, t, boss, player };
}
// the arena as a map; the brick gate in front of the boss is part of the map until the intro smashes it (tests compare tiles except the gate cells)
function loadArena(key, theme) {
  const a = ARENAS[key], pa = parseArena(a);
  for (const [c, r] of a.gate || []) pa.t[r * pa.n + c] = BRICK;
  const m = makeArena({ n: pa.n, t: pa.t, spawns: [] }, theme);
  m.arena = key; m.frame = true; m.gate = a.gate || [];
  m.bossAt = { x: pa.boss.c * T + T / 2, y: pa.boss.r * T + T / 2 }; m.playerAt = { x: pa.player.c * T + T / 2, y: pa.player.r * T + T / 2 };
  return m;
}

/* ---- boss table ---- */
// def: { id, name, arena, hp(w), phases: [66, 33], plates: [kind lost in phase 2, kind lost in phase 3], attacks: [{ id, w, ok(e), run*(e) }], hold, setup(e, w), onPhase(e, i), draw(e, g, alpha),
//        deathText, loot, introSub, unlocks(w) }.  Later bosses: BOSS_DEFS.sariFirtina = {...}; BOSS_ON[10] = 'sariFirtina'.
const BOSS_DEFS = {};
const BOSS_ON = { 10: 'komutan', 20: 'komutan', 30: 'komutan', 40: 'komutan' }; // boss wave (within the 40-wave cycle) -> def id; every 5th wave not listed is a Komutan
const bossDefAt = w => {
  if (w < 1 || w % 5) return null;
  const k = ((w - 1) % 40) + 1;
  return BOSS_DEFS[BOSS_ON[k] || 'komutan'] || null;
};
const TELE_MIN = { glow: 0.45, heavy: 0.8, line: 1.0, circle: 1.2, ring: 1.2 }; // minimum warning time per telegraph kind (uyarı dili)
const bossDmg = base => Math.max(1, Math.round(base * G.mods.dmg));

function spawnBoss(def, x, y, angle) {
  const w = G.wave, e = makeTank('boss', x, y);
  e.isBoss = true; e.def = def; e.name = def.name; e.stage = !!G.stage; e.phased = e.stage;
  e.maxHp = e.hp = def.hp(w); e.r = def.r || e.spec.r;
  e.angle = e.turret = angle; e.visit = Math.max(1, Math.floor(w / 5));
  e.phase = 0; e.trans = 0; e.invuln = false; e.dying = false; e.parts = []; e.gen = null; e.wait = 0; e.atkId = ''; e.lastAtk = ''; e.acd = {};
  e.cool = 1.5; e.pace = 1 + 0.6 / e.visit; e.scorch = []; e.lost = {}; e.broke = [false, false, false, false]; e.hitSide = [0, 0, 0, 0];
  e.glow = 0; e.fxT = 0; e.flowT = 0; e.flow = null; e.dt = 0; e.log = []; e.unlock = def.unlocks ? def.unlocks(w) : {};
  initBossParts(e);
  def.setup(e, w);
  G.enemies.push(e); G.boss = e;
  return e;
}

/* ---- telegraphs (uyarı dili) ---- */
// kinds: glow (barrel/turret heats up), line (red line, last `lock` seconds darker and locked), circle (filling circle), ring (growing ring around the boss)
function addTele(e, o) { const tl = Object.assign({ t: 0, e, dur: TELE_MIN[o.kind] }, o); G.tele.push(tl); return tl; }
function removeTele(tl) { const i = G.tele.indexOf(tl); if (i >= 0) G.tele.splice(i, 1); }
function clearTele() { G.tele.length = 0; }
function release(e, id, tl) { // the strike behind a telegraph happens now: log how long it was shown
  e.log.push({ atk: id, kind: tl.kind, dur: +tl.t.toFixed(3), min: TELE_MIN[tl.kind] }); if (e.log.length > 300) e.log.shift();
}
// Hazards of the boss fight vanish: shells, pending telegraphed strikes, mines (used by phase changes, the death scene and the nuke)
function bossClearHazards() {
  G.tele.length = 0;
  G.bullets = G.bullets.filter(b => b.owner !== 1);
  if (G.mines) G.mines.length = 0;
  for (const e of G.enemies) if (e.isBoss) { e.gen = null; e.atkId = ''; e.glow = 0; e.cool = Math.max(e.cool, 1); if (e.def.onClear) e.def.onClear(e); }
}
const steelBetween = (x0, y0, x1, y1) => {
  const m = G.map, dx = x1 - x0, dy = y1 - y0, n = Math.ceil(Math.hypot(dx, dy) / 12);
  for (let i = 1; i < n; i++) if (m.at(x0 + dx * i / n, y0 + dy * i / n) === STEEL) return true;
  return false;
};
// distance a boss can travel from (x, y) along angle a before its front (margin ahead of the centre) meets steel or water
function rayClip(x, y, a, max, margin) {
  const m = G.map, ca = Math.cos(a), sa = Math.sin(a);
  for (let d = 0; d <= max; d += 6) { const v = m.at(x + ca * (d + margin), y + sa * (d + margin)); if (v === STEEL || v === WATER) return Math.max(0, d - 6); }
  return max;
}

/* ---- danger map for the autopilot: every active warning is a dangerous area ---- */
function bossDanger(x, y, pad, react) { // react: seconds a warning must have been showing before it counts (the bot's reaction time)
  pad = pad || 0; const e = G.boss; if (!e || e.dead) return false;
  if (e.def.danger && e.def.danger(e, x, y, pad)) return true; // per-boss hazards that are not telegraphs (sand strips)
  for (const tl of G.tele) {
    if (react && tl.t < react) continue;
    if (tl.kind === 'circle') { const rr = tl.r + pad; if (dist2(x, y, tl.x, tl.y) < rr * rr) return true; }
    else if (tl.kind === 'line') {
      const ca = Math.cos(tl.a), sa = Math.sin(tl.a), dx = x - tl.x, dy = y - tl.y, al = dx * ca + dy * sa, pr = -dx * sa + dy * ca;
      if (al > -pad - 10 && al < tl.len + e.r + pad && Math.abs(pr) < tl.w / 2 + pad) return true;
    } else if (tl.kind === 'ring') {
      const rr = tl.r + pad; if (dist2(x, y, e.x, e.y) < rr * rr && !steelBetween(e.x, e.y, x, y)) return true;
    } else if (tl.kind === 'glow' && tl.fan) {
      for (const off of tl.fan) {
        const a = e.turret + off, ca = Math.cos(a), sa = Math.sin(a), dx = x - e.x, dy = y - e.y, al = dx * ca + dy * sa, pr = -dx * sa + dy * ca;
        if (al > 0 && al < 640 && Math.abs(pr) < 22 + pad && los(e.x, e.y, x, y)) return true;
      }
    }
  }
  return false;
}

/* ---- boss shells ---- */
function bossShell(e, ang, o) {
  o = o || {};
  const s = e.spec, m = G.map, ca = Math.cos(ang), sa = Math.sin(ang), len = o.len || s.barrel, ox = o.x === undefined ? e.x : o.x, oy = o.y === undefined ? e.y : o.y; // o.x/o.y: a muzzle that is not the boss centre (side turrets)
  let bx = ox, by = oy, blocked = false;
  for (let d = 6; d <= len; d += 6) { bx = ox + ca * d; by = oy + sa * d; if (isWall(m.at(bx, by))) { blocked = true; break; } }
  const sp = s.bSpeed * (o.speed || 1);
  const b = { x: bx, y: by, vx: ca * sp, vy: sa * sp, r: s.bR, owner: 1, dmg: bossDmg(s.dmg * (o.dmgK || 1)), life: 3.2, big: true, dead: false,
    pierce: false, bounce: 0, splash: null, look: 'enemy', hits: null, bricks: null, sx: bx, sy: by, dist: 0, bounced: false, vol: 0, volN: 0, pn: 0, boss: true };
  if (blocked) hitTile(b, bx, by); else G.bullets.push(b);
}
function bossVolley(e, fan, o) { // one volley: a shell per entry of fan (radians relative to the turret), muzzle puffs, recoil; o: bossShell options (speed, dmgK)
  for (const off of fan) if (!barrelSilent(e, off)) bossShell(e, e.turret + off, o); // a silent barrel does not fire
  e.recoil = 1;
  const ca = Math.cos(e.turret), sa = Math.sin(e.turret);
  for (let k = 0; k < 3; k++) {
    const a = e.turret + (k - 1) * 0.2, mx = e.x + Math.cos(a) * (e.spec.barrel + 4), my = e.y + Math.sin(a) * (e.spec.barrel + 4);
    addPart('fire', mx, my, Math.cos(a) * 70, Math.sin(a) * 70, 0.1, 22, 40, 0);
    addPart('smoke', mx, my, ca * 40 + rand(-10, 10), sa * 40 + rand(-10, 10), rand(0.5, 0.8), 14, 28, 3);
  }
  moveTank(e, -ca * 1.2, -sa * 1.2);
  shake(2.5 * prox(e.x, e.y)); Sound.shoot(false, true, volAt(e.x, e.y));
}
// a mortar-style blast on the ground: scorch, explosion, damage to the player when inside
function bossBlast(x, y, r, dmg) {
  const p = G.player;
  explode(x, y, r / 56 * 0.9);
  addDecals(G.map, [{ k: 'scorch', x, y, r: r * 0.8 }]);
  if (p.alive && dist2(x, y, p.x, p.y) < (r + p.r * 0.4) * (r + p.r * 0.4)) damagePlayer({ x: p.x, y: p.y, dmg: bossDmg(dmg), owner: 1, vx: 0, vy: 0 });
}
// angle from (x, y) to where the player will be when a shell of this speed arrives (k: share of the full lead; the player's smoothed velocity, flight time capped)
function leadAng(x, y, speed, k) {
  const p = G.player, t = Math.min(0.8, Math.hypot(p.x - x, p.y - y) / speed) * (k || 0);
  return Math.atan2(p.y + (p.vy || 0) * t - y, p.x + (p.vx || 0) * t - x);
}
const aimAtPlayer = (e, dt, k, lead) => { const p = G.player; if (p.alive) e.turret = turnTo(e.turret, lead ? leadAng(e.x, e.y, e.spec.bSpeed, lead) : Math.atan2(p.y - e.y, p.x - e.x), e.spec.tTurn * (k || 1) * dt); };
function* glowAim(e, id, dur, fan) { // barrel glow telegraph while the turret keeps aiming; the shot itself is the caller's
  const tl = addTele(e, { kind: 'glow', dur, fan });
  while (tl.t < tl.dur) { aimAtPlayer(e, e.dt, 1.6, e.def.lead); yield 0; }
  release(e, id, tl); removeTele(tl);
}

/* ---- movement: a flow field over the tiles where the boss's round hull fits ---- */
// a tile centre fits when a circle of the hull radius (+2) around it touches no wall, water or the map edge (the same test collideWalls uses, so the boss never wedges on the way)
function bossFitMap(e) {
  const m = G.map, n = m.n, rad = e.r + 2, k = Math.ceil(rad / T), fit = e.fit && e.fit.length === n * n ? e.fit : (e.fit = new Uint8Array(n * n));
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const cx = c * T + T / 2, cy = r * T + T / 2; let ok = 1;
    for (let dy = -k; dy <= k && ok; dy++) for (let dx = -k; dx <= k; dx++) {
      if (!blocksTank(m.get(c + dx, r + dy))) continue;
      const bx = (c + dx) * T, by = (r + dy) * T, ex = cx - clamp(cx, bx, bx + T), ey = cy - clamp(cy, by, by + T);
      if (ex * ex + ey * ey < rad * rad) { ok = 0; break; }
    }
    fit[r * n + c] = ok;
  }
  return fit;
}
function computeBossFlow(e) {
  const m = G.map, n = m.n, p = G.player, N = n * n, fit = bossFitMap(e);
  if (!e.flow || e.flow.length !== N) e.flow = new Float32Array(N);
  e.flow.fill(1e9);
  const fg = e.def.flowGoal ? e.def.flowGoal(e) : null; // hook: a fixed place to walk to instead of the player (Demirkök walks to the castle centre)
  const pc = clamp(Math.floor((fg ? fg.x : p.x) / T), 0, n - 1), pr = clamp(Math.floor((fg ? fg.y : p.y) / T), 0, n - 1);
  let goal = -1, gd = 1e9;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!fit[r * n + c]) continue;
    const d = (c - pc) * (c - pc) + (r - pr) * (r - pr); if (d < gd) { gd = d; goal = r * n + c; }
  }
  if (goal < 0) return;
  e.goalD = fg ? 0 : Math.hypot((goal % n) * T + T / 2 - p.x, Math.floor(goal / n) * T + T / 2 - p.y); // how far the closest tile the boss can stand on is from the player (reach fallback in updateBoss)
  const q = [goal]; e.flow[goal] = 0;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], c = i % n, r = (i - c) / n;
    for (const [dx, dy] of DIRS) {
      const x = c + dx, y = r + dy; if (x < 0 || y < 0 || x >= n || y >= n || !fit[y * n + x]) continue;
      const j = y * n + x; if (e.flow[j] < 1e8) continue;
      e.flow[j] = e.flow[i] + 1; q.push(j);
    }
  }
}
// the next tile centre to head for. A boss standing on a tile where its hull does not fit (wall hugging, pushed into a pocket) first heads for the best fitting tile nearby
function bossWaypoint(e) {
  const m = G.map, n = m.n, c = clamp(Math.floor(e.x / T), 0, n - 1), r = clamp(Math.floor(e.y / T), 0, n - 1), here = e.flow ? e.flow[r * n + c] : 1e9;
  if (!e.flow || e.flow[r * n + c] > 1e8) return bossEscapeTarget(e);
  let best = null, bv = here;
  for (const [dx, dy] of shuffle(DIRS.slice())) { const x = c + dx, y = r + dy; if (x < 0 || y < 0 || x >= n || y >= n) continue; const f = e.flow[y * n + x]; if (f < bv) { bv = f; best = { c: x, r: y }; } }
  if (!best) return null;
  best.x = best.c * T + T / 2; best.y = best.r * T + T / 2; return best;
}
// nearest fitting tile (breadth first through open ground), preferring the ones closer to the goal; null when the boss is sealed in
function bossEscapeTarget(e) {
  const m = G.map, n = m.n, fit = e.fit; if (!fit || !e.flow) return null;
  const c0 = clamp(Math.floor(e.x / T), 0, n - 1), r0 = clamp(Math.floor(e.y / T), 0, n - 1), seen = new Map([[r0 * n + c0, 0]]), q = [[c0, r0]]; let best = null, bs = 1e9;
  for (let h = 0; h < q.length; h++) {
    const [c, r] = q[h], d = seen.get(r * n + c);
    if (fit[r * n + c] && e.flow[r * n + c] < 1e8) { const sc = d * 1.5 + e.flow[r * n + c] * 0.2 + Math.hypot(c * T + T / 2 - e.x, r * T + T / 2 - e.y) / T; if (sc < bs) { bs = sc; best = { c, r }; } }
    if (d >= 4) continue;
    for (const [dx, dy] of DIRS) { const x = c + dx, y = r + dy; if (x < 0 || y < 0 || x >= n || y >= n || seen.has(y * n + x) || blocksTank(m.t[y * n + x])) continue; seen.set(y * n + x, d + 1); q.push([x, y]); }
  }
  if (!best) return null;
  best.x = best.c * T + T / 2; best.y = best.r * T + T / 2; best.esc = true; return best;
}
// no progress for a while: slide the hull toward the nearest fitting tile centre, through the corner it is caught on (a gentle depenetration, a few px per frame)
function bossUnjam(e, dt) {
  const t = e.jam && e.jam.esc ? e.jam : (e.jam = bossEscapeTarget(e)); if (!t) return;
  const d = Math.hypot(t.x - e.x, t.y - e.y); if (d < 3) { e.jam = null; return; }
  const sp = Math.min(d, 140 * dt); e.x += (t.x - e.x) / d * sp; e.y += (t.y - e.y) / d * sp;
}
function bossMove(e, dt, hold) {
  if (e.treadT > 0) { e.avx = e.avy = 0; return; } // a broken tread: the boss stands still while the crew repairs it
  const s = e.spec, p = G.player, before = e.angle, ox = e.x, oy = e.y;
  e.flowT -= dt; if (e.flowT <= 0) { computeBossFlow(e); e.flowT = 0.3; }
  if (p.alive && !(e.canSee && e.distP < hold * T)) {
    if (e.jamT > 1.8) { bossUnjam(e, dt); e.stuckT = 0; } // side-steps did not help: depenetrate
    else if (e.jam) e.jam = null;
    if (!e.wp || dist2(e.wp.x, e.wp.y, e.x, e.y) < 30) { e.wp = bossWaypoint(e); e.wpBest = 1e9; e.stuckT = 0; }
    if (e.wp) {
      const desired = Math.atan2(e.wp.y - e.y, e.wp.x - e.x);
      e.angle = turnTo(e.angle, desired, s.turn * dt);
      const diff = Math.abs(angDiff(e.angle, desired)), spd = diff < 0.55 ? s.speed * e.speedMul * (1 - diff * 0.9) : 0;
      moveTank(e, Math.cos(e.angle) * spd * dt, Math.sin(e.angle) * spd * dt);
      const dw = Math.hypot(e.wp.x - e.x, e.wp.y - e.y);
      if (dw < e.wpBest - 0.5) { e.wpBest = dw; e.stuckT = 0; } else e.stuckT += dt;
      if (e.stuckT > 0.8) { e.wp = bossSideStep(e); e.wpBest = 1e9; e.stuckT = 0; }
    }
    if (e.jx === undefined || Math.hypot(e.x - e.jx, e.y - e.jy) >= 10) { e.jx = e.x; e.jy = e.y; e.jamT = 0; } else e.jamT = (e.jamT || 0) + dt; // moved less than 10 px in 1.8 s: wedged
  } else e.jamT = 0;
  if (dt > 0) { e.avx = (e.x - ox) / dt; e.avy = (e.y - oy) / dt; }
  trackUpdate(e, (e.x - ox) * Math.cos(e.angle) + (e.y - oy) * Math.sin(e.angle), angDiff(before, e.angle));
}
// a different fitting neighbour tile (not the one just failed), or the escape target when none is left
function bossSideStep(e) {
  const m = G.map, n = m.n, fit = e.fit, c = clamp(Math.floor(e.x / T), 0, n - 1), r = clamp(Math.floor(e.y / T), 0, n - 1), opts = [];
  if (fit) for (const [dx, dy] of DIRS) { const x = c + dx, y = r + dy; if (x >= 0 && y >= 0 && x < n && y < n && fit[y * n + x] && !(e.wp && e.wp.c === x && e.wp.r === y)) opts.push({ c: x, r: y }); }
  if (!opts.length) return bossEscapeTarget(e);
  const o = pick(opts); o.x = o.c * T + T / 2; o.y = o.r * T + T / 2; return o;
}

/* ---- per-frame boss update ---- */
function updateBoss(e, dt, halted) {
  if (e.dead) return;
  const p = G.player;
  e.flash = Math.max(0, e.flash - dt); e.recoil = Math.max(0, e.recoil - dt * 6);
  if (e.def.tick) e.def.tick(e, dt); // per-boss frame hook (Sarı Fırtına: sand strips, wind); runs in the intro and the death scene too
  if (G.phase === 'bossIntro') return; // the intro script drives the boss
  if (e.dying) { bossDeathTick(e, dt); return; }
  bossFx(e, dt); bossPartTick(e, dt);
  if (e.trans > 0) { // phase change: no damage, no attacks
    e.trans -= dt; e.flash = 0.05 + 0.05 * Math.sin(G.time * 30);
    if (e.trans <= 0) { e.trans = 0; e.invuln = false; e.wp = null; }
    return;
  }
  if (e.phased) { bossPhaseCheck(e); if (e.trans > 0) return; }
  if (halted) return; // stunned or frozen: neither moves nor attacks
  e.distP = Math.hypot(p.x - e.x, p.y - e.y);
  e.canSee = p.alive && los(e.x, e.y, p.x, p.y);
  e.cool -= dt;
  e.unrT = p.alive && e.goalD > e.r + p.r + T ? (e.unrT || 0) + dt : 0; // the player stands where the hull cannot go (a pocket): after ~4 s startAttack prefers the arcing attacks (a.arc)
  e.healT = (e.healT === undefined ? 30 : e.healT) - dt; // a long fight: a worn-down player gets a Tamir kit now and then (not while one still lies around)
  if (e.healT <= 0 && p.alive) { e.healT = 5; if (p.hp < p.maxHp * 0.55 && !G.pickups.some(q => q.kind === 'repair')) { dropRepairAway(e); e.healT = 35; } }
  e.glow = 0;
  for (const tl of G.tele) { tl.t += dt; if (tl.kind === 'glow') e.glow = Math.max(e.glow, tl.t / tl.dur); }
  if (e.gen) {
    e.dt = dt; e.wait -= dt;
    if (e.wait <= 0) { const r = e.gen.next(); if (r.done) endAttack(e); else e.wait = r.value || 0; }
  } else {
    if (e.cool <= 0 && p.alive) startAttack(e); else bossMove(e, dt, e.def.hold || 4.5);
    if (!e.gen) { if (e.canSee) aimAtPlayer(e, dt); else e.turret = turnTo(e.turret, e.angle, e.spec.tTurn * 0.6 * dt); }
  }
}
function startAttack(e) {
  const list = e.def.attacks.filter(a => a.ok(e) && a.id !== e.lastAtk && !(e.acd[a.id] > G.time) && !(a.mov && e.treadT > 0)); // mov: an attack that needs the treads (charge)
  if (e.unrT > 4) { const arc = list.filter(a => a.arc); if (arc.length) list.splice(0, list.length, ...arc); } // unreachable player: the mortar or bombardment reaches the pocket (normal telegraph)
  if (!list.length) { e.cool = 0.5; return; }
  let r = Math.random() * list.reduce((s, a) => s + a.w, 0), at = list[list.length - 1];
  for (const a of list) { r -= a.w; if (r <= 0) { at = a; break; } }
  e.atkId = at.id; e.lastAtk = at.id; e.wait = 0; e.gen = at.run(e);
  if (at.cd) e.acd[at.id] = G.time + at.cd;
}
function endAttack(e) {
  e.gen = null; e.atkId = ''; clearTele();
  e.cool = rand(0.9, 1.6) * e.pace * (e.phase >= 2 ? 0.8 : 1);
}

/* ---- phases ---- */
function bossPhaseCheck(e) {
  const th = e.def.phases;
  if (e.phase < th.length && e.hp / e.maxHp * 100 <= th[e.phase]) startTransition(e);
}
function startTransition(e) {
  e.phase++; e.trans = 1.5; e.invuln = true;
  bossClearHazards();
  const kind = e.def.plates && e.def.plates[e.phase - 1];
  if (kind) { e.lost[kind] = true; spawnPiece(e, kind, true); }
  for (let k = 0; k < 10; k++) addPart('smoke', e.x + rand(-26, 26), e.y + rand(-26, 26), rand(-40, 40), rand(-40, 40), rand(1.2, 2), rand(18, 30), 34, 1.2);
  sparks(e.x, e.y, 18, '#ffd27a', 320); explode(e.x, e.y, 0.9); shake(12); Sound.crumble(volAt(e.x, e.y)); vibrate([30, 40, 60]);
  addText(e.x, e.y - e.r - 14, 'EVRE ' + (e.phase + 1), '#ff9a6c', 20);
  dropRepairAway(e);
  if (e.def.onPhase) e.def.onPhase(e, e.phase);
}
// a Tamir pickup on a tile the player can reach, away from the boss
function dropRepairAway(e) {
  const m = G.map, n = m.n, p = G.player, c0 = clamp(Math.floor(p.x / T), 0, n - 1), r0 = clamp(Math.floor(p.y / T), 0, n - 1);
  if (m.flowFrom < 0 || m.flowDirty) { computeFlow(m, r0 * n + c0); m.flowFrom = r0 * n + c0; m.flowDirty = false; }
  const ok = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (blocksTank(m.get(c, r)) || m.flow[r * n + c] > 1e8) continue;
    const x = c * T + T / 2, y = r * T + T / 2, db = Math.hypot(x - e.x, y - e.y), dp = Math.hypot(x - p.x, y - p.y);
    if (db >= 4.5 * T && dp <= 9 * T) ok.push({ x, y, s: Math.abs(dp - 4 * T) });
  }
  ok.sort((a, b) => a.s - b.s);
  const q = ok.length ? pick(ok.slice(0, Math.max(1, Math.ceil(ok.length / 4)))) : { x: p.x, y: p.y };
  dropPickup(q.x, q.y, 'repair', q.x, q.y);
}

/* ---- parts ---- */
const partPos = (e, pt) => { const ca = Math.cos(e.angle), sa = Math.sin(e.angle); return { x: e.x + ca * pt.ox - sa * pt.oy, y: e.y + sa * pt.ox + ca * pt.oy }; };
function partHit(e, pt, x, y, dir) { // a shell hits the part when its path through the hull crosses it
  if (dir === undefined || (x === e.x && y === e.y)) return false;
  const q = partPos(e, pt), tx = Math.cos(dir + Math.PI), ty = Math.sin(dir + Math.PI), dx = q.x - x, dy = q.y - y, along = dx * tx + dy * ty;
  if (along < -pt.r || along > e.r * 2.2) return false;
  return Math.abs(dx * ty - dy * tx) <= pt.r;
}
function breakPart(e, pt) {
  pt.alive = false; pt.hp = 0;
  const q = partPos(e, pt);
  explode(q.x, q.y, 0.8); sparks(q.x, q.y, 14, '#ffd27a', 300); shake(7);
  addText(q.x, q.y - 22, pt.name + ' kırıldı', '#ffd27a', 16);
  dropPickup(q.x, q.y, Math.random() < 0.7 ? 'repair' : pick(['shield', 'rapid', 'triple', 'pierce']), e.x, e.y);
  if (pt.atk && e.atkId === pt.atk) { e.gen = null; e.atkId = ''; e.glow = 0; clearTele(); e.cool = 1; } // the attack the part powered stops at once
  if (e.def.onPartBreak) e.def.onPartBreak(e, pt);
  vibrate(30);
}
/* ---- part damage: treads and barrels (docs/BOSSES.md section 2) ---- */
// Treads (one per side) have their own HP (BT.tread of the boss's max HP). A shell from the side hits the tread on that side; at 0 the boss stands still for BT.halt seconds while the crew repairs it,
// then the tread is full again and the next break needs BT.more more. Breaking a tread during a charge warning (a 'line' telegraph) cancels the charge.
// def.barrels: [{ id, name, ang (radians against the turret), k (share of max HP before it goes silent) }]: a shell from the front adds its damage to the nearest barrel; a full barrel is silent for BT.silent seconds
// (its shells are left out of the volleys) and a glow telegraph in progress is cancelled. Attacks with mov: true do not start while a tread is broken.
const BT = { tread: 0.08, halt: 4, more: 0.5, silent: 3 };
function initBossParts(e) {
  const mx = Math.max(2, Math.round(e.maxHp * BT.tread));
  e.tr = [0, 1].map(() => ({ hp: mx, max: mx, br: 0, t: 0 })); e.treadT = 0; e.cancels = 0;
  e.bars = (e.def.barrels || []).map(b => ({ id: b.id, name: b.name, ang: b.ang, thr: Math.max(2, Math.round(e.maxHp * (b.k || 0.07))), acc: 0, t: 0 }));
}
const barrelSilent = (e, off) => !!e.bars && e.bars.some(b => b.t > 0 && Math.abs(off - b.ang) < 0.08);
function cancelAttack(e, why) { // the part the attack needed broke during its warning
  e.gen = null; e.atkId = ''; e.glow = 0; clearTele(); e.cool = 1.2; e.cancels++;
  e.log.push({ atk: 'cancel', kind: why, dur: 0, min: 0 }); if (e.log.length > 300) e.log.shift();
  addText(e.x, e.y - e.r - 16, 'SALDIRI İPTAL', '#bfeaff', 16);
}
const warning = (e, kind) => G.tele.some(t => t.e === e && t.kind === kind && t.t < t.dur);
function treadWorld(e, i) { const s = e.spec, ly = (i ? 1 : -1) * (s.wid / 2 - s.tread / 2), ca = Math.cos(e.angle), sa = Math.sin(e.angle); return { x: e.x - sa * ly, y: e.y + ca * ly }; }
function bossPartHit(e, dmg, x, y, dir) {
  const a = angDiff(e.angle, dir), aa = Math.abs(a);
  if (aa >= 0.785 && aa <= 2.356) { // side hit: that side's tread
    const i = a > 0 ? 1 : 0, tr = e.tr[i]; if (tr.t > 0) return;
    tr.hp -= dmg; if (tr.hp > 0) return;
    tr.hp = 0; tr.br++; tr.t = BT.halt; e.treadT = BT.halt;
    const q = treadWorld(e, i);
    for (let k = 0, n = Math.max(4, Math.round(10 * fxScale)); k < n; k++) { const an = rand(0, TAU), v = rand(50, 200); addPart('debris', q.x + rand(-14, 14), q.y + rand(-14, 14), Math.cos(an) * v, Math.sin(an) * v, rand(0.8, 1.5), rand(3.5, 6), 0, 3.2, k & 1 ? '#4b473e' : '#1f1d19'); }
    sparks(q.x, q.y, 14, '#ffd27a', 300); explode(q.x, q.y, 0.5); shake(6);
    addText(q.x, q.y - 24, 'Palet kırıldı', '#ffd27a', 16);
    if (warning(e, 'line')) cancelAttack(e, 'palet');
  } else if (e.bars.length && Math.abs(angDiff(e.turret, dir)) < 0.9) { // front hit: the barrel nearest to where the shell passes
    const ct = Math.cos(e.turret), st = Math.sin(e.turret), lat = -st * (x - e.x) + ct * (y - e.y);
    let best = null, bd = 1e9;
    for (const b of e.bars) { if (b.t > 0) continue; const d = Math.abs(Math.sin(b.ang) * e.spec.barrel - lat); if (d < bd) { bd = d; best = b; } }
    if (!best) return;
    best.acc += dmg; if (best.acc < best.thr) return;
    best.acc = 0; best.t = BT.silent;
    const mx = e.x + Math.cos(e.turret + best.ang) * e.spec.barrel, my = e.y + Math.sin(e.turret + best.ang) * e.spec.barrel;
    sparks(mx, my, 10, '#ffb04a', 240); explode(mx, my, 0.35); addText(mx, my - 20, best.name + ' tutukluk', '#ffd27a', 15);
    if (warning(e, 'glow')) cancelAttack(e, 'namlu');
  }
}
function bossPartTick(e, dt) {
  if (e.dying) return;
  e.treadT = e.rooted ? 1 : 0; // a rooted boss (Demirkök, phase 3) cannot move: the same state as a broken tread, which bossMove, startAttack and the bot already read
  for (let i = 0; i < 2; i++) {
    const tr = e.tr[i]; if (tr.t <= 0) continue;
    tr.t -= dt; const q = treadWorld(e, i);
    if (tr.t <= 0) { // repaired: full again, the next break needs more
      tr.t = 0; tr.max = Math.round(Math.max(2, Math.round(e.maxHp * BT.tread)) * (1 + BT.more * tr.br)); tr.hp = tr.max;
      sparks(q.x, q.y, 10, '#fff0b0', 200); addPart('ring', q.x, q.y, 0, 0, 0.4, 6, 70, 0, '255,230,150');
    } else {
      e.treadT = Math.max(e.treadT, tr.t);
      if (Math.random() < dt * 14) addPart('spark', q.x + rand(-16, 16), q.y + rand(-4, 4), rand(-70, 70), rand(-120, -30), rand(0.2, 0.4), 1, 0, 4, '#ffb04a');
    }
  }
  for (const b of e.bars) {
    if (b.t <= 0) continue; b.t -= dt; if (b.t < 0) b.t = 0;
    if (Math.random() < dt * 10) { const mx = e.x + Math.cos(e.turret + b.ang) * e.spec.barrel, my = e.y + Math.sin(e.turret + b.ang) * e.spec.barrel; addPart('smoke', mx, my, rand(-10, 10), rand(-30, -12), rand(0.7, 1.1), rand(10, 15), 22, 1.5); }
  }
}
const partAlive = (e, id) => e.parts.some(pt => pt.id === id && pt.alive);

/* ---- damage ---- */
function bossHurt(e, dmg, x, y, dir, quiet) {
  if (e.dead || e.dying) return;
  const direct = x !== e.x || y !== e.y;
  if (e.invuln || G.phase === 'bossIntro') { if (!quiet && direct) { sparks(x, y, 3, '#ffffff', 160, dir, 1.2); Sound.metal(volAt(e.x, e.y)); } return; }
  const k = e.stunT > 0 ? 1.5 : 1; // stunned bosses take +50%
  for (const pt of e.parts) {
    if (!pt.alive || !partHit(e, pt, x, y, dir)) continue;
    pt.hp -= dmg * k; pt.flash = 0.1;
    if (!quiet) { sparks(x, y, 6, '#ffd27a', 200, dir, 1.4); Sound.metal(volAt(e.x, e.y)); }
    if (pt.hp <= 0) breakPart(e, pt);
    return;
  }
  if (direct && dir !== undefined && !quiet) bossPartHit(e, dmg * k, x, y, dir); // treads and barrels: own HP / accumulated hits (the hull takes the damage too)
  if (e.def.hullMul) dmg *= e.def.hullMul(e, x, y, dir, direct, quiet); // hook: damage multiplier of the hull itself (Demirkök: turret shield, rear weak point)
  const applied = Math.min(dmg * k, e.hp);
  e.hp -= dmg * k; e.flash = 0.1;
  if (typeof nukeOnBossDamage === 'function') nukeOnBossDamage(e, applied); // hook (C): the nuke meter fills with the damage dealt to the boss
  if (direct && !quiet) markHit(e, x, y);
  if (!quiet) { sparks(x, y, 6, '#ffd27a', 200, dir, 1.4); Sound.metal(volAt(e.x, e.y)); }
  if (e.hp <= 0.001) { bossBeginDeath(e); return; }
  const f = e.hp / e.maxHp;
  [0.8, 0.6, 0.4, 0.2].forEach((th, i) => { if (!e.broke[i] && f <= th) { e.broke[i] = true; spawnPiece(e, BOSS_PIECES[i], false); } });
}
const BOSS_PIECES = ['fender', 'plate', 'antenna', 'exhaust'];
function markHit(e, x, y) { // scorch mark on the hull (max 12) and which side takes the beating
  const ca = Math.cos(e.angle), sa = Math.sin(e.angle), dx = x - e.x, dy = y - e.y, lx = ca * dx + sa * dy, ly = -sa * dx + ca * dy;
  e.scorch.push({ x: clamp(lx, -e.spec.len * 0.45, e.spec.len * 0.45), y: clamp(ly, -e.spec.wid * 0.4, e.spec.wid * 0.4), r: rand(2.5, 4.5), a: rand(0, TAU) });
  if (e.scorch.length > 12) e.scorch.shift();
  e.hitSide[Math.abs(lx) > Math.abs(ly) ? (lx > 0 ? 0 : 1) : (ly < 0 ? 2 : 3)]++;
}
const PIECE_AT = { fender: [-30, -36], plate: [14, 32], antenna: [-40, -12], exhaust: [-46, 0], shoulder: [18, 22], skirt: [0, 34], flag: [-24, 0] };
function spawnPiece(e, kind, big) { // a piece of armour breaks off, falls and stays on the ground for a few seconds
  const [lx, ly] = PIECE_AT[kind] || [0, 0], ca = Math.cos(e.angle), sa = Math.sin(e.angle), x = e.x + ca * lx - sa * ly, y = e.y + sa * lx + ca * ly;
  const out = Math.atan2(ly * ca + lx * sa, lx * ca - ly * sa), sp = rand(90, 160);
  G.pieces.push({ k: kind, x, y, vx: Math.cos(out) * sp, vy: Math.sin(out) * sp, a: e.angle + rand(-0.4, 0.4), vr: rand(-6, 6), t: 0, life: big ? 6.5 : 5, big, col: e.spec.col });
  sparks(x, y, 8, '#ffd27a', 220); addPart('flash', x, y, 0, 0, 0.12, 60, 0, 0);
  for (let k = 0; k < 4; k++) addPart('smoke', x + rand(-6, 6), y + rand(-6, 6), rand(-20, 20), rand(-20, 20), rand(0.8, 1.4), rand(12, 20), 26, 1.5);
  Sound.metal(volAt(x, y)); shake(3);
}
function updatePieces(dt) {
  for (const q of G.pieces) { q.t += dt; const k = Math.exp(-4.5 * dt); q.vx *= k; q.vy *= k; q.x += q.vx * dt; q.y += q.vy * dt; q.a += q.vr * dt; q.vr *= k; }
  if (G.pieces.some(q => q.t > q.life)) G.pieces = G.pieces.filter(q => q.t <= q.life);
}
// smoke below 50% (from the side hit most), fire below 25%, sparks above a stunned boss, sparks from broken part sockets
function bossFx(e, dt) {
  e.fxT -= dt; if (e.fxT > 0) return;
  e.fxT = 0.09;
  const f = e.hp / e.maxHp, s = e.spec, ca = Math.cos(e.angle), sa = Math.sin(e.angle), put = (lx, ly) => ({ x: e.x + ca * lx - sa * ly, y: e.y + sa * lx + ca * ly });
  if (f < 0.5) {
    let side = 0, tot = 0; for (const v of e.hitSide) tot += v + 1; let r = Math.random() * tot;
    for (let i = 0; i < 4; i++) { r -= e.hitSide[i] + 1; if (r <= 0) { side = i; break; } }
    const lx = side === 0 ? s.len * 0.4 : side === 1 ? -s.len * 0.4 : rand(-s.len * 0.3, s.len * 0.3), ly = side === 2 ? -s.wid * 0.38 : side === 3 ? s.wid * 0.38 : rand(-s.wid * 0.3, s.wid * 0.3);
    const q = put(lx, ly);
    addPart('smoke', q.x, q.y, rand(-12, 12), rand(-30, -12), rand(0.9, 1.5), rand(12, 20), 24, 1.5);
    if (f < 0.25) addPart('fire', q.x, q.y, rand(-14, 14), rand(-40, -15), rand(0.25, 0.5), rand(10, 16), 12, 2);
  }
  if (e.stunT > 0) { addPart('spark', e.x + rand(-22, 22), e.y - e.r - 6 + rand(-6, 6), rand(-90, 90), rand(-160, -60), rand(0.2, 0.4), 1, 0, 4, '#bfeaff'); }
  for (const pt of e.parts) if (!pt.alive && Math.random() < 0.25) { const q = partPos(e, pt); addPart('spark', q.x, q.y, rand(-60, 60), rand(-90, -20), rand(0.15, 0.3), 1, 0, 4, '#ffb04a'); }
}

/* ---- death scene ---- */
function bossBeginDeath(e) {
  e.dying = true; e.invuln = true; e.deathT = 0; e.chainT = 0; e.hp = 0.001; e.gen = null; e.glow = 0;
  bossClearHazards();
  showBanner(e.def.deathText || 'BOSS DÜŞTÜ', '', 2.4);
  spawnPiece(e, 'flag', true); // the standard topples
  Sound.metal(1); shake(10); vibrate([40, 30, 80]);
}
function bossDeathTick(e, dt) {
  e.deathT += dt; e.chainT -= dt; e.flash = 0.04;
  if (e.chainT <= 0 && e.deathT < 2.2) {
    e.chainT = 0.17;
    const a = e.angle, lx = rand(-e.spec.len * 0.45, e.spec.len * 0.45), ly = rand(-e.spec.wid * 0.4, e.spec.wid * 0.4);
    const x = e.x + Math.cos(a) * lx - Math.sin(a) * ly, y = e.y + Math.sin(a) * lx + Math.cos(a) * ly;
    explode(x, y, rand(0.45, 0.85)); sparks(x, y, 8, '#ffd27a', 280);
  }
  if (e.deathT >= 2.4) killEnemy(e);
}
// called from killEnemy for a boss: armour back to full
function bossDefeated(e) {
  const p = G.player; if (p && p.alive) { p.hp = p.maxHp; addText(p.x, p.y - 30, 'Zırh tam', '#6fd46b', 18); addPart('ring', p.x, p.y, 0, 0, 0.6, 12, 200, 0, '111,212,107'); }
  bossClearHazards();
}

/* ---- boss stage: arena, intro, fight ---- */
function startBossStage(def) {
  const m = G.map, p = G.player, at = m.bossAt;
  G.stage = def; G.queue = []; G.maxAlive = 1;
  const e = spawnBoss(def, at.x, at.y, Math.PI / 2);
  e.invuln = true;
  G.phase = 'bossIntro'; G.phaseT = 0; G.fade = 1; G.introGate = false; G.introSeen = !!store.get(BOSS_SEEN_KEY, false);
  cam.x = at.x; cam.y = at.y + T; clampCam(); computeView();
  Sound.siren();
  showBanner(def.name, (def.introSub || m.arena) + ' · Dalga ' + G.wave, 3);
  return e;
}
const BOSS_SEEN_KEY = 'tankArena.seenBossIntro';
function bossIntroTick(rdt) {
  const e = G.boss, m = G.map, t = G.phaseT;
  G.fade = clamp(1 - t / 0.5, 0, 1);
  if (!e || e.dead) { G.phase = 'fight'; G.phaseT = 0; return; }
  const home = m.bossAt;
  if (t < 1.35) { e.x = home.x + Math.sin(t * 40) * 1.6; if (Math.random() < rdt * 14) addPart('dust', home.x + rand(-30, 30), home.y + e.r + 4, rand(-20, 20), rand(10, 40), rand(0.5, 0.9), rand(12, 20), 24, 2); }
  else {
    if (!G.introGate) { smashGate(true); G.introGate = true; e.x = home.x; }
    if (e.y < home.y + 2 * T) { e.y = Math.min(home.y + 2 * T, e.y + 70 * rdt); trackUpdate(e, 70 * rdt, 0); }
  }
  if (t >= 3.0) endBossIntro(false);
}
function smashGate(loud) {
  const m = G.map;
  for (const [c, r] of m.gate) {
    if (m.t[r * m.n + c] !== BRICK) continue;
    if (loud) { explode(c * T + T / 2, r * T + T / 2, 0.8); destroyBrick(m, c, r, 1); } else { m.t[r * m.n + c] = EMPTY; m.hp[r * m.n + c] = 0; m.flowDirty = true; miniTile(m, c, r); }
  }
  if (loud) { shake(12); } else paintRegion(m, 0, 0, m.n - 1, m.n - 1);
}
function endBossIntro(skipped) {
  const e = G.boss, m = G.map;
  if (!skipped) store.set(BOSS_SEEN_KEY, true);
  if (skipped) { smashGate(false); if (e) { e.x = m.bossAt.x; e.y = m.bossAt.y + 2 * T; } hideBanner(); G.fade = 0; }
  if (e) { e.invuln = false; e.cool = 1.4; }
  G.phase = 'fight'; G.phaseT = 0;
}
// a tap skips the intro, once it has been seen
function bossIntroTap() { if (G.state === 'play' && G.phase === 'bossIntro' && G.introSeen && G.phaseT > 0.25) endBossIntro(true); }
/* ================= Komutan (docs/BOSSES.md section 3) ================= */
// Attacks are generators: `yield n` waits n seconds (0 = next frame), e.dt is the frame time. Each one shows its telegraph first (see TELE_MIN).
const RAM_DMG = 40; // ezme: a clean hit takes about a third of a mid-game tank's armour and hull
const KOM_FAN3 = [-0.2, 0, 0.2], KOM_FAN5 = [-0.34, -0.17, 0, 0.17, 0.34];
function* komTriple(e) { yield* glowAim(e, 'triple', 0.45, KOM_FAN3); bossVolley(e, KOM_FAN3); yield 0.4; }
function* komPenta(e) { yield* glowAim(e, 'penta', 0.45, KOM_FAN5); bossVolley(e, KOM_FAN5); yield 0.5; }
function* komSalvo(e) { // yaylım: three triple volleys, the fan turning a little each time, each with its own glow
  for (let k = 0; k < 3; k++) {
    const tl = addTele(e, { kind: 'glow', dur: 0.45, fan: KOM_FAN3 }), p = G.player, base = leadAng(e.x, e.y, e.spec.bSpeed, e.def.lead) + (k - 1) * 0.3;
    while (tl.t < tl.dur) { e.turret = turnTo(e.turret, base, e.spec.tTurn * 2.2 * e.dt); yield 0; }
    release(e, 'yaylim', tl); removeTele(tl); bossVolley(e, KOM_FAN3); yield 0.15;
  }
  yield 0.3;
}
function* komCharge(e) { // ezme hücumu: red line (last 0.3 s locked), then a 6-tile rush that flattens bricks; steel stops it and stuns the Komutan for 2 s
  const p = G.player, s = e.spec, margin = e.r + 4;
  const tl = addTele(e, { kind: 'line', dur: 1.05, lock: 0.3, x: e.x, y: e.y, a: e.angle, len: 6 * T, w: 2 * (e.r + 12) });
  Sound.warnRise(volAt(e.x, e.y));
  while (tl.t < tl.dur) {
    if (tl.t < tl.dur - tl.lock) e.angle = turnTo(e.angle, Math.atan2(p.y - e.y, p.x - e.x), 3.2 * e.dt);
    aimAtPlayer(e, e.dt);
    tl.x = e.x; tl.y = e.y; tl.a = e.angle; tl.len = rayClip(e.x, e.y, e.angle, 6 * T, margin);
    yield 0;
  }
  release(e, 'ezme', tl);
  const m = G.map, ca = Math.cos(e.angle), sa = Math.sin(e.angle), plan = tl.len, clipped = plan < 6 * T - 1;
  let trav = 0, hurt = false;
  while (trav < plan) {
    const step = Math.min(430 * e.dt, plan - trav);
    for (const [fa, lat] of [[e.r + 10, 0], [e.r + 8, e.r * 0.7], [e.r + 8, -e.r * 0.7]]) { // flatten the bricks in front
      const bx = e.x + ca * fa - sa * lat, by = e.y + sa * fa + ca * lat;
      if (m.at(bx, by) === BRICK) { destroyBrick(m, Math.floor(bx / T), Math.floor(by / T), volAt(bx, by)); shake(4); }
    }
    const ox = e.x, oy = e.y;
    moveTank(e, ca * step, sa * step);
    const moved = Math.hypot(e.x - ox, e.y - oy);
    trackUpdate(e, moved, 0); trav += moved;
    if (fxScale === 1 && Math.random() < 0.6) addPart('dust', e.x - ca * e.r, e.y - sa * e.r + rand(-14, 14), rand(-30, 30), rand(-30, 30), rand(0.4, 0.8), rand(14, 24), 26, 2);
    if (!hurt && p.alive && dist2(e.x, e.y, p.x, p.y) < (e.r + p.r + 2) * (e.r + p.r + 2)) {
      hurt = true; damagePlayer({ x: p.x, y: p.y, dmg: bossDmg(RAM_DMG), owner: 1, vx: 0, vy: 0 });
      moveTank(p, -sa * 36, ca * 36 * (Math.random() < 0.5 ? 1 : -1)); shake(8);
    }
    if (moved < step * 0.35) break; // jammed against something
    yield 0;
  }
  removeTele(tl);
  if (clipped || trav < plan - 6) { // slammed into steel: stunned
    e.stunT = 2; shake(12); explode(e.x + ca * e.r, e.y + sa * e.r, 0.7); Sound.metal(volAt(e.x, e.y));
    addText(e.x, e.y - e.r - 14, 'SERSEMLEDİ', '#bfeaff', 18);
  }
  if (e.unlock.shock && e.phase >= 2) { while (e.stunT > 0) yield 0; yield* komShock(e); }
  yield 0.3;
}
function* komShock(e) { // şok dalgası: ring of 3 tiles; steel in between protects
  const tl = addTele(e, { kind: 'ring', dur: 1.2, r: 3 * T });
  Sound.warnRise(volAt(e.x, e.y));
  while (tl.t < tl.dur) yield 0;
  release(e, 'shock', tl); removeTele(tl);
  const p = G.player, R = 3 * T;
  addPart('ring', e.x, e.y, 0, 0, 0.5, 20, R * 2.2, 0, '255,200,140'); addPart('flash', e.x, e.y, 0, 0, 0.2, 140, 0, 0); shake(12); Sound.boom(1.2, volAt(e.x, e.y));
  if (p.alive && dist2(e.x, e.y, p.x, p.y) < (R + p.r) * (R + p.r) && !steelBetween(e.x, e.y, p.x, p.y)) {
    damagePlayer({ x: p.x, y: p.y, dmg: bossDmg(20), owner: 1, vx: 0, vy: 0 });
    const a = Math.atan2(p.y - e.y, p.x - e.x); moveTank(p, Math.cos(a) * 40, Math.sin(a) * 40);
  }
  yield 0.3;
}
function* komMortar(e) { // topçu desteği: three circles around the player (fall over walls)
  const p = G.player, m = G.map, circ = [];
  Sound.warnRise(volAt(e.x, e.y));
  for (let i = 0; i < 3; i++) {
    const a = rand(0, TAU), d = i === 0 ? rand(0, 40) : rand(70, 140);
    circ.push(addTele(e, { kind: 'circle', r: 56, x: clamp(p.x + Math.cos(a) * d, T, m.w - T), y: clamp(p.y + Math.sin(a) * d, T, m.h - T) }));
  }
  while (circ[0].t < circ[0].dur) { aimAtPlayer(e, e.dt, 0.5); yield 0; }
  for (const tl of circ) { release(e, 'topcu', tl); removeTele(tl); bossBlast(tl.x, tl.y, 56, 18); }
  yield 0.4;
}
function* komBombard(e) { // bombardıman hattı: a row of circles across the arena with a gap, then blasts along it
  const p = G.player, m = G.map, horiz = Math.random() < 0.5, step = 80, circ = [];
  const along = horiz ? p.x : p.y, gap = along + (Math.random() < 0.5 ? -1 : 1) * rand(50, 110), line = horiz ? p.y : p.x, span = horiz ? m.w : m.h;
  Sound.warnRise(volAt(e.x, e.y));
  for (let v = step / 2; v < span; v += step) {
    if (Math.abs(v - gap) < step * 1.2) continue;
    const x = horiz ? v : line, y = horiz ? line : v;
    if (m.at(x, y) === STEEL) continue;
    circ.push(addTele(e, { kind: 'circle', r: 44, x, y }));
  }
  while (circ.length && circ[0].t < circ[0].dur) { aimAtPlayer(e, e.dt, 0.5); yield 0; }
  for (const tl of circ) { release(e, 'bomb', tl); removeTele(tl); bossBlast(tl.x, tl.y, 44, 16); yield 0.045; }
  yield 0.4;
}
const KOM_ATTACKS = [
  { id: 'triple', w: 3, ok: e => true, run: komTriple },
  { id: 'ezme', w: 2.2, ok: e => e.distP > 2.5 * T, run: komCharge, mov: true },
  { id: 'topcu', w: 2, ok: e => e.unlock.topcu && partAlive(e, 'tower'), run: komMortar, arc: true },
  { id: 'yaylim', w: 2, ok: e => e.unlock.yaylim && e.phase >= 1, run: komSalvo },
  { id: 'bomb', w: 1.6, ok: e => e.unlock.bomb && e.phase >= 1, run: komBombard, cd: 9, arc: true },
  { id: 'penta', w: 2.4, ok: e => e.unlock.penta && e.phase >= 2, run: komPenta }
];
BOSS_DEFS.komutan = {
  id: 'komutan', name: 'KOMUTAN', arena: 'kisla', introSub: 'Kışla', hold: 4.5, phases: [66, 33], plates: ['shoulder', 'skirt'],
  deathText: 'KOMUTAN DÜŞTÜ', loot: 'KOMUTAN GANİMETİ',
  lead: 0.35, hp: bossHp, attacks: KOM_ATTACKS, barrels: [{ id: 'mid', name: 'Orta namlu', ang: 0, k: 0.07 }],
  unlocks: w => ({ tower: w >= 15, topcu: w >= 15, yaylim: w >= 25, bomb: w >= 25, penta: w >= 35, shock: w >= 35 }),
  setup(e, w) {
    if (e.unlock.tower) e.parts.push({ id: 'tower', name: 'Komuta kulesi', atk: 'topcu', ox: -24, oy: 0, r: 15, maxHp: Math.max(2, Math.round(e.maxHp * 0.1)), hp: Math.max(2, Math.round(e.maxHp * 0.1)), alive: true, flash: 0 });
  },
  onPhase(e, i) { if (i === 2) { e.speedMul *= 1.3; addText(e.x, e.y - e.r - 54, 'SON EMİR', '#ff7a5c', 18); } },
  onPartBreak(e, pt) { if (pt.id === 'tower') spawnPiece(e, 'flag', true); }
};
/* ================= Sarı Fırtına (docs/BOSSES.md section 4) ================= */
// Çöl's boss, the fast one: circles the player and fires bursts, then charges along a red line that breaks bricks; steel (or the map edge) stuns it.
// Phase 2: exhausts light up (+15% speed), double charge, sand strips left on the charge path. Phase 3 "Fırtına": wind every 12 s, triple charge.
// Per-boss state lives in e.sari; the generic hooks it uses in 11a: def.tick (every frame), def.danger (bot), def.onClear, def.drawGround (15a).
ARENAS.kum = { name: 'Kum Çukuru', gate: [[9, 4], [10, 4], [11, 4]], rows: [ // the brick wall in front of the boss is the gate: the intro smashes it
  'SS.................SS',
  'SS.................SS',
  '..........X..........',
  '.....................',
  '....S...SBBBS...S....',
  '.....................',
  '.....................',
  '.....................',
  '....S...S...S...S....',
  'GG.................GG',
  'WW........S........WW',
  'GG.................GG',
  '....S...S...S...S....',
  '.....................',
  '.....................',
  '.....................',
  '....S...SBBBS...S....',
  '.....................',
  '.....................',
  'SS........P........SS',
  'SS.................SS'] };

const SARI_CHARGE_LEN = 9 * T;   // a charge covers this far (more with the wind) unless steel is in the way
const SARI_RAM_DMG = 30;       // a clean hit; the double and triple charge can hit again
const SARI_RUSH = 650;           // charge speed, px/s
const SARI_SAND_LIFE = 4, SARI_SAND_SLOW = 0.35, SARI_SAND_W = 64;
const SARI_WIND_WARN = 1.5, SARI_WIND_BLOW = 5, SARI_WIND_EVERY = 12, SARI_WIND_PUSH = 75;
const SARI_SPEC = { speed: 175, turn: 5, tTurn: 5.5, len: 72, wid: 48, r: 27, tread: 9, tR: 12, barrel: 44, bW: 8, cool: 1, bSpeed: 450, dmg: 4, bR: 5, mass: 3, score: 1500,
  col: { body: '#cf9f30', dk: '#8c691b', hi: '#efca60', acc: '#f08a2c' } };

const sariWindVec = e => { const W = e.sari.wind; return W.st === 'blow' ? { x: Math.cos(W.a) * SARI_WIND_PUSH, y: Math.sin(W.a) * SARI_WIND_PUSH } : null; };
const sariSegDist = (q, x, y) => { // distance from (x, y) to the strip's centre line
  const dx = q.x2 - q.x1, dy = q.y2 - q.y1, l2 = dx * dx + dy * dy, t = l2 > 1 ? clamp(((x - q.x1) * dx + (y - q.y1) * dy) / l2, 0, 1) : 0;
  return Math.hypot(x - (q.x1 + dx * t), y - (q.y1 + dy * t));
};
// how far a charge goes: a tailwind carries it farther
function sariChargeLen(e) {
  const w = sariWindVec(e); if (!w) return SARI_CHARGE_LEN;
  return SARI_CHARGE_LEN * (1 + 0.45 * Math.max(0, Math.cos(e.angle - e.sari.wind.a)));
}

/* ---- attacks ---- */
function sariOrbit(e, st, dt, R) { // circle the player at about R px, tangent plus a radial correction; a blocked boss turns around
  const p = G.player, s = e.spec, ang = Math.atan2(e.y - p.y, e.x - p.x), d = Math.hypot(e.x - p.x, e.y - p.y), tang = ang + st.sign * Math.PI / 2;
  const rad = clamp((d - R) / (2 * T), -1, 1);
  const hx = Math.cos(tang) - Math.cos(ang) * rad * 1.2, hy = Math.sin(tang) - Math.sin(ang) * rad * 1.2;
  if (e.treadT > 0) return; // a broken tread: the boss stands still (it still turns its turret in the callers)
  const des = Math.atan2(hy, hx), before = e.angle, ox = e.x, oy = e.y;
  e.angle = turnTo(e.angle, des, s.turn * dt);
  const diff = Math.abs(angDiff(e.angle, des)), spd = diff < 0.8 ? s.speed * e.speedMul * (1 - diff * 0.5) : s.speed * e.speedMul * 0.25;
  moveTank(e, Math.cos(e.angle) * spd * dt, Math.sin(e.angle) * spd * dt);
  const moved = Math.hypot(e.x - ox, e.y - oy);
  trackUpdate(e, moved, angDiff(before, e.angle));
  st.stuck = moved < spd * dt * 0.35 ? st.stuck + dt : 0;
  if (st.stuck > 0.3) { st.sign = -st.sign; st.stuck = 0; }
}
function* sariShots(e) { // çevik atış: two bursts of three shots while circling 5-7 tiles from the player; each burst warned by a 0.45 s glow
  const st = { sign: Math.random() < 0.5 ? 1 : -1, stuck: 0 }, R = rand(5, 7) * T;
  for (let b = 0; b < 2; b++) {
    for (let t = 0; t < (b ? 0.5 : 0.9); t += e.dt) { sariOrbit(e, st, e.dt, R); aimAtPlayer(e, e.dt, 1.4, e.def.lead); yield 0; }
    const tl = addTele(e, { kind: 'glow', dur: 0.45, fan: [0] });
    while (tl.t < tl.dur) { sariOrbit(e, st, e.dt, R); aimAtPlayer(e, e.dt, 1.8, e.def.lead); yield 0; }
    release(e, 'cevik', tl); removeTele(tl);
    for (let k = 0; k < 3; k++) {
      bossVolley(e, [0]);
      for (let t = 0; t < 0.13; t += e.dt) { sariOrbit(e, st, e.dt, R); aimAtPlayer(e, e.dt, 1.8, e.def.lead); yield 0; }
    }
  }
  yield 0.2;
}
// one charge: red line (1 s, the first two of the fight 1.3 s; the last 0.3 s locked), the rush, a stun when steel stopped it. Returns true when stunned.
function* sariRush(e) {
  const p = G.player, S = e.sari, margin = e.r + 4, m = G.map, dur = S.chargeN < 2 ? 1.3 : 1.0;
  S.chargeN++;
  const tl = addTele(e, { kind: 'line', dur, lock: 0.3, x: e.x, y: e.y, a: e.angle, len: SARI_CHARGE_LEN, w: 2 * (e.r + 8) });
  Sound.warnRise(volAt(e.x, e.y));
  while (tl.t < tl.dur) {
    if (tl.t < tl.dur - tl.lock) e.angle = turnTo(e.angle, Math.atan2(p.y - e.y, p.x - e.x), 4.6 * e.dt);
    e.turret = e.angle;
    tl.x = e.x; tl.y = e.y; tl.a = e.angle; tl.len = rayClip(e.x, e.y, e.angle, sariChargeLen(e), margin);
    yield 0;
  }
  release(e, 'hucum', tl);
  const ca = Math.cos(e.angle), sa = Math.sin(e.angle), plan = tl.len, clipped = plan < sariChargeLen(e) - 1;
  const strip = e.phase >= 1 ? { x1: e.x, y1: e.y, x2: e.x, y2: e.y, w: SARI_SAND_W, t: -1 } : null; // Kum izi: grows behind the boss, fades 4 s after the charge ends
  if (strip) S.sand.push(strip);
  let trav = 0, hurt = false;
  Sound.crumble(volAt(e.x, e.y) * 0.6);
  while (trav < plan) {
    const step = Math.min(SARI_RUSH * e.speedMul * e.dt, plan - trav);
    for (const [fa, lat] of [[e.r + 8, 0], [e.r + 6, 20], [e.r + 6, -20]]) { // flatten the bricks in front
      const bx = e.x + ca * fa - sa * lat, by = e.y + sa * fa + ca * lat;
      if (m.at(bx, by) === BRICK) { destroyBrick(m, Math.floor(bx / T), Math.floor(by / T), volAt(bx, by)); shake(3); }
    }
    const ox = e.x, oy = e.y;
    moveTank(e, ca * step, sa * step);
    const moved = Math.hypot(e.x - ox, e.y - oy);
    trackUpdate(e, moved, 0); trav += moved;
    if (strip) { strip.x2 = e.x - ca * e.r * 0.6; strip.y2 = e.y - sa * e.r * 0.6; }
    if (fxScale === 1) for (let k = 0; k < 2; k++) addPart('dust', e.x - ca * e.r + rand(-6, 6), e.y - sa * e.r + rand(-18, 18), -ca * rand(40, 120) + rand(-30, 30), -sa * rand(40, 120) + rand(-30, 30), rand(0.4, 0.8), rand(14, 24), 26, 2);
    if (!hurt && p.alive && dist2(e.x, e.y, p.x, p.y) < (e.r + p.r + 2) * (e.r + p.r + 2)) { // ağır hasar + geri itme
      hurt = true; damagePlayer({ x: p.x, y: p.y, dmg: bossDmg(SARI_RAM_DMG), owner: 1, vx: 0, vy: 0 });
      const side = (p.x - e.x) * -sa + (p.y - e.y) * ca < 0 ? -1 : 1;
      moveTank(p, -sa * 64 * side + ca * 30, ca * 64 * side + sa * 30); shake(9); vibrate(40);
    }
    if (moved < step * 0.35) break; // jammed against something
    yield 0;
  }
  removeTele(tl);
  if (strip) strip.t = 0;
  if (clipped || trav < plan - 6) { // steel or the edge: stunned (shorter in the storm phase)
    e.stunT = e.phase >= 2 ? 1.8 : 2.5; shake(12); explode(e.x + ca * e.r, e.y + sa * e.r, 0.7); Sound.metal(volAt(e.x, e.y)); vibrate(30);
    addText(e.x, e.y - e.r - 14, 'SERSEMLEDİ', '#bfeaff', 18);
    for (let k = 0; k < 10; k++) addPart('dust', e.x + ca * e.r + rand(-14, 14), e.y + sa * e.r + rand(-14, 14), rand(-80, 80), rand(-80, 80), rand(0.5, 0.9), rand(14, 22), 26, 2);
    return true;
  }
  return false;
}
function* sariCharge(e) { yield* sariRush(e); yield 0.3; }
function* sariDouble(e) { // çift hücum: the second line appears the moment the first charge ends (a stun cancels it)
  for (let k = 0; k < 2; k++) if (yield* sariRush(e)) break;
  yield 0.3;
}
function* sariTriple(e) { // üçlü hücum
  for (let k = 0; k < 3; k++) if (yield* sariRush(e)) break;
  yield 0.3;
}

/* ---- per-frame hook: sand strips slow the player, the wind pushes tanks, the death scene ---- */
function sariTick(e, dt) {
  const S = e.sari, p = G.player;
  if (G.phase === 'bossIntro') { if (!S.snd) { S.snd = true; Sound.wind(1, 3.4); } return; }
  if (e.dying) {
    S.sand.length = 0; S.wind.st = 'idle';
    if (!S.boom && e.deathT >= 2.1) { // the last big blast, as the whirlwind dies down
      S.boom = true; explode(e.x, e.y, 1.7); addPart('flash', e.x, e.y, 0, 0, 0.3, 220, 0, 0); addPart('ring', e.x, e.y, 0, 0, 0.7, 20, 340, 0, '240,170,60');
      sparks(e.x, e.y, 30, '#ffd27a', 420); shake(18); Sound.boom(1.6, volAt(e.x, e.y)); vibrate([50, 30, 90]);
    }
    return;
  }
  if (e.trans > 0) return;
  // sand strips (age from the end of the charge)
  for (const q of S.sand) if (q.t >= 0) q.t += dt;
  if (S.sand.some(q => q.t >= SARI_SAND_LIFE)) S.sand = S.sand.filter(q => q.t < SARI_SAND_LIFE);
  S.slow = false;
  if (p.alive) for (const q of S.sand) if (sariSegDist(q, p.x, p.y) < q.w / 2 + p.r * 0.3) { S.slow = true; break; }
  if (S.slow) { // 35% slower: take back that share of this frame's movement
    moveTank(p, -p.avx * SARI_SAND_SLOW * dt, -p.avy * SARI_SAND_SLOW * dt); p.avx *= 1 - SARI_SAND_SLOW; p.avy *= 1 - SARI_SAND_SLOW;
    if (fxScale === 1 && Math.random() < dt * 14) addPart('dust', p.x + rand(-10, 10), p.y + rand(-10, 10), rand(-20, 20), rand(-30, -5), rand(0.4, 0.7), rand(8, 14), 22, 2);
  }
  // wind (phase 3): arrows 1.5 s ahead, then 5 s of push
  const W = S.wind;
  if (e.phase >= 2) {
    if (W.st === 'idle') {
      S.windT -= dt;
      if (S.windT <= 0) { W.st = 'warn'; W.t = 0; W.a = Math.floor(Math.random() * 8) * Math.PI / 4; Sound.wind(0.9, SARI_WIND_WARN + SARI_WIND_BLOW); addText(G.map.w / 2, 70, 'RÜZGÂR', '#f08a2c', 22); }
    } else {
      W.t += dt;
      if (W.st === 'warn' && W.t >= SARI_WIND_WARN) { W.st = 'blow'; W.t = 0; }
      else if (W.st === 'blow' && W.t >= SARI_WIND_BLOW) { W.st = 'idle'; W.t = 0; S.windT = SARI_WIND_EVERY - SARI_WIND_WARN - SARI_WIND_BLOW; }
    }
  }
  const wv = sariWindVec(e);
  if (wv) {
    if (p.alive) moveTank(p, wv.x * dt, wv.y * dt);
    moveTank(e, wv.x * dt, wv.y * dt);
    if (fxScale === 1 && Math.random() < dt * 40) { const m = G.map; addPart('dust', rand(0, m.w), rand(0, m.h), wv.x * 3.5, wv.y * 3.5, rand(0.5, 0.9), rand(10, 18), 20, 0); }
  }
  // the bot drives against the wind: it steers by (its own heading x speed) - wind, from the heading the autopilot last chose
  if (bot.on && p.alive) {
    if (!(bot.mx === S.omx && bot.my === S.omy)) { S.rmx = bot.mx; S.rmy = bot.my; }
    if (wv) { const sp = p.spec.speed, vx = S.rmx * sp - wv.x, vy = S.rmy * sp - wv.y, l = Math.hypot(vx, vy) || 1; bot.mx = vx / l; bot.my = vy / l; } else { bot.mx = S.rmx; bot.my = S.rmy; }
    S.omx = bot.mx; S.omy = bot.my;
  }
}

BOSS_DEFS.sari = {
  id: 'sari', lead: 0.35, name: 'SARI FIRTINA', arena: 'kum', introSub: 'Kum Çukuru', hold: 4, phases: [66, 33], plates: ['plate', 'fender'], r: SARI_SPEC.r,
  deathText: 'SARI FIRTINA DİNDİ', loot: 'SARI FIRTINA GANİMETİ',
  barrels: [{ id: 'main', name: 'Namlu', ang: 0, k: 0.1 }],
  hp: w => Math.round(460 + (w - 10) * 23),
  attacks: [
    { id: 'cevik', w: 3, ok: e => true, run: sariShots },
    { id: 'hucum', w: 3, ok: e => e.distP > 2.5 * T && e.phase < 2, run: sariCharge, mov: true },
    { id: 'cift', w: 3, ok: e => e.distP > 2.5 * T && e.phase >= 1, run: sariDouble, mov: true },
    { id: 'uclu', w: 3, ok: e => e.distP > 2.5 * T && e.phase >= 2, run: sariTriple, mov: true }
  ],
  setup(e, w) {
    e.spec = Object.assign({}, SPECS.boss, SARI_SPEC); e.r = SARI_SPEC.r; e.pace = 1.5;
    e.sari = { chargeN: 0, sand: [], wind: { st: 'idle', t: 0, a: 0 }, windT: 5, snd: false, boom: false, slow: false, omx: NaN, omy: NaN, rmx: 0, rmy: 0 };
  },
  onPhase(e, i) {
    if (i === 1) { e.speedMul *= 1.15; addText(e.x, e.y - e.r - 54, 'EGZOZLAR YANDI', '#f08a2c', 18); }
    if (i === 2) { e.sari.windT = 4; addText(e.x, e.y - e.r - 54, 'FIRTINA', '#f08a2c', 20); }
  },
  tick: sariTick,
  onClear(e) { const S = e.sari; S.sand.length = 0; if (S.wind.st !== 'idle') { S.wind.st = 'idle'; S.windT = Math.max(S.windT, 5); } },
  danger(e, x, y, pad) { for (const q of e.sari.sand) if (sariSegDist(q, x, y) < q.w / 2 + pad) return true; return false; },
  draw: (e, g, alpha) => drawSari(e, g, alpha),
  drawGround: (e, g) => drawSariGround(e, g)
};
BOSS_ON[10] = 'sari';
/* ================= Demirkök (docs/BOSSES.md section 5) ================= */
// Orman's boss, the heavy one: a wide iron hull with two side turrets (while one lives the hull is shielded: half damage) and a twin main gun.
// Phase 1: turret fire, heavy gun, a slow crush through brick. Phase 2: Deprem (ring, slam) and Havan (circles). Phase 3 "Kök salma": it walks to the castle centre and roots;
// Demir kökler (red lines, then 8 s steel walls along them), Döner ateş (360 degree sweep with a red line 1 s ahead of the barrels); the rear exhaust takes 1.5x damage.
// Per-boss state lives in e.dk; generic hooks used from 11a: def.tick, def.danger, def.onClear, def.hullMul, def.flowGoal, def.drawGround, e.rooted (treadT), bossShell origin.
ARENAS.kale = { name: 'Orman Kalesi', gate: [[9, 5], [10, 5], [11, 5]], rows: [ // the castle's north brick wall (gate) is smashed by the boss in the intro
  'GGG...............GGG',
  'GG.................GG',
  '..........X..........',
  '.....................',
  '....SS.........SS....',
  '....SSBBB...BBBSS....',
  '.....BSS.....SSB.....',
  '.....BSS.....SSB.....',
  '.....B.SS...SS.B.....',
  'GG.................GG',
  'GG.................GG',
  'GG.................GG',
  '.....B.SS...SS.B.....',
  '.....BSS.....SSB.....',
  '.....BSS.....SSB.....',
  '....SSBBB...BBBSS....',
  '....SS.........SS....',
  '.....................',
  '..........P..........',
  'GG.................GG',
  'GGG...............GGG'] };

const DEMIR_SPEC = { speed: 38, turn: 1.3, tTurn: 1.9, len: 110, wid: 96, r: 46, tread: 15, tR: 21, barrel: 74, bW: 9, cool: 1, bSpeed: 370, dmg: 6, bR: 6, mass: 12, score: 2500,
  col: { body: '#60656c', dk: '#3b3f44', hi: '#8c929a', acc: '#c9402d' } };
const DEMIR_RAM_DMG = 46;
const DEMIR_RING = 4.5 * T, DEMIR_ROOT_LIFE = 8, DEMIR_SWEEP_W = 1.1, DEMIR_BAR = 0.11; // twin barrels sit at +-DEMIR_BAR rad from the turret
const DEMIR_FAN = [-DEMIR_BAR, DEMIR_BAR];

/* ---- shells ---- */
function demirTurretShot(e, pt) { // a single shell from a side turret, aimed at the player
  const q = partPos(e, pt), a = leadAng(q.x, q.y, e.spec.bSpeed, e.def.lead);
  bossShell(e, a, { x: q.x, y: q.y, len: 16, dmgK: 0.9 });
  const ca = Math.cos(a), sa = Math.sin(a);
  addPart('fire', q.x + ca * 16, q.y + sa * 16, ca * 60, sa * 60, 0.1, 18, 36, 0);
  for (let k = 0; k < 2; k++) addPart('smoke', q.x + ca * 14, q.y + sa * 14, ca * 36 + rand(-10, 10), sa * 36 + rand(-10, 10), rand(0.5, 0.8), 12, 24, 3);
  shake(1.5 * prox(e.x, e.y)); Sound.shoot(false, true, volAt(e.x, e.y) * 0.8);
}
function demirSoften(e, fan) { // the heavy shell breaks a brick in one hit: bricks right in front of the muzzle drop to 2 HP (a big shell takes 2)
  const m = G.map;
  for (const off of fan) for (let d = 6; d <= e.spec.barrel + 12; d += 6) {
    const bx = e.x + Math.cos(e.turret + off) * d, by = e.y + Math.sin(e.turret + off) * d;
    if (m.at(bx, by) === BRICK) { const i = Math.floor(by / T) * m.n + Math.floor(bx / T); m.hp[i] = Math.min(m.hp[i], 2); break; }
  }
}
function demirHeavyVolley(e) { // two big, slow shells
  demirSoften(e, DEMIR_FAN);
  const n0 = G.bullets.length;
  bossVolley(e, DEMIR_FAN, { speed: 0.55, dmgK: 1.7 });
  for (let i = n0; i < G.bullets.length; i++) { const b = G.bullets[i]; b.heavy = true; b.r *= 1.6; }
  shake(6);
}
function demirStreamShot(e, off) { // one shell of the rotating stream: light, small, does not smash bricks in two hits
  if (barrelSilent(e, off)) return;
  const n0 = G.bullets.length;
  bossShell(e, e.turret + off, { dmgK: 0.55 });
  for (let i = n0; i < G.bullets.length; i++) { const b = G.bullets[i]; b.big = false; b.r *= 0.8; }
  e.recoil = 0.6;
  const mx = e.x + Math.cos(e.turret + off) * (e.spec.barrel + 3), my = e.y + Math.sin(e.turret + off) * (e.spec.barrel + 3);
  addPart('fire', mx, my, 0, 0, 0.08, 14, 26, 0);
  if (Math.random() < 0.3) addPart('smoke', mx, my, rand(-14, 14), rand(-14, 14), rand(0.4, 0.7), 10, 22, 3);
}

/* ---- phase 1 ---- */
function* demirTurrets(e) { // taret ateşi: the side turrets take turns, one shell each, red eye 0.45 s first
  const dk = e.dk, n = e.phase >= 2 ? 6 : 4;
  for (let k = 0; k < n; k++) {
    const live = e.parts.filter(q => q.alive); if (!live.length) break;
    const pt = live.length === 1 ? live[0] : live[(dk.side++) % live.length];
    dk.who = pt.id;
    const tl = addTele(e, { kind: 'glow', dur: 0.45 });
    while (tl.t < tl.dur) { aimAtPlayer(e, e.dt, 0.9, e.def.lead); yield 0; }
    release(e, 'taret', tl); removeTele(tl);
    if (pt.alive) demirTurretShot(e, pt);
    dk.who = ''; yield 0.28;
  }
  yield 0.3;
}
function* demirHeavy(e) { // ağır top: both barrels glow 0.8 s, then two big slow shells
  e.dk.who = 'main';
  yield* glowAim(e, 'agir', 0.8, DEMIR_FAN);
  demirHeavyVolley(e);
  e.dk.who = ''; yield 0.9;
}
function* demirCrush(e) { // ezme: red line 1 s (last 0.3 s locked), then a slow march that flattens bricks; steel stops it (no stun: it simply turns)
  const p = G.player, m = G.map, margin = e.r + 4, LEN = 7 * T;
  const tl = addTele(e, { kind: 'line', dur: 1.0, lock: 0.3, x: e.x, y: e.y, a: e.angle, len: LEN, w: 2 * (e.r + 6) });
  Sound.warnRise(volAt(e.x, e.y));
  while (tl.t < tl.dur) {
    if (tl.t < tl.dur - tl.lock) e.angle = turnTo(e.angle, Math.atan2(p.y - e.y, p.x - e.x), 2.2 * e.dt);
    aimAtPlayer(e, e.dt, 0.6);
    tl.x = e.x; tl.y = e.y; tl.a = e.angle; tl.len = rayClip(e.x, e.y, e.angle, LEN, margin);
    yield 0;
  }
  release(e, 'ezme', tl);
  const ca = Math.cos(e.angle), sa = Math.sin(e.angle), plan = tl.len;
  let trav = 0, hurt = false;
  while (trav < plan) {
    const step = Math.min(165 * e.speedMul * e.dt, plan - trav);
    for (const [fa, lat] of [[e.r + 8, 0], [e.r + 8, 22], [e.r + 8, -22], [e.r + 8, 42], [e.r + 8, -42], [e.r - 4, 52], [e.r - 4, -52]]) { // flatten the bricks in front (never steel)
      const bx = e.x + ca * fa - sa * lat, by = e.y + sa * fa + ca * lat;
      if (m.at(bx, by) === BRICK) { destroyBrick(m, Math.floor(bx / T), Math.floor(by / T), volAt(bx, by)); shake(4); }
    }
    const ox = e.x, oy = e.y;
    moveTank(e, ca * step, sa * step);
    const moved = Math.hypot(e.x - ox, e.y - oy);
    trackUpdate(e, moved, 0); trav += moved;
    if (fxScale === 1 && Math.random() < 0.7) addPart('dust', e.x - ca * e.r, e.y - sa * e.r + rand(-18, 18), rand(-30, 30), rand(-30, 30), rand(0.4, 0.8), rand(14, 24), 26, 2);
    if (!hurt && p.alive && dist2(e.x, e.y, p.x, p.y) < (e.r + p.r + 2) * (e.r + p.r + 2)) {
      hurt = true; damagePlayer({ x: p.x, y: p.y, dmg: bossDmg(DEMIR_RAM_DMG), owner: 1, vx: 0, vy: 0 });
      const side = (p.x - e.x) * -sa + (p.y - e.y) * ca < 0 ? -1 : 1; moveTank(p, -sa * 56 * side + ca * 24, ca * 56 * side + sa * 24); shake(8); vibrate(30);
    }
    if (moved < step * 0.35) break; // jammed against something
    yield 0;
  }
  removeTele(tl);
  yield 0.5;
}

/* ---- phase 2 ---- */
function* demirQuake(e) { // deprem: it stops and lifts, ring of 4.5 tiles 1.2 s, slam; steel in between protects, bricks inside lose 1 HP
  const dk = e.dk, m = G.map, p = G.player, R = DEMIR_RING, tl = addTele(e, { kind: 'ring', dur: 1.2, r: R });
  Sound.warnRise(volAt(e.x, e.y));
  while (tl.t < tl.dur) { dk.lift = Math.min(1, tl.t / 1.0); if (fxScale === 1 && Math.random() < 0.3) addPart('dust', e.x + rand(-e.r, e.r), e.y + e.r * 0.8, rand(-20, 20), rand(10, 40), rand(0.5, 0.9), rand(10, 18), 22, 2); aimAtPlayer(e, e.dt, 0.4); yield 0; }
  release(e, 'deprem', tl); removeTele(tl);
  dk.lift = 0;
  addPart('ring', e.x, e.y, 0, 0, 0.55, 20, R * 2.1, 0, '210,200,170'); addPart('flash', e.x, e.y, 0, 0, 0.2, 160, 0, 0);
  for (let k = 0, n = Math.round(14 * fxScale); k < n; k++) { const a = k * TAU / n; addPart('dust', e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 60, Math.cos(a) * 180, Math.sin(a) * 180, rand(0.6, 1), rand(18, 28), 34, 1.5); }
  shake(16); Sound.boom(1.6, volAt(e.x, e.y)); vibrate([40, 30, 70]);
  if (p.alive && dist2(e.x, e.y, p.x, p.y) < (R + p.r) * (R + p.r) && !steelBetween(e.x, e.y, p.x, p.y)) {
    damagePlayer({ x: p.x, y: p.y, dmg: bossDmg(18), owner: 1, vx: 0, vy: 0 });
    const a = Math.atan2(p.y - e.y, p.x - e.x); moveTank(p, Math.cos(a) * 70, Math.sin(a) * 70);
  }
  for (let r = 0; r < m.n; r++) for (let c = 0; c < m.n; c++) { // bricks inside the ring: 1 HP less (steel between protects them too)
    const i = r * m.n + c; if (m.t[i] !== BRICK) continue;
    const x = c * T + T / 2, y = r * T + T / 2;
    if (dist2(e.x, e.y, x, y) > R * R || steelBetween(e.x, e.y, x, y)) continue;
    m.hp[i] = Math.max(0, m.hp[i] - 1);
    if (m.hp[i] === 0) destroyBrick(m, c, r, volAt(x, y)); else { paintRegion(m, c - 1, r - 1, c + 1, r + 1); Sound.brick(volAt(x, y)); }
  }
  yield 0.6;
}
function* demirMortar(e) { // havan: five circles around the player and ahead of where they are heading (shells fall over walls)
  const p = G.player, m = G.map, circ = [], vx = p.vx || 0, vy = p.vy || 0;
  const at = (x, y) => circ.push(addTele(e, { kind: 'circle', r: 56, x: clamp(x, T, m.w - T), y: clamp(y, T, m.h - T) }));
  Sound.warnRise(volAt(e.x, e.y));
  at(p.x + vx * 0.7, p.y + vy * 0.7); at(p.x + vx * 1.3, p.y + vy * 1.3); at(p.x + rand(-18, 18), p.y + rand(-18, 18));
  for (let i = 0; i < 2; i++) { const a = rand(0, TAU), d = rand(80, 140); at(p.x + vx * 0.7 + Math.cos(a) * d, p.y + vy * 0.7 + Math.sin(a) * d); }
  while (circ[0].t < circ[0].dur) { aimAtPlayer(e, e.dt, 0.5); yield 0; }
  for (const tl of circ) { release(e, 'havan', tl); removeTele(tl); bossBlast(tl.x, tl.y, 56, 14); yield 0.05; }
  yield 0.4;
}

/* ---- phase 3: Kök salma ---- */
const demirCentre = e => ({ x: G.map.w / 2, y: G.map.h / 2 });
function* demirRoot(e) { // walks to the castle centre and roots (no more movement; the rear exhaust becomes the weak point)
  const dk = e.dk, c = demirCentre(e), s = e.spec;
  dk.walk = true; e.flowT = 0; Sound.warnRise(volAt(e.x, e.y));
  addText(e.x, e.y - e.r - 24, 'KÖK SALMA', '#c9402d', 22);
  for (let t = 0; t < 18 && Math.hypot(c.x - e.x, c.y - e.y) > 8; t += e.dt) {
    const d = Math.hypot(c.x - e.x, c.y - e.y);
    if (d < 1.4 * T) { // the last stretch: straight in
      const a = Math.atan2(c.y - e.y, c.x - e.x), before = e.angle, ox = e.x, oy = e.y, sp = Math.min(d, s.speed * e.speedMul * e.dt);
      e.angle = turnTo(e.angle, a, s.turn * e.dt); moveTank(e, Math.cos(a) * sp, Math.sin(a) * sp);
      trackUpdate(e, Math.hypot(e.x - ox, e.y - oy), angDiff(before, e.angle));
    } else bossMove(e, e.dt, 0);
    aimAtPlayer(e, e.dt, 0.7);
    yield 0;
  }
  dk.walk = false; e.avx = e.avy = 0;
  for (let t = 0; t < 0.9; t += e.dt) { // settling: the roots go down
    dk.root = Math.min(1, dk.root + e.dt * 1.2); e.shake = 0;
    if (fxScale === 1 && Math.random() < 0.5) addPart('dust', e.x + rand(-e.r, e.r), e.y + rand(-e.r, e.r), rand(-40, 40), rand(-40, 40), rand(0.5, 0.9), rand(14, 22), 24, 2);
    aimAtPlayer(e, e.dt, 0.7); yield 0;
  }
  e.rooted = true; e.pace = 1.05; shake(14); Sound.boom(1.5, volAt(e.x, e.y)); explode(e.x, e.y + e.r * 0.5, 0.6);
  addText(e.x, e.y - e.r - 24, 'KÖK SALDI: ARKASI AÇIK', '#ffb04a', 18);
  yield 0.5;
}
// tiles along an angle from the boss, outside its own 3x3 block; empty ground and bush only, a wall, water or another root ends the line
function demirRootTiles(e, a, count) {
  const m = G.map, bc = Math.floor(e.x / T), br = Math.floor(e.y / T), out = [], seen = new Set(), ca = Math.cos(a), sa = Math.sin(a);
  for (let d = T * 1.1; d < T * 14 && out.length < count; d += T / 4) {
    const c = Math.floor((e.x + ca * d) / T), r = Math.floor((e.y + sa * d) / T);
    if (c < 0 || r < 0 || c >= m.n || r >= m.n) break;
    const i = r * m.n + c; if (seen.has(i)) continue; seen.add(i);
    if (Math.abs(c - bc) <= 1 && Math.abs(r - br) <= 1) continue;
    const v = m.t[i]; if (v === EMPTY || v === BUSH) out.push({ c, r }); else break;
  }
  return out;
}
// does the player still reach (at least a third of) the open ground when these tiles are steel? (no sealed pockets)
function demirRootsSafe(tiles) {
  const m = G.map, n = m.n, p = G.player, add = new Set(tiles.map(q => q.r * n + q.c));
  const open = i => !blocksTank(m.t[i]) && !add.has(i);
  let total = 0; for (let i = 0; i < n * n; i++) if (open(i)) total++;
  const c0 = clamp(Math.floor(p.x / T), 0, n - 1), r0 = clamp(Math.floor(p.y / T), 0, n - 1), s0 = r0 * n + c0;
  if (!open(s0)) return true; // already under a root: it will be pushed out
  const seen = new Uint8Array(n * n), q = [s0]; seen[s0] = 1;
  for (let h = 0; h < q.length; h++) { const i = q[h], c = i % n, r = (i - c) / n; for (const [dx, dy] of DIRS) { const x = c + dx, y = r + dy; if (x < 0 || y < 0 || x >= n || y >= n) continue; const j = y * n + x; if (!seen[j] && open(j)) { seen[j] = 1; q.push(j); } } }
  return q.length >= total / 3;
}
function demirRootAdd(e, c, r) {
  const m = G.map, i = r * m.n + c, x = c * T + T / 2, y = r * T + T / 2;
  e.dk.roots.push({ c, r, t: 0, orig: m.t[i], seed: (c * 31 + r * 17) % 97 });
  m.t[i] = STEEL; m.hp[i] = 0; m.flowDirty = true; miniTile(m, c, r); paintRegion(m, c - 1, r - 1, c + 1, r + 1);
  for (let k = 0, n = Math.max(3, Math.round(7 * fxScale)); k < n; k++) { const a = rand(0, TAU), v = rand(50, 160); addPart('debris', x + rand(-14, 14), y + rand(-14, 14), Math.cos(a) * v, Math.sin(a) * v, rand(0.5, 1), rand(3, 6), 0, 3.5, k & 1 ? '#3b3f44' : '#2a1d16'); }
}
function demirRootDrop(e, q) {
  const m = G.map, i = q.r * m.n + q.c, x = q.c * T + T / 2, y = q.r * T + T / 2;
  if (m.t[i] === STEEL) { m.t[i] = q.orig; m.hp[i] = 0; m.flowDirty = true; miniTile(m, q.c, q.r); paintRegion(m, q.c - 1, q.r - 1, q.c + 1, q.r + 1); }
  for (let k = 0, n = Math.max(2, Math.round(5 * fxScale)); k < n; k++) addPart('dust', x + rand(-16, 16), y + rand(-16, 16), rand(-30, 30), rand(-30, 30), rand(0.5, 0.9), rand(14, 22), 24, 2);
}
// a root rose under the player: damage and a shove to the nearest free spot
function demirEject(p) {
  const m = G.map, k = p.r * 0.8, clear = (x, y) => !(blocksTank(m.at(x, y)) || blocksTank(m.at(x + k, y)) || blocksTank(m.at(x - k, y)) || blocksTank(m.at(x, y + k)) || blocksTank(m.at(x, y - k)));
  if (clear(p.x, p.y)) return false;
  for (let d = 6; d <= T * 3; d += 6) for (let i = 0; i < 16; i++) { const a = i * TAU / 16, x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d; if (clear(x, y)) { p.x = x; p.y = y; return true; } }
  return true;
}
function* demirRoots(e) { // demir kökler: 2-3 red lines (1 s, last 0.3 s locked), then each becomes a 4-6 tile steel wall for 8 s
  const p = G.player, base = Math.atan2(p.y - e.y, p.x - e.x) + rand(-0.5, 0.5), nLines = e.hp / e.maxHp < 0.18 ? 3 : 2 + (Math.random() < 0.5 ? 1 : 0), lines = [];
  Sound.warnRise(volAt(e.x, e.y));
  for (let k = 0; k < nLines; k++) {
    const n = randInt(4, 6); let a = 0, tiles = [];
    for (let tr = 0; tr < 8 && tiles.length < 4; tr++) { // a spoke that runs into steel at once is turned a little
      const a1 = base + k * TAU / nLines + (tr ? rand(-0.9, 0.9) : rand(-0.15, 0.15)), t1 = demirRootTiles(e, a1, n);
      if (t1.length > tiles.length) { a = a1; tiles = t1; }
    }
    if (tiles.length < 2) continue;
    lines.push({ a, tiles, tl: addTele(e, { kind: 'line', dur: 1.0, lock: 0.3, x: e.x, y: e.y, a, len: (tiles.length + 1.4) * T, w: T * 0.85 }) });
  }
  if (!lines.length) { yield 0.5; return; }
  while (lines[0].tl.t < lines[0].tl.dur) { aimAtPlayer(e, e.dt, 0.6); yield 0; }
  const taken = [];
  for (const L of lines) { release(e, 'kok', L.tl); removeTele(L.tl); if (demirRootsSafe(taken.concat(L.tiles))) taken.push(...L.tiles); }
  for (const q of taken) demirRootAdd(e, q.c, q.r);
  shake(7); Sound.crumble(volAt(e.x, e.y));
  if (p.alive && demirEject(p)) { damagePlayer({ x: p.x, y: p.y, dmg: bossDmg(12), owner: 1, vx: 0, vy: 0 }); shake(8); vibrate(30); }
  yield 0.5;
}
const demirWallRay = (e, a, max) => { const m = G.map, ca = Math.cos(a), sa = Math.sin(a); for (let d = 12; d < max; d += 8) if (isWall(m.at(e.x + ca * d, e.y + sa * d))) return d; return max; };
function* demirSweep(e) { // döner ateş: the red sweep line starts moving at once and runs 1 s ahead of the barrels; the barrels follow with a continuous stream through 360 degrees
  const p = G.player, dk = e.dk, W = DEMIR_SWEEP_W * (Math.random() < 0.5 ? -1 : 1), a0 = Math.atan2(p.y - e.y, p.x - e.x), END = TAU / Math.abs(W);
  Sound.warnRise(volAt(e.x, e.y));
  for (let t = 0; t < 0.6 && Math.abs(angDiff(e.turret, a0)) > 0.04; t += e.dt) { e.turret = turnTo(e.turret, a0, 7 * e.dt); yield 0; }
  e.turret = a0;
  const tl = addTele(e, { kind: 'line', dur: 1.0, lock: 0.3, x: e.x, y: e.y, a: a0, len: demirWallRay(e, a0, 15 * T), w: 40 });
  const sw = dk.sw = { a0, W, t: 0, lead: a0, bar: a0, end: 1 + END, fired: false }; let shotT = 0, side = 0;
  while (sw.t < sw.end) {
    sw.t += e.dt;
    sw.lead = a0 + W * Math.min(sw.t, END); sw.bar = a0 + W * clamp(sw.t - 1, 0, END);
    e.turret = sw.bar;
    if (!sw.fired && tl.t >= tl.dur) { sw.fired = true; release(e, 'doner', tl); removeTele(tl); }
    if (sw.fired) {
      shotT -= e.dt;
      while (shotT <= 0) { shotT += 0.1; demirStreamShot(e, DEMIR_FAN[side++ & 1]); }
      if (Math.random() < e.dt * 4) Sound.shoot(false, true, volAt(e.x, e.y) * 0.5);
    }
    yield 0;
  }
  dk.sw = null; yield 0.6;
}

/* ---- per-frame hook ---- */
function demirTick(e, dt) {
  const dk = e.dk, m = G.map;
  if (G.phase === 'bossIntro') { // the ground thumps three times, then the boss breaks through the north wall (11a)
    [0.25, 0.75, 1.25].forEach((tt, i) => {
      if (dk.step[i] || G.phaseT < tt) return;
      dk.step[i] = true; shake(9 + i * 2); Sound.boom(1.2 + i * 0.15, 1); vibrate(30);
      for (let k = 0, n = Math.round(8 * fxScale); k < n; k++) addPart('dust', e.x + rand(-60, 60), e.y + e.r * 0.9, rand(-50, 50), rand(10, 50), rand(0.6, 1.1), rand(14, 24), 26, 2);
    });
    return;
  }
  if (!e.gen) { dk.who = ''; if (dk.lift > 0) dk.lift = Math.max(0, dk.lift - dt * 5); }
  dk.weakT = Math.max(0, dk.weakT - dt);
  dk.root = e.rooted && !e.dying ? Math.min(1, dk.root + dt * 1.5) : e.dying ? Math.max(0, dk.root - dt * 0.6) : (dk.walk ? dk.root : Math.max(0, dk.root - dt * 1.5));
  const sh = e.parts.some(q => q.alive);
  if (dk.sh && !sh && !e.dying) { dk.sh = false; addPart('ring', e.x, e.y, 0, 0, 0.6, 30, 150, 0, '150,190,230'); addText(e.x, e.y - e.r - 30, 'KALKAN DÜŞTÜ', '#9ec9ee', 18); sparks(e.x, e.y, 16, '#bfe0ff', 300); }
  for (const b of G.bullets) { // heavy shells: a brick straight ahead drops to 2 HP so that the big shell (2 damage) breaks it in one hit
    if (!b.heavy || b.dead) continue;
    const sp = Math.hypot(b.vx, b.vy) || 1, bx = b.x + b.vx / sp * 10, by = b.y + b.vy / sp * 10;
    if (m.at(bx, by) === BRICK) { const i = Math.floor(by / T) * m.n + Math.floor(bx / T); m.hp[i] = Math.min(m.hp[i], 2); }
  }
  if (e.dying) {
    if (!dk.dis) { dk.dis = true; for (const q of dk.roots) q.t = Math.max(q.t, DEMIR_ROOT_LIFE - 1.2); dk.sw = null; dk.lift = 0; e.rooted = false; } // the roots crack and dissolve
    if (!dk.boom && e.deathT >= 2.1) {
      dk.boom = true; explode(e.x, e.y, 1.8); addPart('flash', e.x, e.y, 0, 0, 0.3, 240, 0, 0); addPart('ring', e.x, e.y, 0, 0, 0.7, 20, 360, 0, '200,170,140');
      sparks(e.x, e.y, 34, '#ffd27a', 440); shake(20); Sound.boom(1.8, volAt(e.x, e.y)); vibrate([50, 30, 90]);
    }
  }
  for (let k = dk.roots.length - 1; k >= 0; k--) {
    const q = dk.roots[k]; q.t += dt;
    if (q.t >= DEMIR_ROOT_LIFE) { demirRootDrop(e, q); dk.roots.splice(k, 1); }
    else if (q.t > DEMIR_ROOT_LIFE - 1.2 && fxScale === 1 && Math.random() < dt * 8) addPart('dust', q.c * T + rand(6, T - 6), q.r * T + rand(6, T - 6), rand(-14, 14), rand(-30, -8), rand(0.4, 0.7), rand(8, 14), 20, 2);
  }
}

/* ---- definition ---- */
const demirMob = e => e.phase < 2 || e.rooted; // before phase 3 and once rooted the usual attacks; in between it is walking to the centre
BOSS_DEFS.demirkok = {
  id: 'demirkok', lead: 0.35, name: 'DEMİRKÖK', arena: 'kale', introSub: 'Orman Kalesi', hold: 4.5, phases: [66, 33], plates: ['plate', 'fender'], r: DEMIR_SPEC.r,
  deathText: 'DEMİRKÖK DEVRİLDİ', loot: 'DEMİRKÖK GANİMETİ',
  barrels: [{ id: 'l', name: 'Sol namlu', ang: -DEMIR_BAR, k: 0.07 }, { id: 'r', name: 'Sağ namlu', ang: DEMIR_BAR, k: 0.07 }],
  hp: w => Math.round(1020 + (w - 20) * 27),
  attacks: [
    { id: 'taret', w: 3, ok: e => demirMob(e) && e.parts.some(q => q.alive), run: demirTurrets },
    { id: 'agir', w: 2.4, ok: e => demirMob(e), run: demirHeavy },
    { id: 'ezme', w: 2.2, ok: e => e.phase < 2 && e.distP > 3 * T, run: demirCrush, mov: true },
    { id: 'deprem', w: 2.6, ok: e => e.phase === 1 && e.distP < 7 * T, run: demirQuake },
    { id: 'havan', w: 2.6, ok: e => e.phase >= 1 && demirMob(e), run: demirMortar, arc: true },
    { id: 'kok', w: 100, ok: e => e.phase >= 2 && !e.rooted, run: demirRoot, mov: true },
    { id: 'koker', w: 3, ok: e => e.rooted, run: demirRoots, cd: 5 },
    { id: 'doner', w: 2.4, ok: e => e.rooted, run: demirSweep, cd: 11 }
  ],
  setup(e, w) {
    e.spec = Object.assign({}, SPECS.boss, DEMIR_SPEC); e.r = DEMIR_SPEC.r; e.pace = 1.2;
    const hp = Math.max(2, Math.round(e.maxHp * 0.12));
    for (const [id, name, oy] of [['tl', 'Sol taret', -27], ['tr', 'Sağ taret', 27]]) e.parts.push({ id, name, atk: 'taret', ox: 8, oy, r: 12, maxHp: hp, hp, alive: true, flash: 0 });
    e.dk = { rooted: false, walk: false, lift: 0, who: '', side: 0, roots: [], sw: null, step: [false, false, false], root: 0, weakT: 0, sh: true, dis: false, boom: false };
  },
  onPhase(e, i) {
    if (i === 1) addText(e.x, e.y - e.r - 54, 'ZIRH DÜŞTÜ', '#ff9a6c', 18);
    if (i === 2) { e.cool = Math.min(e.cool, 0.2); }
  },
  onPartBreak(e, pt) { spawnPiece(e, 'shoulder', false); },
  tick: demirTick,
  onClear(e) { const dk = e.dk; dk.sw = null; dk.lift = 0; dk.who = ''; },
  flowGoal: e => (e.dk.walk ? demirCentre(e) : null),
  hullMul(e, x, y, dir, direct, quiet) {
    if (!direct && !quiet) return 1; // the nuke is a flat blow
    let k = e.parts.some(q => q.alive) ? 0.5 : 1; // shielded while a turret lives
    if (e.rooted && direct && dir !== undefined) { // weak point: the rear exhaust
      const lx = Math.cos(e.angle) * (x - e.x) + Math.sin(e.angle) * (y - e.y);
      if (lx < -e.spec.len * 0.2 && Math.abs(angDiff(e.angle + Math.PI, dir)) < 1.0) { k *= 1.5; e.dk.weakT = 0.25; sparks(x, y, 4, '#ff8a4a', 220, dir, 1); }
    }
    return k;
  },
  danger(e, x, y, pad) { // the sweep: the wedge between the barrels and the red line 1 s ahead is dangerous where the shells can reach
    const sw = e.dk.sw; if (!sw) return false;
    const dx = x - e.x, dy = y - e.y, d = Math.hypot(dx, dy); if (d > 17 * T) return false;
    const s = Math.sign(sw.W), rel = ((((Math.atan2(dy, dx) - sw.bar) * s) % TAU) + TAU) % TAU, span = Math.abs(sw.lead - sw.bar), pa = Math.atan2(pad + 16, Math.max(d, 1));
    if (!(rel <= span + pa || rel >= TAU - pa - 0.15)) return false;
    return d < e.r + 10 || los(e.x, e.y, x, y);
  },
  draw: (e, g, alpha) => drawDemirkok(e, g, alpha),
  drawGround: (e, g) => drawDemirkokGround(e, g)
};
BOSS_ON[20] = 'demirkok';
/* ================= input ================= */
let STICK_R = 56; // set from the joystick size setting
const mkStick = () => ({ id: null, ox: 0, oy: 0, vx: 0, vy: 0, t0: 0, max: 0 });
const sticks = { move: mkStick(), aim: mkStick() };
const keys = new Set();
const mouse = { x: -1, y: -1, down: false, lastMove: -1e9, lastDown: -1e9 };
const input = { touch: !!(window.matchMedia && matchMedia('(pointer: coarse)').matches), mouseAim: false, keyMoveAt: -1e9 };
let tapFire = false;
const KEYS = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', Space: 'fire' };
function releaseInput() {
  for (const st of [sticks.move, sticks.aim]) { st.id = null; st.vx = st.vy = 0; }
  keys.clear(); mouse.down = false; tapFire = false;
}
window.addEventListener('keydown', e => {
  const focusBtn = document.activeElement && document.activeElement.tagName === 'BUTTON';
  if ((e.code === 'Escape' || e.code === 'KeyP') && subOpen()) { if (e.code === 'Escape') closeSub(); e.preventDefault(); return; }
  if (e.code === 'KeyP' || e.code === 'Escape') { if (G.state === 'play') pauseGame(); else if (G.state === 'paused') resumeGame(); e.preventDefault(); return; }
  if (e.code === 'KeyM' && !e.repeat) { toggleSound(); return; }
  if (nukeKey(e)) return; // hook (C): N key etc.
  if (G.state === 'play' && G.phase === 'upgrade' && !subOpen()) {
    const n = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[e.code];
    if (n !== undefined) { e.preventDefault(); if (!e.repeat && upChoices[n]) chooseUpgrade(upChoices[n]); return; }
  }
  if ((e.code === 'Enter' || e.code === 'NumpadEnter') && !e.repeat && !focusBtn && !subOpen() && (G.state === 'menu' || G.state === 'over')) { e.preventDefault(); startGame(null); return; }
  const k = KEYS[e.code];
  if (!k) return;
  if (G.state === 'play') { e.preventDefault(); if (focusBtn) document.activeElement.blur(); }
  keys.add(k);
  if (k !== 'fire') input.keyMoveAt = performance.now();
  input.touch = false;
});
window.addEventListener('keyup', e => { const k = KEYS[e.code]; if (k) keys.delete(k); });
window.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { mouse.x = e.clientX; mouse.y = e.clientY; } });
window.addEventListener('pointerup', e => { if (e.pointerType === 'mouse' && e.button === 0) mouse.down = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  Sound.init(); Sound.resume();
  bossIntroTap(); // a seen boss intro is skipped with a tap
  if (e.pointerType === 'mouse') {
    input.touch = false; input.mouseAim = true; mouse.x = e.clientX; mouse.y = e.clientY; mouse.lastMove = mouse.lastDown = performance.now();
    if (e.button === 0) mouse.down = true;
    return;
  }
  e.preventDefault();
  input.touch = true; canvas.classList.remove('aim');
  if (G.state === 'menu') { menu.aim = toWorld(e.clientX, e.clientY); menu.aimAt = performance.now(); menu.shot = true; return; }
  if (G.state !== 'play' || G.phase === 'upgrade') return;
  const st = (e.clientX < view.w / 2) !== SET.swapSticks ? sticks.move : sticks.aim;
  if (st.id !== null) return;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  st.id = e.pointerId; st.ox = e.clientX; st.oy = e.clientY; st.vx = st.vy = 0; st.t0 = performance.now(); st.max = 0;
}, { passive: false });
canvas.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') {
    mouse.x = e.clientX; mouse.y = e.clientY;
    // browsers send synthetic mouse moves on layout changes; only a real movement switches to mouse aiming
    if (e.movementX || e.movementY) { mouse.lastMove = performance.now(); input.mouseAim = true; input.touch = false; }
    return;
  }
  e.preventDefault();
  if (G.state === 'menu') { menu.aim = toWorld(e.clientX, e.clientY); menu.aimAt = performance.now(); return; }
  for (const st of [sticks.move, sticks.aim]) {
    if (st.id !== e.pointerId) continue;
    let dx = e.clientX - st.ox, dy = e.clientY - st.oy; const d = Math.hypot(dx, dy);
    if (d > STICK_R) { st.ox += dx / d * (d - STICK_R); st.oy += dy / d * (d - STICK_R); dx = e.clientX - st.ox; dy = e.clientY - st.oy; }
    st.vx = dx / STICK_R; st.vy = dy / STICK_R; st.max = Math.max(st.max, Math.hypot(st.vx, st.vy));
  }
}, { passive: false });
function endPointer(e) {
  if (e.pointerType === 'mouse') { if (e.type !== 'pointerup' || e.button === 0) mouse.down = false; return; }
  for (const st of [sticks.move, sticks.aim]) {
    if (st.id !== e.pointerId) continue;
    if (st === sticks.aim && e.type === 'pointerup' && performance.now() - st.t0 < 230 && st.max < 0.35) tapFire = true;
    st.id = null; st.vx = st.vy = 0;
  }
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('lostpointercapture', endPointer);
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
window.addEventListener('blur', () => { keys.clear(); mouse.down = false; pauseGame(); });

function autoTarget(p, base, cone) { // sets autoTarget.lastD to the distance of the chosen target
  let best = null, bestScore = 1e9;
  for (const e of G.enemies) {
    if (e.dead || (e.hidden && !upL('thermal')) || !onScreen(e.x, e.y, 0)) continue;
    const a = Math.atan2(e.y - p.y, e.x - p.x), d = Math.hypot(e.x - p.x, e.y - p.y);
    const da = base === null ? 0 : Math.abs(angDiff(base, a));
    if (da > cone || !los(p.x, p.y, e.x, e.y)) continue;
    const sc = da * 300 + d; if (sc < bestScore) { bestScore = sc; best = a; autoTarget.lastD = d; }
  }
  return best;
}

/* ================= player ================= */
const bot = { on: false, mx: 0, my: 0, aim: null, fire: false, t: 0, dist: 0, sd: 1, tank: 'random' }; // dist: shot distance for the Obüs; tank: evolution pick (id, 'random' or a function of the offered ids)
function updatePlayer(p, dt) {
  const s = p.spec, m = G.map, now = performance.now();
  p.cool -= dt; p.flash = Math.max(0, p.flash - dt); p.recoil = Math.max(0, p.recoil - dt * 7);
  let ix = 0, iy = 0, thr = 0;
  const mv = sticks.move;
  if (bot.on) { ix = bot.mx; iy = bot.my; thr = 1; }
  else if (mv.id !== null) { const mag = Math.hypot(mv.vx, mv.vy); if (mag > 0.15) { ix = mv.vx / mag; iy = mv.vy / mag; thr = clamp((mag - 0.15) / 0.45, 0.4, 1); } }
  else {
    const kx = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0), ky = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0);
    if (kx || ky) { const l = Math.hypot(kx, ky); ix = kx / l; iy = ky / l; thr = 1; }
  }
  const before = p.angle;
  let tvx = 0, tvy = 0;
  const turbo = G.buffs.speed > 0 ? 1.45 : 1;
  if (thr > 0) {
    const target = Math.atan2(iy, ix);
    p.angle = turnTo(p.angle, target, s.turn * (turbo > 1 ? 1.25 : 1) * dt);
    const al = Math.cos(angDiff(p.angle, target)), spd = al > 0 ? s.speed * turbo * thr * al * al * pushK(p) : 0; // pushK: Çift Yön volley boost
    tvx = Math.cos(p.angle) * spd; tvy = Math.sin(p.angle) * spd;
  }
  const k = 1 - Math.exp(-12 * dt);
  p.vx += (tvx - p.vx) * k; p.vy += (tvy - p.vy) * k;
  const ox = p.x, oy = p.y;
  moveTank(p, p.vx * dt, p.vy * dt);
  if (dt > 0) { p.avx = (p.x - ox) / dt; p.avy = (p.y - oy) / dt; }
  trackUpdate(p, (p.x - ox) * Math.cos(p.angle) + (p.y - oy) * Math.sin(p.angle), angDiff(before, p.angle));
  const moving = Math.hypot(p.vx, p.vy) > 50, bx = p.x - Math.cos(p.angle) * s.len * 0.55, by = p.y - Math.sin(p.angle) * s.len * 0.55;
  if (turbo > 1 && moving && Math.random() < dt * 22) addPart('glow', bx + rand(-4, 4), by + rand(-4, 4), -p.vx * 0.2, -p.vy * 0.2, 0.32, 15, -24, 2, 'pu_speed');
  if (upL('engine') && moving && fxScale === 1 && Math.random() < dt * (2 + upL('engine'))) addPart('smoke', bx, by, -p.vx * 0.15 + rand(-8, 8), -p.vy * 0.15 + rand(-8, 8), rand(0.4, 0.7), rand(6, 9), 22, 2);

  let aim = null, firing = false, aimD = 6 * T; // aimD: how far the shot should go (Obus lob); 6 tiles when nothing says otherwise
  const am = sticks.aim;
  if (bot.on) { aim = bot.aim; firing = bot.fire; if (bot.dist) aimD = bot.dist; }
  else if (am.id !== null) {
    const mag = Math.hypot(am.vx, am.vy);
    if (mag > 0.22) {
      aim = Math.atan2(am.vy, am.vx);
      aimD = (2.5 + 8.5 * clamp((mag - 0.32) / 0.68, 0, 1)) * T; // stick deflection 0.32..1 -> 2.5..11 tiles
      if (SET.aimAssist) { const as = autoTarget(p, aim, 0.26); if (as !== null) { aim = as; aimD = autoTarget.lastD; } }
      firing = mag > 0.32;
    }
  } else if (input.mouseAim && !input.touch) {
    const w = toWorld(mouse.x, mouse.y); aim = Math.atan2(w.y - p.y, w.x - p.x); firing = mouse.down || keys.has('fire');
    aimD = clamp(Math.hypot(w.x - p.x, w.y - p.y), 2.5 * T, 12 * T);
    if (thr > 0 && now - mouse.lastMove > 6000 && now - mouse.lastDown > 6000) input.mouseAim = false;
  } else { aim = p.angle; firing = keys.has('fire') || mouse.down; }
  if (tapFire) {
    tapFire = false;
    const as = autoTarget(p, null, 9);
    if (as !== null) { aim = as; p.turret = as; aimD = autoTarget.lastD; } else if (aim === null) aim = p.turret;
    firing = true;
  }
  if (aim !== null) p.turret = turnTo(p.turret, aim, s.tTurn * dt);
  p.aimDist = clamp(aimD, 2.5 * T, 12 * T);
  TT.playerTick(p, dt, firing);
  if (firing && p.cool <= 0 && s.mode !== 'flame' && !TT.locked(p)) { fireTank(p); p.cool = s.cool * (G.buffs.rapid > 0 ? 0.5 : 1) * TT.coolK(p); }
  if (!G.bushHint && m.at(p.x, p.y) === BUSH) { G.bushHint = true; showHint('Çalıdayken düşmanlar seni ancak yakından görebilir', 4); }
  damageSmoke(p, dt);
}

/* ================= banners & hints ================= */
let bannerT = 0, hintT = 0;
function showBanner(t, s, dur) {
  el.bTitle.textContent = t; el.bSub.textContent = s || ''; el.bSub.classList.toggle('hidden', !s);
  el.banner.classList.remove('show'); void el.banner.offsetWidth; el.banner.classList.add('show');
  bannerT = dur || 1.8;
}
function hideBanner() { bannerT = 0; el.banner.classList.remove('show'); }
function showHint(t, dur) { el.hint.textContent = t; el.hint.classList.add('show'); hintT = dur || 4; }

/* ================= game flow ================= */
function startGame(resume) {
  Sound.init(); Sound.resume();
  for (const x of [el.menu, el.over, el.pause, el.upgrade, $('settings'), $('guide')]) x.classList.add('hidden');
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
  G.player = makeTank('player', 0, 0);
  refreshPlayer(); G.player.hp = G.player.maxHp;
  if (resume) {
    G.wave = Math.max(0, (resume.wave | 0) - 1); G.score = resume.score | 0; G.kills = resume.kills | 0;
    G.shots = resume.shots | 0; G.hits = resume.hits | 0; G.player.hp = clamp(resume.hp | 0, 10, G.player.maxHp);
  }
  G.resume = null;
  releaseInput(); resetUI();
  nextWave();
  sizeMini(); measureHud();
  if (G.wave === 1) showHint(input.touch ? 'Sol başparmakla sür, sağ başparmakla nişan al ve ateş et' : 'WASD ile sür, fareyle nişan al, tıklayarak ateş et', 5);
}
const prevBoss = w => { const bd = bossDefAt(w - 1); return bd && G.beaten.has(bd.id) ? bd.id : ''; }; // the boss of the wave before w, if it was a boss wave and is beaten
function nextWave() {
  G.wave++;
  const w = G.wave, theme = themeFor(w), bd = bossDefAt(w); // theme: 10-wave regions; boss waves get a fixed arena (11a)
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
  if (w > 1 && w % 10 === 1 && regionGone(prevBoss(w)).length) showBanner(theme.name.toLocaleUpperCase('tr-TR'), regionGone(prevBoss(w)).join(' ve ') + ' artık gelmiyor', 3); // first wave of a new region: who no longer comes
  else showBanner('DALGA ' + w, theme.name, 2.2);
  Sound.wave(false);
}
function waveCleared() {
  G.phase = 'cleared'; G.phaseT = 0;
  if (G.wave % 5 === 0) { const bd = bossDefAt(G.wave); if (bd) G.beaten.add(bd.id); } // the region rule: this boss's enemy types stop coming (11)
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
    case 'cleared': if (G.phaseT > 2.2) showUpgrades(); break;
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
const SUBS = ['settings', 'guide'];
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
    drawTank({ id: 0, type, spec: SPECS[type], x: 0, y: 0, angle: -Math.PI / 2, turret: -Math.PI / 2, treadL: 0, treadR: 0, recoil: 0, flash: 0 }, 1, g);
  });
}
function toMenu() {
  G.state = 'menu'; G.phase = 'intro'; G.timeScale = 1; G.fade = 0; G.boss = null; G.stage = null; G.tele = []; G.pieces = []; G.hurt = 0;
  for (const x of [el.hud, el.over, el.pause, el.upgrade, $('settings'), $('guide')]) x.classList.add('hidden');
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
  G.state = 'paused'; el.pause.classList.remove('hidden'); el.upgrade.classList.add('hidden'); releaseInput();
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
el.btnRestart.addEventListener('click', () => startGame(null));
el.btnQuit.addEventListener('click', toMenu);
el.btnPause.addEventListener('click', blurAfter(() => { if (G.state === 'play') pauseGame(); else resumeGame(); }));
el.btnSound.addEventListener('click', blurAfter(toggleSound));

/* ================= update ================= */
function updateCamera(rdt) {
  const p = G.player, m = G.map;
  let tx = m.w / 2, ty = m.h / 2;
  if (p) {
    tx = p.x; ty = p.y;
    if (G.phase === 'bossIntro' && G.boss) { tx = G.boss.x; ty = G.boss.y + T * 1.5; } // intro: the camera watches the boss
    else if (G.state === 'over' && G.overFree) { tx = p.x - (G.overFree.x - view.w / 2) / view.scale; ty = p.y - (G.overFree.y - view.h / 2) / view.scale; }
    else {
      if (p.alive) { tx += Math.cos(p.turret) * T * 0.7; ty += Math.sin(p.turret) * T * 0.7; }
      if (input.touch && view.h > view.w) ty += view.h / view.scale * 0.07;
    }
  }
  let zt = G.state === 'menu' ? 1 : TANKS[G.tank].zoom; // Keskin Nişancı: the camera pulls back
  if (G.stage && G.state !== 'menu') zt = Math.min(zt, 0.85); // boss stage: the camera pulls back
  if (view.zoomK !== zt) { view.zoomK = Math.abs(zt - view.zoomK) < 0.001 ? zt : view.zoomK + (zt - view.zoomK) * (1 - Math.exp(-3 * rdt)); view.scale = view.base * view.zoomK; }
  const k = 1 - Math.exp(-5 * rdt);
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  clampCam();
  cam.shake = cam.shake * Math.exp(-9 * rdt); if (cam.shake < 0.05) cam.shake = 0;
  computeView();
}
function updateMenu(rdt) {
  G.time += rdt;
  const p = G.player; if (!p || !G.map) return;
  const now = performance.now();
  p.cool -= rdt; p.recoil = Math.max(0, p.recoil - rdt * 7);
  let aim;
  if (!input.touch && mouse.x >= 0 && now - mouse.lastMove < 4000) { const w = toWorld(mouse.x, mouse.y); aim = Math.atan2(w.y - p.y, w.x - p.x); }
  else if (menu.aim && now - menu.aimAt < 4000) aim = Math.atan2(menu.aim.y - p.y, menu.aim.x - p.x);
  else aim = -Math.PI / 2 + Math.sin(G.time * 0.55) * 0.9;
  p.turret = turnTo(p.turret, aim, 6 * rdt);
  const aligned = Math.abs(angDiff(p.turret, aim)) < 0.2;
  if (p.cool <= 0 && aligned && (menu.shot || (mouse.down && !input.touch))) { fireTank(p); p.cool = 0.3; menu.shot = false; menu.fired = true; }
  if (menu.fired) menu.hintA = Math.max(0, menu.hintA - rdt * 1.5);
  updateBullets(rdt); updateParticles(rdt); updateTexts(rdt);
  computeView();
}
function updatePlay(rdt) {
  const dt = rdt * G.timeScale;
  G.time += dt;
  G.hurt = Math.max(0, G.hurt - rdt);
  updatePhase(rdt);
  if (G.state !== 'play') return;
  if (G.phase === 'upgrade') { // world waits behind the workshop
    TT.frozenTick(rdt);
    if (G.evoWait > 0 && (G.evoWait -= rdt) <= 0) { G.evoWait = 0; hideBanner(); showUpgrades(); }
    updateParticles(rdt); updateTexts(rdt); updateCamera(rdt); updateHUD(); return;
  }
  const p = G.player;
  if (p.alive && G.phase !== 'bossIntro') { updatePlayer(p, dt); synTrack(p, dt); regen(p, dt); }
  updateFlow(dt);
  if (G.phase === 'fight') updateSpawns(dt);
  const frozen = G.buffs.freeze > 0;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const stunned = tickStatus(e, dt);
    if (e.dead) continue;
    if (e.isBoss) { e.lock = false; updateBoss(e, dt, frozen || stunned); continue; } // 11a: phases, attacks, stun
    if (frozen || stunned) { e.lock = false; e.flash = Math.max(0, e.flash - dt); e.recoil = 0; } // Dondurucu / Ikiz stun: enemies stand still and hold fire
    else updateEnemy(e, dt);
  }
  nukeUpdate(dt); // hook (C)
  separateTanks();
  updateBullets(dt);
  updateStrikes(dt);
  updatePieces(dt);
  updatePickups(dt);
  updateParticles(dt);
  updateTexts(dt);
  if (G.phase === 'fight') for (const k in G.buffs) if (G.buffs[k] > 0) G.buffs[k] = Math.max(0, G.buffs[k] - dt);
  if (G.enemies.some(e => e.dead)) G.enemies = G.enemies.filter(e => !e.dead);
  updateCamera(rdt);
  updateHUD();
}
function updateOver(rdt) {
  G.time += rdt;
  updateFlow(rdt);
  for (const e of G.enemies) if (!e.dead) { if (e.isBoss) updateBoss(e, rdt, e.dying ? false : true); else updateEnemy(e, rdt); }
  separateTanks(); updateBullets(rdt); updateParticles(rdt); updateTexts(rdt);
  if (G.enemies.some(e => e.dead)) G.enemies = G.enemies.filter(e => !e.dead);
  updateCamera(rdt);
}
function update(rdt) {
  if (bannerT > 0) { bannerT -= rdt; if (bannerT <= 0) el.banner.classList.remove('show'); }
  if (hintT > 0) { hintT -= rdt; if (hintT <= 0) el.hint.classList.remove('show'); }
  if (G.state === 'menu') updateMenu(rdt);
  else if (G.state === 'play') updatePlay(rdt);
  else if (G.state === 'over') updateOver(rdt);
}

/* ================= HUD ================= */
const ui = {};
function resetUI() { for (const k in ui) delete ui[k]; el.buffs.innerHTML = ''; }
function updateHUD() {
  const p = G.player; if (!p) return;
  const hp = Math.max(0, Math.ceil(p.hp)), mx = p.maxHp;
  if (ui.hp !== hp || ui.mx !== mx) { ui.hp = hp; ui.mx = mx; el.hpFill.style.transform = `scaleX(${Math.min(1, hp / mx)})`; el.hpNum.textContent = hp; el.armor.classList.toggle('low', hp <= mx * 0.3); }
  if (ui.score !== G.score) { ui.score = G.score; el.score.textContent = fmt(G.score); }
  if (ui.wave !== G.wave) { ui.wave = G.wave; el.waveT.textContent = 'DALGA ' + G.wave; }
  const boss = G.boss && !G.boss.dead ? G.boss : null;
  if (boss) {
    if (ui.bossOn !== true) { ui.bossOn = true; ui.bossName = null; ui.boss = -1; ui.bossTrail = 1; ui.bossHitT = 0; el.bossBar.classList.remove('hidden'); el.waveChip.classList.add('hidden'); el.hud.classList.add('boss'); measureHud(); }
    if (ui.bossName !== boss.name) {
      ui.bossName = boss.name; el.bossName.textContent = boss.name.split(' ').map(w => w.charAt(0) + w.slice(1).toLocaleLowerCase('tr')).join(' ');
      el.bossMarks.innerHTML = (boss.def && boss.def.phases || []).map(t => `<u style="left:${t}%"></u>`).join(''); // thin marks at the phase thresholds
    }
    const k = Math.max(0, boss.hp / boss.maxHp), now = performance.now();
    if (ui.boss !== k) { if (k < ui.boss) ui.bossHitT = now; ui.boss = k; el.bossFill.style.transform = `scaleX(${k})`; el.bossPct.textContent = Math.ceil(k * 100) + '%'; }
    if (ui.bossTrail > k) { // the lost chunk stays light for ~0.5 s after the last hit, then shrinks
      if (now - ui.bossHitT > 500) ui.bossTrail = Math.max(k, ui.bossTrail - 0.9 * Math.min(0.1, (now - (ui.bossTick || now)) / 1000));
      el.bossLost.style.transform = `scaleX(${ui.bossTrail})`;
    } else { ui.bossTrail = k; el.bossLost.style.transform = `scaleX(${k})`; }
    ui.bossTick = now;
  } else {
    if (ui.bossOn !== false) { ui.bossOn = false; el.bossBar.classList.add('hidden'); el.waveChip.classList.remove('hidden'); el.hud.classList.remove('boss'); measureHud(); }
    const remain = G.queue.length + G.enemies.length + G.portals.length;
    const txt = G.phase === 'upgrade' ? 'Yükseltme seç' : G.phase === 'cleared' || G.phase === 'out' ? 'Dalga temizlendi' : G.phase === 'intro' ? 'Hazırlan' : remain + ' düşman kaldı';
    if (ui.sub !== txt) { ui.sub = txt; el.waveS.textContent = txt; }
  }
  const active = BUFFS.filter(k => G.buffs[k] > 0);
  if (G.airQ > 0) active.push('air'); // a strike waiting for its first target
  const key = active.join();
  if (ui.buffs !== key) {
    ui.buffs = key;
    el.buffs.classList.toggle('many', active.length > 3); // past three, icons alone keep the column short
    el.buffs.innerHTML = active.map(k => `<div class="buff" title="${PU[k].name}">${puGlyph(k)}<span class="bn">${k === 'air' ? 'Hava saldırısı hazır' : PU[k].name}</span><i><b data-k="${k}" style="background:${PU[k].col}"></b></i></div>`).join('');
    ui.buffEls = Array.from(el.buffs.querySelectorAll('b[data-k]'));
    measureHud();
  }
  if (ui.buffEls) for (const b of ui.buffEls) { const k = b.dataset.k; b.style.transform = `scaleX(${k === 'air' ? 1 : clamp(G.buffs[k] / (G.buffMax[k] || PU[k].dur), 0, 1).toFixed(3)})`; }
  nukeHud(); // hook (C)
}

/* ================= render ================= */
function render() {
  const dpr = view.dpr, m = G.map;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = m ? m.theme.bg : '#262a1d';
  ctx.fillRect(0, 0, view.w, view.h);
  if (!m) return;
  let sx = 0, sy = 0;
  if (cam.shake > 0 && G.state === 'play') { sx = (Math.random() * 2 - 1) * cam.shake; sy = (Math.random() * 2 - 1) * cam.shake; }
  const s = view.scale, ox = view.w / 2 - cam.x * s + sx, oy = view.h / 2 - cam.y * s + sy;
  ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
  const x0 = Math.max(0, view.x0 - 4), y0 = Math.max(0, view.y0 - 4), x1 = Math.min(m.w, view.x1 + 4), y1 = Math.min(m.h, view.y1 + 4);
  if (x1 > x0 && y1 > y0) ctx.drawImage(m.layer, x0 * m.res, y0 * m.res, (x1 - x0) * m.res, (y1 - y0) * m.res, x0, y0, x1 - x0, y1 - y0);
  const c0 = Math.max(0, Math.floor(view.x0 / T) - 1), c1 = Math.min(m.n - 1, Math.floor(view.x1 / T) + 1);
  const r0 = Math.max(0, Math.floor(view.y0 / T) - 1), r1 = Math.min(m.n - 1, Math.floor(view.y1 / T) + 1);
  drawWaterFx(c0, c1, r0, r1);
  if (m.frame) { ctx.strokeStyle = m.theme.steelDk; ctx.lineWidth = 12; ctx.strokeRect(-6, -6, m.w + 12, m.h + 12); ctx.strokeStyle = m.theme.steel; ctx.lineWidth = 3; ctx.strokeRect(-1.5, -1.5, m.w + 3, m.h + 3); }
  drawTreads();
  drawPieces();
  drawTele();
  drawPortals();
  const p = G.player, pAlive = !!(p && p.alive), cloak = G.buffs.stealth > 0;
  const pa = cloak ? 0.4 + 0.08 * Math.sin(G.time * 7) : 1; // Kamuflaj: the player's tank shimmers, half seen
  ctx.fillStyle = m.theme.shadow;
  for (const e of G.enemies) if (onScreen(e.x, e.y, 60)) tankShadow(e);
  if (pAlive && !cloak) tankShadow(p);
  for (const e of G.enemies) if (onScreen(e.x, e.y, 60)) drawTank(e, 1);
  if (G.buffs.freeze > 0) for (const e of G.enemies) if (!e.dead && !e.hidden && onScreen(e.x, e.y, 60)) drawFrost(e);
  if (pAlive) drawTank(p, pa);
  drawBushes(c0, c1, r0, r1);
  if (upL('thermal')) for (const e of G.enemies) if (e.hidden && !e.dead && onScreen(e.x, e.y, 60)) drawThermal(e);
  for (const e of G.enemies) if (e.spec.medic && !e.dead && (e.vis || 0) > 0 && m.at(e.x, e.y) === BUSH && onScreen(e.x, e.y, 60)) drawTank(e, 1); // a beaming Tamirci shows through its bush
  for (const e of G.enemies) if (e.beamOn && !e.dead && !e.beamOn.dead && G.time < e.beamUntil && onScreen(e.x, e.y, 400)) drawRepairBeam(e);
  if (pAlive && m.at(p.x, p.y) === BUSH) drawTank(p, 0.5 * pa);
  if (pAlive && (G.buffs.shield > 0 || p.shield1T > 0)) drawShield(p);
  drawPips();
  drawTankFx(); // tank-specific effects under the shells (stun, transformation ring; D1/D2: laser, landing marks, flame)
  drawBullets();
  drawLocks();
  drawStrikes();
  for (const k of G.pickups) drawPickup(k);
  drawParticles();
  drawJet();
  drawTexts();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if ((G.state === 'play' || G.state === 'paused') && !dbg.clean) { drawIndicators(); drawCrosshair(); drawSticks(); drawVignette(); }
  syncAimCursor();
  if (G.state === 'menu') drawMenuHint();
  drawNuke(); // hook (C): screen space (setTransform(dpr)), above the overlays, below the fade
  if (G.fade > 0.001) { ctx.fillStyle = `rgba(14,16,10,${G.fade.toFixed(3)})`; ctx.fillRect(0, 0, view.w, view.h); }
}
function drawWaterFx(c0, c1, r0, r1) {
  const m = G.map; let any = false;
  ctx.beginPath();
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    if (m.t[r * m.n + c] !== WATER) continue; any = true;
    for (let k = 0; k < 2; k++) {
      const ph = (G.time * 7 + ((c * 17 + r * 11) % 23) + k * T / 2) % T;
      if (ph < 8 || ph > T - 6) continue;
      const yy = r * T + ph, cx = c * T + T / 2 + Math.sin(G.time * 1.3 + r + k * 2.1) * 9, w = 6 + 5 * Math.abs(Math.sin(G.time * 1.7 + c + k));
      ctx.moveTo(cx - w, yy); ctx.lineTo(cx + w, yy);
    }
  }
  if (!any) return;
  ctx.strokeStyle = m.theme.waterHi; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.globalAlpha = 0.5; ctx.stroke(); ctx.globalAlpha = 1;
}
function drawTreads() {
  if (!tm.n) return;
  const LIFE = 9, B = 5, paths = [];
  for (let b = 0; b < B; b++) paths.push(new Path2D());
  let any = false;
  for (let k = 0; k < tm.n; k++) {
    const age = G.time - tm.t[k]; if (age >= LIFE || age < 0) continue;
    const pth = paths[Math.min(B - 1, Math.floor(age / LIFE * B))];
    pth.moveTo(tm.x1[k], tm.y1[k]); pth.lineTo(tm.x2[k], tm.y2[k]); any = true;
  }
  if (!any) return;
  ctx.lineWidth = 5.5; ctx.lineCap = 'butt';
  const rgb = G.map.theme.tread;
  for (let b = 0; b < B; b++) { ctx.strokeStyle = `rgba(${rgb},${(0.26 * (1 - (b + 0.5) / B)).toFixed(3)})`; ctx.stroke(paths[b]); }
}
function drawPortals() {
  for (const q of G.portals) {
    const k = clamp(q.t / q.dur, 0, 1), pulse = 0.5 + 0.5 * Math.sin(G.time * 12);
    ctx.save(); ctx.translate(q.x, q.y);
    ctx.globalAlpha = 0.18 + 0.22 * pulse; ctx.fillStyle = '#e0533a'; ctx.beginPath(); ctx.arc(0, 0, 8 + 16 * k, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.9; ctx.strokeStyle = '#e0533a'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 6]); ctx.lineDashOffset = -G.time * 40;
    ctx.beginPath(); ctx.arc(0, 0, 24 - 4 * k, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function tankShadow(t) {
  const s = t.spec; ctx.save(); ctx.translate(t.x + 5, t.y + 7); ctx.rotate(t.angle); rrect(ctx, -s.len / 2, -s.wid / 2, s.len, s.wid, 6); ctx.fill(); ctx.restore();
}
// One barrel in the turret frame. s.shape picks the look; heat (0..1, Makineli) tints it red, with a dark rim so it reads on sand and snow
const mixHex = (a, b, k) => { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); let o = 0; for (let sh = 16; sh >= 0; sh -= 8) { const x = (pa >> sh) & 255, y = (pb >> sh) & 255; o = (o << 8) | Math.round(x + (y - x) * k); } return '#' + (o + 0x1000000).toString(16).slice(1); };
function barrel(s, rec, c, g, heat, len0) {
  const x0 = s.tR * 0.4 - rec, len = (len0 || s.barrel) - s.tR * 0.4, bW = s.bW;
  let dk = c.dk;
  if (heat > 0) { // hot barrel: dark -> orange -> pulsing red when overheated
    const over = G.player && s === G.player.spec && G.player.overheatT > 0;
    dk = over ? mixHex('#ff3b1f', '#ff8a5c', 0.5 + 0.5 * Math.sin(G.time * 20)) : mixHex(c.dk, '#ff5a2a', Math.min(1, heat) * 0.85);
    if (heat > 0.25) { g.fillStyle = 'rgba(30,12,6,.9)'; g.fillRect(x0 - 1, -bW / 2 - 1.2, len + 2, bW + 2.4); }
  }
  switch (s.shape) {
    case 'long': { // Keskin Nişancı: thin long barrel, breech collar and a slotted muzzle brake
      g.fillStyle = dk; g.fillRect(x0, -bW / 2, len, bW);
      g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(x0, -bW / 2 + 1, len, 1.1);
      g.fillStyle = c.dk; g.fillRect(x0, -bW / 2 - 1.3, 5, bW + 2.6);
      g.fillStyle = '#1f1d19'; g.fillRect(x0 + len - 7, -bW / 2 - 1.8, 7, bW + 3.6);
      g.fillStyle = c.acc; g.fillRect(x0 + len - 5.2, -bW / 2 - 1.8, 1.2, bW + 3.6); g.fillRect(x0 + len - 2.6, -bW / 2 - 1.8, 1.2, bW + 3.6);
      break;
    }
    case 'mg': { // Makineli: short thick barrel in a ventilated jacket
      g.fillStyle = dk; g.fillRect(x0, -bW / 2, len, bW);
      g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(x0, -bW / 2 + 1, len, 1.1);
      const jl = len * 0.62;
      g.fillStyle = heat > 0.25 ? dk : c.body; g.fillRect(x0, -bW / 2 - 1.6, jl, bW + 3.2);
      g.fillStyle = '#1f1d19'; for (let v = 3; v < jl - 2; v += 4.2) g.fillRect(x0 + v, -bW / 2 - 0.9, 1.7, bW + 1.8);
      g.fillStyle = '#1f1d19'; g.fillRect(x0 + len - 5, -bW / 2 - 1, 5, bW + 2);
      break;
    }
    case 'tri': { // Üçlü: thin barrels with a pink tip; the long middle one (the piercing shell) gets a pointed tip
      g.fillStyle = dk; g.fillRect(x0, -bW / 2, len, bW);
      g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(x0, -bW / 2 + 1, len, 1.1);
      g.fillStyle = '#1f1d19'; g.fillRect(x0 + len - 4, -bW / 2 - 1, 4, bW + 2);
      g.fillStyle = c.acc;
      if (len0 > 26) { g.beginPath(); g.moveTo(x0 + len - 6, -bW / 2 - 0.8); g.lineTo(x0 + len + 3, 0); g.lineTo(x0 + len - 6, bW / 2 + 0.8); g.closePath(); g.fill(); }
      else g.fillRect(x0 + len - 6, -bW / 2 - 0.8, 1.6, bW + 1.6);
      break;
    }
    case 'duo': { // Çift Yön: a front and a rear barrel, each with a pale ring near the tip
      g.fillStyle = dk; g.fillRect(x0, -bW / 2, len, bW);
      g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(x0, -bW / 2 + 1, len, 1.1);
      g.fillStyle = '#1f1d19'; g.fillRect(x0 + len - 4, -bW / 2 - 1, 4, bW + 2);
      g.fillStyle = c.acc; g.fillRect(x0 + len - 9, -bW / 2 - 1.2, 2.2, bW + 2.4);
      break;
    }
    case 'flame': { // Alev Topu: short fat tube widening to a nozzle with a glowing mouth
      g.fillStyle = dk; g.fillRect(x0, -bW / 2, len * 0.62, bW);
      g.beginPath(); g.moveTo(x0 + len * 0.62, -bW / 2); g.lineTo(x0 + len, -bW * 0.78); g.lineTo(x0 + len, bW * 0.78); g.lineTo(x0 + len * 0.62, bW / 2); g.closePath(); g.fill();
      g.fillStyle = c.acc; g.fillRect(x0 + len * 0.62 - 1, -bW / 2 - 1.2, 2.4, bW + 2.4);
      g.fillStyle = '#1f1d19'; g.fillRect(x0 + len - 3.2, -bW * 0.78 - 0.6, 3.2, bW * 1.56 + 1.2);
      g.fillStyle = G.player && s === G.player.spec && G.player.flameOn ? '#fff0a0' : '#ff7a2a'; g.fillRect(x0 + len - 2, -bW * 0.5, 2.4, bW);
      break;
    }
    case 'bell': { // Şarapnel: a flared bell with a dark mouth and a pale rim
      g.fillStyle = dk; g.fillRect(x0, -bW * 0.36, len * 0.45, bW * 0.72);
      g.beginPath(); g.moveTo(x0 + len * 0.4, -bW * 0.36); g.lineTo(x0 + len, -bW * 1.1); g.lineTo(x0 + len, bW * 1.1); g.lineTo(x0 + len * 0.4, bW * 0.36); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(x0, -bW * 0.36 + 0.8, len * 0.45, 1.1);
      g.fillStyle = '#1f1d19'; g.beginPath(); g.ellipse(x0 + len - 1, 0, 2.6, bW * 0.95, 0, 0, TAU); g.fill();
      g.fillStyle = c.acc; g.fillRect(x0 + len - 4.4, -bW * 1.1, 1.4, bW * 2.2);
      break;
    }
    case 'rail': { // Rayli Top: a long thin barrel with glowing coil rings and a small emitter at the tip
      g.fillStyle = '#1f1d19'; g.fillRect(x0, -bW / 2 - 0.8, len, bW + 1.6);
      g.fillStyle = dk; g.fillRect(x0, -bW / 2, len, bW);
      g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(x0, -bW / 2 + 0.7, len, 1);
      for (let k = 0; k < 4; k++) { const cx = x0 + 6 + k * (len - 16) / 3.4; g.fillStyle = '#1f1d19'; g.fillRect(cx - 0.4, -bW / 2 - 2.9, 3.8, bW + 5.8); g.fillStyle = c.acc; g.fillRect(cx + 0.4, -bW / 2 - 2.2, 2.2, bW + 4.4); }
      g.fillStyle = '#1f1d19'; g.fillRect(x0 + len - 3.5, -bW / 2 - 1.6, 3.5, bW + 3.2);
      g.fillStyle = c.acc; g.fillRect(x0 + len - 2.2, -1, 2.2, 2);
      break;
    }
    case 'obus': { // Obus: a short fat barrel with a wide collar and a heavy muzzle ring
      g.fillStyle = '#1f1d19'; g.fillRect(x0, -bW / 2 - 1.2, len, bW + 2.4);
      g.fillStyle = dk; g.fillRect(x0, -bW / 2, len, bW);
      g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(x0, -bW / 2 + 1, len, 1.4);
      const cx = x0 + len * 0.42; g.fillStyle = '#1f1d19'; g.fillRect(cx - 0.8, -bW / 2 - 4.2, 6.6, bW + 8.4); g.fillStyle = c.acc; g.fillRect(cx + 0.6, -bW / 2 - 3.2, 3.8, bW + 6.4);
      g.fillStyle = '#1f1d19'; g.fillRect(x0 + len - 5, -bW / 2 - 2.4, 5, bW + 4.8);
      g.fillStyle = '#0d0c0a'; g.fillRect(x0 + len - 2.2, -bW / 2 + 2, 2.2, bW - 4);
      break;
    }
    default: // std and twin (one thin barrel per muzzle): the original look
      g.fillStyle = dk; g.fillRect(x0, -bW / 2, len, bW);
      g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(x0, -bW / 2 + 1, len, 1.2);
      g.fillStyle = '#1f1d19'; g.fillRect(x0 + len - 5, -bW / 2 - 1, 5, bW + 2);
  }
}
// Marks per tank shape: hullMarks go on the hull (before the turret), turretMarks on the turret (the Standart keeps its gold arrow)
function hullMarks(g, s, c, hx, hy, hw, hh, alpha) {
  g.fillStyle = c.acc; g.globalAlpha = alpha * 0.92;
  switch (s.shape) {
    case 'twin': g.fillRect(hx + 2, hy + 0.5, hw - 4, 1.7); g.fillRect(hx + 2, hy + hh - 2.2, hw - 4, 1.7); break; // racing stripes along both tracks
    case 'long': g.fillRect(hx + 2, hy + hh / 2 - 1.1, 7, 2.2); break; // rear stripe
    case 'mg': for (let k = 0; k < 2; k++) { const x = hx + 2.5 + k * 4.2; g.beginPath(); g.moveTo(x, hy + 3); g.lineTo(x + 3, hy + hh / 2); g.lineTo(x, hy + hh - 3); g.lineTo(x + 1.7, hy + hh - 3); g.lineTo(x + 4.7, hy + hh / 2); g.lineTo(x + 1.7, hy + 3); g.closePath(); g.fill(); } break; // belt chevrons on the rear deck
    case 'tri': for (let k = -1; k <= 1; k++) { g.beginPath(); g.arc(hx + 6, hy + hh / 2 + k * 6, 1.9, 0, TAU); g.fill(); } g.fillRect(hx + 10, hy + hh / 2 - 0.8, 4, 1.6); break; // three studs across the rear deck
    case 'duo': g.fillRect(hx + 4, hy + hh / 2 - 0.9, hw - 8, 1.8); for (const sg of [-1, 1]) { const x = sg > 0 ? hx + hw - 3 : hx + 3; g.beginPath(); g.moveTo(x, hy + hh / 2); g.lineTo(x - sg * 4.5, hy + hh / 2 - 3.6); g.lineTo(x - sg * 4.5, hy + hh / 2 + 3.6); g.closePath(); g.fill(); } break; // arrow pointing both ways
    case 'flame': for (let k = 0; k < 2; k++) { const x = hx + 2.5 + k * 5.2; g.beginPath(); g.moveTo(x, hy + hh - 3); g.quadraticCurveTo(x + 4, hy + hh / 2 + 1, x + 1.5, hy + 3); g.quadraticCurveTo(x + 1.5, hy + hh / 2, x - 1.8, hy + hh - 3); g.closePath(); g.fill(); } break; // two flame tongues
    case 'bell': for (let k = 0; k < 3; k++) { const x = hx + 2.5 + k * 3.4; g.beginPath(); g.moveTo(x, hy + hh - 2.5); g.lineTo(x + 2, hy + hh - 2.5); g.lineTo(x + 5.5, hy + 2.5); g.lineTo(x + 3.5, hy + 2.5); g.closePath(); g.fill(); } break; // hazard slashes
    case 'rail': g.fillRect(hx + 2, hy + 1, hw - 6, 1.5); g.fillRect(hx + 2, hy + hh - 2.5, hw - 6, 1.5); g.beginPath(); g.moveTo(hx + hw - 9, hy + hh / 2 - 3); g.lineTo(hx + hw - 4, hy + hh / 2); g.lineTo(hx + hw - 9, hy + hh / 2 + 3); g.closePath(); g.fill(); break; // cyan side rails and a forward arrow
    case 'obus': for (const yy of [hy + 3, hy + hh - 6]) for (let k = 0; k < 3; k++) g.fillRect(hx + 3 + k * 4.4, yy, 3, 3); break; // yellow ammo-crate squares on the rear deck
  }
  g.globalAlpha = alpha;
}
function turretMarks(g, s, c, tr) {
  g.fillStyle = c.acc;
  switch (s.shape) {
    case 'twin': g.beginPath(); g.moveTo(tr * 0.62, 0); g.lineTo(tr * 0.15, -tr * 0.3); g.lineTo(tr * 0.15, tr * 0.3); g.closePath(); g.fill(); break;
    case 'long': // scope tube on the turret's right, orange lens
      g.fillStyle = '#1f1d19'; rrect(g, -tr * 0.3, tr * 0.5, tr * 1.3, tr * 0.46, 2); g.fill();
      g.fillStyle = c.acc; g.fillRect(tr * 0.82, tr * 0.56, 2.4, tr * 0.34); g.fillRect(-tr * 0.12, tr * 0.6, 2, tr * 0.26);
      break;
    case 'mg': g.fillRect(tr * 0.15, -tr * 0.12, tr * 0.5, tr * 0.24); break;
    case 'tri': g.lineWidth = 1.8; g.lineCap = 'round'; g.strokeStyle = c.acc; for (const a of [-0.55, 0, 0.55]) { g.beginPath(); g.moveTo(-tr * 0.1, 0); g.lineTo(-tr * 0.1 + Math.cos(a) * tr * 0.8, Math.sin(a) * tr * 0.8); g.stroke(); } break; // three prongs
    case 'duo': g.beginPath(); g.moveTo(tr * 0.7, 0); g.lineTo(tr * 0.2, -tr * 0.3); g.lineTo(tr * 0.2, tr * 0.3); g.closePath(); g.fill(); g.beginPath(); g.moveTo(-tr * 0.75, 0); g.lineTo(-tr * 0.25, -tr * 0.3); g.lineTo(-tr * 0.25, tr * 0.3); g.closePath(); g.fill(); break; // front and rear arrow
    case 'flame': g.beginPath(); g.arc(tr * 0.2, 0, tr * 0.38, 0, TAU); g.fill(); g.fillStyle = c.dk; g.beginPath(); g.arc(tr * 0.2, 0, tr * 0.18, 0, TAU); g.fill(); break; // fuel cap
    case 'bell': g.lineWidth = 2; g.strokeStyle = c.acc; g.beginPath(); g.arc(tr * 0.1, 0, tr * 0.42, 0, TAU); g.stroke(); g.fillRect(tr * 0.04, -tr * 0.1, tr * 0.12, tr * 0.2); break; // ring sight
    case 'rail': // power coil box on the turret: two cyan bars with a dark gap, plus a glowing node
      g.fillStyle = '#1f1d19'; rrect(g, -tr * 0.6, -tr * 0.46, tr * 1.25, tr * 0.92, 2); g.fill();
      g.fillStyle = c.acc; g.fillRect(-tr * 0.46, -tr * 0.34, tr * 0.38, tr * 0.68); g.fillRect(tr * 0.12, -tr * 0.34, tr * 0.38, tr * 0.68);
      break;
    case 'obus': // round hatch with a yellow ring
      g.fillStyle = '#1f1d19'; g.beginPath(); g.arc(-tr * 0.2, 0, tr * 0.55, 0, TAU); g.fill();
      g.strokeStyle = c.acc; g.lineWidth = 2; g.beginPath(); g.arc(-tr * 0.2, 0, tr * 0.38, 0, TAU); g.stroke();
      break;
    default: g.beginPath(); g.moveTo(tr * 0.6, 0); g.lineTo(tr * 0.05, -tr * 0.4); g.lineTo(tr * 0.05, tr * 0.4); g.closePath(); g.fill();
  }
}
const NO_UP = {};
function drawTank(t, alpha, g) {
  g = g || ctx;
  if (t.isBoss) { drawBoss(t, alpha, g); return; }
  const s = t.spec, c = s.col, L = s.len, W = s.wid, tw = s.tread, tr = s.tR, U = s.up || NO_UP;
  g.save(); g.translate(t.x, t.y); g.rotate(t.angle); g.globalAlpha = alpha;
  if (U.engine) { g.fillStyle = '#2b2823'; for (const yy of U.engine >= 3 ? [-5.5, 5.5] : [0]) { rrect(g, -L / 2 - 3.5, yy - 2.4, 6, 4.8, 1.5); g.fill(); } } // exhaust stacks
  g.fillStyle = '#1f1d19';
  rrect(g, -L / 2, -W / 2, L, tw, 3); g.fill();
  rrect(g, -L / 2, W / 2 - tw, L, tw, 3); g.fill();
  g.fillStyle = '#4b473e';
  const st = 5;
  let o = ((t.treadL % st) + st) % st;
  for (let x = -L / 2 + o; x < L / 2 - 1.5; x += st) g.fillRect(x, -W / 2 + 1.3, 1.7, tw - 2.6);
  o = ((t.treadR % st) + st) % st;
  for (let x = -L / 2 + o; x < L / 2 - 1.5; x += st) g.fillRect(x, W / 2 - tw + 1.3, 1.7, tw - 2.6);
  if (t.pt && t.pt.tread > 0) { // broken tread: a stretch of links is gone, the rest hangs loose
    const y0 = t.pt.side ? W / 2 - tw : -W / 2;
    g.fillStyle = 'rgba(8,6,4,.78)'; g.fillRect(-L * 0.3, y0 + 0.5, L * 0.46, tw - 1);
    g.fillStyle = '#4b473e'; for (let k = 0; k < 4; k++) g.fillRect(-L * 0.34 + k * 4.2, y0 + ((k * 5) % 3) + 0.6, 2.6, 1.7);
    g.strokeStyle = '#ffb04a'; g.lineWidth = 0.9; g.globalAlpha = alpha * (0.5 + 0.5 * Math.sin(G.time * 18)); g.beginPath(); g.moveTo(-L * 0.3, y0 + 1); g.lineTo(-L * 0.3, y0 + tw - 1); g.stroke(); g.globalAlpha = alpha;
  }
  const hx = -L / 2 + 2.5, hw = L - 5, hy = -W / 2 + tw - 2.5, hh = W - 2 * tw + 5;
  g.fillStyle = c.dk; rrect(g, hx, hy, hw, hh, 4); g.fill();
  g.fillStyle = c.body; rrect(g, hx + 1.5, hy + 1.5, hw - 3, hh - 3, 3); g.fill();
  g.globalAlpha = alpha * 0.75; g.fillStyle = c.hi; g.fillRect(hx + hw - 8.5, hy + 3, 4, hh - 6); g.globalAlpha = alpha;
  g.fillStyle = c.dk; for (let k = 0; k < 3; k++) g.fillRect(hx + 3.5 + k * 3.2, hy + 4, 1.6, hh - 8);
  if (t.type === 'player' && s.shape !== 'std') hullMarks(g, s, c, hx, hy, hw, hh, alpha);
  g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1.3; rrect(g, -L / 2, -W / 2, L, W, 4); g.stroke();
  if (U.armor) { // Zırh plakası: one skirt plate per level along each track, front first
    const sw = (L - 6) / 5, ph = tw * 0.8;
    for (let k = 0; k < U.armor; k++) {
      const x1 = L / 2 - 3 - k * sw, x0 = x1 - sw + 1.2;
      for (const y0 of [-W / 2 - 1.5, W / 2 + 1.5 - ph]) {
        g.fillStyle = c.dk; g.fillRect(x0, y0, x1 - x0, ph);
        g.fillStyle = 'rgba(255,255,255,.24)'; g.fillRect(x0, y0, x1 - x0, 1.2);
        g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect((x0 + x1) / 2 - 0.75, y0 + ph / 2 - 0.4, 1.5, 1.5);
      }
    }
  }
  if (U.repair) { // Onarım robotu: drone dock on the front deck
    const bx = L / 2 - 8.8, by = W / 2 - tw - 3.6;
    g.fillStyle = '#d9d3c1'; rrect(g, bx, by, 6.4, 6.4, 1.5); g.fill();
    g.fillStyle = '#3fa63c'; g.fillRect(bx + 2.5, by + 1, 1.4, 4.4); g.fillRect(bx + 1, by + 2.5, 4.4, 1.4);
  }
  let fl = t.flash > 0 ? Math.min(1, t.flash * 10) * 0.8 : 0;
  if (t.evoT > 0) fl = Math.max(fl, clamp(t.evoT / 0.7, 0, 1) * 0.9); // transformation flash
  if (fl) { g.globalAlpha = alpha * fl; g.fillStyle = '#fff'; rrect(g, -L / 2, -W / 2, L, W, 4); g.fill(); g.globalAlpha = alpha; }
  g.rotate(t.turret - t.angle);
  const rec = t.recoil * 4.5;
  if (s.muzzles) { // player tanks: one barrel per muzzle (the same list fireTank shoots from)
    const heat = s.tr && s.tr.heatUp ? (t.overheatT > 0 ? 1 : t.heat) : 0;
    if (s.shape === 'twin') { const o0 = s.muzzles[0].off; g.fillStyle = c.dk; g.fillRect(s.tR * 0.4 - rec, o0 - 1, 4.5, 2 - 2 * o0); } // bridge between the two barrels
    for (const mz of s.muzzles) { g.save(); g.translate(0, mz.off || 0); g.rotate(mz.ang || 0); barrel(s, rec, c, g, heat, mz.len); g.restore(); }
    if (heat > 0.3 && t.overheatT > 0 && fxScale === 1) { // overheated: additive glow on the muzzle
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = alpha * (0.5 + 0.35 * Math.sin(G.time * 20)); const gs = 30;
      for (const mz of s.muzzles) g.drawImage(SPR.fire, s.barrel - rec - gs / 2, (mz.off || 0) - gs / 2, gs, gs);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = alpha;
    }
  } else if (s.triple) { for (const a of [-0.2, 0.2, 0]) { g.save(); g.rotate(a); barrel(s, rec, c, g); g.restore(); } }
  else if (s.twin) { const off = s.twinOff || s.bW * 0.62; for (const yo of [-1, 1]) { g.save(); g.translate(0, yo * off); barrel(s, rec, c, g); g.restore(); } }
  else if (s.medic) { // Tamirci: yellow crane arm with a wrench head instead of a barrel
    const ln = s.barrel, on = (t.vis || 0) > 0;
    g.strokeStyle = '#2b2823'; g.lineWidth = 5.4; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(3, 0); g.lineTo(ln * 0.45, -3.2); g.lineTo(ln - 5, 0); g.stroke();
    g.strokeStyle = c.acc; g.lineWidth = 3.4; g.beginPath(); g.moveTo(3, 0); g.lineTo(ln * 0.45, -3.2); g.lineTo(ln - 5, 0); g.stroke();
    g.fillStyle = c.acc; g.beginPath(); g.arc(ln * 0.45, -3.2, 2.2, 0, TAU); g.fill();
    g.strokeStyle = '#2b2823'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#c7ccd1'; g.beginPath(); g.arc(ln - 2, 0, 4.2, 0, TAU); g.fill(); // wrench head: open jaw at the tip
    g.fillStyle = '#2b2823'; g.fillRect(ln - 1.6, -1.6, 4.4, 3.2); g.lineWidth = 0.9; g.strokeStyle = '#2b2823'; g.beginPath(); g.arc(ln - 2, 0, 4.2, 0, TAU); g.stroke();
    if (on) { g.fillStyle = '#9dff90'; g.globalAlpha = alpha * (0.6 + 0.4 * Math.sin(G.time * 16)); g.beginPath(); g.arc(ln + 1, 0, 2.2, 0, TAU); g.fill(); g.globalAlpha = alpha; }
  }
  else if (t.pt && t.pt.barrel > 0) { // jammed barrel: bent upward with a scorched tip
    g.save(); g.rotate(-0.2); barrel(s, rec, c, g); g.fillStyle = '#17110f'; g.fillRect(s.barrel - 7, -s.bW * 0.7, 7, s.bW * 1.4); g.restore();
  }
  else barrel(s, rec, c, g);
  if (t.type === 'boss' && t.chargeT > 0) { // Komutan telegraph: the three muzzles heat up over 0.45 s before the triple shot
    const k = clamp(t.chargeT / 0.45, 0, 1), tipX = s.barrel - rec;
    for (const a of [-0.2, 0, 0.2]) {
      const x = Math.cos(a) * tipX, y = Math.sin(a) * tipX;
      g.globalAlpha = alpha;
      g.fillStyle = `rgba(40,12,6,${(0.65 * k).toFixed(2)})`; g.beginPath(); g.arc(x, y, 4.5 + 3 * k, 0, TAU); g.fill(); // darker rim keeps the glow readable on bright sand and snow
      if (fxScale === 1) { // the additive halo is skipped with low effects; the hot dot below still shows the charge
        g.globalCompositeOperation = 'lighter'; const gs = 16 + 32 * k; g.globalAlpha = alpha * (0.35 + 0.65 * k);
        g.drawImage(SPR.fire, x - gs / 2, y - gs / 2, gs, gs);
        g.globalCompositeOperation = 'source-over';
      }
      g.globalAlpha = alpha * (0.5 + 0.5 * k);
      g.fillStyle = k < 1 ? '#f0782a' : '#fff4d0'; g.beginPath(); g.arc(x, y, 3 + 2.2 * k, 0, TAU); g.fill();
    }
    g.globalAlpha = alpha;
  }
  if (U.loader) { // Otomatik yükleyici: ammo drum behind the turret, one brass round per level
    g.fillStyle = '#2b2823'; rrect(g, -tr * 1.05 - 5, -tr * 0.62, 7, tr * 1.24, 2); g.fill();
    g.fillStyle = '#d8a94a'; for (let k = 0; k < Math.min(5, U.loader); k++) g.fillRect(-tr * 1.05 - 4.2, -tr * 0.5 + k * tr * 0.22, 3.2, tr * 0.12);
  }
  g.fillStyle = c.dk; rrect(g, -tr * 1.05 - 1.5, -tr * 0.9 - 1.5, tr * 1.95 + 3, tr * 1.8 + 3, tr * 0.55); g.fill();
  g.fillStyle = c.body; rrect(g, -tr * 1.05, -tr * 0.9, tr * 1.95, tr * 1.8, tr * 0.5); g.fill();
  g.globalAlpha = alpha * 0.5; g.fillStyle = c.hi; rrect(g, -tr * 0.85, -tr * 0.72, tr * 1.45, tr * 0.5, tr * 0.25); g.fill(); g.globalAlpha = alpha;
  g.fillStyle = c.dk; g.beginPath(); g.arc(-tr * 0.35, tr * 0.28, tr * 0.3, 0, TAU); g.fill();
  if (U.thermal) { g.fillStyle = '#1f1d19'; g.beginPath(); g.arc(tr * 0.2, -tr * 0.58, 2.7, 0, TAU); g.fill(); g.fillStyle = '#ff8a3d'; g.beginPath(); g.arc(tr * 0.2, -tr * 0.58, 1.5, 0, TAU); g.fill(); }
  if (U.magnet) { // Mıknatıs: whip antenna with a blinking tip
    const ax = -tr * 0.65, ay = tr * 0.55, tx = ax - 11 - U.magnet * 2, ty = ay + 5;
    g.strokeStyle = '#1f1d19'; g.lineWidth = 1.3; g.lineCap = 'round'; g.beginPath(); g.moveTo(ax, ay); g.lineTo(tx, ty); g.stroke();
    g.globalAlpha = alpha * (0.6 + 0.4 * Math.sin(G.time * 6)); g.fillStyle = '#3fe0c5'; g.beginPath(); g.arc(tx, ty, 1.8, 0, TAU); g.fill(); g.globalAlpha = alpha;
  }
  g.fillStyle = c.acc;
  if (t.type === 'player') turretMarks(g, s, c, tr);
  else if (s.smart) {
    // Avcı: spinning radar bar over the hatch and a blinking sensor light
    const ra = G.time * 5 + t.id, rl = tr * 0.55, hx2 = -tr * 0.35, hy2 = tr * 0.28;
    g.strokeStyle = c.acc; g.lineWidth = 1.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(hx2 - Math.cos(ra) * rl, hy2 - Math.sin(ra) * rl); g.lineTo(hx2 + Math.cos(ra) * rl, hy2 + Math.sin(ra) * rl); g.stroke();
    g.globalAlpha = alpha * (0.55 + 0.45 * Math.sin(G.time * 9 + t.id));
    g.beginPath(); g.arc(tr * 0.62, 0, tr * 0.22, 0, TAU); g.fill(); g.globalAlpha = alpha;
  }
  else g.fillRect(tr * 0.15, -tr * 0.12, tr * 0.5, tr * 0.24);
  if (fl) { g.globalAlpha = alpha * fl; g.fillStyle = '#fff'; rrect(g, -tr * 1.05, -tr * 0.9, tr * 1.95, tr * 1.8, tr * 0.5); g.fill(); }
  g.restore();
  if (t.pt) for (const k of ['tread', 'barrel', 'engine']) if (t.pt[k] > 0) { const q = partWorld(t, k); repairRing(g, q.x, q.y - 15, 1 - t.pt[k] / t.pt.dur[k], alpha); } // repair progress above the part
}
// Tamirci: green repair beam from the crane tip to the ally (moving dashes, soft glow)
function drawRepairBeam(e) {
  const o = e.beamOn, ln = e.spec.barrel + 1, x0 = e.x + Math.cos(e.turret) * ln, y0 = e.y + Math.sin(e.turret) * ln, pulse = 0.65 + 0.35 * Math.sin(G.time * 14);
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(40,120,40,.55)'; ctx.lineWidth = 6.5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(o.x, o.y); ctx.stroke(); // dark rim keeps it readable on every map
  ctx.strokeStyle = `rgba(120,255,120,${(0.55 + 0.3 * pulse).toFixed(2)})`; ctx.lineWidth = 4; ctx.stroke();
  ctx.strokeStyle = '#eaffe6'; ctx.lineWidth = 1.6; ctx.setLineDash([7, 9]); ctx.lineDashOffset = -G.time * 60; ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = `rgba(150,255,140,${(0.35 * pulse).toFixed(2)})`; ctx.beginPath(); ctx.arc(o.x, o.y, o.r + 4 + 2 * pulse, 0, TAU); ctx.fill();
  ctx.restore();
}
// a small ring that fills while a broken part is being repaired (normal enemies and boss treads)
function repairRing(g, x, y, k, alpha) {
  g.save(); g.globalAlpha = alpha; g.lineWidth = 2.6; g.strokeStyle = 'rgba(20,16,10,.7)'; g.beginPath(); g.arc(x, y, 5.5, 0, TAU); g.stroke();
  g.lineWidth = 2; g.strokeStyle = '#ffd24a'; g.beginPath(); g.arc(x, y, 5.5, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(k, 0.02, 1)); g.stroke();
  g.fillStyle = '#ffd24a'; g.fillRect(x - 0.9, y - 2.6, 1.8, 5.2); g.fillRect(x - 2.6, y - 0.9, 5.2, 1.8); g.restore();
}
// Dondurucu: an ice shell over every frozen tank, fading out in the last half second
function drawFrost(e) {
  const s = e.spec, a = clamp(G.buffs.freeze / 0.5, 0, 1), rng = mulberry32(e.id * 7919);
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.angle);
  ctx.globalAlpha = 0.58 * a; ctx.fillStyle = '#d6f3ff'; rrect(ctx, -s.len / 2 - 2, -s.wid / 2 - 2, s.len + 4, s.wid + 4, 6); ctx.fill();
  ctx.globalAlpha = 0.9 * a; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.globalAlpha = 0.75 * a; ctx.strokeStyle = '#7cc8ee'; ctx.lineWidth = 1.2; ctx.beginPath();
  for (let k = 0; k < 5; k++) { const x = (rng() - 0.5) * s.len * 0.8, y = (rng() - 0.5) * s.wid * 0.8, l = 3 + rng() * 4; ctx.moveTo(x - l, y - l * 0.6); ctx.lineTo(x + l, y + l * 0.6); }
  ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1;
}
// Termal kamera: heat outline of a tank hiding in a bush
function drawThermal(e) {
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45 + 0.1 * Math.sin(G.time * 5 + e.id);
  const gs = e.spec.len * 1.7; ctx.drawImage(SPR.fire, e.x - gs / 2, e.y - gs / 2, gs, gs);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  drawTank(e, 0.5);
}
/* ================= boss drawing ================= */
// drawTank hands bosses to drawBoss. Komutan: bordeaux hull, gold trim, three barrels, command tower with a banner (bigger than the old Komutan: 90 long).
function drawBoss(e, alpha, g) {
  if (e.def && e.def.draw) e.def.draw(e, g, alpha); else drawKomutan(e, g, alpha);
  if (e.tr) drawBossPartDamage(e, g, alpha);
}
// part damage on every boss (11a): broken treads (missing links, loose pieces), silent barrels (bent dark stub), repair rings above the treads
function drawBossPartDamage(e, g, alpha) {
  const s = e.spec, L = s.len, W = s.wid, tw = s.tread;
  g.save(); g.translate(e.x, e.y); g.rotate(e.angle); g.globalAlpha = alpha;
  for (let i = 0; i < 2; i++) {
    if (e.tr[i].t <= 0) continue;
    const y0 = i ? W / 2 - tw : -W / 2;
    g.fillStyle = 'rgba(8,6,4,.8)'; g.fillRect(-L * 0.34, y0 + 0.5, L * 0.5, tw - 1);
    g.fillStyle = '#4b473e'; for (let k = 0; k < 5; k++) g.fillRect(-L * 0.38 + k * 5.5, y0 + ((k * 5) % 4) + 0.8, 3.4, 2.2);
    g.strokeStyle = '#ffb04a'; g.lineWidth = 1.2; g.globalAlpha = alpha * (0.5 + 0.5 * Math.sin(G.time * 18)); g.beginPath(); g.moveTo(-L * 0.34, y0 + 1); g.lineTo(-L * 0.34, y0 + tw - 1); g.stroke(); g.globalAlpha = alpha;
  }
  g.rotate(e.turret - e.angle);
  for (const b of e.bars) {
    if (b.t <= 0) continue;
    g.save(); g.rotate(b.ang); const tip = s.barrel + 2 - e.recoil * 5;
    g.rotate(-0.25); g.fillStyle = '#17110f'; g.fillRect(tip - 16, -7, 18, 14); g.fillStyle = '#ffb04a'; g.globalAlpha = alpha * (0.4 + 0.4 * Math.sin(G.time * 20)); g.fillRect(tip, -2, 2.5, 4);
    g.restore();
  }
  g.restore();
  for (let i = 0; i < 2; i++) { const tr = e.tr[i]; if (tr.t > 0) { const q = treadWorld(e, i); repairRing(g, q.x, q.y - 18, 1 - tr.t / BT.halt, alpha); } }
  const jam = e.bars.find(b => b.t > 0); if (jam) { const mx = e.x + Math.cos(e.turret + jam.ang) * s.barrel, my = e.y + Math.sin(e.turret + jam.ang) * s.barrel; repairRing(g, mx, my - 18, 1 - jam.t / BT.silent, alpha); }
  g.globalAlpha = 1;
}
function drawKomutan(e, g, alpha) {
  const s = e.spec, c = s.col, L = s.len, W = s.wid, tw = s.tread, tr = s.tR, lost = e.lost, tower = e.parts.find(p => p.id === 'tower');
  g.save(); g.translate(e.x, e.y); g.rotate(e.angle); g.globalAlpha = alpha;
  // treads
  g.fillStyle = '#1f1d19'; rrect(g, -L / 2, -W / 2, L, tw, 4); g.fill(); rrect(g, -L / 2, W / 2 - tw, L, tw, 4); g.fill();
  g.fillStyle = '#4b473e'; const st = 6;
  let o = ((e.treadL % st) + st) % st; for (let x = -L / 2 + o; x < L / 2 - 2; x += st) g.fillRect(x, -W / 2 + 1.5, 2, tw - 3);
  o = ((e.treadR % st) + st) % st; for (let x = -L / 2 + o; x < L / 2 - 2; x += st) g.fillRect(x, W / 2 - tw + 1.5, 2, tw - 3);
  // hull
  const hx = -L / 2 + 3, hw = L - 6, hy = -W / 2 + tw - 3, hh = W - 2 * tw + 6;
  g.fillStyle = c.dk; rrect(g, hx, hy, hw, hh, 6); g.fill();
  g.fillStyle = c.body; rrect(g, hx + 2, hy + 2, hw - 4, hh - 4, 5); g.fill();
  g.fillStyle = c.hi; g.globalAlpha = alpha * 0.8; g.fillRect(hx + hw - 16, hy + 4, 8, hh - 8); g.globalAlpha = alpha; // front glacis
  g.fillStyle = c.acc; g.fillRect(hx + 8, hy + 5, hw - 34, 2); g.fillRect(hx + 8, hy + hh - 7, hw - 34, 2);
  g.fillStyle = c.dk; for (let k = 0; k < 4; k++) g.fillRect(hx + 6 + k * 4, hy + hh * 0.5 - 8, 2, 16);
  if (!lost.exhaust) { g.fillStyle = '#2b2823'; rrect(g, -L / 2 - 4, -9, 8, 18, 2); g.fill(); g.fillStyle = '#6d5a50'; for (let k = -1; k <= 1; k++) g.fillRect(-L / 2 - 2.5, k * 5 - 1, 5, 2); }
  else { g.fillStyle = '#14110f'; rrect(g, -L / 2 - 2, -9, 5, 18, 2); g.fill(); }
  g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.5; rrect(g, -L / 2, -W / 2, L, W, 5); g.stroke();
  // skirts (fall in phase 3)
  if (!lost.skirt) for (const sy of [-1, 1]) for (let k = 0; k < 4; k++) {
    const x0 = -L / 2 + 6 + k * (L - 12) / 4, ww = (L - 12) / 4 - 1.5, y0 = sy < 0 ? -W / 2 - 4 : W / 2 + 4 - 9;
    g.fillStyle = c.dk; g.fillRect(x0, y0, ww, 9); g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(x0, y0, ww, 1.4); g.fillStyle = c.acc; g.fillRect(x0 + ww / 2 - 1, y0 + 4, 2, 2);
  } else { g.fillStyle = '#14110f'; for (const sy of [-1, 1]) for (let k = 0; k < 4; k++) g.fillRect(-L / 2 + 6 + k * (L - 12) / 4, sy < 0 ? -W / 2 - 1 : W / 2 + 1, 3, 2); }
  // shoulder armour (falls in phase 2)
  if (!lost.shoulder) for (const sy of [-1, 1]) {
    g.fillStyle = c.dk; rrect(g, 6, sy < 0 ? -W / 2 + tw - 2 - 14 : W / 2 - tw + 2, 26, 14, 4); g.fill();
    g.fillStyle = c.hi; g.globalAlpha = alpha * 0.55; rrect(g, 8, sy < 0 ? -W / 2 + tw - 2 - 12 : W / 2 - tw + 4, 22, 5, 2); g.fill(); g.globalAlpha = alpha;
    g.fillStyle = c.acc; g.fillRect(8, sy < 0 ? -W / 2 + tw - 2 - 3 : W / 2 - tw + 3, 22, 1.8);
  }
  if (!lost.fender) { g.fillStyle = c.dk; rrect(g, -L / 2 + 2, -W / 2 - 1, 18, 7, 3); g.fill(); g.fillStyle = c.acc; g.fillRect(-L / 2 + 6, -W / 2 + 1, 10, 1.4); }
  // command tower with the banner; destroyed: a blackened, sparking socket
  const tx = -24;
  if (!tower || tower.alive) {
    if (tower) { g.fillStyle = c.dk; rrect(g, tx - 11, -11, 22, 22, 4); g.fill(); g.fillStyle = '#2d0d13'; rrect(g, tx - 8, -8, 16, 16, 3); g.fill(); g.fillStyle = c.acc; g.fillRect(tx - 8, -8, 16, 2.5); g.fillRect(tx - 5, -1, 10, 2); }
    if (!lost.flag) {
      const sw = Math.sin(G.time * 6) * 3, fx = tx - 4;
      g.strokeStyle = '#1f1d19'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(tx, 0); g.lineTo(fx, 0); g.stroke();
      g.fillStyle = c.acc; g.beginPath(); g.moveTo(fx, -8); g.lineTo(fx - 22, -8 + sw); g.lineTo(fx - 18, 0); g.lineTo(fx - 22, 8 - sw); g.lineTo(fx, 8); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(40,16,6,.8)'; g.lineWidth = 1.2; g.stroke(); g.fillStyle = c.dk; g.beginPath(); g.arc(fx - 9, 0, 3, 0, TAU); g.fill();
    }
  } else {
    g.fillStyle = '#17110f'; g.beginPath(); g.arc(tx, 0, 11, 0, TAU); g.fill();
    g.strokeStyle = '#000'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(tx - 8, -4); g.lineTo(tx - 1, 1); g.lineTo(tx + 6, -5); g.moveTo(tx - 2, 1); g.lineTo(tx + 2, 9); g.stroke();
    g.fillStyle = 'rgba(255,150,60,' + (0.35 + 0.35 * Math.sin(G.time * 17)).toFixed(2) + ')'; g.beginPath(); g.arc(tx + 2, 2, 3, 0, TAU); g.fill();
    g.fillStyle = 'rgba(240,190,70,.55)'; g.fillRect(tx + 8, 6, 14, 5); // the fallen banner on the deck
  }
  if (!lost.antenna) { const ax = -L / 2 + 8, ay = -W / 2 + tw + 4; g.strokeStyle = '#1f1d19'; g.lineWidth = 1.3; g.lineCap = 'round'; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax - 14, ay - 8); g.stroke(); g.globalAlpha = alpha * (0.6 + 0.4 * Math.sin(G.time * 6)); g.fillStyle = '#ff5a3a'; g.beginPath(); g.arc(ax - 14, ay - 8, 2, 0, TAU); g.fill(); g.globalAlpha = alpha; }
  if (!lost.plate) { g.fillStyle = c.dk; g.fillRect(hx + hw - 30, -hh / 2 + 3, 10, 6); g.fillStyle = c.acc; g.fillRect(hx + hw - 29, -hh / 2 + 5, 8, 1.4); }
  // scorch marks from the hits taken
  g.fillStyle = 'rgba(20,10,8,.55)'; g.strokeStyle = 'rgba(255,170,90,.35)'; g.lineWidth = 0.8;
  for (const q of e.scorch) { g.save(); g.translate(q.x, q.y); g.rotate(q.a); g.beginPath(); g.ellipse(0, 0, q.r * 1.3, q.r * 0.85, 0, 0, TAU); g.fill(); g.stroke(); g.restore(); }
  // hit flash
  const fl = e.flash > 0 ? Math.min(1, e.flash * 10) * 0.8 : 0;
  if (fl) { g.globalAlpha = alpha * fl; g.fillStyle = '#fff'; rrect(g, -L / 2, -W / 2, L, W, 5); g.fill(); g.globalAlpha = alpha; }
  // turret and the three barrels
  g.rotate(e.turret - e.angle);
  const rec = e.recoil * 5, gk = clamp(e.glow, 0, 1);
  for (const [a, len, bw] of [[-0.2, s.barrel - 6, 7], [0.2, s.barrel - 6, 7], [0, s.barrel + 2, 11]]) {
    g.save(); g.rotate(a);
    g.fillStyle = '#1f1d19'; g.fillRect(tr * 0.4 - rec - 1, -bw / 2 - 1, len - tr * 0.4 + 2, bw + 2);
    g.fillStyle = c.dk; g.fillRect(tr * 0.4 - rec, -bw / 2, len - tr * 0.4, bw);
    g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(tr * 0.4 - rec, -bw / 2 + 1, len - tr * 0.4, 1.2);
    g.fillStyle = c.acc; g.fillRect(len - rec - 8, -bw / 2 - 1, 2, bw + 2); g.fillRect(len - rec - 4, -bw / 2 - 1, 2, bw + 2);
    g.restore();
  }
  if (gk > 0) for (const a of KOM_FAN3) { // glow telegraph at the muzzles
    const x = Math.cos(a) * (s.barrel - rec + 2), y = Math.sin(a) * (s.barrel - rec + 2);
    g.fillStyle = `rgba(40,12,6,${(0.65 * gk).toFixed(2)})`; g.beginPath(); g.arc(x, y, 5 + 3 * gk, 0, TAU); g.fill();
    if (fxScale === 1) { g.globalCompositeOperation = 'lighter'; const gs = 20 + 38 * gk; g.globalAlpha = alpha * (0.35 + 0.65 * gk); g.drawImage(SPR.fire, x - gs / 2, y - gs / 2, gs, gs); g.globalCompositeOperation = 'source-over'; }
    g.globalAlpha = alpha * (0.5 + 0.5 * gk); g.fillStyle = gk < 1 ? '#f0782a' : '#fff4d0'; g.beginPath(); g.arc(x, y, 3.5 + 2.5 * gk, 0, TAU); g.fill(); g.globalAlpha = alpha;
  }
  g.fillStyle = c.dk; rrect(g, -tr * 1.1 - 2, -tr * 0.95 - 2, tr * 2.05 + 4, tr * 1.9 + 4, tr * 0.6); g.fill();
  g.fillStyle = c.body; rrect(g, -tr * 1.1, -tr * 0.95, tr * 2.05, tr * 1.9, tr * 0.55); g.fill();
  g.globalAlpha = alpha * 0.5; g.fillStyle = c.hi; rrect(g, -tr * 0.9, -tr * 0.78, tr * 1.5, tr * 0.55, tr * 0.27); g.fill(); g.globalAlpha = alpha;
  g.strokeStyle = c.acc; g.lineWidth = 2; g.beginPath(); g.arc(-tr * 0.25, 0, tr * 0.5, 0, TAU); g.stroke();
  g.fillStyle = c.dk; g.beginPath(); g.arc(-tr * 0.25, 0, tr * 0.28, 0, TAU); g.fill();
  if (fl) { g.globalAlpha = alpha * fl; g.fillStyle = '#fff'; rrect(g, -tr * 1.1, -tr * 0.95, tr * 2.05, tr * 1.9, tr * 0.55); g.fill(); }
  g.restore();
}
// warnings on the ground (under the tanks)
function drawTele() {
  if (G.boss && G.boss.def && G.boss.def.drawGround) G.boss.def.drawGround(G.boss, ctx); // per-boss ground layer (sand strips, wind arrows)
  if (!G.tele.length) return;
  const e = G.boss; ctx.save();
  for (const tl of G.tele) {
    const k = clamp(tl.t / tl.dur, 0, 1);
    if (tl.kind === 'line') {
      const locked = tl.t >= tl.dur - tl.lock, len = tl.len, w = tl.w;
      ctx.save(); ctx.translate(tl.x, tl.y); ctx.rotate(tl.a);
      ctx.fillStyle = locked ? 'rgba(140,16,12,.5)' : `rgba(224,60,40,${(0.16 + 0.2 * k).toFixed(3)})`; ctx.fillRect(0, -w / 2, len, w);
      ctx.strokeStyle = locked ? 'rgba(90,6,6,.95)' : 'rgba(255,90,60,.85)'; ctx.lineWidth = locked ? 3 : 2; ctx.setLineDash(locked ? [] : [14, 10]); ctx.lineDashOffset = -G.time * 60;
      ctx.strokeRect(0, -w / 2, len, w); ctx.setLineDash([]);
      ctx.strokeStyle = locked ? 'rgba(255,230,200,.8)' : 'rgba(255,200,170,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
      ctx.restore();
    } else if (tl.kind === 'circle') {
      ctx.fillStyle = 'rgba(224,60,40,.14)'; ctx.beginPath(); ctx.arc(tl.x, tl.y, tl.r, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(224,60,40,${(0.18 + 0.3 * k).toFixed(3)})`; ctx.beginPath(); ctx.arc(tl.x, tl.y, tl.r * k, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,100,70,.95)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(tl.x, tl.y, tl.r, 0, TAU); ctx.stroke();
      ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(tl.x - tl.r * 0.45, tl.y); ctx.lineTo(tl.x + tl.r * 0.45, tl.y); ctx.moveTo(tl.x, tl.y - tl.r * 0.45); ctx.lineTo(tl.x, tl.y + tl.r * 0.45); ctx.stroke();
    } else if (tl.kind === 'ring' && e) {
      ctx.fillStyle = `rgba(224,60,40,${(0.1 + 0.2 * k).toFixed(3)})`; ctx.beginPath(); ctx.arc(e.x, e.y, tl.r * k, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,100,70,.9)'; ctx.lineWidth = 3; ctx.setLineDash([16, 10]); ctx.lineDashOffset = -G.time * 50; ctx.beginPath(); ctx.arc(e.x, e.y, tl.r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255,230,200,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y, tl.r * k, 0, TAU); ctx.stroke();
    }
  }
  ctx.restore(); ctx.globalAlpha = 1;
}
// pieces that broke off the boss lie on the ground for a few seconds
function drawPieces() {
  for (const q of G.pieces) {
    const f = q.t > q.life - 1 ? clamp(q.life - q.t, 0, 1) : 1, c = q.col;
    ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.a); ctx.globalAlpha = f;
    if (q.k === 'flag') { ctx.fillStyle = c.acc; ctx.fillRect(-14, -7, 28, 14); ctx.fillStyle = c.dk; ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); ctx.fill(); }
    else if (q.k === 'antenna') { ctx.strokeStyle = '#1f1d19'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke(); }
    else { const w = q.big ? 28 : 18, h = q.big ? 16 : 9; ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-w / 2 + 3, -h / 2 + 4, w, h); ctx.fillStyle = c.dk; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.fillStyle = c.body; ctx.fillRect(-w / 2 + 1.5, -h / 2 + 1.5, w - 3, h - 3); ctx.fillStyle = c.acc; ctx.fillRect(-w / 2 + 2, -1, w - 4, 1.6); }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
/* ================= Sarı Fırtına drawing ================= */
// Arrow-shaped hardal hull, one barrel, two arrow marks at the back, orange exhausts at the sides (lit from phase 2); sand whirlwind in the intro and death scene;
// sand strips and wind arrows on the ground (drawGround, called from drawTele in 15a).
function sariWhirl(g, cx, cy, k, tt, h, rTop) { // a sand funnel standing on (cx, cy); k 0..1 is its strength
  if (k <= 0.01) return;
  const N = 12; g.save(); g.lineCap = 'round';
  for (let j = 0; j < N; j++) {
    const f = j / (N - 1), yy = cy - f * h, rr = 12 + (rTop - 12) * f * f, wob = Math.sin(tt * 5 + j * 0.9) * rr * 0.12;
    g.strokeStyle = `rgba(${j & 1 ? '239,202,96' : '207,159,48'},${(k * (0.5 - 0.3 * f)).toFixed(3)})`; g.lineWidth = 3 + 3 * (1 - f);
    const a0 = tt * (6 + j * 0.3) + j * 1.7; g.beginPath(); g.ellipse(cx + wob, yy, rr, rr * 0.28, 0, a0, a0 + Math.PI * 1.35); g.stroke();
  }
  g.restore();
}
function drawSari(e, g, alpha) {
  const s = e.spec, c = s.col, L = s.len, W = s.wid, tw = s.tread, tr = s.tR, tt = G.time, intro = G.phase === 'bossIntro';
  let spin = 0; if (e.dying) { const d = Math.min(e.deathT, 2.4); spin = 16 * (d - d * d / 4.8); } // spins down as it dies
  if (intro) alpha *= clamp(0.35 + G.phaseT / 1.35 * 0.65, 0, 1);
  g.save(); g.translate(e.x, e.y); g.rotate(e.angle + spin); g.globalAlpha = alpha;
  // treads
  g.fillStyle = '#1f1d19'; rrect(g, -L / 2 + 3, -W / 2, L - 8, tw, 3); g.fill(); rrect(g, -L / 2 + 3, W / 2 - tw, L - 8, tw, 3); g.fill();
  g.fillStyle = '#4b473e'; const st = 5;
  let o = ((e.treadL % st) + st) % st; for (let x = -L / 2 + 5 + o; x < L / 2 - 8; x += st) g.fillRect(x, -W / 2 + 1.5, 2, tw - 3);
  o = ((e.treadR % st) + st) % st; for (let x = -L / 2 + 5 + o; x < L / 2 - 8; x += st) g.fillRect(x, W / 2 - tw + 1.5, 2, tw - 3);
  // exhausts at the sides (orange), flames behind them from phase 2
  const lit = e.phase >= 1;
  for (const sy of [-1, 1]) {
    const ex = -L / 2 + 6, ey = sy * (W / 2 + 1);
    if (lit) {
      const fl = 0.7 + 0.3 * Math.sin(tt * 40 + sy);
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = alpha * 0.9 * fl; const gs = 38 * fl; g.drawImage(SPR.fire, ex - 12 - gs / 2, ey - gs / 2, gs, gs); g.globalCompositeOperation = 'source-over'; g.globalAlpha = alpha;
    }
    g.fillStyle = '#2b2823'; rrect(g, ex - 2, ey - 3.5, 15, 7, 2); g.fill();
    g.fillStyle = lit ? '#ffb04a' : c.acc; rrect(g, ex, ey - 2.5, 11, 5, 2); g.fill();
    g.fillStyle = '#14110f'; g.fillRect(ex - 3, ey - 2, 3, 4);
  }
  // arrow-shaped hull
  const hh = W / 2 - tw + 3, pts = [[L / 2, 0], [L / 2 - 26, -hh], [-L / 2, -hh], [-L / 2 + 14, 0], [-L / 2, hh], [L / 2 - 26, hh]];
  const path = (inset) => { g.beginPath(); pts.forEach(([x, y], i) => { const ix = x - Math.sign(x) * inset * 0.6, iy = y - Math.sign(y) * inset; i ? g.lineTo(ix, iy) : g.moveTo(ix, iy); }); g.closePath(); };
  g.lineJoin = 'round'; path(0); g.fillStyle = c.dk; g.fill(); path(2.5); g.fillStyle = c.body; g.fill();
  g.globalAlpha = alpha * 0.8; g.fillStyle = c.hi; g.beginPath(); g.moveTo(L / 2 - 6, 0); g.lineTo(L / 2 - 24, -hh + 5); g.lineTo(L / 2 - 24, hh - 5); g.closePath(); g.fill(); g.globalAlpha = alpha; // front glacis
  g.strokeStyle = c.acc; g.lineWidth = 3.2; g.lineCap = 'round'; g.lineJoin = 'miter'; // two arrow marks at the back
  for (const x0 of [-L / 2 + 22, -L / 2 + 31]) { g.beginPath(); g.moveTo(x0 - 6, -8); g.lineTo(x0, 0); g.lineTo(x0 - 6, 8); g.stroke(); }
  g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.4; g.lineJoin = 'round'; path(0); g.stroke();
  // scorch marks, hit flash
  g.fillStyle = 'rgba(20,10,8,.55)'; g.strokeStyle = 'rgba(255,170,90,.35)'; g.lineWidth = 0.8;
  for (const q of e.scorch) { g.save(); g.translate(q.x, q.y); g.rotate(q.a); g.beginPath(); g.ellipse(0, 0, q.r * 1.3, q.r * 0.85, 0, 0, TAU); g.fill(); g.stroke(); g.restore(); }
  const fl = e.flash > 0 ? Math.min(1, e.flash * 10) * 0.8 : 0;
  if (fl) { g.globalAlpha = alpha * fl; g.fillStyle = '#fff'; path(0); g.fill(); g.globalAlpha = alpha; }
  // turret with the single barrel
  g.rotate(e.turret - e.angle - spin);
  const rec = e.recoil * 4, gk = clamp(e.glow, 0, 1), len = s.barrel, bw = s.bW;
  g.fillStyle = '#1f1d19'; g.fillRect(tr * 0.4 - rec - 1, -bw / 2 - 1, len - tr * 0.4 + 2, bw + 2);
  g.fillStyle = c.dk; g.fillRect(tr * 0.4 - rec, -bw / 2, len - tr * 0.4, bw);
  g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(tr * 0.4 - rec, -bw / 2 + 1, len - tr * 0.4, 1.2);
  g.fillStyle = c.acc; g.fillRect(len - rec - 8, -bw / 2 - 1, 3, bw + 2);
  if (gk > 0) {
    const x = len - rec + 2;
    g.fillStyle = `rgba(40,12,6,${(0.65 * gk).toFixed(2)})`; g.beginPath(); g.arc(x, 0, 5 + 3 * gk, 0, TAU); g.fill();
    if (fxScale === 1) { g.globalCompositeOperation = 'lighter'; const gs = 20 + 38 * gk; g.globalAlpha = alpha * (0.35 + 0.65 * gk); g.drawImage(SPR.fire, x - gs / 2, -gs / 2, gs, gs); g.globalCompositeOperation = 'source-over'; }
    g.globalAlpha = alpha * (0.5 + 0.5 * gk); g.fillStyle = gk < 1 ? '#f0782a' : '#fff4d0'; g.beginPath(); g.arc(x, 0, 3.5 + 2.5 * gk, 0, TAU); g.fill(); g.globalAlpha = alpha;
  }
  g.fillStyle = c.dk; g.beginPath(); g.arc(0, 0, tr + 1.5, 0, TAU); g.fill();
  g.fillStyle = c.body; g.beginPath(); g.arc(0, 0, tr, 0, TAU); g.fill();
  g.globalAlpha = alpha * 0.5; g.fillStyle = c.hi; g.beginPath(); g.ellipse(-2, -3, tr * 0.65, tr * 0.4, 0, 0, TAU); g.fill(); g.globalAlpha = alpha;
  g.strokeStyle = c.acc; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, tr * 0.5, 0, TAU); g.stroke();
  if (fl) { g.globalAlpha = alpha * fl; g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, tr, 0, TAU); g.fill(); }
  g.restore();
  // whirlwind: coming down in the intro, a faint swirl in the storm phase, dying down with the boss
  if (g === ctx) {
    if (intro) { const t = G.phaseT, k = t < 1.35 ? Math.min(1, t / 0.6) : Math.max(0, 1 - (t - 1.35) / 0.9); sariWhirl(g, e.x, e.y + 14, k, t, 60 + 240 * Math.min(1, t / 0.8), 70); }
    else if (e.dying) sariWhirl(g, e.x, e.y + 14, Math.max(0, 1 - e.deathT / 2.3), G.time, 120, 64);
    else if (e.phase >= 2) sariWhirl(g, e.x, e.y + 14, 0.5, G.time, 50, 38);
  }
}
const SARI_ARROW = [[60, 0], [8, -40], [8, -17], [-60, -17], [-60, 17], [8, 17], [8, 40]]; // big wind arrow, pointing along +x
function drawSariGround(e, g) {
  const S = e.sari; if (!S) return;
  for (const q of S.sand) { // sand strips
    const dx = q.x2 - q.x1, dy = q.y2 - q.y1, l = Math.hypot(dx, dy); if (l < 2) continue;
    const a = q.t < 0 ? 1 : clamp((SARI_SAND_LIFE - q.t) / 0.8, 0, 1);
    g.save(); g.translate(q.x1, q.y1); g.rotate(Math.atan2(dy, dx)); g.globalAlpha = a;
    g.fillStyle = 'rgba(120,78,20,.38)'; rrect(g, 0, -q.w / 2, l, q.w, 10); g.fill();
    g.strokeStyle = 'rgba(70,42,8,.55)'; g.lineWidth = 2; g.setLineDash([10, 8]); rrect(g, 0, -q.w / 2, l, q.w, 10); g.stroke(); g.setLineDash([]);
    g.strokeStyle = 'rgba(245,215,130,.5)'; g.lineWidth = 2;
    for (const yy of [-q.w * 0.25, 0, q.w * 0.25]) { g.beginPath(); for (let x = 4; x < l - 4; x += 8) g.lineTo(x, yy + Math.sin(x * 0.18 + yy) * 3); g.stroke(); }
    g.restore();
  }
  const W = S.wind; if (W.st === 'idle') return;
  const m = G.map, warn = W.st === 'warn', k = warn ? W.t / SARI_WIND_WARN : 1 - clamp((W.t - SARI_WIND_BLOW + 0.8) / 0.8, 0, 1);
  const al = warn ? 0.2 + 0.35 * k + 0.2 * Math.abs(Math.sin(G.time * 12)) : 0.2 * k, sp = 270, drift = warn ? 0 : (G.time * 220) % sp;
  g.save(); g.fillStyle = `rgba(240,138,44,${al.toFixed(3)})`; g.strokeStyle = `rgba(90,40,6,${(al * 1.3).toFixed(3)})`; g.lineWidth = 3; g.lineJoin = 'round';
  const ca = Math.cos(W.a), sa = Math.sin(W.a);
  for (let u = -1; u < 5; u++) for (let v = 0; v < 4; v++) {
    const bx = (v + 0.5) * sp * 0.95 + (u % 2 ? sp * 0.3 : 0), by = (u + 0.5) * sp * 0.95;
    if (!(m.w >= 0)) continue;
    const x = ((bx + ca * drift) % (m.w + 100) + m.w + 100) % (m.w + 100) - 50, y = ((by + sa * drift) % (m.h + 100) + m.h + 100) % (m.h + 100) - 50;
    g.save(); g.translate(x, y); g.rotate(W.a); g.beginPath(); SARI_ARROW.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.closePath(); g.fill(); g.stroke(); g.restore();
  }
  g.restore(); g.globalAlpha = 1;
}
/* ================= Demirkök drawing ================= */
// Wide square iron hull (110 x 96), twin main barrels, two side turrets with red eyes (blackened sockets when destroyed), a red stripe down the hull, a rear exhaust grille (the weak point
// once rooted), grey-blue shield shimmer while a turret lives, iron roots under the hull when rooted. Ground layer (drawGround from 15a): root tiles, the sweep wedge and its red line.
function drawDemirkok(e, g, alpha) {
  const s = e.spec, c = s.col, L = s.len, W = s.wid, tw = s.tread, tr = s.tR, dk = e.dk, tt = G.time, lost = e.lost;
  const dth = e.dying ? Math.min(1, e.deathT / 2.4) : 0, lift = dk.lift, sc = 1 + 0.07 * lift - 0.1 * dth;
  if (lift > 0.02) { g.save(); g.globalAlpha = alpha * 0.3 * lift; g.fillStyle = '#000'; g.beginPath(); g.ellipse(e.x + 6, e.y + 14, L * 0.62, W * 0.58, e.angle, 0, TAU); g.fill(); g.restore(); }
  if (dk.root > 0.02) { // iron roots going down from the hull
    g.save(); g.translate(e.x, e.y); g.lineCap = 'round';
    for (let k = 0; k < 11; k++) {
      const a = k * TAU / 11 + 0.3 * Math.sin(k * 7.3), len = (e.r + 22 + 26 * Math.abs(Math.sin(k * 3.1))) * dk.root, bend = Math.sin(k * 5.7) * 0.5;
      const x1 = Math.cos(a) * len, y1 = Math.sin(a) * len, cx = Math.cos(a + bend) * len * 0.55, cy = Math.sin(a + bend) * len * 0.55;
      g.globalAlpha = alpha * Math.min(1, dk.root * 1.4);
      g.strokeStyle = '#25221d'; g.lineWidth = 9; g.beginPath(); g.moveTo(Math.cos(a) * e.r * 0.6, Math.sin(a) * e.r * 0.6); g.quadraticCurveTo(cx, cy, x1, y1); g.stroke();
      g.strokeStyle = c.acc; g.globalAlpha *= 0.5 + 0.3 * Math.sin(tt * 4 + k); g.lineWidth = 2; g.stroke();
    }
    g.restore();
  }
  g.save(); g.translate(e.x, e.y); g.rotate(e.angle); g.scale(sc, sc); g.globalAlpha = alpha;
  // treads
  g.fillStyle = '#1f1d19'; rrect(g, -L / 2, -W / 2, L, tw, 4); g.fill(); rrect(g, -L / 2, W / 2 - tw, L, tw, 4); g.fill();
  g.fillStyle = '#4b473e'; const st = 6;
  let o = ((e.treadL % st) + st) % st; for (let x = -L / 2 + o; x < L / 2 - 2; x += st) g.fillRect(x, -W / 2 + 1.5, 2, tw - 3);
  o = ((e.treadR % st) + st) % st; for (let x = -L / 2 + o; x < L / 2 - 2; x += st) g.fillRect(x, W / 2 - tw + 1.5, 2, tw - 3);
  // hull: a wide block with cut corners
  const hx = -L / 2 + 2, hw = L - 4, hy = -W / 2 + 7, hh = W - 14;
  const hullPath = () => { g.beginPath(); g.moveTo(hx + 8, hy); g.lineTo(hx + hw - 8, hy); g.lineTo(hx + hw, hy + 8); g.lineTo(hx + hw, hy + hh - 8); g.lineTo(hx + hw - 8, hy + hh); g.lineTo(hx + 8, hy + hh); g.lineTo(hx, hy + hh - 8); g.lineTo(hx, hy + 8); g.closePath(); };
  hullPath(); g.fillStyle = c.dk; g.fill();
  g.save(); hullPath(); g.clip();
  g.fillStyle = c.body; g.fillRect(hx + 3, hy + 3, hw - 6, hh - 6);
  g.fillStyle = c.hi; g.globalAlpha = alpha * 0.55; g.fillRect(hx + hw - 18, hy + 4, 12, hh - 8); g.globalAlpha = alpha; // front glacis
  g.fillStyle = c.dk; for (let k = 0; k < 5; k++) { g.fillRect(hx + 10 + k * 5, hy + 7, 2, 7); g.fillRect(hx + 10 + k * 5, hy + hh - 14, 2, 7); }
  g.fillStyle = c.acc; g.fillRect(hx + 12, -3.5, hw - 36, 7); // red stripe down the hull
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(hx + 12, 3.5, hw - 36, 1.5);
  for (const sy of [-1, 1]) { g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(hx + 10, sy < 0 ? hy + 2 : hy + hh - 4, hw - 30, 1.6); }
  // side armour over the treads (the plates fall in phases 2 and 3)
  if (!lost.plate) for (const sy of [-1, 1]) { g.fillStyle = c.dk; rrect(g, 4, sy < 0 ? hy - 1 : hy + hh - 11, 34, 12, 3); g.fill(); g.fillStyle = c.hi; g.globalAlpha = alpha * 0.5; g.fillRect(6, sy < 0 ? hy + 1 : hy + hh - 9, 30, 3); g.globalAlpha = alpha; }
  if (!lost.fender) { g.fillStyle = c.dk; rrect(g, -L / 2 + 2, -W / 2 - 1, 22, 8, 3); g.fill(); g.fillStyle = c.acc; g.fillRect(-L / 2 + 6, -W / 2 + 1.5, 14, 1.5); }
  g.restore();
  // rear exhaust grille; the weak point when rooted
  const gx = -L / 2 - 3, hot = e.rooted ? 0.5 + 0.5 * Math.sin(tt * 6) : 0;
  g.fillStyle = '#17110f'; rrect(g, gx, -17, 11, 34, 2); g.fill();
  g.fillStyle = '#6d5a50'; for (let k = -3; k <= 3; k++) g.fillRect(gx + 2, k * 4.4 - 0.8, 7, 1.7);
  if (e.rooted || dk.weakT > 0) {
    g.globalAlpha = alpha * (0.25 + 0.35 * hot + (dk.weakT > 0 ? 0.5 : 0)); g.fillStyle = '#ff7a3a'; rrect(g, gx - 2, -19, 15, 38, 3); g.fill();
    g.globalAlpha = alpha * 0.8; g.strokeStyle = '#ffb04a'; g.lineWidth = 1.6; g.beginPath(); g.arc(gx + 5, 0, 15 + 2 * hot, 0, TAU); g.stroke(); g.globalAlpha = alpha;
  }
  g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineWidth = 1.5; hullPath(); g.stroke();
  // side turrets: red eyes (bright while that turret is about to fire); a destroyed one leaves a blackened socket
  for (const pt of e.parts) {
    const x = pt.ox, y = pt.oy, gk = dk.who === pt.id ? clamp(e.glow, 0, 1) : 0;
    if (pt.alive) {
      g.fillStyle = c.dk; rrect(g, x - 13, y - 13, 26, 26, 6); g.fill(); g.fillStyle = c.body; rrect(g, x - 11, y - 11, 22, 22, 5); g.fill();
      g.fillStyle = c.hi; g.globalAlpha = alpha * 0.5; rrect(g, x - 9, y - 10, 16, 6, 3); g.fill(); g.globalAlpha = alpha;
      g.fillStyle = '#17110f'; g.fillRect(x + 6, y - 2.5, 14, 5); // short barrel
      const eye = 0.45 + 0.2 * Math.sin(tt * 3 + x) + 0.9 * gk;
      if (gk > 0 && fxScale === 1) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = alpha * (0.3 + 0.7 * gk); const gs = 26 + 30 * gk; g.drawImage(SPR.fire, x + 3 - gs / 2, y - gs / 2, gs, gs); g.globalCompositeOperation = 'source-over'; g.globalAlpha = alpha; }
      g.fillStyle = `rgba(${gk > 0.8 ? '255,230,200' : '255,70,50'},${clamp(eye, 0.3, 1).toFixed(2)})`; g.beginPath(); g.arc(x + 2, y, 3.6 + 1.6 * gk, 0, TAU); g.fill();
      if (pt.flash > 0) { g.globalAlpha = alpha * 0.7; g.fillStyle = '#fff'; rrect(g, x - 13, y - 13, 26, 26, 6); g.fill(); g.globalAlpha = alpha; }
    } else {
      g.fillStyle = '#120e0c'; g.beginPath(); g.arc(x, y, 12, 0, TAU); g.fill();
      g.strokeStyle = '#000'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x - 9, y - 4); g.lineTo(x - 1, y + 1); g.lineTo(x + 7, y - 6); g.moveTo(x - 2, y + 1); g.lineTo(x + 3, y + 10); g.stroke();
      g.fillStyle = 'rgba(255,150,60,' + (0.3 + 0.3 * Math.sin(tt * 17 + y)).toFixed(2) + ')'; g.beginPath(); g.arc(x + 2, y + 2, 3, 0, TAU); g.fill();
    }
  }
  // scorch marks, hit flash
  g.fillStyle = 'rgba(20,10,8,.55)'; g.strokeStyle = 'rgba(255,170,90,.35)'; g.lineWidth = 0.8;
  for (const q of e.scorch) { g.save(); g.translate(q.x, q.y); g.rotate(q.a); g.beginPath(); g.ellipse(0, 0, q.r * 1.3, q.r * 0.85, 0, 0, TAU); g.fill(); g.stroke(); g.restore(); }
  const fl = e.flash > 0 ? Math.min(1, e.flash * 10) * 0.8 : 0;
  if (fl) { g.globalAlpha = alpha * fl; g.fillStyle = '#fff'; hullPath(); g.fill(); g.globalAlpha = alpha; }
  // shield shimmer while a turret is alive
  if (e.parts.some(q => q.alive) && !e.dying) {
    g.save(); hullPath(); g.clip();
    g.globalAlpha = alpha * (0.12 + 0.06 * Math.sin(tt * 5)); g.fillStyle = '#9ec9ee'; g.fillRect(hx, hy, hw, hh);
    g.globalAlpha = alpha * 0.3; g.fillStyle = '#d6ecff'; const bx = hx + ((tt * 70) % (hw + 40)) - 20; g.beginPath(); g.moveTo(bx, hy); g.lineTo(bx + 14, hy); g.lineTo(bx - 6, hy + hh); g.lineTo(bx - 20, hy + hh); g.closePath(); g.fill();
    g.restore(); g.globalAlpha = alpha * (0.45 + 0.2 * Math.sin(tt * 4)); g.strokeStyle = '#9ec9ee'; g.lineWidth = 2.4; hullPath(); g.stroke(); g.globalAlpha = alpha;
  }
  if (dth > 0) { g.globalAlpha = alpha * 0.5 * dth; g.fillStyle = '#0c0a08'; hullPath(); g.fill(); g.globalAlpha = alpha; }
  // main turret with the twin barrels
  g.rotate(e.turret - e.angle);
  const rec = e.recoil * 5, gk = dk.who === 'main' ? clamp(e.glow, 0, 1) : 0, bw = s.bW;
  for (const a of [-DEMIR_BAR, DEMIR_BAR]) {
    g.save(); g.rotate(a);
    g.fillStyle = '#1f1d19'; g.fillRect(tr * 0.4 - rec - 1, -bw / 2 - 1, s.barrel - tr * 0.4 + 2, bw + 2);
    g.fillStyle = c.dk; g.fillRect(tr * 0.4 - rec, -bw / 2, s.barrel - tr * 0.4, bw);
    g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(tr * 0.4 - rec, -bw / 2 + 1, s.barrel - tr * 0.4, 1.2);
    g.fillStyle = c.acc; g.fillRect(s.barrel - rec - 10, -bw / 2 - 1, 3, bw + 2); g.fillStyle = '#17110f'; g.fillRect(s.barrel - rec - 5, -bw / 2 - 2, 7, bw + 4);
    g.restore();
  }
  if (gk > 0) for (const a of [-DEMIR_BAR, DEMIR_BAR]) {
    const x = Math.cos(a) * (s.barrel - rec + 3), y = Math.sin(a) * (s.barrel - rec + 3);
    g.fillStyle = `rgba(40,12,6,${(0.65 * gk).toFixed(2)})`; g.beginPath(); g.arc(x, y, 6 + 4 * gk, 0, TAU); g.fill();
    if (fxScale === 1) { g.globalCompositeOperation = 'lighter'; const gs = 24 + 46 * gk; g.globalAlpha = alpha * (0.35 + 0.65 * gk); g.drawImage(SPR.fire, x - gs / 2, y - gs / 2, gs, gs); g.globalCompositeOperation = 'source-over'; }
    g.globalAlpha = alpha * (0.5 + 0.5 * gk); g.fillStyle = gk < 1 ? '#f0782a' : '#fff4d0'; g.beginPath(); g.arc(x, y, 4 + 3 * gk, 0, TAU); g.fill(); g.globalAlpha = alpha;
  }
  g.fillStyle = c.dk; rrect(g, -tr * 1.15 - 2, -tr - 2, tr * 2.3 + 4, tr * 2 + 4, 7); g.fill();
  g.fillStyle = c.body; rrect(g, -tr * 1.15, -tr, tr * 2.3, tr * 2, 6); g.fill();
  g.globalAlpha = alpha * 0.5; g.fillStyle = c.hi; rrect(g, -tr * 0.95, -tr * 0.82, tr * 1.6, tr * 0.5, 3); g.fill(); g.globalAlpha = alpha;
  g.strokeStyle = c.acc; g.lineWidth = 2.2; g.beginPath(); g.arc(-tr * 0.2, 0, tr * 0.5, 0, TAU); g.stroke();
  g.fillStyle = c.dk; g.beginPath(); g.arc(-tr * 0.2, 0, tr * 0.28, 0, TAU); g.fill();
  if (fl) { g.globalAlpha = alpha * fl; g.fillStyle = '#fff'; rrect(g, -tr * 1.15, -tr, tr * 2.3, tr * 2, 6); g.fill(); }
  g.restore();
}
function drawDemirkokGround(e, g) {
  const dk = e.dk; if (!dk) return;
  const tt = G.time;
  for (const q of dk.roots) { // iron roots: a dark overlay with glowing red cracks, flickering in the last 1.2 s
    const rise = Math.min(1, q.t / 0.25), fade = q.t > DEMIR_ROOT_LIFE - 1.2 ? 0.45 + 0.45 * Math.sin(tt * 24) : 1, x = q.c * T, y = q.r * T, m = 3 + (1 - rise) * 20;
    g.save(); g.globalAlpha = fade;
    g.fillStyle = 'rgba(30,24,18,.8)'; rrect(g, x + m, y + m, T - 2 * m, T - 2 * m, 6); g.fill();
    g.strokeStyle = 'rgba(201,64,45,' + (0.55 + 0.3 * Math.sin(tt * 5 + q.seed)).toFixed(2) + ')'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath();
    for (let k = 0; k < 3; k++) { const a = q.seed * 0.37 + k * 2.1; g.moveTo(x + T / 2, y + T / 2); g.lineTo(x + T / 2 + Math.cos(a) * 15, y + T / 2 + Math.sin(a) * 15); g.lineTo(x + T / 2 + Math.cos(a + 0.4) * 22, y + T / 2 + Math.sin(a + 0.4) * 20); }
    g.stroke(); g.restore();
  }
  const sw = dk.sw; if (!sw) return;
  const n = 14, span = sw.lead - sw.bar; // the wedge from the barrels to the red line 1 s ahead, cut short by walls
  if (Math.abs(span) > 0.01) {
    g.save(); g.fillStyle = 'rgba(224,60,40,.13)'; g.beginPath(); g.moveTo(e.x, e.y);
    for (let i = 0; i <= n; i++) { const a = sw.bar + span * i / n, d = demirWallRay(e, a, 15 * T); g.lineTo(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d); }
    g.closePath(); g.fill(); g.restore();
  }
  const d = demirWallRay(e, sw.lead, 15 * T);
  g.save(); g.strokeStyle = 'rgba(255,90,60,.9)'; g.lineWidth = 3; g.setLineDash([14, 10]); g.lineDashOffset = -tt * 70;
  g.beginPath(); g.moveTo(e.x, e.y); g.lineTo(e.x + Math.cos(sw.lead) * d, e.y + Math.sin(sw.lead) * d); g.stroke(); g.setLineDash([]);
  g.strokeStyle = 'rgba(255,230,200,.6)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(e.x, e.y); g.lineTo(e.x + Math.cos(sw.lead) * d, e.y + Math.sin(sw.lead) * d); g.stroke(); g.restore();
}
function drawStrikes() {
  if (!G.strikes.length) return;
  const blink = ((G.time * 12) | 0) % 2;
  ctx.strokeStyle = '#ff5a4a'; ctx.lineCap = 'butt';
  for (const q of G.strikes) {
    if (q.t < 0) continue;
    const k = clamp(q.t / q.dur, 0, 1), r = 30 - 15 * k;
    ctx.globalAlpha = 0.55 + 0.4 * blink; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, TAU);
    ctx.moveTo(q.x - r - 8, q.y); ctx.lineTo(q.x - r + 6, q.y); ctx.moveTo(q.x + r - 6, q.y); ctx.lineTo(q.x + r + 8, q.y);
    ctx.moveTo(q.x, q.y - r - 8); ctx.lineTo(q.x, q.y - r + 6); ctx.moveTo(q.x, q.y + r - 6); ctx.lineTo(q.x, q.y + r + 8);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function drawJet() {
  const j = G.jet; if (!j) return;
  const span = Math.max(view.x1 - view.x0, view.y1 - view.y0) * 0.75 + 220, d = -span + 2 * span * (j.t / j.dur);
  ctx.save(); ctx.translate(j.x + Math.cos(j.a) * d + 36, j.y + Math.sin(j.a) * d + 54); ctx.rotate(j.a); ctx.scale(1.7, 1.7);
  ctx.globalAlpha = 0.3; ctx.fillStyle = '#000'; ctx.fill(JET_PATH);
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawBushes(c0, c1, r0, r1) {
  const m = G.map, th = m.theme, list = [];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (m.t[r * m.n + c] === BUSH) list.push(c, r);
  if (!list.length) return;
  ctx.fillStyle = th.shadow; ctx.beginPath();
  for (let i = 0; i < list.length; i += 2) rrectPath(ctx, list[i] * T + 6, list[i + 1] * T + 9, T, T, 16);
  ctx.fill();
  for (let i = 0; i < list.length; i += 2) bush(list[i], list[i + 1], th);
}
function bush(c, r, th) {
  const x = c * T, y = r * T, rng = mulberry32(seedOf(c, r, 99)), sw = Math.sin(G.time * 1.6 + c * 0.9 + r * 1.3) * 1.2;
  ctx.fillStyle = th.bushDk; ctx.beginPath(); rrectPath(ctx, x - 1, y - 1, T + 2, T + 2, 15);
  for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + rng() * 0.8, rr = 10 + rng() * 6, px = x + T / 2 + Math.cos(a) * T * 0.36 + sw * 0.4, py = y + T / 2 + Math.sin(a) * T * 0.36; ctx.moveTo(px + rr, py); ctx.arc(px, py, rr, 0, TAU); }
  ctx.fill();
  ctx.fillStyle = th.bush; ctx.beginPath();
  for (let k = 0; k < 5; k++) { const px = x + 9 + rng() * (T - 18) + sw, py = y + 7 + rng() * (T - 18), rr = 7 + rng() * 5; ctx.moveTo(px + rr, py); ctx.arc(px, py, rr, 0, TAU); }
  ctx.fill();
  ctx.fillStyle = th.bushHi; ctx.beginPath();
  for (let k = 0; k < 5; k++) { const px = x + 8 + rng() * (T - 16) + sw * 1.4, py = y + 5 + rng() * (T - 18), rr = 1.6 + rng() * 2.4; ctx.moveTo(px + rr, py); ctx.arc(px, py, rr, 0, TAU); }
  ctx.fill();
}
// Tank-specific effects drawn under the shells (world space)
function drawTankFx() {
  const p = G.player;
  burnFx(); // D1: burning enemies glow
  for (const e of G.enemies) { // Ikiz stun: a spinning ring of sparks over the tank
    if (!(e.stunT > 0) || e.dead || !onScreen(e.x, e.y, 60)) continue;
    const a0 = G.time * 9 + e.id, r = e.r + 5;
    ctx.fillStyle = '#ffe27a'; ctx.strokeStyle = 'rgba(40,28,6,.8)'; ctx.lineWidth = 1;
    for (let k = 0; k < 4; k++) { const a = a0 + k * TAU / 4; ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r * 0.8 - 6, 2.6, 0, TAU); ctx.fill(); ctx.stroke(); }
  }
  if (!p || !p.alive) return;
  if (p.evoT > 0) { // transformation: a white ring spreading from the tank
    const k = 1 - p.evoT / 0.7, r = 18 + 70 * k;
    ctx.globalAlpha = (1 - k) * 0.9; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3 * (1 - k) + 1; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
  }
  if (G.phase !== 'fight') return;
  switch (G.tank) {
    case 'alev': flameFx(p); break; // D1: flame cone
    case 'rayli': TT_rayli.fx(p); break;
    case 'obus': TT_obus.fx(p); break;
    default: break;
  }
}
function drawShield(p) {
  const t = G.buffs.shield > 0 ? G.buffs.shield : 9; if (t < 1.6 && ((t * 10) | 0) % 2 === 0) return; // 9: the 1 s transformation shield does not blink
  const r = p.r + 10 + Math.sin(G.time * 8) * 1.2;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45; ctx.drawImage(SPR.blue, p.x - r * 1.5, p.y - r * 1.5, r * 3, r * 3);
  ctx.globalCompositeOperation = 'source-over';
  ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU);
  ctx.globalAlpha = 0.22; ctx.fillStyle = '#5fb4dd'; ctx.fill();
  ctx.globalAlpha = 0.9; ctx.strokeStyle = '#a6defa'; ctx.lineWidth = 2; ctx.stroke();
  ctx.globalAlpha = 1;
}
function drawPips() {
  const thermal = upL('thermal') > 0;
  for (const e of G.enemies) {
    if ((e.hidden && !thermal) || e.type === 'boss' || e.maxHp < 2 || e.hp >= e.maxHp || !onScreen(e.x, e.y, 40)) continue;
    const n = Math.ceil(e.maxHp), w = n > 7 ? 4 : 6, gap = 2, tot = n * w + (n - 1) * gap, x = e.x - tot / 2, y = e.y - e.spec.wid / 2 - 11;
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x - 2, y - 2, tot + 4, 7);
    for (let k = 0; k < n; k++) {
      const f = clamp(e.hp - k, 0, 1), px = x + k * (w + gap);
      ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(px, y, w, 3);
      if (f > 0) { ctx.fillStyle = '#e0533a'; ctx.fillRect(px, y, w * f, 3); }
    }
  }
}
const LOOK = {
  player: { trail: 'rgba(255,232,150,.55)', core: '#fff4cf', glow: 'flash' },
  enemy: { trail: 'rgba(205,40,20,.5)', core: '#e8441c', glow: 'fire' },
  pierce: { trail: 'rgba(255,111,174,.62)', core: '#ffe2ef', glow: 'pu_pierce' },
  blast: { trail: 'rgba(255,150,70,.62)', core: '#ffd08a', glow: 'fire' },
  bounce: { trail: 'rgba(160,215,255,.62)', core: '#e9f6ff', glow: 'blue' },
  rail: { trail: 'rgba(126,240,255,.7)', core: '#f2feff', glow: 'blue' }
};
function drawBullets() {
  if (!G.bullets.length) return;
  ctx.lineCap = 'round';
  for (const b of G.bullets) {
    if (b.lob) continue;
    const lk = LOOK[b.look] || LOOK.player, sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp, uy = b.vy / sp, tl = b.big ? 22 : 16;
    ctx.strokeStyle = lk.trail; ctx.lineWidth = b.r * 1.5;
    ctx.beginPath(); ctx.moveTo(b.x - ux * tl, b.y - uy * tl); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6;
  for (const b of G.bullets) { if (b.lob) continue; const gs = b.r * 6; ctx.drawImage(SPR[(LOOK[b.look] || LOOK.player).glow], b.x - gs / 2, b.y - gs / 2, gs, gs); }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  // Ownership cue: player shells are bright elongated capsules (flying along their path); enemy and boss shells are round, red-orange with a dark ring
  ctx.lineCap = 'round';
  for (const b of G.bullets) {
    if (b.lob || b.look === 'enemy') continue;
    const lk = LOOK[b.look] || LOOK.player, sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp * b.r * 1.5, uy = b.vy / sp * b.r * 1.5;
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = b.r * 2 + 2.4; ctx.beginPath(); ctx.moveTo(b.x - ux, b.y - uy); ctx.lineTo(b.x + ux, b.y + uy); ctx.stroke();
    ctx.strokeStyle = lk.core; ctx.lineWidth = b.r * 2; ctx.beginPath(); ctx.moveTo(b.x - ux, b.y - uy); ctx.lineTo(b.x + ux, b.y + uy); ctx.stroke();
  }
  ctx.lineWidth = 1.8;
  for (const b of G.bullets) {
    if (b.lob || b.look !== 'enemy') continue;
    const r = b.boss ? b.r * 1.15 : b.r;
    ctx.fillStyle = '#e8441c'; ctx.strokeStyle = '#2a0904'; ctx.beginPath(); ctx.arc(b.x, b.y, r + 0.6, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffb070'; ctx.beginPath(); ctx.arc(b.x, b.y, r * 0.4, 0, TAU); ctx.fill();
    if (b.boss) { ctx.strokeStyle = '#ff2a1a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(b.x, b.y, r + 3.2, 0, TAU); ctx.stroke(); ctx.lineWidth = 1.8; }
  }
  for (const b of G.bullets) if (b.lob) TT_obus.draw(b);
}
// Avcı's aiming light: a dashed mint line that brightens just before it fires, so the player gets a moment to react
function drawLocks() {
  const m = G.map;
  for (const e of G.enemies) {
    if (!e.lock || e.dead || !onScreen(e.x, e.y, 80)) continue;
    const s = e.spec, ca = Math.cos(e.turret), sa = Math.sin(e.turret);
    const x0 = e.x + ca * (s.barrel + 2), y0 = e.y + sa * (s.barrel + 2);
    let len = 0;
    while (len < T * 9) { len += 8; if (isWall(m.at(x0 + ca * len, y0 + sa * len))) break; }
    const k = clamp(1 - e.cool / 0.45, 0, 1);
    ctx.globalAlpha = 0.3 + 0.55 * k; ctx.strokeStyle = '#7ef0d0'; ctx.lineWidth = 1.2 + k; ctx.lineCap = 'butt';
    ctx.setLineDash([7, 5]); ctx.lineDashOffset = -G.time * 30;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + ca * len, y0 + sa * len); ctx.stroke();
  }
  ctx.setLineDash([]); ctx.globalAlpha = 1;
}
function drawPickup(k) {
  const P = PU[k.kind], blink = k.life < 3 && ((k.life * 8) | 0) % 2 === 0, a = blink ? 0.35 : 1, bob = Math.sin(k.t * 4 + k.seed) * 2;
  ctx.save(); ctx.translate(k.x, k.y);
  ctx.globalAlpha = a * 0.8; ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(3, 8, 13, 8, 0, 0, TAU); ctx.fill();
  ctx.translate(0, bob - 3);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.55; const gs = 56 + Math.sin(k.t * 5) * 6; ctx.drawImage(P.glow, -gs / 2, -gs / 2, gs, gs);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a;
  ctx.fillStyle = '#1d2015'; ctx.beginPath(); ctx.arc(0, 0, 13.5, 0, TAU); ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = P.col; ctx.stroke();
  if (ICONS[k.kind].stroke) { ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(ICON_PATHS[k.kind]); }
  else { ctx.fillStyle = P.col; ctx.fill(ICON_PATHS[k.kind]); }
  ctx.restore();
}
function drawParticles() {
  const dust = G.map.dust;
  for (const q of parts) {
    const k = q.life / q.max;
    if (q.k === 'smoke') { const a = Math.sin(Math.PI * (1 - k)) * 0.9; if (a > 0.01) { ctx.globalAlpha = a; ctx.drawImage(q.col === 'k' ? SPR.smokeK : SPR.smoke, q.x - q.size / 2, q.y - q.size / 2, q.size, q.size); } }
    else if (q.k === 'dust') { ctx.globalAlpha = k * 0.8; ctx.drawImage(dust, q.x - q.size / 2, q.y - q.size / 2, q.size, q.size); }
    else if (q.k === 'debris') { ctx.globalAlpha = Math.min(1, k * 2.5); ctx.fillStyle = q.col; ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillRect(-q.size / 2, -q.size / 3, q.size, q.size * 0.66); ctx.restore(); }
    else if (q.k === 'ring') { ctx.globalAlpha = 1; ctx.strokeStyle = `rgba(${q.col},${(k * 0.9).toFixed(3)})`; ctx.lineWidth = 1 + 3 * k; ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(0.5, q.size), 0, TAU); ctx.stroke(); }
  }
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const q of parts) {
    const k = q.life / q.max;
    if (q.k === 'fire') { ctx.globalAlpha = Math.pow(k, 0.7); ctx.drawImage(SPR.fire, q.x - q.size / 2, q.y - q.size / 2, q.size, q.size); }
    else if (q.k === 'flash') { ctx.globalAlpha = k; ctx.drawImage(SPR.flash, q.x - q.size / 2, q.y - q.size / 2, q.size, q.size); }
    else if (q.k === 'glow') { ctx.globalAlpha = k; ctx.drawImage(SPR[q.col] || SPR.flash, q.x - q.size / 2, q.y - q.size / 2, q.size, q.size); }
    else if (q.k === 'spark') { ctx.globalAlpha = k; ctx.strokeStyle = q.col; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.03, q.y - q.vy * 0.03); ctx.stroke(); }
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}
function drawTexts() {
  if (!G.texts.length) return;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  for (const q of G.texts) {
    ctx.globalAlpha = clamp(q.life / q.max * 2.2, 0, 1);
    ctx.font = `700 ${q.size}px ${UI_FONT}`;
    ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(20,22,14,.85)'; ctx.strokeText(q.s, q.x, q.y);
    ctx.fillStyle = q.col; ctx.fillText(q.s, q.x, q.y);
  }
  ctx.globalAlpha = 1;
}
function drawIndicators() {
  const p = G.player; if (!p) return;
  const cx = view.w / 2, cy = view.h / 2, L = view.sl + 16, R = view.w - view.sr - 16, B = view.h - view.sb - 16;
  const ray = (dx, dy, top) => {
    let t = Infinity;
    if (dx > 0) t = Math.min(t, (R - cx) / dx); else if (dx < 0) t = Math.min(t, (L - cx) / dx);
    if (dy > 0) t = Math.min(t, (B - cy) / dy); else if (dy < 0) t = Math.min(t, (top - cy) / dy);
    return t;
  };
  const thermal = upL('thermal') > 0;
  for (const e of G.enemies) {
    if ((e.hidden && !thermal) || e.dead) continue;
    const sx = (e.x - cam.x) * view.scale + cx, sy = (e.y - cam.y) * view.scale + cy;
    if (sx > 0 && sx < view.w && sy > 0 && sy < view.h) continue;
    const dx = sx - cx, dy = sy - cy;
    let t = ray(dx, dy, view.st + 14);
    if (!isFinite(t) || t <= 0) continue;
    let ix = cx + dx * t, iy = cy + dy * t;
    for (const h of view.hudRects) if (ix > h.l && ix < h.r && iy > h.t && iy < h.b) { t = ray(dx, dy, h.b); ix = cx + dx * t; iy = cy + dy * t; }
    const d = Math.hypot(e.x - p.x, e.y - p.y), atk = e.isBoss && (e.gen || e.trans > 0) && !e.dying, big = e.type === 'boss' ? (atk ? 2 : 1.5) : 1;
    ctx.globalAlpha = atk ? 0.35 + 0.65 * Math.abs(Math.sin(G.time * 9)) : clamp(1.25 - d / (T * 16), 0.4, 1); // an attacking boss off-screen: the edge arrow flashes
    ctx.save(); ctx.translate(ix, iy); ctx.rotate(Math.atan2(dy, dx)); ctx.scale(big, big);
    ctx.fillStyle = '#e0533a'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -8); ctx.lineTo(-2.5, 0); ctx.lineTo(-6, 8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function crosshairShown() {
  const p = G.player;
  return !input.touch && input.mouseAim && G.state === 'play' && G.phase !== 'upgrade' && !!p && p.alive && mouse.x >= 0 && !dbg.clean;
}
// The system cursor is hidden only while the crosshair stands in for it, so the mouse never disappears
// (pause, game over, menu, or keyboard-only driving after the mouse goes idle).
function syncAimCursor() {
  const on = crosshairShown();
  if (canvas.classList.contains('aim') !== on) canvas.classList.toggle('aim', on);
}
const XH_HALO = 'rgba(14,16,10,.66)', XH_LIGHT = 'rgba(239,231,210,.96)';
function drawCrosshair() {
  if (!crosshairShown()) return;
  const p = G.player, x = mouse.x, y = mouse.y;
  // a dark halo under the light lines keeps the crosshair readable on snow and sand as well as grass and asphalt
  ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU);
  ctx.moveTo(x - 16, y); ctx.lineTo(x - 5, y); ctx.moveTo(x + 5, y); ctx.lineTo(x + 16, y);
  ctx.moveTo(x, y - 16); ctx.lineTo(x, y - 5); ctx.moveTo(x, y + 5); ctx.lineTo(x, y + 16);
  ctx.lineCap = 'round'; ctx.strokeStyle = XH_HALO; ctx.lineWidth = 4.4; ctx.stroke();
  ctx.lineCap = 'butt'; ctx.strokeStyle = XH_LIGHT; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, 2.5, 0, TAU); ctx.fillStyle = XH_HALO; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, 1.3, 0, TAU); ctx.fillStyle = XH_LIGHT; ctx.fill();
  const cd = p.spec.cool * (G.buffs.rapid > 0 ? 0.5 : 1), k = clamp(1 - p.cool / cd, 0, 1);
  if (k < 1) {
    ctx.beginPath(); ctx.arc(x, y, 13, -Math.PI / 2, -Math.PI / 2 + TAU * k);
    ctx.lineCap = 'round'; ctx.strokeStyle = XH_HALO; ctx.lineWidth = 5.2; ctx.stroke();
    ctx.lineCap = 'butt'; ctx.strokeStyle = 'rgba(242,193,78,.98)'; ctx.lineWidth = 2.5; ctx.stroke();
  }
}
function stickVis(st, gx, gy, isAim, label) {
  const R = STICK_R, active = st.id !== null, ox = active ? st.ox : gx, oy = active ? st.oy : gy;
  ctx.globalAlpha = active ? 1 : 0.6;
  ctx.beginPath(); ctx.arc(ox, oy, R, 0, TAU); ctx.fillStyle = 'rgba(16,18,10,.22)'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = active ? 'rgba(239,231,210,.5)' : 'rgba(239,231,210,.25)'; ctx.stroke();
  const kx = ox + (active ? st.vx * R : 0), ky = oy + (active ? st.vy * R : 0), firing = active && Math.hypot(st.vx, st.vy) > 0.32;
  ctx.beginPath(); ctx.arc(kx, ky, R * 0.43, 0, TAU);
  ctx.fillStyle = isAim ? (firing ? 'rgba(242,193,78,.8)' : 'rgba(242,193,78,.38)') : (active ? 'rgba(95,180,221,.6)' : 'rgba(95,180,221,.38)');
  ctx.fill();
  if (!active) {
    ctx.globalAlpha = 0.9; ctx.font = `600 14px ${UI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 3.6; ctx.strokeStyle = XH_HALO; ctx.strokeText(label, ox, oy + R + 14); // dark halo like the crosshair: readable on sand, snow and steel crates
    ctx.fillStyle = '#f6f0de'; ctx.fillText(label, ox, oy + R + 14);
  }
  ctx.globalAlpha = 1;
}
function drawSticks() {
  if (!input.touch || G.state !== 'play' || G.phase === 'upgrade' || !G.player || !G.player.alive) return;
  const R = STICK_R, y = view.h - view.sb - R - 56, lx = view.sl + R + 40, rx = view.w - view.sr - R - 40;
  stickVis(sticks.move, SET.swapSticks ? rx : lx, y, false, 'Sür');
  stickVis(sticks.aim, SET.swapSticks ? lx : rx, y, true, 'Nişan al');
}
function drawVignette() {
  const p = G.player; if (!p) return;
  let a = G.hurt > 0 ? G.hurt * 1.1 : 0;
  if (p.alive && p.hp <= p.maxHp * 0.3 && G.phase !== 'upgrade') a = Math.max(a, 0.2 + Math.sin(G.time * 6) * 0.08);
  if (a <= 0.01) return;
  const gr = ctx.createRadialGradient(view.w / 2, view.h / 2, Math.min(view.w, view.h) * 0.32, view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.72);
  gr.addColorStop(0, 'rgba(200,30,20,0)'); gr.addColorStop(1, `rgba(200,30,20,${clamp(a, 0, 0.55).toFixed(3)})`);
  ctx.fillStyle = gr; ctx.fillRect(0, 0, view.w, view.h);
}
function drawMenuHint() {
  const p = G.player; if (!p || menu.hintA <= 0) return;
  const sx = (p.x - cam.x) * view.scale + view.w / 2, sy = (p.y - cam.y) * view.scale + view.h / 2 + p.spec.wid * view.scale * 0.5 + 26;
  const txt = input.touch ? 'Arenaya dokun, ateş et' : 'Tıkla, ateş et';
  ctx.font = `600 16px ${UI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(txt).width + 24;
  ctx.globalAlpha = menu.hintA * (0.78 + 0.22 * Math.sin(G.time * 3));
  ctx.fillStyle = 'rgba(38,42,29,.86)'; rrect(ctx, sx - w / 2, sy - 14, w, 28, 3); ctx.fill();
  ctx.fillStyle = '#efe7d2'; ctx.fillText(txt, sx, sy + 1);
  ctx.globalAlpha = 1;
}
function drawMini() {
  const m = G.map; if (!m || !m.mini || !SET.minimap) return;
  const W = miniCv.width; if (!W) return;
  const g = mctx, d = view.dpr, k = W / m.w;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, W);
  g.imageSmoothingEnabled = false; g.globalAlpha = 0.92; g.drawImage(m.mini, 0, 0, W, W); g.globalAlpha = 1;
  g.strokeStyle = 'rgba(239,231,210,.75)'; g.lineWidth = d;
  g.strokeRect(view.x0 * k, view.y0 * k, (view.x1 - view.x0) * k, (view.y1 - view.y0) * k);
  for (const q of G.pickups) { g.fillStyle = PU[q.kind].col; g.fillRect(q.x * k - 1.5 * d, q.y * k - 1.5 * d, 3 * d, 3 * d); }
  g.strokeStyle = 'rgba(224,83,58,.9)'; g.lineWidth = 1.2 * d;
  for (const q of G.portals) { g.beginPath(); g.arc(q.x * k, q.y * k, (2 + 2 * Math.sin(G.time * 10)) * d + 2 * d, 0, TAU); g.stroke(); }
  const thermal = upL('thermal') > 0;
  for (const e of G.enemies) if (!e.hidden || thermal) {
    g.fillStyle = e.spec.smart ? '#c9a2ff' : '#ff5a3c';
    g.beginPath(); g.arc(e.x * k, e.y * k, (e.type === 'boss' ? 3.4 : 2.3) * d, 0, TAU); g.fill();
  }
  const p = G.player;
  if (p && p.alive) { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(p.x * k, p.y * k, 2.8 * d, 0, TAU); g.fill(); g.strokeStyle = '#5fb4dd'; g.lineWidth = 1.5 * d; g.stroke(); }
}

/* ================= loop & boot ================= */
let lastT = performance.now();
function frame(now) {
  let dt = (now - lastT) / 1000; lastT = now;
  if (!(dt >= 0)) dt = 0; if (dt > 0.05) dt = 0.05;
  try {
    if (!dbg.freeze) update(dt);
    render();
    if (G.state === 'play' || G.state === 'paused') drawMini();
  } catch (err) { console.error(err); }
  requestAnimationFrame(frame);
}

// Boss stage autopilot: danger map from the active warnings (and shells in flight); out of danger it fights (part -> stunned boss -> boss), in danger it runs to the nearest safe tile
function shellLane(x, y, pad) {
  for (const b of G.bullets) {
    if (b.dead || b.owner !== 1) continue;
    const v2 = b.vx * b.vx + b.vy * b.vy; if (!v2) continue;
    const t = clamp(((x - b.x) * b.vx + (y - b.y) * b.vy) / v2, 0, 0.7), cx = b.x + b.vx * t - x, cy = b.y + b.vy * t - y, rr = b.r + pad;
    if (cx * cx + cy * cy < rr * rr) return true;
  }
  return false;
}
const BOT_REACT = 0.5; // the bot needs about half a second to notice a warning, and misses some shells, so it is not a perfect dodger
let botBlind = false;
const botDanger = (x, y, pad) => bossDanger(x, y, pad, BOT_REACT) || (!botBlind && shellLane(x, y, pad - 6));
// breadth-first over open tiles from the player; returns the unit direction of the first step toward the nearest tile where test(c, r, x, y) holds
function botBfs(test, depth) {
  const p = G.player, m = G.map, n = m.n, c0 = clamp(Math.floor(p.x / T), 0, n - 1), r0 = clamp(Math.floor(p.y / T), 0, n - 1);
  const prev = new Map([[r0 * n + c0, -1]]), q = [[c0, r0, 0]];
  for (let h = 0; h < q.length; h++) {
    const [c, r, d] = q[h];
    if (d > 0 && test(c, r, c * T + T / 2, r * T + T / 2)) {
      let k = r * n + c, last = k; while (prev.get(k) !== -1) { last = k; k = prev.get(k); }
      const lc = last % n, lr = (last - lc) / n, dx = lc * T + T / 2 - p.x, dy = lr * T + T / 2 - p.y, l = Math.hypot(dx, dy) || 1;
      return { x: dx / l, y: dy / l };
    }
    if (d >= depth) continue;
    for (const [dx, dy] of DIRS) {
      const x = c + dx, y = r + dy; if (blocksTank(m.get(x, y))) continue;
      const k = y * n + x; if (prev.has(k)) continue;
      prev.set(k, r * n + c); q.push([x, y, d + 1]);
    }
  }
  return null;
}
function bossAutopilot(dt) {
  const p = G.player, e = G.boss, m = G.map;
  bot.t -= dt;
  let tx = e.x, ty = e.y;
  const part = e.stunT > 0 ? null : e.parts.find(q => q.alive);
  if (part) { const q = partPos(e, part); if (los(p.x, p.y, q.x, q.y)) { tx = q.x; ty = q.y; } } // priority: part, stunned boss, boss
  bot.aim = Math.atan2(ty - p.y, tx - p.x); bot.dist = Math.hypot(tx - p.x, ty - p.y);
  bot.fire = !bot.hold && !e.invuln && los(p.x, p.y, e.x, e.y);
  if (bot.t > 0) return;
  bot.t = 0.12; botBlind = Math.random() < 0.4;
  const here = botDanger(p.x, p.y, 26) || botDanger(p.x + p.vx * 0.35, p.y + p.vy * 0.35, 26);
  if (here) { // nearest safe tile
    const d = botBfs((c, r, x, y) => !botDanger(x, y, 30), 9);
    if (d) { bot.mx = d.x; bot.my = d.y; return; }
  }
  if (p.hp < p.maxHp * 0.8 && G.pickups.length) { // a repair kit lying around
    const k = G.pickups.find(q => q.kind === 'repair' && !botDanger(q.x, q.y, 20));
    if (k) { const kc = Math.floor(k.x / T), kr = Math.floor(k.y / T), d = botBfs((c, r) => c === kc && r === kr, 14); if (d) { bot.mx = d.x; bot.my = d.y; return; } }
  }
  const want = Math.max(TANKS[G.tank].botRange || 290, 150);
  const lineWarn = e.treadT <= 0 && G.tele.some(t => t.kind === 'line' && t.t < t.dur), brk = e.treadT > 0; // part damage: a charge line is up (shoot the tread from the side) / a tread is broken (get behind)
  let best = null, bs = -1e9;
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, x = p.x + Math.cos(a) * 60, y = p.y + Math.sin(a) * 60;
    if (blocksTank(m.at(x, y)) || blocksTank(m.at(p.x + Math.cos(a) * 30, p.y + Math.sin(a) * 30))) continue;
    const dd = Math.hypot(x - e.x, y - e.y), ang = Math.atan2(e.y - p.y, e.x - p.x), tang = Math.abs(Math.sin(angDiff(a, ang)));
    let sc = -Math.abs(dd - want) * 0.8 + tang * 25 + (los(x, y, e.x, e.y) ? 20 : 0) + Math.random() * 8 + (dd < e.r + 70 ? -300 : 0);
    if (lineWarn || brk) { const bang = Math.abs(angDiff(e.angle, Math.atan2(y - e.y, x - e.x))); if (lineWarn && bang > 0.9 && bang < 2.2) sc += 60; if (brk && bang > 2.3) sc += 40; }
    if (botDanger(x, y, 26)) sc -= 1000;
    if (sc > bs) { bs = sc; best = a; }
  }
  if (best !== null) { bot.mx = Math.cos(best); bot.my = Math.sin(best); } else { bot.mx = bot.my = 0; }
}
function autopilot(dt) {
  const p = G.player; if (!p || !p.alive) return;
  if (G.stage && G.boss && !G.boss.dead && !G.boss.dying && G.phase === 'fight') { bossAutopilot(dt); return; }
  let target = null, best = 1e18;
  for (const e of G.enemies) { const dd = dist2(e.x, e.y, p.x, p.y); if (dd < best) { best = dd; target = e; } }
  let tamB = 1e18; // a visible Tamirci comes first
  for (const e of G.enemies) if (e.type === 'tamirci' && !e.dead && !e.hidden && !G.boss) { const dd = dist2(e.x, e.y, p.x, p.y); if (dd < tamB && dd < (T * 13) * (T * 13) && los(p.x, p.y, e.x, e.y)) { tamB = dd; target = e; best = dd; } }
  bot.t -= dt;
  if (target) {
    bot.aim = Math.atan2(target.y - p.y, target.x - p.x); bot.fire = !bot.hold;
    const range = TANKS[G.tank].botRange;
    if (range) { // tanks with a preferred distance: short range closes in then strafes, long range keeps its distance (Standart keeps the random walk below)
      const d = Math.sqrt(best); bot.dist = d;
      if (bot.t <= 0) {
        let a;
        if (Math.random() < 0.2) a = rand(0, TAU); // now and then a random turn gets the bot out of corners
        else if (d > range * 1.15) a = bot.aim;
        else if (d < range * 0.7) a = bot.aim + Math.PI;
        else { bot.sd = Math.random() < 0.5 ? 1 : -1; a = bot.aim + bot.sd * Math.PI / 2; }
        bot.mx = Math.cos(a); bot.my = Math.sin(a); bot.t = rand(0.35, 0.9);
      }
    } else if (bot.t <= 0) { const a = bot.aim + rand(-1.3, 1.3); bot.mx = Math.cos(a); bot.my = Math.sin(a); bot.t = rand(0.4, 1.2); }
  } else {
    bot.fire = false; bot.aim = null; bot.dist = 0;
    if (bot.t <= 0) { const a = rand(0, TAU); bot.mx = Math.cos(a); bot.my = Math.sin(a); bot.t = rand(0.5, 1.5); }
  }
}
// the bot's answer on an evolution screen: bot.tank = a tank id, a function (ids) => id, or 'random' (a random offered tank)
function botPick() {
  const bt = bot.tank;
  if (typeof bt === 'function') { const r = bt(upChoices.slice()); if (upChoices.includes(r)) return r; }
  else if (typeof bt === 'string' && upChoices.includes(bt)) return bt;
  return pick(upChoices);
}
if (DEBUG) {
  window.__tank = {
    G, view, cam, parts, input, SET, rec: () => REC, applySettings, startGame, toMenu, gameOver, pauseGame, resumeGame,
    bench(n) { const t0 = performance.now(); for (let i = 0; i < n; i++) render(); return (performance.now() - t0) / n; },
    info() {
      return { state: G.state, phase: G.phase, wave: G.wave, score: G.score, kills: G.kills, hp: G.player ? Math.round(G.player.hp) : null,
        enemies: G.enemies.length, queue: G.queue.length, portals: G.portals.length, parts: parts.length, bullets: G.bullets.length,
        decals: G.map ? G.map.decals.length : 0, shots: G.shots, hits: G.hits, boss: !!G.boss,
        maxHp: G.player ? G.player.maxHp : null, up: Object.assign({}, G.up), buffs: BUFFS.filter(k => G.buffs[k] > 0),
        tank: G.tank, heat: G.player ? +G.player.heat.toFixed(2) : 0 };
    },
    sim(sec, god) {
      bot.on = true; G.god = !!god;
      const n = Math.round(sec * 60);
      for (let i = 0; i < n && G.state === 'play'; i++) {
        if (G.phase === 'upgrade') { if (G.upMode === 'evo') { chooseUpgrade(botPick()); finishEvo(); } else chooseUpgrade(pick(upChoices)); }
        autopilot(1 / 60); update(1 / 60);
      }
      bot.on = false; G.god = false;
      return this.info();
    },
    killAll() { for (const e of G.enemies) killEnemy(e); G.queue.length = 0; G.portals.length = 0; },
    dbg, sticks, wave(w) { G.wave = w - 1; nextWave(); },
    choices: () => upChoices.slice(), choose(k) { chooseUpgrade(k); finishEvo(); }, chooseRaw: chooseUpgrade, finishEvo, showUpgrades, waveCleared, playerSpec, bossHp, SPECS, typeShares, buildRoster, typeBanned, waveMods, updateTamirci, nextWave,
    setUp(o) { G.up = Object.assign({}, o); refreshPlayer(); },
    give(kind) { const p = G.player; applyPickup({ kind, x: p.x, y: p.y }); },
    fire() { fireTank(G.player); },
    stepBullets(dt) { updateBullets(dt); },
    stepEnemies(dt) { for (const e of G.enemies) if (!e.dead) updateEnemy(e, dt); },
    stepStrikes(dt) { updateStrikes(dt); },
    spawn(type, x, y) { spawnEnemy(type, x, y); const e = G.enemies[G.enemies.length - 1]; e.cool = 99; return e; },
    clearArena(bushes) {
      const m = G.map, n = m.n;
      for (let r = 1; r < n - 1; r++) for (let c = 1; c < n - 1; c++) { m.t[r * n + c] = EMPTY; m.hp[r * n + c] = 0; }
      for (const [c, r] of bushes || []) m.t[r * n + c] = BUSH;
      m.decals.length = 0; m.flowDirty = true; buildLayer(m); buildMini(m);
    },
    /* -- A: tanks -- */
    TANKS, tanks: () => TANK_IDS.slice(), tank: () => G.tank, evoDue, needTier, tankShells, tankRange, heat: () => (G.player ? G.player.heat : 0),
    // setTank: switch the tank at once (camera zoom included), keeping the workshop cards; botTank: the bot's evolution pick; noEvo: switch the debt rule off (baseline probes)
    setTank(id) {
      if (!TANKS[id]) throw new Error('unknown tank ' + id);
      G.tank = id; refreshPlayer(); const p = G.player; p.heat = 0; p.overheatT = 0; p.pushT = 0; p.cool = 0;
      view.zoomK = TANKS[id].zoom; view.scale = view.base * view.zoomK; return id;
    },
    botTank(v) { bot.tank = v; },
    noEvo(v) { G.noEvo = !!v; },
    /* -- D2 -- */
    rayLaser: (x, y, a) => TT_rayli.laser(x, y, a), lobArea: () => TT_obus.area(G.player.spec), lobTarget: () => TT_obus.target(G.player, G.player.spec),
    /* -- B: synergies -- */
    syn: () => synList().map(sy => sy.id), SYN, SYN_K, synFlags, synDmg, synTaken, synRegen, splashFor, synBadgeHTML,
    /* -- C: nuke -- */
    nuke() { const n = G.nuke; return { meter: +n.meter.toFixed(4), ready: nukeReady(), warnT: +n.warnT.toFixed(3), used: n.used, flashT: n.flashT, onScreen: nukeOnScreen().length, bot: !!bot.nuke }; },
    nukeCharge(f) { G.nuke.meter = clamp(+f, 0, 1); return this.nuke(); },
    nukeFire() { return nukeFire(true); },
    botNuke(on) { bot.nuke = !!on; },
    hold(v) { bot.hold = !!v; },
    step(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n && G.state === 'play'; i++) update(1 / 60); return this.info(); },
    /* -- boss stage -- */
    bossInfo() { const e = G.boss; return { stage: !!G.stage, phase: G.phase, wave: G.wave, boss: !!e, hp: e ? +e.hp.toFixed(2) : 0, maxHp: e ? e.maxHp : 0, bphase: e ? e.phase : -1, trans: e ? +e.trans.toFixed(2) : 0, invuln: e ? !!e.invuln : false, dying: e ? !!e.dying : false, atk: e ? e.atkId : '', stunT: e ? +e.stunT.toFixed(2) : 0, tower: e ? e.parts.map(q => [q.id, q.alive, q.hp]) : [], enemies: G.enemies.length, tele: G.tele.length, log: e ? e.log.slice() : [] }; },
    hurtBoss(d, x, y, dir) { const e = G.boss; hurtEnemy(e, d, x === undefined ? e.x : x, y === undefined ? e.y : y, dir); return e.hp; },
    partInfo(e) { e = e || G.boss; return e.tr ? { treadT: +e.treadT.toFixed(2), tr: e.tr.map(t => ({ hp: +t.hp.toFixed(1), max: t.max, br: t.br, t: +t.t.toFixed(2) })), bars: e.bars.map(b => ({ id: b.id, acc: +b.acc.toFixed(1), thr: b.thr, t: +b.t.toFixed(2) })), cancels: e.cancels } : e.pt ? { tread: +e.pt.tread.toFixed(2), barrel: +e.pt.barrel.toFixed(2), engine: +e.pt.engine.toFixed(2), imm: Object.assign({}, e.pt.imm), dur: Object.assign({}, e.pt.dur) } : null; },
    partBreak, PART_T, PART_HP, damageEnemy, alertHit, checkDodge, DODGE, AWARE, BT, hurtEnemy, bossVolley,
    bossSkip() { G.introSeen = true; G.phaseT = Math.max(G.phaseT, 0.3); bossIntroTap(); },
    bossDanger, bossClearHazards, BOSS_DEFS, ARENAS, parseArena, themeFor, bossDefAt,
    // one boss fight for the probe: wave w, workshop cards (object), tank id; the bot plays until the boss falls, the tank dies or maxSec passes
    bossFight(w, cards, tank, maxSec) {
      store.set(BOSS_SEEN_KEY, true); bot.on = true; bot.nuke = false; G.god = false; G.noEvo = true;
      G.up = Object.assign({}, cards); G.tank = tank || 'std'; refreshPlayer(); G.player.hp = G.player.maxHp;
      view.zoomK = TANKS[G.tank].zoom; G.wave = w - 1; nextWave(); G.introSeen = true; endBossIntro(true);
      const p = G.player, e = G.boss, hp0 = p.hp; let n = 0, hurtSum = 0, last = p.hp; const max = Math.round(maxSec * 60);
      while (n < max && G.state === 'play' && p.alive && !e.dead && !e.dying) {
        autopilot(1 / 60); update(1 / 60); n++;
        if (p.hp < last) hurtSum += last - p.hp; last = p.hp;
      }
      bot.on = false; G.noEvo = false;
      return { win: !!(e.dead || e.dying), secs: +(n / 60).toFixed(1), dmg: Math.round(hurtSum), hpLeft: Math.round(p.hp), bphase: e.phase, bossHp: +(e.hp / e.maxHp).toFixed(2), maxHp: e.maxHp };
    },
    // stuck watch: like bossFight, but samples the boss while it is supposed to walk; returns the longest stretch without progress (s) and where it happened
    bossWatch(w, cards, tank, maxSec) {
      store.set(BOSS_SEEN_KEY, true); bot.on = true; bot.nuke = false; G.god = true; G.noEvo = true;
      G.up = Object.assign({}, cards); G.tank = tank || 'std'; refreshPlayer(); G.player.hp = G.player.maxHp;
      view.zoomK = TANKS[G.tank].zoom; G.wave = w - 1; nextWave(); G.introSeen = true; endBossIntro(true);
      const p = G.player, e = G.boss, max = Math.round(maxSec * 60); let n = 0, rx = e.x, ry = e.y, st = 0, worst = 0, at = null, moving = 0, god = 0;
      while (n < max && G.state === 'play' && !e.dead && !e.dying) {
        autopilot(1 / 60); update(1 / 60); n++;
        const walk = G.phase === 'fight' && !e.invuln && e.trans <= 0 && !(e.stunT > 0) && e.treadT <= 0 && !e.rooted && (!e.gen || e.atkId === 'cevik') && !(e.canSee && e.distP < (e.def.hold || 4.5) * T);
        if (!walk) { st = 0; rx = e.x; ry = e.y; continue; }
        moving++;
        if (Math.hypot(e.x - rx, e.y - ry) >= 14) { rx = e.x; ry = e.y; st = 0; } else { st += 1 / 60; if (st > worst) { worst = st; at = { x: Math.round(e.x), y: Math.round(e.y), t: +(n / 60).toFixed(1), atk: e.atkId, phase: e.phase, c: Math.floor(e.x / T), r: Math.floor(e.y / T) }; } }
      }
      bot.on = false; G.noEvo = false; G.god = false;
      return { worst: +worst.toFixed(2), at, win: !!(e.dead || e.dying), secs: +(n / 60).toFixed(1), moving: +(moving / 60).toFixed(1) };
    },
    // reach probe: the player sits still on tile (c, r) (god mode, no bot); returns the closest the boss got (hull edge to hull edge, px) and whether it fired at or touched the player within maxSec
    bossReach(w, c, r, maxSec) {
      store.set(BOSS_SEEN_KEY, true); bot.on = false; G.god = false; G.noEvo = true; G.up = {}; G.tank = 'std'; refreshPlayer(); G.player.maxHp = G.player.hp = 1e6;
      G.wave = w - 1; nextWave(); G.introSeen = true; endBossIntro(true);
      const p = G.player, e = G.boss, max = Math.round(maxSec * 60); p.x = c * T + T / 2; p.y = r * T + T / 2; let n = 0, best = 1e9, hit = -1, hp0 = p.hp, seen = 0;
      while (n < max && G.state === 'play' && !e.dead && !e.dying) {
        p.x = c * T + T / 2; p.y = r * T + T / 2; update(1 / 60); n++;
        best = Math.min(best, Math.hypot(e.x - p.x, e.y - p.y) - e.r - p.r);
        if (e.canSee && e.distP < 9 * T) seen++;
        if (hit < 0 && p.hp < hp0) hit = n / 60;
      }
      G.noEvo = false;
      return { closest: Math.round(best), seen: +(seen / 60).toFixed(1), hit: +hit.toFixed(1), secs: +(n / 60).toFixed(1), unr: +(e.unrT || 0).toFixed(1) };
    },
    drop(kind, dx, dy) { const p = G.player; dropPickup(p.x + (dx || 0), p.y + (dy || 0), kind); }
  };
}

// Android back button (used by the APK wrapper): pause, resume, leave the results screen, or let the app close from the menu
window.tankBack = () => {
  if (subOpen()) { closeSub(); return 'handled'; }
  if (G.state === 'play') { pauseGame(); return 'handled'; }
  if (G.state === 'paused') { resumeGame(); return 'handled'; }
  if (G.state === 'over') { toMenu(); return 'handled'; }
  return 'exit';
};

const hot = window.claude && window.claude.hot;
if (hot && typeof hot.snapshot === 'function') {
  try {
    hot.snapshot(() => ({ run: (G.state === 'play' || G.state === 'paused') && G.player && G.player.alive
      ? { wave: G.wave, score: G.score, hp: Math.round(G.player.hp), kills: G.kills, shots: G.shots, hits: G.hits, ups: Object.assign({}, G.up), tank: G.tank,
        nuke: nukeSave(), beaten: [...G.beaten] } : null }));
  } catch (e) { /* ignore */ }
}
function boot(data) {
  G.resume = data && data.run && data.run.wave ? data.run : null;
  applySettings(true);
  resize();
  bindUI();
  renderGuideLists();
  syncSettingsUI();
  toMenu();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (G.state === 'menu') placeMenuTank(); }).catch(() => {});
  requestAnimationFrame(t => { lastT = t; frame(t); });
}
// Phones report the new size late after a rotation, so measure again a little later as well
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => { resize(); setTimeout(resize, 150); setTimeout(resize, 500); });
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
if (window.screen && screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', () => { setTimeout(resize, 60); setTimeout(resize, 400); });
if (hot && typeof hot.ready === 'function') hot.ready(boot); else boot((hot && hot.data) || {});
})();
