import React, { useState } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useTheme } from "../theme";
import { haptic } from "../haptics";

const THUMB = 30;

/** Stepped slider with haptic ticks. Values are numbers in `step` increments. */
export function Slider({ min, max, step, value, onChange, accent }: { min: number; max: number; step: number; value: number; onChange: (v: number) => void; accent?: string }) {
  const { c } = useTheme();
  const [w, setW] = useState(0);
  const span = Math.max(w - THUMB, 1);
  const frac = max > min ? (value - min) / (max - min) : 0;
  const x = useSharedValue(0);
  const dragging = useSharedValue(false);
  const last = useSharedValue(value);
  React.useEffect(() => { if (!dragging.value) x.value = frac * span; }, [frac, span, dragging, x]);

  const emit = (v: number) => { haptic.select(); onChange(v); };
  const g = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => { dragging.value = true; x.value = Math.min(Math.max(e.x - THUMB / 2, 0), span); })
    .onUpdate((e) => {
      const px = Math.min(Math.max(e.x - THUMB / 2, 0), span);
      x.value = px;
      const raw = min + (px / span) * (max - min);
      const v = Math.min(max, Math.max(min, Math.round(raw / step) * step));
      const r = Math.round(v * 1e6) / 1e6;
      if (r !== last.value) { last.value = r; runOnJS(emit)(r); }
    })
    .onFinalize(() => { dragging.value = false; });

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const fill = useAnimatedStyle(() => ({ width: x.value + THUMB / 2 }));
  return (
    <GestureDetector gesture={g}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: 44, justifyContent: "center" }} accessible accessibilityRole="adjustable" accessibilityValue={{ min, max, now: value }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => onChange(Math.min(max, Math.max(min, Math.round((value + (e.nativeEvent.actionName === "increment" ? step : -step)) * 1e6) / 1e6)))}>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: c.bgElev3 }} />
        <Animated.View style={[{ position: "absolute", left: 0, height: 8, borderRadius: 4, backgroundColor: accent ?? c.accent }, fill]} />
        <Animated.View style={[{ position: "absolute", left: 0, width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: c.bgElev1, borderWidth: 2, borderColor: accent ?? c.accent }, thumb]} />
      </View>
    </GestureDetector>
  );
}
