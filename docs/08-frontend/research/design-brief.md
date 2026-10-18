# ChainBrain (链AI脑) Design Brief

> **Note (14 Oct 2026, after the v2 merge):** this brief was written for the first frontend build, which targeted the older MVP plan. Its visual direction (tokens, glass, type, motion, layouts) is what the current `web/` and `mobile/` use. Product terms from the old plan ("step-up", guards, KYC tiers, seller console) no longer apply; the v2 spec in `docs/02-product/product-design.md` wins wherever they differ.

Status: research output, follow literally unless a builder finds a hard blocker.
Date: 2026-10-14. Scope: Expo Go phone app (owner: Mei) + Vite/React/TS web ops console.

Evidence quality note: Revolut does not publish its app design tokens. Hex/radius/type values below marked (R) come from a third-party analysis of Revolut's public brand/marketing system (getdesign.md/design-md/revolut). Everything else is our own token proposal. Ryt Bank coverage found no screenshots, only feature descriptions. Liquid Glass facts come from Apple-aligned developer guides plus the cloned `expo-glass-tabs` source. Treat our numbers as decisions, not as facts about Revolut.

---------------------------------------------------------------------------

## 1. Design language

### 1.1 What we take from each reference

| Reference | Take | Leave |
|---|---|---|
| Revolut app | Dark, near-black canvas; one big balance number with tight negative tracking; horizontal rail of rounded account cards; circular action buttons under the balance (Add money / Move / Details); pill buttons everywhere; hairline-only separation, almost no shadows; "Pockets" (Revolut 10 renamed Vaults to Pockets, which matches our word); floating bottom tab bar that minimises on scroll; colourful semantic chips. | Cards/crypto/stocks/etc. product sprawl. Heavy marketing gradients. |
| Revolut Business / Stripe Dashboard | Dense tables with sticky headers, left nav, breadcrumb + command palette, KPI strip, status pills, monospaced IDs, right-side detail drawers. | Marketing hero scale type. |
| Ryt Bank | The AI assistant is the product's front door: icon top-right of Home opens chat; suggested-prompt chips; natural-language action ("send 50 to X"); receipt/image input; on failure the assistant offers recovery options rather than a bare error. | Generic bank navigation; we have no bank product. |
| iOS 26 Liquid Glass | Glass only on the navigation/overlay layer (tab bar, sheet, header chips, floating buttons), never on list rows or content cards; scroll-edge progressive blur under bars; sheets that are translucent with context-aware tint; depth through specular rim + refraction, not drop shadows; never stack glass on glass; do not give nav/tab bars an opaque fill (it kills the effect). | Glass on every card (looks muddy, hurts contrast). |

### 1.2 The agentic twist (what makes it not a bank clone)

1. Money is shown as **authority, not just balance**. Every pocket card shows three numbers: Balance, Cap (per-payment / per-day), and "Ask above". A thin 3-segment meter under the card shows spent-today / remaining / reserve-for-step-up.
2. The **agent is a visible actor** with a state glow: idle (no glow), thinking (cyan breathing ring), waiting-for-Mei (amber pulse), blocked (red flash once), revoked (everything greys, magenta lock). Use one reusable `AgentOrb` (see 3.2).
3. Every payment is an **intent chain**: Intent -> Quote -> Payment -> Receipt, drawn as a vertical rail with node states (done / running / refused / waiting). Refusals carry a **reason code chip** in mono type.
4. **Revoke is a first-class control** (slide-to-hold, big, always one tap away), not buried in settings.
5. **Step-up is a ceremony**: a sheet, changed fields in red, slide-to-approve, haptic success.
6. Language: plain English, short. Reason codes shown as `SELLER_NOT_ALLOWED` in mono beneath a human sentence.

### 1.3 Colour tokens (dark-first)

Canvas is true-black-ish for OLED and Revolut feel. Surfaces step up in luminance (Revolut approach: switch surface luminance rather than shadows).

```
/* ---------- DARK (default) ---------- */
--bg:            #050607;   /* app canvas */
--bg-elev-1:     #0E1012;   /* cards, rows (R: #0a0a0a / #16181a family) */
--bg-elev-2:     #16191C;   /* raised cards, inputs, pocket cards base */
--bg-elev-3:     #1F2328;   /* pressed / hover / selected */
--hairline:      rgba(255,255,255,0.08);
--hairline-strong: rgba(255,255,255,0.14);
--text:          #F5F6F7;
--text-2:        #A7ADB4;   /* secondary */
--text-3:        #6F767E;   /* tertiary / metadata (R stone #8d969e family) */
--text-disabled: #3D4349;

--accent:        #6E56FF;   /* ChainBrain "Signal violet" (deliberately not Revolut #494fdf) */
--accent-hi:     #8C7BFF;   /* hover / gradient end */
--accent-press:  #5A43E6;
--on-accent:     #FFFFFF;
--agent:         #38E1FF;   /* agent / live-trace cyan: only for agent activity */
--agent-glow:    rgba(56,225,255,0.35);

/* verdict + status (see 1.7) */
--ok:            #2ED47A;   --ok-bg:      rgba(46,212,122,0.14);
--refused:       #FF5A5F;   --refused-bg: rgba(255,90,95,0.14);
--stepup:        #FFB020;   --stepup-bg:  rgba(255,176,32,0.14);
--revoked:       #C45CFF;   --revoked-bg: rgba(196,92,255,0.16);
--info:          #38E1FF;   --info-bg:    rgba(56,225,255,0.12);

/* pocket card gradients (top-left -> bottom-right) */
--pocket-research: linear-gradient(135deg,#2A2F8F 0%,#6E56FF 100%);
--pocket-gifts:    linear-gradient(135deg,#8F2A6B 0%,#FF6AA8 100%);
--pocket-tight:    linear-gradient(135deg,#0F5B52 0%,#2ED4B0 100%);
--pocket-custom:   linear-gradient(135deg,#2B2F36 0%,#5B6370 100%);
```

