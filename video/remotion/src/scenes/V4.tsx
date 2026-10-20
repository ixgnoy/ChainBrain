import React from "react";
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Ban, Bot, ClipboardCheck, Coins, Eye, FileLock2, Gauge, KeyRound, PenLine, Radar, ScanText, Server, Smartphone, Snowflake, Wrench } from "lucide-react";
import { Badge } from "../components/Badge";
import { HashHold } from "../components/HashHold";
import { BrandMark } from "../components/BrandMark";
import { Reveal } from "../components/Kinetic";
import { DIM, Plaque, UiCard } from "../components/Real";
import { Stage } from "../components/Stage";
import { C, F, clamp, easeInOut, easeOut, settle } from "../theme";
import { sceneStart, voAt, voEnd, wordAt } from "../vo";

// v4 "how it works" scenes (video/STORYBOARD-v4.md): the payment X-ray (one large board filmed with a moving camera),
// the eight layers, what a stolen key can do, and the HKMA's four principles. Every arrow and label is the real
// system (docs/submission/ChainBrain-technical-overview.pdf, pages 1-8); times come from the voice-over's words.

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};
const rel = (scene: string) => {
  const s = sceneStart(scene);
  return { vo: (id: string) => voAt(id) - s, word: (id: string, w: string, n = 0) => wordAt(id, w, n) - s, end: (id: string) => voEnd(id) - s };
};
const lit = (t: number, at: number, w = 10) => settle(t - at, w);

// ─────────────── geometry: polylines with arc-length progress ───────────────
type P = [number, number];
const segLens = (pts: P[]) => pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
const total = (pts: P[]) => segLens(pts).reduce((a, b) => a + b, 0);
function pointAt(pts: P[], u: number): P {
  const L = segLens(pts);
  let d = clamp(u) * L.reduce((a, b) => a + b, 0);
  for (let i = 0; i < L.length; i++) {
    if (d <= L[i] || i === L.length - 1) {
      const k = L[i] ? Math.min(1, d / L[i]) : 0;
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
    }
    d -= L[i];
  }
  return pts[pts.length - 1];
}
function partial(pts: P[], u: number): P[] {
  if (u <= 0) return [pts[0]];
  const L = segLens(pts);
  let d = clamp(u) * L.reduce((a, b) => a + b, 0);
  const out: P[] = [pts[0]];
  for (let i = 0; i < L.length; i++) {
    if (d >= L[i]) {
      out.push(pts[i + 1]);
      d -= L[i];
    } else {
      const k = L[i] ? d / L[i] : 0;
      out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]);
      break;
    }
  }
  return out;
}
const toD = (pts: P[]) => pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

// An edge that draws itself ahead of its packet; the packet is a small comet with a short tail.
const Edge: React.FC<{ pts: P[]; t: number; at: number; dur?: number; color?: string; dashed?: boolean; label?: string; labelAt?: P; packet?: string; width?: number }> = ({
  pts,
  t,
  at,
  dur = 0.9,
  color = C.blue,
  dashed,
  label,
  labelAt,
  packet,
  width = 3,
}) => {
  const u = easeInOut(clamp((t - at) / dur));
  if (u <= 0) return null;
  const head = pointAt(pts, u);
  const moving = u > 0 && u < 1;
  const L = total(pts);
  const after = clamp((t - at - dur) / 0.6);
  return (
    <g>
      <path d={toD(pts)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={width} />
      <path d={toD(partial(pts, u))} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dashed ? "14 10" : undefined} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
      {moving
        ? Array.from({ length: 7 }, (_, i) => {
            const p = pointAt(pts, Math.max(0, u - (i * 16) / L));
            return <circle key={i} cx={p[0]} cy={p[1]} r={(packet ? 11 : 8) * (1 - i / 8)} fill={color} opacity={(1 - i / 7) * 0.55} />;
          })
        : null}
      {moving ? <circle cx={head[0]} cy={head[1]} r={packet ? 12 : 9} fill="#fff" /> : null}
      {u >= 1 ? <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={7 + 14 * (1 - after)} fill="none" stroke={color} strokeWidth={2} opacity={1 - after} /> : null}
      {label && labelAt ? (
        <text x={labelAt[0]} y={labelAt[1]} fill={color} opacity={clamp((t - at - 0.2) / 0.4)} fontFamily={F.mono} fontSize={22} textAnchor="middle" style={{ fontVariantLigatures: "none" }}>
          {label}
        </text>
      ) : null}
      {packet && moving ? (
        <g transform={`translate(${head[0]}, ${head[1] - 34})`}>
          <rect x={-70} y={-20} width={140} height={34} rx={17} fill={color} />
          <text x={0} y={4} fill="#0A0B0D" fontFamily={F.mono} fontSize={19} fontWeight={700} textAnchor="middle" style={{ fontVariantLigatures: "none" }}>
            {packet}
          </text>
        </g>
      ) : null}
    </g>
  );
};

