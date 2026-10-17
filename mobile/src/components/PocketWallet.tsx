// Home's pockets as a wallet (Apple Wallet's stack, the one layout that shows every pocket at once): each card shows its top
// strip, the pocket's name and its live sign (glyphOf: the latest price, the next run, a run going on, paused, saved), and
// the front card shows whole at the bottom. Neighbours never share a face when the pockets allow it, so the stack reads as
// separate cards. On launch the cards drop into the stack one after another, tipping flat as they land; pulling Home down
// fans the strips apart (a tick as they open). Tap any card to fly it into its pocket page (ui/cardFlight.ts, a measured
// overlay: Expo Go has no shared-element transitions). Reduce Motion: no drop, no fan.
// Positions are transforms only, from the scroll offset on the UI thread; rotations sit on an inner view (iOS turns zIndex
// into a layer depth, so siblings tipped in 3D would cut through each other).
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, View, useWindowDimensions } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedReaction, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming, type SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { router, useIsFocused } from "expo-router";
import { motion } from "../tokens";
import { haptic } from "../haptics";
import { Press } from "../ui/kit";
import { useReduceMotion } from "../ui/motion";
import { startFlight, useFlight } from "../ui/cardFlight";
import { useAppSelect } from "../store";
import { usd } from "../lib/util";
import { cleanText } from "../lib/sanitize";
import type { Pocket } from "../store";
import type { Glyph } from "../../../shared/sim/pocketAppData";
import { PocketFace, cardHeight, toneFor, type Tone } from "./PocketFace";
import { PAGE_MARGIN, pageCardWidth } from "./CardFlight";
import { tokenSymbol } from "../lib/runtime";

/** How much of each card shows above the next: its name row and a sliver of its stripe. */
export const stripFor = (cw: number) => { const k = Math.min(1, cw / 340); return Math.round(16 * k + 4 + 26 * k + 8 * k + 3); }; // 3 pt of stripe: a dark rule between cards, above the agent's pill
/** Pull distance at which the strips are fully fanned (and the tick plays). */
const FAN = 90;
/** Room under the front card for its shadow. */
const FOOT = 16;

/** Top to bottom: revoked pockets first (quiet, at the back), then the live ones with the front card last; walking up from
 *  the front, each next card is the first in list order whose face differs from the one below it. */
export function stackOrder(pockets: Pocket[], front?: string): string[] {
  const tone = (a: string) => toneFor(pockets, a);
  const ids = (ps: Pocket[]) => ps.map((p) => p.address.toLowerCase());
  const dead = ids(pockets.filter((p) => p.revoked));
  const rest = ids(pockets.filter((p) => !p.revoked));
  const f = front?.toLowerCase();
  const up: string[] = [];
  if (f && rest.includes(f)) { up.push(f); rest.splice(rest.indexOf(f), 1); }
  while (rest.length) {
    const below = up.at(-1);
    const i = below == null ? 0 : Math.max(0, rest.findIndex((a) => tone(a) !== tone(below)));
    up.push(rest[i]); rest.splice(i, 1);
  }
  return [...dead, ...up.reverse()];
}

export const PocketWallet = React.memo(function PocketWallet({ pockets, play, scrollY, glyphs }: {
  pockets: Pocket[]; play: boolean; /** Home's raw scroll offset (negative while pulled down) */ scrollY: SharedValue<number>;
  /** each pocket's live sign, by lower-case address */ glyphs: Record<string, Glyph | null>;
}) {
  const activeAddress = useAppSelect((s) => s.active?.address);
  // full width on a phone: size the stack in the first frame, or Home draws without it and jumps when it measures (web
  // shows the app as a narrow column, so it still measures there)
  const { width: winW } = useWindowDimensions();
  const [w, setW] = useState(Platform.OS === "web" ? 0 : winW - PAGE_MARGIN * 2);
  const flight = useFlight();
  const focused = useIsFocused();
  const reduce = useReduceMotion();
  // the order is set once per set of pockets: a balance change must not reshuffle the stack under the owner's thumb
  const ids = pockets.map((p) => p.address.toLowerCase()).join();
  const order = useMemo(() => stackOrder(pockets, activeAddress), [ids]); // eslint-disable-line react-hooks/exhaustive-deps
  const cw = w ? pageCardWidth(w + PAGE_MARGIN * 2) : 0; // the pocket page's card width: the flight only moves it
  const h = cardHeight(cw);
  const strip = stripFor(cw);
  const n = order.length;

  // one tick as the strips open fully on a pull
  const fanned = useSharedValue(0);
  useAnimatedReaction(() => (scrollY.value < -FAN * 0.8 ? 1 : 0), (now, was) => {
    if (now !== was && now === 1 && fanned.value === 0) { fanned.value = 1; scheduleOnRN(haptic.select); }
    if (now === 0) fanned.value = 0;
  });

  const byAddr = new Map(pockets.map((p) => [p.address.toLowerCase(), p]));
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width - PAGE_MARGIN * 2)} style={{ height: cw ? (n - 1) * strip + h + FOOT : 0, marginHorizontal: 0 }}>
      {cw ? order.map((addr, i) => {
        const p = byAddr.get(addr);
        if (!p) return null;
        return (
          <WalletCard key={addr} pocket={p} pockets={pockets} index={i} count={n} cw={cw} strip={strip} play={play && !reduce} reduce={reduce}
            scrollY={scrollY} focused={focused} tone={toneFor(pockets, p.address)} glyph={glyphs[addr] ?? null} hidden={flight?.pocket === addr} />
        );
      }) : null}
    </View>
  );
});

