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
