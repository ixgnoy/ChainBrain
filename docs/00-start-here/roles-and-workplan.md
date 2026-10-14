# Roles and workplan, 13-20 Oct
Last updated: 2026-10-13

## In one minute

- **Four roles cover the whole job:** (1) Contracts, (2) Gateway and MCP, (3) Agent and frontend, (4) Pitch, docs and security report. A team of 4-5 takes one each; a team of 2-3 merges them (table below).
- **Owners are blank.** The team writes names in the Owner column today. The roles are a suggestion; nothing here is decided.
- **Budget:** about 7 working days left (13-19 Oct, with 20 Oct morning for submission only). The hours below are a planning guess, not a measurement: roughly 6-8 hours a day per person on weekdays, more at the weekend. Adjust to your real study schedule.
- **The critical path is one chain:** Wed 14 spike, then the pocket and gateway, then scenes 1-3 end to end by Fri 16, then the killer beat and `npm run evidence` by Sat 17, then freeze Sun 18. If the chain slips, cut per the [minimum slice](../06-pitch/demo-script.md).
- **Two people must be unblocked first:** whoever sends the organiser email today, and whoever is outside mainland China and can buy mainnet USDC by Fri 16 ([mainnet plan](../04-build/topic-f-tasks-and-mainnet-plan.md)). Both are people questions, not code.
- **Docs start 15 Oct, not later.** Role 4 owns that, but every builder owes Role 4 a short written note each evening (what works, what failed, hashes).
- **Every role has one named backup.** If someone is ill on 17 Oct, the backup takes the task; do not let a single person hold a gate alone.

## 1. The four roles

| Role | Owns | Main docs to read | Merges well with |
| --- | --- | --- | --- |
| **R1 Contracts** | Pocket validator (exact-digest rule), pocket factory, registry or binding contract, Foundry tests, Base Sepolia deployments, spike Path A, forced-revert direct-submit script | [feasibility](../04-build/x402-pocket-feasibility.md), [threat model](../05-security/threat-model-and-red-team.md) gaps G1-G2, [licences](../04-build/licences-and-reuse.md) | R2 (2-3 person team) |
| **R2 Gateway and MCP** | Seller gateway (settle before serve, atomic claim), seven guards, reason codes, self-hosted facilitator, MCP server and SKILL.md, spike Path B, the 30-minute facilitator test, mainnet scripts and guard flags | [feasibility](../04-build/x402-pocket-feasibility.md), [Topic F tasks and mainnet](../04-build/topic-f-tasks-and-mainnet-plan.md), [stack](../04-build/stack-and-repos.md) | R1 or R3 |
| **R3 Agent and frontend** | In-house agent (model as a config string), trace panel with turns per task, record-and-replay, owner console, seller console, red-team input box, model reachability test | [agent model choice](../04-build/agent-model-choice.md), [demo script](../06-pitch/demo-script.md) | R4 (2-person team) |
| **R4 Pitch, docs and security report** | Organiser email and registration, technical document, security self-assessment, evidence and red-team harness (`npm run evidence`, `verify`, `redteam`), deck, video, submission package | [submission checklist](../06-pitch/submission-checklist.md), [harness](../05-security/evidence-and-redteam-harness.md), [how to win](../06-pitch/how-to-win.md) | R3 |

### How roles merge by team size

| Team size | Suggested split |
| --- | --- |
| 2 | Person A: R1 + R2 (everything on-chain and the gateway). Person B: R3 + R4 (agent, consoles, docs). Cut the second agent, the scam seller and FISCO on day 1. |
| 3 | A: R1 + R2 contracts and facilitator. B: R2 gateway/MCP + R3 agent. C: R4 plus the consoles. |
| 4 | One person per role. R4 also writes the harness; R3 helps with consoles. |
| 5 | Four roles plus a "QA and red team" person: runs the outsider attack session, the 20-run suite, the judge-task set and the fresh-clone test. |

The 60% rule: at least ceil(0.6 x team size) members must be non-Chinese nationals (2 of 3, 3 of 4, 3 of 5) ([checklist](../06-pitch/submission-checklist.md)). Check it before anyone is assigned.

## 2. Hour budget per day

Planning guess in person-hours per day, for a full 4-role team. Scale down if you are fewer. "Gate" is the thing that must be true at the end of the day.

