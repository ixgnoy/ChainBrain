// Floating glass tab bar: iOS 26 Liquid Glass (expo-glass-effect) with a teal highlight that slides between tabs on an
// interruptible spring, finger scrubbing with selection ticks, and minimize-on-scroll (labels fold away, every icon stays).
// Older iOS: BlurView material. Android / web / Reduce Transparency: solid white with a hairline.
// Ported and re-themed from expo-glass-tabs (MIT, © 2026 David Mokos, reference/frontend/glass/expo-glass-tabs/src/glass-tab-bar.tsx).
import { Children, createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import { AccessibilityInfo, Platform, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { BlurView } from "expo-blur";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Extrapolation, interpolate, interpolateColor, useAnimatedStyle, useSharedValue, withSpring, withTiming, type SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { TabListProps, TabTriggerSlotProps } from "expo-router/ui";
import { c, F, motion } from "../../tokens";
import { haptic } from "../../haptics";
import { Icon, type IconName } from "../Icon";
import { setMinimized, useMinimizeState } from "./minimize";
import { useReduceMotion } from "../motion";

const EXPANDED_H = 64;
const MINIMIZED_H = 48;
const MINIMIZED_INSET = 34; // per side, when minimized
const BAR_MARGIN = 16;
const ROW_PAD_H = 5;
const ICON = 22;
const LABEL_H = 15;
const GAP = 2;
const PAD_V = 7;
const HL_EXPANDED = ICON + LABEL_H + GAP + PAD_V * 2;
const HL_MINIMIZED = ICON + PAD_V * 2;
/** Total space a scrolling screen must leave under its content (bar + margin), without the safe-area inset. */
export const GLASS_TAB_SPACE = EXPANDED_H + 20;

const SLIDE = motion.spring.pill;
// The capsule radius animates, so the glass must be an Animated component: handing an animated style to a plain native
// view makes React Native freeze Reanimated's internal objects in dev ("set the key `current` ... frozen").
const AnimatedGlassView = Animated.createAnimatedComponent(GlassView);
const ACTIVE = c.accent;
const INACTIVE = c.ink2;

export type GlassTabItem = { name: string; label: string; icon: IconName; badge?: boolean };
type Bar = { slide: SharedValue<number>; dragging: SharedValue<boolean>; glass: boolean };
const BarCtx = createContext<Bar | null>(null);

function useSolidBar() {
  const [reduceTransparency, setRT] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceTransparencyEnabled?.().then(setRT).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.("reduceTransparencyChanged", setRT);
    return () => sub?.remove?.();
  }, []);
  return reduceTransparency || Platform.OS !== "ios";
}

export function GlassTabBar({ children, onIndexSelected, ...props }: TabListProps & { onIndexSelected?: (i: number) => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const barWidthFull = Math.min(width, 480) - BAR_MARGIN * 2; // web shows the app as a 480 pt column
  const minimized = useMinimizeState();
  const progress = minimized.progress;
  const slide = useSharedValue(0);
  const dragging = useSharedValue(false);
  const lastTick = useSharedValue(-1);
  const count = Math.max(Children.count(children), 1);
  const solid = useSolidBar();
  const liquid = !solid && isLiquidGlassAvailable();
  const reduce = useReduceMotion();

  const select = useCallback((i: number) => onIndexSelected?.(i), [onIndexSelected]);

  const gesture = useMemo(() => {
    const indexAtX = (x: number, m: number) => {
      "worklet";
      const inset = interpolate(m, [0, 1], [0, MINIMIZED_INSET], Extrapolation.CLAMP);
      const item = (barWidthFull - inset * 2 - ROW_PAD_H * 2) / count;
      return Math.min(Math.max((x - ROW_PAD_H) / item - 0.5, 0), count - 1);
    };
    // Scrub: the highlight follows the finger 1:1 (no spring: it must feel attached), ticks at each tab boundary,
    // navigation only on release so the screen never jumps under the finger.
    const pan = Gesture.Pan()
      .activeOffsetX([-6, 6])
      .failOffsetY([-14, 14])
      .onStart(() => { dragging.value = true; lastTick.value = Math.round(slide.value); setMinimized(minimized, 0); })
      .onUpdate((e) => {
        const i = indexAtX(e.x, progress.value);
        slide.value = i;
        const r = Math.round(i);
        if (r !== lastTick.value) { lastTick.value = r; scheduleOnRN(haptic.tick); }
      })
      .onFinalize(() => {
        if (!dragging.value) return;
        const r = Math.round(slide.value);
        slide.value = withSpring(r, SLIDE);
        scheduleOnRN(select, r);
        dragging.value = false;
      });
    const tap = Gesture.Tap()
      .maxDistance(16)
      .maxDuration(400)
      .onEnd((e, ok) => {
        if (!ok) return;
        const i = Math.round(indexAtX(e.x, progress.value));
        slide.value = reduce ? i : withSpring(i, SLIDE);
        setMinimized(minimized, 0);
        scheduleOnRN(haptic.select);
        scheduleOnRN(select, i);
      });
    return Gesture.Race(pan, tap);
  }, [barWidthFull, count, select, dragging, lastTick, slide, minimized, progress, reduce]);

  // Width (not margins) is animated explicitly so the capsule and the highlight geometry always agree, on every platform.
  const barStyle = useAnimatedStyle(() => ({
    height: interpolate(progress.value, [0, 1], [EXPANDED_H, MINIMIZED_H], Extrapolation.CLAMP),
    width: barWidthFull - 2 * interpolate(progress.value, [0, 1], [0, MINIMIZED_INSET], Extrapolation.CLAMP),
  }));
  // The capsule shape lives on the glass view itself (iOS renders its own squircle + rim); never clip glass with a mask.
  const shape = useAnimatedStyle(() => ({ borderRadius: interpolate(progress.value, [0, 1], [EXPANDED_H, MINIMIZED_H], Extrapolation.CLAMP) / 2 }));
  const highlight = useAnimatedStyle(() => {
    const barH = interpolate(progress.value, [0, 1], [EXPANDED_H, MINIMIZED_H], Extrapolation.CLAMP);
    const h = interpolate(progress.value, [0, 1], [HL_EXPANDED, HL_MINIMIZED], Extrapolation.CLAMP);
    const inset = interpolate(progress.value, [0, 1], [0, MINIMIZED_INSET], Extrapolation.CLAMP);
    const item = (barWidthFull - inset * 2 - ROW_PAD_H * 2) / count;
    return { height: h, width: item, borderRadius: h / 2, top: (barH - h) / 2, transform: [{ translateX: ROW_PAD_H + item * slide.value }] };
  });
  const bottom = Math.max(insets.bottom - 14, 12);
  const ctx = useMemo(() => ({ slide, dragging, glass: !solid }), [slide, dragging, solid]);

  return (
    <View {...props} pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center" }}>
      {/* soft fade so content dissolves into the canvas behind the bar instead of a hard line */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { top: undefined, height: bottom + EXPANDED_H + 36, experimental_backgroundImage: `linear-gradient(to top, rgba(245,247,248,0.92) 0%, rgba(245,247,248,0.6) 45%, rgba(245,247,248,0) 100%)` } as any]} />
      <View pointerEvents="box-none" style={{ width: barWidthFull, marginBottom: bottom, alignItems: "center" }}>
        <GestureDetector gesture={gesture}>
          <Animated.View style={barStyle}>
            {liquid ? (
              <AnimatedGlassView glassEffectStyle="regular" tintColor="rgba(255,255,255,0.35)" style={[StyleSheet.absoluteFill, { borderCurve: "continuous" } as any, shape]} />
            ) : !solid ? (
              <Animated.View style={[StyleSheet.absoluteFill, { overflow: "hidden", borderCurve: "continuous" } as any, shape]}>
                <BlurView tint="systemChromeMaterialLight" intensity={80} style={StyleSheet.absoluteFill} />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.55)" }]} />
              </Animated.View>
            ) : (
              <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line, shadowColor: c.ink, shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 6 }, shape]} />
            )}
            <Animated.View style={[{ position: "absolute", left: 0, backgroundColor: liquid ? "rgba(15,34,54,0.08)" : c.fill, borderCurve: "continuous" } as any, highlight]} />
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: ROW_PAD_H }}>
              <BarCtx.Provider value={ctx}>{children}</BarCtx.Provider>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}

