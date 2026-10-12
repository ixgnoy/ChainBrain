# Industry competitors and reference designs for agent-payment trust (2025-2026)
Last updated: 2026-10-13

## In one minute

- **Answer first: "nobody verifies buyer agents for sellers" is NOT true, and we must stop saying it.** Visa (Trusted Agent Protocol), Mastercard (Agent Pay + Know Your Agent), Cloudflare (as the validator for both), Skyfire (KYAPay), Trulioo/Worldpay (Digital Agent Passport), Catena (ACK-ID), DIF (KYA-OS / MCP-I), Google AP2 (Checkout Mandate) and Alipay (APASS) all give a seller some proof of who an agent is, and several also give proof of who it acts for. Visa's own TAP README asks the same three seller questions as our guards: is this agent legitimate, is it acting for an authenticated user, does it carry valid instructions.
- **What IS still unclaimed (as far as we found):** a seller-side check for **stablecoin / x402 payments** that combines the agent's key, a KYC-bound owner, and a **live on-chain account that itself refuses any payment outside the owner's limits**, and that returns one verdict plus a reason code the agent can act on. Every other design either lives inside a closed rail (card networks, Alipay) or hands the seller a signed claim to take on trust (Skyfire, ACK, KYA-OS).
- **Our real difference in one phrase:** authority is *enforced by a contract at payment time*, not just *asserted in a token*. Skyfire's own IETF draft says its token does not prove spending authority. Hong Kong's HKT/Red Date "Agentic ID" pilot (sandbox, trials not yet started) wants to test "permission still valid at the moment of payment", so the idea is validated but not yet shipped by anyone we found.
- **Biggest threats:** (1) Alipay APASS (11 Sep 2026, over 1 million agents, 442 service providers, per Chinese press), which judges from the Alipay world will compare us to; (2) card-network agent identity in Hong Kong (Visa Agentic Ready, Mastercard first live agentic transaction in HK, 27 Mar 2026 per Mastercard release snippet); (3) open DID/VC identity standards (KYA-OS, ACK) that already cover "agent plus human principal".
- **Three lines in our current pitch a knowledgeable judge will attack** (details below): "neither helps a merchant facing an agent from another platform", "most agent-payment demos only protect the buyer", and "open, portable". Rewrite them as shown in the "Pitch lines" section. We are not allowed to edit `product-design.md` here, so the owner of that file must make the change.
- **What to do this week:** (a) rename our claim from "first seller-side verification" to "seller-side verification for x402/stablecoin with on-chain enforced authority"; (b) make guard 1 accept an RFC 9421 HTTP Message Signature (the same envelope Visa TAP, Mastercard and Cloudflare Web Bot Auth use) so we can say "compatible with, not competing with" them; (c) show on screen that the seller never learns the buyer's limits or identity; (d) keep the market as Hong Kong/APEC and say plainly that card rails and Alipay are the incumbents there.
- **Honesty note:** many 2026 facts below come from press or vendor pages, not primary specs. Each row says what we actually opened. Anything marked (snippet) was seen only in a search result summary; [VERIFY] means unconfirmed or sources conflict.

## Plain-English glossary (defined once)

| Term | Meaning |
| --- | --- |
| Buyer agent / seller | The AI that pays, and the merchant or API that gets paid. "Seller-side" means checks the seller runs on the buyer agent. |
| KYA (Know Your Agent) | Like KYC for people, but for agents: who is the agent, who does it act for, what may it do. No single standard exists yet. |
| x402 | A way for a web server to answer "402 Payment Required" and get paid in stablecoin (USDC) in the same HTTP exchange. |
| Mandate | A signed statement from a person saying what an agent may buy. |
| HTTP Message Signatures (RFC 9421) | A standard way to sign a web request so the receiver can check who sent it. Used by Visa TAP, Mastercard and Cloudflare. |
| Web Bot Auth | Cloudflare-backed proposal that uses RFC 9421 so bots and agents can prove identity. In IETF draft form. |
| DID / VC | Decentralized identifier / verifiable credential: W3C standards for IDs and signed claims that anyone can check. |
| ERC-8004 | Ethereum standard for an on-chain agent identity, reputation and validation registry. |
| Facilitator | The service that checks and settles an x402 payment on-chain for the seller. |

## Landscape table

"Seller can verify buyer agent?" means: does the product, as documented, let the *receiving* merchant check the agent (Yes / Partial / No). Evidence column: **opened** = we read the page; (snippet) = search summary only.

### Card networks and payment processors

