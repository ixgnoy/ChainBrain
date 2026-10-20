import React from "react";
import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Ban, BrainCircuit } from "lucide-react";
import { BrandMark } from "../components/BrandMark";
import { Stage } from "../components/Stage";
import { C, F, clamp, easeInOut, settle } from "../theme";

// The second AI as one picture: the app's Brain map (mobile/src/components/BrainGraphView.tsx) redrawn for the stage.
// The Brain sits at the centre; your agents, their cards and the sellers they pay sit on rings around it. Payments run
// from the cards to the sellers and each one pings the Brain, which checks it; a risky seller is flagged and cut off
// from every card; what it learns gathers in a memory panel. Event times (seconds into the scene) come from the voice.
export type BrainEvents = { pays: number; flag: number; memory?: number; head?: string; eyebrow?: string; note?: string };

const CX = 1070;
const CY = 600;
type Node = { id: string; x: number; y: number };
const polar = (a: number, rx: number, ry: number): [number, number] => [CX + Math.cos((a * Math.PI) / 180) * rx, CY + Math.sin((a * Math.PI) / 180) * ry];

const AGENTS = [
  { id: "claude", name: "Claude", src: "brand/claude-spark-clay.png", s: 0.62, a: 168 },
  { id: "chatgpt", name: "ChatGPT", src: "brand/openai-blossom-black.png", s: 0.6, a: 256 },
  { id: "ours", name: "Ours", a: 44 },
];
// cards: their agent and colour as in the app's built-in network (shared/sim/seed.ts, plus the two cards the phone's
// auto-play adds): daily blue, weekly sage, one-time sand, when asked white
const CARDS = [
  { id: "watch", name: "Durian watch", agent: "claude", color: C.blue, a: 146 },
  { id: "news", name: "Market news", agent: "claude", color: "#F2F1EE", a: 176 },
  { id: "cres", name: "Claude research", agent: "claude", color: "#E6D3A8", a: 206 },
  { id: "quotes", name: "Trade quotes", agent: "chatgpt", color: "#F2F1EE", a: 290 },
  { id: "brief", name: "Durian brief", agent: "ours", color: C.blue, a: 326 },
  { id: "research", name: "Research data", agent: "ours", color: "#F2F1EE", a: 358 },
  { id: "renew", name: "Data renewals", agent: "ours", color: "#B9CDB1", a: 30 },
  { id: "premium", name: "Premium reports", agent: "ours", color: "#E6D3A8", a: 64 },
  { id: "one", name: "One purchase", agent: "ours", color: "#E6D3A8", a: 114 },
];
const SELLERS = [
  { id: "exa", name: "Exa", src: "brand/exa-icon-square.svg", bg: "#0143D9", a: 300, full: true },
  { id: "gecko", name: "CoinGecko", src: "brand/coingecko-symbol.svg", bg: "#FFFFFF", a: 240 },
  { id: "tw", name: "TradeWire", tag: "TW", bg: "#2A2B30", a: 186 },
  { id: "nansen", name: "Nansen", src: "brand/nansen-icon-black.svg", bg: "#FFFFFF", a: 128 },
  { id: "dp", name: "DataPro", tag: "DP", bg: "#2A2B30", a: 66 },
];
// only payments each card's sellers list allows; TradeWire is on Market news's list alone
const PAYS: [string, string][] = [
  ["research", "exa"], ["research", "gecko"], ["research", "nansen"], ["renew", "exa"], ["renew", "gecko"], ["renew", "nansen"],
  ["news", "exa"], ["news", "gecko"], ["news", "nansen"], ["watch", "nansen"], ["quotes", "gecko"], ["quotes", "exa"],
  ["premium", "dp"], ["one", "exa"], ["brief", "exa"], ["cres", "nansen"], ["news", "tw"],
];

