# Stack and Reference Repos for ChainBrain
Last updated: 2026-10-14

> **Status (14 Oct, v2):** The real stack is the table in the "Real stack (v2)" section below, taken from the [technical document](../technical-document.md). The per-component recommendations that follow are the research plan; items not used are marked "(proposed, not used)". The ERC-8004, EAS, reputation and MCP items are finals roadmap. Spec: [product design](../02-product/product-design.md).

## In one minute

- **Use TypeScript everywhere except the contracts.** One language for the seller gateway, MCP server, facilitator, consoles and tests means any teammate can fix any part. Contracts are Solidity built and tested with Foundry.
- **Do not write what already exists on Base Sepolia.** The ERC-8004 identity and reputation registries, the Ethereum Attestation Service (EAS), USDC v2.2, the ERC-4337 EntryPoint v0.7, the MetaMask DelegationManager and Permit2 are all deployed and confirmed to have code today. Our own contracts are three: the **Pocket** (plus a small factory), an **agent binding** record, and optionally one **policy enforcer** for Path B. See [the feasibility doc](x402-pocket-feasibility.md) for addresses.
- **Use the official x402 packages (version 2.28.0, 2026-09-29).** `@x402/express` for sellers, `@x402/fetch` for the buyer client, `@x402/evm` for the scheme, `@x402/core` for hooks. Our seller guards plug into its hooks; no fork needed.
- **The MCP server is a wallet tool server, not a paid-tool server.** Build it with `@modelcontextprotocol/sdk` 1.32.1; its `pay_x402` tool calls `@x402/fetch` with our custom pocket signer. `@x402/mcp` is only needed if a seller exposes its own MCP tools behind x402.
- **Credentials: keep it simple.** Signed attestations through EAS (on-chain, revocable) for issuer claims, and JWT-style verifiable credentials (`did-jwt` or `jose`) for what the agent presents. WeIdentity and FISCO BCOS stay bonus-only.
- **12 reference repos are cloned in `reference/repos/build/`** (about 120 MB). They are read-only reading material: never build, install or run them. Best three to read first: `stablecoin-evm` (what USDC checks), `from-prior/x402` (SDK, specs, hooks), `erc-8004-contracts` (identity and reputation).
- **Watch the licences.** Safe7579 and Smart Sessions contain GPL-3.0 and AGPL-3.0 files and the ERC-4337 reference repo is GPL-3.0. We read them; we do not copy code from them into our repo without a licence check.

## Real stack (v2, as built)

From the [technical document](../technical-document.md).

| Component | Path | Stack |
| --- | --- | --- |
| Pocket + factory | `contracts/` | Solidity 0.8.24, Foundry, OpenZeppelin 5.4 (ECDSA) |
| Wallet tool layer + agent API | `server/src/wallet`, `server/src/agent`, `server/src/index.ts` | Node 24, TypeScript, Hono, viem, `@x402/*` 2.28.0, Anthropic SDK |
| Test sellers | `server/src/sellers.ts` | Stock `@x402/hono` middleware, one template, four configurations |
| Web owner app | `web/` | Vite + React 19, browser wallet (EIP-1193) |
| Phone owner app (Expo) | `mobile/` | Expo SDK 57, React Native 0.86, viem, `expo-secure-store` |
| Phone owner app (native) | `android/` | Kotlin, Jetpack Compose, web3j crypto/abi 4.12.3, OkHttp, Android Keystore |

Proposed in the research below but not used in the prelim build: Express 5 and `@x402/express` (build uses Hono and `@x402/hono`), Next.js, wagmi, RainbowKit, Vercel AI SDK, the MCP server and `SKILL.md`, the ERC-8004 and EAS contracts, `AgentBinding`, seven guards, `did-jwt`/`jose`, FISCO BCOS, and the ERC-4337 options. The MCP, ERC-8004, EAS and reputation items are finals roadmap.

## 1. Recommended stack per component (research plan; see the real stack above)

Components are the rows of the architecture table in the spec ([spec](../02-product/product-design.md), "System architecture"), plus the parts the spec leaves implicit.

