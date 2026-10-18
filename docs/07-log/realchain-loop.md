# Real-chain loop log
Last updated: 2026-10-19

> The running log for [realchain-goal.md](../04-build/realchain-goal.md). Each round: research → build → validate → fix → log → commit. Start a new round from the first unchecked item below.

## Work items (brief section 5)

**P0**
- [x] 1. Environment: local FISCO node, `forge build`, server chain tests, FISCO 3.16.4 probe
- [x] 2. Ledger context on the server
- [x] 3. Visitor accounts
- [x] 4. Per-card agent keys
- [x] 5. Signing guard
- [x] 6. Real by default in both apps
- [x] 7. Explorer that explains
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
- [x] Two visitors: different owner keys and agent keys, neither can act on the other's card (tested): `visitors-chain.test.ts` (NOT_YOUR_CARD), `agent-keys-chain.test.ts` (own derived agents; borrowing refused NOT_THIS_AGENT)
- [x] "Demo network" in Settings shows the sim; off returns to the real chain: phone e2e (on → the simulation's cards; off → signed in on the chain, nothing lingers); console e2e (`?server=builtin` / Settings switch)
- [ ] Model flag: Haiku 5.5 via OpenRouter and one open-source preset work with a key; scripted fallback announced without one
- [ ] Tests: server (chain tests on local FISCO), web, mobile, devstack e2e green; signing-guard refusal tests
- [ ] Log and env-var list complete; every round committed locally

---

## Round 1 · 19 Oct 02:25–02:42 · Item 1, environment

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

## Round 2 · 19 Oct 02:42–02:48 · Item 2, ledger context

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

## Round 3 · 19 Oct 02:48–02:54 · Item 3, visitor accounts

**What changed**
- `shared/chain/login.ts` (new, no imports): the EIP-712 `Login {statement, owner, nonce, issuedAt}` typed data under domain `ChainBrain / 1 / 20200`, the statement ("…moves no money and approves no payment") and the `x-visitor-token` header name. The server, the web console and the phone all use it.
- `server/src/visitors.ts` (new):
  - `POST /v1/challenge {owner}` → a single-use 32-byte nonce (5 minutes).
  - `POST /v1/visitors {owner, nonce, issuedAt, signature}` → creates the visitor once (id `v-` + 16 hex of `keccak(owner)`), funds the native balance (`fundIfEmpty`) and mints `VISITOR_STARTER` (default HK$500) through the ledger, then returns a token. 201 on create, 200 after. A failed funding is kept and retried on the next sign-up. A per-visitor in-flight promise stops a double mint.
  - `POST /v1/login` (same body) for an existing visitor. `GET /v1/me`.
  - Tokens: 32 random bytes; only `keccak256(token)` is stored, 7-day expiry, at most 5 per visitor.
  - `guard(c, pocket?)`: a valid token, and for a card that `Pocket.owner()` (read on chain, cached) is the visitor's key. Errors are `VISITOR_TOKEN_REQUIRED` 401, `NOT_YOUR_CARD` 403 and `BAD_POCKET` 400.
- **Deviation from the brief, on purpose:** sign-up also needs the Login signature, not just `{owner}`. Otherwise anyone could fund arbitrary addresses and use up the hourly sign-up cap. It is the same one signature the client makes for login.
- Guarded routes:
  - token + card owner: `POST /api/chat`, `POST /api/approvals/:id` (payment co-signs, intent confirmations, questions, declines), `POST /api/memory/forget`;
  - token only (model calls or mutations without a card): `/api/rules/compile`, `/api/pocket-app/compose`, `/api/radar/ask`, `/api/radar/alerts/:id/close`.
  - Reads (events, pending, memory, config, explorer) stay open.
- `server/src/limits.ts` (new): per-IP sliding windows on `/api/*` and `/v1/*`: writes `RATE_LIMIT_PER_MIN` (60), reads `RATE_LIMIT_GET_PER_MIN` (600); SSE is not counted. Global `VISITORS_PER_HOUR` (60).
- `server/src/store.ts` (new): a JSON-file table in `DATA_DIR` (default `server/.data/`, gitignored; `memory` for tests) with debounced atomic writes. Visitors use it now; item 12 reuses it.
- CORS allows the `x-visitor-token` header.
- **Transition switch:** `VISITOR_AUTH=off` turns the guard off. The server test config and the dev stack set it until the apps sign in (item 6); its default is on. **Don't deploy until item 6 lands**, or the hosted console's chat and Radar ask will get 401s.

**Evidence** (`server/test/visitors-chain.test.ts`, 5 tests on local FISCO)
- Sign-up returns 201 with `funding.mintTx` (receipt `success`), HK$500.00 on chain, native balance > 0 and an explorer link.
- A repeat sign-up returns 200, `created: false`, no second mint and a new token. `/v1/me` works with the token and gives 401 without.
- A replayed nonce gives `CHALLENGE_EXPIRED`, a signature from another key `BAD_SIGNATURE`, an unknown visitor's login 404, and a garbage signature 401.
- Alice's card (created by Alice's own key through the factory):
  - chat gives 401 with no token, `NOT_YOUR_CARD` with Bob's token and 200 with Alice's;
  - memory-forget gives 403 for Bob and 404 for Alice (past the guard);
  - rules compile and Radar ask give 401 without a token.