| Player | What it does | Protects | Identity / KYA | Limits mechanism | Open or closed | Launch | Traction | Seller can verify buyer agent? | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Visa Trusted Agent Protocol (TAP) | Agent signs each request; merchant verifies signature bound to its domain and the action (browse or pay); can receive consented consumer identifiers and payment references | Merchant first | Agent must be Visa-recognised; keys in a registry; RFC 9421 signatures | Not in TAP itself; card issuer and Visa token rules apply | Sample code public (github.com/visa/trusted-agent-protocol, last commit 28 Oct 2025); product terms apply; Visa says "in the process of development and deployment" | Oct 2025 (snippet; some sources say Sep 2025) | "Hundreds" of controlled real transactions in late 2025 (snippet); Visa Agentic Ready programme live in Hong Kong with 7 named banks (snippet) | **Yes, on card rail** (agent identity + user link + payment instruction) | Visa developer page and repo README opened |
| Mastercard Agent Pay + Verifiable Intent | Agentic tokens (network enforces scope set at issuance, snippet); Know Your Agent registration; Verifiable Intent = tamper-proof record of what the user authorised, built with Google | Cardholder, issuer, merchant (dispute evidence) | Only registered agents get tokens (snippet) | Token scope, caps (snippet) | Network-run; Verifiable Intent said to be going to FIDO (conflicting snippets) | HK first live authenticated agentic transaction 27 Mar 2026 with hoppa/CardInfoLink, HSBC and DBS (Mastercard release, snippet; page returned 403 to us); an earlier note found India 17 Feb 2026 [VERIFY] | Several APAC markets (snippet) | **Yes, on card rail** (merchant recognises trusted agents) | Mastercard HK release and VI page both 403 to us; only snippets |
| Cloudflare Web Bot Auth + Trusted agents | Cloudflare validates signed agent requests for merchants: headers present, key in public directory, time window, nonce, tag matches purpose, Ed25519 signature | Merchant | Agent identity only. Blog says it does not explain how consumer authorisation is proven | None | Web Bot Auth repo public (last commit 10 Sep 2026); only agents registered with Visa or Mastercard are covered at first | Blog 24 Oct 2025 | Managed rules and SDK support were "coming months" in Oct 2025 | **Partial** (identity + purpose, not authority) | Cloudflare blog opened |
| Cloudflare Wallets + Monetization Gateway | Wallet for people and agents; claim handle at cloudflare.pay; seller side sells to agents via x402 | Seller (get paid without payment stack); buyer (allowance, allow-list, max transaction size) | Optional: agent may declare it is a delegate of an account; "not trying to define a schema" | Allowance, allow-list, max tx size, human override | Closed product; tiered access | Blog 4 Aug 2026; handle claiming live, wallet use "coming soon" | Waitlist for gateway since 1 Jul 2026 (snippet) | **Partial** (optional declared delegate; limits not visible to seller) | Cloudflare Wallets blog opened |
| Cloudflare NET Dollar | Planned Cloudflare stablecoin for the agent web | n/a | n/a | n/a | n/a | Announced 25 Sep 2025; no later news found | None found | n/a | (snippet), launch status [VERIFY] |
| Stripe: ACP, Shared Payment Token (SPT), Machine Payments Protocol (MPP), Tempo | SPT = scoped token for one seller; Stripe declines charges above agreed limit; MPP lets a server require payment (demo: 1 cent in USDC) | Buyer limits enforced by Stripe; seller gets fraud signals collected at token creation | Seller sees token details (brand, last four, expiry) and fraud signals; Stripe session does not discuss agent identity | Limits enforced at transaction time by Stripe | ACP and MPP described as open; SPT inside Stripe network | ACP Sep 2025; Tempo mainnet + MPP 18 Mar 2026 (prior research) | One opinion piece says only 3 merchants signed (snippet, unverified) | **Partial** (risk signals, no agent-principal-authority proof) | Stripe Sessions 2026 transcript opened |
| OpenAI Instant Checkout | Buy inside ChatGPT via ACP | Buyer, merchant via own checkout | n/a | n/a | ACP open; checkout by merchants | Sep 2025; March 2026 moved "to Apps" (OpenAI spokesperson quote) | Reported weak uptake; merchants worried about stock, tax, pricing | n/a | DigitalCommerce360 opened. Shows merchants fear checkout integrity, which supports seller-side trust |
| Google AP2 (now FIDO Alliance) | Signed mandates: Checkout Mandate gives merchant cryptographic proof of what user approved; Payment Mandate for the payment network | User, merchant, networks | Model: User Credential or Trusted Agent Provider (Verifier must trust one of them) | Mandate content (caps etc.) | Open spec; donated to FIDO 28-29 Apr 2026 with v0.2 adding "Human Not Present" payments | v0.1 Sep 2025 (prior research), v0.2 Apr 2026 | 60+ launch partners (secondary) | **Yes, for the user's approval** (merchant checks mandate); identity of agent is delegated to trust anchors | AP2 repo docs read locally; ThePaypers article opened |
| PayPal Agent Ready / Store Sync | Existing PayPal merchants take payments from AI agents, plus catalogue sync | Merchant | Not described in what we saw | Not described | Closed | 28 Oct 2025 (snippet) | n/a | Unknown | (snippet) |
| Adyen Agentic (Feed, Cart, Payments) | Merchant-side APIs; supports AP2 and ACP; listed as an early TAP adopter | Merchant | via TAP | via tokens | Closed product | 16 Jun 2026, limited US availability (snippet) | n/a | **Partial via TAP** | (snippet) |
| Worldpay + Trulioo "Digital Agent Passport" | Tamper-proof credential bundle so merchants can assess whether an agent is legitimate, authorised, and acting with consent; checks developer identity, code integrity, user consent | Merchant | Trulioo KYA built with PayOS | Not detailed | Not stated | Announced 14 Aug 2025 in future tense; no launch date | None found | **Yes (announced)**, live status unknown | Worldpay release opened |
| Crossmint Agent Commerce Toolkit | One integration from saving a card to checkout; scoped virtual cards with limits; uses Visa and Mastercard agent tokens where eligible | Buyer (card vault, limits) | Not explained in article | Spend limit, expiry on virtual cards | Toolkit live; open-source reference app | 12 Oct 2026 | No figures | No (buyer side) | The Paypers article opened |
| Nekuda, Payman | Agent wallet / payment infrastructure startups. Nekuda: $5M seed (May 2025, Visa Ventures and Amex Ventures took part) (snippet). Payman: Visa invested (snippet) | Buyer | n/a | n/a | Closed | 2025 | No figures | No evidence | (snippet) only; [VERIFY] |

