# Demo runbook: phone + console, scenes 1-8
Last updated: 2026-10-15

How to run the live demo on stage, or record the video, with nothing but a laptop and an iPhone. Both apps open on their **built-in network** (the wallet API, tool layer, agent and Pocket.sol rules running in the app), so no chain, server, model key or Wi-Fi to the internet is needed. Built-in hashes are not on Base Sepolia; for the evidence table use hashes from a real run ([evidence](../evidence.md)), and say so if asked.

## Set up (5 minutes before)

| Where | Command | What you should see |
| --- | --- | --- |
| Laptop, terminal 1 | `pnpm --dir devstack relay` | `ChainBrain relay on http://localhost:8787 (phone: http://<LAN-IP>:8787)` |
| Laptop, terminal 2 | `pnpm --dir web dev` then open `http://localhost:5173/#present` | Console in presenter mode, story already playing on its own network |
| Phone (Expo Go) | `cd mobile && EXPO_PUBLIC_API_URL=http://<LAN-IP>:8787 npx expo start`, scan the QR | Home with Research data (US$7.85) and One purchase (US$0.20), main wallet US$54.80 |

Phone and laptop on the same Wi-Fi. The moment the phone app is open, the console switches to it: "Following your phone" appears and the pocket picker shows the phone's pockets with a PHONE tag. Haptics and Liquid Glass only show on the real phone.

To start fresh: reload the phone app (shake, Reload). The console drops the old phone's pockets by itself.

## The 5 minutes

The stepper at the bottom of the console (1 to 8) types each scene on the phone when you press **Play**, and tells you what to do next on the phone ("Next on the phone: Slide to approve"). You can also tap the suggestion chips on the phone.

| # | Do | Judges see (phone / console) | Scored |
| --- | --- | --- | --- |
| 1 | Phone: Home, Pocket, Research data preset, Continue x6 (the shield line shows the worst case as you go), slide to create and fund. Then Play 1. Tap **US$2 per report**, confirm the task | Create + fund hashes; one question, two one-tap answers; intent card from the fixed template; console trace and evidence strip | Task hashes, one clarifying question |
| 2-3 | (Same conversation) DataLite is paid on its own; the approval sheet opens for DataPro US$1.50: **Slide to approve** | "Paid DataLite" card; co-sign sheet with NEEDS_OWNER_APPROVAL; "Co-signed by you"; Sellers column +US$1.50 owner co-signed | Pre-payment check, human in the loop |
| 4 | Play 4, confirm | Refusal card SELLER_NOT_ALLOWED (marked Expected on the console), agent re-plans, DataLite fruit report US$0.35 | Overreach blocked, error correction |
| 5 | Optional: Judges tab, plant text in ShadyFeed. Play 5, confirm. Then Judges, **Force the transfer** | "ShadyFeed tried to give your agent an order", quoted, IGNORED; disclosure card; console injection verdict; forced transfer reverts on-chain with a hash, balance unchanged, phone toast | Prompt injection, induced transfer |
| 6 | Play 6 | ShadyFeed asked for name, email, wallet history and a signature: DISCLOSURE_REFUSED, SIGNATURE_TYPE_NOT_ALLOWED, nothing paid | Data extraction, signature phishing |
| 7 | Play 7, confirm. After "Paid DataLite", phone header **Stop**, hold to revoke | Second payment refused POCKET_REVOKED; "Agent stopped" card with the revoke hash; Return funds | Kill switch, graceful stop |
| 8 | Phone header: tap the pocket name, pick **One purchase**. Play 8, confirm | "Nothing was bought" card: OVER_CAP, SELLER_NOT_ALLOWED; tap **Raise cap and budget to US$0.30**, slide, then **Ask again**: paid; the old card now reads "Fixed" | Safe fallback, one-tap fix |

Close on the console Live: the worst-case bar ("can lose at most US$X, only to DataLite and DataPro") and the evidence strip (paid, co-signed, refused, injections ignored, transfers reverted).

## If something goes wrong

- **Console not following the phone:** check the phone was started with `EXPO_PUBLIC_API_URL` set to the laptop's LAN IP and that terminal 1 is running. Without the relay, each app still tells the whole story alone: drive the phone with its chips and show the console's own story.
- **Phone shows an old state:** shake, Reload. A fresh launch is always the same lived-in start.
- **Want real chain evidence live:** phone Settings, Advanced, Custom server (laptop's dev stack `pnpm --dir devstack start`, or a deployed server); console gear, Custom server. Explorer links appear only against a public-chain server.

Screenshots of every step on the phone: `docs/frontend/screenshots/builtin/` (from `node devstack/e2e/builtin.cjs --shots docs/frontend/screenshots/builtin`).
