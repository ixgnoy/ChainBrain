# Papers and Standards Behind ChainBrain
Last updated: 2026-10-13

## In one minute

- **Answer:** ChainBrain's core design (limits enforced by a smart-contract account, not by the AI; seller-side checks; reason codes) is backed by 2025-2026 research. We have 28 new papers and 16 standards texts on disk, plus 14 papers copied from earlier rounds.
- **Strongest backing:** (1) A deterministic check placed between the model and the money tool stopped unpermitted transfers in a large public attack test (APort Vault: 0 of 69,297 behind the check vs 140 of 76,842 with the model alone, author-reported). (2) Signed payment protocols still fail when the agent's context is poisoned (AP2 studies). This is exactly why our limits live in the pocket contract.
- **Biggest warning for us:** the first empirical study of ERC-8004 found its reputation registry is not usable as a trust signal today (most reviewers look like coordinated fake accounts; feedback is almost never tied to a real payment). Our spec builds reputation on an "ERC-8004-style" registry, so we must tie feedback to settled x402 payments and filter reviewers. See "Papers that challenge a spec claim".
- **Second warning:** x402 has real seller-side flaws (replayed payment headers, duplicate settlement, non-final settlement signals). Our seller gateway must handle idempotency and finality itself, not assume x402 does.
- **Third warning:** adaptive attackers beat most prompt-injection defences that look good on fixed tests. Our scripted injection scene proves little; judges will inject live. The on-chain pocket is our real answer, so lead with it.
- **Do now:** cite the 12 items in "Cite these in the technical doc"; add a one-paragraph "limits of ERC-8004 reputation" note to the spec; make the gateway idempotent and wait for finality; add a "directory text is untrusted" rule to the agent.
- **Gaps (honest):** no peer-reviewed paper on "Know Your Agent" exists in our searches (only vendor white papers); no paper on zero-knowledge reputation for agents (AgentValve is the closest and does not use ZK). Do not claim academic backing there.

## How to read this page

Plain-English terms used below, defined once:

- **x402:** a way for a web server to answer "402 Payment Required" and for an agent to pay in USDC and retry. A **facilitator** is a service that checks and submits the payment on-chain for the seller.
- **ERC / EIP:** Ethereum standards documents. **Draft** means not final.
- **ERC-4337 smart account:** a wallet that is a contract, so it can enforce rules (caps, allowlists) itself.
- **ERC-1271:** how a contract wallet says "this signature is valid". **EIP-3009:** USDC's "transfer with authorization" (a signed permission to move money once, with a one-time nonce).
- **ERC-7710 / ERC-7715:** standards for granting limited spending permissions ("delegations") from a smart account.
- **Prompt injection:** text hidden in data the agent reads that tries to give the agent new orders.
- **Sybil attack:** one person creating many fake identities to fake popularity.
- **Local path:** where the file sits in this repo. Everything downloaded is untrusted data; do not run code from `reference/repos/`.

## Catalogue by topic

Paths are relative to the repo root. "(snippet)" means the fact comes from a search result, not from a page or PDF we opened. New items were downloaded on 2026-10-13; first-page abstracts were read for every PDF listed as "new".

### A. Agent payments and agentic commerce

