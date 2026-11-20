# Yayın, güvenlik ve imza

## Yayın

- **Site:** Vercel, takım `tank-arenaio`, proje `tank-arena`, Hobby (ücretsiz) plan. Adres https://tank-arena-taupe.vercel.app (alan adı alınmadı).
- GitHub `Yusufozkal/tank-arena` reposunun `main` dalına her push'ta otomatik yayın. `vercel.json` içindeki `outputDirectory: site` yalnızca `site/` klasörünü yayınlar.
- Önizleme dalları ve diğer Vercel adresleri (`…-git-main-…`, `…-tank-arenaio…`) Vercel girişi ister; herkese açık olan tek adres yukarıdaki.
- Hobby sınırları: ayda 100 GB trafik, ~1M istek. Aşılırsa proje durdurulur, fatura çıkmaz.
- Alan adı alınmadı; kullanıcının başka sitelerinin alan adları bu proje için kullanılmaz.
- **APK:** kökteki `TankArena-<sürüm>.apk` GitHub raw bağlantısından iner. Sitedeki `/TankArena-<sürüm>.apk` adresleri 307 ile GitHub'a yönlenir; APK Vercel trafiği harcamaz. GitHub Releases kullanılmıyor (kullanıcı onaylamadı).

## Güvenlik başlıkları (`tools/build_site.py` üretir)

- Her yanıtta: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (kamera, mikrofon, konum vb. kapalı), `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`. HSTS'yi Vercel ekliyor (preload).
- Tanıtım sayfası CSP: hiç script yok, stil hash ile. Oyun sayfası CSP: `script-src 'self'`, stillerde `'unsafe-inline'` (oyun çalışırken stil yazıyor).
- Önbellek: fontlar ve `oyna/game.<hash>.js` 1 yıl immutable; görseller 7 gün.
- 18 Kasım 2026 dış taraması: kritik/yüksek/orta açık yok. Düşük: `#debug` ile hile modu (sunucuda skor yokken zararsız). Bilgi: `security.txt` yok. Statik dosyalarda `Access-Control-Allow-Origin: *` Vercel varsayılanı, çerez olmadığı için zararsız.

## Vercel Firewall (panelden, kodda değil)

Hobby'de en fazla 3 özel kural, bunlardan 1'i hız sınırı. Sıra önemli:

1. **Yalnızca GET ve HEAD:** Method, GET ya da HEAD değilse → Deny (403).
2. **Zafiyet taraması engeli:** Request Path şu regex'e uyuyorsa
   `(?:^|/)\.(?:env|git|svn|hg|aws|ssh|DS_Store|vscode|idea|ht)|^/(?:wp-|wordpress|xmlrpc|phpmyadmin|pma|cgi-bin|vendor/|admin|boaform|HNAP1|actuator|server-status|owa/|autodiscover)|\.(?:php\d?|phtml|asp|aspx|ashx|jsp|jspx|cgi|ini|bak|old|orig|swp|sql|sqlite|sh|yml|yaml|log|conf|pem|key)$`
   **ya da** User Agent şuna uyuyorsa `sqlmap|[Nn]ikto|[Nn]uclei|zgrab|[Mm]asscan|[Ww][Pp][Ss]can|gobuster|feroxbuster|Fuzz Faster U Fool|Nmap Scripting Engine|[Aa]cunetix|Netsparker|[Hh]ydra` → Deny.
   Siteye bu kalıba uyan bir dosya eklenirse (`.yml`, `admin/`, `.php` gibi) önce bu kuralı güncelle.
3. **IP başına hız sınırı:** yol `/` ile başlıyorsa, sabit pencere 600 sn, IP başına 300 istek → 429.

Notlar: kalıcı engelleme (persistent actions) Hobby'de yok, engel pencere bitene kadar sürer. Engellenen ve 429 alan istekler kotaya sayılmaz. Bot Protection kapalı (WhatsApp/Telegram bağlantı önizlemeleri bozulmasın). Büyük saldırıda: Firewall sayfasının altında **Attack Mode**.

## İmza anahtarı

