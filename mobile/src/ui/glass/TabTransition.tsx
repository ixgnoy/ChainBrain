// Tab screen transition: the entering screen slides in from the direction of travel and fades up (Family's directional
// tabs); the outgoing screen hides at once. Builds on expo-glass-tabs' fading-tab-slot (MIT, © 2026 David Mokos).
import { useEffect, useRef, type PropsWithChildren } from "react";
import { StyleSheet } from "react-native";
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Screen } from "react-native-screens";
import type { TabsDescriptor, TabsSlotRenderOptions } from "expo-router/ui";
import { motion } from "../../tokens";
import { EASE_OUT, isReducedMotion } from "../motion";

const ORDER = ["index", "agents", "brain", "activity", "settings"];
let lastIndex = 0;
const SHIFT = 28;

function Enter({ focused, index, children }: PropsWithChildren<{ focused: boolean; index: number }>) {
  const p = useSharedValue(1);
  const dir = useSharedValue(0);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; if (focused) lastIndex = index; return; } // no animation on launch
    if (!focused) return;
    dir.value = Math.sign(index - lastIndex);
    lastIndex = index;
    if (isReducedMotion()) { p.value = 1; return; }
    p.value = 0;
    p.value = withTiming(1, { duration: motion.tab, easing: EASE_OUT });
  }, [focused, index, p, dir]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.6, 1], [0, 1, 1]),
    transform: [{ translateX: (1 - p.value) * SHIFT * dir.value }, { scale: interpolate(p.value, [0, 1], [0.99, 1]) }],
  }));
  return <Animated.View style={[{ flex: 1 }, style]}>{children}</Animated.View>;
}

/** Drop-in TabSlot renderFn (same mounting rules as expo-router's default: lazy, frozen when blurred). */
export function renderTabScreen(descriptor: TabsDescriptor, { isFocused, loaded, detachInactiveScreens }: TabsSlotRenderOptions) {
  const { lazy = true, unmountOnBlur, freezeOnBlur } = descriptor.options as { lazy?: boolean; unmountOnBlur?: boolean; freezeOnBlur?: boolean };
  if (unmountOnBlur && !isFocused) return null;
  if (lazy && !loaded && !isFocused) return null;
  const index = Math.max(ORDER.indexOf(descriptor.route.name), 0);
  return (
    <Screen key={descriptor.route.key} enabled={detachInactiveScreens} activityState={isFocused ? 2 : 0} freezeOnBlur={freezeOnBlur}
      style={[styles.screen, isFocused ? styles.focused : styles.unfocused]}>
      <Enter focused={isFocused} index={index}>{descriptor.render()}</Enter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, position: "relative", height: "100%" },
  focused: { zIndex: 1, display: "flex", flexShrink: 0, flexGrow: 1 },
  unfocused: { zIndex: -1, display: "none", flexShrink: 1, flexGrow: 0 },
});
