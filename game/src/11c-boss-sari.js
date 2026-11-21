/* ================= Sarı Fırtına (docs/BOSSES.md section 4) ================= */
// Çöl's boss, the fast one: circles the player and fires bursts, then charges along a red line that breaks bricks; steel (or the map edge) stuns it.
// Phase 2: exhausts light up (+15% speed), double charge, sand strips left on the charge path. Phase 3 "Fırtına": wind every 12 s, triple charge.
// Per-boss state lives in e.sari; the generic hooks it uses in 11a: def.tick (every frame), def.danger (bot), def.onClear, def.drawGround (15a).
ARENAS.kum = { name: 'Kum Çukuru', gate: [[9, 4], [10, 4], [11, 4]], rows: [ // the brick wall in front of the boss is the gate: the intro smashes it
  'SS.................SS',
  'SS.................SS',
  '..........X..........',
  '.....................',
  '....S...SBBBS...S....',
  '.....................',
  '.....................',
  '.....................',
  '....S...S...S...S....',
  'GG.................GG',
  'WW........S........WW',
  'GG.................GG',
  '....S...S...S...S....',
  '.....................',
  '.....................',
  '.....................',
  '....S...SBBBS...S....',
  '.....................',
  '.....................',
  'SS........P........SS',
  'SS.................SS'] };

const SARI_CHARGE_LEN = 9 * T;   // a charge covers this far (more with the wind) unless steel is in the way
const SARI_RAM_DMG = 30;       // a clean hit; the double and triple charge can hit again
const SARI_RUSH = 650;           // charge speed, px/s
const SARI_SAND_LIFE = 4, SARI_SAND_SLOW = 0.35, SARI_SAND_W = 64;
const SARI_WIND_WARN = 1.5, SARI_WIND_BLOW = 5, SARI_WIND_EVERY = 12, SARI_WIND_PUSH = 75;
const SARI_SPEC = { speed: 175, turn: 5, tTurn: 5.5, len: 72, wid: 48, r: 27, tread: 9, tR: 12, barrel: 44, bW: 8, cool: 1, bSpeed: 450, dmg: 4, bR: 5, mass: 3, score: 1500,
  col: { body: '#cf9f30', dk: '#8c691b', hi: '#efca60', acc: '#f08a2c' } };

const sariWindVec = e => { const W = e.sari.wind; return W.st === 'blow' ? { x: Math.cos(W.a) * SARI_WIND_PUSH, y: Math.sin(W.a) * SARI_WIND_PUSH } : null; };
const sariSegDist = (q, x, y) => { // distance from (x, y) to the strip's centre line
  const dx = q.x2 - q.x1, dy = q.y2 - q.y1, l2 = dx * dx + dy * dy, t = l2 > 1 ? clamp(((x - q.x1) * dx + (y - q.y1) * dy) / l2, 0, 1) : 0;
  return Math.hypot(x - (q.x1 + dx * t), y - (q.y1 + dy * t));
};
// how far a charge goes: a tailwind carries it farther
function sariChargeLen(e) {
  const w = sariWindVec(e); if (!w) return SARI_CHARGE_LEN;
  return SARI_CHARGE_LEN * (1 + 0.45 * Math.max(0, Math.cos(e.angle - e.sari.wind.a)));
}

