// Floating white pill tab bar (Ryt style): 16 px from the edges and the bottom safe area, active item = grey pill with accent icon and label.
import React from "react";
import { Pressable, View } from "react-native";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { c, F, lift } from "../tokens";
import { useApp } from "../store";
import { haptic } from "../haptics";
import { Icon, type IconName } from "./Icon";
import { T } from "./Text";

const BAR_H = 68;
/** Space a screen must leave at the bottom (without the safe area inset). */
export const TAB_H = BAR_H + 16;
const TABS: Record<string, { icon: IconName; label: string }> = {
  index: { icon: "home", label: "Home" },
  agent: { icon: "chat", label: "Agent" },
  activity: { icon: "activity", label: "Activity" },
  settings: { icon: "settings", label: "Settings" },
};

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { pending } = useApp();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 16, right: 16, bottom: Math.max(insets.bottom, 12) }}>
      <View style={{ height: BAR_H, borderRadius: 9999, backgroundColor: c.card, flexDirection: "row", alignItems: "center", paddingHorizontal: 8, ...lift }}>
        {state.routes.map((r, i) => {
          const meta = TABS[r.name] ?? { icon: "home" as IconName, label: r.name };
          const focused = state.index === i;
          const tint = focused ? c.accent : c.ink2;
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
              style={{ flex: 1, height: 56, borderRadius: 9999, backgroundColor: focused ? c.fill : "transparent", alignItems: "center", justifyContent: "center", gap: 2 }}
            >
              <View>
                <Icon name={meta.icon} size={22} color={tint} />
                {badge && <View style={{ position: "absolute", right: -5, top: -3, width: 10, height: 10, borderRadius: 5, backgroundColor: c.negative, borderWidth: 2, borderColor: focused ? c.fill : c.card }} />}
              </View>
              <T v="tab" style={{ color: tint, fontFamily: focused ? F.semi : F.medium }}>{meta.label}</T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
