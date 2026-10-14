import React from "react";
import Svg, { Circle, Defs, G, LinearGradient, Rect, Stop } from "react-native-svg";

/** "Linked Neuron" mark from design-brief §2: two linked pills and one white node on a dark tile. */
export function Logo({ size = 32, tile = true }: { size?: number; tile?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#6E56FF" /><Stop offset="1" stopColor="#38E1FF" />
        </LinearGradient>
      </Defs>
      {tile && <Rect width="64" height="64" rx="18" fill="#0E1012" />}
      <G fill="none" stroke="url(#lg)" strokeWidth={5} strokeLinecap="round">
        <Rect x="12" y="24" width="26" height="16" rx="8" transform="rotate(-35 25 32)" />
        <Rect x="26" y="24" width="26" height="16" rx="8" transform="rotate(-35 39 32)" />
      </G>
      <Circle cx="32" cy="32" r="3.5" fill="#fff" />
    </Svg>
  );
}
