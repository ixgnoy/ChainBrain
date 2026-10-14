// Money as rolling digits, with a text twin for the web build and screen readers. RollingNumber splits an amount into reels
// (each reel holds 0-9), so on web the DOM text would read "0123456789..."; a visually hidden text node carries the exact
// string ("Main wallet US$20.00" stays findable by e2e and by assistive tech). Native: RollingNumber's own label is used.
import React from "react";
import { Platform, Text, View, type TextStyle } from "react-native";
import { c, F, type Tone } from "../tokens";
import { RollingNumber } from "./RollingNumber";

const V = {
  balance: { family: F.bold, size: 40, line: 44, ls: -0.8 },
  amount: { family: F.bold, size: 32, line: 38, ls: -0.5 },
  section: { family: F.semi, size: 20, line: 28, ls: -0.2 },
  row: { family: F.semi, size: 16, line: 22, ls: 0 },
  sub: { family: F.medium, size: 14, line: 20, ls: 0 },
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
  const roll = <RollingNumber value={value} prefix={prefix} style={textStyle} lineHeight={t.line} countIn={countIn} accessibilityLabel={label ?? plain} />;
  if (!web) return decorative ? <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>{roll}</View> : roll;
  return (
    <View accessible={!decorative} accessibilityLabel={decorative ? undefined : label ?? plain} accessibilityRole={decorative ? undefined : "text"}>
      <Text style={{ position: "absolute", opacity: 0, fontSize: 1, lineHeight: 1 }} pointerEvents="none">{plain}</Text>
      <View {...({ "aria-hidden": true } as object)}>{roll}</View>
    </View>
  );
}
