import React from "react";
import { OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandMark } from "../components/BrandMark";
import { Stage } from "../components/Stage";
import { C, F, settle } from "../theme";
import face from "../face.json";

// An on-camera clip of the team (tools/voice.py imports it from footage/face/), framed on the dark stage like the
// phone and browser shots. Its sound is the clip's own line in the mix, so the picture plays muted here.
type Clip = { src: string; len: number; line: string };
const CLIPS = face as Record<string, Clip>;

const TAGS: Record<string, { name: string; sub: string }> = {
  intro: { name: "Chin Jun Quan", sub: "Universiti Malaya, ChainBrain" },
  team: { name: "Chin Jun Quan, Tan Hao Wen, Wong Yong Xi", sub: "Universiti Malaya and Universiti Putra Malaysia" },
};

export const hasClip = (clip: string) => Boolean(CLIPS[clip]);

export const FaceScene: React.FC<{ clip: string }> = ({ clip }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const c = CLIPS[clip];
  if (!c) return null;
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
