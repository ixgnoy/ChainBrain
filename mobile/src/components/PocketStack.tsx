// Home's pockets as a physical deck (DESIGN.md "Card Deck Component"): up to four cards fanned between -6° and +6°, each a
// level-3 card. Tap a card behind to deal it to the front (it lifts, swings to straight and settles on a spring while the
// others re-fan, selection tick); tap the front card to fly it into its pocket page (ui/cardFlight.ts, a measured overlay:
// Expo Go has no shared-element transitions). Swipe the deck sideways to cycle it. Reduce Motion: cards jump.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming, type SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { router, useIsFocused } from "expo-router";
import { c, motion } from "../tokens";
import { haptic } from "../haptics";
import { Press } from "../ui/kit";
import { Reveal } from "../ui/Reveal";
import { Icon } from "../ui/Icon";
import { T } from "../ui/Text";
import { useReduceMotion } from "../ui/motion";
import { startFlight, useFlight } from "../ui/cardFlight";
import { useApp } from "../store";
import { usd } from "../lib/util";
import { cleanText } from "../lib/sanitize";
import type { Pocket } from "../store";
import { PocketFace, cardHeight, toneFor } from "./PocketFace";

const MAX = 4;
// the fan, by depth (0 = front): rotation, x shift, y offset from the deck's top, scale
const ROT = [-2, 3, -4, 5];
const TX = [0, 6, -6, 10];
const TY = [96, 62, 30, 0];
const SC = [1, 0.97, 0.94, 0.91];
const TIP = [0, 7, 13, 18];
const DEPTHS = [0, 1, 2, 3];
const TOP = 6; // headroom above the furthest card

export function PocketStack({ pockets, play }: { pockets: Pocket[]; play: boolean }) {
  const { active } = useApp();
  const [w, setW] = useState(0);
  const flight = useFlight();
  const focused = useIsFocused();
  const reduce = useReduceMotion();
  // deck order: the active pocket in front, then the rest in list order (newest first)
  const [order, setOrder] = useState<string[]>(() => frontFirst(pockets.map((p) => p.address.toLowerCase()), active?.address));
  useEffect(() => {
    const ids = pockets.map((p) => p.address.toLowerCase());
    setOrder((o) => { const kept = o.filter((a) => ids.includes(a)); const added = ids.filter((a) => !kept.includes(a)); return [...added, ...kept]; });
  }, [pockets]);
  const cw = Math.max(Math.min(w, 448) - 48, 0);
  const h = cardHeight(cw);
  const dragX = useSharedValue(0);

  const bring = (addr: string) => {
    setOrder((o) => [addr, ...o.filter((a) => a !== addr)]);
    haptic.select();
  };
  const cycle = (dir: 1 | -1) => {
    setOrder((o) => (o.length < 2 ? o : dir === 1 ? [...o.slice(1), o[0]] : [o[o.length - 1], ...o.slice(0, -1)]));
    haptic.select();
  };
  const pan = useMemo(() => Gesture.Pan()
    .activeOffsetX([-12, 12]).failOffsetY([-10, 10])
    .onUpdate((e) => { dragX.value = e.translationX; })
    .onEnd((e) => {
      const go = Math.abs(e.translationX) > 56 || Math.abs(e.velocityX) > 700;
      if (go) scheduleOnRN(cycle, e.translationX < 0 ? 1 : -1);
      dragX.value = withSpring(0, { ...motion.spring.release, velocity: e.velocityX / 4 });
    }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const byAddr = new Map(pockets.map((p) => [p.address.toLowerCase(), p]));
  return (
    <View>
      <GestureDetector gesture={pan}>
        <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: cw ? h + TY[0] + TOP + 10 : 0, alignItems: "center" }}>
          {cw ? order.map((addr, depth) => {
            const p = byAddr.get(addr);
            if (!p) return null;
            return (
              <DeckCard key={addr} pocket={p} depth={depth} count={order.length} cw={cw} play={play} focused={focused} reduce={reduce} dragX={dragX}
                tone={toneFor(pockets, p.address)} hidden={flight?.pocket === addr} onBring={() => bring(addr)} />
            );
          }) : null}
        </View>
      </GestureDetector>
      {pockets.length > 1 ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 6 }}>
          <Icon name="layers" size={14} color={c.mutedOnCanvas} />
          <T v="cap" color="mutedOnCanvas">Tap a card to bring it to the front</T>
        </View>
      ) : null}
    </View>
  );
}

