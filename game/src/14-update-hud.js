/* ================= update ================= */
function updateCamera(rdt) {
  const p = G.player, m = G.map;
  let tx = m.w / 2, ty = m.h / 2;
  if (p) {
    tx = p.x; ty = p.y;
    if (G.phase === 'bossIntro' && G.boss) { tx = G.boss.x; ty = G.boss.y + T * 1.5; } // intro: the camera watches the boss
    else if (G.state === 'over' && G.overFree) { tx = p.x - (G.overFree.x - view.w / 2) / view.scale; ty = p.y - (G.overFree.y - view.h / 2) / view.scale; }
    else {
      if (p.alive) { tx += Math.cos(p.turret) * T * 0.7; ty += Math.sin(p.turret) * T * 0.7; }
      if (input.touch && view.h > view.w) ty += view.h / view.scale * 0.07;
    }
  }
  let zt = G.state === 'menu' ? 1 : TANKS[G.tank].zoom; // Keskin Nişancı: the camera pulls back
  if (G.stage && G.state !== 'menu') zt = Math.min(zt, 0.85); // boss stage: the camera pulls back
  if (view.zoomK !== zt) { view.zoomK = Math.abs(zt - view.zoomK) < 0.001 ? zt : view.zoomK + (zt - view.zoomK) * (1 - Math.exp(-3 * rdt)); view.scale = view.base * view.zoomK; }
  const k = 1 - Math.exp(-5 * rdt);
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  clampCam();
  cam.shake = cam.shake * Math.exp(-9 * rdt); if (cam.shake < 0.05) cam.shake = 0;
  computeView();
}
function updateMenu(rdt) {
  G.time += rdt;
  const p = G.player; if (!p || !G.map) return;
  const now = performance.now();
  p.cool -= rdt; p.recoil = Math.max(0, p.recoil - rdt * 7);
  let aim;
  if (!input.touch && mouse.x >= 0 && now - mouse.lastMove < 4000) { const w = toWorld(mouse.x, mouse.y); aim = Math.atan2(w.y - p.y, w.x - p.x); }
  else if (menu.aim && now - menu.aimAt < 4000) aim = Math.atan2(menu.aim.y - p.y, menu.aim.x - p.x);
  else aim = -Math.PI / 2 + Math.sin(G.time * 0.55) * 0.9;
  p.turret = turnTo(p.turret, aim, 6 * rdt);
  const aligned = Math.abs(angDiff(p.turret, aim)) < 0.2;
  if (p.cool <= 0 && aligned && (menu.shot || (mouse.down && !input.touch))) { fireTank(p); p.cool = 0.3; menu.shot = false; menu.fired = true; }
  if (menu.fired) menu.hintA = Math.max(0, menu.hintA - rdt * 1.5);
  updateBullets(rdt); updateParticles(rdt); updateTexts(rdt);
  computeView();
}
function updatePlay(rdt) {
  const dt = rdt * G.timeScale;
  G.time += dt;
  G.hurt = Math.max(0, G.hurt - rdt);
  updatePhase(rdt);
  if (G.state !== 'play') return;
  if (G.phase === 'upgrade') { // world waits behind the workshop
    TT.frozenTick(rdt);
    if (G.evoWait > 0 && (G.evoWait -= rdt) <= 0) { G.evoWait = 0; hideBanner(); showUpgrades(); }
    updateParticles(rdt); updateTexts(rdt); updateCamera(rdt); updateHUD(); return;
  }
  const p = G.player;
  if (p.alive && G.phase !== 'bossIntro') { updatePlayer(p, dt); synTrack(p, dt); regen(p, dt); }
  updateFlow(dt);
  if (G.phase === 'fight') updateSpawns(dt);
  const frozen = G.buffs.freeze > 0;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const stunned = tickStatus(e, dt);
    if (e.dead) continue;
    if (e.isBoss) { e.lock = false; updateBoss(e, dt, frozen || stunned); continue; } // 11a: phases, attacks, stun
    if (frozen || stunned) { e.lock = false; e.flash = Math.max(0, e.flash - dt); e.recoil = 0; } // Dondurucu / Ikiz stun: enemies stand still and hold fire
    else updateEnemy(e, dt);
  }
  nukeUpdate(dt); // hook (C)
  separateTanks();
  updateBullets(dt);
  updateStrikes(dt);
  updatePieces(dt);
  updatePickups(dt);
  updateParticles(dt);
  updateTexts(dt);
  if (G.phase === 'fight') for (const k in G.buffs) if (G.buffs[k] > 0) G.buffs[k] = Math.max(0, G.buffs[k] - dt);
  if (G.enemies.some(e => e.dead)) G.enemies = G.enemies.filter(e => !e.dead);
  updateCamera(rdt);
  updateHUD();
}
function updateOver(rdt) {
  G.time += rdt;
  updateFlow(rdt);
  for (const e of G.enemies) if (!e.dead) { if (e.isBoss) updateBoss(e, rdt, e.dying ? false : true); else updateEnemy(e, rdt); }
  separateTanks(); updateBullets(rdt); updateParticles(rdt); updateTexts(rdt);
  if (G.enemies.some(e => e.dead)) G.enemies = G.enemies.filter(e => !e.dead);
  updateCamera(rdt);
}
function update(rdt) {
  if (bannerT > 0) { bannerT -= rdt; if (bannerT <= 0) el.banner.classList.remove('show'); }
  if (hintT > 0) { hintT -= rdt; if (hintT <= 0) el.hint.classList.remove('show'); }
  if (G.state === 'menu') updateMenu(rdt);
  else if (G.state === 'play') updatePlay(rdt);
  else if (G.state === 'over') updateOver(rdt);
}

