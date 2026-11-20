/* ================= input ================= */
let STICK_R = 56; // set from the joystick size setting
const mkStick = () => ({ id: null, ox: 0, oy: 0, vx: 0, vy: 0, t0: 0, max: 0 });
const sticks = { move: mkStick(), aim: mkStick() };
const keys = new Set();
const mouse = { x: -1, y: -1, down: false, lastMove: -1e9, lastDown: -1e9 };
const input = { touch: !!(window.matchMedia && matchMedia('(pointer: coarse)').matches), mouseAim: false, keyMoveAt: -1e9 };
let tapFire = false;
const KEYS = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', Space: 'fire' };
function releaseInput() {
  for (const st of [sticks.move, sticks.aim]) { st.id = null; st.vx = st.vy = 0; }
  keys.clear(); mouse.down = false; tapFire = false;
}
window.addEventListener('keydown', e => {
  const focusBtn = document.activeElement && document.activeElement.tagName === 'BUTTON';
  if ((e.code === 'Escape' || e.code === 'KeyP') && subOpen()) { if (e.code === 'Escape') closeSub(); e.preventDefault(); return; }
  if (e.code === 'KeyP' || e.code === 'Escape') { if (G.state === 'play') pauseGame(); else if (G.state === 'paused') resumeGame(); e.preventDefault(); return; }
  if (e.code === 'KeyM' && !e.repeat) { toggleSound(); return; }
  if (nukeKey(e)) return; // hook (C): N key etc.
  if (G.state === 'play' && G.phase === 'upgrade' && !subOpen()) {
    const n = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[e.code];
    if (n !== undefined) { e.preventDefault(); if (!e.repeat && upChoices[n]) chooseUpgrade(upChoices[n]); return; }
  }
  if ((e.code === 'Enter' || e.code === 'NumpadEnter') && !e.repeat && !focusBtn && !subOpen() && (G.state === 'menu' || G.state === 'over')) { e.preventDefault(); startGame(null); return; }
  const k = KEYS[e.code];
  if (!k) return;
  if (G.state === 'play') { e.preventDefault(); if (focusBtn) document.activeElement.blur(); }
  keys.add(k);
  if (k !== 'fire') input.keyMoveAt = performance.now();
  input.touch = false;
});
window.addEventListener('keyup', e => { const k = KEYS[e.code]; if (k) keys.delete(k); });
window.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { mouse.x = e.clientX; mouse.y = e.clientY; } });
window.addEventListener('pointerup', e => { if (e.pointerType === 'mouse' && e.button === 0) mouse.down = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  Sound.init(); Sound.resume();
  if (e.pointerType === 'mouse') {
    input.touch = false; input.mouseAim = true; mouse.x = e.clientX; mouse.y = e.clientY; mouse.lastMove = mouse.lastDown = performance.now();
    if (e.button === 0) mouse.down = true;
    return;
  }
  e.preventDefault();
  input.touch = true; canvas.classList.remove('aim');
  if (G.state === 'menu') { menu.aim = toWorld(e.clientX, e.clientY); menu.aimAt = performance.now(); menu.shot = true; return; }
  if (G.state !== 'play' || G.phase === 'upgrade') return;
  const st = (e.clientX < view.w / 2) !== SET.swapSticks ? sticks.move : sticks.aim;
  if (st.id !== null) return;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  st.id = e.pointerId; st.ox = e.clientX; st.oy = e.clientY; st.vx = st.vy = 0; st.t0 = performance.now(); st.max = 0;
}, { passive: false });
canvas.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') {
    mouse.x = e.clientX; mouse.y = e.clientY;
    // browsers send synthetic mouse moves on layout changes; only a real movement switches to mouse aiming
    if (e.movementX || e.movementY) { mouse.lastMove = performance.now(); input.mouseAim = true; input.touch = false; }
    return;
  }
  e.preventDefault();
  if (G.state === 'menu') { menu.aim = toWorld(e.clientX, e.clientY); menu.aimAt = performance.now(); return; }
  for (const st of [sticks.move, sticks.aim]) {
    if (st.id !== e.pointerId) continue;
    let dx = e.clientX - st.ox, dy = e.clientY - st.oy; const d = Math.hypot(dx, dy);
    if (d > STICK_R) { st.ox += dx / d * (d - STICK_R); st.oy += dy / d * (d - STICK_R); dx = e.clientX - st.ox; dy = e.clientY - st.oy; }
    st.vx = dx / STICK_R; st.vy = dy / STICK_R; st.max = Math.max(st.max, Math.hypot(st.vx, st.vy));
  }
}, { passive: false });
function endPointer(e) {
  if (e.pointerType === 'mouse') { if (e.type !== 'pointerup' || e.button === 0) mouse.down = false; return; }
  for (const st of [sticks.move, sticks.aim]) {
    if (st.id !== e.pointerId) continue;
    if (st === sticks.aim && e.type === 'pointerup' && performance.now() - st.t0 < 230 && st.max < 0.35) tapFire = true;
    st.id = null; st.vx = st.vy = 0;
  }
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('lostpointercapture', endPointer);
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
window.addEventListener('blur', () => { keys.clear(); mouse.down = false; pauseGame(); });

function autoTarget(p, base, cone) { // sets autoTarget.lastD to the distance of the chosen target
  let best = null, bestScore = 1e9;
  for (const e of G.enemies) {
    if (e.dead || (e.hidden && !upL('thermal')) || !onScreen(e.x, e.y, 0)) continue;
    const a = Math.atan2(e.y - p.y, e.x - p.x), d = Math.hypot(e.x - p.x, e.y - p.y);
    const da = base === null ? 0 : Math.abs(angDiff(base, a));
    if (da > cone || !los(p.x, p.y, e.x, e.y)) continue;
    const sc = da * 300 + d; if (sc < bestScore) { bestScore = sc; best = a; autoTarget.lastD = d; }
  }
  return best;
}

/* ================= player ================= */
const bot = { on: false, mx: 0, my: 0, aim: null, fire: false, t: 0, dist: 0, sd: 1, tank: 'random' }; // dist: shot distance for the Obüs; tank: evolution pick (id, 'random' or a function of the offered ids)
function updatePlayer(p, dt) {
  const s = p.spec, m = G.map, now = performance.now();
  p.cool -= dt; p.flash = Math.max(0, p.flash - dt); p.recoil = Math.max(0, p.recoil - dt * 7);
  let ix = 0, iy = 0, thr = 0;
  const mv = sticks.move;
  if (bot.on) { ix = bot.mx; iy = bot.my; thr = 1; }
  else if (mv.id !== null) { const mag = Math.hypot(mv.vx, mv.vy); if (mag > 0.15) { ix = mv.vx / mag; iy = mv.vy / mag; thr = clamp((mag - 0.15) / 0.45, 0.4, 1); } }
  else {
    const kx = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0), ky = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0);
    if (kx || ky) { const l = Math.hypot(kx, ky); ix = kx / l; iy = ky / l; thr = 1; }
  }
  const before = p.angle;
  let tvx = 0, tvy = 0;
  const turbo = G.buffs.speed > 0 ? 1.45 : 1;
  if (thr > 0) {
    const target = Math.atan2(iy, ix);
    p.angle = turnTo(p.angle, target, s.turn * (turbo > 1 ? 1.25 : 1) * dt);
    const al = Math.cos(angDiff(p.angle, target)), spd = al > 0 ? s.speed * turbo * thr * al * al * pushK(p) : 0; // pushK: Çift Yön volley boost
    tvx = Math.cos(p.angle) * spd; tvy = Math.sin(p.angle) * spd;
  }
  const k = 1 - Math.exp(-12 * dt);
  p.vx += (tvx - p.vx) * k; p.vy += (tvy - p.vy) * k;
  const ox = p.x, oy = p.y;
  moveTank(p, p.vx * dt, p.vy * dt);
  if (dt > 0) { p.avx = (p.x - ox) / dt; p.avy = (p.y - oy) / dt; }
  trackUpdate(p, (p.x - ox) * Math.cos(p.angle) + (p.y - oy) * Math.sin(p.angle), angDiff(before, p.angle));
  const moving = Math.hypot(p.vx, p.vy) > 50, bx = p.x - Math.cos(p.angle) * s.len * 0.55, by = p.y - Math.sin(p.angle) * s.len * 0.55;
  if (turbo > 1 && moving && Math.random() < dt * 22) addPart('glow', bx + rand(-4, 4), by + rand(-4, 4), -p.vx * 0.2, -p.vy * 0.2, 0.32, 15, -24, 2, 'pu_speed');
  if (upL('engine') && moving && fxScale === 1 && Math.random() < dt * (2 + upL('engine'))) addPart('smoke', bx, by, -p.vx * 0.15 + rand(-8, 8), -p.vy * 0.15 + rand(-8, 8), rand(0.4, 0.7), rand(6, 9), 22, 2);

  let aim = null, firing = false, aimD = 6 * T; // aimD: how far the shot should go (Obus lob); 6 tiles when nothing says otherwise
  const am = sticks.aim;
  if (bot.on) { aim = bot.aim; firing = bot.fire; if (bot.dist) aimD = bot.dist; }
  else if (am.id !== null) {
    const mag = Math.hypot(am.vx, am.vy);
    if (mag > 0.22) {
      aim = Math.atan2(am.vy, am.vx);
      aimD = (2.5 + 8.5 * clamp((mag - 0.32) / 0.68, 0, 1)) * T; // stick deflection 0.32..1 -> 2.5..11 tiles
      if (SET.aimAssist) { const as = autoTarget(p, aim, 0.26); if (as !== null) { aim = as; aimD = autoTarget.lastD; } }
      firing = mag > 0.32;
    }
  } else if (input.mouseAim && !input.touch) {
    const w = toWorld(mouse.x, mouse.y); aim = Math.atan2(w.y - p.y, w.x - p.x); firing = mouse.down || keys.has('fire');
    aimD = clamp(Math.hypot(w.x - p.x, w.y - p.y), 2.5 * T, 12 * T);
    if (thr > 0 && now - mouse.lastMove > 6000 && now - mouse.lastDown > 6000) input.mouseAim = false;
  } else { aim = p.angle; firing = keys.has('fire') || mouse.down; }
  if (tapFire) {
    tapFire = false;
    const as = autoTarget(p, null, 9);
    if (as !== null) { aim = as; p.turret = as; aimD = autoTarget.lastD; } else if (aim === null) aim = p.turret;
    firing = true;
  }
  if (aim !== null) p.turret = turnTo(p.turret, aim, s.tTurn * dt);
  p.aimDist = clamp(aimD, 2.5 * T, 12 * T);
  TT.playerTick(p, dt, firing);
  if (firing && p.cool <= 0 && s.mode !== 'flame' && !TT.locked(p)) { fireTank(p); p.cool = s.cool * (G.buffs.rapid > 0 ? 0.5 : 1) * TT.coolK(p); }
  if (!G.bushHint && m.at(p.x, p.y) === BUSH) { G.bushHint = true; showHint('Çalıdayken düşmanlar seni ancak yakından görebilir', 4); }
  damageSmoke(p, dt);
}

/* ================= banners & hints ================= */
let bannerT = 0, hintT = 0;
function showBanner(t, s, dur) {
  el.bTitle.textContent = t; el.bSub.textContent = s || ''; el.bSub.classList.toggle('hidden', !s);
  el.banner.classList.remove('show'); void el.banner.offsetWidth; el.banner.classList.add('show');
  bannerT = dur || 1.8;
}
function hideBanner() { bannerT = 0; el.banner.classList.remove('show'); }
function showHint(t, dur) { el.hint.textContent = t; el.hint.classList.add('show'); hintT = dur || 4; }

