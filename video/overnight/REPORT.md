# Overnight video report: ranked, ready to cherry-pick

Branch `video-overnight` (worktree `.claude/worktrees/video-overnight`), a straight line on `main` at `9bcd289`. Updated 20 Oct 2026, 12:50 HKT.

- Frames: [storyboard.html](storyboard.html)
- Research and reviews: [research/](research/)
- Kit for the owner's recording: [recording-kit-v41.html](recording-kit-v41.html), rebuilt with `python3 video/overnight/kit.py`

## If you have two hours before the deadline, do these

**1. Pick the whole branch.** It's tested clean on `9bcd289`, and the subtitles stay English-only until someone turns the Chinese on:

```bash
git cherry-pick 9bcd289..video-overnight
```

**2. Record the v4.1 kit in the owner's voice at 145–150 words a minute, then build.** The kit takes about an hour. Slower than 140 wpm risks the 5:00 cap; see Runtime below. Then run `tools/voice.py` and `sh video/build.sh`. The build now ends with `tools/qc.py`.

**3. Two checks only a human can do.**
- Confirm `SENTINEL_PK` is set on Railway. Without it, "freezes the card" is only a hold, and line w2 must say "holds".
- If a team member reads Chinese, have them check `remotion/src/subs-zh.json` and set `"enabled": true`. Otherwise leave it off.

A fresh judge who compared v4 with this branch's preview estimated **about 77 → 88 points**: task 28 → 33, security 22 → 25, innovation 24 → 26, bonus 3 → 4 ([review-holistic.md](research/review-holistic.md)). That preview predates `ccee08c`, `b52d9fd`, `246f1c7` and `8cc1d81`.

The five changes that matter most, best first. Picking the whole range includes all of them.

| # | Change | Commits to cherry-pick | Expected effect | Minutes | Risk |
|---|---|---|---|---|---|
| 1 | **Record the v4.1 script.** Every spoken claim now matches the evidence: test sellers stand in for Exa and CoinGecko; the live model *can* ask a question but didn't in testing; we *play* a fooled agent and force its key; seven forbidden *attempts*; US$150,000+ sent away; a stolen key "still only pays your listed sellers, up to the cap"; "462 tests passed" on 19 Oct; no refund promise, no public-chain claim. 549 words, fitted to **4:51 at 145 wpm**. | `860094b` `281dd3a` `789349f` `7763ef5` `3bca10a` `b52d9fd` `61678ad` `d3ffd3b` `8245a37`, plus `d3c6f87` (the subtitle file they edit) | Security & compliance (30%) is judged by people who can read our security PDF. A line the PDF contradicts costs more than any visual. | 5 to pick, about 60 to record with the kit | Low. Without the recording, use the fallback below. |
| 2 | **Two real hashes, held full screen.** The block 11 payment (1.8 s) and the block 13 refused transfer (1.6 s), each with its full hash, status and explorer address. All nine hashes in the film are in the execution-evidence PDF. | `77d4822` `8cc1d81` | Task completion (40%) is judged on transaction hashes. A fresh judge moved this criterion from 28 to 33. | 2 | Low |
| 3 | **The rubric's own words on screen.** Prompt injection, data extraction, privilege escalation and induced transfer on the four attacks; clarification and fallback on the two beats that show them. | `056dd8c` `81546ed` `281dd3a` | 60 of 100 points become easy to tick for a judge with the rubric open | 2 | Very low |
| 4 | **Clean the phone voice at its real noise floor,** and follow the kit's coaching: 3 s of room tone, 15–20 cm, 45° off-axis. | `fd0c90f` | The first thing a judge hears is a room, not a phone | 2, plus one A/B listen | Low |
| 5 | **Readable and safe to deliver.** Honesty lines and labels at 23–26 px and clear of the subtitles; plain words for non-native judges; MP4 true peak from −0.6 to −1.7 dBTP; `qc.py` at the end of the build. | `20a7efd` `d5c9359` `6edcc66` `b366b98` | Judges on laptops can read what we disclose. A portal never has to touch our audio. | 3 | Low |

