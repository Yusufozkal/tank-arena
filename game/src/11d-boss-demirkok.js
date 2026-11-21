/* ================= Demirkök (docs/BOSSES.md section 5) ================= */
// Orman's boss, the iron FORTRESS: a wide hull that plants at one of three mevzi (positions) and fights from there; two side turrets (while one lives the hull is shielded: half damage), a twin main gun.
// Phase 1 "Kale": both side turrets aim on their own (one straight at the player, one leading them), red eye 0.45 s each; heavy gun; every 8-10 s it rolls (never fires the heavy gun) to another mevzi, only over open ground.
// Phase 2 "Kök ağı": Kök fışkırması (a crack line 1 s, roots erupt along it and leave a steel-root wall ~6 s) and Deprem (only planted). Phase 3 "Kök salma": it plants at the castle centre for good,
// more and longer root walls (they split the arena), Döner ateş (360 degree sweep, red line 1 s ahead); the rear exhaust takes 1.5x damage. Second loop (wave > 40): the turrets rebuild once after 30 s, two crack lines in phase 2.
// Per-boss state lives in e.dk; generic hooks used from 11a: def.move (planted brain), def.tick, def.danger, def.onClear, def.hullMul, def.flowGoal, def.watchGoal, def.drawGround, e.rooted (treadT), bossShell origin.
ARENAS.kale = { name: 'Orman Kalesi', gate: [[9, 5], [10, 5], [11, 5]], rows: [ // the castle's north brick wall (gate) is smashed by the boss in the intro
  'GGG...............GGG',
  'GG.................GG',
  '..........X..........',
  '.....................',
  '....SS.........SS....',
  '....SSBBB...BBBSS....',
  '.....BSS.....SSB.....',
  '.....BSS.....SSB.....',
  '.....B.........B.....',
  'GG.................GG',
  'GG.................GG',
  'GG.................GG',
  '.....B.........B.....',
  '.....BSS.....SSB.....',
  '.....BSS.....SSB.....',
  '....SSBBB...BBBSS....',
  '....SS.........SS....',
  '.....................',
  '..........P..........',
  'GG.................GG',
  'GGG...............GGG'] };

const DEMIR_SPEC = { speed: 60, turn: 1.3, tTurn: 1.9, len: 110, wid: 96, r: 46, tread: 15, tR: 21, barrel: 74, bW: 9, cool: 1, bSpeed: 370, dmg: 6, bR: 6, mass: 12, score: 2500,
  col: { body: '#60656c', dk: '#3b3f44', hi: '#8c929a', acc: '#c9402d' } };
const DEMIR_RING = 4.5 * T, DEMIR_SWEEP_W = 1.1, DEMIR_BAR = 0.11; // twin barrels sit at +-DEMIR_BAR rad from the turret
const DEMIR_FAN = [-DEMIR_BAR, DEMIR_BAR];
const DEMIR_MEVZI = [[10, 2], [4, 10], [16, 10]]; // the three fixed positions (tile column, row): north (the gate it came through), west, east; phase 3 plants at the centre (10, 10)
const DEMIR_PLANT = [11, 13]; // seconds planted before it rolls to another mevzi
const DEMIR_LIFE2 = 6, DEMIR_LIFE3 = 9, DEMIR_ROOT_CAP = 16; // root wall life in phase 2 / phase 3 (s); most root tiles standing at once
const demirTile = (c, r) => ({ x: c * T + T / 2, y: r * T + T / 2 });
const demirLoop2 = () => G.wave > 40; // the second loop: the turrets rebuild once, two crack lines in phase 2

/* ---- shells ---- */
function demirTurretShot(e, pt) { // a single shell from a side turret along its own aim (pt.aim)
  const q = partPos(e, pt), a = pt.aim === undefined ? e.turret : pt.aim;
  bossShell(e, a, { x: q.x, y: q.y, len: 16, dmgK: 0.9 });
  const ca = Math.cos(a), sa = Math.sin(a);
  addPart('fire', q.x + ca * 16, q.y + sa * 16, ca * 60, sa * 60, 0.1, 18, 36, 0);
  for (let k = 0; k < 2; k++) addPart('smoke', q.x + ca * 14, q.y + sa * 14, ca * 36 + rand(-10, 10), sa * 36 + rand(-10, 10), rand(0.5, 0.8), 12, 24, 3);
  shake(1.5 * prox(e.x, e.y)); Sound.shoot(false, true, volAt(e.x, e.y) * 0.8);
}
function demirSoften(e, fan) { // the heavy shell breaks a brick in one hit: bricks right in front of the muzzle drop to 2 HP (a big shell takes 2)
  const m = G.map;
  for (const off of fan) for (let d = 6; d <= e.spec.barrel + 12; d += 6) {
    const bx = e.x + Math.cos(e.turret + off) * d, by = e.y + Math.sin(e.turret + off) * d;
    if (m.at(bx, by) === BRICK) { const i = Math.floor(by / T) * m.n + Math.floor(bx / T); m.hp[i] = Math.min(m.hp[i], 2); break; }
  }
}
function demirHeavyVolley(e) { // two big, slow shells
  demirSoften(e, DEMIR_FAN);
  const n0 = G.bullets.length;
  bossVolley(e, DEMIR_FAN, { speed: 0.55, dmgK: 1.7 });
  for (let i = n0; i < G.bullets.length; i++) { const b = G.bullets[i]; b.heavy = true; b.r *= 1.6; }
  shake(6);
}
function demirStreamShot(e, off) { // one shell of the rotating stream: light, small, does not smash bricks in two hits
  if (barrelSilent(e, off)) return;
  const n0 = G.bullets.length;
  bossShell(e, e.turret + off, { dmgK: 0.55 });
  for (let i = n0; i < G.bullets.length; i++) { const b = G.bullets[i]; b.big = false; b.r *= 0.8; }
  e.recoil = 0.6;
  const mx = e.x + Math.cos(e.turret + off) * (e.spec.barrel + 3), my = e.y + Math.sin(e.turret + off) * (e.spec.barrel + 3);
  addPart('fire', mx, my, 0, 0, 0.08, 14, 26, 0);
  if (Math.random() < 0.3) addPart('smoke', mx, my, rand(-14, 14), rand(-14, 14), rand(0.4, 0.7), 10, 22, 3);
}

