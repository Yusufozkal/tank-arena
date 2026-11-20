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
const layerRes = () => clamp(view.base * view.dpr, 1, 2);
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
  if (G.map && Math.abs(layerRes() - G.map.res) / G.map.res > 0.2) buildLayer(G.map);
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

