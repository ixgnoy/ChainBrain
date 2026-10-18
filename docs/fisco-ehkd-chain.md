# FISCO BCOS + Mock e-HKD: chain usage guide

Last updated: 2026-10-17

ChainBrain runs on its own FISCO BCOS 3.16.4 chain (chain id 20200) with a demo token, Mock e-HKD (`eHKD`, 6 decimals). There is a hosted chain on Railway that anyone can use, and a local chain for development. This page lists the endpoints, the addresses, how to get test eHKD from the faucet, how to read the chain in the explorer, and the FISCO quirks to know when you send transactions.

> **Mock e-HKD is not the HKMA e-HKD and not money.** `MockEHKD` is a demo ERC-20 with EIP-3009 that we deploy ourselves; its owner can mint at will.

## Quick facts

| | Value |
| --- | --- |
| Chain | FISCO BCOS 3.16.4, 1 node, web3 JSON-RPC |
| Chain ID | `20200` (`0x4ee8`) |
| Native currency symbol | `FISCO` (18 decimals; only needed so an address may send) |
| Gas price | `0` (gas is free) |
| Token | Mock e-HKD, symbol `eHKD`, 6 decimals: `0x0355c0c5Afe2A35369056FBB854903A4aF07781A` |
| Pocket factory | `0x03aB4C311eeE7C3295c63F910D79a07Ffa7A097A` |
| Prices in the apps | HK$ (1 eHKD = HK$1) |

The token and factory addresses are the same on the hosted chain and on a fresh local chain: they are the OWNER key's first two deployments (nonce 0 and 1), committed in `contracts/deployments/`.

## Endpoints

### Hosted chain (Railway)

| Service | URL | What it does |
| --- | --- | --- |
| RPC node (`fisco-node`) | https://fisco-node-production.up.railway.app | JSON-RPC: `POST /` (CORS open). `GET /health` returns 200 when the node answers. |
| Wallet API (`fisco-api`) | https://fisco-api-production-85c5.up.railway.app | Wallet and agent API, chain config at `/api/config` |
| Explorer | https://fisco-api-production-85c5.up.railway.app/explorer | Read-only block explorer for this chain |
| Faucet | https://fisco-api-production-85c5.up.railway.app/faucet | Mints HK$100 eHKD to an address |
| Sellers (`fisco-sellers`) | https://fisco-sellers-production.up.railway.app | x402 test sellers, with the facilitator in-process |
| Web console | https://fintechathon-lian-ai-nao.vercel.app | The network console. The Faucet tab is at `/#faucet`. |

### Local chain

| Service | URL |
| --- | --- |
| RPC node | `http://127.0.0.1:8545` (the default for `FISCO_RPC`) |
| Wallet API | `http://localhost:8787` (explorer at `/explorer`, faucet at `/faucet`) |
| Sellers | `http://localhost:4021` |

Set up the local chain once, then start and stop it:

```bash
bash scripts/fisco/setup.sh              # downloads FISCO BCOS v3.16.4 into .fisco/ (gitignored), builds a 1-node chain, RPC on :8545
bash scripts/fisco/deploy.sh             # funds OWNER/FACILITATOR/FORCE, deploys MockEHKD + PocketFactory, mints HK$10,000 eHKD to OWNER
bash scripts/fisco/fund.sh 0xYOUR_ADDR   # lets another address send transactions (native balance)
bash scripts/fisco/start.sh              # later sessions
bash scripts/fisco/stop.sh
```

To point the server, devstack or a script at the hosted chain instead, set `FISCO_RPC=https://fisco-node-production.up.railway.app`.

## Add the chain to MetaMask

The quickest way is the faucet. Open the Faucet tab in the console (or `/faucet` on the API) and press **Use MetaMask**: it connects your account, adds the network with `wallet_addEthereumChain`, and adds eHKD as a token.

To add it by hand (Settings, Networks, Add a network manually):

| Field | Hosted chain | Local chain |
| --- | --- | --- |
| Network name | FISCO BCOS (ChainBrain demo) | FISCO BCOS (local) |
| RPC URL | `https://fisco-node-production.up.railway.app` | `http://127.0.0.1:8545` |
| Chain ID | `20200` | `20200` |
| Currency symbol | `FISCO` | `FISCO` |
| Block explorer | `https://fisco-api-production-85c5.up.railway.app/explorer` | `http://localhost:8787/explorer` |

