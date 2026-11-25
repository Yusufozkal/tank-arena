/* ================= Mayıncı (Şehir, 1.5.6) ================= */
// An unarmed light tank that lays mines. It only knows what it saw or heard (updateAware fills e.lk): it walks to choke points (corridors) 5-9 tiles around the last-known player position,
// drops a mine behind it every MAYIN.drop seconds (max 3 live per Mayıncı, 6 on the map) and runs from a player who sees it within MAYIN.flee tiles.
// A mine (G.mines) arms after MAYIN.arm s (blinking red light; amber and steady before), blows when the player comes within MAYIN.trigger px, and can be shot (any player shell, one hit) to blow it harmlessly from afar.
// Enemies never trigger a mine and are not hurt by it. Mines are removed when the wave leaves the fight phase (updateMines, called from updatePlay before the workshop freeze).
NUKE_WEIGHT.mayinci = 1;
const MAYIN = { drop: [4, 6], perMax: 3, mapMax: 6, arm: 1, trigger: 26, r: 11, blast: 52, dmg: 12, flee: 4.5, first: [1.5, 2.8], chain: true };
function mineTileOk(x, y) { const v = G.map.at(x, y); return !blocksTank(v) && v !== BUSH; }
function mineChoke(x, y) { // a corridor tile: walls on both sides of one axis, open along the other
  const m = G.map, c = Math.floor(x / T), r = Math.floor(y / T), w = d => blocksTank(m.get(c + d[0], r + d[1]));
  return (w([-1, 0]) && w([1, 0]) && !w([0, -1]) && !w([0, 1])) || (w([0, -1]) && w([0, 1]) && !w([-1, 0]) && !w([1, 0]));
}
function mineSpot(e) { // a free tile 5-9 tiles around the last-known position, corridors preferred
  const m = G.map, n = m.n, lk = e.lk; let best = null, bs = -1e9;
  for (let k = 0; k < 22; k++) {
    const a = rand(0, TAU), r = rand(5, 9) * T, x = lk.x + Math.cos(a) * r, y = lk.y + Math.sin(a) * r, c = Math.floor(x / T), rr = Math.floor(y / T);
    if (c < 2 || rr < 2 || c > n - 3 || rr > n - 3 || !mineTileOk(x, y)) continue;
    const cx = c * T + T / 2, cy = rr * T + T / 2;
    let sc = Math.random() * 1.6 - Math.hypot(cx - e.x, cy - e.y) / T * 0.08 + (mineChoke(cx, cy) ? 3 : 0);
    for (const o of G.enemies) if (o !== e && o.type === 'mayinci' && !o.dead && o.my && o.my.g && dist2(o.my.g.x, o.my.g.y, cx, cy) < (4 * T) * (4 * T)) sc -= 3; // two Mayıncı do not share a corner
    if (sc > bs) { bs = sc; best = { c, r: rr, x: cx, y: cy }; }
  }
  return best;
}
function mineDrop(e) {
  const mines = G.mines || (G.mines = []), mine = e.mineN || 0;
  if (mine >= MAYIN.perMax || mines.length >= MAYIN.mapMax) return false;
  const x = e.x - Math.cos(e.angle) * e.r * 0.8, y = e.y - Math.sin(e.angle) * e.r * 0.8;
  if (!mineTileOk(x, y)) return false;
  for (const q of mines) if (dist2(q.x, q.y, x, y) < (1.6 * T) * (1.6 * T)) return false;
  if (G.portals.some(q => dist2(q.x, q.y, x, y) < (1.5 * T) * (1.5 * T))) return false;
  mines.push({ x, y, age: 0, armed: false, dead: false, own: e.id, w: G.wave, ph: rand(0, TAU) });
  for (let k = 0; k < 4; k++) addPart('dust', x, y, rand(-24, 24), rand(-24, 24), rand(0.3, 0.5), rand(8, 12), 14, 2);
  return true;
}
function updateMayinci(e, dt) {
  const s = e.spec, p = G.player, m = G.map, my = e.my || (e.my = { t: rand(MAYIN.first[0], MAYIN.first[1]), g: null, tf: null, gT: 0 });
  e.cool = 99; e.flash = Math.max(0, e.flash - dt); e.recoil = 0; e.hidden = m.at(e.x, e.y) === BUSH;
  e.senseT -= dt;
  if (e.senseT <= 0) {
    e.senseT = 0.1 + Math.random() * 0.08;
    if (p.alive) { e.distP = Math.hypot(p.x - e.x, p.y - e.y); e.canSee = sees(e, p, 0); } else { e.canSee = false; e.distP = 1e9; }
  }
  updateAware(e, dt); // fills e.lk (seen / heard / hinted position); its own goals are not used here
  const now = G.time, trB = !!e.pt && e.pt.tread > 0, pk = e.pt && e.pt.engine > 0 ? 0.5 : 1, before = e.angle, ox = e.x, oy = e.y;
  // goal: a choke point near the last-known position (or an ordinary patrol spot while it knows nothing)
  const reached = my.g && dist2(my.g.x, my.g.y, e.x, e.y) < (AWARE.reach * T) * (AWARE.reach * T);
  if (!my.g || reached || now - my.gT > 12 || (e.lk && e.lk.t > my.gT && dist2(e.lk.x, e.lk.y, my.g.x, my.g.y) > (11 * T) * (11 * T))) {
    const g = e.lk ? mineSpot(e) : patrolSpot(e);
    if (g) { my.g = g; my.gT = now; const n = m.n; if (!my.tf || my.tf.length !== n * n) my.tf = new Float32Array(n * n); dijkstra(m, g.r * n + g.c, my.tf, null); e.wp = null; } else { my.g = null; my.gT = now - 11; }
  }
  let goal = null;
  if (!trB) {
    my.fleeT = (my.fleeT || 0) - dt; if (e.canSee && e.distP < MAYIN.flee * T) my.fleeT = 1.3;
    if (my.fleeT > 0 && e.canSee) { // it does not fight: run from a player who sees it (and keep running a moment)
      const a = tamFlee(e); if (a !== null) goal = { x: e.x + Math.cos(a) * 60, y: e.y + Math.sin(a) * 60, c: -1, r: -1, free: true };
    } else if (my.g && my.tf) {
      if (!e.wp || dist2(e.wp.x, e.wp.y, e.x, e.y) < 25) { e.wp = nextWaypoint(e, my.tf); e.wpBest = 1e9; e.stuckT = 0; }
      goal = e.wp;
    }
  }
  if (goal && !goal.free && blocksTank(m.get(goal.c, goal.r))) { e.wp = randomNeighbor(e); goal = null; }
  if (goal) {
    const desired = Math.atan2(goal.y - e.y, goal.x - e.x);
    e.angle = turnTo(e.angle, desired, s.turn * dt);
    const diff = Math.abs(angDiff(e.angle, desired)), spd = diff < 0.55 ? s.speed * e.speedMul * pk * (1 - diff * 0.9) : 0;
    moveTank(e, Math.cos(e.angle) * spd * dt, Math.sin(e.angle) * spd * dt);
    if (!goal.free) {
      const dw = Math.hypot(goal.x - e.x, goal.y - e.y);
      if (dw < e.wpBest - 0.5) { e.wpBest = dw; e.stuckT = 0; } else e.stuckT += dt;
      if (e.stuckT > 1.2) { e.wp = randomNeighbor(e); e.wpBest = 1e9; e.stuckT = 0; }
    }
  }
  if (dt > 0) { e.avx = (e.x - ox) / dt; e.avy = (e.y - oy) / dt; }
  e.turret = turnTo(e.turret, e.canSee && p.alive ? Math.atan2(p.y - e.y, p.x - e.x) : e.lookT > 0 ? e.lookA : e.angle, s.tTurn * 0.6 * dt); // the stub follows the player it watches
  trackUpdate(e, (e.x - ox) * Math.cos(e.angle) + (e.y - oy) * Math.sin(e.angle), angDiff(before, e.angle));
  // mines: only while it is actually moving; a corridor tile is preferred for 1.5 s after the timer is up
  if (Math.hypot(e.avx, e.avy) > 20) my.t -= dt;
  if (my.t <= 0 && (mineChoke(e.x, e.y) || my.t < -1.5) && mineDrop(e)) { e.mineN = (e.mineN || 0) + 1; my.t = rand(MAYIN.drop[0], MAYIN.drop[1]); }
  damageSmoke(e, dt);
}
const mineCount = id => (G.mines || []).filter(q => !q.dead && q.own === id).length;
function mineBoom(q, shot) {
  if (q.dead) return; q.dead = true;
  const p = G.player, R = MAYIN.blast, x = q.x, y = q.y;
  explode(x, y, 0.75); addDecals(G.map, [{ k: 'scorch', x, y, r: R * 0.7 }]); addPart('ring', x, y, 0, 0, 0.3, 8, R * 2, 0, '255,190,90'); sparks(x, y, 10, '#ffd27a', 260);
  shake(5 * prox(x, y)); Sound.pop(volAt(x, y));
  if (p.alive && dist2(x, y, p.x, p.y) < (R + p.r * 0.5) * (R + p.r * 0.5)) {
    damagePlayer({ x: p.x, y: p.y, dmg: Math.max(1, Math.round(MAYIN.dmg * G.mods.dmg)), owner: 1, vx: 0, vy: 0, ram: false, mine: true });
    if (!shot) addText(p.x, p.y - 28, 'Mayın!', '#ffd27a', 16);
  }
  if (MAYIN.chain) for (const o of G.mines) if (!o.dead && dist2(x, y, o.x, o.y) < (R * 0.9) * (R * 0.9)) mineBoom(o, true); // neighbours go off with it
}
function updateMines(dt) {
  const ms = G.mines; if (!ms || !ms.length) return;
  if (G.phase !== 'fight' || ms.some(q => q.w !== G.wave)) { // the wave is over (or another one began): the mines go quietly
    for (const q of ms) if (!q.dead && onScreen(q.x, q.y, 40)) addPart('dust', q.x, q.y, rand(-16, 16), rand(-16, 16), 0.5, 10, 16, 1);
    G.mines = []; return;
  }
  const p = G.player;
  for (const q of ms) {
    if (q.dead) continue;
    q.age += dt; if (!q.armed && q.age >= MAYIN.arm) q.armed = true;
    for (const b of G.bullets) { // a player shell that passes over a mine sets it off (armed or not)
      if (b.dead || b.owner !== 0 || q.dead) continue;
      const x1 = b.x - b.vx * dt, y1 = b.y - b.vy * dt, dx = b.x - x1, dy = b.y - y1, l2 = dx * dx + dy * dy, t = l2 ? clamp(((q.x - x1) * dx + (q.y - y1) * dy) / l2, 0, 1) : 0, rr = MAYIN.r + (b.r || 3);
      if (dist2(q.x, q.y, x1 + dx * t, y1 + dy * t) < rr * rr) { if (!b.pierce) b.dead = true; mineBoom(q, true); }
    }
    if (!q.dead && q.armed && p.alive && dist2(q.x, q.y, p.x, p.y) < MAYIN.trigger * MAYIN.trigger) mineBoom(q, false);
  }
  if (ms.some(q => q.dead)) G.mines = ms.filter(q => !q.dead);
}
function drawMines() {
  const ms = G.mines; if (!ms || !ms.length || G.state === 'menu') return;
  for (const q of ms) {
    if (q.dead || !onScreen(q.x, q.y, 30)) continue;
    const R = MAYIN.r, on = q.armed ? Math.sin(G.time * 9 + q.ph) > -0.15 : true;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(q.x + 2, q.y + 3, R + 1, R * 0.8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1b1c1e'; ctx.beginPath(); ctx.arc(q.x, q.y, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2.4; ctx.setLineDash([4.2, 3.4]); ctx.beginPath(); ctx.arc(q.x, q.y, R - 1.6, 0, TAU); ctx.stroke(); ctx.setLineDash([]); // hazard ring
    ctx.fillStyle = '#3a3c40'; ctx.beginPath(); ctx.arc(q.x, q.y, R * 0.55, 0, TAU); ctx.fill();
    const col = q.armed ? '#ff3a2a' : '#ffb02a';
    if (on) {
      if (fxScale === 1 && q.armed) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7; const gs = 34; ctx.drawImage(SPR.fire, q.x - gs / 2, q.y - gs / 2, gs, gs); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(q.x, q.y, 3.4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff4d0'; ctx.beginPath(); ctx.arc(q.x - 0.8, q.y - 0.8, 1.2, 0, TAU); ctx.fill();
    }
  }
}
