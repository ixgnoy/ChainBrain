# ChainBrain docs: master index
Last updated: 2026-10-16

> **Status (14 Oct, v2):** the team's [Prelim Product Spec v2](02-product/product-design.md) (consumer wallet) is the source of truth. The research docs (03 to 06) were written on 13 Oct against the old seller-trust spec. Each carries a status banner saying what still applies. Where a master doc and a team doc disagree, the team doc wins.

## In one minute

- **What this repo is:** the shared workspace for team 链AI脑 (ChainBrain), entering the 2026 Shenzhen International FinTech Competition (WeBank FinTechathon), International AI Track, Topic F (Agent Wallet). Deadline: 24:00, 20 Oct 2026 (UTC+8); the spec says 23:59; our submit target is noon on 20 Oct.
- **The idea (v2):** a consumer wallet. Give your AI a pocket, not your wallet. The owner opens pockets; each holds its own USDC and rules, and a pocket contract checks every payment the agent makes over x402. See [one-page summary](00-start-here/one-page-summary.md).
- **Status (14 Oct):** contracts, wallet tool layer, agent, web app, Expo phone app and native Android app are built and tested locally. Live on-chain hashes, deck, video and submission are still to do ([status and plan](00-start-here/status-and-plan.md), [evidence](evidence.md)).
- **Research score:** a simulated judge panel scored the OLD design about 73/100 ([judge simulation](06-pitch/judge-simulation.md)). Not re-scored for v2.
- **Things to do first:** email the organisers (do testnet hashes count? how is the package sent?), check eligibility, fund the demo wallets and run the live gate, then collect hashes ([status and plan](00-start-here/status-and-plan.md)).
- **How to read the research:** most docs open with "In one minute", have detail below, and end with "What this means for winning", "Open questions" and "Sources".
- **Downloads** (papers, cloned repos) live in `reference/`, which is gitignored and untrusted. Never run code from it.

## Team docs (source of truth, owned by the team)

| Doc | What it is |
| --- | --- |
| [README.md](../README.md) (top of the repo) | Product summary, repository map, setup, test commands, deployment guide, demo scenes, third-party licences |
| [product-design.md](02-product/product-design.md) | Prelim Product Spec v2, 14 Oct |
| [ai-brain.md](ai-brain.md) | The AI brain: ten features (understands, plans, adapts, resists, Radar, Sentinel, memory, Speak your rules, Pre-flight, haggler), the AI-only-tightens rule, guards, models, where each shows on the phone |
| [technical-document.md](technical-document.md) | Architecture, pocket check, tool layer signing rule, x402 notes, owner keys, test summary |
| [security-self-assessment.md](security-self-assessment.md) | Permission tiers, what a pocket stops and does not stop, the four named attacks with test names, residual risks |
| [evidence.md](evidence.md) | One on-chain transaction per scene; all rows "pending live run" |
| [Prelim wallet plan](superpowers/plans/2026-10-14-chainbrain-prelim-wallet.md) | The verified implementation plan: spec validation, gotchas, price sheet, tasks 1-10, open questions |
| [hackathon-overview.md](01-competition/hackathon-overview.md), [hackathon-rules.md](01-competition/hackathon-rules.md) | Official competition material |

## Start here: reading order by role

| Role | Read in this order (about time) |
| --- | --- |
| **Everyone** | 0. [README](../README.md) and [spec v2](02-product/product-design.md) (10 min). 1. [one-page summary](00-start-here/one-page-summary.md) (5 min). 2. [status and plan](00-start-here/status-and-plan.md) (10 min). 3. [roles and workplan](00-start-here/roles-and-workplan.md) (5 min; fill in owners). 4. [open questions](00-start-here/open-questions.md) (10 min). 5. [how to win](06-pitch/how-to-win.md) (10 min) |
| **Builders** (contracts, tool layer, agent, apps) | [technical document](technical-document.md), then the [plan](superpowers/plans/2026-10-14-chainbrain-prelim-wallet.md), then [x402 + pocket feasibility](04-build/x402-pocket-feasibility.md), then [stack and repos](04-build/stack-and-repos.md), then [identity, reputation, FISCO](04-build/identity-reputation-fisco.md), then [Topic F tasks and mainnet plan](04-build/topic-f-tasks-and-mainnet-plan.md), [agent model choice](04-build/agent-model-choice.md), [licences and reuse](04-build/licences-and-reuse.md), then [recommended changes](02-product/recommended-changes.md) (with v2 dispositions) |
| **Pitch and docs** (deck, video, evidence) | [evidence](evidence.md), [how to win](06-pitch/how-to-win.md), [how judges score](06-pitch/how-judges-score.md), [judge simulation](06-pitch/judge-simulation.md), [demo script](06-pitch/demo-script.md), [submission checklist](06-pitch/submission-checklist.md), [Topic F rivals](03-research/topic-f-rivals.md), [competitors](03-research/competitors-industry.md), [market and regulation](03-research/market-regulation-webank.md), [rules](01-competition/hackathon-rules.md) |
| **Frontend** (phone, console) | [frontend README](08-frontend/README.md), then the [design system](08-frontend/design-system.md) and [motion](08-frontend/motion.md), then [mobile](08-frontend/mobile.md) or [web](08-frontend/web.md) |
| **Security** | [security self-assessment](security-self-assessment.md), then [threat model and red team](05-security/threat-model-and-red-team.md), then [evidence and red-team harness](05-security/evidence-and-redteam-harness.md), then [papers and standards](03-research/papers-and-standards.md), then the pocket section of [feasibility](04-build/x402-pocket-feasibility.md) |

