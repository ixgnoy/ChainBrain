# ChainBrain demo video v4: storyboard and decisions

20 Oct 2026. Approved after two storyboard rounds (50 rendered frames each, `out/storyboard-v4.html`, git-ignored). The as-built shot list is [SCRIPT.md](SCRIPT.md); v3, which this builds on, is [STORYBOARD-v3.md](STORYBOARD-v3.md).

## Why a v4

The owner liked v3 but asked for four things:

- **A high-level overview for judges.** How the whole flow works, how the money moves, and how the backend catches problems.
- **Voice that matches the screen.** Some lines played over the wrong shot.
- **A title that fits the frame.** "Let's break it." ran off the left edge.
- **A little more explanation of what's really going on,** while still sounding impressive.

Round two of the review added three more:

- No "Built with" slide.
- A team slide with portrait photos, then an ending slide.
- Real icons and logos instead of typed or drawn marks, and wording that doesn't sound AI-written.

## What changed

| Area | v3 | v4 |
|---|---|---|
| Overview | none | **The X-ray (53 s)**, right after the first real payment. It replays that payment across one board with four lanes: your phone, our server, the seller, FISCO BCOS. It shows who holds which key (with the app's co-sign screen) and the server checks (with the app's Guarded panel). Then a short comparison: many agent wallets check limits on the wallet company's server, while here the token asks the card. The card's eight checks tick, the payment settles with a real hash, and the camera pulls back to the whole system. |
| After "The card says no" | straight to the watcher | **Why it held**: eight layers, each attack shown at the layer that stops it. Six layers run on our server; the two on-chain layers hold even if the server is taken over. Then **If a key is stolen**: the agent key, our server, the guardian key and your key. |
| Regulation | none | **The HKMA's four principles** from Carmen Chu's remarks (16 Oct 2026): anchored to intent, kill switches, A.I. versus A.I., secure boundaries. Each is mapped to a ChainBrain feature; the voice says ChainBrain "covers" them. |
| Proof | 55 attacks | Matches the submitted PDFs: 7 of 7 forbidden payments rejected on the hosted chain, 63 attacks with HK$0 lost, 462 automated tests. |
| Ending | "Built with" logo strip, then tagline with round team photos | Team slide (3:4 portraits, eyes on one line, rounded corners), then an ending slide with the tagline, the mark, and where to try it. The stack's logos moved onto the X-ray boxes. |
| Sync | eight lines played over the wrong shot | Cuts follow the spoken words (`tools/layout.py`: picture-led lines, voice-led cuts). |
| Marks | typed ✓ ✗ · arrows | Lucide check and cross badges, an icon per layer, real logos on every X-ray box. |
| Wording | some AI patterns | 27 of 43 lines rewritten from 2025-2026 research (below). |

## Wording rules (from the research)

Judges who use LLMs a lot spot AI text by its structure more than its vocabulary. So the script avoids:

- **Negative parallelism**, such as "not because X, because Y". It's kept only in the tagline.
- **Stacked fragments and rule-of-three lists**, unless the three items are real (the three attacks shown on screen).
- **Question-then-answer**, such as "Why did it hold?".
- **Colon reveals and repeated headline shapes**, such as "Small payments? It pays on its own." used four times in a row.
- **Arrows and middle-dot chains** in captions.
- **Words now read as AI**, such as "aligned with", which became "covers".

What it does instead:

- Contractions, "we" for the team and "you" for the user.
- Concrete numbers and names.
- One idea per sentence.

Sources:

- Wikipedia, "Signs of AI writing" (October 2026)
- Kobak et al., Science Advances 2025
- Reinhart et al., PNAS 2025
- Russell et al., ACL 2025 (expert detectors)
- Pangram's public list
- NPR's broadcast-writing guide

## Facts to keep exact

- **Morse-code incident:** 4 May 2026, about US$150,000 in tokens (OECD AI Incidents Monitor). The dots on screen are an illustration.
- **Accenture, June 2026:** 74% would let an agent handle routine tasks; 9% would let it buy on its own.
- **Exa, CoinGecko and Nansen** are demo sellers in the app. The voice never claims their data is real.
- **The X-ray's real hash** is the same payment path on the hosted chain: block 11, HK$2.30 to DataLite. It is labelled that way, not as the Exa payment.
- **The HKMA beat** is our mapping of public remarks, not a regulatory approval.
