# Judge fit for the demo video (research, 20 Oct 2026)

Scope: FinTechathon 2026 International Track, Topic F. Read first: `docs/01-competition/*`, `video/SCRIPT.md`, `STORYBOARD-v4.md`, `CREDITS.md`. Web claims carry a URL. "Unverified" means I could not confirm it from a primary page. Quotes are short phrases only. No rival teams are named or described.

## In one minute

- **Nothing in the competition documents sets video format, file name, subtitles or resolution.** The only hard video rules: required on the website, "optional" in Attachment 2, no longer than 5 minutes, English (rules item 4: submitted materials "must include an English version"). v4 is 4:46.5, so it is inside the limit by 13 s.
- **Biggest scoring gap is task completion (40 points).** Topic F is "evaluated using on-chain transaction hashes". The video's only legible real hash is a different payment (block 11, HK$2.30 to DataLite), and the Exa and CoinGecko payments run on the simulated network. Make the hash-to-task link explicit and keep a hash on screen long enough to read.
- **The HKMA beat has one labelling problem.** Carmen Chu's speech has no "four principles". It has an "ART" framework with three pillars; the four phrases sit in separate paragraphs. Rename the title card and soften "covers all four".
- **No new HKMA or SFC statement on AI agents, agentic payments or GenAI turned up for 17-20 Oct.** The latest relevant item is the HKMA "ART" announcement of 15 Oct plus the speech of 16 Oct.
- **A Chinese-subtitle draft already exists** (`video/remotion/src/subs-zh.json`, `enabled: true`). It should not ship burned in until a team member who reads Chinese has checked every line.

---

## 1. Competition requirements versus the v4 script

### 1.1 Every video requirement found

| Requirement | Source | Status in v4 |
|---|---|---|
| Demo video required, up to 5 min | `hackathon-rules.md` (website rules, Submission step 1: "Demo video, up to 5 minutes (Required)"); Chinese: 演示视频：不超过 5 分钟（必交） | Met: 4:46.5 |
| Attachment 2 marks the video "optional", still "no longer than 5 minutes" | `attachments.md`, conflict 2 | Met either way |
| English is the official language; "submitted materials must include an English version"; demo, defence and review are in English | `hackathon-rules.md` item 4 and the Chinese table ("作品演示、答辩和评审均使用英文") | Met: English voice and English burned subtitles |
| Execution evidence: real on-chain hashes for Topic F | `attachments.md`, checklist item 6 | Partly shown (see 1.3) |
| Third-party materials must be legally authorised and licence-compliant (rules item 6) | `hackathon-rules.md` | `CREDITS.md` covers it. Gaps: the ElevenLabs plan terms and the third-party marks are covered only by "no endorsement implied" |
| Organiser may reuse entries for non-commercial publicity (rules item 7, non-exclusive licence) | `hackathon-rules.md` | The team photos and voice will be reused. Fine, but the team should know |
| Length, file name, container, resolution, subtitles | not specified anywhere I could find | The IEEE CIS Shenzhen page lists the registration email subject format only and says nothing on video: https://r10.ieee.org/shenzhen-cis/blog/2026/06/17/2026-shenzhen-international-fintech-competition-international-track/ |

The organisers' timetable also differs by page: the IEEE page lists compliance screening 21-22 Oct and online review 23-28 Oct (same URL), while the website rules say 21 Oct and 22-23 Oct. Treat the video as possibly watched until 28 Oct; nothing to change, but do not rely on a 23 Oct cut-off for any later swap.

### 1.2 Every judging criterion

Source: `hackathon-rules.md`, Judging Criteria (English and Chinese agree).

| Weight | Criterion | What is assessed |
|---|---|---|
| 40% | Task Completion | Topic F: on-chain transaction hashes |
| 30% | Security & Compliance | Defence against induced transfers, data extraction, privilege escalation and prompt injection; serious failures trigger "substantial deductions" |
| 30% | Innovation & Interaction | Scenario novelty, real-world value, dialogue efficiency, clarification, correction and fallback capability |
| 0-5 | Challenge/implementation bonus | "advanced topics or demonstrated real-world deployment"; topic choice itself does not change the base score |

Attachment 2 adds the Topic F wording: "asset management, transaction execution, risk control", with "ambitious ideas ... encouraged" (`attachments.md`).

### 1.3 v4 against each criterion

