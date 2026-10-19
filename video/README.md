# ChainBrain demo video

The 4:46 FinTechathon demo video (v4: the AI Card, with a "how it works" X-ray): `out/InternationalAI-ChainBrain-DemoVideo.mp4`, with its `.srt` and `poster.jpg`.

- Script and shot list: [SCRIPT.md](SCRIPT.md); the approved storyboard and why: [STORYBOARD-v4.md](STORYBOARD-v4.md) (the earlier [v3](STORYBOARD-v3.md)). Credits and licences: [CREDITS.md](CREDITS.md).
- The edit: `remotion/src/edit.json` (scenes, footage cuts, voice anchors). `tools/layout.py` turns it into `remotion/src/timeline.json` (scene times on the 120 BPM grid, voice start times); `tools/cues.py` adds the music cues.
- Shots and camera moves: `remotion/src/Main.tsx`; the story scenes: `remotion/src/scenes/V3.tsx` and `V4.tsx` (the X-ray board, the eight layers, stolen keys, the HKMA's four ideas).
- Storyboard frames: `cd remotion && node scripts/stills.mjs <out_dir> 0.5 <t1> <t2> …` renders many stills with one bundle.

## Rebuild

```bash
sh video/build.sh setup
```

```bash
sh video/build.sh
```

`setup` installs the Python venv (Kokoro, faster-whisper), the Kokoro model, the CC0 orchestral samples and the Remotion packages. The second command rebuilds everything after the recordings: brand marks, team photo crops, UI stills and crops, voice, word timings, the edit layout, music cues, score, mix, picture, subtitles and the final MP4.

## Voice (ElevenLabs)

The narration uses ElevenLabs (`eleven_v4`, voice Sarah; settings in `tts/eleven.json`).

- Put your key in `video/.env` as one line, `ELEVENLABS_API_KEY=...` (git-ignored), or export it in the shell.
- `.venv/bin/python tts/eleven.py check` shows the plan, characters used and the models the key can use.
- `.venv/bin/python tts/eleven.py voices` lists voices; `tts/eleven.py audition OUT_DIR id,id,...` reads one line in each.
- Lines are cached by what was sent, so a rebuild only spends characters on lines that changed.
- Without a key, the build falls back to Kokoro (offline) with Whisper word timings.

## The team's own voice (optional)

- `out/recording-kit.html` lists every line with a target length, how to record, and the file names.
- Put the section files in `footage/voice/` (01-hook.m4a to 09-team.m4a) and the on-camera clips in `footage/face/` (`intro.mov`, `close.mov`, optional `team.mov`).
- `.venv/bin/python tools/voice.py --dry` reports what it found; without `--dry` it does three things:
  - splits each file into its lines (a retaken line keeps its last reading) and cleans the audio;
  - times every word with Whisper, and trims the clips to their words;
  - writes the clips' lines (`i1`, `z1`, `t1`) into `tts/lines.json`.
- `build.sh` then uses these recordings instead of the synthetic voice.
- The edit adds the clip scenes by itself (`face` scenes in `remotion/src/edit.json`). Without clips, the video is unchanged.

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

**Team photos** (`footage/teammate/*`, git-ignored): `tools/team.py` makes 3:4 portrait crops framed alike (eye line at 38% of the height, face about 57% of the width; face positions measured by hand per photo).

**Explorer stills** (`footage/probe/ex-*.png`): `node tools/console-rec.mjs tools/shots/explorer-stills.json` screenshots the hosted explorer at 2x; `tools/crops.py` cuts the transaction panels.

## Honesty rules the edit follows

- Phone shots carry a "recorded on our test setup" tag (the app's built-in network), and the video never zooms in on a demo hash.
- Every hash the video points at is a real transaction on the hosted chain, from `docs/evidence-fisco-railway.json` and `docs/redteam/hosted-proof.json` (the 7 rejected payments).
- The hook's facts are sourced on screen: the 4 May 2026 Morse-code wallet drain (OECD AI Incidents Monitor, about US$150,000) and Accenture's June 2026 survey (74% / 9%). The dots and dashes are an illustration, not the attacker's post.
- The AI Card is a drawn illustration of the idea; it carries the hosted proof card's real address tail (0x33Dc…3356) and rules. The X-ray board is a diagram of the real system (`docs/submission/ChainBrain-technical-overview.pdf`, pages 1-8); the app screens beside it and everything else are the app's real screens and the explorer's real pages. No code is shown.
- The HKMA beat paraphrases four ideas from Carmen Chu's remarks of 16 Oct 2026 (hkma.gov.hk) and says ChainBrain "covers" them; on screen it is called our mapping, not a regulatory approval.
- Proof numbers match the submitted PDFs: 63 attacks with HK$0 lost, 462 automated tests, 7 of 7 forbidden payments rejected on the hosted chain.
