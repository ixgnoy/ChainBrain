// Hold-to-revoke kill switch (ideas from react-bits Micro/HoldButton, MIT). A 1.2 s hold fills the bar and ring (near-linear with
// a touch of ease-in resistance). Haptics: Light at touch-down, selection ticks at 25/50/75 %, Medium at 90 %, Warning on complete
// followed by a quiet pulse. Letting go early drains the fill back in 200 ms. Pressed scale 0.97. No hold needed either: a tap
// arms it ("Tap again to revoke", the bar fills a third) and a second tap within 6 s completes it; VoiceOver gets "activate".
import React, { useCallback } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, useAnimatedProps, useAnimatedReaction, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import Svg, { Circle } from "react-native-svg";
import { haptic } from "../haptics";
import { EASE_OUT, useReduceMotion } from "./motion";
import { c, motion } from "../tokens";
import { T } from "./Text";
import { Icon } from "./Icon";
import { autoplayAlive, autoplayRun, useAutoplayTarget, type TargetName } from "../lib/autoplayTargets";

const ACircle = Animated.createAnimatedComponent(Circle);
const HOLD_MS = 1200;
const FILL_EASE = Easing.bezier(0.32, 0.1, 0.72, 0.9); // nearly linear, slight resistance at the start
const R = 15, CIRC = 2 * Math.PI * R;
const ARM_MS = 6000;

