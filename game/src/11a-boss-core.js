/* ================= boss framework ================= */
// Data-driven boss stage (docs/BOSSES.md section 1). A boss is an enemy with isBoss = true, a def from BOSS_DEFS (11b registers Komutan; later bosses add
// their own def with the same fields), phases (HP thresholds in %), parts with their own HP and a list of attacks written as generators.
// Boss waves: arena + intro + fight with only the boss on the field (nextWave -> startBossStage).

// Region themes: 10-wave blocks (Çöl, Orman, Kar, Şehir, then again)
const themeFor = w => THEMES[Math.floor((w - 1) / 10) % THEMES.length];

/* ---- fixed arenas (21x21 text maps: S steel, B brick, W water, G bush, . empty, X boss start, P player start) ---- */
const ARENAS = {
  kisla: { name: 'Kışla', gate: [[9, 3], [10, 3], [11, 3]], rows: [
    '.....................',
    '.SS..BBBB...BBBB..SS.',
    '.SS..BSSB.X.BSSB..SS.',
    '.....BBBB...BBBB.....',
    '.....................',
    '..S...............S..',
    '.....................',
    '......BBB...BBB......',
    '.....................',
    '.SS...............SS.',
    '.SS.......S.......SS.',
    '.....................',
    '.....................',
    '......BBB...BBB......',
    '.....................',
    '..S...............S..',
    '.....................',
    '.....BBBB...BBBB.....',
    '.SS..BSSB...BSSB..SS.',
    '.SS..BBBB.P.BBBB..SS.',
    '.....................'] }
};
function parseArena(a) {
  const n = a.rows.length, t = new Uint8Array(n * n); let boss = null, player = null;
  a.rows.forEach((row, r) => {
    for (let c = 0; c < n; c++) {
      const ch = row[c];
      if (CH[ch]) t[r * n + c] = CH[ch]; else if (ch === 'X') boss = { c, r }; else if (ch === 'P') player = { c, r };
    }
  });
  return { n, t, boss, player };
}
// the arena as a map; the brick gate in front of the boss is part of the map until the intro smashes it (tests compare tiles except the gate cells)
function loadArena(key, theme) {
  const a = ARENAS[key], pa = parseArena(a);
  for (const [c, r] of a.gate || []) pa.t[r * pa.n + c] = BRICK;
  const m = makeArena({ n: pa.n, t: pa.t, spawns: [] }, theme);
  m.arena = key; m.frame = true; m.gate = a.gate || [];
  m.bossAt = { x: pa.boss.c * T + T / 2, y: pa.boss.r * T + T / 2 }; m.playerAt = { x: pa.player.c * T + T / 2, y: pa.player.r * T + T / 2 };
  return m;
}

/* ---- boss table ---- */
// def: { id, name, arena, hp(w), phases: [66, 33], plates: [kind lost in phase 2, kind lost in phase 3], attacks: [{ id, w, ok(e), run*(e) }], hold, setup(e, w), onPhase(e, i), draw(e, g, alpha),
//        deathText, loot, introSub, unlocks(w) }.  Later bosses: BOSS_DEFS.sariFirtina = {...}; BOSS_ON[10] = 'sariFirtina'.
const BOSS_DEFS = {};
const BOSS_ON = { 10: 'komutan', 20: 'komutan', 30: 'komutan', 40: 'komutan' }; // boss wave (within the 40-wave cycle) -> def id; every 5th wave not listed is a Komutan
const bossDefAt = w => {
  if (w < 1 || w % 5) return null;
  const k = ((w - 1) % 40) + 1;
  return BOSS_DEFS[BOSS_ON[k] || 'komutan'] || null;
};
const TELE_MIN = { glow: 0.45, heavy: 0.8, line: 1.0, circle: 1.2, ring: 1.2 }; // minimum warning time per telegraph kind (uyarı dili)
const bossDmg = base => Math.max(1, Math.round(base * G.mods.dmg));

function spawnBoss(def, x, y, angle) {
  const w = G.wave, e = makeTank('boss', x, y);
  e.isBoss = true; e.def = def; e.name = def.name; e.stage = !!G.stage; e.phased = e.stage;
  e.maxHp = e.hp = def.hp(w); e.r = def.r || e.spec.r;
  e.angle = e.turret = angle; e.visit = Math.max(1, Math.floor(w / 5));
  e.phase = 0; e.trans = 0; e.invuln = false; e.dying = false; e.parts = []; e.gen = null; e.wait = 0; e.atkId = ''; e.lastAtk = ''; e.acd = {};
  e.cool = 1.5; e.pace = 1 + 0.6 / e.visit; e.scorch = []; e.lost = {}; e.broke = [false, false, false, false]; e.hitSide = [0, 0, 0, 0];
  e.glow = 0; e.fxT = 0; e.flowT = 0; e.flow = null; e.dt = 0; e.log = []; e.unlock = def.unlocks ? def.unlocks(w) : {};
  initBossParts(e);
  def.setup(e, w);
  G.enemies.push(e); G.boss = e;
  return e;
}

