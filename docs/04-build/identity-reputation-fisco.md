# Identity, Credentials, Reputation and the FISCO BCOS Bonus

Last updated: 2026-10-13

## In one minute

- **Use the real ERC-8004 registry that already exists on Base Sepolia. Do not write our own agent registry from scratch.** The reference contracts are live at fixed addresses (list in "ERC-8004" below). Registering our agents costs one transaction each, and the tx hashes are visible on a public explorer. This is our cheapest "real on-chain" proof for the identity guard.
- **Do not trust ERC-8004 reputation as it is.** A July 2026 study of Ethereum, BSC and Base found 59-91% of reviewers look like coordinated Sybil accounts (fake accounts run by one party), and faking a good score costs under US$0.06. So our reputation must be our own signed attestation, built only from feedback that points to a settled x402 payment. This is a real, citable reason for ChainBrain to exist.
- **Fake the issuers, build the checks.** The KYC issuer and the business-registrar (KYB) issuer are simulated, and we say so on stage. The signature checks, expiry, revocation and selective disclosure ("age 18+", not a birth date) must be real code. Recommended format: an EAS attestation on Base Sepolia (on-chain, checkable by anyone) plus an SD-JWT credential for the privacy story.
- **Hong Kong is already testing exactly this.** On 27 Aug 2026 the Hong Kong regulators admitted HKT Payment's "Agentic ID" (DIDs and verifiable credentials that tie each payment agent to a verified person or business) into the GenA.I. Sandbox++. Trials start later in 2026. Good evidence that the problem is real; it also means we are not alone, so the pitch must stress the merchant side.
- **FISCO BCOS is a bonus, not a dependency.** Version 3.17.1 (15 Sep 2026, flagged pre-release on GitHub) speaks Ethereum JSON-RPC, so ordinary tools can target it. A 2-4 hour minimal deployment (our contracts plus one tx hash) is realistic but unverified: nobody on the team has run it yet. Run a 60-minute dry run first and decide go/no-go from that.
- **Biggest unknown, and we must not guess it:** whether a tx hash from our own FISCO chain counts as "real on-chain" for Topic F. Ask the organisers (draft email below). Until they answer, our scored tx hashes stay on Base Sepolia.
- **Be honest about WeIdentity.** WeBank's identity software (WeIdentity) follows the same W3C model we use, but it is Java-based and its last tagged release is a 2023 release candidate. We do not run it. We say "same data model, deployable on WeBank's stack", never "built on WeIdentity".
- **What to do this week:** (1) register agents in ERC-8004 on Base Sepolia, (2) issue demo credentials as EAS attestations, (3) write the payment-grounded reputation attester, (4) timebox the FISCO dry run to Saturday morning, (5) send the organiser question today.

## 1. Recommended build for the week: build, fake or cut

