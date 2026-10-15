# ChainBrain phone app (Expo Go)

The owner's app: the team's verified wallet logic in the Neo-Kinetic Fintech design (design-system/chainbrain/MASTER.md v4: slate canvas, white cards, black ink, vermillion and powder-blue accents, 45° hatch, Plus Jakarta Sans; light only). Code in `mobile/`. Screen-by-screen plan and decisions: [neo-kinetic-plan.md](neo-kinetic-plan.md).

**No login or setup.** The first launch creates the on-device key silently and opens Home. "Import a key" is in Settings only. The app opens on the **built-in network** on every launch (see below); a real server is opt-in in Settings.

## Run

```bash
cd mobile && npm ci
npx expo start                                                       # built-in network, nothing else needed
EXPO_PUBLIC_API_URL=http://<laptop LAN IP>:8787 npx expo start       # address offered under Custom server; also the relay address when linked to the console
# dev stack (local anvil fork, scripted agent): add EXPO_PUBLIC_RPC_URL=http://<LAN IP>:8787/dev/rpc, or just set the API URL; dev mode is detected from GET /dev/health
```

## Built-in network (default)

`shared/sim` runs the wallet API, tool layer, scripted agent and the Pocket.sol rules in the app on a virtual chain (`src/lib/builtin.ts`). It is seeded with two weeks of real activity, produced by running the same plans through the world on a clock set back in time (`shared/sim/seed.ts`): Research data (held by ChainBrain's agent), Market news (held by **Claude**, connected 12 days ago), Trade quotes (held by **ChatGPT**, connected 9 days ago) and One purchase (ChainBrain, for scene 8); main wallet US$54.80. A little after launch Claude asks, in the Approvals inbox, to co-sign a premium report above its pocket's limit. Every owner action, agent turn, co-sign and refusal works offline; scenes 1-10 play end to end. Paid cards show in chat, replies stream, and receipts say what was bought.

**Agents.** Each pocket names exactly one agent key (Pocket.sol `agent` is immutable); one agent can hold several pockets, each granted separately. Claude and ChatGPT are connected agents on the built-in network (`shared/sim/agents.ts`): they act through the same wallet tools as the in-app agent, so the pocket rules, Radar and the Sentinel decide for them too. **Disconnect** stops an agent and declines its open requests; the money stays in its pockets. **Revoke** (one hold) freezes a pocket for good and returns everything left to the main wallet: two owner transactions. On a real server only the built-in agent exists until ChainBrain's MCP server ships, so Connect is not offered there.

It is meant for demos and offline use. Its hashes are not on a public chain, so they open in-app receipts and sheets, and BaseScan links appear only when connected to a real server on the public chain.

**Use a real server:** Settings, Advanced, **Custom server** switch, enter the URL, Test, Connect. The choice is remembered (`cb.source` in SecureStore). Switch it off to return to the built-in network.

**Link to the web console:** on the built-in network the phone quietly pushes its pockets and events to a relay (`src/lib/relay.ts`, backs off when none answers). On the laptop run `pnpm --dir devstack relay` (or the full `pnpm --dir devstack start`), start the phone with `EXPO_PUBLIC_API_URL=http://<laptop LAN IP>:8787`, and keep it on the built-in network. The console then mirrors the phone, and the Judges tab's plant and forced transfer run on the phone's pockets.

## What a judge sees (Neo-Kinetic round, 16 Oct)

- **Intro on every launch:** three pages, Skip always there, the finger drives the pager, about 7 s auto-advance. Page 1 fans out the owner's own pockets (names, short numbers, holding agents) over a hatch panel (`src/components/Intro.tsx`).
- **Home:** the agent-pockets pool and the main wallet with Fund; Add money, New pocket and a powder-blue Connect tile; a **fanned pocket deck** (`PocketStack.tsx`, `PocketFace.tsx`): tap a card behind to deal it to the front, swipe to cycle, tap the front card to fly it into its page (a measured overlay that carries the card's rotation and width, `CardFlight.tsx`); agent spending as a hatch curve that draws in, with "vs last week" only when the history covers last week (`SpendChart.tsx`, `lib/agents.ts`); recent activity with the agent that acted.
- **Agents tab:** ChainBrain's agent, Claude and ChatGPT with the pockets they hold, spent share, what they are doing; Agent detail with its own ledger, Give another pocket and hold-to-disconnect; **Connect** (pairing link and QR, then the consent sheet: a new pocket for the agent, can / can't, slide to allow).
- **Approvals inbox** (the bell): every agent's waiting requests with their 10-minute countdown; the **approval sheet** separates what the wallet checked (item, pocket, rule, Radar's score, expiry) from the agent's own note, marked "not checked"; black slide track with a vermillion grip.
- **Pocket page:** rule chips, Add / Return / Revoke tiles, worst case with main-wallet exposure US$0.00, spending by day as hatch bars split by seller, the holding agent, black seller toggles, history. Revoked: banner, white-hatch card, what came back, audit trail with a JSON export.
- **Chat** (pushed from Agents or Home): black owner bubbles, the agent's words in white cards, green / vermillion / blue event cards, Radar cards that open the **Radar alert** page (diagnosis, money trail, affected pockets, Keep blocked or remove the seller).
- **ChainBrain explorer sheet:** every hash opens it ("Test network"; "View on BaseScan" only against a real public-chain server).
- **Hidden auto-play (for the video):** long-press the chat header for about 1.5 s. Scenes 1-8 as before (wizard, question, co-sign, refusal, injection plus the forced transfer, data grab, escalation, revoke, dead end and fix), then: Connect Claude (pairing, consent, its own pocket), confirm Claude's task and co-sign its payment from the inbox, scene 9 (Radar, opening the money trail) and scene 10 (Sentinel). Every step presses the real control through a named target (`src/lib/autoplay.ts`, `src/lib/autoplayTargets.ts`).

