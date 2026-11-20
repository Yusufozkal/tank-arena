/* ================= Demirkök (docs/BOSSES.md section 5) ================= */
// Orman's boss, the heavy one: a wide iron hull with two side turrets (while one lives the hull is shielded: half damage) and a twin main gun.
// Phase 1: turret fire, heavy gun, a slow crush through brick. Phase 2: Deprem (ring, slam) and Havan (circles). Phase 3 "Kök salma": it walks to the castle centre and roots;
// Demir kökler (red lines, then 8 s steel walls along them), Döner ateş (360 degree sweep with a red line 1 s ahead of the barrels); the rear exhaust takes 1.5x damage.
// Per-boss state lives in e.dk; generic hooks used from 11a: def.tick, def.danger, def.onClear, def.hullMul, def.flowGoal, def.drawGround, e.rooted (treadT), bossShell origin.
ARENAS.kale = { name: 'Orman Kalesi', gate: [[9, 5], [10, 5], [11, 5]], rows: [ // the castle's north brick wall (gate) is smashed by the boss in the intro
  'GGG...............GGG',
  'GG.................GG',
  '..........X..........',
  '.....................',
  '....SS.........SS....',
  '....SSBBB...BBBSS....',
  '.....B.........B.....',
  '.....B.SS...SS.B.....',
  '.....B.SS...SS.B.....',
  'GG.................GG',
  'GG.................GG',
  'GG.................GG',
  '.....B.SS...SS.B.....',
  '.....B.SS...SS.B.....',
  '.....B.........B.....',
  '....SSBBB...BBBSS....',
  '....SS.........SS....',
  '.....................',
  '..........P..........',
  'GG.................GG',
  'GGG...............GGG'] };

const DEMIR_SPEC = { speed: 38, turn: 1.3, tTurn: 1.9, len: 110, wid: 96, r: 46, tread: 15, tR: 21, barrel: 74, bW: 9, cool: 1, bSpeed: 340, dmg: 9, bR: 6, mass: 12, score: 2500,
  col: { body: '#60656c', dk: '#3b3f44', hi: '#8c929a', acc: '#c9402d' } };
const DEMIR_RING = 4.5 * T, DEMIR_ROOT_LIFE = 8, DEMIR_SWEEP_W = 1.1, DEMIR_BAR = 0.11; // twin barrels sit at +-DEMIR_BAR rad from the turret
const DEMIR_FAN = [-DEMIR_BAR, DEMIR_BAR];

