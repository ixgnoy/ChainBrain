// The agent's state as an 8 pt dot: teal and breathing while it works, amber while it waits for the owner, green when
// ready, red when stopped. Reduced motion: no breathing.
import React, { useEffect } from "react";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { c } from "../tokens";
import { useReduceMotion } from "./motion";

export type DotState = "working" | "waiting" | "ready" | "stopped";
const COLOR: Record<DotState, string> = { working: c.accent, waiting: c.warning, ready: c.positive, stopped: c.negative };

export function StatusDot({ state }: { state: DotState }) {
  const reduce = useReduceMotion();
  const o = useSharedValue(1);
  useEffect(() => {
    if (state === "working" && !reduce) o.value = withRepeat(withTiming(0.35, { duration: 700, easing: Easing.inOut(Easing.quad) }), -1, true);
    else { cancelAnimation(o); o.value = withTiming(1, { duration: 160 }); }
  }, [state, reduce, o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLOR[state] }, a]} />;
}
