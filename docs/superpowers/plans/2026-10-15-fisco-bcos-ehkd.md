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

- [ ] **F1 Local chain.** `scripts/fisco/{setup,start,stop}.sh`: download v3.16.4 binary + `build_chain.sh` into `.fisco/` (gitignored), build a 1-node group, enable `[web3_rpc]`, set the executor version for Ethereum compatibility, start. Verify with viem: `eth_chainId` = 20200, deploy a contract, read its receipt. Record every RPC gap found (fee fields, estimateGas, tx type) in this plan.
- [ ] **F2 Token contract.** `contracts/src/MockEHKD.sol` + `contracts/test/MockEHKD.t.sol` (EOA and ERC-1271 authorizations, replay, expiry, cancel, mint only owner). `contracts/test/Pocket.ehkd.t.sol`: the 20 pocket cases against a locally deployed MockEHKD (no fork). Base fork tests still pass.
- [ ] **F3 Deploy to FISCO.** Deploy MockEHKD + PocketFactory on the local chain, mint to OWNER, write `contracts/deployments/20200.json` (`PocketFactory`, `Token`). Verify code at both addresses.
- [ ] **F4 Server chain switch.** `server/src/chains.ts` (id, rpc, token, EIP-712 domain, currency label, tx URL, x402 network). Replace every hard-coded USDC / Base Sepolia / 84532 in server code, scripts and test helpers. Price sheet per currency. `/api/config` exposes the chain. `/api/tx/:hash`.
- [ ] **F5 Server tests on both chains.** Test harness starts against the local FISCO node (fresh deploy per run) when `CHAIN=fisco`, the Base fork otherwise. `pnpm test` and `SCENE_REPLAY=1 pnpm test:scenes` pass on **both** chains.
- [ ] **F6 Web app.** Chain from `/api/config`; `wallet_addEthereumChain` for FISCO; HK$ labels; tx links. Tests and build pass; click-through on FISCO.
- [ ] **F7 Expo app.** Same; tests, typecheck, expo-doctor, exports pass; click-through on the web target against FISCO.
- [ ] **F8 Kotlin app.** EIP-712 domain, chain id and token from config; new viem reference vectors for the eHKD domain in `LogicTest`; tests + APK pass; emulator click-through against FISCO.
- [ ] **F9 Evidence on FISCO.** Run spike, both new-pocket presets, scenes 1–8 (replay), force-transfer on FISCO; record hashes in `docs/evidence-fisco.json` + `.md`; `verify-evidence.ts` validates every hash.
- [ ] **F10 Docs.** README (FISCO quick start), technical document, security self-assessment, mock e-HKD disclaimer.
