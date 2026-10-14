# ChainBrain design system v2: clean bank (Ryt / Revolut reference)

Source of truth for `web/` (seller dashboard) and `mobile/` (owner app). Replaces v1 "Ink & jade", which still read as AI-made (cream paper, animated canvases, sparkles, mono jargon). Page files in `pages/` override this file.

## References and research

- Ryt Bank app screenshots in `reference/frontend/ryt-bank/` (13 screens: Home, Do more, Accounts, Main Account, Insights, Cards, Rewards, Ryt AI). These are the primary reference.
- Revolut public design notes: near-black ink `#191C1F`, `#F4F4F4` soft surface, pill buttons, 20 px cards, **no drop shadows**, one brand colour only.
- "AI tell" research (2026): purple/blue gradients, glassmorphism, glow, cream backgrounds with serif italic heroes, Inter everywhere, centred hero + three icon cards, coloured left-border cards, "Live" badges as decoration. Avoid all of them.
- ui-ux-pro-max: used for UX rules (touch targets, lists, keyboards, safe areas, contrast). Its "Fintech" style suggestion (glassmorphism + dark) is rejected for this product.

## What we copy from Ryt (structure, not brand)

1. **Grey canvas, white cards.** Canvas `#F7F7F8`; cards pure white, radius 20, **no border, no shadow**. Depth comes only from white on grey.
2. **One action colour.** Every tappable primary thing is the accent; nothing else uses it. No gradients anywhere.
3. **Round action buttons** under the balance: 64 px solid accent circles with white icons and a label below (Add money, Pockets, Ask agent, More). Secondary round buttons use the soft accent with an accent icon.
4. **Big balance**, centred, bold sans, with a small grey label above ("Main wallet") and one quiet line below.
5. **Serif page titles** at the top of each tab ("Pockets", "Activity", "Settings"), left aligned, large. Everything else is sans.
6. **Section headers** in sans 20/600 ("Accounts", "Recent activity") with a right-aligned grey total or a "View all" link.
7. **List rows**: 48-56 px round avatar (initial or icon on a soft tint), title 16/500, subtitle 14 grey "DataLite · 14 Oct, 1:32 PM", amount right aligned 16/600; incoming in green with a "+" sign; status ("Pending", "Refused") in grey under the amount.
8. **Small tinted pills** for rates/facts ("Cap US$2.00", "Ask above US$1.00"): soft accent background, accent text, radius full.
9. **Outline pill CTA** for secondary actions ("Create now", "View history"): accent text, 1.5 px accent border.
10. **Floating pill tab bar** on the phone: white, radius full, 16 px from the edges and bottom safe area, active item = grey pill behind accent icon + label.
11. **Pastel promo cards** only for tips/education (one at a time), with a small caps eyebrow in a darker tone of the pastel.
12. **Ask agent** entry as a pill in the Home header (like "Ask Ryt AI"), opening the agent chat.

## Colour (light only, both apps)

| Token | Hex | Use |
| --- | --- | --- |
| `canvas` | `#F7F7F8` | app background |
| `card` | `#FFFFFF` | cards, sheets, tab bar |
| `fill` | `#EFEFF1` | pressed rows, inputs, secondary buttons, active tab pill |
| `line` | `#E6E6EA` | the few dividers we need (inside cards, between rows: inset 72 px) |
| `ink` | `#111318` | primary text, balances |
| `ink2` | `#4B5058` | secondary text |
| `muted` | `#6B7280` | metadata, captions (4.8:1 on white) |
| `faint` | `#A1A6AE` | disabled, placeholders |
| `accent` | `#0B7A4B` | forest green: primary buttons, round actions, links, active tab, focus |
| `accentPress` | `#08613B` | pressed |
| `accentSoft` | `#E3F3EA` | soft round buttons, fact pills, selected rows |
| `onAccent` | `#FFFFFF` | text on accent (5.4:1) |
| `positive` | `#0B7A4B` | incoming money "+US$0.30" (same green, it is money) |
| `negative` | `#C8372D` | refused, revoked, destructive (4.9:1 on white) |
| `negativeSoft` | `#FCEBEA` | refusal pill background |
| `warning` | `#9A6200` | "Needs you" text (4.8:1) |
| `warningSoft` | `#FFF3DB` | "Needs you" pill background |
| pastels (promo only) | mint `#DDF5EC` / peach `#FDEBDD` / lilac `#ECE9FB` | tips cards, eyebrows in `#0B7A4B` / `#A4501A` / `#5B4BC4` |

