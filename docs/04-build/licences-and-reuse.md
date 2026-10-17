# Licences and Reuse Check
Last updated: 2026-10-17 (pocket apps: section "Pocket apps, 17 Oct" at the end)

> **Status (14 Oct, v2):** This is the research-time licence check. The real dependencies (OpenZeppelin 5.4, viem, Hono, x402, Expo, React Native, Vite, Phosphor Icons, Geist fonts, plus web3j and OkHttp on Android) are listed in the [top README licences section](../../README.md). Repos in `reference/` are read-only and git-ignored, so links into it only work in a local clone. Since 17 Oct the project runs only on our own FISCO BCOS chain (chain id 20200) with our own Mock e-HKD token, so the public-testnet services in section 3 are no longer used; their rows are kept as research notes. Spec: [product design](../02-product/product-design.md).

Competition rule 6 says every piece of data, code, open-source component and API we use must be "legally authorised" and follow its open-source licence and data-use terms; the team carries the liability (see [hackathon rules](../01-competition/hackathon-rules.md), rule 6). This page is the team's answer: what we may copy, what we may only depend on, what we only read, and what to write in the submission.

This is a practical engineering check, not legal advice. Licence facts for repos come from the LICENSE files, `package.json` and SPDX headers in `reference/repos/` (read only, nothing run). Package licences come from the npm registry on 2026-10-13.

## In one minute

- **Everything we plan to depend on is permissive** (MIT, Apache-2.0, MIT-0 or CC0): x402 SDK, viem, MCP SDK, OpenZeppelin, EAS, MetaMask delegation framework and smart-accounts-kit, Foundry, FISCO BCOS, WeIdentity. We can import them from npm or Foundry dependencies with no copyleft duty. We still keep their copyright notices.
- **Four repos are traps for copying code:** `account-abstraction` (GPL-3.0), `safe7579` (GPL-3.0 and LGPL files mixed with MIT), `smartsessions` (AGPL-3.0 and LGPL files mixed with MIT) and `kernel` (its vendored `dependencies/` folder holds GPL-3.0 and AGPL-3.0 files). Rule: read them, never paste from them.
- **One repo is a non-commercial trap:** `from-prior/Should-AI-Buy` is Business Source License 1.1 (non-commercial, research and testing only until 2030-10-05). Learn only.
- **Visa Trusted Agent Protocol repos** (three clones) are under Visa Developer Center terms, not an open-source licence. Learn only; do not copy.
- **Repos with no licence file** (for example `x402-guard`, `intent-binding`, `FinVault`, `x402-zkid` apart from its README, `skyfire-kyapay` code) default to "all rights reserved" in law. Treat as read-only ideas unless a README says otherwise.
- **Our own contracts: write them ourselves** on top of OpenZeppelin (MIT). Do not start from the GPL or AGPL files. Choose our own repo licence (suggest MIT or Apache-2.0) and ship a `THIRD_PARTY_NOTICES.md` (outline in section 5).
- **APIs:** we use no hosted chain service: the x402 facilitator runs in-process in our server, and the chain, faucet and explorer are our own. LLM providers restrict by region and forbid some uses. The LLM and region question needs a team decision before the video demo (see Open questions).
- **Test funds have no value.** Mock e-HKD is our own test token (not the HKMA e-HKD, not money). Our server faucet gives native balance plus HK$100 eHKD once per address per day.

## 1. Licence table: reference repos on disk

Path is under `reference/repos/`. "Copy" means pasting source into our repo. "Depend" means importing the published package or a pinned Foundry/npm dependency. Attribution is needed for nearly everything permissive; the column notes anything beyond the standard notice.

