# ChainBrain phone app (Expo Go)

The owner's app: the team's verified wallet logic in the clean-bank design (design-system/chainbrain/MASTER.md v3, deep teal + navy, light only). Code in `mobile/`.

**No login or setup.** The first launch creates the on-device key silently and opens Home. "Import a key" is in Settings only. The app opens on the **built-in network** on every launch (see below); a real server is opt-in in Settings.

## Run

```bash
cd mobile && npm ci
npx expo start                                                       # built-in network, nothing else needed
EXPO_PUBLIC_API_URL=http://<laptop LAN IP>:8787 npx expo start       # address offered under Custom server; also the relay address when linked to the console
# dev stack (local anvil fork, scripted agent): add EXPO_PUBLIC_RPC_URL=http://<LAN IP>:8787/dev/rpc, or just set the API URL; dev mode is detected from GET /dev/health
```

## Built-in network (default)

`shared/sim` runs the wallet API, tool layer, scripted agent and the Pocket.sol rules in the app on a virtual chain (`src/lib/builtin.ts`). It is seeded with a lived-in owner: Research data (US$10 pocket, earlier purchases), One purchase (US$0.20 pocket), main wallet US$54.80. Every owner action, agent turn, co-sign and refusal works offline; scenes 1-8 play end to end. Paid cards show in chat, replies stream, and receipts say what was bought.

It is meant for demos and offline use. Its hashes are not on a public chain, so they open in-app receipts and sheets, and BaseScan links appear only when connected to a real server on the public chain.

**Use a real server:** Settings, Advanced, **Custom server** switch, enter the URL, Test, Connect. The choice is remembered (`cb.source` in SecureStore). Switch it off to return to the built-in network.

**Link to the web console:** on the built-in network the phone quietly pushes its pockets and events to a relay (`src/lib/relay.ts`, backs off when none answers). On the laptop run `pnpm --dir devstack relay` (or the full `pnpm --dir devstack start`), start the phone with `EXPO_PUBLIC_API_URL=http://<laptop LAN IP>:8787`, and keep it on the built-in network. The console then mirrors the phone, and the Judges tab's plant and forced transfer run on the phone's pockets.

## What a judge sees first (15 Oct round)

- **Intro on every launch:** three pages ("Give your AI a pocket, not your wallet"; the limits live in a contract you own; the worst case is the pocket balance, only to sellers you allowed). Skip is always there, pages follow the finger, and it finishes into Home by itself in about 7 s (`src/components/Intro.tsx`).
- **Pocket cards (Apple Wallet stack):** each pocket is a printed card with a solid navy or teal face: name, balance, cap, ask-me limit, valid-thru and a short pocket number. Tapping a card flies it into the pocket page (a measured overlay, since Expo Go has no shared-element transitions: `src/components/PocketStack.tsx`, `CardFlight.tsx`, `src/ui/cardFlight.ts`). Revoking freezes the card: a cool grey face, frost lines and a Warning haptic.
- **ChainBrain explorer sheet:** every hash on the phone opens it: status, block, time, from, to, method and arguments, event logs, a plain summary, and "How it was checked" (the gates the payment or attack passed and the one that stopped it, codes under "Why"). A reverted transfer shows the on-chain error and the pocket rule that failed as separate rows. It says "Test network" on the built-in network and the local fork; "View on BaseScan" appears only against a real public-chain server (`src/components/ExplorerSheet.tsx`, `shared/sim/explorer.ts`).
- **Attack cards:** when the laptop console attacks the phone's pocket, chat and Activity say so calmly: a fooled agent's transfer (reverted on-chain), the agent key's attempt to change the rules (NOT_OWNER), a request for private data (nothing shared) (`src/components/AttackCard.tsx`).
- **Hidden auto-play (for the video):** long-press the Agent screen header for about 1.5 s. The phone then plays the whole story by itself at a natural pace: Home, New pocket, the Research preset through the wizard, slide to create and fund, then scenes 1, 4, 5 (plus the forced transfer), 6, the privilege-escalation attempt, 7 (hold to revoke, return funds), 8 (switch to One purchase, the dead end, the one-tap fix, ask again), and it ends on Home with the frozen card. Long-press again, or tap Stop, to end it. Every step presses the real control through a named target (`src/lib/autoplay.ts`, `src/lib/autoplayTargets.ts`), so a linked console follows it exactly as it follows a person. Nothing on screen shows it is running.

## Screens

Home ("Ask agent" pill, Test network chip, pocket total and main wallet balance, round actions, the pocket card stack, recent activity), Agent (chat; tool steps folded under "Details"), Activity (filters, date groups), Settings (wallet, import key, network, Advanced: Custom server). Stack screens: pocket detail (Add, Return, Revoke round actions, editable cap and ask-me limit, seller switches, worst-case line, history with tx hashes), create wizard (sellers grouped by category). Every owner transaction (create, fund, return, revoke, rule change) shows its tx hash; the agent chat has "Stop agent" and a dead-end card with the sellers tried and a one-tap fix (scene 8). Sheets: approval (slide to approve), question, receipt, add money / return / revoke (hold to revoke).


## Motion and haptics

Spec: [design-system/chainbrain/pages/motion.md](../../design-system/chainbrain/pages/motion.md). Glass tab bar (iOS 26 Liquid Glass, blur on older iOS, solid on Android/web) with a sliding highlight, finger scrubbing and minimize-on-scroll; tabs slide in from the direction of travel and keep their state; sheets with drag physics, rubber-banding and keyboard lift; slide-to-approve and hold-to-revoke with ticks and a drawn success / error mark; rolling-digit balances; staggered first-load reveals; live agent steps with a status mark that draws its check; a calm three-dot working indicator. Rich haptics through `src/haptics.ts` (semantic, throttled). Everything honours Reduce Motion and Reduce Transparency.

## Where the logic is

| File | What |
| --- | --- |
| `src/lib/wallet.ts` | owner key calls: factory create, USDC fund, revoke, returnFunds, setSeller, co-sign |
| `src/lib/events.ts` | pure event derivations: dedupe, cursor, approvals, ledger, trace |
| `src/lib/runtime.ts` | data source (built-in or server), API URL, dev detection (`/dev/health`), RPC and explorer switching |
| `src/lib/builtin.ts` | the in-app world from `shared/sim` |
| `src/lib/relay.ts` | pushes the built-in network to the devstack relay for the web console |
| `src/store.tsx` | polling, pending reconciliation, chat turns |

## Dev mode

With a server chosen, `GET /dev/health` returning 200 switches the RPC to `<api>/dev/rpc`, funds an empty phone key once, replaces BaseScan links by plain hashes, shows "Local test network" in Settings and the `/dev/scenes` sentences as chips in chat (the built-in network shows the same chips).

## Checks

`npm test` (25 tests, includes the co-sign payload and a full auto-play run against the built-in network), `npx tsc --noEmit`, `npx expo-doctor`, `npx expo export --platform web|ios`. Built-in network end to end: `node devstack/e2e/builtin.cjs --url http://localhost:8091` (scenes 1-8 plus intro, card stack and explorer sheet, 34 checks, no server needed). Dev stack end to end: `node devstack/e2e/e2e.cjs` (56 checks; switches the phone to the server with localStorage `cb.source=server`). Screenshots from the end-to-end run: `docs/frontend/screenshots/e2e-phone-*.png`.

## Not verified

Not run on a physical phone or in Expo Go itself (web export and iOS Hermes bundle only): haptics, Liquid Glass, 120 Hz motion, whether the card flight stays in step with the native fade, and iOS edge swipe-back on the pocket page are unverified. No dark mode.
