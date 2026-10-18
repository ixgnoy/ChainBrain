# Routine pockets and bring-your-own agents: research and verdict
Last updated: 2026-10-16

> **What this is:** research for two ideas raised on 16 Oct.
> 1. **Routine pockets / "apps inside the app":** the owner says a routine in words, and ChainBrain builds a small app for it that keeps running and spending inside hard limits. Compared to Claude Cowork and Gemini Spark, but inside a wallet that can pay.
> 2. **Bring your own agent:** the owner's own agent (Claude, ChatGPT, OpenClaw…) uses a pocket, and ChainBrain can wake that agent when a routine fires.
>
> Four parallel research passes covered: products and market reports; protocols; academic papers; GitHub repos. Most product and market facts come from search results and secondary coverage. Items marked [unverified] need checking against the primary source before they go in the deck. Paper details were mostly read from abstracts or summaries.

## In one minute

- **The gap is real.** Big platforms do *routines* but gate every purchase with a human tap:
  - Claude Cowork scheduled tasks;
  - Gemini Spark (Google I/O, May 2026), which "asks first" before spending;
  - ChatGPT scheduled tasks (June 2026).

  Payment apps do *one-off purchases* with confirmation: Perplexity Instant Buy, Copilot Checkout, Alipay's Ah Bao, WeChat Pay's AI card. **We found no consumer product where you state a routine in words and an agent keeps buying inside a budget you set, with no tap needed until a limit.** Treat that as "not found", not proof that none exists.
- **Consumers want bounded autonomy, not full autonomy.** Accenture (25,590 people, June 2026): 74% would trust a personal agent to buy, 32% would let it choose if they confirm payment, and **only 9% accept fully autonomous purchase plus payment**. Riskified (Q1 2026): 74% expect biometric or one-time-code safeguards. That points to exactly a pocket: small, automatic inside limits, a cheque above them.
- **The papers support our design:**
  - enforcement outside the model (CaMeL; Design Patterns for securing agents);
  - safety layers that can only tighten;
  - a plan fixed before reading untrusted content, which a stated routine gives us for free;
  - memory isolated from rules (AgentPoison, MINJA, "AI Agents in Cryptoland");
  - friction matched to the stakes (Levels of Autonomy; Adjust for Trust).

  A routine the user states avoids the weakest part of proactive agents, which is guessing intent (ProactiveBench F1 about 66%).
- **"Calling the user's agent" works only for some agents.** Consumer ChatGPT and Claude chats cannot be woken by a third party. There is no inbound API, and MCP sampling and elicitation only work inside a session the client already opened. What can be called:
  - self-hosted OpenClaw (`POST /hooks/agent`, MIT);
  - Claude Code Routines (`POST /v1/claude_code/routines/{id}/fire`, experimental);
  - n8n webhooks;
  - any A2A agent with a public endpoint;
  - an agent we run with the user's own API key.
- **Verdict:** a good direction, and it sharpens the USP to **"a standing order for your AI"**. You say the job once; the AI keeps doing it; the pocket contract you own caps it; the AI guards can only brake. **For 20 Oct, build a light version on the built-in network** and keep live receipts as priority one. The full version (generated screens, BYO adapters) is the finals story.

## 1. Products: who does routines, who pays (late 2026)

