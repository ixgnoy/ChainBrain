# x402 + Pocket Feasibility: the Day-1 Spike (Wed 14 Oct)
Last updated: 2026-10-17

> **Status (17 Oct, v3):** The spike questions are answered and the design is built, now on FISCO BCOS (chain id 20200) with our own Mock e-HKD token (`MockEHKD`, symbol eHKD, 6 decimals). Mock e-HKD is not the HKMA e-HKD and not money. What the build chose: the signature is an envelope `abi.encode(to, value, validAfter, validBefore, nonce, agentSig, ownerSig)` and the pocket rebuilds the Mock e-HKD EIP-3009 digest; ERC-1271 only, no ERC-4337 and no bundler ("Path A" below, minus the 4337 options); x402's own facilitator code runs in-process in the server, because no hosted facilitator knows the FISCO chain. MetaMask ERC-7710 ("Path B") was not built. See the [technical document](../technical-document.md) section 2 and the [product design](../02-product/product-design.md).

## In one minute

- **Spike question 1 (the token checks smart-account signatures): YES, by our own contract.** `MockEHKD` has the bytes-signature overload of `transferWithAuthorization`. It tries ECDSA by the payer first, then asks a contract payer through ERC-1271. Contract tests cover accept and reject cases (section 2).
- **Spike question 2 (a facilitator settles a payment from our pocket): YES.** The open-source x402 facilitator code checks signatures the same way the token does and accepts non-standard-length signatures. We run it in-process on the FISCO node; settled payments are in [evidence-fisco](../evidence-fisco.md).
- **Spike question 3 (custom validator rejects wrong recipient and over-cap amount): YES, built.** No off-the-shelf account module (Kernel, Nexus, Safe7579, Smart Sessions) reads the recipient or amount from this kind of signature, so we wrote the check ourselves in `Pocket.sol`. The signature carries the fields and the contract recomputes the hash.
- **One real limit to design around: the smart-account check runs read-only, so a pocket cannot count what it has spent.** The total budget is therefore the pocket's own eHKD balance (fund the pocket with exactly the budget). The per-payment cap, allowlist, expiry and revoke are all fine.
- **FISCO detail:** FISCO BCOS 3.x gives contracts `block.timestamp` in milliseconds. `Clock.nowSec()` normalises it so every signed time stays in seconds.

## 1. The three spike questions from the spec

The spec (`../02-product/product-design.md`, "Scope, plan and open questions") says the spike must prove three things. Plain-English reminders first: **EIP-3009** is the "transfer with a signed authorization" standard; **ERC-1271** is the standard that lets a smart contract say "this signature is valid"; **facilitator** is the server that submits the payment on-chain; **pocket** is our smart account.

| # | Question | Answer | Evidence | What is still unproven |
| --- | --- | --- | --- | --- |
| 1 | Does the token check smart-account signatures? | **Yes** | `MockEHKD.transferWithAuthorization(..., bytes signature)` recovers ECDSA first, then calls `isValidSignature` on a contract payer. It copies the behaviour of Circle's USDC v2.2 bytes overload (a third-party design we followed). It does not use OpenZeppelin's code-length switch, because FISCO gives funded EOAs pseudo-code. `forge test`: MockEHKD 7 cases pass. | Nothing for this question. |
| 2 | Does a facilitator verify and settle a payment from a pocket account? | **Yes** for the official x402 SDK facilitator, run in-process | The SDK facilitator (`@x402/evm`) checks signatures with the same rule (contract code present means ask the contract) and, when the signature is not 65 bytes, sends the whole byte string to the bytes overload. See section 3.3. Settled transactions: [evidence-fisco](../evidence-fisco.md). | Hosted facilitators (x402.org, Coinbase CDP, MetaMask) do not serve FISCO, so they were not tested. |
| 3 | Does the custom validator reject a wrong recipient and an over-cap amount? | **Yes** | Our signature bytes carry the transfer fields; the pocket rebuilds the hash, requires it to equal the hash it was given, then applies the rules. Kernel, Nexus, Safe7579 and Smart Sessions pass only the hash to modules, so none can enforce recipient or amount without custom code. `forge test`: 24 pocket cases on eHKD and the same 24 on a millisecond clock pass. | Nothing for this question. |

