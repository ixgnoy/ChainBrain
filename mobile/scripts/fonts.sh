#!/bin/sh
# Fetches Clash Display and General Sans from Fontshare (Indian Type Foundry, ITF Free Font License) into assets/fonts.
# The licence lets us embed the fonts in our own apps but not redistribute the files through a repository, so they are
# git-ignored and fetched here on `npm install` (postinstall). Safe to run again: it skips when every file is present.
set -e
cd "$(dirname "$0")/.."
dest=assets/fonts
need="ClashDisplay-Medium ClashDisplay-Semibold ClashDisplay-Bold GeneralSans-Regular GeneralSans-Medium GeneralSans-Semibold GeneralSans-Bold"
missing=0
for f in $need; do [ -f "$dest/$f.ttf" ] || missing=1; done
[ $missing -eq 0 ] && exit 0

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
for family in clash-display general-sans; do
  if ! curl -fsSL -o "$tmp/$family.zip" "https://api.fontshare.com/v2/fonts/download/$family"; then
    echo "fonts.sh: could not download $family from Fontshare (offline?). Run \`sh scripts/fonts.sh\` once online; the app needs assets/fonts/*.ttf to bundle." >&2
    exit 0
  fi
  unzip -q -o "$tmp/$family.zip" -d "$tmp/$family"
done
mkdir -p "$dest"
for f in $need; do
  src=$(find "$tmp" -path "*/WEB/fonts/$f.ttf" | head -1)
  [ -n "$src" ] || { echo "fonts.sh: $f.ttf not found in the Fontshare download" >&2; exit 1; }
  cp "$src" "$dest/$f.ttf"
done
cp "$(find "$tmp/clash-display" -name FFL.txt | head -1)" "$dest/LICENSE-FFL.txt"
echo "fonts.sh: Clash Display and General Sans ready in $dest"