/* ---- telegraphs (uyarı dili) ---- */
// kinds: glow (barrel/turret heats up), line (red line, last `lock` seconds darker and locked), circle (filling circle), ring (growing ring around the boss)
function addTele(e, o) { const tl = Object.assign({ t: 0, e, dur: TELE_MIN[o.kind] }, o); G.tele.push(tl); return tl; }
function removeTele(tl) { const i = G.tele.indexOf(tl); if (i >= 0) G.tele.splice(i, 1); }
function clearTele() { G.tele.length = 0; }
function release(e, id, tl) { // the strike behind a telegraph happens now: log how long it was shown
  e.log.push({ atk: id, kind: tl.kind, dur: +tl.t.toFixed(3), min: TELE_MIN[tl.kind] }); if (e.log.length > 300) e.log.shift();
}
// Hazards of the boss fight vanish: shells, pending telegraphed strikes, mines (used by phase changes, the death scene and the nuke)
function bossClearHazards() {
  G.tele.length = 0;
  G.bullets = G.bullets.filter(b => b.owner !== 1);
  if (G.mines) G.mines.length = 0;
  for (const e of G.enemies) if (e.isBoss) { e.gen = null; e.atkId = ''; e.glow = 0; e.cool = Math.max(e.cool, 1); if (e.def.onClear) e.def.onClear(e); }
}
const steelBetween = (x0, y0, x1, y1) => {
  const m = G.map, dx = x1 - x0, dy = y1 - y0, n = Math.ceil(Math.hypot(dx, dy) / 12);
  for (let i = 1; i < n; i++) if (m.at(x0 + dx * i / n, y0 + dy * i / n) === STEEL) return true;
  return false;
};
// distance a boss can travel from (x, y) along angle a before its front (margin ahead of the centre) meets steel or water
function rayClip(x, y, a, max, margin) {
  const m = G.map, ca = Math.cos(a), sa = Math.sin(a);
  for (let d = 0; d <= max; d += 6) { const v = m.at(x + ca * (d + margin), y + sa * (d + margin)); if (v === STEEL || v === WATER) return Math.max(0, d - 6); }
  return max;
}

/* ---- danger map for the autopilot: every active warning is a dangerous area ---- */
function bossDanger(x, y, pad, react) { // react: seconds a warning must have been showing before it counts (the bot's reaction time)
  pad = pad || 0; const e = G.boss; if (!e || e.dead) return false;
  if (e.def.danger && e.def.danger(e, x, y, pad)) return true; // per-boss hazards that are not telegraphs (sand strips)
  for (const tl of G.tele) {
    if (react && tl.t < react) continue;
    if (tl.kind === 'circle') { const rr = tl.r + pad; if (dist2(x, y, tl.x, tl.y) < rr * rr) return true; }
    else if (tl.kind === 'line') {
      const ca = Math.cos(tl.a), sa = Math.sin(tl.a), dx = x - tl.x, dy = y - tl.y, al = dx * ca + dy * sa, pr = -dx * sa + dy * ca;
      if (al > -pad - 10 && al < tl.len + e.r + pad && Math.abs(pr) < tl.w / 2 + pad) return true;
    } else if (tl.kind === 'ring') {
      const rr = tl.r + pad; if (dist2(x, y, e.x, e.y) < rr * rr && !steelBetween(e.x, e.y, x, y)) return true;
    } else if (tl.kind === 'glow' && tl.fan) {
      for (const off of tl.fan) {
        const a = e.turret + off, ca = Math.cos(a), sa = Math.sin(a), dx = x - e.x, dy = y - e.y, al = dx * ca + dy * sa, pr = -dx * sa + dy * ca;
        if (al > 0 && al < 640 && Math.abs(pr) < 22 + pad && los(e.x, e.y, x, y)) return true;
      }
    }
  }
  return false;
}

/* ---- boss shells ---- */
function bossShell(e, ang, o) {
  o = o || {};
  const s = e.spec, m = G.map, ca = Math.cos(ang), sa = Math.sin(ang), len = o.len || s.barrel, ox = o.x === undefined ? e.x : o.x, oy = o.y === undefined ? e.y : o.y; // o.x/o.y: a muzzle that is not the boss centre (side turrets)
  let bx = ox, by = oy, blocked = false;
  for (let d = 6; d <= len; d += 6) { bx = ox + ca * d; by = oy + sa * d; if (isWall(m.at(bx, by))) { blocked = true; break; } }
  const sp = s.bSpeed * (o.speed || 1);
  const b = { x: bx, y: by, vx: ca * sp, vy: sa * sp, r: s.bR, owner: 1, dmg: bossDmg(s.dmg * (o.dmgK || 1)), life: 3.2, big: true, dead: false,
    pierce: false, bounce: 0, splash: null, look: 'enemy', hits: null, bricks: null, sx: bx, sy: by, dist: 0, bounced: false, vol: 0, volN: 0, pn: 0, boss: true };
  if (blocked) hitTile(b, bx, by); else G.bullets.push(b);
}
function bossVolley(e, fan, o) { // one volley: a shell per entry of fan (radians relative to the turret), muzzle puffs, recoil; o: bossShell options (speed, dmgK)
  for (const off of fan) if (!barrelSilent(e, off)) bossShell(e, e.turret + off, o); // a silent barrel does not fire
  e.recoil = 1;
  const ca = Math.cos(e.turret), sa = Math.sin(e.turret);
  for (let k = 0; k < 3; k++) {
    const a = e.turret + (k - 1) * 0.2, mx = e.x + Math.cos(a) * (e.spec.barrel + 4), my = e.y + Math.sin(a) * (e.spec.barrel + 4);
    addPart('fire', mx, my, Math.cos(a) * 70, Math.sin(a) * 70, 0.1, 22, 40, 0);
    addPart('smoke', mx, my, ca * 40 + rand(-10, 10), sa * 40 + rand(-10, 10), rand(0.5, 0.8), 14, 28, 3);
  }
  moveTank(e, -ca * 1.2, -sa * 1.2);
  shake(2.5 * prox(e.x, e.y)); Sound.shoot(false, true, volAt(e.x, e.y));
}
// a mortar-style blast on the ground: scorch, explosion, damage to the player when inside
function bossBlast(x, y, r, dmg) {
  const p = G.player;
  explode(x, y, r / 56 * 0.9);
  addDecals(G.map, [{ k: 'scorch', x, y, r: r * 0.8 }]);
  if (p.alive && dist2(x, y, p.x, p.y) < (r + p.r * 0.4) * (r + p.r * 0.4)) damagePlayer({ x: p.x, y: p.y, dmg: bossDmg(dmg), owner: 1, vx: 0, vy: 0 });
}
// angle from (x, y) to where the player will be when a shell of this speed arrives (k: share of the full lead; the player's smoothed velocity, flight time capped)
function leadAng(x, y, speed, k) {
  const p = G.player, t = Math.min(0.8, Math.hypot(p.x - x, p.y - y) / speed) * (k || 0);
  return Math.atan2(p.y + (p.vy || 0) * t - y, p.x + (p.vx || 0) * t - x);
}
const aimAtPlayer = (e, dt, k, lead) => { const p = G.player; if (p.alive) e.turret = turnTo(e.turret, lead ? leadAng(e.x, e.y, e.spec.bSpeed, lead) : Math.atan2(p.y - e.y, p.x - e.x), e.spec.tTurn * (k || 1) * dt); };
function* glowAim(e, id, dur, fan) { // barrel glow telegraph while the turret keeps aiming; the shot itself is the caller's
  const tl = addTele(e, { kind: 'glow', dur, fan });
  while (tl.t < tl.dur) { aimAtPlayer(e, e.dt, 1.6, e.def.lead); yield 0; }
  release(e, id, tl); removeTele(tl);
}

