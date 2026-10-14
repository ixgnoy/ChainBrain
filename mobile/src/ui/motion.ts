// Reduced-motion guard shared by every animation (the team's rule: nothing moves when the OS asks for reduced motion).
// One AccessibilityInfo subscription for the whole app; components read it with useReduceMotion().
import { useSyncExternalStore } from "react";
import { AccessibilityInfo } from "react-native";
import { withSpring, withTiming, type SharedValue } from "react-native-reanimated";

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
