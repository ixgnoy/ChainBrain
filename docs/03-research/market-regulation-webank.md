# Market, regulation and WeBank fit
Last updated: 2026-10-13

## In one minute

- **The spec's compliance position is mostly right, but needs four fixes.** (1) Describe PBoC Yinfa [2026] No. 42 more precisely (it covers all stablecoins, not only "unapproved RMB" ones, and bars foreign firms from serving mainland users). (2) Say plainly that USDC is a testnet stand-in: in Hong Kong only HKMA-licensed issuers' tokens may be offered to retail users. (3) Add the new mainland and Singapore rules that match our design. (4) Replace "APEC banks" with "Hong Kong and Southeast Asia, via WeBank Technology Services". Details in section 1.
- **Regulators are now asking for exactly what ChainBrain builds.** On 24 Aug 2026 the China Payment & Clearing Association (a state-backed body, working under PBoC guidance) issued a convention that tells members to build "Know Your Agent" (KYA, see jargon box below) and define each agent's "authorisation boundary". On 3 Jul 2026 Singapore's MAS published a runtime-safeguards white paper with agent identity, a rulebook, a deny/escalate/auto-execute decision step, and a tamper-evident log. On 27 Aug 2026 Hong Kong's regulators admitted 36 agentic-AI pilots, including an "Agentic ID" project using DIDs and verifiable credentials.
- **That is good news and a warning.** It proves the problem is real. It also means KYA is crowded: Alipay, Skyfire, Visa, Mastercard, Cloudflare and HKT Payment all have something. Our edge must stay specific: the seller-side guards plus an on-chain pocket that holds even if the agent is hijacked.
- **Agent payments are real but still tiny on-chain.** TRM Labs (9 Sep 2026) found that only 0.6% to 7.5% of screened x402 commerce looked like AI agents, and that on-chain records cannot tell an agent from a script. Do not pitch big x402 volume. Pitch the identity gap TRM just described.
- **Merchants are not ready.** Ravelin's survey of 1,504 fraud and payments staff found only 29% feel "very prepared" for agentic fraud, and nobody agrees who pays for a bad agent purchase (Worldpay: "No liability shift exists yet"). This is our best pitch fact.
- **WeBank fit is strong if we frame it carefully.** WeBank's own line is "AI executes by default, humans handle exceptions" (Wang Yasheng, Jul 2026). ChainBrain's serve / step-up / refuse is that sentence in payment form. WeBank is a mainland bank, so lead with settlement-agnostic wording and its Hong Kong and Southeast Asia arm, not with USDC.
- **The business model needs reshaping.** The per-check fee is worth almost nothing at today's volumes (section 6). Lead with a white-label licence to banks and a seller-console subscription.
- **What to do:** apply the spec wording fixes, add one "regulator mapping" slide and table, and open the pitch with the merchant-readiness gap (see "What this means for winning").

**Jargon, defined once.** *KYC* = know your customer (a bank checking who a person is). *KYB* = the same for businesses. *KYA* = know your agent (checking which AI agent is acting and for whom). *Stablecoin* = a crypto token pegged to a currency such as the US dollar. *Tokenised deposit* = an ordinary bank deposit recorded as a token on a ledger; it stays a bank liability. *RWA* = real-world-asset tokenisation (turning ownership of an asset into tokens). *Sandbox* = a regulator-supervised test area. *HKMA* = Hong Kong Monetary Authority (central bank role). *SFC* = Hong Kong Securities and Futures Commission. *MAS* = Monetary Authority of Singapore. *PBoC* = People's Bank of China. *NFRA* = National Financial Regulatory Administration (mainland banks and insurers). *PCAC* = China Payment & Clearing Association. *DID / VC* = decentralised identifier / verifiable credential (W3C standards for portable identity proofs).

---

## 1. Compliance position check of the spec

The spec's "Compliance position" says: mainland not offered; target Hong Kong and APEC with licensed stablecoins or bank tokenised deposits; testnet demo; production needs licensed issuer, KYC/KYB providers, compensation scheme, legal review. This is the right shape. Claim-by-claim:

