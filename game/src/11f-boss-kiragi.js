/* ================= Kırağı (docs/BOSSES.md section 6) ================= */
// Kar's boss, the Avcı's: a long, low, purple tank that hides. Invisible in bushes; in the open it stays invisible up to 3 s (then 2 s visible); while invisible it leaves 2 s snow tracks and an air shimmer;
// after a shot it is visible for 1.5 s and slower. Arena Donmuş Göl: the lake (W) is impassable until phase 3, when it freezes. Per-boss state lives in e.kr.
// Phase 1 "Pusu": Keskin atış (mint laser line 1 s, the last 0.25 s locked, stops at walls), Saklan (walks to a bush, at most 4 s), Kaçın (a quick evasive run).
// Phase 2 "Suretler": Çift atış (two lasers), Suretler (two ice copies, three in the second loop: the copies show laser lines too but only the real one hits; a copy breaks in one hit and slows what is near it for 2 s).
// Phase 3 "Ayaz": the lake freezes; Don dalgası every 10 s (front line 1.5 s ahead, then the ground stays frosted 6 s: the player is 30% slower, Kırağı 40% faster).
// Breaking the tread (a line warning) or the barrel (a glow warning) during a laser warning cancels the attack: every laser shows both a line and a barrel glow.
// Hooks used from 11a: def.tick, def.move, def.flowGoal, def.onClear, def.onPhase, def.vis (15a drawBoss opacity), def.drawGround / def.drawTop (15-render-world), tl.rgb / tl.nodanger; 10 calls krDecoyHit, 12 calls playerSlowK; e.noTreads (07 trackUpdate).
ARENAS.gol = { name: 'Donmuş Göl', rows: [
  'SS.................SS',
  'SS.................SS',
  '.......S..X..S.......',
  '...GG...........GG...',
  '...GG...S...S...GG...',
  '.....................',
  '.....S...GGG...S.....',
  '.........GGG.........',
  '....S...........S....',
  '..GG....WWWWW....GG..',
  '..GG..S.WWWWW.S..GG..',
  '..GG....WWWWW....GG..',
  '....S...........S....',
  '.........GGG.........',
  '.....S...GGG...S.....',
  '.....................',
  '...GG...S...S...GG...',
  '...GG...........GG...',
  '.......S..P..S.......',
  'SS.................SS',
  'SS.................SS'] };

const KIR_SPEC = { speed: 125, turn: 3.2, tTurn: 3.4, len: 90, wid: 44, r: 30, tread: 10, tR: 15, barrel: 66, bW: 6.5, cool: 1, bSpeed: 400, dmg: 9, bR: 5, mass: 5, score: 3000,
  col: { body: '#6c4fa3', dk: '#432f6b', hi: '#9d84d1', acc: '#7ef0d0' } };
const KIR_MINT = '126,240,208';
const KIR = { open: 3, lockT: 2, shotVis: 1.5, shotSlow: 0.55, frostLife: 6, frostSlow: 0.7, frostFast: 1.4, decSlow: 0.6, slowT: 2, slowR: 2.4 * T, trail: 2, trail2: 0.5, decLife: 10, beamW: 12, dmg: 14, dmg2: 11,
  hideMax: 4, frontDepth: 9 * T, frontSpeed: 480, frontLine: 1.5 };

