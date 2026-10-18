# ChainBrain phone app (Expo Go)

The owner's app: the team's verified wallet logic in the Neo-Kinetic Fintech design after VaultBank (docs/08-frontend/design-system.md v5: warm paper-grey canvas, white cards, black ink, vermillion and powder-blue accents, hatch, Clash Display + General Sans, 2.5D pocket cards; light only). Code in `mobile/`. Screen-by-screen plan: [neo-kinetic-plan.md](neo-kinetic-plan.md); the VaultBank round: [vaultbank-round.md](vaultbank-round.md).

**No login or setup.** The first launch creates the on-device key silently and opens Home. "Import a key" is in Settings only. The app opens on the **built-in network** on every launch (see below); a real server is opt-in in Settings.

## Run

```bash
cd mobile && npm ci                                                  # postinstall fetches Clash Display + General Sans from Fontshare (scripts/fonts.sh)
npx expo start                                                       # built-in network, nothing else needed
EXPO_PUBLIC_API_URL=http://<laptop LAN IP>:8787 npx expo start       # address offered under Custom server; also the relay address when linked to the console
# dev stack (local anvil fork, scripted agent): add EXPO_PUBLIC_RPC_URL=http://<LAN IP>:8787/dev/rpc, or just set the API URL; dev mode is detected from GET /dev/health
```

## Built-in network (default)

