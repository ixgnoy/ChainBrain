# FISCO BCOS engineer's review of the v4.1 video

Seat: a WeBank / FISCO BCOS 3.x open-source engineer judging Topic F. Read: SCRIPT.md v4.1, REPORT.md, the technical overview PDF, `docs/evidence-fisco-railway.json`, `hosted-proof.json`, frames `hash-129`, `tests-262`, `contracts/src/Clock.sol`, `scripts/fisco/setup.sh`, `deploy/fisco-node/`.

## Verdict

The repo is deeply FISCO. The video makes it look like a logo on an EVM demo. FISCO shows as a logo (0:28 to 0:46), as a lane name in the X-ray, and as a caption on the proof screen. The film never shows anything only a FISCO chain does. The best FISCO facts live in the PDF and the code, and the viewer never meets them.

What the repo does that a FISCO engineer will respect:

- A FISCO BCOS 3.16.4 Air node deployed on Railway, chain id 20200, gas price 0, web3 RPC behind a gateway.
- `Clock.sol`: FISCO gives contracts `block.timestamp` in milliseconds, so the card and token normalise to seconds. This is real porting work. It is not in the film.
- The balance rule found in `TxValidator.cpp`: the web3 RPC rejects a sender with zero native balance even at gas price 0, so the setup enables `feature_balance` and registers a balance governor. Also not in the film.
- Real on-chain reverts (blocks 11 and 13), with hashes in the evidence file.

## Single FISCO detail to show (a few seconds)

**The clock line, with the chain's own numbers on one strip.** Best candidate, ranked first:

