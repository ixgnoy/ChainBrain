import React from "react";
import { OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Stage } from "../components/Stage";
import { C, F, FPS, clamp, easeInOut, settle } from "../theme";
import { SimTag } from "./PhoneScene";

export type Zoom = { t: number; s: number; fx: number; fy: number };

function zoomAt(z: Zoom[], t: number): Zoom {
  if (z.length === 0) return { t: 0, s: 1, fx: 0.5, fy: 0.5 };
  if (t <= z[0].t) return z[0];
  for (let i = 0; i < z.length - 1; i++) {
    const a = z[i];
    const b = z[i + 1];
    if (t < b.t) {
      const k = easeInOut(clamp((t - (b.t - 0.9)) / 0.9));
      return { t, s: a.s + (b.s - a.s) * k, fx: a.fx + (b.fx - a.fx) * k, fy: a.fy + (b.fy - a.fy) * k };
    }
  }
  return z[z.length - 1];
}

// A console recording in a browser window, with optional push-ins inside the window.
export const BrowserScene: React.FC<{
  src: string;
  from: number;
  rate?: number;
  label: string;
  labelColor?: string;
  url: string;
  zooms?: Zoom[];
  tint?: number;
  sim?: boolean;
}> = ({ src, from, rate = 1, label, labelColor, url, zooms = [], tint = 0, sim = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const z = zoomAt(zooms, t);
  const enter = settle(t - 0.02, 7);
  const W = 1500;
  const Hc = W * (1080 / 1920);
  return (
    <Stage tint={tint}>
      <div style={{ position: "absolute", left: 210, top: 46, fontFamily: F.body, fontWeight: 600, fontSize: 24, color: labelColor ?? C.muted, opacity: settle(t - 0.05, 9) }}>
        {label}
      </div>
      {sim ? <SimTag what="Console" style={{ left: "auto", right: 210, top: 42 }} /> : null}
      <div
        style={{
          position: "absolute",
          left: (1920 - W) / 2,
          top: 100,
          width: W,
          borderRadius: 18,
          overflow: "hidden",
          background: "#1C1D22",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 40px 120px rgba(0,0,0,0.6)",
          opacity: enter,
          transform: `translateY(${(1 - enter) * 40}px)`,
        }}
      >
        <div style={{ height: 40, display: "flex", alignItems: "center", gap: 9, padding: "0 18px" }}>
          <div
            style={{
              flex: 1,
              height: 26,
              borderRadius: 8,
              background: "rgba(255,255,255,0.06)",
              color: C.muted,
              fontFamily: F.body,
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              padding: "0 14px",
            }}
          >
            {url}
          </div>
        </div>
        <div style={{ width: W, height: Hc, overflow: "hidden", position: "relative", background: "#fff" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              transformOrigin: `${z.fx * 100}% ${z.fy * 100}%`,
              transform: `scale(${z.s})`,
            }}
          >
            <OffthreadVideo src={staticFile(src)} trimBefore={Math.round(from * FPS)} playbackRate={rate} muted style={{ width: "100%", height: "100%" }} />
          </div>
        </div>
      </div>
    </Stage>
  );
};
