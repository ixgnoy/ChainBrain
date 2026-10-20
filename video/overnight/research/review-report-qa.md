# QA of REPORT.md (20 Oct 2026, against branch tip 3f2d7fc)

Method: all checks run against `video-overnight`; picks tested in throwaway worktrees on `9bcd289` (removed afterwards). Main checkout untouched.

## 1. Commit ids
All 40-odd ids in REPORT.md exist (`commit`) and their subjects match the descriptions. No mismatches. The branch is 67 commits, no merges, straight line on `9bcd289`.

## 2. Commands
- `git cherry-pick 9bcd289..video-overnight`: applies with no conflicts on `9bcd289`; resulting tree is identical to `video-overnight` (67 commits). OK. (It also brings in all research files, frames and reports, about 20 MB of jpgs; fine but unsaid.)
- Subset line (`9e4ef9b 056dd8c ... ccee08c`): applies clean, 10 commits. OK.
- `20a7efd`: conflicts in `V3.tsx` and `V4.tsx` (as the report says). `da320ef`: conflicts in `V4.tsx` only. `77d4822`: conflicts only in `timeline.json`. All as the report says.
- Resolution steps work: keep HEAD's side (`git checkout --ours <file>`; in a cherry-pick "ours" is main), `git add`, `GIT_EDITOR=true git cherry-pick --continue`; for 77d4822 `--ours timeline.json`, then from `video/`: `python3 tools/layout.py remotion/src/edit.json remotion/src/vo-words.json remotion/src/timeline.json` and `python3 tools/cues.py remotion/src/timeline.json remotion/src/vo-words.json`, with cues.py's `"pullback"` changed to `end("x7") + 2.2 + 0.6`. Result: 13 commits, clean tree.
- Problems:
  a. The report never says what "keep main's text" means in git terms (`--ours`), and not to `git add` / `--continue`. A hurried reader will edit conflict markers by hand.
  b. Keeping main's side on `20a7efd` throws away the legibility sizes on exactly those lines (the "honesty" lines, which is what 20a7efd is for). Say so, or tell them to take theirs for the font sizes.
  c. The pullback edit is `+ 2.2` in the subset (HOLD is 2.2 s in `77d4822` alone). On the full branch it is `+ 1.8` (`d3ffd3b`, HOLD = 1.8 in V4.tsx) and row 2 says 1.8 s. Both correct, but a reader sees 2.2 and 1.8 with no explanation. Add "(2.2 because the subset has no `8cc1d81`)".
  d. Table rows 1 to 5 list "Commits to cherry-pick", but picking row 1's list alone (even with `d3c6f87` last, as written) conflicts on the first commit (`Main.tsx`, `subs-zh.json` deleted in HEAD): `subs-zh.json` is also changed by `399a15a`, `eeed484`, `1ea1eeb`. Putting `77d4822 8cc1d81` first conflicts on `timeline.json`. So the rows are not independently pickable. Fix: state "These columns explain the range; do not pick them one by one. Pick the range."
  e. Directory: `tools/pace.py ...`, `tools/voice.py`, `tools/qc.py` only work from `video/` (run from repo root, pace.py prints nothing; it needs `tools/layout.py`). `sh video/build.sh` and `python3 video/overnight/kit.py` work from the repo root. Mixed roots are not stated. Say "cd video first" once.
  f. `tools/voice.py` must be run as `.venv/bin/python tools/voice.py` (plain python3 lacks numpy/soundfile on this machine). Also `build.sh` already runs voice.py when `footage/voice` or `footage/face` has files, so "Then run voice.py and sh build.sh" reads as two steps; only `--dry` first is useful. Say "run `.venv/bin/python tools/voice.py --dry`, then `sh video/build.sh`".
  g. After cherry-picking onto main, `kit.py` reads main's git-ignored `video/out/recording-kit.html` by absolute path; fine, but the picked `recording-kit-v41.html` is already built, so the "rebuilt with" note is only for editing.
