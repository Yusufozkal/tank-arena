/* ================= Kapatıcı (docs/BOSSES.md section 7b) ================= */
// Sandbox-only extra boss (Serbest Mod): never in BOSS_ON, so it never shows up in a normal run. A black angular tank with one long barrel, inspired by diep.io's Arena Closer.
// Fair intelligence, no cheating: it only knows what it sees (sees() with a wider cone), hears (a shot within 9 tiles, big error) or feels (a hit tells it the direction), keeps a last-known
// spot e.lk and searches around it (searchSpot reused); a player in a bush is invisible beyond ~2 tiles. Reaction: it needs KAP.react s of seeing before it fires (the Avcı needs about twice that).
// It leads its aim with the player's velocity AND turning rate, side-steps shells it saw coming (never while attacking or in the open window), cuts off the escape route (stands on the side the
// player keeps fleeing to) and learns within the fight: escape direction counts (kp.esc), long- vs short-range play (kp.far / kp.near) -> rushes snipers, backs off from brawlers.
// Attacks: Kesin Atış, Sekme Atışı, Kesme Hamlesi, Havan (sweeps the bushes around the last-known spot), plus Kapanış (a timer: from 90 s the edge ring of steel moves in every 30 s, 2 s warning).
// Open window: after each attack the barrel glows for KAP.open s: no side-step and full damage; otherwise the hull deflects half of the damage (def.hullMul).
// State in e.kp. Hooks used from 11a: def.sense, def.move, def.flowGoal, def.tick, def.hullMul, def.danger, def.onClear, def.drawGround; bossDefAt `G.forceBoss`; ARENAS.kapanis.theme.
const KAP_FLOOR = Object.assign({}, THEMES[3], { key: 'city', name: 'Kapanış', bg: '#050506', ground: '#222428', ground2: '#1c1e22', detail: '#16181b', detail2: '#30343a',
  steel: '#6c717a', steelHi: '#9ba1ac', steelDk: '#393d44', shore: '#3a3d42', shadow: 'rgba(0,0,0,.5)', tread: '8,8,9', scorch: '0,0,0', dust: '88,88,94' });
ARENAS.kapanis = { name: 'Kapanış', theme: KAP_FLOOR, rows: [ // steel blocks are 0 or >= 3 tiles apart and from the edge
  '.....................',
  '.....................',
  '..........X..........',
  '.....................',
  '...SS...........SS...',
  '...SS...........SS...',
  '.....................',
  '.......GG.....GG.....',
  '.......G.......G.....',
  '...SS....SSS....SS...',
  '...SS....SSS....SS...',
  '...SS....SSS....SS...',
  '.....................',
  '.....G.........G.....',
  '.....GG.......GG.....',
  '...SS...........SS...',
  '...SS...........SS...',
  '.....................',
  '..........P..........',
  '.....................',
  '.....................'] };

const KAP_SPEC = { speed: 230, turn: 4.4, tTurn: 4.8, len: 54, wid: 46, r: 27, tread: 10, tR: 15, barrel: 66, bW: 8, cool: 1, bSpeed: 430, dmg: 12, bR: 5.5, mass: 14, score: 4000,
  col: { body: '#2a2b2f', dk: '#0b0b0d', hi: '#4d4f56', acc: '#e02828' } };
const KAP = { hp: 2400, // 1.5.6: 1600 -> 2400
  react: 0.25, fov: 3.5, cone: 3.5, open: 1.0, ringT: 90, ringEvery: 30, ringWarn: 2, rings: 4, dodgeP: 0.85, dodgeCd: 0.8,
  dmgPrecise: 0.4, dmgBounce: 0.3, dmgRam: 0.3, dmgMortar: 0.3, hear: 1.6 }; // damage shares of the player's max HP; hear: hearing range factor against AWARE.hear

