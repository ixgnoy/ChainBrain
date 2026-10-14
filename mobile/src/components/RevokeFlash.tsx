import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { useApp } from "../store";
import { useTheme } from "../theme";
import { useReduceMotion } from "../ui/motion";

/** Brief slate flash across the whole app when a revoke lands. */
export function RevokeFlash() {
  const { flash } = useApp();
  const { c } = useTheme();
  const reduce = useReduceMotion();
  const o = useSharedValue(0);
  useEffect(() => { if (flash > 0 && !reduce) o.value = withSequence(withTiming(0.2, { duration: 90 }), withTiming(0, { duration: 360 })); }, [flash, o, reduce]);
  const s = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: c.revoked, zIndex: 80 }, s]} />;
}
