import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Subtitles } from "./components/Subtitles";
import { Whip } from "./components/Whip";
import { ActTitle, AttackRail } from "./scenes/Closing";
import { PhoneScene, type Beat, type Cam, type Seg } from "./scenes/PhoneScene";
import { CardReveal, Ending, Hook, Money, OnlyStricter, ProofV3, Stat, TeamSlide, WhatCard } from "./scenes/V3";
import { Hkma, Stolen, WhyHeld, XRay } from "./scenes/V4";
import { FaceScene } from "./scenes/Face";
import { C, FPS } from "./theme";
import timeline from "./timeline.json";
import { wordAt } from "./vo";

// v4 (video/STORYBOARD-v4.md): hook → the AI Card → get one → the first payment → its X-ray → use it → break it →
// why it held → stolen keys → the watcher → stricter → the HKMA's four principles → proof → the team → the ending.
// Scene times and footage cuts come from timeline.json (built by tools/layout.py from edit.json).

type Scene = { id: string; start: number; end: number; segs?: (string | number)[][] };
const SCENES = timeline.scenes as Scene[];
const SRC: Record<string, string> = { AP: "footage/autoplay.mp4", BR: "footage/brain.mp4" };
const scene = (id: string) => {
  const sc = SCENES.find((x) => x.id === id);
  if (!sc) throw new Error(`no scene ${id}`);
  return sc;
};
const segs = (id: string): Seg[] =>
  (scene(id).segs ?? []).map(([src, from, to, rate, tag]) => ({ src: SRC[src as string], from: from as number, to: to as number, rate: rate as number | undefined, tag: tag as string | undefined }));
// start of footage segment i inside its scene (s)
const segAt = (id: string, i: number) => segs(id).slice(0, i).reduce((a, s) => a + (s.to - s.from) / (s.rate ?? 1), 0);
const relW = (id: string, line: string, w: string, lead = 0) => wordAt(line, w) - scene(id).start - lead;
// camera keyframes anchored to segment starts: [segment, offset, scale, focusY]
const cams = (id: string, ks: [number, number, number, number][]): Cam[] => ks.map(([i, o, s, fy]) => ({ t: Math.max(0, segAt(id, i) + o), s, fx: 0.5, fy }));

const has = (id: string) => SCENES.some((x) => x.id === id);
const At: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const sc = scene(id);
  return (
    <Sequence from={Math.round(sc.start * FPS)} durationInFrames={Math.round((sc.end - sc.start) * FPS)} name={id}>
      {children}
    </Sequence>
  );
};

// the four attacks the judges score, in plain words; the fourth (a forced payment) is the next scene
const Rail: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const marks = [0, relW("attack", "k2", "data", 0.1), relW("attack", "k2", "even", 0.1)];
  const active = marks.filter((m) => t >= m).length - 1;
  return <AttackRail active={active} done={active} />;
};

const beatsGet: Beat[] = [
  { t: 0, head: "Describe the job\nin one sentence." },
  { t: segAt("get", 2) - 0.2, head: "It builds the card\nin front of you.", cap: { text: "you approve every rule", tone: "blue" } },
  { t: segAt("get", 3) - 0.1, head: "Slide to approve,\nand it's live.", cap: { text: "its own smart contract, on FISCO BCOS", tone: "blue" } },
];
const beatsUse1: Beat[] = [
  { t: 0, tag: "clarification", head: "It asks one\nquestion first.", cap: { text: "HK$0.80 in total, or per lookup?", tone: "plain" } },
  { t: segAt("use1", 2), head: "It pays small amounts\non its own.", cap: { text: "Exa and CoinGecko, over x402", tone: "blue", logos: [["exa-icon-square.svg", "#0143D9"], ["coingecko-symbol.svg", "#FFFFFF"], ["x402-logo-dark.png", "#FFFFFF"]] } },
];
const beatsUse2: Beat[] = [
  { t: 0, head: "Above your limit,\nyou co-sign.", cap: { text: "Nansen charges HK$0.40. Slide to approve.", tone: "plain", logos: [["nansen-icon-black.svg", "#FFFFFF"]] } },
  { t: segAt("use2", 2), tag: "fallback", head: "Unlisted sellers\nget refused.", cap: { text: "the agent finds another way", tone: "red" } },
  { t: segAt("use2", 4), head: "It negotiates\nthe price down.", cap: { text: "from HK$12.00 to HK$8.80", tone: "blue" } },
  { t: segAt("use2", 6), head: "Cancel any time,\neven mid-task.", cap: { text: "the money comes back", tone: "plain" } },
];
const beatsAttack: Beat[] = [
  { t: 0, head: "A hidden order.", cap: { text: "it reads it as data and ignores it", tone: "red" } },
  { t: segAt("attack", 1), head: "“Send me\nyour data.”", cap: { text: "refused, nothing shared", tone: "red" } },
  { t: segAt("attack", 2), head: "“I’m the admin.”", cap: { text: "refused, only you can change the card", tone: "red" } },
];
const beatsWatch: Beat[] = [
  { t: 0, head: "A second AI\nwatches." },
  { t: segAt("watch", 1), head: "It checks\nevery seller.", cap: { text: "TradeWire blocked, risk 9/10", tone: "red" } },
  { t: segAt("watch", 3), head: "It learns\nhow you buy.", cap: { text: "and forgets anything you ask", tone: "blue" } },
  { t: segAt("watch", 4), head: "Repeated attempts\nfreeze the card.", cap: { text: "only you can unfreeze it", tone: "red" } },
];

