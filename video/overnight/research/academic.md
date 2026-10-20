# Academic review for the ChainBrain demo video (v4, 4:46)

Compiled 20 Oct 2026. Method: web search plus fetches of primary pages where reachable. Labels: **VERIFIED-P** = read on the paper's own page/PDF or a repository copy; **VERIFIED-S** = seen in two or more independent secondary sources; **UNVERIFIED** = one secondary source, vendor/blog, or recalled from memory. Mayer's own medians come from his reviews of his own lab's tests, not independent meta-analyses; treat as indicative. Quotes are kept under 15 words.

Facts about this video used below (from SCRIPT.md / STORYBOARD-v4.md): 4:46.5; 58 burned-in English subtitle pages at up to 18 cps; synthetic ElevenLabs voice (owner may re-record); ~534 spoken words, which is about 112 wpm averaged over the whole runtime including pauses (my count from the voice-over column, approximate); a 53 s dense "X-ray" board; the audience is international-track judges, probably many non-native English listeners.

---

## 1. Multimedia learning and pacing

### 1.1 Redundancy: narration plus identical on-screen text can hurt, but not for everyone
- **Claim:** Learners do better from graphics + narration than from graphics + narration + the same text.
- **Study:** Mayer's handbook chapters (Cambridge Handbook of Multimedia Learning, 2005: 10/10 tests, median d = 0.69; 2014: 16/16 tests, median d = 0.86). Mayer is the author of the principle, so the medians are self-reviewed.
- **Counter-evidence for our case:**
  - Toh et al. (ASCILITE 2010) found a *reverse* redundancy effect for non-native English speakers: narration plus synchronised on-screen text beat narration alone, with higher motivation.
  - Arima et al. (Cognitive Science Society) found the effect depends on vocabulary and text difficulty.
  - Adesope & Nesbit (2012) is reported to show that a few condensed keywords on screen beat fully duplicated text. I saw this only second-hand (Erasmus repository paper); UNVERIFIED primary.
  - Mayer, Lee & Peebles (2014) tested captions for non-native speakers; I could not read the captions result.
- **URLs:** https://www.cambridge.org/core/books/abs/cambridge-handbook-of-multimedia-learning/principles-for-reducing-extraneous-processing-in-multimedia-learning-coherence-signaling-redundancy-spatial-contiguity-and-temporal-contiguity-principles/C98AB3A6CE760DD63C048936EA0B3B44 ; https://www.ascilite.org/conferences/sydney10/procs/Toh-full.pdf ; https://repub.eur.nl/pub/95290/REPUB_95290_AAM.pdf
- **Confidence:** VERIFIED-S for Mayer's medians and for the L2 exception; the Adesope & Nesbit figure is UNVERIFIED.
- **What it means for this video:** Keep the burned-in subtitles, because many judges listen in a second language and the subtitle is a help there, not a harm. But the picture should not repeat the subtitle a third time. In phone scenes and the X-ray, delete any big on-screen headline that restates the line being spoken and subtitled. Keep short keyword labels and numbers on screen ("9%", "block 11", lane names), because condensed keywords are the version of on-screen text the research tolerates.

### 1.2 Coherence: decorative extras reduce learning
- **Claim:** Removing interesting but irrelevant material improves learning.
- **Study:** Sundararajan & Adesope (2020), "Keep it coherent", meta-analysis, 58 studies / 68 effects, g = -0.33 (negative effect of seductive details; larger for static pictures, g = -0.70 when details come at the end). Rey (2012, Educational Research Review) found medium negative effects over 39 effects. Both seen via secondary summaries (WSU news release; ACU/learning-scientists pages).
- **URLs:** https://news.wsu.edu/2020/03/19/seductive-details-inhibit-learning/ ; https://www.learningscientists.org/blog/2019/6/20-1
- **Confidence:** VERIFIED-S.
- **What it means:** Each moving element in the X-ray and in the "Why it held" layers should earn its place by being named in the narration within a second or two. Cut ornamental particles, camera drift or glows that point at nothing. Music beds are also covered by Mayer's coherence principle, but I did not search that, so UNVERIFIED: keep the "mechanism texture" under the voice, and consider dropping it 2-3 dB further during the X-ray.

