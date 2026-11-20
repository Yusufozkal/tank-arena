/* ================= particles, texts, effects ================= */
let MAX_PARTS = 520, fxScale = 1; // lowered by the "Efektler: Düşük" setting
function addPart(k, x, y, vx, vy, life, size, grow, drag, col) {
  if (parts.length >= MAX_PARTS) return;
  parts.push({ k, x, y, vx, vy, life, max: life, size, grow: grow || 0, drag: drag || 0, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 9, col });
}
function updateParticles(dt) {
  let j = 0;
  for (let i = 0; i < parts.length; i++) {
    const q = parts[i]; q.life -= dt; if (q.life <= 0) continue;
    const dr = Math.exp(-q.drag * dt); q.vx *= dr; q.vy *= dr;
    q.x += q.vx * dt; q.y += q.vy * dt; q.size += q.grow * dt; q.rot += q.vr * dt;
    parts[j++] = q;
  }
  parts.length = j;
}
function sparks(x, y, n, col, speed, dir, spread) {
  n = Math.max(2, Math.round(n * fxScale));
  for (let i = 0; i < n; i++) {
    const a = dir === undefined ? rand(0, TAU) : dir + rand(-spread, spread), s = rand(0.35, 1) * speed;
    addPart('spark', x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.14, 0.32), 1, 0, 5, col);
  }
}
function explode(x, y, pw) {
  addPart('flash', x, y, 0, 0, 0.14, 110 * pw, 0, 0);
  addPart('ring', x, y, 0, 0, 0.42, 12 * pw, 280 * pw, 0, '255,226,170');
  const sq = Math.sqrt(pw);
  for (let i = 0, n = Math.round((12 * pw + 5) * fxScale); i < n; i++) { const a = rand(0, TAU), s = rand(15, 140) * pw; addPart('fire', x + rand(-6, 6) * pw, y + rand(-6, 6) * pw, Math.cos(a) * s, Math.sin(a) * s, rand(0.3, 0.65), rand(14, 30) * sq, 34, 3.2); }
  for (let i = 0, n = Math.round((10 * pw + 4) * fxScale); i < n; i++) { const a = rand(0, TAU), s = rand(160, 420) * sq; addPart('spark', x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.25, 0.55), 1, 0, 3.5, '#ffd27a'); }
  for (let i = 0, n = Math.round((8 * pw + 4) * fxScale); i < n; i++) { const a = rand(0, TAU), s = rand(10, 60) * pw; addPart('smoke', x + rand(-10, 10) * pw, y + rand(-10, 10) * pw, Math.cos(a) * s, Math.sin(a) * s, rand(1.1, 2.2), rand(20, 34) * sq, 30, 1.6); }
  for (let i = 0, n = Math.round((6 * pw + 2) * fxScale); i < n; i++) { const a = rand(0, TAU), s = rand(90, 260) * sq; addPart('debris', x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.7, 1.3), rand(3, 6), 0, 3.4, '#2a2620'); }
  shake(9 * pw * prox(x, y));
  Sound.boom(pw, volAt(x, y));
}
function addText(x, y, s, col, size) { G.texts.push({ x, y, s, col, size: size || 15, life: 1.15, max: 1.15 }); }
function updateTexts(dt) {
  for (const q of G.texts) { q.life -= dt; q.y -= 24 * dt; }
  if (G.texts.some(q => q.life <= 0)) G.texts = G.texts.filter(q => q.life > 0);
}

