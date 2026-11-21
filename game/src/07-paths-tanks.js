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
  if (t.noTreads) { t.trackAcc = 0; return; } // Kırağı keeps its own short-lived snow tracks (11f)
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
