# Recommended changes to the ChainBrain spec
Last updated: 2026-10-13

## In one minute

- This is the consolidated, ranked list of changes the overnight research suggests. **Every item is "proposed".** The team decides; the [spec](product-design.md) was not edited.
- Effort: S under 2 hours, M half a day, L a day or more. Score impact: Task 40, Security 30, Innovation 30, Bonus.
- **Top 5:** (1) organiser email plus a cheap mainnet insurance run, (2) pass the spike and make every claim equal enforced behaviour, (3) evidence pack, (4) fix the false novelty claim, (5) red-team numbers.
- **Biggest wording fixes:** "nobody verifies buyer agents" is false; "remaining budget" cannot be an on-chain counter; "ERC-4337 account" and "None known" in the risk table overclaim; the compliance paragraph needs correcting.
- **Biggest design shifts:** budget = pocket balance; stateless exact-digest validator; settle before serve at the gateway; payment-grounded reputation only.
- Several changes are small text edits; the work is in the build and test items.

## Ranked changes

| # | Change | Rationale | Source doc | Effort | Score impact | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Email organisers today; run core scenes once on cheap mainnet as insurance | Testnet hashes may not count; decides 40% | [how judges score](../06-pitch/how-judges-score.md), [judge sim](../06-pitch/judge-simulation.md) | S + M | Task, Bonus (protects 10-15 pts) | proposed |
| 2 | Pass the 14 Oct spike (Path A and B in parallel); align every claim to enforced behaviour | USDC checks signatures by read-only call; wrong claims are "serious failures" | [feasibility](../04-build/x402-pocket-feasibility.md) | M-L | Security, Task | proposed |
| 3 | Define budget = pocket balance; drop "remaining budget" counter; cap validBefore at 60 s or less | Validator cannot write state; loss bound is balance plus short window | [feasibility](../04-build/x402-pocket-feasibility.md), [threat model](../05-security/threat-model-and-red-team.md) (G1) | S | Security | proposed |
| 4 | Pocket validator accepts only the exact USDC TransferWithAuthorization digest; independent of msg.sender; owner-signed mode for ERC-8004 | Otherwise permit or Permit2 digests could drain the pocket | [threat model](../05-security/threat-model-and-red-team.md) (G2), [feasibility](../04-build/x402-pocket-feasibility.md) | M | Security | proposed |
| 5 | Replace "nobody verifies buyer agents for sellers" with the narrow claim: seller-side authority enforced by the paying account on x402 rails, with verdict and reason code | Visa TAP, Mastercard/Cloudflare, Skyfire, Catena ACK, Alipay APASS do seller-side identity | [competitors](../03-research/competitors-industry.md) | S | Innovation | proposed |
| 6 | Evidence pack: scenario, expected, actual, hash, explorer link, meaning; `npm run evidence` | Evidence proves the 40%; rival Leash ships one | [how judges score](../06-pitch/how-judges-score.md) | M | Task, Security | proposed |
| 7 | `npm run redteam`: 30+ attacks x20 runs incl. chat-level, plus 10+ ordinary tasks, false-refusal rate | Refusals may read as failed tasks; judges inject live | [threat model](../05-security/threat-model-and-red-team.md), [how judges score](../06-pitch/how-judges-score.md) | M-L | Security, Task | proposed |
| 8 | Seller gateway: settle before serve, atomic claim on (payment, resource), Cache-Control no-store, replay tests | Published x402 attacks hit exactly these | [papers](../03-research/papers-and-standards.md), [threat model](../05-security/threat-model-and-red-team.md) | M | Security, Task | proposed |
| 9 | MCP server hardening: per-agent token, strict 402 checklist, never sign same quote twice, redacted logs | MCP is the only signing path | [threat model](../05-security/threat-model-and-red-team.md) (G3) | M | Security | proposed |
| 10 | Token-only vs ChainBrain contrast scene and accurate competitor slide (Kagi, x402 Guard, sucsage, Leash, TAP, KYAPay, APASS) | Pocket alone is not novel | [prior art](../03-research/prior-art-hackathons-github.md), [judge sim](../06-pitch/judge-simulation.md) | S | Innovation | proposed |
| 11 | Make the AI visible: trace, turns per task, two different re-plans, rule-based intent diff as main check, LLM only for step-up | Avoid "security project, not AI project" | [judge sim](../06-pitch/judge-simulation.md), [papers](../03-research/papers-and-standards.md) | M | Innovation | proposed |
| 12 | Reputation honest: feedback only if it cites a settled ChainBrain payment; per-reviewer caps; manipulation scene; label simulated issuers | ERC-8004 reputation is Sybil-prone (59-91% flagged reviewers) | [identity](../04-build/identity-reputation-fisco.md), [papers](../03-research/papers-and-standards.md) | M | Security, Innovation | proposed |
| 13 | Rewrite compliance paragraph: Yinfa [2026] No. 42 covers all fiat-pegged stablecoins; USDC is a testnet stand-in; replace "APEC" with Hong Kong and Southeast Asia | Spec describes the notice too narrowly | [market](../03-research/market-regulation-webank.md) | S | Security | proposed |
| 14 | Add "Regulators are asking for this" slide: PCAC KYA convention (self-regulation), MAS SAFR (non-binding), HK Sandbox++, NFRA mapping | Strong fit with serve / step-up / refuse | [market](../03-research/market-regulation-webank.md) | S-M | Security, Innovation | proposed |
| 15 | Replace every "None known" in the risk table with a named residual and test ID | Reads as overclaiming | [threat model](../05-security/threat-model-and-red-team.md) | S | Security | proposed |
| 16 | Start docs 15 Oct; define minimum winning slice; FISCO only after a 60-minute dry run | First cut uses documents | [how judges score](../06-pitch/how-judges-score.md), [identity](../04-build/identity-reputation-fisco.md) | M | All | proposed |
| 17 | Use deployed ERC-8004 registries and EAS; read session key from pocket | Less to build | [identity](../04-build/identity-reputation-fisco.md), [feasibility](../04-build/x402-pocket-feasibility.md) | M | Task, Innovation | proposed |
| 18 | Build seller guards as x402 hooks; adopt Sign-In-With-X for the challenge rather than claim invention | SIWX already standardises the nonce challenge | [prior art](../03-research/prior-art-hackathons-github.md), [feasibility](../04-build/x402-pocket-feasibility.md) | M | Innovation, Task | proposed |
| 19 | Custom x402 client scheme so transfer nonce = hash(intentId, quoteHash) | Stock client cannot set it | [feasibility](../04-build/x402-pocket-feasibility.md) | M | Innovation | proposed |
| 20 | Open pitch with merchant-readiness gap (Ravelin 29%, Worldpay "no liability shift"); do not cite x402 volume as traction | Volume is partly artificial | [market](../03-research/market-regulation-webank.md), [papers](../03-research/papers-and-standards.md) | S | Innovation | proposed |
| 21 | Owner console: escape seller and model text, strip hidden Unicode, render money fields from code, cap step-ups | Console deception | [threat model](../05-security/threat-model-and-red-team.md) | S-M | Security | proposed |
| 22 | Facilitator contingency: quota monitor, direct-submit script, pre-recorded hashes | Quota or stall at judging | [threat model](../05-security/threat-model-and-red-team.md) | S | Task | proposed |
| 23 | Wording: "ERC-4337 account" only if the pocket is one; else "contract account" and move to Nexus/Safe7579 later | Judges check literalness | [feasibility](../04-build/x402-pocket-feasibility.md) | S | Security | proposed |
| 24 | Selective-disclosure demo (SD-JWT age 18+) and RFC 9421 envelope for guard 1 | Information-extraction test; fits TAP/ACK | [identity](../04-build/identity-reputation-fisco.md) | M | Security, Innovation | proposed |
| 25 | Publish reason codes as a small JSON schema | Makes the re-plan loop concrete | [prior art](../03-research/prior-art-hackathons-github.md) | S | Innovation | proposed |
| 26 | Licence care: do not copy GPL/AGPL code (Safe7579, Smart Sessions, account-abstraction) or Visa TAP sample | Rules require licensed materials | [stack](../04-build/stack-and-repos.md), [identity](../04-build/identity-reputation-fisco.md) | S | compliance | proposed |
| 27 | Business slide: lead with white-label licence and seller console; per-check fee small and later | Per-check fee near zero at current volume | [market](../03-research/market-regulation-webank.md) | S | Innovation | proposed |

## What this means for winning

- **[must]** Items 1-9, 13 and 15. Task 40, Security 30.
- **[must]** Items 5 and 10. Innovation 30.
- **[should]** Items 11, 12, 14, 16-22. Innovation 30, Security 30.
- **[could]** Items 24-27 and Nexus/Safe7579 migration. Bonus, Innovation.

## Open questions

- Which items does the team accept? Record in [decisions](../07-log/decisions.md).
- The spec lines to change are owned by the spec author; items 3, 5, 13, 15, 23 need their edit.

## Sources

- Local docs listed per row, read 2026-10-13. Spec: [product-design.md](product-design.md).
