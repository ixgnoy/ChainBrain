// A pocket as a physical card (DESIGN.md "Layered Credit / Pocket Cards"): one of four faces by deck slot (matte black,
// electric vermillion, powder blue, white hatch), ISO proportions, 20 radius. Print: the pocket's name and the agent that holds
// it (its own mark), the balance as a figure, cap and ask-me chips, the short pocket number and the expiry, in mono-card caps.
// Everything on it is read from the pocket contract. A revoked or ended pocket settles to the white hatch face with a lock;
// when it happens in view the hatch draws in (opacity), the card dips and the phone gives a Warning tick.
import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { c, deck, level3, motion, type DeckFace } from "../tokens";
import { haptic } from "../haptics";
import { Money } from "../ui/Money";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { Hatch } from "../ui/Hatch";
import { AgentAvatar } from "../ui/AgentAvatar";
import { EASE_OUT, useReduceMotion } from "../ui/motion";
import { NEVER } from "../lib/shared";
import { cleanText } from "../lib/sanitize";
import { money, usd } from "../lib/util";
import { agentInfo } from "../../../shared/sim/agents";
import type { Pocket } from "../store";
import { isExpired } from "./PocketCard";

export const CARD_RATIO = 1.586;
export const cardHeight = (w: number) => Math.round(w / CARD_RATIO);
/** Deck slot 0..3 (black, vermillion, blue, white hatch). Older callers passed "navy" / "teal". */
export type Tone = number;
/** Stable per pocket: the list is newest first, so a pocket's rank from the end is its creation order; the oldest is black,
 *  then vermillion, blue, white hatch, and a new pocket never recolours the others. */
export function toneFor(pockets: { address: string }[], address: string): Tone {
  const i = pockets.findIndex((p) => p.address.toLowerCase() === address.toLowerCase());
  return (i < 0 ? 0 : pockets.length - 1 - i) % deck.length;
}
export const faceOf = (tone: Tone): DeckFace => deck[((tone % deck.length) + deck.length) % deck.length];
const FROZEN: DeckFace = deck[3];

/** One expiry format on every card: "23:59" when it ends today, "16 OCT" later. */
export const validThru = (expiresAt: bigint | number) => {
  const d = new Date(Number(expiresAt) * 1000);
  return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase();
};

