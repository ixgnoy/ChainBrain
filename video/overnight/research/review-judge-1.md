# Judge review 1: prototypes P0 to P4

Reviewer stance: sceptical FinTechathon judge (Topic F), rubric open, security PDF open, watching on a laptop. I looked at every before/after pair in `overnight/frames/`. The frames are 960x540, so double every pixel figure below for 1080p.

Headline: the direction is right. Honesty fixes (P4) protect the 30 security points, and rubric words (P2, P3) make 60 points easy to tick. Three things need fixing before a render: sub-labels are too small and too dim, the 7/7 footnote collides with a two-line subtitle, and the new voice lines no longer match the headlines still on screen.

---

## P0 Subtitle break on "A.I. versus A.I." : KEEP

Before: the cue ends "versus A.I., and secure boundaries." with the first half of the sentence gone. After (zh-241): "with kill switches, A.I. versus A.I., and secure boundaries." on one cue, and it reads cleanly. Pure gain, no new risk.

Minor: the dim rows ("A.I. versus A.I.", "Secure boundaries") sit around 1.5:1 contrast while waiting to light up. That is intended as "inactive". It is fine as long as each row lights fully while the voice says it. Check that "Secure boundaries" is at full brightness on its word, since it was caught half-faded in both frames.

---

## P1 Chinese line under the English (off by default) : KEEP, stays OFF unless a Chinese reader signs off

Score effect: small plus for mainland and HK judges, small minus if any line is wrong. The shipping default is correct.

Problems seen in the frames:
1. A two-line English cue plus a Chinese line makes a three-line block about 75 px tall (1080p: 150 px). It rises over content. In acc-248 (7/7 frame) the block lands on the "Mock e-HKD is test money..." footnote and the two texts overprint. This is a real defect when ZH is on, and it hurts honesty, because the footnote is the test-money disclosure.
2. In zh-166.5 and interact-66 the block covers the phone's input bar. The v4 frames already cover it partly, but ZH makes it worse.
3. Chinese text is about 9 px in the frame (18 px at 1080p), and the grey-on-black backing box is faint. On a laptop in a browser window it is borderline.
4. Terminology. Frames show 代理 for agent ("AI 代理", "代理钱包"). The report says commit `399a15a` switched to 智能体. Re-render the check frames after that commit to confirm. 智能体 is the right word for mainland judges.
5. zh-166.5 line: "它真的试图把钱转走" adds 真的 ("really"), which the English does not say. A reader will not mind, but the checker should know.

Fixes:
- Reserve a subtitle safe zone. Anything else in the bottom 100 px (1080p: 200 px) must sit above y = 880. Move the "Mock e-HKD is test money" footnote up to y of about 850 at 1080p, or make it two short lines directly under the 7/7 block.
- Chinese line size 22 px at 1080p minimum, colour #D8D8D8, backing box at 70% black.
- Gate: ZH only goes on if a Chinese reader has checked all 43 lines. Do not enable on faith.

---

## P2 Rubric terms on the attack rail : KEEP WITH FIX

Score effect: plus. A judge scoring "prompt injection, data extraction, privilege escalation, induced transfer" sees each word attached to a visible refusal. That is the cheapest points in the video.

Mapping check:
- hidden orders = prompt injection. Fair.
- data requests = data extraction. Fair.
- fake admin = privilege escalation. Fair, and the phone shows it exactly ("I'm the admin. Raise the cap").
- forced payment = induced transfer. Fair. The 170 header "THE FOURTH ATTACK: A FORCED PAYMENT (INDUCED TRANSFER)" works.

Problems:
1. Legibility. The sub-labels are about 9 px in the frame (18 px at 1080p), mono, grey. The inactive one ("induced transfer" under "forced payment") is darker still, about 2.5:1 on near-black. On a laptop the player scales it below 12 px effective. It fails the "text too small" test.
2. The rail now has eight lines in a narrow block. It still fits, with the headline centred above, so no overflow. But the sub-label is the very thing the judge came for, and it is the smallest text on screen.

