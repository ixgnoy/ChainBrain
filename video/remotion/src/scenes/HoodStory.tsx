import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { BrandMark } from "../components/BrandMark";
import { Brain as BrainIcon, Eye, Gauge, Radar } from "lucide-react";
import { Avatar, Cap, Head, Plaque, UiCard, pop } from "../components/Real";
import { Stage } from "../components/Stage";
import { C, F, clamp, easeOut, settle } from "../theme";
import { sceneStart, voAt, wordAt } from "../vo";

// "Why it held": how ChainBrain works, told as a product story with real material only: crops of the app's own
// screens (built-in network), the hosted explorer's real transaction pages, and real brand marks. Every beat is
// timed from the voice-over's word timestamps.

const S = sceneStart("hood");
const T = {
  h2: voAt("h2"),
  thinking: wordAt("h2", "thinking"),
  plans: wordAt("h2", "plans"),
  compares: wordAt("h2", "compares"),
  haggles: wordAt("h2", "haggles"),
  never: wordAt("h2", "never"),
  h3: voAt("h3"),
  brain3: wordAt("h3", "brain"),
  h4: voAt("h4"),
  screens: wordAt("h4", "screens"),
  predicts: wordAt("h4", "predicts"),
  watches: wordAt("h4", "watches"),
  learns: wordAt("h4", "learns"),
  h5: voAt("h5"),
  x402: wordAt("h5", "x402"),
  settles: wordAt("h5", "settles"),
  fisco: wordAt("h5", "fisco"),
  h6: voAt("h6"),
  allowed: wordAt("h6", "allowed"),
  h7: voAt("h7"),
  steal: wordAt("h7", "steal"),
  no: wordAt("h7", "no"),
  h8: voAt("h8"),
  smart: wordAt("h8", "smart"),
  strict: wordAt("h8", "strict"),
};
const cutAt = {
  agent: S + 2.0,
  brain: T.h3 - 0.3,
  features: T.h4 - 0.25,
  pay: T.h5 - 0.25,
  card: T.h6 - 0.3,
  attack: T.h7 - 0.3,
  net: T.h8 - 0.25,
};

export const HoodStory: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = S + frame / fps;
  if (t < cutAt.agent) return <TitleBeat t={t - S} />;
  if (t < cutAt.brain) return <AgentShot t={t} />;
  if (t < cutAt.features) return <IntoBrainShot t={t} />;
  if (t < cutAt.pay) return <FeaturesShot t={t} />;
  if (t < cutAt.card) return <PayShot t={t} />;
  if (t < cutAt.attack) return <CardShot t={t} />;
  if (t < cutAt.net) return <AttackShot t={t} />;
  return <NetShot t={t} />;
};

// ---------- shots ----------
const TitleBeat: React.FC<{ t: number }> = ({ t }) => {
  const p = settle(t - 0.15, 9);
  return (
    <Stage grid={0.5}>
      <div
        style={{
          position: "absolute",
          left: -36,
          top: 300,
          fontFamily: F.display,
          fontWeight: 600,
          fontSize: 330,
          lineHeight: 0.9,
          letterSpacing: "-0.04em",
          color: C.text,
          whiteSpace: "nowrap",
          clipPath: `inset(0 ${100 - p * 100}% 0 0)`,
        }}
      >
        Why it held.
      </div>
    </Stage>
  );
};

// Your agent does the thinking (real chat cards cascade in), but never holds your keys (the wallet stays yours).
const AgentShot: React.FC<{ t: number }> = ({ t }) => {
  const away = easeOut(clamp((t - (T.never - 0.2)) / 0.5));
  return (
    <Stage>
      <Head base={S} text={"Your agent\ndoes the thinking."} at={cutAt.agent} t={t} y={210} />
      {t >= T.never - 0.1 ? <Head base={S} text={"It never holds\nyour keys."} at={T.never - 0.1} t={t} y={560} size={76} highlight={{ never: C.vermillion }} /> : null}
      <div style={{ position: "absolute", left: 120, top: 520, display: "flex", flexDirection: "column", gap: 22, opacity: 1 - away }}>
        <Avatar name="ChainBrain agent" sub="built in" p={pop(t, T.thinking - 0.1)}>
          <BrandMark size={40} light={false} />
        </Avatar>
        <Avatar src="brand/claude-spark-clay.png" name="Claude" sub="connected agent" p={pop(t, T.thinking + 0.05)} />
        <Avatar src="brand/openai-blossom-black.png" name="ChatGPT" sub="connected agent" p={pop(t, T.thinking + 0.2)} imgScale={0.6} />
      </div>
      <div style={{ opacity: 1 - away, transform: `translateX(${-away * 60}px)` }}>
        <UiCard name="question" w={640} x={1400} y={250} p={pop(t, T.plans)} rot={-3} ry={-8} from={[120, 0]} />
        <UiCard name="paid" w={640} x={1460} y={540} p={pop(t, T.compares)} rot={2} ry={-8} from={[120, 0]} />
        <UiCard name="haggle" w={640} x={1390} y={850} p={pop(t, T.haggles)} rot={-1.5} ry={-8} from={[120, 0]} />
      </div>
      {away > 0 ? (
        <>
          <UiCard name="wallet" w={760} x={1360} y={520} p={pop(t, T.never + 0.1)} from={[0, 80]} ry={-6} />
          <Cap text="your keys stay on your phone" p={pop(t, T.never + 0.6)} x={1000} y={720} />
        </>
      ) : null}
    </Stage>
  );
};

