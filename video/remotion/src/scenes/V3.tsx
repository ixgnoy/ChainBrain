import React from "react";
import { AbsoluteFill, Freeze, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CodeXml, Crosshair, Globe } from "lucide-react";
import { AICard, CARD_RATIO, type Agent } from "../components/AICard";
import { BrandMark } from "../components/BrandMark";
import { Browser } from "../components/Devices";
import { Reveal } from "../components/Kinetic";
import { Plaque, UiCard, pop } from "../components/Real";
import { Stage } from "../components/Stage";
import { C, F, clamp, easeInOut, easeOut, settle } from "../theme";
import timeline from "../timeline.json";
import { sceneEnd, sceneStart, voAt, voEnd, wordAt } from "../vo";
import { hasClip } from "./Face";
import { CardConstellation } from "./EndCard";

// v3 story scenes (video/STORYBOARD-v3.md). Every time below is relative to the scene's start, taken from the
// voice-over's word timings, so a re-recorded line moves its picture with it.

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};
const rel = (scene: string) => {
  const s = sceneStart(scene);
  return { vo: (id: string) => voAt(id) - s, word: (id: string, w: string, n = 0) => wordAt(id, w, n) - s, end: (id: string) => voEnd(id) - s };
};

const AGENTS: Agent[] = [
  { name: "Claude", src: "brand/claude-spark-clay.png", imgScale: 0.62 },
  { name: "ChatGPT", src: "brand/openai-blossom-black.png", imgScale: 0.6 },
  { name: "Ours" },
];

const Small: React.FC<{ children: React.ReactNode; p: number; style?: React.CSSProperties }> = ({ children, p, style }) => (
  <div style={{ position: "absolute", fontFamily: F.mono, fontSize: 24, color: C.muted, opacity: p, fontVariantLigatures: "none", ...style }}>{children}</div>
);

// ───────────────────────── 0:00 Hook: a post in Morse code, then a wallet emptied ─────────────────────────
type Pulse = [number, number, number]; // start (s), length (s), 1 = dash
const MORSE = ((timeline.cues as unknown as { morse?: Pulse[] }).morse ?? []);