/* ---- attacks ---- */
function sariOrbit(e, st, dt, R) { // circle the player at about R px, tangent plus a radial correction; a blocked boss turns around
  const p = G.player, s = e.spec, ang = Math.atan2(e.y - p.y, e.x - p.x), d = Math.hypot(e.x - p.x, e.y - p.y), tang = ang + st.sign * Math.PI / 2;
  const rad = clamp((d - R) / (2 * T), -1, 1);
  const hx = Math.cos(tang) - Math.cos(ang) * rad * 1.2, hy = Math.sin(tang) - Math.sin(ang) * rad * 1.2;
  if (e.treadT > 0) return; // a broken tread: the boss stands still (it still turns its turret in the callers)
  const des = Math.atan2(hy, hx), before = e.angle, ox = e.x, oy = e.y;
  e.angle = turnTo(e.angle, des, s.turn * dt);
  const diff = Math.abs(angDiff(e.angle, des)), spd = diff < 0.8 ? s.speed * e.speedMul * (1 - diff * 0.5) : s.speed * e.speedMul * 0.25;
  moveTank(e, Math.cos(e.angle) * spd * dt, Math.sin(e.angle) * spd * dt);
  const moved = Math.hypot(e.x - ox, e.y - oy);
  trackUpdate(e, moved, angDiff(before, e.angle));
  st.stuck = moved < spd * dt * 0.35 ? st.stuck + dt : 0;
  if (st.stuck > 0.3) { st.sign = -st.sign; st.stuck = 0; }
}
function* sariShots(e) { // çevik atış: two bursts of three shots while circling 5-7 tiles from the player; each burst warned by a 0.45 s glow
  const st = { sign: Math.random() < 0.5 ? 1 : -1, stuck: 0 }, R = rand(5, 7) * T;
  for (let b = 0; b < 2; b++) {
    for (let t = 0; t < (b ? 0.5 : 0.9); t += e.dt) { sariOrbit(e, st, e.dt, R); aimAtPlayer(e, e.dt, 1.4, e.lead); yield 0; }
    const tl = addTele(e, { kind: 'glow', dur: 0.45, fan: [0] });
    while (tl.t < tl.dur) { sariOrbit(e, st, e.dt, R); aimAtPlayer(e, e.dt, 1.8, e.lead); yield 0; }
    release(e, 'cevik', tl); removeTele(tl);
    for (let k = 0; k < 3; k++) {
      bossVolley(e, [0]);
      for (let t = 0; t < 0.13; t += e.dt) { sariOrbit(e, st, e.dt, R); aimAtPlayer(e, e.dt, 1.8, e.lead); yield 0; }
    }
  }
  yield 0.2;
}
// one charge: red line (1 s, the first two of the fight 1.3 s; the last 0.3 s locked), the rush, a stun when steel stopped it. Returns true when stunned.
function* sariRush(e) {
  const p = G.player, S = e.sari, margin = e.r + 4, m = G.map, dur = S.chargeN < 2 ? 1.3 : 1.0;
  S.chargeN++;
  const tl = addTele(e, { kind: 'line', dur, lock: 0.3, x: e.x, y: e.y, a: e.angle, len: SARI_CHARGE_LEN, w: 2 * (e.r + 8) });
  Sound.warnRise(volAt(e.x, e.y));
  while (tl.t < tl.dur) {
    if (tl.t < tl.dur - tl.lock) e.angle = turnTo(e.angle, Math.atan2(p.y - e.y, p.x - e.x), 4.6 * e.dt);
    e.turret = e.angle;
    tl.x = e.x; tl.y = e.y; tl.a = e.angle; tl.len = rayClip(e.x, e.y, e.angle, sariChargeLen(e), margin);
    yield 0;
  }
  release(e, 'hucum', tl);
  const ca = Math.cos(e.angle), sa = Math.sin(e.angle), plan = tl.len, clipped = plan < sariChargeLen(e) - 1;
  const strip = e.phase >= 1 ? { x1: e.x, y1: e.y, x2: e.x, y2: e.y, w: SARI_SAND_W, t: -1 } : null; // Kum izi: grows behind the boss, fades 4 s after the charge ends
  if (strip) S.sand.push(strip);
  let trav = 0, hurt = false;
  Sound.crumble(volAt(e.x, e.y) * 0.6);
  while (trav < plan) {
    const step = Math.min(SARI_RUSH * e.speedMul * e.dt, plan - trav);
    for (const [fa, lat] of [[e.r + 8, 0], [e.r + 6, 20], [e.r + 6, -20]]) { // flatten the bricks in front
      const bx = e.x + ca * fa - sa * lat, by = e.y + sa * fa + ca * lat;
      if (m.at(bx, by) === BRICK) { destroyBrick(m, Math.floor(bx / T), Math.floor(by / T), volAt(bx, by)); shake(3); }
    }
    const ox = e.x, oy = e.y;
    moveTank(e, ca * step, sa * step);
    const moved = Math.hypot(e.x - ox, e.y - oy);
    trackUpdate(e, moved, 0); trav += moved;
    if (strip) { strip.x2 = e.x - ca * e.r * 0.6; strip.y2 = e.y - sa * e.r * 0.6; }
    if (fxScale === 1) for (let k = 0; k < 2; k++) addPart('dust', e.x - ca * e.r + rand(-6, 6), e.y - sa * e.r + rand(-18, 18), -ca * rand(40, 120) + rand(-30, 30), -sa * rand(40, 120) + rand(-30, 30), rand(0.4, 0.8), rand(14, 24), 26, 2);
    if (!hurt && p.alive && dist2(e.x, e.y, p.x, p.y) < (e.r + p.r + 2) * (e.r + p.r + 2)) { // ağır hasar + geri itme
      hurt = true; damagePlayer({ x: p.x, y: p.y, dmg: bossDmg(SARI_RAM_DMG), owner: 1, vx: 0, vy: 0 });
      const side = (p.x - e.x) * -sa + (p.y - e.y) * ca < 0 ? -1 : 1;
      moveTank(p, -sa * 64 * side + ca * 30, ca * 64 * side + sa * 30); shake(9); vibrate(40);
    }
    if (moved < step * 0.35) break; // jammed against something
    yield 0;
  }
  removeTele(tl);
  if (strip) strip.t = 0;
  if (clipped || trav < plan - 6) { // steel or the edge: stunned (shorter in the storm phase)
    e.stunT = e.phase >= 2 ? 1.8 : 2.5; shake(12); explode(e.x + ca * e.r, e.y + sa * e.r, 0.7); Sound.metal(volAt(e.x, e.y)); vibrate(30);
    addText(e.x, e.y - e.r - 14, 'SERSEMLEDİ', '#bfeaff', 18);
    for (let k = 0; k < 10; k++) addPart('dust', e.x + ca * e.r + rand(-14, 14), e.y + sa * e.r + rand(-14, 14), rand(-80, 80), rand(-80, 80), rand(0.5, 0.9), rand(14, 22), 26, 2);
    return true;
  }
  return false;
}
function* sariCharge(e) { yield* sariRush(e); yield 0.3; }
function* sariDouble(e) { // çift hücum: the second line appears the moment the first charge ends (a stun cancels it)
  for (let k = 0; k < 2; k++) if (yield* sariRush(e)) break;
  yield 0.3;
}
function* sariTriple(e) { // üçlü hücum
  for (let k = 0; k < 3; k++) if (yield* sariRush(e)) break;
  yield 0.3;
}