| # | Spec claim | Verdict | What the sources say | Suggested change |
| --- | --- | --- | --- | --- |
| 1 | "PBoC Notice Yinfa [2026] No. 42 bans crypto as currency, unapproved RMB stablecoins and domestic tokenization services" | Partly accurate; understated | Document 银发〔2026〕42号, dated 6 Feb 2026, issued by eight agencies, repeals the 2021 notice No. 237. It lists USDT among virtual currencies with no legal-tender status. It says fiat-pegged stablecoins "in circulation quietly perform part of the functions of legal tender" (变相履行法定货币的部分功能). Virtual-currency exchange, token issuance and related products are "strictly prohibited". Banks and non-bank payment firms may not provide accounts, transfers or settlement for virtual-currency business. Issuing an RMB-pegged stablecoin offshore needs approval (applies to domestic and foreign persons). Foreign firms may not provide virtual-currency or RWA services to mainland parties "in any form". Domestic RWA is barred unless approved and run on designated financial infrastructure. Business names may not contain "stablecoin" or "RWA". Hong Kong is not mentioned or carved out. [opened: CSRC copy] | Reword: "PBoC et al. Notice Yinfa [2026] No. 42 (6 Feb 2026) bars virtual currencies, including stablecoins, from the mainland financial system, bars foreign firms from serving mainland users with them, and bars domestic tokenisation without approval." Add: "ChainBrain is therefore not offered to mainland users; the demo runs on a test network." |
| 2 | "Target market: Hong Kong and APEC, settling in licensed stablecoins or bank tokenized deposits" | Right in principle; "APEC" is vague | HK Stablecoins Ordinance in force 1 Aug 2025. HKMA granted the first two issuer licences on 10 Apr 2026: Anchorpoint Financial (Standard Chartered HK, HKT, Animoca Brands) and HSBC (Hong Kong bank). Only licensed issuers' tokens may be offered to HK retail users. Tokenised deposits sit outside the Ordinance. HSBC says it will launch an HKD token in H2 2026; Anchorpoint's HKDAP began a phased, institution-first roll-out [Linklaters, undated]. I found no report that either is live for the public (as of 13 Oct) [VERIFY on HKMA register]. | Say "settlement-agnostic": the guards and pocket work on any token that supports signature checks. Name the real HK options (HKD-licensed stablecoin, bank tokenised deposit). State that USDC is the demo asset only, not a licensed HK product. Replace "APEC" with "Hong Kong and Southeast Asia". |
| 3 | "Demo: testnet assets by default; a few US dollars of real USDC on Base mainnet only if organisers require" | Fine, with one extra caution | Mainland rules cover institutions and services; one court-position snippet says merely holding crypto is not illegal [VERIFY]. We found no rule aimed at foreign students. Not legal advice. | Keep testnet by default. Before travelling to Shenzhen for the 22 Nov defence, ask the organisers in writing whether a mainnet demo or wallet app is acceptable on site. |
| 4 | "Alipay AI Pay (三层授权, KYA via APASS, 可信存证) and UnionPay APOP" as reference designs | Partly confirmed | Alipay on 26 May 2026: "over 300 million AI agent payments" and "supports 95% of general-purpose agents" (company-reported); AI Wallet; Token Pay; ACT protocol 2.0 with 20+ partners, described as China's first agent commerce trust open framework. The page I opened did not mention three-tier authorisation, KYA or APASS. UnionPay: a snippet says it released an "Agent Payment Open Protocol Framework" in April 2026 with 19 partners; whether that is the "APOP" in the spec is not confirmed. | Mark APASS, 三层授权 and APOP as [VERIFY] in the deck, or cite only the 26 May 2026 figures. Add ACT 2.0 as a reference design (also a competitor). |
| 5 | "Compensation scheme (赔付兜底) is a production dependency" | Correct | The headline of a Tencent News piece quotes Alipay's "你敢付，我敢赔" (you dare pay, we pay) [snippet]. The mainland convention puts liability on whoever provides the payment service (谁提供支付服务谁负责). | Keep. Add that in HK/SEA a licensed operator (bank, SVF, acquirer) must carry this. |
| 6 | "Not a mainland consumer product" | Correct, and now stronger | PCAC convention: core payment steps (accounts, processing, clearing) must be done by licensed institutions; members must file agent-payment services with the PCAC before launch. Mainland production use would therefore be through a licensed member, not ChainBrain directly. | Add one line: "In the mainland, a licensed member could adopt the pattern; we do not operate payments." |
| 7 | Spec does not cite NFRA's 2026 AI guidance | Gap | NFRA 金发〔2026〕8号, 18 Jun 2026, 32 items. Fund transactions, asset valuation, credit approval, underwriting/claims and risk management are high-risk uses needing risk-committee approval (item 16). Human supervision, emergency stop and fallback at key steps (17). Weakly explainable AI may only assist; a person decides (22). Agents must be secured against data leakage, memory poisoning, identity over-reach, tool misuse and runaway operation (25). Personal data may not train or tune generative models (24, from earlier research). Caveat: in the text I opened, the word "generative" may qualify only part of item 16. [opened: CLS copy] | Add a mapping table to the security self-assessment (see section 2.3). |
| 8 | "Principal KYC binding: bank or licensed provider issues the credential" | Needs a named real-world path | Hong Kong has no agent-specific KYC rule that I found; PYMNTS says "know your agent" is its own framing, not a regulator's term. HKT Payment + Red Date Technology are testing an agent-registration framework with DIDs and VCs that "tie each agent to a verified person or business" (announced 27 Aug 2026). | In the deck, name the issuer path as "a bank or SVF already doing KYC", and cite HKT Payment's pilot as evidence that regulators are testing the same idea. Do not claim any HK regulator endorses ChainBrain. |
| 9 | Business names | New small risk | Notice No. 42 says business names and scopes may not contain "稳定币" or "RWA". | In Chinese-language material, avoid putting "稳定币" or "RWA" in the product name or tagline. Describe settlement as "on-chain payment on a test network". |

---

## 2. Regulation map (2026)

### 2.1 Mainland China

| Item | Date | What it does | Relevance | Source status |
| --- | --- | --- | --- | --- |
| PBoC + 7 agencies, 银发〔2026〕42号 | 6 Feb 2026 | See section 1, row 1 | Defines why we are testnet-only and not for mainland users | Opened (CSRC copy) |
| PCAC 《智能体支付应用自律公约》 (Self-Regulatory Convention on Agent Payment Applications) | 24 Aug 2026, effective on issue | For members (account, processing, acquiring, clearing institutions): build KYA on top of KYC, grade agents high/medium/low, define the authorisation boundary, sign authorisation agreements, verify user identity and payment intent, prudent review of cross-platform calls and large payments, keep human service and alternative payment methods, file with PCAC before launching autonomous payment (preset-condition or broad-condition), core payment steps by licensed institutions. Three stages: agent-assisted, preset-condition autonomous, broad-condition autonomous. Caixin says it was issued under PBoC guidance. | The closest regulator text to our design. "Authorisation boundary" is our pocket; "KYA" is our agent ID plus owner binding; "cross-platform calls" is what Alipay cannot cover. It is self-regulation by association, not a law. | Opened (21st Century Business Herald via sfccn; Yicai); Caixin paywalled, headline and deck only |
| NFRA 金发〔2026〕8号 | 18 Jun 2026 | See section 1, row 7 | Bank-side AI controls our pocket and logs can plug into | Opened (CLS copy) |
| Alipay ACT 2.0, UnionPay agent-payment framework | May and Apr 2026 | Industry protocols | Competitors and reference designs | Alipay opened; UnionPay snippet only |

