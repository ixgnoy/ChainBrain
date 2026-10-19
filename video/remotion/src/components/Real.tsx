import React from "react";
import { Img, Sequence, staticFile, useVideoConfig } from "remotion";
import { Reveal } from "./Kinetic";
import { C, F, settle } from "../theme";

// Real material for the story scenes: crops of the app's own screens (tools/crops.py), brand marks as app-icon
// tiles, plain mono captions and masked headlines.

// crop sizes (px) from tools/crops.py
export const DIM: Record<string, [number, number]> = {
  wallet: [1123, 548], card: [928, 571], rules: [1122, 406], paid: [1122, 640], question: [1122, 341], haggle: [1122, 556],
  radar: [1122, 849], "sentinel-ok": [1122, 534], blocked: [1122, 435], preflight: [1122, 194], remembers: [1122, 538],
  brainmap: [1206, 1180], "ex-success": [1250, 533], "ex-transfer": [1514, 167], cheque: [1098, 1442], stack: [1123, 1049], slide: [1122, 236], sentinel: [1122, 661], guarded: [1122, 902], "ex-reverted": [1250, 533],
};

export const pop = (t: number, at: number, w = 11) => settle(t - at, w);

// A real piece of the app, floating on the stage with depth. (x, y) is its centre; w its width.
export const UiCard: React.FC<{
  name: string;
  w: number;
  x: number;
  y: number;
  p: number;
  from?: [number, number];
  rot?: number;
  ry?: number;
  tone?: string;
  dim?: number;
  scale?: number;
}> = ({ name, w, x, y, p, from = [0, 60], rot = 0, ry = 0, tone, dim = 0, scale = 1 }) => {
  const [iw, ih] = DIM[name];
  const h = (w * ih) / iw;
  const dark = name === "brainmap";
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, perspective: 1800 }}>
      <div
        style={{
          width: w,
          height: h,
          borderRadius: 24,
          overflow: "hidden",
          background: dark ? "#0B0C0F" : C.canvas,
          boxShadow: `0 40px 90px rgba(0,0,0,0.55), 0 0 0 ${tone ? 3 : 1}px ${tone ?? "rgba(255,255,255,0.10)"}`,
          opacity: p * (1 - dim * 0.75),
          transform: `translate(${from[0] * (1 - p)}px, ${from[1] * (1 - p)}px) rotate(${rot * (1 - p * 0.6)}deg) rotateY(${ry}deg) scale(${(0.94 + 0.06 * p) * scale})`,
        }}
      >
        <Img src={staticFile(`ui/crops/${name}.png`)} style={{ width: "100%", height: "100%", display: "block" }} />
      </div>
    </div>
  );
};

// A real brand mark as an app-icon tile.
export const Tile: React.FC<{ src?: string; bg: string; size: number; pad?: number; p: number; label: string; children?: React.ReactNode }> = ({ src, bg, size, pad = 0.2, p, label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, opacity: p, transform: `translateY(${(1 - p) * 24}px)` }}>
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.24,
        background: bg,
        boxShadow: "0 20px 44px rgba(0,0,0,0.5), inset 0 0 0 1.5px rgba(255,255,255,0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {src ? <Img src={staticFile(src)} style={{ width: size * (1 - pad * 2), height: size * (1 - pad * 2), objectFit: "contain" }} /> : children}
    </div>
    <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 22, color: C.muted }}>{label}</div>
  </div>
);

export const Cap: React.FC<{ text: string; tone?: string; p: number; x: number; y: number; align?: "left" | "center" }> = ({ text, tone = C.blue, p, x, y, align = "left" }) => (
  <div
    style={{
      position: "absolute",
      left: align === "center" ? x - 600 : x,
      width: align === "center" ? 1200 : undefined,
      top: y,
      display: "flex",
      justifyContent: align === "center" ? "center" : "flex-start",
      alignItems: "center",
      gap: 16,
      opacity: p,
    }}
  >
    <div style={{ width: 40 * p, height: 3, background: tone }} />
    <div style={{ fontFamily: F.mono, fontSize: 26, color: tone, fontVariantLigatures: "none", whiteSpace: "nowrap" }}>{text}</div>
  </div>
);

export const Head: React.FC<{ base: number; text: string; at: number; t: number; x?: number; y?: number; size?: number; highlight?: Record<string, string> }> = ({ base, text, at, t, x = 120, y = 300, size = 92, highlight }) => {
  if (t < at) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      <Clock base={base} offset={at}>
        <Reveal text={text} size={size} stagger={0.045} highlight={highlight} />
      </Clock>
    </div>
  );
};

// Re-bases Reveal's own clock so a headline animates from its `offset` (absolute seconds).
const Clock: React.FC<{ base: number; offset: number; children: React.ReactNode }> = ({ base, offset, children }) => {
  const { fps } = useVideoConfig();
  return (
    <Sequence from={Math.round((offset - base) * fps)} layout="none">
      {children}
    </Sequence>
  );
};


// A third-party mark the way the app shows it: a small round avatar with a hairline ring, the name beside it.
export const Avatar: React.FC<{ src?: string; name: string; sub?: string; p: number; size?: number; imgScale?: number; bg?: string; children?: React.ReactNode }> = ({
  src,
  name,
  sub,
  p,
  size = 76,
  imgScale = 0.58,
  bg = "#FFFFFF",
  children,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 18, opacity: p, transform: `translateY(${(1 - p) * 18}px)` }}>
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: bg,
        boxShadow: "0 12px 28px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(17,18,21,0.10), 0 0 0 1.5px rgba(255,255,255,0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        flex: "none",
      }}
    >
      {src ? <Img src={staticFile(src)} style={{ width: size * imgScale, height: size * imgScale, objectFit: "contain" }} /> : children}
    </div>
    <div>
      <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 30, color: C.text, lineHeight: 1.1 }}>{name}</div>
      {sub ? <div style={{ fontFamily: F.mono, fontSize: 20, color: C.muted, marginTop: 4, fontVariantLigatures: "none" }}>{sub}</div> : null}
    </div>
  </div>
);

// An official logo on a white plaque (for marks drawn for light backgrounds: FISCO BCOS, x402).
export const Plaque: React.FC<{ src: string; h: number; p: number; pad?: number }> = ({ src, h, p, pad = 18 }) => (
  <div
    style={{
      display: "inline-flex",
      padding: `${pad}px ${pad * 1.5}px`,
      borderRadius: 16,
      background: "#FFFFFF",
      boxShadow: "0 18px 40px rgba(0,0,0,0.5)",
      opacity: p,
      transform: `translateY(${(1 - p) * 16}px)`,
    }}
  >
    <Img src={staticFile(src)} style={{ height: h, width: "auto", display: "block" }} />
  </div>
);
