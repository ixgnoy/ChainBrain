# Changelog
Last updated: 2026-10-20

## 2026-10-20 (demo video v4.1: the overnight work merged)

- **Merged:** the overnight branch `video-overnight`, as a fast-forward. Its report is [video/overnight/REPORT.md](../../video/overnight/REPORT.md).
- **Script v4.1:** every spoken claim now matches the submitted PDFs and the code.
  - Seven forbidden *attempts*, two of which are rule edits.
  - We *play* a fooled agent and use its key.
  - The agent *can* ask a question.
  - The sellers are test versions of Exa and CoinGecko.
  - Cancelling takes back what's left.
  - 462 tests *passed* on 19 Oct.
- **On screen:**
  - Two real hashes held full screen.
  - The judging rubric's own words on the attacks.
  - Larger disclaimers, kept clear of the subtitles.
  - Simplified Chinese subtitles, off by default until a team member checks them.
- **Audio and tools:**
  - The mix's true peak fixed: v4 measured −0.6 dBTP.
  - `tools/qc.py` checks the final MP4.
  - `tools/pace.py` predicts the runtime at a speaking pace.
  - The recording kit, teleprompter and `try-recordings.sh` are in `video/overnight/`.
- **After review:** u1 and r1 reworded, and the last line added as a tenth recording file. The runtime at 145 wpm is 4:49, or 4:56 with both on-camera clips.

## 2026-10-20 (demo video v4, "how it works")

- **Video v4 (4:46):** v3's AI Card story, plus a judge-facing overview. Storyboard and decisions: [video/STORYBOARD-v4.md](../../video/STORYBOARD-v4.md).
- **The X-ray (53 s):** right after the first payment, the same payment is replayed across one board: your phone, our server, the seller, FISCO BCOS.
  - It shows who holds which key, with the app's real co-sign screen.
  - It shows the server checks, with the app's Guarded panel.
  - A short comparison: many agent wallets check limits on the wallet company's server, while here the token asks the card.
  - The card's eight checks tick, the payment settles with a real hosted-chain hash, and the camera pulls back to the whole system.
  - Real logos sit on each box: Claude, OpenRouter, Hono, Exa, x402, FISCO BCOS, Solidity.
- **After "The card says no":**
  - "Why it held": eight layers, each attack shown where it was stopped; the two on-chain layers hold even if the server is taken over.
  - "If a key is stolen".
  - The HKMA's four principles for AI agents (Carmen Chu, 16 Oct 2026), mapped to ChainBrain.
- **Proof:** the numbers now match the submitted PDFs: 7 of 7 forbidden payments rejected on the hosted chain, 63 attacks with HK$0 lost, 462 tests.
- **Fixed:**
  - Eight places where the voice ran ahead of or behind the picture (cuts now follow the spoken words).
  - The "Let's break it." title, now centred.
- **Removed:** the "Built with" slide.
- **Added:** a team slide (matching 3:4 portraits), then an ending slide.
- **Wording:** 27 of 43 lines rewritten from 2025-2026 research on what reads as AI-written. Typed ticks, crosses, arrows and middle dots are replaced with Lucide icon badges.

## 2026-10-19 (demo video v3, "the AI Card")

- **Video v3 (3:33):** re-told around one USP: ChainBrain gives your AI its own card; the card's own smart contract sets the limits, and a second AI watches every payment and can only make the rules stricter. Storyboard and research: [video/STORYBOARD-v3.md](../../video/STORYBOARD-v3.md).
- **Opening:** the 4 May 2026 Morse-code wallet drain (about US$150,000, OECD AI Incidents Monitor), then Accenture's June 2026 survey: 74% would let AI handle their tasks, 9% would let it spend.
- **Flow:** hook → the AI Card → get one → use it → break it ("The card says no", with the real block 13 revert) → the watcher → "Stricter. Never looser." → proof (7 of 7 forbidden payments rejected on the hosted chain, 55 attacks with 0 through, 0 rule breaks in 128,000 calls) → built with → close with the team's photos. Each idea is shown once; "Why it held", the Judges scoreboard and the second "two safety nets" pass are gone.
- **Plain words:** negotiate (not haggle), approve, limit, rejected; phone shots are tagged "recorded on our test setup".
- **Pipeline:** `video/remotion/src/edit.json` + `video/tools/layout.py` lay out the edit on the 120 BPM grid from the voice's word timings; key music hits punch through the voice ducking (`video/tools/mix.py`); the Chinese name uses the system PingFang SC (no font download at render).

## 2026-10-19 (demo video v2)

- **Video v2 (4:04):** re-cut on a 120 BPM grid (one beat = 15 frames), with shorter shots, hard cuts that settle on motion, a gently tilted 3D phone and whip entrances at act changes.
  - **Pills and eyebrows:** replaced by plain captions.
- **New act, "Why it held" (52 s):** sells how ChainBrain works using only real material, with no code on screen. It shows:
  - the app's own screens (UI crops cut from the recordings by `video/tools/crops.py`);
  - third-party marks as small avatars beside the name, and the official FISCO BCOS and x402 logos on white plaques;
  - two real transaction pages from the hosted explorer: block 11 (success) and block 13 (the reverted forced transfer).
