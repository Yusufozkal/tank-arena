# Tank Arena: Claude Code kılavuzu

Kullanıcıyla Türkçe konuş. Oyunun bütün arayüz metinleri Türkçedir; kod, yorumlar ve commit gövdeleri İngilizce ya da Türkçe olabilir, başlıklar Türkçe.

## Proje

- Dalga dalga gelen düşman tanklarına karşı oynanan 2D tank oyunu. Her dalgadan sonra atölyede bir kart seçilir; güçlendirmeler, Komutan (boss) ve Avcı (zeki tank) var.
- Canlı site: https://tank-arena-taupe.vercel.app (oyun `/oyna/`). Android APK GitHub'dan iner.
- Tek kaynak `game/index.html`: canvas + WebAudio, tek HTML dosyası, framework ve npm yok. Site ve APK bu dosyadan üretilir.
- Yol haritası ve kullanıcının verdiği kararlar `docs/ROADMAP.md` içinde. Yeni işe başlamadan önce oku.

## Klasörler

| Yol | Ne |
|---|---|
| `game/index.html` | Oyunun kaynağı. Elle düzenlenen asıl dosya |
| `site/` | Yayındaki site. **Üretilir**, elle düzenleme; `tools/build_site.py` yazar |
| `vercel.json`, `.vercelignore`, `README.md` | Kökte; bunları da `tools/build_site.py` üretir |
| `tools/` | Site, görsel ve oyun verisi araçları; yollar `tools/paths.py` içinde |
| `android/` | WebView sarmalayıcı (Java, Gradle yok) ve `build.sh` |
| `TankArena-<sürüm>.apk` | Kökte; oyuncular GitHub raw bağlantısından indirir. Eski sürümleri silme, eski bağlantılar kırılır |
| `tests/` | Playwright kontrolleri ve denge ölçümü; ortak düzen `tests/common.py` |
| `docs/` | `ROADMAP.md` (plan), `BALANCE.md` (denge ölçümleri), `OPERATIONS.md` (yayın, güvenlik, imza) |

## Kurulum

```
pip install playwright pillow imagequant pyoxipng   # sistem pip'inde: --break-system-packages
playwright install chromium
```
Node yalnızca `tools/extract_gamedata.js` için gerekir. APK için Android SDK (build-tools 35.0.1, platforms/android-35) ve JDK gerekir.

## Komutlar

