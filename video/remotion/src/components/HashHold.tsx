import React from "react";
import { AbsoluteFill } from "remotion";
import { Badge } from "./Badge";
import { Plaque } from "./Real";
import { C, F, clamp } from "../theme";

// A real transaction's full hash, held full screen and large enough to read off a laptop, with its status and where
// to open it (Topic F is judged on transaction hashes). t is seconds since the hold began.
export const HashHold: React.FC<{ p: number; t: number; hash: string; eyebrow: string; ok: boolean; status: string; note?: string }> = ({ p, t, hash, eyebrow, ok, status, note }) => (
  <AbsoluteFill style={{ opacity: p, background: "rgba(10,11,13,0.94)", justifyContent: "center", paddingLeft: 150 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 18, fontFamily: F.mono, fontSize: 24, letterSpacing: "0.12em", color: C.muted, fontVariantLigatures: "none" }}>
      <Plaque src="brand/fisco-bcos-logo.svg" h={30} p={1} pad={10} />
      {eyebrow}
    </div>
    <div style={{ marginTop: 34, fontFamily: F.mono, fontWeight: 500, fontSize: 58, lineHeight: 1.25, color: C.text, letterSpacing: "0.02em", fontVariantLigatures: "none" }}>
      {[hash.slice(0, 34), hash.slice(34)].map((h, i) => (
        <div key={i} style={{ clipPath: `inset(0 ${100 - clamp((t - 0.1 - i * 0.25) / 0.6) * 100}% 0 0)` }}>{h}</div>
      ))}
    </div>
    <div style={{ marginTop: 30, display: "flex", alignItems: "center", gap: 16, opacity: clamp((t - 0.7) / 0.4) }}>
      <Badge kind={ok ? "ok" : "no"} size={30} />
      <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 30, color: ok ? C.green : C.vermillion }}>{status}</div>
      <div style={{ fontFamily: F.mono, fontSize: 24, color: C.muted, marginLeft: 18, fontVariantLigatures: "none" }}>fisco-api-production-85c5.up.railway.app/explorer</div>
    </div>
    {note ? <div style={{ marginTop: 22, fontFamily: F.body, fontWeight: 500, fontSize: 26, color: C.muted, opacity: clamp((t - 1.0) / 0.4) }}>{note}</div> : null}
  </AbsoluteFill>
);
