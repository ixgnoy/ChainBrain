// Status mark for one agent step: idle dot -> running ring (a 0.68 arc turning linearly, 900 ms per turn) -> drawn check (done) or
// drawn X (refused), strokes draw in 220-240 ms. "ask" is a calm warning ring (waiting for the owner). No loops except while running.
// Idea from React Bits StatusMark (MIT); written for Reanimated + react-native-svg.
import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import Animated, { Easing, cancelAnimation, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";
import { c } from "../tokens";
import { EASE_OUT, useReduceMotion } from "./motion";

const APath = Animated.createAnimatedComponent(Path);
const CHECK = "M7.5 12.5 L10.6 15.6 L16.5 9";
const CROSS = "M8.5 8.5 L15.5 15.5 M15.5 8.5 L8.5 15.5";
const LEN = 14;
const R = 9, CIRC = 2 * Math.PI * R;

export type StepState = "idle" | "run" | "ok" | "refused" | "ask";

/** The turning arc alone (also the "working" glyph inside the composer's send button). */
export function RunRing({ size = 18, color = c.accent, track = c.line }: { size?: number; color?: string; track?: string }) {
  const reduce = useReduceMotion();
  const rot = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    rot.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(rot);
  }, [reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  const a = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  return (
    <Animated.View style={[{ width: size, height: size }, a]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={R} stroke={track} strokeWidth={2.4} fill="none" />
        <Circle cx={12} cy={12} r={R} stroke={color} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeDasharray={`${CIRC * 0.68} ${CIRC}`} />
      </Svg>
    </Animated.View>
  );
}

function Drawn({ kind, size }: { kind: "ok" | "x"; size: number }) {
  const reduce = useReduceMotion();
  const draw = useSharedValue(reduce ? 0 : LEN);
  const disc = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    disc.value = withTiming(1, { duration: 120, easing: EASE_OUT });
    draw.value = withDelay(60, withTiming(0, { duration: kind === "ok" ? 220 : 240, easing: EASE_OUT }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const stroke = useAnimatedProps(() => ({ strokeDashoffset: draw.value }));
  const fade = useAnimatedStyle(() => ({ opacity: disc.value }));
  const tone = kind === "ok" ? c.accent : c.negative;
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[{ position: "absolute", width: size, height: size }, fade]}>
        <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={11} fill={kind === "ok" ? c.accentSoft : c.negativeSoft} /></Svg>
      </Animated.View>
      <Svg width={size} height={size} viewBox="0 0 24 24" style={{ position: "absolute" }}>
        <APath d={kind === "ok" ? CHECK : CROSS} stroke={tone} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={LEN} animatedProps={stroke} />
      </Svg>
    </View>
  );
}

export function StepMark({ state, size = 18 }: { state: StepState; size?: number }) {
  const label = state === "run" ? "Working" : state === "ok" ? "Done" : state === "refused" ? "Refused" : state === "ask" ? "Waiting for you" : undefined;
  return (
    <View accessible={!!label} accessibilityLabel={label} style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {state === "idle" ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.faint }} />
        : state === "run" ? <RunRing size={size} />
        : state === "ok" ? <Drawn kind="ok" size={size} />
        : state === "refused" ? <Drawn kind="x" size={size} />
        : (
          <Svg width={size} height={size} viewBox="0 0 24 24">
            <Circle cx={12} cy={12} r={R} stroke={c.warning} strokeWidth={2} fill={c.warningSoft} />
            <Circle cx={12} cy={12} r={2.4} fill={c.warning} />
          </Svg>
        )}
    </View>
  );
}
