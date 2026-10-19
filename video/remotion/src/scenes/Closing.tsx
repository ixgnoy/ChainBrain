import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandMark } from "../components/BrandMark";
import { Browser, type Media } from "../components/Devices";
import { Eyebrow, Reveal } from "../components/Kinetic";
import { Stage } from "../components/Stage";
import { C, F, clamp, easeInOut, settle } from "../theme";

// Full-bleed act title used between acts: number + name.
export const ActTitle: React.FC<{ n: string; title: string; color?: string; tint?: number }> = ({ n, title, color = C.text, tint = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const line = settle(t - 0.1, 9);
  return (
    <Stage tint={tint}>
      <AbsoluteFill style={{ justifyContent: "center", padding: "0 160px" }}>
        <div style={{ fontFamily: F.mono, fontSize: 30, color: color === C.text ? C.muted : color, opacity: line }}>{n}</div>
        <div style={{ width: 1600 * line, height: 2, background: color === C.text ? "rgba(255,255,255,0.18)" : color, margin: "26px 0 40px" }} />
        <Reveal text={title} size={124} delay={0.15} color={color === C.vermillion ? C.text : C.text} />
      </AbsoluteFill>
    </Stage>
  );
};

// The four attacks the scoring names, ticked off as each is shown.
export const ATTACKS = ["Prompt injection", "Data extraction", "Privilege escalation", "Induced transfer"];
export const AttackRail: React.FC<{ active: number; done: number }> = ({ active, done }) => (
  <div style={{ position: "absolute", left: 140, bottom: 146, display: "flex", gap: 8 }}>
    {ATTACKS.map((a, i) => {
      const isDone = i < done;
      const isOn = i === active;
      return (
        <div
          key={a}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            fontFamily: F.body,
            fontWeight: 600,
            fontSize: 18,
            color: isOn ? "#fff" : isDone ? C.vermillion : C.faint,
            background: isOn ? C.vermillion : "transparent",
            boxShadow: isOn ? "none" : `inset 0 0 0 1.5px ${isDone ? C.vermillion : "rgba(255,255,255,0.12)"}`,
          }}
        >
          {isDone ? "✓ " : ""}
          {a}
        </div>
      );
    })}
  </div>
);

export type Proof = { label: string; tx: string; ok: boolean };

// Real FISCO evidence: the hosted explorer opens full size, then slides left as the checked rows arrive.
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
      <div style={{ position: "absolute", left: 210 - 100 * k, top: 52 }}>
        <Eyebrow text="Real chain · FISCO BCOS 3.16.4 · chain id 20200 · hosted explorer" color={C.blue} delay={0.15} size={19} />
      </div>
      <div style={{ position: "absolute", left, top, opacity: win, transform: `translateY(${(1 - win) * 40}px)` }}>
        <Browser media={media} width={width} url={url} aspect={720 / 1280} zoom={{ s: 1.45 - 0.45 * k, fx: 0.1, fy: 0.1 }} />
      </div>
      {t > split ? (
        <div style={{ position: "absolute", left: 1150, top: 150, width: 680 }}>
          <Sequence from={Math.round(split * fps)} layout="none">
            <ProofHead t={rt} total={total} />
          </Sequence>
          <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 10 }}>
            {rows.map((r, i) => {
              const p = settle(rt - 0.8 - i * 0.2, 9);
              return (
                <div
                  key={r.tx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "11px 16px",
                    borderRadius: 14,
                    background: r.ok ? "rgba(255,255,255,0.04)" : C.vermillionSoft,
                    boxShadow: `inset 0 0 0 1px ${r.ok ? "rgba(255,255,255,0.08)" : "rgba(240,78,35,0.5)"}`,
                    opacity: p,
                    transform: `translateX(${(1 - p) * 30}px)`,
                  }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: 5, background: r.ok ? C.blue : C.vermillion, flex: "none" }} />
                  <div style={{ flex: 1, fontFamily: F.body, fontWeight: 500, fontSize: 21, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {r.label}
                  </div>
                  <div style={{ fontFamily: F.mono, fontSize: 19, color: r.ok ? C.muted : C.vermillion, fontVariantLigatures: "none" }}>
                    {r.tx.slice(0, 8)}…{r.tx.slice(-4)}
                  </div>
                </div>
              );
            })}
            <div style={{ fontFamily: F.body, fontWeight: 500, fontSize: 19, color: C.muted, padding: "4px 16px", opacity: settle(rt - 2.6, 8) }}>
              + {total - rows.length} more · docs/evidence-fisco-railway.json
            </div>
          </div>
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 110, bottom: 112, display: "flex", gap: 12, opacity: settle(t - split - 2.2, 6) }}>
        {["Mock e-HKD is test money, not the HKMA e-HKD", "Team-hosted FISCO chain", "Phone and console footage: built-in network"].map((s) => (
          <div
            key={s}
            style={{
              padding: "9px 16px",
              borderRadius: 999,
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.16)",
              fontFamily: F.body,
              fontWeight: 600,
              fontSize: 18,
              color: C.muted,
            }}
          >
            {s}
          </div>
        ))}
      </div>
    </Stage>
  );
};

const ProofHead: React.FC<{ t: number; total: number }> = ({ total }) => (
  <Reveal text={`${total} real transactions.\nAll resolve on-chain.`} size={50} delay={0.1} stagger={0.04} />
);

// Close: the line, the mark, where to find it.
export const Close: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const foot = settle(t - 2.4, 6);
  return (
    <Stage>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <Reveal
          text={"Give your AI a card,\nnot your wallet."}
          size={124}
          align="center"
          delay={0.2}
          stagger={0.08}
          highlight={{ card: C.vermillion }}
        />
        <div style={{ marginTop: 80, display: "flex", alignItems: "center", gap: 22, opacity: foot }}>
          <BrandMark size={58} t={t - 2.3} />
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
