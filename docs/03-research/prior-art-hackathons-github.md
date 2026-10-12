# Prior art: hackathon winners and open-source projects overlapping ChainBrain
Last updated: 2026-10-13

## In one minute

- **Answer first:** almost every piece of ChainBrain has been built before, in a simple form. The "agent wallet with spend limits" is the most crowded winning shape of 2026. What we found NO hackathon winner doing is the seller side: verifying the buying agent before serving it. Industry (Visa, Mastercard, Cloudflare, Skyfire, World) does it, but off-chain and closed.
- **Biggest finding:** a same-topic rival exists. `sucsage/agentic-wallet` (FinTechathon 2026, Topic F, public, last push 2026-10-12) already has on-chain tiers, caps, allowlists, an injection test and a Base Sepolia deploy. A plain "limit wallet" will look like that entry.
- **Second finding:** our "challenge inside the 402" is not new. The official x402 docs ship a Sign-In-With-X (SIWX) extension that puts a nonce in the 402 and takes a signed header back, and it supports smart-contract wallets (ERC-1271). Use it; do not claim to have invented it.
- **Third finding:** the freshest, closest security work is IntentGuard (June 2026 paper plus repo): intent frozen as a mandate, limits enforced on-chain, prompt injection down from about 50% to 0% in its own simulation (its figures, not ours). Judges who know it will ask how we differ.
- **Our strongest real edge:** seller guards that combine agent identity, principal KYC binding, pocket state and reputation into one machine-readable verdict the agent re-plans from. Reputation help is backed by a July 2026 study: 59-91% of ERC-8004 reviewers look like coordinated Sybils.
- **What to do:** headline the seller-side trust verdict and the live re-plan; treat the pocket as a must-have security base, not the pitch; adopt SIWX and standard x402 payloads; show a visible side-by-side against "a plain limit wallet".

## Closest prior art (table)

Placings come from the event page where marked "page (opened 2026-10-13)". Others are copied from the prior-research notes and were not re-opened today. "Stars" are GitHub stars checked 2026-10-13. Everything here is untrusted third-party data.

### Hackathon entries

| Name | Event / placing | What overlaps with ChainBrain | What ChainBrain does that it does not |
|---|---|---|---|
| Kagi Wallet | ETHGlobal Tokyo 2026: 1st in the Intercepta track "Safe Agent-to-Agent Payments with x402" (sponsor track, not an overall win); Curvegrid "Best AI Agent Project" (page) | Self-custody wallet; agent gets a capped, expiring on-chain key; smart account enforces cap and expiry; hardware co-signers above cap | No seller-side checks, no agent identity or KYC, no reason codes. Its edge is hardware (ESP32, FROST), which we do not copy |
| x402 Guard | ETHGlobal Tokyo 2026: 2nd in the same Intercepta track (page) | Screens each x402 payment before the wallet signs: pay, cap, ask or refuse; approval code bound to payee, token, amount | It checks WHO THE AGENT PAYS (buyer side, third-party Intercepta API). Nothing verifies who the buyer is. Local limits, not on-chain |
| Lifeline | Tokyo 2026: 3rd "DeFi, Payments, Agents" (Sui); World "Best Use of World ID for Agents" (page) | A World ID human owes the agent's x402 debt; unpaid debt goes to the human | Credit, not trust. Seller verifies nothing per the page |
| Reckon402 | Open Agents 2026: 2nd "Most Creative Use of ENS" (prior note) | x402 settlements write ERC-8004 reputation; escrow released as reputation grows | Reputation here is built from settlement history only (cold start problem). No KYC anchor, no pocket |
| maki | ETHGlobal Cannes 2026 finalist (prior note) | Model never holds keys; policy plus hardware signing; World AgentKit as human proof | Single-user DeFi agent, no merchant side |
| ENShell | Cannes 2026 finalist plus Chainlink CRE prize (prior note) | "On-chain firewall" for agents: permission policies, threat score, approval queue | Agent-side firewall; no seller guards |
| AEGIS (Lisbon) / Aegis402 (Open Agents) | Lisbon: 0G infra prize, no rank; Aegis402: finalist (prior note) | Pre-transaction safety layer, pre/post audit and escrow for agent payments | Buyer-side screening and escrow. No seller identity gate |
| LedgerMind | ETHOnline 2026 "Help an Agent Use Your Hackathon Project", no rank (prior note) | Payment-intent contract: total cap, per-tx cap, window, merchant allowlist, revoke; MCP server | Sei testnet, no x402, no seller side. Its own README admits a committed private key earlier |
| Capsule, Harness, Novi Corpus | ETHOnline/Lisbon 2026 (ENS runner-up; Ledger 1st; Identity Check 1st) (prior note) | Agent identity via ENS plus on-chain limits; accountable human guardian for an agent | Identity for the agent's owner, not a verdict a merchant can query |
| Argus | LIVE AI Ivy Plus 2026, FinTech 2nd (prior note) | Payment guardian: limits, merchant rules, human approval | Buyer side only |
| Sup Wallet, Mercantill, AgentPay | Sui Overflow 2026 "Agentic Web" 1st (Sup Wallet; re-confirmed 2026-10-13 from a search summary of the Sui Foundation winners post dated 27 Aug 2026, not opened in full); Solana Cypherpunk stablecoin 4th; Yuno x Nauta 1st (prior notes) | Plain spend-limit agent wallets (consumer, enterprise, payments) | Same gap: no seller verification |
| The Wallet Shift | NY 2026 finalist (prior note) | ERC-8004 agent directory | Directory only; no gate at the seller |

