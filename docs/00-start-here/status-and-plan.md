# Status and plan: countdown to 20 Oct
Last updated: 2026-10-13

## In one minute

- **Countdown:** at 2026-10-13 02:36 (UTC+8) there are **7 days 21 hours** to the deadline, 24:00 on 20 Oct (UTC+8), and **7 days 9 hours** to our own submit target of 12:00 on 20 Oct. The spec says 23:59; plan to the earlier one.
- **Status:** the spec is chosen and researched; nothing is built yet. Simulated panel score about 73/100 ([judge simulation](../06-pitch/judge-simulation.md)).
- **Gate 1 (today):** email the organisers about testnet hashes ([draft](open-questions.md)). Create demo wallets now so they age.
- **Gate 2 (Wed 14 Oct):** the payment spike. Spike Q1 is already proven on-chain (Base Sepolia USDC accepts a contract signer). Q2 and Q3 remain ([feasibility](../04-build/x402-pocket-feasibility.md)).
- **Plan change:** start the technical doc, security self-assessment and evidence doc on 15 Oct, not 19 Oct. The top-10 cut is made from documents, video and evidence, not a live demo ([how judges score](../06-pitch/how-judges-score.md)).
- **Plan change:** define a minimum winning slice and cut before any core scene slips.
- **Round 2 added:** a 30-minute hosted-facilitator test for Wednesday, a mainnet decision rule, a T-minus submission schedule, a model decision (proposed), and a [roles and workplan](roles-and-workplan.md) with owners blank. Details in the sections below.
- **New risk, not in round 1:** the Shenzhen venue network and the model API are untested; Claude is probably not usable from mainland China. See "Model decision".
- **New risk:** a public Topic F rival, Leash (detinatran/finbase), ships a full evidence pack; edxzh/agent-wallet already does ERC-1271 x402. Our novelty is the seller-side verdict with a re-plan loop, not the pocket ([rivals](../03-research/topic-f-rivals.md)).
- Owners are blank: the team fills them in ([roles and workplan](roles-and-workplan.md)).

## Key dates (UTC+8)

| Date | Milestone |
| --- | --- |
| Tue 13 Oct | Today |
| Wed 14 Oct | Spike decision gate |
| Tue 20 Oct 24:00 | Submission deadline |
| 21 Oct | Compliance screening |
| 22-23 Oct | Online review, top 10 chosen (IEEE page says 23-28 Oct: [VERIFY]) |
| 31 Oct | Finalists announced |
| 22 Nov | Defence at WeBank, Shenzhen |

## Day plan 13-20 Oct

Base: the spec's schedule, updated with research. Owner column left for the team.

| Day | Plan | Research update | Owner |
| --- | --- | --- | --- |
| Tue 13 | Team and registration; organiser email; create demo wallets; pick the agent model | Send email today. Check the 60% non-Chinese-national rule. Fund wallets from faucets (limits unverified) | |
| Wed 14 AM | **Spike, two paths in parallel.** Path A: custom pocket, EIP-3009 authorisation, self-hosted facilitator. Path B: MetaMask ERC-7710 with hosted facilitator | Record 1 success hash and 2 rejections (wrong recipient, over cap). Validator must accept only the exact USDC transfer digest and not depend on msg.sender. Budget = pocket balance | |
| Wed 14 PM | Pocket and registry contracts with unit tests; pick path with the fallback ladder | Use the deployed ERC-8004 registries and EAS rather than writing our own. Unit tests: permit, Permit2, wrong chain, wrong pocket, 6492 wrapper | |
| Thu 15 | Seller gateway, six sellers from one template, MCP server, SKILL.md. **Start docs** | Gateway: serve only after confirmed settlement, atomic claim on payment+resource, Cache-Control no-store. MCP: bearer token, strict 402 checklist, never sign same quote twice | |
| Fri 16 | Web app shell, owner console, in-house agent with trace panel; scenes 1-3 end to end | Show turns per task in the trace. Strip hidden Unicode in the console | |
| Sat 17 | Agent behaviour, seller console, scenes 4-9, red-team box, seed reputation, collect hashes. Outsider attack session | `npm run redteam` (30+ attacks x20 runs) and 10+ ordinary tasks. FISCO 60-minute dry run in the morning only if the core is on track | |
| Sun 18 | Full draft video; fix what it exposes; feature freeze at night | Build the evidence pack (`npm run evidence`). Rehearse killer demo 20 times | |
| Mon 19 | Final docs, tests, README, deck | Docs are mostly written already (started 15 Oct). Regulator slide, competitor slide | |
| Tue 20 | Final video, checks, **submit by noon** | Cheap mainnet run of core scenes as insurance (if organisers answer is unclear). Secret scan, rotate keys | |

