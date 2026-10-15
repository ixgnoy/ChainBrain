// Slide-to-confirm ceremony (ideas from react-bits Micro/SlideCommit, MIT; rebuilt on Reanimated + Gesture Handler).
// Label fades out by 55 % of travel, the grip squashes/stretches with finger speed (max 0.08), a selection tick every 25 % of
// travel, commit on release at >= 90 % or a fling > 800 pt/s past 60 % (Rigid + the grip snaps to the end), then a pending
// state (never shorter than 300 ms) and the done state. Below the threshold the grip springs home with the release velocity.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, Extrapolation, cancelAnimation, interpolate, useAnimatedReaction, useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { haptic } from "../haptics";
import { EASE_OUT, settle, shake, useReduceMotion } from "./motion";
import { c, motion } from "../tokens";
import { T } from "./Text";
import { Icon } from "./Icon";

const THUMB = 48, PAD = 4; // track 56 px: solid teal, white grip (a pale track reads as disabled)
const MIN_PENDING_MS = 300;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function SlideToConfirm({ label, doneLabel = "Done", onConfirm, onDone, disabled }: {
  label: string; doneLabel?: string; onConfirm: () => Promise<void>; /** called ~260 ms after the done state shows */ onDone?: () => void; disabled?: boolean;
}) {
  const [w, setW] = useState(0);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const reduce = useReduceMotion();
  const x = useSharedValue(0);
  const done = useSharedValue(0);
  const pend = useSharedValue(0);
  const spin = useSharedValue(0);
  const stretch = useSharedValue(0);
  const sx = useSharedValue(0);
  const lastTick = useSharedValue(0);
  const drag = useSharedValue(false);
  const max = Math.max(w - THUMB - PAD * 2, 1);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const fire = useCallback(async () => {
    setState("busy");
    pend.value = withTiming(1, { duration: motion.base, easing: EASE_OUT });
    if (!reduce) spin.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.linear }), -1, false);
    const t0 = Date.now();
    let ok = true;
    try { await onConfirm(); } catch { ok = false; }
    const rest = MIN_PENDING_MS - (Date.now() - t0);
    if (rest > 0) await sleep(rest);
    if (!mounted.current) return;
    cancelAnimation(spin);
    if (ok) {
      setState("done");
      pend.value = withTiming(0, { duration: 140 });
      settle(done, 1, reduce, motion.spring.bouncy);
      if (onDone) setTimeout(() => { if (mounted.current) onDone(); }, 260);
    } else {
      haptic.error();
      setState("idle");
      pend.value = withTiming(0, { duration: 160 });
      shake(sx, reduce);
      settle(x, 0, reduce, motion.spring.release);
    }
  }, [onConfirm, onDone, x, done, pend, spin, sx, reduce]);

  // selection tick each time the grip crosses a quarter of the track (both ways), UI thread
  useAnimatedReaction(
    () => Math.floor(Math.min(x.value / max, 1) * 4 + 1e-6),
    (q, prev) => { if (drag.value && prev !== null && q !== prev && q !== lastTick.value) { lastTick.value = q; scheduleOnRN(haptic.tick); } },
    [max],
  );

  const commit = () => { "worklet"; scheduleOnRN(haptic.rigid); x.value = withSpring(max, { ...motion.spring.snappy, velocity: 0 }); scheduleOnRN(fire); };

  const pan = Gesture.Pan()
    .enabled(!disabled && state === "idle")
    .activeOffsetX([-4, 4])
    .failOffsetY([-16, 16])
    .onStart(() => { drag.value = true; lastTick.value = 0; scheduleOnRN(haptic.light); })
    .onUpdate((e) => {
      x.value = Math.min(Math.max(e.translationX, 0), max);
      stretch.value = withTiming(Math.min(Math.abs(e.velocityX) / 2500, 1) * 0.08, { duration: 90 });
    })
    .onEnd((e) => {
      const p = x.value / max;
      stretch.value = withSpring(0, motion.spring.press);
      if (p >= 0.9 || (e.velocityX > 800 && p > 0.6)) commit();
      else x.value = reduce ? 0 : withSpring(0, { ...motion.spring.release, velocity: e.velocityX });
    })
    .onFinalize((_e, ok) => { drag.value = false; if (!ok) { stretch.value = withSpring(0, motion.spring.press); if (x.value < max) x.value = reduce ? 0 : withSpring(0, motion.spring.release); } });

  const fill = useAnimatedStyle(() => ({ width: x.value + THUMB + PAD * 2, opacity: interpolate(x.value, [0, 12], [0, 1], Extrapolation.CLAMP) }));
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { scaleX: 1 + stretch.value }, { scaleY: 1 - stretch.value * 0.75 }] }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, max * 0.55], [1, 0], Extrapolation.CLAMP) * (1 - done.value) }));
  const pending = useAnimatedStyle(() => ({ opacity: pend.value }));
  const spinner = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const check = useAnimatedStyle(() => ({ opacity: done.value, transform: [{ scale: 0.4 + done.value * 0.6 }] }));
  const doneBg = useAnimatedStyle(() => ({ opacity: done.value }));
  const track = useAnimatedStyle(() => ({ transform: [{ translateX: sx.value }] }));

  const R = (THUMB + PAD * 2) / 2;
  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        accessible accessibilityRole="button" accessibilityLabel={label}
        accessibilityState={{ disabled: !!disabled, busy: state === "busy" }}
        accessibilityActions={[{ name: "activate" }]}
        onAccessibilityAction={() => { if (!disabled && state === "idle") { haptic.rigid(); x.value = withSpring(max, motion.spring.snappy); void fire(); } }}
        style={[{ height: THUMB + PAD * 2, borderRadius: R, backgroundColor: c.accent, justifyContent: "center", overflow: "hidden", opacity: disabled ? 0.45 : 1 }, track]}
      >
        <Animated.View style={[{ position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: R, backgroundColor: c.accentPress }, fill]} />
        <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: c.accent }, doneBg]} />
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: THUMB + PAD * 2, right: 20, alignItems: "center" }, labelStyle]}>
          <T v="row" w="semi" numberOfLines={1} style={{ color: c.onAccent }}>{label}</T>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, right: THUMB + PAD * 2, alignItems: "center" }, pending]}>
          <T v="row" w="semi" style={{ color: c.onAccent }}>Signing…</T>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, right: 0, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 }, check]}>
          <Icon name="check" size={22} color={c.onAccent} stroke={2.2} />
          <T v="row" w="semi" style={{ color: c.onAccent }}>{doneLabel}</T>
        </Animated.View>
        <Animated.View style={[{ marginLeft: PAD, width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }, thumb]}>
          {state === "busy" ? (
            <Animated.View style={[{ width: 24, height: 24, borderRadius: 12, borderWidth: 2.5, borderColor: c.accentSoft, borderTopColor: c.accent }, spinner]} />
          ) : (
            <Icon name={state === "done" ? "check" : "chevronRight"} size={24} color={c.accent} stroke={2.2} />
          )}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}