function frontFirst(ids: string[], front?: string) {
  const f = front?.toLowerCase();
  return f && ids.includes(f) ? [f, ...ids.filter((a) => a !== f)] : ids;
}

function DeckCard({ pocket, depth, count, cw, play, focused, reduce, dragX, tone, hidden, onBring }: {
  pocket: Pocket; depth: number; count: number; cw: number; play: boolean; focused: boolean; reduce: boolean; dragX: SharedValue<number>; tone: number; hidden: boolean; onBring: () => void;
}) {
  const ref = useRef<View>(null);
  const { findPocket } = useApp();
  const pos = useSharedValue(depth);
  const lift = useSharedValue(0);
  const prev = useRef(depth);
  useEffect(() => {
    if (prev.current === depth) return;
    const dealt = depth === 0 && prev.current > 0;
    prev.current = depth;
    if (reduce) { pos.value = depth; return; }
    pos.value = withSpring(depth, motion.spring.deck);
    if (dealt) lift.value = withSequence(withTiming(1, { duration: 170 }), withSpring(0, motion.spring.deck)); // up out of the deck, then down in front
  }, [depth, reduce, pos, lift]);
  const style = useAnimatedStyle(() => {
    const d = Math.min(pos.value, 3.6);
    const front = Math.max(0, 1 - pos.value); // only the front card follows a sideways drag
    return {
      opacity: interpolate(pos.value, [3, 3.6], [1, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: interpolate(d, DEPTHS, TX, Extrapolation.CLAMP) + dragX.value * front },
        { translateY: interpolate(d, DEPTHS, TY, Extrapolation.CLAMP) - lift.value * 26 },
        { rotate: `${interpolate(d, DEPTHS, ROT, Extrapolation.CLAMP) + (dragX.value / 24) * front}deg` },
        { scale: interpolate(d, DEPTHS, SC, Extrapolation.CLAMP) + lift.value * 0.03 },
      ],
    };
  });
  // 2.5D, on an inner view: iOS turns zIndex into a layer depth, so sibling cards tipped in 3D would cut through each other;
  // a child's 3D transform is flattened into its card's plane instead. Cards further back tip away from you; a swipe turns
  // the front card on its vertical axis.
  const tip = useAnimatedStyle(() => {
    const d = Math.min(pos.value, 3.6);
    const front = Math.max(0, 1 - pos.value);
    return { transform: [{ perspective: 900 }, { rotateX: `${interpolate(d, DEPTHS, TIP, Extrapolation.CLAMP)}deg` }, { rotateY: `${(dragX.value / 9) * front}deg` }] };
  });
  const open = () => {
    const id = pocket.address;
    const push = () => router.push({ pathname: "/pocket/[id]", params: { id } });
    if (!ref.current || !findPocket(id)) return push();
    ref.current.measureInWindow((x, y, w, h) => { startFlight(id, { x, y, w, h }, tone, ROT[0]); push(); });
  };
  const name = cleanText(pocket.name, 30);
  return (
    <Animated.View pointerEvents={depth >= MAX ? "none" : "auto"} style={[{ position: "absolute", top: TOP, zIndex: count - depth }, style]}>
      <Animated.View style={tip}>
      <Reveal play={play} index={depth} step={80} dy={26} hidden={hidden}>
        <View ref={ref} collapsable={false}>
          <Press kind="row" haptics={depth === 0 ? "light" : "none"} onPress={depth === 0 ? open : onBring}
            accessibilityRole="button" accessibilityLabel={`${name} pocket, ${usd(pocket.balance)} USDC${pocket.revoked ? ", revoked" : ""}`}
            accessibilityHint={depth === 0 ? "Opens the pocket" : "Brings this card to the front"}>
            <PocketFace pocket={pocket} width={cw} tone={tone} shadow focused={focused} tilt={depth === 0} />
          </Press>
        </View>
      </Reveal>
      </Animated.View>
    </Animated.View>
  );
}
