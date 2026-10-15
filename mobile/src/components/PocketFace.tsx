// A pocket as a physical card, VaultBank's anatomy in 2.5D: one of four faces by deck slot (black, vermillion, powder blue,
// white hatch), ISO proportions, a stripe across the card carrying the holding agent on a white pill, the balance, the rules
// in one line, the short pocket number big at the bottom. Depth: the card's side shows under the face, a Skia material
// (grain, top light, a specular band) sits under the print, and the card in focus leans with the phone (ui/tilt.tsx).
// Everything on it is read from the pocket contract. A revoked, frozen or ended pocket settles to the white hatch face with
// a lock; when it happens in view the face cross-fades, the card dips and the phone gives a Warning tick.
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
import { CardMaterial } from "../ui/CardMaterial";
import { useTilt } from "../ui/tilt";
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

export function PocketFace({ pocket, width, tone, buzz, shadow, focused = true, tilt, still }: { pocket: Pocket; width: number; tone: Tone; /** Warning haptic when it freezes in view */ buzz?: boolean;
  /** lean with the phone (the one card in focus: the pocket page, the front of the deck) */ tilt?: boolean;
  /** the level-3 card shadow (DESIGN.md: fanned cards) */ shadow?: boolean;
  /** the screen showing this card is in front: a freeze that happened while it was away plays when it comes back */ focused?: boolean;
  /** no material layer (the flying copy, small thumbnails) */ still?: boolean }) {
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
  // 2.5D: the card leans with the phone (tilt) and its side shows under the face, shifting the other way
  const t = useTilt();
  const lean = !!tilt && !reduce;
  const body = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { rotateX: `${lean ? -t.y.value * 7 : 0}deg` },
      { rotateY: `${lean ? t.x.value * 7 : 0}deg` },
      { scale: dip.value },
    ],
  }));
  const edgeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: lean ? -t.x.value * 3 : 0 }, { translateY: EDGE + (lean ? t.y.value * 2 : 0) }] }));

  const name = cleanText(pocket.name, 24);
  const agent = agentInfo(pocket.agentId ?? "");
  const state = pocket.revoked ? "Revoked" : pocket.frozen ? "Frozen" : isExpired(pocket) ? "Ended" : null;
  const face = faceOf(tone);
  return (
    <Animated.View style={[{ width, height: h + EDGE }, body]}>
      {/* the card's side, under the face */}
      <Animated.View style={[{ position: "absolute", left: 0, top: 0, width, height: h, borderRadius: R, borderCurve: "continuous", backgroundColor: off ? FROZEN.edge : face.edge } as object, shadow ? level3 : null, edgeStyle]} />
      <View style={{ width, height: h, borderRadius: R, overflow: "hidden", borderCurve: "continuous" } as object}>
        <Animated.View style={[{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }, live]}>
          <Print pocket={pocket} name={name} agent={agent?.name} agentId={pocket.agentId} face={face} k={k} w={width} h={h} still={still} />
        </Animated.View>
        <Animated.View pointerEvents={off ? "auto" : "none"} style={[{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }, dead]}>
          <Print pocket={pocket} name={name} agent={agent?.name} agentId={pocket.agentId} face={FROZEN} k={k} w={width} h={h} state={state ?? "Revoked"} still />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const R = 18;
/** How much of the card's side shows under the face (pt). */
const EDGE = 4;

/** "Exp. 30/10", or "Ends 23:59" on its last day. */
export const expiryText = (expiresAt: bigint | number) => {
  const d = new Date(Number(expiresAt) * 1000);
  if (d.toDateString() === new Date().toDateString()) return `Ends ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
  return `Exp. ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/** The print, VaultBank's card anatomy: the pocket name, a stripe across the card carrying the holding agent on a white pill,
 *  the balance, the pocket's rules in one line, and the short pocket number big at the bottom with the expiry. */
function Print({ pocket, name, agent, agentId, face, k, w, h, state, still }: { pocket: Pocket; name: string; agent?: string; agentId?: string; face: DeckFace; k: number; w: number; h: number; state?: string; still?: boolean }) {
  const ask = pocket.askAbove === NEVER || pocket.askAbove > pocket.cap ? "never asks" : pocket.askAbove === 0n ? "asks every time" : `asks above ${money(pocket.askAbove)}`;
  const tail = pocket.address.slice(-4).toUpperCase();
  const ink = state ? c.muted : face.ink;
  const sub = state ? c.muted : face.sub;
  const hatched = "hatch" in face && face.hatch;
  const dark = face.ink === "#FFFFFF";
  const pad = 16 * k + 4;
  return (
    <View style={{ flex: 1, backgroundColor: face.face }}>
      {hatched ? <Hatch color={c.line} pitch={7} stroke={1.5} /> : null}
      {!still ? <CardMaterial width={w} height={h} dark={dark} /> : null}
      {/* top: the pocket's name, or its state */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingHorizontal: pad, paddingTop: pad - 2, height: pad + 26 * k }}>
        <T v="head" numberOfLines={1} style={{ color: ink, flexShrink: 1, fontSize: 17 * Math.max(k, 0.9) }}>{name}</T>
        {state ? (
          <View accessibilityLabel={state} style={{ height: 24, paddingHorizontal: 9, borderRadius: 12, backgroundColor: c.vermillionSoft, flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Icon name="lock" size={12} color={c.vermillionInk} stroke={2.2} />
            <T v="tab" style={{ color: c.vermillionInk, textTransform: "uppercase", letterSpacing: 0.8 }}>{state}</T>
          </View>
        ) : null}
      </View>
      {/* the stripe, with the agent that holds the pocket on a white pill */}
      <View style={{ marginTop: 8 * k, height: 36 * k + 4, backgroundColor: state ? c.ink2 : face.band, justifyContent: "center", paddingHorizontal: pad, overflow: "hidden" }}>
        {face.band === face.face || dark ? <Hatch color="#FFFFFF" pitch={6} stroke={1} opacity={0.12} /> : null}
        <View style={{ alignSelf: "flex-start", height: 24 * k + 2, paddingLeft: 3, paddingRight: 10, borderRadius: 999, backgroundColor: c.white, flexDirection: "row", alignItems: "center", gap: 6 }}>
          {agentId ? <AgentAvatar kind={agentId} size={Math.round(18 * k + 2)} /> : <View style={{ width: 6 }} />}
          <T v="cap" w="semi" numberOfLines={1} style={{ color: c.ink, fontSize: 12 * Math.max(k, 0.9) }}>{agent ? `${agent} · agent pocket` : "Your pocket"}</T>
        </View>
      </View>
      {/* the balance and the rules */}
      <View style={{ paddingHorizontal: pad, marginTop: 10 * k }}>
        <T v="tab" style={{ color: sub, textTransform: "uppercase", letterSpacing: 0.9 }}>{state ? "Left in the pocket" : "Available"}</T>
        <Money v={k >= 0.9 ? "amount" : "section"} value={usd(pocket.balance)} color={state ? "muted" : dark ? "white" : "ink"} label={`${name} balance`} decorative />
      </View>
      <View style={{ flex: 1 }} />
      {/* bottom: the short pocket number, big, and the expiry */}
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: pad, paddingBottom: pad - 2 }}>
        <View>
          <T v="cap" style={{ color: sub, marginBottom: 2 }} numberOfLines={1}>{`Cap ${money(pocket.cap)} · ${ask}`}</T>
          <T v="mono" style={{ color: ink, fontSize: 22 * k, lineHeight: 26 * k, letterSpacing: 0.4, textTransform: "none" }}>{`*${tail}`}</T>
        </View>
        <T v="cap" w="semi" style={{ color: sub, marginBottom: 3 }}>{expiryText(pocket.expiresAt)}</T>
      </View>
    </View>
  );
}
