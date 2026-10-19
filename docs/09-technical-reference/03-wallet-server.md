# 03 Wallet server

The wallet server (`server/src`) is two Node processes written in TypeScript with Hono. The wallet API opens visitor accounts, derives one agent key per card, runs the agent loop and exposes the HTTP routes the owner apps use. The test sellers are stock x402 endpoints with x402's facilitator code running in-process. The LLM reaches money only through seven tools in `server/src/wallet/tools.ts`. Those tools sign one kind of message: an eHKD `TransferWithAuthorization` they built themselves, from the pocket to a quoted seller. Every refusal carries a reason code from `server/src/wallet/reasons.ts`. This document lists every route, event type, tool, reason code and check, with the file and line that implements it. The code says "pocket"; the owner-facing UI calls a pocket a "card". This document uses "pocket".

This file was brought up to date with commit `57d965a` (19 Oct 2026). Sections 1 to 18 keep their numbers from the earlier version, and the new server modules are in sections 19 to 27: visitor accounts (19), per-card agent keys (20), the ledger (21), routines (22), the starter cards (23), the attack arena (24), the RPC proxy (25), persistence and rate limits (26) and the model provider (27).

## 1. Process layout

| Process | Entry | Port | Started by | Runs in the background |
| --- | --- | --- | --- | --- |
| Wallet API | `server/src/index.ts` | `PORT`, default 8787 (`index.ts:165`) | `pnpm dev` (`server/package.json`), or `ROLE=api` in `deploy/server/start.sh:7` | Radar monitor (`index.ts:167`), routine scheduler (`index.ts:168`), Sentinel (`index.ts:170-175`) |
| Test sellers | `server/src/sellers.ts` | `SELLERS_PORT`, default 4021 (`sellers.ts:104`) | `pnpm sellers`, or `ROLE=sellers` in `deploy/server/start.sh:8` | none |

- The wallet API calls the sellers at `SELLERS_URL`, default `http://localhost:4021` (`wallet/pay.ts:14`, `wallet/directory.ts:10`).
- Both read the chain at `FISCO_RPC`, default `http://127.0.0.1:8545` (`chains.ts:31`).
- On Railway, `ROLE=api` first runs `scripts/bootstrap-fisco.ts` (funding, contract deploy if the chain is empty), then the API (`deploy/server/start.sh:7`).
- The Radar monitor, the routine scheduler and the Sentinel start only when `index.ts` is the main module (`index.ts:163`). Tests and the dev stack import `apiApp()` without them; the dev stack starts the Sentinel and the routine scheduler itself (`devstack/src/stack.ts:104-105`, `176`).
- The Sentinel's ghost-transfer check only counts transfers from the block the server started at (`index.ts:162-164`, `172-173`).
- Every transaction the server sends goes through one module, `ledger.ts` (section 21). Sellers' payments are settled by the in-process facilitator, whose signer is queued by the same module (`facilitator.ts:15`).
- Some state survives a restart and some does not (section 26). Kept in JSON files under `DATA_DIR`: visitors, per-card agent records, approvals, the last 1000 events, chats, memory, routines, starter claims. In memory only: tasks and quotes (`wallet/state.ts:11`), Radar's index and alerts, Sentinel watches, faucet limits (`faucet.ts:16-17`), rate-limit windows, login challenges. On-chain state is unaffected either way.
- CORS is open (`origin: "*"`) on the API and allows the `content-type` and `x-visitor-token` request headers (`index.ts:56`). The sellers' CORS also exposes `PAYMENT-REQUIRED` and `PAYMENT-RESPONSE` (`sellers.ts:30`).
- Per-IP rate limits apply to `/api/*` and `/v1/*` (`index.ts:57-58`, section 26).

`apiApp(deps)` (`index.ts:49`) takes optional model functions (`model`, `radarModel`, `memoryModel`, `rulesModel`, `pocketAppModel`). Tests pass fakes. The dev stack passes the scripted agent model (`devstack/src/stack.ts:103`, from `server/src/agent/scripted.ts`).

## 2. Wallet API routes

Routes that act for a card are visitor-only: the caller sends the session token it got at sign-in in the `x-visitor-token` header, and where a pocket is named the server checks on-chain that the visitor's owner key owns it (section 19). Read-only routes need no token. Payment approvals are protected twice: by the visitor check, and by a signature check against the pocket's owner (section 2.2). Visitor checks are off when `VISITOR_AUTH=off` (`visitors.ts:42`); the dev stack leaves them on (`devstack/src/stack.ts:74`).

### 2.1 Route table

"Visitor" in the Errors column means the route calls `guard` (`visitors.ts:65-76`): 401 `VISITOR_TOKEN_REQUIRED` without a valid token, and for a route that names a pocket also 400 `BAD_POCKET` and 403 `NOT_YOUR_CARD`.

