# 09. Testing

ChainBrain has 394 automated tests across contracts (including fuzz and invariant tests), server, built-in network, web console, Expo app, native Android app and the independent Python verifier, 21 more in the dev stack, and two browser end-to-end scripts. The numbers below were produced by running each suite on `main` (commit `7b48a2c`) on 19 Oct 2026, on Windows 11 with Node 24, Foundry, Python 3.12 and a local EVM node. Two server tests need the local FISCO BCOS node's funding script and fail without it; every other suite passes.

## 1. Results on `main`

| Suite | Command | Result | Needs |
| --- | --- | --- | --- |
| Contracts | `cd contracts && forge test` | 79 passed, 0 failed: MockEHKD 7, `PocketEhkdTest` 33, `PocketEhkdMsClockTest` 33, fuzz 5, invariant suite 1 (Foundry counts the suite as 1 test; it holds 6 invariants, so 84 checks; 128,000 random calls) | Foundry |
| Independent verifier | `python -m unittest verify/test_verify.py` | 16 passed, 0 failed | Python 3, standard library only |
| Server | `cd server && pnpm test` | 82 passed, 6 skipped, 2 failed (90) | a chain on :8545 with chain id 20200, `forge build` |
| Server typecheck | `cd server && pnpm typecheck` | clean | |
| Agent scenes (replay) | `cd server && SCENES=1 SCENE_REPLAY=1 npx vitest run test/scenes.test.ts` | 6 passed | a chain on :8545 |
| Built-in network | `cd mobile && node --import tsx --test ../shared/sim/*.test.ts` | 67 passed, 0 failed | nothing |
| Web console | `cd web && pnpm test && pnpm build` | 83 passed (17 files), 0 failed; build clean | nothing |
| Expo app | `cd mobile && npm test && npm run typecheck` | 53 passed, 0 failed; typecheck clean (typecheck from the previous run; not repeated on `7b48a2c`) | nothing |
| Native Android | `cd android && ./gradlew testDebugUnitTest assembleDebug` | 6 passed, 0 failed; APK builds | JDK 17, Android SDK |
| Dev stack | `cd devstack && pnpm test` | not run for this table (needs the FISCO node) | FISCO node |

- The 6 skipped server tests are the agent scenes in `scenes.test.ts`; they run only with `SCENES=1` (row above). The package script `pnpm test:scenes` sets `SCENES=1` in POSIX form, so it fails in Windows `cmd` ("'SCENES' is not recognized"). The run above set the variables in the shell and called vitest directly.
- The 2 failing server tests (`faucet.test.ts`, `radar-chain.test.ts`) credit a native balance through `scripts/fisco/fund.sh`, which drives the local FISCO node's console (`server/src/fund.ts:14`). They need that node. On Windows they also fail earlier: `fund.ts` passes `URL.pathname` (`/C:/…`) to `bash`, which cannot open that path; `fileURLToPath` would fix it.
- The server run above used a local EVM node (anvil) started with chain id 20200 and a zero base fee, as FISCO uses gas price 0.
- Web console: one of four runs had 1 failing test that passed on the three reruns. That run shared the machine with other suites; the failure is intermittent and was not reproduced.

## 2. Contracts (`contracts/test`)

