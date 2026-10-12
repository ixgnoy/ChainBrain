# Agent model choice: buyer agent, intent checker, demo-day plan
Last updated: 2026-10-13

## In one minute

- **Biggest risk is geography, not quality.** The live defence is in Shenzhen. Anthropic's supported-countries page lists Singapore, Malaysia and Indonesia but not China, Hong Kong or Macau, and says "Any country or region not listed is unsupported", including use "while physically located in an unsupported region". OpenAI is probably the same but we could not confirm from an official page [VERIFY]. So a Claude or GPT agent will probably not run on stage in Shenzhen.
- **Recommended plan: two models, one switch.** Build week: **Claude Sonnet 5.5** (US$2 in / US$10 out per million tokens; best published prompt-injection results among the families we found, though not for 5.5 itself). Demo day in Shenzhen: **Qwen3.7-plus** through Alibaba Cloud Model Studio, with **DeepSeek V4 Pro** as the second China-reachable option. Code the agent so the model is one config string (Vercel AI SDK), and run the whole red-team suite on both.
- **Checker must not be the same model as the agent.** The spec says "same model, separate prompt" ([spec](../02-product/product-design.md)). That is a correlated failure: one injection can fool both. Use a **rule-based diff as the main check**, and an LLM from a **different lab** only for the "does the item description match the request" step. Pairs: agent Claude, checker Qwen-flash or DeepSeek-flash; agent Qwen, checker DeepSeek-flash. This matches [recommended change 11](../02-product/recommended-changes.md) and the [judge simulation](../06-pitch/judge-simulation.md).
- **Settings:** agent temperature 0 to 0.2, checker temperature 0 with a strict JSON output, no tools for the checker, log every prompt and tool call. [VERIFY] each provider accepts a temperature setting in thinking mode.
- **Budget for the week: about US$20 to US$110 for the agent** under our assumptions (about 1,200 runs). Cheap enough to run the red-team suite many times. Table below.
- **Always keep an offline fallback:** record every good run (tool calls, reason codes, tx hashes) and ship a "replay" mode in the trace panel, clearly labelled recorded. Also pre-record Scene 10 (Claude Code as second agent), because Claude Code needs Anthropic's API.
- **MCP client:** use the Vercel AI SDK MCP client (`@ai-sdk/mcp`, `createMCPClient`, HTTP transport). It works with any provider, so one tool set serves Claude, Qwen and DeepSeek. Confirmed in the library docs (ctx7, 2026-10-13).
- **Benchmarks are noisy.** Public boards disagree and most scores are self-reported or third-party. Treat them only as a shortlist; our own 20-run red-team and ordinary-task tests decide.

## Today's model options (prices checked 2026-10-13)

All prices are US$ per million tokens (MTok), standard tier. Model names come from the official pages we opened on 2026-10-13; they change often, so re-check before paying.