/* ---- shared helpers ---- */
const krTile = (m, x, y) => clamp(Math.floor(y / T), 0, m.n - 1) * m.n + clamp(Math.floor(x / T), 0, m.n - 1);
const krFree = (x, y, r) => { const m = G.map; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; if (blocksTank(m.at(x + Math.cos(a) * r, y + Math.sin(a) * r))) return false; } return !blocksTank(m.at(x, y)); };
function krRay(x, y, a, max) { // laser length: until a wall (steel or brick) or the limit
  const m = G.map, ca = Math.cos(a), sa = Math.sin(a);
  for (let d = 8; d < max; d += 8) if (isWall(m.at(x + ca * d, y + sa * d))) return d;
  return max;
}
function krAimLine(tl, o, a) { const mx = o.x + Math.cos(o.turret) * KIR_SPEC.barrel, my = o.y + Math.sin(o.turret) * KIR_SPEC.barrel; tl.x = mx; tl.y = my; tl.a = a; tl.len = krRay(mx, my, a, 17 * T); }
function krLine(e, o, fake) { return addTele(e, { kind: 'line', dur: 1.0, lock: 0.25, x: o.x, y: o.y, a: o.turret, len: 0, w: KIR.beamW, rgb: KIR_MINT, nodanger: !!fake, fake: !!fake }); }
function krBeam(e, tl, dmg, silent) { // the strike behind a laser line: an instant beam along the locked line
  const kr = e.kr, p = G.player, ca = Math.cos(tl.a), sa = Math.sin(tl.a), mx = tl.x, my = tl.y, len = tl.len;
  kr.beams.push({ x: mx, y: my, a: tl.a, len, t: 0.24, fake: !!silent });
  sparks(mx, my, 6, '#bffff0', 220, tl.a, 0.6); if (!silent) sparks(mx + ca * len, my + sa * len, 8, '#bffff0', 220);
  if (silent) return;
  if (p.alive) {
    const dx = p.x - mx, dy = p.y - my, al = dx * ca + dy * sa, pr = -dx * sa + dy * ca;
    if (al > -10 && al < len + p.r && Math.abs(pr) < KIR.beamW / 2 + p.r * 0.75) damagePlayer({ x: p.x, y: p.y, dmg: bossDmg(dmg), owner: 1, vx: ca * 400, vy: sa * 400 });
  }
}
function krShot(e) { // after a real shot: visible for 1.5 s and slower, recoil, sound
  const kr = e.kr, ca = Math.cos(e.turret), sa = Math.sin(e.turret);
  kr.shot = KIR.shotVis; e.recoil = 1; moveTank(e, -ca * 2, -sa * 2); shake(3 * prox(e.x, e.y)); Sound.shoot(false, true, volAt(e.x, e.y));
}

