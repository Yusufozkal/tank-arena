/* ================= enemies ================= */
// Enemy pressure. Early waves (1-10) are the old ramp; after that nothing gets more HP, only sharper:
// fire rate, aim, lead, speed and damage keep creeping up slowly, and buildRoster adds heavies / Avcı / tanks alive at once.
function waveMods(w) {
  const D = G.D, late = Math.max(0, w - 10), rn = removedN();
  const err0 = Math.max(0.035, 0.13 - (w - 1) * 0.012);
  return { speed: 1 + Math.min(0.3, (w - 1) * 0.03) + Math.min(0.3, late * 0.015), cool: Math.max(0.35, 1 - 0.035 * Math.min(9, w - 1) - 0.013 * late) * D.cool * (1 - 0.07 * rn),
    err: Math.max(0.012, err0 - Math.max(0, w - 9) * 0.0008) * D.err * (1 - 0.1 * rn),
    lead: Math.min(0.85, (w - 1) * 0.14) + Math.min(0.15, Math.max(0, w - 7) * 0.01),
    dmg: D.dmg * (1 + Math.min(0.6, Math.max(0, w - 13) * 0.02) + Math.max(0, w - 25) * 0.07),
    dodge: Math.min(0.85, D.dodge + late * 0.01), // Avcı sidesteps more of the player's shells as waves go on
    drop: Math.max(0.5, 1 - late * 0.02), // supplies thin out: fewer power-ups (shields!) from late-wave wrecks
    pace: Math.max(0.25, 1 - late * 0.015 - Math.max(0, w - 25) * 0.02), // spawn interval factor: reinforcements arrive faster in late waves
    hp: 1 + Math.min(0.75, Math.max(0, w - 6) * D.hpGrow) + Math.max(0, w - 20) * 0.09 };
}
// Region rule (docs/BOSSES.md section 9): a defeated boss takes its enemy types out of the rest of the run. G.beaten holds the ids of the bosses beaten in this run (13 waveCleared).
// A boss wave still played by the stand-in Komutan records 'komutan', which removes nothing.
const REGION_BAN = { sari: ['fast'], demirkok: ['heavy', 'tamirci'], kiragi: ['hunter'] };
const REGION_NAME = { fast: 'Keşif tankları', heavy: 'Ağır tanklar', tamirci: 'Tamirciler', hunter: 'Avcılar' };
const typeBanned = type => { for (const id of G.beaten) { const l = REGION_BAN[id]; if (l && l.includes(type)) return true; } return false; };
const regionGone = id => (REGION_BAN[id] || []).map(t => REGION_NAME[t]); // names removed by boss id
// Share of Hızlı / Ağır / Avcı / Tamirci among normal-wave tanks. Each type is absent before its first wave (RULES.fastFrom / heavyFrom / hunterFrom / tamirciFrom), then grows slowly; a beaten boss's types stay at 0.
// Thinner waves after a region change are made up with numbers and sharper fire, never with HP: +16% tanks, -7% reload time, -10% aim error per removed type
const removedN = () => ['fast', 'heavy', 'hunter', 'tamirci'].filter(typeBanned).length;
function typeShares(w) {
  const D = G.D, ok = t => !typeBanned(t);
  return {
    pf: ok('fast') && w > D.fastFrom ? Math.min(0.28, 0.04 + 0.02 * (w - D.fastFrom)) - Math.max(0, w - 20) * 0.005 : 0,
    ph: ok('heavy') && w > D.heavyFrom ? Math.min(0.45, 0.04 + 0.02 * (w - D.heavyFrom)) : 0,
    pu: ok('hunter') && w > D.hunterFrom ? Math.min(0.35, 0.04 + 0.02 * (w - D.hunterFrom)) : 0,
    pt: ok('tamirci') && w > D.tamirciFrom ? Math.min(0.15, 0.03 + 0.015 * (w - D.tamirciFrom)) : 0 };
}
function buildRoster(w) {
  const D = G.D, list = [];
  if (w % 5 === 0) return { list: ['boss'], maxAlive: 1 }; // boss stage: only the boss on the field, no escorts (startBossStage spawns it)
  const rk = 1 + 0.16 * removedN(), total = clamp(Math.round((3 + w + Math.floor(w / 2)) * D.count * rk), 3, Math.round((24 + Math.floor(Math.max(0, w - 20) / 2)) * rk));
  const { pf, ph, pu, pt } = typeShares(w);
  for (let i = 0; i < total; i++) { const r = Math.random(); list.push(r < ph ? 'heavy' : r < ph + pf ? 'fast' : r < ph + pf + pu ? 'hunter' : r < ph + pf + pu + pt ? 'tamirci' : 'basic'); }
  shuffle(list);
  // a type's first wave: exactly one of it (the roster above has none yet), placed a little way into the wave; never for a type the region rule removed
  const first = w === D.fastFrom ? 'fast' : w === D.heavyFrom ? 'heavy' : w === D.hunterFrom ? 'hunter' : w === D.tamirciFrom ? 'tamirci' : null;
  if (first && !typeBanned(first)) list[Math.min(list.length - 1, first === 'tamirci' ? 3 : 1 + Math.floor(Math.random() * 2))] = first;
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
  hunter: ['tankArena.seenHunter', 'Yeni düşman: Avcı. Mermilerden kaçar, siperden ateş eder; ateş etmeden önce yeşil hedef ışığı yakar.'],
  tamirci: ['tankArena.seenTamirci', 'Yeni düşman: Tamirci. Silahı yok; yanındaki tankları onarır. Önce onu vur.'] };
