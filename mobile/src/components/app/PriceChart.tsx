// The deal watcher's hero: every price the seller quoted to this pocket, as a 2 px ink line over VaultBank's vertical-line
// underfill; the owner's limit as a dashed line with its price pill at the right edge (Robinhood's limit-order line); the band
// under the limit is the buy zone (powder blue), each buy is a filled dot on the line, and the latest quote is ringed in
// vermillion. Prices come only from `quote` events the seller really returned (shared/sim/pocketAppData.ts priceSeries).
// Draws in from the left behind a sliding cover (as SpendChart: animating an SVG clip is unreliable on iOS).
import React, { useMemo, useState } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import Svg, { Circle, Defs, Line, Path, Pattern, Rect } from "react-native-svg";
import { c, motion } from "../../tokens";
import { T } from "../../ui/Text";
import { useDrawIn } from "../../ui/Hatch";
import { usd } from "../../lib/util";

const H = 168, TOP = 18, BOTTOM = 14, RIGHT = 74;
type Pt = { at: number; price: bigint; below?: boolean };

export function PriceChart({ quotes, buys, limit, play = true }: { quotes: Pt[]; buys: { at: number; amount: bigint }[]; limit?: bigint; play?: boolean }) {
  const [w, setW] = useState(0);
  const draw = useDrawIn(play && w > 0, motion.draw + 500);
  const cover = useAnimatedStyle(() => ({ left: draw.value * w }));
  const plot = useMemo(() => {
    if (!w || quotes.length === 0) return null;
    const all = [...quotes.map((q) => Number(q.price)), ...(limit != null ? [Number(limit)] : [])];
    const lo0 = Math.min(...all), hi0 = Math.max(...all);
    const pad = Math.max((hi0 - lo0) * 0.18, 1500);
    const lo = lo0 - pad, hi = hi0 + pad;
    const t0 = quotes[0].at, t1 = Math.max(quotes.at(-1)!.at, t0 + 1);
    const plotW = w - RIGHT;
    const x = (t: number) => 6 + ((t - t0) / (t1 - t0)) * (plotW - 12);
    const y = (p: number) => TOP + (1 - (p - lo) / (hi - lo)) * (H - TOP - BOTTOM);
    const pts = quotes.map((q) => [x(q.at), y(Number(q.price))] as const);
    const line = pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
    const area = `${line} L${pts.at(-1)![0]},${H} L${pts[0][0]},${H} Z`;
    const ly = limit != null ? y(Number(limit)) : null;
    const dots = buys.map((b) => {
      const q = quotes.reduce((best, x2) => (Math.abs(x2.at - b.at) < Math.abs(best.at - b.at) ? x2 : best), quotes[0]);
      return [x(q.at), y(Number(b.amount))] as const;
    });
    return { pts, line, area, ly, dots, plotW };
  }, [w, quotes, buys, limit]);
  const last = quotes.at(-1);
  const a11y = quotes.length
    ? `Quoted prices: ${quotes.map((q) => `${new Date(q.at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric" })} US$${usd(q.price)}`).join(", ")}${limit != null ? `. Your limit US$${usd(limit)}` : ""}. ${buys.length} bought.`
    : "No quotes yet";
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: H + 22 }} accessible accessibilityLabel={a11y}>
      {plot ? (
        <>
          <Svg width={w} height={H}>
            <Defs>
              <Pattern id="deal-lines" patternUnits="userSpaceOnUse" width={5} height={8}>
                <Line x1={2.5} x2={2.5} y1={0} y2={8} stroke={c.ink} strokeWidth={1.2} />
              </Pattern>
            </Defs>
            {/* the buy zone: everything at or under the limit */}
            {plot.ly != null ? <Rect x={0} y={plot.ly} width={plot.plotW} height={H - BOTTOM - plot.ly} fill={c.blueSoft} opacity={0.75} /> : null}
            <Line x1={0} x2={plot.plotW} y1={H - BOTTOM} y2={H - BOTTOM} stroke={c.line} strokeWidth={1} />
            <Path d={plot.area} fill="url(#deal-lines)" opacity={0.22} />
            <Path d={plot.line} stroke={c.ink} strokeWidth={2.2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {plot.ly != null ? <Line x1={0} x2={plot.plotW + 4} y1={plot.ly} y2={plot.ly} stroke={c.blueInk} strokeWidth={1.6} strokeDasharray="5 4" /> : null}
            {plot.dots.map(([dx, dy], i) => <Circle key={i} cx={dx} cy={dy} r={5} fill={c.ink} stroke={c.white} strokeWidth={2} />)}
            <Circle cx={plot.pts.at(-1)![0]} cy={plot.pts.at(-1)![1]} r={6} fill={c.white} stroke={c.vermillion} strokeWidth={3} />
          </Svg>
          <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, right: RIGHT - 6, height: H, backgroundColor: c.card }, cover]} />
          {/* the limit's price pill at the right edge, and today's price pill */}
          {plot.ly != null && limit != null ? (
            <View pointerEvents="none" style={{ position: "absolute", left: plot.plotW + 6, top: plot.ly - 12, height: 24, borderRadius: 7, paddingHorizontal: 7, backgroundColor: c.blueInk, justifyContent: "center" }}>
              <T v="cap" w="bold" numberOfLines={1} style={{ color: c.white, fontSize: 11 }}>{`≤ ${usd(limit)}`}</T>
            </View>
          ) : null}
          {last ? (
            <View pointerEvents="none" style={{ position: "absolute", left: plot.plotW + 6, top: Math.min(Math.max(plot.pts.at(-1)![1] - 12, 0), H - 24), height: 24, borderRadius: 7, paddingHorizontal: 7, backgroundColor: c.vermillion, justifyContent: "center", opacity: plot.ly != null && Math.abs(plot.pts.at(-1)![1] - plot.ly) < 26 ? 0 : 1 }}>
              <T v="cap" w="bold" numberOfLines={1} style={{ color: c.white, fontSize: 11 }}>{usd(last.price)}</T>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", justifyContent: "space-between", width: plot.plotW, marginTop: 6 }}>
            <T v="cap" color="muted">{new Date(quotes[0].at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</T>
            <T v="cap" w="bold" color="ink">{new Date(last!.at).toDateString() === new Date().toDateString() ? "Today" : new Date(last!.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</T>
          </View>
        </>
      ) : null}
    </View>
  );
}