/* ---- ice copies ---- */
function krDecoyAdd(e, x, y) {
  const kr = e.kr, d = { id: ++kr.decSeq, x, y, angle: e.angle, turret: e.turret, r: 28, t: 0, treadL: 0, treadR: 0, recoil: 0, glow: 0, goal: null, spd: 42, tr: [], lx: x, ly: y, flash: 0 };
  kr.dec.push(d);
  addPart('ring', x, y, 0, 0, 0.5, 12, 130, 0, '170,230,255'); sparks(x, y, 10, '#d8f4ff', 240);
  for (let k = 0, n = Math.max(3, Math.round(7 * fxScale)); k < n; k++) { const a = rand(0, TAU); addPart('debris', x, y, Math.cos(a) * rand(30, 120), Math.sin(a) * rand(30, 120), rand(0.5, 0.9), rand(2.5, 4.5), 0, 3, '#d8f4ff'); }
  return d;
}
function krDecoySpots(e, n) { // free spots 4-8 tiles from the player (a line to him), apart from each other and from the real one; relaxed step by step so there are always n
  const p = G.player, out = [];
  for (let relax = 0; relax < 3 && out.length < n; relax++) {
    for (let k = 0; k < 60 && out.length < n; k++) {
      const a = rand(0, TAU), r = rand(4 - relax, 8 + relax * 2) * T, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
      if (x < 2 * T || y < 2 * T || x > G.map.w - 2 * T || y > G.map.h - 2 * T || !krFree(x, y, 30)) continue;
      if (relax < 2 && !los(x, y, p.x, p.y)) continue;
      if (Math.hypot(x - e.x, y - e.y) < 2.5 * T || out.some(q => Math.hypot(q.x - x, q.y - y) < 3 * T)) continue;
      out.push({ x, y });
    }
  }
  return out;
}
function krClearDecoys(e, slow) { for (const d of e.kr.dec.slice()) krDecoyBreak(e, d, !!slow, true); }
function krDecoyBreak(e, d, slow, quiet) { // an ice copy breaks (shot, expired or cleared); a shot one slows whatever stands near it for 2 s
  const kr = e.kr, i = kr.dec.indexOf(d); if (i < 0) return;
  kr.dec.splice(i, 1);
  addPart('ring', d.x, d.y, 0, 0, 0.5, 10, KIR.slowR * 1.1, 0, '170,230,255'); addPart('flash', d.x, d.y, 0, 0, 0.15, 90, 0, 0);
  sparks(d.x, d.y, 14, '#d8f4ff', 320);
  for (let k = 0, n = Math.max(4, Math.round(10 * fxScale)); k < n; k++) { const a = rand(0, TAU), v = rand(60, 200); addPart('debris', d.x, d.y, Math.cos(a) * v, Math.sin(a) * v, rand(0.5, 1), rand(2.5, 5), 0, 3.2, k & 1 ? '#d8f4ff' : '#7ec6e8'); }
  Sound.crumble(volAt(d.x, d.y));
  for (const t of G.tele.slice()) if (t.d === d) removeTele(t);
  if (!slow) return;
  addText(d.x, d.y - 28, 'Suret kırıldı', '#bff0ff', 14);
  const p = G.player;
  if (p.alive && Math.hypot(p.x - d.x, p.y - d.y) < KIR.slowR) { kr.pSlow = KIR.slowT; addText(p.x, p.y - 30, 'Yavaşladın', '#bff0ff', 13); }
  if (Math.hypot(e.x - d.x, e.y - d.y) < KIR.slowR + e.r) { kr.slowT = KIR.slowT; addText(e.x, e.y - e.r - 14, 'Yavaşladı', '#bff0ff', 14); }
}
function krDecoyHit(b) { // 10 updateBullets: a player shell inside an ice copy breaks it (one hit)
  const e = G.boss, kr = e && e.kr; if (!kr) return false;
  for (const d of kr.dec) if (dist2(b.x, b.y, d.x, d.y) < (d.r + b.r) * (d.r + b.r)) { krDecoyBreak(e, d, true); return true; }
  return false;
}
function krDecoyTick(e, dt) {
  const kr = e.kr, m = G.map, p = G.player, loop2 = kr.loop2;
  for (const d of kr.dec.slice()) {
    d.t += dt; d.flash = Math.max(0, d.flash - dt); d.recoil = Math.max(0, d.recoil - dt * 6);
    if (d.t > KIR.decLife) { krDecoyBreak(e, d, false); continue; }
    if (!d.goal || Math.hypot(d.goal.x - d.x, d.goal.y - d.y) < 10) { // wander: a free spot 2-4 tiles away
      d.goal = null;
      for (let k = 0; k < 8 && !d.goal; k++) { const a = rand(0, TAU), r = rand(2, 4) * T, x = d.x + Math.cos(a) * r, y = d.y + Math.sin(a) * r; if (krFree(x, y, 30)) d.goal = { x, y }; }
    }
    if (d.goal) {
      const a = Math.atan2(d.goal.y - d.y, d.goal.x - d.x); d.angle = turnTo(d.angle, a, 2.4 * dt);
      const sp = d.spd * (kr.gen ? 0.3 : 1) * dt, nx = d.x + Math.cos(d.angle) * sp, ny = d.y + Math.sin(d.angle) * sp;
      if (krFree(nx, ny, 28)) { d.x = nx; d.y = ny; d.treadL += sp; d.treadR += sp; } else d.goal = null;
    }
    if (!kr.fakeAim && p.alive) d.turret = turnTo(d.turret, Math.atan2(p.y - d.y, p.x - d.x), 2.5 * dt);
    if (loop2) krTrail(kr.dtrail, d, KIR.trail2); // second loop: the copies leave short tracks too (0.5 s)
  }
  for (let i = kr.dtrail.length - 1; i >= 0; i--) if (G.time - kr.dtrail[i].t > KIR.trail2) kr.dtrail.splice(i, 1);
}

