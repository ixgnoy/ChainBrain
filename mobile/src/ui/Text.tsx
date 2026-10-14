import React from "react";
import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { F, c, type Tone } from "../tokens";

// Scale from MASTER.md: serif title 34/40, balance 40/44 700, section 20/28 600, body 16/24, row title 16/22 500, secondary 14/20, caption 13/18, tab 12/16 600.
const V = {
  title: { family: F.serif, size: 34, line: 40, ls: -0.3 },
  balance: { family: F.bold, size: 40, line: 44, ls: -0.8 },
  amount: { family: F.bold, size: 32, line: 38, ls: -0.5 },
  section: { family: F.semi, size: 20, line: 28, ls: -0.2 },
  body: { family: F.regular, size: 16, line: 24, ls: 0 },
  row: { family: F.medium, size: 16, line: 22, ls: 0 },
  sub: { family: F.regular, size: 14, line: 20, ls: 0 },
  cap: { family: F.regular, size: 13, line: 18, ls: 0 },
  tab: { family: F.semi, size: 12, line: 16, ls: 0 },
} as const;
export type Variant = keyof typeof V;

export function T({ v = "body", color = "ink", w, style, ...p }: TextProps & { v?: Variant; color?: Tone; w?: "regular" | "medium" | "semi" | "bold" }) {
  const t = V[v];
  const s: TextStyle = { fontFamily: w ? F[w] : t.family, fontSize: t.size, lineHeight: t.line, letterSpacing: t.ls, color: c[color], fontVariant: ["tabular-nums"] };
  return <RNText {...p} style={[s, style]} />;
}