```
/* ---------- LIGHT ---------- */
--bg:            #F4F4F6;   /* (R soft #f4f4f4 family) */
--bg-elev-1:     #FFFFFF;
--bg-elev-2:     #F0F1F3;
--bg-elev-3:     #E6E8EB;
--hairline:      #E2E2E7;   /* (R hairline light) */
--hairline-strong:#CFD2D8;
--text:          #191C1F;   /* (R ink) */
--text-2:        #505A63;   /* (R mute) */
--text-3:        #8D969E;   /* (R stone) */
--text-disabled: #C9C9CD;   /* (R faint) */
--accent:        #5B43F0;   --accent-hi:#7A66FF; --accent-press:#4A33D6;
--agent:         #0A9DBF;
--ok:#14A35A; --refused:#E23B4A; --stepup:#C77700; --revoked:#A63FE0; --info:#0A9DBF;
(bg tints = same colours at 10-12% alpha)
```

Contrast rule: verdict text on tinted chip must be at least 4.5:1; the dark values above pass on `--bg-elev-1`; in light mode use the darker light-mode values.

### 1.4 Radii, spacing, sizes

```
Radius:  xs 8 | sm 12 | md 16 | lg 20 (cards, R) | xl 28 (sheets, hero cards; R) | 2xl 36 (phone mock frame only) | pill 9999 (all buttons, chips, tab bar)
Spacing: 4-based. 4 8 12 16 20 24 32 40 48 64.  Screen gutter (phone) 20.  Card padding 16 (phone) / 20 (web).
Phone:   min hit target 44. Button height 52 (primary), 40 (secondary), 32 (chip). Input height 56 (R).
         Pocket card: 280w x 168h in the rail (peek next card 24px). Tab bar: 58h expanded / 44h minimised, 12 margin.
Web:     Sidebar 232 (56 collapsed). Top bar 56. Table row 44 (compact 36). Pane gap 12. Max content 1600.
```

### 1.5 Typography

Revolut: Aeonik Pro (display, paid) + Inter (body) (R). Free substitutes and our choice:

| Role | Font | Notes |
|---|---|---|
| Display / balances / headings | **Inter Tight** 600 (alt: Geist 600) | tight tracking, `font-variant-numeric: tabular-nums`. Closest free analogue to Aeonik's geometric grotesque feel. |
| UI / body | **Inter** 400/500/600 | Mobile: `@expo-google-fonts/inter` + `@expo-google-fonts/inter-tight` via `expo-font`. |
| Mono (IDs, reason codes, hashes, trace) | **Geist Mono** (alt JetBrains Mono) | 12/13px, `letter-spacing: 0`. |
| iOS-native alternative | System SF Pro (`fontFamily` omitted) | Acceptable fallback; do not mix SF and Inter on one screen. |

Scale (px; phone / web). Letter-spacing in em (R values approximate -0.01em to -0.02em on display):

```
display-xl  48/52  w600  -0.03em  (Home balance, phone)      web 56
display-lg  36/40  w600  -0.025em (pocket balance)            web 40
heading-lg  28/34  w600  -0.02em  (screen titles)
heading-md  22/28  w600  -0.015em (sheet titles)
title       17/22  w600  -0.01em  (list titles, iOS body size)
body        16/24  w400
body-sm     14/20  w400
caption     12/16  w500  +0.01em  (metadata, chips)
mono        12/16  Geist Mono 500
button      16/20  w600 (52h) ; 14/20 w600 (40h)
```

### 1.6 Elevation, glass, borders

Principle: flat + hairline for content; glass only for overlay/nav layer.

CSS glass recipes (web):

```css
/* G1: chrome glass (top bar, floating toolbars, popovers, command palette) */
.glass {
  background: rgba(22,25,28,0.55);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
          backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.12),   /* specular rim */
              0 8px 32px rgba(0,0,0,0.45);
}
/* G2: heavy glass (modal / drawer scrim panel) */
.glass-strong { background: rgba(14,16,18,0.72); backdrop-filter: blur(40px) saturate(160%); }
/* G3: subtle tint chip on cards (e.g. status overlay on pocket card) */
.glass-chip   { background: rgba(255,255,255,0.14); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.18); }
/* light mode: background rgba(255,255,255,0.65), border rgba(0,0,0,0.06), inset rim rgba(255,255,255,0.8), shadow 0 8px 32px rgba(20,24,30,0.12) */
@supports not (backdrop-filter: blur(1px)) { .glass { background: rgba(22,25,28,0.94); } }
```

Cards (content layer): `background: var(--bg-elev-1); border: 1px solid var(--hairline); border-radius: 20px; box-shadow: none`. Hero/pocket cards get a gradient fill plus a 1px inner highlight `inset 0 1px 0 rgba(255,255,255,0.18)` and a soft noise overlay (SVG feTurbulence at 4% opacity) for a premium grain. Ambient glow behind the agent orb: `box-shadow: 0 0 40px var(--agent-glow)`.

React Native glass recipes (expo-blur 'BlurView'):

