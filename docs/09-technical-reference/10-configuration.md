# 10 Configuration

This document lists every environment variable and build property the ChainBrain code reads. It covers the wallet server (`server/`), the dev stack (`devstack/`), the web app (`web/`, `VITE_*`), the Expo app (`mobile/`, `EXPO_PUBLIC_*`) and the native Android app (Gradle properties baked into `BuildConfig`). Each entry gives the variable, the file and line that reads it, its default and its effect. The deploy scripts and Dockerfiles appear where they set or read the same variables. The document also covers demo key setup: `server/.env.example`, `pnpm wallets` and how each key is funded. Pockets are called "cards" in the owner-facing UI; the code and this document say "pocket". Variables were found by searching for `process.env`, `import.meta.env`, `EXPO_PUBLIC_`, `vm.env` and `gradleProperty`. A variable not listed here was not found in the code.

## 1. Where configuration comes from

| Package | Mechanism | Source |
| --- | --- | --- |
| `server/` | `import "dotenv/config"`, which loads `.env` from the working directory. `pnpm` scripts run in `server/`, so the file is `server/.env` | `server/src/index.ts:1`, `server/src/sellers.ts:1`, every `server/scripts/*.ts` that needs keys |
| `server/` on Railway | service variables; `deploy/server/start.sh` picks the role | `deploy/server/start.sh:6-9` |
| `devstack/` | sets server variables itself with `Object.assign(process.env, …)` before importing the server | `devstack/src/stack.ts:71`, `86` |
| `web/` | Vite `import.meta.env.VITE_*`, fixed at build time | `web/src/source/source.ts:8`, `web/src/console/LiveNetwork.tsx:13` |
| `mobile/` | Expo `process.env.EXPO_PUBLIC_*` | `mobile/src/lib/runtime.ts:5-6`, `41` |
| `android/` | Gradle properties to `BuildConfig`, then user settings | `android/gradle.properties`, `android/app/build.gradle.kts:16-17` |
| `contracts/` | Foundry `vm.env*` in the deploy script | `contracts/script/DeployFisco.s.sol:12`, `16` |

`server/.env.example` is the only `.env.example` file in the repository.

## 2. Server: chain and addresses

| Variable | Read at | Default | What it does |
| --- | --- | --- | --- |
| `FISCO_RPC` | `server/src/chains.ts:31`; `server/scripts/bootstrap-fisco.ts:12`; `devstack/src/main.ts:3`, `devstack/src/stack.ts:63` | `http://127.0.0.1:8545` | The server's own JSON-RPC URL for the FISCO BCOS node (chain id 20200). It is never sent to the apps. |
| `TOKEN_ADDRESS` | `server/src/chains.ts:28` | `Token` in `contracts/deployments/20200.json` | Mock e-HKD address. If neither is set, `cfg()` throws "No Mock e-HKD token" (`chains.ts:29`). The deployments file is read once per process, so a redeploy needs a restart or this variable (`chains.ts:4`). |
| `FACTORY_ADDRESS` | `server/src/wallet/chain.ts:19` | `PocketFactory` in `contracts/deployments/20200.json` | Pocket factory address, returned by `/api/config`. If neither is set, the call throws (`chain.ts:20`). |
| `PUBLIC_API_URL` | `server/src/chains.ts:33`; `server/src/faucet.ts:23` | `http://localhost:8787` | Base of explorer links: `<PUBLIC_API_URL>/explorer#/tx/<hash>`. It also forms the faucet's `explorer` field. |
| `PUBLIC_RPC_URL` | `server/src/index.ts:35`; `server/src/faucet.ts:22` | the chain's default RPC, `http://127.0.0.1:8545` (`chains.ts:16`) | RPC URL the apps are told to use, in `/api/config` `chain.rpc` and `/api/faucet/info`. It is read with `\|\|`, so an empty value falls back to the default. It keeps a provider key in `FISCO_RPC` from reaching the apps (`index.ts:34`). The dev stack sets it to its own `/dev/rpc` (`devstack/src/stack.ts:71`). |

## 3. Server: processes and ports

