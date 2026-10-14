// Filter pills with one selected background that slides between them (snappy spring) plus a selection haptic. Technique: the row is
// drawn twice; the second copy (teal pills, white text) sits in a rounded window that slides and resizes to the selected pill, so the
// background and the label colour travel together. Measured from layout, so any labels work. Reduced motion: the window jumps.
import React, { useEffect, useRef } from "react";
import { ScrollView, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { c, F, motion, radius } from "../tokens";
import { Press } from "./kit";
import { settle, useReduceMotion } from "./motion";

const pill = { height: 40, paddingHorizontal: 16, borderRadius: radius.pill, justifyContent: "center" } as const;
const label = { fontFamily: F.semi, fontSize: 14, lineHeight: 20 } as const;

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
  const win = useAnimatedStyle(() => ({ opacity: seen.value, width: w.value, transform: [{ translateX: x.value }] }));
  const inner = useAnimatedStyle(() => ({ transform: [{ translateX: -x.value }] }));
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: "row", gap: 8 }}>
        {items.map((f) => (
          <Press key={f.key} haptics="select" scale={0.96} onPress={() => onChange(f.key)} accessibilityRole="button" accessibilityLabel={f.label} accessibilityState={{ selected: value === f.key }}
            onLayout={(e) => { const { x: lx, width } = e.nativeEvent.layout; box.current[f.key] = { x: lx, w: width }; if (f.key === value) move(f.key, !seen.value); }}
            style={[pill, { backgroundColor: c.card }]}>
            <Animated.Text style={[label, { color: c.ink2 }]}>{f.label}</Animated.Text>
          </Press>
        ))}
        <Animated.View pointerEvents="none" aria-hidden importantForAccessibility="no-hide-descendants" style={[{ position: "absolute", left: 0, top: 0, height: 40, overflow: "hidden", borderRadius: radius.pill }, win]}>
          <Animated.View style={[{ flexDirection: "row", gap: 8, width: 600 }, inner]}>
            {items.map((f) => <View key={f.key} style={[pill, { backgroundColor: c.accent }]}><Animated.Text style={[label, { color: c.onAccent }]}>{f.label}</Animated.Text></View>)}
          </Animated.View>
        </Animated.View>
      </View>
    </ScrollView>
  );
}