/* ---- per-frame hook: sand strips slow the player, the wind pushes tanks, the death scene ---- */
function sariTick(e, dt) {
  const S = e.sari, p = G.player;
  if (G.phase === 'bossIntro') { if (!S.snd) { S.snd = true; Sound.wind(1, 3.4); } return; }
  if (e.dying) {
    S.sand.length = 0; S.wind.st = 'idle';
    if (!S.boom && e.deathT >= 2.1) { // the last big blast, as the whirlwind dies down
      S.boom = true; explode(e.x, e.y, 1.7); addPart('flash', e.x, e.y, 0, 0, 0.3, 220, 0, 0); addPart('ring', e.x, e.y, 0, 0, 0.7, 20, 340, 0, '240,170,60');
      sparks(e.x, e.y, 30, '#ffd27a', 420); shake(18); Sound.boom(1.6, volAt(e.x, e.y)); vibrate([50, 30, 90]);
    }
    return;
  }
  if (e.trans > 0) return;
  // sand strips (age from the end of the charge)
  for (const q of S.sand) if (q.t >= 0) q.t += dt;
  if (S.sand.some(q => q.t >= SARI_SAND_LIFE)) S.sand = S.sand.filter(q => q.t < SARI_SAND_LIFE);
  S.slow = false;
  if (p.alive) for (const q of S.sand) if (sariSegDist(q, p.x, p.y) < q.w / 2 + p.r * 0.3) { S.slow = true; break; }
  if (S.slow) { // 35% slower: take back that share of this frame's movement
    moveTank(p, -p.avx * SARI_SAND_SLOW * dt, -p.avy * SARI_SAND_SLOW * dt); p.avx *= 1 - SARI_SAND_SLOW; p.avy *= 1 - SARI_SAND_SLOW;
    if (fxScale === 1 && Math.random() < dt * 14) addPart('dust', p.x + rand(-10, 10), p.y + rand(-10, 10), rand(-20, 20), rand(-30, -5), rand(0.4, 0.7), rand(8, 14), 22, 2);
  }
  // wind (phase 3): arrows 1.5 s ahead, then 5 s of push
  const W = S.wind;
  if (e.phase >= 2) {
    if (W.st === 'idle') {
      S.windT -= dt;
      if (S.windT <= 0) { W.st = 'warn'; W.t = 0; W.a = Math.floor(Math.random() * 8) * Math.PI / 4; Sound.wind(0.9, SARI_WIND_WARN + SARI_WIND_BLOW); addText(G.map.w / 2, 70, 'RÜZGÂR', '#f08a2c', 22); }
    } else {
      W.t += dt;
      if (W.st === 'warn' && W.t >= SARI_WIND_WARN) { W.st = 'blow'; W.t = 0; }
      else if (W.st === 'blow' && W.t >= SARI_WIND_BLOW) { W.st = 'idle'; W.t = 0; S.windT = SARI_WIND_EVERY - SARI_WIND_WARN - SARI_WIND_BLOW; }
    }
  }
  const wv = sariWindVec(e);
  if (wv) {
    if (p.alive) moveTank(p, wv.x * dt, wv.y * dt);
    moveTank(e, wv.x * dt, wv.y * dt);
    if (fxScale === 1 && Math.random() < dt * 40) { const m = G.map; addPart('dust', rand(0, m.w), rand(0, m.h), wv.x * 3.5, wv.y * 3.5, rand(0.5, 0.9), rand(10, 18), 20, 0); }
  }
  // the bot drives against the wind: it steers by (its own heading x speed) - wind, from the heading the autopilot last chose
  if (bot.on && p.alive) {
    if (!(bot.mx === S.omx && bot.my === S.omy)) { S.rmx = bot.mx; S.rmy = bot.my; }
    if (wv) { const sp = p.spec.speed, vx = S.rmx * sp - wv.x, vy = S.rmy * sp - wv.y, l = Math.hypot(vx, vy) || 1; bot.mx = vx / l; bot.my = vy / l; } else { bot.mx = S.rmx; bot.my = S.rmy; }
    S.omx = bot.mx; S.omy = bot.my;
  }
}