| Repo (path) | Licence (evidence) | Copy code? | Depend? | Attribution / notes | Traps |
| --- | --- | --- | --- | --- | --- |
| `from-prior/x402` (official SDK, specs) | Apache-2.0 (LICENSE + NOTICE, "Copyright 2026 x402 Foundation"); a few MIT SPDX headers in contracts tests | Yes, small snippets with notice | Yes (`@x402/*` 2.28.0) | Keep NOTICE and licence text; mark changed files | None found. Old `x402` v1 npm package also Apache-2.0 but not used |
| `build/stablecoin-evm` (Circle USDC) | Apache-2.0 (LICENSE; package.json) | Read-first. Copying not needed (our `MockEHKD` is written from scratch) | No | If a snippet is copied, keep header | Do not imply Circle endorsement; "USDC" is Circle's mark |
| `build/erc-8004-contracts` (also `identity/`, `industry/` copies) | Contracts MIT (SPDX), README says CC0 for spec, package.json says ISC, no LICENSE file | Interfaces yes; check file header first | Deploy on FISCO (finals roadmap) | Cite as ERC-8004 | Three licence statements disagree (MIT / CC0 / ISC); all permissive. [VERIFY] before copying any file. Three duplicate clones, use one |
| `build/delegation-framework` and `from-prior/delegation-framework` (MetaMask) | MIT (LICENSE-MIT.md, "Copyright (c) 2022 ConsenSys Software Inc.") and Apache-2.0 (LICENSE-APACHE2.md); SPDX in `src/` mostly MIT | Yes, with notice (good template for our enforcer) | Yes (deployed DelegationManager; Path B) | Keep ConsenSys copyright | A few SPDX `GPL-3.0` / `LGPL-3.0-only` / `UNLICENSED` lines exist in the tree (grep found them under `src/`, `test/` or libs). Check each file header before copying any file |
| `build/smart-accounts-kit` (MetaMask) | MIT-0 OR Apache-2.0 (LICENSE.MIT0, LICENSE.APACHE2; package.json) | Yes | Yes (`@metamask/smart-accounts-kit` 2.0.0, `@metamask/x402` 1.0.0) | MIT-0 needs no attribution; Apache-2.0 does | `x402` client entry is experimental |
| `build/kernel` (ZeroDev) | README "MIT"; ~498 MIT SPDX headers; **no LICENSE file** | Own `src/` files only after header check | Prefer npm SDK (`@zerodev/sdk` MIT) | Keep headers | `dependencies/` folder has vendored eth-infinitism 0.9.0 (28 GPL-3.0 and 2 AGPL-3.0 headers found) and a16z halmos cheatcodes. Never copy from `dependencies/` |
| `build/nexus` (Biconomy) | MIT (LICENSE) | Yes with notice | Possible (Path upgrade) | Keep notice | A few SPDX lines are GPL-3.0, LGPL-3.0-only or UNLICENSED (4 UNLICENSED, 2 GPL, 1 LGPL by grep): check each file's header |
| `build/safe7579` (Rhinestone) | **No LICENSE file**; package.json says GPL-3.0; SPDX mix: 33 MIT, 7 GPL-3.0, 2 LGPL-3.0-only, 9 UNLICENSED | **No** | Only via audited deployed addresses | If used, GPL obligations on any copied file | `src/Safe7579.sol`, `Safe7579Launchpad.sol`, `DataTypes.sol` etc. carry GPL headers. Whole-repo status unclear: treat as GPL |
| `build/smartsessions` (erc7579) | README: AGPL-3.0; **no LICENSE file**; SPDX mix: 34 MIT, 21 AGPL-3.0-only, 2 LGPL-3.0-only, 1 UNLICENSED | **No** | No | AGPL network-use clause reaches any service built on copied AGPL code | `PolicyLib.sol`, `SmartSession*.sol`, policies are AGPL. Learn only |
| `build/spend-permissions` (Coinbase) | MIT (LICENSE.md) | Yes with notice | Optional | Keep notice | None found. Compare with our Pocket in the pitch |
| `build/account-abstraction` (eth-infinitism) | LICENSE file is GNU GPL; SPDX 28 GPL-3.0, 28 MIT; package.json says ISC (conflicts) | **No** (the core EntryPoint files are GPL) | Use the deployed EntryPoint v0.7 on-chain only | Interfaces labelled MIT may be copyable per file | GPL-3.0 copyleft would pull our whole contract set. Conflicting licence statements: trust the per-file SPDX header |
| `build/permissionless.js` (Pimlico) | MIT (LICENSE) | Yes | Yes (npm 0.4.1) | Keep notice | None |
| `build/agent-chain` (Dosbox420) | MIT (LICENSE; package.json says ISC) | Learn only | No | Do not present its claims as verified | Self-reported results; do not trust. Licence statements disagree (MIT vs ISC), both permissive |
| `identity/eas-contracts` | MIT (LICENSE; package.json) | Deploy as-is on FISCO if used (finals roadmap) | Yes via `eas-sdk` 2.10.0 (MIT) | Keep notice | None |
| `identity/console` | Apache-2.0 (LICENSE) but SPDX shows 23 Apache-2.0, 6 UNLICENSED, 1 MIT | Learn only | No | | Mixed headers; low value for us |
| `identity/web-bot-auth`, `industry/cloudflare-web-bot-auth`, `prior-art/cloudflare-web-bot-auth` | Apache-2.0 (LICENSE; package.json) | Snippets with notice | Possible (HTTP message signatures idea) | Keep notice; mark changes | Three duplicate clones |
| `identity/trusted-agent-protocol`, `industry/visa-trusted-agent-protocol`, `prior-art/visa-trusted-agent-protocol` (Visa) | LICENSE.md is **Visa Developer Center Terms of Use**, not open source | **No** | No | Using or downloading means you agree to Visa terms ("By using, downloading, or installing this code, you agree...") | Do not copy; cite the idea only. [VERIFY] terms if we want to demo anything similar |
| `industry/catena-ack` | MIT (LICENSE; package.json) | Learn / snippets with notice | No | Keep notice | None found |
| `from-prior/AP2` (Google) | Apache-2.0 | Snippets with notice | No | Keep notice | None found |
| `from-prior/FISCO-BCOS` | Apache-2.0 | No (we run the release binary) | **Yes**: the chain everything runs on | Keep notice | Large (36 MB); we use the release binary, not this source |
| `from-prior/WeIdentity` | Apache-2.0 | Bonus only | Bonus only | Keep notice | Old Java project; check maintenance [VERIFY] |
| `from-prior/camel-prompt-injection` (Google) | Apache-2.0 | Snippets with notice | No | Cite paper | None |
| `from-prior/progent` | MIT | Learn / snippets with notice | No | Keep notice | None |
| `from-prior/fides`, `from-prior/i402`, `from-prior/link-cli`, `from-prior/agentic-wallet-skills` | MIT (LICENSE) | Snippets with notice | No | Keep notice | None found |
| `from-prior/internet-court-skill` | MIT for its own parts only; NOTICE.md lists vendored skills under their own licences, including GPL-3.0 (antseed) and a custom "LicenseRef-Permission" | **No** for anything under `vendored/` | No | Check each vendored skill's licence | Mixed licence bundle; GPL-3.0 item inside |
| `from-prior/Should-AI-Buy` | **Business Source License 1.1**: non-commercial, personal, research, education, testing only; Change Date 2030-10-05 to Apache-2.0 | **No** | No | If anything is reused, the full BSL text must travel with it | Non-commercial trap; a deployed product or a bank pilot would break it |
| `from-prior/x402-zkid` | README says MIT; no LICENSE file; no SPDX headers | Learn only until a LICENSE file is confirmed | No | | Missing licence file |
| `competitors/fundbun` | MIT | Learn only | No | | Competitor entry; do not copy their work, plagiarism risk as well as legal |
| `competitors/leash-finbase` | MIT | Learn only | No | | Same as above |
| `competitors/agentic-wallet` | No LICENSE file; 4 MIT SPDX headers | Learn only | No | | Unlicensed repo-level |
| `prior-art/agent-passport-system` | Apache-2.0 (LICENSE + NOTICE) | Snippets with notice | No | Keep NOTICE | None |
| `prior-art/kawasekit-merchant` | Apache-2.0 | Snippets with notice | No | | None |
| `prior-art/LedgerMind`, `prior-art/enshell-contract` | MIT | Snippets with notice | No | | None |
| `prior-art/reckon402`, `prior-art/PragmaMoney` | README says MIT, SPDX MIT in contracts; no LICENSE file | Learn only until confirmed | No | | Missing licence file; PragmaMoney also has 1 UNLICENSED header |
| `prior-art/kagi-wallet`, `prior-art/sucsage-agentic-wallet` | No LICENSE file; MIT SPDX headers in contracts | Learn only | No | | Missing licence file |
| `prior-art/skyfire-kyapay` | README: spec under Community Specification License v1.0, code MIT (CODE-LICENSE on upstream, not in the local clone) | Learn only | No | | Spec and code licences differ |
| `prior-art/intent-binding`, `prior-art/x402-guard` | No LICENSE file, no README licence section, no SPDX | **No** | No | | Default "all rights reserved" |
| `security/avip_defense` | Apache-2.0 (LICENSE-Apache-2.0) | Snippets with notice | No | | None |
| `security/x402scope` | MIT | Snippets with notice | Possible as test tool [VERIFY] | | None |
| `security/FinVault` | README: code Apache-2.0, **data "research use"**; no LICENSE file | **No** for data | No | Cite as benchmark | Data is research-use only: fine for our own offline red-team reference, never redistribute inside the product or a public dataset |