| Title | Authors, year | Venue / id | Local path | Takeaway (2 lines) | ChainBrain link |
| --- | --- | --- | --- | --- | --- |
| Five Attacks on x402 Agentic Payment Protocol (prior) | Li, Wang, Wang, 2026 | arXiv 2605.11781 | `reference/papers/from-prior/2026-li-five-attacks-on-x402.pdf` | Formal analysis plus a testbed (local chains, Base Sepolia): five attacks causing unpaid service or paid-but-denied outcomes. The payment header acts like a bearer ticket that can be replayed; the server may act on a non-final settlement signal. | Challenges: gateway "serve only after settlement" needs idempotency and a finality depth. Supports guard 5 |
| Free-Riding the Agentic Web: security analysis of x402 (prior) | Ling et al. (CityU HK), 2026 | arXiv 2605.30998 | `reference/papers/from-prior/2026-ling-free-riding-agentic-web-x402-security.pdf` | Four flaw classes (cross-resource substitution, duplicate-settlement race, allowance overdraft, denial of settlement) against official SDKs and one production deployment. Proposes mitigations. | Challenges: we use the standard SDK path; build the dedup record and bind quote to resource |
| How Agentic Is Agentic Commerce? (prior) | Ling et al., 2026 | arXiv 2607.12575 | `reference/papers/from-prior/2026-ling-how-agentic-is-agentic-commerce-x402.pdf` | On Base over 280 days: 136,708,672 settlements; 21.20% fictitious, 63.78% internal to a linked cluster. Settlement count measures what can be manufactured, not adoption. | Challenges any pitch line that quotes x402 volume as proof of demand |
| Whispers of Wealth: red-teaming AP2 (prior) | Debi et al., 2026 | arXiv 2601.22569 | `reference/papers/from-prior/arxiv-2601.22569.pdf` | Prompt injection manipulates product ranking (100% success reported) and leaks cross-user data (20%) in an AP2 shopping agent, without breaking any signature. Signatures guarantee execution, not decisions. | Supports: limits must sit in the account, not the agent |
| Beyond the Mandate: security analysis of AP2 v0.2 (prior) | Aviv et al., 2026 | arXiv 2608.23858 | `reference/papers/from-prior/arxiv-2608.23858.pdf` | 48 threats catalogued; the unsigned context that shapes a mandate (catalog data, tool results, A2A messages) is outside the signed object, so a validly signed mandate can still encode an unsafe action. | Supports our two-layer design; shows why we hash the intent but do not trust the model |
| SoK: Blockchain Agent-to-Agent Payments (prior) | Zhang et al., 2026 | arXiv 2604.03733 | `reference/papers/from-prior/arxiv-2604.03733.pdf` | Four-stage lifecycle (discovery, authorization, execution, accounting). Names four open problems: weak intent binding, misuse under valid authorization, payment-service decoupling, limited accountability. | Supports our problem statement; our nonce = hash(intent, quote) answers "weak intent binding" |
| Magentic Marketplace (prior) | Bansal et al. (Microsoft), 2025 | arXiv 2510.25779 | `reference/papers/from-prior/2025-bansal-magentic-marketplace.pdf` | Simulated two-sided agent market. Frontier models do well only under ideal search; all show strong first-proposal bias (10-30x advantage for response speed over quality); vulnerable to manipulation. | Challenges "agent compares sellers by price and reputation" (scene 2); needs a ranking rule we control |
| Protocol-Level Attacks on Agentic Commerce Platforms (new) | Louck, 2026 | arXiv 2607.21824 | `reference/papers/agent-payments/2026-louck-protocol-level-attacks-agentic-commerce.pdf` | 33 structural flaws across three platforms, deterministic and independent of the model. Root causes include marketplace content accepted without integrity checks and payment destination taken from an untrusted source with no identity binding. | Supports: pocket allowlist enforces recipient on-chain. Challenges: directory text is an injection channel. Note: studied platforms are not x402 [VERIFY which ones] |
| APort Vault: payment authorization benchmark (new) | Uchibeke (APort Technologies), 2026 | arXiv 2609.22076 | `reference/papers/agent-payments/2026-uchibeke-aport-vault-payment-authorization-benchmark.pdf` | 4,371 human-written attacks replayed on 14 models. Transfers to recipients the passport did not permit: 140 of 76,842 with model alone, 0 of 69,297 behind the check (author-reported; vendor paper). It also shows a check can allow 25,370 payments, so it is not just refusing everything. | Strongest evidence for our "enforce outside the model" claim. Vendor-authored: say so when citing |
| Agent-to-Agent Finance (new) | Gong (UCL), 2026 | arXiv 2607.00245 | `reference/papers/agent-payments/2026-gong-a2a-finance-blockchain-payments-trust.pdf` | Book-chapter style synthesis: agents need identity, authorization, payment, verification, reputation, accountability. Frames the design question as "bounded autonomy". | Vocabulary and framing for Q&A; also contains a five-part KYA breakdown (section 5.3, per snippet) |
| Autonomous Agents on Blockchains: standards, execution models, trust boundaries (new) | Alqithami, 2026 | arXiv 2601.04583 | `reference/papers/agent-payments/2026-alqithami-autonomous-agents-on-blockchains.pdf` | Survey of 317 works; five integration patterns from read-only to autonomous signing; threat model; proposes a Transaction Intent Schema and a Policy Decision Record. | Our intent JSON and reason codes line up with these two proposed abstractions; cite as prior framing |
| Secure Autonomous Agent Payments (TIVA) (new) | Acharya, 2025 | arXiv 2511.15712 | `reference/papers/agent-payments/2025-acharya-tiva-agent-payments-intent.pdf` | Proposes DIDs + credentials + on-chain intent proofs + ZK + TEE for agent payments; evaluated only qualitatively. | Close in concept to ChainBrain; no experiments, so cite as related design, not evidence |
| AgentValve: Sybil-resilient payment authorization (new) | Zhang, Luo, Kate, 9 Oct 2026 | arXiv 2610.12948 | `reference/papers/agent-payments/2026-zhang-agentvalve-sybil-resilient-payment-authorization.pdf` | Reputation as finite "capacity" on a trust graph; each payment reserves capacity, so fake identities cannot raise an honest buyer's loss bound. Evaluated on Ethereum transactions Jan-Aug 2026. Very new, not peer reviewed. | Answers the reputation weakness below; idea to borrow: cap exposure per counterparty, not by score |
| Sybil-Resistant Service Discovery (TraceRank) (new) | Shi, Joo (Operator Labs), 2025 | arXiv 2510.27554 | `reference/papers/agent-payments/2025-shi-sybil-resistant-service-discovery-x402.pdf` | Ranks x402 services by who pays them, weighted by payer reputation and recency, instead of raw volume. | Option for `search_sellers` ranking; argues payments are better endorsements than feedback |

