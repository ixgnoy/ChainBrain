# ChainBrain wiring map (HEAD `d8440fe`, 19 Oct)
Last updated: 2026-10-19

> A read-only survey of how the apps, server and chain connect today. Written as the starting map for [realchain-goal.md](realchain-goal.md), which makes the real chain the default. Paths are relative to the repo root.

## 1. The demo / live switch

### Mobile (Expo)
- **The switch.** `mobile/src/lib/runtime.ts` keeps a module-level `source: "builtin" | "server"` (default `"builtin"`).
  - Accessors: `getSource`, `isBuiltin`, `setSource`, `setApiUrl`, `getChain` / `setChain`, `rpcUrl`, `txUrl`, `explorerEnabled`, `detectDev`.
- **Env defaults.**
  - `EXPO_PUBLIC_API_URL || http://localhost:8787`.
  - `EXPO_PUBLIC_RPC_URL || https://fisco-node-production.up.railway.app`.
  - `rpcUrl()` returns `${api}/dev/rpc` on the dev stack. There is no `.env` in `mobile/` and no `extra` in `app.json`.
- **Every data call branches on `isBuiltin()`:**
  - `mobile/src/lib/api.ts`: events, pending, approvals, chat, ping, devScenes, devFund, memory, compileRules, composeApp.
  - Routines exist on the built-in network only: they return null, or throw `NOT_ON_THIS_NETWORK`, on a server.
  - `mobile/src/lib/wallet.ts` `ownerWallet()` / `readPocket()`.
  - `mobile/src/lib/shared.ts` `loadConfig()`, which reads `builtin().config()` or GET `/api/config`.
- **The sim.** `mobile/src/lib/builtin.ts` `builtin()` wraps `createWorld()` from `shared/sim`, stored in sessionStorage `cb.builtin` on web. Also there: `seedFor(owner)` and `startOutsideAgents()`.
- **Mode on launch.** `mobile/src/store.tsx` `AppProvider` **deletes `cb.source` on every launch, so the app always opens on builtin.**
  - The API URL is stored under `cb.apiUrl` (SecureStore, or localStorage on web).
  - The connect effect runs `detectDev` → `loadConfig` and retries every 5 s.
- **Settings.** `mobile/src/app/(tabs)/settings.tsx` has a "Custom server" toggle → `connect()` → `setSource("server")`, plus test, get funds and import a key.
- **Explorer and relay.**
  - `mobile/src/components/ExplorerSheet.tsx` reads `builtin().txs()` on sim. On a server it shows local ledger and owner-tx data only and never calls the server explorer.
  - `mobile/src/lib/relay.ts` mirrors the sim to the console via `/dev/relay/push`.

### Web console (Vite)
- **The switch.** `web/src/source/source.ts`: `Source = {kind:"demo"} | {kind:"live", url}`. The **default is demo**.
  - `DEFAULT_API = VITE_API_URL ?? http://localhost:8787`.
  - Stored in localStorage `cb.source` / `cb.apiUrl`. A hidden `?server=<url>` parameter also sets it.
- **The interface.**
  - `web/src/console/network.ts` defines `Network` / `Actions` (plant, forceTransfer, runScene, say, chat, hijack, testPlan, runTest).
  - `useNetwork.tsx` picks `LiveNetwork` or `FeedNetwork`. FeedNetwork wraps `web/src/source/localFeed.ts` (sim + autopilot) or `linkedFeed.ts` (phone relay).
- **LiveNetwork.** `web/src/console/LiveNetwork.tsx` runs `loadConfig` + `detectDev`, then reads the chain with viem: `scanFrom`, then `loadPockets` (factory `PocketCreated`, 20k-block window), then `loadHistory` (Transfer, Revoked, RulesChanged, Frozen, Unfrozen) in `web/src/console/chain.ts`.
- **Events and settings.** Events come over SSE `${api}/api/events` (`web/src/useEvents.tsx`). Settings is `web/src/console/Settings.tsx`.
- **Env.** Only `VITE_API_URL` and `VITE_RPC_URL`; `web/vercel.json` sets neither.

## 2. Live mode: endpoints, signing and keys

**Mobile calls these endpoints:**
- GET `/api/config`.
- GET `/api/events.json?after=&pocket=`, polled every 1.5 s.
- GET `/api/pending`, GET `/api/memory`.
- POST `/api/approvals/:id`, POST `/api/chat` (no timeout).
- POST `/api/faucet`, `/api/memory/forget`, `/api/rules/compile`, `/api/pocket-app/compose`.
- Dev-only: `/dev/health`, `/dev/scenes`, `/dev/fund`, `/dev/rpc`, `/dev/relay/push`.
- Chain reads and writes go straight to `rpcUrl()` with viem.

