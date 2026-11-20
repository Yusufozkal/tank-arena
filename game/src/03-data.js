/* ===== TANKS (data) ===== */
// Owner: package A (tank framework). D1/D2 only append entries.
// Tank tree (1.4): Standart -> wave 5 -> Ikiz / Nisanci / Makineli -> wave 10 -> two children each. Ids are ASCII.
// Weapon base per tank; the workshop cards scale it in playerSpec(). dps = dmg * shells / cool (derived, see playerSpec).
//   hpMul/speedMul/turnMul  multipliers on SPECS.player        dmg/cool/bSpeed/bR/bW/life/barrel  the weapon (life = shell flight time, s)
//   muzzles [{off, ang, rear?, dmgK?, pierceN?}]  barrel layout, shared by fireTank and drawTank (off = sideways px, ang = radians from the turret)
//   spread/pellets  random angle / shells per muzzle     zoom  camera factor (1 = normal)      mode  'shell' | 'lob' | 'flame'
//   tr  trait numbers (read by TT)     shape  barrel look (drawTank)     col  palette     botRange  autopilot preferred distance (px), undefined = Standart behaviour
//   stub  tier-2 entry that still clones its parent's weapon and look (D2's rayli / obus until they land)
const TANKS = {
  std: { name: 'Standart', tier: 0, parent: null, kids: ['ikiz', 'nisanci', 'makineli'], traitName: 'Dengeli', blurb: 'Dengeli başlangıç tankı.',
    hpMul: 1, speedMul: 1, turnMul: 1, dmg: 1, cool: 0.3, bSpeed: 660, bR: 4, bW: 6, life: 2.4, barrel: 26, shape: 'std', zoom: 1, mode: 'shell',
    muzzles: [{ off: 0, ang: 0 }], col: { body: '#3d86ad', dk: '#235b7b', hi: '#7cc0e2', acc: '#f2c14e' } },
  ikiz: { name: 'İkiz', tier: 1, parent: 'std', kids: ['uclu', 'cift'], traitName: 'Çift darbe', blurb: 'İki mermi aynı tanka birlikte isabet ederse tank 0,3 sn sersemler.',
    hpMul: 1, speedMul: 1, turnMul: 1, dmg: 0.42, cool: 0.3, bSpeed: 660, bR: 3.6, bW: 4.4, life: 2.4, barrel: 26, shape: 'twin', zoom: 1, mode: 'shell',
    muzzles: [{ off: -5, ang: 0 }, { off: 5, ang: 0 }], tr: { stun: 0.3, stunCd: 1.5, win: 0.12 }, botRange: 330,
    col: { body: '#2f9e8f', dk: '#1a6258', hi: '#7fd6c8', acc: '#ffe27a' } },
  nisanci: { name: 'Keskin Nişancı', tier: 1, parent: 'std', kids: ['rayli', 'obus'], traitName: 'Uzak görüş', blurb: 'Kamera geri çekilir, geniş alan görünür; mermisi hızlı ve güçlü, tankı yavaş.',
    hpMul: 1, speedMul: 0.9, turnMul: 0.9, dmg: 1.9, cool: 0.43, bSpeed: 900, bR: 4.5, bW: 5, life: 1.8, barrel: 34, shape: 'long', zoom: 0.82, mode: 'shell',
    muzzles: [{ off: 0, ang: 0 }], botRange: 250,
    col: { body: '#4a5bb0', dk: '#2b3670', hi: '#8f9de4', acc: '#ff9f43' } },
  makineli: { name: 'Makineli', tier: 1, parent: 'std', kids: ['alev', 'sarapnel'], traitName: 'Isınma', blurb: 'Sürekli ateşte atış hızı artar; çok ısınırsa namlu kızarır ve 1,5 sn soğur.',
    hpMul: 1, speedMul: 1, turnMul: 1, dmg: 0.95, cool: 0.16, bSpeed: 640, bR: 3.4, bW: 6.5, life: 2, barrel: 24, shape: 'mg', zoom: 1, mode: 'shell', spread: 0.04,
    muzzles: [{ off: 0, ang: 0 }], tr: { heatUp: 0.04, heatDown: 0.5, cd: 1.5, rateGain: 0.8 }, botRange: 260,
    col: { body: '#6bb23a', dk: '#3e6e1f', hi: '#a9de7a', acc: '#ff5a36' } }
};
// Tier-2 stubs for D1 / D2: right name, tier, parent, blurb, trait name and palette; weapon, muzzles and look are the parent's until D1 / D2 replace the call
function stubTank(id, parent, o) { TANKS[id] = Object.assign(JSON.parse(JSON.stringify(TANKS[parent])), { kids: [], stub: true }, o); }
TANKS.uclu = { name: 'Üçlü', tier: 2, parent: 'ikiz', kids: [], traitName: 'Delici orta mermi', blurb: 'Üç mermilik yelpaze; ortadaki mermi bir tankı delip arkasındakine gider.',
  hpMul: 1, speedMul: 1, turnMul: 1, dmg: 0.27, cool: 0.3, bSpeed: 660, bR: 3.6, bW: 4.6, life: 2.4, barrel: 26, shape: 'tri', zoom: 1, mode: 'shell',
  muzzles: [{ off: 0, ang: -0.2, len: 23 }, { off: 0, ang: 0, len: 30, pierceN: 1 }, { off: 0, ang: 0.2, len: 23 }], botRange: 340, // D1: dps 1.2 x Standart (3 shells of 0.4 per 0.3 s)
  col: { body: '#1f7f93', dk: '#124a58', hi: '#6cc6d9', acc: '#ff8fd0' } };