### B. Agent identity, delegation and Know Your Agent

| Title | Authors, year | Venue / id | Local path | Takeaway (2 lines) | ChainBrain link |
| --- | --- | --- | --- | --- | --- |
| Authenticated Delegation and Authorized AI Agents (new) | South et al. (MIT, Stanford), 2025 | arXiv 2501.09674 | `reference/papers/agent-identity/2025-south-authenticated-delegation-authorized-agents.pdf` | Framework where an outside service can confirm an agent is an AI agent, acts for a specific person, and holds the needed permissions. Built on OAuth 2.0 / OpenID Connect plus agent credentials. | Names the same three questions as our guards 1-3; ChainBrain's on-chain version is the portable alternative |
| Can Trustless Agents Be Trusted? ERC-8004 empirical study (new) | Xiong et al., 2026 | arXiv 2606.26028 | `reference/papers/agent-identity/2026-xiong-erc8004-empirical-trustless-agents.pdf` | Ethereum, BSC, Base to 13 May 2026. Only 3%, 4%, 15% of registrations have a valid file and a live endpoint. Reviewer Sybil share 73.5%, 59.2%, 90.6%. 98.7-100% of feedback records carry no proof of payment or task. | Directly challenges our reputation layer (see below). Supports "registration alone earns no trust" |
| AIP: Agent Identity Protocol, Invocation-Bound Capability Tokens (new) | Prakash, 2026 | arXiv 2603.24775 | `reference/papers/agent-identity/2026-prakash-aip-agent-identity-protocol-ibct.pdf` | Signed token chain binding identity, narrowed permission and provenance across MCP and A2A; sub-millisecond verification; reports a scan of about 2,000 MCP servers with none authenticating (cited from another source, not ours). | Alternative to our session-key challenge-response; shows RFC 9421-style signing is cheap |
| Intent-Governed Tool Authorization (new) | Zhu, Wang, 2026 | arXiv 2606.22916 | `reference/papers/agent-identity/2026-zhu-intent-governed-tool-authorization.pdf` | Short-lived certificate derived from the trusted request narrows which tools and payloads are allowed; it can only narrow static policy. In tests, no completed unsafe executions; certificate precision is the remaining bottleneck. | Matches our rule "AI can only make checks stricter"; supports buyer-side intent match (guard 4) |
| Before the Tool Call: Open Agent Passport (new) | Uchibeke, 2026 | arXiv 2603.20953 | `reference/papers/agent-identity/2026-uchibeke-before-the-tool-call-open-agent-passport.pdf` | Synchronous policy check before each tool call, median 53 ms; in a live bounty test social engineering beat the model 74.6% under a permissive policy and 0 of 879 attempts under a restrictive one (author-reported). | Same pattern as our MCP server check; a possible competitor/neighbour idea in Direction F |
| Cryptographically verifiable authorization for agents (new) | Llambí-Morillas, Fernández-Fernández, 2026 | Frontiers in Computer Science 8:1966725 (arXiv 2607.21325) | `reference/papers/agent-identity/2026-llambi-cryptographically-verifiable-authorization-agents.pdf` | Argues identity plus delegation is not enough: you also need evidence that this specific request satisfies policy, ideally with private attributes hidden. Proof of concept only. | Backs our "seller learns pass or fail, never the limits" design |
| AI Identity: Standards, Gaps, Research Directions (new) | Otsuka, Toyoda, Leung, 2026 | arXiv 2604.23280 | `reference/papers/agent-identity/2026-otsuka-ai-identity-standards-gaps.pdf` | Industry-style gap analysis of agent identity across its lifecycle. Search snippet: warns that without binding a credential to a running instance, one agent can present another's identity. | Supports session-key proof of possession (guard 1) |
| AI Agents with DIDs and VCs (new) | Rodriguez Garzon et al. (TU Berlin), 2025 | ICAART 2026 (snippet); arXiv 2511.02841 | `reference/papers/agent-identity/2025-garzon-ai-agents-with-dids-and-vcs.pdf` | Each agent gets a ledger-anchored DID plus third-party-issued VCs, so agents prove ownership and trust each other at the start of a dialogue. Prototype with evaluation. | Closest academic match to our Agent ID + credential model |
| Tempting the Agent: reputation without persistent identity (new) | Gatta, Naviglio, Tarantelli, 2026 | arXiv 2609.02992 | `reference/papers/agent-identity/2026-gatta-tempting-the-agent-reputation-without-identity.pdf` | Economic model: when identities are cheap to reset, an agent can cash in its reputation and restart. Names ERC-8004, ERC-8183 and x402. | Explains why we anchor reputation on a KYC-tier owner, not on the agent ID |
| Intelligent AI Delegation (new) | Tomašev, Franklin, Osindero (Google DeepMind), 2026 | arXiv 2602.11865 | `reference/papers/agent-identity/2026-tomasev-intelligent-ai-delegation.pdf` | Framework for delegation that includes transfer of authority, responsibility, accountability, clear roles and intent. | Conceptual citation for "delegate execution, not decisions" |