| Component | Recommended choice | Version checked (2026-10-13) | Why | Alternative if it fails |
| --- | --- | --- | --- | --- |
| **Contracts: pocket** | Custom `Pocket.sol` with ERC-1271 `isValidSignature`, owner/agent roles, allowlist, per-payment cap, expiry, revoke; a CREATE2 factory | Solidity 0.8.x, Foundry, OpenZeppelin Contracts 5.6.1 (MIT) | Only route that enforces recipient and amount for a USDC authorization with full control; see feasibility doc sections 3.4 and 4 | MetaMask Hybrid DeleGator with caveat enforcers (Path B); then Nexus or Safe7579 plus our validator module |
| **Contracts: agent registry** (proposed, not used; finals roadmap) | The deployed ERC-8004 IdentityRegistry `0x8004A818BFB912233c491871b3d84c89A494BD9e` plus a thin `AgentBinding` contract of ours (agentId to owner, pocket, KYC tier) | n/a | Saves writing an ERC-721 registry; `setAgentWallet` already supports smart-contract wallets | Our own minimal registry (about 60 lines) if the deployed one misbehaves |
| **Contracts: reputation** (proposed, not used; finals roadmap) | Deployed ERC-8004 ReputationRegistry `0x8004B663056A597Dffe9eCcC1965A193B7388713` for feedback, plus our attester that signs summaries as EAS attestations | n/a | Self-feedback is already blocked by the contract; spec's level-1 attestation | Static signed credential (spec cut order step 1) |
| **Contracts: credentials** (proposed, not used; finals roadmap) | EAS on Base Sepolia (predeploys `0x4200...0021` EAS and `0x4200...0020` schema registry, code confirmed) for KYC-tier and KYB claims | `@ethereum-attestation-service/eas-sdk` 2.10.0 | Issuer-signed, revocable, checked on-chain, no new contract | Plain EIP-712 signed JSON checked by the gateway |
| **Chain and token** | Base Sepolia (84532), USDC `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | n/a | Existing x402 facilitators serve it; USDC v2.2 behaviour proven | Base mainnet with a few dollars if organisers need mainnet hashes |
| **Chain client library** | viem | 2.57.4 (2026-10-08) | Used by the x402 SDK itself; has typed-data hashing, 6492 helpers, `simulateCalls` | none needed |
| **Facilitator** (build: public testnet facilitator by default, `FACILITATOR=local` in-process) | Self-hosted from the SDK's `facilitator/basic` example; first smoke test against `https://x402.org/facilitator` | `@x402/core` / `@x402/evm` 2.28.0 | We control hooks and logs; strict ERC-1271 check | MetaMask hosted facilitator (Path B); CDP facilitator (needs API key) |
| **Seller gateway + x402** (proposed with Express and seven guards, not used; build uses Hono) | Node/TypeScript with Express 5 and `@x402/express`; seven guards as `onProtectedRequest` / `onBeforeVerify` / `onAfterVerify` hooks; one template instantiated six times | Express 5.3.0, `@x402/express` 2.28.0 | Standard middleware verifies, runs handler, settles, then releases the response (read in source) | Hono adapter `@x402/hono` 2.28.0 |
| **Standard x402 extensions** (proposed, not used) | `offer-receipt` for signed quote and receipt; `sign-in-with-x` or `http-message-signatures` for the agent-identity challenge | spec files in local clone | Our "challenge in the 402" and "seller-signed quote and receipt" are already specified upstream; check wire stability first (marked unstable) | Our own header fields, documented |
| **Buyer client** | `@x402/fetch` `wrapFetchWithPayment` with a custom `ClientEvmSigner` (pocket signature) and a custom scheme that sets the nonce to `hash(intentId, quoteHash)`; hooks `onBeforePaymentCreation` and `spendControls` for guard 4 | 2.28.0 | The `ClientEvmSigner` type is just `{address, signTypedData}`, so a custom signer fits | Raw viem calls to the facilitator |
| **MCP server for agents** (proposed, not used; finals roadmap) | `@modelcontextprotocol/sdk` (TypeScript) exposing `search_sellers`, `get_quote`, `draft_intent`, `pay_x402`, `ask_owner`, `get_pocket`, plus `SKILL.md`; zod 4.6.7 for tool schemas | SDK 1.32.1 (2026-10-05, MIT) | Official SDK; matches the spec; note the Python SDK is on 2.x while TypeScript is on 1.x | `@x402/mcp` 2.28.0 helpers if sellers also serve MCP tools |
| **Credentials and attester** (proposed, not used; finals roadmap) | EAS attestations (issuer claims) and `did-jwt` 9.0.2 or `jose` 6.2.12 for presentations; WeIdentity only for the FISCO bonus | as listed | Light, well supported, avoids a full VC framework (`@veramo/core` 7.0.2 exists but is heavy) | Hand-rolled EIP-712 credentials |
| **Agent runtime (LLM)** (build: Anthropic SDK tool loop) | Team's call on model; tool-use reliability first (spec open question). Vercel AI SDK `ai` 7.0.138 or the Anthropic SDK 0.133.0 gives tool loops and streaming for the trace panel | as listed | Needed for the trace panel showing tool calls | OpenAI Agents SDK, LangGraph |
| **Consoles** (proposed Next.js/wagmi, not used; build is Vite + React 19) | One web app: Next.js 16.4 or Vite 8.3 with React 19.3, wagmi 3.7.7 + viem for the owner's browser wallet, RainbowKit 2.2.11 for the connect button | as listed | One build for chat and trace, owner pockets and seller console; owner signs with a plain browser wallet as in the spec | Plain HTML plus viem if time runs short |
| **Tests and evidence** | Foundry tests for contracts; Vitest 5.0.4 for gateway and MCP; a scripted test per demo scene 4 to 9 (the spec says those double as test cases) | as listed | Scene tests feed the security self-assessment | Manual runs recorded on video |
| **Data store for demo** | SQLite or in-memory for nonces, quotes and the seller feed; nothing else | n/a | One-week scope | none needed |
| **FISCO BCOS (bonus only)** (planned, not built) | Minimal Pocket-policy deployment in ECDSA mode with one tx hash | FISCO BCOS v3.17.1 (2026-09-15, from prior research) | Spec: bonus, in order, after core | Skip; mention as production path |

