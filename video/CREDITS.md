# Credits: ChainBrain demo video

`InternationalAI-ChainBrain-DemoVideo.mp4`, made for FinTechathon 2026, International AI Track, Topic F.

## Team

- Chin Jun Quan, Universiti Malaya
- Tan Hao Wen, Universiti Malaya
- Wong Yong Xi, Universiti Putra Malaysia

## Footage

- **Phone:** the ChainBrain Expo app in Expo Go on the iOS Simulator, recorded with `xcrun simctl io recordVideo` on 19 Oct 2026.
  - It runs on the app's **built-in network**, a simulated chain (Settings → Demo network).
  - Every phone shot carries an on-screen label saying so.
  - The app's own auto-play drove the scenes.
- **Console:** the ChainBrain web console on its built-in network, recorded in headless Chromium (Playwright 1.64, MIT licence).
- **Real chain:** the hosted ChainBrain explorer for the team's FISCO BCOS 3.16.4 chain (chain id 20200).
  - The proof scene shows these transactions: `docs/evidence-fisco-railway.json`.
  - "Why it held" shows two of them as screenshots: block 11 (success, HK$2.30 to the team's test seller DataLite) and block 13 (the forced transfer, reverted).
- **App UI crops:** cut from the phone recordings above (`tools/ui-stills.sh`, `tools/crops.py`); they are the app's real screens on its built-in network.
- **Seller names:** Exa, CoinGecko, Nansen, DataPro, Harbour Wines, ShadyFeed and TradeWire appear as the app shows them on its built-in network.
  - DataPro, Harbour Wines, ShadyFeed and TradeWire are fictional demo sellers.
  - Seller marks (Exa, CoinGecko, Nansen) come from `shared/brand/` (see `shared/brand/SOURCES.md` for each source and its usage rules).
  - Agent marks: the Claude Spark (Anthropic press kit) and the OpenAI Blossom (OpenAI brand assets), unmodified.
  - All third-party marks are shown unmodified, as small avatars beside the name, the way the app shows them. No partnership is implied.
- **Technology marks:** the FISCO BCOS logo from the FISCO-BCOS repository (`docs/FISCO_BCOS_Logo.svg`) and the x402 logo from the x402 repository (`x402-logo-dark.png`), both shown on a white plaque, for identification only.
- **Icons:** Lucide (ISC licence), the same icon set the ChainBrain apps use.

## Voice

- ElevenLabs text to speech, model `eleven_v4`, premade voice "Sarah", generated with `tts/eleven.py`; word timings from the API's character timestamps. Check ElevenLabs' terms for your plan before publishing beyond the competition (the free plan's commercial terms are not stated on its pricing page).
- Pronunciation checked with faster-whisper `small.en` (MIT).
- Offline fallback when no key is set: Kokoro TTS v1.0 (`kokoro-onnx`, MIT; model weights Apache-2.0).

## Music

- **Score:** composed in code for this video (`video/music/score.py`).
- **Instrument samples:** VS Chamber Orchestra: Community Edition, by Versilian Studios / Sam Gossner, CC0 1.0. Used for strings, brass, timpani and orchestral percussion.
- **Sampler:** `lemo-opuscar` sampler and sound tools, © 2026 LemoLab, MIT licence (`video/music/lib/LICENSE-lemo-opuscar.txt`).
- **Synthesis:** sub hits, risers, the braam and the bells are numpy synthesis written for this video.

## Fonts

- Clash Display and General Sans by Indian Type Foundry, ITF Free Font License (Fontshare).
- JetBrains Mono, SIL Open Font License 1.1.
- Noto Sans SC, SIL Open Font License 1.1.

## Tools

- Remotion 4.0.536 (free licence for teams of up to 3 people), React 19, ffmpeg.
- The Kokoro fallback script is adapted from lemo-opuscar `core/tts/tts.py` (MIT).