### C. Prompt injection and tool-using agent defences

| Title | Authors, year | Venue / id | Local path | Takeaway (2 lines) | ChainBrain link |
| --- | --- | --- | --- | --- | --- |
| AgentDojo (prior) | Debenedetti et al., 2024 | NeurIPS Datasets and Benchmarks (snippet); arXiv 2406.13352 | `reference/papers/from-prior/2024-debenedetti-agentdojo.pdf` | Dynamic test bed with banking-type tasks; first release 97 tasks and 629 security cases (snippet). Standard yardstick for agent injection defences. | Use it to report a number if we have time |
| CaMeL: Defeating Prompt Injections by Design (prior) | Debenedetti et al., 2025 | arXiv 2503.18813 | `reference/papers/from-prior/2025-debenedetti-camel-defeating-prompt-injections-by-design.pdf` | A trusted planner writes the control flow from the user query only; untrusted data is parsed by a quarantined model; capabilities gate tool calls. 77% of AgentDojo tasks solved with provable security vs 84% undefended (arXiv abstract per search snippet). | Pattern behind "tool output is data". We apply it at the account, not in the agent code |
| Progent: privilege control for agents (prior) | Shi et al., 2025-26 | arXiv 2504.11703 | `reference/papers/from-prior/2025-shi-progent-privilege-control.pdf` | Symbolic allow rules over tool names and arguments, checked deterministically; policy updates are either narrowing (automatic) or expansion (need approval). | Same shape as pocket rules and our step-up; cite for "expansion needs the owner" |
| FIDES: information-flow control for agents (prior) | Costa et al. (Microsoft), 2025 | arXiv 2505.23643 | `reference/papers/from-prior/2025-costa-fides-information-flow-control.pdf` | Planner that tracks confidentiality and integrity labels and enforces policy deterministically; evaluated on AgentDojo. Warns that human confirmation prompts cause fatigue. | Supports minimising step-ups (ask only above X) |
| Design Patterns for Securing LLM Agents against Prompt Injections (new) | Beurer-Kellner et al. (Invariant Labs, IBM, EPFL, ETH, Google, Microsoft and others), 2025 | arXiv 2506.08837 | `reference/papers/prompt-injection/2025-beurerkellner-design-patterns-securing-llm-agents.pdf` | Catalogue of principled designs with provable resistance to injection, with the utility trade-off of each (abstract opened; individual pattern names not checked [VERIFY]). | Vocabulary for the Q&A on "how do you stop injection" |
| The Attacker Moves Second (new) | Nasr, Carlini, Hayes et al. (OpenAI, Anthropic, Google DeepMind authors per snippet), 2025 | arXiv 2510.09023 | `reference/papers/prompt-injection/2025-nasr-attacker-moves-second.pdf` | Adaptive attacks bypassed 12 recent defences, over 90% success for most, many originally reported near 0% (snippet). On AgentDojo, two defences went from about 1% to over 95% (snippet). | Challenges any "our detector blocks injection" claim. Supports hard on-chain limits |
| AutoDojo: generative benchmark for injection defences (new) | Ma et al., 2026 | arXiv 2606.15057 | `reference/papers/prompt-injection/2026-ma-autodojo-generative-pi-benchmark.pdf` | Builds adaptive attacks on top of AgentDojo; across ten defences and five models, static benchmarks often overestimate defence efficacy; under-specified tasks are most vulnerable. | Supports a fully specified intent (our template) and live red-team demo |
| Real AI Agents with Fake Memories (new) | Patlan et al. (Princeton, Sentient), 2025 | arXiv 2503.16248 | `reference/papers/prompt-injection/2025-patlan-ai-agents-cryptoland-memory-injection.pdf` | Memory injection on a Web3 agent framework triggers unauthorized transfers; CrAIBench has 150+ tasks and 500+ attack cases. Prompt-injection detectors help little once stored context is corrupted; fine-tuning helps more. | Challenges: agent memory/notes are an attack surface. Pocket cap bounds the loss |
| FinVault: financial agent safety (prior) | Yang et al. (SUFE, CUHK-SZ and others), 2026 | arXiv 2601.07853 | `reference/papers/from-prior/2026-yang-finvault-financial-agent-safety.pdf` | 31 sandbox scenarios, 963 test cases; average attack success up to 50.0% on state-of-the-art models, 6.7% for the most robust. | Evidence that model-only defence fails in finance; GitHub link in the paper (not cloned) |
| FraudBench: banking agents vs adaptive fraud (new) | Pai, Xian, 2026 | arXiv 2608.18136 | `reference/papers/prompt-injection/2026-pai-fraudbench-banking-agents.pdf` | Executable benchmark of 150 authored adversarial scenarios where a caller manipulates identity and authorization over a conversation. | Useful for our "induced transfer" and "information extraction" test prompts |
| MCPTox: tool poisoning benchmark (new) | Wang et al., AAAI 2026 (snippet) | arXiv 2508.14925 | `reference/papers/prompt-injection/2025-wang-mcptox-tool-poisoning-benchmark.pdf` | Malicious instructions hidden in tool metadata; 20 agents tested; one reached 72.8% attack success; more capable models are often more susceptible. | Our MCP tool descriptions and seller directory text are in scope |
| MCP-SafetyBench (new) | Zong et al., ICLR 2026 | arXiv 2512.15163 | `reference/papers/prompt-injection/2025-zong-mcp-safetybench.pdf` | Safety benchmark with real MCP servers across domains including financial analysis; 20 attack types (snippet). | Cite for the MCP server threat model |
| Out-of-Band Policy Enforcement at a Trusted Tool Boundary (new) | Millstone et al. (Redpanda), 2026 | arXiv 2608.27646 | `reference/papers/prompt-injection/2026-millstone-out-of-band-policy-enforcement.pdf` | Enforce policy at the tool boundary, not in the prompt. Also reports failures: some answers reconstructed a value that never entered the agent's context. | Supports gateway enforcement; warns that "agent never sees raw data" is weaker than it sounds if aggregates leak |
| SLR on prompt-injection and jailbreak defences (prior) | Barcha Correia et al., 2026 | arXiv not recorded locally [VERIFY] | `reference/papers/from-prior/2026-barchacorreia-slr-prompt-injection-defenses.pdf` | Systematic review mapping defences to the NIST taxonomy. | Background only |
| Agent Security Meets Regulatory Reality (prior) | Mohan Guda Nagavenkata Srinivasa, 2026 | preprint | `reference/papers/from-prior/2026-mohan-agent-security-regulated-finance-sok.pdf` | Maps six agent threat categories to US/EU financial rules; stresses auditability, least privilege and boundary enforcement. US/EU, not HK/CN. | Compliance framing in Q&A, with the caveat that it is not HK law |