**Also in the branch** (optional polish, all low risk):
- The Morse decodes into "SEND ALL", labelled as an illustration (`ccee08c`).
- A stronger opening and ending (`c854df2`).
- A real hush before "No." (`32eb822`).
- Attack motion: whip, settle and camera (`da320ef` `033e48c` `3021ee3`).
- One FISCO clock caption (`246f1c7`).
- The ART framework named on the HKMA slide (`2216e4e`).
- The "Try it" address after the tests (`6f2ddef`).
- The "A.I. versus A.I." subtitle break (`9e4ef9b`).
- Chinese subtitles, off by default (`d3c6f87` `399a15a` `eeed484` `1ea1eeb`).

**Runtime.** The review rounds had grown the script from 534 to 602 words, and at the owner's coached 145 wpm that ran **5:13.5, over the cap**. `d3ffd3b` trims it back to 549 words (every accuracy fix kept) and adds `tools/pace.py`. Simulated with `layout.py`: **4:51 at 145 wpm, 4:45.5 at 150, 4:55.5 at 140** (v4 was 4:46 at 145). Keep any on-camera intro under 5 s, and run `python3 tools/pace.py remotion/src/vo-words.json remotion/src/edit.json 145` after any script change. `qc.py` fails anything over 5:00. Subtitles simulated at the owner's pace peak at 16.2 cps at 140 wpm, 16.6 at 145 and 17.0 at 150. The 17 cps target holds after a comma in h1 gave the HKMA line a natural page break.

**On-camera clips eat the margin.** `python3 tools/pace.py remotion/src/vo-words.json remotion/src/edit.json 145 --face intro=5 close=3` gave exactly **5:00.0**, right on the cap. `fbce3a2` shortens the ending slide from 8 s to 6 s when the last line was said on camera: now **4:58.0 at 145** and 4:52.5 at 150 with both clips, and a 4 s intro alone at 145 gives 4:55.5. So with both clips, read at 150 wpm, or keep the intro to about 4 s and skip the closing clip. A team clip replaces the portrait slide and costs almost nothing. Measure the real takes with `--face` before the final build.

### If the owner's voice does not arrive in time

Sarah's audio says the v4 words, and the ElevenLabs free quota has 178 characters left, so it can't voice v4.1. Don't pick the script commits; two voices in one film sound odd. Pick the screen and audio set instead (tested on `9bcd289`):

```bash
git cherry-pick 9e4ef9b 056dd8c 81546ed b366b98 6edcc66 fd0c90f 32eb822 d5c9359 c854df2 ccee08c
```

Then decide on `20a7efd` (legibility) and `da320ef` (motion). Both conflict only on text lines the script commits changed, so keep main's text in the conflicting lines. `77d4822` (the hash hold) conflicts only on the generated `timeline.json`. To resolve it, keep main's side, re-run `tools/layout.py` and `tools/cues.py`, and change `cues.py`'s `"pullback"` to `end("x7") + 2.2 + 0.6` as in `3bca10a`.

## Full ranked list

B means before the deadline; A means after, for the finals. Ranked by effect × confidence ÷ effort.