### Same-competition entry

| Name | Status | What overlaps | Gap versus ChainBrain |
|---|---|---|---|
| sucsage/agentic-wallet | FinTechathon 2026 Topic F, 0 stars, created 2026-10-06, pushed 2026-10-12 (GitHub) | Scoped expiring session key; tiers 0-3 on-chain; per-tx and daily caps; recipient allowlist; N-of-M approval; "send everything to 0xEvil" test; Base Sepolia | No seller side, no identity or KYC, no x402 (milestone escrow instead), no reason-code loop. Strong evidence culture (19 contract tests, 8/8 agent eval per the earlier competitor note) is the bar to match |

### Open source and industry specs

| Name | Date / stars | What overlaps | What ChainBrain does that it does not |
|---|---|---|---|
| Visa Trusted Agent Protocol (`visa/trusted-agent-protocol`) | Launched 2025-10 (snippet); 212 stars | Merchant verifies agent identity via signed requests, consumer link, browse vs pay intent. Built with Cloudflare on Web Bot Auth (RFC 9421) | Closed card-network directory; no spending limits mentioned in the Cloudflare post; no on-chain pocket; not x402 |
| Cloudflare Web Bot Auth | Post dated 2025-10-24 (page); 167 stars | Signed-request agent authentication, key directory, nonce, used by Visa and Mastercard | HTTP-level identity only, no principal KYC or pocket scope |
| Skyfire KYAPay | Launched 2025-06-26 (snippet); 13 stars [VERIFY: still not found; on 2026-10-13 `gh search` showed skyfire-xyz/kyapay_a2a at 2 stars and the IETF-draft repos at 0-1, so "13" is probably wrong, do not use it] | Identity JWT (verified owner info) plus payment JWT (capped USDC); DataDome uses it on the seller side (snippet) | Custodial platform token model; ours is wallet-native, on-chain, open |
| World AgentKit | Launched 2026-03-17 (snippet, secondary press) | Human-backed agent proof, integrates with x402; sites can ask for payment, human proof, or both | Proof of unique human (iris scan; privacy and regulatory controversy incl. Hong Kong per Forklog snippet), not KYC tier, not pocket scope, not KYB |
| IntentGuard (`DogukanGun/intent-binding`) | Paper 2026-06-07; pushed 2026-10-07; 0 stars | Intent frozen as EIP-712 mandate; ERC-7715/7710 caveat enforcers on-chain; CaMeL planner; x402 on Base Sepolia; claims 49.7% to 0.0% attack success, 97.9% autonomy | No seller guards, no identity, no reputation. Enforces via delegation redemption, not an ERC-1271 check on the standard x402 payload |
| PragmaMoney | 2026-02; 1 star | ERC-8004 identity NFT, ERC-4337 agent account with daily limit and allowed targets, x402-style proxy, reputation oracle | Custom proxy and gateway contract instead of standard x402; no seller-side verification of the paying agent in the code I skimmed |
| `kawasekit/merchant` (@x402kit/merchant) | 2026-05; 0 stars | Seller middleware for x402 with ERC-4337 smart-account payers; signed 402 challenge, nonce | Verifies a Transfer event by tx hash; grep found no ERC-1271 or identity logic. Pure payment gate |
| ERC-8004 contracts and SDKs | EIP created 2025-08-13, Draft (page); `erc-8004/erc-8004-contracts` 239 stars; mainnet reported late Jan 2026 (snippets, dates differ) | Identity, reputation, validation registries; our registry is "ERC-8004-style" | The EIP itself says payments are out of scope and Sybil attacks are possible |
| Agent Passport System | 49 stars; pushed 2026-10-12 | Agent identity, scoped delegation, signed receipts (SDK) | Off-chain protocol; no x402 pocket |
| x402 SIWX extension | Official docs | Nonce in the 402, signed header back, EIP-1271 and EIP-6492 support (off by default, needs a verifier) | Identity only; no KYC, pocket or reputation |
| `dingdawg/dingdawg-agent-spend-policy-mcp` | 0 stars; created 2026-08-05 | MCP evaluator returning ELIGIBLE, DENY or STEP_UP with a stable reason code | Local, no chain. Shows reason codes are an easy idea others have also had |
| Coinbase Agentic Wallets; MetaMask Agent Wallet | 2026-02-11 (snippet); MetaMask launch date not confirmed [VERIFY] | Vendor wallets with spend limits, session caps, MCP/CLI access | Vendor-run; no merchant-facing verdict |

