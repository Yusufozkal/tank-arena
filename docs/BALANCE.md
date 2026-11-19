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
