import React from "react";
import { C, settle } from "../theme";

// ChainBrain's four-tile mark (mobile/src/ui/BrandMark.tsx), redrawn for a dark stage:
// hatch, vermillion, light ink, hatch. `p` 0..1 flies the tiles in from apart and locks them (no overshoot).
const TILES: { kind: "hatch" | "vermillion" | "ink"; from: [number, number, number] }[] = [
  { kind: "hatch", from: [-0.9, -0.6, -24] },
  { kind: "vermillion", from: [0.8, -0.9, 18] },
  { kind: "ink", from: [-0.7, 0.9, 14] },
  { kind: "hatch", from: [0.9, 0.7, -20] },
];

export const BrandMark: React.FC<{ size: number; t?: number; light?: boolean }> = ({ size, t = 10, light = true }) => {
  const gap = Math.max(2, Math.round(size * 0.08));
  const tile = (size - gap) / 2;
  const ink = light ? C.text : C.ink;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {TILES.map((tl, i) => {
        const k = settle(t - i * 0.07, 9);
        const x = (i % 2) * (tile + gap);
        const y = Math.floor(i / 2) * (tile + gap);
        const pitch = Math.max(3, tile / 4);
        const stroke = Math.max(1, tile / 12);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: tile,
              height: tile,
              borderRadius: Math.max(1, tile * 0.08),
              overflow: "hidden",
              opacity: Math.min(1, k * 2),
              transform: `translate(${(1 - k) * tl.from[0] * tile}px, ${(1 - k) * tl.from[1] * tile}px) rotate(${(1 - k) * tl.from[2]}deg)`,
              background:
                tl.kind === "vermillion"
                  ? C.vermillion
                  : tl.kind === "ink"
                    ? ink
                    : `repeating-linear-gradient(135deg, ${ink} 0 ${stroke}px, transparent ${stroke}px ${pitch}px)`,
              boxShadow: tl.kind === "hatch" ? `inset 0 0 0 ${Math.max(1, stroke * 0.6)}px rgba(242,241,238,0.25)` : undefined,
            }}
          />
        );
      })}
    </div>
  );
};
