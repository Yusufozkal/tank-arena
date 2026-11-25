/* ================= Son Hisar drawing (docs/BOSSES.md section 7; logic 11g) ================= */
// Seen from above like the concept art: a wide dark-grey hull in two-tone plates, wide treads, a central turret block with the amber core ring, twin long main guns with amber bands, a rear vent,
// amber lights at the front corners and two side cooling modules (a riveted box with a three-blade fan). A broken module is a black, scorched, sparking socket; a hurt one cracks. Phase 4: the core hatch slides open and glows.
function drawSonhisar(e, g, alpha) {
  const s = e.spec, c = s.col, L = s.len, W = s.wid, tw = s.tread, sh = e.sh || { fan: 0, core: 0 }, lost = e.lost;
  g.save(); g.translate(e.x, e.y); g.rotate(e.angle); g.globalAlpha = alpha;
  // treads
  g.fillStyle = '#1b1c1f'; rrect(g, -L / 2, -W / 2, L, tw, 5); g.fill(); rrect(g, -L / 2, W / 2 - tw, L, tw, 5); g.fill();
  g.fillStyle = '#4d4f55'; const st = 7;
  let o = ((e.treadL % st) + st) % st; for (let x = -L / 2 + o; x < L / 2 - 2; x += st) g.fillRect(x, -W / 2 + 2, 2.4, tw - 4);
  o = ((e.treadR % st) + st) % st; for (let x = -L / 2 + o; x < L / 2 - 2; x += st) g.fillRect(x, W / 2 - tw + 2, 2.4, tw - 4);
  // hull
  const hx = -L / 2 + 3, hw = L - 6, hy = -W / 2 + tw - 2, hh = W - 2 * tw + 4;
  g.fillStyle = c.dk; rrect(g, hx, hy, hw, hh, 8); g.fill();
  g.fillStyle = c.body; rrect(g, hx + 2.5, hy + 2.5, hw - 5, hh - 5, 6); g.fill();
  g.fillStyle = c.hi; g.globalAlpha = alpha * 0.45; rrect(g, hx + 6, hy + 5, hw - 12, 7, 3); g.fill(); g.globalAlpha = alpha; // top light edge
  g.fillStyle = c.dk; g.fillRect(-L / 2 + 8, -16, 12, 32); g.fillStyle = '#17181b'; for (let k = 0; k < 4; k++) g.fillRect(-L / 2 + 10, -13 + k * 7, 8, 3.5); // rear vent
  g.fillStyle = c.acc; for (const sy of [-1, 1]) { g.fillRect(L / 2 - 20, sy * (hh / 2 - 8) - 2, 14, 4); g.beginPath(); g.moveTo(-L / 2 + 14, sy * (hh / 2 - 4)); g.lineTo(-L / 2 + 26, sy * (hh / 2 - 4)); g.lineTo(-L / 2 + 22, sy * (hh / 2 - 10)); g.closePath(); g.fill(); } // front lights, rear corner lamps
  if (!lost.plate) { g.fillStyle = c.dk; rrect(g, 24, -hh / 2 + 3, 20, hh - 6, 3); g.fill(); g.fillStyle = c.hi; g.globalAlpha = alpha * 0.4; g.fillRect(26, -hh / 2 + 6, 3, hh - 12); g.globalAlpha = alpha; } // front glacis plate (falls in phase 2)
  g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineWidth = 1.6; rrect(g, -L / 2, -W / 2, L, W, 6); g.stroke();
  if (e.scorch) { g.fillStyle = 'rgba(15,10,8,.55)'; for (const q of e.scorch) { g.save(); g.translate(q.x, q.y); g.rotate(q.a); g.beginPath(); g.ellipse(0, 0, q.r * 1.4, q.r * 0.9, 0, 0, TAU); g.fill(); g.restore(); } }
  // cooling modules
  for (const pt of e.parts) {
    const x = pt.ox, y = pt.oy, w = 36, h = 24, f = clamp(pt.hp / pt.maxHp, 0, 1);
    if (!pt.alive) { g.fillStyle = '#0d0d0f'; rrect(g, x - w / 2, y - h / 2, w, h, 4); g.fill(); g.strokeStyle = '#3a2410'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#2a1708'; g.fillRect(x - 12, y - 7, 24, 14); g.strokeStyle = '#ffb04a'; g.globalAlpha = alpha * (0.4 + 0.4 * Math.sin(G.time * 14 + y)); g.beginPath(); g.moveTo(x - 10, y + 5); g.lineTo(x - 3, y - 3); g.lineTo(x + 3, y + 3); g.lineTo(x + 10, y - 5); g.stroke(); g.globalAlpha = alpha; continue; }
    g.fillStyle = c.dk; rrect(g, x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4, 5); g.fill();
    g.fillStyle = '#585d66'; rrect(g, x - w / 2, y - h / 2, w, h, 4); g.fill();
    g.fillStyle = '#16171a'; rrect(g, x - 15, y - 9, 30, 18, 3); g.fill(); // the vent window
    g.fillStyle = '#9aa0aa'; for (const [rx, ry] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.beginPath(); g.arc(x + rx * (w / 2 - 3), y + ry * (h / 2 - 3), 1.4, 0, TAU); g.fill(); } // rivets
    g.save(); g.translate(x, y); g.rotate(sh.fan * (pt.oy < 0 ? 1 : -1)); g.fillStyle = f > 0.35 ? c.acc : '#b9772a';
    for (let k = 0; k < 3; k++) { g.rotate(TAU / 3); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(7, -3, 8, 2); g.quadraticCurveTo(4, 4, 0, 0); g.fill(); }
    g.fillStyle = '#111'; g.beginPath(); g.arc(0, 0, 2.2, 0, TAU); g.fill(); g.restore();
    if (f < 0.6) { g.strokeStyle = 'rgba(0,0,0,.75)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x - w / 2 + 3, y - 6); g.lineTo(x - 4, y - 1); g.lineTo(x - 8, y + 8); g.moveTo(x + 4, y - h / 2 + 3); g.lineTo(x + 8, y + 2); g.stroke(); }
    if (f < 0.3 && fxScale === 1) { g.fillStyle = `rgba(255,150,40,${(0.25 + 0.2 * Math.sin(G.time * 16)).toFixed(2)})`; rrect(g, x - w / 2, y - h / 2, w, h, 4); g.fill(); }
    if (pt.flash > 0) { g.globalAlpha = alpha * 0.8; g.fillStyle = '#fff'; rrect(g, x - w / 2, y - h / 2, w, h, 4); g.fill(); g.globalAlpha = alpha; }
  }
  const fl = e.flash > 0 ? Math.min(1, e.flash * 10) * 0.7 : 0;
  if (fl) { g.globalAlpha = alpha * fl; g.fillStyle = '#fff'; rrect(g, hx, hy, hw, hh, 8); g.fill(); g.globalAlpha = alpha; }
  // turret: block, core ring and the twin barrels
  g.rotate(e.turret - e.angle);
  const rec = (e.recoil || 0) * 6, gk = clamp(e.glow || 0, 0, 1), bl = s.barrel, bw = s.bW, gy = SH.gun, tr = s.tR;
  for (const side of [-1, 1]) {
    const y = side * gy;
    g.fillStyle = '#17181b'; g.fillRect(tr * 0.3 - rec - 1, y - bw / 2 - 1, bl - tr * 0.3 + 2, bw + 2);
    g.fillStyle = c.dk; g.fillRect(tr * 0.3 - rec, y - bw / 2, bl - tr * 0.3, bw);
    g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(tr * 0.3 - rec, y - bw / 2 + 1, bl - tr * 0.3, 1.4);
    g.fillStyle = c.acc; g.fillRect(bl * 0.62 - rec, y - bw / 2 - 0.8, 6, bw + 1.6); g.fillRect(bl * 0.74 - rec, y - bw / 2 - 0.8, 6, bw + 1.6);
    g.fillStyle = '#1b1c1f'; g.fillRect(bl - 9 - rec, y - bw / 2 - 2, 10, bw + 4); g.fillStyle = c.hi; g.fillRect(bl - 9 - rec, y - bw / 2 - 2, 10, 1.6);
    if (gk > 0) {
      const x = bl - rec + 3;
      g.fillStyle = `rgba(40,20,4,${(0.65 * gk).toFixed(2)})`; g.beginPath(); g.arc(x, y, 6 + 3 * gk, 0, TAU); g.fill();
      if (fxScale === 1) { g.globalCompositeOperation = 'lighter'; const gs = 24 + 44 * gk; g.globalAlpha = alpha * (0.4 + 0.6 * gk); g.drawImage(SPR.fire, x - gs / 2, y - gs / 2, gs, gs); g.globalCompositeOperation = 'source-over'; }
      g.globalAlpha = alpha * (0.55 + 0.45 * gk); g.fillStyle = gk < 1 ? '#f2a530' : '#fff4d0'; g.beginPath(); g.arc(x, y, 3.6 + 2.6 * gk, 0, TAU); g.fill(); g.globalAlpha = alpha;
    }
  }
  g.fillStyle = c.dk; rrect(g, -tr * 1.5 - 2, -tr * 0.9 - 2, tr * 3 + 4, tr * 1.8 + 4, tr * 0.6); g.fill();
  g.fillStyle = c.body; rrect(g, -tr * 1.5, -tr * 0.9, tr * 3, tr * 1.8, tr * 0.55); g.fill();
  g.globalAlpha = alpha * 0.45; g.fillStyle = c.hi; rrect(g, -tr * 1.25, -tr * 0.78, tr * 2.2, tr * 0.4, tr * 0.2); g.fill(); g.globalAlpha = alpha;
  g.fillStyle = c.acc; g.fillRect(tr * 0.7, -3, tr * 0.5, 6); // amber tab on the front of the turret
  const cx = -tr * 0.15, cr = tr * 0.5, k = sh.core || 0; // the core
  if (k > 0 && fxScale === 1) { g.globalCompositeOperation = 'lighter'; const gs = cr * (5 + 2 * Math.sin(G.time * 8)); g.globalAlpha = alpha * (0.5 + 0.4 * k); g.drawImage(SPR.fire, cx - gs / 2, -gs / 2, gs, gs); g.globalCompositeOperation = 'source-over'; g.globalAlpha = alpha; }
  g.fillStyle = k > 0 ? '#ffd27a' : '#2a1708'; g.beginPath(); g.arc(cx, 0, cr, 0, TAU); g.fill();
  g.strokeStyle = c.acc; g.lineWidth = 3; g.beginPath(); g.arc(cx, 0, cr, 0, TAU); g.stroke();
  if (k > 0) { g.fillStyle = `rgba(255,250,220,${(0.6 + 0.3 * Math.sin(G.time * 10)).toFixed(2)})`; g.beginPath(); g.arc(cx, 0, cr * 0.55, 0, TAU); g.fill(); }
  g.fillStyle = c.dk; const sl = k * (cr + 3); // the hatch: two half plates slide apart
  g.save(); g.beginPath(); g.arc(cx, 0, cr - 0.5, 0, TAU); g.clip(); g.fillRect(cx - cr, -cr - sl, cr * 2, cr); g.fillRect(cx - cr, sl, cr * 2, cr); g.restore();
  g.fillStyle = c.acc; g.fillRect(cx - cr, -0.8 - sl, cr * 2, 1.6); g.fillRect(cx - cr, -0.8 + sl, cr * 2, 1.6);
  if (fl) { g.globalAlpha = alpha * fl; g.fillStyle = '#fff'; rrect(g, -tr * 1.5, -tr * 0.9, tr * 3, tr * 1.8, tr * 0.55); g.fill(); }
  g.restore();
}
// ground layer: instant laser beams, the sweep wedge in the last phase
function drawSonhisarGround(e, g) {
  const sh = e.sh; if (!sh) return;
  if (sh.spin && !e.dying) { // the warning wedge ahead of the guns (matches def.danger)
    g.save(); g.translate(e.x, e.y); const a0 = e.turret, a1 = e.turret + sh.spin * 0.9;
    g.fillStyle = 'rgba(224,60,40,.16)'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 12 * T, Math.min(a0, a1), Math.max(a0, a1)); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,110,70,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a1) * 12 * T, Math.sin(a1) * 12 * T); g.stroke(); g.restore();
  }
  if (sh.beams.length) {
    g.save(); g.lineCap = 'round';
    for (const b of sh.beams) {
      const k2 = clamp(b.t / 0.26, 0, 1), x2 = b.x + Math.cos(b.a) * b.len, y2 = b.y + Math.sin(b.a) * b.len;
      g.strokeStyle = `rgba(${SH_AMBER},${(0.55 * k2).toFixed(3)})`; g.lineWidth = 12 * (0.6 + k2); g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(x2, y2); g.stroke();
      g.strokeStyle = `rgba(255,250,225,${(0.95 * k2).toFixed(3)})`; g.lineWidth = 4 * (0.6 + k2); g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(x2, y2); g.stroke();
    }
    g.restore();
  }
}
