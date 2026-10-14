// Hold-to-revoke kill switch (ported idea: react-bits Micro/HoldButton). 600 ms hold fills a slate bar and ring, then heavy haptic.
import React, { useCallback } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, runOnJS, useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { haptic } from "../haptics";
import { useReduceMotion } from "./motion";
import { c } from "../tokens";
import { T } from "./Text";
import { Icon } from "./Icon";

const ACircle = Animated.createAnimatedComponent(Circle);
const HOLD_MS = 600;
const R = 15, CIRC = 2 * Math.PI * R;

export function HoldToRevoke({ onComplete, label = "Hold to revoke", disabled, busy }: { onComplete: () => void; label?: string; disabled?: boolean; busy?: boolean }) {
  const reduce = useReduceMotion();
  const p = useSharedValue(0);
  const finished = useSharedValue(false);
  const [w, setW] = React.useState(0);
  const tick = useCallback(() => haptic.light(), []);
  const complete = useCallback(() => { haptic.heavy(); onComplete(); }, [onComplete]);

  const g = Gesture.LongPress()
    .enabled(!disabled && !busy)
    .minDuration(HOLD_MS)
    .maxDistance(80)
    .onBegin(() => {
      finished.value = false;
      p.value = 0;
      p.value = reduce ? 0 : withTiming(1, { duration: HOLD_MS, easing: Easing.linear });
      runOnJS(tick)();
    })
    .onStart(() => { finished.value = true; runOnJS(complete)(); })
    .onFinalize(() => {
      p.value = reduce ? 0 : withTiming(0, { duration: finished.value ? 700 : 220 });
    });

  const bar = useAnimatedStyle(() => ({ width: p.value * w }));
  const ring = useAnimatedProps(() => ({ strokeDashoffset: CIRC * (1 - p.value) }));
  const press = useAnimatedStyle(() => ({ transform: [{ scale: reduce ? 1 : 1 - p.value * 0.015 }] }));

  return (
    <GestureDetector gesture={g}>
      <Animated.View
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        accessible accessibilityRole="button" accessibilityLabel={label} accessibilityHint="Press and hold for a moment to revoke"
        accessibilityState={{ disabled: !!(disabled || busy), busy: !!busy }}
        accessibilityActions={[{ name: "activate" }]}
        onAccessibilityAction={(e) => { if (e.nativeEvent.actionName === "activate" && !disabled && !busy) complete(); }}
        style={[{ height: 64, borderRadius: 9999, backgroundColor: c.negativeSoft, overflow: "hidden", justifyContent: "center", opacity: disabled ? 0.4 : 1 }, press]}
      >
        <Animated.View style={[{ position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: c.negative, opacity: 0.22 }, bar]} />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <View style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}>
            <Svg width={34} height={34} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
              <Circle cx={17} cy={17} r={R} stroke={c.line} strokeWidth={2.5} fill="none" />
              <ACircle cx={17} cy={17} r={R} stroke={c.negative} strokeWidth={2.5} fill="none" strokeDasharray={`${CIRC} ${CIRC}`} strokeLinecap="round" animatedProps={ring} />
            </Svg>
            <Icon name="lock" size={15} color={c.negative} />
          </View>
          <T v="row" w="semi" color="negative">{busy ? "Revoking…" : label}</T>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
