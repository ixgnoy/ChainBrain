import React from "react";
import { StyleSheet, View, type ScrollViewProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import { useMinimizeOnScroll } from "./minimize";
import { TAB_SPACE } from "./TabBar";

/** Ambient glow behind the top of every screen: premium depth without heavy gradients. */
export function Ambient() {
  const { c, dark } = useTheme();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={[dark ? "rgba(110,86,255,0.20)" : "rgba(110,86,255,0.10)", "rgba(110,86,255,0)"]} style={{ position: "absolute", left: 0, right: 0, top: 0, height: 420 }} />
    </View>
  );
}

export function Screen({ children, tabs = true, ambient = true, ...p }: ScrollViewProps & { children: React.ReactNode; tabs?: boolean; ambient?: boolean }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const onScroll = useMinimizeOnScroll();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {ambient && <Ambient />}
      <Animated.ScrollView
        {...p}
        onScroll={tabs ? onScroll : undefined}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[{ paddingTop: insets.top + 8, paddingBottom: (tabs ? TAB_SPACE : insets.bottom) + 24 }, p.contentContainerStyle]}
      >
        {children}
      </Animated.ScrollView>
    </View>
  );
}

/** Large screen title row. */
export const Title = ({ children }: { children: React.ReactNode }) => <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>{children}</View>;