export const Hook: React.FC = () => {
  const t = useT();
  const r = rel("hook");
  const cut = r.vo("m2") - 0.25;
  if (t < cut) {
    // dots and dashes light up in time with the beeps, on one line; the line turns vermillion as the sentence lands
    const last = MORSE.length ? MORSE[MORSE.length - 1][0] + MORSE[MORSE.length - 1][1] : r.end("m1");
    const turn = easeOut(clamp((t - (last - 0.1)) / 0.4));
    const unit = 30;
    // the pulses spell an illustrative order ("SEND ALL"): a longer silence starts a new letter or word, and each
    // letter appears under its dots once its last pulse has sounded
    const TEXT = "SENDALL";
    let x = 0;
    let letter = 0;
    const letters: { x0: number; x1: number; at: number; ch: string }[] = [];
    const marks = MORSE.map(([s, d, dash], i) => {
      if (i > 0) {
        const gap = s - (MORSE[i - 1][0] + MORSE[i - 1][1]);
        if (gap > 0.15) {
          letter++;
          x += gap > 0.35 ? unit * 2.5 : unit * 1.0;
        }
      }
      const m = { x, wd: dash ? unit * 3 : unit, s };
      const L = letters[letter] ?? (letters[letter] = { x0: x, x1: x, at: s, ch: TEXT[letter] ?? "" });
      L.x1 = x + m.wd;
      L.at = s + d;
      x += m.wd + unit * 0.9;
      return m;
    });
    const total = x - unit * 0.9;
    return (
      <AbsoluteFill style={{ background: "#000" }}>
        <Small p={settle(t - 0.1, 8)} style={{ left: 120, top: 100, color: C.text, fontSize: 34 }}>
          4 MAY 2026
        </Small>
        <Small p={settle(t - 0.4, 8)} style={{ left: 120, top: 150, fontSize: 28 }}>
          one post on X
        </Small>
        {/* a hairline time-base under the dots, growing as the post is "typed" */}
        <div style={{ position: "absolute", left: (1920 - total) / 2, top: 540 + unit * 0.5 + 100, width: total * clamp(t / cut), height: 1, background: "rgba(255,255,255,0.12)" }} />
        <div style={{ position: "absolute", left: (1920 - total) / 2, top: 540 - unit / 2, height: unit, transform: `scale(${1 + 0.04 * clamp(t / cut)})`, transformOrigin: `${total / 2}px ${unit / 2}px` }}>
          {marks.map((m, i) => {
            const on = t >= m.s;
            const flash = on ? Math.exp(-(t - m.s) * 6) : 0;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: m.x,
                  top: 0,
                  width: m.wd,
                  height: unit,
                  borderRadius: unit / 2,
                  background: turn > 0 ? `rgba(240,78,35,${0.35 + 0.65 * turn})` : C.text,
                  opacity: on ? 0.55 + 0.45 * flash : 0,
                  boxShadow: on ? `0 0 ${18 * flash}px rgba(255,255,255,${0.6 * flash})` : undefined,
                }}
              />
            );
          })}
          {letters.map((L, i) => {
            const p = settle(t - L.at, 12);
            return (
              <div key={i} style={{ position: "absolute", left: (L.x0 + L.x1) / 2 - 40, width: 80, top: unit + 34, textAlign: "center", fontFamily: F.mono, fontWeight: 500, fontSize: 44, color: turn > 0 ? C.vermillion : C.text, opacity: p, transform: `translateY(${(1 - p) * 10}px)` }}>
                {L.ch}
              </div>
            );
          })}
        </div>
        <Small p={settle(t - (letters[0]?.at ?? 1), 6)} style={{ left: 0, right: 0, textAlign: "center", top: 700, fontSize: 22 }}>
          an illustration of a hidden order
        </Small>
      </AbsoluteFill>
    );
  }
  // hard cut: what the agent sent away counts up (OECD: 3 billion DRB tokens, worth US$150,000 to 200,000)
  const k = easeInOut(clamp((t - cut - 0.2) / 2.4));
  const v = Math.round(150000 * k);
  const zero = k >= 1;
  return (
    <AbsoluteFill style={{ background: "#000", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      <div style={{ fontFamily: F.body, fontWeight: 500, fontSize: 30, color: C.muted, marginBottom: 18 }}>sent away by one AI agent</div>
      <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 210, letterSpacing: "-0.04em", color: zero ? C.vermillion : C.text, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        US${v.toLocaleString("en-US")}
        {zero ? "+" : ""}
      </div>
      <div style={{ marginTop: 34, fontFamily: F.mono, fontSize: 24, color: C.muted, opacity: settle(t - cut - 3.0, 7), fontVariantLigatures: "none" }}>
        US$150,000 to 200,000 in tokens, reports vary (source: OECD AI Incidents Monitor)
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────── 0:12 The trust gap: 74% … 9% ─────────────────────────
export const Stat: React.FC = () => {
  const t = useT();
  const r = rel("stat");
  const a = r.vo("m3");
  const nine = r.word("m3", "nine");
  const p74 = settle(t - a, 9);
  const n74 = Math.round(74 * easeOut(clamp((t - a) / 1.1)));
  const p9 = settle(t - nine + 0.05, 13);
  const shrink = easeInOut(clamp((t - nine + 0.1) / 0.45));
  return (
    <Stage>
      <div style={{ position: "absolute", left: 160, top: 250 - 40 * shrink, opacity: p74 }}>
        <div style={{ opacity: 1 - 0.55 * shrink, fontFamily: F.display, fontWeight: 600, fontSize: 300 * (1 - 0.45 * shrink), lineHeight: 0.9, letterSpacing: "-0.05em", color: C.text, fontVariantNumeric: "tabular-nums" }}>{n74}%</div>
        <div style={{ fontFamily: F.body, fontWeight: 500, fontSize: 40 - 6 * shrink, color: C.muted, marginTop: 18, opacity: 1 - 0.3 * shrink, maxWidth: 700 }}>would let an agent handle routine tasks</div>
      </div>
      {t >= nine - 0.05 ? (
        <div style={{ position: "absolute", left: 960, top: 300, opacity: p9, transform: `translateY(${(1 - p9) * 40}px)` }}>
          <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 380, lineHeight: 0.9, letterSpacing: "-0.05em", color: C.vermillion }}>9%</div>
          <div style={{ fontFamily: F.body, fontWeight: 500, fontSize: 40, color: C.text, marginTop: 18 }}>would let it buy on its own</div>
        </div>
      ) : null}
      <Small p={settle(t - a - 1.2, 7)} style={{ left: 160, top: 860, fontSize: 25, maxWidth: 1560 }}>
        Accenture, “Talk to My AI Agent”, June 2026: 25,590 consumers in 16 countries. 74% would hand routine tasks to an AI agent; 9% are open to it making fully autonomous purchases.
      </Small>
    </Stage>
  );
};

// ───────────────────────── 0:21 This is ChainBrain: the card arrives ─────────────────────────
export const CardReveal: React.FC = () => {
  const t = useT();
  const r = rel("card");
  const name = r.vo("n1");
  const give = r.word("n1", "give");
  const pN = settle(t - name + 0.1, 9);
  const k = settle(t - give + 0.15, 4.5);
  const drift = Math.sin(t * 0.6) * 2;
  return (
    <Stage>
      <div style={{ position: "absolute", left: 0, right: 0, top: 120, display: "flex", justifyContent: "center", alignItems: "center", gap: 24, opacity: pN, transform: `translateY(${(1 - pN) * -16}px)` }}>
        <BrandMark size={64} t={t - name + 0.1} />
        <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 64, color: C.text, letterSpacing: "-0.02em" }}>ChainBrain</div>
      </div>
      <div style={{ position: "absolute", left: 960 - 380, top: 330 + (1 - k) * 420, opacity: clamp(k * 3) }}>
        <AICard w={760} ry={-38 * (1 - k) - 6 + drift} rx={18 * (1 - k) + 6} rz={-6 * (1 - k)} glow={0.3 + 0.4 * k} agent={AGENTS[2]} />
      </div>
    </Stage>
  );
};

