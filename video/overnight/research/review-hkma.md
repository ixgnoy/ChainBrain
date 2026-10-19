# HKMA policy-officer review of the demo video (20 Oct 2026)

Sources opened today: Carmen Chu, 16 Oct 2026 (https://www.hkma.gov.hk/eng/news-and-media/speeches/2026/10/20261016-1/) and the 15 Oct ART press release (https://www.hkma.gov.hk/eng/news-and-media/press-releases/2026/10/20261015-3/). Read: SCRIPT.md, tts/lines.json (h1, h2, x7, r1, k2, f1-f4), frames hkma-244, leg-243, leg-259, live-264.5, tests-262, stat-19, revert-178.3.

## What the sources say (as I read them)
- ART = Accountability, Resilience, Trust. The press release calls it a framework and a foundation for banks. It does not say binding, non-binding, or approved, and it is about banks.
- Accountability: "governance must be anchored to intent"; she says intent-anchored accountability is a prerequisite for effective intervention. "A.I. versus A.I." is offered as a possible approach that supports human accountability.
- Resilience: "kill-switch" mechanisms to suspend agents, described as optional and for use where appropriate, next to other measures.
- Trust: "securing the boundaries around an agent" (the agent harness, turning risk appetite into limits).
- The speech has no mention of agent wallets, stablecoins, e-HKD or Ensemble. It says GenA.I. Sandbox++ will continue to support financial institutions.
- The press release also announces a forthcoming discussion paper on supervisory framework for agentic AI governance. Nothing newer was listed.

## 1. Is the HKMA beat accurate and fair?
Mostly yes. Voice h1 is a fair paraphrase of four phrases that really are in the speech. Title card, credit line and footer already say "four ideas", "our mapping, not a regulatory approval", with source and date. That is good practice.

Weak spots:
- h1 "described governance for AI agents as anchored to intent, with kill switches, A.I. versus A.I., and secure boundaries" reads as one list she gave. She spread these over three pillars, hedged two of them (kill switches optional, A.I. versus A.I. one useful approach), and addressed banks. A listener hears "four requirements".
- h2 "ChainBrain covers all four" with the on-screen ticks reads as a pass mark. The approved word "covers" is acceptable on its own. Pairing it with "all four" and four ticks is what pushes it toward a scorecard. I do not have strong evidence against "covers", so I keep it, and fix the surrounding words.
- Row 1 "every payment traces back to the task you confirmed" is true, but that check runs on the team's server (one of the six server layers), not on-chain. Fine for the claim, just do not let it be heard as on-chain.
- Row 2 "freeze or cancel a card, on-chain, at once" is a strong claim. "At once" is a promise about timing. Suggest "freeze or cancel a card on-chain".
- Row 3 is fair. Row 4 is fair.

Exact fixes (voice and screen):
- h1: "In October, the HKMA's Carmen Chu spoke about four ideas for governing AI agents. Anchored to intent, kill switches, A.I. versus A.I., and secure boundaries."
  If the one-sentence shape must stay: "In October, the HKMA's Carmen Chu spoke about governing AI agents. She talked about anchoring them to intent, kill switches, A.I. versus A.I., and secure boundaries."
- h2: "ChainBrain covers each of the four." (keeps "covers", drops the "all" scorecard sound), or "ChainBrain has a feature for each of the four."
- On-screen subtitle line under the title: "Remarks by Carmen Chu ... on governing AI agents" is accurate. Add "Her remarks were about banks." only if space allows. Optional.
- Footer, keep, and tighten: "Our mapping of four ideas from the speech. Not an HKMA statement, approval or assessment of ChainBrain. Source: hkma.gov.hk, 16 Oct 2026."
- Row 2: "freeze or cancel a card on-chain".

## 2. Phrasing a regulator would flag
| Where | Text | Concern | Fix |
|---|---|---|---|
| h2 + ticks | "covers all four" | Reads as meeting a standard | see above |
| Footer | "our mapping, not a regulatory approval" | Good. "Regulatory approval" invites "so what is it", fine | add "Not an HKMA statement" |
| x7 | "anyone can look it up by its hash" | The chain and explorer are team-hosted, so a hash is only visible to those who can reach our explorer. It is not a public chain | "and you can open it by its hash in our explorer, on our hosted chain." |
| r1 | "you can cancel it mid-task and get back whatever hasn't been spent" | Consumer promise on money. Test money only, and a refund guarantee is not something the demo can make for real funds | "It's your card, so you can cancel it mid-task. In our demo, whatever hasn't been spent goes back to your balance." Keep "test" on screen at that moment |
| k2 | "Nothing gets through" | Absolute | "None of these worked in our tests." |
| k5 | "can't pay outside the card's rules" | Fine as the contract claim, but it is a claim about the contract, not the whole system | acceptable |
| y2 | "keep every card inside its rules even if our whole server is taken over" | Strong and absolute, depends on audit | "hold even if our server is taken over, in our tests" or keep as is if the self-assessment backs it |
| f2 | "didn't lose a single dollar" | Test money, already said "with test money" | keep. Screen says "HK$0 lost" next to "test money": good |
| f4 | "You can try it today, on our hosted FISCO BCOS chain" | Fine. Says whose chain | keep |
| Attack order | "send 50 eHKD" and "HK$50.00" in the phone notice | A Hong Kong viewer may read e-HKD as the HKMA's CBDC. The slide footer "Mock e-HKD is test money, not the HKMA's e-HKD" fixes it, but only at the end | say "test token" once in k3 (below) |
| Stablecoins Ordinance | not mentioned | Good. Keep it out | none |

k3 fix: "Worst case, we play a fooled agent and use its key to send test money." (one word, same length)

The "Mock e-HKD" footer on the proof slide is the best line in the video for this audience. Keep it exactly. Cancel/refund and disclosure: the video shows consent (approve every rule), a co-sign, and cancel. It shows no fee, dispute or complaint route. Not needed for a 5-minute demo, but do not imply there is one.

## 3. Mention ART (Accountability, Resilience, Trust)?
Yes, lightly, as an organising label on the existing slide, no new footage and no new voice line. It helps because it shows the team read the primary source (the earlier research found the speech has no "four principles", only ART). It looks like name-dropping only if it adds time or claims a score.

Do this on screen only:
- Group the four rows under three small tags: Accountability (anchored to intent, A.I. versus A.I.), Resilience (kill-switches), Trust (secure boundaries). That matches paragraph structure: intent and A.I. versus A.I. are under Accountability.
- Subtitle: "From the HKMA's ART framework (Accountability, Resilience, Trust), as described in Carmen Chu's remarks, 16 Oct 2026."
- Keep voice at four ideas. If one spoken line is wanted, the h1 variant: "In October, the HKMA's Carmen Chu spoke about governing AI agents under three headings: accountability, resilience and trust. Four ideas stood out to us. Anchored to intent, kill switches, A.I. versus A.I., and secure boundaries." This is long (about 11 s); only use it if the beat has room, otherwise screen only.
Do not say ART "requires", "recommends" or "approves" anything. It is a framework for banks, and ChainBrain is not a bank.
Also fine for the deck, not the video: the forthcoming discussion paper on agentic AI governance, and that GenA.I. Sandbox++ is HKMA's test venue. Do not say or imply ChainBrain is in it.

## 4. Top 5 fixes
1. Before the deadline (small, text and one word): h2 to "ChainBrain covers each of the four." and strengthen the footer to "Not an HKMA statement, approval or assessment of ChainBrain."
2. Before the deadline (one line regenerated): x7 to "...and you can open it by its hash in our explorer, on our hosted chain." Removes the public-chain implication.
3. Before the deadline (one line): r1 to "It's your card, so you can cancel it mid-task. In our demo, whatever hasn't been spent goes back to your balance." Removes the consumer refund promise.
4. Before the deadline (one word): k3 "send test money". Keeps e-HKD confusion from the attack beat.
5. After: add the ART tags and subtitle on the HKMA slide, change row 2 to drop "at once", and soften k2 to "None of these worked in our tests." If time is tight, 5 can slip, since 1-4 are the ones a regulator would circle.

Re-check hkma.gov.hk on 21-22 Oct for the discussion paper before any finals deck. If it appears, a one-line deck mention is worth it, not a video change.

## Credibility of the governance story
Credible and the strongest part for this audience: owner key on the phone, agent keys held by the server and not the AI, guardian key that can only freeze, second AI that can only tighten, on-chain limits that hold if the server falls, refusal shown with a real reverted hash (block 13), and honest test-money labels. The one honesty point to keep in mind: the freeze depends on SENTINEL_PK being set (REPORT.md). If it is not, w2 must say "holds". Otherwise the kill-switch and "only you can unfreeze it" lines overclaim.
