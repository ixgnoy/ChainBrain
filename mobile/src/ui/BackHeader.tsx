import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "./primitives";
import { T } from "./Text";

export function BackHeader({ title, right, onBack, close }: { title?: string; right?: React.ReactNode; onBack?: () => void; close?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 16, paddingBottom: 10, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <IconButton icon={close ? "x" : "chevronLeft"} label={close ? "Close" : "Back"} onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace("/")))} />
      <T v="title" style={{ flex: 1 }} numberOfLines={1}>{title}</T>
      {right}
    </View>
  );
}
