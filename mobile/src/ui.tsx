import { useEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, Text, View, useColorScheme, type TextStyle } from "react-native";

// Same tokens as the web app: zinc neutrals, one emerald accent. ok = accent (one accent per app).
export const usePalette = () => {
  const dark = useColorScheme() === "dark";
  return dark
    ? { bg: "#0c0c0e", card: "#151518", sunken: "#1d1d21", text: "#ececee", muted: "#a1a1aa", line: "#2a2a30", accent: "#34c38f", accentSoft: "#10291f", accentText: "#0c0c0e", danger: "#f2766b", dangerSoft: "#2c1513", warnBg: "#2a1f10", warn: "#f5b25c", ok: "#34c38f" }
    : { bg: "#f4f4f5", card: "#fcfcfc", sunken: "#ececee", text: "#18181b", muted: "#5f5f68", line: "#dedee2", accent: "#0b7a57", accentSoft: "#e3f3ec", accentText: "#fafafa", danger: "#b42318", dangerSoft: "#fdecea", warnBg: "#fff3e0", warn: "#8a4b00", ok: "#0b7a57" };
};

// Loaded in App.tsx with useFonts.
export const F = { sans: "Geist_400Regular", semi: "Geist_600SemiBold", mono: "GeistMono_500Medium", monoBold: "GeistMono_600SemiBold" };

export function useReduceMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setR).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setR);
    return () => sub.remove();
  }, []);
  return r;
}

export function Card(props: { children: ReactNode }) {
  const p = usePalette();
  return <View style={[s.card, { backgroundColor: p.card, borderColor: p.line }]}>{props.children}</View>;
}

export function T(props: { children: ReactNode; muted?: boolean; big?: boolean; bold?: boolean; color?: string; mono?: boolean; style?: TextStyle }) {
  const p = usePalette();
  const fontFamily = props.big ? F.monoBold : props.mono ? F.mono : props.bold ? F.semi : F.sans;
  return (
    <Text style={[{ fontFamily, color: props.color ?? (props.muted ? p.muted : p.text), fontSize: props.big ? 30 : props.muted ? 13 : 15, lineHeight: props.big ? 38 : props.muted ? 18 : 21 },
      props.big && { letterSpacing: -0.5 }, props.mono && !props.big && { fontSize: 13, lineHeight: 19 }, props.style]}>
      {props.children}
    </Text>
  );
}

export function Btn(props: { label: string; onPress(): void; kind?: "primary" | "ghost" | "danger"; disabled?: boolean; icon?: (color: string) => ReactNode }) {
  const p = usePalette();
  const reduce = useReduceMotion();
  const bg = props.kind === "ghost" ? "transparent" : props.kind === "danger" ? p.danger : p.accent;
  const fg = props.kind === "ghost" ? p.text : props.kind === "danger" ? "#fafafa" : p.accentText;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!props.disabled }} disabled={props.disabled} onPress={props.onPress}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, borderColor: props.kind === "ghost" ? p.line : bg, opacity: props.disabled ? 0.5 : 1 },
        pressed && !reduce && { transform: [{ scale: 0.98 }] }, pressed && { opacity: 0.85 }]}>
      {props.icon?.(fg)}
      <Text numberOfLines={1} style={{ color: fg, fontFamily: F.semi, fontSize: 15 }}>{props.label}</Text>
    </Pressable>
  );
}

export const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12, gap: 8 },
  btn: { borderWidth: 1, borderRadius: 999, paddingVertical: 11, paddingHorizontal: 18, minHeight: 44, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, minHeight: 44, fontFamily: F.sans },
});
