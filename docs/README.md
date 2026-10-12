# ChainBrain docs: master index
Last updated: 2026-10-13

## In one minute

- **What this repo is:** the shared workspace for team 链AI脑 (ChainBrain), entering the 2026 Shenzhen International FinTech Competition (WeBank FinTechathon), International AI Track, Topic F (Agent Wallet). Deadline: 24:00, 20 Oct 2026 (UTC+8).
- **The idea:** a trust layer for agent-to-merchant payments. A buyer AI agent pays from a spend-limited "pocket" on-chain; the seller runs seven checks ("guards") before serving. See [one-page summary](00-start-here/one-page-summary.md).
- **Honest status (13 Oct):** a credible top-10 candidate, not yet a favourite. A simulated judge panel scored us about 73/100 ([judge simulation](06-pitch/judge-simulation.md)). The research found several claims in the spec that must change ([recommended changes](02-product/recommended-changes.md)).
- **Three things to do first:** email the organisers (do testnet hashes count?), pass the 14 Oct payment spike, start the technical docs on 15 Oct ([status and plan](00-start-here/status-and-plan.md)).
- **How to read:** every doc opens with "In one minute", has detail below, and ends with "What this means for winning", "Open questions" and "Sources".
- **Downloads** (papers, cloned repos) live in `reference/`, which is gitignored and untrusted. Never run code from it.

## Start here: reading order by role

| Role | Read in this order (about time) |
| --- | --- |
| **Everyone** | 1. [one-page summary](00-start-here/one-page-summary.md) (5 min). 2. [status and plan](00-start-here/status-and-plan.md) (10 min). 3. [open questions](00-start-here/open-questions.md) (10 min). 4. [how to win](06-pitch/how-to-win.md) (10 min) |
| **Builders** (contracts, gateway, MCP, agent) | [x402 + pocket feasibility](04-build/x402-pocket-feasibility.md), then [stack and repos](04-build/stack-and-repos.md), then [identity, reputation, FISCO](04-build/identity-reputation-fisco.md), then the [spec](02-product/product-design.md), then [recommended changes](02-product/recommended-changes.md) |
| **Pitch and docs** (deck, video, technical document) | [how to win](06-pitch/how-to-win.md), [how judges score](06-pitch/how-judges-score.md), [judge simulation](06-pitch/judge-simulation.md), [competitors](03-research/competitors-industry.md), [market and regulation](03-research/market-regulation-webank.md), [rules](01-competition/hackathon-rules.md) |
| **Security** | [threat model and red team](05-security/threat-model-and-red-team.md), then [papers and standards](03-research/papers-and-standards.md), then the pocket section of [feasibility](04-build/x402-pocket-feasibility.md) |

## Map of every folder and doc

| Path | What it is |
| --- | --- |
| `README.md` | This index |
| **00-start-here/** | Short docs for a new teammate |
| [one-page-summary.md](00-start-here/one-page-summary.md) | ChainBrain on one page: problem, users, demo, real vs simulated |
| [status-and-plan.md](00-start-here/status-and-plan.md) | Countdown, day plan 13-20 Oct, owners column, top risks |
| [open-questions.md](00-start-here/open-questions.md) | All open questions, grouped, with defaults; draft email to organisers |
| **01-competition/** | Official material (unchanged) |
| [hackathon-overview.md](01-competition/hackathon-overview.md) | Competition overview, directions, schedule, awards |
| [hackathon-rules.md](01-competition/hackathon-rules.md) | Rules, deliverables, scoring |
| **02-product/** | What we are building |
| [product-design.md](02-product/product-design.md) | The spec (owner: @Tan Hao Wen). Not edited by the research run |
| [recommended-changes.md](02-product/recommended-changes.md) | Ranked changes research suggests; status "proposed" until the team decides |
| **03-research/** | Market and prior-art research |
| [competitors-industry.md](03-research/competitors-industry.md) | About 30 players; the seller-side trust gap; claims judges will challenge |
| [prior-art-hackathons-github.md](03-research/prior-art-hackathons-github.md) | Hackathon winners, same-topic rivals, novelty verdict per feature |
| [market-regulation-webank.md](03-research/market-regulation-webank.md) | Regulation map (mainland, HK, Singapore), market facts, WeBank fit, business model |
| [papers-and-standards.md](03-research/papers-and-standards.md) | 28 new papers and 16 standards; "cite these" list |
| **04-build/** | How to build it |
| [x402-pocket-feasibility.md](04-build/x402-pocket-feasibility.md) | The Wednesday spike: recipe, fallback ladder, checklist |
| [stack-and-repos.md](04-build/stack-and-repos.md) | Tools, pinned versions, cloned repos |
| [identity-reputation-fisco.md](04-build/identity-reputation-fisco.md) | ERC-8004, credentials, KYA, FISCO BCOS bonus recipe |
| **05-security/** | |
| [threat-model-and-red-team.md](05-security/threat-model-and-red-team.md) | Attack walk, 17 spec gaps, red-team plan, self-assessment outline |
| **06-pitch/** | Winning and presenting |
| [how-to-win.md](06-pitch/how-to-win.md) | One-line pitch, story arc, killer demo, Q&A cheat sheet |
| [how-judges-score.md](06-pitch/how-judges-score.md) | Rubric decoded, deliverables checklist, scorecard |
| [judge-simulation.md](06-pitch/judge-simulation.md) | Five simulated judges, predicted score, top objections |
| **07-log/** | |
| [research-log.md](07-log/research-log.md) | One row per research task, with time |
| [decisions.md](07-log/decisions.md) | Decisions and why |
| [changelog.md](07-log/changelog.md) | What was added or moved |

## Doc conventions

- Line 1 is `# Title`; line 2 is `Last updated: YYYY-MM-DD`; then "In one minute", detail, "What this means for winning", "Open questions", "Sources".
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
- [must] Start with [how to win](06-pitch/how-to-win.md) and [status and plan](00-start-here/status-and-plan.md).

## Open questions

- Which of the proposed changes does the team accept? Record each choice in [decisions](07-log/decisions.md).
- The spec says deadline 23:59 and the rules say 24:00 (UTC+8); we plan to the earlier one.

## Sources

- All docs listed above, read 2026-10-13. Local paths relative to this folder.
