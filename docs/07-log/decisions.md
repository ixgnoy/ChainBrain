# Decisions log
Last updated: 2026-10-14

> **Superseded by v2 (14 Oct):** rows dated 2026-10-13 that mention the seller-side trust layer, bring-your-own-agent via MCP and SKILL.md, the "no full wallet app" choice, ERC-1271 not being new, and the owner-signed one-off payment describe the OLD design. v2 (see the 14 Oct rows at the bottom) moves the seller layer, bring-your-own-agent and FISCO BCOS to the finals roadmap.

Rows marked "from spec" were visible in the [spec](../02-product/product-design.md) on 13 Oct; they are inherited, not newly debated. Add new rows at the bottom. Proposed (undecided) changes live in [recommended changes](../02-product/recommended-changes.md).

| Date | Decision | Why | By |
| --- | --- | --- | --- |
| 2026-10-13 | Enter International AI Track, Topic F (Agent Wallet) | Fits an on-chain trust idea; judged by tx hashes (from spec) | team (from spec) |
| 2026-10-13 | Idea: ChainBrain, seller-side trust layer plus pocket (from spec) | Differentiates from buyer-only wallets | team (from spec) |
| 2026-10-13 | Base Sepolia first; real mainnet USDC only if organisers require it | Free testnet, verifiable hashes, existing x402 facilitator (from spec) | team (from spec) |
| 2026-10-13 | FISCO BCOS deployment is a bonus, not core; ECDSA mode only | WeBank relevance but untested risk (from spec) | team (from spec) |
| 2026-10-13 | Cut the zero-knowledge proof; keep as "production path" | Scope (from spec) | team (from spec) |
| 2026-10-13 | Day-1 spike decides the pocket design; fallback is a capped hot wallet with on-chain registry and revoke | Risk control (from spec) | team (from spec) |
| 2026-10-13 | Own in-house agent for the demo; BYOA via MCP + SKILL.md as the product claim | Repeatable scenes (from spec) | team (from spec) |
| 2026-10-13 | No full wallet app; thin consoles (seller, owner) | Avoid chat-to-transfer look (from spec) | team (from spec) |
| 2026-10-13 | Market: Hong Kong/APEC via partner; not mainland consumers | Yinfa No. 42 (from spec; wording flagged for fix) | team (from spec) |
| 2026-10-13 | Docs reorganised into numbered folders on branch docs/master-docs; original docs moved unchanged | Shared structure | editor (overnight run) |
| 2026-10-13 | PROPOSED: fix the build-week agent as Claude Sonnet 5.5 and the Shenzhen model as Qwen3.7-plus (DeepSeek V4 Pro second, recorded replay offline); model is a config string | Claude is probably unusable from mainland China ([model choice](../04-build/agent-model-choice.md)) | proposed, team decides by 15 Oct |
| 2026-10-13 | PROPOSED: semantic intent check = rule-based diff first, plus a checker from a different lab | Same-model check is correlated ([model choice](../04-build/agent-model-choice.md)) | proposed |
| 2026-10-13 | PROPOSED: mainnet decision rule (required if organisers say so; no answer by Sun 18 12:00 means run Mon 19; guards `ALLOW_MAINNET=1` and US$1 cap) | Insurance for Task 40 ([mainnet plan](../04-build/topic-f-tasks-and-mainnet-plan.md)) | proposed |
| 2026-10-13 | PROPOSED: send all six deliverables and submit by 12:00 on 20 Oct | Buffer; first cut uses documents ([checklist](../06-pitch/submission-checklist.md)) | proposed |
| 2026-10-13 | PROPOSED: do not claim ERC-1271 x402 as new; headline the seller-side verdict with re-plan | edxzh/agent-wallet already does it ([rivals](../03-research/topic-f-rivals.md)) | proposed |
| 2026-10-13 | PROPOSED: four-role split (contracts, gateway and MCP, agent and frontend, pitch/docs/security) with owners blank | Gap in round 1 review ([roles](../00-start-here/roles-and-workplan.md)) | proposed |
| 2026-10-13 | PROPOSED: add owner-signed one-off payment and `get_history`; step-up instead of refuse for unverified sellers | Plain judge tasks would otherwise be refused ([Topic F tasks](../04-build/topic-f-tasks-and-mainnet-plan.md)) | proposed, spec owner must confirm |
| 2026-10-14 | Prelim entry is the consumer wallet: main wallet, pockets, in-house agent, defences against the four named attacks. Seller trust layer, attested categories, reputation, bring-your-own-agent, FISCO BCOS (planned) and privacy go to the finals roadmap | [Spec v2](../02-product/product-design.md) | team (spec v2) |
| 2026-10-14 | Pitch line: "Give your AI a pocket, not your wallet" | Spec v2, README | team (spec v2) |
| 2026-10-14 | Pocket is an ERC-1271 contract; USDC v2.2 asks it to approve each transfer; budget = balance; signature is an envelope the pocket checks against a rebuilt USDC digest | [Technical document](../technical-document.md) section 2 | team |
| 2026-10-14 | Default facilitator is the public testnet facilitator (x402.org); `FACILITATOR=local` runs the same code in-process and is the gate fallback | Plan, spec issue 1 | team |
| 2026-10-14 | Agent is a Claude tool-calling loop with six tools; default `claude-opus-5-5` at effort `high`; no `temperature`; no scripted fallback branches | Plan Global Constraints | team |
| 2026-10-14 | Three owner apps on one wallet API: web (MetaMask), Expo Go phone app (on-device key), native Android app (Keystore) | [Technical document](../technical-document.md) section 6 | team |
| 2026-10-14 | Four test sellers (DataLite, DataPro, Harbour Wines, ShadyFeed); scenes 1-8 | Spec v2, plan price sheet | team |
| 2026-10-14 | The 13 Oct PROPOSED rows on model (Sonnet 5.5 build, Qwen3.7-plus Shenzhen), semantic checker, ERC-1271-not-new headline, one-off payment and the seller-side headline are not adopted as written. Mainnet rule and the submit-by-noon target remain open or proposed | Compared with the plan and spec | docs audit (14 Oct) |
| 2026-10-16 | Built-in network sells real x402 data: Exa (US$0.007 web search), CoinGecko (US$0.01 price), Nansen (US$0.01 / US$0.05 wallet data), with official logos; the durian deal stays the task. TradeWire, Harbour Wines and ShadyFeed stay fictional (Radar, refusal, injection) | Real providers and logos make the demo concrete and visual; prices come from each provider's own x402 docs; no real company is shown as malicious. The real server keeps DataLite/DataPro: on Base Sepolia it pays the team's addresses, so real names there would be false | owner + Claude |
