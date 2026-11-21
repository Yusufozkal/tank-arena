"""Builds the Tank Arena website (Turkish) into site/ from game/index.html, tools/gamedata.json and the images in site/img.

Run: SITE_URL=https://tank-arena-taupe.vercel.app python3 tools/build_site.py
Also writes vercel.json, .vercelignore and README.md at the repository root.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import paths as P  # noqa: E402

SITE = str(P.SITE)
D = json.load(open(P.TOOLS / 'gamedata.json', encoding='utf-8'))
VERSION = P.app_version()  # android/AndroidManifest.xml versionName
OLD_APKS = ['TankArena-1.2.apk', 'TankArena-1.2.1.apk', 'TankArena-1.3.apk', 'TankArena-1.4.apk', 'TankArena-1.4.1.apk', 'TankArena-1.5.apk', 'TankArena-1.5.1.apk', 'TankArena-1.5.2.apk', 'TankArena-1.5.3.apk', 'TankArena-1.5.4.apk']  # earlier file names; their links on this site now lead to the newest APK
APK = f'TankArena-{VERSION}.apk'
BASE = os.environ.get('SITE_URL', '').rstrip('/')  # absolute origin for link previews, filled in once the address is known
REPO = 'https://github.com/Yusufozkal/tank-arena'
apk_kb = os.path.getsize(P.REPO / APK) / 1024  # android/build.sh copies each release to the repo root
APK_SIZE = f'{apk_kb / 1024:.1f}'.replace('.', ',') + ' MB'

# ---------- the game page: same game as the APK, but fonts come from the shared /fonts files and the script
# lives in its own hashed file (game.<hash>.js), so the page is small and the CSP can forbid inline scripts ----------
import glob, hashlib, base64
game = open(P.GAME, encoding='utf-8').read()
gfont = re.search(r'<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2[^"]*">', game)
assert gfont, 'google fonts links not found'
game = game[:gfont.start()] + '<link rel="preload" href="/fonts/stencil-latin.woff2" as="font" type="font/woff2" crossorigin>\n<link rel="stylesheet" href="/fonts/fonts.css">' + game[gfont.end():]
assert 'fonts.googleapis' not in game and 'fonts.gstatic' not in game
i, j = game.index('<script>'), game.rindex('</script>')
assert game.count('<script>') == 1
js = game[i + len('<script>'):j]
jhash = hashlib.sha256(js.encode('utf-8')).hexdigest()[:10]
for old in glob.glob(f'{SITE}/oyna/game.*.js'): os.remove(old)
os.makedirs(f'{SITE}/oyna', exist_ok=True)
open(f'{SITE}/oyna/game.{jhash}.js', 'w', encoding='utf-8').write(js)
game = game[:i] + f'<script src="/oyna/game.{jhash}.js"></script>' + game[j + len('</script>'):]
head_extra = f'''<meta name="description" content="Tank Arena: dalga dalga gelen düşman tanklarına karşı ayakta kal, her dalgadan sonra tankını yükselt.">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" type="image/png" sizes="32x32" href="/img/favicon-32.png">
<link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Tank Arena">
<meta property="og:title" content="Tank Arena">
<meta property="og:description" content="Tarayıcıda hemen oyna: dalga dalga gelen tanklara karşı ayakta kal.">
<meta property="og:image" content="{BASE}/img/og.jpg">
'''
assert game.count('<title>Tank Arena</title>') == 1
game = game.replace('<title>Tank Arena</title>', '<title>Tank Arena</title>\n' + head_extra)
os.makedirs(f'{SITE}/oyna', exist_ok=True)
open(f'{SITE}/oyna/index.html', 'w', encoding='utf-8').write(game)
# the APK stays at the repo root: players download it from GitHub, Vercel never serves it
APK_URL = f'{REPO}/raw/main/{APK}'

manifest = {
    'name': 'Tank Arena', 'short_name': 'Tank Arena', 'lang': 'tr',
    'description': 'Dalga dalga gelen düşman tanklarına karşı ayakta kal.',
    'start_url': '/oyna/', 'scope': '/oyna/', 'display': 'fullscreen', 'orientation': 'any',
    'background_color': '#262a1d', 'theme_color': '#262a1d',
    'icons': [
        {'src': '/img/icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
        {'src': '/img/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
        {'src': '/img/icon-maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}
    ]
}
json.dump(manifest, open(f'{SITE}/manifest.webmanifest', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# ---------- page fragments built from the game data ----------
def pu_icon(k):
    P, I = D['PU'][k], D['ICONS'][k]
    paint = (f'fill="none" stroke="{P["col"]}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"'
             if I.get('stroke') else f'fill="{P["col"]}"')
    return (f'<svg viewBox="-16 -16 32 32" aria-hidden="true"><circle r="13.5" fill="#1d2015" stroke="{P["col"]}" stroke-width="2.5"/>'
            f'<path d="{I["d"]}" {paint}/></svg>')

pus = '\n'.join(f'<li>{pu_icon(k)}<b>{v["name"]}</b><span>{v["note"]}</span></li>' for k, v in D['PU'].items())
ups = '\n'.join(
    f'<li{" class=rare" if u["rare"] else ""}><span class="ico"><svg class="ico-svg" viewBox="0 0 24 24" aria-hidden="true">{u["svg"]}</svg></span>'
    f'<b>{u["name"]}</b><span>{u["brief"]}{", nadir" if u["rare"] else ""}</span><span class="lv">{str(u["max"]) + " seviye" if u["max"] > 1 else "Tek parça"}</span></li>'
    for u in D['UPS'].values())
FOES = [
    ('basic', 'Standart tank', 'basic', '2 isabet. Mesafesini koruyup ateş eder.'),
    ('fast', 'Keşif tankı', 'fast', '1 isabet. Çok hızlıdır, üzerine doğru gelir. 4. dalgadan sonra gelir.'),
    ('heavy', 'Ağır tank', 'heavy', '5 isabet. İri mermisi çok can yakar. 7. dalgadan sonra gelir.'),
    ('hunter', 'Avcı', 'hunter', '3 isabet. Mermilerden kaçar ama uzaktan gelen mermiden kaçamaz; vurulunca saklanır. 12. dalgadan sonra gelir.'),
    ('tamirci', 'Tamirci', 'tamirci', '3 isabet. Silahı yok; yaralı tankları onarır, bozuk parçalarını düzeltir. 13. dalgadan sonra gelir. Önce onu vur.'),
    ('boss-komutan', 'Komutan', 'boss', 'Ana boss. 5, 15, 25 ve 35. dalgada kendi arenasında gelir. Üç evresi ve komuta kulesi var, her gelişinde yeni saldırılar açar.'),
    ('boss-sari', 'Sarı Fırtına', 'boss', 'Keşif tankının boss\'u, 10. dalgada. Kırmızı çizgi boyunca hücum eder; çeliğe çarparsa sersemler.'),
    ('boss-demirkok', 'Demirkök', 'boss', 'Ağır tankın boss\'u, 20. dalgada Orman Kalesi\'nde. Üç mevziye kök salıp kale gibi savaşır; kök fışkırtarak geçici kök duvarları örer.'),
    ('boss-kiragi', 'Kırağı', 'boss', 'Donmuş Göl\'de saklanan, suretler bırakıp ayazla yeri donduran Kar bölgesi bossu. 30. dalgada gelir.'),
    ('topcu', 'Ağır Topçu', 'topcu', 'Namlusu parlayınca yavaş, dev bir mermi atan; mermisi 3 isabetle havada patlatılabilen Kar topçusu. 23. dalgadan sonra gelir.'),
    ('boss-kapatici', 'Kapatıcı', 'boss', 'Yalnızca Serbest Mod\'da. Çok zeki ama hile yapmaz: gördüğünü ve duyduğunu bilir, kaçış yolunu keser, savaşta alışkanlığını öğrenir. Her saldırıdan sonra bir saniye tam hasar alır; 90. saniyeden sonra arena kapanır.'),
]
foes = '\n'.join(f'<li class="foe-{c.split()[-1]}"><img src="/img/{k if k.startswith("boss-") else "tank-" + k}.png" width="128" height="128" alt="" loading="lazy"><b>{n}</b><span>{t}</span></li>' for k, n, c, t in FOES)

TK = D['TANKS']
def tank_card(i):
    t = TK[i]
    line = t['blurb'] if t['blurb'].lower().startswith(t['traitName'].lower()) else f'{t["traitName"]}: {t["blurb"]}'
    return (f'<li class="tk tier{t["tier"]}"><img src="/img/tank-{i}.png" width="128" height="128" alt="" loading="lazy">'
            f'<b>{t["name"]}</b><span>{line}</span></li>')
tree = '<ul class="tk-root">' + tank_card('std').replace('<li class="tk tier0">', '<li class="tk tier0">') + '</ul>\n<div class="tk-branches">\n' + '\n'.join(
    '<div class="tk-branch"><ul class="tk-one">' + tank_card(i) + '</ul><ul class="tk-two">' + ''.join(tank_card(k) for k in [c for c in TK if TK[c]['parent'] == i]) + '</ul></div>'
    for i in TK if TK[i]['parent'] == 'std') + '\n</div>'
syns = '\n'.join(f'<li><b>{x["aName"]} + {x["bName"]} = {x["name"]}</b><span>{x["desc"]}</span></li>' for x in D['SYN'])

STEEL = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E"
         "%3Crect width='40' height='40' fill='%23585c56'/%3E%3Crect x='1.5' y='1.5' width='37' height='36' rx='1.5' fill='%23a4a7a0'/%3E"
         "%3Crect x='1.5' y='34.5' width='37' height='3' fill='%237b7f78'/%3E%3Crect x='6' y='6' width='28' height='24' fill='none' stroke='%238a8e87' stroke-width='1.6'/%3E"
         "%3Cpath d='M6 6l28 24M34 6L6 30' stroke='%238a8e87' stroke-width='1.6'/%3E"
         "%3Cg fill='%23707470'%3E%3Ccircle cx='4.2' cy='4.2' r='1.1'/%3E%3Ccircle cx='35.8' cy='4.2' r='1.1'/%3E%3Ccircle cx='4.2' cy='32' r='1.1'/%3E%3Ccircle cx='35.8' cy='32' r='1.1'/%3E%3C/g%3E%3C/svg%3E")

og_url = f'{BASE}/img/og.jpg' if BASE else '/img/og.jpg'
page = f'''<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Tank Arena: tarayıcıda ve Android'de tank oyunu</title>
<meta name="description" content="Dalga dalga gelen düşman tanklarına karşı ayakta kal, her dalgadan sonra tankını atölyede yükselt. Tarayıcıda hemen oyna ya da Android APK'sını indir.">
<meta name="theme-color" content="#262a1d">
<link rel="icon" type="image/png" sizes="32x32" href="/img/favicon-32.png">
<link rel="icon" type="image/png" sizes="48x48" href="/img/favicon-48.png">
<link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:locale" content="tr_TR">
<meta property="og:title" content="Tank Arena">
<meta property="og:description" content="Dalga dalga gelen düşman tanklarına karşı ayakta kal. Tarayıcıda hemen oyna ya da Android'e indir.">
<meta property="og:image" content="{og_url}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
{f'<meta property="og:url" content="{BASE}/">' if BASE else ''}
<meta name="twitter:card" content="summary_large_image">
<link rel="preload" href="/fonts/stencil-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/fonts/fonts.css">
<style>
:root{{
  color-scheme:dark;
  /* the game's own field kit: olive drab, bone stencil markings, signal yellow only for the action that matters */
  --olive:#262a1d;--olive-2:#323827;--olive-3:#1d2015;
  --bone:#efe7d2;--bone-2:rgba(239,231,210,.74);--line:rgba(239,231,210,.16);
  --signal:#f2c14e;--on-signal:#1f2216;--ally:#5fb4dd;--hostile:#e0533a;
  --sand:#d6c294;--sand-ink:#2a2c1f;--sand-ink-2:rgba(42,44,31,.78);
  --display:"Big Shoulders Stencil",Impact,"Arial Narrow",sans-serif;
  --ui:"Barlow Condensed","Roboto Condensed","Arial Narrow",sans-serif;
  --wrap:min(1080px,100% - 40px);
}}
*{{box-sizing:border-box;margin:0;padding:0}}
html{{background:var(--olive);-webkit-text-size-adjust:100%}}
body{{color:var(--bone);font-family:var(--ui);font-weight:500;font-size:20px;line-height:1.42;-webkit-font-smoothing:antialiased}}
img{{display:block;max-width:100%;height:auto}}
a{{color:inherit}}
:focus-visible{{outline:2px solid var(--bone);outline-offset:3px;border-radius:2px}}
.wrap{{width:var(--wrap);margin-inline:auto}}
.steel{{height:40px;background:url("{STEEL}") 0 0/40px 40px repeat-x}}
h2{{font-family:var(--display);font-weight:800;font-size:clamp(40px,8.4vw,64px);line-height:.95;letter-spacing:.005em;text-wrap:balance}}
.lead{{max-width:58ch;color:var(--bone-2);margin-top:14px;text-wrap:pretty}}
section{{padding:72px 0}}

/* buttons: one yellow action per place, the download beside it */
.acts{{display:flex;flex-wrap:wrap;gap:12px;margin-top:26px;max-width:640px}}
.acts .btn{{flex:1 1 auto}}
.btn{{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:58px;padding:0 26px;border-radius:4px;
  font-weight:700;font-size:23px;line-height:1;text-decoration:none;white-space:nowrap;transition:filter .15s,background-color .15s}}
.btn small{{font-weight:600;font-size:17px;opacity:.75}}
.btn-play{{background:var(--signal);color:var(--on-signal)}}
.btn-apk{{border:2px solid rgba(239,231,210,.55);color:var(--bone)}}
.btn svg{{width:22px;height:22px;flex:none}}
@media (hover:hover){{.btn-play:hover{{filter:brightness(1.08)}}.btn-apk:hover{{background:rgba(239,231,210,.08)}}}}
.note{{margin-top:14px;font-size:17px;color:var(--bone-2)}}

/* hero: the live arena behind a bottom sheet, the same way the game lays out its own menu */
.hero{{position:relative;min-height:min(92svh,980px);display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;isolation:isolate}}
.hero picture,.hero picture img{{position:absolute;inset:0;width:100%;height:100%}}
.hero picture{{z-index:-2}}
.hero picture img{{object-fit:cover;object-position:50% 18%}}
.hero::before{{content:"";position:absolute;inset:0;z-index:-1;
  background:linear-gradient(to top,var(--olive) 40%,rgba(38,42,29,.9) 57%,rgba(38,42,29,.42) 79%,rgba(38,42,29,.12))}}
.hero .wrap{{padding:0 0 46px}}
h1{{font-family:var(--display);font-weight:900;font-size:clamp(92px,27vw,196px);line-height:.8;letter-spacing:-.005em}}
h1 span{{display:block}}
.hero p.pitch{{max-width:30ch;margin-top:18px;font-size:23px;line-height:1.3;font-weight:600;text-wrap:balance}}
@media (min-aspect-ratio:1/1) and (min-width:760px){{
  .hero{{justify-content:center;min-height:min(88vh,860px)}}
  .hero picture img{{object-position:70% 50%}}
  .hero::before{{background:linear-gradient(to right,var(--olive) 26%,rgba(38,42,29,.82) 44%,rgba(38,42,29,.2) 72%,rgba(38,42,29,.05))}}
  .hero .wrap{{padding:60px 0}}
}}

/* workshop */
.split{{display:grid;gap:40px}}
.ws-tanks{{display:flex;gap:14px;margin-top:28px}}
.ws-tanks figure{{flex:1;max-width:190px;padding:14px 10px 12px;border-radius:6px;background:var(--sand);color:var(--sand-ink);text-align:center}}
.ws-tanks img{{width:112px;margin:0 auto;filter:drop-shadow(3px 4px 0 rgba(70,45,15,.38))}}
.ws-tanks figcaption{{margin-top:6px;font-size:17px;font-weight:700;line-height:1.15}}
.ws-tanks figcaption span{{display:block;font-weight:500;color:var(--sand-ink-2)}}
.phone{{justify-self:center;width:min(330px,82vw);border:9px solid #12140d;border-radius:30px;overflow:hidden;background:#12140d}}
.phone img{{border-radius:21px}}
.grid3{{list-style:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px 10px;margin-top:34px}}
.grid3 li{{display:flex;flex-direction:column;align-items:center;gap:5px;text-align:center;line-height:1.15}}
.grid3 b{{font-weight:700;font-size:19px}}
.grid3 span{{font-size:16px;color:var(--bone-2)}}
.ups .ico{{width:48px;height:48px;display:grid;place-items:center;border-radius:4px;background:rgba(0,0,0,.28);color:var(--bone);margin-bottom:3px}}
.ups .ico svg{{width:28px;height:28px}}
.ups li.rare .ico{{color:var(--signal)}}
.ups .lv{{font-size:15px;opacity:.85}}
.ico-svg{{fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}}
.pus{{max-width:760px}}
.pus svg{{width:50px;height:50px;margin-bottom:3px}}
@media (min-width:860px){{
  .split{{grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);align-items:start;gap:56px}}
  .phone{{position:sticky;top:30px}}
  .grid3.ups{{grid-template-columns:repeat(4,minmax(0,1fr))}}
}}

/* tank tree: Standart, then the three tier-1 tanks, then each one's two children, on sand cards like the workshop figures */
.tk-root,.tk-one,.tk-two{{list-style:none}}
.tk{{display:grid;grid-template-columns:72px 1fr;grid-template-rows:auto auto;column-gap:12px;align-items:center;padding:10px 12px;border-radius:6px;background:var(--sand);color:var(--sand-ink);line-height:1.2}}
.tk img{{grid-row:1/3;width:72px;filter:drop-shadow(2px 3px 0 rgba(70,45,15,.38))}}
.tk b{{font-weight:700;font-size:21px;align-self:end}}
.tk span{{font-size:17px;line-height:1.25;color:var(--sand-ink-2);align-self:start}}
.tk-root{{max-width:420px;margin:34px auto 0;position:relative}}
.tk-branches{{display:grid;gap:26px;margin-top:26px}}
.tk-branch{{display:grid;gap:8px;position:relative}}
.tk-one .tk{{outline:2px solid var(--signal);outline-offset:-2px}}
.tk-two{{display:grid;grid-template-columns:1fr;gap:8px;margin-left:26px;padding-left:14px;border-left:3px solid var(--line)}}
.tk-two .tk{{background:#c3b07f}}
.syn{{list-style:none;display:grid;gap:14px;margin-top:20px;max-width:760px}}
.syn li{{display:flex;flex-direction:column;gap:2px;padding-left:14px;border-left:3px solid var(--signal)}}
.syn b{{font-weight:700;font-size:21px;line-height:1.15}}
.syn span{{color:var(--bone-2);font-size:18px;line-height:1.3}}
.tk-h3{{font-family:var(--display);font-weight:800;font-size:clamp(28px,6vw,38px);line-height:1;margin-top:56px}}
.nuke{{margin-top:20px;max-width:62ch;padding:16px 18px;border-left:3px solid var(--hostile);background:rgba(224,83,58,.09);border-radius:0 4px 4px 0}}
.nuke b{{font-weight:700}}
@media (min-width:860px){{
  .tk-branches{{grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;align-items:start}}
  .tk{{grid-template-columns:64px 1fr}}
  .tk img{{width:64px}}
  .syn{{grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 30px;max-width:none}}
}}

/* the arena floor: enemies stand on sand, as they do in the first waves */
.ground{{background:var(--sand);color:var(--sand-ink);
  background-image:radial-gradient(circle at 18% 30%,rgba(120,92,50,.16) 0 3px,transparent 4px),radial-gradient(circle at 72% 64%,rgba(120,92,50,.14) 0 2.5px,transparent 3.5px),radial-gradient(circle at 46% 82%,rgba(120,92,50,.12) 0 2px,transparent 3px);
  background-size:170px 170px,230px 230px,130px 130px}}
.ground .lead{{color:var(--sand-ink-2)}}
.foes{{list-style:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:30px 18px;margin-top:36px}}
.foes li{{display:flex;flex-direction:column;align-items:flex-start;gap:4px}}
.foes img{{width:104px;filter:drop-shadow(4px 5px 0 rgba(70,45,15,.34))}}
.foes .foe-boss img{{width:150px}}
.bossshot{{margin:34px auto 0;max-width:300px;border:9px solid #12140d;border-radius:30px;overflow:hidden;background:#12140d}}
.bossshot img{{border-radius:21px}}
.foes b{{font-weight:700;font-size:22px;line-height:1.1}}
.foes span{{font-size:18px;line-height:1.3;color:var(--sand-ink-2)}}
@media (min-width:860px){{.foes{{grid-template-columns:repeat(4,minmax(0,1fr))}}}}

/* controls */
.ctl{{display:grid;gap:30px;margin-top:30px}}
.ctl h3{{font-weight:700;font-size:24px;line-height:1.1;margin-bottom:10px}}
.ctl dl{{display:grid;grid-template-columns:auto 1fr;gap:8px 18px}}
.ctl dt{{font-weight:700;color:var(--signal)}}
.ctl dd{{color:var(--bone-2)}}
.wide{{margin-top:38px;border-radius:10px;overflow:hidden;border:1px solid var(--line)}}
.cap{{margin-top:10px;font-size:17px;color:var(--bone-2)}}
@media (min-width:860px){{.ctl{{grid-template-columns:1fr 1fr;gap:48px}}}}

/* install */
.steps{{list-style:none;counter-reset:s;display:grid;gap:18px;margin-top:30px;max-width:62ch}}
.steps li{{counter-increment:s;display:grid;grid-template-columns:44px 1fr;gap:14px;align-items:start}}
.steps li::before{{content:counter(s);display:grid;place-items:center;width:44px;height:44px;border-radius:50%;border:2px solid var(--signal);color:var(--signal);font-weight:700;font-size:22px;line-height:1}}
.steps p{{padding-top:7px}}
.ios{{margin-top:30px;max-width:62ch;padding:18px 20px;border-left:3px solid var(--ally);background:rgba(95,180,221,.08);border-radius:0 4px 4px 0}}
.ios b{{font-weight:700}}

footer{{padding:0 0 40px;color:var(--bone-2);font-size:17px}}
footer .wrap{{display:flex;flex-wrap:wrap;gap:8px 24px;justify-content:space-between;padding-top:26px}}
footer a{{text-underline-offset:3px}}
@media (prefers-reduced-motion:reduce){{.btn{{transition:none}}}}
</style>
</head>
<body>

<header class="hero">
  <picture>
    <source media="(min-aspect-ratio: 1/1) and (min-width: 760px)" srcset="/img/play-wide.jpg">
    <img src="/img/play-phone.jpg" width="720" height="1558" alt="Tank Arena oyunundan bir an: mavi oyuncu tankı, kırmızı düşman tankları, tuğla ve çelik duvarlar">
  </picture>
  <div class="wrap">
    <h1><span>TANK</span><span>ARENA</span></h1>
    <p class="pitch">Dalga dalga gelen düşman tanklarına karşı ayakta kal. Her dalgadan sonra atölyede tankını yükselt.</p>
    <div class="acts">
      <a class="btn btn-play" href="/oyna/">Hemen oyna</a>
      <a class="btn btn-apk" href="{APK_URL}"><svg viewBox="0 0 24 24" class="ico-svg" aria-hidden="true"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/></svg>Android için indir <small>APK, {APK_SIZE}</small></a>
    </div>
    <p class="note">Tarayıcıda kurulum gerekmez. Telefonda da bilgisayarda da oynanır.</p>
  </div>
</header>
<div class="steel" aria-hidden="true"></div>

<section id="atolye">
  <div class="wrap split">
    <div>
      <h2>Her dalgadan sonra atölye</h2>
      <p class="lead">Dalga bitince üç kart gelir, birini seçersin. Seçtiğin parça tankına takılır ve oyun sonuna kadar kalır. Aynı kartı yeniden seçtikçe seviyesi artar. Bir boss'u yendiğin dalganın sonunda nadir bir kart mutlaka çıkar. Zırhın azsa kartlardan biri acil onarım olur.</p>
      <div class="ws-tanks">
        <figure><img src="/img/tank-player.png" width="128" height="128" alt="Yükseltmesiz oyuncu tankı"><figcaption>İlk dalga<span>Çıplak tank</span></figcaption></figure>
        <figure><img src="/img/tank-player-upgraded.png" width="128" height="128" alt="Zırh plakaları, egzoz ve anten takılmış oyuncu tankı"><figcaption>Yükseltilmiş<span>Parçalar görünür</span></figcaption></figure>
      </div>
      <ul class="grid3 ups" aria-label="Yükseltmeler">
{ups}
      </ul>
    </div>
    <div class="phone"><img src="/img/workshop-phone.jpg" width="720" height="1558" alt="Atölye ekranı: üç yükseltme kartı" loading="lazy"></div>
  </div>
</section>

<section id="tank-agaci">
  <div class="wrap">
    <h2>Tank ağacı</h2>
    <p class="lead">Standart tankla başlarsın. 5. dalgadaki Komutan'ı yenince bir dal seçersin, 10. dalgadaki Sarı Fırtına'dan sonra dal ikiye ayrılır. Toplam on tank, her birinin tek bir imza özelliği var ve hepsi kendiliğinden çalışır.</p>
{tree}
    <h3 class="tk-h3">Birleşimler</h3>
    <p class="lead">İki kart birlikte takılınca yeni bir etki açılır. Atölye, kartın elindeki hangi parçayla birleşebileceğini gösterir.</p>
    <ul class="syn" aria-label="Birleşimler">
{syns}
    </ul>
    <h3 class="tk-h3">Nükleer bomba</h3>
    <p class="nuke"><b>Nükleer bomba:</b> düşman öldürdükçe sayaç dolar, dolunca düğme yanar. Kısa bir uyarıdan sonra bütün harita vurulur ve düşmanlar yok olur. Bosslara sabit, ağır bir hasar verir ama öldürmez (canları en az %10'da kalır); onları sersemletir.</p>
  </div>
</section>

<section class="ground" id="dusmanlar">
  <div class="wrap">
    <h2>Karşına çıkacaklar</h2>
    <p class="lead">Harita 35×35, sahada aynı anda en fazla 6 düşman olur. Düşman türleri sırayla gelir: önce Standart tank, sonra Keşif, Ağır, Avcı ve 13. dalgadan Tamirci. Çalıya saklanırsan seni kaybederler ve son gördükleri yeri ararlar. Düşman mermileri seninkilerden farklı renktedir, kolay ayırt edersin.</p>
    <p class="lead">Düşmanı yeterince vurursan parçaları bozulur: yandan vurursan paleti, önden vurursan namlusu, arkadan vurursan motoru. Kısa süre sonra onarır. Bir boss'u yenince onun türü bir daha gelmez: Sarı Fırtına'dan sonra Keşif tankları, Demirkök'ten sonra Ağır tanklar ve Tamirciler, Kırağı'dan sonra Avcılar ve Ağır Topçular.</p>
    <ul class="foes">
{foes}
    </ul>
  </div>
</section>

<section id="guclendirmeler">
  <div class="wrap">
    <h2>Dokuz güçlendirme</h2>
    <p class="lead">Vurduğun tanklardan güçlendirme düşer, üzerinden geçince etkisi başlar. Yeni olanlar ilk dalgalarda sırayla açılır.</p>
    <ul class="grid3 pus" aria-label="Güçlendirmeler">
{pus}
    </ul>
  </div>
</section>

<section id="tek-savas">
  <div class="wrap">
    <h2>Boss savaşları</h2>
    <p class="lead">Boss dalgalarında oyun kendi etabına geçer: sahada yalnızca boss ve sen varsınız, arena boss'a göre tasarlanmıştır. Üstte büyük bir can çubuğu görünür. Boss saldırmadan önce uyarır; çelik bloklar seni korur. Yeterince vurursan boss'un paleti ve namlusu da kırılır. Serbest Mod'da tankını, kartlarını ve hedefini kendin seçip istediğin bossla ya da dalgayla oynayabilirsin.</p>
    <div class="bossshot"><img src="/img/boss-phone.jpg" width="720" height="1558" alt="Sarı Fırtına boss savaşı: üstte büyük boss can çubuğu, sarı boss tankı ve mavi oyuncu tankı" loading="lazy"></div>
    <p class="lead">Herkes aynı kurallarla oynar, rekorlar tek listede tutulur.</p>
  </div>
</section>

<section id="kontroller">
  <div class="wrap">
    <h2>Nasıl oynanır</h2>
    <div class="ctl">
      <div>
        <h3>Telefonda</h3>
        <dl>
          <dt>Sol başparmak</dt><dd>Tankı sür.</dd>
          <dt>Sağ başparmak</dt><dd>Sürükleyip nişan al ve ateş et. Kısa dokunuş en yakın düşmana ateş eder.</dd>
          <dt>Telefonu çevir</dt><dd>Oyun dikeyde de yatayda da oynanır.</dd>
        </dl>
      </div>
      <div>
        <h3>Bilgisayarda</h3>
        <dl>
          <dt>WASD, oklar</dt><dd>Tankı sür.</dd>
          <dt>Fare</dt><dd>Nişan al, tıklayarak ya da boşlukla ateş et.</dd>
          <dt>1, 2, 3</dt><dd>Atölyede kart seç.</dd>
          <dt>P, Esc</dt><dd>Duraklat. M sesi kapatır.</dd>
        </dl>
      </div>
    </div>
    <figure class="wide"><img src="/img/play-wide.jpg" width="1400" height="647" alt="Telefon yan çevrilmişken oyun: solda zırh ve dalga bilgisi, iki başparmak çubuğu" loading="lazy"></figure>
    <p class="cap">Telefon yan çevrildiğinde oyun ekranı yataya geçer.</p>
  </div>
</section>

<section id="kurulum">
  <div class="wrap">
    <h2>Android'e kurulum</h2>
    <ol class="steps">
      <li><p><b>Android için indir</b> düğmesine dokun.</p></li>
      <li><p>İnen TankArena dosyasını aç. Telefon izin isterse tarayıcın için <b>bu kaynaktan yüklemeye izin ver</b> seçeneğini aç.</p></li>
      <li><p><b>Yükle</b>'ye dokun. Yeni sürümler eskisinin üzerine kurulur, rekorların silinmez.</p></li>
    </ol>
    <p class="ios"><b>iPhone'da:</b> APK yalnızca Android'de çalışır. Oyunu Safari'de aç, Paylaş menüsünden <b>Ana Ekrana Ekle</b>'yi seç. Tank Arena ana ekrandan uygulama gibi tam ekran açılır.</p>
    <div class="acts">
      <a class="btn btn-play" href="/oyna/">Hemen oyna</a>
      <a class="btn btn-apk" href="{APK_URL}"><svg viewBox="0 0 24 24" class="ico-svg" aria-hidden="true"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/></svg>Android için indir <small>APK, {APK_SIZE}</small></a>
    </div>
  </div>
</section>

<footer>
  <div class="steel" aria-hidden="true"></div>
  <div class="wrap">
    <span>Tank Arena {VERSION}</span>
    <a href="{REPO}">Kaynak kodu GitHub'da</a>
  </div>
</footer>

</body>
</html>
'''
open(f'{SITE}/index.html', 'w', encoding='utf-8').write(page)

style_blocks = re.findall(r'<style>(.*?)</style>', page, re.S)
assert len(style_blocks) == 1
style_hash = base64.b64encode(hashlib.sha256(style_blocks[0].encode('utf-8')).digest()).decode()
COMMON = "base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests"
LANDING_CSP = f"default-src 'none'; style-src 'self' 'sha256-{style_hash}'; font-src 'self'; img-src 'self' data:; {COMMON}"
GAME_CSP = f"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; manifest-src 'self'; {COMMON}"
csp = lambda v: [{'key': 'Content-Security-Policy', 'value': v}]
cache = lambda v: [{'key': 'Cache-Control', 'value': v}]
vercel = {
    '$schema': 'https://openapi.vercel.sh/vercel.json',
    'outputDirectory': 'site',  # the repo also holds sources and tools; only the built site goes live
    'headers': [
        {'source': '/(.*)', 'headers': [
            {'key': 'X-Content-Type-Options', 'value': 'nosniff'},
            {'key': 'X-Frame-Options', 'value': 'DENY'},
            {'key': 'Referrer-Policy', 'value': 'strict-origin-when-cross-origin'},
            {'key': 'Permissions-Policy', 'value': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'},
            {'key': 'Cross-Origin-Opener-Policy', 'value': 'same-origin'},
            {'key': 'Cross-Origin-Resource-Policy', 'value': 'same-origin'}]},
        {'source': '/', 'headers': csp(LANDING_CSP)},
        {'source': '/index.html', 'headers': csp(LANDING_CSP)},
        {'source': '/oyna', 'headers': csp(GAME_CSP)},
        {'source': '/oyna/(.*)', 'headers': csp(GAME_CSP)},
        {'source': '/fonts/(.*)', 'headers': cache('public, max-age=31536000, immutable')},
        {'source': '/oyna/game.(.*).js', 'headers': cache('public, max-age=31536000, immutable')},
        {'source': '/img/(.*)', 'headers': cache('public, max-age=604800, stale-while-revalidate=86400')},
        {'source': '/manifest.webmanifest', 'headers': cache('public, max-age=86400')}
    ],
    # old links to the APK on this site keep working, but the file itself comes from GitHub
    'redirects': [{'source': f'/{name}', 'destination': APK_URL, 'permanent': False} for name in [APK] + OLD_APKS]
}
json.dump(vercel, open(P.REPO / 'vercel.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
open(P.REPO / '.vercelignore', 'w').write('# only site/ is published; sources, tools and APKs stay out of the deployment\n'
                                        '*.apk\nREADME.md\nCLAUDE.md\ngame/\ntools/\nandroid/\ntests/\ndocs/\n.tmp/\n')

readme = f'''# Tank Arena

Dalga dalga gelen düşman tanklarına karşı ayakta kaldığın, her dalgadan sonra tankını atölyede yükselttiğin bir tank oyunu.

- **Tarayıcıda oyna:** `/oyna/`
- **Android:** [{APK}]({APK_URL}) (indirme GitHub üzerinden)

## Klasörler

| Yol | İçerik |
|---|---|
| `game/src/` | Oyunun kaynağı: HTML iskeleti, CSS ve sıralı JS modülleri; harita `docs/MODULES.md` |
| `game/index.html` | Oyun, tek dosya (site ve APK bundan üretilir); `tools/build_game.py` üretir, elle düzenlenmez |
| `site/` | Yayındaki site (Vercel yalnızca bu klasörü yayınlar), `tools/build_site.py` üretir |
| `android/` | Android uygulamasının kaynağı ve `build.sh` |
| `{APK}` | Android uygulaması (Vercel'e yüklenmez, GitHub'dan iner) |
| `tools/` | Siteyi, görselleri ve oyun verisini üreten araçlar |
| `tests/` | Tarayıcıda çalışan oyun testleri ve denge ölçümü |
| `docs/` | Yol haritası, denge bulguları, yayın ve güvenlik notları |
| `CLAUDE.md` | Claude Code için proje kılavuzu |
| `vercel.json` | Güvenlik başlıkları, önbellek kuralları, eski APK bağlantıları için yönlendirme |

Site statik dosyalardan oluşur; `main` dalına her gönderimde Vercel `site/` klasörünü yayınlar.
'''
open(P.REPO / 'README.md', 'w', encoding='utf-8').write(readme)
print('site written', 'BASE=' + (BASE or '(relative)'), APK_SIZE)
