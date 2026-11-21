/* ===== NUKE ===== */
// Owner: package C (nuclear bomb).
// Hooks called from shared code: nukeOnKill (killEnemy), nukeUpdate (updatePlay), nukeKey (keydown), nukeHud (updateHUD), drawNuke (render).
// Meter: every kill adds weight / (NUKE_WAVES * expected weight of a whole wave), so a wave of any size gives about 1/NUKE_WAVES of the meter.
const NUKE_WAVES = 3.5;                                                  // waves of kills to fill the meter (E tunes this)
const NUKE_WEIGHT = { basic: 1, fast: 1, hunter: 1.5, heavy: 2, boss: 3 }; // meter weight per enemy type
const NUKE_WARN = 1.2;      // seconds of warning (game time) before the blast
const NUKE_BOSS_CAP = 0.3;   // blast damage to a boss is at most this share of its max HP
const NUKE_BOSS_BASE = 150;  // blast damage to a boss up to wave 15
const NUKE_BOSS_PER_WAVE = 6; // extra blast damage to a boss per wave after wave 15
const NUKE_BOSS_FLOOR = 0.1; // a boss keeps at least this share of its max HP after the blast
// blast damage to a boss at wave w: 150 up to wave 15, +6 per wave after, never above 30% of the boss's max HP
const nukeBossDmg = (w, maxHp) => Math.min(NUKE_BOSS_CAP * maxHp, NUKE_BOSS_BASE + NUKE_BOSS_PER_WAVE * Math.max(0, w - 15));
const NUKE_BOSS_STUN = 3;   // seconds a boss is stunned
const NUKE_BOSS_FILL = 0.6; // share of a boss's max HP that, dealt as damage, fills the meter once (boss stage)
const NUKE_FLASH = 0.6;     // seconds the white flash fades
// expected total weight of wave w's roster; mirrors buildRoster without touching its random numbers
function nukeWaveWeight(w) {
  const W = NUKE_WEIGHT;
  if (w % 5 === 0) {
    const list = [];
    for (let i = 0, esc = 1 + Math.floor(w / 5); i < esc; i++) list.push(i % 2 && w >= G.D.fastFrom ? 'fast' : 'basic');
    if (w >= Math.max(20, G.D.hunterFrom)) list[list.length - 1] = 'hunter';
    if (w >= 20) { list[0] = 'heavy'; list[2] = 'hunter'; }
    list.push('boss');
    return list.reduce((a, t) => a + W[t], 0);
  }
  const D = G.D, total = clamp(Math.round((3 + w + Math.floor(w / 2)) * D.count), 3, 24 + Math.floor(Math.max(0, w - 20) / 2));
  const { pf, ph, pu } = typeShares(w);
  return total * (ph * W.heavy + pf * W.fast + pu * W.hunter + Math.max(0, 1 - ph - pf - pu) * W.basic);
}
const nukeFresh = m => ({ meter: clamp(+m || 0, 0, 1), warnT: 0, flashT: -1e9, firing: false, used: 0, hinted: false, bossAcc: 0, bossWave: 0 });
G.nuke = nukeFresh(0);
const nukeReady = () => G.nuke.meter >= 0.9999;
const nukeSave = () => +G.nuke.meter.toFixed(4);
function nukeReset(saved) { G.nuke = nukeFresh(saved); } // startGame: new run or resume
function nukeOnKill(e) {
  const n = G.nuke;
  if (n.firing || G.phase === 'dying' || !G.player || !G.player.alive) return; // blast kills and kills while dying do not count
  n.meter = Math.min(1, n.meter + NUKE_WEIGHT[e.type] / (NUKE_WAVES * nukeWaveWeight(G.wave)));
}
const nukeIsBoss = e => e.isBoss === true || e.type === 'boss';
// a living boss that takes no damage now (intro, phase transition, death scene): no blast may start
const nukeBossSafe = () => G.enemies.some(e => !e.dead && nukeIsBoss(e) && (e.invuln || e.invulnerable));
// boss-stage charging: the boss agent calls this from the boss damage path with the damage applied to the boss body.
// 60% of max HP dealt fills the meter once; at most one charge per fight (per wave). The blast's own damage never counts.
function nukeOnBossDamage(e, amount) {
  const n = G.nuke;
  if (n.firing || !(amount > 0) || !e || !(e.maxHp > 0) || G.phase === 'dying' || !G.player || !G.player.alive) return;
  if (n.bossWave !== G.wave) { n.bossWave = G.wave; n.bossAcc = 0; }
  const room = 1 - n.bossAcc; if (room <= 0) return;
  const add = Math.min(room, amount / (NUKE_BOSS_FILL * e.maxHp));
  n.bossAcc += add; n.meter = Math.min(1, n.meter + add);
}
G.nukeOnBossDamage = nukeOnBossDamage; // also reachable for tests (module 19 is not edited here)
// every living enemy on the whole map (not only the visible screen); the name stays because the debug API reads it
const nukeOnScreen = () => G.enemies.filter(e => !e.dead);
// true when the warning started; says why not (hint) when the player asked for it by hand
function nukeFire(manual) {
  const n = G.nuke, p = G.player;
  if (G.state !== 'play' || G.phase !== 'fight' || !p || !p.alive || n.warnT > 0) return false;
  if (!nukeReady()) { if (manual) showHint('Nükleer bomba %' + Math.floor(n.meter * 100) + ' şarjlı, kill yaparak doldur', 2); return false; }
  if (!nukeOnScreen().length) { if (manual) showHint('Haritada düşman yok', 2); return false; }
  if (nukeBossSafe()) { if (manual) showHint('Boss şu an hasar almıyor', 2); return false; } // the charge is kept
  n.warnT = NUKE_WARN;
  hintT = 0; el.hint.classList.remove('show'); // the "ready" hint is done
  showBanner('NÜKLEER BOMBA', '', NUKE_WARN);
  Sound.nukeWarn(); vibrate([40, 60, 40, 60, 40]);
  return true;
}
// the boss damage and stun of a blast: the floor applies at the moment of the hit; the stun bonus (+50%) does not apply to it
function nukeApplyBoss(b, want) {
  const n = G.nuke, dmg = Math.min(want, b.hp - NUKE_BOSS_FLOOR * b.maxHp); // never lethal, never below the floor
  const st = b.stunT || 0; b.stunT = 0;
  n.firing = true; // blast damage does not charge the meter
  if (dmg > 0) hurtEnemy(b, dmg, b.x, b.y, 0); // enrage checks still run
  n.firing = false;
  b.stunT = Math.max(st, NUKE_BOSS_STUN);
}
const nukeInvuln = b => !!(b.invuln || b.invulnerable);
function nukeBlast() {
  const n = G.nuke, p = G.player;
  n.firing = true; n.used++;
  const mods = G.mods, drop = mods.drop; mods.drop = 0; // no pickup drops from blast kills
  for (const e of G.enemies.slice()) if (!e.dead && !nukeIsBoss(e)) killEnemy(e); // the whole map, on or off screen
  mods.drop = drop;
  for (const b of G.enemies.slice()) {
    if (b.dead || !nukeIsBoss(b)) continue;
    const want = nukeBossDmg(G.wave, b.maxHp);
    if (nukeInvuln(b)) { b.nukePending = { want: (b.nukePending ? b.nukePending.want : 0) + want }; continue; } // invulnerable now: applied when it ends
    nukeApplyBoss(b, want);
  }
  G.bullets = G.bullets.filter(q => q.owner === 0);
  if (typeof bossClearHazards === 'function') bossClearHazards();
  n.firing = false; n.meter = 0; n.hinted = false; n.flashT = G.time;
  const mx = G.map.w / 2, my = G.map.h / 2, R = Math.hypot(G.map.w, G.map.h) * 0.75; // shockwave from the arena centre reaches every corner
  addPart('ring', mx, my, 0, 0, 0.9, 30, R, 0, '255,244,214');
  addPart('ring', mx, my, 0, 0, 1.3, 20, R * 0.8, 0, '255,170,90');
  shake(16); Sound.nuke(); vibrate([80, 40, 160, 40, 260]);
}
function nukeUpdate(dt) {
  const n = G.nuke, p = G.player;
  for (const b of G.enemies) { // blast damage that waited for an invulnerable boss: applied when its invulnerability ends
    if (!b.dead && b.nukePending && !nukeInvuln(b)) { const w = b.nukePending.want; b.nukePending = null; nukeApplyBoss(b, w); }
  }
  if (n.warnT > 0) {
    if (G.phase !== 'fight' || !p.alive) n.warnT = 0; // wave ended or player died during the warning: the charge is kept
    else if ((n.warnT -= dt) <= 0) { n.warnT = 0; nukeBlast(); }
  } else if (bot.on && bot.nuke && G.phase === 'fight' && p.alive && nukeReady()) {
    if (nukeOnScreen().length >= 3 || G.enemies.some(e => !e.dead && nukeIsBoss(e) && !e.invuln && !e.invulnerable)) nukeFire();
  }
}
function nukeKey(e) {
  if (e.code !== 'KeyN' || e.ctrlKey || e.metaKey || e.altKey) return false;
  if (G.state === 'play' && !e.repeat) nukeFire(true);
  return G.state === 'play';
}
el.btnNuke.addEventListener('click', e => { Sound.init(); Sound.resume(); nukeFire(true); e.currentTarget.blur(); });
function nukeHud() {
  const n = G.nuke, st = n.warnT > 0 ? 'w' : nukeReady() && !nukeBossSafe() ? 'r' : 'c', pct = Math.floor(n.meter * 100);
  const key = st + pct;
  if (ui.nk === key) return;
  const stChanged = ui.nkSt !== st; ui.nk = key; ui.nkSt = st;
  el.btnNuke.style.setProperty('--p', (n.meter).toFixed(3));
  if (stChanged) {
    el.btnNuke.classList.toggle('ready', st !== 'c');
    el.btnNuke.classList.toggle('warn', st === 'w');
    el.btnNuke.setAttribute('aria-label', st === 'c' ? 'Nükleer bomba, %' + pct + ' şarjlı' : st === 'r' ? 'Nükleer bomba hazır' : 'Nükleer bomba başlıyor');
    measureHud();
    if (st === 'r' && !n.hinted && G.phase === 'fight') { n.hinted = true; showHint(input.touch ? 'Nükleer bomba hazır: düğmeye dokun' : 'Nükleer bomba hazır: N tuşuna bas', 3.5); }
  }
}
function drawNuke() {
  if (G.state !== 'play' && G.state !== 'paused') return;
  const n = G.nuke, w = view.w, h = view.h;
  if (n.warnT > 0) { // pulsing red edge, faster as the blast nears
    const k = 1 - n.warnT / NUKE_WARN, a = (0.28 + 0.2 * Math.sin(G.time * (14 + 10 * k))) * (0.6 + 0.4 * k);
    const gr = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.68);
    gr.addColorStop(0, 'rgba(224,50,30,0)'); gr.addColorStop(1, `rgba(224,50,30,${clamp(a, 0.05, 0.75).toFixed(3)})`);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
  }
  const f = (G.time - n.flashT) / NUKE_FLASH;
  if (f >= 0 && f < 1 && SET.effects !== 'low' && !REDUCED) { ctx.fillStyle = `rgba(255,255,255,${(0.95 * (1 - f) * (1 - f)).toFixed(3)})`; ctx.fillRect(0, 0, w, h); }
}