export const BrainGraph: React.FC<BrainEvents> = ({ pays, flag, memory, head, eyebrow, note }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const spin = t * 0.9; // the rings turn slowly
  const zoom = 1 + 0.05 * easeInOut(clamp(t / 9));
  const pos: Record<string, Node> = {};
  AGENTS.forEach((n) => { const [x, y] = polar(n.a + spin, 150, 128); pos[n.id] = { id: n.id, x, y }; });
  CARDS.forEach((n) => { const [x, y] = polar(n.a + spin * 0.7, 290, 236); pos[n.id] = { id: n.id, x, y }; });
  SELLERS.forEach((n) => { const [x, y] = polar(n.a + spin * 0.5, 480, 335); pos[n.id] = { id: n.id, x, y }; });
  const appear = (ring: number, i: number) => settle(t - 0.15 - ring * 0.32 - i * 0.05, 9);
  const flagged = settle(t - flag, 10);
  // a payment leaves a card every so often; each one pings the Brain
  const pulses: { from: Node; to: Node; u: number; tw: boolean; k: number }[] = [];
  const pings: number[] = [];
  PAYS.forEach(([c, s], i) => {
    const tw = s === "tw";
    // TradeWire gets two payments just before it is flagged; the second is stopped halfway as the flag lands
    const starts = tw ? [flag - 0.6, flag - 0.4] : Array.from({ length: 8 }, (_, k) => pays + i * 0.37 + k * 1.9 + ((i * 7) % 5) * 0.11);
    starts.forEach((start, k) => {
      const u = (t - start) / 1.0;
      if (u < -0.2 || u > 1.15) return;
      pulses.push({ from: pos[c], to: pos[s], u: clamp(u), tw, k });
      if (u >= 0 && u < 0.35) pings.push(u);
    });
  });
  const coreP = settle(t - 0.05, 8);
  return (
    <Stage>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${zoom})`, transformOrigin: `${CX}px ${CY}px` }}>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <radialGradient id="bg-glow">
              <stop offset="0%" stopColor="rgba(157,202,255,0.16)" />
              <stop offset="100%" stopColor="rgba(157,202,255,0)" />
            </radialGradient>
          </defs>
          <ellipse cx={CX} cy={CY} rx={560} ry={400} fill="url(#bg-glow)" opacity={coreP} />
          {/* the rings */}
          {[[150, 128], [290, 236], [480, 335]].map(([rx, ry], i) => (
            <ellipse key={i} cx={CX} cy={CY} rx={rx} ry={ry} fill="none" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 7" opacity={appear(i, 0)} />
          ))}
          {/* agent to card */}
          {CARDS.map((c, i) => {
            const a = pos[c.agent];
            const b = pos[c.id];
            return <line key={c.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(255,255,255,0.22)" strokeWidth={1.6} opacity={appear(1, i)} />;
          })}
          {/* card to seller: the payments; a flagged seller's lines turn red and are cut */}
          {PAYS.map(([c, s], i) => {
            const a = pos[c];
            const b = pos[s];
            const tw = s === "tw";
            const mx = (a.x + b.x) / 2 + (CX - (a.x + b.x) / 2) * 0.18;
            const my = (a.y + b.y) / 2 + (CY - (a.y + b.y) / 2) * 0.18;
            return (
              <path
                key={i}
                d={`M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`}
                fill="none"
                stroke={tw && flagged > 0.02 ? `rgba(240,78,35,${0.3 + 0.5 * flagged})` : "rgba(255,255,255,0.2)"}
                strokeWidth={tw && flagged > 0.02 ? 2.4 : 1.5}
                strokeDasharray={tw && flagged > 0.02 ? "6 6" : undefined}
                opacity={appear(2, i % 5)}
              />
            );
          })}
          {/* the Brain checks each payment: a ring goes out from the centre */}
          {pings.map((u, i) => (
            <circle key={i} cx={CX} cy={CY} r={70 + u * 190} fill="none" stroke={C.blue} strokeWidth={3} opacity={(1 - u / 0.35) * 0.75} />
          ))}
          {/* payments on their way */}
          {pulses.map((p, i) => {
            const mx = (p.from.x + p.to.x) / 2 + (CX - (p.from.x + p.to.x) / 2) * 0.18;
            const my = (p.from.y + p.to.y) / 2 + (CY - (p.from.y + p.to.y) / 2) * 0.18;
            const u = p.tw ? Math.min(p.u, 0.55) : p.u; // payments to the flagged seller stop halfway
            const x = (1 - u) * (1 - u) * p.from.x + 2 * (1 - u) * u * mx + u * u * p.to.x;
            const y = (1 - u) * (1 - u) * p.from.y + 2 * (1 - u) * u * my + u * u * p.to.y;
            const o = p.u <= 0 ? 0 : p.u >= 1 ? 0 : Math.sin(Math.PI * p.u) * 0.95;
            const red = p.tw && flagged > 0.02;
            return <circle key={i} cx={x} cy={y} r={6} fill={red ? C.vermillion : C.blue} opacity={o} style={{ filter: `drop-shadow(0 0 6px ${red ? "rgba(240,78,35,0.9)" : "rgba(157,202,255,0.9)"})` }} />;
          })}
          {/* the core's dashed ring */}
          <circle cx={CX} cy={CY} r={90} fill="none" stroke="rgba(157,202,255,0.55)" strokeWidth={2} strokeDasharray="8 9" transform={`rotate(${t * 18} ${CX} ${CY})`} opacity={coreP} />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2 + t * 0.6;
            return <circle key={i} cx={CX + Math.cos(a) * 90} cy={CY + Math.sin(a) * 90} r={5} fill={C.blue} opacity={coreP * 0.85} />;
          })}
        </svg>
        {/* the Brain */}
        <div style={{ position: "absolute", left: CX - 64, top: CY - 64, width: 128, height: 128, borderRadius: 64, background: "#F2F1EE", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 ${60 + 50 * Math.min(1, pings.length)}px rgba(157,202,255,${0.35 + 0.25 * Math.min(1, pings.length)}), 0 20px 50px rgba(0,0,0,0.6)`, transform: `scale(${0.6 + 0.4 * coreP})`, opacity: coreP }}>
          <BrandMark size={62} light={false} t={t - 0.1} />
        </div>
        <div style={{ position: "absolute", left: CX - 100, width: 200, top: CY + 100, textAlign: "center", fontFamily: F.display, fontWeight: 600, fontSize: 24, color: C.blue, opacity: coreP, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>Brain</div>
        {/* agents */}
        {AGENTS.map((n, i) => {
          const p = appear(0, i);
          const { x, y } = pos[n.id];
          return (
            <div key={n.id} style={{ position: "absolute", left: x - 34, top: y - 34, opacity: p, transform: `scale(${0.6 + 0.4 * p})` }}>
              <div style={{ width: 68, height: 68, borderRadius: 34, background: n.src ? "#FFFFFF" : "#111215", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 26px rgba(0,0,0,0.55), 0 0 0 1.5px rgba(255,255,255,0.18)" }}>
                {n.src ? <Img src={staticFile(n.src)} style={{ width: 68 * n.s!, height: 68 * n.s!, objectFit: "contain" }} /> : <BrainCircuit size={34} color="#F2F1EE" />}
              </div>
              <Label text={n.name} y={y < CY ? -34 : 76} />
            </div>
          );
        })}
        {/* cards */}
        {CARDS.map((n, i) => {
          const p = appear(1, i);
          const { x, y } = pos[n.id];
          return (
            <div key={n.id} style={{ position: "absolute", left: x - 20, top: y - 13, opacity: p, transform: `scale(${0.5 + 0.5 * p})` }}>
              <div style={{ position: "relative", width: 40, height: 26, borderRadius: 5, background: n.color, boxShadow: `0 0 16px ${n.color}55`, overflow: "hidden" }}>
                <div style={{ position: "absolute", left: 0, right: 0, top: 6, height: 3, background: "rgba(10,11,13,0.55)" }} />
              </div>
              <Label text={n.name} y={32} small />
            </div>
          );
        })}
        {/* sellers */}
        {SELLERS.map((n, i) => {
          const p = appear(2, i);
          const { x, y } = pos[n.id];
          const red = n.id === "tw" ? flagged : 0;
          return (
            <div key={n.id} style={{ position: "absolute", left: x - 32, top: y - 32, opacity: p, transform: `scale(${0.6 + 0.4 * p})` }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: n.bg, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", boxShadow: `0 10px 26px rgba(0,0,0,0.55), 0 0 0 ${1.5 + 2 * red}px ${red ? C.vermillion : "rgba(255,255,255,0.16)"}, 0 0 ${30 * red}px rgba(240,78,35,${0.6 * red})` }}>
                {n.src ? <Img src={staticFile(n.src)} style={{ width: n.full ? 64 : 42, height: n.full ? 64 : 42, objectFit: "contain" }} /> : <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 24, color: "#F2F1EE" }}>{n.tag}</div>}
              </div>
              <Label text={n.name} y={72} />
              {n.id === "tw" ? <Label text="made-up seller" y={100} small /> : null}
              {n.id === "tw" ? <Flag p={flagged} /> : null}
            </div>
          );
        })}
      </div>
      {/* the headline, top left */}
      {head ? (
        <div style={{ position: "absolute", left: 120, top: 92, opacity: settle(t - 0.3, 9), transform: `translateY(${(1 - settle(t - 0.3, 9)) * 16}px)` }}>
          {eyebrow ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: F.mono, fontSize: 20, letterSpacing: "0.14em", color: C.blue, textTransform: "uppercase", fontVariantLigatures: "none" }}>
              <div style={{ width: 9, height: 9, background: C.blue }} />
              {eyebrow}
            </div>
          ) : null}
          <div style={{ marginTop: 14, fontFamily: F.display, fontWeight: 600, fontSize: 64, lineHeight: 1.04, letterSpacing: "-0.02em", color: C.text, whiteSpace: "pre" }}>{head}</div>
        </div>
      ) : null}
      {memory !== undefined ? <Memory t={t - memory} /> : null}
      {note ? <div style={{ position: "absolute", left: 120, bottom: 120, fontFamily: F.body, fontWeight: 500, fontSize: 24, color: C.muted, opacity: settle(t - 0.8, 6) }}>{note}</div> : null}
    </Stage>
  );
};