// ───────────────────────── 0:28 What the AI Card is ─────────────────────────
export const WhatCard: React.FC = () => {
  const t = useT();
  const r = rel("what");
  const arr = [r.word("n2", "claude"), r.word("n2", "chatgpt"), r.word("n2", "ours")];
  const n3 = r.vo("n3");
  const fisco = r.word("n3", "fisco");
  const n4 = r.vo("n4");
  const gather = easeInOut(clamp((t - (n3 - 0.2)) / 0.7)); // three cards fold back into one
  const flip = easeInOut(clamp((t - (r.word("n3", "smart") - 0.35)) / 0.8));
  const side = easeInOut(clamp((t - (n4 - 0.3)) / 0.8)); // the card moves right; the Brain arrives on the left
  const brainP = pop(t, n4 - 0.1, 8);
  const w = 640;
  const cx = 960 + 380 * side;
  return (
    <Stage>
      {/* the second AI: the real Brain map from the app */}
      {t > n4 - 0.3 ? <UiCard name="brainmap" w={520} x={520} y={520} p={brainP} from={[-80, 0]} tone={C.blue} /> : null}
      {t > n4 - 0.3 ? (
        <div style={{ position: "absolute", left: 790, top: 518, width: (cx - w / 2 - 790 - 20) * easeOut(clamp((t - n4 - 0.3) / 0.6)), height: 3, background: `repeating-linear-gradient(90deg, ${C.blue} 0 14px, transparent 14px 26px)` }} />
      ) : null}
      {t > n4 - 0.3 ? (
        <div style={{ position: "absolute", left: 300, top: 870, width: 440, textAlign: "center", fontFamily: F.body, fontWeight: 600, fontSize: 34, color: C.blue, opacity: pop(t, n4 + 0.4) }}>a second AI watches</div>
      ) : null}
      {AGENTS.map((a, i) => {
        const p = settle(t - arr[i] + 0.12, 9);
        if (p <= 0) return null;
        const fan = (i - 1) * (1 - gather);
        const front = i === 2; // ours stays and flips to its rules; Claude's and ChatGPT's cards fold into it
        const x = cx + fan * 560;
        const y = 500 + Math.abs(fan) * 30 + (1 - p) * 120;
        if (!front && gather >= 1) return null;
        return (
          <div key={a.name} style={{ position: "absolute", left: x - w / 2, top: y - (w * CARD_RATIO) / 2, opacity: Math.min(p, front ? 1 : 1 - gather * 0.9), zIndex: front ? 3 : 2 - Math.abs(i - 1) }}>
            <AICard w={w} agent={a} addr={front ? undefined : ""} limit={front ? undefined : ""} rz={fan * 6} ry={-4 + Math.sin(t * 0.5 + i) * 2} flip={front ? flip : 0} glow={0.35 + 0.3 * side} />
          </div>
        );
      })}
      {/* the chain it lives on */}
      <div style={{ position: "absolute", left: cx - 140, top: 760 }}>
        <Plaque src="brand/fisco-bcos-logo.svg" h={44} p={pop(t, fisco - 0.15, 10)} pad={14} />
      </div>
    </Stage>
  );
};