/* ---- helpers ---- */
const kapDmg = f => Math.max(1, Math.round(f * G.player.maxHp / ((G.mods && G.mods.dmg) || 1))); // bossDmg() multiplies by the wave's mods.dmg again: a share of max HP stays a share
const kapRingOf = (m, x, y) => { const c = clamp(Math.floor(x / T), 0, m.n - 1), r = clamp(Math.floor(y / T), 0, m.n - 1); return Math.min(c, r, m.n - 1 - c, m.n - 1 - r); };
// where the player will be in t seconds: his smoothed velocity turned by his smoothed turning rate (a circular arc), stopped by walls
function kapPredict(e, t) {
  const kp = e.kp, p = G.player, m = G.map, v = Math.hypot(kp.pvx, kp.pvy);
  if (v < 12) return { x: p.x, y: p.y };
  const h = Math.atan2(kp.pvy, kp.pvx), om = clamp(kp.om, -4, 4); let lx = p.x, ly = p.y;
  for (let i = 1; i <= 6; i++) {
    const s = t * i / 6, x = Math.abs(om) < 0.08 ? p.x + Math.cos(h) * v * s : p.x + v / om * (Math.sin(h + om * s) - Math.sin(h)), y = Math.abs(om) < 0.08 ? p.y + Math.sin(h) * v * s : p.y + v / om * (Math.cos(h) - Math.cos(h + om * s));
    if (blocksTank(m.at(x, y))) break; lx = x; ly = y;
  }
  return { x: lx, y: ly };
}
// the spot it aims at: the led player while it sees him, otherwise the last-known spot (no lead)
function kapTarget(e, t) { return e.canSee ? kapPredict(e, t) : (e.lk ? { x: e.lk.x, y: e.lk.y } : { x: e.x + Math.cos(e.turret) * 200, y: e.y + Math.sin(e.turret) * 200 }); }
function kapAim(e, speed) {
  let t = Math.hypot(G.player.x - e.x, G.player.y - e.y) / speed, q = kapTarget(e, t);
  for (let i = 0; i < 3; i++) { q = kapTarget(e, t); t = Math.hypot(q.x - e.x, q.y - e.y) / speed; }
  return Math.atan2(q.y - e.y, q.x - e.x);
}
const kapRay = (e, a, max) => { const m = G.map, ca = Math.cos(a), sa = Math.sin(a); for (let d = 12; d < max; d += 6) if (isWall(m.at(e.x + ca * d, e.y + sa * d))) return d; return max; };
function kapEsc(kp) { // the direction the player has been fleeing in (world vector, length = how sure it is 0..1)
  const E = kp.esc, p = G.player, e = G.boss; if (!e) return { x: 0, y: 0, m: 0 };
  const lat = (E.R - E.L) / (E.R + E.L + 1), rad = (E.away - E.toward) / (E.away + E.toward + 1), ux = (p.x - e.x), uy = (p.y - e.y), ul = Math.hypot(ux, uy) || 1;
  const x = (-uy / ul) * lat + (ux / ul) * rad, y = (ux / ul) * lat + (uy / ul) * rad, mm = Math.hypot(x, y);
  return mm < 0.05 ? { x: 0, y: 0, m: 0 } : { x: x / mm, y: y / mm, m: Math.min(1, mm * (E.R + E.L + E.away + E.toward) / 2) };
}
const kapStyle = kp => { const n = kp.far + kp.near; if (n < 3) return 'mid'; const f = kp.far / n; return f > 0.62 ? 'sniper' : f < 0.38 ? 'brawler' : 'mid'; };
const kapOpenNow = e => G.time < e.kp.openUntil;

/* ---- senses and learning (def.sense, every frame while it can act) ---- */
function kapSense(e, dt) {
  const kp = e.kp, p = G.player, now = G.time;
  if (!p.alive) { e.canSee = false; return; }
  if (kp.px === undefined) { kp.px = p.x; kp.py = p.y; }
  if (dt > 0) { // the player's smoothed velocity and turning rate (what its lead is built from)
    const k = Math.min(1, dt * 8); kp.pvx += ((p.x - kp.px) / dt - kp.pvx) * k; kp.pvy += ((p.y - kp.py) / dt - kp.pvy) * k;
    if (Math.hypot(kp.pvx, kp.pvy) > 40) { const h = Math.atan2(kp.pvy, kp.pvx); if (kp.hv) kp.om += (clamp(angDiff(kp.h, h) / dt, -6, 6) - kp.om) * Math.min(1, dt * 5); kp.h = h; kp.hv = true; } else { kp.hv = false; kp.om *= 0.9; }
    kp.px = p.x; kp.py = p.y;
  }
  if (e.lookT > 0) e.lookT -= dt;
  e.canSee = kp.vis; // sees() keeps a tank that already sees the player seeing him (no cone test): feed it its own memory, not the plain line of sight
  const vis = sees(e, p, KAP.fov, KAP.cone); kp.vis = vis;
  if (vis) { kp.seeT += dt; kp.unseen = 0; e.lk = { x: p.x, y: p.y, t: now }; kp.search = false; }
  else {
    kp.seeT = 0; kp.unseen += dt;
    if (kp.heard !== p.lastShot && now - p.lastShot < 0.3 && Math.hypot(p.x - e.x, p.y - e.y) < AWARE.hear * KAP.hear * T) { kp.heard = p.lastShot; setLk(e, p.x, p.y, AWARE.hearErr); kp.search = false; } // a shot: a spot with a big error
  }
  e.canSee = vis && kp.seeT >= KAP.react;
  if (!e.canSee) return;
  // learning: where he runs while a warning is up; whether he shoots from far away or close by
  if (G.tele.length && G.tele.some(t => t.e === e && t.t > 0.3)) {
    const sp = Math.hypot(kp.pvx, kp.pvy);
    if (sp > 45) {
      const ux = (p.x - e.x), uy = (p.y - e.y), ul = Math.hypot(ux, uy) || 1, lat = (ux * kp.pvy - uy * kp.pvx) / ul / sp, rad = (ux * kp.pvx + uy * kp.pvy) / ul / sp, E = kp.esc;
      if (lat > 0) E.R += lat * dt; else E.L -= lat * dt;
      if (rad > 0) E.away += rad * dt; else E.toward -= rad * dt;
    }
  }
  if (p.lastShot !== kp.shotSeen) { kp.shotSeen = p.lastShot; const d = Math.hypot(p.x - e.x, p.y - e.y); if (d > 7 * T) kp.far++; else if (d < 4.5 * T) kp.near++; }
}