TANKS.cift = { name: 'Çift Yön', tier: 2, parent: 'ikiz', kids: [], traitName: 'İtici arka namlu', blurb: 'Arkaya da ateş eder (arka mermi %80 hasar); her atışta tank ileri hızlanır, geri tepme yok.',
  hpMul: 1, speedMul: 1, turnMul: 1, dmg: 0.67, cool: 0.3, bSpeed: 660, bR: 3.8, bW: 5, life: 2.4, barrel: 26, shape: 'duo', zoom: 1, mode: 'shell', kick: 0,
  muzzles: [{ off: 0, ang: 0 }, { off: 0, ang: Math.PI, rear: true, dmgK: 0.8, len: 21 }], tr: { push: 0.6, pushK: 0.3, impulse: 70 }, botRange: 300, // D1: dps 1.1 x Standart (1.8 shells of 0.61 per 0.3 s)
  col: { body: '#35b07a', dk: '#1d6c48', hi: '#86e0b4', acc: '#fff0a0' } };
// D2 (Keskin Nisanci branch): full entries, same table as above. dps vs Standart (3.33): rayli 4.5 / 1.08 = 4.17 (x1.25), obus 4 / 1.09 = 3.67 (x1.1, per target in the blast)
TANKS.rayli = { name: 'Raylı Top', tier: 2, parent: 'nisanci', kids: [], traitName: 'Lazer çizgisi',
  blurb: 'Lazer çizgisi merminin yolunu gösterir; hızlı mermi tuğlayı ve tankı deler, çeliği delemez (Sekme varsa seker).',
  hpMul: 0.95, speedMul: 0.9, turnMul: 0.9, dmg: 2.6, cool: 0.85, bSpeed: 1100, bR: 3.8, bW: 4.2, life: 1.3, barrel: 42, shape: 'rail', zoom: 0.82, mode: 'shell',
  muzzles: [{ off: 0, ang: 0 }], tr: { pierce: true, zap: true }, botRange: 300,
  col: { body: '#3578d8', dk: '#1b4687', hi: '#86b4f4', acc: '#7ef0ff' } };
TANKS.obus = { name: 'Obüs', tier: 2, parent: 'nisanci', kids: [], traitName: 'Mesafe ayarı',
  blurb: 'Nişan çubuğu ne kadar itilirse mermi o kadar uzağa, duvarın üstünden düşer ve alanda patlar.',
  hpMul: 1, speedMul: 0.8, turnMul: 0.9, dmg: 3.5, cool: 0.8, bSpeed: 380, bR: 5.2, bW: 9.5, life: 3, barrel: 24, shape: 'obus', zoom: 0.8, mode: 'lob', range: 12 * T, kick: 1,
  muzzles: [{ off: 0, ang: 0 }], tr: { area: 70, edge: 0.5, blastK: 0.25, vFly: 380, tMin: 0.35, minD: 2.5, maxD: 12, hgt: 34 }, botRange: 300,
  col: { body: '#6f7f35', dk: '#414c1c', hi: '#a9ba6a', acc: '#ffd24a' } };
TANKS.alev = { name: 'Alev Topu', tier: 2, parent: 'makineli', kids: [], traitName: 'Alev perdesi', blurb: 'Kısa menzilli sürekli alev (2,6 kare); düşman mermilerini yakar, vurduğu tank 3 sn yanar. Komutan yarı hızda yanar.',
  hpMul: 1, speedMul: 1, turnMul: 1, dmg: 0.87, cool: 0.2, bSpeed: 600, bR: 4, bW: 7, life: 0.2, range: 125, barrel: 22, shape: 'flame', zoom: 1, mode: 'flame',
  muzzles: [{ off: 0, ang: 0 }], tr: { range: 125, half: 0.3, direct: 0.65, burnK: 0.35, burn: 3, bossK: 0.5 }, botRange: 140, // D1: dps 1.3 x Standart at range (65% direct, 35% burn)
  col: { body: '#e0801f', dk: '#8a4a0c', hi: '#f5b868', acc: '#fff2a0' } };
