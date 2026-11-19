# Denge ölçümleri

Yöntem: oyunun kendi otomatik pilotu (`window.__tank.sim`) `tests/balance_probe.py` ile oynar. Bot insan değildir; mutlak sayılar insanda farklı çıkar, ama aşağıdaki desen oyunun formüllerinden gelir.

```
python3 tests/balance_probe.py <survive|pressure> <random|offense> <en çok dalga> <tekrar>   # örn. survive random 40 20
python3 tests/balance_probe.py pressure random 25 1     # zırh sürekli dolar, dalga başına alınan hasar ölçülür
python3 tests/balance_report.py
```

## 1.2.1 sonuçları (18–19 Kasım 2026)

Her zorlukta 40 oyun: 20'si kartları rastgele, 20'si önce saldırı kartlarını seçerek; en fazla 40 dalga.

| Oyunun bittiği dalga | 1–4 | 5 (ilk Komutan) | 6–9 | 10 | 11–39 | 40'a ulaştı |
|---|---|---|---|---|---|---|
| Talim | 0 | 11 | 0 | 1 | 0 | 28 |
| Cephe | 1 | 26 | 4 | 1 | 1 | 7 |
| Kıyamet | 11 | 21 | 3 | 2 | 2 | 1 |

Oyunlar ya ilk Komutan'da bitiyor ya da tank durdurulamaz hale gelip sona gidiyor; arası neredeyse boş.

### Komutan duvarı
- Cephe'de 5. dalgaya gelen 39 oyunun 26'sı orada bitti. Ortalama alınan hasar 88, ortalama azami zırh 111.
- Komutan'ın canı 34 (temel mermi 1 hasar). O dalgadaki ortalama ateş gücüyle (saniyede 5,2) 6,5 saniye hiç ıskalamadan vurmak gerekiyor.

### Kartopu
- Kartlar birbirini çarpıyor: Büyük kalibre ×2 (4 seviye), Otomatik yükleyici atış aralığı ×0,88^L (5 seviyede ×1,89 atış hızı), Çift namlu ×2 → **7,6 kat** ateş gücü.
- Düşman tarafı: can ×(1 + max(0, w−6)·hpGrow) (Cephe 0,06 → 25. dalgada ×2,14); sayı `clamp(round((3+w+⌊w/2⌋)·count), 3, 24)` 14. dalgada tavan; ateş aralığı `max(0,6, 1−(w−1)·0,045)` 10. dalgada tavan; nişan hatası 9. dalgada tavan; hız +%3/dalga, 11. dalgada tavan.
- Sona ulaşan oyunlarda (Talim + Cephe), boss olmayan dalgalar:

| Dalgalar | Süre | Alınan hasar | Oyuncu ateş gücü | Dalgadaki düşman canı |
|---|---|---|---|---|
| 1–4 | 15,3 sn | 5,9 | 4,9 | 11,9 |
| 6–9 | 20,7 sn | 12,7 | 9,6 | 34,1 |
| 11–14 | 26,9 sn | 13,7 | 14,5 | 65,5 |
| 16–19 | 31,0 sn | 10,6 | 18,5 | 94,9 |
| 21–29 | 30,4 sn | 5,9 | 22,4 | 117,2 |
| 31–40 | 29,7 sn | 2,2 | 24,7 | 145,8 |

- Komutan dalgalarında alınan hasar: 5. dalga 36 → 10. 17 → 20. 7,9 → 30. 3,5 → 40. 0,4.

### Kart farkı
- Talim: saldırı önce seçen bot 20/20 sona ulaştı, rastgele seçen 8/20. Cephe: 6/20 ve 1/20.
- Mıknatıs, termal kamera, uzun etki, uzun namlu ve turbo motor savaşta az fark yaratıyor.

## 1.3 hedefleri

- Hiçbir dalga oyunların %25'inden fazlasını bitirmesin.
- Ortalama oyun 15–20. dalgaya gitsin; 40'a ulaşan oyunlar istisna olsun.
- Geç dalgalarda alınan hasar sıfıra inmesin; dalgalar yeni tür ve görevle zorlaşsın, can şişirmeyle değil.
- Kart seçimine göre fark azalsın ama sıfırlanmasın.

## 1.3 sonuçları (19 Kasım 2026)

