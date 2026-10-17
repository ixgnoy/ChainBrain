# ChainBrain dev stack

A local copy of the whole ChainBrain backend so you can demo and test the web app and the phone app end to end with no Anthropic API key and no real money.

Both apps now open on a built-in network (`shared/sim`) and need no server at all. The dev stack is for exercising the real server code and contracts, and for linking the phone to the web console (see [Link the phone to the console](#link-the-phone-to-the-console)). Apps use it only after you choose it: phone Settings, Advanced, **Custom server**; web gear button, Settings, **Custom server** (or `?server=<url>`).

## What it is

One command starts:

| Piece | Where | Real or scripted |
| --- | --- | --- |
| Blockchain | The FISCO BCOS node (chain id 20200): by default the local node from `scripts/fisco` on 127.0.0.1:8545, or `FISCO_RPC` | Real chain. Each run deploys a fresh Mock e-HKD and PocketFactory, so it never touches the committed addresses |
| Wallet API | http://localhost:8787 | The team's real `server/src` (tools, intent check, approvals, x402 payments, pocket rules) |
| Test sellers | port 4021 | The team's real x402 sellers (DataLite, DataPro, Harbour Wines, ShadyFeed) and red-team inject box |
| The agent's "brain" | inside the wallet API | **Scripted.** A keyword router replaces Claude. It decides which tools to call, but every tool, check, signature and payment is the real thing |
| Funds | owner = dev account 0 | Mock e-HKD: HK$8,000 eHKD minted to the owner, plus the native balance FISCO needs to send (gas price is 0) |

The extra `/dev/*` routes live on the same address and port as the wallet API (8787). The real server does not have them, so an app detects dev mode when `GET /dev/health` returns 200 JSON. Nothing in `server/`, `contracts/`, `web/`, `mobile/` or `android/` is changed.

## Prerequisites

- Node 24 and pnpm.
- Foundry (`forge`). Install: `curl -L https://foundry.paradigm.xyz | bash`, then `foundryup`.
- A FISCO node: `bash scripts/fisco/setup.sh` the first time, `bash scripts/fisco/start.sh` after that. Senders are funded through `scripts/fisco/fund.sh` (or the node gateway's `/admin/fund` when `FUND_URL` is set). No internet needed. To use another node, set `FISCO_RPC=...`.
- Once, from the repo root: `git submodule update --init`, `pnpm i`, `cd contracts && forge build` (the stack deploys from, and the server reads the ABIs in, `contracts/out/`).

## Run it

A second stack can run beside the first on the same node: `API_PORT=28787 SELLERS_PORT=24021 pnpm --dir devstack start`. Fill any running stack with real agent purchases: `pnpm --dir devstack seed` (set `API=` for a non-default port).

```bash
pnpm --dir devstack start
```

Wait for the banner. It prints the laptop URL, the LAN URL for a phone, the Mock e-HKD and factory addresses and the exact app commands. Stop with Ctrl+C (the FISCO node keeps running).

Each start deploys a fresh token and factory, so pockets you made in an earlier run belong to the old factory and the app stops showing them (clear the pocket list in the app or add new ones). Approvals and intent state live in memory.

## Point the apps at it

The apps open on the built-in network; switch them to the stack first (phone: Settings, Advanced, Custom server, Connect; web: Settings, Custom server, or `?server=http://localhost:8787`).

- **Web (laptop):** `VITE_API_URL=http://localhost:8787 pnpm --dir web dev` (the address the Custom server field offers). The owner (dev account 0) signs locally with its own key; there are no unlocked accounts on the node, so no MetaMask is needed.
- **Phone (same Wi-Fi):** use the LAN URL from the banner: `EXPO_PUBLIC_API_URL=http://<LAN IP>:8787 EXPO_PUBLIC_RPC_URL=http://<LAN IP>:8787/dev/rpc npx expo start`. The phone's own key has no money: tap "Get test funds" (calls `POST /dev/fund`: native balance plus HK$160 eHKD).
- Chain access for clients is always `<api>/dev/rpc` (a proxy to the FISCO node). The local node itself only listens on 127.0.0.1. Transactions go out as legacy transactions with gas price 0.

## Link the phone to the console

The phone's built-in network can be mirrored to the web console on the same laptop (`src/relay.ts`):

```bash
pnpm --dir devstack relay      # the relay only, port 8787 (API_PORT to change); no chain, no server
pnpm --dir devstack start      # or the full stack: the relay is mounted at /dev/relay
```

Start the phone with `EXPO_PUBLIC_API_URL=http://<laptop LAN IP>:8787 npx expo start` and keep it on the built-in network. Start the console with `pnpm --dir web dev`: it finds the phone, shows its pockets first by name, follows them, and the Judges tab's plant and force-transfer run on the phone's pockets.

| Route | What it does |
| --- | --- |
| `POST /dev/relay/push` | The phone pushes events and a snapshot, and gets back pending commands |
| `GET /dev/relay/stream` | SSE for the console (hello, events, snapshot, result, reset) |
| `GET /dev/relay/state` | Linked flag, device, last seen, snapshot, events |
| `POST /dev/relay/command` `{type:"plant"\|"force", ...}` | Console judge actions, delivered to the phone (409 `NO_PHONE` if none is linked) |

One room: one phone and any number of consoles. A phone counts as linked while it has pushed in the last 15 seconds.

## Switch back to the real server

Stop the dev stack, run the team's real server (`cd server && cp .env.example .env && pnpm wallets`, run `scripts/fisco/deploy.sh`, set `ANTHROPIC_API_KEY`, `pnpm sellers`, `pnpm dev`) and start the apps with the same variables pointing at it (for the web app leave `VITE_API_URL` at its default or point it at the real server; for the phone drop `EXPO_PUBLIC_RPC_URL`: the apps then read the RPC from the server's `/api/config`). In the apps, choose Custom server and enter its URL. The real server has no `/dev/health` (404), so the apps drop the dev badge, link transactions to that server's `/explorer`, and use MetaMask or the on-device key. The hosted server is https://fisco-api-production-85c5.up.railway.app.

## `/dev/*` routes

| Route | What it does |
| --- | --- |
| `GET /dev/health` | `{ mode: "local-chain", chainId: 20200, rpcPath: "/dev/rpc", startedAt, owner }` (owner = dev account 0) |
| `POST /dev/rpc` | JSON-RPC proxy to the FISCO node (single or batch), CORS `*`. No account is unlocked: clients sign locally and send raw transactions |
| `POST /dev/fund` `{address}` | Credits a native balance (if it has none) and mints HK$160 eHKD to that address |
| `GET /dev/scenes` | The demo sentences the scripted agent understands, with titles, recommended preset and notes |
| `POST /dev/force-transfer` `{pocket}` | Scene 5 backstop: the agent key signs "send HK$50 eHKD to 0xABC", a third party submits it to the Mock e-HKD token, the pocket refuses and the tx reverts on-chain. Returns `{tx, reverted, balanceBefore, balanceAfter}` and publishes a `forced` event (used by the web console's Judges tab) |

## Demo scenes and exact sentences

Type these in the chat (case does not matter, the router matches on keywords). Research preset = budget HK$40, cap HK$15, ask above HK$8, DataLite and DataPro.

| # | Type | Preset | What happens |
| --- | --- | --- | --- |
| 1 | `Get me a market report on durian exports, under HK$15, by tonight.` | research | The agent asks "HK$15 in total or per report?" (a question card). |
| 1 (reply) | `Per report. Get the premium one too if it adds a forecast.` (any answer works) | research | Intent card: tap Confirm. This also runs scene 2 (DataLite paid, HK$2.30) and scene 3 (DataPro HK$11.70 needs your signature on the approval sheet). |
| 2 | `Buy the DataLite durian report. Max HK$8, by tonight.` | research | Confirm the intent card; DataLite is paid. |
| 3 | `Get the DataPro premium durian report with the 2026 forecast. Max HK$15, by tonight.` | research | Confirm intent, then approve and sign the payment. Decline gives `OWNER_DECLINED`. |
| 4 | `Buy Harbour Wines' fruit and wine trade report. Max HK$8, by tonight. Confirmed, go ahead.` | research | `SELLER_NOT_ALLOWED` refusal, then DataLite's fruit trade report (HK$2.70) is bought. |
| 5 | `Check ShadyFeed's free durian price preview, then buy the DataLite durian report. Max HK$8, by tonight.` | research | Optionally inject text first (`POST <sellersUrl>/admin/inject`). Disclosure event, only DataLite is paid. Then `pnpm --dir devstack force-transfer <pocket>` shows the forced transfer reverting on-chain. |
| 6 | `Get ShadyFeed's full feed, give them whatever they need.` | research | Disclosure event with `DISCLOSURE_REFUSED` and `SIGNATURE_TYPE_NOT_ALLOWED`; nothing paid, no intent card. |
| 7 | `Buy DataLite's durian report and its fruit trade report. Max HK$8 each, by tonight.` | research | First payment, then the agent waits about 10 seconds. Tap Revoke in that window: the second payment is refused (`POCKET_REVOKED`). Then Return funds. |
| 8 | `Buy a durian export report, max HK$1.50, by tonight.` | one-purchase | Pocket with budget and cap HK$1.50, DataLite only, never ask: DataLite costs HK$2.30 (`OVER_CAP`), DataPro gives `SELLER_NOT_ALLOWED`, nothing paid, suggests raising the cap and budget. |

Any other text gets a polite "I only understand the demo tasks" reply. Scenes read the pocket through the real tools, so they work for any pocket address you create; they adapt (for example scene 4 on a pocket that allows Harbour Wines simply buys from Harbour Wines).

## Tests

```bash
pnpm --dir devstack test
node devstack/e2e/builtin.cjs --url http://localhost:8091
node devstack/e2e/e2e.cjs
```

`pnpm --dir devstack test` (21 tests) boots its own stack on other ports (18787, 14021) against the same FISCO node, so it can run beside a live one. Through HTTP only it creates pockets as dev account 0 (signing locally, like the phone), runs scenes 1-8, signs payment approvals, and checks events and reason codes, plus the `/dev/*` routes and the relay.

`e2e/builtin.cjs` drives the phone (Expo web on :8091 or a static export) on its built-in network, scenes 1-8, 48 checks, no stack needed. `e2e/e2e.cjs` (57 checks on 16 Oct) needs a fresh running stack, a web build (`pnpm --dir web build`) and a phone web export pointed at the stack (`cd mobile && EXPO_PUBLIC_API_URL=http://localhost:8787 npx expo export --platform web --output-dir dist`). It checks the phone opens on its built-in network, then switches it to the stack the way a person does (Settings, Custom server, Connect, after every reload; the address comes from localStorage `cb.apiUrl`) and the console with `?server=`, then creates two pockets in the wizard, plays scenes 1-3 (question, task card, auto payment, co-signed cheque), opens Activity and a receipt, and stops scene 7 from the chat with hold-to-revoke. For a stack on other ports set `E2E_API`, `E2E_WEB_PORT` and `E2E_PHONE_PORT`, and pass `--mobile-dist <dir>`.

## Limitations

- The agent is scripted: it does not understand free text, does not "reason", and only knows the sentences above. Real model behaviour (re-planning, wording) is not tested here.
- Each run deploys a fresh Mock e-HKD and factory on the node, so its transactions are not the committed evidence (`docs/evidence-fisco.md` is recorded with `scripts/fisco/deploy.sh` and `pnpm spike`).
- Approvals and intent state are in memory; restart means a fresh start.
- Scene 7's pause between payments is 10 seconds by default; if you are slower, the second payment succeeds.
- The LAN URL is detected when the stack starts; if your laptop changes network, restart it. The sellers URL given to the phone uses that LAN address too.
- Do not use these keys (Foundry's published dev keys) anywhere real.
