# Credits: ChainBrain demo video

`InternationalAI-ChainBrain-DemoVideo.mp4`, made for FinTechathon 2026, International AI Track, Topic F.

## Team

- Chin Jun Quan, Universiti Malaya
- Tan Hao Wen, Universiti Malaya
- Wong Yong Xi, Universiti Putra Malaysia

## Team photos

- Supplied by the team for the team slide (`footage/teammate/`, not in git); cropped to matching 3:4 portraits by `tools/team.py`.

## University marks and the flag (team slide)

Shown for identification only, each on a white plaque; no endorsement is implied. Files in `video/assets/brand/`.

- **Universiti Malaya:** the logo from the university's own website header (`https://www.um.edu.my/images/img-logo-UM.png`, 180 x 56), unmodified (`universiti-malaya-logo.png`).
- **Universiti Putra Malaysia:** the logo from the university's own website header (`https://www.upm.edu.my/assets/images23/20170406143426UPM-New_FINAL.jpg`). It was converted from print colours (CMYK) to RGB and its white margin trimmed; the mark itself is unmodified (`upm-logo.png`).
- **Flag of Malaysia:** Wikimedia Commons, `File:Flag_of_Malaysia.svg`, public domain (`flag-malaysia.svg`). The film animates it waving.

## Facts quoted

- HKMA, Carmen Chu, Executive Director (Banking Supervision), opening remarks at the Finance + A.I. Forum, 16 Oct 2026 (https://www.hkma.gov.hk/eng/news-and-media/speeches/2026/10/20261016-1/): governance anchored to intent, kill-switch mechanisms, "A.I. versus A.I.", securing the boundaries around an agent. The video paraphrases them as four ideas from the speech, which places them under the HKMA's ART framework.

## Facts in the opening

- The Morse-code wallet drain, 4 May 2026: OECD AI Incidents Monitor, https://oecd.ai/en/incidents/2026-05-04-4a73 (amount reported as about US$150,000 in DRB tokens; reports vary).
- Accenture, "Talk to My AI Agent" (June 2026; 25,590 consumers, 16 countries): 74% would let an agent handle routine tasks; 9% are open to fully autonomous purchasing.

## Footage

- **Phone:** the ChainBrain Expo app in Expo Go on the iOS Simulator, recorded with `xcrun simctl io recordVideo` on 19 Oct 2026, and again on 20 Oct after declining Claude's pending co-sign request, so its ask dock doesn't show.
  - It runs on the app's **built-in network**, a simulated chain (Settings → Demo network).
  - Every phone shot carries an on-screen label saying so.
  - The app's own auto-play drove the scenes.
- **Console:** the ChainBrain web console on its built-in network, recorded in headless Chromium (Playwright 1.64, MIT licence).
- **Real chain:** the hosted ChainBrain explorer for the team's FISCO BCOS 3.16.4 chain (chain id 20200).
  - The proof scene shows these transactions: `docs/submission/evidence/evidence-fisco-railway.json`.
  - "The card says no" shows block 13 (the forced transfer, reverted) as a screenshot.
  - The proof scene lists the 7 refused payments from `docs/submission/redteam/hosted-proof.json` with their hashes.
- **On camera:** Chin Jun Quan's intro and last line, filmed by him in portrait (`footage/face/`, not in git), shown in the film's phone frame.
- **App UI crops:** cut from the phone recordings above (`tools/ui-stills.sh`, `tools/crops.py`); they are the app's real screens on its built-in network.
- **Seller names:** Exa, CoinGecko, Nansen, DataPro, Harbour Wines, ShadyFeed and TradeWire appear as the app shows them on its built-in network.
  - DataPro, Harbour Wines, ShadyFeed and TradeWire are fictional demo sellers.
  - Seller marks (Exa, CoinGecko, Nansen) come from `shared/brand/` (see `shared/brand/SOURCES.md` for each source and its usage rules).
  - Agent marks: the Claude Spark (Anthropic press kit) and the OpenAI Blossom (OpenAI brand assets), unmodified.
  - All third-party marks are shown unmodified, as small avatars beside the name, the way the app shows them. No partnership is implied.
- **Technology marks:** the FISCO BCOS logo from the FISCO-BCOS repository (`docs/FISCO_BCOS_Logo.svg`) and the x402 logo from the x402 repository (`x402-logo-dark.png`), both shown on a white plaque, for identification only.
- **Marks on the X-ray boxes** (`video/assets/brand/`), each from its project's own source, unmodified: Solidity (`ethereum/solidity` docs/logo.svg), Hono (`honojs/hono` docs/images/hono-title.png), OpenRouter (the app icon openrouter.ai serves as apple-touch-icon.png). With the Claude, Exa, x402 and FISCO BCOS marks above, they name what runs in each box; no endorsement is implied.
- **Icons:** Lucide (ISC licence), the same icon set the ChainBrain apps use.

## Voice

- The narration is Chin Jun Quan's own voice: an ElevenLabs instant voice clone he made on his own account from his recording ("Quan"), model `eleven_v4`, generated with `tts/eleven.py`; word timings from the API's character timestamps. It plays 7% faster than generated, with the pitch kept (ffmpeg `atempo`). Check ElevenLabs' terms for your plan before publishing beyond the competition.
- The intro and the last line are his own on-camera recordings (`footage/face/`, not in git), imported with `tools/voice.py`; their sound is the recording itself, cleaned and levelled.
- Pronunciation checked with faster-whisper (MIT). Names can be respelled for a synthetic voice only (`say_eleven` in `tts/lines.json`); subtitles keep the real spelling.
- Script wording reviewed against 2025-2026 research on AI-sounding writing (Wikipedia "Signs of AI writing", Kobak et al. 2025, Reinhart et al. 2025): no negative parallelism, stacked fragments, question-then-answer or dot-separated captions.
- Offline fallback when no key is set: Kokoro TTS v1.0 (`kokoro-onnx`, MIT; model weights Apache-2.0).

## Music

- **Score:** composed in code for this video (`video/music/score.py`).
- **Instrument samples:** VS Chamber Orchestra: Community Edition, by Versilian Studios / Sam Gossner, CC0 1.0. Used for strings, brass, timpani and orchestral percussion.
- **Sampler:** `lemo-opuscar` sampler and sound tools, © 2026 LemoLab, MIT licence (`video/music/lib/LICENSE-lemo-opuscar.txt`).
- **Synthesis:** sub hits, risers, the braam and the bells are numpy synthesis written for this video.

## Fonts

- Clash Display and General Sans by Indian Type Foundry, ITF Free Font License (Fontshare).
- JetBrains Mono, SIL Open Font License 1.1.
- PingFang SC (macOS system font) for 链AI脑.

## Tools

- Remotion 4.0.536 (free licence for teams of up to 3 people), React 19, ffmpeg.
- The Kokoro fallback script is adapted from lemo-opuscar `core/tts/tts.py` (MIT).
