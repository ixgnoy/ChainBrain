# Seller dashboard (web/)

What a shop selling to AI agents sees. React 19, Tailwind v4, Radix dialog, lucide icons. Design: [design-system/chainbrain/MASTER.md](../../design-system/chainbrain/MASTER.md) (v2, clean bank, light only).

- **No login.** The shop is picked from the switcher in the sidebar (or top bar on narrow screens) and remembered in this browser.
- **Overview:** earnings from agents, payments and buyer count, average sale, attempts refused by buyers' wallets, recent sales, a short "how agent payments work" note.
- **Sales:** every agent purchase and every refused attempt, grouped by day, filter All / Paid / Refused. Refusals are explained from the seller's side ("The buyer's pocket doesn't allow your shop", "You asked for buyer data; the wallet refused"); reason codes, pocket address and tx hash sit under "Technical details" in the detail sheet.
- **Catalogue:** items and prices the agents see, and the payout address.
- **Response content:** the red-team box as a seller control: text the shop adds to its next response (Plant / Clear via the sellers server's `/admin/inject`).
- **Data:** `GET /api/config` (sellers) and the event stream `GET /api/events`, reduced per seller (`src/seller/data.ts`).
- **Demo data:** if the wallet API cannot be reached, the dashboard opens with built-in sample data (`src/seller/demo.ts`) and says "Demo data" in the sidebar; it switches to live data by itself when the API answers.

Fill a running dev stack with real purchases to look at: `pnpm --dir devstack seed`.

Commands: `pnpm --dir web dev`, `build`, `lint`, `test`.
