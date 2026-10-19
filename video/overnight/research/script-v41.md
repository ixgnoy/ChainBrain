# Script v4.1: accuracy fixes for the owner's recording

Commit: "Script v4.1: twelve voice lines and their captions match the evidence".
Source of each fix: `accuracy.md` (rows in brackets); every rating was checked against the security PDF, `hosted-proof.json` and the code.

**Record these words, not the v4 ones.** `out/recording-kit.html` is hand-made and git-ignored, so update its lines from `tts/lines.json` (or use `overnight/recording-kit-v41.html`).

| Line | v4 | v4.1 | Why |
|---|---|---|---|
| m2 | tricked an AI agent into emptying its wallet. | tricked an AI agent into giving away over a hundred and fifty thousand dollars. | OECD reports 3 billion DRB tokens, worth US$150,000 to 200,000. It does not say the wallet was emptied (29) |
| u0 | If the job is unclear, it asks one question first. | When the job is unclear, it can ask you one question first. | The live model asked 0 questions in 24 runs (security PDF p5). Only the scripted demo asks (13) |
| u1 | …Right now that's Exa for search and CoinGecko for prices, over x402. | …In the demo, test versions of Exa and CoinGecko sell it search and prices, over x402. | The sellers are our own test sellers at published prices. Exa got no money (12) |
| x2 | …our server keeps one agent key for each card… | …our server makes a separate agent key for each card… | Agent keys are derived on demand and never stored (tech PDF p9) (7) |
| x5 | …and the seller's facilitator sends it… | …and a facilitator sends it… | In our setup the facilitator is ours (35) |
| x6a | Many agent wallets… | Some agent wallets… | Only secondary sources support it, and counter-examples exist (11) |
| u4 | …and the agent finds another way. | …and the agent re-plans or asks you. | The live model doesn't switch sellers on its own (p5) (14) |
| u3 | …to eight eighty. | …to eight dollars eighty. | "eight eighty" is easy to mishear (15) |
| r1 | …and the money comes back. | …and take back what's left. | Settled payments don't come back (p2, p7) (16) |
| k3 | Worst case, we fool the agent on purpose and it tries to send the money. | Worst case, we act as a fooled agent and use its key to send the money. | The worst-case tests force the agent key. The live model was never fooled (19) |
| k5 | The agent was fooled. The card still won't pay outside its rules. | Even a fooled agent can't pay outside the card's rules. | Same as k3 (19) |
| f1 | …all seven forbidden payments were rejected. | …all seven forbidden attempts were rejected. | Two of the seven are rule edits, and one is a forged owner signature (20) |

Screen changes in the same commit:
- **Hook counter.** It counts up to "US$150,000+ sent away by one AI agent" instead of running a wallet down to US$0. The source line reads "US$150,000 to 200,000 in tokens, reports vary".
- **Captions:**
  - "test sellers at Exa and CoinGecko prices"
  - "the agent re-plans or asks you"
  - "from HK$12.00 to HK$8.80, with a test seller"
  - "take back what's left"
- **Labels:**
  - "we play it fooled"
  - "7/7 forbidden attempts"
  - "Some agent wallets"
  - X-ray Exa box: "test seller, answers HTTP 402 with a price"
  - HKMA footer: "our mapping of four ideas from the speech".
- **"The card still won't pay."** now appears on "agent" in k5.

**Not changed. The owner decides:**
- **"Stricter, never looser" (w3).** It's an approved story beat. The audit rates it ambiguous (the second AI tightens what the agent may do, not the stored rules). A safer line is "The second AI can only hold or block a payment. It can never loosen a limit."
- **"Six run on our server and make the agent behave" (y1).** The first of the six layers is the AI itself.
- **"Every agent, Claude, ChatGPT, or ours" (n2).** Pairing outside agents works only on the demo network so far.

**Must verify before the final render:**
- **462 tests.** New server tests landed after the PDFs, so re-run the suites. If the count moved, update the PDFs and the video together.
- **`SENTINEL_PK` on Railway.** Without it, "freezes the card" is only a hold.

**Preview audio.** The ElevenLabs free quota had 178 characters left, so the 12 changed lines in this branch's preview are Kokoro (`af_heart`). Timings are real but the voice differs. The owner's recording replaces both.
