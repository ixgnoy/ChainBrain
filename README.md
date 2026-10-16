# 链AI脑 ChainBrain

**Give your AI a pocket, not your wallet.** A consumer wallet where you open *pockets* for your AI agent. Each pocket holds its own USDC and rules. The agent spends from it on-chain by itself over x402, and a pocket smart contract enforces the rules. Even a hijacked agent can lose at most the pocket's balance, and only to sellers you approved.

Inside the pocket, an **AI brain** does the work: it understands the task, shops and pays, re-plans after a refusal, resists injection and phishing, screens every seller's money (Radar), watches itself and can freeze the pocket on-chain (Sentinel), remembers, turns spoken rules into pocket rules, predicts every payment before sending it (Pre-flight) and negotiates the price with numbers only (the haggler). AI only tightens: nothing it says can loosen a pocket. See [`docs/ai-brain.md`](docs/ai-brain.md).

FinTechathon 2026, International AI Track, Topic F (Agent Wallet). Base Sepolia testnet.

- Technical document: [`docs/technical-document.md`](docs/technical-document.md)
- AI brain (ten features): [`docs/ai-brain.md`](docs/ai-brain.md)
- Security self-assessment: [`docs/security-self-assessment.md`](docs/security-self-assessment.md)
- On-chain evidence: [`docs/evidence.md`](docs/evidence.md)
- Frontend and dev stack: [`docs/08-frontend/README.md`](docs/08-frontend/README.md)
- Product spec: [`docs/02-product/product-design.md`](docs/02-product/product-design.md)

## Repository

| Path | What |
| --- | --- |
| `contracts/` | Pocket (ERC-1271) and PocketFactory, Foundry, fork tests |
| `server/` | Wallet tool layer, Claude agent loop, wallet API (:8787), four x402 test sellers (:4021), scripts |
| `web/` | Network console for the laptop demo and judges: live agent trace beside the active pocket and the sellers' side, all pockets, every tx hash, red-team box. No login ([docs](docs/08-frontend/web.md)) |
| `mobile/` | Owner app for phones in Expo Go (also `npx expo prebuild` for Android Studio / Xcode) ([docs](docs/08-frontend/mobile.md)) |
| `shared/sim/` | The built-in network: wallet API, tool layer, scripted agent and the Pocket.sol rules running in-app on a virtual chain, seeded with a lived-in owner. Both apps open on it, so scenes 1-8 work with no server |
| `devstack/` | Real server and contracts on a local Base Sepolia fork with a scripted agent: demo and test both apps with no API key or funds ([README](devstack/README.md)) |
| `android/` | Native Android owner app in Kotlin (Jetpack Compose), opens in Android Studio |

## Try it with nothing running

Both apps open on a **built-in network** on every launch: no server, no keys, no funds, no internet. `shared/sim` runs the wallet API, the tool layer, a scripted agent and the Pocket.sol rules inside the app, seeded with two weeks of activity by three agents (Research data and One purchase held by ChainBrain's agent, Market news by Claude, Trade quotes by ChatGPT; main wallet US$54.80). Claude and ChatGPT are connected agents in the built-in network, using the same wallet tools and pocket rules. Scenes 1-11 below play end to end offline.

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
cd contracts && forge test                              # 24 tests on a Base Sepolia fork
cd server && pnpm test && pnpm typecheck                # 76 tests + 6 skipped without keys (needs anvil on PATH and forge build)
cd server && SCENE_REPLAY=1 pnpm test:scenes            # scenes 1–8 through the agent loop (drop SCENE_REPLAY to use the real model)
cd web && pnpm test && pnpm build                       # 81 tests
cd mobile && node --import tsx --test ../shared/sim/*.test.ts   # built-in network, scenes 1-11, 40 tests
node devstack/e2e/builtin.cjs --url http://localhost:8091   # phone on the built-in network, no server needed
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

Scenes 1-8 play on the built-in network (offline), on the dev stack, and on the real server. Scenes 9-11 (the AI brain's Radar, Sentinel and haggler) play on the built-in network; on the server they are covered by tests (Radar, Sentinel freeze on the anvil fork, `haggle-fork.test.ts`), and the dev stack's scripted model does not script them yet. The table uses the built-in network's sellers: Exa, CoinGecko and Nansen are real x402 providers at their published prices; TradeWire, DataPro, Harbour Wines and ShadyFeed are fictional on purpose. The server's four test sellers (`server/src/sellers.json`) play the same roles with DataLite in place of Exa and CoinGecko, and DataPro (US$1.50) as the co-sign in scene 3.

| # | Scene | Evidence |
| --- | --- | --- |
| 1 | Create and fund the Research pocket; one sentence, one question, an intent card from the fixed template | create + fund tx |
| 2 | Exa (US$0.007) and CoinGecko (US$0.01) paid by the agent alone | payment tx |
| 3 | Nansen's US$0.05 check is above ask-me: the owner co-signs on the phone or web | co-signed payment tx |
| 4 | Harbour Wines refused (`SELLER_NOT_ALLOWED`), agent re-plans to Exa | payment tx |
| 5 | Injection in ShadyFeed ignored; forced transfer reverts on-chain (`pnpm tsx scripts/force-transfer.ts <pocket>`) | reverted tx |
| 6 | ShadyFeed asks for data and a signature: refused | none |
| 7 | Revoke mid-task, return funds | revoke + withdrawal tx |
| 8 | Dead-end pocket (`new-pocket.ts tight`): agent stops safely, one-tap fix | none |
| 9 | Radar: a drainer pays TradeWire; Radar scores it 9/10, the agent buys from Nansen instead and past payers get an alert | drainer tx |
| 10 | Sentinel: a fooled agent keeps trying Harbour Wines; after 3 refusals in a minute the pocket is frozen on-chain | freeze tx |
| 11 | Haggler: DataPro US$1.50 negotiated to US$1.10 with numbers only (3 offers at most); the owner co-signs the agreed price | co-signed payment tx |
| 12 | Routine pocket app: one sentence makes a research desk with a routine (every morning, max US$0.05 a week); two runs pay on their own, a seller's attempt to rewrite the routine is ignored, the third run past the allowance comes to the owner as a cheque | co-signed payment tx |

## Third-party licences

- Apache-2.0: x402, web3j, OkHttp, Jetpack Compose and AndroidX
- MIT: OpenZeppelin Contracts, viem, Hono, Expo, React Native, React, Vite, Phosphor Icons
- SIL OFL 1.1: Geist and Geist Mono fonts
- ITF Free Font License: Clash Display and General Sans (Fontshare), fetched at install, never redistributed
- MIT: Lucide icons, React Native Reanimated, React Native SVG, zod (server)
- Ideas only, no code copied (pocket apps, 17 Oct): vercel-labs/json-render and a2ui-project/a2ui (Apache-2.0), CopilotKit and ag-ui-protocol/ag-ui (MIT), thesysdev/openui (MIT), MetaMask/delegation-framework's period enforcer semantics (MIT and Apache-2.0), google-agentic-commerce/AP2's IntentMandate vocabulary (Apache-2.0). See `docs/04-build/licences-and-reuse.md`
- Brand marks: Claude, OpenAI, Exa, CoinGecko and Nansen marks are shown unaltered at avatar size, per `shared/brand/SOURCES.md`
