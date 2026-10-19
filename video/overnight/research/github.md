# GitHub survey: tools to improve the ChainBrain Remotion demo video

Date: 20 Oct 2026. Scope: study the six local video references and four local repos, then survey 2025-2026 GitHub for Remotion skills and templates, motion, bilingual captions and voice/mix processing. Seven repos cloned shallow into `reference/repos/` (git-ignored, nothing run). Nothing else in the repo changed, no commits.

## 0. What the pipeline already has (so we do not re-borrow it)

- Burned-in English subtitles with an optional Simplified Chinese line, `remotion/src/components/Subtitles.tsx` + `subs-zh.json`. Max 18 chars/s, 58 pages, `.srt` via `tools/srt.py`.
- Voice clean-up in `tools/voice.py`: `highpass=80, afftdn=nf=-28, acompressor` (only used for the team's own recordings; ElevenLabs lines are used as they are).
- `tools/mix.py`: per-line RMS levelling, 14 dB sidechain-style ducking, punch-through on key hits, two-pass `loudnorm` -14 LUFS / TP -1.5.
- Camera, whip transitions, kinetic text (`Main.tsx`, `components/Whip.tsx`, `Kinetic.tsx`), code-made score (`music/score.py`).
- Local ffmpeg has `arnndn`, `afftdn`, `deesser`, `speechnorm`, `sidechaincompress`, `loudnorm`. No install needed for any of the mix ideas below.

So the real gaps are: automated final QC, an explicit reading-time check for on-screen text, a de-esser/RNNoise option for the team's own voice, richer transition and shot vocabulary, a wider caption look, and a few craft rules.

## 1. Existing references (read-only, in `/reference/`)

| Reference | Licence | What it offers this video | Verdict |
|---|---|---|---|
| `videos/lemo-opuscar` (51 film styles in code) | MIT | `TECHNIQUE.md` pipeline (same shape as ours: one timeline, voice, music, foley, subs, mix, two-pass loudnorm). `core/render/readcheck.mjs`: reading-time check, every on-screen text block must stay fully visible for chars/15 (Latin) or chars/4.5 (CJK) + 1.5 s. `core/tts/asr_check.py`: Whisper re-transcribes each TTS line and compares it with the script (catches misread names such as "Hao Wen", "FISCO", "x402"). `core/audio/sfx.py` procedural foley. `core/post/crt.js` WebGL post (not our look). `DIRECTOR.md` / `styles/*/STYLE.md` direction docs. | High: borrow readcheck rule and asr_check idea |
| `videos/vox-director` (Atlas Cloud collage skill) | MIT | `SKILL.md` structure and `references/beat-layer.md`; `scripts/asr_beats.py` (transcript to beat map); `scripts/kenburns.py`. Everything else needs the paid Atlas Cloud API and paper-collage style. | Low |
| `videos/awesome-claude-5-5-videos` | CC BY 4.0 | `docs/production-brief.md` (copyable brief with a rights table and "what must remain exact", useful for our honesty rules), `docs/workflow-analysis.md`, `docs/visual-effects-fit.md`. Mostly a catalogue. | Low-medium (brief template) |
| `videos/awesome-opus5-5-videos` | MIT | 703 creator prompts under `prompts/`; browse for "explainer / launch / fintech" patterns. | Low |
| `videos/opus-video-prompts` | No licence file found (treat as read-only inspiration) | 18 full prompts, craft rules in README ("never set opacity/filter on a preserve-3d element", measure positions at runtime). | Low |
| `videos/PDoomVideo` | No licence file found | `ANIMATION_GUIDE.md` (one file per chapter, offline frame render), p5.brush watercolour. Wrong look for us. | Low |
| `repos/video/remocn` | MIT | 150+ copy-paste components. Captions: 30+ `caption-*` (karaoke, word-pop, stamp, redact, split-flap, timeline, speaker). Transitions: glitch-cut, grain-dissolve, dither-dissolve, focus-pull, fade-through. UI: `claude-chat`, `claude-code`, `chat-gpt`, `agent-run`, `check-list`, `github-stars`, `ecosystem-constellation`. `content/docs/craft/{anti-patterns,motion-principles,design-defaults}.mdx` (the "Sequence under-budgeted" class of bug). | Medium-high: craft docs now, components later |
| `repos/video/remotion-sparse` | Remotion licence (company licence: free for individuals and small teams, paid for companies of 4+; check before commercial use) | Official packages source: `light-leaks`, `motion-blur` (CameraMotionBlur, Trail), `transitions/presentations`, `rough-notation`, `starburst`, `svg-3d-engine`, `captions`. Read, do not copy. | Medium (reading) |
| `repos/video/template-three` | Remotion licence (MIT-style text) | Phone with a video as the screen in React Three Fiber; a 3D phone could replace flat phone frames in `components/Devices.tsx`. Risky tonight. | Low (after) |
| `repos/video/motion-canvas-examples` | MIT | Smooth parallax and logo animation in Motion Canvas (different engine). | Low |

## 2. New repos surveyed (stars as of today)

### Cloned (7)

All in `reference/repos/<name>`.

**1. remotion-dev/skills** (the official agent skills)
- https://github.com/remotion-dev/skills, 5,380 stars, pushed 19 Oct 2026. No LICENSE file in the repo; governed by Remotion's licence (see note above).
- Contents: `skills/remotion-best-practices`, `remotion-captions` (display, import SRT, transcribe), `remotion-markup` (`transitions.md` with TransitionSeries + overlays, `light-leaks.md`, `audio.md`, `audio-visualization.md`), `remotion-multimedia`, `remotion-render`, `remotion-studio`, `remotion-saas`, `remotion-interactivity`, `remotion-maps`, `remotion-upgrade`.
- Borrow: install as a Claude Code skill (or read `remotion-markup/transitions.md` and `light-leaks.md`) so the overnight agent writes idiomatic Remotion 4 code. `light-leaks.md` gives a `TransitionSeries.Overlay` light leak that does not shorten the timeline: a cheap gloss on the "drop" and "stricter" cuts in `Main.tsx`. `import-srt-captions.md` plus `@remotion/captions` `createTikTokCaptions` shows a standard page model to compare with our `Subtitles.tsx` pages.
- Effort: 10 min to install/read; 30-45 min to add one light-leak overlay.

**2. jincheng2026/jc-remotion-skills** (Chinese voice-over workflow with QC)
- https://github.com/jincheng2026/jc-remotion-skills, 14 stars, pushed 22 Aug 2026. Licence CC BY-NC 4.0 (non-commercial; fine for a hackathon video, but attribute it if we copy code; prefer re-implementing the checks).
- Contents: `scripts/qc-master.mjs` (post-render checks: decode integrity, 1080p30 metadata, audio/video length match, black frames, freeze frames via `freezedetect -50dB`, accidental hard cuts via `scdet`, dead silence, loudness, no B-frames and faststart for delivery, mid-clip frame grabs); `scripts/check-subs.mjs` (bilingual subtitle lint: CJK line width >16, hanging single characters, lower-case English fragments, orphan Latin letters inside Chinese, timing order and overlap, missing English line); `scripts/srt-to-cues.mjs`, `beat-to-cues.mjs`; `skills/remotion-sfx`, `remotion-gotchas-index` (a list of past mistakes); `agents/mg-judge.md` (a reviewer sub-agent prompt).
- Borrow: re-implement `qc-master.mjs`'s ffmpeg checks as a new `video/tools/qc.py` (ffmpeg `blackdetect`, `freezedetect`, `silencedetect`, `scdet`, `ffprobe`), run after every render. Port the `check-subs.mjs` rules to our `subs-zh.json` + `srt.py` as `video/tools/check_subs.py` (our zh line is optional, so the "missing zh" check should warn only).
- Effort: 45-60 min each, ideal overnight tasks.

**3. JohnChow90/video-shotcraft** (157 shot recipe cards)
- https://github.com/JohnChow90/video-shotcraft, 8 stars, pushed 20 Sep 2026. Apache-2.0. About 99 MB (gallery media).
- Contents: `references/shots/{camera,transition,typography,ui-entrance,interaction,opening,outro,data,effects,rhythm}` (e.g. `camera/crash-zoom-punch.md`, `camera/depth-layer-moves.md`, `transition/card-flip-reveal.md`, `transition/transition-hidden-cut.md`, `ui-entrance/card-stack.md`, `ui-entrance/deck-deal-flyin.md`, `typography/lead-word-zoom-assemble.md`, `typography/title-demote-to-label.md`), `references/sound-design.md` (SFX pinned to frames in one declarative table, BGM at ~0.34 with fades, never game-like timbres), `references/final-review.md` (independent final review checklist, sections P/F/V/S/B/D/A/Q), `references/aesthetic-rules.md` (rules with real rework cases and self-check questions), `references/sequences/promo-energy-arc.md`.
- Borrow: (a) `final-review.md` and `aesthetic-rules.md` as the checklist for a last-pass review agent; (b) the "SFX table in one file" idea (our cues are already central in `tools/cues.py`; check it also covers whooshes on whip cuts); (c) `camera/crash-zoom-punch.md` for the "9%" slam and the "No." beat; (d) `ui-entrance/deck-deal-flyin.md` for the three-card fan-out in "What it is".
- Effort: 15 min reading; each shot recipe 30-60 min.

**4. Alon17-12/remotion-ad-video-skill**
- https://github.com/Alon17-12/remotion-ad-video-skill, Claude Code skill, pushed 28 Sep 2026. MIT.
- Contents: `skill/SKILL.md` (phases: intake, ideas before pixels, scene skeleton, feedback loop, music, lock, localization; a "prove it, don't assume it" visual QC loop: extract frames at changed timestamps, contact sheet, look at it), `references/beat-sync.md`, `references/localization.md` (a single LANG switch, never a fork, with a typed string table; RTL/LTR), `scripts/beat_sync.py`, `build_soundtrack.py`.
- Borrow: the LANG-switch pattern if we ever want a Chinese-first cut (all on-screen strings from one `i18n.ts`); the visual QC loop is already close to our `scripts/stills.mjs` and `tools/sheet.py`. Beat sync is already solved by our 120 BPM grid.
- Effort: 10 min reading; the LANG switch is "after".

**5. iart-ai/motion-design-skills**
- https://github.com/iart-ai/motion-design-skills, pushed 19 Oct 2026. MIT.
- Contents: eight skills: `animation-principles` (easing curves, twelve principles), `shot-composition` (camera and grids), `beat-sync-editing`, `motion-art-direction` (direction playbook), `color-motion`, `logo-animation` (logo patterns, relevant to our mark and 链AI脑 ending), `motion-background`, `remotion-video`, plus `scripts/contact-sheet.sh`, `seek-shot.sh`, `probe-mp4.sh`.
- Borrow: `easing-curves.md` to audit our `interpolate` / spring choices (consistent easing is the cheapest polish), `logo-patterns.md` for the end card, `scripts/seek-shot.sh` / `contact-sheet.sh` for frame checks.
- Effort: 15 min reading; easing audit 30-45 min.

**6. Ashad001/remotion-transitions**
- https://github.com/Ashad001/remotion-transitions, 69 stars, pushed 11 Mar 2026. MIT.
- Contents: `SKILL.md`, `references/animation-math.md`, `custom-transition-pattern.md`, `transition-catalog.md` (Striped Slam, Zoom Punch, Diagonal Reveal, Emerald Burst, Vertical Shutter, Glitch Slam), all as `TransitionPresentation` implementations for `@remotion/transitions`.
- Borrow: the pattern for writing a custom presentation (our `Whip.tsx` is a hand-rolled equivalent); Zoom Punch and Vertical Shutter could replace one or two whips where we want a different rhythm. Check the colours against the Neo-Kinetic palette before use.
- Effort: 30-45 min per transition.

**7. Fats403/remotion-captions-kit**
- https://github.com/Fats403/remotion-captions-kit, 5 stars, pushed 15 Aug 2026. MIT.
- Contents: `src/create-caption-pages.ts` (pagination with sentence boundaries, tested), `emphasis.ts` (per-word emphasis rules: colour/style by word, e.g. "9%" in vermillion), presets `pill-karaoke`, `neon-glow`, `weight-shift`, `kinetic-slam`, built on `@remotion/captions` `TikTokToken`.
- Borrow: the emphasis-rule idea for `Subtitles.tsx` (highlight numbers, "No.", "stricter" in the brand colour) and the sentence-boundary pagination tests. Do not swap the whole subtitle system: ours already limits reading speed and has a zh line.
- Effort: 30 min for emphasis colouring in our own component.

### Seen, not cloned

- **remotion-dev/template-tiktok** (290 stars, 16 Oct 2026): Whisper.cpp TikTok-style captions; its approach is already in the official skills.
- **vshukla7/remotion-captions-themes** (8 stars, MIT, Jun 2026): themeable word-level captions; similar to remotion-captions-kit.
- **codeverbojan/remotion-cinematic** (20 stars, MIT, Apr 2026): smart layout and camera moves for SaaS demos; overlaps with our own `Main.tsx` camera.
- **yuxuant2025/vision-video-in-a-weekend** (246 stars, Aug 2026, licence unclear): workflow for a 2-3 min vision video made with AI tools; read its README for narrative structure only.
- **chandreshpv/remotion-product-videos-claude-skill** (Sep 2026): a planning SOP for product launch videos.
- **GTKottman/remotion-transitions** (0 stars, 6 Oct 2026, licence "other"): 50 transitions in a taxonomy; too new and unlicensed for use.
- **Voice and mix tooling** (not cloned; pip or ffmpeg only):
  - `xiph/rnnoise` (5,905 stars, BSD-3, last push Feb 2025) is the engine behind ffmpeg `arnndn`; model files come from `GregorR/rnnoise-models` (385 stars, no licence field in the API; check its README before shipping).
  - `Rikorose/DeepFilterNet` (4,853 stars, MIT/Apache dual, last push Oct 2024, so not 2025-26 maintained) gives better quality than RNNoise for noisy room recordings; pip `deepfilternet`, CLI `deepFilter in.wav -o out/`. Mac Apple-silicon install is fiddly; try only if the team's recordings are noisy.
  - `resemble-ai/resemble-enhance` (2,461 stars, MIT, Dec 2024): denoise plus bandwidth restoration; heavy (PyTorch), can colour the voice. Last resort.
  - `csteinmetz1/pyloudnorm` (784 stars, MIT, Jan 2026): ITU BS.1770-4 meter. Use it only to verify integrated LUFS and loudness range in a test; `mix.py` already hits -14 LUFS with ffmpeg two-pass loudnorm.
  - `ceva-ip/DPDFNet` (168 stars, Apache-2.0, Oct 2026): new streaming enhancer; research stage.
- **Bilingual caption tools**: no strong repo found by GitHub search for "Chinese English ASS/SRT" in 2025-26. The Chinese-oriented `jc-remotion-skills` `check-subs.mjs` is the best lint. `@remotion/captions` (inside remotion-dev/remotion) handles SRT import/parsing.
- **Storytelling or pitch skills for Claude Code**: nothing mature found; `alirezarezvani-claude-code-skills-video-content-strategist` (mirror, 0 stars) is not worth it. `video-shotcraft/references/sequences/promo-energy-arc.md` and `aesthetic-rules.md` (C = copywriting rules) are the closest.

## 3. Voice clean-up and mix: concrete recipes (ffmpeg only, tested to exist locally)

Only relevant when the team's own voice files arrive (`footage/voice/`). Edit `CLEAN` in `tools/voice.py` (line 53):

```
highpass=f=80,arnndn=m=<path>/bd.rnnn:mix=0.8,afftdn=nf=-30:nr=10,deesser=i=0.4,
acompressor=threshold=-22dB:ratio=2.5:attack=8:release=140:makeup=2,speechnorm=e=6:r=0.0001:l=1
```

- `arnndn` needs an RNNoise model file (from rnnoise-models). Compare A/B against the current chain on one real clip before committing: RNNoise can sound "watery" at `mix=1`.
- `deesser` helps close-mic recordings; do not apply it to ElevenLabs lines.
- Keep `mix.py` as is. Optional: add a measured check after the mix with `ffmpeg -af ebur128=peak=true` and fail if integrated is not -14 +/- 0.5 and true peak > -1.0; this is what `qc-master` and lemo do.

## 4. Ranked borrowings

### Before the deadline (under 2 hours tonight)

1. **Automated render QC** (from `jc-remotion-skills/scripts/qc-master.mjs`): new `video/tools/qc.py` running `blackdetect`, `freezedetect`, `silencedetect`, `scdet`, `ffprobe` metadata, loudness and faststart checks on `out/*.mp4`. Plugs in at the end of `video/build.sh`. Effort 45 min. Licence: re-implement the checks, do not copy the file (CC BY-NC).
2. **Reading-time check for on-screen text** (from `lemo-opuscar/core/render/readcheck.mjs`, MIT): add the rule (chars/15 + 1.5 s, minimum 1.5 s) as a script over `timeline.json` / `edit.json` scene lengths, or a manual table for the text-heavy scenes (X-ray lanes, HKMA four principles, proof). Effort 30-45 min. High value because the judges read the card text without pausing.
3. **Whisper round-trip of the voice lines** (from `lemo-opuscar/core/tts/asr_check.py`): our `tools/voice.py` already runs Whisper; add a script comparing each ElevenLabs line (`tts/lines.json`) to its transcript so misread names ("FISCO BCOS", "x402", "Hao Wen", "HKMA") are caught. Effort 30 min.
4. **Subtitle lint** (from `jc-remotion-skills/scripts/check-subs.mjs`): check `.srt` and `subs-zh.json` for line width, hanging single words, overlap, order, and a zh line missing for some English pages. Effort 30 min.
5. **Last-pass review checklist** (from `video-shotcraft/references/final-review.md` + `aesthetic-rules.md`): give a fresh review agent these two files plus `contact-sheet`/`seek-shot` frames. Effort 15 min to wire in; cost is the review pass itself.
6. **Install `remotion-dev/skills`** into the session before any code edit (idiomatic Remotion 4, light-leak overlay, audio rules). Effort 10 min.

### After (post-deadline)

7. Light-leak `TransitionSeries.Overlay` on the drop cut and the "Stricter" beat (official skill `light-leaks.md`; 30-45 min). It is a small gain, so try it only if there is time left tonight.
8. Easing audit using `motion-design-skills/skills/animation-principles/references/easing-curves.md` (30-45 min).
9. Word emphasis colouring in `Subtitles.tsx` (numbers, "No.", "Stricter.") taken from `remotion-captions-kit/src/emphasis.ts` (30 min).
10. RNNoise (`arnndn`) plus `deesser` in `voice.py`, only once the team's own recordings exist (30 min, needs a model file; A/B before committing).
11. Crash-zoom punch (`video-shotcraft/references/shots/camera/crash-zoom-punch.md`) on the "9%" slam and "No." (45 min).
12. Zoom Punch or Vertical Shutter transitions from `Ashad001/remotion-transitions` replacing a whip or two (30-45 min each).
13. Production brief template (`awesome-claude-5-5-videos/docs/production-brief.md`, CC BY 4.0) with the rights table, to keep honesty rules and asset licences in one place (20 min; attribute if reused).
14. LANG switch (`remotion-ad-video-skill/skill/references/localization.md`) for a full Chinese cut (2+ hours).
15. 3D phone via `template-three` / `@remotion/three` (2+ hours, risky).
16. DeepFilterNet, resemble-enhance, pyloudnorm: only if the team's recordings are noisy or we want an independent LUFS test; not needed for the ElevenLabs voice.

## 5. Licence notes

- Safe to copy or adapt with attribution: MIT (lemo-opuscar, vox-director, remocn, motion-canvas-examples, motion-design-skills, remotion-ad-video-skill, remotion-transitions, remotion-captions-kit, awesome-opus5-5-videos), Apache-2.0 (video-shotcraft; keep the NOTICE/licence text), CC BY 4.0 (awesome-claude-5-5-videos).
- Non-commercial only: `jc-remotion-skills` (CC BY-NC 4.0). Learn from it and re-implement; do not paste its code.
- Remotion licence: `remotion-dev/skills`, `remotion-sparse`, `template-three`. The video is made with Remotion already; check the company-licence rule for the team before any commercial release.
- No licence file: `opus-video-prompts`, `PDoomVideo`, `GregorR/rnnoise-models` (API field null). Read only; do not copy.
- If anything is copied, add a line to `video/CREDITS.md`. Never name rival teams or their projects there.
