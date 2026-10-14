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

## Screens

Home ("Ask agent" pill, Testnet chip, pocket total and main wallet balance, round actions, pockets with agent and status, recent activity), Agent (chat; tool steps folded under "Details"), Activity (filters, date groups), Settings (wallet, import key, network, Advanced: Custom server). Stack screens: pocket detail (Add, Return, Revoke round actions, editable cap and ask-me limit, seller switches, worst-case line, history with tx hashes), create wizard (sellers grouped by category). Every owner transaction (create, fund, return, revoke, rule change) shows its tx hash; the agent chat has "Stop agent" and a dead-end card with the sellers tried and a one-tap fix (scene 8). Sheets: approval (slide to approve), question, receipt, add money / return / revoke (hold to revoke).


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

`npm test` (22 tests, includes the co-sign payload), `npx tsc --noEmit`, `npx expo-doctor`, `npx expo export --platform web|ios`. Built-in network end to end: `node devstack/e2e/builtin.cjs --url http://localhost:8091` (scenes 1-8, 23 checks, no server needed). Dev stack end to end: `node devstack/e2e/e2e.cjs` (45 checks; switches the phone to the server with localStorage `cb.source=server`). Screenshots from the end-to-end run: `docs/frontend/screenshots/e2e-phone-*.png`.

## Not verified

Not run on a physical phone or in Expo Go itself (web export and iOS Hermes bundle only). No blur, glass or dark mode is used.