/* ---- phase 1: Kale ---- */
// one turret's shot as a small state machine: 'direct' aims straight at the player, 'lead' ahead of their movement; the red eye (glow telegraph) shows 0.45 s, the aim locks for its last 0.12 s
function demirTurretJob(e, j, t) { // returns true once the shot is done (or the turret is gone)
  const pt = j.pt, p = G.player;
  if (!pt.alive) { if (j.tl) removeTele(j.tl); j.tl = null; pt.eye = 0; pt.busy = false; return true; }
  if (!j.tl) { if (t < j.delay) return false; j.tl = addTele(e, { kind: 'glow', dur: 0.45, pt: pt.id }); pt.busy = true; }
  if (j.tl.t < j.tl.dur - 0.12 && p.alive) {
    const q = partPos(e, pt), want = j.mode === 'lead' ? leadAng(q.x, q.y, e.spec.bSpeed, 1) : Math.atan2(p.y - q.y, p.x - q.x);
    pt.aim = turnTo(pt.aim, want, 3.4 * e.dt);
  }
  pt.eye = clamp(j.tl.t / j.tl.dur, 0, 1);
  if (j.tl.t < j.tl.dur) return false;
  release(e, 'taret', j.tl); removeTele(j.tl); j.tl = null; pt.eye = 0; pt.busy = false;
  demirTurretShot(e, pt); return true;
}
function* demirTurrets(e) { // taret ateşi: both side turrets, each with its own red eye (the second 0.3 s later); one aims straight at the player, the other leads them
  const dk = e.dk, rounds = e.phase >= 1 ? 5 : 4;
  for (let k = 0; k < rounds; k++) {
    let live = e.parts.filter(q => q.alive); if (!live.length) break;
    const flip = dk.side++ & 1; if (flip) live = live.slice().reverse();
    const jobs = live.map((pt, i) => ({ pt, delay: i * 0.3, tl: null, done: false, mode: live.length === 1 ? (flip ? 'lead' : 'direct') : (pt.id === 'tl' ? 'direct' : 'lead') }));
    for (let t = 0, open = true; open; ) {
      t += e.dt; open = false;
      for (const j of jobs) if (!j.done) { j.done = demirTurretJob(e, j, t); if (!j.done) open = true; }
      aimAtPlayer(e, e.dt, 0.5);
      if (open) yield 0;
    }
    yield 0.5;
  }
  yield 0.3;
}
function* demirHeavy(e) { // ağır top: both barrels glow 0.8 s, then two big slow shells (never while it rolls)
  e.dk.who = 'main';
  yield* glowAim(e, 'agir', 0.8, DEMIR_FAN);
  demirHeavyVolley(e);
  e.dk.who = ''; yield 0.9;
}