/* ---- tracks (2 s in the snow; the copies' 0.5 s in the second loop) ---- */
function krTrail(list, o, life) { // a pair of track segments each 6 px of travel; o carries lx/ly (last mark)
  const dx = o.x - o.lx, dy = o.y - o.ly, d = Math.hypot(dx, dy); if (d < 6) return;
  if (d < 40) {
    const off = KIR_SPEC.wid / 2 - KIR_SPEC.tread / 2, nx = -Math.sin(o.angle) * off, ny = Math.cos(o.angle) * off;
    list.push({ x1: o.lx + nx, y1: o.ly + ny, x2: o.x + nx, y2: o.y + ny, t: G.time }, { x1: o.lx - nx, y1: o.ly - ny, x2: o.x - nx, y2: o.y - ny, t: G.time });
    if (list.length > 220) list.splice(0, list.length - 220);
  }
  o.lx = o.x; o.ly = o.y;
}

/* ---- frost front ---- */
function krFrontPick(e) { // the edge the front starts from: one whose band covers the player, else any
  const m = G.map, p = G.player, ok = [];
  for (let d = 0; d < 4; d++) { const a = d === 0 ? p.x : d === 1 ? m.w - p.x : d === 2 ? p.y : m.h - p.y; if (a < KIR.frontDepth) ok.push(d); }
  return pick(ok.length ? ok : [0, 1, 2, 3]);
}
const krAxis = (dir, m, x, y) => dir === 0 ? x : dir === 1 ? m.w - x : dir === 2 ? y : m.h - y;
function krFrontStep(e, dt) {
  const kr = e.kr, f = kr.front, m = G.map; if (!f || !f.active) return;
  const prev = f.pos; f.pos += KIR.frontSpeed * dt;
  for (let r = 0; r < m.n; r++) for (let c = 0; c < m.n; c++) {
    const i = r * m.n + c, v = m.t[i]; if (isWall(v) || v === WATER) continue;
    const a = krAxis(f.dir, m, c * T + T / 2, r * T + T / 2);
    if (a > prev && a <= f.pos && a < f.depth) { kr.frost[i] = KIR.frostLife; if (fxScale === 1 && Math.random() < 0.5) addPart('dust', c * T + T / 2 + rand(-12, 12), r * T + T / 2 + rand(-12, 12), rand(-20, 20), rand(-30, -8), rand(0.5, 0.9), rand(10, 18), 18, 1, 'k'); }
  }
  if (f.pos >= f.depth + T) kr.front = null;
}
function krPlayerSlow(e) { // frost under the player: 30% slower; a broken ice copy next to him: 40% slower for 2 s (the stronger one counts)
  const kr = e.kr, p = G.player; let k = 1;
  if (kr.frost && kr.frost[krTile(G.map, p.x, p.y)] > 0) k = KIR.frostSlow;
  if (kr.pSlow > 0) k = Math.min(k, KIR.decSlow);
  return k;
}
const playerSlowK = () => { const e = G.boss; return e && !e.dead && !e.dying && e.kr ? krPlayerSlow(e) : 1; };

