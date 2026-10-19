# Motion review of v4 (4:46), ranked by visible improvement per minute

Method: 1 frame per 2 s contact sheets for the whole film, full-size frames at the hook, the HKMA/proof/team/ending run, plus a read of Main.tsx, PhoneScene, Kinetic, Whip, V3, V4, Subtitles, theme. Reference rules used: video-shotcraft aesthetic-rules R1 (let key info breathe), R3 (slow beats fast), R4 (few whole-frame impacts), Q11 (min text height: subtitles >=5% frame height, aux text >=3% = 32 px at 1080p), P4 (a technique is the hero once, then vary).

Caveat: the rendered MP4 (01:25, 286.5 s) and this worktree's timeline.json (ends 280 s, no face clips, hook copy differs: video says "an AI agent's wallet", source says "sent away by one AI agent") are not the same build. Timestamps below are from the video; file/line pointers are from the worktree and may have drifted. Re-grep before editing. Effort figures assume the file matches.

Overall verdict: the film is already disciplined (colour rule holds, hard cuts, no bounce). The remaining weaknesses are (a) a few real legibility/collision bugs, (b) one move repeated ~40 times (phone scenes + identical settle), (c) three long static holds (hook, HKMA, ending), (d) type below the Q11 minimum. Nothing needs a redesign.

---

## A. Do before the deadline (each <=30 min, low risk), in rank order

### 1. Footnote collides with subtitle on the proof scene, 247-262 s  -- 2 min
What: the grey mono footnote "Mock e-HKD is test money ... ChainBrain-security-self-assessment.pdf" wraps and its second line ("self-assessment.pdf") sits under the subtitle pill from about 250 s on (visible at 258 s). It is also the honesty disclaimer, so being half hidden is worse than it looks.
Fix: V3.tsx ProofV3, the final `<Small ... top: 850 ... fontSize: 19>`: set `top: 790`, `fontSize: 24`, `maxWidth: 1500`, and split it with a `<br/>` before "Details:". Subtitles occupy roughly y >= 900 when two lines, so keep all small text above y = 880.

### 2. X-ray bottom labels hidden by subtitles, about 119-123 s  -- 3 min
What: "helps the agent behave" / "holds without our server" sit at the canvas bottom edge and the subtitle pill covers them (visible at 121 s).
Fix: V4.tsx lines ~309-310: `top: 1330` -> `top: 1262`, `fontSize: 21` -> `26`. Check the 119-123 s frame afterwards; if the camera still crops them, raise the camera `cy` for that shot by about 60 px.

### 3. The 6 s near-black opening is only a few 30 px dots and a 26 px date, 0-6 s  -- 8 min
What: for 6 s the frame is about 99% black with a dot line 30 px tall (2.8% of frame height) and two tiny labels. It reads as "is the file broken?" on a laptop. The tension is right; the information density is too low. R1/R3 says hold is fine, but something must change on screen.
Fix (Hook in V3.tsx, Morse branch):
- `const unit = 30` -> `44` (bigger dots; the total width stays under 1920, check `total`).
- Wrap the dot line div in a wrapper with `transform: scale(${1 + 0.06 * clamp(t / cut)})` (slow 6% push over the whole Morse beat, 1.00 to 1.06). One slow drift beats static.
- Date label: `fontSize: 26` -> `34`, second line `24` -> `28`; start at `settle(t - 0.1, 8)` instead of 0.3 so frame 0 is not empty.
- Add a faint hairline (1 px, `rgba(255,255,255,0.12)`) under the dots that grows left to right with `t / cut` as a "time-base". It gives the eye a second moving thing without adding a glyph or colour.
- Keep the vermillion turn at the end exactly as it is (that is the right use of the colour).
Later (A->B, 25 min, after): decode the Morse into big letters under the line, one letter per pulse group (group when the gap between pulses > 2 x unit). The audience reads the actual post as it arrives. Strongest payoff in the opening, but touches timing logic.