/* ---- moving between mevzi, planting ---- */
// rolls to tgt along open ground (the flow field of 11a: the hull never crushes a brick); turret: a side turret may still shoot now and then, the heavy gun never
function* demirGoto(e, tgt, turret) {
  const dk = e.dk, s = e.spec; dk.walk = true; dk.goal = tgt; e.flowT = 0; e.wp = null; e.jam = null; e.jamT = 0; e.jx = undefined; e.stuckT = 0; let fireT = rand(1.6, 2.6), job = null;
  for (let t = 0; t < 30; t += e.dt) {
    const d = Math.hypot(tgt.x - e.x, tgt.y - e.y); if (d <= 8) break;
    if (d < 1.4 * T) { // the last stretch: straight in
      const a = Math.atan2(tgt.y - e.y, tgt.x - e.x), before = e.angle, ox = e.x, oy = e.y, sp = Math.min(d, s.speed * e.speedMul * e.dt);
      e.angle = turnTo(e.angle, a, s.turn * e.dt); moveTank(e, Math.cos(a) * sp, Math.sin(a) * sp);
      trackUpdate(e, Math.hypot(e.x - ox, e.y - oy), angDiff(before, e.angle)); e.jamT = 0; e.jam = null;
    } else {
      bossMove(e, e.dt, 0);
      if (e.wp && Math.abs(angDiff(e.angle, Math.atan2(e.wp.y - e.y, e.wp.x - e.x))) > 0.4) { e.jamT = 0; e.jx = e.x; e.jy = e.y; e.stuckT = 0; } // turning in place (slowly) is not a jam
    }
    aimAtPlayer(e, e.dt, 0.7);
    if (turret) {
      if (job) { if (demirTurretJob(e, job, 1)) { job = null; fireT = rand(2.8, 3.8); } }
      else if ((fireT -= e.dt) <= 0) { const live = e.parts.filter(q => q.alive); if (live.length) job = { pt: pick(live), delay: 0, tl: null, mode: Math.random() < 0.5 ? 'lead' : 'direct' }; else fireT = 9; }
    }
    if (fxScale === 1 && Math.random() < e.dt * 6) addPart('dust', e.x - Math.cos(e.angle) * e.r, e.y - Math.sin(e.angle) * e.r + rand(-18, 18), rand(-20, 20), rand(-20, 20), rand(0.4, 0.8), rand(12, 20), 24, 2);
    yield 0;
  }
  if (job && job.tl) removeTele(job.tl);
  for (const pt of e.parts) { pt.busy = false; pt.eye = 0; }
  dk.walk = false; dk.goal = null; e.avx = e.avy = 0;
}
// the hull turns to the player and the roots go down; final: the phase 3 plant says so
function* demirPlant(e, final) {
  const dk = e.dk, s = e.spec, p = G.player, T0 = final ? 0.9 : 0.6;
  for (let t = 0; t < T0 || (final && t < 1.4 && p.alive && Math.abs(angDiff(e.angle, Math.atan2(p.y - e.y, p.x - e.x))) > 0.12); t += e.dt) {
    if (p.alive) { const before = e.angle; e.angle = turnTo(e.angle, Math.atan2(p.y - e.y, p.x - e.x), s.turn * e.dt); trackUpdate(e, 0, angDiff(before, e.angle)); }
    e.shake = 0;
    if (fxScale === 1 && Math.random() < 0.5) addPart('dust', e.x + rand(-e.r, e.r), e.y + rand(-e.r, e.r), rand(-40, 40), rand(-40, 40), rand(0.5, 0.9), rand(14, 22), 24, 2);
    aimAtPlayer(e, e.dt, 0.7); yield 0;
  }
  shake(final ? 14 : 8); Sound.boom(final ? 1.5 : 1.1, volAt(e.x, e.y)); explode(e.x, e.y + e.r * 0.5, final ? 0.6 : 0.35);
  yield final ? 0.5 : 0.3;
}
function* demirRelocate(e) { // mevzi değişimi: planted for 8-10 s, then it rolls to one of the other two mevzi (not one right next to the player)
  const dk = e.dk, p = G.player;
  let opts = DEMIR_MEVZI.map(([c, r], i) => Object.assign(demirTile(c, r), { i })).filter(o => o.i !== dk.at);
  const far = opts.filter(o => Math.hypot(o.x - p.x, o.y - p.y) > 4.5 * T); if (far.length) opts = far;
  const o = pick(opts); dk.at = -1;
  addText(e.x, e.y - e.r - 24, 'MEVZİ DEĞİŞTİRİYOR', '#e9b45a', 16);
  yield* demirGoto(e, o, true);
  yield* demirPlant(e, false);
  dk.at = o.i; dk.plantT = rand(DEMIR_PLANT[0], DEMIR_PLANT[1]);
}

