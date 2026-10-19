import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Eyebrow, Reveal } from "../components/Kinetic";
import { Stage } from "../components/Stage";
import { C, F, FPS, clamp, easeInOut, settle } from "../theme";

export type Seg = { src: string; from: number; to: number; rate?: number }; // footage seconds [from, to)
export type Cam = { t: number; s: number; fx: number; fy: number }; // scene time (s), scale, focus x/y on the screen (0..1)
export type Beat = { t: number; head: string; sub?: string; chip?: { text: string; tone: "red" | "blue" | "plain" } };

export const PH = 860; // phone screen height on the stage
export const PW = PH * (1206 / 2622);
const PX = 1190; // phone screen left
const PY = 46;
const BEZ = PW * 0.034;
const R = PW * 0.14;

export const segLen = (s: Seg) => (s.to - s.from) / (s.rate ?? 1);

function camAt(cams: Cam[], t: number): Cam {
  if (cams.length === 0) return { t: 0, s: 1, fx: 0.5, fy: 0.5 };
  if (t <= cams[0].t) return cams[0];
  for (let i = 0; i < cams.length - 1; i++) {
    const a = cams[i];
    const b = cams[i + 1];
    if (t < b.t) {
      // each keyframe is where the camera arrives; it travels during the 0.8 s before it
      const k = easeInOut(clamp((t - (b.t - 0.8)) / 0.8));
      return { t, s: a.s + (b.s - a.s) * k, fx: a.fx + (b.fx - a.fx) * k, fy: a.fy + (b.fy - a.fy) * k };
    }
  }
  return cams[cams.length - 1];
}

// The phone's screen: real recordings cut back to back, with a 4-frame dissolve between segments.
const Screen: React.FC<{ segs: Seg[] }> = ({ segs }) => {
  const frame = useCurrentFrame();
  let at = 0;
  const xf = 4;
  return (
    <AbsoluteFill>
      {segs.map((s, i) => {
        const start = Math.round(at * FPS);
        const len = Math.round(segLen(s) * FPS);
        at += segLen(s);
        const local = frame - start;
        const opacity = i === 0 ? 1 : clamp(local / xf);
        const style: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 };
        return (
          <Sequence key={i} from={start} durationInFrames={len + (i < segs.length - 1 ? xf : 0)} layout="none">
            <AbsoluteFill style={{ opacity }}>
              {s.src.endsWith(".png") ? (
                <Img src={staticFile(s.src)} style={style} />
              ) : (
                <OffthreadVideo src={staticFile(s.src)} trimBefore={Math.round(s.from * FPS)} playbackRate={s.rate ?? 1} muted style={style} />
              )}
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

// A real phone recording on the right, the beat's headline on the left; camera keyframes push in on what matters.
export const PhoneScene: React.FC<{
  segs: Seg[];
  eyebrow: string;
  beats: Beat[];
  cams?: Cam[];
  tint?: number;
  eyebrowColor?: string;
  rail?: React.ReactNode;
}> = ({ segs, eyebrow, beats, cams = [], tint = 0, eyebrowColor, rail }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cam = camAt(cams, t);
  const zoomed = clamp((cam.s - 1) / 0.5);
  const focusX = PX + cam.fx * PW;
  const focusY = PY + cam.fy * PH;
  // as the camera pushes in, slide the focus point toward a spot right of centre (keeps the headline column readable)
  const targetX = focusX + (1340 - focusX) * zoomed;
  const targetY = focusY + (500 - focusY) * zoomed;
  const enter = settle(t - 0.02, 7);
  const current = [...beats].reverse().find((b) => t >= b.t) ?? beats[0];
  const ci = beats.indexOf(current);
  return (
    <Stage tint={tint}>
      <AbsoluteFill>
        <div style={{ position: "absolute", left: 140, top: 250, width: 820 }}>
          <Eyebrow text={eyebrow} color={eyebrowColor ?? C.muted} delay={0.05} />
          <div style={{ height: 30 }} />
          <Sequence key={ci} from={Math.round(current.t * fps)} layout="none">
            <Reveal text={current.head} size={80} delay={0} />
            {current.sub ? <Sub text={current.sub} /> : null}
            {current.chip ? <Chip {...current.chip} /> : null}
          </Sequence>
        </div>
        {rail}
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformOrigin: `${focusX}px ${focusY}px`,
          transform: `translate(${targetX - focusX}px, ${targetY - focusY + (1 - enter) * 50}px) scale(${cam.s})`,
          opacity: enter,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: PX - BEZ,
            top: PY - BEZ,
            width: PW + BEZ * 2,
            height: PH + BEZ * 2,
            borderRadius: R + BEZ,
            background: "linear-gradient(145deg, #3A3B41 0%, #1A1B1F 40%, #26272C 100%)",
            padding: BEZ,
            boxShadow: "0 0 0 1.5px rgba(255,255,255,0.10) inset, 0 40px 120px rgba(0,0,0,0.65), 0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ position: "relative", width: PW, height: PH, borderRadius: R, overflow: "hidden", background: C.canvas }}>
            <Screen segs={segs} />
          </div>
        </div>
      </div>
      <SimTag />
    </Stage>
  );
};

const Sub: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = settle(frame / fps - 0.45, 8);
  return (
    <div
      style={{
        marginTop: 28,
        fontFamily: F.body,
        fontWeight: 500,
        fontSize: 32,
        lineHeight: 1.4,
        color: C.muted,
        opacity: p,
        transform: `translateY(${(1 - p) * 12}px)`,
        maxWidth: 760,
      }}
    >
      {text}
    </div>
  );
};

export const Chip: React.FC<{ text: string; tone: "red" | "blue" | "plain"; delay?: number }> = ({ text, tone, delay = 0.7 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = settle(frame / fps - delay, 10);
  const color = tone === "red" ? C.vermillion : tone === "blue" ? C.blue : C.text;
  return (
    <div
      style={{
        display: "inline-flex",
        marginTop: 32,
        padding: "12px 20px",
        borderRadius: 12,
        fontFamily: F.mono,
        fontWeight: 500,
        fontSize: 27,
        color,
        background: tone === "red" ? C.vermillionSoft : tone === "blue" ? C.blueSoft : "rgba(255,255,255,0.06)",
        boxShadow: `inset 0 0 0 1.5px ${color}`,
        opacity: p,
        transform: `scale(${0.94 + 0.06 * p})`,
        transformOrigin: "left center",
        fontVariantLigatures: "none",
      }}
    >
      {text}
    </div>
  );
};

// Honest label: the phone and console footage ran on the app's built-in network, not the FISCO chain.
export const SimTag: React.FC<{ what?: string; style?: React.CSSProperties }> = ({ what = "Phone", style }) => (
  <div
    style={{
      position: "absolute",
      left: 140,
      top: 56,
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "9px 16px",
      borderRadius: 999,
      background: "rgba(10,11,13,0.78)",
      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)",
      fontFamily: F.body,
      fontWeight: 600,
      fontSize: 18,
      color: C.muted,
      letterSpacing: "0.03em",
      zIndex: 5,
      ...style,
    }}
  >
    <div style={{ width: 8, height: 8, borderRadius: 4, background: C.blue }} />
    {what} on the built-in network · simulated chain
  </div>
);
