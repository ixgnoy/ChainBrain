// A pocket as a printed card (Apple Wallet idea): solid navy or teal face, white print: name, balance, cap, ask-me limit,
// "valid thru", a short pocket suffix and a chip mark. No gradient, glow or blur. A revoked pocket freezes: the face settles to
// a cool grey and a few frost lines draw in (SVG strokes), once, when it happens.
import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import Animated, { interpolateColor, type SharedValue, useAnimatedProps, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { c, lift, motion } from "../tokens";
import { haptic } from "../haptics";
import { Money } from "../ui/Money";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { EASE_OUT, useReduceMotion } from "../ui/motion";
import { NEVER } from "../lib/shared";
import { cleanText } from "../lib/sanitize";
import { money, usd } from "../lib/util";
import type { Pocket } from "../store";
import { isExpired } from "./PocketCard";

export const CARD_RATIO = 1.586;
export const cardHeight = (w: number) => Math.round(w / CARD_RATIO);
export type Tone = "navy" | "teal";
const FACE: Record<Tone, string> = { navy: "#0F2236", teal: "#00727F" };
const FROZEN = "#5D6B7B";
/** Stable per pocket: the oldest is teal, the next navy, and so on (new pockets join at the front without recolouring the rest). */
export function toneFor(pockets: { address: string }[], address: string): Tone {
  const i = pockets.findIndex((p) => p.address.toLowerCase() === address.toLowerCase());
  const fromEnd = i < 0 ? 0 : pockets.length - 1 - i;
  return fromEnd % 2 === 0 ? "teal" : "navy";
}

const APath = Animated.createAnimatedComponent(Path);
const FROST = [
  "M350 0 L296 54 L276 50 M296 54 L304 96 M276 50 L246 30 M296 54 L330 70",
  "M350 40 L318 74 L322 108 M318 74 L292 84",
  "M0 221 L48 176 L44 150 M48 176 L88 182 M48 176 L28 150",
  "M0 190 L30 168 L22 136",
  "M350 221 L310 190 L316 168 M310 190 L276 196",
  "M120 0 L96 24 L100 44 M96 24 L66 18",
];

function Frost({ w, h, fr }: { w: number; h: number; fr: SharedValue<number> }) {
  return (
    <Svg width={w} height={h} viewBox="0 0 350 221" style={{ position: "absolute", left: 0, top: 0 }} pointerEvents="none">
      {FROST.map((d, i) => <FrostLine key={i} d={d} fr={fr} i={i} />)}
    </Svg>
  );
}
function FrostLine({ d, fr, i }: { d: string; fr: SharedValue<number>; i: number }) {
  const p = useAnimatedProps(() => ({ strokeDashoffset: 420 * (1 - Math.min(1, Math.max(0, (fr.value - i * 0.06) / 0.7))) }));
  return <APath d={d} stroke="rgba(255,255,255,0.34)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray="420 420" animatedProps={p} />;
}

/** One expiry format on every card: "23:59" when it ends today, "16 OCT" later. */
export const validThru = (expiresAt: bigint | number) => {
  const d = new Date(Number(expiresAt) * 1000);
  return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase();
};

export function PocketFace({ pocket, width, tone, buzz, shadow, focused = true }: { pocket: Pocket; width: number; tone: Tone; /** Warning haptic when it freezes in view */ buzz?: boolean; /** the single soft shadow (lifts a card off the one behind it) */ shadow?: boolean;
  /** the screen showing this card is in front: a freeze that happened while it was away plays when it comes back */ focused?: boolean; still?: boolean }) {
  const reduce = useReduceMotion();
  const k = width / 350;
  const h = cardHeight(width);
  const off = pocket.revoked || isExpired(pocket);
  const fr = useSharedValue(pocket.revoked ? 1 : 0);
  const grey = useSharedValue(off ? 1 : 0);
  const dip = useSharedValue(1);
  const was = useRef(pocket.revoked);
  const owed = useRef(false); // a freeze happened out of sight: play it when the card is seen
  const play = () => {
    grey.value = reduce ? 1 : withTiming(1, { duration: 700, easing: EASE_OUT });
    fr.value = reduce ? 1 : withTiming(1, { duration: 1100, easing: EASE_OUT });
    if (!reduce) dip.value = withSequence(withTiming(0.985, { duration: 160, easing: EASE_OUT }), withSpring(1, motion.spring.press));
    if (buzz) haptic.warning();
  };
  useEffect(() => {
    if (pocket.revoked && !was.current) { if (focused) play(); else owed.current = true; }
    else if (!pocket.revoked) { fr.value = 0; grey.value = reduce ? (off ? 1 : 0) : withTiming(off ? 1 : 0, { duration: 700, easing: EASE_OUT }); owed.current = false; }
    was.current = pocket.revoked;
  }, [pocket.revoked, off]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (focused && owed.current) { owed.current = false; fr.value = 0; grey.value = 0; setTimeout(play, 250); } }, [focused]); // eslint-disable-line react-hooks/exhaustive-deps
  const face = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(grey.value, [0, 1], [FACE[tone], FROZEN]), transform: [{ scale: dip.value }] }));
  const ask = pocket.askAbove === NEVER || pocket.askAbove > pocket.cap ? "Never" : pocket.askAbove === 0n ? "Every payment" : money(pocket.askAbove);
  const tail = pocket.address.slice(-4).toUpperCase();
  const line = "rgba(255,255,255,0.5)";
  const label = (t: string) => <T v="cap" w="semi" style={{ color: "rgba(255,255,255,0.58)", fontSize: 10.5, lineHeight: 14, letterSpacing: 1.1 }}>{t}</T>;
  const val = (t: string) => <T v="sub" w="semi" numberOfLines={1} style={{ color: c.onAccent, fontSize: 14, lineHeight: 20 }}>{t}</T>;
  const state = pocket.revoked ? (pocket.balance > 0n ? "Frozen · return funds" : "Stopped") : isExpired(pocket) ? "Ended" : null;
  return (
    <Animated.View style={[{ width, height: h, borderRadius: 20, overflow: "hidden" }, shadow ? { ...lift, shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.09, shadowRadius: 14 } : null, face]}>
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" }} />
      <Frost w={width} h={h} fr={fr} />
      <View style={{ position: "absolute", left: 20, right: 20, top: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <T v="row" w="semi" numberOfLines={1} style={{ color: c.onAccent, flexShrink: 1, fontSize: 17 }}>{cleanText(pocket.name, 24)}</T>
        <View style={{ opacity: off ? 0.6 : 1 }}><Money v="section" value={usd(pocket.balance)} color="onAccent" label={`${cleanText(pocket.name, 24)} balance`} decorative /></View>
      </View>
      {state ? (
        <View accessibilityLabel={state} style={{ position: "absolute", left: 20, top: 41, height: 20, paddingHorizontal: 8, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.2)", flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Icon name="lock" size={11} color={c.onAccent} stroke={2.2} />
          <T v="cap" w="semi" style={{ color: c.onAccent, fontSize: 11, lineHeight: 14 }}>{state}</T>
        </View>
      ) : null}
      <View style={{ position: "absolute", left: 20, right: 20, top: 80 * k, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ width: 40, height: 30, borderRadius: 7, borderWidth: 1.2, borderColor: line, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
          <View style={{ position: "absolute", left: 0, right: 0, top: 9, height: 1, backgroundColor: line }} />
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 9, height: 1, backgroundColor: line }} />
          <View style={{ position: "absolute", top: 0, bottom: 0, left: 13, width: 1, backgroundColor: line }} />
          <View style={{ position: "absolute", top: 0, bottom: 0, right: 13, width: 1, backgroundColor: line }} />
          <View style={{ position: "absolute", left: 13, right: 13, top: 9, bottom: 9, borderWidth: 1, borderColor: line, borderRadius: 3 }} />
        </View>
        <T v="cap" w="semi" style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, lineHeight: 16, letterSpacing: 0.4 }}>ChainBrain</T>
      </View>
      <T v="row" w="medium" style={{ position: "absolute", left: 20, top: 122 * k, color: "rgba(255,255,255,0.92)", fontSize: 18, lineHeight: 24, letterSpacing: 2.2 }}>{"••••  ••••  "}{tail}</T>
      <View style={{ position: "absolute", left: 20, right: 20, bottom: 16, flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
        <View style={{ gap: 1, flexShrink: 1 }}>{label("CAP")}{val(money(pocket.cap))}</View>
        <View style={{ gap: 1, flexShrink: 1 }}>{label("ASK ME ABOVE")}{val(ask)}</View>
        <View style={{ gap: 1 }}>{label("VALID THRU")}{val(validThru(pocket.expiresAt))}</View>
      </View>
    </Animated.View>
  );
}
