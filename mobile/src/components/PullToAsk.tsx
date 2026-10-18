// Home's top, two layers: an ink back layer with the brand's hatch behind the header, and the app on a front sheet over it
// (index.tsx). And pull to ask. Pulling Home down past the line opens the chat with ChainBrain: a hint above the header says
// "Pull to ask ChainBrain", then "Release to ask" with one tick as it crosses. A short pull still fans the card stack.
// The header's "Ask ChainBrain" pill is the visible way in; this is the shortcut. Expo web and Android have no overscroll,
// so there the pill is the only way.
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedReaction, useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { c } from "../tokens";
import { haptic } from "../haptics";
import { T } from "../ui/Text";
import { BrandMark } from "../ui/BrandMark";
import { Hatch } from "../ui/Hatch";

/** How far to pull before letting go opens the chat (pt). The card stack fans from about 72 pt. */
export const ASK_PULL = 100;

/** Home's back layer: ink with the brand's hatch, from far above the status bar (the rubber-band overscroll shows it too)
 *  to a little under the header, where the front sheet's rounded corners sit on it. Anchored at the header's top. */
export function InkBand({ above, below }: { /** from the header's top up to the screen's top */ above: number; /** from the header's top down to under the sheet's corners */ below: number }) {
  const over = 700;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: -(above + over), height: above + over + below, backgroundColor: c.ink, overflow: "hidden" }}>
      <Hatch color={c.white} pitch={9} stroke={1.2} opacity={0.07} />
    </View>
  );
}

/** The hint above the header while Home is pulled down. */
export function PullHint({ scrollY, top }: { scrollY: SharedValue<number>; top: number }) {
  const [ready, setReady] = useState(false);
  useAnimatedReaction(() => scrollY.value < -ASK_PULL, (now, was) => {
    if (now === was) return;
    scheduleOnRN(setReady, now);
    if (now) scheduleOnRN(haptic.select);
  });
  const style = useAnimatedStyle(() => {
    const pull = -scrollY.value;
    return { opacity: interpolate(pull, [24, 70], [0, 1], Extrapolation.CLAMP), transform: [{ scale: interpolate(pull, [24, ASK_PULL], [0.9, 1], Extrapolation.CLAMP) }] };
  });
  // fills as the pull nears the line
  const fill = useAnimatedStyle(() => ({ width: `${interpolate(-scrollY.value, [24, ASK_PULL], [0, 100], Extrapolation.CLAMP)}%` }));
  return (
    <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={[{ position: "absolute", left: 0, right: 0, top: top - 52, alignItems: "center" }, style]}>
      <View style={{ height: 36, paddingLeft: 6, paddingRight: 14, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.14)", flexDirection: "row", alignItems: "center", gap: 8, overflow: "hidden" }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.vermillion, right: undefined }, fill]} />
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.white, alignItems: "center", justifyContent: "center" }}><BrandMark size={14} /></View>
        <T v="cap" w="bold" style={{ color: c.white }}>{ready ? "Release to ask ChainBrain" : "Pull to ask ChainBrain"}</T>
      </View>
    </Animated.View>
  );
}