```
node tools/extract_gamedata.js                     # PU / UPS tabloları değişince (tanıtım sayfası verisi)
SITE_URL=https://tank-arena-taupe.vercel.app python3 tools/build_site.py
python3 tools/assets.py                            # tank çizimi ya da tools/raw ekran görüntüleri değişince; sonra build_site
python3 tools/capture_site.py                      # tools/raw ekran görüntülerini yeniden çeker
python3 tools/csp_local_test.py                    # site/ yerelde, vercel.json başlıklarıyla; CSP ihlali olmamalı

python3 tests/check_gameplay.py                    # geniş kontrol, JSON raporunu oku; ERRORS: none olmalı
python3 tests/check_hud_mobile.py <etiket>         # telefonda üst gösterge ne kadar yer kaplıyor
python3 tests/check_hud_buttons.py
python3 tests/check_crosshair.py                   # fare nişangâhı her harita temasında görünür mü
python3 tests/stress.py
python3 tests/balance_probe.py survive random 40 20 && python3 tests/balance_report.py

android/build.sh                                   # APK; ANDROID_HOME ve imza anahtarı gerekir
python3 tests/check_offline_apk.py                 # build.sh'den sonra: ağsız APK sürümü ve Android köprüsü
```
Ekran görüntüleri ve ölçüm sonuçları `.tmp/` altına yazılır (git'e girmez).

## Değişiklik akışı

1. `game/index.html` dosyasını düzenle.
2. Testleri çalıştır: en az `check_gameplay.py`; telefon arayüzüne dokunduysan `check_hud_mobile.py` ve `check_hud_buttons.py`; dengeye dokunduysan `balance_probe.py` + `balance_report.py`.
3. Siteyi derle (`tools/build_site.py`). Oyun JS'i `site/oyna/game.<hash>.js` olarak yeniden adlanır.
4. `game/` ve `site/` değişikliklerini aynı commit'te gönder. `main` dalına her push'ta Vercel yaklaşık bir dakikada yayınlar.
5. Telefondaki uygulamayı etkileyen değişikliklerde yeni APK çıkar (aşağıda).

## APK sürümü çıkarmak

1. `android/AndroidManifest.xml`: `versionCode` +1, `versionName` yeni sürüm.
2. `game/index.html`: `<p class="version">Tank Arena X</p>`.
3. `tools/build_site.py`: önceki APK adını `OLD_APKS` listesine ekle (sitedeki eski bağlantılar yeni dosyaya yönlenir).
4. `android/build.sh`, sonra `tests/check_offline_apk.py`, sonra `tools/build_site.py`. Yeni APK kökte oluşur; eskisini silme.

## Değişmez kurallar

- **İmza anahtarı repoda yok, asla commit'leme.** Her güncelleme aynı anahtarla imzalanmalı (sertifika SHA-256 `7fcc78e948478b37…`), yoksa telefonlar eski uygulamanın üstüne kurmaz. Anahtar yoksa `build.sh` durur; asla yeni anahtar üretme, kullanıcıdan yedeği iste (`docs/OPERATIONS.md`).
- `site/`, `vercel.json`, `.vercelignore` ve `README.md` elle düzenlenmez; `tools/build_site.py` içinden değiştirilir.
- Kullanıcının açık isteği: **seçenek sayısını az tut.** Yeni ayar ya da seçim eklemeden önce gerçekten gerekli mi diye düşün.
- Mobil öncelikli. Telefonda üst gösterge dikeyde ekranın en fazla ~%13'ünü, yatayda ~%18'ini kaplar (`check_hud_mobile.py`).
- Güvenlik başlıkları ve CSP `tools/build_site.py` içinde. Yayındaki oyun sayfasında satır içi script yok: build, JS'i ayrı dosyaya çıkarır. `game/index.html` Google Fonts'a bağlanır; build bunu `site/fonts` ile, APK ise gömülü fontlarla değiştirir. Sitede dış CDN yok.
- Canlı siteye yük testi yapma. Vercel Firewall IP başına 10 dakikada 300 istekten sonra 429 döner. Testler yerelde çalışır; canlı kontrol için `tools/live_check.py` (yaklaşık 40 istek) yeter.
- `#debug` adresi oyunda `window.__tank` hata ayıklama API'sini açar. Testler ve bot ona dayanır. Sıralama (1.5) gelmeden yayından kaldırılacak, bkz. ROADMAP.

## Oyun kodunda yön bulma (`game/index.html`)

- Veriler: `SPECS` (tank tipleri ve canları), `PU` (güçlendirmeler), `UPS` (atölye kartları), `RULES` (tek kural seti), `THEMES` (haritalar).
- Akış: `startGame` → `nextWave` → `buildRoster(w)` + `waveMods(w)` (dalga zorluğu) → `waveCleared` → `rollUpgrades` / `chooseUpgrade` (atölye).
- Oyuncu gücü: `playerSpec()`, `fireTank()`; hasar `hurtEnemy`, `damagePlayer`.
- Döngü: `update(dt)` sabit 1/60 adım, `render()`; arayüz `updateHUD()`; fare `drawCrosshair()` + `syncAimCursor()`.
- Telefon HUD'u CSS'te `@media (max-width:520px),(max-height:520px)` bloğu.
- Dosyanın sonunda otomatik pilot (bot) ve `window.__tank` (sim, step, wave, give, spawn, killAll, choices, choose…).

## Diğer

- Vercel projesi `tank-arenaio/tank-arena`. Firewall kuralları panelde, kodda değil (`docs/OPERATIONS.md`).
- Claude sohbetindeki "Tank Arena" artifact'ı eski bir kopya, buradan güncellenmez. Asıl sürüm site.