Duplicates: `erc-8004-contracts` appears in `build/`, `identity/`, `industry/`; `delegation-framework` in `build/` and `from-prior/`; the Cloudflare and Visa repos appear in two or three folders. Keep one copy of each when cleaning up.

## 2. Licence table: libraries and standards the stack plans to use

Versions and licences from the npm registry or GitHub licence API, read 2026-10-13. Source for the plan: [stack and repos](stack-and-repos.md).

| Item | Licence | Copy? | Depend? | Notes |
| --- | --- | --- | --- | --- |
| x402 SDK (`@x402/core`, `/evm`, `/express`, `/fetch`, `/mcp` 2.28.0) | Apache-2.0 | Small snippets with notice | **Yes** via npm | Apache-2.0 requires keeping the licence and NOTICE when redistributing; state changes if we modify |
| viem 2.57.4 | MIT | Yes | **Yes** | Keep MIT notice in the third-party file |
| `@modelcontextprotocol/sdk` 1.32.1 | MIT | Yes | **Yes** | The MCP specification text and its licence were not checked [VERIFY]; we only use the SDK |
| OpenZeppelin Contracts 5.6.1 | MIT | Yes (inheriting is the normal use) | **Yes**, as a Foundry dependency or npm | Keep the notice if we vendor `lib/` in the submission zip |
| `eth-infinitism/account-abstraction` | GPL-3.0 (and MIT per file) | **No** | Use the deployed EntryPoint only | See table 1 |
| `rhinestonewtf/safe7579` | GPL-3.0 / LGPL / MIT mixed | **No** | Not planned | |
| `erc7579/smartsessions` | AGPL-3.0 / LGPL / MIT mixed | **No** | Not planned | |
| MetaMask delegation framework | MIT and Apache-2.0 | Yes with notice (check headers) | Yes (Path B, deployed) | |
| `@metamask/smart-accounts-kit` 2.0.0, `@metamask/x402` 1.0.0 | MIT-0 OR Apache-2.0 | Yes | Yes | Pick MIT-0 (no attribution duty) and say so |
| ERC-8004 contracts and spec | Contracts MIT / spec CC0 (README), ISC in package.json | Interfaces yes | Deploy on FISCO (finals roadmap) | [VERIFY] which file we copy |
| EAS contracts (MIT) and `eas-sdk` 2.10.0 (MIT) | MIT | Yes | Yes | Predeploys on OP-stack chains only; on FISCO we would deploy them |
| WeIdentity | Apache-2.0 | Bonus only | Bonus only | |
| FISCO BCOS 3.16.4 | Apache-2.0 | No | **Yes** (the chain; release binary) | |
| Foundry | Apache-2.0 per GitHub licence API (project is commonly described as dual MIT/Apache-2.0) [VERIFY] | n/a | **Yes** (dev tool, not shipped) | Build tool, not shipped in the product |
| Vercel AI SDK `ai` 7.0.138 | Apache-2.0 | Snippets with notice | Yes if chosen | |
| `@anthropic-ai/sdk` 0.133.0 | MIT | Yes | Yes if chosen | SDK licence is separate from the API terms (section 3) |
| wagmi 3.7.7, RainbowKit 2.2.11, zod 4.6.7, jose 6.2.12, Express 5.3.0, Vitest 5.0.4, Next.js 16.4.0 | MIT | Yes | Yes | |
| `did-jwt` 9.0.2 | Apache-2.0 | Snippets with notice | Yes | |
| Our `MockEHKD` token | Our own code (EIP-3009 standard, written from scratch on OpenZeppelin) | n/a | n/a | Test token; do not call it the HKMA e-HKD or money |

