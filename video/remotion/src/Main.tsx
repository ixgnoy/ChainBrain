import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Subtitles } from "./components/Subtitles";
import { Whip } from "./components/Whip";
import { BrowserScene } from "./scenes/BrowserScene";
import { ActTitle, AttackRail, Close, ProofScene } from "./scenes/Closing";
import { HoodStory } from "./scenes/HoodStory";
import { ColdOpen, Team, Title } from "./scenes/Opening";
import { PhoneScene, type Seg } from "./scenes/PhoneScene";
import { ProblemStory } from "./scenes/ProblemStory";
import { C, FPS } from "./theme";
import timeline from "./timeline.json";
import { voAt } from "./vo";

const AP = "footage/autoplay.mp4";
const BR = "footage/brain.mp4";
const s = (src: string, from: number, to: number, rate?: number, tag?: string): Seg => ({ src, from, to, rate, tag });
const scene = (id: string) => {
  const sc = timeline.scenes.find((x) => x.id === id);
  if (!sc) throw new Error(`no scene ${id}`);
  return { from: Math.round(sc.start * FPS), dur: Math.round((sc.end - sc.start) * FPS), start: sc.start };
};
const At: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const { from, dur } = scene(id);
  return (
    <Sequence from={from} durationInFrames={dur} name={id}>
      {children}
    </Sequence>
  );
};
// a beat's time inside a scene, from the voice-over line that carries it
const rel = (sceneId: string, line: string, lead = 0) => voAt(line) - scene(sceneId).start - lead;

// Act 3's rail: which of the four scored attacks is on screen.
const Rail: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const marks = [0, rel("act3", "k3", 0.2), rel("act3", "k4", 0.2), rel("act3", "k5", 0.2), rel("act3", "k7", 0.2)];
  const active = t >= marks[4] ? -1 : marks.filter((m) => t >= m).length - 1;
  const done = t >= marks[4] ? 4 : active;
  return <AttackRail active={active} done={done} />;
};

