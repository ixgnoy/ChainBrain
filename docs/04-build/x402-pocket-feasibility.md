# x402 + Pocket Feasibility: the Day-1 Spike (Wed 14 Oct)
Last updated: 2026-10-14

> **Status (14 Oct, v2):** This is the Day-1 spike recipe. The spike passed on a Base Sepolia fork; the live run is still pending (see [evidence](../evidence.md)). What the build actually chose: the signature is an envelope `abi.encode(to, value, validAfter, validBefore, nonce, agentSig, ownerSig)` and the pocket rebuilds the USDC EIP-3009 digest; ERC-1271 only, no ERC-4337 and no bundler (so "Path A" below, minus the 4337 options); the public testnet facilitator at x402.org/facilitator is the default, and `FACILITATOR=local` runs the x402 facilitator code in-process. MetaMask ERC-7710 ("Path B") was not built. See the [technical document](../technical-document.md) section 2 and the [product design](../02-product/product-design.md).

## In one minute

- **Spike question 1 (USDC on Base Sepolia checks smart-account signatures): YES, proven today.** The USDC contract has the smart-wallet version of `transferWithAuthorization`. We tested it live with a read-only call: a contract that answers "valid" was accepted, one that answers anything else was rejected, and an address with no code was sent down the old path. Details in section 2.
- **Spike question 2 (a facilitator settles a payment from our pocket): LIKELY YES, not yet proven end to end.** The open-source x402 facilitator code checks signatures exactly the way USDC does and accepts non-standard-length signatures. We could not test a real settlement without a deployed pocket, so this is the first thing to prove on Wednesday.
- **Spike question 3 (custom validator rejects wrong recipient and over-cap amount): YES by design, must be built.** No off-the-shelf account module (Kernel, Nexus, Safe7579, Smart Sessions) reads the recipient or amount from this kind of signature, so we write about 100 lines of Solidity ourselves. The trick in the spec works: the signature carries the fields and the contract recomputes the hash.
- **New finding that changes the plan: x402 v2 already has an "ERC-7710" payment method, and MetaMask runs a live hosted facilitator for it on Base Sepolia.** That is a second, fully standard route to a pocket with on-chain limits (Path B). Put one person on it in parallel on Wednesday.
- **New finding: the ERC-8004 agent registries are already deployed on Base Sepolia.** We do not need to write an identity registry or a reputation registry; we only write a thin binding contract. This saves about a day.
- **One real limit to design around: the smart-account check runs read-only, so a pocket cannot count what it has spent.** The total budget must therefore be the pocket's own USDC balance (fund the pocket with exactly the budget). The per-payment cap, allowlist, expiry and revoke are all fine.
- **What to do:** Wednesday morning, person A builds Path A (custom pocket, standard USDC authorization), person B builds Path B (MetaMask ERC-7710). By the end of Wednesday keep one as the demo path and drop to the fallback ladder in section 5 if both fail.

## 1. The three spike questions from the spec

The spec (`../02-product/product-design.md`, "Scope, plan and open questions") says the spike must prove three things. Plain-English reminders first: **USDC v2.2** is Circle's current USDC code; **ERC-1271** is the standard that lets a smart contract say "this signature is valid"; **facilitator** is the server that submits the payment on-chain and pays the gas; **pocket** is our smart account.

| # | Question | Answer | Evidence | What is still unproven |
| --- | --- | --- | --- | --- |
| 1 | Is Base Sepolia USDC v2.2, and does it check smart-account signatures? | **Yes** | (a) USDC at `0x036CbD53842c5426634e7929541eC2318f3dCF7e` is a proxy; its implementation `0xd74cc5d436923b8ba2c179b4bca2841d8a52c5b5` contains the function selector for the bytes-signature `transferWithAuthorization` (`0xcf092995`), which only exists in v2.2. (b) A read-only test with a fake contract at the payer address succeeded, a wrong answer failed with `FiatTokenV2: invalid signature`, and no code failed with `ECRecover: invalid signature length`. (c) Circle's source (`FiatTokenV2_2.sol`) documents "signature bytes signed by an EOA wallet or a contract wallet" and uses a read-only `staticcall` to `isValidSignature`. | Nothing for this question. `version()` returns "2" for every v2.x release, so do not use it to tell v2.1 from v2.2. |
| 2 | Does a facilitator verify and settle a payment from a pocket account? | **Likely yes** for a facilitator we run ourselves with the official x402 SDK; **unknown** for the hosted x402.org and Coinbase CDP facilitators | The SDK facilitator (`@x402/evm`, version 2.28.0) checks signatures with the same rule USDC uses (contract code present means ask the contract; no fallback to ECDSA) and, when the signature is not 65 bytes, sends the whole byte string to the bytes overload and simulates it. See section 3.3. Separately, a Safe wallet signed an EIP-3009 transfer that Base-mainnet USDC accepted in a fork simulation dated 2026-10-07 (community issue, not settled on a live chain). | A real settlement from a deployed pocket through any facilitator. Whether x402.org or CDP accept non-65-byte signatures is not stated in their docs: [VERIFY] by running it. |
| 3 | Does the custom validator reject a wrong recipient and an over-cap amount? | **Yes by design, must be built and tested** | The USDC check passes the contract only a hash plus the signature bytes. Our signature bytes carry the transfer fields; the contract rebuilds the hash from those fields, requires it to equal the hash it was given, then applies the rules to the fields. We read the Kernel, Nexus, Safe7579 and Smart Sessions source: their 1271 paths pass only the hash to modules or policies, so none can enforce recipient or amount without custom code. | The Solidity itself, plus unit tests for: wrong recipient, over cap, expired, revoked, wrong chain. |

