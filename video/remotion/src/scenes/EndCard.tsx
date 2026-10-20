import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { CodeXml, Globe } from "lucide-react";
import { AICard, CARD_RATIO, type Agent } from "../components/AICard";
import { BrandMark } from "../components/BrandMark";
import { Stage } from "../components/Stage";
import { C, F, clamp, easeInOut, easeOut, settle } from "../theme";

// The closing card after the last line on camera: the three AI Cards (Claude's, ours, ChatGPT's) fly in and fan out
// over a faint constellation; threads of light run from each card down to the ChainBrain mark (the Brain watching every
// card), with light travelling along them; on the lock-in the mark lands with a bloom and a vermillion ring; then where
// to try it. A light sweeps the cards twice. Only our card is on the hosted chain, so only it prints an address; Claude's
// and ChatGPT's cards run on the demo network. Fades to black at the end.
const CARDS: { agent: Agent; addr: string; limit: string; x: number; y: number; w: number; ry: number; rz: number; from: [number, number]; delay: number }[] = [
  { agent: { name: "Claude", src: "brand/claude-spark-clay.png", imgScale: 0.62 }, addr: "", limit: "", x: 560, y: 352, w: 540, ry: 15, rz: -3, from: [-660, 160], delay: 0 },
  { agent: { name: "Ours" }, addr: "0x33Dc ···· 3356", limit: "HK$15.00 per payment", x: 960, y: 228, w: 600, ry: 0, rz: 0, from: [0, 380], delay: 0.16 },
  { agent: { name: "ChatGPT", src: "brand/openai-blossom-black.png", imgScale: 0.6 }, addr: "", limit: "", x: 1360, y: 352, w: 540, ry: -15, rz: 3, from: [660, 160], delay: 0.08 },
];
const MARK: [number, number] = [960, 640]; // the lockup's centre; the threads end just above it
const LOCK = 0.75; // the mark locks in

// a fixed, seeded field of faint stars, and the short lines between near neighbours
const STARS = (() => {
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const pts = Array.from({ length: 64 }, () => ({ x: 40 + rnd() * 1840, y: 30 + rnd() * 1000, r: 1.2 + rnd() * 1.8, a: 0.18 + rnd() * 0.36, ph: rnd() * 6.28, z: 0.4 + rnd() * 0.6 }));
  const lines: [number, number][] = [];
  pts.forEach((p, i) => pts.forEach((q, j) => { if (j > i && Math.hypot(p.x - q.x, p.y - q.y) < 150) lines.push([i, j]); }));
  return { pts, lines };
})();

