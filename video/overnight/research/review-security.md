# Security-story review of v4.1 (sceptical researcher)

Read: SCRIPT.md, script-v41.md, accuracy.md, both submitted PDFs, Pocket.sol, frames acc-145/168/175. Approved story decisions are not reopened.

## Verdict

The v4.1 story is mostly honest and unusually well evidenced. The PDFs already do the hard part (KR-01 to KR-13, 95% bounds, "not tested yet"). The video says almost none of that, and a researcher who has read the PDFs will notice the gap between the confident video and the humble PDF. Three things I would attack. First, "hold even if our whole server is taken over" is true only for the card's limits, and the video never says what an attacker can still do inside them. Second, "eight layers" and "eight checks" are two different eights. Third, "None of it works" and "didn't lose a single dollar" sound stronger than 8 live runs plus 55 forced-key tests support.

## What I would attack in Q&A, with the honest answer

1. **Server compromise (3:03 to 3:29).** The tech PDF says agent keys are derived from one AGENT_MASTER_KEY. Steal it and you hold every agent key. Pocket.sol then lets the attacker sign any payment to an allowed seller, up to the per-payment cap, until the card's balance (or the weekly allowance, if one is set) runs out. `periodKind == 0` means no allowance at all. If an allowed seller colludes, or the attacker can get a seller added (needs the owner key, so no), the money is gone. The video's "still capped" is true but "capped" per payment is not "capped" in total. The real bound is the funded balance. This is KR-01, rated high, and the video never mentions it. Honest answer: the loss is bounded by what you funded the card with, to sellers you listed.
2. **"Guardian key can only freeze".** True (Pocket.sol:159-170). But a compromised server also holds the guardian key, so it can freeze every card at once. That is a denial of service, not theft. Worth one clause in Q&A. The guardian is `immutable` per card, so it cannot be rotated. This is a point against us on key hygiene, not on the claim.
3. **Sentinel freeze may be only a hold.** Without SENTINEL_PK the "freeze" is a server-side hold and the video's "freezes the card, only you can unfreeze it" is then wrong. Still unverified on Railway (accuracy.md row 9, script-v41 "must verify"). This is the single highest-risk line in the film because a judge can test it live. Verify tonight. If unset, set it.
4. **Replay and front-running.** Pocket.sol binds the digest to (card, to, value, validAfter, validBefore, nonce) and the token spends each nonce once. A front-runner who copies the signed authorisation can only submit the same payment to the same payee, so the worst case is paying early. This is a strong answer and the film does not use it. Appendix test "HK$2.30 authorisation sent again, reverted" is real. The 600-second owner co-sign window is a further bound.
5. **Facilitator.** It is ours, on the server, and cannot spend without the agent's signature. v4.1 says "a facilitator" which is accurate. Make sure the X-ray board does not draw it in the seller lane (accuracy row 35, check the render).
6. **AI as the first layer.** The AI is layer 1, "can be fooled, holds no key". "Six run on our server and make the agent behave" lumps the AI in with six deterministic checks. A researcher will say the AI is not a security control. The PDF says exactly that. The video should too (fix 3).
7. **Scripted demo versus live model.** Phone scenes are "recorded on our test setup" on the built-in network, where the AI part is scripted (tech p11). The 2:40 line "We try hidden orders, data requests, even a fake admin. None of it works" shows scripted scenes. The live-model evidence is 8 attack runs, 0 fooled, upper bound 36.9%, one model, one wording each, and only the two seller-page attacks. Chat-typed attacks and memory poisoning were never run on the live model. "Fake admin" is not among the two live attack scenes. So "None of it works" is true of the card, not proven of the AI.
8. **"Didn't lose a single dollar" (4:08).** It is Mock e-HKD, a test token, and 55 of 63 attacks assumed the AI was already fooled. The footer says "test money", good. The sentence alone reads like real dollars.
9. **Open read routes (KR-05).** Anyone can read every card's event stream, task text, agent replies and memory notes without signing in. The film shows "a request for your data (refused)". A judge who opens the console URL can read other cards' notes. No money, keys or identity, but "data extraction" is in the 30% rubric. It is in the PDF as a known risk. Not in the video, and the video is not the right place, but have the answer ready: pseudonymous addresses, no PII, open on purpose for the live console, fix is owner sign-in on reads.
10. **Hash mismatch.** The video shows a HK$50 order to 0x0000...ABC0 reverting in block 13 (hash 0x91525ada...). The PDF's hosted proof reverts HK$5 to a different planted address (0xd49be111...). Both are real, but a judge who cross-checks the PDF finds neither. Say on screen that this is the in-app attack demo run on the hosted chain (the PDF says "the app's own deployment runs an earlier build of the card contract"). Cheap label, below.
11. **The 462 tests.** Server tests landed after the PDFs. If the count moved, the video and PDFs must both change. Re-run before render.
12. **Pairing outside agents.** "Every agent, Claude, ChatGPT, or ours, gets its own AI Card" works only on the demo network so far (script-v41). Not a security point as such, but an overclaim a judge can test, and an overclaim on stage damages the trust the security section earns.

