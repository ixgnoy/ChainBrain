# ChainBrain demo video v3: the AI Card (storyboard draft for review)

19 Oct 2026. Approved and built: the as-built shot list is [SCRIPT.md](SCRIPT.md) (3:33). Changes while building: four short beats were added for clarity and scoring (it asks one question, a seller not on your list is refused, cancel the card any time, data requests named as the fourth attack), and the proof shows all 7 rejected payments with their hashes.

## 1. The USP: the AI Card

> **ChainBrain gives your AI its own card. Its own smart contract sets the limits. A second AI watches every payment, and it can only ever say no.**

- **Spoken short form:** *"The card holds the limit. The AI can only say no."*
- **Tagline (kept):** *Give your AI a card, not your wallet.*

**Why this concept wins:**
- **"Card" is a word everyone already trusts.** People know a card has a limit, can be frozen and can be cancelled.
- **The limit lives in the money itself.** It sits in the card's own contract, not in the AI's instructions or on a company's server. That is what makes it hold even when the AI is fooled.
- **The monitor AI can only tighten.** It can freeze, block and refuse, but never raise a limit. The second AI adds safety without adding a new way to lose money.
- **We couldn't find this combination anywhere.** Coinbase, Stripe, Visa, Mastercard, Google AP2, Skyfire, Turnkey and Privy keep limits on their own servers. Safe and session keys put them on-chain, but only for developers.

**Proof we can show (all real, from the repo):**
- On our hosted FISCO BCOS chain, the agent's own key tried 7 forbidden payments, and all 7 were rejected, with hashes (`docs/redteam/hosted-proof.json`).
- In the worst-case suite, 55 attacks got through 0 times.
- Contract fuzzing found 0 rule breaks in 128,000 random calls.
- In live-model runs, the AI acted on an attack 0 times in 8 (`docs/redteam-report.md`).

## 2. Story spine (each idea once, in this order)