**What the "catch" really means (plain English).** When the token asks a smart account "is this signature valid?", it sends a fingerprint of the transfer (a hash), not the transfer itself. A hash cannot be read backwards. So we ship the transfer details inside the signature field, and the pocket recomputes the fingerprint from them. If the fingerprint matches, the pocket knows those details are exactly what the token is about to move, and it can check them against its rules.

## 2. Evidence

All contract tests run locally with `cd contracts && forge test`: 55 passed (MockEHKD 7, pocket cases on eHKD 24, pocket cases on a millisecond clock 24). Live transactions on the FISCO node are recorded in [evidence-fisco](../evidence-fisco.md) (local chain) and `docs/evidence-fisco-railway.json` (the hosted node), and checked by `cd server && pnpm tsx scripts/verify-evidence.ts`.

| Check | Result |
| --- | --- |
| Token deployed | `MockEHKD` at `0x0355c0c5Afe2A35369056FBB854903A4aF07781A`, factory at `0x03aB4C311eeE7C3295c63F910D79a07Ffa7A097A` (`contracts/deployments/20200.json`) |
| Contract payer, valid envelope | Transfer succeeds |
| Contract payer, wrong recipient or over cap | `EHKD: invalid signature` |
| EOA payer | ECDSA path, works even though FISCO reports pseudo-code for funded EOAs |

## 3. How the pieces work today (verified in the 2026 code and docs)

### 3.1 x402 version and the `exact` scheme