| Piece | Decision | What exactly | Time guess | Helps |
|---|---|---|---|---|
| Agent ID registry | **Build thin, reuse the standard** | Register each demo agent in the canonical ERC-8004 Identity Registry on Base Sepolia. Host a registration file (JSON) listing the MCP endpoint and `x402Support`. Keep session key, owner binding and revoke status in our own small contract or EAS attestation, because ERC-8004 has no session-key or revoked-agent field (see section 2). | 4-6 h | Task 40, Innovation 30 |
| Guard 1 (prove you hold the key) | **Build** | Challenge nonce rides in the x402 402 response, agent signs it. Sign with the registered session key. Optionally format it as an RFC 9421 HTTP Message Signature (section 4). | already in product design | Security 30 |
| Principal KYC credential | **Fake the issuer, build the verifier** | A "Demo KYC Issuer" key signs an EAS attestation (tier, region, over-18 flag, expiry) for the owner address. Gateway checks: attester is on our allowlist, not revoked, not expired. | 3-4 h | Security 30, Innovation 30 |
| Seller KYB credential | **Same as above** | Same schema family: legal entity, licence type, permitted categories, expiry. | 1-2 h on top | Security 30 |
| Selective disclosure (age 18+ only) | **Build small, or cut to a label** | SD-JWT credential via the OpenWallet `@sd-jwt/sd-jwt-vc` package; the MCP server reveals only the claims the seller's policy lists. If time runs out, keep the on-chain attestation and show "age_over_18 = true" as the only field. | 3 h | Security 30 (information-extraction scene) |
| Reputation | **Build, grounded in payments** | Attester reads our own x402 settlement history, counts only feedback that references a settled payment, caps one reviewer's weight, filters reviewers funded by the same wallet, signs a band ("established", "new", "flagged"). Seed history on Saturday and label it seeded. | 6-8 h | Innovation 30, Security 30 |
| ERC-8004 Validation Registry | **Cut** | Not deployed on mainnets in the study window and the repo README says it is still being revised with the TEE community. Mention as future work. | 0 | - |
| DID method | **Keep trivial** | Use an address-based DID (for example `did:pkh` on the Base Sepolia chain) and say nothing fancy. Do not build a DID resolver. [VERIFY exact did:pkh string against the spec before printing it on a slide] | 1 h | - |
| WeIdentity | **Cut from the build, keep in the pitch** | Do not install. Map our objects to its model in one slide (section 6). | 0 | Bonus (honesty) |
| Visa TAP / Web Bot Auth interoperability | **Could** | A gateway option that also accepts RFC 9421 signed requests in the Web Bot Auth shape, using Cloudflare's Apache-2.0 TypeScript packages (reference only; read before using). | 3-4 h | Innovation 30 |
| FISCO deployment | **Bonus, timeboxed** | Section 5. | 2-4 h plus 1 h dry run | Bonus 0-5 |

## 2. ERC-8004 (Trustless Agents): what it is and what it gives us

Plain English: ERC-8004 is a proposed Ethereum standard that gives every AI agent an on-chain ID card (an NFT), a place to post feedback about it, and a place for independent checkers to post validation results. There are three registries.

| Registry | What it holds | Functions we would call | Status we saw |
|---|---|---|---|
| Identity | One NFT per agent (`agentId`), pointing to a registration file. Optional `agentWallet` linked by an EIP-712 or ERC-1271 signature, so a smart-account pocket can be the agent's wallet | `register`, `setAgentURI`, `setMetadata`, `setAgentWallet`, `getAgentWallet` | Deployed on mainnets and testnets (below) |
| Reputation | Signed fixed-point feedback per agent, tags, revoke, append response. Self-feedback by owner blocked. `getSummary` needs a list of reviewer addresses | `giveFeedback`, `revokeFeedback`, `appendResponse`, `getSummary`, `readAllFeedback` | Deployed |
| Validation | Validator requests and 0-100 responses keyed by request hash | `validationRequest`, `validationResponse` | Source exists; the 2026 study found no mainnet deployment [VERIFY on Base Sepolia] |

Key facts (all from pages or files we opened):

- **Status is still Draft** on eips.ethereum.org (created 2025-08-13; authors include Marco De Rossi, Davide Crapis, Jordan Ellis, Erik Reppel). A Taiko guide says the same and mentions a v2 in development (snippet); a Quicknode FAQ says "finalized" (snippet). The EIP page wins: Draft. Build against it knowing the API may change.
- **Mainnet launch:** 29 Jan 2026 per the empirical study.
- **Addresses (from the reference repo README, read locally; not verified on-chain by us):** Base Sepolia Identity `0x8004A818BFB912233c491871b3d84c89A494BD9e`, Reputation `0x8004B663056A597Dffe9eCcC1965A193B7388713`. The same two addresses are used on all listed testnets; mainnets use `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` and `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`. Base docs and Pinata's quickstart agree on the Base Sepolia identity address (snippet). One Filecoin docs draft shows a different Base Sepolia address (`0x7177...`); treat as wrong unless proven. [VERIFY by reading the contract on sepolia.basescan.org before first use]
- **Reference repo:** last commit 2026-08-15, licence CC0, Solidity 0.8.24 with EVM target "shanghai", UUPS proxies (OpenZeppelin upgradeable). That EVM target is old enough to deploy on FISCO BCOS too (section 5).
- **Spec hook for payments:** the feedback file format in the spec has a `proofOfPayment` field "that can be used for x402 proof of payment" (read in `ERC8004SPEC.md`). It is optional and unchecked on-chain.

### Adoption and the Sybil problem (conflicting numbers kept side by side)

