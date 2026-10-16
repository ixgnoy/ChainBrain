// Neo-Kinetic UI kit: pressable, white level-1 card, squircle avatar, quick-action tile, list row, pills, pill buttons,
// section header, field, expandable details, switch. Shapes and colours from DESIGN.md (tokens.ts).
import React, { useRef, useState } from "react";
import { Pressable, TextInput, View, type PressableProps, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { c, F, hairline, level1, motion, radius, type Tone } from "../tokens";
import { haptic, type HapticName } from "../haptics";
import { EASE_OUT, glide, settle, useReduceMotion } from "./motion";
import { autoplayAlive, autoplayRun, useAutoplayTarget, type TargetName } from "../lib/autoplayTargets";
import { T } from "./Text";
import { Icon, type IconName } from "./Icon";
import { useGrowCap } from "./fontScale";

const APressable = Animated.createAnimatedComponent(Pressable);

/** A press the auto-play can make: dip, release, then the same call a finger's tap makes (`action` overrides what it calls). */
/** Resolves true once the press happened, false when it could not (disabled, nothing to call) or the auto-play was stopped meanwhile. */
export type PressTap = (action?: () => void) => Promise<boolean>;
const nap = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Pressable with press feedback that starts on touch-down (90 ms ease-out to a size-aware scale, spring release) and a
 *  haptic on press. `kind` picks the scale: row/card 0.985, button 0.97, round action 0.94, icon 0.9.
 *  `auto` registers it as a named auto-play target (lib/autoplayTargets.ts); `tapRef` hands out the same press for screens
 *  that route several buttons through one target (wizard presets, one-tap answers). */
export function Press({ children, style, onPress, haptics = "light", scale, kind = "button", auto, tapRef, ...p }: PressableProps & {
  style?: StyleProp<ViewStyle>; haptics?: HapticName | "none"; scale?: number; kind?: keyof typeof motion.scale;
  auto?: TargetName; tapRef?: React.MutableRefObject<PressTap | null>;
}) {
  const reduce = useReduceMotion();
  const s = useSharedValue(1);
  const to = scale ?? motion.scale[kind];
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const press = useRef({ onPress, haptics });
  press.current = { onPress, haptics };
  const tap: PressTap = async (action) => {
    if (p.disabled || (!action && !press.current.onPress)) return false;
    const run = autoplayRun();
    if (!reduce) s.value = withTiming(to, { duration: motion.pressIn, easing: EASE_OUT });
    await nap(motion.pressIn + 60);
    settle(s, 1, reduce, motion.spring.press);
    await nap(70);
    if (!autoplayAlive(run)) return false; // stopped meanwhile: do not press
    if (press.current.haptics !== "none") haptic[press.current.haptics]();
    if (action) action(); else press.current.onPress?.({} as never);
    await nap(260); // the screen this press leads to has rendered (and registered its own targets) before the driver looks
    return true;
  };
  const tapNow = useRef(tap);
  tapNow.current = tap;
  if (tapRef) tapRef.current = (action) => tapNow.current(action);
  useAutoplayTarget(auto ?? "sheet.close", () => tapNow.current(), !!auto && !p.disabled);
  return (
    <APressable
      {...p}
      onPressIn={(e) => { if (!reduce) s.value = withTiming(to, { duration: motion.pressIn, easing: EASE_OUT }); p.onPressIn?.(e); }}
      onPressOut={(e) => { settle(s, 1, reduce, motion.spring.press); p.onPressOut?.(e); }}
      onPress={(e) => { if (haptics !== "none") haptic[haptics](); onPress?.(e); }}
      style={[a, style]}
    >
      {children as React.ReactNode}
    </APressable>
  );
}

/** Level-1 card: white, radius 24, the ultra-soft ambient shadow and a hairline (DESIGN.md "Elevation"). `flat` drops the shadow
 *  (cards nested in sheets); `tone` swaps the surface (fill for quiet inner panels). */
export function Card({ children, style, pad = 16, flat, tone = "card" }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; pad?: number; flat?: boolean; tone?: Tone }) {
  return <View style={[{ backgroundColor: c[tone], borderRadius: radius.card, padding: pad, borderWidth: tone === "card" ? 1 : 0, borderColor: hairline }, flat || tone !== "card" ? null : level1, style]}>{children}</View>;
}

