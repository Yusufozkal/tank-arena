/* ================= Son Hisar (docs/BOSSES.md section 7) ================= */
// The last boss (wave 40, Şehir): a huge dark-grey fortress tank (120 x 110, r 52, speed 30) with twin long main guns, an amber core and two side cooling modules (each ~10% of the HP, own parts in e.parts).
// While both modules live the hull takes 30% of the damage (hullMul) and cannot drop below 62% (tick), so phase 1 always ends by breaking them (def.phaseAt). Per-boss state lives in e.sh.
// Phase 1 "Kuşatma" (until both modules are broken): Ağır top (two slow shells, glow 0.8 s), Havan yağmuru (6 circles).
// Phase 2 "Nişancı" (to 60%): Çift lazer (two amber lines 1 s, last 0.3 s locked), Üçlü yelpaze; the phase-1 attacks stay.
// Phase 3 "Hücum" (60-30%): Sokak hücumu (red line 1.2 s, flattens barricades; steel = 2 s stun and 3 temporary brick heaps) and a 3.5-tile Şok dalgası after every charge.
// Phase 4 "Son direniş" (30-0%): it walks to the square (tile 10, 8) and stays; the core opens (double damage), Döner ateş (the twin guns sweep 360 degrees), a Şok dalgası + Havan every 8 s; the attack pauses are 25% shorter.
// Death: a long chain of explosions in slow motion, "SON HİSAR DÜŞTÜ". After it the game goes on in İkinci Tur (13 nextWave): bosses of the next round have ROUND_K times HP and damage (11a spawnBoss).
// Hooks used from 11a: def.phaseAt, def.tick, def.move, def.flowGoal, def.hullMul, def.danger, def.onPhase, def.onPartBreak, def.onClear, def.onDeath, def.deathLen, def.drawGround.
ARENAS.sehir = { name: 'Şehir Meydanı', rows: [ // steel blocks are 0 or >= 3 tiles apart and from the edge; the middle is the open square (with a brick barricade) where phase 4 is fought; a barricade anywhere in the edge streets would wall off a pocket the hull cannot enter
  'SSS...SSS...SSS...SSS',
  'SSS...SSS...SSS...SSS',
  'SSS...SSS...SSS...SSS',
  '.....................',
  '..........X..........',
  '.....................',
  'SSS...SS.....SS...SSS',
  'SSS...SS.....SS...SSS',
  'SSS...............SSS',
  '.....................',
  '.........BBB.........',
  '.....................',
  'SSS...............SSS',
  'SSS...SS.....SS...SSS',
  'SSS...SS.....SS...SSS',
  '.....................',
  '..........P..........',
  '.....................',
  'SSS...SSS...SSS...SSS',
  'SSS...SSS...SSS...SSS',
  'SSS...SSS...SSS...SSS'] };

const SH_SPEC = { speed: 30, turn: 1.3, tTurn: 2.3, len: 120, wid: 110, r: 52, tread: 16, tR: 30, barrel: 86, bW: 12, cool: 1, bSpeed: 380, dmg: 5, bR: 7, mass: 20, score: 8000,
  col: { body: '#4a4e55', dk: '#2c2f34', hi: '#7a808a', acc: '#f2a530' } };
const SH_AMBER = '242,165,48';
const SH = { gun: 14, modHp: 0.08, hullK: 0.3, floor: 0.62, coreK: 2, ramDmg: 30, charge: 7 * T, chargeSpd: 360, shockR: 3.5 * T, shockDmg: 14, mortarDmg: 7, laser: 5.5, beamW: 14, spin: 2.2, spinT: 2.9, spinEvery: 0.16,
  debLife: 14, debN: 3, fast: 0.75, hullFloor: 0.7 };