### 1.3 Signalling, segmenting, contiguity, pre-training
- **Signalling:** Richter, Scheiter & Eitel (2016, Educational Research Review): small-to-medium benefit, r = 0.17 [0.11, 0.22], mainly for low prior knowledge. Schneider, Beege, Nebel & Rey (2018, Educational Research Review 23) is the larger meta-analysis; I confirmed the citation but not its effect size (UNVERIFIED size).
- **Segmenting:** Rey, Beege, Nebel, Wirzberger, Schmitt & Schneider (2019), Educational Psychology Review 31:389-419. 56 studies, 88 comparisons, small-to-medium effects for retention and transfer. It also holds for system-paced (video) segmentation, and it helps high prior-knowledge learners more for retention. URL: https://www.doi.org/10.1007/S10648-018-9456-4 . VERIFIED-S.
- **Spatial/temporal contiguity:** Ginns (2006), Learning and Instruction 16(6):511-525; weighted mean d = 0.85 [0.68, 1.02] as quoted by a 2019 Frontiers paper; larger for complex material (d = 0.78) than simple (d = 0.28, n.s.). URL: https://doi.org/10.3389/feduc.2019.00086 . VERIFIED-S.
- **Pre-training:** Mayer handbook medians d = 0.75 (13/16 tests) or 0.92 (7/7) depending on edition. UNVERIFIED beyond that (self-review).
- **Cueing in animation is not guaranteed:** studies of complex animated mechanisms found that conventional arrows/highlights often failed to redirect attention (Curtin eprint; lead.ube.fr abstract; details UNVERIFIED). Cues derived from expert gaze worked better (Madsen et al., NARST 2012, abstract only).
- **What it means:**
  - The X-ray is the highest-complexity part, which is where contiguity and segmenting effects are largest. Put each label right beside its icon, and light a label as the voice names it.
  - Split the 53 s into three visibly separate beats (keys, checks, settle) with a one-second pause or a lane highlight between them, and dim the lanes not in play.
  - Show the four lane names for about 2 s before the voice starts, as a cheap pre-training step.
  - Do not rely on arrows alone; pair every cue with a change in brightness plus the matching spoken word.

### 1.4 Personalisation, voice and image/embodiment
- **Personalisation (conversational wording):** Mayer handbook (2005) 10/10 tests, median d = 1.3. UNVERIFIED beyond that self-review. Already honoured (contractions, "we"/"you").
- **Voice principle:** Mayer (2003, "Multimedia learning: role of speaker's voice") favoured human over machine voices. A later Mayer & DaPra (2012) used a better voice and found no difference. I only saw this via a TTS-vendor blog (readspeaker.com), so UNVERIFIED primary. Craig & Schroeder: preference difference, no learning difference (secondary).
- **Image principle:** the 2021 handbook chapter says seeing the instructor's image does not reliably help learning. URL: https://www.cambridge.org/core/books/abs/cambridge-handbook-of-multimedia-learning/principles-based-on-social-cues-in-multimedia-learning/093C1CDE75CF486DACD4CABC325ABE47 . VERIFIED-S.
- **Embodiment:** on-screen agents that gesture, make eye contact or show facial expression aid learning, same chapter. VERIFIED-S.
- **What it means:** A face is not needed for understanding. If an on-camera clip is used, it should be for credibility and warmth, and the person should look at the lens and use gestures.