BOSS_DEFS.sari = {
  id: 'sari', lead: 0.35, name: 'SARI FIRTINA', arena: 'kum', introSub: 'Kum Çukuru', hold: 4, phases: [66, 33], plates: ['plate', 'fender'], r: SARI_SPEC.r,
  deathText: 'SARI FIRTINA DİNDİ', loot: 'SARI FIRTINA GANİMETİ',
  barrels: [{ id: 'main', name: 'Namlu', ang: 0, k: 0.1 }],
  hp: w => Math.round(620 + (w - 10) * 31), // 1.5.6: 460 + 23/wave -> 620 + 31/wave (the harder attacks should not end the fight in under 3 minutes)
  attacks: [
    { id: 'cevik', w: 3, ok: e => true, run: sariShots },
    { id: 'hucum', w: 3, ok: e => e.distP > 2.5 * T && e.phase < 2, run: sariCharge, mov: true },
    { id: 'cift', w: 3, ok: e => e.distP > 2.5 * T && e.phase >= 1, run: sariDouble, mov: true },
    { id: 'uclu', w: 3, ok: e => e.distP > 2.5 * T && e.phase >= 2, run: sariTriple, mov: true }
  ],
  setup(e, w) {
    e.spec = Object.assign({}, SPECS.boss, SARI_SPEC); e.r = SARI_SPEC.r; e.pace = 1.5;
    e.sari = { chargeN: 0, sand: [], wind: { st: 'idle', t: 0, a: 0 }, windT: 5, snd: false, boom: false, slow: false, omx: NaN, omy: NaN, rmx: 0, rmy: 0 };
  },
  onPhase(e, i) {
    if (i === 1) { e.speedMul *= 1.15; addText(e.x, e.y - e.r - 54, 'EGZOZLAR YANDI', '#f08a2c', 18); }
    if (i === 2) { e.sari.windT = 4; addText(e.x, e.y - e.r - 54, 'FIRTINA', '#f08a2c', 20); }
  },
  tick: sariTick,
  onClear(e) { const S = e.sari; S.sand.length = 0; if (S.wind.st !== 'idle') { S.wind.st = 'idle'; S.windT = Math.max(S.windT, 5); } },
  danger(e, x, y, pad) { for (const q of e.sari.sand) if (sariSegDist(q, x, y) < q.w / 2 + pad) return true; return false; },
  draw: (e, g, alpha) => drawSari(e, g, alpha),
  drawGround: (e, g) => drawSariGround(e, g)
};
BOSS_ON[10] = 'sari';
