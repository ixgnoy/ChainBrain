# VaultBank round: the phone, then the console

Restyle ChainBrain after the VaultBank shots (`reference/frontend/stitch_chainbrain_ai_pocket_banking/image.png_1` to `_5`): Neo-Kinetic, very clean, less "AI-made", more wow, and the agent approval as the centre of the UX. Decisions were asked and answered on 16 Oct; the spec was approved and built the same night (status at the end).

## What VaultBank does that we don't

| VaultBank | ChainBrain today | This round |
| --- | --- | --- |
| Clash Display, wide geometric grotesk, carries the brand | Plus Jakarta Sans | Clash Display for headings, amounts and card numbers; General Sans for body (both Fontshare, free commercial licence) |
| Warm paper grey canvas, white cards, almost no shadow | Cool slate `#E2E5E8`, soft shadows | Warm grey `#E7E6E2`; shadows only on cards that float (the deck, the dock, the cheque) |
| Radii 12-16, rectangular primary button | Radii 20-28, pill buttons | Tiles 16, cards 20, buttons 14 (rectangle, not pill); pills stay for chips and the tab bar |
| Big thin line icons on their own (Send ↗, Receive ↓) | Small icons in grey circles | Lucide at 1.5 stroke, 26-28 pt, no circle behind them in tiles |
| Physical cards: black stripe band, white label pill, big `*5621`, `Exp. 12/28`, a stack that leaves the screen | Flat faces with a hatch strip | 2.5D cards (below) |
| Vertical-line hatch under the curve, an orange stem tooltip on one point ("+12.5% vs last week") | 45° hatch curve, "vs last week" as text | Vertical-line hatch under the curve, the stem tooltip on today's point, 45° hatch kept for bars |
| 2x2 mark (hatch, orange, black, hatch) | Brain on black | Four-tile mark (below) |

Kept: the palette (vermillion `#F04E23`, powder blue `#9DCAFF`, ink `#111215`, greys `#777781` / `#D3D3D1`), the tabs, every flow, the built-in network, every real number. Light only.

## The pocket card (2.5D)

- Anatomy, VaultBank's: a black stripe band across the top third, a white pill on it with the holding agent's mark and name, the pocket name, the big short number `*F2D3` in Clash Display, `Exp. 30/10`, cap and ask-above as small facts. Faces stay the four deck faces (ink, vermillion, powder blue, white with hatch). Revoked, frozen and ended cards turn to the hatched face with the lock, as now.
- Depth: each card has a 3 pt edge (a darker side drawn under the face) and a real perspective (`perspective` + `rotateX/rotateY` in Reanimated). The fanned deck rotates in 3D when you swipe; the front card tilts up to 6° with the phone (expo-sensors `DeviceMotion`, smoothed on the UI thread, off with Reduce Motion).
- Material: a Skia `RuntimeEffect` layer per card: fine grain (static noise, ~4 % opacity) and a specular sheen whose position follows the tilt. Text and chips stay native React Native views on top, so they are sharp, selectable by VoiceOver and identical on web (on web the sheen follows the pointer instead of the gyroscope).
- Budget: one Skia canvas per visible card (max 4 in the deck), 120 Hz; no three.js.

## Claude asks: the ask dock and the cheque

Why: current practice for agent payments is one approval per spend that shows what, why and how much before anything moves, with limits enforced by rules the agent can't change (Stripe agent wallets, Google AP2 mandates). Pocket.sol already enforces the rules; the UI has to make the ask unmissable without blocking the rest of the app.

1. **Ask dock.** When an outside agent (Claude, ChatGPT) asks to co-sign, a slim black bar slides up and docks above the tab bar on every tab: agent mark, "HK$12.00 · DataPro", a vermillion countdown ring for the 10-minute expiry. More than one ask stacks as "+2" on the right. It never covers content (screens get bottom inset while it is shown), it hides on the pushed screens that have their own bottom action (create wizard, sheets).
2. **Unfold.** Tapping the dock morphs it (shared-element style: the bar grows into the card) into the cheque: the pocket card Claude would pay from, flipped. Its back reads, in order:
   - **Pay** HK$12.00 **to** DataPro, for "Durian exports premium report".
   - **Why you're asked:** "Above your HK$4.00 ask-me limit" (the rule that triggered the co-sign, from the contract).
   - **After this:** "HK$27.20 left in Market news".
   - **Seller check:** Radar's score, as now.
   - **Claude's note:** last, in its own box, marked "Not checked by ChainBrain".
