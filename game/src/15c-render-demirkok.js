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