/* ================= bullets ================= */
// Sekme: reflect off the face of the steel tile the shell just entered, then step back out of it
function ricochet(b, px, py) {
  const m = G.map, c0 = Math.floor(px / T), r0 = Math.floor(py / T), c1 = Math.floor(b.x / T), r1 = Math.floor(b.y / T);
  let fx = c1 !== c0 && isWall(m.get(c1, r0)), fy = r1 !== r0 && isWall(m.get(c0, r1));
  if (!fx && !fy) { fx = c1 !== c0; fy = r1 !== r0; }
  if (fx) b.vx = -b.vx;
  if (fy) b.vy = -b.vy;
  b.x = px; b.y = py; b.bounced = true; b.bounce--; b.life = Math.max(b.life, 0.9); b.seenBy = null; b.hits = null;
  sparks(px, py, 5, '#cfe8ff', 180); Sound.bounce(volAt(px, py));
}
function updateBullets(dt) {
  const m = G.map, p = G.player;
  for (const b of G.bullets) {
    if (b.dead) continue;
    b.life -= dt; if (b.life <= 0) { b.dead = true; continue; }
    if (b.shT > 0) b.shT -= dt; // Ağır Topçu shell: hit flash
    if (TT.bulletStep(b, dt) || b.dead) continue; // hook (A): lob shells fly over everything and are moved by the trait
    b.dist += Math.hypot(b.vx, b.vy) * dt; // path length for packages A/B
    const steps = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * dt / 8));
    for (let k = 0; k < steps && !b.dead; k++) {
      const px = b.x, py = b.y;
      b.x += b.vx * dt / steps; b.y += b.vy * dt / steps;
      const v = m.at(b.x, b.y);
      if (isWall(v)) {
        if (v === BRICK && b.pierce) {
          // Delici mermi: damage each brick once and keep flying
          const i = Math.floor(b.y / T) * m.n + Math.floor(b.x / T);
          if (!b.bricks) b.bricks = [];
          if (!b.bricks.includes(i)) { b.bricks.push(i); hitTile(b, b.x, b.y); }
        } else if (v === STEEL && b.bounce > 0) { ricochet(b, px, py); continue; }
        else { hitTile(b, b.x, b.y); if (b.splash) blastAt(b, b.x, b.y, null); if (b.shell) topcuBoom(b, b.x, b.y); b.dead = true; break; } // b.shell: Ağır Topçu (11) bursts on a wall
      }
      if (b.owner === 0) {
        let hit = null;
        for (const e of G.enemies) {
          if (e.dead || (b.hits && b.hits.includes(e.id))) continue;
          const rr = e.r + b.r; if (dist2(b.x, b.y, e.x, e.y) < rr * rr) { hit = e; break; }
        }
        if (hit) {
          G.hits++;
          TT.bulletHit(b, hit); // hook (A): stun / knockback etc., before the shell is marked dead
          if (b.pierce || b.pn > 0) { (b.hits || (b.hits = [])).push(hit.id); if (!b.pierce) b.pn--; } else b.dead = true; // pn: a limited number of tank penetrations (Uclu)
          damageEnemy(hit, b);
          if (b.splash) blastAt(b, b.x, b.y, hit);
        } else if (G.boss && G.boss.kr && G.boss.kr.dec.length && krDecoyHit(b)) { if (!b.pierce) { b.dead = true; break; } } // Kırağı's ice copies (11f) take a shell and break
      } else if (p && p.alive) {
        const rr = p.r + b.r + (G.buffs.shield > 0 || p.shield1T > 0 ? 8 : 0);
        if (dist2(b.x, b.y, p.x, p.y) < rr * rr) { b.dead = true; if (b.shell) b.hitP = true; damagePlayer(b); if (b.shell) topcuBoom(b, b.x, b.y); }
      }
    }
  }
  for (const a of G.bullets) {
    if (a.dead || a.owner !== 0 || a.lob) continue; // lob shells fly above enemy shells
    for (const c of G.bullets) {
      if (c.dead || c.owner !== 1 || c.boss) continue; // boss shells are not shot down by the player's shells
      const rr = a.r + c.r + 3;
      if (c.shell) { // Ağır Topçu shell: 3 hits of any shell, whatever the damage (a piercing shell counts once per Topçu shell)
        if (dist2(a.x, a.y, c.x, c.y) < rr * rr && !(a.shot && a.shot.includes(c))) { shellHit(c, a); if (a.pierce) (a.shot || (a.shot = [])).push(c); else { a.dead = true; break; } }
        continue;
      }
      if (dist2(a.x, a.y, c.x, c.y) < rr * rr) { c.dead = true; if (!a.pierce) a.dead = true; sparks((a.x + c.x) / 2, (a.y + c.y) / 2, 8, '#fff0c0', 200); Sound.metal(volAt(a.x, a.y)); if (a.dead) break; }
    }
  }
  if (G.bullets.some(b => b.dead)) G.bullets = G.bullets.filter(b => !b.dead);
}

