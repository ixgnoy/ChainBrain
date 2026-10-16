# Neo-Kinetic redesign: plan for mobile/ and web/

15 Oct 2026, built 15-16 Oct. Status: **built on local `main` (not pushed)**; decisions in sections 6 and 7, what shipped in section 8. Sources: the Stitch export in `reference/frontend/stitch_chainbrain_ai_pocket_banking/` (gitignored): `neo_kinetic_fintech/DESIGN.md`, 11 `chainbrain_*` screens, 4 `*_vaultbank_style` screens and 5 VaultBank shots. Read alongside `docs/08-frontend/mobile.md`, `docs/08-frontend/web.md` and `docs/02-product/product-design.md`.

## 0. Where the repo stands

The brief's "before you start" notes are out of date:

- `main` is level with `origin/main`. Radar, Brain memory, the Brain tab, RadarCard and also **Sentinel** (cf65131, not in the brief) are already merged, so nothing needs merging.
- There are no `[dbg] … // DEBUG-TMP` lines in the tree.
- 69df2ee (SheetScroll worklets) and the header long-press fix are both in history.

Two facts from the code shape this plan:

| Fact | Where | Consequence |
| --- | --- | --- |
| A pocket's agent key is `immutable` | `contracts/src/Pocket.sol:23` | No existing pocket can be handed to another agent. "Pick a pocket" in the consent sheet can only be real for a pocket created for that agent (question Q3) |
| `revoke()` does not move money; `returnFunds()` is a separate owner tx | `Pocket.sol:109,114`, `shared/sim/chain.ts:111,132` | "Revoke freezes and returns funds" becomes one owner action that sends two transactions (revoke, then return), both shown with hashes. Revoke also has to decline that pocket's pending approvals, which it does not do today |
| There is no agent entity: every pocket uses `SIM_AGENT`, and events and approvals are keyed by pocket only | `shared/sim/world.ts:31`, `types.ts` | Multi-agent work starts in shared/sim (section 3) |
| The seeded history goes back 4 h 30 min on the phone and 7 h on the console | `shared/sim/seed.ts`, `autopilot.ts` | "+x% vs last week" cannot be computed today (Q2) |
| There are 10 scenes, not 9. Auto-play covers scenes 1–8; scenes 9 (Radar) and 10 (Sentinel) are chips only | `shared/sim/scenes.ts`, `mobile/src/lib/autoplay.ts` | Scenes 9 and 10 must keep working as chips. Auto-play stays at scenes 1–8 unless you want more |
| An approval waits 600 s and then times out | `world.ts:81` | "Approval valid 10 min · 09:35 left" is **real** and can count down |
| Radar scores run 0–10 (review at 5 or more, block at 8 or more) | `shared/sim/radar.ts:128` | "Seller check · Low risk 1/10" is **real** |
| The phone opens the approval sheet automatically for any pending ask | `mobile/src/store.tsx:396` | Outside agents' asks must go to the inbox, not pop a sheet in the middle of a demo (section 3) |

## 1. Design tokens (one source, both apps)

As DESIGN.md says, with the accessibility fixes below. Light only.