TANKS.sarapnel = { name: 'Şarapnel', tier: 2, parent: 'makineli', kids: [], traitName: 'Geri itme', blurb: 'Yedi saçma atar; yakından (2 kare) vurduğu tankları geri iter, ağırları pek oynatamaz.',
  hpMul: 1, speedMul: 1, turnMul: 1, dmg: 0.36, cool: 0.5, bSpeed: 620, bR: 2.7, bW: 6.5, life: 0.42, barrel: 22, shape: 'bell', zoom: 1, mode: 'shell', spread: 0.32, pellets: 7,
  muzzles: [{ off: 0, ang: 0 }], tr: { kb: 60, kbRange: 105, kbMax: 420 }, botRange: 150, // D1: dps 1.5 x Standart with all 7 pellets, about 0.4 far away
  col: { body: '#3f8c3a', dk: '#235a20', hi: '#82c47c', acc: '#e8e0b0' } };
for (const id in TANKS) TANKS[id].id = id;
const TANK_IDS = Object.keys(TANKS);
const tankShells = tk => tk.muzzles.reduce((a, m) => a + (m.dmgK || 1), 0) * (tk.pellets || 1);
const tankRange = tk => tk.range || tk.bSpeed * tk.life;
const needTier = w => (w >= 10 ? 2 : w >= 5 ? 1 : 0); // the tank tier the player should have reached at wave w (debt rule)
/* ===== TANKS end ===== */

const ICON_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6"/><path d="M18.3 6.3a8 8 0 0 1 0 11.4"/></svg>';
const ICON_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';