| Rank | Idea | Status | When | Evidence |
|---|---|---|---|---|
| 1 | v4.1 accuracy script | **built** | B | [accuracy.md](research/accuracy.md) (37 claims checked against the PDFs, proof JSON and code), [review-security.md](research/review-security.md) |
| 2 | Owner's own voice + clean chain + coaching | **built** (kit, chain); recording pending | B | ETHGlobal bans TTS voices ([practice.md](research/practice.md)). A synthetic voice isn't rated less trustworthy (Lavan 2025), so the gain is presence and authenticity ([academic.md](research/academic.md)). FinTechathon sets no voice rule ([judges.md](research/judges.md)). |
| 3 | Held real hash | **built** | B | The rules: Topic F is "evaluated using on-chain transaction hashes" |
| 4 | Rubric words on screen | **built** | B | Rules: security and interaction criteria name these terms |
| 5 | Laptop legibility | **built** | B | Netflix/BBC caption norms; Q11 minimum text height ([review-motion.md](research/review-motion.md), [review-nonnative.md](research/review-nonnative.md)) |
| 6 | Deployment line | **built** | B | Bonus: "demonstrated real-world deployment" |
| 7 | Chinese subtitles | **built**, off | B if a team member checks; else A | Dual subtitles help second-language viewers. The rules require English materials, which this keeps. A native-reader review fixed the wrong terms (买价格, 结算方, 注销). |
| 8 | Opening and ending | **built** | B | First impressions form fast (Ambady and Rosenthal 1993, in [academic.md](research/academic.md)) |
| 9 | Hush before "No." | **built** | B | The approved design asked for it; measured 0.2 s in v4 ([audio.md](research/audio.md)) |
| 10 | Peak fix + QC | **built** | B | v4 measures −0.6 dBTP |
| 11 | FISCO detail on screen: Clock.sol's millisecond-to-second conversion | **built**, `246f1c7` (optional) | B (optional) | [review-fisco.md](research/review-fisco.md): the one detail that shows real porting. It's a caption while the checks tick. |
| 12 | X-ray: one idea at a time, a 2 s lane legend before the voice | idea | A | Contiguity and signalling (Ginns 2006, d ≈ 0.85) ([academic.md](research/academic.md)) |
| 13 | Morse decoded into "SEND ALL" under the dots | **built**, `ccee08c` | B (optional) | [review-motion.md](research/review-motion.md) B-list; labelled as an illustration |
| 14 | Varied Reveal settle and camera travel per act | **built** for the attack, `033e48c` `3021ee3` | B (optional) | [review-motion.md](research/review-motion.md) items 7 and 9 |
| 15 | 90 s finals cut from existing scenes | plan | A | [finals-cut.md](research/finals-cut.md) |
| 16 | Say "Mock e-HKD" aloud once; "test eHKD" in the planted order | idea | A | [review-fisco.md](research/review-fisco.md). The proof footer already says it. |

### Left for the owner to decide

These are approved decisions. Reviewers questioned them; the evidence is noted, and nothing was changed.

- **"Stricter, never looser" (w3).** The second AI tightens what the agent may do; it doesn't edit the stored rules. A safer line: "The second AI can only hold or block a payment. It can never loosen a limit."
- **ART framework on the HKMA slide.** `2216e4e` (optional) names it in the source line only: "under the HKMA's ART framework (Accountability, Resilience, Trust)". The policy reviewer's fuller idea, three pillar tags over the rows, is for after the deadline.
- **"Every agent, Claude, ChatGPT, or ours" (n2).** Pairing outside agents works only on the demo network so far.
- **The ending's vermillion "card".** It breaks the colour rule (vermillion only for attacks); the motion reviewer suggests powder blue.

## Research, one paragraph each

- **Accuracy** ([accuracy.md](research/accuracy.md)).
  - **Clean:** the eight card checks, "the token asks the card", guardian freeze-only, owner-only unfreeze, the block 11 and 13 hashes, HK$12.00 to HK$8.80, 63 = 55 + 8, and 462 as the sum of the suites.
  - **Subtitles:** they matched the voice word for word.
  - **Fixed in v4.1:** everything rated overstated.
- **Judges** ([judges.md](research/judges.md)).
  - The rules set no format, subtitle or voice requirement: 5:00 maximum, materials in English.
  - Topic F is scored on hashes.
  - No HKMA or SFC statement on AI agents since 16 Oct; the HKMA's index was last revised on 15 Oct.
  - Keys are secp256k1, so never imply 国密/SM2.
- **Academic** ([academic.md](research/academic.md)).
  - Contiguity and signalling matter most for the X-ray.
  - Subtitles help non-native viewers.
  - First impressions form fast.
  - Synthetic voices aren't rated less trustworthy; energetic speakers hold attention.
- **Practice** ([practice.md](research/practice.md)).
  - Real product pixels and a guiding camera, which v4 already has.
  - Signs of AI-made video: repeated identical push-ins, uniform easing, an even-paced voice. `da320ef` starts on these.
- **GitHub** ([github.md](research/github.md)).
  - 7 repos cloned to `reference/repos/` (git-ignored), licences noted.
  - Borrowed: the QC idea (re-implemented; the source is CC BY-NC).
