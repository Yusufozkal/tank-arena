# Oyun kaynağı: modül haritası

`game/index.html` **üretilir**; elle düzenleme. Kaynak `game/src/` içinde: `shell.html` (HTML, iki işaret satırı `/*@@CSS@@*/` ve `/*@@JS@@*/`), `style.css` ve sıralı JS modülleri `NN-ad.js` (araya girenler `NNa-ad.js`: `11a`, `11b`, `11c`, `15a`, `15b`; `build_game.py` bunları `NN-` dosyalarından sonra, sonraki numaradan önce birleştirir). Hepsi tek `(() => { 'use strict'; ... })()` içine birleşir, yani modüller aynı kapsamı paylaşır: `import` yok, bir modüldeki üst düzey ad sonraki (ve çağrı anında önceki) modüllerden doğrudan kullanılır. Sıra önemlidir: `const` tanımları kullanılmadan önce çalışmalıdır.

## Nasıl çalışılır

1. `game/src/` içindeki ilgili dosyayı düzenle (yalnızca o modülü ve bu haritayı oku).
2. `python3 tools/build_game.py` ile `game/index.html` dosyasını yeniden üret.
3. `python3 tools/build_game.py --check` geçmeli (aksi halde 1 döner); commit'e `game/src/` ve üretilen `game/index.html` birlikte girer. Site için ardından `tools/build_site.py`.
4. Yeni modül gerekirse `NN-ad.js` olarak ekle (iki haneli sıra öneki; numara kaydırmamak için `NNa-ad.js` de olur) ve bu tabloyu güncelle. Kod satırlarını bölgeler arasında taşımak sıra bağımlılığını bozabilir; testleri koş.

## Modüller