Transitive dependencies are not checked here. Run a licence report (for example `npx license-checker --production --summary`, once `package.json` exists) and read the result before the submission zip is made. Do this in our own repo only, never inside `reference/repos/`.

## 3. API and service terms

What we found, with how sure we are. Terms change; the team member who actually signs up must read the live page.

| Service | What we confirmed (access date 2026-10-13) | What matters | Not confirmed |
| --- | --- | --- | --- |
| **x402.org public facilitator** (not used) | The x402 docs say it is "intended for development and testnet workflows" (docs.x402.org). It serves public testnets only, not our FISCO chain | Not used | n/a |
| **In-process facilitator** (what we run) | Uses the Apache-2.0 SDK inside our server; we hold the submitting key (gas price is 0 on FISCO, but it needs a native balance) | We control logs and hooks. Keep the key a throwaway test key, never committed | None |
| **Coinbase CDP facilitator** (not used) | Snippet: supports Coinbase's public chains only, needs a CDP account and API keys, has KYT/OFAC screening (docs.cdp.coinbase.com/x402/network-support) | Not used; does not serve our chain | n/a |
| **MetaMask hosted x402 facilitator** (ERC-7710 path, not used) | Snippet: docs list public-testnet endpoints only (docs.metamask.io/smart-accounts-kit/guides/x402/seller.md) | Path B only; does not serve our chain | Terms, rate limits, uptime |
| **Faucet** | Our own: `POST /api/faucet` on the server (native balance plus HK$100 eHKD, once per address per day) | No third-party terms | None |
| **LLM providers: Anthropic** | Commercial Terms (anthropic.com/legal/commercial-terms): business use only; must follow the Usage Policy and the Supported Regions Policy; no building competing products or training competing models; outputs owned by customer; Anthropic says it does not train on customer content from the Services; may ask for identity verification; sanctions and export limits apply. Separate news reports (snippet) say Anthropic's September 2025 policy bars entities controlled from unsupported regions including China | Team members in or relying on access from unsupported regions may not be allowed to use the API directly. Our product is not a competing AI model, so that clause does not bite | Whether student or competition use has special terms: not found. Current supported-regions list not read [VERIFY] |
| **LLM providers: OpenAI, Google, DeepSeek, Qwen and others** | Not checked | A WeBank defence in Shenzhen may prefer a model available in mainland China | [VERIFY] each provider's terms on region, students, and competition use if chosen |
| **Hosting / RPC** (Railway: `fisco-node`, `fisco-api`, `fisco-sellers`) | Our own services on Railway | Railway's terms apply to the hosting account | Terms [VERIFY] |
| **Block explorer** | Our own read-only explorer in the server at `/explorer` (FISCO has no public explorer) | Judges open tx hashes there | None |