| Criterion | What v4 shows | Gap | Fix |
|---|---|---|---|
| Task completion (40) | 0:46-1:20 create and fund a card, ask-one-question, two x402 payments; 1:20-2:13 X-ray ending on a real receipt (block 11); 4:08-4:29 proof (7 of 7 refusals with hashes, 63 attacks, 462 tests) | (a) The tasks run on the simulated network (labelled), the real receipt is a different payment, so a judge who scores "hashes" has to infer the link. (b) The hash is shown as a receipt for a few seconds, not read or pointed to. (c) The three Topic F capabilities are not named; "asset management" (balances, funding, refund on cancel) is the thinnest. (d) The video never says where the hashes are listed for verification | Add one line of voice or caption: every payment and refusal in the evidence file has a hash anyone can open; show one full hash (first and last 6 characters is fine) for at least 3 s with the explorer open. Add three small chips in the proof scene, "asset management / transaction execution / risk control", each tied to something already shown |
| Security and compliance (30) | The four attack types in the rubric all appear: hidden orders (prompt injection), data requests (data extraction), fake admin (privilege escalation), planted transfer (induced transfer); then the eight-layer explanation and the key-theft cards | The rubric's own four words are not on screen, so a skimming judge may not tick them off. "Serious failure triggers deductions" means the strongest evidence (card reverts the induced transfer) is right but sits only at 2:47 | Label each attack with the rubric's term in small type ("Prompt injection", "Data extraction", "Privilege escalation", "Induced transfer"). Zero re-record cost: it is a text overlay |
| Innovation and interaction (30) | Live-built card, one clarifying question, fallback after a refused seller, negotiation HK$12.00 to HK$8.80, cancel mid-task, second AI watcher | "Dialogue efficiency", "correction" and "fallback" are the rubric's words. The clarifying question and the fallback are in the voice-over but not named; no "correction" beat (the user fixing the agent) is called out | Name them in captions ("Clarification", "Fallback", "Correction"). If the v4 footage has a moment where the user edits a rule or rejects a draft, tag it as correction. If it does not, do not claim it |
| Bonus (0-5) | Hosted real chain (our own FISCO BCOS node), "try it" in the ending | The bonus rewards "demonstrated real-world deployment". The video says "test setup" and "test money" (honest) but never says that the judges can open a live deployment | Say once, plainly: "a live version runs on a hosted FISCO BCOS chain; the link is in our documents." Keep the test-money footer. Do not claim production use |
| English | Voice and subtitles English | none | none |

Other checks:

- **Honesty marks stay.** "Recorded on our test setup" on every phone shot, "our mapping, not a regulatory approval" on the HKMA slide. Keep both; the rubric punishes security failures hard and overclaiming reads as one.
- **Overlong first 30 s?** 0:00-0:28.5 is hook and statistics before the product appears. A judge who watches dozens of videos may skim. The name "ChainBrain" and the card first appear at 0:21. Acceptable, but if time allows, put a tiny title chip ("ChainBrain: an AI Card for agents, Topic F") in the first 3 s. Confidence low.
- **Defensible, not wrong:** 63 attacks and 462 tests are claimed in the submitted PDFs per `STORYBOARD-v4.md`; I did not recheck them.

---

## 2. Who judges and what they value

### 2.1 Who is named

- **No judging panel is named for the International Track.** The IEEE CIS Shenzhen page lists an Academic Advisory Board and says nothing about who judges: https://r10.ieee.org/shenzhen-cis/blog/2026/06/17/2026-shenzhen-international-fintech-competition-international-track/ . Attachment 2 (per `attachments.md`) says "WeBank industry experts and university scholars". The overview lists eight advisers, including Qiang Yang (WeBank Chief AI Adviser) and Li Wenrong (City University of Hong Kong); advisers are not confirmed judges.
- **Organisers:** Shenzhen University-WeBank Institute of FinTech as host, with Shenzhen Municipal Local Financial Administration, Shenzhen University and WeBank as guidance units; CCF Technical Committee on Digital Finance and Tsinghua Institute of Financial Technology as technical advisers (`hackathon-overview.md`). Secondary listings disagree on who hosts: https://baike.baidu.com/en/item/The%208th%20FinTechathon%20Shenzhen%20International%20FinTech%20Competition%202026/5383419 (treat as unverified).
- **Past judge composition (blockchain track, 2021, third edition):** professors from Sun Yat-sen, Wuhan, Xidian and Shenzhen universities, the National Cybersecurity Institute, HKUST and NTU; chair WeBank VP and CIO Ma Zhitao (also chair in 2020). Source: search snippets of https://www.prnasia.com/story/331449-1.shtml and https://fintech.webank.com/fintechathon/campus2021/ (I did not open both pages; unverified at page level). The same snippets name He Debiao (Wuhan University, China Association for Cryptologic Research council member) as an expert judge. This suggests a cryptography-aware panel. It does not say that the 2026 International Track panel looks the same.
- **Hong Kong fintech experts:** none named for this track that I could find. Treat them as likely among advisers, not confirmed.

