# Yol haritası

Durum (19 Kasım 2026): **1.3 yayında.** Sıradaki iş 1.4; kullanıcı onaylamadan başlama.

## Kullanıcının koyduğu ilkeler

- **Seçenek sayısı az olsun.** Her seçimde 2–3 seçenek; ayar menüsü büyümesin.
- **Tek mod.** Zorluk seçenekleri (Talim / Cephe / Kıyamet) kalkacak, herkes aynı kurallarla oynar. Sıralama için de şart.
- **Tek boss.** Yalnızca Komutan kalır, dalgayla güçlenir. (Kullanıcının "Bosslar tek olabilir" sözü böyle yorumlandı; farklı bir şey kastettiyse düzelt.)
- **Sıralama puanı = ulaşılan dalga.**
- Tank seçimi **diep.io gibi**: oyun içinde aşama geçtikçe yeni tank seçimleri açılır.
- Kazanılan parayla **kalıcı geliştirmeler**; **doğrulanmış hesap** zorunlu; **nükleer bomba**; **co-op**.

## 1.3 – Tek mod ve denge (yayında, 19 Kasım 2026)

Kullanıcı "yeni tanklar dursun şimdilik, 1.3'ün işlerini yap" dedi; 1.3 yeni düşman türü olmadan çıktı.

