# ChainBrain phone app (Expo Go)

One app: the team's verified wallet logic with the ChainBrain look. Code in `mobile/`.

## Run

```bash
cd mobile && npm ci
EXPO_PUBLIC_API_URL=http://<laptop LAN IP>:8787 npx expo start      # real server
# dev stack (local anvil fork, scripted agent): add EXPO_PUBLIC_RPC_URL=http://<LAN IP>:8787/dev/rpc, or just set the API URL; dev mode is detected from GET /dev/health
```

The API URL can also be changed on the phone: Settings, API URL, Test connection.

## Screens

Home (agent funds, pockets, approvals banner), Agent (chat, per-turn trace, intent card, question), Activity (payments, refusals, data requests, approvals), Settings (API URL, owner key, test funds in dev mode, theme). Stack screens: pocket detail (hold to revoke, return, fund, seller switches), create wizard (create then fund, resumable). Sheets: approval (intent confirm, slide to co-sign), question, receipt, fund/return/revoke.

## Where the logic is

| File | What |
| --- | --- |
| `src/lib/wallet.ts` | owner key calls: factory create, USDC fund, revoke, returnFunds, setSeller, co-sign |
| `src/lib/events.ts` | pure event derivations: dedupe, cursor, approvals, ledger, trace |
| `src/lib/runtime.ts` | API URL, dev detection (`/dev/health`), RPC and explorer switching |
| `src/store.tsx` | polling, pending reconciliation, chat turns |

## Dev mode

`GET /dev/health` returning 200 switches the RPC to `<api>/dev/rpc`, shows a LOCAL FORK badge, replaces BaseScan links by plain hashes, offers "Get test funds" and shows the `/dev/scenes` sentences as chips in chat.

## Checks

`npm test` (15 tests, includes the co-sign payload), `npx tsc --noEmit`, `npx expo-doctor`, `npx expo export --platform web|ios`. Screenshots (web export at 390x844, against the dev stack): `docs/frontend/screenshots/phone-*-{dark,light}.png`.

## Not verified

Not run on a physical phone or in Expo Go itself (web export and iOS Hermes bundle only). The app no longer uses blur or Liquid Glass (Ink & jade design, solid surfaces).
