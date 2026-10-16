// Entrance helpers for Home, the pocket page and the receipt: fade + short rise on the UI thread (`smooth` spring, no bounce),
// staggered by index. Reduced motion: 180 ms fade only. `play=false` renders settled (tab revisits).
// Once an entrance has had time to finish, the view takes a plain style from React (`useSettled`): Reanimated 4 hands settled
// animated styles back to React (FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS, a native flag Expo Go can't change) and now and
// then React's first-render style (opacity 0) won, leaving Home's cards invisible for good though the value had reached 1.
import React, { useEffect, useState } from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from "react-native-reanimated";
import { motion } from "../tokens";
import { useReduceMotion } from "./motion";

/** False until `ms` after mount (or true at once when `already`): then the caller drops its animated style for a plain one. */
export function useSettled(ms: number, already = false) {
  const [settled, setSettled] = useState(already);
  useEffect(() => {
    if (already) return;
    const t = setTimeout(() => setSettled(true), ms);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return settled;
}

/** Fade + `dy` pt rise. `base + index * step` ms of delay (index capped at 8). */
export function Reveal({ children, index = 0, step = 50, base = 0, dy = 10, play = true, style, hidden }: {
  children: React.ReactNode; index?: number; step?: number; base?: number; dy?: number; play?: boolean; style?: StyleProp<ViewStyle>; /** invisible (still laid out), e.g. while its card is flying */ hidden?: boolean;
}) {
  const reduce = useReduceMotion();
  const p = useSharedValue(play ? 0 : 1);
  const d = base + Math.min(index, 8) * step;
  const settled = useSettled(d + SETTLE_MS, !play);
  useEffect(() => {
    if (!play) return;
    p.value = withDelay(d, reduce ? withTiming(1, { duration: 180 }) : withSpring(1, motion.spring.smooth));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const a = useAnimatedStyle(() => ({ opacity: hidden ? 0 : Math.min(1, p.value * 1.6), transform: [{ translateY: reduce ? 0 : (1 - p.value) * dy }] }));
  return <Animated.View style={[settled ? { opacity: hidden ? 0 : 1, transform: [{ translateY: 0 }] } : a, style]}>{children}</Animated.View>;
}

/** Long enough for the entrance springs (smooth 400 ms, snappy 350 ms) to settle after their delay. */
export const SETTLE_MS = 900;

/** Scale-in for a hero element (avatar 0.92 -> 1 on `snappy`) with a quick fade. Never from 0. */
export function PopIn({ children, from = 0.92, delay = 0, style }: { children: React.ReactNode; from?: number; delay?: number; style?: StyleProp<ViewStyle> }) {
  const reduce = useReduceMotion();
  const p = useSharedValue(0);
  const settled = useSettled(delay + SETTLE_MS);
  useEffect(() => { p.value = withDelay(delay, reduce ? withTiming(1, { duration: 180 }) : withSpring(1, motion.spring.snappy)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const a = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value * 2), transform: [{ scale: reduce ? 1 : from + (1 - from) * p.value }] }));
  return <Animated.View style={[settled ? { opacity: 1, transform: [{ scale: 1 }] } : a, style]}>{children}</Animated.View>;
}
