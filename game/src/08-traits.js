/* ===== TANK TRAITS ===== */
// Owner: package A (tank traits); D1/D2 append. Every tank-specific spot is a `switch` marked `// D1:` (Uclu, Cift, Alev, Sarapnel) or `// D2:` (Rayli, Obus)
// that adds case lines; D1/D2 keep their code in named sub-blocks (`/* -- obus -- */`).
const TT = {
  // Called first by fireTank for every shot. true = the trait handled the shot itself (lob / flame), false = continue the normal fire path
  fire(t, ctx) {
    if (!ctx.isP) return false;
    const s = ctx.s, tr = s.tr;
    if (tr && tr.heatUp) { // Makineli: every shot heats the barrel; at 1 it overheats and the gun is locked for tr.cd seconds
      t.heat = Math.min(1, t.heat + tr.heatUp);
      if (t.heat >= 1) { t.overheatT = tr.cd; Sound.metal(1); }
    }
    switch (s.mode) {
      case 'lob': return TT_obus.fire(t, ctx);
      case 'flame': return true; // D1: Alev Topu: the cone is ticked in playerTick, no shells
      default: return false;
    }
  },
  // Cooldown multiplier for the next shot (Makineli: heat raises the fire rate)
  coolK(p) { const tr = p.spec.tr; return tr && tr.rateGain ? 1 / (1 + tr.rateGain * p.heat) : 1; },
  // True while the gun may not fire (Makineli overheat)
  locked(p) { return p.overheatT > 0; },
  // Once per frame for the player while the world runs. firing = the fire input is held
  playerTick(p, dt, firing) {
    const s = p.spec, tr = s.tr;
    if (tr && tr.heatUp) {
      if (p.overheatT > 0) {
        p.overheatT -= dt; p.smkT -= dt;
        if (p.smkT <= 0) { p.smkT = fxScale === 1 ? 0.07 : 0.16; const ml = s.barrel + 2; addPart('smoke', p.x + Math.cos(p.turret) * ml, p.y + Math.sin(p.turret) * ml, rand(-14, 14), rand(-30, -12), rand(0.5, 0.9), rand(7, 11), 24, 2); }
        if (p.overheatT <= 0) { p.overheatT = 0; p.heat = 0.25; }
      } else if (!firing && p.heat > 0) p.heat = Math.max(0, p.heat - tr.heatDown * dt);
    }
    if (p.pushT > 0) p.pushT = Math.max(0, p.pushT - dt);
    if (p.shield1T > 0 && G.phase === 'fight') p.shield1T = Math.max(0, p.shield1T - dt); // the transformation shield runs while enemies can shoot
    switch (s.tankId) {
      case 'alev': flameTick(p, dt, firing); break; // D1
      case 'cift': ciftTick(p, dt); break; // D1
    }
  },
  // While the workshop freezes the world: only the transformation flash runs
  frozenTick(rdt) { const p = G.player; if (p && p.evoT > 0) p.evoT = Math.max(0, p.evoT - rdt); },
  // Called by updateBullets before a shell moves. true = the trait moved the shell itself (lob shells skip walls and tanks while they fly)
  bulletStep(b, dt) {
    if (!b.lob) return false;
    const L = b.lob; L.t += dt;
    const k = Math.min(1, L.t / L.T);
    b.x = L.sx + (L.tx - L.sx) * k; b.y = L.sy + (L.ty - L.sy) * k; b.h = Math.sin(k * Math.PI); // b.h: arc height 0..1 for drawing
    b.dist = Math.hypot(b.x - L.sx, b.y - L.sy);
    if (k >= 1) {
      b.dead = true;
      switch (L.kind) {
        case 'obus': TT_obus.land(b, L); break;
        default: break;
      }
    }
    return true;
  },
  // A player shell hit enemy tank e (before the shell is marked dead and the damage applied)
  bulletHit(b, e) {
    const s = G.player && G.player.spec, tr = s && s.tr;
    if (tr && tr.stun && b.volN > 1 && b.vol) { // Ikiz: two shells of one volley hitting the same tank within tr.win stun it
      if (e.lastVol === b.vol && G.time - e.lastVolT <= tr.win && G.time >= (e.stunReadyT || 0)) { // stunReadyT: a stunned tank is not stunned again at once (tr.stunCd)
        e.stunT = tr.stun; e.lastVol = 0; e.stunReadyT = G.time + tr.stun + (tr.stunCd || 0);
        for (let k = 0; k < 7; k++) { const a = rand(0, TAU); addPart('spark', e.x, e.y, Math.cos(a) * 140, Math.sin(a) * 140, rand(0.25, 0.4), 1, 0, 3, '#ffe27a'); }
        addPart('ring', e.x, e.y, 0, 0, 0.3, 10, 90, 0, '255,226,122');
        addText(e.x, e.y - 30, 'Sersem', '#ffe27a', 14);
      } else { e.lastVol = b.vol; e.lastVolT = G.time; }
    }
    switch (s && s.tankId) {
      case 'sarapnel': sarapnelHit(b, e); break; // D1
      default: break;
    }
  }
};
/* -- uclu -- */
// Üçlü needs no code of its own: the three muzzles and the middle one's pierceN are data (TANKS.uclu); updateBullets handles b.pn.
/* -- cift -- */
// Çift Yön: every volley (p.volId changes) pushes the tank forward for tr.push seconds: speed x(1 + pushK) in updatePlayer plus a small impulse along the hull
function ciftTick(p, dt) {
  const tr = p.spec.tr;
  if (p.pv === undefined || p.volId < p.pv) p.pv = p.volId;
  if (p.volId !== p.pv) {
    p.pv = p.volId; p.pushT = tr.push;
    p.vx += Math.cos(p.angle) * tr.impulse; p.vy += Math.sin(p.angle) * tr.impulse;
    if (fxScale === 1) addPart('dust', p.x - Math.cos(p.angle) * 22, p.y - Math.sin(p.angle) * 22, -Math.cos(p.angle) * 40 + rand(-12, 12), -Math.sin(p.angle) * 40 + rand(-12, 12), rand(0.3, 0.5), rand(7, 11), 20, 2);
  }
}
const pushK = p => (p.pushT > 0 && p.spec.tr && p.spec.tr.pushK ? 1 + p.spec.tr.pushK * Math.min(1, p.pushT / p.spec.tr.push) : 1); // speed factor while a Çift Yön volley pushes
/* -- alev -- */
// Alev Topu: a flame cone, not shells. Enemies in the cone with a clear line take dps * direct quietly and burn for tr.burn s (burnDps = dps * burnK; tickStatus ticks it);
// enemy shells in the cone are destroyed; the Komutan burns at tr.bossK. Particle budget: 4 per frame (1 with low effects).
function inCone(ox, oy, a, R, half, x, y, r) {
  const dx = x - ox, dy = y - oy, d = Math.hypot(dx, dy);
  if (d - r > R) return false;
  if (d < r + 4) return true;
  return Math.abs(angDiff(a, Math.atan2(dy, dx))) <= half + Math.atan2(r * 0.7, d);
}
function flameTick(p, dt, firing) {
  const s = p.spec, tr = s.tr;
  p.flameOn = !!firing;
  if (!firing) { p.flameShotT = 0; p.flameSnd = 0; return; }
  p.lastShot = G.time;
  const a = p.turret, ca = Math.cos(a), sa = Math.sin(a), ox = p.x + ca * s.barrel * 0.7, oy = p.y + sa * s.barrel * 0.7;
  const dps = s.dps * (G.buffs.rapid > 0 ? 2 : 1);
  let touched = 0;
  for (const e of G.enemies) {
    if (e.dead || !inCone(ox, oy, a, tr.range, tr.half, e.x, e.y, e.r) || !los(p.x, p.y, e.x, e.y)) continue;
    touched++;
    const k = e.type === 'boss' ? tr.bossK : 1, fl = e.flash;
    hurtEnemy(e, dps * tr.direct * k * dt, e.x, e.y, 0, true);
    if (e.dead) continue;
    e.flash = fl; // no white flash every frame; the burn ticks flash it a little
    e.burnT = tr.burn; e.burnDps = dps * tr.burnK * k;
  }
  for (const b of G.bullets) { // enemy shells burn up in the flame
    if (b.dead || b.owner !== 1 || !inCone(ox, oy, a, tr.range, tr.half, b.x, b.y, b.r)) continue;
    b.dead = true; sparks(b.x, b.y, 4, '#ffb04a', 150);
  }
  p.flameShotT = (p.flameShotT || 0) - dt; if (p.flameShotT <= 0) { p.flameShotT = 0.25; G.shots++; if (touched || p.flameHit) G.hits++; p.flameHit = false; } // accuracy stays <= 100%: one shot per 0.25 s
  if (touched) p.flameHit = true;
  p.flameSnd = (p.flameSnd || 0) - dt; if (p.flameSnd <= 0) { p.flameSnd = 0.11; Sound.flame(); }
  const n = fxScale === 1 ? 4 : 1;
  for (let i = 0; i < n; i++) {
    const aa = a + rand(-tr.half, tr.half) * 0.9, v = rand(380, 500);
    addPart('fire', ox, oy, Math.cos(aa) * v, Math.sin(aa) * v, rand(0.22, 0.34), rand(9, 15), 22, 1.5);
  }
}
// Flame cone outline under the shells, and a glow on every burning enemy
function flameFx(p) {
  const tr = p.spec.tr;
  if (!p.flameOn) return;
  const a = p.turret, ox = p.x + Math.cos(a) * p.spec.barrel * 0.7, oy = p.y + Math.sin(a) * p.spec.barrel * 0.7;
  ctx.globalAlpha = fxScale === 1 ? 0.13 : 0.1; ctx.fillStyle = '#ff9a30';
  ctx.beginPath(); ctx.moveTo(ox, oy); ctx.arc(ox, oy, tr.range, a - tr.half, a + tr.half); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
}
function burnFx() {
  for (const e of G.enemies) {
    if (!(e.burnT > 0) || e.dead || !onScreen(e.x, e.y, 60)) continue;
    const f = 0.5 + 0.5 * Math.sin(G.time * 17 + e.id * 2), gs = e.r * 2.4;
    if (fxScale === 1) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.28 + 0.22 * f; ctx.drawImage(SPR.fire, e.x - gs / 2, e.y - gs / 2, gs, gs); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    else { ctx.globalAlpha = 0.3 + 0.2 * f; ctx.fillStyle = '#ff8a30'; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 0.8, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  }
}
/* -- sarapnel -- */
// Şarapnel: a pellet that hits a tank within tr.kbRange px of the muzzle shoves it along the pellet's path (impulse tr.kb / mass, capped at tr.kbMax / mass); tickStatus moves it
function sarapnelHit(b, e) {
  const tr = G.player.spec.tr;
  if (!tr || !tr.kb || b.dist > tr.kbRange) return;
  const sp = Math.hypot(b.vx, b.vy) || 1, m = e.spec.mass || 1;
  e.kvx += b.vx / sp * tr.kb / m; e.kvy += b.vy / sp * tr.kb / m;
  const v = Math.hypot(e.kvx, e.kvy), cap = tr.kbMax / m; if (v > cap) { e.kvx *= cap / v; e.kvy *= cap / v; }
}
/* -- rayli -- */
// Rayli Top (D2): a fast shell with pierce (fireTank sets it from tr.pierce; steel stops it unless Sekme is owned, see updateBullets) and a laser line showing its path
const TT_rayli = {
  // DDA over the tile grid from (x0, y0) along angle a: the first steel tile (or the world edge, which the map reports as steel) ends the line. Bricks and tanks do not.
  laser(x0, y0, a, maxLen) {
    const m = G.map, dx = Math.cos(a), dy = Math.sin(a), lim = maxLen || 4000;
    let c = Math.floor(x0 / T), r = Math.floor(y0 / T);
    if (m.get(c, r) === STEEL) return { x: x0, y: y0, steel: true, len: 0 };
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, tDx = dx !== 0 ? Math.abs(T / dx) : Infinity, tDy = dy !== 0 ? Math.abs(T / dy) : Infinity;
    let tMx = dx > 0 ? ((c + 1) * T - x0) / dx : dx < 0 ? (c * T - x0) / dx : Infinity, tMy = dy > 0 ? ((r + 1) * T - y0) / dy : dy < 0 ? (r * T - y0) / dy : Infinity;
    for (let i = 0; i < 400; i++) {
      let t;
      if (tMx < tMy) { t = tMx; tMx += tDx; c += sx; } else { t = tMy; tMy += tDy; r += sy; }
      if (t >= lim) return { x: x0 + dx * lim, y: y0 + dy * lim, steel: false, len: lim };
      if (m.get(c, r) === STEEL) return { x: x0 + dx * t, y: y0 + dy * t, steel: true, len: t };
    }
    return { x: x0 + dx * lim, y: y0 + dy * lim, steel: false, len: lim };
  },
  fx(p) {
    const s = p.spec, ca = Math.cos(p.turret), sa = Math.sin(p.turret), x0 = p.x + ca * (s.barrel + 1), y0 = p.y + sa * (s.barrel + 1);
    const L = this.laser(x0, y0, p.turret), pulse = 0.78 + 0.22 * Math.sin(G.time * 14);
    ctx.lineCap = 'butt';
    ctx.strokeStyle = 'rgba(10,28,52,.38)'; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(L.x, L.y); ctx.stroke(); // dark rim: reads on sand and snow
    if (fxScale === 1) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.16 * pulse; ctx.strokeStyle = '#7ef0ff'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(L.x, L.y); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; }
    ctx.globalAlpha = 0.9 * pulse; ctx.strokeStyle = '#46e4ff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(L.x, L.y); ctx.stroke();
    ctx.globalAlpha = 1; ctx.fillStyle = '#e8fdff'; ctx.strokeStyle = 'rgba(10,28,52,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(L.x, L.y, L.steel ? 3.4 : 2.4, 0, TAU); ctx.fill(); ctx.stroke(); // end mark
  }
};

