// The cheque: an agent's payment request drawn on the pocket it would pay from. The sheet opens on the pocket's own card,
// which turns over to show the cheque on its back: pay how much, to whom, for what, and what is left in the pocket after.
// Every line on it comes from the wallet's own checks (the signed authorization, the seller list, the pocket contract); the
// agent's words are never on the cheque, they sit below it, marked as not checked. Reduce Motion: the cheque, no turn.
import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from "react-native-reanimated";
import { c } from "../tokens";
import { T } from "../ui/Text";
import { Money } from "../ui/Money";
import { Hatch } from "../ui/Hatch";
import { CardMaterial } from "../ui/CardMaterial";
import { SellerMark, hasSellerMark } from "../ui/SellerMark";
import { useReduceMotion } from "../ui/motion";
import { TextScaleCap } from "../ui/fontScale";
import { haptic } from "../haptics";
import { contractTail, usd } from "../lib/util";
import { cleanText } from "../lib/sanitize";
import type { Pocket } from "../store";
import { PocketFace, cardHeight, expiryText } from "./PocketFace";

const R = 18;

export function ChequeCard({ pocket, tone, width, amount, seller, sellerId, item, until }: {
  pocket: Pocket; tone: number; width: number; amount: bigint | null; seller: string; sellerId?: string; item: string; until?: number;
}) {
  const reduce = useReduceMotion();
  const h = cardHeight(width);
  const turn = useSharedValue(reduce ? 180 : 0);
  useEffect(() => {
    if (reduce) return;
    turn.value = withDelay(420, withSpring(180, { duration: 900, dampingRatio: 0.82 }));
    const t = setTimeout(() => haptic.soft(), 760); // the card lands on its back
    return () => clearTimeout(t);
  }, [reduce, turn]);
  const front = useAnimatedStyle(() => ({ transform: [{ perspective: 1100 }, { rotateY: `${turn.value}deg` }] }));
  const back = useAnimatedStyle(() => ({ transform: [{ perspective: 1100 }, { rotateY: `${turn.value - 180}deg` }] }));
  const after = amount != null ? pocket.balance - amount : null;
  return (
    <View style={{ width, height: h + 4 }} accessible accessibilityLabel={`Cheque from ${cleanText(pocket.name, 30)}: pay US$${amount != null ? usd(amount) : "?"} to ${seller}, for ${item}.${after != null && after >= 0n ? ` US$${usd(after)} left after this.` : ""}`}>
      <Animated.View style={[{ position: "absolute", left: 0, top: 0, backfaceVisibility: "hidden" }, front]}>
        <PocketFace pocket={pocket} width={width} tone={tone} still />
      </Animated.View>
      <Animated.View style={[{ position: "absolute", left: 0, top: 0, backfaceVisibility: "hidden" }, back]}>
        <Back pocket={pocket} width={width} height={h} amount={amount} seller={seller} sellerId={sellerId} item={item} after={after} until={until} />
      </Animated.View>
    </View>
  );
}

function Back({ pocket, width, height, amount, seller, sellerId, item, after, until }: {
  pocket: Pocket; width: number; height: number; amount: bigint | null; seller: string; sellerId?: string; item: string; after: bigint | null; until?: number;
}) {
  const k = Math.min(1, width / 340);
  const pad = 16 * k + 2;
  const tail = contractTail(pocket.address);
  const time = until ? new Date(until * 1000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : null;
  return (
    <TextScaleCap max={1}>
    <View style={{ width, height: height + 4 }}>
      <View style={{ position: "absolute", left: 0, top: 4, width, height, borderRadius: R, backgroundColor: "#C9C8C3" }} />
      <View style={{ width, height, borderRadius: R, borderCurve: "continuous", overflow: "hidden", backgroundColor: "#FBFAF7" } as object}>
        <CardMaterial width={width} height={height} dark={false} />
        {/* the stripe: what this is and which pocket pays */}
        <View style={{ height: 30 * k + 4, backgroundColor: c.ink, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: pad }}>
          <T v="tab" style={{ color: c.white, textTransform: "uppercase", letterSpacing: 1.1 }} numberOfLines={1}>{`Co-sign · ${cleanText(pocket.name, 22)}`}</T>
          <T v="mono" style={{ color: c.white, textTransform: "none", fontSize: 13 }}>{tail}</T>
        </View>
        <View style={{ flex: 1, paddingHorizontal: pad, paddingTop: 10 * k, gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
            <View>
              <T v="tab" color="muted" style={{ textTransform: "uppercase", letterSpacing: 1 }}>Pay</T>
              <Money v={k >= 0.9 ? "amount" : "section"} value={amount != null ? usd(amount) : "?"} label={`Pay US$${amount != null ? usd(amount) : "?"}`} decorative />
            </View>
            <T v="cap" w="semi" color="muted" style={{ marginBottom: 6 }}>{time ? `Valid until ${time}` : expiryText(pocket.expiresAt)}</T>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <T v="head" numberOfLines={1} style={{ fontSize: 18 * Math.max(k, 0.9), flexShrink: 1 }}>{`to ${seller}`}</T>
            {sellerId && hasSellerMark(sellerId) ? <SellerMark id={sellerId} size={22} radius={6} /> : null}
          </View>
          <T v="sub" color="ink2" numberOfLines={2}>{`for ${item}`}</T>
        </View>
        {/* the signature line */}
        <View style={{ marginHorizontal: pad, height: 10, overflow: "hidden", borderRadius: 2 }}>
          <Hatch color={c.line} pitch={6} stroke={1.2} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: pad, paddingTop: 6, paddingBottom: pad - 4 }}>
          <T v="cap" color="muted">Your key signs this one payment</T>
          {after != null && after >= 0n ? <T v="cap" w="semi">{`US$${usd(after)} left after`}</T> : null}
        </View>
      </View>
    </View>
    </TextScaleCap>
  );
}

/** One line under the cheque per wallet check: icon-less, label left, value right (VaultBank's quiet rows). */
export function CheckLine({ label, value, tone = "ink", last }: { label: string; value: string; tone?: "ink" | "vermillion" | "green"; last?: boolean }) {
  const color = tone === "vermillion" ? c.vermillionInk : tone === "green" ? c.greenInk : c.ink;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 13, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.tileStroke }}>
      <T v="sub" color="muted">{label}</T>
      <T v="row" numberOfLines={2} style={{ color, flexShrink: 1, textAlign: "right" }}>{value}</T>
    </View>
  );
}

