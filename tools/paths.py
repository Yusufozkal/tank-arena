"""Where things live in the repository. Build tools and tests import this instead of hard-coding paths."""
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
GAME_DIR = REPO / 'game'
GAME = GAME_DIR / 'index.html'          # the whole game: one HTML file, the source of truth
SITE = REPO / 'site'                    # built website; Vercel serves only this folder
TOOLS = REPO / 'tools'
RAW = TOOLS / 'raw'                     # full-quality screenshots the site images are cut from
ANDROID = REPO / 'android'
MANIFEST = ANDROID / 'AndroidManifest.xml'
TESTS = REPO / 'tests'
FONTS_CSS = TESTS / 'fonts' / 'fonts.css'   # Google Fonts CSS, answered locally so headless browsers need no network
FONTS_DIR = TESTS / 'fonts' / 'gstatic'
TMP = REPO / '.tmp'                     # scratch output (screenshots, probe results); git-ignored


def app_version():
    """versionName from the Android manifest: the single place the release number is set."""
    import re
    return re.search(r'android:versionName="([^"]+)"', MANIFEST.read_text(encoding='utf-8')).group(1)
