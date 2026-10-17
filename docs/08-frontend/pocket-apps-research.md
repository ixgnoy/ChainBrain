# Pocket apps: research log

This log records what was read before each slice and the decision each finding changed. Licences were checked against the cloned `LICENSE` files. The date is given on each loop. The design that came out of loop 1 is in [`docs/superpowers/specs/2026-10-17-pocket-apps-design.md`](../superpowers/specs/2026-10-17-pocket-apps-design.md), and the as-built description is in [`pocket-apps.md`](pocket-apps.md).

## Loop 1: before the first slice (17 Oct 2026)

### Generative UI on GitHub

| Repo | Licence (checked 17 Oct) | What we took | Code copied? |
| --- | --- | --- | --- |
| [vercel-labs/json-render](https://github.com/vercel-labs/json-render) | Apache-2.0 | Every block declares a description and an example, and the model prompt is generated from the catalogue (`core/src/schema.ts` `catalog.prompt`). A structural validator runs after parsing (`core/src/spec-validator.ts`). Optional props are nullable, not omitted. | No: the ideas were re-written in about 150 lines |
| [a2ui-project/a2ui](https://github.com/a2ui-project/a2ui) | Apache-2.0 | A versioned spec plus a `catalogId` (we use `catalogue: "chainbrain.pocket.v1"`). The component tree is kept apart from its data. An action that moves money must come from a user gesture in the renderer (`requiresUserActivation`, v1.0 protocol). | No |
| [ag-ui-protocol/ag-ui](https://github.com/ag-ui-protocol/ag-ui), [CopilotKit](https://github.com/CopilotKit/CopilotKit) | MIT | The snapshot-plus-delta idea, applied to the "assembles itself" animation: the whole spec is validated first, then the screen plays it in block order. | No |
| [Vercel AI SDK](https://github.com/vercel/ai) generative UI | Apache-2.0 | The pattern only: a typed tool result maps to a fixed component. | No |
| [thesysdev/openui](https://github.com/thesysdev/openui) | MIT | Skimmed. Its compact language is not needed, because our specs are small and JSON is easier to validate. | No |
| [MetaMask/delegation-framework](https://github.com/MetaMask/delegation-framework) | MIT and Apache-2.0 (dual; the files say `SPDX: MIT AND Apache-2.0`) | The semantics of `ERC20PeriodTransferEnforcer` (details below). | No: the semantics only |
| [google-agentic-commerce/AP2](https://github.com/google-agentic-commerce/AP2) | Apache-2.0 | The `IntentMandate` vocabulary (`code/sdk/python/ap2/models/mandate.py`): description, merchants, skus, intent expiry, `user_cart_confirmation_required`. AP2 has no recurring mandate, so a routine is our extension. | No |

**How the period rule works in `ERC20PeriodTransferEnforcer`:**
- **Terms.** It takes `periodAmount`, `periodDuration` and `startDate`.
- **Current period.** `currentPeriod = floor((now - startDate) / periodDuration) + 1`.
- **What can be spent.** "Available" is `periodAmount` minus the amount already spent in the current period. Before `startDate` it is 0.
- **No carry-over.** Unused allowance is forfeited when the next period starts.
- **Our version.** `shared/sim/pocketApp.ts` `periodWindow` / `available` work the same way. Our weeks are calendar weeks in Hong Kong time (UTC+8, no DST), so a "week" starts on Monday at 00:00.

**What changed:**
- **Nothing was copied.** Every useful piece was short enough to write ourselves, so no licence file or NOTICE was needed. This is recorded in `docs/04-build/licences-and-reuse.md`.
- **Blocks never carry values.** A block names a data source by enum, and the renderer reads the numbers from the ledger. A spec therefore can't lie about a balance.
- **Seller names come from the seller registry by id**, never from the spec.

### Papers (abstracts checked on arXiv, 17 Oct)

| Paper | Finding | Decision it changed or supported |
| --- | --- | --- |
| Chen et al., [Generative Interfaces for Language Models](https://arxiv.org/abs/2508.19227) (2025) | Structured interface output beat chat answers by up to 72% in human preference. | Supports: a spec of fixed blocks, not code |
| Cao et al., [Generative and Malleable UIs with a task-driven data model](https://arxiv.org/abs/2503.04084) (CHI 2025) | Generate the data model first, then the UI. | The routine (typed fields) is the pocket's data model, and blocks bind to it |
| Peng et al., [EvoGenUI-Bench](https://arxiv.org/abs/2608.29387) (Aug 2026) | Multi-turn regeneration dropped to 37% task completion, and retention of earlier behaviour to 52%. | **Changed:** a spec is composed once, at creation, and never regenerated in place. Block order is fixed across runs |
| Kim et al., [Fostering Appropriate Reliance on LLMs](https://arxiv.org/abs/2502.08554) (2025) | Explanations raised reliance on wrong answers too. Sources and visible inconsistencies lowered it. | **Changed:** the routine's cheque shows checkable facts (this week's spend, the allowance, this item's price), not prose |
| Vasconcelos et al., [Explanations can reduce overreliance](https://arxiv.org/abs/2212.06823) (2023) | Explanations help only when they make verifying cheaper. | The budget meter puts spent, allowance and this run on one bar |
| Turan, [Oversight Has a Capacity](https://arxiv.org/abs/2606.08919) (Jun 2026, preprint) | With fatigue modelled, more oversight can make a system less safe. | A routine asks at most once per run. The cheque offers "raise the weekly limit" as the lasting fix rather than asking again |
| Feng et al., [Levels of Autonomy for AI Agents](https://arxiv.org/abs/2506.12469) (2025) | Five levels, defined by the user's role. | The routine header reads "Runs on its own inside HK$X a week · asks you above it" (observer inside the limit, approver above it) |
| Bilal et al., [From Information to Delegation](https://arxiv.org/abs/2608.02100) (Aug 2026) | Delegating financial execution to AI is still rare. | Tight defaults: two periods of funding at most, and Pause and Revoke always on screen |
| Chan et al., [Visibility into AI Agents](https://arxiv.org/abs/2401.13138) (2024) | Agent identifiers plus activity logs. | Every run receipt names the agent and the routine run number |
| Xiong et al., [Biased average position estimates in line and bar graphs](https://arxiv.org/abs/1908.00073) (2019) | Position judgements on bars and lines are biased. | **Changed:** the limit is a marked tick or line with its exact amount, never bar length alone. The deal chart draws the owner's limit as a labelled line |
| Debenedetti et al., [CaMeL: Defeating Prompt Injections by Design](https://arxiv.org/abs/2503.18813) (2025) | A plan fixed before untrusted data arrives gives provable security. | A routine is typed fields fixed at creation, and the runner never reads seller content |
| Beurer-Kellner et al., [Design patterns for securing LLM agents](https://arxiv.org/abs/2506.08837) (2025) | Plan-then-execute and similar patterns. | A "Will never" block lists the fixed payees, the cap and the schedule |

These came up but could not be verified, so no decision rests on them:
- a controlled study of digest versus real-time notifications;
- a study of limit lines specifically;
- a study of "who acted" cues for agents.

**Agent attribution.** [*Who am I talking to?*](https://research.google/pubs/who-am-i-talking-to-a-large-scale-measurement-of-surface-attribution-across-real-world-security-and-privacy-interfaces/) (CHI 2026, N = 4,400 and 3,057) found that people name the source of a UI element only about 55% of the time, and familiar brand marks raise that. This, together with [Anthropic's trademark guidelines](https://www.anthropic.com/legal/trademark-guidelines) (no colour changes) and [OpenAI's brand page](https://openai.com/brand/) (approved colour formats only), decided the theming:
- the job picks the card colour;
- the agent shows through its own unaltered mark and its name.

### Fintech practice (checked 17 Oct)

- **Revolut Subscriptions** ([Oct 2020 launch](https://www.revolut.com/news/revolut_launches_smart_subscriptions_feature/), [scheduled payments help](https://help.revolut.com/en-AU/help/card-payments-withdrawals/getting-started-with-card-payments/scheduled-payments/how-to-unblock-a-merchant)). It shows one list with spend per merchant, notifies before a scheduled payment, and warns when funds are short. → Our renewals list is sorted by next date, and each row has its seller, amount and a "short of funds" state.
- **Monzo Trends** ([Trends](https://monzo.com/blog/monzo-us-blog/trends), [Balance in Trends](https://monzo.com/blog/balance-in-trends)). It plots upcoming payments on the balance graph. → The subscriptions hero shows upcoming renewals as ticks on the month bar.
- **Robinhood limit orders** ([Legend charting](https://robinhood.com/us/en/support/articles/trading-with-robinhood-legend), [limit order](https://robinhood.com/us/en/support/articles/limit-order)). The limit sits on the chart as a horizontal line, with a price pill at the axis edge. → The deal chart draws the owner's limit as a dashed line with a pill at the right edge, and marks each buy on the line.
- **Not found, and not used:** authoritative layout sources for Alipay mini-programs, Ah Bao, WeChat Pay or Cash App.

### Expo, Reanimated 4 and Skia 2 (docs via ctx7, no quota error)

The ctx7 library ids were `/websites/swmansion_react-native-reanimated` and `/wcandillon/react-native-skia`.

**Do:**
- Build entering animations once, at module scope or memoised.
- Cap staggers at about 8 items, 50 to 70 ms each.
- Draw a line in with a Skia stroke whose `end` is driven by a shared value.
- Use one Canvas per hero and pass shared or derived values straight to Skia props.
- Under Reduce Motion, entering animations snap and exits are dropped ([accessibility guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility)), so the layout must work with no motion at all.

**Don't:**
- Use shared element transitions. They are experimental, gated by a build flag and not supported with expo-router ([overview](https://docs.swmansion.com/react-native-reanimated/docs/shared-element-transitions/overview)). The existing measured card flight (`ui/cardFlight.ts`) stays.
- Use `usePathInterpolation` unless the paths have the same commands.
- Read `.value` during render.

### UI/UX Pro Max (skill database, 17 Oct)

- **Charts.** "Performance vs target" points to a bullet chart with a marker line, with the number and target as text beside it. Trend over time points to a line chart with a visible data-table fallback. → The budget meter is a bullet bar with a labelled limit tick. The price chart gives screen readers its quotes as a list ("09:00 Tue, HK$0.368 …").
- **Suggestion not taken.** The product search suggested "glassmorphism plus dark mode" for fintech. Our design system forbids both and takes precedence.

## Loop 2: what validation turned up (17 Oct 2026)

The first browser run at 390 pt and the first full e2e pass turned up four things. Each was researched, then fixed.

| Found | Source | Decision |
| --- | --- | --- |
| Amounts showed as "HK$9.9" in the compose preview | CSS Align 3: a clipped (`overflow:hidden`) box takes its baseline from its bottom edge ([css-align-3 §9.1](https://www.w3.org/TR/css-align-3/)). Browsers disagree on the exact edge ([Firefox bug 1036404](https://bugzilla.mozilla.org/show_bug.cgi?id=1036404)). | A row holding money reels is bottom-aligned, never `baseline`. The comment in `PocketApp.tsx` says why |
| Entrances switched their style to `undefined` once settled | Reanimated: removing an animated style "doesn't unset values that were applied" ([useAnimatedStyle](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedStyle)). `FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS` changes what happens on detach ([feature flags](https://docs.swmansion.com/react-native-reanimated/docs/guides/feature-flags)). | A settled block takes a plain style at its resting values, as the app's `Reveal` already does |
| A scale in the entrance made the money reels measure their digits too small (web) | Reproduced in the preview | Entrances use translate and opacity only. Both are cheap ([performance guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance)) |
| Shelf covers scroll sideways inside the vertical page | `directionalLockEnabled` is iOS-only and off by default. `nestedScrollEnabled` is Android-only ([ScrollView](https://reactnative.dev/docs/scrollview)) | The covers strip sets `directionalLockEnabled` |
| Fixed-height tiles would clip at accessibility text sizes | WCAG 1.4.4: text resizes to 200% without loss ([Understanding 1.4.4](https://w3c.github.io/wcag/understanding/resize-text)) | Tiles and covers use `minHeight`. At large text the four next-run tiles wrap two by two. Example chips are 44 pt |
| How should a routine that pays on its own notify? | Apple HIG interruption levels: Passive for "information people can view at their leisure", Time Sensitive for now ([Managing notifications](https://developer.apple.com/design/human-interface-guidelines/managing-notifications)). Revolut alerts only before a payment or when funds are short ([Finextra, 2020](https://www.finextra.com/pressarticle/84380/revolut-launches-smart-subscriptions-feature)) | A run's receipt is silent and in the app (recent runs, the shelf, the meter). Only the cheque past the allowance asks, through the existing ask path (`lib/notify.ts notifyAsk`). No per-run push |

Not verified, so no decision rests on it: whether Yoga on iOS takes a baseline from the first child. The bottom-alignment fix avoids the question on every platform. The note that Expo Go runs JavaScript slower than a release build means 60 fps has to be judged on a device.

## Loop 3: critique against "AI-made" tells, the console, and iOS (17 Oct 2026)

**What reads as AI-made in 2026.** Sources:
- [Noqta, Jun 2026](https://noqta.tn/en/blog/ai-design-slop-overused-ui-patterns-fix-2026), an opinion piece;
- [a community anti-slop skill file](https://www.skills.sh/d-oit/do-web-doc-resolver/anti-ai-slop).

They list the same tells: uniform corner radii, decorative purple-to-blue gradients, over-tracked uppercase eyebrows everywhere, fake "Live" badges, one-sided coloured card borders, and identical card grids. None of this is a controlled study. We used it as a checklist against our own screenshots:

| Tell | Ours | Done |
| --- | --- | --- |
| Uniform radii | Cards 20, tiles 16, buttons 14, from the design system | Kept |
| Gradients, glass, purple | None | Kept |
| Tracked uppercase eyebrow on every card | Every block had one | **Changed:** block titles are sentence-case Clash headings (phone and console). The status pill is sentence case too |
| Fake live badges | "Active" shows only for a real routine, and does not pulse | Kept |
| One-sided borders | None | Kept |

**Console.**
- **Found:** the console seeds other owners' morning between the presenter's history and today, so a routine run due in between got published after them. Its time was pushed forward: an 08:00 quote showed at 20:11.
- **Changed:** `catchUpRoutines` runs those first, and a test checks every seeded quote lands at 08:00.
- Pocket names come from the app's title (the owner's words).

**iOS (Expo Go on the iOS 26 Simulator, iPhone 17).**

| Found | Changed |
| --- | --- |
| New pocket app padded its top twice: the header is in the flow when the page has no scroll value | Removed the extra padding |
| A slide to create that starts near the left edge was taken by the stack's swipe-back | Swipe-back is off on that page, which has its own back button |
| The ask dock floats over the bottom of the page | The page has room for it |

Verified on the Simulator:
- the deck with job faces;
- the research desk's covers;
- New pocket app composing a deal watcher and a research desk;
- the slide to create, then Face ID (simulated match);
- the card landing in its app;
- three runs, the third raising the cheque ("Run 3 would pass this week's HK$0.40", the week's bar), co-signed with Face ID;
- the meter at HK$0.408 with HK$0.008 over.

Screenshots: `screenshots/pocket-apps/ios-*.png`.

**Not verified:**
- a physical iPhone;
- 60 fps in Expo Go on a device, since the Simulator is not a frame-rate reference;
- Dynamic Type at accessibility sizes on iOS (the layouts use `minHeight` and wrap, but this wasn't looked at on a device);
- the real Face ID sheet's wording in Expo Go on a device. The copy there says "your passcode", because Expo Go has no Face ID usage text.

## Loop 4: first glance for judges (17 Oct 2026)

The brief for this round: judges see the app for a few seconds, so Home has to show what ChainBrain is before anyone scrolls.

### Home: which layout shows 7 pockets at a glance

The seeded owner has seven pockets. The fanned deck showed four, and Home put it below the balance card and the tiles, so on an iPhone 17 it started near the fold. We compared five layouts.

| Layout | Pockets visible | First-glance read | Verdict |
|---|---|---|---|
| Vertical wallet stack (Apple Wallet) | all 7, as strips; the front card whole | "a wallet of cards" | **chosen** |
| Horizontal carousel (snap, scale, parallax) | 1–2 | one hero card | good for a detail view, not Home; its swipe fights the page |
| Fanned deck plus "See all" grid | 4, then a second screen | pretty, but hides three | what we had |
| Two-column mini-card grid | all | a dashboard | the most generic look |
| 2025–26 fintech homes (Revolut 10 and others) | — | — | no verified source on their card layouts |

Sources and facts checked:
- Apple Wallet's stack is the pattern people already know. The best-known React Native reference, Brent Vatne's `apple-wallet-cards-example`, is from 2016 and has no licence, so we read it and copied nothing. The tutorial write-up describes its structure: one container, the scroll offset driving each card's `translateY`.
- `tarikfp/react-native-apple-wallet-animation` is MIT but targets an older Reanimated. We used it as reading material only and copied no code.
- Google Wallet moved to a vertical stack, and coverage criticised look-alike neighbouring cards (gadgethacks). That is why neighbours here never share a face when the pockets allow it.

What we built (`PocketWallet.tsx`):
- Each card shows its name row plus 5 pt of its stripe. That stops just above the agent's white pill: at 8 pt, a sliver of the pill showed as a stray white line, which we caught in the simulator.
- The front card shows whole.
- Order: revoked pockets go to the back. From the front upward, each next card is the first in list order whose face differs from the card below it.
- On launch the cards drop in back to front, 70 ms apart, tipping flat as they land (rotateX on an inner view).
- A pull on Home fans the strips apart, with one tick as they open fully.
- Tapping any card flies it to its page. The card is now the page card's width, so the flight only moves it.
- All motion is transforms on the UI thread. Reduce Motion turns off the drop and the fan.

The live sign in each card's corner (`glyphOf`, shared) replaces the static strip, so the stack says the pockets are alive:
- a price watch: its last 16 quotes as a sparkline, the limit dashed, the newest dot vermillion at or below the limit;
- a routine: the next run ("Mon 09:00");
- a run in progress: a breathing dot;
- a paused routine: "Paused";
- a haggler: what it saved.

A card with none of these shows its balance, as Wallet strips do. Every figure comes from events. A plain pocket gets no invented sign, and a test checks that.

"Next up" (`NextUp.tsx`):
- Each routine's next run, soonest first, the first tile inverted. The idea is Monzo's upcoming payments (monzo.com/blog/balance-in-trends), which ChainBrain can do exactly because it knows the schedule.
- The cost is the items' listed prices, or a price watch's limit. "Asks you" shows only when the run would pass what is left of the period's allowance, the same test the runner uses before it raises the cheque.

### New pocket app: understanding while typing

Todoist's Quick Add highlights the dates it recognises as you type (Todoist help). We considered the mirror-text technique (a styled `<Text>` behind a transparent `TextInput`) and rejected it for now: on iOS the multiline input's insets and dynamic type make alignment fragile.

Instead, chips pop in under the box (`Understood.tsx`, `shared/sim/understand.ts`):
- The app type comes first, shown as a tiny card in that job's face.
- Then sellers and agents with their official marks, the schedule, the money, the limit, and when it asks.
- Each new chip gets one selection tick.
- The parse uses the same rules as the fixed reader and the picker, so what lights up is what Compose uses. Words match whole: "exactly" is not Exa.
- In the simulator, the price-limit words ("drops below") were taken by the limit chip, so the deal-watcher chip never showed. The app type is now always a chip of its own, not a span.

### Pocket page tabs: considered, not done

Splitting the pocket page into "App" and "Rules & history" tabs would shorten it, but it would hide the signed rules and the worst case behind a tap. Those are the trust story. They stay on the page, in order, below the app.

## Loop 5: validation of the first-glance round (17 Oct 2026)

What the checks turned up, and what changed because of them.

| Found | Where | Fix |
|---|---|---|
| A white sliver under each card in the stack: the next card cut the agent's pill | iOS Simulator | Strip height is the name row plus 5 pt of stripe, which stops above the pill |
| Cards without a routine had an empty corner, so the strips read as unfinished | iOS Simulator | Their balance goes there instead (Wallet's strips carry a figure) |
| The intro's Next button matched the Next up tiles too (strict-mode click failed) | e2e | `exact: true` on the intro's Next |
| The front card's name row was under the ask dock, so a click there timed out | e2e | The test centres the card first. A real thumb scrolls. |
| The deal-watcher chip never appeared | iOS Simulator | The limit chip had taken "drops below". The kind of app is now a chip, not a span |
| Chips caught mid-zoom (scale from 0) looked broken in a screenshot | iOS Simulator | They rise in (opacity and 8 pt) instead |
| A drag on the price chart swiped the page back | iOS Simulator | The pocket page swipes back from the edge only |
| "Couldn't load entering/exiting animation" | Metro web log | Reanimated on web runs only timed enter/layout animations, so they are timed now |
| Two success taps for one run (on Run now and on the payment) | Reading the code | Only the settled payment taps |
| Each poll gave Home a new glyphs object, which redrew the stack's seven cards | Reading the code | The object stays the same until a sign changes |

Measured on the production web bundle (headless Chromium, 402 × 874):
- no long tasks over 50 ms during 10 s idle on Home;
- tab switches of 105–165 ms, including Playwright's own overhead.

On the dev bundle, idle Home showed about four 65–85 ms tasks in 10 s, from the event poll. The glyphs and Next up cost 0.25 ms per recompute, timed with 745 seeded events.

Not verified:
- 60 fps on a physical iPhone. The simulator lags whenever Chromium runs beside it, so frame timing there means nothing.
- VoiceOver on the chart's adjustable action. It is wired, not heard.
- The largest accessibility text sizes on the Next up tiles and the chips. The card print is capped at 1× (`TextScaleCap`), so the stack's strips keep their height. The tiles and chips grow, and nobody has looked at them at AX5.

## Loop 6: the ask dock on scroll (17 Oct 2026)

- iOS 26 tab bars minimise on scroll down. `react-native-screens` exposes it as `TabBarMinimizeBehavior` (`onScrollDown`), but only in a native build, not in Expo Go. https://app.unpkg.com/react-native-screens@4.26.2/files/src/components/tabs/host/TabsHost.ios.types.ts
- So we reuse our own glass tab bar's minimise state (scroll direction, from expo-glass-tabs, MIT). The dock reads the same state: when the bar folds its labels, the dock pill folds to the agent's mark and its countdown ring, and scrolling up brings the words back. One signal for both, so they never disagree.
- WCAG 2.2 "Focus not obscured" (2.4.11) is the rule behind it: a floating bar must not hide what you scroll to. The folded pill is about half as wide. https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
- The motion is timed (the base duration) and reduce motion turns it off. The pill keeps its 52 pt height, so the target stays above 44 pt.
- The minimise state moved from the tabs layout to the root, because the dock is drawn above the stack, outside the tabs.

## Loop 7: the overnight slices (17 Oct 2026)

- **Agents.** Each agent's pockets were text rows. They are now a small wallet of the same strips as Home's stack, with the same faces, interleave and card flight, so an agent visibly holds its pockets. The first try was a hand of 168 pt cards; it was dropped because the card print can't be read at that size.
- **Activity.** GitHub's contribution graph shows activity as a grid of squares. Activity now shows the last 14 days as stacked squares per day. Colour carries the outcome (ink, blue, vermillion), each count is written in the legend, so colour is never the only signal (WCAG 1.4.1). https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
- **Eyebrows.** The labels over cards are now sentence case and untracked, a pattern Linear and Apple's own apps also use for in-card labels (loop 3 started this for the pocket-app blocks).
- **Intro.** A new page 2 shows the product's one idea working: a sentence types itself and the real reader's chips appear. Mid-sentence the app type reads "Research desk"; at "drops below" it changes to "Deal watcher". Then the owner's own deal-watcher card drops in. Nothing on the page is staged: it is the same reader as New pocket app and a pocket from the store.
- **Judges scoreboard.** The scoreboard said "0 of 4 attacks blocked" before anything was tried. A first glance reads that as failure, so it now says "4 attacks to try".
