// Solid tab bar: e1 surface, hairline top border, jade indicator that slides to the active tab. No glass, no blur, no shadow.
import React from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, F } from "../theme";
import { useApp } from "../store";
import { useReduceMotion, settle } from "./motion";
import { haptic } from "../haptics";
import { Icon, type IconName } from "./Icon";

export const TAB_H = 60;
const SLIDE = { duration: 320, dampingRatio: 0.9 };
const ICONS: Record<string, { icon: IconName; label: string }> = {
  index: { icon: "home", label: "Home" },
  agent: { icon: "sparkle", label: "Agent" },
  activity: { icon: "activity", label: "Activity" },
  settings: { icon: "settings", label: "Settings" },
};

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { c } = useTheme();
  const { pending } = useApp();
  const reduce = useReduceMotion();
  const insets = useSafeAreaInsets();
  const { width: W } = useWindowDimensions();
  const count = state.routes.length;
  const slide = useSharedValue(state.index);
  React.useEffect(() => { settle(slide, state.index, reduce, SLIDE); }, [state.index, slide, reduce]);
  const itemW = W / count;
  const bar = useAnimatedStyle(() => ({ transform: [{ translateX: itemW * slide.value + itemW * 0.25 }] }));

  return (
    <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: c.bgElev1, borderTopWidth: 1, borderTopColor: c.hairline, paddingBottom: insets.bottom }}>
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: -1, width: itemW * 0.5, height: 2, borderRadius: 1, backgroundColor: c.accent }, bar]} />
      <View style={{ flexDirection: "row", height: TAB_H }}>
        {state.routes.map((r, i) => {
          const meta = ICONS[r.name] ?? { icon: "home" as IconName, label: r.name };
          const focused = state.index === i;
          const tint = focused ? c.accentInk : c.text3;
          const badge = r.name === "agent" && pending.length > 0;
          return (
            <Pressable
              key={r.key}
              accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={meta.label}
              onPress={() => {
                haptic.select();
                const ev = navigation.emit({ type: "tabPress", target: r.key, canPreventDefault: true });
                if (!focused && !ev.defaultPrevented) navigation.navigate(r.name, r.params);
              }}
              style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 3 }}
            >
              <View>
                <Icon name={meta.icon} size={22} color={tint} stroke={focused ? 2.1 : 1.7} />
                {badge && <View style={{ position: "absolute", right: -4, top: -3, width: 9, height: 9, borderRadius: 5, backgroundColor: c.stepup, borderWidth: 1.5, borderColor: c.bgElev1 }} />}
              </View>
              <Animated.Text numberOfLines={1} style={{ fontSize: 12, lineHeight: 16, fontFamily: focused ? F.bodySemi : F.bodyMed, color: tint }}>{meta.label}</Animated.Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