- `VISITORS_PER_HOUR=0` gives `SIGNUPS_FULL` for a new key, but Alice still signs in. At 3 writes per minute the 4th from an IP gets 429 and another IP gets 200.
- Full server suite **94 passed, 6 skipped** (19 files); devstack 21 passed.

**Next:** item 4, per-card agent keys.

## Round 4 · 19 Oct 02:54–02:59 · Item 4, per-card agent keys

**What changed**
- `server/src/agentKeys.ts` (new):
  - `deriveAgentKey(master, cardId) = keccak256(master ‖ cardId) mod n`, with `cardId = "<visitorId>#<n>"`. Keys are derived on use; only `agent address → cardId` is stored (table `agent-cards`).
  - `POST /v1/cards/agent` (visitor token required, even with `VISITOR_AUTH=off`) → `{cardId, agent}`. The device puts `agent` in `factory.create`. It returns 503 `PER_CARD_KEYS_OFF` without `AGENT_MASTER_KEY`.
  - `agentKeyFor(agent, owner)`:
    - the legacy `AGENT_PK` if it matches (old and evidence pockets, the dev stack);
    - else the derived key, **only if that agent was issued to the card owner's own visitor**;
    - if the table has lost the entry, it searches the owner's first 64 card ids and re-records the match.
  - A malformed master key warns once and turns per-card keys off.
- `settle()` and `preflight()` sign with the card's own key (`agentFor(info)`). `NOT_THIS_AGENT` now means "no key this server can derive for this card and owner".
- Explorer labels derived agents "Agent key, card v-…#n"; the old one is "Agent key (shared, legacy)".
- `/api/config` still returns the legacy `agent`, used by the dev stack and the apps until item 6 moves them to `/v1/cards/agent`.
- Dev master key added to both `DEV_KEYS` lists (local chains only).

**Evidence** (`server/test/agent-keys-chain.test.ts`, 5 tests on local FISCO)
- Derivation is deterministic, differs per card id and per master, and stays inside the curve order.
- Alice gets `…#0` then `…#1`; Bob gets his own. All three agents differ, and none is the legacy key. No token gives 401; no master key gives 503.
- Alice's card (created and funded by Alice's own key, naming her derived agent) pays DataLite through real x402 settlement (receipt `success`).
- Bob's card naming Alice's agent gives `NOT_THIS_AGENT`.
- After `resetAgentKeys()` (table lost), Bob's card still pays (rebuilt from his visitor id).
- Full server suite **99 passed, 6 skipped** (20 files); devstack 21 passed.

**Next:** item 5, the signing guard.