I found no PBoC or NFRA rule specific to AI-agent payments beyond the above. A trade report mentions an "AI+Finance implementation opinion" (May 2026) that earlier research could not confirm; I did not find it either [VERIFY].

### 2.2 Hong Kong

| Item | Date | What it does | Relevance | Source status |
| --- | --- | --- | --- | --- |
| Stablecoins Ordinance (Cap. 656 in most sources; one search summary said Cap. 566 [VERIFY on e-Legislation]) | In force 1 Aug 2025 | Licence needed to issue a specified stablecoin in HK in business, or to issue anywhere a token referenced to HKD. Only licensed issuers' tokens may be offered to retail users. Tokenised deposits, SFC-regulated securities and SVF floats are outside it. Issuers need AML/CFT controls. | USDC is not an HKMA-licensed token. Bank tokenised deposits are the cleaner production path. | Snippets (law-firm summaries) |
| First HKMA issuer licences | 10 Apr 2026 | Anchorpoint Financial and HSBC. 36 applications were reported (the Cointelegraph article did not give a number). | Real HKD tokens are about to exist; HSBC plans payments via HSBC HK app and PayMe | Cointelegraph opened; launch details snippet |
| Project Ensemble / EnsembleTX | Pilot "throughout 2026" per HKMA's Nov 2025 release | Real-value tokenised-deposit and digital-asset pilot; first use case tokenised money-market funds; settles via HKD RTGS first, with a plan to move toward 24/7 settlement in tokenised central bank money. WeBank's About page lists it as a member of the Ensemble architecture community [snippet, no year]. | Shows banks will settle in tokenised deposits | Snippet (HKMA page saved locally, not read) |
| e-HKD | Phase 2 findings | Pilot found e-HKD and tokenised deposits can enable programmable payments; HKMA prioritises wholesale use over retail | Retail e-HKD is not near | Snippet |
| GenAI Sandbox++ first cohort | 27 Aug 2026 | HKMA, SFC, Insurance Authority, MPFA and Cyberport. 36 use cases from nearly 100 proposals, 30 financial institutions, 27 tech partners. Focus: agentic AI in onboarding, payments, claims and customer interaction; "AI vs AI" supervision. Trials start later in 2026. SFC's Julia Leung: "greater system autonomy is underpinned by sound governance and clear accountability." Named participants (press, not the annex): Ant Bank (HK), WeChat Pay HK, HSBC Life, Hang Seng Bank [SCMP/The Standard snippets]. HKT Payment + Red Date Technology "Agentic ID" (DIDs + VCs) [PYMNTS, opened]. Visa + BOCHK agent-payment proof of concept in sandbox [snippet]. | Direct validation, and a sign that HK banks will run pilots from Q4 2026 | HKMA press release opened |
| Visa and Mastercard in HK | Mastercard 27 Mar 2026; Visa dated "05/06/2026" (day-first or month-first not clear) | Mastercard: first live agentic transaction in HK (taxi via hoppa; HSBC and DBS as issuers; an "Agentic Token" per agent) [snippet; Mastercard page blocked]. Visa + Bank of China (HK) completed agent-initiated card payments in testing with Visa Intelligent Commerce; Visa's page says nothing about how merchants verify agents. | Card networks are moving; their trust tools are card-based | Visa opened; Mastercard snippet |

### 2.3 Singapore

