# ChainBrain phone app (Expo Go)

The owner's app: the team's verified wallet logic in the clean-bank design (design-system/chainbrain/MASTER.md v3, deep teal + navy, light only). Code in `mobile/`.

**No login or setup.** The first launch creates the on-device key silently and opens Home. "Import a key" is in Settings only. On the dev stack the phone key gets test funds by itself.

## Run

```bash
cd mobile && npm ci
EXPO_PUBLIC_API_URL=http://<laptop LAN IP>:8787 npx expo start      # real server
# dev stack (local anvil fork, scripted agent): add EXPO_PUBLIC_RPC_URL=http://<LAN IP>:8787/dev/rpc, or just set the API URL; dev mode is detected from GET /dev/health
```

The API URL can also be changed on the phone: Settings, API URL, Test connection.

## Screens

Home ("Ask agent" pill, Testnet chip, pocket total and main wallet balance, round actions, pockets with agent and status, recent activity), Agent (chat; tool steps folded under "Details"), Activity (filters, date groups), Settings (API URL, wallet, import key, network). Stack screens: pocket detail (Add, Return, Revoke round actions, editable cap and ask-me limit, seller switches, worst-case line, history with tx hashes), create wizard (sellers grouped by category). Every owner transaction (create, fund, return, revoke, rule change) shows its tx hash; the agent chat has "Stop agent" and a dead-end card with the sellers tried and a one-tap fix (scene 8). Sheets: approval (slide to approve), question, receipt, add money / return / revoke (hold to revoke).

**Demo data:** if the API cannot be reached, built-in sample pockets, activity and chat load (`src/lib/demo.ts`), with a quiet "Demo data" line; live data takes over when the API answers.

## Motion and haptics

Spec: [design-system/chainbrain/pages/motion.md](../../design-system/chainbrain/pages/motion.md). Glass tab bar (iOS 26 Liquid Glass, blur on older iOS, solid on Android/web) with a sliding highlight, finger scrubbing and minimize-on-scroll; tabs slide in from the direction of travel and keep their state; sheets with drag physics, rubber-banding and keyboard lift; slide-to-approve and hold-to-revoke with ticks and a drawn success / error mark; rolling-digit balances; staggered first-load reveals; live agent steps with a status mark that draws its check; a calm three-dot working indicator. Rich haptics through `src/haptics.ts` (semantic, throttled). Everything honours Reduce Motion and Reduce Transparency.

## Where the logic is

| File | What |
| --- | --- |
| `src/lib/wallet.ts` | owner key calls: factory create, USDC fund, revoke, returnFunds, setSeller, co-sign |
| `src/lib/events.ts` | pure event derivations: dedupe, cursor, approvals, ledger, trace |
| `src/lib/runtime.ts` | API URL, dev detection (`/dev/health`), RPC and explorer switching |
| `src/store.tsx` | polling, pending reconciliation, chat turns |

## Dev mode

`GET /dev/health` returning 200 switches the RPC to `<api>/dev/rpc`, funds an empty phone key once, replaces BaseScan links by plain hashes, shows "Local test network" in Settings and the `/dev/scenes` sentences as chips in chat.

## Checks

`npm test` (22 tests, includes the co-sign payload), `npx tsc --noEmit`, `npx expo-doctor`, `npx expo export --platform web|ios`. Screenshots from the end-to-end run: `docs/frontend/screenshots/e2e-phone-*.png`.

## Not verified

Not run on a physical phone or in Expo Go itself (web export and iOS Hermes bundle only). No blur, glass or dark mode is used.
