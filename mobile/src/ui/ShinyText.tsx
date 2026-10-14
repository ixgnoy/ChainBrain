// "Working…" label: ink text with a jade shine that sweeps across it (React Bits ShinyText idea, ported to Reanimated).
// Without a gradient mask the sweep is done per character: each glyph blends ink -> jade -> ink as the bright spot passes.
import React, { useEffect } from "react";
import { Text, type TextStyle } from "react-native";
import Animated, { Easing, interpolateColor, useAnimatedStyle, useSharedValue, withRepeat, withTiming, type SharedValue } from "react-native-reanimated";
import { useTheme } from "../theme";
import { useReduceMotion } from "./motion";
import { type } from "../tokens";
import { F } from "../theme";

const WIDTH = 4; // glyphs lit at once

function Glyph({ ch, i, n, phase, from, to, style }: { ch: string; i: number; n: number; phase: SharedValue<number>; from: string; to: string; style: TextStyle }) {
  const s = useAnimatedStyle(() => {
    const d = Math.abs(phase.value * (n + WIDTH * 2) - WIDTH - i);
    const t = Math.max(0, 1 - d / WIDTH);
    return { color: interpolateColor(t, [0, 1], [from, to]) };
  });
  return <Animated.Text style={[style, s]}>{ch}</Animated.Text>;
}

export function ShinyText({ text, ms = 1800, size = "bodySm" }: { text: string; ms?: number; size?: keyof typeof type }) {
  const { c } = useTheme();
  const reduce = useReduceMotion();
  const phase = useSharedValue(0);
  useEffect(() => {
    if (reduce) { phase.value = 0; return; }
    phase.value = withRepeat(withTiming(1, { duration: ms, easing: Easing.inOut(Easing.quad) }), -1, false);
  }, [reduce, ms, phase]);
  const t = type[size];
  const base: TextStyle = { fontFamily: F.bodyMed, fontSize: t.size, lineHeight: t.line };
  if (reduce) return <Text style={[base, { color: c.text2 }]}>{text}</Text>;
  const chars = Array.from(text);
  return (
    <Text accessibilityLabel={text} style={base}>
      {chars.map((ch, i) => <Glyph key={i} ch={ch} i={i} n={chars.length} phase={phase} from={c.text2} to={c.accent} style={base} />)}
    </Text>
  );
}
