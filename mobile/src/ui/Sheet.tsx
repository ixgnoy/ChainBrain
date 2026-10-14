// Custom Reanimated bottom sheet rendered at the root (no native modal, so it works in Expo Go and on web).
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { c, lift, motion, radius } from "../tokens";
import { haptic } from "../haptics";
import { useReduceMotion, settle, glide } from "./motion";

export function Sheet({ visible, onClose, children, maxHeightPct = 0.92 }: { visible: boolean; onClose: () => void; children: React.ReactNode; maxHeightPct?: number }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const y = useSharedValue(height);
  const backdrop = useSharedValue(0);
  const unmount = useCallback(() => setMounted(false), []);
  const reduce = useReduceMotion();

  useEffect(() => {
    if (visible) {
      setMounted(true);
      y.value = height;
      settle(y, 0, reduce, motion.spring.sheet);
      glide(backdrop, 1, reduce, motion.base);
    } else if (mounted) {
      if (reduce) { backdrop.value = 0; y.value = height; unmount(); }
      else {
        backdrop.value = withTiming(0, { duration: motion.base });
        y.value = withTiming(height, { duration: 260 }, (fin) => { if (fin) runOnJS(unmount)(); });
      }
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const pan = Gesture.Pan()
    .onUpdate((e) => { y.value = Math.max(0, e.translationY); backdrop.value = Math.max(0, 1 - e.translationY / (height * 0.6)); })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 900) { runOnJS(haptic.light)(); runOnJS(onClose)(); }
      else { settle(y, 0, reduce, motion.spring.sheet); glide(backdrop, 1, reduce, 160); }
    });

  const panel = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const back = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  if (!mounted) return null;
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 50, justifyContent: "flex-end" }]} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }, back]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View style={[{ maxHeight: height * maxHeightPct }, panel]}>
        <View style={{ backgroundColor: c.card, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, paddingBottom: insets.bottom + 12, ...lift, shadowOffset: { width: 0, height: -8 } }}>
          <GestureDetector gesture={pan}>
            <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 6 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: c.line }} />
            </View>
          </GestureDetector>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}