Plain rule of thumb for LLM keys: each person uses their own account and region-legal access; never share one key in the repo; the demo should be able to run from one key stored in an environment variable that is not in the submission.

## 4. Safe default rules for the team

1. **Depend, do not paste.** Take libraries from npm or Foundry `forge install` with pinned versions. Our repo contains our own code plus a lock file, not copies of other projects.
2. **Never copy from the GPL/AGPL/BUSL group.** That is `account-abstraction`, `safe7579`, `smartsessions`, `kernel/dependencies/`, `Should-AI-Buy`, `internet-court-skill/vendored/`, the Visa TAP repos, and anything with no licence file. Read for ideas only, then write our own implementation.
3. **Check the header of every Solidity file** before copying one, not just the repo licence. `grep -m1 SPDX <file>` is enough. Repos here mix MIT with GPL, LGPL, AGPL and UNLICENSED files.
4. **Own contracts: write from scratch on OpenZeppelin (MIT).** Add our own SPDX header (suggest MIT) on every `.sol` file. Do not use the `UNLICENSED` header, which would also bar judges from reading the code freely.
5. **One notice file.** Add `THIRD_PARTY_NOTICES.md` at the repo root (outline below) plus copies of Apache-2.0 NOTICE text from the x402 SDK when we ship the SDK code or a bundled build.
6. **Mark any copied snippet** with a comment: source repo, commit, file, licence, and what we changed. Keep a running list in this page or in the notices file.
7. **Competitor repos are not a code source.** `competitors/*` are MIT but copying a rival entry's logic is a plagiarism and fairness risk, whatever the licence.
8. **Data: no real personal data.** Use made-up credentials and seller identities. Do not include FinVault data or other research-use datasets in the submission; cite them in the security self-assessment instead.
9. **Secrets stay out.** No API keys, gas wallet keys or seed phrases in the repo, the zip or the demo video. Use `.env.example` with placeholders.
10. **Brand names.** Say "built on x402", "runs on FISCO BCOS", "Mock e-HKD (a test token)". Never call the token the HKMA e-HKD. Do not use the Coinbase, Circle, MetaMask, Visa or WeBank logos as if endorsed. WeBank and FinTechathon naming follows the organiser's rules.
11. **Run a licence report** on the final `package.json` and `foundry.toml` dependencies on 18 October, and fix any GPL, AGPL, BUSL or "UNLICENSED" result.
12. **Our own licence.** Rule 7 says IP stays with participants and the organiser may use entries in promotion; confirm the licence we publish (MIT or Apache-2.0) does not conflict with that [VERIFY with organiser if we want a stricter licence].