## Spike test plan (Wed 14 Oct)

Two parallel paths plus one 30-minute side test. Full steps are in [feasibility](../04-build/x402-pocket-feasibility.md) section 6 and [Topic F tasks and mainnet](../04-build/topic-f-tasks-and-mainnet-plan.md) section 5.

| Test | Who | Pass looks like | If it fails |
| --- | --- | --- | --- |
| Path A: custom pocket, EIP-3009, self-hosted facilitator | R1 | One success hash; wrong recipient and over-cap rejected | Path B, then the fallback ladder |
| Path B: MetaMask ERC-7710 with hosted facilitator | R2 | Paid request returns data and a hash; over-limit redemption reverts | Stay on Path A |
| 30-minute facilitator test: deploy a tiny ERC-1271 test wallet, sign a USDC authorisation in 65-byte and longer forms, send to x402.org and CDP `/verify` then `/settle`, with wrong-key and tampered-payee controls | R2 | A hosted facilitator passes all controls | Self-host the SDK facilitator (the default) |
| Revert-hash check: can a deliberately failing call land on-chain through the facilitator, or only by direct submit with a fixed gas limit? | R1 | Know which; record it | Direct-submit script, row labelled "forced direct call" |
| Model reachability: from a China network or a teammate in China, can the Alibaba Model Studio endpoint and api.deepseek.com answer? | R3 | Result in [decisions](../07-log/decisions.md) | Plan replay mode for the defence |

Gate at end of Wednesday: pocket address, one success hash, two rejection records, facilitator used, gas paid, rung chosen. Record it in the [research log](../07-log/research-log.md).

## Mainnet decision rule (proposed)

