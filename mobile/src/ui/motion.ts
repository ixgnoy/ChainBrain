// Reduced-motion guard shared by every animation (the team's rule: nothing moves when the OS asks for reduced motion).
// One AccessibilityInfo subscription for the whole app; components read it with useReduceMotion().
import { useSyncExternalStore } from "react";
import { AccessibilityInfo } from "react-native";
import { Easing, withSequence, withSpring, withTiming, type SharedValue } from "react-native-reanimated";

let reduced = false;
const subs = new Set<() => void>();
let started = false;
function start() {
  if (started) return;
  started = true;
  AccessibilityInfo.isReduceMotionEnabled().then((v) => { reduced = v; subs.forEach((f) => f()); }).catch(() => {});
  AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => { reduced = v; subs.forEach((f) => f()); });
}
const subscribe = (f: () => void) => { start(); subs.add(f); return () => { subs.delete(f); }; };

export const useReduceMotion = () => useSyncExternalStore(subscribe, () => reduced, () => false);
export const isReducedMotion = () => reduced;

/** Move a shared value to `to`: instantly when reduced, with a spring otherwise. Safe to call from worklets. */
export function settle(v: SharedValue<number>, to: number, reduce: boolean, cfg?: Parameters<typeof withSpring>[1]) {
  "worklet";
  v.value = reduce ? to : withSpring(to, cfg);
}
/** Same with a timing curve. */
export function glide(v: SharedValue<number>, to: number, reduce: boolean, duration = 240) {
  "worklet";
  v.value = reduce ? to : withTiming(to, { duration });
}

/** Strong ease-out: entering content feels instant, then settles (Emil Kowalski / iOS). */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
/** iOS sheet / drawer curve. */
export const EASE_SHEET = Easing.bezier(0.32, 0.72, 0, 1);

/** Horizontal "no" shake for refusals and errors: 5 → 3 → 1 pt, ~450 ms. Returns to 0. */
export function shake(v: SharedValue<number>, reduce: boolean) {
  "worklet";
  if (reduce) { v.value = 0; return; }
  const t = (to: number, d: number) => withTiming(to, { duration: d, easing: EASE_OUT });
  v.value = withSequence(t(-5, 60), t(5, 70), t(-3, 70), t(3, 70), t(-1, 80), t(0, 100));
}

/** Rubber-band past a limit (iOS-style): resistance grows with distance. */
export function rubberband(over: number, dim: number, k = 0.55) {
  "worklet";
  return (over * dim * k) / (dim + k * Math.abs(over));
}
