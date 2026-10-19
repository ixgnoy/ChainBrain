# Status and plan: countdown to 20 Oct
Last updated: 2026-10-17

> **Status (14 Oct, v2):** rewritten against the team's [spec v2](../02-product/product-design.md), the 14 Oct prelim wallet plan and the code on main. The 13 Oct version planned a seller gateway, seven guards, MCP and a spike with two paths. None of that is in the prelim build. It is in git history (commit 42a41f2) and the finals roadmap.
>
> **17 Oct:** the project now runs only on FISCO BCOS 3.16.4 (chain id 20200) with a Mock e-HKD token (eHKD). Counts and rows below are updated to match.

## In one minute

- **Countdown:** at 2026-10-14 19:48 (UTC+8) there are about **6 days 4 hours** to the deadline (23:59 or 24:00 on 20 Oct, UTC+8) and about **5 days 16 hours** to the team's submit target of noon on 20 Oct. The spec and Attachment 2 say 23:59 and the website says 24:00; plan to the earlier one. Attachment 3 (the registration form) needs passport images and enrolment proofs for every member: see [attachments.md](../01-competition/attachments.md).
- **Built and tested locally** (per the [technical document](../technical-document.md)): pocket, factory and Mock e-HKD (55 contract tests), wallet tool layer and agent API (82 tests pass on the local FISCO node, 6 skipped without `ANTHROPIC_API_KEY`), scenes 1-8 through the agent loop in replay mode (6 tests), web app (82 tests), Expo phone app (46 tests), native Android app (6 tests, APK builds). The same stack is hosted on Railway ([FISCO evidence](../evidence-fisco.md)).
- **Not done yet (needs a phone, an API key or a human):** MetaMask live signing against the Railway node, Expo on a real phone, real-model run of scenes 1-8, organiser email, team eligibility check, deck, video, submission.
- **Day-1 gate:** passed on the FISCO node. Mock e-HKD calls the pocket's ERC-1271 check, and x402's facilitator code (always in-process) verifies and settles pocket payments ([security self-assessment](../security-self-assessment.md)).
- **Research simulated score:** about 73/100, computed on the OLD seller-trust design ([judge simulation](../06-pitch/judge-simulation.md)). It has not been re-run for v2.
- Owners are blank: the team fills them in ([roles and workplan](roles-and-workplan.md)).

## Key dates (UTC+8)

| Date | Milestone |
| --- | --- |
| Wed 14 Oct | Spike and day-1 gate |
| Tue 20 Oct noon | Team's submit target |
| Tue 20 Oct 23:59 | Submission deadline (website says 24:00; plan to 23:59) |
| 21 Oct | Compliance screening |
| 22-23 Oct | Online review, top 10 chosen (IEEE page says 23-28 Oct: [VERIFY]) |
| 31 Oct | Finalists announced |
| 20-23 Nov | Finals: check-in 20 Nov, defence 22 Nov, awards 23 Nov; at least one member per finalist team must attend in person (Attachment 2) |
| 22 Nov | Defence at WeBank, Shenzhen |

## Day plan 14-20 Oct

From the plan's day table and its Task 10, adjusted because the build is ahead of schedule. Owner column left for the team.

| Day | What is left | Owner |
| --- | --- | --- |
| Wed 14 | Register and confirm the team; send the organiser email; start the FISCO node; deploy Mock e-HKD and the factory (`scripts/fisco/deploy.sh`); fund wallets (`scripts/fisco/fund.sh`) | |
| Thu 15 | Scenes 1-2 from the terminal on the FISCO node; MetaMask live run in the browser; real-model run of scenes 1-8 with `ANTHROPIC_API_KEY`; pick the agent model default | |
| Fri 16 | Expo Go on a real phone; native Android on a device or emulator; scenes 3-4 live with the owner co-sign | |
| Sat 17 | Scenes 5-8 live; forced transfer (`force-transfer.ts`); collect every tx hash into [FISCO evidence](../evidence-fisco.md) | |
| Sun 18 | Record a full draft video (5 minutes at most, English); fix only what it exposes; feature freeze at night | |
| Mon 19 | Deck (10 minutes at most); final evidence check; fresh-clone test; secret scan | |
| Tue 20 | Final video; check every evidence link; **email the submission by noon** | |

## Submission T-minus schedule

The working deadline is noon on Tue 20 Oct. Full table and final checks are in the [submission checklist](../06-pitch/submission-checklist.md).