## 2. Version pins (so teammates install the same thing)

Pin exact versions in `package.json`; use Node 20 or later (the MetaMask packages require it).

| Package | Version | Licence | Published |
| --- | --- | --- | --- |
| `@x402/core`, `@x402/evm`, `@x402/express`, `@x402/fetch`, `@x402/mcp`, `@x402/next`, `@x402/hono`, `@x402/paywall` | 2.28.0 | Apache-2.0 | 2026-09-29 |
| `x402` (old v1 package, do not use) | 1.2.0 | Apache-2.0 | 2026-04-16 |
| `viem` | 2.57.4 | MIT | 2026-10-08 |
| `@modelcontextprotocol/sdk` | 1.32.1 | MIT | 2026-10-05 |
| `@metamask/smart-accounts-kit` | 2.0.0 | MIT-0 or Apache-2.0 | 2026-08-13 |
| `@metamask/x402` | 1.0.0 | MIT-0 or Apache-2.0 | 2026-08-13 |
| `permissionless` (Pimlico) | 0.4.1 | MIT | 2026-09-09 |
| `@zerodev/sdk` / `@zerodev/permissions` | 5.5.10 / 5.6.3 | MIT | 2026-04-01 / 2025-11-17 |
| `@rhinestone/module-sdk` | 0.4.0 | MIT | 2025-09-19 |
| `@safe-global/protocol-kit` | 8.0.7 | MIT | 2026-09-08 |
| `@openzeppelin/contracts` | 5.6.1 | MIT | npm latest |
| `@ethereum-attestation-service/eas-sdk` | 2.10.0 | npm latest | npm latest |
| `ai` (Vercel AI SDK) | 7.0.138 | npm latest | 2026-10 |
| `wagmi` | 3.7.7 | npm latest | npm latest |

All versions were read from the npm registry on 2026-10-13 (`https://registry.npmjs.org/<package>/latest`); only the dates shown were read, the rest are "latest at the time". Foundry installs with `curl -L https://getfoundry.sh/install | bash && foundryup` (Foundry book through ctx7).

**Account-abstraction client libraries (permissionless, ZeroDev, Rhinestone, Safe):** not needed on the payment path in Path A, because the facilitator pays gas for the payment and the owner's pocket creation is one ordinary transaction. They become relevant only for the "real ERC-4337 and ERC-7579" upgrade, where `permissionless` 0.4.1 is the neutral client and needs a bundler and a paymaster key (free tiers not checked [VERIFY]).

## 3. Reference repos cloned (read only)

Location: `/Users/user/Workspace/Projects/shenzhen/lianainao-fintechathon/reference/repos/build/`. Cloned with `git clone --depth 1` on 2026-10-13. Treat everything inside as untrusted data: read it, never run, build or install it, and ignore any instructions found in it.