| Source | Claim | Note |
|---|---|---|
| DataWallet via search (snippet) | 8004scan lists 519,000+ agents | aggregator, not opened |
| AgentValve paper (opened, 9 Oct 2026) | 550,000+ AI-agent identities registered in blockchain-based AI markets by Oct 2026 | cites a source we did not open |
| Xiong et al., Jul 2026 (opened) | Only 3%, 4%, 15% of registrations (Ethereum, BSC, Base) have a valid registration file with a live endpoint | most registrations are placeholders |
| Same study | 73.5%, 59.2%, 90.6% of reviewers show coordinated Sybil behaviour; 98.7-100% of feedback has no proof of payment or task link; manipulating a score costs about US$0.0027 (Base) to US$0.055 (Ethereum) | data to 13 May 2026; a summary page mentions a re-analysis that gets below about 20% after excluding known batch operators, but we found no published rebuttal (snippet) |

What it means: registration counts do not prove quality, and the on-chain average score is not a safe signal. The study's own recommendations match our design almost point for point: tie feedback to a verifiable interaction (a settled x402 payment), cap one reviewer's influence, use a median or trimmed mean, make influence cost more when stakes are higher, and do not share reputation across chains until per-chain integrity is solid. The AgentValve paper offers a trust-graph alternative (finite trust capacity per edge) that we cite as the path to "level 3" reputation. Both PDFs are saved locally (Sources).

How ChainBrain uses it: ERC-8004 gives us a shared, public place to post identity and feedback records (interoperability and a public explorer); our attester gives the guard something it can rely on. We never read `getSummary` directly for a decision.

## 3. Credentials: DID and verifiable credentials in a week

Plain English: a verifiable credential (VC) is a digitally signed statement from an issuer about someone ("this owner is KYC tier 2, region HK"). The holder shows it to a verifier, who checks the issuer's signature without calling the issuer. A DID is a self-owned identifier used as the subject or issuer name.

| Option | Facts | Fit for us |
|---|---|---|
| W3C VC Data Model 2.0 | W3C Recommendation, 15 May 2025 (page opened). Securing methods: Data Integrity proofs, or JOSE/COSE envelopes, with SD-JWT examples for selective disclosure | The model we cite on slides |
| `@sd-jwt/sd-jwt-vc` (OpenWallet Foundation) | TypeScript, SD-JWT VC draft 15, Apache-2.0, about 16.9k weekly downloads, updated 2026-06-29 (all aggregator snippet, check with `npm view`) | Best fit for selective disclosure; small API |
| `did-jwt-vc` | JWT-form credentials, README for v4.0.16 (snippet) | Simple fallback; no selective disclosure |
| Veramo, credo-ts | Larger frameworks; Veramo has no official SD-JWT plugin, only a community one (snippet) | Too heavy for one week |
| EAS (Ethereum Attestation Service) | Contracts are a predeploy on OP-stack chains: Base Sepolia EAS at `0x4200000000000000000000000000000000000021`, version 1.2.0 per the repo README (read locally; MIT licence; last commit 2026-07-17) | Best fit for on-chain checkable credentials; verifier reads `getAttestation(uid)` |

Recommended split: **EAS for "is this credential on-chain valid right now" (revocation, expiry, issuer) and SD-JWT for "reveal only age 18+"**. If time is short, do EAS only. Neither needs a DID resolver.

Honesty rules for the demo: the "KYC issuer" and "registrar" are our own keys; the screen and slides say "simulated issuer". Credentials carry no name or ID number, only the claims the guards need.

## 4. Know-Your-Agent (KYA) schemes we can reference