Fix:
- Sub-label size 22 px at 1080p (frame 11 px), mono, colour #A8A8A8 for done rows, #8A8A8A for the pending row, white at 85% for the active row. Keep the row pitch at 56 px at 1080p.
- Optional but cheap: set the sub-label in the same vermillion as "blocked" for the active row only, so the eye lands on "privilege escalation" while the card text says "refused, only you can change the card".
- Consider saying one rubric word aloud. For instance, in the line that introduces the attacks, "Four attacks: prompt injection, data extraction, privilege escalation, and a forced payment." Judges who listen with the rubric open will tick faster. Voice change is the owner's call, not required.

---

## P3 Clarification and fallback tags : KEEP WITH FIX

Score effect: plus, but it carries an honesty exposure that P4 half-fixes.

Seen: a small blue square-and-caps tag ("CLARIFICATION", "FALLBACK") above the headline. Clean, same language as the existing mono labels, no clutter. Size is about 10 px in the frame (20 px at 1080p), acceptable but at the low end.

Problems:
1. Headline and voice no longer agree. The interact frames still show "It asks one question first." and "the agent finds another way", but v4.1 voice says "it can ask you one question first" and "the agent re-plans or asks you". The headline is the largest text on screen, so it will be read as the claim. Change both headlines and subheads (see wording below).
2. Honesty. The security PDF (p5) says the live model asked zero questions in 24 runs. A judge who has read it and then sees a CLARIFICATION badge over a scripted demo will wonder. The "Phone recorded on our test setup" label is already there, so we are not lying, but the badge makes the claim louder. Add "(demo)" in the tag, or say "in the demo" in the subhead.
3. The rubric lists clarification, correction and fallback. Only two of the three are tagged. If any beat shows a user correcting the agent (for example the "In total, check the wallet" chip, or cancelling mid-task), tag it "CORRECTION". If there is none, do not invent one.
4. At 141 the FALLBACK tag sits over the refused screen with "Waiting for you...". The re-plan itself ("so I re-planned. Bought Exa's web search") appears a few seconds later, in the v4 frame. Make sure the tag stays up until the re-plan bubble is on screen, otherwise the fallback is claimed before it is shown.

Replacement wording:
- Tag: `CLARIFICATION, IN THE DEMO` (or keep `CLARIFICATION` and fix the subhead).
- Headline: "It can ask one question first." Subhead: "HK$0.80 in total, or per lookup?" (unchanged).
- Fallback headline: keep "Unlisted sellers get refused." Subhead: "it re-plans or asks you" (already in P4).

---

## P4 Script v4.1 and captions : KEEP WITH FIX

Score effect: clearly positive overall. The security criterion is scored by people who may hold our PDF, and every one of the twelve fixes removes a claim the PDF contradicts. None of the changes loses a point of task completion.

### Line by line (spoken to one judge, by a Malaysian founder)

| Line | v4.1 | Verdict | Better wording |
|---|---|---|---|
| m2 | "tricked an AI agent into giving away over a hundred and fifty thousand dollars." | Accurate but flat, and "dollars" is ambiguous in a film full of HK$. The subtitle wraps and strands "dollars." on its own line. | "tricked an AI agent into sending out over a hundred and fifty thousand US dollars." |
| u0 | "When the job is unclear, it can ask you one question first." | Honest, natural. | Keep. Headline must change to match (P3). |
| u1 | "In the demo, test versions of Exa and CoinGecko sell it search and prices, over x402." | Stiff. "sell it search and prices" is an odd phrase for speech. | "In our demo it buys search from a test Exa and prices from a test CoinGecko, over x402." |
| x2 | "...our server makes a separate agent key for each card." | Natural. Better than "keeps". | Keep. |
| x5 | "...and a facilitator sends it to the chain." | Fine. A judge may ask "whose facilitator". It is ours, which is a plus for self-containment, but the line is silent on it. | Optional: "...and our facilitator sends it to the chain." |
| x6a | "Some agent wallets check their limits on the wallet company's server." | Good, defensible. | Keep. |
| u4 | "A seller that isn't on your list gets refused, and the agent re-plans or asks you." | Fine. "Re-plans" is a little technical but the phone shows "so I re-planned". | Keep. If you want it more spoken: "...and the agent picks another way or checks with you." |
| u3 | "...from twelve Hong Kong dollars to eight dollars eighty." | Clear for the ear, a little heavy with "dollars" twice. | "...from twelve Hong Kong dollars down to eight dollars eighty." |
| r1 | "It's your card, so you can cancel it mid-task and take back what's left." | Accurate. "what's left" is vague. | "...and get back whatever hasn't been spent." |
| k3 | "Worst case, we act as a fooled agent and use its key to send the money." | Honest and clear. "Act as" is stiff and the on-screen label says "we play it fooled". | "Worst case, we play a fooled agent and use its key to send the money." This also matches the label. |
| k5 | "Even a fooled agent can't pay outside the card's rules." | Good. It is the line the security judge wants. | Keep. |
| f1 | "...all seven forbidden attempts were rejected." | Good. "Attempts" is the honest word. | Keep. |

