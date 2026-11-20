function drawStrikes() {
  if (!G.strikes.length) return;
  const blink = ((G.time * 12) | 0) % 2;
  ctx.strokeStyle = '#ff5a4a'; ctx.lineCap = 'butt';
  for (const q of G.strikes) {
    if (q.t < 0) continue;
    const k = clamp(q.t / q.dur, 0, 1), r = 30 - 15 * k;
    ctx.globalAlpha = 0.55 + 0.4 * blink; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, TAU);
    ctx.moveTo(q.x - r - 8, q.y); ctx.lineTo(q.x - r + 6, q.y); ctx.moveTo(q.x + r - 6, q.y); ctx.lineTo(q.x + r + 8, q.y);
    ctx.moveTo(q.x, q.y - r - 8); ctx.lineTo(q.x, q.y - r + 6); ctx.moveTo(q.x, q.y + r - 6); ctx.lineTo(q.x, q.y + r + 8);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function drawJet() {
  const j = G.jet; if (!j) return;
  const span = Math.max(view.x1 - view.x0, view.y1 - view.y0) * 0.75 + 220, d = -span + 2 * span * (j.t / j.dur);
  ctx.save(); ctx.translate(j.x + Math.cos(j.a) * d + 36, j.y + Math.sin(j.a) * d + 54); ctx.rotate(j.a); ctx.scale(1.7, 1.7);
  ctx.globalAlpha = 0.3; ctx.fillStyle = '#000'; ctx.fill(JET_PATH);
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawBushes(c0, c1, r0, r1) {
  const m = G.map, th = m.theme, list = [];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (m.t[r * m.n + c] === BUSH) list.push(c, r);
  if (!list.length) return;
  ctx.fillStyle = th.shadow; ctx.beginPath();
  for (let i = 0; i < list.length; i += 2) rrectPath(ctx, list[i] * T + 6, list[i + 1] * T + 9, T, T, 16);
  ctx.fill();
  for (let i = 0; i < list.length; i += 2) bush(list[i], list[i + 1], th);
}
function bush(c, r, th) {
  const x = c * T, y = r * T, rng = mulberry32(seedOf(c, r, 99)), sw = Math.sin(G.time * 1.6 + c * 0.9 + r * 1.3) * 1.2;
  ctx.fillStyle = th.bushDk; ctx.beginPath(); rrectPath(ctx, x - 1, y - 1, T + 2, T + 2, 15);
  for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + rng() * 0.8, rr = 10 + rng() * 6, px = x + T / 2 + Math.cos(a) * T * 0.36 + sw * 0.4, py = y + T / 2 + Math.sin(a) * T * 0.36; ctx.moveTo(px + rr, py); ctx.arc(px, py, rr, 0, TAU); }
  ctx.fill();
  ctx.fillStyle = th.bush; ctx.beginPath();
  for (let k = 0; k < 5; k++) { const px = x + 9 + rng() * (T - 18) + sw, py = y + 7 + rng() * (T - 18), rr = 7 + rng() * 5; ctx.moveTo(px + rr, py); ctx.arc(px, py, rr, 0, TAU); }
  ctx.fill();
  ctx.fillStyle = th.bushHi; ctx.beginPath();
  for (let k = 0; k < 5; k++) { const px = x + 8 + rng() * (T - 16) + sw * 1.4, py = y + 5 + rng() * (T - 18), rr = 1.6 + rng() * 2.4; ctx.moveTo(px + rr, py); ctx.arc(px, py, rr, 0, TAU); }
  ctx.fill();
}
// Tank-specific effects drawn under the shells (world space)
function drawTankFx() {
  const p = G.player;
  burnFx(); // D1: burning enemies glow
  for (const e of G.enemies) { // Ikiz stun: a spinning ring of sparks over the tank
    if (!(e.stunT > 0) || e.dead || !onScreen(e.x, e.y, 60)) continue;
    const a0 = G.time * 9 + e.id, r = e.r + 5;
    ctx.fillStyle = '#ffe27a'; ctx.strokeStyle = 'rgba(40,28,6,.8)'; ctx.lineWidth = 1;
    for (let k = 0; k < 4; k++) { const a = a0 + k * TAU / 4; ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r * 0.8 - 6, 2.6, 0, TAU); ctx.fill(); ctx.stroke(); }
  }
  if (!p || !p.alive) return;
  if (p.evoT > 0) { // transformation: a white ring spreading from the tank
    const k = 1 - p.evoT / 0.7, r = 18 + 70 * k;
    ctx.globalAlpha = (1 - k) * 0.9; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3 * (1 - k) + 1; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
  }
  if (G.phase !== 'fight') return;
  switch (G.tank) {
    case 'alev': flameFx(p); break; // D1: flame cone
    case 'rayli': TT_rayli.fx(p); break;
    case 'obus': TT_obus.fx(p); break;
    default: break;
  }
}
function drawShield(p) {
  const t = G.buffs.shield > 0 ? G.buffs.shield : 9; if (t < 1.6 && ((t * 10) | 0) % 2 === 0) return; // 9: the 1 s transformation shield does not blink
  const r = p.r + 10 + Math.sin(G.time * 8) * 1.2;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45; ctx.drawImage(SPR.blue, p.x - r * 1.5, p.y - r * 1.5, r * 3, r * 3);
  ctx.globalCompositeOperation = 'source-over';
  ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU);
  ctx.globalAlpha = 0.22; ctx.fillStyle = '#5fb4dd'; ctx.fill();
  ctx.globalAlpha = 0.9; ctx.strokeStyle = '#a6defa'; ctx.lineWidth = 2; ctx.stroke();
  ctx.globalAlpha = 1;
}
function drawPips() {
  const thermal = upL('thermal') > 0;
  for (const e of G.enemies) {
    if ((e.hidden && !thermal) || e.type === 'boss' || e.maxHp < 2 || e.hp >= e.maxHp || !onScreen(e.x, e.y, 40)) continue;
    const n = Math.ceil(e.maxHp), w = n > 7 ? 4 : 6, gap = 2, tot = n * w + (n - 1) * gap, x = e.x - tot / 2, y = e.y - e.spec.wid / 2 - 11;
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x - 2, y - 2, tot + 4, 7);
    for (let k = 0; k < n; k++) {
      const f = clamp(e.hp - k, 0, 1), px = x + k * (w + gap);
      ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(px, y, w, 3);
      if (f > 0) { ctx.fillStyle = '#e0533a'; ctx.fillRect(px, y, w * f, 3); }
    }
  }
}
const LOOK = {
  player: { trail: 'rgba(255,232,150,.55)', core: '#fff4cf', glow: 'flash' },
  enemy: { trail: 'rgba(255,128,80,.55)', core: '#ffd0b0', glow: 'fire' },
  pierce: { trail: 'rgba(255,111,174,.62)', core: '#ffe2ef', glow: 'pu_pierce' },
  blast: { trail: 'rgba(255,150,70,.62)', core: '#ffd08a', glow: 'fire' },
  bounce: { trail: 'rgba(160,215,255,.62)', core: '#e9f6ff', glow: 'blue' },
  rail: { trail: 'rgba(126,240,255,.7)', core: '#f2feff', glow: 'blue' }
};
function drawBullets() {
  if (!G.bullets.length) return;
  ctx.lineCap = 'round';
  for (const b of G.bullets) {
    if (b.lob) continue;
    const lk = LOOK[b.look] || LOOK.player, sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp, uy = b.vy / sp, tl = b.big ? 22 : 16;
    ctx.strokeStyle = lk.trail; ctx.lineWidth = b.r * 1.5;
    ctx.beginPath(); ctx.moveTo(b.x - ux * tl, b.y - uy * tl); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6;
  for (const b of G.bullets) { if (b.lob) continue; const gs = b.r * 6; ctx.drawImage(SPR[(LOOK[b.look] || LOOK.player).glow], b.x - gs / 2, b.y - gs / 2, gs, gs); }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,.45)';
  for (const b of G.bullets) { if (b.lob) continue; ctx.fillStyle = (LOOK[b.look] || LOOK.player).core; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); ctx.stroke(); }
  for (const b of G.bullets) if (b.lob) TT_obus.draw(b);
}
// Avcı's aiming light: a dashed mint line that brightens just before it fires, so the player gets a moment to react
function drawLocks() {
  const m = G.map;
  for (const e of G.enemies) {
    if (!e.lock || e.dead || !onScreen(e.x, e.y, 80)) continue;
    const s = e.spec, ca = Math.cos(e.turret), sa = Math.sin(e.turret);
    const x0 = e.x + ca * (s.barrel + 2), y0 = e.y + sa * (s.barrel + 2);
    let len = 0;
    while (len < T * 9) { len += 8; if (isWall(m.at(x0 + ca * len, y0 + sa * len))) break; }
    const k = clamp(1 - e.cool / 0.45, 0, 1);
    ctx.globalAlpha = 0.3 + 0.55 * k; ctx.strokeStyle = '#7ef0d0'; ctx.lineWidth = 1.2 + k; ctx.lineCap = 'butt';
    ctx.setLineDash([7, 5]); ctx.lineDashOffset = -G.time * 30;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + ca * len, y0 + sa * len); ctx.stroke();
  }
  ctx.setLineDash([]); ctx.globalAlpha = 1;
}
function drawPickup(k) {
  const P = PU[k.kind], blink = k.life < 3 && ((k.life * 8) | 0) % 2 === 0, a = blink ? 0.35 : 1, bob = Math.sin(k.t * 4 + k.seed) * 2;
  ctx.save(); ctx.translate(k.x, k.y);
  ctx.globalAlpha = a * 0.8; ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(3, 8, 13, 8, 0, 0, TAU); ctx.fill();
  ctx.translate(0, bob - 3);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.55; const gs = 56 + Math.sin(k.t * 5) * 6; ctx.drawImage(P.glow, -gs / 2, -gs / 2, gs, gs);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a;
  ctx.fillStyle = '#1d2015'; ctx.beginPath(); ctx.arc(0, 0, 13.5, 0, TAU); ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = P.col; ctx.stroke();
  if (ICONS[k.kind].stroke) { ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(ICON_PATHS[k.kind]); }
  else { ctx.fillStyle = P.col; ctx.fill(ICON_PATHS[k.kind]); }
  ctx.restore();
}
function drawParticles() {
  const dust = G.map.dust;
  for (const q of parts) {
    const k = q.life / q.max;
    if (q.k === 'smoke') { const a = Math.sin(Math.PI * (1 - k)) * 0.9; if (a > 0.01) { ctx.globalAlpha = a; ctx.drawImage(SPR.smoke, q.x - q.size / 2, q.y - q.size / 2, q.size, q.size); } }
    else if (q.k === 'dust') { ctx.globalAlpha = k * 0.8; ctx.drawImage(dust, q.x - q.size / 2, q.y - q.size / 2, q.size, q.size); }
    else if (q.k === 'debris') { ctx.globalAlpha = Math.min(1, k * 2.5); ctx.fillStyle = q.col; ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillRect(-q.size / 2, -q.size / 3, q.size, q.size * 0.66); ctx.restore(); }
    else if (q.k === 'ring') { ctx.globalAlpha = 1; ctx.strokeStyle = `rgba(${q.col},${(k * 0.9).toFixed(3)})`; ctx.lineWidth = 1 + 3 * k; ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(0.5, q.size), 0, TAU); ctx.stroke(); }
  }
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const q of parts) {
    const k = q.life / q.max;
    if (q.k === 'fire') { ctx.globalAlpha = Math.pow(k, 0.7); ctx.drawImage(SPR.fire, q.x - q.size / 2, q.y - q.size / 2, q.size, q.size); }
    else if (q.k === 'flash') { ctx.globalAlpha = k; ctx.drawImage(SPR.flash, q.x - q.size / 2, q.y - q.size / 2, q.size, q.size); }
    else if (q.k === 'glow') { ctx.globalAlpha = k; ctx.drawImage(SPR[q.col] || SPR.flash, q.x - q.size / 2, q.y - q.size / 2, q.size, q.size); }
    else if (q.k === 'spark') { ctx.globalAlpha = k; ctx.strokeStyle = q.col; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.03, q.y - q.vy * 0.03); ctx.stroke(); }
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}
function drawTexts() {
  if (!G.texts.length) return;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  for (const q of G.texts) {
    ctx.globalAlpha = clamp(q.life / q.max * 2.2, 0, 1);
    ctx.font = `700 ${q.size}px ${UI_FONT}`;
    ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(20,22,14,.85)'; ctx.strokeText(q.s, q.x, q.y);
    ctx.fillStyle = q.col; ctx.fillText(q.s, q.x, q.y);
  }
  ctx.globalAlpha = 1;
}
function drawIndicators() {
  const p = G.player; if (!p) return;
  const cx = view.w / 2, cy = view.h / 2, L = view.sl + 16, R = view.w - view.sr - 16, B = view.h - view.sb - 16;
  const ray = (dx, dy, top) => {
    let t = Infinity;
    if (dx > 0) t = Math.min(t, (R - cx) / dx); else if (dx < 0) t = Math.min(t, (L - cx) / dx);
    if (dy > 0) t = Math.min(t, (B - cy) / dy); else if (dy < 0) t = Math.min(t, (top - cy) / dy);
    return t;
  };
  const thermal = upL('thermal') > 0;
  for (const e of G.enemies) {
    if ((e.hidden && !thermal) || e.dead) continue;
    const sx = (e.x - cam.x) * view.scale + cx, sy = (e.y - cam.y) * view.scale + cy;
    if (sx > 0 && sx < view.w && sy > 0 && sy < view.h) continue;
    const dx = sx - cx, dy = sy - cy;
    let t = ray(dx, dy, view.st + 14);
    if (!isFinite(t) || t <= 0) continue;
    let ix = cx + dx * t, iy = cy + dy * t;
    for (const h of view.hudRects) if (ix > h.l && ix < h.r && iy > h.t && iy < h.b) { t = ray(dx, dy, h.b); ix = cx + dx * t; iy = cy + dy * t; }
    const d = Math.hypot(e.x - p.x, e.y - p.y), big = e.type === 'boss' ? 1.5 : 1;
    ctx.globalAlpha = clamp(1.25 - d / (T * 16), 0.4, 1);
    ctx.save(); ctx.translate(ix, iy); ctx.rotate(Math.atan2(dy, dx)); ctx.scale(big, big);
    ctx.fillStyle = '#e0533a'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -8); ctx.lineTo(-2.5, 0); ctx.lineTo(-6, 8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function crosshairShown() {
  const p = G.player;
  return !input.touch && input.mouseAim && G.state === 'play' && G.phase !== 'upgrade' && !!p && p.alive && mouse.x >= 0 && !dbg.clean;
}
// The system cursor is hidden only while the crosshair stands in for it, so the mouse never disappears
// (pause, game over, menu, or keyboard-only driving after the mouse goes idle).
function syncAimCursor() {
  const on = crosshairShown();
  if (canvas.classList.contains('aim') !== on) canvas.classList.toggle('aim', on);
}
const XH_HALO = 'rgba(14,16,10,.66)', XH_LIGHT = 'rgba(239,231,210,.96)';
function drawCrosshair() {
  if (!crosshairShown()) return;
  const p = G.player, x = mouse.x, y = mouse.y;
  // a dark halo under the light lines keeps the crosshair readable on snow and sand as well as grass and asphalt
  ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU);
  ctx.moveTo(x - 16, y); ctx.lineTo(x - 5, y); ctx.moveTo(x + 5, y); ctx.lineTo(x + 16, y);
  ctx.moveTo(x, y - 16); ctx.lineTo(x, y - 5); ctx.moveTo(x, y + 5); ctx.lineTo(x, y + 16);
  ctx.lineCap = 'round'; ctx.strokeStyle = XH_HALO; ctx.lineWidth = 4.4; ctx.stroke();
  ctx.lineCap = 'butt'; ctx.strokeStyle = XH_LIGHT; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, 2.5, 0, TAU); ctx.fillStyle = XH_HALO; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, 1.3, 0, TAU); ctx.fillStyle = XH_LIGHT; ctx.fill();
  const cd = p.spec.cool * (G.buffs.rapid > 0 ? 0.5 : 1), k = clamp(1 - p.cool / cd, 0, 1);
  if (k < 1) {
    ctx.beginPath(); ctx.arc(x, y, 13, -Math.PI / 2, -Math.PI / 2 + TAU * k);
    ctx.lineCap = 'round'; ctx.strokeStyle = XH_HALO; ctx.lineWidth = 5.2; ctx.stroke();
    ctx.lineCap = 'butt'; ctx.strokeStyle = 'rgba(242,193,78,.98)'; ctx.lineWidth = 2.5; ctx.stroke();
  }
}
function stickVis(st, gx, gy, isAim, label) {
  const R = STICK_R, active = st.id !== null, ox = active ? st.ox : gx, oy = active ? st.oy : gy;
  ctx.globalAlpha = active ? 1 : 0.6;
  ctx.beginPath(); ctx.arc(ox, oy, R, 0, TAU); ctx.fillStyle = 'rgba(16,18,10,.22)'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = active ? 'rgba(239,231,210,.5)' : 'rgba(239,231,210,.25)'; ctx.stroke();
  const kx = ox + (active ? st.vx * R : 0), ky = oy + (active ? st.vy * R : 0), firing = active && Math.hypot(st.vx, st.vy) > 0.32;
  ctx.beginPath(); ctx.arc(kx, ky, R * 0.43, 0, TAU);
  ctx.fillStyle = isAim ? (firing ? 'rgba(242,193,78,.8)' : 'rgba(242,193,78,.38)') : (active ? 'rgba(95,180,221,.6)' : 'rgba(95,180,221,.38)');
  ctx.fill();
  if (!active) {
    ctx.globalAlpha = 0.9; ctx.font = `600 14px ${UI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 3.6; ctx.strokeStyle = XH_HALO; ctx.strokeText(label, ox, oy + R + 14); // dark halo like the crosshair: readable on sand, snow and steel crates
    ctx.fillStyle = '#f6f0de'; ctx.fillText(label, ox, oy + R + 14);
  }
  ctx.globalAlpha = 1;
}
function drawSticks() {
  if (!input.touch || G.state !== 'play' || G.phase === 'upgrade' || !G.player || !G.player.alive) return;
  const R = STICK_R, y = view.h - view.sb - R - 56, lx = view.sl + R + 40, rx = view.w - view.sr - R - 40;
  stickVis(sticks.move, SET.swapSticks ? rx : lx, y, false, 'Sür');
  stickVis(sticks.aim, SET.swapSticks ? lx : rx, y, true, 'Nişan al');
}
function drawVignette() {
  const p = G.player; if (!p) return;
  let a = G.hurt > 0 ? G.hurt * 1.1 : 0;
  if (p.alive && p.hp <= p.maxHp * 0.3 && G.phase !== 'upgrade') a = Math.max(a, 0.2 + Math.sin(G.time * 6) * 0.08);
  if (a <= 0.01) return;
  const gr = ctx.createRadialGradient(view.w / 2, view.h / 2, Math.min(view.w, view.h) * 0.32, view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.72);
  gr.addColorStop(0, 'rgba(200,30,20,0)'); gr.addColorStop(1, `rgba(200,30,20,${clamp(a, 0, 0.55).toFixed(3)})`);
  ctx.fillStyle = gr; ctx.fillRect(0, 0, view.w, view.h);
}
function drawMenuHint() {
  const p = G.player; if (!p || menu.hintA <= 0) return;
  const sx = (p.x - cam.x) * view.scale + view.w / 2, sy = (p.y - cam.y) * view.scale + view.h / 2 + p.spec.wid * view.scale * 0.5 + 26;
  const txt = input.touch ? 'Arenaya dokun, ateş et' : 'Tıkla, ateş et';
  ctx.font = `600 16px ${UI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(txt).width + 24;
  ctx.globalAlpha = menu.hintA * (0.78 + 0.22 * Math.sin(G.time * 3));
  ctx.fillStyle = 'rgba(38,42,29,.86)'; rrect(ctx, sx - w / 2, sy - 14, w, 28, 3); ctx.fill();
  ctx.fillStyle = '#efe7d2'; ctx.fillText(txt, sx, sy + 1);
  ctx.globalAlpha = 1;
}
function drawMini() {
  const m = G.map; if (!m || !m.mini || !SET.minimap) return;
  const W = miniCv.width; if (!W) return;
  const g = mctx, d = view.dpr, k = W / m.w;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, W);
  g.imageSmoothingEnabled = false; g.globalAlpha = 0.92; g.drawImage(m.mini, 0, 0, W, W); g.globalAlpha = 1;
  g.strokeStyle = 'rgba(239,231,210,.75)'; g.lineWidth = d;
  g.strokeRect(view.x0 * k, view.y0 * k, (view.x1 - view.x0) * k, (view.y1 - view.y0) * k);
  for (const q of G.pickups) { g.fillStyle = PU[q.kind].col; g.fillRect(q.x * k - 1.5 * d, q.y * k - 1.5 * d, 3 * d, 3 * d); }
  g.strokeStyle = 'rgba(224,83,58,.9)'; g.lineWidth = 1.2 * d;
  for (const q of G.portals) { g.beginPath(); g.arc(q.x * k, q.y * k, (2 + 2 * Math.sin(G.time * 10)) * d + 2 * d, 0, TAU); g.stroke(); }
  const thermal = upL('thermal') > 0;
  for (const e of G.enemies) if (!e.hidden || thermal) {
    g.fillStyle = e.spec.smart ? '#c9a2ff' : '#ff5a3c';
    g.beginPath(); g.arc(e.x * k, e.y * k, (e.type === 'boss' ? 3.4 : 2.3) * d, 0, TAU); g.fill();
  }
  const p = G.player;
  if (p && p.alive) { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(p.x * k, p.y * k, 2.8 * d, 0, TAU); g.fill(); g.strokeStyle = '#5fb4dd'; g.lineWidth = 1.5 * d; g.stroke(); }
}

