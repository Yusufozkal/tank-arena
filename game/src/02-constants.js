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
    col: { body: '#6f8a3a', dk: '#46591f', hi: '#9fbf5a', acc: '#f2c14e' } },
  // Ağır Topçu (Kar): short wide hull, one very thick barrel, a huge slow shell that can be shot down (11-enemies updateTopcu, 10 shell bullets)
  topcu: { hp: 5, speed: 40, turn: 1.7, tTurn: 1.6, r: 22, mass: 2.5, len: 38, wid: 48, tread: 11, tR: 17, barrel: 40, bW: 15, cool: 6, bSpeed: 150, dmg: 28, bR: 11, score: 350, hold: 5, drop: 0.4, artillery: true, shape: 'howitzer',
    col: { body: '#4a3a33', dk: '#241a16', hi: '#86695a', acc: '#ffa52e' } }
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

