# Overnight frontend push: log

Phone first, then the web console. Each slice goes research → implement → validate → fix → log → commit, on local main and never pushed. Backlog items are ranked by "would a judge notice in 5 seconds".

## Backlog

- [ ] Approvals inbox at Home's level (the receipt is done)
- [ ] Brain: the funnel (quotes → paid → refused) as one picture
- [ ] Approvals: decisions as a mini timeline with agent marks; "Nothing waiting" with the next scheduled run that could ask
- [ ] Compose: highlight understood words in the sentence itself (mirror text), if it aligns on iOS at all text sizes; otherwise improve the chips
- [ ] Pocket page: richer covers on the shelf
- [ ] VoiceOver pass on the chart scrub and the edit sheet's stepper (needs a device or Accessibility Inspector)
- [ ] Console: the Evidence and Sellers pages

## Cards by usage, Agents as card rows (18 Oct)

The owner found the black card faces heavy against the white wallet card, the Agents tab's card-in-a-card cluttered, and asked for colour by a clearer category (memory: usage-cards-decisions).

- **Colour is usage, how often a pocket spends** (`shared/sim/pocketApp.ts` `usageOf`, `usageChip`, tested): daily powder blue, weekly or monthly sage (new; it replaces black), one-time wheat, when asked white hatch. It is read from the pocket's app (its routine's cadence; a haggler buys once; anything else spends when asked), so a new pocket gets its colour from its own schedule. Rejected: by agent (brand colours collide, ChainBrain holds 4 of 7, the mark is already on every strip) and by money (it would change colour as balances move).
- **Home:** each strip carries a usage chip in its face's dark tone ("Daily 08:00", "Weekly · Mon", "One-time", "When asked") before the job line, which no longer repeats the schedule. A count row above the stack is the legend. The stack is grouped by usage, scheduled first from the top (`stackOrder(…, grouped)`), instead of alternating faces.
- **Agents:** no box round an agent. A plain header (mark, name, maker, what it has done, Chat or Manage), then its cards in a row you swipe, snapping, the next one peeking, dots under it, ending with a dashed slot "Give Claude its own card · A pocket only Claude can spend from" that opens New pocket app for that agent. "Pocket" stays the product's word everywhere else (the contract, the pitch); the slot says card because it is one. On a full card with the usage line, the "Available" label goes so the contract number fits.
- **Console:** the pocket app's card and the Pockets list's dot use the same usage colours and chip.

## The Brain as a working DAG (18 Oct)

The owner asked for the Brain to be "really working", more professional, "like a real DAG", keeping the current dark graph but more impressive, with live events plus a test button, phone first and then the console (memory: brain-dag-decisions).

