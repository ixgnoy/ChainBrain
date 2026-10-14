import React from "react";
import { View, type ScrollViewProps } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import { TAB_H } from "./TabBar";

export function Screen({ children, tabs = true, ...p }: ScrollViewProps & { children: React.ReactNode; tabs?: boolean }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Animated.ScrollView
        {...p}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[{ paddingTop: insets.top + 8, paddingBottom: (tabs ? TAB_H + insets.bottom : insets.bottom) + 24 }, p.contentContainerStyle]}
      >
        {children}
      </Animated.ScrollView>
    </View>
  );
}

/** Large screen title row. */
export const Title = ({ children }: { children: React.ReactNode }) => <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>{children}</View>;
