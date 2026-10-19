# ChainBrain technical reference

Technical documentation of 链AI脑 ChainBrain for the FinTechathon 2026 submission (International AI Track, Topic F: Agent Wallet). ChainBrain is an agentic wallet that stays safe even when its AI agent is fooled: each agent spends from its own pocket contract on FISCO BCOS, every payment passes checks that do not depend on the model, and the AI monitoring (Radar and the Sentinel) can only make the rules stricter.

Every statement in these documents was checked against the source code on `main` at commit `7b48a2c` (19 Oct 2026) and cites the file and line it comes from. Where the code and older project documents disagree, the documents say so.

## Documents

| # | Document | Read it for |
| --- | --- | --- |
| 01 | [Overview and architecture](01-overview-and-architecture.md) | What ChainBrain is, the core ideas, the system diagram, one payment end to end, the repository, the stack |
| 02 | [Smart contracts](02-smart-contracts.md) | Pocket, PocketFactory, MockEHKD and Clock: every function, rule, reason code, event and test, including the period allowance, per-seller caps and the fuzz and invariant tests |
| 03 | [Wallet server](03-wallet-server.md) | Every HTTP route, event type, tool and reason code; the signing rule; x402 payments; intents; owner co-sign; pre-flight; test sellers |
| 04 | [Agent and AI brain](04-agent-and-ai-brain.md) | The Claude agent loop, its rules, memory, connected agents and models, and why AI only tightens |
| 05 | [Security and monitoring](05-security-and-monitoring.md) | Every protection layer, Radar, the Sentinel, the attack → layer → evidence table, residual risks |
| 06 | [Frontends](06-frontends.md) | The web console, the Expo phone app and the native Android app, screen by screen |
| 07 | [Built-in network](07-built-in-network.md) | The offline simulator both apps run on, and every demo scene |
| 08 | [Chain and deployment](08-chain-and-deployment.md) | FISCO BCOS and Mock e-HKD, funding, the facilitator, hosting, the dev stack, on-chain evidence, the independent verifier |
| 09 | [Testing](09-testing.md) | Every test suite, measured results on `main`, end-to-end checks, gaps |
| 10 | [Configuration](10-configuration.md) | Every environment variable and build property |

## At a glance

| | |
| --- | --- |
| Chain | FISCO BCOS 3.16.4, chain id 20200, gas price 0; payment token Mock e-HKD (demo ERC-20 with EIP-3009, 6 decimals; not the HKMA e-HKD) |
| On-chain rules per pocket | Agent key, seller allowlist, per-payment cap, per-seller caps, period allowance, owner co-sign above a threshold, expiry, revoke, guardian freeze |
| Agent | Claude tool-calling loop with seven wallet tools; never holds a key |
| AI monitoring | Radar screens every seller's money on-chain; the Sentinel watches the agent's behaviour and freezes the pocket on-chain with a freeze-only guardian key |
| Owner apps | Web console (judges and presenter), Expo app (iOS and Android), native Android app |
| Offline mode | The built-in network runs the wallet API, tool layer and pocket rules inside the web console and the Expo app (the native Android app needs a server) |
| Tests | 394 automated tests on `main`: 386 pass, 6 agent-scene tests are skipped in the default run and pass when run on their own, 2 server tests need the local FISCO node ([09](09-testing.md)) |
| Independent check | `verify/verify_pocket.py` reads any pocket's rules from the chain without ChainBrain's code and checks that the pocket came from the ChainBrain factory |

## Naming

The owner apps call a pocket a **card**. The code, contracts and these documents call it a **pocket**. Mock e-HKD amounts are shown as HK$.
