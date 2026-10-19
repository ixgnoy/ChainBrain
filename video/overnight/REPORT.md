# Overnight video report: ranked, ready to cherry-pick

Branch `video-overnight` (worktree `.claude/worktrees/video-overnight`). Last updated 20 Oct 2026, early morning (HKT). Frames: [storyboard.html](storyboard.html). Research notes: [research/](research/).

## If you have two hours before the deadline, do these

Pick the whole chain in this order on `main` (tested clean on `9bcd289`):

```bash
git cherry-pick 9e4ef9b d3c6f87 056dd8c 81546ed 860094b 0bb1084 399a15a 77d4822 fd0c90f 281dd3a
```

| # | Change | Commits | Effect on judges | Minutes | Risk |
|---|---|---|---|---|---|
| 1 | **Record the v4.1 script, not v4.** Twelve lines said more than the evidence shows. For example: the live model never asked a clarifying question; Exa and CoinGecko are our test sellers; cancelling gets back only what hasn't been spent; "seven forbidden payments" includes two rule edits; the Morse post sent away US$150,000+, which doesn't mean the wallet was emptied. Captions, labels and the hook counter change with them. Give the owner `overnight/recording-kit-v41.html` (rebuild it with `python3 video/overnight/kit.py`). | `d3c6f87` (the subtitle file it edits), `860094b`, `0bb1084`, `281dd3a` | Security & compliance (30%) is judged by people who can read our security PDF. A line the PDF contradicts costs more than any visual gain. | 15 to pick, plus the recording you were doing anyway | Low |
| 2 | **Clean the phone recording at its real noise floor.** The old chain assumed a −28 dBFS room. Phones in a quiet room sit near −50, so the denoiser barely worked. | `fd0c90f` | A voice that sounds like a room, not a phone, is the first thing a judge hears | 5, plus one A/B listen of the first file | Low. Listen once with both chains. |
| 3 | **Hold the real hash full screen for 2.2 s** after "a hash anyone can open": the full hash, "success", the explorer address, and a note that every hash in the film is in the execution-evidence PDF (checked: all nine are). | `77d4822` | Topic F's 40 task points are judged on transaction hashes. In v4 the only legible hash was a 2 s screenshot. | 5 | Low. Adds 2.2 s; v4.1 runs 4:41 with the preview voice. |
| 4 | **Name the rubric's own words on screen.** Prompt injection, data extraction, privilege escalation and induced transfer label the four attacks. Clarification and fallback label the two phone beats that show them. | `056dd8c`, `81546ed`, `281dd3a` | Makes 60 of the 100 points easy to tick for a judge with the rubric open | 5 | Very low |
| 5 | **Verify two numbers before the final render.** Re-run the test suites: 462 may now be 463+, since a server test landed after the PDFs. Confirm `SENTINEL_PK` is set on Railway; without it, "freezes the card" is only a hold. | none | Avoids a provable mismatch between the video and the documents | 20 | None |
| 6 | **Chinese subtitles, only if a team member who reads Chinese checks all 43 lines today.** Then set `"enabled": true` in `remotion/src/subs-zh.json`. | in the chain, off by default | Mainland and Hong Kong judges can follow the fast X-ray. English stays primary, as the rules require. | 30 to check | Medium if unchecked, which is why it ships off |

**Conflicts if you pick only some.** `timeline.json` and `vo-words.json` are generated. On a conflict, take either side, then re-run `tools/layout.py` and `tools/cues.py`; `tools/voice.py` rewrites them anyway when the owner's takes are imported. The branch's preview voice for the 12 changed lines is Kokoro, because the ElevenLabs free quota has 178 characters left.

## Full ranked list

Effect × confidence ÷ effort, under the 5:00 cap. B = before the deadline, A = after (finals).

