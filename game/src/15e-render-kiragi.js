/* ================= Kırağı drawing (docs/BOSSES.md section 6; logic 11f) ================= */
// A long, low kite-shaped hull (90 x 44), purple with mint lights, ice shards on the rear deck, a long thin barrel with a mint emitter. Invisible: only the air shimmer and the snow tracks (and the laser line) show.
// The ice copies use the same body in pale ice colours. drawKiragi is the opaque body (opacity from def.vis), drawKiragiGround the tracks / frost / lake ice, drawKiragiTop the shimmer, copies and beams (above the bushes).
function krHullPath(g, L, hy) { // the kite: pointed nose, straight flanks, a notched tail
  g.beginPath(); g.moveTo(L / 2 + 1, 0); g.lineTo(L / 2 - 20, -hy); g.lineTo(-L / 2 + 10, -hy); g.lineTo(-L / 2 + 1, -hy * 0.5); g.lineTo(-L / 2 + 6, 0); g.lineTo(-L / 2 + 1, hy * 0.5); g.lineTo(-L / 2 + 10, hy); g.lineTo(L / 2 - 20, hy); g.closePath();
}
function krBody(g, o, alpha, ice) { // o: { x, y, angle, turret, treadL, treadR, recoil, glow, flash, scorch? }
  const s = KIR_SPEC, L = s.len, W = s.wid, tw = s.tread, tr = s.tR, c = ice ? { body: '#c3e6f3', dk: '#6ea9c6', hi: '#f2fcff', acc: '#7ef0d0' } : s.col, hy = W / 2 - tw + 1.5;
  g.save(); g.translate(o.x, o.y); g.rotate(o.angle); g.globalAlpha = alpha;
  // treads
  g.fillStyle = ice ? '#78a9c2' : '#1f1d19'; rrect(g, -L / 2, -W / 2, L, tw, 4); g.fill(); rrect(g, -L / 2, W / 2 - tw, L, tw, 4); g.fill();
  g.fillStyle = ice ? '#dff3fb' : '#4b473e'; const st = 6;
  let off = ((o.treadL % st) + st) % st; for (let x = -L / 2 + off; x < L / 2 - 2; x += st) g.fillRect(x, -W / 2 + 1.5, 2, tw - 3);
  off = ((o.treadR % st) + st) % st; for (let x = -L / 2 + off; x < L / 2 - 2; x += st) g.fillRect(x, W / 2 - tw + 1.5, 2, tw - 3);
  g.fillStyle = c.acc; g.fillRect(L / 2 - 9, -W / 2 + 2, 5, 2.2); g.fillRect(L / 2 - 9, W / 2 - 4.2, 5, 2.2); // mint front lights
  // ice shards on the tail
  g.fillStyle = c.hi; for (const [y0, k] of [[-9, 1], [0, 1.35], [9, 1]]) { g.beginPath(); g.moveTo(-L / 2 + 6, y0 - 3.5); g.lineTo(-L / 2 - 8 * k, y0); g.lineTo(-L / 2 + 6, y0 + 3.5); g.closePath(); g.fill(); }
  // hull
  krHullPath(g, L, hy); g.fillStyle = c.dk; g.fill();
  g.save(); g.scale(0.94, 0.8); krHullPath(g, L, hy); g.fillStyle = c.body; g.fill(); g.restore();
  g.globalAlpha = alpha * 0.8; g.strokeStyle = c.hi; g.lineWidth = 1.6; g.beginPath(); g.moveTo(L / 2 - 4, 0); g.lineTo(-L / 2 + 14, 0); g.stroke(); g.globalAlpha = alpha;
  g.strokeStyle = c.acc; g.lineWidth = 1.4; for (const sy of [-1, 1]) { g.beginPath(); g.moveTo(L / 2 - 26, sy * hy * 0.6); g.lineTo(-L / 2 + 16, sy * hy * 0.6); g.stroke(); }
  g.fillStyle = c.dk; for (let k = 0; k < 3; k++) g.fillRect(-L / 2 + 12 + k * 4, -4, 2, 8);
  g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1.3; krHullPath(g, L, hy); g.stroke();
  if (o.scorch) { g.fillStyle = 'rgba(20,10,8,.5)'; for (const q of o.scorch) { g.save(); g.translate(q.x, q.y); g.rotate(q.a); g.beginPath(); g.ellipse(0, 0, q.r * 1.3, q.r * 0.85, 0, 0, TAU); g.fill(); g.restore(); } }
  if (ice) { g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1; g.beginPath(); g.moveTo(L / 2 - 22, -hy * 0.3); g.lineTo(6, 4); g.lineTo(-10, -hy * 0.4); g.moveTo(6, 4); g.lineTo(-4, hy * 0.7); g.stroke(); } // cracks
  const fl = o.flash > 0 ? Math.min(1, o.flash * 10) * 0.8 : 0;
  if (fl) { g.globalAlpha = alpha * fl; g.fillStyle = '#fff'; krHullPath(g, L, hy); g.fill(); g.globalAlpha = alpha; }
  // turret and the long barrel
  g.rotate(o.turret - o.angle);
  const rec = (o.recoil || 0) * 5, gk = clamp(o.glow || 0, 0, 1), bl = s.barrel, bw = s.bW;
  g.fillStyle = '#1f1d19'; g.fillRect(tr * 0.4 - rec - 1, -bw / 2 - 1, bl - tr * 0.4 + 2, bw + 2);
  g.fillStyle = c.dk; g.fillRect(tr * 0.4 - rec, -bw / 2, bl - tr * 0.4, bw);
  g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(tr * 0.4 - rec, -bw / 2 + 1, bl - tr * 0.4, 1.2);
  g.fillStyle = c.acc; for (const k of [0.45, 0.62]) g.fillRect(bl * k - rec, -bw / 2 - 1.2, 1.8, bw + 2.4);
  g.fillStyle = '#17141f'; g.fillRect(bl - 8 - rec, -bw / 2 - 1.6, 8, bw + 3.2); g.fillStyle = c.acc; g.fillRect(bl - 3 - rec, -bw / 2 - 1.6, 2, bw + 3.2);
  if (gk > 0) { // glow telegraph: the emitter charges mint
    const x = bl - rec + 2;
    g.fillStyle = `rgba(12,30,28,${(0.65 * gk).toFixed(2)})`; g.beginPath(); g.arc(x, 0, 5 + 3 * gk, 0, TAU); g.fill();
    if (fxScale === 1) { g.globalCompositeOperation = 'lighter'; const gs = 22 + 40 * gk; g.globalAlpha = alpha * (0.4 + 0.6 * gk); g.drawImage(SPR.pu_speed, x - gs / 2, -gs / 2, gs, gs); g.globalCompositeOperation = 'source-over'; }
    g.globalAlpha = alpha * (0.55 + 0.45 * gk); g.fillStyle = gk < 1 ? '#7ef0d0' : '#f2fffb'; g.beginPath(); g.arc(x, 0, 3.2 + 2.4 * gk, 0, TAU); g.fill(); g.globalAlpha = alpha;
  }
  g.fillStyle = c.dk; rrect(g, -tr * 1.15 - 1.5, -tr * 0.8 - 1.5, tr * 2.1 + 3, tr * 1.6 + 3, tr * 0.7); g.fill();
  g.fillStyle = c.body; rrect(g, -tr * 1.15, -tr * 0.8, tr * 2.1, tr * 1.6, tr * 0.65); g.fill();
  g.globalAlpha = alpha * 0.55; g.fillStyle = c.hi; rrect(g, -tr * 0.9, -tr * 0.62, tr * 1.5, tr * 0.5, tr * 0.25); g.fill(); g.globalAlpha = alpha;
  g.fillStyle = c.acc; g.beginPath(); g.moveTo(tr * 0.55, 0); g.lineTo(tr * 0.05, -tr * 0.32); g.lineTo(-tr * 0.35, 0); g.lineTo(tr * 0.05, tr * 0.32); g.closePath(); g.fill(); // mint crystal on the turret
  g.strokeStyle = c.dk; g.lineWidth = 1; g.stroke();
  if (fl) { g.globalAlpha = alpha * fl; g.fillStyle = '#fff'; rrect(g, -tr * 1.15, -tr * 0.8, tr * 2.1, tr * 1.6, tr * 0.65); g.fill(); }
  g.restore();
}
function drawKiragi(e, g, alpha) { krBody(g, { x: e.x, y: e.y, angle: e.angle, turret: e.turret, treadL: e.treadL, treadR: e.treadR, recoil: e.recoil, glow: e.glow, flash: e.flash, scorch: e.scorch }, alpha, false); }