| Surface | Props |
|---|---|
| Header chip / small floating button | `<BlurView intensity={40} tint="systemChromeMaterialDark">` radius pill, border `rgba(255,255,255,0.10)` 1px (`StyleSheet.hairlineWidth` ok) |
| Bottom sheet background | `intensity={70} tint="systemThickMaterialDark"` + overlay `rgba(10,10,12,0.35)`; top corners 28 |
| Tab bar | use `expo-glass-tabs` (GlassView on iOS 26) else `intensity={60} tint="dark"` + `rgba(10,10,12,0.55)` tint, `solidFallback rgba(18,18,20,0.94)` |
| Light mode | tint `systemChromeMaterialLight`, intensity 50 |
| Android | BlurView blur is experimental: pass `experimentalBlurMethod="dimezisBlurView"` or just use the solid fallback colour; do not depend on blur for legibility |

Native Liquid Glass (iOS 26 only): `expo-glass-effect` `GlassView` (`glassEffectStyle="regular" | "clear"`, `isInteractive`). Always gate on `isLiquidGlassAvailable()` and render the solid fallback (white 0.9 / elev-2 with hairline) otherwise (pattern in `glass/expo-backdrop/example/components/glass-button.tsx`).

### 1.7 Verdict chips (use everywhere: phone, web, trace)

| Verdict | Dark text / bg / border | Icon | Label | Behaviour |
|---|---|---|---|---|
| ALLOWED | `#2ED47A` / `rgba(46,212,122,.14)` / `rgba(46,212,122,.30)` | check-circle | "Allowed" | solid dot, no motion |
| REFUSED | `#FF5A5F` / `rgba(255,90,95,.14)` / `rgba(255,90,95,.30)` | x-circle | "Refused" + mono reason code | one 240ms horizontal shake on first render |
| STEP-UP | `#FFB020` / `rgba(255,176,32,.14)` / `rgba(255,176,32,.30)` | shield-alert / hand | "Needs you" | dot pulses 1.6s loop (opacity .4->1) until resolved |
| REVOKED | `#C45CFF` / `rgba(196,92,255,.16)` / `rgba(196,92,255,.34)` | lock / ban | "Revoked" | static; pocket card desaturated to 60% with diagonal hatch overlay |
| PENDING/INFO | `#38E1FF` / `rgba(56,225,255,.12)` | loader | "Working" | rotating arc |

Chip geometry: height 24, padding 0 10, pill, caption type, 6px dot or 14px icon, gap 6. Reason-code sub-chip: Geist Mono 11/16 on `--bg-elev-3`, radius 8.

KYB badge: shield-check icon in `--ok` ("Verified"), shield-half amber ("Pending"), shield-off in `--text-3` ("Unverified, blocked"). Show the verifier name in tooltip/sheet.

### 1.8 Motion

```
Durations: instant 80ms | fast 160ms | base 240ms | slow 400ms | hero 600ms
Easings (CSS):  standard cubic-bezier(0.2,0,0,1) | decelerate cubic-bezier(0,0,0,1) | accelerate cubic-bezier(0.3,0,1,1) | emphasized cubic-bezier(0.2,0,0,1.15) (slight overshoot, buttons/cards)
Springs (RN Reanimated 'withSpring'):
   ui:      { damping: 18, stiffness: 220, mass: 1 }     // taps, cards
   sheet:   { damping: 26, stiffness: 260, mass: 1 }     // sheets, no bounce feel
   glass:   { duration: 420, dampingRatio: 0.82 }        // tab pill slide (taken from expo-glass-tabs)
Patterns:
 - Balance counter: count-up/rolling digits 600ms decelerate on load and on change.
 - List insert: slide-in 12px + fade, 240ms, stagger 40ms (max 8 items).
 - Card press: scale 0.98, 80ms in / 160ms out, light haptic.
 - Sheet: spring in, backdrop fade 240ms, drag-to-dismiss with velocity.
 - Trace step: new line types in via fade + 4px rise 160ms; running step shows breathing cyan dot (1.4s).
 - Tab bar: minimise on scroll down (labels collapse), expand on scroll up.
 - Approve: slide-to-confirm track fills accent->ok on drag, success haptic (notificationAsync Success), check morph 400ms.
 - Revoke: hold 600ms to arm (ring fill), then magenta flash 200ms, all cards desaturate 400ms, heavy haptic.
 - Respect reduced motion: replace springs/loops with 120ms fades; stop pulses.
```

---------------------------------------------------------------------------

## 2. Brand proposal

- **Name treatment**: wordmark "ChainBrain" in Inter Tight 600, -0.03em, with "Chain" in `--text` and "Brain" in `--text` too; distinguish via the mark, not colour. Chinese lockup "链AI脑" in 思源黑体/Noto Sans SC 600 beneath or beside at 0.6 scale, with "AI" rendered in Inter Tight and `--accent`. Tagline: "Let your agent spend. Keep the keys." (alt: "Your agent's allowance, with a kill switch").
- **Logo mark idea ("Linked Neuron")**: a rounded square (radius 28% of side) containing two interlocking chain links drawn as stroke-only pill shapes at 45 degrees, where the overlap of the two links forms a small filled dot (the "brain node"/signature). Colour: gradient `#6E56FF -> #38E1FF` on the mark, white strokes on the dark tile. Minimal SVG (viewBox 0 0 64 64):

```svg
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#6E56FF"/><stop offset="1" stop-color="#38E1FF"/></linearGradient></defs>
  <rect width="64" height="64" rx="18" fill="#0E1012"/>
  <g fill="none" stroke="url(#g)" stroke-width="5" stroke-linecap="round">
    <rect x="12" y="24" width="26" height="16" rx="8" transform="rotate(-35 25 32)"/>
    <rect x="26" y="24" width="26" height="16" rx="8" transform="rotate(-35 39 32)"/>
  </g>
  <circle cx="32" cy="32" r="3.5" fill="#fff"/>
</svg>
```
  (Builders: tweak positions visually; the idea is two linked pills + one white node. Also supply a monochrome variant and a 1024px app icon with the same tile on `#050607`.)
