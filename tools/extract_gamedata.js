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

const out = { PU: {}, ICONS: T.ICONS, UPS: {} };
for (const k in T.PU) out.PU[k] = { name: T.PU[k].name, col: T.PU[k].col, note: T.PU[k].note };
for (const k in T.UPS) if (!T.UPS[k].extra) out.UPS[k] = { name: T.UPS[k].name, max: T.UPS[k].max, rare: !!T.UPS[k].rare, brief: T.UPS[k].brief, svg: T.UPS[k].svg };

fs.writeFileSync(path.join(__dirname, 'gamedata.json'), JSON.stringify(out, null, 1));
console.log('gamedata.json:', Object.keys(out.PU).length, 'power-ups,', Object.keys(out.UPS).length, 'cards,');
