import React from "react";
import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { F, useTheme } from "../theme";
import { type } from "../tokens";
import type { Palette } from "../tokens";

type Variant = keyof typeof type;
export type TColor = keyof Palette;

const FAMILY: Record<Variant, string> = {
  displayXl: F.display, displayLg: F.display, headingLg: F.display, headingMd: F.display,
  title: F.bodySemi, body: F.body, bodySm: F.body, caption: F.bodyMed, mono: F.mono,
};

export function T({ v = "body", color = "text", style, weight, num, ...p }: TextProps & { v?: Variant; color?: TColor; weight?: "med" | "semi" | "bold"; num?: boolean }) {
  const { c } = useTheme();
  const t = type[v];
  const fam = weight === "bold" ? F.bodyBold : weight === "semi" ? F.bodySemi : weight === "med" ? F.bodyMed : FAMILY[v];
  const s: TextStyle = {
    fontFamily: fam, fontSize: t.size, lineHeight: t.line, letterSpacing: t.tracking * t.size, color: c[color],
    ...(num ? { fontVariant: ["tabular-nums"] } : null),
  };
  return <RNText {...p} style={[s, style]} />;
}

/** Mono text (ids, hashes, reason codes). */
export const Mono = (p: TextProps & { color?: TColor; size?: number }) => {
  const { size = 12, style, ...rest } = p;
  return <T v="mono" {...rest} style={[{ fontSize: size, lineHeight: size + 4 }, style]} />;
};