| Scheme | What it is (source quality) | Relevance to us |
|---|---|---|
| **Visa Trusted Agent Protocol (TAP)** | Merchant recognises a Visa-approved agent through RFC 9421 signatures; also a consumer-recognition token and a payment container. Spec page opened: tags `agent-browser-auth` and `agent-payer-auth`, required fields `@authority`, `@path`, `created`, `keyid`, `expires`, `tag`, `alg`, `nonce`; Ed25519 in examples; keys from a Visa directory; stated 8-minute limit conflicts with examples that use 1 hour. Sample repo (212 stars, last commit 2025-10-28) is under Visa's developer terms, not a standard open-source licence | Same shape as our guard 1 and trust bundle. TAP proves who the agent is; it does not move money or check intent or pocket scope |
| **Cloudflare Web Bot Auth / signed agents** | Opened: bot signs each request with Ed25519; public key in a directory at `/.well-known/http-message-signatures-directory`; headers `Signature-Input`, `Signature`, `Signature-Agent`; `tag="web-bot-auth"`; short expiry ("a minute is often sufficient"); test endpoint crawltest.com. IETF draft draft-meunier-web-bot-auth-architecture-05 (2026-03-02) is expired and replaced by draft-meunier-webbotauth-httpsig-protocol (page opened; the successor not opened) | Free, working verification target for guard 1 |
| **HTTP Message Signatures, RFC 9421** | IETF Proposed Standard; covered components such as `@method`, `@authority`, `@path`; params `created`, `expires`, `nonce`, `keyid`, `tag` (page opened, only first 100k characters read) | The standard behind both of the above; "production path" for guard 1 |
| **Skyfire KYAPay** | Signed JWT carrying verified owner identity plus a second JWT authorising a spend (USDC or tokenised card); exchangeable for OAuth tokens; individual IETF draft `draft-skyfire-oauth-using-kyapay-tokens-00` found only on mirrors (snippet; vendor press release and docs) | Closest to our "identity plus authorisation" bundle; a competitor on the identity half |
| **Alipay APASS / KYA** | Ant's trust layer for agent identity, intent, authorisation and behaviour; Alipay AI Pay (Apr 2026) and an AI wallet agent announced at the 2026 Bund Summit (TechNode 2026-09-11, snippet). No primary technical spec found | The incumbent we say we make open and portable |
| **HKT Payment "Agentic ID"** | DIDs and VCs bind each payment agent to a verified person or business; in HK GenA.I. Sandbox++ (36 use cases, 30 institutions, 27 technology partners; trials later in 2026). Opened: PYMNTS 2026-08-27 and Seoul Economic Daily 2026-10-11. The Korean paper says it uses blockchain but names no chain | Local proof that the model is wanted. Likely a rival or a partner for any real HK deployment |