Then import the token: address `0x0355c0c5Afe2A35369056FBB854903A4aF07781A`, symbol `eHKD`, decimals `6`.

## Faucet

The faucet gives HK$100 eHKD per claim. It also credits a native balance when the address has none, because the chain refuses senders whose native balance is 0.

| Where | How |
| --- | --- |
| Web console | **Faucet** tab: paste an address or press Use MetaMask, then **Send me HK$100** |
| Server page | `GET /faucet` on the wallet API |
| API | `POST /api/faucet` with body `{"address": "0x..."}` |
| Settings | `GET /api/faucet/info` returns chain id, RPC, explorer, token, decimals and the amount |

```bash
curl -s -X POST https://fisco-api-production-85c5.up.railway.app/api/faucet \
  -H 'content-type: application/json' -d '{"address":"0xYOUR_ADDRESS"}'
# {"ok":true,"tx":"0x...","minted":"100.00","nativeFunded":true,"explorer":".../explorer#/tx/0x..."}
```

**Limits:**
- One claim per address per 24 hours.
- 10 claims per IP address per hour.
- The limits live in memory, so a server restart resets them.
- A failed mint does not use up the address's claim.
- `FAUCET_AMOUNT` on the server changes the amount (default `100`).

| Error | HTTP | Meaning |
| --- | --- | --- |
| `BAD_ADDRESS` | 400 | Not a 0x address with 40 hex characters |
| `ALREADY_CLAIMED` | 429 | This address claimed in the last 24 h; `retryAfterSec` says when it can claim again |
| `TOO_MANY_REQUESTS` | 429 | More than 10 claims from your IP in the last hour |
| `FAUCET_FAILED` | 500 | The mint failed; `detail` has the first line of the error |

## Explorer

FISCO has no public explorer, so the wallet API serves its own read-only one at `/explorer`. It shows the latest blocks, transactions with decoded eHKD and pocket events, and addresses with their native and eHKD balances. Known addresses carry labels, such as "Mock e-HKD token", "Pocket factory", "Agent key" and "Seller: DataLite".

**Page links:**
- `/explorer#/tx/<hash>`
- `/explorer#/address/<address>`
- `/explorer#/block/<number>`
- MetaMask-style paths (`/explorer/tx/<hash>`, `/explorer/address/<addr>`, `/explorer/block/<n>`) redirect to the matching `#/` page. This means the explorer works as MetaMask's block explorer URL.

The web console has its own Explorer tab (`/#explorer`) that reads the same data.

**JSON API**, on the wallet API:

| Endpoint | Returns |
| --- | --- |
| `GET /api/explorer/summary` | chain, chain id, latest block, token address, eHKD total supply, address labels |
| `GET /api/explorer/blocks?limit=15&before=<n>` | recent blocks, newest first (limit up to 50) |
| `GET /api/explorer/block/<n>` | one block with its transactions |
| `GET /api/explorer/tx/<hash>` | status, block, time, from, to, nonce, input, gas used, decoded logs |
| `GET /api/explorer/address/<addr>` | native and eHKD balance, nonce, whether it is a contract, pocket settings if it is a pocket, and its recent transactions (up to 50, from a scan of recent blocks) |

## Pocket rules on-chain

Each pocket enforces these rules in `Pocket.sol`:
- **Per-payment cap.** A seller can have its own cap that replaces the pocket's (`setSellerCap`).
- **Seller allowlist.**
- **Ask-me limit.** Payments above it also need the owner's signature.
- **Expiry.**
- **Period allowance.** At most `periodLimit` per day, week or month, in Hong Kong calendar time, set with `setPeriodLimit(kind, limit)`.
- **Freeze and revoke.**

**How the allowance is counted:** `isValidSignature` is view-only, so the pocket can't count spend there. Instead, after every authorized transfer out of a pocket, Mock e-HKD calls `pocket.onSpend(to, value)`. The token gives that call a fixed 100,000 gas and refuses the payment if less is left, so a caller can't starve the count. Over the allowance, `canPay` returns `OVER_PERIOD`, and the payment settles only with the owner's co-signature. A real e-HKD would need the same settlement hook.

Every allowlist and seller-cap change is emitted as `SellerSet` or `SellerCapSet`, so the rules can be rebuilt from logs alone. That is what `verify/verify_pocket.py` does.

