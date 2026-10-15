# ChainBrain frontend: web console, phone app, dev stack

Combined on 14 Oct 2026 on branch `feat/integrate` (local, not pushed). It is the team's GitHub `main` (the v2 "consumer wallet" build), plus the master-docs set, plus the frontend work below.

## What is here

| Folder | What | Docs |
| --- | --- | --- |
| `web/` | Network console: the whole system for the laptop demo and judges (live agent trace beside the active pocket and the sellers' side, all pockets, every tx hash, red-team box, forced-transfer test). No login | [web.md](web.md) |
| `mobile/` | The owner's app for Expo Go: pockets, ask the agent, approvals, activity, settings. No setup screen; opens on the built-in network (works offline) | [mobile.md](mobile.md) |
| `devstack/` | The team's real server and real contracts on a local fork of Base Sepolia, with a scripted agent instead of Claude. No API key, no faucet, no real money | [devstack/README.md](../../devstack/README.md) |

| `shared/sim/` | The built-in network both apps open on: wallet API, tool layer, scripted agent and Pocket.sol rules in-app, seeded owner, scenes 1-8 offline | (code, `shared/sim/world.test.ts`) |

Design system: [design-system/chainbrain/MASTER.md](../../design-system/chainbrain/MASTER.md) (v3, clean bank after Ryt Bank and Revolut, deep teal + navy, light only). Reference screenshots: `reference/frontend/ryt-bank/` (gitignored).

## How the two builds were combined

The team's `web/` and `mobile/` were built against the v2 spec and the real server. The first frontend (branch `feat/frontend`) was built overnight against the older MVP plan, whose API no longer exists. A side-by-side review found the team's apps right on logic and the first frontend stronger on looks and extras. So each app keeps the team's logic files (wallet, chain calls, co-sign payload and its test), and the screens, layout and design came over from the first frontend, rewired to the v2 events. The old mock server is replaced by the dev stack, which runs the real server instead of imitating it. The first frontend stays on its own local branch `feat/frontend` for reference.

## Built-in network (default)

Both apps open on a built-in network on every launch. `shared/sim` runs the wallet API, the tool layer, the scripted agent and the Pocket.sol rules in the app, on a virtual chain, seeded with a lived-in owner: a Research data pocket (US$10, earlier purchases), a One purchase pocket (US$0.20) and a main wallet of US$54.80. Scenes 1-8 work with no server and no internet. It is meant for demos and offline use; its hashes are not on a public chain, so the apps show in-app receipts and sheets for them and never link BaseScan.

**Use a real server instead:**

| App | How |
| --- | --- |
| Phone | Settings, Advanced, **Custom server** switch: enter the URL, Test, Connect. Remembered (`cb.source` in SecureStore). Switch off to return |
| Web | Gear button, Settings, **Custom server**. Or the hidden `?server=<url>` (`?server=builtin` goes back). Remembered (localStorage `cb.source`, `cb.apiUrl`) |

Explorer (BaseScan) links appear only when connected to a real server on the public chain.

## Link the phone and the console on one laptop

The phone's built-in network can be mirrored live to the web console, so a co-sign on the phone shows on the big screen.

```bash
pnpm --dir devstack relay        # the relay only, port 8787 (no chain, no server)
# or the full stack, which mounts the relay at /dev/relay:
pnpm --dir devstack start
cd mobile && EXPO_PUBLIC_API_URL=http://<laptop LAN IP>:8787 npx expo start   # keep the phone on the built-in network
pnpm --dir web dev               # the console finds the phone by itself
```

The console then shows the phone's pockets first, by name, follows them, and holds its own story while the phone is linked. The Judges tab's attack arena, red-team plant and forced transfer run on the phone's pockets, and the phone's hidden auto-play (long-press the Agent header) drives the console exactly like a person would. With no phone (or no relay) the console is just the built-in network.

## Run it on a laptop with the dev stack (no keys needed)

Once: Node 24, pnpm, Foundry (`curl -L https://foundry.paradigm.xyz | bash`, then `foundryup`). From the repo root: `git submodule update --init`, `pnpm i`, `cd contracts && forge build`, `cd mobile && npm ci`.

```bash
pnpm --dir devstack start        # wallet API :8787, sellers :4021, local chain; prints the LAN URL for the phone
pnpm --dir web dev               # http://localhost:5173 network console, no login
pnpm --dir devstack seed         # optional: real agent purchases for the dashboard to show
```

## Open it on your phone

1. Phone and laptop on the same Wi-Fi.
2. Install **Expo Go** (it must support Expo SDK 57).
3. Nothing else is needed to try the built-in network: `cd mobile && npx expo start`, then scan the QR code (iPhone: Camera app; Android: inside Expo Go).
4. To use the dev stack: start it (above) and note the LAN URL in its banner, for example `http://192.168.1.23:8787`. Run `cd mobile && EXPO_PUBLIC_API_URL=http://<LAN IP>:8787 npx expo start`, then in the app turn on Settings, Advanced, **Custom server**, Test, Connect.
5. Settings → **Get test funds**, then create a pocket.

## Demo scenes

Type the sentences from the [devstack scene table](../../devstack/README.md#demo-scenes-and-exact-sentences); on the built-in network and in dev mode both apps also show them as tap-to-send chips. Scene 8 uses the "one purchase" preset; the rest use "Research data".

## Dev mode vs the real server

Once a server is chosen (Custom server), both apps ask `GET /dev/health`. On the dev stack they show a **LOCAL FORK** badge, turn BaseScan links into plain hashes (fork hashes don't exist on Base Sepolia), and use `/dev/rpc` for the chain. On the team's real server that route is missing, so the badge disappears, BaseScan links work, the web uses MetaMask and the phone uses its own key on Base Sepolia. Nothing else changes.

## Checks (all run on 15 Oct 2026)

| Suite | Result |
| --- | --- |
| Built-in network, `node devstack/e2e/builtin.cjs --url http://localhost:8091` (phone on the built-in network: intro, card stack, explorer sheet, scenes 1-8, no server needed) | 34/34 |
| End-to-end, `node devstack/e2e/e2e.cjs` (phone: intro, wizard, scenes 1-3 and 7, approvals, receipt, revoke; console: trace with reason codes, pockets, Explorer tx page, sellers, plant + forced transfer, built-in mode with checks path, attack arena (escalation `NOT_OWNER`, fooled transfer `SELLER_NOT_ALLOWED`, US$0.00 lost), explorer revert page, Evidence export, 390 px on every tab) | 55/55 on a fresh stack |
| Built-in network logic, `cd mobile && node --import tsx --test ../shared/sim/*.test.ts` (world, scenes, attacks, checks path, proof facts, evidence export, explorer) | 18/18 |
| Web, `pnpm --dir web test`, `build`, `lint` | 76/76, clean |
| Phone, `npm test`, `npx tsc --noEmit`, `npx expo export --platform web` and `ios` | 25/25 (incl. the co-sign payload and a full auto-play run), clean, both exports build |
| Dev stack, `pnpm --dir devstack test` | 18/18 |

Before the end-to-end test: build `web/dist` and the phone web export (`cd mobile && EXPO_PUBLIC_API_URL=http://localhost:8787 npx expo export --platform web --output-dir dist`), and restart the dev stack.

## Not verified

- **The phone app has not been run on a physical phone or inside Expo Go.** It was tested as a web export and the iOS bundle builds. Haptics and native gestures have not been seen on a device.
- MetaMask on the real Base Sepolia, and the phone's key on the real Base Sepolia, were not run here (no funded wallets, no deployed factory yet). Those paths are the team's code, unchanged in behaviour.
- The agent in the dev stack is scripted. The real Claude agent needs `ANTHROPIC_API_KEY` and the team's server setup.

## Known gaps

- Two payments settling in the same second can make the dev stack refuse one (HTTP 402, `SETTLEMENT_FAILED`). The e2e therefore runs the phone flow and the web flow one after the other.
- The owner signs on the phone; the web console only reads (no co-signing on the web). The Bank / Compliance view of the first console is not in this version.
- Scene 5's forced transfer: on the dev stack the console's Judges tab runs it (`POST /dev/force-transfer`) and the reverted hash appears in Live and On-chain. On the real chain run `server/scripts/force-transfer.ts`; the console shows the reverted hash only if it comes through the event stream.
- The built-in network's hashes are virtual (not on a public chain) and its agent is scripted; it keeps state in the app's memory and starts from the same seed each launch.
- The server keeps events in memory only, so the Bank tab and Activity show what happened since the server started.
- Web: pockets are listed from the browser's own list; there is no discovery from chain logs. The phone has "Add an existing pocket by address"; the web does not yet.
- Phone: there is no "new chat" button, because the server uses the pocket address as the conversation.
- The "Filing with PCAC" row was removed from the Bank checklist, because the updated market notes mark that claim as unsupported.

## For the team

- The plan still says the spec is at `docs/product-design.md` and the rules at `docs/hackathon-rules.md`; they moved to `docs/02-product/` and `docs/01-competition/`. The top README link is fixed; the plan text is left as written.
- The phone's reason-code map was missing `QUOTE_UNKNOWN` and `NOT_THIS_AGENT`; it now uses the web's full list.
- `cfg.sellersUrl` is the server's own `SELLERS_URL` (localhost by default), so the red-team box only works from a phone if that is set to the laptop's LAN address. The dev stack does this automatically.