/* ===== SYNERGY ===== */
// Owner: package B (synergies). Two cards together unlock one extra effect. All numbers are here (the balance package tunes them).
// Hooks called from shared code: synFlags (fireTank), synDmg (damageEnemy), synTaken (damagePlayer), synRegen / synRegenGlow (regen), synPickup (applyPickup),
// synTrack (updatePlay, player movement bookkeeping), splashFor (blastAt), synBadgeHTML (cardHTML), synUnlocked (chooseUpgrade).
const SYN_K = {
  bbR: 1.6,        // Seken patlama: blast radius factor for the first hit of a shell that has ricocheted
  movNeed: 3,      // Hareketli onarım: seconds of driving (mvT) before the bonus starts
  movCap: 4,       // mvT ceiling, so a short stop does not lose the bonus at once
  movDecay: 1.5,   // mvT falls this fast (per second) while standing still
  movRate: 2,      // Onarım robotu rate factor once mvT >= movNeed
  farMax: 0.4,     // Uzak vuruş: bonus damage at full distance
  farDist: 12,     // ... reached at this many tiles of flight
  ambMul: 2,       // Pusu: damage factor against an enemy that does not see the player or sits in a bush
  ambCd: 2,        // ... at most once per enemy per this many seconds
  ambHunt: 1.5,    // Avcı counts as unaware when it last saw the player longer ago than this
  fortMul: 0.75,   // Kale: damage taken while standing still and firing
  fortStill: 20,   // ... standing still means speed below this (px/s)
  fortFire: 0.4,   // ... and a shot within this many seconds
  chainAdd: 3      // Zincir: seconds added to every other active power-up on a pickup
};
const synPct = x => Math.round(x * 100);
const SYN = [
  { id: 'bb', name: 'Seken patlama', a: 'ricochet', b: 'blast', desc: `Duvardan seken mermi, ilk isabetinde %${synPct(SYN_K.bbR - 1)} daha geniş alanda patlar` },
  { id: 'mov', name: 'Hareketli onarım', a: 'engine', b: 'repair', desc: `${SYN_K.movNeed} sn hareket edersen Onarım robotu ${SYN_K.movRate} kat hızlı çalışır` },
  { id: 'far', name: 'Uzak vuruş', a: 'caliber', b: 'barrel', desc: `Mermi uzağa gittikçe daha sert vurur, en çok +%${synPct(SYN_K.farMax)} hasar` },
  { id: 'amb', name: 'Pusu', a: 'thermal', b: 'caliber', desc: `Seni görmeyen ya da çalıdaki düşmana ilk isabet ${SYN_K.ambMul} kat hasar verir` },
  { id: 'fort', name: 'Kale', a: 'armor', b: 'loader', desc: `Durup ateş ederken aldığın hasar %${synPct(1 - SYN_K.fortMul)} azalır` },
  { id: 'chain', name: 'Zincir', a: 'magnet', b: 'boost', desc: `Güçlendirme alınca etkin diğerleri ${SYN_K.chainAdd} sn uzar` }
];
const synOnS = (sy, up = G.up) => ((up[sy.a] | 0) > 0) && ((up[sy.b] | 0) > 0);
const synOn = id => synOnS(SYN.find(x => x.id === id));
const synList = (up = G.up) => SYN.filter(sy => synOnS(sy, up));
function synFlags(b) { // player shells only; read later by synDmg / splashFor
  if (b.owner !== 0) return;
  b.bb = synOn('bb'); b.far = synOn('far'); b.ambush = synOn('amb');
}
// Splash settings for the blast of shell b (called once per blast from blastAt): Seken patlama widens the first blast of a ricocheted shell
function splashFor(b) {
  const sp = b.splash;
  if (!sp || !b.bb || !b.bounced || b.bbDone) return sp;
  b.bbDone = true;
  addPart('ring', b.x, b.y, 0, 0, 0.4, 8, sp.r * SYN_K.bbR * 3.6, 0, '150,215,255');
  addText(b.x, b.y - 26, 'SEKEN PATLAMA', '#9fd8ff', 14);
  return { r: sp.r * SYN_K.bbR, k: sp.k };
}
// Pusu: the enemy has not noticed the player (or hides in a bush)
const synUnaware = e => e.type === 'hunter' ? (e.hidden || G.time - e.seenT > SYN_K.ambHunt) : (e.hidden || !e.canSee);
function synDmg(b, e) { // damage multiplier for a player shell hitting enemy e
  if (b.owner !== 0) return 1;
  let m = 1;
  if (b.far && !b.lob && !b.flame) m *= 1 + SYN_K.farMax * Math.min(1, b.dist / (SYN_K.farDist * T));
  if (b.ambush && synUnaware(e) && G.time - (e.ambT === undefined ? -99 : e.ambT) >= SYN_K.ambCd) {
    e.ambT = G.time; m *= SYN_K.ambMul;
    addText(e.x, e.y - 30, 'PUSU', '#ff8a5c', 17);
  }
  return m;
}
function synTaken(b) { // damage multiplier for a shell hitting the player
  const p = G.player;
  if (p && p.still && synOn('fort')) {
    addPart('ring', p.x, p.y, 0, 0, 0.3, p.r, p.r + 16, 0, '170,190,210');
    return SYN_K.fortMul;
  }
  return 1;
}
// Per-frame player bookkeeping: mvT (seconds of driving, falls when idle, zeroed by a hit) and still (standing and shooting)
function synTrack(p, dt) {
  const sp = Math.hypot(p.vx, p.vy);
  if (p.hurtT !== p.synHurt) { p.synHurt = p.hurtT; p.mvT = 0; }
  p.mvT = sp > 50 ? Math.min(SYN_K.movCap, (p.mvT || 0) + dt) : Math.max(0, (p.mvT || 0) - SYN_K.movDecay * dt);
  p.still = sp < SYN_K.fortStill && G.time - p.lastShot < SYN_K.fortFire;
}
const synMoving = p => (p.mvT || 0) >= SYN_K.movNeed && synOn('mov');
function synRegen(p) { return synMoving(p) ? SYN_K.movRate : 1; } // multiplier on the Onarım robotu rate
const synRegenGlow = p => synMoving(p) ? 'pu_speed' : 'pu_repair';
function synPickup(kind) { // Zincir: every other active power-up grows
  if (!synOn('chain')) return;
  let n = 0;
  for (const k of BUFFS) if (k !== kind && G.buffs[k] > 0) { G.buffs[k] += SYN_K.chainAdd; G.buffMax[k] += SYN_K.chainAdd; n++; }
  if (n) { const p = G.player; addText(p.x, p.y - 46, 'Zincir +' + SYN_K.chainAdd + ' sn', '#7fd0ff', 15); addPart('ring', p.x, p.y, 0, 0, 0.45, 10, 90, 0, '127,208,255'); }
}
// Workshop: a card shows a synergy block only for synergies whose partner the player already owns (picking the card completes them); none otherwise
function synBadgeHTML(k) {
  if (upL(k)) return '';
  const done = SYN.filter(sy => (sy.a === k || sy.b === k) && upL(sy.a === k ? sy.b : sy.a) > 0);
  if (!done.length) return '';
  return `<span class="up-syn on">${done.map(sy => `<b>Birleşim: ${sy.name}</b><i>${sy.desc}</i>`).join('')}</span>`;
}
// chooseUpgrade: before = ids active before the card, returns the new ones; the banner is shown by the caller's phase delay
function synUnlocked(before) { return synList().filter(sy => !before.includes(sy.id)); }
function synChipsHTML() { return synList().map(sy => `<div class="syn-row"><b>${sy.name}</b><span>${sy.desc}</span></div>`).join(''); }
function renderSynList(wrap, list) { const h = synChipsHTML(); $(list).innerHTML = h; $(wrap).classList.toggle('hidden', !h); }

