import React from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { c, hairline, level1 } from "../tokens";
import { Press } from "./kit";
import { Icon } from "./Icon";
import { T } from "./Text";
import { useReduceMotion } from "./motion";

const Round = ({ icon, label, onPress }: { icon: "chevronLeft" | "x"; label: string; onPress: () => void }) => (
  <Press kind="round" onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.card, borderWidth: 1, borderColor: hairline, alignItems: "center", justifyContent: "center", ...level1 }}>
    <Icon name={icon} size={22} stroke={2.2} />
  </Press>
);

/** Height of the header row below the status bar; pages that scroll under a `scrollY` header pad their content by `insets.top + this`. */
export const BACK_HEADER_H = 64;

/** White squircle back button on the left, centred bold title and optional subtitle (Stitch "Consent Flow" header).
 *  With `scrollY` (a shared value fed by Screen) the header floats over the content: the title is hidden at rest, fades in
 *  as the page's big title scrolls past `revealAt`, and a solid canvas with a hairline fades in behind it (no blur). */
export function BackHeader({ title, sub, right, onBack, close, scrollY, revealAt = 120, muted }: {
  title?: string; sub?: string; right?: React.ReactNode; onBack?: () => void; close?: boolean; scrollY?: SharedValue<number>; revealAt?: number; /** title as a 13/18 muted caption (wizard step counter) */ muted?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const floating = !!scrollY;
  const bg = useAnimatedStyle(() => ({ opacity: scrollY ? interpolate(scrollY.value, [revealAt - 70, revealAt], [0, 1], Extrapolation.CLAMP) : 1 }));
  const ttl = useAnimatedStyle(() => {
    const k = scrollY ? interpolate(scrollY.value, [revealAt - 30, revealAt + 20], [0, 1], Extrapolation.CLAMP) : 1;
    return { opacity: k, transform: [{ translateY: reduce ? 0 : (1 - k) * 6 }] };
  });
  return (
    <View style={[{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 12 }, floating && { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 }]}>
      {floating ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, bg]}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: c.canvas }]} />
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: StyleSheet.hairlineWidth, backgroundColor: c.line }} />
        </Animated.View>
      ) : null}
      <Round icon={close ? "x" : "chevronLeft"} label={close ? "Close" : "Back"} onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace("/")))} />
      <Animated.View style={[{ flex: 1, alignItems: "center" }, ttl]}>
        {muted ? <T v="cap" color="mutedOnCanvas" numberOfLines={1}>{title}</T> : <T v="head" numberOfLines={1}>{title}</T>}
        {sub ? <T v="cap" color="mutedOnCanvas" numberOfLines={1}>{sub}</T> : null}
      </Animated.View>
      <View style={{ width: 44, alignItems: "flex-end" }}>{right}</View>
    </View>
  );
}
