// Small UI kit: pressable, white card, round action, list row, pill, buttons, section header, field, expandable details.
import React, { useState } from "react";
import { Pressable, TextInput, View, type PressableProps, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { c, F, radius } from "../tokens";
import { haptic } from "../haptics";
import { glide, settle, useReduceMotion } from "./motion";
import { T } from "./Text";
import { Icon, type IconName } from "./Icon";

const APressable = Animated.createAnimatedComponent(Pressable);

/** Pressable with a quiet scale on press and an optional haptic tick. */
export function Press({ children, style, onPress, haptics = "light", scale = 0.97, ...p }: PressableProps & { style?: StyleProp<ViewStyle>; haptics?: "light" | "select" | "none"; scale?: number }) {
  const reduce = useReduceMotion();
  const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <APressable
      {...p}
      onPressIn={(e) => { glide(s, scale, reduce, 80); p.onPressIn?.(e); }}
      onPressOut={(e) => { settle(s, 1, reduce, { damping: 18, stiffness: 220, mass: 1 }); p.onPressOut?.(e); }}
      onPress={(e) => { if (haptics !== "none") haptic[haptics](); onPress?.(e); }}
      style={[a, style]}
    >
      {children as React.ReactNode}
    </APressable>
  );
}

/** White card, radius 20, no border, no shadow. */
export function Card({ children, style, pad = 16 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; pad?: number }) {
  return <View style={[{ backgroundColor: c.card, borderRadius: radius.card, padding: pad }, style]}>{children}</View>;
}

export function Avatar({ label, icon, size = 48, tone = "soft" }: { label?: string; icon?: IconName; size?: number; tone?: "soft" | "solid" | "warning" | "negative" | "fill" }) {
  const bg = tone === "solid" ? c.accent : tone === "warning" ? c.warningSoft : tone === "negative" ? c.negativeSoft : tone === "fill" ? c.fill : c.accentSoft;
  const fg = tone === "solid" ? c.onAccent : tone === "warning" ? c.warning : tone === "negative" ? c.negative : tone === "fill" ? c.ink2 : c.accent;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
      {icon ? <Icon name={icon} size={Math.round(size * 0.42)} color={fg} /> : <T v="row" w="semi" style={{ color: fg, fontSize: Math.round(size * 0.38) }}>{(label ?? "?").trim().slice(0, 1).toUpperCase()}</T>}
    </View>
  );
}

/** 64 px round action with a label below: solid accent, or soft accent for secondary actions. */
export function RoundAction({ icon, label, onPress, soft, a11y }: { icon: IconName; label: string; onPress: () => void; soft?: boolean; a11y?: string }) {
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y ?? label} style={{ alignItems: "center", gap: 8, flex: 1, paddingHorizontal: 2 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: soft ? c.accentSoft : c.accent, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={26} color={soft ? c.accent : c.onAccent} />
      </View>
      <T v="cap" w="medium" color="ink2" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ textAlign: "center", fontSize: 13 }}>{label}</T>
    </Press>
  );
}

export type PillTone = "accent" | "warning" | "negative" | "fill";
export function Pill({ label, tone = "accent", icon }: { label: string; tone?: PillTone; icon?: IconName }) {
  const bg = tone === "accent" ? c.accentSoft : tone === "warning" ? c.warningSoft : tone === "negative" ? c.negativeSoft : c.fill;
  const fg = tone === "accent" ? c.accent : tone === "warning" ? c.warning : tone === "negative" ? c.negative : c.ink2;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, height: 28, borderRadius: radius.pill, backgroundColor: bg, alignSelf: "flex-start" }}>
      {icon ? <Icon name={icon} size={14} color={fg} /> : null}
      <T v="cap" w="semi" style={{ color: fg }}>{label}</T>
    </View>
  );
}

/** Filter chip: grey pill, accent when selected. */
export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  return (
    <Press haptics="select" onPress={onPress} scale={0.96} accessibilityRole="button" accessibilityState={{ selected: !!on }} style={{ height: 40, paddingHorizontal: 16, borderRadius: radius.pill, justifyContent: "center", backgroundColor: on ? c.accent : c.card }}>
      <T v="sub" w="semi" style={{ color: on ? c.onAccent : c.ink2 }}>{label}</T>
    </Press>
  );
}