/* ---- helpers ---- */
const shAlive = e => e.parts.filter(q => q.alive).length;
const shMuz = (e, side, ang) => { const a = ang === undefined ? e.turret : ang; return { x: e.x - Math.sin(a) * side * SH.gun, y: e.y + Math.cos(a) * side * SH.gun }; };
function shFire(e, side, ang, o) { const q = shMuz(e, side); bossShell(e, ang, Object.assign({ x: q.x, y: q.y, len: e.spec.barrel }, o)); }
function shRecoil(e, k) {
  e.recoil = 1; const ca = Math.cos(e.turret), sa = Math.sin(e.turret);
  for (const side of [-1, 1]) { const q = shMuz(e, side), mx = q.x + ca * (e.spec.barrel + 4), my = q.y + sa * (e.spec.barrel + 4); addPart('fire', mx, my, ca * 70, sa * 70, 0.1, 24, 40, 0); addPart('smoke', mx, my, ca * 40 + rand(-10, 10), sa * 40 + rand(-10, 10), rand(0.5, 0.9), 16, 30, 3); }
  moveTank(e, -ca * 0.8, -sa * 0.8); shake((k || 3) * prox(e.x, e.y)); Sound.shoot(false, true, volAt(e.x, e.y));
}
function shRay(x, y, a, max) { const m = G.map, ca = Math.cos(a), sa = Math.sin(a); for (let d = 8; d < max; d += 8) if (isWall(m.at(x + ca * d, y + sa * d))) return d; return max; }
function shAimLine(tl, e, side, a) { const q = shMuz(e, side, e.turret), mx = q.x + Math.cos(e.turret) * e.spec.barrel, my = q.y + Math.sin(e.turret) * e.spec.barrel; tl.x = mx; tl.y = my; tl.a = a; tl.len = shRay(mx, my, a, 17 * T); }
function shBeam(e, tl, dmg) { // the strike behind an amber line: an instant beam along the locked line
  const p = G.player, ca = Math.cos(tl.a), sa = Math.sin(tl.a), len = tl.len;
  e.sh.beams.push({ x: tl.x, y: tl.y, a: tl.a, len, t: 0.26 });
  sparks(tl.x, tl.y, 6, '#ffd89a', 220, tl.a, 0.6); sparks(tl.x + ca * len, tl.y + sa * len, 8, '#ffd89a', 220);
  if (p.alive) {
    const dx = p.x - tl.x, dy = p.y - tl.y, al = dx * ca + dy * sa, pr = -dx * sa + dy * ca;
    if (al > -10 && al < len + p.r && Math.abs(pr) < SH.beamW / 2 + p.r * 0.75) damagePlayer({ x: p.x, y: p.y, dmg: bossDmg(dmg), owner: 1, vx: ca * 400, vy: sa * 400 });
  }
}
function shShockBlast(e) { // the ring hits everything inside it that no steel shields
  const p = G.player, R = e.sh.shockRadius || SH.shockR;
  addPart('ring', e.x, e.y, 0, 0, 0.55, 24, R * 2.1, 0, '255,200,120'); addPart('flash', e.x, e.y, 0, 0, 0.22, 170, 0, 0); shake(14); Sound.boom(1.3, volAt(e.x, e.y));
  if (p.alive && dist2(e.x, e.y, p.x, p.y) < (R + p.r) * (R + p.r) && !steelBetween(e.x, e.y, p.x, p.y)) {
    damagePlayer({ x: p.x, y: p.y, dmg: bossDmg(SH.shockDmg), owner: 1, vx: 0, vy: 0 });
    const a = Math.atan2(p.y - e.y, p.x - e.x); moveTank(p, Math.cos(a) * 48, Math.sin(a) * 48);
  }
}
// temporary brick heaps (after a charge into steel): empty tiles near the impact, away from the hull and the player; they crumble after SH.debLife s (or when shot)
function shDebris(e, ix, iy) {
  const m = G.map, n = m.n, p = G.player, cand = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (m.t[r * n + c] !== EMPTY) continue;
    const x = c * T + T / 2, y = r * T + T / 2, di = Math.hypot(x - ix, y - iy);
    if (di > 3.2 * T || Math.hypot(x - e.x, y - e.y) < e.r + T * 0.9 || Math.hypot(x - p.x, y - p.y) < 1.8 * T) continue;
    if (e.sh.deb.some(q => q.c === c && q.r === r)) continue;
    cand.push({ c, r, s: di + Math.random() * T });
  }
  cand.sort((a, b) => a.s - b.s);
  for (const q of cand.slice(0, SH.debN)) {
    const i = q.r * n + q.c; m.t[i] = BRICK; m.hp[i] = BRICK_HP; m.flowDirty = true; miniTile(m, q.c, q.r); paintRegion(m, q.c - 1, q.r - 1, q.c + 1, q.r + 1);
    e.sh.deb.push({ c: q.c, r: q.r, t: 0 });
    const x = q.c * T + T / 2, y = q.r * T + T / 2;
    for (let k = 0, nk = Math.max(3, Math.round(8 * fxScale)); k < nk; k++) { const a = rand(0, TAU), v = rand(60, 180); addPart('debris', x, y, Math.cos(a) * v, Math.sin(a) * v, rand(0.5, 0.9), rand(3, 6), 0, 3.5, k & 1 ? m.theme.brick : m.theme.brickDk); }
  }
}
function shTick(e, dt) {
  const sh = e.sh, m = G.map;
  for (const b of sh.beams) b.t -= dt;
  if (sh.beams.length && sh.beams[0].t <= 0) sh.beams = sh.beams.filter(b => b.t > 0);
  for (let i = sh.deb.length - 1; i >= 0; i--) { // brick heaps expire
    const q = sh.deb[i]; q.t += dt;
    if (m.t[q.r * m.n + q.c] !== BRICK) { sh.deb.splice(i, 1); continue; }
    if (q.t > SH.debLife) { destroyBrick(m, q.c, q.r, volAt(q.c * T, q.r * T)); sh.deb.splice(i, 1); }
  }
  if (G.phase === 'bossIntro') return;
  if (e.gen && e.phase < 3 && e.atkId !== 'hucum' && G.phase === 'fight' && e.trans <= 0 && !e.dying && !(e.stunT > 0) && !e.invuln) bossMove(e, dt, e.def.hold); // the hull is slow and the attacks long: it keeps walking while it shoots (not during a charge)
  sh.fan = (sh.fan + dt * (sh.spin ? 14 : 3)) % TAU; // the cooling fans of the modules spin (fast during the sweep), stop once a module is broken
  if (e.phase >= 3 && !e.dying) sh.core = Math.min(1, sh.core + dt * 1.2); // the core hatch slides open
  if (!e.dying && shAlive(e) > 0 && e.hp < e.maxHp * SH.floor) e.hp = e.maxHp * SH.floor; // the hull cannot fall below the phase-2 mark while a module lives
  if (e.dying) { // a long chain of blasts in slow motion, one huge blast at the end
    if (G.phase !== 'dying') G.timeScale = e.deathT < 1.7 ? 0.4 : 1; sh.core = 1;
    sh.boomT -= dt;
    if (sh.boomT <= 0 && e.deathT < SH.deathLen - 0.3) {
      sh.boomT = 0.11; const a = e.angle, lx = rand(-60, 60), ly = rand(-55, 55), x = e.x + Math.cos(a) * lx - Math.sin(a) * ly, y = e.y + Math.sin(a) * lx + Math.cos(a) * ly;
      explode(x, y, rand(0.6, 1.1)); sparks(x, y, 10, '#ffd27a', 300); if (Math.random() < 0.4) { addPart('flash', x, y, 0, 0, 0.14, 80, 0, 0); shake(6); Sound.boom(0.8, volAt(x, y)); }
    }
    if (!sh.big && e.deathT >= SH.deathLen - 0.35) { sh.big = true; explode(e.x, e.y, 2.4); addPart('flash', e.x, e.y, 0, 0, 0.4, 300, 0, 0); addPart('ring', e.x, e.y, 0, 0, 0.9, 20, 480, 0, '255,200,120'); sparks(e.x, e.y, 40, '#ffd27a', 480); shake(22); Sound.boom(2, volAt(e.x, e.y)); vibrate([60, 30, 100]); }
  }
}
const shCenter = () => { const m = G.map; return { x: m.n * T / 2, y: m.n * T / 2 - 2 * T }; }; // the square's open ground north of the barricade (tile 10, 8)

