// Confirmation mark for money moments (funded, paid, approved, saved) and failures: the disc springs in from 0.6 (never
// from 0), then the check (or X) draws itself and the haptic fires as the stroke starts. Ideas from React Bits StatusMark /
// SpringCheck (MIT); written for Reanimated + react-native-svg. Reduced motion: shown complete, haptic only.
import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import Animated, { useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from "react-native-reanimated";
import { c, motion } from "../tokens";
import { haptic } from "../haptics";
import { EASE_OUT, useReduceMotion } from "./motion";

const APath = Animated.createAnimatedComponent(Path);
const CHECK = "M7.5 12.5 L10.6 15.6 L16.5 9";
const CROSS = "M8.5 8.5 L15.5 15.5 M15.5 8.5 L8.5 15.5";
const LEN = 14; // generous path length for the dash trick (both glyphs are shorter)

export function SuccessMark({ kind = "success", size = 64, delay = 0, haptics = true }: { kind?: "success" | "error"; size?: number; delay?: number; haptics?: boolean }) {
  const reduce = useReduceMotion();
  const ring = useSharedValue(reduce ? 1 : 0.6);
  const ringO = useSharedValue(reduce ? 1 : 0);
  const draw = useSharedValue(reduce ? 0 : LEN);
  const color = kind === "success" ? c.accent : c.negative;

  useEffect(() => {
    const buzz = () => { if (haptics) (kind === "success" ? haptic.success : haptic.error)(); };
    if (reduce) { buzz(); return; } // the haptic is timed from JS so it lines up with the stroke on every platform
    ringO.value = withDelay(delay, withTiming(1, { duration: 120 }));
    ring.value = withDelay(delay, withSpring(1, motion.spring.bouncy));
    draw.value = withDelay(delay + 140, withTiming(0, { duration: 260, easing: EASE_OUT }));
    const t = setTimeout(buzz, delay + 140);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const disc = useAnimatedStyle(() => ({ opacity: ringO.value, transform: [{ scale: ring.value }] }));
  const stroke = useAnimatedProps(() => ({ strokeDashoffset: draw.value }));

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={kind === "success" ? "Done" : "Failed"} style={{ width: size, height: size }}>
      <Animated.View style={[{ width: size, height: size }, disc]}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={12} fill={color} />
          <APath d={kind === "success" ? CHECK : CROSS} stroke={c.onAccent} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={LEN} animatedProps={stroke} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** The "landing dip" for the card that holds a SuccessMark: 1 → 0.974 → 1 over ~460 ms. Call with the card's scale value. */
export function landingDip(scale: { value: number }, reduce: boolean) {
  "worklet";
  if (reduce) return;
  scale.value = withTiming(0.974, { duration: 140, easing: EASE_OUT }, () => { scale.value = withSpring(1, motion.spring.bouncy); });
}
