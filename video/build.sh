#!/bin/sh
# Rebuild the ChainBrain demo video from source: voice, score, mix, picture, subtitles, final MP4.
#   sh video/build.sh setup   # once: Python venv, Kokoro model, CC0 orchestral samples, Remotion packages
#   sh video/build.sh         # everything after the recordings (needs video/footage/, see video/README.md)
set -eu
cd "$(dirname "$0")"
PY=.venv/bin/python
OUT=out/InternationalAI-ChainBrain-DemoVideo.mp4

if [ "${1:-}" = "setup" ]; then
  command -v uv >/dev/null || { echo "needs uv (https://docs.astral.sh/uv/)"; exit 1; }
  uv venv .venv --python 3.12
  uv pip install --python $PY kokoro-onnx soundfile numpy scipy faster-whisper soxr pillow
  mkdir -p tts/models
  [ -f tts/models/kokoro-v1.0.onnx ] || curl -L --fail -o tts/models/kokoro-v1.0.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
  [ -f tts/models/voices-v1.0.bin ] || curl -L --fail -o tts/models/voices-v1.0.bin https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
  if [ ! -d music/lib/instruments/vsco2ce ]; then
    mkdir -p music/.packs
    curl -L --fail -o music/.packs/instruments-vsco2ce.tar https://github.com/lemomo-ai/lemo-opuscar/releases/download/assets/instruments-vsco2ce.tar
    echo "231297103cb4a3123707ddb7b284e5ea3aed0b8d77c0b891360b4d3efe8b586f  music/.packs/instruments-vsco2ce.tar" | shasum -a 256 -c
    $PY -c "import tarfile,sys; tarfile.open(sys.argv[1]).extractall(sys.argv[2], filter='data')" music/.packs/instruments-vsco2ce.tar music/.packs/x
    mv music/.packs/x/core/audio/instruments music/lib/instruments
    rm -rf music/.packs
  fi
  (cd remotion && npm ci)
  exit 0
fi

mkdir -p out remotion/public/footage remotion/public/audio remotion/public/fonts
# brand fonts come from the phone app (git-ignored there too; mobile/scripts/fonts.sh fetches them)
for f in ../mobile/assets/fonts/ClashDisplay-*.ttf ../mobile/assets/fonts/GeneralSans-*.ttf; do cp -f "$f" remotion/public/fonts/; done
# footage: CFR copies of the recordings (see README for how they were made)
for f in footage/cfr/autoplay.mp4 footage/cfr/brain.mp4 footage/raw/console-judges.mp4 footage/raw/console-brain.mp4 footage/raw/explorer.mp4; do
  [ -f "$f" ] || { echo "missing $f: record it first (README.md)"; exit 1; }
  ln -f "$f" "remotion/public/footage/$(basename "$f")"
done
# brand marks (shared/brand + official files under reference/), then real app UI stills and crops for the story
# scenes (from the phone recordings and the hosted explorer)
sh tools/brand.sh
if [ -d footage/teammate ]; then $PY tools/team.py footage/teammate remotion/public/team; fi
sh tools/ui-stills.sh
[ -f footage/probe/ex-success.png ] || node tools/console-rec.mjs tools/shots/explorer-stills.json
$PY tools/crops.py
# voice: the team's own recordings when they're there (footage/voice, footage/face; tools/voice.py), else ElevenLabs
# when a key is set (shell or video/.env, see README), else offline Kokoro + Whisper word timings
if [ -n "$(ls footage/voice footage/face 2>/dev/null | grep -v ':$' | grep -v '^$')" ]; then
  $PY tools/voice.py
elif [ -n "${ELEVENLABS_API_KEY:-}" ] || grep -qsE '^[[:space:]]*(export[[:space:]]+)?ELEVENLABS_API_KEY=' .env; then
  $PY tts/eleven.py lines tts/lines.json remotion/public/audio/vo remotion/src/vo-words.json
else
  $PY tts/tts.py tts/lines.json remotion/public/audio/vo
  $PY tts/asr.py tts/lines.json remotion/public/audio/vo remotion/src/vo-words.json
fi
cp tts/lines.json remotion/src/vo-lines.json
# the edit: scene lengths from the footage cuts, voice-over start times (remotion/src/edit.json)
python3 tools/layout.py remotion/src/edit.json remotion/src/vo-words.json remotion/src/timeline.json
# music hit points follow the voice, then the score and the mix
python3 tools/cues.py remotion/src/timeline.json remotion/src/vo-words.json
# music and mix
$PY music/score.py remotion/src/timeline.json remotion/public/audio/score.wav
$PY tools/mix.py remotion/src/timeline.json remotion/public/audio remotion/public/audio/mix.wav
# picture (muted), then mux with the mix
(cd remotion && npx remotion render Main ../out/video-muted.mp4 --codec=h264 --crf=16 --concurrency=8 --muted)
ffmpeg -v error -y -i out/video-muted.mp4 -i remotion/public/audio/mix.wav -map 0:v -map 1:a -vf "noise=alls=2:allf=t" -c:v libx264 -crf 21 -preset slow -pix_fmt yuv420p -c:a aac -b:a 256k -movflags +faststart -shortest "$OUT"
python3 tools/srt.py remotion/src out/InternationalAI-ChainBrain-DemoVideo.srt
ffmpeg -v error -y -ss 26.0 -i "$OUT" -frames:v 1 -q:v 2 out/poster.jpg
ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT"
# last checks: length, format, loudness, peak, black, frozen picture, silence, subtitle speed
python3 tools/qc.py "$OUT" --srt out/InternationalAI-ChainBrain-DemoVideo.srt || echo "qc: fix the FAIL lines above before you submit"
echo "done: $OUT"