### Crypto and open-standard players

| Player | What it does | Protects | Identity / KYA | Limits mechanism | Open or closed | Launch | Traction | Seller can verify buyer agent? | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Coinbase x402 + Agentic Wallets + Bazaar | HTTP 402 stablecoin payments; hosted agent wallets (session caps, per-transaction limits, gasless on Base per prior research); Bazaar = searchable index of payable endpoints | Seller gets paid; buyer has caps | x402 has Sign-In-With-X: seller verifies a **wallet signature** (smart wallets via ERC-1271/6492). Proves wallet control only, not owner or authority | Wallet-provider caps; none visible to seller | Open (x402 Foundation, Linux Foundation, Apr 2026 per Forkast snippet); Bazaar "early-stage" per CDP docs | Agentic Wallets 11 Feb 2026 (third-party); x402 V2 adds wallet identity | Headline 120-187M cumulative transactions, but about half artificial and about USD 28k/day real (Forkast snippet); Visa/Artemis adjusted about USD 15-19M across about 134M transactions to 21 Apr 2026 (snippet); the two adjusted figures conflict [VERIFY] | **Partial: wallet only** | ctx7 docs of x402 repo read; others snippets |
| Skyfire KYAPay | Identity-and-payment tokens (JWT): kya, pay, kya-pay; seller checks signature, issuer, audience, expiry via issuer JWKS | Seller (identity fields) and buyer | Skyfire verifies the owner (individual or organisation plan); tokens disclose only fields the seller requires | Pay token carries committed amount; **IETF draft says it defines no mandate and does not prove principal approved the purchase** | IETF individual draft 5 Jul 2026 (not endorsed by IETF); Skyfire verification is a paid service; one source calls it open, another proprietary | Announced late 2025 (snippet); draft Jul 2026 | $8.5M seed (snippet); F5 bot-defence integration slated for 30 Apr 2026 (snippet); Dec 2025 demo over Visa rails | **Yes (identity + principal fields)**, no authority proof | Skyfire docs and IETF draft opened |
| Catena Labs ACK (Agent Commerce Kit) | ACK-ID: owner signs a short-lived grant (15 min) bound to agent key with scope and audience; agent signs each request (RFC 9421); ACK-Pay: offers and receipts, x402 profile | Seller / API (verifies agent signature, grant signature, scope) | Owner credential; v2 drops the VC requirement | Scope and audience in grant; not an on-chain limit | Open protocol; v2 RFC "draft and open for review"; repo last commit 6 Oct 2026 | ACK May 2025; Series A USD 30M reported 20 May 2026 (snippet); bank charter status conflicts across sources [VERIFY] | Developer preview closed | **Yes (identity + owner + scope), off-chain** | Catena blog opened; repo cloned |
| DIF KYA-OS (ex Vouched MCP-I) | Identity and delegation layer using DIDs and VCs to verify agent and human principal; 3 adoption levels (OIDC/JWT, full DID, enterprise) | Seller / service | DID + VC | Credential-based delegation, revocation | Open, DIF working group; donated Mar 2026 (snippet) | Mar 2026 | "Production implementations sparse" (snippet) | **Yes (agent + principal), spec stage** | (snippet) |
| Circle Arc + Agent Stack | Arc mainnet 16 Sep 2026 with agent wallets, spending limits, nanopayments; permissioned validators (BlackRock, DTCC, ICE, Mastercard, Visa, Standard Chartered and others); USDC is 98.8% of agent volume per Circle citing Dune (methodology unpublished) | Institutions, buyers | Article did not mention identity | Policy-controlled wallets | Permissioned chain | 16 Sep 2026 | 100+ partners on day one | No evidence | Decrypt opened |
| Kite (Agent Passport) | Own chain plus agent identity with spending ceilings and payee lists | Buyer | Passport; delegated authority and session keys | Ceilings, approved payees | Open access to Passport; company press releases only | 30 Apr 2026 (snippet) | Trials with PayPal and Shopify (company claim) | Unknown | (snippet) |
| ERC-8004 | On-chain identity, reputation, validation registries | Anyone checking a counterparty | Portable agent ID (NFT-based) | None | Open standard | Mainnet 29 Jan 2026 (empirical paper) | Only 3% (Ethereum), 4% (BSC), 15% (Base) of registrations have a valid file and live endpoint; 73.5% / 59.2% / 90.6% of reviewers show coordinated Sybil behaviour | Partial: ID yes, trust no | Paper read (local PDF) |

