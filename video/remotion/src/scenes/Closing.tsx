import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Badge } from "../components/Badge";
import { Stage } from "../components/Stage";
import { C, F, clamp, easeOut, settle } from "../theme";

// The drop: one huge line, centred inside the frame, on a warm stage.
export const ActTitle: React.FC<{ title: string }> = ({ title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const p = settle(t - 0.04, 12);
  const rule = easeOut(clamp((t - 0.05) / 0.35));
  return (
    <Stage tint={1}>
      <AbsoluteFill>
        <div style={{ position: "absolute", left: 960 - 840 * rule, top: 330, width: 1680 * rule, height: 4, background: C.vermillion }} />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 390,
            textAlign: "center",
            fontFamily: F.display,
            fontWeight: 600,
            fontSize: 230,
            lineHeight: 0.92,
            letterSpacing: "-0.04em",
            color: C.text,
            whiteSpace: "nowrap",
            clipPath: `inset(0 ${100 - p * 100}% 0 0)`,
          }}
        >
          {title}
        </div>
      </AbsoluteFill>
    </Stage>
  );
};

// The four attacks the judges score (prompt injection, data extraction, privilege escalation, induced transfer), in
// plain words; each is marked blocked as it is shown.
export const ATTACKS = ["hidden orders", "data requests", "fake admin", "forced payment"];
// the judging rubric's own name for each (Security & Compliance, 30%), small under the plain words
export const RUBRIC = ["prompt injection", "data extraction", "privilege escalation", "induced transfer"];
export const AttackRail: React.FC<{ active: number; done: number }> = ({ active, done }) => (
  <div style={{ position: "absolute", left: 120, top: 640, display: "flex", flexDirection: "column", gap: 10 }}>
    {ATTACKS.map((a, i) => {
      const isDone = i < done;
      const isOn = i === active;
      return (
        <div key={a}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: F.body, fontWeight: 600, fontSize: 24, color: isOn ? C.text : isDone ? C.vermillion : C.faint }}>
            {isDone ? <Badge kind="no" size={24} /> : <div style={{ width: 24, height: 3, background: isOn ? C.vermillion : "rgba(255,255,255,0.14)" }} />}
            {a}
            <span style={{ fontFamily: F.mono, fontSize: 18, color: C.vermillion, opacity: isDone ? 1 : 0 }}>blocked</span>
          </div>
          <div style={{ marginLeft: 38, marginTop: 2, fontFamily: F.mono, fontSize: 22, letterSpacing: "0.04em", color: isOn || isDone ? "#B4B5BC" : C.muted, fontVariantLigatures: "none" }}>{RUBRIC[i]}</div>
        </div>
      );
    })}
  </div>
);
