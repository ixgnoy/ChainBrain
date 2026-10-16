// A seller's official mark (shared/brand/marks.ts: CoinGecko, Exa, Nansen), drawn unaltered at avatar size next to its name.
// CoinGecko's round gecko and Nansen's icon sit on a white square; Exa's square icon is the square. Sellers without a mark
// (the demo's fictional TradeWire, Harbour Wines, ShadyFeed) return null, and the caller falls back to initials.
import React from "react";
import { View, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import { SELLER_MARKS, isLayered } from "../../../shared/brand/marks";
import { c, hairline } from "../tokens";

/** Whether this seller has an official mark to show. */
export const hasSellerMark = (id?: string) => !!id && !!SELLER_MARKS[id];

export function SellerMark({ id, size = 44, radius }: { id: string; size?: number; radius?: number }) {
  const mark = SELLER_MARKS[id];
  if (!mark) return null;
  const r = radius ?? Math.round(size * 0.27);
  const box: ViewStyle = { width: size, height: size, borderRadius: r, borderCurve: "continuous", overflow: "hidden", alignItems: "center", justifyContent: "center" } as ViewStyle;
  // Exa's icon is already a square tile: it fills the box; the others sit on white at about 70 %
  const bleed = id === "exa";
  const inner = bleed ? size : Math.round(size * (id === "nansen" ? 0.78 : 0.7));
  const svg = (
    <Svg width={inner} height={inner} viewBox={mark.viewBox}>
      {isLayered(mark)
        ? mark.layers.map((l, i) => <Path key={i} d={l.d} fill={l.fill} />)
        : mark.paths.map((d, i) => <Path key={i} d={d} fill={mark.fill} fillRule={mark.fillRule} />)}
    </Svg>
  );
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={[box, bleed ? null : { backgroundColor: c.white, borderWidth: 1, borderColor: hairline }]}>
      {svg}
    </View>
  );
}
