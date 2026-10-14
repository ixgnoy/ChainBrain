# Web console (web/)

The owner and ops console for the Agent Wallet. React 19, Tailwind v4 tokens, Radix dialog and tooltip, viem. It talks to the real server (`/api/*`) and to the chain through the owner's EIP-1193 wallet.

- Operate view: agent chat (per-turn trace, intent card, agent question, disclosure banner), live trace (filters, reason badges), pocket pane (rules with inline edit, allowed sellers, revoke, return funds, ledger), sellers and red-team box. A payment above the ask-me amount opens an approval dialog where the owner signs the USDC TransferWithAuthorization.
- Bank / Compliance view: payments ledger, refusals by reason code, controls in force (read from each pocket contract), security events, regulator read-only role (pseudonymised ids, no owner text), JSON and CSV export with SHA-256, convention alignment as a self-assessment. FISCO BCOS anchoring is shown as planned only. The bank name is a hypothetical demo.
- Dev mode: when `GET /dev/health` answers, the app shows a LOCAL FORK badge, turns BaseScan links into plain hashes, offers a "Dev signer" that forwards to `/dev/rpc`, and shows demo-scene chips from `/dev/scenes`. On the real server none of this appears.
- Stream quirks handled: replayed SSE data is de-duplicated, approvals are reduced by id (last event wins) and reconciled with `GET /api/pending`, the duplicate `tool` phase is ignored, the final reply is not shown twice, and `/api/chat` has no client timeout.

Commands: `pnpm --dir web dev`, `build`, `lint`, `test`, and `screenshots` (needs `vite --port 5188` running; uses stubs, writes `docs/frontend/screenshots/web-*.png`).