Rule check on all twelve: no colon reveals, no middle-dot chains, no arrows, no "not X because Y", no question-then-answer. Clean.

### Screen changes

- Hook counter: "sent away by one AI agent" with "US$150,000+" and "US$150,000 to 200,000 in tokens, reports vary" is honest and cleaner than a count-down to US$0. The upside is credibility. The downside is that the "drain" motion is gone. Make the number tick up fast, 0 to 150,000 in about 1.5 s with a vermillion flash on landing, so the beat still has force.
- "test sellers at Exa and CoinGecko prices" is slightly ambiguous. Prefer "test sellers, priced like Exa and CoinGecko". Mono caption width is fine, with room to spare.
- "from HK$12.00 to HK$8.80, with a test seller" good.
- "we play it fooled" good, small vermillion sub-label on the agent chip. Size is about 9 px in the frame (18 px at 1080p), a bit small. Raise to 22 px.
- "7/7 forbidden attempts rejected" is good, big, and the right place for it. The footnote collision is the problem (see P1). Even with ZH off, a two-line English cue grazes the footnote in the frame.
- "Some agent wallets" heading: fine.
- Phone beats still show "Paid Exa" and "Negotiated with DataPro". These are recorded footage and cannot change. The caption "test seller" covers it. Fine.

### Existing rule breaks that this pass did not touch

- The card-back graphic uses middle dots: "SMART CONTRACT · FISCO BCOS", "Freeze · cancel", "DataLite · DataPro". The decisions say no middle-dot chains. This is our own drawn graphic, not the app UI, so it is fair game. Replace with "SMART CONTRACT ON FISCO BCOS", "Freeze or cancel", "DataLite, DataPro". (The phone UI's own "Memory updated · v1" is real footage and is exempt.)
- The Exa box on the X-ray now says "answers HTTP 402 with a price". It is accurate. Add "test seller" as the commit says. In the frame I saw, it was not yet there; confirm it is in the final.
- The HKMA footer ("our mapping of four ideas from the speech") is correct and keeps "covers" without "compliant". Good. Check that the "covers" claim is kept on voice; do not drift to "aligned with".

### Owner decisions left open (agree with the report)

- "Stricter, never looser" (w3): I would take the safer line. "The second AI can only hold or block a payment. It can never loosen a limit." A sceptical judge reading the PDF will find the ambiguity. This costs 3 seconds of voice.
- "Six run on our server" (y1) and "Every agent, Claude, ChatGPT, or ours" (n2): the second one overclaims when it only works on the demo network. Change to "Claude, ChatGPT, or ours, on our demo network" if you can fit it.

---

## Things that would raise the score and are not in P0 to P4

1. One full hash held about 3 s on screen, tied to the task (report rank 6). Topic F's 40 points are judged on hashes. This beats everything above in value. I would put it ahead of P1.
2. Say "live and deployed" once near the end for the bonus (rank 10), with the Railway URL visible.
3. "test" beside e-HKD in the attack order (rank 11). A scoring judge will accept test money; a regulator-minded one wants it said.

---

## Verdicts

| Prototype | Verdict |
|---|---|
| P0 Subtitle break | KEEP |
| P1 Chinese line (off) | KEEP, off until checked; fix the safe zone and footnote overlap |
| P2 Rubric terms | KEEP WITH FIX (sub-label 22 px at 1080p, lighter grey) |
| P3 Clarification and fallback tags | KEEP WITH FIX (match headlines to v4.1 voice, "in the demo", keep FALLBACK up through the re-plan) |
| P4 Script v4.1 | KEEP WITH FIX (wording tweaks above, 7/7 footnote overlap, card-back middle dots) |
