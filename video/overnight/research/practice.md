# Demo-video practice research (20 Oct 2026)

Method: WebSearch plus WebFetch of ~6 pages. Evidence is thinner than the brief asked for. Search returned mostly secondary and vendor sources, and no direct frame-by-frame breakdowns of Apple, Linear, Stripe, Arc, Raycast or Vercel films. Anything not marked VERIFIED (fetched from the primary page) is unverified. I did not watch any film.

## 1. Hackathon demo videos and organiser guidance

Sources
- ETHGlobal Cannes event page, VERIFIED fetch: https://ethglobal.com/events/cannes/info/details (same template on Tokyo, Prague, Superhack: https://ethglobal.com/events/tokyo/info/details)
- Devpost "6 tips for a demo video", VERIFIED fetch: https://info.devpost.com/blog/6-tips-for-making-a-hackathon-demo-video
- Chainlink hackathon tips, VERIFIED fetch: https://chain.link/blog/blockchain-hackathon-tips
- hackathon.com tips, VERIFIED fetch: https://tips.hackathon.com/article/creating-the-best-demo-video-for-a-hackathon-what-to-know
- Pitch guide (secondary, unverified quality): https://blogs.reskilll.com/hackathon-demo-presentation-tips-pitch-3-minutes-win-2026/
- YC: no official demo-video page found. Secondary only: https://www.startupgrind.com/blog/y-combinator-application-video-tutorial/ and https://www.stackmatix.com/blog/how-to-apply-to-ycombinator (unverified).

Observed
- ETHGlobal template: 2 to 4 minutes (outside is auto-rejected). Backstory under 20 s. Summary slides at most 4 bullets. "Show the project working, not just described." Cover tools used, why, and challenges solved. Do not speed footage up. Cut dead waiting.
- ETHGlobal bans synthetic voice: "You must narrate yourself"; text-to-speech and AI voiceovers are listed as not allowed and as a resubmission cause. It also lists "music with on-screen text instead of narrating" as a mistake, and says not to record on a phone.
- ETHGlobal judging axes: technicality, originality, practicality, usability, and "WOW factor". Finalists then demo live for 4 min plus 3 min Q&A, so the video is only the first pass. Partners judge from the video alone.
- Devpost: write the script yourself ("rather than relying on generic AI text"), open with overview, then live demo, then tie to judging criteria, best microphone, upload early and check access.
- Chainlink: the video "proves the project is real"; add intros, graphics, music to stand out among many videos. Wants someone narrating each step.
- hackathon.com: start with the project, no long intro, short, fuzzy voice-over hurts.
- Secondary: problem hook in the first 20 s, live demo is the most important part, do not show the code editor or terminal, record a backup. YC founder-video guidance (secondary): founders talking to camera, no post-production, about a minute. The YC product-demo advice is a working product with real users, not a mockup.
- Structure norm across sources: hook, problem, live product, how it works, proof, close. 2 to 4 minutes.