/* ---- phase 2 ---- */
function* demirQuake(e) { // deprem: it stops and lifts, ring of 4.5 tiles 1.2 s, slam; steel in between protects, bricks inside lose 1 HP (planted only)
  const dk = e.dk, m = G.map, p = G.player, R = DEMIR_RING, tl = addTele(e, { kind: 'ring', dur: 1.2, r: R });
  Sound.warnRise(volAt(e.x, e.y));
  while (tl.t < tl.dur) { dk.lift = Math.min(1, tl.t / 1.0); if (fxScale === 1 && Math.random() < 0.3) addPart('dust', e.x + rand(-e.r, e.r), e.y + e.r * 0.8, rand(-20, 20), rand(10, 40), rand(0.5, 0.9), rand(10, 18), 22, 2); aimAtPlayer(e, e.dt, 0.4); yield 0; }
  release(e, 'deprem', tl); removeTele(tl);
  dk.lift = 0;
  addPart('ring', e.x, e.y, 0, 0, 0.55, 20, R * 2.1, 0, '210,200,170'); addPart('flash', e.x, e.y, 0, 0, 0.2, 160, 0, 0);
  for (let k = 0, n = Math.round(14 * fxScale); k < n; k++) { const a = k * TAU / n; addPart('dust', e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 60, Math.cos(a) * 180, Math.sin(a) * 180, rand(0.6, 1), rand(18, 28), 34, 1.5); }
  shake(16); Sound.boom(1.6, volAt(e.x, e.y)); vibrate([40, 30, 70]);
  if (p.alive && dist2(e.x, e.y, p.x, p.y) < (R + p.r) * (R + p.r) && !steelBetween(e.x, e.y, p.x, p.y)) {
    damagePlayer({ x: p.x, y: p.y, dmg: bossDmg(18), owner: 1, vx: 0, vy: 0 });
    const a = Math.atan2(p.y - e.y, p.x - e.x); moveTank(p, Math.cos(a) * 70, Math.sin(a) * 70);
  }
  for (let r = 0; r < m.n; r++) for (let c = 0; c < m.n; c++) { // bricks inside the ring: 1 HP less (steel between protects them too)
    const i = r * m.n + c; if (m.t[i] !== BRICK) continue;
    const x = c * T + T / 2, y = r * T + T / 2;
    if (dist2(e.x, e.y, x, y) > R * R || steelBetween(e.x, e.y, x, y)) continue;
    m.hp[i] = Math.max(0, m.hp[i] - 1);
    if (m.hp[i] === 0) destroyBrick(m, c, r, volAt(x, y)); else { paintRegion(m, c - 1, r - 1, c + 1, r + 1); Sound.brick(volAt(x, y)); }
  }
  yield 0.6;
}

