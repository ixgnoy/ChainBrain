// Toasts, adapted from sonner-native (MIT, (c) 2025 Gunnar Torfi Steinarsson; reference/repos/ux-phone/gunnartorfis_sonner-native:
// toast-store timers, use-toast-swipe, use-toast-lifecycle, constants). What is kept: top-centre position, 4 s life, swipe up to
// dismiss, the timer pauses while a finger is on the toast and while the app is in the background, newest on top with the older
// one a slot lower. What is ours: the look (white card, `lift` shadow, 24 px icon, 15/22 title, optional teal action), the
// `notify()` sink in lib/toast.ts (unchanged), no stacking-expand, reduced motion = fade only. Mount `ToastHost` once at the root.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { c, lift, motion } from "../tokens";
import { setToastSink } from "../lib/toast";
import { haptic } from "../haptics";
import { EASE_OUT, rubberband, useReduceMotion } from "./motion";
import { T } from "./Text";
import { Icon, type IconName } from "./Icon";

export type ToastOptions = {
  text: string;
  /** success (default for plain messages), warning (needs you), error */
  tone?: "success" | "warning" | "error";
  icon?: IconName;
  /** teal text button on the right ("View"); tapping the toast anywhere does the same */
  action?: string; onPress?: () => void;
};
type Item = ToastOptions & { id: number };

const SLOT = 80, LIFE = 4000, MAX = 2, OUT = 160, RESUME = 1600;
let seq = 0;
let push: ((t: ToastOptions) => void) | null = null;

/** Rich toast (icon, action). Plain `notify("text")` from lib/toast.ts lands here too, with the tone guessed from the words. */
export const showToast = (t: ToastOptions) => { push?.(t); };

const guess = (text: string): NonNullable<ToastOptions["tone"]> =>
  /could not|couldn't|failed|did not|not reachable|refused|error|wrong/i.test(text) ? "error" : /blocked|reverted|expired|needs your|waiting/i.test(text) ? "warning" : "success";

export function ToastHost() {
  const [items, setItems] = useState<Item[]>([]); // newest first
  const insets = useSafeAreaInsets();
  useEffect(() => {
    push = (t) => {
      const tone = t.tone ?? guess(t.text);
      if (tone === "error") haptic.error(); else if (tone === "warning") haptic.warning();
      setItems((cur) => [{ ...t, tone, id: ++seq }, ...cur.filter((i) => i.text !== t.text)].slice(0, MAX)); // a repeat replaces its older twin
    };
    setToastSink((text) => push?.({ text }));
    return () => { push = null; setToastSink(null); };
  }, []);
  const remove = useCallback((id: number) => setItems((cur) => cur.filter((i) => i.id !== id)), []);
  if (!items.length) return null;
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 16, right: 16, top: insets.top + 8, zIndex: 90 }}>
      {items.map((it, i) => <ToastItem key={it.id} item={it} index={i} onGone={remove} />)}
    </View>
  );
}

const TONE = {
  success: { icon: "check", bg: c.accentSoft, fg: c.accent },
  warning: { icon: "shield", bg: c.warningSoft, fg: c.warning },
  error: { icon: "alert", bg: c.negativeSoft, fg: c.negative },
} as const;

function ToastItem({ item, index, onGone }: { item: Item; index: number; onGone: (id: number) => void }) {
  const reduce = useReduceMotion();
  const tone = TONE[item.tone ?? "success"];
  const lift0 = reduce ? 0 : -12;
  const y = useSharedValue(lift0);
  const op = useSharedValue(0);
  const slot = useSharedValue(index);
  const drag = useSharedValue(0);
  const gone = useSharedValue(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finish = useCallback(() => onGone(item.id), [onGone, item.id]);

  const dismiss = useCallback(() => {
    if (gone.value) return;
    gone.value = true;
    if (timer.current) clearTimeout(timer.current);
    op.value = withTiming(0, { duration: OUT, easing: EASE_OUT }, (f) => { if (f) scheduleOnRN(finish); });
    if (!reduce) y.value = withTiming(y.value + drag.value - 16, { duration: OUT, easing: EASE_OUT });
    drag.value = 0;
  }, [reduce, finish]); // eslint-disable-line react-hooks/exhaustive-deps
  const arm = useCallback((ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(dismiss, ms);
  }, [dismiss]);
  const pause = useCallback(() => { if (timer.current) clearTimeout(timer.current); }, []);

  useEffect(() => {
    op.value = withTiming(1, { duration: reduce ? motion.base : 260, easing: EASE_OUT });
    y.value = withTiming(0, { duration: 260, easing: EASE_OUT });
    arm(LIFE);
    // sonner-native: the clock stops while the app is away
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") arm(RESUME); else pause(); });
    return () => { sub.remove(); if (timer.current) clearTimeout(timer.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { slot.value = reduce ? index : withSpring(index, motion.spring.snappy); }, [index, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  const press = useCallback(() => { item.onPress?.(); dismiss(); }, [item, dismiss]);
  const pan = Gesture.Pan()
    .activeOffsetY([-6, 6])
    .onBegin(() => { scheduleOnRN(pause); })
    .onUpdate((e) => { drag.value = e.translationY < 0 ? e.translationY : rubberband(e.translationY, 120); })
    .onEnd((e) => {
      if (e.translationY < -24 || e.velocityY < -500) scheduleOnRN(dismiss);
      else { drag.value = withSpring(0, { ...motion.spring.release, velocity: e.velocityY }); scheduleOnRN(arm, RESUME); }
    })
    .onFinalize((_e, ok) => { if (!ok) { drag.value = withSpring(0, motion.spring.release); scheduleOnRN(arm, RESUME); } });
  const tap = Gesture.Tap().maxDistance(10).onEnd((_e, ok) => { if (ok) scheduleOnRN(press); });

  const style = useAnimatedStyle(() => ({ opacity: op.value * (1 - 0.35 * Math.min(slot.value, 1)), transform: [{ translateY: y.value + drag.value + slot.value * SLOT }, { scale: 1 - 0.03 * Math.min(slot.value, 1) }] }));
  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      <Animated.View
        accessibilityLiveRegion="polite" accessibilityRole="alert" accessibilityLabel={item.text}
        style={[{ position: "absolute", left: 0, right: 0, top: 0, zIndex: 90 - index }, style]}
      >
        <View style={{ minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingLeft: 12, paddingRight: 16, borderRadius: 16, backgroundColor: c.card, ...lift }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: tone.bg, alignItems: "center", justifyContent: "center" }}>
            <Icon name={item.icon ?? tone.icon} size={18} color={tone.fg} stroke={2.2} />
          </View>
          <T v="sub" w="semi" numberOfLines={2} style={{ flex: 1, fontSize: 15, lineHeight: 22 }}>{item.text}</T>
          {item.action ? <T v="sub" w="semi" color="accent">{item.action}</T> : null}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