| When | Gate |
| --- | --- |
| Wed 14 (T-6d) | Organiser email sent; passports and enrolment proofs collected; 60% rule checked; chain and factory up |
| Thu 15 (T-5d) | Live scenes 1-2 hashes; real-model run |
| Fri 16 (T-4d) | Phone apps run on devices |
| Sat 17 (T-3d) | All scene hashes in the evidence file |
| Sun 18 (T-2d) | Feature freeze at night; draft video recorded |
| Mon 19 (T-1d) | Deck done; package complete |
| Tue 20 09:00-12:00 | Final checks and **submit by 12:00** |
| Tue 20 12:00-24:00 | Buffer only; keep the receipt |

## Mainnet decision rule (proposed, from the 13 Oct research)

The old public-mainnet rerun plan was replaced by the FISCO BCOS + Mock e-HKD setup. If the organisers ask for a different chain, we wait for their answer ([Topic F tasks](../04-build/topic-f-tasks-and-mainnet-plan.md)).

## Model decision

The plan's default is `claude-opus-5-5` at effort `high`; `AGENT_MODEL=claude-sonnet-5-5` is cheaper if the real-model scene run passes on it. Open for the Shenzhen defence: Anthropic's supported-countries page does not list China, so the model API and venue network must be tested ([agent model choice](../04-build/agent-model-choice.md)). The replay mode (`SCENE_REPLAY=1`) is the offline fallback for scenes.

## Cut order (if time runs short)

The spec says the core demo ships first and anything else is cut before a core scene slips. Nice to have, in order: activity-trail export as an audit page, a second pocket in parallel, nicer presets. The demo video wins any time conflict with README or deployment-guide polish (plan, spec issue 10).

## Top risks

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Hashes from a team-hosted FISCO chain do not count | Task 40% could drop | Email the organisers; show the read-only explorer and evidence files |
| Railway FISCO node down during judging | No live hashes | Local FISCO node; recorded evidence ([FISCO evidence](../evidence-fisco.md)) |
| MetaMask refuses the eHKD typed-data signature | Scene 3 on web fails | Approve from the phone app; note MetaMask's warning text |
| Expo Go on a real phone not yet run | Phone demo unproven | Expo web target (verified); native Android app |
| Real model's choices in scenes 1-8 not yet checked | Scenes may drift | Tune prompt and tool descriptions; never add scripted branches |
| Judges' own injection beats the scripted one | Large security deduction | Live red-team box; pocket backstop on-chain |
| Eligibility: overseas university and at least 60% non-Chinese nationals | Disqualification | Check today ([checklist](../06-pitch/submission-checklist.md)) |
| Rivals with full evidence packs (Leash, sucsage) | Evidence bar is high | Fill [FISCO evidence](../evidence-fisco.md) with real hashes ([rivals](../03-research/topic-f-rivals.md)) |
| Model API or venue network unreachable in Shenzhen | Live defence fails | Replay mode, recorded clips |
| Licence trap (copying GPL/AGPL code) | Rules require licensed material | Read only; own code on OpenZeppelin ([licences](../04-build/licences-and-reuse.md)) |

## Superseded 13 Oct material

Removed from this page because the prelim build no longer includes it: the Path A / Path B spike and the 30-minute facilitator test (the spike now runs through `pnpm spike`), the seller gateway, guards 1-3 and 5-7, MCP and SKILL.md, the minimum-slice list built on guards, and the scene numbering of the old demo. The research behind them is still in [04-build](../04-build/x402-pocket-feasibility.md) and [06-pitch](../06-pitch/demo-script.md), marked as old design.

## What this means for winning

- **[must]** Collect real hashes for every scene. Task 40.
- **[must]** Organiser email and eligibility check today. All.
- **[must]** Fill in owners in [roles and workplan](roles-and-workplan.md). All.
- **[should]** Feature freeze Sun 18 night. All.

## Open questions

- Who owns each row? Team to fill in.
- Which agent model is the default for the live run? See [open questions](open-questions.md).
- Is the submission channel the address in the rules or another? See [open questions](open-questions.md) O11.

## Sources

- [Spec v2](../02-product/product-design.md) plan section; the 14 Oct prelim wallet plan (history: day plan, Task 10, open questions); [technical document](../technical-document.md) test summary; [FISCO evidence](../evidence-fisco.md). `date` run 2026-10-14 19:48; FISCO counts 2026-10-17.