export function HoldToRevoke({ onComplete, label = "Hold to revoke", disabled, busy, auto }: { onComplete: () => void | Promise<unknown>; label?: string; disabled?: boolean; busy?: boolean; /** auto-play target: the real 1.2 s hold, then the same completion */ auto?: TargetName }) {
  const reduce = useReduceMotion();
  const p = useSharedValue(0);
  const scale = useSharedValue(1);
  const pulse = useSharedValue(0);
  const stage = useSharedValue(0);
  const finished = useSharedValue(false);
  const [w, setW] = React.useState(0);
  const [armed, setArmed] = React.useState(false);
  const armTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => { if (armTimer.current) clearTimeout(armTimer.current); }, []);
  const complete = useCallback(() => { haptic.warning(); return onComplete(); }, [onComplete]);
  const completeNow = React.useRef(complete);
  completeNow.current = complete;
  useAutoplayTarget(auto ?? "sheet.close", async () => {
    if (disabled || busy) return false;
    const run = autoplayRun();
    finished.value = false; stage.value = 0; p.value = 0;
    p.value = withTiming(1, { duration: HOLD_MS, easing: FILL_EASE });
    if (!reduce) scale.value = withTiming(0.97, { duration: motion.pressIn, easing: EASE_OUT });
    haptic.light();
    await new Promise<void>((r) => setTimeout(r, HOLD_MS + 40));
    if (!autoplayAlive(run)) { p.value = withTiming(0, { duration: 200 }); scale.value = withSpring(1, motion.spring.press); return false; }
    finished.value = true; p.value = 1;
    if (!reduce) pulse.value = withSequence(withTiming(1, { duration: 140, easing: EASE_OUT }), withTiming(0, { duration: 360, easing: EASE_OUT }));
    scale.value = reduce ? 1 : withSpring(1, motion.spring.press);
    p.value = withTiming(0, { duration: 500, easing: EASE_OUT });
    await completeNow.current();
  }, !!auto && !disabled && !busy);

  // haptic stages on the UI thread, driven by the fill itself so they stay in sync: 25/50/75 tick, 90 medium
  useAnimatedReaction(
    () => (p.value >= 0.9 ? 4 : p.value >= 0.75 ? 3 : p.value >= 0.5 ? 2 : p.value >= 0.25 ? 1 : 0),
    (s) => {
      if (s > stage.value && !finished.value) {
        stage.value = s;
        scheduleOnRN(s === 4 ? haptic.medium : haptic.tick);
      }
    },
  );

  const g = Gesture.LongPress()
    .enabled(!disabled && !busy)
    .minDuration(HOLD_MS)
    .maxDistance(80)
    .onBegin(() => {
      finished.value = false; stage.value = 0; p.value = 0;
      p.value = withTiming(1, { duration: HOLD_MS, easing: FILL_EASE });
      scale.value = reduce ? 1 : withTiming(0.97, { duration: motion.pressIn, easing: EASE_OUT });
      scheduleOnRN(haptic.light);
    })
    .onStart(() => {
      finished.value = true; p.value = 1;
      pulse.value = reduce ? 0 : withSequence(withTiming(1, { duration: 140, easing: EASE_OUT }), withTiming(0, { duration: 360, easing: EASE_OUT }));
      scheduleOnRN(complete);
    })
    .onFinalize(() => {
      scale.value = reduce ? 1 : withSpring(1, motion.spring.press);
      p.value = finished.value ? withTiming(0, { duration: 500, easing: EASE_OUT }) : withTiming(0, { duration: 200, easing: EASE_OUT });
    });

  // the tap path: first tap arms, second completes
  const onTap = useCallback(() => {
    if (disabled || busy) return;
    if (!armTimer.current) {
      haptic.select();
      setArmed(true);
      p.value = withTiming(0.33, { duration: 220, easing: EASE_OUT });
      armTimer.current = setTimeout(() => { armTimer.current = null; setArmed(false); p.value = withTiming(0, { duration: 200, easing: EASE_OUT }); }, ARM_MS);
      return;
    }
    clearTimeout(armTimer.current);
    armTimer.current = null;
    setArmed(false);
    finished.value = true;
    p.value = withSequence(withTiming(1, { duration: 180, easing: EASE_OUT }), withTiming(0, { duration: 500, easing: EASE_OUT }));
    void complete();
  }, [disabled, busy, p, finished, complete]);
  const tap = Gesture.Tap().enabled(!disabled && !busy).maxDuration(400).onEnd((_e, ok) => { if (ok) scheduleOnRN(onTap); });

  const bar = useAnimatedStyle(() => ({ width: p.value * w }));
  const ring = useAnimatedProps(() => ({ strokeDashoffset: CIRC * (1 - p.value) }));
  const press = useAnimatedStyle(() => ({ transform: [{ scale: scale.value * (1 + pulse.value * 0.012) }] }));
  const glow = useAnimatedStyle(() => ({ opacity: pulse.value * 0.18 }));

  return (
    <GestureDetector gesture={Gesture.Exclusive(g, tap)}>
      <Animated.View
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        accessible accessibilityRole="button" accessibilityLabel={label} accessibilityHint="Press and hold for a moment, or tap twice"
        accessibilityState={{ disabled: !!(disabled || busy), busy: !!busy }}
        accessibilityActions={[{ name: "activate" }]}
        onAccessibilityAction={(e) => { if (e.nativeEvent.actionName === "activate" && !disabled && !busy) complete(); }}
        style={[{ height: 64, borderRadius: 9999, backgroundColor: c.negativeSoft, overflow: "hidden", justifyContent: "center", opacity: disabled ? 0.4 : 1 }, press]}
      >
        <Animated.View style={[{ position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: c.negative, opacity: 0.22 }, bar]} />
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: c.negative }, glow]} />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <View style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}>
            <Svg width={34} height={34} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
              <Circle cx={17} cy={17} r={R} stroke={c.line} strokeWidth={2.5} fill="none" />
              <ACircle cx={17} cy={17} r={R} stroke={c.negative} strokeWidth={2.5} fill="none" strokeDasharray={`${CIRC} ${CIRC}`} strokeLinecap="round" animatedProps={ring} />
            </Svg>
            <Icon name="lock" size={15} color={c.negative} />
          </View>
          <T v="row" w="semi" color="negative">{busy ? "Revoking…" : armed ? "Tap again to confirm" : label}</T>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