/* ================= hits & damage ================= */
function hitTile(b, x, y) {
  const m = G.map, c = Math.floor(x / T), r = Math.floor(y / T);
  if (c < 0 || r < 0 || c >= m.n || r >= m.n) return;
  const i = r * m.n + c, v = m.t[i], vol = volAt(x, y);
  const sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp, uy = b.vy / sp, hx = x - ux * 4, hy = y - uy * 4, back = Math.atan2(-uy, -ux);
  if (v === BRICK) {
    m.hp[i] = Math.max(0, m.hp[i] - (b.big ? 2 : 1));
    for (let k = 0; k < 5; k++) { const a = back + rand(-1, 1), s = rand(60, 180); addPart('debris', hx, hy, Math.cos(a) * s, Math.sin(a) * s, rand(0.4, 0.8), rand(2.5, 4.5), 0, 4, m.theme.brick); }
    addPart('dust', hx, hy, -ux * 20, -uy * 20, 0.6, 16, 30, 2);
    if (m.hp[i] === 0) destroyBrick(m, c, r, vol); else { paintRegion(m, c - 1, r - 1, c + 1, r + 1); Sound.brick(vol); }
  } else if (v === STEEL) {
    sparks(hx, hy, 7, '#ffe3a1', 230, back, 1.3);
    Sound.metal(vol);
  }
}
function destroyBrick(m, c, r, vol) {
  const i = r * m.n + c; m.t[i] = EMPTY; m.hp[i] = 0; m.flowDirty = true;
  const x = c * T + T / 2, y = r * T + T / 2;
  for (let k = 0, nk = Math.round(12 * fxScale); k < nk; k++) { const a = rand(0, TAU), s = rand(50, 200); addPart('debris', x + rand(-14, 14), y + rand(-14, 14), Math.cos(a) * s, Math.sin(a) * s, rand(0.5, 1), rand(3, 6), 0, 3.5, k & 1 ? m.theme.brick : m.theme.brickDk); }
  for (let k = 0; k < 5; k++) addPart('dust', x + rand(-14, 14), y + rand(-14, 14), rand(-20, 20), rand(-20, 20), rand(0.7, 1.2), rand(22, 34), 26, 1.5);
  miniTile(m, c, r);
  addDecals(m, [{ k: 'rubble', x, y, r: T * 0.6, seed: randInt(1, 1e9) }]);
  Sound.crumble(vol);
}
const wreckOf = t => {
  const s = t.spec;
  return { k: 'wreck', x: t.x, y: t.y, a: t.angle, ta: t.turret - t.angle + rand(-0.7, 0.7), tox: rand(-7, 7), toy: rand(-7, 7),
    L: s.len, W: s.wid, tw: s.tread, tR: s.tR, bW: s.bW, barrel: s.barrel, r: s.len * 0.75 };
};
function hurtEnemy(e, dmg, x, y, dir, quiet) { // quiet: burn ticks and flame, no sparks or sound
  if (e.dead) return;
  if (e.isBoss) { bossHurt(e, dmg, x, y, dir, quiet); return; } // 11a: phases, parts, stun bonus
  e.hp -= dmg; e.flash = 0.1;
  if (!quiet) sparks(x, y, 6, '#ffd27a', 200, dir, 1.4);
  if (e.hp <= 0.001) { killEnemy(e); return; }
  if (!quiet) Sound.metal(volAt(e.x, e.y));
}
function damageEnemy(e, b) {
  hurtEnemy(e, b.dmg * synDmg(b, e), b.x, b.y, Math.atan2(-b.vy, -b.vx));
  if (!e.dead) partBreak(e, b); // 11: a surviving enemy tank loses a part by the hit direction
}
// Explosive shells (Patlayıcı mermi): a small blast that hurts every other enemy tank in reach
function blastAt(b, x, y, skip) {
  const sp = splashFor(b); // hook (B): Seken patlama
  addPart('flash', x, y, 0, 0, 0.12, sp.r * 2.2, 0, 0);
  addPart('ring', x, y, 0, 0, 0.3, 6, sp.r * 3.3, 0, '255,170,90');
  for (let i = 0, n = Math.max(2, Math.round(5 * fxScale)); i < n; i++) { const a = rand(0, TAU), v = rand(30, 110); addPart('fire', x, y, Math.cos(a) * v, Math.sin(a) * v, rand(0.2, 0.4), rand(10, 18), 30, 3); }
  Sound.pop(volAt(x, y));
  for (const e of G.enemies) {
    if (e.dead || e === skip) continue;
    const rr = sp.r + e.r; if (dist2(x, y, e.x, e.y) < rr * rr) hurtEnemy(e, b.dmg * sp.k, e.x, e.y);
  }
}
function killEnemy(e) {
  if (e.dead) return;
  e.dead = true;
  const s = e.spec, pw = e.type === 'boss' ? 2.2 : e.type === 'heavy' ? 1.35 : 1;
  explode(e.x, e.y, pw);
  addDecals(G.map, [{ k: 'scorch', x: e.x, y: e.y, r: 34 * pw }, wreckOf(e)]);
  const pts = Math.round(s.score * G.D.score);
  G.score += pts; G.kills++;
  nukeOnKill(e); // hook (C): nuke meter
  addText(e.x, e.y - 12, '+' + fmt(pts), '#f2c14e', e.type === 'boss' ? 22 : 16);
  if (e.type === 'boss') {
    G.boss = null;
    if (e.isBoss) bossDefeated(e); // armour back to full, hazards gone (11a)
    else showBanner('KOMUTAN İMHA EDİLDİ', '+' + fmt(pts) + ' puan', 1.9);
    ['repair', 'shield', pick(['triple', 'rapid', 'pierce', 'freeze', 'air'])].forEach((k, i) => dropPickup(e.x + Math.cos(i * 2.1) * 26, e.y + Math.sin(i * 2.1) * 26, k, e.x, e.y));
    vibrate([40, 30, 80]);
  } else if (Math.random() < s.drop * G.mods.drop * (1 + 0.25 * upL('magnet'))) dropPickup(e.x, e.y);
}
function damagePlayer(b) {
  const p = G.player;
  if (G.god) return;
  if (G.buffs.shield > 0 || p.shield1T > 0) {
    for (let k = 0; k < 6; k++) { const a = rand(0, TAU); addPart('glow', b.x, b.y, Math.cos(a) * 90, Math.sin(a) * 90, 0.3, 12, 0, 4, 'blue'); }
    Sound.shield(); return;
  }
  p.hp -= b.dmg * synTaken(b); p.flash = 0.12; p.hurtT = G.time; G.hurt = 0.45; shake(7); Sound.hurt(); vibrate(35);
  sparks(b.x, b.y, 6, '#ffb08a', 200);
  if (p.hp <= 0) { p.hp = 0; killPlayer(); }
}
function killPlayer() {
  const p = G.player; p.alive = false; p.dead = true;
  explode(p.x, p.y, 1.8);
  addDecals(G.map, [{ k: 'scorch', x: p.x, y: p.y, r: 56 }, wreckOf(p)]);
  shake(16); vibrate([70, 40, 140]);
  G.phase = 'dying'; G.phaseT = 0; G.timeScale = 0.35;
  releaseInput();
}

