import React, { useEffect } from "react";
import { Platform, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useTheme, F } from "../theme";
import { useReduceMotion, settle, glide } from "./motion";
import { haptic } from "../haptics";
import { motion, radius } from "../tokens";
import { T, Mono, type TColor } from "./Text";
import { Icon, type IconName } from "./Icon";
import type { ChipKind } from "../tokens";
import { reasonText } from "../lib/shared";

const APressable = Animated.createAnimatedComponent(Pressable);

/** Pressable with a spring scale (0.98) and optional haptic. */
export function Press({ children, style, onPress, haptics = "light", scale = 0.97, ...p }: PressableProps & { style?: StyleProp<ViewStyle>; haptics?: "light" | "select" | "none"; scale?: number }) {
  const reduce = useReduceMotion();
  const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <APressable
      {...p}
      onPressIn={(e) => { glide(s, scale, reduce, 80); p.onPressIn?.(e); }}
      onPressOut={(e) => { settle(s, 1, reduce, motion.spring.ui); p.onPressOut?.(e); }}
      onPress={(e) => { if (haptics !== "none") haptic[haptics](); onPress?.(e); }}
      style={[a, style]}
    >
      {children as React.ReactNode}
    </APressable>
  );
}

export function Glass({ children, style, strong, intensity, radiusPx = radius.pill, noBorder }: { children?: React.ReactNode; style?: StyleProp<ViewStyle>; strong?: boolean; intensity?: number; radiusPx?: number; noBorder?: boolean }) {
  const { c, dark } = useTheme();
  const tint = Platform.OS === "ios" ? (dark ? "systemChromeMaterialDark" : "systemChromeMaterialLight") : dark ? "dark" : "light";
  return (
    <View style={[{ borderRadius: radiusPx, overflow: "hidden", borderCurve: "continuous", position: "relative", zIndex: 0 } as ViewStyle, !noBorder && { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: c.glassBorder }, style]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: -1 }]}>
      {Platform.OS !== "android" && <BlurView intensity={intensity ?? (strong ? 70 : 45)} tint={tint as any} style={StyleSheet.absoluteFill} />}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === "android" ? (dark ? "rgba(20,22,25,0.96)" : "rgba(255,255,255,0.96)") : strong ? c.glassStrong : c.glass }]} />
      {/* specular rim */}
      <View pointerEvents="none" style={{ position: "absolute", top: 0, left: radiusPx / 2, right: radiusPx / 2, height: 1, backgroundColor: c.glassRim, opacity: dark ? 0.7 : 1 }} />
      </View>
      {children}
    </View>
  );
}

export function Card({ children, style, pad = 16 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; pad?: number }) {
  const { c } = useTheme();
  return <View style={[{ backgroundColor: c.bgElev1, borderRadius: radius.lg, borderWidth: 1, borderColor: c.hairline, padding: pad, borderCurve: "continuous" } as ViewStyle, style]}>{children}</View>;
}

export function Button({ label, onPress, kind = "primary", icon, disabled, loading, style, small }: {
  label: string; onPress?: () => void; kind?: "primary" | "secondary" | "ghost" | "danger"; icon?: IconName; disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; small?: boolean;
}) {
  const { c } = useTheme();
  const bg = kind === "primary" ? c.accent : kind === "secondary" ? c.bgElev3 : kind === "danger" ? c.refusedBg : "transparent";
  const fg: TColor = kind === "primary" ? "onAccent" : kind === "danger" ? "refused" : "text";
  return (
    <Press
      onPress={disabled || loading ? undefined : onPress}
      accessibilityRole="button"
      style={[{ height: small ? 40 : 52, borderRadius: radius.pill, backgroundColor: bg, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, paddingHorizontal: 22, opacity: disabled ? 0.45 : 1 },
        kind === "danger" && { borderWidth: 1, borderColor: c.refusedBorder }, style]}
    >
      {icon && <Icon name={icon} size={small ? 16 : 18} color={c[fg]} />}
      <T v={small ? "bodySm" : "body"} weight="semi" color={fg}>{loading ? "Working…" : label}</T>
    </Press>
  );
}

export function IconButton({ icon, onPress, size = 40, color, bg, label }: { icon: IconName; onPress?: () => void; size?: number; color?: string; bg?: string; label?: string }) {
  const { c } = useTheme();
  return (
    <Press onPress={onPress} accessibilityLabel={label} accessibilityRole="button" style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg ?? c.bgElev2, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.hairline }}>
      <Icon name={icon} size={size * 0.48} color={color ?? c.text} />
    </Press>
  );
}