### China (mainland)

| Player | What it does | Protects | Identity / KYA | Limits mechanism | Open or closed | Launch | Traction | Seller can verify buyer agent? | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Alipay AI Pay / AI Wallet / Token Pay | Pay inside agent chats; AI Wallet is a user control layer in the Alipay app | Buyer (user-side controls: identity check, per-payment consent, 24/7 risk control) | Via APASS (below) | Per-task, per-payment consent; delegated mode with time window, cap, merchant list (ACT) | Closed product, Ant-run | AI Pay Sep 2025; AI Wallet/Token Pay 26 May 2026 | Company claims: over 100M users in Feb 2026, 300M transactions (snippet) | Not shown | Press (snippet); company claims unverified |
| Alipay ACT 2.0 | Open "agentic commerce" protocol framework; four domains (delegation, commerce interaction, payment, trust services); trust services include intent-authorisation credential and commercial attestation | Users, merchants | Trust-service layer | Instant pay or delegated authorisation (time window, cap, merchants) | Described as "open technical protocol framework"; built with IIFAA, Xiaomi, Zhipu, BYD, 20+ partners; no governance or licence terms stated | ACT Jan 2026 (snippet; an earlier source says 2025, conflict); ACT 2.0 29 Apr 2026 (opened) | 20+ partners | Partial (credential issued by Ant side) | DoNews opened |
| Alipay APASS (KYA) | "Who the agent is, whom it represents, what it may do, is its behaviour trustworthy": identity registration, continuous verification, intent security, trusted evidence. Before payment: verify identity and authorisation; during: dynamic risk control; after: keep key evidence. Serve / confirm with user / refuse | Platform and user; service providers are "covered" | Centralised Agent ID plus DID (snippet) | Authorisation boundary | Ant-run; 50+ institutions co-building; not stated whether non-Ant agents can join (qq article) | 11 Sep 2026 (Bund Summit) | Over 1M agents connected, 11 万 activated (one report), 442 service providers (qq article opened; the activated figure snippet) | **Inside Ant ecosystem**; cross-network KYA interconnection with Alipay+ AMP, Mastercard VI and Visa TAP was reported (CSDN snippet, page failed to open) | qq article opened; rest snippet |
| Alipay AI收 | Merchants and developers get paid by agent invocations; three-step onboarding; follows ACT's agent-to-machine (A2M) framework | Merchant/developer | Not described | Not described | Alipay merchant product | 28 Apr 2026 (snippet) | Zero fee for individual developers to 31 Dec 2026 (snippet) | Not described | (snippet); seller-side verification mechanism NOT found |
| Alipay 赔付 (compensation) | Slogan 你敢付，我敢赔 reported at 26 May launch (prior research); only a Baidu Baike entry mentions blockchain evidence and compensation for AI Pay | Buyer | n/a | n/a | n/a | 2026 | No rules, caps or conditions found | n/a | [VERIFY]; treat as a company promise with unknown terms |
| UnionPay APOP | Open framework: agent identity lifecycle, end-to-end intent management, single sign-on across agent/merchant/bank, payment authorisation with consent check; stated aim of "clearly defined responsibilities and risk allocation" | Not named; dispute resolution emphasised | Agent registration, update, deregistration | Consent verification | Described as open and international | Released early Apr 2026; live HK taxi booking 2 Apr 2026 (Evonet agent, Hoppa) | One live transaction named | Not described | The Paypers opened |
| JD A2P2 | Autonomy levels L0-L5 (focus L3, L4); Agent Runtime Identity (ARI) binds user, agent and runtime at payment; task mandate turns a natural-language limit into a machine-checkable credential; isolated account with caps | User | ARI | Mandate, isolated account | Not clear | 11 Jun 2026 (Chinese press, snippet; no primary spec found) | n/a | Not described | (snippet) |
| WeChat Pay | Tencent's WorkBuddy agent can pay via WeChat Pay, first for local services (Meituan group-buying); "AI card" reported but not confirmed live | User | In-ecosystem | Not visible (paywalled) | Closed loop in WeChat | 17 Jun 2026 | n/a | No | Caixin opened (partial) |

