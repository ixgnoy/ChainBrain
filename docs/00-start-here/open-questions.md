# Open questions
Last updated: 2026-10-17

> **Status (14 Oct, v2):** organiser questions (A) and team questions (B) still apply. Technical (C) and pitch (D) rows written for the old seller-gateway design are marked **[old design]**: v2 closes or drops them. Closed by v2 or the team plan: X1 (pocket signatures work with x402's facilitator code on the FISCO node), X3 (no seller gateway in prelims), X4 (the pocket is an ERC-1271 contract, no ERC-4337), X5, X8, X10 (not used), P1-P3 as framed. New open items are in section E.
>
> **17 Oct:** the project now runs only on FISCO BCOS 3.16.4 (chain id 20200) with a Mock e-HKD token (eHKD). Rows about the old public-testnet setup or a mainnet rerun are rewritten or closed below.

## In one minute

- Open questions fall into four groups: **organisers** (only they can answer), **team** (we decide), **technical** (the spike and tests answer), **pitch** (claims to check).
- **Round 2 added** O11-O15, T8-T13, X11-X17 and P9-P12 (submission channel, model access in Shenzhen, mainnet funds, facilitator tests, rival check). No question was closed by round 2; none has an official answer yet.
- **The one that matters most:** do transaction hashes from our team-hosted FISCO BCOS chain count as "real on-chain" proof for Topic F? It decides the 40% task score. Nobody public has answered ([how judges score](../06-pitch/how-judges-score.md)).
- Send the organiser email below today. Do not wait for an answer before building; run the default.
- Each row gives why it matters and a recommended default so the team can move on.
- Nothing here has been sent. The email is a draft for a teammate to review and send.

## A. Organisers (email the address in the rules)

| # | Question | Why it matters | Recommended default until answered |
| --- | --- | --- | --- |
| O1 | Do tx hashes from a team-hosted FISCO BCOS chain count as real on-chain hashes for Topic F? | Task 40 | Assume yes; host the node publicly on Railway with a read-only explorer |
| O2 | Is a mainnet demo or wallet expected at the 22 Nov defence? | Task 40, regulation | FISCO BCOS with Mock e-HKD; no real money |
| O3 | Is FISCO BCOS mandatory, optional or bonus? | Bonus, Task | All scored hashes are on FISCO BCOS |
| O4 | Is the 10-minute deck a recorded talk, speaker notes or a live slot? Will the final have live scripted tasks? | Deck design, rehearsal | Prepare a recorded talk and a live fallback |
| O5 | Real online review dates: 22-23 Oct (official) or 23-28 Oct (IEEE page)? | Planning | Plan to 22 Oct |
| O6 | What counts as a "serious security failure"? Do judges test the live system or only the video and code? | Security 30 | Assume both |
| O7 | Is the security self-assessment required for the International track (rules say optional)? | Workload | Write it anyway |
| O8 | Are the capped 0-5 bonus and the IEEE page's "extra consideration for ambitious solutions" the same thing? | Bonus | Treat bonus as 0-5 only |
| O9 | Can reviewers inside mainland China reach our Railway endpoints (node, API, explorer)? Any preferred hosting? | Task | Host publicly; keep recorded fallback |
| O10 | Who is on the judging panel; are the academic advisers judges? | Pitch tuning | Write for a mixed panel |
| O11 | How is the package sent for the International track (email address, subject format, upload link)? Size limit? How many resubmissions, and does the last one count? (Round 2; [checklist](../06-pitch/submission-checklist.md)). Address conflict: the rules text and a saved rule page for another track give different addresses, and the other page says at most 3 submissions [VERIFY] | Delivery | Use the address in our rules doc; plan one clean send by noon 20 Oct |
| O12 | Is a public repo required, or is a private repo with reviewer access acceptable? | Source code, licences | Public repo with `.env.example` only |
| O13 | Does the organiser provide model access or a network exception at the defence? Are OpenAI, Gemini and Claude reachable from the venue? | Live defence | Assume not; Qwen3.7-plus and replay ([model choice](../04-build/agent-model-choice.md)) |
| O14 | What is the exact "Track" string for the video filename? | Naming | `InternationalAI` (proposal) |
| O15 | Do judges run live tasks in the online round, or only read the evidence? Does "real on-chain" mean mainnet? Is a failed (reverted) tx accepted as evidence of a refusal? | Task 40 | Prepare for both; see [plan](status-and-plan.md) |

### Draft email (do NOT send without team review; extended in round 2 with questions 8-11; trim if too long)

> To: the organisers' address from the rules
> Subject: International AI Track, Topic F: questions on on-chain evidence and review format
>
> Dear Organising Committee,
>
> We are a team entering the International AI Track, Topic F (Agent Wallet). Before we finalise our submission due 24:00 on 20 October (UTC+8), could you please clarify:
>
> 1. For Topic F, our wallet runs on a self-hosted FISCO BCOS chain with a mock Hong Kong dollar test token. Are its transaction hashes accepted as "real on-chain transaction hashes", or are mainnet transactions required?
> 2. Is FISCO BCOS mandatory, optional, or considered for the bonus score?
> 3. Is the 10-minute presentation a recorded talk or a live slot? Will the final defence include live or scripted tasks?
> 4. What are the exact online review dates (22-23 October on the website; 23-28 October on the IEEE CIS page)?
> 5. What does the judging panel regard as a "serious security failure", and will judges test the live system or only the submitted video, documents and evidence?
> 6. Is the security self-assessment expected for the International track, and is the capped 0-5 bonus the same as the "extra consideration" mentioned for Topic F?
> 7. Our chain node, API and read-only explorer are hosted on Railway. Can reviewers reach them from mainland China, or should we host a mirror?
8. How should the submission package be sent for the International track (email address and subject format, or an upload link), is there a file-size limit, and how many resubmissions are allowed (does the last version count)?
9. Is a private repository with reviewer access acceptable for the source code, or must it be public?
10. At the 22 November defence, will model API access or a network exception be available, or should we bring our own access? Are mainland-China-based model services acceptable?
11. For Topic F, is a deliberately failing (reverted) transaction accepted as evidence that an unsafe action was refused?
>
> Thank you for your help.
>
> Kind regards,
> [Team name, member names, registered email]

## B. Team decisions

| # | Question | Why it matters | Recommended default |
| --- | --- | --- | --- |
| T1 | Who are the 2-5 members; does the 60% non-Chinese-national rule hold (3 members need 2)? | Eligibility; track may be reassigned | Confirm today |
| T2 | Which model powers the in-house agent, called directly or via a router? | Reliable tool use; cost | Pick for tool use first; fix by 14 Oct |
| T3 | English name: ChainBrain or 链AI脑 only? | Deck | "ChainBrain (链AI脑)"; avoid 稳定币 and RWA in the Chinese tagline ([market](../03-research/market-regulation-webank.md)) |
| T4 | Accept the proposed changes? | Scope | Review [recommended changes](../02-product/recommended-changes.md) together; record in [decisions](../07-log/decisions.md) |
| T5 [old design] | Who owns the pocket path (A) and MetaMask path (B) on Wednesday? | Spike speed | Two people, in parallel |
| T6 | Minimum winning slice: agreed cut order? | Scope | See [plan](status-and-plan.md) |
| T7 | Who sends the organiser email and who owns docs from 15 Oct? | Delivery | Assign today |
| T8 | Fill in the owners, backups and timezones in [roles and workplan](roles-and-workplan.md) | All gates need an owner | Assign today |
| T9 | Which agent model and region does each teammate actually have access to? Claude's supported-countries list does not include China | Build week and defence | Sonnet 5.5 for build, Qwen3.7-plus for Shenzhen; decide by 15 Oct ([model choice](../04-build/agent-model-choice.md)) |
| T10 [closed] | Who buys mainnet funds? | Mainnet insurance | Not needed: the project runs on FISCO BCOS with Mock e-HKD ([Topic F tasks](../04-build/topic-f-tasks-and-mainnet-plan.md)) |
| T11 | Who is narrator and who drives the demo; faces or voice-over only? | Video, defence | Voice-over plus on-screen driver ([demo script](../06-pitch/demo-script.md)) |
| T12 | Which licence do we publish our own code under, and does it fit rule 7 (organiser may use entries for promotion)? | Source code | MIT with our own SPDX headers ([licences](../04-build/licences-and-reuse.md)) |
| T13 [old design] | Are the spec owner and team happy to add the owner-signed one-off payment (R1) and step-up for unverified sellers? | Plain judge tasks | Yes, if R1 fits the exact-digest rule ([Topic F tasks](../04-build/topic-f-tasks-and-mainnet-plan.md)) |

## C. Technical (spike and tests answer these)

| # | Question | Why it matters | Default |
| --- | --- | --- | --- |
| X1 [old design] | Does x402.org or CDP accept a non-65-byte contract signature end to end? ([VERIFY]) | Pocket path | Self-host an SDK facilitator |
| X2 [old design] | Does the MetaMask hosted facilitator need an API key for real payments? | Path B | Test Wednesday |
| X3 [closed by v2] | If settlement fails after the handler ran, is the buffered response discarded? | Gateway safety | Settle before serve; test |
| X4 [closed by v2] | Can the pocket be a true ERC-4337 account without breaking the raw-digest check? | "4337" wording | Say "contract account"; Nexus/Safe7579 later |
| X5 [closed by v2] | Is the ERC-8004 Validation Registry deployed, and are registry addresses confirmed on-chain? | Identity | Not used in prelims |
| X6 [closed] | How do wallets get test funds? | Wednesday blocker | `scripts/fisco/fund.sh` locally; the node gateway's /admin/fund or the server faucet (`POST /api/faucet`) on Railway |
| X7 [old design] | Does our nonce = hash(intent, quote) make the nonce-preemption attack easier? | Security | Test on the FISCO node |
| X8 [closed by v2] | Does the SIWX signed message work with a smart account? | Challenge design | Test after spike |
| X9 [closed] | Does FISCO work with Foundry/viem; default tx_gas_price? | Bonus | Yes on 3.16.4: gas price 0, but a sender needs a non-zero native balance |
| X10 [closed by v2] | Which caveats does the MetaMask x402 delegation provider add automatically? | Path B | Read code |
| X11 [old design] | Do hosted x402.org or CDP accept ERC-1271 payers, in 65-byte and longer signatures? (Round 2 test plan) | Facilitator choice | 30-minute test Wed 14; self-host otherwise |
| X12 [old design] | Can a deliberately failing transaction land on-chain through a facilitator, or must the revert be sent directly with a fixed gas limit? | Scene 6 revert hash | Direct submit, labelled "forced direct call" [VERIFY] |
| X13 [closed] | Can bulk red-team runs use a local chain? | Red-team cost | Yes: the local FISCO node runs the same Mock e-HKD and pocket code |
| X14 | Can the Alibaba Model Studio endpoint and api.deepseek.com be reached from the Shenzhen venue network? | Live defence | Test via a China-located teammate 14-15 Oct [VERIFY] |
| X15 | Can reviewers inside mainland China open our read-only explorer (`/explorer` on the Railway API)? FISCO has no public explorer | Evidence | Ship screenshots and receipt JSON beside links |
| X16 [closed] | Does a hosted facilitator need an API key or have rate limits? | Facilitator | Not relevant: x402's facilitator code runs in-process |
| X17 [old design] | Which model and temperature? A 50-run pilot sets cost and red-team numbers | Red-team | Temperature 0-0.2; pilot Thu 15 |

## D. Pitch and claims

| # | Question | Why it matters | Default |
| --- | --- | --- | --- |
| P1 [old design] | How do sellers verify Alipay APASS agents; is APASS open to non-Ant agents? | Competitor slide | Do not claim; say "not described publicly" |
| P2 [old design] | HKT/Red Date Agentic ID: merchant step? Which chain? | Rival or partner | Cite as local validation |
| P3 [old design] | Is "ERC-4337" literally true for our pocket? | Judge catches overclaim | Reword unless hosted on a 4337 account |
| P4 | What is our named merchant pain and evidence of demand? | Innovation 30 | Ravelin, Worldpay; say "no customers yet" |
| P5 | Is Qiang Yang on the 2026 panel, and what is his title? | Pitch tuning | Do not tailor to a person |
| P6 | Real primary sources for PCAC convention, MAS SAFR, Yinfa 42? | Citations | Label press summaries as such |
| P7 | Check market forecasts (McKinsey, Morgan Stanley) in primary reports | Numbers | Do not quote until checked |
| P8 | Grok/Bankrbot incident detail (gifted NFT) confirmed by a primary source? | Security slide | Omit the NFT detail |
| P9 | Is edxzh/agent-wallet a FinTechathon entry? Its README never says. How many Topic F teams exist beyond Leash and sucsage? | Novelty slide | Name the three in an honest field slide; re-run the GitHub search 19 Oct ([rivals](../03-research/topic-f-rivals.md)) [VERIFY] |
| P10 | Re-open and confirm the market figures planned for deck slide 2 (Ravelin, Worldpay) | Opening slide | Do not show until checked [VERIFY] |
| P11 | ASB (Agent Security Bench) refusal-rate definition rests on a search snippet | Security report | Do not quote until verified |
| P12 | A search snippet said five x402 bounty winners at Hedera Apex; the opened winners page does not mention x402 | Prior-art slide | Do not claim; conflict kept side by side in [demo script](../06-pitch/demo-script.md) |

## E. New in v2 (from the team's plan and spec)

| # | Question | Why it matters | Default |
| --- | --- | --- | --- |
| N1 | Do hashes from a team-hosted FISCO chain count as "real on-chain transaction hashes"? (same as O1, spec open question) | Task 40% | FISCO BCOS on Railway; wait for the organiser answer |
| N2 | Team: 2 to 5 members, overseas university and at least 60% non-Chinese nationals: who is in? | Eligibility | Confirm today |
| N3 | Which model powers the agent? | Reliable tool calls, cost | Default `claude-opus-5-5`, effort `high`; `claude-sonnet-5-5` cheaper if the real-model run passes |
| N4 [closed] | Does x402's facilitator settle a pocket payment on the chain? | Live hashes | Yes, in-process on FISCO ([FISCO evidence](../evidence-fisco.md)) |
| N5 | Does MetaMask sign the eHKD `TransferWithAuthorization` typed data for the approval sheet? | Scene 3 on web | Approve from the phone app |
| N6 | Does Expo Go run the bundle and secure storage on a real phone? | Phone demo | Expo web target; native Android app |
| N7 | Does the real model pass scenes 1-8 (replay mode passed)? | Scenes | Tune prompt and tool text; no scripted branches |
| N8 | Name on the deck: 链AI脑 with ChainBrain as the English name? | Deck | Yes |
| N9 | Deadline wording: spec says 23:59, rules say 24:00 UTC+8 | Planning | Plan to noon on 20 Oct |

## What this means for winning

- **[must]** Send the organiser email today. Task 40, Bonus.
- **[must]** Settle T1 (eligibility) and T8 (owners) today. All.
- **[must]** Add the new email questions 8-11 (channel, repo, defence model access, reverted-tx evidence) before sending. Task 40.
- **[old design]** T5 and T13 refer to the old spike paths and the old judge-task fix.
- **[should]** Run the real-model run (N7); test X14 in parallel. Security 30, Task 40.
- **[should]** Never write "ERC-4337" for the pocket: v2 says it is an ERC-1271 contract with no bundler. Innovation 30, Security 30.

## Open questions

This whole doc is the list. When a question is answered, strike it here and add a row to [decisions](../07-log/decisions.md).

## Sources

- The 14 Oct prelim plan's open questions (history), spec open questions and each research doc's "Open questions" section: [spec](../02-product/product-design.md), [feasibility](../04-build/x402-pocket-feasibility.md), [identity](../04-build/identity-reputation-fisco.md), [competitors](../03-research/competitors-industry.md), [prior art](../03-research/prior-art-hackathons-github.md), [threat model](../05-security/threat-model-and-red-team.md), [market](../03-research/market-regulation-webank.md), [how judges score](../06-pitch/how-judges-score.md), [judge simulation](../06-pitch/judge-simulation.md), and round 2: [submission checklist](../06-pitch/submission-checklist.md), [demo script](../06-pitch/demo-script.md), [Topic F tasks and mainnet](../04-build/topic-f-tasks-and-mainnet-plan.md), [model choice](../04-build/agent-model-choice.md), [licences](../04-build/licences-and-reuse.md), [rivals](../03-research/topic-f-rivals.md), [harness](../05-security/evidence-and-redteam-harness.md). Organiser address from [rules](../01-competition/hackathon-rules.md). Read 2026-10-13.