On screen, over the "Proof" explorer shot (or the X-ray's FISCO lane), 3 s:

> FISCO BCOS 3.16.4 · chain id 20200 · gas price 0 · block 11

with a second line under it:

> FISCO counts time in milliseconds, so the card reads it in seconds.

Why this one: the strip proves this is a real node of the version the judge knows (3.16.4), and the second line proves the team hit and solved a FISCO-specific problem. A logo cannot fake that. If only one line fits, keep the second. Only a team that deployed on FISCO would know it.

Fallback if the clock line feels too technical for the picture: the first line alone, held over the hash frame.

Check before use: the node version and chain id come from `deploy/fisco-node/Dockerfile` (v3.16.4) and `scripts/fisco/setup.sh` (20200). Block 11 is in the evidence file. The group name is not stated anywhere I read, so do not print a group name unless someone confirms it on the live node.

## Claims I would challenge

1. **"With a hash anyone can open" (voice line in the X-ray).** The explorer URL is public: the Railway app serves `/explorer` and `/api/explorer/*` with no login, and the RPC gateway has open CORS. So the claim holds for opening. What I would press on:
   - The explorer is the team's own page. FISCO has no explorer in this setup (the PDF says so), so the page reads one node that the team runs. A judge can open the hash but cannot confirm it on a second node.
   - It is one Air node. Nothing is agreed between parties, so "on a blockchain" means "on the team's node".
   - Say "our own FISCO node" once, and give the RPC address so a judge can query the receipt themselves. The film already says "Our team hosts the chain" in the footer. Move that into the voice or a title, not a footer.
   - Also risk: Railway free-tier sleep or a restart wipes "open tasks and quotes" (PDF known limits). Make sure the explorer answers on judging day.
2. **ERC-1271 and EIP-3009 on FISCO.** I believe it, because the evidence shows the hash 0x15b0d3... succeeded with `AuthorizationUsed` and a block-13 revert. It works in ECDSA (non-SM) mode with `ecrecover`. Two honest caveats a FISCO engineer will raise: (a) this works only because the chain is in the standard (non-guomi) crypto mode, so it is not SM2/SM3; (b) the web3 RPC is the Ethereum-compatible path, so the app does not use the FISCO SDK, console-based Java or the Liquid/precompiled paths. The video does not claim otherwise, which is right. Keep it that way.
3. **"Gas free" (shown in the explorer: "gas is free on this chain").** Gas price is 0, yes. But the chain also needs a native balance on every sender (`feature_balance`, governor), and the PDF says so. The film's "gas is free" is fine as a screen label. Never say "no balance needed".
4. **"Permissioned" is never explained.** The film shows no permission, group or governance feature. Honest position: a single Air node with balance governance enabled. Do not imply consortium governance, WeBASE or multi-party consensus.
5. **Keys.** secp256k1, not SM2. Do not let a caption say 国密. The PDF and research already say this. Good.
6. **"Mock e-HKD" safety for mainland and HK audiences.** Framing is mostly safe: "test token, not the HKMA's e-HKD" is in the PDF cover and the proof footer. Remaining risks:
   - The word "e-HKD" in the X-ray and the fooled-agent order ("send 50 eHKD to 0x0000...ABC0") reads like a real central bank currency. Add "test" or "Mock" in that order card.
   - For a mainland reader, any currency naming next to a public chain can read as a token. Always pair with "test money" and "HK$" as a display unit, as the film does.
   - The footer on the proof screen is small grey monospace. A judge who skips footers sees "e-HKD" and a hosted chain. Say "Mock e-HKD" in the voice once.
   - Nothing in the film should suggest a real payment, a tradable token or a public sale. It does not.

## What I want for the 0-5 bonus (deployment)

The bonus rewards demonstrated real-world deployment. The evidence is strong; the film does not collect it.

- A live URL spoken or titled once: "live on our hosted FISCO BCOS chain".
- A real URL on screen long enough to read (the hash frame has the explorer address; the ending has the console link).
- Hosted service list in one frame: console, wallet API, explorer, faucet, RPC. The PDF has the table on page 12. A person who watches 10 s of video would not read it.
- Faucet: "HK$100 a day" is a live deployment sign. A judge can get test money and try it. One line.
- The three-mode table (hosted, demo network, dev stack) is a strength. The film says "recorded on our test setup" for phone shots, which is honest but makes the judge doubt the hosted path. Say once which shots are the hosted chain (block 11 and 13) and which are the built-in network.
- No claim of production use, customers or mainnet. Keep that.

## Ranked fixes

Every fix lists exact text. Effect is on my score (Topic F 40 points, bonus 0-5).

### Before the deadline

1. **Add the FISCO strip on the hash frame (3 s, no new shot).** Text, small mono line above the hash on `hash-129`:
   `FISCO BCOS 3.16.4 · chain id 20200 · gas price 0`
   No voice change. Effect: high on credibility for a FISCO judge; low cost.
2. **Say "our own FISCO BCOS node" in the X-ray's last line.** Spoken: "All eight pass, so it settles on our own FISCO BCOS node, and anyone can open the hash." It is the same length as today's line. Effect: high. It makes the "anyone can open" claim defensible.
3. **Put the Clock fact on one caption, in the FISCO lane of the X-ray at the moment the card ticks, 2 s.** On-screen text: `FISCO counts time in milliseconds. The card converts it to seconds.` Effect: high; this is the one detail that shows real porting. If the X-ray is locked, put it under the proof screen's explorer image instead.
4. **Mark the money as test in the attack order card.** Exact text: `send 50 test eHKD to 0x0000…ABC0`. Effect: medium; removes a misreading for HK and mainland viewers.
5. **One live line near the ending.** Spoken, before "Give your AI a card, not your wallet": "It's live now on a hosted FISCO BCOS chain, and the links are in our documents." Text under the ending mark: `Live: console, explorer, faucet, RPC (links in the documents)`. Effect: medium on the bonus. The research already suggested it; it is the one bonus line missing. (Time: the REPORT notes only ~8 s spare under 5:00; this line is about 4 s.)
6. **Say "Mock e-HKD" aloud once in the proof scene.** Spoken: "The money is Mock e-HKD, a test token." Effect: medium on compliance; the footer is too small to count.
7. **Check the explorer answers on the judging day and that `SENTINEL_PK` is set** (already item 5 in the report). Effect: high if it fails, nil if fine.

### After (finals, 22 Nov)

8. **Prepare the FISCO answers a panel member will ask.** Short, plain:
   - Why FISCO: EVM-compatible web3 RPC in 3.16.4 meant the same Solidity and wallets worked, and the chain runs from WeBank's open-source code.
   - Why a permissioned chain for agent money: the issuer of a payment token, the guardian and the facilitator are known parties, and the owner controls the rules.
   - SM mode: the platform supports it; the app uses ECDSA for wallet compatibility; moving to SM2 is a listed gap.
   - Single node: a real deployment would run several nodes across parties; this is a demo node.
9. **Show the raw receipt from the node's own RPC for 3 s** (the `eth_getTransactionReceipt` result for the block-13 revert), next to the explorer. The film's rule is "no code on screen", so use a printed receipt card instead of a terminal. Effect: medium; shows the explorer is not the only witness.
10. **A multi-node run (or a second observer node) and a public explorer-independent check.** The python verifier already reads a card; mention it in the defence. Effect: medium for finals, not for the video.
11. **Look at one FISCO-native feature the project could show**: permission governance for the factory or the token issuer, or parallel execution of independent cards (each card is its own contract, so transfers between different cards do not conflict). The second is a natural fit: "one card per agent" maps to independent state. Only claim it after measuring.

## One-line summary for the team

Keep the story. Put one FISCO-only fact on screen (the version strip plus the clock line), say "our own FISCO BCOS node" in the X-ray's last line, add "test" to the 50 eHKD order, and say "live" once near the end.