### D. Verifiable credentials, selective disclosure, reputation

| Title | Authors, year | Venue / id | Local path | Takeaway (2 lines) | ChainBrain link |
| --- | --- | --- | --- | --- | --- |
| On Cryptographic Mechanisms for Selective Disclosure of VCs (new) | Flamini et al., 2024 | arXiv 2401.08196 | `reference/papers/credentials-privacy/2024-selective-disclosure-vc-mechanisms-survey.pdf` | Compares hiding-commitment schemes (mdoc, SD-JWT-style) with BBS zero-knowledge signatures on unlinkability, predicate proofs, threshold issuance (snippet). | Basis for our "level 1 signed attestation now, ZK later" ladder |
| Compact and Selective Disclosure for VCs (new) | Buldini et al., ACSAC 2025 | arXiv 2506.00262 | `reference/papers/credentials-privacy/2025-compact-selective-disclosure-vc.pdf` | Targets SD-JWT's weaknesses: size grows with claim count, and the claim count itself leaks (snippet). | Know the limits of SD-JWT if asked "why not just SD-JWT?" |
| SD-BLS: selective disclosure with unlinkable threshold revocation (new) | Roio, Selvaggini, 2024 | arXiv 2406.19035 | `reference/papers/credentials-privacy/2024-sd-bls-selective-disclosure.pdf` | Argues HMAC-based SD-JWT proofs are traceable and proposes BLS-based disclosure with revocation (snippet; 2 pages). | Background on revocation without tracking |

### E. Standards and specifications (saved text)

All in `reference/papers/standards/`. Status was read from the file header on 2026-10-13.

