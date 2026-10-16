// Floating pill tab bar (Neo-Kinetic, after the Stitch vaultbank bar): a solid white capsule on the canvas with a black pill
// that slides between tabs on an interruptible spring; inside the pill the icon and label turn white. Finger scrubbing
// with selection ticks, minimize-on-scroll (labels fold away, every icon stays). No glass, blur or gradient: depth is the
// level-3 shadow only. Gesture engine ported from expo-glass-tabs (MIT, © 2026 David Mokos,
// reference/frontend/glass/expo-glass-tabs/src/glass-tab-bar.tsx); the file keeps its old name for existing imports.
import { Children, createContext, use, useCallback, useEffect, useMemo, useRef } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Extrapolation, interpolate, interpolateColor, useAnimatedStyle, useSharedValue, withSpring, withTiming, type SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { TabListProps, TabTriggerSlotProps } from "expo-router/ui";
import { c, F, hairline, level3, motion } from "../../tokens";
import { haptic } from "../../haptics";
import { Icon, type IconName } from "../Icon";
import { setMinimized, useMinimizeState } from "./minimize";
import { useReduceMotion } from "../motion";

const EXPANDED_H = 68;
const MINIMIZED_H = 52;
const MINIMIZED_INSET = 30; // per side, when minimized
const BAR_MARGIN = 16;
const ROW_PAD_H = 6;
const ICON = 21;
const LABEL_H = 14;
const GAP = 3;
const PAD_V = 8;
const HL_EXPANDED = ICON + LABEL_H + GAP + PAD_V * 2;
const HL_MINIMIZED = ICON + PAD_V * 2 + 2;
/** Total space a scrolling screen must leave under its content (bar + margin), without the safe-area inset. */
export const GLASS_TAB_SPACE = EXPANDED_H + 24;
export const TAB_SPACE = GLASS_TAB_SPACE;

const SLIDE = motion.spring.pill;
const ON = c.white;
const OFF = c.muted;

export type GlassTabItem = { name: string; label: string; icon: IconName; badge?: boolean };
type Bar = { slide: SharedValue<number>; dragging: SharedValue<boolean> };
const BarCtx = createContext<Bar | null>(null);

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
  const reduce = useReduceMotion();

  // the latest handler through a ref: a new `onIndexSelected` each parent render must not rebuild the gesture, because
  // GestureDetector re-attaching mid-drag cancels the drag (the finger slid, the tab never switched)
  const onSelect = useRef(onIndexSelected);
  onSelect.current = onIndexSelected;
  const select = useCallback((i: number) => onSelect.current?.(i), []);

  const gesture = useMemo(() => {
    const indexAtX = (x: number, m: number) => {
      "worklet";
      const inset = interpolate(m, [0, 1], [0, MINIMIZED_INSET], Extrapolation.CLAMP);
      const item = (barWidthFull - inset * 2 - ROW_PAD_H * 2) / count;
      return Math.min(Math.max((x - ROW_PAD_H) / item - 0.5, 0), count - 1);
    };
    // Scrub: the pill follows the finger 1:1 (no spring: it must feel attached), ticks at each tab boundary,
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

  // Width (not margins) is animated explicitly so the capsule and the pill geometry always agree, on every platform.
  const barStyle = useAnimatedStyle(() => {
    const h = interpolate(progress.value, [0, 1], [EXPANDED_H, MINIMIZED_H], Extrapolation.CLAMP);
    return { height: h, borderRadius: h / 2, width: barWidthFull - 2 * interpolate(progress.value, [0, 1], [0, MINIMIZED_INSET], Extrapolation.CLAMP) };
  });
  const pill = useAnimatedStyle(() => {
    const barH = interpolate(progress.value, [0, 1], [EXPANDED_H, MINIMIZED_H], Extrapolation.CLAMP);
    const h = interpolate(progress.value, [0, 1], [HL_EXPANDED, HL_MINIMIZED], Extrapolation.CLAMP);
    const inset = interpolate(progress.value, [0, 1], [0, MINIMIZED_INSET], Extrapolation.CLAMP);
    const item = (barWidthFull - inset * 2 - ROW_PAD_H * 2) / count;
    // the pill stretches a little while it travels (distance from the nearest tab), then settles round
    const travel = Math.abs(slide.value - Math.round(slide.value));
    const w = item - 4 + travel * 14;
    return { height: h, width: w, borderRadius: h / 2, top: (barH - h) / 2, transform: [{ translateX: ROW_PAD_H + item * slide.value + (item - w) / 2 }] };
  });
  const bottom = Math.max(insets.bottom - 12, 12);
  const ctx = useMemo(() => ({ slide, dragging }), [slide, dragging]);

  return (
    <View {...props} pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center" }}>
      <View pointerEvents="box-none" style={{ width: barWidthFull, marginBottom: bottom, alignItems: "center" }}>
        <GestureDetector gesture={gesture}>
          <Animated.View style={[{ backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth, borderColor: hairline, borderCurve: "continuous" } as object, level3, { shadowOpacity: 0.12 }, barStyle]}>
            <Animated.View style={[{ position: "absolute", left: 0, backgroundColor: c.ink, borderCurve: "continuous" } as object, pill]} />
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: ROW_PAD_H }}>
              <BarCtx.Provider value={ctx}>{children}</BarCtx.Provider>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}

/** One tab: icon + label; white inside the travelling pill, muted outside it; the label folds away when minimized. */
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
    color: slide ? interpolateColor(Math.min(Math.abs(slide.value - index), 1), [0, 1], [ON, OFF]) : isFocused ? ON : OFF,
  }));
  const box = useAnimatedStyle(() => ({ height: interpolate(progress.value, [0, 1], [HL_EXPANDED, HL_MINIMIZED], Extrapolation.CLAMP) }));

  return (
    <Pressable
      {...props}
      role="tab"
      aria-selected={!!isFocused}
      aria-label={item.label}
      accessibilityShowsLargeContentViewer accessibilityLargeContentTitle={item.label}
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
          <Icon name={item.icon} size={ICON} color={OFF} />
          <Animated.View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }, active]}>
            <Icon name={item.icon} size={ICON} color={ON} stroke={2.2} />
          </Animated.View>
          {item.badge ? <View style={{ position: "absolute", right: -5, top: -3, width: 10, height: 10, borderRadius: 5, backgroundColor: c.vermillion, borderWidth: 2, borderColor: c.card }} /> : null}
        </Animated.View>
        {/* like iOS tab bars, labels keep their size at large text settings (the bar has fixed room); the button's
            accessibility label carries the name, and VoiceOver users get the full text */}
        <Animated.Text numberOfLines={1} allowFontScaling={false} style={[{ fontFamily: F.semi, fontSize: 11, lineHeight: LABEL_H, letterSpacing: 0.1, marginTop: GAP }, label]}>{item.label}</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

/** Reset the bar to expanded (e.g. when a screen mounts without scrolling). */
export const expandTabBar = (state: ReturnType<typeof useMinimizeState>) => { state.progress.value = withTiming(0, { duration: 200 }); state.target.value = 0; };
