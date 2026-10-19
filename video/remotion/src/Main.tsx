import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Subtitles } from "./components/Subtitles";
import { Whip } from "./components/Whip";
import { ActTitle, AttackRail } from "./scenes/Closing";
import { PhoneScene, type Beat, type Cam, type Seg } from "./scenes/PhoneScene";
import { BuiltWith, CardReveal, CloseV3, Hook, Money, OnlyStricter, ProofV3, Stat, WhatCard } from "./scenes/V3";
import { C, FPS } from "./theme";
import timeline from "./timeline.json";
import { voAt, wordAt } from "./vo";

// v3 (video/STORYBOARD-v3.md): hook → the AI Card → get one → use it → break it → the watcher → proof → close.
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
const rel = (id: string, line: string, lead = 0) => voAt(line) - scene(id).start - lead;
const relW = (id: string, line: string, w: string, lead = 0) => wordAt(line, w) - scene(id).start - lead;
// camera keyframes anchored to segment starts: [segment, offset, scale, focusY]
const cams = (id: string, ks: [number, number, number, number][]): Cam[] => ks.map(([i, o, s, fy]) => ({ t: Math.max(0, segAt(id, i) + o), s, fx: 0.5, fy }));

const At: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const sc = scene(id);
  return (
    <Sequence from={Math.round(sc.start * FPS)} durationInFrames={Math.round((sc.end - sc.start) * FPS)} name={id}>
      {children}
    </Sequence>
  );
};

// the four attacks the judges score, in plain words, marked as each one is shown
const Rail: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const marks = [0, relW("attack", "k2", "requests", 0.1), relW("attack", "k2", "fake", 0.1), segAt("attack", 3)];
  const active = marks.filter((m) => t >= m).length - 1;
  return <AttackRail active={active} done={active} />;
};

const beatsGet: Beat[] = [
  { t: 0, head: "Say the job.\nOne sentence." },
  { t: rel("get", "g2", 0.3), head: "It builds the card\nin front of you.", cap: { text: "the exact rules you approve", tone: "blue" } },
  { t: rel("get", "g3", 0.3), head: "One slide.\nThe card is live.", cap: { text: "its own smart contract on FISCO BCOS", tone: "blue" } },
];
const beatsUse: Beat[] = [
  { t: 0, head: "Not sure?\nIt asks first.", cap: { text: "HK$0.80 in total, or per lookup?", tone: "plain" } },
  { t: segAt("use", 2), head: "Small payments?\nIt pays on its own.", cap: { text: "Exa · CoinGecko · over x402", tone: "blue", logos: [["exa-icon-square.svg", "#0143D9"], ["coingecko-symbol.svg", "#FFFFFF"], ["x402-logo-dark.png", "#FFFFFF"]] } },
  { t: rel("use", "u2", 0.3), head: "Over your limit?\nYou approve it.", cap: { text: "Nansen · slide to approve HK$0.40", tone: "plain", logos: [["nansen-icon-black.svg", "#FFFFFF"]] } },
  { t: segAt("use", 4), head: "Not on your list?\nRefused.", cap: { text: "it finds another way", tone: "red" } },
  { t: segAt("use", 6), head: "It negotiates\na better price.", cap: { text: "HK$12.00 → HK$8.80", tone: "blue" } },
  { t: segAt("use", 8), head: "Your card.\nCancel any time.", cap: { text: "cancelled · the money comes back", tone: "plain" } },
];
const beatsAttack: Beat[] = [
  { t: 0, head: "A hidden order.", cap: { text: "ignored", tone: "red" } },
  { t: segAt("attack", 1), head: "“Send me\nyour data.”", cap: { text: "refused · nothing shared", tone: "red" } },
  { t: segAt("attack", 2), head: "“I’m the admin.”", cap: { text: "refused · only you can change the card", tone: "red" } },
  { t: segAt("attack", 3), head: "We fool the agent\non purpose.", cap: { text: "it orders a HK$50.00 transfer", tone: "red" } },
];
const beatsWatch: Beat[] = [
  { t: 0, head: "A second AI\nwatches." },
  { t: segAt("watch", 1), head: "It checks\nevery seller.", cap: { text: "TradeWire blocked · risk 9/10", tone: "red" } },
  { t: segAt("watch", 3), head: "It learns\nhow you buy.", cap: { text: "and forgets anything you ask", tone: "blue" } },
  { t: segAt("watch", 4), head: "Keep pushing?\nIt freezes the card.", cap: { text: "only you can unfreeze it", tone: "red" } },
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
              [1, 0.6, 1, 0.5],
              [2, 0.8, 1.32, 0.42],
              [3, -0.4, 1.32, 0.42],
              [3, 0.4, 1.5, 0.84],
              [4, -0.1, 1.5, 0.84],
              [4, 0.7, 1.05, 0.5],
            ])}
          />
        </Whip>
      </At>
      <At id="use">
        <PhoneScene
          word="Use"
          segs={segs("use")}
          beats={beatsUse}
          cams={cams("use", [
            [0, 0, 1, 0.5],
            [0, 0.9, 1.55, 0.62],
            [2, -0.5, 1.55, 0.62],
            [2, 0.2, 1, 0.5],
            [2, 2.2, 1, 0.5],
            [2, 2.9, 1.45, 0.74],
            [3, -0.4, 1.45, 0.74],
            [3, 0.3, 1.25, 0.55],
            [4, -0.4, 1.25, 0.55],
            [4, 0.3, 1.6, 0.62],
            [6, -0.4, 1.6, 0.62],
            [6, 0.4, 1.7, 0.42],
            [8, -0.4, 1.7, 0.42],
            [8, 0.4, 1.3, 0.8],
          ])}
        />
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
              [0, 0, 1.5, 0.56],
              [1, -0.3, 1.5, 0.58],
              [1, 0.3, 1.5, 0.62],
              [2, 0.3, 1.6, 0.58],
              [3, -0.2, 1.6, 0.58],
              [3, 0.5, 1.1, 0.45],
              [3, 2.6, 1.7, 0.62],
            ])}
            rail={<Rail />}
          />
        </Whip>
      </At>
      <At id="money">
        <Money />
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
              [2, 0.5, 1.2, 0.32],
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
      <At id="proof">
        <ProofV3 />
      </At>
      <At id="built">
        <BuiltWith />
      </At>
      <At id="close">
        <CloseV3 />
      </At>
      <Subtitles />
      {withAudio ? <Html5Audio src={staticFile("audio/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};