3. **Sign.** Slide to approve, then Face ID (expo-local-authentication; device passcode fallback; skipped with a short note when the device has no biometrics, such as the web build). The card flips back to its face, the amount leaves the balance (rolling digits) and the card drops into the deck. Decline is a plain text button under the slider; expired asks show "Expired, nothing was paid".
4. **Away from the app.** A local notification (expo-notifications, asked once with a pre-prompt that says why) when an ask arrives while the app is in the background; opening it lands on the unfolded cheque.
5. **The bell / Approvals inbox** stays as the full list and history. ChainBrain's own asks in chat still open the cheque directly (you are already in the conversation).
6. Auto-play: the cheque gets named targets; the Face ID step is passed by the auto-play driver on the built-in network (it says so in the scene caption), so the video needs no simulator biometrics.

## Brand mark

Four tiles in a 2x2 grid: hatch, vermillion, ink, hatch, each tile with a small gap, standing for pockets walled off from each other. Icon: the mark on warm grey; splash: the mark on the canvas, the tiles lock into place on the intro's first page. Replaces the brain icon from `74e22b9` (the in-app ChainBrain agent avatar keeps the brain). Same SVG pipeline in `mobile/assets/src`.

## Screens touched (phone)

Tokens and fonts first, then: Home (balance, VaultBank-style action tiles, the deck, the chart), the card everywhere it appears (deck, pocket page, agent page, consent sheet, intro), the dock and the cheque (replacing `ApprovalSheet` for outside agents), Approvals inbox, Agents tab and agent page, pocket page, chat, Activity, Settings, sheets, intro and icon/splash. Then the console gets the same tokens, fonts, card faces and the approval layout in a separate pass.

## Order of work (one commit each, local main, no push)

1. Fonts (Clash Display, General Sans via expo-font; `F` tokens), warm canvas, radii, button and icon-tile styles; palette parity test with the console still green.
2. 2.5D card: anatomy, depth, deck perspective, gyroscope tilt, Skia grain and sheen.
3. Ask dock, cheque, Face ID, notification; auto-play targets; e2e updated.
4. Home chart (vertical hatch, stem tooltip) and the remaining screens.
5. Four-tile mark: icon, splash, intro.
6. Console pass.

Each slice: `npm test`, `npx tsc --noEmit`, the built-in e2e (`devstack/e2e/builtin.cjs`), and a look in Expo Go on the iOS Simulator (full reload, not Fast Refresh, before judging animated state).

## Risks

- Skia shaders and DeviceMotion in Expo Go are bundled (Skia 2.6.2, expo-sensors) but untested here; if the shader costs frames on the deck, the sheen falls back to a pre-rendered gradient image that moves with the tilt.
- Face ID in the simulator needs "Enrolled" and a simulated match per take; the auto-play bypass covers the video.
- Clash Display's wide letterforms need more room: long pocket names and amounts are checked at 375 pt width.

## Sources

- [Human-in-the-loop for AI payment agents (Courier)](https://www.courier.com/blog/human-in-the-loop-ai-agent-notifications)
- [AI agent payment authorization (Spark)](https://www.spark.money/research/fintech-ai-agent-payment-authorization)
- [AP2 mandates explained (RisingWave)](https://risingwave.com/blog/payment-mandate-agentic-commerce-explained/)
- [Fintech design trends 2026 (Wandr)](https://www.wandr.studio/blog/fintech-design-trends-2026)
- [Fintech UX trends 2026 (Outcrowd)](https://outcrowd.medium.com/fintech-design-trends-2026-733bd55314d3)

## Status (16 Oct, built)

All six slices are committed on local main (not pushed): `10ecca9` fonts, canvas, tiles · `72e77d2` 2.5D cards · `90123ce` ask dock, cheque, Face ID · `3610e8c` chart, rule tiles, cards everywhere · `1abd1ec` four-tile mark, icon, splash, intro · `32422b3` console. Checks: phone `npm test` 34/34, `tsc` clean, built-in e2e 46/46, console `vitest` 76/76, iOS export builds, expo-doctor unchanged (two patch notes). Seen in Expo Go on the iOS Simulator; tilt, Face ID and the background notification need a physical phone (see mobile.md "Not verified"). The dev-stack e2e (`devstack/e2e/e2e.cjs`) was not updated in this round either (it still waits for "Approve payment").