function drawKiragiGround(e, g) {
  const kr = e.kr, m = G.map; if (!kr || !m) return;
  // the frozen lake (phase 3): an ice sheet over the old water, fading in as it freezes
  if (kr.lakeOpen) {
    const k = 1 - kr.lakeT / 1.6;
    g.save(); g.globalAlpha = 0.35 + 0.5 * k;
    for (const q of kr.lake) {
      const x = q.c * T, y = q.r * T; g.fillStyle = '#cfeaf8'; g.fillRect(x, y, T, T);
      g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 1.2; const rn = mulberry32(seedOf(q.c, q.r, 7));
      g.beginPath(); g.moveTo(x + rn() * T, y); g.lineTo(x + rn() * T, y + T * 0.5); g.lineTo(x + rn() * T, y + T); g.moveTo(x, y + rn() * T); g.lineTo(x + T * 0.5, y + rn() * T); g.lineTo(x + T, y + rn() * T); g.stroke();
    }
    g.restore();
  }
  // frost on the ground
  if (kr.frost) {
    g.save();
    for (let r = 0; r < m.n; r++) for (let c = 0; c < m.n; c++) {
      const f = kr.frost[r * m.n + c]; if (f <= 0) continue;
      const a = Math.min(1, f / 1.2) * 0.5, x = c * T, y = r * T;
      g.fillStyle = `rgba(150,205,245,${a.toFixed(3)})`; g.fillRect(x, y, T, T);
      g.strokeStyle = `rgba(255,255,255,${(a * 1.4).toFixed(3)})`; g.lineWidth = 1.1; const rn = mulberry32(seedOf(c, r, 31)); g.beginPath();
      for (let k = 0; k < 3; k++) { const cx = x + 6 + rn() * (T - 12), cy = y + 6 + rn() * (T - 12), an = rn() * TAU; for (let j = 0; j < 3; j++) { g.moveTo(cx, cy); g.lineTo(cx + Math.cos(an + j * 2.09) * 7, cy + Math.sin(an + j * 2.09) * 7); } }
      g.stroke();
    }
    g.restore();
  }
  // the coming band (during the warning) and the moving front
  const f = kr.front;
  if (f) {
    g.save(); const d = f.depth, x0 = f.dir === 0 ? 0 : f.dir === 1 ? m.w - d : 0, y0 = f.dir === 2 ? 0 : f.dir === 3 ? m.h - d : 0, w = f.dir < 2 ? d : m.w, h = f.dir < 2 ? m.h : d;
    if (!f.active) { g.fillStyle = 'rgba(150,205,245,.16)'; g.fillRect(x0, y0, w, h); g.strokeStyle = 'rgba(120,190,245,.7)'; g.lineWidth = 2; g.setLineDash([12, 9]); g.strokeRect(x0 + 1, y0 + 1, w - 2, h - 2); g.setLineDash([]); }
    else {
      const p = f.pos, px = f.dir === 0 ? p : f.dir === 1 ? m.w - p : 0, py = f.dir === 2 ? p : f.dir === 3 ? m.h - p : 0;
      g.fillStyle = 'rgba(235,248,255,.75)'; if (f.dir < 2) g.fillRect(px - 5, 0, 10, m.h); else g.fillRect(0, py - 5, m.w, 10);
    }
    g.restore();
  }
  // snow tracks: dark blue-grey strokes that fade over 2 s; the copies' (second loop) over 0.5 s
  const lists = [[kr.trail, KIR.trail], [kr.dtrail, KIR.trail2]];
  g.save(); g.lineCap = 'round'; g.lineWidth = 4;
  for (const [list, life] of lists) for (const q of list) {
    const k = 1 - (G.time - q.t) / life; if (k <= 0) continue;
    g.strokeStyle = `rgba(70,92,130,${(0.55 * k).toFixed(3)})`; g.beginPath(); g.moveTo(q.x1, q.y1); g.lineTo(q.x2, q.y2); g.stroke();
  }
  g.restore();
}
function drawKiragiTop(e, g) {
  const kr = e.kr; if (!kr) return;
  // ice copies: pale, faintly glowing, lightly pulsing
  for (const d of kr.dec) {
    if (!onScreen(d.x, d.y, 90)) continue;
    const rise = clamp(d.t / 0.35, 0, 1), fade = d.t > KIR.decLife - 1 ? clamp(KIR.decLife - d.t, 0, 1) : 1, pulse = 0.5 + 0.1 * Math.sin(G.time * 5 + d.id);
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.3 * rise * fade; const gs = 130; g.drawImage(SPR.blue, d.x - gs / 2, d.y - gs / 2, gs, gs); g.restore();
    krBody(g, d, (pulse + 0.15) * rise * fade, true);
  }
  // the air shimmer while invisible: wavering rings around the hull and slow glints
  const k = 1 - kr.a;
  if (k > 0.05 && !e.dying && onScreen(e.x, e.y, 90)) {
    const s = KIR_SPEC, t = G.time;
    g.save(); g.translate(e.x, e.y); g.rotate(e.angle); g.lineWidth = 1.7;
    for (let i = 0; i < 3; i++) {
      const wob = Math.sin(t * 4 + i * 2.1) * 2.4, rx = s.len / 2 + 2 + i * 3.5 + wob, ry = s.wid / 2 + 3 + i * 3 + wob * 0.6;
      g.strokeStyle = i === 1 ? `rgba(255,255,255,${(0.7 * k).toFixed(3)})` : `rgba(60,86,132,${((0.38 - i * 0.07) * k).toFixed(3)})`;
      g.setLineDash(i === 2 ? [10, 8] : []); g.lineDashOffset = -t * 30 * (i % 2 ? 1 : -1);
      g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.stroke();
    }
    g.setLineDash([]); g.fillStyle = `rgba(255,255,255,${(0.65 * k).toFixed(3)})`;
    for (let i = 0; i < 4; i++) { const u = ((t * 0.6 + i * 0.25) % 1), x = (u - 0.5) * s.len * 0.9, y = Math.sin(u * 9 + i) * s.wid * 0.35; g.beginPath(); g.arc(x, y, 1.8, 0, TAU); g.fill(); }
    g.restore();
  }
  // beams: a bright mint line that fades out (the harmless copies' flashes are thinner)
  if (kr.beams.length) {
    g.save(); g.lineCap = 'round';
    for (const b of kr.beams) {
      const k2 = clamp(b.t / 0.24, 0, 1), x2 = b.x + Math.cos(b.a) * b.len, y2 = b.y + Math.sin(b.a) * b.len, w = b.fake ? 4 : 11;
      g.strokeStyle = `rgba(${KIR_MINT},${(0.5 * k2).toFixed(3)})`; g.lineWidth = w * (0.6 + k2); g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(x2, y2); g.stroke();
      g.strokeStyle = `rgba(255,255,255,${(0.95 * k2).toFixed(3)})`; g.lineWidth = w * 0.35 * (0.6 + k2); g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(x2, y2); g.stroke();
    }
    g.restore();
  }
}