- **Accent colour**: Signal violet `#6E56FF` primary action; Agent cyan `#38E1FF` reserved for anything the agent is doing. Never use cyan for buttons.
- **Voice**: calm, precise, a little reassuring ("Held for your approval").

---------------------------------------------------------------------------

## 3. Phone app (Expo Go) screens

Global: dark default, user toggle + system. Floating glass tab bar with 4 tabs: Home, Chat (the agent), Activity, Settings. A centred-FAB is not used. Status bar light. Haptics on primary actions. Sheets use `@gorhom/bottom-sheet` or expo-router `presentation: 'formSheet'` (check Expo Go support).

### 3.1 Home
Top to bottom:
1. **Header row** (glass chips): avatar "M" left; centre: "Mei's agent" + AgentOrb state dot; right: bell + AI sparkle button (Ryt-style entry to Chat).
2. **Pending step-up banner** (only when >0): full-width amber glass card, radius 20, left amber shield icon, "Agent wants to pay HK$120 to Acme Data. Needs you", chevron; tap opens Step-up sheet. Pulsing dot. Sticks under header while scrolling.
3. **Total balance**: label "Agent funds" (caption, text-3), display-xl number `9,670.00` with currency prefix "HK$" in text-2 (smaller), and below: "eHKD" (text-2) + delta chip "-12.40 today" in refused/ok colour. Count-up animation.
4. **Action row** (Revolut circular buttons, 56 circle, label under): Fund, Move, Revoke-all (magenta ring), More. Circles use `--bg-elev-2` with 24 icons.
5. **Pocket rail** (horizontal snap, card 280x168, radius 28): gradient per pocket (Research violet, Gifts pink, Tight teal). Content: pocket name + emoji-free glyph, balance display-lg, caption "Cap HK$50 / pay · Ask above HK$20", 3-segment meter bottom, KYB count chip "4 sellers". Last card: dashed "+ New pocket" tile. Revoked pocket: desaturated + hatch + magenta "Revoked" chip.
6. **Live activity** section: "Right now" 3-row list; each row = verdict chip + seller + amount + time; refused rows show reason code mono. "See all" -> Activity.
7. Tab bar (minimises on scroll).

