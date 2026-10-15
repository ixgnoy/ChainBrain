// Rolling digits for money (Robinhood / Revolut style): every digit is its own 0-9 reel that springs to its value, so
// only the digits that change move, right-to-left stagger of 20 ms, calm `smooth` spring (no bounce, no colour flash).
// Separators and the currency never move. Reduced motion: plain text. Idea from rit3zh/expo-morphing-text's digit reel
// and rn-number-flow (MIT); written fresh for this app.
import React, { memo, useEffect, useRef, useState } from "react";
import { Text, View, type StyleProp, type TextStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from "react-native-reanimated";
import { motion } from "../tokens";
import { useReduceMotion } from "./motion";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

// Display faces (Clash Display) have proportional figures, so a reel measures its ten digits once and springs its width to the
// digit it shows: "1" stays narrow, and the number never gets gaps.
const Reel = memo(function Reel({ digit, lineHeight, style, delay, reduce, animateIn }: { digit: number; lineHeight: number; style: StyleProp<TextStyle>; delay: number; reduce: boolean; animateIn: boolean }) {
  const y = useSharedValue(animateIn ? 0 : -digit * lineHeight);
  const width = useSharedValue(-1);
  const sizes = useRef<number[]>([]);
  const [widths, setWidths] = useState<number[] | null>(null);
  useEffect(() => {
    const to = -digit * lineHeight;
    y.value = reduce ? to : withDelay(delay, withSpring(to, motion.spring.smooth));
  }, [digit, lineHeight, delay, reduce, y]);
  useEffect(() => {
    if (!widths) return;
    const to = widths[digit];
    width.value = reduce || width.value < 0 ? to : withDelay(delay, withSpring(to, motion.spring.smooth));
  }, [digit, widths, delay, reduce, width]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const box = useAnimatedStyle(() => (width.value < 0 ? {} : { width: width.value }));
  const measure = (i: number, w: number) => {
    sizes.current[i] = w;
    if (sizes.current.filter((x) => x > 0).length === 10) setWidths(sizes.current.slice());
  };
  return (
    <Animated.View style={[{ height: lineHeight, overflow: "hidden" }, box]}>
      <Animated.View style={[{ alignItems: "flex-start" }, a]}>
        {DIGITS.map((d, i) => <Text key={d} onLayout={widths ? undefined : (e) => measure(i, e.nativeEvent.layout.width)} style={[style, { lineHeight, height: lineHeight }]}>{d}</Text>)}
      </Animated.View>
    </Animated.View>
  );
});

/**
 * @param value  the formatted amount, e.g. "3.40" or "1,234.50" (digits roll, everything else is static)
 * @param prefix  e.g. "US$" (static)
 * @param countIn  roll up from 0 on first mount (use once per screen, e.g. the Home balance)
 */
export function RollingNumber({ value, prefix = "", style, lineHeight, countIn = false, accessibilityLabel }: {
  value: string; prefix?: string; style?: StyleProp<TextStyle>; lineHeight: number; countIn?: boolean; accessibilityLabel?: string;
}) {
  const reduce = useReduceMotion();
  const chars = value.split("");
  // Key reels by position from the right so "9.99" -> "10.00" keeps the cents reels and only adds one on the left.
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={accessibilityLabel ?? `${prefix}${value}`} style={{ flexDirection: "row", alignItems: "flex-end" }}>
      {prefix ? <Text style={[style, { lineHeight }]}>{prefix}</Text> : null}
      {chars.map((ch, i) => {
        const fromRight = chars.length - 1 - i;
        const n = ch.charCodeAt(0) - 48;
        if (n >= 0 && n <= 9) return <Reel key={`d${fromRight}`} digit={n} lineHeight={lineHeight} style={style} delay={fromRight * 20} reduce={reduce} animateIn={countIn} />;
        return <Text key={`s${fromRight}`} style={[style, { lineHeight }]}>{ch}</Text>;
      })}
    </View>
  );
}
