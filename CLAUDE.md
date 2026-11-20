# Tank Arena: Claude Code kılavuzu

Kullanıcıyla Türkçe konuş. Oyunun bütün arayüz metinleri Türkçedir; kod, yorumlar ve commit gövdeleri İngilizce ya da Türkçe olabilir, başlıklar Türkçe.

## Proje

- Dalga dalga gelen düşman tanklarına karşı oynanan 2D tank oyunu. Her dalgadan sonra atölyede bir kart seçilir; güçlendirmeler, tank evrimi, kart birleşimleri, nükleer bomba, Komutan (boss) ve Avcı (zeki tank) var.
- Canlı site: https://tank-arena-taupe.vercel.app (oyun `/oyna/`). Android APK GitHub'dan iner.
- Kaynak `game/src/`: HTML iskeleti, CSS ve sıralı JS modülleri. `tools/build_game.py` bunları tek dosya `game/index.html`'e birleştirir (canvas + WebAudio, framework ve npm yok). Site ve APK `game/index.html`'den üretilir.
- **Modül haritası `docs/MODULES.md`:** hangi dosyada ne var, hangi iş için nereye bakılır.
- Yol haritası ve kullanıcının verdiği kararlar `docs/ROADMAP.md` içinde. Yeni işe başlamadan önce oku. Boss ve parça hasarı şartnamesi `docs/BOSSES.md` (kaynak: Claude'daki "Tank Arena: Boss mekanikleri" belgesi).

## Çalışma biçimi

Kullanıcının istekleri (19–20 Kasım 2026): işin çoğunu alt ajanlar yapar; her ajan bir işe odaklanır, projeyi baştan taramaz.

- Ana oturum planlar ve böler, ajanlara ayrıntılı görev verir, dönen değişiklikleri ve raporları kontrol eder. **Kodu** (`game/src/`, `tools/`, `tests/`, `android/`) ajanlar düzenler; ana oturum bulduğu kod sorununu ajana geri gönderir. **Belgeleri** (`docs/`, `CLAUDE.md`) ana oturum kendisi düzenler; belge işi için ajan açılmaz.
- Ajan görevinde rolü, okunacak modülleri ve koşulacak testleri yaz. Ajan önce `docs/MODULES.md`'yi, sonra yalnızca görevin modüllerini okur. Üretilen `game/index.html` okunmaz; büyük dosyalar baştan sona okunmaz (grep, ilgili bölüm).
- Roller:

| Rol | Model | Okuduğu yer | Testler |
|---|---|---|---|
| Denge | Sonnet | `02-constants`, `11-enemies`, `04-platform` (`RULES`), `docs/BALANCE.md` | `balance_probe` + `balance_report`, `check_gameplay` |
| Düşman ve boss | Sonnet | `11-enemies`, `11a-boss-core`, boss modülleri (`11b`, `11c`…), `09-combat-fx`, `02-constants`; çizim `15a`/`15b`…; şartname `docs/BOSSES.md` | `check_boss`, `check_sari`, `check_demirkok`, `check_parts`, `check_region`, `boss_probe`, `check_gameplay`, `stress` |
| Tank, kart, birleşim, bomba | Sonnet | `03-data`, `07-paths-tanks`, `08-traits`, `10-nuke-bullets` | `check_tanks`, `check_tier2_*`, `check_syn`, `check_nuke` |
| Çizim ve efekt | Sonnet | `15-render-world`, `16-render-ui`, `06-map`, `04-platform` (sprite) | `check_gameplay`, `check_crosshair`, ekran görüntüsü |
| Telefon arayüzü ve menü | Sonnet | `style.css`, `shell.html`, `13-flow`, `14-update-hud`, `05-state` | `check_hud_mobile`, `check_hud_buttons` |
| Yayın ve son kontrol | Haiku | `tools/`, `android/`, `docs/OPERATIONS.md` | hepsi, `check_offline_apk`, `csp_local_test` |

- Testler kısa özet yazar; tam rapor `.tmp/<test>.json`'a gider ve yalnızca bir şey kalırsa okunur. `TANK_VERBOSE=1` tam çıktıyı verir.
- Bağımsız son kontrol (Haiku) yalnızca yayından önce yapılır. Ekran görüntüsü yalnızca arayüz ya da çizim değiştiğinde, küçük boyutta alınır.
- Aynı anda çalışan ajanlar ayrı git worktree'lerinde çalışır ve testleri ayrı portta koşar: `TANK_TEST_PORT=8800 python3 tests/...`. Aynı modüle dokunan iki ajan aynı anda çalışmaz; `game/index.html` çakışırsa `build_game.py` ile yeniden üretilir.
- Ajanlar kendi dallarında commit eder, push etmez. Push kararı ana oturumundur.
- ChatGPT: görsel (görsel üretimi), metin (Türkçe arayüz metni, mağaza açıklaması, taslak metinler) ve kendi başına yürüyen kod işleri (Codex) için ana oturum kullanıcıya hazır istem yazar ve hangi modelin uygun olduğunu söyler; dönen sonuç ana oturumda kontrol edilir.

## Klasörler

| Yol | Ne |
|---|---|
| `game/src/` | Oyunun kaynağı: `shell.html`, `style.css`, `NN-ad.js` modülleri. Elle düzenlenen asıl yer |
| `game/index.html` | **Üretilir** (`tools/build_game.py`), elle düzenleme. Site ve APK bundan üretilir |
| `site/` | Yayındaki site. **Üretilir**, elle düzenleme; `tools/build_site.py` yazar |
| `vercel.json`, `.vercelignore`, `README.md` | Kökte; bunları da `tools/build_site.py` üretir |
| `tools/` | Oyun, site, görsel ve oyun verisi araçları; yollar `tools/paths.py` içinde |
| `android/` | WebView sarmalayıcı (Java, Gradle yok) ve `build.sh` |
| `TankArena-<sürüm>.apk` | Kökte; oyuncular GitHub raw bağlantısından indirir. Eski sürümleri silme, eski bağlantılar kırılır |
| `tests/` | Playwright kontrolleri ve denge ölçümü; ortak düzen `tests/common.py` |
| `docs/` | `MODULES.md` (kod haritası), `ROADMAP.md` (plan), `BALANCE.md` (denge ölçümleri), `OPERATIONS.md` (yayın, güvenlik, imza), `img/` |

## Kurulum

```
pip install playwright pillow imagequant pyoxipng   # sistem pip'inde: --break-system-packages
playwright install chromium
```
Node yalnızca `tools/extract_gamedata.js` için gerekir. APK için Android SDK (build-tools 35.0.1, platforms/android-35) ve JDK gerekir.

## Komutlar

```
python3 tools/build_game.py                        # game/src → game/index.html
python3 tools/build_game.py --check                # commit'ten önce; fark varsa 1 döner
node tools/extract_gamedata.js                     # PU / UPS tabloları değişince (tanıtım sayfası verisi)
SITE_URL=https://tank-arena-taupe.vercel.app python3 tools/build_site.py
python3 tools/assets.py                            # tank çizimi ya da tools/raw ekran görüntüleri değişince; sonra build_site
python3 tools/capture_site.py                      # tools/raw ekran görüntülerini yeniden çeker
python3 tools/csp_local_test.py                    # site/ yerelde, vercel.json başlıklarıyla; CSP ihlali olmamalı

python3 tests/check_gameplay.py                    # geniş kontrol; ERRORS: none olmalı
python3 tests/check_hud_mobile.py <etiket>         # telefonda üst gösterge ne kadar yer kaplıyor
python3 tests/check_hud_buttons.py
python3 tests/check_crosshair.py                   # fare nişangâhı her harita temasında görünür mü
python3 tests/stress.py                            # tüm tanklarla yük
python3 tests/check_tanks.py                       # tank tablosu, evrim akışı, birinci kademe özellikleri
python3 tests/check_tier2_d1.py                    # Üçlü, Çift Yön, Alev Topu, Şarapnel
python3 tests/check_tier2_d2.py                    # Raylı Top, Obüs
python3 tests/check_syn.py                         # altı kart birleşimi
python3 tests/check_nuke.py                        # nükleer bomba: bütün harita, bosslara dalgaya göre hasar, %10 taban
python3 tests/check_boss.py                        # boss etabı, arena, evreler, uyarılar, Komutan
python3 tests/check_sari.py                        # Sarı Fırtına
python3 tests/check_parts.py                       # parça hasarı: palet, namlu, motor; boss paletleri
python3 tests/check_demirkok.py                    # Demirkök
python3 tests/check_region.py                      # bölge kuralı ve Tamirci
python3 tests/boss_probe.py                        # boss savaşı süresi ve kazanma oranı (bot)
python3 tests/balance_probe.py survive random 40 20 && python3 tests/balance_report.py

android/build.sh                                   # APK; ANDROID_HOME ve imza anahtarı gerekir
python3 tests/check_offline_apk.py                 # build.sh'den sonra: ağsız APK sürümü ve Android köprüsü
```
Ekran görüntüleri, test raporları ve ölçüm sonuçları `.tmp/` altına yazılır (git'e girmez).

## Değişiklik akışı

1. `game/src/` içindeki ilgili modülü düzenle, `python3 tools/build_game.py` ile `game/index.html`'i üret.
2. Testleri çalıştır: en az `check_gameplay.py`; tanklara dokunduysan `check_tanks.py` + ilgili `check_tier2_*.py`, birleşimlere `check_syn.py`, bombaya `check_nuke.py`; telefon arayüzüne dokunduysan `check_hud_mobile.py` ve `check_hud_buttons.py`; dengeye dokunduysan `balance_probe.py` + `balance_report.py`.
3. Siteyi derle (`tools/build_site.py`). Oyun JS'i `site/oyna/game.<hash>.js` olarak yeniden adlanır.
4. `game/src/`, `game/index.html` ve `site/` değişikliklerini aynı commit'te gönder; `build_game.py --check` geçmeli. `main` dalına her push'ta Vercel yaklaşık bir dakikada yayınlar.
5. Telefondaki uygulamayı etkileyen değişikliklerde yeni APK çıkar (aşağıda).

## APK sürümü çıkarmak

1. `android/AndroidManifest.xml`: `versionCode` +1, `versionName` yeni sürüm.
2. `game/src/shell.html`: `<p class="version">Tank Arena X</p>`, sonra `build_game.py`.
3. `tools/build_site.py`: önceki APK adını `OLD_APKS` listesine ekle (sitedeki eski bağlantılar yeni dosyaya yönlenir).
4. `android/build.sh`, sonra `tests/check_offline_apk.py`, sonra `tools/build_site.py`. Yeni APK kökte oluşur; eskisini silme.

## Değişmez kurallar

- **İmza anahtarı repoda yok, asla commit'leme.** Her güncelleme aynı anahtarla imzalanmalı (sertifika SHA-256 `7fcc78e948478b37…`), yoksa telefonlar eski uygulamanın üstüne kurmaz. Anahtar yoksa `build.sh` durur; asla yeni anahtar üretme, kullanıcıdan yedeği iste (`docs/OPERATIONS.md`).
- `game/index.html`, `site/`, `vercel.json`, `.vercelignore` ve `README.md` elle düzenlenmez; ilki `game/src/`'den, diğerleri `tools/build_site.py` içinden üretilir.
- Kullanıcının açık isteği: **seçenek sayısını az tut.** Yeni ayar ya da seçim eklemeden önce gerçekten gerekli mi diye düşün.
- Mobil öncelikli. Telefonda üst gösterge dikeyde ekranın en fazla ~%13'ünü, yatayda ~%18'ini kaplar (`check_hud_mobile.py`).
- Güvenlik başlıkları ve CSP `tools/build_site.py` içinde. Yayındaki oyun sayfasında satır içi script yok: build, JS'i ayrı dosyaya çıkarır. `game/index.html` Google Fonts'a bağlanır; build bunu `site/fonts` ile, APK ise gömülü fontlarla değiştirir. Sitede dış CDN yok.
- Canlı siteye yük testi yapma. Vercel Firewall IP başına 10 dakikada 300 istekten sonra 429 döner. Testler yerelde çalışır; canlı kontrol için `tools/live_check.py` (yaklaşık 40 istek) yeter.
- `#debug` adresi oyunda `window.__tank` hata ayıklama API'sini açar (`19-debug.js`). Testler ve bot ona dayanır. Sıralama (1.6) gelmeden yayından kaldırılacak, bkz. ROADMAP.

## Oyun kodunda yön bulma

Ayrıntı `docs/MODULES.md`'de. Kısaca:

- Veriler: `SPECS`, `PU`, `UPS`, `THEMES`, `firepower` (`02-constants`); `TANKS`, `SYN` (`03-data`); `RULES` (`04-platform`).
- Akış: `startGame` → `nextWave` → `buildRoster(w)` + `waveMods(w)` (`11-enemies`) → `waveCleared` → `rollUpgrades` / `chooseUpgrade`, evrimde `chooseTank` (`13-flow`).
- Döngü: `update(dt)` sabit 1/60 adım (`14-update-hud`), `render()` (`15-render-world`, `16-render-ui`).
- Bosslar: `11a-boss-core` (boss etabı, arenalar, evreler, uyarılar, boss parça hasarı; `BOSS_DEFS`, `BOSS_ON`), boss başına modül (`11b` Komutan, `11c` Sarı Fırtına, `11d` Demirkök), çizim `15a`/`15b`/`15c`. Bölge kuralı ve Tamirci `11-enemies` (`REGION_BAN`, `updateTamirci`). Normal düşman parça hasarı `11-enemies` (`partBreak`).
- Bot `18-bot` (durum nesnesi `bot` `12-input-player`'da); `window.__tank` `19-debug`.

## Diğer

- Vercel projesi `tank-arenaio/tank-arena`. Firewall kuralları panelde, kodda değil (`docs/OPERATIONS.md`).
- Claude sohbetindeki "Tank Arena" artifact'ı eski bir kopya, buradan güncellenmez. Asıl sürüm site.