/* ---- movement: a flow field over the tiles where the boss's round hull fits ---- */
// a tile centre fits when a circle of the hull radius (+2) around it touches no wall, water or the map edge (the same test collideWalls uses, so the boss never wedges on the way)
function bossFitMap(e) {
  const m = G.map, n = m.n, rad = e.r + 2, k = Math.ceil(rad / T), fit = e.fit && e.fit.length === n * n ? e.fit : (e.fit = new Uint8Array(n * n));
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const cx = c * T + T / 2, cy = r * T + T / 2; let ok = 1;
    for (let dy = -k; dy <= k && ok; dy++) for (let dx = -k; dx <= k; dx++) {
      if (!blocksTank(m.get(c + dx, r + dy))) continue;
      const bx = (c + dx) * T, by = (r + dy) * T, ex = cx - clamp(cx, bx, bx + T), ey = cy - clamp(cy, by, by + T);
      if (ex * ex + ey * ey < rad * rad) { ok = 0; break; }
    }
    fit[r * n + c] = ok;
  }
  return fit;
}
function computeBossFlow(e) {
  const m = G.map, n = m.n, p = G.player, N = n * n, fit = bossFitMap(e);
  if (!e.flow || e.flow.length !== N) e.flow = new Float32Array(N);
  e.flow.fill(1e9);
  const fg = e.def.flowGoal ? e.def.flowGoal(e) : null; // hook: a fixed place to walk to instead of the player (Demirkök walks to the castle centre)
  const pc = clamp(Math.floor((fg ? fg.x : p.x) / T), 0, n - 1), pr = clamp(Math.floor((fg ? fg.y : p.y) / T), 0, n - 1);
  let goal = -1, gd = 1e9;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!fit[r * n + c]) continue;
    const d = (c - pc) * (c - pc) + (r - pr) * (r - pr); if (d < gd) { gd = d; goal = r * n + c; }
  }
  if (goal < 0) return;
  const q = [goal]; e.flow[goal] = 0;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], c = i % n, r = (i - c) / n;
    for (const [dx, dy] of DIRS) {
      const x = c + dx, y = r + dy; if (x < 0 || y < 0 || x >= n || y >= n || !fit[y * n + x]) continue;
      const j = y * n + x; if (e.flow[j] < 1e8) continue;
      e.flow[j] = e.flow[i] + 1; q.push(j);
    }
  }
}
// the next tile centre to head for. A boss standing on a tile where its hull does not fit (wall hugging, pushed into a pocket) first heads for the best fitting tile nearby
function bossWaypoint(e) {
  const m = G.map, n = m.n, c = clamp(Math.floor(e.x / T), 0, n - 1), r = clamp(Math.floor(e.y / T), 0, n - 1), here = e.flow ? e.flow[r * n + c] : 1e9;
  if (!e.flow || e.flow[r * n + c] > 1e8) return bossEscapeTarget(e);
  let best = null, bv = here;
  for (const [dx, dy] of shuffle(DIRS.slice())) { const x = c + dx, y = r + dy; if (x < 0 || y < 0 || x >= n || y >= n) continue; const f = e.flow[y * n + x]; if (f < bv) { bv = f; best = { c: x, r: y }; } }
  if (!best) return null;
  best.x = best.c * T + T / 2; best.y = best.r * T + T / 2; return best;
}
// nearest fitting tile (breadth first through open ground), preferring the ones closer to the goal; null when the boss is sealed in
function bossEscapeTarget(e) {
  const m = G.map, n = m.n, fit = e.fit; if (!fit || !e.flow) return null;
  const c0 = clamp(Math.floor(e.x / T), 0, n - 1), r0 = clamp(Math.floor(e.y / T), 0, n - 1), seen = new Map([[r0 * n + c0, 0]]), q = [[c0, r0]]; let best = null, bs = 1e9;
  for (let h = 0; h < q.length; h++) {
    const [c, r] = q[h], d = seen.get(r * n + c);
    if (fit[r * n + c] && e.flow[r * n + c] < 1e8) { const sc = d * 1.5 + e.flow[r * n + c] * 0.2 + Math.hypot(c * T + T / 2 - e.x, r * T + T / 2 - e.y) / T; if (sc < bs) { bs = sc; best = { c, r }; } }
    if (d >= 4) continue;
    for (const [dx, dy] of DIRS) { const x = c + dx, y = r + dy; if (x < 0 || y < 0 || x >= n || y >= n || seen.has(y * n + x) || blocksTank(m.t[y * n + x])) continue; seen.set(y * n + x, d + 1); q.push([x, y]); }
  }
  if (!best) return null;
  best.x = best.c * T + T / 2; best.y = best.r * T + T / 2; best.esc = true; return best;
}
// no progress for a while: slide the hull toward the nearest fitting tile centre, through the corner it is caught on (a gentle depenetration, a few px per frame)
function bossUnjam(e, dt) {
  const t = e.jam && e.jam.esc ? e.jam : (e.jam = bossEscapeTarget(e)); if (!t) return;
  const d = Math.hypot(t.x - e.x, t.y - e.y); if (d < 3) { e.jam = null; return; }
  const sp = Math.min(d, 140 * dt); e.x += (t.x - e.x) / d * sp; e.y += (t.y - e.y) / d * sp;
}
function bossMove(e, dt, hold) {
  if (e.treadT > 0) { e.avx = e.avy = 0; return; } // a broken tread: the boss stands still while the crew repairs it
  const s = e.spec, p = G.player, before = e.angle, ox = e.x, oy = e.y;
  e.flowT -= dt; if (e.flowT <= 0) { computeBossFlow(e); e.flowT = 0.3; }
  if (p.alive && !(e.canSee && e.distP < hold * T)) {
    if (e.jamT > 1.8) { bossUnjam(e, dt); e.stuckT = 0; } // side-steps did not help: depenetrate
    else if (e.jam) e.jam = null;
    if (!e.wp || dist2(e.wp.x, e.wp.y, e.x, e.y) < 30) { e.wp = bossWaypoint(e); e.wpBest = 1e9; e.stuckT = 0; }
    if (e.wp) {
      const desired = Math.atan2(e.wp.y - e.y, e.wp.x - e.x);
      e.angle = turnTo(e.angle, desired, s.turn * dt);
      const diff = Math.abs(angDiff(e.angle, desired)), spd = diff < 0.55 ? s.speed * e.speedMul * (1 - diff * 0.9) : 0;
      moveTank(e, Math.cos(e.angle) * spd * dt, Math.sin(e.angle) * spd * dt);
      const dw = Math.hypot(e.wp.x - e.x, e.wp.y - e.y);
      if (dw < e.wpBest - 0.5) { e.wpBest = dw; e.stuckT = 0; } else e.stuckT += dt;
      if (e.stuckT > 0.8) { e.wp = bossSideStep(e); e.wpBest = 1e9; e.stuckT = 0; }
    }
    if (e.jx === undefined || Math.hypot(e.x - e.jx, e.y - e.jy) >= 10) { e.jx = e.x; e.jy = e.y; e.jamT = 0; } else e.jamT = (e.jamT || 0) + dt; // moved less than 10 px in 1.8 s: wedged
  } else e.jamT = 0;
  if (dt > 0) { e.avx = (e.x - ox) / dt; e.avy = (e.y - oy) / dt; }
  trackUpdate(e, (e.x - ox) * Math.cos(e.angle) + (e.y - oy) * Math.sin(e.angle), angDiff(before, e.angle));
}
// a different fitting neighbour tile (not the one just failed), or the escape target when none is left
function bossSideStep(e) {
  const m = G.map, n = m.n, fit = e.fit, c = clamp(Math.floor(e.x / T), 0, n - 1), r = clamp(Math.floor(e.y / T), 0, n - 1), opts = [];
  if (fit) for (const [dx, dy] of DIRS) { const x = c + dx, y = r + dy; if (x >= 0 && y >= 0 && x < n && y < n && fit[y * n + x] && !(e.wp && e.wp.c === x && e.wp.r === y)) opts.push({ c: x, r: y }); }
  if (!opts.length) return bossEscapeTarget(e);
  const o = pick(opts); o.x = o.c * T + T / 2; o.y = o.r * T + T / 2; return o;
}

