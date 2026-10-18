// The deal watcher's hero: every price the seller quoted to this pocket, as a 2 px ink line over VaultBank's vertical-line
// underfill; the owner's limit as a dashed line with its price pill at the right edge (Robinhood's limit-order line); the band
// under the limit is the buy zone (powder blue), each buy is a filled dot on the line, and the latest quote is ringed in
// vermillion. Prices come only from `quote` events the seller really returned (shared/sim/pocketAppData.ts priceSeries).
// Draws in from the left behind a sliding cover (as SpendChart: animating an SVG clip is unreliable on iOS).
// Press and hold, then drag, to read any day (Robinhood's scrub): a cursor snaps to each quote with a selection tick, and a
// stronger tick when the price crosses the limit; the pill above says the day, the price and whether it was in the buy zone.
// VoiceOver: the chart is adjustable, one quote per swipe.
import React, { useMemo, useRef, useState } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import { haptic } from "../../haptics";
import Svg, { Circle, Defs, Line, Path, Pattern, Rect } from "react-native-svg";
import { c, motion } from "../../tokens";
import { T } from "../../ui/Text";
import { useDrawIn } from "../../ui/Hatch";
import { hkd } from "../../lib/util";
import { curSign } from "../../lib/runtime";

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
  // the scrub: which quote the finger is on (null when not touching)
  const [at, setAt] = useState<number | null>(null);
  const was = useRef<number | null>(null);
  const pick = (i: number | null) => {
    const prev = was.current;
    was.current = i;
    setAt(i);
    if (i == null || i === prev) return;
    const side = (k: number) => limit != null && quotes[k].price <= limit;
    if (prev != null && limit != null && side(prev) !== side(i)) haptic.medium(); else haptic.select();
  };
  const xs = plot ? plot.pts.map((q) => q[0]) : [];
  const cur = useSharedValue(-1);
  const scrub = useMemo(() => {
    const near = (x: number) => {
      "worklet";
      let best = 0;
      for (let k = 1; k < xs.length; k++) if (Math.abs(xs[k] - x) < Math.abs(xs[best] - x)) best = k;
      return best;
    };
    return Gesture.Pan().activateAfterLongPress(140).enabled(xs.length > 1)
      .onStart((e) => { cur.value = near(e.x); scheduleOnRN(pick, cur.value); })
      .onUpdate((e) => { const k = near(e.x); if (k !== cur.value) { cur.value = k; scheduleOnRN(pick, k); } })
      .onFinalize(() => { if (cur.value !== -1) { cur.value = -1; scheduleOnRN(pick, null); } });
  }, [xs.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const a11y = quotes.length
    ? `Quoted prices: ${quotes.map((q) => `${new Date(q.at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric" })} ${curSign()}${hkd(q.price)}`).join(", ")}${limit != null ? `. Your limit ${curSign()}${hkd(limit)}` : ""}. ${buys.length} bought.`
    : "No quotes yet";
  return (
    <GestureDetector gesture={scrub}>
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: H + 22 }} accessible accessibilityLabel={a11y}
      accessibilityRole="adjustable" accessibilityValue={at != null ? { text: scrubText(quotes[at], limit) } : undefined}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => { const i = at ?? quotes.length - 1; const n = e.nativeEvent.actionName === "increment" ? Math.min(quotes.length - 1, i + 1) : Math.max(0, i - 1); pick(n); }}>
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
            {at != null ? (
              <>
                <Line x1={plot.pts[at][0]} x2={plot.pts[at][0]} y1={0} y2={H - BOTTOM} stroke={c.ink} strokeWidth={1.4} />
                <Circle cx={plot.pts[at][0]} cy={plot.pts[at][1]} r={7} fill={limit != null && quotes[at].price <= limit ? c.blueInk : c.ink} stroke={c.white} strokeWidth={3} />
              </>
            ) : null}
          </Svg>
          <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, right: RIGHT - 6, height: H, backgroundColor: c.card }, cover]} />
          {/* the limit's price pill at the right edge, and today's price pill */}
          {plot.ly != null && limit != null ? (
            <View pointerEvents="none" style={{ position: "absolute", left: plot.plotW + 6, top: plot.ly - 12, height: 24, borderRadius: 7, paddingHorizontal: 7, backgroundColor: c.blueInk, justifyContent: "center" }}>
              <T v="cap" w="bold" numberOfLines={1} style={{ color: c.white, fontSize: 11 }}>{`≤ ${hkd(limit)}`}</T>
            </View>
          ) : null}
          {last ? (
            <View pointerEvents="none" style={{ position: "absolute", left: plot.plotW + 6, top: Math.min(Math.max(plot.pts.at(-1)![1] - 12, 0), H - 24), height: 24, borderRadius: 7, paddingHorizontal: 7, backgroundColor: c.vermillion, justifyContent: "center", opacity: plot.ly != null && Math.abs(plot.pts.at(-1)![1] - plot.ly) < 26 ? 0 : 1 }}>
              <T v="cap" w="bold" numberOfLines={1} style={{ color: c.white, fontSize: 11 }}>{hkd(last.price)}</T>
            </View>
          ) : null}
          {at != null ? (
            <View pointerEvents="none" style={{ position: "absolute", top: -6, left: Math.min(Math.max(plot.pts[at][0] - 78, 0), Math.max(plot.plotW - 156, 0)), width: 156, minHeight: 30, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: c.ink, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
              <T v="cap" style={{ color: "rgba(255,255,255,0.72)" }} numberOfLines={1}>{new Date(quotes[at].at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</T>
              <T v="cap" w="bold" style={{ color: limit != null && quotes[at].price <= limit ? c.blue : c.white, fontVariant: ["tabular-nums"] }}>{`${curSign()}${hkd(quotes[at].price)}`}</T>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", justifyContent: "space-between", width: plot.plotW, marginTop: 6 }}>
            <T v="cap" color="muted">{new Date(quotes[0].at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</T>
            <T v="cap" w="bold" color="ink">{new Date(last!.at).toDateString() === new Date().toDateString() ? "Today" : new Date(last!.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</T>
          </View>
        </>
      ) : null}
    </View>
    </GestureDetector>
  );
}

const scrubText = (q: Pt, limit?: bigint) =>
  `${new Date(q.at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}, ${curSign()}${hkd(q.price)}${limit != null ? (q.price <= limit ? ", in the buy zone" : ", above your limit") : ""}`;
