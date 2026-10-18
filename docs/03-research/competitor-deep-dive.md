# Competitor deep dive: what to copy, what to fix, how to win
Last updated: 2026-10-19

> **What this is:** the code-level follow-up to [Topic F rivals](topic-f-rivals.md). On 15 Oct we cloned the eight visible Topic F repos into `reference/repos/competitors/` (gitignored, read only, nothing was built or run). Six parallel reviews read their contracts, agents, tests, evidence and docs. They compared each against ChainBrain's code on main. Every claim about our own code below was re-checked by hand in `contracts/src/Pocket.sol`, `server/src/wallet/*` and `shared/sim/memory.ts`. We use the rivals for ideas only. Do not copy their code or text.
>
> **19 Oct round:** we searched GitHub again, cloned **9 new Topic F repos** and fetched the 4 known rivals that had pushed. Five parallel read-only reviews covered them, plus about 45 other-topic entries. Section 0 below is the new picture. Sections 1 to 5 are the 15 Oct review: their rival findings still hold unless section 0 says otherwise. **Every line that relies on "real Circle test USDC on a public chain" is superseded,** because ChainBrain itself moved to FISCO BCOS + Mock e-HKD on 17-18 Oct.

## 0. (19 Oct) The field moved, and so did we

### 0.1 In one minute

- **Our own switch changed the comparison.** ChainBrain now runs on FISCO BCOS 3.16.4: one node, chain id 20200, Mock e-HKD. It is hosted on Railway with a public RPC, an explorer and a faucet.
  - Checked on 19 Oct:
    - the RPC answers;
    - the explorer and the console return 200;
    - all 5 hosted-chain hashes in `docs/evidence-fisco-railway.json` resolve (blocks 9-13; the chain head is block 15);
    - the 17 local-chain hashes pass our verifier.
  - Our old headline was "only we pay real Circle test USDC to real x402 sellers on a public chain". **It no longer applies.** Our money is now a mock token on a chain we run, which is the same class as sucsage, xizo13 and YINGLONG.
- **The field grew from about 8 to about 17 visible Topic F repos.**
  - 9 are new since 16 Oct: 8 with code, 1 spec only.
  - 4 known rivals pushed: sucsage, edxzh, Mandate Wallet and KendraFi.
  - Leash (finbase), xizo13, AgentVax and KiteShield have not pushed since 13-14 Oct.
- **One new entry is the strongest in the field: YINGLONG** (`ABRUBAB/YINGLONG`). Checked by hand:
  - It runs a **team-run FISCO BCOS 3.17.1 chain with 4 PBFT sealers plus an observer**, alongside Base Sepolia.
  - It pays x402 on FISCO and approves payments with a passkey through ERC-1271.
  - Its typed on-chain reverts are linked from a live app (`app.yinglong-agent.tech`, which has proof pages, a `/judge` walkthrough and a `/challenge` page).
  - It has about 396 Foundry tests with fuzz and halmos proofs, plus a 300-attack bench.

  **We are no longer the only serious FISCO entry, and on FISCO depth, hash count and test depth we are behind it.**
- **Six rivals now publish attack numbers. We publish none:**
  - YINGLONG 300;
  - BaKhi a 46-scenario eval;
  - AgentWallet (Turjo) 19 live-LLM cases × 4 runs;
  - LEASH (Brieuc) 16 attacks + 6 tasks;
  - sucsage 35 attack cases with a status;
  - AgentVax and the old Leash 30 each.

  This is now our single biggest gap.
- **What is still ours alone:** no other entry combines all of the following.
  - A **real Claude tool loop that re-plans from contract reason codes**: YINGLONG uses Qwen with a closed schema, Turjo GPT-4.1-mini without re-plan, LEASH a Codex CLI model, BaKhi GPT-4o-mini.
  - x402 paid from a **per-agent ERC-1271 card contract**.
  - A consumer phone app.
  - **AI layers that can only tighten.** Radar fund-flow screening is still unmatched. The Sentinel's freeze-only key has peers (YINGLONG's KillSwitch, LEASH's pause-only guardian), so it is not unique.
- **Nobody has a video yet** (YINGLONG, LEASH, Turjo and Guardian have scripts or placeholders only). That is an opening for us.
- **Plan for the last ~30 hours** (section 0.6), in order: published red-team numbers, Pocket invariants, a reverted-attack battery on the hosted chain, a judge guide, a check that judges in mainland China can reach the console, then the video.
- **Other topics (about 45 repos):** none enforces rules in a contract. The polish bar is rubric-mapped evidence (attack suites, false-refusal and turns-per-task numbers, judge modes). Bluefin (Topic C) also has real FISCO 3.17.1 hashes on a 4-node chain, but its RPC is not public. See topic-f-rivals section 2b.

### 0.2 Field ranking (Topic F, 19 Oct, by threat to ChainBrain)

Counts are from the rivals' own files, checked by `grep` where marked. "Spot-checked" means we fetched at least one hash from a public RPC on 19 Oct.

