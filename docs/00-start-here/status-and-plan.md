# Status and plan: countdown to 20 Oct
Last updated: 2026-10-13

## In one minute

- **Countdown:** at 2026-10-13 02:19 (UTC+8) there are **7 days 21 hours** to the deadline, 24:00 on 20 Oct (UTC+8). The spec says 23:59; plan to the earlier one and submit by noon on 20 Oct.
- **Status:** the spec is chosen and researched; nothing is built yet. Simulated panel score about 73/100 ([judge simulation](../06-pitch/judge-simulation.md)).
- **Gate 1 (today):** email the organisers about testnet hashes ([draft](open-questions.md)). Create demo wallets now so they age.
- **Gate 2 (Wed 14 Oct):** the payment spike. Spike Q1 is already proven on-chain (Base Sepolia USDC accepts a contract signer). Q2 and Q3 remain ([feasibility](../04-build/x402-pocket-feasibility.md)).
- **Plan change:** start the technical doc, security self-assessment and evidence doc on 15 Oct, not 19 Oct. The top-10 cut is made from documents, video and evidence, not a live demo ([how judges score](../06-pitch/how-judges-score.md)).
- **Plan change:** define a minimum winning slice and cut before any core scene slips.
- Owners are blank: the team fills them in.

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

## Minimum winning slice

Pocket with exact-digest validator; x402 payments; guards 1-3 and 5-7 with reason codes; re-plan scene; revoke; red-team suite and evidence pack; owner and seller consoles; docs. Cut order if late: FISCO, second agent, scam seller, verifier page, reputation as static signed credential.

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
| Rivals with full evidence packs (Leash, sucsage) | Evidence bar is high | Evidence pack, red-team numbers |

## What this means for winning

- **[must]** Organiser email today. Task 40.
- **[must]** Spike pass or honest fallback by end of 14 Oct. Security 30, Task 40.
- **[must]** Docs started 15 Oct. All.
- **[should]** Feature freeze Sun 18 night. All.

## Open questions

- Who owns each row? Team to fill in.
- Which agent model? Choose for reliable tool use first; fix by day 2. See [open questions](open-questions.md).

## Sources

- [Spec](../02-product/product-design.md) schedule section; [feasibility](../04-build/x402-pocket-feasibility.md); [judge simulation](../06-pitch/judge-simulation.md); [how judges score](../06-pitch/how-judges-score.md). `date` run 2026-10-13 02:19.