- **The pipeline is real.** Every payment already leaves its steps as events: the quote (with Pocket.sol's rule check and Radar's screen), the pay call's Radar check, pre-flight's prediction and its result, the payment or refusal with its tx, then the Sentinel and memory. `lib/brainTrace.ts` rebuilds a decision from those, stage by stage, and `liveTraceOf` shows a test in flight with the rest waiting. Tests: a seeded payment traces with the tx and "Predicted it pays · matched"; the test refusal stops at the pocket's rules and moves nothing; a test cut mid-flight waits at settlement.
- **Run a test** (`world.runTest`, `testPlan`): the owner's tap confirms one item at the quoted price; get_quote and pay run through the same tools an agent uses, then a reflection. The cheapest allowed item under the ask-me limit for a payment, the cheapest seller not on the list for a refusal. Sim test: the payment moves exactly the quote, the refusal moves nothing, and radar, pre-flight, payment and refusal events all appear.
- **The look:** curved edges (a quadratic bend), stroke and opacity by 14-day traffic, traffic as moving dots on the 12 busiest edges, a radial glow behind the brain, a dashed scan ring turning round it, agents and sellers named, pockets named when lit or tapped, a comet-style pulse with a ring opening on the last node, tap to focus a neighbourhood. Ring labels were tried and dropped: they collided with nodes. Transforms and opacity only; Reduce Motion stops travel, flows and breathing.
- **Honesty fixes found while checking:** a refused test first showed Radar and pre-flight as "Not reached", but both ran (the contract refused at settlement), so every stage now shows what its own event said. After a test, the memory update became the newest pulse and the trace vanished; a memory pulse now shows the decision it learned from. The e2e caught that the second test button did nothing for 9 s after a test; fixed.
- **Console Brain page** (`web/src/console/Brain.tsx`): the same layout, moved to `shared/sim/brainGraph.ts` so the phone and console draw one graph. Traffic and pulses are SVG `animateMotion` along the curves (the browser animates them; Reduce Motion drops them), the pulse has a blurred glow and opens a ring on its last node, and "How it decided" is the console's own checks path (`shared/sim/checks.ts`) for the attempt on show. Bugs found while checking: the console's pocket list reordered as activity happened, which moved the chosen test pocket and would make nodes jump (now a stable order and a locked choice); the console's world clock runs ahead of the tab's, so a test's start is now the network's last event time on both apps; the linked-feed wrapper did not forward the new test actions; a test on the story's own pocket waited for the story, so tests now avoid the pocket the story is on. Web 82/82 (1 new feed test), build clean; screenshots `c-brain-refusal.png`, `c-brain-paid.png`.
- **Verified:** tsc; phone 52/52 (5 new); sim 60/60 (1 new); e2e 61/61 (new: a test payment with its tx and "Predicted it pays · matched", then a test refusal "Seller not on your list" with "Predicted a refusal · matched"); iOS Simulator: the graph mid-pulse and a live test ending "Version 1 · learned 1" (`ios-57`, `ios-58`), web refusal trace (`w-57`).

## UX round 3 (18 Oct)

The owner's notes on iOS (memory: ux-round-3-decisions): the cursor pill was cut to "Chain", Skip and Replay should go, Compose needs a loading state, the card stack was more striking than rows, Live belongs in Activity, and Brain should come back as a visual brain that watches and learns.

- **Compose** (b2e732f): the cursor's name pill sits in a 220 pt box, so "ChainBrain" shows whole. Skip and Replay are gone, and so is the "replayed" word (the owner overrode the earlier label rule). Compose shows a full-screen loading state for 2.6 s: the sentence in a card under a light sweep and four steps ticking (read, write the rules, test payments, choose blocks), each a real step of composeApp. It cuts straight to the canvas with no crossfade.
- **Home:** the wallet hero, then the 2.5D stack again. Each strip now shows the agent's mark, the name and the job line. The rows and See all are gone. The e2e no longer clicks See all.
- **Activity:** one tab, a segmented Live / Ledger switch (black thumb, green live dot), opening on Live. Live moved to `components/LiveFeed.tsx`, and the tab bar is Home · Agents · Brain · Activity · Settings. Auto-play ends on `/activity`.
- **Brain:** a node graph on a black card (`lib/brainGraph.ts`, tested: every node is real, one pulse per payment, every pulse runs over graph nodes). Pulses use transforms and opacity only; the dot moves one edge per 520 ms and a ring opens on the last node. The per-pocket brain moved to `/pocket-brain`.
- **Verified:** tsc; phone tests 49/49 (2 new for the graph); e2e 58/58 (new: Activity opens on Live, then Ledger); auto-play runs every scene and ends on Activity's Live view at about 405 s with no page errors; iOS Simulator (prod bundle) shows the stack Home, the graph mid-pulse and Activity (screenshots `ios-54` to `ios-56` in `screenshots/pocket-apps/`).
- **Found while checking:** leaving Home logged "svg width -1". The hidden stack measures 0 wide, so the job-row avatar got a negative size. It is now clamped to 16.

## UX round 2 (18 Oct)

The owner said the look is good but the UX isn't (memory: ux-round-2-decisions, live-canvas-decisions).

