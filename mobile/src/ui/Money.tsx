// Money as rolling digits, with a text twin for the web build and screen readers. RollingNumber splits an amount into reels
// (each reel holds 0-9), so on web the DOM text would read "0123456789..."; a visually hidden text node carries the exact
// string ("Main wallet US$20.00" stays findable by e2e and by assistive tech). Native: RollingNumber's own label is used.
import React from "react";
import { Platform, Text, View, type TextStyle } from "react-native";
import { c, F, type Tone } from "../tokens";
import { RollingNumber } from "./RollingNumber";

// DESIGN.md "Financial Figures": display-lg with -0.04em tracking; the currency symbol is set at 75 % of the figure.
const V = {
  hero: { family: F.extra, size: 48, line: 56, ls: -1.92 },
  balance: { family: F.extra, size: 40, line: 48, ls: -1.6 },
  amount: { family: F.extra, size: 32, line: 38, ls: -1.28 },
  section: { family: F.bold, size: 22, line: 28, ls: -0.66 },
  row: { family: F.bold, size: 16, line: 22, ls: -0.24 },
  sub: { family: F.semi, size: 14, line: 20, ls: 0 },
} as const;
export type MoneyVariant = keyof typeof V;
const web = Platform.OS === "web";

export function Money({ value, prefix = "US$", v = "row", color = "ink", countIn, style, label, decorative, strike }: {
  value: string; prefix?: string; v?: MoneyVariant; color?: Tone; countIn?: boolean; style?: TextStyle;
  /** accessible label, defaults to the plain string */ label?: string;
  /** the parent already has a label (a list row): expose nothing of its own */ decorative?: boolean; strike?: boolean;
}) {
  const t = V[v];
  const textStyle: TextStyle = { fontFamily: t.family, fontSize: t.size, letterSpacing: t.ls, color: c[color], fontVariant: ["tabular-nums"], textDecorationLine: strike ? "line-through" : undefined, ...style };
  const plain = `${prefix}${value}`;
  // big figures carry the currency at 75 %, sitting on the same baseline
  const small = t.size >= 28 && prefix;
  const roll = small ? (
    <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
      <Text style={{ ...textStyle, fontSize: Math.round(t.size * 0.75), lineHeight: t.line, letterSpacing: t.ls * 0.6 }}>{prefix}</Text>
      <RollingNumber value={value} prefix="" style={textStyle} lineHeight={t.line} countIn={countIn} accessibilityLabel={label ?? plain} />
    </View>
  ) : <RollingNumber value={value} prefix={prefix} style={textStyle} lineHeight={t.line} countIn={countIn} accessibilityLabel={label ?? plain} />;
  if (!web) return decorative ? <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>{roll}</View> : roll;
  return (
    <View accessible={!decorative} accessibilityLabel={decorative ? undefined : label ?? plain} accessibilityRole={decorative ? undefined : "text"}>
      <Text style={{ position: "absolute", opacity: 0, fontSize: 1, lineHeight: 1 }} pointerEvents="none">{plain}</Text>
      <View {...({ "aria-hidden": true } as object)}>{roll}</View>
    </View>
  );
}