/* ---- phase 3: Kök salma ---- */
const demirCentre = e => demirTile(10, 10);
function* demirRoot(e) { // walks to the castle centre and roots for good (the rear exhaust becomes the weak point)
  const dk = e.dk, c = demirCentre(e);
  Sound.warnRise(volAt(e.x, e.y)); dk.at = -1;
  addText(e.x, e.y - e.r - 24, 'KÖK SALMA', '#c9402d', 22);
  yield* demirGoto(e, c, true);
  yield* demirPlant(e, true);
  e.rooted = true; e.pace = 1.05; dk.at = 3;
  addText(e.x, e.y - e.r - 24, 'KÖK SALDI: ARKASI AÇIK', '#ffb04a', 18);
  yield 0.5;
}
// tiles along an angle from the boss, outside its own 3x3 block; empty ground and bush only, a wall, water or another root ends the line
function demirRootTiles(e, a, count, maxD) {
  const m = G.map, bc = Math.floor(e.x / T), br = Math.floor(e.y / T), out = [], seen = new Set(), ca = Math.cos(a), sa = Math.sin(a);
  for (let d = T * 1.1; d < (maxD || T * 14) && out.length < count; d += T / 4) {
    const c = Math.floor((e.x + ca * d) / T), r = Math.floor((e.y + sa * d) / T);
    if (c < 0 || r < 0 || c >= m.n || r >= m.n) break;
    const i = r * m.n + c; if (seen.has(i)) continue; seen.add(i);
    if (Math.abs(c - bc) <= 1 && Math.abs(r - br) <= 1) continue;
    const v = m.t[i]; if (v === EMPTY || v === BUSH) out.push({ c, r }); else break;
  }
  return out;
}
// the open ground right behind the exhaust: roots never grow here and the player must always be able to get to it
function demirRearTiles(e) {
  const m = G.map, n = m.n, ca = Math.cos(e.angle), sa = Math.sin(e.angle), half = e.spec.len / 2, out = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (blocksTank(m.t[r * n + c])) continue;
    const dx = c * T + T / 2 - e.x, dy = r * T + T / 2 - e.y, lx = dx * ca + dy * sa, ly = -dx * sa + dy * ca;
    if (lx < -half && lx > -half - 2.2 * T && Math.abs(ly) < e.spec.wid / 2 + T * 0.6) out.push(r * n + c);
  }
  return out;
}
// breadth first over the tiles a tank can stand on (the boss's own tile counts as closed), from the player's tile
function demirReach(e, add) {
  const m = G.map, n = m.n, p = G.player, bi = clamp(Math.floor(e.y / T), 0, n - 1) * n + clamp(Math.floor(e.x / T), 0, n - 1);
  const open = i => !blocksTank(m.t[i]) && !add.has(i) && i !== bi;
  const s0 = clamp(Math.floor(p.y / T), 0, n - 1) * n + clamp(Math.floor(p.x / T), 0, n - 1), seen = new Uint8Array(n * n);
  if (!open(s0)) return seen;
  const q = [s0]; seen[s0] = 1;
  for (let h = 0; h < q.length; h++) { const i = q[h], c = i % n, r = (i - c) / n; for (const [dx, dy] of DIRS) { const x = c + dx, y = r + dy; if (x < 0 || y < 0 || x >= n || y >= n) continue; const j = y * n + x; if (!seen[j] && open(j)) { seen[j] = 1; q.push(j); } } }
  return seen;
}
// fairness: with these tiles as roots the player still reaches at least half of the ground they could reach (no sealed pocket) and still reaches the rear (when they could before)
function demirRootsSafe(e, tiles, rear) {
  const base = demirReach(e, new Set()), reg = demirReach(e, new Set(tiles.map(q => q.r * G.map.n + q.c)));
  let nb = 0, nr = 0; for (let i = 0; i < base.length; i++) { nb += base[i]; nr += reg[i]; }
  if (nr < Math.max(12, nb * 0.5)) return false;
  if (rear.some(i => base[i]) && !rear.some(i => reg[i])) return false;
  return true;
}
function demirRootAdd(e, c, r, life) {
  const m = G.map, i = r * m.n + c, x = c * T + T / 2, y = r * T + T / 2;
  e.dk.roots.push({ c, r, t: 0, orig: m.t[i], seed: (c * 31 + r * 17) % 97, life });
  m.t[i] = STEEL; m.hp[i] = 0; m.flowDirty = true; miniTile(m, c, r); paintRegion(m, c - 1, r - 1, c + 1, r + 1);
  for (let k = 0, n = Math.max(3, Math.round(7 * fxScale)); k < n; k++) { const a = rand(0, TAU), v = rand(50, 160); addPart('debris', x + rand(-14, 14), y + rand(-14, 14), Math.cos(a) * v, Math.sin(a) * v, rand(0.5, 1), rand(3, 6), 0, 3.5, k & 1 ? '#3b3f44' : '#2a1d16'); }
}
function demirRootDrop(e, q) {
  const m = G.map, i = q.r * m.n + q.c, x = q.c * T + T / 2, y = q.r * T + T / 2;
  if (m.t[i] === STEEL) { m.t[i] = q.orig; m.hp[i] = 0; m.flowDirty = true; miniTile(m, q.c, q.r); paintRegion(m, q.c - 1, q.r - 1, q.c + 1, q.r + 1); }
  for (let k = 0, n = Math.max(2, Math.round(5 * fxScale)); k < n; k++) addPart('dust', x + rand(-16, 16), y + rand(-16, 16), rand(-30, 30), rand(-30, 30), rand(0.5, 0.9), rand(14, 22), 24, 2);
}
// a crack line: runs over open ground from the boss to a little past the player (3-9 tiles); the first `count` tiles of it become the root wall
function demirCrackTiles(e, a, count) {
  const p = G.player, reach = clamp(Math.hypot(p.x - e.x, p.y - e.y) + 0.8 * T, 3 * T, 9 * T), line = demirRootTiles(e, a, 99, reach), last = line[line.length - 1];
  return { tiles: line.slice(0, count), line, len: last ? Math.hypot(last.c * T + T / 2 - e.x, last.r * T + T / 2 - e.y) + T * 0.5 : T * 1.1 };
}
function* demirFisk(e) { // kök fışkırması: a crack line runs from the boss toward the player (1 s, the last 0.3 s locked); then roots erupt along it (damage on the line, once) and leave a steel-root wall for a few seconds
  const p = G.player, dk = e.dk, ph3 = e.phase >= 2, n = ph3 || demirLoop2() ? 2 : 1, cnt = ph3 ? 6 : 5, life = ph3 ? DEMIR_LIFE3 : DEMIR_LIFE2, L = [];
  Sound.warnRise(volAt(e.x, e.y));
  const goal = k => { const base = Math.atan2(p.y - e.y, p.x - e.x); return k === 0 ? base : (ph3 ? leadAng(e.x, e.y, 260, 1) : base) + L[k].off; }; // the second line: beside the first, in phase 3 where the player is heading
  for (let k = 0; k < n; k++) {
    const idx = L.length; L.push({ off: k === 0 ? 0 : (Math.random() < 0.5 ? -1 : 1) * rand(0.4, 0.65), tl: null, tiles: [] });
    let a = goal(idx), best = a, bn = -1;
    for (let tr = 0; tr < 7; tr++) { const a1 = a + (tr ? (tr % 2 ? 1 : -1) * Math.ceil(tr / 2) * 0.3 : 0), c = demirCrackTiles(e, a1, cnt); if (c.line.length > bn) { bn = c.line.length; best = a1; } if (bn >= 4) break; }
    if (bn < 2) { L.pop(); continue; }
    const c = demirCrackTiles(e, best, cnt); L[idx].off += best - a; L[idx].tiles = c.tiles; L[idx].line = c.line;
    L[idx].tl = addTele(e, { kind: 'line', dur: 1.0, lock: 0.3, x: e.x, y: e.y, a: best, len: c.len, w: T * 0.85, crack: true });
  }
  if (!L.length) { yield 0.5; return; }
  const first = L[0].tl;
  while (first.t < first.dur) {
    for (let k = 0; k < L.length; k++) {
      const q = L[k], tl = q.tl; if (tl.t >= tl.dur - tl.lock) continue; // the last 0.3 s: locked
      tl.a = turnTo(tl.a, goal(k), 1.5 * e.dt); const c = demirCrackTiles(e, tl.a, cnt); tl.len = c.len; q.tiles = c.tiles; q.line = c.line;
    }
    aimAtPlayer(e, e.dt, 0.6); yield 0;
  }
  const rear = demirRearTiles(e), rearSet = new Set(rear), taken = [], px = p.x, py = p.y; // the player's place when the roots erupt (the shove comes after every wall is down)
  for (const q of L) { release(e, 'fisk', q.tl); removeTele(q.tl); }
  for (const q of L) { // eruption: the wall; never on the player, never over the rear, never a sealed pocket, never past the cap
    const tl = q.tl;
    dk.er.push({ x: e.x, y: e.y, a: tl.a, len: tl.len, t: 0 });
    let cand = q.tiles.filter(t => { const x = t.c * T + T / 2, y = t.r * T + T / 2, h = T / 2 + p.r + 6; return !(Math.abs(px - x) < h && Math.abs(py - y) < h) && !rearSet.has(t.r * G.map.n + t.c); });
    cand = cand.slice(0, Math.max(0, DEMIR_ROOT_CAP - dk.roots.length - taken.length));
    while (cand.length && !demirRootsSafe(e, taken.concat(cand), rear)) cand.pop();
    for (const t of cand) { demirRootAdd(e, t.c, t.r, life); taken.push(t); }
    for (const t of q.line) { const x = t.c * T + T / 2, y = t.r * T + T / 2; for (let k = 0, m2 = Math.max(2, Math.round(3 * fxScale)); k < m2; k++) addPart('spark', x + rand(-16, 16), y + rand(-16, 16), rand(-60, 60), rand(-140, -40), rand(0.25, 0.5), 1, 0, 4, '#ffb04a'); }
  }
  let hit = false; // damage on the line, once per eruption however many lines catch the player, and a shove off the line
  for (const q of L) {
    const tl = q.tl, ca = Math.cos(tl.a), sa = Math.sin(tl.a), dx = px - tl.x, dy = py - tl.y, al = dx * ca + dy * sa, pr = -dx * sa + dy * ca;
    if (!p.alive || !(al > -p.r && al < tl.len + p.r && Math.abs(pr) < tl.w / 2 + p.r * 0.6)) continue;
    if (!hit) { hit = true; damagePlayer({ x: p.x, y: p.y, dmg: bossDmg(12), owner: 1, vx: 0, vy: 0 }); shake(8); vibrate(30); }
    const side = pr < 0 ? -1 : 1; moveTank(p, -sa * side * 46, ca * side * 46);
  }
  shake(8); Sound.crumble(volAt(e.x, e.y)); Sound.boom(0.9, volAt(e.x, e.y));
  e.acd.fisk = G.time + (ph3 ? 2.6 : 5.5);
  yield 0.5;
}
const demirWallRay = (e, a, max) => { const m = G.map, ca = Math.cos(a), sa = Math.sin(a); for (let d = 12; d < max; d += 8) if (isWall(m.at(e.x + ca * d, e.y + sa * d))) return d; return max; };
function* demirSweep(e) { // döner ateş: the red sweep line starts moving at once and runs 1 s ahead of the barrels; the barrels follow with a continuous stream through 360 degrees
  const p = G.player, dk = e.dk, W = DEMIR_SWEEP_W * (Math.random() < 0.5 ? -1 : 1), a0 = Math.atan2(p.y - e.y, p.x - e.x), END = TAU / Math.abs(W);
  Sound.warnRise(volAt(e.x, e.y));
  for (let t = 0; t < 0.6 && Math.abs(angDiff(e.turret, a0)) > 0.04; t += e.dt) { e.turret = turnTo(e.turret, a0, 7 * e.dt); yield 0; }
  e.turret = a0;
  const tl = addTele(e, { kind: 'line', dur: 1.0, lock: 0.3, x: e.x, y: e.y, a: a0, len: demirWallRay(e, a0, 15 * T), w: 40 });
  const sw = dk.sw = { a0, W, t: 0, lead: a0, bar: a0, end: 1 + END, fired: false }; let shotT = 0, side = 0;
  while (sw.t < sw.end) {
    sw.t += e.dt;
    sw.lead = a0 + W * Math.min(sw.t, END); sw.bar = a0 + W * clamp(sw.t - 1, 0, END);
    e.turret = sw.bar;
    if (!sw.fired && tl.t >= tl.dur) { sw.fired = true; release(e, 'doner', tl); removeTele(tl); }
    if (sw.fired) {
      shotT -= e.dt;
      while (shotT <= 0) { shotT += 0.1; demirStreamShot(e, DEMIR_FAN[side++ & 1]); }
      if (Math.random() < e.dt * 4) Sound.shoot(false, true, volAt(e.x, e.y) * 0.5);
    }
    yield 0;
  }
  dk.sw = null; yield 0.6;
}