### 1.5 Segment length and speaking rate (the one primary study I could read in full)
- **Claim:** Short videos hold attention better; faster, energetic speakers are more engaging; alternating talking head with slides raised engagement.
- **Study:** Guo, Kim & Rubin (2014), "How video production affects student engagement", ACM Learning at Scale (L@S). 6.9 million edX watch sessions, four courses. Median engagement time is at most 6 min regardless of video length. Speaking rate ranged 48-254 wpm (mean 156, sd 31); within a length band engagement rose "up to 2x" with speaking rate, and the authors note the old 160 wpm advice came from live lectures. 6.00x students attempted 46% of problems after talking-head videos versus 33% for others (p much less than 0.001). Informal desk recordings beat high-fidelity studio ones. It is observational and about MOOCs, not pitches.
- **URL:** https://www.cs.rochester.edu/hci/pubs/pdfs/edX-MOOC-video-production-and-engagement_LAS-2014.pdf . VERIFIED-P (I extracted the PDF text).
- **What it means:**
  - 4:46 is under the 6-minute cliff, so length alone is not a problem. The 53 s X-ray is the segment most at risk of drop-off.
  - If the owner records their own voice, ask for a brisk, enthusiastic read (about 150-170 wpm while speaking) rather than a careful slow one. The current track averages about 112 wpm over the whole film including pauses, so there is room.
  - Informal beats polished: a clean phone-mic take in a quiet room is fine; do not over-process it.
  - Cutting to a face between dense graphic sections has support (the talking-head cutaway result), but Guo's authors also warn that rapid switching can jar.

---

## 2. Persuasion and pitching

### 2.1 Preparedness versus passion
- **Claim:** In business-plan presentations, perceived preparedness drove VCs' funding decisions; perceived passion did not carry the same effect.
- **Study:** Chen, Yao & Kotha (2009), Academy of Management Journal 52(1):199-214 (lab experiment plus field study). I could confirm the citation and the headline finding from secondary pages; I could not read the methods or effect sizes (UNVERIFIED sizes).
- **Later work:** Cardon, Mitteness & Sudek (2016, Entrepreneurship Theory & Practice) argue preparedness is a separate construct from passion. Yang et al. (2021, Frontiers in Psychology; 79 VC-entrepreneur projects in China) found both enthusiasm and preparedness raised willingness to invest.
- **URLs:** https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2021.728589/full ; https://effectuation.org/hubfs/Journal%20Articles/2017/05/Cardon_et_al-2016-Entrepreneurship_Theory_and_Practice-1.pdf?hsLang=en
- **Confidence:** VERIFIED-S for the finding's direction.
- **What it means:** The strongest slide for this audience is the evidence block (7 of 7 rejected, 63 attacks, 462 tests, real hash). Do not trade that time for more vibes. Own-voice delivery should be calm and exact with some energy, not hype. Both qualities help in a Chinese sample (Yang 2021).

### 2.2 Facial emotion in pitch videos: peak joy at the start and the end, but only briefly
- **Study:** a USF/Georgia Tech team, Academy of Management Journal (2019), 1,460 Kickstarter pitches, about 8 million frames. Peak joy linked to funding; 3 s of peak joy raised funding 11.3% over 2 s, while 4 s cut it by at least 27.5%; best at the start and end of the pitch. Author list is not on the page I fetched (I recall Jiang, Yin and Liu, UNVERIFIED). Related: Warnick et al. (2021, Journal of Business Venturing) found a wider range of expression correlated with funding (summary only).
- **URL:** https://www.usf.edu/news/2019/too-much-smiling-in-sales-pitch-could-kill-deal.aspx . VERIFIED-S (news release plus TCU summary).
- **What it means:** If there is an on-camera intro or close, one natural smile of about 2-3 s at the start and one at the end is the target. Do not hold a fixed grin.

### 2.3 Gestures sell the idea more than clever words
- **Study:** Clarke, Cornelissen & Healey (2019), "Actions speak louder than words", Academy of Management Journal 62(2):335-360. Depictive and symbolic gestures, not word choice, strongly raised investors' investment judgments (field study plus experiment). Effect sizes not read.
- **URL:** https://research.manchester.ac.uk/en/publications/actions-speak-louder-than-words-how-figurative-language-and-gestu/ . VERIFIED-S.
- **What it means:** If a clip of a team member is added, have them show the idea with their hands (a card, a lock closing, "only stricter") rather than standing static. It is also the only evidence I found that on-camera content helps judges form a view of the product, not just the person.

