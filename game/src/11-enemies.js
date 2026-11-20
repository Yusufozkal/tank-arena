/* ================= enemies ================= */
// Enemy pressure. Early waves (1-10) are the old ramp; after that nothing gets more HP, only sharper:
// fire rate, aim, lead, speed and damage keep creeping up slowly, and buildRoster adds heavies / Avcı / tanks alive at once.
function waveMods(w) {
  const D = G.D, late = Math.max(0, w - 10);
  const err0 = Math.max(0.035, 0.13 - (w - 1) * 0.012);
  return { speed: 1 + Math.min(0.3, (w - 1) * 0.03) + Math.min(0.3, late * 0.015), cool: Math.max(0.35, 1 - 0.035 * Math.min(9, w - 1) - 0.013 * late) * D.cool,
    err: Math.max(0.012, err0 - Math.max(0, w - 9) * 0.0008) * D.err,
    lead: Math.min(0.85, (w - 1) * 0.14) + Math.min(0.15, Math.max(0, w - 7) * 0.01),
    dmg: D.dmg * (1 + Math.min(0.6, Math.max(0, w - 13) * 0.02) + Math.max(0, w - 25) * 0.07),
    dodge: Math.min(0.85, D.dodge + late * 0.01), // Avcı sidesteps more of the player's shells as waves go on
    drop: Math.max(0.5, 1 - late * 0.02), // supplies thin out: fewer power-ups (shields!) from late-wave wrecks
    pace: Math.max(0.25, 1 - late * 0.015 - Math.max(0, w - 25) * 0.02), // spawn interval factor: reinforcements arrive faster in late waves
    hp: 1 + Math.min(0.75, Math.max(0, w - 6) * D.hpGrow) + Math.max(0, w - 20) * 0.09 };
}
// Share of Hızlı / Ağır / Avcı among normal-wave tanks. Each type is absent before its first wave (RULES.fastFrom / heavyFrom / hunterFrom) and then grows slowly.
function typeShares(w) {
  const D = G.D;
  return {
    pf: w > D.fastFrom ? Math.min(0.28, 0.04 + 0.02 * (w - D.fastFrom)) - Math.max(0, w - 20) * 0.005 : 0,
    ph: w > D.heavyFrom ? Math.min(0.45, 0.04 + 0.02 * (w - D.heavyFrom)) : 0,
    pu: w > D.hunterFrom ? Math.min(0.35, 0.04 + 0.02 * (w - D.hunterFrom)) : 0 };
}
function buildRoster(w) {
  const D = G.D, list = [];
  if (w % 5 === 0) {
    const esc = 1 + Math.floor(w / 5);
    for (let i = 0; i < esc; i++) list.push(i % 2 && w >= D.fastFrom ? 'fast' : 'basic');
    if (w >= Math.max(20, D.hunterFrom)) list[list.length - 1] = 'hunter'; // escorts follow the same introduction schedule as normal waves
    if (w >= 20) { list[0] = 'heavy'; list[2] = 'hunter'; }
    list.splice(1, 0, 'boss');
    return { list, maxAlive: Math.min(D.maxAlive, 3 + Math.min(5, Math.floor(w / 8)) + D.alive) };
  }
  const total = clamp(Math.round((3 + w + Math.floor(w / 2)) * D.count), 3, 24 + Math.floor(Math.max(0, w - 20) / 2));
  const { pf, ph, pu } = typeShares(w);
  for (let i = 0; i < total; i++) { const r = Math.random(); list.push(r < ph ? 'heavy' : r < ph + pf ? 'fast' : r < ph + pf + pu ? 'hunter' : 'basic'); }
  shuffle(list);
  // a type's first wave: exactly one of it (the roster above has none yet), placed a little way into the wave
  const first = w === D.fastFrom ? 'fast' : w === D.heavyFrom ? 'heavy' : w === D.hunterFrom ? 'hunter' : null;
  if (first) list[Math.min(list.length - 1, 1 + Math.floor(Math.random() * 2))] = first;
  const alive = Math.min(6, 2 + Math.ceil(w / 2)) + (w > 12 ? Math.min(6, 1 + Math.floor((w - 13) / 5)) : 0) + D.alive;
  return { list, maxAlive: Math.min(D.maxAlive, alive) };
}
function chooseSpawn() {
  const p = G.player, m = G.map;
  const free = m.spawns.filter(s => !G.portals.some(q => q.x === s.x && q.y === s.y) && !G.enemies.some(e => dist2(e.x, e.y, s.x, s.y) < 44 * 44));
  let c = free.filter(s => dist2(s.x, s.y, p.x, p.y) > (T * 6) * (T * 6));
  if (!c.length) c = free.filter(s => dist2(s.x, s.y, p.x, p.y) > (T * 3) * (T * 3));
  if (!c.length) return null;
  const off = c.filter(s => !onScreen(s.x, s.y, T));
  const pool = off.length ? off : c;
  // late waves: reinforcements come out of the nearest hatches instead of any hatch
  if (G.wave > 20) pool.sort((a, b) => dist2(a.x, a.y, p.x, p.y) - dist2(b.x, b.y, p.x, p.y));
  return G.wave > 20 ? pool[Math.floor(Math.random() * Math.min(3, pool.length))] : pick(pool);
}
const NEW_FOE = {
  fast: ['tankArena.seenFast', 'Yeni düşman: Hızlı. Küçük ve çevik, hızla yaklaşır ama az dayanır.'],
  heavy: ['tankArena.seenHeavy', 'Yeni düşman: Ağır. Yavaş ama çok sağlam, çift namlu ateş eder.'],
  hunter: ['tankArena.seenHunter', 'Yeni düşman: Avcı. Mermilerden kaçar, siperden ateş eder; ateş etmeden önce yeşil hedef ışığı yakar.'] };
