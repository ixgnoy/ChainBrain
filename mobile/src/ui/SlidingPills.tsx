// Underline filter tabs (DESIGN.md "Segmentation Tabs"): minimal text tabs, the active one bold ink with a 2 px black bar that
// slides and resizes under it (snappy spring), inactive tabs muted. Selection haptic. Measured from layout, so any labels work.
// Reduced motion: the bar jumps. (Kept the old component name for its callers.)
import React, { useEffect, useRef } from "react";
import { ScrollView, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { c, F, motion } from "../tokens";
import { Press } from "./kit";
import { settle, useReduceMotion } from "./motion";

export function SlidingPills<K extends string>({ items, value, onChange }: { items: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  const reduce = useReduceMotion();
  const box = useRef<Record<string, { x: number; w: number }>>({});
  const x = useSharedValue(0), w = useSharedValue(0), seen = useSharedValue(0);
  const move = (k: string, jump: boolean) => {
    const m = box.current[k];
    if (!m) return;
    if (jump) { x.value = m.x; w.value = m.w; seen.value = 1; return; }
    settle(x, m.x, reduce, motion.spring.snappy); settle(w, m.w, reduce, motion.spring.snappy);
  };
  useEffect(() => { move(value, !seen.value); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const bar = useAnimatedStyle(() => ({ opacity: seen.value, width: w.value, transform: [{ translateX: x.value }] }));
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 16 }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: "row", gap: 24 }}>
        {items.map((f) => {
          const on = value === f.key;
          return (
            <Press key={f.key} haptics="select" scale={0.96} onPress={() => onChange(f.key)} accessibilityRole="button" accessibilityLabel={f.label} accessibilityState={{ selected: on }}
              onLayout={(e) => { const { x: lx, width } = e.nativeEvent.layout; box.current[f.key] = { x: lx, w: width }; if (f.key === value) move(f.key, !seen.value); }}
              style={{ minHeight: 44, justifyContent: "center" }}>
              <Animated.Text style={{ fontFamily: on ? F.bold : F.medium, fontSize: 15, lineHeight: 20, letterSpacing: -0.15, color: on ? c.ink : c.mutedOnCanvas }}>{f.label}</Animated.Text>
            </Press>
          );
        })}
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, bottom: 0, height: 2, borderRadius: 1, backgroundColor: c.ink }, bar]} />
      </View>
    </ScrollView>
  );
}
