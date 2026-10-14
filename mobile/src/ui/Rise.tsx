// Entrance wrapper used by the agent chat and the Activity tab: fade + small rise (and optional scale) driven by the motion
// tokens, interruptible, UI-thread. Siblings shift with a critically damped layout spring. Reduced motion: a 180 ms fade only.
// Also: a stagger helper (items that mount in the same render enter 40-60 ms apart) and a once-per-id guard for haptics.
import React, { useEffect, useRef } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeOut, LinearTransition, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from "react-native-reanimated";
import { motion, type SpringName } from "../tokens";
import { EASE_OUT, useReduceMotion } from "./motion";

/** Layout spring for neighbours that move when something is inserted or resized (the "smooth" token). */
export const SHIFT = LinearTransition.springify().duration(motion.spring.smooth.duration).dampingRatio(motion.spring.smooth.dampingRatio);

export type RiseProps = {
  children?: React.ReactNode; style?: StyleProp<ViewStyle>;
  /** ms before the entrance starts (stagger) */ delay?: number;
  /** start offset in pt (rises into place) */ dy?: number;
  /** start scale, 1 = none */ from?: number;
  /** spring token, or a timing curve when `duration` is set (calm cards: no bounce) */ spring?: SpringName; duration?: number;
  /** neighbours animate to their new place when this item enters or its size changes */ layout?: boolean;
  /** fade out quickly (160 ms) when removed */ exit?: boolean;
  /** already on screen: no entrance (beyond a stagger cap, or adopted from an optimistic copy) */ instant?: boolean;
  /** called once when the entrance starts (haptics) */ onEnter?: () => void;
};

const PLACE = new Set(["alignSelf", "maxWidth", "minWidth", "width", "margin", "marginTop", "marginBottom", "marginLeft", "marginRight", "marginHorizontal", "marginVertical", "flex", "flexGrow", "flexShrink", "position", "left", "right", "top", "bottom"]);
function splitStyle(style: StyleProp<ViewStyle>) {
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const outer: Record<string, unknown> = {}, inner: Record<string, unknown> = {};
  for (const k of Object.keys(flat)) (PLACE.has(k) ? outer : inner)[k] = flat[k];
  return { outer: outer as ViewStyle, inner: inner as ViewStyle };
}

export function Rise({ children, style, delay = 0, dy = 6, from = 1, spring = "smooth", duration, layout, exit, instant, onEnter }: RiseProps) {
  const reduce = useReduceMotion();
  const p = useSharedValue(instant ? 1 : 0);
  const o = useSharedValue(instant ? 1 : 0);
  const enter = useRef(onEnter);
  enter.current = onEnter;
  useEffect(() => {
    if (instant) return;
    if (reduce) {
      p.value = 1;
      o.value = withDelay(delay, withTiming(1, { duration: 180 }));
    } else {
      o.value = withDelay(delay, withTiming(1, { duration: duration ? Math.min(duration, 240) : 220, easing: EASE_OUT }));
      p.value = withDelay(delay, duration ? withTiming(1, { duration, easing: EASE_OUT }) : withSpring(1, motion.spring[spring]));
    }
    const t = setTimeout(() => enter.current?.(), delay);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const a = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: (1 - p.value) * dy }, { scale: from + (1 - from) * p.value }] }));
  // layout / exit animations live on an outer view (a view with its own animated opacity may not also carry them); placement
  // styles go outside, everything else (gap, direction, padding) wraps the children inside
  const { outer, inner } = splitStyle(style);
  return (
    <Animated.View layout={layout && !reduce ? SHIFT : undefined} exiting={exit ? FadeOut.duration(motion.exit) : undefined} style={outer}>
      <Animated.View style={[inner, a]}>{children}</Animated.View>
    </Animated.View>
  );
}

/** Entrance delay per key for items that appear in the same render: 0, step, 2*step ... Keys already shown get 0 and are ignored
 *  (they are mounted). Items beyond `cap` get -1 (show at once, no entrance): "max 6 rows". */
export function useStagger(keys: string[], step = 50, cap = 6) {
  const seen = useRef<Set<string>>(new Set());
  const out: Record<string, number> = {};
  let n = 0;
  for (const k of keys) {
    if (seen.current.has(k)) { out[k] = 0; continue; }
    out[k] = n < cap ? n * step : -1;
    n++;
  }
  useEffect(() => { keys.forEach((k) => seen.current.add(k)); });
  return out;
}

/** True the first time `id` is asked for in this app session: haptics and shakes on cards must not replay when the tab re-mounts them. */
const played = new Set<string>();
export function firstTime(id: string) {
  if (played.has(id)) return false;
  played.add(id);
  return true;
}