| Rank | Idea | Status | When | Evidence | Effort | Risk |
|---|---|---|---|---|---|---|
| 1 | Script v4.1 accuracy fixes (above) | **built**, `860094b` | B | [accuracy.md](research/accuracy.md) rows 7, 11-16, 19, 20, 29, 35, checked against the security PDF p2, p5, p7 and `hosted-proof.json` | S | Low |
| 2 | Owner's own voice | planned by the owner; v4.1 kit ready | B | ETHGlobal's rules ban TTS voices ([practice.md](research/practice.md) §1). Lavan 2025 found synthetic voices *not* rated less trustworthy, so the gain is authenticity and the team's presence, not raw trust ([academic.md](research/academic.md)). FinTechathon sets no voice rule ([judges.md](research/judges.md) §1). | M | Pace: there are only ~8 s spare under 5:00 |
| 3 | Rubric words on screen | **built**, `056dd8c`, `81546ed` | B | Rules: the security criterion lists the four attack types; the interaction criterion lists clarification, correction and fallback ([judges.md](research/judges.md) §1) | S | Very low |
| 4 | HKMA beat says "four ideas from the speech", not principles | **partly built** (footer in `860094b`) | B | The speech has the four phrases (paras 18, 19, 21, 23) under the ART framework's three pillars and never says "principles" (hkma.gov.hk speech of 16 Oct, HKMA press release of 15 Oct; [judges.md](research/judges.md) §3). The voice line is already a fair paraphrase. "Covers all four" stays per the owner's decision; the softer option is "has a feature for each". | S | Low |
| 5 | Subtitle A.I. fix | **built**, `9e4ef9b` | B | Cue 50/51 split mid-phrase | S | None |
| 6 | Hold one full real hash on screen, tied to the task | **built**, `77d4822` (2.2 s) | B | Topic F's 40 points are "evaluated using on-chain transaction hashes" (rules); v4's only legible hash is a different payment ([judges.md](research/judges.md) #2) | M | Low |
| 7 | Chinese subtitles (checked by a team member) | **built**, off by default | B if checked, else A | Dual subtitles help second-language viewers ([academic.md](research/academic.md)); the rules require English materials, not English only ([judges.md](research/judges.md) §4) | S to check | Medium unchecked |
| 8 | X-ray legibility: one idea at a time, dim the inactive lanes, a 2 s lane legend | to prototype | B/A | Contiguity and signalling: Ginns 2006 meta-analysis, d ≈ 0.85, largest for complex material ([academic.md](research/academic.md)) | M | Medium (the approved board) |
| 9 | Phone scenes: drop headlines that repeat the subtitle word for word | to prototype | A | Redundancy principle; keep subtitles for non-native viewers (Toh 2010) ([academic.md](research/academic.md)) | M | Medium (the approved look) |
| 10 | "Live and deployed" said once near the end, for the 0-5 bonus | to prototype | B | Bonus rewards "demonstrated real-world deployment" (rules) | S | Low |
| 11 | "test" next to e-HKD in the attack order | to prototype | B | The HKMA has not decided on a retail e-HKD ([judges.md](research/judges.md) §2) | S | None |
| 12 | Render QC script (black, freeze, silence, loudness) | to build | B | [github.md](research/github.md) #1 | M | None |
| 13 | 90 s finals cut | idea | A | [practice.md](research/practice.md) #10 | L | — |
| 14 | Last frame rhymes with the first (Morse dots resolve into the mark) | idea | A | [practice.md](research/practice.md) #4 | M | Low |

## What the research says, in one paragraph each

- **Accuracy** ([accuracy.md](research/accuracy.md)). 37 claims checked.
  - **Clean:** the eight card checks, "the token asks the card", guardian freeze-only, owner-only unfreeze, the block 11 and block 13 hashes, HK$12.00 to HK$8.80, 63 = 55 + 8, and 462 as the sum of the seven suites.
  - **Subtitles:** they match the voice word for word.
  - **Overstated or ambiguous:** the twelve lines fixed in v4.1, plus three left for the owner to decide (listed in [script-v41.md](research/script-v41.md)).
- **Judges** ([judges.md](research/judges.md)).
  - No rule on video format, subtitles or voice: 5:00 maximum, materials in English.
  - Topic F is scored on hashes.
  - No new HKMA or SFC statement on agents since 16 Oct. Not confirmed for 20 Oct itself.
  - Keys are secp256k1, so never imply 国密/SM2.
- **Academic** ([academic.md](research/academic.md)).
  - Contiguity and signalling matter most for the dense X-ray.
  - Subtitles help non-native viewers.
  - First impressions form fast, so polish the first 30 s.
  - Synthetic voices aren't rated less trustworthy (Lavan 2025). Energetic, faster speakers hold attention (Guo 2014).
- **Practice** ([practice.md](research/practice.md)).
  - ETHGlobal: 2 to 4 min, short backstory, narrate yourself.
  - Linear-style films use real pixels, a guiding camera and a closed palette. v4 already does.
  - Signs of AI-made video: repeated push-ins, uniform easing, an even-paced voice.
- **GitHub** ([github.md](research/github.md)). The pipeline already has the hard parts. The gaps are QC and reading-time checks. 7 repos cloned to `reference/repos/` (git-ignored), with licences noted.
- **Audio** ([audio.md](research/audio.md), [clean-chain.txt](research/clean-chain.txt)).
  - The mix measures −14.0 LUFS with true peak −0.6 dBTP: AAC overshoots the −1.5 target. Re-encode toward −2 dBTP if a portal demands ≤ −1.
  - The voice sits a median 15 dB over the music. Laptop-speaker simulation keeps 96% of words recognisable.
  - The gap before "No." holds a riser, so true near-silence lasts only ~0.2 s.
  - The clean chain is now `fd0c90f`. The owner's coaching: 3 s of room tone, 15–20 cm from the phone, 45° off-axis, 140–150 wpm.

## Prototype log

| # | Prototype | Commit | Frames (before, after) | Kept? | Reviewer's note |
|---|---|---|---|---|---|
| P0 | Subtitle "A.I." page break | `9e4ef9b` | (text only) | kept | KEEP |
| P1 | Chinese line under the English | `d3c6f87`, `399a15a` | v4-100 / zh-100, v4-241 / zh-241, v4-39.5 / zh-39.5 | kept, off by default | KEEP, off until checked; proof footnote moved clear of a 3-line subtitle |
| P2 | Rubric terms on the attack rail | `056dd8c` | v4-166.5 / rubric-166.5, v4-170 / rubric-170 | kept | KEEP WITH FIX: labels 17 to 22 px, lighter (done) |
| P3 | Clarification and fallback tags | `81546ed` | v4-66 / interact-66, v4-141 / interact-141 | kept | KEEP WITH FIX: headline now "It can ask one question first." (done) |
| P4 | Script v4.1 and captions | `860094b`, `0bb1084`, `281dd3a` | `v4-acc-*` / `acc-*` (9 pairs), `r1-*` | kept | KEEP WITH FIX, fixed in `281dd3a` (plainer u1, k3, m2, r1) |
| P5 | Real hash held full screen | `77d4822` | v4-129 / hash-129 | kept | the reviewer's "bigger gain than any of these" |
| P6 | Phone-voice clean chain | `fd0c90f` | (audio; synthetic test in clean-chain.txt) | kept | — |
