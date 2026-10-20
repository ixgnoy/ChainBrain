import React from "react";
import { Freeze, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandMark } from "../components/BrandMark";
import { Reveal } from "../components/Kinetic";
import { Stage } from "../components/Stage";
import { C, F, clamp, easeOut, settle } from "../theme";
import face from "../face.json";
import words from "../vo-words.json";
import { BEZ, PH, PW, PX, PY, R } from "./PhoneScene";

// An on-camera clip of the team (tools/voice.py imports it from footage/face/). Its sound is the clip's own line in the
// mix, so the picture plays muted here. A portrait selfie plays in the film's phone frame, in the slot the app
// recordings use, and its words are set large on the left as they're spoken; a landscape clip keeps the wide card.
type Clip = { src: string; len: number; line: string; w?: number; h?: number };
const CLIPS = face as Record<string, Clip>;
const WORDS = words as Record<string, { w: string; s: number; e: number }[]>;

// beside a portrait clip: a small label, the line in big type and a smaller second part, in the order spoken
const TYPE: Record<string, { label?: string; head: string; sub?: string; highlight?: Record<string, string> }> = {
  intro: { label: "Chin Jun Quan / Universiti Malaya", head: "Hi, I'm\nJun Quan.", sub: "With Hao Wen and Yong Xi, we built ChainBrain." },
  close: { head: "Give your AI\na card, not\nyour wallet.", highlight: { card: C.vermillion } },
};

const TAGS: Record<string, { name: string; sub: string }> = {
  intro: { name: "Chin Jun Quan", sub: "Universiti Malaya, ChainBrain" },
  team: { name: "Chin Jun Quan, Tan Hao Wen, Wong Yong Xi", sub: "Universiti Malaya and Universiti Putra Malaysia" },
};

const portrait = (c: Clip) => (c.h ?? 0) > (c.w ?? 0);

export const hasClip = (clip: string) => Boolean(CLIPS[clip]);

/** Lines a clip already shows in big type, so the burned-in subtitles leave them out. */
export const TYPESET = new Set(
  Object.entries(CLIPS)
    .filter(([k, c]) => portrait(c) && TYPE[k])
    .map(([, c]) => c.line),
);

const count = (s: string) => s.split(/\s+/).filter(Boolean).length;

// when each shown word is spoken (seconds into the clip); evenly paced if the take's words don't line up with the type
function spoken(line: string, n: number): number[] {
  const ws = WORDS[line] ?? [];
  if (ws.length === n) return ws.map((w) => Math.max(0, w.s - 0.1));
  const end = ws.length ? ws[ws.length - 1].e : n * 0.3;
  return Array.from({ length: n }, (_, i) => (i / n) * end);
}

export const FaceScene: React.FC<{ clip: string }> = ({ clip }) => {
  const c = CLIPS[clip];
  if (!c) return null;
  return portrait(c) ? <Portrait clip={clip} c={c} /> : <Wide clip={clip} c={c} />;
};