### 3.2 Pocket detail
- Large header (collapsing) with the gradient card inverted into a hero: name, balance, meter, edit pencil.
- **Big Revoke**: full-width 56h pill, magenta outline at rest ("Hold to revoke"), hold 600ms fills magenta; after revoke becomes "Re-enable" ghost button. Placed directly under the balance, not at bottom.
- **Settings summary** (6 rows, tap to edit): Per-payment cap, Daily cap, Ask-me-above, Expiry, Categories/purpose, Seller policy.
- **Allowlist**: list rows 64h: seller logo circle (initial), name, domain mono, KYB badge, per-seller cap if any, toggle/swipe to remove (react-bits `SwipeRow` pattern). "Add seller" opens search sheet; unverified sellers show amber "Unverified, will block" notice.
- **Activity chain** (vertical rail): each payment is an expandable card: header = verdict chip + amount + seller; body = four nodes Intent (what/why, agent's sentence) -> Quote (price, expiry) -> Payment (tx hash, FISCO BCOS, link) -> Receipt (hash, signed). Failed nodes stop the rail in red with reason code and "What can I do?" CTA (Ryt-style recovery). Use `StatusMark`/`ThoughtLine` ideas.
- Footer: "Export CSV" link.

### 3.3 Create pocket (6 settings, stepper in a full sheet)
Progress dots top. One setting per page with a big control, then a summary page with "Create" slide-to-confirm:
1. Name + purpose (preset chips Research / Gifts / Tight + custom)
2. Funding amount (numeric keypad UI, quick chips 50/100/250)
3. Per-payment cap (slider + number)
4. Ask-me-above threshold (slider; must be <= per-payment cap; visual shows zone below = auto, above = needs you)
5. Seller allowlist (pick from verified directory; KYB badges; "allow any verified" toggle off by default)
6. Expiry / auto-revoke (24h / 7d / 30d / none)
Summary card previews the pocket card live. (If the product's six settings differ, keep the pattern: one control per page.)

### 3.4 Chat with the agent
- Ryt-style: message bubbles, suggested prompt chips above the keyboard ("Buy 10 market reports", "Pay Acme from Research"), attachment button (receipt/image), voice optional/out of scope.
- User bubble: accent fill, radius 20 (tail corner 6). Agent message: no bubble, left aligned plain text on canvas with AgentOrb avatar (avoid glass here).
- **Compact live trace under each agent reply**: a collapsed one-line `ThoughtLine`: "Checking policy... 3 steps" with chevron; expanded shows 3-6 mono lines: `intent.create`, `quote HK$2.00`, `policy ALLOWED`, `pay 0x9f..2c`, or `policy REFUSED SELLER_NOT_ALLOWED`. Each line has a verdict dot. Running line breathes cyan; auto-collapses on settle.
- Inline action cards inside chat (not links): "Approval needed" card with Review button; payment receipt card.
- Composer: glass pill, send button accent circle; keyboard-avoiding.

### 3.5 Step-up approval sheet
Presented as modal sheet (28 radius, glass-strong). Contents:
- Header: amber shield + "Approve payment?" + pocket chip.
- Big amount (display-lg) + seller row with KYB badge.
- **Diff block**: "Changed from what you set" - rows where the agent's request differs from the original intent/policy show old value struck-through text-3 and new value in `--refused` red on `--refused-bg`, e.g. `Amount  20.00 -> 120.00`, `Seller  acme.io -> acme-data.io`, `Network` etc. Unchanged fields in text-2.
- Expiry countdown ring (e.g. "Expires in 02:30").
- Buttons: **Decline** (secondary, 52h) left, **Approve** primary right; Approve is a slide-to-approve for amounts above the ask threshold, then biometrics (expo-local-authentication) then signing. Success: check morph + haptic. Decline requires no friction.
- A11y: both buttons also tappable without slide when VoiceOver is on.

### 3.6 Activity / receipts
Revolut transaction list style: sticky date headers ("Today"), row 64h: leading circle icon (seller initial), title seller, subtitle pocket + time, trailing amount (text) with verdict chip below for non-allowed. Filter chips: All / Allowed / Refused / Needs you. Tap -> receipt sheet: amount, tx hash (copy), network "FISCO BCOS (test network)", chain of four steps, "Share receipt", "Dispute". Search at top of tab (Revolut 8.0 pattern). A testnet ribbon appears globally.

### 3.7 Settings
Grouped inset lists (radius 20): Profile & business (KYB status), Security (biometrics, signing key, device list), Agent (name, default policy, notification rules), Appearance (theme, haptics, reduce motion), Testnet info (network, faucet link), Legal, Log out. Big magenta "Revoke everything" row at the top of Security.

---------------------------------------------------------------------------

## 4. Web ops console (Vite + React + TS)

Aesthetic: Revolut Business / Stripe Dashboard. Dark default with light toggle. Glass only on top bar, drawers, command palette. Content panes = flat `--bg-elev-1` with hairline.

Shell: left sidebar (Operate, Bank/Compliance), top bar 56h glass (workspace switcher "Mei Trading Ltd", environment pill "FISCO BCOS · test network", command palette Cmd-K, role switcher Owner / Auditor / Regulator, theme toggle).

### 4.1 Operate tab: 2x2 panes
```
+-------------------------+-------------------------+
| CHAT                    | TRACE                   |
| agent conversation,     | live event stream:      |
| suggested prompts,      | intent->quote->pay->    |
| inline step-up card     | receipt, reason codes,  |
|                         | filter by verdict       |
+-------------------------+-------------------------+
| POCKET                  | SELLER CONSOLE          |
| pocket cards + caps,    | seller-side view:       |
| allowlist, revoke       | incoming requests,      |
|                         | what it refused & why   |
+-------------------------+-------------------------+
```
- CSS grid `grid-template-columns: 1fr 1fr; grid-template-rows: minmax(0,1fr) minmax(0,1fr); gap: 12px; height: calc(100vh - 56px - 24px)`. Panes resizable with `react-resizable-panels`; each pane has a header (title, count badge, expand-to-fullscreen icon, menu). Below 1100px collapse to tabs.
- Chat pane: same bubble language as phone; trace lines inline.
- Trace pane: virtualised list, each row: timestamp mono, verdict chip, actor (Agent / Seller / Policy / Owner), summary, reason-code chip; click opens right drawer with raw JSON (intent, quote, policy decision, tx). Selecting a row highlights related rows in the other panes (cross-pane linking by intent id). New rows slide in; pause-on-hover; "Live" green dot toggle.
- Pocket pane: horizontal pocket tabs with mini gradient dots, balance, cap meters, allowlist table, **Revoke** destructive button (confirm dialog with hold).
- Seller console pane: simulates the seller view: request queue, accept/refuse with reason code dropdown, KYB badge editor, "last decision" card.
- Step-up on web: a centred dialog identical to the phone sheet but read-only unless signing wallet connected; most approvals happen on the phone, show "Waiting for Mei's phone" state with countdown.

### 4.2 Bank / Compliance tab
Header strip: role chip, "Read-only (Regulator)" banner when role = Regulator (all mutating controls hidden/disabled, subtle diagonal-stripe banner `--info`).
Layout (12-col grid):
1. **KPI strip** (4 cards): Payments allowed, Refused, Step-ups pending/approved, Revocations. Each with sparkline (Recharts) and delta.
2. **Ledger table** (col 8): columns Time, Intent ID (mono), Pocket, Seller, Amount (HK$), Verdict chip, Reason code, Approver, Tx hash (link to the server's `/explorer`), Receipt. Sticky header, column filters, saved views, density toggle, row click -> drawer. TanStack Table.
3. **Refusals by reason code** (col 4): horizontal bar chart, bars coloured `--refused`, each labelled with code (mono) and count; click filters ledger.
4. **Controls in force**: table/cards of active policies: per-pocket caps, ask-above, allowlist size, expiry, revoked flags, with "last changed by / when".
5. **Security events**: timeline (key rotation, new device, revoke, failed approval, signature mismatch) with severity dots.
6. **Convention-alignment checklist**: checklist card with pass/warn/fail rows against the referenced conventions (e.g. hackathon-specified controls; map to whichever standards the product doc lists), each with evidence link to ledger rows; progress ring "9/11 aligned". Never claim regulatory approval; label as "self-assessment".
7. **Export**: split button (CSV, JSON, PDF audit pack) + "Generate evidence bundle" with hash of the export shown in mono.
8. **Regulator read-only mode**: same page, mutation controls removed, banner shown, export still allowed, every view logged to security events.

### 4.3 Web component specs
- Buttons: pill, 40h default / 32h compact; primary accent, secondary `--bg-elev-2` hairline, destructive `--refused` ghost, revoke `--revoked`.
- Tables: row 44h, hairline separators only, hover `--bg-elev-2`, header caption uppercase 11px text-3 tracking 0.06em.
- Inputs: 40h, radius 12, focus ring `0 0 0 3px rgba(110,86,255,.35)`.
- Number formatting: `Intl.NumberFormat`, tabular nums, HK$ 2 dp (eHKD has 6 decimals; 6 dp in detail view).

---------------------------------------------------------------------------

## 5. Reference repos (cloned under `/Users/user/Workspace/Projects/shenzhen/lianainao-fintechathon/reference/frontend/`; read-only, nothing installed or run)

Licence policy: user said licences do not matter; recorded anyway. Competitor FinTechathon entries were NOT used.

| Path (relative to reference/frontend) | URL | Licence | Stack / last commit | Copy what (exact paths) and why |
|---|---|---|---|---|
| `glass/expo-glass-tabs` | github.com/davidmokos/expo-glass-tabs | MIT | Expo ~57, RN 0.86, React 19.2, Reanimated 4.5, expo-blur, expo-glass-effect, expo-router/ui headless tabs; 2026-07 | `src/glass-tab-bar.tsx` (floating Revolut-style tab bar: minimise-on-scroll, sliding pill, scrub + haptics, GlassView with fallback), `src/minimize-context.tsx`, `src/progressive-blur.tsx`, `src/fading-tab-slot.tsx`. README says "works in Expo Go". Our single best mobile find. |
| `glass/expo-backdrop` | github.com/rit3zh/expo-backdrop | MIT | Expo ^56, RN 0.85, **custom Kotlin/Swift native module**; 2026-09 | Copy only the *design* from `example/`: `example/constants/theme.constants.ts` (SF Rounded type), `example/components/glass-button.tsx` (GlassView + fallback), `example/components/feed-header.tsx`, `feed-footer.tsx` (blur header/footer). Do NOT use the native module (needs a dev build, not Expo Go). |
| `glass/expo-progressive-blur` | github.com/rit3zh/expo-progressive-blur | none stated | Expo ~54, RN 0.81, expo-blur 15, Reanimated 4.1; 2025-10 | `app/index.tsx`: JS-only progressive blur with expo-blur layers (Expo Go safe, older SDK API). Use for header/footer scroll edges if `expo-glass-tabs`' `ProgressiveBlur` isn't enough. |
| `mobile/wallet-app-expo` | github.com/burakorkmez/wallet-app-expo | none stated (no LICENSE file) | Expo + expo-router, plain JS; 2025-07 | Low visual value (coffee/forest themes). Only structural: `mobile/components/BalanceCard.jsx`, `TransactionItem.jsx`, `app/(root)/create.jsx` (create form), `mobile/constants/colors.js` (theme-object pattern). Skip otherwise. |
| `mobile/rainbow` | github.com/rainbow-me/rainbow | **GPL-3.0** | RN (bare, not Expo), TS; 2026-10 | Reference only (huge, native deps, cannot run in Expo Go): `src/design-system/` (typography, colour-mode, `palettes.ts`, layout primitives - good model for a token/Box/Text system), `src/components/` for wallet-card and gas/confirm-sheet patterns, `src/screens/` for confirm-transaction UX. Mirror ideas; do not lift code wholesale (GPL contagion if we ever ship it). |
| `web/shadcn-fintech` | github.com/abderrahimghazali/shadcn-fintech | MIT | Next 16, React 19.2, Tailwind v4, shadcn, `motion` 12, Geist; 2026-05 | `src/components/dashboard/account-cards.tsx` (Revolut-style account card rail with add-card flow, motion), `src/components/dashboard/{spending-limit,money-movement,health-score,recent-transactions,quick-transfer}.tsx`, `src/components/transactions/{transaction-table,transaction-filters,transaction-summary}.tsx`, `src/components/ui/{sidebar,table,chart,sheet,command}.tsx`, `src/app/globals.css` (Tailwind v4 `@theme inline` token wiring), `src/app/(dashboard)/layout.tsx`. Closest to our Bank/Compliance tab. Next-specific bits (`"use client"`, `next/*`) must be stripped for Vite. |
| `web/next-shadcn-admin-dashboard` | github.com/arhamkhnz/next-shadcn-admin-dashboard | MIT | Next 16.3, React 19.3, Tailwind 4.1, Recharts 3; 2026-10 | `src/app/(main)/dashboard/finance/_components/{overview-kpis,wallet,balance-distribution-card,transactions-overview-card,upcoming-transactions,quick-actions,finance-notification}.tsx` (KPI strip, wallet card), `.../dashboard/chat/` (chat pane layout), `.../dashboard/analytics/`, `.../dashboard/users/` (data-table patterns), `.../_components` sidebar/layout. |
| `web/ui` (shadcn-ui/ui monorepo) | github.com/shadcn-ui/ui | MIT | Next, Tailwind v4, Radix; 2026-10 | `apps/v4/registry/new-york-v4/blocks/dashboard-01/` (`app-sidebar.tsx`, `section-cards.tsx`, `data-table.tsx`, `chart-area-interactive.tsx`, `site-header.tsx`), `blocks/sidebar-*` variants, `apps/v4/registry/new-york-v4/ui/*` canonical components. Canonical source for primitives; prefer `npx shadcn add` in our app. |
| `web/magicui` | github.com/magicuidesign/magicui | MIT | React 19, Tailwind v4, motion; 2026-10 | `apps/www/registry/magicui/{number-ticker,blur-fade,border-beam,shine-border,magic-card,animated-list,animated-beam,progressive-blur,bento-grid,marquee,dock,animated-circular-progress-bar,shimmer-button}.tsx`. Use number-ticker (balances), animated-beam (agent -> seller flow), border-beam (agent-active pane), progressive-blur (scroll edges), animated-circular-progress-bar (meters). |
| `react-bits` (pre-existing) | github.com/DavidHDev/react-bits | **MIT + Commons Clause** (no selling the software itself; fine for a demo) | React 19, Tailwind 4, `motion`, `gsap`, Vite; 2026-10 | see section 6 |
| `react-native-reusables` (pre-existing) | github.com/founded-labs/react-native-reusables | MIT | Expo 56, RN 0.85, React 19.2, Reanimated 4.3, NativeWind 4.2 (+ Tailwind 3.4) and a Uniwind (Tailwind v4) variant; 2026-09 | see section 6 |

Searches for Revolut clones surfaced only low-quality repos (e.g. imVinayPandya/revolut-clone, 7 stars, 2024); not cloned. No glassmorphism-specific Expo banking template of quality was found beyond the `glass/` set.

---------------------------------------------------------------------------

## 6. Analysis of the two pre-existing repos

### react-bits (web, `reference/frontend/react-bits`)
Variants live in `src/content/<Category>/<Name>/` (JS + CSS) and `src/ts-tailwind/<Category>/<Name>/<Name>.tsx` (**use the TS + Tailwind variants**; they are self-contained single files). Many use `motion/react`; some use `gsap` or WebGL (`ogl`/`three`), so check each file's imports before copying. Components worth copying:

| Need | File |
|---|---|
| Slide-to-approve step-up (web mirror) | `src/ts-tailwind/Micro/SlideCommit/SlideCommit.tsx` (phases idle/pending/done/error, props trackColor/handleColor/successColor/dangerColor, onConfirm async). Uses `@hugeicons/react`; swap icons for lucide. |
| Hold-to-revoke | `src/ts-tailwind/Micro/HoldButton/HoldButton.tsx` |
| Agent "thinking" line in chat/trace | `src/ts-tailwind/Micro/ThoughtLine/ThoughtLine.tsx` (steps[], collapsible, collapseOnSettle) |
| Step status glyphs (pending/running/done/failed/cancelled) | `src/ts-tailwind/Micro/StatusMark/StatusMark.tsx` |
| Chat composer | `src/ts-tailwind/Micro/PromptBar/PromptBar.tsx` |
| Voice pill (optional) | `src/ts-tailwind/Micro/VoicePill/VoicePill.tsx` |
| Row swipe to remove seller | `src/ts-tailwind/Micro/SwipeRow/SwipeRow.tsx`, `SwipeToast` for undo toast |
| Streaming trace list | `src/ts-tailwind/Components/AnimatedList/AnimatedList.tsx` |
| Glass surface | `src/ts-tailwind/Components/GlassSurface/GlassSurface.tsx` (SVG-displacement glass; Chromium-only refraction, keep fallback to our `.glass`) |
| Pocket-card hover spotlight | `src/ts-tailwind/Components/SpotlightCard/SpotlightCard.tsx`, `BorderGlow`, `Animations/GlareHover/GlareHover.tsx` |
| Balance digits | `src/ts-tailwind/TextAnimations/CountUp/CountUp.tsx`, `Components/Counter/Counter.tsx` |
| Create-pocket wizard (web) | `src/ts-tailwind/Components/Stepper/Stepper.tsx` |
| Scroll-edge blur | `src/ts-tailwind/Animations/GradualBlur/GradualBlur.tsx` |
| Page entrance | `src/ts-tailwind/Animations/AnimatedContent/AnimatedContent.tsx` |
| Hero/login ambience only | `Backgrounds/Aurora`, `Backgrounds/DarkVeil` (WebGL, keep off ops panes for perf) |

Avoid in the console: cursors, ASCII/glitch text, galleries, 3D (Lanyard, ModelViewer), these hurt the "serious bank" tone.

### react-native-reusables (mobile, `reference/frontend/react-native-reusables`)
- Registry sources: `packages/registry/src/nativewind/components/ui/*.tsx` (and parallel `.../uniwind/...`), helpers `packages/registry/src/nativewind/lib/utils.ts` (`cn`), theme `apps/showcase/lib/theme.ts` + `apps/showcase/global.css` (shadcn HSL vars), `apps/showcase/tailwind.config.js`, `apps/showcase/metro.config.js`, `apps/showcase/babel.config.js`.
- Copy: `button.tsx`, `text.tsx` (typography via TextClassContext), `card.tsx`, `badge.tsx` (restyle into verdict chips), `dialog.tsx`, `alert-dialog.tsx` (revoke confirm), `tabs.tsx` (segmented filters), `switch.tsx`, `input.tsx`, `textarea.tsx`, `progress.tsx` (meters), `skeleton.tsx`, `avatar.tsx` (seller logos), `separator.tsx`, `select.tsx`, `radio-group.tsx`, `accordion.tsx`/`collapsible.tsx` (trace expand), `icon.tsx`, `native-only-animated-view.tsx`. Radix-style primitives come from `@rn-primitives/*` packages.
- No sheet/bottom-sheet component in the registry; use `@gorhom/bottom-sheet` or Expo Router formSheet for the step-up sheet.
- Theme must be rewritten: replace shadcn greys with our section 1.3 tokens, radius `--radius` from 0.625rem to 1rem, pill button variant (`rounded-full`).
- Dependency note: showcase uses NativeWind 4.2 + Tailwind **3.4**. The Uniwind variant uses Tailwind v4 but is newer/less proven.

---------------------------------------------------------------------------

## 7. Recommended stacks

### 7.1 Web (Vite + React + TS)
- Vite, React 19, TypeScript strict, Tailwind v4 (`@tailwindcss/vite`, tokens in `@theme`), shadcn/ui components (Radix) copied from `web/ui` and `web/shadcn-fintech/src/components/ui`, `motion` for animation, selected react-bits TS+Tailwind files and magicui files, lucide-react icons, Recharts (via shadcn `chart.tsx`), TanStack Table + TanStack Query, `react-resizable-panels`, `cmdk` for Cmd-K, `sonner` toasts, Inter / Inter Tight / Geist Mono via `@fontsource-variable/*`, `viem` for tx links/addresses.
- Port from Next repos: remove `"use client"`, replace `next/link`, `next/image`, `next-themes` with react-router and a tiny theme hook; `next/font` -> fontsource.
- Dark mode: `.dark` class + `@custom-variant dark (&:is(.dark *))` as in `shadcn-fintech/src/app/globals.css`.

### 7.2 Mobile (Expo managed, Expo Go)
- Latest Expo SDK that the installed Expo Go supports (verify first; the reference repos are on SDK 54 to 57), expo-router, TypeScript.
- Styling: NativeWind 4 + Tailwind 3.4 + react-native-reusables components (the combination proven in `apps/showcase`). Keep the token object in a TS file mirrored into `global.css` vars.
- Glass: `expo-blur` (BlurView), `expo-glass-effect` (GlassView, iOS 26) with fallbacks, `expo-glass-tabs` (copy source in or install), `expo-symbols` (iOS SF Symbols; need Ionicons/lucide-react-native fallback for Android).
- Motion: `react-native-reanimated` 4 + `react-native-gesture-handler` + `react-native-worklets`; `expo-haptics`.
- Sheets: `@gorhom/bottom-sheet` v5 (needs Reanimated+RNGH) or expo-router formSheet.
- Auth/sign: `expo-local-authentication`, `expo-secure-store`; wallet signing via `viem` with a key in SecureStore (testnet only).
- Fonts: `expo-font` + `@expo-google-fonts/inter`, `inter-tight`, `@expo-google-fonts/geist-mono` (or JetBrains Mono).
- Charts (meters/sparklines): `react-native-svg` (Expo Go bundled) hand-rolled, or `victory-native` (needs Skia: Skia is in Expo Go but heavier; prefer SVG).

### 7.3 Expo Go compatibility flags (another agent verifies; these are concerns only)
1. **SDK match**: Expo Go only runs the SDK of the current store release; repos here use 54 to 57. Pin SDK to whatever Expo Go on the demo phones supports, and check each lib's min SDK (`expo-glass-tabs` needs ~57 per its devDeps; `expo-progressive-blur` is 54).
2. `expo-glass-effect` / `GlassView`: JS API is in Expo SDK 54+; confirm it is bundled in Expo Go. Real glass renders only on iOS 26 devices; otherwise plain view. Test the fallbacks on Android and iOS < 26.
3. `expo-glass-tabs` claims "no custom native code, works in Expo Go" but depends on `expo-router/ui` headless tabs, `expo-symbols`, `expo-glass-effect`, RNGH, Reanimated 4. Verify the headless `Tabs` API exists in the chosen SDK.
4. `expo-blur` on Android: blur is experimental (use `experimentalBlurMethod`); design must remain legible without blur.
5. **NativeWind**: v4 works in Expo Go but needs the metro/babel config and is Tailwind 3 only. NativeWind v5 / Uniwind (Tailwind v4) are newer: verify before choosing. Do not mix.
6. **Reanimated 4** requires New Architecture and `react-native-worklets`; Expo Go has it, but versions must match Expo's expected ones (`npx expo install`). Old reanimated-based libs may break.
7. `expo-backdrop` is a **custom native module: will not work in Expo Go**. Not used.
8. `expo-local-authentication`: Face ID is not available inside Expo Go on iOS (falls back to passcode); plan the step-up ceremony so signing works with a passcode/PIN fallback and a "Demo approve" path.
9. Rainbow is bare RN: reference only.
10. `@gorhom/bottom-sheet` works in Expo Go with Reanimated+RNGH; test on the chosen SDK.
11. SF Symbols (`expo-symbols`) are iOS-only; supply Android icon fallback.
12. Fonts: custom fonts load via `expo-font` fine in Expo Go (no config plugin needed for runtime loading).

---------------------------------------------------------------------------

## 8. Build order recommendation
1. Tokens file (colours/radii/type/motion) shared as JSON and consumed by Tailwind v4 (`@theme`) on web and NativeWind `tailwind.config.js` on mobile.
2. `VerdictChip`, `KybBadge`, `ReasonCode`, `AgentOrb`, `PocketCard`, `IntentChain` components on both platforms with the same props.
3. Phone: Home -> Step-up sheet -> Pocket detail -> Chat -> Activity -> Create -> Settings.
4. Web: shell + Operate 2x2 -> Bank/Compliance -> regulator mode.
5. Demo polish: count-up balances, trace streaming, revoke ceremony, haptics.

## Sources
- Revolut design-system analysis (third-party): https://getdesign.md/design-md/revolut/preview
- Revolut 10 / Pockets: https://www.theasianbanker.com/press-releases/revolut-launches-revolut-10-as-it-passes-35m-customers-worldwide
- Revolut 8.0 (pinning, search): https://www.revolut.com/blog/post/simplified-app-infinite-possibilities/
- Ryt Bank / Ryt AI: https://fintech.global/2025/08/27/malaysia-unveils-ryt-bank-first-ai-powered-bank/ , https://support.rytbank.my/portal/en/kb/ryt-ai
- Liquid Glass guides: https://www.strv.com/blog/how-to-apply-liquid-glass-to-your-app , https://dev.to/diskcleankit/liquid-glass-in-swift-official-best-practices-for-ios-26-macos-tahoe-1coo
- Agent-wallet control patterns: https://payouts.com/resources/ai-agents-wallets-spend-limits , https://waas.coinsdo.com/en/blog/programmable-wallet-authorization-agent-approval-flows