/* ---- per-frame hook: stealth, tracks, frost, copies, beams, speed ---- */
function krTick(e, dt) {
  const kr = e.kr, m = G.map, n = m.n;
  if (!kr.frost || kr.frost.length !== n * n) kr.frost = new Float32Array(n * n);
  if (G.phase === 'bossIntro') { kr.a = 1; kr.inv = false; kr.lx = e.x; kr.ly = e.y; return; }
  for (const b of kr.beams) b.t -= dt;
  if (kr.beams.length && kr.beams[0].t <= 0) kr.beams = kr.beams.filter(b => b.t > 0);
  kr.slowT = Math.max(0, kr.slowT - dt); kr.pSlow = Math.max(0, kr.pSlow - dt); kr.lakeT = Math.max(0, kr.lakeT - dt);
  for (let i = 0; i < n * n; i++) if (kr.frost[i] > 0) kr.frost[i] = Math.max(0, kr.frost[i] - dt);
  if (kr.front && !kr.front.active && !G.tele.some(t => t.front)) kr.front = null; // the warning was cancelled
  krFrontStep(e, dt);
  kr.gen = !!e.gen;
  krDecoyTick(e, dt);
  if (e.dying) { if (kr.dec.length) krClearDecoys(e, false); kr.front = null; }
  // stealth: bush = invisible; open ground = invisible for up to 3 s, then visible for 2 s; a shot (or the copies attack) makes it visible
  kr.shot = Math.max(0, kr.shot - dt); kr.force = Math.max(0, kr.force - dt);
  if (kr.lock > 0) { kr.lock -= dt; if (kr.lock <= 0) { kr.lock = 0; kr.open = 0; } }
  const inBush = m.at(e.x, e.y) === BUSH; let inv = false;
  if (!e.dying && !e.invuln && kr.shot <= 0 && kr.force <= 0) {
    if (inBush) inv = true;
    else if (kr.lock <= 0) { inv = true; kr.open += dt; if (kr.open >= KIR.open) { kr.open = KIR.open; kr.lock = KIR.lockT; inv = false; } }
  }
  kr.inv = inv; kr.a = clamp(kr.a + (inv ? -1 : 1) * dt * 5, 0, 1);
  const onFrost = kr.frost[krTile(m, e.x, e.y)] > 0;
  e.speedMul = (kr.shot > 0 ? KIR.shotSlow : 1) * (onFrost ? KIR.frostFast : 1) * (kr.slowT > 0 ? KIR.decSlow : 1) * kr.boost;
  krTrail(kr.trail, e, KIR.trail);
  while (kr.trail.length && G.time - kr.trail[0].t > KIR.trail) kr.trail.shift();
  if (inv && fxScale === 1 && Math.random() < dt * 8) addPart('spark', e.x + rand(-e.r, e.r), e.y + rand(-e.r, e.r), rand(-10, 10), rand(-30, -10), rand(0.4, 0.7), 1, 0, 4, '#e8fbff');
}

/* ---- movement between attacks: keeps 5.5-9 tiles away, strafes, backs off when pressed ---- */
function krSteer(e, a, dt, k) {
  const s = e.spec, before = e.angle, ox = e.x, oy = e.y;
  if (e.treadT > 0) { e.avx = e.avy = 0; return; }
  e.angle = turnTo(e.angle, a, s.turn * dt);
  const diff = Math.abs(angDiff(e.angle, a)), spd = diff < 0.7 ? s.speed * e.speedMul * k * (1 - diff * 0.6) : 0;
  moveTank(e, Math.cos(e.angle) * spd * dt, Math.sin(e.angle) * spd * dt);
  if (dt > 0) { e.avx = (e.x - ox) / dt; e.avy = (e.y - oy) / dt; }
  trackUpdate(e, (e.x - ox) * Math.cos(e.angle) + (e.y - oy) * Math.sin(e.angle), angDiff(before, e.angle));
}
function krAway(e) { // the best of 16 headings: away from the player, clear of walls and water, a bush a plus
  const m = G.map, p = G.player; let best = null, bs = -1e9;
  for (let k = 0; k < 16; k++) {
    const an = k * TAU / 16, c = Math.cos(an), sn = Math.sin(an);
    if (blocksTank(m.at(e.x + c * 40, e.y + sn * 40)) || blocksTank(m.at(e.x + c * 80, e.y + sn * 80)) || blocksTank(m.at(e.x + c * 40 - sn * 24, e.y + sn * 40 + c * 24)) || blocksTank(m.at(e.x + c * 40 + sn * 24, e.y + sn * 40 - c * 24))) continue;
    const away = (e.x - p.x) * c + (e.y - p.y) * sn, sc = away / Math.max(1, e.distP) * 3 + (m.at(e.x + c * 80, e.y + sn * 80) === BUSH ? 1 : 0) - Math.abs(angDiff(e.angle, an)) * 0.4;
    if (sc > bs) { bs = sc; best = an; }
  }
  return best;
}
function krMove(e, dt) {
  const kr = e.kr, p = G.player, T9 = 9 * T;
  if (!p.alive) return;
  if (e.canSee) e.turret = turnTo(e.turret, Math.atan2(p.y - e.y, p.x - e.x), e.spec.tTurn * dt); else e.turret = turnTo(e.turret, e.angle, e.spec.tTurn * 0.6 * dt);
  if (e.treadT > 0) { e.avx = e.avy = 0; return; }
  if (!e.canSee || e.distP > T9) bossMove(e, dt, 9);
  else if (e.distP < 5.5 * T) { const a = krAway(e); if (a !== null) krSteer(e, a, dt, 1); }
  else { // strafe across the player's line, flipping now and then or when blocked
    kr.sideT -= dt; if (kr.sideT <= 0) { kr.sideT = rand(1.5, 3); kr.side = -kr.side; }
    const a = Math.atan2(p.y - e.y, p.x - e.x) + kr.side * Math.PI / 2;
    if (blocksTank(G.map.at(e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 60))) kr.side = -kr.side;
    krSteer(e, a, dt, 0.5);
  }
}