/* ================= pickups ================= */
function dropPickup(x, y, kind, fx, fy) {
  const m = G.map;
  if (blocksTank(m.at(x, y))) { if (fx === undefined) return; x = fx; y = fy; }
  if (!kind) {
    const low = G.player && G.player.hp < G.player.maxHp * 0.45, w = [];
    let tot = 0;
    for (const k in PU) { if (PU[k].from > G.wave) continue; const v = k === 'repair' && low ? 5 : PU[k].w; w.push([k, v]); tot += v; }
    let r = Math.random() * tot; kind = 'repair';
    for (const [k, v] of w) { r -= v; if (r <= 0) { kind = k; break; } }
  }
  G.pickups.push({ x, y, kind, life: 14, t: 0, seed: Math.random() * 10 });
}
function applyPickup(k) {
  const p = G.player, P = PU[k.kind];
  if (k.kind === 'repair') { const amt = 35 + 10 * upL('boost'), h = Math.min(amt, p.maxHp - p.hp); p.hp = Math.min(p.maxHp, p.hp + amt); addText(p.x, p.y - 28, h > 0.5 ? '+' + Math.round(h) + ' zırh' : 'Zırh tam', P.col, 16); }
  else if (k.kind === 'air') { addText(p.x, p.y - 28, P.name, P.col, 16); callAirStrike(); }
  else {
    const d = P.dur * (1 + 0.25 * upL('boost'));
    G.buffs[k.kind] = d; G.buffMax[k.kind] = d;
    addText(p.x, p.y - 28, P.name, P.col, 16);
    if (k.kind === 'freeze') { addPart('ring', p.x, p.y, 0, 0, 0.6, 10, 700, 0, P.rgb); Sound.freeze(); }
    else if (k.kind === 'stealth') Sound.cloak();
  }
  G.score += Math.round(50 * G.D.score);
  addPart('ring', k.x, k.y, 0, 0, 0.4, 8, 110, 0, P.rgb);
  Sound.pickup(); vibrate(15);
  synPickup(k.kind); // hook (B)
}
function updatePickups(dt) {
  const p = G.player, mag = upL('magnet'), R = (2 + 2 * mag) * T;
  for (const k of G.pickups) {
    k.life -= dt; k.t += dt;
    if (!p || !p.alive) continue;
    const dx = p.x - k.x, dy = p.y - k.y, d = Math.hypot(dx, dy) || 1;
    if (G.phase === 'cleared') { const v = Math.min(d, 520 * dt); k.x += dx / d * v; k.y += dy / d * v; k.life = Math.max(k.life, 2); }
    else if (mag && d < R) { const v = Math.min(d, (180 + 150 * mag) * dt); k.x += dx / d * v; k.y += dy / d * v; k.life = Math.max(k.life, 1); }
    if (dist2(k.x, k.y, p.x, p.y) < (p.r + 15) * (p.r + 15)) { applyPickup(k); k.life = 0; }
  }
  if (G.pickups.some(k => k.life <= 0)) G.pickups = G.pickups.filter(k => k.life > 0);
}
// Hava saldırısı: a jet crosses the arena and bombs up to eight of the nearest enemies; with none around it waits for the next one
function callAirStrike() {
  const p = G.player;
  const list = G.enemies.filter(e => !e.dead).sort((a, b) => dist2(a.x, a.y, p.x, p.y) - dist2(b.x, b.y, p.x, p.y)).slice(0, 8);
  if (!list.length) { G.airQ++; return; }
  showBanner('HAVA SALDIRISI', list.length === 1 ? 'Hedef işaretlendi' : list.length + ' hedef işaretlendi', 1.5);
  G.jet = { t: 0, dur: 1.7, a: rand(0, TAU), x: p.x, y: p.y };
  list.forEach((e, i) => G.strikes.push({ e, x: e.x, y: e.y, t: -(0.5 + i * 0.12), dur: 0.8, done: false }));
  Sound.jet();
}
function updateStrikes(dt) {
  if (G.jet) { G.jet.t += dt; if (G.jet.t >= G.jet.dur) G.jet = null; }
  if (G.airQ > 0 && G.phase === 'fight' && G.enemies.some(e => !e.dead)) { G.airQ--; callAirStrike(); }
  if (!G.strikes.length) return;
  for (const q of G.strikes) {
    q.t += dt;
    if (q.e && !q.e.dead) { q.x = q.e.x; q.y = q.e.y; }
    if (q.t < q.dur || q.done) continue;
    q.done = true;
    explode(q.x, q.y, 1.05);
    addDecals(G.map, [{ k: 'scorch', x: q.x, y: q.y, r: 38 }]);
    for (const e of G.enemies) { if (e.dead) continue; const rr = 40 + e.r; if (dist2(q.x, q.y, e.x, e.y) < rr * rr) hurtEnemy(e, 3, e.x, e.y); }
  }
  G.strikes = G.strikes.filter(q => !q.done);
}
// Onarım robotu: repairs the hull after two seconds without taking a hit
function regen(p, dt) {
  const L = upL('repair');
  if (!L || G.phase !== 'fight' || p.hp >= p.maxHp || G.time - p.hurtT < 2) return;
  p.hp = Math.min(p.maxHp, p.hp + 0.5 * L * synRegen(p) * dt);
  p.fxT -= dt;
  if (p.fxT <= 0) { p.fxT = 0.45; addPart('glow', p.x + rand(-12, 12), p.y + rand(-12, 12), 0, -26, 0.55, 11, 0, 1, synRegenGlow(p)); }
}