### Hong Kong

| Player | What it does | Evidence |
| --- | --- | --- |
| HKMA stablecoin licences | First two issuer licences on 10 Apr 2026: HSBC and Anchorpoint (Standard Chartered HK, HKT, Animoca); 36 applications assessed. HSBC planned an HKD stablecoin in H2 2026 for PayMe and its HK app; no source confirms launch. One law-firm wiki says Anchorpoint launched "HKDAP" on 12 Aug 2026 [VERIFY]. HSBC also runs a tokenised deposit service on HKMA's Ensemble network | HKMA release (prior research), asianbanker, HSBC items (snippets) |
| HKMA GenAI Sandbox++ | 36 use cases, 30 financial institutions, 27 tech partners, announced 27 Aug 2026; technical trials "later this year"; sandbox is not approval | PYMNTS opened |
| HKT Payment + Red Date "Agentic ID" | Uses DIDs and VCs to bind agent to verified person or business; checks customer, agent identity, authority, transaction, and whether permission "remains valid at the moment of payment"; announced development initiative, no merchant-side flow described, no mention of blockchain | PYMNTS and Keel opened. **Closest bank-side match to our principal binding; sandbox, not live** |
| Visa HK | Agent-initiated card payments with BOCHK, announced 5 Jun 2026; Agentic Ready programme (BOCHK, DBS HK, Hang Seng, HSBC HK, Reap, StanChart HK, ZA Bank) (snippet); Animoca/Visa pilot with Bruce Lee Club eShop (snippet) | Visa HK release opened |
| Mastercard HK | First live authenticated agentic transaction, HSBC and DBS HK issuers (snippet) | Release returned 403 to us |

## Seller-side trust: gap analysis

The question: who already lets a **seller** check a buyer agent's (1) identity, (2) principal (who it acts for) and (3) authority (what it may spend), **across platforms**?

| Seller needs to know | Already offered by | Works across platforms? | What is still missing |
| --- | --- | --- | --- |
| 1. Is this agent real and not a copy | Visa TAP, Mastercard (via Cloudflare), Cloudflare Web Bot Auth, Skyfire, ACK, KYA-OS, Alipay APASS, x402 wallet sign-in | Partly: card networks only for agents they registered; Web Bot Auth and ACK are open | No single directory a seller can query for **any** agent paying in USDC |
| 2. Which verified person or company is behind it | Skyfire (hid fields), Trulioo DAP (announced), KYA-OS (DID/VC), ACK grant, Visa TAP (consumer identifiers if consented), APASS (inside Ant) | Partly; mostly vendor-specific trust anchors | Seller must decide which issuers to trust; Skyfire draft says it does not say how |
| 3. Is it allowed to spend this much, here, now | AP2 Checkout Mandate (proof the user approved), card issuer / network tokens (invisible to seller), Alipay delegated authorisation, Cloudflare/Stripe caps (invisible to seller) | AP2 is open but needs a trust anchor; the rest are closed rails | **No product found where the seller can ask a live yes/no and the account itself refuses payments outside the owner's limits**, on stablecoin rails |
| 4. Can I sell this item to this buyer (licence, age, region) | Not found in any source we read | n/a | **Unclaimed**: seller policy as a guard (our guard 7) |
| 5. If refused, what should the agent do | Not found as a feature. Our design returns reason codes the agent re-plans from | n/a | **Unclaimed** in the sources we read |
| 6. Without learning the buyer's limits or ID | Skyfire and TAP do selective disclosure of identity fields; none we found hide limits while still enforcing them | n/a | Verdict-only answers (serve / step-up / refuse) |

**Conclusion.** The honest claim is narrower than "no one does seller-side verification":

1. Seller-side **identity** and **principal** checks exist and are standardising fast (TAP, KYAPay, ACK, KYA-OS, APASS). We should not claim them as new.
2. Seller-side **authority** that is *enforced by the account that pays* (not asserted in a token), on **x402 / stablecoin** rails, answered as a verdict, appears unclaimed as of 13 Oct 2026. Hong Kong's HKT/Red Date pilot targets something similar but is in a sandbox, has no merchant-side flow in what we read, and does not mention a chain.
3. The seller's **own rules** (guard 7) and **reason codes the agent can use** appear unclaimed in what we read; we did not find them, but we did not read private docs.
4. Absence of evidence is not proof. We read primary pages for Visa, Cloudflare, Skyfire, Catena, AP2, Stripe and Worldpay, but Mastercard, JD, WeChat and Alipay's merchant flows were only partly visible. Say "we found no product that ..." never "no product exists".

## ChainBrain's differentiation in three sentences (judge-safe)