export const CardConstellation: React.FC<{ len: number }> = ({ len }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const out = 1 - easeOut(clamp((t - (len - 0.5)) / 0.5)); // fade to black over the last half second
  const push = 1 + 0.06 * easeInOut(clamp(t / len));
  const lock = settle(t - LOCK, 8);
  const bloom = clamp((t - LOCK) / 0.45);
  const ring = clamp((t - LOCK) / 0.9);
  const rise = 8 * easeInOut(clamp((t - 1.6) / (len - 1.6))); // the cards lift a little over the hold
  const drift = t * 6; // the constellation drifts behind (px)
  const star = (p: { x: number; y: number; z: number }) => ({ x: p.x - drift * p.z, y: p.y });
  return (
    <Stage>
      <AbsoluteFill style={{ opacity: out, transform: `scale(${push})` }}>
        {/* a soft light behind the arc of cards, there from the first frame */}
        <div style={{ position: "absolute", left: 160, top: -60, width: 1600, height: 760, background: "radial-gradient(ellipse at 50% 55%, rgba(157,202,255,0.30), rgba(157,202,255,0.07) 45%, transparent 70%)", opacity: 0.55 + 0.45 * easeOut(clamp(t / 1.0)) }} />
        {/* the constellation behind */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: 0.4 + 0.6 * easeOut(clamp(t / 1.0)) }}>
          {STARS.lines.map(([i, j]) => {
            const a = star(STARS.pts[i]);
            const b = star(STARS.pts[j]);
            return <line key={`${i}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(157,202,255,0.18)" strokeWidth={1} />;
          })}
          {STARS.pts.map((p, i) => {
            const q = star(p);
            return <circle key={i} cx={q.x} cy={q.y} r={p.r} fill={`rgba(242,241,238,${Math.min(0.95, p.a * 1.7) * (0.75 + 0.25 * Math.sin(t * 1.6 + p.ph))})`} />;
          })}
          {/* threads from each card to the mark, lit, with light running down each */}
          {CARDS.map((c, i) => {
            const h = c.w * CARD_RATIO;
            const x1 = c.x;
            const y1 = c.y + h / 2 - 8 - rise;
            const x2 = MARK[0] + (i - 1) * 34;
            const y2 = MARK[1] - 62;
            const len2 = Math.hypot(x2 - x1, y2 - y1);
            const draw = easeOut(clamp((t - 0.55 - i * 0.08) / 0.55));
            return (
              <g key={i} style={{ filter: "drop-shadow(0 0 8px rgba(157,202,255,0.8))" }}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(157,202,255,0.7)" strokeWidth={2.6} strokeDasharray={len2} strokeDashoffset={len2 * (1 - draw)} />
                {t > 1.1
                  ? [0, 1, 2].map((k) => {
                      const u = ((((t - 1.1 - i * 0.13 - k * 0.3) % 0.9) + 0.9) % 0.9) / 0.9;
                      const tail = Math.min(70, len2 * u) / len2;
                      const ax = x1 + (x2 - x1) * u;
                      const ay = y1 + (y2 - y1) * u;
                      const bx = x1 + (x2 - x1) * (u - tail);
                      const by = y1 + (y2 - y1) * (u - tail);
                      return (
                        <g key={k} opacity={Math.sin(Math.PI * u)}>
                          <line x1={bx} y1={by} x2={ax} y2={ay} stroke="rgba(157,202,255,0.55)" strokeWidth={5} strokeLinecap="round" />
                          <circle cx={ax} cy={ay} r={7} fill={C.blue} />
                        </g>
                      );
                    })
                  : null}
              </g>
            );
          })}
        </svg>
        {/* the three cards, fanned, the middle one in front */}
        {CARDS.map((c, i) => {
          const h = c.w * CARD_RATIO;
          const p = settle(t - c.delay, 8.5);
          const bob = Math.sin(t * 1.25 + i * 1.7) * 5 * clamp(t - 1.2);
          const sweep1 = clamp((t - 1.0 - i * 0.12) / 0.8);
          const sweep2 = clamp((t - 3.6 - i * 0.12) / 0.9);
          const sweep = sweep1 > 0 && sweep1 < 1 ? sweep1 : sweep2;
          return (
            <div
              key={c.agent.name}
              style={{
                position: "absolute",
                left: c.x - c.w / 2,
                top: c.y - h / 2,
                opacity: clamp(p * 1.6),
                transform: `translate(${(1 - p) * c.from[0]}px, ${(1 - p) * c.from[1] + bob - rise}px) scale(${0.86 + 0.14 * p})`,
                zIndex: i === 1 ? 3 : 1,
              }}
            >
              <AICard w={c.w} agent={c.agent} addr={c.addr} limit={c.limit} ry={c.ry + (1 - p) * (c.ry >= 0 ? 55 : -55) * (i === 1 ? 0 : 1)} rx={(1 - p) * 38 + 4} rz={c.rz * p} glow={0.45 + 0.55 * lock} sweep={sweep} />
            </div>
          );
        })}
        {/* the lock-in: a bloom behind the mark and a vermillion ring going out */}
        <div style={{ position: "absolute", left: MARK[0] - 360, top: MARK[1] - 150, width: 720, height: 300, background: "radial-gradient(ellipse at center, rgba(157,202,255,0.18), transparent 65%)", opacity: lock }} />
        {bloom > 0 && bloom < 1 ? (
          <div style={{ position: "absolute", left: MARK[0] - 420, top: MARK[1] - 200, width: 840, height: 400, background: "radial-gradient(ellipse at center, rgba(242,246,255,0.5), rgba(157,202,255,0.2) 35%, transparent 70%)", opacity: 1 - bloom }} />
        ) : null}
        {ring > 0 && ring < 1 ? (
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
            <ellipse cx={MARK[0]} cy={MARK[1]} rx={70 + 270 * easeOut(ring)} ry={(70 + 270 * easeOut(ring)) * 0.42} fill="none" stroke={C.vermillion} strokeWidth={3} opacity={0.6 * (1 - ring)} />
          </svg>
        ) : null}
        <div style={{ position: "absolute", left: 0, right: 0, top: MARK[1] - 48, display: "flex", justifyContent: "center", alignItems: "center", gap: 26, opacity: clamp(lock * 1.4), transform: `translateY(${(1 - lock) * 18}px) scale(${1 + 0.08 * (1 - clamp((t - LOCK) / 0.5))})` }}>
          <BrandMark size={96} t={t - LOCK + 0.1} />
          <div style={{ position: "relative", fontFamily: F.display, fontWeight: 600, fontSize: 80, color: C.text, letterSpacing: "-0.01em", overflow: "hidden" }}>
            ChainBrain
            {/* a shine across the wordmark in the hold */}
            {t > 3.9 && t < 4.7 ? (
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(110deg, transparent ${-40 + ((t - 3.9) / 0.8) * 180}%, rgba(255,255,255,0.55) ${-25 + ((t - 3.9) / 0.8) * 180}%, transparent ${-10 + ((t - 3.9) / 0.8) * 180}%)`, mixBlendMode: "overlay" }} />
            ) : null}
          </div>
          <div style={{ fontFamily: F.cjk, fontWeight: 700, fontSize: 42, color: C.muted }}>链AI脑</div>
        </div>
        {/* where to try it */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 758, display: "flex", justifyContent: "center", opacity: settle(t - 1.4, 7) }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { icon: <Globe size={32} />, label: "Try it", value: "fisco-web-production.up.railway.app" },
              { icon: <CodeXml size={32} />, label: "Code", value: "github.com/ixgnoy/ChainBrain" },
            ].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ color: C.blue, display: "flex" }}>{l.icon}</div>
                <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 30, color: C.muted, width: 84 }}>{l.label}</div>
                <div style={{ fontFamily: F.mono, fontSize: 34, color: C.text, fontVariantLigatures: "none" }}>{l.value}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 934, textAlign: "center", fontFamily: F.body, fontWeight: 500, fontSize: 26, color: C.muted, opacity: settle(t - 1.8, 7) }}>
          FinTechathon 2026, International AI Track, Topic F
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
