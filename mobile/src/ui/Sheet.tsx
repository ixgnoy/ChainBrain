// Custom Reanimated bottom sheet rendered at the root (no native modal, so it works in Expo Go and on web).
// Physics (design-system motion.md, gorhom bottom-sheet gesture logic, MIT): follows the finger 1:1, rubber-bands past the open
// position, dismisses on velocity > 600 pt/s or a 40 % drag, releases with a spring that inherits the finger velocity, opens
// on the critically damped `sheet` spring and closes faster (300 ms iOS curve). Backdrop opacity is a function of position.
// Rises with the keyboard. A scrollable child (SheetScroll) hands the gesture over at the top. Interruptible at any frame.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector, type NativeGesture } from "react-native-gesture-handler";
import Animated, { useAnimatedKeyboard, useAnimatedStyle, useSharedValue, withSpring, withTiming, type SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { c, lift, motion, radius } from "../tokens";
import { haptic } from "../haptics";
import { EASE_OUT, EASE_SHEET, rubberband, useReduceMotion } from "./motion";
import { Press } from "./kit";

export type SheetCtxValue = { y: SharedValue<number>; scrollY: SharedValue<number>; scrollable: SharedValue<boolean>; native: NativeGesture };
export const SheetCtx = createContext<SheetCtxValue | null>(null);
export const useSheetCtx = () => useContext(SheetCtx);

const DISMISS_VELOCITY = 600, DISMISS_FRACTION = 0.4, CLOSE_MS = 300;
const NO_KEYBOARD = { height: { value: 0 } };

export function Sheet({ visible, onClose, children, maxHeightPct = 0.92 }: { visible: boolean; onClose: () => void; children: React.ReactNode; maxHeightPct?: number }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  // Native only: the hook is not implemented on web (it logs a warning there). The platform never changes at runtime.
  const kb = Platform.OS === "web" ? NO_KEYBOARD : useAnimatedKeyboard(); // eslint-disable-line react-hooks/rules-of-hooks
  const [mounted, setMounted] = useState(visible);
  const shown = useRef(false); // whether the panel currently sits on screen (so a retarget does not restart from off-screen)
  const y = useSharedValue(height);
  const panelH = useSharedValue(height * 0.5);
  const fade = useSharedValue(1); // used only under Reduce Motion (the sheet fades instead of sliding)
  const closing = useSharedValue(false);
  const startY = useSharedValue(0);
  const base = useSharedValue(0);
  const driven = useSharedValue(false);
  const crossed = useSharedValue(false);
  const scrollY = useSharedValue(0);
  const scrollable = useSharedValue(false);
  const native = useMemo(() => Gesture.Native(), []);
  const unmount = useCallback(() => { shown.current = false; setMounted(false); }, []);

  useEffect(() => {
    if (visible) {
      closing.value = false;
      setMounted(true);
      if (!shown.current) haptic.soft();
      if (reduce) {
        if (!shown.current) { y.value = 0; fade.value = 0; }
        fade.value = withTiming(1, { duration: motion.base, easing: EASE_OUT });
      } else {
        fade.value = 1;
        if (!shown.current) y.value = height;
        y.value = withSpring(0, motion.spring.sheet);
      }
      shown.current = true;
    } else if (mounted && !closing.value) {
      closing.value = true;
      if (reduce) fade.value = withTiming(0, { duration: motion.exit, easing: EASE_OUT }, (fin) => { if (fin) scheduleOnRN(unmount); });
      else y.value = withTiming(panelH.value + 60, { duration: CLOSE_MS, easing: EASE_SHEET }, (fin) => { if (fin) scheduleOnRN(unmount); });
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const pan = Gesture.Pan()
    .simultaneousWithExternalGesture(native)
    .activeOffsetY([-8, 8])
    .failOffsetX([-18, 18])
    .onBegin(() => { startY.value = y.value; base.value = 0; driven.value = false; crossed.value = false; })
    .onUpdate((e) => {
      const t = e.translationY;
      // let a scrolled list scroll; the sheet only takes over from the top of the content, pulling down
      if (scrollable.value && y.value <= 0.5 && (scrollY.value > 1 || t - base.value < 0)) { base.value = t; return; }
      const v = startY.value + (t - base.value);
      driven.value = true;
      y.value = v >= 0 ? v : -rubberband(-v, 320);
      const past = y.value > panelH.value * DISMISS_FRACTION;
      if (past && !crossed.value) { crossed.value = true; scheduleOnRN(haptic.soft); }
      else if (!past && crossed.value) crossed.value = false;
    })
    .onEnd((e) => {
      if (!driven.value) return;
      const dismiss = y.value > 0 && (e.velocityY > DISMISS_VELOCITY || y.value > panelH.value * DISMISS_FRACTION);
      if (dismiss) {
        closing.value = true;
        scheduleOnRN(onClose);
        if (reduce) fade.value = withTiming(0, { duration: motion.exit }, (fin) => { if (fin) scheduleOnRN(unmount); });
        else y.value = withTiming(panelH.value + 60, { duration: CLOSE_MS, easing: EASE_SHEET }, (fin) => { if (fin) scheduleOnRN(unmount); });
      } else {
        const far = Math.abs(y.value) > 24;
        y.value = withSpring(0, { ...motion.spring.release, velocity: e.velocityY }, (fin) => { if (fin && far) scheduleOnRN(haptic.medium); });
      }
    })
    .onFinalize((_e, ok) => {
      if (!ok && driven.value && !closing.value && y.value !== 0) y.value = withSpring(0, motion.spring.release);
    });

  const ctx = useMemo<SheetCtxValue>(() => ({ y, scrollY, scrollable, native }), [y, scrollY, scrollable, native]);
  const panel = useAnimatedStyle(() => {
    const raise = Math.max(0, kb.height.value - insets.bottom);
    return {
      transform: [{ translateY: y.value - raise }],
      maxHeight: Math.min(height * maxHeightPct, height - kb.height.value - insets.top - 12),
      opacity: reduce ? fade.value : 1,
    };
  });
  const back = useAnimatedStyle(() => {
    const pos = 1 - Math.min(Math.max(y.value / Math.max(panelH.value, 1), 0), 1);
    return { opacity: reduce ? Math.min(pos, fade.value) : pos };
  });
  if (!mounted) return null;
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 50, justifyContent: "flex-end" }]} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }, back]}>
        <Press haptics="none" scale={1} style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View
          onLayout={(e) => { panelH.value = e.nativeEvent.layout.height; }}
          accessibilityViewIsModal onAccessibilityEscape={onClose}
          style={[{ maxHeight: height * maxHeightPct }, panel]}
        >
          <View style={{ flexShrink: 1, backgroundColor: c.card, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, paddingBottom: insets.bottom + 12, ...lift, shadowOffset: { width: 0, height: -8 } }}>
            <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: "100%", height: 320, backgroundColor: c.card }} />{/* covers the gap when the sheet is rubber-banded upward */}
            <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 6 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: c.line }} />
            </View>
            <SheetCtx.Provider value={ctx}>{children}</SheetCtx.Provider>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