function WalletCard({ pocket, pockets, index, count, cw, strip, play, reduce, scrollY, focused, tone, glyph, hidden }: {
  pocket: Pocket; pockets: Pocket[]; index: number; count: number; cw: number; strip: number; play: boolean; reduce: boolean;
  scrollY: SharedValue<number>; focused: boolean; tone: Tone; glyph: Glyph | null; hidden: boolean;
}) {
  const ref = useRef<View>(null);
  const front = index === count - 1;
  // the drop-in: from the back card to the front, 70 ms apart, each landing on a spring
  const land = useSharedValue(play ? 0 : 1);
  useEffect(() => { if (play) land.value = withDelay(120 + index * 70, withSpring(1, motion.spring.deck)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // the index moves when a pocket is added or revoked: glide to the new place
  const at = useSharedValue(index);
  // under the thumb, the card rises out of the stack a little (Wallet's peek) before it flies; back on release
  const lift = useSharedValue(0);
  useEffect(() => { at.value = reduce ? index : withSpring(index, motion.spring.deck); }, [index, reduce, at]);
  const pos = useAnimatedStyle(() => {
    const pull = reduce ? 0 : interpolate(-scrollY.value, [0, FAN, FAN * 3], [0, 1, 1.4], Extrapolation.CLAMP);
    const drop = (1 - land.value) * (140 + index * 18);
    return {
      opacity: interpolate(land.value, [0, 0.25], [0, 1], Extrapolation.CLAMP),
      transform: [{ translateY: at.value * strip + at.value * pull * 26 + drop - lift.value * 10 }],
    };
  });
  // landing tips the card flat: it arrives leaning back, like a card dropped onto a pile
  const tip = useAnimatedStyle(() => ({ transform: [{ perspective: 900 }, { rotateX: `${(1 - land.value) * 28}deg` }, { scale: 0.96 + 0.04 * land.value }] }));
  const open = () => {
    const id = pocket.address;
    const push = () => router.push({ pathname: "/pocket/[id]", params: { id } });
    if (!ref.current) return push();
    ref.current.measureInWindow((x, y, w, h) => { startFlight(id, { x, y, w, h }, tone, 0); push(); });
  };
  const name = cleanText(pocket.name, 30);
  return (
    <Animated.View style={[{ position: "absolute", top: 0, left: PAGE_MARGIN, zIndex: index + 1 }, pos]}>
      <Animated.View style={tip}>
        <View ref={ref} collapsable={false} style={{ opacity: hidden ? 0 : 1 }}>
          <Press kind="row" haptics="light" onPress={open}
            onPressIn={() => { if (!reduce) lift.value = withTiming(1, { duration: 120 }); }}
            onPressOut={() => { lift.value = reduce ? 0 : withSpring(0, motion.spring.deck); }}
            accessibilityRole="button" accessibilityLabel={`${name} pocket, ${usd(pocket.balance)} ${tokenSymbol()}${pocket.revoked ? ", revoked" : ""}`} accessibilityHint="Opens the pocket">
            <PocketFace pocket={pocket} width={cw} tone={tone} shadow focused={focused} tilt={front} glyph={glyph} peek={!front} />
          </Press>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
