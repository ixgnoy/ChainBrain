# Evidence on the local FISCO BCOS chain (Mock e-HKD)

Chain: local FISCO BCOS 3.16.4 (Air, 1 node), web3 chain id 20200. Token: MockEHKD `0x0355c0c5Afe2A35369056FBB854903A4aF07781A` (a mock, not the HKMA e-HKD, not money). Pocket factory `0x03aB4C311eeE7C3295c63F910D79a07Ffa7A097A`.

Every hash below is in `docs/evidence-fisco.json`, written by the scripts that sent the transactions (`EVIDENCE_FILE`), never by hand. `server/scripts/verify-evidence.ts` re-fetches each one from the chain and checks that the tx exists, the receipt status matches, the block exists and lists the tx, the tx calls the recorded contract, and the expected event was emitted by that contract. FISCO has no public explorer; with the wallet API running, `http://localhost:8787/api/tx/<hash>` returns the receipt.

Re-check (chain running): `cd server && CHAIN=fisco pnpm tsx scripts/verify-evidence.ts`

Produced by: `scripts/fisco/deploy.sh`, `pnpm spike`, `scripts/new-pocket.ts research|tight`, `SCENE_REPLAY=1 pnpm test:scenes` (scenes 1 to 8 with the scripted model; scene 5 runs `scripts/force-transfer.ts`). Scene pockets use the test stack's own fresh token and factory, so their payments are on other token addresses of the same chain.

| What | Tx | Block | Expected | Contract called | Event checked | Verified |
|---|---|---|---|---|---|---|
| deploy: MockEHKD | `0x4d853a1cb0395e4b7c10ca3576471bbe1d16ced14f5f58e36f3ac842698a1692` | 5 | success | (creation) |  | ok |
| deploy: PocketFactory | `0x19788f92ce22c973d78ed47c424dd8ea5da8311b228ee559416f212643d2661d` | 6 | success | (creation) |  | ok |
| deploy: MockEHKD.mint(address,uint256) | `0x7447c15d653459b30da3603a1f42eaee63441347dab859ec9ee3e023169f8510` | 7 | success | `0x0355…781a` | Transfer(address,address,uint256) | ok |
| spike: create research pocket | `0x5815b9b1e1c5a3dd17637e4e758168d5bf1597865067896feb2970765912a206` | 31 | success | `0x03aB…097A` | PocketCreated(address,address,address) | ok |
| spike: fund research pocket | `0x84d74efed56af8e0a90592193948906f77ee85c1f7796eb1333d59e7c5cbb2ca` | 32 | success | `0x0355…781A` | Transfer(address,address,uint256) | ok |
| spike: DataLite paid by the agent key alone (x402, EIP-3009 + ERC-1271) | `0x441912edbb0810f8d5e1b0c916be6fbc3e5c9524249e592ea8be998ad01dfb40` | 33 | success | `0x0355…781A` | AuthorizationUsed(address,bytes32) | ok |
| spike: DataPro above ask-me, owner co-signed | `0x813dcca1d88c6974a44bda79ecfb16c7db188490de0169eb411753eedd5e4538` | 34 | success | `0x0355…781A` | AuthorizationUsed(address,bytes32) | ok |
| new-pocket research: create | `0x97b0456a7e9dcfef318578e32f1e8f7224d83dbcc52280fd77d686e6b60142fe` | 35 | success | `0x03aB…097A` | PocketCreated(address,address,address) | ok |
| new-pocket research: fund | `0xcda66ce3f744f286cedba507cb443f799b87c02285900cc168ca38e8d1175a64` | 36 | success | `0x0355…781A` | Transfer(address,address,uint256) | ok |
| new-pocket tight: create | `0x46aee1032f4415b4332410a89ba3aa407aeb2f78025e01bc77acab8f212f1f9f` | 37 | success | `0x03aB…097A` | PocketCreated(address,address,address) | ok |
| new-pocket tight: fund | `0xe54093094916ffa18a99fbfa7619eb5e1d5582ce1ad4ae07fcbd0e9ac00146a5` | 38 | success | `0x0355…781A` | Transfer(address,address,uint256) | ok |
| scene payment: datalite durian-report | `0x1fbf9744d6728eedc9b1763c6e4b5132afdd1e204d52a1956fc60adabd355132` | 43 | success | `0x0DCd…CD82` | AuthorizationUsed(address,bytes32) | ok |
| scene payment: datapro premium-report (owner co-signed) | `0x50f4c40bcc160d30368cb0764faf21580eb836c8350bd5dc71ff52a10132dfe8` | 44 | success | `0x0DCd…CD82` | AuthorizationUsed(address,bytes32) | ok |
| scene payment: datalite fruit-trade-report | `0x19ba48ed197a35ee4208ec920e83a5ac952bf0f266b14ff4fe043e9a36ffbbcc` | 47 | success | `0x0DCd…CD82` | AuthorizationUsed(address,bytes32) | ok |
| scene payment: datalite durian-report | `0xa4900dc45a951e9f2a188c99822e99d390c4ac2bf355903aa819f2afdd621321` | 50 | success | `0x0DCd…CD82` | AuthorizationUsed(address,bytes32) | ok |
| scene 5 backstop: compromised agent key forces the injected transfer straight to the token | `0xd5e3f8f6329bb6e4b1096f8d6e2686cfac8bd7342af315e21582ce327a119a38` | 51 | reverted | `0x0DCd…CD82` |  | ok |
| scene payment: datalite durian-report | `0xf851d3da16bd4f25d34c61334e1d1a918173088b28edd0e40dc86c5b3bb8ac82` | 56 | success | `0x0DCd…CD82` | AuthorizationUsed(address,bytes32) | ok |

Verifier result: **17/17 hashes valid on fisco (chain id 20200)**. Negative checks (exit 1 each): a fake hash, a reverted tx claimed as success, a wrong event, a payment claimed to call the factory, and an event not emitted by the called contract.