### 2.2 What WeBank and the FISCO BCOS community publicly emphasise

| Theme | Evidence | Fit for the video |
|---|---|---|
| Real deployment and value | WeBank's Qiang Yang at the 2025 final: next stage is "technology innovation + real-world deployment + value creation" (paraphrase from https://m.dutenews.com/n/article/10315760) | The video's "we attacked our own wallet 63 times" plus a hosted chain speaks to this. Say "live" once |
| Trustworthy AI | The 2025 AI-track champion's pitch stressed trustworthy reasoning and hallucination filtering (same URL) | Fits the "second AI watches" theme |
| AI-native bank, many agents, AI risk inside the bank's whole risk framework | WeBank reports 800+ agents, 50+ "digital employees", and says it puts AI risk into bank-wide risk management: https://m.mpaypass.com.cn/news/202512/31112545.html | The pitch "governance for agents that spend" is on WeBank's own road. Do not claim WeBank uses anything like ours |
| FISCO BCOS as national-standards-friendly open source | FISCO BCOS: 5,000+ institutions, 100,000 developers, 600+ benchmark cases; co-hosted "2025 Blockchain National Standards Week" with TC590: https://www.cebnet.com.cn/20251225/102999648.html | Judges from this community will like a project that builds on FISCO BCOS in a real way, not a logo. v4 shows the logo, the contract and a hosted node |
| Platform features | The FISCO BCOS repo lists parallel execution, pluggable consensus, privacy algorithms, permission governance and OSCCA-approved (国密) algorithms: https://github.com/FISCO-BCOS/FISCO-BCOS | **Honest caveat: our keys are ECDSA secp256k1, not SM2** (`docs/technical-document.md` line 89, and listed as a known risk in `docs/05-security/threat-model-and-red-team.md`). Never imply 国密 in the video. Have a one-line answer ready for the defence: the platform supports SM mode, our app uses EVM-compatible keys so standard wallets work; moving to SM2 is a listed gap |
| Compliance and Hong Kong link | Chain governance side: 金链盟 signed co-operation with the Hong Kong Web3.0 Standardization Association (same cebnet URL) | A Hong Kong framing (HKMA, HK$) fits |

### 2.3 Past winners and what was praised

I found no page where a judge praises a specific project in this competition. What exists:

- **2019 (1st):** blockchain champion built an emissions-permit trading platform on FISCO BCOS: https://www.sohu.com/a/337076746_123753 (snippet-level).
- **2020 (2nd):** blockchain champion was a charity "time bank" using WeCross cross-chain; WeBank VP Ma Zhitao chaired the blockchain judges: https://blog.csdn.net/webankblockchain/article/details/109506920 (page returned an error when I fetched it; facts from search snippets, unverified at page level).
- **2021 (3rd):** blockchain champion "MedChain": proxy re-encryption, zk-STARK and BLS aggregation, on FISCO BCOS with Liquid and precompiled contracts. The team's own write-up says it led with technical strength (cryptography), then design and a complete scenario story, and used a recorded video of people using the product plus a prepared deck for the defence: https://cloud.tencent.com.cn/developer/article/1917386 (team's account, not a judge's). Takeaway: judges rewarded depth on FISCO BCOS and a clear story, and a recorded product walk-through worked.
- **2025 (7th):** AI-track champion was a no-code quantitative trading engine built on a finance LLM with a multi-agent design; a third-prize AI project was a multi-agent personal-finance assistant: https://m.dutenews.com/n/article/10315760 and https://www.hkust-gz.edu.cn/zh/2025/12/17/%E5%96%9C%E6%8A%A5%EF%BC%81%E6%88%91%E6%A0%A1%E5%AD%A6%E5%AD%90%E8%8D%A3%E8%8E%B72025-fintechathon%E6%B7%B1%E5%9C%B3%E5%9B%BD%E9%99%85%E9%87%91%E8%9E%8D%E7%A7%91%E6%8A%80%E5%A4%A7%E8%B5%9B%E9%87%91/?variant=zh-cn . Both articles give no scoring criteria and no judge comments (the second reports that coverage differs on whether the prize was "gold" or third prize; unverified). Scale: 1,709 students, 372 teams, 270 universities.

