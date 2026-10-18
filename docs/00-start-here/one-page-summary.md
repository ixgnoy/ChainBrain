# ChainBrain in one page
Last updated: 2026-10-17

> **Status (14 Oct, v2):** rewritten for the team's [Prelim Product Spec v2](../02-product/product-design.md) (consumer wallet). The 13 Oct version described a seller trust layer with seven guards. That design is now a finals roadmap item. The older text is in git history (commit 42a41f2).

## In one minute

- **ChainBrain (链AI脑)** is a consumer wallet where you open **pockets** for your AI agent. Pitch line: **Give your AI a pocket, not your wallet.**
- A pocket is a small smart contract that holds its own Mock e-HKD (eHKD) and its own rules. The agent spends from it on-chain by itself over x402. Every payment is checked by Radar, a pre-flight test and the pocket's own contract, while the Sentinel watches for attacks. A hijacked agent spends only from that pocket's own balance and only to sellers the owner approved.
- **Entry:** FinTechathon 2026, International AI Track, Topic F (Agent Wallet). Chain: FISCO BCOS 3.16.4 (chain id 20200), with a Mock e-HKD test token. Mock e-HKD is not the HKMA e-HKD and is not money.
- **Prelim scope:** main wallet, pockets, an in-house agent that plans and pays, and defences against the four attacks the scoring names. On top, an **AI brain** of ten features (Radar, Sentinel, memory, Speak your rules, Pre-flight, the haggler and more) that only ever tightens what the agent may do ([ai-brain.md](../ai-brain.md), 16 Oct). **Finals roadmap (not in the prelim demo):** seller trust layer, attested seller categories, reputation, bring-your-own-agent, production money, privacy.
- **Status:** built and tested on FISCO BCOS, locally and on Railway ([evidence](../evidence-fisco.md)); deck, video and submission are still to do. See [status and plan](status-and-plan.md).
- **Do first:** ask the organisers whether hashes from a team-hosted FISCO chain count; rehearse the demo on the Railway stack.

## Plain-English words (defined once)

| Word | Meaning |
| --- | --- |
| Agent | An AI program that acts for a person, such as buying a data report |
| Pocket | A small contract wallet (ERC-1271) holding Mock e-HKD for one agent, with rules: allowed sellers, per-payment cap, ask-me threshold, expiry, revoke |
| Ask me above | Payments over this amount also need the owner's signature. 0 means ask every time |
| x402 | A way for websites to say "pay first" (HTTP 402) and take a payment inside the same web request |
| Mock e-HKD (eHKD) | Our test token in Hong Kong dollars (6 decimals, EIP-3009). Free test money, not the HKMA e-HKD |
| Wallet tool layer | The server code that holds the agent key and signs only in-rule payments. The AI model never sees a key |
| Intent | What the owner confirmed the agent may buy: item, max price, quantity, deadline. Shown from a fixed template, not AI wording |
| Reason code | A short refusal reason (for example `SELLER_NOT_ALLOWED`) the agent reads and re-plans from |
| FISCO BCOS | WeBank's blockchain. The demo transactions live on a FISCO BCOS 3.16.4 node (chain id 20200) |

## The story

- **Problem.** Giving an agent your wallet is all-or-nothing: it spends everything, or you approve every payment. Alipay's AI Pay and UnionPay's agentic payment protocol keep the limits on the platform's side. Our difference: the limits live in a contract the user owns.
- **User.** A person or small-business owner who wants an agent to buy small things (data, reports, bookings) without watching every step.
- **What it does.** The owner funds a pocket and picks its rules. The agent drafts an intent, the owner confirms, the agent picks a seller, gets a quote and pays. Above the ask-me amount the owner co-signs on web or phone.
- **Why it can win.** The scoring rewards real on-chain hashes (task 40%), refusal even when the AI is fooled (security 30%), and visible AI behaviour: clarify, re-plan, safe stop (interaction 30%). Every test point is answered on the wallet side ([spec scoring map](../02-product/product-design.md)).
- **What it is not.** Not the first AI wallet with limits. Same-topic rivals ship limit wallets and ERC-1271 x402 payments ([rivals](../03-research/topic-f-rivals.md)). Our claim is narrow: hard limits the user owns, checked by the pocket at settlement, with an agent that adapts to refusals.

## Demo in 8 scenes (plus 9-11 for the AI brain)

> **16 Oct:** the built-in network now uses real x402 providers (Exa, CoinGecko, Nansen) and scenes 9 (Radar), 10 (Sentinel) and 11 (haggler); the current table is in the [README](../../README.md) "Demo scenes". The list below is the 14 Oct v2 core.

Four test sellers, all stock x402 endpoints: DataLite (HK$2.30 and HK$2.70), DataPro (HK$11.70), Harbour Wines (HK$3.10, not allowed), ShadyFeed (free preview, the attacker).

1. Create and fund the Research pocket (HK$40, cap HK$15, ask above HK$8); one sentence; one clarifying question; intent card.
2. Agent buys DataLite's report (HK$2.30).
3. DataPro's report (HK$11.70) is above ask-me; the owner co-signs on web or phone.
4. Harbour Wines is refused (`SELLER_NOT_ALLOWED`); the agent re-plans to DataLite.
5. Injection ignored; a forced transfer reverts on-chain; judges can type their own attack in the red-team box.
6. ShadyFeed asks for personal data and an "approval" signature; refused.
7. Revoke mid-task, return funds.
8. Dead-end pocket: the agent stops safely and suggests a fix.

## What is real and what is simulated

| Real (on FISCO BCOS, chain 20200) | Simulated or not yet proven |
| --- | --- |
| Pocket contract rules, x402 payments, revoke, owner co-sign | Sellers (four demo endpoints from one template) |
| Agent loop re-planning from reason codes | Money (Mock e-HKD; not a licensed Hong Kong token) |
| Web, Expo and native Android owner apps | The chain is team-hosted (a local node and one on Railway), not a public network |
| | Real-model run of scenes 1-8 (needs an API key; replay mode verified) |

Budget means the pocket's balance, not a running counter.

## What this means for winning

- **[must]** Keep every claim equal to what the pocket enforces. Security 30.
- **[must]** Every core scene ends in a hash or a revert hash. Task 40.
- **[should]** Label roadmap items "Roadmap, not in prelim demo". Innovation 30.

## Open questions

See [open questions](open-questions.md). The biggest: do hashes from a team-hosted FISCO chain count for Topic F?

## Sources

- [Spec v2](../02-product/product-design.md), [technical document](../technical-document.md), [security self-assessment](../security-self-assessment.md), [FISCO evidence](../evidence-fisco.md), [README](../../README.md). Read 2026-10-17.
