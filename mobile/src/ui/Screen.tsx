import React from "react";
import { View, type ScrollViewProps } from "react-native";
import Animated, { useAnimatedScrollHandler, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { c } from "../tokens";
import { GLASS_TAB_SPACE as TAB_H } from "./glass/GlassTabBar";
import { DOCK_SPACE, useDockShown } from "../components/AskDock";
import { useMinimizeOnScroll } from "./glass/minimize";
import { T } from "./Text";

/** Grey canvas with a scrolling column. Leaves room for the floating tab bar unless `tabs` is false. */
export function Screen({ children, tabs = true, top = true, scrollY, innerRef, ...p }: ScrollViewProps & { children: React.ReactNode; tabs?: boolean; top?: boolean; scrollY?: SharedValue<number>; innerRef?: React.Ref<any> }) {
  const insets = useSafeAreaInsets();
  const dock = useDockShown(); // the ask dock above the tab bar takes room too
  const onScroll = useMinimizeOnScroll(); // scrolling down folds the glass tab bar's labels away
  const track = useAnimatedScrollHandler({ onScroll: (e) => { if (scrollY) scrollY.value = e.contentOffset.y; } }); // feeds a floating BackHeader
  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <Animated.ScrollView
        ref={innerRef}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} scrollEventThrottle={16}
        onScroll={tabs ? onScroll : scrollY ? track : undefined}
        {...(p as any)}
        contentContainerStyle={[{ paddingTop: top ? insets.top + 12 : 0, paddingBottom: (tabs ? TAB_H + (dock ? DOCK_SPACE : 0) : 0) + insets.bottom + 24 }, p.contentContainerStyle]}
      >
        {children}
      </Animated.ScrollView>
    </View>
  );
}

/** Page title: display (Jakarta ExtraBold 32, tight), left aligned, an optional eyebrow above and a quiet line below. */
export function PageTitle({ title, sub, eyebrow, right }: { title: string; sub?: string; eyebrow?: string; right?: React.ReactNode }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 4 }}>
      {eyebrow ? <T v="tab" color="mutedOnCanvas" style={{ textTransform: "uppercase", letterSpacing: 0.9 }}>{eyebrow}</T> : null}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <T v="display" accessibilityRole="header" style={{ flexShrink: 1 }}>{title}</T>
        {right}
      </View>
      {sub ? <T v="body" color="ink2">{sub}</T> : null}
    </View>
  );
}