export type AvatarTone = "soft" | "solid" | "warning" | "negative" | "fill" | "blue" | "vermillion" | "positive";
/** Squircle avatar (DESIGN.md: 14 px smoothed corners at 48, never a harsh circle) with an icon or an initial. */
export function Avatar({ label, icon, size = 48, tone = "soft" }: { label?: string; icon?: IconName; size?: number; tone?: AvatarTone }) {
  const bg = { solid: c.ink, warning: c.blueSoft, negative: c.vermillionSoft, fill: c.fill, soft: c.fill, blue: c.blue, vermillion: c.vermillion, positive: c.greenSoft }[tone];
  const fg = { solid: c.white, warning: c.blueInk, negative: c.vermillionInk, fill: c.ink2, soft: c.ink, blue: c.ink, vermillion: c.white, positive: c.greenInk }[tone];
  return (
    <View style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), borderCurve: "continuous", backgroundColor: bg, alignItems: "center", justifyContent: "center" } as ViewStyle}>
      {icon ? <Icon name={icon} size={Math.round(size * 0.42)} color={fg} /> : <T v="row" w="semi" style={{ color: fg, fontSize: Math.round(size * 0.38) }}>{(label ?? "?").trim().slice(0, 1).toUpperCase()}</T>}
    </View>
  );
}

/** Quick-action tile (DESIGN.md "Quick Action Tiles"): 16-radius, white with a tileStroke hairline, powder blue for the one
 *  utility action ("Connect"), soft vermillion for a destructive one ("Revoke"). Icon in a 40 px disc above a label-lg line. */
export function Tile({ icon, label, onPress, tone = "white", a11y, auto, style }: {
  icon: IconName; label: string; onPress: () => void; tone?: "white" | "blue" | "danger" | "ink"; a11y?: string; auto?: TargetName; style?: StyleProp<ViewStyle>;
}) {
  // VaultBank's action tile: a big thin-line icon on its own (no disc), the label under it, both on the left
  const bg = { white: c.card, blue: c.blue, danger: c.vermillionSoft, ink: c.ink }[tone];
  const ic = { white: c.ink, blue: c.ink, danger: c.vermillionInk, ink: c.white }[tone];
  const fg = { white: c.ink, blue: c.ink, danger: c.vermillionInk, ink: c.white }[tone];
  return (
    <Press kind="round" haptics="medium" auto={auto} onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y ?? label}
      style={[{ flex: 1, minHeight: 92, borderRadius: radius.tile, borderCurve: "continuous", backgroundColor: bg, borderWidth: tone === "white" ? 1 : 0, borderColor: c.tileStroke, justifyContent: "space-between", gap: 12, padding: 14 } as ViewStyle, tone === "white" ? level1 : null, style]}>
      <Icon name={icon} size={28} color={ic} stroke={1.4} />
      <T v="label" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ color: fg, fontSize: 14 }}>{label}</T>
    </Press>
  );
}

/** older name: a tile */
export function RoundAction({ icon, label, onPress, soft, a11y }: { icon: IconName; label: string; onPress: () => void; soft?: boolean; a11y?: string }) {
  return <Tile icon={icon} label={label} onPress={onPress} tone={soft ? "blue" : "white"} a11y={a11y} />;
}

export type PillTone = "accent" | "warning" | "negative" | "fill";
/** A reason code (judges score them): a quiet neutral text-pill, fill background, ink2, 11/14. It only ever sits inside a
 *  "Why" / "Details" disclosure, never in the main line of a card or row. `tone` is accepted for old call sites and ignored. */
export function CodePill({ code }: { code: string; tone?: "negative" | "warning" | "fill" }) {
  return (
    <View style={{ paddingHorizontal: 8, height: 22, borderRadius: radius.pill, backgroundColor: c.fill, alignSelf: "flex-start", justifyContent: "center" }}>
      <T v="cap" w="medium" color="ink2" style={{ fontSize: 11, lineHeight: 14 }}>{code}</T>
    </View>
  );
}