/* ---- per-frame hook ---- */
function demirTick(e, dt) {
  const dk = e.dk, m = G.map;
  if (G.phase === 'bossIntro') { // the ground thumps three times, then the boss breaks through the north wall (11a)
    [0.25, 0.75, 1.25].forEach((tt, i) => {
      if (dk.step[i] || G.phaseT < tt) return;
      dk.step[i] = true; shake(9 + i * 2); Sound.boom(1.2 + i * 0.15, 1); vibrate(30);
      for (let k = 0, n = Math.round(8 * fxScale); k < n; k++) addPart('dust', e.x + rand(-60, 60), e.y + e.r * 0.9, rand(-50, 50), rand(10, 50), rand(0.6, 1.1), rand(14, 24), 26, 2);
    });
    return;
  }
  if (!e.gen) { dk.who = ''; for (const pt of e.parts) { pt.busy = false; pt.eye = 0; } if (dk.lift > 0) dk.lift = Math.max(0, dk.lift - dt * 5); }
  dk.weakT = Math.max(0, dk.weakT - dt);
  if (!dk.walk && !e.dying && G.phase === 'fight' && e.trans <= 0 && !(e.stunT > 0)) dk.plantT -= dt; // the planted time runs while it can act
  const pl = G.player;
  for (const pt of e.parts) { // idle turrets follow the player (a turret in the middle of its shot is driven by the attack)
    if (pt.aim === undefined) pt.aim = e.angle;
    if (!pt.busy && pl.alive && pt.alive) { const q = partPos(e, pt); pt.aim = turnTo(pt.aim, Math.atan2(pl.y - q.y, pl.x - q.x), 1.8 * dt); }
    if (!pt.alive) { pt.deadT = (pt.deadT || 0) + dt; if (demirLoop2() && !pt.reb && !e.dying && pt.deadT >= 30) { // second loop: each turret rebuilds once, 30 s after it broke
      pt.alive = true; pt.hp = pt.maxHp; pt.reb = true; pt.deadT = 0; pt.flash = 0.4; dk.sh = true; const q = partPos(e, pt);
      sparks(q.x, q.y, 14, '#bfe0ff', 260); addPart('ring', q.x, q.y, 0, 0, 0.5, 10, 70, 0, '150,190,230'); addText(q.x, q.y - 26, 'TARET YENİDEN KURULDU', '#9ec9ee', 16); Sound.crumble(volAt(e.x, e.y));
    } }
  }
  if (e.dying) dk.root = Math.max(0, dk.root - dt * 0.6); else if (dk.walk) dk.root = Math.max(0, dk.root - dt * 2); else dk.root = Math.min(1, dk.root + dt * 1.5); // the anchors lift while it rolls and grip the ground when it stands
  const sh = e.parts.some(q => q.alive);
  if (dk.sh && !sh && !e.dying) { dk.sh = false; addPart('ring', e.x, e.y, 0, 0, 0.6, 30, 150, 0, '150,190,230'); addText(e.x, e.y - e.r - 30, 'KALKAN DÜŞTÜ', '#9ec9ee', 18); sparks(e.x, e.y, 16, '#bfe0ff', 300); }
  for (const b of G.bullets) { // heavy shells: a brick straight ahead drops to 2 HP so that the big shell (2 damage) breaks it in one hit
    if (!b.heavy || b.dead) continue;
    const sp = Math.hypot(b.vx, b.vy) || 1, bx = b.x + b.vx / sp * 10, by = b.y + b.vy / sp * 10;
    if (m.at(bx, by) === BRICK) { const i = Math.floor(by / T) * m.n + Math.floor(bx / T); m.hp[i] = Math.min(m.hp[i], 2); }
  }
  if (e.dying) {
    if (!dk.dis) { dk.dis = true; for (const q of dk.roots) q.t = Math.max(q.t, q.life - 1.2); dk.er.length = 0; dk.sw = null; dk.lift = 0; e.rooted = false; } // the roots crack and dissolve
    if (!dk.boom && e.deathT >= 2.1) {
      dk.boom = true; explode(e.x, e.y, 1.8); addPart('flash', e.x, e.y, 0, 0, 0.3, 240, 0, 0); addPart('ring', e.x, e.y, 0, 0, 0.7, 20, 360, 0, '200,170,140');
      sparks(e.x, e.y, 34, '#ffd27a', 440); shake(20); Sound.boom(1.8, volAt(e.x, e.y)); vibrate([50, 30, 90]);
    }
  }
  for (let k = dk.er.length - 1; k >= 0; k--) { dk.er[k].t += dt; if (dk.er[k].t > 0.6) dk.er.splice(k, 1); }
  for (let k = dk.roots.length - 1; k >= 0; k--) {
    const q = dk.roots[k]; q.t += dt;
    if (q.t >= q.life) { demirRootDrop(e, q); dk.roots.splice(k, 1); }
    else if (q.t > q.life - 1.2 && fxScale === 1 && Math.random() < dt * 8) addPart('dust', q.c * T + rand(6, T - 6), q.r * T + rand(6, T - 6), rand(-14, 14), rand(-30, -8), rand(0.4, 0.7), rand(8, 14), 20, 2);
  }
}