## Eight layers versus eight checks

They are different eights, and the film never says so.
- **Eight layers** (tech p10): AI, wrapped and scanned seller text, task check, Radar, Sentinel hold, signing rule, card contract, token. Six on the server, two on chain.
- **Eight checks** (security PDF p6, 2:00 in the X-ray): inside the card contract only: exact transfer, signed by this agent, card active, seller allowed, under the cap, enough balance, within the allowance, owner co-signs above the limit.
- The "eight checks" are layer 7 (with part of layer 8). A viewer hears "eight checks" at 1:55 and "eight layers" at 3:03 and will assume one list. Also, check 1 is the token's digest, and one-time nonce and expiry are token and card checks that the eight do not list. Fine in substance, confusing in framing.
- Framing is sound, naming is not. Fix 4 below.

## Anything still overstated in v4.1

- "None of it works" (2:40): see 7. Soften.
- "On-chain layers hold even if our whole server is taken over": true for limits, see 1. Add the residual.
- "It can only make your rules stricter, never looser" (3:45): the audit's ambiguity stands. The approved wording is kept, so I do not relitigate it; the safer variant in script-v41 is better and costs nothing. If you keep the approved line, make sure the on-screen text says "can hold or block, never loosen".
- "Didn't lose a single dollar": add "test".
- "ChainBrain covers all four" (HKMA): approved. The footer "our mapping, not a regulatory approval" covers it. Leave.
- "Six run on our server and make the agent behave": the AI is one of six. See 6.

## Missing, ranked by expected score gain per effort

1. **Name the residual risk once, in plain words.** Biggest trust gain and the cheapest. Researchers and judges reward a team that states its worst realistic failure and its bound.
2. **Say what the 63 attacks are.** The PDF's best sentence ("55 assumed the AI was already hacked, 8 had a live model") is not in the film. It turns "63 attacks" from a number into a method, and it answers the live-versus-scripted question before it is asked.
3. **Fix the two-eights confusion.**
4. **Make the replay and wrong-key points visible.** The PDF has them (rejected replay, agent key signing as owner, agent raising the cap). The film's 7/7 shot could name them as chips.

## Fixes

Wording is spoken style, no colon reveals, no arrows, no question-then-answer.

### Before the deadline (tonight, small)

**A. Residual risk line, in "If a key is stolen" (3:18.5 to 3:29.0).** Current: "If someone steals an agent key, it's still capped. The guardian key can only freeze, and your owner key never leaves your phone." Replace with:
"If someone steals an agent key, it can only pay your listed sellers, up to the cap, and only until the card's balance runs out. The guardian key can only freeze, and your owner key never leaves your phone."
Same length class (one extra clause, roughly 3 s). If the beat cannot grow, drop "and only until the card's balance runs out" and put it as the on-screen caption on the agent-key card: "most it can lose: what you funded". Also change the server card's caption to "stolen server key: same limits on every card".

**B. Same slot, honest server wording (3:03.5 to 3:18.5), last sentence.** Current: "The last two are on-chain, and they hold even if our whole server is taken over." Replace with:
"The last two are on-chain, and they keep every card inside its rules even if our whole server is taken over."
This says rules, not money, and sets up A.