| Token | Hex | Use |
| --- | --- | --- |
| `canvas` | `#E2E5E8` | app background |
| `card` | `#FFFFFF` | cards, sheets, tab bar |
| `ink` | `#111215` | headlines, balances, black buttons, black hero card, active tab pill |
| `muted` | `#777781` | subtext and timestamps **on white only** (4.4:1) |
| `mutedOnCanvas` | `#5E5F68` | subtext on the grey canvas, where `#777781` drops to about 3.4:1 |
| `line` | `#D3D3D1` | dividers, disabled, empty bar fill |
| `tileStroke` | `#ECEFEF` | level-2 tiles inside cards |
| `vermillion` | `#F04E23` | primary CTA fill, alerts, refusals, active pocket accent, chart highlight |
| `vermillionInk` | `#B32A00` | vermillion **text** under 18 px (DESIGN.md's own `secondary`; `#F04E23` on white is only 3.6:1) |
| `vermillionSoft` | `#FFDBD2` | refusal and alert pill backgrounds (DESIGN.md `secondary-fixed`) |
| `blue` | `#9DCAFF` | utility tile ("Connect"), secondary card tier, category badges |
| `blueInk` | `#124977` | text on light-blue surfaces |
| `green` | `#22C55E` | positive **dots, icons and fills only**; positive text stays in ink next to a green dot (green text on white is 2.3:1) |
| hatch | 45°, 2 px stroke, 4 px pitch, ink or `line` | chart fill, frozen cards, empty progress |

- **Type:** Plus Jakarta Sans at 400, 500, 600, 700 and **800** (add `PlusJakartaSans_800ExtraBold`). The scale is DESIGN.md's (`display-lg` 40/48 −0.04em down to `label-sm` 11/14). The currency symbol is set at 75 % size. **Fraunces is removed** everywhere.
- **Radii:** cards 24 · tiles 16 · pocket cards 20 · avatars 14 (squircle) · pills full.
- **Shadows:**
  - Level 1: `0 4px 20px -2px rgba(17,18,21,.04)` plus a hairline `rgba(17,18,21,.04)`.
  - Level 3 (fanned cards, sheets): `0 12px 32px -4px rgba(17,18,21,.16)`.
  - No glow, no blur, no gradients.
- **Spacing:** margin 16 · card gap 12–16 · tile gap 8–12 (8-pt grid). The phone currently uses 20 px gutters with inline numbers; it gets a real `space` scale.
- **Where the tokens live:**
  - `mobile/src/tokens.ts` (rewritten; `tailwind.config.js` stays in step).
  - `web/src/index.css` `@theme` (rewritten).
  - Both copy one table in `docs/08-frontend/design-system.md`. A small test asserts the two files carry the same hex values.
- **Contrast exception:** white 15/800 on `#F04E23` is 3.6:1. It meets the 3:1 rule for UI components but not 4.5:1 for body text. DESIGN.md asks for exactly this pairing, so I keep it for pill CTAs only and use black CTAs where the label is long.

## 2. Screen map: Stitch to code

Legend:
- **Keep:** content that is real and is redesigned.
- **New:** new UI or data.
- **Drop:** invented in Stitch and removed.
- **Real:** a Stitch number made true from the store.

### Global chrome (phone)

- **Header** (`chainbrain_home`):
  - Avatar opens Settings (keep). Test-network chip (keep: "Test network" on built-in and the local fork, "Base Sepolia" on a real server; never "Arbitrum").
  - The bell gets a count badge and opens the **Approvals inbox** (new route).
- **Tab bar:**
  - A floating white pill bar. The active tab is a black pill with its icon and label, and that pill slides between tabs (spring), as in `*_vaultbank_style`. Inactive tabs show the icon only.
  - **This replaces the Liquid Glass bar** (`ui/glass/*`). Glass reads as "AI-looking" against this flat system, and the Stitch bar is solid.
  - Finger scrubbing and minimize-on-scroll stay. Tab set: Q1.
- **Sheets:** the existing Reanimated `Sheet` and `SheetScroll` get a white 24-radius top, a grabber, the level-3 shadow and a 40 % ink scrim. The physics stay.

### Phone screens

| Stitch screen | Maps to | Keep / New | Drop (fake) → or made Real | Motion |
| --- | --- | --- | --- | --- |
| **Intro** (`chainbrain_intro` + vaultbank intro) | `src/components/Intro.tsx` | 3 pages, Skip, about 7 s auto-advance. Big `display-lg` "Give your AI a pocket, not your wallet." Fanned deck of 3 cards (black, vermillion, blue) over a hatch panel. Three-point list (Claude/ChatGPT/built-in, contract-enforced, worst case = pocket balance). Vermillion "Next" / "Get started" pill. | Drop "Claude 3.7 Pocket", "Multi-use virtual", fake PANs/expiry and "v1.2.0". Card faces show the seeded pockets' real names and short numbers. "Zero real financial risk on Sepolia" → "Test network · no real money". | Cards fan in from a stack (−8°, −2°, +6°) with a stagger. The deck parallaxes with the pager. The page indicator pill stretches. |
| **Home** (`chainbrain_home`, `home_vaultbank_style`) | `(tabs)/index.tsx`, `PocketStack.tsx`, `PocketFace.tsx`, `CardFlight.tsx` | 1) Agent pockets total (Real: sum of balances) and main wallet + "Fund" (Real: `balances.usdc`). 2) Three tiles: Add money, New pocket, **Connect** (blue; hidden on a real server). 3) **Fanned pocket deck** (below). 4) Spend card: hatch area chart (Q2). 5) Recent activity rows with an **agent chip** (ChainBrain / Claude / ChatGPT) and plain status pills (Paid, Co-signed by you, Refused, Blocked). | Drop "Live Sync" unless the console relay is actually linked; then it says "Linked to console" with the time of the last push. Drop "Block #194821" from rows (hashes stay in the receipt / explorer sheet). Drop "+12.5 % vs last week" unless Q2 seeds a week. "Daily Agent Burn" → Real: today's settled payments, labelled "Spent today". Drop recipients, Send/Receive/Invest, US$24,850 and photos. | Balance digits tick (`RollingNumber`). Chart draws in left to right (stroke dash + hatch clip, 600 ms). Rows stagger. Press-scale 0.98. |
| Pocket deck (component) | rewrite `PocketStack.tsx`, `PocketFace.tsx`, keep `CardFlight.tsx` | 3–4 cards fanned −8° to +6°, colour by slot (black, vermillion, blue, white-hatch). Front card: name, balance (display), short pocket number (Real: address tail `•••• C3A5`), "Valid until 23:59" (Real: `expiresAt`), cap / ask-above chips, agent logo chip. "Tap a card to bring it to the front". | Revoked or frozen = white-hatch face with a lock (replaces the grey frost lines). | Tap a back card: it lifts, rotates to 0° and slides to the front (spring `snappy`, light haptic). The others re-fan. Tap the front card: the measured overlay flight into pocket detail (existing `cardFlight` store; Expo Go has no shared-element transitions). Horizontal drag scrubs through the deck. |
| **Agents** (`chainbrain_agents`) | **new** route (tab or stack, Q1) + `components/AgentCard.tsx` | 1) Title "Connected agents", "N active" chip (Real). 2) Vermillion "Connect an agent" pill. 3) One card per agent (ChainBrain built-in, Claude, ChatGPT): logo, name, "Built in" / "Connected 2 d ago" (Real: connect time), each pocket it holds (name, balance), spent-of-funded bar (Real), status "Active 3 min ago" / "Idle" (Real: last event), allowed sellers. 4) Buttons: "Chat" for ChainBrain, "Manage" for the others. 5) "Requests today: N" (Real: count of the agent's tool calls today). | Drop "Isolated Enclave Policy STRICT", "Zero-Knowledge Guardrails", "Key auto-renews in 4d", "Ephemeral Sub-Key", model badges ("v3.5", "GPT-4o", "Claude 3.5 Sonnet"), "Sub-wallet registry", "Allowance total" (→ Real "In agent pockets US$x"). Swap "Revoke All" for "Stop everything": hold-to-confirm, revokes and returns every pocket (Real, composite). | Cards rise in a stagger. The bar fills from 0 on mount. |
| **Connect** (`chainbrain_connect_agent`) | **new** `app/connect.tsx` (+ consent sheet `components/ConsentSheet.tsx`) | Step 1: a pairing link with Copy, a QR code of the same link (`react-native-qrcode-svg` or an SVG QR from a tiny pure-TS encoder; no new native module), and two rows: "For Claude" / "For ChatGPT" with one line each. Step 2: the consent sheet "Claude wants to use a pocket": choose or create a pocket (Q3), can / can't lists (static truth from the contract rules), Allow / Deny. | Drop "Agent Sandbox V2.4", "Terminal Auto-Pair", "Smart keys auto-expire in 30 days or after 100 transactions", "Allow & Issue Smart Key" (→ "Allow"). On the built-in network the simulated agent "opens" the link a moment after Copy or Show QR, and the consent sheet appears. On a real server the whole Connect entry is hidden (decision 4). | Steps cross-fade. Copy → check-mark morph + light haptic. The consent sheet springs up. The selected pocket row gets a black ring. |
| **Agent detail** (`chainbrain_agent_detail_claude`) | **new** `app/agent/[id].tsx` | 1) Header card: logo, name, "Connected 2 days ago" (Real). 2) Assigned pocket(s) as a blue hatch card: name, balance, cap, ask-above, ACTIVE / FROZEN / REVOKED (Real). 3) "Spent today" with a hatch progress bar (Real: payments today ÷ balance at start of day). 4) Activity ledger for this agent: asked to pay / paid / quote / searched / refused (Real: events filtered by agent, "View proof" opens ExplorerSheet). 5) Black "Give another pocket", soft-vermillion "Disconnect Claude" with the line "Stops the agent. Money stays in the pocket." For ChainBrain, this page also holds Brain if Q1 picks that. | Drop "Daily Spend Allocation" (no daily cap exists; → "Spent today of US$x"), "Durian global logistics summary request" wording from Stitch (use the real item names). | The ledger reveals in a stagger. Disconnect → the card desaturates to hatch, Warning haptic. |
| **Chat** (`chainbrain_agent_chat` + vaultbank chat) | `(tabs)/agent.tsx` (or a pushed route, Q1) + EventCard family | 1) Header: agent avatar, name, "Pocket: Research data · Ready · US$7.85 left" (Real), ⋯ menu (pocket picker, revoke). 2) Black user bubbles, white agent cards with the "CHAINBRAIN" eyebrow, one-tap answer pills (vermillion soft / blue). 3) Paid card with item, proof row (opens explorer sheet) and "Pocket: US$7.85 left". 4) Refused card with "Why was this blocked?" disclosure. 5) Injection card (dark grey card, white shield). 6) Composer pill with mic ("Speak your rules" where it exists) and black send disc. 7) An inline approval card ("Approve US$1.50 to DataPro", slide to co-sign) only when the approval sheet is dismissed. | Drop "Block #194,821 · SEPOLIA TESTNET" divider (→ "Today" date divider). Drop "Smart Match", "Market query planner" labels and the gradient bar on the paid card. Drop "+12.5 % vs single tx limit", "Policy Rule #4" (→ real "Above your ask-me limit US$1.00"). "Daily cap utilization" → Real "Spent today / pocket balance" only. | Steps fade + 6 pt rise. The paid card's check draws. A refusal shakes once with an Error haptic. A calm three-dot working indicator. Keyboard riding stays iOS-only. |
| **Approve payment** (`chainbrain_approve_payment`) | `components/ApprovalSheet.tsx`, `ui/SlideToConfirm.tsx` | 1) Agent avatar with badge, "Claude asks to pay" (Real: agent name), `display` "US$1.50 to DataPro". 2) Network chip. 3) Fact rows: Item, Pocket (name + short number), Policy ("Above your US$1.00 ask-me limit", Real), Seller check (Radar "Low risk · 1/10", Real), Expires ("09:35 left", Real countdown). 4) **The agent's note** in a visibly different block: grey hatch-edged card, eyebrow "AGENT'S NOTE · NOT CHECKED", italic text in quotes. The wallet-checked facts sit above it in a white card with check icons. 5) Black slide-to-approve track with a vermillion thumb, "Slide to approve US$1.50". 6) "Decline". 7) "Paid from pocket 0x7F…C3A5 with your co-signature". | Drop "Autonomous agent · Co-sign needed" duplication, "Sepolia Arbitrum Testnet", sparkle icon on "AI-written". | Spring sheet. The thumb tracks the finger 1:1, selection ticks every 25 %, commit at 90 % → Rigid, then the track fills ink → check draws → Success haptic → sheet settles out. Error shake on failure. |
| **Approvals inbox** (`chainbrain_approvals_inbox`) | **new** `app/approvals.tsx` (bell) | 1) "N waiting" + oldest countdown (Real). 2) Pending cards: agent logo + name, pocket chip, requested amount, policy trigger, seller, item, the agent's note in the "not checked" style, Decline / Co-sign (Co-sign opens the approval sheet). 3) "Approved in 30 days" tile → Real: count and sum of co-signed payments in the store (says "since <first event>" if history is shorter). 4) Recent decisions: co-signed / declined / timed out (Real, from approval statuses). | Drop "Auth multi-sig queue", "Node #04A", "Pocket remaining US$24.50 (Cap $1.00/run)" (→ Real pocket balance and cap), "Policy limits: Strict" tile, "Multi-agent spending limits" link (no such feature), "Smart contract rules guarantee…" footer (→ one honest line: "The pocket contract checks every rule again at payment time."). | Cards enter with a stagger. Swipe a row to decline (stretch goal, only if it stays 60 fps). The countdown ticks once a second on the UI thread. |
| **Pocket detail** (`chainbrain_pocket_detail` + vaultbank transactions) | `app/pocket/[id].tsx`, `WorstCase.tsx` | 1) Blue hatch hero card: name, balance / funded (Real), progress, agent row ("ChainBrain agent" with logo; no "Change" link because the agent is immutable), short number, "Expires 23:59" (Real). 2) Fact chips (Cap, Ask above, Valid until; Cap and Ask stay editable). 3) Tiles: Add funds, Return funds, **Revoke pocket** (soft vermillion). 4) Worst-case card: "If the agent is hijacked, the most you can lose is US$7.85, only to DataLite and DataPro. Main wallet exposure US$0.00" + hatch bar Spent / Remaining (Real). 5) Spend-by-day hatch bars with the seller split stacked on the active day (Real, from payments; vaultbank "Bars"). 6) Allowed sellers with switches (Real, owner tx). Blocked sellers struck through. 7) History with hashes. | Drop "ERC-4337 Sub-Pocket" (it is ERC-1271), "100 % Secure", "Sandbox isolated containment", "Add seller contract address" (no free-form addresses; sellers come from the catalogue), "Untrusted domain" (→ Real reason: "Not on your list" or Radar). | Arrives through the card flight. Bars rise in a stagger, then the tooltip pops. Hold-to-revoke fills 1.2 s with ticks. |
| **Revoked pocket** (`chainbrain_revoked_pocket`) | `app/pocket/[id].tsx` revoked state + `ActionSheet.tsx` | 1) Banner "Pocket revoked" (soft vermillion). 2) White-hatch frozen card: name, short number, "REVOKED", **"US$5.00 returned to your main wallet"** (Real: from the return tx). 3) "Agent disconnected from this pocket · Claude can no longer pay from it". 4) Audit trail from real events: revoked (tx), return (tx), the refused attempt that followed (if any), created (tx). 5) Download the pocket's audit log (JSON of its real events and txs, via the share sheet). | Drop "Trapped pocket funds" and the separate "Return" step (revoke now returns), "Circuit broken", "Frozen protocol · Sepolia #194,830", "Keypair discarded", "Zero-gas sweep sponsored by VaultBank Relayer", "100 % Guaranteed", "Exp. 07/29". | Revoke: the card flips to the hatch face, the balance counts down to US$0.00 while the main wallet ticks up, Warning haptic. |
| **Radar alert** (`chainbrain_radar_alert`) | **new** `app/radar/[id].tsx`, opened from `RadarAlertCard` / `RadarActivityRow` (existing data in `shared/sim/radar.ts`) | 1) Vermillion header card: "DataPro is blocked for all your pockets" (Real if Radar's block is world-wide, which it is: labels are per world), score `9/10` (Real). 2) Diagnosis sentence from `narrate()` (Real). 3) Flow trace from `trailOf()`: source → seller → your pockets, with the real short addresses and share (Real). 4) Affected agents & pockets: the pockets that allow that seller, with any approval that was waiting (Real). 5) Actions: "Keep blocked" (closes), "Remove from allowed sellers" (owner `setSeller` tx, Real). | Drop "Critical level" wording beyond the score, "#RADAR-8921", "Arbitrum", "Heuristic engine active", "Request false-positive forensic re-check", "dual biometric authorization", "Exploit Drainer 0x9e" names that the label book does not hold, block numbers. | The trail draws node by node (stroke draw 150 ms each). The score bar fills. Error haptic on open. |
| Brain (no Stitch screen) | `(tabs)/brain.tsx` | Restyled in the kit: stat tiles, sections, ScoreBar as a hatch meter. Placement per Q1. | — | Existing. |
| Activity (vaultbank transactions for craft) | `(tabs)/activity.tsx` | Underline filter tabs (All, Paid, Refused, Needs you) with a sliding 2 px bar. Day-grouped rows with agent chips. | — | The bar slides on `pill`. |
| Settings | `(tabs)/settings.tsx` | Grouped white cards. "Custom server" stays under Advanced (memory: demo mode default, subtle switch). | — | — |
| Create wizard (no Stitch screen) | `app/create.tsx` | Same 7 steps in the kit. It takes `?agent=` so "Create a new pocket for Claude" pre-selects the holder. | — | Existing. |

### Web console (judges' dashboard)

There is no Stitch screen for it. The same tokens and kit carry over to `web/src/index.css` and `seller/ui.tsx` / `console/kit.tsx`:

- Canvas `#E2E5E8`, white 24-radius cards, ink headings in Plus Jakarta 800, a vermillion primary, the blue utility pill.
- Hatch for empty and frozen states and for `SegmentBar` / `Tracker`.
- The checks-path gates restyled: a passed gate is ink, the refusing gate is vermillion with its reason code pill.

Per tab:
- **Live:** an agent chip on every trace turn. The pocket column gets the blue hatch card.
- **Presenter:** the docked scorecard as tiles.
- **Arena:** cards with hatch verdict bands.
- **Evidence, Explorer:** tables restyled only.
- **New, small:** an "Agents" strip on Live and Pockets: each pocket's holder (ChainBrain / Claude / ChatGPT), read from the stamped events.

What must not change:
- Every route (`#live`, `#present`, `#judges/…`, `#explorer/…`, `?tx=`).
- The presenter keys → ← Space/Enter R E ? Esc and their popover.
- Every `data-testid`, ARIA name and visible string that `devstack/e2e/e2e.cjs` reads (listed in the web map: `pocket-balance`, `checks-path`, `gate-*[data-state]`, `arena-*`, `evidence-*`, `navigation "Main"`, "Worst case", "Reverted on-chain", `Test network .*no real money`, and the absence of `demo|simulat|mock`, "Base Sepolia" and "basescan" on the built-in network).
- No horizontal scroll at 390 px.

Hard-coded colours to migrate:
- `App.tsx:41-44` logo, `App.tsx:82`, `Stepper.tsx:99,126`.
- `Settings.tsx:37`, `seller/ui.tsx:89,126`.
- `public/logo.svg`.

## 3. Multi-agent model in shared/sim

1. **Types** (`types.ts`): `SimAgent { id: "chainbrain" | "claude" | "chatgpt"; name; kind: "builtin" | "outside"; address: Hex; connectedAt?: number; disconnectedAt?: number }`. `SimConfig.agent` stays: it means the built-in agent's key.
2. **World** (`world.ts`):
   - An agent registry with `agents()`, `agentOf(pocket)` (via the pocket's immutable `agent`), `connect(id)` and `disconnect(id)`.
   - `disconnect` declines that agent's pending approvals, stops its runs and leaves the money in place.
   - `publish()` stamps `agent` on every event that has a pocket.
   - Payments are submitted by the pocket's own agent (not `SIM_AGENT`), so the explorer and receipts name the right agent.
   - A new `revokeAndReturn(pocket)` helper (owner: revoke, then returnFunds, then decline the pocket's pending approvals).
3. **Outside agents act through the same tools**, not through chat. A small `outside.ts` runs scripted tool calls (`search_sellers`, `get_quote`, `ask_owner`, `pay`) in Claude's and ChatGPT's voices, so their asks, refusals and payments go through the same pocket rules, Radar and Sentinel as the built-in agent.
4. **Seed** (`seed.ts`):
   - Research data and One purchase stay with the built-in agent (scenes 1–8 and auto-play depend on them).
   - New: **Claude** holds "Market news" (US$5, DataLite + DataPro, cap US$2, ask above US$0.50), with a few past purchases and one refusal.
   - New: **ChatGPT** holds "Trade quotes" (US$3, DataLite only, cap US$0.50, never ask), with a couple of purchases.
   - History is seeded oldest first (`world.past`). The main wallet total and `builtin.cjs`'s expectations (2 pockets, US$54.80) are updated to the new seed.
5. **Liveness:**
   - After the intro, Claude sends **one** real co-sign request (DataPro US$1.50 on Market news). It lands in the inbox and the bell badge; it does not pop the sheet, so it never interrupts a scene.
   - After a Connect, the newly connected agent makes one scripted first run.
   - There is no endless background loop on the phone, which keeps auto-play and the e2e deterministic.
   - The web console's autopilot can use the outside agents in its background traffic.
6. **Real server:** `agents()` returns only the built-in agent. Connect, Claude and ChatGPT never appear (decision 4).
7. **Tests:** world tests for connect / disconnect (money stays, pending declined), revoke-and-return (both txs, approvals declined), event stamping, outside agents hitting the same refusals, and the new seed. `builtin.cjs` gets checks for Agents, Connect → consent → Allow, the inbox, and an outside agent's co-sign.

## 4. Kit (slice 2), shared names in both apps

Shared parts:
- `PillButton` (vermillion / black / soft; 52 px; press 0.98)
- `Tile` (16-radius quick action; white / blue)
- `Card` (24-radius, level 1)
- `Hatch` (SVG pattern; ink / line; animated reveal)
- `Chip` (network, status, agent)
- `AgentAvatar` (logo or monogram squircle)
- `StatusPill`
- `Money` (75 % currency, −0.04em)
- `HatchBar` (progress)
- `HatchChart` (area + bars, draw-in)

Phone only:
- `PillTabBar` (sliding black pill)
- `Sheet` (restyle)
- `SlideToConfirm` (black track, vermillion thumb)
- `HoldToConfirm`
- `UnderlineTabs`
- `FactRow`
- `AgentNote` (the "not checked" block)

Web only: the same set as Tailwind components in `web/src/ui/` (and `seller/ui.tsx` re-exports for compatibility).

Rules for the animation code:
- Animated styles always go on `Animated.*` components.
- Worklets capture only shared values.
- Haptics go through `scheduleOnRN`.
- Reduce Motion turns everything into 180 ms fades.
- No `experimental_backgroundImage` or SVG gradients.

## 5. Build order (one commit each, not pushed)

1. Tokens + fonts (both apps, the MASTER.md and motion.md rewrite, the token parity test).
2. Kit components.
3. Home + pocket deck.
4. Agents, Connect, Agent detail + shared/sim agents.
5. Approval sheet + Approvals inbox.
6. Pocket detail + Revoked (revoke-and-return).
7. Chat.
8. Radar alert.
9. Intro.
10. Web console.

Docs (`mobile.md`, `web.md`, screenshots) are updated at the end.

**After every slice:**
- Phone: `npm test`, `npm run typecheck`, `npx expo-doctor`.
- Web: `pnpm test`, `pnpm build`.
- Sim: `node --import tsx --test ../shared/sim/*.test.ts`.
- End to end: `node devstack/e2e/builtin.cjs`.
- A look at 390 px in the browser preview (and the console on desktop).
- `autoplayTargets.ts` updated whenever a target moves.
- Accessibility labels kept.

**Expo Go:** I can only check the web export and the iOS bundle here. Every slice that adds gestures gets a short "please try on your iPhone" list.

## 6. Decisions (15 Oct, answers to the plan's questions)

**Q1. Tabs: Home · Agents · Brain · Activity · Settings** (Claude's call, as asked).
- The active tab is a black pill with icon and label; the others are icon only, so five fit at 390 px.
- Agents replaces the chat tab, as in Stitch. Chat opens from the ChainBrain card ("Chat"), from an "Ask" pill in the Home header, and from Agent detail.
- Brain keeps its own tab because it is the judge-facing showcase (all nine capabilities).
- The pending badge moves to the bell, which opens the Approvals inbox.
- Auto-play gets a `home.ask` / `agents.chat` target to reach chat, and its long-press stays on the chat header.

**Q2. History: seed two weeks.**
- The built-in network seeds 14 days of purchases, oldest first, through the same pocket rules, for all three agents.
- The weekly hatch chart, "Spent this week" and "vs last week" are computed from the store.
- Pocket expiries in the seed move later so that backdated pockets are valid.
- `builtin.cjs` expectations (pocket count, main wallet total) follow the new seed.

**Q3. Consent: create a new pocket.**
- The consent sheet offers "Create a pocket for Claude" with a prefilled preset, plus an optional "move US$x from <pocket>" (return, then fund).
- Existing pockets are listed as "Held by ChainBrain" and disabled.
- Pocket.sol is unchanged.

**Q4. Logos: the official files you supplied.**
- Copied from `reference/frontend/stitch_chainbrain_ai_pocket_banking/logo/` into `shared/brand/`:
  - `claude-spark.svg`: Claude Spark, one clay `#D97757` path.
  - `openai-blossom-black.svg` and `openai-blossom-white.svg`.
- Both apps render them from one module (`shared/brand/marks.ts`: viewBox and path data), unaltered: Claude in clay, the Blossom in black.
- They appear at avatar size on a white squircle next to the agent's name, never inside our own branding (OpenAI's brand rules: no recolouring, no endorsement implied, never more prominent than our mark).

## 7. Final alignment (15 Oct, before the overnight run)

- **Outside agents:** Claude and ChatGPT only. Gemini and Grok are not used.
- **No extra marking:** Claude and ChatGPT are treated like the rest of the built-in network, with no "preview" chip.
- **Auto-play:** scenes 1–8 play as now, then: Agents → connect Claude (consent, create a pocket, Allow) → co-sign Claude's request from the inbox → scene 9 (Radar) → scene 10 (Sentinel). It ends on the fanned deck.
- **Git:** one commit per slice on local `main`, not pushed.

## 8. What shipped (16 Oct, overnight run)

One commit per slice on local `main`:

| Commit | Slice |
| --- | --- |
| `9277bf0` | Tokens and fonts, both apps (Plus Jakarta 400-800, Fraunces removed); palette parity test; official marks in `shared/brand/` |
| `4771fb9` | Phone kit: pill tab bar, tiles, cards, hatch, agent marks, pill buttons, slide track, underline tabs, sheets |
| `698816b` | Built-in network: Claude and ChatGPT as connected agents, events and approvals name their agent, revoke-and-return, two weeks of seeded history |
| `0fc6d9e` | Web console restyle, every view and the kit (routes, shortcuts, test ids unchanged) |
| `663dc29` | Home and the fanned pocket deck, spend chart, store agents and approval focus |
| `b62c69f` | Agents tab, Agent detail, Connect + consent; chat moved to a pushed `/agent` |
| `3d52f25` | Approval sheet and Approvals inbox |
| `755a8b1` | Pocket page and Revoked; auto-play and e2e for the multi-agent flow; MASTER.md and motion.md rewritten; console names each pocket's agent |
| `b415180` | Chat |
| `df017e8` | Radar alert page |
| `bd77407` | Intro |
| `58eb9cd` | Polish: the exact approval opens everywhere |

Changes from the plan, and why:

- The multi-agent simulator came before Home (Home's agent chips and deck need it).
- Revoke now always returns the money in the same hold (two owner transactions), so scene 7's separate "return funds" step is gone; auto-play skips it safely.
- The chat's pocket picker lists only ChainBrain's pockets: a pocket keeps the agent it was made for.
- The approval sheet opens by itself only for the built-in agent; outside agents' requests wait in the inbox (bell count, blue strip on Home).
- "Stop everything" on the Agents tab was not built (Disconnect per agent and Revoke per pocket cover it without a one-tap kill of every pocket).