| # | Entry | Chain and money | On-chain rules | AI | Evidence | Security proof | Judge access | Threat |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **YINGLONG** [`ABRUBAB/YINGLONG`](https://github.com/ABRUBAB/YINGLONG) (new) | Team-run FISCO BCOS 3.17.1 (4 PBFT sealers + 1 "regulator" observer; `infra/fisco/chain-facts.json`) and Base Sepolia. Team-minted tHKD/tUSD, a coin-free rail | ERC-7710 delegation with **14 custom caveat enforcers** (budget, velocity, verified payee, reserve floor, veto time-lock, jurisdiction, suitability…), passkey co-sign via ERC-1271, Noir ZK private mandate | Qwen (DashScope) readers + planner split; payee is an enum, so the model cannot write an address. Rule-parser fallback. MCP (proposal only), A2A | ~24 headline hashes (`PROOF.md`), 191 distinct in `docs/EXECUTION_EVIDENCE.md`, typed reverts, Python verifier that decodes a mandate back to English. Live proof page **confirmed reachable** | ~396 Foundry tests (grep), halmos + stateful fuzz, **300-attack bench, 0/300 out-of-mandate**, but run on Anvil with the rule parser, not a live LLM; within-mandate manipulation got through 9/44 (their own figure). KR-01..19 | Live app: `/judge` 3-min walkthrough, `/challenge`, `/proof`. No video yet. English only | **HIGH** |
| 2 | **AgentWallet** [`Turjo101365/AgentWallet`](https://github.com/Turjo101365/AgentWallet) (new) | Ethereum Sepolia, ETH | Allowlist, per-tx and daily caps, pause; v2 checks the **owner's EIP-712 approval or a bounded task grant on chain** (maxRuns, maxTotal, expiry, revoke) | gpt-4.1-mini tool loop (≤8 calls), clarify tool, no re-plan | 23 Etherscan hashes over two contracts (**spot-checked real**), 26/26 public read-only checks incl. attack probes | 53 contract tests, ~241 backend; **live-LLM safety suite 19 cases × 4 runs**, all pass | Vercel + Render (invite code), deck PDF, storyboard | **HIGH** |
| 3 | **sucsage** (updated, 64 commits) | Private Besu (20261020), mock THB | Unchanged (caps, allowlist, expiry, pause) + escrow + new `ChainAnchor` Merkle root | 13 tools, **MCP server**, 3-5-model dispute panel | 52 hashes, still stamped 15 Oct; new features have none | ~93 `it()` (claims 101) + property tests; **35 attack cases with a Tested / Known gap / To write status** | Live app with sign-up | MEDIUM-HIGH |
| 4 | **BaKhi** [`thaicuong576/agent-wallet`](https://github.com/thaicuong576/agent-wallet) (new) | Base Sepolia, real Aave test tokens | **None**: custodial server key, off-chain policy | gpt-4o-mini reader/planner, autonomous runner | 10 hashes (**spot-checked real**), no revert | ~1,224 test functions (grep), **46-scenario replay eval, 100%, by category** | Render demo, full submission pack | MEDIUM (HIGH on paperwork) |
| 5 | **LEASH** [`Brieuclerouxtardif/leash`](https://github.com/Brieuclerouxtardif/leash) (new; **unrelated** to detinatran's Leash) | Ethereum Sepolia, mock tUSD/tETH | `LeashVault`: payee caps, per-tx/daily, lifetime budget, expiry, oracle floor, EIP-712 mandate, creditor-sealed invoices | Codex CLI model, JSON only, mostly recorded replays | **105 hashes, 15 mined refusals** (spot-checked real), a vault with a **published agent key** for anyone to try | 51 unit/fuzz + 9 invariants (grep), 16 attacks + 6 tasks | Local console only | MEDIUM |
| 6 | edxzh (12 bot commits only) | Base Sepolia, Circle USDC, x402 | ERC-1271 x402 | None | Snapshots every 6 h | Fuzz + invariants | `demo.yunshu.ai` | MEDIUM, still not labelled as an entry |
| 7 | **Treasury Agent** [`AsylkhanKali/fintechathon`](https://github.com/AsylkhanKali/fintechathon) (new) | Base Sepolia, own mocks | `Treasury.sol`: allowlist, per-payment and daily caps, approval queue, vault share cap, pause | No LLM agent (the LLM only explains) | 11 deploy/setup hashes only | 74 Foundry + 5 invariants | None | MEDIUM |
| 8 | **Mandate Wallet** (updated; was spec) | Base Sepolia planned, **not deployed** | `MandateWallet.sol`: owner permits, co-sign, freeze, **x402 via ERC-1271 + transferWithAuthorization**, close to our Pocket | None (MCP, policy and worker are `NotImplementedError` stubs) | None | **126 Foundry tests incl. 4 invariants** | None | MEDIUM-LOW. Watch for a last-minute deploy |
| 9 | xizo13, AgentVax, Leash (finbase) | Unchanged since 13-14 Oct | | | | | | MEDIUM (see sections 1-2) |
| 10 | **Guardian** [`ahammadshawki8/guardian`](https://github.com/ahammadshawki8/guardian) (new, spec only) | Base Sepolia planned | Planned: caps, locked reserve, cooling-off for new payees, delayed loosening with a trusted-contact co-sign | Planned adaptive attacker | None | Planned ~40-case suite reporting "AI fooled" vs "money lost" | None | MEDIUM only if it ships |
| — | Low: KiteShield, Aegis Wallet (`ado1d/aegis-wallet`, 2 commits on 18 Oct, Anvil only), `EngrIbadUllah/agent-wallet` (no contract, no hashes), Guardian Wallet (`siammds`, see 0.4), KendraFi (see 0.4) | | | | | | | LOW |

### 0.3 Head-to-head with the top four, from our side (19 Oct)

| Score area | YINGLONG | AgentWallet (Turjo) | sucsage | BaKhi | ChainBrain today | Read |
| --- | --- | --- | --- | --- | --- | --- |
| Task 40: hashes a judge can open | ~191, FISCO + Base, typed reverts, public decoder | 23 on Etherscan | 52 on private Besu with public RPC | 10 on Basescan | 17 local + **5 hosted**, 1 revert, public RPC + explorer | **Behind** YINGLONG, Turjo and sucsage on count; even on kind |
| Task 40: the agent really pays a seller | x402 on FISCO, team sellers | Plain transfers | Escrow deals | DeFi supply/swap | x402 to our own test sellers, owner co-sign above ask-me | Even with YINGLONG, ahead of the rest |
| Security 30: on-chain backstop | 14 enforcers + passkey + ZK | EIP-712 owner approval on chain | Caps, allowlist, pause | **None** | Per-card ERC-1271: allowlist, cap, ask-me co-sign, expiry, revoke, freeze-only guardian | Even with YINGLONG/Turjo, ahead of BaKhi |
| Security 30: published attack numbers | 300 (rule parser) | 19 × 4 live LLM | 35 cases with a status | 46 replayed | **None** | **Behind everyone** |
| Security 30: contract test depth | ~396 + fuzz + halmos | 53 | ~93 + property | n/a | 31 distinct test functions (55 runs: the 24 pocket cases run on both clocks), **no fuzz or invariants** | **Behind** |
| Innovation 30: dialogue (clarify, correct, fall back) | `input_required`, closed schema | Clarify tool | Chat, 13 tools | Planner + runner | **Claude asks one question, re-plans from the reason code, haggles**, Speak-your-rules | **Ahead** |
| Innovation 30: novelty | Passkey seal, ZK mandate, regulator node, two jurisdictions | RL gas timing | Groups, desktop, dispute panel | IPS for DeFi | Card per agent, Radar fund-flow screening, Sentinel, Pre-flight | Even with YINGLONG on novelty; ahead on consumer clarity |
| FISCO bonus | 4-sealer PBFT chain they run, same bytecode on Base | None | None | None | 1-node chain on Railway, public RPC, explorer, faucet | **Behind YINGLONG**, ahead of the rest |
| Judge can click and try | `/judge`, `/challenge` | Invite-code sandbox | Live app | Render demo | Vercel console with red-team box | Even; YINGLONG's guided walkthrough is better |

### 0.4 Evidence we checked ourselves on 19 Oct

We fetched receipts from public RPCs. `publicnode` prunes old Sepolia receipts, so a "not found" there was re-checked on `drpc`.

| Rival | What we checked | Result |
| --- | --- | --- |
| YINGLONG | Live app and one FISCO proof page; `infra/fisco/chain-facts.json` | App 200, proof page renders; chain facts list 4 sealers + 1 observer on 3.17.1 |
| LEASH (Brieuc) | Attacks A2 and A8 in `docs/evidence-sepolia.md` | Both mined and reverted (status 0) as claimed |
| AgentWallet (Turjo) | Tx 6 and the live payment | Both mined, success |
| BaKhi | Two Basescan links | Both mined, success |
| Guardian Wallet (`siammds`) | `services/api/app/transaction_service.py` ~l.234 | **Every approved payment is given one of 8 hard-coded Sepolia hashes**, chosen by a hash of the proposal id; nothing is signed or sent on that path. The hashes exist on Sepolia, but they were not produced by the payments they are shown for. A judge who opens them will see a mismatch |
| KendraFi | 9 hash-like values in its evidence docs | 1 found on Base Sepolia; the others not found as transactions, and one (`0x89ab12cd34ef5678…`) is an obvious placeholder pattern. Its "FISCO" is a compatibility claim only; nothing is deployed there |

Lesson for us: judges or rivals may do exactly this check. Every hash we show must resolve on the hosted chain, and our verifier's negative checks are worth a line in the judge guide.

### 0.5 Our own weaknesses: status on 19 Oct

None of W1-W6 from section 3 has been fixed: there are no commits to `scan.ts`, `tools.ts`, `memory.ts`, `loop.ts` or `Pocket.sol` since 15 Oct, except the FISCO switch. Specifically:
- seller `description` still reaches the model outside the wrapper (`tools.ts` l.74, l.107);
- `ask_owner` still shows the agent's `reason` (l.169);
- memory is still appended to `system` (`loop.ts` l.27-29), and `LOOSEN` still runs on raw text;
- the wrapper has no NFKC or `Cf` normalisation;
- there are no fuzz or invariant tests.

Several rivals now publish exactly these defences (YINGLONG's closed-schema planner, BaKhi's reader/planner split, LEASH's invariants), so the gap is more visible than on 15 Oct.

### 0.6 Plan for the last ~30 hours (deadline 20 Oct 24:00), ranked by score per hour

| # | Do | Why now (who sets the bar) | Score | Effort |
| --- | --- | --- | --- | --- |
| 1 | **Red-team numbers.** Run the attack arena's cases plus a fixed catalogue (induced transfer, extraction, escalation, injection, memory) on the built-in network with the scripted model. Then run a **live-Claude subset** (for example 10 attacks × 3 runs) and 10 ordinary tasks. Publish `docs/redteam-report.md`: per family, **"AI fooled" and "money lost" as separate numbers** (Guardian's split), false refusals, a "stopped by" histogram, mode, model, commit. Do not claim more than was run | Six rivals publish numbers. YINGLONG's 300 used a rule parser, so a **measured live-model row is something nobody else has** | Security 30 | M |
| 2 | **Pocket invariants and fuzz** in Foundry, tests only, so no redeploy: the agent key never pays a non-allowed seller, above the cap, after revoke or expiry, or while frozen; the guardian cannot unfreeze; nothing the agent signs changes rules; malformed signature bytes. Quote the run counts | YINGLONG ~396, Mandate 126 incl. 4 invariants, LEASH 9 invariants, Treasury 5 | Security 30 | S-M |
| 3 | **Reverted-attack battery on the hosted chain.** From the agent key, straight to the token: not allowed, over cap, above ask-me without the owner, after revoke, frozen, expired, permit digest. Record `canPay` at each block so each revert has a reason code. This takes the hosted evidence from 5 to about 20 hashes | LEASH's 15 mined refusals, YINGLONG's typed reverts | Task 40, Security 30 | S-M |
| 4 | **Judge guide** (one page): a "what is real, what is simulated" table (Mock e-HKD, our own x402 sellers, the built-in network), the hosted RPC/explorer/faucet links, a 3-minute click path on the console, one copy-paste `eth_call` to read a card's rules, and a Chinese summary. Add a "For reviewers" table to the README | YINGLONG `docs/JUDGES_GUIDE.md`, AgentWallet "not claimed" list | All | S |
| 5 | **Video** via auto-play: the agent is fooled, the card refuses with a hosted-chain hash, Claude re-plans and pays, and the scorecard shows "N attacks, HK$0 lost" | No rival has a video yet | Interaction 30 | M |
| 5b | **Mainland-China reachability:** test the Vercel console and the Railway endpoints from China, or put a mirror or a recorded replay page somewhere reachable. DuitDuit (Topic E) warns that `vercel.app` is blocked there, and the judges are at WeBank in Shenzhen | DuitDuit README | Task 40 | S |
| 5c | Add **dialogue numbers** to the report from item 1: user turns per task, clarifying questions asked, false refusals on ordinary tasks | FundBun (0/26 false refusals, 1.35 turns per task) | Interaction 30 | S |
| 6 | **Public challenge card** (if time): a hosted-chain card whose agent key is published, funded from the faucet, plus a "straight to the chain" raw-tx button beside the red-team box | LEASH public-key vault, YINGLONG `/challenge` | Security 30 | S |
| 7 | Cheap W1/W4 fixes (wrap seller `description`; template the approval text and label the agent's sentence) only if 1-5 are done; each is a few lines, but each change needs the scene tests re-run | Section 3 | Security 30 | S |

**Not now:** MCP, ZK, a multi-node FISCO chain, more AI features. Each is a finals item. Adding scope now only widens the gap between what we claim and what we can prove.

### 0.7 Positioning after the switch

- **Drop:** "Real dollars, real shops, a public chain" (section 5 and topic-f-rivals line 7), "only FISCO entry", "only one with typed refusals".
- **Keep the new headline from `d8440fe`:** "Your AI can be fooled. ChainBrain protects you." Back it with numbers (item 1) and hosted-chain reverts (item 3), not adjectives.
- **Against YINGLONG, be the consumer one.** It is a 46-contract, five-rail, ZK enterprise system. We are "one card per agent, set in one sentence, frozen in one tap". Say what they don't measure: a **live model** being fooled and recovering (their bench used a rule parser), and **fund-flow screening** of sellers (Radar).
- **On FISCO, say exactly what we run:** a FISCO BCOS 3.16.4 node anyone can query, with an explorer and a faucet. Do not claim consortium depth we don't have. A 4-node chain is a finals item.
- **One respectful field slide:** YINGLONG (mandates + ZK on FISCO), AgentWallet (owner approvals on chain), LEASH (bounded worst case), sucsage (live app), BaKhi (eval rigour), and ChainBrain (live Claude + card contracts + AI that only tightens).

## In one minute

- **Nobody in Topic F has everything, and we are the only entry that could.** Each rival is strong in one column:
  - **Evidence:** edxzh has about 270 payments and 140 on-chain refusals, refreshed every 6 h. Leash has a generated hash table.
  - **Judge access:** sucsage has a live app and a public read RPC.
  - **Eval rigour:** AgentVax has 30 attacks × 2 rewordings, a state-diff oracle and a paper.
  - **Agent plumbing:** xizo13 has an MCP connector, signed requests and FISCO BCOS.
- **Every rival has a hole we already cover:**

  | Rival | Its hole |
  | --- | --- |
  | Leash | Mock token, scripted agent, no x402, no expiry or revoke, `redteam:llm` script missing |
  | sucsage | Private home-PC chain, one shared owner key for all users, mock money |
  | edxzh | No LLM at all, not labelled as an entry |
  | xizo13 | Simulated money, local chain, approval path is a stub |
  | AgentVax | Mock-only results, 0.55 safe autonomy, no tool loop |
  | KiteShield | No contract, mock RPC hashes by default |
  | Mandate Wallet | Spec only |

- **Our unique combination, if proven** (15 Oct; **first item superseded 19 Oct**: we now run FISCO + Mock e-HKD, see section 0):
  - real Circle test USDC paid to real x402 sellers on a public chain;
  - a real Claude tool loop that clarifies and re-plans from reason codes;
  - per-agent ERC-1271 pockets with owner co-sign, expiry, revoke and freeze;
  - Radar fund-flow screening;
  - a phone app, a judges' console and an offline built-in network.
- **Our gaps are all packaging and proof:**
  - zero live hashes;
  - no attack-suite numbers;
  - no hosted link;
  - no video;
  - no fuzz or invariant tests.
- **The comparison also found six real weaknesses in our own code.** None breaks the contract's guarantee, but judges or rivals could find them. All are cheap to fix (section 3). **Make any contract change before the first live deploy:** nothing is deployed yet, so it is free now and a redeploy later.
- **Plan:** sections 4 and 5. The P0 list is evidence, the attack suite, the reviewer docs, a hosted link and the video. That is the difference between "best product" and "best score".

## 1. What each rival does best (the ideas worth taking)

| Rival (folder in `reference/repos/competitors/`) | Best idea | Where to look |
| --- | --- | --- |
| **Leash** (`leash-finbase`) | `npm run evidence` writes a table of scenario, expected, result and tx link, including **reverted bypass attempts with typed errors**. A red-team report runs one command, exits non-zero on any miss, and reports 30 attacks plus 6 benign controls with 0 false positives. A "simulate compromised agent" toggle. Per-check pass/warn/fail shown to the user. Provenance: a payee that appears only in untrusted text is blocked or escalated | `app/scripts/evidence.ts`, `docs/EXECUTION_EVIDENCE.md`, `app/redteam/run.ts`, `scenarios.ts`, `app/src/lib/policy/provenance.ts`, `docs/SECURITY_SELF_ASSESSMENT.md` (KR-1..KR-11) |
| **sucsage** (`sucsage-agentic-wallet`) | README opens with a **"For reviewers" table**: live app, explorer, read RPC, evidence, technical, security, and a copy-paste `cast receipt` line. EVIDENCE.md is regenerated from chain logs and grouped by what each hash proves. Server-enforced clarification: a tool returns `NEED_INFO (nothing saved)`. **Address redaction** in model output, streaming-aware. A "raw attack" button signs a real bad transfer from the agent key | `README.md`, `web/scripts/evidence.mts`, `web/src/lib/agent.ts` (`missingInfo`, `redactAddresses`), `web/src/lib/actions.ts` (`rawAttack`), `SECURITY.md` (R1..R11) |
| **edxzh** (`edxzh-agent-wallet`) | **A CI agent run on cron** (every 6 h) commits `history.json`, and a static dashboard is rebuilt from it. A gas-runway check opens an issue when funds run low. A **"try to overspend" page** uses `eth_simulateV1` in the browser, with no key. One reason-coded refusal event per rule, fuzzed 1,000 runs each, plus invariants. Facilitator fixes: wait 3 confirmations, resend on a bare 402, read at the receipt block. Chinese summary under each README section | `.github/workflows/agent-run.yml`, `scripts/snapshot.ts`, `scripts/lib/gas.ts`, `apps/dashboard/src/lib/simulate.ts`, `contracts/test/Refusals.fuzz.t.sol`, `Invariants.t.sol`, `packages/agent/src/pay.ts`, `specs/001-agent-wallet-demo/research.md` |
| **xizo13** (`xizo13-webank`) | MCP connector: device-code pairing with a **6-digit number match**, ES256 signed requests with nonce and 60 s expiry, 15-min scoped tokens with rotating refresh, and a mandate bound to the agent key. The Guardian LLM is **strictest-wins and fail-closed** (`step_up` on timeout, refusal or invalid output). Its prompt splits locked intent, verified facts and quoted untrusted data. A **settlement re-check** just before paying. Denials are anchored on chain. An honest verification doc that says what each test does not prove. FISCO quirks solved | `agents/connector-mcp/src/*`, `services/gateway/src/app.ts`, `agent-auth.ts`, `decision.ts` (`strictest`), `services/guardian/src/index.ts`, `onchain/src/AuditAnchor.sol`, `docs/verification.md`, `spike-fisco/REPORT.md`, `packages/chain/src/errors.ts` |
| **AgentVax** (`agentvax`) | A **quarantined reader** model (no tools, typed output only) feeds a planner that never sees untrusted text, proven by a canary test. The **attack-suite oracle** diffs on-chain state against the case's allowed transitions on an Anvil snapshot, and model self-report is ignored. Results are labelled `mock`/`live` with suite hash and commit. Owner messages are templates only. **Time-locked loosening** (tighten is instant, loosen waits). 10 invariants mapped to tests, 21 known risks, and a decisions log that includes its failures | `agent/agentvax/reader.py`, `planner.py`, `validator.py`, `pressure.py`, `eval/judge.py`, `ledger.py`, `suites/attacks.json`, `vaxlab/rewording.py`, `api/static/strings.json`, `contracts/src/wallet/MandateControl.sol`, `docs/SECURITY_SELF_ASSESSMENT.md`, `RESULTS.md`, `DECISIONS.md` |
| **KiteShield** (`kiteshield`) | **Numbered security invariants SI-1..SI-12**, each mapped to a test file. A transaction-bound single-use token. An audit hash chain with an integrity endpoint. A blunt "mock transactions are NOT on-chain" warning | `docs/SECURITY.md`, `backend/tests/security/*`, `backend/app/services/audit.py`, `docs/API_CONTRACT.md` |
| **Mandate Wallet** (`mandate-wallet`, spec only) | A **portable task receipt plus a standalone verifier** that recomputes everything from chain data. The demo tampers a copy and the verifier fails. Separate verdicts for authority, policy, settlement, delivery and completion, so "paid but undelivered" is a first-class state | `architecture.md` (~l.358-390), `pitch.md` §4, §6 |
| **KendraFi** (`kendrafi`, Topic E) | WeBank framing: Weiyedai, FATE, FISCO BCOS, WeTechnology, bilingual badges. **Do not copy its numbers**: they are unattributed | `KendraFi_PROJECT-OVERVIEW-AND-SYSTEM-ARCHITECTURE.md` §1.2 |

## 2. Where each rival is weak (verified in their code or docs)

| Rival | Weaknesses a judge could find |
| --- | --- |
| Leash | Self-minted mock USDC (its KR-11). Default agent is a regex script; `redteam:llm` points to a missing file, so attack numbers are engine-only. Owner key on the server with no auth on the owner API (KR-1). No x402, expiry, revoke or co-sign threshold. Live txs from one day. No hosted link |
| sucsage | Single-validator Besu chain on a home PC behind Tailscale (its R4). **One global owner key and one agent key for every sandbox wallet.** Owner `execute` is unrestricted. A hostile document can make the agent pause the wallet. 6-regex advisory scanner. Mock bank tokens. Docs disagree (65 vs 66 tests, stale tool list) |
| edxzh | No LLM: no injection, extraction or escalation story. Reservations stay payable after `pause`. Reputation is a closed loop (the author's own scouts rate the author's services). The security review was written by the same AI that wrote the contract |
| xizo13 | Approval is a stub outside the demo (`demoProofAvailable` false, so 503). Local FISCO hashes nobody can resolve. Simulated eCNY. A single gateway key calls `pay()` (centralised). In-memory state. Guardian tested only with a mock transport. **The shop never verifies the agent or owner** (the payment request has no payer field) |
| AgentVax | Results are mock only: 22/40 tasks, safe autonomy 0.55 (target 0.80), reworded-attack match 0.317 (target 0.90). No deployments or evidence. A single-shot pipeline: no tool loop, no seller discovery, no x402. UI never opened in a browser |
| KiteShield | No contract; enforcement is a same-process signer with a symmetric key. Default is mock RPC with SHA-256 fake hashes. Only 2 prompt-injection tests. Its invariant numbering differs between its two docs |
| Mandate Wallet | Nothing implemented; target 18 Oct. Threat: low to medium, and only if it ships its verifier |

## 3. Weaknesses in OUR code that the comparison exposed (checked by hand, 15 Oct)

None of these lets money leave a pocket outside its rules: the contract still decides. They are soft-layer or evidence gaps that a security reviewer or a rival could point at.

| # | Finding | Where | Risk | Fix | Effort |
| --- | --- | --- | --- | --- | --- |
| W1 | **Seller-controlled strings reach the model outside `<untrusted_content>`:** the quote's `description` (from the seller's 402 response), directory item descriptions, and the settlement `detail` (up to 200 chars) | `server/src/wallet/tools.ts` l.73, l.106, l.175 | Prompt injection through a field the prompt calls "data" only inside the wrapper | Wrap them, or reduce them to typed fields (sku, price, an allowed/not flag). Strip `detail` to a reason code | S |
| W2 | **The wrapper's tag filter is exact-match only.** `</ untrusted_content>`, zero-width characters or full-width brackets survive | `server/src/wallet/scan.ts` `wrapUntrusted` | A forged closing tag the model may honour | NFKC-normalise, strip Unicode `Cf` characters, collapse whitespace, then filter any `untrusted` tag-like token. Add a test per variant | S |
| W3 | **`scanRequests` only reads JSON key names.** A request for personal data or a signature written in prose or markdown is not detected (the code comment says so) | `server/src/wallet/scan.ts` | Extraction attempts in prose are not flagged to the owner (the agent still has no personal data to give) | Add a prose scanner (phrase list, EN + ZH) and AgentVax-style pressure flags (urgency, secrecy, override, encoded) | S |
| W4 | **`ask_owner` shows an agent-written `reason` to the owner** | `tools.ts` l.116-134 | An injected agent can phrase a persuasive approval request (phishing through our own UI) | Build the approval text from a template (seller, item, price, which rule asks). Show the agent's sentence only as a separate, labelled "Agent's note". The Neo-Kinetic redesign already plans this | S |
| W5 | **Brain memory's LOOSEN guard is bypassable and its output sits in the system prompt.** The regex runs on raw text (double spaces, newlines, NBSP, homoglyphs and Chinese all pass). Paraphrases are missing ("pre-approved", "preferred vendor", "stop checking with me", "不用再问我"). Split attacks across two items. `effect` defaults to unset | `shared/sim/memory.ts` (`LOOSEN`, `consolidate`), `server/src/agent/loop.ts` (memory appended to `system`) | Poisoned notes nudging the agent toward riskier choices. The pocket still bounds any loss | Normalise before testing, add EN + ZH phrases, reject items containing addresses or amounts, require `effect`, and move memory from `system` to a user-turn "notes" block. Add a memory family to the attack suite | S-M |
| W6 | **Pocket test depth:** one fork file, no fuzz, no invariants. Garbage `signature` bytes make `abi.decode` revert instead of returning `INVALID`. `validBefore` is unbounded, so the agent can pre-sign far-future authorisations; they still re-check every rule at settlement, so this is low risk | `contracts/src/Pocket.sol`, `contracts/test/Pocket.fork.t.sol` | Judges compare test depth (edxzh about 96 functions with fuzz and invariants; AgentVax invariant suite) | Before the live deploy: add per-rule fuzz, an invariant ("the agent key can never pay a non-allowed seller, above the cap, or while revoked, frozen or expired"), a malformed-signature test (wrap the decode with try/catch via an external self-call, or check the length first), and optionally `validBefore <= block.timestamp + MAX_WINDOW` | S-M |

**Not a bug, but say it clearly:** there is no daily or cumulative limit. `isValidSignature` is a view, so it cannot count spending; the pocket's balance is the budget. A stolen agent key can therefore spend the whole balance in cap-sized payments to allowed sellers. That is exactly the "worst case = the pocket" claim, and the [self-assessment](../security-self-assessment.md) §3 already says it. Keep pockets small; that is the product.

**Evidence nuance found on the way:** when the pocket refuses, USDC reverts with its own generic "invalid signature" error, not our reason code. Rivals with stateful contracts show typed errors (`RecipientNotAllowed`). **Fix:** for each reverted hash, the evidence script also records `canPay(to, value)` called at that block. The table then reads "reverted, because `SELLER_NOT_ALLOWED`", and judges can re-run the call themselves.

## 4. Improvement plan to 20 Oct (ranked by score per hour)

> **(19 Oct)** Items 1-2 are partly done on FISCO (17 local + 5 hosted hashes, a verifier with negative checks; no contract hardening). Items 3, 5 (the "try to break it" part) and 6 are still open, and W1-W6 are unfixed. Section 0.6 replaces this list for the last 30 hours.

**P0: without these we lose on paper.**

| # | Do | Learned from | Score | Effort |
| --- | --- | --- | --- | --- |
| 1 | **Contract hardening, then the live deploy** (W6 fixes, then deploy the factory, fund it, `pnpm spike`). Contract changes must come first, because a redeploy later costs the evidence | edxzh tests, AgentVax invariants | Task 40, Security 30 | S-M |
| 2 | **Evidence script** (`pnpm evidence`). It runs scenes 1-9 live and also signs a **bypass battery** straight to USDC from the agent key: not allowed, over cap, above ask-me without the owner, after revoke, frozen, expired, permit digest. It writes `docs/evidence.md` from chain logs, grouped by claim, with each revert paired with `canPay` at that block. Generalise `server/scripts/force-transfer.ts` | Leash `evidence.ts`, sucsage `evidence.mts`, xizo13 `verification.md` | Task 40, Security 30 | M |
| 3 | **Attack suite with an oracle, and published numbers** (`pnpm redteam`). JSON cases in five families (induced transfer, data extraction, privilege escalation, prompt injection, memory) plus benign controls and an ambiguous set. Each case: base text, a fixed paraphrase, a model-reworded version, and mutators (ZH translation, homoglyph/zero-width, base64, HTML comment). The oracle replays the bus and tool trace against the case's `allowed` list; model self-report is ignored. Run all cases on the built-in network, then a live subset with the real model. Publish `docs/redteam-report.md`: unauthorised tx 0/N with a 95% upper bound, attack success per family, a **"stopped by" histogram** (model, intent check, Radar, Sentinel, contract), benign success, false-refusal rate, clarification precision, and steps and owner prompts per task. Header: mode (sim/live), model id, commit, suite hash. Exit non-zero on any violation | AgentVax `eval/judge.py`, `suites/attacks.json`, `RESULTS.md`; Leash `redteam/run.ts` | Security 30, Interaction 30 | M-L |
| 4 | **Reviewer pack** (borrow the structure, not the text): a README "For reviewers" table (hosted link, evidence, technical, security, video, one copy-paste `cast call` to check a pocket's rules). A security self-assessment with **numbered invariants CB-1..CB-12 mapped to tests and hashes**, a known-risk table (KR-n: severity, mitigation, residual risk), and a "what each test does not prove" limits section. A decisions log that records failures too | sucsage README, KiteShield SI list, AgentVax SECURITY/DECISIONS, xizo13 verification, Leash KR list | All | S-M |
| 5 | **Hosted judge link:** the web console on the built-in network (always works), plus a **"try to break it" page** that calls `canPay` (a free view) on the live pocket for preset attacks, so judges get a live, key-less contract answer | edxzh `simulate.ts`, sucsage live app | Task 40, Security 30 | S-M |
| 6 | **Video** (narrated, about 4-5 min, scripted to the second). It can be recorded through our own auto-play. One story: the agent is tricked, the contract refuses with a public hash, the agent re-plans and pays honestly, and the scorecard shows "N attacks, US$0 lost" | Leash `DEMO_VIDEO_SCRIPT.md`, `record-demo.ts`; AgentVax `DEMO_SCRIPT.md` | Interaction 30 | M |

**P1: cheap hardening and interaction wins (S each; do alongside P0).**

| # | Do | Learned from | Score |
| --- | --- | --- | --- |
| 7 | Fix W1-W4: wrap or type every seller string, harden the wrapper, add a prose and pressure scanner, use a template for approval text | AgentVax reader/`pressure.py`/`strings.json`, xizo13 Guardian prompt split | Security |
| 8 | Fix W5: memory normalisation, ZH phrases, no addresses or amounts, memory out of the system role, a memory attack family | AgentVax `memory.py`, `atk.memory.*` | Security |
| 9 | **Server-enforced clarification:** `draft_intent` returns `NEED_INFO` with the missing fields (budget scope, deadline, item) instead of relying on the prompt. Measure "asked exactly one question when ambiguous, none when clear" | sucsage `missingInfo` | Interaction |
| 10 | **Address redaction** in agent replies and the trace stream (the model sees seller names, never pocket or seller addresses). Add an extraction test | sucsage `redactAddresses` | Security (extraction) |
| 11 | **Strictest-wins, fail-closed** wording and tests for Radar and Sentinel: a timeout, refusal or invalid output becomes "ask the owner" (Radar today fails open to the pocket's rules), and a "pass" can never loosen a refusal | xizo13 `strictest()`, Guardian | Security |
| 12 | **x402 reliability:** resend the same signed payment on a bare 402 (safe, because the EIP-3009 nonce settles once), and read balances at the receipt's block | edxzh `pay.ts`, `research.md` R2/R7 | Task |
| 13 | **Fresh hashes on a schedule** until review: a GitHub Action every 2-3 h runs two scenes on a small pocket, appends to the evidence file, and runs a gas-runway check that opens an issue when funds run low | edxzh `agent-run.yml`, `gas.ts` | Task |
| 14 | **Chinese summary** under each README section and in the reviewer table (judges are at WeBank, Shenzhen) | edxzh README | Innovation |
| 15 | **Portable receipt plus a one-file verifier:** export a task's receipt JSON; `verify.html` or a Node script rechecks every hash, amount and seller against Base Sepolia and the pocket's rules, and a tampered copy fails on camera | Mandate Wallet `architecture.md` | Security, Innovation |

**P2: finals (22 Nov), or only if P0 and P1 are done.**

| Do | Learned from | Note |
| --- | --- | --- |
| Quarantined reader model: a Haiku call with no tools returns typed flags; the buying agent never sees seller free text | AgentVax `reader.py` + canary test | The strongest injection story in the field; about 1 day |
| Time-locked loosening in the Pocket (adding a seller, raising the cap or extending expiry waits; tightening, freezing and revoking are instant) | AgentVax `MandateControl.sol` | Strong privilege-escalation answer, but changes the owner UX. Decide before any redeploy |
| BYO-agent MCP server: device-code pairing with a number match, signed requests, scoped tokens, and no tool that edits rules | xizo13 `connector-mcp`, `agent-auth.ts` | Not novel any more; do it well rather than first |
| **Seller trust layer:** the seller verifies the paying agent's pocket and owner (ERC-1271 check or a signed payer attestation in the x402 request) | Gap in **every** rival, confirmed in xizo13's payreq schema | Our best remaining novelty claim for the finals |
| Pocket on FISCO BCOS: 1-2 days per xizo13's spike (solc ≤0.8.11, `london`, viem `defineChain` 20200, a revert-decoder shim, millisecond timestamps). Keep Base Sepolia as the verifiable source | xizo13 `spike-fisco/REPORT.md`, `scripts/chain/manage.py` | A bonus point, no longer unique |
| Licence ladder (learner, provisional, full autonomy earned by clean purchases) | xizo13 `decision.ts` | A nice interaction story |
| Anchor refusals and an audit-chain head on chain | xizo13 `AuditAnchor.sol`, edxzh `PaymentRefused` | Fixes "refusals leave no public record" |

## 5. Positioning after the deep dive

- **(Superseded 19 Oct, see 0.7.)** **Lead with what only we have, once proven:** "Real dollars, real shops, a public chain, a real AI that recovers." No rival has all four (see section 2).
- **Lead the security story with numbers, not adjectives.** Every rival says "the model proposes, the contract enforces". Ours should be a scorecard row ("N attacks across 5 families, 0 unauthorised payments, stopped by: …") with live hashes for the bypass reverts.
- **Name the rivals' approach respectfully on one slide.** Their weaknesses (mock tokens, private chains, scripted agents) speak for themselves; don't attack them.
- **Finals story:** "Every wallet protects the buyer; ChainBrain lets the seller trust the buyer too." This is the seller trust layer, and no visible rival has it.

## Sources

- Clones in `reference/repos/competitors/` (15 Oct, `--depth 1`, hooks disabled, nothing run):

  | Folder | Commit |
  | --- | --- |
  | `leash-finbase` | `8a58579` |
  | `sucsage-agentic-wallet` | `8bd8bf8` |
  | `edxzh-agent-wallet` | `abfa2e8` |
  | `xizo13-webank` | `b4d9ff4` |
  | `agentvax` | `a8e8143` |
  | `kiteshield` | `04489dc` |
  | `mandate-wallet` | `2b96ffb` |
  | `kendrafi` | `ba20205` |

- Our code checked against the findings: `contracts/src/Pocket.sol`, `contracts/test/Pocket.fork.t.sol`, `server/src/wallet/tools.ts`, `server/src/wallet/scan.ts`, `server/scripts/force-transfer.ts`, `server/src/agent/loop.ts`, `shared/sim/memory.ts`, `docs/security-self-assessment.md`, `docs/evidence.md` (9 rows pending on 15 Oct).
- Rival counts (tests, attacks, payments) are taken from their own docs and data files and were not re-run. edxzh counts come from `apps/dashboard/src/data/history.json` at the cloned commit.
- **(19 Oct)** New clones in `reference/repos/competitors/` (`--depth 1`, hooks off, nothing run), and fetched updates for known rivals (read with `git show`/`git diff`, working trees left at the old commit):

  | Folder | Repo | Commit |
  | --- | --- | --- |
  | `yinglong` | ABRUBAB/YINGLONG | `6d1f17b` |
  | `leash2-brieuc` | Brieuclerouxtardif/leash | `22a1fb3` |
  | `agentwallet-turjo` | Turjo101365/AgentWallet | `cd078f7` |
  | `bakhi-wallet` | thaicuong576/agent-wallet | `0afadd5` |
  | `treasury-agent-asylkhan` | AsylkhanKali/fintechathon | `c0e26aa` |
  | `aegis-wallet` | ado1d/aegis-wallet | `5c0c83c` |
  | `guardian-wallet-siammds` | siammds/Guardian_Wallet | `1b6ad21` |
  | `engribadullah-agent-wallet` | EngrIbadUllah/agent-wallet | `3b928fc` |
  | `guardian-ahammad` | ahammadshawki8/guardian (spec) | `6bc4c71` |
  | `duitduit` | tanhongsheng050204-code/2026-SHENZHEN-FINTECHATHON-INTERNATIONAL-TRACK (Topic E) | `f68dea0` |
  | `sucsage-agentic-wallet` (fetched) | sucsage/agentic-wallet | `8bd8bf8` → `2c07a64` |
  | `edxzh-agent-wallet` (fetched) | edxzh/agent-wallet | `abfa2e8` → `8d300ea` |
  | `mandate-wallet` (fetched) | Safius-Sifat/Fintechathon | `2b96ffb` → `f55299e` |
  | `kendrafi` (fetched) | shads-01/KendraFi | `ba20205` → `adb2927` |

- **(19 Oct)** Hash spot-checks: `eth_getTransactionReceipt` against `sepolia.drpc.org`, `ethereum-sepolia-rpc.publicnode.com` (prunes old receipts), `sepolia.base.org` and `base-sepolia.drpc.org`; our own hosted chain at `fisco-node-production.up.railway.app`. Rival test counts are `grep` counts of test functions, not test runs.
