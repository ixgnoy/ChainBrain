# ChainBrain UX analysis (16 Oct 2026)

A user-experience review of the phone app after the VaultBank round, with a short note on the web console. It covers what a first-time owner meets: the intro, Home, approving an agent's payment, creating, funding and revoking pockets, connecting Claude or ChatGPT, and accessibility.

**Method**
- Walked every journey in Expo Go on an iPhone 17 simulator (402 pt), plus one pass at a large accessibility text size.
- Ran an automated pass over the web build for accessible names and target sizes.
- Read the code for behaviour the simulator can't show (timers, gestures, where the dock renders).
- Checked against the ui-ux-pro-max rule set (accessibility, touch, navigation, forms, animation) and a research brief on agent-payment and fintech UX, linked at the end. Sources are marked P (primary: standard, platform owner, paper), N (NN/g or Baymard) or V (vendor). Items the research could not verify are said to be so.

## Verdict

The core idea is right, and the research backs it:
- In-limit payments never ask. Only payments above the ask-me limit reach the owner.
- What the wallet checked is drawn separately from what the agent wrote.
- Consent says plainly what an agent can and can't do.

The biggest problems are not visual:
- The app breaks at large text sizes.
- Some critical actions are gesture-only for sighted users.
- The intro runs on every launch and moves faster than people read.
- Two money labels contradict the user's mental model.
- An agent's request is invisible on half the screens.

## Top 10, by impact