| Document | Status (as read) | File | What we use it for |
| --- | --- | --- | --- |
| ERC-8004 Trustless Agents | Draft, created 2025-08-13 | `erc-8004-trustless-agents.md` | Identity registry (ERC-721 token), reputation registry (`giveFeedback`), validation registry. Reserved `agentWallet` key: change needs EIP-712 or ERC-1271 proof. Its own Security Considerations says Sybil attacks are possible and `clientAddresses` filtering is needed |
| ERC-4337 Account Abstraction | Final | `erc-4337-account-abstraction.md` | Pocket as smart account |
| ERC-7579 Minimal Modular Smart Accounts | Draft | `erc-7579-minimal-modular-accounts.md` | Module standard (policy validator as a module is one option) |
| ERC-7710 Smart Contract Delegation | Draft (requires 1271, 7579) | `erc-7710-smart-contract-delegation.md` | Standard way to delegate capabilities; alternative to a fully custom validator |
| ERC-7715 Request Permissions from Wallets | Draft (requires 4337, 7710) | `erc-7715-request-permissions.md` | Wallet-facing permission request; MetaMask docs say an ERC-7715 request is a signature for an ERC-7710 delegation (snippet) |
| ERC-1271 Contract signature validation | read as ERC | `eip-1271-contract-signatures.md` | The hash-only check that forces our custom validator |
| ERC-3009 Transfer With Authorization | read as ERC | `eip-3009-transfer-with-authorization.md` | The signed one-time USDC transfer that x402 uses |
| EIP-712 Typed data signing | read as EIP | `eip-712-typed-data-signing.md` | Challenge-response signature format (guard 1) |
| ERC-8183 Agentic Commerce | Draft, created 2026-02-25 | `erc-8183-agentic-commerce.md` | Escrowed jobs with an evaluator; a possible dispute/delivery add-on. Forum thread notes provider and evaluator could be the same actor (snippet) |
| RFC 9421 HTTP Message Signatures | Standards Track RFC | `rfc9421-http-message-signatures.txt` | Production path for guard 1 |
| W3C Verifiable Credentials Data Model 2.0 | W3C TR (status not re-read) | `w3c-vc-data-model-2.0.html` | Credential format |
| W3C DID Core 1.0 | W3C TR (status not re-read) | `w3c-did-core-1.0.html` | Agent and issuer identifiers |
| IETF draft-ietf-webbotauth-httpsig-protocol-00 | Internet-Draft dated September 2026 (Standards Track per snippet) | `ietf-draft-webbotauth-httpsig-protocol-00.html` | Signature-Agent header and key directory for bots; the real-world version of guard 1 |
| IETF draft-ni-wimse-ai-agent-identity-03 | Internet-Draft dated October 2026 | `ietf-draft-wimse-ai-agent-identity-03.html` | Dual-identity credential binding agent and owner (per snippet); parallels our owner binding |
| IETF draft-ryan-httpauth-payment-00 | Internet-Draft dated February 2026 | `ietf-draft-ryan-httpauth-payment-00.html` | A "Payment" HTTP auth scheme using 402; payment-method agnostic. Related to, not the same as, x402 |
| IETF draft-stone-vcap-ap2-binding-00 | Internet-Draft, individual submission, 2026 | `ietf-draft-stone-vcap-ap2-binding-00.html` | Maps AP2 intent mandates to verification inputs; notes AP2 does not define delivery confirmation (snippet) |

Not saved: x402 and AP2 specifications (already in `reference/repos/from-prior/x402` and `reference/repos/from-prior/AP2`); the MetaMask Delegation Framework (`reference/repos/from-prior/delegation-framework`).

## Papers that challenge a spec claim

These are the places where research contradicts or pressures the claims in [product-design.md](../02-product/product-design.md). The spec is not edited here; the team decides.