## Screens

Tabs: Home, Agents, Brain, Activity, Settings (a floating white pill bar; the active tab is a black pill that slides). Stack screens: chat (`/agent`), Agent detail (`/agents/[id]`), Connect (`/connect`), Approvals (`/approvals`), Radar alert (`/radar`), pocket page (`/pocket/[id]`), create wizard (`/create`). Sheets: approval, consent, question, receipt, explorer, add money / return / revoke (hold), rules, pocket picker (ChainBrain's pockets only).

## Motion and haptics

Spec: [design-system/chainbrain/pages/motion.md](../../design-system/chainbrain/pages/motion.md). Floating pill tab bar (solid white, no glass or blur) with a sliding black pill, finger scrubbing and minimize-on-scroll; the deck deals, swipes and flies; tabs slide in from the direction of travel and keep their state; sheets with drag physics, rubber-banding and keyboard lift; slide-to-approve and hold-to-revoke with ticks and a drawn success / error mark; rolling-digit balances; staggered first-load reveals; live agent steps with a status mark that draws its check; a calm three-dot working indicator. Rich haptics through `src/haptics.ts` (semantic, throttled). Charts draw in, hatch bars grow. Everything honours Reduce Motion.

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

`npm test` (34 tests: the co-sign payload, agents and spending maths, the palette parity with the console, and a full auto-play run on the built-in network that includes Claude via Connect and the inbox and scenes 9-10), `npx tsc --noEmit`, `npx expo-doctor` (16 Oct: only `expo` / `expo-router` one patch behind the newest release), `npx expo export --platform web|ios` (the iOS Hermes bundle builds). Built-in network end to end: `node devstack/e2e/builtin.cjs --url http://localhost:8091` (45 checks on 16 Oct: intro, Home deck and spending, Agents and Claude's page, Claude's co-sign from the inbox, Connect + consent for ChatGPT, scenes 1-8, receipt and explorer, settings; no server needed). Dev stack end to end: `node devstack/e2e/e2e.cjs` (not re-run in the Neo-Kinetic round). Screenshots: `docs/frontend/screenshots/builtin/*.png` (refreshed 16 Oct), `docs/frontend/screenshots/neo/web-*.png`.

## Verified in Expo Go (iOS Simulator, 16 Oct)

Expo Go 57 on an iPhone 17 simulator, built-in network: intro, Home deck (deal, card flight into the pocket page), pocket page, Claude's co-sign from the inbox (slide to approve, Market news US$4.90 to US$3.40), chat scene 1 with the intent sheet and approval, Agents tab with minimize-on-scroll, ChatGPT's page, hold to revoke (two hashes, banner, white-hatch REVOKED card, money returned, hidden Agents tab updated). Two iOS-only fixes came out of it: the hatch is a 45° tile path (a rotated pattern rendered as dots on iOS) and the slide track's trail is a white tint (it showed brown on black).

Dev note: after Fast Refresh of a file with Reanimated styles (`Hatch.tsx`, `SlideToConfirm.tsx`), already-mounted animated values can stay on their old position (a revoked card kept its live face and old balance). A full reload clears it; it does not happen on a clean load.

## Not verified

Not run on a physical phone: haptics, 120 Hz motion, the deck's swipe under a real finger, and iOS edge swipe-back on the pocket page. No dark mode. The app icon and splash still carry the old teal chain logo (`assets/`, `app.json`).
