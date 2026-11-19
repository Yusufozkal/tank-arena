#!/usr/bin/env bash
# Builds and signs the Tank Arena APK with the plain Android SDK tools (no Gradle).
#
#   android/build.sh
#
# Needs: ANDROID_HOME with build-tools/35.0.1 and platforms/android-35, a JDK (javac, keytool), python3.
# Version: android:versionCode / android:versionName in android/AndroidManifest.xml (bump both for a release).
# Output: android/out/TankArena.apk and a release copy TankArena-<versionName>.apk at the repo root,
#         which is the file players download from GitHub.
#
# Signing key: NOT in the repo. Every update must be signed with the same key or phones refuse to install it
# over the old app. Put the backed-up key in android/keystore/ (git-ignored) or point TANK_KEYSTORE and
# TANK_KEYSTORE_PASS_FILE at it. Never generate a new key for this app.
set -euo pipefail

APP="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(dirname "$APP")"
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/android-sdk}}"
BT="$SDK/build-tools/35.0.1"
JAR="$SDK/platforms/android-35/android.jar"
B="$APP/build"
KS="${TANK_KEYSTORE:-$APP/keystore/tankarena.jks}"
PASSFILE="${TANK_KEYSTORE_PASS_FILE:-$APP/keystore/password.txt}"
OUT_DIR="$APP/out"
OUT="$OUT_DIR/TankArena.apk"

VERSION_CODE=$(sed -n 's/.*android:versionCode="\([0-9]*\)".*/\1/p' "$APP/AndroidManifest.xml")
VERSION_NAME=$(sed -n 's/.*android:versionName="\([^"]*\)".*/\1/p' "$APP/AndroidManifest.xml")

[ -x "$BT/aapt2" ] && [ -f "$JAR" ] || { echo "Android SDK not found under $SDK (need build-tools/35.0.1 and platforms/android-35)." >&2; exit 1; }
if [ ! -f "$KS" ] || [ ! -f "$PASSFILE" ]; then
  echo "Signing key not found: $KS" >&2
  echo "Restore the backed-up key into android/keystore/ or set TANK_KEYSTORE and TANK_KEYSTORE_PASS_FILE." >&2
  exit 1
fi

rm -rf "$B" && mkdir -p "$B/classes" "$B/dex" "$OUT_DIR"

echo "== game into assets (fonts embedded, works offline)"
python3 "$APP/tools/build_assets.py"

echo "== resources ($VERSION_NAME, code $VERSION_CODE)"
"$BT/aapt2" compile --dir "$APP/res" -o "$B/res.zip"
"$BT/aapt2" link -o "$B/base.apk" -I "$JAR" --manifest "$APP/AndroidManifest.xml" -A "$APP/assets" \
  --min-sdk-version 24 --target-sdk-version 35 --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" "$B/res.zip"

echo "== java"
javac -source 8 -target 8 -bootclasspath "$JAR" -Xlint:-options -encoding UTF-8 -d "$B/classes" $(find "$APP/src" -name '*.java')
"$BT/d8" --release --min-api 24 --lib "$JAR" --output "$B/dex" $(find "$B/classes" -name '*.class')

echo "== package"
cp "$B/base.apk" "$B/unsigned.apk"
(cd "$B/dex" && zip -q -X "$B/unsigned.apk" classes.dex)
"$BT/zipalign" -f -p 4 "$B/unsigned.apk" "$B/aligned.apk"

echo "== sign"
"$BT/apksigner" sign --ks "$KS" --ks-key-alias tankarena --ks-pass "file:$PASSFILE" \
  --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --out "$OUT" "$B/aligned.apk"

echo "== verify"
"$BT/apksigner" verify --verbose "$OUT" | grep -E "Verifies|Verified using"
"$BT/apksigner" verify --print-certs "$OUT" | grep -m1 "certificate SHA-256"   # must stay 7fcc78e948478b37…
"$BT/zipalign" -c -p 4 "$OUT" && echo "zip alignment OK"
"$BT/aapt2" dump badging "$OUT" | grep -E "^package|targetSdk|application-label"

cp "$OUT" "$REPO/TankArena-$VERSION_NAME.apk"
ls -la "$OUT" "$REPO/TankArena-$VERSION_NAME.apk"
