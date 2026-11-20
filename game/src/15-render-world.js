/* ================= render ================= */
function render() {
  const dpr = view.dpr, m = G.map;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = m ? m.theme.bg : '#262a1d';
  ctx.fillRect(0, 0, view.w, view.h);
  if (!m) return;
  let sx = 0, sy = 0;
  if (cam.shake > 0 && G.state === 'play') { sx = (Math.random() * 2 - 1) * cam.shake; sy = (Math.random() * 2 - 1) * cam.shake; }
  const s = view.scale, ox = view.w / 2 - cam.x * s + sx, oy = view.h / 2 - cam.y * s + sy;
  ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
  const x0 = Math.max(0, view.x0 - 4), y0 = Math.max(0, view.y0 - 4), x1 = Math.min(m.w, view.x1 + 4), y1 = Math.min(m.h, view.y1 + 4);
  if (x1 > x0 && y1 > y0) ctx.drawImage(m.layer, x0 * m.res, y0 * m.res, (x1 - x0) * m.res, (y1 - y0) * m.res, x0, y0, x1 - x0, y1 - y0);
  const c0 = Math.max(0, Math.floor(view.x0 / T) - 1), c1 = Math.min(m.n - 1, Math.floor(view.x1 / T) + 1);
  const r0 = Math.max(0, Math.floor(view.y0 / T) - 1), r1 = Math.min(m.n - 1, Math.floor(view.y1 / T) + 1);
  drawWaterFx(c0, c1, r0, r1);
  if (m.frame) { ctx.strokeStyle = m.theme.steelDk; ctx.lineWidth = 12; ctx.strokeRect(-6, -6, m.w + 12, m.h + 12); ctx.strokeStyle = m.theme.steel; ctx.lineWidth = 3; ctx.strokeRect(-1.5, -1.5, m.w + 3, m.h + 3); }
  drawTreads();
  drawPieces();
  drawTele();
  drawPortals();
  const p = G.player, pAlive = !!(p && p.alive), cloak = G.buffs.stealth > 0;
  const pa = cloak ? 0.4 + 0.08 * Math.sin(G.time * 7) : 1; // Kamuflaj: the player's tank shimmers, half seen
  ctx.fillStyle = m.theme.shadow;
  for (const e of G.enemies) if (onScreen(e.x, e.y, 60)) tankShadow(e);
  if (pAlive && !cloak) tankShadow(p);
  for (const e of G.enemies) if (onScreen(e.x, e.y, 60)) drawTank(e, 1);
  if (G.buffs.freeze > 0) for (const e of G.enemies) if (!e.dead && !e.hidden && onScreen(e.x, e.y, 60)) drawFrost(e);
  if (pAlive) drawTank(p, pa);
  drawBushes(c0, c1, r0, r1);
  if (upL('thermal')) for (const e of G.enemies) if (e.hidden && !e.dead && onScreen(e.x, e.y, 60)) drawThermal(e);
  if (pAlive && m.at(p.x, p.y) === BUSH) drawTank(p, 0.5 * pa);
  if (pAlive && (G.buffs.shield > 0 || p.shield1T > 0)) drawShield(p);
  drawPips();
  drawTankFx(); // tank-specific effects under the shells (stun, transformation ring; D1/D2: laser, landing marks, flame)
  drawBullets();
  drawLocks();
  drawStrikes();
  for (const k of G.pickups) drawPickup(k);
  drawParticles();
  drawJet();
  drawTexts();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if ((G.state === 'play' || G.state === 'paused') && !dbg.clean) { drawIndicators(); drawCrosshair(); drawSticks(); drawVignette(); }
  syncAimCursor();
  if (G.state === 'menu') drawMenuHint();
  drawNuke(); // hook (C): screen space (setTransform(dpr)), above the overlays, below the fade
  if (G.fade > 0.001) { ctx.fillStyle = `rgba(14,16,10,${G.fade.toFixed(3)})`; ctx.fillRect(0, 0, view.w, view.h); }
}
function drawWaterFx(c0, c1, r0, r1) {
  const m = G.map; let any = false;
  ctx.beginPath();
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    if (m.t[r * m.n + c] !== WATER) continue; any = true;
    for (let k = 0; k < 2; k++) {
      const ph = (G.time * 7 + ((c * 17 + r * 11) % 23) + k * T / 2) % T;
      if (ph < 8 || ph > T - 6) continue;
      const yy = r * T + ph, cx = c * T + T / 2 + Math.sin(G.time * 1.3 + r + k * 2.1) * 9, w = 6 + 5 * Math.abs(Math.sin(G.time * 1.7 + c + k));
      ctx.moveTo(cx - w, yy); ctx.lineTo(cx + w, yy);
    }
  }
  if (!any) return;
  ctx.strokeStyle = m.theme.waterHi; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.globalAlpha = 0.5; ctx.stroke(); ctx.globalAlpha = 1;
}
function drawTreads() {
  if (!tm.n) return;
  const LIFE = 9, B = 5, paths = [];
  for (let b = 0; b < B; b++) paths.push(new Path2D());
  let any = false;
  for (let k = 0; k < tm.n; k++) {
    const age = G.time - tm.t[k]; if (age >= LIFE || age < 0) continue;
    const pth = paths[Math.min(B - 1, Math.floor(age / LIFE * B))];
    pth.moveTo(tm.x1[k], tm.y1[k]); pth.lineTo(tm.x2[k], tm.y2[k]); any = true;
  }
  if (!any) return;
  ctx.lineWidth = 5.5; ctx.lineCap = 'butt';
  const rgb = G.map.theme.tread;
  for (let b = 0; b < B; b++) { ctx.strokeStyle = `rgba(${rgb},${(0.26 * (1 - (b + 0.5) / B)).toFixed(3)})`; ctx.stroke(paths[b]); }
}
function drawPortals() {
  for (const q of G.portals) {
    const k = clamp(q.t / q.dur, 0, 1), pulse = 0.5 + 0.5 * Math.sin(G.time * 12);
    ctx.save(); ctx.translate(q.x, q.y);
    ctx.globalAlpha = 0.18 + 0.22 * pulse; ctx.fillStyle = '#e0533a'; ctx.beginPath(); ctx.arc(0, 0, 8 + 16 * k, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.9; ctx.strokeStyle = '#e0533a'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 6]); ctx.lineDashOffset = -G.time * 40;
    ctx.beginPath(); ctx.arc(0, 0, 24 - 4 * k, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function tankShadow(t) {
  const s = t.spec; ctx.save(); ctx.translate(t.x + 5, t.y + 7); ctx.rotate(t.angle); rrect(ctx, -s.len / 2, -s.wid / 2, s.len, s.wid, 6); ctx.fill(); ctx.restore();
}
// One barrel in the turret frame. s.shape picks the look; heat (0..1, Makineli) tints it red, with a dark rim so it reads on sand and snow
const mixHex = (a, b, k) => { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); let o = 0; for (let sh = 16; sh >= 0; sh -= 8) { const x = (pa >> sh) & 255, y = (pb >> sh) & 255; o = (o << 8) | Math.round(x + (y - x) * k); } return '#' + (o + 0x1000000).toString(16).slice(1); };
function barrel(s, rec, c, g, heat, len0) {
  const x0 = s.tR * 0.4 - rec, len = (len0 || s.barrel) - s.tR * 0.4, bW = s.bW;
  let dk = c.dk;
  if (heat > 0) { // hot barrel: dark -> orange -> pulsing red when overheated
    const over = G.player && s === G.player.spec && G.player.overheatT > 0;
    dk = over ? mixHex('#ff3b1f', '#ff8a5c', 0.5 + 0.5 * Math.sin(G.time * 20)) : mixHex(c.dk, '#ff5a2a', Math.min(1, heat) * 0.85);
    if (heat > 0.25) { g.fillStyle = 'rgba(30,12,6,.9)'; g.fillRect(x0 - 1, -bW / 2 - 1.2, len + 2, bW + 2.4); }
  }
  switch (s.shape) {
    case 'long': { // Keskin Nişancı: thin long barrel, breech collar and a slotted muzzle brake
      g.fillStyle = dk; g.fillRect(x0, -bW / 2, len, bW);
      g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(x0, -bW / 2 + 1, len, 1.1);
      g.fillStyle = c.dk; g.fillRect(x0, -bW / 2 - 1.3, 5, bW + 2.6);
      g.fillStyle = '#1f1d19'; g.fillRect(x0 + len - 7, -bW / 2 - 1.8, 7, bW + 3.6);
      g.fillStyle = c.acc; g.fillRect(x0 + len - 5.2, -bW / 2 - 1.8, 1.2, bW + 3.6); g.fillRect(x0 + len - 2.6, -bW / 2 - 1.8, 1.2, bW + 3.6);
      break;
    }
    case 'mg': { // Makineli: short thick barrel in a ventilated jacket
      g.fillStyle = dk; g.fillRect(x0, -bW / 2, len, bW);
      g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(x0, -bW / 2 + 1, len, 1.1);
      const jl = len * 0.62;
      g.fillStyle = heat > 0.25 ? dk : c.body; g.fillRect(x0, -bW / 2 - 1.6, jl, bW + 3.2);
      g.fillStyle = '#1f1d19'; for (let v = 3; v < jl - 2; v += 4.2) g.fillRect(x0 + v, -bW / 2 - 0.9, 1.7, bW + 1.8);
      g.fillStyle = '#1f1d19'; g.fillRect(x0 + len - 5, -bW / 2 - 1, 5, bW + 2);
      break;
    }
    case 'tri': { // Üçlü: thin barrels with a pink tip; the long middle one (the piercing shell) gets a pointed tip
      g.fillStyle = dk; g.fillRect(x0, -bW / 2, len, bW);
      g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(x0, -bW / 2 + 1, len, 1.1);
      g.fillStyle = '#1f1d19'; g.fillRect(x0 + len - 4, -bW / 2 - 1, 4, bW + 2);
      g.fillStyle = c.acc;
      if (len0 > 26) { g.beginPath(); g.moveTo(x0 + len - 6, -bW / 2 - 0.8); g.lineTo(x0 + len + 3, 0); g.lineTo(x0 + len - 6, bW / 2 + 0.8); g.closePath(); g.fill(); }
      else g.fillRect(x0 + len - 6, -bW / 2 - 0.8, 1.6, bW + 1.6);
      break;
    }
    case 'duo': { // Çift Yön: a front and a rear barrel, each with a pale ring near the tip
      g.fillStyle = dk; g.fillRect(x0, -bW / 2, len, bW);
      g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(x0, -bW / 2 + 1, len, 1.1);
      g.fillStyle = '#1f1d19'; g.fillRect(x0 + len - 4, -bW / 2 - 1, 4, bW + 2);
      g.fillStyle = c.acc; g.fillRect(x0 + len - 9, -bW / 2 - 1.2, 2.2, bW + 2.4);
      break;
    }
    case 'flame': { // Alev Topu: short fat tube widening to a nozzle with a glowing mouth
      g.fillStyle = dk; g.fillRect(x0, -bW / 2, len * 0.62, bW);
      g.beginPath(); g.moveTo(x0 + len * 0.62, -bW / 2); g.lineTo(x0 + len, -bW * 0.78); g.lineTo(x0 + len, bW * 0.78); g.lineTo(x0 + len * 0.62, bW / 2); g.closePath(); g.fill();
      g.fillStyle = c.acc; g.fillRect(x0 + len * 0.62 - 1, -bW / 2 - 1.2, 2.4, bW + 2.4);
      g.fillStyle = '#1f1d19'; g.fillRect(x0 + len - 3.2, -bW * 0.78 - 0.6, 3.2, bW * 1.56 + 1.2);
      g.fillStyle = G.player && s === G.player.spec && G.player.flameOn ? '#fff0a0' : '#ff7a2a'; g.fillRect(x0 + len - 2, -bW * 0.5, 2.4, bW);
      break;
    }
    case 'bell': { // Şarapnel: a flared bell with a dark mouth and a pale rim
      g.fillStyle = dk; g.fillRect(x0, -bW * 0.36, len * 0.45, bW * 0.72);
      g.beginPath(); g.moveTo(x0 + len * 0.4, -bW * 0.36); g.lineTo(x0 + len, -bW * 1.1); g.lineTo(x0 + len, bW * 1.1); g.lineTo(x0 + len * 0.4, bW * 0.36); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(x0, -bW * 0.36 + 0.8, len * 0.45, 1.1);
      g.fillStyle = '#1f1d19'; g.beginPath(); g.ellipse(x0 + len - 1, 0, 2.6, bW * 0.95, 0, 0, TAU); g.fill();
      g.fillStyle = c.acc; g.fillRect(x0 + len - 4.4, -bW * 1.1, 1.4, bW * 2.2);
      break;
    }
    case 'rail': { // Rayli Top: a long thin barrel with glowing coil rings and a small emitter at the tip
      g.fillStyle = '#1f1d19'; g.fillRect(x0, -bW / 2 - 0.8, len, bW + 1.6);
      g.fillStyle = dk; g.fillRect(x0, -bW / 2, len, bW);
      g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(x0, -bW / 2 + 0.7, len, 1);
      for (let k = 0; k < 4; k++) { const cx = x0 + 6 + k * (len - 16) / 3.4; g.fillStyle = '#1f1d19'; g.fillRect(cx - 0.4, -bW / 2 - 2.9, 3.8, bW + 5.8); g.fillStyle = c.acc; g.fillRect(cx + 0.4, -bW / 2 - 2.2, 2.2, bW + 4.4); }
      g.fillStyle = '#1f1d19'; g.fillRect(x0 + len - 3.5, -bW / 2 - 1.6, 3.5, bW + 3.2);
      g.fillStyle = c.acc; g.fillRect(x0 + len - 2.2, -1, 2.2, 2);
      break;
    }
    case 'obus': { // Obus: a short fat barrel with a wide collar and a heavy muzzle ring
      g.fillStyle = '#1f1d19'; g.fillRect(x0, -bW / 2 - 1.2, len, bW + 2.4);
      g.fillStyle = dk; g.fillRect(x0, -bW / 2, len, bW);
      g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(x0, -bW / 2 + 1, len, 1.4);
      const cx = x0 + len * 0.42; g.fillStyle = '#1f1d19'; g.fillRect(cx - 0.8, -bW / 2 - 4.2, 6.6, bW + 8.4); g.fillStyle = c.acc; g.fillRect(cx + 0.6, -bW / 2 - 3.2, 3.8, bW + 6.4);
      g.fillStyle = '#1f1d19'; g.fillRect(x0 + len - 5, -bW / 2 - 2.4, 5, bW + 4.8);
      g.fillStyle = '#0d0c0a'; g.fillRect(x0 + len - 2.2, -bW / 2 + 2, 2.2, bW - 4);
      break;
    }
    default: // std and twin (one thin barrel per muzzle): the original look
      g.fillStyle = dk; g.fillRect(x0, -bW / 2, len, bW);
      g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(x0, -bW / 2 + 1, len, 1.2);
      g.fillStyle = '#1f1d19'; g.fillRect(x0 + len - 5, -bW / 2 - 1, 5, bW + 2);
  }
}
// Marks per tank shape: hullMarks go on the hull (before the turret), turretMarks on the turret (the Standart keeps its gold arrow)
function hullMarks(g, s, c, hx, hy, hw, hh, alpha) {
  g.fillStyle = c.acc; g.globalAlpha = alpha * 0.92;
  switch (s.shape) {
    case 'twin': g.fillRect(hx + 2, hy + 0.5, hw - 4, 1.7); g.fillRect(hx + 2, hy + hh - 2.2, hw - 4, 1.7); break; // racing stripes along both tracks
    case 'long': g.fillRect(hx + 2, hy + hh / 2 - 1.1, 7, 2.2); break; // rear stripe
    case 'mg': for (let k = 0; k < 2; k++) { const x = hx + 2.5 + k * 4.2; g.beginPath(); g.moveTo(x, hy + 3); g.lineTo(x + 3, hy + hh / 2); g.lineTo(x, hy + hh - 3); g.lineTo(x + 1.7, hy + hh - 3); g.lineTo(x + 4.7, hy + hh / 2); g.lineTo(x + 1.7, hy + 3); g.closePath(); g.fill(); } break; // belt chevrons on the rear deck
    case 'tri': for (let k = -1; k <= 1; k++) { g.beginPath(); g.arc(hx + 6, hy + hh / 2 + k * 6, 1.9, 0, TAU); g.fill(); } g.fillRect(hx + 10, hy + hh / 2 - 0.8, 4, 1.6); break; // three studs across the rear deck
    case 'duo': g.fillRect(hx + 4, hy + hh / 2 - 0.9, hw - 8, 1.8); for (const sg of [-1, 1]) { const x = sg > 0 ? hx + hw - 3 : hx + 3; g.beginPath(); g.moveTo(x, hy + hh / 2); g.lineTo(x - sg * 4.5, hy + hh / 2 - 3.6); g.lineTo(x - sg * 4.5, hy + hh / 2 + 3.6); g.closePath(); g.fill(); } break; // arrow pointing both ways
    case 'flame': for (let k = 0; k < 2; k++) { const x = hx + 2.5 + k * 5.2; g.beginPath(); g.moveTo(x, hy + hh - 3); g.quadraticCurveTo(x + 4, hy + hh / 2 + 1, x + 1.5, hy + 3); g.quadraticCurveTo(x + 1.5, hy + hh / 2, x - 1.8, hy + hh - 3); g.closePath(); g.fill(); } break; // two flame tongues
    case 'bell': for (let k = 0; k < 3; k++) { const x = hx + 2.5 + k * 3.4; g.beginPath(); g.moveTo(x, hy + hh - 2.5); g.lineTo(x + 2, hy + hh - 2.5); g.lineTo(x + 5.5, hy + 2.5); g.lineTo(x + 3.5, hy + 2.5); g.closePath(); g.fill(); } break; // hazard slashes
    case 'rail': g.fillRect(hx + 2, hy + 1, hw - 6, 1.5); g.fillRect(hx + 2, hy + hh - 2.5, hw - 6, 1.5); g.beginPath(); g.moveTo(hx + hw - 9, hy + hh / 2 - 3); g.lineTo(hx + hw - 4, hy + hh / 2); g.lineTo(hx + hw - 9, hy + hh / 2 + 3); g.closePath(); g.fill(); break; // cyan side rails and a forward arrow
    case 'obus': for (const yy of [hy + 3, hy + hh - 6]) for (let k = 0; k < 3; k++) g.fillRect(hx + 3 + k * 4.4, yy, 3, 3); break; // yellow ammo-crate squares on the rear deck
  }
  g.globalAlpha = alpha;
}
function turretMarks(g, s, c, tr) {
  g.fillStyle = c.acc;
  switch (s.shape) {
    case 'twin': g.beginPath(); g.moveTo(tr * 0.62, 0); g.lineTo(tr * 0.15, -tr * 0.3); g.lineTo(tr * 0.15, tr * 0.3); g.closePath(); g.fill(); break;
    case 'long': // scope tube on the turret's right, orange lens
      g.fillStyle = '#1f1d19'; rrect(g, -tr * 0.3, tr * 0.5, tr * 1.3, tr * 0.46, 2); g.fill();
      g.fillStyle = c.acc; g.fillRect(tr * 0.82, tr * 0.56, 2.4, tr * 0.34); g.fillRect(-tr * 0.12, tr * 0.6, 2, tr * 0.26);
      break;
    case 'mg': g.fillRect(tr * 0.15, -tr * 0.12, tr * 0.5, tr * 0.24); break;
    case 'tri': g.lineWidth = 1.8; g.lineCap = 'round'; g.strokeStyle = c.acc; for (const a of [-0.55, 0, 0.55]) { g.beginPath(); g.moveTo(-tr * 0.1, 0); g.lineTo(-tr * 0.1 + Math.cos(a) * tr * 0.8, Math.sin(a) * tr * 0.8); g.stroke(); } break; // three prongs
    case 'duo': g.beginPath(); g.moveTo(tr * 0.7, 0); g.lineTo(tr * 0.2, -tr * 0.3); g.lineTo(tr * 0.2, tr * 0.3); g.closePath(); g.fill(); g.beginPath(); g.moveTo(-tr * 0.75, 0); g.lineTo(-tr * 0.25, -tr * 0.3); g.lineTo(-tr * 0.25, tr * 0.3); g.closePath(); g.fill(); break; // front and rear arrow
    case 'flame': g.beginPath(); g.arc(tr * 0.2, 0, tr * 0.38, 0, TAU); g.fill(); g.fillStyle = c.dk; g.beginPath(); g.arc(tr * 0.2, 0, tr * 0.18, 0, TAU); g.fill(); break; // fuel cap
    case 'bell': g.lineWidth = 2; g.strokeStyle = c.acc; g.beginPath(); g.arc(tr * 0.1, 0, tr * 0.42, 0, TAU); g.stroke(); g.fillRect(tr * 0.04, -tr * 0.1, tr * 0.12, tr * 0.2); break; // ring sight
    case 'rail': // power coil box on the turret: two cyan bars with a dark gap, plus a glowing node
      g.fillStyle = '#1f1d19'; rrect(g, -tr * 0.6, -tr * 0.46, tr * 1.25, tr * 0.92, 2); g.fill();
      g.fillStyle = c.acc; g.fillRect(-tr * 0.46, -tr * 0.34, tr * 0.38, tr * 0.68); g.fillRect(tr * 0.12, -tr * 0.34, tr * 0.38, tr * 0.68);
      break;
    case 'obus': // round hatch with a yellow ring
      g.fillStyle = '#1f1d19'; g.beginPath(); g.arc(-tr * 0.2, 0, tr * 0.55, 0, TAU); g.fill();
      g.strokeStyle = c.acc; g.lineWidth = 2; g.beginPath(); g.arc(-tr * 0.2, 0, tr * 0.38, 0, TAU); g.stroke();
      break;
    default: g.beginPath(); g.moveTo(tr * 0.6, 0); g.lineTo(tr * 0.05, -tr * 0.4); g.lineTo(tr * 0.05, tr * 0.4); g.closePath(); g.fill();
  }
}
const NO_UP = {};
function drawTank(t, alpha, g) {
  g = g || ctx;
  if (t.isBoss) { drawBoss(t, alpha, g); return; }
  const s = t.spec, c = s.col, L = s.len, W = s.wid, tw = s.tread, tr = s.tR, U = s.up || NO_UP;
  g.save(); g.translate(t.x, t.y); g.rotate(t.angle); g.globalAlpha = alpha;
  if (U.engine) { g.fillStyle = '#2b2823'; for (const yy of U.engine >= 3 ? [-5.5, 5.5] : [0]) { rrect(g, -L / 2 - 3.5, yy - 2.4, 6, 4.8, 1.5); g.fill(); } } // exhaust stacks
  g.fillStyle = '#1f1d19';
  rrect(g, -L / 2, -W / 2, L, tw, 3); g.fill();
  rrect(g, -L / 2, W / 2 - tw, L, tw, 3); g.fill();
  g.fillStyle = '#4b473e';
  const st = 5;
  let o = ((t.treadL % st) + st) % st;
  for (let x = -L / 2 + o; x < L / 2 - 1.5; x += st) g.fillRect(x, -W / 2 + 1.3, 1.7, tw - 2.6);
  o = ((t.treadR % st) + st) % st;
  for (let x = -L / 2 + o; x < L / 2 - 1.5; x += st) g.fillRect(x, W / 2 - tw + 1.3, 1.7, tw - 2.6);
  if (t.pt && t.pt.tread > 0) { // broken tread: a stretch of links is gone, the rest hangs loose
    const y0 = t.pt.side ? W / 2 - tw : -W / 2;
    g.fillStyle = 'rgba(8,6,4,.78)'; g.fillRect(-L * 0.3, y0 + 0.5, L * 0.46, tw - 1);
    g.fillStyle = '#4b473e'; for (let k = 0; k < 4; k++) g.fillRect(-L * 0.34 + k * 4.2, y0 + ((k * 5) % 3) + 0.6, 2.6, 1.7);
    g.strokeStyle = '#ffb04a'; g.lineWidth = 0.9; g.globalAlpha = alpha * (0.5 + 0.5 * Math.sin(G.time * 18)); g.beginPath(); g.moveTo(-L * 0.3, y0 + 1); g.lineTo(-L * 0.3, y0 + tw - 1); g.stroke(); g.globalAlpha = alpha;
  }
  const hx = -L / 2 + 2.5, hw = L - 5, hy = -W / 2 + tw - 2.5, hh = W - 2 * tw + 5;
  g.fillStyle = c.dk; rrect(g, hx, hy, hw, hh, 4); g.fill();
  g.fillStyle = c.body; rrect(g, hx + 1.5, hy + 1.5, hw - 3, hh - 3, 3); g.fill();
  g.globalAlpha = alpha * 0.75; g.fillStyle = c.hi; g.fillRect(hx + hw - 8.5, hy + 3, 4, hh - 6); g.globalAlpha = alpha;
  g.fillStyle = c.dk; for (let k = 0; k < 3; k++) g.fillRect(hx + 3.5 + k * 3.2, hy + 4, 1.6, hh - 8);
  if (t.type === 'player' && s.shape !== 'std') hullMarks(g, s, c, hx, hy, hw, hh, alpha);
  g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1.3; rrect(g, -L / 2, -W / 2, L, W, 4); g.stroke();
  if (U.armor) { // Zırh plakası: one skirt plate per level along each track, front first
    const sw = (L - 6) / 5, ph = tw * 0.8;
    for (let k = 0; k < U.armor; k++) {
      const x1 = L / 2 - 3 - k * sw, x0 = x1 - sw + 1.2;
      for (const y0 of [-W / 2 - 1.5, W / 2 + 1.5 - ph]) {
        g.fillStyle = c.dk; g.fillRect(x0, y0, x1 - x0, ph);
        g.fillStyle = 'rgba(255,255,255,.24)'; g.fillRect(x0, y0, x1 - x0, 1.2);
        g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect((x0 + x1) / 2 - 0.75, y0 + ph / 2 - 0.4, 1.5, 1.5);
      }
    }
  }
  if (U.repair) { // Onarım robotu: drone dock on the front deck
    const bx = L / 2 - 8.8, by = W / 2 - tw - 3.6;
    g.fillStyle = '#d9d3c1'; rrect(g, bx, by, 6.4, 6.4, 1.5); g.fill();
    g.fillStyle = '#3fa63c'; g.fillRect(bx + 2.5, by + 1, 1.4, 4.4); g.fillRect(bx + 1, by + 2.5, 4.4, 1.4);
  }
  let fl = t.flash > 0 ? Math.min(1, t.flash * 10) * 0.8 : 0;
  if (t.evoT > 0) fl = Math.max(fl, clamp(t.evoT / 0.7, 0, 1) * 0.9); // transformation flash
  if (fl) { g.globalAlpha = alpha * fl; g.fillStyle = '#fff'; rrect(g, -L / 2, -W / 2, L, W, 4); g.fill(); g.globalAlpha = alpha; }
  g.rotate(t.turret - t.angle);
  const rec = t.recoil * 4.5;
  if (s.muzzles) { // player tanks: one barrel per muzzle (the same list fireTank shoots from)
    const heat = s.tr && s.tr.heatUp ? (t.overheatT > 0 ? 1 : t.heat) : 0;
    if (s.shape === 'twin') { const o0 = s.muzzles[0].off; g.fillStyle = c.dk; g.fillRect(s.tR * 0.4 - rec, o0 - 1, 4.5, 2 - 2 * o0); } // bridge between the two barrels
    for (const mz of s.muzzles) { g.save(); g.translate(0, mz.off || 0); g.rotate(mz.ang || 0); barrel(s, rec, c, g, heat, mz.len); g.restore(); }
    if (heat > 0.3 && t.overheatT > 0 && fxScale === 1) { // overheated: additive glow on the muzzle
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = alpha * (0.5 + 0.35 * Math.sin(G.time * 20)); const gs = 30;
      for (const mz of s.muzzles) g.drawImage(SPR.fire, s.barrel - rec - gs / 2, (mz.off || 0) - gs / 2, gs, gs);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = alpha;
    }
  } else if (s.triple) { for (const a of [-0.2, 0.2, 0]) { g.save(); g.rotate(a); barrel(s, rec, c, g); g.restore(); } }
  else if (s.twin) { const off = s.twinOff || s.bW * 0.62; for (const yo of [-1, 1]) { g.save(); g.translate(0, yo * off); barrel(s, rec, c, g); g.restore(); } }
  else if (t.pt && t.pt.barrel > 0) { // jammed barrel: bent upward with a scorched tip
    g.save(); g.rotate(-0.2); barrel(s, rec, c, g); g.fillStyle = '#17110f'; g.fillRect(s.barrel - 7, -s.bW * 0.7, 7, s.bW * 1.4); g.restore();
  }
  else barrel(s, rec, c, g);
  if (t.type === 'boss' && t.chargeT > 0) { // Komutan telegraph: the three muzzles heat up over 0.45 s before the triple shot
    const k = clamp(t.chargeT / 0.45, 0, 1), tipX = s.barrel - rec;
    for (const a of [-0.2, 0, 0.2]) {
      const x = Math.cos(a) * tipX, y = Math.sin(a) * tipX;
      g.globalAlpha = alpha;
      g.fillStyle = `rgba(40,12,6,${(0.65 * k).toFixed(2)})`; g.beginPath(); g.arc(x, y, 4.5 + 3 * k, 0, TAU); g.fill(); // darker rim keeps the glow readable on bright sand and snow
      if (fxScale === 1) { // the additive halo is skipped with low effects; the hot dot below still shows the charge
        g.globalCompositeOperation = 'lighter'; const gs = 16 + 32 * k; g.globalAlpha = alpha * (0.35 + 0.65 * k);
        g.drawImage(SPR.fire, x - gs / 2, y - gs / 2, gs, gs);
        g.globalCompositeOperation = 'source-over';
      }
      g.globalAlpha = alpha * (0.5 + 0.5 * k);
      g.fillStyle = k < 1 ? '#f0782a' : '#fff4d0'; g.beginPath(); g.arc(x, y, 3 + 2.2 * k, 0, TAU); g.fill();
    }
    g.globalAlpha = alpha;
  }
  if (U.loader) { // Otomatik yükleyici: ammo drum behind the turret, one brass round per level
    g.fillStyle = '#2b2823'; rrect(g, -tr * 1.05 - 5, -tr * 0.62, 7, tr * 1.24, 2); g.fill();
    g.fillStyle = '#d8a94a'; for (let k = 0; k < Math.min(5, U.loader); k++) g.fillRect(-tr * 1.05 - 4.2, -tr * 0.5 + k * tr * 0.22, 3.2, tr * 0.12);
  }
  g.fillStyle = c.dk; rrect(g, -tr * 1.05 - 1.5, -tr * 0.9 - 1.5, tr * 1.95 + 3, tr * 1.8 + 3, tr * 0.55); g.fill();
  g.fillStyle = c.body; rrect(g, -tr * 1.05, -tr * 0.9, tr * 1.95, tr * 1.8, tr * 0.5); g.fill();
  g.globalAlpha = alpha * 0.5; g.fillStyle = c.hi; rrect(g, -tr * 0.85, -tr * 0.72, tr * 1.45, tr * 0.5, tr * 0.25); g.fill(); g.globalAlpha = alpha;
  g.fillStyle = c.dk; g.beginPath(); g.arc(-tr * 0.35, tr * 0.28, tr * 0.3, 0, TAU); g.fill();
  if (U.thermal) { g.fillStyle = '#1f1d19'; g.beginPath(); g.arc(tr * 0.2, -tr * 0.58, 2.7, 0, TAU); g.fill(); g.fillStyle = '#ff8a3d'; g.beginPath(); g.arc(tr * 0.2, -tr * 0.58, 1.5, 0, TAU); g.fill(); }
  if (U.magnet) { // Mıknatıs: whip antenna with a blinking tip
    const ax = -tr * 0.65, ay = tr * 0.55, tx = ax - 11 - U.magnet * 2, ty = ay + 5;
    g.strokeStyle = '#1f1d19'; g.lineWidth = 1.3; g.lineCap = 'round'; g.beginPath(); g.moveTo(ax, ay); g.lineTo(tx, ty); g.stroke();
    g.globalAlpha = alpha * (0.6 + 0.4 * Math.sin(G.time * 6)); g.fillStyle = '#3fe0c5'; g.beginPath(); g.arc(tx, ty, 1.8, 0, TAU); g.fill(); g.globalAlpha = alpha;
  }
  g.fillStyle = c.acc;
  if (t.type === 'player') turretMarks(g, s, c, tr);
  else if (s.smart) {
    // Avcı: spinning radar bar over the hatch and a blinking sensor light
    const ra = G.time * 5 + t.id, rl = tr * 0.55, hx2 = -tr * 0.35, hy2 = tr * 0.28;
    g.strokeStyle = c.acc; g.lineWidth = 1.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(hx2 - Math.cos(ra) * rl, hy2 - Math.sin(ra) * rl); g.lineTo(hx2 + Math.cos(ra) * rl, hy2 + Math.sin(ra) * rl); g.stroke();
    g.globalAlpha = alpha * (0.55 + 0.45 * Math.sin(G.time * 9 + t.id));
    g.beginPath(); g.arc(tr * 0.62, 0, tr * 0.22, 0, TAU); g.fill(); g.globalAlpha = alpha;
  }
  else g.fillRect(tr * 0.15, -tr * 0.12, tr * 0.5, tr * 0.24);
  if (fl) { g.globalAlpha = alpha * fl; g.fillStyle = '#fff'; rrect(g, -tr * 1.05, -tr * 0.9, tr * 1.95, tr * 1.8, tr * 0.5); g.fill(); }
  g.restore();
  if (t.pt) for (const k of ['tread', 'barrel', 'engine']) if (t.pt[k] > 0) { const q = partWorld(t, k); repairRing(g, q.x, q.y - 15, 1 - t.pt[k] / t.pt.dur[k], alpha); } // repair progress above the part
}
// a small ring that fills while a broken part is being repaired (normal enemies and boss treads)
function repairRing(g, x, y, k, alpha) {
  g.save(); g.globalAlpha = alpha; g.lineWidth = 2.6; g.strokeStyle = 'rgba(20,16,10,.7)'; g.beginPath(); g.arc(x, y, 5.5, 0, TAU); g.stroke();
  g.lineWidth = 2; g.strokeStyle = '#ffd24a'; g.beginPath(); g.arc(x, y, 5.5, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(k, 0.02, 1)); g.stroke();
  g.fillStyle = '#ffd24a'; g.fillRect(x - 0.9, y - 2.6, 1.8, 5.2); g.fillRect(x - 2.6, y - 0.9, 5.2, 1.8); g.restore();
}
// Dondurucu: an ice shell over every frozen tank, fading out in the last half second
function drawFrost(e) {
  const s = e.spec, a = clamp(G.buffs.freeze / 0.5, 0, 1), rng = mulberry32(e.id * 7919);
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.angle);
  ctx.globalAlpha = 0.58 * a; ctx.fillStyle = '#d6f3ff'; rrect(ctx, -s.len / 2 - 2, -s.wid / 2 - 2, s.len + 4, s.wid + 4, 6); ctx.fill();
  ctx.globalAlpha = 0.9 * a; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.globalAlpha = 0.75 * a; ctx.strokeStyle = '#7cc8ee'; ctx.lineWidth = 1.2; ctx.beginPath();
  for (let k = 0; k < 5; k++) { const x = (rng() - 0.5) * s.len * 0.8, y = (rng() - 0.5) * s.wid * 0.8, l = 3 + rng() * 4; ctx.moveTo(x - l, y - l * 0.6); ctx.lineTo(x + l, y + l * 0.6); }
  ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1;
}
// Termal kamera: heat outline of a tank hiding in a bush
function drawThermal(e) {
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45 + 0.1 * Math.sin(G.time * 5 + e.id);
  const gs = e.spec.len * 1.7; ctx.drawImage(SPR.fire, e.x - gs / 2, e.y - gs / 2, gs, gs);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  drawTank(e, 0.5);
}
