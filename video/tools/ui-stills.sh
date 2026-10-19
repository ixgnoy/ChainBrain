#!/bin/sh
# Real app UI stills, cut from the phone recordings (built-in network), for the architecture act and overlays.
# usage: sh tools/ui-stills.sh   (from video/; needs footage/cfr/autoplay.mp4 and footage/cfr/brain.mp4)
set -eu
cd "$(dirname "$0")/.."
OUT=remotion/public/ui
mkdir -p "$OUT"
grab() { # name clip seconds
  ffmpeg -v error -y -ss "$3" -i "footage/cfr/$2.mp4" -frames:v 1 -q:v 2 "$OUT/$1.jpg"
}
grab home autoplay 355.0
grab question autoplay 45.0
grab paid autoplay 61.0
grab cheque autoplay 66.0
grab refused autoplay 87.5
grab replan autoplay 99.0
grab injection autoplay 116.0
grab blocked autoplay 130.0
grab data autoplay 136.0
grab admin autoplay 147.0
grab haggle autoplay 171.0
grab radar-card autoplay 205.0
grab radar-alert autoplay 214.0
grab sentinel autoplay 250.0
grab revoke autoplay 278.5
grab stopped autoplay 285.0
grab deadend autoplay 320.5
grab canvas autoplay 468.0
grab create autoplay 480.0
grab card-live autoplay 576.0
grab brain-map brain 50.0
grab brain-tab brain 24.0
grab decided brain 106.0
grab guarded brain 254.0
grab remembers brain 255.5
ls "$OUT" | wc -l
