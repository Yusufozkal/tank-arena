// Copies the power-up, workshop-card and difficulty tables out of game/index.html into tools/gamedata.json,
// which tools/build_site.py uses for the landing page. Run it after changing those tables:
//   node tools/extract_gamedata.js
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(REPO, 'game', 'index.html'), 'utf8');

function slice(from, to) {
  const a = html.indexOf(from), b = html.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error(`marker not found in game/index.html: "${from}" … "${to}"`);
  return html.slice(a, b);
}

// PU through UPS (the helpers in between come along)
const code = slice('const PU = {', 'const UP_KEYS');
const T = new Function('Path2D', 'G', 'fmt', 'bountyPts', `${code}\nreturn { PU, ICONS, UPS };`)(class {}, {}, x => x, () => 0);

// TANKS and SYN: plain data, in their own slices (outside PU..UP_KEYS). Weapon numbers are not exported; the table also holds Math.PI,
// the T constant and the stubTank helper, so those come in as arguments / are evaluated with the slice.
const tankCode = slice('const TANKS = {', 'for (const id in TANKS)');
const synCode = slice('const SYN_K = {', 'const synOnS');
const TK = new Function('T', `${tankCode}\nreturn TANKS;`)(48);
const SY = new Function(`${synCode}\nreturn SYN;`)();

const out = { PU: {}, ICONS: T.ICONS, UPS: {}, TANKS: {}, SYN: [] };
for (const id in TK) out.TANKS[id] = { name: TK[id].name, tier: TK[id].tier, parent: TK[id].parent, traitName: TK[id].traitName, blurb: TK[id].blurb };
for (const sy of SY) out.SYN.push({ id: sy.id, name: sy.name, a: sy.a, b: sy.b, aName: T.UPS[sy.a] ? T.UPS[sy.a].name : T.PU[sy.a].name, bName: T.UPS[sy.b] ? T.UPS[sy.b].name : T.PU[sy.b].name, desc: sy.desc });
for (const k in T.PU) out.PU[k] = { name: T.PU[k].name, col: T.PU[k].col, note: T.PU[k].note };
for (const k in T.UPS) if (!T.UPS[k].extra) out.UPS[k] = { name: T.UPS[k].name, max: T.UPS[k].max, rare: !!T.UPS[k].rare, brief: T.UPS[k].brief, svg: T.UPS[k].svg };

fs.writeFileSync(path.join(__dirname, 'gamedata.json'), JSON.stringify(out, null, 1));
console.log('gamedata.json:', Object.keys(out.PU).length, 'power-ups,', Object.keys(out.UPS).length, 'cards,', Object.keys(out.TANKS).length, 'tanks,', out.SYN.length, 'synergies');
