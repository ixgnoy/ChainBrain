# 链AI脑 ChainBrain

**Give your AI a pocket, not your wallet.** A consumer wallet where you open *pockets* for your AI agent. Each pocket holds its own USDC and rules. The agent spends from it on-chain by itself over x402, and a pocket smart contract enforces the rules. Even a hijacked agent can lose at most the pocket's balance, and only to sellers you approved.

FinTechathon 2026, International AI Track, Topic F (Agent Wallet). Base Sepolia testnet.

- Technical document: [`docs/technical-document.md`](docs/technical-document.md)
- Security self-assessment: [`docs/security-self-assessment.md`](docs/security-self-assessment.md)
- On-chain evidence: [`docs/evidence.md`](docs/evidence.md)
- Frontend and dev stack: [`docs/frontend/README.md`](docs/frontend/README.md)
- Product spec: [`docs/02-product/product-design.md`](docs/02-product/product-design.md)

## Repository

| Path | What |
| --- | --- |
| `contracts/` | Pocket (ERC-1271) and PocketFactory, Foundry, fork tests |
| `server/` | Wallet tool layer, Claude agent loop, wallet API (:8787), four x402 test sellers (:4021), scripts |
| `web/` | Network console for the laptop demo and judges: live agent trace beside the active pocket and the sellers' side, all pockets, every tx hash, red-team box. No login ([docs](docs/frontend/web.md)) |
| `mobile/` | Owner app for phones in Expo Go (also `npx expo prebuild` for Android Studio / Xcode) ([docs](docs/frontend/mobile.md)) |
| `shared/sim/` | The built-in network: wallet API, tool layer, scripted agent and the Pocket.sol rules running in-app on a virtual chain, seeded with a lived-in owner. Both apps open on it, so scenes 1-8 work with no server |
| `devstack/` | Real server and contracts on a local Base Sepolia fork with a scripted agent: demo and test both apps with no API key or funds ([README](devstack/README.md)) |
| `android/` | Native Android owner app in Kotlin (Jetpack Compose), opens in Android Studio |

## Try it with nothing running

