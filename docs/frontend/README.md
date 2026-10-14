# ChainBrain frontend: web console, phone app, dev stack

Combined on 14 Oct 2026 on branch `feat/integrate` (local, not pushed). It is the team's GitHub `main` (the v2 "consumer wallet" build), plus the master-docs set, plus the frontend work below.

## What is here

| Folder | What | Docs |
| --- | --- | --- |
| `web/` | Network console: the whole system for the laptop demo and judges (live agent trace beside the active pocket and the sellers' side, all pockets, every tx hash, red-team box, forced-transfer test). No login | [web.md](web.md) |
| `mobile/` | The owner's app for Expo Go: pockets, ask the agent, approvals, activity, settings. No setup screen; demo data when the server is down | [mobile.md](mobile.md) |
| `devstack/` | The team's real server and real contracts on a local fork of Base Sepolia, with a scripted agent instead of Claude. No API key, no faucet, no real money | [devstack/README.md](../../devstack/README.md) |

Design system: [design-system/chainbrain/MASTER.md](../../design-system/chainbrain/MASTER.md) (v3, clean bank after Ryt Bank and Revolut, deep teal + navy, light only). Reference screenshots: `reference/frontend/ryt-bank/` (gitignored).

## How the two builds were combined

The team's `web/` and `mobile/` were built against the v2 spec and the real server. The first frontend (branch `feat/frontend`) was built overnight against the older MVP plan, whose API no longer exists. A side-by-side review found the team's apps right on logic and the first frontend stronger on looks and extras. So each app keeps the team's logic files (wallet, chain calls, co-sign payload and its test), and the screens, layout and design came over from the first frontend, rewired to the v2 events. The old mock server is replaced by the dev stack, which runs the real server instead of imitating it. The first frontend stays on its own local branch `feat/frontend` for reference.

## Run it on a laptop (no keys needed)

Once: Node 24, pnpm, Foundry (`curl -L https://foundry.paradigm.xyz | bash`, then `foundryup`). From the repo root: `git submodule update --init`, `pnpm i`, `cd contracts && forge build`, `cd mobile && npm ci`.

```bash
pnpm --dir devstack start        # wallet API :8787, sellers :4021, local chain; prints the LAN URL for the phone
pnpm --dir web dev               # http://localhost:5173 network console, no login
pnpm --dir devstack seed         # optional: real agent purchases for the dashboard to show
```

## Open it on your phone

1. Phone and laptop on the same Wi-Fi.
2. Install **Expo Go** (it must support Expo SDK 57).
3. Start the dev stack (above) and note the LAN URL in its banner, for example `http://192.168.1.23:8787`.
4. `cd mobile && EXPO_PUBLIC_API_URL=http://<LAN IP>:8787 npx expo start`, then scan the QR code (iPhone: Camera app; Android: inside Expo Go).
5. In the app: create a key, then Settings → **Get test funds**, then create a pocket.

The API URL can also be changed on the phone in Settings (with a "Test connection" button).

## Demo scenes

Type the sentences from the [devstack scene table](../../devstack/README.md#demo-scenes-and-exact-sentences); in dev mode both apps also show them as tap-to-send chips. Scene 8 uses the "one purchase" preset; the rest use "Research data".

## Dev mode vs the real server

Both apps ask `GET /dev/health` at start. On the dev stack they show a **LOCAL FORK** badge, turn BaseScan links into plain hashes (fork hashes don't exist on Base Sepolia), and use `/dev/rpc` for the chain. On the team's real server that route is missing, so the badge disappears, BaseScan links work, the web uses MetaMask and the phone uses its own key on Base Sepolia. Nothing else changes.

## Checks (all run on 14 Oct 2026)

| Suite | Result |
| --- | --- |
| End-to-end, `pnpm --dir devstack e2e` (phone: scenes 1-3 and 7, approvals, receipt, revoke; web console: trace with reason codes, pocket vs chain, all pockets, on-chain list, seller side, red-team plant, forced transfer reverted, demo mode, 390 px) | 44/44 on a fresh stack (15 Oct 2026) |
| Web, `pnpm --dir web test`, `build`, `lint` | 24/24, clean |
| Phone, `npm test`, `npx tsc --noEmit`, `npx expo export --platform web` and `ios`, `npx expo-doctor` | 22/22 (incl. the team's co-sign payload test), clean, both exports build, 21/21 |
| Dev stack, `pnpm --dir devstack test` | 15/15 |
| Team server, `cd server && pnpm test`, `SCENE_REPLAY=1 pnpm test:scenes` | 37 passed (6 skipped outside replay), 6/6 |

Before the end-to-end test: build `web/dist` and the phone web export (`cd mobile && EXPO_PUBLIC_API_URL=http://localhost:8787 npx expo export --platform web --output-dir dist`), and restart the dev stack.

## Not verified

- **The phone app has not been run on a physical phone or inside Expo Go.** It was tested as a web export and the iOS bundle builds. Haptics and native gestures have not been seen on a device.
- MetaMask on the real Base Sepolia, and the phone's key on the real Base Sepolia, were not run here (no funded wallets, no deployed factory yet). Those paths are the team's code, unchanged in behaviour.
- The agent in the dev stack is scripted. The real Claude agent needs `ANTHROPIC_API_KEY` and the team's server setup.

## Known gaps

- Two payments settling in the same second can make the dev stack refuse one (HTTP 402, `SETTLEMENT_FAILED`). The e2e therefore runs the phone flow and the web flow one after the other.
- The owner signs on the phone; the web console only reads (no co-signing on the web). The Bank / Compliance view of the first console is not in this version.
- Scene 5's forced transfer: on the dev stack the console's Judges tab runs it (`POST /dev/force-transfer`) and the reverted hash appears in Live and On-chain. On the real chain run `server/scripts/force-transfer.ts`; the console shows the reverted hash only if it comes through the event stream.
- The server keeps events in memory only, so the Bank tab and Activity show what happened since the server started.
- Web: pockets are listed from the browser's own list; there is no discovery from chain logs. The phone has "Add an existing pocket by address"; the web does not yet.
- Phone: there is no "new chat" button, because the server uses the pocket address as the conversation.
- The "Filing with PCAC" row was removed from the Bank checklist, because the updated market notes mark that claim as unsupported.

## For the team

- The plan still says the spec is at `docs/product-design.md` and the rules at `docs/hackathon-rules.md`; they moved to `docs/02-product/` and `docs/01-competition/`. The top README link is fixed; the plan text is left as written.
- The phone's reason-code map was missing `QUOTE_UNKNOWN` and `NOT_THIS_AGENT`; it now uses the web's full list.
- `cfg.sellersUrl` is the server's own `SELLERS_URL` (localhost by default), so the red-team box only works from a phone if that is set to the laptop's LAN address. The dev stack does this automatically.
