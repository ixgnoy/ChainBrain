# AI brain on the phone: features 1–9, real (tracker)

Owner ask (15 Oct): "for 1 to 9, I want the UI of the mobile frontend able to show everything out, so user knows what happens exactly". Decision: build 6–9 for real (server + the phone's built-in network + phone UI), not UI-only.

Features (numbering from the investor summary):
1 Understands the request · 2 Plans and buys · 3 Adapts to refusals · 4 Resists manipulation · 5 Radar (counterparty screening)
6 Sentinel (watches the stream, on-chain freeze) · 7 Brain memory · 8 Speak your rules (proof card) · 9 Pre-flight (predict vs actual)

Rules for every phase: AI only tightens; seller text never reaches a free-text model; the sim (`shared/sim`) mirrors the server so the built-in network shows the same events; phone wording is plain, codes live under "Why".

## Phases and status

- [x] A. Radar core moved to `shared/sim/radar.ts` (one source for server + sim); sim emits `radar` events and COUNTERPARTY_* refusals; a drainer scene in the built-in network
- [x] A2. Phone: Radar card in the chat (score, verdict, plain narrative, path), approval sheet shows risk, Activity shows Radar alerts
- [ ] B. Phone: "Brain" tab, one place showing what the brain Understood (1), Planned (2, 9), Adapted (3), Blocked (4), Screened (5), Watches (6), Remembers (7), Your rules (8)
- [ ] C. Memory: server per `2026-10-15-brain-memory.md`, sim mirror, phone memory card with Forget
- [ ] D. Sentinel: Pocket.sol guardian freeze + tests, server rules + typed AI score, sim, phone feed + frozen state + unfreeze
- [ ] E. Pre-flight: server `preflight` tool, sim, phone predicted-vs-actual on the trace and paid card, accuracy counter
- [ ] F. Speak your rules: server compile endpoint + proof card, sim, phone create flow from one sentence

## Log
- 15 Oct: Radar built on the server (`server/src/radar/`), tests green. Phone deps not installed in the repo (`mobile/node_modules` missing): `npm ci` in `mobile/`.