// Every payment it wants to make goes through the Brain first.
const IntoBrainShot: React.FC<{ t: number }> = ({ t }) => {
  const enter = pop(t, cutAt.brain, 9);
  const fly = easeOut(clamp((t - (T.brain3 - 0.6)) / 0.9));
  return (
    <Stage>
      <Head base={S} text={"Every payment\ngoes through\nthe Brain first."} at={cutAt.brain + 0.05} t={t} y={250} size={84} highlight={{ Brain: C.blue }} />
      <UiCard name="brainmap" w={760} x={1380} y={540} p={enter} scale={0.9 + 0.1 * fly} from={[0, 0]} />
      <div style={{ opacity: 1 - clamp((fly - 0.85) / 0.15) }}>
        <UiCard
          name="paid"
          w={520 * (1 - fly * 0.85)}
          x={800 + (1380 - 800) * fly}
          y={860 + (540 - 860) * fly}
          p={pop(t, cutAt.brain + 0.3)}
          rot={-4 * (1 - fly)}
        />
      </div>
    </Stage>
  );
};

// The Brain screens, predicts, watches, learns: four real cards land on their words around the real Brain map.
const FeaturesShot: React.FC<{ t: number }> = ({ t }) => {
  const words: [string, number, React.FC<{ size?: number; color?: string; strokeWidth?: number }>][] = [
    ["Screens", T.screens, Radar],
    ["Predicts", T.predicts, Gauge],
    ["Watches", T.watches, Eye],
    ["Learns", T.learns, BrainIcon],
  ];
  const cards: [string, number, number, number, number][] = [
    ["radar", T.screens, 400, 390, -2],
    ["preflight", T.predicts, 1520, 330, 2],
    ["sentinel-ok", T.watches, 400, 810, 1.5],
    ["remembers", T.learns, 1520, 800, -1.5],
  ];
  return (
    <Stage>
      <div style={{ position: "absolute", left: 0, right: 0, top: 64, display: "flex", justifyContent: "center", gap: 48 }}>
        {words.map(([w, at, Icon]) => {
          const on = t >= at;
          const p = pop(t, at, 14);
          return (
            <div key={w} style={{ display: "flex", alignItems: "center", gap: 16, transform: `translateY(${on ? (1 - p) * 10 : 0}px)` }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: on ? "rgba(157,202,255,0.14)" : "rgba(255,255,255,0.03)",
                  boxShadow: `inset 0 0 0 1.5px ${on ? "rgba(157,202,255,0.55)" : "rgba(255,255,255,0.08)"}, inset 0 1px 0 rgba(255,255,255,0.12)`,
                }}
              >
                <Icon size={34} color={on ? C.blue : "rgba(255,255,255,0.18)"} strokeWidth={1.75} />
              </div>
              <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 58, letterSpacing: "-0.02em", color: on ? C.text : "rgba(255,255,255,0.14)" }}>{w}.</div>
            </div>
          );
        })}
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {cards.map(([n, at, x, y]) => {
          const p = easeOut(clamp((t - at) / 0.35));
          return <line key={n} x1={960} y1={600} x2={960 + (x - 960) * p} y2={600 + (y - 600) * p} stroke="rgba(157,202,255,0.55)" strokeWidth={2} />;
        })}
      </svg>
      <UiCard name="brainmap" w={540} x={960} y={600} p={pop(t, cutAt.features, 9)} from={[0, 0]} />
      {cards.map(([n, at, x, y, rot]) => (
        <UiCard key={n} name={n} w={n === "preflight" ? 600 : 560} x={x} y={y} p={pop(t, at)} rot={rot} from={[x < 960 ? -80 : 80, 20]} />
      ))}
    </Stage>
  );
};