- **Problem section:** rebuilt the same way, showing the real wallet, cheques, card stack, Brain map and card.
- **Voice:** ElevenLabs `eleven_v4`, voice Sarah (`video/tts/eleven.py`).
  - The key goes in `video/.env`, which is git-ignored.
  - Lines are cached by what was sent.
  - Subtitle timing comes from the API's character timestamps.
  - Kokoro remains the offline fallback.
- **Score:** a 120 BPM hybrid trailer cue. Its hit points are derived from the voice's word timings (`video/tools/cues.py`).

## 2026-10-19 (demo video)

- **New:** `video/`, the 3:58 demo video for the submission (`video/out/InternationalAI-ChainBrain-DemoVideo.mp4`, git-ignored; rebuild with `sh video/build.sh`). Script and shot list are in [video/SCRIPT.md](../../video/SCRIPT.md); credits are in [video/CREDITS.md](../../video/CREDITS.md).
  - **Style:** dark keynote stage around real recordings.
  - **Phone:** the app on its built-in network, labelled on screen, filmed in one take of the app's own auto-play in the iOS Simulator.
  - **Console:** the Judges arena and the Brain page.
  - **Real chain:** the hosted explorer showing the 11 real FISCO transactions from `docs/evidence-fisco-railway.json`.
  - **Voice:** Kokoro `af_heart`, offline, with burned-in subtitles and a matching `.srt`.
  - **Score:** composed in code from CC0 orchestral samples, mastered to -14 LUFS.
- **Fixed (phone):** co-signing in demo mode. Since the 19 Oct signing guard, the phone checked that a card is the owner's by reading the real FISCO RPC. For a built-in network card that read fails, so every co-sign showed "Your phone refused to sign" (`GUARD_REFUSED`). On the built-in network the guard now reads the card's owner from the in-app chain (`mobile/src/lib/wallet.ts`).

## 2026-10-16 (docs layout)

- **Moved:** the design system into the docs: `design-system/chainbrain/MASTER.md` is now `docs/08-frontend/design-system.md`, and `design-system/chainbrain/pages/motion.md` is now `docs/08-frontend/motion.md`.
- **Renamed:** `docs/frontend/` to `docs/08-frontend/`, numbered like the other doc folders. Screenshots now land in `docs/08-frontend/screenshots/`.
- **Updated:** every link and code comment that named the old paths; the master index lists `08-frontend/`.

## 2026-10-16 (AI brain docs, haggler)

- **New:** [ai-brain.md](../ai-brain.md): the ten AI brain features (understands, plans and buys, adapts, resists, Radar, Sentinel, memory, Speak your rules, Pre-flight, haggler), the AI-only-tightens rule, the haggler's guards, the models and their fallbacks.
- **Haggler (PR #8, #9):** `counter_offer` tool; sellers' `POST /<seller>/<sku>/offer` and the deal price on `?deal=<id>`; reason codes `OFFER_NOT_LOWER`, `NEGOTIATION_ROUNDS_USED`, `NEGOTIATION_NOT_OFFERED`, `DEAL_ALREADY_AGREED`, `QUOTE_ALREADY_APPROVED`; scene 11 (DataPro US$1.50 to US$1.10).
- **Demo stability (PR #7):** the built-in network survives a reload or a crashed tab; auto-play runs scenes 1-11 and closes on the Brain tab.
- **Updated:** README (AI brain summary, scenes 1-11 table with the current sellers, test counts), technical document (seven tools, frozen state and guardian key, section 9 "The AI brain", test summary), security self-assessment (guardian tier, Sentinel freeze, Radar, haggler, AI only tightens), demo runbook (scenes 9-11, auto-play order), mobile.md (Brain tab, haggle card), one-page summary, docs index, AI brain tracker.
- **Checks run on 16 Oct (latest main):** contracts 24, server 76 (+6 skipped), web 81, phone 44, built-in network 40. Auto-play of scenes 1-11 also verified on an Android phone (Chrome).

## 2026-10-15 (built-in network, phone linked to console)

Docs updated for the last five code commits. Documentation only.

- **Built-in network:** both apps open on it every launch. `shared/sim` runs the wallet API, tool layer, scripted agent and Pocket.sol rules in-app, seeded with a lived-in owner (Research data US$10 pocket with earlier purchases, One purchase US$0.20 pocket, main wallet US$54.80). Scenes 1-8 work offline. It is for demos and offline use; its hashes are not on a public chain, so BaseScan links appear only on a real server.
- **Real server is opt-in:** phone Settings, Advanced, Custom server (`cb.source` in SecureStore); web gear, Settings, Custom server, or hidden `?server=<url>` / `?server=builtin` (localStorage `cb.source`, `cb.apiUrl`).
- **Removed:** the read-only offline fallback and its "Demo data" label on the phone.
- **Link:** `pnpm --dir devstack relay` (or `devstack start`, relay at `/dev/relay`) mirrors the phone's built-in network to the web console; Judges plant and force-transfer run on the phone's pockets.
- **Tests:** `devstack/e2e/builtin.cjs` (26 checks, no server); `devstack/e2e/e2e.cjs` now 45 checks, switching to the server via `cb.source=server` and `?server=`.
- **Files:** README.md, docs/frontend/README.md (now docs/08-frontend/), mobile.md, web.md, devstack/README.md.

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