/* ---- attacks ---- */
function* shHeavy(e) { // ağır top: both guns glow 0.8 s, then two big slow shells (never leave the aim: it follows the player)
  yield* glowAim(e, 'agir', 0.8, [0]);
  for (const side of [-1, 1]) shFire(e, side, e.turret, { dmgK: 1.5, speed: 0.65 });
  shRecoil(e, 6); yield 0.9;
}
function* shMortar(e) { // havan yağmuru: six circles over and around the player (fall over walls)
  const p = G.player, m = G.map, circ = [];
  Sound.warnRise(volAt(e.x, e.y)); addText(e.x, e.y - e.r - 26, 'HAVAN', '#f2a530', 18);
  for (let i = 0; i < 6; i++) {
    const a = i * TAU / 6 + rand(-0.4, 0.4), d = i < 2 ? rand(0, 50) : rand(90, 190);
    circ.push(addTele(e, { kind: 'circle', r: 56, x: clamp(p.x + Math.cos(a) * d, T, m.w - T), y: clamp(p.y + Math.sin(a) * d, T, m.h - T) }));
  }
  while (circ[0].t < circ[0].dur) { aimAtPlayer(e, e.dt, 0.5); yield 0; }
  for (const tl of circ) { release(e, 'havan', tl); removeTele(tl); bossBlast(tl.x, tl.y, 56, SH.mortarDmg); yield 0.05; }
  yield 0.5;
}
function* shLasers(e) { // çift lazer: two amber lines (one per gun, slightly apart), 1 s, the last 0.3 s locked; then two instant beams
  const a = addTele(e, { kind: 'line', dur: 1.0, lock: 0.3, x: e.x, y: e.y, a: e.turret, len: 0, w: SH.beamW, rgb: SH_AMBER }), b = addTele(e, { kind: 'line', dur: 1.0, lock: 0.3, x: e.x, y: e.y, a: e.turret, len: 0, w: SH.beamW, rgb: SH_AMBER });
  const gl = addTele(e, { kind: 'glow', dur: 1.0 }); let base = e.turret;
  Sound.warnRise(volAt(e.x, e.y));
  while (a.t < a.dur) {
    if (a.t < a.dur - a.lock) { aimAtPlayer(e, e.dt, 1.2, e.lead); base = e.turret; }
    shAimLine(a, e, -1, base - 0.05); shAimLine(b, e, 1, base + 0.05); yield 0;
  }
  release(e, 'lazer', a); release(e, 'lazer', b); removeTele(gl); removeTele(a); removeTele(b);
  shBeam(e, a, SH.laser); shBeam(e, b, SH.laser); shRecoil(e, 5); yield 0.6;
}
const SH_FAN = [-0.26, 0, 0.26];
function* shFan(e) { // üçlü yelpaze: three shells from the middle at once, then again
  for (let k = 0; k < 2; k++) { yield* glowAim(e, 'yelpaze', 0.55, SH_FAN); bossVolley(e, SH_FAN, { dmgK: 1.1 }); yield 0.35; }
  yield 0.3;
}
function* shShock(e) { // şok dalgası: ring of 3.5 tiles, 1.2 s; steel in between protects
  const tl = addTele(e, { kind: 'ring', dur: 1.2, r: SH.shockR }); e.sh.shockRadius = SH.shockR;
  Sound.warnRise(volAt(e.x, e.y));
  while (tl.t < tl.dur) yield 0;
  release(e, 'sok', tl); removeTele(tl); shShockBlast(e); yield 0.3;
}
function* shCharge(e) { // sokak hücumu: red line 1.2 s (last 0.3 s locked), then a 7-tile rush that breaks barricades; steel = 2 s stun + brick heaps; a shock ring follows every charge
  const p = G.player, m = G.map, margin = e.r + 4;
  const tl = addTele(e, { kind: 'line', dur: 1.2, lock: 0.3, x: e.x, y: e.y, a: e.angle, len: SH.charge, w: 2 * (e.r + 10) });
  Sound.warnRise(volAt(e.x, e.y)); addText(e.x, e.y - e.r - 26, 'HÜCUM', '#ff7a5c', 20);
  while (tl.t < tl.dur) {
    if (tl.t < tl.dur - tl.lock) e.angle = turnTo(e.angle, Math.atan2(p.y - e.y, p.x - e.x), 2.2 * e.dt);
    aimAtPlayer(e, e.dt);
    tl.x = e.x; tl.y = e.y; tl.a = e.angle; tl.len = rayClip(e.x, e.y, e.angle, SH.charge, margin);
    yield 0;
  }
  release(e, 'hucum', tl);
  const ca = Math.cos(e.angle), sa = Math.sin(e.angle), plan = tl.len, clipped = plan < SH.charge - 1;
  let trav = 0, hurt = false;
  while (trav < plan) {
    const step = Math.min(SH.chargeSpd * e.dt, plan - trav);
    for (const [fa, lat] of [[e.r + 10, 0], [e.r + 8, e.r * 0.6], [e.r + 8, -e.r * 0.6], [e.r + 4, e.r * 0.95], [e.r + 4, -e.r * 0.95]]) { // barricades in front fall
      const bx = e.x + ca * fa - sa * lat, by = e.y + sa * fa + ca * lat;
      if (m.at(bx, by) === BRICK) { destroyBrick(m, Math.floor(bx / T), Math.floor(by / T), volAt(bx, by)); shake(5); }
    }
    const ox = e.x, oy = e.y; moveTank(e, ca * step, sa * step);
    const moved = Math.hypot(e.x - ox, e.y - oy); trackUpdate(e, moved, 0); trav += moved;
    if (fxScale === 1 && Math.random() < 0.7) addPart('dust', e.x - ca * e.r, e.y - sa * e.r + rand(-20, 20), rand(-30, 30), rand(-30, 30), rand(0.4, 0.9), rand(16, 26), 28, 2);
    if (!hurt && p.alive && dist2(e.x, e.y, p.x, p.y) < (e.r + p.r + 2) * (e.r + p.r + 2)) {
      hurt = true; damagePlayer({ x: p.x, y: p.y, dmg: bossDmg(SH.ramDmg), owner: 1, vx: 0, vy: 0 });
      moveTank(p, -sa * 40, ca * 40 * (Math.random() < 0.5 ? 1 : -1)); shake(9);
    }
    if (moved < step * 0.35) break; // jammed against something
    yield 0;
  }
  removeTele(tl);
  if (clipped || trav < plan - 6) { // slammed into steel: stunned for 2 s, rubble falls
    e.stunT = 2; shake(16); const ix = e.x + ca * e.r, iy = e.y + sa * e.r; explode(ix, iy, 0.9); sparks(ix, iy, 16, '#ffe3a1', 320); Sound.metal(volAt(e.x, e.y)); vibrate(40);
    addText(e.x, e.y - e.r - 14, 'SERSEMLEDİ', '#bfeaff', 18);
    shDebris(e, ix, iy);
  }
  while (e.stunT > 0) yield 0;
  yield* shShock(e);
}
function* shSpin(e) { // döner ateş: the twin guns sweep through 360 degrees firing a shell pair every 0.16 s; the first line shows where the sweep starts and which way it turns
  const sh = e.sh, p = G.player, dir = Math.random() < 0.5 ? 1 : -1;
  const tl = addTele(e, { kind: 'line', dur: 1.1, lock: 0.3, x: e.x, y: e.y, a: e.turret, len: 9 * T, w: 30 }), gl = addTele(e, { kind: 'glow', dur: 1.1 });
  Sound.warnRise(volAt(e.x, e.y)); addText(e.x, e.y - e.r - 26, 'DÖNER ATEŞ', '#ff7a5c', 20);
  while (tl.t < tl.dur) { if (tl.t < tl.dur - tl.lock) aimAtPlayer(e, e.dt, 1.6, 0); tl.x = e.x; tl.y = e.y; tl.a = e.turret; tl.len = shRay(e.x, e.y, e.turret, 9 * T); yield 0; }
  release(e, 'doner', tl); removeTele(tl); removeTele(gl);
  sh.spin = dir; let fire = 0;
  for (let t = 0; t < SH.spinT; t += e.dt) {
    e.turret += dir * SH.spin * e.dt; fire -= e.dt;
    if (fire <= 0) { fire = SH.spinEvery; for (const side of [-1, 1]) shFire(e, side, e.turret, { dmgK: 1, speed: 0.95 }); shRecoil(e, 2); }
    yield 0;
  }
  sh.spin = 0; yield 0.6;
}
function* shShockMortar(e) { // şok dalgası + havan together (every 8 s in the last phase): the ring and the circles fill side by side
  const p = G.player, m = G.map, circ = [], tl = addTele(e, { kind: 'ring', dur: 1.2, r: SH.shockR }); e.sh.shockRadius = SH.shockR;
  Sound.warnRise(volAt(e.x, e.y)); addText(e.x, e.y - e.r - 26, 'ŞOK + HAVAN', '#ff7a5c', 20);
  for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + rand(-0.4, 0.4), d = i < 2 ? rand(0, 50) : rand(100, 200); circ.push(addTele(e, { kind: 'circle', r: 56, x: clamp(p.x + Math.cos(a) * d, T, m.w - T), y: clamp(p.y + Math.sin(a) * d, T, m.h - T) })); }
  while (tl.t < tl.dur) { aimAtPlayer(e, e.dt, 0.5); yield 0; }
  release(e, 'sok', tl); removeTele(tl); shShockBlast(e);
  for (const c of circ) { release(e, 'havan', c); removeTele(c); bossBlast(c.x, c.y, 56, SH.mortarDmg); }
  yield 0.5;
}

