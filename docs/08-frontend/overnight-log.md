# Overnight frontend push: log

Phone first, then the web console. Each slice goes research → implement → validate → fix → log → commit, on local main and never pushed. Backlog items are ranked by "would a judge notice in 5 seconds".

## Backlog

- [ ] Home: a press-lift on stack cards; tune the drop-in and the pull-to-fan on video
- [ ] Edit-routine sheet: cadence chips, allowance stepper, Face ID to sign; plus a "Pause all routines" control
- [ ] Agents screen at Home's level
- [ ] Activity screen at Home's level
- [ ] Approvals inbox and Receipt sheet at Home's level
- [ ] Settings at Home's level
- [ ] Compose: highlight understood words in the sentence itself (mirror text), if it aligns on iOS at all text sizes; otherwise improve the chips
- [ ] Pocket page: richer receipts and covers; the run payoff on video
- [ ] Intro: a 4th page showing a sentence becoming an app (update the e2e "three pages" check)
- [ ] AX5 large-text pass (Next up tiles, chips, timeline, Brain); VoiceOver pass on the chart scrub
- [ ] Console: Live and Judges polish; parity of the pocket app view with the phone

## Done

- [x] **Launch jump** (6227fda). A cold-launch recording (`simctl io recordVideo` plus ffmpeg frames) showed two jumps:
  - the stack measured its width before drawing;
  - the content below was drawn under the 3-card loading placeholder.

  Now the stack is sized from the window width in its first frame, and everything below it waits for the pockets. Re-recorded: no jump. Tests: phone 44 and sim 55 pass.

- [x] **Ask dock folds on scroll** (8a786a1). Scrolling down on a tab folds the pill to the agent's mark and its ring; scrolling up brings the words back. The minimise state moved to the root layout. Stack strips are 3 pt tighter.
  - Evidence: `screenshots/pocket-apps/w-22-dock-fold.png` (rest, scrolled down, scrolled up), e2e 57/57, research loop 6.
- [x] **Console timeline hover cards and today band** (ece725b). Dots open a dark card on hover or keyboard focus. Two bugs found and fixed in screenshots:
  - a row-level `group` showed every card in the row;
  - the scroll box clipped cards.
  - Evidence: `c-routines-hover.png`; web tests 81 pass, build clean.
- [x] **Digest on Home ("Your agents got you")**: last 7 days of buys as covers (seller mark, item, ×count, spent), plus bought / co-signed / stopped counts.
  - Decision: it uses the weekly chart's window (7 calendar days including today), not Monday to now. The first version showed US$0.31 beside the chart's US$0.317, and two different "weekly" numbers next to each other would confuse a judge.
  - Evidence: `w-23-digest.png`; sim tests 56 pass (a new digest test); e2e 57/57.

Earlier the same day, before this log existed:
- Home wallet stack, live card signs and Next up (e68c433)
- compose chips (b544f42)
- What happens next, chart scrub and run payoff (d11e678)
- console routine timeline (b7ca0ab)
- Brain routine panel (3 commits before 6227fda)

E2E: 57/57.

## Decisions (made on the owner's behalf)

- **Home layout:** a vertical wallet stack, not a carousel or grid. It is the only layout that shows all 7 pockets at a glance, and judges know it from Apple Wallet. See research loop 4.
- **Pocket page tabs:** no "App · Rules & history" tabs. They would hide the signed rules and the worst case, which are the trust story.
- **Compose highlighting:** chips under the box, not highlighted words in the box. Mirror text over a multiline iOS `TextInput` is fragile with dynamic type. This is still open as a backlog item if it can be done well.
- **Swipe-back:** the pocket page swipes back from the edge only, so the chart scrub and the shelf keep horizontal drags.
- **Pacing:** the session is not in `/loop` mode, so there are no scheduled wake-ups. The slices run back to back in one session.

## Not verified / blocked

- 60 fps on a physical iPhone. Simulator timing is meaningless while Chromium runs beside it.
- VoiceOver on the chart's adjustable action. It is wired, but not listened to.
- AX5 text on the Next up tiles and the chips.