### 2.4 Presence of the creator on camera in crowdfunding videos
- **Evidence:** weak and old. A content analysis of 25 successful vs 25 failed tech-project videos found successful U.S. videos were more likely to show the creator, showed the product, and used shorter on-screen text (MIT thesis, hdl 1721.1/83712). A Fullerton study of 200 campaigns found video length did not affect support but professional quality did (secondary news page). A marketing site reports 48% vs 26% success with vs without video (MarketingProfs, UNVERIFIED).
- **URLs:** https://dspace.mit.edu/handle/1721.1/83712 ; https://news.fullerton.edu/2016/01/successful-online-funding-appeals
- **What it means:** Mild support for putting the team on screen, and for short on-screen text. Not strong enough to justify risking the existing cut tonight.

### 2.5 Thin slices: first impressions form in seconds
- **Study:** Ambady & Rosenthal (1993), "Half a minute", Journal of Personality and Social Psychology 64(3):431-441. Silent clips of 30 s, 15 s and even 6 s let strangers predict end-of-semester teacher evaluations. I could confirm the design and direction, not the r values (UNVERIFIED sizes). Raters judged impressions, not actual skill.
- **URL:** https://www.math.stonybrook.edu/~bishop/classes/math598.F25/Half_a_Minute.pdf (secondary copy). VERIFIED-S.
- **What it means:** The first 6-30 s sets the frame the rest is read through. The current open (black, Morse key, countdown to US$0, then 74%/9%) is a strong frame. Check it is clean: no subtitle glitches, no loudness jump, and the mark appears by 0:21. Any polish budget should go to 0:00-0:30 first.

### 2.6 Narrative transportation
- **Study:** Green & Brock (2000), JPSP 79:701-721 (four experiments): more transported readers hold more story-consistent beliefs. van Laer et al. (2014), Journal of Consumer Research 40(5):797-817: meta-analysis of the extended transportation-imagery model (the "76 studies" count is from a secondary page, UNVERIFIED).
- **URLs:** https://openaccess.city.ac.uk/id/eprint/6755/ ; https://en.wikipedia.org/wiki/Transportation_theory_(psychology)
- **Confidence:** VERIFIED-S for existence and direction.
- **What it means:** The film has a real arc (a victim, a trap, the card says no). Keep the "No." beat and the half second of silence before it. Do not insert explanatory interruptions during 2:37-3:03, because breaking transport costs more than a missing detail.

### 2.7 Judges evaluating demos
- No controlled study found. Practitioner guides: LexisNexis hackathon (3-4 min ideal, 4 max), Devfolio (2-4 min), Salesforce 2013 post-mortem (first-round judges "generally relied on" videos). These are rubrics and anecdotes, not evidence. A criteria-count claim from an Intercom playbook (4-6 criteria) is also practitioner advice.
- **URLs:** https://hackathon.lexisnexis.com/fall2019/scoringcriteria.html ; https://guide.devfolio.co/docs/guide/participating-in-hackathons/judging-1 ; https://developer.salesforce.com/blogs/2013/12/update-on-salesforce1-hackathon-feedback-review
- **What it means:** First-round judges may watch many videos and stop early. Make the first 60 s self-sufficient (problem, product, one real payment) and make the X-ray skippable without losing the story. A 2:30-3:00 cut for first-round judges alongside the 4:46 is worth considering after the deadline.

---

## 3. Trust: voices, presenters, explanations

### 3.1 Synthetic voices are now hard to tell from human ones, and can be rated as trustworthy
- **Study:** Lavan, Irvine, Rosi & McGettigan (2025), PLoS One 20(9):e0332692. 3 experiments, 50 UK listeners each. Voice clones were called "human" about 58% of the time (humans 62%), d' = 0.10 (n.s.) in Exp 1b; about 70% vs 72% in Exp 2 (d' = 0.13). Generic AI voices rated more trustworthy (57.9 vs 53.8, beta = 4.15, p = .002) and more dominant than human voices. Clones were more dominant but not significantly more trustworthy. Voices were made with off-the-shelf ElevenLabs.
- **Also:** Computers in Human Behavior Reports (Aug 2025; abstract only, the page returned 403): synthesised voices rated as more trustworthy than human voices with no intended tone, reversing when humans deliberately tried to sound trustworthy. Rosi, Soopramanien & McGettigan (2025, Computers in Human Behavior: Artificial Humans): familiar listeners rated clones lower or equal, unfamiliar listeners higher.
- **URLs:** https://pmc.ncbi.nlm.nih.gov/articles/PMC12459763/ ; https://doaj.org/article/347460ae52be4188b9a35f1085f74052 ; https://doaj.org/article/fde33fba9d31415db6caef6da7d0ac3b
- **Confidence:** VERIFIED-P for Lavan; VERIFIED-S for the others.
- **What it means:** Judges will not find Sarah less credible on pure voice grounds. Switching to the owner's voice is not needed for credibility. Dominance is rated higher for AI voices, which may suit "authority" but could feel cold. A human voice earns its place through authenticity and accountability (a named team of real people), which I could not find evidence for either way: that part is a judgment, not a finding.

