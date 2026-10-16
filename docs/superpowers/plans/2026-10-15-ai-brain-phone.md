# AI brain on the phone: features 1–9, real (tracker)

Owner ask (15 Oct): "for 1 to 9, I want the UI of the mobile frontend able to show everything out, so user knows what happens exactly". Decision: build 6–9 for real (server + the phone's built-in network + phone UI), not UI-only.

Features (numbering from the investor summary):
1 Understands the request · 2 Plans and buys · 3 Adapts to refusals · 4 Resists manipulation · 5 Radar (counterparty screening)
6 Sentinel (watches the stream, on-chain freeze) · 7 Brain memory · 8 Speak your rules (proof card) · 9 Pre-flight (predict vs actual) · 10 Haggler (16 Oct, from the wow-ideas research)

For judges and the team, the features are described in [docs/ai-brain.md](../../ai-brain.md).

Rules for every phase: AI only tightens; seller text never reaches a free-text model; the sim (`shared/sim`) mirrors the server so the built-in network shows the same events; phone wording is plain, codes live under "Why".

## Phases and status

- [x] A. Radar core moved to `shared/sim/radar.ts` (one source for server + sim); sim emits `radar` events and COUNTERPARTY_* refusals; a drainer scene in the built-in network
- [x] A2. Phone: Radar card in the chat (score, verdict, plain narrative, path), approval sheet shows risk, Activity shows Radar alerts
- [x] B. Phone: "Brain" tab (built: Understood, Planned, Adapted, Resisted, Radar, Memory; Sentinel, Your rules and Pre-flight sections come with D–F), one place showing what the brain Understood (1), Planned (2, 9), Adapted (3), Blocked (4), Screened (5), Watches (6), Remembers (7), Your rules (8)
- [x] C. Memory: server per `2026-10-15-brain-memory.md`, sim mirror, phone memory card with Forget
- [x] D. Sentinel: Pocket.sol guardian freeze + tests, server rules + typed AI score, sim, phone feed + frozen state + unfreeze
- [x] E. Pre-flight: server `preflight` tool, sim, phone predicted-vs-actual on the trace and paid card, accuracy counter
- [x] F. Speak your rules: server compile endpoint + proof card, sim, phone create flow from one sentence

## Log
- 15 Oct: Radar built on the server (`server/src/radar/`), tests green. Phone deps not installed in the repo (`mobile/node_modules` missing): `npm ci` in `mobile/`.
- 15 Oct: Radar on phone + built-in network merged (PR #1, #2). Memory on server (Claude Haiku, forced tool with auto fallback) and built-in network (scripted reflection, same consolidate()); Brain tab; Forget tested in the browser build.
- 15 Oct: Sentinel: Pocket.sol freeze-only guardian (factory passes it to every pocket; owner-only unfreeze; POCKET_FROZEN), shared rules + typed questions + gate, server service (Jev when TYPESAFE_API_KEY, Claude Haiku stand-in otherwise, rules only without either), devstack/test deploy with an anvil guardian key, built-in network scene 10, phone cards/Unfreeze/Brain section/Activity. Real freeze verified on the anvil fork.
- 15 Oct: Pre-flight: every payment simulated first with eth_call of the exact transferWithAuthorization (server) or a dry run (built-in), then checked; 4/4 matched on the anvil fork. Speak your rules: two Claude readings merged stricter-wins (server), fixed parser (built-in/fallback), computed proof card, questions on the phone, fills the create form; owner still signs. Brain tab now shows all 9.
- 16 Oct: Demo stability (PR #7): the built-in network survives a reload or a crashed tab; auto-play on one pocket. Haggler (PR #8, #9): `shared/sim/haggle.ts` guards, `counter_offer` tool, sellers' `/offer` and `?deal=`, scene 11, HaggleCard, Brain "Negotiated a price down"; settled US$1.10 on the anvil fork. Auto-play of scenes 1-11 verified on an Android phone (Poco X3 Pro, Chrome), closing on the Brain tab: Pre-flight 9/9, Sentinel freeze, Radar 9/10. Docs: `docs/ai-brain.md`.
