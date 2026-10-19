import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Reveal } from "../components/Kinetic";
import { Stage } from "../components/Stage";
import { C, F, FPS, clamp, easeOut, settle } from "../theme";

export type Seg = { src: string; from: number; to: number; rate?: number; tag?: string }; // footage seconds [from, to)
export type Cam = { t: number; s: number; fx: number; fy: number }; // scene time (s), scale, focus x/y on the screen (0..1)
export type Beat = { t: number; head: string; tag?: string; cap?: { text: string; tone: "red" | "blue" | "plain"; logos?: [string, string][] } };

export const PH = 880; // phone screen height on the stage
export const PW = PH * (1206 / 2622);
const PX = 1200; // phone screen left
const PY = 40;
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
      // each keyframe is where the camera arrives; it travels during the 0.7 s before it (exponential ease-out)
      const k = easeOut(clamp((t - (b.t - 0.7)) / 0.7));
      return { t, s: a.s + (b.s - a.s) * k, fx: a.fx + (b.fx - a.fx) * k, fy: a.fy + (b.fy - a.fy) * k };
    }
  }
  return cams[cams.length - 1];
}

// The phone's screen: real recordings, hard-cut back to back; each cut lands on a small settle (1.03 → 1).
const Screen: React.FC<{ segs: Seg[] }> = ({ segs }) => {
  const frame = useCurrentFrame();
  let at = 0;
  return (
    <AbsoluteFill>
      {segs.map((s, i) => {
        const start = Math.round(at * FPS);
        const len = Math.round(segLen(s) * FPS);
        at += segLen(s);
        const local = frame - start;
        const snap = i === 0 ? 1 : 1 + 0.03 * (1 - easeOut(clamp(local / 7)));
        const style: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 };
        return (
          <Sequence key={i} from={start} durationInFrames={len} layout="none">
            <AbsoluteFill style={{ transform: `scale(${snap})` }}>
              {s.src.endsWith(".png") || s.src.endsWith(".jpg") ? (
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

// A speed tag for time-lapsed segments ("×30"), shown while that segment plays.
const SpeedTag: React.FC<{ segs: Seg[] }> = ({ segs }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  let at = 0;
  for (const s of segs) {
    const len = segLen(s);
    if (t >= at && t < at + len && s.tag) {
      return (
        <div style={{ position: "absolute", left: PX + PW + BEZ + 26, top: PY + 40, fontFamily: F.mono, fontSize: 26, color: C.muted, fontVariantLigatures: "none" }}>
          {s.tag}
        </div>
      );
    }
    at += len;
  }
  return null;
};

// A real phone recording on the right in a gently tilted 3D frame; the beat's headline on the left over a huge,
// cropped, low-contrast act word. Camera keyframes push in on what matters.
export const PhoneScene: React.FC<{
  segs: Seg[];
  word: string;
  beats: Beat[];
  cams?: Cam[];
  tint?: number;
  rail?: React.ReactNode;
}> = ({ segs, word, beats, cams = [], tint = 0, rail }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cam = camAt(cams, t);
  const zoomed = clamp((cam.s - 1) / 0.5);
  const focusX = PX + cam.fx * PW;
  const focusY = PY + cam.fy * PH;
  // as the camera pushes in, slide the focus point right of centre (keeps the headline column readable)
  const targetX = focusX + (1360 - focusX) * zoomed;
  const targetY = focusY + (520 - focusY) * zoomed;
  const enter = settle(t - 0.02, 9);
  // 3D: the phone arrives turned in, settles near-frontal, then drifts slightly; flattens while zoomed for legibility
  const ry = (-16 * (1 - easeOut(clamp(t / 1.1))) - 5 + Math.sin(t * 0.35) * 2) * (1 - zoomed);
  const rx = (4 * (1 - easeOut(clamp(t / 1.1))) + 1.5) * (1 - zoomed);
  const current = [...beats].reverse().find((b) => t >= b.t) ?? beats[0];
  const ci = beats.indexOf(current);
  return (
    <Stage tint={tint}>
      <AbsoluteFill>
        <div style={{ position: "absolute", left: 120, top: 330, width: 860 }}>
          <Sequence key={ci} from={Math.round(current.t * fps)} layout="none">
            {current.tag ? <RubricTag text={current.tag} /> : null}
            <Reveal text={current.head} size={82} delay={0} stagger={0.045} />
            {current.cap ? <Caption {...current.cap} /> : null}
          </Sequence>
        </div>
        {rail}
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformOrigin: `${focusX}px ${focusY}px`,
          transform: `translate(${targetX - focusX}px, ${targetY - focusY + (1 - enter) * 40}px) scale(${cam.s})`,
        }}
      >
        <div style={{ position: "absolute", inset: 0, perspective: 2600, perspectiveOrigin: `${PX + PW / 2}px 540px` }}>
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
              boxShadow: "0 0 0 1.5px rgba(255,255,255,0.10) inset, 0 50px 120px rgba(0,0,0,0.7), 0 10px 30px rgba(0,0,0,0.5)",
              transform: `rotateY(${ry}deg) rotateX(${rx}deg)`,
            }}
          >
            <div style={{ position: "relative", width: PW, height: PH, borderRadius: R, overflow: "hidden", background: C.canvas }}>
              <Screen segs={segs} />
            </div>
          </div>
        </div>
      </div>
      <SpeedTag segs={segs} />
      <SimTag />
    </Stage>
  );
};

// The judging rubric's word for what the beat shows (Innovation & Interaction: clarification, fallback), small, above
// the headline.
const RubricTag: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = settle(frame / fps - 0.15, 9);
  return (
    <div style={{ position: "absolute", top: -54, left: 0, display: "flex", alignItems: "center", gap: 12, opacity: p, fontFamily: F.mono, fontSize: 20, letterSpacing: "0.14em", color: C.blue, textTransform: "uppercase", fontVariantLigatures: "none" }}>
      <div style={{ width: 9, height: 9, background: C.blue }} />
      {text}
    </div>
  );
};

// One huge cropped word behind the headline: the act's subject, low contrast, off the left edge.
export const ActWord: React.FC<{ word: string; t: number; color?: string }> = ({ word, t, color = "rgba(255,255,255,0.045)" }) => {
  const p = easeOut(clamp(t / 0.9));
  return (
    <div
      style={{
        position: "absolute",
        left: -60 - (1 - p) * 80,
        bottom: -70,
        fontFamily: F.display,
        fontWeight: 700,
        fontSize: 420,
        lineHeight: 0.8,
        letterSpacing: "-0.05em",
        color,
        whiteSpace: "nowrap",
        pointerEvents: "none",
      }}
    >
      {word}
    </div>
  );
};

// The beat's caption: a short rule in the tone colour, then mono text. No pill.
export const Caption: React.FC<{ text: string; tone: "red" | "blue" | "plain"; delay?: number; logos?: [string, string][] }> = ({ text, tone, delay = 0.55, logos }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps - delay;
  const line = easeOut(clamp(t / 0.3));
  const txt = easeOut(clamp((t - 0.12) / 0.35));
  const color = tone === "red" ? C.vermillion : tone === "blue" ? C.blue : C.text;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 36 }}>
      <div style={{ width: 44 * line, height: 3, background: color }} />
      {logos?.map(([src, bg], i) => {
        const p = easeOut(clamp((t - 0.05 - i * 0.08) / 0.3));
        return (
          <div
            key={src}
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              background: bg,
              boxShadow: "0 8px 20px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.16)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              opacity: p,
              transform: `translateY(${(1 - p) * 10}px)`,
              flex: "none",
            }}
          >
            <Img src={staticFile(`brand/${src}`)} style={{ width: bg === "#0143D9" ? 52 : 36, height: bg === "#0143D9" ? 52 : 36, objectFit: "contain" }} />
          </div>
        );
      })}
      <div
        style={{
          fontFamily: F.mono,
          fontWeight: 500,
          fontSize: 27,
          color,
          fontVariantLigatures: "none",
          clipPath: `inset(0 ${100 - txt * 100}% 0 0)`,
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </div>
    </div>
  );
};

// Honest label, small corner text: the phone footage ran on the app's built-in network (an in-app test chain).
export const SimTag: React.FC<{ what?: string; style?: React.CSSProperties }> = ({ what = "Phone", style }) => (
  <div
    style={{
      position: "absolute",
      left: 120,
      top: 64,
      display: "flex",
      alignItems: "center",
      gap: 12,
      fontFamily: F.body,
      fontWeight: 500,
      fontSize: 20,
      color: C.muted,
      zIndex: 5,
      ...style,
    }}
  >
    <div style={{ width: 8, height: 8, background: C.blue }} />
    {what} recorded on our test setup
  </div>
);