Both apps open on a **built-in network** on every launch: no server, no keys, no funds, no internet. `shared/sim` runs the wallet API, the tool layer, a scripted agent and the Pocket.sol rules inside the app, seeded with two weeks of activity by three agents (Research data and One purchase held by ChainBrain's agent, Market news by Claude, Trade quotes by ChatGPT; main wallet US$54.80). Claude and ChatGPT are connected agents in the built-in network, using the same wallet tools and pocket rules. Scenes 1-8 below play end to end offline.

It is meant for demos and offline use. Its transaction hashes come from a virtual chain, not a public one, so the apps show them in in-app receipts and sheets and never link them to BaseScan. Explorer links appear only when you connect to a real server on the public chain.

```bash
cd mobile && npm ci && npx expo start     # phone: opens on the built-in network
pnpm --dir web dev                        # console: http://localhost:5173, also on the built-in network
```

To use a real server instead: on the phone, Settings, Advanced, **Custom server** (enter the URL, Test, Connect). On the web, gear button, Settings, **Custom server**. The choice is remembered.

## Prerequisites

Node 24, pnpm (`corepack enable`), [Foundry](https://book.getfoundry.sh/) (`forge`, `anvil`, `cast`). For `android/`: JDK 17 and the Android SDK (Android Studio installs both).

## Setup

```bash
git clone --recurse-submodules <repo> && cd Grabber   # or: git submodule update --init
pnpm i                                   # server + web
cp server/.env.example server/.env       # then add ANTHROPIC_API_KEY
cd server && pnpm wallets                # creates every demo key once, prints addresses to fund
```

**Fund the wallets** on Base Sepolia:
- ETH from the Coinbase CDP faucet to **OWNER** and **FORCE**, plus **FACILITATOR** if you use `FACILITATOR=local`.
- 20 test USDC from https://faucet.circle.com to **OWNER**.

Then import `OWNER_PK` into MetaMask as the demo main wallet.

## Test

```bash
cd contracts && forge test                              # 20 tests on a Base Sepolia fork
cd server && pnpm test && pnpm typecheck                # 37 tests (needs anvil on PATH)
cd server && SCENE_REPLAY=1 pnpm test:scenes            # scenes 1–8 through the agent loop (drop SCENE_REPLAY to use the real model)
cd web && pnpm test && pnpm build
node devstack/e2e/builtin.cjs --url http://localhost:8091   # phone on the built-in network, scenes 1-8, 26 checks, no server needed
cd mobile && npm install && npm test && npm run typecheck && npx expo-doctor
cd android && ./gradlew testDebugUnitTest assembleDebug
```

## Deployment guide

1. **Factory** (once):
   ```bash
   cd contracts && set -a && source ../server/.env && set +a
   forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast
   cast code $(jq -r .PocketFactory deployments/84532.json) --rpc-url base_sepolia | wc -c   # must be > 1000
   ```
   Commit `contracts/deployments/84532.json`. The server reads it, or `FACTORY_ADDRESS` if set.
2. **Live gate:** `cd server && pnpm spike` pays US$0.30 (agent only) and US$1.50 (owner co-signed) from a fresh pocket. If the hosted facilitator refuses, set `FACILITATOR=local`, which runs the same verification code in-process.
3. **Run the stack:** in `server/`, `pnpm sellers` (port 4021) and `pnpm dev` (port 8787). In `web/`, `pnpm dev`, then open http://localhost:5173.
4. **Phone, Expo Go:** `cd mobile && EXPO_PUBLIC_API_URL=http://<laptop LAN IP>:8787 npx expo start`, then scan the QR code. Phone and laptop must share Wi-Fi. The app still opens on the built-in network: turn on Settings, Advanced, **Custom server** and connect to the URL above to use the real server. (`EXPO_PUBLIC_API_URL` is the address the app offers there, and the relay address in the linked setup below.)
5. **Phone, native Android:** open `android/` in Android Studio and run on a device or emulator. The wallet API URL is set on the app's first screen. Use `http://10.0.2.2:8787` from the emulator, or the laptop's LAN IP from a phone. The defaults live in `android/gradle.properties`.
6. **Terminal only:** `pnpm tsx scripts/new-pocket.ts research`, then `pnpm chat <POCKET>`.

**Deployed factory (Base Sepolia):** see `contracts/deployments/84532.json` once step 1 has run.

## Demo scenes

Presenter runbook (phone + console, what to press and what judges see): [docs/06-pitch/demo-runbook.md](docs/06-pitch/demo-runbook.md).

All eight play on the built-in network (offline), on the dev stack, and on the real server.

| # | Scene | Evidence |
| --- | --- | --- |
| 1 | Create and fund the Research pocket, one sentence to an intent card | create + fund tx |
| 2 | Agent buys DataLite's report (US$0.30) | payment tx |
| 3 | DataPro US$1.50 is above ask-me: the owner co-signs on web or phone | co-signed payment tx |
| 4 | Harbour Wines refused (`SELLER_NOT_ALLOWED`), agent re-plans | payment tx |
| 5 | Injection ignored; forced transfer reverts on-chain (`pnpm tsx scripts/force-transfer.ts <pocket>`) | reverted tx |
| 6 | ShadyFeed asks for data and a signature: refused | none |
| 7 | Revoke mid-task, return funds | revoke + withdrawal tx |
| 8 | Dead-end pocket (`new-pocket.ts tight`): agent stops safely | none |

## Third-party licences

- Apache-2.0: x402, web3j, OkHttp, Jetpack Compose and AndroidX
- MIT: OpenZeppelin Contracts, viem, Hono, Expo, React Native, React, Vite, Phosphor Icons
- SIL OFL 1.1: Geist and Geist Mono fonts