// A box on the board. `on` 0..1 lights it; dim when it is not the subject.
const Node: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  on: number;
  title: string;
  sub?: string;
  icon?: React.ReactNode;
  logo?: string;
  tone?: string;
  dark?: boolean;
  logos?: { src: string; h: number; plaque?: boolean }[];
  children?: React.ReactNode;
}> = ({ x, y, w, h, on, title, sub, icon, logo, tone = C.blue, dark, logos, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: 22,
      background: dark ? "#050506" : "#15161A",
      boxShadow: `0 0 0 ${1.5 + on}px ${on > 0.05 ? tone : "rgba(255,255,255,0.10)"}, 0 24px 60px rgba(0,0,0,0.55), 0 0 ${50 * on}px ${tone}33`,
      opacity: 0.38 + 0.62 * on,
      padding: "24px 26px",
      boxSizing: "border-box",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      {logo ? (
        <div style={{ width: 54, height: 54, borderRadius: 27, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flex: "none" }}>
          <Img src={staticFile(logo)} style={{ width: 34, height: 34, objectFit: "contain" }} />
        </div>
      ) : icon ? (
        <div style={{ width: 54, height: 54, borderRadius: 16, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", color: on > 0.05 ? tone : C.muted, flex: "none" }}>{icon}</div>
      ) : null}
      <div>
        <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 31, color: C.text, lineHeight: 1.1 }}>{title}</div>
        {sub ? <div style={{ fontFamily: F.mono, fontSize: 19, color: C.muted, marginTop: 6, fontVariantLigatures: "none" }}>{sub}</div> : null}
      </div>
    </div>
    {logos ? (
      <div style={{ position: "absolute", right: 22, bottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
        {logos.map((l) => (
          <div key={l.src} style={{ padding: l.plaque ? "6px 10px" : 0, borderRadius: 10, background: l.plaque ? "#fff" : "transparent", display: "flex" }}>
            <Img src={staticFile(l.src)} style={{ height: l.h, width: "auto", display: "block", borderRadius: l.plaque ? 0 : 8 }} />
          </div>
        ))}
      </div>
    ) : null}
    {children}
  </div>
);

const KeyChip: React.FC<{ label: string; color: string; on: number; struck?: boolean; style?: React.CSSProperties }> = ({ label, color, on, struck, style }) => (
  <div
    style={{
      position: "absolute",
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 16px",
      borderRadius: 30,
      background: struck ? "rgba(255,255,255,0.05)" : color,
      color: struck ? C.muted : "#0A0B0D",
      fontFamily: F.mono,
      fontWeight: 700,
      fontSize: 19,
      letterSpacing: "0.08em",
      opacity: on,
      transform: `scale(${0.8 + 0.2 * on})`,
      boxShadow: struck ? "inset 0 0 0 1.5px rgba(255,255,255,0.18)" : `0 0 ${30 * on}px ${color}66`,
      fontVariantLigatures: "none",
      ...style,
    }}
  >
    {struck ? <Ban size={20} /> : <KeyRound size={20} />}
    <span style={{ textDecoration: struck ? "line-through" : undefined }}>{label}</span>
  </div>
);

// ─────────────── the X-ray board ───────────────
const BW = 2620;
const BH = 1420;
type Cam = { t: number; cx: number; cy: number; s: number };
function camAt(keys: Cam[], t: number): Cam {
  if (t <= keys[0].t) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t < b.t) {
      const k = easeInOut(clamp((t - (b.t - 0.9)) / 0.9));
      const s = Math.exp(Math.log(a.s) + (Math.log(b.s) - Math.log(a.s)) * k); // zoom in log space feels even
      return { t, cx: a.cx + (b.cx - a.cx) * k, cy: a.cy + (b.cy - a.cy) * k, s };
    }
  }
  return keys[keys.length - 1];
}

const CHECKS = ["Exact payment", "Agent signed", "Not frozen or cancelled", "Seller on your list", "Under the limit", "Enough balance", "Within the allowance", "Your signature, if above ask-me"];
const SERVER_CHECKS: { name: string; icon: React.ReactNode; note: string }[] = [
  { name: "Task check", icon: <ClipboardCheck size={26} />, note: "your task" },
  { name: "Radar", icon: <Radar size={26} />, note: "risk 0/10" },
  { name: "Sentinel", icon: <Eye size={26} />, note: "no hijack" },
  { name: "Pre-flight", icon: <Gauge size={26} />, note: "test run first" },
];

export const XRay: React.FC = () => {
  const t = useT();
  const r = rel("xray");
  const T = {
    x1: r.vo("x1"),
    scan: r.vo("x1") + 0.45,
    owner: r.word("x2", "owner"),
    agentKey: r.word("x2", "agent"),
    aiNone: r.word("x2", "ai"),
    x3: r.vo("x3"),
    picks: r.word("x3", "picks"),
    price: r.word("x3", "price"),
    x4: r.vo("x4"),
    task: r.word("x4", "task"),
    traces: r.word("x4", "looks"),
    rehearses: r.word("x4", "tests"),
    x5: r.vo("x5"),
    signs: r.word("x5", "signs"),
    sends: r.word("x5", "sends"),
    chain: r.word("x5", "chain"),
    x6a: r.vo("x6a"),
    x6: r.vo("x6"),
    asks: r.word("x6", "asks"),
    eight: r.word("x6", "eight"),
    x7: r.vo("x7"),
    pass: r.word("x7", "pass"),
    hash: r.word("x7", "hash"),
    end: r.end("x7"),
  };
  // the real hash, held full screen after "a hash anyone can open" (Topic F is scored on hashes); the pull-back waits
  const HOLD = 1.8;
  const E = T.end + HOLD;
  const cams: Cam[] = [
    { t: 0, cx: 1310, cy: 690, s: 0.7 },
    { t: T.scan + 1.2, cx: 1310, cy: 690, s: 0.7 },
    { t: T.owner, cx: 330, cy: 380, s: 1.3 }, // your phone: the owner key
    { t: T.agentKey + 0.2, cx: 1010, cy: 800, s: 1.15 }, // one agent key per card
    { t: T.aiNone + 0.2, cx: 800, cy: 360, s: 1.3 }, // the AI: no key
    { t: T.x3 + 0.3, cx: 1200, cy: 330, s: 1.02 },
    { t: T.price + 0.4, cx: 1200, cy: 330, s: 1.02 },
    { t: T.x4 + 0.5, cx: 1150, cy: 600, s: 1.3 },
    { t: T.x5 - 0.1, cx: 1150, cy: 600, s: 1.3 },
    { t: T.x5 + 0.8, cx: 1500, cy: 840, s: 0.95 },
    { t: T.x6a, cx: 1500, cy: 840, s: 0.95 },
    { t: T.asks + 0.5, cx: 2310, cy: 960, s: 1.15 },
    { t: T.pass + 0.2, cx: 2310, cy: 960, s: 1.15 },
    { t: T.pass + 1.3, cx: 2050, cy: 560, s: 0.92 },
    { t: E + 0.4, cx: 2050, cy: 560, s: 0.92 },
    { t: E + 1.6, cx: 1310, cy: 690, s: 0.71 },
  ];
  const cam = camAt(cams, t);
  // the contrast overlay (where the limit lives) covers the board from x6a until the money "asks" the card
  const overlay = clamp((t - T.x6a + 0.2) / 0.4) * (1 - clamp((t - T.asks + 0.1) / 0.5));
  // the opening: the payment from the phone, then a scan line reveals the board under it
  const scanX = easeInOut(clamp((t - T.scan) / 1.1)) * 2100 - 90;
  const boardIn = clamp((t - T.scan) / 0.6);
  const settled = t >= T.pass;
  const all = clamp((t - E - 0.6) / 0.8); // final pull-back: everything lit
  const on = (at: number) => Math.max(lit(t, at), all);
  const checkOn = (i: number) => lit(t, T.eight + 0.15 + i * 0.3, 14);
  return (
    <Stage>
      <AbsoluteFill style={{ opacity: boardIn }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: BW,
            height: BH,
            transformOrigin: "0 0",
            transform: `translate(${960 - cam.cx * cam.s}px, ${540 - cam.cy * cam.s}px) scale(${cam.s})`,
            filter: overlay > 0 ? `brightness(${1 - 0.75 * overlay})` : undefined,
          }}
        >
          {/* lanes */}
          {[
            { x: 60, w: 440, name: "YOUR PHONE", sub: "owner's device" },
            { x: 560, w: 880, name: "CHAINBRAIN SERVER", sub: "off-chain" },
            { x: 1500, w: 460, name: "SELLER", sub: "x402" },
            { x: 2060, w: 500, name: "FISCO BCOS", sub: "on-chain, chain 20200" },
          ].map((l) => (
            <div key={l.name} style={{ position: "absolute", left: l.x, top: 40, width: l.w, height: 1320, borderRadius: 30, background: "rgba(255,255,255,0.018)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)" }}>
              <div style={{ position: "absolute", left: 30, top: 26, fontFamily: F.mono, fontSize: 22, letterSpacing: "0.16em", color: C.muted, fontVariantLigatures: "none" }}>{l.name}</div>
              <div style={{ position: "absolute", left: 30, top: 58, fontFamily: F.body, fontSize: 20, color: C.faint }}>{l.sub}</div>
            </div>
          ))}
          {/* the line between helping and holding */}
          <div style={{ position: "absolute", left: 2009, top: 130, width: 0, height: 1180, borderLeft: `3px dashed ${C.vermillion}`, opacity: 0.55 }} />
          <div style={{ position: "absolute", left: 1700, top: 1302, width: 290, textAlign: "right", fontFamily: F.body, fontWeight: 600, fontSize: 26, color: C.blue }}>helps the agent behave</div>
          <div style={{ position: "absolute", left: 2030, top: 1302, width: 330, fontFamily: F.body, fontWeight: 600, fontSize: 26, color: C.vermillion }}>holds without our server</div>

          {/* phone */}
          <Node x={100} y={230} w={360} h={220} on={on(T.owner - 0.1)} title="Your phone" sub="ChainBrain app" icon={<BrandMark size={30} />} tone={C.vermillion}>
            <KeyChip label="OWNER KEY" color={C.vermillion} on={lit(t, T.owner)} style={{ left: 26, bottom: 24 }} />
          </Node>
          {/* server */}
          <Node x={600} y={230} w={380} h={220} on={on(T.aiNone - 0.1)} title="AI agent" sub="Claude Haiku 5.5" logo="brand/claude-spark-clay.png" logos={[{ src: "brand/openrouter.png", h: 40 }]}>
            <KeyChip label="NO KEY" color={C.muted} struck on={lit(t, T.aiNone)} style={{ left: 26, bottom: 24 }} />
          </Node>
          <Node x={1020} y={230} w={400} h={220} on={on(T.price)} title="Wallet tools" sub="7 tools, only one pays" icon={<Wrench size={28} />} logos={[{ src: "brand/hono.png", h: 24, plaque: true }]} />
          <div style={{ position: "absolute", left: 600, top: 500, width: 820, height: 210, borderRadius: 22, background: "#15161A", boxShadow: "0 0 0 1.5px rgba(255,255,255,0.10)", opacity: 0.38 + 0.62 * on(T.task - 0.2), padding: "20px 22px", boxSizing: "border-box" }}>
            <div style={{ fontFamily: F.mono, fontSize: 19, letterSpacing: "0.14em", color: C.muted, fontVariantLigatures: "none" }}>SERVER CHECKS, BEFORE SIGNING</div>
            <div style={{ display: "flex", gap: 14, marginTop: 16 }}>
              {SERVER_CHECKS.map((c, i) => {
                const at = [T.task, T.traces, T.traces + 0.45, T.rehearses][i];
                const k = Math.max(lit(t, at, 13), all);
                return (
                  <div key={c.name} style={{ flex: 1, height: 116, borderRadius: 16, background: k > 0.05 ? "rgba(157,202,255,0.10)" : "rgba(255,255,255,0.04)", boxShadow: `inset 0 0 0 ${1 + k}px ${k > 0.05 ? C.blue : "rgba(255,255,255,0.08)"}`, padding: "14px 16px", boxSizing: "border-box", color: k > 0.05 ? C.blue : C.muted }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      {c.icon}
                      <Badge kind="ok" size={30} on={k} />
                    </div>
                    <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 23, color: C.text, marginTop: 10 }}>{c.name}</div>
                    <div style={{ fontFamily: F.mono, fontSize: 16, color: C.muted, fontVariantLigatures: "none" }}>{c.note}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <Node x={600} y={760} w={820} h={170} on={on(T.signs - 0.1)} title="Agent key, one per card" sub="signs one exact payment from the card (EIP-3009)" icon={<KeyRound size={28} />}>
            <KeyChip label="AGENT KEY" color={C.blue} on={lit(t, T.agentKey)} style={{ right: 26, top: 26 }} />
          </Node>
          {/* seller */}
          <Node x={1540} y={230} w={380} h={220} on={on(T.picks + 0.4)} title="Exa" sub="test seller, answers HTTP 402 with a price" logo="brand/exa-icon-square.svg">
            <div style={{ position: "absolute", left: 26, bottom: 24, display: "flex", alignItems: "center", gap: 12, opacity: lit(t, T.price) }}>
              <div style={{ padding: "6px 12px", borderRadius: 10, background: "#fff" }}>
                <Img src={staticFile("brand/x402-logo-dark.png")} style={{ height: 22, display: "block" }} />
              </div>
              <div style={{ fontFamily: F.mono, fontSize: 22, color: C.text, fontVariantLigatures: "none" }}>402, HK$0.056</div>
            </div>
          </Node>
          <Node x={1540} y={760} w={380} h={170} on={on(T.sends - 0.2)} title="Facilitator" sub="submits the signed payment" logos={[{ src: "brand/x402-logo-dark.png", h: 22, plaque: true }]} />
          {/* chain */}
          <div style={{ position: "absolute", left: 2100, top: 130 }}>
            <Plaque src="brand/fisco-bcos-logo.svg" h={34} p={1} pad={10} />
          </div>
          <Node x={2100} y={560} w={420} h={170} on={on(T.chain - 0.1)} title="Mock e-HKD token" sub="asks the card first (ERC-1271)" icon={<Coins size={28} />} />
          <div
            style={{
              position: "absolute",
              left: 2100,
              top: 790,
              width: 420,
              height: 470,
              borderRadius: 22,
              background: "#050506",
              boxShadow: `0 0 0 ${1.5 + on(T.asks)}px ${settled ? C.blue : on(T.asks) > 0.05 ? C.vermillion : "rgba(255,255,255,0.10)"}, 0 0 ${60 * on(T.asks)}px ${settled ? "rgba(157,202,255,0.35)" : "rgba(240,78,35,0.30)"}`,
              opacity: 0.38 + 0.62 * on(T.asks - 0.2),
              padding: "22px 24px",
              boxSizing: "border-box",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <BrandMark size={40} />
              <div>
                <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 30, color: C.text }}>AI Card</div>
                <div style={{ fontFamily: F.mono, fontSize: 18, color: C.muted, fontVariantLigatures: "none" }}>its own contract, Pocket.sol</div>
              </div>
              <div style={{ marginLeft: "auto", padding: "6px 8px", borderRadius: 10, background: "#fff", display: "flex" }}>
                <Img src={staticFile("brand/solidity.svg")} style={{ height: 30, width: "auto" }} />
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              {CHECKS.map((c, i) => {
                const k = Math.max(checkOn(i), all);
                return (
                  <div key={c} style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 0", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                    <Badge kind="ok" size={26} on={k} />
                    <div style={{ fontFamily: F.body, fontWeight: 500, fontSize: 22, color: k > 0.05 ? C.text : C.muted }}>{c}</div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* edges */}
          <svg width={BW} height={BH} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
            <Edge pts={[[280, 450], [280, 1300], [2310, 1300], [2310, 1260]]} t={t} at={E + 0.9} dur={1.2} color={C.vermillion} dashed label="your key creates the card, funds it, sets its rules" labelAt={[1300, 1288]} />
            <Edge pts={[[460, 340], [600, 340]]} t={t} at={T.x3 - 0.1} dur={0.5} label="your task" labelAt={[530, 322]} />
            <Edge pts={[[790, 230], [790, 160], [1730, 160], [1730, 230]]} t={t} at={T.picks} dur={1.0} label="get a quote" labelAt={[1260, 146]} />
            <Edge pts={[[1540, 380], [1420, 380]]} t={t} at={T.price} dur={0.5} label="402" labelAt={[1480, 364]} />
            <Edge pts={[[1220, 450], [1220, 500]]} t={t} at={T.task - 0.3} dur={0.35} />
            <Edge pts={[[1010, 710], [1010, 760]]} t={t} at={T.signs - 0.2} dur={0.35} />
            <Edge pts={[[1420, 845], [1540, 845]]} t={t} at={T.signs + 0.6} dur={0.7} packet="signed" />
            <Edge pts={[[1920, 845], [1990, 845], [1990, 645], [2100, 645]]} t={t} at={T.sends} dur={1.0} packet="submit" />
            <Edge pts={[[2310, 730], [2310, 790]]} t={t} at={T.asks - 0.1} dur={0.4} color={C.vermillion} label="is this allowed?" labelAt={[2310, 770]} />
            <Edge pts={[[2310, 560], [2310, 330], [1920, 330]]} t={t} at={T.pass + 0.1} dur={1.1} color={C.green} packet="HK$0.056" />
          </svg>
        </div>
      </AbsoluteFill>

      {/* the real app beside the board: the phone signs with the owner key; the checks the app shows */}
      <Inset name="cheque" w={390} x={400} y={590} t={t} from={T.owner - 0.2} to={T.agentKey - 0.6} label="your phone signs" />
      <Inset name="guarded" w={500} x={1600} y={600} t={t} from={T.task + 0.2} to={T.x5 - 0.4} label="what the app shows" />

      {/* opening: the payment we just watched, scanned */}
      {t < T.scan + 1.3 ? (
        <AbsoluteFill style={{ clipPath: `inset(0 0 0 ${clamp(scanX / 1920) * 100}%)` }}>
          <Stage>
            <UiCard name="paid" w={980} x={960} y={540} p={1} />
          </Stage>
        </AbsoluteFill>
      ) : null}
      {t >= T.scan - 0.05 && t < T.scan + 1.3 ? <div style={{ position: "absolute", left: scanX, top: 0, width: 4, height: 1080, background: C.blue, boxShadow: `0 0 40px 12px rgba(157,202,255,0.55)` }} /> : null}

      {/* where the limit lives */}
      {overlay > 0 ? <Contrast t={t} T={T} p={overlay} /> : null}

      {/* the real payment on the hosted chain */}
      {t > T.hash - 0.3 ? (
        <AbsoluteFill style={{ opacity: 1 - clamp((t - E - 0.3) / 0.5) }}>
          <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(10,11,13,0) 30%, rgba(10,11,13,0.9) 52%)", opacity: lit(t, T.hash - 0.2, 9) }} />
          <UiCard name="ex-success" w={800} x={1420} y={640} p={lit(t, T.hash - 0.2, 9)} tone={C.green} from={[60, 0]} />
          <div style={{ position: "absolute", left: 1020, top: 830, width: 860, whiteSpace: "nowrap", fontFamily: F.mono, fontSize: 20, color: C.green, opacity: lit(t, T.hash + 0.3), fontVariantLigatures: "none" }}>
            the same path on our hosted chain: block 11, HK$2.30 to DataLite
          </div>
        </AbsoluteFill>
      ) : null}
      {/* one FISCO-specific fact while the card's checks tick (contracts/src/Clock.sol) */}
      {t > T.eight + 0.6 && t < T.pass + 0.6 ? (
        <div style={{ position: "absolute", left: 90, top: 700, maxWidth: 620, display: "flex", alignItems: "center", gap: 16, padding: "14px 22px", borderRadius: 14, background: "rgba(10,11,13,0.88)", boxShadow: "0 0 0 1.5px rgba(157,202,255,0.35)", opacity: Math.min(lit(t, T.eight + 0.7, 10), 1 - clamp((t - T.pass - 0.2) / 0.4)) }}>
          <Plaque src="brand/fisco-bcos-logo.svg" h={28} p={1} pad={9} />
          <div style={{ fontFamily: F.body, fontWeight: 500, fontSize: 28, color: C.text }}>FISCO BCOS counts block time in milliseconds. The card converts it to seconds.</div>
        </div>
      ) : null}
      {t > T.end - 0.3 && t < E + 0.4 ? <HashHold p={Math.min(lit(t, T.end - 0.2, 10), 1 - clamp((t - E + 0.1) / 0.4))} t={t - T.end} hash="0x15b0d30f82cd7efc94f5b534277a71ddaa439ecd5576315ae94cf9cbdccf9333" eyebrow="A REAL PAYMENT ON OUR FISCO BCOS 3.16.4 NODE, CHAIN ID 20200, BLOCK 11" ok status="success" note="Every hosted-chain hash in this film is listed in ChainBrain-execution-evidence.pdf" /> : null}
      {/* the whole system */}
      {all > 0 ? (
        <div style={{ position: "absolute", left: 90, top: 40, opacity: all, fontFamily: F.display, fontWeight: 600, fontSize: 44, color: C.text }}>
          The whole system
        </div>
      ) : null}
    </Stage>
  );
};

// A real screen from the app, beside the board while the camera holds still.
const Inset: React.FC<{ name: string; w: number; x: number; y: number; t: number; from: number; to: number; label: string }> = ({ name, w, x, y, t, from, to, label }) => {
  if (t < from || t > to + 0.4) return null;
  const p = lit(t, from, 10) * (1 - clamp((t - to) / 0.4));
  const h = (w * DIM[name][1]) / DIM[name][0];
  return (
    <>
      <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2 - 36, width: w, fontFamily: F.mono, fontSize: 19, letterSpacing: "0.1em", color: C.muted, opacity: p, fontVariantLigatures: "none" }}>{label.toUpperCase()}</div>
      <UiCard name={name} w={w} x={x} y={y} p={p} from={[0, 30]} />
    </>
  );
};

// "Many agent wallets check their limits on a company's server. Here, the money itself asks the card."
const Contrast: React.FC<{ t: number; T: Record<string, number>; p: number }> = ({ t, T, p }) => {
  const left = lit(t, T.x6a, 10);
  const right = lit(t, T.x6 - 0.05, 10);
  const Mini: React.FC<{ label: string; tone?: string; hot?: boolean; k: number }> = ({ label, tone = "rgba(255,255,255,0.14)", hot, k }) => (
    <div style={{ flex: hot ? 1.7 : 1, height: 170, borderRadius: 20, background: hot ? `${tone}22` : "#15161A", boxShadow: `inset 0 0 0 ${hot ? 3 : 1.5}px ${hot ? tone : "rgba(255,255,255,0.12)"}`, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 12, boxSizing: "border-box", fontFamily: F.body, fontWeight: 600, fontSize: 29, color: hot ? C.text : C.muted, opacity: 0.4 + 0.6 * k, lineHeight: 1.2, whiteSpace: "pre-line" }}>
      {label}
    </div>
  );
  const Arrow = () => <div style={{ width: 30, height: 3, background: "rgba(255,255,255,0.3)", flex: "none" }} />;
  return (
    <AbsoluteFill style={{ opacity: p, background: "rgba(10,11,13,0.95)" }}>
      <div style={{ position: "absolute", left: 80, right: 80, top: 260, display: "flex", gap: 56 }}>
        <div style={{ flex: 1, opacity: 0.25 + 0.75 * left, transform: `translateY(${(1 - left) * 30}px)` }}>
          <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 62, color: C.muted, marginBottom: 40, height: 74 }}>Some agent wallets</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Mini label="AI agent" k={left} />
            <Arrow />
            <Mini label={"the company's server\nchecks the limit"} hot tone={C.muted} k={left} />
            <Arrow />
            <Mini label="money moves" k={left} />
          </div>
          <div style={{ marginTop: 34, fontFamily: F.mono, fontSize: 27, color: C.muted, fontVariantLigatures: "none" }}>checked before sending, off-chain</div>
        </div>
        <div style={{ width: 2, background: "rgba(255,255,255,0.1)" }} />
        <div style={{ flex: 1, opacity: 0.15 + 0.85 * right, transform: `translateY(${(1 - right) * 30}px)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 40, height: 74 }}>
            <BrandMark size={56} />
            <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 62, color: C.blue }}>ChainBrain</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Mini label="AI agent" k={right} />
            <Arrow />
            <Mini label="the token" k={right} />
            <Arrow />
            <Mini label={"asks the card,\non-chain"} hot tone={C.vermillion} k={right} />
          </div>
          <div style={{ marginTop: 34, fontFamily: F.mono, fontSize: 27, color: C.vermillion, fontVariantLigatures: "none" }}>checked as the money moves, on-chain</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─────────────── why it held: eight layers ───────────────
const LAYERS: { name: string; sub: string; icon: React.ReactNode; hits?: string[] }[] = [
  { name: "AI agent", sub: "can be fooled, holds no key", icon: <Bot size={28} /> },
  { name: "Content wrap and scan", sub: "seller text is data, never orders", icon: <ScanText size={28} />, hits: ["hidden order", "data request"] },
  { name: "Task check", sub: "the price and deadline you confirmed", icon: <ClipboardCheck size={28} /> },
  { name: "Radar", sub: "traces the seller's money", icon: <Radar size={28} />, hits: ["drainer seller"] },
  { name: "Sentinel", sub: "watches for a hijacked agent", icon: <Eye size={28} />, hits: ["repeated tries"] },
  { name: "Signing rule", sub: "signs only the exact live quote", icon: <PenLine size={28} /> },
  { name: "Card contract", sub: "8 checks, on-chain", icon: <FileLock2 size={28} />, hits: ["forced transfer", "fake admin"] },
  { name: "e-HKD token", sub: "each payment is exact and works once", icon: <Coins size={28} />, hits: ["replayed payment"] },
];

export const WhyHeld: React.FC = () => {
  const t = useT();
  const r = rel("why");
  const layersAt = r.word("y1", "eight");
  const sixAt = r.word("y1", "six");
  const lastAt = r.word("y2", "last");
  const takenAt = r.word("y2", "taken");
  const rowAt = (i: number) => (i < 6 ? layersAt + i * 0.18 : lastAt + (i - 6) * 0.25);
  const down = easeOut(clamp((t - takenAt + 0.2) / 0.5));
  const top = 180;
  const H = 78;
  const G = 8;
  return (
    <Stage>
      <div style={{ position: "absolute", left: 140, top: 50 }}>
        <Sequence from={Math.round(Math.max(0, r.vo("y1")) * 30)} layout="none">
          <Reveal text="Why it held." size={64} stagger={0.06} />
        </Sequence>
      </div>
      {LAYERS.map((l, i) => {
        const p = settle(t - rowAt(i), 11);
        const chain = i >= 6;
        const gone = !chain ? down : 0;
        const y = top + i * (H + G) + (chain ? 26 : 0);
        return (
          <React.Fragment key={l.name}>
            <div
              style={{
                position: "absolute",
                left: 140,
                top: y,
                width: 980,
                height: H,
                borderRadius: 16,
                background: chain ? (i === 6 ? "#050506" : "rgba(157,202,255,0.12)") : "#15161A",
                boxShadow: `0 0 0 1.5px ${chain ? (i === 6 ? C.vermillion : C.blue) : "rgba(255,255,255,0.12)"}${chain && t > takenAt ? `, 0 0 40px ${i === 6 ? "rgba(240,78,35,0.4)" : "rgba(157,202,255,0.35)"}` : ""}`,
                display: "flex",
                alignItems: "center",
                gap: 22,
                padding: "0 26px",
                boxSizing: "border-box",
                opacity: p * (1 - 0.7 * gone),
                transform: `translateY(${(1 - p) * 24}px)`,
                filter: gone ? `grayscale(${gone})` : undefined,
              }}
            >
              <div style={{ fontFamily: F.mono, fontSize: 22, color: C.faint, width: 22, fontVariantLigatures: "none" }}>{i + 1}</div>
              <div style={{ color: chain ? (i === 6 ? C.vermillion : C.blue) : C.muted, display: "flex", width: 32 }}>{l.icon}</div>
              <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 30, color: C.text, width: 350 }}>{l.name}</div>
              <div style={{ fontFamily: F.body, fontWeight: 500, fontSize: 23, color: C.muted }}>{l.sub}</div>
            </div>
            {l.hits?.map((h, j) => {
              const k = settle(t - rowAt(i) - 0.35 - j * 0.2, 12);
              return (
                <div
                  key={h}
                  style={{
                    position: "absolute",
                    left: 1160 + j * 290,
                    top: y + 20,
                    height: 46,
                    padding: "0 18px",
                    borderRadius: 23,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "rgba(240,78,35,0.14)",
                    boxShadow: `inset 0 0 0 1.5px ${C.vermillion}`,
                    fontFamily: F.mono,
                    fontSize: 21,
                    color: C.vermillion,
                    opacity: k * (1 - 0.6 * gone),
                    transform: `translateX(${(1 - k) * 60}px)`,
                    fontVariantLigatures: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Badge kind="no" size={24} />
                  {h}
                </div>
              );
            })}
          </React.Fragment>
        );
      })}
      {/* brackets */}
      <Bracket x={110} y1={top} y2={top + 6 * (H + G) - G} label="on our server, keeps the agent in line" color={C.blue} p={lit(t, sixAt)} struck={down} />
      <Bracket x={110} y1={top + 6 * (H + G) + 26} y2={top + 8 * (H + G) + 26 - G} label="on-chain, holds without our server" color={C.vermillion} p={lit(t, lastAt + 0.3)} />
      {down > 0 ? (
        <div style={{ position: "absolute", left: 160, top: top + 3 * (H + G) - 30, padding: "10px 24px", borderRadius: 12, background: C.vermillion, color: "#fff", fontFamily: F.display, fontWeight: 600, fontSize: 40, transform: `rotate(-4deg) scale(${0.9 + 0.1 * down})`, opacity: down, boxShadow: "0 20px 50px rgba(240,78,35,0.4)" }}>
          even if our server is taken over
        </div>
      ) : null}
    </Stage>
  );
};

const Bracket: React.FC<{ x: number; y1: number; y2: number; label: string; color: string; p: number; struck?: number }> = ({ x, y1, y2, label, color, p, struck = 0 }) => (
  <div style={{ position: "absolute", left: x - 10, top: y1, height: y2 - y1, width: 8, borderLeft: `3px solid ${color}`, borderTop: `3px solid ${color}`, borderBottom: `3px solid ${color}`, opacity: p * (1 - 0.6 * struck) }}>
    <div style={{ position: "absolute", left: 30, top: -40, whiteSpace: "nowrap", fontFamily: F.mono, fontSize: 19, color, letterSpacing: "0.08em", fontVariantLigatures: "none" }}>{label.toUpperCase()}</div>
  </div>
);

// ─────────────── if a key is stolen ───────────────
const STOLEN: { icon: React.ReactNode; title: string; verdict: string; word: [string, string, number] | null; owner?: boolean }[] = [
  { icon: <KeyRound size={40} />, title: "Agent key stolen", verdict: "only listed sellers, up to the cap", word: ["y3", "stolen", 0] },
  { icon: <Server size={40} />, title: "Our server taken", verdict: "the card still checks every payment", word: null },
  { icon: <Snowflake size={40} />, title: "Guardian key", verdict: "can only freeze a card", word: ["y3", "guardian", 0] },
  { icon: <Smartphone size={40} />, title: "Your owner key", verdict: "never leaves your phone", word: ["y3", "your", 1], owner: true },
];

export const Stolen: React.FC = () => {
  const t = useT();
  const r = rel("stolen");
  return (
    <Stage>
      <div style={{ position: "absolute", left: 120, top: 150 }}>
        <Reveal text="If a key is stolen" size={84} stagger={0.06} />
      </div>
      <div style={{ position: "absolute", left: 120, right: 120, top: 380, display: "flex", gap: 30 }}>
        {STOLEN.map((s) => {
          const at = s.word ? r.word(s.word[0], s.word[1], s.word[2]) - 0.1 : 0.25;
          const k = settle(t - at, 10);
          const col = s.owner ? C.vermillion : C.blue;
          return (
            <div
              key={s.title}
              style={{
                flex: 1,
                height: 380,
                borderRadius: 24,
                background: s.owner ? "#050506" : "#15161A",
                boxShadow: `0 0 0 ${1.5 + k}px ${k > 0.05 ? col : "rgba(255,255,255,0.10)"}, 0 30px 70px rgba(0,0,0,0.5), 0 0 ${40 * k}px ${col}33`,
                padding: "34px 30px",
                boxSizing: "border-box",
                opacity: 0.3 + 0.7 * k,
                transform: `translateY(${(1 - k) * 30}px)`,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ color: k > 0.05 ? col : C.muted }}>{s.icon}</div>
              <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 36, color: C.text, marginTop: 30 }}>{s.title}</div>
              <div style={{ flex: 1 }} />
              <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 38, lineHeight: 1.1, color: col, letterSpacing: "-0.01em" }}>{s.verdict}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 120, top: 820, fontFamily: F.mono, fontSize: 21, color: C.muted, opacity: settle(t - 1.0, 6), fontVariantLigatures: "none" }}>
        Agent keys are derived on our server, one per card. The guardian key belongs to the Sentinel. Your owner key stays in the phone's Keychain or Keystore.
      </div>
    </Stage>
  );
};

// ─────────────── HKMA: four principles ───────────────
const PRINCIPLES: { name: string; ours: string; word: string }[] = [
  { name: "Anchored to intent", ours: "every payment traces back to the task you confirmed", word: "intent" },
  { name: "Kill-switches", ours: "freeze or cancel a card, on-chain", word: "kill" },
  { name: "A.I. versus A.I.", ours: "a second AI watches the agent", word: "versus" },
  { name: "Secure boundaries", ours: "the card's own contract sets the limits", word: "boundaries" },
];

export const Hkma: React.FC = () => {
  const t = useT();
  const r = rel("hkma");
  const four = r.word("h2", "four");
  return (
    <Stage>
      <div style={{ position: "absolute", left: 120, top: 80, display: "flex", alignItems: "center", gap: 18, opacity: settle(t - 0.2, 8) }}>
        <div style={{ width: 10, height: 10, background: C.blue }} />
        <div style={{ fontFamily: F.mono, fontSize: 22, letterSpacing: "0.12em", color: C.muted, fontVariantLigatures: "none" }}>HKMA FINANCE + A.I. FORUM, 16 OCT 2026</div>
      </div>
      <div style={{ position: "absolute", left: 120, top: 120, maxWidth: 1560, fontFamily: F.body, fontWeight: 500, fontSize: 24, lineHeight: 1.35, color: C.muted, opacity: settle(t - 0.5, 8) }}>
        Remarks by Carmen Chu, Executive Director (Banking Supervision), on governing AI agents under the HKMA’s ART framework (Accountability, Resilience, Trust)
      </div>
      <div style={{ position: "absolute", left: 120, right: 120, top: 280, transform: `scale(${1 + 0.02 * clamp(t / 17)})`, transformOrigin: "left top" }}>
        {PRINCIPLES.map((p) => {
          const at = r.word("h1", p.word) - 0.1;
          const k = settle(t - at, 10);
          const done = settle(t - four - 0.1, 12);
          return (
            <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 40, padding: "31px 0", borderTop: `1.5px solid rgba(255,255,255,${0.1 * k})`, opacity: 0.15 + 0.85 * k, transform: `translateX(${(1 - k) * -30}px)` }}>
              <div style={{ width: 560, fontFamily: F.display, fontWeight: 600, fontSize: 60, letterSpacing: "-0.02em", color: C.text }}>{p.name}</div>
              <Badge kind="ok" size={54} on={done} />
              <div style={{ flex: 1, fontFamily: F.body, fontWeight: 500, fontSize: 32, color: k > 0.5 ? C.blue : C.muted, lineHeight: 1.25 }}>{p.ours}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 120, right: 120, top: 832, fontFamily: F.mono, fontSize: 24, lineHeight: 1.35, color: C.muted, opacity: settle(t - 0.6, 6), fontVariantLigatures: "none" }}>
        Our mapping of four ideas from the speech. Not an HKMA statement, approval or assessment of ChainBrain. Source: hkma.gov.hk, 16 Oct 2026.
      </div>
    </Stage>
  );
};