/* ---- movement and turret (def.move): used whenever it is not in an attack ---- */
function kapPickGoal(e) {
  const kp = e.kp, p = G.player, m = G.map, n = m.n, now = G.time, fit = bossFitMap(e);
  const c0 = clamp(Math.floor(e.x / T), 0, n - 1), r0 = clamp(Math.floor(e.y / T), 0, n - 1), reach = new Uint8Array(n * n), q = [r0 * n + c0]; reach[q[0]] = 1;
  for (let h = 0; h < q.length; h++) { const i = q[h], c = i % n, r = (i - c) / n; for (const [dx, dy] of DIRS) { const x = c + dx, y = r + dy; if (x < 0 || y < 0 || x >= n || y >= n) continue; const j = y * n + x; if (reach[j] || !fit[j]) continue; reach[j] = 1; q.push(j); } }
  if (!e.canSee) { // blind: walk to where he was last seen or heard, then sweep the surroundings (bushes first)
    const lk = e.lk;
    if (!lk || now - lk.t > 30) { if (!kp.patrol || dist2(kp.patrol.x, kp.patrol.y, e.x, e.y) < T * T) kp.patrol = patrolSpot(e); kp.goal = kp.patrol || kp.goal; kp.mode = 'patrol'; return; }
    if (!kp.search) { kp.goal = { x: lk.x, y: lk.y }; kp.mode = 'lk'; if (Math.hypot(e.x - lk.x, e.y - lk.y) < 1.4 * T) { kp.search = true; kp.goal = null; } return; }
    kp.mode = 'search';
    if (!kp.goal || Math.hypot(e.x - kp.goal.x, e.y - kp.goal.y) < 1.1 * T) { const sp = searchSpot(e); if (sp) kp.goal = sp; kp.sn++; }
    return;
  }
  const style = kapStyle(kp), D = (style === 'sniper' ? 3.6 : style === 'brawler' ? 9 : 6.5) * T, esc = kapEsc(kp), edge = kp.closed + 1 + (kp.warn ? 1 : 0);
  kp.mode = style;
  let best = null, bs = -1e9, cur = -1e9;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const i = r * n + c; if (!reach[i]) continue;
    const x = c * T + T / 2, y = r * T + T / 2, d = Math.hypot(x - p.x, y - p.y);
    let sc = -Math.abs(d - D) / T + (los(x, y, p.x, p.y) ? 2.2 : -1.5) - Math.hypot(x - e.x, y - e.y) / T * 0.25 + Math.random() * 0.3;
    if (esc.m > 0.15 && d > 0.5 * T) sc += ((x - p.x) * esc.x + (y - p.y) * esc.y) / d * 1.8 * esc.m; // cut off the route he keeps fleeing along
    if (Math.min(c, r, n - 1 - c, n - 1 - r) < edge) sc -= kp.warn ? 12 : 3; // stay off the ring that is about to close
    if (kp.goal && Math.abs(kp.goal.x - x) < 1 && Math.abs(kp.goal.y - y) < 1) cur = sc;
    if (sc > bs) { bs = sc; best = { x, y }; }
  }
  if (best && (cur < -1e8 || bs > cur + 1)) kp.goal = best;
}
function kapCheckDodge(e) { // a player shell on course to hit: a quick side-step (it saw the shell, so it reacts; the roll is KAP.dodgeP)
  const m = G.map, kp = e.kp;
  for (const b of G.bullets) {
    if (b.dead || b.owner !== 0 || b.lob) continue;
    const v2 = b.vx * b.vx + b.vy * b.vy; if (!v2) continue;
    const t = ((e.x - b.x) * b.vx + (e.y - b.y) * b.vy) / v2;
    if (t < 0.06 || t > 0.55 || Math.hypot(b.x - e.x, b.y - e.y) > 8 * T || b.kapSeen) continue;
    const cx = b.x + b.vx * t - e.x, cy = b.y + b.vy * t - e.y, hit = e.r + b.r + 8;
    if (cx * cx + cy * cy > hit * hit) continue;
    b.kapSeen = true;
    if (Math.random() > KAP.dodgeP) continue;
    const sp = Math.sqrt(v2), nx = -b.vy / sp, ny = b.vx / sp, side = cx * nx + cy * ny;
    for (const sg of side > 0 ? [-1, 1] : [1, -1]) {
      if (blocksTank(m.at(e.x + nx * sg * (e.r + 30), e.y + ny * sg * (e.r + 30)))) continue;
      kp.dodge = { x: nx * sg, y: ny * sg, t: 0.28 }; kp.dodgeCd = KAP.dodgeCd;
      for (let k = 0; k < 4; k++) addPart('dust', e.x - nx * sg * 14 + rand(-6, 6), e.y - ny * sg * 14 + rand(-6, 6), -nx * sg * 40, -ny * sg * 40, 0.5, 14, 20, 3);
      return;
    }
  }
}
function kapMove(e, dt) {
  const kp = e.kp, s = e.spec;
  kp.dodgeCd = Math.max(0, kp.dodgeCd - dt);
  if (kp.dodge) { // the side-step itself
    const d = kp.dodge, ox = e.x, oy = e.y; d.t -= dt;
    moveTank(e, d.x * s.speed * 1.9 * dt, d.y * s.speed * 1.9 * dt);
    trackUpdate(e, (e.x - ox) * Math.cos(e.angle) + (e.y - oy) * Math.sin(e.angle), 0);
    if (d.t <= 0 || e.treadT > 0) { kp.dodge = null; e.wp = null; }
  } else {
    if (kp.dodgeCd <= 0 && e.treadT <= 0 && !kapOpenNow(e) && kp.unseen < 1.5) kapCheckDodge(e);
    kp.goalT -= dt; if (kp.goalT <= 0) { kp.goalT = 0.45; kapPickGoal(e); }
    bossMove(e, dt, 0);
  }
  // turret: the led player while it sees him, else toward the last-known spot or the way it drives, sweeping like a searcher
  if (e.canSee) e.turret = turnTo(e.turret, kapAim(e, s.bSpeed), s.tTurn * dt);
  else {
    const a = e.lookT > 0 ? e.lookA : (e.lk && G.time - e.lk.t < 30 && kp.mode !== 'search' ? Math.atan2(e.lk.y - e.y, e.lk.x - e.x) : e.angle);
    e.turret = turnTo(e.turret, a + 0.9 * Math.sin(G.time * 2.2), s.tTurn * 0.6 * dt);
  }
}