### 3.2 Learning from AI narration: roughly equal to human
- **Evidence:** Pi et al. (2022), reported via secondary summary: equal retention with human vs AI voice-over when the AI voice (and presenter) was realistic enough. Dinçer (2022, Journal of Pedagogical Research, voice types, abstract only). 2025 online FAA course: no difference in exam scores between human and AI narration; students did not significantly prefer a human (secondary). UNMC 2026 poster, n = 320: AI narration non-inferior, students slightly preferred human (poster, not peer-reviewed).
- **URLs:** https://doaj.org/article/a14435a205f54240bdd0b0db2fa06f91 ; https://digitalcommons.unmc.edu/iae_spotlight/2026/posters/2 ; https://link.springer.com/article/10.1007/s10639-025-13654-x
- **Confidence:** moderate. No rigorous 2024-26 study with published effect sizes was found.
- **What it means:** Understanding is safe with either voice. Choose on warmth, not on learning.

### 3.3 Disclosure that a voice is AI
- **Evidence is mixed.**
  - Studio Resonate / CloudArmy (n = 1,300 US; invented brands): human voices scored 23% higher on trust; labelling a voice as AI, even wrongly, hurt trust. Industry research with unclear methods: UNVERIFIED.
  - A 2024 NeurIPS workshop study (Gallegos et al., n = 1,601) found AI-authorship labels had limited effect on persuasion.
  - Adobe Express survey (n = 850): 58% said they would trust a brand less if it used an AI voice in ads (survey, UNVERIFIED).
  - A WPP/MediaScience neuroscience study found synthetic and human voice-overs matched on engagement despite stated preferences (secondary).
  - A 2026 labelling study (Kipp et al.) is only seen through a LinkedIn summary: UNVERIFIED.
- **URLs:** https://www.contentgrip.com/studio-resonate-ai-voice-study/ ; https://neurips.cc/virtual/2024/106947 ; https://www.contentgrip.com/ai-voices-in-marketing-adobe/
- **What it means:** Do not hide anything. If the competition's rules ask for disclosure of AI-generated media, follow them. Beyond that, a human voice removes the question and a weak, evidenced downside risk. If the take sounds worse than Sarah, the evidence does not favour switching.

### 3.4 Presenter on camera versus voice-only
- **Study:** Alemdag (2022), Education and Information Technologies 27(9):12713-12742, meta-analysis of 20 experiments: instructor-present video had no significant effect on learning or social presence, but raised cognitive load and motivation. Pooled sizes not read. Moderators: the instructor's hand visible and viewing setting. Henderson & Schroeder (2021) agree: mixed. Social Cues vs Interference hypotheses (Springer 2024 article). Beege et al. (2017-2022): frontal orientation and deictic gestures helped retention/transfer in lecture videos.
- **URLs:** https://avesis.metu.edu.tr/yayin/8df0f0a3-6154-4f4b-9333-5108f1e4b1f1/effects-of-instructor-present-videos-on-learning-cognitive-load-motivation-and-social-presence-a-meta-analysis ; https://pmc.ncbi.nlm.nih.gov/articles/PMC9786415/ (review table, no effect sizes)
- **Confidence:** VERIFIED-S.
- **What it means:** Putting a face on screen will not help viewers understand more and adds a little load. It can raise motivation. So use faces only at the very start and the end (where joy and warmth research also points), keep them short, and keep the face away from the X-ray. The existing team slide with portraits already covers the "who are we" function.

