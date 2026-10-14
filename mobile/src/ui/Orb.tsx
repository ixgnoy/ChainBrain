import React, { useEffect } from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../theme";
import { useReduceMotion } from "./motion";

export type OrbState = "idle" | "working" | "waiting" | "paused";

/** The living agent orb: idle breathes, working spins an arc and pulses faster, waiting turns amber, paused goes dim. */
export function Orb({ size = 28, state = "idle" }: { size?: number; state?: OrbState }) {
  const { c } = useTheme();
  const breathe = useSharedValue(0);
  const spin = useSharedValue(0);
  const reduce = useReduceMotion();
  useEffect(() => {
    cancelAnimation(breathe); cancelAnimation(spin);
    if (reduce) { breathe.value = state === "paused" ? 0 : 0.5; spin.value = 0; return; }
    const dur = state === "working" ? 700 : state === "waiting" ? 1000 : 2400;
    cancelAnimation(breathe);
    breathe.value = 0;
    if (state !== "paused") breathe.value = withRepeat(withTiming(1, { duration: dur, easing: Easing.inOut(Easing.quad) }), -1, true);
    cancelAnimation(spin);
    if (state === "working") { spin.value = 0; spin.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.linear }), -1, false); }
  }, [state, breathe, spin, reduce]);
  const glow = useAnimatedStyle(() => ({ opacity: 0.25 + breathe.value * 0.45, transform: [{ scale: 1 + breathe.value * 0.35 }] }));
  const core = useAnimatedStyle(() => ({ transform: [{ scale: 0.94 + breathe.value * 0.06 }] }));
  const arc = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }], opacity: state === "working" && !reduce ? 1 : 0 }));
  const colors: [string, string] = state === "waiting" ? ["#FFD36B", "#FF8A1F"] : state === "paused" ? ["#5B6370", "#2B2F36"] : ["#38E1FF", "#6E56FF"];
  const glowColor = state === "waiting" ? c.stepup : state === "paused" ? c.text3 : c.agent;
  const ring = size + 6;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: glowColor }, glow]} />
      <Animated.View style={[{ width: size * 0.78, height: size * 0.78, borderRadius: size, overflow: "hidden" }, core]}>
        <LinearGradient colors={colors} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ flex: 1 }} />
        <LinearGradient colors={["rgba(255,255,255,0.55)", "rgba(255,255,255,0)"]} start={{ x: 0.2, y: 0 }} end={{ x: 0.6, y: 0.7 }} style={{ position: "absolute", left: 0, right: 0, top: 0, height: "60%" }} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{ position: "absolute", width: ring, height: ring }, arc]}>
        <Svg width={ring} height={ring}>
          <Circle cx={ring / 2} cy={ring / 2} r={ring / 2 - 1.5} stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeDasharray={`${ring * 0.9} ${ring * 3}`} fill="none" />
        </Svg>
      </Animated.View>
    </View>
  );
}