### 4. Ending: the "Try it" line is the call to action and it is the smallest thing on screen, 279-286 s  -- 6 min
What: URLs are 25 px mono (2.3% frame height), the FinTechathon line is 22 px in `C.faint` (about 2.1:1 contrast, effectively invisible), and the last ~4 s are completely static on a hard stop.
Fix (Ending in V3.tsx):
- URL values `fontSize: 25` -> `36`, labels `26` -> `30`, icons `size={26}` -> `32`, gap `56` -> `44` (two items still fit in 1920 wide at 36 px mono; the longer one is about 43 chars x 21.6 = 930 px; check the pair fits in 1680, else stack them on two rows with `flexDirection: "column"`, `gap: 14`).
- Footer line: `fontSize: 22` -> `26`, `color: C.faint` -> `C.muted`.
- Slow drift: wrap the whole Stage content in `<div style={{transform: \`scale(${1 + 0.025 * clamp(t / 6)})\`}}>`.
- Fade to black over the last 0.5 s: `const { durationInFrames } = useVideoConfig(); const out = 1 - easeOut(clamp((frame - (durationInFrames - 15)) / 15))` and apply `opacity: out` to the wrapper. Landing a film on a hard stop reads unfinished.
- Colour (judgment call, 1 min): the approved rule says vermillion only for attacks/refusals and powder blue for safe. `highlight={{ card: C.vermillion }}` at the ending breaks it. Change to `C.blue`. If you prefer the vermillion pop for the brand moment, keep it, but then it is a deliberate exception.

### 5. 74% label shrinks to about 18 px and fades to 45%, 12-21 s  -- 5 min
What: Stat scales the whole 74% block by 0.55 when the 9% arrives, so "would let an agent handle routine tasks" becomes about 18 px at 45% opacity (visible at 20.5 s). It is the sentence that gives the 9% its meaning. The lower-left quadrant is also empty.
Fix: V3.tsx Stat. Scale only the numeral (`transform: scale(...)` on the 300 px div), leave the label at `fontSize: 34`, and set label opacity `p74 * (1 - 0.3 * shrink)` (keep it 70% bright, not 45%). Optionally nudge the 9% block `top: 300` -> `360` so the pair looks balanced.

### 6. HKMA list is top-heavy and the last 6.5 s are static, 227-244.5 s (rows complete about 238 s)  -- 6 min
What: list occupies y 230-700 of 1080, the bottom 30% is empty, and from about 238 to 244.5 s only the check badges change.
Fix (Hkma in V4.tsx):
- Move the list down and open it up: container `top: 230` -> `300`, row `padding: "26px 0"` -> `"34px 0"`. The block then fills y 300-840 and clears the source line at 960.
- Slow drift over the scene: wrap the `<Stage>` children in `<div style={{transform: \`scale(${1 + 0.02 * clamp(t / 17)}) translateY(${-6 * clamp(t / 17)}px)\`}}>` (2% push, sub-perceptual per second, kills the "frozen slide" feel).
- Source line `fontSize: 20` -> `24`, top 960 -> 940.
Later (15 min, after): add a big "4 of 4" numeral in powder blue (Clash Display 600, ~220 px) bottom-right at `four + 0.3`, settle w 10. It fills the space and lands the claim with the VO "covers all four".

### 7. Same settle on every headline, and every phone scene uses the same Whip direction, 46-221 s  -- 5 min
What: 47 `settle()` calls sit between w = 7 and 13, and `Reveal` is w 11 / stagger 0.045 for all 17 phone headlines. Combined with a 9-frame Whip from the right on four scenes (get 46.5, use2 131.5, attack 158.5, watch 205), the motion language never changes between "calm product" and "under attack".
Fix:
- Kinetic.tsx Reveal: add props `w = 11` and use `settle(t - delay - i * stagger, w)`. Pass `w={16}` (snappier, harder) for the attack beats and the Money "No." scene, `w={7}` with `stagger={0.09}` for the Ending and the "Stricter." scene (slower, calmer). PhoneScene: add `snap?: number` to the scene props and thread it to `<Reveal w={snap}>`; in Main.tsx pass `snap={16}` to the attack PhoneScene.
- Main.tsx: `<Whip id="attack" dir={-1}>` (enters from the left, opposite direction, reads as hostile) and `<Whip id="watch" frames={12}>` (slower and softer, calm scene). One minute each.

### 8. Footage cut "pop" is the same 3% punch on every cut, all phone scenes  -- 1 min
What: PhoneScene.Screen applies `snap = 1 + 0.03 * (1 - easeOut(local / 7))` to every segment boundary. Across about 40 cuts it becomes a tic.
Fix: PhoneScene.tsx line ~47: `0.03` -> `0.016`, `/ 7` -> `/ 9`. Subtle on most cuts, still marks the change.