1. Card networks and Alipay already verify agents for merchants inside their own rails, and open standards like Skyfire, ACK and KYA-OS let a seller read signed claims about an agent and its owner.
2. ChainBrain is for sellers taking stablecoin (x402) payments, where no network registers agents: the seller gets one serve / step-up / refuse verdict that checks the agent's key, a KYC-bound owner, and a live on-chain pocket that itself refuses any payment outside the owner's limits, so authority is enforced and not just claimed.
3. The seller learns only the verdict and a reason code, never the buyer's limits or identity, and the buyer's agent uses that reason code to re-plan, which we show live with on-chain transaction hashes.

Check against facts: sentence 1 is supported by opened pages (Cloudflare blog, Visa page, Skyfire docs, Catena blog); sentence 2's "unclaimed" is our own finding and phrased as ours; sentence 3 is our design.

## Pitch lines a judge who knows Alipay or Visa will challenge

| Line in our current spec | Why it is challengeable | Safer wording |
| --- | --- | --- |
| "Neither helps a merchant facing an agent from another platform" (Problem section) | Visa TAP, Mastercard Agent Pay (via Cloudflare), Cloudflare Web Bot Auth, Skyfire and ACK are built for exactly that; APASS reportedly plans interconnection with Visa TAP and Mastercard VI (snippet) | "Alipay's APASS covers agents inside Ant's network and card networks cover card payments. For USDC payments on open rails, a seller has no account-enforced answer to 'may this agent spend this here'." |
| "Most agent-payment demos only protect the buyer; we also show the merchant's side" | Visa TAP's README is a merchant-protection pitch | "Most **on-chain** agent wallets protect only the buyer; card networks protect sellers on cards. We bring seller verification to stablecoin." |
| "Takes the same trust model and makes it open, portable and verifiable across platforms and borders" | "Portable" is not demonstrated beyond our own registry; open alternatives (ACK, KYA-OS) already claim it | Say "open and on-chain, and it accepts the common request-signature envelope (RFC 9421)", and demonstrate it |

### Questions to expect, with answers we can defend

| Likely judge question | Answer | Do not say |
| --- | --- | --- |
| "Alipay already has APASS and KYA. What is new?" | APASS is Ant's infrastructure (over 1M agents, 442 providers, per Chinese press) and was announced 11 Sep 2026. We do not claim to beat it in mainland China. We target Hong Kong/APEC sellers on stablecoin rails, with proofs anyone can check and an account that refuses out-of-limit payments. Our design is deliberately the same three-outcome model (serve, confirm, refuse). | "Alipay is closed so we are better." |
| "Visa TAP and Mastercard give merchants agent identity. Why you?" | They cover card payments and agents registered with the network, and the cap is enforced by the issuer, invisible to the seller. Our seller asks the pocket directly. We sign requests in the same RFC 9421 style so a seller can run both. | "TAP does not check the user." (Its README says it can pass consented consumer identifiers.) |
| "Skyfire / ACK / KYA-OS already do identity plus owner. Why build again?" | They assert; they do not enforce. Skyfire's own IETF draft says KYAPay does not define a mandate. Our pocket is a smart account that rejects the payment. Our work adds seller policy and reason codes on top. | "Nobody has agent IDs." |
| "Why blockchain? A database could hold this." | The registry could be a database. The part that needs a chain is the pocket: a payer account whose rules cannot be bypassed by the agent, plus evidence anyone can verify. Be honest about this. | "Everything needs a blockchain." |
| "Agent commerce is hype; x402 is mostly fake volume." | Partly true: press reports about half of x402 transactions as artificial (Forkast, snippet) and real daily volume near USD 28k. OpenAI moved Instant Checkout into apps in March 2026 because merchants worried about checkout integrity. That is the seller-side trust problem we solve. Quote no volume figure as fact. | Any x402 volume number without "reported". |
| "ERC-8004 already gives agent identity and reputation." | A July 2026 study found most registrations are placeholders and most reviewers on Base show coordinated Sybil behaviour (90.6%). So we do not trust raw registry reputation; our guard 2 requires a KYC-bound owner and our reputation is attestation-based. | "ERC-8004 reputation proves trust." |
| "Where does KYC come from? Who is the issuer?" | Simulated in the demo. In production an HK licensed provider or bank; HKT/Red Date's DID/VC Agentic ID pilot shows banks are heading the same way. | Claiming a real issuer. |
| "Alipay pays compensation (赔付). You do not." | Out of scope; we provide the evidence chain a compensating operator needs. We found no published terms for Alipay's compensation, so we cannot compare. | Quoting the slogan as an official policy. |
| "Is this legal for mainland users?" | Market is HK/APEC (PBoC Notice 42 in prior research restricts virtual-currency business; not legal advice). FISCO BCOS is a bonus deployment only. | Promising mainland launch. |

## What this means for winning