**C. Make the AI's status honest (y1).** Current: "Six run on our server and make the agent behave." Replace with:
"The first is the AI itself, which can be fooled. Five more on our server catch what it misses. The last two are on-chain..."
Check the beat count. If it does not fit, use the shorter: "Six run on our server, starting with the AI, which can be fooled." The on-screen layer 1 label should read "AI agent, can be fooled, holds no key", which is already the PDF wording.

**D. Separate the eights.** Spoken in X-ray: change "the card, which runs eight checks before any money moves" to "the card, which runs its own eight checks before any money moves". Spoken in "Why it held": "every payment goes through eight layers" stays. On screen, caption the X-ray ticks "the card's 8 checks" and the later board "8 layers around the card", and add a one-line key under the layers board: "the card is layer 7". No audio change needed beyond "its own".

**E. Soften "None of it works" (2:40 to 2:47.5).** Replace with: "We try hidden orders, data requests, even a fake admin. The card holds." Or, keeping the cadence: "We try hidden orders, data requests, even a fake admin. Nothing gets through." "Holds" and "gets through" claim an outcome, not that the AI never wavers. Put "seller pages and requests: 8 of 8 live runs, AI not fooled" as a small footer, matching the PDF.

**F. Name the method at Proof (4:08.5).** Current: "We attacked our own wallet sixty-three times and didn't lose a single dollar." Replace with:
"We attacked our own wallet sixty-three times, fifty-five of them assuming the AI was already fooled, and no test dollar left a card outside its rules."
That is about 2 s longer. If Proof has no room, trim "all four hundred and sixty-two automated tests passed" to "and every one of our four hundred and sixty-two tests passed" and keep the new line. Footer on screen: "55 with the AI assumed fooled, 8 with a live model. Test money."

**G. On-screen labels.**
- Fourth attack frame: add "in-app attack demo, run on our hosted chain" under the hash, and "separate from the hosted-proof run in the PDF". This closes the 50 versus 5 and 0x9152 versus 0xd49b gap.
- X-ray, agent-key box: "derived on our server from one master secret, never stored" (small text).
- Proof panel: "Known risks (13) are in the security self-assessment, page 9".
- Guardian card: "if the Sentinel key is set, it freezes; if not, it holds" only if SENTINEL_PK cannot be confirmed. Otherwise leave out.

**H. Ops checks, no wording.**
1. Confirm SENTINEL_PK on Railway, and that a freeze transaction appears for the 3-refusal case on the hosted chain.
2. Re-run all suites and fix the 462 if needed.
3. Confirm the demo console does not expose other users' memory notes in the judges' view. If it does, say it in the Q&A before they find it.

### After (finals)

1. A 6 to 8 second "worst realistic day" beat, if the cut gets room: server breached, attacker signs as every agent, map shows each card paying only listed sellers under the cap, balances bounded. This is the strongest possible answer to KR-01, shown rather than said.
2. Move the master secret into a cloud KMS, with per-card rotation (PDF next step). Then the film can drop the residual clause.
3. Make the guardian replaceable (owner-settable or rotatable), so a stolen Sentinel key is recoverable.
4. Sign-in on the read routes (KR-05), then show "other cards' data: refused" as a real test.
5. Run 60 or more live attack runs and chat-typed, reworded and translated attacks. Then the film can claim the AI held, with a bound under 6%.
6. A waiting period before a newly listed seller can be paid (KR-04), which closes the "allowed seller turns bad" path.
7. Put the task budget on chain (KR-03), which makes "the confirmed task" an on-chain check, not a server one.

## Ranking by expected effect on the security score

1. Verify SENTINEL_PK (H1). A false claim on a live-testable line is the most expensive error.
2. Residual-risk line (A, B). Largest trust gain, smallest edit.
3. Method line for the 63 attacks (F) and the in-app versus hosted-proof label (G). Pre-empts the live-versus-scripted attack.
4. Two-eights separation (D) and AI-as-layer-1 honesty (C).
5. Soften "None of it works" (E).
6. Re-run tests and fix the 462 (H2).
7. Everything under "After".