What it means for ChainBrain
- FinTechathon's own rules for the video are not in this research. Check its submission page for a voice rule and a length cap. Our 4:46 is over ETHGlobal's 4:00 ceiling. If FinTechathon has any cap near 3 to 5 min, we are at the edge. (Unverified: I did not find FinTechathon's rule.)
- Do the owner's real voice. Even if FinTechathon allows TTS, ETHGlobal's rule shows judges in this space treat synthetic voice as a negative. Swap Sarah for the owner's voice tonight if recorded.
- Our film has no face on camera until the team slide at 4:29. Organisers say the video should prove the thing is real and the team is real. Add a 3 to 5 s on-camera line or the team earlier.
- Our hook is 12 s of backstory (Morse incident), under the 20 s guide. Fine.
- We show the live product from 0:46. Good vs. "slides not demo". Keep the "recorded on our test setup" tag.
- No code on screen matches the "do not show the terminal" advice.
- The film hits "judging axes" implicitly. Add a visible technicality line (FISCO BCOS, Solidity, 8 checks) and a usability line. The X-ray already does technicality.

## 2. Launch films

Sources
- Lago, "we killed our motion design job" (a company's own process write-up that names Linear as the benchmark), VERIFIED fetch: https://getlago.com/blog/we-killed-our-motion-design-job
- 9to5Mac on Apple keynote editing and transitions: https://9to5mac.com/2023/06/21/apple-keynote-videos-transitions-and-editing/ and MacStories: https://www.macstories.net/stories/apples-keynote-videos-more-frequent-and-more-cinematic/ (only snippets read)
- Basement Studio, Vercel Ship 2025: https://basement.studio/post/behind-the-ship (snippet only)
- Raycast case study (spec work, not official): https://contra.com/p/llNMeeMX-kinetic-product-motion-for-raycast-making-a-ui-feel-alive
- Tidbits on The Browser Company's engineer-in-apartment videos: https://tidbits.com/?p=70764 (snippet only)

Observed
- Lago's account of Linear's films: no voiceover, no stock footage, no abstract 3D shapes. The camera moves through the real product, one action at a time, feature clear in about 20 s. Its premium markers are "real pixels", a closed palette from the design system, camera zooms and pans doing the guiding, every shot advancing the story, and shared timing/easing tokens. Its "generic AI" tells are near-miss screens, lookalike icons and filler data. This is one company's interpretation, not Linear's statement.
- Apple: the cited craft is seamless transitions between shots, a video that sets the theme and then reveals, and a post-2020 shift to pre-recorded, cinematic films. Apple sound design and use of silence: I found no credible source. Do not cite it.
- Vercel Ship 2025: a single concept ("liquid"), an animated short opening the keynote (snippet).
- Raycast: dark grade with custom UI and kinetic motion (spec piece only).
- The Browser Company: casual founder and engineer videos, personal and transparent (snippet).
- I found nothing usable on Stripe Sessions motion or Arc's launch film style. Treat any claim about them as unverified.

What it means for ChainBrain
- We already match the Linear checklist on "real pixels" (phone recordings, real explorer, real logos). Audit for near-miss screens: any mocked or redrawn app UI in the X-ray should either be a true screenshot or clearly be a diagram.
- Give the camera a job on every phone clip: slow punch-in to the one element that matters (the slide-to-approve, the refusal notice), then cut. Avoid whole-phone static holds over 3 s.
- Tokenise timing: one easing curve and a small set of durations across all cards, badges, text. Our 120 BPM grid already helps. Check that nothing eases differently.
- Restraint: our film is dense for 4:46 (about 20 sections). Cut candidates if time: the "If a key is stolen" four-card beat or shorten "Only stricter". Keep the silence before "No."
- Opening the film with a theme that the close echoes (Morse key at 0, "a card, not your wallet" at the end) is the Apple pattern. Make the last frame visually rhyme with frame 1.

## 3. Agentic-payment explainers

Sources (all secondary or vendor blogs; no official Visa or Mastercard page was returned, so unverified against primaries)
- AP2 and mandates: https://eco.com/support/en/articles/15192002-ap2-protocol-explained-google-s-agentic-commerce-standard-2026
- Agent Pay vs Visa TAP: https://eco.com/support/en/articles/15192003-mastercard-agent-pay-vs-visa-trusted-agent-2026-compared
- Mastercard agentic tokens: https://stellagent.ai/insights/mastercard-agent-pay-agentic-tokens
- Visa and card delegation: https://nevermined.ai/blog/ai-agent-card-delegation
- x402: https://docs.cdp.coinbase.com/x402/support/faq , https://sherlock.xyz/post/x402-explained-the-http-402-payment-protocol , https://docs.base.org/base-app/agents/x402-agents
- I found no video explainer for any of them.

Observed (per those sources)
- AP2 (launched 16 Sep 2025): three signed Mandates (Intent, Cart, Payment). The agent cannot exceed the Intent Mandate's scope without re-prompting.
- Mastercard Agent Pay (launched 29 Apr 2025): an Agentic Token bound to one agent, one merchant scope and a consent policy. The agent never holds the raw card number. Limits are a spend ceiling, merchant categories and an expiry.
- Visa Intelligent Commerce (30 Apr 2025) and Trusted Agent Protocol: the agent requests a credential, Visa checks it matches the user's instruction. TAP is about recognising approved agents.
- x402: agent requests, server answers HTTP 402 with price terms, agent pays and retries with proof, server returns data. Seconds, no login.
- Metaphors that recur: token, mandate (signed permission slip), scoped credential, and an HTTP "payment required" handshake.

What it means for ChainBrain
- Our "AI Card" metaphor sits next to the industry's own "token bound to an agent plus limits" idea, so it will read as familiar to judges. Say it once, explicitly, as the difference: those limits are checked by a network or wallet company, ours by the card's own smart contract. The X-ray comparison line already does this. Keep it, and make the on-screen words "checked by us" versus "checked by the card" very short.
- A mandate-style visual (a signed rule list you approve) is what your "slide to approve" shows. Label the rules on the card face as the "mandate" for one frame so card-network judges map it instantly. Cheap.
- The x402 beat should show the 402 handshake as a 3-step visual (request, price, pay and retry). Our X-ray has "Exa answers HTTP 402". Make sure the retry-with-proof step is visible, not only the 402.
- Do not claim adoption numbers for x402: sources conflict (119 M vs far smaller).

## 4. Not looking AI-made in 2026

Sources
- https://www.atlabs.ai/blog/how-to-make-ai-videos-look-less-artificial-in-2026-(step-by-step-guide) (vendor, unverified)
- https://www.mirra.my/en/blog/ai-motion-graphics-generator-guide-2026 (vendor)
- Voice studies, all secondary: https://itbrief.co.uk/story/uk-listeners-spot-ai-voices-faster-trust-them-less , https://www.contentgrip.com/ai-voice-study/ (search result titled "Studio Resonate reveals the real impact of AI voices in advertising": https://www.contentgrip.com/studio-resonate-ai-voice-study/ ), https://www.contentgrip.com/ai-voices-in-marketing-adobe/
- Our own project's wording research is in STORYBOARD-v4.md.

Observed
- Claimed AI-video tells (vendor sources): floaty motion without weight, drifting faces, the same slow push-in repeated, flicker or morphing, a logo that subtly changes shape, text in the wrong corner, music too loud. "Viewers clock it in two seconds" is an assertion, not measured.
- Suggested fixes: hybrid pipeline, hand-polish last beat timing, specific rather than average choices, a distinct signature.
- Voice: 2026 studies (vendor-run or secondary) say listeners often cannot tell AI voice, but disclosure or detection lowers trust, and human voices score about 23% higher on trust in ads (unverified, undated). Adobe's survey says consumers notice AI voices but trust humans more.
- Genre inference (mine, not sourced): a generic dark "fintech keynote", glowing gradients, glass cards and uniform fade-ins is itself a recognised look.

What it means for ChainBrain
- Our assets are code-built (Remotion), real recordings and real logos, so the morphing and drifting tells do not apply. The risks are: one repeated push-in, identical ease on every element, uniform fade-up of every title, and a TTS voice with even pacing.
- Add visible human specifics: real timestamps, the real block number and hash, a few seconds of real hands on the phone, a typo-free but not perfectly symmetrical layout, a raw team clip.
- Voice: ship the owner's own voice. If not ready, keep the synthetic voice but do not disclaim it twice, and avoid claiming "voice of our team".
- Vary camera moves: at least three types (push, lateral track, pull-back, hard cut).
- Add a little real room tone or phone-tap sound under screen recordings (foley), and let the music drop out in at least two other places besides the "No." silence.

## Ranked top 10

| # | Idea | When | Judge impact | Confidence | Effort |
|---|---|---|---|---|---|
| 1 | Replace the synthetic voice with the owner's own recording (ETHGlobal bans TTS, trust studies favour human). Keep Sarah as a fallback if the take is not clean | before | High | Medium (rule is ETHGlobal's, not FinTechathon's) | 1 to 2 h if audio exists, needs word-timing re-sync |
| 2 | Check FinTechathon's submission rules for video length and voice, trim to the cap if there is one | before | High if a cap exists | High that it is worth 5 min | 5 min to check, 30 min to trim |
| 3 | Put a face on camera early: 3 to 5 s clip of a team member saying the first line, or team portraits in the first 30 s | before if a clip exists, else after | Medium to high (shows the team is real) | Medium | 30 min |
| 4 | Make the last frame rhyme with frame 1 (Morse dots resolving into the card mark) | before | Medium | Medium | 20 min |
| 5 | Camera moves on phone clips: slow punch-in to the single element that matters, vary move types, cut static holds over 3 s | before | Medium | Medium | 45 min |
| 6 | Label the approved rules as the card's "mandate" for one frame, and show the 3-step x402 handshake including the retry-with-proof | before | Medium (maps to AP2 and x402 vocabulary judges know) | Medium | 30 min |
| 7 | Cut 20 to 30 s of the least essential beats (e.g. shorten "If a key is stolen", "Only stricter") to sit nearer a 4:00 to 4:15 runtime | before | Medium | Medium | 30 min, risks re-timing music |
| 8 | Add foley and room tone under phone clips, and two more music drop-outs | after | Low to medium | Low to medium | 1 h |
| 9 | Audit for near-miss UI: any redrawn app screens in the X-ray become true screenshots or are clearly labelled diagrams | after | Medium | Medium | 1 h |
| 10 | Cut a 90 s version of the film for finals (hook, card, one payment, the "No.", proof, team), since finalists present live and judges skim | after | High at finals | Medium | 2 to 3 h |

Confidence is in the evidence behind the idea, not in the outcome. Items 1 and 2 come from a rules page I read directly. The rest rest on secondary sources or my own inference.
