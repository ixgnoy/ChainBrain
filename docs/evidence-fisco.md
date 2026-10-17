# Evidence on the local FISCO BCOS chain (Mock e-HKD)

Chain: local FISCO BCOS 3.16.4 (Air, 1 node), web3 chain id 20200. Token: MockEHKD `0x0355c0c5Afe2A35369056FBB854903A4aF07781A` (a mock, not the HKMA e-HKD, not money). Pocket factory `0x03aB4C311eeE7C3295c63F910D79a07Ffa7A097A`.

Every hash below is in `docs/evidence-fisco.json`, written by the scripts that sent the transactions (`EVIDENCE_FILE`), never by hand. `server/scripts/verify-evidence.ts` re-fetches each one from the chain and checks that the tx exists, the receipt status matches, the block exists and lists the tx, the tx calls the recorded contract, and the expected event was emitted by that contract. FISCO has no public explorer; with the wallet API running, `http://localhost:8787/api/tx/<hash>` returns the receipt.

Re-check (chain running): `cd server && CHAIN=fisco pnpm tsx scripts/verify-evidence.ts`

Produced by: `scripts/fisco/deploy.sh`, `pnpm spike`, `scripts/new-pocket.ts research|tight`, `SCENE_REPLAY=1 pnpm test:scenes` (scenes 1 to 8 with the scripted model; scene 5 runs `scripts/force-transfer.ts`). Scene pockets use the test stack's own fresh token and factory, so their payments are on other token addresses of the same chain.

| What | Tx | Block | Expected | Contract called | Event checked | Verified |
|---|---|---|---|---|---|---|
| deploy: MockEHKD | `0x82824aeefe1b85f2106948e53224dae3f437a4385df17905efbeca4293698f4b` | 5 | success | (creation) |  | ok |
| deploy: PocketFactory | `0x19788f92ce22c973d78ed47c424dd8ea5da8311b228ee559416f212643d2661d` | 6 | success | (creation) |  | ok |
| deploy: MockEHKD.mint(address,uint256) | `0x7447c15d653459b30da3603a1f42eaee63441347dab859ec9ee3e023169f8510` | 7 | success | `0x0355…781a` | Transfer(address,address,uint256) | ok |
| spike: create research pocket | `0xc6b56d2f2e35cc3f1ac1d29e8d5fe89289f6588c07d84c7485f8b4068d816552` | 279 | success | `0x03aB…097A` | PocketCreated(address,address,address) | ok |
| spike: fund research pocket | `0x68945e66545686297007fdb05469eb833cef7e055c3755909036d3c79b50c294` | 280 | success | `0x0355…781A` | Transfer(address,address,uint256) | ok |
| spike: DataLite paid by the agent key alone (x402, EIP-3009 + ERC-1271) | `0x9eb83e098b1c3e3847081037372e57023a00028d8d786dde8ed9cbcb1bdc0cc9` | 281 | success | `0x0355…781A` | AuthorizationUsed(address,bytes32) | ok |
| spike: DataPro above ask-me, owner co-signed | `0x7820d31083e416b5f75da3b28060b1362ed0e1f8174efffc993b106810ec9639` | 282 | success | `0x0355…781A` | AuthorizationUsed(address,bytes32) | ok |
| new-pocket research: create | `0x641898b7587a231a03589660aab7d4ad81f362446f0f868f503a76c90b1034ac` | 283 | success | `0x03aB…097A` | PocketCreated(address,address,address) | ok |
| new-pocket research: fund | `0x5774cf33d2152c3cdbb117d1186959f296eb3ff67ce44916a2e0481fe057c8ca` | 284 | success | `0x0355…781A` | Transfer(address,address,uint256) | ok |
| new-pocket tight: create | `0xbdb0c4d88942917559f6e7e60ca4fb8e187bab5375f522119988b3fa55750d4d` | 285 | success | `0x03aB…097A` | PocketCreated(address,address,address) | ok |
| new-pocket tight: fund | `0xa6a7dd36c53cc4873b8790750b1b692d32fb330dd1f880f24c3c5812dad525cd` | 286 | success | `0x0355…781A` | Transfer(address,address,uint256) | ok |
| scene payment: datalite durian-report | `0x4c139bfabc5002a807b22aee59765c7a858d9b16588e119756dc0ef795c20547` | 291 | success | `0xaca8…6B4D` | AuthorizationUsed(address,bytes32) | ok |
| scene payment: datapro premium-report (owner co-signed) | `0x5a0c1d2e6100becb1982ce89fb8c9635e35bb0276f1df4c27d195f7c8d0e866c` | 292 | success | `0xaca8…6B4D` | AuthorizationUsed(address,bytes32) | ok |
| scene payment: datalite fruit-trade-report | `0x5f7d5f786f624b8631286b6652eedd7e05e538ffc41eb91212bcc48fa7c056dc` | 295 | success | `0xaca8…6B4D` | AuthorizationUsed(address,bytes32) | ok |
| scene payment: datalite durian-report | `0x1bf51680d9a0ab3212654ddd1ae9f1b65bec5153b1aba3dd8d399bec6a56e7d5` | 298 | success | `0xaca8…6B4D` | AuthorizationUsed(address,bytes32) | ok |
| scene 5 backstop: compromised agent key forces the injected transfer straight to the token | `0x712bde9b4537427636ec7a3a1320c3e6f8a2ada3cb2afc474e027dae5102c470` | 299 | reverted | `0xaca8…6B4D` |  | ok |
| scene payment: datalite durian-report | `0xfdbdb2678a55f8fb34a02b90c76c01da05c45058123377c27aabc840f5a0b493` | 304 | success | `0xaca8…6B4D` | AuthorizationUsed(address,bytes32) | ok |

Verifier result: **17/17 hashes valid on fisco (chain id 20200)**. Negative checks (exit 1 each): a fake hash, a reverted tx claimed as success, a wrong event, a payment claimed to call the factory, and an event not emitted by the called contract.