/* ---- definition ---- */
BOSS_DEFS.demirkok = {
  id: 'demirkok', lead: 0.35, name: 'DEMİRKÖK', arena: 'kale', introSub: 'Orman Kalesi', hold: 4.5, phases: [66, 33], plates: ['plate', 'fender'], r: DEMIR_SPEC.r,
  deathText: 'DEMİRKÖK DEVRİLDİ', loot: 'DEMİRKÖK GANİMETİ',
  barrels: [{ id: 'l', name: 'Sol namlu', ang: -DEMIR_BAR, k: 0.07 }, { id: 'r', name: 'Sağ namlu', ang: DEMIR_BAR, k: 0.07 }],
  hp: w => Math.round(1020 + (w - 20) * 27),
  attacks: [
    { id: 'taret', w: 3, ok: e => e.parts.some(q => q.alive), run: demirTurrets },
    { id: 'agir', w: 2.4, ok: e => true, run: demirHeavy },
    { id: 'deprem', w: 2.6, ok: e => e.phase === 1 && e.distP < 7 * T, run: demirQuake },
    { id: 'fisk', w: 3.2, ok: e => e.phase >= 1, run: demirFisk },
    { id: 'tasin', w: 100, ok: e => e.phase < 2 && e.dk.plantT <= 0, run: demirRelocate, mov: true },
    { id: 'kok', w: 100, ok: e => e.phase >= 2 && !e.rooted, run: demirRoot, mov: true },
    { id: 'doner', w: 2.4, ok: e => e.rooted, run: demirSweep, cd: 11 }
  ],
  setup(e, w) {
    e.spec = Object.assign({}, SPECS.boss, DEMIR_SPEC); e.r = DEMIR_SPEC.r; e.pace = 1.2;
    const hp = Math.max(2, Math.round(e.maxHp * 0.12));
    for (const [id, name, oy] of [['tl', 'Sol taret', -27], ['tr', 'Sağ taret', 27]]) e.parts.push({ id, name, atk: '', aim: e.angle, eye: 0, busy: false, ox: 8, oy, r: 12, maxHp: hp, hp, alive: true, flash: 0 });
    e.dk = { at: 0, plantT: rand(DEMIR_PLANT[0], DEMIR_PLANT[1]), goal: null, er: [], rooted: false, walk: false, lift: 0, who: '', side: 0, roots: [], sw: null, step: [false, false, false], root: 0, weakT: 0, sh: true, dis: false, boom: false };
  },
  onPhase(e, i) {
    if (i === 1) addText(e.x, e.y - e.r - 54, 'ZIRH DÜŞTÜ', '#ff9a6c', 18);
    if (i === 2) { e.cool = Math.min(e.cool, 0.2); }
  },
  onPartBreak(e, pt) { spawnPiece(e, 'shoulder', false); pt.deadT = 0; pt.busy = false; pt.eye = 0; },
  tick: demirTick,
  onClear(e) { const dk = e.dk; dk.sw = null; dk.lift = 0; dk.who = ''; for (const pt of e.parts) { pt.busy = false; pt.eye = 0; } if (dk.walk) { dk.walk = false; dk.goal = null; dk.plantT = 0; dk.at = -1; } }, // a phase change cuts a roll short: it plants where it stands and rolls on afterwards
  move(e, dt) { // planted: the hull never chases; the main turret follows the player while it sees them
    e.avx = e.avy = 0;
    if (G.player.alive && e.canSee) aimAtPlayer(e, dt, 0.8, e.def.lead); else e.turret = turnTo(e.turret, e.angle, e.spec.tTurn * 0.6 * dt);
  },
  watchGoal: () => false, // the stuck watch of the probes only follows bosses that chase; Demirkök's rolls are tested on their own
  flowGoal: e => (e.dk.walk ? e.dk.goal : null),
  hullMul(e, x, y, dir, direct, quiet) {
    if (!direct && !quiet) return 1; // the nuke is a flat blow
    let k = e.parts.some(q => q.alive) ? 0.5 : 1; // shielded while a turret lives
    if (e.rooted && direct && dir !== undefined) { // weak point: the rear exhaust
      const lx = Math.cos(e.angle) * (x - e.x) + Math.sin(e.angle) * (y - e.y);
      if (lx < -e.spec.len * 0.2 && Math.abs(angDiff(e.angle + Math.PI, dir)) < 1.0) { k *= 1.5; e.dk.weakT = 0.25; sparks(x, y, 4, '#ff8a4a', 220, dir, 1); }
    }
    return k;
  },
  danger(e, x, y, pad) { // the sweep: the wedge between the barrels and the red line 1 s ahead is dangerous where the shells can reach
    const sw = e.dk.sw; if (!sw) return false;
    const dx = x - e.x, dy = y - e.y, d = Math.hypot(dx, dy); if (d > 17 * T) return false;
    const s = Math.sign(sw.W), rel = ((((Math.atan2(dy, dx) - sw.bar) * s) % TAU) + TAU) % TAU, span = Math.abs(sw.lead - sw.bar), pa = Math.atan2(pad + 16, Math.max(d, 1));
    if (!(rel <= span + pa || rel >= TAU - pa - 0.15)) return false;
    return d < e.r + 10 || los(e.x, e.y, x, y);
  },
  draw: (e, g, alpha) => drawDemirkok(e, g, alpha),
  drawGround: (e, g) => drawDemirkokGround(e, g)
};
BOSS_ON[20] = 'demirkok';