/* -- obus -- */
// Obus (D2): mode 'lob'. The shell is thrown to p.aimDist along the turret, flies above everything (TT.bulletStep moves it) and lands with area damage.
const TT_obus = {
  area(s) { return s.tr.area * (1 + s.tr.blastK * upL('blast')); }, // Patlayici mermi: +25% per level. Delici and Sekme do nothing for a lob
  target(t, s) { // where the next shell will land
    const tr = s.tr, D = clamp(t.aimDist, tr.minD * T, tr.maxD * T), n = G.map.n, ca = Math.cos(t.turret), sa = Math.sin(t.turret);
    return { x: clamp(t.x + ca * D, T * 0.5, (n - 0.5) * T), y: clamp(t.y + sa * D, T * 0.5, (n - 0.5) * T) };
  },
  fire(t, ctx) {
    const s = ctx.s, tr = s.tr, ca = Math.cos(t.turret), sa = Math.sin(t.turret), sx = t.x + ca * s.barrel, sy = t.y + sa * s.barrel, g = this.target(t, s);
    const dist = Math.hypot(g.x - sx, g.y - sy), T0 = Math.max(tr.tMin, dist / tr.vFly), ang = Math.atan2(g.y - sy, g.x - sx);
    const b = { x: sx, y: sy, vx: Math.cos(ang) * tr.vFly, vy: Math.sin(ang) * tr.vFly, r: s.bR, owner: 0, dmg: s.dmg, life: T0 + 1, big: !!s.big, dead: false,
      pierce: false, bounce: 0, splash: null, look: 'lob', hits: null, bricks: null, sx, sy, dist: 0, bounced: false, vol: ++t.volId, volN: 1, pn: 0, h: 0,
      lob: { sx, sy, tx: g.x, ty: g.y, t: 0, T: T0, kind: 'obus', R: this.area(s) } };
    synFlags(b); b.bb = false; b.far = false; // Seken patlama / Uzak vuruş do not apply to a lob; Pusu (b.ambush) does, through synDmg
    G.bullets.push(b); G.shots++;
    t.recoil = 1; moveTank(t, -ca * s.kick, -sa * s.kick); t.lastShot = G.time;
    addPart('fire', sx + ca * 4, sy + sa * 4, ca * 60, sa * 60, 0.1, 20, 40, 0);
    for (let k = 0, nk = Math.max(2, Math.round(5 * fxScale)); k < nk; k++) addPart('smoke', sx + ca * 6, sy + sa * 6, ca * rand(30, 90) + rand(-18, 18), sa * rand(30, 90) + rand(-18, 18), rand(0.5, 0.9), rand(11, 17), 30, 3);
    Sound.shoot(true, true, 1); Sound.pop(1);
    return true;
  },
  land(b, L) { // area damage (full at the centre, tr.edge at the rim), bricks in reach take one hit, scorch decal, explosion
    const tr = TANKS.obus.tr, R = L.R, x = L.tx, y = L.ty, m = G.map;
    explode(x, y, 0.85 * R / 60);
    addPart('ring', x, y, 0, 0, 0.35, 8, (R - 8) / 0.35, 0, '255,210,90');
    let any = false;
    for (const e of G.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - x, e.y - y); if (d >= R + e.r) continue;
      any = true; hurtEnemy(e, b.dmg * (1 - (1 - tr.edge) * clamp(d / R, 0, 1)) * synDmg(b, e), e.x, e.y, Math.atan2(e.y - y, e.x - x));
    }
    if (any) G.hits++;
    const pseudo = { vx: 0, vy: 0, big: b.big };
    for (let r = Math.floor((y - R) / T); r <= Math.floor((y + R) / T); r++) for (let c = Math.floor((x - R) / T); c <= Math.floor((x + R) / T); c++) {
      if (m.get(c, r) !== BRICK) continue;
      const nx = clamp(x, c * T, c * T + T), ny = clamp(y, r * T, r * T + T);
      if ((nx - x) * (nx - x) + (ny - y) * (ny - y) <= R * R) hitTile(pseudo, c * T + T / 2, r * T + T / 2);
    }
    addDecals(m, [{ k: 'scorch', x, y, r: R * 0.8 }]);
  },
  ring(x, y, R, a, k) { // a landing mark: a dashed yellow ring with a dark rim and a cross; k (0..1) shrinks an inner ring for shells in flight
    ctx.setLineDash([]); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(255,210,74,.14)'; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(30,22,6,.6)'; ctx.lineWidth = 4.4; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 2.2; ctx.setLineDash([9, 6]); ctx.lineDashOffset = -G.time * 24; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(30,22,6,.6)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y); ctx.moveTo(x, y - 8); ctx.lineTo(x, y + 8); ctx.stroke();
    ctx.strokeStyle = '#fff2b0'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y); ctx.moveTo(x, y - 8); ctx.lineTo(x, y + 8); ctx.stroke();
    if (k !== undefined) { ctx.strokeStyle = '#fff2b0'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, R * (1 - k), 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
  },
  fx(p) {
    const s = p.spec, g = this.target(p, s);
    for (const b of G.bullets) if (b.lob && !b.dead) this.ring(b.lob.tx, b.lob.ty, b.lob.R, 0.55, clamp(b.lob.t / b.lob.T, 0, 1));
    this.ring(g.x, g.y, this.area(s), 0.95);
  },
  draw(b) { // in flight: a ground shadow, then the shell lifted by its arc height and drawn bigger (the 3 passes of drawBullets skip lobs)
    const h = b.h || 0, hy = b.y - h * TANKS.obus.tr.hgt, rr = b.r * (1 + 0.9 * h);
    ctx.fillStyle = 'rgba(0,0,0,.34)'; ctx.beginPath(); ctx.ellipse(b.x, b.y + 2, b.r * (1.5 - 0.35 * h), b.r * (1.5 - 0.35 * h) * 0.6, 0, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55; const gs = rr * 6; ctx.drawImage(SPR.fire, b.x - gs / 2, hy - gs / 2, gs, gs); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffd89a'; ctx.strokeStyle = 'rgba(40,24,6,.85)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(b.x, hy, rr, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8a5a1c'; ctx.beginPath(); ctx.arc(b.x - rr * 0.25, hy + rr * 0.25, rr * 0.45, 0, TAU); ctx.fill();
  }
};
// Enemy status effects, once per frame per enemy before its AI. Returns true while the tank is stunned (it stands still and holds fire, like Dondurucu).
// stunT: Ikiz.   kvx/kvy: knockback velocity (px/s, divided by mass where it is set), decays quickly.   burnT/burnDps: Alev Topu burn, ticks every 0.25 s.
function tickStatus(e, dt) {
  if (e.kvx || e.kvy) { // D1: Sarapnel / Cift knockback
    moveTank(e, e.kvx * dt, e.kvy * dt);
    const k = Math.exp(-8 * dt); e.kvx *= k; e.kvy *= k;
    if (Math.abs(e.kvx) + Math.abs(e.kvy) < 6) e.kvx = e.kvy = 0;
  }
  if (e.burnT > 0) { // D1: Alev Topu burn
    e.burnT -= dt; e.burnTick -= dt;
    if (e.burnTick <= 0 && !e.dead) {
      e.burnTick = 0.25; hurtEnemy(e, e.burnDps * 0.25, e.x, e.y, 0, true);
      if (!e.dead && fxScale === 1) addPart('fire', e.x + rand(-8, 8), e.y + rand(-8, 8), rand(-10, 10), rand(-40, -15), rand(0.25, 0.45), rand(8, 14), 10, 2);
    }
  }
  if (e.stunT > 0) { e.stunT -= dt; return !e.dead; }
  return false;
}
function damageSmoke(t, dt) {
  if (t.hp / t.maxHp >= 0.35) return;
  t.smokeT -= dt;
  if (t.smokeT <= 0) { t.smokeT = 0.12; addPart('smoke', t.x + rand(-6, 6), t.y + rand(-6, 6), rand(-10, 10), rand(-10, 10), rand(0.8, 1.3), rand(10, 16), 22, 1.5); }
}
function separateTanks() {
  const list = G.player && G.player.alive ? [G.player, ...G.enemies] : G.enemies;
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j]; if (a.dead || b.dead) continue;
    const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r, dd = dx * dx + dy * dy;
    if (dd >= rr * rr) continue;
    const d = Math.sqrt(dd), push = rr - d, ma = a.spec.mass, mb = b.spec.mass, tot = ma + mb;
    const nx = d > 1e-4 ? dx / d : 1, ny = d > 1e-4 ? dy / d : 0;
    a.x -= nx * push * (mb / tot); a.y -= ny * push * (mb / tot);
    b.x += nx * push * (ma / tot); b.y += ny * push * (ma / tot);
    collideWalls(a); collideWalls(b);
  }
}