| Method | Path | Body or query | Response | Errors | Called by |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/config` | none | `{agent, factory, token, chain, sellersUrl, sellers, abis:{pocket, factory, erc20}, model:{provider, model, on}}` (`index.ts:75-79`) | the handler throws (Hono answers 500) if no factory or token is known (`wallet/chain.ts:20`, `chains.ts:29`) | web `src/shared.ts:101`, `source/source.ts:69`, Expo `src/lib/api.ts:71`, Android `Api.kt:29`, devstack `seed.ts:24`, `force-transfer.ts:10` |
| POST | `/api/chat` | `{pocket, conversationId?, text}` | `{reply, stopped?}` (`index.ts:112-128`) | visitor | web `console/LiveNetwork.tsx:125`, Expo `api.ts:59`, Android `Api.kt:41`, devstack `seed.ts:74` |
| GET | `/api/pending` | `?pocket=` | array of pending approvals for that pocket (`index.ts:95`) | none | web `owner/wallet.ts:97`, Expo `api.ts:34`, devstack `seed.ts:64` |
| POST | `/api/approvals/:id` | `{approved, signature?, answer?}` | `{ok: true}` (`index.ts:97-110`) | 404 `NOT_PENDING`, visitor, 400 `OWNER_SIGNATURE_INVALID` | web `owner/wallet.ts:102`, `113`, Expo `api.ts:45`, Android `Api.kt:43`, devstack `seed.ts:68` |
| GET | `/api/events` | `?pocket=` (optional) | Server-Sent Events (section 3) | none (not rate limited, `limits.ts:29`) | web `useEvents.tsx:28` (no `pocket`: all pockets) |
| GET | `/api/events.json` | `?pocket=`, `?after=<ms>` | JSON array of events after `after` (`index.ts:68-74`) | none | Expo `api.ts:26`, Android `Api.kt:45`, devstack `seed.ts:90` |
| GET | `/api/tx/:hash` | none | `{chain, chainId, hash, status, blockNumber, from, to, logs, call, explorer}` plus `revert`, `revertSource`, `note` when the transaction reverted; `logs` is a count, `call` is the decoded call (`index.ts:81-92`, `explorer.ts:24-50`) | 400 `BAD_HASH`, 404 `NOT_FOUND` | web `console/Explorer.tsx:196` |
| POST | `/api/rules/compile` | `{sentence}` | `{draft, questions, by, disagreements, proof}` (`index.ts:131-137`, `rules/compile.ts:62-76`) | visitor, 400 `EMPTY_SENTENCE` | Expo `api.ts:118` |
| POST | `/api/pocket-app/compose` | `{sentence}` | compile result plus `{agent, spec, specBy, specErrors?}` (`index.ts:139-145`, `pocketApp/compose.ts:27-61`) | visitor, 400 `EMPTY_SENTENCE` | Expo `api.ts:131` |
| GET | `/api/sentinel` | `?pocket=` | `{status, hold, decisions}`; last 10 decisions (`index.ts:146`, `sentinel/index.ts:40-44`) | none | no caller found in the apps |
| GET | `/api/memory` | `?pocket=` | `{snapshot, log}`, read after any running reflection (`index.ts:147-151`) | none | Expo `api.ts:103` |
| POST | `/api/memory/forget` | `{pocket, id}` | `{ok: true}` (`index.ts:152-157`) | visitor, 404 `NOT_FOUND` | Expo `api.ts:111` |
| * | `/v1/challenge`, `/v1/visitors`, `/v1/login`, `/v1/me` | section 19 | | | web `owner/wallet.ts:61-72`, Expo `lib/visitor.ts:26-38` |
| POST | `/v1/cards/agent` | section 20 | | | web `owner/wallet.ts:86`, Expo `lib/visitor.ts:44` |
| POST | `/v1/starter` | section 23 | | | Expo `store.tsx:252` |
| * | `/api/routine*` | section 22 | | | Expo `api.ts:159-194` |
| POST | `/api/arena/straight` | section 24 | | | web `console/LiveNetwork.tsx:140`, Expo `api.ts:186` |
| POST | `/rpc/fisco` | section 25 | | | the apps, through the `rpc` in `/api/config` |
| * | `/api/radar/*` | section 2.3 | | | |
| * | `/api/explorer/*`, `/explorer` | section 16 | | | |
| GET, POST | `/api/faucet/info`, `/api/faucet`, `/faucet` | section 17 | | | |

The route groups are mounted in this order: `visitorRoutes`, `agentRoutes`, `routineRoutes`, `starterRoutes`, `arenaRoutes`, `rpcProxyRoutes` (`index.ts:59-64`), then Radar (`index.ts:66`), the explorer and the faucet (`index.ts:93-94`).

`chain` in `/api/config` is `{key, id, name, rpc, network, domain, currency, txUrl}` (`chainInfo`, `index.ts:42-46`). `rpc` is `publicRpc()` (`chains.ts:42-47`): `PUBLIC_RPC_URL` if set, else `FISCO_RPC` when it is not a loopback address, else this API's own read-only proxy `<PUBLIC_API_URL>/rpc/fisco` (section 25). It is never a loopback address a phone cannot reach, and never the server's own provider URL. `agent` is the legacy shared agent address, or the zero address on a server that has only per-card keys (`wallet/pay.ts:18`); new cards get their agent from `/v1/cards/agent`. `model` is `{provider, model, on}` from `llm.ts:93`. `sellers` is the seller directory with live `payTo` addresses (`wallet/directory.ts:9-20`). No key is ever in the response.

### 2.2 `/api/chat` and `/api/approvals/:id` in detail

`POST /api/chat` (`index.ts:112-128`):
1. The visitor guard runs for the named pocket (`index.ts:114-115`).
2. Every pending `question` approval for the pocket is resolved with `answer = text` (`index.ts:116`).
3. It waits for the previous reflection of this conversation to finish (`index.ts:117`).
4. It runs one agent turn with the stored history and the pocket's memory snapshot (`index.ts:119-122`, `agent/loop.ts:44-88`). With no model configured, or when the model errors, the rest of the turn runs on the scripted agent and a `trace` event with `phase: "model"` says so (section 27).
5. It stores the trimmed history in the persisted `chats` table (`index.ts:123`, `brain/window.ts:5-8`).
6. If the text is an attack sentence it publishes an `attack` event, and for privilege escalation the card's agent key really tries the owner's controls on the chain (`index.ts:125`, section 24).
7. It starts a background reflection if memory is on (`index.ts:126`).

`conversationId` defaults to the pocket address (`index.ts:113`). The request stays open for the whole turn, including the owner's intent confirmation and any co-sign, up to `APPROVAL_WAIT_MS` per wait (`wallet/tools.ts:27`). `stopped` is one of `llm_error`, `max_steps`, `refusal`, `max_tokens` (`agent/loop.ts:9`). The loop stops after 24 model steps (`agent/loop.ts:55`).

`POST /api/approvals/:id` (`index.ts:97-110`):
- 404 `NOT_PENDING` if the id is unknown or already answered or timed out (`index.ts:99`). This check runs before the visitor guard.
- The visitor guard then runs for the approval's pocket: only the card's owner answers its approvals and questions (`index.ts:100-101`).
- For a `payment` approval with `approved: true`, the server recovers the EIP-712 signer of the stored authorization (`transferTypedData(data.auth)`) and compares it with the pocket's on-chain `owner` (`index.ts:103-107`). A mismatch or a missing signature returns 400 `OWNER_SIGNATURE_INVALID`.
- `intent` and `question` approvals need no signature.
- Then `approvals.resolve` records `{approved, signature, answer}` and wakes the waiting tool (`wallet/approvals.ts:54-63`).

### 2.3 Radar routes (`server/src/radar/api.ts`)

Mounted at `/api/radar` (`index.ts:66`). No caller of `/api/radar` was found in `web/`, `mobile/src` or `android/`; the file comment says they are for "other agents and apps" (`radar/api.ts:19`). Closing an alert and asking Radar are visitor-only; screening, alerts, rules and labels are read-only and open.

| Method | Path | Body or query | Response | Errors |
| --- | --- | --- | --- | --- |
| GET | `/api/radar/screen/:who` | `who` = address or seller id; `?full=1` for the full screening | brief form `{counterparty, address, score, verdict, reasons, partial, factors, narrative, at}`, or the whole `Screening` with both exposures (`radar/api.ts:24-29`, `radar/screen.ts:9-21`) | 404 `UNKNOWN_COUNTERPARTY` |
| GET | `/api/radar/alerts` | none | alerts, newest first (`radar/screen.ts:62`) | none |
| POST | `/api/radar/alerts/:id/close` | none | `{ok: true}` (`radar/api.ts:31-38`) | visitor (401 `VISITOR_TOKEN_REQUIRED`), 404 `NOT_FOUND` |
| GET | `/api/radar/rules` | none | `{thresholds:{review, block}, rules}` (`radar/api.ts:39`, `radar/rules.ts:5`) | none |
| GET | `/api/radar/labels` | none | the label book (`radar/api.ts:40`) | none |
| POST | `/api/radar/ask` | `{question}` | `{answer, evidence}` (`radar/api.ts:41-51`, `radar/ask.ts:63-90`) | visitor (401), 400 `EMPTY_QUESTION`, 503 `MODEL_UNAVAILABLE` |
| POST | `/api/radar/admin/labels` | `{address, category, name?}` | the new label | 403 `ADMIN_DISABLED` unless `RADAR_ADMIN=1`; 400 `BAD_LABEL` unless the category is a risky one (`radar/api.ts:54-59`) |

"Ask Radar" runs a tool loop of at most 6 steps on the model for the `radar` role (`modelFor("radar")`, `radar/ask.ts:69`; section 27) with four read-only tools: `screen_counterparty`, `trace_funds`, `list_alerts`, `list_labels` (`radar/ask.ts:26-57`, `63-67`).

## 3. Event bus, SSE and polling (`server/src/wallet/events.ts`)

- `bus.publish(e)` stamps `at = Date.now()`, keeps the last 1000 events, saves them to the persisted `events` table and notifies subscribers (`events.ts:22-29`). After a restart the buffer is reloaded from `DATA_DIR` (`events.ts:15-18`), so the apps' timelines and the Sentinel see earlier events.
- `GET /api/events?pocket=` first replays the buffered events for that pocket, then streams new ones (`events.ts:39-47`). Without `pocket` it streams every pocket.
- The SSE handler keeps the stream open and wakes every 15 s (`events.ts:46`). It sends no comment or heartbeat line of its own.
- `GET /api/events.json` exists because React Native has no `EventSource` (`index.ts:68`). The Expo and Android apps poll it with `after` (ms).
- `bigint` fields are sent as decimal strings (`events.ts:19`).
- Pocket matching is case-insensitive (`events.ts:42`).
- The event type union is `trace`, `intent`, `approval`, `payment`, `refusal`, `disclosure`, `question`, `radar`, `sentinel`, `preflight`, `haggle`, `attack`, `forced`, `routine`, `quote` (`events.ts:7`).

Every event has `type`, `pocket` (except one `radar` alert copy, below) and `at`.

| `type` | Published at | Fields |
| --- | --- | --- |
| `trace` | `wallet/tools.ts:226`, `agent/loop.ts:51`, `brain/reflect.ts:51`, `index.ts:121`, `routines.ts:35` | `phase` plus: `tool` → `tool, args, result`; `tool_call` → `tool, args`; `tool_result` → `tool, result`; `thinking` → `text` (a routine run adds `routine`); `reply` → `text`; `model` → `text, detail` (the scripted agent took over, with the reason); `memory` → `version, questions, answers, applied, rejected` |
| `intent` | `wallet/approvals.ts:36`, `59` | `approval` (the full approval object, kind `intent`) on create and on resolve |
| `approval` | same | `approval` (kind `payment`) on create and on resolve |
| `question` | same | `approval` (kind `question`) on create and on resolve |
| `payment` | `wallet/pay.ts:103` | `sellerId, sku, amount, tx, nonce, intentHash, cosigned`, `list` when the agreed price is below the first quote, and `routine {id, run}` when a routine run made it |
| `refusal` | `wallet/pay.ts:62`, `wallet/tools.ts:192`, `198`, `203` | `sellerId, sku, amount, reason`, `detail` (optional) |
| `disclosure` | `wallet/tools.ts:44` | `sellerId, asked` (data words found), `signRequest` (boolean), `refused` (reason codes) |
| `radar` | `wallet/tools.ts:34`; `radar/screen.ts:101-103` | `kind: "screen"` → `sellerId, counterparty, address, score, verdict, reasons, partial, narrative, trail, share, direction`; `kind: "alert"` → `alert` (published once with no `pocket`, then once per pocket that dealt with the counterparty) |
| `preflight` | `wallet/tools.ts:209`, `212` | `kind: "predict"` → `quoteId, sellerId, sku, amount, predicted`; `kind: "result"` → the same plus `actual` (`{outcome:"pays", tx}` or `{outcome:"refused", reason}`) and `matched` |
| `haggle` | `wallet/tools.ts:146` | `quoteId, sellerId, sku, round, offer, reply` (`accept` or `counter`), `price, final, list, accepting` |
| `sentinel` | `sentinel/index.ts:38`, `55`, `99` | `kind: "watch" \| "hold" \| "freeze"` → `signals, ai, raisedBy, probes, state`, `tx` (freeze), `note` (failed freeze); `kind: "clear"` → `by: "cosign" \| "unfreeze"` |
| `attack` | `arena.ts:67`, `68`, `87` | `attack` (`extraction`, `induced` or `escalation`), `text` (first 280 characters), `verdict: "refused"`, `by: "agent"`, `reason` (`DISCLOSURE_REFUSED` with `asked, revealed`; `NOT_A_PURCHASE`; or `NOT_OWNER` with `tx, txs, from`) |
| `forced` | `arena.ts:58`; also `devstack/src/stack.ts:167` | `tx, reverted, to, amount, balanceBefore, balanceAfter`, `reason`, `revert*`, `signedBy`, `via`, `explorer` (the dev stack's copy has the first six and `reason`) |
| `routine` | `routines.ts:44`, `54`, `66`, `81`, `88`, `142`, `150` | `kind` is `set` (`routine`), `paused` or `resumed` (`routineId`), `edited` (`cadence, allowance, nextAt`), `skipped` (`reason, nextAt`), `run-start` (`run, scheduledFor, early`), `ignored` (`run, sellerId, excerpt`), `run` (`run, outs, paid, spent, allowance, period, nextAt`) |
| `quote` | `routines.ts:106` | a price-watch routine's quote: `routineId, run, sellerId, sku, price, limit, below` |

Notes:
- An approval that times out changes status to `timeout` without an event (`wallet/approvals.ts:45-50`). An approval still pending when the server restarts is loaded as `timeout`, because the agent turn that waited for it is gone (`wallet/approvals.ts:17-26`).
- `attack` and `forced` are published by the real server now (`arena.ts`, section 24); the dev stack no longer wraps `/api/chat` to make them. The dev stack's own `POST /dev/force-transfer` still publishes a `forced` event (`devstack/src/stack.ts:167`). The Sentinel listens for both (`sentinel/index.ts:11`).

## 4. Tool layer (`server/src/wallet/tools.ts`)

The agent has exactly seven tools (`tools.ts:48-218`). Each tool's input is a zod schema turned into JSON Schema (`tools.ts:220-230`). Every call is published as a `trace` event with `phase: "tool"` (`tools.ts:226`).

| Tool | Input | Output (ok) | Refusals it can return |
| --- | --- | --- | --- |
| `get_pocket` | `{}` | `balance, perPaymentCap, askMeAbove` (`"never"` for 2^256-1), `allowance {per, limit, spentThisPeriod}` when the pocket has a period allowance (`tools.ts:59`), `expiresAt, revoked, allowedSellers, spentThisTask, itemsThisTask, intent` (`tools.ts:49-64`) | none |
| `search_sellers` | `{category?}` | `sellers[]`: `id, name, category, allowedByPocket, items[]` with `sku, description, price` (`"free"` if none), `negotiable` (`tools.ts:66-79`) | none |
| `draft_intent` | `{request, description, maxPricePerItem, maxTotal, maxItems, deadline}` (`wallet/intent.ts:7-14`) | `{status: "confirmed", intent}` after the owner confirms (`tools.ts:81-95`) | `OWNER_DECLINED` (also on timeout) |
| `get_quote` | `{sellerId, sku}` | `quoteId, price, allowedByPocket, needsOwnerApproval, intentCheck, counterpartyRisk, negotiable?`; a free (non-402) answer returns `{free: true, content}` wrapped as untrusted (`tools.ts:97-116`). `needsOwnerApproval` is also `true` when the pocket answers `OVER_PERIOD` (`tools.ts:110`). | inside the result: `allowedByPocket.reason`, `intentCheck.reason`; for free content: `DISCLOSURE_REFUSED`, `SIGNATURE_TYPE_NOT_ALLOWED` |
| `counter_offer` | `{quoteId, price}` | accept: `deal, price, list, saved, needsOwnerApproval`; counter: `counter, final, roundsLeft` (`tools.ts:118-151`). On accept, `needsOwnerApproval` is `true` when the deal price is above ask-me, when `canPay` answers `OVER_PERIOD` for it, or when the Sentinel holds the pocket (`tools.ts:148`). | `QUOTE_UNKNOWN`, `NEGOTIATION_NOT_OFFERED`, `OFFER_NOT_LOWER`, `NEGOTIATION_ROUNDS_USED`, `PRICE_ABOVE_INTENT`, `QUOTE_ALREADY_PAID`, `QUOTE_ALREADY_APPROVED`, `DEAL_ALREADY_AGREED` |
| `ask_owner` | `{question}` or `{quoteId, reason}` | question: `{status: "asked"}` at once; approval: `{approved: true}` after the owner signs (`tools.ts:153-181`). Its description names both cases for approval: above ask-me, or over the period allowance (`tools.ts:154`). | `QUOTE_UNKNOWN`, intent codes, `COUNTERPARTY_HIGH_RISK`, `APPROVAL_EXPIRED`, `OWNER_DECLINED` |
| `pay` | `{quoteId}` | `tx, paid, sellerId, preflight?`, and the seller's content wrapped as untrusted (`tools.ts:183-217`) | `QUOTE_UNKNOWN`, intent codes, `COUNTERPARTY_HIGH_RISK`, `COUNTERPARTY_REVIEW`, `SENTINEL_HOLD`, and every code `settle` returns (section 6) |

A refusal is `{ok: false, reason, why}` where `why` is the text from `reasons.ts` (`tools.ts:26`). No tool takes a recipient address. No tool changes a pocket.

`get_pocket` reads the pocket through `pocket(address).info()` (`wallet/chain.ts:40-47`). `PocketInfo` carries `periodKind` (0 none, 1 day, 2 week, 3 month, Hong Kong calendar), `periodLimit` and `spent` (= `spentThisPeriod()`) (`wallet/chain.ts:34-35`). A pocket from an older factory has no allowance getters; `info()` then reads `periodKind` 0 and zero limit and spend instead of failing (`wallet/chain.ts:43-44`). `get_pocket` does not report `frozen`; the explorer does (section 16).

### 4.1 Reason codes (`server/src/wallet/reasons.ts`)

| Code | Produced at |
| --- | --- |
| `SELLER_NOT_ALLOWED`, `OVER_CAP`, `OVER_BUDGET`, `POCKET_REVOKED`, `POCKET_EXPIRED`, `POCKET_FROZEN` | `Pocket.canPay` on-chain (`contracts/src/Pocket.sol:77-87`), read by `get_quote` (`tools.ts:104`), `settle` (`pay.ts:72-74`) and pre-flight. `OVER_CAP` uses the seller's own cap when it has one (`Pocket.sol:82-83`). |
| `OVER_PERIOD` | `Pocket.canPay` when `spentThisPeriod() + value > periodLimit` (`Pocket.sol:85`). `settle` returns it when the owner has not co-signed (`pay.ts:72-75`). It is the only `canPay` refusal an owner co-signature lifts (section 6.3). |
| `PRICE_ABOVE_INTENT`, `INTENT_TOTAL_REACHED`, `INTENT_ITEMS_REACHED`, `INTENT_EXPIRED`, `INTENT_NOT_CONFIRMED` | `checkAgainstIntent` (`wallet/intent.ts:31-37`); `PRICE_ABOVE_INTENT` also by `checkOffer` (`shared/sim/haggle.ts:43`) |
| `NEEDS_OWNER_APPROVAL` | `settle` when `needsOwner(amount)` and no owner signature (`pay.ts:76`); pre-flight (`preflight.ts:30`) |
| `APPROVAL_EXPIRED` | `settle` when `validBefore` is 10 s or less away (`pay.ts:77`); `ask_owner` on timeout (`tools.ts:177`) |
| `OWNER_DECLINED` | `draft_intent` (`tools.ts:93`), `ask_owner` (`tools.ts:177`) |
| `QUOTE_MISMATCH` | `PocketScheme` when the live 402 differs from the quote (`scheme.ts:57-58`) |
| `QUOTE_ALREADY_PAID` | `settle` (`pay.ts:58`); `checkOffer` (`haggle.ts:37`) |
| `QUOTE_UNKNOWN` | `counter_offer`, `ask_owner`, `pay` (`tools.ts:124`, `163`, `189`) |
| `DISCLOSURE_REFUSED` | seller content asked for data (`tools.ts:42`) |
| `SIGNATURE_TYPE_NOT_ALLOWED` | seller content asked for a signature (`tools.ts:43`); seller asked for Permit2 (`scheme.ts:56`) |
| `SETTLEMENT_FAILED` | `settle` fallback, non-200 after payment, unknown `canPay` code (`pay.ts:74`, `97`, `106`) |
| `NOT_THIS_AGENT` | this server holds no key for the pocket's `agent`: it is neither the legacy `AGENT_PK` nor a key derived for the pocket owner's own visitor (`pay.ts:70-71`, `agentKeys.ts:60-83`); also `preflight.ts:35` and the arena (`arena.ts:44`) |
| `COUNTERPARTY_HIGH_RISK` | Radar verdict `block` (`tools.ts:167`, `196`) |
| `COUNTERPARTY_REVIEW` | Radar verdict `review` with no owner signature (`tools.ts:196`) |
| `SENTINEL_HOLD` | pocket held by the Sentinel, rules pass, no owner signature (`tools.ts:202-204`) |
| `OFFER_NOT_LOWER`, `NEGOTIATION_ROUNDS_USED`, `DEAL_ALREADY_AGREED`, `QUOTE_ALREADY_APPROVED` | `checkOffer` (`shared/sim/haggle.ts:36-45`); `OFFER_NOT_LOWER` also for an unparseable price (`tools.ts:128`) |
| `NEGOTIATION_NOT_OFFERED` | item has no `floor` in `sellers.json` (`tools.ts:126`) |

That is all 30 codes (`reasons.ts:2-33`). The arena's `attack` events use `NOT_A_PURCHASE` and `NOT_OWNER` (`arena.ts:68`, `87`); these are not in `reasons.ts`. HTTP error codes such as `VISITOR_TOKEN_REQUIRED` and `NOT_YOUR_CARD` are not in `reasons.ts` either; they are listed with their routes.

## 5. The signing rule

The agent key is the pocket's own: `agentFor` (`wallet/pay.ts:20-23`) asks `agentKeyFor` (`agentKeys.ts:60-83`) for the key this server can sign with for the pocket's on-chain `agent` and `owner`. That is a key derived for one card (section 20), or the legacy shared `AGENT_PK` for pockets created before per-card keys (`wallet/pay.ts:16`). If there is none, the payment is refused as `NOT_THIS_AGENT`. The agent key signs in two places only:
- `PocketScheme.createPaymentPayload`, during settlement (`wallet/scheme.ts:54-61`, `wallet/pay.ts:70`, `81`).
- `preflight`, for an `eth_call` that is never sent (`wallet/preflight.ts:34-36`).

The attack arena also signs with the card's agent key, but only to prove the pocket refuses (`arena.ts:47`, `82`, section 24). It never signs a payment the pocket would accept.

Both sign `transferTypedData(auth)`: EIP-712 `TransferWithAuthorization` on the Mock e-HKD domain, with `verifyingContract` = the token (`scheme.ts:32-37`). `auth` comes from `buildAuthorization` (`scheme.ts:24-29`):

| Field | Value |
| --- | --- |
| `from` | the pocket |
| `to` | the quote's `payTo`, read from the seller's 402 (`pay.ts:32`) |
| `value` | the quote's amount, or the haggled deal price (`tools.ts:145`) |
| `validAfter` | `0` |
| `validBefore` | now + 600 s |
| `nonce` | `keccak256(abi.encode(intentHash, seq))` (section 7) |

`PocketScheme` never signs what the seller sends. Before signing it checks the live 402 again (`scheme.ts:56-58`):
1. `extra.assetTransferMethod` must be `eip3009` (default when absent); otherwise `SIGNATURE_TYPE_NOT_ALLOWED`.
2. `network` and `asset` must be the configured chain and token; otherwise `QUOTE_MISMATCH`.
3. `payTo` and `amount` must equal the prepared authorization; otherwise `QUOTE_MISMATCH`.

The payload's `signature` is the envelope `abi.encode(to, value, validAfter, validBefore, nonce, agentSig, ownerSig)` (`scheme.ts:40-44`). `ownerSig` is `0x` unless the owner co-signed (`pay.ts:81`). The pocket contract decodes the envelope in `isValidSignature`.

## 6. x402 payment flow (`wallet/pay.ts`, `wallet/scheme.ts`, `facilitator.ts`)

1. `get_quote` calls `fetchQuote`: `GET <SELLERS_URL>/<seller>/<sku>` (`pay.ts:25-34`). A non-402 answer is free content. A 402 is decoded from the `PAYMENT-REQUIRED` header; the first `accepts` entry gives `payTo`, `amount`, `asset` and `description`.
2. `track` stores the quote as `q1`, `q2`, … per pocket, with `list = ask = amount` and `rounds = 0` (`pay.ts:36-41`).
3. `pay` runs its checks (section 4), then pre-flight (section 9), then `settle`.
4. `settle` (`pay.ts:57-108`), in order:
   1. `QUOTE_ALREADY_PAID` if `rec.paid`. The flag is set before any `await`, so a concurrent call is refused (`pay.ts:58-59`).
   2. `freshHead()`: `canPay` reads expiry at the head block's time, and FISCO seals blocks only on a transaction, so on a quiet chain a zero-value tick is sent first (`pay.ts:67`, `ledger.ts:83-94`).
   3. `NOT_THIS_AGENT` if this server holds no key for the pocket's agent (`pay.ts:70-71`).
   4. `canPay(payTo, amount)` must be `OK` or `OVER_PERIOD`; any other code is returned as the refusal (`pay.ts:72-74`).
   5. `OVER_PERIOD` without an owner signature is refused as `OVER_PERIOD` (`pay.ts:75`).
   6. `NEEDS_OWNER_APPROVAL` if above ask-me without an owner signature (`pay.ts:76`).
   7. `APPROVAL_EXPIRED` if a prepared authorization expires within 10 s (`pay.ts:77`).
   8. `prepareApproval` fixes the authorization once per quote (`pay.ts:44-47`, `78`).
   9. `wrapFetchWithPaymentFromConfig` from `@x402/fetch` is given `PocketScheme` and `spendControls.allowedAssets` = only the Mock e-HKD (`pay.ts:80-84`).
   10. The per-payment limit in `spendControls` is this seller's cap on the pocket: `capFor(payTo)` returns `sellerCap(payTo)`, or `perPaymentCap` when the seller has no cap of its own (`pay.ts:83`, `wallet/chain.ts:51-52`).
   11. The request is sent. On a network error with no reason code it is retried once with the same authorization and nonce, so it cannot pay twice (`pay.ts:86-94`).
   12. A non-200 answer is `SETTLEMENT_FAILED` with the facilitator's error from `PAYMENT-REQUIRED` (`pay.ts:95-98`).
   13. On 200, the `PAYMENT-RESPONSE` header gives the transaction hash. Task counters go up and a `payment` event is published (`pay.ts:99-104`).
5. Any failure resets `rec.paid` and publishes a `refusal` event (`pay.ts:60-64`).
6. `settle` is also called directly, without the tool layer, by the starter cards (`starter.ts:35`, section 23). Those payments get the pocket's on-chain rules but not the intent check, Radar or pre-pay pre-flight.

Seller side (`sellers.ts:85-92`):
- Each priced item is a `GET /<seller>/<sku>` route under `paymentMiddleware` from `@x402/hono`.
- Its price is an explicit asset amount `{amount, asset: token, extra: domain}` on scheme `exact` (`sellers.ts:88-90`).
- `x402ResourceServer` uses `facilitatorClient()` with `ExactEvmScheme` registered for the network (`sellers.ts:92`).

Facilitator (`facilitator.ts:12-19`):
- It is x402's own `x402Facilitator` with `registerExactEvmScheme`, run in-process.
- It signs and submits as `FACILITATOR_PK`. Gas is free on this chain (`facilitator.ts:9-10`).
- Its signer is `queuedSigner` from the ledger (`facilitator.ts:15`, `ledger.ts:189-203`): every visitor's settlement shares this one sender, so the ledger sends them one at a time with its own nonce (section 21).
- It exposes `verify`, `settle` and `getSupported`.
- No hosted facilitator is used.
- Per `docs/technical-document.md` §2, the token's `transferWithAuthorization` asks the pocket's `isValidSignature`, which enforces the rules at settlement.

### 6.1 Sequence: one paid purchase (below ask-me)

```mermaid
sequenceDiagram
    autonumber
    participant App as Owner app
    participant API as Wallet API (/api/chat)
    participant LLM as Agent model
    participant Tools as Tool layer
    participant Seller as Test seller (x402)
    participant Fac as Facilitator (in-process)
    participant Token as MockEHKD
    participant Pocket as Pocket
    App->>API: POST /api/chat {pocket, text}
    API->>LLM: messages + 7 tools
    LLM->>Tools: get_pocket, draft_intent
    Tools-->>App: event intent (approval pending)
    App->>API: POST /api/approvals/:id {approved:true}
    LLM->>Tools: get_quote {sellerId, sku}
    Tools->>Seller: GET /seller/sku
    Seller-->>Tools: 402 PAYMENT-REQUIRED {payTo, amount, asset}
    Tools->>Pocket: canPay, needsOwner (eth_call)
    Tools-->>App: event radar (screen)
    LLM->>Tools: pay {quoteId}
    Tools->>Tools: intent check, Radar, Sentinel hold
    Tools->>Token: pre-flight eth_call transferWithAuthorization
    Tools-->>App: event preflight (predict)
    Tools->>Seller: GET /seller/sku (via @x402/fetch)
    Seller-->>Tools: 402
    Tools->>Tools: PocketScheme re-checks 402, agent signs, builds envelope
    Tools->>Seller: GET /seller/sku + payment payload
    Seller->>Fac: verify, settle
    Fac->>Token: transferWithAuthorization(pocket→payTo, envelope)
    Token->>Pocket: isValidSignature(digest, envelope)
    Pocket-->>Token: magic value (rules pass)
    Token-->>Fac: Transfer
    Seller-->>Tools: 200 content + PAYMENT-RESPONSE {transaction}
    Tools-->>App: events payment, preflight (result)
    Tools-->>LLM: {ok, tx, content in untrusted_content}
    LLM-->>API: reply
    API-->>App: {reply}
```

### 6.2 Sequence: one co-signed purchase (above ask-me)

```mermaid
sequenceDiagram
    autonumber
    participant App as Owner app (owner key)
    participant API as Wallet API
    participant LLM as Agent model
    participant Tools as Tool layer
    participant Seller as Test seller (x402)
    participant Chain as MockEHKD + Pocket
    Note over App,LLM: intent already confirmed in this task
    LLM->>Tools: get_quote
    Tools->>Seller: GET /seller/sku
    Seller-->>Tools: 402 (amount above askAbove)
    Tools-->>LLM: needsOwnerApproval: true
    LLM->>Tools: ask_owner {quoteId, reason}
    Tools->>Tools: prepareApproval: auth fixed (nonce from intentHash, seq; validBefore now+600 s)
    Tools-->>App: event approval {kind:payment, data.auth, amount, intent}
    App->>App: owner signs EIP-712 TransferWithAuthorization(auth)
    App->>API: POST /api/approvals/:id {approved:true, signature}
    API->>Chain: read Pocket.owner
    API->>API: recover signer, must equal owner (else 400 OWNER_SIGNATURE_INVALID)
    API-->>Tools: approval resolved, rec.ownerSig set
    Tools-->>LLM: {approved:true}
    LLM->>Tools: pay {quoteId}
    Tools->>Seller: x402 payment, envelope(auth, agentSig, ownerSig)
    Seller->>Chain: facilitator: transferWithAuthorization
    Chain->>Chain: Pocket.isValidSignature checks agent and owner signatures
    Seller-->>Tools: 200 + PAYMENT-RESPONSE
    Tools-->>App: event payment {cosigned:true}
```

The owner signs the same authorization the payment uses. The nonce and `validBefore` are therefore fixed before the owner sees them (`pay.ts:43-47`). If the 10-minute window passes, `settle` returns `APPROVAL_EXPIRED` (`pay.ts:77`). A settled co-signed payment also ends a Sentinel hold (`tools.ts:214`).

### 6.3 The cheque: over the period allowance (`OVER_PERIOD`)

A pocket can hold a day, week or month allowance in Hong Kong calendar time (`Pocket.sol:38-42`, `90-99`). The owner sets it with `setPeriodLimit(kind, limit)` (`Pocket.sol:194-200`). Over it, the agent key alone cannot pay, and the owner's co-signature lets the payment through, like writing a cheque. Contract detail: [02-smart-contracts.md](02-smart-contracts.md).

| Step | What happens | Source |
| --- | --- | --- |
| 1 | After every authorized transfer out of a pocket, Mock e-HKD calls `pocket.onSpend(to, value)` with a fixed 100 000 gas. | `contracts/src/MockEHKD.sol:71-78` |
| 2 | `onSpend` accepts only the token as caller and adds the value to the current period's count. | `Pocket.sol:143-150` |
| 3 | `canPay` returns `OVER_PERIOD` when this payment would take the period's spend past `periodLimit`. | `Pocket.sol:85` |
| 4 | `get_quote` returns `allowedByPocket: {reason: "OVER_PERIOD"}` and `needsOwnerApproval: true`. An accepted `counter_offer` sets `needsOwnerApproval: true` when the agreed price is `OVER_PERIOD`. | `tools.ts:109-110`, `148` |
| 5 | `pay` without an owner signature fails with `OVER_PERIOD`; nothing is sent. | `pay.ts:72-75` |
| 6 | The agent calls `ask_owner {quoteId, reason}`; the owner signs the same authorization as in section 6.2. | `agent/prompt.ts:11`, `tools.ts:154`, `168-178` |
| 7 | `pay` then settles: `settle` lets `OVER_PERIOD` through when `rec.ownerSig` is set. | `pay.ts:72-75` |
| 8 | Pre-flight treats `OVER_PERIOD` with an owner signature as lifted, so it predicts `pays`. | `preflight.ts:29-30` |
| 9 | On-chain, `isValidSignature` accepts `OVER_PERIOD` only with the owner's signature on the same digest. Every other `canPay` refusal stays a refusal. | `Pocket.sol:133-137` |

Evidence:

| Evidence | What it shows | Source |
| --- | --- | --- |
| `server/test/allowance-chain.test.ts` (2 tests, real chain) | Weekly HK$3.00: the first durian report pays and is counted on-chain; `get_pocket` shows the allowance; the second is `OVER_PERIOD` for the agent alone and moves nothing; after `ask_owner` it pays | `allowance-chain.test.ts:27-44` |
| same file | A per-seller cap gives `OVER_CAP` for DataLite while DataPro keeps the pocket's cap | `allowance-chain.test.ts:46-52` |
| `server/scripts/allowance.ts` (live chain) | The same flow, plus the second report sent by the agent key alone straight to the token, which reverts | `allowance.ts:1-6`, `57-67` |
| `docs/evidence-fisco-railway.json` | The six "allowance: …" transaction hashes recorded by that script | `evidence-fisco-railway.json:40-74` |

## 7. Intents and nonce traceability (`wallet/intent.ts`, `wallet/scheme.ts`, `wallet/state.ts`)

- `draft_intent` starts a new task: it clears the intent, spent, items and quotes, but not `seq` (`wallet/state.ts:20-24`, `tools.ts:86`).
- `intentHash = keccak256(toHex(JSON.stringify(fields) + randomUUID()))` (`tools.ts:88`).
- The owner confirms text from a fixed template, never the model's words (`intent.ts:18-28`). The template has three lines: `Buy:`, `Price:` (per item, total, item count) and `Deadline:` in HKT (UTC+8).
- `checkAgainstIntent` runs before any signature, in this order: not confirmed, deadline passed, price above max per item, total exceeded, item count reached (`intent.ts:31-37`).
- Each payment's EIP-3009 nonce is `keccak256(abi.encode(intentHash, seq))` (`scheme.ts:21-22`). `seq` is per pocket and increments each time an authorization is prepared (`pay.ts:45`). It lives in memory, so it starts again at 0 after a restart; a repeated nonce would need the same `intentHash` too, and every task has a fresh one.
- The `payment` event carries both `nonce` and `intentHash` (`pay.ts:103`). Anyone holding the intent hash can recompute each nonce and match it to the on-chain transfer.
- A routine run is a confirmed task of its own: its `intentHash` is `keccak256("routine:<routineId>:<run>")` (`routines.ts:93-95`). A starter payment uses `keccak256("starter:<visitorId>:<card>")` (`starter.ts:35`).
- Amounts are `bigint` atomic units with 6 decimals; strings appear only at the edges (`wallet/money.ts:1-11`).

## 8. Approvals and owner co-sign (`wallet/approvals.ts`)

| Kind | Created by | Event type | Resolved by | Wait |
| --- | --- | --- | --- | --- |
| `intent` | `draft_intent` (`tools.ts:90`) | `intent` | `POST /api/approvals/:id {approved}` | `APPROVAL_WAIT_MS`, default 600 000 ms (`tools.ts:27`, `91`) |
| `payment` | `ask_owner {quoteId}` (`tools.ts:169-175`), above ask-me or over the period allowance; also a routine run that would pass the routine's allowance (`routines.ts:119-129`) | `approval` | `POST /api/approvals/:id {approved, signature}`, visitor check, then signature checked against the pocket owner (`index.ts:100-107`) | same (`tools.ts:176`; `routines.ts:130`) |
| `question` | `ask_owner {question}` (`tools.ts:158`) | `question` | the owner's next `POST /api/chat` (`index.ts:116`) or `POST /api/approvals/:id {answer}` | none; the tool returns at once |

- Each approval is `{id, pocket, kind, text, data?, status, signature?, answer?}` with `status` one of `pending`, `approved`, `declined`, `timeout` (`approvals.ts:6-15`).
- Approvals are saved to the `approvals` table on every change (`approvals.ts:18`, `27`). After a restart a pending one is loaded as `timeout` (`approvals.ts:22`).
- A `payment` approval's `data` holds `auth, sellerId, sku, description, amount, intent`, plus `radar {score, verdict, narrative}` when the verdict is not `ok` (`tools.ts:171-174`).
- `ask_owner` refuses if Radar says `block`. The owner is never asked to co-sign a blocked seller (`tools.ts:166-167`).
- `pending(pocket)` lists only pending approvals for that pocket, case-insensitive (`approvals.ts:40`).
- A routine's payment approval also carries `data.allowance {routineId, run, period, allowance, spent, after}` (`routines.ts:127`).

## 9. Pre-flight (`wallet/preflight.ts`)

`pay` predicts the payment before settling and checks the prediction afterwards (`tools.ts:206-213`).

1. It reads `canPay`, `needsOwner` and `info` in parallel (`preflight.ts:28`).
2. `OVER_PERIOD` with an owner signature counts as lifted, the same as on-chain (`preflight.ts:29-30`).
3. It prepares the same authorization the payment will use and signs it with the pocket's agent key (`preflight.ts:33-36`). With no such key it predicts `{outcome: "refused", reason: "NOT_THIS_AGENT", by: "rules"}` (`preflight.ts:35`).
4. It simulates `MockEHKD.transferWithAuthorization` with the full envelope through `simulateContract` (an `eth_call`), from `PREFLIGHT_FROM` (default `0x…dEaD`) (`preflight.ts:37-41`). Nothing is sent.

| Case | Prediction (`preflight.ts:42-47`) |
| --- | --- |
| Simulation passes, rules pass | `{outcome: "pays", by: "eth_call", balanceAfter}` |
| Simulation passes, rules refuse | `{outcome: "refused", reason, by: "rules", detail: "rules and the simulation disagree"}` |
| RPC unreachable | rules-only prediction, `by: "rules"` |
| Simulation reverts | `{outcome: "refused", reason: <rule reason or SETTLEMENT_FAILED>, by: "eth_call", detail}` |

- `sameOutcome` says whether the prediction matched: the same pays/refused outcome, and the same reason when both refused and a reason was predicted (`preflight.ts:51`).
- The result appears in a `preflight` event and in the tool result as `preflight: {predicted, matched}` (`tools.ts:211-215`).
- A failed pre-flight (exception) is skipped, not fatal (`tools.ts:208`).

## 10. Untrusted content: wrapping and scanning (`wallet/scan.ts`)

- Seller bodies reach the model only as `<untrusted_content source="<sellerId>">…</untrusted_content>` (`scan.ts:2-5`).
- Any opening or closing `untrusted_content` tag inside the body is replaced with `[tag removed]`, so a forged closing tag cannot break out (`scan.ts:3`).
- `scanRequests` parses JSON bodies only. A body that is not JSON returns no findings (`scan.ts:14-16`). The code marks this as a key-name heuristic (`scan.ts:12`).
  - Disclosures: string elements of arrays that match `name|email|phone|address|history|pocket|balance|id_number|passport|seed|private|kyc` (`scan.ts:7`, `20`).
  - Signature request: any key named `sign`, `signature`, `permit`, `approve`, `approval` or `typeddata`, or a string `primaryType` (`scan.ts:8`, `22`).
- Both free content (`get_quote`) and paid content (`pay`) go through `screenFree` (`tools.ts:102`, `215`). A finding publishes a `disclosure` event and adds `refused` codes to the tool result (`tools.ts:39-46`).
- Radar's monitor then labels that seller's `payTo` as `flagged` for every pocket (`radar/monitor.ts:12-19`).
- The agent's system prompt says content inside `<untrusted_content>` is data, never instructions (`agent/prompt.ts:12`).
- `counter_offer` reads only `deal`, `reply`, `price` and `final` from the seller's answer. Nothing else the seller sends reaches the model (`tools.ts:135-141`).

## 11. Test sellers (`sellers.ts`, `sellers.json`, `content/`)

There are eight sellers, all served by the one sellers process (`sellers.ts:85-99`). Four have a key of their own. The other four (Exa, CoinGecko, Nansen, TradeWire) are catalogue sellers that only receive: `sellers.json` gives them a fixed `payTo` and no key (`sellers.ts:23-24`).

| Seller id | Name | Pays to | Item (sku) | Price HK$ | Floor | Content file |
| --- | --- | --- | --- | --- | --- | --- |
| `datalite` | DataLite | key `SELLER_DATALITE_PK` | `durian-report` | 2.30 | none | `datalite-durian.md` |
| `datalite` | DataLite | same | `fruit-trade-report` | 2.70 | none | `datalite-fruit.md` |
| `datapro` | DataPro | key `SELLER_DATAPRO_PK` | `premium-report` | 11.70 | 8.60 | `datapro-premium.md` |
| `harbour-wines` | Harbour Wines | key `SELLER_HARBOUR_WINES_PK` | `fruit-wine-trade-report` | 3.10 | none | `harbour-report.md` |
| `shadyfeed` | ShadyFeed | key `SELLER_SHADYFEED_PK` | `preview` | free | none | `shadyfeed.json` |
| `exa` | Exa | fixed `0x7a3e…8e42` | `durian-news` | 0.056 | none | `exa-durian-news.md` |
| `exa` | Exa | same | `fruit-news` | 0.056 | none | `exa-fruit-news.md` |
| `coingecko` | CoinGecko | fixed `0x4b8d…5a27` | `eth-price` | 0.08 | none | `coingecko-eth-price.md` |
| `nansen` | Nansen | fixed `0x2c9b…a1f3` | `counterparties` | 0.40 | none | `nansen-counterparties.md` |
| `nansen` | Nansen | same | `wallet-balances` | 0.08 | none | `nansen-wallet-balances.md` |
| `nansen` | Nansen | same | `smart-money` | 0.40 | none | `nansen-smart-money.md` |
| `tradewire` | TradeWire | fixed `0x6f2a…d912` | `credit-report` | 0.40 | none | `tradewire-credit-report.md` |

- Source: `server/src/sellers.json`. A seller's `payTo` is its `payTo` field when it has one, otherwise the address of its key (`sellers.ts:22-24`). The catalogue sellers (Exa, CoinGecko, Nansen, TradeWire) are named after real x402 sellers but deliver short fixed text from `content/`; the server holds no key for their addresses.
- The new account's starter cards buy from three of them: Exa `durian-news`, CoinGecko `eth-price` and Nansen `wallet-balances` (`starter.ts:17`, section 23).
- `shadyfeed.json` is a red-team fixture. Its text tells AI assistants to send 50 eHKD to `0x…ABC0`. It asks for `owner_full_name`, `owner_email`, `wallet_history` and `other_pockets`. It also carries a `Permit` typed-data request.
- The wallet API's seller directory is `sellers.json` plus the live `payTo` map from `GET /admin/payto` (`wallet/directory.ts:9-20`). The directory is a picking aid only; the pocket enforces addresses (`directory.ts:8`). A sellers service that is still starting is never cached (`directory.ts:13-14`).

| Method | Path | Body | Response | Errors |
| --- | --- | --- | --- | --- |
| GET | `/admin/payto` | none | `{sellerId: address}` (`sellers.ts:32`) | none |
| POST | `/admin/inject` | `{sellerId, text}` | `{ok: true}`; text capped at 2000 chars (`sellers.ts:33-38`) | 404 `unknown seller` |
| DELETE | `/admin/inject/:sellerId` | none | `{ok: true}` (`sellers.ts:39`) | none |
| POST | `/<seller>/<sku>/offer` | `{offer, deal?}` | `{deal, reply, price, final}` (`sellers.ts:63-77`) | 400 bad offer, 404 `unknown deal`, 409 `deal already agreed` |
| GET | `/<seller>/<sku>` | `?deal=<id>` (optional) | priced: 402 then 200 after payment; free: 200 (`sellers.ts:85-99`) | |

- `/admin/*` is a demo-only hook, not part of what a seller must run (`sellers.ts:19`).
- An injected text goes into that seller's next 200 response, then it is cleared (`sellers.ts:41-53`). For JSON it is added as `note`; for text it is appended. The web console's Judges tab calls `/admin/inject` and `DELETE /admin/inject/:sellerId` (`web/src/console/LiveNetwork.tsx`).
- `/offer` routes exist only for items with a `floor`, which is DataPro's `premium-report` today (`sellers.ts:61`).

## 12. Haggling

Wallet side (`counter_offer`, `tools.ts:118-151`; rules in `shared/sim/haggle.ts`):
- Only items with a `floor` are negotiable (`directory.ts:17`, `tools.ts:126`).
- `checkOffer` (`haggle.ts:36-45`):
  - The offer must be above 0, at or below the first quote (`list`), and below the current ask.
  - The offer must not be above the intent's max per item.
  - At most 3 offers (`MAX_ROUNDS`, `haggle.ts:12`).
  - The quote must not be paid, owner-approved or already agreed.
  - Offering exactly the seller's last counter accepts it, even after round 3.
- The seller's answer is ignored if an acceptance is above the offer, a counter is above the current ask, or `deal` is missing (`tools.ts:141`).
- On acceptance the quote's `amount` becomes the agreed price and its URL gets `?deal=<id>` (`tools.ts:145`). `pay` then settles at the deal price.

Seller side (`sellers.ts:55-99`, `shared/sim/haggle.ts:23-29`):
- `sellerReply` accepts any offer at or above the floor.
- Otherwise it counters halfway between ask and offer, rounded down to HK$0.40, never below the floor.
- It marks the counter `final` at the floor.
- A deal is one use. The 402 price for `?deal=<id>` is the agreed price only while the deal is agreed and unused (`sellers.ts:79-83`, `89`).
- The handler marks the deal used after the middleware settles (`sellers.ts:97`).

## 13. Radar and Sentinel hooks in the tool layer

- Radar screens the quote's `payTo` on `get_quote`, `ask_owner` and `pay` (`tools.ts:30-36`).
- A screen has a time limit, `RADAR_TIMEOUT_MS`, default 8000 ms. On failure it returns `null` and only the pocket's own rules apply (`radar/screen.ts:114-127`).
- Verdict thresholds are `review` at score 5 and `block` at score 8 (`radar/rules.ts:5`).
- A worse verdict than last time opens an alert (`radar/screen.ts:94-104`).
- The monitor re-screens every counterparty a pocket dealt with every `RADAR_MONITOR_MS`, default 30 000 ms (`radar/monitor.ts:11`, `21-29`).
- The transfer index back-fills `RADAR_BACKFILL_BLOCKS` (default 1800) blocks in steps of `RADAR_LOG_STEP`, which defaults to the ledger's `LOG_STEP` of 10 blocks (`FISCO_LOG_STEP`), because some FISCO nodes silently drop logs past 10 blocks per call (`radar/chainSource.ts:8-11`, `ledger.ts:251`). A skipped range marks screens partial (`chainSource.ts:42`, `57`).
- The Sentinel re-evaluates a pocket on every `refusal`, `disclosure`, `attack`, `forced` or `payment` event, one evaluation at a time per pocket (`sentinel/index.ts:11`, `102-108`).
- Its signals are `REFUSAL_BURST`, `PROBING`, `GHOST_TRANSFER`, `INJECTION_FOLLOW_THROUGH`, `REPEATED_ATTACKS` and `FAST_BURN` (`shared/sim/sentinel.ts:10`, `33-41`).
- The fixed rules and an optional AI answer each give a severity. The AI can only raise it (`sentinel/index.ts:84-87`).
- The AI is TypeSafe Jev when `TYPESAFE_API_KEY` is set. Otherwise the configured model stands in when one is set (`llmOn()`, section 27: OpenRouter with Claude Haiku 5.5 by default, or Anthropic with a key). Otherwise there is none. The AI has a 6 s limit (`SENTINEL_AI_TIMEOUT_MS`, `sentinel/decide.ts:69-83`).
- Only escalations act (`sentinel/index.ts:87`):
  - `hold`: the owner must co-sign the next payment (`tools.ts:202`).
  - `freeze`: an on-chain `Pocket.freeze(reason)` with `SENTINEL_PK`, sent through the ledger (`sentinel/index.ts:14-18`, section 21).
- A freeze falls back to a hold if the key is missing or the call fails (`sentinel/index.ts:89-93`).
- A hold clears after a co-signed payment (`sentinel/index.ts:34-39`). A freeze clears when the owner unfreezes on-chain, checked every 15 s (`sentinel/index.ts:49-56`, `109`).
- Sentinel watches are in memory: a restart starts every pocket at `ok`, but the persisted event buffer is replayed into the next evaluation (`sentinel/index.ts:73`).

## 14. Pocket apps (`server/src/pocketApp`) and rules compile (`server/src/rules/compile.ts`)

`POST /api/rules/compile` ("Speak your rules", `rules/compile.ts:57-76`):
- Without a configured model (`llmOn()`, section 27) or an injected one, only the fixed parser `parseSentence` runs (`compile.ts:65-66`).
- With one, two readings run in parallel, for the roles `rules` and `rulesCheck` (`modelFor`, `compile.ts:68-69`). On OpenRouter both use the one chosen model (Claude Haiku 5.5 by default) unless a per-role override is set; on Anthropic they default to `claude-sonnet-5-5` and `claude-haiku-5-5` (`RULES_MODEL`, `RULES_CHECK_MODEL`). Both use a forced `propose_pocket` tool (`compile.ts:67-70`).
- The system prompt says every amount is HK$ (Mock e-HKD): "$5", "5 dollars" and "HK$5" all mean HK$5.00, never US dollars (`compile.ts:38`).
- The tool's `cap`, `budget` and `askAbove` fields are described in HK$ (`compile.ts:20-22`).
- Each field is validated. A bad field falls back to the parser's value (`compile.ts:43-50`).
- The two drafts merge with `stricterDraft`. Any disagreement takes the stricter value and is listed in `disagreements` (`compile.ts:72`).
- The `proof` card is computed by code: `worstCase, lines, neverPayable, tests` (`compile.ts:75`, `shared/sim/speak.ts:152-157`).
- Nothing here creates or changes a pocket; the owner signs that (`compile.ts:60`).

`POST /api/pocket-app/compose` (`pocketApp/compose.ts:27-61`):
- It runs `compileRules`. When Claude read the rules, it keeps the stricter of Claude's and the fixed parser's draft (`compose.ts:31-34`).
- The fixed picker `pickApp` gives a baseline spec and an agent choice (`compose.ts:35`).
- With a model (`deps.model` or `llmOn()`, `compose.ts:37`), the `pocketApp` role's model (`modelFor("pocketApp")`, `compose.ts:41`; `POCKET_APP_MODEL` on Anthropic, default `claude-sonnet-5-5`) is forced to call `compose_pocket_app`. The tool's input schema is the zod `Spec` (`compose.ts:18`, `40-44`).
- The spec must pass both the zod schema (`pocketApp/schema.ts:32-39`) and the shared `validateSpec`. Otherwise the picker's spec is used and `specErrors` lists up to 6 errors (`compose.ts:20-25`, `46-47`).
- A routine can only be stricter than the picker's: `stricterRoutine` merges them (`compose.ts:49-53`). A routine only the model found is dropped (`compose.ts:55-56`).
- `specBy` says which spec was returned: `claude` or `picker`.
- The model picks blocks from a fixed catalogue. It never writes UI and never sees seller content (`compose.ts:5`).

Schema limits (`pocketApp/schema.ts`):

| Part | Limit |
| --- | --- |
| Every object | strict |
| `title` | 1-28 plain-word chars, no links, addresses, amounts or markup (`schema.ts:36`) |
| `blocks` | 2-8 (`schema.ts:37`) |
| `routine.kind` | `schedule`, `price-watch` or `renewals` (`schema.ts:26`) |
| `routine.items` | 1-4 (`schema.ts:28`) |
| Amounts | up to 4 integer digits and 6 decimals, above zero (`schema.ts:8`) |

## 15. Agent loop and memory (brief)

The full description is in `docs/ai-brain.md`.
- `buildRequest` uses `modelFor("agent")` (`agent/loop.ts:24`) and `AGENT_EFFORT` (default `high`, `agent/loop.ts:26`). The model id depends on the provider (section 27): Claude Haiku 5.5 on OpenRouter by default, `AGENT_MODEL` (default `claude-opus-5-5`) on Anthropic.
- It sets `max_tokens: 16000`, the `server-side-fallback-2026-07-01` beta and `fallbacks: "default"` (`agent/loop.ts:25-28`). On OpenRouter those Anthropic-only fields (`betas`, `fallbacks`, `output_config`) are removed before the request is sent (`llm.ts:79-83`).
- It appends the current memory snapshot to the system prompt.
- Tool results from one step go back in one user message (`agent/loop.ts:85`).
- With the scripted fallback (`runTurn` option `fallback`, which `/api/chat` always passes), a model error or a missing model moves the rest of the turn to the scripted agent and calls `onFallback`, which `/api/chat` turns into a `trace` event with `phase: "model"` (`agent/loop.ts:44-47`, `59-65`, `index.ts:119-122`). It is never silent.
- Memory is on when `BRAIN_MEMORY` is not `off` and a memory model was injected or a model is configured (`index.ts:55`).
- `reflect` asks the `memory` role's model (`modelFor("memory")`, `BRAIN_MEMORY_MODEL` on Anthropic, default `claude-haiku-5-5`) for a typed `write_memory` call, with two attempts (`brain/reflect.ts:31-58`).
- Memory snapshots and their audit log are saved to the `memory` table after every change, so they survive a restart (`brain/memory.ts:23-40`).
- Evidence lines are built from typed event fields only, never from seller text (`brain/evidence.ts:13-29`).
- Only the last `BRAIN_KEEP_TURNS` (default 3) owner turns of raw history are kept (`brain/window.ts:5`); the history is stored in the `chats` table (`index.ts:51`, `123`).

## 16. Explorer (`server/src/explorer.ts`)

FISCO has no public explorer, so the wallet API serves a read-only one. It has no indexer; every request reads the node (`explorer.ts:13`). It is open: no token is needed.

| Method | Path | Response | Errors |
| --- | --- | --- | --- |
| GET | `/api/explorer/summary` | `{chain, chainId, latest, token, tokenSupply, labels}` (`explorer.ts:83-89`) | |
| GET | `/api/explorer/blocks` | `?before=&limit=` (default 15, max 50); block summaries (`explorer.ts:91-97`) | |
| GET | `/api/explorer/block/:n` | block with tx `hash, from, to` (`explorer.ts:99-105`) | 400 `BAD_BLOCK`, 404 `NOT_FOUND` |
| GET | `/api/explorer/tx/:hash` | tx, receipt, `toName`, the decoded call `{contract, function, args}`, decoded logs (MockEHKD, factory, pocket ABIs); for a reverted transaction also `revert {name, args, message}`, `revertSource` and, for a replay, a `note` (`explorer.ts:107-122`) | 400 `BAD_HASH`, 404 `NOT_FOUND` |
| GET | `/api/explorer/address/:a` | balances, nonce, pocket rules if it is a pocket, txs from the latest 300 blocks (max 50) (`explorer.ts:124-155`) | 400 `BAD_ADDRESS` |
| GET | `/explorer` | HTML page (`explorer.ts:157`) | |
| GET | `/explorer/tx\|address\|block/:id` | redirect to `/explorer#/<kind>/<id>`, for MetaMask's link format (`explorer.ts:158-159`) | |

The explorer explains a revert (`explainRevert`, `explorer.ts:42-50`) with the ledger's `revertOf` (section 21): the exact reason from the node's native receipt when it is configured, otherwise a replay of the call on the latest state, which the response labels as a replay because the state may have moved. `decodeCall` names the contract, function and arguments with the project's own ABIs (`explorer.ts:24-36`). `GET /api/tx/:hash` returns the same `call` and `revert` fields (`index.ts:90-91`).

The pocket rules on an address are read straight from the contract (`explorer.ts:134-146`):

| Field | Read from |
| --- | --- |
| `owner`, `agent`, `cap`, `askAbove`, `expiresAt`, `revoked` | `owner()`, `agent()`, `perPaymentCap()`, `askAbove()`, `expiresAt()`, `revoked()` |
| `frozen` | `frozen()`; `false` if the pocket lacks it |
| `allowance {per, limit, spentThisPeriod}`, or `null` when there is none | `periodKind()`, `periodLimit()`, `spentThisPeriod()`; none if the pocket lacks them |

The four later getters fall back to `false` and zero, so a pocket from an older factory still shows as a pocket (`explorer.ts:137-138`).

- The HTML page shows an "Allowance" row (for example "HK$3.00 per week (HK$2.30 spent this week)") and a "Frozen" row (`explorer.ts:211`).
- Per-seller caps are not shown by the explorer; `verify/verify_pocket.py` reads them (see `05-security-and-monitoring.md`).

- Labels name the token, the legacy shared agent key (when `AGENT_PK` is set), each card's own agent key as "Agent key, card <visitorId>#<n>" (from `agentLabels`, section 20), the factory and each seller's `payTo` (`explorer.ts:62-69`).
- Blocks and transactions are read raw (`explorer.ts:72-77`), because FISCO console transactions overflow viem's formatter (`docs/technical-document.md` §7a item 9).
- FISCO's `[PRECOMPILED]` pseudo-code is treated as an account, not a contract (`explorer.ts:132-133`).
- `cfg().txUrl` links to `PUBLIC_API_URL/explorer#/tx/<hash>` (`chains.ts:33`). The apps read that prefix from `/api/config`.

## 17. Faucet (`server/src/faucet.ts`)

| Method | Path | Body | Response | Errors |
| --- | --- | --- | --- | --- |
| GET | `/api/faucet/info` | none | `{chainId, chainName, rpc, explorer, token, symbol, decimals, amount, enabled}` (`faucet.ts:26-29`); `rpc` is `publicRpc()` (`chains.ts:42-47`) | |
| POST | `/api/faucet` | `{address}` | `{ok, tx, minted, nativeFunded, explorer}` (`faucet.ts:31-55`) | 400 `BAD_ADDRESS`, 429 `ALREADY_CLAIMED` with `retryAfterSec`, 429 `TOO_MANY_REQUESTS`, 500 `FAUCET_FAILED`; 400 `FAUCET_ONLY_ON_FISCO` (unreachable today: `cfg().key` is always `fisco`, `chains.ts:31`) |
| GET | `/faucet` | none | HTML page (`faucet.ts:57`) | |

Callers: web `console/Faucet.tsx:30`, `51`; Expo `src/lib/api.ts:90`. The faucet is open: it needs no visitor token, and it is separate from the sign-up funding (section 19).

- Limits: one claim per address per 24 h, 10 requests per IP per hour (`faucet.ts:39-43`). They are in memory and reset on restart (`faucet.ts:15-17`).
- The IP is read from `x-real-ip` or the first `x-forwarded-for` entry (`faucet.ts:36`).
- A failed claim does not use up the address's allowance (`faucet.ts:52`).
- Each claim credits native balance if the address has none (`fund.ts:9-22`). Then `OWNER_PK` mints `FAUCET_AMOUNT` (default 100) eHKD through the ledger's `write` (`faucet.ts:45-50`).
- Mints run one at a time, because FISCO does not order a sender's transactions by nonce: the ledger keeps one queue per sender (`faucet.ts:47`, `ledger.ts:98-110`).

## 18. What the dev stack adds

`devstack/src/stack.ts` mounts the real `apiApp()` and adds `/dev/*` on the same port:

| Route | What it does |
| --- | --- |
| `GET /dev/health` | dev-mode detection (`stack.ts:110`) |
| `POST /dev/rpc` | JSON-RPC proxy to the node; answers `eth_getLogs` with the gateway's windowed scan and splits batches over the node's limit of 8 (`stack.ts:114-126`) |
| `POST /dev/fund` | native balance plus HK$160 eHKD (`stack.ts:127-134`) |
| `GET /dev/scenes` | demo sentences (`stack.ts:135`) |
| `POST /dev/force-transfer` | compromised-agent backstop with the stack's own agent key; publishes `forced` (`stack.ts:147-169`) |
| `/dev/relay/*` | phone-to-console relay (`stack.ts:171`) |

- It replaces the agent model with the scripted keyword router, which now lives in the server (`server/src/agent/scripted.ts`; `stack.ts:10`, `103`; `devstack/README.md`). The real server runs the same router as its fallback (section 27).
- It no longer wraps `POST /api/chat`: attack sentences become `attack` events inside the real server (`index.ts:125`, section 24).
- It sets `PUBLIC_RPC_URL` to its own `/dev/rpc`, so `/api/config` hands the apps the proxy, not the bare node (`stack.ts:73`).
- Visitor auth stays on, and the stack keeps its visitors in memory (`DATA_DIR=memory`, `stack.ts:74-75`).
- It points the ledger at the local node's native receipt for exact revert reasons when the SDK certificates exist (`stack.ts:76-77`).
- The real server has none of the `/dev/*` routes.

## 19. Visitor accounts and the route guard (`server/src/visitors.ts`)

The owner's key lives on the owner's device; the server never sees it. One EIP-712 `Login` signature over a single-use server nonce proves the key, and the server answers with a session token (`visitors.ts:13-22`).

| Method | Path | Body | Response | Errors |
| --- | --- | --- | --- | --- |
| POST | `/v1/challenge` | `{owner}` | `{owner, nonce, issuedAt, chainId}`; the nonce is 32 random bytes, valid for 5 minutes (`visitors.ts:126-134`, `32`) | 400 `BAD_ADDRESS` |
| POST | `/v1/visitors` | `{owner, nonce, issuedAt, signature}` | sign-up, or sign-in if the account exists: `{visitorId, owner, createdAt, funding, created, token, explorer?}`, status 201 for a new account and 200 otherwise (`visitors.ts:136-151`) | 400 `BAD_ADDRESS`, 400 `BAD_REQUEST`, 401 `CHALLENGE_EXPIRED`, 401 `BAD_SIGNATURE`, 429 `SIGNUPS_FULL` |
| POST | `/v1/login` | same | `{...visitor, token}` for an existing account (`visitors.ts:153-159`) | same, and 404 `NO_SUCH_VISITOR` |
| GET | `/v1/me` | header `x-visitor-token` | the visitor `{visitorId, owner, createdAt, funding}` (`visitors.ts:161-164`) | 401 `VISITOR_TOKEN_REQUIRED` |

Login check (`checkLogin`, `visitors.ts:79-90`):
- The nonce is deleted on first use, even when the signature is wrong (`visitors.ts:84`). It is refused as `CHALLENGE_EXPIRED` if it was never issued, was issued for another owner or another `issuedAt`, or is older than 5 minutes (`visitors.ts:85-86`).
- The signature is checked with `verifyTypedData` against the typed data in `shared/chain/login.ts:6-24`: domain `{name: "ChainBrain", version: "1", chainId}`, type `Login(statement, owner, nonce, issuedAt)`, and the statement "Sign in to ChainBrain. This signature moves no money and approves no payment." It authorises nothing on-chain.
- Pending challenges are kept in memory; the map is cleared if it passes 10 000 entries (`visitors.ts:33`, `129`).

Accounts:
- The visitor id is `v-` plus 16 hex digits of `keccak256(owner address, lower case)` (`visitors.ts:36`), so signing up twice with one key is one account (`visitors.ts:139-141`).
- New accounts are limited to `VISITORS_PER_HOUR` (default 60) across the whole server (`visitors.ts:34`, `143`).
- A new visitor is funded with real transactions before the answer is sent: native balance if the key has none, and `VISITOR_STARTER` (default 500) HK$ minted by `OWNER_PK` through the ledger (`visitors.ts:105-121`, `38`). `funding` holds `nativeFunded`, `mintTx`, `minted` or `error`. A failure is kept and funding is retried at the next sign-up while there is no `mintTx` (`visitors.ts:147`). Two simultaneous sign-ups share one funding job (`visitors.ts:102`, `107`).
- A token is 32 random bytes in base64url. Only `keccak256(token)` is stored, with a 7-day expiry, and at most 5 tokens per visitor are kept (`visitors.ts:31`, `92-98`). `visitorByToken` looks the hash up among all visitors (`visitors.ts:44-48`).
- Visitors are saved in the `visitors` table (`visitors.ts:30`).

The guard (`guard(c, pocket?)`, `visitors.ts:65-76`) runs in this order:
1. Off entirely when `VISITOR_AUTH=off` (`visitors.ts:42`, `66`).
2. No valid token: 401 `VISITOR_TOKEN_REQUIRED`.
3. If a pocket is named: not an address, 400 `BAD_POCKET`; its on-chain `owner()` (read once and cached, `pocketOwner`, `visitors.ts:50-59`) is not the visitor's owner key, or cannot be read: 403 `NOT_YOUR_CARD`.

| Routes behind the guard | Pocket checked |
| --- | --- |
| `POST /api/chat`, `POST /api/memory/forget` | the body's `pocket` |
| `POST /api/approvals/:id` | the approval's pocket |
| `POST /api/rules/compile`, `POST /api/pocket-app/compose`, `POST /api/radar/ask`, `POST /api/radar/alerts/:id/close` | none: a valid visitor only (they cost a model call, or change shared state) |
| `POST /api/routine`, `/pause`, `/edit`, `/run` | the body's `pocket` |
| `POST /api/arena/straight` | the body's `pocket` |
| `POST /v1/starter` | every card in the body (and a token is required even when `VISITOR_AUTH=off`) |
| `POST /v1/cards/agent` | none, and a token is required even when `VISITOR_AUTH=off` (section 20) |

Everything else, including the events, `/api/pending`, `/api/memory`, `/api/sentinel`, `GET /api/routine`, the explorer and the faucet, is open to read. The evidence for two visitors being unable to act on each other's card is `server/test/visitors-chain.test.ts` (`NOT_YOUR_CARD`).

## 20. Per-card agent keys (`server/src/agentKeys.ts`)

Each card gets its own agent key, derived on use and never stored (`agentKeys.ts:8-14`).

- A card id is `<visitorId>#<n>` (`agentKeys.ts:47`).
- The key is `keccak256(AGENT_MASTER_KEY ‖ cardId) mod n`, where `n` is the secp256k1 order, and 0 becomes 1 (`deriveAgentKey`, `agentKeys.ts:16`, `33-37`). `AGENT_MASTER_KEY` must be `0x` plus 64 hex digits; otherwise per-card keys are off and the server warns once (`agentKeys.ts:25-31`).
- `POST /v1/cards/agent` (`agentKeys.ts:89-98`) returns `{cardId, agent}` for the visitor's next card, to put in `factory.create`. It needs a visitor token even when `VISITOR_AUTH=off` (401 `VISITOR_TOKEN_REQUIRED`), and answers 503 `PER_CARD_KEYS_OFF` without a master key. Every call takes the next number, so asking twice uses two (`newCardAgent`, `agentKeys.ts:42-53`).
- The table `agent-cards` maps agent address to card id only to skip a search, and `agent-counters` holds each visitor's next number (`agentKeys.ts:20-21`). If the card table loses an entry, the owner's own visitor id rebuilds it by trying card numbers 0 to 63 (`agentKeys.ts:17`, `72-81`).

`agentKeyFor(agent, owner)` (`agentKeys.ts:60-83`) is the only way a signing key is chosen:
1. If the pocket's agent is the legacy `AGENT_PK`, that key (`agentKeys.ts:62-63`).
2. Otherwise a derived key, and only when the card was issued to the owner's own visitor: a recorded card of another visitor is refused (`agentKeys.ts:68-70`), and the search only tries the owner's own id (`agentKeys.ts:66`, `72-81`). A card cannot borrow another visitor's agent.
3. Anything else: no key, so the payment is refused as `NOT_THIS_AGENT`.

Used by `agentFor` for settlement and pre-flight (`wallet/pay.ts:20-23`, `wallet/preflight.ts:34`), by the arena (`arena.ts:37`) and, as labels, by the explorer (`agentLabels`, `agentKeys.ts:86`, `explorer.ts:65`). The evidence is `server/test/agent-keys-chain.test.ts`.

## 21. The ledger: every transaction the server sends (`server/src/ledger.ts`)

FISCO BCOS 3.16.4 behaves differently from an Ethereum node, so every transaction goes through this module (`ledger.ts:10-21`; the probes are in `server/scripts/probe-fisco.ts`):

| Behaviour of the node | What the ledger does | Where |
| --- | --- | --- |
| Transactions are legacy, gas price 0 | sends `type: "legacy"`, `gasPrice: 0n` | `ledger.ts:156`, `176` |
| Nonces are a set, not a sequence, and the node's count drifts after a burst | one transaction per sender at a time (a promise queue per address), a local nonce of `max(node count, last used + 1)`, and on `NonceCheckFail` or "nonce too low" it moves past and retries up to 6 times | `serial` `ledger.ts:105-110`; `withNonce` `118-131`; `isNonceRefusal` `112` |
| Blocks seal only when a transaction arrives, and `eth_call` runs at the head block's time | `now()` is the later of the head's time and the wall clock; `freshHead()` sends a zero-value self-transfer from `TICK_PK` (else `FACILITATOR_PK`) when the head is older than 30 s, and concurrent callers share one tick | `ledger.ts:70-73`, `76`, `83-94` |
| A reverted transaction is mined with status 0 and no revert data | after the receipt, `revertOf` finds the reason and `write` throws `RevertError` with the hash | `ledger.ts:159-162`, `212-222` |
| `eth_getLogs` can silently return only 10 blocks from `fromBlock` | `scanLogs` walks in chunks of `LOG_STEP` (`FISCO_LOG_STEP`, default 10), 8 calls in flight | `ledger.ts:251-266` |

The calls:
- `write(pk, call, {fresh?, simulate?})` simulates the call first and throws `RevertError` with source `simulate` before sending anything if it would revert; then sends, waits up to 60 s for the receipt, and throws `RevertError` (source `native` or `replay`, with the hash) if it was mined and reverted (`ledger.ts:141-165`).
- `sendRaw(pk, {to, data, gas?})` sends without simulating and returns the receipt, with the decoded revert if there is one; it never throws for a revert. Default gas is 1 500 000. The arena uses it because the chain's own refusal is the evidence (`ledger.ts:167-183`).
- `queuedSigner(pk)` is the signer the in-process facilitator uses, so every settlement goes through the same queue and nonce logic (`ledger.ts:185-203`).
- `revertOf(hash)` asks the node's native receipt first, through the gateway method `chainbrain_getRevertData` at `FISCO_REVERT_RPC`, or directly with mutual TLS at `FISCO_NATIVE_RPC` using the SDK certificates in `FISCO_SDK_DIR`. Without either it replays the call with `eth_call` on the latest state and labels the answer `replay`; if the replay succeeds it says the state has moved (`ledger.ts:207-247`).
- `decodeRevert` reads a custom error, `Error(string)` or `Panic` with the ABIs of Pocket, PocketFactory and MockEHKD (`ledger.ts:24-43`).

Who uses it: visitor funding (`visitors.ts:112`), the faucet (`faucet.ts:48`), the Sentinel's freeze (`sentinel/index.ts:17`), the facilitator (`facilitator.ts:15`), the arena (`arena.ts:50`, `82`), settlement's tick (`pay.ts:67`), Radar's log step (`radar/chainSource.ts:4`, `9`), the explorer and `/api/tx` (`explorer.ts:11`, `43`) and the RPC proxy (`rpcProxy.ts:5`). The evidence is `server/test/ledger-chain.test.ts`.

## 22. Routines (`server/src/routines.ts`)

A routine is a card's standing order: what to buy, when, and at most how much per period. The owner sets it; the server runs it on schedule through the same wallet tools a chat uses (quote, Radar, pre-flight, the card's own agent key, x402), so every run is real payments with real hashes (`routines.ts:16-26`). The routine's fields are fixed: nothing a seller delivers can change them.

| Method | Path | Body | Response | Errors |
| --- | --- | --- | --- | --- |
| GET | `/api/routine` | `?pocket=` | the routine, or `null` (`routines.ts:173`) | none |
| POST | `/api/routine` | `{pocket, spec}` | the new routine (`routines.ts:175-180`) | visitor, 400 `INVALID_ROUTINE` with `detail` |
| POST | `/api/routine/pause` | `{pocket, paused}` | `{ok: true}` (`routines.ts:181-186`) | visitor, 404 `NO_ROUTINE` |
| POST | `/api/routine/edit` | `{pocket, cadence?, allowance?}` | the edited routine, same id, run count and spend (`routines.ts:187-192`) | visitor, 400 with the message (for example `NO_ROUTINE`, or the validation errors) |
| POST | `/api/routine/run` | `{pocket}` | `{ok: true, run, outs, paid, spent, nextAt}` or `{ok: false, reason}` with `NO_ROUTINE`, `ROUTINE_PAUSED`, `BUSY` or `POCKET_REVOKED` (`routines.ts:193-198`, `73-155`) | visitor |

- The spec is checked with `validateRoutine` against the live seller directory (`routines.ts:33`, `40`, `62`). Kinds are `schedule`, `price-watch` (one item, a price limit) and `renewals` (`shared/sim/pocketApp.ts:104`, `126`). Periods are day, week and month.
- The server keeps its own list of the routine's payments in the `routines` table, so the routine's allowance is counted per routine and survives a restart and an edit (`routines.ts:27-28`, `112`). It is separate from the pocket's on-chain period allowance, which also applies.
- A run: `newTask`, then a confirmed intent of its own (per-item max is the card's cap, total is cap times the item count, one-hour deadline, intent hash `keccak256("routine:<id>:<run>")`) (`routines.ts:90-96`).
- For each item it calls the `get_quote` tool. A `price-watch` publishes a `quote` event and does not buy when the price is above its limit (`routines.ts:104-108`). A pocket refusal other than `OVER_PERIOD` is recorded as `refused` (`routines.ts:110-111`).
- The owner is asked instead of the server paying when the price would pass the routine's allowance for the period, when it is above the card's ask-me limit, or when the pocket says `OVER_PERIOD` (`routines.ts:112-134`). It creates a `payment` approval with the exact authorization and waits up to `APPROVAL_WAIT_MS`. A decline or a timeout is recorded as `declined` (`OWNER_DECLINED` or `APPROVAL_EXPIRED`) and nothing is paid. An approval puts the owner's signature on the quote, so the payment settles as co-signed.
- Payment goes through the `pay` tool, so Radar, the Sentinel hold, pre-flight and settlement all apply (`routines.ts:135`). Outcomes are `paid`, `cosigned`, `watching`, `declined` or `refused` (`routines.ts:70`).
- If a delivered text contains routine-changing words ("from now on", "switch sellers", "raise your limit" and similar), a `routine` event of kind `ignored` records the line and the routine is unchanged (`routines.ts:31`, `139-143`).
- A due run for a revoked pocket is skipped, not queued: the schedule moves on and a `skipped` event says why (`routines.ts:79-83`).
- The scheduler checks every `ROUTINE_TICK_MS` (default 30 000 ms) and runs every active routine whose time has come, one after another (`routines.ts:158-169`; started at `index.ts:168`).
- `routineOf(pocket)` returns the routine without its payment list (`routines.ts:32`, `37`). The evidence is `server/test/routines-chain.test.ts`.

## 23. Starter cards (`server/src/starter.ts`)

A new account should not open empty. Right after sign-up the device creates two small cards with its own key, then calls `POST /v1/starter` (`starter.ts:9-15`).

- Body `{cards: [brief, watch]}`, visitor token required even when `VISITOR_AUTH=off` (401 `VISITOR_TOKEN_REQUIRED`, `starter.ts:22-23`). Every card must be the visitor's own (`starter.ts:27`, 403 `NOT_YOUR_CARD`).
- 409 `ALREADY_SEEDED` (with `at` and `txs`) when this visitor has run it before; 400 `BAD_CARDS` unless `cards` is a list of 1 or 2 addresses (`starter.ts:24-26`). The claim is written before any payment, so a second call cannot double up (`starter.ts:28`), and it is once per visitor even if a payment failed.
- The first card buys Exa `durian-news` and CoinGecko `eth-price`; the second buys Nansen `wallet-balances` (`starter.ts:17`).
- Each payment is `fetchQuote`, `track` and `settle` with intent hash `keccak256("starter:<visitorId>:<card>")` (`starter.ts:33-35`). This is `settle` called directly (section 6, step 6): the pocket's on-chain rules decide, but there is no intent, Radar or pre-flight step.
- The response is `{payments: [{card, sellerId, sku, tx?, reason?}], balances}` with each card's balance in atomic units (`starter.ts:41`). A seller that answers free is `NOT_PRICED`; a thrown error is its message cut to 80 characters (`starter.ts:34`, `37`).
- The claim is saved in the `starter` table (`starter.ts:16`). The evidence is `server/test/starter-chain.test.ts`.

## 24. The attack arena (`server/src/arena.ts`)

The arena runs the attacks on the real chain. Its premise is that the AI was fully fooled (`arena.ts:15-23`).

`POST /api/arena/straight {pocket}`:
- Visitor-only for the named pocket (`arena.ts:94-95`). Limited to `ARENA_PER_IP_DAY` (default 20) per IP per day, else 429 `ARENA_LIMIT` (`arena.ts:25`, `96`). 409 `NOT_THIS_AGENT` if this server holds no key for the pocket's agent (`arena.ts:44`, `98`).
- `straightToChain` (`arena.ts:42-60`): the card's own agent key signs "send HK$50 to the attacker" `0x…ABC0` with a random nonce and an empty owner signature; it first reads the pocket's own `canPay` reason (`arena.ts:45-48`). The transfer is submitted raw, with no simulation, to the token from `TICK_PK` (else `FACILITATOR_PK`), which only carries the agent's signature (`arena.ts:33`, `50`). The pocket refuses, and the transaction is mined as reverted.
- It never throws for a revert. The response is `{tx, reverted, to, amount, balanceBefore, balanceAfter, reason?, revert?, revertName?, revertSource?, signedBy, via: "agent", explorer}`: a real reverted hash, the pocket's reason code from `canPay`, and the decoded revert (`arena.ts:53-57`). It also publishes a `forced` event (`arena.ts:58`).

`publishAttack(pocket, text)` runs after every chat turn (`index.ts:125`). `attackOf` (`agent/scripted.ts:159`) classifies the sentence (`arena.ts:63-88`):

| Class | What happens | Event |
| --- | --- | --- |
| `extraction` (asks for data) | nothing is revealed | `attack`, `reason: DISCLOSURE_REFUSED`, `asked` (`arena.ts:67`) |
| `induced` (asks the agent to send money outside a purchase) | nothing is sent | `attack`, `reason: NOT_A_PURCHASE` (`arena.ts:68`) |
| `escalation` (claims to be the admin or owner, or asks to raise the cap or allow a seller) | the card's agent key really sends `setCap(HK$n)` (unless the sentence is only about sellers) and/or `setSeller(0x…ABC0, true)` (when it mentions a seller or allow list) to the pocket, raw; the pocket reverts each because only the owner may (`arena.ts:73-75`) | `attack`, `reason: NOT_OWNER`, `tx`, `txs[{call, tx, reverted, revert}]`, `from` (`arena.ts:69-87`) |

For escalation the agent address is first given native balance if it has none, since FISCO senders need it (`arena.ts:79`). Every `attack` event has `verdict: "refused"` and `by: "agent"` (`arena.ts:66`), and the Sentinel counts it. The evidence is `server/test/arena-chain.test.ts`.

## 25. Read-only RPC proxy (`server/src/rpcProxy.ts`)

`POST /rpc/fisco` is a JSON-RPC proxy to the chain for anyone: wallets, judges, and the apps when no public RPC is set (`rpcProxy.ts:7-13`). It is the fallback of `publicRpc()` (section 2.1).

- Only read methods pass: `eth_chainId`, `net_version`, `web3_clientVersion`, `eth_blockNumber`, `eth_getBlockByNumber`, `eth_getBlockByHash`, `eth_getTransactionByHash`, `eth_getTransactionReceipt`, `eth_call`, `eth_getLogs`, `eth_getCode`, `eth_getBalance`, `eth_getStorageAt`, `eth_getTransactionCount`, `eth_estimateGas`, `eth_gasPrice`, `eth_maxPriorityFeePerGas` (`rpcProxy.ts:14-18`). Anything else, including `eth_sendRawTransaction`, is refused with -32601 (`rpcProxy.ts:36`).
- `eth_getLogs` needs an `address`, does not accept `blockHash`, and the range may be at most `FISCO_PROXY_MAX_BLOCK_RANGE` (default 5000) blocks (`rpcProxy.ts:37-44`). The error says some FISCO nodes return only 10 blocks per call, so callers should scan in steps of 10.
- A batch may hold at most `FISCO_PROXY_MAX_BATCH` (default 20) requests, an empty batch is refused, and a batch is always answered as an array, because FISCO answers a one-element batch with a bare object (`rpcProxy.ts:66-73`).
- Each IP has `FISCO_PROXY_RATE_PER_MIN` (default 600) requests per minute, else 429 with -32005 (`rpcProxy.ts:20`, `62`). A bad body is 400 with -32700; an upstream failure is 502 with -32010 (`rpcProxy.ts:64`, `75`).
- One local method, `chainbrain_getRevertData(hash)`, returns the decoded revert of a mined transaction: `{name, args, message, raw, source}` (`rpcProxy.ts:49-54`, section 21).

## 26. Persistence and rate limits (`server/src/store.ts`, `server/src/limits.ts`)

`table(name)` is a small JSON-file table (`store.ts:4-8`, `11-44`):
- Files live in `DATA_DIR`, default `server/.data`; on Railway that is the volume. `DATA_DIR=memory` keeps everything in memory (tests, the dev stack) (`store.ts:9`, `12`).
- Writes are debounced by 200 ms and atomic (a temporary file, then rename). `bigint` values are written as strings (`store.ts:25-31`, `36`).

| Table | Holds | Defined at |
| --- | --- | --- |
| `visitors` | accounts and the hashes of their tokens | `visitors.ts:30` |
| `agent-cards`, `agent-counters` | agent address to card id; each visitor's next card number | `agentKeys.ts:20-21` |
| `approvals` | every approval (a pending one loads as `timeout`) | `wallet/approvals.ts:18` |
| `events` | the last 1000 events | `wallet/events.ts:16` |
| `chats` | each card's recent conversation | `index.ts:51` |
| `memory` | every memory snapshot and its audit log | `brain/memory.ts:24` |
| `routines` | each card's routine and its payment list | `routines.ts:28` |
| `starter` | which visitors have had their starter payments | `starter.ts:16` |

Kept in memory only, so a restart forgets them: tasks, intents and quotes (`wallet/state.ts:11`), Radar's transfer index and alerts, Sentinel watches, the faucet's claim limits, the rate-limit windows, login challenges, the sellers' injected texts and deals. On-chain state is unaffected. The evidence is `server/test/persist.test.ts`.

Rate limits (`limits.ts:23-35`, mounted at `index.ts:57-58`):
- A per-IP sliding window, 60 seconds, applies to `/api/*` and `/v1/*`: `RATE_LIMIT_PER_MIN` (default 60) for writes and `RATE_LIMIT_GET_PER_MIN` (default 600) for reads. Over the limit: 429 `RATE_LIMITED`. `OPTIONS` and the SSE stream `/api/events` are not counted (`limits.ts:29`).
- The IP is `x-real-ip` or the first `x-forwarded-for` entry, which Railway's proxy sets (`limits.ts:4`).
- Separate windows exist for sign-ups (`VISITORS_PER_HOUR`), the arena (`ARENA_PER_IP_DAY`), the RPC proxy (`FISCO_PROXY_RATE_PER_MIN`) and the faucet (section 17). A window forgets all its keys if it passes 50 000 (`limits.ts:16`).

## 27. The model provider (`server/src/llm.ts`)

One switch decides every model call: the agent loop, rules compile, pocket-app compose, memory, Radar's "Ask" and the Sentinel's AI answer (`llm.ts:3-13`).

- `LLM_PROVIDER` is `openrouter` (the default), `anthropic` or `scripted` (`llm.ts:37-40`). `llmOn()` is true when the provider is not `scripted` and its key is set (`OPENROUTER_API_KEY` or `ANTHROPIC_API_KEY`) (`llm.ts:43-46`).
- OpenRouter: the request goes to OpenRouter's Anthropic-compatible endpoint, `https://openrouter.ai/api` (or `OPENROUTER_BASE_URL`) (`llm.ts:64-76`). `modelFor(role)` takes `LLM_MODEL_<ROLE_ENV>` for the role, else `LLM_MODEL`, else Claude Haiku 5.5. Only five preset models are allowed: `claude-haiku-5.5`, `glm-5.3-flash`, `deepseek-v4.1-flash`, `mimo-v2.6-pro`, `mimo-v2.6-flash`. Any other id falls back to Haiku 5.5, so no other Anthropic model can run (`llm.ts:17-26`, `53-58`). The Anthropic-only fields `betas`, `fallbacks` and `output_config` are removed (`llm.ts:79-83`).
- Anthropic: `ANTHROPIC_API_KEY` and a model id per role: `AGENT_MODEL` (default `claude-opus-5-5`), `RULES_MODEL` (`claude-sonnet-5-5`), `RULES_CHECK_MODEL` (`claude-haiku-5-5`), `POCKET_APP_MODEL` (`claude-sonnet-5-5`), `BRAIN_MEMORY_MODEL`, `RADAR_MODEL` and `SENTINEL_MODEL` (each `claude-haiku-5-5`) (`llm.ts:28-35`, `59`).
- Scripted: no model; the agent runs the scripted agent in `server/src/agent/scripted.ts` and the other features use their fixed paths (`llm.ts:10-11`).
- `createMessage` throws when no model is configured, and each caller keeps its own fallback (`llm.ts:85-90`). For the agent, `/api/chat` falls back to the scripted agent when the model is missing or errors, and says so in a `trace` event with `phase: "model"` (`index.ts:119-122`, `agent/loop.ts:44-65`).
- `/api/config` reports `model: {provider, model, on}` (`llm.ts:93`, `index.ts:78`).
- Keys come only from the environment. The evidence is `server/test/llm.test.ts` and `server/test/agent.test.ts`.
