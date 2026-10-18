# Recommended changes to the ChainBrain spec
Last updated: 2026-10-17

> **Status (14 Oct, v2):** these 49 items were written against the OLD spec (seller trust layer). The team has since published [Prelim Product Spec v2](product-design.md), a consumer wallet. The table "Disposition against v2" below says what v2 adopted, changed or moved to finals. The "Status" column in the ranked list below still says "proposed" and is kept as the 13 Oct record. Dispositions come from the team's docs, not from re-reading code for each item.
>
> **17 Oct:** the project now runs only on FISCO BCOS 3.16.4 (chain id 20200) with a Mock e-HKD token (eHKD). Rows that assumed the old public-testnet setup or a mainnet rerun are rewritten to match.

## In one minute

- This is the consolidated, ranked list of changes the overnight research suggests. **Every item is "proposed".** The team decides; the [spec](product-design.md) was not edited.
- Effort: S under 2 hours, M half a day, L a day or more. Score impact: Task 40, Security 30, Innovation 30, Bonus.
- **Round 2 added items 28-49** (from Topic F tasks, rivals, model choice, harness, checklist, demo script and licences). Several extend or duplicate earlier items; the Rationale column says which.
- **Top 5:** (1) organiser email, (2) pass the spike and make every claim equal enforced behaviour, (3) evidence pack, (4) fix the false novelty claim, (5) red-team numbers.
- **Biggest wording fixes:** "nobody verifies buyer agents" is false; "remaining budget" cannot be an on-chain counter; "ERC-4337 account" and "None known" in the risk table overclaim; the compliance paragraph needs correcting.
- **Biggest design shifts:** budget = pocket balance; stateless exact-digest validator; settle before serve at the gateway; payment-grounded reputation only.
- Several changes are small text edits; the work is in the build and test items.

## Disposition against v2 (14 Oct)

| Items | Disposition | Where in the team's docs |
| --- | --- | --- |
| 1, 38, 39, 42, 46, 48, 49 | **Still apply** (organiser email, submission, eligibility, demo rehearsal, wallet funding, rival re-check, prior-art correction) | 14 Oct prelim plan (history) Task 10 and open questions |
| 3, 4, 19, 23, 25, 37 | **Adopted in v2.** Budget = pocket balance. Pocket accepts only the rebuilt token transfer digest (envelope signature). Nonce = hash(intentHash, seq). The pocket is an ERC-1271 contract, no ERC-4337. Reason codes are in code (20 codes) | [technical document](../technical-document.md) sections 2, 3, 5; `server/src/wallet/reasons.ts` |
| 2, 15, 16, 22 | **Adopted in part.** Day-1 gate passed on the FISCO node. Risk tables name residuals and tests. Docs written. x402's facilitator code always runs in-process | [security self-assessment](../security-self-assessment.md), [FISCO evidence](../evidence-fisco.md) |
| 6, 7, 11, 21, 34, 43, 44 | **Adopted in part.** Evidence files exist with FISCO hashes, checked by `server/scripts/verify-evidence.ts`. Live red-team box. Trace panel. Intent shown from a fixed template, seller text wrapped as untrusted. Scenes replay mode exists for tests. Not built per the team's docs: `npm run evidence`/`verify`/`redteam`, a 42-attack harness, a judge sandbox, a record-and-replay trace panel | [technical document](../technical-document.md) sections 3, 5, 8 |
| 10, 14, 20, 26, 45 | **Still apply to the pitch and licences.** The README has a third-party licences section | [README](../../README.md) |
| 13 | **Check.** v2 says "Hong Kong and APEC"; item 13 suggested "Hong Kong and Southeast Asia" | listed in the audit for the team |
| 5, 31 | **Superseded.** The v2 novelty claim is hard limits the user owns, checked by the pocket; the seller-side verdict is a finals item | [spec v2](product-design.md) |
| 8, 9, 12, 17, 18, 24, 27 | **Finals roadmap, not in prelim.** Seller gateway, MCP, reputation, ERC-8004, seller guards, selective disclosure, business slide | [spec v2](product-design.md) Finals roadmap |
| 28, 29 | **Not adopted in v2.** No one-off payment tool and no step-up for unverified sellers; the six tools take no recipient address. Plain judge tasks are a known gap | [technical document](../technical-document.md) section 3 |
| 30, 35, 36, 47 | **Not built** (design proposals only) | [evidence and red-team harness](../05-security/evidence-and-redteam-harness.md) |
| 32 | **Changed.** The intent check is a rule check in the tool layer. No second checker from another lab is described | [technical document](../technical-document.md) section 3 |
| 33 | **Changed.** The build uses Claude (default `claude-opus-5-5`, `AGENT_MODEL=claude-sonnet-5-5` cheaper). Shenzhen model access is still open | 14 Oct prelim plan (history) Global Constraints |
| 40 | **Superseded.** x402's facilitator code always runs in-process | plan, spec issue 1 |
| 41 | **Superseded.** Replaced by the FISCO BCOS + Mock e-HKD setup | [Topic F tasks](../04-build/topic-f-tasks-and-mainnet-plan.md) |

