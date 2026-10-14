# Changelog
Last updated: 2026-10-14

## 2026-10-14 (docs audit against v2)

The team's spec v2 (consumer wallet), plan, technical document, security self-assessment, evidence file and code arrived on main. The master docs were checked against them. The team's files were not edited.

- **Rewritten:** [one-page summary](../00-start-here/one-page-summary.md), [status and plan](../00-start-here/status-and-plan.md), [roles and workplan](../00-start-here/roles-and-workplan.md).
- **Updated:** [open questions](../00-start-here/open-questions.md) (old-design rows marked, new section E, no email addresses), [recommended changes](../02-product/recommended-changes.md) (disposition table), [docs index](../README.md) (team docs added, paths fixed).
- **Status banners and fixes (research kept):** every doc in 03-research, 04-build, 05-security and 06-pitch got a v2 banner, a new "Last updated" date and inline marks on old-design claims.
- **Logs:** decisions got 14 Oct rows; older logs got a "superseded by v2" note.
- **Links:** every relative markdown link in `docs/` and the top README was checked by script.

## 2026-10-13 (overnight run)

**Moved unchanged** onto branch `docs/master-docs`:

- `hackathon-overview.md`, `hackathon-rules.md` into [01-competition/](../01-competition/hackathon-overview.md)
- `product-design.md` into [02-product/](../02-product/product-design.md)

**Reference material** copied into `reference/` (gitignored): prior research, 14 papers, 14 repos; new papers and clones added by researchers.

**New docs**

| Doc | Added by |
| --- | --- |
| [README](../README.md), [one-page summary](../00-start-here/one-page-summary.md), [status and plan](../00-start-here/status-and-plan.md), [open questions](../00-start-here/open-questions.md) | editor |
| [recommended changes](../02-product/recommended-changes.md), [how to win](../06-pitch/how-to-win.md), [decisions](decisions.md), this changelog | editor |
| [competitors](../03-research/competitors-industry.md), [prior art](../03-research/prior-art-hackathons-github.md), [market and regulation](../03-research/market-regulation-webank.md), [papers and standards](../03-research/papers-and-standards.md) | research |
| [x402 pocket feasibility](../04-build/x402-pocket-feasibility.md), [stack and repos](../04-build/stack-and-repos.md), [identity, reputation, FISCO](../04-build/identity-reputation-fisco.md) | research |
| [threat model and red team](../05-security/threat-model-and-red-team.md) | research |
| [how judges score](../06-pitch/how-judges-score.md), [judge simulation](../06-pitch/judge-simulation.md) | research |
| [research log](research-log.md) | all (header fixed by editor; one stray row merged from a misplaced `docs/research-log.md`) |

`product-design.md` and the two competition docs were not edited.

## 2026-10-13 (round 2)

**New docs**

| Doc | Added by |
| --- | --- |
| [roles and workplan](../00-start-here/roles-and-workplan.md) | editor |
| [demo script](../06-pitch/demo-script.md), [submission checklist](../06-pitch/submission-checklist.md) | research |
| [evidence and red-team harness](../05-security/evidence-and-redteam-harness.md) | research |
| [Topic F tasks and mainnet plan](../04-build/topic-f-tasks-and-mainnet-plan.md), [agent model choice](../04-build/agent-model-choice.md), [licences and reuse](../04-build/licences-and-reuse.md) | research |
| [Topic F rivals](../03-research/topic-f-rivals.md) | research |

**Updated by the editor (content kept, additions only)**

- [README](../README.md): every new doc in the map and reading order; review log listed.
- [status and plan](../00-start-here/status-and-plan.md): countdown refreshed; spike test plan, mainnet decision rule, T-minus schedule, model decision, video slice and five new risks added.
- [open questions](../00-start-here/open-questions.md): O11-O15, T8-T13, X11-X17, P9-P12 added; email draft extended with questions 8-11 (not sent).
- [recommended changes](../02-product/recommended-changes.md): items 28-49 added, duplicates marked in the Rationale column.
- [one-page summary](../00-start-here/one-page-summary.md): one sentence on same-topic rivals.
- [how to win](../06-pitch/how-to-win.md): links to the demo script, rivals and checklist; Q&A rows 16-19.
- [decisions](decisions.md): proposed entries only.

`product-design.md` and `01-competition/` were not edited.