const Portrait: React.FC<{ clip: string; c: Clip }> = ({ clip, c }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const type = TYPE[clip];
  const enter = settle(t - 0.02, 9);
  // arrives turned in like the app recordings, then settles almost frontal and stays still (a face shouldn't drift)
  const turn = 1 - easeOut(clamp(t / 1.1));
  const ry = -14 * turn - 3;
  const rx = 3.5 * turn + 0.5;
  // the scene runs a little past the clip: hold its last frame
  const last = Math.floor(c.len * fps) - 1;
  const nHead = type ? count(type.head) : 0;
  const times = type ? spoken(c.line, nHead + (type.sub ? count(type.sub) : 0)) : [];
  return (
    <Stage>
      {type ? (
        <div style={{ position: "absolute", left: 120, top: 330, width: 860 }}>
          {type.label ? <Label text={type.label} t={t} /> : null}
          <Reveal text={type.head} size={104} times={times.slice(0, nHead)} highlight={type.highlight} />
          {type.sub ? <Sub text={type.sub} times={times.slice(nHead)} t={t} /> : null}
        </div>
      ) : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translateY(${(1 - enter) * 40}px)`,
          perspective: 2600,
          perspectiveOrigin: `${PX + PW / 2}px 540px`,
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
            boxShadow: "0 0 0 1.5px rgba(255,255,255,0.10) inset, 0 50px 120px rgba(0,0,0,0.7), 0 10px 30px rgba(0,0,0,0.5)",
            transform: `rotateY(${ry}deg) rotateX(${rx}deg)`,
          }}
        >
          <div style={{ position: "relative", width: PW, height: PH, borderRadius: R, overflow: "hidden", background: "#000" }}>
            <Freeze frame={last} active={frame > last}>
              {/* a little tighter than the selfie, kept at the bottom edge so the face sits high; dimmed to sit on the dark stage */}
              <OffthreadVideo
                src={staticFile(c.src)}
                muted
                style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.2)", transformOrigin: "50% 100%", filter: "brightness(0.88)" }}
              />
            </Freeze>
          </div>
        </div>
      </div>
    </Stage>
  );
};

// name and university above the big type, like the rubric tags in the phone scenes
const Label: React.FC<{ text: string; t: number }> = ({ text, t }) => {
  const p = settle(t - 0.15, 9);
  return (
    <div
      style={{
        position: "absolute",
        top: -54,
        left: 0,
        display: "flex",
        alignItems: "center",
        gap: 12,
        opacity: p,
        fontFamily: F.mono,
        fontSize: 20,
        letterSpacing: "0.14em",
        color: C.blue,
        textTransform: "uppercase",
        fontVariantLigatures: "none",
        whiteSpace: "nowrap",
      }}
    >
      <div style={{ width: 9, height: 9, background: C.blue }} />
      {text}
    </div>
  );
};

// the second part of the line, smaller, after a short rule that draws in as it starts
const Sub: React.FC<{ text: string; times: number[]; t: number }> = ({ text, times, t }) => {
  const line = easeOut(clamp((t - (times[0] ?? 0)) / 0.3));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 40 }}>
      <div style={{ width: 44 * line, height: 3, background: C.blue, flex: "none" }} />
      <Reveal text={text} size={38} weight={500} font={F.body} letterSpacing="0" lineHeight={1.2} color="rgba(242,241,238,0.8)" times={times} />
    </div>
  );
};

const Wide: React.FC<{ clip: string; c: Clip }> = ({ clip, c }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const p = settle(t, 8);
  const tag = TAGS[clip];
  const tagP = settle(t - 0.5, 9);
  const W = 1440;
  const H = 810;
  return (
    <Stage>
      <div
        style={{
          position: "absolute",
          left: 960 - W / 2,
          top: 470 - H / 2,
          width: W,
          height: H,
          borderRadius: 28,
          overflow: "hidden",
          background: "#000",
          boxShadow: "0 40px 100px rgba(0,0,0,0.65), 0 0 0 1.5px rgba(255,255,255,0.12)",
          opacity: p,
          transform: `scale(${0.97 + 0.03 * p})`,
        }}
      >
        <OffthreadVideo src={staticFile(c.src)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        {tag ? (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 190, background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 100%)" }}>
            <div style={{ position: "absolute", left: 40, bottom: 34, opacity: tagP, transform: `translateY(${(1 - tagP) * 14}px)` }}>
              <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 40, color: C.text, letterSpacing: "-0.01em" }}>{tag.name}</div>
              <div style={{ marginTop: 6, fontFamily: F.body, fontWeight: 500, fontSize: 24, color: "rgba(242,241,238,0.75)" }}>{tag.sub}</div>
            </div>
          </div>
        ) : null}
        {clip === "close" ? (
          <div style={{ position: "absolute", right: 36, bottom: 32, display: "flex", alignItems: "center", gap: 12, opacity: tagP }}>
            <BrandMark size={34} />
            <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 30, color: C.text }}>ChainBrain</div>
          </div>
        ) : null}
      </div>
    </Stage>
  );
};
