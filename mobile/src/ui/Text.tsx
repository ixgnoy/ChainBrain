import React from "react";
import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { F, c, type Tone } from "../tokens";

// Type scale after VaultBank: Clash Display (wide grotesk) for what you read first, General Sans for everything else.
// Letter spacing in RN is in points: em × size.
//   display  28/34 Clash Semibold −0.015em  (page titles)
//   balance  40/48 Clash Medium −0.02em     (total balances)
//   amount   28/34 Clash Medium −0.015em
//   section  21/26 Clash Semibold −0.01em   (section headings: "Recent activity")
//   head     17/22 Clash Semibold            (card titles)
//   row      16/22 General Sans Semibold
//   body     16/24 General Sans Medium
//   sub      14/20 General Sans Medium
//   cap      12/16 General Sans Medium +0.01em
//   label    15/20 General Sans Semibold     (buttons)
//   tab      11/14 General Sans Semibold +0.03em (eyebrows, tab labels)
//   mono     13/16 Clash Semibold +0.05em uppercase (pocket numbers, card data)
const V = {
  display: { family: F.displaySemi, size: 28, line: 34, ls: -0.42 },
  title: { family: F.displaySemi, size: 28, line: 34, ls: -0.42 },
  balance: { family: F.display, size: 40, line: 48, ls: -0.8 },
  amount: { family: F.display, size: 28, line: 34, ls: -0.42 },
  section: { family: F.displaySemi, size: 21, line: 26, ls: -0.21 },
  head: { family: F.displaySemi, size: 17, line: 22, ls: 0 },
  row: { family: F.semi, size: 16, line: 22, ls: -0.08 },
  body: { family: F.medium, size: 16, line: 24, ls: -0.08 },
  sub: { family: F.medium, size: 14, line: 20, ls: 0 },
  cap: { family: F.medium, size: 12, line: 16, ls: 0.12 },
  label: { family: F.semi, size: 15, line: 20, ls: 0 },
  tab: { family: F.semi, size: 11, line: 14, ls: 0.33 },
  mono: { family: F.displaySemi, size: 13, line: 16, ls: 0.65 },
} as const;
export type Variant = keyof typeof V;

const DISPLAY_W = { regular: F.display, medium: F.display, semi: F.displaySemi, bold: F.displaySemi, extra: F.displayBold } as const;

export function T({ v = "body", color = "ink", w, style, ...p }: TextProps & { v?: Variant; color?: Tone; w?: "regular" | "medium" | "semi" | "bold" | "extra" }) {
  const t = V[v];
  // a weight override on a Clash variant stays in Clash (a heading made bolder is still a heading)
  const display = t.family.startsWith("Clash");
  const family = !w ? t.family : display ? DISPLAY_W[w] : F[w];
  const s: TextStyle = { fontFamily: family, fontSize: t.size, lineHeight: t.line, letterSpacing: t.ls, color: c[color], fontVariant: ["tabular-nums"] };
  if (v === "mono") s.textTransform = "uppercase";
  return <RNText {...p} style={[s, style]} />;
}

/** An eyebrow: small uppercase label above a group ("HOLDS POCKET", "AGENT'S NOTE"). */
export function Eyebrow({ color = "muted", style, ...p }: TextProps & { color?: Tone }) {
  return <T v="tab" color={color} style={[{ textTransform: "uppercase", letterSpacing: 0.9 }, style]} {...p} />;
}