**Hook** (AI agents get fooled; people won't let AI spend) → **The AI Card** (what it is) → **Get one** (one sentence) → **Use it** (pays, asks, negotiates) → **Break it** (the climax) → **The watcher** (a second AI that can only say no) → **Proof** (real chain, numbers) → **Close**.

## 3. Storyboard (about 3:40; times approximate)

| # | Time | Picture | Voice-over | Sound |
|---|---|---|---|---|
| 1 | 0:00–0:07 | Black. A single post types out as Morse code (dots and dashes in white), then decodes letter by letter into a transfer order. Small date line: **4 May 2026**. | "May 2026. One post, written in Morse code…" | Morse beeps as the rhythm, low drone |
| 2 | 0:07–0:12 | Hard cut: a wallet balance spins down to zero. On screen: **about US$150,000, gone**. Small source line: "OECD AI Incidents Monitor". | "…tricked an AI agent into emptying its wallet." | Hit on "emptying", then silence |
| 3 | 0:12–0:20 | Two numbers slam in: **74%** (would let AI handle their tasks) and **9%** (would let it spend on its own). Source line: "Accenture, June 2026". | "Most people would let AI handle their tasks. Only nine percent would let it spend." | Two hits |
| 4 | 0:20–0:26 | A card slides out of black, matte with a powder-blue edge, and turns to camera. The ChainBrain mark sits on it. | "So we gave the AI its own card." | Main theme starts |
| 5 | 0:26–0:44 | **What the AI Card is.** Three quick builds on the card itself, one line each: **its own limit** (HK$ amount ticks on), **its own smart contract** (FISCO BCOS logo stamps on the back), **watched by a second AI** (the Brain graph lights up behind). Claude and ChatGPT logos each get their own card in a fanned stack. | "Every agent, Claude, ChatGPT or ours, gets its own AI Card. Its limits live in the card's own smart contract, on FISCO BCOS. And a second AI watches every payment." | Drums enter; one tick per build |
| 6 | 0:44–1:10 | **Get one.** Phone: type one sentence → the card builds itself live (app inside the app) → the rules → Slide to approve with Face ID → "Card created". Speed tag on the wait. | "Tell it the job in one sentence. ChainBrain builds the card in front of you, with the exact rules you approve." | Builds |
| 7 | 1:10–1:22 | **Use it.** Phone: the agent pays Exa and CoinGecko on its own over x402. Logo row: Exa, CoinGecko, x402. | "Small payments, it makes on its own. Exa for search, CoinGecko for prices, paid instantly over x402." | Tick hits |
| 8 | 1:22–1:32 | Phone: Nansen is over the limit, so an approval request appears, then Slide to approve. Nansen logo. | "Anything over your limit, it asks you first." | |
| 9 | 1:32–1:42 | Phone: the negotiation card, HK$12.00 to HK$8.80. | "It even negotiates a better price." | Lift, riser |
| 10 | 1:42–1:45 | Black. Big type: **"Now let's break it."** | "Now, let's break it." | Silence, then the drop |
| 11 | 1:45–1:58 | Phone, two quick beats: a seller's hidden order, ignored; an "I'm the admin" message, refused. | "Hidden orders. Fake admins. It ignores them." | Hits |
| 12 | 1:58–2:20 | **The money shot.** "We fool the agent on purpose." The transfer flies toward the card and stops dead on it. One beat of silence, then **"No."** Balance unchanged. Cut to the real hosted-chain page: rejected, with its hash. | "Worst case: we fool the agent on purpose and make it send the money. The card says no. Not because the AI caught it. Because the card itself won't pay." | Silence, then one huge hit on "No" |
| 13 | 2:20–2:50 | **The watcher.** The Brain graph full-screen. Three quick shots: it checks the seller (a risky one is blocked), checks the payment before it's sent, and learns how you buy. Then repeated tries, and the watcher freezes the card: "Only you can unfreeze it." Then big type: **"It can only say no."** | "The second AI checks every seller and every payment, and learns how you buy. When something's wrong, it freezes the card. Only you can unfreeze it. It can make your rules stricter. Never looser." | Theme returns |
| 14 | 2:50–3:20 | **Proof.** Big counters, one per beat, over the real explorer: **7 of 7** forbidden payments rejected on our FISCO BCOS chain · **55 attacks, 0 got through** · **0 rule breaks in 128,000 tests**. Small line: "test Hong Kong dollars · phone shots recorded on our test setup". | "On our FISCO BCOS chain: seven forbidden payments, seven rejected. Fifty-five attacks. None got through." | Counter ticks |
| 15 | 3:20–3:30 | **Built with** logo strip: FISCO BCOS, Solidity and Foundry, x402, Claude (via OpenRouter), Expo, React, Hono. | (music only) | |
| 16 | 3:30–3:40 | The card turns once more. Tagline, then the team on the end card. | "Give your AI a card, not your wallet." | Final hit, ring out |

## 4. Changes from v2

- **One USP throughout:** the AI Card.
- **Hook:** a real incident plus a real stat, instead of an invented scene.
- **Each idea appears once.** Removed:
  - the "Why it held" re-explanation (52 s);
  - the second "two safety nets" shot;
  - the silent Judges scoreboard;
  - the triple-shown blocked transfer;
  - revoke and dead-end.
- **Team** moves from 0:14 to the end card.
- **More logos:** Claude, ChatGPT, Exa, CoinGecko, Nansen, x402, FISCO BCOS (the current file), plus a real "Built with" strip of the tools the code uses.
- **Punchier:** one idea per shot, hard cuts on the beat, three planned silences (after the hook, before "break it", before "No"), numbers as big counters, and the attack as the clear climax.

## 5. Wording rules

| Don't say | Say |
|---|---|
| haggle | negotiate |
| co-sign, cheque | approve, approval request |
| ask-me limit, cap | your limit, spending limit |
| Sentinel | the second AI, the watcher |
| Radar, pre-flight | checks the seller, checks the payment before it's sent |
| revert, reverted | rejected |
| spec | the rules you approve |
| built-in network, simulated chain | recorded on our test setup |
| Mock e-HKD | test Hong Kong dollars |
| pocket | card (AI Card on first mention) |

Keep as is: x402, FISCO BCOS (current logo file), smart contract, Face ID.

## 6. Facts to keep exact

- **Morse-code incident:** 4 May 2026, about 3 billion DRB tokens, about US$150,000+. Sources: OECD AI Incidents Monitor, Cointelegraph.
  - Say "about"; never "$200K".
  - Don't say "stolen key": no key was taken.
  - Naming Grok or Bankr is optional; "an AI agent" is safe.
- **Accenture, June 2026 (25,590 people, 16 countries including Hong Kong):**
  - 74% would let an agent handle routine tasks. This is not about payments.
  - 9% are open to fully autonomous purchasing.
- **Real-provider claim:** Exa, CoinGecko and Nansen are demo sellers in the app (placeholder addresses, canned data). The payments are real on-chain, but the providers are not called. Kept on screen at the owner's request, so the voice-over never says "real Exa data".
- **Scripted moments:** the clarifying question and the negotiation run on the test setup, as scripted scenes.
