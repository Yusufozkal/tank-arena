# Tank Arena

Dalga dalga gelen düşman tanklarına karşı ayakta kaldığın, her dalgadan sonra tankını atölyede yükselttiğin bir tank oyunu.

- **Tarayıcıda oyna:** `/oyna/`
- **Android:** [TankArena-1.2.apk](https://github.com/Yusufozkal/tank-arena/raw/main/TankArena-1.2.apk) (indirme GitHub üzerinden)

## Klasörler

| Yol | İçerik |
|---|---|
| `index.html` | Tanıtım sayfası |
| `oyna/index.html` | Oyunun kendisi, tek dosya (fontlar içinde) |
| `TankArena-1.2.apk` | Android uygulaması (Vercel'e yüklenmez, GitHub'dan iner) |
| `vercel.json` | Güvenlik başlıkları, önbellek kuralları, eski APK bağlantısı için yönlendirme |
| `.vercelignore` | Vercel'e yüklenmeyen dosyalar |
| `img/`, `fonts/` | Görseller ve yazı tipleri |

Site statik dosyalardan oluşur, derleme adımı yoktur. Vercel bu repodan doğrudan yayınlar.
