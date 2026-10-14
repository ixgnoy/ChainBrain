import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../theme";
import { useReduceMotion } from "./motion";

export type OrbState = "idle" | "working" | "waiting" | "paused";

/** The agent mark: a solid jade disc in a hairline ring. Idle breathes slowly, working spins a jade arc, waiting turns amber, paused goes grey. No glow. */
export function Orb({ size = 28, state = "idle" }: { size?: number; state?: OrbState }) {
  const { c } = useTheme();
  const breathe = useSharedValue(0);
  const spin = useSharedValue(0);
  const reduce = useReduceMotion();
  useEffect(() => {
    cancelAnimation(breathe); cancelAnimation(spin);
    breathe.value = 0; spin.value = 0;
    if (reduce || state === "paused") return;
    breathe.value = withRepeat(withTiming(1, { duration: state === "working" ? 800 : state === "waiting" ? 1100 : 2600, easing: Easing.inOut(Easing.quad) }), -1, true);
    if (state === "working") spin.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.linear }), -1, false);
  }, [state, breathe, spin, reduce]);
  const core = useAnimatedStyle(() => ({ opacity: 0.8 + breathe.value * 0.2 }));
  const arc = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }], opacity: state === "working" && !reduce ? 1 : 0 }));
  const fill = state === "waiting" ? c.stepup : state === "paused" ? c.revoked : c.accent;
  const ring = size;
  const r = ring / 2 - 1.5;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={ring} height={ring} style={{ position: "absolute" }}>
        <Circle cx={ring / 2} cy={ring / 2} r={r} stroke={c.hairlineStrong} strokeWidth={1.5} fill="none" />
      </Svg>
      <Animated.View style={[{ width: size * 0.5, height: size * 0.5, borderRadius: size, backgroundColor: fill }, core]} />
      <Animated.View pointerEvents="none" style={[{ position: "absolute", width: ring, height: ring }, arc]}>
        <Svg width={ring} height={ring}>
          <Circle cx={ring / 2} cy={ring / 2} r={r} stroke={fill} strokeWidth={2} strokeLinecap="round" strokeDasharray={`${ring * 0.9} ${ring * 3}`} fill="none" />
        </Svg>
      </Animated.View>
    </View>
  );
}