Source: [Topic F tasks and mainnet plan](../04-build/topic-f-tasks-and-mainnet-plan.md) section 4.7. Cost is small (about 20 transactions, roughly US$0.1 gas by the doc's estimate, not measured; fund about US$10 USDC and US$5 ETH on Base).

| Situation by Sun 18 Oct 12:00 | Decision |
| --- | --- |
| Organisers say mainnet is required | Must. Buy funds Fri 16, run Mon 19 |
| Organisers say testnet is fine, in writing | Optional; run only if the core is frozen and green and it takes under 3 hours |
| No answer (likely) | Run it Mon 19 morning as insurance, budget 4 hours |
| Spike fell back to the capped hot wallet | Still run it; state the weaker guarantee honestly |
| Nobody can legally buy USDC outside mainland China by Fri 16 | Ask a friend or mentor abroad, or skip and list as a risk |

Guards: refuse chain 8453 unless `ALLOW_MAINNET=1`, US$1 cap per payment, fresh keys, sweep and rotate after. Run it from a teammate outside mainland China using their own account (not legal advice).

## Submission T-minus schedule

Our working deadline is T-12h (12:00 on Tue 20 Oct). Full table and final checks in the [submission checklist](../06-pitch/submission-checklist.md).

| When | Gate |
| --- | --- |
| Tue 13 (T-7d) | Organiser email sent; passports and enrolment proofs collected; 60% rule checked |
| Wed 14 (T-6d) | Spike result; technical-document skeleton |
| Thu 15 (T-5d) | Technical doc, self-assessment, evidence doc started; model decision recorded |
| Fri 16 (T-4d) | First `npm run evidence` run; scenes 1-3 end to end; mainnet funds bought |
| Sat 17 (T-3d) | First full `npm run redteam` run; killer beat passes 17 of 20; outsider attack session |
| Sun 18 (T-2d) | Feature freeze at night; draft video recorded; US$0.05 mainnet smoke test |
| Mon 19 (T-1d) | Final docs from generated tables; secret scan; fresh-clone test; night: full package, v1 submit if allowed |
| Tue 20 09:00-12:00 | Final checks and **submit by 12:00** |
| Tue 20 12:00-24:00 | Buffer only; keep the receipt |

## Model decision (proposed, not decided)

From [agent model choice](../04-build/agent-model-choice.md): Claude Sonnet 5.5 for the build week; Qwen3.7-plus (Alibaba Model Studio) for the Shenzhen defence, DeepSeek V4 Pro second, a recorded replay as the offline fallback. Keep the model as a config string. Use a rule-based diff as the main intent check, plus a checker from a different lab than the agent. Planning spend is about US$200 (our estimate). Unconfirmed: China reachability of the Alibaba international endpoint and student eligibility for Alibaba credits. Anthropic's supported-countries page does not list China, so every teammate must be in a supported country to use Claude during the build. Decide by Thu 15 Oct.

## Minimum winning slice

Pocket with exact-digest validator; x402 payments; guards 1-3 and 5-7 with reason codes; re-plan scene; revoke; red-team suite and evidence pack; owner and seller consoles; docs. Cut order if late: FISCO, second agent, scam seller, verifier page, reputation as static signed credential.

Video slice (from the [demo script](../06-pitch/demo-script.md) section 5): scenes 1 (short), 2, 5a, 6, 8 plus the evidence table. Cut first: scenes 3, 4, 5b, 6b, 7, 9 and bonus scenes. Gates: Wed 14 spike, Fri 16 scenes 1-3, Sat 17 killer beat 17 of 20, Sun 18 freeze.

## Top risks

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Testnet hashes do not count | Task 40 could drop 10-15 points | Email today; one cheap mainnet run |
| Spike Q2 or Q3 fails | Security claim weakens | Fallback ladder, honest wording ([feasibility](../04-build/x402-pocket-feasibility.md)) |
| Novelty claim is false | Judges who know Visa TAP or Alipay will catch it | Use the narrow claim ([competitors](../03-research/competitors-industry.md)) |
| Scope too large | Half-working core scores worse | Minimum winning slice |
| Gateway bugs (serve-before-settle, double grant) | Seen in published x402 attacks | Hardening list in [threat model](../05-security/threat-model-and-red-team.md) |
| Facilitator quota or stall at judging | No fresh hashes | Direct-submit script, pre-recorded hashes |
| Docs too late | First cut uses documents | Start 15 Oct |
| Rivals with full evidence packs (Leash, sucsage) | Evidence bar is high | Evidence pack, red-team numbers ([rivals](../03-research/topic-f-rivals.md)) |
| Plain judge task ("pay 1 USDC to 0xABC") refused by the spec's allowlist | A refusal reads as a failed task, costing Task points | Owner-signed one-off payment, step-up for unverified sellers, judge-pocket preset ([Topic F tasks](../04-build/topic-f-tasks-and-mainnet-plan.md)) |
| Model API or venue network unreachable in Shenzhen | Live defence fails | China-reachable model, trace replay, recorded clips ([demo script](../06-pitch/demo-script.md)) |
| Reverted tx never lands on-chain through a facilitator | No revert hash for scene 6 | Direct submit with a fixed gas limit, labelled "forced direct call" |
| Registration data missing or the 60% rule fails | Disqualification | Collect passports and proofs today ([checklist](../06-pitch/submission-checklist.md)) |
| Licence trap (copying GPL/AGPL code) | Rules require licensed material | Read only; write our own on OpenZeppelin ([licences](../04-build/licences-and-reuse.md)) |

## What this means for winning

- **[must]** Organiser email today. Task 40.
- **[must]** Spike pass or honest fallback by end of 14 Oct. Security 30, Task 40.
- **[must]** Docs started 15 Oct. All.
- **[must]** Fill in owners and backups in [roles and workplan](roles-and-workplan.md) today. All.
- **[must]** Run the 30-minute facilitator test and the model reachability test on 14 Oct. Task 40, Security 30.
- **[should]** Feature freeze Sun 18 night. All.
- **[should]** Apply the mainnet decision rule by Sun 18 12:00. Task 40.

## Open questions

- Who owns each row? Team to fill in.
- Which agent model? Proposed: Sonnet 5.5 for the build, Qwen3.7-plus for Shenzhen; fix by Thu 15. See [open questions](open-questions.md).
- Is the submission channel the address in the rules or another? See [open questions](open-questions.md) O11.

## Sources

- [Spec](../02-product/product-design.md) schedule section; [feasibility](../04-build/x402-pocket-feasibility.md); [judge simulation](../06-pitch/judge-simulation.md); [how judges score](../06-pitch/how-judges-score.md). [roles and workplan](roles-and-workplan.md); [submission checklist](../06-pitch/submission-checklist.md); [demo script](../06-pitch/demo-script.md); [Topic F tasks and mainnet](../04-build/topic-f-tasks-and-mainnet-plan.md); [agent model choice](../04-build/agent-model-choice.md); [rivals](../03-research/topic-f-rivals.md). `date` run 2026-10-13 02:36.