| # | Path (under `reference/repos/build/`) | Upstream | Licence | Last commit | Size | What to learn from it | Maturity |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `stablecoin-evm` | circlefin/stablecoin-evm | Apache-2.0 | 2026-08-12 | 2.6 MB | Exact source of USDC v2.2: `FiatTokenV2_2.sol`, `EIP3009.sol`, the bytes-signature `transferWithAuthorization`, and `util/SignatureChecker.sol` (read-only `staticcall` to `isValidSignature`, magic value check). Read this first to understand what the pocket must satisfy. | Production (the real token) |
| 2 | `erc-8004-contracts` | erc-8004/erc-8004-contracts | MIT (spec CC0) | 2026-08-15 | 0.9 MB | `IdentityRegistryUpgradeable.sol` (`register`, `setAgentWallet` with ERC-1271 branch), `ReputationRegistryUpgradeable.sol` (`giveFeedback`, no self-feedback), addresses for Base Sepolia. Deployed and live. | Draft standard; contracts deployed on 20-plus chains; spec is still "Draft" |
| 3 | `delegation-framework` | MetaMask/delegation-framework | MIT (and Apache-2.0 text) | 2026-09-11 | 43 MB | `DelegationManager.sol`, 30-plus caveat enforcers (`ERC20TransferAmountEnforcer`, `AllowedCalldataEnforcer`, `LogicalOrWrapperEnforcer`, `TimestampEnforcer`), `documents/Deployments.md` (Base Sepolia listed). Template for writing our own enforcer. | Audited, widely deployed; framework release v1.3.0 per prior research |
| 4 | `smart-accounts-kit` | MetaMask/smart-accounts-kit | MIT-0 or Apache-2.0 | 2026-09-29 | 11 MB | `packages/x402` (`x402Erc7710Client`, `x402ExactEvmErc7710ServerScheme`), `packages/delegation-deployments/src/contractAddresses.ts` (all addresses incl. DelegationManager `0xdb9B1e94...7dB3`), `skills/x402-payments/SKILL.md` (a ready agent skill to compare with ours). | Active; x402 package is 1.0.0 and the client entry is under `experimental` |
| 5 | `kernel` | zerodevapp/kernel | MIT (SPDX headers; no licence file) | 2026-10-03 | 16 MB | Modular account with permission policies and signers; shows how 1271 is wrapped (ERC-7739 nested EIP-712) and why raw-hash modules are harder here. | Mature, audited; repo layout changed to "v0.4.0" release file |
| 6 | `nexus` | bcnmy/nexus | MIT | 2026-08-07 | 12 MB | `Nexus.sol` `isValidSignature`: first 20 bytes pick the validator, then `isValidSignatureWithSender(msg.sender, hash, rest)` gets the raw hash. Best fit for hosting our custom validator as an ERC-7579 module. | Mature, audited; `package.json` says 1.2.1 |
| 7 | `safe7579` | rhinestonewtf/safe7579 | MIT and GPL-3.0 files mixed | 2026-09-21 | 5.3 MB | Safe + ERC-7579 adapter; same 20-byte-prefix 1271 routing as Nexus. | Audited adapter; check file licences before reuse |
| 8 | `smartsessions` | erc7579/smartsessions | MIT and AGPL-3.0 files mixed | 2025-08-04 | 15 MB | Session-key module with policy library (`ERC20SpendingLimitPolicy`, `UsageLimitPolicy`, `TimeFramePolicy`) and its ERC-1271 policy interface; proves why off-the-shelf policies cannot read an EIP-3009 recipient. Older (over a year since last commit). | Audited 2024-25; stale; AGPL caution |
| 9 | `spend-permissions` | coinbase/spend-permissions | MIT | 2026-03-24 | 4.1 MB | Coinbase's allowance-style `SpendPermissionManager` for Smart Wallets (Base Sepolia listed). Compare with our pocket in the pitch. | Production at Coinbase; not on the x402 payment path |
| 10 | `account-abstraction` | eth-infinitism/account-abstraction | GPL-3.0 | 2025-12-17 | 5.4 MB | ERC-4337 reference: `EntryPoint`, `BaseAccount.sol`, v0.9.0 in `package.json`. Read to see what "real 4337" would require. | Reference implementation; GPL, read only |
| 11 | `permissionless.js` | pimlicolabs/permissionless.js | MIT | 2026-09-09 | 4.9 MB | Neutral TypeScript client for smart accounts, bundlers and paymasters on top of viem; only for the 4337 upgrade. | Mature, widely used |
| 12 | `agent-chain` | Dosbox420/agent-chain | MIT | 2026-10-11 | 1.2 MB | A one-person "policy-gated agent treasury plus x402 plus ERC-8004" on Base Sepolia, claims an ERC-8004 registration (agentId 9620) and an x402 settlement; includes a candid landscape note on tiny seller revenue. Useful as an example of what a rival entry may look like. Claims are self-reported and unchecked. | Hobby/prototype; do not trust claims without checking transactions |

