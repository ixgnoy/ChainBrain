import React from "react";
import { Check, X } from "lucide-react";
import { C } from "../theme";

// A round icon badge (Lucide's check or cross, the apps' icon set) in place of typed ✓ / ✗ characters.
// `on` 0..1: grey and small when off, filled and full size when on.
export const Badge: React.FC<{ kind: "ok" | "no"; size?: number; on?: number; color?: string }> = ({ kind, size = 26, on = 1, color }) => {
  const fill = color ?? (kind === "ok" ? C.blue : C.vermillion);
  const lit = on > 0.05;
  const Icon = kind === "ok" ? Check : X;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        flex: "none",
        background: lit ? fill : "rgba(255,255,255,0.08)",
        color: "#0A0B0D",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${0.75 + 0.25 * on})`,
        boxShadow: lit ? `0 0 ${size * 0.6 * on}px ${fill}66` : undefined,
      }}
    >
      {lit ? <Icon size={size * 0.62} strokeWidth={3.2} /> : null}
    </div>
  );
};