| Product | Runs routines by itself | Pays | Spending control | Source |
| --- | --- | --- | --- | --- |
| Claude Cowork (Anthropic) | Yes, scheduled tasks run remotely even with the laptop closed | No payment feature found | n/a. User reports of it deleting files | [support](https://support.claude.com/en/articles/13854387-schedule-recurring-tasks-in-cowork), [Decoder](https://the-decoder.com/claudes-cowork-desktop-app-now-runs-scheduled-tasks-so-your-ai-assistant-works-while-you-sleep/) |
| Gemini Spark (Google, I/O 19 May 2026) | Yes, 24/7 on cloud VMs; Gmail, Docs, Calendar, and MCP partners (Instacart, OpenTable…) | Yes | Asks before "high-stakes actions like spending money"; logged and pausable. US, AI Ultra only at launch | [TNW](https://thenextweb.com/news/google-gemini-spark-agentic-assistant-gmail-io-2026), [Engadget](https://engadget.com/2176556/googles-gemini-spark-is-an-agentic-ai-assistant) |
| ChatGPT scheduled tasks (Jun 2026; replaces Pulse) and Instant Checkout (ACP, Sep 2025) | Yes (at most hourly) | Yes, in chat | Per-step confirmation; tokens scoped to a merchant and amount. Whether tasks can pay: not found | [MuyComputer](https://www.muycomputer.com/2026/06/19/chatgpt-mejora-sus-tareas-automaticas-y-elimina-pulse/), [PPC Land](https://ppc.land/openai-launches-instant-checkout-for-chatgpt-with-stripe-partnership/) |
| Manus (Meta) | Yes; trusted scheduled workflows may skip approval | Not found | n/a | [docs](https://manus.im/docs/ko/features/scheduled-tasks) |
| Perplexity Instant Buy (PayPal), Microsoft Copilot Checkout | No (on demand) | Yes | Merchant checkout | [MakeTechEasier](https://maketecheasier.com/perplexity-ai-shopping-pay-with-paypal/), [eWeek](https://www.eweek.com/news/microsoft-copilot-checkout-shopping/) |
| Alipay Ah Bao (AI-native Alipay, Jun 2026), AI Pay / AI Wallet | On request; 10,000+ services | Yes | Transfers and payments need manual confirmation; Ant cites 300M AI payments (company figure) | [Yicai](https://www2.yicaiglobal.com/news/ant-launches-ai-native-alipay-app-as-chinese-tech-giants-race-to-build-super-ai-apps), [TechNode](https://technode.global/2026/08/18/alipay-launches-agentic-commerce-platform-in-china-to-bring-ai-tools-to-merchants/) |
| WeChat agents (Jun 2026), WorkBuddy with a WeChat Pay AI card | On request (beta) | Yes, from a dedicated AI card | Final confirmation on the phone | [Caixin](https://www.caixinglobal.com/2026-06-18/tech-brief-june-18-tencent-lets-ai-agent-make-purchases-through-wechat-pay-102455568.html) |
| Developer and business rails: Mastercard Agentic Tokens, Visa Intelligent Commerce, AP2 mandates, Crossmint agentic cards, Ramp agent cards, Skyfire limits | n/a | Yes | Tokens or cards with limits, merchant allowlists and categories (enforced by the network or provider, not owned by the user) | [Crossmint](https://www.crossmint.com/products/agentic-cards), [Ramp](https://agents.ramp.com/docs/agent-cards/overview), [Skyfire](https://docs.skyfire.xyz/docs/agent-spending-limits) |

**Pattern:** routine agents ask before paying, and paying agents wait for a request. The combination (a routine that pays by itself, inside a budget the user owns) is the empty middle. **Biggest threat:** Google (Spark plus AP2 human-not-present mandates) or Alipay adding recurring limits, with their distribution. **Our defence:** limits in a contract the user owns, AI layers that can only brake, and public proof.

## 2. Market and trust numbers (for the deck; check before use)

- McKinsey: up to US$1T of US B2C agent-orchestrated revenue by 2030, US$3-5T globally. This includes AI-influenced purchases, not only autonomous ones. [McKinsey](https://www.mckinsey.com/industries/retail/our-insights/the-agentic-commerce-opportunity-how-ai-agents-are-ushering-in-a-new-era-for-consumers-and-merchants)
- Morgan Stanley: up to US$385B of US online sales by 2030 (bull case). [Digital Commerce 360](https://www.digitalcommerce360.com/2025/12/09/morgan-stanley-ai-agentic-shoppers-385-billion-online-sales/amp/)
- **Accenture, 3 Jun 2026: 9% accept fully autonomous purchase plus payment; 32% if they confirm payment.** [Accenture](https://www.accenture.com/gb-en/insights/consulting/talk-my-ai-agent)
- Riskified Q1 2026: 55% are not comfortable letting agents complete transactions; 73.9% expect biometric or OTP safeguards. A fraud vendor, so expect bias. [Riskified](https://ir.riskified.com/node/8896/pdf)

## 3. Incidents that justify hard limits outside the model

- **Freysa** (Nov 2024): a prompt redefined `approveTransfer`, and 13.19 ETH (about US$47k) was paid out. [Decoder](https://the-decoder.com/hacker-wins-47000-by-tricking-ai-chatbot-with-smart-prompting/)
- **Grok / Bankr** (May 2026): a Morse-code message reportedly led to a transfer worth about US$150k [single secondary source]. [Giskard](https://giskard.ai/knowledge/how-grok-got-prompt-injected-an-x-user-drained-150-000-from-an-ai-wallet)
- **AIXBT** (Mar 2025): 55 ETH lost through a dashboard breach (access control, not the model). [Cointelegraph](https://cointelegraph.com/news/hacker-breaches-ai-crypto-bot-aixbt-steals-55-eth)
- **Microsoft study** (Nov 2025): shopping agents were duped by fake reviews and injection, and some redirected payments. [Sumsub](https://sumsub.com/media/news/microsoft-study-sees-ai-shopping-agents-easily-duped-by-scams/)
- **Anthropic Project Vend:** Claude ran a shop, sold below cost and was talked into discounts. Phase 2 became profitable but stayed erratic. [Gigazine](https://gigazine.net/gsc_news/en/20251219-anthropic-project-vend-phase-two)
- **Project Deal:** users with weaker agents didn't notice they were out-negotiated (press only). [Decoder](https://the-decoder.com/anthropic-says-stronger-ai-models-cut-better-deals-and-the-losers-dont-even-notice/)

## 4. Academic papers and what they mean for us

| Paper | Finding | Implication for ChainBrain |
| --- | --- | --- |
| Proactive Agent / ProactiveBench (Lu et al., ICLR 2025, [2410.12361](https://arxiv.org/abs/2410.12361)) | The best model guesses when to help at about 66% F1 | Don't guess intent: **the user states the routine** |
| Levels of Autonomy for AI Agents (Feng, McDonald, Zhang 2025, [2506.12469](https://arxiv.org/abs/2506.12469)) | Five user roles (operator to observer); "autonomy certificates" | **A pocket is a machine-checked autonomy certificate**: observer inside limits, approver above ask-me |
| Adjust for Trust (Srinivasan, Thomason 2025, [2502.13321](https://arxiv.org/abs/2502.13321)) | Well-placed friction cuts inappropriate reliance (up to 38%) | Face ID or the cheque only on high-value or unusual spends |
| Magentic Marketplace (Microsoft 2025, [2510.25779](https://arxiv.org/abs/2510.25779)) | Agents take the first offer, show position bias, and are manipulable at scale | Hard price caps plus Radar, not agent judgement alone |
| AI Agents in Cryptoland (Patlan et al. 2025, [2503.16248](https://arxiv.org/abs/2503.16248)) | Memory injection into ElizaOS agents causes unauthorised transfers; prompt defences are weak | The closest prior work. **Limits on chain, not in agent memory** |
| Beyond the Mandate: security analysis of AP2 (Aug 2026, [2608.23858](https://arxiv.org/abs/2608.23858)) | A valid mandate signature does not guarantee the payment matches intent | Signatures aren't enough; the contract also bounds amount, payee and window |
| Whispers of Wealth: red-teaming AP2 (2026, [2601.22569](https://arxiv.org/abs/2601.22569)) | Prompts manipulate product choice and extract user data | Limits cap loss but not a bad choice inside the limit: Radar and price checks matter |
| Greshake et al. 2023 ([2302.12173](https://arxiv.org/abs/2302.12173)); AgentDojo ([2406.13352](https://arxiv.org/abs/2406.13352)); WASP ([2504.18575](https://arxiv.org/abs/2504.18575)); InjecAgent; ASB | Indirect prompt injection works; benchmarks show high partial success; "security by incompetence" | Every seller page is an attack channel. Use AgentDojo-style cases in our attack suite |
| CaMeL (Debenedetti et al. 2025, [2503.18813](https://arxiv.org/abs/2503.18813)); Design Patterns for securing agents ([2506.08837](https://arxiv.org/abs/2506.08837)) | A privileged planner plus a quarantined reader; plan-then-execute; "no consequential action after untrusted input" | **A routine is the fixed plan**: injected text can't change what it is allowed to buy |
| MCPTox ([2508.14925](https://arxiv.org/abs/2508.14925)); MCP security survey ([2512.08290](https://arxiv.org/abs/2512.08290)) | Tool poisoning succeeds up to 72% | BYO agents: pin tool definitions; our MCP server returns typed data only |
| AgentPoison ([2407.12784](https://arxiv.org/abs/2407.12784)); MINJA ([2503.03704](https://arxiv.org/abs/2503.03704)) | Memory and RAG poisoning, even through plain queries | Keep the routine in the contract and the pocket config, never in free-text memory |
| MAST, multi-agent failures ([2503.13657](https://arxiv.org/abs/2503.13657)) | 14 failure modes, mostly from system design | Add a check that "this payment matched the routine" |

**Gaps we can state honestly:** no user study of bounded, user-stated spending routines exists. No published evaluation tests on-chain limits against injection (the papers are attacks, not defences of this kind). Limits don't stop a bad purchase inside the limit.

## 5. Bring your own agent: what can actually be "called"

| Agent | Can it reach the wallet? | Can the wallet wake it? | How |
| --- | --- | --- | --- |
| ChatGPT (consumer) | Yes, through our remote MCP server as an "app" (OAuth); Developer Mode is plan-gated | **No** inbound API found | The user's own scheduled task can poll our MCP inbox |
| Claude apps (consumer) | Yes, as a remote MCP connector | **No** (sampling and elicitation only inside an open session) | Same polling pattern |
| **Claude Code Routines** | Yes (MCP) | **Yes**: `POST /v1/claude_code/routines/{id}/fire` with a per-routine token (experimental beta header, daily quota, no idempotency key) | [docs](https://platform.claude.com/docs/en/api/claude-code/routines-fire) |
| **OpenClaw** (self-hosted, MIT) | Yes (skills, MCP) | **Yes**: `POST /hooks/agent` with a bearer token (off by default); built-in cron | [docs](https://docs.openclaw.ai/automation/cron-jobs/webhooks) |
| n8n, Goose, Letta, any A2A agent | Yes | Yes, if they expose a webhook or A2A endpoint (A2A push only answers tasks the caller sent) | A2A spec under the Linux Foundation |
| The user's API key, run by us | n/a | Yes, fully | Key custody in a KMS or on the device; cost and rate risk |

**Four patterns:**
- (a) The agent polls our MCP inbox.
- (b) The wallet sends a webhook or A2A task to the agent's endpoint.
- (c) We run the agent with the user's key.
- (d) Our agent executes, and the user's agent plans or approves over MCP.

**On "aggressively calling" the user's agent:** do it **on the routine's schedule and only with consent**, never as a growth tactic. The trigger itself is an injection vector and a cost-abuse vector. Required:
- signed, structured trigger payloads with no third-party free text;
- idempotency keys;
- per-pocket rate limits;
- one-tap revoke, which also sets pocket limits to 0 on chain.

**MCP incidents to cite:** tool poisoning and rug pulls (Invariant Labs, Apr 2025); the postmark-mcp BCC backdoor (Sep 2025); CVE-2025-6514 (mcp-remote) [secondary].

## 6. Reusable repos (licence-checked from GitHub metadata, 16 Oct)

| Repo | Licence | Use |
| --- | --- | --- |
| [coinbase/x402](https://github.com/coinbase/x402) | Apache-2.0 | Our payment rail (already in use) |
| [MetaMask/delegation-framework](https://github.com/MetaMask/delegation-framework) + [smart-accounts-kit](https://github.com/MetaMask/smart-accounts-kit) | Apache-2.0 | ERC-7710 caveats (spend cap, time window, period reset): the reference model for routine limits such as "US$2 per week" |
| [google-agentic-commerce/AP2](https://github.com/google-agentic-commerce/AP2), [a2a-x402](https://github.com/google-agentic-commerce/a2a-x402) | Apache-2.0 | Intent-mandate vocabulary for a routine; message shapes for A2A plus x402 |
| [vercel-labs/json-render](https://github.com/vercel-labs/json-render) or [a2ui-project/a2ui](https://github.com/a2ui-project/a2ui) | Apache-2.0 | "Pocket apps": the AI writes JSON that only our own components render. No AI-written UI code |
| [modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk) | check the LICENSE file | Pocket-as-MCP-server for BYO agents |
| [openclaw/openclaw](https://github.com/openclaw/openclaw) | MIT | The demo BYO agent the wallet can actually wake (`/hooks/agent`); Goose (Apache-2.0) as a fallback |
| [internet-court/internet-court-skill](https://github.com/internet-court/internet-court-skill) | "Other" (check) | The nearest overlap found: natural-language mandates plus ERC-7710 plus x402. Read for wording only |

## 7. What this means for ChainBrain

**The product idea, sharpened: Routine pockets ("a standing order for your AI").** You say it once: *"Every Monday, get me a market brief on durian exports, max US$2 a week."* ChainBrain makes a pocket app with four parts:

| Part | Made by | Guarantee |
| --- | --- | --- |
| **Rules:** budget, cap, sellers, ask-me, expiry | Speak your rules (already built): two readings, the stricter wins; code computes the worst case | You sign; the contract enforces |
| **Routine:** when and what (schedule or trigger, item, price ceiling) | AI drafts; stored as typed fields, not memory | The fixed plan (CaMeL pattern); seller text can't change it |
| **Screen:** budget meter, schedule, things bought, price watch, approvals, Radar | AI picks from fixed blocks (json-render or A2UI style) | No AI-written code; only real data |
| **Runner:** who does it | ChainBrain's agent by default; or *your* agent (OpenClaw or Claude Routine woken by us; ChatGPT or Claude polling our MCP) | Whoever runs it, the same pocket caps it; Sentinel and Radar can only brake |

**Why it is a stronger USP than "a safer agent wallet":** Spark and Cowork do routines but ask before every spend. Alipay and WeChat pay but on request. **ChainBrain is the standing order for AI: autonomous inside a budget you own, a cheque above it, and frozen the moment it acts fooled.** It fits the 9% / 32% consumer split and the papers' design rules.

**Scope advice:**
- **By 20 Oct (built-in network only, after live receipts):**
  - one routine pocket, created from a sentence (reusing Speak your rules);
  - the clock jumps forward to "next Monday" and the routine runs and pays;
  - the third run hits the cap and asks for a cheque;
  - a seller injection is ignored because the routine is fixed;
  - two or three screen layouts picked by the AI.

  About 1 day.
- **Finals:**
  - generated screens from a block catalogue;
  - a remote MCP server for ChatGPT and Claude;
  - one real "wallet wakes your agent" through OpenClaw `/hooks/agent` or a Claude Code Routine, with signed triggers, rate limits and revoke;
  - ERC-7710-style period limits ("US$2 per week") in the Pocket.

**Don't:**
- build non-spending trackers (calories), which are off topic for Topic F;
- let the AI generate UI code;
- store the routine in free-text memory;
- call user agents beyond the routine and consent.
