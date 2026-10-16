import React from "react";
import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { F, c, type Tone } from "../tokens";
import { GROW, useGrowCap, type Grow } from "./fontScale";

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
/** How far each style grows with the phone's text size (ui/fontScale.ts). */
const GROWS: Record<Variant, Grow> = { display: "heading", title: "heading", balance: "figure", amount: "figure", section: "heading", head: "heading", row: "body", body: "body", sub: "body", cap: "body", label: "heading", tab: "chrome", mono: "figure" };

const DISPLAY_W = { regular: F.display, medium: F.display, semi: F.displaySemi, bold: F.displaySemi, extra: F.displayBold } as const;

export function T({ v = "body", color = "ink", w, style, ...p }: TextProps & { v?: Variant; color?: Tone; w?: "regular" | "medium" | "semi" | "bold" | "extra" }) {
  const t = V[v];
  const cap = useGrowCap(GROWS[v]);
  // a weight override on a Clash variant stays in Clash (a heading made bolder is still a heading)
  const display = t.family.startsWith("Clash");
  const family = !w ? t.family : display ? DISPLAY_W[w] : F[w];
  const s: TextStyle = { fontFamily: family, fontSize: t.size, lineHeight: t.line, letterSpacing: t.ls, color: c[color], fontVariant: ["tabular-nums"] };
  if (v === "mono") s.textTransform = "uppercase";
  // a region that must not grow (card print) turns scaling off: a multiplier of 1 still lays text out at the system size on iOS
  return <RNText {...(cap <= 1 ? { allowFontScaling: false } : { maxFontSizeMultiplier: cap })} {...p} style={[s, style]} />;
}

/** An eyebrow: small uppercase label above a group ("HOLDS POCKET", "AGENT'S NOTE"). */
export function Eyebrow({ color = "muted", style, ...p }: TextProps & { color?: Tone }) {
  return <T v="tab" color={color} style={[{ textTransform: "uppercase", letterSpacing: 0.9 }, style]} {...p} />;
}

/** A static figure in Clash Display Medium ("-US$0.30", "+US$5.00", "4/10"), VaultBank's list amounts: the currency is set at
 *  75 % on the same baseline, like `Money`. For amounts that roll, use `Money`. */
export function Figure({ text, size = 16, color = "ink", strike, style, ...p }: TextProps & { text: string; size?: number; color?: Tone; strike?: boolean }) {
  const m = /^([+\-−]?)(US\$)(.*)$/.exec(text);
  const base: TextStyle = { fontFamily: F.display, fontSize: size, lineHeight: Math.round(size * 1.25), letterSpacing: -0.01 * size, color: c[color], fontVariant: ["tabular-nums"], textDecorationLine: strike ? "line-through" : "none" };
  return (
    <RNText numberOfLines={1} accessibilityLabel={text} maxFontSizeMultiplier={GROW.figure} {...p} style={[base, style]}>
      {m ? <>{m[1]}<RNText style={{ fontSize: Math.round(size * 0.75) }}>{m[2]}</RNText>{m[3]}</> : text}
    </RNText>
  );
}