Conflict to keep visible: a self-published GitHub comparison (snippet) says no agent identity framework has reached production-scale adoption; Alipay says AI Pay purchase volume grew sevenfold in five months (Alipay's own data, snippet). Both can be true: Alipay's is closed-loop, the open standards are early.

Practical line for the pitch: "Visa and Cloudflare prove who the agent is. ERC-8004 gives a public ID card. Nobody checks, at the merchant, whether this agent's owner is KYC-anchored, whether this pocket may buy this item, and whether payment will settle. That is ChainBrain."

## 5. FISCO BCOS bonus: facts, 2-4 hour recipe, risks

### 5.1 State of FISCO BCOS in Oct 2026 (re-checked)

| Topic | What we found | Confidence |
|---|---|---|
| Versions | v3.17.1 published 2026-09-15, GitHub pre-release flag true (release page via API, opened). Earlier notes: v3.16.4 (2026-01-14) is the latest non-pre-release; README calls v3.7.3 "stable". Both statements kept; use v3.17.1 for the Web3 features | high |
| Release files | build_chain.sh plus binaries for Linux x86_64 and aarch64 and macOS x86_64 and Apple Silicon (arm) in 3.17.1 (asset list opened via API). Debug variants are 100+ MB; the normal macOS arm file is about 17 MB | high |
| Web3 JSON-RPC | Since 3.9.0. Docs page (opened) lists 44 methods in 3.17.0: 39 `eth_*`, 3 `net_*`, 2 `web3_*`. Includes `eth_sendRawTransaction`, `eth_getTransactionByHash`, `eth_getTransactionReceipt`, `eth_getLogs`, `eth_call`, `eth_estimateGas`. No `debug_*` or `trace_*` | high |
| Off by default | `[web3_rpc] enable=false` in generated config; `build_chain.sh` has no flag for it (we read the script: it only has a parameter inside the config generator, default false), so edit `config.ini` per node. Default Web3 chain id 20200, RPC port 8545 | high (source read) |
| Transaction types | Source reading (a master snapshot dated 2026-10-09, not the 3.17.1 tag): legacy with EIP-155, EIP-2930, EIP-1559, EIP-4844 parsed. No EIP-7702 type found | medium, snapshot |
| Compatibility notes | Cancun opcodes since 3.10; Web3-style contract addresses, EIP-1559 fields and seconds timestamps since 3.12 (docs). Hardhat docs still describe an address-mismatch workaround (read `receipt.contractAddress`) | medium |
| ECDSA mode | Default mode is secp256k1 + keccak; `-s` turns on national-crypto (SM2/SM3). Web3 tools need the default mode. We do not use `-s` | high |
| Precompiles 0x01-0x0a | Source (snapshot): ecrecover, sha256, ripemd160, identity, modexp, alt_bn128 add/mul/pairing, blake2, point_evaluation registered. No P-256 (secp256r1) verifier seen | medium, snapshot |
| Block context | Source (snapshot): `block.coinbase`, `prevrandao` and `basefee` are set to zero; chain id comes from the chain | medium, snapshot |
| Gas | If `tx_gas_price` is "0" or "0x0" the validator skips the balance check (source). Otherwise sender balance must cover value plus gas, and native balance needs `feature_balance` | medium; what the default `tx_gas_price` is: [VERIFY] |
| Native balance | `setSystemConfigByKey feature_balance 1` and `feature_balance_precompiled 1`; coins are minted by a governor through precompile 0x1011 (prior notes). Who counts as governor when auth mode is off: [VERIFY] | medium |
| ERC-4337 | Nothing official. No bundler support seen (needs tracing methods we do not see). Canonical EntryPoint address needs a CREATE2 deployer we cannot assume exists. [VERIFY all] | low |
| Foundry / viem / ethers | Docs page covers Hardhat and MetaMask only. Foundry's `forge create` has `--legacy`, `--gas-price`, `--gas-limit` flags (ctx7 docs), which is the safe starting point; viem `defineChain` accepts any chain id and RPC URL (ctx7 docs). Nobody has tested them against v3.17.1 here | untested |
| Explorer | No Web3 explorer found. WeBASE and the old browser repo are stale or for 2.x (prior notes; our search found nothing new). Blockscout compatibility untested; it likely needs tracing methods FISCO lacks [VERIFY] | high that none is official |
| Activity | Main repo pushed 2026-10-12; 3.17.0 (2026-08-24) was a security-hardening release; WASM/Liquid deprecated, removal planned in 3.18.0; an OP-Stack execution-client effort is open and unreleased | high |
| Docker | Docker Hub images looked old (newest tag seen v3.12.1, 2024-11-25). Use the release binary, not Docker | medium |

### 5.2 What should we deploy there?

Keep it tiny so the dry run decides everything:

1. The pocket policy contract (allowlist, per-payment cap, revoke), written as an ordinary Solidity contract.
2. A tiny agent registry (a plain mapping, not the whole UUPS ERC-8004 stack) and a mock USDC with transfer-with-authorisation.
3. One real transaction: the agent pays a demo seller through the policy contract, and one refused payment emits a revert reason.

Do not try ERC-4337 EntryPoint, a bundler, the x402 facilitator on FISCO, or native-balance minting in the first pass. If gas price is zero, native balance is not needed at all; the pocket spends the mock USDC token.

### 5.3 Recipe (2-4 hours, unverified; written from docs and script text, nothing was run)

Do this on one laptop or a small cloud VM. All of it is the team's own run, not copied from our reference clones.

1. **Fetch** `build_chain.sh` and the binary for your OS from the v3.17.1 release page (assets listed above). Check file sizes against the list. (10 min)
2. **Generate one chain**: `bash build_chain.sh -l 127.0.0.1:1 -p 30300,20200`. The script's own examples use 4 nodes; whether one node is accepted is [VERIFY]. If it refuses, use `-l 127.0.0.1:4` and expect several GB of RAM. (15 min)
3. **Turn on Web3 RPC** in each node's `config.ini`: `[web3_rpc] enable=true`, `listen_port=8545` (different port per node), keep `listen_ip` private or put the node behind a read-only proxy. Genesis already carries `chain_id=20200`. Start with `nodes/127.0.0.1/start_all.sh`. (15 min)
4. **Smoke test over plain HTTP**: call `eth_chainId` and `eth_blockNumber` with curl. Expect `0x4ee8` (20200). Stop and write down the error text if not. (10 min)
5. **Fund the deployer**: first try with gas price zero (no funding). If transactions are rejected as insufficient funds, use the console to run the two `setSystemConfigByKey` feature commands and mint test balance (needs JDK and the console; the console repo's last commit is 2024-10-08). (30-60 min if needed)
6. **Deploy with Foundry or viem**: `forge create ... --legacy --gas-price <value> --gas-limit <n>` against the node. Re-read the address from the receipt. Compile with solc 0.8.24, EVM target shanghai (the ERC-8004 reference uses the same). (30 min)
7. **Run the two scenes** (one pay, one refusal) with a script that uses viem `defineChain({ id: 20200, ... })`. (30 min)
8. **Capture proof**: tx hash, block number, `eth_getTransactionByHash` and receipt JSON, a screenshot, and the exact node version string. Save in `docs/05-security` evidence folder or the team's evidence log. (15 min)
9. **Tiny explorer page** (optional, 1-2 h): a static page that takes a hash and calls `eth_getTransactionByHash` and `eth_getTransactionReceipt` through a read-only proxy. This beats telling judges to "trust our node".

Hard stop: if step 4 or 6 fails after 90 minutes, drop FISCO to a slide labelled "Production path, not in demo".

### 5.4 Risks

| Risk | Effect | Mitigation |
|---|---|---|
| Judges cannot verify a private chain's hash | Zero Task score from it, perhaps a hit to credibility | Keep scored hashes on Base Sepolia; present FISCO as extra. Ask organisers (below) |
| 3.17.1 is flagged pre-release; 3.17.0 and 3.17.1 contain many hardening fixes | Odd bugs | Pin 3.17.1; note the version on the slide |
| Open Web3 issues (eth_call with args returned code 16 on 3.11.0, no gas cap on eth_call) | Failed reads | Test early; use 3.17.1 |
| No EIP-7702, no ERC-4337 tooling, no P-256 verifier | Pocket design differs from the Base version | Keep FISCO contracts plain; do not promise parity |
| Apple Silicon build problems (issues reported for source builds) | Lost hours | Use the prebuilt macOS arm binary, not a source build |
| Chain unreachable on demo day | Embarrassing | Record the run; keep the same node log and receipts in the repo |
| Foreign student team on a Chinese consortium stack | Compliance questions | Say plainly: simulated money, test data only, no crypto trading |

### 5.5 Question for the organisers (do not guess the answer)

Draft (contact address on the rules page is fintechathon@g-ican.com, per prior notes):

> For Topic F, the rules say the task score uses on-chain transaction hashes. (1) Is a public EVM testnet (Base Sepolia) accepted? (2) Is a team-hosted FISCO BCOS 3.x chain accepted, and if yes how should judges verify hashes (public read-only RPC, explorer, snapshot)? (3) Does using FISCO BCOS or other WeBank open source earn extra credit under the +0-5 bonus? (4) Is there an organiser-hosted chain we may use? Please also tell us if international teams may reach a mainland-hosted endpoint from Hong Kong.

Prior notes found no public FISCO testnet and found BSN's FISCO-based chains require a China-registered legal entity as of a June 2024 manual [VERIFY current rule]. Until we have the answer, assume the hash must be checkable by a stranger.

## 6. How to pitch WeBank technology honestly

| Say | Do not say |
|---|---|
| "ChainBrain's credential model follows the W3C DID and VC standards that WeBank's WeIdentity also implements. The same credentials could be issued on WeIdentity." | "Built on WeIdentity" |
| "Our contracts are ordinary Solidity; we ran a minimal version on FISCO BCOS 3.17.1 in ECDSA mode" (only if step 8 above produced a hash) | "Runs on FISCO BCOS" if it was not run |
| "FISCO BCOS adds chain-level controls public chains lack: contract call ACL, account freeze, transfer whitelist" (from the docs and prior notes) | Any throughput figure as our result. The "200,000 TPS" is a vendor claim; we measured nothing |
| "WeBank's blockchain stack is maintained: the main repo was updated this week, but the identity middleware is quiet" | "WeIdentity is actively developed" |
| "Hong Kong regulators are already piloting DID/VC agent IDs; ChainBrain is the merchant-side check" | That WeBank or HKMA endorse us |

WeIdentity facts (GitHub API and release list opened): Apache-2.0; about 1,150 stars; not archived; default branch `develop`; last push 2025-04-18; newest tagged release `v3.1.0-rc.1` on 2023-04-28; the local checkout from prior research shows a last commit dated 2024-03-13 [mismatch between the API push date and the checkout kept side by side]. It is built with Gradle (Java). Our 2026 search found no WeBank statement tying WeIdentity to AI agents; WeBank's 2026 AI news is about its "AI-native bank" and agents (snippet). So the honest claim is compatibility of model, not a product link.

## What this means for winning

- **[must] Register every demo agent in the canonical ERC-8004 Identity Registry on Base Sepolia and put the tx hashes in the evidence log.** (Task 40, Innovation 30). Read the registry contract on the explorer first to confirm the address.
- **[must] Make reputation grounded in settled payments, cap per-reviewer weight, and never use the raw on-chain average.** Cite the Xiong et al. study on the slide. (Security 30, Innovation 30)
- **[must] Fake issuers, real verification, and say "simulated issuer" on screen.** Verification must check allowlisted issuer, expiry and revocation in code. (Security 30)
- **[must] Send the organiser question today.** The answer decides whether FISCO hashes count. (Task 40, Bonus)
- **[should] Show selective disclosure in the information-extraction scene:** the seller asks for a full name, the MCP server presents only "age 18+" and logs `DISCLOSURE_NOT_IN_POLICY`. (Security 30)
- **[should] Add a one-slide comparison to Visa TAP, Web Bot Auth, KYAPay and Alipay APASS** using section 4, plus the HKT Agentic ID pilot as local validation. (Innovation 30)
- **[should] Run the FISCO dry run (steps 1-4, 60 minutes) on Saturday morning; continue only if it passes.** (Bonus)
- **[could] Accept RFC 9421 signed requests in the gateway using the Cloudflare Apache-2.0 TypeScript packages as a reference.** (Innovation 30)
- **[could] Static tx-hash explorer for FISCO via `eth_getTransactionByHash`.** (Bonus, credibility)
- **[could] Mention AgentValve-style trust graphs as the path beyond level-1 reputation.** (Innovation 30)

## Open questions

- Does a team-hosted FISCO BCOS chain count as "real on-chain tx hashes" for Topic F? Is FISCO mandatory, optional, or bonus? (organisers)
- Is the ERC-8004 Validation Registry deployed on Base Sepolia, and at which address? [VERIFY]
- Does a single-node `build_chain.sh` chain start, and what is the default `tx_gas_price` and who can mint balance with auth mode off?
- Do Foundry and viem work against v3.17.1 as written (legacy tx, gas price, receipt address)? Does EIP-712 `ecrecover` and ERC-1271 behave the same as on Base?
- Is the canonical ERC-4337 EntryPoint deployable on FISCO, and can a bundler run without tracing methods?
- Which chain does HKT Payment and Red Date's Agentic ID use? Any link to BSN or FISCO? [VERIFY; not stated in sources we opened]
- Exact `did:pkh` string and DID-document needs for the demo, and current `@sd-jwt/sd-jwt-vc` version (`npm view`).
- Is the Skyfire KYAPay Internet-Draft on the IETF datatracker, and what is its latest version? (only mirrors found)

## Sources

Web pages (accessed 2026-10-13):
- https://eips.ethereum.org/EIPS/eip-8004 (opened)
- https://github.com/erc-8004/erc-8004-contracts (opened; also cloned)
- https://www.rfc-editor.org/rfc/rfc9421 (opened, partial)
- https://developer.visa.com/capabilities/trusted-agent-protocol/trusted-agent-protocol-specifications (opened)
- https://github.com/visa/trusted-agent-protocol (opened; also cloned)
- https://developers.cloudflare.com/bots/reference/bot-verification/web-bot-auth/ (opened)
- https://developers.cloudflare.com/bots/concepts/bot/signed-agents/ (opened)
- https://datatracker.ietf.org/doc/draft-meunier-web-bot-auth-architecture/ (opened)
- https://www.w3.org/TR/vc-data-model-2.0/ (opened, partial)
- https://www.pymnts.com/news/banking/2026/hong-kong-tests-know-your-agent-controls-in-payment-workflows/ (opened)
- https://en.sedaily.com/finance/2026/10/11/can-blockchain-verify-ai-agents-as-ai-driven-hacking-surges (opened)
- https://api.github.com/repos/WeBankBlockchain/WeIdentity and /releases (opened)
- https://api.github.com/repos/FISCO-BCOS/FISCO-BCOS/releases/tags/v3.17.1 (asset list read by script)
- https://raw.githubusercontent.com/FISCO-BCOS/FISCO-BCOS-DOC/release-3/3.x/zh_CN/docs/develop/web3_usage.md (opened)
- https://arxiv.org/abs/2606.26028 and https://arxiv.org/abs/2610.12948 (PDFs read locally)
- ctx7 docs: https://getfoundry.sh/forge/reference/create and viem chains docs (https://github.com/wevm/viem/blob/main/site/pages/docs/chains/introduction.md)

Search snippets only (not opened):
- Skyfire KYAPay: https://docs.skyfire.xyz/docs/kya and the Business Wire release of 2025-06-26 (streetinsider mirror); draft-skyfire-oauth-using-kyapay-tokens-00 on mirror servers
- Alipay AI wallet / APASS: https://technode.com/2026/09/11/alipay-to-launch-an-ai-wallet-agent-for-trusted-ai-payments/ ; https://www.kucoin.com/news/flash/alipay-launches-ai-wallet-and-three-ai-pay-capabilities-at-outram-summit
- Taiko ERC-8004 guide https://taiko.xyz/guides/erc-8004-trustless-agent-standard ; Quicknode FAQ https://erc-8004.quicknode.com/faq ; DataWallet https://www.datawallet.com/crypto/erc-8004-explained
- Base ERC-8004 contract list https://docs.base.org/ai-agents/reference/contracts ; Pinata quickstart https://docs.pinata.cloud/tools/erc-8004/quickstart.md
- sd-jwt-js and did-jwt-vc READMEs on jsdelivr/unpkg; WeIdentity docs https://weidentity.readthedocs.io/zh-cn/latest/README.html
- HK GenA.I. Sandbox++: https://technode.global/2026/08/27/hong-kong-genai-sandbox-agentic-ai-pilots/

Local files:
- Prior notes: /Users/user/Workspace/Projects/shenzhen/lianainao-fintechathon/reference/prior-research/notes/round4/fisco-core.md and fisco-ecosystem.md
- FISCO source read as text only (master snapshot, commit 58920ae, 2026-10-09): /Users/user/Workspace/Projects/shenzhen/lianainao-fintechathon/reference/repos/from-prior/FISCO-BCOS (tools/BcosAirBuilder/build_chain.sh, bcos-executor/src/vm/Precompiled.cpp, EVMHostInterface.cpp, VMInstance.cpp, bcos-rpc/bcos-rpc/validator/TxValidator.cpp, bcos-rpc/bcos-rpc/web3jsonrpc/model/Web3Transaction.cpp)
- WeIdentity clone: /Users/user/Workspace/Projects/shenzhen/lianainao-fintechathon/reference/repos/from-prior/WeIdentity
- Repos cloned this run (read as text, never run): /Users/user/Workspace/Projects/shenzhen/lianainao-fintechathon/reference/repos/identity/erc-8004-contracts, .../trusted-agent-protocol, .../eas-contracts, .../web-bot-auth, .../console (FISCO console, Java, last commit 2024-10-08)
- Papers: /Users/user/Workspace/Projects/shenzhen/lianainao-fintechathon/reference/papers/identity/2026-xiong-erc8004-empirical-study.pdf and 2026-zhang-agentvalve-sybil-resilient-payment.pdf

Related docs: [product design](../02-product/product-design.md), [hackathon rules](../01-competition/hackathon-rules.md)

See also: [master index](../README.md), [how to win](../06-pitch/how-to-win.md), [recommended changes](../02-product/recommended-changes.md)