function spawnEnemy(type, x, y) {
  const e = makeTank(type, x, y), p = G.player;
  const a = Math.atan2(p.y - y, p.x - x);
  e.angle = Math.round(a / (Math.PI / 2)) * (Math.PI / 2); e.turret = a;
  e.cool = rand(0.9, 1.7) * G.mods.cool; e.speedMul = G.mods.speed; e.coolMul = G.mods.cool; e.aimErr = rand(-G.mods.err, G.mods.err);
  if (G.mods.hp > 1) e.hp = e.maxHp = Math.max(1, Math.round(e.spec.hp * G.mods.hp)); // later waves bring tougher tanks
  if (type === 'boss') { // Komutan ignores mods.hp: its HP grows per visit instead, and it fires slower on its first visits (x1.6, x1.3, ...)
    e.hp = e.maxHp = bossHp(G.wave); e.coolMul *= 1 + 0.6 / Math.max(1, Math.floor(G.wave / 5));
  }
  G.enemies.push(e);
  const intro = NEW_FOE[type];
  if (intro && !store.get(intro[0], false)) { store.set(intro[0], true); showHint(intro[1], 6); }
  for (let k = 0; k < 10; k++) { const an = rand(0, TAU), sp = rand(30, 90); addPart('dust', x, y, Math.cos(an) * sp, Math.sin(an) * sp, rand(0.5, 0.9), rand(16, 26), 26, 3); }
  addPart('ring', x, y, 0, 0, 0.4, 10, 120, 0, '224,83,58');
  if (type === 'boss') { G.boss = e; showBanner('KOMUTAN GELDİ', G.wave <= 5 ? 'Namluları parlayınca yana kaç' : 'Her gelişinde daha güçlü', 1.9); shake(6); }
}
function updateSpawns(dt) {
  G.spawnTimer -= dt;
  if (G.queue.length && G.enemies.length + G.portals.length < G.maxAlive && G.spawnTimer <= 0) {
    const sp = chooseSpawn();
    if (sp) { G.portals.push({ x: sp.x, y: sp.y, t: 0, dur: 1.15, type: G.queue.shift(), done: false }); G.spawnTimer = rand(0.7, 1.5) * G.mods.pace; Sound.spawn(volAt(sp.x, sp.y)); }
    else G.spawnTimer = 0.25;
  }
  const p = G.player;
  for (const q of G.portals) {
    q.t += dt;
    if (q.t >= q.dur) {
      const blocked = (p.alive && dist2(q.x, q.y, p.x, p.y) < 40 * 40) || G.enemies.some(e => dist2(q.x, q.y, e.x, e.y) < 38 * 38);
      if (!blocked) { spawnEnemy(q.type, q.x, q.y); q.done = true; }
    } else if (Math.random() < dt * 10) {
      const a = rand(0, TAU); addPart('dust', q.x + Math.cos(a) * 26, q.y + Math.sin(a) * 26, -Math.cos(a) * 40, -Math.sin(a) * 40, 0.5, 10, 10, 1);
    }
  }
  if (G.portals.some(q => q.done)) G.portals = G.portals.filter(q => !q.done);
}
function updateEnemy(e, dt) {
  const s = e.spec, p = G.player, m = G.map;
  if (s.smart) { updateHunter(e, dt); return; }
  e.cool -= dt; e.flash = Math.max(0, e.flash - dt); e.recoil = Math.max(0, e.recoil - dt * 6);
  e.hidden = m.at(e.x, e.y) === BUSH;
  e.senseT -= dt;
  if (e.senseT <= 0) {
    e.senseT = 0.1 + Math.random() * 0.08;
    if (p.alive) {
      const d = Math.hypot(p.x - e.x, p.y - e.y); e.distP = d;
      const pHidden = m.at(p.x, p.y) === BUSH && G.time - p.lastShot > 1.2;
      e.canSee = d < (G.buffs.stealth > 0 ? T * 1.6 : pHidden ? T * 2.3 : T * 13) && los(e.x, e.y, p.x, p.y);
    } else e.canSee = false;
  }
  const wantMove = !(e.canSee && e.distP < s.hold * T);
  e.blast = null;
  let tx = 0, ty = 0, hasT = false;
  if (wantMove) {
    if (!e.wp || dist2(e.wp.x, e.wp.y, e.x, e.y) < 25) { e.wp = nextWaypoint(e); e.wpBest = 1e9; e.stuckT = 0; }
    if (e.wp) {
      const v = m.get(e.wp.c, e.wp.r);
      if (v === BRICK) e.blast = e.wp;
      else if (blocksTank(v)) e.wp = null;
      else { tx = e.wp.x; ty = e.wp.y; hasT = true; }
    }
  }
  const before = e.angle, ox = e.x, oy = e.y;
  if (hasT) {
    const desired = Math.atan2(ty - e.y, tx - e.x);
    e.angle = turnTo(e.angle, desired, s.turn * dt);
    const diff = Math.abs(angDiff(e.angle, desired));
    const spd = diff < 0.55 ? s.speed * e.speedMul * (1 - diff * 0.9) : 0;
    moveTank(e, Math.cos(e.angle) * spd * dt, Math.sin(e.angle) * spd * dt);
    const dw = Math.hypot(tx - e.x, ty - e.y);
    if (dw < e.wpBest - 0.5) { e.wpBest = dw; e.stuckT = 0; } else e.stuckT += dt;
    if (e.stuckT > 1.2) { e.wp = randomNeighbor(e); e.wpBest = 1e9; e.stuckT = 0; }
  } else if (e.blast) {
    e.angle = turnTo(e.angle, Math.atan2(e.blast.y - e.y, e.blast.x - e.x), s.turn * dt);
  }
  if (dt > 0) { e.avx = (e.x - ox) / dt; e.avy = (e.y - oy) / dt; }
  trackUpdate(e, (e.x - ox) * Math.cos(e.angle) + (e.y - oy) * Math.sin(e.angle), angDiff(before, e.angle));
  let aim = null, may = false;
  if (e.canSee && p.alive) {
    const tt = e.distP / s.bSpeed * G.mods.lead;
    aim = Math.atan2(p.y + p.avy * tt - e.y, p.x + p.avx * tt - e.x) + e.aimErr;
    may = onFireView(e.x, e.y, T * 0.3);
  } else if (e.blast) { aim = Math.atan2(e.blast.y - e.y, e.blast.x - e.x); may = true; }
  if (e.type === 'boss') e.chargeT = e.canSee && p.alive && e.cool < 0.55 ? e.chargeT + dt : 0; // Komutan's barrels glow while charging
  if (aim !== null) {
    e.turret = turnTo(e.turret, aim, s.tTurn * dt);
    if (may && e.cool <= 0 && Math.abs(angDiff(e.turret, aim)) < 0.07 && (e.type !== 'boss' || !e.canSee || e.chargeT >= 0.45)) {
      fireTank(e); e.cool = s.cool * e.coolMul * rand(0.85, 1.25); e.aimErr = rand(-G.mods.err, G.mods.err);
      if (e.type === 'boss') e.chargeT = 0;
    }
  } else e.turret = turnTo(e.turret, e.angle, s.tTurn * 0.6 * dt);
  damageSmoke(e, dt);
}