const Label: React.FC<{ text: string; y: number; small?: boolean }> = ({ text, y, small }) => (
  <div style={{ position: "absolute", left: "50%", top: y, transform: "translateX(-50%)", whiteSpace: "nowrap", fontFamily: F.body, fontWeight: 600, fontSize: small ? 22 : 23, color: small ? "rgba(242,241,238,0.9)" : C.text, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
    {text}
  </div>
);

// the flagged seller: risk score and "blocked for all your cards", on the stage beside it
const Flag: React.FC<{ p: number }> = ({ p }) => (
  <div style={{ position: "absolute", left: -330, top: -70, width: 310, opacity: p, transform: `translateX(${(1 - p) * 20}px)` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 34, height: 34, borderRadius: 17, background: C.vermillion, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Ban size={20} color="#FFFFFF" strokeWidth={2.6} />
      </div>
      <div style={{ fontFamily: F.mono, fontWeight: 500, fontSize: 26, color: C.vermillion, fontVariantLigatures: "none" }}>risk 9/10</div>
    </div>
    <div style={{ marginTop: 8, fontFamily: F.body, fontWeight: 600, fontSize: 24, color: C.text, lineHeight: 1.25, whiteSpace: "nowrap" }}>Blocked for all your cards</div>
  </div>
);

// what it has learned, in the app's own words (the Brain tab's "Learned with you")
const MEMORY: [string, string][] = [
  ["Durian export news", "Exa, HK$0.056, every morning"],
  ["ETH price in HK$", "CoinGecko, HK$0.08"],
  ["Premium report", "DataPro, negotiated to HK$8.80"],
];
const Memory: React.FC<{ t: number }> = ({ t }) => {
  const p = settle(t, 9);
  return (
    <div style={{ position: "absolute", left: 1440, top: 330, width: 400, opacity: p, transform: `translateX(${(1 - p) * 40}px)`, borderRadius: 22, background: "rgba(20,21,25,0.92)", boxShadow: "0 0 0 1.5px rgba(157,202,255,0.35), 0 30px 70px rgba(0,0,0,0.6)", padding: "22px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 28, color: C.text }}>Learned with you</div>
        <div style={{ fontFamily: F.mono, fontSize: 17, color: C.blue, fontVariantLigatures: "none" }}>memory v3</div>
      </div>
      {MEMORY.map(([a, b], i) => {
        const q = settle(t - 0.35 - i * 0.3, 10);
        return (
          <div key={a} style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)", opacity: q, transform: `translateY(${(1 - q) * 10}px)` }}>
            <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 23, color: C.text }}>{a}</div>
            <div style={{ marginTop: 4, fontFamily: F.body, fontWeight: 500, fontSize: 19, color: C.muted }}>{b}</div>
          </div>
        );
      })}
    </div>
  );
};
