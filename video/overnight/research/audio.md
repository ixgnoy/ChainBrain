# Audio review: ChainBrain demo video (20 Oct 2026)

Method: measured the shipped MP4/SRT; rebuilt the voice and music stems exactly as `tools/mix.py` does (same cues, same ducking) from `video/remotion/public/audio` and the main checkout's `timeline.json` / `vo-words.json` (the worktree copy of those two JSON files is older than the shipped video, for example line m2, so do not trust the worktree JSON for timing). Analysis scripts are in the scratch dir. I have not listened by ear; the "it sounds like" judgements below are inferred from measurements and the score code.

## 1. Measurements of the final mix

| | Result | Verdict |
|---|---|---|
| Integrated loudness | -14.0 LUFS (ebur128) | on target for web |
| True peak | **-0.6 dBTP** (mix.py asks for -1.5; the AAC encode overshoots) | tight; some checkers want <= -1.0 |
| Loudness range | 3.4 LU (short-term -16.3 to -12.9) | very even, almost "radio" flat; no dynamics left except the hits |
| Format | AAC 48 kHz stereo, ~265 kb/s | fine |

Section loudness (10 s RMS windows) stays between -14.2 and -18.0 dBFS the whole film: no section is too quiet.

**Voice vs music during speech (stems, 43 voice lines).**
- Voice sits at -18.8 dB RMS pre-master. Median voice-over-music gap per line is **15.0 dB** (range 1.3 to 22.1). In 400 ms frames: median 14.5 dB, 10th percentile 7.2 dB, 18% of frames under 10 dB.
- The target (10 to 15 dB for laptops) is met almost everywhere. The six lines under 10 dB are exactly the six deliberate "punch-through" hits in `cues.punch`: the "cut" in the hook (line m2, 4.0 dB), "nine" (m3, 8.3), "all eight pass" (x7, 8.5), "taken over" (y2, 6.9), "looser" (w3, 6.6) and the "no" (k4, 1.3). By design.
- Check by ear: the Morse punch at 8.4 s lands on "giving away over a hundred..." (or the new wording "emptying its wallet") in the hook; the 400 ms frames at 8.2-9.2 s show the music louder than the voice. If that sentence is hard to follow, shorten that punch (`cues.py` line 119, first entry: 1.2 s to 0.6 s) or let it fall on the pause. After the deadline unless it is obviously masked.
- Per band during speech, the music is 16-23 dB below the voice from 100 Hz to 8 kHz, but **23 dB ABOVE the voice below 100 Hz** (kick/sub; the voice has none). Inaudible on a laptop, it burns loudness headroom: the meter reads the sub, so on laptops the voice is quieter than -14 LUFS suggests. A 60-70 Hz high-pass on the music while the voice is active would add 1-2 dB of voice loudness for free.
- Laptop simulation (200 Hz high-pass, 8 kHz low-pass on the master; also a harsher 300 Hz / 6 kHz "tiny speaker"): Whisper `small.en` recovers **95.9%** of the script words from the laptop version and 95.7% from the tiny-speaker version, against 94.8% from the full-band master. The misses are number and name formats (nine percent, eight eighty, FISCO, Quan, Universiti), not lost sounds. Intelligibility survives; the music is mostly bass and sits below the speech band.
- Low-end mud: the voice stem has no energy under 100 Hz and 100-500 Hz is a normal female-voice body (about -5 dB relative to the total, not boomy). No cut needed for the TTS.
- Sibilance: the 5-9 kHz band peaks at -15 dBFS (as loud as the whole speech average, -18.8). Worst moments: 187.6 s, 242.4 s, 110.0 s, 178.9 s. Mildly bright, typical of TTS, fine on laptops, could be bright on earbuds. A 3-4 dB de-ess (`deesser=i=0.35`) would cure it. Not urgent.

## 2. Music critique

- **Does it compete with speech?** Mostly no: sidechain ducking holds it at -14 dB under the voice with an 80 ms attack and 600 ms release, and the music's mid and high band are at -16 to -23 dB re the voice. The exceptions are the six punch hits (intended). Risk: the 600 ms release lets risers swell in the pauses (see below), which can sound like "pumping".
- **Trailer cliché?** Yes, somewhat. The score is a 120 BPM hybrid trailer cue (braams, risers, sub hits, a shatter, impact on nearly every beat of the attack section, rising bells, trains of kicks). For a 4:46 video that is a lot of "movie trailer" for a financial-regulation audience: it can read as hype. What protects you is that it is purposeful: the Morse key, the mechanism ticks for the X-ray and the warm D-major bed for the HKMA and the team are restrained and specific. Suggested trims if there is ever time: fewer impacts in 2:40-3:03, no "shatter" on the "no", fewer risers; leave the HKMA bed as it is. Judges will see this once, on a laptop, probably with subtitles: it is a style choice, not a defect.
- **Appropriate for financial/regulatory judges?** Acceptable. It is dark and tense where the story is an attack and calm (warm, major) where the story is governance. No genre-lyric, no cheesy stock. I would not change the style before the deadline.
- **The silence before "No."** Measured on the music stem: the intended hush is `cue["no"] - 0.55` (174.03 s), but the voice line "The card says no." starts at 173.62 s, so the half-second of silence mostly falls under "The card says". What the ear gets: the voice stops at 172.7 s, the music **swells** (-24 to -11 dB re the master) between 172.5 and 173.4 s (the pre-"no" riser released by the ducker in the voice-free gap, louder than the voice around it), collapses to -23 to -45 at 173.4-174.4 s with the voice on top, then the hit at 174.5 s. So: the dip is real but short, a true near-silence of about 0.2 s (173.4-173.6) plus 0.9 s of "voice alone, music under -30 dB". The result is dramatic and probably works, but it is not clean silence, and the loudest thing right before the line is a riser swell rather than a held breath. If you ever tweak: end the riser at 172.6 s (stop it in the pause) so the 0.9 s gap is truly empty, then let "The card says" ride with nothing under it and hit on "no". This can be heard only by ear; it is **after** the deadline unless the owner dislikes it.