/** Fact or status pill: neutral (accent/fill), blue (warning = needs you), soft vermillion (negative), green (positive), ink. */
export function Pill({ label, tone = "accent", icon, onPress, a11y, dot }: { label: string; tone?: PillTone | "positive" | "ink" | "white"; icon?: IconName; onPress?: () => void; a11y?: string; /** a leading status dot in this colour */ dot?: string }) {
  const bg = { accent: c.fill, fill: c.fill, warning: c.blueSoft, negative: c.vermillionSoft, positive: c.greenSoft, ink: c.ink, white: c.card }[tone];
  const fg = { accent: c.ink, fill: c.ink2, warning: c.blueInk, negative: c.vermillionInk, positive: c.greenInk, ink: c.white, white: c.ink }[tone];
  const body = (
    <>
      {dot ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: dot }} /> : null}
      {icon ? <Icon name={icon} size={14} color={fg} /> : null}
      <T v="cap" w="semi" style={{ color: fg }}>{label}</T>
    </>
  );
  const box = { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, minHeight: onPress ? 32 : 28, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: bg, alignSelf: "flex-start", borderWidth: tone === "white" ? 1 : 0, borderColor: c.tileStroke } as const;
  return onPress ? <Press haptics="select" onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y ?? label} style={box}>{body}</Press> : <View style={box}>{body}</View>;
}

/** Filter chip: white pill, black when selected. */
export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  return (
    <Press haptics="select" onPress={onPress} scale={0.96} accessibilityRole="button" accessibilityState={{ selected: !!on }} style={{ minHeight: 40, paddingHorizontal: 16, borderRadius: radius.pill, justifyContent: "center", backgroundColor: on ? c.ink : c.card, borderWidth: on ? 0 : 1, borderColor: c.tileStroke }}>
      <T v="sub" w="semi" style={{ color: on ? c.onAccent : c.ink2 }}>{label}</T>
    </Press>
  );
}

export type ButtonKind = "primary" | "vermillion" | "secondary" | "outline" | "text" | "danger" | "blue";
/** Pill CTA (DESIGN.md "Primary Pill CTA", 52 px): black (primary), vermillion (the one onboarding / connect CTA), white with
 *  a stroke (secondary / outline), soft vermillion (danger: Disconnect, Revoke), powder blue (utility), or a quiet text button. */
export function Button({ label, onPress, kind = "primary", icon, iconRight, disabled, loading, style, small, auto, tapRef }: {
  label: string; onPress?: () => void; kind?: ButtonKind; icon?: IconName; iconRight?: IconName; disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; small?: boolean;
  auto?: TargetName; tapRef?: React.MutableRefObject<PressTap | null>;
}) {
  const off = disabled || loading;
  const bg = { primary: c.ink, vermillion: c.vermillion, secondary: c.card, outline: c.card, text: "transparent", danger: c.vermillionSoft, blue: c.blue }[kind];
  const fg = { primary: c.white, vermillion: c.white, secondary: c.ink, outline: c.ink, text: c.ink2, danger: c.vermillionInk, blue: c.ink }[kind];
  const stroke = kind === "secondary" || kind === "outline";
  return (
    <Press onPress={off ? undefined : onPress} auto={auto} tapRef={tapRef} disabled={off} haptics={kind === "text" ? "select" : "light"} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={[{ minHeight: small ? 44 : 52, paddingVertical: 8, minWidth: 48, paddingHorizontal: small ? 18 : 24, borderRadius: radius.button, borderCurve: "continuous", backgroundColor: bg, borderWidth: stroke ? 1 : 0, borderColor: kind === "outline" ? c.ink : c.tileStroke, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, opacity: disabled ? 0.4 : 1 }, style]}>
      {icon ? <Icon name={icon} size={18} color={fg} stroke={2} /> : null}
      <T v="label" style={{ color: fg, fontSize: small ? 14 : 15, lineHeight: 20 }}>{loading ? "Please wait…" : label}</T>
      {iconRight ? <Icon name={iconRight} size={18} color={fg} stroke={2} /> : null}
    </Press>
  );
}

export function SectionHeader({ title, right, action, onAction, count }: { title: string; right?: string; action?: string; onAction?: () => void; /** a small count badge after the title ("Active pockets 3") */ count?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginTop: 28, marginBottom: 12, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 }}>
        <T v="section" accessibilityRole="header" numberOfLines={1}>{title}</T>
        {count != null ? <View style={{ minWidth: 26, minHeight: 24, paddingHorizontal: 8, borderRadius: 12, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }}><T v="cap" w="bold">{String(count)}</T></View> : null}
      </View>
      {action ? <Press haptics="select" onPress={onAction} hitSlop={10}><T v="sub" w="bold" color="vermillionInk">{action}</T></Press> : right ? <T v="sub" color="mutedOnCanvas">{right}</T> : null}
    </View>
  );
}