## Ranked changes

| # | Change | Rationale | Source doc | Effort | Score impact | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Email organisers today | Hashes from a team-hosted chain may not count; decides 40% | [how judges score](../06-pitch/how-judges-score.md), [judge sim](../06-pitch/judge-simulation.md) | S + M | Task, Bonus (protects 10-15 pts) | proposed |
| 2 | Pass the 14 Oct spike (Path A and B in parallel); align every claim to enforced behaviour | The token checks signatures by read-only call; wrong claims are "serious failures" | [feasibility](../04-build/x402-pocket-feasibility.md) | M-L | Security, Task | proposed |
| 3 | Define budget = pocket balance; drop "remaining budget" counter; cap validBefore at 600 s or less | Validator cannot write state; spending stays inside the card's own balance, with a short signing window | [feasibility](../04-build/x402-pocket-feasibility.md), [threat model](../05-security/threat-model-and-red-team.md) (G1) | S | Security | proposed |
| 4 | Pocket validator accepts only the exact token TransferWithAuthorization digest; independent of msg.sender; owner-signed mode for ERC-8004 | Otherwise permit or Permit2 digests could drain the pocket | [threat model](../05-security/threat-model-and-red-team.md) (G2), [feasibility](../04-build/x402-pocket-feasibility.md) | M | Security | proposed |
| 5 | Replace "nobody verifies buyer agents for sellers" with the narrow claim: seller-side authority enforced by the paying account on x402 rails, with verdict and reason code | Visa TAP, Mastercard/Cloudflare, Skyfire, Catena ACK, Alipay APASS do seller-side identity | [competitors](../03-research/competitors-industry.md) | S | Innovation | proposed |
| 6 | Evidence pack: scenario, expected, actual, hash, explorer link, meaning; `npm run evidence` | Evidence proves the 40%; rival Leash ships one | [how judges score](../06-pitch/how-judges-score.md) | M | Task, Security | proposed |
| 7 | `npm run redteam`: 30+ attacks x20 runs incl. chat-level, plus 10+ ordinary tasks, false-refusal rate | Refusals may read as failed tasks; judges inject live | [threat model](../05-security/threat-model-and-red-team.md), [how judges score](../06-pitch/how-judges-score.md) | M-L | Security, Task | proposed |
| 8 | Seller gateway: settle before serve, atomic claim on (payment, resource), Cache-Control no-store, replay tests | Published x402 attacks hit exactly these | [papers](../03-research/papers-and-standards.md), [threat model](../05-security/threat-model-and-red-team.md) | M | Security, Task | proposed |
| 9 | MCP server hardening: per-agent token, strict 402 checklist, never sign same quote twice, redacted logs | MCP is the only signing path | [threat model](../05-security/threat-model-and-red-team.md) (G3) | M | Security | proposed |
| 10 | Token-only vs ChainBrain contrast scene and accurate competitor slide (Kagi, x402 Guard, sucsage, Leash, TAP, KYAPay, APASS) | Pocket alone is not novel | [prior art](../03-research/prior-art-hackathons-github.md), [judge sim](../06-pitch/judge-simulation.md) | S | Innovation | proposed |
| 11 | Make the AI visible: trace, turns per task, two different re-plans, rule-based intent diff as main check, LLM only for step-up | Avoid "security project, not AI project" | [judge sim](../06-pitch/judge-simulation.md), [papers](../03-research/papers-and-standards.md) | M | Innovation | proposed |
| 12 | Reputation honest: feedback only if it cites a settled ChainBrain payment; per-reviewer caps; manipulation scene; label simulated issuers | ERC-8004 reputation is Sybil-prone (59-91% flagged reviewers) | [identity](../04-build/identity-reputation-fisco.md), [papers](../03-research/papers-and-standards.md) | M | Security, Innovation | proposed |
| 13 | Rewrite compliance paragraph: Yinfa [2026] No. 42 covers all fiat-pegged stablecoins; Mock e-HKD is a test stand-in; replace "APEC" with Hong Kong and Southeast Asia | Spec describes the notice too narrowly | [market](../03-research/market-regulation-webank.md) | S | Security | proposed |
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
| 28 | Add an owner-signed one-off payment (R1) and a `get_history` tool so plain "pay X to 0x..." and "show my last payments" work in 1-2 turns | As specified, a plain judge task is refused (address not on allowlist, no plain-transfer tool); a refusal reads as a failed task. Spec author must confirm R1 fits the exact-digest rule | [Topic F tasks](../04-build/topic-f-tasks-and-mainnet-plan.md) | M | Task, Security | proposed |
| 29 | Unverified seller: step-up with a warning and small cap instead of refuse; add a judge-pocket preset (KYC-anchored owner, seeded reputation, ask-above HK$4) | Outside x402 sellers and a fresh judge agent would otherwise trigger refusals or a step-up on every task. Extends 11 | [Topic F tasks](../04-build/topic-f-tasks-and-mainnet-plan.md) | S-M | Task, Innovation | proposed |
| 30 | Put the 28-task judge test set (J-01 to J-28) into `npm run redteam`; report false-refusal count (target 0) beside attack results | Extends 7 (duplicate in part: 7 asks for 10+ ordinary tasks; this fixes the list) | [Topic F tasks](../04-build/topic-f-tasks-and-mainnet-plan.md), [harness](../05-security/evidence-and-redteam-harness.md) | M | Task, Security | proposed |
| 31 | Rewrite the novelty claim again: do not claim ERC-1271 x402 as new (edxzh/agent-wallet does it); headline the seller-side verdict with a reason-code re-plan loop; add an honest field slide (Leash, sucsage, edxzh, Visa TAP, Skyfire, Kagi) | Extends 5 and 10 (duplicate in part). Rivals ship running code with explorer links | [rivals](../03-research/topic-f-rivals.md) | S | Innovation | proposed |
| 32 | Replace the spec's same-model semantic check with a rule-based diff as main check plus a checker from a different lab at temperature 0, strict JSON, no tools | Same-model check is a correlated failure; APort Vault: 0 of 69,297 unpermitted transfers behind a deterministic check vs 140 of 76,842 model-alone (per its abstract). Extends 11 | [model choice](../04-build/agent-model-choice.md) | M | Security, Innovation | proposed |
| 33 | Fix agent models: Sonnet 5.5 for the build week, Qwen3.7-plus (DeepSeek V4 Pro second) for Shenzhen; model as a config string; test China reachability 14-15 Oct | Claude is probably unusable from mainland China; Anthropic's list omits China | [model choice](../04-build/agent-model-choice.md) | S-M | Task | proposed |
| 34 | Build record-and-replay in the trace panel; pre-record the best scene 6 run and scene 10 with hashes | Offline and network fallback for the live defence | [model choice](../04-build/agent-model-choice.md), [demo script](../06-pitch/demo-script.md) | M | Task, Innovation | proposed |
| 35 | Build `npm run evidence` and `npm run verify` (re-check every hash from a public RPC, no keys); one `hashes.json`; table has an expected-result column; ship screenshots and receipt JSON | Extends 6 (duplicate in part). Reviewers in mainland China may not reach explorers | [harness](../05-security/evidence-and-redteam-harness.md), [Topic F tasks](../04-build/topic-f-tasks-and-mainnet-plan.md) | M | Task, Security | proposed |
| 36 | Red-team design: 42 attacks in four classes, 20 runs each, three modes (model only, model plus tool server, full stack), 95% upper bound printed beside every zero, no "unhackable" wording | Extends 7. Zero at n=20 still allows up to 13.9% | [harness](../05-security/evidence-and-redteam-harness.md) | M-L | Security | proposed |
| 37 | Fix reason-code names as a JSON schema before building; share with agent, harness and docs | Same as 25 (duplicate; 25 stays the main row) | [harness](../05-security/evidence-and-redteam-harness.md) | S | Innovation | proposed |
| 38 | Send all six deliverables (including optional code, self-assessment, evidence); submit by 12:00 on 20 Oct; v1 on the night of 19 Oct if resubmission is allowed | Topic F is scored on hashes and the first cut uses submitted documents. Extends 16 | [checklist](../06-pitch/submission-checklist.md) | M | All | proposed |
| 39 | Collect passports and English enrolment proofs now; check at-least-60%-non-Chinese rule (ceil(0.6 x team size)); keep scans out of the repo | Disqualification risk | [checklist](../06-pitch/submission-checklist.md) | S | All | proposed |
| 40 | Run the 30-minute hosted-facilitator test (x402.org and CDP, 65-byte and longer signatures, wrong-key and tampered-payee controls); self-host unless a hosted one passes all | Extends 8 and 22. A 2026 paper found 9 of 15 facilitators accept adversarial ERC-1271 signatures; keep settle-before-serve | [Topic F tasks](../04-build/topic-f-tasks-and-mainnet-plan.md) | S | Security, Task | proposed |
| 41 | Mainnet plan (replaced by the FISCO BCOS + Mock e-HKD setup) | Extended item 1. Not legal advice | [Topic F tasks](../04-build/topic-f-tasks-and-mainnet-plan.md) | M | Task, Bonus | proposed |
| 42 | Killer beat: rehearse 20 times, record only after the spike rung is known, narration per rung (rung 3 says "our signing server refused", never "the pocket refuses"); label the test chain, test token and simulated issuers in every frame; include a real "what failed" slide | Extends 10 and 11 | [demo script](../06-pitch/demo-script.md) | M | Innovation, Security | proposed |
| 43 | Live-defence kit: HK$15 disposable judge pocket, injection over the untrusted-data channel, team-held kill switch, attack log, L0-L3 network fallback ladder, local copies of everything; test venue network, RPC, explorer and model API from Shenzhen | Judges may inject live; venue network untested [VERIFY] | [demo script](../06-pitch/demo-script.md) | M | Security, Task | proposed |
| 44 | Judge-facing sandbox (per-visitor pocket or shared one with reset) and a "type your own attack" box with a free dry run (eth_simulateV1); scheduled daily run producing fresh hashes plus a static replay page | Rivals sucsage and edxzh have a sandbox or dashboard | [rivals](../03-research/topic-f-rivals.md) | M | Task, Security | proposed |
| 45 | Ship THIRD_PARTY_NOTICES.md and a compliance paragraph; never copy from account-abstraction, safe7579, smartsessions, kernel/dependencies, Should-AI-Buy, the Visa TAP repos or any repo without a LICENSE; own contracts on OpenZeppelin, MIT header; licence report on 18 Oct | Extends 26 (duplicate in part) | [licences](../04-build/licences-and-reuse.md) | S | compliance | proposed |
| 46 | Fund demo wallets early (`scripts/fisco/fund.sh` locally; the server faucet gives native balance plus HK$100 eHKD once per address per day) | Wednesday blocker; faucet cap | [licences](../04-build/licences-and-reuse.md) | S | Task | proposed |
| 47 | Add payee provenance and look-alike check, exact-amount re-typing on step-up, and "agent may pause but never resume" rule; FISCO dry run only if core is on track | Cross-topic polish bar set by OneGate and Sathi | [rivals](../03-research/topic-f-rivals.md) | S-M | Security, Bonus | proposed |
| 48 | Re-run the GitHub rival search on 19 Oct and before the 22-23 Oct review; read any new Topic F repo within an hour | Field changes daily | [rivals](../03-research/topic-f-rivals.md) | S | Innovation | proposed |
| 49 | Correct the line "did not find another project doing exactly that" in prior-art-hackathons-github.md (owner of that doc to edit) | edxzh/agent-wallet already does ERC-1271 x402 plus ERC-8004 | [rivals](../03-research/topic-f-rivals.md) | S | Innovation | proposed |

## What this means for winning

- **[must]** Items 1-9, 13 and 15. Task 40, Security 30.
- **[must]** Items 5 and 10. Innovation 30.
- **[must]** Round 2: items 28, 29, 30, 35, 36, 38, 39, 40, 41, 42 (plain judge tasks, evidence and red-team build, submission, facilitator test, killer beat). Task 40, Security 30.
- **[should]** Items 11, 12, 14, 16-22. Innovation 30, Security 30.
- **[should]** Round 2: items 31-34, 43, 44, 45, 46, 48 and 49. All scores.
- **[could]** Items 24-27, 47 and Nexus/Safe7579 migration. Bonus, Innovation.

## Open questions

- Which items does the team accept? Record in [decisions](../07-log/decisions.md).
- The spec lines to change are owned by the spec author; items 3, 5, 13, 15, 23 need their edit; so do 28 and 29 (new tool and policy) and item 49 (prior-art doc).

## Sources

- Local docs listed per row, read 2026-10-13 (round 2 rows from docs written the same day). Spec: [product-design.md](product-design.md).
