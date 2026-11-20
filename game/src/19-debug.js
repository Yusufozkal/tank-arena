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
    choices: () => upChoices.slice(), choose(k) { chooseUpgrade(k); finishEvo(); }, chooseRaw: chooseUpgrade, finishEvo, showUpgrades, waveCleared, playerSpec, bossHp, SPECS,
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
    drop(kind, dx, dy) { const p = G.player; dropPickup(p.x + (dx || 0), p.y + (dy || 0), kind); }
  };
}