| # | Fix | Severity | Effort | Why |
| --- | --- | --- | --- | --- |
| 1 | Make text scale: drop fixed line heights and fixed control heights, cap scaling with `maxFontSizeMultiplier` where a layout can't grow | Critical | M | At the "accessibility large" text size, text is clipped almost everywhere: balances cut in half, tile and tab labels gone, button labels unreadable. Dynamic Type support is an Apple HIG expectation, and owners with low vision are exactly who needs a clear money app. |
| 2 | Add a plain "Approve US$1.50" button beside every slide, and a "Revoke" button beside every hold, both opening Face ID | Critical | S | WCAG 2.5.7 (AA) needs a single-pointer alternative to dragging. VoiceOver already gets an activate action, but a sighted user who can't drag (tremor, one hand, Switch Control) cannot approve or revoke. [P: W3C 2.5.7] |
| 3 | Show the ask dock on every screen, not only on the tabs | High | S | It renders in the tab layout only, so on the chat, a pocket page, an agent's page or Connect, Claude's request is invisible while its 10 minutes run. Those are exactly the screens where an owner is busy with agents. |
| 4 | Intro: first launch only, user-paced (or a pause control), re-open from Settings | High | S | It shows on every launch and advances every 2.2 s. Each page has about 30 words, roughly 8 s of reading. NN/g found tutorial readers did no better than skippers, and auto-advancing content hides what people try to read. WCAG 2.2.2 needs pause, stop or hide. [N: NN/g tutorials, auto-forwarding; P: WCAG 2.2.2] |
| 5 | One money action with an honest name: "Fund" next to the main wallet reads as "deposit", but it moves money from the main wallet into a pocket, the same as "Add money" | High | S | Two labels for one action, and one of them says the opposite of what happens. Call it "Move to a pocket", keep one entry point, and show which agent holds each pocket in the picker. |
| 6 | Revoke from a pocket page revokes that pocket only | High | S | The revoke sheet opened from Research data lists all four pockets with a radio list, so an irreversible action is one mis-tap away from the wrong pocket. NN/g: name the item and the consequence in the confirmation. [N: NN/g confirmation dialogs] |
| 7 | Lead the cheque with one money sentence and the expiry outcome | Medium | S | "Claude pays DataPro US$1.50 from Market news. US$3.40 stays in the pocket." Then: "If you don't answer by 01:47, nothing is paid and Claude can ask again." That is the transaction-preview pattern, and it makes the deadline calm and real rather than a pressure timer. [P: WCAG 2.2.1; V: wallet simulation previews; P: Mathur et al. on timers] |
| 8 | Make Face ID the signature, not a second confirmation | Medium | M | Today the slide is intent and Face ID follows. Have Face ID sign the exact payload (amount, payee, pocket, nonce) and say so ("Face ID signs exactly this payment"). Then a tap on Approve plus Face ID is enough for in-limit amounts, and the slide stays for the largest ones. [P: arXiv 2609.21081 Loopjacking; N: friction matched to stakes] |
| 9 | Presets in the wizard jump to Review | Medium | S | Picking "Research data" still walks all seven steps. The one-sentence path already jumps to Review with every value editable; presets should too (two taps to a pocket). |
| 10 | Header targets to 44 pt; the dock must not sit on the front card at rest | Low | S | The bell and avatar are 42 pt (Apple's minimum is 44) and the 7/14-day tabs are 40 pt tall. On Home's first screen the dock covers the deck's front card. |

## Journeys

### 1. Approving an agent's payment (the core)

**What works**
- **Rare by design.** Only payments above the ask-me limit reach the owner, so each request means something. Research on approval fatigue warns that a prompt accepted 93 %+ of the time trains people to tap through; the pocket model avoids that. [V/P: Anthropic auto-mode post; P: arXiv 2606.22721]
- **The dock is the right channel.** It doesn't block the screen, it's hard to miss, and it shows who, how much and how long. It works like a now-playing bar, and "+2" handles a queue.
- **The cheque separates facts from the agent's words.** Pay, to, for and what's left come from the signed authorization and the contract. Claude's note sits apart, marked "not checked". This is what the research on forged approval dialogs recommends: the agent asking for money must not write the justification that decides it. [V: Checkmarx "Lies-in-the-Loop"; P: arXiv 2608.04755]
- **Flipping the pocket's own card** ties the request to a pocket the owner recognises.

**Problems and fixes**
- **The dock is missing on pushed screens (High).** It renders only in the tab layout. Render it at the root, above everything except sheets.
- **It covers the deck's front card on Home's first screen (Low).** Either add bottom space to the deck while the dock shows, or let the dock shrink to a pill with the mark and ring after a few seconds, expanding on scroll-up.
- **A warning haptic for every request (Low).** Routine co-sign requests feel like an alarm. Use a light notification tick, and keep the warning haptic for Radar or Sentinel events.
- **No sentence that says the outcome (Medium).** Add "Claude pays … US$3.40 stays" at the top, and the expiry outcome next to the ring (fix 7).
- **The countdown ring is vermillion.** The research says a real, contract-enforced deadline is legitimate, but urgency styling should stay calm and the consequence should be safe and stated. Keep the ring and use ink for most of the window, vermillion only for the last minute.
- **Double confirmation (Medium).** See fix 8. Also give the Face ID prompt a specific reason ("Approve US$1.50 to DataPro from Market news"), already done, and on cancel say "Nothing was signed", already done.
- **Decline gives no outcome.** After Decline, confirm with a short toast ("Declined. Claude won't pay DataPro."), and let the agent's chat show that the owner declined.
- **After approving, the next request isn't offered.** When "+2" wait, open the next cheque, or show "2 more waiting" with a button, so the owner can clear the queue in one sitting.
- **Notifications (needs a development build).** The opt-in inside the cheque is contextual, which is good. Ask earlier as well, at Connect: "We'll tell you when Claude needs your OK." On iOS, a pending co-sign is a fit for a Time Sensitive notification and a Live Activity with the countdown. Show "Approval needed", not the amount or payee, on the Lock Screen. Expo Go can't do Live Activities. [P: USENIX Security 2021 on permission rationale; P: Apple HIG, snippet level]

### 2. First launch and the intro

- **Shown on every launch (High).** A returning owner sits through it each time, or reaches for Skip. Show it once, keep "How ChainBrain works" in Settings, and teach limits at the first pocket.
- **2.2 s per page, auto-advancing (High).** Too fast to read, and moving content is easy to miss. Let the user page, or keep auto-advance with a visible pause. Stop it under Reduce Motion and as soon as the user touches it (it already stops on touch).
- **The content is good.** "Give your AI a pocket, not your wallet", "The limits live in a contract you own" and "The worst case is the pocket balance" are the three ideas an owner needs. Move the same sentences to where they matter: the first pocket, the first consent, the first approval.

### 3. Home and the money model

- **"Fund" and "Add money" are one action, and "Fund" sits on the main wallet (High).** Owners will expect "Fund" to add money to the main wallet. Rename it to "Move to a pocket", keep a single entry point, and show the holding agent and the pocket's face colour in the picker. The picker today uses letter avatars, with no agent shown.
- **The hero number is the pocket total, labelled "Agent pockets".** That's right for this product, but say "In agent pockets" so it isn't read as the owner's whole balance, and keep the main wallet visibly the second number.
- **The avatar opens Settings, and Settings is also a tab.** Two routes to one place is harmless, but the avatar is the natural home for "Wallet and key" (address, backup). Make it that, or drop it.
- **Talking to ChainBrain's agent is hard to find once outside agents exist.** The "Ask agent" tile turns into "Connect", so chat is only reachable from Agents and then Chat. Keep a visible way to the chat on Home, for example the ChainBrain card in the deck or a header button.
- **The deck's gestures.** "Tap a card to bring it to the front" is shown, which is good. Swipe to cycle and tap-front-to-open are not, and there's no count. Add "1 of 4" and a "See all" list for owners who don't discover the gesture. Hidden gestures are poorly discovered, though the research found no measured rate. [P: GhostUI, CHI '26]