| Fact | Detail | Source |
| --- | --- | --- |
| Current protocol version | **v2** (CAIP-2 network ids; ours is `eip155:20200`; headers `PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, `PAYMENT-RESPONSE`). v1 still exists in the SDK under `v1/` folders, but new work should use v2. | Local repo `x402/specs/x402-specification-v2.md` |
| SDK packages (npm, latest on 2026-10-13) | `@x402/core`, `@x402/evm`, `@x402/express`, `@x402/fetch`, `@x402/mcp` all **2.28.0** (published 2026-09-29, Apache-2.0). | npm registry |
| `exact` scheme on EVM has three payment methods | `eip3009` (default, the token's `transferWithAuthorization`; Coinbase's own deployments use USDC, we use Mock e-HKD), `permit2`, and `erc7710` (smart-account delegation). Chosen by `extra.assetTransferMethod` in the 402 response. | Local `specs/schemes/exact/scheme_exact_evm.md` |
| `erc7710` status | In the written spec. **Not implemented in the open-source SDK.** Implemented by MetaMask's own package `@metamask/x402` 1.0.0 and their hosted facilitator. | grep of local clone; MetaMask docs |
| Payload for `eip3009` | `signature` plus `authorization {from, to, value, validAfter, validBefore, nonce}`. The `nonce` is a free 32-byte value chosen by the client (default: random). | Spec and `exact/client/eip3009.ts` |
| Standard extensions that matter to us | `offer-receipt` (server-signed offers and receipts: our quote and receipt), `sign-in-with-x` (wallet challenge login, CAIP-122), `http-message-signatures` (agent identity, RFC 9421), `payment-identifier` (idempotency key). Wire shapes are marked "not stable" in the offer-receipt spec. | Local `specs/extensions/` |
| Hooks | Resource server: `onProtectedRequest`, `onBeforeVerify`, `onAfterVerify`, `onBeforeSettle`, `onAfterSettle`. Client: `onBeforePaymentCreation` plus static `spendControls`. MCP client: `onPaymentRequired`, `onBeforePayment`. Facilitator: the same verify and settle hooks. | Local `docs/advanced-concepts/lifecycle-hooks.mdx` |

**What this means for the seller gateway:** guards 1, 2, 3, 6 and 7 can sit in `onProtectedRequest` or `onBeforeVerify` and return a reason code; guard 3 can also be re-run in `onAfterVerify`. In `@x402/express` (read in the local clone, `typescript/packages/http/express/src/index.ts`) the middleware verifies, lets the route handler run while it holds back the response, skips settlement if the handler returns status 400 or above, and settles before the response is released to the buyer. So "goods released only after settlement confirms" holds by default; keep the goods in the response body, not in a side channel.

### 3.2 Facilitators

The hosted facilitators (Coinbase's public `x402.org/facilitator`, Coinbase CDP, MetaMask's hosted one) only serve the networks they list, and FISCO is not one of them. So the server runs x402's own facilitator code in-process (`server/src/facilitator.ts`, built from `@x402/core` and `@x402/evm`). Gas price on FISCO is 0, so the facilitator key pays nothing, but like any sender it needs a non-zero native balance (credited by `scripts/fisco/fund.sh` locally, by the node gateway's `/admin/fund` on Railway, or by the faucet).

### 3.3 Why the SDK facilitator accepts a custom smart-account signature

Read from the local clone of `x402-foundation/x402` at commit `f8f8330` (2026-10-10):

1. `exact/client/eip3009.ts` calls `signer.signTypedData({domain, types, primaryType, message})`. The signer type `ClientEvmSigner` is just `{ address, signTypedData }`, so **we can pass our own object** whose `signTypedData` returns our packed signature bytes. It receives all fields of the authorization in `message`, so it can pack them.
2. `shared/verifySignature.ts` implements "strict on-chain `SignatureChecker` semantics": if the payer has code it calls `isValidSignature(hash, signature)` and requires `0x1626ba7e`; it deliberately does not fall back to ECDSA.
3. `exact/facilitator/eip3009-utils.ts` simulates the transfer: if the signature is 65 bytes (130 hex characters) it uses the v,r,s overload; **otherwise it passes the raw bytes to the bytes overload.** Our envelope is longer than 65 bytes, so it takes that path.
4. The client generates the nonce itself (`createNonce()`, random). To make the nonce equal `hash(intentId, quoteHash)` (a spec requirement) we need a small custom client scheme instead of the stock `ExactEvmScheme`; the stock one cannot be told a nonce.

**Pitfall found in a community proof-of-concept (EphemeralWallet PR #7):** facilitators call `isValidSignature` themselves with `eth_call`, where the caller is the facilitator, not the token. A pocket that requires `msg.sender == token`, or that records state, will pass on-chain but fail pre-verification. Make the pocket's check depend only on `hash` and `signature`.

### 3.4 Smart-account options compared

| Option | Can enforce recipient and amount for an EIP-3009 payment? | What we found in the source | Fit |
| --- | --- | --- | --- |
| **Custom minimal pocket contract** (our own `isValidSignature`) | **Yes** (we decode the fields ourselves) | Full control; about 100 lines. | **Path A, built** |
| ZeroDev Kernel (v0.4.0 layout in repo, last commit 2026-10-03, MIT) | Only with a custom validator or signer; permission policies receive `(permissionId, sender, hash, signature)` | Uses a nested EIP-712 "ERC-7739" wrapper; the raw-hash path is off unless the caller is allowed, so the hash a module sees may not be the token's digest | Heavy for one day; later upgrade |
| Biconomy Nexus (v1.2.1 in `package.json`, last commit 2026-08-07, MIT) | Only with a custom ERC-7579 validator module | `isValidSignature` takes the first 20 bytes of the signature as the validator address, then calls `validator.isValidSignatureWithSender(msg.sender, hash, rest)`: the **raw hash and our own signature bytes arrive unchanged**. A custom validator can do our decode-and-check. | Best "real 4337 + 7579" upgrade later |
| Safe + Safe7579 (Rhinestone adapter, last commit 2026-09-21, MIT and GPL-3.0 files) | Same as Nexus: custom validator via `isValidSignatureWithSender` with a 20-byte validator prefix | Restricting what the Safe signs needs a module, guard or roles | Possible, more moving parts |
| Rhinestone / ERC-7579 Smart Sessions (repo last commit 2025-08-04, MIT and AGPL-3.0 files) | **No off-the-shelf policy**: its 1271 policy interface gets `(id, requestSender, account, hash, signature)` and the signature must be wrapped in ERC-7739 | Spending-limit policies guard userOps, not EIP-3009 signatures. AGPL needs care. | Not for the payment path |
| Coinbase Spend Permissions (MIT) | Not through x402 | Lets an app pull tokens from a Coinbase Smart Wallet inside an allowance; no x402 wire path | Cite as related work only |
| MetaMask Delegation Framework (ERC-7710) + Hybrid DeleGator | **Yes through caveat enforcers** | Enforcers in the repo: `AllowedTargets`, `AllowedMethods`, `AllowedCalldata`, `ERC20TransferAmount` (running total per delegation), `Timestamp`, `LimitedCalls`, `LogicalOrWrapper`, `Redeemer`, `ERC20PeriodTransfer`. | **Path B, not built** |

### 3.5 Session keys and "the agent never holds the owner key"

The pocket stores one `agent` address (the session key). The pocket accepts a payment only when the envelope includes a valid ECDSA signature by `agent` over the digest (and the owner's signature too when the amount is above the ask-me threshold). The owner key stays with the owner and can only call `revoke`, `freeze`/`unfreeze`, `setSeller`, `setCap`, `setAskAbove`, `setExpiresAt` and `returnFunds`.

### 3.6 ERC-8004 (agent identity and reputation)

ERC-8004 (a draft ERC with Identity, Reputation and Validation registries) has reference deployments on some public testnets, but not on FISCO. It is not part of the current build; see [identity and reputation](identity-reputation-fisco.md) for the finals plan.

## 4. The working recipe (Path A) (built without the ERC-4337 options)

**Goal:** a pocket account that the token accepts as payer, with recipient, cap, expiry and revoke enforced on-chain.

### 4.1 Components and addresses

| Piece | Choice | Address or package |
| --- | --- | --- |
| Chain | FISCO BCOS 3.16.4, web3 RPC, chain id 20200, gas price 0 | Local node from `scripts/fisco`, or the hosted node `https://fisco-node-production.up.railway.app` |
| Token | `MockEHKD` ("Mock e-HKD", eHKD, 6 decimals, EIP-3009 incl. the bytes overload) | `0x0355c0c5Afe2A35369056FBB854903A4aF07781A`; EIP-712 domain name "Mock e-HKD", version "1" |
| Pocket | `Pocket.sol`, deployed per pocket by `PocketFactory` (constructor `(token, guardian)`) | Factory `0x03aB4C311eeE7C3295c63F910D79a07Ffa7A097A`; deploy with `scripts/fisco/deploy.sh` (`contracts/script/DeployFisco.s.sol`) |
| Facilitator | x402's facilitator code in-process (`@x402/core`, `@x402/evm` 2.28.0) | `server/src/facilitator.ts` |
| Seller | Express with `@x402/express` 2.28.0 and our guards in hooks | 2.28.0 |
| Buyer | `@x402/fetch` `wrapFetchWithPayment` + a custom `ClientEvmSigner` whose `signTypedData` builds the pocket envelope | 2.28.0 |

### 4.2 Pocket signature format

`isValidSignature(bytes32 hash, bytes sig)` decodes the envelope `(to, value, validAfter, validBefore, nonce, agentSig, ownerSig)`. It rebuilds the token digest: `keccak256(0x1901 || domainSeparator || keccak256(abi.encode(TRANSFER_WITH_AUTHORIZATION_TYPEHASH, address(this), to, value, validAfter, validBefore, nonce)))`, with the domain separator read from `token.DOMAIN_SEPARATOR()`, and requires it equals `hash`. It then requires: not revoked or frozen, not expired, `to` is allowlisted, `value <= cap`, `agentSig` is a valid ECDSA signature of `hash` by `agent`, and, above the ask-me threshold, `ownerSig` by `owner`. It returns `0x1626ba7e` or `0xffffffff`.

The type hash is `keccak256("TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)")`, the standard EIP-3009 type.

### 4.3 Rules that work read-only, and one that does not

| Rule | Works in a read-only check? | How |
| --- | --- | --- |
| Recipient allowlist | Yes | mapping set by owner |
| Per-payment cap | Yes | compare `value` |
| Expiry, lifetime | Yes | `Clock.nowSec()` (FISCO's millisecond timestamp normalised to seconds) |
| Revoke | Yes | flag set by owner; every later check fails, including already-signed authorizations |
| One-task pocket void after use | Partly | the token's own nonce stops replay of one authorization; "void after first payment" needs state, so use balance = one price or let the owner drain |
| **Total budget (running spend)** | **No** (cannot write state in a read-only call) | **Make the pocket's eHKD balance the budget.** Fund exactly the budget; unused money returns through the owner-only `returnFunds`. Bonus: this is the spec's "funds physically separated from the owner's main balance". |

Residual risk to state honestly in the security report: while the pocket is live, the agent could sign several authorizations at once, each under the cap and to allowlisted sellers; every authorization spends only from the pocket's own balance. Cap `validBefore` to a short window (for example 10 minutes from now) to limit stockpiled authorizations.

### 4.4 Path B in short (ERC-7710 with MetaMask) (not built)

Path B depended on MetaMask's hosted facilitator, which does not serve FISCO. It was replaced by the FISCO BCOS + Mock e-HKD setup with Path A.

## 5. Fallback ladder

The ladder was a plan for the Base testnet spike. It was replaced by the FISCO BCOS + Mock e-HKD setup, where rung 0 (Path A with our own facilitator) works.

## 6. Wednesday spike checklist

The spike checklist was written for the Base testnet. It was replaced by the FISCO BCOS + Mock e-HKD setup: run `scripts/fisco/setup.sh` and `scripts/fisco/start.sh`, deploy with `scripts/fisco/deploy.sh`, then `cd contracts && forge test` and `cd server && pnpm test`.

## 7. Real-world notes that affect the demo

- **Competitors can reach the same standard parts.** A community issue (x402 #2641, opened 2026-06-16, no maintainer reply) proposes a policy-gated escrow payer using the same ERC-1271 route, and MetaMask now ships x402 ERC-7710. A "smart wallet pays x402 within limits" demo is no longer novel by itself. The seller-side guards and the owner-binding story are where we differ.
- **Median x402 seller revenue is tiny** according to one repo's own research notes (a few cents a month in USDC, 38% earn nothing; self-reported, unverified, and about the public x402 market, not our token). Do not claim x402 volume as proof of demand.
- **Everything here is a test chain with a mock token.** Mock e-HKD is not the HKMA e-HKD and not money.

## What this means for winning

| Tag | Recommendation | Helps |
| --- | --- | --- |
| [must] | Keep one success hash and two rejection results (wrong recipient, over cap) in the evidence. This is the proof behind the "limits a hijacked agent cannot break" claim. | Task 40 / Security 30 |
| [must] | Make the pocket's eHKD balance the total budget and say so plainly in docs; do not promise a running spend counter in the contract. | Security 30 |
| [should] | Use the standard x402 extensions where they fit (offer-receipt for the signed quote and receipt, sign-in-with-x or http-message-signatures for agent identity) and cite them; it shows we build on the standard. Check each extension's wire status first because offer-receipt says its shape is not stable. | Innovation 30 |
| [should] | Build the custom client scheme that sets the nonce to `hash(intentId, quoteHash)`; this is how the payment itself commits to the intent. | Innovation 30 / Security 30 |
| [could] | Move the pocket to Nexus or Safe7579 with our validator as a module, so "ERC-4337 smart account" is literally true. Only if the core scenes are done. | Bonus |

## Open questions

- If a settlement fails after the handler ran, does the Express adapter discard the buffered response? (Read from code, not yet tested.)
- Can the pocket be an ERC-4337 account and still keep `isValidSignature` free of wrapper hashing? Needed only for the "real 4337" upgrade.

## Sources

Web pages (accessed 2026-10-13):
- x402 wallet compatibility: https://docs.x402.org/advanced-concepts/wallet-compatibility.md
- Coinbase CDP x402 facilitator: https://docs.cdp.coinbase.com/x402/core-concepts/facilitator
- MetaMask x402 docs: https://docs.metamask.io/smart-accounts-kit/guides/x402/overview/
- x402 issue #2641 (policy-gated payer concept, 2026-06-16): https://github.com/x402-foundation/x402/issues/2641
- ERC-8004 spec: https://eips.ethereum.org/EIPS/eip-8004
- Search-snippet only: EphemeralWallet PR #7 (https://github.com/DavideSilva/EphemeralWallet/pull/7)
- Foundry install (ctx7 `/foundry-rs/book`), x402 client/facilitator examples (ctx7 `/coinbase/x402`)
- npm registry versions: https://registry.npmjs.org/ (2026-10-13)

Local repos (read only, never run):
- `/Users/user/Workspace/Projects/shenzhen/lianainao-fintechathon/reference/repos/from-prior/x402` (specs, `typescript/packages/mechanisms/evm`, `typescript/packages/mcp`, `examples/typescript/facilitator/basic`, `docs/advanced-concepts/`)
- `/Users/user/Workspace/Projects/shenzhen/lianainao-fintechathon/reference/repos/build/stablecoin-evm` (Circle's USDC source, the model for the bytes overload in `MockEHKD`)
- `/Users/user/Workspace/Projects/shenzhen/lianainao-fintechathon/reference/repos/build/delegation-framework`, `.../smart-accounts-kit`, `.../kernel`, `.../nexus`, `.../safe7579`, `.../smartsessions`, `.../spend-permissions`, `.../account-abstraction`

Related docs: [stack and repos](stack-and-repos.md), [product spec](../02-product/product-design.md).

See also: [master index](../README.md), [how to win](../06-pitch/how-to-win.md), [recommended changes](../02-product/recommended-changes.md)