/** Transaction-style row (DESIGN.md "Transaction Item"): squircle avatar left, bold title over a muted line, amount right with a status line beneath. */
export function ListRow({ avatar, title, sub, right, rightSub, rightTone = "ink", rightSubTone = "muted", onPress, last, a11y, children, codes, foot, subLines = 2, icon, extra, lit }: {
  avatar?: React.ReactNode; title: string; sub?: string; right?: string; rightSub?: string; rightTone?: "ink" | "positive" | "muted" | "negative"; rightSubTone?: "muted" | "negative" | "warning" | "positive";
  onPress?: () => void; last?: boolean; a11y?: string; children?: React.ReactNode; codes?: string[]; foot?: string; subLines?: number; /** anything under the subtitle (a thin progress bar) */ extra?: React.ReactNode;
  /** pressed by the auto-play: the row takes the press tint */ lit?: boolean;
  /** a bare 22 px icon instead of an avatar disc (flat lists such as Settings): rows are 56 px and the divider starts after the icon */ icon?: IconName;
}) {
  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: icon ? 14 : 14, minHeight: icon ? 56 : 72, paddingHorizontal: 16, backgroundColor: lit ? c.fill : undefined }}>
      {icon ? <View style={{ width: 24, alignItems: "center" }}><Icon name={icon} size={22} color={c.ink2} /></View> : avatar}
      <View style={{ flex: 1, gap: 2, paddingVertical: icon ? 10 : 12 }}>
        <T v="row" numberOfLines={1}>{title}</T>
        {sub ? <T v="sub" color="muted" numberOfLines={subLines}>{sub}</T> : null}
        {extra}
        {codes?.length ? <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 2 }}>{codes.map((k) => <CodePill key={k} code={k} />)}</View> : null}
        {foot ? <T v="cap" color="faint" numberOfLines={1} style={{ color: c.muted }}>{foot}</T> : null}
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
      {last ? null : <View style={{ height: 1, backgroundColor: c.fill, marginLeft: icon ? 54 : 70, marginRight: 16 }} />}
    </View>
  );
}

/** A white list card: its row children (ListRow, PocketRow, ActivityRow) get `last` so the divider after the final one is hidden.
 *  `head` sits above the rows inside the card (VaultBank's "Transactions" over the date). */
export function ListCard({ children, style, head }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; head?: React.ReactNode }) {
  const kids = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ marginHorizontal: 16, backgroundColor: c.card, borderRadius: radius.card, borderCurve: "continuous", borderWidth: 1, borderColor: hairline } as ViewStyle, level1, style]}>
      {head}
      {kids.map((k, i) => (React.isValidElement(k) ? React.cloneElement(k as React.ReactElement<{ last?: boolean }>, { last: i === kids.length - 1 }) : k))}
    </View>
  );
}

export function Field(p: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = p;
  const [focus, setFocus] = useState(false);
  const grow = useGrowCap("body");
  return (
    <View style={{ gap: 8 }}>
      {label ? <T v="sub" w="medium" color="ink2">{label}</T> : null}
      <TextInput
        maxFontSizeMultiplier={grow} placeholderTextColor={c.faint} accessibilityLabel={rest.accessibilityLabel ?? label}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        {...rest}
        style={[{ minHeight: 52, borderRadius: radius.input, backgroundColor: c.fill, paddingHorizontal: 16, fontFamily: F.medium, fontSize: 16, color: c.ink, borderWidth: 1.5, borderColor: focus ? c.ink : "transparent", outlineStyle: "none" } as object, style]}
      />
    </View>
  );
}

/** Expandable disclosure ("Details", "Why"): the only place technical text (hashes, tool names, reason codes) appears. `codes` render as
 *  quiet neutral pills; `compact` is the in-card variant (36 px, 13/600 muted, no side padding). */