/* ---- per-frame boss update ---- */
function updateBoss(e, dt, halted) {
  if (e.dead) return;
  const p = G.player;
  e.flash = Math.max(0, e.flash - dt); e.recoil = Math.max(0, e.recoil - dt * 6);
  if (e.def.tick) e.def.tick(e, dt); // per-boss frame hook (Sarı Fırtına: sand strips, wind); runs in the intro and the death scene too
  if (G.phase === 'bossIntro') return; // the intro script drives the boss
  if (e.dying) { bossDeathTick(e, dt); return; }
  bossFx(e, dt); bossPartTick(e, dt);
  if (e.trans > 0) { // phase change: no damage, no attacks
    e.trans -= dt; e.flash = 0.05 + 0.05 * Math.sin(G.time * 30);
    if (e.trans <= 0) { e.trans = 0; e.invuln = false; e.wp = null; }
    return;
  }
  if (e.phased) { bossPhaseCheck(e); if (e.trans > 0) return; }
  if (halted) return; // stunned or frozen: neither moves nor attacks
  e.distP = Math.hypot(p.x - e.x, p.y - e.y);
  e.canSee = p.alive && los(e.x, e.y, p.x, p.y);
  e.cool -= dt;
  e.healT = (e.healT === undefined ? 30 : e.healT) - dt; // a long fight: a worn-down player gets a Tamir kit now and then (not while one still lies around)
  if (e.healT <= 0 && p.alive) { e.healT = 5; if (p.hp < p.maxHp * 0.55 && !G.pickups.some(q => q.kind === 'repair')) { dropRepairAway(e); e.healT = 35; } }
  e.glow = 0;
  for (const tl of G.tele) { tl.t += dt; if (tl.kind === 'glow') e.glow = Math.max(e.glow, tl.t / tl.dur); }
  if (e.gen) {
    e.dt = dt; e.wait -= dt;
    if (e.wait <= 0) { const r = e.gen.next(); if (r.done) endAttack(e); else e.wait = r.value || 0; }
  } else {
    if (e.cool <= 0 && p.alive) startAttack(e); else bossMove(e, dt, e.def.hold || 4.5);
    if (!e.gen) { if (e.canSee) aimAtPlayer(e, dt); else e.turret = turnTo(e.turret, e.angle, e.spec.tTurn * 0.6 * dt); }
  }
}
function startAttack(e) {
  const list = e.def.attacks.filter(a => a.ok(e) && a.id !== e.lastAtk && !(e.acd[a.id] > G.time) && !(a.mov && e.treadT > 0)); // mov: an attack that needs the treads (charge)
  if (!list.length) { e.cool = 0.5; return; }
  let r = Math.random() * list.reduce((s, a) => s + a.w, 0), at = list[list.length - 1];
  for (const a of list) { r -= a.w; if (r <= 0) { at = a; break; } }
  e.atkId = at.id; e.lastAtk = at.id; e.wait = 0; e.gen = at.run(e);
  if (at.cd) e.acd[at.id] = G.time + at.cd;
}
function endAttack(e) {
  e.gen = null; e.atkId = ''; clearTele();
  e.cool = rand(0.9, 1.6) * e.pace * (e.phase >= 2 ? 0.8 : 1);
}

