# ChainBrain design system: Ink & jade

Source of truth for `web/` and `mobile/`. Generated with ui-ux-pro-max (`"consumer fintech wallet AI agent trust" --design-system --variance 6 --motion 8 --density 5`), then the colours replaced by the team's chosen "Ink & jade" palette. Page files in `pages/` override this file.

## Direction

- **Style:** Minimalism & Swiss. Paper, ink, one accent. Grid, hairlines, clear type hierarchy.
- **Why:** a wallet that holds money for an AI agent must read as calm and trustworthy, not as "AI". The old look (near-black, signal violet `#6E56FF`, cyan glow, glass) is exactly the generic AI aesthetic.
- **Avoid:** purple/pink/cyan gradients, glow, glassmorphism, neon status colours, emoji as icons, gradient text.
- **Allowed showcase motion:** React Bits effects, but only in ink and jade, slow, low contrast, off under `prefers-reduced-motion`.

## Colour tokens

Light is the default. Dark follows the system or the user's choice.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `bg` | `#F6F4EF` | `#121314` | canvas (paper / ink) |
| `e1` | `#FFFFFF` | `#1B1C1E` | cards, panes |
| `e2` | `#EFECE5` | `#232426` | inputs, raised rows |
| `e3` | `#E6E2D9` | `#2C2D30` | hover, pressed, selected |
| `hair` | `#E3DFD6` | `rgba(236,234,228,0.08)` | hairline borders |
| `hair2` | `#CFCAC0` | `rgba(236,234,228,0.16)` | strong borders, focus outline base |
| `fg` | `#16181A` | `#ECEAE4` | primary text |
| `t2` | `#3F4347` | `#BDBBB5` | secondary text |
| `t3` | `#6B6F73` | `#9A9C9E` | metadata (4.6:1 on paper) |
| `tdis` | `#B9B6AF` | `#55575A` | disabled |
| `accent` | `#0F6E56` | `#3FBF9A` | jade: primary buttons, links, focus ring, agent activity |
| `accent-hi` | `#138467` | `#5CD1AE` | hover |
| `accent-press` | `#0B5946` | `#2FA584` | pressed |
| `accent-ink` | `#0B5946` | `#3FBF9A` | jade text on tinted backgrounds |
| `accent-soft` | `rgba(15,110,86,0.10)` | `rgba(63,191,154,0.14)` | selected / active tint |
| `on-accent` | `#FFFFFF` | `#0D1F19` | text on accent (6.2:1 / 8.1:1) |

### Verdicts (used everywhere: chips, trace, receipts)

| Verdict | fill (icon, dot) light / dark | text light / dark | tint bg light / dark |
| --- | --- | --- | --- |
| `ok` (paid, allowed) | `#1F8A4C` / `#4CC27E` | `#18703F` / `#4CC27E` | `rgba(31,138,76,0.10)` / `rgba(76,194,126,0.14)` |
| `refused` | `#C2410C` / `#F0804A` | `#B23C0B` / `#F0804A` | `rgba(194,65,12,0.08)` / `rgba(240,128,74,0.14)` |
| `stepup` (needs you) | `#B7791F` / `#E0A84A` | `#8A5A12` / `#E0A84A` | `rgba(183,121,31,0.12)` / `rgba(224,168,74,0.14)` |
| `revoked` (stopped) | `#5B6168` / `#A3A7AB` | `#4A4F55` / `#A3A7AB` | `rgba(22,24,26,0.06)` / `rgba(236,234,228,0.08)` |
| `info` | `#6B6F73` / `#9A9C9E` | `#3F4347` / `#BDBBB5` | `rgba(22,24,26,0.05)` / `rgba(236,234,228,0.06)` |

Border of a tinted chip = its fill at 28% alpha. Never rely on colour alone: every verdict has an icon and a word.

Contrast (checked): ink on paper 16.2, t3 on paper 4.6, jade on paper 5.6, refused text 4.7, stepup text 5.4, ok text above 4.5; all dark-mode text above 6.

