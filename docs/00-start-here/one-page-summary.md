# ChainBrain in one page
Last updated: 2026-10-14

> **Status (14 Oct, v2):** rewritten for the team's [Prelim Product Spec v2](../02-product/product-design.md) (consumer wallet). The 13 Oct version described a seller trust layer with seven guards. That design is now a finals roadmap item. The older text is in git history (commit 42a41f2).

## In one minute

- **ChainBrain (链AI脑)** is a consumer wallet where you open **pockets** for your AI agent. Pitch line: **Give your AI a pocket, not your wallet.**
- A pocket is a small smart contract that holds its own USDC and its own rules. The agent spends from it on-chain by itself over x402. The pocket checks every payment, so even a hijacked agent can lose at most the pocket's balance, and only to sellers the owner approved.
- **Entry:** FinTechathon 2026, International AI Track, Topic F (Agent Wallet). Chain: Base Sepolia testnet, test USDC.
- **Prelim scope:** main wallet, pockets, an in-house agent that plans and pays, and defences against the four attacks the scoring names. On top, an **AI brain** of ten features (Radar, Sentinel, memory, Speak your rules, Pre-flight, the haggler and more) that only ever tightens what the agent may do ([ai-brain.md](../ai-brain.md), 16 Oct). **Finals roadmap (not in the prelim demo):** seller trust layer, attested seller categories, reputation, bring-your-own-agent, the pocket on FISCO BCOS (planned), production money, privacy.
- **Status:** built and tested locally; live on-chain run, deck, video and submission are still to do. See [status and plan](status-and-plan.md).
- **Do first:** ask the organisers whether testnet hashes count; run the live gate; fund the demo wallets.

## Plain-English words (defined once)

| Word | Meaning |
| --- | --- |
| Agent | An AI program that acts for a person, such as buying a data report |
| Pocket | A small contract wallet (ERC-1271) holding USDC for one agent, with rules: allowed sellers, per-payment cap, ask-me threshold, expiry, revoke |
| Ask me above | Payments over this amount also need the owner's signature. 0 means ask every time |
| x402 | A way for websites to say "pay first" (HTTP 402) and take a payment inside the same web request |
| USDC | A US-dollar token. On the test network it is free test money |
| Wallet tool layer | The server code that holds the agent key and signs only in-rule payments. The AI model never sees a key |
| Intent | What the owner confirmed the agent may buy: item, max price, quantity, deadline. Shown from a fixed template, not AI wording |
| Reason code | A short refusal reason (for example `SELLER_NOT_ALLOWED`) the agent reads and re-plans from |
| Base Sepolia | A public test blockchain where the demo transactions live |
| FISCO BCOS | WeBank's blockchain. Planned for finals only |

## The story

- **Problem.** Giving an agent your wallet is all-or-nothing: it spends everything, or you approve every payment. Alipay's AI Pay and UnionPay's agentic payment protocol keep the limits on the platform's side. Our difference: the limits live in a contract the user owns.
- **User.** A person or small-business owner who wants an agent to buy small things (data, reports, bookings) without watching every step.
- **What it does.** The owner funds a pocket and picks its rules. The agent drafts an intent, the owner confirms, the agent picks a seller, gets a quote and pays. Above the ask-me amount the owner co-signs on web or phone.
- **Why it can win.** The scoring rewards real on-chain hashes (task 40%), refusal even when the AI is fooled (security 30%), and visible AI behaviour: clarify, re-plan, safe stop (interaction 30%). Every test point is answered on the wallet side ([spec scoring map](../02-product/product-design.md)).
- **What it is not.** Not the first AI wallet with limits. Same-topic rivals ship limit wallets and ERC-1271 x402 payments ([rivals](../03-research/topic-f-rivals.md)). Our claim is narrow: hard limits the user owns, checked by the pocket at settlement, with an agent that adapts to refusals.

## Demo in 8 scenes (plus 9-11 for the AI brain)

> **16 Oct:** the built-in network now uses real x402 providers (Exa, CoinGecko, Nansen) and scenes 9 (Radar), 10 (Sentinel) and 11 (haggler); the current table is in the [README](../../README.md) "Demo scenes". The list below is the 14 Oct v2 core.

Four test sellers, all stock x402 endpoints: DataLite (US$0.30 and US$0.35), DataPro (US$1.50), Harbour Wines (US$0.40, not allowed), ShadyFeed (free preview, the attacker).

1. Create and fund the Research pocket (US$5, cap US$2, ask above US$1); one sentence; one clarifying question; intent card.
2. Agent buys DataLite's report (US$0.30).
3. DataPro's report (US$1.50) is above ask-me; the owner co-signs on web or phone.
4. Harbour Wines is refused (`SELLER_NOT_ALLOWED`); the agent re-plans to DataLite.
5. Injection ignored; a forced transfer reverts on-chain; judges can type their own attack in the red-team box.
6. ShadyFeed asks for personal data and an "approval" signature; refused.
7. Revoke mid-task, return funds.
8. Dead-end pocket: the agent stops safely and suggests a fix.

## What is real and what is simulated

| Real (on Base Sepolia, locally verified on a fork) | Simulated or not yet proven |
| --- | --- |
| Pocket contract rules, x402 payments, revoke, owner co-sign | Sellers (four demo endpoints from one template) |
| Agent loop re-planning from reason codes | Money (test USDC; not a licensed Hong Kong token) |
| Web, Expo and native Android owner apps | Live public-facilitator run and live tx hashes (pending, [evidence](../evidence.md)) |
| | Real-model run of scenes 1-8 (needs an API key; replay mode verified) |
| | FISCO BCOS: planned, not built |

Budget means the pocket's balance, not a running counter.

## What this means for winning

- **[must]** Keep every claim equal to what the pocket enforces. Security 30.
- **[must]** Every core scene ends in a hash or a revert hash. Task 40.
- **[should]** Label roadmap items "Roadmap, not in prelim demo". Innovation 30.

## Open questions

See [open questions](open-questions.md). The biggest: do testnet hashes count for Topic F?

## Sources

- [Spec v2](../02-product/product-design.md), [technical document](../technical-document.md), [security self-assessment](../security-self-assessment.md), [evidence](../evidence.md), [README](../../README.md). Read 2026-10-14.