| Item | Date | What it does | Source status |
| --- | --- | --- | --- |
| MAS "Safeguards for Agentic Finance at Runtime" (SAFR) white paper | 3 Jul 2026 | Four runtime parts: **agent identity** (each action tied to a registered agent), **controls repository** (the institution's rulebook, including user-provided mandates), **disposition engine** (deny, escalate, auto-execute, observe), **audit log** (tamper-evident, append-only). Tested in agent-assisted payments and treasury, wealth review and client engagement. Law firms say it is **not** regulatory guidance or supervisory expectations. | Rajah & Tann and Baker McKenzie opened; MAS PDF not found |
| MAS AI Risk Management Guidelines | Final reported 7 Oct 2026 (one commentary; also one source says still at proposal stage on 5 Aug 2026) | Covers AI agents; phased start Oct 2027 and Oct 2028; kill switches for high-materiality agentic systems (blog claim) | Secondary commentary only [VERIFY] |
| Single-Currency Stablecoin framework; Project Guardian | 2026 | Amendments to Payment Services Act reportedly proposed 1 Sep 2026 [LinkedIn snippet, weak]. No Guardian agent-payment item found. | [VERIFY] |

**How our design lines up with SAFR (our reading):**

| SAFR part | ChainBrain part |
| --- | --- |
| Agent identity | Guard 1 (challenge-response) + agent registry |
| Controls repository (includes user mandates) | The pocket rules and the seller's published policy |
| Disposition engine: deny / escalate / auto-execute | Refuse / step-up / serve |
| Tamper-evident log | Chain of pocket rules, intent hash, payment, receipt |

### 2.4 APEC 2026

Leaders' Meeting in Shenzhen, 18-19 Nov 2026 (CGTN, NCAPEC). Officials say the host year includes digital economy and AI. I found no finance-ministers' agenda for 2026 and no AI-agent-payment item. Hong Kong takes part in APEC as "Hong Kong, China". Do not claim an APEC agenda link; the safe wording is "our target banks sit in APEC economies".

---

## 3. The five strongest real-world-value facts for the pitch

Each fact says what we opened, so you can quote it safely. Company-supplied numbers are marked.

| # | Fact | Why it helps us | Source status |
| --- | --- | --- | --- |
| 1 | **China's payment industry body has just made "Know Your Agent" an explicit expectation.** On 24 Aug 2026 the PCAC convention told members to build KYA on top of KYC, set each agent's authorisation boundary, and file before launching autonomous payments. Caixin calls it the country's first such guideline and says it targets "unauthorized transactions". | Regulators, not just startups, now name the problem. Our agent ID plus pocket answers both items. | Opened (sfccn, Yicai); Caixin deck only |
| 2 | **Merchants are adopting agent protocols faster than they can defend against agent fraud.** Ravelin (1,504 fraud and payments professionals, 10 countries, enterprise merchants, reported 22 May 2026): 44% are already integrating agentic commerce protocols, 32% more within six months, but only 29% feel very prepared for agentic fraud. Liability for a bad agent purchase is "unresolved". Ravelin sells fraud tools, so treat it as vendor research. | This is the seller-side pain we say we solve. It is the cleanest answer to "who is the customer?" | Opened (eCommerceNews Asia) |
| 3 | **Nobody has settled who pays when an agent buys the wrong thing.** Worldpay: "No liability shift exists yet" for agentic transactions. Without a signed mandate, agent-versus-shopper disputes are "a coin flip" and issuers tend to side with cardholders. "My agent went rogue" can be friendly fraud with a new excuse. | Our chain of pocket rules, intent hash, quote and receipt is exactly the "signed mandate" and evidence Worldpay says is missing. Caveat: card rules do not yet recognise on-chain evidence; we offer evidence, not a legal ruling. | Opened (Worldpay) |
| 4 | **On-chain, you cannot yet tell an agent from a script.** TRM Labs (9 Sep 2026): about US$52.7m across 198.9m x402 settlements since May 2025; about US$25.6m looks like real commerce after filtering; AI agents are 0.6% to 7.5% of that; scripts and agents look identical on-chain. | It is independent evidence for the KYA gap, from a respected blockchain-analytics firm. It also stops us overclaiming. | Opened (TRM blog) |
| 5 | **Regulators in two jurisdictions are drafting the same control loop we built.** MAS SAFR (3 Jul 2026): agent identity, rulebook, deny/escalate/auto-execute, audit log. Hong Kong GenAI Sandbox++ (27 Aug 2026): 36 agentic pilots including payments, plus an "Agentic ID" pilot by HKT Payment and Red Date. | Shows we are early but on the path banks are already walking. Also gives the "why HK and SEA" answer. | Opened (Rajah & Tann, HKMA, PYMNTS) |

**Reserve facts (use if time allows):**
- Cloudflare (24 Oct 2025): merchants must be able to "distinguish legitimate, approved agents from malicious bots"; Visa's Trusted Agent Protocol and Mastercard's Agent Pay both use Web Bot Auth (HTTP Message Signatures). Opened. Note this is the same standard family as RFC 9421, which our spec names as the production path.
- Chargebacks911 2026 Chargeback Field Report (250+ merchants): 83.4% of enterprise merchants saw more friendly fraud over three years; 38% say chargeback costs have influenced their prices (up from 32.5%). The report has no agent-specific figure. Opened.
- Thales/Imperva Bad Bot Report 2026 (2025 data): more than 53% of web traffic automated; AI-driven bot blocked requests rose from about 2m to 25m a day; financial services take 24% of bot attacks and 46% of account takeover incidents. Snippet only; one source reads "40% bad bots" differently [VERIFY base].

**Counter-evidence to keep in the Q&A pocket:**
- Riskified management said agentic purchasing through general LLMs is still "extremely low and limited" and higher-risk (earnings call, Mar 2026) [snippet]. Riskified's Q1 2026 consumer survey (US and UK): 55% uncomfortable with agents buying for them; 50.8% say AI platforms should be responsible for unauthorised purchases [snippet; vendor].
- Ravelin also reports 53% of merchants trust AI shopping agents more than human shoppers (47% the reverse). This cuts both ways: merchants may not fear agents as much as our pitch assumes.
- Forkast (10 Jul 2026), citing Artemis: about half of x402 transactions are artificial; real daily volume near US$28,000; the article says identity is "not addressed" and quotes Product.ai that only 14% of consumers trust AI to buy without human verification [opened; secondary].

---

## 4. Market size: forecasts, side by side

These are **forecasts**, not facts. They disagree because they count different things. Most are second-hand (search snippets); none of the numbers below should go on a slide without the footnote.

| Source | Figure | Scope | Status |
| --- | --- | --- | --- |
| McKinsey | Up to US$1 trillion US B2C orchestrated revenue by 2030; US$3-5 trillion global; goods only, no services, no B2B | Counts what agents orchestrate or influence | Search snippet of McKinsey page (fetch timed out) |
| Morgan Stanley (8 Dec 2025) | 10-20% of US e-commerce by 2030 = US$190-385 billion | Stricter "meaningful autonomous action" | Snippet |
| Bain | US$300-500 billion US by 2030 (15-25% of US e-commerce) | Includes agent-"influenced" purchases | Snippet, secondary |
| Juniper Research | US$1.5 trillion global transaction value by 2030 | Full transaction flow | Snippet, secondary |
| eMarketer | About US$144 billion by 2029 | Only checkouts inside a chat window | Snippet, secondary |
| Gartner | 20% of digital commerce transactions through AI platforms or agents by 2030 | Share, not dollars | Snippet, secondary [VERIFY] |
| Ravelin merchant survey | Merchants expect agentic commerce to be 6% to 30% of transactions within three years | Merchant expectation, not a forecast model | Opened |

**Observed, not forecast:** Adobe says AI-referred traffic to US retail sites rose 393% in Q1 2026 year on year [snippet via Decrypt]; HUMAN Security reports agentic traffic up 7,851% [snippet]. A German university study puts ChatGPT-sourced traffic under 0.2% of traffic [snippet]. These measure visits, not purchases.

**Hong Kong and Asia-specific numbers:** none of the forecasts above is Hong Kong-specific. We did not find a credible HK agentic-commerce size. Do not invent one; say "no HK-specific forecast exists yet; global forecasts range from hundreds of billions to trillions of US dollars depending on scope".

**Reality check on the rail we use.** x402 counts differ a lot: 75.4m transactions and about US$24m in 30 days (Forkast, 10 Jul 2026); 200m+ cumulative transactions with more than 95% "protocol signalling" (Artemis via Major Matters tracker, Jun 2026); about US$19m adjusted across about 134m transactions with 4,000 wallets giving 90% of volume (Visa + Artemis, data to 21 Apr 2026, headline only opened); a headline saying volume is down 93% year-to-date [snippet, aggregator]. Chains disagree too: one source says Solana has about 70% of monthly volume (mid-Aug 2026); Visa + Artemis found Base at about 93% of adjusted volume. Keep both.

---

## 5. WeBank fit

### 5.1 What WeBank and WeBank Technology Services sell (re-checked where noted)

| Item | What we know | Source status |
| --- | --- | --- |
| WeBank | Digital-only bank; Tencent about 30% (old reports, current cap table not found). 2025 results (via media): revenue down 4.84%, corporate loans down 11.27%. "More than 430 million" individuals and "more than 7 million" small businesses served (WeBank-reported). | Prior research, ifeng; not re-opened this session |
| AI-native strategy | Wang Yasheng (assistant GM, digital finance and AI architecture): "我们正从'人执行、AI辅助'转向'AI默认执行、人只处理例外'". 80+ digital employees "formally joined", with directory entries and performance reviews. Anti-fraud digital employee "吴吒": 3 days to 5 minutes per case. Asian Banker's first "Best AI-Driven Bank in Asia-Pacific" award, ceremony 16 Jul (year inferred 2026). | Opened (Jiemian, 28 Jul 2026) |
| Agent counts conflict | HK FinTech Week press release (4 Nov 2025): "more than 730 agents, more than 50 digital employees". Earlier research cites "800+ agents" (Xinhua) and "70+ digital employees" (May 2026). Different dates and definitions; quote one with its date. | Press release opened; other from prior research |
| WeBank Technology Services (WeBank Tech) | Hong Kong-incorporated, wholly owned. HK global sales and innovation centre. Expanded into HK, Indonesia, Malaysia, Thailand. "20+ potential partners and cooperation agreements worth over US$100m" (company claim, 4 Nov 2025; no partners named). Signing ceremony 16 Jan 2025 with Mega Corp (ID), SCBX (TH), Hong Leong Bank (MY), Fusion Bank (HK) among partners. Plan to invest up to US$150m in HK (Jul 2024, snippet). | HK FinTech Week PR opened; rest snippet |
| Blockchain | FISCO BCOS (repo describes "5,000+ organisations, 400+ applications"; v3.16.4 stable Jan 2026, pre-release v3.17.1 Sep 2026, from prior research, not re-checked). WeIdentity (DID and VC; last push Apr 2025, last release 2023, prior research). WeDPR (privacy computing), FATE (federated learning, Linux Foundation, dormant since Nov 2024). | Prior research |
| POTOS | WeBank Tech's Web3 platform for Hong Kong, focused on real-world-asset tokenisation, built on FISCO BCOS (article 11 Apr 2025). The article does not mention HKMA or SFC licences. | Opened (The Digital Banker) |
| What the HK FinTech Week release does **not** mention | Blockchain, stablecoins, tokenised deposits. It was about core banking and AI. | Opened |

### 5.2 Qiang Yang

- PolyU lists him as Director of the Academy for AI, Director of the Research Institute for Federated Learning, Chief AI Officer (PolyU) and Chair Professor, since 1 Apr 2025.
- 29 Apr 2026 PolyU forum keynote "On Future of AI and Federated AI": federated learning and **federated agents** are key to decentralised, privacy-preserving AI; a "Federated AI Agents" framework is in development at his institute (PolyU pages, opened via snippet and prior research).
- Role conflict, keep side by side: the competition site calls him "Chief AI Adviser, WeBank"; his HKUST page says "Former Chief AI Officer, WeBank (2018-2025)". An older copy of the competition site in our reference folder lists him as "Chairman of Judges" for the AI track with the title "Chief Artificial Intelligence Officer, WeBank"; that copy looks like an old edition and should not be relied on [VERIFY]. Whether he sits on the 2026 scoring panel is unconfirmed (see [How judges score](../06-pitch/how-judges-score.md)).

### 5.3 What WeBank-side judges likely care about, and how ChainBrain speaks to it

This is our inference from public statements, not a stated scoring rule.

| WeBank signal | Source | ChainBrain answer | Say it like this |
| --- | --- | --- | --- |
| "AI executes by default, humans handle exceptions" | Wang Yasheng, Jul 2026 | Serve is the default; step-up is the exception handed to a human; refuse is a hard stop | "Our three verdicts are your sentence, applied to payments." |
| Anti-fraud and compressed investigation time (3 days to 5 minutes) | Jiemian | The seller console and evidence chain shorten "who authorised this?" from a dispute to a lookup | "A merchant checks one chain instead of three systems." [illustrate with our own demo time; do not claim WeBank numbers] |
| Privacy-preserving design (federated learning, "data usable but not visible") | Qiang Yang's research; WeDPR | Agent holds proofs, not raw personal data; sellers get verdicts, not history | "Proofs, not data." |
| Regulation-ready: human checkpoint, emergency stop, logs, agent security | NFRA 金发〔2026〕8号 items 17, 22, 25 | Step-up, revoke, audit chain, signing allowlist, pocket limits | Use the mapping in 5.4 |
| Southeast Asia and Hong Kong expansion | WeBank Tech | Rail-agnostic guards sold to HK and SEA banks' merchants | "A trust layer WeBank Tech's bank clients can offer their merchants." |
| Open-source stack (FISCO BCOS, WeIdentity) | Official competition site lists these platforms | Optional minimal FISCO deployment as a bonus; WeIdentity-style DID and VC model | Only claim it if the deployment exists and a hash can be shown |

### 5.4 Mapping to the mainland bank rulebook (for the security self-assessment)

| NFRA 金发〔2026〕8号 item | Requirement (our paraphrase) | ChainBrain control |
| --- | --- | --- |
| 16 | High-risk AI uses need risk-committee approval | Out of scope in a demo; pocket rules are the artefact a committee would approve |
| 17 | Human supervision and intervention, emergency stop, fallback | Step-up, Revoke button, safe-fallback scene 9 |
| 22 | Weakly explainable AI may only assist; a person decides; human review points; logs | Template-rendered intent (not an LLM paraphrase), owner signature, audit chain |
| 25 | Secure agents against data leakage, memory poisoning, identity over-reach, tool misuse, runaway operation; adversarial testing | Disclosure policy, untrusted-content marking, challenge-response, signing allowlist, budget and expiry on-chain, red-team box |

### 5.5 How to frame ChainBrain as useful to WeBank without overclaiming

- **Safe claims:** "a pattern that fits WeBank Tech's HK and SEA bank clients"; "built to run on any token with signature checks"; "FISCO BCOS deployment is a bonus, shown only if a transaction hash exists".
- **Unsafe claims:** that WeBank will license it; that WeBank has an agent-payments product (we found none); that FISCO BCOS is production-ready for ERC-4337 (the spec's own risk table says SM2 breaks Ethereum signatures); that WeBank accepts USDC (it cannot in the mainland).
- **Use their words:** "AI default execution, humans handle exceptions"; "inclusive finance". Avoid "AI as a financial participant" as a WeBank quote; earlier research found it only in the competition's own brief.
- **Hong Kong angle:** WeBank Tech is an HK-incorporated subsidiary with an HK sales centre and, per prior research, ties to Fusion Bank. A merchant-trust layer for HK-licensed tokens is a plausible adjacency. It is an inference, not a WeBank statement.
- **Inclusive-finance angle (optional):** SME owners are the spec's buyer persona. WeBank says about 50% of its Weiyedai credit clients had no prior enterprise credit record (新京报, 4 Mar 2026, from prior research). A small business without a credit record could still hold a limited pocket. Present this as an idea, not a WeBank commitment.

---

## 6. Business model sanity check

The spec's model: verification fee per request, seller-console subscription, trust tiers for agent operators, white-label licence to banks.

| Revenue line | Sanity check | Verdict |
| --- | --- | --- |
| Per-request verification fee | CDP's x402 facilitator is free for 1,000 on-chain transactions a month and US$0.001 after; "payment verification is always free" (docs opened). TRM puts total agent-payment volume at roughly US$5,000-11,000 a month. If the fee were even US$0.001 per check, one million checks would earn US$1,000 (our arithmetic). Today's volumes make this near zero. Free or bundled alternatives exist for cards (Cloudflare Web Bot Auth, Visa TAP, Mastercard Agent Pay). | Weak as the lead line. Keep as a usage-based add-on once volume exists. |
| Seller console subscription | Matches what merchants buy today from fraud vendors (Ravelin, Riskified sell to merchants). Merchants lack agent defences (29% very prepared). Price points not researched [VERIFY]. | Plausible. Needs one named buyer type, e.g. an HK online merchant or API seller. |
| Trust tiers for agent operators | Agent developers pay to be "fast lane". Skyfire's KYAPay already issues signed identity and payment tokens (USDC or tokenised card) and DataDome verifies them on the merchant side (docs opened via search; pricing not found). Charging agents when free alternatives exist is hard. | Weak. Reframe as "reputation is earned, not bought". |
| White-label licence to banks | The mainland convention and NFRA rules both make licensed institutions responsible, so the buyer who must care is the bank or acquirer. WeBank Tech sells technology to partner banks (company-claimed US$100m+ agreements). | Strongest, and the only line with a clear buyer. Do not claim a signed deal. |

**Recommended framing:** "We sell the control layer to the licensed institution, who offers it to its merchants. Per-check fees are a later usage add-on." Show arithmetic only if labelled "illustration, not forecast".

**Competitors and substitutes to name honestly:** Alipay ACT 2.0 and AI Wallet; UnionPay's framework; Skyfire KYAPay; Cloudflare Web Bot Auth with Visa TAP and Mastercard Agent Pay; HKT Payment with Red Date "Agentic ID". Full landscape is in [competitors-industry.md](competitors-industry.md).

---

## What this means for winning

| # | Recommendation | Tag | Helps |
| --- | --- | --- | --- |
| 1 | Fix the spec's compliance paragraph: accurate description of Yinfa No. 42, USDC as demo-only, "Hong Kong and Southeast Asia" instead of "APEC" (section 1 rows 1, 2, 3). | [must] | Security 30 |
| 2 | Add a one-slide "Regulators are asking for this" table: PCAC KYA convention (24 Aug 2026), MAS SAFR (3 Jul 2026), HK Sandbox++ (27 Aug 2026). Label SAFR as non-binding and PCAC as industry self-regulation. | [must] | Innovation 30, Security 30 |
| 3 | Put the merchant-readiness gap first in the pitch (Ravelin 29% and Worldpay "no liability shift"), then show seller guards. | [must] | Innovation 30 |
| 4 | Never cite x402 volume as traction. Cite TRM instead: on-chain cannot tell agent from script, which is why KYA is needed. | [must] | Innovation 30, Security 30 |
| 5 | Describe settlement as "any token that supports signature checks": USDC on testnet for tx hashes; HKD licensed stablecoin or tokenised deposit for production. | [must] | Task 40, Bonus |
| 6 | Add the NFRA mapping table (5.4) and a SAFR mapping to the security self-assessment. | [should] | Security 30 |
| 7 | Use Wang Yasheng's line to explain serve / step-up / refuse, with the date and "WeBank-stated" attribution. | [should] | Innovation 30 |
| 8 | Lead the business slide with white-label to licensed institutions and a seller-console subscription; show the per-check fee as small and later. | [should] | Innovation 30 |
| 9 | Avoid "稳定币" and "RWA" in Chinese product naming; call settlement "on-chain payment on a test network" in Chinese slides. | [should] | Security 30 |
| 10 | Prepare Q&A answers for the counter-evidence: agent traffic is still small, merchants may trust agents, consumers are uneasy (section 3). Answer: we price the gap before it opens; the pocket limits loss. | [should] | Innovation 30 |
| 11 | Name HKT Payment + Red Date and Skyfire as peers and say how we differ (seller guards; on-chain pocket enforcement; open MCP + SKILL.md). | [could] | Innovation 30 |
| 12 | Only mention FISCO BCOS if a tx hash exists; cite WeBank Tech's HK and SEA reach as the route to market. | [could] | Bonus |

## Open questions

- Has either HKMA-licensed stablecoin (HKDAP, HSBC's token) actually launched to the public? Check the HKMA register of licensed stablecoin issuers.
- What is the exact Cap. number of the Stablecoins Ordinance (656 vs 566)? Check e-Legislation.
- Full text of the PCAC convention: what exactly does KYA require, and does "filing" cover technology vendors? We have press summaries only. Also the Caixin article (paywalled).
- Is UnionPay's April 2026 "agent payment open protocol framework" the same as "APOP", and do Alipay's APASS and 三层授权 appear in a 2026 primary source?
- Does Qiang Yang sit on the 2026 scoring panel, and in what title?
- Will the organisers accept testnet hashes, and is a mainnet demo acceptable in Shenzhen? (Spec already lists the first; add the second.)
- Is there any HK-specific forecast for agentic commerce or HK merchant survey? None found.
- Do the HKMA and SFC say anything about agent identity or KYA beyond the sandbox? Only PYMNTS's framing found.
- What do Cloudflare, Visa TAP and Mastercard Agent Pay charge merchants? Not found.

## Sources

Access date for all web pages: 2026-10-13. "Opened" means the page was fetched and read; "snippet" means only a search-result summary was seen.

**Mainland China**
- PBoC et al. 银发〔2026〕42号 (opened, CSRC copy): https://www.csrc.gov.cn/csrc/c100028/c7614318/content.shtml ; local snapshot: `/Users/user/Workspace/Projects/shenzhen/lianainao-fintechathon/reference/papers/regulation/2026-pboc-yinfa42-virtual-currency-notice.html`
- PCAC convention, 21st Century Business Herald via sfccn (opened): https://www.sfccn.com/2026/8-27/wMMDE0MDZfMjIyMjUwMQ.html
- PCAC convention, Yicai (opened): https://www.yicai.com/news/103331509.html ; local snapshot: `.../reference/papers/regulation/2026-pcac-agent-payment-convention-yicai.html`
- Caixin Global, 25 Aug 2026 (paywalled; headline and deck only): https://www.caixinglobal.com/2026-08-25/china-pioneers-know-your-agent-rules-for-ai-payments-102477712.html
- NFRA 金发〔2026〕8号, CLS reprint (opened): https://www.cls.cn/detail/2403832 ; local snapshot: `.../reference/papers/regulation/2026-nfra-ai-safe-development-guidance-cls.html`
- Alipay 26 May 2026 announcement, Tencent News (opened): https://news.qq.com/rain/a/20260526A079BK00 ; "你敢付，我敢赔" headline (snippet): https://news.qq.com/rain/a/20260526A0AEL400 ; Xinhua on AI payments, UnionPay framework (snippet): https://www.news.cn/fortune/20260527/ced18a0da09a42b4bd0ed09d5b596c5e/c.html
- Prior research: `/Users/user/Workspace/Projects/shenzhen/lianainao-fintechathon/reference/prior-research/docs/china-constraints.md`

**Hong Kong**
- HKMA first licences, Cointelegraph (opened): https://cointelegraph.com/news/hong-kong-first-stablecoin-licenses-issued ; launch details (snippet): https://thepaypers.com/crypto-web3-and-cbdc/news/hong-kong-issues-stablecoin-licences-to-hsbc-and-anchorpoint-financial
- Stablecoins Ordinance summaries (snippets): https://www.morganlewis.com/pubs/2025/06/hong-kongs-stablecoins-ordinance-to-take-effect-august-1-an-overview-of-the-regulatory-framework ; https://wiki.private.law/en/hk-stablecoin-ordinance
- HKMA GenAI Sandbox++ first cohort, 27 Aug 2026 (opened): https://www.hkma.gov.hk/eng/news-and-media/press-releases/2026/08/20260827-3/ ; local snapshot: `.../reference/papers/regulation/2026-hkma-genai-sandbox-plus-first-cohort.html`
- PYMNTS on HKT Payment + Red Date "Agentic ID" (opened): https://www.pymnts.com/news/banking/2026/hong-kong-tests-know-your-agent-controls-in-payment-workflows/
- Named Sandbox++ participants (snippet): https://www.scmp.com/business/banking-finance/article/3365478/hong-kong-expands-ai-sandbox-projects-include-banks-securities-and-insurance ; https://www.thestandard.com.hk/innovation/article/341121/Hong-Kong-unveils-first-cohort-of-GenAI-Sandbox
- Linklaters Asia fintech bulletin, 9 Sep 2026 (opened): https://techinsights.linklaters.com/post/102o0io/asia-fintech-payments-regulatory-bulletin-september-2026
- HKMA Project Ensemble new phase, Nov 2025 (snippet; local copy not read): https://www.hkma.gov.hk/eng/news-and-media/press-releases/2025/11/20251113-3/ ; `.../reference/papers/regulation/2025-hkma-project-ensemble-new-phase.html`
- HKMA Fintech 2030 / e-HKD (snippet): https://www.fidinam.com/en/blog/hkma-unveils-fintech-2030-hong-kong-fintech-week ; https://www.thestandard.com.hk/innovation/article/315331/Digital-Hong-Kong-dollar-to-advance-in-the-first-half-of-2026
- Visa + BOCHK (opened): https://www.visa.com.hk/en_HK/about-visa/newsroom/press-releases/visa-advances-the-next-phase-of-agent-initiated-card-payments-in-hong-kong.html
- Mastercard first live agentic transaction in HK (snippet; page returned 403): https://www.mastercard.com/news/ap/en-hk/newsroom/press-releases/en-hk/2026/mastercard-completes-its-first-live-agentic-transaction-in-hong-kong

**Singapore and APEC**
- Rajah & Tann on MAS SAFR (opened): https://www.rajahtannasia.com/viewpoints/mas-publishes-white-paper-for-fis-on-developing-safeguards-for-ai-agents-in-finance/
- Baker McKenzie on SAFR (opened): https://www.bakermckenzie.com/en/insight/publications/2026/07/singapore-mas-publishes-agentic-ai-safeguards-for-financial-institutions
- MAS AI risk guidelines commentary (snippet): https://genesishumanexperience.com/2026/10/07/mas-ai-risk-management-guidelines-final-2026/
- APEC 2026 (snippet): https://news.cgtn.com/news/2026-08-10/APEC-2026-enters-final-100-day-countdown-as-China-aims-for-outcomes-1PuzftU4hck/share_amp.html ; https://ncapec.org/apec-korea-2025-conclusion-and-apec-china-2026/

**Merchant and market evidence**
- Ravelin survey via eCommerceNews Asia, 22 May 2026 (opened): https://ecommercenews.asia/story/merchants-rush-to-adopt-ai-shopping-agents-ravelin-finds
- Worldpay, "Agentic commerce liability is still being written" (opened): https://worldpay.com/insights/articles/agentic-commerce-liability-is-still-being-written
- Cloudflare, 24 Oct 2025 (opened): https://blog.cloudflare.com/secure-agentic-commerce/ ; local snapshot: `.../reference/papers/regulation/2025-cloudflare-secure-agentic-commerce.html`
- TRM Labs, 9 Sep 2026 (opened): https://www.trmlabs.com/trm-tech-blog/whos-actually-paying-measuring-ai-agent-payments-onchain ; local snapshot: `.../reference/papers/regulation/2026-trm-whos-actually-paying-x402.html`
- Forkast, 10 Jul 2026 (opened): https://forkast.news/half-of-x402s-transaction-volume-is-artificial-the-infrastructure-layer-keeps-building-anyway/ ; Glenbrook reprint (partial): https://glenbrook.com/payments_news/the-x402-foundation-activated-a-27-year-old-internet-code-200-million-transactions-later-the-real-volume-is-still-tiny/ ; Visa + Artemis headline: https://thedefiant.io/converge/infrastructure/visa-s-sheffield-pegs-adjusted-x402-volume-at-19m
- Chargebacks911 2026 Chargeback Field Report (opened): https://chargebacks911.com/2026-chargeback-field-report/
- Riskified Q1 2026 Agentic Commerce Pulse (snippet): https://www.businesswire.com/news/home/20260427900819/en/
- Thales/Imperva Bad Bot Report 2026 (snippet): https://www.imperva.com/blog/bad-bot-report-2026-bots-agentic-age/
- Adobe and HUMAN traffic figures (snippet): https://decrypt.co/364733/ai-traffic-us-retailers-jumps-q1-agentic-shoppers-outspend-humans
- McKinsey (snippet): https://www.mckinsey.com/industries/retail/our-insights/the-agentic-commerce-opportunity-how-ai-agents-are-ushering-in-a-new-era-for-consumers-and-merchants ; Morgan Stanley (snippet): https://morganstanley.com/insights/articles/agentic-commerce-market-impact-outlook ; Bain, Juniper, eMarketer, Gartner via aggregator (snippet, secondary): https://stellagent.ai/insights/agentic-commerce-market-size-forecast-2030
- Skyfire KYAPay docs (snippet): https://docs.skyfire.xyz/docs/kya-buyer ; DataDome integration: https://docs.datadome.co/docs/skyfire-kyapay
- Coinbase CDP x402 facilitator pricing (opened): https://docs.cdp.coinbase.com/x402/core-concepts/facilitator ; ctx7 library ID used: /websites/cdp_coinbase_x402

**WeBank**
- Jiemian, 28 Jul 2026 (opened): https://www.jiemian.com/article/14835776.html
- WeBank at HK FinTech Week, 4 Nov 2025 (opened): https://kyodonewsprwire.jp/release/202511048435
- POTOS, The Digital Banker, 11 Apr 2025 (opened): https://thedigitalbanker.com/webank-launches-potos-to-strengthen-hong-kongs-web3-future/
- WeBank Tech HK headquarters and partners (snippet): https://fintechnews.hk/32120/fintechchina/webank-hong-kong-headquarters/ ; https://www.webank.com/en/about
- Qiang Yang, PolyU forum 29 Apr 2026 (snippet): https://www.polyu.edu.hk/paai/news-and-events/news/2026/29-april-2026-paai-openclaw-forum/ ; profile: https://www.polyu.edu.hk/paai/people/directors/yang-qiang/
- Competition site copy (local): `/Users/user/Workspace/Projects/shenzhen/lianainao-fintechathon/reference/prior-research/official/text/lang-en-US-home-full.txt`
- Prior research (local, not all re-verified): `/Users/user/Workspace/Projects/shenzhen/lianainao-fintechathon/reference/prior-research/docs/webank-context.md`

**Related team docs:** [Product design](../02-product/product-design.md); [Competitors and industry](competitors-industry.md); [How judges score](../06-pitch/how-judges-score.md).

See also: [master index](../README.md), [how to win](../06-pitch/how-to-win.md), [recommended changes](../02-product/recommended-changes.md)
