// Slide-to-confirm ceremony (ported idea: react-bits Micro/SlideCommit, rebuilt on Reanimated + Gesture Handler).
import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Extrapolation, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { haptic } from "../haptics";
import { useReduceMotion, settle } from "./motion";
import { c, motion } from "../tokens";
import { T } from "./Text";
import { Icon } from "./Icon";

const THUMB = 56, PAD = 4;

export function SlideToConfirm({ label, doneLabel = "Done", onConfirm, disabled }: {
  label: string; doneLabel?: string; onConfirm: () => Promise<void>; disabled?: boolean;
}) {
  const [w, setW] = useState(0);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const reduce = useReduceMotion();
  const x = useSharedValue(0);
  const done = useSharedValue(0);
  const max = Math.max(w - THUMB - PAD * 2, 1);

  const fire = useCallback(async () => {
    setState("busy");
    haptic.medium();
    try {
      await onConfirm();
      haptic.success();
      setState("done");
      settle(done, 1, reduce, { damping: 14, stiffness: 180 });
    } catch {
      haptic.error();
      setState("idle");
      settle(x, 0, reduce, motion.spring.ui);
    }
  }, [onConfirm, x, done, reduce]);

  const pan = Gesture.Pan()
    .enabled(!disabled && state === "idle")
    .activeOffsetX([-4, 4])
    .onStart(() => { runOnJS(haptic.light)(); })
    .onUpdate((e) => { x.value = Math.min(Math.max(e.translationX, 0), max); })
    .onEnd(() => {
      if (x.value > max * 0.88) { settle(x, max, reduce, motion.spring.ui); runOnJS(fire)(); }
      else settle(x, 0, reduce, motion.spring.ui);
    });

  const fill = useAnimatedStyle(() => ({
    width: x.value + THUMB + PAD * 2,
    opacity: interpolate(x.value, [0, 12], [0.0, 1], Extrapolation.CLAMP),
  }));
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, max * 0.5], [1, 0], Extrapolation.CLAMP) * (1 - done.value) }));
  const check = useAnimatedStyle(() => ({ opacity: done.value, transform: [{ scale: 0.4 + done.value * 0.6 }] }));
  const doneBg = useAnimatedStyle(() => ({ opacity: done.value }));

  const R = (THUMB + PAD * 2) / 2;
  return (
    <GestureDetector gesture={pan}>
      <View
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        accessible accessibilityRole="button" accessibilityLabel={label}
        accessibilityActions={[{ name: "activate" }]}
        onAccessibilityAction={() => { if (!disabled && state === "idle") fire(); }}
        style={{ height: THUMB + PAD * 2, borderRadius: R, backgroundColor: c.accentSoft, justifyContent: "center", overflow: "hidden", opacity: disabled ? 0.45 : 1 }}
      >
        <Animated.View style={[{ position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: R, backgroundColor: c.accent }, fill]} />
        <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: c.accent }, doneBg]} />
        <Animated.View style={[{ position: "absolute", left: THUMB + PAD * 2, right: 20, alignItems: "center" }, labelStyle]}>
          <T v="row" w="semi" color="accent">{state === "busy" ? "Signing…" : label}</T>
        </Animated.View>
        <Animated.View style={[{ position: "absolute", left: 0, right: 0, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 }, check]}>
          <Icon name="check" size={22} color={c.onAccent} stroke={2.2} />
          <T v="row" w="semi" style={{ color: c.onAccent }}>{doneLabel}</T>
        </Animated.View>
        <Animated.View style={[{ marginLeft: PAD, width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }, thumb]}>
          <Icon name={state === "done" ? "check" : "chevronRight"} size={24} color={c.accent} stroke={2.2} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
