import React, { useEffect } from "react";
import { Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useTheme } from "../theme";
import { useReduceMotion, settle, glide } from "./motion";
import { haptic } from "../haptics";
import { motion, radius } from "../tokens";
import { T, Mono, type TColor } from "./Text";
import { Icon, type IconName } from "./Icon";
import type { ChipKind } from "../tokens";
import { reasonText } from "../lib/shared";
import { Button as UIButton } from "../components/ui/button";
import { Card as UICard } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Text as UIText } from "../components/ui/text";
import { Separator } from "../components/ui/separator";

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

export function Card({ children, style, pad = 16 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; pad?: number }) {
  return <UICard className="gap-0 p-0" style={[{ padding: pad }, style]}>{children}</UICard>;
}

/** Reusables Button (jade primary, hairline secondary, refused-tint danger) with the app's haptic and icon support. */
export function Button({ label, onPress, kind = "primary", icon, disabled, loading, style, small }: {
  label: string; onPress?: () => void; kind?: "primary" | "secondary" | "ghost" | "danger"; icon?: IconName; disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; small?: boolean;
}) {
  const { c } = useTheme();
  const variant = kind === "primary" ? "default" : kind === "danger" ? "destructive" : kind;
  const ic = kind === "primary" ? c.onAccent : kind === "danger" ? c.refusedText : c.text;
  return (
    <UIButton
      variant={variant}
      size={small ? "sm" : "default"}
      disabled={disabled}
      onPress={disabled || loading ? undefined : () => { haptic.light(); onPress?.(); }}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={style}
    >
      {icon && <Icon name={icon} size={small ? 16 : 18} color={ic} />}
      <UIText>{loading ? "Working…" : label}</UIText>
    </UIButton>
  );
}

export function IconButton({ icon, onPress, size = 44, color, bg, label }: { icon: IconName; onPress?: () => void; size?: number; color?: string; bg?: string; label?: string }) {
  const { c } = useTheme();
  return (
    <Press onPress={onPress} accessibilityLabel={label} accessibilityRole="button" style={{ width: Math.max(size, 44), height: Math.max(size, 44), borderRadius: radius.md, backgroundColor: bg ?? c.bgElev1, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.hairline }}>
      <Icon name={icon} size={20} color={color ?? c.text} />
    </Press>
  );
}

const CHIP_ICON: Record<ChipKind, IconName> = { ok: "check", refused: "x", stepup: "shieldAlert", revoked: "lock", info: "refresh" };
export function Chip({ kind, label, dot = true, pulse }: { kind: ChipKind; label: string; dot?: boolean; pulse?: boolean }) {
  const { c } = useTheme();
  const fill = { ok: c.ok, refused: c.refused, stepup: c.stepup, revoked: c.revoked, info: c.info }[kind];
  const o = useSharedValue(1);
  const x = useSharedValue(0);
  const reduce = useReduceMotion();
  useEffect(() => {
    if (reduce) return;
    if (pulse ?? kind === "stepup") o.value = withRepeat(withTiming(0.35, { duration: 800, easing: Easing.inOut(Easing.quad) }), -1, true);
    if (kind === "refused") x.value = withSequence(withTiming(-3, { duration: 40 }), withTiming(3, { duration: 80 }), withTiming(-2, { duration: 80 }), withTiming(0, { duration: 40 }));
  }, [kind, pulse, o, x, reduce]);
  const dotStyle = useAnimatedStyle(() => ({ opacity: o.value }));
  const wrap = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <Animated.View style={[{ alignSelf: "flex-start" }, wrap]}>
      <Badge variant={kind} className="h-6">
        {dot ? <Animated.View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: fill }, dotStyle]} /> : <Icon name={CHIP_ICON[kind]} size={12} color={fill} stroke={2.2} />}
        <UIText>{label}</UIText>
      </Badge>
    </Animated.View>
  );
}

/** Mono reason code chip. Optionally shows the human text and guard label under it. */
export function ReasonChip({ code, tone = "refused" }: { code: string; tone?: "refused" | "stepup" | "neutral" }) {
  const { c } = useTheme();
  const col = tone === "refused" ? c.refusedText : tone === "stepup" ? c.stepupText : c.text2;
  return (
    <View style={{ backgroundColor: c.bgElev2, borderRadius: radius.xs, paddingHorizontal: 8, height: 24, justifyContent: "center", alignSelf: "flex-start", borderWidth: 1, borderColor: tone === "neutral" ? c.hairline : tone === "refused" ? c.refusedBorder : c.stepupBorder }}>
      <Mono size={12} style={{ color: col }}>{code}</Mono>
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
  return (
    <View accessibilityLabel="Local fork" style={{ alignSelf: "flex-start" }}>
      <Badge variant="stepup" className="h-6"><UIText className="font-semibold tracking-wider">LOCAL FORK</UIText></Badge>
    </View>
  );
}

export function TestnetPill() {
  const { c } = useTheme();
  return (
    <View style={{ alignSelf: "flex-start" }}>
      <Badge variant="info" className="h-6">
        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c.info }} />
        <UIText className="font-semibold tracking-wider">TESTNET</UIText>
      </Badge>
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 10 }}>
      <T v="title">{title}</T>
      {action ? <Press haptics="none" onPress={onAction} hitSlop={12} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}><T v="bodySm" color="accentInk" weight="semi">{action}</T></Press> : null}
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
          <Press key={o.key} haptics="select" scale={0.97} onPress={() => onChange(o.key)} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ flex: 1, height: 38, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: on ? c.accentSoft : "transparent" }}>
            <T v="bodySm" weight="semi" color={on ? "accentInk" : "text2"}>{o.label}</T>
          </Press>
        );
      })}
    </View>
  );
}

export function Avatar({ letter, size = 36 }: { letter: string; size?: number }) {
  const { c } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.hairline }}>
      <T v="bodySm" weight="bold" color="accentInk">{letter}</T>
    </View>
  );
}

export const Divider = () => <Separator />;

/** Spacer-friendly row. */
export const Row = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => <View style={[{ flexDirection: "row", alignItems: "center" }, style]}>{children}</View>;
