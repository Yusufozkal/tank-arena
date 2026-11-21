# Bosslar ve parça hasarı: uygulama şartnamesi

Kaynak: Claude'daki "Tank Arena: Boss mekanikleri" belgesi (kullanıcıyla birlikte, 20 Kasım 2026). Sayılar başlangıç önerisidir; boss canları ve süreler botla ölçülüp ayarlanır. Ajanlar yalnızca görevlerinin bölümünü okur.

## 1. Ortak kurallar

### Boss etabı
- Akış: atölye → kısa karartma → boss'un kendi arenası (bölgenin temasıyla) → giriş sahnesi (~3 sn) → savaş.
- Sahada yalnızca boss ve oyuncu; takviye tank yok. Boss'un kendi taretleri, mayınları ve mermileri savaşın parçası.
- Kamera geri çekilir (yakınlık 0,85, Keskin Nişancı'daki gibi). Boss ekran dışındaysa kenarda kırmızı ok.
- Giriş sahnesi bir kez izlendikten sonra dokununca geçilir (cihazda saklanır).
- Boss etabında ölmek oyunu bitirir (zaten öyle).
- Ana boss (Komutan dahil) ölünce oyuncunun zırhı tamamen dolar, sonra "<Ad> ganimeti" kartları gelir (bugünkü "Komutan ganimeti" gibi).

### Bölgeler ve boss dalgaları
- Harita teması 10 dalgalık bloklar: 1–10 Çöl, 11–20 Orman, 21–30 Kar, 31–40 Şehir (sonra yeniden Çöl).
- Boss dalgaları her 5 dalgada bir: 5, 15, 25, 35 Komutan; 10 Sarı Fırtına, 20 Demirkök, 30 Kırağı, 40 Son Hisar. Henüz yapılmamış boss'un dalgasında geçici olarak Komutan gelir.
- Tank evrimi 5. ve 10. dalgadaki boss'tan sonra (bugünkü gibi).

### Uyarı dili (bütün bosslarda aynı)
1. **Parlama:** namlu ya da taret parlar → düz atış. 0,45 sn; ağır top 0,8 sn.
2. **Kırmızı çizgi:** yerde çizgi → o çizgi boyunca hücum ya da ışın. En az 1 sn; son 0,3 sn çizgi koyulaşır ve artık dönmez.
3. **Kırmızı daire:** yerde dolan daire → oraya düşen mermi ya da patlama. 1,2 sn; Obüs işaretiyle aynı görünüm.
4. **Büyüyen halka:** boss'un çevresinde, dalganın nereye kadar gideceğini gösteren halka → şok dalgası. 1,2 sn.
5. **Ses ve ok:** büyük saldırılarda yükselen uyarı sesi; saldıran boss ekran dışındaysa kenar oku yanıp söner.
- Çelik her zaman korur: çizgiler, ışınlar ve şok dalgaları çeliğe çarpınca durur. Havan mermileri (kırmızı daire) duvarların üstünden düşer.

### Evreler, parçalar, sersemleme
- Komutan ve bölge bossları 3 evre (%100–66, %66–33, %33–0); Son Hisar 4.
- Evre geçişi 1,5 sn: boss hasar almaz, saldırmaz; zırh plakası düşer, duman, ekran sarsıntısı. Her geçişte bir onarım kiti düşer (+35 zırh, Tamir ile aynı).
- Parça: kendi canı olan taret/modül/kule. Kırılınca o parçanın saldırısı biter, bir güçlendirme düşer (çoğunlukla Tamir).
- Sersemleme: bazı durumlar boss'u sersem bırakır (üstünde kıvılcım); sersemken %50 fazla hasar alır.

### Hasar görünümü (boss parça parça dağılır)
- İsabet: vurulan yerde kıvılcım ve kısa beyaz parlama; gövdede küçük yanık izi (en fazla 12, en eskisi silinir).
- Canın %80, 60, 40, 20'sinde bir parça kopup yere düşer (çamurluk, zırh plakası, anten, egzoz kapağı); birkaç saniye yerde kalır.
- %50 altında duman, %25 altında alev; en çok vurulan taraf daha çok tüter.
- Kırılan parçanın yerinde kararmış, kıvılcımlı yuva kalır. Evre geçişinde büyük bir zırh plakası düşer, siluet değişir.
- Hepsi kodla çizilir.

### Can ve nükleer bomba
- Boss etabında onarım yalnızca evre geçişlerinden ve kırılan parçalardan gelir.
- Nükleer bomba bütün haritayı vurur (yalnızca ekranı değil). Normal dalgada haritadaki bütün düşmanlar yok olur.
- Bosslara yüzde değil sabit hasar verir (öneri: taban merminin 150 katı; ölçümle ayarlanır). Boss'u tek başına öldürmez: canı en az %10'da kalır. Boss'u 3 sn sersemletir; sahadaki boss mermilerini ve mayınlarını siler.
- Boss etabında sayaç boss'a verilen hasarla yavaş dolar: bir savaşta en fazla bir kez. Etaba dolu sayaçla giren iki kez kullanabilir.

### Süre hedefi (ortalama kart, ortalama oyuncu; bot ölçer)
Komutan 3–4 dk, bölge bossları 4–6 dk, Son Hisar 6–8 dk.

### Arena haritaları
21×21 kare; oyunun harf kodları: `S` çelik, `B` tuğla, `W` su, `G` çalı, `.` boş, `X` boss başlangıcı, `P` oyuncu başlangıcı. Her arenada oyuncu her yere ulaşabiliyor, boss sıkışmıyor (betikle kontrol edildi).

## 2. Parça hasarı: palet, namlu, motor

Öldürmeyen bir isabet, geldiği yöne göre düşmanın bir parçasını bir süreliğine bozar, sonra kendini onarır: **yandan vur → palet; önden vur → namlu; arkadan vur → motor.**

### Normal düşmanlar
- Palet kırılır (yandan): 2,5 sn hareket edemez; taret döner ve ateş eder. Palet halkaları saçılır, kıvılcım.
- Namlu tutukluk (önden): 2 sn ateş edemez; namlu eğilir ve tüter.
- Motor hasarı (arkadan): 3 sn yarı hız; egzozdan kara duman.
- Onarım görünür: bozuk parçanın üstünde küçük onarım halkası dolar. Onarılan parça 1,5 sn bozulamaz.
- Yalnızca doğrudan mermi isabetleri sayar; bir atıştaki birden fazla mermi (İkiz, Üçlü, Şarapnel) tek kırılma. Alev ve Obüs havanı parça bozmaz.
- 20. dalgadan sonra onarım %30 hızlı.
- Oyuncunun tankı etkilenmez.

### Bosslar
- Paletlerin kendi canı var (her biri boss canının ~%8'i). Kırılınca boss 4 sn hareket edemez; onarılır, palet yeniden dolar; ikinci kırılma için %50 daha dayanıklı.
- Uyarı sırasında bozmak saldırıyı iptal eder: kırmızı çizgi varken paleti kırılan boss hücum edemez; parlama sırasında namlusu tutukluk yapan boss o atışı yapamaz.
- Namlular isabet biriktirir; eşik dolunca o namlu 3 sn susar.
- Bot: hücum çizgisi görünce mümkünse yandan vurup paleti kırmayı dener; paleti kırık boss'un arkasına dolanır.

## 3. Komutan (5, 15, 25, 35. dalga)

Normal tankın boss'u; ana boss. Kendi arenası, üç evresi, kırılabilir parçası var; her gelişinde güçlenir ve yeni numaralar açar.

- Görünüş: bugünkü Komutan büyütülüp zırhlanır: uzunluk 54 → 90, geniş zırh etekleri, üç namlu (ortadaki kalın), sırtında anten ve sancaklı komuta kulesi. Hız 45. Renkler: bordo #7d2431, koyu #4b131d, açık #ad4356, vurgu altın #f2c14e. Görsel: `docs/img/bosslar-gorsel.png`.
- Giriş: borazan ve siren, sancak dalgalanır; kışlanın tuğla kapısını yıkarak çıkar.
- Parça: komuta kulesi (canın ~%10'u). Kule yaşadıkça topçu desteği; kırılınca sancak düşer, topçu desteği biter, güçlendirme düşer.

Arena: Kışla (bölgenin temasıyla).
```text
.....................
.SS..BBBB...BBBB..SS.
.SS..BSSB.X.BSSB..SS.
.....BBBB...BBBB.....
.....................
..S...............S..
.....................
......BBB...BBB......
.....................
.SS...............SS.
.SS.......S.......SS.
.....................
.....................
......BBB...BBB......
.....................
..S...............S..
.....................
.....BBBB...BBBB.....
.SS..BSSB...BSSB..SS.
.SS..BBBB.P.BBBB..SS.
.....................
```

- Evre 1 (%100–66): **Üçlü atış** (0,45 sn parlama, 3 mermilik yelpaze); **Ezme hücumu** (kırmızı çizgi 1 sn, 6 karelik hücum, tuğla yıkar, çeliğe çarparsa 2 sn sersem); **Topçu desteği** (kule yaşarken, oyuncunun çevresinde 3 kırmızı daire 1,2 sn).
- Evre 2 (%66–33), omuz zırhları düşer: **Yaylım** (üçlü atış üç kez, yelpaze dönerek, her birinin parlaması var); **Bombardıman hattı** (arenayı boydan boya kesen bir sıra kırmızı daire 1,2 sn, sonra hat boyunca patlamalar; hatta bir boşluk bırakılır).
- Evre 3 (%33–0) "Son emir", zırh etekleri düşer, hız +%30: **Beşli atış**; **Şok dalgası** (her ezme hücumu sonunda 3 karelik halka, 1,2 sn).
- Her gelişte büyür: 5. dalga yalnızca üçlü atış + ezme hücumu + evre 3 hızlanması (ilk boss, kolay). 15'ten itibaren kule ve topçu desteği; 25'ten yaylım ve bombardıman hattı; 35'ten beşli atış ve şok dalgası. Canı her gelişte artar; süre hedefi 3–4 dk.
- Ölüm: sancak devrilir, zincirleme patlama, "KOMUTAN DÜŞTÜ"; zırh dolar, Komutan ganimeti.
- İkinci tur (ileride): bütün numaralar açık, iki kule.
- Bot: önce kule; parlamada nişan hattından çık; daire ve çizgiden kaç; bombardıman hattında boşluğa git; sersemken ateş et.

## 4. Sarı Fırtına (Çöl, 10. dalga)

Hızlı'nın boss'u. Hücumlarıyla tuğlaları yıkan hızlı boss; çeliğe çarptırılınca savunmasız. İlk bölge boss'u, öğretici: ilk iki hücumun çizgisi 1,3 sn görünür.

- Görünüş: ok biçimli gövde, tek namlu, arkada iki ok işareti, yanlarda turuncu egzoz. Uzunluk 72, genişlik 48. Hız 175. Renkler: hardal #cf9f30, koyu #8c691b, açık #efca60, vurgu turuncu #f08a2c.
- Giriş: kum hortumu, toz dağılır; önündeki tuğla duvarı yıkarak dalar. Rüzgâr uğultusu.

Arena: Kum Çukuru.
```text
.....................
.SS...............SS.
.SS.......X.......SS.
.....................
....S...SBBBS...S....
.....................
.....................
.....................
....S...S...S...S....
GG.................GG
WW........S........WW
GG.................GG
....S...S...S...S....
.....................
.....................
.....................
....S...SBBBS...S....
.....................
.SS...............SS.
.SS.......P.......SS.
.....................
```

- Evre 1: **Çevik atış** (oyuncunun 5–7 kare uzağında daire çizerek döner, üçlü seri; 0,45 sn parlama); **Kum hücumu** (kırmızı çizgi 1 sn, çizgi boyunca çok hızlı hücum, tuğla yıkar; oyuncuya çarparsa ağır hasar + geri itme; çeliğe ya da harita kenarına çarparsa 2,5 sn sersem).
- Evre 2, egzozlar yanar, hız +%15: **Çift hücum** (ikinci çizgi ilki biterken, 1 sn); **Kum izi** (hücum yolunda 4 sn kalan şerit, oyuncuyu %35 yavaşlatır).
- Evre 3 "Fırtına": **Rüzgâr** (her 12 sn, ekranda oklar 1,5 sn önceden, 5 sn tankları sürükler); **Üçlü hücum** (sersemleme 1,8 sn).
- Parça yok; zayıf noktası sersemleme anı.
- Ölüm: dönerek yavaşlar, kum hortumu söner, "SARI FIRTINA DİNDİ".
- İkinci tur (ileride): hücum çeliğe ilk çarpışta seker (yön 0,5 sn önce çizilir), ikinci çarpışta sersemler.
- Bot: çizgiye dik kaç, çeliği araya al; sersemse ateş et; kum şeridinden uzak dur; rüzgâra karşı sür.

## 5. Demirkök (Orman, 20. dalga)

Ağır'ın boss'u. Uzunluk 110, genişlik 96, hız 38; gri #60656c / #3b3f44 / #8c929a, vurgu kırmızı #c9402d. Çift ana namlu, iki yan taret (her biri ~%12 can; ikisinden biri yaşadıkça gövde yarı hasar alır), arkada egzoz ızgarası.

Arena: Orman Kalesi.
```text
GGG...............GGG
GG.................GG
..........X..........
.....................
....SS.........SS....
....SSBBB...BBBSS....
.....B.........B.....
.....B.SS...SS.B.....
.....B.SS...SS.B.....
GG.................GG
GG.................GG
GG.................GG
.....B.SS...SS.B.....
.....B.SS...SS.B.....
.....B.........B.....
....SSBBB...BBBSS....
....SS.........SS....
.....................
..........P..........
GG.................GG
GGG...............GGG
```

1.5.5'ten beri **kale** (kullanıcı: "Komutan ile Demirkök birbirine benziyor"). Komutan hücum eden ve topçu çağıran boss olarak kalır; Demirkök kovalamaz, ezip geçmez, havan atmaz.

- Mevziler: K (10,2), B (4,10), D (16,10); her birinde 11–13 sn kök salıp bekler, sonra hız 60 ile açık karolardan yavaşça başka mevziye geçer (tuğla ezmez; oyuncuya 4,5 kareden yakın mevziyi seçmez). Yürürken ağır top susar. Savaşın yaklaşık üçte ikisi mevzide geçer (evre 3'te hep sabit).
- Evre 1 "Kale": yan taretler ayrı nişan alır, her birinin kendi kırmızı gözü (0,45 sn, son 0,12 sn kilit): biri oyuncuya, öbürü gideceği yere; ikincisi 0,3 sn sonra başlar, tek taret kalınca sırayla. Ağır top (0,8 sn parlama, iki büyük mermi, tuğlayı tek isabette kırar).
- Evre 2 "Kök ağı": kök fışkırması: Demirkök'ten oyuncuya, oyuncunun 0,8 kare ötesine kadar giden çatlak çizgisi (1 sn, son 0,3 sn kilit), sonra çizgide bir kez 12 hasar ve itme; çizginin ilk 5 karesinde 6 sn duran kök duvarı (tankı ve mermiyi durdurur); bekleme 5,5 sn, aynı anda en fazla 16 kök karesi. Deprem kalır, yalnız mevzideyken.
- Evre 3 "Kök salma": ortaya yürür, gövdeyi oyuncuya çevirip sabitlenir; her saldırıda iki çatlak, duvar 6 karelik ve 9 sn, bekleme 2,6 sn; döner ateş (360° tarama, önünde 1 sn tarama çizgisi); arkası (egzoz) 1,5 kat hasar alır.
- Adalet: kök oyuncunun gövdesine değen karoya çıkmaz; egzozun hemen arkasındaki karolara çıkmaz; yerleştirmeden önce taşma doldurma: oyuncu ulaşabildiği alanın en az yarısına ve Demirkök'ün arkasına hâlâ ulaşabilmeli, yoksa duvarın sonundan karo düşülür.
- Can 1200 + 32/dalga (bomba savaşta kullanılınca orta setle ~4,9 dk).
- Ölüm: "DEMİRKÖK DEVRİLDİ". İkinci tur: her taret kırıldıktan 30 sn sonra bir kez yeniden kurulur, evre 2'de iki çatlak.

## 6. Kırağı (Kar, 30. dalga)

Avcı'nın boss'u. Uzunluk 90, genişlik 44, hız 125; mor #6c4fa3 / #432f6b / #9d84d1, vurgu nane #7ef0d0. Saklanır: çalıda görünmez, açıkta 3 sn görünmez olabilir; görünmezken karda 2 sn kalan palet izi ve hava titremesi. Ateş edince 1,5 sn görünür ve yavaşlar.

Arena: Donmuş Göl.
```text
SS.................SS
SS.................SS
.......S..X..S.......
...GG...........GG...
...GG...S...S...GG...
.....................
.....S...GGG...S.....
.........GGG.........
....S...........S....
..GG....WWWWW....GG..
..GG..S.WWWWW.S..GG..
..GG....WWWWW....GG..
....S...........S....
.........GGG.........
.....S...GGG...S.....
.....................
...GG...S...S...GG...
...GG...........GG...
.......S..P..S.......
SS.................SS
SS.................SS
```

- Evre 1 "Pusu": keskin atış (nane lazer 1 sn, son 0,25 sn kilit; çelikte biter); saklanma (en fazla 4 sn); kaçınma.
- Evre 2 "Suretler": iki buz kopyası (lazer tutar, ateş etmez, iz bırakmaz, hafif parlar, tek isabette kırılır, kırılınca yakını 2 sn yavaşlatır); çift atış.
- Evre 3 "Ayaz": göl donar ve geçilebilir olur; don dalgası (her 10 sn, cephe çizgisi 1,5 sn önce; zemin 6 sn kırağı: oyuncu %30 yavaş, Kırağı hızlı).
- Ölüm: "KIRAĞI ERİDİ". İkinci tur: üç suret, kopyaların izi 0,5 sn.
- 1.5.5'te uygulandı, şartnameden sapma yok. Belirlenenler: can 1800 + 45/dalga; açıkta 3 sn görünmezlikten sonra 2 sn görünür; ateşten sonra hız ×0,55; suret kırılınca 2,4 kare içini 2 sn yavaşlatır; kırağıda Kırağı ×1,4; evre eşikleri öbür bosslar gibi [66,33]. Bot görünmez boss için değişiklik istemedi; zararsız uyarı çizgileri `nodanger` ile bot tehlike haritasına girmez.

## 7. Son Hisar (Şehir, 40. dalga)

Son boss. Uzunluk 120, genişlik 110, hız 30; koyu gri #4a4e55 / #2c2f34 / #7a808a, vurgu kehribar #f2a530. Çift uzun ana top, iki yan soğutma modülü (her biri ~%10 can; ikisi de yaşarken gövde hasarın %30'unu alır), kehribar çekirdek.

Arena: Şehir Meydanı.
```text
SSS...SSS...SSS...SSS
SSS...SSS...SSS...SSS
SSS...SSS...SSS...SSS
.....................
..........X..........
.....................
SSS...SS.....SS...SSS
SSS...SS.....SS...SSS
SSS...............SSS
.....................
...BBB....S....BBB...
.....................
SSS...............SSS
SSS...SS.....SS...SSS
SSS...SS.....SS...SSS
.....................
..........P..........
.....................
SSS...SSS...SSS...SSS
SSS...SSS...SSS...SSS
SSS...SSS...SSS...SSS
```

- Evre 1 "Kuşatma" (iki modül kırılana kadar): ağır top (0,8 sn); havan yağmuru (6 daire).
- Evre 2 "Nişancı" (%60'a kadar): çift lazer; üçlü yelpaze.
- Evre 3 "Hücum" (%60–30): sokak hücumu (çizgi 1,2 sn, barikat yıkar; çelik binaya çarparsa 2 sn sersem + 3 geçici tuğla enkaz); her hücum sonunda 3,5 karelik şok dalgası.
- Evre 4 "Son direniş" (%30–0): meydanda durur, çekirdek açılır (2 kat hasar); döner ateş + her 8 sn şok dalgası ve havan; saldırılar %25 hızlı.
- Ölüm: uzun zincirleme patlama, ağır çekim, "SON HİSAR DÜŞTÜ", ardından "İKİNCİ TUR" ve Çöl'e dönüş.

## 7b. Kapatıcı (ek boss, şimdilik yalnızca Serbest Mod)

Kullanıcının isteği: diep.io'daki Arena Closer benzeri, ana oyunda olmayan, "çok zeki ve çok güçlü" bir boss. Görünüşü Arena Closer'ın kopyası değil, kendi tasarımımız. Ad önerisi Kapatıcı (kullanıcı itiraz etmedi).

- Görünüş: kullanıcının onayladığı görsel `docs/img/kapatici-gorsel.png` (yukarıdan, burnu yukarı): mat siyah açılı zırh, iki yanda kanat gibi zırh plakaları ve beyaz ışık çizgileri, ortada kırmızı göz, iki yanında kısa beyaz ışık, uzun tek namlu ve kalın namlu ağzı, arkada altıgen motor kapağı, koyu paletler, kalın siyah kontur. Kanvas çizimi buna sadık kalır. Boyu normal tankın ~1,3 katı; en hızlı oyuncu tankından ~%40 hızlı.
- Arena: kendi 21×21 arenası, nötr koyu metal zemin, orta yoğunlukta çelik, birkaç çalı. Bossun gövdesine göre her cebe ulaşılabilir (`check_boss_reach`).
- Zekâ, hile yok: yalnızca gördüğünü ve duyduğunu bilir (normal düşmanların görüş/duyma kuralları, daha geniş görüş açısı). Tepki süresi Avcı'nın yarısı. Öne nişan: oyuncunun hızı ve dönüşü hesaba katılır. Üstüne gelen mermiden yana kayar, ama saldırı yaparken kaçamaz. Oyuncunun kaçış yolunu keser, köşeye sıkıştırır. Savaş içinde öğrenir: oyuncunun en çok kaçtığı yönü, uzaktan mı yakından mı vurduğunu sayar; uzaktan vurana koşar, yakına gelenden çekilip uzun namluyla vurur. Çalıdaki oyuncuyu göremez; son yönünü hesaplayıp oraya gelir, çalıları mermiyle tarar.
- Saldırılar:
  1. Kesin Atış: 0,6 sn kırmızı çizgi, çok hızlı tek mermi; zırh + canın ~%40'ı.
  2. Sekme Atışı: duvardan bir kez seken mermi; köşe arkasını bulur. Uyarı: kesik kırmızı çizgi.
  3. Kesme Hamlesi: kaçış yolunun önüne geçip çarpar (çizgi uyarısı).
  4. Havan: oyuncu 3 sn'den uzun saklanırsa bulunduğu yere (kırmızı daire).
  5. Kapanış: 90. saniyeden sonra her 30 sn'de kenardaki çelik halka bir kare içeri yürür; alan daralır (kenar okları ve uyarı sesiyle).
- Açık an: her saldırıdan sonra ~1 sn namlu kızarır; bu sırada kaçamaz ve tam hasar alır. Diğer zamanlarda gövdesi mermilerin yarısını sektirir (yarı hasar).
- Zorluk: tek seviye. Hedef: Serbest Mod'da tam güçlendirilmiş tank ~%30–50 kazanır; ortalama kurulum neredeyse hiç.
- Ölçüm: boss_probe'a "tam güç" seti eklenir.
- 1.5.4'te uygulanan: can sabit 1600, gövde yarıçapı 27, hız 230, mermi 430 (Kesin Atış ×2,3). Hasar oyuncunun azami canına oranlı: Kesin %40, Sekme/çarpma/Havan %30. Görüş 12 kare, 200° koni; çalıda 2,3 kare; tepki 0,25 sn; duyma 9,6 kare ±3. Kaçınma 0,85 (saldırı ve açık anda yok). Kapanış 90/120/150/180 sn, her biri 2 sn uyarılı. Arena `ARENAS.kapanis` (Şehir teması, koyu zemin). Serbest Mod'da dalga gücü `sandboxWave` yoksa 30.

## 9. Bölge düşmanları ve Tamirci (1.5.1, Orman)

### Bölge kuralı (kullanıcının fikri)
- Her düşman türü bir boss'a bağlıdır. O boss bu oyunda yenilince o türler oyunun geri kalanında gelmez:
  - Sarı Fırtına (10) → Hızlı (Keşif tankı)
  - Demirkök (20) → Ağır ve Tamirci
  - Kırağı (30, ileride) → Avcı
- Normal tank her zaman gelir (Komutan'ın türü; Komutan her bölgede döner).
- Yeni bölgenin ilk dalgasında başlığın altında kısa bir satır: "ORMAN BÖLGESİ · Keşif tankları artık gelmiyor" gibi.
- Bir boss dalgası henüz kendi boss'u yerine Komutan'la oynanıyorsa (bugün 30 ve 40) o boss'a bağlı türler kalkmaz.
- Geçici durum: Kar ve Şehir bölgelerinin kendi yeni türleri gelene kadar oralarda tür azdır; zorluk can artışıyla değil sayı, isabet ve ateş hızıyla korunur.

### Tamirci (Orman'ın yeni türü)
- Görünüş: orta boy tank (uzunluk 36), namlu yerine sarı vinç kolu ve anahtar; zeytin yeşili #6f8a3a, koyu #46591f, açık #9fbf5a, vurgu sarı #f2c14e. Silahı yok. Kırmızı haç gibi tıbbi işaret kullanılmaz.
- Can 3, hız 95, puan 200, güçlendirme düşürme şansı 0,3.
- Davranış: 6 kare içindeki en hasarlı müttefiki (can oranı düşük ya da parçası bozuk) seçer; onun 2–4 kare arkasında, müttefiki kendisiyle oyuncu arasında tutacak yerde durur; çalıyı tercih eder. Oyuncu 4 kareden yakınsa ve görüyorsa kaçar.
- Onarım: hedefe yeşil onarım ışını (görünür çizgi); saniyede 0,5 can verir (en fazla hedefin tam canı); bozuk parçayı (palet, namlu, motor) hemen onarır. Bir hedefi aynı anda tek Tamirci onarır. Işın açıkken ve kapandıktan sonra 1 sn Tamirci çalıda da görünür.
- Geliş: ilk kez 13. dalgada tek tane ve "Yeni düşman: Tamirci" ipucu; sonra payı 0,03 + 0,015·(dalga − 13), en fazla 0,15; sahada aynı anda en fazla 2.
- Bot: Tamirci görünüyorsa önce onu vurur.

### Ağır Topçu (Kar'ın yeni türü, 1.5.5)

Kullanıcının fikri: "mermileri birkaç vuruşta etkisiz hâle getirilebilir ama ikinci mermiyi atması uzun sürer".

- Görünüş: kısa, geniş, koyu kahverengi gövde, kalın tek namlu, turuncu vurgular. Can 5, hız 40.
- Ateş: 0,8 sn namlu parlaması (son 0,25 sn nişan kilitli), düz giden büyük ve yavaş mermi (yarıçap 11, 150 px/sn, 28 hasar × dalga hasar çarpanı, 6 sn ömür); çarpınca 58 px patlar (doğrudan isabet değilse çevreye %60), tuğla kırar, çelik kırmaz. Yeniden doldurma 6 sn (±%8).
- Düşürme: hasarı ne olursa olsun 3 oyuncu mermisiyle havada patlar; her isabette çatlar; patlayınca +25 puan, "Mermi düştü +25". Delici mermi bir kez sayılır, Sekme normal sayılır, Obüs mermisi üstünden geçer, alev dokunmaz, nükleer patlatmadan siler.
- Konum: oyuncudan ~5 kare tutar, 3,3 kareden yakında geri çekilir; ateşten sonra 3,6–5,6 kare uzakta yan mevziye geçer. Her zaman oyuncunun gerçek ekranındaki ateş penceresinin içinde kalır (dar telefonda da ateş edebilsin).
- Geliş: 23. dalgadan, yalnız Kar'da; ilki tek ve "Yeni" ipucuyla; payı min(0,12; 0,03 + 0,01·(dalga − 23)); sahada en fazla 2; boss etabında yok. Kırağı yenilince bir daha gelmez (`REGION_BAN.kiragi`: Avcı + Topçu).

## 1.5.5.1'de değişenler (kullanıcı: "bosslar kolaylaştı baya", hepsi, Kapatıcı dahil; nedenler yeni kartlar ve zayıf saldırılar)

- Bosslara karşı kartlar: Eğimli zırh boss savaşında hiç sektirmez; Refleks boss savaşında iki kat bekler (6/4 sn) ve `heavy` boss mermisinden kaçmaz; Antitank boss parçasına ek hasar vermez (yan/arka bonusun yarısı kalır).
- `BOSS_TUNE` (`11a`): boss başına saldırı arası çarpanı, boss mermisi hızı, doğrudan isabet hasarı, ek öne nişan (`e.lead`). Uyarı süreleri ve `TELE_MIN` değişmedi.

| Boss | Saldırı arası | Mermi hızı | Hasar | Öne nişan |
|---|---|---|---|---|
| Komutan 5 (öğretici) | ×0,85 | ×1,1 | ×1,25 | +0,15 |
| Komutan 15+ | ×0,7 | ×1,25 | ×1,75 | +0,3 |
| Sarı Fırtına | ×0,75 | ×1,25 | ×1,35 | +0,3 |
| Demirkök | ×0,6 | ×1,25 | ×2,8 (taban hasarı çok düşüktü) | +0,4 |
| Kırağı | ×0,65 | ×1,25 | ×1,55 | – |
| Kapatıcı | ×0,4 | ×1,4 | ×1,7 | – |

- Can: Sarı Fırtına 620 + 31/dalga (önce 460 + 23), Kırağı 2300 + 55/dalga (önce 1800 + 45), Kapatıcı 2400 (önce 1600). Demirkök'te taret atışı +1 (5/6), ağır top mermisi 0,7 hız.

## 1.5.5'te değişenler

- Demirkök kale oldu (bölüm 5). Kırağı ve Ağır Topçu eklendi (bölüm 6 ve 9).
- Boss etabında nükleer bomba boss canının %34'ü kadar hasarla dolar, savaş başına tek dolum; orta setle savaşın %40–45'inde hazır (önceden %69–86).
- Eğimli zırh normal boss mermisinde yarı şansla çalışır; `heavy` boss mermileri (ağır top) ve Topçu mermisi hiç sekmez. Antitank mermisi bosslarda hasar bonusunun yarısını, parçaya 1,5 kat hasarı verir.

## 1.5.3'te değişenler

- Arena cepleri kapandı (Kışla 96, Kum 20, Kale 12 karede oyuncu girebiliyor, boss ulaşamıyordu). Kural: çelik bloklar arası ve blok–kenar arası boşluk 0 ya da en az 3 kare. Test `check_boss_reach.py`.
- Boss 4 sn oyuncuya ulaşamazsa kavisli saldırıya geçer (`arc: true`: Komutan topçu ve bombardıman, Demirkök havan; Sarı'da yok).
- Komutan canı: 5→185, 15→960, 25→1130, 35→1350, sonrası +25/dalga.

## 1.5.2'de değişenler (oyuncu geri bildirimi)

- Canlar %8–11 düştü: Komutan 5→185, 15→550, 25→840, 35→1090, sonrası +25/dalga; Sarı Fırtına 460 + 23·(dalga − 10); Demirkök 1020 + 27·(dalga − 20). Kullanıcı canın çok azaltılmasını istemedi; asıl istek vuruşun görünmesiydi: üstte büyük boss çubuğu, yüzde, giden can kısa süre açık renkte kalır, evre çizgileri.
- Çarpma hasarı: Komutan 40, Sarı Fırtına 30, Demirkök 46 (uyarılar aynı).
- Boss mermileri: oyuncunun mermisi artık boss mermisini düşürmez (asıl "ulaşmıyor" sebebi buydu); nişan kısmen önden (`def.lead` 0,35); ömür 3,2 sn. Mermi başına hasar düşürüldü (Komutan 9, Sarı 4, Demirkök 6), hız arttı (400 / 450 / 370).
- Savaşta canı %55'in altındaki oyuncuya ~35 sn'de bir Tamir kiti düşer (yerde kit yoksa).
- Takılma: boss yol alanı gövde yarıçapına göre (`bossFitMap`); alan dışına itilen boss en yakın uygun kareye döner, ilerleyemezse yana kayar. Test `check_boss_stuck.py` (3 sn'den uzun takılma yok).

## 1.5.1'de uygulanırken değişenler

- Demirkök canı 1150 + 30·(dalga − 20); taretler canın %12'si. Ağır top mermisi önündeki tuğlayı tek isabette kırar. Kökler oyuncuyu kapalı bir cebe hapsetmez.
- Bölge kuralının telafisi: kalkan her tür için dalga +%12 kalabalık, yeniden dolum ×0,93, nişan hatası ×0,90.
- Tek kalan Tamirci 2 sn sonra kaçmayı ve saklanmayı bırakır, oyuncunun ~5,5 kare yakınına gelir.
- "İkinci tur" maddeleri (Demirkök taretlerinin yeniden kurulması, çift deprem) henüz yok.

## 1.5'te uygulanırken değişenler

- Normal düşman parça hasarı süreleri 1,5 / 1,2 / 1,8 sn (palet / namlu / motor); şartnamedeki 2,5 / 2 / 3 sn oyunu fazla kolaylaştırdı.
- Sarı Fırtına'ya parça hasarı için bir namlu tanımlandı (`barrels`); kırılabilir parçası yine yok. Saldırı arası çarpanı 1,5.
- Nükleer bomba bosslara min(0,3·can, 150 + 6·max(0, dalga − 15)) hasar verir (sabit 150 ilk Komutan'ın canının %75'i ediyordu). Boss hasar almazken (giriş, evre geçişi, ölüm) bomba harcanmaz; geri sayımdayken boss hasar almaz hale gelirse hasar sonradan uygulanır.
- 20, 30, 40. dalgalarda kendi bossları yapılana kadar Komutan gelir.
- Canlar ve ölçümler `docs/BALANCE.md`, "1.5 sonuçları".

## 8. Bot ve ölçüm
- Her uyarı işareti (çizgi, lazer, daire, halka, tarama, don cephesi, kum şeridi) bota "tehlikeli bölge" olarak verilir; bot en yakın güvenli kareye gider, sonra ateş eder. Hedef önceliği: parça → sersemlemiş boss → boss.
- Boss ölçümü: her boss için zayıf, orta ve güçlü kart setleriyle 20'şer savaş; ortalama süre ve ölüm oranı. İlk boss'ta az ölüm, sona doğru artar.
- Her boss 10 tankın hepsiyle yenilebilmeli; hiçbir tankta süre hedefin iki katını geçmemeli.
- 390×844 dikey ekranda boss ve uyarılar ekran görüntüsüyle kontrol edilir.
