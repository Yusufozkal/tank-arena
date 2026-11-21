# Tank Arena: Claude Code kılavuzu

Kullanıcıyla Türkçe konuş. Oyunun arayüz metinleri Türkçe; kod ve yorumlar İngilizce ya da Türkçe, commit başlıkları Türkçe.

## Proje

- Dalga dalga gelen düşman tanklarına karşı 2D tank oyunu: atölye kartları, tank evrimi, kart birleşimleri, nükleer bomba, bosslar, bölge kuralı.
- Canlı site https://tank-arena-taupe.vercel.app (oyun `/oyna/`); Android APK GitHub raw bağlantısından iner.
- Kaynak `game/src/` (`shell.html`, `style.css`, sıralı `NN-ad.js` modülleri). `tools/build_game.py` bunları **üretilen** `game/index.html`'e birleştirir; site (`tools/build_site.py`) ve APK (`android/build.sh`) ondan üretilir.
- Belgeler: `docs/MODULES.md` (kod haritası; önce bunu oku), `docs/ROADMAP.md` (plan ve kullanıcı kararları; yeni işten önce oku), `docs/BOSSES.md` (boss şartnamesi), `docs/BALANCE.md` (ölçümler), `docs/OPERATIONS.md` (kurulum, klasörler, bütün komutlar, APK sürümü, imza, güvenlik, sürüm geçmişi).

## Çalışma biçimi (kullanıcının isteği)

- Ana oturum planlar, ajanlara ayrıntılı görev verir, raporları kontrol eder. Kodu (`game/src/`, `tools/`, `tests/`, `android/`) ajanlar düzenler; ana oturum bulduğu sorunu ajana geri gönderir. Belgeleri (`docs/`, `CLAUDE.md`) ana oturum düzenler.
- Ajan görevinde rol, okunacak modüller ve testler yazılır. Ajan `docs/MODULES.md`'den sonra yalnızca görevin modüllerini okur; `game/index.html` okunmaz; büyük dosyalar baştan sona okunmaz (grep, ilgili bölüm).
- Model: tasarım, kod ve denge Sonnet; dar işler, yayın hazırlığı ve son kontrol Haiku.
- Roller (okuduğu yer → testler):
  - Denge: `02`, `11-enemies`, `04` (`RULES`), `docs/BALANCE.md` → `balance_probe` + `balance_report`, `check_gameplay`, `check_ai`
  - Düşman ve boss: `11-enemies`, `11a`–`11f`, `09`, `02`, çizim `15a`–`15e`, `docs/BOSSES.md` → `check_boss`, `check_sari`, `check_demirkok`, `check_kiragi`, `check_topcu`, `check_parts`, `check_region`, `check_ai`, `check_boss_stuck`, `check_boss_reach`, `boss_probe`, `check_gameplay`, `stress`
  - Tank, kart, birleşim, bomba: `03`, `07`, `08`, `10` → `check_tanks`, `check_tier2_*`, `check_syn`, `check_nuke`, `check_cards155`
  - Çizim ve efekt: `15`, `16`, `06`, `04` (sprite) → `check_gameplay`, `check_crosshair`
  - Telefon arayüzü ve menü: `style.css`, `shell.html`, `13`, `14`, `05` → `check_hud_mobile`, `check_hud_buttons`
  - Yayın: `tools/`, `android/`, `docs/OPERATIONS.md` → hepsi, `check_offline_apk`, `csp_local_test`
- Aynı anda çalışan ajanlar ayrı git worktree'de (`/home/claude/wt/<ad>`) ve ayrı portta (`TANK_TEST_PORT=88x0`) çalışır; aynı modüle iki ajan aynı anda dokunmaz. Ajanlar kendi dalında commit eder, push etmez; push ana oturumundur.
- Token tasarrufu (kullanıcının isteği):
  - Testler kısa özet yazar; tam rapor `.tmp/<test>.json`, yalnızca sorun varsa okunur (`TANK_VERBOSE=1` tam çıktı).
  - Ekran görüntüsü yalnızca arayüz ya da çizim değişince, tek ve küçük; ajan bakar, ana oturum gerekirse bakar.
  - Görev baştan eksiksiz yazılır; belirsizse ajan başlamadan kullanıcıya sorulur. Aynı alandaki devam işi yeni ajan yerine aynı ajana gönderilir.
  - Ana oturum ajan klasörlerinden dosya okumaz; rapor ve test özetiyle yetinir.
  - Bağımsız son kontrol (Haiku, temiz kopya) yalnızca büyük sürümlerde (yeni içerik). Düzeltme sürümlerinde yayın hazırlığı ajanı bütün testleri kendisi koşar.
- ChatGPT: görsel, Türkçe metin ve Codex işleri için ana oturum kullanıcıya hazır istem yazar ve uygun modeli söyler; dönen sonucu kontrol eder.

## Değişiklik akışı

1. `game/src/`'de düzenle, `python3 tools/build_game.py`; commit'ten önce `--check`.
2. İlgili testler (en az `check_gameplay`); dengeye dokunduysan `balance_probe` + `balance_report`.
3. `SITE_URL=https://tank-arena-taupe.vercel.app python3 tools/build_site.py`.
4. `game/src/`, `game/index.html` ve `site/` aynı commit'te; `main`'e her push'ta Vercel ~1 dakikada yayınlar.
5. Telefonu etkileyen değişiklikte yeni APK (`docs/OPERATIONS.md`, "APK sürümü çıkarmak").

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
- Bosslar: `11a-boss-core` (boss etabı, arenalar, evreler, uyarılar, boss parça hasarı; `BOSS_DEFS`, `BOSS_ON`), boss başına modül (`11b` Komutan, `11c` Sarı Fırtına, `11d` Demirkök, `11e` Kapatıcı, `11f` Kırağı), çizim `15a`–`15e`. Bölge kuralı, Tamirci ve Ağır Topçu `11-enemies` (`REGION_BAN`, `updateTamirci`, `updateTopcu`). Normal düşman parça hasarı `11-enemies` (`partBreak`).
- Bot `18-bot` (durum nesnesi `bot` `12-input-player`'da); `window.__tank` `19-debug`.

## Diğer

- Vercel projesi `tank-arenaio/tank-arena`. Firewall kuralları panelde, kodda değil (`docs/OPERATIONS.md`).
- Claude sohbetindeki "Tank Arena" artifact'ı eski bir kopya, buradan güncellenmez. Asıl sürüm site.
