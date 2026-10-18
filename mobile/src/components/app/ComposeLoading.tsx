// After Compose: the sentence goes to ChainBrain and comes back as a pocket app. While it does, the owner sees the work
// in steps (read the sentence, write the rules, test payments against them, choose the blocks), each ticking off, with the
// sentence in a card and a light sweep over it. Full screen, the same canvas as what follows, so the canvas grows out of it.
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { c, motion } from "../../tokens";
import { T } from "../../ui/Text";
import { Icon, type IconName } from "../../ui/Icon";
import { BrandMark } from "../../ui/BrandMark";
import { useReduceMotion } from "../../ui/motion";
import { useCoverDock } from "../AskDock";

const STEPS: { icon: IconName; text: string }[] = [
  { icon: "chat", text: "Reading your sentence" },
  { icon: "key", text: "Writing the rules" },
  { icon: "checks", text: "Testing payments against them" },
  { icon: "layers", text: "Choosing blocks from 13" },
];
/** How long the steps take, so compose() can wait for the last tick. */
export const COMPOSE_MS = 2600;

export function ComposeLoading({ sentence }: { sentence: string }) {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  useCoverDock(true);
  const [at, setAt] = useState(0);
  useEffect(() => {
    const per = COMPOSE_MS / STEPS.length;
    const t = setInterval(() => setAt((n) => Math.min(n + 1, STEPS.length)), per);
    return () => clearInterval(t);
  }, []);
  const x = useSharedValue(-1);
  useEffect(() => { if (!reduce) x.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }), -1); }, [reduce, x]);
  const sweep = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * 260 }, { rotate: "16deg" }] }));
  const p = useSharedValue(1);
  useEffect(() => { if (!reduce) p.value = withRepeat(withSequence(withTiming(1.12, { duration: 600 }), withTiming(1, { duration: 600 })), -1); }, [reduce, p]);
  const beat = useAnimatedStyle(() => ({ transform: [{ scale: p.value }] }));
  return (
    <Animated.View entering={FadeIn.duration(motion.base)}
      style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 25, backgroundColor: c.canvas, paddingTop: insets.top + 60, paddingHorizontal: 28, alignItems: "center" }}
      accessibilityViewIsModal accessibilityLiveRegion="polite" accessibilityLabel={`Composing your pocket app. ${STEPS[Math.min(at, STEPS.length - 1)].text}`}>
      <Animated.View style={beat}><BrandMark size={56} /></Animated.View>
      <T v="section" style={{ marginTop: 18, textAlign: "center" }}>Composing your pocket app</T>
      <View style={{ alignSelf: "stretch", marginTop: 20, padding: 16, borderRadius: 18, backgroundColor: c.card, overflow: "hidden" }}>
        <T v="body" color="ink2" style={{ fontSize: 15, lineHeight: 22 }} numberOfLines={4}>{`“${sentence}”`}</T>
        <Animated.View pointerEvents="none" style={[{ position: "absolute", top: -40, bottom: -40, left: 0, width: 80, backgroundColor: "rgba(157,202,255,0.35)" }, sweep]} />
      </View>
      <View style={{ alignSelf: "stretch", marginTop: 24, gap: 14 }}>
        {STEPS.map((s, i) => {
          const done = i < at, now = i === at;
          return (
            <View key={s.text} style={{ flexDirection: "row", alignItems: "center", gap: 12, opacity: done || now ? 1 : 0.35 }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: done ? c.ink : c.card }}>
                <Icon name={done ? "check" : s.icon} size={14} color={done ? c.white : c.ink} stroke={2.4} />
              </View>
              <T v="row" w={now ? "bold" : "semi"}>{s.text}</T>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}
