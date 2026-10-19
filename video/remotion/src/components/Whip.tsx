import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { clamp, easeOut } from "../theme";

// A whip-pan entrance: the scene arrives moving fast from the right with horizontal motion blur that dies out in
// ~9 frames. Used sparingly at act changes; everything else is a hard cut.
export const Whip: React.FC<{ children: React.ReactNode; frames?: number; dir?: 1 | -1; id: string }> = ({ children, frames = 9, dir = 1, id }) => {
  const frame = useCurrentFrame();
  const k = easeOut(clamp(frame / frames));
  if (k >= 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  const x = (1 - k) * 340 * dir;
  const blur = (1 - k) * 46;
  return (
    <AbsoluteFill>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id={`whip-${id}`} x="-20%" y="0%" width="140%" height="100%">
          <feGaussianBlur stdDeviation={`${blur} 0`} />
        </filter>
      </svg>
      <AbsoluteFill style={{ transform: `translateX(${x}px)`, filter: `url(#whip-${id})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
