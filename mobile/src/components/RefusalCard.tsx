// A refusal or a data-request disclosure: the card enters, shakes once (shake token) with an Error haptic, and its tint starts
// strong and settles to calm over 600 ms. Played once per card id per session (re-mounting a tab never re-buzzes).
import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { c } from "../tokens";
import { CodePill } from "../ui/kit";
import { T } from "../ui/Text";
import { Rise, firstTime } from "../ui/Rise";
import { EASE_OUT, shake, useReduceMotion } from "../ui/motion";
import { haptic } from "../haptics";
import { plainReason } from "../lib/plain";
import { ledgerFrom, type WalletEvent } from "../lib/events";
import { cleanText } from "../lib/sanitize";

const STRONG = "rgba(200,55,45,0.16)"; // negative at 16 %: the first beat of the refusal, then it settles to the calm tint

/** `id` identifies the card for the once-only shake and haptic. */
export function RefusalCard({ id, children, radius = 16 }: { id: string; children: React.ReactNode; radius?: number }) {
  const reduce = useReduceMotion();
  const dx = useSharedValue(0);
  const tint = useSharedValue(1);
  useEffect(() => {
    if (!firstTime(`refusal:${id}`)) { tint.value = 0; return; }
    const t = setTimeout(() => {
      haptic.error();
      shake(dx, reduce);
      tint.value = withTiming(0, { duration: 600, easing: EASE_OUT });
    }, 140);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const move = useAnimatedStyle(() => ({ transform: [{ translateX: dx.value }] }));
  const wash = useAnimatedStyle(() => ({ opacity: tint.value }));
  return (
    <Rise dy={8} duration={240} layout>
      <Animated.View style={[{ borderRadius: radius, backgroundColor: c.warningSoft, overflow: "hidden" }, move]}>
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: STRONG }, wash]} />
        <View style={{ padding: 14, gap: 6 }}>{children}</View>
      </Animated.View>
    </Rise>
  );
}

// reasons that have their own card or are not a refusal by the pocket's rules
const SKIP = new Set(["NEEDS_OWNER_APPROVAL", "OWNER_DECLINED", "APPROVAL_EXPIRED", "POCKET_REVOKED", "DISCLOSURE_REFUSED", "SIGNATURE_TYPE_NOT_ALLOWED"]);

/** Per seller, the rules that said no in this turn (quote-time blocks and pay refusals), e.g. scene 4's SELLER_NOT_ALLOWED. */
export function refusalsOf(evs: WalletEvent[]) {
  const by = new Map<string, { sellerId: string; reasons: string[] }>();
  for (const r of ledgerFrom(evs)) {
    if ((r.kind !== "blocked" && r.kind !== "refusal") || !r.sellerId) continue;
    const reasons = r.reasons.filter((x) => !SKIP.has(x));
    if (!reasons.length) continue;
    const hit = by.get(r.sellerId);
    if (hit) hit.reasons = [...new Set([...hit.reasons, ...reasons])]; else by.set(r.sellerId, { sellerId: r.sellerId, reasons: [...new Set(reasons)] });
  }
  return [...by.values()];
}

export function SellerRefusal({ id, seller, reasons }: { id: string; seller: string; reasons: string[] }) {
  return (
    <RefusalCard id={id}>
      <T v="sub" w="semi" color="warning">{cleanText(seller, 40)} was refused</T>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
        <T v="sub" color="ink2" style={{ flexShrink: 1 }}>{reasons.map((r) => plainReason(r)).join(", ").replace(/^./, (x) => x.toUpperCase())}.</T>
        {reasons.map((r) => <CodePill key={r} code={r} tone="warning" />)}
      </View>
    </RefusalCard>
  );
}
