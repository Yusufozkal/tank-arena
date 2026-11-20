/* ================= boss drawing ================= */
// drawTank hands bosses to drawBoss. Komutan: bordeaux hull, gold trim, three barrels, command tower with a banner (bigger than the old Komutan: 90 long).
function drawBoss(e, alpha, g) {
  if (e.def && e.def.draw) e.def.draw(e, g, alpha); else drawKomutan(e, g, alpha);
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
