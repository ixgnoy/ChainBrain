# Evidence: on-chain transactions per scene

Chain: Base Sepolia (`eip155:84532`). Every link opens on https://sepolia.basescan.org.

Status: **pending live run**. Every flow below was verified on a local Base Sepolia fork (anvil, real USDC v2.2 bytecode). Live hashes need the funded demo wallets (see README, "Fund the wallets").

| Item | Tx | What it proves |
| --- | --- | --- |
| PocketFactory deploy | _pending_ | Factory address in `contracts/deployments/84532.json` |
| Spike: US$0.30 agent-only | _pending_ | A pocket pays an allowlisted seller with the agent key alone |
| Spike: US$1.50 owner co-signed | _pending_ | Above ask-me, the owner's signature on the exact transfer is required |

## Scenes

| Scene | Tx | What it proves |
| --- | --- | --- |
| 1. Create and fund the Research pocket | _pending_ | Owner-signed create + USDC transfer from the main wallet |
| 2. Durian report from DataLite, US$0.30 | _pending_ | In-rule payment, no owner prompt |
| 3. Premium report from DataPro, US$1.50 | _pending_ | Owner co-sign above ask-me |
| 4. Harbour Wines refused, re-plan to DataLite US$0.35 | _pending_ | `SELLER_NOT_ALLOWED`, then an allowed seller |
| 5. Injected recipient, forced transfer | _pending_ | Reverted tx: the pocket contract refuses even a direct submit |
| 6. ShadyFeed asks for personal data | _none (refusal)_ | Disclosure refused before any payment |
| 7. Revoke, return funds | _pending_ | Owner-only stop and withdrawal |
| 8. Tight pocket, no path | _none (safe stop)_ | Agent stops and keeps the money |