**What the "catch" really means (plain English).** When USDC asks a smart account "is this signature valid?", it sends a fingerprint of the transfer (a hash), not the transfer itself. A hash cannot be read backwards. So we ship the transfer details inside the signature field, and the pocket recomputes the fingerprint from them. If the fingerprint matches, the pocket knows those details are exactly what USDC is about to move, and it can check them against its rules.

## 2. Live evidence gathered on 2026-10-13

All three checks used the public Base Sepolia RPC (`https://sepolia.base.org`, chain id 0x14a34 = 84532) and read-only calls. Nothing was sent on-chain.

| Check | Result |
| --- | --- |
| `version()` on the USDC proxy | Returns the string "2" (expected for v2.0, v2.1 and v2.2) |
| Implementation address (Circle's proxy stores it at slot `0x7050c9e0...f8c3`) | `0xd74cc5d436923b8ba2c179b4bca2841d8a52c5b5`, ~~23,465~~ 23,464 bytes of code (re-measured 2026-10-13 with eth_getCode) |
| Selectors in that code | Contains `e3ee160e` (v,r,s overload), `cf092995` (bytes overload of `transferWithAuthorization`), `88b7ab63` (bytes overload of `receiveWithAuthorization`). The selector values were computed with a local Keccak-256 implementation that reproduced the known selector `a9059cbb` for `transfer`. |
| Why no `1626ba7e` in the code | Circle's `SignatureChecker` is an external linked library, so the magic value lives in the library, not in the token. Consistent with Circle's source. |
| Behavioural test (`eth_call` with a state override that places tiny code at the payer address, value 0, 40-byte signature) | Code returning `0x1626ba7e...` gives success (`0x`). Code returning `0xffffffff...` gives `FiatTokenV2: invalid signature`. No code at the payer gives `ECRecover: invalid signature length`. |

**Limits of this test:** it proves the token asks the payer contract and trusts its answer. It does not prove a facilitator will relay the payment. Treat it as question 1 closed and question 2 open.

Other contracts confirmed to have code on Base Sepolia the same way: ERC-8004 Identity and Reputation registries, MetaMask DelegationManager `0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3`, ERC-4337 EntryPoint v0.7 `0x0000000071727De22E5E9d8BAf0edAc6f37da032`, Multicall3 `0xcA11bde05977b3631167028862bE2a173976CA11`, Permit2 `0x000000000022D473030F116dDEE9F6B43aC78BA3`, x402 Permit2 proxy `0x402085c248EeA27D92E8b30b2C58ed07f9E20001`, and the Ethereum Attestation Service (EAS) predeploys `0x4200000000000000000000000000000000000021` (EAS) and `...0020` (schema registry).

## 3. How the pieces work today (verified in the 2026 code and docs)

### 3.1 x402 version and the `exact` scheme

| Fact | Detail | Source |
| --- | --- | --- |
| Current protocol version | **v2** (CAIP-2 network ids like `eip155:84532`; headers `PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, `PAYMENT-RESPONSE`). v1 still exists in the SDK under `v1/` folders and in the x402.org facilitator's list, but new work should use v2. | Local repo `x402/specs/x402-specification-v2.md`; x402.org `/supported` |
| SDK packages (npm, latest on 2026-10-13) | `@x402/core`, `@x402/evm`, `@x402/express`, `@x402/fetch`, `@x402/mcp` all **2.28.0** (published 2026-09-29, Apache-2.0). The old `x402` package is 1.2.0 (April 2026). | npm registry |
| `exact` scheme on EVM has three payment methods | `eip3009` (default, USDC `transferWithAuthorization`), `permit2`, and `erc7710` (smart-account delegation). Chosen by `extra.assetTransferMethod` in the 402 response. | Local `specs/schemes/exact/scheme_exact_evm.md` |
| `erc7710` status | In the written spec. **Not implemented in the open-source SDK** (no match for "7710" in `typescript/packages/mechanisms/evm`). Implemented by MetaMask's own package `@metamask/x402` 1.0.0 and their hosted facilitator. | grep of local clone; MetaMask docs |
| Payload for `eip3009` | `signature` plus `authorization {from, to, value, validAfter, validBefore, nonce}`. The `nonce` is a free 32-byte value chosen by the client (default: random). | Spec and `exact/client/eip3009.ts` |
| Standard extensions that matter to us | `offer-receipt` (server-signed offers and receipts: our quote and receipt), `sign-in-with-x` (wallet challenge login, CAIP-122), `http-message-signatures` (agent identity, RFC 9421), `payment-identifier` (idempotency key). Wire shapes are marked "not stable" in the offer-receipt spec. | Local `specs/extensions/` |
| Hooks | Resource server: `onProtectedRequest`, `onBeforeVerify`, `onAfterVerify`, `onBeforeSettle`, `onAfterSettle`. Client: `onBeforePaymentCreation` plus static `spendControls`. MCP client: `onPaymentRequired`, `onBeforePayment`. Facilitator: the same verify and settle hooks. | Local `docs/advanced-concepts/lifecycle-hooks.mdx` |

**What this means for the seller gateway:** guards 1, 2, 3, 6 and 7 can sit in `onProtectedRequest` or `onBeforeVerify` and return a reason code; guard 3 can also be re-run in `onAfterVerify`. The standard Express middleware verifies, runs the handler, then settles (and `onAfterVerify` can cancel before settle). In `@x402/express` (read in the local clone, `typescript/packages/http/express/src/index.ts`) the middleware verifies, lets the route handler run while it holds back the response, skips settlement if the handler returns status 400 or above, and settles before the response is released to the buyer. So "goods released only after settlement confirms" holds by default; keep the goods in the response body, not in a side channel.

### 3.2 Facilitators

| Facilitator | Base Sepolia | Needs an API key? | Smart-account payers | Notes |
| --- | --- | --- | --- | --- |
| `https://x402.org/facilitator` (Coinbase-run public testnet facilitator) | Yes: `exact`, `upto`, `batch-settlement` for `eip155:84532` (v2) and `exact` for `base-sepolia` (v1). Signer `0xd407e409E34E0b9afb99EcCeb609bDbcD5e7f1bf`. | No key needed for testnet use: our `POST /verify` with an empty body returned a normal 400 validation error, not an auth error. | **Unknown** [VERIFY]. It lists the extensions `eip2612GasSponsoring`, `erc20ApprovalGasSponsoring`, `builder-code`. | The FAQ says it is for testnet development and does not support Base mainnet. |
| Coinbase CDP facilitator | Yes (`eip155:84532`: exact, upto, batch-settlement) | The CDP docs say it authenticates with a CDP API key and give no testnet exception [VERIFY] | **Unknown** (a community comment says "not readable from outside") | Free for the first 1,000 on-chain transactions a month, then US$0.001. Docs cover v2 only. |
| Self-hosted (official SDK, `examples/typescript/facilitator/basic`) | Yes (the example registers `eip155:84532`) | You hold the relayer key and need Base Sepolia ETH for gas | **Likely yes**: strict ERC-1271 check, plus an `eip6492AllowedFactories` list for undeployed wallets (empty by default; we do not need it if we deploy the pocket first). Hooks let us add logging and our own checks. | Our most controllable option and the one the spec hints at ("if we self-host the facilitator we can bundle both"). |
| MetaMask hosted facilitator | Yes. `https://tx-sentinel-base-sepolia.api.cx.metamask.io/platform/v2/x402` and a `dev-api` twin; `/supported` lists `eip155:84532` with methods `eip3009`, `permit2`, `erc7710`. Our `POST /verify` with an empty body returned 400, not an auth error. | Apparently no (only an empty-body test) [VERIFY with a real payment] | `erc7710` from a MetaMask smart account (Hybrid DeleGator) | Run by MetaMask; the `dev-api` host name suggests a development service, so do not make it the only path. |

### 3.3 Why the SDK facilitator should accept a custom smart-account signature

Read from the local clone of `x402-foundation/x402` at commit `f8f8330` (2026-10-10):

1. `exact/client/eip3009.ts` calls `signer.signTypedData({domain, types, primaryType, message})`. The signer type `ClientEvmSigner` is just `{ address, signTypedData }`, so **we can pass our own object** whose `signTypedData` returns our packed signature bytes. It receives all fields of the authorization in `message`, so it can pack them.
2. `shared/verifySignature.ts` implements "strict on-chain `SignatureChecker` semantics": if the payer has code it calls `isValidSignature(hash, signature)` and requires `0x1626ba7e`; it deliberately does not fall back to ECDSA.
3. `exact/facilitator/eip3009-utils.ts` simulates the transfer: if the signature is 65 bytes (130 hex characters) it uses the v,r,s overload; **otherwise it passes the raw bytes to the bytes overload.** Our packed signature is longer than 65 bytes, so it takes that path.
4. The client generates the nonce itself (`createNonce()`, random). To make the nonce equal `hash(intentId, quoteHash)` (a spec requirement) we need a small custom client scheme instead of the stock `ExactEvmScheme`; the stock one cannot be told a nonce.

**Pitfall found in a community proof-of-concept (EphemeralWallet PR #7):** facilitators call `isValidSignature` themselves with `eth_call`, where the caller is the facilitator, not USDC. A pocket that requires `msg.sender == USDC`, or that records state, will pass on-chain but fail pre-verification. Make the pocket's check depend only on `hash` and `signature`.

### 3.4 Smart-account options compared

| Option | Can enforce recipient and amount for an EIP-3009 payment? | What we found in the source | Fit |
| --- | --- | --- | --- |
| **Custom minimal pocket contract** (our own `isValidSignature`) | **Yes** (we decode the fields ourselves) | Full control; about 100 lines. Can optionally extend `BaseAccount` from `eth-infinitism/account-abstraction` (v0.9.0 repo, GPL-3.0) to also be a real ERC-4337 account; the EntryPoint v0.7 is deployed on Base Sepolia. | **Path A, recommended for the spike** |
| ZeroDev Kernel (v0.4.0 layout in repo, last commit 2026-10-03, MIT) | Only with a custom validator or signer; permission policies receive `(permissionId, sender, hash, signature)` | Uses a nested EIP-712 "ERC-7739" wrapper; the raw-hash path is off unless the caller is allowed, so the hash a module sees may not be USDC's digest | Heavy for one day; later upgrade |
| Biconomy Nexus (v1.2.1 in `package.json`, last commit 2026-08-07, MIT) | Only with a custom ERC-7579 validator module | `isValidSignature` takes the first 20 bytes of the signature as the validator address, then calls `validator.isValidSignatureWithSender(msg.sender, hash, rest)`: the **raw hash and our own signature bytes arrive unchanged**. A custom validator can do our decode-and-check. | Best "real 4337 + 7579" upgrade after the spike |
| Safe + Safe7579 (Rhinestone adapter, last commit 2026-09-21, MIT and GPL-3.0 files) | Same as Nexus: custom validator via `isValidSignatureWithSender` with a 20-byte validator prefix | A Safe 1.4.1 signature accepted by Base-mainnet USDC was shown in a 2026-10-07 fork test; restricting what the Safe signs needs a module, guard or roles | Possible, more moving parts |
| Rhinestone / ERC-7579 Smart Sessions (repo last commit 2025-08-04, MIT and AGPL-3.0 files) | **No off-the-shelf policy**: its 1271 policy interface gets `(id, requestSender, account, hash, signature)` and the signature must be wrapped in ERC-7739 with an enabled "content" | Spending-limit policies (`ERC20SpendingLimitPolicy`, etc.) guard userOps, not EIP-3009 signatures. AGPL needs care. | Not for the payment path |
| Coinbase Spend Permissions (`SpendPermissionManager` `0xf85210B21cC50302F477BA56686d2019dC9b67Ad`, MIT) | Not through x402 | Lets an app pull tokens from a Coinbase Smart Wallet inside an allowance; it is a pull-by-contract design with no x402 wire path | Cite as related work only |
| MetaMask Delegation Framework (ERC-7710) + Hybrid DeleGator | **Yes through caveat enforcers** | Enforcers in the repo: `AllowedTargets`, `AllowedMethods`, `AllowedCalldata`, `ERC20TransferAmount` (running total per delegation), `Timestamp`, `LimitedCalls`, `LogicalOrWrapper`, `Redeemer`, `ERC20PeriodTransfer`. Recipient lists and per-payment caps need `LogicalOrWrapper`+`AllowedCalldata` or one small custom enforcer. | **Path B** |

### 3.5 Session keys and "the agent never holds the owner key"

For Path A: the pocket stores one `agent` address (the session key). The pocket accepts a payment only when the packed signature includes a valid ECDSA signature by `agent` over the digest. The owner key sits in the browser wallet and can only call `revoke`, `setRules`, `withdraw`. For Path B: the owner signs one root delegation to the agent key (with caveats); the agent signs a short-lived re-delegation per payment (`parentPermissionContext` in `createx402DelegationProvider`); the DelegationManager enforces both.

### 3.6 ERC-8004 (agent identity and reputation)

| Fact | Detail | Source |
| --- | --- | --- |
| Status | Draft ERC, created 2025-08-13; three registries: Identity (ERC-721), Reputation, Validation | eips.ethereum.org/EIPS/eip-8004 |
| Deployed on Base Sepolia | IdentityRegistry `0x8004A818BFB912233c491871b3d84c89A494BD9e`, ReputationRegistry `0x8004B663056A597Dffe9eCcC1965A193B7388713` (both have proxy code today). Same addresses on many testnets; mainnet uses `0x8004A169...` and `0x8004BAa1...`. | Repo README, plus our `eth_getCode` |
| Identity functions | `register(agentURI)`, `setAgentURI`, `setMetadata`, **`setAgentWallet(agentId, newWallet, deadline, signature)`**, `getAgentWallet` | `IdentityRegistryUpgradeable.sol` |
| Smart-wallet detail | `setAgentWallet` first tries ECDSA, then calls `newWallet.isValidSignature(digest, signature)`. **Our pocket must therefore accept an owner-signed hash** (a second signature mode), not only payment signatures. | same file, lines 132-165 |
| Reputation | `giveFeedback(agentId, value, decimals, tag1, tag2, endpoint, feedbackURI, feedbackHash)`; self-feedback by the owner or operators is rejected; `getSummary` and `readAllFeedback` read it back | `ReputationRegistryUpgradeable.sol` |
| Licence | Mostly MIT, spec text CC0 | repo |
| Real-world use | A community repo (`Dosbox420/agent-chain`) reports an ERC-8004 registration on Base Sepolia (agentId 9620) and an x402 settlement; self-reported, we did not check the transactions | its README |

**Simplification this allows:** the spec's guard 1 needs "the session key registered to this agent ID". If the pocket stores the agent key (`pocket.agent()`), the gateway can read it from the pocket and the ERC-8004 registry only needs to carry identity, wallet and reputation. Our own contract shrinks to "agentId to owner binding and KYC tier".

## 4. The most likely working recipe (Path A) (chosen; built without the ERC-4337 options)

**Goal:** a pocket account that USDC accepts as payer, with recipient, cap, expiry and revoke enforced on-chain.

### 4.1 Components and addresses

| Piece | Choice | Address or package |
| --- | --- | --- |
| Chain | Base Sepolia, chain id 84532 | RPC `https://sepolia.base.org` (public, rate-limited: use a keyed provider for the demo [VERIFY which free tier]) |
| Token | USDC (Circle, v2.2 behaviour) | `0x036CbD53842c5426634e7929541eC2318f3dCF7e`; EIP-712 domain name "USDC", version "2" (as in the x402 spec example) |
| Pocket | Custom Solidity contract, deployed per pocket by a small factory (CREATE2) | We write it (sketch below) |
| Facilitator | Self-hosted from `examples/typescript/facilitator/basic` using `@x402/core`, `@x402/evm` 2.28.0, viem 2.57.4; fall back to `https://x402.org/facilitator` for a first smoke test | Relayer key with Base Sepolia ETH |
| Seller | Express with `@x402/express` 2.28.0 and our guards in hooks | 2.28.0 |
| Buyer | `@x402/fetch` `wrapFetchWithPayment` + a custom `ClientEvmSigner` whose `signTypedData` builds the pocket signature | 2.28.0 |
| Identity | ERC-8004 registries above | addresses above |

### 4.2 Pocket signature format (sketch, untested)

`isValidSignature(bytes32 hash, bytes sig)` reads the first byte as a mode:

- **Mode 0x01 (payment).** Decode `(token, to, value, validAfter, validBefore, nonce, agentSig)`. Rebuild the USDC digest: `keccak256(0x1901 || domainSeparator || keccak256(abi.encode(TRANSFER_WITH_AUTHORIZATION_TYPEHASH, address(this), to, value, validAfter, validBefore, nonce)))`, with the domain separator read from `USDC.DOMAIN_SEPARATOR()`. Require it equals `hash`. Require: `token == USDC`, not revoked, `validBefore <= expiry`, `to` is allowlisted, `value <= perPaymentCap`, and `agentSig` is a valid ECDSA signature of `hash` by `agent`. Return `0x1626ba7e` or `0xffffffff`.
- **Mode 0x00 (owner).** Require an ECDSA signature by `owner` over `keccak256(address(this), hash)` (bound to this pocket so it cannot be replayed on another). Needed for `setAgentWallet`.

The type hash is `keccak256("TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)")` (it is the standard EIP-3009 type; confirm against the `authorizationTypes` constant in `@x402/evm`).

### 4.3 Rules that work read-only, and one that does not

| Rule | Works in a read-only check? | How |
| --- | --- | --- |
| Recipient allowlist | Yes | mapping set by owner |
| Per-payment cap | Yes | compare `value` |
| Expiry, lifetime | Yes | `block.timestamp` (also cap `validBefore`) |
| Revoke | Yes | flag set by owner; every later check fails, including already-signed authorizations |
| One-task pocket void after use | Partly | USDC's own nonce stops replay of one authorization; "void after first payment" needs state, so use balance = one price or let the owner drain |
| **Total budget (running spend)** | **No** (cannot write state in a read-only call) | **Make the pocket's USDC balance the budget.** Fund exactly the budget; unused money returns at expiry through an owner-only `withdraw`. Bonus: this is the spec's "funds physically separated from the owner's main balance". |

Residual risk to state honestly in the security report: while the pocket is live, the agent could sign several authorizations at once, each under the cap and to allowlisted sellers; the worst case is bounded by the pocket balance. Cap `validBefore` to a short window (for example 10 minutes from now) to limit stockpiled authorizations.

### 4.4 Path B in short (ERC-7710 with MetaMask) (not built)

1. Owner creates a MetaMask **Hybrid DeleGator** (`toMetaMaskSmartAccount`, `Implementation.Hybrid`, from `@metamask/smart-accounts-kit` 2.0.0) and funds it with test USDC.
2. Owner signs a root delegation to the agent key with caveats: `AllowedTargets` = USDC, `AllowedMethods` = `transfer`, `ERC20TransferAmount` = total budget, `Timestamp` = expiry, recipient allowlist via `LogicalOrWrapper` over `AllowedCalldata` entries, per-payment cap via one small custom enforcer.
3. Buyer client: `x402Erc7710Client` with `createx402DelegationProvider({ account: agentKey, parentPermissionContext: rootDelegation })` registered on `eip155:*`.
4. Seller: `paymentMiddleware` with `assetTransferMethod: "erc7710"` and `x402ExactEvmErc7710ServerScheme`, facilitator URL above.
5. Revoke: owner calls `disableDelegation` on the DelegationManager.

Strengths: audited enforcers, running total budget, native revoke, a hosted facilitator that already supports it, and re-delegation gives "agent pays agent" sub-budgets (scene 3). Weaknesses: only MetaMask's facilitator speaks it (the open-source SDK does not), the buyer side is marked `experimental` in the package path, and the docs contradict each other on which caveats are auto-added [VERIFY]. A hackathon team (Guardian, on HackQuest, self-reported) says they had to write a custom facilitator; MetaMask's hosted one now appears to cover that.

## 5. Fallback ladder

Step down one rung at a time. A rung "fails" when one focused debugging pass has not produced a settled transaction hash.

| Rung | What | What we keep | What we lose | Wording for the security report |
| --- | --- | --- | --- | --- |
| **0 (target)** | Path A: custom pocket, standard EIP-3009 `exact`, self-hosted facilitator | Everything in the spec | Nothing | Allowlist, cap, expiry, revoke enforced on-chain; budget equals pocket balance |
| 0b | Same, but the public `x402.org/facilitator` is the one that fails | Same | We run our own facilitator (about one extra service and a funded key) | Same |
| 1 | **Path B** (MetaMask ERC-7710) | On-chain limits, hosted facilitator, native revoke, sub-delegation | Depends on MetaMask's service; custom enforcer for the cap | Limits enforced by DelegationManager and enforcers |
| 2 | **Own settlement contract** (`PocketPay.pay(to, amount, intentHash)` called by the agent key; our gateway verifies the transfer event; not x402 wire-compatible) | On-chain limits and tx hashes | Standard x402 interoperability, so the BYOA story weakens | Limits on-chain, but the payment is not a standard x402 authorization |
| 3 | **Capped hot wallet** (plain EOA, stock `@x402/evm` client, the spec's own fallback) | Real x402 payments and tx hashes, registry and revoke on-chain | On-chain recipient and cap enforcement | Allowlist enforced off-chain by the MCP server; hard guarantee is "loss at most the hot wallet balance" |
| 4 | Same as 3 but on Base mainnet with a few US dollars | Only needed if organisers reject testnet hashes (open question in the spec) | Cost, risk | Same, plus real funds |

**Rule of thumb for the decision at the end of Wednesday:** if Path A settled a payment and the pocket rejected a wrong-recipient and an over-cap authorization (both tests recorded), keep Path A and park Path B as a documented alternative. If only B works, switch to B and rewrite the spec's pocket section to name the DelegationManager as the enforcer. If neither works, use rung 3 and apply the cut order in the spec.

## 6. Wednesday spike checklist

Two parallel workstreams. Everything is a step you do by hand with your own code; never run code from `reference/repos/` (it is untrusted data, read it only).

**Before you start (everyone, Tue night or first thing)**

1. Install Foundry (`curl -L https://getfoundry.sh/install | bash && foundryup`, from the Foundry book) and Node 20 or later (the MetaMask packages require it; the `@metamask/x402` docs state Node 20+).
2. Make one throwaway deployer key, one relayer key (facilitator), one agent key. Never reuse a real wallet. Keep keys in a local `.env` that is not committed.
3. Get Base Sepolia ETH for the deployer and the relayer, and test USDC for the pocket. Circle's faucet limits and the best ETH faucet are not verified here: Circle's developer-console faucet page lists USDC per request and one request per 24 hours per testnet (search snippet, [VERIFY]); try Circle's faucet and Coinbase/Alchemy ETH faucets and write down which worked.
4. Get a keyed Base Sepolia RPC URL (Alchemy, QuickNode or similar free tier) so the demo does not hit the public rate limit.

**Workstream A (custom pocket, EIP-3009)** — gate: question 2 and question 3

| Step | Action | Pass looks like | Likely pitfall |
| --- | --- | --- | --- |
| A1 | Write `Pocket.sol` (owner, agent, allowlist, cap, expiry, revoked, modes 0x00 and 0x01) and a Foundry test that builds an EIP-3009 digest and checks accept and reject cases | `forge test` green: right recipient accepted; wrong recipient, over-cap, expired, revoked, wrong token each rejected | Domain separator mismatch. Read `DOMAIN_SEPARATOR()` from the token in the test and compare with the one from viem `hashTypedData` |
| A2 | Run the same test on a Base Sepolia fork (`forge test --fork-url <rpc>`) calling the real USDC `transferWithAuthorization(bytes)` with your pocket as `from` | USDC moves test dollars from the pocket on the fork | Pocket has no USDC on the fork: use `deal` for the balance |
| A3 | Deploy the pocket on Base Sepolia, fund it with a small amount of test USDC | Contract and balance visible on BaseScan | None expected |
| A4 | Write the custom `ClientEvmSigner`: `signTypedData` receives the message, builds mode-0x01 bytes, signs the digest with the agent key | Facilitator `verify` returns `isValid: true` | The stock client sets `validBefore = now + maxTimeoutSeconds`; our pocket's expiry rule must allow that window |
| A5 | Stand up the self-hosted facilitator from the SDK example on Base Sepolia (strip the Solana parts); also try `https://x402.org/facilitator` first, because it needs no setup | `settle` returns a transaction hash that shows USDC leaving the pocket | A5-a: facilitator pre-verify fails because the pocket checks `msg.sender`. A5-b: wrong signature length path. A5-c: relayer out of gas |
| A6 | Negative tests through the facilitator: wrong recipient, over cap, revoked pocket | `verify` or `settle` fails with a clear error; **record the failing tx or error text for scene 6** | A reverted settlement may still burn gas; fine |
| A7 | Owner-mode check: register an agent in the ERC-8004 IdentityRegistry and call `setAgentWallet` with the pocket as wallet | `getAgentWallet(agentId)` returns the pocket | Digest wrapping: the owner signature must be over `keccak256(pocket, hash)` as in our mode 0x00 |

**Workstream B (MetaMask ERC-7710)** — gate: fallback rung 1

| Step | Action | Pass looks like | Likely pitfall |
| --- | --- | --- | --- |
| B1 | Create a Hybrid DeleGator on Base Sepolia from an EOA with `@metamask/smart-accounts-kit` 2.0.0; fund with test USDC | Account deployed (it must be deployed before settlement, per a community write-up [VERIFY]) | Deploying needs a userOp or a factory call: use the kit's helper |
| B2 | Seller on Base Sepolia using `@metamask/x402` and the hosted facilitator URL from section 3.2 | 402 response shows `assetTransferMethod: "erc7710"` and a `facilitatorAddresses` list | The docs show two different facilitator hosts: test both |
| B3 | Buyer with `x402Erc7710Client` and `createx402DelegationProvider`, first signing with the owner account directly | Paid request returns data and a tx hash | Open delegation is redeemable by anyone unless the redeemer caveat is set (the provider adds it) |
| B4 | Add the agent as a re-delegate (root delegation from the pocket with caveats; `parentPermissionContext`) | Payment settles with the agent key signing | Caveat order and `args`: expect trial and error |
| B5 | Over-limit tests: amount above budget, recipient not allowed, after `disableDelegation` | Redemption reverts | Per-payment cap needs the custom enforcer |

**End of Wednesday (decision gate)**

- Write the result in `../07-log/research-log.md` and in the spec's open-questions section (via the product owner; the spec file is read-only for research).
- Record: pocket address, three tx hashes (one success, two rejections), facilitator used, gas paid, and which rung we are on.
- Do not start the registry or the seller template until the rung is chosen.

## 7. Real-world notes that affect the demo

- **Competitors can reach the same standard parts.** A community issue (x402 #2641, opened 2026-06-16, no maintainer reply) proposes a policy-gated escrow payer using the same ERC-1271 route, and MetaMask now ships x402 ERC-7710. A "smart wallet pays x402 within limits" demo is no longer novel by itself. The seller-side guards and the owner-binding story are where we differ.
- **Median x402 seller revenue is tiny** according to one repo's own research notes (about US$0.06 a month, 38% earn nothing; self-reported, unverified). Do not claim x402 volume as proof of demand.
- **Everything here is testnet.** Mainnet USDC behaves the same (v2.2), but the x402.org facilitator does not serve mainnet.

## What this means for winning

| Tag | Recommendation | Helps |
| --- | --- | --- |
| [must] | Run Path A on Wednesday morning and record one success hash and two rejection results (wrong recipient, over cap). This is the evidence behind the "limits a hijacked agent cannot break" claim. | Task 40 / Security 30 |
| [must] | Put a second person on Path B at the same time so we do not lose a day if A hits a wall. | Task 40 |
| [must] | Make the pocket's USDC balance the total budget and say so plainly in docs; do not promise a running spend counter in the contract. | Security 30 |
| [should] | Use the deployed ERC-8004 registries instead of writing our own; store the session key in the pocket and read it from there for guard 1. | Task 40 / Innovation 30 |
| [should] | Use the standard x402 extensions where they fit (offer-receipt for the signed quote and receipt, sign-in-with-x or http-message-signatures for agent identity) and cite them; it shows we build on the standard. Check each extension's wire status first because offer-receipt says its shape is not stable. | Innovation 30 |
| [should] | Build the custom client scheme that sets the nonce to `hash(intentId, quoteHash)`; this is how the payment itself commits to the intent. | Innovation 30 / Security 30 |
| [could] | After the spike, move the pocket to Nexus or Safe7579 with our validator as a module, so "ERC-4337 smart account" is literally true. Only if the core scenes are done. | Bonus |
| [could] | Show Path B (ERC-7710 plus re-delegation) as the "agent pays agent" sub-budget in scene 3 if it works. | Innovation 30 |

## Open questions

- Does the public x402.org facilitator (and the CDP one) accept a non-65-byte contract signature end to end? Only a real settlement answers this.
- If a settlement fails after the handler ran, does the Express adapter discard the buffered response? (Read from code, not yet tested.)
- Does the MetaMask hosted facilitator need an API key or allow-listing for real payments (only an empty-body `verify` was tested)?
- Which caveat set does `createx402DelegationProvider` add automatically (the docs list two different sets)?
- Which faucet gives enough test USDC and ETH, and how fast? (Circle faucet limits are snippet-only.)
- Can the pocket be an ERC-4337 account and still keep `isValidSignature` free of wrapper hashing? Needed only for the "real 4337" upgrade.

## Sources

Web pages (accessed 2026-10-13):
- x402 wallet compatibility: https://docs.x402.org/advanced-concepts/wallet-compatibility.md
- Coinbase CDP x402 facilitator: https://docs.cdp.coinbase.com/x402/core-concepts/facilitator
- Circle USDC contract addresses: https://developers.circle.com/stablecoins/usdc-contract-addresses (address only, no version text)
- x402.org facilitator `/supported`: https://x402.org/facilitator/supported
- MetaMask hosted facilitator `/supported`: https://tx-sentinel-base-sepolia.api.cx.metamask.io/platform/v2/x402/supported and https://tx-sentinel-base-sepolia.dev-api.cx.metamask.io/platform/v2/x402/supported
- MetaMask x402 docs: https://docs.metamask.io/smart-accounts-kit/guides/x402/overview/ , https://docs.metamask.io/smart-accounts-kit/reference/x402/ , https://docs.metamask.io/smart-accounts-kit/development/guides/x402/seller/ , https://docs.metamask.io/smart-accounts-kit/development/guides/x402/buyer/delegations/
- x402 issue #2641 (policy-gated payer concept, 2026-06-16): https://github.com/x402-foundation/x402/issues/2641
- Safe as x402 payer fork test (2026-10-07): https://github.com/DeepFirstHQ/deepfirstsearch/issues/23
- ERC-8004 spec: https://eips.ethereum.org/EIPS/eip-8004
- Search-snippet only: EphemeralWallet PR #7 (https://github.com/DavideSilva/EphemeralWallet/pull/7), Circle faucet limits (https://developers.circle.com/wallets/developer-console-faucet), HackQuest "Guardian" project (https://www.hackquest.io/projects/Guardian-RAGjfA)
- Foundry install (ctx7 `/foundry-rs/book`), x402 client/facilitator examples (ctx7 `/coinbase/x402`)
- Base Sepolia RPC read-only calls: https://sepolia.base.org (2026-10-13, chain id 84532)
- npm registry versions: https://registry.npmjs.org/ (2026-10-13)

Local repos (read only, never run):
- `/Users/user/Workspace/Projects/shenzhen/lianainao-fintechathon/reference/repos/from-prior/x402` (specs, `typescript/packages/mechanisms/evm`, `typescript/packages/mcp`, `examples/typescript/facilitator/basic`, `docs/advanced-concepts/`)
- `/Users/user/Workspace/Projects/shenzhen/lianainao-fintechathon/reference/repos/build/stablecoin-evm` (Circle USDC source)
- `/Users/user/Workspace/Projects/shenzhen/lianainao-fintechathon/reference/repos/build/erc-8004-contracts`
- `/Users/user/Workspace/Projects/shenzhen/lianainao-fintechathon/reference/repos/build/delegation-framework`, `.../smart-accounts-kit`, `.../kernel`, `.../nexus`, `.../safe7579`, `.../smartsessions`, `.../spend-permissions`, `.../account-abstraction`, `.../agent-chain`

Related docs: [stack and repos](stack-and-repos.md), [product spec](../02-product/product-design.md).

See also: [master index](../README.md), [how to win](../06-pitch/how-to-win.md), [recommended changes](../02-product/recommended-changes.md)