/* ---- shells ---- */
function demirTurretShot(e, pt) { // a single shell from a side turret, aimed at the player
  const q = partPos(e, pt), p = G.player, a = Math.atan2(p.y - q.y, p.x - q.x);
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

/* ---- phase 1 ---- */
function* demirTurrets(e) { // taret ateşi: the side turrets take turns, one shell each, red eye 0.45 s first
  const dk = e.dk, n = e.phase >= 2 ? 6 : 4;
  for (let k = 0; k < n; k++) {
    const live = e.parts.filter(q => q.alive); if (!live.length) break;
    const pt = live.length === 1 ? live[0] : live[(dk.side++) % live.length];
    dk.who = pt.id;
    const tl = addTele(e, { kind: 'glow', dur: 0.45 });
    while (tl.t < tl.dur) { aimAtPlayer(e, e.dt, 0.9); yield 0; }
    release(e, 'taret', tl); removeTele(tl);
    if (pt.alive) demirTurretShot(e, pt);
    dk.who = ''; yield 0.28;
  }
  yield 0.3;
}
function* demirHeavy(e) { // ağır top: both barrels glow 0.8 s, then two big slow shells
  e.dk.who = 'main';
  yield* glowAim(e, 'agir', 0.8, DEMIR_FAN);
  demirHeavyVolley(e);
  e.dk.who = ''; yield 0.9;
}
function* demirCrush(e) { // ezme: red line 1 s (last 0.3 s locked), then a slow march that flattens bricks; steel stops it (no stun: it simply turns)
  const p = G.player, m = G.map, margin = e.r + 4, LEN = 7 * T;
  const tl = addTele(e, { kind: 'line', dur: 1.0, lock: 0.3, x: e.x, y: e.y, a: e.angle, len: LEN, w: 2 * (e.r + 6) });
  Sound.warnRise(volAt(e.x, e.y));
  while (tl.t < tl.dur) {
    if (tl.t < tl.dur - tl.lock) e.angle = turnTo(e.angle, Math.atan2(p.y - e.y, p.x - e.x), 2.2 * e.dt);
    aimAtPlayer(e, e.dt, 0.6);
    tl.x = e.x; tl.y = e.y; tl.a = e.angle; tl.len = rayClip(e.x, e.y, e.angle, LEN, margin);
    yield 0;
  }
  release(e, 'ezme', tl);
  const ca = Math.cos(e.angle), sa = Math.sin(e.angle), plan = tl.len;
  let trav = 0, hurt = false;
  while (trav < plan) {
    const step = Math.min(165 * e.speedMul * e.dt, plan - trav);
    for (const [fa, lat] of [[e.r + 8, 0], [e.r + 8, 22], [e.r + 8, -22], [e.r + 8, 42], [e.r + 8, -42], [e.r - 4, 52], [e.r - 4, -52]]) { // flatten the bricks in front (never steel)
      const bx = e.x + ca * fa - sa * lat, by = e.y + sa * fa + ca * lat;
      if (m.at(bx, by) === BRICK) { destroyBrick(m, Math.floor(bx / T), Math.floor(by / T), volAt(bx, by)); shake(4); }
    }
    const ox = e.x, oy = e.y;
    moveTank(e, ca * step, sa * step);
    const moved = Math.hypot(e.x - ox, e.y - oy);
    trackUpdate(e, moved, 0); trav += moved;
    if (fxScale === 1 && Math.random() < 0.7) addPart('dust', e.x - ca * e.r, e.y - sa * e.r + rand(-18, 18), rand(-30, 30), rand(-30, 30), rand(0.4, 0.8), rand(14, 24), 26, 2);
    if (!hurt && p.alive && dist2(e.x, e.y, p.x, p.y) < (e.r + p.r + 2) * (e.r + p.r + 2)) {
      hurt = true; damagePlayer({ x: p.x, y: p.y, dmg: bossDmg(24), owner: 1, vx: 0, vy: 0 });
      const side = (p.x - e.x) * -sa + (p.y - e.y) * ca < 0 ? -1 : 1; moveTank(p, -sa * 56 * side + ca * 24, ca * 56 * side + sa * 24); shake(8); vibrate(30);
    }
    if (moved < step * 0.35) break; // jammed against something
    yield 0;
  }
  removeTele(tl);
  yield 0.5;
}

/* ---- phase 2 ---- */
function* demirQuake(e) { // deprem: it stops and lifts, ring of 4.5 tiles 1.2 s, slam; steel in between protects, bricks inside lose 1 HP
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
function* demirMortar(e) { // havan: five circles around the player and ahead of where they are heading (shells fall over walls)
  const p = G.player, m = G.map, circ = [], vx = p.vx || 0, vy = p.vy || 0;
  const at = (x, y) => circ.push(addTele(e, { kind: 'circle', r: 56, x: clamp(x, T, m.w - T), y: clamp(y, T, m.h - T) }));
  Sound.warnRise(volAt(e.x, e.y));
  at(p.x + vx * 0.7, p.y + vy * 0.7); at(p.x + vx * 1.3, p.y + vy * 1.3); at(p.x + rand(-18, 18), p.y + rand(-18, 18));
  for (let i = 0; i < 2; i++) { const a = rand(0, TAU), d = rand(80, 140); at(p.x + vx * 0.7 + Math.cos(a) * d, p.y + vy * 0.7 + Math.sin(a) * d); }
  while (circ[0].t < circ[0].dur) { aimAtPlayer(e, e.dt, 0.5); yield 0; }
  for (const tl of circ) { release(e, 'havan', tl); removeTele(tl); bossBlast(tl.x, tl.y, 56, 14); yield 0.05; }
  yield 0.4;
}

/* ---- phase 3: Kök salma ---- */
const demirCentre = e => ({ x: G.map.w / 2, y: G.map.h / 2 });
function* demirRoot(e) { // walks to the castle centre and roots (no more movement; the rear exhaust becomes the weak point)
  const dk = e.dk, c = demirCentre(e), s = e.spec;
  dk.walk = true; e.flowT = 0; Sound.warnRise(volAt(e.x, e.y));
  addText(e.x, e.y - e.r - 24, 'KÖK SALMA', '#c9402d', 22);
  for (let t = 0; t < 18 && Math.hypot(c.x - e.x, c.y - e.y) > 8; t += e.dt) {
    const d = Math.hypot(c.x - e.x, c.y - e.y);
    if (d < 1.4 * T) { // the last stretch: straight in
      const a = Math.atan2(c.y - e.y, c.x - e.x), before = e.angle, ox = e.x, oy = e.y, sp = Math.min(d, s.speed * e.speedMul * e.dt);
      e.angle = turnTo(e.angle, a, s.turn * e.dt); moveTank(e, Math.cos(a) * sp, Math.sin(a) * sp);
      trackUpdate(e, Math.hypot(e.x - ox, e.y - oy), angDiff(before, e.angle));
    } else bossMove(e, e.dt, 0);
    aimAtPlayer(e, e.dt, 0.7);
    yield 0;
  }
  dk.walk = false; e.avx = e.avy = 0;
  for (let t = 0; t < 0.9; t += e.dt) { // settling: the roots go down
    dk.root = Math.min(1, dk.root + e.dt * 1.2); e.shake = 0;
    if (fxScale === 1 && Math.random() < 0.5) addPart('dust', e.x + rand(-e.r, e.r), e.y + rand(-e.r, e.r), rand(-40, 40), rand(-40, 40), rand(0.5, 0.9), rand(14, 22), 24, 2);
    aimAtPlayer(e, e.dt, 0.7); yield 0;
  }
  e.rooted = true; e.pace = 1.05; shake(14); Sound.boom(1.5, volAt(e.x, e.y)); explode(e.x, e.y + e.r * 0.5, 0.6);
  addText(e.x, e.y - e.r - 24, 'KÖK SALDI: ARKASI AÇIK', '#ffb04a', 18);
  yield 0.5;
}
// tiles along an angle from the boss, outside its own 3x3 block; empty ground and bush only, a wall, water or another root ends the line
function demirRootTiles(e, a, count) {
  const m = G.map, bc = Math.floor(e.x / T), br = Math.floor(e.y / T), out = [], seen = new Set(), ca = Math.cos(a), sa = Math.sin(a);
  for (let d = T * 1.1; d < T * 14 && out.length < count; d += T / 4) {
    const c = Math.floor((e.x + ca * d) / T), r = Math.floor((e.y + sa * d) / T);
    if (c < 0 || r < 0 || c >= m.n || r >= m.n) break;
    const i = r * m.n + c; if (seen.has(i)) continue; seen.add(i);
    if (Math.abs(c - bc) <= 1 && Math.abs(r - br) <= 1) continue;
    const v = m.t[i]; if (v === EMPTY || v === BUSH) out.push({ c, r }); else break;
  }
  return out;
}
// does the player still reach (at least a third of) the open ground when these tiles are steel? (no sealed pockets)
function demirRootsSafe(tiles) {
  const m = G.map, n = m.n, p = G.player, add = new Set(tiles.map(q => q.r * n + q.c));
  const open = i => !blocksTank(m.t[i]) && !add.has(i);
  let total = 0; for (let i = 0; i < n * n; i++) if (open(i)) total++;
  const c0 = clamp(Math.floor(p.x / T), 0, n - 1), r0 = clamp(Math.floor(p.y / T), 0, n - 1), s0 = r0 * n + c0;
  if (!open(s0)) return true; // already under a root: it will be pushed out
  const seen = new Uint8Array(n * n), q = [s0]; seen[s0] = 1;
  for (let h = 0; h < q.length; h++) { const i = q[h], c = i % n, r = (i - c) / n; for (const [dx, dy] of DIRS) { const x = c + dx, y = r + dy; if (x < 0 || y < 0 || x >= n || y >= n) continue; const j = y * n + x; if (!seen[j] && open(j)) { seen[j] = 1; q.push(j); } } }
  return q.length >= total / 3;
}
function demirRootAdd(e, c, r) {
  const m = G.map, i = r * m.n + c, x = c * T + T / 2, y = r * T + T / 2;
  e.dk.roots.push({ c, r, t: 0, orig: m.t[i], seed: (c * 31 + r * 17) % 97 });
  m.t[i] = STEEL; m.hp[i] = 0; m.flowDirty = true; miniTile(m, c, r); paintRegion(m, c - 1, r - 1, c + 1, r + 1);
  for (let k = 0, n = Math.max(3, Math.round(7 * fxScale)); k < n; k++) { const a = rand(0, TAU), v = rand(50, 160); addPart('debris', x + rand(-14, 14), y + rand(-14, 14), Math.cos(a) * v, Math.sin(a) * v, rand(0.5, 1), rand(3, 6), 0, 3.5, k & 1 ? '#3b3f44' : '#2a1d16'); }
}
function demirRootDrop(e, q) {
  const m = G.map, i = q.r * m.n + q.c, x = q.c * T + T / 2, y = q.r * T + T / 2;
  if (m.t[i] === STEEL) { m.t[i] = q.orig; m.hp[i] = 0; m.flowDirty = true; miniTile(m, q.c, q.r); paintRegion(m, q.c - 1, q.r - 1, q.c + 1, q.r + 1); }
  for (let k = 0, n = Math.max(2, Math.round(5 * fxScale)); k < n; k++) addPart('dust', x + rand(-16, 16), y + rand(-16, 16), rand(-30, 30), rand(-30, 30), rand(0.5, 0.9), rand(14, 22), 24, 2);
}
// a root rose under the player: damage and a shove to the nearest free spot
function demirEject(p) {
  const m = G.map, k = p.r * 0.8, clear = (x, y) => !(blocksTank(m.at(x, y)) || blocksTank(m.at(x + k, y)) || blocksTank(m.at(x - k, y)) || blocksTank(m.at(x, y + k)) || blocksTank(m.at(x, y - k)));
  if (clear(p.x, p.y)) return false;
  for (let d = 6; d <= T * 3; d += 6) for (let i = 0; i < 16; i++) { const a = i * TAU / 16, x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d; if (clear(x, y)) { p.x = x; p.y = y; return true; } }
  return true;
}
function* demirRoots(e) { // demir kökler: 2-3 red lines (1 s, last 0.3 s locked), then each becomes a 4-6 tile steel wall for 8 s
  const p = G.player, base = Math.atan2(p.y - e.y, p.x - e.x) + rand(-0.5, 0.5), nLines = e.hp / e.maxHp < 0.18 ? 3 : 2 + (Math.random() < 0.5 ? 1 : 0), lines = [];
  Sound.warnRise(volAt(e.x, e.y));
  for (let k = 0; k < nLines; k++) {
    const n = randInt(4, 6); let a = 0, tiles = [];
    for (let tr = 0; tr < 8 && tiles.length < 4; tr++) { // a spoke that runs into steel at once is turned a little
      const a1 = base + k * TAU / nLines + (tr ? rand(-0.9, 0.9) : rand(-0.15, 0.15)), t1 = demirRootTiles(e, a1, n);
      if (t1.length > tiles.length) { a = a1; tiles = t1; }
    }
    if (tiles.length < 2) continue;
    lines.push({ a, tiles, tl: addTele(e, { kind: 'line', dur: 1.0, lock: 0.3, x: e.x, y: e.y, a, len: (tiles.length + 1.4) * T, w: T * 0.85 }) });
  }
  if (!lines.length) { yield 0.5; return; }
  while (lines[0].tl.t < lines[0].tl.dur) { aimAtPlayer(e, e.dt, 0.6); yield 0; }
  const taken = [];
  for (const L of lines) { release(e, 'kok', L.tl); removeTele(L.tl); if (demirRootsSafe(taken.concat(L.tiles))) taken.push(...L.tiles); }
  for (const q of taken) demirRootAdd(e, q.c, q.r);
  shake(7); Sound.crumble(volAt(e.x, e.y));
  if (p.alive && demirEject(p)) { damagePlayer({ x: p.x, y: p.y, dmg: bossDmg(12), owner: 1, vx: 0, vy: 0 }); shake(8); vibrate(30); }
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
  if (!e.gen) { dk.who = ''; if (dk.lift > 0) dk.lift = Math.max(0, dk.lift - dt * 5); }
  dk.weakT = Math.max(0, dk.weakT - dt);
  dk.root = e.rooted && !e.dying ? Math.min(1, dk.root + dt * 1.5) : e.dying ? Math.max(0, dk.root - dt * 0.6) : (dk.walk ? dk.root : Math.max(0, dk.root - dt * 1.5));
  const sh = e.parts.some(q => q.alive);
  if (dk.sh && !sh && !e.dying) { dk.sh = false; addPart('ring', e.x, e.y, 0, 0, 0.6, 30, 150, 0, '150,190,230'); addText(e.x, e.y - e.r - 30, 'KALKAN DÜŞTÜ', '#9ec9ee', 18); sparks(e.x, e.y, 16, '#bfe0ff', 300); }
  for (const b of G.bullets) { // heavy shells: a brick straight ahead drops to 2 HP so that the big shell (2 damage) breaks it in one hit
    if (!b.heavy || b.dead) continue;
    const sp = Math.hypot(b.vx, b.vy) || 1, bx = b.x + b.vx / sp * 10, by = b.y + b.vy / sp * 10;
    if (m.at(bx, by) === BRICK) { const i = Math.floor(by / T) * m.n + Math.floor(bx / T); m.hp[i] = Math.min(m.hp[i], 2); }
  }
  if (e.dying) {
    if (!dk.dis) { dk.dis = true; for (const q of dk.roots) q.t = Math.max(q.t, DEMIR_ROOT_LIFE - 1.2); dk.sw = null; dk.lift = 0; e.rooted = false; } // the roots crack and dissolve
    if (!dk.boom && e.deathT >= 2.1) {
      dk.boom = true; explode(e.x, e.y, 1.8); addPart('flash', e.x, e.y, 0, 0, 0.3, 240, 0, 0); addPart('ring', e.x, e.y, 0, 0, 0.7, 20, 360, 0, '200,170,140');
      sparks(e.x, e.y, 34, '#ffd27a', 440); shake(20); Sound.boom(1.8, volAt(e.x, e.y)); vibrate([50, 30, 90]);
    }
  }
  for (let k = dk.roots.length - 1; k >= 0; k--) {
    const q = dk.roots[k]; q.t += dt;
    if (q.t >= DEMIR_ROOT_LIFE) { demirRootDrop(e, q); dk.roots.splice(k, 1); }
    else if (q.t > DEMIR_ROOT_LIFE - 1.2 && fxScale === 1 && Math.random() < dt * 8) addPart('dust', q.c * T + rand(6, T - 6), q.r * T + rand(6, T - 6), rand(-14, 14), rand(-30, -8), rand(0.4, 0.7), rand(8, 14), 20, 2);
  }
}

/* ---- definition ---- */
const demirMob = e => e.phase < 2 || e.rooted; // before phase 3 and once rooted the usual attacks; in between it is walking to the centre
BOSS_DEFS.demirkok = {
  id: 'demirkok', name: 'DEMİRKÖK', arena: 'kale', introSub: 'Orman Kalesi', hold: 4.5, phases: [66, 33], plates: ['plate', 'fender'], r: DEMIR_SPEC.r,
  deathText: 'DEMİRKÖK DEVRİLDİ', loot: 'DEMİRKÖK GANİMETİ',
  barrels: [{ id: 'l', name: 'Sol namlu', ang: -DEMIR_BAR, k: 0.07 }, { id: 'r', name: 'Sağ namlu', ang: DEMIR_BAR, k: 0.07 }],
  hp: w => Math.round(1150 + (w - 20) * 30),
  attacks: [
    { id: 'taret', w: 3, ok: e => demirMob(e) && e.parts.some(q => q.alive), run: demirTurrets },
    { id: 'agir', w: 2.4, ok: e => demirMob(e), run: demirHeavy },
    { id: 'ezme', w: 2.2, ok: e => e.phase < 2 && e.distP > 3 * T, run: demirCrush, mov: true },
    { id: 'deprem', w: 2.6, ok: e => e.phase === 1 && e.distP < 7 * T, run: demirQuake },
    { id: 'havan', w: 2.6, ok: e => e.phase >= 1 && demirMob(e), run: demirMortar },
    { id: 'kok', w: 100, ok: e => e.phase >= 2 && !e.rooted, run: demirRoot, mov: true },
    { id: 'koker', w: 3, ok: e => e.rooted, run: demirRoots, cd: 5 },
    { id: 'doner', w: 2.4, ok: e => e.rooted, run: demirSweep, cd: 11 }
  ],
  setup(e, w) {
    e.spec = Object.assign({}, SPECS.boss, DEMIR_SPEC); e.r = DEMIR_SPEC.r; e.pace = 1.2;
    const hp = Math.max(2, Math.round(e.maxHp * 0.12));
    for (const [id, name, oy] of [['tl', 'Sol taret', -27], ['tr', 'Sağ taret', 27]]) e.parts.push({ id, name, atk: 'taret', ox: 8, oy, r: 12, maxHp: hp, hp, alive: true, flash: 0 });
    e.dk = { rooted: false, walk: false, lift: 0, who: '', side: 0, roots: [], sw: null, step: [false, false, false], root: 0, weakT: 0, sh: true, dis: false, boom: false };
  },
  onPhase(e, i) {
    if (i === 1) addText(e.x, e.y - e.r - 54, 'ZIRH DÜŞTÜ', '#ff9a6c', 18);
    if (i === 2) { e.cool = Math.min(e.cool, 0.2); }
  },
  onPartBreak(e, pt) { spawnPiece(e, 'shoulder', false); },
  tick: demirTick,
  onClear(e) { const dk = e.dk; dk.sw = null; dk.lift = 0; dk.who = ''; },
  flowGoal: e => (e.dk.walk ? demirCentre(e) : null),
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