## Using the chain from code

The chain speaks the Ethereum JSON-RPC, so viem, ethers, `cast` and MetaMask work. These FISCO differences apply:

- **Senders need a native balance.** Gas is free, but the RPC refuses a sender with 0 balance. Fund an address with the faucet, with `scripts/fisco/fund.sh` locally, or with the node's `POST /admin/fund` (needs the node's `FUND_TOKEN`).
- **Use legacy transactions with gas price 0.** Send type-0 transactions with `gasPrice: 0`. Do not use EIP-1559 fee fields.
- **Send a sender's transactions one at a time.** FISCO does not order a sender's pending transactions by nonce, so wait for each receipt before sending the next.
- **`block.timestamp` is in milliseconds.** Contracts read time through `Clock.nowSec()`, which divides by 1000. Off-chain code should do the same when it reads block times.
- **`eth_getLogs` needs `toBlock`, `address` and `topics`, and loses logs on wide ranges.** The node rejects a filter missing any of them, and a range of more than a few blocks silently returns only part of the logs. The hosted RPC gateway fills the defaults and scans in 5-block windows, so clients there get every log. Against a bare local node, query in windows of 5 blocks yourself (`verify/verify_pocket.py` does).
- **Some addresses look like contracts.** For accounts the node tracks, `eth_getCode` can return a pseudo-code string starting with `[PRECOMPILED]`. Treat it as "not a contract".
- **EIP-712 signing domain for eHKD** (EIP-3009 `transferWithAuthorization`, used by x402): name `Mock e-HKD`, version `1`, chainId `20200`, verifyingContract = the token address.

viem:

```ts
import { createPublicClient, createWalletClient, defineChain, http, parseUnits, erc20Abi } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const fisco = defineChain({
  id: 20200, name: "FISCO BCOS (ChainBrain demo)",
  nativeCurrency: { name: "FISCO", symbol: "FISCO", decimals: 18 },
  rpcUrls: { default: { http: ["https://fisco-node-production.up.railway.app"] } },
});
const EHKD = "0x0355c0c5Afe2A35369056FBB854903A4aF07781A";

const pub = createPublicClient({ chain: fisco, transport: http() });
const wallet = createWalletClient({ account: privateKeyToAccount(process.env.PK as `0x${string}`), chain: fisco, transport: http() });

const balance = await pub.readContract({ address: EHKD, abi: erc20Abi, functionName: "balanceOf", args: [wallet.account.address] });
const hash = await wallet.writeContract({
  address: EHKD, abi: erc20Abi, functionName: "transfer",
  args: ["0xRECIPIENT", parseUnits("12.50", 6)],   // HK$12.50
  type: "legacy", gasPrice: 0n,
});
await pub.waitForTransactionReceipt({ hash });
```

Foundry `cast`:

```bash
RPC=https://fisco-node-production.up.railway.app
EHKD=0x0355c0c5Afe2A35369056FBB854903A4aF07781A
cast chain-id --rpc-url $RPC                                       # 20200
cast call $EHKD "balanceOf(address)(uint256)" 0xYOUR_ADDRESS --rpc-url $RPC
cast send $EHKD "transfer(address,uint256)" 0xRECIPIENT 12500000 \
  --rpc-url $RPC --private-key $PK --legacy --gas-price 0           # HK$12.50
```

Apps should not hard-code the chain. The web console, the Expo app and the Android app read the RPC, the explorer link prefix and the token from the wallet API's `GET /api/config`.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| The RPC rejects a transaction from a new address | The address has 0 native balance | Claim from the faucet, or run `fund.sh` |
| MetaMask shows a fee or fails to estimate | It is sending EIP-1559 fees | Set gas price 0 (legacy) in advanced gas settings |
| Second transaction stuck or rejected | Two transactions from one sender were in flight | Send one at a time and wait for each receipt |
| Times look about 1000× too far in the future | Block timestamps are in ms | Divide by 1000 |
| Faucet says `ALREADY_CLAIMED` | One claim per address per 24 h | Use another address, or wait `retryAfterSec` |
| Explorer or API returns 500 just after a deploy | The sellers service is still starting | Wait a minute and retry |
| Railway node `/health` not 200 | The node is starting or down | Check the `fisco-node` service logs on Railway |