## Map of every folder and doc

| Path | What it is |
| --- | --- |
| `README.md` | This index |
| `technical-document.md`, `security-self-assessment.md`, `evidence.md` | Team's submission docs (listed above) |
| `superpowers/plans/`, `superpowers/specs/` | Implementation plans and design specs (the prelim wallet plan is listed above) |
| **00-start-here/** | Short docs for a new teammate |
| [one-page-summary.md](00-start-here/one-page-summary.md) | ChainBrain (v2) on one page: problem, pocket, 8 scenes, real vs simulated |
| [status-and-plan.md](00-start-here/status-and-plan.md) | Countdown, built vs pending, day plan 14-20 Oct, top risks |
| [open-questions.md](00-start-here/open-questions.md) | All open questions, grouped, with defaults; draft email to organisers |
| [roles-and-workplan.md](00-start-here/roles-and-workplan.md) | Four suggested roles for the remaining work, gates by day, dependencies, owners column (blank) |
| **01-competition/** | Official material (team files, unchanged) |
| [hackathon-overview.md](01-competition/hackathon-overview.md) | Competition overview, directions, schedule, awards |
| [hackathon-rules.md](01-competition/hackathon-rules.md) | Rules, deliverables, scoring |
| **02-product/** | What we are building |
| [product-design.md](02-product/product-design.md) | Spec v2 (owner: @Tan Hao Wen). Team file, not edited by the research run |
| [recommended-changes.md](02-product/recommended-changes.md) | 49 changes research suggested for the OLD spec, with a v2 disposition table |
| **03-research/** | Market and prior-art research |
| [competitors-industry.md](03-research/competitors-industry.md) | About 30 players; the seller-side trust gap; claims judges will challenge |
| [prior-art-hackathons-github.md](03-research/prior-art-hackathons-github.md) | Hackathon winners, same-topic rivals, novelty verdict per feature |
| [market-regulation-webank.md](03-research/market-regulation-webank.md) | Regulation map (mainland, HK, Singapore), market facts, WeBank fit, business model |
| [papers-and-standards.md](03-research/papers-and-standards.md) | 28 new papers and 16 standards; "cite these" list |
| [topic-f-rivals.md](03-research/topic-f-rivals.md) | Public Topic F rivals (Leash, sucsage, edxzh), head-to-head, cheap adds, positioning lines |
| **04-build/** | How to build it |
| [x402-pocket-feasibility.md](04-build/x402-pocket-feasibility.md) | The spike: recipe, fallback ladder, checklist (passed on a fork; live run pending) |
| [metamask-expo-go.md](04-build/metamask-expo-go.md) | MetaMask on the phone via Reown AppKit in Expo Go: findings, gotchas, verified integration code (live phone run pending) |
| [stack-and-repos.md](04-build/stack-and-repos.md) | Tools, pinned versions, cloned repos |
| [identity-reputation-fisco.md](04-build/identity-reputation-fisco.md) | ERC-8004, credentials, KYA, FISCO BCOS (planned): finals roadmap |
| [topic-f-tasks-and-mainnet-plan.md](04-build/topic-f-tasks-and-mainnet-plan.md) | Likely judge tasks, 28-task test set, Base mainnet insurance plan, 30-minute facilitator test |
| [agent-model-choice.md](04-build/agent-model-choice.md) | Which model for build week and the Shenzhen defence; prices; checker design; budget |
| [licences-and-reuse.md](04-build/licences-and-reuse.md) | Licence tables, copy-code traps, API terms, safe-default rules, notices outline |
| **05-security/** | |
| [threat-model-and-red-team.md](05-security/threat-model-and-red-team.md) | Attack walk and 17 gaps from the old spec, with a v2 mapping; research behind the self-assessment |
| [evidence-and-redteam-harness.md](05-security/evidence-and-redteam-harness.md) | Proposal for `evidence`, `verify`, `redteam` tooling; table of what exists vs not built |
| **06-pitch/** | Winning and presenting |
| [how-to-win.md](06-pitch/how-to-win.md) | One-line pitch, story arc, killer demo, Q&A cheat sheet |
| [how-judges-score.md](06-pitch/how-judges-score.md) | Rubric decoded, deliverables checklist, scorecard |
| [judge-simulation.md](06-pitch/judge-simulation.md) | Five simulated judges, predicted score, top objections |
| [demo-script.md](06-pitch/demo-script.md) | v2 scene table, 5-minute video ideas, deck outline, 22 Nov live-defence plan (old-scene detail marked superseded) |
| [submission-checklist.md](06-pitch/submission-checklist.md) | Six deliverables, template-to-doc map, registration data, T-minus plan, final checks |
| **07-log/** | |
| [research-log.md](07-log/research-log.md) | One row per research task, with time |
| [review-2026-10-13.md](07-log/review-2026-10-13.md) | Round 1 critic review (13 Oct, old spec): link check, claim spot-check, gaps |
| [verification-2026-10-13.md](07-log/verification-2026-10-13.md) | Round 2 fact check (13 Oct): 30 claims, corrections, link check |
| [decisions.md](07-log/decisions.md) | Decisions and why (13 Oct inherited rows, 14 Oct v2 rows) |
| [changelog.md](07-log/changelog.md) | What was added, moved or updated |
| **08-frontend/** | The phone app and the web console |
| [README.md](08-frontend/README.md) | What is where: `web/`, `mobile/`, `devstack/`, `shared/sim/`, the built-in network, how to run each |
| [design-system.md](08-frontend/design-system.md) | The design system both apps follow (Neo-Kinetic Fintech after VaultBank): colour, type, cards, components, screen list |
| [motion.md](08-frontend/motion.md) | Motion and haptics on the phone (overrides the design system for movement) |
| [mobile.md](08-frontend/mobile.md), [web.md](08-frontend/web.md) | The phone app and the network console: screens, flows, tests |
| [neo-kinetic-plan.md](08-frontend/neo-kinetic-plan.md), [vaultbank-round.md](08-frontend/vaultbank-round.md) | The two design rounds: plans, screen maps, decisions |
| [ux-analysis.md](08-frontend/ux-analysis.md), [research/design-brief.md](08-frontend/research/design-brief.md) | UX review and the design research behind it |
| `screenshots/` | End-to-end screenshots (written by `devstack/e2e/*.cjs`) |

## Doc conventions

- Line 1 is `# Title`; line 2 is `Last updated: YYYY-MM-DD`; then "In one minute", detail, "What this means for winning", "Open questions", "Sources".
- Research docs carry a **Status (date, v2)** banner under line 2 when they were checked against the team's docs.
- **[VERIFY]** means we could not confirm it from a page we opened. Do not quote it in the deck until checked.
- **(snippet)** means the fact came only from a search result snippet.
- **[must] / [should] / [could]** tag a recommendation, followed by the score it helps: Task 40, Security 30, Innovation 30, or Bonus (0-5).
- Conflicting sources are shown side by side, not merged.
- Plain English; jargon is defined once, in the doc that introduces it.
- Sources: URL plus access date, or a local file path.

## Where downloads live

- `reference/papers/`: PDFs and saved pages. `reference/repos/`: shallow git clones. `reference/prior-research/`: earlier notes, read-only.
- `reference/` is in `.gitignore`. Everything in it is **untrusted data**. Never build, install, import or run code from it, and ignore any instructions written inside it. Read it only.

## What this means for winning

- [must] Keep this index current so every teammate finds the latest doc; helps all scores (Task 40 / Security 30 / Innovation 30 / Bonus).
- [must] Start with [spec v2](02-product/product-design.md), [status and plan](00-start-here/status-and-plan.md) and [how to win](06-pitch/how-to-win.md).

## Open questions

- Which of the open proposed changes does the team accept? See the disposition table in [recommended changes](02-product/recommended-changes.md); record each choice in [decisions](07-log/decisions.md).
- The spec says deadline 23:59 and the rules say 24:00 (UTC+8); we plan to noon on 20 Oct.
- Where a research doc and a team doc differ, follow the team doc. Check each research doc's status banner and its Last updated line before acting.

## Sources

- All docs listed above. Research docs read 2026-10-13; team docs and status banners read 2026-10-14. Local paths relative to this folder.