### 3.5 Trust in explanations of AI systems
- **Study:** Duarte et al. (2023), Human Behavior and Emerging Technologies, 215 participants. Explanations raised trust only under some conditions: feature-importance beat counterfactual; where the AI's performance was not assured, explanations tended to push people towards overreliance; system performance mattered more than explanation or risk. Schemmer et al., via a 2023 review: explanations reduced under-reliance (secondhand). A University of Basel 2023 Frontiers paper separates attitudinal from behavioural trust (abstract).
- **URLs:** https://repositorio.iscte-iul.pt/bitstream/10071/29696/1/article_98455.pdf ; https://www.frontiersin.org/journals/computer-science/articles/10.3389/fcomp.2023.1151150/full
- **Confidence:** moderate (one main study, N = 215).
- **What it means:** The X-ray is an explanation, and explanation alone does not earn trust. Performance evidence does: the real hash, the rejected transactions, the 63 attempts. Keep every claim bounded ("test setup", "our mapping, not approval") so judges do not detect overclaiming, and close the X-ray on real evidence (block 11 receipt), as it already does.

---

## 4. Visuals, security, diagrams and captions

### 4.1 Visualising security risk
- **Evidence is thin.** A study on sequence-diagram threat models found textual and graphical risk annotations equally comprehensible, with graphical ones about 23% faster per task (listed by a KIT repository result; authors not confirmed, UNVERIFIED). A SINTEF report found size/colour coding less preferred than text labels. A 2025 lab study (n = 38) compared attack-defence trees, attack graphs and CORAS for lay audiences; focus was acceptability. I found no study isolating concrete examples as a trust factor.
- **URLs:** https://publikationen.bibliothek.kit.edu/1000081998/15445050 ; https://www.sintef.no/en/publications/publication/1269051 ; https://arxiv.org/abs/2512.03351
- **What it means:** Graphics speed up reading but do not by themselves improve understanding, so let a short word label ride with each colour and icon. The film's "this attack stops at this layer" mapping (attack placed at its layer) is the right instinct, supported more by theory (cognitive fit) than by direct evidence.

### 4.2 Dense diagrams
- **Evidence:** a 2018 ICSE-track study compared tables and graphs for security risk comprehension, noting that cognitive fit predicts graphs capture spatial relations better (abstract). Eye-tracking work shows novices are drawn to perceptually salient areas and experts to relevant ones (Carmichael et al., PERC 2010, abstract); cues based on expert gaze improved novices' understanding (Madsen et al., NARST 2012). Standard cueing was often ineffective in complex animations (Curtin/lead.ube.fr abstracts, UNVERIFIED details). I did not find an Ainsworth or Höffler source in the results.
- **URLs:** https://web.phys.ksu.edu/papers/2010/PERC2010_Carmichael.pdf ; https://perg.phys.ksu.edu/papers/2012/madsen-NARST.pdf ; https://lead.ube.fr/?p=5016
- **What it means:** Novices look at what is bright and moving. Make the thing the voice is naming the brightest, and darken everything else (see 1.3). A viewer cannot be expected to read a whole four-lane board at once.