/* ---- phases ---- */
function bossPhaseCheck(e) {
  const th = e.def.phases;
  if (e.phase < th.length && e.hp / e.maxHp * 100 <= th[e.phase]) startTransition(e);
}
function startTransition(e) {
  e.phase++; e.trans = 1.5; e.invuln = true;
  bossClearHazards();
  const kind = e.def.plates && e.def.plates[e.phase - 1];
  if (kind) { e.lost[kind] = true; spawnPiece(e, kind, true); }
  for (let k = 0; k < 10; k++) addPart('smoke', e.x + rand(-26, 26), e.y + rand(-26, 26), rand(-40, 40), rand(-40, 40), rand(1.2, 2), rand(18, 30), 34, 1.2);
  sparks(e.x, e.y, 18, '#ffd27a', 320); explode(e.x, e.y, 0.9); shake(12); Sound.crumble(volAt(e.x, e.y)); vibrate([30, 40, 60]);
  addText(e.x, e.y - e.r - 14, 'EVRE ' + (e.phase + 1), '#ff9a6c', 20);
  dropRepairAway(e);
  if (e.def.onPhase) e.def.onPhase(e, e.phase);
}
// a Tamir pickup on a tile the player can reach, away from the boss
function dropRepairAway(e) {
  const m = G.map, n = m.n, p = G.player, c0 = clamp(Math.floor(p.x / T), 0, n - 1), r0 = clamp(Math.floor(p.y / T), 0, n - 1);
  if (m.flowFrom < 0 || m.flowDirty) { computeFlow(m, r0 * n + c0); m.flowFrom = r0 * n + c0; m.flowDirty = false; }
  const ok = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (blocksTank(m.get(c, r)) || m.flow[r * n + c] > 1e8) continue;
    const x = c * T + T / 2, y = r * T + T / 2, db = Math.hypot(x - e.x, y - e.y), dp = Math.hypot(x - p.x, y - p.y);
    if (db >= 4.5 * T && dp <= 9 * T) ok.push({ x, y, s: Math.abs(dp - 4 * T) });
  }
  ok.sort((a, b) => a.s - b.s);
  const q = ok.length ? pick(ok.slice(0, Math.max(1, Math.ceil(ok.length / 4)))) : { x: p.x, y: p.y };
  dropPickup(q.x, q.y, 'repair', q.x, q.y);
}