**The web console calls these:**
- GET `/api/config`, SSE `/api/events`, POST `/api/chat`.
- The seller's `/admin/inject` (plant).
- Dev-only `/dev/force-transfer` (hijack).
- The faucet: `/api/faucet/info`, POST `/api/faucet`.
- **The console never signs; it holds no owner key.**

**How the owner signs (mobile only).** `ownerWallet(pk)` in `mobile/src/lib/wallet.ts` uses viem, legacy transactions and `gasPrice 0n`. The owner methods:
- `createPocket` → `PocketFactory.create(agent, cap, askAbove, expiresAt, sellers)`, then parses `PocketCreated`. The agent is `cfg.agent` (the server's single AGENT_PK).
- `fund` → eHKD `transfer`.
- `revoke`, `returnFunds`, `unfreeze`, `setCap`, `setAskAbove`, `setSeller`.
- Co-sign above ask-me: `store.tsx` `signApprove()` → `wallet.signTransfer` (EIP-712 TransferWithAuthorization) → POST `/api/approvals/:id {signature}`. The server checks the signer is `Pocket.owner()`.
- **Intent confirmations, questions and declines are POSTed with no signature and are not authenticated.**

**Keys on the device.** `mobile/src/lib/keystore.ts` holds `chainbrain.owner_pk` (SecureStore, or localStorage on web).
- It is created silently on first launch with expo-crypto, and can be imported in Settings.
- Pocket addresses are stored on the device (`chainbrain.pockets.<owner>`), not discovered from the chain.
- The native coin is funded by `api.devFund`, which posts to `/api/faucet` when the eHKD balance is 0.

**Server keys are shared by every user.** They come from `.env` / `server/scripts/create-wallets.ts`.
- `AGENT_PK`: `server/src/wallet/pay.ts` `agentAccount()`, **one agent key for every pocket**. `settle()` refuses any other agent with `NOT_THIS_AGENT`.
- `OWNER_PK`: token owner and deployer. Used by `faucet.ts` minting and the CLI scripts.
- `FACILITATOR_PK`: x402 settlement in-process (`server/src/facilitator.ts`).
- `FORCE_PK`: the forced-transfer script.
- `SENTINEL_PK`: the guardian, fixed in the factory at deploy, so one guardian for all pockets.
- `SELLER_*_PK`: the sellers' payTo addresses.

## 3. Server (`server/src`, Hono)

**`index.ts` `apiApp(deps)` routes:**
- `/api/radar/*`.
- GET `/api/events` (SSE) and `/api/events.json`.
- GET `/api/config`.
- GET `/api/tx/:hash`: status, block, from, to and log count only.
- Explorer and faucet routes (see below).
- `/api/pending`, POST `/api/approvals/:id`, POST `/api/chat`, `/api/rules/compile`, `/api/pocket-app/compose`, `/api/sentinel`, `/api/memory(/forget)`.
- **CORS is `*` and no route has auth.**

**Chain info.** `chainInfo().rpc` = `PUBLIC_RPC_URL ||` the hard-coded `127.0.0.1:8545`. **If `PUBLIC_RPC_URL` is unset, phones get localhost.**

**Creating a pocket.** There is no server route: the owner's key sends `PocketFactory.create`. FISCO needs a native balance to send. `server/src/fund.ts` `fundIfEmpty()` provides it through the node gateway `/admin/fund` (Bearer `FUND_TOKEN`), or `scripts/fisco/fund.sh` locally.

**Faucet.** `server/src/faucet.ts`:
- Limits: 1 per address per 24 h, 10 per IP per hour, both in memory.
- Each request runs `fundIfEmpty`, then OWNER mints HK$100.
- A serial queue sends the transactions, because FISCO doesn't order a sender's transactions by nonce.

**Explorer.** `server/src/explorer.ts`:
- Routes: summary, blocks, block, tx, address (scans the last 300 blocks).
- A single-page app at `/explorer`.
- It decodes **event logs** with the token, factory and pocket ABIs and labels known addresses.
- It does **not** decode call input or revert reasons, and there is no indexer.

**Event bus.** `server/src/wallet/events.ts` is an in-memory EventEmitter holding the last 1000 events. Approvals, chats and memory are also in memory, so all of it is lost on restart.

**Sellers.**
- `server/src/sellers.ts`: `@x402/hono` with the Exact EVM scheme.
- `server/src/sellers.json`: datalite, datapro, harbour-wines, shadyfeed.
- Demo hooks: `/admin/payto` and `/admin/inject`.
- The haggle route: `/<seller>/<sku>/offer`.
- Payment path: `wallet/pay.ts` `settle()` checks `canPay` / `needsOwner`, then pays with `PocketScheme` (`wallet/scheme.ts`).

## 4. Model wiring

- **The agent loop.** `server/src/agent/loop.ts`:
  - `defaultModel` = `new Anthropic().beta.messages.create(req)` (`@anthropic-ai/sdk` 0.133.0).
  - Model `AGENT_MODEL ?? "claude-opus-5-5"`, `max_tokens` 16000, `output_config.effort`, `betas: ["server-side-fallback-2026-07-01"]`, `fallbacks: "default"`.
  - `runTurn` is a tool loop over `wallet/tools.ts`. **There is no scripted fallback in production**: a model error ends with `stopped: "llm_error"`.
- **Other model calls**, each injectable and each with its own env model id:
  - `rules/compile.ts` (`RULES_MODEL`, `RULES_CHECK_MODEL`);
  - `pocketApp/compose.ts` (`POCKET_APP_MODEL`);
  - `brain/reflect.ts` (`BRAIN_MEMORY_MODEL`);
  - `radar/ask.ts` (`RADAR_MODEL`);
  - `sentinel/decide.ts` (Jev via `TYPESAFE_*`, else `SENTINEL_MODEL`).
- **The scripted model.** `devstack/src/model.ts` `scriptedModel()` is a `ModelFn`.
- **The OpenRouter seam.** The SDK reads `ANTHROPIC_API_KEY` / `ANTHROPIC_BASE_URL`. **The risk:** `betas`, `fallbacks` and `output_config` are Anthropic-only and may be rejected by a proxy. The cleanest swap point is `ModelFn` and the `apiApp` deps (`model`, `rulesModel`, `memoryModel`, `radarModel`, `pocketAppModel`).

## 5. Chain and deploy

- **Chain config.** `server/src/chains.ts`: FISCO id 20200. RPC = `FISCO_RPC ?? 127.0.0.1:8545`. The token and factory come from `contracts/deployments/20200.json`:
  - factory `0x03aB4C311eeE7C3295c63F910D79a07Ffa7A097A`;
  - token `0x0355c0c5Afe2A35369056FBB854903A4aF07781A`.
- **Dev stack.** `devstack/src/stack.ts` runs a real FISCO node with a fresh token and factory, the scripted model and the dev routes. Start it with `pnpm --dir devstack start`.
- **The hosted node.** `deploy/fisco-node/`: FISCO 3.16.4 Air (1 node), with `gateway.mjs` for the JSON-RPC proxy, `/health` and `/admin/fund`.
- **The hosted server.** `deploy/server/`: a Dockerfile, plus `start.sh` (`ROLE=api` bootstraps funding and deploy, then runs `src/index.ts`; `ROLE=sellers` runs the sellers).
- **FISCO quirks** (from [`docs/fisco-ehkd-chain.md`](../fisco-ehkd-chain.md)):
  - gas price 0, legacy transactions;
  - one transaction per sender at a time;
  - `block.timestamp` is in milliseconds;
  - a native balance is needed only so an address may send.

## 6. Tests on the real stack

- **Server tests on a real node.** Set up a local FISCO node (`bash scripts/fisco/setup.sh` once, then `start.sh`), run `cd contracts && forge build`, then `pnpm --dir server test`.
  - The chain tests use `test/helpers/stack.ts` `startStack()`.
  - The scripted owner is `test/helpers/owner.ts`.
  - The scenes need `SCENES=1`.
- **Offline tests:** `pnpm --dir devstack test`, `cd mobile && npm test`, `pnpm --dir web test`.
- **End to end.**
  - `devstack/e2e/e2e.cjs` runs Playwright against the dev stack: web via `?server=`, the phone via an Expo web export.
  - `devstack/e2e/builtin.cjs` runs the phone on the sim only.

## 7. Demo-only pieces and their real counterparts

| Piece | Today |
| --- | --- |
| Auto-play (phone `lib/autoplay.ts`, web `shared/sim/autopilot.ts`) | Sim-only |
| Presenter scorecard and Evidence (`web/src/console/Scorecard.tsx`, `Evidence.tsx`) | Read live events, but the scene definitions are sim scenes |
| Attack arena (`web/src/console/Arena.tsx`) | On live: chat works, and plant works if the sellers' `/admin/inject` is reachable. Hijack needs the dev stack. **The real server emits no attack events** |
| Lived-in owner seed (`shared/sim/seed.ts`), outside agents (`shared/sim/agents.ts`) | Sim-only |
| Radar (`server/src/radar/*`) | Real. It needs labels to flag anything |
| Haggler (`server/src/sellers.ts` `/offer`) | Real |
| Brain graph on the phone | Works live. The web "Run a test" is builtin-only |
| Pocket apps, routines, live canvas | Routines are sim-only; compose works live |
| **Seller catalogue** | **Mismatch**: the sim has exa, coingecko, nansen, tradewire, datapro, harbour-wines and shadyfeed; the server has datalite, datapro, harbour-wines and shadyfeed. The compose examples name Exa, CoinGecko and Nansen |