Already present from earlier research in `reference/repos/from-prior/` (not re-cloned): `x402` (the official SDK, specs and docs at commit `f8f8330`, 2026-10-10; the most important repo for this build), `delegation-framework` (duplicate of #3), `AP2`, `camel-prompt-injection`, `progent`, `fides`, `FISCO-BCOS`, `WeIdentity`, `x402-zkid`, `Should-AI-Buy`, `agentic-wallet-skills`, `i402`, `internet-court-skill`, `link-cli`.

**Not cloned on purpose:** Safe Modules (the community fork test already shows Safe signing works, and we are not using Safe), the Coinbase Smart Wallet (its 1271 wrapper is the same pattern as Kernel's), and the heavy ERC-6551 agent NFT repo (78 MB, marginal).

### How to read them efficiently (plain-English order)

1. `stablecoin-evm/contracts/v2/EIP3009.sol` and `util/SignatureChecker.sol`: what USDC asks the pocket.
2. `from-prior/x402/typescript/packages/mechanisms/evm/src/exact/` and `shared/verifySignature.ts`: what the facilitator and client do.
3. `from-prior/x402/specs/schemes/exact/scheme_exact_evm.md`: the three payment methods, including ERC-7710.
4. `erc-8004-contracts/contracts/IdentityRegistryUpgradeable.sol`: how our pocket becomes an agent wallet.
5. `delegation-framework/src/enforcers/`: how Path B enforces limits.

## What this means for winning

| Tag | Recommendation | Helps |
| --- | --- | --- |
| [must] | Pin the versions in section 2 on Wednesday morning in one shared `package.json` and one `foundry.toml`, so nobody loses time to version drift. | Task 40 |
| [must] | Use the deployed ERC-8004 and EAS contracts; spend contract time on the Pocket, its tests and the red-team cases instead. | Task 40 / Security 30 |
| [should] | Plug seller guards into the x402 hooks rather than writing a proxy; it keeps standard x402 clients working (the spec's promise) and is easy to show on screen. | Innovation 30 |
| [should] | Read `smart-accounts-kit/skills/x402-payments/SKILL.md` before writing our own `SKILL.md`; it is a current example of the format the same ecosystem uses. | Innovation 30 |
| [should] | Record a licence note per reused file in the technical doc; the GPL and AGPL files must not be copied. | Security 30 (compliance) |
| [could] | Add `@x402/mcp` so one seller also exposes a paid MCP tool, to show agents paying agents inside MCP. | Innovation 30 |
| [could] | Upgrade the pocket to Nexus or Safe7579 with a custom validator only after scenes 1 to 9 are recorded. | Bonus |

## Open questions

- Which model powers the in-house agent (spec open question), and does its tool-use work well through the Vercel AI SDK or the Anthropic SDK?
- Free-tier bundler and paymaster limits for the 4337 upgrade were not checked.
- Is the community-reported ERC-8004 deployment `agentId 9620` real? We did not check the transaction.
- Do EAS predeploys on Base Sepolia accept schema registration from a fresh wallet without extra setup?
- Exact licence of `kernel` and `smartsessions` repos: only SPDX headers were read, no licence file; confirm before any reuse.

## Sources

Accessed 2026-10-13:
- npm registry JSON for every package above: https://registry.npmjs.org/
- Base Sepolia `eth_getCode` checks via https://sepolia.base.org
- MetaMask smart-accounts-kit docs: https://docs.metamask.io/smart-accounts-kit/guides/x402/overview/
- ERC-8004 spec: https://eips.ethereum.org/EIPS/eip-8004
- Foundry book through ctx7 `/foundry-rs/book`

Local repos (paths under `/Users/user/Workspace/Projects/shenzhen/lianainao-fintechathon/reference/repos/`): `build/stablecoin-evm`, `build/erc-8004-contracts`, `build/delegation-framework`, `build/smart-accounts-kit`, `build/kernel`, `build/nexus`, `build/safe7579`, `build/smartsessions`, `build/spend-permissions`, `build/account-abstraction`, `build/permissionless.js`, `build/agent-chain`, `from-prior/x402`.

Related docs: [x402 and pocket feasibility](x402-pocket-feasibility.md), [product spec](../02-product/product-design.md).

See also: [master index](../README.md), [how to win](../06-pitch/how-to-win.md), [recommended changes](../02-product/recommended-changes.md)