### 4.3 Bilingual and dual captions for L2 viewers
- **Study:** Wang & Pellicer-Sánchez (2023; online Dec 2022), Studies in Second Language Acquisition 45(4):882-905. 112 Chinese learners of English watched an English documentary clip with bilingual subtitles, L1 subtitles, English captions or none, while eye movements were recorded. Bilingual subtitles were as good as L1 subtitles for comprehension, both beat captions and no subtitles. Viewers spent significantly more time on the L1 line than the L2 line; processing time did not predict comprehension. Effect sizes not reported on the page.
- **Also:** Li & Hennebry-Leung (2022): seven-week quasi-experiment with Chinese English-majors; bilingual subtitles improved vocabulary recognition and recall, kept at delayed post-test (secondary summary). Captioned-video meta-analyses: a 2023 thesis of 32 studies reports g = .61 for listening comprehension (thesis, UNVERIFIED); Montero Perez et al. (2013) reported large effects over 18 studies (secondary, size not seen).
- **URLs:** https://www.cambridge.org/core/journals/studies-in-second-language-acquisition/article/examining-the-effectiveness-of-bilingual-subtitles-for-comprehension-an-eyetracking-study/D3E6D4CDE5C5023CE085E95CA4D18ACE ; https://figshare.utas.edu.au/articles/journal_contribution/Effects_of_monolingual_and_bilingual_subtitles_on_L2_vocabulary_acquisition/23015369
- **Confidence:** VERIFIED-P for Wang & Pellicer-Sánchez (abstract); others secondary. Learners were studied in a learning context watching a documentary, not a pitch under time pressure.
- **What it means:** If many judges are Mandarin readers, Chinese subtitles are likely to aid comprehension as well as bilingual ones, and English-only captions the least. A second, Chinese (or dual-line) version is a plausible upgrade, but it needs a human check of the technical terms (FISCO BCOS, x402, Solidity). Ship it as a separate file or selectable track, not burned into the only copy, unless a native reader signs it off. Burned-in dual lines would also cost screen space on the X-ray and phone scenes.

### 4.4 Caption reading speed and timing norms
- **Netflix English guide (read on the page):** up to 20 characters per second for adult programmes, 17 for children's, 42 characters per line, at most two lines. URL: https://partnerhelp.netflixstudios.com/hc/en-us/articles/217350977-English-Timed-Text-Style-Guide . VERIFIED-P. Minimum event 5/6 s and maximum 7 s are from Netflix's general requirements, seen via a search snippet only (UNVERIFIED here).
- **Other Netflix languages (show the limit is language-specific):** Hindi up to 22 cps (adult), Korean 12, Indonesian 17. No Chinese-English figure was found. VERIFIED-S.
- **BBC:** guidance of 160-180 words per minute (about 0.3 s per word) comes from a third-party summary; I could not reach the BBC site (blocked). URL: https://clevercast.com/bbc-subtitling-guidelines . UNVERIFIED primary; versions are cited inconsistently.
- **Reading speed:** Brysbaert (2019), Journal of Memory and Language, 190 studies / 18,573 participants: average silent reading 238 wpm (non-fiction), 260 (fiction); oral reading 183 wpm. VERIFIED-S. URL: https://www.Gwern.net/doc/psychology/linguistics/2019-brysbaert.pdf
- **What it means:** The film's cap of 18 cps is within the Netflix adult limit. Native-speaker norms understate the load for L2 readers who also have to watch a dense picture, so for the X-ray pages in particular aim for 15-16 cps or split pages with a few more frames of dwell, rather than going faster. Check for two-line pages near the 42-character-per-line limit.

---

# Ranked recommendations (top 10)

Labels: "before the deadline" means doable in under 2 h of Remotion edits tonight.