Yöntem: tek kural seti (eski Cephe). 80 oyun, en fazla 40 dalga: 40'ı kartları rastgele, 40'ı önce saldırı kartlarını seçerek (`balance_probe.py survive`). Zırhın sürekli dolduğu `pressure` modunda 12 + 12 oyun. Düşman canı artık gerçek `SPECS` / `bossHp` değerlerinden okunuyor (eski sabit tablo Komutan için 34 diyordu). Ayar yaklaşık on turda yapıldı; ara turlar 15–20 oyunluk küçük ölçümlerdi, aşağıdaki tablolar son 40 + 40 ölçümden.

### Oyun nerede bitiyor
| Oyunun bittiği dalga | 1–4 | 5 (ilk Komutan) | 6–9 | 10 | 11–39 | 40'a ulaştı |
|---|---|---|---|---|---|---|
| Rastgele kart (40) | 1 | 1 | 13 | 5 | 17 | 3 |
| Önce saldırı (40) | 0 | 0 | 2 | 3 | 32 | 3 |

| | Ortalama bitiş dalgası | Ortanca | 40'a ulaşan | En çok oyun bitiren dalga |
|---|---|---|---|---|
| Rastgele | 14,9 | 10,5 | 3/40 (%8) | 7. dalga, 5/40 (%12) |
| Önce saldırı | 22,6 | 23,5 | 3/40 (%8) | 24. dalga, 3/40 (%8) |
| Hepsi | 18,8 | 15,0 | 6/80 (%8) | 1–4. dalgalar toplam 1/80 |

Başlangıçta (1.2.1 sonrası, aynı bot): rastgele ortalama 13,9 / ortanca 8, saldırı ortalama 27,9 / ortanca 37,5; rastgelede %45 oyun 5. dalgada bitiyordu. Kart farkı 14 dalgadan 7,7 dalgaya indi.

### Geç dalgalar hâlâ vuruyor (`pressure`, dalga başına alınan hasar)
| Dalgalar | 1–4 | 5–10 | 11–20 | 21–30 | 31–40 |
|---|---|---|---|---|---|
| Rastgele | 11,6 | 44,5 | 75,2 | 49,8 | 35,4 |
| Önce saldırı | 9,3 | 22,2 | 47,8 | 67,9 | 45,0 |

21–40. dalgalarda Komutan olmayan dalgaların ortalaması rastgelede 42,6, saldırıda 55,7 (hedef: en az ~15). Hasar sıfıra inmiyor; ama 21–30'dan 31–40'a doğru hafif düşüyor, çünkü kartlar bu aralıkta tamamlanıyor.

### Değişen sabitler (hepsi düşman tarafı)
- `BOSS_HP0` / `BOSS_HP_STEP` 22 / 12 -> 16 / 12: ilk Komutan duvar olmasın, sonraki gelişleri yine 12 can artar. Rehber metni güncellendi (16 isabet).
- Komutan ateş aralığı: ilk gelişinde x1,6, sonra x1,3, x1,2 ... (`1 + 0,6 / uğrama`): ilk karşılaşma adil, geç gelişler tam hızda.
- Komutan eskortu `2 + w/5` -> `1 + w/5`, 20. dalgadan sonra ağır tank ve ek Avcı; Komutan dalgasında aynı anda canlı tank `3 + min(2, w/10)` -> `3 + min(5, w/8)`: geç Komutan'ı can değil kalabalık zorlaştırır.
- `hpGrow` 0,06 -> 0,04 ve tavan: can çarpanı en çok x1,75 (w25), sonra dalga başına +0,01 (w40'ta x1,9). Eskiden sınırsızdı (w40'ta x3).
- `waveMods` hız: tavan +%30 (w11) -> 10. dalgadan sonra dalga başına +%1,5 daha, en çok +%60.
- `waveMods` ateş aralığı: 10. dalgada 0,6'da duruyordu; artık 0,035/dalga ile 10'a kadar, sonra 0,009/dalga, taban 0,35. Düşman ilk atışı da bu çarpanla gelir.
- `waveMods` nişan hatası taban 0,035 -> 0,012 (10. dalgadan sonra yavaşça), öngörü (`lead`) 0,85 -> 1,0 (22. dalgaya kadar).
- `waveMods` hasar: 13. dalgadan sonra +%2/dalga, en çok +%60 (eskiden sabit).
- `waveMods` avcı kaçışı (`dodge`) 0,65 -> dalga başına +0,01, tavan 0,85 (artık `RULES.dodge` taban değer).
- `waveMods` yeni `pace` (yeni düşmanların kapıdan çıkma aralığı çarpanı): 10. dalgadan sonra azalır, 25. dalgadan sonra daha hızlı, en az 0,25.
- `waveMods` yeni `drop` (düşen güçlendirme çarpanı): 10. dalgadan sonra 1 -> 0,5; geç dalgada sürekli kalkan alınıp hasarsız kalınmasın diye.
- `buildRoster`: ağır tank payı tavanı %30 -> %45, Avcı payı %22 -> %35, keşif tankı payı 20. dalgadan sonra azalır; sayı tavanı 24 -> 24 + (w-20)/2; aynı anda canlı tank 13. dalgadan sonra +1, her 5 dalgada bir daha, +6'ya kadar; 20. dalgadan sonra çıkış kapılarından oyuncuya en yakın üçü seçilir.
- Dalga arası onarım (`heal`) 25 -> 10. dalgadan sonra dalga başına 1 azalır, en az 8.
- Probe: `window.__tank` artık `SPECS` veriyor; `balance_report.py` ortalama/ortanca bitiş, 40'a ulaşma ve en kötü dalga payını da yazıyor.