function spawnEnemy(type, x, y) {
  if (type === 'boss') { // debug / old paths: a boss in an ordinary wave (no phases, no stage)
    const a = Math.atan2(G.player.y - y, G.player.x - x), e = spawnBoss(bossDefAt(G.wave) || BOSS_DEFS.komutan, x, y, a);
    addPart('ring', x, y, 0, 0, 0.4, 10, 120, 0, '224,83,58'); return e;
  }
  const e = makeTank(type, x, y), p = G.player;
  const a = Math.atan2(p.y - y, p.x - x);
  e.angle = Math.round(a / (Math.PI / 2)) * (Math.PI / 2); e.turret = a;
  e.cool = rand(0.9, 1.7) * G.mods.cool; e.speedMul = G.mods.speed; e.coolMul = G.mods.cool; e.aimErr = rand(-G.mods.err, G.mods.err);
  if (G.mods.hp > 1) e.hp = e.maxHp = Math.max(1, Math.round(e.spec.hp * G.mods.hp)); // later waves bring tougher tanks
  G.enemies.push(e);
  const intro = NEW_FOE[type];
  if (intro && !store.get(intro[0], false)) { store.set(intro[0], true); showHint(intro[1], 6); }
  for (let k = 0; k < 10; k++) { const an = rand(0, TAU), sp = rand(30, 90); addPart('dust', x, y, Math.cos(an) * sp, Math.sin(an) * sp, rand(0.5, 0.9), rand(16, 26), 26, 3); }
  addPart('ring', x, y, 0, 0, 0.4, 10, 120, 0, '224,83,58');
}
function updateSpawns(dt) {
  G.spawnTimer -= dt;
  if (G.queue.length && G.enemies.length + G.portals.length < G.maxAlive && G.spawnTimer <= 0) {
    const sp = chooseSpawn();
    if (sp) {
      let ty = G.queue.shift();
      if (ty === 'tamirci' && G.enemies.filter(o => o.type === 'tamirci').length + G.portals.filter(q => q.type === 'tamirci').length >= 2) ty = 'basic'; // at most two Tamirci on the field
      G.portals.push({ x: sp.x, y: sp.y, t: 0, dur: 1.15, type: ty, done: false }); G.spawnTimer = rand(0.7, 1.5) * G.mods.pace; Sound.spawn(volAt(sp.x, sp.y));
    } else G.spawnTimer = 0.25;
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
  if (s.medic) { updateTamirci(e, dt); return; }
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
  const before = e.angle, ox = e.x, oy = e.y, trB = !!e.pt && e.pt.tread > 0, jam = !!e.pt && e.pt.barrel > 0, pk = e.pt && e.pt.engine > 0 ? 0.5 : 1; // part damage: broken tread / jammed barrel / damaged engine
  if (hasT && !trB) {
    const desired = Math.atan2(ty - e.y, tx - e.x);
    e.angle = turnTo(e.angle, desired, s.turn * dt);
    const diff = Math.abs(angDiff(e.angle, desired));
    const spd = diff < 0.55 ? s.speed * e.speedMul * pk * (1 - diff * 0.9) : 0;
    moveTank(e, Math.cos(e.angle) * spd * dt, Math.sin(e.angle) * spd * dt);
    const dw = Math.hypot(tx - e.x, ty - e.y);
    if (dw < e.wpBest - 0.5) { e.wpBest = dw; e.stuckT = 0; } else e.stuckT += dt;
    if (e.stuckT > 1.2) { e.wp = randomNeighbor(e); e.wpBest = 1e9; e.stuckT = 0; }
  } else if (e.blast && !trB) {
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
    if (may && e.cool <= 0 && !jam && Math.abs(angDiff(e.turret, aim)) < 0.07 && (e.type !== 'boss' || !e.canSee || e.chargeT >= 0.45)) {
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

  const before = e.angle, ox = e.x, oy = e.y, trB = !!e.pt && e.pt.tread > 0, jam = !!e.pt && e.pt.barrel > 0, pk = e.pt && e.pt.engine > 0 ? 0.5 : 1; // part damage
  let goal = null;
  e.blast = null;
  if (trB) e.dodge = null;
  if (e.dodge) {
    e.dodge.t -= dt;
    const sp = s.speed * 1.6 * e.speedMul * pk;
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
  if (goal && !trB) {
    const desired = Math.atan2(goal.y - e.y, goal.x - e.x);
    e.angle = turnTo(e.angle, desired, s.turn * dt);
    const diff = Math.abs(angDiff(e.angle, desired));
    const spd = diff < 0.6 ? s.speed * e.speedMul * pk * (1 - diff * 0.8) : 0;
    moveTank(e, Math.cos(e.angle) * spd * dt, Math.sin(e.angle) * spd * dt);
    const dw = Math.hypot(goal.x - e.x, goal.y - e.y);
    if (dw < e.wpBest - 0.5) { e.wpBest = dw; e.stuckT = 0; } else e.stuckT += dt;
    if (e.stuckT > 1) { e.wp = randomNeighbor(e); e.path = null; e.wpBest = 1e9; e.stuckT = 0; }
  } else if (e.blast && !trB) e.angle = turnTo(e.angle, Math.atan2(e.blast.y - e.y, e.blast.x - e.x), s.turn * dt);
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
    if (may && e.cool <= 0 && !jam && off < 0.06) {
      fireTank(e);
      e.cool = s.cool * e.coolMul * rand(0.9, 1.15);
      e.aimErr = rand(-G.mods.err, G.mods.err);
      if (!e.canSee && !e.blast) e.reconDone = true;
    }
  } else e.turret = turnTo(e.turret, e.angle, s.tTurn * 0.6 * dt);
  damageSmoke(e, dt);
}


/* ================= parça hasarı (docs/BOSSES.md section 2) ================= */
// A shell hit that does not kill breaks a part by the direction it came from (against the hull): side -> tread (cannot move), front -> barrel (cannot fire), rear -> engine (half speed).
// e.pt = { tread, barrel, engine: seconds left broken; imm: seconds of immunity after the repair; dur: the repair time (ring); side }. Boss treads and barrels: 11a.
const PART_T = { tread: 1.5, barrel: 1.2, engine: 1.8, imm: 1.5, fast: 1.3, fastFrom: 20 }, PART_NAME = { tread: 'Palet kırıldı', barrel: 'Namlu tutukluk', engine: 'Motor hasarlı' };
const partSeen = {};
function partWorld(e, k) { // world position of a part: tread (the broken side), barrel (muzzle), engine (rear deck)
  const s = e.spec, ca = Math.cos(e.angle), sa = Math.sin(e.angle);
  if (k === 'barrel') return { x: e.x + Math.cos(e.turret) * s.barrel, y: e.y + Math.sin(e.turret) * s.barrel };
  const lx = k === 'engine' ? -s.len / 2 : 0, ly = k === 'tread' ? (e.pt.side ? 1 : -1) * (s.wid / 2 - s.tread / 2) : 0;
  return { x: e.x + ca * lx - sa * ly, y: e.y + sa * lx + ca * ly };
}
function partBreak(e, b) { // called from damageEnemy: a direct shell of the player hit tank e and did not kill it
  if (e.dead || e.isBoss || e.type === 'boss' || b.owner !== 0 || b.lob || G.boss === e) return;
  if (b.vol && e.pvol === b.vol) return; // the other shells of one volley (Ikiz, Uclu, Sarapnel) count once
  e.pvol = b.vol;
  const a = angDiff(e.angle, Math.atan2(-b.vy, -b.vx)), aa = Math.abs(a); // direction towards the shooter, against the hull
  const k = aa < 0.785 ? 'barrel' : aa > 2.356 ? 'engine' : 'tread';
  if (k === 'barrel' && e.spec.medic) return; // the Tamirci has no barrel to jam
  const pt = e.pt || (e.pt = { tread: 0, barrel: 0, engine: 0, imm: { tread: 0, barrel: 0, engine: 0 }, dur: { tread: 0, barrel: 0, engine: 0 }, side: 0, fx: 0 });
  if (pt[k] > 0 || pt.imm[k] > 0) return;
  pt[k] = pt.dur[k] = PART_T[k] / (G.wave > PART_T.fastFrom ? PART_T.fast : 1);
  if (k === 'tread') pt.side = a > 0 ? 1 : 0;
  const q = partWorld(e, k), vl = volAt(e.x, e.y);
  if (k === 'tread') {
    for (let i = 0, n = Math.max(3, Math.round(7 * fxScale)); i < n; i++) { const an = rand(0, TAU), v = rand(40, 170); addPart('debris', q.x + rand(-8, 8), q.y + rand(-8, 8), Math.cos(an) * v, Math.sin(an) * v, rand(0.7, 1.3), rand(3, 5.5), 0, 3.4, i & 1 ? '#4b473e' : '#1f1d19'); }
    sparks(q.x, q.y, 9, '#ffd27a', 240);
  } else if (k === 'barrel') { sparks(q.x, q.y, 8, '#ffb04a', 220); for (let i = 0; i < 3; i++) addPart('smoke', q.x, q.y, rand(-20, 20), rand(-30, -8), rand(0.6, 1), rand(10, 15), 22, 2); }
  else { for (let i = 0, n = Math.max(2, Math.round(5 * fxScale)); i < n; i++) addPart('smoke', q.x + rand(-4, 4), q.y + rand(-4, 4), rand(-40, 10) - Math.cos(e.angle) * 20, rand(-30, 5), rand(0.8, 1.4), rand(12, 20), 26, 1.6, 'k'); sparks(q.x, q.y, 5, '#ffb04a', 160); }
  Sound.metal(vl);
  if (!partSeen[k]) { partSeen[k] = true; addText(e.x, e.y - e.r - 12, PART_NAME[k], '#ffd27a', 13); }
}
function partTick(e, dt) { // timers, repair, smoke; once per frame per enemy (tickStatus)
  const pt = e.pt;
  pt.fx -= dt; const fx = pt.fx <= 0; if (fx) pt.fx = 0.1;
  for (const k of ['tread', 'barrel', 'engine']) {
    if (pt[k] > 0) {
      pt[k] -= dt;
      if (pt[k] <= 0) { // repaired: a spark burst and a ring, then 1.5 s immune
        pt[k] = 0; pt.imm[k] = PART_T.imm; const q = partWorld(e, k);
        sparks(q.x, q.y, 5, '#fff0b0', 150); addPart('ring', q.x, q.y, 0, 0, 0.3, 4, 40, 0, '255,230,150');
      } else if (fx) {
        const q = partWorld(e, k);
        if (k === 'tread') { if (Math.random() < 0.5) addPart('spark', q.x, q.y, rand(-60, 60), rand(-90, -20), rand(0.15, 0.3), 1, 0, 4, '#ffb04a'); }
        else if (k === 'barrel') addPart('smoke', q.x, q.y, rand(-8, 8), rand(-30, -14), rand(0.7, 1.1), rand(8, 13), 20, 1.5);
        else if (fxScale === 1 || Math.random() < 0.5) addPart('smoke', q.x, q.y, rand(-10, 10) - Math.cos(e.angle) * 22, rand(-30, -12), rand(0.8, 1.3), rand(10, 16), 24, 1.5, 'k');
      }
    } else if (pt.imm[k] > 0) pt.imm[k] -= dt;
  }
}

/* ================= Tamirci (docs/BOSSES.md section 9) ================= */
// No weapon. Picks the most damaged ally within 6 tiles, stays 2-4 tiles behind it (ally between it and the player, bush preferred), beams it green: +0.5 HP/s and broken parts fixed at once.
// One Tamirci per target. While beaming and 1 s after, it is not hidden by a bush. It runs when the player is within 4 tiles and sees it.
NUKE_WEIGHT.tamirci = 1; // meter weight (10 is not edited here)
const TAM = { pick: 6, flee: 4, beam: 4.8, heal: 0.5, vis: 1 };
const partsBroken = o => !!o.pt && (o.pt.tread > 0 || o.pt.barrel > 0 || o.pt.engine > 0);
const needOf = o => (1 - o.hp / o.maxHp) + (partsBroken(o) ? 0.6 : 0);
function tamTarget(e) { // most damaged ally in reach that no other Tamirci is already beaming
  let best = null, bs = 0.001;
  for (const o of G.enemies) {
    if (o === e || o.dead || o.isBoss || o.type === 'boss' || o.type === 'tamirci' || dist2(o.x, o.y, e.x, e.y) > (T * TAM.pick) * (T * TAM.pick)) continue;
    if (o.repBy && o.repBy !== e.id && G.time - o.repT < 0.5) continue;
    const n = needOf(o) + (e.tam === o ? 0.15 : 0); // a small bonus keeps the current target
    if (n > bs) { bs = n; best = o; }
  }
  return best;
}
function tamFollow(e) { // nobody hurt: trail the nearest ally
  let best = null, bd = (T * 9) * (T * 9);
  for (const o of G.enemies) { if (o === e || o.dead || o.isBoss || o.type === 'boss' || o.type === 'tamirci') continue; const d = dist2(o.x, o.y, e.x, e.y); if (d < bd) { bd = d; best = o; } }
  return best;
}
function tamSpot(e, a) { // a tile 2-4 tiles from ally a, on the far side from the player, with a clear line to a; bushes and spots out of the player's sight score higher
  const m = G.map, p = G.player, dx = a.x - p.x, dy = a.y - p.y, dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl;
  let best = null, bs = -1e9;
  for (let k = 0; k < 16; k++) for (const rad of [2.2 * T, 3 * T, 3.8 * T]) {
    const an = k * TAU / 16, x = a.x + Math.cos(an) * rad, y = a.y + Math.sin(an) * rad, v = m.at(x, y);
    if (blocksTank(v) || !los(x, y, a.x, a.y)) continue;
    const behind = ((x - a.x) * ux + (y - a.y) * uy) / rad, dP = Math.hypot(x - p.x, y - p.y);
    const sc = behind * 2.5 + (v === BUSH ? 1.2 : 0) + (!los(x, y, p.x, p.y) ? 0.6 : 0) - Math.hypot(x - e.x, y - e.y) / T * 0.25 - (dP < TAM.flee * T ? 3 : 0);
    if (sc > bs) { bs = sc; best = { x, y }; }
  }
  return best;
}
function tamSteer(e, gx, gy, dt, k) { // turn towards (gx, gy) and drive; returns true when it made progress
  const s = e.spec, desired = Math.atan2(gy - e.y, gx - e.x), pk = e.pt && e.pt.engine > 0 ? 0.5 : 1;
  e.angle = turnTo(e.angle, desired, s.turn * dt * 1.4);
  const diff = Math.abs(angDiff(e.angle, desired)), spd = diff < 0.7 ? s.speed * e.speedMul * pk * k * (1 - diff * 0.7) : 0;
  moveTank(e, Math.cos(e.angle) * spd * dt, Math.sin(e.angle) * spd * dt);
}
function tamFlee(e) { // best of 16 headings: away from the player, not into a wall
  const m = G.map, p = G.player; let best = null, bs = -1e9;
  for (let k = 0; k < 16; k++) {
    const an = k * TAU / 16, c = Math.cos(an), sn = Math.sin(an);
    if (blocksTank(m.at(e.x + c * 34, e.y + sn * 34)) || blocksTank(m.at(e.x + c * 70, e.y + sn * 70))) continue;
    const away = (e.x - p.x) * c + (e.y - p.y) * sn, sc = away / Math.max(1, e.distP) * 3 + (m.at(e.x + c * 70, e.y + sn * 70) === BUSH ? 0.8 : 0) - Math.abs(angDiff(e.angle, an)) * 0.4;
    if (sc > bs) { bs = sc; best = an; }
  }
  return best;
}
function updateTamirci(e, dt) {
  const s = e.spec, p = G.player, m = G.map;
  e.flash = Math.max(0, e.flash - dt); e.recoil = 0; e.cool = 9; e.vis = Math.max(0, (e.vis || 0) - dt); e.spotT = (e.spotT || 0) - dt;
  e.senseT -= dt;
  if (e.senseT <= 0) {
    e.senseT = 0.1 + Math.random() * 0.08;
    if (p.alive) { const d = Math.hypot(p.x - e.x, p.y - e.y); e.distP = d; e.canSee = d < T * 13 && los(e.x, e.y, p.x, p.y); } else { e.canSee = false; e.distP = 1e9; }
  }
  const trB = !!e.pt && e.pt.tread > 0, before = e.angle, ox = e.x, oy = e.y;
  const hurt = tamTarget(e), a = hurt || tamFollow(e);
  e.tam = hurt;
  const seen = p.alive && e.canSee && e.distP < TAM.flee * T && (m.at(e.x, e.y) !== BUSH || e.vis > 0 || e.distP < 2 * T);
  if (!trB) {
    if (seen) { // run
      if (e.fleeT === undefined || e.fleeT <= 0) { e.fleeA = tamFlee(e); e.fleeT = 0.25; }
      e.fleeT -= dt;
      if (e.fleeA !== null && e.fleeA !== undefined) tamSteer(e, e.x + Math.cos(e.fleeA) * 80, e.y + Math.sin(e.fleeA) * 80, dt, 1.05);
    } else if (a) {
      if (!e.spot || e.spotT <= 0 || e.spotFor !== a.id) { e.spot = tamSpot(e, a); e.spotT = 0.5; e.spotFor = a.id; }
      const sp = e.spot;
      if (sp && Math.hypot(sp.x - e.x, sp.y - e.y) > 12) {
        tamSteer(e, sp.x, sp.y, dt, 1);
        const dw = Math.hypot(sp.x - e.x, sp.y - e.y);
        if (dw < (e.wpBest || 1e9) - 0.5) { e.wpBest = dw; e.stuckT = 0; } else e.stuckT += dt;
        if (e.stuckT > 0.9) { const w = randomNeighbor(e); e.spot = w; e.spotT = 0.7; e.wpBest = 1e9; e.stuckT = 0; }
      } else { e.wpBest = 1e9; e.stuckT = 0; }
    } else { // alone: drift towards the player's side of the map, but keep out of sight range
      if (!e.wp || dist2(e.wp.x, e.wp.y, e.x, e.y) < 25) { e.wp = nextWaypoint(e); e.wpBest = 1e9; e.stuckT = 0; }
      if (e.wp && !blocksTank(m.get(e.wp.c, e.wp.r)) && !(e.canSee && e.distP < 7 * T)) {
        tamSteer(e, e.wp.x, e.wp.y, dt, 0.8);
        const dw = Math.hypot(e.wp.x - e.x, e.wp.y - e.y);
        if (dw < e.wpBest - 0.5) { e.wpBest = dw; e.stuckT = 0; } else e.stuckT += dt;
        if (e.stuckT > 1.2) { e.wp = randomNeighbor(e); e.wpBest = 1e9; e.stuckT = 0; }
      } else if (e.wp && blocksTank(m.get(e.wp.c, e.wp.r))) e.wp = null;
    }
  }
  // the beam
  let beam = null;
  if (hurt && needOf(hurt) > 0 && Math.hypot(hurt.x - e.x, hurt.y - e.y) < TAM.beam * T && los(e.x, e.y, hurt.x, hurt.y)) beam = hurt;
  if (beam) {
    beam.repBy = e.id; beam.repT = G.time; e.vis = TAM.vis; e.beamUntil = G.time + 0.12; e.beamOn = beam;
    beam.hp = Math.min(beam.maxHp, beam.hp + TAM.heal * dt);
    if (beam.pt) for (const k of ['tread', 'barrel', 'engine']) if (beam.pt[k] > 0) { // broken part: fixed at once, then the usual short immunity
      beam.pt[k] = 0; beam.pt.imm[k] = PART_T.imm; const q = partWorld(beam, k);
      sparks(q.x, q.y, 6, '#bfffa8', 160); addPart('ring', q.x, q.y, 0, 0, 0.35, 4, 44, 0, '150,255,140');
    }
    if (Math.random() < dt * 9) addPart('spark', beam.x + rand(-10, 10), beam.y + rand(-8, 8), rand(-15, 15), rand(-70, -30), rand(0.3, 0.55), 1, 0, 3, '#9dff90');
  } else e.beamOn = null;
  e.hidden = m.at(e.x, e.y) === BUSH && e.vis <= 0;
  const ta = beam ? Math.atan2(beam.y - e.y, beam.x - e.x) : e.angle;
  e.turret = turnTo(e.turret, ta, s.tTurn * dt);
  if (dt > 0) { e.avx = (e.x - ox) / dt; e.avy = (e.y - oy) / dt; }
  trackUpdate(e, (e.x - ox) * Math.cos(e.angle) + (e.y - oy) * Math.sin(e.angle), angDiff(before, e.angle));
  damageSmoke(e, dt);
}