## 5. Draft THIRD_PARTY_NOTICES outline for the submission

```
# Third-Party Notices — ChainBrain (链AI脑)
Generated 2026-10-DD. Our own code: <licence>, Copyright (c) 2026 <team>.

1. How to read this file
   - What we depend on (installed from registries) vs. what we copied (none, or listed in section 4)
   - Where the full licence texts live (./licenses/ folder)

2. Runtime and build dependencies (from the lock files)
   | Name | Version | Licence (SPDX) | Source URL | Use |
   x402 SDK (@x402/*), viem, @modelcontextprotocol/sdk, OpenZeppelin Contracts,
   eas-sdk, wagmi, RainbowKit, zod, jose / did-jwt, Express, Vitest, Next.js or Vite,
   LLM SDK (ai or @anthropic-ai/sdk)
   Dev tools (not shipped): Foundry

3. On-chain components we call (deployed by others, not copied)
   | Name | Network | Address | Licence of source | Note |
   None: on our FISCO chain (chain id 20200) every contract is ours (MockEHKD, Pocket, PocketFactory).
   Finals roadmap: our own deployments of the ERC-8004 registries and EAS (MIT source)

4. Code copied or adapted (must stay short and permissive)
   | Our file | Upstream repo + commit | Upstream file | Licence | Change made |
   (empty if none; never GPL/AGPL/BUSL/no-licence sources)

5. Specifications and ideas studied but not copied
   ERC-8004, EIP-3009, ERC-1271, ERC-7710, x402 offer-receipt, Alipay design note, CAMEL, Progent, AP2

6. Data
   All identities, issuers, sellers and credentials are fictional demo data. No personal data.
   External datasets used only offline for evaluation (e.g. FinVault: research use) are cited, not redistributed.

7. Services and APIs used
   | Service | Purpose | Terms link | Key held by | In the submission? |
   FISCO BCOS node (ours, Railway), x402 facilitator (in-process), LLM provider, Railway hosting

8. Trademarks
   Names and marks belong to their owners; no endorsement implied.

9. Licence texts
   ./licenses/MIT.txt, Apache-2.0.txt, plus upstream NOTICE files where Apache-2.0 requires.
```

