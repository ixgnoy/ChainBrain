// Root host of the card hand-off (ui/cardFlight.ts): draws the card at the Home card's measured place and carries it to the
// pocket page's header card (`sheet` spring, critically damped) with the one sheet-level shadow while it is lifted, then lets go.
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { level3, motion } from "../tokens";
import { BACK_HEADER_H } from "../ui/BackHeader";
import { endFlight, useFlight } from "../ui/cardFlight";
import { EASE_OUT, useReduceMotion } from "../ui/motion";
import { useApp } from "../store";
import { PocketFace, cardHeight } from "./PocketFace";

/** Where the pocket page puts its header card, relative to the root view, and how wide it is (16 px margins). */
export const pageCardTop = (top: number) => top + BACK_HEADER_H + 4;
export const PAGE_MARGIN = 16;
export const pageCardWidth = (screenW: number) => Math.min(screenW, 480) - PAGE_MARGIN * 2;

export function CardFlightHost() {
  const flight = useFlight();
  const { findPocket } = useApp();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const reduce = useReduceMotion();
  const host = useRef<View>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const p = useSharedValue(0);
  const id = flight?.id;
  useEffect(() => {
    setOrigin(null);
    if (!id) return;
    p.value = 0;
    host.current?.measureInWindow((x, y) => setOrigin({ x, y }));
    const bail = setTimeout(() => endFlight(id), 2500); // never leave the overlay up
    return () => clearTimeout(bail);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!id || !origin) return;
    if (reduce) { p.value = withTiming(1, { duration: 160 }, (ok) => { if (ok) scheduleOnRN(endFlight, id); }); return; }
    p.value = withSpring(1, motion.spring.sheet, (ok) => { if (ok) scheduleOnRN(endFlight, id); });
  }, [origin]); // eslint-disable-line react-hooks/exhaustive-deps
  const pocket = flight ? findPocket(flight.pocket) : undefined;
  // drawn at the page card's size; starts scaled and rotated onto the deck card, ends straight at the page card (scale is about the centre)
  const W = pageCardWidth(screenW), H = cardHeight(W);
  const s0 = flight ? flight.from.w / W : 1;
  const x0 = flight && origin ? flight.from.x - origin.x - (W * (1 - s0)) / 2 : 0, y0 = flight && origin ? flight.from.y - origin.y - (H * (1 - s0)) / 2 : 0;
  const x1 = PAGE_MARGIN, y1 = pageCardTop(insets.top);
  const r0 = flight?.rot ?? 0;
  const style = useAnimatedStyle(() => ({
    position: "absolute", left: 0, top: 0,
    transform: [{ translateX: x0 + (x1 - x0) * p.value }, { translateY: y0 + (y1 - y0) * p.value }, { rotate: `${r0 * (1 - p.value)}deg` }, { scale: s0 + (1 - s0) * p.value }],
    opacity: reduce ? Math.min(1, 1.4 - p.value * 0.4) : 1,
  }));
  const lifted = useAnimatedStyle(() => ({ shadowOpacity: 0.16 + 0.1 * Math.sin(Math.min(1, p.value) * Math.PI) }));
  return (
    <View ref={host} collapsable={false} pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 40 }]}>
      {flight && origin && pocket ? (
        <Animated.View style={style}>
          <Animated.View style={[{ borderRadius: 20, ...level3 }, lifted]}>
            <PocketFace pocket={pocket} width={W} tone={flight.tone} still />
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}