## 3. Cleaning a phone recording: research and the proposed chain

Searches (WebSearch, 2024-2026) turned up only community material: the usual recipe is high-pass 80 Hz, `afftdn` with a moderate reduction (an author reported that an aggressive noise-floor setting made the voice "muffled and watery"), de-esser, compressor, `loudnorm` to -16 (podcasts) or -14 (video). ffmpeg's `arnndn` needs a model file (e.g. `bd.rnnn` from the rnnoise-models repo), DeepFilterNet ships a `deep-filter` binary (48 kHz WAV only) and a LADSPA plugin; neither is a built-in ffmpeg filter. Sources: [pyvideotrans on ffmpeg noise reduction](https://en.pyvideotrans.com/blog/ffmpeg-nosie), [ffmpeg-user: voice post-production in one line](https://lists.ffmpeg.org/pipermail/ffmpeg-user/2021-January/051624.html), [DeepFilterNet](https://github.com/rikorose/deepfilternet), [DeepFilterNet LADSPA (Arch)](https://archlinux.org/packages/extra/x86_64/deepfilternet-ladspa/). The current chain has one concrete flaw: `afftdn=nf=-28` tells the denoiser that the room noise is at -28 dBFS, about 20 dB higher than a quiet phone room (-50 to -45 dBFS).

Full chain, notes and the test table: `video/overnight/research/clean-chain.txt`. Headline test (synthetic phone file: 10 TTS lines + small-room reverb + -50 dBFS hiss + hum + rumble, 58 s; no real recording exists yet):

| | pause noise floor | SNR | Whisper word recall |
|---|---|---|---|
| input | -47.5 dBFS | 21.4 dB | 0.861 |
| current CLEAN | -56.9 | 34.4 | 0.861 |
| **proposed** | **-68.6** (nr=18: -72.0) | **49.7** (53.1) | 0.854 (test noise) |

The proposed chain is 11-15 dB quieter in the pauses with no loss in recognition. It cannot remove room reverb (nothing in ffmpeg does; the closet/duvet does). Before using it: set `nf` from the real file's room tone (command in the file) and listen to the first real file with the old and new chain.

## 4. Coaching for the recording (one page)

**Before you start (5 minutes).** Water, not milk or coffee. Hum for 30 seconds (lips closed, "mmm", up and down). Say "red leather, yellow leather" and "unique New York" five times each, quickly. Read the first line aloud twice as if telling a friend. Stand up if you can: it opens the chest and the voice is bigger. A big smile on the first words of each line is audible; keep it light, not on every word.

**Phone and room.**
- Airplane mode on (an incoming buzz ruins a take), Do Not Disturb on, charger out.
- Phone 15-20 cm from your mouth (about a hand and a half), **mic pointing at the corner of your mouth, 45 degrees off-axis** (stops the "p" and "b" pops and cuts sibilance), a little below the chin line. Same distance and same spot for every file: prop it on a book, do not hold it.
- Room: the smallest room, soft things around (wardrobe of clothes, bed, curtains), or sit with a duvet over your head and the phone like a tent. Fans, air-con, fridge noise and windows off or shut. Turn off a fan even if it feels cool; it is the noise the chain cannot remove.
- **Leave 3 seconds of silence at the start of each file**, then speak; that room tone is what the denoiser learns from. Do not move the phone between lines.
- Do a 10 s test: speak a loud line, listen on earphones: no clipping (if the waveform touches the top, move back 5 cm, do not lower the volume afterwards).

**Pace (computed from the current voice timings).** The current voice speaks at about **145 words per minute** during speech (about 100-125 with its pauses): a relaxed, clear pace. Section by section while speaking: hook 156, card 124, first payment 150, X-ray 152, use it 165 (the brisk one), break it 153, why it held 149, HKMA and proof 120, team 136. Fastest single lines in v4: k3 "Worst case, we play a fooled agent..." (was 191 wpm), r1 175, u2 177, m1 178: give those a breath, do not rush them. Slowest and deliberately so: the HKMA sentence (113 wpm, 24 words, one breath is hard: it is fine to breathe after "kill switches", the edit absorbs a short pause) and "ChainBrain covers all four" (97). Rule of thumb: aim for **140-150 wpm, never above 165**. If your take of a section runs more than 10% over the kit's time, redo it faster rather than shortening pauses; the video has about 13 seconds under the 5:00 limit (4:46.5 now).