/* ================= Avcı: the smart tank ================= */
// Sidestep a player shell that is on course to hit; each shell gets one roll against the difficulty's dodge chance
function checkDodge(e) {
  const m = G.map;
  for (const b of G.bullets) {
    if (b.dead || b.owner !== 0) continue;
    const v2 = b.vx * b.vx + b.vy * b.vy; if (!v2) continue;
    const t = ((e.x - b.x) * b.vx + (e.y - b.y) * b.vy) / v2;
    if (t < 0.05 || t > 0.55) continue;
    const cx = b.x + b.vx * t - e.x, cy = b.y + b.vy * t - e.y, hit = e.r + b.r + 6;
    if (cx * cx + cy * cy > hit * hit) continue;
    if (!b.seenBy) b.seenBy = [];
    if (b.seenBy.includes(e.id)) continue;
    b.seenBy.push(e.id);
    if (Math.random() > G.mods.dodge) continue;
    const sp = Math.sqrt(v2), nx = -b.vy / sp, ny = b.vx / sp, side = cx * nx + cy * ny;
    for (const sg of side > 0 ? [-1, 1] : [1, -1]) {
      if (blocksTank(m.at(e.x + nx * sg * (e.r + 30), e.y + ny * sg * (e.r + 30)))) continue;
      e.dodge = { x: nx * sg, y: ny * sg, t: 0.3 }; e.dodgeCd = 0.85; G.dodges++;
      for (let k = 0; k < 4; k++) addPart('dust', e.x - nx * sg * 10 + rand(-6, 6), e.y - ny * sg * 10 + rand(-6, 6), -nx * sg * 40, -ny * sg * 40, 0.5, 14, 20, 3);
      return;
    }
  }
}
// Nearest reachable tile the player cannot see (bushes preferred); returns the tile path from the hunter's tile
function findCover(e, radius) {
  const m = G.map, n = m.n, p = G.player;
  const c0 = clamp(Math.floor(e.x / T), 0, n - 1), r0 = clamp(Math.floor(e.y / T), 0, n - 1), s0 = r0 * n + c0;
  const prev = new Map([[s0, -1]]), q = [[s0, 0]];
  let best = -1, bestScore = 1e9;
  for (let h = 0; h < q.length; h++) {
    const [i, d] = q[h], c = i % n, r = (i - c) / n, x = c * T + T / 2, y = r * T + T / 2;
    const dp = p.alive ? Math.hypot(p.x - x, p.y - y) / T : 9;
    const exposed = p.alive && dp < 14 && los(x, y, p.x, p.y);
    const taken = G.enemies.some(o => o !== e && !o.dead && dist2(o.x, o.y, x, y) < 30 * 30);
    const score = d * 1.2 + (exposed ? 100 : 0) + (dp < 2.5 ? 30 : 0) + (taken ? 20 : 0) + (m.t[i] === BUSH ? -1.5 : 0) + Math.abs(dp - 5) * 0.3;
    if (score < bestScore) { bestScore = score; best = i; }
    if (d >= radius) continue;
    for (const [dx, dy] of DIRS) {
      const xx = c + dx, yy = r + dy; if (blocksTank(m.get(xx, yy))) continue;
      const k = yy * n + xx; if (prev.has(k)) continue;
      prev.set(k, i); q.push([k, d + 1]);
    }
  }
  if (best < 0 || bestScore >= 100) return null;
  const path = [];
  for (let k = best; k !== -1; k = prev.get(k)) path.push(k);
  path.reverse();
  return path.map(k => { const c = k % n, r = (k - c) / n; return { c, r, x: c * T + T / 2, y: r * T + T / 2 }; });
}
function updateHunter(e, dt) {
  const s = e.spec, p = G.player, m = G.map;
  e.cool -= dt; e.flash = Math.max(0, e.flash - dt); e.recoil = Math.max(0, e.recoil - dt * 6); e.dodgeCd = Math.max(0, e.dodgeCd - dt);
  e.hidden = m.at(e.x, e.y) === BUSH;
  e.senseT -= dt;
  if (e.senseT <= 0) {
    e.senseT = 0.08 + Math.random() * 0.04;
    if (p.alive) {
      const d = Math.hypot(p.x - e.x, p.y - e.y); e.distP = d;
      const pHidden = m.at(p.x, p.y) === BUSH && G.time - p.lastShot > 1.2;
      e.canSee = d < (G.buffs.stealth > 0 ? T * 1.6 : pHidden ? T * 2.8 : T * 14) && los(e.x, e.y, p.x, p.y);
      if (e.canSee) { e.seenX = p.x; e.seenY = p.y; e.seenT = G.time; e.reconDone = false; }
    } else e.canSee = false;
    if (!e.dodge && e.dodgeCd <= 0) checkDodge(e);
  }
  // modes: hunt (sneak in and shoot), cover (duck out of sight while reloading), retreat (once, when badly hurt)
  if (!e.fled && e.hp <= 1 && e.maxHp > 1) { e.fled = true; e.mode = 'retreat'; e.modeT = 3; e.path = null; }
  if (e.mode === 'retreat') { e.modeT -= dt; if (e.modeT <= 0) { e.mode = 'hunt'; e.path = null; } }
  else if (e.mode === 'cover') { if (e.cool <= 0.3 || !p.alive) { e.mode = 'hunt'; e.path = null; } }
  else if (e.canSee && G.time - e.lastShot < 0.25 && e.cool > 0.7) { e.mode = 'cover'; e.path = null; G.covers++; }

  const before = e.angle, ox = e.x, oy = e.y;
  let goal = null;
  e.blast = null;
  if (e.dodge) {
    e.dodge.t -= dt;
    const sp = s.speed * 1.6 * e.speedMul;
    moveTank(e, e.dodge.x * sp * dt, e.dodge.y * sp * dt);
    if (e.dodge.t <= 0) { e.dodge = null; e.wp = null; e.path = null; }
  } else if (e.mode === 'cover' || e.mode === 'retreat') {
    e.pathT -= dt;
    if (!e.path || e.pathT <= 0) {
      e.path = findCover(e, e.mode === 'retreat' ? 6 : 4); e.pathI = 1; e.pathT = 0.7;
      if (!e.path && e.mode === 'cover') e.mode = 'hunt';
    }
    if (e.path && e.pathI < e.path.length) {
      const wp = e.path[e.pathI];
      if (dist2(wp.x, wp.y, e.x, e.y) < 30) e.pathI++; else goal = wp;
    }
  } else if (!(e.canSee && e.distP < s.hold * T)) {
    if (!e.wp || dist2(e.wp.x, e.wp.y, e.x, e.y) < 25) { e.wp = nextWaypoint(e, m.sflow); e.wpBest = 1e9; e.stuckT = 0; }
    if (e.wp) {
      const v = m.get(e.wp.c, e.wp.r);
      if (v === BRICK) e.blast = e.wp; else if (blocksTank(v)) e.wp = null; else goal = e.wp;
    }
  }
  if (goal) {
    const desired = Math.atan2(goal.y - e.y, goal.x - e.x);
    e.angle = turnTo(e.angle, desired, s.turn * dt);
    const diff = Math.abs(angDiff(e.angle, desired));
    const spd = diff < 0.6 ? s.speed * e.speedMul * (1 - diff * 0.8) : 0;
    moveTank(e, Math.cos(e.angle) * spd * dt, Math.sin(e.angle) * spd * dt);
    const dw = Math.hypot(goal.x - e.x, goal.y - e.y);
    if (dw < e.wpBest - 0.5) { e.wpBest = dw; e.stuckT = 0; } else e.stuckT += dt;
    if (e.stuckT > 1) { e.wp = randomNeighbor(e); e.path = null; e.wpBest = 1e9; e.stuckT = 0; }
  } else if (e.blast) e.angle = turnTo(e.angle, Math.atan2(e.blast.y - e.y, e.blast.x - e.x), s.turn * dt);
  if (dt > 0) { e.avx = (e.x - ox) / dt; e.avy = (e.y - oy) / dt; }
  trackUpdate(e, (e.x - ox) * Math.cos(e.angle) + (e.y - oy) * Math.sin(e.angle), angDiff(before, e.angle));

  // turret: full lead on a visible player, one shot into the spot where it lost the player, or a brick in the way
  let aim = null, may = false;
  if (e.canSee && p.alive) {
    const tt = e.distP / s.bSpeed;
    let tx = p.x + p.avx * tt, ty = p.y + p.avy * tt;
    if (!los(e.x, e.y, tx, ty)) { tx = p.x; ty = p.y; }
    aim = Math.atan2(ty - e.y, tx - e.x) + e.aimErr * 0.3;
    may = onFireView(e.x, e.y, T * 0.3);
  } else if (p.alive && !e.reconDone && G.time - e.seenT < 2.2 && dist2(e.x, e.y, e.seenX, e.seenY) < (T * 9) * (T * 9) && los(e.x, e.y, e.seenX, e.seenY)) {
    aim = Math.atan2(e.seenY - e.y, e.seenX - e.x);
    may = onFireView(e.x, e.y, T * 0.3);
  } else if (e.blast) { aim = Math.atan2(e.blast.y - e.y, e.blast.x - e.x); may = true; }
  e.lock = false;
  if (aim !== null) {
    e.turret = turnTo(e.turret, aim, s.tTurn * dt);
    const off = Math.abs(angDiff(e.turret, aim));
    e.lock = e.canSee && may && e.cool < 0.45 && off < 0.3;
    if (may && e.cool <= 0 && off < 0.06) {
      fireTank(e);
      e.cool = s.cool * e.coolMul * rand(0.9, 1.15);
      e.aimErr = rand(-G.mods.err, G.mods.err);
      if (!e.canSee && !e.blast) e.reconDone = true;
    }
  } else e.turret = turnTo(e.turret, e.angle, s.tTurn * 0.6 * dt);
  damageSmoke(e, dt);
}

