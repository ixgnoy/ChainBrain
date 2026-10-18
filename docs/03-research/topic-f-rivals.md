# Topic F rivals: who else is entering, and how ChainBrain beats them
Last updated: 2026-10-19

> **Update (19 Oct):** we re-checked every known repo and searched GitHub again (14 repo queries for repos created since 1 Oct, about 300 READMEs grepped, plus 7 code searches). Rows added on 19 Oct are marked **(19 Oct)**. Code-level detail is in [the deep dive, section 0](competitor-deep-dive.md).
> - **Our side changed first.** On 17-18 Oct ChainBrain moved from Base Sepolia + Circle test USDC to **FISCO BCOS 3.16.4 + Mock e-HKD**, hosted on Railway with a public RPC, explorer and faucet. The "real Circle test USDC on a public chain" edge below (lines marked 15 Oct) **no longer applies**.
> - **Nine new Topic F repos:**
>   - **YINGLONG** (`ABRUBAB/YINGLONG`): ERC-7710 mandates with 14 enforcers and a passkey seal, on its own **4-sealer FISCO BCOS 3.17.1 chain** and Base Sepolia, a live app, about 396 contract tests and a 300-attack bench. It is now the strongest entry.
>   - **AgentWallet** (`Turjo101365/AgentWallet`): owner EIP-712 approvals on chain, 23 real Sepolia hashes, a live-LLM safety suite.
>   - **BaKhi** (`thaicuong576/agent-wallet`).
>   - A second, **unrelated LEASH** (`Brieuclerouxtardif/leash`).
>   - **Treasury Agent** (`AsylkhanKali/fintechathon`).
>   - **Aegis Wallet** (`ado1d/aegis-wallet`).
>   - **Guardian Wallet** (`siammds/Guardian_Wallet`).
>   - `EngrIbadUllah/agent-wallet`.
>   - **Guardian** (`ahammadshawki8/guardian`), spec only.
> - **Known rivals:**
>   - sucsage grew into a large Thai e-money app (still private Besu, mock THB, now with an MCP server).
>   - **Mandate Wallet now has a real contract close to our Pocket** (x402 via ERC-1271, freeze, co-sign, 126 Foundry tests), but no agent and no deployment.
>   - edxzh only has bot snapshots.
>   - KendraFi added docs but did not deploy on FISCO.
>   - Leash (finbase), xizo13, AgentVax and KiteShield have not pushed since 13-14 Oct.
> - **The field now has about 17 visible Topic F repos and about 45 other-topic International Track repos.**