/* ---- parts ---- */
const partPos = (e, pt) => { const ca = Math.cos(e.angle), sa = Math.sin(e.angle); return { x: e.x + ca * pt.ox - sa * pt.oy, y: e.y + sa * pt.ox + ca * pt.oy }; };
function partHit(e, pt, x, y, dir) { // a shell hits the part when its path through the hull crosses it
  if (dir === undefined || (x === e.x && y === e.y)) return false;
  const q = partPos(e, pt), tx = Math.cos(dir + Math.PI), ty = Math.sin(dir + Math.PI), dx = q.x - x, dy = q.y - y, along = dx * tx + dy * ty;
  if (along < -pt.r || along > e.r * 2.2) return false;
  return Math.abs(dx * ty - dy * tx) <= pt.r;
}
function breakPart(e, pt) {
  pt.alive = false; pt.hp = 0;
  const q = partPos(e, pt);
  explode(q.x, q.y, 0.8); sparks(q.x, q.y, 14, '#ffd27a', 300); shake(7);
  addText(q.x, q.y - 22, pt.name + ' kırıldı', '#ffd27a', 16);
  dropPickup(q.x, q.y, Math.random() < 0.7 ? 'repair' : pick(['shield', 'rapid', 'triple', 'pierce']), e.x, e.y);
  if (pt.atk && e.atkId === pt.atk) { e.gen = null; e.atkId = ''; e.glow = 0; clearTele(); e.cool = 1; } // the attack the part powered stops at once
  if (e.def.onPartBreak) e.def.onPartBreak(e, pt);
  vibrate(30);
}
/* ---- part damage: treads and barrels (docs/BOSSES.md section 2) ---- */
// Treads (one per side) have their own HP (BT.tread of the boss's max HP). A shell from the side hits the tread on that side; at 0 the boss stands still for BT.halt seconds while the crew repairs it,
// then the tread is full again and the next break needs BT.more more. Breaking a tread during a charge warning (a 'line' telegraph) cancels the charge.
// def.barrels: [{ id, name, ang (radians against the turret), k (share of max HP before it goes silent) }]: a shell from the front adds its damage to the nearest barrel; a full barrel is silent for BT.silent seconds
// (its shells are left out of the volleys) and a glow telegraph in progress is cancelled. Attacks with mov: true do not start while a tread is broken.
const BT = { tread: 0.08, halt: 4, more: 0.5, silent: 3 };
function initBossParts(e) {
  const mx = Math.max(2, Math.round(e.maxHp * BT.tread));
  e.tr = [0, 1].map(() => ({ hp: mx, max: mx, br: 0, t: 0 })); e.treadT = 0; e.cancels = 0;
  e.bars = (e.def.barrels || []).map(b => ({ id: b.id, name: b.name, ang: b.ang, thr: Math.max(2, Math.round(e.maxHp * (b.k || 0.07))), acc: 0, t: 0 }));
}
const barrelSilent = (e, off) => !!e.bars && e.bars.some(b => b.t > 0 && Math.abs(off - b.ang) < 0.08);
function cancelAttack(e, why) { // the part the attack needed broke during its warning
  e.gen = null; e.atkId = ''; e.glow = 0; clearTele(); e.cool = 1.2; e.cancels++;
  e.log.push({ atk: 'cancel', kind: why, dur: 0, min: 0 }); if (e.log.length > 300) e.log.shift();
  addText(e.x, e.y - e.r - 16, 'SALDIRI İPTAL', '#bfeaff', 16);
}
const warning = (e, kind) => G.tele.some(t => t.e === e && t.kind === kind && t.t < t.dur);
function treadWorld(e, i) { const s = e.spec, ly = (i ? 1 : -1) * (s.wid / 2 - s.tread / 2), ca = Math.cos(e.angle), sa = Math.sin(e.angle); return { x: e.x - sa * ly, y: e.y + ca * ly }; }
function bossPartHit(e, dmg, x, y, dir) {
  const a = angDiff(e.angle, dir), aa = Math.abs(a);
  if (aa >= 0.785 && aa <= 2.356) { // side hit: that side's tread
    const i = a > 0 ? 1 : 0, tr = e.tr[i]; if (tr.t > 0) return;
    tr.hp -= dmg; if (tr.hp > 0) return;
    tr.hp = 0; tr.br++; tr.t = BT.halt; e.treadT = BT.halt;
    const q = treadWorld(e, i);
    for (let k = 0, n = Math.max(4, Math.round(10 * fxScale)); k < n; k++) { const an = rand(0, TAU), v = rand(50, 200); addPart('debris', q.x + rand(-14, 14), q.y + rand(-14, 14), Math.cos(an) * v, Math.sin(an) * v, rand(0.8, 1.5), rand(3.5, 6), 0, 3.2, k & 1 ? '#4b473e' : '#1f1d19'); }
    sparks(q.x, q.y, 14, '#ffd27a', 300); explode(q.x, q.y, 0.5); shake(6);
    addText(q.x, q.y - 24, 'Palet kırıldı', '#ffd27a', 16);
    if (warning(e, 'line')) cancelAttack(e, 'palet');
  } else if (e.bars.length && Math.abs(angDiff(e.turret, dir)) < 0.9) { // front hit: the barrel nearest to where the shell passes
    const ct = Math.cos(e.turret), st = Math.sin(e.turret), lat = -st * (x - e.x) + ct * (y - e.y);
    let best = null, bd = 1e9;
    for (const b of e.bars) { if (b.t > 0) continue; const d = Math.abs(Math.sin(b.ang) * e.spec.barrel - lat); if (d < bd) { bd = d; best = b; } }
    if (!best) return;
    best.acc += dmg; if (best.acc < best.thr) return;
    best.acc = 0; best.t = BT.silent;
    const mx = e.x + Math.cos(e.turret + best.ang) * e.spec.barrel, my = e.y + Math.sin(e.turret + best.ang) * e.spec.barrel;
    sparks(mx, my, 10, '#ffb04a', 240); explode(mx, my, 0.35); addText(mx, my - 20, best.name + ' tutukluk', '#ffd27a', 15);
    if (warning(e, 'glow')) cancelAttack(e, 'namlu');
  }
}
function bossPartTick(e, dt) {
  if (e.dying) return;
  e.treadT = e.rooted ? 1 : 0; // a rooted boss (Demirkök, phase 3) cannot move: the same state as a broken tread, which bossMove, startAttack and the bot already read
  for (let i = 0; i < 2; i++) {
    const tr = e.tr[i]; if (tr.t <= 0) continue;
    tr.t -= dt; const q = treadWorld(e, i);
    if (tr.t <= 0) { // repaired: full again, the next break needs more
      tr.t = 0; tr.max = Math.round(Math.max(2, Math.round(e.maxHp * BT.tread)) * (1 + BT.more * tr.br)); tr.hp = tr.max;
      sparks(q.x, q.y, 10, '#fff0b0', 200); addPart('ring', q.x, q.y, 0, 0, 0.4, 6, 70, 0, '255,230,150');
    } else {
      e.treadT = Math.max(e.treadT, tr.t);
      if (Math.random() < dt * 14) addPart('spark', q.x + rand(-16, 16), q.y + rand(-4, 4), rand(-70, 70), rand(-120, -30), rand(0.2, 0.4), 1, 0, 4, '#ffb04a');
    }
  }
  for (const b of e.bars) {
    if (b.t <= 0) continue; b.t -= dt; if (b.t < 0) b.t = 0;
    if (Math.random() < dt * 10) { const mx = e.x + Math.cos(e.turret + b.ang) * e.spec.barrel, my = e.y + Math.sin(e.turret + b.ang) * e.spec.barrel; addPart('smoke', mx, my, rand(-10, 10), rand(-30, -12), rand(0.7, 1.1), rand(10, 15), 22, 1.5); }
  }
}
const partAlive = (e, id) => e.parts.some(pt => pt.id === id && pt.alive);