- Paket adı `com.tankarena.oyun`, minSdk 24, targetSdk 35, v2+v3 imza.
- Sertifika SHA-256: `7fcc78e948478b3714e69d93cc8522500e0fdf00740990c329bd41f6e6c05833`.
- Anahtar (`tankarena.jks`, takma ad `tankarena`) ve şifresi **repoda yok**, kullanıcıda yedekli. `android/build.sh` onu `android/keystore/tankarena.jks` + `android/keystore/password.txt` yolunda ya da `TANK_KEYSTORE` / `TANK_KEYSTORE_PASS_FILE` ortam değişkenlerinde arar (`android/keystore/` git'e girmez).
- Anahtar kaybolursa güncelleme çıkarılamaz; oyuncuların eski uygulamayı silip yenisini kurması gerekir. Yeni anahtar üretme.

## Android sarmalayıcı

- `MainActivity` oyunu yerel varlıklardan `https://appassets.androidplatform.net/` adresiyle yükler; dış bağlantılar sistem tarayıcısında açılır, böylece JS köprüsü uzak sayfalara açılmaz.
- JS köprüsü `TankAndroid.setOrientation(mode)` (yalnızca ekran yönü). Geri tuşu oyundaki `window.tankBack()` fonksiyonunu çağırır.
- Dosya ve içerik erişimi kapalı, debuggable değil.

## Sürüm geçmişi

| Sürüm | versionCode | Ne geldi |
|---|---|---|
| 1.0 | 1 | İlk oyun ve APK |
| 1.1 | 2 | Avcı (zeki tank), ayarlar, rehber, rekorlar |
| 1.2 | 3 | Oyun içinde yön değiştirme, yeni zorluk adları, dalga sonu atölye kartları, yeni güçlendirmeler |
| 1.2.1 | 4 | Karda ve çölde görünen nişangâh, telefonda küçülen üst gösterge |
| 1.3 | 5 | Tek mod, Komutan her gelişte güçlenir ve ateşten önce namlusu parlar, kartlar toplanır (en fazla ~4 kat), zayıf kartlara ikinci etki, yeni denge |
| 1.4 | 6 | Tank evrimi (10 tank, 5. ve 10. dalgada seçim, her birinin imza özelliği), 6 kart birleşimi, nükleer bomba, Çift namlu kartı kalktı, yeni denge |
| 1.4.1 | 7 | Hızlı, Ağır ve Avcı kademeli gelir (4., 7., 12. dalga; ilk gelişte "Yeni düşman" yazısı), sahada aynı anda en fazla 8 düşman, harita 25×25, yeni denge |
| 1.5 | 8 | Boss etabı (sahada yalnızca boss, kendi arenası, evreler, uyarılar, hasar görünümü), yeni Komutan, Sarı Fırtına, 10 dalgalık bölgeler, parça hasarı, bütün haritayı vuran nükleer bomba |
| 1.5.1 | 9 | Demirkök (20. dalga, Orman Kalesi), Tamirci, bölge kuralı (yenilen boss'un türü bir daha gelmez) |
| 1.5.4 | 12 | Serbest Mod (tank, güç, boss ya da dalga, harita; kayıt tutmaz), Kapatıcı (yalnızca Serbest Mod) |
| 1.5.3 | 11 | Düşmanlar görmediklerini bilmez (görüş konisi, devriye, kısa duyma), oyuncu mermi menzili kısaldı, boss arena cepleri kapandı, Komutan canı, birleşim bilgisi yalnızca ilgili kartta |
| 1.5.2 | 10 | Oyuncu geri bildirimi: 35'lik harita, en çok 6 düşman, eşikli parça hasarı, düşmanlar arar, Avcı uzaktan kaçamaz, boss çubuğu ve boss tehdidi, takılma, mermi renkleri, birleşim açıklamaları, site tanıtımı |

## Kurulum

```
pip install playwright pillow imagequant pyoxipng   # sistem pip'inde: --break-system-packages
playwright install chromium
```
Node yalnızca `tools/extract_gamedata.js` için gerekir. APK için Android SDK (build-tools 35.0.1, platforms/android-35) ve JDK gerekir.

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
python3 tests/check_ai.py                          # Avcı kaçışı ve siper, son görülen yer, arama
python3 tests/check_boss_stuck.py                  # bosslar arenada takılmıyor
python3 tests/check_boss_reach.py                  # arenada bossun ulaşamadığı cep yok
python3 tests/boss_probe.py                        # boss savaşı süresi ve kazanma oranı (bot)
python3 tests/balance_probe.py survive random 40 20 && python3 tests/balance_report.py

android/build.sh                                   # APK; ANDROID_HOME ve imza anahtarı gerekir
python3 tests/check_offline_apk.py                 # build.sh'den sonra: ağsız APK sürümü ve Android köprüsü
```
Ekran görüntüleri, test raporları ve ölçüm sonuçları `.tmp/` altına yazılır (git'e girmez).

## APK sürümü çıkarmak

1. `android/AndroidManifest.xml`: `versionCode` +1, `versionName` yeni sürüm.
2. `game/src/shell.html`: `<p class="version">Tank Arena X</p>`, sonra `build_game.py`.
3. `tools/build_site.py`: önceki APK adını `OLD_APKS` listesine ekle (sitedeki eski bağlantılar yeni dosyaya yönlenir).
4. `android/build.sh`, sonra `tests/check_offline_apk.py`, sonra `tools/build_site.py`. Yeni APK kökte oluşur; eskisini silme.
