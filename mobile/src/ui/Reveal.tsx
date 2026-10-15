// Entrance helpers for Home, the pocket page and the receipt: fade + short rise on the UI thread (`smooth` spring, no bounce),
// staggered by index. Reduced motion: 180 ms fade only. `play=false` renders settled (tab revisits).
import React, { useEffect } from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from "react-native-reanimated";
import { motion } from "../tokens";
import { useReduceMotion } from "./motion";

/** Fade + `dy` pt rise. `base + index * step` ms of delay (index capped at 8). */
export function Reveal({ children, index = 0, step = 50, base = 0, dy = 10, play = true, style, hidden }: {
  children: React.ReactNode; index?: number; step?: number; base?: number; dy?: number; play?: boolean; style?: StyleProp<ViewStyle>; /** invisible (still laid out), e.g. while its card is flying */ hidden?: boolean;
}) {
  const reduce = useReduceMotion();
  const p = useSharedValue(play ? 0 : 1);
  useEffect(() => {
    if (!play) return;
    const d = base + Math.min(index, 8) * step;
    p.value = withDelay(d, reduce ? withTiming(1, { duration: 180 }) : withSpring(1, motion.spring.smooth));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const a = useAnimatedStyle(() => ({ opacity: hidden ? 0 : Math.min(1, p.value * 1.6), transform: [{ translateY: reduce ? 0 : (1 - p.value) * dy }] }));
  return <Animated.View style={[a, style]}>{children}</Animated.View>;
}

/** Scale-in for a hero element (avatar 0.92 -> 1 on `snappy`) with a quick fade. Never from 0. */
export function PopIn({ children, from = 0.92, delay = 0, style }: { children: React.ReactNode; from?: number; delay?: number; style?: StyleProp<ViewStyle> }) {
  const reduce = useReduceMotion();
  const p = useSharedValue(0);
  useEffect(() => { p.value = withDelay(delay, reduce ? withTiming(1, { duration: 180 }) : withSpring(1, motion.spring.snappy)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const a = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value * 2), transform: [{ scale: reduce ? 1 : from + (1 - from) * p.value }] }));
  return <Animated.View style={[a, style]}>{children}</Animated.View>;
}