### 9. Camera travel is the same 0.7 s exponential ease on every push-in, 46-221 s  -- 6 min
What: `camAt()` hard-codes 0.7 s travel for every keyframe, and the pushes end at scale 1.45-1.7 almost everywhere. Identical push-ins are the most "template" thing in the film.
Fix: PhoneScene.tsx: add prop `travel = 0.7` and replace both `0.7`s in `camAt` with it (pass through camAt as a third arg). Main.tsx: `travel={0.42}` on attack (hurried, tension), `travel={1.0}` on get and watch (calm). Also vary the tilt: PhoneScene `ry` start `-16` -> prop `tilt = -16`, attack scene `tilt={16}` so it arrives turned the other way. Leave use1/use2 as they are.

### 10. Auxiliary text is below the Q11 minimum in many scenes  -- 6 min
What: 32 text elements sit at 19-22 px (1.8-2.0% frame height): SimTag 20 px, Hkma source 20, proof footnote 19, Stat source 21, hook sublabel 24. On a judge's laptop or a compressed upload these are unreadable; two of them are honesty disclaimers.
Fix: theme-wide sweep, V3.tsx `Small` default `fontSize: 24` -> `28`; the three disclaimers (Stat source, proof footnote, Hkma source) at `26` and `C.muted` (not faint); PhoneScene.tsx `SimTag` `fontSize: 20` -> `24`. Leave decorative node labels in the X-ray alone (they are seen through a zoomed camera).

Cumulative A: about 48 min if all done. If time is tight, do 1, 2, 3, 4, 5 (about 24 min, all visible) and then 8 (1 min) and the two Whip lines in 7.

---

## B. After the deadline

### 11. Team slide: 3 portraits sit still for about 8 s while the VO names two, then one, 262-278 s  -- 10 min
Fix: V3.tsx TeamSlide. Take the time the second subtitle begins (`wordAt(line, "Yong")`) and set portrait opacity `0.55` for non-current people (first two bright until "Hao Wen", the third rising at "Yong Xi" with `settle(..., 9)` back to 1). Add a 2% scale drift as in item 6. Gives the slide a reason to stay up.

### 12. Phone-scene beats are all the same structure (headline + rule + mono caption) 17 times  -- 10 min
Fix: add `hl?: Record<string,string>` to `Beat` in PhoneScene.tsx and forward to `<Reveal highlight={...}>`. Use sparingly and on the rule: "refused" in vermillion ("Unlisted sellers get refused."), "admin" in vermillion on the attack beat, "live" in powder blue ("Slide to approve, and it's live."). One highlighted word per scene is enough.

### 13. Product UI first appears at 46.5 s (16% of the film is cards and numbers)  -- 15 min
Fix: during the `what` scene (28.5-46.5 s, 18 s) cross-cut a 1.5 s real phone shot (Get footage) at about 36 s, hard cut in and out, so the audience knows the app is real before the explanation starts. Re-time against the VO line; do not move the Whip at 46.5.

### 14. X-ray (79.5-131.5 s, 52 s in one diagram)  -- 20 min
It is the longest scene and it is varied (camera pans, insets, hash, explorer), so leave it. But at wide camera positions the node subtitles are about 14 px; if there is time, hold the wide shots at most 1.5 s (`cam` keyframes in XRay V4.tsx) and cut to zoomed ones sooner.

### 15. Proof (244.5-262.5): 462 tests slide is static for the last 4-5 s  -- 10 min
Fix: let the explorer inset do the work: in ProofV3 raise `playbackRate` 0.85 -> 1 and apply a 3% `scale` drift to the Browser wrapper over 18 s; after `f3` do a 2 px / 0.3 s settle on "all passing". Not worth more.

---

## What is good and should not be touched
- Colour discipline: vermillion appears on the 9%, US$0, refusals, "No." and the strikethrough only; powder blue marks the safe state.
- Hard cuts between scenes, with Whip kept to act changes (not overused in count).
- "Let's break it." beat (155.5-158.5 s): right length, right type size (about 250 px), no motion gimmick.
- "No." (about 172 s): the shake and hold work; the hush before it is right.
- Subtitles at 38 px with a pill are legible; Chinese line size also fine.
