// 45° hatch (DESIGN.md "Hatch Infill"): diagonal stripes that stand in for fills on charts, empty tracks, frozen cards and
// the hero pocket card. Drawn as an SVG pattern (react-native-svg), so it costs one view and works on iOS, Android and web.
import React, { useId } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import Svg, { Defs, Path, Pattern, Rect } from "react-native-svg";
import { c, hatch as H, motion, radius } from "../tokens";
import { EASE_OUT, useReduceMotion } from "./motion";

/** One tile of 45° stripes (bottom-left to top-right), seamless when repeated. */
export const hatchTile = (p: number) => `M0,${p} L${p},0 M${-p / 4},${p / 4} L${p / 4},${-p / 4} M${p - p / 4},${p + p / 4} L${p + p / 4},${p - p / 4}`;

/** Fills its parent with stripes. `color` the stroke, `pitch` the gap, `stroke` the width. Put it absolutely inside a clipped box. */
export function Hatch({ color = c.ink, pitch = H.pitch, stroke = H.stroke, opacity = 1, style }: {
  color?: string; pitch?: number; stroke?: number; opacity?: number; style?: StyleProp<ViewStyle>;
}) {
  const id = `h${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          {/* the classic 45° hatch tile (no patternTransform: iOS clips a rotated edge line into dots); the two corner
              stubs join the stripes across tiles */}
          <Pattern id={id} patternUnits="userSpaceOnUse" width={pitch} height={pitch}>
            <Path d={hatchTile(pitch)} stroke={color} strokeWidth={stroke} strokeLinecap="square" />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/** A hatch progress bar (Worst case, Spent today, agent cap): the used share is a solid bar (`tone`), the rest is hatch on a soft
 *  track. Grows from 0 on mount (EASE_OUT, 700 ms) unless Reduce Motion. `value` is 0..1. */
export function HatchBar({ value, tone = c.vermillion, height = 14, label, track = c.fill, hatchColor = c.line, style }: {
  value: number; tone?: string; height?: number; label?: string; track?: string; hatchColor?: string; style?: StyleProp<ViewStyle>;
}) {
  const reduce = useReduceMotion();
  const v = Math.max(0, Math.min(1, value));
  const w = useSharedValue(reduce ? v : 0);
  React.useEffect(() => { w.value = reduce ? v : withTiming(v, { duration: motion.draw, easing: EASE_OUT }); }, [v, reduce, w]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}
      style={[{ height, borderRadius: height / 2, backgroundColor: track, overflow: "hidden" }, style]}>
      <Hatch color={hatchColor} pitch={6} stroke={1.5} />
      <Animated.View style={[{ height: "100%", borderRadius: height / 2, backgroundColor: tone }, fill]} />
    </View>
  );
}

/** A box that clips its children to a radius and lays hatch underneath (cards, chart panels). */
export function HatchPanel({ children, color = c.line, style, radius: r = radius.tile }: { children?: React.ReactNode; color?: string; style?: StyleProp<ViewStyle>; radius?: number }) {
  return (
    <View style={[{ borderRadius: r, overflow: "hidden" }, style]}>
      <Hatch color={color} />
      {children}
    </View>
  );
}

/** Draw-in progress (0..1) for charts and trails: one shared value that runs once when `play` turns true. */
export function useDrawIn(play = true, duration: number = motion.draw): SharedValue<number> {
  const reduce = useReduceMotion();
  const p = useSharedValue(reduce ? 1 : 0);
  React.useEffect(() => { if (play) p.value = reduce ? 1 : withTiming(1, { duration, easing: EASE_OUT }); }, [play, reduce, duration, p]);
  return p;
}