- **Audio** ([audio.md](research/audio.md), [clean-chain.txt](research/clean-chain.txt)).
  - Voice is 15 dB over the music.
  - Laptop-speaker word recall is 96%.
  - The clean chain is tested on a synthetic noisy phone take: the pause floor drops from −56.9 to −68.6 dBFS.
- **Reviews.**
  - [review-judge-1.md](research/review-judge-1.md): a sceptical judge.
  - [review-security.md](research/review-security.md): a security researcher.
  - [review-fisco.md](research/review-fisco.md): a WeBank/FISCO engineer.
  - [review-nonnative.md](research/review-nonnative.md): a Mandarin-first judge on a laptop.
  - [review-motion.md](research/review-motion.md): a motion designer.
  - [review-holistic.md](research/review-holistic.md): a fresh judge comparing both cuts.
  - [review-hkma.md](research/review-hkma.md): an HKMA policy officer.

## Prototype log

| # | Prototype | Commits | Frames, before and after | Verdict |
|---|---|---|---|---|
| P0 | Subtitle "A.I." page break | `9e4ef9b` | — | kept |
| P1 | Chinese line under the English | `d3c6f87` `399a15a` `eeed484` | v4-100 / zh-100, v4-241 / zh-241 | kept, off until checked |
| P2 | Rubric terms on the attack rail | `056dd8c` `281dd3a` | v4-166.5 / rubric-166.5, r1-162 | kept, labels enlarged after review |
| P3 | Clarification and fallback tags | `81546ed` | v4-66 / interact-66, r1-66 | kept, headline fixed after review |
| P4 | Script v4.1 | `860094b` `281dd3a` `7763ef5` `3bca10a` | v4-acc-* / acc-*, r1-*, r2-*, plain-* | kept, reworded in three review rounds |
| P5 | Held real hash | `77d4822` `7763ef5` | v4-129 / hash-129, r2-127.8 | kept, FISCO version and chain id added |
| P6 | Phone-voice clean chain | `fd0c90f` | (audio) | kept |
| P7 | 462 tests dated | `789349f` | v4-264 / tests-262 | kept |
| P8 | QC script | `b366b98` | — | kept; found v4's −0.6 dBTP peak |
| P9 | True peak under −1 dBTP | `6edcc66` | (audio) | kept |
| P10 | Hush before "No." | `32eb822` | (audio) | kept |
| P11 | Deployment line | `6f2ddef` | live-264.5 | kept |
| P12 | Task check tile fits | `d5c9359` | tile-100 | kept |
| P13 | Laptop legibility | `20a7efd` | v4-20 / leg-20, leg-129.6, leg-243, leg-259 | kept |
| P14 | Opening and ending | `c854df2` | v4-5.5 / open-5.5, v4-284 / end-283 | kept |
| P15 | Motion variety | `da320ef` | v4-246 / hkma-244 | kept |
| P16 | Morse decodes into "SEND ALL" | `ccee08c` | v4-5.5 / morse-5.6, morse-3 | kept (optional) |
| P17 | Security round 3 (y2 rules, k2, receipt label) | `b52d9fd` | v4-181 / r3-176, r3-191 | kept |
| P18 | FISCO clock caption | `246f1c7` | clock-119.3 | kept (optional) |
| P19 | Refused transfer's hash held; captions match the voice | `8cc1d81` | v4-181 / revert-178.3, v4-20 / stat-19 | kept |
| P20 | HKMA policy round (h2, footer, x7, r1, k3) | `61678ad` | hk-125, hk-155, hk-247.5 | kept; [review-hkma.md](research/review-hkma.md) |
| P21 | Fit under 5:00 at 145 wpm, plus `tools/pace.py` | `d3ffd3b` | fit-107, fit-119.6, fit-169.8, fit-196, fit-250.8 | kept; this was a must-fix |
| P22 | Attack headlines land harder (settle stiffness per scene) | `033e48c` | attack-whip-150.65 | kept |
| P23 | Attack camera travels faster (0.45 s) | `3021ee3` | (motion) | kept |
| P24 | ART framework named on the HKMA slide | `2216e4e` | art-hkma | kept (optional) |