/* ---- attacks ---- */
function* kapOpen(e) { // after an attack: the barrel glows, no dodging, full damage
  e.kp.openUntil = G.time + KAP.open;
  while (G.time < e.kp.openUntil) { if (e.canSee) e.turret = turnTo(e.turret, kapAim(e, e.spec.bSpeed), e.spec.tTurn * 0.5 * e.dt); yield 0; }
}
function kapFire(e, ang, o, mut) { // one shell from the long barrel; mut(b) patches the new shell
  const n0 = G.bullets.length;
  bossShell(e, ang, o);
  for (let i = n0; i < G.bullets.length; i++) { const b = G.bullets[i]; if (mut) mut(b); }
  e.recoil = 1; const ca = Math.cos(ang), sa = Math.sin(ang), mx = e.x + ca * (e.spec.barrel + 4), my = e.y + sa * (e.spec.barrel + 4);
  addPart('fire', mx, my, ca * 80, sa * 80, 0.1, 24, 40, 0); for (let k = 0; k < 3; k++) addPart('smoke', mx, my, ca * 40 + rand(-12, 12), sa * 40 + rand(-12, 12), rand(0.5, 0.8), 14, 28, 3);
  shake(3 * prox(e.x, e.y)); Sound.shoot(false, true, volAt(e.x, e.y));
}
function* kapPrecise(e) { // Kesin Atış: 0.6 s red line (the last 0.2 s locked), one very fast shell, ~40% of the player's armour + HP
  const kp = e.kp, p = G.player, sp = 2.3;
  const tl = addTele(e, { kind: 'line', dur: 0.6, min: 0.6, lock: 0.2, x: e.x, y: e.y, a: e.turret, len: 600, w: 12 });
  Sound.warnRise(volAt(e.x, e.y) * 0.7);
  while (tl.t < tl.dur) {
    if (tl.t < tl.dur - tl.lock) e.turret = turnTo(e.turret, kapAim(e, e.spec.bSpeed * sp), e.spec.tTurn * 2 * e.dt);
    tl.x = e.x; tl.y = e.y; tl.a = e.turret; tl.len = kapRay(e, e.turret, 14 * T); kp.charge = tl.t / tl.dur; yield 0;
  }
  release(e, 'kesin', tl); removeTele(tl); kp.charge = 0;
  kapFire(e, e.turret, { speed: sp }, b => { b.dmg = bossDmg(kapDmg(KAP.dmgPrecise)); b.life = 1.6; b.r *= 0.9; });
  yield 0.12; yield* kapOpen(e);
}
// follow a shell from (x, y) along a, reflecting once off steel like ricochet() does; returns the path and whether it passes through the player's led position
function kapTrace(e, x, y, a, speed, wantHit) {
  const m = G.map, p = G.player, R = p.r + 5.5 + 9; let vx = Math.cos(a), vy = Math.sin(a), s = 0, bounces = 0, bx = 0, by = 0, hit = false, seg1 = 0;
  for (let k = 0; k < 150; k++) {
    const px = x, py = y; x += vx * 6; y += vy * 6; s += 6;
    const v = m.at(x, y);
    if (isWall(v)) {
      if (v === STEEL && bounces === 0) {
        const c0 = Math.floor(px / T), r0 = Math.floor(py / T), c1 = Math.floor(x / T), r1 = Math.floor(y / T); let fx = c1 !== c0 && isWall(m.get(c1, r0)), fy = r1 !== r0 && isWall(m.get(c0, r1));
        if (!fx && !fy) { fx = c1 !== c0; fy = r1 !== r0; }
        if (fx) vx = -vx; if (fy) vy = -vy;
        x = px; y = py; bounces = 1; bx = px; by = py; seg1 = s; continue;
      }
      break;
    }
    if (wantHit && bounces === 1) { const q = kapTarget(e, s / speed); if (Math.hypot(x - q.x, y - q.y) < R) { hit = true; break; } }
  }
  return { bounced: bounces === 1, hit, bx, by, seg1, len: s, a2: Math.atan2(vy, vx) };
}
function kapSolveBounce(e) { // the firing angle whose one-bounce path reaches the player's led spot (or the last-known spot): behind-the-corner shots
  const sp = e.spec.bSpeed * 1.6; let best = null;
  for (let i = 0; i < 128; i++) {
    const a = i * TAU / 128, r = kapTrace(e, e.x, e.y, a, sp, true);
    if (r.bounced && r.hit && r.seg1 > e.r + 20 && (!best || r.len < best.len)) best = Object.assign(r, { a });
  }
  return best;
}
function* kapBounce(e) { // Sekme Atışı: dashed red line along the whole path (to the wall, then after the bounce), shell with one steel bounce
  const kp = e.kp, sp = 1.6; let sol = kp.sol || kapSolveBounce(e); if (!sol) { yield 0.4; return; }
  const t1 = addTele(e, { kind: 'line', dur: 0.8, min: 0.8, lock: 0.25, dash: true, x: e.x, y: e.y, a: sol.a, len: sol.seg1, w: 10 });
  const t2 = addTele(e, { kind: 'line', dur: 0.8, min: 0.8, lock: 0.25, dash: true, x: sol.bx, y: sol.by, a: sol.a2, len: Math.max(30, sol.len - sol.seg1), w: 10 });
  Sound.warnRise(volAt(e.x, e.y) * 0.7); let re = 0;
  while (t1.t < t1.dur) {
    re -= e.dt;
    if (t1.t < t1.dur - t1.lock) {
      if (re <= 0) { re = 0.15; const s2 = kapSolveBounce(e); if (s2 && Math.abs(angDiff(sol.a, s2.a)) < 0.6) sol = s2; }
      e.turret = turnTo(e.turret, sol.a, e.spec.tTurn * 2 * e.dt);
      t1.a = sol.a; t1.len = sol.seg1; t2.x = sol.bx; t2.y = sol.by; t2.a = sol.a2; t2.len = Math.max(30, sol.len - sol.seg1);
    }
    kp.charge = t1.t / t1.dur; yield 0;
  }
  release(e, 'sekme', t1); release(e, 'sekme', t2); removeTele(t1); removeTele(t2); kp.charge = 0;
  kapFire(e, sol.a, { speed: sp }, b => { b.bounce = 1; b.dmg = bossDmg(kapDmg(KAP.dmgBounce)); b.life = 3; });
  yield 0.12; yield* kapOpen(e);
}
function* kapCut(e) { // Kesme Hamlesi: a line into the escape path (where he is heading plus the way he keeps fleeing), then a dash along it
  const kp = e.kp, p = G.player, m = G.map, LEN = 9 * T, margin = e.r + 4, esc = kapEsc(kp);
  const tl = addTele(e, { kind: 'line', dur: 1.0, min: 1.0, lock: 0.3, x: e.x, y: e.y, a: e.angle, len: LEN, w: 2 * (e.r + 4) });
  Sound.warnRise(volAt(e.x, e.y));
  while (tl.t < tl.dur) {
    if (tl.t < tl.dur - tl.lock) {
      const q = kapPredict(e, 0.9), tx = q.x + esc.x * 1.6 * T * esc.m, ty = q.y + esc.y * 1.6 * T * esc.m;
      e.angle = turnTo(e.angle, e.canSee ? Math.atan2(ty - e.y, tx - e.x) : e.angle, 5.5 * e.dt);
    }
    e.turret = turnTo(e.turret, e.angle, 8 * e.dt);
    tl.x = e.x; tl.y = e.y; tl.a = e.angle; tl.len = rayClip(e.x, e.y, e.angle, LEN, margin); kp.charge = tl.t / tl.dur; yield 0;
  }
  release(e, 'kesme', tl); removeTele(tl); kp.charge = 0;
  const ca = Math.cos(e.angle), sa = Math.sin(e.angle), plan = tl.len; let trav = 0, hurt = false;
  while (trav < plan) {
    const step = Math.min(560 * e.dt, plan - trav), ox = e.x, oy = e.y;
    moveTank(e, ca * step, sa * step); const moved = Math.hypot(e.x - ox, e.y - oy); trackUpdate(e, moved, 0); trav += moved;
    if (fxScale === 1 && Math.random() < 0.8) addPart('dust', e.x - ca * e.r, e.y - sa * e.r + rand(-10, 10), rand(-30, 30), rand(-30, 30), rand(0.3, 0.6), rand(10, 18), 24, 2);
    if (!hurt && p.alive && dist2(e.x, e.y, p.x, p.y) < (e.r + p.r + 2) * (e.r + p.r + 2)) {
      hurt = true; damagePlayer({ x: p.x, y: p.y, dmg: bossDmg(kapDmg(KAP.dmgRam)), owner: 1, vx: 0, vy: 0 });
      const side = (p.x - e.x) * -sa + (p.y - e.y) * ca < 0 ? -1 : 1; moveTank(p, -sa * 56 * side + ca * 24, ca * 56 * side + sa * 24); shake(8); vibrate(30);
    }
    if (moved < step * 0.35) break;
    yield 0;
  }
  yield 0.1; yield* kapOpen(e);
}
// Havan targets: the player's led spot while it sees him; while it does not, the bushes around the last-known spot (a sweep), never his true position
function kapMortarSpots(e) {
  const m = G.map, n = m.n;
  if (e.canSee) { const q = kapPredict(e, 1.0); return [{ x: q.x, y: q.y }]; }
  const lk = e.lk || { x: e.x, y: e.y }, list = [];
  for (let r = 1; r < n - 1; r++) for (let c = 1; c < n - 1; c++) if (m.t[r * n + c] === BUSH) { const x = c * T + T / 2, y = r * T + T / 2, d = Math.hypot(x - lk.x, y - lk.y); if (d < 5.5 * T) list.push({ x, y, d }); }
  list.sort((a, b) => a.d - b.d);
  const out = [];
  for (const s of list) { if (out.every(o => Math.hypot(o.x - s.x, o.y - s.y) > 1.3 * T)) out.push({ x: s.x, y: s.y }); if (out.length === 3) break; }
  if (!out.length) out.push({ x: lk.x + rand(-T, T), y: lk.y + rand(-T, T) });
  return out;
}
function* kapMortar(e) { // Havan: red circles (1.2 s) one after another on the bushes around where it last knew him; arc: true
  const kp = e.kp, spots = kapMortarSpots(e), live = []; let g = 0, i = 0;
  Sound.warnRise(volAt(e.x, e.y));
  while (i < spots.length || live.length) {
    g += e.dt;
    if (i < spots.length && g >= i * 0.4) { const s = spots[i++]; live.push(addTele(e, { kind: 'circle', x: s.x, y: s.y, r: T * 1.25, arc: true })); }
    for (let k = live.length - 1; k >= 0; k--) { const tl = live[k]; if (tl.t >= tl.dur) { release(e, 'havan', tl); bossBlast(tl.x, tl.y, tl.r, kapDmg(KAP.dmgMortar)); removeTele(tl); live.splice(k, 1); } }
    if (live.length) e.turret = turnTo(e.turret, Math.atan2(live[0].y - e.y, live[0].x - e.x), e.spec.tTurn * 0.8 * e.dt);
    yield 0;
  }
  yield 0.2; yield* kapOpen(e);
}

