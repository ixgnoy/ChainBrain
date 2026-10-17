// A white list card whose rows animate in (fade + 10 pt rise, `smooth` spring) when they are inserted, fade out faster when
// removed, and slide into place with LinearTransition. Rows present at first mount stay still unless `initial="stagger"`
// (50 ms apart, max 6). Children must be keyed; they get `last` like ListCard. Layout animations run in Expo Go.
import React, { useEffect, useRef } from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";
import { c, motion, radius } from "../tokens";
import { useReduceMotion } from "./motion";

export function AnimatedList({ children, initial = "none", style }: { children: React.ReactNode; initial?: "none" | "stagger"; style?: StyleProp<ViewStyle> }) {
  const reduce = useReduceMotion();
  const kids = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<{ last?: boolean }>[];
  const known = useRef<Set<string> | null>(null);
  const seen = known.current ?? new Set<string>();
  // the first render, or a bulk load (data arriving after mount): the whole list counts as "initial", never as many
  // simultaneous inserts with layout transitions (rows would overprint each other while they settle)
  const fresh = kids.filter((k) => !seen.has(String(k.key))).length;
  const first = known.current === null || fresh > 3;
  useEffect(() => { known.current = new Set(kids.map((k) => String(k.key))); });
  const rise = (delay: number) => (reduce ? FadeIn.duration(180) : FadeInDown.delay(delay).duration(motion.base));
  const layout = reduce ? undefined : LinearTransition.duration(motion.base);
  return (
    <Animated.View layout={layout} style={[{ marginHorizontal: 20, backgroundColor: c.card, borderRadius: radius.card, overflow: "hidden" }, style]}>
      {kids.map((k, i) => {
        const isNew = !seen.has(String(k.key));
        const entering = first ? (initial === "stagger" ? rise(Math.min(i, 6) * 50) : undefined) : isNew ? rise(0) : undefined;
        return (
          <Animated.View key={k.key} entering={entering} exiting={reduce ? undefined : FadeOut.duration(motion.exit)} layout={layout}>
            {React.cloneElement(k, { last: i === kids.length - 1 })}
          </Animated.View>
        );
      })}
    </Animated.View>
  );
}
