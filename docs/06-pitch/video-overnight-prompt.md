# Overnight session prompt: keep improving the demo video

Paste everything below the line into a new Claude Code session in this repo and run it with `/goal`. The session works on its own branch, so the main checkout and the current video stay untouched.

---

**Goal:** keep improving the ChainBrain FinTechathon demo video, through the night and beyond.

- Deep-dive the latest (2026) evidence on what makes a winning pitch video that is clear, human and cinematic.
- Prototype the best ideas on your own branch.
- Keep `video/overnight/REPORT.md` current with a ranked, evidence-backed plan that's ready to cherry-pick.
- Never touch main, never push, and don't stop.

## Context

- **Project:** ChainBrain, repo `/Users/user/Workspace/Projects/shenzhen/chainbrain-github`.
  - FinTechathon 2026, International AI Track, Topic F (AI agent wallets that act on-chain safely).
  - Owner: Chin Jun Quan (Universiti Malaya). Team: Tan Hao Wen (Universiti Malaya), Wong Yong Xi (Universiti Putra Malaysia).
- **Deadline:** submission closes **20 Oct 2026, 23:59 UTC+8**.
  - The owner's main session applies what you recommend.
  - Label every idea "before the deadline" or "after". The top 10 are picked on 22–23 Oct from the documents and video, and later ideas still help the finals.
- **The current video:** v4, 4:46.5 (hard limit 5:00), at `video/out/InternationalAI-ChainBrain-DemoVideo.mp4` (commits d5fae84 and 49e8bc2).
  - Read first: `video/STORYBOARD-v4.md` (why it is this way), `video/SCRIPT.md` (shot list and the full voice-over), `video/README.md` (pipeline and honesty rules), `video/CREDITS.md`.
  - Watch it: extract frames with ffmpeg and look at them, or render stills.
- **Pipeline:**
  - Remotion 4 in `video/remotion`.
  - `remotion/src/edit.json` is turned into `remotion/src/timeline.json` by `tools/layout.py`. Cuts land on spoken words, on a 120 BPM grid.
  - Scenes live in `remotion/src/scenes/` (V3, V4, Face, PhoneScene, Closing).
  - Music is composed in code (`music/score.py`, cues from `tools/cues.py`); the mix is `tools/mix.py` (−14 LUFS).
  - Storyboard stills: `cd video/remotion && node scripts/stills.mjs <dir> 0.5 <t1> <t2> ...`.
  - Short test renders: `npx remotion render Main <out.mp4> --frames=<a>-<b>`.
- **Voice:** today it's ElevenLabs (Sarah). The owner is recording their own voice today: the kit is `video/out/recording-kit.html`, the importer `tools/voice.py`, plus an on-camera intro and closing line. Timings will shift, so keep your prototypes anchored to words through `edit.json`, never to hard-coded seconds.
- **Source of truth for every claim:**
  - `docs/submission/ChainBrain-technical-overview.pdf`
  - `docs/submission/ChainBrain-security-self-assessment.pdf`
  - `docs/redteam/hosted-proof.json`
  - `docs/evidence-fisco-railway.json`
  - the code
  - Competition rules: `docs/01-competition/`.