const CHIP_ICON: Record<ChipKind, IconName> = { ok: "check", refused: "x", stepup: "shieldAlert", revoked: "lock", info: "refresh" };
export function Chip({ kind, label, dot = true, pulse }: { kind: ChipKind; label: string; dot?: boolean; pulse?: boolean }) {
  const { c } = useTheme();
  const col = { ok: [c.ok, c.okBg, c.okBorder], refused: [c.refused, c.refusedBg, c.refusedBorder], stepup: [c.stepup, c.stepupBg, c.stepupBorder], revoked: [c.revoked, c.revokedBg, c.revokedBorder], info: [c.info, c.infoBg, c.infoBorder] }[kind];
  const o = useSharedValue(1);
  const x = useSharedValue(0);
  const reduce = useReduceMotion();
  useEffect(() => {
    if (reduce) return;
    if (pulse ?? kind === "stepup") o.value = withRepeat(withTiming(0.35, { duration: 800, easing: Easing.inOut(Easing.quad) }), -1, true);
    if (kind === "refused") x.value = withSequence(withTiming(-4, { duration: 40 }), withTiming(4, { duration: 80 }), withTiming(-3, { duration: 80 }), withTiming(0, { duration: 40 }));
  }, [kind, pulse, o, x, reduce]);
  const dotStyle = useAnimatedStyle(() => ({ opacity: o.value }));
  const wrap = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <Animated.View style={[{ flexDirection: "row", alignItems: "center", gap: 6, height: 24, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: col[1], borderWidth: 1, borderColor: col[2], alignSelf: "flex-start" }, wrap]}>
      {dot ? <Animated.View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: col[0] }, dotStyle]} /> : <Icon name={CHIP_ICON[kind]} size={12} color={col[0]} />}
      <T v="caption" style={{ color: col[0], fontSize: 12, lineHeight: 16 }}>{label}</T>
    </Animated.View>
  );
}

/** Mono reason code chip. Optionally shows the human text and guard label under it. */
export function ReasonChip({ code, tone = "refused" }: { code: string; tone?: "refused" | "stepup" | "neutral" }) {
  const { c } = useTheme();
  const col = tone === "refused" ? c.refused : tone === "stepup" ? c.stepup : c.text2;
  return (
    <View style={{ backgroundColor: c.bgElev3, borderRadius: 8, paddingHorizontal: 8, height: 22, justifyContent: "center", alignSelf: "flex-start", borderWidth: 1, borderColor: tone === "neutral" ? c.hairline : tone === "refused" ? c.refusedBorder : c.stepupBorder }}>
      <Mono size={11} style={{ color: col }}>{code}</Mono>
    </View>
  );
}

export function ReasonLine({ code, tone = "refused" }: { code: string; tone?: "refused" | "stepup" | "neutral" }) {
  return (
    <View style={{ gap: 4 }}>
      <ReasonChip code={code} tone={tone} />
      <T v="bodySm" color="text2">{reasonText(code)}</T>
    </View>
  );
}

/** Shown whenever GET /dev/health answered: the app talks to the local anvil fork, not Base Sepolia. */
export function DevBadge() {
  const { c } = useTheme();
  return (
    <View accessibilityLabel="Local fork" style={{ height: 22, paddingHorizontal: 8, borderRadius: radius.pill, backgroundColor: c.stepupBg, borderWidth: 1, borderColor: c.stepupBorder, justifyContent: "center", alignSelf: "flex-start" }}>
      <T v="caption" style={{ color: c.stepup, fontSize: 10, lineHeight: 12, letterSpacing: 0.8, fontFamily: F.bodySemi }}>LOCAL FORK</T>
    </View>
  );
}

export function TestnetPill() {
  const { c } = useTheme();
  return (
    <View style={{ height: 22, paddingHorizontal: 8, borderRadius: radius.pill, backgroundColor: c.infoBg, borderWidth: 1, borderColor: c.infoBorder, flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start" }}>
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c.info }} />
      <T v="caption" style={{ color: c.info, fontSize: 10, lineHeight: 12, letterSpacing: 0.6, fontFamily: F.bodySemi }}>TESTNET</T>
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 10 }}>
      <T v="title">{title}</T>
      {action ? <Press haptics="none" onPress={onAction} hitSlop={10}><T v="bodySm" color="accentHi" weight="semi">{action}</T></Press> : null}
    </View>
  );
}

export function Segmented<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", backgroundColor: c.bgElev2, borderRadius: radius.pill, padding: 3, borderWidth: 1, borderColor: c.hairline }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Press key={o.key} haptics="select" scale={0.96} onPress={() => onChange(o.key)} style={{ flex: 1, height: 36, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: on ? c.bgElev3 : "transparent" }}>
            <T v="bodySm" weight="semi" color={on ? "text" : "text2"}>{o.label}</T>
          </Press>
        );
      })}
    </View>
  );
}

export function Avatar({ letter, size = 36 }: { letter: string; size?: number }) {
  const { c } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.bgElev3, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.hairlineStrong }}>
      <T v="bodySm" weight="bold">{letter}</T>
    </View>
  );
}

export const Divider = () => { const { c } = useTheme(); return <View style={{ height: 1, backgroundColor: c.hairline }} />; };

/** Spacer-friendly row. */
export const Row = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => <View style={[{ flexDirection: "row", alignItems: "center" }, style]}>{children}</View>;