// ───────────────────────── The card says no ─────────────────────────
// The fourth attack: the agent is fooled on purpose (the seller's planted order, 0x0000…ABC0) and orders the transfer;
// the order flies at the card and stops dead on "no". Then the proof: the phone's own notice and the chain's revert.
export const Money: React.FC = () => {
  const t = useT();
  const r = rel("money");
  const send = r.word("k3", "send");
  const no = r.word("k4", "no");
  const k5 = r.vo("k5");
  const split = k5 - 0.1;
  const fly = Math.pow(clamp((t - send) / (no - 0.05 - send)), 1.6); // accelerates into the card
  const flying = t >= send && t < no - 0.05;
  const hit = t >= no - 0.05;
  const shake = hit ? Math.sin((t - no) * 70) * 14 * Math.exp(-(t - no) * 9) : 0;
  const out = easeInOut(clamp((t - split) / 0.7)); // the attack picture leaves for the proof
  const cardX = 1250;
  const cardW = 600;
  const noP = settle(t - no + 0.02, 16);
  const agentP = settle(t - 0.2, 9);
  const fooled = easeOut(clamp((t - r.word("k3", "fool") + 0.1) / 0.5));
  const startX = 520;
  const endX = cardX - cardW / 2 - 200;
  return (
    <Stage tint={1}>
      <div style={{ position: "absolute", left: 120, top: 80, opacity: settle(t - 0.1, 9) * (1 - out), display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 10, height: 10, background: C.vermillion }} />
        <div style={{ fontFamily: F.mono, fontSize: 22, letterSpacing: "0.12em", color: C.muted, fontVariantLigatures: "none" }}>THE FOURTH ATTACK: A FORCED PAYMENT (INDUCED TRANSFER)</div>
      </div>
      <div style={{ opacity: 1 - out, transform: `translateX(${-200 * out}px)` }}>
        {/* the fooled agent and the order it was given */}
        <div style={{ position: "absolute", left: 120, top: 380, width: 400, opacity: agentP }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: 84, height: 84, borderRadius: 42, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 0 ${3 * fooled}px ${C.vermillion}` }}>
              <BrandMark size={46} light={false} />
            </div>
            <div>
              <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 32, color: C.text }}>AI agent</div>
              <div style={{ fontFamily: F.mono, fontSize: 20, color: C.vermillion, opacity: fooled, fontVariantLigatures: "none" }}>we play it fooled</div>
            </div>
          </div>
          <div style={{ marginTop: 26, padding: "18px 22px", borderRadius: 16, background: "rgba(240,78,35,0.12)", boxShadow: `inset 0 0 0 1.5px ${C.vermillion}`, opacity: fooled }}>
            <div style={{ fontFamily: F.mono, fontSize: 17, color: C.muted, letterSpacing: "0.08em", fontVariantLigatures: "none" }}>THE SELLER'S PLANTED ORDER</div>
            <div style={{ marginTop: 8, fontFamily: F.mono, fontSize: 24, color: C.text, fontVariantLigatures: "none" }}>send 50 eHKD to 0x0000…ABC0</div>
          </div>
        </div>
        {/* the order in flight */}
        {flying ? (
          <div
            style={{
              position: "absolute",
              left: startX + (endX - startX) * fly,
              top: 520,
              padding: "16px 26px",
              borderRadius: 14,
              background: C.vermillion,
              fontFamily: F.mono,
              fontSize: 26,
              color: "#fff",
              fontVariantLigatures: "none",
              boxShadow: "0 20px 40px rgba(240,78,35,0.35)",
              transform: `skewX(${-10 * fly}deg)`,
            }}
          >
            HK$50.00 to 0x…ABC0
          </div>
        ) : null}
        {hit
          ? Array.from({ length: 10 }, (_, i) => {
              const a = (i / 10) * Math.PI - Math.PI / 2;
              const d = easeOut(clamp((t - no) / 0.5)) * 170;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: cardX - cardW / 2 - 30 - Math.cos(a) * d,
                    top: 545 + Math.sin(a) * d,
                    width: 14,
                    height: 6,
                    background: C.vermillion,
                    opacity: 1 - clamp((t - no) / 0.6),
                    transform: `rotate(${i * 37}deg)`,
                  }}
                />
              );
            })
          : null}
        <div style={{ position: "absolute", left: cardX - cardW / 2 + shake, top: 560 - (cardW * CARD_RATIO) / 2 }}>
          <AICard w={cardW} agent={AGENTS[2]} addr="0x5f6e ···· C91c" ry={-4} alarm={hit ? Math.exp(-(t - no) * 2.5) : 0} limit="Balance HK$26.00, unchanged" />
        </div>
        {hit ? (
          <div style={{ position: "absolute", left: cardX - 300, width: 600, top: 90, textAlign: "center", fontFamily: F.display, fontWeight: 700, fontSize: 210, lineHeight: 1, letterSpacing: "-0.04em", color: C.vermillion, opacity: noP, transform: `scale(${1.25 - 0.25 * noP})` }}>
            No.
          </div>
        ) : null}
      </div>
      {/* the proof: the phone's own notice, and the real transaction on the hosted chain */}
      {t > split ? (
        <>
          <div style={{ position: "absolute", left: 110, top: 120, opacity: pop(t, split + 0.15) }}>
            <div style={{ fontFamily: F.mono, fontSize: 21, letterSpacing: "0.1em", color: C.muted, fontVariantLigatures: "none" }}>ON THE PHONE</div>
          </div>
          <UiCard name="blocked" w={760} x={500} y={360} p={pop(t, split + 0.2, 9)} from={[-80, 0]} tone={C.vermillion} />
          <div style={{ position: "absolute", left: 990, top: 120, opacity: pop(t, split + 0.5) }}>
            <div style={{ fontFamily: F.mono, fontSize: 21, letterSpacing: "0.1em", color: C.muted, fontVariantLigatures: "none" }}>ON THE CHAIN</div>
          </div>
          <UiCard name="ex-reverted" w={820} x={1400} y={420} p={pop(t, split + 0.5, 9)} from={[80, 0]} tone={C.vermillion} />
          <div style={{ position: "absolute", left: 990, top: 720, display: "flex", alignItems: "center", gap: 18, opacity: pop(t, split + 1.1) }}>
            <Plaque src="brand/fisco-bcos-logo.svg" h={30} p={1} pad={10} />
            <div style={{ fontFamily: F.mono, fontSize: 23, color: C.vermillion, fontVariantLigatures: "none", maxWidth: 640, lineHeight: 1.35 }}>the same forced transfer, reverted on our hosted chain in block 13</div>
          </div>
          <div style={{ position: "absolute", left: 110, top: 640, width: 780, fontFamily: F.display, fontWeight: 600, fontSize: 56, lineHeight: 1.1, color: C.text, letterSpacing: "-0.02em", opacity: pop(t, r.word("k5", "agent") - 0.1) }}>
            The card still
            <br />
            <span style={{ color: C.vermillion }}>won't pay.</span>
          </div>
        </>
      ) : null}
    </Stage>
  );
};

// ───────────────────────── 2:42 It can only say no ─────────────────────────
export const OnlyStricter: React.FC = () => {
  const t = useT();
  const r = rel("only");
  const st = r.word("w3", "stricter");
  const nv = r.word("w3", "never");
  const lo = r.word("w3", "looser");
  const pS = settle(t - st + 0.1, 12);
  const pN = settle(t - nv + 0.05, 12);
  const strike = easeOut(clamp((t - lo - 0.25) / 0.3));
  return (
    <Stage>
      <div style={{ position: "absolute", left: 160, top: 170, fontFamily: F.body, fontWeight: 500, fontSize: 36, color: C.muted, opacity: settle(t - 0.2, 8) }}>
        The second AI can hold, block or freeze
      </div>
      <div style={{ position: "absolute", left: 150, top: 300, fontFamily: F.display, fontWeight: 600, fontSize: 210, lineHeight: 1, letterSpacing: "-0.04em", color: C.blue, opacity: pS, transform: `translateY(${(1 - pS) * 40}px)` }}>
        Stricter.
      </div>
      <div style={{ position: "absolute", left: 150, top: 540, opacity: pN, transform: `translateY(${(1 - pN) * 40}px)` }}>
        <div style={{ position: "relative", fontFamily: F.display, fontWeight: 600, fontSize: 210, lineHeight: 1, letterSpacing: "-0.04em", color: C.faint }}>
          Looser.
          <div style={{ position: "absolute", left: 0, top: "52%", width: `${100 * strike}%`, height: 14, background: C.vermillion }} />
        </div>
      </div>
    </Stage>
  );
};

// ───────────────────────── 2:48 Proof ─────────────────────────
const REFUSED: [string, string][] = [
  ["Pay an address a seller planted", "0xd49be111"],
  ["Pay above “ask me” without you", "0xb3d88830"],
  ["The agent signs as you", "0xaf285aa5"],
  ["Pay over the HK$15 cap", "0xf0ad609b"],
  ["Replay an old payment", "0x84e1d74e"],
  ["Raise its own limit to HK$800", "0x7a3b37d1"],
  ["Add the planted seller", "0x49c76450"],
];

export const ProofV3: React.FC = () => {
  const t = useT();
  const r = rel("proof");
  const seven = r.word("f1", "seven");
  const f2 = r.vo("f2");
  const f3 = r.vo("f3");
  const f4 = r.end("f3") + 0.3; // the try-it address follows the tests (on screen only)
  const swap = easeInOut(clamp((t - (f2 - 0.4)) / 0.5));
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Stage>
      {/* where each number comes from: the 7/7 ran on the hosted chain; the 63 attacks and 462 tests on a local FISCO node,
          Foundry and the demo network (security self-assessment p.3 and p.7) */}
      <div style={{ position: "absolute", left: 120, top: 70, display: "flex", alignItems: "center", gap: 20, opacity: settle(t - 0.1, 8) * (1 - swap) }}>
        <Plaque src="brand/fisco-bcos-logo.svg" h={34} p={1} pad={11} />
        <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 26, color: C.text }}>Our hosted FISCO BCOS chain</div>
      </div>
      <div style={{ position: "absolute", left: 120, top: 78, fontFamily: F.body, fontWeight: 600, fontSize: 26, color: C.text, opacity: swap }}>
        Our own test runs, on a local FISCO node, Foundry and the demo network
      </div>
      {/* left: 7 of 7 on the hosted chain, then 63 attacks / HK$0 and 462 tests (the submitted security and technical PDFs) */}
      <div style={{ position: "absolute", left: 120, top: 190, width: 760, opacity: 1 - swap }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 26, opacity: settle(t - seven + 0.1, 10) }}>
          <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 200, lineHeight: 0.9, letterSpacing: "-0.05em", color: C.text, fontVariantNumeric: "tabular-nums" }}>7/7</div>
          <div style={{ fontFamily: F.body, fontWeight: 500, fontSize: 34, color: C.muted, lineHeight: 1.2 }}>
            forbidden attempts
            <br />
            <span style={{ color: C.vermillion }}>rejected</span>
          </div>
        </div>
        <div style={{ marginTop: 30 }}>
          {REFUSED.map(([label, tx], i) => {
            const p = settle(t - seven - 0.35 - i * 0.22, 11); // from "seven" to "rejected"
            return (
              <div key={tx} style={{ display: "flex", alignItems: "center", gap: 16, padding: "9px 0", borderTop: "1px solid rgba(255,255,255,0.07)", opacity: p, transform: `translateX(${(1 - p) * 24}px)` }}>
                <div style={{ width: 4, height: 20, background: C.vermillion }} />
                <div style={{ flex: 1, fontFamily: F.body, fontWeight: 500, fontSize: 27, color: C.text }}>{label}</div>
                <div style={{ fontFamily: F.mono, fontSize: 22, color: C.muted, fontVariantLigatures: "none" }}>{tx}…</div>
              </div>
            );
          })}
        </div>
      </div>
      {t > f2 - 0.5 ? (
        <div style={{ position: "absolute", left: 120, top: 220, width: 800 }}>
          <Big n="63" label="attacks on our own cards, test money" sub="HK$0 lost" note="55 assume the AI is already fooled, 8 use a live model" p={settle(t - f2 + 0.2, 10)} />
          <div style={{ height: 70 }} />
          <Big n="462" label="automated tests, 7 suites, on 19 Oct" sub="all passed" p={settle(t - f3 + 0.1, 10)} />
        </div>
      ) : null}
      {/* right: the real explorer */}
      <div style={{ position: "absolute", left: 960, top: 190, opacity: settle(t - 0.4, 7), transform: `translateY(${(1 - settle(t - 0.4, 7)) * 40}px)` }}>
        {/* the reverted forced transfer (block 13) stays up while 7/7 is on screen; the clip runs on from the swap */}
        <Freeze frame={Math.round(3.6 * fps)} active={frame >= Math.round(3.6 * fps) && t < f2 - 0.4}>
          <Browser media={{ src: "footage/explorer.mp4", kind: "video", playbackRate: 0.85 }} width={860} url="fisco-api-production-85c5.up.railway.app/explorer" aspect={720 / 1280} zoom={{ s: 1.6, fx: 0.03, fy: 0.1 }} />
        </Freeze>
      </div>
      {/* where to try it (the bonus rewards a real deployment), and where a judge fires the attacks themself and gets
          their own reverted hash on the hosted chain (README, step 4) */}
      <div style={{ position: "absolute", left: 960, top: 736, display: "flex", alignItems: "center", gap: 14, opacity: settle(t - f4 - 0.2, 8), fontFamily: F.mono, fontSize: 26, color: C.blue, fontVariantLigatures: "none" }}>
        <Globe size={26} />
        Try it: fisco-web-production.up.railway.app
      </div>
      <div style={{ position: "absolute", left: 960, top: 780, display: "flex", alignItems: "center", gap: 14, opacity: settle(t - f4 - 0.6, 8), fontFamily: F.mono, fontSize: 26, color: C.text, fontVariantLigatures: "none" }}>
        <Crosshair size={26} color={C.blue} />
        Run the attacks yourself in the Judges tab
      </div>
      <Small p={settle(t - 3.5, 6)} style={{ left: 120, top: 830, fontSize: 23, lineHeight: 1.4, maxWidth: 1500 }}>
        Mock e-HKD is test money, not the HKMA's e-HKD. The phone shots were recorded on our test setup.
        <br />
        Details: ChainBrain-security-self-assessment.pdf. Hosted-chain hashes: ChainBrain-execution-evidence.pdf.
      </Small>
    </Stage>
  );
};

const Big: React.FC<{ n: string; label: string; sub: string; note?: string; p: number }> = ({ n, label, sub, note, p }) => (
  <div style={{ opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>
    <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
      <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 170, lineHeight: 0.9, letterSpacing: "-0.05em", color: C.text }}>{n}</div>
      <div style={{ fontFamily: F.body, fontWeight: 500, fontSize: 30, color: C.muted, maxWidth: 280, lineHeight: 1.2 }}>{label}</div>
    </div>
    <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 26 }}>
      <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 64, color: C.blue, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>{sub}</div>
      {note ? <div style={{ fontFamily: F.body, fontWeight: 500, fontSize: 24, color: C.muted, maxWidth: 360, lineHeight: 1.25 }}>{note}</div> : null}
    </div>
  </div>
);

// ───────────────────────── The team ─────────────────────────
// "We're three university students from Malaysia.", set as it is spoken beside the waving flag; the three portraits
// (3:4, eyes on one line: tools/team.py) rise on "three", each university's own logo lands under its students on
// "university students", and a light passes over the portraits on "Malaysia". The burned-in subtitle leaves this line
// out (the headline is the line); the .srt keeps it.
export const TEAM_LINE = "t1";
const TEAM = [
  { name: "Chin Jun Quan", uni: "Universiti Malaya", src: "team/chin-jun-quan.jpg", logo: "brand/universiti-malaya-logo.png", logoH: 56 },
  { name: "Tan Hao Wen", uni: "Universiti Malaya", src: "team/tan-hao-wen.jpg", logo: "brand/universiti-malaya-logo.png", logoH: 56 },
  { name: "Wong Yong Xi", uni: "Universiti Putra Malaysia", src: "team/wong-yong-xi.jpg", logo: "brand/upm-logo.png", logoH: 62 },
];

export const TeamSlide: React.FC = () => {
  const t = useT();
  const r = rel("team");
  const spoken = timeline.vo.some((v) => v.id === TEAM_LINE); // the line is voiced in this cut
  const w = (word: string, fallback: number) => (spoken ? r.word(TEAM_LINE, word) : fallback);
  const three = w("three", 0.5);
  const uni = w("university", 0.9);
  const malaysia = w("malaysia", 1.6);
  const len = sceneEnd("team") - sceneStart("team");
  const push = 1 + 0.025 * easeInOut(clamp(t / len));
  const headWords = "We're three university students from Malaysia.".split(" ");
  const times = headWords.map((hw) => w(hw.replace(/[^A-Za-z']/g, "").toLowerCase().replace("'", ""), 0.2) - 0.08);
  return (
    <Stage>
      <AbsoluteFill style={{ transform: `scale(${push})` }}>
        {/* the line, with the flag */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 96, display: "flex", justifyContent: "center", alignItems: "center", gap: 30 }}>
          <WavingFlag t={t} at={Math.max(0, three - 0.6)} shimmer={malaysia} />
          <Reveal text={headWords.join(" ")} size={64} times={times} w={10} />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 222, display: "flex", justifyContent: "center", gap: 72 }}>
          {TEAM.map((m, i) => {
            const p = settle(t - three - i * 0.16, 8);
            const lg = settle(t - uni - 0.1 - i * 0.14, 10);
            const sweep = clamp((t - malaysia - 0.1 - i * 0.12) / 0.9);
            return (
              <div key={m.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 380, opacity: clamp(p * 1.4), transform: `translateY(${(1 - p) * 60}px)` }}>
                <div style={{ position: "relative", width: 350, height: 467, borderRadius: 26, overflow: "hidden", boxShadow: "0 30px 70px rgba(0,0,0,0.6), 0 0 0 1.5px rgba(255,255,255,0.14)" }}>
                  <Img src={staticFile(m.src)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  {sweep > 0 && sweep < 1 ? (
                    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(110deg, transparent ${-34 + sweep * 168}%, rgba(255,255,255,0.22) ${-20 + sweep * 168}%, transparent ${-6 + sweep * 168}%)` }} />
                  ) : null}
                </div>
                <div style={{ marginTop: 24, fontFamily: F.display, fontWeight: 600, fontSize: 42, color: C.text, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>{m.name}</div>
                {/* the university's own logo, unmodified, on a white plaque */}
                <div style={{ marginTop: 16, height: 80, padding: "0 16px", display: "flex", alignItems: "center", borderRadius: 14, background: "#FFFFFF", boxShadow: "0 10px 26px rgba(0,0,0,0.45)", opacity: lg, transform: `translateY(${(1 - lg) * 14}px) scale(${0.92 + 0.08 * lg})` }}>
                  <Img src={staticFile(m.logo)} style={{ height: m.logoH, display: "block" }} />
                </div>
                <div style={{ marginTop: 12, fontFamily: F.body, fontWeight: 500, fontSize: 24, color: C.muted, opacity: lg, whiteSpace: "nowrap" }}>{m.uni}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Stage>
  );
};