## Round 5 · 19 Oct 02:59–03:03 · Item 5, signing guard

**What changed**
- `shared/chain/guard.ts` (new, no imports beyond `login.ts`; each app passes its own viem `decodeFunctionData`):
  - `checkTx` allows only:
    - `PocketFactory.create`;
    - a Mock e-HKD `transfer` to one of the owner's own cards;
    - the Pocket owner methods `revoke`, `returnFunds`, `unfreeze`, `setCap`, `setAskAbove`, `setSeller` and `setExpiresAt`, on the owner's own card.
    - Refusals: `UNDECODABLE`, `UNKNOWN_CONTRACT`, `METHOD_NOT_ALLOWED` (e.g. `approve`, `freeze`), `NOT_YOUR_CARD`, `SENDS_VALUE`.
  - `checkTypedData` allows only:
    - `Login` (ChainBrain domain, this owner, the exact statement);
    - `TransferWithAuthorization` that equals the pending approval field for field, on the HK$ token and chain 20200, from the owner's card.
    - Refusals: `WRONG_CHAIN`, `NOT_A_PENDING_APPROVAL`, `UNKNOWN_MESSAGE` (e.g. a `Permit`), `NOT_YOU`.
  - Every verdict carries a plain HK$ sentence, e.g. "Approve one payment of HK$12.50 from card 0x0000…0a1d to DataLite, valid until 2030-03-17 17:46 UTC."
- Phone (`mobile/src/lib/wallet.ts`):
  - every real-chain owner `write` is encoded and checked before signing, and throws `GuardRefused` on a no;
  - `signTransfer(auth, pending)` now needs the approval it answers; `explainCosign(auth)` gives the sentence.
  - The card-owner check is a chain read of `Pocket.owner()`, cached.
  - The guard context can be injected for tests.
- Approval sheet: on the real chain it shows "Your key signs: …" under the wallet checks, or "Won't sign: …" in vermillion, plus a `GUARD_REFUSED` error message.
- The web console doesn't sign yet. It will use the same guard when it gets an owner key (item 6).