/* ---- Kapanış: the edge ring of steel moves in ---- */
function kapRingTiles(n, k) { const out = []; for (let i = k; i < n - k; i++) { out.push([i, k], [i, n - 1 - k]); if (i > k && i < n - 1 - k) out.push([k, i], [n - 1 - k, i]); } return out; }
function kapClose(e, k) { // ring k (0 = the very edge) turns to steel; whoever stands in it is pushed inward (never crushed), the warning came 2 s earlier
  const m = G.map, n = m.n, p = G.player;
  for (const [c, r] of kapRingTiles(n, k)) {
    const i = r * n + c, x = c * T + T / 2, y = r * T + T / 2; m.t[i] = STEEL; m.hp[i] = 0; miniTile(m, c, r);
    for (let q = 0, nq = Math.max(2, Math.round(3 * fxScale)); q < nq; q++) { const a = rand(0, TAU), v = rand(40, 130); addPart('debris', x + rand(-14, 14), y + rand(-14, 14), Math.cos(a) * v, Math.sin(a) * v, rand(0.5, 1), rand(3, 6), 0, 3.5, q & 1 ? '#3b3f44' : '#6c717a'); }
  }
  m.flowDirty = true; paintRegion(m, k, k, n - 1 - k, n - 1 - k);
  const push = (t, pad) => { const lo = (k + 1) * T + pad, hi = n * T - lo; t.x = clamp(t.x, lo, hi); t.y = clamp(t.y, lo, hi); };
  if (p.alive) push(p, p.r + 2);
  push(e, e.r + 3);
  for (const pk of G.pickups) if (kapRingOf(m, pk.x, pk.y) <= k) { const lo = (k + 1) * T + T / 2, hi = n * T - lo; pk.x = clamp(pk.x, lo, hi); pk.y = clamp(pk.y, lo, hi); }
  for (const b of G.bullets) if (!b.dead && kapRingOf(m, b.x, b.y) <= k) b.dead = true;
  e.kp.closed = k + 1; e.kp.warn = false; e.fit = null; e.flowT = 0; e.wp = null;
  shake(10); Sound.crumble(1); vibrate([30, 30, 50]); addText(p.x, p.y - 40, 'KAPANIŞ', '#ff8a6c', 20);
}
function kapRingTick(e, dt) {
  const kp = e.kp; if (G.phase !== 'fight' || e.invuln || e.dying) return;
  kp.t += dt;
  const k = kp.closed; if (k >= KAP.rings) return;
  const at = KAP.ringT + KAP.ringEvery * k;
  if (!kp.warn && kp.t >= at - KAP.ringWarn) { kp.warn = true; showBanner('KAPANIŞ', 'Kenardan uzaklaş: çelik halka ' + KAP.ringWarn + ' sn içinde kapanıyor', KAP.ringWarn); Sound.warnRise(1); vibrate([40, 40, 60]); }
  if (kp.t >= at) kapClose(e, k);
}