| Day | R1 Contracts | R2 Gateway + MCP | R3 Agent + frontend | R4 Pitch + docs + security | Gate at end of day |
| --- | --- | --- | --- | --- | --- |
| Tue 13 | 3 (install, keys, faucets) | 3 (keys, RPC, facilitator reading) | 3 (model test from each teammate's network) | 4 (organiser email, registration data, 60% check) | Email sent; wallets funded; agent model shortlisted |
| Wed 14 | 8 (Path A) | 8 (Path B + facilitator test, 30 min) | 4 (agent skeleton) | 4 (technical-document skeleton, record spike results) | **Spike result: one success hash and two rejections; rung chosen** |
| Thu 15 | 7 (pocket, factory, tests) | 8 (gateway, six sellers, MCP) | 7 (agent loop, trace panel) | 7 (start technical doc, self-assessment, evidence design) | Docs started; model fixed in [decisions](../07-log/decisions.md) |
| Fri 16 | 6 (deploy, ERC-8004 binding, one-off payment R1) | 7 (guards 1-3, 5-7, reason codes) | 8 (owner console, seller console) | 7 (`npm run evidence` first run; deck outline; buy mainnet funds by a non-mainland teammate) | **Scenes 1-3 end to end with a real hash** |
| Sat 17 | 5 (forced-revert script, outsider attack fixes) | 6 (judge-task set, guard fixes) | 8 (killer beat, 20 rehearsal runs, red-team box) | 8 (`npm run redteam` first full run, video storyboard) | **Killer beat passes 17 of 20 runs; first red-team numbers** |
| Sun 18 | 4 (freeze; US$0.05 mainnet smoke test) | 4 (freeze) | 6 (draft video recording) | 8 (full evidence run on frozen build, draft video cuts, deck v1) | **Feature freeze at night; draft video exists** |
| Mon 19 | 3 (mainnet run of core scenes, if the rule says so) | 4 (mainnet run, key rotation, fresh-clone test) | 5 (final recording) | 9 (final docs from generated tables, secret scan, PDFs, assemble package) | Package complete; v1 submitted if allowed |
| Tue 20, until 12:00 | 1 | 1 | 2 (video check on another device) | 3 (final read, send) | **Submitted by 12:00** |

Totals per role over the week are about 37 (R1), 41 (R2), 43 (R3), 50 (R4) person-hours. This is a plan, not a prediction; the big risk is R3 and R4, who carry the most visible deliverables.

## 3. Dependencies (who waits for whom)

| Needs | From | Why | Fallback if late |
| --- | --- | --- | --- |
| Pocket address and a success hash | R1 (Path A) or R2 (Path B) | Everything on-chain, scene 6 revert | Drop one rung of the [fallback ladder](../04-build/x402-pocket-feasibility.md) and reword claims |
| Reason-code names (JSON schema) | R2, agreed with R3 and R4 on 14 Oct | Agent re-plan loop, harness and docs all use them (recommended change 25) | Fix the names by Wed night; rename only with a search-and-replace |
| MCP tool list (including R1 owner-signed one-off payment and `get_history`) | R2 with R1 | Plain judge tasks ([Topic F tasks](../04-build/topic-f-tasks-and-mainnet-plan.md)) | Ask the spec owner to confirm R1 fits the exact-digest rule before promising it |
| Model and key holder | R3 with the whole team | Agent, red-team cost, defence plan ([model choice](../04-build/agent-model-choice.md)) | Sonnet 5.5 for build week; replay mode for the defence |
| Trace panel and scene hashes | R3 and R2 | Video, evidence table | Record the hashes from real runs only; never retype |
| `hashes.json` from real runs | R1, R2 | `npm run evidence` and `verify` | Hand-run scripts that write the file; no hand-typed rows |
| Red-team harness runs against the full stack | R4 with R2, R3 | Security numbers in doc and video | Run what is built; report fewer attacks honestly |
| Passports and English enrolment proofs | Every member to R4 | Registration; disqualification risk | None. Collect today |
| Mainnet funds (US$10 USDC, about US$5 ETH on Base) | One teammate outside mainland China | Mainnet decision rule | Mentor abroad, or accept the risk and note it |
| Organiser answer | R4 sends; whole team reads | Testnet-hash rule, submission channel, deck format | Defaults in [open questions](open-questions.md) |

## 4. Owner assignment (fill in today)

| Role | Owner (name) | Backup (name) | Timezone and country (for model access) | Can use Claude from there? |
| --- | --- | --- | --- | --- |
| R1 Contracts | | | | |
| R2 Gateway and MCP | | | | |
| R3 Agent and frontend | | | | |
| R4 Pitch, docs, security | | | | |
| Mainnet funds (outside mainland) | | | | |
| Organiser email sender | | | | |

## What this means for winning

- **[must]** Fill the owner and backup table today; no gate has a single owner. All scores.
- **[must]** R4 writes docs from Thu 15 and every builder sends a short evening note. Task 40, Security 30.
- **[must]** Hold the Wed 14 gate and the Sat 17 and Sun 18 gates; cut scope rather than move them ([demo script](../06-pitch/demo-script.md) section 5). All scores.
- **[should]** In a 2-3 person team, cut the second agent, scam seller, FISCO and bonus scenes on day 1. Task 40, Security 30.
- **[should]** Add a QA and red-team person if you have five members. Security 30.
- **[could]** Pair R1 and R2 on Wednesday so both spike paths get a second pair of eyes. Task 40.

## Open questions

- Team size and which members are outside mainland China and Anthropic-supported regions?
- Real hours available per person on weekdays (exams, classes)? The budget above assumes 6-8 hours.
- Who is the narrator and who drives the demo, and do we show faces or voice-over only? ([demo script](../06-pitch/demo-script.md))

## Sources

- Local docs linked above, read 2026-10-13. Hour figures are planning guesses by the editor, not sourced data.
