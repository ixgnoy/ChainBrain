// Composer action: nothing until there is text, then a 36 px teal send disc that springs in (no grey "disabled" arrow). While the
// agent works it becomes Stop (ink disc, white square) if the owner can stop it (revoking the pocket is the stop path), and
// otherwise stays hidden. Labels stay "Send" / "Stop agent" for assistive tech and tests. The send haptic is fired by the caller.
import React from "react";
import { View } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { c, motion } from "../tokens";
import { Press, type PressTap } from "./kit";
import { useAutoplayTarget } from "../lib/autoplayTargets";
import { Icon } from "./Icon";
import { settle, useReduceMotion } from "./motion";

export function SendButton({ ready, stop, onPress, onStop, onAutoStop, tapRef }: { ready: boolean; /** the agent works and the owner can stop it */ stop?: boolean; onPress: () => void; onStop?: () => void;
  /** what the auto-play's press of Stop does (a finger's tap on Stop ends the auto-play instead) */ onAutoStop?: () => void; /** hands out the send press for the auto-play */ tapRef?: React.MutableRefObject<PressTap | null> }) {
  const own = React.useRef<PressTap | null>(null);
  const ref = tapRef ?? own;
  useAutoplayTarget("revoke.open", async () => (ref.current ? ref.current(onAutoStop ?? onStop) : false), !!stop);
  const reduce = useReduceMotion();
  const show = useSharedValue(ready || stop ? 1 : 0);
  const mode = useSharedValue(stop ? 1 : 0);
  React.useEffect(() => {
    settle(show, ready || stop ? 1 : 0, reduce, motion.spring.snappy);
    settle(mode, stop ? 1 : 0, reduce, motion.spring.snappy);
  }, [ready, stop, reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  const disc = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, show.value)), transform: [{ scale: 0.6 + 0.4 * Math.min(1, Math.max(0, show.value)) }], backgroundColor: interpolateColor(mode.value, [0, 1], [c.accent, c.ink]) }));
  const arrow = useAnimatedStyle(() => ({ opacity: 1 - mode.value }));
  const square = useAnimatedStyle(() => ({ opacity: mode.value }));
  const active = ready || !!stop;
  return (
    <Press tapRef={ref} onPress={stop ? onStop : onPress} haptics={stop ? "medium" : "none"} disabled={!active} accessibilityRole="button" accessibilityLabel={stop ? "Stop agent" : "Send"} accessibilityState={{ disabled: !active }}
      style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }} pointerEvents={active ? "auto" : "none"}>
      <Animated.View style={[{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" }, disc]}>
        <Animated.View style={[{ position: "absolute" }, arrow]}><Icon name="arrowUp" size={20} color={c.onAccent} stroke={2.2} /></Animated.View>
        <Animated.View style={[{ position: "absolute" }, square]}><View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: c.onAccent }} /></Animated.View>
      </Animated.View>
    </Press>
  );
}
