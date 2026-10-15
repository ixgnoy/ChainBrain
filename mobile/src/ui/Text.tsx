import React from "react";
import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { F, c, type Tone } from "../tokens";

// Neo-Kinetic type scale (DESIGN.md "typography"), all Plus Jakarta Sans. Letter spacing in RN is in points: em × size.
//   display  display-lg-mobile 32/38 800 −0.03em   (page titles)
//   balance  display-lg 40/48 800 −0.04em          (total balances)
//   amount   headline-lg 28/34 700 −0.02em
//   section  headline-md 22/28 700 −0.02em
//   head     headline-sm 18/24 700 −0.01em
//   row      title-md 16/22 600 −0.01em
//   body     body-lg 16/24 500 −0.01em
//   sub      body-md 14/20 500
//   cap      body-sm 12/16 500 +0.01em
//   label    label-lg 14/18 700 −0.01em            (buttons)
//   tab      label-sm 11/14 600 +0.02em            (eyebrows, tab labels)
//   mono     mono-card 13/16 700 +0.08em uppercase (pocket numbers, card data)
const V = {
  display: { family: F.extra, size: 32, line: 38, ls: -0.96 },
  title: { family: F.extra, size: 32, line: 38, ls: -0.96 },
  balance: { family: F.extra, size: 40, line: 48, ls: -1.6 },
  amount: { family: F.bold, size: 28, line: 34, ls: -0.56 },
  section: { family: F.bold, size: 22, line: 28, ls: -0.44 },
  head: { family: F.bold, size: 18, line: 24, ls: -0.18 },
  row: { family: F.semi, size: 16, line: 22, ls: -0.16 },
  body: { family: F.medium, size: 16, line: 24, ls: -0.16 },
  sub: { family: F.medium, size: 14, line: 20, ls: 0 },
  cap: { family: F.medium, size: 12, line: 16, ls: 0.12 },
  label: { family: F.bold, size: 14, line: 18, ls: -0.14 },
  tab: { family: F.semi, size: 11, line: 14, ls: 0.22 },
  mono: { family: F.bold, size: 13, line: 16, ls: 1.04 },
} as const;
export type Variant = keyof typeof V;

export function T({ v = "body", color = "ink", w, style, ...p }: TextProps & { v?: Variant; color?: Tone; w?: "regular" | "medium" | "semi" | "bold" | "extra" }) {
  const t = V[v];
  const s: TextStyle = { fontFamily: w ? F[w] : t.family, fontSize: t.size, lineHeight: t.line, letterSpacing: t.ls, color: c[color], fontVariant: ["tabular-nums"] };
  if (v === "mono") s.textTransform = "uppercase";
  return <RNText {...p} style={[s, style]} />;
}

/** An eyebrow: small uppercase label above a group ("HOLDS POCKET", "AGENT'S NOTE"). */
export function Eyebrow({ color = "muted", style, ...p }: TextProps & { color?: Tone }) {
  return <T v="tab" color={color} style={[{ textTransform: "uppercase", letterSpacing: 0.9 }, style]} {...p} />;
}
