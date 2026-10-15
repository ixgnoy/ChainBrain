# ChainBrain on FISCO BCOS with a mock e-HKD: Port Plan

Branch: `feat/fisco-bcos-ehkd`. Decisions (owner, 15 Oct):
- **Network:** local FISCO BCOS 3.x (v3.16.4, macOS arm64 binary, Air version), Ethereum-compatible web3 RPC on `:8545`, web3 chain id **20200**.
- **Scope:** one chain switch `CHAIN=fisco | base-sepolia` across contracts, server, web, Expo and Kotlin. **FISCO is the default** on this branch; the Base Sepolia path and its tests keep working.
- **Crypto:** ECDSA secp256k1 (non-国密), so viem, web3j, MetaMask and the pocket's ecrecover are unchanged.
- **Token:** `MockEHKD`, name "Mock e-HKD", symbol `eHKD`, **6 decimals**, EIP-3009 with the ERC-1271 bytes-signature overload (as USDC v2.2), owner-only mint. Labelled a mock everywhere; it is not the HKMA e-HKD.
- **Prices (HK$):** DataLite durian 2.30, fruit trade 2.70; DataPro premium 11.70; Harbour Wines 3.10. Research pocket HK$40, cap 15, ask above 8. Tight pocket HK$1.50, cap 1.50, DataLite only. One purchase = exact price 2.30.
- **Facilitator:** in-process (`FACILITATOR=local`) on FISCO; the hosted one doesn't know the chain.
- **Tx links:** FISCO has no public explorer: `GET /api/tx/:hash` on the wallet API returns the receipt; apps link there.
- **Hash validation:** `server/scripts/verify-evidence.ts` re-fetches every recorded hash from the chain and checks status, block, and the expected event.
- Commits: personal email, no co-author lines.

## Steps

- [x] **F1 Local chain.** `scripts/fisco/{setup,start,stop}.sh`: download v3.16.4 binary + `build_chain.sh` into `.fisco/` (gitignored), build a 1-node group, enable `[web3_rpc]`, set the executor version for Ethereum compatibility, start. Verify with viem: `eth_chainId` = 20200, deploy a contract, read its receipt. Record every RPC gap found (fee fields, estimateGas, tx type) in this plan.
  > Done: `scripts/fisco/setup.sh` builds v3.16.4 (Air, 1 node) from scratch; viem deploys and reads a contract with both EIP-1559 and legacy txs (`eth_chainId` 0x4ee8, gas price 0, `eth_estimateGas` works). **RPC gaps found:**
  > 1. web3 `eth_sendRawTransaction` rejects any sender with native balance 0 (`InsufficientFunds`, bcos-rpc `checkSenderBalance`), regardless of gas price. Fix: genesis `[features] feature_balance=1, feature_balance_precompiled=1`, chain built in auth mode with the console account as governor, then `scripts/fisco/fund.sh <addr>` (console `addBalance`). Every sender (owner, facilitator, force script, app keys) must be funded once.
  > 2. Genesis `alloc` is not parsed in 3.16.4 (`NodeConfig::loadAlloc` reads it as features), so balances can't be pre-set.
  > 3. `executor.version=2` in the genesis crashes the node on start (`std::out_of_range`); version 1 works with the web3 RPC.
- [x] **F2 Token contract.** `contracts/src/MockEHKD.sol` + `contracts/test/MockEHKD.t.sol` (EOA and ERC-1271 authorizations, replay, expiry, cancel, mint only owner). `contracts/test/Pocket.ehkd.t.sol`: the 20 pocket cases against a locally deployed MockEHKD (no fork). Base fork tests still pass.
  > Done: `forge test`: MockEHKD 6/6, the 20 pocket cases against MockEHKD 20/20 (`Pocket.ehkd.t.sol`), Base fork 20/20 (cases moved into `abstract contract PocketCases`).