`shared/sim` runs the wallet API, tool layer, scripted agent and the Pocket.sol rules in the app on a virtual chain (`src/lib/builtin.ts`). It is seeded with two weeks of real activity, produced by running the same plans through the world on a clock set back in time (`shared/sim/seed.ts`): Research data (held by ChainBrain's agent), Market news (held by **Claude**, connected 12 days ago), Trade quotes (held by **ChatGPT**, connected 9 days ago), One purchase (ChainBrain, for scene 8), Premium reports (scene 11), and the two routine pockets Durian watch (Claude's deal watcher) and Data renewals (ChainBrain's subscriptions); main wallet US$54.80. The sellers are real x402 data providers at their published per-request prices: **Exa** (web search, US$0.007), **CoinGecko** (USDC price, US$0.01) and **Nansen** (wallet data, US$0.01 or US$0.05), with official logos (`shared/brand/SOURCES.md`); TradeWire, Harbour Wines and ShadyFeed are fictional on purpose (Radar, refusal and injection scenes). A little after launch Claude asks, from the ask dock, to co-sign Nansen's US$0.05 counterparty check, above its pocket's US$0.02 limit. Every owner action, agent turn, co-sign and refusal works offline; scenes 1-11 play end to end. Paid cards show in chat, replies stream, and receipts say what was bought.

**Agents.** Each pocket names exactly one agent key (Pocket.sol `agent` is immutable); one agent can hold several pockets, each granted separately. Claude and ChatGPT are connected agents on the built-in network (`shared/sim/agents.ts`): they act through the same wallet tools as the in-app agent, so the pocket rules, Radar and the Sentinel decide for them too. **Disconnect** stops an agent and declines its open requests; the money stays in its pockets. **Revoke** (one hold) freezes a pocket for good and returns everything left to the main wallet: two owner transactions. On a real server only the built-in agent exists until ChainBrain's MCP server ships, so Connect is not offered there.

It is meant for demos and offline use. Its hashes are not on a public chain, so they open in-app receipts and sheets, and BaseScan links appear only when connected to a real server on the public chain.

**Use a real server:** Settings, Advanced, **Custom server** switch, enter the URL, Test, Connect. The choice holds while the app runs (backgrounding, tab switches); a full reload or relaunch opens on the built-in network again. The address stays filled in (`cb.apiUrl`). Switch it off to return to the built-in network.

**Link to the web console:** on the built-in network the phone quietly pushes its pockets and events to a relay (`src/lib/relay.ts`, backs off when none answers). On the laptop run `pnpm --dir devstack relay` (or the full `pnpm --dir devstack start`), start the phone with `EXPO_PUBLIC_API_URL=http://<laptop LAN IP>:8787`, and keep it on the built-in network. The console then mirrors the phone, and the Judges tab's plant and forced transfer run on the phone's pockets.

## Pocket apps (17 Oct)

Every pocket page is its own app. Full description: [pocket-apps.md](pocket-apps.md).

**The pocket page,** top to bottom:
- **The card,** with its job's face: research desk black, deal watcher powder blue, subscriptions white hatch, haggler vermillion.
- **Who runs it:** the agent's own mark, its name and the layout, what it may do on its own, and a status. Tapping it opens the agent.
- **Add, Return and Revoke.**
- **The blocks the pocket's spec names.**
- **The owner zone,** which the AI never touches:
  - Rules you signed;
  - Worst case;
  - Allowed sellers;
  - History.

**Blocks by layout:**

| Layout | Blocks |
| --- | --- |
| Research desk | Report covers |
| Deal watcher | Every quote charted against the owner's dashed limit, with buys marked |
| Subscriptions | Spend by seller this month, renewals, price changes |
| Haggler | The negotiation ladder and savings |

Every routine pocket also has:
- the period budget meter;
- next runs with "Have <agent> run it now" and Pause;
- recent runs, including any ignored rewrite attempt;
- "Will never", with each line tagged Contract or ChainBrain.

**New pocket app** (Home → New pocket, `app/compose.tsx`):
1. Say one sentence, or tap an example.
2. The proof card appears: worst case, three fact tiles, and the test payments folded behind a disclosure.
3. The pocket app builds itself:
   - the card arrives blank, then takes its face and its agent's mark;
   - the blocks fly up one after another;
   - the budget meter fills to the allowance.
4. Slide, then Face ID (or the passcode in Expo Go; nothing on web): the pocket is created and funded, and the routine is stored as typed fields.
5. The card flies into its app.

"Set it up step by step instead" opens the old wizard, which is still how scene 1 starts.

**Routines.** They run on the built-in network: a 20-second ticker while the app is open, plus "run it now". When a run would pass its allowance, the cheque opens. It says "Run 3 would pass this week's US$0.05" and shows the week on one bar.

**Seeded pocket apps:**
- Durian watch: Claude's deal watcher, with 12 days of real quotes.
- Data renewals: ChainBrain's subscriptions, two Mondays renewed.
- Every other seeded pocket gets the app composed from its sentence.

**Auto-play** plays scene 12 after Claude's connect and before it closes on Activity's Live view.

## What a judge sees (VaultBank round, 16 Oct)

- **Intro on the first launch** (replay: Settings, "How ChainBrain works"): the four-tile mark and a Clash wordmark; three user-paced pages (swipe or Next, nothing moves on its own), Skip always there. Page 1 is VaultBank's onboarding: the owner's own pocket cards are dealt in, tilted and spilling off the edge, and the mark's tiles lock into place (`src/components/Intro.tsx`, `ui/BrandMark.tsx`).
- **Home (18 Oct):** the main wallet is the hero card. It leans with the phone, carries ChainBrain's mark and "Only your key", and shows "US$5.62 out in 7 pockets" with a split bar by pocket.
  - Under it, the 2.5D card stack is back (round 3: the owner found it more striking than rows). Each strip carries the agent's mark, the pocket's name and one job line from its own spec ("Buys Smart-money flows at ≤ US$0.04", "Haggles DataPro down first", "Renews 3 feeds · Mondays 09:00"), with its live sign or balance on the right (`PocketWallet.tsx` `jobs`, `PocketFace` `job`, `WalletHome.tsx` `jobLine`). The front card shows whole; a tap flies a card into its pocket page (`CardFlight.tsx`).
  - Below: round quick actions (Move money, New pocket, Connect), **Next up** (each routine's next run, with Pause all) and one "This week" card (the spending curve, what was bought, three counts).
- **Home, added in the overnight push:**
  - the total has a thin split bar by pocket, in each card's face colour;
  - "Your agents got you" shows the last 7 days' buys as covers, with bought / co-signed / stopped counts, in the same window as the weekly chart (`WeekDigest.tsx`, `weekDigest`);
  - Next up has Pause all / Resume all;
  - a stack card lifts under the thumb, and the ask dock folds to the agent's mark and ring when you scroll down.
- **Agents:** each agent's pockets are a small wallet of the same strips as Home (`AgentCard.tsx`). Each card has "Give Claude a pocket" (or ChatGPT, or ChainBrain): it opens New pocket app with the sentence started as "Let Claude …".
- **Brain (tab, round 3):** ChainBrain at work as a living graph on a black card: the brain in the middle, the agents round it, their pockets and the sellers those pockets may pay further out, and what it remembers as small blue lights round the centre (`lib/brainGraph.ts`). The newest decisions travel the graph in turn as pulses along the edges they touched (a payment out to the seller, a refusal stopping at the pocket, seller text coming in and dropped, a memory update flowing back to the brain), each with its line and time underneath; a new event jumps the queue. Below: Watched / Stopped / Learned / Sellers, "Learned with you" (memory items across pockets), and each pocket's own brain. Every node and pulse is a real agent, pocket, seller, memory item or event. Reduce Motion: no travel or breathing; the path lights and the line changes (`(tabs)/brain.tsx`).
- **Activity (tab, round 3):** a Live / Ledger switch, opening on Live. Live is a pinned "Now" line, requests waiting for you, then one stream of decision cards newest first: paid, co-signed, refused, seller text ignored (quoted, struck through), chat attacks, Sentinel freezes, and price checks that waited; agent filter chips; tap a card for the rule, the tx and its receipt (`components/LiveFeed.tsx`, `lib/live.ts`). Ledger is the 14-day pulse (`ActivityPulse.tsx`) and the full list with filters and receipts.
- **A pocket's brain (pushed screen, from the Brain tab or the chat's memory note):** the pocket it explains as its card strip, what it understood, how it shopped, what guarded it, and what it remembers, with Forget (`pocket-brain.tsx`).
- **Settings:** the main wallet is a card of its own: white, with an ink hatch edge and ChainBrain's mark.
- **Receipt:** the seller's mark leads, with the paying agent's mark on it, plus the six Pocket.sol checks a settled payment passed and its pocket as a strip.
- **Pocket page:** the routine has Edit (cadence, time, allowance; a looser allowance is signed with Face ID) beside Pause (`EditRoutineSheet.tsx`, `world.editRoutine`).
- **Intro:** four pages. The new page 2 shows a sentence becoming an app: it types itself, the real reader's chips appear, and the owner's deal-watcher card drops in.
- **Agents tab:** ChainBrain's agent, Claude and ChatGPT with the pockets they hold, spent share, what they are doing; Agent detail with its own ledger, Give another pocket and hold-to-disconnect; **Connect** (pairing link and QR, then the consent sheet: a new pocket for the agent, can / can't, slide to allow).
- **Ask dock and cheque:** when Claude or ChatGPT asks, a black dock rises above the tab bar (the agent's mark, "Claude asks US$0.05", to Nansen, a 10-minute countdown ring that turns vermillion only in its last minute, "+2" for more) and after 8 s folds into a pill at the bottom right; on every other screen (chat, a pocket, an agent, Connect) the pill shows there too. Tapping it opens the **cheque**: who asks and why you are asked, one money sentence ("Claude pays DataPro US$1.50 from Market news. US$3.40 stays in the pocket.") and what happens if you don't answer, the pocket's card turning over to show pay / to / for / what is left after, Radar's seller check and the paying pocket, then the agent's note marked "not checked". Slide to approve (or tap twice: every slide and hold has a tap path, WCAG 2.5.7), then Face ID or Touch ID (skipped without biometrics, on web and in auto-play). Decline confirms itself. An opt-in local notification brings you to the cheque when the app is in the background (`AskDock.tsx`, `Cheque.tsx`, `ApprovalSheet.tsx`, `lib/biometric.ts`, `lib/notify.ts`). ChainBrain's own asks in chat open the cheque directly.
- **Approvals inbox** (the bell): every agent's waiting requests with their 10-minute countdown and the history.
- **Pocket page:** the 2.5D card leaning with the phone, the rules as VaultBank category tiles (dot, figure, meaning, pencil to edit), Add / Return / Revoke tiles, worst case with main-wallet exposure US$0.00, spending by day as hatch bars split by seller, the holding agent, black seller toggles, history. Revoked: banner, white-hatch card, what came back, audit trail with a JSON export.
- **Chat** (pushed from Agents or Home): black owner bubbles, the agent's words in white cards, green / vermillion / blue event cards, Radar cards that open the **Radar alert** page (diagnosis, money trail, affected pockets, Keep blocked or remove the seller).
- **Brain tab** (the AI brain for the active pocket, [ai-brain.md](../ai-brain.md)): your rules with the worst case; spent from this pocket; Understood (the confirmed task, the one question it asked); How it shopped (prices asked, paid, refused by your rules, "Negotiated a price down: US$0.40 saved, numbers only"); Stopped (hidden orders, data asks, chat attacks, forced transfers; no money moved); Radar (each seller's score); Pre-flight (predicted vs actual) and the Sentinel side by side, with Unfreeze; Remembers (memory version, items with Forget).
- **Haggle card** (chat): the price ladder from the seller's first price to the deal, each rung an offer or counter, and why it is safe (prices only, below the seller's price, 3 offers at most, the pocket pays exactly the agreed price). The paid card then reads "Negotiated from US$1.50" (`src/components/HaggleCard.tsx`).
- **ChainBrain explorer sheet:** every hash opens it ("Test network"; "View on BaseScan" only against a real public-chain server).
- **Hidden auto-play (for the video):** long-press the chat header for about 1.5 s. Scenes 1-8 as before (wizard, question, co-sign, refusal, injection plus the forced transfer, data grab, escalation, revoke, dead end and fix), then: Connect Claude (pairing, consent, its own pocket), confirm Claude's task and co-sign its payment from the ask dock (the cheque), scene 11 (the haggler, on Premium reports), scene 9 (Radar, opening the money trail) and scene 10 (Sentinel), and it closes on Activity's Live view. Every step presses the real control through a named target (`src/lib/autoplay.ts`, `src/lib/autoplayTargets.ts`).

## Screens

Tabs: Home, Agents, Brain, Activity, Settings (a floating white pill bar; the active tab is a black pill that slides). Stack screens: chat (`/agent`), a pocket's brain (`/pocket-brain`), New pocket app with its live canvas (`/compose`), Agent detail (`/agents/[id]`), Connect (`/connect`), Approvals (`/approvals`), Radar alert (`/radar`), pocket page (`/pocket/[id]`), create wizard (`/create`). Sheets: approval, consent, question, receipt, explorer, add money / return / revoke (hold), rules, pocket picker (ChainBrain's pockets only).

