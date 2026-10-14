# Network console (web/)

The whole ChainBrain system on one screen, for the laptop demo, the judges and the presenter. The owner's own app is the phone (`mobile/`); the console shows what the phone, the agent, the pockets, the sellers and the chain are doing, together. React 19, Tailwind v4, viem (read-only), Radix dialog, lucide icons. Design: [design-system/chainbrain/MASTER.md](../../design-system/chainbrain/MASTER.md) (v3: deep teal + navy, light only).

| Tab | Shows | Spec link |
| --- | --- | --- |
| **Live** (default) | Three columns. Agent trace: every tool call, its result, the rule it hit and the reason code (e.g. `SELLER_NOT_ALLOWED`), seller content quarantined as data and flagged when it looks like an instruction. The pocket: balance, status, cap, ask-me, expiry, allowed sellers, "worst case" line and its on-chain history with tx hashes. Sellers: what each shop saw from this pocket. Follows the pocket the agent touched last unless one is picked. | "Demo layout: chat with trace on the left, the active pocket on the right"; "judges watch the decision being made" |
| **Pockets** | Every pocket the factory created, read from the chain: owner, balance, rules, status | "Home: pockets as cards with balance, agent and status" |
| **Sellers** | The seller's side (finals preview): earnings, sales and refused attempts in plain language, catalogue | Finals roadmap "seller console" |
| **On-chain** | Every transaction (create, fund, payment, revoke, return, rule change) with its hash, linked to BaseScan on the real chain; forced transfers that reverted | "Every on-chain action shows its tx hash with a link to the block explorer" |
| **Judges** | Red-team box (plant text in a seller's next response), forced transfer past the agent (scene 5 backstop, dev stack), the eight demo scenes with copyable sentences and expected outcomes | "Red-team box"; "Live testing" |

- **No login.** Nothing to connect: the console only reads (events stream, `/api/config`, the chain).
- **Chain reads:** pockets from the factory's `PocketCreated` logs, rules and balances from the pocket contracts, history from USDC `Transfer` and pocket `Revoked` / `RulesChanged` logs (`src/console/chain.ts`). RPC: `<api>/dev/rpc` on the dev stack, `VITE_RPC_URL` (default `https://sepolia.base.org`) otherwise.
- **Testnet chip** on every page: "Testnet · Base Sepolia · no real money".
- **Demo data** when the wallet API cannot be reached (sample sellers' sales); live data takes over when it answers.

Fill a running dev stack with real purchases: `pnpm --dir devstack seed`.

Commands: `pnpm --dir web dev`, `build`, `lint`, `test`.