// The Malaysian flag (Wikimedia Commons, public domain), unfurled from the left, then waving: the image is cut into
// thin overlapping vertical strips, each lifted along a travelling sine wave. The light and shade of the folds is one
// gradient across the whole flag, drawn inside every strip at the same offset as the image, so no strip edge shows.
// A soft shine runs across it at `shimmer`.
const WavingFlag: React.FC<{ t: number; at: number; shimmer: number }> = ({ t, at, shimmer }) => {
  const W = 120;
  const H = 60;
  const N = 40; // 3 px strips on whole pixels: a strip edge on a half pixel shows as a faint seam
  const u = t - at;
  const open = easeOut(clamp(u / 0.6));
  const amp = 3.2 * clamp(u / 0.8);
  const phase = (fx: number) => fx * Math.PI * 2.2 - u * 5.2; // fx: 0 (hoist) .. 1 (free edge)
  const depth = 0.08 * clamp(u / 0.8);
  const stops = Array.from({ length: 13 }, (_, k) => {
    const v = Math.cos(phase(k / 12)) * depth;
    return `${v > 0 ? `rgba(255,255,255,${v.toFixed(3)})` : `rgba(0,0,0,${(-v * 1.4).toFixed(3)})`} ${((k / 12) * 100).toFixed(1)}%`;
  }).join(", ");
  const shine = clamp((t - shimmer) / 0.8);
  return (
    <div style={{ position: "relative", width: W, height: H + 10, opacity: clamp(u / 0.25), clipPath: `inset(-10px ${(1 - open) * 100}% -10px 0)` }}>
      {Array.from({ length: N }, (_, i) => {
        const x = Math.round((i / N) * W);
        const dy = Math.sin(phase(i / N)) * amp * (0.35 + 0.65 * (i / N)); // the free edge moves most
        return (
          <div key={i} style={{ position: "absolute", left: x, top: 5, width: Math.round(W / N) + 1, height: H, overflow: "hidden", transform: `translateY(${dy.toFixed(2)}px)` }}>
            <Img src={staticFile("brand/flag-malaysia.svg")} style={{ position: "absolute", left: -x, top: 0, width: W, height: H, display: "block" }} />
            <div style={{ position: "absolute", left: -x, top: 0, width: W, height: H, background: `linear-gradient(90deg, ${stops})` }} />
          </div>
        );
      })}
      {shine > 0 && shine < 1 ? (
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H + 10, background: `linear-gradient(110deg, transparent ${-30 + shine * 160}%, rgba(255,255,255,0.35) ${-15 + shine * 160}%, transparent ${0 + shine * 160}%)` }} />
      ) : null}
    </div>
  );
};