- [x] **F3 Deploy to FISCO.** Deploy MockEHKD + PocketFactory on the local chain, mint to OWNER, write `contracts/deployments/20200.json` (`PocketFactory`, `Token`). Verify code at both addresses.
  > Done: `scripts/fisco/deploy.sh` (funds OWNER, FACILITATOR, FORCE; deploys; checks code). Token `0x0355…781A` (11,441 chars of code), factory `0x03aB…097A` (10,687), OWNER holds 10,000 eHKD; 3 receipts status 0x1. **Gap 4:** no `eth_feeHistory`, so forge needs `--legacy --with-gas-price 0`. Addresses are deterministic on a fresh chain (first txs from OWNER).
- [x] **F4 Server chain switch.** `server/src/chains.ts` (id, rpc, token, EIP-712 domain, currency label, tx URL, x402 network). Replace every hard-coded USDC / Base Sepolia / 84532 in server code, scripts and test helpers. Price sheet per currency. `/api/config` exposes the chain. `/api/tx/:hash`.
  > Done: `CHAIN=fisco|base-sepolia` (`cfg()`, read per call); sellers price as an x402 AssetAmount `{amount, asset, extra: domain}` from `sellers.json` `price.{usd,hkd}`; client spend controls via `allowedAssets` (atomic cap = pocket cap), since x402's default assets don't include eHKD; FISCO always uses the in-process facilitator (hosted one rejects the route config for eip155:20200); `/api/config` returns `token` + `chain` (id, rpc, network, domain, currency, txUrl); `/api/tx/:hash` re-reads the receipt; scripts and presets per chain (`presets()`). `money.ts` renamed parseAmount/formatAmount. **Gaps found:**
  > 5. FISCO gives contracts `block.timestamp` in **milliseconds** (its RPC block header says seconds): every pocket looked expired and every authorization expired. Fix: `contracts/src/Clock.sol` `nowSec()` (ms if > 1e11) used by Pocket and MockEHKD; no-op on Ethereum chains; new `PocketEhkdMsClockTest` runs the 20 pocket cases on a ms clock. Chain rebuilt and redeployed (same deterministic addresses).
  > 6. FISCO does not order one sender's txs by nonce inside a block (the mint ran before the token's create in the same block and failed). Fix: `forge script --slow` in `deploy.sh`; server code already waits for each receipt.
- [x] **F5 Server tests on both chains.** Test harness starts against the local FISCO node (fresh deploy per run) when `CHAIN=fisco`, the Base fork otherwise. `pnpm test` and `SCENE_REPLAY=1 pnpm test:scenes` pass on **both** chains.
  > Done: `test/helpers/stack.ts` (FISCO: funds dev senders once via `fund.sh`, fresh MockEHKD + factory per run, budgets minted; Base: anvil fork + USDC slot write), `test/helpers/amounts.ts` price sheet per chain. FISCO: `pnpm test` 37 passed (6 scene tests skipped by design), `SCENE_REPLAY=1 pnpm test:scenes` 6/6. Base fork: `pnpm test:base` 37 passed, `SCENE_REPLAY=1 pnpm test:scenes:base` 6/6. forge: local 46/46 (MockEHKD 6, eHKD pockets 20, ms-clock pockets 20), Base fork 20/20.
- [ ] **F6 Web app.** Chain from `/api/config`; `wallet_addEthereumChain` for FISCO; HK$ labels; tx links. Tests and build pass; click-through on FISCO.
- [ ] **F7 Expo app.** Same; tests, typecheck, expo-doctor, exports pass; click-through on the web target against FISCO.
- [ ] **F8 Kotlin app.** EIP-712 domain, chain id and token from config; new viem reference vectors for the eHKD domain in `LogicTest`; tests + APK pass; emulator click-through against FISCO.
- [ ] **F9 Evidence on FISCO.** Run spike, both new-pocket presets, scenes 1–8 (replay), force-transfer on FISCO; record hashes in `docs/evidence-fisco.json` + `.md`; `verify-evidence.ts` validates every hash.
- [ ] **F10 Docs.** README (FISCO quick start), technical document, security self-assessment, mock e-HKD disclaimer.