/* ---- definition ---- */
BOSS_DEFS.sonhisar = {
  id: 'sonhisar', name: 'SON HİSAR', arena: 'sehir', introSub: 'Şehir Meydanı', hold: 5.5, lead: 0.3, phases: [0, 60, 30], plates: ['plate', 'shoulder', 'fender'], r: SH_SPEC.r,
  deathText: 'SON HİSAR DÜŞTÜ', loot: 'SON HİSAR GANİMETİ', deathLen: 4.2,
  hp: w => Math.round(1700 + (w - 40) * 30),
  attacks: [
    { id: 'agir', w: 3, ok: e => e.phase < 3 || e.canSee, run: shHeavy },
    { id: 'havan', w: 2.6, ok: e => e.phase < 3, run: shMortar, arc: true, cd: 6 },
    { id: 'lazer', w: 3.2, ok: e => e.phase >= 1 && e.canSee && e.distP < 16 * T, run: shLasers },
    { id: 'yelpaze', w: 2.6, ok: e => e.phase >= 1 && e.canSee, run: shFan },
    { id: 'hucum', w: 7, ok: e => e.phase === 2 && e.distP > 2.5 * T, run: shCharge, mov: true, cd: 5 },
    { id: 'doner', w: 3, ok: e => e.phase >= 3, run: shSpin, cd: 11 },
    { id: 'sokhavan', w: 100, ok: e => e.phase >= 3, run: shShockMortar, arc: true, cd: 8 }
  ],
  setup(e, w) {
    e.spec = Object.assign({}, SPECS.boss, SH_SPEC); e.r = SH_SPEC.r; e.pace = 1.1;
    const hp = Math.max(2, Math.round(e.maxHp * SH.modHp));
    for (const [id, oy] of [['ml', -36], ['mr', 36]]) e.parts.push({ id, name: 'Soğutma modülü', atk: '', ox: -8, oy, r: 19, maxHp: hp, hp, alive: true, flash: 0 });
    e.sh = { beams: [], deb: [], fan: 0, core: 0, spin: 0, boomT: 0, big: false, shockRadius: SH.shockR };
  },
  phaseAt(e, i) { return i === 0 ? shAlive(e) === 0 : e.hp / e.maxHp * 100 <= e.def.phases[i]; },
  onPhase(e, i) {
    if (i === 1) addText(e.x, e.y - e.r - 54, 'NİŞANCI', '#f2a530', 20);
    if (i === 2) addText(e.x, e.y - e.r - 54, 'HÜCUM', '#ff7a5c', 20);
    if (i === 3) { // Son direniş: it stops in the square, the core opens, everything comes 25% faster
      e.tune = Object.assign({}, e.tune, { gap: e.tune.gap * SH.fast }); e.cool = clamp(Math.hypot(e.x - shCenter().x, e.y - shCenter().y) / (SH_SPEC.speed * 3.5) + 0.5, 1, 6);
      addText(e.x, e.y - e.r - 54, 'SON DİRENİŞ', '#ff5a3c', 22); addText(e.x, e.y - e.r - 30, 'ÇEKİRDEK AÇILDI', '#f2a530', 16);
    }
  },
  onPartBreak(e, pt) { spawnPiece(e, 'shoulder', false); if (shAlive(e) === 1) addText(e.x, e.y - e.r - 40, 'BİR MODÜL DAHA', '#ffd27a', 15); },
  tick: shTick,
  onClear(e) { e.sh.spin = 0; },
  onDeath(e) { e.sh.spin = 0; e.sh.boomT = 0; },
  areaHit(e, dmg, quiet) { // flame, splash and lobbed shells: every living module takes the damage whole (the hull takes its share below)
    for (const q of e.parts) { if (!q.alive) continue; q.hp -= dmg; q.flash = 0.1; if (q.hp <= 0) breakPart(e, q); }
  },
  hullMul(e, x, y, dir, direct, quiet) {
    if (!direct && !quiet) return 1; // the nuke is a flat blow
    let k = shAlive(e) === 2 ? SH.hullK : 1; // both cooling modules alive: the hull takes 30%
    if (e.phase >= 3 && e.sh.core > 0.7) k *= SH.coreK; // the open core: double damage
    return k;
  },
  watchGoal: e => e.phase < 3, // the stuck watch of the probes: in the last phase it walks to the centre once and then stands
  flowGoal: e => (e.phase >= 3 ? shCenter() : null),
  move(e, dt) {
    const p = G.player;
    if (e.phase >= 3) { // Son direniş: it walks to the middle of the square and stays there
      const c = shCenter(), far = Math.hypot(e.x - c.x, e.y - c.y) > 0.5 * T;
      e.speedMul = far ? 4 : 1; // the hull is slow (30): the walk to the square is a quick one (the attacks wait for it, onPhase)
      if (far) bossMove(e, dt, 0); else e.avx = e.avy = 0;
    } else bossMove(e, dt, e.def.hold);
    if (p.alive && e.canSee) aimAtPlayer(e, dt, 1, e.lead); else e.turret = turnTo(e.turret, e.angle, e.spec.tTurn * 0.6 * dt);
  },
  danger(e, x, y, pad) { // the sweep: the wedge just ahead of the guns is dangerous where the shells reach
    const sw = e.sh.spin; if (!sw) return false;
    const dx = x - e.x, dy = y - e.y, d = Math.hypot(dx, dy); if (d > 17 * T) return false;
    const rel = angDiff(e.turret, Math.atan2(dy, dx)) * sw, pa = Math.atan2(pad + 14, Math.max(d, 1));
    if (!(rel > -pa - 0.2 && rel < 0.9 + pa)) return false;
    return d < e.r + 10 || los(e.x, e.y, x, y);
  },
  draw: (e, g, alpha) => drawSonhisar(e, g, alpha),
  drawGround: (e, g) => drawSonhisarGround(e, g)
};
SH.deathLen = BOSS_DEFS.sonhisar.deathLen;
BOSS_ON[40] = 'sonhisar';
