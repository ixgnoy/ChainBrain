# Holistic judge review: v4 (BEFORE) vs preview-v41 (AFTER)

Method: contact sheets at 1 frame per 2 s for both cuts (about 143 frames each), full-size frames at 127 s, 242 s, plus overnight/frames morse-5.6 and r3-176. Timestamps are AFTER's clock (it runs 2 s shorter, so BEFORE is about 0-2 s later).

## 1. Scores (estimates)

| Criterion | BEFORE | AFTER | Why |
|---|---|---|---|
| Task completion (40, judged on hashes) | 28 | 33 | AFTER gives the hash its own full-screen beat at about 125-130 s: a big 0x15b0d3... on a dark stage, "A REAL PAYMENT ON OUR FISCO BCOS 3.16.4 NODE, CHAIN ID 20200, BLOCK 11", success badge, explorer host, and "Every hash in this film is listed in ChainBrain-execution-evidence.pdf". BEFORE only showed a small transaction card in the corner. The proof section (7/7, 63, 462) now carries the seven-attempt list and "test money / on 19 Oct" dating. The revert hash (block 13) is still only a small card. Still no second success hash and no multi-step on-chain sequence, so not full marks. |
| Security & compliance (30) | 22 | 25 | AFTER adds a clear honesty frame: "illustration of a hidden order", "test seller", "Mock e-HKD is test money", "our own mapping of four ideas, not a regulatory approval". The "Some agent wallets..." beat now ends with a vermillion "asks the card, on-chain" against the grey "company's server". Wording "forbidden attempts", "tests the payment first" and "listed sellers, up to the cap" is more precise. The deduction is for the many small mono captions that a judge cannot read. |
| Innovation & interaction (30) | 24 | 26 | The Morse now decodes into SEND ALL (hook is stronger). "Stricter. Never looser." now has powder blue and a strike. HKMA ticks are readable. The four-idea mapping is rendered more clearly. Story order is unchanged, so the gain is limited. |
| Bonus (0-5, deployment) | 3 | 4 | The end card now shows the live URL and repo, in a larger and more legible size. The "Try it today, on our hosted chain" line sits in the proof section as well. Both cuts mention hosted FISCO. |
| Total | about 77 | about 88 | |

AFTER scores higher on every criterion. The gain is mostly proof visibility and honesty framing, not new content.

## 2. What AFTER made worse (specific)

1. 0:00-0:13 hook. The Morse caption "illustration of a hidden order, not the attacker's post" is tiny, grey and sits under the letters. It has the shape "not X" and sounds defensive in the first five seconds. The spoken line also grew: "tricked an AI agent into giving away over a hundred and fifty thousand US dollars" wraps to two subtitle lines. The counter then runs US$33,431 then US$150,000+ in vermillion, with a tiny footnote ("US$150,000 to 200,000..., reports vary"). The hedged range is honest but the number reads less crisp than BEFORE's hard figure.
2. 0:16-0:21 nine percent. The "within set limits" suffix is added to the on-screen label only, which does not match the spoken line "buy on its own". Wording and picture now differ.
3. Tiny mono captions are everywhere in AFTER. Examples: "Phone recorded on our test setup" (every phone scene, 0:48-3:50), "CLARIFICATION" (about 0:65), "FALLBACK" (about 0:80), "THE FOURTH ATTACK: A FORCED PAYMENT (INDUCED TRANSFER)" (about 0:150), "Mock e-HKD is test money, not the HKMA's e-HKD... Details: ChainBrain-security-self-assessment.pdf" (a two-line mono footer across the whole proof section, about 0:250-0:284), "Our mapping of four ideas from the speech, not a regulatory approval. Source: hkma.gov.hk" (about 0:244). At phone-screen or half-resolution size these are unreadable, so they add clutter without credit. They also make "defensive" the visual tone of the proof section, where the pitch should end on confidence.
3a. The "not a regulatory approval" wording and "not the HKMA's e-HKD" both use the banned "not X" shape.
4. 1:08-1:20 "In our demo it buys search from a test Exa and prices from a test CoinGecko, over x402." This is long and defensive, and it runs over the pay beat. Subtitles wrap to two lines over the phone. BEFORE's "Right now that's Exa for search and CoinGecko for prices" was cleaner. Say "test" once, on screen only.
5. 2:00-2:05. "without our server" labels under the architecture diagram's last panel overlap the captions ("without our server", "holds without server"). They are small vermillion mono strings at the bottom edge and collide with the subtitle bar.
6. 2:13-2:17 "Above your limit, you sign too." The headline changed from "co-sign" to "sign too", which is clearer, but the sub-line "Nansen charges HK$0.48. Slide to approve." is still on screen and the spoken line says "Above the amount you chose, the card asks you to sign on your phone too." Four ways to say "sign" in 5 s.
7. 2:55-3:07 the k-section. The vermillion "NO." beat is kept, and the lower-left tag "THE FOURTH ATTACK" adds a numbering that the viewer never saw ones 1-3 for (the three listed attacks are shown as a stack, not as 1-3). Judges may ask "where are attacks 1-3?". 
8. Pacing. AFTER has more voice content per scene (u1, k2, y3, f1-f4 all grew). y3 is now three sentences over one slide (key-stolen cards, about 3:20-3:40), the longest unbroken talk block in the film. f1-f4 are four spoken lines over one static proof layout with a growing stack of numbers. Lines the original cut said in half the words ("None of it works." became "Nothing gets through.", fine; "the agent finds another way" became "re-plans or asks you", fine).
9. "Some agent wallets check their limits on the wallet company's server." This is a new competitive framing. It is legitimate (no rival named), but it adds 4 s before the payment hash lands, which delays the proof beat.