| # | Spec claim | Evidence against or pressure | Suggested fix |
| --- | --- | --- | --- |
| 1 | Reputation comes from feedback posted to an "ERC-8004-style registry", summarised by our attester | Xiong et al.: feedback is rarely tied to a real interaction (98.7-100% have no proof of payment), a single feedback costs cents to fake, and most reviewers look coordinated. ERC-8004's own text leaves Sybil defence to callers. Tempting-the-Agent adds that cheap identity reset lets agents cash in reputation | Accept feedback only if it references a settled ChainBrain payment hash; weight by payment volume and owner KYC tier; always filter by known reviewers; cap exposure per new counterparty (AgentValve idea). Say "ERC-8004-style, with payment-backed feedback" |
| 2 | "Replay is impossible by construction" for one-task pockets; settlement "retries once with the same nonce so it can never pay twice" | This holds for the payer's money (the token contract tracks one-time nonces). It does not cover the seller side: Li et al. show one payment header reused to get many grants (248 grants per payment in a live test) and a nonce-preemption variant; Ling et al. show a duplicate-settlement race and a 120-second in-memory dedup cache in one SDK | Gateway keeps a persistent record of paid nonces before granting; wait for a stated confirmation depth; test the preemption case on Base Sepolia [VERIFY with our nonce = hash(intent, quote) scheme] |
| 3 | Agent picks the seller by comparing price and reputation from the directory (scene 2) | Magentic Marketplace: strong first-proposal bias and manipulability. Louck: marketplace content accepted without integrity checks, and payment destination taken from untrusted text, succeed regardless of model | Directory entries signed by the seller registry; recipient comes only from the seller-signed quote and must match the on-chain allowlist; ranking done by deterministic code, model only breaks ties |
| 4 | Scene 6: the agent "ignores" an injection; judges can try the red-team box | Nasr et al. and AutoDojo: static tests overstate defences; adaptive attackers break most. FinVault: up to 50% attack success on strong models without extra defences | Do not claim the agent is injection-proof. Claim: "if it is fooled, the pocket still refuses". Rehearse live injection against the pocket directly |
| 5 | "Agent never holds raw personal data" | Millstone et al.: aggregates and filtered counts let a model reconstruct a value that never entered its context (four final answers did so) | Only return pass or fail booleans; no counts or ranges beyond the policy threshold |
| 6 | The semantic intent check uses "the same model, separate prompt" | Not wrong (it can only escalate, never approve), but the Zhu et al. result says precision of the intent certificate is the bottleneck, and LLM judges are attackable (Nasr) | Keep it step-up only; also show a rule-based diff (price, quantity, seller) so the main check is deterministic |
| 7 | Any "x402 adoption" figure in the pitch | Ling et al.: 21.20% of settlements fictitious and 63.78% internal to a linked cluster over 280 days on Base | If quoting volume, quote with that caveat, or do not quote it |
| 8 | Signed intent plus mandate-style signatures protect the buyer | AP2 studies: signed mandates guard execution, not the context that shaped them; "misuse under valid authorization" is an open problem (SoK) | Keep the on-chain cap and budget as the primary defence; describe intent hashing as audit evidence, not prevention |

Side by side, two figures for x402 scale differ by source and are not directly comparable: Ling et al. count about 130 million all-time (May 2026) and 136,708,672 Base settlements over 280 days; AgentValve cites "over 160 million agentic payments in the year preceding June 2026" from another source. Vendor blogs give other numbers (snippet). Treat all as unaudited.

## Cite these in the technical doc

1. **South et al. 2025** (authenticated delegation): the three questions a seller must answer. Backs guards 1-3.
2. **ERC-8004 + Xiong et al. 2026**: our identity design and its honest limits. Backs agent registry and reputation caveats.
3. **ERC-4337, ERC-1271, EIP-3009, EIP-712**: pocket account, signature check, transfer authorization, challenge signature. Backs the pocket enforcement design.
4. **ERC-7710 / ERC-7715** (and the delegation-framework repo): the standard alternative to a custom validator. Backs "why custom validator" Q&A.
5. **Li et al. 2026 and Ling et al. 2026 (x402 security)**: why the gateway checks idempotency and finality.
6. **Louck 2026** (protocol-level attacks): why the recipient comes from a signed quote and on-chain allowlist.
7. **APort Vault + Open Agent Passport (Uchibeke 2026)**: deterministic pre-action checks beat model-only defence (vendor-authored, say so).
8. **Nasr et al. 2025 + AutoDojo 2026**: adaptive attackers; why we lead with on-chain limits.
9. **CaMeL, Progent, FIDES, Beurer-Kellner design patterns**: the capability / least-privilege lineage of our design.
10. **FinVault 2026**: model-only defences fail in finance settings.
11. **Aviv et al. 2026 and Debi et al. 2026 (AP2)**: signed mandates are not enough; our limits live in the account.
12. **SoK Blockchain A2A Payments 2026**: names weak intent binding and misuse under valid authorization, our two target problems.
13. **Zhu and Wang 2026** (intent-governed authorization) and **Patlan et al. 2025** (memory injection on crypto agents): optional, for the intent-match and memory Q&A.

## What this means for winning

