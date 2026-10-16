# ChainBrain design system v5: Neo-Kinetic Fintech after VaultBank

Source of truth for `mobile/` (owner app) and `web/` (network console). v4 (15-16 Oct 2026) replaces v3 "clean bank" (deep teal + navy, Fraunces titles). It follows the Stitch "Neo-Kinetic Fintech" spec exactly: `reference/frontend/stitch_chainbrain_ai_pocket_banking/neo_kinetic_fintech/DESIGN.md` (gitignored). Screens come from the `chainbrain_*` Stitch exports; the craft (hatch charts, black hero card, pill tab bar, fanned deck, type scale) from the `*_vaultbank_style` exports. Plan and screen map: `docs/08-frontend/neo-kinetic-plan.md`. Movement and haptics: [motion.md](motion.md), which overrides this file for motion.

v5 (16 Oct 2026, spec `docs/08-frontend/vaultbank-round.md`) takes the VaultBank shots (`reference/.../image.png_1` to `_5`) further: Clash Display + General Sans, a warm paper-grey canvas, tighter radii and rectangular buttons, 2.5D pocket cards with VaultBank's anatomy, the ask dock and cheque for agent approvals, and a four-tile brand mark.

## Principles

- **High contrast, editorial.** Black ink on white cards over a warm paper-grey canvas. Depth from white on grey and a hairline; real shadow only on what floats (the deck, the ask dock, sheets).
- **Two accents, used on purpose.** Vermillion for momentum and alerts (the one primary CTA on a screen, refusals, the active day, the deck's orange card). Powder blue for utility (Connect, needs-you, the blue pocket card). Everything else is black, white and greys.
- **Hatch, not fills.** 45° stripes stand in for chart fills, empty tracks, frozen cards and quiet panels.
- **Physical cards.** Pockets are 2.5D cards (thickness, a Skia material, they lean with the phone) in a fanned deck that you deal, swipe in 3D and fly.
- **Approvals come to you, never block you.** An outside agent's ask docks above the tab bar on every tab and unfolds into a cheque; only ChainBrain's own asks open by themselves.
- **Truth over decoration.** Every number comes from the pocket contracts or the network's events. A metric that can't be computed is not shown ("vs last week" appears only when the history covers last week). No fake block numbers, model badges, "100 % secure", or explorer links for hashes that are not on a public chain.
- **Not AI-looking.** No gradients (except the hatch stripes and the card material's light and sheen), glow, blur, glass, purple, sparkles or orbs. Light only.

## Colour (one palette, both apps)

Defined in `mobile/src/tokens.ts` (`c`) and `web/src/index.css` (`@theme`, `--color-*`); `mobile/src/lib/tokens.test.ts` keeps them identical.

| Token | Hex | Use |
| --- | --- | --- |
| `canvas` | `#E7E6E2` | app background (level 0), VaultBank's warm paper grey |
| `card` | `#FFFFFF` | cards, sheets, tab bar (level 1) |
| `fill` / `tile` | `#F2F1EE` / `#F5F4F1` | inner panels, inputs, quiet chips |
| `tileStroke` | `#EBEAE6` | level-2 tile stroke |
| `line` | `#D3D3D1` | dividers, disabled, empty bar tracks, hatch on white |
| `ink` | `#111215` | headlines, figures, black buttons, the active tab pill |
| `ink2` | `#3A3B41` | secondary text |
| `muted` | `#777781` | metadata on white (4.4:1) |
| `mutedOnCanvas` | `#5E5F68` | metadata on the canvas (5.1:1; #777781 drops below 4.5:1 there) |
| `vermillion` | `#F04E23` | primary CTA fill, alerts, active day, the orange card |
| `vermillionInk` | `#B32A00` | vermillion text under 18 px (#F04E23 on white is 3.6:1) |
| `vermillionSoft` | `#FFDBD2` | refusal / revoke panels and pills |
| `blue` | `#9DCAFF` | utility tile (Connect), needs-you strip, the blue card |
| `blueInk` / `blueSoft` | `#124977` / `#D1E4FF` | text on blue; needs-you pills |
| `green` | `#22C55E` | positive dots, icons, fills only |
| `greenInk` / `greenSoft` | `#15803D` / `#DCFCE7` | positive text and pills (green text on white is 2.3:1) |

Older role names stay as aliases so every screen follows: `accent` = ink, `negative` = vermillionInk, `warning` = blueInk, `positive` = greenInk.

Contrast note: white 15/800 on `#F04E23` is 3.6:1, which meets 3:1 for UI components and large text but not 4.5:1. DESIGN.md asks for it, so it is used on pill CTAs only; long labels use the black CTA.

## Type

Clash Display (Medium 500, Semibold 600, Bold 700) for what you read first: page titles, section headers, card titles, balances and figures, pocket numbers. General Sans (400-700) for everything else. Both from Fontshare (Indian Type Foundry, ITF Free Font License): embedding is allowed, redistributing the files is not, so the phone fetches them on `npm install` (`mobile/scripts/fonts.sh`, `assets/fonts` is git-ignored) and the console loads Fontshare's CSS API. Scale (`mobile/src/ui/Text.tsx`, `Money.tsx`; web `.display`, `.figure`, `.font-extrabold`):

| Variant | Size / line | Face | Tracking | Use |
| --- | --- | --- | --- | --- |
| `display` | 28/34 | Clash Semibold | -0.015em | page titles |
| `balance` | 40/48 | Clash Medium | -0.02em | totals |
| `amount` | 28/34 (Money 32) | Clash Medium | -0.015em | card balances, the cheque amount |
| `section` | 21/26 | Clash Semibold | -0.01em | section headers, no colon |
| `head` | 17/22 | Clash Semibold | 0 | card titles, rule tiles |
| `row` / `body` | 16/22, 16/24 | General Sans Semibold / Medium | -0.005em | list titles, body |
| `sub` | 14/20 | General Sans Medium | 0 | secondary |
| `cap` | 12/16 | General Sans Medium | +0.01em | metadata |
| `label` | 15/20 | General Sans Semibold | 0 | buttons |
| `tab` (eyebrow) | 11/14 | General Sans Semibold | +0.03em, uppercase in eyebrows | eyebrows, tab labels |
| `mono` | 13/16 | Clash Semibold | +0.05em | pocket numbers `*C3A5` (22-26 on cards) |

Figures: the currency symbol is set at 75 % on the same baseline (`Money`, web `.figure .cur`). Clash has proportional figures, so each rolling-digit reel sizes itself to its digit (`RollingNumber`).

## Shape, space, depth

- Radii (VaultBank-tight): cards 20 · tiles 16 · buttons and inputs 14 (rectangles) · pocket cards 18 · avatars 14 at 48 px (squircle) · sheets 28 · pills only for chips, status labels and the tab bar.
- Spacing: 8-pt grid; margins 16 (phone) / 32 (web); card gap 12-16; tile gap 8-12.
- Level 1 (cards): a whisper of shadow (`0 2px 8px rgba(17,18,21,.03)`) + 1 px hairline `rgba(17,18,21,.04-.06)`.
- Level 3 (fanned cards, sheets, tab bar, value tags): `0 12px 32px -4px rgba(17,18,21,.16)`.
- Hatch: 45°, 2 px stroke on a 4-6 px pitch (`Hatch`, `HatchBar`, `HatchPanel`; web `.hatch`).

## Components (phone `mobile/src/ui`, web `web/src/seller/ui.tsx` + `console/kit.tsx`)

- **Button** (`Button`, 52 px, radius 14, VaultBank's rectangle): `primary` black, `vermillion` (one per screen), `secondary` white with stroke, `danger` soft vermillion, `blue`, `text`. Press scale 0.98.
- **Tile** (quick action, 16 radius): a big thin-line icon (28 pt, 1.4 stroke, no disc) top left, the label under it; white with stroke; blue for the utility action; soft vermillion for Revoke. **Rule tile** (pocket page): VaultBank's category tile, a coloured dot, the figure in Clash, the meaning under it, a pencil when editable.
- **Card** (level 1), **ListCard** with transaction rows (40 px squircle, bold title, muted line, amount and a status pill).
- **StatusPill**: neutral (Paid), blue (needs you), vermillion soft (Refused, Revoked), green soft (Co-signed, Paid in ledgers), ink (Confirmed).
- **AgentAvatar / AgentChip**: ChainBrain's mark on ink; the official Claude Spark (clay) and OpenAI Blossom (black) on white, unaltered, at avatar size only (`shared/brand/`).
- **Pocket card** (`PocketFace`, 2.5D): four faces by creation order (black, vermillion, blue, white hatch). VaultBank anatomy: the pocket name, a black stripe across the card with the holding agent on a white pill, the balance, the rules in one line ("Cap US$2.00 · asks above US$1.00"), the short number big (`*C3A5`) and `Exp. 30/10` (or "Ends 23:59"). Depth: the card's side shows 4 pt under the face; a Skia material (grain, a top light, a specular band that follows the tilt; web: a CSS gradient); the card in focus leans up to 7° with the phone (`ui/tilt.tsx`, one rotation sensor on the UI thread). Revoked, frozen or ended: white hatch with a lock and a vermillion state chip. The same card on Home, the pocket page, an agent's page, the intro and the console.
- **Deck** (`PocketStack`): up to four cards fanned (-4° to +5°), the ones behind tipped away in perspective, the front card turning on its vertical axis as you swipe; tap behind to deal to the front, tap the front to fly into the pocket page. 3D transforms sit on an inner view (iOS makes `zIndex` a layer depth, so tipped siblings would cut through each other).
- **Ask dock** (`AskDock`): an outside agent's ask as a black bar above the tab bar on every tab: the agent's mark, "Claude asks US$1.50", "To DataPro · needs your co-sign", a vermillion countdown ring, "+2" when more wait; screens add room for it. Tap: the cheque.
- **Cheque** (`Cheque.tsx` in the approval sheet): who asks and why you are asked (the rule) beside the countdown; the pocket's card turns over to its back: pay, to, for, what is left after; then the wallet's other checks, the agent's note (not checked), details. Slide, then Face ID / Touch ID. Opt-in local notification when the app is in the background.
- **Brand mark** (`BrandMark`): four tiles, hatch, vermillion, ink, hatch (pockets walled off from each other); its tiles lock into place on the intro. App icon, splash, favicon and the console header use the same drawing (`mobile/assets/src/gen.py`). The brain stays the ChainBrain agent's avatar.
- **Pill tab bar**: floating white capsule; the active tab is a black pill (white icon and label) that slides; inactive tabs muted.
- **Underline tabs** (`SlidingPills`): bold active label, 2 px black bar that slides.
- **Sheets**: white, 28 radius, grabber, ink scrim at 40 %; decisions (Allow, Approve) stay pinned under scrolling details.
- **Slide to confirm**: black track, vermillion thumb, uppercase white label, a vermillion trail; success shows a green check.
- **Charts**: `SpendChart` (VaultBank's: a smooth ink curve over a vertical-line underfill, the week-over-week change as a vermillion pill on a stem down to a ringed marker on today, a black value tag on the peak when it has room), `SpendBars` (hatch bars, the busiest day solid and split by seller).
- **The agent's note**: anything an agent wrote is set apart from what the wallet checked: grey panel, hatch edge, black "NOTE · NOT CHECKED" tag, italic quoted text.

## Language

Plain words: "Paid DataLite US$0.30", "Refused: seller not on your list", "Waiting for your OK", "Claude asks to pay". Reason codes, tool names and hashes only in Details, Why and the explorer sheet. The network chip says "Test network" on the built-in network and the local fork.

## Screens

Phone: Intro, Home (pool, tiles, deck, spending, activity), Agents, Agent detail, Connect + consent, Approvals inbox + approval sheet, Pocket page (live and revoked), Chat (pushed from Agents), Brain, Activity, Settings, Radar alert. Web: Live (checks path, trace, pocket card, sellers), Presenter, Judges (arena), Pockets, Sellers, Explorer, Evidence. Mapping and the made-real / dropped list per screen: `docs/08-frontend/neo-kinetic-plan.md`.

## Pre-delivery checklist

- [ ] No gradient (except hatch and the card material), blur, glass, glow, sparkle, purple, dark mode
- [ ] Clash Display text fits at 375 pt (wide letterforms: titles one line, tags may outgrow their column)
- [ ] Every number traced to a contract read or an event; nothing shown that the data can't support
- [ ] Vermillion text under 18 px uses `vermillionInk`; green text uses `greenInk`; metadata on canvas uses `mutedOnCanvas`
- [ ] Hashes open the in-app explorer; BaseScan only against a real public-chain server
- [ ] 44-48 px targets, safe areas, keyboard never covers inputs (phone)
- [ ] 390 px without horizontal scroll; 1440 px desktop and presenter mode (web)
- [ ] Reduce Motion honoured
