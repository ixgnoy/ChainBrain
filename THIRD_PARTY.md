# Third-party code and ideas
Last updated: 2026-10-19

## YINGLONG

- **Source:** https://github.com/ABRUBAB/YINGLONG (commit `6d1f17b`, 18 Oct 2026)
- **Licence:** Apache License 2.0. The full text is at https://www.apache.org/licenses/LICENSE-2.0 and in the YINGLONG repository's `LICENSE`.

No YINGLONG file is copied verbatim. These ChainBrain files adapt its designs:

| ChainBrain file | Adapted from (YINGLONG) | What was taken |
| --- | --- | --- |
| `server/src/ledger.ts` | `apps/agent/src/chain/ledger.ts` (`LedgerContext`), `packages/sdk/src/errors.ts`, `apps/indexer/src/fisco-native.ts` | The liveness tick before time-sensitive calls on FISCO (`freshHead`), `now() = max(head, wall clock)`, simulate-then-send writes that throw a typed revert, walking a viem error chain for revert data, and reading the exact revert from FISCO's native receipt over mutual TLS. The nonce handling, the per-sender queue and the chunked log scan are ChainBrain's own, based on our probe of FISCO 3.16.4 (`server/scripts/probe-fisco.ts`). |

Changes: rewritten for ChainBrain's single FISCO chain, our contracts' ABIs and our key layout.