function kapTick(e, dt) {
  const kp = e.kp;
  if (G.phase === 'bossIntro') return;
  kapRingTick(e, dt);
  if (e.dying) {
    if (Math.random() < dt * 20) addPart('spark', e.x + rand(-20, 20), e.y + rand(-20, 20), rand(-120, 120), rand(-160, -30), rand(0.2, 0.5), 1, 0, 4, '#ff5040');
    if (!kp.boom && e.deathT >= 2.1) {
      kp.boom = true; explode(e.x, e.y, 1.9); addPart('flash', e.x, e.y, 0, 0, 0.3, 260, 0, 0); addPart('ring', e.x, e.y, 0, 0, 0.7, 20, 380, 0, '255,90,70');
      sparks(e.x, e.y, 36, '#ff7a5a', 460); shake(22); Sound.boom(1.8, volAt(e.x, e.y)); vibrate([50, 30, 90]);
    }
  }
}

/* ---- definition ---- */
BOSS_DEFS.kapatici = {
  id: 'kapatici', name: 'KAPATICI', arena: 'kapanis', introSub: 'Kapanış Arenası', sandboxOnly: true, hold: 0, phases: [], r: KAP_SPEC.r, lead: 0.9,
  deathText: 'KAPATICI DÜŞTÜ', loot: 'KAPATICI GANİMETİ',
  hp: () => KAP.hp,
  attacks: [
    { id: 'kesin', w: 4, ok: e => e.canSee && e.distP > 2 * T && los(e.x, e.y, G.player.x, G.player.y), run: kapPrecise },
    { id: 'sekme', w: 2.4, ok: e => { if (!(e.canSee || (e.lk && G.time - e.lk.t < 3))) return false; e.kp.sol = kapSolveBounce(e); return !!e.kp.sol; }, run: kapBounce },
    { id: 'kesme', w: 2.4, ok: e => e.canSee && e.distP > 3 * T && e.distP < 11 * T && e.treadT <= 0 && kapStyle(e.kp) !== 'brawler', run: kapCut, mov: true, cd: 7 },
    { id: 'havan', w: 3, ok: e => (e.kp.unseen > 3 && !!e.lk && G.time - e.lk.t < 25) || (e.canSee && e.unrT > 4), run: kapMortar, arc: true, cd: 5 }
  ],
  setup(e, w) {
    e.spec = Object.assign({}, SPECS.boss, KAP_SPEC); e.r = KAP_SPEC.r; e.pace = 0.7;
    const at = (G.map && G.map.playerAt) || G.player;
    e.lk = { x: at.x, y: at.y, t: G.time }; // both watched the intro: it knows where the player entered, nothing more
    e.kp = { t: 0, closed: 0, warn: false, openUntil: 0, charge: 0, vis: false, seeT: 0, unseen: 0, heard: -1, shotSeen: -1, px: undefined, py: 0, pvx: 0, pvy: 0, om: 0, h: 0, hv: false,
      esc: { L: 0, R: 0, away: 0, toward: 0 }, far: 0, near: 0, goal: null, goalT: 0, mode: 'lk', search: false, sn: 0, patrol: null, dodge: null, dodgeCd: 0, sol: null, boom: false };
  },
  sense: kapSense,
  move: kapMove,
  flowGoal: e => e.kp.goal || { x: e.x, y: e.y }, // never the player's true position
  tick: kapTick,
  watchGoal: e => !!e.kp.goal && !e.kp.dodge && Math.hypot(e.kp.goal.x - e.x, e.kp.goal.y - e.y) > 1.6 * T, // the stuck probe: it is supposed to be walking
  onClear(e) { e.kp.openUntil = 0; e.kp.charge = 0; e.kp.dodge = null; },
  hullMul(e, x, y, dir, direct, quiet) {
    if (!direct && !quiet) return 1; // the nuke is a flat blow
    if (direct && dir !== undefined && !e.canSee && e.kp) setLk(e, e.x + Math.cos(dir) * AWARE.hitBack * T, e.y + Math.sin(dir) * AWARE.hitBack * T, AWARE.hitErr); // a hit tells it the direction the shell came from
    if (kapOpenNow(e)) return 1; // open window: the barrel glows, full damage
    if (direct && !quiet) { sparks(x, y, 4, '#cfe8ff', 220, dir, 1); e.kp.deflect = G.time; }
    return 0.5; // the hull deflects half
  },
  danger(e, x, y, pad) { // the ring that is about to close
    const kp = e.kp; if (!kp.warn) return false;
    const lim = (kp.closed + 1) * T + pad; return Math.min(x, y, G.map.w - x, G.map.h - y) < lim;
  },
  draw: (e, g, alpha) => drawKapatici(e, g, alpha),
  drawGround: (e, g) => drawKapaniGround(e, g)
};