## Typography

- **Sans:** IBM Plex Sans 400 / 500 / 600 (skill pick for "financial, trustworthy"). Web `@fontsource/ibm-plex-sans`, phone `@expo-google-fonts/ibm-plex-sans`.
- **Mono:** IBM Plex Mono 400 / 500 for addresses, hashes, reason codes, tool names.
- **Numbers:** `font-variant-numeric: tabular-nums` for all money.
- **Scale (px):** 12 meta · 13 small · 14 body-sm · 16 body · 20 title · 24 h2 · 32 h1 · 44 balance display.
- Headings 600, tracking `-0.01em` (display `-0.02em`). Body line-height 1.5. Never below 12 px.
- Reason codes stay as mono codes, but always next to a plain-language line.

## Shape, space, elevation

- **Radii:** 6 (chips, inputs), 10 (buttons, rows), 14 (cards, panes, sheets). Pills only for chips and segmented controls.
- **Spacing:** 4-point grid: 4, 8, 12, 16, 24, 32, 48.
- **Elevation:** by surface step and 1 px hairline, not by shadow. One soft shadow allowed for dialogs and sheets: `0 12px 32px rgba(22,24,26,0.12)` (dark: `rgba(0,0,0,0.5)`).
- **Focus:** 2 px `accent` outline, 2 px offset. Never removed.
- **Touch targets:** 44 x 44 minimum on phone.

## Motion and components

Durations 150-250 ms for UI, 400-700 ms for showcase. Ease out on enter, faster exits. Everything off or instant under reduced motion.

### Web: React Bits (ts-tailwind sources from `reference/frontend/react-bits`, vendored into `web/src/components/bits/`)

| Where | Component |
| --- | --- |
| App canvas | `DotGrid` (ink dots on paper, jade near the cursor, low contrast) |
| Chat empty state | `Threads` in jade at low amplitude |
| Balances (main wallet, pockets, Bank KPIs) | `CountUp` |
| Live trace and activity rows | `AnimatedList` |
| Agent "working" label | `ShinyText` (ink on ink, jade shine) |
| Empty-state and page headings | `BlurText` / `SplitText` |
| Pocket cards | `SpotlightCard` (jade spotlight, 8% alpha) |
| Create-pocket wizard | `Stepper` (Rules, Sellers, Review) |
| Primary CTA (New pocket) | `Magnet` (small strength) |
| Whole app | `ClickSpark` (jade, 6 sparks) |
| Tx hashes revealed in receipts | `DecryptedText` |
| Revoke | `HoldButton` (Micro, already vendored) |
| Agent steps | `ThoughtLine` (Micro, already vendored) |

### Phone: React Native Reusables (NativeWind registry) + Reanimated ports

- Reusables `Button`, `Card`, `Badge`, `Text`, `Input`, `Switch`, `Separator`, `Progress`, `Skeleton`, `Alert`, `Dialog` themed with the tokens above (CSS variables in `global.css`).
- Keep the custom gestures (slide to approve, hold to revoke), restyled.
- Tab bar: solid `e1` with a hairline top border and jade active pill. No glass, no blur.
- React Bits ideas ported to Reanimated: `CountUp` (balances), `AnimatedList` (activity, trace via layout animations), `ShinyText` (agent working).

## Brand mark

Two linked rings. Ink ring + jade ring on paper; reversed on ink. No gradient.

## Pre-delivery checklist

- [ ] No violet, cyan, gradient, glow or glass left (`grep -i "6e56ff\|38e1ff\|gradient\|backdrop-blur\|BlurView"`)
- [ ] Text contrast 4.5:1 in both themes
- [ ] Visible focus on every control; keyboard reachable
- [ ] Reduced motion: backgrounds static, counters jump to value
- [ ] 375 / 768 / 1024 / 1440 px without horizontal scroll (web)
- [ ] 44 px targets, safe areas, light and dark (phone)
- [ ] No emoji icons (Lucide on web and phone)
