# Roles and workplan, 14-20 Oct
Last updated: 2026-10-17

> **Status (14 Oct, v2):** rewritten for the consumer-wallet build. The 13 Oct roles were built around a seller gateway, seven guards and MCP; the hour table assumed a build that has since landed on main. Hours are not re-estimated: most build work is done, so what is left is mainly live runs, evidence, deck, video and submission. Owners are still blank.
>
> **17 Oct:** the project now runs only on FISCO BCOS (chain id 20200) with a Mock e-HKD token. The rows below are updated to match.

## In one minute

- **Four roles cover what is left:** (1) Contracts and live chain, (2) Wallet tool layer and agent, (3) Owner apps (web, Expo, Android), (4) Docs, evidence, deck, video and submission. A team of 4-5 takes one each; a team of 2-3 merges them.
- **Owners are blank.** The team writes names in the Owner column today. Nothing here is decided.
- **The critical path is short:** start the FISCO node, deploy Mock e-HKD and the factory (`scripts/fisco/deploy.sh`), fund the wallets (`scripts/fisco/fund.sh`), then run scenes 1-8 and collect every hash into [FISCO evidence](../evidence-fisco.md), then freeze on Sun 18, then deck and video, then submit by noon on Tue 20 Oct.
- **Two jobs only people can do:** send the organiser email, and check eligibility (overseas university and at least 60% non-Chinese nationals). Both are people questions, not code.
- **Every role has one named backup.** Do not let a single person hold a gate alone.

## 1. The four roles

| Role | Owns | Main docs to read |
| --- | --- | --- |
| **R1 Contracts and live chain** | Pocket, factory and Mock e-HKD (`contracts/`), contract tests, deploy to the FISCO node (local and Railway), wallet funding, `force-transfer.ts` for scene 5 | [technical document](../technical-document.md) section 2, [feasibility](../04-build/x402-pocket-feasibility.md), [security self-assessment](../security-self-assessment.md) |
| **R2 Wallet tool layer and agent** | `server/`: six tools, intent template, reason codes, x402 scheme, agent loop and prompt, test sellers, red-team inject route, the real-model scene run | [technical document](../technical-document.md) sections 3-5, [agent model choice](../04-build/agent-model-choice.md) |
| **R3 Owner apps** | `web/` (MetaMask), `mobile/` (Expo Go), `android/` (native Kotlin): live runs on real devices, approval sheet signing, red-team box, screenshots for the video | [spec app screens](../02-product/product-design.md), [README](../../README.md) deployment guide |
| **R4 Docs, evidence, deck, video, submission** | Organiser email and registration, evidence file with real hashes, deck (10 minutes at most), video (5 minutes at most), submission package, secret scan, fresh-clone test | [submission checklist](../06-pitch/submission-checklist.md), [demo script](../06-pitch/demo-script.md), [how to win](../06-pitch/how-to-win.md) |

### How roles merge by team size

| Team size | Suggested split |
| --- | --- |
| 2 | A: R1 + R2 (chain and server). B: R3 + R4 (apps and package). Cut the optional items in the spec (audit page, second pocket) on day 1. |
| 3 | A: R1 + R2 contracts and tool layer. B: R2 agent + R3. C: R4 plus screenshots and video. |
| 4 | One person per role. |
| 5 | Four roles plus a "QA and red team" person: runs outsider injection attempts against the red-team box, the fresh-clone test and the live scene runs. |

The 60% rule: at least ceil(0.6 x team size) members must be non-Chinese nationals (2 of 3, 3 of 4, 3 of 5) ([checklist](../06-pitch/submission-checklist.md)). Check it before anyone is assigned.

## 2. Gates by day

| Day | Gate at end of day |
| --- | --- |
| Wed 14 | Organiser email sent; wallets funded; factory deployed |
| Thu 15 | Scenes 1-2 live with hashes; MetaMask live run; real-model run of scenes 1-8 |
| Fri 16 | Phone apps run on real devices; scene 3 co-signed live |
| Sat 17 | Scenes 4-8 live; every hash in [FISCO evidence](../evidence-fisco.md) |
| Sun 18 | Draft video exists; feature freeze at night |
| Mon 19 | Deck done; fresh-clone test and secret scan pass; package complete |
| Tue 20, until 12:00 | **Submitted by noon** |

## 3. Dependencies (who waits for whom)

| Needs | From | Why | Fallback if late |
| --- | --- | --- | --- |
| Funded OWNER and FORCE wallets (native balance plus eHKD) | R1 | Every live scene ([README](../../README.md)) | `scripts/fisco/fund.sh` locally, the node gateway's /admin/fund on Railway, or the server faucet |
| Token and factory addresses in `contracts/deployments/20200.json` | R1 | Server and apps read it | Set `FACTORY_ADDRESS` |
| `ANTHROPIC_API_KEY` | Whole team | Real-model scenes | Replay mode (`SCENE_REPLAY=1`) for tests only; the video needs the real model |
| Real hashes from live runs | R1, R2, R3 | [FISCO evidence](../evidence-fisco.md) and the video | Never retype a hash; record from real runs only |
| Passports and English enrolment proofs | Every member to R4 | Registration; disqualification risk | None. Collect today |
| Organiser answer | R4 sends; whole team reads | Whether team-hosted chain hashes count, submission channel, deck format | Defaults in [open questions](open-questions.md) |

## 4. Owner assignment (fill in today)

| Role | Owner (name) | Backup (name) | Timezone and country (for model access) | Can use Claude from there? |
| --- | --- | --- | --- | --- |
| R1 Contracts and live chain | | | | |
| R2 Wallet tool layer and agent | | | | |
| R3 Owner apps | | | | |
| R4 Docs, evidence, submission | | | | |
| Organiser email sender | | | | |

## Superseded 13 Oct roles

The old R2 "Gateway and MCP" (seller gateway, seven guards, MCP server, SKILL.md, hosted-facilitator test), the old hour table (37-50 person-hours per role) and the old dependency rows (pocket address from Path A or B, MCP tool list, `hashes.json` and `npm run evidence`) described the seller-trust design. They are in git history (commit 42a41f2). The harness idea is still in [evidence and red-team harness](../05-security/evidence-and-redteam-harness.md) as a proposal.

## What this means for winning

- **[must]** Fill the owner and backup table today; no gate has a single owner. All scores.
- **[must]** Hold the Sat 17 and Sun 18 gates; cut scope rather than move them. All scores.
- **[should]** Add a QA and red-team person if you have five members. Security 30.

## Open questions

- Team size, and which members are outside mainland China and Anthropic-supported regions?
- Real hours available per person on weekdays (exams, classes)?
- Who is the narrator and who drives the demo, and do we show faces or voice-over only? ([demo script](../06-pitch/demo-script.md))

## Sources

- [Spec v2](../02-product/product-design.md), [README](../../README.md). Read 2026-10-17. History: the 14 Oct prelim wallet plan in `docs/superpowers/plans/`.
