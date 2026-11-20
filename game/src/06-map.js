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