- `pace.py` runs as written from `video/`, and reproduces the report: 145 wpm 4:51.0; 150 wpm 4:45.5; 140 wpm 4:55.5; `--face intro=5 close=3` 4:58.0 at 145 and 4:52.5 at 150; `--face intro=4` 4:55.5 at 145. Old script (`d3ffd3b^`) 5:13.5 at 145 and v4 (`9bcd289`) 4:46.0 confirmed.

## 3. Stale or inconsistent numbers
- **549 words (lines 29 and 46) is wrong: `tts/lines.json` and `vo-lines.json` have 541 words** in the 43 lines (v4 534 and the 602 intermediate are right). Fix both places to 541 (or say how 549 was counted).
- `remotion/src/timeline.json` and `out/preview-v41.mp4` are the preview-voice build: 270.0 s (4:30) and 269.5 s. The report's 4:51 is a simulation at 145 wpm. Not a contradiction, but a reader who opens the preview will see 4:30 and wonder. Add "(the Kokoro preview runs about 4:30; 4:51 is the simulation at the owner's pace)".
- **The kit (`recording-kit-v41.html`) is stale about runtime**: "the video has about 13 seconds under the 5:00 limit (4:46.5 now)". That is v4. At 145 wpm it is 9 s under. It also quotes pace figures "computed from the current voice timings" (v4 timings). The kit's header line (4:51) is right. Fix that sentence, as the owner will read the kit while recording.
- `SCRIPT.md` says "4:46.5" and README "The 4:46 ... video"; both v4 numbers (SCRIPT.md also says it is v4.1 text). Minor.
- HOLD values: block 11 hold 1.8 s (`V4.tsx` HOLD = 1.8) matches row 2; block 13 1.6 s matches the comment in `V3.tsx`. `cues.py` pullback `+1.8+0.6` matches. OK.
- Closing slide: `edit.json` close `len` 8.0 (6 s only with the on-camera close, per `fbce3a2`). Report is consistent.
- "4:58.0 at 145 and 4:52.5 at 150 with both clips": confirmed.
- Report header "Updated 12:50 HKT" but last commit is 12:19; harmless, but the report itself was last edited at 12:17.
- Row 5 "−0.6 to −1.7 dBTP": the −1.7 is not in `mix.py` (it says "-2.5 dBTP, limiter at -4 dBFS, stays under -1"); likely a measurement on the preview, not checked here.
- Not verifiable here: "178 characters left" ElevenLabs quota, "Railway SENTINEL_PK" (flagged correctly as human check), the 77 to 88 score.
- All relative links in REPORT.md resolve.
- Row 3 and row 1 both list `281dd3a`, row 2 `8cc1d81` is called "two real hashes" but P19 says it is the second hash only; OK.

## 4. Unclear for a hurried reader
- Top section has "If you have two hours" with step 1 (whole branch) and step 2 (record), but Runtime and "On-camera clips" sit far below. The one rule that matters (read at 145 to 150; with both clips read at 150 or cap breaks) should be one line in step 2. Step 2 says "145 to 150" but not the on-camera caveat.
- Step 2 says "build ends with qc.py", and that qc FAILs over 5:00; but `build.sh` prints "qc: fix the FAIL lines" and does not stop the build. Say "check the qc output".
- "The subtitles stay English-only until someone turns the Chinese on": say where (`remotion/src/subs-zh.json`, `"enabled": true`; it is in item 3 further down).
- Fallback section mixes "Don't pick the script commits" with "`77d4822` conflicts" (a script-adjacent commit, and the hash hold is listed as optional); say plainly whether `77d4822` and `8cc1d81` belong to the fallback.
- A stray `tmp` untracked folder appeared in the main checkout root (`?? tmp`); not created by this QA, noted for the owner.

## Concrete fixes
1. 549 to 541 (two places). 2. Add "cd video" and `.venv/bin/python` for voice.py. 3. Explain conflict resolution: `git checkout --ours <file>`, `git add`, `git cherry-pick --continue`; note it discards the legibility sizes. 4. Explain 2.2 vs 1.8. 5. Say the table rows are not pickable alone; pick the range. 6. Fix kit's "13 seconds / 4:46.5" sentence. 7. Note preview video is 4:30.