- [x] **Live canvas at Compose** (a4a97d6, 1b02654): write → watch → sign.
  - The app designs itself from the real spec, replayed as JSON Patch ops, with the agent's mark as a cursor and skeletons that fill in.
  - A reading phase shows the reader change its mind (research → deal at "drops below").
  - Then a paced on-chain build after the slide.
  - Verified on iOS (prod bundle, Face ID simulated) and e2e 57/57.
- [x] **Haggler face to wheat; deal watcher gauge** (207587f). No card is vermillion any more.
- [x] **Home: the main wallet is the hero, with pockets under it on a rail.**
  - Each row: a mini card in its job's face with the job icon and the agent's mark, the name, one honest job line ("Buys Smart-money flows at ≤ US$0.04", "Haggles DataPro down first", "When asked · Exa & CoinGecko"), a spend bar, the balance and its live sign.
  - Four rows, then See all. Tapping a row flies its mini card into the pocket page.
  - Words: 123 → 65 above the fold, 173 → 101 for the whole screen.
  - E2E: Home checks now expand See all and look for the job lines and the agent per pocket (in row labels). Same facts, not weakened.
  - Evidence: `w-53-wallet-home.png`.
- [x] **Live tab replaces Brain in the tab bar** (Home · Agents · Live · Activity · Settings).
  - A pinned "Now" line: the agent's mark with a pulse, and one sentence (waiting for you, running a routine, working, or "Watching 7 pockets · next: Durian watch Sun 08:00").
  - Requests waiting for you sit on top.
  - One stream of decision cards, newest first: paid, co-signed, refused (amount struck through), a seller's text that tried to give orders (quoted, struck through, "not obeyed"), a chat attack, a Sentinel freeze (a black card), a price check that waited. Filtered by agent chips.
  - Tap a card for the pocket, the rule and the tx, with "Open its receipt".
  - New refusals while you watch give a warning tick.
  - `lib/live.ts` is tested: one card per payment, none invented, unique keys, newest first.
  - Brain is now a pushed screen (still reached from the chat's memory note).
  - Auto-play ends on Live.
  - Evidence: `w-54-live.png`; phone tests 47; e2e 57/57.
- [x] **Give an agent a pocket**.
  - Every agent card has "Give Claude a pocket" (or ChatGPT, or ChainBrain). It opens New pocket app with the sentence started as "Let Claude …", so the reader picks that agent from the owner's own words, and with that agent's examples only.
  - Manage became an icon button. The stats line has its own row, so nothing truncates.
  - Evidence: `w-55-give-a-pocket.png`; e2e 57/57.
- [x] **Critique fixes after the iOS pass**:
  - Home's first four rows show one pocket of each job (deal watcher, research desk, subscriptions, haggler), so the four kinds are seen at a glance; the rest follow under See all.
  - "One purchase · One purchase · Exa" became "Buys once from Exa", and "Mons" became "Mondays".
  - Live shows 12 cards, then "Earlier". A plain payment's sub-line is its pocket's name, not the repeated "Inside the pocket's rules". Live was 383 words.
  - Words now: Home 65 above the fold, Live 91, Settings 82, Agents 116 (mostly the pocket strips' names and balances).
  - Evidence: `ios-53-wallet-home.png`; e2e 57/57. The e2e taps See all before looking for Research data.
- [x] **Console Evidence** (2f66bb6): scenes 11 (haggle) and 12 (routine) were never rows; now 13 rows. Amounts no longer read "US$0.00" for US$0.007.
- [x] **Full auto-play re-verified** after the canvas, the build, the wallet Home and Live: scenes 1–12 in 412 s (headless Chromium), ending on Live, no page errors (`w-56-autoplay-run.png`, a frame every 15 s).
  - The first attempt broke at scene 4 because I edited a shared file mid-run and Metro reloaded the page. Rule kept: no phone or shared edits while auto-play or e2e runs.

## Calm pass (17 Oct, night 2)

The owner said the app looked nice but "a little bit too packed and too much text". The answers (memory: calm-pass-decisions) were:
- Home's "This week": my choice;
- rules: one collapsed card;
- captions: "visual, less text";
- Home: an icon row, and no Recent activity.

Words per screen (headless count at 402 × 874, every visible word with a letter in it):

| Screen | Before | After |
| --- | --- | --- |
| Home | 222 | 173 |
| Pocket page | 276 | 154 |
| Agents | 197 | 155 |
| Brain | 193 | 135 |
| New pocket app, composed | ~6 screens | ~4 screens |

Home's above-the-fold count is mostly the seven card names and balances, which are the content itself.

- [x] **Home** (c2f3d5b): one "This week" card (the curve on top, the covers under it, three icon counts). It replaces three money summaries. The tiles became round quick actions, and Recent activity was dropped.
  - Decision: I merged the chart and the digest rather than drop either. The curve says when the money went and the covers say what it bought, and each lost something alone.
- [x] **Pocket page** (1aedf95):
  - one "Rules you signed" card: icon tiles, sellers as marks with "Others" refused, worst case beside the main wallet's US$0.00; it opens to the seller switches;
  - header chips in place of a sentence;
  - a terse "Will never" with lock/brain tags;
  - no budget caption.
  - Bug found: AnimatedList and Rise's SHIFT used springify(), so History rows never appeared on web. They are timed now.
- [x] **Brain** (213afbb): four panels (Understood, How it shopped, Guarded, Remembers) instead of eight.
- [x] **Agents and receipt** (965d582): no explainer card or Today tiles; one footer line per agent; the receipt's checks fold into "6 contract checks passed".
- [x] **New pocket app** (ccc7f19): the preview drops Next run and Sources (already in the proof card and timeline), and the footnotes are one line each.
- [x] **The cheque** (6bf4fcb): the paragraph that restated the cheque is now its VoiceOver label, and the title fits on one line.
- E2E 57/57 after every slice. One regression was caught and fixed: the budget meter must keep "co-signed by you on its cheque" for scene 12.

## Critique pass 1 (headless Chromium at 402 × 874, plus iOS)

Each screen is scored 1–5 on first-glance wow / hierarchy / visuals over text / motion / system consistency / "AI-made" tells (5 means no tells).

| Screen | Wow | Hier. | Visual | Motion | System | AI tells | Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Home | 5 | 5 | 5 | 5 | 5 | 4 | the hero eyebrow fixed; split bar added |
| Pocket page | 4 | 4 | 4 | 4 | 5 | 4 | — |
| New pocket app | 3 | 4 | 3 | 4 | 4 | 4 | examples became mini app cards |
| Agents | 3→4 | 4 | 3→5 | 3 | 4→5 | 3→4 | done (wallet strips) |
| Activity | 3→4 | 4 | 2→4 | 3 | 4 | 4 | done (pulse) |
| Brain | 3 | 3 | 3 | 3 | 4 | 3→4 | backlog |
| Approvals | 4 | 4 | 3 | 3 | 4 | 3→4 | backlog |
| Settings | 3→4 | 4 | 2→4 | 3 | 4→5 | 4 | done (wallet card) |
| Console Live / Judges | 3→4 | 4 | 4 | 3 | 4 | 4 | done (default pocket, scoreboard) |

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

- [x] **Edit the routine, and Pause all**.
  - Pocket page: next to Pause there is now Edit. It opens a sheet with:
    - cadence chips (every day, weekdays, Mondays, the 1st) and time chips;
    - an allowance stepper (a cent under US$0.10, five cents to US$1, 25 cents above) with day/week/month;
    - a preview of the next run and where the agent stops and asks.
  - Home: Next up has "Pause all" / "Resume all". With everything paused, a quiet card says nothing runs or pays.
  - Bug avoided: `setRoutine` mints a new routine id, and the allowance meter counts payments by id, so "editing" through it would have reset this week's spend. The new `world.editRoutine` keeps the id, runs and spend. It is published as a `routine:edited` event, kept from trimming, and applied by `routineFromEvents`. A test proves it: after an edit to a smaller allowance, US$0.034 already spent leaves US$0.006, and the next run asks.
  - Decision: only a looser allowance (more money, or a longer period) is signed with Face ID. A stricter one, a new time, or a pause can only lower risk, so they save at once.
  - Evidence: `w-24-edit-routine.png`, `w-25-pause-all.png`; sim tests 57 pass; e2e 57/57. A headless run checked that a stricter edit saved (US$0.15 a week) and that Pause all and Resume all both worked.

- [x] **Agents screen** (critique score 3 before). Each agent's pockets are now a small wallet of the same strips Home uses (name and balance, faces interleaved), and each strip opens its pocket with the card flight. The tracked eyebrows on the screen are sentence case.
  - The info card's title was untrue (ChainBrain holds four pockets). It now reads "An agent sees only the pockets you give it".
  - First attempt: a hand of 168 pt cards. Dropped, because the print is unreadable at that size and the cards sat inside the agent card's button (RN-web flagged the nested buttons).
  - Evidence: `w-26-agents.png`; e2e 57/57.

- [x] **Activity pulse**: 14 columns of small squares, one per payment or refusal (ink: paid on its own; blue: co-signed; vermillion: refused or blocked), with today marked. The header is labelled "All time", so its 30 doesn't read as contradicting the pulse's 14-day counts.
  - Evidence: `w-27-activity-pulse.png`; phone tests 44 pass. No e2e this slice, because Activity has no e2e-dependent targets and the previous slice ran 57/57.

- [x] **Eyebrow sweep** (critique: tracked uppercase labels over every card read as a template). `Eyebrow` is now sentence case and untracked (12 uses), as are Home's "In agent pockets", the pocket page's "Where the money is", and compose's Can / Can't.
  - Kept as conventions: the card print ("AVAILABLE", "CONTRACT"), the network chip, the Next up day label, and status banners.
  - Evidence: `w-28-eyebrows.png`; e2e 57/57 (the e2e's /IGNORED/, /CONTRACT/ and /CHAINBRAIN/ checks read tags that were kept).
- [x] **Console first glance** (5c0ae57):
  - Live opens on the pocket an agent last touched, not the newest pocket seeding created (which had three empty states).
  - The Judges scoreboard says "4 attacks to try" before anything is tried, not "0 of 4 attacks blocked".
  - Web tests 81 pass; build clean.

- [x] **Stack: press-lift, plus the fan and drop-in checked on video**.
  - A card rises 10 pt under the thumb (a peek that shows its stripe and agent pill) and springs back on release; Reduce Motion turns it off.
  - The pull-to-fan, recorded on the iOS production bundle: the strips spread and reveal every agent's pill, then settle.
  - The drop-in is in the launch recording from the first slice.
  - Evidence: `ios-29-pull-fan.png` (a frame mid-pull), `w-29-press-lift.png`.

- [x] **Intro page 2, "Say what it's for"**:
  - the example sentence types itself;
  - the real reader's chips appear (the app type flips from Research desk to Deal watcher at "drops below");
  - the owner's own deal-watcher card drops in.

  Page 1's text went back to its original line. The e2e intro test now walks four pages, adding one Next and checking the new title, with no check weakened.
  - Evidence: `w-30-intro-sentence.png` (typing, and done); e2e 57/57.

- [x] **Payment receipt**:
  - the seller's mark is the hero, with the paying agent's mark on its corner;
  - the sentence names the agent ("ChatGPT paid Exa on its own");
  - six green checks show the Pocket.sol rules the payment passed. A settled payment passed all of them by construction, and a co-signed one shows "You co-signed" in blue;
  - the pocket appears as its card strip.

  Refusals and other receipts are unchanged. Evidence: `w-31-receipt.png`.
- [x] **AX5 pass (iOS, accessibility-extra-extra-extra-large)**. Three problems found and fixed:
  - Home's total ran into the main wallet; the hero now stacks at large sizes;
  - a Next up tile broke "US$0.067" across two lines; the marks and the price now stack;
  - the digest's counts truncated ("co-signed…"); they now go full width.

  The card print is capped at 1×, so the stack holds. Evidence: `ios-30-ax5-home.png`, `ios-31-ax5-nextup-digest.png`. The simulator's text size was set back to the default afterwards.

- [x] **Home hero split**: a thin bar under the total splits it by pocket, each in its card's face colour, largest first. The VoiceOver label gives each pocket's share. Evidence: `w-32-hero-split.png`; e2e 57/57.
- [x] **Console chart hover** (parity with the phone's scrub): hover, or the arrow keys on the focused chart, reads any day's quote. The cursor turns blue in the buy zone. Evidence: `c-chart-hover.png`; web tests 81 pass, build clean.

- [x] **Settings: the main wallet as its own card**. It has the pockets' proportions, but a face no pocket uses (white, a heavy ink hatch edge, ChainBrain's mark), with "Only your key moves it", the balance, and the address tail with Copy. It is the one card no agent holds. Settings' remaining enter animations are now timed instead of springs (web-safe rule).
  - Evidence: `w-33-settings-wallet.png`; e2e 57/57.
- [x] **Console "What happens next"** (24a6174): the phone's pre-first-run timeline, ported to the console's pocket view.
  - Not visually verified: no seeded pocket has a routine with zero runs. Typecheck, build and 81 web tests pass.
- **Run payoff on video**: not recorded. Data renewals has no run-now block, and Durian watch's run only logs a price above its limit. The payoff path (report onto the shelf, run row, success tap) is exercised end to end by e2e scene 12, where runs 1 and 2 pay and run 3 raises the cheque, which passes. Moved to "Not verified".

- [x] **New pocket app: the examples as mini app cards**. The four examples are a 2×2 of small cards, each in its job's face (black research desk, blue deal watcher, white-hatch subscriptions, vermillion haggler) with the agent that would hold it. Before typing, the owner sees the four kinds of app.
  - Evidence: `w-34-compose-examples.png`; e2e 57/57.

- [x] **Brain anchored on its pocket**: the small name chip became the active pocket's own card strip (the same as Home's stack), with a round chevron. One button, so the e2e "Change pocket" click stays unambiguous.
  - Evidence: `w-35-brain-strip.png`; e2e 57/57.

Earlier the same day, before this log existed:
- Home wallet stack, live card signs and Next up (e68c433)
- compose chips (b544f42)
- What happens next, chart scrub and run payoff (d11e678)
- console routine timeline (b7ca0ab)
- Brain routine panel (3 commits before 6227fda)

E2E: 57/57.

## Checkpoint (after the Brain slice, 318880e)

expo-doctor 21/21 · mobile typecheck clean · phone tests 44 · sim tests 57 · server pocket-app tests 4 · web tests 81 + build clean · e2e 57/57.

## Decisions (made on the owner's behalf)

- **Home layout:** a vertical wallet stack, not a carousel or grid. It is the only layout that shows all 7 pockets at a glance, and judges know it from Apple Wallet. See research loop 4.
- **Pocket page tabs:** no "App · Rules & history" tabs. They would hide the signed rules and the worst case, which are the trust story.
- **Compose highlighting:** chips under the box, not highlighted words in the box. Mirror text over a multiline iOS `TextInput` is fragile with dynamic type. This is still open as a backlog item if it can be done well.
- **Swipe-back:** the pocket page swipes back from the edge only, so the chart scrub and the shelf keep horizontal drags.
- **Pacing:** the session is not in `/loop` mode, so there are no scheduled wake-ups. The slices run back to back in one session.

## Not verified / blocked

- The run payoff's animation on video. It is functionally covered by e2e scene 12.
- The console's "What happens next" on screen: no seeded pocket has a routine with zero runs.

- 60 fps on a physical iPhone. Simulator timing is meaningless while Chromium runs beside it.
- VoiceOver on the chart's adjustable action. It is wired, but not listened to.
- AX5 on the compose chips and Brain (checked: Home, Next up, digest).
