# ChainBrain demo video

The 4-minute FinTechathon demo video: `out/InternationalAI-ChainBrain-DemoVideo.mp4`, with its `.srt` and `poster.jpg`.

- Script and shot list: [SCRIPT.md](SCRIPT.md). Credits and licences: [CREDITS.md](CREDITS.md).
- Edit timing (scenes, voice cues, music cues): `remotion/src/timeline.json`.
- Shots and camera moves: `remotion/src/Main.tsx`.

## Rebuild

```bash
sh video/build.sh setup
```

```bash
sh video/build.sh
```

`setup` installs the Python venv (Kokoro, faster-whisper), the Kokoro model, the CC0 orchestral samples and the Remotion packages. The second command rebuilds everything after the recordings: voice, word timings, score, mix, picture, subtitles and the final MP4.

## Recordings (not in git; `video/footage/`)

**Phone (`footage/cfr/autoplay.mp4`, `footage/cfr/brain.mp4`)**

- The mobile app ran in Expo Go on the iOS Simulator from the production bundle (`.claude/launch.json` → `mobile-prod`, `exp://127.0.0.1:8092`).
- Demo mode was on: Settings → Demo network.
- Face ID enrolment was off, so cheques show the slide.
- The Expo tools button was hidden.
- The status bar was set to 9:41.
- Recorded with `tools/rec.sh`, then converted to 30 fps:

```bash
ffmpeg -i raw.mp4 -vf fps=30 -c:v libx264 -crf 17 -pix_fmt yuv420p out.mp4
```

- `autoplay.mp4` is one take of the app's own auto-play: long-press the chat header for 1.5 s.
- `brain.mp4` is the Brain tab, the Brain map, and a card's Brain page with forget.

**Console and explorer (`footage/raw/console-*.mp4`, `footage/raw/explorer.mp4`)**

- Recorded with `node tools/console-rec.mjs tools/shots/<shot>.json <out.mp4>`.
- The console used demo mode (`?server=builtin`). The explorer is the real hosted FISCO chain.

## Honesty rules the edit follows

- Phone and console shots carry a "built-in network · simulated chain" tag, and the video never zooms in on a demo hash.
- Every hash the video points at is a real transaction on the hosted chain, from `docs/evidence-fisco-railway.json`.
