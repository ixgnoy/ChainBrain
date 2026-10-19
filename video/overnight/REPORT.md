# Overnight video report: ranked, ready to cherry-pick

Branch `video-overnight` (worktree `.claude/worktrees/video-overnight`), a straight line on `main` at `9bcd289`. Updated 20 Oct 2026, 03:40 HKT.

- Frames: [storyboard.html](storyboard.html)
- Research and reviews: [research/](research/)
- Kit for the owner's recording: [recording-kit-v41.html](recording-kit-v41.html), rebuilt with `python3 video/overnight/kit.py`

## If you have two hours before the deadline, do these

**1. Pick the whole branch.** It's tested clean on `9bcd289`, and the subtitles stay English-only until someone turns the Chinese on:

```bash
git cherry-pick 9bcd289..video-overnight
```

**2. Record the v4.1 kit in the owner's voice, then build.** The kit takes about an hour. Then run `tools/voice.py` and `sh video/build.sh`. The build now ends with `tools/qc.py`.

**3. Two checks only a human can do.**
- Confirm `SENTINEL_PK` is set on Railway. Without it, "freezes the card" is only a hold, and line w2 must say "holds".
- If a team member reads Chinese, have them check `remotion/src/subs-zh.json` and set `"enabled": true`. Otherwise leave it off.

A fresh judge who compared v4 with this branch's preview estimated **about 77 → 88 points**: task 28 → 33, security 22 → 25, innovation 24 → 26, bonus 3 → 4 ([review-holistic.md](research/review-holistic.md)). That preview predates `ccee08c`, `b52d9fd`, `246f1c7` and `8cc1d81`.

What that buys, most important first:

| # | Change | Commits | Effect on the score | Risk |
|---|---|---|---|---|
| 1 | **Every spoken claim matches the evidence (v4.1 script).** Twenty lines changed or were added. Examples: test sellers stand in for Exa and CoinGecko; the live model *can* ask a question but didn't in testing; cancelling gets back what hasn't been spent; we *play* a fooled agent and force its key; seven forbidden *attempts*; the Morse post sent away US$150,000+ (the wallet wasn't shown to be emptied); "some" agent wallets check limits server-side; a stolen agent key "can still only pay your listed sellers, up to the cap"; 63 attacks "with test money"; "462 tests passed" on 19 Oct, as the PDFs say; the on-chain layers "keep every card inside its rules"; "Nothing gets through"; "ChainBrain covers each of the four"; no refund promise, no public-chain claim, "test money" in the attack. | `860094b` `281dd3a` `789349f` `7763ef5` `3bca10a` `b52d9fd` `61678ad` | Security & compliance (30%) is judged by people who can read our security PDF. Each line the PDF contradicts costs more than any visual gain. | Low. It only lands if the owner records it (see the fallback below). |
| 2 | **Two real hashes, held full screen.** The block 11 payment for 2.2 s, and the block 13 refused transfer for 2 s (`8cc1d81`). Full hash, "success", "FISCO BCOS 3.16.4 node, chain id 20200, block 11", the explorer address, and "every hash in this film is listed in ChainBrain-execution-evidence.pdf" (checked: all nine are). | `77d4822` (+ cue fix in `3bca10a`) | Task completion (40%) is judged on transaction hashes. v4's only legible hash was a 2 s screenshot. | Low. Adds 2.2 s. |
| 3 | **The rubric's own words on screen.** Prompt injection, data extraction, privilege escalation and induced transfer on the four attacks; clarification and fallback on the two beats that show them. | `056dd8c` `81546ed` `281dd3a` | Makes 60 of 100 points easy to tick for a judge with the rubric open | Very low |
| 4 | **A phone voice that sounds like a room, not a phone.** The clean-up measures each file's noise floor; the old chain assumed −28 dBFS against a real −50. | `fd0c90f` | The first thing a judge hears | Low. Listen once with both chains. |
| 5 | **"You can try it today, on our hosted FISCO BCOS chain."** One new line, with the address under the explorer. | `6f2ddef` | Aims at the 0–5 deployment bonus | Low. Adds 4 s. |
| 6 | **Readable on a laptop.** The test-money disclaimer, the HKMA source line, the Stat label and the X-ray brackets were 18–21 px or hidden under subtitles; they're now 23–26 px and clear of them. Three plain words replace "ask-me limit / co-sign", "traces … simulates" and "settles". The Task check tile no longer overflows. | `20a7efd` `3bca10a` `d5c9359` | A Mandarin-first judge on a laptop follows the X-ray ([review-nonnative.md](research/review-nonnative.md)) | Low |
| 7 | **The first and last frames.** The opening was 6 s of near-black with tiny dots; now bigger dots, the date from frame 0, a slow push and a time-base. The ending's call to action was 25 px; now 34 px, with a drift and a 0.5 s fade instead of a hard stop. | `c854df2` | First and last impressions | Low |
| 8 | **The film's key beat.** A real half-second hush before "No." (reverb had filled it). A hostile whip into the attacks, a softer cut pop, and a drifting HKMA list. | `32eb822` `da320ef` | Polish a motion designer would notice ([review-motion.md](research/review-motion.md)) | Low |
| 9 | **Delivery safety.** The MP4's true peak goes from −0.6 to −1.7 dBTP, and `qc.py` checks length, format, loudness, peak, black, freezes, silence and subtitle speed. | `6edcc66` `b366b98` | A portal never has to touch our audio | None |
| 10 | **Small text fixes.** "A.I. versus A.I." no longer breaks across two subtitles. The HKMA beat is "four ideas from the speech", which matches the speech; it never says "principles". | `9e4ef9b` `860094b` `ab94d1a` | Removes a mislabel a Hong Kong judge could check in two minutes | None |

**Runtime.** 4:48.5 with the branch's preview voice, which is 11.5 s under the cap. The owner should keep to the kit's targets, and `qc.py` fails anything over 5:00. The owner's pace of 140–150 wpm is close to Sarah's.

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
| 14 | Varied Reveal settle and camera travel per act | idea | A | [review-motion.md](research/review-motion.md) items 7 and 9 |
| 15 | 90 s finals cut from existing scenes | plan | A | [finals-cut.md](research/finals-cut.md) |
| 16 | Say "Mock e-HKD" aloud once; "test eHKD" in the planted order | idea | A | [review-fisco.md](research/review-fisco.md). The proof footer already says it. |

### Left for the owner to decide

These are approved decisions. Reviewers questioned them; the evidence is noted, and nothing was changed.

- **"Stricter, never looser" (w3).** The second AI tightens what the agent may do; it doesn't edit the stored rules. A safer line: "The second AI can only hold or block a payment. It can never loosen a limit."
- **ART framework tags on the HKMA slide.** The policy reviewer suggests three small tags (Accountability, Resilience, Trust) over the four rows. That's after the deadline: it adds text, and the voice must not say ART requires anything.
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
