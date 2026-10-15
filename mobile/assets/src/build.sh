#!/bin/sh
# Writes the SVG sources (gen.py) and renders the app icon, Android adaptive layers, splash mark and favicon (needs rsvg-convert:
# `brew install librsvg`). The mark is ChainBrain's four tiles (hatch, vermillion, ink, hatch: pockets walled off from each
# other), drawn like src/ui/BrandMark.tsx, on the warm canvas (design-system/chainbrain/MASTER.md).
set -e
cd "$(dirname "$0")"
python3 gen.py
out=..
rsvg-convert -w 1024 -h 1024 icon.svg -o $out/icon.png
rsvg-convert -w 1024 -h 1024 splash.svg -o $out/splash-icon.png
rsvg-convert -w 512 -h 512 android-foreground.svg -o $out/android-icon-foreground.png
rsvg-convert -w 512 -h 512 android-background.svg -o $out/android-icon-background.png
rsvg-convert -w 432 -h 432 android-monochrome.svg -o $out/android-icon-monochrome.png
rsvg-convert -w 48 -h 48 favicon.svg -o $out/favicon.png