| Tag | Recommendation | Helps |
| --- | --- | --- |
| [must] | Make the seller gateway idempotent: persistent paid-nonce record, wait N confirmations, bind quote to the exact resource, before releasing goods. Test replay and duplicate calls on Base Sepolia and keep the tx hashes | Task 40 / Security 30 |
| [must] | Lead the security story with "the pocket refuses even if the agent is fooled", citing APort Vault, Nasr et al. and FinVault. Do not claim injection-proof | Security 30 |
| [must] | In the technical doc and Q&A, state the ERC-8004 limits up front and say reputation feedback is payment-backed and reviewer-filtered | Security 30 / Innovation 30 |
| [must] | Take payment recipients only from the seller-signed quote and check against the on-chain allowlist; treat directory text and tool descriptions as untrusted | Security 30 |
| [should] | Show a rule-based diff (price, quantity, seller) as the main intent check; keep the LLM check step-up only | Security 30 / Innovation 30 |
| [should] | Return only pass or fail from credential checks; avoid counts or ranges that leak | Security 30 |
| [should] | Cap exposure for new or unknown buyer agents (small per-order limit, as in AgentValve's finite-capacity idea) instead of relying only on a score | Innovation 30 |
| [should] | Rank sellers with deterministic code (price within allowlist, optionally payment-weighted like TraceRank); log the ranking in the trace panel | Innovation 30 |
| [could] | Run a small AgentDojo or FinVault subset (or AutoDojo) against our MCP tools and report the number | Innovation 30 / Bonus |
| [could] | Implement the pocket policy as an ERC-7579 module or ERC-7710 caveat enforcer if the day-1 spike on the custom validator fails | Task 40 |
| [could] | Mention WIMSE and Web Bot Auth drafts as the standards path for agent identity headers (production path beyond RFC 9421) | Innovation 30 |

## Open questions

- Which platforms did Louck test, and is any of them x402-based? We only read the abstract and taxonomy.
- Does a deterministic nonce (hash of intent and quote) make the nonce-preemption attack in Li et al. easier on our flow? Needs a Base Sepolia test.
- Is the arXiv id for the Barcha Correia review recorded anywhere? The local PDF has no id we checked.
- Beurer-Kellner et al.: confirm the exact pattern names before we list them in the technical doc.
- MCPTox, MCP-SafetyBench, AgentDojo, CaMeL and the SD-JWT papers: some numbers come from search snippets; re-check in the PDFs before quoting.
- Is there a peer-reviewed KYA paper? Our searches found only vendor material (Trulioo/PayOS, Sumsub, Microblink; snippet).
- Did HKMA or Hong Kong regulators publish agent-payment guidance? Not covered by this paper catalogue.
- Several papers are very recent preprints (AgentValve 9 Oct 2026, APort Vault 18 Sep 2026); they may change in later versions.

## Sources

All accessed 2026-10-13. Searches were run through the search tool; only items whose PDF or text we saved were opened. Items marked (snippet) were seen only in search results.

Papers (arXiv unless noted): 2501.09674, 2606.26028, 2603.24775, 2606.22916, 2603.20953, 2607.21325, 2604.23280, 2511.02841, 2609.02992, 2602.11865, 2607.21824, 2609.22076, 2607.00245, 2601.04583, 2511.15712, 2610.12948, 2510.27554, 2506.08837, 2510.09023, 2606.15057, 2503.16248, 2508.14925, 2512.15163, 2608.18136, 2608.27646, 2401.08196, 2506.00262, 2406.19035. Each is at `https://arxiv.org/abs/<id>` and saved under `reference/papers/<topic>/` as listed in the catalogue. Prior items in `reference/papers/from-prior/`: 2406.13352 (snippet), 2503.18813 (snippet), 2504.11703, 2505.23643, 2510.25779, 2601.07853, 2601.22569, 2604.03733, 2605.11781, 2605.30998, 2607.12575, 2608.23858, plus the Barcha Correia review and the Mohan preprint (no id checked).

Standards fetched (file in `reference/papers/standards/`):
- https://raw.githubusercontent.com/ethereum/ERCs/master/ERCS/erc-8004.md, erc-4337.md, erc-7710.md, erc-7715.md, erc-7579.md, erc-1271.md, erc-3009.md, erc-8183.md
- https://raw.githubusercontent.com/ethereum/EIPs/master/EIPS/eip-712.md
- https://www.rfc-editor.org/rfc/rfc9421.txt
- https://www.w3.org/TR/vc-data-model-2.0/ and https://www.w3.org/TR/did-core/
- https://www.ietf.org/ietf-ftp/internet-drafts/draft-ietf-webbotauth-httpsig-protocol-00.html
- https://www.ietf.org/archive/id/draft-ni-wimse-ai-agent-identity-03.html
- https://www.ietf.org/archive/id/draft-ryan-httpauth-payment-00.html
- https://datatracker.ietf.org/doc/html/draft-stone-vcap-ap2-binding-00

Search-snippet-only sources used for context: MetaMask docs on ERC-7710/7715 (https://docs.metamask.io/delegation-toolkit/concepts/erc7715); Ethereum Magicians thread on ERC-8183 (https://ethereum-magicians.org/t/erc-8183-agentic-commerce/27902); Trail of Bits, "Six mistakes in ERC-4337 smart accounts", March 2026 (https://blog.trailofbits.com/2026/03/11/six-mistakes-in-erc-4337-smart-accounts/), not downloaded; Meta "Agents Rule of Two" write-ups (secondary blogs, not used for any claim above).

Related docs: [product-design.md](../02-product/product-design.md), [research log](../07-log/research-log.md).

See also: [master index](../README.md), [how to win](../06-pitch/how-to-win.md), [recommended changes](../02-product/recommended-changes.md)
