# Real-chain loop log
Last updated: 2026-10-19

> The running log for [realchain-goal.md](../04-build/realchain-goal.md). Each round: research → build → validate → fix → log → commit. Start a new round from the first unchecked item below.

## Work items (brief section 5)

**P0**
- [x] 1. Environment: local FISCO node, `forge build`, server chain tests, FISCO 3.16.4 probe
- [x] 2. Ledger context on the server
- [ ] 3. Visitor accounts
- [ ] 4. Per-card agent keys
- [ ] 5. Signing guard
- [ ] 6. Real by default in both apps
- [ ] 7. Explorer that explains
- [ ] 8. Model flag
- [ ] 9. Attacks on the real chain

**P1**
- [ ] 10. Seller catalogue match
- [ ] 11. Starter seed on chain
- [ ] 12. Persistence
- [ ] 13. Evidence and judge path
- [ ] 14. Routines and auto-play on the real chain

## Acceptance checklist (brief section 7)

- [ ] Fresh browser, web console: sign up → funded → card → chat → x402 pay → attack refused, all decoded in `/explorer`
- [ ] Fresh phone: the same, plus co-sign above ask-me and revoke
- [ ] Two visitors: different owner keys and agent keys, neither can act on the other's card (tested)
- [ ] "Demo network" in Settings shows the sim; off returns to the real chain
- [ ] Model flag: Haiku 5.5 via OpenRouter and one open-source preset work with a key; scripted fallback announced without one
- [ ] Tests: server (chain tests on local FISCO), web, mobile, devstack e2e green; signing-guard refusal tests
- [ ] Log and env-var list complete; every round committed locally

---

## Round 1 · 19 Oct 02:25–03:05 · Item 1, environment

**What changed**
- Built the local chain with `scripts/fisco/setup.sh` (FISCO 3.16.4 Air, 1 node, web3 RPC on `127.0.0.1:8545`, governor `0xf737…4c25`).
  - The first attempt failed silently: a stray `anvil --chain-id 20200 --port 8545`, left by the idle "Competitor research" session, held the port, so FISCO's web3 RPC could not bind (`[HTTP][SERVER][bind] Address already in use`) and the node stopped. I stopped the anvil and rebuilt.
- `scripts/fisco/env.sh`: falls back to Homebrew's keg-only `openjdk@17` when `/usr/libexec/java_home` finds no JDK. Without it, `fund.sh` (the FISCO console is Java) failed and took the devstack tests down with it.
- New `server/scripts/probe-fisco.ts`: a repeatable probe of the node quirks below. Read-only probes run on any node; write probes need a funded `PROBE_PK`. Optional native-receipt probe with `FISCO_NATIVE_RPC` and the SDK certs.

**Evidence (all on the local node)**
- `forge build` ok; `forge test` 55 passed.
- `pnpm --dir server typecheck` clean; `pnpm --dir server test` **82 passed, 6 skipped** (16 files, chain tests on local FISCO, 48 s).
- `pnpm --dir web test` 83 passed. `cd mobile && npm test` 53 passed. `pnpm --dir devstack test` 21 passed.

**FISCO 3.16.4 findings** (local node, macOS build; hosted node, Linux build, read-only)

| Question | Answer | What it means for us |
| --- | --- | --- |
| Does a block seal with no transaction? | **No.** Local stayed at block 83 for 6 s; hosted stayed at 19, head 3,098 s old | Blocks are sparse. Item 2 needs `now() = max(head, wall clock)` and a zero-value liveness tick before time-sensitive simulations |
| Which clock does `eth_call` see? | **The head block's**, in **milliseconds**, frozen between calls (`1792348674084` twice, 3 s apart). The RPC reports block timestamps in **seconds** | A simulation of expiry or `canPay` on a quiet chain runs on stale time. Send the liveness tick first if the head is older than ~30 s |
| Do `eth_call` block tags pick historical state? | **No, ignored.** Balance "at block 83" read the post-mint value | Revert replays run on latest state: label them "replayed (latest state)" |
| Revert data from `eth_call`? | **Yes.** Error code `16`, `data` = ABI custom error, decodes to `ERC20InsufficientBalance(…)` | The ledger module can turn a simulation failure into a typed `RevertError` with our ABIs |
| Reverting transaction sent raw (fixed gas)? | **Mined** with `status 0x0` (gas used `0x5d6c`); the web3 receipt has **no revert data** | "Straight to the chain" gets a real revert hash. The reason must come from a replay or the native receipt |
| Native receipt (`getTransactionReceipt` over mutual TLS on `:20200`) | **Carries it:** `status 16`, `output` = the exact custom error | Exact reason, but only with the SDK certs. Hosted: the gateway runs next to the node and can expose it (see brief item 7 update) |
| `eth_getLogs` filter shape | Needs **both** `address` and `topics` (`address is null` / `topics is null` otherwise). `topics: []` works | viem's `getLogs` with an `event` always sends topics; raw callers must too |
| `eth_getLogs` range | **Local: silently truncated to 10 blocks from `fromBlock`** (from 75 → only blocks 75–84; from 79 → 79–88; wider ranges return *fewer* logs, never an error). Hosted: a 19-block range came back whole | `loadPockets`' 20k-block window cannot be trusted. Scan in ≤10-block chunks, or index once on the server (brief items 2 and 7) |
| Nonces | **A set, not a sequence.** Any nonce above the highest used is accepted (count+500 ok, a gap is fine); at or below it → `NonceCheckFail` (viem shows "An internal error was received") | One sender, one transaction at a time; local nonce = `max(count, last+1)`; on `NonceCheckFail` bump and retry |
| `eth_getTransactionCount` | Exact after one transaction per block. **Drifts when one block holds several transactions from the same sender:** 73 → 77 (expected 76), 77 → 82 (expected 80); once it returned a nonce already used | Same as above: never trust the count alone after a burst |
| Several transactions in flight from one sender | Usually all accepted; once 2 of 3 (the third refused) | The serial queue per sender stays |
| Missing methods | `eth_feeHistory` is missing on the bare node (the hosted gateway answers it); `eth_gasPrice`, `eth_maxPriorityFeePerGas`, `eth_estimateGas` answer | Send legacy transactions with `gasPrice 0`, never EIP-1559 |