/* ---- damage ---- */
function bossHurt(e, dmg, x, y, dir, quiet) {
  if (e.dead || e.dying) return;
  const direct = x !== e.x || y !== e.y;
  if (e.invuln || G.phase === 'bossIntro') { if (!quiet && direct) { sparks(x, y, 3, '#ffffff', 160, dir, 1.2); Sound.metal(volAt(e.x, e.y)); } return; }
  const k = e.stunT > 0 ? 1.5 : 1; // stunned bosses take +50%
  for (const pt of e.parts) {
    if (!pt.alive || !partHit(e, pt, x, y, dir)) continue;
    pt.hp -= dmg * k; pt.flash = 0.1;
    if (!quiet) { sparks(x, y, 6, '#ffd27a', 200, dir, 1.4); Sound.metal(volAt(e.x, e.y)); }
    if (pt.hp <= 0) breakPart(e, pt);
    return;
  }
  if (direct && dir !== undefined && !quiet) bossPartHit(e, dmg * k, x, y, dir); // treads and barrels: own HP / accumulated hits (the hull takes the damage too)
  if (e.def.hullMul) dmg *= e.def.hullMul(e, x, y, dir, direct, quiet); // hook: damage multiplier of the hull itself (Demirkök: turret shield, rear weak point)
  const applied = Math.min(dmg * k, e.hp);
  e.hp -= dmg * k; e.flash = 0.1;
  if (typeof nukeOnBossDamage === 'function') nukeOnBossDamage(e, applied); // hook (C): the nuke meter fills with the damage dealt to the boss
  if (direct && !quiet) markHit(e, x, y);
  if (!quiet) { sparks(x, y, 6, '#ffd27a', 200, dir, 1.4); Sound.metal(volAt(e.x, e.y)); }
  if (e.hp <= 0.001) { bossBeginDeath(e); return; }
  const f = e.hp / e.maxHp;
  [0.8, 0.6, 0.4, 0.2].forEach((th, i) => { if (!e.broke[i] && f <= th) { e.broke[i] = true; spawnPiece(e, BOSS_PIECES[i], false); } });
}
const BOSS_PIECES = ['fender', 'plate', 'antenna', 'exhaust'];
function markHit(e, x, y) { // scorch mark on the hull (max 12) and which side takes the beating
  const ca = Math.cos(e.angle), sa = Math.sin(e.angle), dx = x - e.x, dy = y - e.y, lx = ca * dx + sa * dy, ly = -sa * dx + ca * dy;
  e.scorch.push({ x: clamp(lx, -e.spec.len * 0.45, e.spec.len * 0.45), y: clamp(ly, -e.spec.wid * 0.4, e.spec.wid * 0.4), r: rand(2.5, 4.5), a: rand(0, TAU) });
  if (e.scorch.length > 12) e.scorch.shift();
  e.hitSide[Math.abs(lx) > Math.abs(ly) ? (lx > 0 ? 0 : 1) : (ly < 0 ? 2 : 3)]++;
}
const PIECE_AT = { fender: [-30, -36], plate: [14, 32], antenna: [-40, -12], exhaust: [-46, 0], shoulder: [18, 22], skirt: [0, 34], flag: [-24, 0] };
function spawnPiece(e, kind, big) { // a piece of armour breaks off, falls and stays on the ground for a few seconds
  const [lx, ly] = PIECE_AT[kind] || [0, 0], ca = Math.cos(e.angle), sa = Math.sin(e.angle), x = e.x + ca * lx - sa * ly, y = e.y + sa * lx + ca * ly;
  const out = Math.atan2(ly * ca + lx * sa, lx * ca - ly * sa), sp = rand(90, 160);
  G.pieces.push({ k: kind, x, y, vx: Math.cos(out) * sp, vy: Math.sin(out) * sp, a: e.angle + rand(-0.4, 0.4), vr: rand(-6, 6), t: 0, life: big ? 6.5 : 5, big, col: e.spec.col });
  sparks(x, y, 8, '#ffd27a', 220); addPart('flash', x, y, 0, 0, 0.12, 60, 0, 0);
  for (let k = 0; k < 4; k++) addPart('smoke', x + rand(-6, 6), y + rand(-6, 6), rand(-20, 20), rand(-20, 20), rand(0.8, 1.4), rand(12, 20), 26, 1.5);
  Sound.metal(volAt(x, y)); shake(3);
}
function updatePieces(dt) {
  for (const q of G.pieces) { q.t += dt; const k = Math.exp(-4.5 * dt); q.vx *= k; q.vy *= k; q.x += q.vx * dt; q.y += q.vy * dt; q.a += q.vr * dt; q.vr *= k; }
  if (G.pieces.some(q => q.t > q.life)) G.pieces = G.pieces.filter(q => q.t <= q.life);
}
// smoke below 50% (from the side hit most), fire below 25%, sparks above a stunned boss, sparks from broken part sockets
function bossFx(e, dt) {
  e.fxT -= dt; if (e.fxT > 0) return;
  e.fxT = 0.09;
  const f = e.hp / e.maxHp, s = e.spec, ca = Math.cos(e.angle), sa = Math.sin(e.angle), put = (lx, ly) => ({ x: e.x + ca * lx - sa * ly, y: e.y + sa * lx + ca * ly });
  if (f < 0.5) {
    let side = 0, tot = 0; for (const v of e.hitSide) tot += v + 1; let r = Math.random() * tot;
    for (let i = 0; i < 4; i++) { r -= e.hitSide[i] + 1; if (r <= 0) { side = i; break; } }
    const lx = side === 0 ? s.len * 0.4 : side === 1 ? -s.len * 0.4 : rand(-s.len * 0.3, s.len * 0.3), ly = side === 2 ? -s.wid * 0.38 : side === 3 ? s.wid * 0.38 : rand(-s.wid * 0.3, s.wid * 0.3);
    const q = put(lx, ly);
    addPart('smoke', q.x, q.y, rand(-12, 12), rand(-30, -12), rand(0.9, 1.5), rand(12, 20), 24, 1.5);
    if (f < 0.25) addPart('fire', q.x, q.y, rand(-14, 14), rand(-40, -15), rand(0.25, 0.5), rand(10, 16), 12, 2);
  }
  if (e.stunT > 0) { addPart('spark', e.x + rand(-22, 22), e.y - e.r - 6 + rand(-6, 6), rand(-90, 90), rand(-160, -60), rand(0.2, 0.4), 1, 0, 4, '#bfeaff'); }
  for (const pt of e.parts) if (!pt.alive && Math.random() < 0.25) { const q = partPos(e, pt); addPart('spark', q.x, q.y, rand(-60, 60), rand(-90, -20), rand(0.15, 0.3), 1, 0, 4, '#ffb04a'); }
}

