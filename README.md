# Tank Arena

Dalga dalga gelen düşman tanklarına karşı ayakta kaldığın, her dalgadan sonra tankını atölyede yükselttiğin bir tank oyunu.

- **Tarayıcıda oyna:** `/oyna/`
- **Android:** [TankArena-1.4.apk](https://github.com/Yusufozkal/tank-arena/raw/main/TankArena-1.4.apk) (indirme GitHub üzerinden)

## Klasörler

| Yol | İçerik |
|---|---|
| `game/index.html` | Oyunun kaynağı: tek HTML dosyası |
| `site/` | Yayındaki site (Vercel yalnızca bu klasörü yayınlar), `tools/build_site.py` üretir |
| `android/` | Android uygulamasının kaynağı ve `build.sh` |
| `TankArena-1.4.apk` | Android uygulaması (Vercel'e yüklenmez, GitHub'dan iner) |
| `tools/` | Siteyi, görselleri ve oyun verisini üreten araçlar |
| `tests/` | Tarayıcıda çalışan oyun testleri ve denge ölçümü |
| `docs/` | Yol haritası, denge bulguları, yayın ve güvenlik notları |
| `CLAUDE.md` | Claude Code için proje kılavuzu |
| `vercel.json` | Güvenlik başlıkları, önbellek kuralları, eski APK bağlantıları için yönlendirme |

Site statik dosyalardan oluşur; `main` dalına her gönderimde Vercel `site/` klasörünü yayınlar.
