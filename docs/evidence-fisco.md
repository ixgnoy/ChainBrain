# Evidence on the local FISCO BCOS chain (Mock e-HKD)

Chain: local FISCO BCOS 3.16.4 (Air, 1 node), web3 chain id 20200. Token: MockEHKD `0x0355c0c5Afe2A35369056FBB854903A4aF07781A` (a mock, not the HKMA e-HKD, not money). Pocket factory `0x03aB4C311eeE7C3295c63F910D79a07Ffa7A097A`.

Every hash below is in `docs/evidence-fisco.json`, written by the scripts that sent the transactions (`EVIDENCE_FILE`), never by hand. `server/scripts/verify-evidence.ts` re-fetches each one from the chain and checks that the tx exists, the receipt status matches, the block exists and lists the tx, and the expected event was emitted. FISCO has no public explorer; with the wallet API running, `http://localhost:8787/api/tx/<hash>` returns the receipt.

Re-check (chain running): `cd server && CHAIN=fisco pnpm tsx scripts/verify-evidence.ts`

Produced by: `scripts/fisco/deploy.sh`, `pnpm spike`, `scripts/new-pocket.ts research|tight`, `SCENE_REPLAY=1 pnpm test:scenes` (scenes 1 to 8 with the scripted model; scene 5 runs `scripts/force-transfer.ts`). Scene pockets use the test stack's own fresh token and factory, so their payments are on other token addresses of the same chain.

| What | Tx | Block | Expected | Event checked | Verified |
|---|---|---|---|---|---|
| deploy: MockEHKD (Mock e-HKD token) | `0x82824aeefe1b85f2106948e53224dae3f437a4385df17905efbeca4293698f4b` | 5 | success |  | ok |
| deploy: PocketFactory | `0x19788f92ce22c973d78ed47c424dd8ea5da8311b228ee559416f212643d2661d` | 6 | success |  | ok |
| deploy: mint HK$10,000 eHKD to OWNER | `0x7447c15d653459b30da3603a1f42eaee63441347dab859ec9ee3e023169f8510` | 7 | success | Transfer(address,address,uint256) | ok |
| spike: create research pocket | `0xa3e60681388084534ad72f7061fef700294fea969abc6596c417377ed92e8973` | 156 | success | PocketCreated(address,address,address) | ok |
| spike: fund research pocket | `0xa2bbea78211710e84591a2608664b78e86916960a35ae862e4a148030ab7aca6` | 157 | success | Transfer(address,address,uint256) | ok |
| spike: DataLite paid by the agent key alone (x402, EIP-3009 + ERC-1271) | `0x6a0855c186a0981516762d9355aafe297a4c76c94fa653be42920b6e12c1443a` | 158 | success | AuthorizationUsed(address,bytes32) | ok |
| spike: DataPro above ask-me, owner co-signed | `0x88aa05b447b6143c91631fd15b64b4e586e9d47733e905695c720496b109827c` | 159 | success | AuthorizationUsed(address,bytes32) | ok |
| new-pocket research: create | `0xa49642741845d1768ee222c30fa43cb62d127cda0f6fbd100c64eb9559395d34` | 160 | success | PocketCreated(address,address,address) | ok |
| new-pocket research: fund | `0x65684602df413104f9fd214c5e0e27dfd80c93955dacb8f50911c15d6cbd6d11` | 161 | success | Transfer(address,address,uint256) | ok |
| new-pocket tight: create | `0x90779a39f7e462a5f019e52cd6739fb502689758911fc05abb2419062c613b16` | 162 | success | PocketCreated(address,address,address) | ok |
| new-pocket tight: fund | `0x4599ecc9079136a1b67ef9a0c4bdbc1174ff304ee9a0735f6580a0f727e6185e` | 163 | success | Transfer(address,address,uint256) | ok |
| scene 5 backstop: compromised agent key forces the injected transfer straight to the token | `0xc2641a5fef7b5c032f1e18bd4eaa5065abf44e135433ac0028fdbcd24f9448a7` | 176 | reverted |  | ok |
| scene payment: datalite durian-report | `0x5b6a2b3a8b2bb5dc083c1f01ef1b931fb6b2d305881e251c2c8147aa7b83660d` | 168 | success | AuthorizationUsed(address,bytes32) | ok |
| scene payment: datapro premium-report (owner co-signed) | `0x8b71fbf4b12f5e13f6e0712c7f4a88a36e4e633322949241994ccf74dd68cfeb` | 169 | success | AuthorizationUsed(address,bytes32) | ok |
| scene payment: datalite fruit-trade-report | `0x5e189d25dbae090f95ff2b7d27e4d84c286104f562715c4aea7b1863fb459d1e` | 172 | success | AuthorizationUsed(address,bytes32) | ok |
| scene payment: datalite durian-report | `0xbe78b18b774f08843ea1e4f78e3852f26b7d2ff565885efc89e492a40b4e5301` | 175 | success | AuthorizationUsed(address,bytes32) | ok |
| scene payment: datalite durian-report | `0x96070d7997f2de65ee7ff50fb596903d370487def31cceb462c4e59ec6e33462` | 181 | success | AuthorizationUsed(address,bytes32) | ok |

Verifier result: **17/17 hashes valid on fisco (chain id 20200)**. Negative check: a fake hash, a reverted tx claimed as success and a wrong event are each reported FAIL (exit 1).
