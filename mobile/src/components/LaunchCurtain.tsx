// The app's launch, every time it starts (a cold start, and a refresh in Expo Go, which never shows the native splash):
// the four-tile mark locks into place on the grey canvas, the wordmark fades up, and after about a second the curtain fades
// away over Home. It never takes a touch. Reduce Motion: the mark is just there, and the curtain fades sooner.
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { c } from "../tokens";
import { T } from "../ui/Text";
import { BrandMark } from "../ui/BrandMark";
import { useReduceMotion } from "../ui/motion";

/** How long the curtain stays before it fades (ms). */
export const LAUNCH_MS = 1000;

export function LaunchCurtain() {
  const reduce = useReduceMotion();
  const [gone, setGone] = useState(false);
  const o = useSharedValue(1);
  const word = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) word.value = withDelay(380, withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }));
    o.value = withDelay(reduce ? 450 : LAUNCH_MS, withTiming(0, { duration: 280, easing: Easing.out(Easing.quad) }, (done) => { if (done) scheduleOnRN(setGone, true); }));
  }, [reduce, o, word]);
  const curtain = useAnimatedStyle(() => ({ opacity: o.value }));
  const mark = useAnimatedStyle(() => ({ opacity: word.value, transform: [{ translateY: (1 - word.value) * 8 }] }));
  if (gone) return null;
  return (
    <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { zIndex: 100, backgroundColor: c.canvas, alignItems: "center", justifyContent: "center" }, curtain]}>
      <View style={{ alignItems: "center", gap: 18 }}>
        <BrandMark size={84} lock />
        <Animated.View style={mark}><T v="section" style={{ letterSpacing: -0.4 }}>ChainBrain</T></Animated.View>
      </View>
    </Animated.View>
  );
}