- **[must] (Innovation 30)** Reword the three challengeable lines above in the pitch, the deck and the demo script before 20 Oct. A judge who catches one false "nobody does this" will discount everything else.
- **[must] (Innovation 30, Security 30)** Lead the pitch with the narrow, true gap: *seller-side authority enforced by the paying account, on stablecoin rails, with a verdict and reason code*. Show the seller dashboard refusing a request that a token-only check would have accepted (valid identity token, but pocket over its cap).
- **[should] (Innovation 30)** Make guard 1 accept an RFC 9421 HTTP Message Signature envelope (the style used by Visa TAP, Mastercard, Cloudflare Web Bot Auth and Catena ACK-ID). One slide: "ChainBrain sits behind TAP/ACK identity; it adds the check they do not do."
- **[should] (Task 40)** Keep every core scene ending in a real Base Sepolia transaction hash; the competitor stories are mostly announcements, so on-chain proof is our contrast.
- **[should] (Security 30)** Add a "token-only vs ChainBrain" side-by-side: a stolen or over-scoped identity token is accepted by a signature-only seller but refused by the pocket. This answers "why not just use Skyfire/ACK".
- **[should] (Bonus)** Map our guards to MAS SAFR (agent identity, controls, decision, audit) and JD A2P2 autonomy levels as a self-score; this shows regulatory awareness for the 30% security criterion (SAFR details are in prior research and were not re-read here).
- **[could] (Innovation 30)** Mention HKT/Red Date's "Agentic ID" sandbox pilot as proof that Hong Kong banks want DID/VC-bound agents, and position us as the merchant-facing half they have not described.
- **[could] (Innovation 30)** Map our trust bundle fields to KYA-OS and ACK-ID names in a one-page appendix, to answer interoperability questions.
- **[could] (Bonus)** Do not claim ERC-8004 reputation as a trust signal; if shown, show it with the Sybil caveat.

## Open questions

- Does Mastercard Agent Pay or Visa give a merchant a way to read the cardholder's agent limits? We could not open Mastercard's pages (403) and Visa's page lists no limits; ask a contact or read Visa's TAP spec text beyond the README.
- How does a seller verify an APASS agent, and is APASS open to non-Ant agents? The qq article does not say; the Alipay developer docs (aipay.alipay.com) were not reached.
- Did Alipay really announce KYA interconnection with Visa TAP and Mastercard VI? Only a CSDN snippet says so (page returned HTTP 521).
- What are Alipay's 赔付 terms? Only a Baidu Baike entry mentions it.
- Is Worldpay/Trulioo Digital Agent Passport live? Press release only.
- Does the HKT/Red Date pilot include a merchant verification step or a chain? Pages we read say no, but the project text itself was not read.
- Cloudflare NET Dollar: launched or not? Nothing after Sep 2025 found.
- Mastercard first live agentic transaction: Hong Kong 27 Mar 2026 (release snippet) vs India 17 Feb 2026 (prior research). Which is "first"?
- Is Web Bot Auth's IETF draft adopted by a working group? The repo cites draft-meunier-webbotauth-httpsig-protocol; adoption status unverified.
- Mastercard Verifiable Intent: donated to FIDO (one snippet) or only AP2 donated (another)? Conflict.

## Sources

Web pages opened (accessed 2026-10-13):
- https://blog.cloudflare.com/secure-agentic-commerce/ (24 Oct 2025)
- https://blog.cloudflare.com/wallets/ (4 Aug 2026)
- https://developer.visa.com/capabilities/trusted-agent-protocol
- https://docs.skyfire.xyz/docs/kya
- https://datatracker.ietf.org/doc/html/draft-skyfire-oauth-kyapay-token-00
- https://thepaypers.com/payments/news/google-donates-agent-payments-protocol-to-fido-alliance
- https://stripe.com/sessions/2026/machine-payments-and-the
- https://thepaypers.com/payments/news/unionpay-rolls-out-agentic-payment-open-protocol-framework-for-ai-driven-payments
- https://www.caixinglobal.com/2026-06-17/tencent-lets-ai-agent-make-purchases-through-wechat-pay-102455141.html (partial, paywalled)
- https://www.donews.com/news/detail/4/6536444.html (ACT 2.0, 29 Apr 2026)
- https://technode.com/2026/09/11/alipay-to-launch-an-ai-wallet-agent-for-trusted-ai-payments/
- https://news.qq.com/rain/a/20260911A0ANYM00 (APASS, 11 Sep 2026)
- https://www.worldpay.com/en/press-releases/worldpay-and-trulioo-collaborate-embed-trust-agentic-commerce
- https://catena.com/blog/ack-v2-smaller-identity-core-x402-payment-profile
- https://decrypt.co/378374 (Arc mainnet, 16 Sep 2026)
- https://www.digitalcommerce360.com/2026/03/06/openai-shifts-checkout-plans-agentic-commerce-strategy/amp/
- https://www.pymnts.com/news/banking/2026/hong-kong-tests-know-your-agent-controls-in-payment-workflows/
- https://www.visa.com.hk/en_HK/about-visa/newsroom/press-releases/visa-advances-the-next-phase-of-agent-initiated-card-payments-in-hong-kong.html
- https://keelapi.com/blog/hkt-agentic-id-payment-mandate
- https://thepaypers.com/payments/news/crossmint-launches-toolkit-for-ai-agent-payments-at-online-stores
- ctx7 docs for /x402-foundation/x402 (sign-in-with-x extension)