/** One tab: icon + label; tint follows the sliding highlight, label folds away when minimized. */
export function GlassTabButton({ item, index, isFocused, onPress, ...props }: TabTriggerSlotProps & { item: GlassTabItem; index: number }) {
  const minimized = useMinimizeState();
  const progress = minimized.progress;
  const bar = use(BarCtx);
  const slide = bar?.slide;
  const pop = useSharedValue(1);
  const reduce = useReduceMotion();

  useEffect(() => {
    // Programmatic navigation (deep links, router.push) moves the pill too; never fight the finger while scrubbing.
    if (isFocused && bar && !bar.dragging.value) bar.slide.value = reduce ? index : withSpring(index, SLIDE);
    if (isFocused && !reduce) { pop.value = 0.86; pop.value = withSpring(1, motion.spring.bouncy); } // icon "lands"
  }, [isFocused, index, bar, reduce, pop]);

  const active = useAnimatedStyle(() => ({ opacity: slide ? 1 - Math.min(Math.abs(slide.value - index), 1) : isFocused ? 1 : 0 }));
  const iconPop = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const label = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.4], [1, 0], Extrapolation.CLAMP),
    color: slide ? interpolateColor(Math.min(Math.abs(slide.value - index), 1), [0, 1], [ACTIVE, INACTIVE]) : isFocused ? ACTIVE : INACTIVE,
  }));
  const box = useAnimatedStyle(() => ({ height: interpolate(progress.value, [0, 1], [HL_EXPANDED, HL_MINIMIZED], Extrapolation.CLAMP) }));

  return (
    <Pressable
      {...props}
      role="tab"
      aria-selected={!!isFocused}
      aria-label={item.label}
      onPress={(e) => {
        // The gesture detector normally consumes touches; this fires for VoiceOver / keyboard / web clicks.
        if (bar) bar.slide.value = reduce ? index : withSpring(index, SLIDE);
        setMinimized(minimized, 0);
        haptic.select();
        onPress?.(e);
      }}
      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
    >
      <Animated.View style={[{ alignSelf: "stretch", alignItems: "center", paddingTop: PAD_V, overflow: "hidden" }, box]}>
        <Animated.View style={iconPop}>
          <Icon name={item.icon} size={ICON} color={INACTIVE} />
          <Animated.View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }, active]}>
            <Icon name={item.icon} size={ICON} color={ACTIVE} stroke={2.1} />
          </Animated.View>
          {item.badge ? <View style={{ position: "absolute", right: -5, top: -3, width: 10, height: 10, borderRadius: 5, backgroundColor: c.negative, borderWidth: 2, borderColor: c.card }} /> : null}
        </Animated.View>
        <Animated.Text numberOfLines={1} style={[{ fontFamily: F.semi, fontSize: 12, lineHeight: LABEL_H, marginTop: GAP }, label]}>{item.label}</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

/** Reset the bar to expanded (e.g. when a screen mounts without scrolling). */
export const expandTabBar = (state: ReturnType<typeof useMinimizeState>) => { state.progress.value = withTiming(0, { duration: 200 }); state.target.value = 0; };
