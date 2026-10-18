# Independent pocket verifier

`verify_pocket.py` reads a pocket's rules straight from the chain, says them in plain English, and checks them against what the owner approved. It answers one question without trusting ChainBrain's server or apps: does the contract hold the rules the owner agreed to?

It is independent of the rest of the stack on purpose:
- **Python 3 standard library only.** No pip installs. JSON-RPC uses `urllib`.
- **No shared code.** It has its own Keccak-256, ABI encoding and decoding. It reads only the chain, never the wallet API.
- **Read-only.** It sends `eth_getCode`, `eth_call` and `eth_getLogs` and nothing else. It never sends a transaction.

## Usage

```bash
python3 verify/verify_pocket.py --rpc https://fisco-node-production.up.railway.app --pocket 0xPOCKET
python3 verify/verify_pocket.py --rpc http://127.0.0.1:8545 --pocket 0xPOCKET --approved approved.json
python3 verify/verify_pocket.py --rpc ... --pocket ... --approved approved.json --json   # machine-readable
python3 -m unittest verify/test_verify.py                                              # its own tests
```

Exit codes: `0` every approved field matches (or no `--approved` given), `1` a mismatch, `2` an RPC or input error.

## What it reads

| Rule | Read from |
| --- | --- |
| Token, owner, agent, guardian | `token()`, `owner()`, `agent()`, `guardian()` |
| Per-payment cap | `perPaymentCap()` |
| Owner co-sign threshold | `askAbove()` (max uint = never asks) |
| Expiry, revoked, frozen | `expiresAt()`, `revoked()`, `frozen()` |
| Period allowance | `periodKind()` (1 day, 2 week, 3 month, Hong Kong calendar), `periodLimit()`, `spentThisPeriod()` |
| Allowed sellers | Every `SellerSet(address,bool)` log since block 0, each confirmed with `sellerAllowed(address)` |
| Per-seller caps | `SellerCapSet(address,uint256)` logs, confirmed with `sellerCap(address)` |
| Balance (the budget) | the token's `balanceOf(pocket)`, `symbol()`, `decimals()` |

Amounts are 6-decimal Mock e-HKD units, shown as HK$.

**Older pockets.** Pockets deployed before the period allowance and seller events existed have no `periodKind()` and emit no `SellerSet` logs. The tool doesn't crash on them:
- It reports those fields as "not available on this pocket's contract version".
- It checks the approved sellers one by one with `sellerAllowed`.
- It flags that extra sellers can't be ruled out.

**FISCO BCOS:** `eth_getCode` returns pseudo-code starting with `[PRECOMPILED]` for accounts the node tracks. The tool treats that as "not a contract", so a wrong address is caught.

## approved.json

Every field is optional. Only the fields given are compared.

```json
{
  "pocket": "0x5f6e2aae4fa5947395a293870efd495c826fc91c",
  "owner": "0x...",
  "agent": "0xb01096130a3b4c5a5d145309a4cb784b73d5accf",
  "guardian": "0x...",
  "sellers": ["0xdb0a6587928059b0d7512537d24b27395ed77e4d", "0xdf1c7931192088240430d28f9a7ce92397677545"],
  "cap": "15.00",
  "askAbove": "8.00",
  "expiresAt": 1792512000,
  "period": { "kind": "week", "limit": "0.40" },
  "sellerCaps": { "0xdf1c7931192088240430d28f9a7ce92397677545": "3.00" },
  "revoked": false,
  "frozen": false
}
```

| Field | Meaning |
| --- | --- |
| `cap`, `askAbove`, `period.limit`, `sellerCaps` values | HK$ strings |
| `askAbove` | `"never"` means no owner co-sign |
| `expiresAt` | Unix seconds |
| `period` | `{kind: day \| week \| month, limit}`, or `null` for no allowance |

On `sellers`, every approved seller must be allowed on chain, and any extra seller allowed on chain is a mismatch.

## Example: the hosted chain

```
$ python3 verify/verify_pocket.py --rpc https://fisco-node-production.up.railway.app --pocket 0x5f6e2aae4fa5947395a293870efd495c826fc91c --approved approved.json
Pocket 0x5f6e2aae4fa5947395a293870efd495c826fc91c (read from https://fisco-node-production.up.railway.app)
  - The agent 0xb010..accf may pay at most HK$15.00 per payment, from this pocket only.
  - Allowed sellers: the list from logs is not available on this pocket's contract version; checked only the sellers given.
  - Payments above HK$8.00 also need the owner's signature.
  - Period allowance: not available on this pocket's contract version.
  - Expires 2026-10-18 15:34 HKT.
  - Guardian 0xfdeb..7c2c can only freeze it: it can never move money, unfreeze or change a rule.
  - Owner 0xc95d..c00f alone can change rules, unfreeze, revoke or take the money back.
  - Balance: HK$26.00 eHKD (the budget: the agent can never spend more).
Against what the owner approved:
  MATCH    pocket: approved 0x5f6e2aae4fa5947395a293870efd495c826fc91c
  MISMATCH cap: approved HK$2.00, on chain HK$15.00
  ...
MISMATCH: the chain does not hold what the owner approved.
```

On a pocket with the current contract, the period line reads, for example: "At most HK$0.40 per week (Hong Kong time, from Monday 00:00); HK$0.10 spent this week. Beyond that a payment also needs the owner's signature." The seller line lists each allowed seller with its own cap.