export function Details({ rows = [], title = "Details", children, codes, compact }: { rows?: [string, string][]; title?: string; children?: React.ReactNode; codes?: string[]; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  if (!rows.length && !children && !codes?.length) return null;
  return (
    <View>
      <Press haptics="select" onPress={() => setOpen(!open)} scale={0.99} accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: open }} style={{ flexDirection: "row", alignItems: "center", justifyContent: compact ? "flex-start" : "space-between", gap: 4, minHeight: compact ? 36 : 48 }}>
        <T v={compact ? "cap" : "sub"} w="semi" color={compact ? "muted" : "ink2"}>{title}</T>
        <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}><Icon name="chevronDown" size={compact ? 16 : 18} color={c.muted} /></View>
      </Press>
      {open ? (
        <View style={{ gap: 10, paddingBottom: 6 }}>
          {rows.map(([k, v], i) => (
            <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", gap: 16 }}>
              <T v="cap" color="muted">{k}</T>
              <T v="cap" color="ink2" style={{ flexShrink: 1, textAlign: "right" }}>{v}</T>
            </View>
          ))}
          {codes?.length ? <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>{codes.map((k) => <CodePill key={k} code={k} />)}</View> : null}
          {children}
        </View>
      ) : null}
    </View>
  );
}

/** Summary card (the Approval / Receipt / Review grammar): fill surface, radius 16, label muted left, value 15/600 right, no dividers. */
export function SummaryCard({ rows, surface = "canvas" }: { rows: [string, string][]; surface?: "canvas" | "card" }) {
  return (
    <View style={{ backgroundColor: surface === "card" ? c.card : c.fill, borderRadius: radius.tile, padding: 16, gap: 14 }}>
      {rows.map(([k, v], i) => (
        <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <T v="sub" color="muted">{k}</T>
          <T v="sub" w="semi" style={{ flexShrink: 1, textAlign: "right", fontSize: 15, lineHeight: 22 }}>{v}</T>
        </View>
      ))}
    </View>
  );
}

/** iOS-style switch (51 x 31): the knob springs across, the track turns ink black, a selection tick on change. */
export function Toggle({ on, onChange, a11y, disabled }: { on: boolean; onChange: (v: boolean) => void; a11y: string; disabled?: boolean }) {
  const reduce = useReduceMotion();
  const x = useSharedValue(on ? 1 : 0);
  React.useEffect(() => { x.value = reduce ? (on ? 1 : 0) : withSpring(on ? 1 : 0, motion.spring.snappy); }, [on, reduce, x]);
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(x.value, [0, 1], [c.line, c.accent]) }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * 20 }] }));
  return (
    <Press haptics="select" scale={0.96} disabled={disabled} onPress={() => onChange(!on)} hitSlop={8}
      accessibilityRole="switch" accessibilityLabel={a11y} accessibilityState={{ checked: on, disabled: !!disabled }} style={{ opacity: disabled ? 0.5 : 1 }}>
      <Animated.View style={[{ width: 51, height: 31, borderRadius: 16, padding: 2 }, track]}>
        <Animated.View style={[{ width: 27, height: 27, borderRadius: 14, backgroundColor: "#FFFFFF", shadowColor: c.ink, shadowOpacity: 0.18, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, elevation: 2 }, knob]} />
      </Animated.View>
    </Press>
  );
}

export const Hairline = () => <View style={{ height: 1, backgroundColor: c.line }} />;

/** A labelled fact row inside a white card (Approve sheet, Pocket facts): icon + muted label left, value right. */
export function FactRow({ icon, label, children, last }: { icon?: IconName; label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.fill }}>
      {icon ? <Icon name={icon} size={20} color={c.ink2} /> : null}
      <T v="sub" color="muted" style={{ width: 92 }}>{label}</T>
      <View style={{ flex: 1, alignItems: "flex-end" }}>{children}</View>
    </View>
  );
}

/** Status pill for activity rows and ledgers: Paid / Settled (neutral), Co-signed (blue), Refused / Blocked (vermillion). */
export function StatusPill({ label, tone = "fill" }: { label: string; tone?: "fill" | "blue" | "vermillion" | "solidVermillion" | "green" | "ink" }) {
  const bg = { fill: c.fill, blue: c.blueSoft, vermillion: c.vermillionSoft, solidVermillion: c.vermillion, green: c.greenSoft, ink: c.ink }[tone];
  const fg = { fill: c.ink2, blue: c.blueInk, vermillion: c.vermillionInk, solidVermillion: c.white, green: c.greenInk, ink: c.white }[tone];
  return (
    <View style={{ paddingHorizontal: 10, height: 24, borderRadius: radius.pill, backgroundColor: bg, justifyContent: "center", alignSelf: "flex-end" }}>
      <T v="cap" w="bold" style={{ color: fg, fontSize: 11, lineHeight: 14 }}>{label}</T>
    </View>
  );
}
