// Composer send button that morphs with a spring: empty (grey arrow) -> ready (teal arrow) -> working (soft teal disc with a turning
// ring while the agent runs). The label stays "Send" for assistive tech and tests. The send haptic is fired by the caller.
import React, { useEffect, useState } from "react";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { c, motion } from "../tokens";
import { Press } from "./kit";
import { Icon } from "./Icon";
import { RunRing } from "./StepMark";
import { settle, useReduceMotion } from "./motion";

export function SendButton({ ready, busy, onPress }: { ready: boolean; busy: boolean; onPress: () => void }) {
  const reduce = useReduceMotion();
  const r = useSharedValue(ready ? 1 : 0);
  const b = useSharedValue(busy ? 1 : 0);
  const [ring, setRing] = useState(busy);
  useEffect(() => {
    settle(r, ready ? 1 : 0, reduce, motion.spring.snappy);
    settle(b, busy ? 1 : 0, reduce, motion.spring.snappy);
    if (busy) { setRing(true); return; }
    const t = setTimeout(() => setRing(false), 240);
    return () => clearTimeout(t);
  }, [ready, busy, reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  const disc = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(b.value, [0, 1], [interpolateColor(r.value, [0, 1], [c.line, c.accent]), c.accentSoft]) }));
  const arrow = useAnimatedStyle(() => ({ opacity: 1 - b.value, transform: [{ scale: 1 - 0.5 * b.value }, { translateY: -4 * b.value }] }));
  const work = useAnimatedStyle(() => ({ opacity: b.value, transform: [{ scale: 0.5 + 0.5 * b.value }] }));
  return (
    <Press onPress={onPress} haptics="none" disabled={!ready || busy} accessibilityRole="button" accessibilityLabel="Send" accessibilityState={{ disabled: !ready || busy, busy }} style={{ width: 44, height: 44 }}>
      <Animated.View style={[{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }, disc]}>
        <Animated.View style={[{ position: "absolute" }, arrow]}><Icon name="arrowUp" size={20} color={ready ? c.onAccent : c.faint} stroke={2.2} /></Animated.View>
        {ring ? <Animated.View style={[{ position: "absolute" }, work]}><RunRing size={22} track="#C3E0E4" /></Animated.View> : null}
      </Animated.View>
    </Press>
  );
}