- **Already cloned for reference:** `reference/videos/` (six demo-video projects, including lemo-opuscar's styles) and `reference/repos/video/` (remocn, remotion-sparse, motion-canvas-examples).

## Decisions already made with the owner

Don't relitigate these. Propose a change only with strong evidence, and say so plainly.

- **Story: "the AI Card".** Each agent gets its own card. The card's own smart contract on FISCO BCOS sets the limits, and a second AI watches and can only make the rules stricter. The film runs:
  - **Hook:** the 4 May 2026 Morse-code wallet drain, then Accenture's 74% / 9%.
  - **Demo:** get a card, then the first payment.
  - **X-ray of that payment:** keys, the money path, the server checks, "the token asks the card", eight checks, a real hash, the whole system.
  - **Break it:** use it, break it, the card says no.
  - **Why it held:** eight layers, then stolen keys, then the watcher, then "stricter, never looser".
  - **The HKMA's four principles:** ChainBrain "covers" them; never "compliant" or "aligned with".
  - **Proof:** 7 of 7 rejected on the hosted chain, 63 attacks with HK$0 lost, 462 tests.
  - **Close:** team slide, then the ending.
- **Look:**
  - A dark keynote stage. Vermillion only for attacks and refusals, powder blue for safe.
  - Real app UI and real logos. No code on screen.
  - No drawn SVG glyphs that look AI-made; Lucide icon badges, never typed ✓ ✗ · →.
  - Keep the drawn AI Card graphic.
- **Words:**
  - Plain and spoken, like a founder talking to one judge.
  - None of these: "not X, because Y", stacked fragments, question-then-answer, colon reveals, middle-dot chains, arrows.
  - "Negotiate", not "haggle".
- **Honesty:**
  - Phone footage is the app's built-in test network, labelled "recorded on our test setup".
  - Only real hosted-chain hashes are shown.
  - Mock e-HKD is test money.
  - Exa, CoinGecko and Nansen are demo sellers; never claim their data is real.
  - Never name or describe rival teams in anything judges see.
- **Process:**
  - The owner approves a rendered storyboard (real frames plus the full script) before any final render.
  - Names for the voice: Jun Quan is "June Chuen", Yong Xi is "Yong Shee".

## Rules for this session

- **Your branch only.** Work in your own git worktree on a new branch (for example `video-overnight`). Never edit, commit or render in the main checkout at the path above. Never push or merge.
- **Set up the assets once.** Your worktree lacks the git-ignored assets. Link big read-only files, copy anything you may change, and never write into the main checkout's folders:

```bash
MAIN=/Users/user/Workspace/Projects/shenzhen/chainbrain-github
cd "$(git rev-parse --show-toplevel)/video"
ln -s "$MAIN/video/.venv" .venv
ln -s "$MAIN/video/footage" footage
ln -s "$MAIN/video/tts/models" tts/models
ln -s "$MAIN/video/music/lib/instruments" music/lib/instruments
cp "$MAIN/video/.env" .env 2>/dev/null || true   # ElevenLabs key: never print it
ln -s "$MAIN/video/remotion/node_modules" remotion/node_modules
mkdir -p remotion/public/footage
for f in "$MAIN"/video/remotion/public/footage/*; do ln "$f" remotion/public/footage/; done   # hard links: read only
for d in ui brand fonts team audio; do cp -R "$MAIN/video/remotion/public/$d" remotion/public/; done
```

  Check the setup by rendering one still of the current cut before you change anything.
- **ElevenLabs:** at most 3,000 characters in total, for small A/B tests. The owner's own voice is the plan.
- **Commits:** one idea per commit on your branch, with a clear message, so the main session can cherry-pick it.
- **Facts:** verify them with two independent sources and cite URLs. Mark anything unverified. Quote only short phrases.
- **Licences:** note the licence of anything you borrow. Remotion is free for teams of up to three people.
- **Scale:** use subagents and multi-agent workflows as much as you need. I opt in: use workflows and fan out agents.

## Research (deep, and keep going)

1. **Academic work, 2015–2026 (prefer 2023–2026).** Areas:
   - Multimedia learning: Mayer's principles (coherence, signalling, redundancy, contiguity, segmenting, personalisation, voice, image), cognitive load in explainer videos, segment length.
   - Persuasion and pitching: crowdfunding and pitch-video studies, perceived passion and preparedness, first impressions and thin slices, narrative transportation.
   - Trust: human versus synthetic voices (2024–2026), presenter presence on camera, trust in explanations of AI and of security.
   - Visuals and captions: how to show risk and security visually, bilingual captions for non-native viewers.

   For each finding, say what it means for this video.
2. **Practice in 2026.**
   - Winning hackathon demo videos (ETHGlobal, Devpost, Chainlink, Coinbase, Google, a16z), YC Demo Day guidance.
   - Launch films (Apple, Linear, Stripe Sessions, Arc, Vercel).
   - Agentic-payment explainers (x402, Visa, Mastercard, Google AP2, Stripe ACP).
   - How premium films avoid looking AI-made; current motion-design practice.
3. **Judge fit.**
   - Re-read `docs/01-competition/`. Scoring: task completion 40, security and compliance 30, innovation and interaction 30, bonus 0–5.
   - What WeBank, FISCO and Hong Kong fintech experts look for.
   - New HKMA or SFC statements on AI agents since 16 Oct 2026.
   - Whether Simplified Chinese subtitles would help, and how to do them honestly (who checks the translation).
4. **GitHub.** Find and pull repos with related skills and projects:
   - Remotion skills and templates, Claude Code skills for video, pitch or storytelling.
   - Motion libraries, bilingual caption tools, voice and mix processing.

   Study `reference/videos/` and `reference/repos/video/` too. Record what each offers and its licence. Put new clones under `reference/` (git-ignored).
5. **Accuracy audit.** Check every voice line in `video/SCRIPT.md` and every on-screen number and label against the code and the submitted PDFs. Flag anything overstated or ambiguous. Check that the subtitles match the voice.
6. **Audio, voice and subtitles.**
   - Critique the music and the mix: dialogue clarity, loudness, ducking.
   - Write delivery coaching for the owner's own recording: pace, warm-up, distance from the phone.
   - Improve how a phone-recorded voice is cleaned (the `CLEAN` chain in `tools/voice.py`).
   - Check subtitle reading speed.

## Prototype loop

1. Pick the open idea with the best expected effect on judges × confidence ÷ effort that fits under 5:00.
2. Build it on your branch. Render before-and-after stills (and a short test segment where motion matters).
3. Have a reviewer agent critique it against the scoring and the decisions above, as a sceptical judge would.
4. Keep it or drop it. Record the result, frames included, in the report.
5. Repeat. Between cycles, look for new 2026 sources.

## Deliverables (commit on your branch; refresh at least every two hours)

- **`video/overnight/REPORT.md`:**
  - At the top, **"If you have two hours before the deadline, do these"**: the top three to five changes, each with the commits to cherry-pick, the expected effect, the minutes it takes and the risk.
  - Below that, the full ranked list with evidence and sources, before-and-after frames, effort, risk, and "before / after the deadline".
- **`video/overnight/storyboard.html`:** before-and-after frames for every prototype, with the script lines they change.
- **`video/overnight/research/`:** one note per topic, with sources.
- **`video/overnight/frames/`:** 960 px JPEGs. `out/` is git-ignored, so keep frames here.

## Never stop

- When the report is current, pick the next question.
- If ideas run out, run a fresh critique of v4 through a new reviewer persona, then research what they'd want:
  - a WeBank engineer
  - an HKMA policy person
  - a non-native English judge on a laptop speaker
  - a motion designer
  - a sceptical security researcher
