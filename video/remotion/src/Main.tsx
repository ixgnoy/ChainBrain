import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Subtitles } from "./components/Subtitles";
import { BrowserScene } from "./scenes/BrowserScene";
import { ActTitle, AttackRail, Close, ProofScene } from "./scenes/Closing";
import { ColdOpen, Team, Title } from "./scenes/Opening";
import { PhoneScene, type Seg } from "./scenes/PhoneScene";
import { TwoLayers } from "./scenes/TwoLayers";
import { C, FPS } from "./theme";
import timeline from "./timeline.json";

const AP = "footage/autoplay.mp4";
const BR = "footage/brain.mp4";
const s = (src: string, from: number, to: number): Seg => ({ src, from, to });
const scene = (id: string) => {
  const sc = timeline.scenes.find((x) => x.id === id);
  if (!sc) throw new Error(`no scene ${id}`);
  return { from: Math.round(sc.start * FPS), dur: Math.round((sc.end - sc.start) * FPS) };
};
const At: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const { from, dur } = scene(id);
  return (
    <Sequence from={from} durationInFrames={dur} name={id}>
      {children}
    </Sequence>
  );
};

// Act 3's rail: which of the four scored attacks is on screen.
const Rail: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const marks = [0, 8.0, 13.6, 19.2, 28.4];
  const active = t >= marks[4] ? -1 : marks.filter((m) => t >= m).length - 1;
  const done = t >= marks[4] ? 4 : active;
  return <AttackRail active={active} done={done} />;
};

