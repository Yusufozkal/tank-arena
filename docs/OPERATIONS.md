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
| 1.5.2 | 10 | Oyuncu geri bildirimi: 35'lik harita, en çok 6 düşman, eşikli parça hasarı, düşmanlar arar, Avcı uzaktan kaçamaz, boss çubuğu ve boss tehdidi, takılma, mermi renkleri, birleşim açıklamaları, site tanıtımı |