| Model (provider) | Input / output | Cached input | Reachable from Shenzhen? | Source |
| --- | --- | --- | --- | --- |
| Claude Sonnet 5.5 (Anthropic) | $2 / $10 | $0.10 | No (unsupported region) | [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing) |
| Claude Haiku 5.5, prompts up to 100k | $0.10 / $0.50 | $0.01 | No | same |
| Claude Opus 5.5 | $4 / $20 | $0.20 | No | same |
| GPT-5.6-terra / GPT-6-sol (OpenAI) | $2 / $12 and $2 / $10 | $0.20 | Probably no [VERIFY] | [OpenAI pricing](https://developers.openai.com/api/docs/pricing) |
| GPT-6-luna (mini) | $0.10 / $0.50 | $0.01 | Probably no [VERIFY] | same |
| Gemini 3.1 Pro Preview (Google) | $2 / $12 (up to 200k) | n/a | Region list not checked [VERIFY] | [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| Gemini 3.8 Flash | $0.75 / $3.75 until 31 Dec 2026, then $1.50 / $7.50 | n/a | Region list not checked [VERIFY] | same |
| Qwen3.7-plus, Singapore (Alibaba) | CNY 2.998 / 11.991 (up to 256K) | not listed | Likely yes, test it [VERIFY] | [Model Studio pricing](https://help.aliyun.com/en/model-studio/model-pricing) |
| Qwen3.7-plus, Beijing | CNY 2 / 8 (the page labels the Singapore and Beijing alias rows "Limited-time 20% off", and the dated 2026-05-26 rows show the same prices) | not listed | Yes, but needs a mainland account | same |
| Qwen3.8-max, Singapore / Beijing | CNY 14.988 / 44.965 and 12 / 36 | not listed | as above | same |
| Qwen3.8-flash, Singapore / Beijing | CNY 1.094 / 3.427 and 0.8 / 2.7 | not listed | as above | same |
| DeepSeek V4.1 Flash (`deepseek-flash`) | $0.30 / $1.20 peak; half off-peak (cache miss) | $0.006 peak | Yes (Chinese company) [VERIFY from our network] | [DeepSeek pricing](https://api-docs.deepseek.com/quick_start/pricing) |
| DeepSeek V4 Pro 0813 | $1.32 / $3.96 peak; half off-peak | $0.044 peak | Yes [VERIFY] | same |
| GLM-5.2 (Z.ai) | $1.40 / $4.40 | $0.26 | Likely yes [VERIFY] | [Z.ai pricing](https://docs.z.ai/guides/overview/pricing) |
| GLM-5.3-Flash | $0.15 / $0.50 | $0.03 | Likely yes [VERIFY] | same |
| Kimi K2.7 Code | $0.95 / $4.00 | $0.19 | Likely yes [VERIFY] | [Kimi pricing](https://platform.kimi.ai/docs/pricing/chat) |
| Kimi K3 | $3.00 / $15.00 | $0.30 | Likely yes [VERIFY] | same |

Notes on the table:

- DeepSeek peak hours are 01:00-04:00 and 06:00-10:00 UTC, Monday to Friday, excluding Chinese public holidays. The defence is in Shenzhen daytime (UTC+8), which is 00:00-08:00 UTC, so part of it may fall in peak. Use the peak price when budgeting.
- Qwen prices are in CNY on the official page. We converted at an assumed 7.2 CNY per US$ (our assumption, not a quoted rate).
- Qwen free quota: Alibaba's free-quota page contradicts itself. One rule says only the China (Beijing) deployment qualifies, the FAQ says Singapore models are eligible. Third-party guides say new international accounts get 1M free tokens per model for 90 days (snippet). Check in the console [VERIFY].
- Prices from search snippets only (not opened on the official page): Qwen "3.8-max at $2 / $6" in one guide conflicts with the official CNY table above. Use the official table.
- The Claude page notes Sonnet 5's $2 / $10 was introductory but is now the standard price, and the Batch API gives 50% off (not useful for a live agent).

## What the benchmarks say (and how far to trust them)

| Benchmark | What it shows | Source and caveat |
| --- | --- | --- |
| tau2-bench (multi-step tool use with a simulated user) | BenchLM's board lists GLM-5.2 99.1%, GPT-5.4 98.9%, Claude Fable 5 98.5%, Qwen3.6 Plus 97.7%, DeepSeek V4 Pro 0813 96.2%, Kimi K2.6 95.9%; Claude Opus 4.8 94.4%, Gemini 3.1 Pro 95.6%, Claude Sonnet 4.6 79.5% | [BenchLM](https://benchlm.ai/benchmarks/tau2-bench), accessed 2026-10-13. Mostly the telecom domain, mixed setups, scores near the ceiling; cannot rank the top group. Sonnet 5.5 not shown. |
| tau2-bench airline | OpenRouter snapshot (12 Oct 2026, snippet) has Claude Fable 5 first at 80.0% | [OpenRouter](https://openrouter.ai/benchmarks/tau2-bench-airline) (snippet). A harder domain than telecom. |
| BFCL v4 (function calling) | Boards disagree: Opus 4.6 first at 77.0% in March; Qwen3.7 Max 75.0% in a later snapshot; one 88.5% entry from an unverified lab | [BenchLM BFCL v4](https://benchlm.ai/benchmarks/bfcl-v4) (snippet). Treat as unconfirmed; official board not opened [VERIFY]. |
| AutoDojo (built on AgentDojo; prompt injection, no defence) | Attack success: Claude Haiku 4.5 1.8%, GPT-5.4-mini 8.7%, DeepSeek-v4-Flash 16.5%, Gemini 2.5 Flash 34.7%, GPT-4o-mini 52.4%. Clean utility: DeepSeek-v4-Flash 89.5%, Claude Haiku 4.5 70.2%. DeepSeek-v4-Pro static attack under 10% | [arXiv 2606.15057](https://arxiv.org/html/2606.15057v3), accessed 2026-10-13. Small and mini models only (plus V4 Pro); no Qwen, GLM, Kimi or Sonnet. |
| Claude Sonnet 5 injection tests | Gray Swan 15-attempt indirect injection 5.9% [VERIFY: not in the NeuralTrust article text we re-opened on 2026-10-13, only a caption mentions it]; live bug bounty 0.19% (confirmed in that article) vs GPT-5.5 3.08% and Gemini 3.5 Flash 6.66% | [NeuralTrust analysis and others, snippet](https://neuraltrust.ai/blog/claude-sonnet-5-security-safety-system-card). Secondary write-ups of the system card; Sonnet 5.5 numbers not found [VERIFY against the system card]. |
| APort Vault (payment authorisation) | 4,371 human attacks, 14 models: model alone sent 140 transfers to unpermitted recipients in 76,842 runs; with a deterministic check, 0 in 69,297 | [arXiv 2609.22076](https://arxiv.org/abs/2609.22076). Supports our design: a hard rule beats any model. Model names not in abstract. |
| FinHarness / FinVault | Judge-based harness cut finance-agent attack success from 38.3% to 15.0% | [arXiv 2605.27333](https://arxiv.org/abs/2605.27333). Shows an LLM judge alone leaves a lot. |

How to read this:

- No source compares Qwen, DeepSeek, GLM and Kimi against Claude on prompt-injection robustness for a payment agent. That gap is why we run our own test (below).
- On the one injection paper that includes both, Claude Haiku 4.5 resisted far more than DeepSeek-v4-Flash (1.8% vs 16.5%), but DeepSeek had higher clean utility (89.5% vs 70.2%). Expect the China-reachable model to need a stricter prompt and more reliance on the hard rules.
- Another 2026 paper (snippet) argues stronger tool use can also mean more injection susceptibility, so do not assume the top tau2 model is the safest.
- Latency: we found no sourced latency figures. Measure it ourselves (time to first token and total time for a 6-step task) on both models on 14-15 Oct.

## Recommendation

| Role | Choice | Why | Fallback |
| --- | --- | --- | --- |
| Buyer agent, build week (13-20 Oct) | Claude Sonnet 5.5 | Strong tool-use boards, best injection evidence among families we found, cheap at $2 / $10 | Qwen3.7-plus (same code, config string) |
| Buyer agent, Shenzhen demo day (22 Nov) | Qwen3.7-plus via Model Studio (Beijing if a mainland teammate can open an account, else Singapore, after a reachability test from China) | Alibaba is Chinese; official OpenAI-compatible endpoint; strong tau2 entry (Qwen3.6 Plus 97.7%) | DeepSeek V4 Pro or GLM-5.2; then recorded replay |
| Semantic intent checker | A different lab from the agent. Build week: Qwen3.8-flash or DeepSeek-flash. Demo day: DeepSeek-flash (agent is Qwen) | Removes correlated failure; costs under US$2 for the week | Rule-based diff only (deterministic) |
| Main intent check | Rule-based diff (price, quantity, seller ID, currency, category enum) | Cannot be injected; judges can read it | None needed |
| Offline fallback | Recorded transcripts and tx hashes replayed in the trace panel | Works with no network | Optional: a small open-weight Qwen model on a laptop [could]; not tested |

Why Sonnet 5.5 for the build week and not the biggest model: Opus 5.5 costs twice as much ($4 / $20) and Fable 5.1 five times ($10 / $50, [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing)); the agent's job (pick a seller, read a reason code, re-plan) is not a hard-reasoning job. If tool-loop failures show up, try Opus 5.5 before changing the design.

Why not decide demo-day model by benchmark alone: the Shenzhen model is what judges see and what the 22 Nov defence is scored on. Run the same 30+ attacks x 20 runs ([recommended change 7](../02-product/recommended-changes.md)) on both models by 18 Oct and publish both numbers. If Qwen is worse on injection, say so and show the on-chain limits holding anyway; that is the honest story the [threat model](../05-security/threat-model-and-red-team.md) already tells.

### Settings

- **Agent:** temperature 0 to 0.2, fixed system prompt, seller text wrapped and marked as untrusted data (per the [spec](../02-product/product-design.md)), tool results passed through a length cap, max 10 tool steps per task, the six ChainBrain tools only. Log full prompts and responses for the trace panel and for replay.
- **Checker:** temperature 0, no tools, JSON schema output with fields `match | mismatch | unsure` plus a one-line reason, sees only the owner's original request and the seller's item description (as data). It can only move a verdict toward step-up, never relax anything ([spec rule](../02-product/product-design.md)).
- **Reasoning/thinking mode:** DeepSeek's models default to thinking mode ([DeepSeek pricing page](https://api-docs.deepseek.com/quick_start/pricing)). Thinking tokens are billed as output and add latency; test with thinking on and off. [VERIFY] whether temperature is honoured in thinking mode for each provider.
- **Repeatability:** low temperature does not give identical runs. Fix the seller directory, record each run, and use the recorded run for the video.

### Budget estimate for the week

Assumptions (ours, not measured): about 1,200 agent runs (300 development, 600 red-team = 30 attacks x 20, 200 ordinary-task = 10 x 20, 100 rehearsals); each run 8 model calls with growing context, about 100k input tokens and 4k output tokens in total; checker about 2k in and 0.5k out per run. Total about 120M input and 4.8M output tokens for the agent; checker 2.4M in and 0.6M out.

| Agent model | Cost for the week | Basis |
| --- | --- | --- |
| Claude Sonnet 5.5 | about US$288 with no caching; about US$106 if 80% of input hits the cache | $2 / $10; cache read $0.10 |
| Claude Haiku 5.5 | about US$14 | $0.10 / $0.50 (prompts under 100k) |
| Qwen3.7-plus (Singapore) | about US$58 | CNY 2.998 / 11.991 at 7.2; no cache assumed |
| Qwen3.8-flash (Singapore) | about US$21 | CNY 1.094 / 3.427 |
| DeepSeek V4.1 Flash | about US$21 to US$42 | cache-miss rates, off-peak and peak |
| DeepSeek V4 Pro | about US$89 to US$177 | cache-miss rates, off-peak and peak |
| GLM-5.2 | about US$189 | $1.40 / $4.40, no cache |
| Kimi K2.7 Code | about US$133 | $0.95 / $4.00, no cache |
| **Checker (any flash model)** | **under US$2** | DeepSeek flash peak about US$1.44; Qwen flash about US$0.65 |

Plan the week at about US$120 for Sonnet 5.5 plus about US$60 to run the same suite on Qwen3.7-plus, so about US$200 all in with margin. Cut cost by trimming the tool list in the prompt, using cache, and running the 600 red-team runs on a flash model first. Set a hard monthly spend cap on each key.

### Student terms and access

- Anthropic: the supported-regions rule applies to where the user is physically, and to entities headquartered in unsupported regions. Team members in Singapore, Malaysia, Indonesia or other listed countries can use it in the build week; nobody can use it from the Shenzhen venue. See [Anthropic supported countries](https://www.anthropic.com/supported-countries). We found no student discount on the API.
- Alibaba Cloud: the official student page offers a CNY 300 credit but frames it for students in China and needs a national ID or mobile number; it does not say whether international students qualify [VERIFY by calling or email]. The Singapore (international) deployment is separate from Beijing: API keys are region-locked, and cross-border data processing must follow local law ([Model Studio base URL page](https://www.alibabacloud.com/help/en/model-studio/base-url), snippet). Whether a person physically in mainland China can open and use an international account was not answered by any source we found [VERIFY].
- DeepSeek, Z.ai, Kimi: no student programme found. Pay as you go with small top-ups.
- Do not use API-resale "transfer stations" or VPN tricks to reach Claude or GPT from China. One report describes such resellers; they are a terms and security risk, and bad optics in a trust-layer pitch.
- Do not put real personal data in prompts sent to a foreign API. Demo data is synthetic by design.

### MCP client choice

| Option | Use for | Notes |
| --- | --- | --- |
| Vercel AI SDK `@ai-sdk/mcp` (`createMCPClient`, HTTP transport) | **The in-house agent** | Provider-agnostic: one `streamText` call, model as a string; tool discovery via `client.tools()`; supports headers (per-agent token) and OAuth; close clients in `onEnd`/`onError`. Pairs with the trace panel. ctx7 library `/vercel/ai`, accessed 2026-10-13 |
| Official `@modelcontextprotocol/sdk` client | A thin test script for the MCP server | Same SDK as the server (1.32.1, see [stack](stack-and-repos.md)) |
| Claude Code | Scene 10 (second agent, BYOA) | Needs Anthropic; record it before 22 Nov. Alternatively show any MCP-capable client that can use a Qwen or DeepSeek model [VERIFY] |

Do not let the agent hold the key or call chain APIs directly; it reaches the pocket only through the MCP server ([spec](../02-product/product-design.md)).

## What this means for winning

- [must] Fix the build-week agent (Sonnet 5.5) today and the Shenzhen model (Qwen3.7-plus, DeepSeek V4 Pro second) by 15 Oct; model is a config string, not a code branch. Task 40
- [must] Test from a China network or a China-located teammate on 14-15 Oct that the Model Studio endpoint and DeepSeek respond; record the result in [decisions](../07-log/decisions.md). Task 40
- [must] Replace "same model, separate prompt" with a rule-based diff plus a different-lab LLM checker, and say so in the deck (answers the judge's correlation question). Security 30 / Innovation 30
- [must] Run the red-team and ordinary-task suite (30+ attacks x 20 runs, 10+ ordinary tasks, false-refusal rate) on both agent models and publish both numbers. Security 30
- [must] Build the record-and-replay mode and pre-record Scene 10 and the best Scene 6 run with tx hashes. Task 40
- [should] Show the model name and checker model in the trace panel; mention that the on-chain limits hold whichever model runs. Innovation 30
- [should] Measure latency and turns per task on both models; report turns and clarifying questions ([how judges score](../06-pitch/how-judges-score.md)). Innovation 30
- [could] Local open-weight model on a laptop as a last-resort offline agent. Task 40
- [could] Cite APort Vault (0 unauthorised transfers with a deterministic check vs 140 with the model alone) in the security report. Security 30 / Bonus

## Open questions

- Can a person physically in mainland China use the Alibaba Cloud international (Singapore) endpoint at the venue network? Can any teammate open a mainland (Beijing) account? Test and ask.
- Does the organiser provide model access or a network exception at the defence? Ask in the email to the organisers ([open questions](../00-start-here/open-questions.md)).
- Is Sonnet 5.5 as injection-robust as Sonnet 5? Check its system card; we only found secondary write-ups of Sonnet 5.
- Where will teammates be during the build week; are all in Anthropic-supported countries?
- Do the models honour temperature in thinking mode (Claude, Qwen, DeepSeek)?
- Official BFCL v4 and AgentDojo results for Qwen3.7, GLM-5.2 and Kimi: not found.
- Is OpenAI reachable or blocked from Shenzhen, from an official source? Not confirmed; GPT is not in our plan.

## Sources

All accessed 2026-10-13 unless noted.

- Anthropic pricing: https://platform.claude.com/docs/en/about-claude/pricing
- Anthropic supported countries: https://www.anthropic.com/supported-countries
- OpenAI pricing: https://developers.openai.com/api/docs/pricing
- Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing
- Alibaba Model Studio pricing: https://help.aliyun.com/en/model-studio/model-pricing (only the first 100,000 characters read)
- Model Studio free quota: https://help.aliyun.com/en/model-studio/new-free-quota
- Alibaba student benefits: https://help.aliyun.com/en/document_detail/2881975.html
- Model Studio base URL (snippet): https://www.alibabacloud.com/help/en/model-studio/base-url
- DeepSeek pricing: https://api-docs.deepseek.com/quick_start/pricing
- Z.ai pricing: https://docs.z.ai/guides/overview/pricing
- Kimi pricing: https://platform.kimi.ai/docs/pricing/chat
- BenchLM tau2-bench: https://benchlm.ai/benchmarks/tau2-bench
- OpenRouter tau2 airline (snippet): https://openrouter.ai/benchmarks/tau2-bench-airline
- BenchLM BFCL v4 (snippet): https://benchlm.ai/benchmarks/bfcl-v4
- AutoDojo: https://arxiv.org/html/2606.15057v3
- APort Vault: https://arxiv.org/abs/2609.22076
- FinHarness: https://arxiv.org/abs/2605.27333
- Claude Sonnet 5 injection write-up (snippet): https://neuraltrust.ai/blog/claude-sonnet-5-security-safety-system-card
- Vercel AI SDK MCP docs via `npx ctx7@latest docs /vercel/ai` (library ID `/vercel/ai`)
- GPT-5.5 and other third-party price pages were seen only as snippets and are not used for decisions.
- Local: [spec](../02-product/product-design.md), [recommended changes](../02-product/recommended-changes.md), [judge simulation](../06-pitch/judge-simulation.md), [stack and repos](stack-and-repos.md), [review](../07-log/review-2026-10-13.md)