### 4. Creating a pocket

- **Strong:** the one-sentence path, the live worst-case line ("If the agent is hijacked, the most it can lose is US$5.00, only to DataLite and DataPro"), and the Review step with "Slide to create and fund".
- **Seven steps when a preset is chosen (Medium).** Jump to Review with every row editable, as the sentence path does.
- **Two equal black buttons on step 1 ("Build my pocket" and "Continue").** Make the sentence path's button secondary until text is typed, so the screen has one primary action.
- **Closing loses the draft without a word.** Fine on step 1. From step 3 on, ask "Discard this pocket?".

### 5. A pocket, and revoking it

- **Strong:** the rule tiles (cap, ask-me limit, end), the worst case with main-wallet exposure of US$0.00, and the revoked state (banner, what came back, "Agent locked out").
- **The revoke sheet lists every pocket (High).** From a pocket page, show only that pocket and its consequence: "Stops Claude for good. US$4.90 returns to your main wallet. Payments already made stay made."
- **Revoke sits beside Return funds at the same weight.** The hold protects against a slip, but give Revoke a little distance, and add the plain button from fix 2.
- **No undo.** Revoke is final on the contract, so a confirmation is right here. NN/g reserves the extra friction for exactly this case. Keep the hold for the slide-path users. [N: NN/g confirmation dialogs]

### 6. Connecting an agent

- **Strong:** the two-step layout, the consent sheet that follows the familiar OAuth pattern ("Claude can / Claude can't"), and budget and sellers chosen right there.
- **The QR code is shown "to Claude's app" on the same phone.** A QR code is for another device. Lead with "Open in Claude" or the share sheet, and keep the QR code for the desktop app.
- **The consent shows the cap and ask-me limit but can't change them.** Add an "Edit limits" link that opens the same tiles as the pocket page.
- **"Your 4 other pockets keep the agent they were made for, so they can't be handed over"** is hard to parse. Try "Claude gets a new pocket. Your other pockets stay with their agents."

### 7. Navigation and words

- **The "Brain" tab name says nothing about its contents** (what the agent understood, the rules it follows, what it remembers). Owners won't know to look there. "Rules" or "Memory" says it.
- **The 5-tab bar is within the limit** (bottom navigation ≤ 5).
- **Copy is plain and specific almost everywhere.** Keep the reason codes in Details only, as today.

## Accessibility checklist (phone)