/* ---- attacks ---- */
function* krSharp(e) { // keskin atış: barrel glow + mint laser line 1 s (last 0.25 s locked), then an instant beam
  const kr = e.kr, tl = krLine(e, e), gl = addTele(e, { kind: 'glow', dur: 1.0 });
  Sound.warnRise(volAt(e.x, e.y));
  while (tl.t < tl.dur) {
    if (tl.t < tl.dur - tl.lock) aimAtPlayer(e, e.dt, 1.6, 0);
    krAimLine(tl, e, e.turret); yield 0;
  }
  release(e, 'keskin', tl); removeTele(gl); removeTele(tl);
  if (!barrelSilent(e, 0)) { krBeam(e, tl, KIR.dmg); krShot(e); }
  yield 0.5;
}
function* krDouble(e) { // çift atış: two lasers at once, one at the player and one where a sidestep would take him
  const kr = e.kr, p = G.player, sgn = Math.sign(-Math.sin(e.turret) * (p.vx || 0) + Math.cos(e.turret) * (p.vy || 0)) || (Math.random() < 0.5 ? 1 : -1);
  const a = krLine(e, e), b = krLine(e, e), gl = addTele(e, { kind: 'glow', dur: 1.0 }); let base = e.turret;
  Sound.warnRise(volAt(e.x, e.y));
  while (a.t < a.dur) {
    if (a.t < a.dur - a.lock) { aimAtPlayer(e, e.dt, 1.6, 0); base = e.turret; }
    krAimLine(a, e, base); krAimLine(b, e, base + sgn * 0.3); yield 0;
  }
  release(e, 'cift', a); release(e, 'cift', b); removeTele(gl); removeTele(a); removeTele(b);
  if (!barrelSilent(e, 0)) { krBeam(e, a, KIR.dmg2); krBeam(e, b, KIR.dmg2); krShot(e); }
  yield 0.5;
}
function* krDecoys(e) { // suretler: ice copies appear, every copy and the real one show a laser line, only the real one fires
  const kr = e.kr, n = kr.loop2 ? 3 : 2;
  krClearDecoys(e, false); kr.force = 2.2;
  for (const q of krDecoySpots(e, n)) krDecoyAdd(e, q.x, q.y);
  Sound.warnRise(volAt(e.x, e.y)); addText(e.x, e.y - e.r - 26, 'SURETLER', '#7ef0d0', 20);
  for (let t = 0; t < 0.45; t += e.dt) { aimAtPlayer(e, e.dt, 1.2, 0); yield 0; }
  const tl = krLine(e, e), gl = addTele(e, { kind: 'glow', dur: 1.0 }), fakes = kr.dec.map(d => { const f = krLine(e, d, true); f.d = d; return f; });
  kr.fakeAim = true;
  while (tl.t < tl.dur) {
    const free = tl.t < tl.dur - tl.lock;
    if (free) aimAtPlayer(e, e.dt, 1.6, 0);
    krAimLine(tl, e, e.turret);
    for (const f of fakes) { if (free && G.player.alive) f.d.turret = turnTo(f.d.turret, Math.atan2(G.player.y - f.d.y, G.player.x - f.d.x), 3.4 * e.dt); krAimLine(f, f.d, f.d.turret); f.d.glow = tl.t / tl.dur; }
    yield 0;
  }
  kr.fakeAim = false;
  release(e, 'suret', tl); removeTele(gl); removeTele(tl);
  for (const f of fakes) { removeTele(f); if (kr.dec.includes(f.d)) { krBeam(e, f, 0, true); f.d.recoil = 1; f.d.glow = 0; } } // a harmless flash from every copy
  if (!barrelSilent(e, 0)) { krBeam(e, tl, KIR.dmg); krShot(e); }
  yield 0.6;
}
function krBushSpot(e) { // a bush the hull fits in, 4-10 tiles from the player (with a line to him if possible), near the boss
  const m = G.map, p = G.player, fit = bossFitMap(e); let best = null, bs = -1e9;
  for (let r = 0; r < m.n; r++) for (let c = 0; c < m.n; c++) {
    if (m.t[r * m.n + c] !== BUSH || !fit[r * m.n + c]) continue;
    const x = c * T + T / 2, y = r * T + T / 2, dp = Math.hypot(x - p.x, y - p.y), db = Math.hypot(x - e.x, y - e.y);
    if (dp < 3.5 * T || dp > 11 * T || db > 12 * T) continue;
    const sc = -Math.abs(dp - 6.5 * T) / T + (los(x, y, p.x, p.y) ? 3 : 0) - db / T * 0.35 + Math.random() * 1.2;
    if (sc > bs) { bs = sc; best = { x, y }; }
  }
  return best;
}
function* krHide(e) { // saklan: walk to a bush and wait in it (invisible), at most 4 s in all
  const kr = e.kr, p = G.player, g = krBushSpot(e);
  if (!g) { yield 0.4; return; }
  kr.goal = g; e.flowT = 0; kr.hid = 0;
  let t = 0, inT = 0;
  while (t < KIR.hideMax && inT < 1.8) {
    t += e.dt;
    if (G.map.at(e.x, e.y) === BUSH) { inT += e.dt; e.avx = e.avy = 0; } else bossMove(e, e.dt, 0);
    if (p.alive) e.turret = turnTo(e.turret, Math.atan2(p.y - e.y, p.x - e.x), e.spec.tTurn * e.dt);
    if (inT > 0 && e.distP < 3 * T) break; // the player walked up to the bush
    yield 0;
  }
  kr.goal = null; kr.hid = t; e.cool = Math.min(e.cool, 0.4); // out of cover: the next shot comes quickly
}
function* krEvade(e) { // kaçın: a quick run away from the player (1.3 s, 1.6x speed)
  const kr = e.kr; let a = krAway(e), re = 0;
  kr.boost = 1.6;
  for (let t = 0; t < 1.3; t += e.dt) {
    re -= e.dt; if (re <= 0) { re = 0.25; const b = krAway(e); if (b !== null) a = b; }
    if (a !== null) krSteer(e, a, e.dt, 1);
    if (e.canSee) e.turret = turnTo(e.turret, Math.atan2(G.player.y - e.y, G.player.x - e.x), e.spec.tTurn * 0.6 * e.dt);
    yield 0;
  }
  kr.boost = 1;
}
function* krFrost(e) { // don dalgası: a front line 1.5 s ahead (and the band it will cover), then the ground stays frosted for 6 s
  const kr = e.kr, m = G.map, dir = krFrontPick(e), th = T * 0.7;
  const line = { kind: 'line', dur: KIR.frontLine, lock: 0.3, w: th, rgb: '150,215,255', nodanger: true, front: true, len: dir < 2 ? m.h : m.w };
  if (dir === 0) Object.assign(line, { x: th / 2, y: 0, a: Math.PI / 2 }); else if (dir === 1) Object.assign(line, { x: m.w - th / 2, y: 0, a: Math.PI / 2 });
  else if (dir === 2) Object.assign(line, { x: 0, y: th / 2, a: 0 }); else Object.assign(line, { x: 0, y: m.h - th / 2, a: 0 });
  const tl = addTele(e, line); kr.front = { dir, pos: 0, active: false, depth: KIR.frontDepth };
  Sound.warnRise(volAt(e.x, e.y)); addText(e.x, e.y - e.r - 26, 'DON DALGASI', '#9fd8ff', 20);
  while (tl.t < tl.dur) { aimAtPlayer(e, e.dt, 0.8, 0); yield 0; }
  release(e, 'don', tl); removeTele(tl);
  kr.front.active = true; shake(5); Sound.boom(1, 1);
  for (let t = 0; kr.front && t < 3; t += e.dt) yield 0;
  yield 0.4;
}