**Reading numbers and names.**
- "twelve Hong Kong dollars to eight dollars eighty" (v4.1 wording): a small pause before "eight dollars eighty". Do not say "point eight".
- "nine percent" (stress "nine"; that is the film's hit), "sixty-three" and "four hundred and sixty-two" (flat, proud, finish down), "seven forbidden attempts" (stress "seven").
- FISCO BCOS: "FIS-co B-C-O-S" (letters evenly). x402: "x four oh two". HKMA: the letters. "A.I. versus A.I.": two clear letters each. Universiti: "yoo-ni-VER-si-ti". Your own names: say them the way you say them every day; the subtitles carry the spelling.
- On "No." (line k4, "The card says no."): do not shout; drop the volume, slow down, land flat and final. The music supplies the hit.

**Energy.** Talk to one judge across a table, not to a room. Start each line with a small intake of breath and finish each sentence downward (statements end down, not up: it sounds sure). Stress one word per sentence ("owner key stays on your PHONE", "the card says NO"). A smile before the line, not through it. Hook: quiet and serious (it is a warning). From "This is ChainBrain" brighter. "Now, let's break it": a little devil in the voice. The ending: warm, slow.

**Takes.** For each section: record the whole file in one go; if you stumble, **stop, count two seconds of silence, re-read the whole line** (the kit's rule: the last take is kept). Expect 2-3 full passes per section; stop when you are tired: the best take is usually number 2. Listen back once to the first and last 10 seconds of every file on earphones for noise or a clipped word. Total time for nine files: about 40-60 minutes. Record every section: two different voices in one film sound odd, and the v4.1 lines only exist in your voice.

**Files.** `video/footage/voice/01-hook.m4a`, `02-card.m4a`, `03-first-payment.m4a`, `04-xray.m4a`, `05-use-it.m4a`, `06-break-it.m4a`, `07-why-it-held.m4a`, `08-hkma-proof.m4a`, `09-team.m4a` (skip 09 if you film the team clip). Camera clips: `video/footage/face/intro.mov`, `close.mov`, optional `team.mov`. Voice Memos: set to Lossless; keep the .m4a. One file per section, no extra words at the start such as "take two" (say them before the 3 s of room tone, the tool takes the last reading of each line anyway).

## 5. Subtitle reading speed (58 cues in the SRT)

- Mean 12.1 characters per second (136 words per minute); maximum 18.0.
- **Over 17 cps: one cue.** #20 at 1:37.8, 3.39 s, 61 characters, 18.0 cps: "Our server checks the payment against the task you confirmed,". It follows the voice (161 wpm on that line), so it is not a mistake, just brisk. Fix (after the deadline, or whichever is easiest): split it as "Our server checks the payment against the task" / "you confirmed, traces the seller's money, and simulates it." (the second is then 52 characters: check it fits), or keep it; it is only 1 cps over.
- Between 15 and 17 cps: #28 (138.9 s, 15.2 cps, "A seller that isn't on your list gets refused,") and #39 (183.9 s, 15.0 cps, "That's because every payment goes through eight layers."). Fine.
- **Under 1 s: none.** Shortest cues: #34 "None of it works." 1.7 s, #50 "with kill switches, A.I." 1.8 s, #37 1.9 s.
- Other things seen: cue #50 ends on "A.I." and the next starts "versus A.I.": a line break in the middle of the phrase "A.I. versus A.I." (re-break as "with kill switches," / "A.I. versus A.I., and secure boundaries."). 40 of 58 cues are over 42 characters (the longest, #49, is 91 characters on one line), which is fine for the burned-in pages but a player rendering the .srt will wrap them to two lines; 0 cues have more than 2 lines. The gap between cues is as low as 0.02 s (#20 to #21), fine.
- When the team's own voice replaces the synthetic one, the cue times and cps change; rerun the subtitle build and re-check with the same numbers (a slower voice lowers the cps).

## Top fixes

**Before the deadline**
1. Re-encode check: the final true peak is -0.6 dBTP; if any submission portal checks for -1.0, re-encode the audio with a -2 dBTP target (or `alimiter=limit=0.89`) and verify with ebur128. Cheap.
2. Record the owner's voice with the coaching above (room tone first, 15-20 cm, 45 degrees off-axis, aim for 140-150 wpm, ends of sentences down), and use the proposed CLEAN chain with `nf` set from the room tone.
3. Listen once to the hook at 8-9 s (punch on a key sentence), and to 172-175 s ("The card says no."). Only if it sounds wrong, make the edits suggested above.

**After**
4. High-pass the music below 60-70 Hz under speech (voice 1-2 dB louder on laptops).
5. Trim the trailer clichés (shatter, number of impacts in 2:40-3:03); stop the riser before the "no" so the silence is real.
6. De-ess the synthetic voice (`deesser=i=0.35`) if it is staying; re-break subtitle cues #20 and #50.
