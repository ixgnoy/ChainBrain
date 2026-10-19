# Accuracy audit of the demo video (v4, 4:46.5)

Audited 20 Oct 2026 against the two submission PDFs (page refs are the PDFs' own page numbers), `docs/submission/redteam/hosted-proof.json`, `docs/evidence-fisco-railway.json`, the contract (`contracts/src/Pocket.sol`), `shared/sim/*`, `server/src/sellers.json`, and the live web. Ratings: OK / AMBIGUOUS / OVERSTATED / WRONG. Suggested wording avoids "not X, because Y", colon reveals and arrows.

Scope notes
- `tts/lines.json`, `remotion/src/vo-lines.json` are identical (43 lines). The spoken text equals the SRT word for word (534 words each, zero diffs). One deliberate exception: the TTS input for line `t1` is respelled ("June Chuen", "Yong Shee") so the voice says the names right; subtitles and script keep the real spelling. Listen to it once.
- The brief mentions a "US$41,269 counter". It does not exist in the current sources. The hook counter runs from US$150,000 to US$0 (`scenes/V3.tsx:92-101`). Check you are auditing the right render.
- The SRT audited is `/Users/user/Workspace/Projects/shenzhen/chainbrain-github/video/out/InternationalAI-ChainBrain-DemoVideo.srt` (main checkout).

## 1. Claim table

| # | Where | Claim (voice / screen) | Rating | Evidence | Suggested fix (spoken wording) |
|---|---|---|---|---|---|
| 1 | x1-x7, V4 `CHECKS` | The card runs eight checks: exact payment, agent signed, not frozen or cancelled, seller on your list, under the limit, enough balance, within the allowance, your signature if above ask-me | OK | Tech PDF p8 (card checks, same order); Security PDF p6 ("What the card checks", 1 to 8); `Pocket.sol:77-87,124-141` (digest, agent sig, revoked/frozen/expired, seller, cap, balance, period, owner sig). Screen label drops "expired", harmless. The token's own time-window and one-time-number checks are extra and sit in the token layer. | Keep. |
| 2 | y1 | "every payment goes through eight layers" | OK | Tech PDF p10 lists 8 layers (AI agent, wrap/scan, task check, Radar, Sentinel hold, signing rule, card contract, token). V4 `LAYERS` matches. | Keep. |
| 3 | y1-y2, bracket | "Six run on our server and make the agent behave. The last two are on-chain" | AMBIGUOUS | Layer 1 is the AI agent itself ("can be fooled", p10) so it cannot make itself behave. Also layers 3-6 are marked "skipped if the server is broken". Count 6+2 is right. | "Six of them run on our server, and the AI is the first of those. The last two are on-chain, and they hold even if our whole server is taken over." On screen change the bracket to "on our server" only. |
| 4 | y2 | "they hold even if our whole server is taken over" | OK with caveat | Tech PDF p9 "the whole server" column; Security PDF KR-01: attacker can sign as any agent but only inside each card's rules. A takeover can still spend up to the cap and allowance at allowed sellers. | Add to y3 or leave; the "still capped" line already covers it. |
| 5 | x6 | "the token asks the card" | OK | Tech PDF p8 (ERC-1271 `isValidSignature`); `Pocket.sol:124`; token asks the card at transfer time (EIP-3009). | Keep. |
| 6 | x2 | "The AI never holds a key" | OK | Security PDF p2 (AI agent "hold a key": cannot); no tool returns a key (Tech p4). | Keep. |
| 7 | x2 | "our server keeps one agent key for each card" | AMBIGUOUS | Tech PDF p9: the agent key is derived on demand from a master secret and the card id and never stored. "Keeps" suggests a stored key. KR-01: master secret stolen means every agent key. | "our server derives a separate agent key for each card." |
| 8 | x2 | "The owner key stays on your phone" | OK | Tech p9; the web console keeps it in the browser but the film is phone-only. Screen footer says Keychain or Keystore (iOS/Android, matches "phone secure storage"). | Keep. |
| 9 | y3, V4 stolen | "The guardian key can only freeze" and "only you can unfreeze" | OK | `Pocket.sol:26,159-170` (freeze: owner or guardian; unfreeze and revoke: `onlyOwner`). Tech p9 table. Caveat: freeze only exists on-chain if `SENTINEL_PK` is set; without it the Sentinel only "holds" (Tech p10; `sentinel/index.ts:13`). I could not confirm the hosted Railway env has it set. | Confirm on Railway before the deadline. If it is unset, change the watcher line to "it holds the card, and only you can release it" or set the key. |
| 10 | w3 / "Only stricter" | "It can only make your rules stricter, never looser" | AMBIGUOUS | Memory can only tighten (Tech p6, p10); the Sentinel can only hold or freeze and never lower a decision (p10); Radar only refuses. Strictly these tighten what the agent may do, they do not rewrite "your rules". A judge can read "rules" as the card's stored rules. | "The second AI can only hold or block a payment, and it can never loosen a limit." |
| 11 | x6a, Contrast | "Many agent wallets check their limits on the wallet company's server." | AMBIGUOUS | Supportable: Coinbase agentic wallets send each signing request through a policy engine and enclave on Coinbase's side (eco.com explainer, cobo.com comparison); Privy offers spending limits via its policy engine (docs.privy.io agent-wallets, enforcement location not stated). Counter-examples exist: smart-account session keys and spend permissions enforce on-chain. Also our own server checks first (Tech p2: "Our server checks first too"). Only secondary sources found, so unverified against vendor docs. | "Some agent wallets enforce their limits on the wallet company's server. Here the limit sits in the card itself, and the token asks the card." Screen: "some", not "many". |
| 12 | u1, Main | "Right now that's Exa for search and CoinGecko for prices, over x402" and board node "Exa answers HTTP 402 with a price" | OVERSTATED | The sellers are our own test sellers (`server/src/sellers.ts:120-122`, `sellers.json` with invented payTo addresses; Tech p4 "8 x402 test sellers"; CREDITS names only DataPro, Harbour Wines, ShadyFeed, TradeWire as fictional but Exa, CoinGecko and Nansen are also stand-ins at their published prices; `shared/sim/seed.ts:17`). Exa did not receive money. A judge who knows x402 could say we imply real Exa and CoinGecko integrations. | "Right now our test sellers stand in for Exa and CoinGecko, at their real prices, over x402." Board: "Test seller, priced like Exa". Add "test seller" under logos in the first-payment caption. |
| 13 | u0 | "If the job is unclear, it asks one question first." | OVERSTATED | Scripted agent on the built-in network asks (`scenes.ts:29`). Security PDF p5: with the live model, clarifying questions asked "0 in 24 runs" and it "skips the clarifying question". The hosted app uses the live model by default. | "In the demo, when the job is unclear, it asks one question first." |
| 14 | u4 | "A seller that isn't on your list gets refused, and the agent finds another way." | AMBIGUOUS | Refusal is solid (hosted-proof). "Finds another way" is the scripted demo (`scenes.ts:50`); Security PDF p5 scene 4: the live model "won't switch sellers on its own", it reads the refusal and asks the owner. | "gets refused, and the agent re-plans or asks you." |
| 15 | u3 / Main:66 | "negotiates ... twelve Hong Kong dollars to eight eighty", HK$12.00 to HK$8.80 | AMBIGUOUS | Numbers match `catalog.ts:102` (price 12.00, floor 8.80) and `scenes.ts:99`. DataPro is a fictional seller and the haggle runs on the built-in network. On the hosted chain DataPro cost HK$11.70 (hosted-proof). Spoken "eight eighty" is easy to mishear. | "from twelve Hong Kong dollars down to eight dollars eighty, with a test seller." On screen add "test seller". |
| 16 | r1, Main:67 | "you can cancel it mid-task and the money comes back" | OVERSTATED | Security PDF p2: revoke stops the next payment, `returnFunds` takes the whole remaining balance back; "a settled payment can't be reversed"; p7: revoke does not stop a payment already settling. Two owner steps, and money already paid does not return. | "It's your card, so you can cancel it mid-task and take back what's left." Screen caption: "what's left comes back". |
| 17 | x7 / packet / ex-success | "HK$0.056 settles" then receipt "block 11, HK$2.30 to DataLite" | AMBIGUOUS | Block 11 tx `0x15b0d30f…f9333` is in `evidence-fisco-railway.json` (agent key alone, DataLite), the screenshot reads block 11, HK$2.30, success. The label says "the same path". But the board packet says HK$0.056, so the viewer may expect the hash of that payment. | Screen label: "a real payment on the same path, our hosted chain: block 11, HK$2.30 to DataLite." Voice: "...it settles on FISCO BCOS, like this real one, and anyone can open the hash." |
| 18 | k5, ex-reverted | Block 13 reverted forced transfer; "Balance HK$26.00 unchanged" on the card | AMBIGUOUS | Tx `0x91525ada…7745` is in `evidence-fisco-railway.json` as "scene 5 backstop", status reverted, block 13 shown. The HK$26.00 balance and the card tail 0x33Dc…3356 belong to the other hosted proof card (token `0x2299…`, hosted-proof.json), whereas block 13 is on token `0x0355…`. Security PDF p7 notes the app's deployment is an earlier contract build. The explorer page shows no amount, so "HK$50.00 to 0x…ABC0" on the illustration is not what the receipt itself shows. | Drop "unchanged" balance line or label the illustration "illustration". Voice is fine. |
| 19 | k3-k5 | "we fool the agent on purpose ... The agent was fooled." | AMBIGUOUS | Security PDF p3-5: the 55 worst-case tests replace the AI with a stand-in or sign with the agent key straight to the chain. The live model was never fooled (0 of 8). A sceptic could say the AI was not really fooled. | "Worst case, we pretend the agent was fooled and force its key to send the money. The card says no. Even a fooled agent can't pay outside the rules." |
| 20 | f1 / Proof | "all seven forbidden payments were rejected", on-screen "7 of 7 forbidden payments" | OVERSTATED (small) | hosted-proof.json has 7 reverts, matches 7 of 7, but two are rule edits (`setCap` to HK$800, add the planted seller) and one is the agent signing as the owner. Only four or five are payments. Screen list itself says "Raise its own limit" and "Add the planted seller". | "all seven forbidden attempts were rejected." Screen: "7 of 7 forbidden attempts". |
| 21 | f2 / Big "63" | "We attacked our own wallet sixty-three times and didn't lose a single dollar" | AMBIGUOUS | 63 = 55 worst-case tests + 8 live-model runs (Security p1, p3-5); each attack is one test function (Appendix). It is test money, "dollar" vs HK$. "Wallet" vs card. | "We ran sixty-three attack tests against our own cards and lost nothing." Screen already says "HK$0 lost", fine. |
| 22 | f3 / Big "462" | "all four hundred and sixty-two automated tests pass", "7 suites" | AMBIGUOUS | Tech p13 and Security p6: 126+92+79+67+61+21+16 = 462, "run 19 Oct". Commits after the PDFs changed tests: `server/test/coingecko-live.test.ts` (new, 1 test) and `starter-chain.test.ts` (f33f154, eea935f, 20 Oct). The server count is probably 127 or more now. I could not run suites (no forge, no local FISCO node). | Re-run before submission. If it is 463, say "more than four hundred and sixty" or update the PDFs and video together. |
| 23 | Brain / Main:76 | Radar blocks TradeWire, risk 9/10 | OK | `scenes.ts:85` (built-in network scores TradeWire 9/10); Tech p10 scale: 8 or more refused. TradeWire is fictional. | Keep; the "recorded on our test setup" tag covers it. |
| 24 | w2 | "After repeated attempts, it freezes the card" | OK | Tech p10: 3+ suspicious refusals in 60 s freeze; sentinel-chain test (Security p2). | Keep (see row 9 for the hosted key). |
| 25 | G, n3 | "limits live in the card's own smart contract, on FISCO BCOS" | OK | Tech p8, p12. | Keep. |
| 26 | n2 | "Every agent, Claude, ChatGPT, or ours, gets its own AI Card" | AMBIGUOUS | Tech p11: "Pairing outside agents (Claude, ChatGPT) to a card exists only on the demo network for now." Hosted has only our agent. | "Claude, ChatGPT, or ours can each have their own AI Card, and the demo shows it." Or keep and rely on the tag. |
| 27 | x2, Node | "Claude Haiku 5.5" with Claude and OpenRouter logos | OK | Tech p3, p6 and `LLM_MODEL claude-haiku-5.5`; Security p3. The built-in network's phone footage uses a scripted agent (Tech p11), the tag says "recorded on our test setup" but not "scripted". | Tag text: "recorded on our built-in demo network, scripted agent". |
| 28 | Node | "7 tools, only one pays" | OK | Tech p4 (seven tools, only `pay` moves money). | Keep. |
| 29 | Hook, m1-m2 | "one post written in Morse code tricked an AI agent into emptying its wallet"; counter from US$150,000 to US$0; "about US$150,000 in tokens (source: OECD AI Incidents Monitor)" | AMBIGUOUS | OECD page (oecd.ai/en/incidents/2026-05-04-4a73) says an X post in Morse tricked Grok and Bankrbot into transferring 3 billion DRB, "worth $150,000-$200,000", harm line "approximately $155K-$180K". So about US$150,000 is the low end and defensible. But the source says a transfer of tokens from a Grok-linked wallet, not that the wallet was emptied, and the animation shows it going to exactly zero. | "Back in May, one post written in Morse code tricked an AI agent into sending away about a hundred and fifty thousand dollars of tokens." Counter ends on "sent away US$150,000+", not US$0. Label "US$150,000 to US$200,000, reports vary". |
| 30 | m3, Stat | Accenture: 74% "would let an agent handle routine tasks", 9% "would let it buy on its own", "25,590 people in 16 countries, including Hong Kong", "June 2026" | AMBIGUOUS | Accenture page (accenture.com/gb-en/insights/consulting/talk-my-ai-agent): 25,590 consumers, 16 countries, fieldwork 7-22 Jan 2026; 74% appears for trusting an agent over a best friend and also in Figure 1 "Task Execution"; the 9% reads "would empower an agent to act autonomously within defined boundaries". Hong Kong is reported together with Mainland China as one entry. The page gives no publication date; secondary outlets say 3 June 2026. | Voice is fine. Screen: "Accenture, Talk to My AI Agent, 2026: 25,590 consumers, 16 markets (Hong Kong with mainland China), surveyed January 2026". Add "within set limits" to the 9% label. |
| 31 | h1-h2, Hkma | "the HKMA's Carmen Chu described governance for AI agents as anchored to intent, with kill switches, A.I. versus A.I., and secure boundaries. ChainBrain covers all four." Screen: "four principles", "Remarks ... on governing AI agents" | AMBIGUOUS | HKMA speech "Opening Remarks at Finance + A.I. Forum", 16 Oct 2026, Carmen Chu (hkma.gov.hk/eng/news-and-media/speeches/2026/10/20261016-1/). Phrases present: "anchored to intent" (para 18), "kill-switch" mechanisms "where appropriate" (21), "A.I. versus A.I." as "a useful strategy" (19), "securing the boundaries" (23). They sit under three themes (accountability, resilience, trust; the "ART" framework, HKMA press release 15 Oct 2026). So they are four ideas, not four official principles, and the on-screen subtitle is not the speech title. The footer disclaimer is good. | "In October, the HKMA's Carmen Chu named four ideas for governing AI agents. Anchored to intent, kill-switches where needed, A.I. versus A.I., and secure boundaries. ChainBrain has a feature for each." Screen: "four ideas", and use the real title "Opening Remarks at Finance + A.I. Forum". |
| 32 | Hkma rows | "Kill-switches: freeze or cancel a card, on-chain, at once" | OK | `Pocket.sol:159-178`. | Keep. |
| 33 | z1, Closing | "Give your AI a card, not your wallet." URLs | OK | Tech p1 (console mirror and repo URLs). | Keep. |
| 34 | t1 | Team names and universities | OK | Tech/Security cover pages and prompt brief. TTS respelling noted above. | Keep; listen to names once. |
| 35 | Facilitator | "the seller's facilitator sends it to the chain"; board puts the Facilitator in the SELLER lane | AMBIGUOUS | Tech p9 key table: Facilitator key lives on "The server" and tech p3 diagram shows it under outside parties. Code: `sellers.ts` imports our own `facilitator.ts`. In the test setup it is ours. | "and a facilitator sends it to the chain." Board: place Facilitator between the seller and the chain without a lane claim, or label "our test facilitator". |
| 36 | n4, w1 | "a second AI watches every payment" | OK | Sentinel's model reads a fixed summary (Tech p10); Radar screens each seller. | Keep. |
| 37 | Hook footer | Source line "OECD AI Incidents Monitor" | OK | URL in CREDITS.md resolves (fetched). | Keep. |

## 2. External sources

| Fact | Source 1 | Source 2 | Status |
|---|---|---|---|
| Morse-code drain, 4 May 2026, about US$150,000 | OECD AIM entry: 3 billion DRB, "worth $150,000-$200,000", Grok and Bankrbot, Base wallet | Several outlets in web search (Giskard $150K-$174K; Valens/AMBCrypto $155K-$180K; KuCoin flash misreports 175,000 DRB) | Verified, amount range wide, tokens not "wallet emptied" |
| Accenture 74% / 9%, 25,590 people, 16 countries | Accenture "Talk to My AI Agent" page | letsdatascience.com and outsourcing-today.ro coverage (secondary) | Verified with wording caveats (rows 30). Publication date "June 2026" only from secondary coverage. |
| Accenture includes Hong Kong | Accenture page lists "Mainland China and Hong Kong" as one entry | none | Verified, grouped |
| HKMA Carmen Chu, 16 Oct 2026, four ideas | hkma.gov.hk speech page (all four phrases found) | HKMA press release 15 Oct 2026 (ART framework, intent-anchored accountability) | Verified, wording caveats (row 31) |
| "Many agent wallets check limits on the wallet company's server" | eco.com Coinbase Agentic Wallets explainer, cobo.com comparison (policy engine plus enclave) | Privy docs agent-wallets page (limits exist, location not stated) | Partly verified, secondary only; no vendor policy docs fetched |

## 3. Subtitles against voice lines

Word-by-word comparison of all 58 cues with the 43 voice lines: 534 words each, no insertions, deletions or changes (case and punctuation ignored). The subtitle text matches the script's voice-over column too.

Problems with timing and breaks
- Above 17 characters a second: cue 20 (97.81-101.20, 61 characters in 3.39 s, 18.0 cps). SCRIPT.md claims "at most 18"; it sits on the limit. Fix by extending the cue to about 3.7 s (the next cue starts at 101.22, so shorten the gap or trim the cue 21 start) or split after "payment".
- Shorter than 1 s: none (shortest is cue 34 at 1.71 s).
- Awkward breaks: cues 7/8 leave "on FISCO BCOS." alone for 2.5 s (5.6 cps, reads as an orphan); cues 50/51 split "with kill switches, A.I." from "versus A.I., and secure boundaries." Rebreak to "...anchored to intent, with kill switches," / "A.I. versus A.I., and secure boundaries."
- Long lead-ins before speech are fine; all gaps are at least 0.02 s.

### Characters per second, every cue

| Cue | Start | End | Dur s | cps | Flag | Text |
|---|---|---|---|---|---|---|
| 1 | 0.55 | 3.94 | 3.39 | 12.7 |  | Back in May, one post written in Morse code |
| 2 | 6.05 | 10.24 | 4.19 | 10.7 |  | tricked an AI agent into emptying its wallet. |
| 3 | 12.45 | 16.19 | 3.74 | 13.9 |  | Most people would let an agent handle routine tasks. |
| 4 | 16.21 | 19.76 | 3.55 | 13.0 |  | Only nine percent would let it buy on its own. |
| 5 | 21.85 | 26.68 | 4.83 | 10.1 |  | This is ChainBrain. We give your AI its own card. |
| 6 | 28.85 | 35.20 | 6.35 | 9.4 |  | Every agent, Claude, ChatGPT, or ours, gets its own AI Card. |
| 7 | 35.45 | 38.79 | 3.34 | 14.7 |  | Its limits live in the card's own smart contract, |
| 8 | 38.81 | 41.32 | 2.51 | 5.6 |  | on FISCO BCOS. |
| 9 | 41.57 | 45.20 | 3.63 | 10.5 |  | And a second AI watches every payment. |
| 10 | 46.95 | 49.85 | 2.90 | 11.0 |  | Tell it the job in one sentence. |
| 11 | 51.90 | 56.73 | 4.83 | 14.3 |  | It builds the card right in front of you, and you approve every rule. |
| 12 | 59.84 | 63.07 | 3.23 | 11.8 |  | Slide to approve, and the card's live. |
| 13 | 64.75 | 69.10 | 4.35 | 11.5 |  | If the job is unclear, it asks one question first. |
| 14 | 70.15 | 72.69 | 2.54 | 13.0 |  | It pays small amounts on its own. |
| 15 | 72.71 | 79.38 | 6.67 | 10.2 |  | Right now that's Exa for search and CoinGecko for prices, over x402. |
| 16 | 80.45 | 82.96 | 2.51 | 10.0 |  | Let's X-ray that payment. |
| 17 | 83.01 | 88.67 | 5.66 | 14.8 |  | The owner key stays on your phone, and our server keeps one agent key for each card. |
| 18 | 88.69 | 91.60 | 2.91 | 8.6 |  | The AI never holds a key. |
| 19 | 91.65 | 97.76 | 6.11 | 10.6 |  | The AI picks a seller, and the seller names its price, over x402. |
| 20 | 97.81 | 101.20 | 3.39 | 18.0 | >17 | Our server checks the payment against the task you confirmed, |
| 21 | 101.22 | 104.48 | 3.26 | 13.5 |  | traces the seller's money, and simulates it. |
| 22 | 104.53 | 108.48 | 3.95 | 14.4 |  | Then the agent key signs one exact payment from the card, |
| 23 | 108.50 | 112.00 | 3.50 | 14.6 |  | and the seller's facilitator sends it to the chain. |
| 24 | 112.15 | 116.83 | 4.68 | 14.7 |  | Many agent wallets check their limits on the wallet company's server. |
| 25 | 116.85 | 122.87 | 6.02 | 12.8 |  | Here the token asks the card, which runs eight checks before any money moves. |
| 26 | 123.32 | 130.23 | 6.91 | 10.6 |  | All eight pass, so it settles on FISCO BCOS, with a hash anyone can open. |
| 27 | 133.25 | 138.00 | 4.75 | 14.5 |  | Above your ask-me limit, the card needs you to co-sign on your phone. |
| 28 | 138.95 | 141.97 | 3.02 | 15.2 |  | A seller that isn't on your list gets refused, |
| 29 | 141.99 | 144.82 | 2.83 | 11.3 |  | and the agent finds another way. |
| 30 | 145.37 | 151.40 | 6.03 | 13.8 |  | The agent negotiates the price down, from twelve Hong Kong dollars to eight eighty. |
| 31 | 151.55 | 156.70 | 5.15 | 13.8 |  | It's your card, so you can cancel it mid-task and the money comes back. |
| 32 | 157.45 | 159.72 | 2.27 | 8.8 |  | Now, let's break it. |
| 33 | 160.55 | 165.17 | 4.62 | 11.9 |  | We try hidden orders, data requests, even a fake admin. |
| 34 | 165.19 | 166.90 | 1.71 | 9.9 |  | None of it works. |
| 35 | 167.95 | 173.02 | 5.07 | 14.2 |  | Worst case, we fool the agent on purpose and it tries to send the money. |
| 36 | 173.57 | 175.60 | 2.03 | 8.4 |  | The card says no. |
| 37 | 176.45 | 178.35 | 1.90 | 11.1 |  | The agent was fooled. |
| 38 | 178.37 | 181.68 | 3.31 | 13.0 |  | The card still won't pay outside its rules. |
| 39 | 183.95 | 187.61 | 3.66 | 15.0 |  | That's because every payment goes through eight layers. |
| 40 | 187.63 | 191.34 | 3.71 | 12.9 |  | Six run on our server and make the agent behave. |
| 41 | 191.59 | 197.62 | 6.03 | 13.3 |  | The last two are on-chain, and they hold even if our whole server is taken over. |
| 42 | 198.85 | 202.50 | 3.65 | 13.7 |  | If someone steals an agent key, it's still capped. |
| 43 | 202.52 | 208.07 | 5.55 | 13.9 |  | The guardian key can only freeze, and your owner key never leaves your phone. |
| 44 | 209.35 | 213.94 | 4.59 | 11.3 |  | The second AI checks every seller and every payment. |
| 45 | 214.61 | 216.88 | 2.27 | 9.7 |  | It learns how you buy. |
| 46 | 218.08 | 221.30 | 3.22 | 14.0 |  | After repeated attempts, it freezes the card, |
| 47 | 221.32 | 224.19 | 2.87 | 10.1 |  | and only you can unfreeze it. |
| 48 | 225.55 | 229.89 | 4.34 | 11.7 |  | It can only make your rules stricter, never looser. |
| 49 | 231.55 | 239.05 | 7.50 | 12.1 |  | In October, the HKMA's Carmen Chu described governance for AI agents as anchored to intent, |
| 50 | 239.07 | 240.89 | 1.82 | 13.2 |  | with kill switches, A.I. |
| 51 | 240.91 | 244.62 | 3.71 | 9.4 |  | versus A.I., and secure boundaries. |
| 52 | 244.87 | 247.70 | 2.83 | 9.5 |  | ChainBrain covers all four. |
| 53 | 249.25 | 255.60 | 6.35 | 11.8 |  | On our hosted FISCO BCOS chain, all seven forbidden payments were rejected. |
| 54 | 256.25 | 262.12 | 5.87 | 13.1 |  | We attacked our own wallet sixty-three times and didn't lose a single dollar. |
| 55 | 262.57 | 267.16 | 4.59 | 12.2 |  | And all four hundred and sixty-two automated tests pass. |
| 56 | 269.85 | 273.51 | 3.66 | 13.7 |  | We're Jun Quan and Hao Wen from Universiti Malaya, |
| 57 | 273.53 | 277.24 | 3.71 | 11.6 |  | and Yong Xi from Universiti Putra Malaysia. |
| 58 | 279.15 | 282.70 | 3.55 | 10.4 |  | Give your AI a card, not your wallet. |