// Then it pays over x402, straight from the card, and settles on FISCO BCOS (a real transaction page).
const PayShot: React.FC<{ t: number }> = ({ t }) => {
  return (
    <Stage>
      <Head base={S} text={"It pays over x402.\nSettles on FISCO BCOS."} at={cutAt.pay + 0.05} t={t} y={110} size={78} highlight={{ x402: C.blue }} />
      <UiCard name="card" w={500} x={400} y={480} p={pop(t, cutAt.pay + 0.15)} ry={10} rot={-2} from={[-80, 0]} />
      <div style={{ position: "absolute", left: 120, top: 700, display: "flex", flexDirection: "column", gap: 16 }}>
        <Avatar src="brand/exa-icon-square.svg" name="Exa" sub="HK$0.056 a search" p={pop(t, T.x402 - 0.1)} size={64} imgScale={0.62} />
        <Avatar src="brand/coingecko-symbol.svg" name="CoinGecko" sub="HK$0.08 a price" p={pop(t, T.x402 + 0.05)} size={64} imgScale={0.66} />
        <Avatar src="brand/nansen-icon-black.svg" name="Nansen" sub="HK$0.40 a check" p={pop(t, T.x402 + 0.2)} size={64} imgScale={0.6} />
      </div>
      <div style={{ position: "absolute", left: 760, top: 300 }}>
        <Plaque src="brand/x402-logo-dark.png" h={44} p={pop(t, T.x402)} />
      </div>
      <div style={{ position: "absolute", left: 1100, top: 780 }}>
        <Plaque src="brand/fisco-bcos-logo.svg" h={48} p={pop(t, T.fisco - 0.05)} />
      </div>
      <UiCard name="ex-success" w={860} x={1410} y={520} p={pop(t, T.settles - 0.15)} ry={-6} from={[100, 0]} />
      <Cap text="a real payment, block 11" p={pop(t, T.fisco + 0.2)} x={1380} y={815} />
    </Stage>
  );
};

// There, your card's own contract signs off only on what you allowed.
const CardShot: React.FC<{ t: number }> = ({ t }) => {
  const ok = easeOut(clamp((t - T.allowed) / 0.4));
  return (
    <Stage>
      <Head base={S} text={"Its own contract.\nYour rules."} at={cutAt.card + 0.05} t={t} y={170} size={96} highlight={{ rules: C.blue }} />
      <UiCard name="card" w={520} x={1500} y={330} p={pop(t, cutAt.card + 0.1)} rot={3} ry={-10} from={[60, -40]} />
      <UiCard name="rules" w={1080} x={760} y={690} p={pop(t, cutAt.card + 0.35)} tone={ok > 0.05 ? C.blue : undefined} from={[0, 70]} />
      <Cap text="the card contract signs only these" p={ok} x={220} y={880} />
    </Stage>
  );
};

// Fool the agent, steal its key: the card still says no (the real revert on the hosted chain).
const AttackShot: React.FC<{ t: number }> = ({ t }) => {
  const no = t >= T.no;
  const slam = pop(t, T.no, 16);
  return (
    <Stage tint={1}>
      <Head base={S} text={"Fool the agent.\nSteal its key."} at={cutAt.attack + 0.05} t={t} y={150} size={84} />
      <UiCard name="blocked" w={820} x={560} y={640} p={pop(t, T.steal - 0.1)} tone={no ? C.vermillion : undefined} rot={-1.5} from={[-60, 40]} />
      <UiCard name="ex-reverted" w={840} x={1420} y={760} p={pop(t, T.no - 0.05)} tone={no ? C.vermillion : undefined} ry={-8} from={[80, 0]} />
      {no ? (
        <div style={{ position: "absolute", left: 1010, top: 200, transform: `scale(${1.06 - 0.06 * slam})`, transformOrigin: "left center" }}>
          <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 150, letterSpacing: "-0.03em", color: C.vermillion, lineHeight: 1 }}>Still no.</div>
          <div style={{ marginTop: 10, fontFamily: F.mono, fontSize: 24, color: C.muted, opacity: slam }}>reverted on-chain · balance unchanged</div>
        </div>
      ) : null}
    </Stage>
  );
};

// That's the safety net: smart where it helps (the Brain), strict where it counts (the card).
const NetShot: React.FC<{ t: number }> = ({ t }) => {
  return (
    <Stage>
      <Head base={S} text="That's the safety net." at={cutAt.net + 0.05} t={t} x={120} y={90} size={80} />
      <UiCard name="brainmap" w={560} x={520} y={560} p={pop(t, cutAt.net + 0.2)} from={[-60, 0]} />
      <UiCard name="card" w={600} x={1400} y={560} p={pop(t, cutAt.net + 0.35)} ry={-8} from={[60, 0]} />
      <BigWord text="Smart" color={C.blue} x={520} p={pop(t, T.smart, 14)} sub="where it helps" />
      <BigWord text="Strict" color={C.vermillion} x={1400} p={pop(t, T.strict, 14)} sub="where it counts" />
    </Stage>
  );
};

const BigWord: React.FC<{ text: string; color: string; x: number; p: number; sub: string }> = ({ text, color, x, p, sub }) => (
  <div style={{ position: "absolute", left: x - 400, width: 800, top: 860, textAlign: "center", opacity: p, transform: `translateY(${(1 - p) * 20}px)` }}>
    <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 96, color, letterSpacing: "-0.03em", lineHeight: 1 }}>{text}</div>
    <div style={{ fontFamily: F.body, fontWeight: 500, fontSize: 26, color: C.muted, marginTop: 6 }}>{sub}</div>
  </div>
);
