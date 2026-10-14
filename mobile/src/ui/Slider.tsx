import React, { useState } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { c, motion } from "../tokens";
import { haptic } from "../haptics";
import { EASE_OUT, useReduceMotion } from "./motion";
import { T } from "./Text";

const THUMB = 30;

/** Stepped slider: one selection tick per step, the thumb grows slightly while held, and (when `format` is given) a small value
 *  label rides above the thumb during the drag. Values are numbers in `step` increments. */
export function Slider({ min, max, step, value, onChange, accent, format }: {
  min: number; max: number; step: number; value: number; onChange: (v: number) => void; accent?: string; format?: (v: number) => string;
}) {
  const [w, setW] = useState(0);
  const reduce = useReduceMotion();
  const span = Math.max(w - THUMB, 1);
  const frac = max > min ? (value - min) / (max - min) : 0;
  const x = useSharedValue(0);
  const grow = useSharedValue(0);
  const dragging = useSharedValue(false);
  const last = useSharedValue(value);
  React.useEffect(() => {
    if (dragging.value) return;
    x.value = reduce ? frac * span : withSpring(frac * span, motion.spring.smooth);
  }, [frac, span, dragging, x, reduce]);

  const emit = (v: number) => { haptic.tick(); onChange(v); };
  const g = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      dragging.value = true;
      x.value = Math.min(Math.max(e.x - THUMB / 2, 0), span);
      grow.value = reduce ? 1 : withSpring(1, motion.spring.snappy);
    })
    .onUpdate((e) => {
      const px = Math.min(Math.max(e.x - THUMB / 2, 0), span);
      x.value = px;
      const raw = min + (px / span) * (max - min);
      const v = Math.min(max, Math.max(min, Math.round(raw / step) * step));
      const r = Math.round(v * 1e6) / 1e6;
      if (r !== last.value) { last.value = r; scheduleOnRN(emit, r); }
    })
    .onFinalize(() => {
      dragging.value = false;
      grow.value = reduce ? 0 : withSpring(0, motion.spring.press);
    });

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { scale: 1 + grow.value * 0.18 }] }));
  const fill = useAnimatedStyle(() => ({ width: x.value + THUMB / 2 }));
  const tip = useAnimatedStyle(() => ({ opacity: grow.value, transform: [{ translateX: x.value + THUMB / 2 }, { translateY: -(8 + grow.value * 6) }] }));
  return (
    <GestureDetector gesture={g}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: 44, justifyContent: "center" }} accessible accessibilityRole="adjustable" accessibilityValue={{ min, max, now: value }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => { haptic.tick(); onChange(Math.min(max, Math.max(min, Math.round((value + (e.nativeEvent.actionName === "increment" ? step : -step)) * 1e6) / 1e6))); }}>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: c.fill }} />
        <Animated.View style={[{ position: "absolute", left: 0, height: 8, borderRadius: 4, backgroundColor: accent ?? c.accent }, fill]} />
        {format ? (
          <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: -22, width: 0, alignItems: "center", overflow: "visible" }, tip]}>
            <View style={{ minWidth: 48, paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: c.ink, alignItems: "center", justifyContent: "center" }}>
              <T v="cap" w="semi" numberOfLines={1} style={{ color: c.onAccent }}>{format(value)}</T>
            </View>
          </Animated.View>
        ) : null}
        <Animated.View style={[{ position: "absolute", left: 0, width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: c.card, borderWidth: 3, borderColor: accent ?? c.accent }, thumb]} />
      </View>
    </GestureDetector>
  );
}