export function Button({ label, onPress, kind = "primary", icon, disabled, loading, style, small }: {
  label: string; onPress?: () => void; kind?: "primary" | "secondary" | "outline" | "text" | "danger"; icon?: IconName; disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; small?: boolean;
}) {
  const off = disabled || loading;
  const bg = kind === "primary" ? c.accent : kind === "danger" ? c.negativeSoft : kind === "secondary" ? c.fill : "transparent";
  const fg = kind === "primary" ? c.onAccent : kind === "danger" ? c.negative : kind === "secondary" ? c.ink : c.accent;
  return (
    <Press onPress={off ? undefined : onPress} haptics={kind === "text" ? "select" : "light"} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={[{ height: small ? 44 : 56, minWidth: 48, paddingHorizontal: 22, borderRadius: radius.pill, backgroundColor: bg, borderWidth: kind === "outline" ? 1.5 : 0, borderColor: c.accent, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, opacity: disabled ? 0.45 : 1 }, style]}>
      {icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <T v="row" w="semi" style={{ color: fg }}>{loading ? "Please wait…" : label}</T>
    </Press>
  );
}

export function SectionHeader({ title, right, action, onAction }: { title: string; right?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 20, marginTop: 28, marginBottom: 12 }}>
      <T v="section" accessibilityRole="header">{title}</T>
      {action ? <Press haptics="select" onPress={onAction} hitSlop={10}><T v="sub" w="semi" color="accent">{action}</T></Press> : right ? <T v="sub" color="muted">{right}</T> : null}
    </View>
  );
}

/** A Ryt-style list row: 48 px avatar, title 16/500, grey subtitle, amount right with an optional status line beneath. Rows are >= 64 px. */
export function ListRow({ avatar, title, sub, right, rightSub, rightTone = "ink", rightSubTone = "muted", onPress, last, a11y, children }: {
  avatar?: React.ReactNode; title: string; sub?: string; right?: string; rightSub?: string; rightTone?: "ink" | "positive" | "muted" | "negative"; rightSubTone?: "muted" | "negative" | "warning" | "positive";
  onPress?: () => void; last?: boolean; a11y?: string; children?: React.ReactNode;
}) {
  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16, minHeight: 72, paddingHorizontal: 16 }}>
      {avatar}
      <View style={{ flex: 1, gap: 2, paddingVertical: 12 }}>
        <T v="row" numberOfLines={1}>{title}</T>
        {sub ? <T v="sub" color="muted" numberOfLines={2}>{sub}</T> : null}
      </View>
      {children}
      {right || rightSub ? (
        <View style={{ alignItems: "flex-end", gap: 2 }}>
          {right ? <T v="row" w="semi" color={rightTone}>{right}</T> : null}
          {rightSub ? <T v="sub" color={rightSubTone}>{rightSub}</T> : null}
        </View>
      ) : null}
    </View>
  );
  return (
    <View>
      {onPress ? <Press onPress={onPress} haptics="select" scale={0.99} accessibilityRole="button" accessibilityLabel={a11y ?? title}>{body}</Press> : body}
      {last ? null : <View style={{ height: 1, backgroundColor: c.line, marginLeft: 80 }} />}
    </View>
  );
}

/** A white list card: its row children (ListRow, PocketRow, ActivityRow) get `last` so the divider after the final one is hidden. */
export function ListCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const kids = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ marginHorizontal: 20, backgroundColor: c.card, borderRadius: radius.card, overflow: "hidden" }, style]}>
      {kids.map((k, i) => (React.isValidElement(k) ? React.cloneElement(k as React.ReactElement<{ last?: boolean }>, { last: i === kids.length - 1 }) : k))}
    </View>
  );
}

export function Field(p: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = p;
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      {label ? <T v="sub" w="medium" color="ink2">{label}</T> : null}
      <TextInput
        placeholderTextColor={c.faint} accessibilityLabel={rest.accessibilityLabel ?? label}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        {...rest}
        style={[{ minHeight: 52, borderRadius: radius.input, backgroundColor: c.fill, paddingHorizontal: 16, fontFamily: F.regular, fontSize: 16, color: c.ink, borderWidth: 1.5, borderColor: focus ? c.accent : "transparent", outlineStyle: "none" } as object, style]}
      />
    </View>
  );
}

/** Expandable "Details" row: the only place technical text (hashes, tool names, reason codes) appears. */
export function Details({ rows, title = "Details", children }: { rows: [string, string][]; title?: string; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!rows.length && !children) return null;
  return (
    <View>
      <Press haptics="select" onPress={() => setOpen(!open)} scale={0.99} accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: open }} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48 }}>
        <T v="sub" w="semi" color="ink2">{title}</T>
        <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}><Icon name="chevronDown" size={18} color={c.muted} /></View>
      </Press>
      {open ? (
        <View style={{ gap: 10, paddingBottom: 6 }}>
          {rows.map(([k, v], i) => (
            <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", gap: 16 }}>
              <T v="cap" color="muted">{k}</T>
              <T v="cap" color="ink2" style={{ flexShrink: 1, textAlign: "right" }}>{v}</T>
            </View>
          ))}
          {children}
        </View>
      ) : null}
    </View>
  );
}

export const Hairline = () => <View style={{ height: 1, backgroundColor: c.line }} />;