| Check | Status |
| --- | --- |
| Accessible names on every control | Pass (web scan: no unnamed controls) |
| Dynamic Type up to accessibility sizes | **Fail**: text clipped (fix 1) |
| Drag alternative (WCAG 2.5.7) | Partial: VoiceOver action exists, no visible tap path (fix 2) |
| Auto-advancing content can be paused (2.2.2) | **Fail**: intro (fix 4) |
| Targets ≥ 44 pt | Mostly. Bell 42, range tabs 40 (fix 10) |
| Colour not the only signal | Pass: states carry text ("Revoked", "Low risk 0/10", "10m") |
| Reduce Motion | Pass in code (flip, deal, tilt and reveal all have reduced paths); not tested on device |
| Contrast | Pass for body text; vermillion text uses `vermillionInk` |

## Web console (short)

It is a presenter and judge view, not an owner's app, so the bar is clarity at a distance. Since this round, the header chip fits. The Live page is dense on a laptop. Presenter mode exists for the room. No new blocking issues were found. Its pocket card now matches the phone.

## Plan

- **Now (about a day):** fixes 2, 3, 4, 5, 6, 7, 9 and 10. All are copy, layout or routing changes on existing components.
- **Next:** fix 1 (text scaling across the type scale and fixed-height controls, then a pass at every text size), and fix 8 (Face ID as the signature, slide only for large amounts).
- **Later, needs a development build:** Time Sensitive notifications and a Live Activity for pending co-signs; notification permission asked at Connect.
- **Measure once real people use it:** approval rate and median time to decide per co-sign (fatigue shows up as fast approvals near 100 %), dock-to-cheque opens, intro skips, revoke reversals (re-creating a pocket for the same agent within an hour suggests a wrong-pocket revoke).

## Sources

The research brief was gathered on 16 Oct 2026. Apple HIG pages could not be fetched (rendered by script), so HIG points are from general knowledge and should be checked.

- W3C WCAG 2.2: [2.5.7 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html), [2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html), [2.2.1 Timing Adjustable](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html), [2.5.8 Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). P.
- NN/g: [mobile tutorials](https://www.nngroup.com/articles/mobile-tutorials/), [auto-forwarding carousels](https://www.nngroup.com/articles/auto-forwarding/), [confirmation dialogs](https://www.nngroup.com/articles/confirmation-dialog/), [bottom sheets](https://www.nngroup.com/articles/bottom-sheet/). N.
- Agent approvals:
  - [arXiv 2608.04755](https://arxiv.org/abs/2608.04755), [arXiv 2609.22067](https://arxiv.org/abs/2609.22067), [Loopjacking, arXiv 2609.21081](https://arxiv.org/abs/2609.21081), [Habituation at the Gate, arXiv 2606.22721](https://arxiv.org/html/2606.22721v1): P (preprints, not peer reviewed).
  - [Anthropic: Claude Code auto mode](https://anthropic.com/engineering/claude-code-auto-mode), [Checkmarx: Lies-in-the-Loop](https://checkmarx.com/zero-post/turning-ai-safeguards-into-weapons-with-hitl-dialog-forging/): V.
- Payments: [Stripe spend requests](https://docs.stripe.com/agentic-commerce/link-cli/use-link-wallet-pay-online), [Coinbase agentic wallets](https://docs.cdp.coinbase.com/agentic-wallet/cli/welcome), [Ledger ERC-7730 clear signing](https://developers.ledger.com/docs/clear-signing/erc7730): V (first-party docs). The AP2 spec page could not be reached.
- Urgency and deceptive design: [Mathur et al. 2019](https://arxiv.org/pdf/1907.07032), [Luguri and Strahilevitz 2021](https://academic.oup.com/jla/article/13/1/43/6180579). P.
- Permissions: [Explanation Beats Context, USENIX Security 2021](https://www.usenix.org/conference/usenixsecurity21/presentation/elbitar). P.
- Hidden gestures: [GhostUI, arXiv 2601.19258](https://arxiv.org/abs/2601.19258v1). P.
