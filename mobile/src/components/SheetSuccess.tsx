// The success moment inside a sheet (approval co-signed, money added, funds returned, rule saved, revoked): the card lands with
// a SuccessMark and the 0.974 landing dip, then the transaction hash rows fade up 60 ms after the check has drawn. The mark
// owns the Success haptic. `minHeight` keeps the sheet from shrinking when this replaces the form.
import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { c } from "../tokens";
import { EASE_OUT, useReduceMotion } from "../ui/motion";
import { SuccessMark, landingDip } from "../ui/SuccessMark";
import { T } from "../ui/Text";
import { TxLink } from "./TxLink";

const HASH_DELAY = 140 + 260 + 60; // the check starts at 140 ms and draws for 260 ms; the hash follows 60 ms later

export function SheetSuccess({ title, sub, txs, minHeight = 0 }: { title: string; sub?: string; txs?: { label?: string; hash: string }[]; minHeight?: number }) {
  const reduce = useReduceMotion();
  const scale = useSharedValue(1);
  const rise = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    const t = setTimeout(() => landingDip(scale, reduce), 260);
    rise.value = reduce ? withDelay(120, withTiming(1, { duration: 200 })) : withDelay(HASH_DELAY, withTiming(1, { duration: 260, easing: EASE_OUT }));
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const card = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const rows = useAnimatedStyle(() => ({ opacity: rise.value, transform: [{ translateY: (1 - rise.value) * 8 }] }));
  return (
    <Animated.View entering={FadeIn.duration(180).delay(60)} style={{ minHeight, justifyContent: "center", paddingHorizontal: 20, paddingVertical: 8, gap: 16 }}>
      <Animated.View accessibilityLiveRegion="polite" style={[{ backgroundColor: c.accentSoft, borderRadius: 20, paddingVertical: 28, paddingHorizontal: 20, alignItems: "center", gap: 14 }, card]}>
        <SuccessMark size={64} />
        <View style={{ alignItems: "center", gap: 4 }}>
          <T v="section" style={{ textAlign: "center" }}>{title}</T>
          {sub ? <T v="sub" color="ink2" style={{ textAlign: "center" }}>{sub}</T> : null}
        </View>
      </Animated.View>
      {txs?.length ? (
        <Animated.View style={[{ gap: 8, paddingHorizontal: 4 }, rows]}>
          {txs.map((t) => (
            <View key={t.hash} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <T v="cap" color="ink2">{t.label ?? "Transaction"}</T>
              <TxLink tx={t.hash} />
            </View>
          ))}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}
