import React from "react";
import { ScrollView, View, type ScrollViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { c } from "../tokens";
import { TAB_H } from "./TabBar";
import { T } from "./Text";

/** Grey canvas with a scrolling column. Leaves room for the floating tab bar unless `tabs` is false. */
export function Screen({ children, tabs = true, top = true, ...p }: ScrollViewProps & { children: React.ReactNode; tabs?: boolean; top?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <ScrollView
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
        {...p}
        contentContainerStyle={[{ paddingTop: top ? insets.top + 12 : 0, paddingBottom: (tabs ? TAB_H : 0) + insets.bottom + 24 }, p.contentContainerStyle]}
      >
        {children}
      </ScrollView>
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