Search-result-only (snippet), not opened:
- Mastercard HK release https://www.mastercard.com/news/ap/en-hk/newsroom/press-releases/en-hk/2026/mastercard-completes-its-first-live-agentic-transaction-in-hong-kong (403); Mastercard Verifiable Intent https://www.mastercard.com/us/en/news-and-trends/stories/2026/verifiable-intent.html (403); Mastercard KYA article https://www.mastercard.com/global/en/news-and-trends/stories/2026/agentic-commerce-identity-know-your-agent.html (403)
- JD A2P2 https://stock.10jqka.com.cn/20260611/c677395903.shtml and https://stock.10jqka.com.cn/20260612/c677415423.shtml
- Alipay AI收 and 17 Aug 2026 ecosystem event items: https://www.qbitai.com/2026/04/410450.html ; https://www.stdaily.com/web/gdxw/2026-08/17/content_565275.html
- Alipay AI Wallet release https://www.businesswire.com/news/home/20260526337824/en/ (403 earlier)
- x402 adoption: https://forkast.news/half-of-x402s-transaction-volume-is-artificial-the-infrastructure-layer-keeps-building-anyway/ ; https://thedefiant.io/converge/infrastructure/visa-s-sheffield-pegs-adjusted-x402-volume-at-19m ; https://glenbrook.com/payments_news/the-x402-foundation-activated-a-27-year-old-internet-code-200-million-transactions-later-the-real-volume-is-still-tiny/
- Kite https://www.globenewswire.com/news-release/2026/04/30/3285380/0/en/kite-launches-kite-chain-and-kite-agent-passport-enabling-autonomous-ai-agent-payments.html
- KYA-OS https://blog.identity.foundation/kya-os/ ; https://businesswire.com/news/home/20260305055181/en/
- Adyen https://itbrief.news/story/adyen-launches-agentic-commerce-apis-for-us-merchants ; PayPal https://paypal.ai/ ; Cloudflare NET Dollar https://thedefiant.io/news/defi/cloudflare-to-launch-net-dollar-stablecoin
- HSBC / HKMA licences https://www.theasianbanker.com/press-releases/hsbc-to-launch-hkd-denominated-stablecoin-in-second-half-of-2026 ; Hong Kong sandbox https://technode.global/2026/08/27/hong-kong-genai-sandbox-agentic-ai-pilots/
- Visa APAC https://www.theasianbanker.com/press-releases/visa-expands-visa-intelligent-commerce-in-asia-pacific-prepares-2026-ai-pilot
- Catena funding https://www.aicerts.ai/news/catena-labs-funding-signals-new-era-of-agent-banking/ ; Nekuda/Payman https://rye.com/blog/agentic-commerce-startups

Local files (read):
- /Users/user/Workspace/Projects/shenzhen/lianainao-fintechathon/reference/repos/industry/visa-trusted-agent-protocol/README.md
- /Users/user/Workspace/Projects/shenzhen/lianainao-fintechathon/reference/repos/industry/cloudflare-web-bot-auth/README.md
- /Users/user/Workspace/Projects/shenzhen/lianainao-fintechathon/reference/repos/industry/catena-ack/ (docs/ack-id, docs/ack-pay; cloned, not run)
- /Users/user/Workspace/Projects/shenzhen/lianainao-fintechathon/reference/repos/industry/erc-8004-contracts/ (cloned, not read in detail)
- /Users/user/Workspace/Projects/shenzhen/lianainao-fintechathon/reference/repos/from-prior/AP2/docs/ap2/agent_authorization.md and specification.md
- /Users/user/Workspace/Projects/shenzhen/lianainao-fintechathon/reference/papers/industry/2026-arxiv-ai-identity-standards-gaps.pdf (arXiv 2604.23280)
- /Users/user/Workspace/Projects/shenzhen/lianainao-fintechathon/reference/papers/industry/2026-arxiv-erc8004-deployment-measurement.pdf (arXiv 2606.26028)
- /Users/user/Workspace/Projects/shenzhen/lianainao-fintechathon/reference/papers/industry/2026-arxiv-paying-to-know.pdf (arXiv 2606.24783; downloaded, not read)
- Prior research reused as data: /Users/user/Workspace/Projects/shenzhen/lianainao-fintechathon/reference/prior-research/notes/round4/global-agent-payments.md and china-agent-payments.md

Related docs: [product design](../02-product/product-design.md), [hackathon rules](../01-competition/hackathon-rules.md).

See also: [master index](../README.md), [how to win](../06-pitch/how-to-win.md), [recommended changes](../02-product/recommended-changes.md)
