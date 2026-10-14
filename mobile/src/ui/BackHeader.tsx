import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { c, lift } from "../tokens";
import { Press } from "./kit";
import { Icon } from "./Icon";
import { T } from "./Text";

const Round = ({ icon, label, onPress }: { icon: "chevronLeft" | "x"; label: string; onPress: () => void }) => (
  <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.card, alignItems: "center", justifyContent: "center", ...lift, shadowOpacity: 0.04 }}>
    <Icon name={icon} size={22} />
  </Press>
);

/** Round white back button on the left, centred title and optional subtitle (Ryt "Main Account" header). */
export function BackHeader({ title, sub, right, onBack, close }: { title?: string; sub?: string; right?: React.ReactNode; onBack?: () => void; close?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Round icon={close ? "x" : "chevronLeft"} label={close ? "Close" : "Back"} onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace("/")))} />
      <View style={{ flex: 1, alignItems: "center" }}>
        <T v="row" w="semi" numberOfLines={1}>{title}</T>
        {sub ? <T v="cap" color="muted" numberOfLines={1}>{sub}</T> : null}
      </View>
      <View style={{ width: 48, alignItems: "flex-end" }}>{right}</View>
    </View>
  );
}
