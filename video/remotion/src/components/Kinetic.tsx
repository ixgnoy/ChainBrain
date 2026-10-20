import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, F, settle } from "../theme";

// Masked, word-by-word type reveal. Each word rises out of its own clip box and settles (no overshoot).
export const Reveal: React.FC<{
  text: string;
  delay?: number; // seconds
  stagger?: number; // seconds per word
  size?: number;
  weight?: number;
  color?: string;
  font?: string;
  lineHeight?: number;
  letterSpacing?: string;
  align?: "left" | "center" | "right";
  out?: number; // seconds from the start of the sequence when the words leave (optional)
  highlight?: Record<string, string>; // word -> colour
  maxWidth?: number;
  w?: number; // settle stiffness: higher lands harder (attacks), lower lands softer
  times?: number[]; // seconds from the start when each word comes in (instead of delay and stagger), e.g. as it is spoken
}> = ({
  text,
  delay = 0,
  stagger = 0.06,
  size = 96,
  weight = 600,
  color = C.text,
  font = F.display,
  lineHeight = 1.02,
  letterSpacing = "-0.02em",
  align = "left",
  out,
  w = 11,
  highlight = {},
  maxWidth,
  times,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const lines = text.split("\n");
  let idx = 0;
  return (
    <div
      style={{
        fontFamily: font,
        fontSize: size,
        fontWeight: weight,
        color,
        lineHeight,
        letterSpacing,
        textAlign: align,
        maxWidth,
      }}
    >
      {lines.map((line, li) => (
        <div key={li} style={{ display: "block", whiteSpace: "nowrap" }}>
          {line.split(" ").map((word, wi) => {
            const i = idx++;
            const p = settle(t - (times?.[i] ?? delay + i * stagger), w);
            const q = out !== undefined ? settle(t - out - i * stagger * 0.5, 13) : 0;
            const y = (1 - p) * 1.05 + q * -1.05;
            const clean = word.replace(/[.,:;!?]/g, "");
            return (
              <span
                key={wi}
                style={{
                  display: "inline-block",
                  overflow: "hidden",
                  verticalAlign: "top",
                  paddingBottom: "0.08em",
                  marginBottom: "-0.08em",
                  marginRight: "0.24em",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    transform: `translateY(${y * 100}%)`,
                    color: highlight[clean] ?? color,
                  }}
                >
                  {word}
                </span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// Small uppercase eyebrow label, tracked out.
export const Eyebrow: React.FC<{ text: string; color?: string; delay?: number; size?: number }> = ({
  text,
  color = C.muted,
  delay = 0,
  size = 22,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = settle(frame / fps - delay, 10);
  return (
    <div
      style={{
        fontFamily: F.body,
        fontWeight: 600,
        fontSize: size,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color,
        opacity: p,
        transform: `translateY(${(1 - p) * 14}px)`,
      }}
    >
      {text}
    </div>
  );
};