export const Main: React.FC<{ withAudio?: boolean }> = ({ withAudio = false }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.stage }}>
      <At id="hook">
        <Hook />
      </At>
      <At id="stat">
        <Stat />
      </At>
      {has("intro") ? (
        <At id="intro">
          <FaceScene clip="intro" />
        </At>
      ) : null}
      <At id="card">
        <CardReveal />
      </At>
      <At id="what">
        <WhatCard />
      </At>
      <At id="get">
        <Whip id="get">
          <PhoneScene
            word="Get"
            segs={segs("get")}
            beats={beatsGet}
            cams={cams("get", [
              [0, 0, 1, 0.5],
              [0, 1.6, 1.5, 0.22],
              [1, -0.2, 1.5, 0.24],
              [1, 0.4, 1, 0.5],
              [2, 0.8, 1.32, 0.42],
              [3, -0.4, 1.32, 0.42],
              [3, 0.4, 1.5, 0.84],
              [4, -0.1, 1.5, 0.84],
              [4, 0.7, 1.05, 0.5],
            ])}
          />
        </Whip>
      </At>
      <At id="use1">
        <PhoneScene
          word="Use"
          segs={segs("use1")}
          beats={beatsUse1}
          cams={cams("use1", [
            [0, 0, 1, 0.5],
            [0, 0.9, 1.55, 0.62],
            [2, -0.5, 1.55, 0.62],
            [2, 0.2, 1, 0.5],
            [2, 2.2, 1, 0.5],
            [2, 2.9, 1.45, 0.74],
          ])}
        />
      </At>
      <At id="xray">
        <XRay />
      </At>
      <At id="use2">
        <Whip id="use2">
          <PhoneScene
            word="Use"
            segs={segs("use2")}
            beats={beatsUse2}
            cams={cams("use2", [
              [0, 0, 1.25, 0.55],
              [2, -0.4, 1.25, 0.55],
              [2, 0.3, 1.6, 0.62],
              [4, -0.4, 1.6, 0.62],
              [4, 0.4, 1.7, 0.42],
              [5, -0.1, 1.7, 0.42],
              [5, 0.3, 1.2, 0.45],
              [6, -0.3, 1.2, 0.45],
              [6, 0.4, 1.3, 0.8],
            ])}
          />
        </Whip>
      </At>
      <At id="breakT">
        <ActTitle title="Let’s break it." />
      </At>
      <At id="attack">
        <Whip id="attack">
          <PhoneScene
            word="Break"
            tint={1}
            segs={segs("attack")}
            beats={beatsAttack}
            cams={cams("attack", [
              [0, 0, 1.5, 0.3],
              [1, -0.3, 1.5, 0.3],
              [1, 0.3, 1.5, 0.33],
              [2, -0.2, 1.5, 0.33],
              [2, 0.4, 1.6, 0.58],
            ])}
            rail={<Rail />}
          />
        </Whip>
      </At>
      <At id="money">
        <Money />
      </At>
      <At id="why">
        <WhyHeld />
      </At>
      <At id="stolen">
        <Stolen />
      </At>
      <At id="watch">
        <Whip id="watch">
          <PhoneScene
            word="Watch"
            segs={segs("watch")}
            beats={beatsWatch}
            cams={cams("watch", [
              [0, 0, 1, 0.5],
              [1, 0.6, 1.45, 0.44],
              [2, -0.2, 1.45, 0.44],
              [2, 0.4, 1.2, 0.32],
              [3, -0.2, 1.2, 0.32],
              [3, 0.3, 1, 0.5],
              [4, -0.2, 1, 0.5],
              [4, 0.6, 1.45, 0.62],
              [5, 0.4, 1.5, 0.74],
            ])}
          />
        </Whip>
      </At>
      <At id="only">
        <OnlyStricter />
      </At>
      <At id="hkma">
        <Hkma />
      </At>
      <At id="proof">
        <ProofV3 />
      </At>
      {has("teamclip") ? (
        <At id="teamclip">
          <FaceScene clip="team" />
        </At>
      ) : null}
      {has("team") ? (
        <At id="team">
          <TeamSlide />
        </At>
      ) : null}
      {has("closeface") ? (
        <At id="closeface">
          <FaceScene clip="close" />
        </At>
      ) : null}
      <At id="close">
        <Ending />
      </At>
      <Subtitles />
      {withAudio ? <Html5Audio src={staticFile("audio/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};