export function PocketFace({ pocket, width, tone, buzz, shadow, focused = true }: { pocket: Pocket; width: number; tone: Tone; /** Warning haptic when it freezes in view */ buzz?: boolean;
  /** the level-3 card shadow (DESIGN.md: fanned cards) */ shadow?: boolean;
  /** the screen showing this card is in front: a freeze that happened while it was away plays when it comes back */ focused?: boolean; still?: boolean }) {
  const reduce = useReduceMotion();
  const h = cardHeight(width);
  const k = Math.min(1, width / 340);
  const off = pocket.revoked || !!pocket.frozen || isExpired(pocket);
  const frost = useSharedValue(off ? 1 : 0);
  const dip = useSharedValue(1);
  const was = useRef(off);
  const owed = useRef(false); // a freeze happened out of sight: play it when the card is seen
  const play = () => {
    frost.value = reduce ? 1 : withTiming(1, { duration: 700, easing: EASE_OUT });
    if (!reduce) dip.value = withSequence(withTiming(0.975, { duration: 160, easing: EASE_OUT }), withSpring(1, motion.spring.press));
    if (buzz) haptic.warning();
  };
  useEffect(() => {
    if (off && !was.current) { if (focused) play(); else owed.current = true; }
    else if (!off) { frost.value = reduce ? 0 : withTiming(0, { duration: 500, easing: EASE_OUT }); owed.current = false; }
    was.current = off;
  }, [off]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!focused || !owed.current) return;
    owed.current = false; frost.value = 0;
    const t = setTimeout(play, 250);
    return () => clearTimeout(t);
  }, [focused]); // eslint-disable-line react-hooks/exhaustive-deps
  const live = useAnimatedStyle(() => ({ opacity: 1 - frost.value }));
  const dead = useAnimatedStyle(() => ({ opacity: frost.value }));
  const dipStyle = useAnimatedStyle(() => ({ transform: [{ scale: dip.value }] }));

  const name = cleanText(pocket.name, 24);
  const agent = agentInfo(pocket.agentId ?? "");
  const state = pocket.revoked ? "Revoked" : pocket.frozen ? "Frozen" : isExpired(pocket) ? "Ended" : null;
  return (
    <Animated.View style={[{ width, height: h, borderRadius: 20, borderCurve: "continuous" } as object, shadow ? level3 : null, dipStyle]}>
      <View style={{ flex: 1, borderRadius: 20, overflow: "hidden", borderCurve: "continuous" } as object}>
        <Animated.View style={[{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }, live]}>
          <Print pocket={pocket} name={name} agent={agent?.name} agentId={pocket.agentId} face={faceOf(tone)} k={k} />
        </Animated.View>
        <Animated.View pointerEvents={off ? "auto" : "none"} style={[{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }, dead]}>
          <Print pocket={pocket} name={name} agent={agent?.name} agentId={pocket.agentId} face={FROZEN} k={k} state={state ?? "Revoked"} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

function Print({ pocket, name, agent, agentId, face, k, state }: { pocket: Pocket; name: string; agent?: string; agentId?: string; face: DeckFace; k: number; state?: string }) {
  const ask = pocket.askAbove === NEVER || pocket.askAbove > pocket.cap ? "Never" : pocket.askAbove === 0n ? "Always" : money(pocket.askAbove);
  const tail = pocket.address.slice(-4).toUpperCase();
  const ink = state ? c.muted : face.ink;
  const sub = state ? c.muted : face.sub;
  const hatched = "hatch" in face && face.hatch;
  const fact = (label: string, value: string) => (
    <View style={{ paddingHorizontal: 9, height: 24, borderRadius: 12, backgroundColor: face.chip, flexDirection: "row", alignItems: "center", gap: 5 }}>
      <T v="tab" style={{ color: sub, letterSpacing: 0.6, fontSize: 10 }}>{label}</T>
      <T v="cap" w="bold" style={{ color: ink, fontSize: 12 }}>{value}</T>
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: face.face, padding: 18 * k + 2 }}>
      {hatched ? <Hatch color={c.line} pitch={7} stroke={1.5} /> : <Hatch color={face.ink} pitch={9} stroke={1.5} opacity={0.08} style={{ left: "58%" }} />}
      {/* top: name, and the agent that holds the pocket */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <T v="head" numberOfLines={1} style={{ color: ink, flexShrink: 1, fontSize: 18 * Math.max(k, 0.9) }}>{name}</T>
        {state ? (
          <View accessibilityLabel={state} style={{ height: 24, paddingHorizontal: 9, borderRadius: 12, backgroundColor: c.vermillionSoft, flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Icon name="lock" size={12} color={c.vermillionInk} stroke={2.2} />
            <T v="tab" style={{ color: c.vermillionInk, textTransform: "uppercase", letterSpacing: 0.8 }}>{state}</T>
          </View>
        ) : agent ? (
          <View style={{ height: 26, paddingLeft: 3, paddingRight: 9, borderRadius: 13, backgroundColor: face.chip, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <AgentAvatar kind={agentId ?? ""} size={20} />
            <T v="cap" w="bold" style={{ color: ink, fontSize: 11.5 }}>{agent}</T>
          </View>
        ) : null}
      </View>
      {/* middle: the balance */}
      <View style={{ marginTop: 10 * k + 4 }}>
        <T v="tab" style={{ color: sub, textTransform: "uppercase", letterSpacing: 0.9 }}>{state ? "Left in the pocket" : "Available"}</T>
        <Money v="amount" value={usd(pocket.balance)} color={state ? "muted" : (face.ink === "#FFFFFF" ? "white" : "ink")} label={`${name} balance`} decorative />
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: "row", gap: 6, marginBottom: 10 * k + 2 }}>
        {fact("CAP", money(pocket.cap))}
        {fact("ASK ABOVE", ask)}
      </View>
      {/* bottom: short pocket number and expiry, mono-card caps */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <T v="mono" style={{ color: ink }}>{`••••  ${tail}`}</T>
        <T v="mono" style={{ color: sub, fontSize: 11.5 }}>{`VALID THRU ${validThru(pocket.expiresAt)}`}</T>
      </View>
    </View>
  );
}
