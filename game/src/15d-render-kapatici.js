/* ================= Kapatıcı drawing (docs/img/kapatici-gorsel.png) ================= */
// Matte black angular armour with two wing-like side plates and white light lines, a red eye on the chest with two short white lights beside it, one long barrel with a thick muzzle
// (turns with the turret, glows orange during the open window and while a shot charges), a hexagonal rear engine cover and dark treads; thick near-black outline like the other bosses.
// Hit flash = white overlay; scorch marks as on every boss. Ground layer: the edge ring that is about to close (red tiles with inward arrows).
function kapPoly(g, pts, sy) { g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1] * sy) : g.moveTo(q[0], q[1] * sy))); g.closePath(); }
function kapHex(g, x, y, r) { g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + TAU / 12; i ? g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.9) : g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.9); } g.closePath(); }
const KAP_HULL = [[-22, -9], [-15, -15], [8, -13], [17, -7], [17, 7], [8, 13], [-15, 15], [-22, 9]];
const KAP_CHEST = [[-11, -8], [0, -12], [11, -7], [11, 7], [0, 12], [-11, 8]];
const KAP_WING = [[19, 13], [3, 22], [-14, 19], [-9, 11], [8, 10]];
function drawKapatici(e, g, alpha) {
  const s = e.spec, c = s.col, L = s.len, W = s.wid, tw = s.tread, kp = e.kp, tt = G.time, OL = '#050506';
  const open = clamp((kp.openUntil - tt) / KAP.open, 0, 1), heat = Math.max(open, kp.charge || 0), dying = e.dying, dth = dying ? Math.min(1, e.deathT / 2.4) : 0;
  // treads (under everything)
  g.save(); g.translate(e.x, e.y); g.rotate(e.angle); g.globalAlpha = alpha; g.lineJoin = 'round';
  g.fillStyle = '#1b1c1f'; g.strokeStyle = OL; g.lineWidth = 3;
  for (const sy of [-1, 1]) { rrect(g, -L / 2, sy < 0 ? -W / 2 : W / 2 - tw, L, tw, 4); g.fill(); g.stroke(); }
  g.fillStyle = '#4a4b51'; const st = 6;
  let o = ((e.treadL % st) + st) % st; for (let x = -L / 2 + o; x < L / 2 - 2; x += st) g.fillRect(x, -W / 2 + 1.8, 2.2, tw - 3.6);
  o = ((e.treadR % st) + st) % st; for (let x = -L / 2 + o; x < L / 2 - 2; x += st) g.fillRect(x, W / 2 - tw + 1.8, 2.2, tw - 3.6);
  g.restore();
  // barrel (turns with the turret; its base hides under the hull)
  g.save(); g.translate(e.x, e.y); g.rotate(e.turret); g.globalAlpha = alpha; g.lineJoin = 'round';
  const rc = e.recoil * 5, bl = s.barrel - rc;
  g.fillStyle = '#44454b'; g.strokeStyle = OL; g.lineWidth = 3; g.beginPath(); g.rect(2, -3.4, bl - 12, 6.8); g.fill(); g.stroke();
  g.fillStyle = '#6a6c74'; g.fillRect(4, -2.4, bl - 17, 1.6); // top light edge
  g.fillStyle = '#26272b'; g.strokeStyle = OL; g.lineWidth = 3; g.beginPath(); g.rect(bl - 12, -5.4, 11, 10.8); g.fill(); g.stroke(); // thick muzzle
  g.fillStyle = '#5a5c64'; g.fillRect(bl - 10, -4, 3, 8);
  if (heat > 0.02) { // heated barrel
    g.globalAlpha = alpha * heat * 0.8; g.fillStyle = open > 0 ? '#ff8a3a' : '#ff4a3a'; g.fillRect(8, -2.4, bl - 20, 4.8); g.fillRect(bl - 12, -4.6, 11, 9.2);
    if (fxScale === 1) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = alpha * heat; const gs = 40 + 34 * heat; g.drawImage(SPR.fire, bl - gs / 2 - 2, -gs / 2, gs, gs); g.globalCompositeOperation = 'source-over'; }
  }
  g.restore();
  // hull, wings, chest, eye, engine cover
  g.save(); g.translate(e.x, e.y); g.rotate(e.angle); g.globalAlpha = alpha; g.lineJoin = 'round';
  kapHex(g, -22, 0, 9.5); g.fillStyle = '#2b2c31'; g.fill(); g.strokeStyle = OL; g.lineWidth = 3; g.stroke(); // rear engine cover
  kapHex(g, -22.5, -0.6, 5.6); g.fillStyle = '#41434a'; g.fill(); g.lineWidth = 1.4; g.strokeStyle = 'rgba(0,0,0,.6)'; g.stroke();
  kapPoly(g, KAP_HULL, 1); g.fillStyle = '#222327'; g.fill(); g.strokeStyle = OL; g.lineWidth = 3; g.stroke();
  for (const sy of [-1, 1]) { // wing plates with a white light line along the outer edge
    kapPoly(g, KAP_WING, sy); g.fillStyle = '#303137'; g.fill(); g.strokeStyle = OL; g.lineWidth = 3; g.stroke();
    g.fillStyle = 'rgba(120,124,134,.35)'; g.beginPath(); g.moveTo(17, 12 * sy); g.lineTo(5, 19 * sy); g.lineTo(0, 15 * sy); g.lineTo(9, 10.5 * sy); g.closePath(); g.fill();
    g.lineCap = 'round'; g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 3.4; g.beginPath(); g.moveTo(16, 13.5 * sy); g.lineTo(3.5, 19.6 * sy); g.lineTo(-11, 16.6 * sy); g.stroke();
    g.strokeStyle = '#fff'; g.lineWidth = 1.3; g.stroke();
  }
  kapPoly(g, KAP_CHEST, 1); g.fillStyle = '#34363c'; g.fill(); g.strokeStyle = OL; g.lineWidth = 2.6; g.stroke();
  g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(-9, -9, 17, 2.2);
  const eyeHot = Math.max(open, dying ? 0.5 + 0.5 * Math.sin(tt * 30) * (1 - dth) : 0), pul = 0.75 + 0.25 * Math.sin(tt * 4);
  g.strokeStyle = '#fff'; g.lineWidth = 2.2; g.lineCap = 'round'; for (const sy of [-1, 1]) { g.beginPath(); g.moveTo(-8, 8 * sy); g.lineTo(-1, 8 * sy); g.stroke(); } // short white lights beside the eye
  g.globalAlpha = alpha * (0.3 + 0.25 * eyeHot) * pul; g.fillStyle = '#ff2a22'; g.beginPath(); g.arc(0, 0, 8 + 2 * eyeHot, 0, TAU); g.fill(); g.globalAlpha = alpha;
  g.fillStyle = eyeHot > 0.4 ? '#fff0d8' : '#ff2a22'; g.strokeStyle = '#5a0000'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, 4.4, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.arc(-1.3, -1.4, 1.2, 0, TAU); g.fill();
  // scorch marks and the hit flash
  g.fillStyle = 'rgba(0,0,0,.55)'; g.strokeStyle = 'rgba(255,150,120,.3)'; g.lineWidth = 0.8;
  for (const q of e.scorch) { g.save(); g.translate(q.x, q.y); g.rotate(q.a); g.beginPath(); g.ellipse(0, 0, q.r * 1.3, q.r * 0.85, 0, 0, TAU); g.fill(); g.stroke(); g.restore(); }
  const fl = e.flash > 0 ? Math.min(1, e.flash * 10) * 0.8 : 0;
  if (fl) { g.globalAlpha = alpha * fl; g.fillStyle = '#fff'; kapPoly(g, KAP_HULL, 1); g.fill(); for (const sy of [-1, 1]) { kapPoly(g, KAP_WING, sy); g.fill(); } g.globalAlpha = alpha; }
  g.restore(); g.globalAlpha = 1;
}
// the edge ring that closes in 2 s: pulsing red tiles with arrows pointing inward
function drawKapaniGround(e, g) {
  const kp = e.kp; if (!kp || !kp.warn) return;
  const m = G.map, n = m.n, k = kp.closed, tt = G.time, pul = 0.5 + 0.5 * Math.sin(tt * 14);
  g.save();
  for (const [c, r] of kapRingTiles(n, k)) {
    const x = c * T, y = r * T;
    g.fillStyle = `rgba(224,50,36,${(0.22 + 0.22 * pul).toFixed(3)})`; g.fillRect(x, y, T, T);
    g.strokeStyle = 'rgba(255,110,80,.55)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y + T); g.lineTo(x + T, y); g.stroke();
  }
  g.fillStyle = `rgba(255,236,220,${(0.6 + 0.3 * pul).toFixed(3)})`; g.strokeStyle = 'rgba(120,10,6,.9)'; g.lineWidth = 2;
  for (let i = k + 2; i < n - k - 1; i += 3) {
    for (const [c, r, dx, dy] of [[i, k, 0, 1], [i, n - 1 - k, 0, -1], [k, i, 1, 0], [n - 1 - k, i, -1, 0]]) {
      const cx = c * T + T / 2, cy = r * T + T / 2, px = -dy, py = dx;
      g.beginPath(); g.moveTo(cx + dx * 11, cy + dy * 11); g.lineTo(cx - dx * 8 + px * 11, cy - dy * 8 + py * 11); g.lineTo(cx - dx * 3, cy - dy * 3); g.lineTo(cx - dx * 8 - px * 11, cy - dy * 8 - py * 11); g.closePath(); g.fill(); g.stroke();
    }
  }
  g.restore();
}