| Dosya | Satır | İçerik: ana ad ve işlevler | En çok dayandığı | Testler |
|---|---|---|---|---|
| `01-core.js` | 27 | IIFE açılışı, `DEBUG`, `REDUCED`, yardımcılar: `clamp rand randInt pick angDiff turnTo dist2 shuffle mulberry32 fmt store vibrate rrect` | yok | hepsi |
| `02-constants.js` | 143 | `T` (karo türleri), `THEMES` (haritalar), `SPECS` (düşman tipleri, canlar), `bossHp`, `PU` (güçlendirmeler), `ICONS`, `BUFFS`, `firepower`, `UPS` (atölye kartları), `UP_KEYS` | 01 | `check_gameplay`, `balance_*` |
| `03-data.js` | 160 | `TANKS` (10 oyuncu tankı), `TANK_IDS`, `tankShells`, `needTier`; birleşimler `SYN_K`, `SYN`, `synOn`, `synFlags`, `synDmg`, `synTaken`, `synRegen`, `synChipsHTML` | 02 | `check_tanks`, `check_syn` |
| `04-platform.js` | 122 | `RULES` (tek kural seti), `SET`/`saveSettings`, `REC`/`loadRecords`, `SPR` sprite önbelleği (`glowSprite`, `dustSprite`), `Sound` (WebAudio) | 01 | `check_gameplay` |
| `05-state.js` | 86 | DOM önbelleği `el`, `canvas`, oyun durumu `G`, `parts`, `dbg`, `view`/`cam`, `resize`, `computeView`, `clampCam`, `toWorld`, `shake`, `onScreen` | 01, 02 | `check_hud_mobile` |
| `06-map.js` | 250 | Harita üretimi `generate`, `makeArena`, katman çizimi `buildLayer`, `buildMini`, zemin/tuğla/çelik/su çizimleri, `addDecals`, `STAMPS` | 02, 05 | `check_gameplay`, `check_crosshair` |
| `07-paths-tanks.js` | 186 | Yol bulma `dijkstra`, `computeFlow`, `computeSneakyFlow`, `los`; tank nesnesi `makeTank`, `moveTank`, `collideWalls`, `trackUpdate`, `playerSpec`, `refreshPlayer`, `fireTank` | 02, 03, 05 | `check_tanks`, `check_gameplay` |
| `08-traits.js` | 281 | Tank imzaları `TT` (sersemletme, ısınma, lazer, alev, geri itme, çift yön...), `ciftTick`, `flameTick`, `sarapnelHit`, `tickStatus`, `separateTanks` | 03, 07 | `check_tanks`, `check_tier2_d1`, `check_tier2_d2` |
| `09-combat-fx.js` | 206 | Parçacık, yazı, efekt (`addPart`, `explode`, `addText`); isabet ve hasar (`hitTile`, `hurtEnemy`, `damageEnemy`, `killEnemy`, `damagePlayer`, `killPlayer`); pickup'lar (`dropPickup`, `applyPickup`); hava saldırısı | 02, 03, 05 | `check_gameplay`, `stress` |
| `10-nuke-bullets.js` | 166 | Nükleer bomba (`NUKE_*`, `nukeFire`, `nukeBlast`, `nukeUpdate`, `nukeHud`, `drawNuke`), mermiler `ricochet`, `updateBullets` | 09 | `check_nuke` |
| `11-enemies.js` | ~340 | Dalga zorluğu `waveMods`, `buildRoster`, doğuş `spawnEnemy`, `updateEnemy`, kaçınma/siper, Avcı (zeki tank) `updateHunter`; parça hasarı (normal düşman): `PART_T` (süreler), `partBreak` (yöne göre palet/namlu/motor), `partTick`, `partWorld`; `e.pt` durumu | 02, 07, 09 | `check_gameplay`, `balance_probe` |
| `11a-boss-core.js` | ~370 | Boss altyapısı: `themeFor` (10 dalgalık bölgeler), `ARENAS`/`parseArena`/`loadArena` (21×21 metin haritası), boss tablosu `BOSS_DEFS`/`BOSS_ON`/`bossDefAt`, `spawnBoss`, `updateBoss` (evreler, parçalar, sersemleme, saldırı makinesi: generator'lar), uyarı sistemi `addTele`/`release`/`TELE_MIN`, `bossDanger` (bot için tehlike haritası), `bossClearHazards`, `bossHurt` (parça, +%50 sersem, `nukeOnBossDamage` kancası), boss parça hasarı `BT`, `initBossParts`, `bossPartHit`, `bossPartTick`, `cancelAttack`, `barrelSilent` (palet canı ve 4 sn durma, namlu sessizliği; `BOSS_DEFS.<id>.barrels`, saldırıda `mov: true`), hasar görünümü, ölüm sahnesi, giriş sahnesi `startBossStage`/`bossIntroTick`; Boss başına kancalar: `def.tick`, `def.danger`, `def.onClear`, `def.drawGround`. | 07, 09, 11 | `check_boss`, `boss_probe` |
| `11b-boss-komutan.js` | ~130 | Komutan: saldırılar (`komTriple`, `komCharge`, `komMortar`, `komSalvo`, `komBombard`, `komPenta`, `komShock`), `BOSS_DEFS.komutan` (açılış dalgaları `unlocks`, kule parçası, orta namlu `barrels`, ezme `mov`) | 11a | `check_boss`, `boss_probe` |
| `11c-boss-sari.js` | ~200 | Sarı Fırtına: arena `ARENAS.kum` (Kum Çukuru), saldırılar (`sariShots` çevik atış, `sariRush` tek hücum, `sariCharge`/`sariDouble`/`sariTriple`), kum şeritleri, rüzgâr, `sariTick` (boss başına kare kancası), `BOSS_DEFS.sari`, kayıt `BOSS_ON[10] = 'sari'` | 11a | `check_sari`, `boss_probe` |
| `12-input-player.js` | 166 | Girdi (`input`, `keys`, `mouse`, çubuklar, `autoTarget`), `bot` durum nesnesi, `updatePlayer`, afiş/ipucu (`showBanner`, `showHint`) | 05, 07 | `check_hud_buttons`, `check_crosshair` |
| `13-flow.js` | 366 | Oyun akışı: `startGame`, `nextWave`, `waveCleared`, atölye (`rollUpgrades`, `chooseUpgrade`), evrim (`chooseTank`, `tankCardHTML`), `gameOver`, menü ve alt sayfalar, `applySettings`, `bindUI`, rehber, `pauseGame` | 02, 03, 11 | `check_gameplay`, `check_tanks` |
| `14-update-hud.js` | 120 | `update(dt)` sabit adım, `updatePlay`, `updateCamera`, HUD `ui`, `updateHUD` | 09–13 | `check_hud_mobile`, `check_gameplay` |
| `15-render-world.js` | 330 | `render()`, su/iz/portal çizimi, `barrel`, `hullMarks`, `turretMarks`, `drawTank` (kırık palet, eğri namlu), `repairRing`, `drawFrost`, `drawThermal` | 03, 05, 06 | `check_gameplay`, `stress` |
| `15a-boss-render.js` | ~150 | `drawBoss`/`drawKomutan` (büyük Komutan), uyarı çizimi `drawTele` (çizgi, daire, halka), düşen parçalar `drawPieces`, boss parça hasarı `drawBossPartDamage` (kırık palet, tutuk namlu, onarım halkası) | 11a, 15 | `check_boss` |
| `15b-render-sari.js` | ~130 | `drawSari` (ok biçimli gövde, egzozlar, kum hortumu `sariWhirl`), `drawSariGround` (kum şeritleri, rüzgâr okları) | 11c, 15a | `check_sari` |
| `16-render-ui.js` | 291 | Hava saldırısı, çalılık, tank efektleri, `drawBullets`, `drawLocks`, `drawIndicators`, `drawCrosshair`/`syncAimCursor`, çubuklar, `drawVignette`, `drawMini` (mini harita) | 05, 15 | `check_crosshair`, `check_hud_mobile` |
| `17-loop.js` | 13 | `frame(now)`: `update` + `render` + `requestAnimationFrame` | 14–16 | hepsi |
| `18-bot.js` | ~95 | Otomatik pilot `autopilot(dt)`, boss etabı pilotu `bossAutopilot` (tehlike haritası `botDanger`, en yakın güvenli kare `botBfs`), evrim seçimi `botPick` (`bot` nesnesi 12'de); boss'ta hücum çizgisinde yandan atış, kırık paletli boss'un arkasına geçme | 12, 13 | `balance_probe`, `stress` |
| `19-debug.js` | 62 | `if (DEBUG)` içinde `window.__tank` API'si (`bossFight`, `bossInfo`, `bossSkip`, `hurtBoss`, `sim`, `step`, `wave`, `give`, `spawn`, `killAll`, `choices`, `choose`, tank/birleşim/nuke grupları) | hepsi | bütün testler |
| `20-boot.js` | 35 | `window.tankBack` (Android), `hot` anlık görüntü, `boot`, yeniden boyutlama dinleyicileri, IIFE kapanışı | 05, 13 | `check_offline_apk` |

CSS `style.css` (telefon HUD'u `@media (max-width:520px),(max-height:520px)` bloğunda), HTML iskeleti `shell.html`.

## Nerede bakmalı

- **Denge** (düşman canı, hız, dalga): `02-constants.js` (`SPECS`, `bossHp`, `firepower`, `UPS`, `PU`), `11-enemies.js` (`waveMods`, `buildRoster`), `04-platform.js` (`RULES`). Ölçüm: `balance_probe.py` + `balance_report.py`.
- **Parça hasarı**: normal düşman `11-enemies.js` (`PART_T`, `partBreak` `damageEnemy`'den çağrılır (09), `partTick` `tickStatus`'tan (08)); boss `11a-boss-core.js` (`BT`); çizim `15-render-world.js` / `15a-boss-render.js`; duman `SPR.smokeK` (04). Test: `check_parts.py`.
- **Düşmanlar ve Avcı**: `11-enemies.js`; öldürme/hasar `09-combat-fx.js`.
- **Boss etabı ve Komutan**: altyapı `11a-boss-core.js` (yeni boss = `BOSS_DEFS.<id>` + `BOSS_ON[dalga]` + `ARENAS.<ad>`; boss başına kancalar: `def.tick(e, dt)` her kare, `def.danger(e, x, y, pad)` bot tehlike haritası, `def.onClear(e)` tehlikeler silinince, `def.drawGround(e, ctx)` zemin katmanı), Komutan `11b-boss-komutan.js`, Sarı Fırtına `11c-boss-sari.js` + `15b-render-sari.js` (test `check_sari.py`), can tablosu `BOSS_HP_AT`/`bossHp` (02), çizim `15a-boss-render.js`, bot `bossAutopilot` (18), ölçüm `tests/boss_probe.py`, kontrol `tests/check_boss.py`.
- **Çizim**: dünya `15-render-world.js`, mermi/nişangâh/mini harita `16-render-ui.js`, harita katmanı `06-map.js`, sprite önbelleği `04-platform.js`.
- **Telefon HUD**: `style.css` medya bloğu, `shell.html` işaretleme, `updateHUD` (14), `measureHud`/`resize` (05). Test: `check_hud_mobile.py`, `check_hud_buttons.py`.
- **Nükleer bomba**: `10-nuke-bullets.js` (`NUKE_*`); `nukeReset` ve `nukeSave` akışta (13/20). Test: `check_nuke.py`.
- **Kart birleşimleri**: `03-data.js` (`SYN`, `SYN_K`, `synFlags`, `synDmg`); etkileri `09-combat-fx.js` ve `07-paths-tanks.js` içinde `syn*` çağrıları. Test: `check_syn.py`.
- **Tank evrimi**: `TANKS` (03), `chooseTank`/`tankCardHTML`/`evoDue` (13), imzalar `TT` (08), ateş `fireTank` (07). Testler: `check_tanks.py`, `check_tier2_*.py`.
- **Bot**: `bot` nesnesi (12), `autopilot`/`botPick` (18); test yardımcıları `window.__tank` içinde (19).
- **Debug API**: `19-debug.js` (yalnızca `#debug` adresinde).
- **Atölye kartları ve menü**: `UPS` (02), `rollUpgrades`/`chooseUpgrade`/`bindUI` (13).
