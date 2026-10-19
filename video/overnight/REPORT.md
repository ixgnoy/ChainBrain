# Overnight video report: ranked, ready to cherry-pick

Branch `video-overnight` (worktree `.claude/worktrees/video-overnight`). Last updated 20 Oct 2026, early morning (HKT). Frames: [storyboard.html](storyboard.html). Research notes: [research/](research/).

## If you have two hours before the deadline, do these

| # | Change | Cherry-pick | Effect on judges | Minutes | Risk |
|---|---|---|---|---|---|
| 1 | **Record the v4.1 script, not v4.** Twelve lines said more than the evidence shows. For example: the live model never asked a clarifying question; Exa and CoinGecko are our test sellers; cancelling takes back only what's left; "seven forbidden payments" includes two rule edits. Captions, labels and the hook counter change with them. | `d3c6f87` (needed for the subtitle file), then `860094b`, `0bb1084`. Give the owner `overnight/recording-kit-v41.html`. | Security & compliance (30%) is scored by people who read our security PDF. A claim the PDF contradicts costs more than any visual gain. | 15 to pick + the recording you were doing anyway | Low. The text changes are small, and the timing follows the words. |
| 2 | **Name the rubric's own words on screen.** Prompt injection, data extraction, privilege escalation and induced transfer label the four attacks. Clarification and fallback label the two phone beats that show them. | `056dd8c`, `81546ed` | Makes 60 of the 100 points easy to tick for a judge with the rubric open | 5 | Very low (small mono labels, no timing change) |
| 3 | **Fix the "A.I. versus A.I." subtitle break.** | `9e4ef9b` | Removes a visibly broken subtitle on the HKMA beat | 2 | None |
| 4 | **Verify two numbers before the final render:** re-run the test suites (462 may now be 463+, since a server test landed after the PDFs) and confirm `SENTINEL_PK` is set on Railway. Without it, "freezes the card" is only a hold. | none | Avoids a provable mismatch between the video and the documents | 20 | None |
| 5 | **Chinese subtitles: only if a team member who reads Chinese checks all 43 lines today.** Then set `"enabled": true` in `remotion/src/subs-zh.json`. | `d3c6f87`, `399a15a` (already in #1) | Mainland and Hong Kong judges can follow the fast X-ray in their first language. English stays primary, as the rules require. | 30 to check | Medium if unchecked (that's why it ships off) |

Picking order for the whole set: `9e4ef9b d3c6f87 056dd8c 81546ed 860094b 0bb1084 399a15a`. They apply in that order on `main` at `9bcd289`. `860094b` also carries preview `timeline.json` and `vo-words.json` with Kokoro timings for the 12 changed lines. `tools/voice.py` overwrites both when the owner's recording is imported, so take ours or theirs, it doesn't matter.

## Full ranked list

Effect × confidence ÷ effort, under the 5:00 cap. B = before the deadline, A = after (finals).

| Rank | Idea | Status | When | Evidence | Effort | Risk |
|---|---|---|---|---|---|---|
| 1 | Script v4.1 accuracy fixes (above) | **built**, `860094b` | B | [accuracy.md](research/accuracy.md) rows 7, 11-16, 19, 20, 29, 35, checked against the security PDF p2, p5, p7 and `hosted-proof.json` | S | Low |
| 2 | Owner's own voice | planned by the owner; v4.1 kit ready | B | ETHGlobal's rules ban TTS voices ([practice.md](research/practice.md) §1). Lavan 2025 found synthetic voices *not* rated less trustworthy, so the gain is authenticity and the team's presence, not raw trust ([academic.md](research/academic.md)). FinTechathon sets no voice rule ([judges.md](research/judges.md) §1). | M | Pace: there are only ~8 s spare under 5:00 |
| 3 | Rubric words on screen | **built**, `056dd8c`, `81546ed` | B | Rules: the security criterion lists the four attack types; the interaction criterion lists clarification, correction and fallback ([judges.md](research/judges.md) §1) | S | Very low |
| 4 | HKMA beat says "four ideas from the speech", not principles | **partly built** (footer in `860094b`) | B | The speech has the four phrases (paras 18, 19, 21, 23) under the ART framework's three pillars and never says "principles" (hkma.gov.hk speech of 16 Oct, HKMA press release of 15 Oct; [judges.md](research/judges.md) §3). The voice line is already a fair paraphrase. "Covers all four" stays per the owner's decision; the softer option is "has a feature for each". | S | Low |
| 5 | Subtitle A.I. fix | **built**, `9e4ef9b` | B | Cue 50/51 split mid-phrase | S | None |
| 6 | Hold one full real hash on screen ~3 s, tied to the task | next prototype | B | Topic F's 40 points are "evaluated using on-chain transaction hashes" (rules); v4's only legible hash is a different payment ([judges.md](research/judges.md) #2) | M | Low |
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
- **Audio** ([audio.md](research/audio.md), [clean-chain.txt](research/clean-chain.txt)). In progress.

## Prototype log

| # | Prototype | Commit | Frames (before, after) | Kept? | Reviewer's note |
|---|---|---|---|---|---|
| P0 | Subtitle "A.I." page break | `9e4ef9b` | (text only) | kept | — |
| P1 | Chinese line under the English | `d3c6f87`, `399a15a` | v4-100 / zh-100, v4-241 / zh-241, v4-39.5 / zh-39.5 | kept, off by default | pending review |
| P2 | Rubric terms on the attack rail | `056dd8c` | v4-166.5 / rubric-166.5, v4-170 / rubric-170 | kept | pending review |
| P3 | Clarification and fallback tags | `81546ed` | v4-66 / interact-66, v4-141 / interact-141 | kept | pending review |
| P4 | Script v4.1 and captions | `860094b`, `0bb1084` | `v4-acc-*` / `acc-*` (9 pairs) | kept | pending review |
