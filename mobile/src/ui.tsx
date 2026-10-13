import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, useColorScheme, type TextStyle } from "react-native";

export const usePalette = () => {
  const dark = useColorScheme() === "dark";
  return dark
    ? { bg: "#0f1115", card: "#181b21", text: "#e8eaed", muted: "#9aa0a6", line: "#2a2f37", accent: "#4c8dff", danger: "#ef5350", warnBg: "#2b2112", warn: "#ffb74d", ok: "#66bb6a" }
    : { bg: "#f6f7f9", card: "#ffffff", text: "#16181d", muted: "#6b7280", line: "#e3e6ea", accent: "#1f6feb", danger: "#c62828", warnBg: "#fff4e5", warn: "#8a4b00", ok: "#1b7f3a" };
};

export function Card(props: { children: ReactNode }) {
  const p = usePalette();
  return <View style={[s.card, { backgroundColor: p.card, borderColor: p.line }]}>{props.children}</View>;
}

export function T(props: { children: ReactNode; muted?: boolean; big?: boolean; bold?: boolean; color?: string; mono?: boolean; style?: TextStyle }) {
  const p = usePalette();
  return (
    <Text style={[{ color: props.color ?? (props.muted ? p.muted : p.text), fontSize: props.big ? 28 : props.muted ? 13 : 15 },
      props.bold && { fontWeight: "600" }, props.big && { fontWeight: "700" }, props.mono && { fontFamily: "Courier" }, props.style]}>
      {props.children}
    </Text>
  );
}

export function Btn(props: { label: string; onPress(): void; kind?: "primary" | "ghost" | "danger"; disabled?: boolean }) {
  const p = usePalette();
  const bg = props.kind === "ghost" ? "transparent" : props.kind === "danger" ? p.danger : p.accent;
  return (
    <Pressable accessibilityRole="button" disabled={props.disabled} onPress={props.onPress}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, borderColor: props.kind === "ghost" ? p.line : bg, opacity: props.disabled ? 0.5 : pressed ? 0.8 : 1 }]}>
      <Text style={{ color: props.kind === "ghost" ? p.text : "#fff", fontWeight: "600", fontSize: 15 }}>{props.label}</Text>
    </Pressable>
  );
}

export const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12, gap: 6 },
  btn: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, alignItems: "center", minHeight: 44, justifyContent: "center" },
  row: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, minHeight: 44 },
});
