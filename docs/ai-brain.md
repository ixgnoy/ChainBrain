# 链AI脑 ChainBrain: the AI brain
Last updated: 2026-10-16

The pocket contract is the hard limit: it holds even if every AI here is fooled. The AI brain is what makes the agent worth giving a pocket to. It understands the task, shops, adapts, resists attacks, screens who it pays, watches itself, remembers, turns the owner's words into rules, predicts every payment and negotiates the price.

Three rules hold for every feature:

1. **AI only tightens.** No AI output can loosen a pocket, add a seller, raise a limit or move money. The Sentinel can freeze but never unfreeze; memory never changes the pocket; spoken rules still need the owner's signature.
2. **Seller text never reaches a free-text model as instructions.** Seller content arrives as `<untrusted_content>`; the haggler sees prices only; Radar, the Sentinel and Pre-flight read the chain and the wallet's own record.
3. **One source for both networks.** The rules live in `shared/sim` (Radar, Sentinel, haggle, proof card) and are used by the server and by the apps' built-in network, so a demo with no server shows the same events as a real run.

All ten features appear on the phone's **Brain** tab for the active pocket (your rules and worst case, spent, Understood, How it shopped, Stopped, Radar, Pre-flight and Sentinel, Remembers), and as cards in the agent chat.

## The ten features

| # | Feature | What the owner sees | How it works | Scene |
| --- | --- | --- | --- | --- |
| 1 | **Understands the request** | One sentence becomes a task card; at most one question instead of a guess ("US$0.10 in total or per lookup?") | `draft_intent` returns a structured intent; the card is rendered from a fixed template, never the model's words | 1 |
| 2 | **Plans and buys** | It compares sellers by asking for prices, pays alone below ask-me, asks above it | Tools `search_sellers`, `get_quote`, `pay`, `ask_owner`; every payment's nonce maps back to the intent | 1-3 |
| 3 | **Adapts to refusals** | "Harbour Wines isn't on this pocket's list, so I bought Exa's search instead"; a dead end ends with a one-tap fix | Every refusal returns a reason code (`server/src/wallet/reasons.ts`) the model re-plans from | 4, 8 |
| 4 | **Resists manipulation** | Hidden orders quoted and marked IGNORED; data and signature asks refused; "I'm the admin" refused | `<untrusted_content>` wrapping, no personal data in context (`DISCLOSURE_REFUSED`), only in-rule USDC digests signed (`SIGNATURE_TYPE_NOT_ALLOWED`), no tool edits a pocket | 5, 6 |
| 5 | **Radar** (who it pays) | Each seller scored 0-10 with a plain reason and the money trail; a later drainer payment raises an alert on every pocket that paid that seller | Exposure tracing over labelled addresses (`shared/sim/radar.ts`, `server/src/radar/`); score 9+ refuses (`COUNTERPARTY_HIGH_RISK`), mid scores ask the owner (`COUNTERPARTY_REVIEW`); continuous re-screening; `/api/radar/*` | 9 |
| 6 | **Sentinel** (a second AI watching) | "Held for your OK", then "Froze this pocket on-chain. Only you can unfreeze it." | Rules on the event stream (3 refusals in a minute, money leaving with no payment, a refusal right after a seller page gave orders) plus typed AI questions that can only raise the response; freeze through Pocket.sol's guardian key (`freeze`, owner-only `unfreeze`, `POCKET_FROZEN`, `SENTINEL_HOLD`) | 10 |
| 7 | **Brain memory** | Preferences, sellers to avoid, open tasks and past buys, each with **Forget**; a version number | After each task a typed reflection is validated and consolidated, rewritten not stacked (`server/src/brain/`, `/api/memory`, `/api/memory/forget`); only from the owner's words and the wallet's record | all |
| 8 | **Speak your rules** | "Max US$5 a week, only Exa, ask me above US$1" fills the create form, with a proof card of what each rule means | `/api/rules/compile`: two model readings merged stricter-wins, a fixed parser as fallback, a computed proof card; the owner still signs | wizard |
| 9 | **Pre-flight** | "Predicted 9 of 9 payments correctly before sending them"; predicted vs actual on each paid card | Every payment is simulated first (server: `eth_call` of the exact `transferWithAuthorization`; built-in: a dry run), then checked against what happened (`server/src/wallet/preflight.ts`) | all |
| 10 | **The haggler** | A price ladder: asked US$1.50, you US$0.90, they US$1.20, you US$1.05, final US$1.10, "US$0.40 saved, numbers only" | Tool `counter_offer`; seller endpoint `POST /<seller>/<sku>/offer`, then the 402 for `?deal=<id>` (one use); guards in `shared/sim/haggle.ts` | 11 |

## The haggler's guards

Enforced by code, not by the model (`checkOffer` in `shared/sim/haggle.ts`, used by the server's `counter_offer` and the built-in network):

| Guard | Reason code |
| --- | --- |
| An offer is below the seller's current price and never above its first quote | `OFFER_NOT_LOWER` |
| Never above the task's max per item | `PRICE_ABOVE_INTENT` |
| 3 offers at most per quote (taking the seller's counter is still allowed) | `NEGOTIATION_ROUNDS_USED` |
| Only items the seller marks negotiable | `NEGOTIATION_NOT_OFFERED` |
| No new offers once a price is agreed, approved by the owner or paid | `DEAL_ALREADY_AGREED`, `QUOTE_ALREADY_APPROVED`, `QUOTE_ALREADY_PAID` |

The seller's agent sees prices only, never the owner's details or any text, and its floor stays private. A deal can only make a payment cheaper; the ask-me limit and the pocket's rules still apply to the agreed price, so in scene 11 the owner still co-signs US$1.10.

## Models

| Where | Model (server) | Without a key |
| --- | --- | --- |
| Agent loop | Claude Opus (`server/src/agent/loop.ts`) | `SCENE_REPLAY=1` replays scripted turns |
| Memory reflection | Claude Haiku (`BRAIN_MEMORY_MODEL`), forced tool call, validated before it is kept | The old memory is kept unchanged |
| Speak your rules | Claude Sonnet and Claude Haiku in parallel (`RULES_MODEL`, `RULES_CHECK_MODEL`), merged stricter-wins | The fixed parser |
| Sentinel AI | TypeSafe Jev when `TYPESAFE_API_KEY` is set, else Claude Haiku | Rules only |
| Ask Radar (`/api/radar/ask`) | Claude Haiku (`RADAR_MODEL`), answering from typed tool results only | Radar's scores and alerts still work |

The built-in network runs the scripted agent, a scripted reflection and the fixed parser through the same shared rules; its Sentinel AI score is labelled "scripted".

## Where to see it

- **Phone:** the Brain tab; the chat cards (Radar, Sentinel, haggle ladder, predicted-vs-actual on paid cards); the Radar alert page.
- **Auto-play:** long-press the chat header for about 1.5 s; scenes 1-11 play by themselves and the run closes on the scene-1 pocket's Brain tab ([demo runbook](06-pitch/demo-runbook.md)).
- **Status of real-model runs:** the server features are tested with scripted and stand-in models; a recorded run of the brain with real models on Base Sepolia is still to do ([status and plan](00-start-here/status-and-plan.md)).

Build log and decisions: [AI brain tracker](superpowers/plans/2026-10-15-ai-brain-phone.md), [brain memory plan](superpowers/plans/2026-10-15-brain-memory.md).