| # | Recommendation | When | Expected effect | Confidence |
|---|---|---|---|---|
| 1 | **Make the X-ray one idea at a time.** Dim inactive lanes, brighten only the element the voice is naming, put every label next to its icon, and add a 2 s four-lane legend before the voice begins. Cut decorative motion that nothing in the voice names. (Sections 1.2, 1.3, 4.2) | before | Fewer drop-offs in the 53 s dense section; better comprehension for non-experts | Medium-high (contiguity d about 0.85, strongest for complex material; cueing is the weaker part) |
| 2 | **Remove on-screen headline text that repeats the subtitle** in the phone and card scenes; keep numbers and one- to three-word labels. Keep the subtitles themselves. (1.1) | before | Less split attention; keeps the L2 benefit of subtitles | Medium |
| 3 | **Polish the first 30 s as a whole**: check hook timing, no audio jump, mark visible by 0:21, no subtitle clutter. (2.5) | before | Frames how the rest is judged | Medium (direction well supported, size unknown) |
| 4 | **Keep the evidence block (7/7, 63, 462, real hash) and the "No." beat untouched**, and do not add explanatory interruptions in 2:37-3:03. Bound every claim as the script already does. (2.1, 2.6, 3.5) | before | Preparedness and performance evidence persuade more than explanation | Medium |
| 5 | **Re-check subtitle timing in the X-ray and proof sections**: aim at 15-16 cps or add dwell frames on dense pages; verify no page breaks Netflix's 42-character and two-line limits. (4.4) | before | Subtitles readable while the picture is busy | Medium |
| 6 | **Decide the voice on warmth and delivery, not on credibility.** Synthetic voices are not rated less trustworthy in current evidence and learning is equal, so keep Sarah unless the owner's take is brisk (about 150-170 wpm while speaking), energetic and clean. If you swap, keep pacing the same so the picture sync holds. Follow any disclosure rule the competition sets. (1.5, 3.1-3.3) | before (decision); re-record may be after | Neutral to small plus; avoids a risky swap | Medium (no explainer-video study on this exact question) |
| 7 | **If adding an on-camera clip, keep it to about 5-8 s at the open and one at the close, one natural 2-3 s smile, eyes on the lens, hands showing the idea; never over the X-ray.** Otherwise leave it out. (2.2, 2.3, 3.4) | after (needs filming, grading, and the 14 s of spare runtime is tight) | Small plus for warmth and memory; no gain in understanding; adds load | Low-medium |
| 8 | **Produce a Mandarin (or dual-line) subtitle track as a separate .srt or alternate render, signed off by a native reader.** Do not burn it into the only copy. (4.3) | after | Likely better comprehension for Chinese-reading judges | Medium (evidence is from learner studies, not pitches) |
| 9 | **Cut a 2:30-3:00 version for first-round judging** with the X-ray as a clear skippable block, keep 4:46 as the full version. (1.5, 2.7) | after | Matches practitioner guidance (2-4 min) and early-stop viewing | Low-medium (rubrics and anecdotes, no controlled study) |
| 10 | **Add a one-sentence preview of the payoff in the first 25 s** ("and the card says no"), so the arc is visible early; test on two people who haven't seen it. (2.5, 2.6) | after | Better retention of viewers through the middle | Low (inference from narrative research; untested here) |

## Gaps I could not close
- Primary effect sizes for Chen, Yao & Kotha (2009), Ambady & Rosenthal (1993), Schneider et al. (2018), Adesope & Nesbit (2012), Pi et al. (2022), Mayer & DaPra (2012), Montero Perez et al. (2013).
- No source for a Chinese-English caption speed norm, no BBC primary page, no study of judges' decision time on hackathon videos, no study isolating explainer-video voice credibility.
- Kizilcec et al. (instructor face in video instruction) could not be found by search; I made no claims from it.

## Addendum, 20 Oct 13:30: 2026 sources on synthetic voices (main session sweep)

- **Vocal Image listener study, Feb 2026** (IT Brief: https://itbrief.co.uk/story/uk-listeners-spot-ai-voices-faster-trust-them-less). More than 10,000 participants heard 20 TTS models. Approval fell when listeners identified a voice as machine-made (reported r = −0.802 between detection and approval). Industry study, secondary report: UNVERIFIED at the primary source.
- **Crowd React Media radio blind test, Jul 2026** (Radio Ink: https://radioink.com/2026/07/07/radio-listeners-cant-detect-ai-voice-but-dont-trust-it-either/). With 1,326 listeners, human and synthetic voices scored about the same on trust, and detection was near chance. Commissioned by an interested party.
- **Athens Journal of Mass Media and Communications, Apr 2026** (https://www.athensjournals.gr/reviews/2026-7195-AJMMC.pdf). In a small sample (n = 60), an AI-generated label did not lower trust. The authors note this contradicts earlier work.
- **Hackathon rules.** No 2026 hackathon rule found on AI voiceovers beyond ETHGlobal's "narrate yourself". A Cerebral Valley/Anthropic event judges the demo on whether it works and impresses (AI Tinkerers handbook: https://kuala-lumpur.aitinkerers.org/hackathons/h_Xu4dbx3kfMs/handbook).

**What it means for this video.** The evidence is mixed. Being *detected* as synthetic is what costs approval, and judges who use AI tools a lot detect it more easily. That supports the owner's own voice, the current plan. It doesn't support adding a disclosure line: FinTechathon has no rule, and labels shift ratings unpredictably.