**Hosted chain note.** The hosted node is at **block 19** (factory logs at blocks 9 and 14), so it was reset since the evidence file was made. Old hashes in `docs/evidence-fisco-railway.json` will not resolve; item 13 regenerates it. `/api/config` on the hosted API still hands out the single shared agent `0xB010…acCf`.

**Plan updates** (made in the brief, section 5):
- Item 2 also owns a chunked log scanner (≤10 blocks per call) for the server.
- Item 7: revert reasons come from the native receipt where the node is local (the hosted gateway gains a read-only `chainbrain_getRevertData` that calls the node's native RPC inside the container), else from an `eth_call` replay labelled "replayed (latest state)".

**Next:** item 2, the ledger context.

## Round 2 · 19 Oct 03:05–03:50 · Item 2, ledger context

**What changed**
- New `server/src/ledger.ts`, the one path for server-sent transactions:
  - `write(pk, call, {fresh})`: simulate → send (legacy, gas price 0) → wait. It throws `RevertError` with `source: "simulate"` before sending, or with a hash and `source: "native" | "replay"` if a transaction was mined and reverted.
  - `sendRaw(pk, {to, data})`: no simulation, never throws on a revert. It returns the hash, the receipt and the decoded reason (for the arena's "straight to the chain", item 9).
  - Per-sender serial queue. `withNonce`: nonce = `max(count, last + 1)`, and on `NonceCheckFail` it moves past the refused nonce and retries (up to 6 times).
  - `decodeRevert` against the Pocket, factory and Mock e-HKD error ABIs plus `Error(string)` / `Panic`. `revertDataOf` walks viem's error chain.
  - `revertOf(hash)`: the native receipt when `FISCO_NATIVE_RPC` (+ `FISCO_SDK_DIR`) or `FISCO_REVERT_RPC` is set, else an `eth_call` replay labelled `replay`.
  - `now()` = max(head, wall clock), in seconds. `freshHead(maxAgeSec = 30)`: a coalesced zero-value self-transfer from `TICK_PK` (default `FACILITATOR_PK`) when the head is stale.
  - `scanLogs`: `getLogs` in `FISCO_LOG_STEP` (default 10) block chunks, 8 calls in flight. `queuedSigner(pk)`: an x402 facilitator signer whose writes use the queue.
- Wired in:
  - the faucet mint (dropped its own queue);
  - the Sentinel's `freeze`;
  - the x402 facilitator (every visitor's settlement shares `FACILITATOR_PK`, so the queue matters there);
  - Radar's transfer index now walks in 10-block steps (it used 200, which the local node silently truncated);
  - `settle()` ticks the head first, because `canPay` reads expiry at the head block's time.
- `THIRD_PARTY.md` (new): Apache-2.0 credit to YINGLONG for the `LedgerContext` / native-receipt ideas.

**Evidence**
- `server/test/ledger-chain.test.ts`, 7 tests on local FISCO:
  - write + receipt;
  - a would-revert call refused before sending (nonce unchanged, `ERC20InsufficientBalance`);
  - a raw reverting send gives a hash with status `reverted`, decoded by replay and then by the native receipt (`source: "native"`);
  - 6 parallel writes from one sender all land;
  - `NonceCheckFail` retry 7 → 8 → 9, then the next send starts at 10 even with a lagging count;
  - a stale head ticks once for two concurrent callers, and the block number rises;
  - `scanLogs` finds all 14 mints across 14 blocks.
- `pnpm --dir server typecheck` clean; `pnpm --dir server test` **89 passed, 6 skipped** (18 files). `pnpm --dir devstack test` 21 passed (its scenes pay through the queued facilitator).
- Not run this round: the Playwright e2e (no UI change). It runs in item 6, where it is extended.

**Found for later**
- The web console's `loadPockets` / `loadHistory` (`web/src/console/chain.ts`) read 20k-block `getLogs` windows. On a node that truncates, they miss pockets. Fix in item 6/7: read through the server (indexed with `scanLogs`) or chunk on the client.

**Next:** item 3, visitor accounts.