Signal for 2026: many agent projects will exist; **the trust and verifiability story is the differentiator**, and judges appear to value a finished, deployed system with a clear narrative.

### 2.4 Regulatory and market framing (what a Hong Kong expert would check)

- **e-HKD:** HKMA page revised 12 Oct 2026: the HKMA is prioritising the e-HKD for wholesale scenarios; for retail it has "not decided whether or when" to launch. https://www.hkma.gov.hk/eng/key-functions/international-financial-centre/fintech/central-bank-digital-currency/ . **Risk for the video:** the app's token is a "Mock e-HKD" test token and the attack line says "50 eHKD". A Hong Kong expert may read "e-HKD" as the HKMA's CBDC. Keep "test" wording near it and never say the HKMA issues it as retail money.
- **Project Ensemble:** same page lists four Ensemble publications "Published in October 2026" (Business Use Case Report, Taxonomy, Interoperability Standard, a carbon-credit cross-border DvP report); EnsembleTX is the pilot phase for tokenised deposits and money-market-fund transactions. I did not find exact publication dates. Ensemble is wholesale tokenised deposits, not agent payments; do not add it to the video except, at most, as a one-line "where this could plug in" in the deck.
- **Stablecoins Ordinance:** in force 1 Aug 2025; first two issuer licences 10 Apr 2026 (HSBC and Anchorpoint): https://www.centralbanking.com/central-banks/currency/digital-currencies/7975572/hkma-awards-hong-kongs-first-stablecoin-licences and https://www.about.hsbc.com.hk/news-and-media/hsbc-welcomes-hkmas-grant-of-a-hong-kong-stablecoin-issuer-licence (headlines confirmed via search; pages not opened). Our video does not use a stablecoin; keep it that way. The team's own research notes the mainland notice (Yinfa [2026] No. 42) bars "稳定币" and "RWA" in business names and scopes (`docs/03-research/market-regulation-webank.md`, unverified by me): avoid 稳定币 in any Chinese caption.
- **HK-Malaysia stablecoin workstream (2 Oct 2026):** https://fintechnews.hk/41128/blockchain/hkma-bnm-collaboration/ (headline only). The team is from Malaysia; a one-line mention in the deck might land, not the video.
- **Agentic payments pilot in Hong Kong:** on 27 Aug 2026 four Hong Kong regulators admitted 36 use cases to GenA.I. Sandbox++, including an "Agentic ID" payments project (HKT Payment with Red Date) with controls such as approved merchants, ceilings, revocation without closing the account, and audit of "which agent acted": https://www.pymnts.com/news/banking/2026/hong-kong-tests-know-your-agent-controls-in-payment-workflows/ . The same page says the sandbox will run "AI versus AI" experiments. This supports ChainBrain's pitch and gives a second public source for the "A.I. versus A.I." beat. It also means a Hong Kong expert may know a similar idea; ChainBrain's stated difference (the card itself checks every payment on-chain) is the point to keep.

---

## 3. HKMA and SFC since 16 Oct 2026

### 3.1 Verified: Carmen Chu, 16 Oct 2026

Primary page: https://www.hkma.gov.hk/eng/news-and-media/speeches/2026/10/20261016-1/ (opened).

- **Speaker and event:** Carmen Chu, Executive Director (Banking Supervision), HKMA; opening remarks at the Finance + A.I. Forum (HKMA with Cyberport), 16 Oct 2026. Matches `CREDITS.md`.
- **The four phrases exist, in these words and places:**
  - "anchored to intent": para 18 (under Accountability); intent-anchored accountability is called a prerequisite for intervention (para 19).
  - "A.I. versus A.I.": para 19, called a strategy supporting "meaningful human accountability".
  - "kill-switch": para 21 (under Resilience), as a way to suspend agents before an issue escalates; hedged ("where appropriate").
  - "securing the boundaries around an agent": para 23 (under Trust), also called the "agent harness".