## 3. Five highest-value remaining fixes

### Before the deadline (at most 30 min)

1. Remove or enlarge every tiny mono caption on frames where it is unreadable. Do this in the render config rather than by editing frames: delete "Phone recorded on our test setup" from all phone scenes except the first, and show it once at about 0:48 at normal subtitle size, for 3 s. Delete the "CLARIFICATION" and "FALLBACK" tags. Rename "THE FOURTH ATTACK: A FORCED PAYMENT (INDUCED TRANSFER)" to "The worst case" (one tag, since no 1-3 are shown). Fewer labels means the three that remain read as deliberate.

2. Merge the two proof-section footers into one readable line, no "not X":
   "Test money (mock e-HKD). Full evidence: ChainBrain-security-self-assessment.pdf" at the same size as the subtitle, shown only during f2, then removed for f3 and f4. And for the HKMA slide: "Our mapping of four ideas from the speech. Source: hkma.gov.hk" (replace "not a regulatory approval" with the colon reveal).

3. Hook footnote: replace "illustration of a hidden order, not the attacker's post" with "an illustration of a hidden order" (drop the "not" clause). Replace the counter footnote with "about US$150,000, taken in tokens (AIID)" and keep the figure in vermillion. Put the 150,000+ in the spoken line as "about a hundred and fifty thousand US dollars" so the picture and the voice agree.

4. Make the nine percent label match the voice: on screen "would let it buy on its own", and move "within set limits" to the footnote under Accenture ("question asked about buying within limits you set"). One honest source note, no change to the big text.

5. Put the revert hash on its own beat, as the success hash has. At about 3:05-3:12 ("The card says no."), cut to the same full-width layout as 0:125: "A FORCED TRANSFER, REVERTED ON OUR FISCO BCOS NODE, BLOCK 13", the full 0x91525ada450e84a0afb9f4fb255d57df3c910d1eb8af78acb2b10f40ed7e7745 in large mono, a vermillion "reverted" badge, and the line "Same card, same agent key, no money moved." This pairs a success hash with a refusal hash, which is exactly what "judged on on-chain hashes" rewards (the biggest point gain still available, about +2 on task completion). If the full frame is more than 30 min, do the minimum: enlarge the existing "On the chain" card by 40 percent and drop the "Phone" card to the corner.

### After

6. Add one more verifiable success hash (a refund after cancel, or the co-signed payment) as a second small chip in the proof section, each with a block number, so the proof section shows at least three real hashes: pay, refuse, refund.
7. Split y3 (three sentences) across two slides: stolen-key and server-taken first, guardian/owner second, with a 1 s breath between.
8. Re-record the whole voice track as one take so the changed lines (u1, k2, y1-y3, f1-f4) match tone and pace with the old ones.
9. Shorten u1 to "It pays small amounts on its own, over x402." and show "test Exa, test CoinGecko" on screen only.
10. Add a 5 s "how to try it" on the end card with a QR code to the hosted app, since the deployment bonus is judged on what a judge can open.

## Look-rule check on AFTER
- Dark stage: pass. Vermillion only for attacks and refusals: pass, except the 150,000+ counter (an attack outcome, so allowed) and the "asks the card, on-chain" box (reads as an alert, not safe; consider powder blue to match "safe").
- Powder blue for safe: pass (HKMA ticks, "all passed", "Stricter.").
- No code on screen: pass (hash strings are evidence, not code).
- Typed marks: no typed check or cross marks seen. The red strike on "Never looser" is a line, fine.
- Wording: breaches of "no not X" are the two noted in section 2 (#1 and #3a). The colon reveals and question-then-answer shapes work well ("Let's X-ray that payment.", "Why it held.").