**Evidence**
- `mobile/src/lib/guard.test.ts`, 8 tests:
  - create with its sentence;
  - fund your own card only (another card → `NOT_YOUR_CARD`; `approve` → `METHOD_NOT_ALLOWED`);
  - all 7 owner controls with their sentences, while `revoke` on someone else's card → `UNKNOWN_CONTRACT` and `freeze` → `METHOD_NOT_ALLOWED`;
  - undecodable, empty, foreign contract and native value are refused;
  - a co-sign must equal the pending approval (changed amount or no pending → `NOT_A_PENDING_APPROVAL`; another card's → `NOT_YOUR_CARD`; wrong token → `UNKNOWN_MESSAGE`; wrong chain → `WRONG_CHAIN`);
  - login only as yourself (another key → `NOT_YOU`, changed statement → `UNKNOWN_MESSAGE`, a `Permit` → `UNKNOWN_MESSAGE`);
  - the phone wallet rejects a refused co-sign and signs the right one;
  - HK$ rounding.
- `cd mobile && npx tsc --noEmit` clean; `npm test` **61 passed** (53 before + 8).

**Next:** item 6, real by default in both apps (onboarding, sign-in, per-card agents, the Demo network switch, the console's owner identity), then the Playwright e2e.

## Round 6, part 1 · 19 Oct 03:03–03:35 · Item 6, real by default (server, phone, console)

**What changed**
- Server: `chainInfo().rpc` and the faucet info use `publicRpc()`: `PUBLIC_RPC_URL`, else `FISCO_RPC` if it isn't loopback, else `<PUBLIC_API_URL>/rpc/fisco` (that proxy is item 7). A phone never gets `127.0.0.1` again.
- Phone:
  - Opens on the real chain. `runtime.ts` defaults to `source: "server"` with `EXPO_PUBLIC_API_URL ||` the hosted Railway API. `store.tsx` no longer deletes `cb.source`; it keeps the owner's choice.
  - New `lib/visitor.ts`: after connecting, the phone signs up or back in with one Login signature, checked by the signing guard (`wallet.signLogin`, with a minimal guard context if the config isn't loaded). The token is kept per server and key. A new account shows a notice: "Your wallet is ready: HK$500.00 arrived", with the hash.
  - `api.ts` sends `x-visitor-token` on every call.
  - `wallet.createPocket` swaps ChainBrain's shared agent for a fresh per-card agent from `/v1/cards/agent` when signed in. `agentIdOf` treats every card on a server as ChainBrain's.
  - Settings:
    - "Custom server" became a **Demo network** switch, with a "Server" row (edit, Test, Save) while it's off;
    - the status line says "Connected · FISCO BCOS · signed in", or shows the error;
    - a "Back up your key" row copies the key after a warning.
  - Home: when the server can't be reached, a card says so plainly and offers **Try again** or **Use the demo network**. Nothing falls back silently.
- Console:
  - Opens live on `VITE_API_URL ||` the hosted API. Settings has the **Demo network** switch (`?server=builtin` still works). The unreachable screen says "Can't reach the ChainBrain network" and offers the demo network.
  - **"Your wallet"** (`web/src/console/Owner.tsx`, `web/src/owner/{key,wallet}.ts`):
    - the key is made in the browser: a passkey via WebAuthn PRF where the passkey really returns PRF output, else browser storage with a one-time "Copy my key" backup; an existing key can be imported;
    - one guarded Login signs up, with the funding hash shown;
    - "Create a card with HK$20" makes two guarded transactions (create with a per-card agent, then fund) and shows both hashes plus the guard's sentences;
    - for each of your cards: chat with its agent, "Waiting for you" (Confirm/Decline an intent, guarded co-sign for a payment above ask-me) and Revoke.
  - The console's chat sends the token; a 401 or 403 explains itself.
  - **Chain index** (`web/src/console/chain.ts`): the console now scans only new blocks, 10 per `getLogs` call, and keeps the logs. That replaces the 20k-block windows a truncating node would cut short.
  - Header fixed at 1024 px (it overflowed before this round too); the wallet button is icon-only below `xl`.

**Two more FISCO findings (round 6)**
- **A one-element JSON-RPC batch is answered with a bare object, not an array** (local 3.16.4 macOS node; the hosted node answers with an array). viem's batching can't match it: batched reads failed with "Cannot read properties of undefined (reading 'error')", and `waitForTransactionReceipt` never resolved. `clientFor` no longer batches.
- Logs in receipts carry FISCO's ASCII `transactionIndex` (`0x307830`) on the dev proxy too, not only on the hosted node. It's harmless to viem (it reads a wrong number) but worth knowing.

**Evidence**
- Console, driven by hand in the Browser preview against the dev stack:
  - sign-up showed "HK$500.00 arrived" with a hash;
  - card created and funded (two hashes, balance HK$480);
  - chat → intent confirmed → DataLite paid. Payment `0xdb38a55b73150d4751e9d543ada80ee3beb5d8dcfd36e5718299131525ada256`: `/api/tx` status `success`, block 644, from the facilitator; the card went from HK$20.00 to HK$17.70.
  - No horizontal scroll at 375, 1024 or 1440 px.
- `devstack/e2e/e2e.cjs --web-only`: **35/36** on the first run, and the one failure was a stale step (it opened Pockets from a pinned Live link). Fixed. The new step "a judge signs up in the browser, is funded, creates a card, and its agent pays" passes all 7 checks:
  - funding receipt status 1 and HK$500 on chain;
  - create and fund receipts status 1;
  - the card's agent is not the shared key;
  - the guard sentence is shown;
  - the payment receipt is status 1;
  - the card balance on chain went down by the price.
- Unit suites: server **99 passed, 6 skipped**; web **90** (85 + the chain index 2 + passkey/PRF wrap 5 with a fake authenticator); mobile **61**; devstack **21**.
- `--phone-only` e2e: the new launch checks pass (Demo network off on launch, connected and signed in, funded on chain, no page errors). The rest of the phone script is **stale**: it still expects the old `US$` labels, "New pocket" and the old chat entry. I'm rewriting it in part 2.

**Not done yet (part 2):** rewrite the phone e2e against the current UI (create a card, chat → intent → pay, co-sign above ask-me, revoke, all with hashes checked on chain). Also find out why "Research data" didn't appear after switching Demo network on.

## Round 6, part 2 · 19 Oct 03:35–04:00 · Item 6 done: the phone e2e on the chain, visitor auth on in the dev stack

**What changed**
- Rewrote the phone half of `devstack/e2e/e2e.cjs` for the current UI. It now:
  - launches on the chain and signs in; Demo network on shows the simulation's cards; off returns to the chain and nothing from the demo lingers;
  - checks sign-up funds exactly HK$500;
  - creates a card in the wizard ("Ask every time") with HK$40, and its agent is the per-card key read from `agent()` on chain;
  - chats ("Buy the DataLite durian report…"), confirms the task, shows the cheque with "Your key signs: Approve one payment of HK$2.30…", slides to approve, and checks the payment receipt is status 1 with `cosigned` and the card at HK$37.70;
  - holds to revoke: `revoked()` is true on chain and HK$37.70 comes back to the main wallet.
- Fixes found by it:
  - **double funding**: the phone's faucet auto-claim fired on a balance read from before the sign-up mint (HK$600). A finished sign-up now marks the wallet funded, and the faucet waits until sign-up is done.
  - **the phone's `Toggle` had no `aria-checked` on web.** RN-web drops `accessibilityState.checked` there, so screen readers couldn't tell a switch's state (and the old e2e check passed vacuously). It now sets `aria-checked`.
- **The dev stack now runs with visitor auth on.** The seed script and the devstack tests sign in as the dev owner with the shared Login. `/api/chat` with no token gives 401.
- Signing guard sentences give Hong Kong time ("… valid until 2030-03-18 01:46 HKT"), matching the cheque's clock.

**Evidence**
- `node devstack/e2e/e2e.cjs` (web + phone, fresh dev stack, visitor auth on): **60/60 checks passed**, with no page errors or unexpected HTTP errors in either app. Screenshots are in `docs/08-frontend/screenshots/e2e-*.png`.
- `pnpm --dir devstack test` 21 passed (signed in); server 99 passed, 6 skipped; web 90; mobile 61 (guard 8 with HKT).

## Round 7 · 19 Oct 04:00–04:20 · Item 7, explorer that explains

**What changed**
- `GET /api/explorer/tx/:hash` and the apps' `GET /api/tx/:hash` now return:
  - `call`: contract, function and named arguments, decoded with the Mock e-HKD, PocketFactory and Pocket ABIs;
  - for a reverted transaction, `revert {name, args, message}` and `revertSource`. The source is `native` (the node's own receipt) or `replay` (`eth_call` on latest state), with a `note` saying a replay can differ.
  - `/api/explorer/tx` also gives `toName`; `/api/tx` gives the explorer link.
- `/explorer` page: new "Why it reverted" (error, message, source) and "Call" sections.
- **`POST /rpc/fisco`** (new `server/src/rpcProxy.ts`), a read-only JSON-RPC proxy:
  - method allowlist (writes get -32601);
  - batches capped at `FISCO_PROXY_MAX_BATCH` (20) and **always answered as an array**, which fixes FISCO's one-element batch;
  - `eth_getLogs` needs an address, refuses `blockHash` and caps the range at `FISCO_PROXY_MAX_BLOCK_RANGE` (5000), and the error mentions the 10-block truncation;
  - per-IP limit `FISCO_PROXY_RATE_PER_MIN` (600);
  - 20 s upstream timeout and 502 on failure;
  - a local `chainbrain_getRevertData(hash)`.
- **Hosted node gateway** (`deploy/fisco-node/gateway.mjs`): answers `chainbrain_getRevertData(hash)` from the node's native receipt over mutual TLS, using the SDK certs in the container (`$FISCO_HOME/nodes/127.0.0.1/sdk`, port 20200). The API then uses it with `FISCO_REVERT_RPC=<the gateway URL>`.
- The dev stack defaults `FISCO_NATIVE_RPC` to the local node when the certs are there, so dev reverts are exact.
- Phone `ExplorerSheet`: on a server it reads `/api/tx/:hash` and shows "On the chain" (status, block, decoded call, why it reverted, where that was read from). That also covers hashes the phone has no local record of.
- Console explorer: on a live server, a reverted transaction shows the server's decoded error and its source. A hash not in the console's index yet shows "From the chain" instead of "not found".

**Evidence**
- `server/test/explorer-chain.test.ts`, 8 tests on local FISCO:
  - a reverted raw transfer: call `Mock e-HKD.transfer(to, …)` and revert `ERC20InsufficientBalance` labelled `replay` with a note, on both routes;
  - with `FISCO_NATIVE_RPC` the source becomes `native`;
  - with `FISCO_REVERT_RPC` a gateway is asked `chainbrain_getRevertData` and the source is `native`;
  - a card creation decodes as `PocketFactory.create(agent, cap, …)` with a `PocketCreated` log.
  - `/rpc/fisco`: reads pass, a one-element batch comes back as an array, `eth_sendRawTransaction` gets -32601, 21 requests get 400, `getLogs` without an address or over 5000 blocks is refused, `chainbrain_getRevertData` decodes, and the 3rd call at 2/min gets 429.
- Gateway smoke test on the local node: `chainbrain_getRevertData(0xa0bf…6834)` returned `0xe450d38c…` (ERC20InsufficientBalance); normal reads pass through.
- Dev stack by hand: `/api/tx/0x5f11…de78` gives `reverted`, call `Mock e-HKD.transfer`, revert `ERC20InsufficientBalance(…)`. The `/explorer` page shows "Why it reverted" and "Call". A `/rpc/fisco` batch refuses the write and answers `eth_chainId`.
- Server **107 passed, 6 skipped** (21 files); web 90; devstack 21; mobile typecheck clean.

**Next:** item 8, the model flag.

---

## Env vars so far (kept current each round)

| Var | Where | Default | Notes |
| --- | --- | --- | --- |
| `VISITOR_AUTH` | API | on | `off` only for the dev stack until item 6 |
| `VISITOR_STARTER` | API | `500` | HK$ minted to a new visitor |
| `VISITORS_PER_HOUR` | API | `60` | global sign-up cap |
| `RATE_LIMIT_PER_MIN` / `RATE_LIMIT_GET_PER_MIN` | API | `60` / `600` | per IP |
| `DATA_DIR` | API | `server/.data` | set to the Railway volume path |
| `TICK_PK` | API, sellers | `FACILITATOR_PK` | liveness tick sender (needs native balance) |
| `FISCO_LOG_STEP` | API | `10` | blocks per `eth_getLogs` call |
| `FISCO_REVERT_RPC` | API | unset | **set to the node gateway URL** (`https://fisco-node-production.up.railway.app`): exact revert reasons from the native receipt |
| `FISCO_NATIVE_RPC` / `FISCO_SDK_DIR` | API (local only) | unset | the node's native RPC with the SDK certs (the dev stack sets it itself) |
| `FISCO_PROXY_RATE_PER_MIN` / `FISCO_PROXY_MAX_BATCH` / `FISCO_PROXY_MAX_BLOCK_RANGE` | API | `600` / `20` / `5000` | `/rpc/fisco` limits |
| `AGENT_MASTER_KEY` | API | none | 0x + 64 hex (`0x$(openssl rand -hex 32)`). **Generate once, keep secret, never change** (changing it orphans every card's agent) |
