import React from "react";
import Svg, { Circle, Rect } from "react-native-svg";
import { useTheme } from "../theme";

/** Brand mark: two linked rings, ink and jade, no gradient. On a paper (dark: ink) tile with a hairline when `tile`. */
export function Logo({ size = 32, tile = true }: { size?: number; tile?: boolean }) {
  const { c } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {tile && <Rect x="0.5" y="0.5" width="63" height="63" rx="14" fill={c.bgElev1} stroke={c.hairlineStrong} />}
      <Circle cx="25" cy="32" r="13" fill="none" stroke={c.text} strokeWidth={4.5} />
      <Circle cx="39" cy="32" r="13" fill="none" stroke={c.accent} strokeWidth={4.5} />
    </Svg>
  );
}
