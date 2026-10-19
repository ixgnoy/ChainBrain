import React from "react";
import { Img, OffthreadVideo, staticFile } from "remotion";
import { C, F } from "../theme";

export type Media = {
  src: string; // path under public/
  kind: "video" | "image";
  trimBefore?: number; // frames (30 fps) skipped at the start of the clip
  playbackRate?: number;
};

const Screen: React.FC<{ media: Media; radius: number }> = ({ media, radius }) => {
  const style: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: radius,
    display: "block",
  };
  if (media.kind === "image") return <Img src={staticFile(media.src)} style={style} />;
  return (
    <OffthreadVideo
      src={staticFile(media.src)}
      trimBefore={media.trimBefore}
      playbackRate={media.playbackRate ?? 1}
      muted
      style={style}
    />
  );
};

// iPhone-style device frame around a simulator recording (screen aspect 1206:2622).
export const Phone: React.FC<{ media: Media; height: number; style?: React.CSSProperties }> = ({
  media,
  height,
  style,
}) => {
  const sh = height;
  const sw = sh * (1206 / 2622);
  const bez = sw * 0.034;
  const r = sw * 0.14;
  return (
    <div
      style={{
        position: "absolute",
        width: sw + bez * 2,
        height: sh + bez * 2,
        borderRadius: r + bez,
        background: "linear-gradient(145deg, #3A3B41 0%, #1A1B1F 40%, #26272C 100%)",
        padding: bez,
        boxShadow: "0 0 0 1.5px rgba(255,255,255,0.10) inset, 0 40px 120px rgba(0,0,0,0.65), 0 8px 24px rgba(0,0,0,0.5)",
        ...style,
      }}
    >
      <div style={{ width: sw, height: sh, borderRadius: r, overflow: "hidden", background: C.canvas }}>
        <Screen media={media} radius={r} />
      </div>
    </div>
  );
};

// Browser window for console and explorer recordings (16:10-ish content area).
export const Browser: React.FC<{
  media: Media;
  width: number;
  url?: string;
  aspect?: number; // content height / width
  style?: React.CSSProperties;
  zoom?: { s: number; fx: number; fy: number };
}> = ({ media, width, url, aspect = 1080 / 1920, style, zoom }) => {
  const bar = 44;
  return (
    <div
      style={{
        position: "absolute",
        width,
        borderRadius: 18,
        overflow: "hidden",
        background: "#1C1D22",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 40px 120px rgba(0,0,0,0.6)",
        ...style,
      }}
    >
      <div style={{ height: bar, display: "flex", alignItems: "center", gap: 9, padding: "0 18px" }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
          <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c, opacity: 0.9 }} />
        ))}
        {url ? (
          <div
            style={{
              marginLeft: 18,
              flex: 1,
              height: 28,
              borderRadius: 8,
              background: "rgba(255,255,255,0.06)",
              color: C.muted,
              fontFamily: F.body,
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              padding: "0 14px",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {url}
          </div>
        ) : null}
      </div>
      <div style={{ width, height: width * aspect, background: "#fff", overflow: "hidden", position: "relative" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            transformOrigin: `${(zoom?.fx ?? 0.5) * 100}% ${(zoom?.fy ?? 0.5) * 100}%`,
            transform: `scale(${zoom?.s ?? 1})`,
          }}
        >
          <Screen media={media} radius={0} />
        </div>
      </div>
    </div>
  );
};
