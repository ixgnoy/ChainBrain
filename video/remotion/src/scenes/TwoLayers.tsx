import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandMark } from "../components/BrandMark";
import { Eyebrow, Reveal } from "../components/Kinetic";
import { Stage } from "../components/Stage";
import { C, F, clamp, easeInOut, settle } from "../theme";

// 0:25 the problem (two bad options), then the answer: a card per agent with two safety nets.
// `split` = second (from the scene start) where the two options give way to the diagram.
export const TwoLayers: React.FC<{ split?: number; brainAt?: number; cardAt?: number }> = ({
  split = 6.2,
  brainAt = 10.6,
  cardAt = 13.2,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const away = easeInOut(clamp((t - split) / 0.45));
  return (
    <Stage>
      {away < 1 ? (
        <AbsoluteFill
          style={{
            padding: "0 160px",
            justifyContent: "center",
            opacity: 1 - away,
            transform: `translateY(${-away * 40}px)`,
          }}
        >
          <Eyebrow text="Today" delay={0.1} />
          <div style={{ display: "flex", gap: 48, marginTop: 40 }}>
            <Option t={t - 1.2} title="Give it your wallet" sub="One fooled AI can spend everything." icon="all" />
            <Option t={t - 3.6} title="Approve every payment" sub="Then you are doing the agent's job." icon="each" />
          </div>
        </AbsoluteFill>
      ) : null}
      {t > split + 0.5 ? <Diagram t={t - split - 0.5} brainAt={brainAt - split - 0.5} cardAt={cardAt - split - 0.5} /> : null}
    </Stage>
  );
};

const Option: React.FC<{ t: number; title: string; sub: string; icon: "all" | "each" }> = ({ t, title, sub, icon }) => {
  const p = settle(t, 8);
  const x = settle(t - 1.1, 10);
  return (
    <div
      style={{
        flex: 1,
        height: 420,
        borderRadius: 30,
        padding: 48,
        background: "rgba(255,255,255,0.035)",
        boxShadow: `inset 0 0 0 1px rgba(255,255,255,${0.08 + 0.3 * x * 0})`,
        opacity: p,
        transform: `translateY(${(1 - p) * 30}px)`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", gap: 10, marginBottom: 44 }}>
        {icon === "all"
          ? [0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
              <div key={k} style={{ width: 34, height: 22, borderRadius: 5, background: C.text, opacity: 0.85 - x * 0.6 }} />
            ))
          : [0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
              <div
                key={k}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  boxShadow: `inset 0 0 0 2px ${C.text}`,
                  opacity: settle(t - 0.3 - k * 0.12, 10) * 0.85,
                }}
              />
            ))}
      </div>
      <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 64, color: C.text, letterSpacing: "-0.02em" }}>{title}</div>
      <div style={{ fontFamily: F.body, fontWeight: 500, fontSize: 32, color: C.muted, marginTop: 18 }}>{sub}</div>
      <div
        style={{
          position: "absolute",
          right: 44,
          top: 40,
          width: 64,
          height: 64,
          borderRadius: 32,
          background: C.vermillion,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: F.body,
          fontWeight: 700,
          fontSize: 40,
          transform: `scale(${x})`,
        }}
      >
        ✕
      </div>
    </div>
  );
};

const Diagram: React.FC<{ t: number; brainAt: number; cardAt: number }> = ({ t, brainAt, cardAt }) => {
  const head = settle(t - 0.1, 8);
  const brain = settle(t - brainAt, 8);
  const card = settle(t - cardAt, 8);
  const flow = clamp((t - cardAt - 1.0) / 2.2);
  const dotY = interpolate(easeInOut(flow % 1), [0, 1], [250, 905]);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 160, top: 300, width: 700 }}>
        <Reveal text={"Give each agent\nits own card."} delay={0.15} size={92} />
        <div style={{ height: 36 }} />
        <div style={{ opacity: head, fontFamily: F.body, fontSize: 34, color: C.muted, fontWeight: 500, lineHeight: 1.4 }}>
          With two safety nets under every payment.
        </div>
      </div>
      <div style={{ position: "absolute", left: 1010, top: 150, width: 760 }}>
        <Node y={0} p={head} label="AI agent" sub="Wants to pay a seller" tone="plain" />
        <Layer
          y={200}
          p={brain}
          n="1"
          title="The Brain"
          sub="Watches every payment. Learns from you. Only ever tightens."
          color={C.blue}
          mark={false}
        />
        <Layer
          y={460}
          p={card}
          n="2"
          title="The card"
          sub="Its own contract on FISCO BCOS. Holds even when the AI is fooled."
          color={C.vermillion}
          mark
        />
        <Node y={750} p={card} label="Seller" sub="Paid only inside your rules" tone="plain" />
        {flow > 0 ? (
          <div
            style={{
              position: "absolute",
              left: 372,
              top: dotY - 150,
              width: 16,
              height: 16,
              borderRadius: 8,
              background: C.text,
              boxShadow: "0 0 0 6px rgba(242,241,238,0.12)",
            }}
          />
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

const Node: React.FC<{ y: number; p: number; label: string; sub: string; tone: "plain" }> = ({ y, p, label, sub }) => (
  <div
    style={{
      position: "absolute",
      top: y,
      left: 180,
      width: 400,
      height: 110,
      borderRadius: 24,
      background: "rgba(255,255,255,0.05)",
      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      opacity: p,
      transform: `translateY(${(1 - p) * 20}px)`,
    }}
  >
    <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 36, color: C.text }}>{label}</div>
    <div style={{ fontFamily: F.body, fontWeight: 500, fontSize: 22, color: C.muted, marginTop: 4 }}>{sub}</div>
  </div>
);

const Layer: React.FC<{ y: number; p: number; n: string; title: string; sub: string; color: string; mark: boolean }> = ({
  y,
  p,
  n,
  title,
  sub,
  color,
  mark,
}) => (
  <div
    style={{
      position: "absolute",
      top: y,
      left: 0,
      width: 760,
      height: 200,
      borderRadius: 30,
      padding: "34px 40px",
      background: `linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))`,
      boxShadow: `inset 0 0 0 2px ${color}`,
      display: "flex",
      gap: 30,
      alignItems: "center",
      opacity: p,
      transform: `translateY(${(1 - p) * 30}px) scaleX(${0.92 + 0.08 * p})`,
    }}
  >
    <div
      style={{
        width: 84,
        height: 84,
        flex: "none",
        borderRadius: 22,
        background: color,
        color: C.ink,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: F.display,
        fontWeight: 700,
        fontSize: 44,
      }}
    >
      {mark ? <BrandMark size={50} light={false} /> : n}
    </div>
    <div>
      <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 52, color: C.text, letterSpacing: "-0.01em" }}>{title}</div>
      <div style={{ fontFamily: F.body, fontWeight: 500, fontSize: 26, color: C.muted, marginTop: 8, lineHeight: 1.35 }}>{sub}</div>
    </div>
  </div>
);
