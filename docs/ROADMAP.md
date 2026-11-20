# Yol haritası

Durum (20 Kasım 2026): **1.5.1 yayında**. **1.5.2 yapılıyor** (kullanıcının oyun sonrası geri bildirimi, aşağıda). Ondan sonra yeni içerik sürümü (Serbest Mod, ek boss, Ağır Topçu, yeni kartlar), sonra 1.6 (çevrimiçi).

## Kullanıcının koyduğu ilkeler

- **Seçenek sayısı az olsun.** Her seçimde 2–3 seçenek; ayar menüsü büyümesin.
- **Tek mod.** Zorluk seçenekleri (Talim / Cephe / Kıyamet) kalkacak, herkes aynı kurallarla oynar. Sıralama için de şart.
- **Görkemli bosslar.** Her düşman türünün kendi boss'u olur, sade değil görkemli. 20 Kasım 2026'da eski "tek boss" kararının yerine geçti; bkz. "Bölgeler ve görkemli bosslar".
- **Sıralama puanı = ulaşılan dalga.**
- Tank seçimi **diep.io gibi**: oyun içinde aşama geçtikçe yeni tank seçimleri açılır.
- Kazanılan parayla **kalıcı geliştirmeler**; **doğrulanmış hesap** zorunlu; **nükleer bomba**; **co-op**.
- **Zorluk:** ne oyuncuyu bıraktıracak kadar zor, ne sıkacak kadar kolay. Yeni düşman türleri kademeli gelir; sahada kalabalık oyuncuyu sıkıştırmaz. Ölçütler `docs/BALANCE.md`, "1.4.1 sonuçları".
- **Parça hasarı** (20 Kasım 2026, kullanıcının fikri): öldürmeyen isabet düşmanın bir parçasını bir süreliğine bozar (yandan palet, önden namlu, arkadan motor), sonra onarılır; bosslarda daha kapsamlı. Oyuncunun tankında yok (öneri). Ayrıntı "Boss mekanikleri" belgesinde.

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
- Kullanıcı 19 Kasım 2026'da 1.4'ü, 1.4 denge geçişinde eklenen geç dalga can artışıyla yayına almayı onayladı (`waveMods`, `hp`: 20. dalgadan sonra dalga başına +0,09; 40. dalgada ×3,55, 1.3'te ×1,9); bu artış "dalgalar yeni tür ve görevle zorlaşsın, can şişirmeyle değil" ilkesine ters (bkz. `docs/BALANCE.md`). Yeni düşmanlar gelince bu can artışı geri çekilecek ya da azaltılacak ve denge `tests/balance_probe.py` + `tests/balance_report.py` ile yeniden ölçülecek.

## 1.4 – Tank evrimi, birleşimler ve nükleer bomba (yayında, 19 Kasım 2026)

Oyuna Standart tankla başlanır; Komutan yenilince tank seçimi atölye kartları gibi gelir:

- **5. dalga:** İkiz · Keskin Nişancı · Makineli
- **10. dalga:** seçilen dal ikiye ayrılır: İkiz → Üçlü ya da Çift Yön; Keskin Nişancı → Raylı Top ya da Obüs; Makineli → Alev Topu ya da Şarapnel.

Toplam 10 tank (diep.io'da 54 normal tank var; bilerek az). Tanklar parayla değil oyun içinde açılır, sıralamada herkes eşit başlar. Gerekirse sonra 20. dalgada üçüncü kademe.

Her tankın tek imza özelliği var; hepsi kendiliğinden çalışır, yeni düğme yok:

- **İkiz, çift darbe:** iki mermisi aynı tanka birlikte isabet ederse tank 0,3 sn sersemler (üst üste değil: sersemlik bitince 1,5 sn bekler).
- **Keskin Nişancı, uzak görüş:** kamera geri çekilir, daha geniş alan görünür; hızlı ve güçlü mermi, yavaş tank.
- **Makineli, ısınma:** sürekli ateşte ateş hızı artar; çok ısınırsa namlu kızarır ve 1,5 sn soğur (ısı namlunun renginden görünür).
- **Üçlü, delici orta mermi:** yelpazenin ortadaki mermisi bir tankı delip arkasındakine gider.
- **Çift Yön, itici arka namlu:** arkaya da ateş eder; ateş ederken tank ileri hızlanır.
- **Raylı Top, lazer çizgisi:** merminin gideceği yol görünür; tuğlayı ve tankı deler.
- **Obüs, mesafe ayarı:** nişan çubuğu ne kadar itilirse mermi o kadar uzağa, duvarın üstünden düşer; düşeceği yer işaretlenir (bilgisayarda imlecin olduğu yere).
- **Alev Topu, alev perdesi:** kısa menzilli sürekli alev; önündeki düşman mermilerini yakar, vurduğu tank birkaç saniye yanar.
- **Şarapnel, geri itme:** saçma atar; yakından vurduğu tankları geri iter.

Tank değişince 1 sn kalkan ve dönüşüm efekti; her tankın kendine özgü görünüşü var (namlu sayısı ve şekli).

Atölye kartları diep.io'daki istatistik puanları gibi kalır (zırh, hasar, hız…). **Çift namlu kartı kalkar**, çünkü artık İkiz tankı var; ateş gücü hesabı ve denge yeniden ayarlanır.

### Birleşimler

Kullanıcının fikri: iki parça birlikte takılınca yeni bir etki açılır. ("Kart birleşimi" daha önce vazgeçilenlerdeydi; kullanıcı geri aldı.)

1. **Sekme + Patlayıcı mermi = Seken patlama:** çelikten seken mermi ilk isabetinde daha geniş patlar. Bazen düşmana vurmak için duvara nişan almak en iyi hamle olur.
2. **Turbo motor + Onarım robotu = Hareketli onarım:** birkaç saniye hareket edip hasar almazsan onarım hızlanır.
3. **Büyük kalibre + Uzun namlu = Uzak vuruş:** mermi uzağa gittikçe sert vurur, en fazla +%40.
4. **Termal kamera + Büyük kalibre = Pusu:** seni görmeyen ya da çalıdaki düşmana ilk isabet çift hasar.
5. **Zırh plakası + Otomatik yükleyici = Kale:** durup ateş ederken alınan hasar %25 azalır.
6. **Mıknatıs + Uzun etki = Zincir:** güçlendirme alınca etkin olan diğerleri 3 sn uzar.

Atölye, kartın elindeki hangi parçayla birleşebileceğini gösterir: birleşiyorsa rozet ("Birleşim: Seken patlama"), henüz olmayan bir parçayla birleşiyorsa soluk ipucu ("Sekme ile birleşir"). Açılınca "BİRLEŞİM AÇILDI" yazısı; duraklatma ekranında açık birleşimler, Rehber'de hepsi. Etkiler ölçülü tutulur ve botla ayarlanır, çünkü birleşimler kart seçiminin etkisini yeniden büyütür. İleride tank + kart birleşimleri olabilir (örneğin Obüs + Patlayıcı mermi).

### Nükleer bomba

Düşman öldürdükçe dolan sayaç; dolunca düğme yanar, kısa bir uyarıdan sonra ekrandaki bütün düşmanlar yok olur, Komutan canının dörtte birini kaybeder. Yaklaşık 3 dalgada bir dolacak şekilde ayarlanır.

## 1.4.1 – Kademeli düşmanlar ve büyük harita (yayında, 20 Kasım 2026)

- Hızlı 4., Ağır 7., Avcı 12. dalgada gelir (önce 2, 3, 4); ilk gelişinde tek tane ve bir kez "Yeni düşman" yazısı.
- Sahada aynı anda en fazla 8 düşman (önce 12'ye kadar); harita 21×21 → 25×25.
- Denge yeniden ölçüldü: 10. dalgadan önce ölüm %35 → %2,5, ortalama bitiş 18 → 24, dalga başına giden zırh ~%23. Ayrıntı `docs/BALANCE.md`.
- Aynı gün altyapı: oyun kaynağı `game/src/` modüllerine bölündü (`docs/MODULES.md`), testler kısa özet yazıyor.

## 1.5 – Boss etabı, yeni Komutan, Sarı Fırtına, parça hasarı (yayında, 20 Kasım 2026)

Bölge yapısının ilk adımı (kullanıcı onayı, 20 Kasım 2026). Şartname `docs/BOSSES.md`, ölçümler `docs/BALANCE.md`.

- Boss dalgaları ayrı etap: sahada yalnızca boss; kendi arenası, giriş sahnesi, üç evre, ortak uyarı dili, hasar görünümü; boss ölünce zırh dolar. Harita teması 10 dalgalık bölgeler (Çöl, Orman, Kar, Şehir).
- Komutan ana boss (Kışla arenası, komuta kulesi; 5, 15, 25, 35). 10. dalgada Sarı Fırtına (Kum Çukuru). 20, 30, 40'ta kendi bossları gelene kadar Komutan.
- Parça hasarı: normal düşmanda palet 1,5 sn, namlu 1,2 sn, motor 1,8 sn (şartnamedeki 2,5/2/3 sn oyunu fazla kolaylaştırdı); bosslarda palet canı, 4 sn durma, uyarı sırasında bozunca saldırı iptali.
- Nükleer bomba bütün haritayı vurur; bosslara canın en çok %30'u ya da 150 + 6·(dalga − 15) hasar (küçük olan), can en az %10'da kalır, 3 sn sersem; boss hasar almazken harcanmaz. Dolma süresi 2,5 → 3,5 dalga.
- Kalan bölge işleri: Demirkök + Orman, Kırağı + Kar, Son Hisar + Şehir + ikinci tur; bölgelere düşman dağılımı ve yeni düşman türleri.

## 1.5.1 – Demirkök, Orman bölgesi, Tamirci, bölge kuralı (yayında, 20 Kasım 2026)

Kullanıcı "ikisini de yap" dedi (Demirkök + bölge yapısı). Yeni Orman düşmanı olarak Tamirci'yi ana oturum seçti (Bombacı ile değiştirilebilir). Şartname `docs/BOSSES.md` bölüm 5 ve 9.

- Demirkök (20. dalga, Orman Kalesi): yan taretler (ayaktayken gövde yarı hasar), ağır top, deprem, havan; son evrede kök salma, geçici demir kökler, 360° döner ateş, arkadan 1,5 kat.
- Tamirci (13. dalgadan): silahsız, en hasarlı müttefiki ışınla onarır ve bozuk parçasını hemen düzeltir; yaklaşınca kaçar; tek kalınca kaçmayı bırakıp yaklaşır.
- Bölge kuralı: Sarı Fırtına yenilince Keşif tankları, Demirkök yenilince Ağır tanklar ve Tamirciler o oyunda bir daha gelmez; yeni bölgenin başında yazı çıkar. Kalkan her tür için dalga +%12 kalabalık, yeniden dolum ×0,93, nişan hatası ×0,90 (can eklenmedi).
- Bilinen: Kar ve Şehir'in kendi yeni türleri gelene kadar 21–40. dalgalar Normal + Avcı; 26–29. dalgalar zor (dalga başına zırhın %50–68'i).

## 1.5.2 – Oyuncu geri bildirimi: düzeltmeler (20 Kasım 2026)

Kullanıcı 1.5.1'i oynadıktan sonra istedi; kararları:

- Harita daha geniş (25 → ~35). Aynı anda daha az düşman (8 → ~6), zorluk sayıyla değil nitelikle; can şişirme yok.
- Düşman mermilerine sınır konmayacak ("sayıları azaldığı için gerek yok").
- Parça hasarı yüzdeye/şansa göre değil, belli bir hasardan sonra kırılır (parça başına sabit hasar eşiği); zayıf erken düşmanlar böylece kendiliğinden korunur.
- Boss canları çok azaltılmayacak (~%10–20); asıl istenen, vurunca canın azaldığının görünmesi: üstte büyük boss çubuğu, giden can kısa süre açık renkte kalır.
- Boss çarparken sert vursun; boss mermileri oyuncuya ulaşabilsin ve vurunca can götürsün ama ezici olmasın. Bossların haritada takılması düzelsin.
- Düşman mermisi oyuncununkinden ayrı görünsün. Kart birleşimlerinin ne yaptığı kartta ve açılınca yazsın.
- Avcı uzaktan gelen mermiden kaçamasın; uzaktan vurulunca saklansın. Düşmanlar çalıdaki oyuncunun yerini bilmesin: son gördükleri yere gitsinler, orada bulamazlarsa etrafta arasınlar.
- Sitenin tanıtım bölümü eski sürümlerden kalma; güncellenecek.

Yapılan: harita 35, en çok 6 düşman ve 3 Avcı, parça başına 2 hasar eşiği, son görülen yer + arama + ateş sesi + 9 sn sessizlikte ipucu, Avcı yalnızca 5,5 kare içinden atılan mermiden kaçar, 7 kareden uzaktan vurulunca siper alır; boss canı %8–11 düştü, çarpma ve mermiler sertleşti, oyuncu mermisi boss mermisini düşürmüyor, takılma düzeldi; düşman mermisi kırmızı-turuncu yuvarlak, oyuncununki uzun kapsül; birleşim kartta ve açılınca etkisini yazar; site tanıtımı, boss görselleri ve ekran görüntüleri yenilendi; Rehber metinleri güncellendi. Ana oturumun eklediği: boss savaşında canı düşük oyuncuya Tamir kiti (kullanıcıya soruldu). Ölçümler `docs/BALANCE.md`.

## Sonraki içerik sürümü (planlandı)

- Serbest Mod (sandbox): tank, kartlar, güç, boss ve harita seçilir; rekora sayılmaz.
- Diep.io'daki Arena Closer benzeri ek boss: çok zeki ve çok güçlü; şimdilik yalnızca Serbest Mod'da. Önerilen ad Kapatıcı (onay bekliyor): mat siyah, uzun tek namlu, kırmızı göz; hile yapmaz (yalnız gördüğünü ve duyduğunu bilir), tepki Avcı'nın yarısı, öne nişan, yakın mermiden kaçar ama saldırırken kaçamaz, kaçış yolunu keser, savaşta oyuncunun alışkanlığını öğrenir; saldırılar Kesin Atış, Sekme Atışı, Kesme Hamlesi, Havan, Kapanış (90 sn'den sonra her 30 sn'de kenar çeliği bir kare içeri yürür); her saldırıdan sonra ~1 sn tam hasar alır; tek zorluk seviyesi.
- Ağır Topçu: Kar bölgesinin (21–30) yeni düşmanı (kullanıcı onayladı). Mermisi birkaç vuruşla düşürülebilir, ikinci atışı uzun sürer.
- Daha fazla kart/özellik: oyun çabuk tekrara biniyor.

## Bölgeler ve görkemli bosslar (taslak, 20 Kasım 2026)

Kullanıcının istekleri (20 Kasım 2026):

- Boss çeşidi artsın: her düşman türünün kendi boss'u olsun (Komutan normal tankın boss'u gibi). Canı artırılmış normal düşman değil, ayrı boss.
- Bosslar sade değil, görkemli olsun.
- Hades'e benzer bir yapı.
- Oyun 40. dalgada bitmez; zamanla yeni içerik (bölge, boss) eklenir.
- Boss görselleri başka bir yapay zekâ modeline tasarlatıldı (`docs/img/bosslar-gorsel.png`): Komutan; Sarı Fırtına (Hızlı'nın boss'u, Çöl); Demirkök (Ağır'ın boss'u, Orman); Kırağı (Avcı'nın boss'u, Kar); Son Hisar (son boss, Şehir). Mekanikleri Claude tasarladı (aşağıdaki "Ayrıntılı tasarım" maddesi).
- **Boss etabı:** boss savaşı kendi etabında geçer; sahada sadece boss var, başka düşman tankı gelmez (takviye yok).
- **Uzun savaş:** boss savaşları uzun sürecek (öneri: Komutan 3–4 dakika, bölge bossları 4–6 dakika, Son Hisar 6–8 dakika; botla ölçülecek).
- **Düz arena olmasın:** boss arenalarında yıkılamaz (çelik) blok normal haritalardan çok daha fazla olacak; her boss'un elle tasarlanmış sabit arenası (öneri).
- **Komutan ana boss** (20 Kasım 2026): kendi arenası (Kışla), üç evresi ve kırılabilir parçası (komuta kulesi) olan büyük bir savaş; her bölgenin ortasında (5, 15, 25, 35) gelir ve her gelişinde yeni numaralar açar. Bir oyunda 8 büyük boss savaşı olur.
- **Nükleer bomba** (20 Kasım 2026): ekranı değil bütün haritayı vurur; normal dalgalarda haritadaki bütün düşmanları yok eder. Bosslara yüzde değil sabit, çok yüksek hasar verir (öneri: taban merminin 150 katı), ama tek başına öldürmez (can en az %10'da kalır); 3 sn sersemletir. Boss etabında sayaç boss'a verilen hasarla yavaş dolar.
- **Zırh ve ölüm** (20 Kasım 2026): her ana boss ölünce oyuncunun zırhı tamamen dolar; boss etabında ölmek oyunu bitirir.
- **Hasar görünümü** (20 Kasım 2026): isabetler boss'un üstünde görünür (kıvılcım, yanık izi); canın %80, 60, 40 ve 20'sinde bir parça kopar, %50'nin altında duman, %25'in altında alev; boss parça parça dağılır.
- Ayrıntılı tasarım (saldırılar, evreler, 5 arena haritası, bot kuralları): Claude'daki "Tank Arena: Boss mekanikleri" belgesi. Onarım boss etabında evre geçişlerinden ve kırılan parçalardan gelir.

Önerilen biçim (onay bekliyor):

- **4 bölge, her biri 10 dalga:** Çöl → Orman → Kar → Şehir (bugün harita 3 dalgada bir sırayla değişiyor). Her bölgenin kendi düşman türleri var; bölge sonunda o bölgenin boss'u gelir.
- **Boss yenilince o bölgenin düşmanları bir daha gelmez** (kullanıcının fikri); yeni bölge yeni türler getirdiği için oyun boşalmaz.
- **Bölge ortasında Komutan** (artık ana boss, yukarıya bkz.). Tank evrimi 5. ve 10. dalgada kalır (5'te Komutan, 10'da ilk bölge boss'u).
- **40'tan sonra ikinci tur:** aynı bölgeler, bossların daha zor sürümleriyle (Hades'teki Extreme Measures gibi); zorluk herkes için kendiliğinden artar, tek mod ilkesine uyar. Sıralama en yüksek dalga olarak kalır. Zamanla yeni bölgeler eklenebilir; ikisi birlikte olur.
- **Görkem:** giriş sahnesi (ekran sarsıntısı, siren, isim başlığı, duvarı yıkarak giriş, müzik değişimi), normal tankın 2–3 katı boyut, ayrı vurulabilen taretler, can eşiklerinde evreler (zırh düşer, duman, yeni saldırılar, son evrede öfke), birkaç saldırı sırayla, harita kullanımı (duvar yıkma, mayın, çelik bloklar; takviye tank yok), ölüm sahnesi (büyük patlama, kısa ağır çekim, ganimet). Komutan da bu seviyeye çıkar.
- **Görkemi kısmadan üç şart:** her saldırı önceden uyarır (Komutan'ın namlu parlaması gibi); boyut ve kamera telefon ekranına (390 px genişlik) göre ayarlanır; bot yeni saldırılardan kaçmayı ve taretleri vurmayı öğrenir, çünkü denge ölçümü bota dayanır.
- **Hades'ten alınmayacaklar:** Ceza Paktı (zorluk seçenekleri), silah çeşitleri, hikâye diyalogları.
- **Hades'e karşılık gelenler zaten var:** atölye kartları (lütuflar), birleşimler (ikili lütuflar), 1.6'daki Garaj (Gece Aynası).
- **Yeni düşman türleri:** bölgelere yetecek çeşit için 4–6 yeni tür ("Yeni düşmanlar" listesinden).
- **Sıra önerisi:** bölgeler ve bosslar sıralamadan (1.6) önce gelsin; sıralama açıldıktan sonra büyük denge değişikliği eski rekorları kıyaslanamaz yapar. İki sürüme bölünebilir: önce bölge yapısı ve ilk iki bölge, sonra son iki bölge.

## 1.6 – Hesap, sıralama, para (çevrimiçi)

(Bosslar 1.5 olarak çıktığı için çevrimiçi sürüm 1.6'ya, co-op 1.7'ye kaydı.)

- **Giriş:** Google hesabıyla (hesabı Google doğrulamış olur). Google, uygulama içi WebView'da girişi engeller (`disallowed_useragent`); APK'da giriş Chrome Custom Tab'da açılıp derin bağlantıyla oyuna döner. E-posta doğrulaması alan adı + e-posta servisi ister, şimdilik yok.
- Sıralamada oyuncunun seçtiği takma ad görünür (filtrelenir, benzersiz).
- **Sıralama:** en yüksek dalga; eşitlikte daha hızlı olan öne geçer. Dalga rekoruna göre rütbe: Er → … → General.
- **Para:** skor yerine; düşmanlar ve dalgalar kazandırır, Komutan ekstra. Sunucuda hesaplanır.
- **Garaj:** 4 kalıcı geliştirme (zırh, ateş gücü, hız, nükleer şarj), her biri 5 seviye. Toplam etki ~%20'yi geçmez; geçerse sıralama beceriyi değil oynanan saati ölçer.
- **Hile:** yayın sürümünden `#debug` API'si kaldırılır; sunucu her oyunun başlangıcını kaydeder, mantıksız sonucu reddeder. Sonra: sıralamanın tepesindeki oyunları sunucuda tekrar oynatarak doğrulama (oyunun sabit 1/60 adımı ve tohumlu rastgelelik gerekir).
- KVKK için kısa aydınlatma metni ve hesap silme düğmesi.
- Hesap zorunlu olunca oyun (APK dahil) internetsiz açılmaz.

## 1.7 – Co-op

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

Oyun başında tank seçimi (yerine evrim), aktif yetenek, elit düşmanlar, zorluk seçenekleri. ("Dört farklı boss" 20 Kasım 2026'da geri alındı; bkz. "Bölgeler ve görkemli bosslar".)

## Bekleyen küçük işler

- Yayın sürümünden hata ayıklama modunu kaldırmak (1.6'dan önce şart).
- Kısa telefonlarda yatay ekranda üst gösterge 740×360'ta %19,4 (hedef ~%18; 844×390'da %17,9 geçiyor). 1.4'ten beri böyle. Dar telefonda dikeyde de 360×740'ta %14,3, boss çubuğuyla %17,0 (390×844'te %12,6 ve %14,9 geçiyor); 1.5'te de aynı.
- Tank dengesi: 1.5 ölçümünde Üçlü ve Raylı Top baskın çıkıyor (`docs/BALANCE.md`).
- `/.well-known/security.txt` eklemek (kullanıcı "şimdilik dursun" dedi).
- Alan adı alınmadı; kullanıcı "almak istersek ayarlarız" dedi.
- Claude Code'a (bulut) taşımanın eksikleri, kullanıcı "şimdilik dursun" dedi: bulut ortamına kurulum betiği (Android SDK, Playwright) ve izinli alan adları (`dl.google.com`, canlı site); `build.sh` imza anahtarını ortam değişkeninden de okusun; tanıtım PDF'inin kaynağı repoya alınsın; panel işleri (Vercel Firewall) bulut oturumundan yapılamaz.
- ChatGPT/Codex bağlantısı: karar verilmedi. Seçenekler: Codex bulutu aynı repoya bağlanır, PR'lara `@codex review`; ya da yerelde Codex CLI + MCP. Codex kuralları `AGENTS.md`'den okur (repoda yok).