export const Main: React.FC<{ withAudio?: boolean }> = ({ withAudio = false }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.stage }}>
      <At id="cold">
        <ColdOpen cut={timeline.cues.cut} />
      </At>
      <At id="title">
        <Title />
      </At>
      <At id="team">
        <Team />
      </At>
      <At id="layers">
        <ProblemStory />
      </At>
      <At id="act1">
        <Whip id="act1">
          <PhoneScene
            word="Build"
            segs={[
              s(AP, 448.6, 457.4, 1.6),
              s(AP, 458.6, 461.0),
              s(AP, 461.5, 472.0, 1.25),
              s(AP, 478.6, 481.4),
              s(AP, 482.0, 569.0, 30, "×30"),
            ]}
            beats={[
              { t: 0, head: "Say the job.\nOne sentence." },
              { t: rel("act1", "a2", 0.3), head: "It builds the card\nin front of you.", cap: { text: "layout · rules · the exact spec you sign", tone: "blue" } },
              { t: 16.3, head: "One slide.\nIts own contract.", cap: { text: "created and funded on-chain", tone: "blue" } },
            ]}
            cams={[
              { t: 0, s: 1, fx: 0.5, fy: 0.5 },
              { t: 1.6, s: 1.5, fx: 0.5, fy: 0.22 },
              { t: 5.0, s: 1.5, fx: 0.5, fy: 0.24 },
              { t: 5.7, s: 1, fx: 0.5, fy: 0.5 },
              { t: 8.6, s: 1.32, fx: 0.5, fy: 0.42 },
              { t: 15.6, s: 1.32, fx: 0.5, fy: 0.42 },
              { t: 16.6, s: 1.5, fx: 0.5, fy: 0.84 },
              { t: 19.0, s: 1.5, fx: 0.5, fy: 0.84 },
              { t: 19.8, s: 1.05, fx: 0.5, fy: 0.5 },
            ]}
          />
        </Whip>
      </At>
      <At id="act2">
        <PhoneScene
          word="Shop"
          segs={[
            s(AP, 43.4, 47.4),
            s(AP, 48.0, 49.5),
            s(AP, 55.5, 61.5),
            s(AP, 63.9, 69.5),
            s(AP, 86.4, 89.4),
            s(AP, 97.6, 100.4),
            s(AP, 168.6, 172.6),
            s(AP, 175.2, 178.3),
          ]}
          beats={[
            { t: 0, head: "It asks\none question.", cap: { text: "HK$0.80 in total, or per lookup?", tone: "plain" } },
            { t: 5.5, head: "Then it pays\non its own.", cap: { text: "HK$0.056 · HK$0.08 · over x402", tone: "blue", logos: [["exa-icon-square.svg", "#0143D9"], ["coingecko-symbol.svg", "#FFFFFF"]] } },
            { t: 11.5, head: "Above your limit?\nIt asks you first.", cap: { text: "Nansen · slide to approve HK$0.40", tone: "plain", logos: [["nansen-icon-black.svg", "#FFFFFF"]] } },
            { t: 17.1, head: "Off your list?\nRefused.", cap: { text: "not on your list → re-planned", tone: "red" } },
            { t: 22.9, head: "It even\nhaggles.", cap: { text: "HK$12.00 → HK$8.80", tone: "blue" } },
          ]}
          cams={[
            { t: 0, s: 1, fx: 0.5, fy: 0.5 },
            { t: 0.9, s: 1.55, fx: 0.5, fy: 0.62 },
            { t: 5.0, s: 1.55, fx: 0.5, fy: 0.62 },
            { t: 5.6, s: 1, fx: 0.5, fy: 0.5 },
            { t: 7.6, s: 1, fx: 0.5, fy: 0.5 },
            { t: 8.3, s: 1.45, fx: 0.5, fy: 0.74 },
            { t: 11.0, s: 1.45, fx: 0.5, fy: 0.74 },
            { t: 11.7, s: 1.25, fx: 0.5, fy: 0.55 },
            { t: 16.6, s: 1.25, fx: 0.5, fy: 0.55 },
            { t: 17.4, s: 1.6, fx: 0.5, fy: 0.62 },
            { t: 20.0, s: 1.6, fx: 0.5, fy: 0.62 },
            { t: 20.7, s: 1.5, fx: 0.5, fy: 0.72 },
            { t: 22.6, s: 1.5, fx: 0.5, fy: 0.72 },
            { t: 23.3, s: 1.7, fx: 0.5, fy: 0.42 },
            { t: 26.6, s: 1.7, fx: 0.5, fy: 0.42 },
            { t: 27.3, s: 1.3, fx: 0.5, fy: 0.55 },
          ]}
        />
      </At>
      <At id="attackTitle">
        <ActTitle title="Now we attack it." />
      </At>
      <At id="act3">
        <Whip id="act3">
          <PhoneScene
            word="Attack"
            tint={1}
            segs={[
              s(AP, 113.0, 119.2),
              s(AP, 121.6, 124.6),
              s(AP, 135.0, 137.6),
              s(AP, 143.6, 149.0),
              s(AP, 125.0, 131.0),
              s(AP, 131.0, 133.8),
              s(AP, 231.0, 234.6),
              s(AP, 246.0, 250.4),
            ]}
            beats={[
              { t: 0, head: "A seller hides\nan order.", cap: { text: "read as data · ignored", tone: "red" } },
              { t: 6.2, head: "It asks for\nyour data.", cap: { text: "refused · nothing shared", tone: "red" } },
              { t: 11.8, head: "“I’m the admin.”", cap: { text: "refused · only your key can", tone: "red" } },
              { t: 17.2, head: "Fooled agent.\nForced transfer.", cap: { text: "blocked HK$50.00 · balance unchanged", tone: "red" } },
              { t: 26.0, head: "A second AI\nfreezes the card.", cap: { text: "Sentinel · only you can unfreeze", tone: "red" } },
            ]}
            cams={[
              { t: 0, s: 1, fx: 0.5, fy: 0.5 },
              { t: 0.9, s: 1.5, fx: 0.5, fy: 0.56 },
              { t: 5.6, s: 1.5, fx: 0.5, fy: 0.58 },
              { t: 6.6, s: 1.5, fx: 0.5, fy: 0.62 },
              { t: 11.2, s: 1.5, fx: 0.5, fy: 0.62 },
              { t: 12.3, s: 1.6, fx: 0.5, fy: 0.58 },
              { t: 16.6, s: 1.6, fx: 0.5, fy: 0.58 },
              { t: 17.6, s: 1.1, fx: 0.5, fy: 0.45 },
              { t: 19.2, s: 1.7, fx: 0.5, fy: 0.62 },
              { t: 25.4, s: 1.7, fx: 0.5, fy: 0.62 },
              { t: 26.4, s: 1.45, fx: 0.5, fy: 0.62 },
              { t: 29.6, s: 1.45, fx: 0.5, fy: 0.62 },
              { t: 30.4, s: 1.5, fx: 0.5, fy: 0.74 },
            ]}
            rail={<Rail />}
          />
        </Whip>
      </At>
      <At id="judges">
        <BrowserScene
          src="footage/console-judges.mp4"
          from={28.4}
          rate={0.78}
          label="The console's Judges arena"
          labelColor={C.vermillion}
          url="ChainBrain network console · Judges"
          zooms={[
            { t: 0, s: 1, fx: 0.5, fy: 0.2 },
            { t: 1.4, s: 1.35, fx: 0.5, fy: 0.16 },
          ]}
          tint={0.5}
        />
      </At>
      <At id="hood">
        <HoodStory />
      </At>
      <At id="brain">
        <Whip id="brain">
          <Sequence durationInFrames={Math.round(14.4 * FPS)} layout="none">
            <PhoneScene
              word="Learn"
              segs={[s(BR, 48.0, 51.4), s(AP, 204.0, 206.6), s(AP, 213.0, 215.4), s(BR, 253.0, 259.0)]}
              beats={[
                { t: 0, head: "Every event\nfeeds the Brain." },
                { t: 3.4, head: "Radar checks\nwho it pays.", cap: { text: "TradeWire blocked · risk 9/10", tone: "red" } },
                { t: 8.2, head: "It learns\nwith you.", cap: { text: "forget any fact · now version 2", tone: "blue" } },
              ]}
              cams={[
                { t: 0, s: 1, fx: 0.5, fy: 0.5 },
                { t: 3.4, s: 1, fx: 0.5, fy: 0.5 },
                { t: 4.1, s: 1.45, fx: 0.5, fy: 0.44 },
                { t: 6.6, s: 1.45, fx: 0.5, fy: 0.44 },
                { t: 7.3, s: 1.2, fx: 0.5, fy: 0.32 },
                { t: 8.4, s: 1.2, fx: 0.5, fy: 0.32 },
                { t: 9.1, s: 1.45, fx: 0.5, fy: 0.78 },
              ]}
            />
          </Sequence>
          <Sequence from={Math.round(14.4 * FPS)} layout="none">
            <BrowserScene
              src="footage/console-brain.mp4"
              from={9.5}
              label="The Brain, live on the console"
              labelColor={C.blue}
              url="ChainBrain network console · Brain"
              zooms={[
                { t: 0, s: 1, fx: 0.4, fy: 0.5 },
                { t: 1.6, s: 1.28, fx: 0.33, fy: 0.62 },
              ]}
            />
          </Sequence>
        </Whip>
      </At>
      <At id="charge">
        <PhoneScene
          word="Control"
          segs={[s(AP, 277.4, 280.2), s(AP, 283.6, 286.4), s(AP, 319.6, 322.8), s(AP, 341.6, 342.8)]}
          beats={[
            { t: 0, head: "Revoke it\nmid-task.", cap: { text: "card revoked · HK$10.224 returned", tone: "plain" } },
            { t: 5.6, head: "No fit?\nIt stops safely.", cap: { text: "one-tap fix · raise the cap to HK$0.056", tone: "blue" } },
          ]}
          cams={[
            { t: 0, s: 1.3, fx: 0.5, fy: 0.8 },
            { t: 5.0, s: 1.3, fx: 0.5, fy: 0.8 },
            { t: 6.0, s: 1.4, fx: 0.5, fy: 0.56 },
            { t: 8.8, s: 1.4, fx: 0.5, fy: 0.56 },
            { t: 9.6, s: 1.4, fx: 0.5, fy: 0.3 },
          ]}
        />
      </At>
      <At id="proof">
        <ProofScene
          media={{ src: "footage/explorer.mp4", kind: "video", playbackRate: 0.92 }}
          url="fisco-api-production-85c5.up.railway.app/explorer"
          total={11}
          split={rel("proof", "f2", 0.2)}
          rows={[
            { label: "Create a card", tx: "0x9a1587e0e447cf82fa769fc18e765a29bad191d1aa03cfbe60c607f0dfa958d9", ok: true },
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
