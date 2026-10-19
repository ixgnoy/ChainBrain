import React from "react";
import { Img, staticFile } from "remotion";
import { BrandMark } from "./BrandMark";
import { C, F } from "../theme";

// The AI Card: the product's idea as one object. Front: the agent it belongs to, its contract address tail and its
// limit. Back: the rules its smart contract enforces (the hosted-chain proof card, docs/redteam/hosted-proof.json).
export type Agent = { name: string; src?: string; imgScale?: number };

export const CARD_RATIO = 0.63;
export const RULES: [string, string][] = [
  ["Spending limit", "HK$15.00"],
  ["Ask me above", "HK$8.00"],
  ["Sellers", "DataLite · DataPro"],
  ["Freeze · cancel", "only you"],
];

export const AICard: React.FC<{
  w: number;
  agent?: Agent;
  flip?: number; // 0 front … 1 back
  ry?: number;
  rx?: number;
  rz?: number;
  glow?: number; // powder-blue edge light, 0..1
  alarm?: number; // vermillion edge, 0..1
  limit?: string;
  dim?: number;
}> = ({ w, agent, flip = 0, ry = 0, rx = 0, rz = 0, glow = 0.35, alarm = 0, limit = "HK$15.00 limit", dim = 0 }) => {
  const h = w * CARD_RATIO;
  const u = w / 100; // 1% of the card's width
  const edge = alarm > 0 ? `rgba(240,78,35,${0.4 + 0.6 * alarm})` : `rgba(157,202,255,${0.18 + 0.5 * glow})`;
  const face: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    borderRadius: u * 5,
    overflow: "hidden",
    backfaceVisibility: "hidden",
    background: "linear-gradient(140deg, #22242A 0%, #131418 48%, #1B1D22 100%)",
    boxShadow: `0 0 0 ${Math.max(1.5, u * 0.25)}px ${edge}, 0 ${u * 6}px ${u * 14}px rgba(0,0,0,0.6), 0 0 ${u * 10 * (glow + alarm)}px ${alarm > 0 ? "rgba(240,78,35,0.45)" : "rgba(157,202,255,0.22)"}`,
  };
  return (
    <div style={{ width: w, height: h, perspective: w * 4 }}>
      <div
        style={{
          position: "relative",
          width: w,
          height: h,
          transformStyle: "preserve-3d",
          transform: `rotateX(${rx}deg) rotateY(${ry + flip * 180}deg) rotateZ(${rz}deg)`,
          filter: dim ? `brightness(${1 - dim * 0.55})` : undefined,
        }}
      >
        {/* front */}
        <div style={face}>
          <Sheen u={u} />
          <div style={{ position: "absolute", left: u * 6, top: u * 6, display: "flex", alignItems: "center", gap: u * 2.4 }}>
            <BrandMark size={u * 7} />
            <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: u * 4.4, color: C.text, letterSpacing: "-0.01em" }}>ChainBrain</div>
          </div>
          <div style={{ position: "absolute", right: u * 6, top: u * 7, fontFamily: F.mono, fontSize: u * 3, color: C.blue, letterSpacing: "0.18em", fontVariantLigatures: "none" }}>AI CARD</div>
          <Chip u={u} />
          <div style={{ position: "absolute", left: u * 6, bottom: u * 15, fontFamily: F.mono, fontSize: u * 4.2, color: C.text, letterSpacing: "0.06em", fontVariantLigatures: "none" }}>0x33Dc ···· 3356</div>
          <div style={{ position: "absolute", left: u * 6, bottom: u * 7, fontFamily: F.body, fontWeight: 500, fontSize: u * 3.1, color: C.muted }}>{limit}</div>
          {agent ? (
            <div style={{ position: "absolute", right: u * 6, bottom: u * 6.5, display: "flex", alignItems: "center", gap: u * 2 }}>
              <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: u * 3.4, color: C.text }}>{agent.name}</div>
              <div style={{ width: u * 9, height: u * 9, borderRadius: u * 4.5, background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {agent.src ? <Img src={staticFile(agent.src)} style={{ width: u * 9 * (agent.imgScale ?? 0.6), height: u * 9 * (agent.imgScale ?? 0.6), objectFit: "contain" }} /> : <BrandMark size={u * 5} light={false} />}
              </div>
            </div>
          ) : null}
        </div>
        {/* back: the contract's rules */}
        <div style={{ ...face, transform: "rotateY(180deg)" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: u * 7, height: u * 9, background: "#0A0B0D" }} />
          <div style={{ position: "absolute", left: u * 6, top: u * 20, fontFamily: F.mono, fontSize: u * 2.8, color: C.blue, letterSpacing: "0.14em", fontVariantLigatures: "none" }}>
            SMART CONTRACT · FISCO BCOS
          </div>
          <div style={{ position: "absolute", left: u * 6, right: u * 6, top: u * 27 }}>
            {RULES.map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: `${u * 1.7}px 0`, borderTop: "1px solid rgba(255,255,255,0.09)" }}>
                <div style={{ fontFamily: F.body, fontWeight: 500, fontSize: u * 3.5, color: C.muted }}>{k}</div>
                <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: u * 3.5, color: C.text }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Chip: React.FC<{ u: number }> = ({ u }) => (
  <div
    style={{
      position: "absolute",
      left: u * 6,
      top: u * 22,
      width: u * 11,
      height: u * 8.4,
      borderRadius: u * 1.6,
      background: "linear-gradient(135deg, #5B5D66 0%, #2E3036 55%, #45474F 100%)",
      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)",
    }}
  >
    <div style={{ position: "absolute", left: "33%", top: 0, bottom: 0, width: 1, background: "rgba(0,0,0,0.35)" }} />
    <div style={{ position: "absolute", left: "66%", top: 0, bottom: 0, width: 1, background: "rgba(0,0,0,0.35)" }} />
    <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "rgba(0,0,0,0.35)" }} />
  </div>
);

// A faint diagonal light across the face (the card's material, not a decoration that moves on its own).
const Sheen: React.FC<{ u: number }> = ({ u }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: `linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.05) 42%, transparent 54%)`,
      borderRadius: u * 5,
    }}
  />
);