No dark mode. No gradients, blur, glow or shadows (the only shadow allowed: the floating tab bar and bottom sheets, `0 8px 24px rgba(17,19,24,0.08)`).

## Type

- **Sans:** Plus Jakarta Sans 400/500/600/700 for all UI, numbers (`tabular-nums`) and buttons.
- **Serif:** Fraunces 600 (optical size high), **only** for the page title of each tab/page. Never italic. Never in body text.
- **Scale:** serif title 34/40 (phone) 40/46 (web) · balance 40/44 700 · section 20/28 600 · body 16/24 · row title 16/22 500 · secondary 14/20 · caption 13/18 · tab label 12/16 600.
- No monospace in the consumer UI. Addresses and hashes only appear in a "Details" sheet, shortened ("0x0D23…0A71"), in the sans with tabular numbers.

## Shape and space

- Radii: 20 cards and sheets · full for buttons, pills, avatars, tab bar · 12 inputs.
- Spacing: 4-pt grid; screen padding 20 (phone) / 32 (web); 12 between cards; 24 above section headers.
- Touch: 48 px buttons, 64 px round actions, rows ≥ 64 px tall.

## Language

- Plain words for people, not engineers. "Paid DataLite US$0.30", "Refused: seller not on your list", "Waiting for your OK".
- Reason codes, tool names, nonces, tx hashes: only inside an expandable "Details" area.
- No status badges as decoration ("LIVE", "LOCAL FORK" chips). One small grey "Demo" or "Test network" line in Settings / footer is enough.

## Motion

Quiet and functional only: 150-200 ms fades and slides, balance count-up, row insert, sheet slide. No canvases, sparks, magnet, shimmer, blur-in text, decrypt effects. Respect reduced motion.

## Phone (owner) screens

- **Home:** header row (avatar initials left, "Ask agent" pill centre, bell right) on canvas; white balance card (label "Agent pockets", total, one quiet line "Main wallet US$15.00"); four round actions (Add money, New pocket, Ask agent, More); "Pockets" section (list card of pockets: avatar, name, "2 sellers · until 23:59", balance right); "Recent activity" list card with "View all".
- **Pocket detail:** back button + title, centred avatar, big balance, fact pills (cap, ask above, expiry), round actions (Add, Return, Revoke), "Allowed sellers" list card with switches, "Activity" list card.
- **Ask agent:** full screen chat on white; suggestion chips; agent messages as plain text; steps collapsed in a "Details" row; approval as a bottom sheet with the big amount, seller row, one green "Approve" button (slide stays) and a "Decline" text button.
- **Activity:** serif title, filter pills (All, Paid, Refused, Needs you), date-grouped list card.
- **Settings:** serif title, grouped list cards (Wallet, Network, About). "Demo data" shown here when in demo mode.

## Web (seller dashboard) screens

- Left rail (white, 240 px): logo, seller switcher (avatar + name + chevron), nav: Overview, Payments, Refusals, Catalogue, Response content. Footer: "Test network · Base Sepolia" in muted text.
- **Overview:** serif title "Overview", three white stat cards (Earned today, Payments, Refused by buyers' wallets), a "Recent payments" list card, a small pastel tip card explaining agent payments.
- **Payments / Refusals:** list cards with Ryt rows (buyer pocket avatar, "Agent payment · 14 Oct 21:55", amount, status), click → right-side detail sheet with plain-language explanation and a "Technical details" disclosure.
- **Catalogue:** items and prices as list rows.
- **Response content:** the red-team box reframed as "What this seller appends to its next response" (one textarea, Plant / Clear).
- No login: the seller is chosen from the switcher (remembered per browser).

## Demo mode

If the API is unreachable at start, both apps load built-in sample data (pockets, payments, refusals, an agent conversation) and say "Demo data" once, quietly. When the API becomes reachable they switch to live data.

## Pre-delivery checklist

- [ ] No gradient, blur, glow, canvas effect, sparkle icon, mono font in consumer UI, dark mode
- [ ] One accent colour; contrast ≥ 4.5:1 for text
- [ ] Every screen starts without login, connect, key setup or disconnect
- [ ] Serif only on page titles
- [ ] 48 px targets, safe areas, keyboard never covers inputs (phone)
- [ ] 375 / 768 / 1280 px without horizontal scroll (web)