| Variable | Read at | Default | What it does |
| --- | --- | --- | --- |
| `PORT` | `server/src/index.ts:127` | `8787` | Wallet API port. `deploy/server/start.sh:7` passes Railway's `$PORT` through. |
| `SELLERS_PORT` | `server/src/sellers.ts:103`; `devstack/src/main.ts:7` | `4021` | Test sellers port. With `ROLE=sellers`, `deploy/server/start.sh:8` sets it from `$PORT`. |
| `SELLERS_URL` | `server/src/index.ts:59`; `server/src/wallet/directory.ts:10`; `server/src/wallet/pay.ts:12` | `http://localhost:4021` | Where the wallet API fetches quotes, pays and reads `/admin/payto`. It is returned in `/api/config` as `sellersUrl`. The dev stack sets it to `http://<LAN IP or localhost>:<sellersPort>` (`devstack/src/stack.ts:69`). `server/scripts/spike.ts:16` and `server/scripts/allowance.ts:48` set it too. |
| `ROLE` | `deploy/server/start.sh:6` | `api` | `api` runs `scripts/bootstrap-fisco.ts`, then the wallet API. `sellers` runs the test sellers. Any other value exits with an error. |

## 4. Server: keys

All keys are hex private keys (`0x` + 64 hex). They are demo keys only.

