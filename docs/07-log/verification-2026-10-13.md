# Fact verification, round 2
Last updated: 2026-10-13

## In one minute

- 30 claims re-checked against sources re-opened today (web pages, npm registry, GitHub API, Base Sepolia RPC, local clones as data only).
- 22 confirmed, 5 corrected or tightened inline (with the original kept in ~~strikethrough~~ or flagged), 3 still unverified.
- Biggest fix: the "5 strongest pitch facts" claim that the PCAC convention makes members "file before launching autonomous payments" is not in the convention text we can read. It is struck and marked [VERIFY]. Do not say it on stage.
- The five pitch facts otherwise hold (Ravelin, Worldpay, TRM, MAS, HKMA numbers all match). Ravelin and Worldpay are vendor views; say so.
- Alipay APASS "1 million agents" means connected, about 110,000 activated. Say "connected".
- All model prices in [agent-model-choice](../04-build/agent-model-choice.md) match the official pages today. Spike Q1 evidence re-run live and holds.
- Links: 574 relative links checked by script, 0 broken. README lists every doc (including this one).

## Claims checked

| # | Claim | Source re-opened (2026-10-13) | Verdict | Doc |
|---|---|---|---|---|
| 1 | PCAC convention issued 24 Aug 2026, KYA on top of KYC, define authorisation boundary | Yicai, sfccn pages | Confirmed | [market](../03-research/market-regulation-webank.md) |
| 2 | PCAC: members must file before launching autonomous payments | same pages | Corrected: struck, [VERIFY]; filing only in commentary | market |
| 3 | Ravelin: 1,504 pros, 10 countries, 44% integrating, 32% in six months, 29% very prepared, 53% trust agents more | eCommerceNews Asia, 22 May 2026 | Confirmed | market |
| 4 | Worldpay: "No liability shift exists yet", dispute is "a coin flip", issuers tend to side with cardholders | Worldpay article | Confirmed; the issuer line is the author's opinion with no data | market |
| 5 | TRM: US$52.7m, 198.9m settlements, US$25.6m screened, agents 0.6% to 7.5%, scripts look the same | TRM blog, 9 Sep 2026 | Confirmed | market |
| 6 | MAS SAFR 3 Jul 2026: identity, rulebook, deny/escalate/auto-execute, tamper-evident log | Rajah & Tann | Confirmed; paper has a fourth outcome "observe", added | market |
| 7 | HKMA Sandbox++ 27 Aug 2026: 36 use cases, nearly 100 proposals, 30 FIs, 27 tech partners, agentic focus | HKMA release | Confirmed | market |
| 8 | HKT Payment + Red Date "Agentic ID", DIDs and VCs, trials later in 2026 | PYMNTS | Confirmed | market |
| 9 | Yinfa [2026] No. 42, 6 Feb 2026, eight agencies; foreign firms barred from virtual-currency services to mainland parties | Local CSRC copy (Chinese text) | Confirmed; the text says "illegally provide ... in any form" (不得以任何形式非法向境内主体提供) | market |
| 10 | HKMA first stablecoin licences 10 Apr 2026: HSBC and Anchorpoint | Cointelegraph | Confirmed; "36 applications assessed" not on that page, flagged [VERIFY] | [competitors](../03-research/competitors-industry.md) |
| 11 | Mastercard first live agentic transaction in HK, 27 Mar 2026 | Web search summary (page itself was 403 earlier) | Confirmed from summary only | competitors |
| 12 | Mastercard India 17 Feb 2026 "conflict" | Web search summary | Resolved: different country firsts, not a conflict | competitors |
| 13 | Alipay APASS 11 Sep 2026, over 1m agents, 442 providers | Chinese press via search summary | Corrected: 1m connected, about 110,000 activated; 442 are providers; no independent check | competitors |
| 14 | Cloudflare 24 Oct 2025: Visa TAP and Mastercard Agent Pay use Web Bot Auth; "distinguish legitimate, approved agents from malicious bots" | Cloudflare blog | Confirmed | market |
| 15 | Visa TAP repo 212 stars, last push 28 Oct 2025; web-bot-auth 167 stars, last commit 10 Sep 2026; erc-8004-contracts 239 | GitHub API | Confirmed | competitors |
| 16 | Model prices: Claude Sonnet 5.5 $2/$10, Haiku 5.5 $0.10/$0.50, Opus 5.5 $4/$20; Sonnet 5 intro price now standard | Anthropic pricing page | Confirmed | [model choice](../04-build/agent-model-choice.md) |
| 17 | OpenAI GPT-5.6-terra, GPT-6-sol, GPT-6-luna; Gemini 3.1 Pro, 3.8 Flash promo to 31 Dec; GLM, Kimi prices | Official pricing pages | Confirmed | model choice |
| 18 | DeepSeek V4.1 Flash and V4 Pro prices and peak hours | DeepSeek pricing page | Confirmed | model choice |
| 19 | Qwen3.7-plus, 3.8-max, 3.8-flash CNY prices Singapore and Beijing | Alibaba Model Studio page | Confirmed; "20% off" label applies to both regions' alias rows, wording fixed | model choice |
| 20 | Claude not available in China, Hong Kong, Macau; Singapore, Malaysia, Indonesia supported; physical location rule | Anthropic supported-countries page | Confirmed | model choice |
| 21 | Sonnet 5 live bug bounty 0.19% vs GPT-5.5 3.08% vs Gemini 3.5 Flash 6.66% | NeuralTrust article | Confirmed (secondary write-up of the system card) | model choice |
| 22 | Sonnet 5 "Gray Swan 15-attempt 5.9%" | same article | Unverified: only an image caption mentions it; [VERIFY] added | model choice |
| 23 | AutoDojo attack success 1.8 / 8.7 / 16.5 / 34.7 / 52.4% and clean utility 89.5 / 70.2% | arXiv 2606.15057 v3 HTML tables | Confirmed (AutoDojo attack column) | model choice |
| 24 | Spike Q1: Base Sepolia USDC proxy, implementation `0xd74cc5d4...` has selector `cf092995`, chain id 84532 | Live RPC calls (eth_getCode, storage slot) | Confirmed; code size is 23,464 bytes, not 23,465 (corrected) | [x402 feasibility](../04-build/x402-pocket-feasibility.md) |
| 25 | Contracts with code: DelegationManager, EntryPoint v0.7, x402 Permit2 proxy | RPC eth_getCode | Confirmed | x402 feasibility |
| 26 | MetaMask hosted facilitator lists eip155:84532 with eip3009, permit2, erc7710; x402 npm 2.28.0 on 2026-09-29; @metamask/x402 1.0.0 | Live `/supported` call, npm registry | Confirmed. Note: only `/supported` was called; no real settlement yet | x402 feasibility |
| 27 | CDP facilitator: 1,000 free on-chain transactions a month, then US$0.001; supports Base Sepolia | CDP docs | Confirmed | market, [mainnet plan](../04-build/topic-f-tasks-and-mainnet-plan.md) |
| 28 | Rival repos: Leash 30 attacks, 0 auto-executed, 6 normal payments; sucsage 8/8 on three models, 19 tests; edxzh 6-hourly scout runs and ERC-8004 in `authorize`; OneGate 42 suites; Sathi 144 tests; created and pushed dates | Local clones (README read only, nothing run) and GitHub API | Confirmed | [rivals](../03-research/topic-f-rivals.md) |
| 29 | Kagi Wallet: ETHGlobal Tokyo 2026, 1st in Intercepta track, Curvegrid Best AI Agent Project; x402 Guard 2nd in Intercepta; ERC-8004 Draft created 2025-08-13 | ethglobal.com, eips.ethereum.org | Confirmed | [prior art](../03-research/prior-art-hackathons-github.md) |
| 30 | Competition: deadline 24:00 20 Oct UTC+8, screening 21 Oct, online review 22-23 Oct, defence 22 Nov, non-Chinese members at least 60%, Topic F judged by on-chain hashes, bonus 0-5 | Official text in reference/prior-research/official/text | Confirmed | [rules](../01-competition/hackathon-rules.md) |

