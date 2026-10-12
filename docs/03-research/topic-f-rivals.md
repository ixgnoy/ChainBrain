# Topic F rivals: who else is entering, and how ChainBrain beats them
Last updated: 2026-10-13

## In one minute

- **Two public repos say they are 2026 Topic F entries:** Leash (`detinatran/finbase`) and `sucsage/agentic-wallet`. Both read as serious. Leash is the stronger package; sucsage has the nicer "try it yourself" sandbox.
- **New finding, and an important one:** `edxzh/agent-wallet` (a solo developer, "Yunshu AI") is NOT labelled as a FinTechathon entry, but it is the closest technical twin of ChainBrain that we have found. It already does what our earlier doc called a possible "narrow novelty": a contract wallet whose ERC-1271 check approves the standard x402 USDC payment only after the rules pass, plus ERC-8004 reputation checked inside the payment, a live public dashboard, a "try to overspend" page, and an agent-hires-agent escrow. Whether it is a competition entry is [VERIFY]. Judges can find it either way.
- **The rest of the field is not Topic F.** Fresh repos found today are Topic C (Sathi, TuitionGuard, a tuition-FX assistant), Topic E (OneGate) and A or unstated (Monara). They set the polish bar judges see across topics, not our direct score rival.
- **What rivals lack (read from their code, not guessed):** no seller-side check on who the buyer is, no real clarification or re-planning dialogue, test-token money (Leash and sucsage deploy their own mock USDC), and in Leash the default "AI" is a script. ChainBrain's seller verdict, reason-code re-plan loop and real Circle test USDC are real gaps to exploit.
- **What rivals have that we do not (yet):** a finished evidence pack with a one-command re-run (Leash), a per-visitor sandbox judges can use (sucsage), an automated "agent run every 6 hours" evidence stream and live dashboard (edxzh), 17 to about 96 contract tests, and a written known-risk list. These are cheap to match; see the table in section 4.
- **Honest status:** ChainBrain is a design today; the rivals above ship running code with explorer links. We win on idea and demo only if we ship the evidence pack too.
- **Most teams do not publish.** This is a floor, not the field (same caveat as [prior art](prior-art-hackathons-github.md)). Search again on 19 Oct.

## 1. How we searched (GitHub, 12-13 Oct 2026)

| Method | What it returned |
| --- | --- |
| `gh search repos` for fintechathon, "fintechathon 2026", "FinTechathon International Track", "2026 SHENZHEN FINTECHATHON", "fintechathon-2026", "agent fintechathon", Chinese terms | Same 8-10 repos as the 12 Oct note, plus **TuitionGuard** (`ngoc-oss`, created 12 Oct). The phrase "agent wallet fintechathon" and "Topic F" returned nothing |
| `gh search code` for FinTechathon, "Fintechathon 2026", "International AI Track", "AI as a Financial Participant", "Shenzhen International FinTech Competition", "WeBank FinTechathon", organiser email, "Topic F Agent Wallet", "Autonomous On-chain Wallet Agent" | New topic C/E/A repos: **OneGate** (`TarrushSaxena`), **Sathi** (`Tasrif-Ahmed-Mohsin/finbuddy`), **Monara** (`ZoeMohamed`), **AI-Cross-Border-Tuition-FX-Assistant** (`HelloVthree`). Code search found `sucsage/agentic-wallet` but not Leash. Leash was found earlier by another route; its repo name `finbase` does not contain "fintechathon" in the name. Our own repo also appeared in code search (`ixgnoy/Grabber`): public docs mention ChainBrain, which any rival can read |
| `gh search repos "agent wallet"` created since 15 Sep 2026, plus x402, "agentic wallet", "agent spending policy" and similar (71 candidate repos) | About 40 generic agent-wallet repos. I fetched every README and searched for fintechathon, webank, shenzhen, Topic F. **Only `sucsage/agentic-wallet` matched.** None of the others mention the competition |
| Topic searches (`fintechathon`, `fintechathon-2026`, `webank`) | Nothing |
| Not found | A search for a quoted phrase in `gh search` is treated as an exact phrase and misses most repos; GitHub also rate-limited us twice. Private repos, GitLab/Gitee, and teams that have not pushed are invisible. This is not a complete list |

