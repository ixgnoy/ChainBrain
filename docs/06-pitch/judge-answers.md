# Answers for the judges' hard questions

Last updated: 2026-10-19

Our headline: **the AI can be fooled, the pocket can't.** Lead the pitch with the Sentinel freezing a pocket on-chain, and with the pocket refusing a compromised agent key at the token. Don't lead with "plain English to a smart contract": other teams (YINGLONG) go deeper on that.

| Question | Our answer | Where it is |
| --- | --- | --- |
| Is "max HK$0.40 a week" really a rule, or only the server's check? | It's a rule on the chain. `Pocket.sol` keeps a day, week or month allowance in Hong Kong calendar time, and the token reports every spend to the pocket. Over the allowance, the agent key alone is refused (`OVER_PERIOD`); the owner's co-signature lets the payment through, like writing a cheque. | `contracts/src/Pocket.sol`, `server/scripts/allowance.ts`, evidence entries "allowance: …" |
| A stolen agent key: how much can it drain? | At most the period allowance, in payments no larger than the cap, and only to sellers on the list. Everything beyond that needs the owner's key. The Sentinel can also freeze the pocket on-chain. The agent never holds the main wallet. | invariant tests in `contracts/test/PocketInvariant.t.sol` |
| How do I know your app shows the real rules? | Run `verify/verify_pocket.py`. It is standard-library Python that shares no code with our apps. It reads the pocket from the chain, says its rules in plain English, and diffs them against what the owner approved. | `verify/` |
| How tested are the contracts? | 73 Foundry tests, including fuzz tests and 6 invariants over 128,000 random calls each run. They cover: no payment above the cap, no payment to a seller not on the list, the period cap holds for the agent alone, nothing settles while frozen, the guardian never holds funds, and money is conserved. | `contracts/test/` |
| What is the agent's identity? | Today the agent is a key the owner names when creating the pocket. The pocket binds that one key to that one owner, and `PocketCreated(pocket, owner, agent)` records the binding on-chain. Next step: a registry that also records who issued the agent (ChainBrain, or a third party). It is not built. | `PocketFactory.sol` |
| What if I lose my phone? | A pocket holds a small, bounded amount and expires. The worst case is the allowance until expiry, and the money can't leave the allowlist. The owner key is the phone's key; for the demo it can be re-imported (Settings, Advanced). Production plan: a passkey owner (Face ID) and a recovery guardian who can return the funds to the owner but never spend them. Neither is built yet. | |
| Does it only work on your chain? | The contracts are plain Solidity 0.8 with OpenZeppelin, so they compile for any EVM chain. The period allowance needs the token's settlement hook (`onSpend`): our Mock e-HKD has it, and a real e-HKD or stablecoin would need it, or a wrapper that has it. We deploy on FISCO BCOS only. | |

Not built, and say so if asked: a passkey (P-256) owner, a second-chain deployment, and an agent-issuer registry.