// ───────────────────────── Ending ─────────────────────────
// The line, the mark, and where to try it. When the closing clip has just said the line on camera (scenes/Face.tsx),
// the end card is the card constellation instead (scenes/EndCard.tsx), so the line isn't set again.
export const Ending: React.FC = () => {
  const t = useT();
  const r = rel("close");
  const len = sceneEnd("close") - sceneStart("close");
  if (hasClip("close")) return <CardConstellation len={len} />;
  const foot = settle(t - r.end("z1") - 0.3, 7);
  const drift = 1 + 0.025 * clamp(t / len);
  const out = 1 - easeOut(clamp((t - (len - 0.5)) / 0.5)); // fade to black over the last half second
  return (
    <Stage>
      <AbsoluteFill style={{ transform: `scale(${drift})`, opacity: out }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 260 }}>
        <Sequence from={Math.max(0, Math.round(r.vo("z1") * 30) - 6)} layout="none">
          <Reveal text={"Give your AI a card,\nnot your wallet."} size={128} align="center" stagger={0.08} highlight={{ card: C.vermillion }} />
        </Sequence>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 640, display: "flex", justifyContent: "center", alignItems: "center", gap: 20, opacity: foot }}>
        <BrandMark size={56} t={t - r.end("z1") - 0.3} />
        <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 52, color: C.text }}>ChainBrain</div>
        <div style={{ fontFamily: F.cjk, fontWeight: 700, fontSize: 30, color: C.muted }}>链AI脑</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 740, display: "flex", justifyContent: "center", opacity: settle(t - r.end("z1") - 0.8, 7) }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {[
          { icon: <Globe size={32} />, label: "Try it", value: "fisco-web-production.up.railway.app" },
          { icon: <CodeXml size={32} />, label: "Code", value: "github.com/ixgnoy/ChainBrain" },
        ].map((l) => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ color: C.blue, display: "flex" }}>{l.icon}</div>
            <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 30, color: C.muted, width: 84 }}>{l.label}</div>
            <div style={{ fontFamily: F.mono, fontSize: 34, color: C.text, fontVariantLigatures: "none" }}>{l.value}</div>
          </div>
        ))}
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 900, textAlign: "center", fontFamily: F.body, fontWeight: 500, fontSize: 26, color: C.muted, opacity: settle(t - r.end("z1") - 1.2, 7) }}>
        FinTechathon 2026, International AI Track, Topic F
      </div>
      </AbsoluteFill>
    </Stage>
  );
};