/* ---- definition ---- */
BOSS_DEFS.kiragi = {
  id: 'kiragi', name: 'KIRAĞI', arena: 'gol', introSub: 'Donmuş Göl', hold: 9, lead: 0, phases: [66, 33], plates: ['plate', 'fender'], r: KIR_SPEC.r,
  deathText: 'KIRAĞI ERİDİ', loot: 'KIRAĞI GANİMETİ',
  barrels: [{ id: 'm', name: 'Namlu', ang: 0, k: 0.07 }],
  hp: w => Math.round(1800 + (w - 30) * 45),
  attacks: [
    { id: 'keskin', w: 4, ok: e => e.canSee && e.distP < 15 * T, run: krSharp },
    { id: 'saklan', w: 2.4, ok: e => e.distP > 4 * T, run: krHide, mov: true, cd: 8 },
    { id: 'kacin', w: 2, ok: e => e.distP < 7 * T, run: krEvade, mov: true, cd: 5 },
    { id: 'cift', w: 3, ok: e => e.phase >= 1 && e.canSee && e.distP < 15 * T, run: krDouble },
    { id: 'suret', w: 3, ok: e => e.phase >= 1 && e.canSee, run: krDecoys, cd: 12 },
    { id: 'don', w: 6, ok: e => e.phase >= 2, run: krFrost, cd: 10 }
  ],
  setup(e, w) {
    e.spec = Object.assign({}, SPECS.boss, KIR_SPEC); e.r = KIR_SPEC.r; e.pace = 1; e.noTreads = true;
    const lake = []; for (let r = 0; r < G.map.n; r++) for (let c = 0; c < G.map.n; c++) if (G.map.t[r * G.map.n + c] === WATER) lake.push({ c, r });
    e.kr = { a: 1, inv: false, open: 0, lock: 0, shot: 0, force: 0, trail: [], dtrail: [], dec: [], decSeq: 0, frost: new Float32Array(G.map.n * G.map.n), front: null, beams: [], slowT: 0, pSlow: 0, goal: null, boost: 1, side: 1, sideT: 0,
      lake, lakeOpen: false, lakeT: 0, loop2: w > 40, fakeAim: false, gen: false, lx: e.x, ly: e.y, hid: 0 };
  },
  onPhase(e, i) {
    if (i === 1) addText(e.x, e.y - e.r - 54, 'SURETLER', '#7ef0d0', 18);
    if (i === 2) { // Ayaz: the lake freezes and can be crossed
      const m = G.map, kr = e.kr; kr.lakeOpen = true; kr.lakeT = 1.6;
      for (const q of kr.lake) { const j = q.r * m.n + q.c; if (m.t[j] === WATER) { m.t[j] = EMPTY; m.hp[j] = 0; miniTile(m, q.c, q.r); } }
      m.flowDirty = true; paintRegion(m, 0, 0, m.n - 1, m.n - 1);
      addText(e.x, e.y - e.r - 54, 'AYAZ: GÖL DONDU', '#9fd8ff', 18); Sound.crumble(1);
    }
  },
  tick: krTick,
  move: krMove,
  flowGoal: e => e.kr.goal,
  onClear(e) { const kr = e.kr; kr.front = null; kr.fakeAim = false; kr.goal = null; kr.boost = 1; if (kr.dec.length) krClearDecoys(e, false); },
  vis: e => (e.kr ? Math.max(e.kr.a, e.flash > 0 ? 0.55 : 0) : 1),
  draw: (e, g, alpha) => drawKiragi(e, g, alpha),
  drawGround: (e, g) => drawKiragiGround(e, g),
  drawTop: (e, g) => drawKiragiTop(e, g)
};
BOSS_ON[30] = 'kiragi';