## What this means for winning

| Tag | Recommendation | Helps |
| --- | --- | --- |
| [must] | Ship `THIRD_PARTY_NOTICES.md` and a one-paragraph "licence and compliance" section in the technical doc; rule 6 puts liability on us. | Security 30 (compliance) |
| [must] | Do not copy anything from `account-abstraction`, `safe7579`, `smartsessions`, `kernel/dependencies`, `Should-AI-Buy` or the Visa TAP repos. | Security 30 |
| [must] | Decide the LLM provider and who holds the key by 15 Oct, checking regional availability for every teammate and for the WeBank defence setting. | Task 40 |
| [should] | Run a licence report on the final dependency set on 18 Oct. | Security 30 |
| [should] | Say in the demo and docs that the x402 facilitator runs in-process on our test chain and that production would use a managed facilitator. | Innovation 30 |
| [should] | Keep one dedicated throwaway gas wallet and never commit its key. | Security 30 |
| [could] | Show a "licence and supply-chain" row in the security self-assessment (pinned versions, lock file, no copyleft). | Security 30 / Bonus |
| [could] | If we upgrade to Nexus or Safe7579 for the bonus, confirm per-file headers first; avoid Safe7579 source. | Bonus |

## Open questions

- Which LLM provider and region does each teammate actually have access to? Anthropic's Supported Regions Policy and any student terms must be read live [VERIFY].
- Railway's terms for the hosting account: not read.
- Which licence do we publish for our own code, and does it fit rule 7 (organiser may use entries for promotion)? Ask the organiser if unsure.
- Exact licence per file of the ERC-8004 contracts (MIT vs CC0 vs ISC statements) and of any MetaMask file we might copy (GPL/LGPL/UNLICENSED SPDX lines were found in the tree).
- Does the organiser require source disclosure or a private repo for review? Not in the rules we read.
- WeIdentity maintenance status and Foundry's exact dual-licence text were not checked.
- Transitive npm dependency licences: not checked until `package.json` exists.

## Sources

