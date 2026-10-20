# Investor / hackathon-judge review: Innovation & Interaction (30%)

Reviewed: tts/lines.json, SCRIPT.md, preview-sheet0..2 contact sheets. Timestamps are SCRIPT.md's v4 times (v4.1 voice runs about 4:51, so later cues drift a few seconds).

## 1. Customer, pain, why now, why this team (first 60 s)

- **Customer.** Anyone who wants to let an AI agent spend money for them. Never stated. The film shows a phone owner ("your card", 0:46-1:04) and the Claude/ChatGPT logos (0:28), but no sentence names a person or company. Clear only by implication.
- **Pain.** Clear and strong. 0:00-0:12 (Morse post, US$150,000+ lost) and 0:12-0:21 (74% vs 9%) land it in 21 s. Best opening in the cut.
- **Why now.** Mostly clear. "Back in May", the OECD incident and the Accenture June 2026 figure say agents are live and trust is the blocker. Nothing says agents already pay each other (x402) until 1:04-1:20, so "why now" is implied for 40 s.
- **Why this team.** Not in the first 60 s. The team appears at 4:29. The only credential-like signal early is FISCO BCOS (0:36). A judge reaches 4:29 without a reason to care who you are, and the team line gives names and universities but no reason.
- **Verdict.** Pain and why-now: yes by 0:21. Customer: implicit only. Team: no, and arguably fine for a 5-minute film if the customer gap is fixed.

## 2. Real-world value

- **Believable use?** The durian export research task is visible on screen only (phone job text, "Search Exa for durian news", ~0:46-1:20, 2:13-2:37). The voice-over never says "durian" or "export" (lines.json has zero hits). Payment to data sellers is shown well (Exa, CoinGecko over x402, HK$0.056, real receipt at 2:00). A judge believes the mechanism but has to read the screen to learn the job. At 0:46 the voice says only "Tell it the job in one sentence."
- **Missing line, market.** The film never says who pays or why they would. Suggested spoken line, 14 words, at the end of g1, before "It builds the card in front of you":
  - **"For example, every morning, research durian export prices from paid data sellers."** (12 words)
  - It also names the use, the buyer (an exporter) and the paid data sellers without a reveal, a colon or a fragment pair.
- **Hong Kong angle.** Present only as HK$ on screen and the HKMA section at 3:51. A single spoken line would make it obvious, 12 words, best placed as the first sentence of h2: **"ChainBrain covers each of the four, for agents that spend Hong Kong dollars."** (12 words). Keep "covers", never "compliant".
- **Caveat.** Do not add "small businesses" or any market-size number; none is sourced in the film.

## 3. Innovation: "the token asks the card"

- **Landed?** Partly. x6a plus x6 (about 1:50-2:05) set up a contrast ("Some agent wallets check limits on the company's server. Here the token asks the card, which runs its own eight checks first."). The frame sequence supports it well: "the company's server checks the limit" with the greyed "off-chain" label, then the token box pointing to the AI Card with eight ticks. An investor does get "enforcement moved from the server to the contract".
- **Weakness.** "Some agent wallets" is vague. A judge who knows policy engines (Coinbase, Turnkey, Safe-style guards) will ask what is different, and the film's answer comes in y2 at 3:04 ("even with our server taken over"). That payoff is 1 minute after the setup and in different words.
- **One wording change (x6).** Current: "Here the token asks the card, which runs its own eight checks first."
  - Proposed: **"Here the token asks the card, so the checks hold even if our server is gone."** (about the same length, no extra seconds). It ties the novelty to the consequence in one breath and sets up y2.
  - If the owner prefers zero risk: leave x6 and change only x6a to "Most agent wallets check limits on the company's server." ("Most" is unsourced; keep "Some".) So the first option is better.

## 4. Interaction: clarification, correction, fallback

- **Clarification: shown.** u0 at 1:04-1:20. The phone asks "HK$0.80 in total, or per lookup?", the user answers "HK$0.80 in total", and the tagged CLARIFICATION label sits on the frame. Good.
- **Fallback: shown.** u4 at about 2:20. "Harbour Wines was refused" then "so I re-planned. Bought Exa's web search", tagged FALLBACK. Good. Second fallback: the card says no at 2:47 and the Sentinel freeze at 3:29.
- **Correction (user corrects the agent mid-task): not shown as such.** No beat has the user changing the agent's course. The closest existing footage:
  - **"Cancel any time, even mid-task" (about 2:30-2:37, r1 frames).** The user stops the agent mid-task and gets back unspent money. This is the user overriding the agent, the nearest honest match. The frame shows "Agent stopped".
  - **The co-sign screen "Slide to approve / Decline" (2:13).** The user decides on a payment the agent proposed; this is approval, not correction.
  - **The negotiation (2:20-2:37, "It negotiates the price down").** The agent tries again at a lower price, a correction by the agent, not the user.
- **How to label it, honestly.** Put a small "CORRECTION" tag on the cancel frame with the subhead **"you stop it mid-task"**. Do not call it a correction of the agent's reasoning, since the footage does not show the user re-instructing it. If a judge counts strictly, this is a partial credit; I'd rather take that than overclaim.

## Top 3 fixes

1. **Before the deadline (about 0 s runtime): add the CORRECTION tag to the cancel frame** (subhead "you stop it mid-task"). It completes the clarification/correction/fallback trio the rubric names and costs no audio. Biggest scoring gap.
2. **Before the deadline (about +3 s): say the job aloud in g1** ("For example, every morning, research durian export prices from paid data sellers.", 12 words, about 4 s at pace). If the 3 s cap binds, shorten to "Say, research durian export prices every morning." (8 words, +2 s). It makes the real-world use and customer audible. Check against the 5:00 cap.
3. **Before the deadline (about 0 s): change x6** to "Here the token asks the card, so the checks hold even if our server is gone." It makes the innovation claim explicit against policy engines. The Hong Kong line in h2 is an **after** item (only +2 s, but it touches the HKMA section the HKMA reviewers have already checked).

After: a one-line "why us" in the team slide (for example, what the team built before), and a spoken customer sentence at 0:21 ("for anyone who lets an agent spend money").
