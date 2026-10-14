import React from "react";
import { View, type ScrollViewProps } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { c } from "../tokens";
import { GLASS_TAB_SPACE as TAB_H } from "./glass/GlassTabBar";
import { useMinimizeOnScroll } from "./glass/minimize";
import { T } from "./Text";

/** Grey canvas with a scrolling column. Leaves room for the floating tab bar unless `tabs` is false. */
export function Screen({ children, tabs = true, top = true, ...p }: ScrollViewProps & { children: React.ReactNode; tabs?: boolean; top?: boolean }) {
  const insets = useSafeAreaInsets();
  const onScroll = useMinimizeOnScroll(); // scrolling down folds the glass tab bar's labels away
  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <Animated.ScrollView
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} scrollEventThrottle={16}
        onScroll={tabs ? onScroll : undefined}
        {...(p as any)}
        contentContainerStyle={[{ paddingTop: top ? insets.top + 12 : 0, paddingBottom: (tabs ? TAB_H : 0) + insets.bottom + 24 }, p.contentContainerStyle]}
      >
        {children}
      </Animated.ScrollView>
    </View>
  );
}

/** Serif page title (the only place the serif is used), left aligned, with an optional grey line below. */
export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, gap: 4 }}>
      <T v="title" accessibilityRole="header">{title}</T>
      {sub ? <T v="body" color="ink2">{sub}</T> : null}
    </View>
  );
}