| File | Tests | Covers |
| --- | --- | --- |
| `MockEHKD.t.sol` (`MockEHKDTest`) | 7 | The Mock e-HKD token: metadata, owner-only minting, EOA authorisations (bytes and v/r/s, including FISCO account code), replay, wrong signer and expiry reverts, contract payers via ERC-1271, cancelling an authorisation. |
| `PocketCases.sol` | 33 cases | Every pocket rule: agent-only payments, allowlist, cap, owner co-sign above ask-me, foreign co-sign refused, injected recipient, wrong key, revoked, expired, replay, permit and other digests rejected, owner-only edits, return funds, guardian freeze and owner unfreeze, the period allowance, the spend hook's gas (a starved payment reverts, enough gas settles and counts, `onSpend`'s worst case stays under 80,000 of the 100,000 gas it gets) and per-seller caps (including that lowering the pocket cap does not restrict a seller with its own cap). |
| `Pocket.ehkd.t.sol` (`PocketEhkdTest`, `PocketEhkdMsClockTest`) | 33 + 33 | Runs the 33 cases on Mock e-HKD twice: with a seconds clock and with a millisecond clock (FISCO's). |
| `PocketInvariant.t.sol` (`PocketFuzzTest`) | 5 | Fuzz tests: no payment above the cap, none to a seller not allowed, above ask-me needs the owner, the period cap holds for the agent alone, only the owner moves funds or edits rules. |
| `PocketInvariant.t.sol` (`PocketInvariantTest`) | 1 suite, 6 invariants | A handler calls `pay`, `freeze`, `unfreeze` and `wait` at random (256 runs, 128,000 calls, 0 reverts with Foundry's default settings): money is conserved, no payment to a seller not allowed, none above the cap or the ask-me threshold without the owner, the period allowance holds for the agent alone, nothing settles while frozen, the guardian never holds funds. `afterInvariant` checks that runs really paid something. |

## 3. Server (`server/test`)

| File | Tests | Covers |
| --- | --- | --- |
| `allowance-chain.test.ts` | 2 | On the chain: the first report pays, the second is `OVER_PERIOD` for the agent alone and settles with the owner's co-signature; a per-seller cap overrides the pocket cap for that seller only. |
| `agent.test.ts` | 7 | Agent loop: tool results fed back, model error mid-task stops without re-paying, max steps, a throwing tool becomes an error result, refusal stop, tool schemas, memory placement. |
| `api.test.ts` | 3 | `events.json` per pocket, unknown approvals return 404, chat history trimming and memory reflection, forget. |
| `faucet.test.ts` | 2 | Faucet credits native balance and HK$100 once per address per day; rejects bad addresses. |
| `haggle-chain.test.ts` | 1 | The haggler negotiates DataPro down; the pocket settles exactly the agreed price over x402, co-signed. |
| `intent.test.ts` | 5 | Money parsing, fixed intent template, intent checks (price, total, items, deadline, unconfirmed), untrusted wrapper resists a forged closing tag, request scan. |
| `memory.test.ts` | 15 | Memory adds only cited items, drops invented ones, can only narrow, caps size and evicts least-used, keeps one snapshot plus an audit log. |
| `pay.test.ts` | 8 | x402 settlement: agent-only payment, owner co-sign, foreign co-sign refused on-chain, double pay settles once, changed 402 refused, non-allowlisted refused, expired approval refused. |
| `pocket-app.test.ts` | 4 | Routine pocket app spec validation; seller text cannot reach a spec; fallback picker. |
| `preflight-chain.test.ts` | 1 | Pre-flight predicts each payment with `eth_call` and every prediction matches the result. |
| `radar.test.ts` | 8 | Radar exposure tracing (proportional, hop limit, cycles, outflows, failed lookups), rule scoring, labels never downgrade. |
| `radar-chain.test.ts` | 2 | Radar on the chain: after a labelled drainer pays DataPro, paying DataPro is refused; planting a benign label is rejected. |
| `rules.test.ts` | 2 | "Speak your rules": two readings, the stricter wins, proof card computed; fixed parser without a model. |
| `scenes.test.ts` | 6 | Demo scenes 1–8 through the agent loop (replayed model). |
| `sellers.test.ts` | 7 | Test sellers: 402 prices, free preview with injection, red-team injection box, 404s, haggling. |
| `sentinel.test.ts` | 6 | Sentinel rules and gate (3 probes freeze, AI can only raise), on-chain freeze, no-AI and no-guardian fallbacks, Jev adapter. |
| `sentinel-chain.test.ts` | 1 | Guardian key freezes a pocket on-chain after three out-of-rule payments; owner unfreezes. |
| `tools.test.ts` | 10 | Tool layer end to end on a local stack: intent required, rules visible but not the owner, payments, co-sign, non-owner approval rejected, refusals, wrapped content. |

## 4. Built-in network (`shared/sim`)

| File | Tests | Covers |
| --- | --- | --- |
| `world.test.ts` | 26 | Every demo scene on the virtual chain: questions, intents, payments, co-sign checks, refusals and re-plans, injection, disclosure refusal, forced transfer revert, revoke, dead end, event ordering. |
| `pocketApp.test.ts` | 23 | Routine pocket apps: spec validation, plain labels, picker, seller text isolation, weekly periods in Hong Kong time, stricter-wins, routine runs, week digest, routine edits keeping spend so far, routines running under the pocket's on-chain allowance (a week-to-day edit resets the count; a schedule-only edit writes nothing on-chain), spec stream replay, usage chip. |
| `proof.test.ts` | 10 | Judges' attack proofs (privilege escalation, data extraction, induced transfer), gate order, dead-end fix, scorecard, explorer logs. |
| `speak.test.ts` | 6 | "Speak your rules" parser: whole-word sellers, ambiguous amounts become questions, stricter reading wins, proof card. |
| `protect.test.ts` | 2 | The four protection layers and their wording. |

## 5. Apps

- **Web console** (`web/src/**/*.test.ts`, 17 files, 83 tests): routing, Live and arena rules, checks path, proof scope, story and auto-play, event merging, trace rendering, seller data, linked phone feed, snapshot cache, data sources.
- **Expo app** (`mobile/src/lib/*.test.ts`, 14 files, 53 tests): event stream merging and its quirks, intent rendering, plain-language reason codes, Brain derivations, auto-play, chain reads, tokens and utilities.
- **Native Android** (`android/app/src/test/.../LogicTest.kt`, 6 tests): EIP-712 digest and signature byte-identical to viem on FISCO, owner co-sign bound to the exact payment, presets, money and status helpers, latest approval status, refusal reasons.

## 6. End-to-end checks

| Script | What it does |
| --- | --- |
| `devstack/e2e/builtin.cjs` | Drives the phone app's web build on the built-in network (scenes 1–8 and the pocket apps, including scene 12) with Playwright; no server needed. |
| `devstack/e2e/e2e.cjs` | Drives the phone app's web export and the web console against a running dev stack (real server and contracts on the FISCO node). |
| `devstack/test/devstack.test.ts`, `relay.test.ts` | Dev routes (`/dev/health`, `/dev/rpc`, `/dev/fund`, `/dev/scenes`), pocket creation through the proxy, scenes through `/api/chat`, the phone-to-console relay. |
| `verify/verify_pocket.py` | Reads a pocket's rules from the chain with its own Keccak and ABI code (no shared code, read-only), checks that the pocket came from the ChainBrain factory and uses its token, states the rules in plain English and diffs them against what the owner approved; exit code 0 match, 1 mismatch, 2 error. Its 16 tests cover hash vectors, formatting, period text, FISCO precompile code, reading, matches, mismatches, older contracts, exit codes, provenance (a lookalike contract and a token mismatch fail), a failed log read on a current pocket, missing getters and unexpected errors. |
| `server/scripts/verify-evidence.ts` | Re-fetches every transaction hash in `docs/evidence-fisco.json` (or another evidence file) from the chain. |

## 7. Device testing and a known issue

- The native Android app was run on a physical Xiaomi Poco X3 Pro (Android 11, API 30).
- On `main`, the wallet home screen crashes on Android 9–12: `Money.kt` uses `BigInteger.TWO`, which Android only provides from API 33, while `minSdk` is 28. The one-line fix is in pull request #15 (`fix/android-biginteger-two`). With that change the home screen loads on the test phone.
- The unit tests do not catch this, because they run on the desktop JVM, where `BigInteger.TWO` exists.

## 8. Gaps

- No test checks that a non-owner cannot call `setExpiresAt` or `revoke` (the owner-only fuzz test covers the other seven edits); `setExpiresAt` is only used as owner setup.
- No test reads `POCKET_EXPIRED` from `canPay` directly (expiry is covered as a refused payment, `test_expired_reverts`).
- No contract test asserts emitted events (`expectEmit` is not used).
- No test covers the Sentinel's `INJECTION_FOLLOW_THROUGH` rule.
- iOS is built (`npx expo export -p ios`) but not tested on a device.