### Hedefler
Dört hedef de tutuyor: hiçbir dalga oyunların %25'ini bitirmiyor (en kötü %12), 1–4. dalgalar %1, ortalama 18,8, 40'a ulaşan %8, geç hasar sıfıra inmiyor, saldırı kartı hâlâ ortalamada 7,7 dalga önde. Hedef listesi değişmedi.

### Not: bot insan değil
Bot tek hedefe ateş eden, rastgele yürüyen basit bir pilot; mermiden kaçmaz, siper kullanmaz, kartları kendi kuralıyla seçer. Geç dalgalarda düşmanların çoğu daha ateş etmeden ölüyor; insan oyuncu daha az ateş gücüyle ama kaçarak oynar. Mutlak sayılar (ortalama 18,8 dalga gibi) insanda farklı çıkar, 40 oyunluk örnekte ortalama yaklaşık ±2,5 dalga oynar. Bu sayılar yön gösterir, hüküm değildir; asıl ayar gerçek oyuncu verisiyle yapılmalı.

## 1.4 sonuçları (19 Kasım 2026)

Yöntem: 10 tank, nükleer bomba açık (bot, ekranda en az 3 düşman ya da Komutan varken kullanır), en fazla 40 dalga, tohumlu rastgelelik (`balance_probe.py survive <strateji> 40 <n> all on <tohum>`; koşu i, `all` ile tank i mod 10'u hedefler: std, ikiz, nisanci, makineli, uclu, cift, rayli, obus, alev, sarapnel). Son ölçüm: 250 oyun rastgele kart (tank başına ~25) + 100 oyun önce saldırı (tank başına 10), iki işlem paralel, toplam ~10 dk. Ara turlar 100 + 100 oyunluk `exp` koşularıydı (bellekte sabit değiştirerek). `pressure` modunda 20 oyun, 30 dalga. Bir tank kimliği o tankı hedefleyen koşudur; tier 1 hedefi 10. dalgada evrilmeden kalır, böylece tier 1 ölçülür. `std` hiç evrilmez; yalnızca 1.3 referansıdır (gerçek oyunda evrim akışı bunu imkânsız kılar).

### Oyun nerede bitiyor
| Oyunun bittiği dalga | 1–4 | 5 (ilk Komutan) | 6–9 | 10 | 11–39 | 40'a ulaştı |
|---|---|---|---|---|---|---|
| Rastgele kart (250) | 0 | 16 | 57 | 7 | 134 | 36 |
| Önce saldırı (100) | 0 | 2 | 23 | 2 | 71 | 2 |

| | Ortalama bitiş | Ortanca | 40'a ulaşan | En çok oyun bitiren dalga |
|---|---|---|---|---|
| Rastgele | 18,1 | 13 | 36/250 (%14) | 9. dalga, %11 |
| Önce saldırı | 14,6 | 13 | 2/100 (%2) | 13. dalga, %13 |
| Hepsi | 17,1 | 13 | 38/350 (%11) | 1–4. dalgalar 0/350 |

Komutan dalgalarında ölüm %4 (1051 dalga), diğer dalgalarda %5,5. Ölçüm gürültüsü büyük: oyunlar ya 6–13'te biter ya 40'a gider (iki tepeli dağılım), tank başına 25–36 oyunda ortalama yaklaşık ±3 dalga oynar.

### Tank başına (survive, nükleer açık)
| Tank | Oyun | Ortalama bitiş | Ortanca | 40'a ulaşan | En kötü dalga |
|---|---|---|---|---|---|
| Standart (referans) | 36 | 15,2 | 11 | %8 | 8 (%19) |
| İkiz | 36 | 17,6 | 13 | %8 | 11 (%17) |
| Keskin Nişancı | 36 | 15,0 | 13 | %6 | 13 (%14) |
| Makineli | 36 | 18,5 | 13,5 | %11 | 13 (%14) |
| Üçlü | 36 | 19,9 | 12 | %22 | 9 (%17) |
| Çift Yön | 34 | 15,9 | 12,5 | %12 | 13 (%18) |
| Raylı Top | 34 | 19,5 | 13 | %24 | 9 (%15) |
| Obüs | 34 | 15,9 | 13,5 | %0 | 8 (%18) |
| Alev Topu | 34 | 14,0 | 9,5 | %0 | 9 (%18) |
| Şarapnel | 34 | 19,5 | 15,5 | %18 | 14 (%12) |

Baskın tank denetimi (grup ortalamasının ±3 dalga ya da ±%20'si): tier 1 grup ortalaması 17,0, sınır ±3,4, hepsi içinde; tier 2 grup ortalaması 17,5, sınır ±3,5, hepsi içinde (Üçlü 19,9 ve Raylı 19,5 en üstte, Alev 14,0 en altta). Standart (15,2) tier 1 ortalamasının (17,0) altında, evrim hafif yarar sağlıyor. `balance_report.py` denetimi artık Standart'ı ayrı karşılaştırıyor (eskiden tier 1 grubuna katıp Keskin Nişancı'yı yanlış "dışarıda" gösteriyordu).

### Nükleer bomba
Dalga başına 0,28 kullanım (hedef ~0,33): 1–9. dalgalarda 0,23–0,24, 10–19'da 0,33–0,36, sonrasında 0,30–0,33. Erken dalgalarda bot kaç düşman görünce basacağını bekliyor (en az 3); küçük dalgalarda bomba dolu bekliyor. Komutan dalgalarında 0,26. Bomba Komutan'ı öldürmüyor (`NUKE_BOSS_CUT`), Komutan dalgalarında ölüm oranı diğerlerinden düşük kaldı.

### Geç dalgalar hâlâ vuruyor (`pressure`, 20 oyun, dalga başına alınan hasar)
| Dalgalar | 1–4 | 6–10 | 11–20 | 21–30 |
|---|---|---|---|---|
| Rastgele | 12,2 | 47,0 | 59,0 | 59,1 |

31–40 `pressure` ile ölçülmedi (süre); `survive` koşularında 40'a ulaşanlarda 31–40. dalga hasarı düşük kalıyor (rapor tablosu).

### Birleşimler
Birleşimler ayrı ölçülmedi: bot kartları kendi önceliğiyle seçiyor, birleşim kasıtlı aramıyor; `SYN_K` değişmedi. Testler (`check_syn.py`) etkilerin çalıştığını doğruluyor; kart seçimi etkisini büyütüp büyütmediği gerçek oyuncu verisiyle bakılmalı.

### Değişen sabitler (tank sabitleri önceki ajandan, düşman ve bomba bu turdan; eski -> yeni)
Önceki ajan (kimse Standart'a dokunmadı):
- İkiz `dmg` 0,58 -> 0,42 (önce 0,46, bu turda 0,42): çift mermi baskındı; sersemletme süresi `tr.stun` 0,5 -> 0,3, yeni `tr.stunCd` 1,5 (sersemlik bitince 1,5 sn yeniden sersemletmez; boss/tank sürekli kilitlenmesin). Metin: "0,3 sn" (blurb, ROADMAP).
- Keskin Nişancı `hpMul` 0,9 -> 1, `speedMul` 0,85 -> 0,9, `dmg` 3 -> 1,9 (önce 2, bu turda 1,9), `cool` 0,9 -> 0,43, `botRange` 560 -> 250: yavaş ve iri atış yerine daha sık ve hafif atış; bot uzaktan vurup tank ölçeğinden fazla kazanıyordu.
- Makineli `dmg` 0,55 -> 0,95 (önce 0,9, bu turda 0,95), `tr.heatUp` 0,05 -> 0,04: yetersizdi (ısınma zaten ateş hızını artırıyor).
- Üçlü `dmg` 0,4 -> 0,27 (önce 0,36, bu turda 0,27): delici orta mermi ve üç mermi yakında çok fazla vuruyordu; %56 40'a ulaşıyordu.
- Çift Yön `dmg` 0,61 -> 0,67.
- Raylı Top `hpMul` 0,9 -> 0,95, `speedMul` 0,85 -> 0,9, `dmg` 4,5 -> 2,6 (önce 3, bu turda 2,6), `cool` 1,08 -> 0,85, `botRange` 520 -> 300.
- Obüs `dmg` 4 -> 3,5 (önce 3,2, bu turda 3,5), `cool` 1,09 -> 0,8, `tr.area` 60 -> 70, `botRange` 400 -> 300: bot Obüs'ü hafife alıyordu.
- Şarapnel `dmg` 0,36 -> 0,36 (önceki ajan 0,4'e çıkarmıştı, bu turda 0,36'ya geri alındı: üst gruptaydı).
- Alev Topu ve SYN_K değişmedi.

Bu tur (düşman ve bomba):
- `NUKE_WAVES` 3 -> 2,5: bomba ~0,25 yerine ~0,28 kullanım/dalga; hedef 0,33'e yetmedi, küçük dalgalarda bot beklediği için (bkz. aşağı).
- `waveMods` `hp`: 25. dalgadan sonra `+0,01 / dalga` -> 20. dalgadan sonra `+0,09 / dalga` (w40'ta can çarpanı x1,75 + 1,8 = x3,55): 40'a ulaşan oyunlar çok fazla ve geç dalgalarda hasar neredeyse sıfırdı; nükleer bomba ve kartlar geç dalgayı hasarsız geçiriyordu. Tank sayıları tek başına yetmezdi: geç dalgadaki gücü kartlar ve bomba veriyor, tankın payı küçük.
- `waveMods` `dmg`: 25. dalgadan sonra ek `+0,04 / dalga` (aynı neden; tek başına etkisi küçük).

### Testler
Eski sabitleri yazan testler güncellendi: `check_tanks.py` (İkiz sersemlik 0,3 sn, Makineli soğuma eşiği 0,3), `check_tier2_d1.py` (Üçlü dps oranı 0,81, Çift Yön 1,21), `check_tier2_d2.py` (Raylı 0,92, Obüs 1,31 dps oranı; Obüs alanı 70, Patlayıcı ile 105).

### Hedefler
Tutanlar: hiçbir dalga %25'i bitirmiyor (en kötü %13), 1–4. dalgalar 0/350, ortalama 17,1, geç dalgalar hasar veriyor (21–30'da 59), baskın tank yok. Tutmayanlar: 40'a ulaşma rastgelede %14 (hedef ~%10; hepsi birlikte %11). Nükleer 0,28 (hedef ~0,33). Standart tank ölçümlerde 1.3'ten daha uzun gidiyor (rastgele %8 ulaşma, ortalama 15,2): bomba onu da güçlendirdi.

### Not: bot insan değil
1.3 notları geçerli. Ek olarak: bot bombayı yalnızca ekranda ≥3 düşman varken ya da Komutan canlıyken basıyor, insan stratejik tutar. Bot Obüs'ün mesafe ayarını ve Raylı Top'un lazerini insan gibi kullanamaz, Alev Topu'nu ise yakın dövüşte fazla iyi kullanır; tank sıralaması yön gösterir, hüküm değildir. Ölçüm gürültüsü (25–36 oyun) ±3 dalga; ince ayar için yeterli değil.
