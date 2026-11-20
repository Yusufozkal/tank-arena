if (DEBUG) {
  window.__tank = {
    G, view, cam, parts, input, SET, rec: () => REC, applySettings, startGame, toMenu, gameOver, pauseGame, resumeGame,
    bench(n) { const t0 = performance.now(); for (let i = 0; i < n; i++) render(); return (performance.now() - t0) / n; },
    info() {
      return { state: G.state, phase: G.phase, wave: G.wave, score: G.score, kills: G.kills, hp: G.player ? Math.round(G.player.hp) : null,
        enemies: G.enemies.length, queue: G.queue.length, portals: G.portals.length, parts: parts.length, bullets: G.bullets.length,
        decals: G.map ? G.map.decals.length : 0, shots: G.shots, hits: G.hits, boss: !!G.boss,
        maxHp: G.player ? G.player.maxHp : null, up: Object.assign({}, G.up), buffs: BUFFS.filter(k => G.buffs[k] > 0),
        tank: G.tank, heat: G.player ? +G.player.heat.toFixed(2) : 0 };
    },
    sim(sec, god) {
      bot.on = true; G.god = !!god;
      const n = Math.round(sec * 60);
      for (let i = 0; i < n && G.state === 'play'; i++) {
        if (G.phase === 'upgrade') { if (G.upMode === 'evo') { chooseUpgrade(botPick()); finishEvo(); } else chooseUpgrade(pick(upChoices)); }
        autopilot(1 / 60); update(1 / 60);
      }
      bot.on = false; G.god = false;
      return this.info();
    },
    killAll() { for (const e of G.enemies) killEnemy(e); G.queue.length = 0; G.portals.length = 0; },
    dbg, sticks, wave(w) { G.wave = w - 1; nextWave(); },
    choices: () => upChoices.slice(), choose(k) { chooseUpgrade(k); finishEvo(); }, chooseRaw: chooseUpgrade, finishEvo, showUpgrades, waveCleared, playerSpec, bossHp, SPECS, typeShares, buildRoster, typeBanned, waveMods, updateTamirci, nextWave,
    setUp(o) { G.up = Object.assign({}, o); refreshPlayer(); },
    give(kind) { const p = G.player; applyPickup({ kind, x: p.x, y: p.y }); },
    fire() { fireTank(G.player); },
    stepBullets(dt) { updateBullets(dt); },
    stepEnemies(dt) { for (const e of G.enemies) if (!e.dead) updateEnemy(e, dt); },
    stepStrikes(dt) { updateStrikes(dt); },
    spawn(type, x, y) { spawnEnemy(type, x, y); const e = G.enemies[G.enemies.length - 1]; e.cool = 99; return e; },
    clearArena(bushes) {
      const m = G.map, n = m.n;
      for (let r = 1; r < n - 1; r++) for (let c = 1; c < n - 1; c++) { m.t[r * n + c] = EMPTY; m.hp[r * n + c] = 0; }
      for (const [c, r] of bushes || []) m.t[r * n + c] = BUSH;
      m.decals.length = 0; m.flowDirty = true; buildLayer(m); buildMini(m);
    },
    /* -- A: tanks -- */
    TANKS, tanks: () => TANK_IDS.slice(), tank: () => G.tank, evoDue, needTier, tankShells, tankRange, heat: () => (G.player ? G.player.heat : 0),
    // setTank: switch the tank at once (camera zoom included), keeping the workshop cards; botTank: the bot's evolution pick; noEvo: switch the debt rule off (baseline probes)
    setTank(id) {
      if (!TANKS[id]) throw new Error('unknown tank ' + id);
      G.tank = id; refreshPlayer(); const p = G.player; p.heat = 0; p.overheatT = 0; p.pushT = 0; p.cool = 0;
      view.zoomK = TANKS[id].zoom; view.scale = view.base * view.zoomK; return id;
    },
    botTank(v) { bot.tank = v; },
    noEvo(v) { G.noEvo = !!v; },
    /* -- D2 -- */
    rayLaser: (x, y, a) => TT_rayli.laser(x, y, a), lobArea: () => TT_obus.area(G.player.spec), lobTarget: () => TT_obus.target(G.player, G.player.spec),
    /* -- B: synergies -- */
    syn: () => synList().map(sy => sy.id), SYN, SYN_K, synFlags, synDmg, synTaken, synRegen, splashFor, synBadgeHTML,
    /* -- C: nuke -- */
    nuke() { const n = G.nuke; return { meter: +n.meter.toFixed(4), ready: nukeReady(), warnT: +n.warnT.toFixed(3), used: n.used, flashT: n.flashT, onScreen: nukeOnScreen().length, bot: !!bot.nuke }; },
    nukeCharge(f) { G.nuke.meter = clamp(+f, 0, 1); return this.nuke(); },
    nukeFire() { return nukeFire(true); },
    botNuke(on) { bot.nuke = !!on; },
    hold(v) { bot.hold = !!v; },
    step(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n && G.state === 'play'; i++) update(1 / 60); return this.info(); },
    /* -- boss stage -- */
    bossInfo() { const e = G.boss; return { stage: !!G.stage, phase: G.phase, wave: G.wave, boss: !!e, hp: e ? +e.hp.toFixed(2) : 0, maxHp: e ? e.maxHp : 0, bphase: e ? e.phase : -1, trans: e ? +e.trans.toFixed(2) : 0, invuln: e ? !!e.invuln : false, dying: e ? !!e.dying : false, atk: e ? e.atkId : '', stunT: e ? +e.stunT.toFixed(2) : 0, tower: e ? e.parts.map(q => [q.id, q.alive, q.hp]) : [], enemies: G.enemies.length, tele: G.tele.length, log: e ? e.log.slice() : [] }; },
    hurtBoss(d, x, y, dir) { const e = G.boss; hurtEnemy(e, d, x === undefined ? e.x : x, y === undefined ? e.y : y, dir); return e.hp; },
    partInfo(e) { e = e || G.boss; return e.tr ? { treadT: +e.treadT.toFixed(2), tr: e.tr.map(t => ({ hp: +t.hp.toFixed(1), max: t.max, br: t.br, t: +t.t.toFixed(2) })), bars: e.bars.map(b => ({ id: b.id, acc: +b.acc.toFixed(1), thr: b.thr, t: +b.t.toFixed(2) })), cancels: e.cancels } : e.pt ? { tread: +e.pt.tread.toFixed(2), barrel: +e.pt.barrel.toFixed(2), engine: +e.pt.engine.toFixed(2), imm: Object.assign({}, e.pt.imm), dur: Object.assign({}, e.pt.dur) } : null; },
    partBreak, PART_T, PART_HP, BT, hurtEnemy, bossVolley,
    bossSkip() { G.introSeen = true; G.phaseT = Math.max(G.phaseT, 0.3); bossIntroTap(); },
    bossDanger, bossClearHazards, BOSS_DEFS, ARENAS, parseArena, themeFor, bossDefAt,
    // one boss fight for the probe: wave w, workshop cards (object), tank id; the bot plays until the boss falls, the tank dies or maxSec passes
    bossFight(w, cards, tank, maxSec) {
      store.set(BOSS_SEEN_KEY, true); bot.on = true; bot.nuke = false; G.god = false; G.noEvo = true;
      G.up = Object.assign({}, cards); G.tank = tank || 'std'; refreshPlayer(); G.player.hp = G.player.maxHp;
      view.zoomK = TANKS[G.tank].zoom; G.wave = w - 1; nextWave(); G.introSeen = true; endBossIntro(true);
      const p = G.player, e = G.boss, hp0 = p.hp; let n = 0, hurtSum = 0, last = p.hp; const max = Math.round(maxSec * 60);
      while (n < max && G.state === 'play' && p.alive && !e.dead && !e.dying) {
        autopilot(1 / 60); update(1 / 60); n++;
        if (p.hp < last) hurtSum += last - p.hp; last = p.hp;
      }
      bot.on = false; G.noEvo = false;
      return { win: !!(e.dead || e.dying), secs: +(n / 60).toFixed(1), dmg: Math.round(hurtSum), hpLeft: Math.round(p.hp), bphase: e.phase, bossHp: +(e.hp / e.maxHp).toFixed(2), maxHp: e.maxHp };
    },
    drop(kind, dx, dy) { const p = G.player; dropPickup(p.x + (dx || 0), p.y + (dy || 0), kind); }
  };
}

