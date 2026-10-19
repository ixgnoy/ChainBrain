import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { BrandMark } from "../components/BrandMark";
import { Avatar, Cap, Head, Plaque, UiCard, pop } from "../components/Real";
import { Stage } from "../components/Stage";
import { C, F, clamp, easeOut } from "../theme";
import { sceneStart, voAt, wordAt } from "../vo";

// The problem and the answer, with real material: the app's main wallet, its cheques, its card stack, the Brain map
// and a card. Timed from the voice-over's words.

const S = sceneStart("layers");
const T = {
  whole: wordAt("p1", "whole"),
  or: wordAt("p1", "or"),
  approve: wordAt("p1", "approve"),
  yourself: wordAt("p1", "yourself"),
  p2: voAt("p2"),
  each: wordAt("p2", "each"),
  two: wordAt("p2", "two"),
  p3: voAt("p3"),
  watches: wordAt("p3", "watches"),
  p4: voAt("p4"),
  holds: wordAt("p4", "holds"),
};
const cut = { cheques: T.or + 0.55, card: T.p2 - 0.25, nets: T.p3 - 0.25 };

export const ProblemStory: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = S + frame / fps;
  if (t < cut.cheques) return <WalletShot t={t} />;
  if (t < cut.card) return <ChequeShot t={t} />;
  if (t < cut.nets) return <CardShot t={t} />;
  return <NetsShot t={t} />;
};

// A knife cut through a piece of UI: a vermillion line crosses it, then it dims.
const Strike: React.FC<{ x: number; y: number; w: number; at: number; t: number }> = ({ x, y, w, at, t }) => {
  const k = easeOut(clamp((t - at) / 0.18));
  if (k <= 0) return null;
  return <div style={{ position: "absolute", left: x - w / 2, top: y - 3, width: w * k, height: 6, background: C.vermillion, transform: "rotate(-8deg)", transformOrigin: "left center" }} />;
};

// "Today, an AI agent either gets your whole wallet…"
const WalletShot: React.FC<{ t: number }> = ({ t }) => {
  const dim = easeOut(clamp((t - (T.or + 0.1)) / 0.3));
  return (
    <Stage>
      <Head base={S} text="Your whole wallet?" at={S + 0.05} t={t} y={170} size={100} />
      <UiCard name="wallet" w={880} x={1180} y={600} p={pop(t, S + 0.2)} ry={-6} dim={dim} from={[60, 40]} />
      <div style={{ position: "absolute", left: 120, top: 360, display: "flex", flexDirection: "column", gap: 18, opacity: 1 - dim * 0.6 }}>
        <Avatar src="brand/claude-spark-clay.png" name="Claude" p={pop(t, T.whole - 0.2)} />
        <Avatar src="brand/openai-blossom-black.png" name="ChatGPT" p={pop(t, T.whole - 0.05)} imgScale={0.6} />
      </div>
      <Strike x={1180} y={600} w={980} at={T.or} t={t} />
      <Cap text="one fooled AI can spend everything" tone={C.vermillion} p={pop(t, T.or + 0.15)} x={120} y={600 + 60} />
    </Stage>
  );
};

// "…or you approve every payment yourself."
const ChequeShot: React.FC<{ t: number }> = ({ t }) => {
  const n = 4;
  const dim = easeOut(clamp((t - (T.yourself + 0.35)) / 0.3));
  return (
    <Stage>
      <Head base={S} text={"Or every payment,\nby hand?"} at={cut.cheques + 0.05} t={t} y={170} size={100} />
      {Array.from({ length: n }, (_, i) => (
        <UiCard
          key={i}
          name="cheque"
          w={430}
          x={1150 + i * 120}
          y={600 + i * 28}
          p={pop(t, T.approve - 0.2 + i * 0.22)}
          rot={-6 + i * 4}
          dim={dim}
          from={[120, 0]}
        />
      ))}
      <Strike x={1330} y={640} w={900} at={T.yourself + 0.3} t={t} />
      <Cap text="then you are doing the agent's job" tone={C.vermillion} p={pop(t, T.yourself + 0.45)} x={120} y={560} />
    </Stage>
  );
};

// "ChainBrain gives each agent its own card…"
const CardShot: React.FC<{ t: number }> = ({ t }) => {
  return (
    <Stage>
      <Head base={S} text={"Each agent gets\nits own card."} at={cut.card + 0.05} t={t} y={200} size={100} highlight={{ card: C.blue }} />
      <div style={{ position: "absolute", left: 120, top: 500, display: "flex", flexDirection: "column", gap: 16 }}>
        <Avatar name="ChainBrain agent" p={pop(t, T.each - 0.1)} size={68}>
          <BrandMark size={36} light={false} />
        </Avatar>
        <Avatar src="brand/claude-spark-clay.png" name="Claude" p={pop(t, T.each + 0.05)} size={68} />
        <Avatar src="brand/openai-blossom-black.png" name="ChatGPT" p={pop(t, T.each + 0.2)} size={68} imgScale={0.6} />
      </div>
      <UiCard name="stack" w={700} x={1380} y={560} p={pop(t, cut.card + 0.2)} ry={-10} from={[80, 30]} />
      <Cap text="with two safety nets" p={pop(t, T.two)} x={120} y={790} />
    </Stage>
  );
};

// "A Brain that watches every payment and learns from you. And a contract on FISCO BCOS that holds…"
const NetsShot: React.FC<{ t: number }> = ({ t }) => {
  const brainP = pop(t, cut.nets + 0.1);
  const cardP = pop(t, T.p4 - 0.15);
  return (
    <Stage>
      <UiCard name="brainmap" w={560} x={520} y={470} p={brainP} from={[-60, 0]} />
      <Label x={520} title="The Brain" sub="watches every payment · learns from you" color={C.blue} p={pop(t, T.watches - 0.2)} />
      <UiCard name="card" w={600} x={1400} y={470} p={cardP} ry={-8} from={[60, 0]} />
      <Label x={1400} title="The card" sub="its own contract · holds even if the AI is fooled" color={C.vermillion} p={pop(t, T.holds - 0.2)} />
      <div style={{ position: "absolute", left: 1400 - 130, top: 200 }}>
        <Plaque src="brand/fisco-bcos-logo.svg" h={40} p={pop(t, T.p4 + 0.4)} pad={14} />
      </div>
    </Stage>
  );
};

const Label: React.FC<{ x: number; title: string; sub: string; color: string; p: number }> = ({ x, title, sub, color, p }) => (
  <div style={{ position: "absolute", left: x - 420, width: 840, top: 780, textAlign: "center", opacity: p, transform: `translateY(${(1 - p) * 20}px)` }}>
    <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 76, color, letterSpacing: "-0.02em", lineHeight: 1 }}>{title}</div>
    <div style={{ fontFamily: F.body, fontWeight: 500, fontSize: 25, color: C.muted, marginTop: 12 }}>{sub}</div>
  </div>
);
