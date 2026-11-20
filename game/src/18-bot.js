// Boss stage autopilot: danger map from the active warnings (and shells in flight); out of danger it fights (part -> stunned boss -> boss), in danger it runs to the nearest safe tile
function shellLane(x, y, pad) {
  for (const b of G.bullets) {
    if (b.dead || b.owner !== 1) continue;
    const v2 = b.vx * b.vx + b.vy * b.vy; if (!v2) continue;
    const t = clamp(((x - b.x) * b.vx + (y - b.y) * b.vy) / v2, 0, 0.7), cx = b.x + b.vx * t - x, cy = b.y + b.vy * t - y, rr = b.r + pad;
    if (cx * cx + cy * cy < rr * rr) return true;
  }
  return false;
}
const BOT_REACT = 0.5; // the bot needs about half a second to notice a warning, and misses some shells, so it is not a perfect dodger
let botBlind = false;
const botDanger = (x, y, pad) => bossDanger(x, y, pad, BOT_REACT) || (!botBlind && shellLane(x, y, pad - 6));
// breadth-first over open tiles from the player; returns the unit direction of the first step toward the nearest tile where test(c, r, x, y) holds
function botBfs(test, depth) {
  const p = G.player, m = G.map, n = m.n, c0 = clamp(Math.floor(p.x / T), 0, n - 1), r0 = clamp(Math.floor(p.y / T), 0, n - 1);
  const prev = new Map([[r0 * n + c0, -1]]), q = [[c0, r0, 0]];
  for (let h = 0; h < q.length; h++) {
    const [c, r, d] = q[h];
    if (d > 0 && test(c, r, c * T + T / 2, r * T + T / 2)) {
      let k = r * n + c, last = k; while (prev.get(k) !== -1) { last = k; k = prev.get(k); }
      const lc = last % n, lr = (last - lc) / n, dx = lc * T + T / 2 - p.x, dy = lr * T + T / 2 - p.y, l = Math.hypot(dx, dy) || 1;
      return { x: dx / l, y: dy / l };
    }
    if (d >= depth) continue;
    for (const [dx, dy] of DIRS) {
      const x = c + dx, y = r + dy; if (blocksTank(m.get(x, y))) continue;
      const k = y * n + x; if (prev.has(k)) continue;
      prev.set(k, r * n + c); q.push([x, y, d + 1]);
    }
  }
  return null;
}
function bossAutopilot(dt) {
  const p = G.player, e = G.boss, m = G.map;
  bot.t -= dt;
  let tx = e.x, ty = e.y;
  const part = e.stunT > 0 ? null : e.parts.find(q => q.alive);
  if (part) { const q = partPos(e, part); if (los(p.x, p.y, q.x, q.y)) { tx = q.x; ty = q.y; } } // priority: part, stunned boss, boss
  bot.aim = Math.atan2(ty - p.y, tx - p.x); bot.dist = Math.hypot(tx - p.x, ty - p.y);
  bot.fire = !bot.hold && !e.invuln && los(p.x, p.y, e.x, e.y);
  if (bot.t > 0) return;
  bot.t = 0.12; botBlind = Math.random() < 0.4;
  const here = botDanger(p.x, p.y, 26) || botDanger(p.x + p.vx * 0.35, p.y + p.vy * 0.35, 26);
  if (here) { // nearest safe tile
    const d = botBfs((c, r, x, y) => !botDanger(x, y, 30), 9);
    if (d) { bot.mx = d.x; bot.my = d.y; return; }
  }
  if (p.hp < p.maxHp * 0.8 && G.pickups.length) { // a repair kit lying around
    const k = G.pickups.find(q => q.kind === 'repair' && !botDanger(q.x, q.y, 20));
    if (k) { const kc = Math.floor(k.x / T), kr = Math.floor(k.y / T), d = botBfs((c, r) => c === kc && r === kr, 14); if (d) { bot.mx = d.x; bot.my = d.y; return; } }
  }
  const want = Math.max(TANKS[G.tank].botRange || 290, 150);
  const lineWarn = e.treadT <= 0 && G.tele.some(t => t.kind === 'line' && t.t < t.dur), brk = e.treadT > 0; // part damage: a charge line is up (shoot the tread from the side) / a tread is broken (get behind)
  let best = null, bs = -1e9;
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, x = p.x + Math.cos(a) * 60, y = p.y + Math.sin(a) * 60;
    if (blocksTank(m.at(x, y)) || blocksTank(m.at(p.x + Math.cos(a) * 30, p.y + Math.sin(a) * 30))) continue;
    const dd = Math.hypot(x - e.x, y - e.y), ang = Math.atan2(e.y - p.y, e.x - p.x), tang = Math.abs(Math.sin(angDiff(a, ang)));
    let sc = -Math.abs(dd - want) * 0.8 + tang * 25 + (los(x, y, e.x, e.y) ? 20 : 0) + Math.random() * 8 + (dd < e.r + 70 ? -300 : 0);
    if (lineWarn || brk) { const bang = Math.abs(angDiff(e.angle, Math.atan2(y - e.y, x - e.x))); if (lineWarn && bang > 0.9 && bang < 2.2) sc += 60; if (brk && bang > 2.3) sc += 40; }
    if (botDanger(x, y, 26)) sc -= 1000;
    if (sc > bs) { bs = sc; best = a; }
  }
  if (best !== null) { bot.mx = Math.cos(best); bot.my = Math.sin(best); } else { bot.mx = bot.my = 0; }
}
function autopilot(dt) {
  const p = G.player; if (!p || !p.alive) return;
  if (G.stage && G.boss && !G.boss.dead && !G.boss.dying && G.phase === 'fight') { bossAutopilot(dt); return; }
  let target = null, best = 1e18;
  for (const e of G.enemies) { const dd = dist2(e.x, e.y, p.x, p.y); if (dd < best) { best = dd; target = e; } }
  bot.t -= dt;
  if (target) {
    bot.aim = Math.atan2(target.y - p.y, target.x - p.x); bot.fire = !bot.hold;
    const range = TANKS[G.tank].botRange;
    if (range) { // tanks with a preferred distance: short range closes in then strafes, long range keeps its distance (Standart keeps the random walk below)
      const d = Math.sqrt(best); bot.dist = d;
      if (bot.t <= 0) {
        let a;
        if (Math.random() < 0.2) a = rand(0, TAU); // now and then a random turn gets the bot out of corners
        else if (d > range * 1.15) a = bot.aim;
        else if (d < range * 0.7) a = bot.aim + Math.PI;
        else { bot.sd = Math.random() < 0.5 ? 1 : -1; a = bot.aim + bot.sd * Math.PI / 2; }
        bot.mx = Math.cos(a); bot.my = Math.sin(a); bot.t = rand(0.35, 0.9);
      }
    } else if (bot.t <= 0) { const a = bot.aim + rand(-1.3, 1.3); bot.mx = Math.cos(a); bot.my = Math.sin(a); bot.t = rand(0.4, 1.2); }
  } else {
    bot.fire = false; bot.aim = null; bot.dist = 0;
    if (bot.t <= 0) { const a = rand(0, TAU); bot.mx = Math.cos(a); bot.my = Math.sin(a); bot.t = rand(0.5, 1.5); }
  }
}
// the bot's answer on an evolution screen: bot.tank = a tank id, a function (ids) => id, or 'random' (a random offered tank)
function botPick() {
  const bt = bot.tank;
  if (typeof bt === 'function') { const r = bt(upChoices.slice()); if (upChoices.includes(r)) return r; }
  else if (typeof bt === 'string' && upChoices.includes(bt)) return bt;
  return pick(upChoices);
}
