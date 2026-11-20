function autopilot(dt) {
  const p = G.player; if (!p || !p.alive) return;
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
