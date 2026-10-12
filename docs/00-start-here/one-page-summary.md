# ChainBrain in one page
Last updated: 2026-10-13

## In one minute

- **ChainBrain (链AI脑)** is a trust layer for AI agents that pay merchants. Before money moves, the seller checks who the agent is, who it works for and what it may buy. The buyer's agent pays from a limited on-chain "pocket", so even a fooled AI cannot overspend.
- **Entry:** FinTechathon 2026, International AI Track, Topic F (Agent Wallet: an AI wallet that really spends on-chain).
- **Why it can win:** the 40% task score is judged by on-chain transaction hashes, the 30% security score rewards "refuses even if the AI is fooled", and the seller-side verdict with live re-planning is the part rivals lack.
- **What it is not:** it is not "the first to verify agents for sellers". Visa, Mastercard, Skyfire, Alipay and others do that already ([competitors](../03-research/competitors-industry.md)). Our narrow claim: seller-side authority enforced by the paying on-chain account, on stablecoin (x402) rails, with a verdict and reason code.
- **Real vs simulated:** the contracts, payments and checks are real on a test network (Base Sepolia). KYC issuers, merchants, money and licences are stand-ins.
- **Do first:** ask the organisers if testnet hashes count; pass the 14 Oct spike ([plan](status-and-plan.md)).

## Plain-English words (defined once)

| Word | Meaning |
| --- | --- |
| Agent | An AI program that acts for a person, such as buying a data report |
| Pocket | A small smart-contract wallet with its own budget and rules (price cap, allowed sellers, expiry, revoke). Technically an ERC-4337-style "smart account" |
| x402 | A way for websites to say "pay first" (HTTP 402) and take a stablecoin payment inside the same web request |
| USDC | A US-dollar stablecoin; on the test network it is free test money |
| Guard | One of seven checks the seller runs before serving an agent |
| Reason code | A short machine-readable refusal reason (for example `POCKET_SELLER_NOT_ALLOWED`) the agent reads and re-plans from |
| MCP / SKILL.md | A standard way for any AI agent to plug in tools, plus an instruction file telling it how to use them safely |
| Base Sepolia | A public test blockchain where our demo transactions live |
| FISCO BCOS | WeBank's blockchain; bonus only |

## The story

- **Problem.** An agent shows up to pay. The merchant cannot tell who it is, who it acts for, or whether this purchase is authorised. The owner fears overspending and hijacking. Merchants report low readiness (Ravelin: 29% feel very prepared; Worldpay: no liability shift yet) ([market](../03-research/market-regulation-webank.md)).
- **Users.** The owner (person or small business), the buyer agent (ours or any agent through MCP), the seller, and the auditor or regulator.
- **What it does.** Owner funds a pocket and sets rules. Agent drafts an intent, picks a seller, gets a quote, pays through x402. Seller gateway runs seven guards: agent identity, owner KYC binding, pocket scope, intent match (buyer side), payment finality, reputation, seller rules. Verdict: serve, step up (ask the owner) or refuse with a reason code.
- **Why it wins.** Rewards line up with the rubric ([how to win](../06-pitch/how-to-win.md)): real hashes, an attack-resistant pocket, visible AI behaviour (clarify, re-plan, fall back).

## Demo in 6 lines

1. Owner creates a US$2 Research pocket and says one sentence; the agent asks one clarifying question.
2. Agent compares three sellers, buys from TradeData (hash), then hires a translation agent (hash).
3. A bot with no verified owner is refused by guard 2.
4. Agent tries a seller outside the pocket, reads the reason code, picks another, and pays (hash).
5. An injected "send everything to 0xABC" is blocked by the pocket on-chain (revert hash); a judge can type their own attack.
6. Owner taps Revoke; the next payment is refused. A dead-end task stops and explains instead of retrying.

## What is real and what is simulated

| Real (on Base Sepolia) | Simulated or not yet proven |
| --- | --- |
| Pocket contract rules, payments, revoke, tx hashes | KYC/KYB issuers (labelled "simulated") |
| x402 payment flow and seller guards | Merchants (six demo sellers from one template) |
| Agent re-planning from reason codes | Money (test USDC; USDC is not a licensed Hong Kong token) |
| ERC-8004 agent identity (deployed registry) | Whether the facilitator accepts a pocket signature end to end: spike on 14 Oct |
| | FISCO BCOS deployment: bonus, untested |

Budget means the pocket's balance, not a running counter ([feasibility](../04-build/x402-pocket-feasibility.md)).

## What this means for winning

- **[must]** Describe the novelty narrowly and truthfully. Innovation 30.
- **[must]** Keep every claim equal to what the chain enforces. Security 30.
- **[must]** Every core scene ends in a hash or a revert hash. Task 40.
- **[should]** Label simulated parts on screen. Security 30.

## Open questions

See [open questions](open-questions.md). The biggest: do testnet hashes count for Topic F?

## Sources

- [Spec](../02-product/product-design.md), [judge simulation](../06-pitch/judge-simulation.md), [competitors](../03-research/competitors-industry.md), [feasibility](../04-build/x402-pocket-feasibility.md); read 2026-10-13.
