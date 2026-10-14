// Floating glass tab bar: sliding pill, haptics, minimise on scroll, iOS 26 Liquid Glass when available, blur or solid elsewhere.
// Structure and constants adapted from expo-glass-tabs (MIT, David Mokos): src/glass-tab-bar.tsx. See THIRD_PARTY.md.
import React from "react";
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import { useApp } from "../store";
import { useReduceMotion, settle } from "./motion";
import { haptic } from "../haptics";
import { Icon, type IconName } from "./Icon";
import { setMinimized, useMinimizeState } from "./minimize";

const H_EXP = 60, H_MIN = 46, MARGIN = 16, MIN_INSET = 36, PAD = 5;
const SLIDE = { duration: 420, dampingRatio: 0.82 };
const ICONS: Record<string, { icon: IconName; label: string }> = {
  index: { icon: "home", label: "Home" },
  agent: { icon: "sparkle", label: "Agent" },
  activity: { icon: "activity", label: "Activity" },
  settings: { icon: "settings", label: "Settings" },
};
const AnimatedGlass = Animated.createAnimatedComponent(GlassView);

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { c, dark } = useTheme();
  const { pending } = useApp();
  const reduce = useReduceMotion();
  const insets = useSafeAreaInsets();
  const { width: W } = useWindowDimensions();
  const min = useMinimizeState();
  const count = state.routes.length;
  const slide = useSharedValue(state.index);
  React.useEffect(() => { settle(slide, state.index, reduce, SLIDE); }, [state.index, slide, reduce]);

  const liquid = Platform.OS === "ios" && isLiquidGlassAvailable();
  const bottom = Math.max(insets.bottom - 6, 14);

  const bar = useAnimatedStyle(() => ({
    height: interpolate(min.progress.value, [0, 1], [H_EXP, H_MIN], Extrapolation.CLAMP),
    marginHorizontal: interpolate(min.progress.value, [0, 1], [0, MIN_INSET], Extrapolation.CLAMP),
    borderRadius: 40,
  }));
  const pill = useAnimatedStyle(() => {
    const barW = W - MARGIN * 2 - interpolate(min.progress.value, [0, 1], [0, MIN_INSET * 2], Extrapolation.CLAMP);
    const itemW = (barW - PAD * 2) / count;
    const h = interpolate(min.progress.value, [0, 1], [H_EXP - PAD * 2, H_MIN - PAD * 2], Extrapolation.CLAMP);
    return { width: itemW, height: h, borderRadius: h / 2, transform: [{ translateX: PAD + itemW * slide.value }] };
  });
  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(min.progress.value, [0, 0.4], [1, 0], Extrapolation.CLAMP),
    height: interpolate(min.progress.value, [0, 1], [13, 0], Extrapolation.CLAMP),
  }));

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
      {/* soft fade so content never collides with the bar */}
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: bottom + H_EXP + 40, backgroundColor: c.bg, opacity: 0 }} />
      <View pointerEvents="box-none" style={{ marginHorizontal: MARGIN, marginBottom: bottom }}>
        <Animated.View style={[bar, { shadowColor: "#000", shadowOpacity: dark ? 0.5 : 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } }]}>
          {liquid ? (
            <AnimatedGlass glassEffectStyle="regular" style={[StyleSheet.absoluteFill, { borderRadius: 40, backgroundColor: dark ? "rgba(10,10,12,0.45)" : "rgba(255,255,255,0.35)" }]} />
          ) : (
            <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 40, overflow: "hidden", borderWidth: 1, borderColor: c.glassBorder }]}>
              {Platform.OS !== "android" && <BlurView intensity={70} tint={dark ? "dark" : "light"} style={StyleSheet.absoluteFill} />}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === "android" ? (dark ? "rgba(18,20,22,0.97)" : "rgba(255,255,255,0.97)") : dark ? "rgba(14,16,18,0.62)" : "rgba(255,255,255,0.72)" }]} />
              <View style={{ position: "absolute", top: 0, left: 24, right: 24, height: 1, backgroundColor: c.glassRim }} />
            </Animated.View>
          )}
          <Animated.View style={[{ position: "absolute", left: 0, top: PAD, backgroundColor: dark ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.07)", borderCurve: "continuous" }, pill]} />
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: PAD }}>
            {state.routes.map((r, i) => {
              const meta = ICONS[r.name] ?? { icon: "home" as IconName, label: r.name };
              const focused = state.index === i;
              const tint = focused ? c.text : c.text3;
              const badge = r.name === "agent" && pending.length > 0;
              return (
                <Pressable
                  key={r.key}
                  accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={meta.label}
                  onPress={() => {
                    haptic.select();
                    setMinimized(min, 0);
                    const ev = navigation.emit({ type: "tabPress", target: r.key, canPreventDefault: true });
                    if (!focused && !ev.defaultPrevented) navigation.navigate(r.name, r.params);
                  }}
                  style={{ flex: 1, alignItems: "center", justifyContent: "center", height: "100%" }}
                >
                  <View>
                    <Icon name={meta.icon} size={22} color={tint} stroke={focused ? 2.2 : 1.8} />
                    {badge && <View style={{ position: "absolute", right: -3, top: -2, width: 9, height: 9, borderRadius: 5, backgroundColor: c.stepup, borderWidth: 1.5, borderColor: dark ? "#0E1012" : "#fff" }} />}
                  </View>
                  <Animated.Text numberOfLines={1} style={[{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: tint, marginTop: 3, overflow: "hidden" }, labelStyle]}>{meta.label}</Animated.Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

export const TAB_SPACE = 120;