export const Main: React.FC<{ withAudio?: boolean }> = ({ withAudio = false }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.stage }}>
      <At id="cold">
        <ColdOpen cut={7.2} />
      </At>
      <At id="title">
        <Title />
      </At>
      <At id="team">
        <Team />
      </At>
      <At id="layers">
        <TwoLayers split={7.8} brainAt={13.4} cardAt={17.6} />
      </At>
      <At id="act1">
        <PhoneScene
          eyebrow="01 · An app inside the app"
          segs={[s(AP, 448.0, 457.8), s(AP, 458.6, 461.0), s(AP, 461.5, 470.0), s(AP, 478.6, 481.4), s(AP, 572.8, 576.0)]}
          beats={[
            { t: 0, head: "Say the job.\nOne sentence." },
            { t: 9.8, head: "It builds the card\nin front of you.", sub: "The layout, the rules, and the exact spec you are about to sign." },
            { t: 20.7, head: "One slide.\nIts own contract.", chip: { text: "cap HK$0.40 · HK$0.40 a week · 2 sellers", tone: "blue" } },
          ]}
          cams={[
            { t: 0, s: 1, fx: 0.5, fy: 0.5 },
            { t: 2.2, s: 1.5, fx: 0.5, fy: 0.22 },
            { t: 9.4, s: 1.5, fx: 0.5, fy: 0.24 },
            { t: 10.4, s: 1, fx: 0.5, fy: 0.5 },
            { t: 15.4, s: 1, fx: 0.5, fy: 0.5 },
            { t: 16.4, s: 1.55, fx: 0.5, fy: 0.86 },
            { t: 19.8, s: 1.55, fx: 0.5, fy: 0.86 },
            { t: 20.7, s: 1.35, fx: 0.5, fy: 0.78 },
            { t: 23.2, s: 1.35, fx: 0.5, fy: 0.78 },
            { t: 24.0, s: 1, fx: 0.5, fy: 0.5 },
          ]}
        />
      </At>
      <At id="act2">
        <PhoneScene
          eyebrow="02 · It shops on its own"
          segs={[
            s(AP, 43.4, 49.9),
            s(AP, 53.0, 63.0),
            s(AP, 63.8, 70.0),
            s(AP, 85.6, 89.6),
            s(AP, 96.6, 100.6),
            s(AP, 168.6, 172.6),
            s(AP, 175.2, 178.4),
          ]}
          beats={[
            { t: 0, head: "It asks\none question.", chip: { text: "HK$0.80 in total, or per lookup?", tone: "plain" } },
            { t: 6.5, head: "Then it pays\non its own.", chip: { text: "x402 · Exa HK$0.056 · CoinGecko HK$0.08", tone: "blue" } },
            { t: 16.5, head: "Above your limit?\nIt asks you first.", chip: { text: "Slide to approve HK$0.40", tone: "plain" } },
            { t: 22.7, head: "Off your list?\nRefused.", chip: { text: "SELLER_NOT_ALLOWED → re-planned", tone: "red" } },
            { t: 30.7, head: "It even\nhaggles.", chip: { text: "HK$12.00 → HK$8.80 · numbers only", tone: "blue" } },
          ]}
          cams={[
            { t: 0, s: 1, fx: 0.5, fy: 0.5 },
            { t: 1.2, s: 1.55, fx: 0.5, fy: 0.6 },
            { t: 5.8, s: 1.55, fx: 0.5, fy: 0.6 },
            { t: 6.6, s: 1, fx: 0.5, fy: 0.5 },
            { t: 9.2, s: 1, fx: 0.5, fy: 0.5 },
            { t: 10.2, s: 1.45, fx: 0.5, fy: 0.74 },
            { t: 15.7, s: 1.45, fx: 0.5, fy: 0.74 },
            { t: 16.6, s: 1.25, fx: 0.5, fy: 0.55 },
            { t: 21.9, s: 1.25, fx: 0.5, fy: 0.55 },
            { t: 23.5, s: 1.6, fx: 0.5, fy: 0.62 },
            { t: 26.4, s: 1.6, fx: 0.5, fy: 0.62 },
            { t: 27.4, s: 1.5, fx: 0.5, fy: 0.72 },
            { t: 30.4, s: 1.5, fx: 0.5, fy: 0.72 },
            { t: 31.4, s: 1.7, fx: 0.5, fy: 0.42 },
            { t: 34.4, s: 1.7, fx: 0.5, fy: 0.42 },
            { t: 35.2, s: 1.3, fx: 0.5, fy: 0.55 },
          ]}
        />
      </At>
      <At id="attackTitle">
        <ActTitle n="03" title="Now we attack it." color={C.vermillion} tint={1} />
      </At>
      <At id="act3">
        <PhoneScene
          eyebrow="03 · The four attacks"
          eyebrowColor={C.vermillion}
          tint={1}
          segs={[
            s(AP, 113.5, 118.5),
            s(AP, 121.5, 124.5),
            s(AP, 134.0, 139.6),
            s(AP, 144.0, 149.6),
            s(AP, 124.6, 133.8),
            s(AP, 231.0, 235.6),
            s(AP, 245.6, 251.15),
          ]}
          beats={[
            { t: 0, head: "A seller hides\nan order.", chip: { text: "read as data, never as an instruction", tone: "red" } },
            { t: 8.0, head: "It asks for\nyour data.", chip: { text: "refused · nothing shared", tone: "red" } },
            { t: 13.6, head: "“I’m the admin.”", chip: { text: "refused: only your key can", tone: "red" } },
            { t: 19.2, head: "Fooled agent.\nForced transfer.", chip: { text: "blocked HK$50.00 · balance unchanged", tone: "red" } },
            { t: 28.4, head: "A second AI\nfreezes the card.", chip: { text: "Sentinel · only you can unfreeze", tone: "red" } },
          ]}
          cams={[
            { t: 0, s: 1, fx: 0.5, fy: 0.5 },
            { t: 1.0, s: 1.5, fx: 0.5, fy: 0.55 },
            { t: 7.4, s: 1.5, fx: 0.5, fy: 0.58 },
            { t: 8.4, s: 1.5, fx: 0.5, fy: 0.66 },
            { t: 13.0, s: 1.5, fx: 0.5, fy: 0.66 },
            { t: 14.2, s: 1.6, fx: 0.5, fy: 0.58 },
            { t: 18.6, s: 1.6, fx: 0.5, fy: 0.58 },
            { t: 19.6, s: 1.1, fx: 0.5, fy: 0.45 },
            { t: 21.0, s: 1.7, fx: 0.5, fy: 0.6 },
            { t: 27.6, s: 1.7, fx: 0.5, fy: 0.6 },
            { t: 28.6, s: 1.45, fx: 0.5, fy: 0.62 },
            { t: 32.8, s: 1.45, fx: 0.5, fy: 0.62 },
            { t: 33.6, s: 1.5, fx: 0.5, fy: 0.74 },
          ]}
          rail={<Rail />}
        />
      </At>
      <At id="judges">
        <BrowserScene
          src="footage/console-judges.mp4"
          from={28.4}
          rate={0.78}
          eyebrow="03 · The console's Judges arena"
          eyebrowColor={C.vermillion}
          url="ChainBrain network console · Judges"
          zooms={[
            { t: 0, s: 1, fx: 0.5, fy: 0.2 },
            { t: 1.4, s: 1.35, fx: 0.5, fy: 0.16 },
          ]}
          tint={0.5}
        />
      </At>
      <Sequence from={Math.round(166.4 * FPS)} durationInFrames={Math.round(20.4 * FPS)} name="brainPhone">
        <PhoneScene
          eyebrow="04 · The Brain"
          eyebrowColor={C.blue}
          segs={[s(BR, 72.0, 75.6), s(AP, 203.4, 207.4), s(AP, 213.0, 215.8), s(BR, 105.5, 109.5), s(BR, 253.0, 259.0)]}
          beats={[
            { t: 0, head: "Every event\nfeeds the Brain." },
            { t: 3.6, head: "Radar checks\nwho it pays.", chip: { text: "TradeWire blocked · risk 9/10", tone: "red" } },
            { t: 10.4, head: "It predicts\nevery payment.", chip: { text: "Pre-flight: predicted it pays · matched", tone: "blue" } },
            { t: 14.4, head: "It learns\nwith you.", chip: { text: "forget any fact · now version 2", tone: "blue" } },
          ]}
          cams={[
            { t: 0, s: 1, fx: 0.5, fy: 0.5 },
            { t: 3.6, s: 1, fx: 0.5, fy: 0.5 },
            { t: 4.4, s: 1.45, fx: 0.5, fy: 0.44 },
            { t: 7.2, s: 1.45, fx: 0.5, fy: 0.44 },
            { t: 7.9, s: 1.2, fx: 0.5, fy: 0.32 },
            { t: 10.0, s: 1.2, fx: 0.5, fy: 0.32 },
            { t: 11.0, s: 1.3, fx: 0.5, fy: 0.3 },
            { t: 13.8, s: 1.3, fx: 0.5, fy: 0.3 },
            { t: 15.0, s: 1.45, fx: 0.5, fy: 0.76 },
            { t: 20.4, s: 1.45, fx: 0.5, fy: 0.8 },
          ]}
        />
      </Sequence>
      <Sequence from={Math.round(186.8 * FPS)} durationInFrames={Math.round(7.0 * FPS)} name="brainConsole">
        <BrowserScene
          src="footage/console-brain.mp4"
          from={9.5}
          eyebrow="04 · The Brain, live on the console"
          eyebrowColor={C.blue}
          url="ChainBrain network console · Brain"
          zooms={[
            { t: 0, s: 1, fx: 0.4, fy: 0.5 },
            { t: 1.6, s: 1.28, fx: 0.33, fy: 0.62 },
          ]}
        />
      </Sequence>
      <At id="charge">
        <PhoneScene
          eyebrow="05 · You stay in charge"
          segs={[s(AP, 277.4, 280.2), s(AP, 283.6, 286.6), s(AP, 319.6, 324.4), s(AP, 341.6, 344.6)]}
          beats={[
            { t: 0, head: "Revoke it\nmid-task.", chip: { text: "card revoked · HK$10.224 returned", tone: "plain" } },
            { t: 5.8, head: "No fit?\nIt stops safely.", chip: { text: "one-tap fix · raise cap to HK$0.056", tone: "blue" } },
          ]}
          cams={[
            { t: 0, s: 1.3, fx: 0.5, fy: 0.8 },
            { t: 5.2, s: 1.3, fx: 0.5, fy: 0.8 },
            { t: 6.4, s: 1.4, fx: 0.5, fy: 0.56 },
            { t: 10.2, s: 1.4, fx: 0.5, fy: 0.56 },
            { t: 11.0, s: 1.4, fx: 0.5, fy: 0.3 },
          ]}
        />
      </At>
      <At id="proof">
        <ProofScene
          media={{ src: "footage/explorer.mp4", kind: "video", playbackRate: 0.92 }}
          url="fisco-api-production-85c5.up.railway.app/explorer"
          total={11}
          split={9.8}
          rows={[
            { label: "Create a card (pocket contract)", tx: "0x9a1587e0e447cf82fa769fc18e765a29bad191d1aa03cfbe60c607f0dfa958d9", ok: true },
            { label: "Fund it with Mock e-HKD", tx: "0x84d74efed56af8e0a90592193948906f77ee85c1f7796eb1333d59e7c5cbb2ca", ok: true },
            { label: "Agent pays alone over x402", tx: "0x15b0d30f82cd7efc94f5b534277a71ddaa439ecd5576315ae94cf9cbdccf9333", ok: true },
            { label: "Above ask-me: owner co-signs", tx: "0xcc79bc34fd0d6640866b6d555c46626e19d21177ca15380477326668346164a3", ok: true },
            { label: "Fooled agent forces a transfer", tx: "0x91525ada450e84a0afb9f4fb255d57df3c910d1eb8af78acb2b10f40ed7e7745", ok: false },
            { label: "Owner sets HK$3.00 a week", tx: "0x7a1cd383a8cebe70494fbc7f554a45f15c9d9f20b82a5090c834dd7a937d5336", ok: true },
            { label: "Over the week's allowance", tx: "0xdf5430232a3a875bfaad52087f40c151b688219c647f744f221c843b18392a9c", ok: false },
            { label: "The cheque: owner co-signs it", tx: "0xc06736439a736e23a49df09d16e32d08feb6a7301299084b9d3b6de37c808e93", ok: true },
          ]}
        />
      </At>
      <At id="close">
        <Close />
      </At>
      <Subtitles />
      {withAudio ? <Html5Audio src={staticFile("audio/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};
