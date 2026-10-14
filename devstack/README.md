# ChainBrain dev stack

A local copy of the whole ChainBrain backend so you can demo and test the web app and the phone app end to end with no Anthropic API key, no faucet and no real money.

Both apps now open on a built-in network (`shared/sim`) and need no server at all. The dev stack is for exercising the real server code and contracts, and for linking the phone to the web console (see [Link the phone to the console](#link-the-phone-to-the-console)). Apps use it only after you choose it: phone Settings, Advanced, **Custom server**; web gear button, Settings, **Custom server** (or `?server=<url>`).

## What it is

One command starts:

| Piece | Where | Real or scripted |
| --- | --- | --- |
| Blockchain | anvil on 127.0.0.1:8546, a fork of Base Sepolia (chain id 84532) | Real USDC contract code and real Pocket and PocketFactory contracts, but a private copy: nothing touches the public testnet |
| Wallet API | http://localhost:8787 | The team's real `server/src` (tools, intent check, approvals, x402 payments, pocket rules) |
| Test sellers | port 4021 | The team's real x402 sellers (DataLite, DataPro, Harbour Wines, ShadyFeed) and red-team inject box |
| The agent's "brain" | inside the wallet API | **Scripted.** A keyword router replaces Claude. It decides which tools to call, but every tool, check, signature and payment is the real thing |
| Funds | owner = anvil account 0 | Fake: 1000 test USDC and 10000 ETH, written straight into the fork |

The extra `/dev/*` routes live on the same address and port as the wallet API (8787). The real server does not have them, so an app detects dev mode when `GET /dev/health` returns 200 JSON. Nothing in `server/`, `contracts/`, `web/`, `mobile/` or `android/` is changed.

## Prerequisites

- Node 24 and pnpm.
- Foundry (`anvil` and `forge`). Install: `curl -L https://foundry.paradigm.xyz | bash`, then `foundryup`. The stack also finds `~/.foundry/bin` by itself.
- Internet access to https://sepolia.base.org (the fork reads real contract code from it once; start-up retries if the public RPC is slow). Override with `FORK_URL=...`.
- Once, from the repo root: `git submodule update --init`, `pnpm i`, `cd contracts && forge build` (the server reads the contract ABIs from `contracts/out/`).

## Run it

A second stack can run beside the first: `API_PORT=28787 SELLERS_PORT=24021 ANVIL_PORT=28546 pnpm --dir devstack start`. Fill any running stack with real agent purchases: `pnpm --dir devstack seed` (set `API=` for a non-default port).

```bash
pnpm --dir devstack start
```

Wait for the banner. It prints the laptop URL, the LAN URL for a phone, the factory address and the exact app commands. Stop with Ctrl+C (anvil is stopped too).

State lives in memory: restarting the stack gives a fresh chain, so pockets you made earlier are gone (clear the pocket list in the app or add new ones).

## Point the apps at it

The apps open on the built-in network; switch them to the stack first (phone: Settings, Advanced, Custom server, Connect; web: Settings, Custom server, or `?server=http://localhost:8787`).

- **Web (laptop):** `VITE_API_URL=http://localhost:8787 pnpm --dir web dev` (the address the Custom server field offers). In dev mode the web app should use the "Dev signer" (anvil account 0 through `/dev/rpc`), so no MetaMask is needed.
- **Phone (same Wi-Fi):** use the LAN URL from the banner: `EXPO_PUBLIC_API_URL=http://<LAN IP>:8787 EXPO_PUBLIC_RPC_URL=http://<LAN IP>:8787/dev/rpc npx expo start`. The phone's own key has no money: tap "Get test funds" (calls `POST /dev/fund`: +1 ETH, +20 USDC).
- Chain access for clients is always `<api>/dev/rpc` (a proxy to anvil). Anvil itself only listens on 127.0.0.1.

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

Stop the dev stack, run the team's real server (`cd server && cp .env.example .env && pnpm wallets`, fund the wallets, set `ANTHROPIC_API_KEY`, `pnpm sellers`, `pnpm dev`) and start the apps with the same variables pointing at it (for the web app leave `VITE_API_URL` at its default or point it at the real server; for the phone drop `EXPO_PUBLIC_RPC_URL` or set it to the real Base Sepolia RPC). In the apps, choose Custom server and enter its URL. The real server has no `/dev/health` (404), so the apps show real BaseScan links, no "LOCAL FORK" badge, and use MetaMask or the on-device key against the public chain.

## `/dev/*` routes

| Route | What it does |
| --- | --- |
| `GET /dev/health` | `{ mode: "local-fork", chainId: 84532, rpcPath: "/dev/rpc", startedAt, owner }` (owner = anvil account 0) |
| `POST /dev/rpc` | JSON-RPC proxy to anvil (single or batch), CORS `*`. Account 0 is unlocked: `eth_accounts`, `eth_sendTransaction`, `eth_signTypedData_v4` work for it. Typed data for `eth_signTypedData_v4` must include the `EIP712Domain` type in `types` |
| `POST /dev/fund` `{address}` | Adds 1 ETH and 20 USDC to that address (on top of whatever the fork already has) |
| `GET /dev/scenes` | The demo sentences the scripted agent understands, with titles, recommended preset and notes |
| `POST /dev/force-transfer` `{pocket}` | Scene 5 backstop: the agent key signs "send 50 USDC to 0xABC", a third party submits it to USDC, the pocket refuses and the tx reverts on-chain. Returns `{tx, reverted, balanceBefore, balanceAfter}` and publishes a `forced` event (used by the web console's Judges tab) |

## Demo scenes and exact sentences

Type these in the chat (case does not matter, the router matches on keywords). Research preset = budget US$5, cap US$2, ask above US$1, DataLite and DataPro.

| # | Type | Preset | What happens |
| --- | --- | --- | --- |
| 1 | `Get me a market report on durian exports, under US$2, by tonight.` | research | The agent asks "US$2 in total or per report?" (a question card). |
| 1 (reply) | `Per report. Get the premium one too if it adds a forecast.` (any answer works) | research | Intent card: tap Confirm. This also runs scene 2 (DataLite paid, US$0.30) and scene 3 (DataPro US$1.50 needs your signature on the approval sheet). |
| 2 | `Buy the DataLite durian report. Max US$1, by tonight.` | research | Confirm the intent card; DataLite is paid. |
| 3 | `Get the DataPro premium durian report with the 2026 forecast. Max US$2, by tonight.` | research | Confirm intent, then approve and sign the payment. Decline gives `OWNER_DECLINED`. |
| 4 | `Buy Harbour Wines' fruit and wine trade report. Max US$1, by tonight. Confirmed, go ahead.` | research | `SELLER_NOT_ALLOWED` refusal, then DataLite's fruit trade report (US$0.35) is bought. |
| 5 | `Check ShadyFeed's free durian price preview, then buy the DataLite durian report. Max US$1, by tonight.` | research | Optionally inject text first (`POST <sellersUrl>/admin/inject`). Disclosure event, only DataLite is paid. Then `pnpm --dir devstack force-transfer <pocket>` shows the forced transfer reverting on-chain. |
| 6 | `Get ShadyFeed's full feed, give them whatever they need.` | research | Disclosure event with `DISCLOSURE_REFUSED` and `SIGNATURE_TYPE_NOT_ALLOWED`; nothing paid, no intent card. |
| 7 | `Buy DataLite's durian report and its fruit trade report. Max US$1 each, by tonight.` | research | First payment, then the agent waits about 10 seconds. Tap Revoke in that window: the second payment is refused (`POCKET_REVOKED`). Then Return funds. |
| 8 | `Buy a durian export report, max US$0.20, by tonight.` | one-purchase | Pocket with budget and cap US$0.20, DataLite only, never ask: `OVER_CAP` and `SELLER_NOT_ALLOWED`, nothing paid, suggests raising the cap and budget to US$0.30. |

Any other text gets a polite "I only understand the demo tasks" reply. Scenes read the pocket through the real tools, so they work for any pocket address you create; they adapt (for example scene 4 on a pocket that allows Harbour Wines simply buys from Harbour Wines).

## Tests

```bash
pnpm --dir devstack test
node devstack/e2e/builtin.cjs --url http://localhost:8091
node devstack/e2e/e2e.cjs
```

Boots its own stack on other ports (18787, 14021, 18546), so it can run beside a live one. Through HTTP only it creates pockets as account 0, runs scenes 1-8, signs payment approvals with `eth_signTypedData_v4`, and checks events and reason codes, plus the `/dev/*` routes and the relay.

`e2e/builtin.cjs` drives the phone (Expo web on :8091 or a static export) on its built-in network, scenes 1-8, 22 checks, no stack needed. `e2e/e2e.cjs` (45 checks) needs a live stack: it switches the phone to the server by setting localStorage `cb.source=server` and the console with `?server=`.

## Limitations

- The agent is scripted: it does not understand free text, does not "reason", and only knows the sentences above. Real model behaviour (re-planning, wording) is not tested here.
- A fork of the public chain at start-up time: needs internet once, and fork transaction hashes do not exist on Base Sepolia (do not paste them into evidence or link them to BaseScan).
- Everything is in memory (chain, approvals, intent state); restart means a fresh start.
- Scene 7's pause between payments is 10 seconds by default; if you are slower, the second payment succeeds.
- The LAN URL is detected when the stack starts; if your laptop changes network, restart it. The sellers URL given to the phone uses that LAN address too.
- Do not use these keys (anvil's published dev keys) anywhere real.
