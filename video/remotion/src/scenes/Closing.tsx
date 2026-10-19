import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandMark } from "../components/BrandMark";
import { Browser, type Media } from "../components/Devices";
import { Reveal } from "../components/Kinetic";
import { Plaque } from "../components/Real";
import { Stage } from "../components/Stage";
import { C, F, clamp, easeInOut, easeOut, settle } from "../theme";

// The drop: one huge line, cropped off the left edge, on a warm stage.
export const ActTitle: React.FC<{ title: string }> = ({ title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const p = settle(t - 0.04, 12);
  const rule = easeOut(clamp((t - 0.05) / 0.35));
  return (
    <Stage tint={1}>
      <AbsoluteFill>
        <div style={{ position: "absolute", left: 120, top: 330, width: 1680 * rule, height: 4, background: C.vermillion }} />
        <div
          style={{
            position: "absolute",
            left: -30,
            top: 380,
            fontFamily: F.display,
            fontWeight: 600,
            fontSize: 250,
            lineHeight: 0.92,
            letterSpacing: "-0.04em",
            color: C.text,
            whiteSpace: "nowrap",
            clipPath: `inset(0 ${100 - p * 100}% 0 0)`,
          }}
        >
          {title}
        </div>
      </AbsoluteFill>
    </Stage>
  );
};

// The four attacks the scoring names, as plain text along the bottom; each is marked blocked as it is shown.
export const ATTACKS = ["prompt injection", "data extraction", "privilege escalation", "induced transfer"];
export const AttackRail: React.FC<{ active: number; done: number }> = ({ active, done }) => (
  <div style={{ position: "absolute", left: 120, top: 690, display: "flex", flexDirection: "column", gap: 12 }}>
    {ATTACKS.map((a, i) => {
      const isDone = i < done;
      const isOn = i === active;
      return (
        <div key={a} style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: F.body, fontWeight: 600, fontSize: 24, color: isOn ? C.text : isDone ? C.vermillion : C.faint }}>
          <div style={{ width: 22, height: 3, background: isOn || isDone ? C.vermillion : "rgba(255,255,255,0.14)" }} />
          {a}
          <span style={{ fontFamily: F.mono, fontSize: 18, color: C.vermillion, opacity: isDone ? 1 : 0 }}>blocked</span>
        </div>
      );
    })}
  </div>
);

export type Proof = { label: string; tx: string; ok: boolean };

// Real FISCO evidence: the hosted explorer opens full size, then moves left as the checked rows arrive.
export const ProofScene: React.FC<{ media: Media; url: string; rows: Proof[]; total: number; split?: number }> = ({
  media,
  url,
  rows,
  total,
  split = 9.6,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const win = settle(t - 0.05, 7);
  const k = easeInOut(clamp((t - split) / 1.0));
  const width = 1500 - 520 * k;
  const left = (1920 - 1500) / 2 + (110 - (1920 - 1500) / 2) * k;
  const top = 120 + 40 * k;
  const rt = t - split;
  return (
    <Stage>
      <div style={{ position: "absolute", left: 210 - 100 * k, top: 34, display: "flex", alignItems: "center", gap: 20, opacity: settle(t - 0.1, 8) }}>
        <Plaque src="brand/fisco-bcos-logo.svg" h={30} p={1} pad={10} />
        <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 24, color: C.blue }}>The real chain · FISCO BCOS 3.16.4 · chain id 20200</div>
      </div>
      <div style={{ position: "absolute", left, top, opacity: win, transform: `translateY(${(1 - win) * 40}px)` }}>
        <Browser media={media} width={width} url={url} aspect={720 / 1280} zoom={{ s: 1.45 - 0.45 * k, fx: 0.1, fy: 0.1 }} />
      </div>
      {t > split ? (
        <div style={{ position: "absolute", left: 1150, top: 150, width: 680 }}>
          <Sequence from={Math.round(split * fps)} layout="none">
            <Reveal text={`${total} real transactions.\nAll resolve on-chain.`} size={50} delay={0.1} stagger={0.04} />
          </Sequence>
          <div style={{ marginTop: 28, display: "flex", flexDirection: "column" }}>
            {rows.map((r, i) => {
              const p = settle(rt - 0.8 - i * 0.2, 9);
              return (
                <div
                  key={r.tx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 4px",
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    opacity: p,
                    transform: `translateX(${(1 - p) * 30}px)`,
                  }}
                >
                  <div style={{ width: 4, height: 22, background: r.ok ? C.blue : C.vermillion, flex: "none" }} />
                  <div style={{ flex: 1, fontFamily: F.body, fontWeight: 500, fontSize: 22, color: r.ok ? C.text : C.vermillion, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {r.label}
                    {r.ok ? "" : " · reverted"}
                  </div>
                  <div style={{ fontFamily: F.mono, fontSize: 19, color: C.muted, fontVariantLigatures: "none" }}>
                    {r.tx.slice(0, 8)}…{r.tx.slice(-4)}
                  </div>
                </div>
              );
            })}
            <div style={{ fontFamily: F.body, fontWeight: 500, fontSize: 19, color: C.muted, padding: "10px 4px", opacity: settle(rt - 2.6, 8) }}>
              + {total - rows.length} more in docs/evidence-fisco-railway.json
            </div>
          </div>
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 110, bottom: 112, fontFamily: F.body, fontWeight: 500, fontSize: 19, color: C.muted, opacity: settle(t - split - 2.2, 6) }}>
        Mock e-HKD is test money, not the HKMA e-HKD · team-hosted FISCO chain · phone and console footage: built-in network
      </div>
    </Stage>
  );
};

// Close: the line, the mark (one light pass across it), where to find it.
export const Close: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const foot = settle(t - 2.4, 6);
  const sweep = clamp((t - 3.2) / 0.9);
  return (
    <Stage>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <Reveal text={"Give your AI a card,\nnot your wallet."} size={124} align="center" delay={0.2} stagger={0.08} highlight={{ card: C.vermillion }} />
        <div style={{ marginTop: 80, display: "flex", alignItems: "center", gap: 22, opacity: foot, position: "relative" }}>
          <div style={{ position: "relative", overflow: "hidden", borderRadius: 6 }}>
            <BrandMark size={58} t={t - 2.3} />
            {sweep > 0 && sweep < 1 ? (
              <div
                style={{
                  position: "absolute",
                  top: -20,
                  bottom: -20,
                  width: 26,
                  left: -40 + sweep * 140,
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)",
                  transform: "skewX(-18deg)",
                }}
              />
            ) : null}
          </div>
          <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 52, color: C.text }}>ChainBrain</div>
          <div style={{ fontFamily: F.cjk, fontWeight: 700, fontSize: 30, color: C.muted, marginLeft: 6 }}>链AI脑</div>
        </div>
        <div style={{ marginTop: 26, fontFamily: F.body, fontWeight: 500, fontSize: 24, color: C.muted, opacity: foot }}>
          github.com/ixgnoy/Fintechathon-LianAiNao · FinTechathon 2026 · Topic F
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
