/* ================= Komutan (docs/BOSSES.md section 3) ================= */
// Attacks are generators: `yield n` waits n seconds (0 = next frame), e.dt is the frame time. Each one shows its telegraph first (see TELE_MIN).
const RAM_DMG = 40; // ezme: a clean hit takes about a third of a mid-game tank's armour and hull
const KOM_FAN3 = [-0.2, 0, 0.2], KOM_FAN5 = [-0.34, -0.17, 0, 0.17, 0.34];
function* komTriple(e) { yield* glowAim(e, 'triple', 0.45, KOM_FAN3); bossVolley(e, KOM_FAN3); yield 0.4; }
function* komPenta(e) { yield* glowAim(e, 'penta', 0.45, KOM_FAN5); bossVolley(e, KOM_FAN5); yield 0.5; }
function* komSalvo(e) { // yaylım: three triple volleys, the fan turning a little each time, each with its own glow
  for (let k = 0; k < 3; k++) {
    const tl = addTele(e, { kind: 'glow', dur: 0.45, fan: KOM_FAN3 }), p = G.player, base = leadAng(e.x, e.y, e.spec.bSpeed, e.def.lead) + (k - 1) * 0.3;
    while (tl.t < tl.dur) { e.turret = turnTo(e.turret, base, e.spec.tTurn * 2.2 * e.dt); yield 0; }
    release(e, 'yaylim', tl); removeTele(tl); bossVolley(e, KOM_FAN3); yield 0.15;
  }
  yield 0.3;
}
function* komCharge(e) { // ezme hücumu: red line (last 0.3 s locked), then a 6-tile rush that flattens bricks; steel stops it and stuns the Komutan for 2 s
  const p = G.player, s = e.spec, margin = e.r + 4;
  const tl = addTele(e, { kind: 'line', dur: 1.05, lock: 0.3, x: e.x, y: e.y, a: e.angle, len: 6 * T, w: 2 * (e.r + 12) });
  Sound.warnRise(volAt(e.x, e.y));
  while (tl.t < tl.dur) {
    if (tl.t < tl.dur - tl.lock) e.angle = turnTo(e.angle, Math.atan2(p.y - e.y, p.x - e.x), 3.2 * e.dt);
    aimAtPlayer(e, e.dt);
    tl.x = e.x; tl.y = e.y; tl.a = e.angle; tl.len = rayClip(e.x, e.y, e.angle, 6 * T, margin);
    yield 0;
  }
  release(e, 'ezme', tl);
  const m = G.map, ca = Math.cos(e.angle), sa = Math.sin(e.angle), plan = tl.len, clipped = plan < 6 * T - 1;
  let trav = 0, hurt = false;
  while (trav < plan) {
    const step = Math.min(430 * e.dt, plan - trav);
    for (const [fa, lat] of [[e.r + 10, 0], [e.r + 8, e.r * 0.7], [e.r + 8, -e.r * 0.7]]) { // flatten the bricks in front
      const bx = e.x + ca * fa - sa * lat, by = e.y + sa * fa + ca * lat;
      if (m.at(bx, by) === BRICK) { destroyBrick(m, Math.floor(bx / T), Math.floor(by / T), volAt(bx, by)); shake(4); }
    }
    const ox = e.x, oy = e.y;
    moveTank(e, ca * step, sa * step);
    const moved = Math.hypot(e.x - ox, e.y - oy);
    trackUpdate(e, moved, 0); trav += moved;
    if (fxScale === 1 && Math.random() < 0.6) addPart('dust', e.x - ca * e.r, e.y - sa * e.r + rand(-14, 14), rand(-30, 30), rand(-30, 30), rand(0.4, 0.8), rand(14, 24), 26, 2);
    if (!hurt && p.alive && dist2(e.x, e.y, p.x, p.y) < (e.r + p.r + 2) * (e.r + p.r + 2)) {
      hurt = true; damagePlayer({ x: p.x, y: p.y, dmg: bossDmg(RAM_DMG), owner: 1, vx: 0, vy: 0 });
      moveTank(p, -sa * 36, ca * 36 * (Math.random() < 0.5 ? 1 : -1)); shake(8);
    }
    if (moved < step * 0.35) break; // jammed against something
    yield 0;
  }
  removeTele(tl);
  if (clipped || trav < plan - 6) { // slammed into steel: stunned
    e.stunT = 2; shake(12); explode(e.x + ca * e.r, e.y + sa * e.r, 0.7); Sound.metal(volAt(e.x, e.y));
    addText(e.x, e.y - e.r - 14, 'SERSEMLEDİ', '#bfeaff', 18);
  }
  if (e.unlock.shock && e.phase >= 2) { while (e.stunT > 0) yield 0; yield* komShock(e); }
  yield 0.3;
}
function* komShock(e) { // şok dalgası: ring of 3 tiles; steel in between protects
  const tl = addTele(e, { kind: 'ring', dur: 1.2, r: 3 * T });
  Sound.warnRise(volAt(e.x, e.y));
  while (tl.t < tl.dur) yield 0;
  release(e, 'shock', tl); removeTele(tl);
  const p = G.player, R = 3 * T;
  addPart('ring', e.x, e.y, 0, 0, 0.5, 20, R * 2.2, 0, '255,200,140'); addPart('flash', e.x, e.y, 0, 0, 0.2, 140, 0, 0); shake(12); Sound.boom(1.2, volAt(e.x, e.y));
  if (p.alive && dist2(e.x, e.y, p.x, p.y) < (R + p.r) * (R + p.r) && !steelBetween(e.x, e.y, p.x, p.y)) {
    damagePlayer({ x: p.x, y: p.y, dmg: bossDmg(20), owner: 1, vx: 0, vy: 0 });
    const a = Math.atan2(p.y - e.y, p.x - e.x); moveTank(p, Math.cos(a) * 40, Math.sin(a) * 40);
  }
  yield 0.3;
}
function* komMortar(e) { // topçu desteği: three circles around the player (fall over walls)
  const p = G.player, m = G.map, circ = [];
  Sound.warnRise(volAt(e.x, e.y));
  for (let i = 0; i < 3; i++) {
    const a = rand(0, TAU), d = i === 0 ? rand(0, 40) : rand(70, 140);
    circ.push(addTele(e, { kind: 'circle', r: 56, x: clamp(p.x + Math.cos(a) * d, T, m.w - T), y: clamp(p.y + Math.sin(a) * d, T, m.h - T) }));
  }
  while (circ[0].t < circ[0].dur) { aimAtPlayer(e, e.dt, 0.5); yield 0; }
  for (const tl of circ) { release(e, 'topcu', tl); removeTele(tl); bossBlast(tl.x, tl.y, 56, 18); }
  yield 0.4;
}
function* komBombard(e) { // bombardıman hattı: a row of circles across the arena with a gap, then blasts along it
  const p = G.player, m = G.map, horiz = Math.random() < 0.5, step = 80, circ = [];
  const along = horiz ? p.x : p.y, gap = along + (Math.random() < 0.5 ? -1 : 1) * rand(50, 110), line = horiz ? p.y : p.x, span = horiz ? m.w : m.h;
  Sound.warnRise(volAt(e.x, e.y));
  for (let v = step / 2; v < span; v += step) {
    if (Math.abs(v - gap) < step * 1.2) continue;
    const x = horiz ? v : line, y = horiz ? line : v;
    if (m.at(x, y) === STEEL) continue;
    circ.push(addTele(e, { kind: 'circle', r: 44, x, y }));
  }
  while (circ.length && circ[0].t < circ[0].dur) { aimAtPlayer(e, e.dt, 0.5); yield 0; }
  for (const tl of circ) { release(e, 'bomb', tl); removeTele(tl); bossBlast(tl.x, tl.y, 44, 16); yield 0.045; }
  yield 0.4;
}
const KOM_ATTACKS = [
  { id: 'triple', w: 3, ok: e => true, run: komTriple },
  { id: 'ezme', w: 2.2, ok: e => e.distP > 2.5 * T, run: komCharge, mov: true },
  { id: 'topcu', w: 2, ok: e => e.unlock.topcu && partAlive(e, 'tower'), run: komMortar },
  { id: 'yaylim', w: 2, ok: e => e.unlock.yaylim && e.phase >= 1, run: komSalvo },
  { id: 'bomb', w: 1.6, ok: e => e.unlock.bomb && e.phase >= 1, run: komBombard, cd: 9 },
  { id: 'penta', w: 2.4, ok: e => e.unlock.penta && e.phase >= 2, run: komPenta }
];
BOSS_DEFS.komutan = {
  id: 'komutan', name: 'KOMUTAN', arena: 'kisla', introSub: 'Kışla', hold: 4.5, phases: [66, 33], plates: ['shoulder', 'skirt'],
  deathText: 'KOMUTAN DÜŞTÜ', loot: 'KOMUTAN GANİMETİ',
  lead: 0.35, hp: bossHp, attacks: KOM_ATTACKS, barrels: [{ id: 'mid', name: 'Orta namlu', ang: 0, k: 0.07 }],
  unlocks: w => ({ tower: w >= 15, topcu: w >= 15, yaylim: w >= 25, bomb: w >= 25, penta: w >= 35, shock: w >= 35 }),
  setup(e, w) {
    if (e.unlock.tower) e.parts.push({ id: 'tower', name: 'Komuta kulesi', atk: 'topcu', ox: -24, oy: 0, r: 15, maxHp: Math.max(2, Math.round(e.maxHp * 0.1)), hp: Math.max(2, Math.round(e.maxHp * 0.1)), alive: true, flash: 0 });
  },
  onPhase(e, i) { if (i === 2) { e.speedMul *= 1.3; addText(e.x, e.y - e.r - 54, 'SON EMİR', '#ff7a5c', 18); } },
  onPartBreak(e, pt) { if (pt.id === 'tower') spawnPiece(e, 'flag', true); }
};