/* ---- death scene ---- */
function bossBeginDeath(e) {
  e.dying = true; e.invuln = true; e.deathT = 0; e.chainT = 0; e.hp = 0.001; e.gen = null; e.glow = 0;
  bossClearHazards();
  showBanner(e.def.deathText || 'BOSS DÜŞTÜ', '', 2.4);
  spawnPiece(e, 'flag', true); // the standard topples
  Sound.metal(1); shake(10); vibrate([40, 30, 80]);
}
function bossDeathTick(e, dt) {
  e.deathT += dt; e.chainT -= dt; e.flash = 0.04;
  if (e.chainT <= 0 && e.deathT < 2.2) {
    e.chainT = 0.17;
    const a = e.angle, lx = rand(-e.spec.len * 0.45, e.spec.len * 0.45), ly = rand(-e.spec.wid * 0.4, e.spec.wid * 0.4);
    const x = e.x + Math.cos(a) * lx - Math.sin(a) * ly, y = e.y + Math.sin(a) * lx + Math.cos(a) * ly;
    explode(x, y, rand(0.45, 0.85)); sparks(x, y, 8, '#ffd27a', 280);
  }
  if (e.deathT >= 2.4) killEnemy(e);
}
// called from killEnemy for a boss: armour back to full
function bossDefeated(e) {
  const p = G.player; if (p && p.alive) { p.hp = p.maxHp; addText(p.x, p.y - 30, 'Zırh tam', '#6fd46b', 18); addPart('ring', p.x, p.y, 0, 0, 0.6, 12, 200, 0, '111,212,107'); }
  bossClearHazards();
}

/* ---- boss stage: arena, intro, fight ---- */
function startBossStage(def) {
  const m = G.map, p = G.player, at = m.bossAt;
  G.stage = def; G.queue = []; G.maxAlive = 1;
  const e = spawnBoss(def, at.x, at.y, Math.PI / 2);
  e.invuln = true;
  G.phase = 'bossIntro'; G.phaseT = 0; G.fade = 1; G.introGate = false; G.introSeen = !!store.get(BOSS_SEEN_KEY, false);
  cam.x = at.x; cam.y = at.y + T; clampCam(); computeView();
  Sound.siren();
  showBanner(def.name, (def.introSub || m.arena) + ' · Dalga ' + G.wave, 3);
  return e;
}
const BOSS_SEEN_KEY = 'tankArena.seenBossIntro';
function bossIntroTick(rdt) {
  const e = G.boss, m = G.map, t = G.phaseT;
  G.fade = clamp(1 - t / 0.5, 0, 1);
  if (!e || e.dead) { G.phase = 'fight'; G.phaseT = 0; return; }
  const home = m.bossAt;
  if (t < 1.35) { e.x = home.x + Math.sin(t * 40) * 1.6; if (Math.random() < rdt * 14) addPart('dust', home.x + rand(-30, 30), home.y + e.r + 4, rand(-20, 20), rand(10, 40), rand(0.5, 0.9), rand(12, 20), 24, 2); }
  else {
    if (!G.introGate) { smashGate(true); G.introGate = true; e.x = home.x; }
    if (e.y < home.y + 2 * T) { e.y = Math.min(home.y + 2 * T, e.y + 70 * rdt); trackUpdate(e, 70 * rdt, 0); }
  }
  if (t >= 3.0) endBossIntro(false);
}
function smashGate(loud) {
  const m = G.map;
  for (const [c, r] of m.gate) {
    if (m.t[r * m.n + c] !== BRICK) continue;
    if (loud) { explode(c * T + T / 2, r * T + T / 2, 0.8); destroyBrick(m, c, r, 1); } else { m.t[r * m.n + c] = EMPTY; m.hp[r * m.n + c] = 0; m.flowDirty = true; miniTile(m, c, r); }
  }
  if (loud) { shake(12); } else paintRegion(m, 0, 0, m.n - 1, m.n - 1);
}
function endBossIntro(skipped) {
  const e = G.boss, m = G.map;
  if (!skipped) store.set(BOSS_SEEN_KEY, true);
  if (skipped) { smashGate(false); if (e) { e.x = m.bossAt.x; e.y = m.bossAt.y + 2 * T; } hideBanner(); G.fade = 0; }
  if (e) { e.invuln = false; e.cool = 1.4; }
  G.phase = 'fight'; G.phaseT = 0;
}
// a tap skips the intro, once it has been seen
function bossIntroTap() { if (G.state === 'play' && G.phase === 'bossIntro' && G.introSeen && G.phaseT > 0.25) endBossIntro(true); }