/* ================= HUD ================= */
const ui = {};
function resetUI() { for (const k in ui) delete ui[k]; el.buffs.innerHTML = ''; }
function updateHUD() {
  const p = G.player; if (!p) return;
  const hp = Math.max(0, Math.ceil(p.hp)), mx = p.maxHp;
  if (ui.hp !== hp || ui.mx !== mx) { ui.hp = hp; ui.mx = mx; el.hpFill.style.transform = `scaleX(${Math.min(1, hp / mx)})`; el.hpNum.textContent = hp; el.armor.classList.toggle('low', hp <= mx * 0.3); }
  if (ui.score !== G.score) { ui.score = G.score; el.score.textContent = fmt(G.score); }
  if (ui.wave !== G.wave) { ui.wave = G.wave; el.waveT.textContent = 'DALGA ' + G.wave; }
  const boss = G.boss && !G.boss.dead ? G.boss : null;
  if (boss) {
    if (ui.bossOn !== true) { ui.bossOn = true; el.bossBar.classList.remove('hidden'); el.waveS.classList.add('hidden'); measureHud(); }
    if (ui.bossName !== boss.name) { ui.bossName = boss.name; el.bossBar.firstElementChild.textContent = boss.name.split(' ').map(w => w.charAt(0) + w.slice(1).toLocaleLowerCase('tr')).join(' '); } // boss name in the bar
    const k = Math.max(0, boss.hp / boss.maxHp); if (ui.boss !== k) { ui.boss = k; el.bossFill.style.transform = `scaleX(${k})`; }
  } else {
    if (ui.bossOn !== false) { ui.bossOn = false; el.bossBar.classList.add('hidden'); el.waveS.classList.remove('hidden'); measureHud(); }
    const remain = G.queue.length + G.enemies.length + G.portals.length;
    const txt = G.phase === 'upgrade' ? 'Yükseltme seç' : G.phase === 'cleared' || G.phase === 'out' ? 'Dalga temizlendi' : G.phase === 'intro' ? 'Hazırlan' : remain + ' düşman kaldı';
    if (ui.sub !== txt) { ui.sub = txt; el.waveS.textContent = txt; }
  }
  const active = BUFFS.filter(k => G.buffs[k] > 0);
  if (G.airQ > 0) active.push('air'); // a strike waiting for its first target
  const key = active.join();
  if (ui.buffs !== key) {
    ui.buffs = key;
    el.buffs.classList.toggle('many', active.length > 3); // past three, icons alone keep the column short
    el.buffs.innerHTML = active.map(k => `<div class="buff" title="${PU[k].name}">${puGlyph(k)}<span class="bn">${k === 'air' ? 'Hava saldırısı hazır' : PU[k].name}</span><i><b data-k="${k}" style="background:${PU[k].col}"></b></i></div>`).join('');
    ui.buffEls = Array.from(el.buffs.querySelectorAll('b[data-k]'));
    measureHud();
  }
  if (ui.buffEls) for (const b of ui.buffEls) { const k = b.dataset.k; b.style.transform = `scaleX(${k === 'air' ? 1 : clamp(G.buffs[k] / (G.buffMax[k] || PU[k].dur), 0, 1).toFixed(3)})`; }
  nukeHud(); // hook (C)
}