Limits to remember: GitHub-visible only; commit dates below are from the GitHub commits API in UTC (13 Oct 02:16 UTC+8 is 12 Oct 18:16 UTC). Team sizes are the visible committers only.

## 2. Rivals table

### 2a. Topic F and same-concept repos (the ones that matter)

| Repo | Topic | What it does | Strengths | Weaknesses | Last commit (UTC) |
| --- | --- | --- | --- | --- | --- |
| **Leash** [`detinatran/finbase`](https://github.com/detinatran/finbase) | F (README says so) | Wallet agent for international students (rent, tuition, bills). Three layers: 7-tool least-privilege agent; deterministic policy engine (provenance tracking, look-alike address detection, limits, split-payment detection, pre-flight simulation) sorting every payment into T1 auto / T2 owner approval / T3 blocked; `PolicyWallet` contract (token and recipient allowlists, per-tx and daily caps, pause). Next.js UI, Foundry. Base Sepolia | Full submission packet in the repo (TECHNICAL, SECURITY_SELF_ASSESSMENT, EXECUTION_EVIDENCE, PITCH_DECK, DEMO_VIDEO_SCRIPT, SUBMISSION_CHECKLIST) mirroring the official templates; 3-minute narrated video and GIF; 17 contract tests incl. fuzz; 51 app tests; 30-attack suite (21 blocked, 9 escalated, 0 auto-executed) plus 6 normal payments with 0 false positives; `npm run evidence` regenerates 12 hash rows incl. 4 raw attack transactions reverted on-chain (`RecipientNotAllowed`, `ExceedsPerTxLimit`, `TokenNotAllowed`, `WalletPaused`). Real airdropped token whose name is an injection. Honest 11-item known-risk list | Default "AI" is a scripted naive agent (Claude or OpenAI-compatible is optional); no clarification, re-plan or turn-count story found in its docs; single-user wallet; no x402, no agent identity, no seller side; owner key on the server in the demo (its own KR-1); self-deployed mock USDC, mintable by anyone (its KR-11); injection detector is regex and English-centric (KR-3); every new payee needs owner approval, so little autonomy. Team: two named students | 2026-10-11 06:09 |
| **sucsage/agentic-wallet** [repo](https://github.com/sucsage/agentic-wallet) | F (README says so) | Agent pays SME contractors milestone by milestone (deposit, delivery, FAT, SAT, retention) through a `MilestoneEscrow`. Agent holds a scoped, expiring session key. Off-chain policy engine plus on-chain `AgentWallet` (caps, allowlists, N-of-M approvers, pause, instant revoke). Next.js 16 on Vercel, Hardhat 3 + viem, Base Sepolia | **Per-visitor sandbox wallet** created by a factory in one transaction, so judges cannot disturb each other; chain is the only database; audit log read from events; `agent-eval` script graded on real models (README: 8/8 on three models, 3/3 runs on one); 19 contract tests (counted: 19 `it()` blocks) including "send everything to 0xEvil"; documents hashed into evidence; i18n | README shows only two explorer links (factory creation and one reverted attack); no technical doc, self-assessment, evidence file or deck inside the repo; its own known-risk list is marked "draft"; owner has an unrestricted `execute`; self-deployed mock USDC; no x402, no identity, no seller side; single visible committer; Vercel reachability from China [VERIFY] | 2026-10-10 19:09 (GitHub shows a later push on 12 Oct) |
| **edxzh/agent-wallet** [repo](https://github.com/edxzh/agent-wallet) | **Not labelled** (no mention of FinTechathon in the README; [VERIFY] if entered). Built by "Yunshu AI", one visible committer, 2026-10-07 start | `PolicyWallet` contract (per-payment cap, daily and per-task budgets, payee allowlist, pause) that is an **ERC-1271 signer for standard x402 USDC payments**: valid only for a reserved digest signed by the agent key. Rule breaks are logged as `PaymentRefused(reason)` events with exactly one reason code. **ERC-8004 identity and reputation read inside `authorize`** (pay an unknown service only if trusted reviewers' average is at least 70 from at least 3 reviews; impostor identity refused). Ratings only from settled payments, tied to the payment nonce. "Agent hires agent" `JobEscrow` (spec 004, contract and tests done, on-chain steps pending). Live dashboard (`demo.yunshu.ai`), a "try to make it overspend" free dry-run page, a scripted agent run every 6 hours in CI, English and Chinese pages, MIT. Base Sepolia, real test USDC through the x402.org facilitator | The strongest overlap with our spec (see section 3). Roughly 96 Foundry test functions (grep count) incl. fuzz and invariants; pinned ERC-8004 registry addresses with a halt if the implementation changes; refusals as events (a public record); 4 spec folders with research notes; two published articles | No LLM in the loop that we could find (a scripted agent; no chat, no clarification, no re-plan); buyer-side only: the wallet decides whom it pays, nobody checks who the buyer is for the seller; no KYC or owner binding; no submission documents named for the competition; not audited (says so). Reviewers here are its own "scout" wallets (reputation is staged by the author, not independent) | 2026-10-12 15:46 |
| Kagi Wallet, x402 Guard, IntentGuard, PragmaMoney, LedgerMind | Not FinTechathon | Covered in [prior art](prior-art-hackathons-github.md) | n/a | n/a | n/a |

Other agent-wallet repos from the 15 Sep+ scan (`PDiTO/agent-wallet`, `NEXE-sudo/aegis-agent-wallet`, `Makabeez/mandate`, `loveaihq/ada-agent-wallet`, `voidly-ai/agent-wallet-kit`, `leodevnc/world-agent-wallet`) describe on-chain limits, policy gates or x402, but none mention the competition. Treat them as "same idea, other hackathons"; I did not read them in depth. `harsh11067/vectis` ("Autonomous On-chain Wallet Agent", ERC-7710 redelegation) dates from June, so it is a different event.

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

## 3. What the three Topic F rivals mean for ChainBrain's novelty claims

| Our claim in the docs | What the code shows | Fix |
| --- | --- | --- |
| "A pocket that pays x402 within limits" | Done by edxzh with real test USDC, by Leash and sucsage with caps and allowlists (no x402) | Already marked "table stakes" in [judge simulation](../06-pitch/judge-simulation.md). Keep it |
| "Narrow edge: rules enforced inside an ERC-1271 check on the standard x402 USDC authorization" ([prior art](prior-art-hackathons-github.md), marked [VERIFY] there) | **edxzh/agent-wallet does exactly this**: `isValidSignature` accepts only a reserved digest signed by the agent, after `authorize` ran the rules | Do not claim this as new. Say "we build on the same standard pattern". The prior-art doc should be corrected (not my file to edit) |
| "ERC-8004 identity and reputation for payees" | edxzh reads both registries inside the payment, with pinned registry addresses and payment-grounded ratings | Our ERC-8004 use must be on the seller-checks-buyer side, which edxzh does not do |
| "Seller verifies the buyer agent (seven guards, verdict, reason code, live re-plan)" | Not found in any of the three. edxzh has reason codes but for the buyer's own wallet refusals; Leash has typed reverts; none has a seller gateway or a "serve / step up / refuse" verdict | This is the real gap. Lead with it (and still say Visa TAP, Skyfire and others verify agents in the card world) |
| "Agent hires another agent (translation agent)" | edxzh has a `JobEscrow` for exactly that; sucsage has `MilestoneEscrow` | Our scene is not unique; ours should be a payment-with-check, not an escrow clone |

## 4. Head-to-head against ChainBrain (as designed; nothing of ours is built yet)

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
| Seller-side security (replay, double-grant) | n/a | n/a | n/a | Planned gateway tests | **Ahead** (nobody else has the surface) |

### Innovation and interaction (30%): novelty, real-world value, dialogue efficiency, clarification, correction, fallback

| Item | Leash | sucsage | edxzh | ChainBrain (plan) | Read |
| --- | --- | --- | --- | --- | --- |
| Novel idea | Provenance tracking of addresses; student use | Milestone escrow for SME works | ERC-8004 gating; agent hires agent | Seller verdict + reason-code re-plan | **Ahead** on seller side; narrow elsewhere |
| Real-world value | Students' rent and tuition (clear) | SME contractors (clear) | Developer infrastructure | Merchants' readiness gap (market data in [market doc](market-regulation-webank.md)) | Even; ours is the abstract one, so name one merchant |
| Clarification | Not found | Chat agent; README says it is tested on refusing an incomplete SAT (no clarification dialogue described) | None | One clarifying question scripted | Even or slightly ahead |
| Correction / re-plan after refusal | Prompt forbids retrying blocked payments (agent stops) | Not stated | Not stated | **Reads a reason code and picks another seller** | **Ahead** |
| Fallback | Offline scripted mode; LLM refusal fallback | Rule-based UI without LLM | Not applicable | Dead-end stop and explain | Even |
| Dialogue efficiency measured | No | Latency per run in README (about 35 s) | No | Planned "turns per task" | Ahead if we measure |
| Visible LLM in the loop | Optional | Yes | No | Yes | Even |

Bonus (0-5): nobody visible uses FISCO BCOS; Leash only says its Solidity "is compatible" with consortium chains. A tested FISCO deployment would be unique but is a bonus, not a core win.

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
| Agent may protect (freeze, pause) but never un-protect | Sathi, Leash | State this rule in the permission table; show the agent pausing a pocket and failing to resume | S | Security |
| Known-risk list with IDs | Leash | Write ours with named residuals and test IDs | S | Security |
| Offline reproducible demo file | TuitionGuard, FundBun | Static replay page of the recorded run with real hashes, for reviewers who cannot reach our server | S | Task |

Do not copy code or text from these repos. They are other students' and developers' work; use them only to see which ideas judges are likely to be shown.

## 6. Positioning lines that make ChainBrain stand out

Written to be true against what we read. Each needs the matching proof in the demo.

1. **"Every other wallet protects the buyer. ChainBrain also protects the seller."** In the three Topic F rivals, the checks sit on the paying side. None runs a verdict (serve, step up, refuse) before the merchant delivers.
2. **"A refusal is an instruction, not a dead end."** The agent reads a reason code, explains, and re-plans to a seller that fits the budget; the final payment has a hash. Leash's agent is told to stop after a block; we show the next successful hash seconds after the revert.
3. **"Real money-shaped test dollars, not play tokens."** We pay with Circle's test USDC through the standard x402 flow, so any explorer or x402 tool recognises it. Leash and sucsage deploy their own mintable mock token.
4. **"Hit it yourself."** A judge types an attack, the agent can be fooled on purpose, and the contract reverts with a visible hash. (Leash has a "simulate compromised agent" switch, edxzh a dry-run page. Ours adds a seller-side attack and a live re-plan after it.)
5. **"One sentence, one question, one receipt."** Show the dialogue: owner says one sentence, agent asks one clarifying question, then pays. Count the turns on screen. This is the line the three Topic F repos do not speak to.
6. **"We checked the field."** One honest slide: Leash and sucsage (buyer-side limits), edxzh (ERC-1271 x402 wallet with reputation), Visa TAP, Skyfire, Kagi. Our claim is only the narrow, true one. Judges who know the repos will trust us more.

Avoid: "first", "nobody", "novel pocket", "ERC-1271 x402 is new", "only team with on-chain tiers".

## What this means for winning

- [must] Ship the evidence pack and the template-mirroring documents by Mon 19 Oct. Leash already has them; without them we lose on paper even with the better idea. Task 40 / Security 30
- [must] Pass the 14 Oct payment spike; edxzh shows the ERC-1271 x402 pattern works with real test USDC and the public x402.org facilitator ([its research notes](../../reference/repos/rivals/edxzh-agent-wallet/specs/001-agent-wallet-demo/research.md) are public). We should read how it dealt with nonce reservation and facilitator signature lag, then write our own. Task 40
- [must] Rewrite the novelty claim: drop the ERC-1271 x402 "narrow edge" and keep only seller-side verdict plus re-plan. Innovation 30
- [must] Run 30+ attacks and 10 plain tasks with false-refusal rate, and publish a known-risk list. Security 30 / Task 40
- [should] Provide a judge-facing sandbox (own pocket per visitor, or a shared one with a reset) and a "type your own attack" box with a dry-run. Task 40 / Security 30
- [should] Add a scheduled daily run that produces fresh hashes and a static dashboard, plus a recorded replay page. Task 40 (protects against a demo failure)
- [should] Evaluate the agent on two or three models, with run counts, and show turns per task. Innovation 30
- [should] Test reachability from mainland China (video mirror, gateway, explorer links); no rival states it. Task 40
- [could] Provenance and look-alike check on payees; exact-amount re-typing on step-up. Security 30
- [could] FISCO BCOS dry run as the only unique bonus idea in the field. Bonus
- [could] Re-run this search on 19 Oct and again before the 22-23 Oct online review; read any new Topic F repo within an hour. All

## Open questions

- Is `edxzh/agent-wallet` a competition entry? Its README never says. If the author submits it to Topic F it is our closest rival; if not, it is still public proof against our novelty claim. [VERIFY]
- How many Topic F teams exist? Only three repos are visible; most teams do not publish. Unknown.
- Do the rivals' hosted demos work from mainland China? Not tested; Vercel and Cloudflare reachability both [VERIFY].
- Does the sucsage author keep submission documents outside the repo (a Drive folder, as OneGate does)? Not visible.
- Will judges run the repos? Leash and edxzh invite it; if yes, a one-command evidence run matters more than the UI.
- Whether Leash's real-LLM path was tested is not stated; its video and tests rely on the scripted agent.

## Sources

- GitHub searches and API calls on 2026-10-12 and 2026-10-13 (`gh search repos`, `gh search code`, `gh api repos/.../readme`, `.../commits`, `.../contributors`).
- Local clones (data only, nothing run): `reference/repos/rivals/leash-finbase` (README, `docs/TECHNICAL.md`, `docs/SECURITY_SELF_ASSESSMENT.md`, `docs/EXECUTION_EVIDENCE.md`, `docs/SUBMISSION_CHECKLIST.md`), `reference/repos/rivals/sucsage-agentic-wallet` (README, contract test count), `reference/repos/rivals/edxzh-agent-wallet` (README, `contracts/src/PolicyWallet.sol` signature function, `specs/004-agent-hires-agent/spec.md`, test file list, `docs/articles/`), `reference/repos/rivals/onegate`, `.../finbuddy` (Sathi), `.../tuitionguard`, `.../tuition-fx-assistant`, `.../monara` (READMEs only).
- Repo pages (opened via API 2026-10-13): https://github.com/detinatran/finbase, https://github.com/sucsage/agentic-wallet, https://github.com/edxzh/agent-wallet, https://github.com/TarrushSaxena/OneGate, https://github.com/Tasrif-Ahmed-Mohsin/finbuddy, https://github.com/ngoc-oss/TuitionGuard-FinTechathon-2026, https://github.com/HelloVthree/AI-Cross-Border-Tuition-FX-Assistant, https://github.com/ZoeMohamed/Monara, https://github.com/harsh11067/vectis.
- Earlier research: [competitors 12 Oct note](../../reference/prior-research/docs/competitors-2026.md), [prior art](prior-art-hackathons-github.md), [how judges score](../06-pitch/how-judges-score.md), [judge simulation](../06-pitch/judge-simulation.md), [recommended changes](../02-product/recommended-changes.md), [review log](../07-log/review-2026-10-13.md).
