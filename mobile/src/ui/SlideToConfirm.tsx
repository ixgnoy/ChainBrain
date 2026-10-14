// Slide-to-confirm ceremony (ported idea: react-bits Micro/SlideCommit, rebuilt on Reanimated + Gesture Handler).
import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Extrapolation, interpolate, interpolateColor, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useTheme } from "../theme";
import { haptic } from "../haptics";
import { useReduceMotion, settle } from "./motion";
import { motion, radius } from "../tokens";
import { T } from "./Text";
import { Icon } from "./Icon";

const THUMB = 52, PAD = 4;

export function SlideToConfirm({ label, doneLabel = "Done", onConfirm, disabled, tone = "accent" }: {
  label: string; doneLabel?: string; onConfirm: () => Promise<void>; disabled?: boolean; tone?: "accent" | "ok";
}) {
  const { c } = useTheme();
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

  const to = tone === "ok" ? c.ok : c.accent;
  const fill = useAnimatedStyle(() => ({
    width: x.value + THUMB + PAD * 2,
    backgroundColor: interpolateColor(x.value / max, [0, 0.7, 1], [to, to, c.ok]),
    opacity: interpolate(x.value, [0, 12], [0.0, 1], Extrapolation.CLAMP),
  }));
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { scale: 1 - done.value * 0.0 }] }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, max * 0.5], [1, 0], Extrapolation.CLAMP) * (1 - done.value) }));
  const check = useAnimatedStyle(() => ({ opacity: done.value, transform: [{ scale: 0.4 + done.value * 0.6 }] }));
  const doneBg = useAnimatedStyle(() => ({ opacity: done.value }));

  return (
    <GestureDetector gesture={pan}>
      <View
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        accessible accessibilityRole="button" accessibilityLabel={label}
        accessibilityActions={[{ name: "activate" }]}
        onAccessibilityAction={() => { if (!disabled && state === "idle") fire(); }}
        style={{ height: THUMB + PAD * 2, borderRadius: radius.pill, backgroundColor: c.bgElev2, borderWidth: 1, borderColor: c.hairlineStrong, justifyContent: "center", overflow: "hidden", opacity: disabled ? 0.45 : 1 }}
      >
        <Animated.View style={[{ position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: radius.pill }, fill]} />
        <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: c.ok }, doneBg]} />
        <Animated.View style={[{ position: "absolute", left: THUMB + PAD * 2, right: 20, alignItems: "center" }, labelStyle]}>
          <T v="body" weight="semi" color="text2">{state === "busy" ? "Signing…" : label}</T>
        </Animated.View>
        <Animated.View style={[{ position: "absolute", left: 0, right: 0, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 }, check]}>
          <Icon name="check" size={22} color="#fff" stroke={2.6} />
          <T v="body" weight="semi" style={{ color: "#fff" }}>{doneLabel}</T>
        </Animated.View>
        <Animated.View style={[{ marginLeft: PAD, width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }, thumb]}>
          <Icon name={state === "done" ? "check" : "chevronRight"} size={24} color={state === "done" ? c.ok : "#111"} stroke={2.4} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