- Zorluk seçimi kalktı, tek kural seti (`RULES`, eski Cephe değerleri). Rekorlar tek listede (`REC.top`); eski zorluk rekorları silinmedi, en yükseği taşındı.
- Komutan: ilk gelişinde daha az canlı, her gelişinde güçlenir (`bossHp`). Üçlü atıştan önce namluları en az 0,45 sn parlar; tuğlaya ateş ederken beklemez.
- Atölye kartları toplanır: ateş gücü = 1 + 0,25·kalibre + 0,18·yükleyici + 1·çift namlu + 0,15·termal, en fazla ×4,05 (1.2.1'de ×7,6). Mermi başına hasar tabanın altına inmez.
- Zayıf kartlara ikinci etki: termal kamera +%15 ateş gücü; mıknatıs seviye başına %25 daha sık güçlendirme düşürtür; uzun etki Tamir'i seviye başına +10 zırh artırır ve Hazırlık kartının süresini de uzatır. (Planda "uzun etki kalkanı da uzatır" yazıyordu; kalkan zaten uzuyordu, bu yüzden Tamir seçildi.)
- Denge: ilk Komutan 16 canlı ve ilk gelişinde daha yavaş ateş eder. 10. dalgadan sonra düşmanlar can şişirmek yerine daha sık ve isabetli ateş eder, daha hızlı ve kalabalık gelir; ağır tank ve Avcı payı artar; dalga arası onarım ve düşen güçlendirmeler azalır (can çarpanı yine de x1,9'a kadar çıkar). Bot ölçümünde (80 oyun) ortalama bitiş 18,8. dalga, hiçbir dalga oyunların %12'sinden fazlasını bitirmiyor, 40'a ulaşan %8. Gerçek oyuncu verisiyle yeniden bakılmalı.
- Ölçümler ve değişen sabitler: `docs/BALANCE.md`, "1.3 sonuçları".

## Yeni düşmanlar (ertelendi)

- Planlanan: **Topçu** (duvar üstünden atar, düşeceği yer 1 sn önce işaretlenir), **Kalkanlı** (önden vurulmaz; yandan, arkadan, sekme ya da patlayıcı mermiyle), **Bombacı** (gelip yanında patlar; uzaktan vurulursa çevresine zarar verir).
- Önerilen ek fikirler: Tamirci (grubun arkasında durup onarır), Taşıyıcı (dron salar, diep.io havası, 1.4'e yakışır), Mayıncı, Hayalet (termal görür), Koçbaşı, Bölünen.
- Kullanıcı "şu an çok olur" dedi. Önerim ilk etapta iki tane: **Bombacı** ve **Tamirci** (yapması kolay, telefonda ayırt edilir, birbirini tamamlar). Topçu, Kalkanlı ve Taşıyıcı sonraya. Kullanıcı henüz seçmedi.

## 1.4 – Tank evrimi ve nükleer bomba

Oyuna Standart tankla başlanır, Komutan yendikçe seçim açılır:

- **5. dalga:** İkiz (iki namlu) · Keskin Nişancı (uzun menzil, güçlü, yavaş) · Makineli (çok hızlı, saçılır)
- **10. dalga:** seçilen dal ikiye ayrılır
  - İkiz → Üçlü (yelpaze) ya da Çift Yön (arkaya da ateş eder)
  - Keskin Nişancı → Raylı Top (her şeyi deler) ya da Obüs (duvar üstünden, alan hasarı)
  - Makineli → Alev Topu (kısa menzil, sürekli) ya da Şarapnel (saçma)

Toplam 10 tank (diep.io'da 54 normal tank var; bilerek az). Atölye kartları diep.io'daki istatistik puanları gibi kalır (zırh, hasar, hız…); **Çift namlu kartı kalkar**, çünkü artık bir tank. Tanklar parayla değil oyun içinde açılır, sıralamada herkes eşit başlar. Gerekirse sonra 20. dalgada üçüncü kademe.

**Nükleer bomba:** düşman öldürdükçe dolan sayaç; dolunca düğme yanar, kısa uyarıdan sonra ekrandaki bütün düşmanlar yok olur, Komutan canının dörtte birini kaybeder. Yaklaşık 3 dalgada bir dolacak şekilde ayarlanır.

## 1.5 – Hesap, sıralama, para (çevrimiçi)

- **Giriş:** Google hesabıyla (hesabı Google doğrulamış olur). Google, uygulama içi WebView'da girişi engeller (`disallowed_useragent`); APK'da giriş Chrome Custom Tab'da açılıp derin bağlantıyla oyuna döner. E-posta doğrulaması alan adı + e-posta servisi ister, şimdilik yok.
- Sıralamada oyuncunun seçtiği takma ad görünür (filtrelenir, benzersiz).
- **Sıralama:** en yüksek dalga; eşitlikte daha hızlı olan öne geçer. Dalga rekoruna göre rütbe: Er → … → General.
- **Para:** skor yerine; düşmanlar ve dalgalar kazandırır, Komutan ekstra. Sunucuda hesaplanır.
- **Garaj:** 4 kalıcı geliştirme (zırh, ateş gücü, hız, nükleer şarj), her biri 5 seviye. Toplam etki ~%20'yi geçmez; geçerse sıralama beceriyi değil oynanan saati ölçer.
- **Hile:** yayın sürümünden `#debug` API'si kaldırılır; sunucu her oyunun başlangıcını kaydeder, mantıksız sonucu reddeder. Sonra: sıralamanın tepesindeki oyunları sunucuda tekrar oynatarak doğrulama (oyunun sabit 1/60 adımı ve tohumlu rastgelelik gerekir).
- KVKK için kısa aydınlatma metni ve hesap silme düğmesi.
- Hesap zorunlu olunca oyun (APK dahil) internetsiz açılmaz.

## 1.6 – Co-op

- 2 kişi, oda koduyla. Düşman sayısı ve canı iki kişiye göre artar; ölen oyuncu dalga sonunda geri gelir.
- Sıralamaya girmez, para kazandırır.
- Ev sahibinin cihazı oyunu yönetir. Mümkünse WebRTC ile doğrudan bağlantı, olmazsa sunucu üzerinden.

## Altyapı kararı (açık)

Önerilen: **Cloudflare** (Workers + D1 + Durable Objects). Kullanıcı henüz onaylamadı. Kasım 2026 araştırması:

- **Cloudflare:** ücretsiz planda günde 100.000 istek, statik dosya istekleri ücretsiz ve sınırsız; D1 günde 5 milyon satır okuma / 100.000 yazma, 5 GB; SQLite tabanlı Durable Objects ücretsiz planda var (WebSocket mesajları 20'de 1 sayılır); sınır aşılırsa işlem hata verir, fatura çıkmaz. Kullanılmayınca durmaz. Hazır oyuncu girişi yok, Google girişi elle kodlanır. Site de buraya taşınabilir.
- **Supabase:** kurulumu en kolay (giriş, veritabanı, canlı kanal hazır). Ücretsiz projeler 1 hafta kullanılmazsa duraklatılır; canlı mesaj ayda 2 milyon; varsayılan e-posta servisi saatte 2 e-posta ve yalnızca ekip üyelerine. Pro aylık 25 $.
- **Firebase:** Spark planı kart istemez; Firestore 1 GiB, günde 50.000 okuma / 20.000 yazma; Realtime Database aynı anda 100 bağlantı. Sunucu kodu (Cloud Functions) için Blaze planı gerekir.
- **PlayFab / Nakama:** uymuyor. PlayFab'ın ücretsiz Foundation Mode'u Xbox'a çıkan oyunlar için; Nakama kendi sunucunda ücretsiz, hazır barındırma aylık ~600 $.

## Vazgeçilenler

Dört farklı boss, oyun başında tank seçimi (yerine evrim), aktif yetenek, kart birleşimi, elit düşmanlar, zorluk seçenekleri.

## Bekleyen küçük işler

- Yayın sürümünden hata ayıklama modunu kaldırmak (1.5'ten önce şart).
- `/.well-known/security.txt` eklemek (kullanıcı "şimdilik dursun" dedi).
- Alan adı alınmadı; kullanıcı "almak istersek ayarlarız" dedi.
- Claude Code'a (bulut) taşımanın eksikleri, kullanıcı "şimdilik dursun" dedi: bulut ortamına kurulum betiği (Android SDK, Playwright) ve izinli alan adları (`dl.google.com`, canlı site); `build.sh` imza anahtarını ortam değişkeninden de okusun; tanıtım PDF'inin kaynağı repoya alınsın; panel işleri (Vercel Firewall) bulut oturumundan yapılamaz.
- ChatGPT/Codex bağlantısı: karar verilmedi. Seçenekler: Codex bulutu aynı repoya bağlanır, PR'lara `@codex review`; ya da yerelde Codex CLI + MCP. Codex kuralları `AGENTS.md`'den okur (repoda yok).