## Motion and haptics

Spec: [docs/08-frontend/motion.md](motion.md). Floating pill tab bar (solid white, no glass or blur) with a sliding black pill, finger scrubbing and minimize-on-scroll; the deck deals, swipes and flies; tabs slide in from the direction of travel and keep their state; sheets with drag physics, rubber-banding and keyboard lift; slide-to-approve and hold-to-revoke with ticks and a drawn success / error mark; rolling-digit balances; staggered first-load reveals; live agent steps with a status mark that draws its check; a calm three-dot working indicator. Rich haptics through `src/haptics.ts` (semantic, throttled). Charts draw in, hatch bars grow. Everything honours Reduce Motion.

## Where the logic is

| File | What |
| --- | --- |
| `src/lib/wallet.ts` | owner key calls: factory create, USDC fund, revoke, returnFunds, setSeller, co-sign |
| `src/lib/events.ts` | pure event derivations: dedupe, cursor, approvals, ledger, trace |
| `src/lib/runtime.ts` | data source (built-in or server), API URL, dev detection (`/dev/health`), RPC and explorer switching |
| `src/lib/builtin.ts` | the in-app world from `shared/sim` |
| `src/lib/relay.ts` | pushes the built-in network to the devstack relay for the web console |
| `src/lib/agents.ts` | agents and their numbers (pockets, spent, last active, requests today), daily spend, week over week, an agent's own ledger |
| `src/store.tsx` | polling, pending reconciliation, chat turns, agents, approval focus (only the in-app agent's asks open the sheet by themselves) |
| `src/tokens.ts`, `src/ui/*` | Neo-Kinetic tokens and kit (pill tab bar, tiles, hatch, agent marks, slide track); `src/lib/tokens.test.ts` keeps the palette identical to the console's |

## Dev mode

With a server chosen, `GET /dev/health` returning 200 switches the RPC to `<api>/dev/rpc`, funds an empty phone key once, replaces BaseScan links by plain hashes, shows "Local test network" in Settings and the `/dev/scenes` sentences as chips in chat (the built-in network shows the same chips).

## Checks

`npm test` (34 tests: the co-sign payload, agents and spending maths, the palette parity with the console, and a full auto-play run on the built-in network that includes Claude via Connect and the ask dock and scenes 9-11), `npx tsc --noEmit`, `npx expo-doctor` (16 Oct: only `expo` / `expo-router` one patch behind the newest release), `npx expo export --platform web|ios` (the iOS Hermes bundle builds). Built-in network end to end: `node devstack/e2e/builtin.cjs --url http://localhost:8091` (46 checks on 16 Oct: intro, Home deck and spending, Agents and Claude's page, the ask dock, the inbox and Claude's cheque, Connect + consent for ChatGPT, scenes 1-8, receipt and explorer, settings; no server needed). Dev stack end to end: `node devstack/e2e/e2e.cjs` (not re-run in the Neo-Kinetic round). Screenshots: `docs/08-frontend/screenshots/builtin/*.png` (written by the e2e run), `docs/08-frontend/screenshots/neo/web-*.png`.

## Verified in Expo Go (iOS Simulator, 16 Oct)

Expo Go 57 on an iPhone 17 simulator, built-in network: intro, Home deck (deal, card flight into the pocket page), pocket page, Claude's co-sign from the inbox (slide to approve, Market news US$4.90 to US$3.40), chat scene 1 with the intent sheet and approval, Agents tab with minimize-on-scroll, ChatGPT's page, hold to revoke (two hashes, banner, white-hatch REVOKED card, money returned, hidden Agents tab updated). Two iOS-only fixes came out of it: the hatch is a 45° tile path (a rotated pattern rendered as dots on iOS) and the slide track's trail is a white tint (it showed brown on black).

Dev note: after Fast Refresh of a file with Reanimated styles (`Hatch.tsx`, `SlideToConfirm.tsx`), already-mounted animated values can stay on their old position (a revoked card kept its live face and old balance). A full reload clears it; it does not happen on a clean load.

## Verified in Expo Go, VaultBank round (16 Oct)

Clash Display and General Sans load; the warm canvas; the deck of 2.5D cards (material, edge, perspective) and the card flight; the pocket page and an agent's page with the same card; the ask dock for Claude's request, the cheque turning over, slide to approve (no Face ID enrolled in the simulator, so the slide signs alone); the spending chart; the intro's spilling cards and the mark; the four-tile icon on Expo Go's loading card. Phone tilt is not testable in the simulator (no motion), so the lean and the moving sheen are unverified.

## Verified in Expo Go, pocket apps (17 Oct)

On the iOS Simulator (iPhone 17, Expo Go, built-in network):
- **Home deck:** the cards wear their job faces.
- **Research desk:** the report covers render.
- **New pocket app:** composes a Claude deal watcher and a ChainBrain research desk; the proof is folded and the card says "Draft".
- **Slide to create:** works now that swipe-back no longer steals it. The Face ID sheet appears and a simulated match signs; the pocket is created and funded and opens in its app.
- **Routine:** "Have ChainBrain run it now" ×3. Runs 1 and 2 pay US$0.017 each, with "Run 2 is running…" and a live meter. Run 3's cheque reads "Run 3 would pass this week's US$0.05" with the week's bar; co-signed with Face ID, the meter shows US$0.051 with US$0.001 over.

Screenshots: `docs/08-frontend/screenshots/pocket-apps/ios-*.png`.

## Not verified

Not run on a physical phone: haptics, 120 Hz motion, the cards leaning with the phone and their sheen, Face ID on the cheque, the background notification, the deck's 3D swipe under a real finger, and iOS edge swipe-back on the pocket page. No dark mode. The native splash (the canvas with the four-tile mark, `expo-splash-screen` in `app.json`) only shows in a development or store build; Expo Go shows the app icon on its own loading card instead.

## App icon and splash

ChainBrain's four-tile mark (hatch, vermillion, ink, hatch) on the warm canvas, drawn like `src/ui/BrandMark.tsx`. `assets/src/build.sh` (needs `rsvg-convert`) runs `gen.py` for the SVG sources and renders the iOS icon, the Android adaptive layers, the splash mark and the favicon. Expo Go caches the icon by URL: after changing it, delete Expo Go's `Library/Caches` in the simulator (`xcrun simctl get_app_container booted host.exp.Exponent data`) to see the new one. The web console's header and favicon use the same mark.