## Honest novelty verdict per ChainBrain feature

| Feature | Verdict | Why | Emphasise or downplay |
|---|---|---|---|
| Seller guards (identity + principal binding + pocket scope + reputation + seller rules in one verdict) | **Partly new.** New among hackathon winners (none found); not new as an idea (Visa TAP, Mastercard Agent Pay, KYAPay, World AgentKit all let a merchant verify an agent) | The combination, plus on-chain pocket state and a refusal the agent can act on, is not in any project I found. Search tools are weak, so "none found" is not proof [VERIFY] | **Emphasise.** Frame as the open, on-chain, cross-border counterpart of Visa/Alipay trust, for x402 |
| Pocket with on-chain enforcement | **Not new.** Kagi, sucsage, PragmaMoney, LedgerMind, IntentGuard, Capsule, Coinbase, MetaMask | Narrow possible edge: enforcing the rules inside an ERC-1271 check on the standard x402 USDC authorization so ordinary facilitators work. I did not find another project doing exactly that, but cannot rule it out [VERIFY] | **Downplay as a headline; do it flawlessly** (security 30%). Say "enforced by the contract, proven live" in one line |
| Challenge-in-402 (agent identity) | **Not new.** SIWX is the official x402 way | Our twist (one nonce binding the agent key, the quote and the payment) is small engineering | **Downplay.** Say "standards-based". Adopt SIWX header format [VERIFY compatibility with the pocket's signature scheme] |
| Buyer-side intent privacy (seller never sees limits; intent hashed) | **Weakly new.** AP2 also claims role-based privacy; IntentGuard freezes intent on-chain | The "seller sees only pass/fail" property is a real, checkable benefit against the "information extraction" test point | **Emphasise briefly** as the answer to a scoring item, not as an invention |
| Reason-code re-planning | **Mechanism common, closed loop rare.** x402 Guard, dingdawg and the Pink policy repo all return verdicts and reasons | I found no project where the seller's refusal reason drives a live LLM re-plan inside a pocket with a tx hash at the end | **Emphasise.** This is what Innovation 30% (correction, fallback, clarification) is judged on. Show it live |
| KYC cold-start reputation | **Moderately new, well motivated.** Reckon402 builds reputation from settlements; Lifeline and World use proof-of-human; the 2026 study shows raw ERC-8004 feedback is mostly Sybil | A KYC-anchored owner solves the empty-reputation start. The KYC issuer is simulated in the demo, so claim the design, not a real bank link | **Emphasise with the study's numbers.** Do not claim real KYC |
| BYOA MCP + SKILL.md | **Not new.** LedgerMind, Coinbase `awal`, Kagi "Connect your AI", link-cli all ship MCP or skills | Still valuable: judges can plug their own agent into the test | **Downplay as novelty; keep as must-have** for task completion and for judges' own attacks |

## What the evidence says about winning (context)

| Evidence | Reading |
|---|---|
| Prior ETHGlobal analysis (676 prize entries, 111 finalists, Jan 2025 to Sep 2026) | Plain agent wallets and x402 gateways are saturated; what placed was "a specific missing piece around the payment" (screening, refunds, disputes, credit). Source: [round7 ethglobal note](../../reference/prior-research/notes/round7/ethglobal.md) |
| Tokyo 2026 "1st" and "2nd" are both Intercepta sponsor-track results | Do not tell the team "ETHGlobal gave agent wallets the top prize". It was one sponsor track |
| FinTechathon scoring differs from ETHGlobal | 40% task completion by tx hash, 30% security (incl. prompt injection and induced transfers), 30% innovation and interaction. Evidence culture (tests, attack suite, one-command replay) matters more than novelty of the wallet |
| Direction F field on 2026-10-12 | One strong visible entry (sucsage). Most teams do not publish, so this is a floor ([competitors note](../../reference/prior-research/docs/competitors-2026.md)) |

## What this means for winning

- [must] **Headline the seller-side trust verdict, not the wallet.** Open the pitch with "merchants cannot tell who is paying; here is the verdict they get", and show the pocket only as the reason the verdict can be trusted. Helps Innovation 30 / Security 30.
- [must] **Prepare the "isn't this a limit wallet?" answer.** One slide: Kagi, x402 Guard and sucsage protect the buyer; none lets the seller verify the buyer. Name them accurately (Kagi's 1st was a sponsor track). Helps Innovation 30.
- [must] **Run the live re-plan scene end to end with a tx hash.** Seller refuses with a code, the agent re-plans, a real Base Sepolia payment lands. No other entry shows this loop. Helps Task 40 / Innovation 30.
- [must] **Make the pocket airtight and test it like sucsage does.** Include a "send everything to the attacker" test, replay test and a judge-run injection box. Matching their evidence bar is the minimum. Helps Security 30.
- [should] **Switch the challenge to the x402 SIWX format** (nonce in the 402, signed header), with ERC-1271 verification on, so standard clients work and nobody can say we reinvented it. Check it works with our pocket's signature scheme first. Helps Task 40 / Security 30.
- [should] **Cite the ERC-8004 Sybil study** (arXiv 2606.26028) to justify KYC-anchored cold start, and cite IntentGuard (Zenodo paper, copy in our papers folder) as related work with a clear "how we differ" line. Helps Innovation 30.
- [should] **Read IntentGuard's design and borrow its tests** (9-check verify chain, replay checks), and its CaMeL-style rule that tool-tainted text cannot originate a payment. Helps Security 30.
- [should] **Publish the reason-code list as a small JSON schema** (stable codes, a human sentence, a suggested next action). Helps Innovation 30.
- [could] **Mention Visa TAP / Web Bot Auth as the Web2 equivalent** and offer RFC 9421 signatures as an alternative header. Shows we know the field. Helps Innovation 30 / Bonus.
- [could] **Compare our pocket check against PragmaMoney's custom proxy** (non-standard x402) in the pitch to show the standard-facilitator advantage, if the spike confirms it. Helps Innovation 30.
- [could] **Do not use World ID** as the identity story: iris scan, regulatory problems in Hong Kong (snippet), wrong fit for a WeBank audience. Use KYC credentials. Helps Security 30.

## Open questions

- Is there any public repo that validates an x402 USDC authorization through an ERC-1271 policy account? My GitHub searches found none, but multi-word search was unreliable. Confirm during the day-1 spike before claiming it [VERIFY].
- Does SIWX's signed message work with a smart account whose validator also needs the transfer fields? [VERIFY]
- Which Direction F entries beyond sucsage exist? Most teams do not publish. Re-run the search on 2026-10-19.
- How many reviewers the 22-23 Oct round uses and whether judges use their own agents (decides how much BYOA matters).
- ERC-8004 mainnet date: sources say late January or February 2026 (snippets). Not needed unless we claim it.
- Mastercard Agent Pay and Visa Intelligent Commerce spending-limit features (not opened today) [VERIFY].
- I did not open the Argus, Sup Wallet, Mercantill, AgentPay, ENShell, AEGIS, Reckon402 or LedgerMind event pages today; placings are from the prior notes.

## Sources

Opened pages (accessed 2026-10-13):
- https://ethglobal.com/showcase/x402-guard-t7neb
- https://ethglobal.com/showcase/kagi-wallet-tc9fp
- https://ethglobal.com/showcase/lifeline-mygz6
- https://docs.x402.org/extensions/sign-in-with-x.md (and ctx7 `/x402-foundation/x402` docs)
- https://blog.cloudflare.com/secure-agentic-commerce/
- https://eips.ethereum.org/EIPS/eip-8004
- https://thedefiant.io/news/infrastructure/world-launches-agentkit-to-let-ai-agents-carry-proof-of-human-backing (no date on page)

Search snippets only (not opened; accessed 2026-10-13):
- ERC-8004 mainnet timing: https://peerlist.io/ayaaneth/articles/what-is-erc8004 , https://www.kucoin.com/blog/es-understanding-erc-8004-on-chain-identity-standard-for-ai-agents
- Visa TAP launch: https://venturebeat.com/ai/visa-just-launched-a-protocol-to-secure-the-ai-shopping-boom-heres-what-it
- Skyfire KYAPay: https://docs.datadome.co/docs/skyfire-kyapay , https://www.streetinsider.com/Business+Wire/Skyfire+Launches+Open+KYAPay+Protocol+With+Agent+Checkout/24981183.html
- Coinbase Agentic Wallets: https://blockeden.xyz/blog/2026/02/24/coinbase-agentic-wallets-autonomous-ai-payments-2026/
- MetaMask Agent Wallet: https://decrypt.co/370239/metamask-launches-ai-agent-wallet-security-controls
- World AgentKit: https://blockeden.xyz/blog/2026/03/17/world-agentkit-sam-altman-identity-trust-layer-ai-agents-x402/ , https://forklog.com/en/world-unveils-agentkit-for-identity-verification-in-the-agent-internet/

Prior research reused as data:
- reference/prior-research/notes/round7/ethglobal.md, crypto-hackathons.md, university-ai.md, synthesis.md
- reference/prior-research/docs/competitors-2026.md, github-landscape-2026.md

GitHub searches via `gh search repos` and the GitHub API, 2026-10-13.

Papers (reference/papers/prior-art/):
- 2026-xiong-erc8004-empirical-trustless-agents.pdf (arXiv 2606.26028; Sybil reviewer share 73.5% / 59.2% / 90.6% on Ethereum / BSC / Base in v2, per search abstract)
- 2026-jiang-formal-analysis-agent-payment-protocols.pdf (arXiv 2609.00060)
- 2026-hardening-x402-pii-safe-agentic-payments.pdf (arXiv 2604.11430)
- 2026-intentguard-x402-intent-binding-injection.pdf (copied from the cloned repo)

Repos cloned (reference/repos/prior-art/, shallow, never built or run):
- x402-guard, kagi-wallet, reckon402, LedgerMind, intent-binding, PragmaMoney, kawasekit-merchant, visa-trusted-agent-protocol, cloudflare-web-bot-auth, enshell-contract, agent-passport-system, skyfire-kyapay, sucsage-agentic-wallet

See also: [master index](../README.md), [how to win](../06-pitch/how-to-win.md), [recommended changes](../02-product/recommended-changes.md)