> **Update (15 Oct):** a fresh GitHub search found **four more Topic F entries**: `xizo13/webank` (Agent Wallet MVP: MCP connector, FISCO BCOS), `ttwrpz/agentvax` (AgentVax: on-chain mandate, quarantined reader model, shared threat bulletin, a written paper), `atulharshvardhan2006/KiteShield-Backend` (policy engine and separate signer) and `Safius-Sifat/Fintechathon` (Mandate Wallet, spec only). A fifth, `shads-01/KendraFi`, is a Topic E entry with a Topic F-style escrow. sucsage moved to its own private chain with a live app. Our new Radar (counterparty screening) and Brain memory (PRs #1-#3 on origin/main) are also reflected below. Rows and lines added on 15 Oct are marked **(15 Oct)**.

> **Update (16 Oct):** re-checked every Topic F repo and searched for repos created since 15 Oct.
> - **No new Topic F entry.** Leash, edxzh, xizo13, AgentVax, KiteShield and Mandate Wallet have not pushed since mid-day 15 Oct. Mandate Wallet is still spec only, with an 18 Oct target.
> - **sucsage keeps shipping:**
>   - KYC with a mock Thai ID (ThaID) and a mock national identity login (OIDC + PKCE);
>   - Stripe test-mode top-ups;
>   - TECHNICAL.md;
>   - "the AI never shows wallet addresses";
>   - hire-or-buy deals.
>
>   It is building the most bank-like consumer product in the field, still on its own private chain with a mock token.
> - **Outside the competition:** `MELcodes99/sentry` (MoonPay hackathon) is a pre-sign check an agent pays US$0.01 over x402 for. It answers ALLOW / WARN / BLOCK with "dollars at risk", and has a "try to fool it" page. This is the industry direction our Radar and Pre-flight sit in. It is not a rival entry.
> - **Our side:** Sentinel, Pre-flight and "Speak your rules" (PRs #4 and #5) are added below. Rows marked **(16 Oct)**.

> **Code-level deep dive (15 Oct):** [competitor-deep-dive.md](competitor-deep-dive.md). It covers what to copy from each rival, six weaknesses it exposed in our own code, and the ranked plan to 20 Oct.

> **Status (14 Oct, v2):** The rival findings below still apply. Our own claims are superseded by the [v2 spec](../02-product/product-design.md): ChainBrain is now a consumer wallet. Our novelty is delegated spending with hard limits the user owns in a contract (pockets). The seller trust layer (verdict, seller guards, reputation, ERC-8004) is a finals roadmap item, not in the prelim demo. Lines marked "(old design, deferred to finals)" describe the earlier seller-side plan. Our build is now done locally and tested; live Base Sepolia hashes are still pending ([evidence](../evidence.md)).

## In one minute

- **(15 Oct) Topic F is crowded: six public repos now say they are Topic F entries,** plus one unlabelled lookalike (edxzh). Every one of them states the same core rule: the model proposes, deterministic code or a contract enforces. **Our safety principle is table stakes in this topic, not our edge.**
- **(15 Oct) The two most important new rivals:**
  - **`xizo13/webank`** already has what our finals roadmap promised. That means bring-your-own-agent over MCP (device-code pairing, scoped tokens, signed agent requests), a shop MCP, mandates, and settlement on a local FISCO BCOS chain (WeBank's own chain). Its weaknesses: simulated money, no live Claude session, hashes on a local chain nobody else can check, and an in-memory gateway.
  - **`ttwrpz/agentvax`** has the most rigorous security design in the field. It has:
    - an owner-signed mandate stored on chain;
    - a "reader" model with no tools that never feeds free text to the planner;
    - time-locked loosening;
    - a shared ThreatBulletin of attack "immunity capsules", which overlaps our Radar labels;
    - a 30-attack × 2-rewording suite and a written paper.
    Its published results are mock-model only (22/40 tasks, 0 hard violations), and it uses a mock token.
- **(15 Oct) Where ChainBrain is still ahead:**
  - Only we and edxzh pay **real Circle test USDC to real x402 HTTP sellers on a public testnet**. Everyone else uses a mock token, a private chain, or a mock RPC.
  - Only we have a **real model that re-plans after a refusal reason code**.
  - Nobody else has the full owner product: phone approvals, a judges' console and an offline built-in network.
  - **Radar** screens counterparties in the payment path.
- **(15 Oct) Where we are behind:**
  - **Evidence.** Leash, sucsage, edxzh and AgentVax publish hashes or evidence runs; ours are all still pending.
  - **Attack numbers.** Leash (30), AgentVax (60 runs) and KiteShield (91 tests) publish them.
  - **A judge-usable live app.** sucsage and edxzh have one.
  - **MCP and FISCO BCOS.** xizo13 has both.
- **(14 Oct) Two public repos said they were 2026 Topic F entries:** Leash (`detinatran/finbase`) and `sucsage/agentic-wallet`. Both read as serious. Leash is the stronger package; sucsage has the nicer "try it yourself" sandbox.
- **New finding, and an important one:** `edxzh/agent-wallet` (a solo developer, "Yunshu AI") is NOT labelled as a FinTechathon entry, but it is the closest technical twin of ChainBrain that we have found. It already does what our earlier doc called a possible "narrow novelty": a contract wallet whose ERC-1271 check approves the standard x402 USDC payment only after the rules pass, plus ERC-8004 reputation checked inside the payment, a live public dashboard, a "try to overspend" page, and an agent-hires-agent escrow. Whether it is a competition entry is [VERIFY]. Judges can find it either way.
- **The rest of the field is not Topic F.** Fresh repos found today are Topic C (Sathi, TuitionGuard, a tuition-FX assistant), Topic E (OneGate) and A or unstated (Monara). They set the polish bar judges see across topics, not our direct score rival.
- **What rivals lack (read from their code, not guessed):** no seller-side check on who the buyer is (our seller verdict is old design, deferred to finals), no real clarification or re-planning dialogue, test-token money (Leash and sucsage deploy their own mock USDC), and in Leash the default "AI" is a script. In v2, ChainBrain's real gaps to exploit are a real Claude tool-calling loop (no scripted fallback), reason-code re-planning, real Base Sepolia test USDC and pockets the user owns in a contract.
- **What rivals have that we do not (yet):** a finished evidence pack with a one-command re-run (Leash), a per-visitor sandbox judges can use (sucsage), an automated "agent run every 6 hours" evidence stream and live dashboard (edxzh), 17 to about 96 contract tests, and a written known-risk list. These are cheap to match; see the table in section 4.
- **Honest status (updated 14 Oct, v2):** the build is done and tested locally (contracts, server, web, Expo, Android; scenes 1-8 in replay mode). Live Base Sepolia hashes are still pending ([evidence](../evidence.md)). The rivals above ship running code with explorer links. We win on idea and demo only if we ship the evidence pack too.
- **Most teams do not publish.** This is a floor, not the field (same caveat as [prior art](prior-art-hackathons-github.md)). Search again on 19 Oct.
- **(15 Oct) Our own repos are private.** `ixgnoy/Grabber` and `ixgnoy/Fintechathon-LianAiNao` are both private as of 15 Oct, so rivals cannot read our docs. On 13 Oct, Grabber had appeared in a code search. LianAiNao still matches our own search because we can read it. Decide before 20 Oct whether the submission repo goes public ([open question O12](../00-start-here/open-questions.md)).

## 1. How we searched (GitHub, 12-15 Oct 2026)

| Method | What it returned |
| --- | --- |
| `gh search repos` for fintechathon, "fintechathon 2026", "FinTechathon International Track", "2026 SHENZHEN FINTECHATHON", "fintechathon-2026", "agent fintechathon", Chinese terms | Same 8-10 repos as the 12 Oct note, plus **TuitionGuard** (`ngoc-oss`, created 12 Oct). The phrase "agent wallet fintechathon" and "Topic F" returned nothing |
| `gh search code` for FinTechathon, "Fintechathon 2026", "International AI Track", "AI as a Financial Participant", "Shenzhen International FinTech Competition", "WeBank FinTechathon", organiser email, "Topic F Agent Wallet", "Autonomous On-chain Wallet Agent" | New topic C/E/A repos: **OneGate** (`TarrushSaxena`), **Sathi** (`Tasrif-Ahmed-Mohsin/finbuddy`), **Monara** (`ZoeMohamed`), **AI-Cross-Border-Tuition-FX-Assistant** (`HelloVthree`). Code search found `sucsage/agentic-wallet` but not Leash. Leash was found earlier by another route; its repo name `finbase` does not contain "fintechathon" in the name. Our own repo also appeared in code search (`ixgnoy/Grabber`): public docs mention ChainBrain, which any rival can read |
| `gh search repos "agent wallet"` created since 15 Sep 2026, plus x402, "agentic wallet", "agent spending policy" and similar (71 candidate repos) | About 40 generic agent-wallet repos. I fetched every README and searched for fintechathon, webank, shenzhen, Topic F. **Only `sucsage/agentic-wallet` matched.** None of the others mention the competition |
| Topic searches (`fintechathon`, `fintechathon-2026`, `webank`) | Nothing |
| Not found | A search for a quoted phrase in `gh search` is treated as an exact phrase and misses most repos; GitHub also rate-limited us twice. Private repos, GitLab/Gitee, and teams that have not pushed are invisible. This is not a complete list |
| **(15 Oct)** `gh search repos` created since 12 Oct for fintechathon, "fintechathon 2026", "agent wallet fintechathon", "shenzhen fintech", webank, "topic f", "agent wallet x402", "agentic wallet" (33 repos), then README, root-file and doc checks on every candidate | New Topic F: **xizo13/webank**, **KiteShield** (`atulharshvardhan2006/KiteShield-Backend`), **Mandate Wallet** (`Safius-Sifat/Fintechathon`, spec only). New other topics: Signet (B, FISCO BCOS anchoring), PocketPilot (A), Hela (C), Dorsal and Triody and HarborCFO (E), ClearTrade (`Salixandom/weBankHackathon`, cross-border trade, C or E), an MSME loan copilot (`FachryAlfareeza/WeBank-AI`, E), KendraFi (E with an F-style escrow), Equilibrium AI (topic unstated). Not entries: `HarihsS8/lunar_wallet`, `mackendell/agentic-wallet` (CoinWallet skill), `track-md/agentic-wallet-tracks` (empty) |
| **(15 Oct)** A code search earlier the same day (`"Topic F"`, `"Agent Wallet"`, fintechathon) | **AgentVax** (`ttwrpz/agentvax`, its paper says Topic F), KiteShield, KendraFi, sucsage, and our private `ixgnoy/Fintechathon-LianAiNao`. A second code-search pass later that day returned nothing (rate limit), so re-run on 19 Oct |

| **(19 Oct)** `gh search repos` created since 1 Oct for fintechathon, "fintechathon 2026", webank, "shenzhen fintech", "agent wallet", "agentic wallet", x402, fisco, e-hkd, ehkd, "agent payment", "agent spending", "AI financial participant", "fintech hackathon 2026" (307 unique repos). Every README fetched and grepped for fintechathon, webank, 微众, shenzhen, 深圳, "topic f", "international track". Then `gh search code` for "Topic F" + "Agent Wallet", "Autonomous On-chain Wallet", `fintechathon.szfintech.org`, "Shenzhen International FinTech Competition", "FinTechathon 2026" | **9 new Topic F repos** (see 2a, 19 Oct table) and about 25 new other-topic entries (see 2b). `Cmeteorite/fintechathon-ai` is a **Domestic track** entry (国内赛道), not ours. HarborCFO (`azmaeenmahtab/Shenzen-Fintechathon`) now returns 404. Our `ixgnoy/Fintechathon-LianAiNao` is still private. Several quoted-phrase code searches returned nothing (exact-phrase behaviour) |

Limits to remember: GitHub-visible only; commit dates below are from the GitHub commits API in UTC (13 Oct 02:16 UTC+8 is 12 Oct 18:16 UTC). Team sizes are the visible committers only.

## 2. Rivals table

### 2a. Topic F and same-concept repos (the ones that matter)

| Repo | Topic | What it does | Strengths | Weaknesses | Last commit (UTC) |
| --- | --- | --- | --- | --- | --- |
| **Leash** [`detinatran/finbase`](https://github.com/detinatran/finbase) | F (README says so) | Wallet agent for international students (rent, tuition, bills). Three layers: 7-tool least-privilege agent; deterministic policy engine (provenance tracking, look-alike address detection, limits, split-payment detection, pre-flight simulation) sorting every payment into T1 auto / T2 owner approval / T3 blocked; `PolicyWallet` contract (token and recipient allowlists, per-tx and daily caps, pause). Next.js UI, Foundry. Base Sepolia | Full submission packet in the repo (TECHNICAL, SECURITY_SELF_ASSESSMENT, EXECUTION_EVIDENCE, PITCH_DECK, DEMO_VIDEO_SCRIPT, SUBMISSION_CHECKLIST) mirroring the official templates; 3-minute narrated video and GIF; 17 contract tests incl. fuzz; 51 app tests; 30-attack suite (21 blocked, 9 escalated, 0 auto-executed) plus 6 normal payments with 0 false positives; `npm run evidence` regenerates 12 hash rows incl. 4 raw attack transactions reverted on-chain (`RecipientNotAllowed`, `ExceedsPerTxLimit`, `TokenNotAllowed`, `WalletPaused`). Real airdropped token whose name is an injection. Honest 11-item known-risk list | Default "AI" is a scripted naive agent (Claude or OpenAI-compatible is optional); no clarification, re-plan or turn-count story found in its docs; single-user wallet; no x402, no agent identity, no seller side; owner key on the server in the demo (its own KR-1); self-deployed mock USDC, mintable by anyone (its KR-11); injection detector is regex and English-centric (KR-3); every new payee needs owner approval, so little autonomy. Team: two named students | 2026-10-11 06:09 |
| **sucsage/agentic-wallet** [repo](https://github.com/sucsage/agentic-wallet) | F (README says so) | Agent pays SME contractors milestone by milestone (deposit, delivery, FAT, SAT, retention) through a `MilestoneEscrow`. Agent holds a scoped, expiring session key. Off-chain policy engine plus on-chain `AgentWallet` (caps, allowlists, N-of-M approvers, pause, instant revoke). Next.js 16 on Vercel, Hardhat 3 + viem, Base Sepolia | **Per-visitor sandbox wallet** created by a factory in one transaction, so judges cannot disturb each other; chain is the only database; audit log read from events; `agent-eval` script graded on real models (README: 8/8 on three models, 3/3 runs on one); 19 contract tests (counted: 19 `it()` blocks) including "send everything to 0xEvil"; documents hashed into evidence; i18n | README shows only two explorer links (factory creation and one reverted attack); no technical doc, self-assessment, evidence file or deck inside the repo; its own known-risk list is marked "draft"; owner has an unrestricted `execute`; self-deployed mock USDC; no x402, no identity, no seller side; single visible committer; Vercel reachability from China [VERIFY] | 2026-10-10 19:09 (GitHub shows a later push on 12 Oct) |
| **edxzh/agent-wallet** [repo](https://github.com/edxzh/agent-wallet) | **Not labelled** (no mention of FinTechathon in the README; [VERIFY] if entered). Built by "Yunshu AI", one visible committer, 2026-10-07 start | `PolicyWallet` contract (per-payment cap, daily and per-task budgets, payee allowlist, pause) that is an **ERC-1271 signer for standard x402 USDC payments**: valid only for a reserved digest signed by the agent key. Rule breaks are logged as `PaymentRefused(reason)` events with exactly one reason code. **ERC-8004 identity and reputation read inside `authorize`** (pay an unknown service only if trusted reviewers' average is at least 70 from at least 3 reviews; impostor identity refused). Ratings only from settled payments, tied to the payment nonce. "Agent hires agent" `JobEscrow` (spec 004, contract and tests done, on-chain steps pending). Live dashboard (`demo.yunshu.ai`), a "try to make it overspend" free dry-run page, a scripted agent run every 6 hours in CI, English and Chinese pages, MIT. Base Sepolia, real test USDC through the x402.org facilitator | The strongest overlap with our spec (see section 3). Roughly 96 Foundry test functions (grep count) incl. fuzz and invariants; pinned ERC-8004 registry addresses with a halt if the implementation changes; refusals as events (a public record); 4 spec folders with research notes; two published articles | No LLM in the loop that we could find (a scripted agent; no chat, no clarification, no re-plan); buyer-side only: the wallet decides whom it pays, nobody checks who the buyer is for the seller; no KYC or owner binding; no submission documents named for the competition; not audited (says so). Reviewers here are its own "scout" wallets (reputation is staged by the author, not independent) | 2026-10-12 15:46 |
| **(15 Oct) xizo13/webank** "Agent Wallet MVP" [repo](https://github.com/xizo13/webank) | F (README: "WeBank Fintechathon 2026 prototype", "Agent Wallet") | A separate wallet for AI agents with owner-approved mandates. Parts: an Expo owner app; a Next.js mock shop plus a **shop MCP** (Ed25519-signed payment requests); a **connector of five stdio MCP tools with device-code pairing, a local P-256 key, scoped tokens and signed agent requests**; a Fastify gateway (scoped agent auth, replay protection, policy and mandate checks, optional "Guardian" verdict, receipts, audit); five Solidity contracts on a **local four-node FISCO BCOS v3.17.1 chain**; and a "Treasurer" simulation. pnpm monorepo, Biome, Vitest | **Has our finals roadmap today:** bring-your-own-agent over MCP and settlement on WeBank's FISCO BCOS. Honest [verification doc](https://github.com/xizo13/webank/blob/main/docs/verification.md): 84 tests in 15 files; one CLI path from shop checkout through the connector, gateway, FISCO settlement and app detail; red-team denials (tampered request, honeypot merchant, frozen agent); callback-failure reconciliation (`503 reconciliation_required`, no false "paid"). A `redteam/` folder and an archived FISCO spike report | Its own limits list says: simulated currency (`ECnySim`) and mock shops; hashes are on a local permissioned chain, "not independently resolvable in a public explorer"; no live Claude session; Face ID is not a bank-verifiable approval; gateway state is in memory; Expo visual acceptance pending. Runs on macOS arm64 loopback only. One visible committer | 2026-10-14 07:46 |
| **(15 Oct) AgentVax** [`ttwrpz/agentvax`](https://github.com/ttwrpz/agentvax) | F (its paper, `docs/spec/agentvax_paper_v4.md`, says Topic F; README does not) | The owner's mission becomes an **owner-signed mandate stored on chain**. For every payment, the `PolicyWallet` contract (split into six linked libraries to fit the size limit) asks three questions. Two model roles: a quarantined **`reader`** with no tools turns untrusted content into typed fields and flags; a privileged **`planner`** never sees untrusted free text and emits an intent or one question code. Deterministic validator and "pressure" rules. **`ThreatBulletin`** is a shared on-chain registry of attack "immunity capsules" and detector versions. A guardian process per wallet. Python + Foundry; Base Sepolia or Sepolia via `make evidence` | The most rigorous security design in the field. P2 "learning changes risk estimates, only the owner changes authority" and P3 "caution is immediate, expansion is slow": loosening waits for a time-lock. Eval suite: 40 tasks, 10 ambiguous, 20 affordability, **30 attacks in 5 families (direct, indirect, memory, encoded, recipient substitution) × 2 rewordings**, plus probing, panicked-owner and hostile-wallet suites. A written paper (LaTeX). Chain-id guard on every signature | Published results are **mock-model only** (`results/summary.mock.json`: 22/40 tasks, 0 hard policy violations, 6/10 ambiguous handled; the summary itself says mock results say nothing about model quality). No live run file in `results/`; `evidence/hashes.json` was not readable by us [VERIFY]. MockUSD test token. Detector is a hashing encoder, not a trained embedding (its D29). One visible committer; the public repo was pushed in one go on 13 Oct | 2026-10-12 04:15 (pushed 2026-10-13) |
| **(15 Oct) KiteShield** [`atulharshvardhan2006/KiteShield-Backend`](https://github.com/atulharshvardhan2006/KiteShield-Backend) | F (README says so) | "Give the agent hands, not the keys." The agent proposes, a deterministic policy engine evaluates, a human approves if needed, a **transaction-bound single-use JWT** authorises, and a **separate signer re-verifies** before signing. GPT-4o structured extraction with a regex fallback. FastAPI, SQLite, React 19. Ethereum Sepolia | Clear security invariants (SI-1 to SI-12); 91 backend tests; hash-chained audit log; honest "mock RPC transactions are NOT on-chain" warning | **No smart contract**: limits live in the server and signer, not on chain. The default mode is a mock RPC with SHA-256 fake hashes; live Sepolia is "must be verified before any demo claim". No x402. One visible committer; created 14 Oct | 2026-10-14 07:10 |
| **(15 Oct) Mandate Wallet** [`Safius-Sifat/Fintechathon`](https://github.com/Safius-Sifat/Fintechathon) | F (pitch says "For Topic F") | Owner-controlled agent wallet that buys digital services (a "browser check"), operates an approved vault and makes bounded scheduled payments. "Task Permit" puts the financial boundary on chain; an evidence inspector with a portable task receipt | Strong framing for reviewers: independently checkable receipts and a standalone verifier | **Specification only**: the PRD says `status: specification-not-implemented`, target 18 Oct. Three Markdown files, no code | 2026-10-14 09:39 |
| **(15 Oct) KendraFi** [`shads-01/KendraFi`](https://github.com/shads-01/KendraFi) | E, with a Topic F-style escrow it calls a "+5 bonus" | Five SME copilot agents form Grameen-style peer lending groups; ERC-4337 session keys and `KendraEscrow.sol` on Base Sepolia and FISCO BCOS (planned) | Ambitious WeBank tie-ins (Weiyedai, FATE federated learning) | Not a Topic F rival on score; it misreads the bonus as a Topic F add-on | 2026-10-15 13:39 |
| Kagi Wallet, x402 Guard, IntentGuard, PragmaMoney, LedgerMind | Not FinTechathon | Covered in [prior art](prior-art-hackathons-github.md) | n/a | n/a | n/a |

**(19 Oct) New Topic F entries** (all pushed 16-18 Oct; read in code, see [deep dive 0.2](competitor-deep-dive.md)):

| Repo | What it does | Strengths | Weaknesses | Threat |
| --- | --- | --- | --- | --- |
| **YINGLONG** [`ABRUBAB/YINGLONG`](https://github.com/ABRUBAB/YINGLONG), team "Shadow Chaser" (5 named, 2 committers, 117 commits) | The owner states rules in plain language. They compile into an ERC-7710 delegation whose caveat enforcers are the rules, sealed with a passkey. The agent can only redeem the delegation. Student and Shenzhen-SME scenarios, a regulator view, a ZK private mandate | **Team-run FISCO BCOS 3.17.1 chain with 4 PBFT sealers + observer**, plus Base Sepolia with the same bytecode. 14 enforcers. x402 on FISCO. ~191 hashes with typed reverts. A Python verifier that turns a mandate back into English. ~396 Foundry tests, halmos + stateful fuzz. A 300-attack bench with a held-out family hashed in advance and a no-protection control. KR-01..19 and a compliance matrix. A live app with `/judge`, `/challenge`, `/proof` | The bench ran on Anvil with a rule parser, not a live LLM. Within-mandate manipulation got through 9/44 (their own figure). Fictional x402 sellers. Qwen, not a tool loop. Very heavy (46 contracts, 5 rails). No video yet. English only | **HIGH** |
| **AgentWallet** [`Turjo101365/AgentWallet`](https://github.com/Turjo101365/AgentWallet) (3 names, ~45 commits) | Treasury agent on Ethereum Sepolia: gpt-4.1-mini drafts transfers, a 14-check risk engine simulates them, and the owner signs an EIP-712 approval or a bounded task grant that the contract checks | 23 real Etherscan hashes (spot-checked). Live-LLM safety suite 19 cases × 4 runs. 26/26 public read-only checks incl. attack probes. Hosted Vercel + Render, deck PDF, "not claimed" list | v1 trusted the backend. 0.0001 ETH amounts. Test-only wallet bridge for the public run. RL gas advisor trained on synthetic data. No x402, no FISCO, English only | **HIGH** |
| **BaKhi** [`thaicuong576/agent-wallet`](https://github.com/thaicuong576/agent-wallet) | DeFi agent inside an owner's Investment Policy Statement (Aave, Morpho, Uniswap on Base Sepolia) | ~1,224 test functions. 46-scenario eval published by category (100%, replayed). Tiers, step-up signatures, hash-chained audit log, Render demo, full submission pack | **No contract**: a custodial server key and off-chain rules. 10 hashes, no revert | MEDIUM |
| **LEASH** [`Brieuclerouxtardif/leash`](https://github.com/Brieuclerouxtardif/leash) (solo, 90 commits; **not related** to detinatran's Leash) | Bill-paying and DCA agent capped by `LeashVault` on Ethereum Sepolia | 105 hashes incl. 15 mined refusals (spot-checked). A vault with a **published agent key**. A worst-case meter computed from chain data. A "no LEASH" counterfactual. 51 tests + 9 invariants | Codex CLI model, mostly recorded replays. No x402, no hosted app, no video file | MEDIUM |
| **Treasury Agent** [`AsylkhanKali/fintechathon`](https://github.com/AsylkhanKali/fintechathon) | Crypto-company treasurer: payroll, buffer, yield vault, depeg exit | `Treasury.sol` caps, daily cap, approval queue, vault share. 74 tests + 5 invariants | No LLM agent (the LLM only explains). 11 setup hashes only | MEDIUM |
| **Aegis Wallet** [`ado1d/aegis-wallet`](https://github.com/ado1d/aegis-wallet) | Natural-language wallet with a per-user `AegisVault` | ~77 tests, rolling 24 h cap | 2 commits on 18 Oct. Local Anvil hashes only. No security or evidence docs. Custodial keys | LOW |
| **Guardian Wallet** [`siammds/Guardian_Wallet`](https://github.com/siammds/Guardian_Wallet) | FastAPI + Android app, Python rules T01-T23 | Candid limitations doc | **Its code gives every approved payment one of 8 hard-coded Sepolia hashes** (`transaction_service.py` ~l.234). The guard contract is never called | LOW |
| `EngrIbadUllah/agent-wallet` | Flask app; Claude parses one command | — | No contract, no hashes ("Pending") | LOW |
| **Guardian** [`ahammadshawki8/guardian`](https://github.com/ahammadshawki8/guardian) (team of 3) | Spec: vault with a locked reserve, cooling-off for new payees, delayed loosening with a trusted-contact co-sign, "AI fooled vs money lost" attack numbers | Aims straight at the security rubric | No code; feature freeze 19 Oct 20:00 | MEDIUM if it ships |

**(19 Oct) Refresh of known rows:**

| Repo | What changed since 15-16 Oct | Last push (UTC) |
| --- | --- | --- |
| sucsage | 64 commits: a Thai e-money and freelance-deal app (mock KYC, Stripe/PromptPay test money, group wallets), a Bun desktop app with an hourly Merkle anchor (`ChainAnchor.sol`), an **MCP server**, 13 agent tools, a multi-model dispute panel, 35 attack cases with a status column. Still private Besu + mock THB, no x402, no FISCO. EVIDENCE.md still stamped 15 Oct | 2026-10-18 14:31 |
| edxzh | Only bot snapshots (`history.json`, `jobs.json`). Still not labelled as an entry | 2026-10-18 11:22 |
| Mandate Wallet | **Real contracts now**: `MandateWallet.sol` + libs (~2,000 lines), owner permits, co-sign, freeze, scheduled transfers, **x402 via ERC-1271**, 126 Foundry tests incl. 4 invariants. MCP, policy and worker are stubs, there is no LLM code, and nothing is deployed | 2026-10-18 14:56 |
| KendraFi | Deck, video storyboard, LangGraph, ZK toys. Claims Topic E + F. **Not on FISCO** (a compatibility claim only). Only 1 of 9 hash-like values in its evidence resolves on Base Sepolia | 2026-10-18 06:49 |
| Leash (finbase), xizo13, AgentVax, KiteShield | No change | 13-14 Oct |

Other agent-wallet repos from the 15 Sep+ scan (`PDiTO/agent-wallet`, `NEXE-sudo/aegis-agent-wallet`, `Makabeez/mandate`, `loveaihq/ada-agent-wallet`, `voidly-ai/agent-wallet-kit`, `leodevnc/world-agent-wallet`) describe on-chain limits, policy gates or x402, but none mention the competition. Treat them as "same idea, other hackathons"; I did not read them in depth. `harsh11067/vectis` ("Autonomous On-chain Wallet Agent", ERC-7710 redelegation) dates from June, so it is a different event.

**(15 Oct) Refresh of the three rows above:**

| Repo | What changed since 14 Oct | Last commit (UTC) |
| --- | --- | --- |
| Leash | Nothing new: a doc header fix on 13 Oct. Its submission packet is complete | 2026-10-13 13:06 |
| sucsage | The big move: **it left Base Sepolia for its own private Hyperledger Besu chain** (chain id 20261020). Only the app's keys can write; anyone can read via a public JSON-RPC and an explorer on Vercel. It now has a **live app with Mock Bank sign-up** ([agentic-wallet-inky.vercel.app](https://agentic-wallet-inky.vercel.app)), [EVIDENCE.md](https://github.com/sucsage/agentic-wallet/blob/main/EVIDENCE.md) regenerated from the chain (wallets created, deals, escrow locks), TECHNICAL.md and SECURITY.md (written 15 Oct). New features: file escrow ("hire vs buy" deals), parcel tracking, saved chats, MockTHB token. Fixes from the 14 Oct row: it now has an evidence file and docs. A new weakness: its hashes are on a chain the team controls, not a public network. That counts against it if judges read "real on-chain" as a public chain (our O1) | 2026-10-15 14:50 |
| edxzh | Still no mention of FinTechathon or WeBank anywhere in the repo (GitHub code search, 15 Oct). It keeps producing fresh hashes: CI snapshots about every 6 hours, plus a gas-runway alert added 13 Oct. A Chinese "How it works" guide. Dashboard at [demo.yunshu.ai](https://demo.yunshu.ai) | 2026-10-15 11:45 (snapshot) |

### 2b. Other topics (set the polish bar; not our direct rival)

| Repo | Topic | What it is | Why it matters to us | Last commit (UTC) |
| --- | --- | --- | --- | --- |
| `tanhongsheng050204-code/2026-SHENZHEN-FINTECHATHON-INTERNATIONAL-TRACK` (DuitDuit) | E | Very strong SME copilot; 686 tests, 42/42 eval (22 functional, 20 adversarial), OWASP mapping, maker-checker, kill switch (per [prior note](../../reference/prior-research/docs/competitors-2026.md); not re-read today) | Sets the cross-topic evidence bar judges may remember | prior note: 2026-10-11 |
| `odripads/fundbun` (FundBun) | A | Local-first budgeting agent; 45/45 scenarios, 24/24 attacks blocked (prior note) | Same | prior note: 2026-10-08 |
| **OneGate SME** [`TarrushSaxena/OneGate`](https://github.com/TarrushSaxena/OneGate) | E | Finance copilot for small businesses ("can't move money without the owner"). Four tiers READ / SUGGEST / EXECUTE / DENY by role; hard limits; owner must re-type the exact amount to approve; 42 test suites passing (README badge), 28 SME tests; synthetic sandbox evidence folder; full submission index | Strong packaging; "re-type the exact amount" is a neat, cheap approval trick | 2026-10-12 17:42 |
| **Sathi** [`Tasrif-Ahmed-Mohsin/finbuddy`](https://github.com/Tasrif-Ahmed-Mohsin/finbuddy) | C | Cross-border student agent, Bangladesh to China, Bengali/English/Chinese. 144 backend tests (README); hash-chained sandbox log; approval tokens bound to the exact draft; card freeze that the agent may do but never undo; credit-passport with QR; real FX history | Broadest feature set seen; its dialogue and "agent may protect but never un-protect" rule are ideas worth noting | 2026-10-12 18:16 |
| **TuitionGuard** [`ngoc-oss/TuitionGuard-FinTechathon-2026`](https://github.com/ngoc-oss/TuitionGuard-FinTechathon-2026) | C | Simulated tuition payments: deterministic policy, protected living-expense reserve, plan hash with 5-minute expiry, 8-field receipt reconciliation, offline HTML demo; optional Groq Llama agent | CI and CodeQL badges, offline demo file | 2026-10-12 09:14 |
| `HelloVthree/AI-Cross-Border-Tuition-FX-Assistant` | C | LangGraph agent, FastAPI, Postgres, JWT roles, Stripe test mode or simulator, 35 tests (README) | Typical mid-field entry | 2026-10-09 09:01 |
| `ZoeMohamed/Monara` | unstated (docs say FinTechathon 2026 submission) | Personal-finance PWA, mostly UI with sample data; agent and database are scaffolding, "not implemented" per README. Three committers | Weak on agent depth today | 2026-10-12 11:10 |
| DEWA, Robo-oeconomicus, FinTar, FlowWise, Probaho, SF Assistant, ururu9339, Dinalar, empty repos | B, C, E, unknown | See the [12 Oct note](../../reference/prior-research/docs/competitors-2026.md) | Not re-read today | prior note |

Totals: counting the 14 in the 12 Oct note and the six new repos above (OneGate, Sathi, TuitionGuard, the tuition-FX assistant, Monara, and the unlabelled edxzh lookalike), about 20 public repos look like International Track attempts. **Topic F: two confirmed (Leash, sucsage), one lookalike (edxzh).** Direction F is therefore more crowded than the 12 Oct note said, and Leash was missing from that note's table.

**(15 Oct) Totals now:** about 32 public International Track repos.
- **Topic F:** six that say so (Leash, sucsage, xizo13, AgentVax, KiteShield, Mandate Wallet), one lookalike (edxzh), and one Topic E entry with an F-style escrow (KendraFi). Only five of the six have code; Mandate Wallet is a spec.
- **New other-topic entries (15 Oct)**, which set the polish bar only:
  - [Signet](https://github.com/basicacc/fintechaton_signet) (B): sealed AI advice anchored on FISCO BCOS.
  - [PocketPilot](https://github.com/redwan001/pocketpilot) (A).
  - [Hela](https://github.com/sam-austin-junior/hela) (C): "payments approved only by a policy engine, never by the model".
  - [Dorsal](https://github.com/Curley-Penguine/dorsal), [Triody](https://github.com/sifatsiddiki/Triody-AI-SME-Copilot) and [HarborCFO](https://github.com/azmaeenmahtab/Shenzen-Fintechathon) (E).
  - [ClearTrade](https://github.com/Salixandom/weBankHackathon): a cross-border export deal harness with WALKTHROUGH and REPRODUCIBILITY docs.
  - [MSME loan copilot](https://github.com/FachryAlfareeza/WeBank-AI) (E): Qwen2.5 LoRA.
  - [Equilibrium AI](https://github.com/Regulus-24/Equilibrium-AI) (unstated).
- **FISCO BCOS:** the "policy engine, never the model" line is now universal. At least three entries (xizo13, Signet, KendraFi) use or plan FISCO BCOS.

**(19 Oct) Other topics: about 45 public International Track repos** (README and file-tree review through the API; DuitDuit read locally). The details sit in the reviewer notes; the summary is below.

- **The polish bar is evidence packaging, not chain.** Nine are tier A:
  - Corridor Wealth (B, `pzy54154631-hub/Shenzhen-Fintech-international-Project`);
  - Bluefin (C, `Tasrif-Ahmed-Mohsin/finbuddy`, the repo we called Sathi);
  - Runway (E, `gabi200/runway`);
  - DuitDuit (E);
  - Signet (B);
  - FundBun (A);
  - OneGate (E);
  - Dorsal (E);
  - Fiona (E, `Asharib19khan/fiona`).

  They share:
  - a numbered attack or "judge task" suite mapped to the score weights;
  - a security self-assessment;
  - a hash-chained audit log;
  - an offline scripted model so judges can reproduce without a key;
  - a video;
  - a hosted link.

  We have every item except the first.
- **FISCO in other topics:**
  - **Bluefin** has real FISCO BCOS 3.17.1 deploy and anchor hashes on a 4-node PBFT chain. Its chain ports are localhost-only, so judges can only check through its app.
  - **Signet** has a FISCO contract and a 4-node script but publishes no hashes.
  - `SamJU25/F-SME-Finance-Copilot` has a FISCO contract with no deployment.

  No entry uses WeBank's other open-source stack (WeIdentity, FATE, WeDPR, WeBASE).
- **No other-topic entry enforces rules in a contract or pays x402 sellers.** All of them use off-chain policy engines over sandbox banks.
- **Numbers worth matching:**
  - FundBun: **0/26 false refusals, 1.35 user turns per task** (the only published dialogue-efficiency metric).
  - FlowGuard: gated vs ungated arms, unauthorised execution 0/14 vs 14/14.
  - Corridor Wealth: strict replay of recorded live-model runs (142/142), a blind attack corpus, and upper bounds on zero-event rates.
  - DuitDuit: a table mapping the four named attack classes to task IDs.
  - Bluefin: judge tasks grouped by score weight (9/7/4).
- **A China-reachability warning, from DuitDuit's README:** `vercel.app` is blocked in mainland China. **Our judge console is on `fintechathon-lian-ai-nao.vercel.app`.** Judges at WeBank in Shenzhen may not reach it without a VPN.
- **Topic D** appears to be an Insurance Assistant (ClaimShield AI labels itself so; no organiser source). `Cmeteorite/fintechathon-ai` is a Domestic-track entry. No README contains prompt-injection text aimed at AI judges.

## 3. What the Topic F rivals mean for ChainBrain's novelty claims

| Our claim in the docs | What the code shows | Fix |
| --- | --- | --- |
| "A pocket that pays x402 within limits" | Done by edxzh with real test USDC, by Leash and sucsage with caps and allowlists (no x402) | Already marked "table stakes" in [judge simulation](../06-pitch/judge-simulation.md). Keep it |
| "Narrow edge: rules enforced inside an ERC-1271 check on the standard x402 USDC authorization" ([prior art](prior-art-hackathons-github.md), marked [VERIFY] there) | **edxzh/agent-wallet does exactly this**: `isValidSignature` accepts only a reserved digest signed by the agent, after `authorize` ran the rules | Do not claim this as new. Say "we build on the same standard pattern". (Update 14 Oct: the v2 pocket does use this pattern, an ERC-1271 contract that rebuilds the USDC EIP-3009 digest. Our claim is delegated spending with hard limits the user owns, not the pattern.) |
| "ERC-8004 identity and reputation for payees" (old design, deferred to finals) | edxzh reads both registries inside the payment, with pinned registry addresses and payment-grounded ratings | Not in the v2 prelim. If used at the finals, it must be on the seller-checks-buyer side, which edxzh does not do |
| "Seller verifies the buyer agent (seven guards, verdict, reason code, live re-plan)" (old design, deferred to finals; finals roadmap) | Not found in any of the three. edxzh has reason codes but for the buyer's own wallet refusals; Leash has typed reverts; none has a seller gateway or a "serve / step up / refuse" verdict | Still a real gap, but a finals roadmap item. For the prelim, lead with the user-owned pocket and its evidence (and still say Visa TAP, Skyfire and others verify agents in the card world) |
| "Agent hires another agent (translation agent)" (old design, dropped in v2) | edxzh has a `JobEscrow` for exactly that; sucsage has `MilestoneEscrow` | Not in v2 scenes 1-8 (v2 buys research reports from stock x402 sellers) |
| **(15 Oct)** "Bring your own agent via a public MCP server" (finals roadmap, [technical document](../technical-document.md)) | **xizo13/webank has it now**: five MCP tools, device-code pairing, scoped tokens, a local P-256 key per connector, signed agent requests. It also has a shop MCP with signed payment requests and authenticated shop callbacks, which is partly two-sided [VERIFY how far the shop checks the agent] | Not new. If shown at the finals, say "like other entries, any agent connects over MCP"; our difference must be the pocket contract on a public chain, not the connector |
| **(15 Oct)** "The pocket on FISCO BCOS" (finals roadmap) | xizo13 settles on a local four-node FISCO BCOS v3.17.1 chain; Signet (Topic B) anchors on FISCO; KendraFi plans it | No longer "the only unique bonus idea". Still worth a bonus if done, but no novelty claim |
| **(15 Oct)** Radar: "Elliptic-style counterparty screening in the payment path" (origin/main, PRs #1-#2) | Nobody screens the payee's fund flows (source and destination exposure). The nearest are AgentVax's shared on-chain `ThreatBulletin` of attack "capsules" (shared threat intelligence, not fund tracing), Leash's provenance and look-alike checks, xizo13's optional "Guardian" verdict and honeypot-merchant denial, and edxzh's ERC-8004 reputation | A real, narrow edge: "an approved seller that later receives money from a flagged wallet is blocked for every pocket". Label the demo data as simulated (scene 9 runs on the built-in network) |
| **(15 Oct)** Brain memory: "memory that can only narrow" (origin/main, PR #3) | AgentVax already states the principle: "learning changes risk estimates, only the owner changes authority", enforced by a time-lock on loosening. Its attack suite includes a "memory" family | Say "like AgentVax's rule, our memory can never widen authority". Don't claim it reduces hallucination unless we measure it |
| **(16 Oct)** Sentinel: "a second AI watches the agent and can freeze the pocket on chain" (PR #4) | AgentVax runs "a guardian process per wallet"; Sathi lets its agent freeze a card but never undo it; Leash and sucsage have an owner pause; xizo13 denies a "frozen agent" | Not new as a pattern. Our narrow part: the guardian key can only **freeze**, only the owner unfreezes (enforced in `Pocket.sol`); fixed behaviour rules (refusal bursts, ghost transfers, injection follow-through) decide, and a decision model (Jev, or a Claude stand-in) can only make the response stricter. Say "like AgentVax and Sathi, protection is one-way" |
| **(16 Oct)** Pre-flight: "the agent predicts each payment's outcome before paying, then checks it" (PR #5) | Leash's policy engine has pre-flight simulation; edxzh has a free dry-run page (`eth_simulateV1`) | Table stakes. Our only extra: predicted vs actual is shown per payment and counted ("predicted 5 of 5"). Don't headline it |
| **(16 Oct)** Speak your rules: "one sentence becomes pocket rules plus a proof card" (PR #5) | AgentVax turns the owner's mission into an owner-signed mandate; sucsage asks before drafting | Partly new: two independent model readings are merged so a disagreement takes the **stricter** value, and the worst case plus rule checks are **computed by code**, not written by the AI. The owner still reviews and signs. Say exactly that, not "AI writes your rules" |
| **(19 Oct)** "The pocket on FISCO BCOS" (now built: 1 node on Railway) | **YINGLONG runs a 4-sealer FISCO 3.17.1 chain** with x402 and passkey co-sign on it; xizo13 has a local 4-node chain | A bonus we share. Say "a FISCO BCOS node anyone can query, with an explorer and a faucet". Never say "the only FISCO entry" |
| **(19 Oct)** "x402 paid from an ERC-1271 contract with owner co-sign and freeze" | Mandate Wallet's new contract does the same (not deployed); YINGLONG pays x402 with ERC-7710 child delegations; edxzh does ERC-1271 x402 | Table stakes in design. Our part is that it is **deployed and paid by a live Claude agent** |
| **(19 Oct)** "A guardian that can only freeze" (Sentinel) | YINGLONG KillSwitch, LEASH pause-only guardian, Treasury `emergencyExit`, AgentVax guardian | Not new. Keep the narrow part: behaviour rules decide, and only the owner unfreezes |
| **(19 Oct)** Published attack numbers | YINGLONG 300 (rule parser), BaKhi 46 (replay), AgentWallet 19 × 4 (live gpt-4.1-mini), LEASH 16 + 6, sucsage 35 cases | We have none. A **live-Claude** row would be the only one measured on a frontier model with a tool loop |
| **(15 Oct)** "Every AI layer can only add refusals; the contract has the final say" | Every Topic F entry says a version of this: Leash, sucsage ("a hallucinating agent still cannot move funds outside policy"), AgentVax (P1), KiteShield ("model output is untrusted"), xizo13, Hela | Table stakes. Keep it as the foundation, never as the headline novelty |

## 4. Head-to-head against ChainBrain (written 13 Oct against the old plan; the build now exists locally, live hashes pending; "seller" rows are old design, deferred to finals)

Scale: ahead / even / behind for what a judge could see on 20 Oct. "ChainBrain" means the plan in the [spec](../02-product/product-design.md) and [recommended changes](../02-product/recommended-changes.md), delivered on time.

### Task completion (40%): on-chain hashes, judged by explorer

| Item | Leash | sucsage | edxzh (lookalike) | ChainBrain (plan) | Read |
| --- | --- | --- | --- | --- | --- |
| Real hashes visible in the repo | 12 rows, 8 successes or events, 4 reverted attacks, `npm run evidence` regenerates | 2 links in README (factory create, one revert); more only if a judge runs the sandbox | Many, from the 6-hourly CI run and the public dashboard | Plan: every core scene ends in a hash; needs spike (14 Oct) | **Behind until the pack exists.** Equal after |
| Real token | Self-deployed mock USDC | Self-deployed MockUSDC | Circle test USDC via x402.org facilitator | Real Base Sepolia USDC (spec) | Ahead of Leash and sucsage if the spike passes; level with edxzh |
| Paying a real HTTP service (x402) | No | No (escrow) | Yes | Yes (core) | Ahead of two, even with one |
| Ordinary tasks handled | 6 normal payments tested, 0 false positives | Chat agent, 8 decision points | Scripted scenarios | Spec has no ordinary-task set yet (flagged in [how judges score](../06-pitch/how-judges-score.md)) | **Behind**; add 10 plain tasks |
| Judge can try it | Local run; hosted demo not stated | Per-visitor sandbox on Vercel | Live dashboard and dry-run page (Cloudflare) | Planned | **Behind** sucsage and edxzh unless we host a judge sandbox |
| Reachable from mainland China | Not stated | Vercel [VERIFY] | Cloudflare Pages and Workers [VERIFY] | Open | Unknown for all; a tested mainland path is a cheap edge |

### Security and compliance (30%): induced transfer, data extraction, privilege escalation, prompt injection

| Item | Leash | sucsage | edxzh | ChainBrain (plan) | Read |
| --- | --- | --- | --- | --- | --- |
| On-chain backstop | Yes, fuzz-tested | Yes, on-chain tiers and N-of-M | Yes, fuzz and invariant tests | Yes (pocket) | Even |
| Attack suite with numbers | **30 attacks, report, 0 auto-executed** | 19 contract tests, 8 agent-eval cases | Fuzz per refusal reason; no attack report named | Planned 30+ x20 runs ([recommended changes](../02-product/recommended-changes.md) item 7) | **Behind Leash until run** |
| Typical attack covered | Injected email, look-alike address, airdropped token name, split payments | "Send all to 0xEvil" | Over-cap, wrong payee, impostor identity | Plan includes chat-level and gateway attacks | Leash wins on variety today |
| Data extraction | Not a stated focus | Not stated | Not stated | Selective disclosure idea (SD-JWT) in plan | Possible edge; nobody addresses it |
| Privilege escalation | Agent cannot unpause or approve itself | Only owner unpauses | Agent key cannot change rules | Per spec | Even |
| Honest known-risk list | Yes, 11 items, with owner-key-on-server admitted | Draft | "Not audited" note | Spec needs named residuals | Behind Leash until written |
| Seller-side security (replay, double-grant) | n/a | n/a | n/a | Planned gateway tests (old design, deferred to finals) | **Ahead** (finals; nobody else has the surface) |

### Innovation and interaction (30%): novelty, real-world value, dialogue efficiency, clarification, correction, fallback

| Item | Leash | sucsage | edxzh | ChainBrain (plan) | Read |
| --- | --- | --- | --- | --- | --- |
| Novel idea | Provenance tracking of addresses; student use | Milestone escrow for SME works | ERC-8004 gating; agent hires agent | Seller verdict + reason-code re-plan (old design, deferred to finals; v2: user-owned pocket + reason-code re-plan) | **Ahead** on seller side (finals); narrow elsewhere |
| Real-world value | Students' rent and tuition (clear) | SME contractors (clear) | Developer infrastructure | Merchants' readiness gap (market data in [market doc](market-regulation-webank.md)) | Even; ours is the abstract one, so name one merchant |
| Clarification | Not found | Chat agent; README says it is tested on refusing an incomplete SAT (no clarification dialogue described) | None | One clarifying question (v2: asked by the real model, scene 1) | Even or slightly ahead |
| Correction / re-plan after refusal | Prompt forbids retrying blocked payments (agent stops) | Not stated | Not stated | **Reads a reason code and picks another seller** | **Ahead** |
| Fallback | Offline scripted mode; LLM refusal fallback | Rule-based UI without LLM | Not applicable | Dead-end stop and explain | Even |
| Dialogue efficiency measured | No | Latency per run in README (about 35 s) | No | Planned "turns per task" | Ahead if we measure |
| Visible LLM in the loop | Optional | Yes | No | Yes | Even |

Bonus (0-5): nobody visible uses FISCO BCOS; Leash only says its Solidity "is compatible" with consortium chains. A tested FISCO deployment would be unique but is a bonus, not a core win. In v2, FISCO BCOS is planned only (finals roadmap), not built. **(15 Oct) No longer true:** xizo13 settles on a local FISCO BCOS chain, and Signet (Topic B) anchors on FISCO. A FISCO run is still a bonus candidate for us, but not a unique one.

### (15 Oct) Head-to-head with the new entries

Scale: ahead / even / behind for what a judge could see on 20 Oct. "ChainBrain" means origin/main as of 15 Oct: built and tested locally, live hashes pending.

| Item | xizo13/webank | AgentVax | KiteShield | sucsage (15 Oct) | ChainBrain | Read |
| --- | --- | --- | --- | --- | --- | --- |
| Where hashes live | Local FISCO chain, not publicly resolvable | Base Sepolia or Sepolia via `make evidence` (live file not seen) | Mock RPC by default; live Sepolia unverified | Own private Besu chain with a public read RPC | Base Sepolia (public), pending | **Ahead if our live run lands**: only we and edxzh are on a public chain with real Circle test USDC |
| Money | `ECnySim` simulated | MockUSD | Sepolia ETH or mock | MockTHB | Circle test USDC via x402 | Ahead |
| Real LLM in the published run | No (CLI driver, no live Claude) | Mock model in published results | GPT-4o extraction (structured) | Yes, tool-use loop | Yes, Opus tool loop; real-model run of scenes 1-8 still pending | Ahead or even once the real-model run is recorded |
| Re-plan after a refusal | Not described | Planner emits one question code | Not described | Not described | Reads the reason code, picks another seller | Ahead |
| Attack suite with numbers | Red-team denial tests (count not stated) | 30 × 2 rewordings, 5 families, plus panicked-owner and hostile-wallet suites | 91 tests incl. security invariants | 19 contract tests, 8 agent-eval cases | Planned, not run | **Behind** AgentVax and Leash until we publish ours |
| Contract enforces limits | Yes (FISCO contracts plus gateway) | Yes, rich (mandate, time-lock, allowance) | **No contract** (server and signer) | Yes | Yes (pocket, ERC-1271) | Even with most; ahead of KiteShield |
| Any agent can connect (MCP) | **Yes** | No | No | No | Finals roadmap | **Behind** xizo13 |
| Untrusted-text isolation | Signed requests and a Guardian | **Reader/planner split** (strongest) | Model output treated as untrusted | Untrusted-document handling | `<untrusted_content>` wrapping, a fixed intent template, no seller text in memory | Even; AgentVax is architecturally stronger |
| Counterparty screening | Honeypot merchant denial, optional Guardian | ThreatBulletin (shared attack capsules) | No | No | **Radar: fund-flow exposure scoring plus re-screening** | Ahead (narrow) |
| **(16 Oct)** Watcher that can freeze | "Frozen agent" denial | Guardian process per wallet | No | Owner pause | **Sentinel: freeze-only key in the contract, owner-only unfreeze, typed reason on the phone** | Even with AgentVax; ahead of the rest |
| **(16 Oct)** Owner states rules in plain words | No | Mission → signed mandate | No | Asks before drafting | **One sentence → two readings merged stricter → computed proof card** | Even with AgentVax on idea; ahead on the visible proof |
| Owner app judges can see | Expo (visual acceptance pending) | Hosted UI via `make ui` | React web | **Live Vercel app with sign-up** | Expo phone app, web console, offline built-in network | Even; behind sucsage on "click a link and try it" |
| Judge can try it from a link | No (local loopback only) | Not stated | Not stated | **Yes** | Not yet | **Behind** sucsage and edxzh |

## 5. Features rivals have that we lack, and the cheapest way to add them

| Rival feature | Who | Cheap version for ChainBrain | Effort | Score |
| --- | --- | --- | --- | --- |
| One-command evidence regeneration with expected vs actual and explorer links, including raw "bypass" attack transactions that revert | Leash | Our `npm run evidence` (item 6 in recommended changes); add 4 reverted-hash rows | M | Task, Security |
| Submission files mirroring the templates, in the repo | Leash | Technical doc, security self-assessment, evidence doc, deck outline, video script, submission checklist, all versioned | M | All |
| 30 attacks, 0 auto-executed, 6 normal payments with 0 false positives | Leash | Same style table; add our gateway attacks (replay, double-grant, forged intent) | M | Security |
| Provenance tracking (where did this payee address first appear?) and look-alike address check | Leash | A 40-line check in the buyer agent: payee not typed by the owner and found only in fetched content leads to "step up". Our intent-diff may already cover it | S | Security |
| Real attack artefact (an airdropped token whose name is an injection) | Leash | One live attack we do not control: a seller response that carries an instruction. We already plan seller-side tests | S | Security, Innovation |
| Per-visitor sandbox so judges cannot interfere | sucsage | A "launch my own pocket" button that deploys a fresh pocket with test USDC through one factory call. If there is no time, give judges one shared sandbox and a reset script | M | Task, Innovation |
| Agent evaluation on several models with run counts | sucsage | `agent-eval` style: same 10 tasks on 2 or 3 models, 3 runs, report a table. Also answers "which LLM, reproducibility" from the [review gaps](../07-log/review-2026-10-13.md) | S-M | Innovation, Task |
| Scheduled run that keeps producing real hashes and a public dashboard | edxzh | A GitHub Action or cron that runs two or three scenes daily on Base Sepolia, written to a static page. Gives judges a fresh hash even if our live demo fails | M | Task |
| "Try to make it overspend" page with a free dry-run (`eth_simulateV1`, nothing sent) | edxzh | Judge types an attack; we simulate it and show the contract's typed refusal. Cheap and very on-theme for the 30% | S-M | Security |
| Refusals as public events with exactly one reason code, listed in the docs | edxzh | We already plan reason codes; publish them as a schema (item 25) and emit them on-chain where possible | S | Innovation, Security |
| Pinned registry addresses and "halt if the implementation changed" | edxzh | If we use the public ERC-8004 registries, pin and check addresses before paying | S | Security |
| Owner must re-type the exact amount to approve | OneGate | Add to the owner step-up screen; also defeats UI deception | S | Security |
| Agent may protect (freeze, pause) but never un-protect | Sathi, Leash | **(16 Oct) Done:** the Sentinel's key can freeze, only the owner unfreezes (`NOT_GUARDIAN` / `onlyOwner`, scene 10). Still to do: put the rule in the permission table | S | Security |
| Known-risk list with IDs | Leash | Write ours with named residuals and test IDs | S | Security |
| Offline reproducible demo file | TuitionGuard, FundBun | Static replay page of the recorded run with real hashes, for reviewers who cannot reach our server | S | Task |

Do not copy code or text from these repos. They are other students' and developers' work; use them only to see which ideas judges are likely to be shown.

## 6. Positioning lines that make ChainBrain stand out

Written to be true against what we read. Each needs the matching proof in the demo.

**v2 positioning (14 Oct):** our novelty is delegated spending with hard limits the user owns in a contract (pockets): "Give your AI a pocket, not your wallet." The owner opens a pocket, funds it, and sets the rules (seller allowlist, per-payment cap, ask-me-above threshold, expiry, revoke, return funds). The agent can be fooled and the pocket still refuses. Lines 2 to 6 below still fit v2 (line 6 with the narrow claim only). The seller trust layer is a finals roadmap item. Rivals are buyer-side too, so do not claim "nobody".

1. **(Old design, deferred to finals; use as finals roadmap line only.) "Every other wallet protects the buyer. ChainBrain also protects the seller."** In the three Topic F rivals, the checks sit on the paying side. None runs a verdict (serve, step up, refuse) before the merchant delivers.
2. **"A refusal is an instruction, not a dead end."** The agent reads a reason code, explains, and re-plans to a seller that fits the budget; the final payment has a hash. Leash's agent is told to stop after a block; we show the next successful hash seconds after the revert.
3. **(Superseded 19 Oct: we now use Mock e-HKD.)** **"Real money-shaped test dollars, not play tokens."** We pay with Circle's test USDC through the standard x402 flow, so any explorer or x402 tool recognises it. Leash and sucsage deploy their own mintable mock token.
4. **"Hit it yourself."** A judge types an attack, the agent can be fooled on purpose, and the contract reverts with a visible hash. (Leash has a "simulate compromised agent" switch, edxzh a dry-run page. Ours adds a seller-side attack and a live re-plan after it.)
5. **"One sentence, one question, one receipt."** Show the dialogue: owner says one sentence, agent asks one clarifying question, then pays. Count the turns on screen. This is the line the three Topic F repos do not speak to.
6. **"We checked the field."** One honest slide: Leash and sucsage (buyer-side limits), edxzh (ERC-1271 x402 wallet with reputation), Visa TAP, Skyfire, Kagi. Our claim is only the narrow, true one. Judges who know the repos will trust us more. **(15 Oct) Add:** xizo13 (MCP connector, FISCO BCOS), AgentVax (on-chain mandate, reader/planner split), KiteShield (policy engine and signer).
7. **(Superseded 19 Oct: FISCO + Mock e-HKD; YINGLONG also pays x402 on FISCO.)** **(15 Oct) "Real dollars, real shops, a public chain."** Of the Topic F entries we can see, only ChainBrain and edxzh pay real Circle test USDC to real x402 web endpoints on a public testnet. The others use a mock token, a private chain or a mock RPC, and edxzh has no AI conversation. True only once our live hashes exist.
8. **(15 Oct) "Your approved seller turned bad? Every pocket stops paying it."** Radar's fund-flow screening and alerts. The nearest rivals share attack signatures (AgentVax) or block a honeypot merchant (xizo13); nobody traces where a seller's money came from.
9. **(16 Oct) "The AI can stop your money, never move it."** The Sentinel freezes the pocket on chain when the agent behaves like it was fooled; only the owner can unfreeze. Show scene 10 and the freeze hash. Say AgentVax and Sathi share the one-way principle.
10. **(16 Oct) "Say it in one sentence. The proof is computed, not written."** Two AI readings, the stricter one wins, and the card shows the worst case in dollars. Pair it with line 5.

11. **(19 Oct) "Your AI can be fooled. ChainBrain protects you."** (README headline since `d8440fe`). Proof: the red-team report with "AI fooled" and "money lost" counted apart, a live-Claude subset, and reverted hashes on the hosted FISCO chain.
12. **(19 Oct) "One card per agent, set in one sentence, frozen in one tap."** The consumer answer to YINGLONG's enterprise mandate stack. Keep the pitch simple where theirs is heavy.

Avoid: "first", "nobody", "novel pocket", "ERC-1271 x402 is new", "only team with on-chain tiers". **(19 Oct) Also avoid:** "the only FISCO entry", "real USDC", "public chain" for our FISCO node (say "a FISCO node anyone can query"), "the only ERC-1271 x402 wallet". **(15 Oct) Also avoid:** "the only team with MCP", "the only FISCO BCOS entry", "AI can't move money outside policy" as a headline (everyone says it), "Elliptic clone", "multi-agent system", and "memory reduces hallucination".

## What this means for winning

- [must] Ship the evidence pack and the template-mirroring documents by Mon 19 Oct. Leash already has them; without them we lose on paper even with the better idea. Task 40 / Security 30
- [must] Pass the 14 Oct payment spike (done on a Base Sepolia fork; live run pending); edxzh shows the ERC-1271 x402 pattern works with real test USDC and the public x402.org facilitator ([its research notes](../../reference/repos/rivals/edxzh-agent-wallet/specs/001-agent-wallet-demo/research.md) are public). We should read how it dealt with nonce reservation and facilitator signature lag, then write our own. Task 40
- [must] Rewrite the novelty claim: drop the ERC-1271 x402 "narrow edge". (13 Oct text said keep only seller-side verdict plus re-plan; v2 says: keep user-owned pockets with hard limits plus the real-model re-plan, and treat the seller verdict as finals roadmap.) Innovation 30
- [must] Run 30+ attacks and 10 plain tasks with false-refusal rate, and publish a known-risk list. Security 30 / Task 40
- [should] Provide a judge-facing sandbox (own pocket per visitor, or a shared one with a reset) and a "type your own attack" box with a dry-run. Task 40 / Security 30
- [should] Add a scheduled daily run that produces fresh hashes and a static dashboard, plus a recorded replay page. Task 40 (protects against a demo failure)
- [should] Evaluate the agent on two or three models, with run counts, and show turns per task. Innovation 30
- [should] Test reachability from mainland China (video mirror, gateway, explorer links); no rival states it. Task 40
- [could] Provenance and look-alike check on payees; exact-amount re-typing on step-up. Security 30
- [could] FISCO BCOS dry run as the only unique bonus idea in the field. Bonus (v2: planned only, not built). **(15 Oct) No longer unique:** xizo13 and Signet already use FISCO.
- [could] Re-run this search on 19 Oct and again before the 22-23 Oct online review; read any new Topic F repo within an hour. All
- **(15 Oct) [must] Get the live Base Sepolia hashes before anything else.** "Real Circle test USDC to real x402 sellers on a public chain" is now our clearest edge over xizo13 (local FISCO), sucsage (private Besu), AgentVax (mock token) and KiteShield (mock RPC). It is only an edge once [evidence](../evidence.md) has real rows. Task 40
- **(15 Oct) [must] Publish attack numbers in the same shape as the rivals:** families × rewordings, hard violations, false refusals. Compare against AgentVax (30 × 2, 5 families) and Leash (30). Include a "memory" family, since AgentVax tests it and we now have memory. Security 30
- **(15 Oct) [should] Give judges a link they can click:** the web console on the built-in network, hosted, because sucsage and edxzh both have a live link. Task 40
- **(16 Oct) [must] Record one real-model run of the AI layers.** Jev / Claude for the Sentinel and Speak-your-rules has only run against fake responses so far. AgentVax is already criticised (above) for mock-model-only results; we must not be open to the same line. Innovation 30
- **(15 Oct) [should] Ask the organisers (O1) whether private-chain or local-chain hashes count.** If they don't, sucsage and xizo13 lose most of the 40%. If they do, our public-chain edge shrinks. Either way the answer changes the pitch. Task 40

- **(19 Oct) [must] Publish red-team numbers today.** Six rivals now do; we are the only serious entry with none. See [deep dive 0.6](competitor-deep-dive.md) item 1. Security 30
- **(19 Oct) [must] Add Pocket invariants and fuzz (tests only, no redeploy)** and a reverted-attack battery on the hosted chain. YINGLONG, Mandate Wallet, LEASH and Treasury all have invariants. Security 30, Task 40
- **(19 Oct) [must] Write a judge guide** with a "real vs simulated" table and a Chinese summary; make every shown hash resolve on the hosted chain. Two rivals' evidence fails a simple receipt check (Guardian Wallet, KendraFi); judges who check will reward ours. Task 40
- **(19 Oct) [must] Check the console from mainland China, or mirror it.** DuitDuit warns `vercel.app` is blocked there, and our console is on Vercel. Railway (`up.railway.app`) is untested too. A mirror on a reachable host, or a recorded replay page in the repo, protects the Task 40 demo. Task 40
- **(19 Oct) [should] Report dialogue efficiency and false refusals** (user turns per task, clarifying questions asked, ordinary tasks wrongly refused), the way FundBun does. Innovation 30
- **(19 Oct) [should] Record the video.** No Topic F rival has one yet. Interaction 30
- **(19 Oct) [could] Re-check YINGLONG, Mandate Wallet and Guardian (`ahammadshawki8`) on 20 Oct morning.** Mandate could deploy, and Guardian could push code after its 19 Oct freeze. All

## Open questions

- **(19 Oct)** Still unlabelled after 12 more commits (all bot snapshots). Is `edxzh/agent-wallet` a competition entry? Its README never says. If the author submits it to Topic F it is our closest rival; if not, it is still public proof against our novelty claim. [VERIFY]
- How many Topic F teams exist? Only three repos are visible; most teams do not publish. Unknown. **(15 Oct)** Now six labelled plus one lookalike are visible; the real number is still unknown.
- Do the rivals' hosted demos work from mainland China? Not tested; Vercel and Cloudflare reachability both [VERIFY].
- Does the sucsage author keep submission documents outside the repo (a Drive folder, as OneGate does)? Not visible.
- Will judges run the repos? Leash and edxzh invite it; if yes, a one-command evidence run matters more than the UI.
- Whether Leash's real-LLM path was tested is not stated; its video and tests rely on the scripted agent.
- **(15 Oct)** Has AgentVax published a live-model run or Base Sepolia hashes? `results/` holds only mock files; `evidence/hashes.json` was not readable through the API. [VERIFY]
- **(15 Oct)** How far does xizo13's shop check the agent (signed requests, authenticated callbacks)? If it is a full seller-side check, our finals "seller trust layer" is not unique either. [VERIFY]
- **(15 Oct)** Is the Mandate Wallet team (`Safius-Sifat`) still building? It was spec only on 14 Oct, with a target of 18 Oct. **(19 Oct) Yes:** contracts and 126 tests exist, but no agent and no deployment. One git author despite a "four-person" README.
- **(19 Oct)** Does a team-run FISCO chain count the same as WeBank's own network for the bonus? YINGLONG and ChainBrain both run their own node(s); xizo13 runs it locally. Worth asking the organisers with O1.
- **(19 Oct)** Are judges likely to open FISCO hashes? There is no public FISCO explorer: YINGLONG serves a decoder page, and we serve `/explorer` on Railway. Make sure ours is linked from every hash in the docs.

## Sources

- **(19 Oct)** GitHub search and README sweep (see section 1), clones listed in the [deep dive sources](competitor-deep-dive.md#sources), hash spot-checks on public RPCs (deep dive 0.4), and our own hosted chain re-checked (`eth_blockNumber`, five receipts, explorer and console HTTP 200).

- GitHub searches and API calls on 2026-10-12 and 2026-10-13 (`gh search repos`, `gh search code`, `gh api repos/.../readme`, `.../commits`, `.../contributors`).
- Local clones (data only, nothing run): `reference/repos/rivals/leash-finbase` (README, `docs/TECHNICAL.md`, `docs/SECURITY_SELF_ASSESSMENT.md`, `docs/EXECUTION_EVIDENCE.md`, `docs/SUBMISSION_CHECKLIST.md`), `reference/repos/rivals/sucsage-agentic-wallet` (README, contract test count), `reference/repos/rivals/edxzh-agent-wallet` (README, `contracts/src/PolicyWallet.sol` signature function, `specs/004-agent-hires-agent/spec.md`, test file list, `docs/articles/`), `reference/repos/rivals/onegate`, `.../finbuddy` (Sathi), `.../tuitionguard`, `.../tuition-fx-assistant`, `.../monara` (READMEs only).
- Repo pages (opened via API 2026-10-13): https://github.com/detinatran/finbase, https://github.com/sucsage/agentic-wallet, https://github.com/edxzh/agent-wallet, https://github.com/TarrushSaxena/OneGate, https://github.com/Tasrif-Ahmed-Mohsin/finbuddy, https://github.com/ngoc-oss/TuitionGuard-FinTechathon-2026, https://github.com/HelloVthree/AI-Cross-Border-Tuition-FX-Assistant, https://github.com/ZoeMohamed/Monara, https://github.com/harsh11067/vectis.
- **(15 Oct)** GitHub API, read only, nothing cloned or run:
  - [xizo13/webank](https://github.com/xizo13/webank): README, `docs/verification.md`, file list, commits.
  - [ttwrpz/agentvax](https://github.com/ttwrpz/agentvax): README, `GOAL.md`, `docs/spec/agentvax_paper_v4.md` (Topic F line), `results/summary.mock.json`.
  - [atulharshvardhan2006/KiteShield-Backend](https://github.com/atulharshvardhan2006/KiteShield-Backend): README.
  - [Safius-Sifat/Fintechathon](https://github.com/Safius-Sifat/Fintechathon): `PRD.md`, `pitch.md`.
  - [shads-01/KendraFi](https://github.com/shads-01/KendraFi): project overview.
  - [sucsage/agentic-wallet](https://github.com/sucsage/agentic-wallet): README, `EVIDENCE.md`, commits.
  - [edxzh/agent-wallet](https://github.com/edxzh/agent-wallet): commits, code search for fintechathon and webank (0 hits).
  - [detinatran/finbase](https://github.com/detinatran/finbase): commits.
  - Other-topic READMEs listed in section 2b.
- Earlier research: [competitors 12 Oct note](../../reference/prior-research/docs/competitors-2026.md), [prior art](prior-art-hackathons-github.md), [how judges score](../06-pitch/how-judges-score.md), [judge simulation](../06-pitch/judge-simulation.md), [recommended changes](../02-product/recommended-changes.md), [review log](../07-log/review-2026-10-13.md).
