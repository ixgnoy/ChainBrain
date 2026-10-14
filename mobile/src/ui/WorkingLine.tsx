// "Working on it" indicator: three calm dots (phase offset 120 ms, 3 pt amplitude, opacity 0.4-1) that appear only after 400 ms
// of waiting and are gone the instant output arrives. No sparkle, orb or shimmer. Reduced motion: static dots.
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { c } from "../tokens";
import { T } from "./Text";
import { useReduceMotion } from "./motion";

const WAVE = Easing.inOut(Easing.sin);

function Dot({ i, reduce }: { i: number; reduce: boolean }) {
  const q = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    q.value = withDelay(i * 120, withRepeat(withSequence(withTiming(1, { duration: 320, easing: WAVE }), withTiming(0, { duration: 320, easing: WAVE }), withTiming(0, { duration: 240 })), -1, false));
    return () => cancelAnimation(q);
  }, [reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  const a = useAnimatedStyle(() => ({ opacity: reduce ? 0.7 : 0.4 + 0.6 * q.value, transform: [{ translateY: -3 * q.value }] }));
  return <Animated.View style={[{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: c.muted }, a]} />;
}

export const WorkingDots = () => {
  const reduce = useReduceMotion();
  return <View style={{ flexDirection: "row", gap: 4, height: 12, alignItems: "flex-end", paddingBottom: 1 }}>{[0, 1, 2].map((i) => <Dot key={i} i={i} reduce={reduce} />)}</View>;
};

/** `on` true: waits `after` ms, then shows the label with the dots. `on` false: gone at once. */
export function useAfter(on: boolean, after = 400) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!on) { setShown(false); return; }
    const t = setTimeout(() => setShown(true), after);
    return () => clearTimeout(t);
  }, [on, after]);
  return on && shown;
}

export function WorkingLine({ on, label = "Working on it…" }: { on: boolean; label?: string }) {
  const show = useAfter(on, 400);
  if (!show) return null;
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Working" style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 24 }}>
      <T v="body" color="muted">{label}</T>
      <WorkingDots />
    </View>
  );
}
