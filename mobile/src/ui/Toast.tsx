// Toasts: slide down from the top on the `snappy` spring, auto-hide after 2.4 s, swipe up (or flick) to dismiss, and when several
// arrive they stack with the newest on top and the older ones one slot lower. Reduced motion: fades only. Mount once at the root.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { c, lift, motion } from "../tokens";
import { setToastSink } from "../lib/toast";
import { EASE_OUT, rubberband, useReduceMotion } from "./motion";
import { T } from "./Text";

type Item = { id: number; text: string };
const SLOT = 56, LIFE = 2400, MAX = 3, OUT = 140;
let seq = 0;

export function ToastHost() {
  const [items, setItems] = useState<Item[]>([]); // newest first
  const insets = useSafeAreaInsets();
  useEffect(() => {
    const push = (text: string) => setItems((cur) => {
      const next = [{ id: ++seq, text }, ...cur.filter((i) => i.text !== text)]; // a repeat replaces its older twin
      return next.slice(0, MAX);
    });
    setToastSink(push);
    return () => setToastSink(null);
  }, []);
  const remove = useCallback((id: number) => setItems((cur) => cur.filter((i) => i.id !== id)), []);
  if (!items.length) return null;
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 20, right: 20, top: insets.top + 8, zIndex: 90 }}>
      {items.map((it, i) => <ToastItem key={it.id} id={it.id} text={it.text} index={i} onGone={remove} />)}
    </View>
  );
}

function ToastItem({ id, text, index, onGone }: { id: number; text: string; index: number; onGone: (id: number) => void }) {
  const reduce = useReduceMotion();
  const { top } = useSafeAreaInsets();
  const enter = useSharedValue(reduce ? 0 : -(SLOT + top + 24));
  const op = useSharedValue(reduce ? 0 : 1);
  const slot = useSharedValue(index);
  const drag = useSharedValue(0);
  const gone = useSharedValue(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finish = useCallback(() => onGone(id), [onGone, id]);

  const arm = useCallback((ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => dismiss(0), ms);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const dismiss = useCallback((velocity: number) => {
    if (gone.value) return;
    gone.value = true;
    if (timer.current) clearTimeout(timer.current);
    if (reduce) op.value = withTiming(0, { duration: OUT, easing: EASE_OUT }, (f) => { if (f) scheduleOnRN(finish); });
    else {
      op.value = withTiming(0, { duration: OUT, easing: EASE_OUT });
      enter.value = withTiming(enter.value + drag.value - (SLOT + top + 24), { duration: OUT, easing: EASE_OUT }, (f) => { if (f) scheduleOnRN(finish); });
      drag.value = 0;
    }
    void velocity;
  }, [reduce, finish, top]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (reduce) op.value = withTiming(1, { duration: motion.base, easing: EASE_OUT });
    else enter.value = withSpring(0, motion.spring.snappy);
    arm(LIFE);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { slot.value = reduce ? index : withSpring(index, motion.spring.snappy); }, [index, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  const pause = () => { if (timer.current) clearTimeout(timer.current); };
  const pan = Gesture.Pan()
    .activeOffsetY([-6, 6])
    .onBegin(() => { scheduleOnRN(pause); })
    .onUpdate((e) => { drag.value = e.translationY < 0 ? e.translationY : rubberband(e.translationY, 120); })
    .onEnd((e) => {
      if (e.translationY < -24 || e.velocityY < -500) scheduleOnRN(dismiss, e.velocityY);
      else { drag.value = withSpring(0, { ...motion.spring.release, velocity: e.velocityY }); scheduleOnRN(arm, 1600); }
    })
    .onFinalize((_e, ok) => { if (!ok) { drag.value = withSpring(0, motion.spring.release); scheduleOnRN(arm, 1600); } });

  const style = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: enter.value + drag.value + slot.value * SLOT }] }));
  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        accessibilityLiveRegion="polite" accessibilityRole="alert"
        style={[{ position: "absolute", left: 0, right: 0, top: 0, alignItems: "center", zIndex: 90 - index }, style]}
      >
        <View style={{ maxWidth: "100%", backgroundColor: c.ink, borderRadius: 9999, paddingHorizontal: 20, paddingVertical: 12, ...lift }}>
          <T v="sub" w="medium" style={{ color: c.onAccent, textAlign: "center" }}>{text}</T>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