- **There is no list of four principles and the word "principles" is not used.** The speech frames the HKMA's "ART" framework as three pillars (para 10): Accountability, Resilience, Trust. The speech never mentions payments, stablecoins or Project Ensemble.
- **So the video's "four principles" is our grouping.** The spoken line ("described governance for AI agents as anchored to intent, with kill switches, A.I. versus A.I., and secure boundaries") is a fair paraphrase. The on-screen title "The HKMA's four principles" and the credit "The video paraphrases them as four principles" are the weak points: "principles" is not Carmen Chu's word, and the line "ChainBrain covers all four" claims more than the speech asks for (kill switches are hedged; A.I. versus A.I. is a "useful strategy", not a requirement).

### 3.2 Other HKMA items

- **15 Oct 2026 press release, "ART" Framework:** updated supervisory guidance on responsible AI, an AI training-data sharing platform with Cyberport and the University of Hong Kong, further agentic-AI tests in GenA.I. Sandbox++, and a forthcoming discussion paper that explores "intent-anchored accountability", "a registry of material AI agents" and "effective intervention mechanisms"; more than 60% of second-cohort sandbox use cases explored agentic AI. https://www.info.gov.hk/gia/general/202610/15/P2026101500186.htm . Chinese release (traditional characters): https://www.hkma.gov.hk/chi/news-and-media/press-releases/2026/10/20261015-3/ ("「意圖為本」的問責安排", "有效介入機制", "重要A.I.代理紀錄冊").
- **Since 16 Oct (17-20 Oct):** I found no new HKMA or SFC statement on AI agents, agentic payments or GenAI; coverage dated 16-19 Oct repeats the 15-16 Oct items (for example https://www.hubbis.com/news/hkma-launches-art-framework-for-responsible-ai-adoption-in-banking, https://opengovasia.com/hkma-introduces-art-framework-for-responsible-ai-in-banking/). The HKMA press-release index was not browsed directly; **unverified** that nothing appeared on 20 Oct.
- **SFC:** nothing agent-specific found. The nearest: a 2 Jun 2026 circular on cybersecurity against frontier-AI-enabled threats (law-firm summaries: https://www.davispolk.com/insights/client-update/hong-kong-sfc-calls-enhanced-cybersecurity-measures-combat-ai-enabled and https://www.lexology.com/library/detail.aspx?g=05144ff3-78d0-45fa-b820-3918d4738382) and an older generative-AI language-model circular. SFC is one of the four regulators in Sandbox++ (https://www.fow.com/insights/sfc-hkma-launch-first-cohort-of-ai-sandbox-focused-on-agents). Not relevant to change the video.

### 3.3 A better way to show the same beat (no re-record)

The speech's own structure gives a cleaner mapping than "four principles":

| ART pillar (Chu) | Her phrase | ChainBrain feature (already in v4) |
|---|---|---|
| Accountability | "anchored to intent"; "A.I. versus A.I." | The task you confirm is what the server checks each payment against; the second AI watches |
| Resilience | "kill-switch" | Cancel mid-task, guardian-key freeze, Sentinel freeze |
| Trust | "securing the boundaries around an agent" | The card's own contract limits; eight layers |

Retitle to "Four ideas from the HKMA's 16 Oct remarks" or "The HKMA's ART framework, 16 Oct 2026" with the four rows under three headings. Same footage, text-only change.

---

## 4. Simplified Chinese subtitles

### 4.1 Would they help?

- **Rule position.** English is the official language and "submitted materials must include an English version" (rules item 4). That permits additional Chinese; it does not require it. The Chinese rule text prevails only for interpretation of the rules (Statement 04), not for the video.
- **Audience.** The panel is likely a mix of mainland academics, WeBank engineers and some Hong Kong or international judges (section 2.1). The competition runs in English, so Chinese is not needed to understand the video. Benefit: lower effort for a skimming reviewer, and a signal of effort for a Shenzhen audience. Confidence: modest benefit, small risk if the translation is checked.
- **Risks.** (1) A wrong or stiff translation damages credibility more than none; (2) a second subtitle line crowds a frame that already has burned English at up to 18 characters a second and dense UI; (3) it could be read as the video not working in English alone (unlikely).

### 4.2 State of the draft

`video/remotion/src/subs-zh.json` exists with `"enabled": true`, draft by Claude, "a team member who reads Chinese must check every line before it ships". That is the right rule. I recommend:

- **Ship burned-in Chinese only if** a named team member who reads Chinese has checked every line, in the rendered video, not only in the JSON. Otherwise set `enabled` to false and ship the English video only.
- **Safer split if time is short:** keep the main MP4 English-only with English subtitles (what the rules ask for), and add the Chinese as a sidecar file (`.zh.srt`) next to the English `.srt` that is already produced. Whether the organisers accept extra files is unknown: ask in the submission email, one line.
- **Honest label.** In the video description, `CREDITS.md` and the submission email: "Chinese subtitles: drafted with AI assistance, checked by [name]". On screen, no badge needed. Never write "professional translation".

### 4.3 Terminology to use (mainland judges, simplified characters)

| English | Use | Notes and source |
|---|---|---|
| FISCO BCOS | FISCO BCOS (飞梭链 optional on first mention) | WeBank's own text pairs "飞梭链FISCO BCOS": https://www.cebnet.com.cn/20251225/102999648.html . Keep Latin letters in captions |
| smart contract | 智能合约 | Standard mainland term; HKMA Chinese pages use traditional 智能合約 (not verified on an HKMA page) |
| on-chain | 链上 | Standard; no official glossary found |
| block / transaction hash | 区块 / 交易哈希 | Standard usage |
| e-HKD | 我们的是 "模拟 e-HKD（测试代币）" | The HKMA's e-HKD is 数字港元 (unverified on an HKMA page here). Our token is a mock. Do not write plain 数字港元 for it |
| HK$ | 港元 (HK$) | |
| AI agent | 智能体 (mainland) ; HKMA's Chinese release uses "A.I.代理" | The current draft uses 代理, which reads as Hong Kong style. For Shenzhen judges use 智能体; usage claim is from general mainland tech press, not verified by a count |
| HKMA | 香港金管局 / 香港金融管理局 | |
| ART framework | 「ART」框架：问责、韧性、可信赖 | Simplified rendering of the traditional terms in the HKMA Chinese release (問責, 韌性, 可信賴) |
| anchored to intent | 意图为本 | Simplified of 「意圖為本」 in the same release |
| kill switch | 终止开关 / 紧急停止 | HKMA release has no Chinese for it; judge a natural term with your reader |
| Carmen Chu | keep "Carmen Chu" | I could not confirm her official Chinese name (the Chinese speech URL I tried returned 404). Do not guess |
| x402, Claude, ChatGPT, Exa, CoinGecko | keep Latin | Brand names |
| stablecoin | avoid 稳定币 in captions and titles | Team's own research says mainland Notice No. 42 bars it in business names and scopes (unverified by me) |

### 4.4 Layout norms

- **No authoritative norm found** for "English above, Chinese below" or for keeping proper nouns in Latin (my search returned none), so follow the common practice, not a rule: English on top, Chinese below, brand names in Latin.
- **Line length.** Netflix's timed-text spec gives 16 characters per line for Simplified Chinese (https://backlothelp.netflix.com/hc/en-us/articles/215274938-What-is-the-maximum-number-of-characters-per-line-allowed-in-Timed-Text-assets). One vendor blog cites 13-15 characters and a single Chinese line, second-hand (https://subanana.com/hk/blog/five-points-to-note-when-creating-video-subtitle). Keep each Chinese line at or under 16 characters, one line, and split long sentences at clause breaks. The draft has several longer lines (for example the "它当着你的面生成这张卡，每条规则都由你批准" line is 20 characters): split them.
- **Font and size.** PingFang SC is already in the credits; Chinese line at about the English size, lighter weight so it reads as secondary. Check against the UI crops that the Chinese line never covers the app's text.
- **Timing.** Chinese reads faster per idea than English at the same speed; the existing English timing (up to 18 characters a second) is generous for Chinese, so no retiming should be needed.

---

## 5. Ranked changes

Effort: S under 15 minutes, M up to 1 hour, L more. Confidence is that the change raises the score or avoids a deduction.

| # | Change | When | Effect | Confidence | Effort |
|---|---|---|---|---|---|
| 1 | **Retitle the HKMA beat** from "four principles" to "four ideas from the HKMA's 16 Oct remarks" (or the ART mapping in 3.3); change the voice "ChainBrain covers all four" to "ChainBrain has a feature for each"; edit the credit line to match. A one-sentence voice change needs a regenerated line and a re-mix | before the deadline | Removes a factual mislabel a Hong Kong judge could check in two minutes; a regulator mislabel reads as a compliance error | High | S (title, credit) to M (voice) |
| 2 | **Tie a real hash to the task** in the X-ray and proof scenes: hold a full hash on screen at least 3 s with the explorer URL, one voice or caption line that every payment and refusal in the evidence file has a hash, and the three chips (asset management, transaction execution, risk control) | before the deadline | Targets the 40-point criterion; Topic F is scored on hashes | High | M |
| 3 | **Name the rubric's words** on screen: Prompt injection, Data extraction, Privilege escalation, Induced transfer on the attacks; Clarification, Fallback, Correction on the interaction beats (only where the footage shows them) | before the deadline | Makes the 30 + 30 point scoring easy to tick | Medium-high | S-M (text overlays) |
| 4 | **Do not burn in the Chinese draft** unless a Chinese-reading team member checks every line today; otherwise set `enabled` false and keep the sidecar | before the deadline | Avoids a credibility loss from unchecked translation | High | S |
| 5 | **Say it is live and deployed** in one plain line near the end ("a live version on a hosted FISCO BCOS chain; the link is in our documents"), keep the test-money footer | before the deadline | Aims at the 0-5 bonus ("demonstrated real-world deployment") without overclaiming | Medium | S |
| 6 | **Keep "test" next to e-HKD**: say "test token" once, caption "Mock e-HKD" where the attack order shows 50 eHKD | before the deadline | A Hong Kong expert may read e-HKD as the HKMA's CBDC, which has no retail launch decided | Medium | S |
| 7 | **Do not imply 国密/SM2** anywhere; prepare the defence answer (platform supports SM mode, ours uses ECDSA secp256k1 for EVM compatibility, a listed gap) | before the deadline (check only) / after (defence) | Avoids a technical-credibility hit with FISCO engineers; v4 makes no such claim | High | S |
| 8 | **If Chinese ships:** switch 代理 to 智能体, split lines over 16 characters, add "drafted with AI assistance, checked by [name]" to the credits and submission email, ask the organisers in the email whether a Chinese sidecar is welcome | before the deadline (only if a checker exists) | Reads native to Shenzhen judges; honest label | Medium | M |
| 9 | Add a tiny title chip in the first 3 s: "ChainBrain: an AI Card for agents (Topic F)" | before the deadline if time | Helps a skimming reviewer place the video | Low | S |
| 10 | In the deck and defence, not the video: the Hong Kong Sandbox++ "Agentic ID" pilot and "AI versus AI" experiments as external validation; Ensemble and e-HKD wholesale focus as the long-term settlement path | after | Strengthens the Q&A and the Hong Kong framing | Medium | S |
| 11 | Re-check the HKMA press-release index and the SFC circular page on 21-22 Oct for any new agent statement; if the discussion paper lands, add a one-line deck reference | after | Keeps the regulatory beat current for finalists | Medium | S |
| 12 | Defence prep from past winners: a recorded walk-through plus a clear story worked before; prepare FISCO-specific talking points (contracts, chain id 20200, 3.16.4, why a permissioned chain, parallel execution, permission governance) | after (finals, 22 Nov) | The panel likely includes people who know FISCO BCOS well | Medium | M |

Unverified or needing a human:

- Names and composition of the 2026 International Track judges.
- Whether extra files (a Chinese `.srt`) are accepted, and the file size and naming rules; the organisers' email is the only way to settle both.
- The Chinese official name of Carmen Chu and the HKMA's wording of "kill switch" in Chinese.
- Whether any HKMA or SFC release appeared on 20 Oct.

## Addendum, 20 Oct early morning (main overnight session)

- **HKMA press releases.** The press-release index (https://www.hkma.gov.hk/eng/news-and-media/press-releases/) lists nothing after 15 Oct 2026 and was last revised that day. The latest AI item is still the "ART" Framework (https://www.hkma.gov.hk/eng/news-and-media/press-releases/2026/10/20261015-3/).
- **Other regulators.** A web search found no HKMA or SFC statement on AI agents dated 16–20 Oct. The nearest items are older:
  - the GenAI Sandbox++ first cohort, focused on agentic AI (https://www.fow.com/insights/sfc-hkma-launch-first-cohort-of-ai-sandbox-focused-on-agents, Aug 2026)
  - Linklaters' September 2026 bulletin (https://techinsights.linklaters.com/post/102o0io/asia-fintech-payments-regulatory-bulletin-september-2026)
- **What it means for the video.** The HKMA beat needs no update for new statements. Re-check on 21–22 Oct for the finals deck.