| Variable | Read at | Required by | What it is |
| --- | --- | --- | --- |
| `AGENT_PK` | `server/src/wallet/pay.ts:13`; `server/scripts/new-pocket.ts:20`; `server/scripts/force-transfer.ts:14` | wallet API (`/api/config`, every payment), explorer labels | The agent key. It signs `TransferWithAuthorization` messages the tool layer built. Every pocket names its address as `agent`. A pocket made for another agent key refuses with `NOT_THIS_AGENT` (`pay.ts:58`). |
| `OWNER_PK` | `server/src/faucet.ts:49`; `server/scripts/bootstrap-fisco.ts:24`; `server/scripts/new-pocket.ts:19`; `server/scripts/chat.ts:17`; `server/scripts/spike.ts:21`; `server/scripts/allowance.ts:53`; `contracts/script/DeployFisco.s.sol:12`; `scripts/fisco/deploy.sh:9` | faucet, deploy and bootstrap, CLI scripts | Demo owner and token deployer. It mints faucet eHKD (MockEHKD's `mint`). The CLI scripts use it to create pockets and approve payments. `allowance.ts` also uses it to set the weekly allowance and to co-sign the cheque. |
| `FACILITATOR_PK` | `server/src/facilitator.ts:10` | test sellers | Submits `transferWithAuthorization` for x402 settlement. Gas is free, so it pays nothing (`facilitator.ts:8`). |
| `FORCE_PK` | `server/scripts/force-transfer.ts:15`; `server/scripts/allowance.ts:55` | scene 5 backstop script; allowance evidence script | A third party that submits a compromised-agent transfer straight to the token, so the revert lands on-chain. In `allowance.ts` it submits the agent-only payment past the weekly allowance (`allowance.ts:57-67`). |
| `SELLER_DATALITE_PK`, `SELLER_DATAPRO_PK`, `SELLER_HARBOUR_WINES_PK`, `SELLER_SHADYFEED_PK` | `server/src/sellers.ts:23`, by each seller's `keyEnv` in `server/src/sellers.json` | test sellers; `new-pocket.ts`, `spike.ts` | Each seller's `payTo` is its key's address. Only the address is used. |
| `SENTINEL_PK` | `server/src/sentinel/index.ts:16`; `server/scripts/bootstrap-fisco.ts:25`, `40` | optional | The Sentinel's guardian key. It can only call `Pocket.freeze`. When it is unset, the Sentinel holds instead of freezing (`sentinel/index.ts:14`, `94-96`). When it is set, bootstrap funds it and deploys the factory with its address as guardian. |
| `SENTINEL_ADDRESS` | `contracts/script/DeployFisco.s.sol:16` | optional | Guardian address for `scripts/fisco/deploy.sh` (forge). Default `address(0)`, which means no guardian. `server/.env.example` says to set it to `SENTINEL_PK`'s address. |

## 5. Server: models and AI

The Anthropic client is created as `new Anthropic()` with no key argument (`agent/loop.ts:13`, `radar/ask.ts:12`, `rules/compile.ts:7`, `brain/reflect.ts:11`, `sentinel/decide.ts:29`, `pocketApp/compose.ts:15`). The key therefore comes from the SDK's own environment lookup. Model ids are the code defaults.

| Variable | Read at | Default | What it does |
| --- | --- | --- | --- |
| `ANTHROPIC_API_KEY` | explicit checks at `server/src/index.ts:45`, `rules/compile.ts:65`, `pocketApp/compose.ts:37`, `sentinel/decide.ts:71` | unset | Turns on memory reflection, the two-model rules reading, model-composed pocket apps and the Haiku Sentinel. Without it those fall back to the fixed parser or picker, or are off. The agent loop has no fallback: a failed model call ends the turn with `stopped: "llm_error"` (`agent/loop.ts:52-54`). Tests skip the real-model cases without it (`server/test/scenes.test.ts:14`). |
| `AGENT_MODEL` | `server/src/agent/loop.ts:22` | `claude-opus-5-5` | Agent model. `server/.env.example` sets `claude-sonnet-5-5`, so a `.env` copied from it runs Sonnet. |
| `AGENT_EFFORT` | `server/src/agent/loop.ts:24` | `high` | `output_config.effort`: `low`, `medium` or `high`. |
| `RULES_MODEL` | `server/src/rules/compile.ts:68` | `claude-sonnet-5-5` | First reading for `/api/rules/compile`. |
| `RULES_CHECK_MODEL` | `server/src/rules/compile.ts:69` | `claude-haiku-5-5` | Second, independent reading. The stricter value wins. |
| `POCKET_APP_MODEL` | `server/src/pocketApp/compose.ts:41` | `claude-sonnet-5-5` | Composes the pocket app spec for `/api/pocket-app/compose`. |
| `RADAR_MODEL` | `server/src/radar/ask.ts:69` | `claude-haiku-5-5` | "Ask Radar" (`POST /api/radar/ask`). |
| `BRAIN_MEMORY` | `server/src/index.ts:45` | on | `off` turns off memory reflection. History is still trimmed. |
| `BRAIN_MEMORY_MODEL` | `server/src/brain/reflect.ts:39` | `claude-haiku-5-5` | Writes the memory snapshot after each chat turn. |
| `BRAIN_KEEP_TURNS` | `server/src/brain/window.ts:5` | `3` | Owner turns of raw history kept per conversation. |
| `SENTINEL_MODEL` | `server/src/sentinel/decide.ts:53` | `claude-haiku-5-5` | The Haiku stand-in for Jev. |
| `SENTINEL_AI_TIMEOUT_MS` | `server/src/sentinel/decide.ts:76` | `6000` | Time limit for the Sentinel's AI answer. On timeout the fixed rules decide alone. |
| `TYPESAFE_API_KEY` | `server/src/sentinel/decide.ts:16`, `71` | unset | When set, the Sentinel uses TypeSafe Jev, which takes precedence over Haiku. It is sent as `Bearer`. |
| `TYPESAFE_URL` | `server/src/sentinel/decide.ts:14` | `https://api.typesafe.ai/v1/systemone` | Jev endpoint. |
| `TYPESAFE_MODEL` | `server/src/sentinel/decide.ts:17` | `jev-latest` | Jev model name in the request body. |

## 6. Server: wallet behaviour

| Variable | Read at | Default | What it does |
| --- | --- | --- | --- |
| `APPROVAL_WAIT_MS` | `server/src/wallet/tools.ts:27` | `600000` (10 min) | How long `draft_intent` and `ask_owner {quoteId}` wait for the owner. Tests shorten it. |
| `PREFLIGHT_FROM` | `server/src/wallet/preflight.ts:38` | `0x000000000000000000000000000000000000dEaD` | `from` account of the pre-flight `eth_call`. |
| `FAUCET_AMOUNT` | `server/src/faucet.ts:21` | `100` | HK$ of eHKD minted per faucet claim. |
| `FUND_URL` | `server/src/fund.ts:13`, `17` | unset | When set, native balance is credited through `<FUND_URL>/admin/fund`, the hosted node gateway. When unset, the server runs `scripts/fisco/fund.sh`, which drives the local FISCO console. Used by the faucet, bootstrap and the dev stack. |
| `FUND_TOKEN` | `server/src/fund.ts:18`; `deploy/fisco-node/gateway.mjs:19` | unset; the gateway requires 24 or more characters or refuses to start (`gateway.mjs:21`) | Bearer token for `/admin/fund`. |

## 7. Server: Radar

| Variable | Read at | Default | What it does |
| --- | --- | --- | --- |
| `RADAR_ADMIN` | `server/src/radar/api.ts:50` | off | `1` enables `POST /api/radar/admin/labels`, which accepts risky categories only. Demo only. |
| `RADAR_LABELS_FILE` | `server/src/radar/labels.ts:18` | unset | Path to a JSON array of `{address, category, name, source}`, loaded at start. Entries with an unknown category are skipped. |
| `RADAR_REVIEW_AT` | `server/src/radar/rules.ts:5` | `5` | Score at which the verdict is `review`: the owner must co-sign. |
| `RADAR_BLOCK_AT` | `server/src/radar/rules.ts:5` | `8` | Score at which the verdict is `block`: payment refused. |
| `RADAR_MAX_HOPS` | `server/src/radar/screen.ts:43` | `3` | Hops in the fund-flow walk. |
| `RADAR_TIMEOUT_MS` | `server/src/radar/screen.ts:114` | `8000` | Time limit for one screen. On timeout only the pocket's rules apply. |
| `RADAR_MONITOR_MS` | `server/src/radar/monitor.ts:11` | `30000` | Re-screen interval for watched counterparties. |
| `RADAR_LOG_STEP` | `server/src/radar/chainSource.ts:8` | `200` | Blocks per `eth_getLogs` call. |
| `RADAR_BACKFILL_BLOCKS` | `server/src/radar/chainSource.ts:10` | `1800` | Blocks of eHKD `Transfer` history indexed at start. |

## 8. Server: scripts and tests

| Variable | Read at | Default | What it does |
| --- | --- | --- | --- |
| `EVIDENCE_FILE` | `server/scripts/evidence.ts:7`; `server/scripts/record-deploy.ts:5` | unset (no-op) | Appends tx hashes to this JSON file for `scripts/verify-evidence.ts`. `allowance.ts` records its six "allowance: …" hashes through the same `record` (`allowance.ts:41-43`, `50`, `67`, `73`). |
| `SPIKE_SELLERS_URL` | `server/scripts/spike.ts:15`; `server/scripts/allowance.ts:47` | unset | Pays deployed sellers instead of starting sellers in-process on port 4599. |
| `SCENES` | `server/test/scenes.test.ts:59` | unset | `pnpm test:scenes` sets `SCENES=1` (`server/package.json`). Without it the scene suite is skipped. |
| `SCENE_REPLAY` | `server/test/scenes.test.ts:14` | unset | Forces the scripted stand-in model even when `ANTHROPIC_API_KEY` is set. |

The tests load the Foundry default dev keys with `useDevKeys()` (`server/test/helpers/env.ts`). `server/test/allowance-chain.test.ts` sets `APPROVAL_WAIT_MS=20000` for its own run (`allowance-chain.test.ts:17`).

Evidence and verification scripts:

| Script | How to run | Reads | What it needs |
| --- | --- | --- | --- |
| `server/scripts/allowance.ts` | `cd server && pnpm tsx scripts/allowance.ts` (`README.md:103`); it is not a `package.json` script | `OWNER_PK`, `FORCE_PK`, `AGENT_PK` (through `wallet/pay.ts:13`), `SPIKE_SELLERS_URL`, `EVIDENCE_FILE`, plus the chain variables in section 2 | A deployed factory, and native balance for `OWNER` and `FORCE` (`allowance.ts:6`). Exit 0 only if the first report settles, the agent-only second report reverts and the co-signed one settles (`allowance.ts:76`). |
| `verify/verify_pocket.py` | `python3 verify/verify_pocket.py --rpc <url> --pocket <address> [--approved approved.json] [--json] [--factory <address>]` (`verify/README.md:12-17`; `verify_pocket.py:8-9`) | no environment variable; command-line flags only (`verify_pocket.py:418-423`); `--factory` defaults to the committed factory `0x03aB4C311eeE7C3295c63F910D79a07Ffa7A097A` (`verify_pocket.py:147`) | Python 3 standard library only (`verify/README.md:6`). Exit 0 provenance holds and every approved field matches, 1 a mismatch, 2 an RPC or input error or anything unexpected (`verify/README.md:19`). |

## 9. Dev stack (`devstack/`)

| Variable | Read at | Default | What it does |
| --- | --- | --- | --- |
| `FISCO_RPC` | `devstack/src/main.ts:3`; `devstack/src/stack.ts:63` | `http://127.0.0.1:8545` | The node to deploy to. The stack refuses to start unless `eth_chainId` is `0x4ee8` (20200) (`stack.ts:64-65`). |
| `API_PORT` | `devstack/src/main.ts:7`; `devstack/src/relay-main.ts:8` | `8787` | Port of the wallet API with `/dev/*`, or of the relay alone. |
| `SELLERS_PORT` | `devstack/src/main.ts:7` | `4021` | Test sellers port. |
| `FUND_URL`, `FUND_TOKEN` | through `server/src/fund.ts` (`devstack/src/stack.ts:74`, `77`) | unset | As in section 6. |
| `API` | `devstack/src/seed.ts:7` | `http://localhost:8787` | Stack that `pnpm --dir devstack seed` fills with purchases. |
| `API_URL` | `devstack/src/force-transfer.ts:9` | `http://localhost:8787` | Stack whose `/api/config` gives the token and factory for the backstop script. |
| `E2E_API` | `devstack/e2e/e2e.cjs:15` | `http://localhost:8787` | API under test. |
| `E2E_MOBILE_DIST` | `devstack/e2e/e2e.cjs:20` | `mobile/dist` | Built Expo web bundle. |
| `E2E_WEB_PORT`, `E2E_PHONE_PORT` | `devstack/e2e/e2e.cjs:21` | `4173`, `4174` | Ports the e2e run serves on. |
| `E2E_DEBUG_DIR` | `devstack/e2e/e2e.cjs:40-41` | unset | Folder for failure screenshots and page text. |
| `E2E_PHONE_URL` | `devstack/e2e/builtin.cjs:11` | `http://localhost:8091` | Phone app URL for the built-in network e2e. |
| `E2E_SHOTS` | `devstack/e2e/builtin.cjs:12` | empty | Screenshot folder. |

What the dev stack sets for the server, so none of it is needed in `.env`:
- `DEV_KEYS` are the Foundry default accounts: `OWNER_PK`, `AGENT_PK`, the four `SELLER_*_PK`, `FACILITATOR_PK`, `FORCE_PK` and `SENTINEL_PK` (`devstack/src/stack.ts:15-25`).
- `FISCO_RPC`, `SELLERS_URL` and `PUBLIC_RPC_URL` (`http://<LAN IP or localhost>:<API_PORT>/dev/rpc`, so `/api/config` hands the apps the proxy) (`stack.ts:70-71`).
- `TOKEN_ADDRESS` and `FACTORY_ADDRESS` of the fresh deploy (`stack.ts:86`).

The dev stack does not set `ANTHROPIC_API_KEY`. Its agent is scripted (`stack.ts:97`). If the key is already in the environment, memory, rules compile, pocket apps and the Sentinel still use it.

## 10. Web app (`web/`)

| Variable | Read at | Default | What it does |
| --- | --- | --- | --- |
| `VITE_API_URL` | `web/src/source/source.ts:8` | `http://localhost:8787` | The address the Settings "Custom server" field offers. The app opens on the built-in network. A server is used only after the user picks one (saved in `localStorage` as `cb.source` and `cb.apiUrl`) or passes `?server=<url>` (`source.ts:1-3`, `9`). |
| `VITE_RPC_URL` | `web/src/console/LiveNetwork.tsx:13`, `74` | unset | RPC for the console's chain reads against a live server. Order: dev stack proxy `<api>/dev/rpc` when `/dev/health` answers, then `VITE_RPC_URL`, then `/api/config` `chain.rpc`, then `https://fisco-node-production.up.railway.app` (`LiveNetwork.tsx:74`). |

`web/vercel.json` sets the build commands and no variables.

## 11. Expo app (`mobile/`)

| Variable | Read at | Default | What it does |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | `mobile/src/lib/runtime.ts:5` | `http://localhost:8787` | Default wallet server URL. It can be changed at run time in Settings (`runtime.ts:37`). The app starts on the built-in network (`runtime.ts:18`). The devstack relay also uses this URL (`devstack/src/relay-main.ts:1-2`). |
| `EXPO_PUBLIC_RPC_URL` | `mobile/src/lib/runtime.ts:6`, `41` | `https://fisco-node-production.up.railway.app` | RPC for chain reads and owner transactions. Order: dev stack proxy `<api>/dev/rpc` in dev mode, then this variable, then `/api/config` `chain.rpc`, then the default (`runtime.ts:41`). |

`EXPO_PUBLIC_REOWN_PROJECT_ID` appears only in a design note (`docs/04-build/metamask-expo-go.md:79`). No code in `mobile/src` reads it. The app uses an on-device key instead of WalletConnect (`mobile/src/lib/wallet.ts:2-3`).

## 12. Native Android app (`android/`)

| Gradle property | Default (`android/gradle.properties`) | Becomes | Overridden by |
| --- | --- | --- | --- |
| `chainbrain.apiUrl` | `http://10.0.2.2:8787` (the host machine from the Android emulator) | `BuildConfig.API_URL` (`android/app/build.gradle.kts:16`) | the Setup screen, saved as `api_url` in preferences (`KeyVault.kt:66-68`) |
| `chainbrain.rpcUrl` | `http://10.0.2.2:8545` | `BuildConfig.RPC_URL` (`android/app/build.gradle.kts:17`) | the Setup screen, saved as `rpc_url` (`KeyVault.kt:69-71`) |

- Both properties are read with `.get()`, so a build fails without them (`build.gradle.kts:16-17`).
- The comment in `gradle.properties` says that on a phone the API is the laptop's LAN IP, for example `http://192.168.1.20:8787`.
- The app reads the explorer prefix from the API base: `<api>/explorer#/tx/` (`Api.kt:34`).

## 13. Hosted node and deploy images

| Variable | Read at | Default | What it does |
| --- | --- | --- | --- |
| `PORT` (node gateway) | `deploy/fisco-node/gateway.mjs:18` | `8080` (also `ENV PORT=8080` in `deploy/fisco-node/Dockerfile:15`) | Public port of the gateway in front of the node's web3 RPC. |
| `FUND_TOKEN` (node gateway) | `deploy/fisco-node/gateway.mjs:19` | required, 24+ chars (`gateway.mjs:21`) | Guards `POST /admin/fund`. |
| `FISCO_HOME` | `scripts/fisco/env.sh:3`; `deploy/fisco-node/entrypoint.sh:5` | `<repo>/.fisco` locally; `/data/fisco` in the image | Where the chain binary, console and node data live. |
| `JAVA_HOME` | `scripts/fisco/env.sh:7` | Java 17 from `/usr/libexec/java_home` on macOS, if unset | Java for the FISCO console. |
| `NODE_ENV` | set in `deploy/server/Dockerfile:20` | `production` | No read of `NODE_ENV` was found in `server/src`. |

`eth_getLogs` is answered by `deploy/fisco-node/logs.mjs`, which the gateway and the dev stack's `/dev/rpc` share: windows of `LOG_WINDOW` = 5 blocks, at most `MAX_LOG_BLOCKS` = 5 000 blocks per request, at most `MAX_LOGS_PER_BATCH` = 5 `eth_getLogs` calls per batch, and at most `MAX_INFLIGHT` = 16 node calls at once (`logs.mjs:6-9`). Batches to the node are split at `NODE_BATCH_LIMIT` = 8 calls (`logs.mjs:62`). All are constants in the file, not environment variables.

`FISCO_VERSION` (v3.16.4) and `CONSOLE_VERSION` (v3.7.0) are assigned in `scripts/fisco/env.sh:4-5` and set in `deploy/fisco-node/Dockerfile:5`. They are not read from the outside environment.

## 14. Key and wallet setup

### 14.1 Local chain, real server

1. `bash scripts/fisco/setup.sh` builds a one-node FISCO BCOS 3.16.4 chain in `.fisco/` (`scripts/fisco/setup.sh:1-30`). It enables the web3 RPC on 127.0.0.1:8545, chain id 20200, with native balance features on. It registers the console account as balance governor.
2. `cd server && pnpm wallets` runs `server/scripts/create-wallets.ts`:
   - If `server/.env` does not exist, it copies `server/.env.example` with empty `*_PK=` lines removed (`create-wallets.ts:9`).
   - It generates a key for each of `OWNER`, `AGENT`, `FORCE`, `FACILITATOR`, `SELLER_DATALITE`, `SELLER_DATAPRO`, `SELLER_HARBOUR_WINES` and `SELLER_SHADYFEED` that has no `<NAME>_PK=0x…` line yet (`create-wallets.ts:5`, `11-14`).
   - It appends each new key and never overwrites an existing one (`create-wallets.ts:1`, `14`).
   - It prints every address (`create-wallets.ts:15`).
   - It does not create `SENTINEL_PK`; add it by hand if wanted.
3. `bash scripts/fisco/deploy.sh` (`scripts/fisco/deploy.sh:1-22`):
   - It sources `server/.env` and credits native balance to `OWNER`, `FACILITATOR` and `FORCE` (`deploy.sh:8-10`).
   - It deploys MockEHKD and PocketFactory with forge from `OWNER_PK`, with guardian `SENTINEL_ADDRESS` or none (`DeployFisco.s.sol:12-16`).
   - It checks that both contracts have code, and restores the previous `deployments/20200.json` on failure (`deploy.sh:12-19`).
   - It records the deploy transactions to `EVIDENCE_FILE` when set (`deploy.sh:21`).
   - The deploy script mints HK$10,000 eHKD to OWNER (`DeployFisco.s.sol:17`).
4. Set `ANTHROPIC_API_KEY`, then run `pnpm sellers` and `pnpm dev` (`devstack/README.md`, "Switch back to the real server").

The agent key and the seller keys get no native balance from `deploy.sh`:
- The agent key never sends a transaction on the real server. It only signs.
- The seller keys are only used for their addresses (`sellers.ts:23`).

### 14.2 Hosted (Railway)

- `deploy/server/start.sh` with `ROLE=api` first runs `server/scripts/bootstrap-fisco.ts`:
  1. It waits up to about 4 min for chain id 20200 (`bootstrap-fisco.ts:19-23`).
  2. It funds `OWNER_PK`, `FACILITATOR_PK`, `FORCE_PK` and, if set, `SENTINEL_PK` through `FUND_URL` (`bootstrap-fisco.ts:25-27`).
  3. On an empty chain it deploys MockEHKD and PocketFactory from `OWNER_PK` and mints HK$10,000 to OWNER (`bootstrap-fisco.ts:35-46`).
- The run must produce the addresses committed in `contracts/deployments/20200.json`, or it throws (`bootstrap-fisco.ts:44-45`).
- If the contracts are missing but OWNER has already sent transactions, it throws, because that chain does not match the deployments file (`bootstrap-fisco.ts:33-34`).
- The same keys on a fresh chain give the same addresses (`bootstrap-fisco.ts:4`).

### 14.3 Funding rules

- The FISCO web3 RPC refuses any sender with zero native balance, even at gas price 0 (`scripts/fisco/setup.sh:5-7`, `server/src/fund.ts:4-8`).
- `fundIfEmpty` credits only addresses whose balance is 0 (`fund.ts:9-12`).
- Without `FUND_URL` it runs `scripts/fisco/fund.sh`. That script calls the console's `addBalance <addr> 1000000` (`scripts/fisco/fund.sh:7`).
- Owner apps get test money from the faucet: `POST /api/faucet` credits native balance plus HK$100 eHKD by default. The dev stack offers `POST /dev/fund`: native balance plus HK$160 eHKD (`devstack/src/stack.ts:121-128`).

### 14.4 `server/.env.example` versus the code

| Line in `.env.example` | Code behaviour |
| --- | --- |
| `AGENT_MODEL=claude-sonnet-5-5` | The code default is `claude-opus-5-5` (`agent/loop.ts:22`). |
| Comment: tx links point at `/api/tx/:hash` | `txUrl` points at `/explorer#/tx/<hash>` (`chains.ts:33`). `/api/tx/:hash` also exists (`index.ts:63`). |
| `SENTINEL_PK` commented out | Without it, the Sentinel holds instead of freezing (`sentinel/index.ts:94-96`). |
| No entries for `FUND_URL`, `FUND_TOKEN`, `FAUCET_AMOUNT`, `APPROVAL_WAIT_MS`, `PREFLIGHT_FROM`, `BRAIN_*`, `RULES_*`, `POCKET_APP_MODEL`, `AGENT_EFFORT`, `RADAR_MAX_HOPS`, `RADAR_TIMEOUT_MS`, `RADAR_MONITOR_MS`, `RADAR_LOG_STEP`, `SENTINEL_AI_TIMEOUT_MS`, `TYPESAFE_URL`, `TYPESAFE_MODEL` | All are optional, with the defaults listed above. |
