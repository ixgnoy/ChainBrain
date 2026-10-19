import React from "react";
import { AbsoluteFill } from "remotion";
import { C } from "../theme";

// Near-black stage with a 48 px hairline grid and a soft vignette. `tint` warms the stage for the attack act.
export const Stage: React.FC<{ children?: React.ReactNode; tint?: number; grid?: number }> = ({
  children,
  tint = 0,
  grid = 1,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.stage, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          opacity: grid,
          backgroundImage: `linear-gradient(${C.grid} 1px, transparent 1px), linear-gradient(90deg, ${C.grid} 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
          backgroundPosition: "center center",
          maskImage: "radial-gradient(ellipse 75% 70% at 50% 50%, black 30%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 75% 70% at 50% 50%, black 30%, transparent 100%)",
        }}
      />
      {tint > 0 ? (
        <AbsoluteFill
          style={{
            opacity: tint,
            background: "radial-gradient(ellipse 70% 60% at 50% 55%, rgba(240,78,35,0.10), transparent 70%)",
          }}
        />
      ) : null}
      {children}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background: "radial-gradient(ellipse 120% 90% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
