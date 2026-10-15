# ChainBrain design system v4: Neo-Kinetic Fintech

Source of truth for `mobile/` (owner app) and `web/` (network console). v4 (15-16 Oct 2026) replaces v3 "clean bank" (deep teal + navy, Fraunces titles). It follows the Stitch "Neo-Kinetic Fintech" spec exactly: `reference/frontend/stitch_chainbrain_ai_pocket_banking/neo_kinetic_fintech/DESIGN.md` (gitignored). Screens come from the `chainbrain_*` Stitch exports; the craft (hatch charts, black hero card, pill tab bar, fanned deck, type scale) from the `*_vaultbank_style` exports. Plan and screen map: `docs/frontend/neo-kinetic-plan.md`. Page files in `pages/` override this file.

## Principles

- **High contrast, editorial.** Black ink on white cards over a slate canvas. Depth from white on slate, a hairline, and one ultra-soft ambient shadow.
- **Two accents, used on purpose.** Vermillion for momentum and alerts (the one primary CTA on a screen, refusals, the active day, the deck's orange card). Powder blue for utility (Connect, needs-you, the blue pocket card). Everything else is black, white and greys.
- **Hatch, not fills.** 45° stripes stand in for chart fills, empty tracks, frozen cards and quiet panels.
- **Physical cards.** Pockets are cards in a fanned deck (-8° to +6°) that you deal and fly.
- **Truth over decoration.** Every number comes from the pocket contracts or the network's events. A metric that can't be computed is not shown ("vs last week" appears only when the history covers last week). No fake block numbers, model badges, "100 % secure", or explorer links for hashes that are not on a public chain.
- **Not AI-looking.** No gradients (except the hatch stripes), glow, blur, glass, purple, sparkles or orbs. Light only.

## Colour (one palette, both apps)

Defined in `mobile/src/tokens.ts` (`c`) and `web/src/index.css` (`@theme`, `--color-*`); `mobile/src/lib/tokens.test.ts` keeps them identical.

| Token | Hex | Use |
| --- | --- | --- |
| `canvas` | `#E2E5E8` | app background (level 0) |
| `card` | `#FFFFFF` | cards, sheets, tab bar (level 1) |
| `fill` / `tile` | `#F1F3F5` / `#F4F5F6` | inner panels, inputs, quiet chips |
| `tileStroke` | `#ECEFEF` | level-2 tile stroke |
| `line` | `#D3D3D1` | dividers, disabled, empty bar tracks, hatch on white |
| `ink` | `#111215` | headlines, figures, black buttons, the active tab pill |
| `ink2` | `#3A3B41` | secondary text |
| `muted` | `#777781` | metadata on white (4.4:1) |
| `mutedOnCanvas` | `#5E5F68` | metadata on the slate canvas (#777781 drops to ~3.4:1 there) |
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

Plus Jakarta Sans 400-800 everywhere (no serif, no monospace). Scale (`mobile/src/ui/Text.tsx`, CSS utilities on web):

| Variant | Size / line | Weight | Tracking | Use |
| --- | --- | --- | --- | --- |
| `display` | 32/38 (web 40/48) | 800 | -0.03em | page titles |
| `balance` | 40/48 | 800 | -0.04em | totals, the approval amount |
| `amount` | 28/34 (figures 32) | 700-800 | -0.02em | card balances |
| `section` | 22/28 | 700 | -0.02em | section headers, no colon |
| `head` | 18/24 | 700 | -0.01em | card titles |
| `row` / `body` | 16/22, 16/24 | 600 / 500 | -0.01em | list titles, body |
| `sub` | 14/20 | 500 | 0 | secondary |
| `cap` | 12/16 | 500 | +0.01em | metadata |
| `label` | 14/18 | 700 | -0.01em | buttons |
| `tab` (eyebrow) | 11/14 | 600 | +0.02em, uppercase in eyebrows | eyebrows, tab labels |
| `mono` | 13/16 | 700 | +0.08em uppercase | pocket numbers `•••• C3A5`, `VALID THRU` |

Figures: the currency symbol is set at 75 % on the same baseline (`Money`, web `.figure .cur`).

## Shape, space, depth

- Radii: cards 24 · tiles 16 · pocket cards 20 · avatars 14 at 48 px (squircle, `0.3 × size`) · sheets 28 · pills full.
- Spacing: 8-pt grid; margins 16 (phone) / 32 (web); card gap 12-16; tile gap 8-12.
- Level 1 (cards): `0 4px 20px -2px rgba(17,18,21,.04), 0 1px 2px rgba(17,18,21,.02)` + 1 px hairline `rgba(17,18,21,.04-.06)`.
- Level 3 (fanned cards, sheets, tab bar, value tags): `0 12px 32px -4px rgba(17,18,21,.16)`.
- Hatch: 45°, 2 px stroke on a 4-6 px pitch (`Hatch`, `HatchBar`, `HatchPanel`; web `.hatch`).

## Components (phone `mobile/src/ui`, web `web/src/seller/ui.tsx` + `console/kit.tsx`)

- **Pill CTA** (`Button`, 52 px): `primary` black, `vermillion` (one per screen), `secondary` white with stroke, `danger` soft vermillion, `blue`, `text`. Press scale 0.98.
- **Tile** (quick action, 16 radius, icon disc above a label-lg line): white with stroke; blue for the utility action; soft vermillion for Revoke.
- **Card** (level 1), **ListCard** with transaction rows (40 px squircle, bold title, muted line, amount and a status pill).
- **StatusPill**: neutral (Paid), blue (needs you), vermillion soft (Refused, Revoked), green soft (Co-signed, Paid in ledgers), ink (Confirmed).
- **AgentAvatar / AgentChip**: ChainBrain's mark on ink; the official Claude Spark (clay) and OpenAI Blossom (black) on white, unaltered, at avatar size only (`shared/brand/`).
- **Pocket card** (`PocketFace`): four faces by creation order (black, vermillion, blue, white hatch); name and holding agent, balance, cap / ask chips, `•••• C3A5`, `VALID THRU`. Revoked or ended: white hatch with a lock and a vermillion state chip.
- **Deck** (`PocketStack`): up to four cards fanned (-4° to +5° in use), tap behind to deal to the front, tap the front to fly into the pocket page, swipe to cycle.
- **Pill tab bar**: floating white capsule; the active tab is a black pill (white icon and label) that slides; inactive tabs muted.
- **Underline tabs** (`SlidingPills`): bold active label, 2 px black bar that slides.
- **Sheets**: white, 28 radius, grabber, ink scrim at 40 %; decisions (Allow, Approve) stay pinned under scrolling details.
- **Slide to confirm**: black track, vermillion thumb, uppercase white label, a vermillion trail; success shows a green check.
- **Charts**: `SpendChart` (smooth ink curve over a hatch underfill, black value tag on the peak, vermillion dot), `SpendBars` (hatch bars, the busiest day solid and split by seller).
- **The agent's note**: anything an agent wrote is set apart from what the wallet checked: grey panel, hatch edge, black "NOTE · NOT CHECKED" tag, italic quoted text.

## Language

Plain words: "Paid DataLite US$0.30", "Refused: seller not on your list", "Waiting for your OK", "Claude asks to pay". Reason codes, tool names and hashes only in Details, Why and the explorer sheet. The network chip says "Test network" on the built-in network and the local fork.

## Screens

Phone: Intro, Home (pool, tiles, deck, spending, activity), Agents, Agent detail, Connect + consent, Approvals inbox + approval sheet, Pocket page (live and revoked), Chat (pushed from Agents), Brain, Activity, Settings, Radar alert. Web: Live (checks path, trace, pocket card, sellers), Presenter, Judges (arena), Pockets, Sellers, Explorer, Evidence. Mapping and the made-real / dropped list per screen: `docs/frontend/neo-kinetic-plan.md`.

## Pre-delivery checklist

- [ ] No gradient (except hatch), blur, glass, glow, sparkle, purple, dark mode
- [ ] Every number traced to a contract read or an event; nothing shown that the data can't support
- [ ] Vermillion text under 18 px uses `vermillionInk`; green text uses `greenInk`; metadata on canvas uses `mutedOnCanvas`
- [ ] Hashes open the in-app explorer; BaseScan only against a real public-chain server
- [ ] 44-48 px targets, safe areas, keyboard never covers inputs (phone)
- [ ] 390 px without horizontal scroll; 1440 px desktop and presenter mode (web)
- [ ] Reduce Motion honoured