Accessed 2026-10-13:
- Competition rule 6 and 7: [hackathon rules](../01-competition/hackathon-rules.md)
- npm registry licences: https://registry.npmjs.org/ (each package `/latest`)
- GitHub licence API for foundry-rs/foundry, ethereum-attestation-service/eas-contracts, OpenZeppelin/openzeppelin-contracts: https://api.github.com/repos/<owner>/<repo>/license
- x402 facilitator concepts: https://docs.x402.org/core-concepts/facilitator
- x402 facilitators list (snippet): https://docs.x402.org/dev-tools/facilitators
- CDP x402 network support (snippet): https://docs.cdp.coinbase.com/x402/network-support
- CDP faucets: https://docs.cdp.coinbase.com/faucets
- MetaMask x402 seller guide (snippet): https://docs.metamask.io/smart-accounts-kit/guides/x402/seller.md
- Anthropic Commercial Terms: https://www.anthropic.com/legal/commercial-terms
- Anthropic supported-regions announcement (snippet): https://www.anthropic.com/news/updating-restrictions-of-sales-to-unsupported-regions
- Local repo evidence (LICENSE, NOTICE, README, package.json, SPDX headers, read only): `/Users/user/Workspace/Projects/shenzhen/lianainao-fintechathon/reference/repos/` (`build/`, `from-prior/`, `identity/`, `industry/`, `prior-art/`, `competitors/`, `security/`)

Related docs: [stack and repos](stack-and-repos.md), [x402 and pocket feasibility](x402-pocket-feasibility.md), [master index](../README.md), [product spec](../02-product/product-design.md).


## Pocket apps, 17 Oct: what was read and what was reused

Licences were checked against each cloned repo's `LICENSE` file on 2026-10-17.

**No code was copied.** Each idea below was re-written in our own words and code, so no licence text or NOTICE file has to ship. If code from any of these is ever copied, keep its licence and copyright notice, mark the changed files, and add it to `THIRD_PARTY_NOTICES.md`.

| Source | Licence | Taken (as an idea) | Ours |
| --- | --- | --- | --- |
| [vercel-labs/json-render](https://github.com/vercel-labs/json-render) | Apache-2.0 | A catalogue of components, each with a description and an example; the model prompt generated from the catalogue; structural checks after parsing | `shared/sim/pocketApp.ts` `BLOCKS`, `catalogPrompt`, `validateSpec` |
| [a2ui-project/a2ui](https://github.com/a2ui-project/a2ui) | Apache-2.0 | A versioned catalogue id; the component tree kept apart from its data; actions that move money need a user gesture | `catalogue: "chainbrain.pocket.v1"`; blocks never carry values; money moves only on the owner's slide |
| [CopilotKit](https://github.com/CopilotKit/CopilotKit), [ag-ui](https://github.com/ag-ui-protocol/ag-ui) | MIT | Validate the whole snapshot, then render it progressively | The "assembles itself" animation plays a validated spec in block order |
| [Vercel AI SDK](https://github.com/vercel/ai) | Apache-2.0 | A typed tool result maps to a fixed component | The forced `compose_pocket_app` tool, rendered by our components |
| [thesysdev/openui](https://github.com/thesysdev/openui) | MIT | Read only | — |
| [MetaMask/delegation-framework](https://github.com/MetaMask/delegation-framework) `ERC20PeriodTransferEnforcer` | MIT and Apache-2.0 | Period semantics: spend counts in the current period only, with no carry-over | `periodWindow` / `available`, off-chain. Pocket.sol is unchanged |
| [google-agentic-commerce/AP2](https://github.com/google-agentic-commerce/AP2) | Apache-2.0 | The `IntentMandate` vocabulary: description, merchants, skus, expiry | A routine's typed fields (our extension; AP2 has no recurring mandate) |

**New dependencies:** none on the phone or the console. The server's existing `zod` (MIT) builds the spec schema.

**Fonts:** Clash Display and General Sans come from Fontshare. They are still fetched at install and not committed.

**Brand marks:** the Claude, OpenAI, Exa, CoinGecko and Nansen marks are shown unaltered, at avatar size, never recoloured (`shared/brand/SOURCES.md`). Anthropic's trademark guidelines and OpenAI's brand page are cited in `docs/08-frontend/pocket-apps-research.md`.

**One data note:** Nansen's "smart-money flows" quote on the built-in network moves by day around HK$0.40 (Nansen's published premium price, US$0.05, at 8 HKD per USD). This was the owner's call, for the deal watcher, and is said in `shared/sim/catalog.ts`. It is never shown as a live Nansen price.