## Items from the round-1 unverified list

| Item | Result |
|---|---|
| Skyfire "13 stars" | Still unverified, probably wrong (nearest repos 0 to 2 stars); marked |
| Mastercard HK vs India dates | Resolved (not a conflict) |
| Sui Overflow Sup Wallet 1st | Confirmed from search summary; Cypherpunk and ETHOnline placings not re-opened, still "(prior note)" |
| Caixin PCAC article | Still paywalled; Yicai and sfccn used instead |
| Hosted x402.org / CDP with smart-account payers | Still open, needs the Wednesday spike |

## What this means for winning

- [must] Drop the "file before launch" line from any slide; keep "authorisation boundary" and "KYA". Security 30 / Innovation 30
- [must] Say "connected agents" when citing Alipay APASS; judges from that world know the number. Innovation 30
- [should] Label Ravelin and Worldpay as vendor views in the deck footnotes. Innovation 30
- [should] Re-run the Wednesday spike including a real settlement through the hosted facilitator; so far only the supported-list call is proven. Task 40
- [could] Open the Cypherpunk and ETHOnline placings if the prior-art slide cites them. Innovation 30

## Open questions

- Is the Gray Swan 5.9% figure in Anthropic's own system card? Needs the card.
- Where does "36 applications assessed" (HKMA stablecoin licences) come from?
- Does the PCAC convention text itself mention filing or registration of agents?
- Skyfire repo and star count: which repo did the earlier note mean?

## Sources

- Pages opened 2026-10-13: ecommercenews.asia (Ravelin), worldpay.com article on liability, trmlabs.com blog, hkma.gov.hk release 20260827-3, rajahtannasia.com SAFR note, pymnts.com Agentic ID, yicai.com 103331509, sfccn.com 8-27 article, cointelegraph HKMA licences, blog.cloudflare.com/secure-agentic-commerce, platform.claude.com pricing, anthropic.com/supported-countries, developers.openai.com pricing, ai.google.dev pricing, docs.z.ai pricing, platform.kimi.ai pricing, api-docs.deepseek.com pricing, help.aliyun.com model pricing, docs.cdp.coinbase.com facilitator, neuraltrust.ai Sonnet 5 post, arxiv.org 2606.15057, ethglobal.com showcase (Kagi, x402 Guard), eips.ethereum.org/EIPS/eip-8004.
- Live calls: https://sepolia.base.org (RPC), https://tx-sentinel-base-sepolia.api.cx.metamask.io/platform/v2/x402/supported, npm registry, GitHub API.
- Search summaries only: Mastercard HK and India, Alipay APASS, Sui Overflow winners.
- Local: reference/papers/regulation/2026-pboc-yinfa42-virtual-currency-notice.html, reference/repos/rivals/* (README and source read as data), reference/prior-research/official/text/subject-detail-raw.txt.
