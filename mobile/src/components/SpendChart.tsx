// Agent spending on Home (vaultbank "Weekly Spending", made true): settled payments per day from the ledger, as a smooth 2 px ink
// curve over a 45° hatch underfill that draws in from the left, a black value tag on the biggest day, and "vs last week" only
// when the history really covers last week (lib/agents weekOverWeek). Nothing here is typed in.
import React, { useMemo, useState } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import Svg, { Circle, Defs, Line, Path, Pattern } from "react-native-svg";
import { c, motion } from "../tokens";
import { Card } from "../ui/kit";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { Money } from "../ui/Money";
import { SlidingPills } from "../ui/SlidingPills";
import { useDrawIn } from "../ui/Hatch";
import { dailySpend, weekOverWeek, type AgentId } from "../lib/agents";
import type { LedgerRow } from "../lib/events";
import { usd } from "../lib/util";

const H = 132, TOP = 26, BOTTOM = 6;
const DAY = ["S", "M", "T", "W", "T", "F", "S"];

/** Monotone-ish smoothing: Catmull-Rom through the points, as cubic Béziers (y clamped to the plot so it never dips below 0). */
function smooth(pts: [number, number][], floor: number) {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[Math.max(i - 1, 0)], [x1, y1] = pts[i], [x2, y2] = pts[i + 1], [x3, y3] = pts[Math.min(i + 2, pts.length - 1)];
    const t = 0.18;
    const c1 = [x1 + (x2 - x0) * t, Math.min(floor, y1 + (y2 - y0) * t)], c2 = [x2 - (x3 - x1) * t, Math.min(floor, y2 - (y3 - y1) * t)];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${x2},${y2}`;
  }
  return d;
}

export function SpendChart({ ledger, agentOf, play = true }: { ledger: LedgerRow[]; agentOf: (pocket: string) => AgentId | undefined; play?: boolean }) {
  const [range, setRange] = useState<"7" | "14">("7");
  const days = Number(range);
  const [w, setW] = useState(0);
  const now = Date.now();
  const series = useMemo(() => dailySpend(ledger, agentOf, days, now), [ledger, agentOf, days]); // eslint-disable-line react-hooks/exhaustive-deps
  const wow = useMemo(() => weekOverWeek(ledger, now), [ledger]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = series.reduce((n, d) => n + d.total, 0n);
  const max = series.reduce((m, d) => (d.total > m ? d.total : m), 0n);
  const draw = useDrawIn(play && w > 0, motion.draw + 300);
  // draw-in: a white cover slides off to the right (a plain view: animating an SVG clip path is unreliable on iOS)
  const cover = useAnimatedStyle(() => ({ left: draw.value * w }));

  const plot = useMemo(() => {
    if (!w) return null;
    const step = (w - 16) / Math.max(series.length - 1, 1);
    const floor = H - BOTTOM;
    const pts: [number, number][] = series.map((d, i) => [8 + i * step, max > 0n ? floor - (Number(d.total) / Number(max)) * (floor - TOP) : floor]);
    const line = smooth(pts, floor);
    const area = `${line} L${pts[pts.length - 1][0]},${H} L${pts[0][0]},${H} Z`;
    const peak = series.findIndex((d) => d.total === max && max > 0n);
    return { pts, line, area, peak, step };
  }, [w, series, max]);

  const up = wow.delta != null && wow.delta > 0;
  const pct = wow.delta != null ? `${up ? "+" : wow.delta < 0 ? "−" : ""}${Math.abs(Math.round(wow.delta * 100))}% vs last week` : null;
  const label = range === "7" ? "Spent by your agents this week" : "Spent by your agents, 14 days";
  return (
    <Card pad={20} style={{ marginHorizontal: 16, gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <View style={{ gap: 2, flexShrink: 1 }}>
          <T v="sub" color="muted">{label}</T>
          <Money v="section" value={usd(total)} label={`${label} ${usd(total)} US dollars`} />
        </View>
        {pct && range === "7" ? (
          <View accessibilityLabel={pct} style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: up ? c.vermillion : c.fill }}>
            <Icon name={up ? "arrowUpRight" : "arrowDown"} size={14} color={up ? c.white : c.ink} stroke={2.4} />
            <T v="cap" w="bold" style={{ color: up ? c.white : c.ink }}>{pct}</T>
          </View>
        ) : null}
      </View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: H + 28, marginTop: 8 }} accessible accessibilityLabel={series.map((d) => `${new Date(d.day).toLocaleDateString("en-GB", { weekday: "short" })} US$${usd(d.total)}`).join(", ")}>
        {plot ? (
          <>
            <Svg width={w} height={H}>
              <Defs>
                <Pattern id="spend-hatch" patternUnits="userSpaceOnUse" width={5} height={5} patternTransform="rotate(45)">
                  <Line x1={0} y1={0} x2={0} y2={5} stroke={c.ink} strokeWidth={1.6} />
                </Pattern>
              </Defs>
              <Line x1={0} x2={w} y1={H - BOTTOM} y2={H - BOTTOM} stroke={c.line} strokeWidth={1} />
              <Path d={plot.area} fill="url(#spend-hatch)" opacity={0.85} />
              <Path d={plot.line} stroke={c.ink} strokeWidth={2.2} fill="none" strokeLinecap="round" />
              {plot.peak >= 0 ? <Circle cx={plot.pts[plot.peak][0]} cy={plot.pts[plot.peak][1]} r={5.5} fill={c.vermillion} stroke={c.white} strokeWidth={2.5} /> : null}
            </Svg>
            <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, right: 0, height: H, backgroundColor: c.card }, cover]} />
            {plot.peak >= 0 ? (
              <View pointerEvents="none" style={{ position: "absolute", top: Math.max(plot.pts[plot.peak][1] - 34, -6), left: Math.min(Math.max(plot.pts[plot.peak][0] - 34, 0), w - 68), width: 68, alignItems: "center" }}>
                <View style={{ backgroundColor: c.ink, borderRadius: 8, paddingHorizontal: 8, height: 24, justifyContent: "center", borderWidth: 1, borderColor: c.white }}>
                  <T v="cap" w="bold" style={{ color: c.white }}>{`US$${usd(series[plot.peak].total)}`}</T>
                </View>
              </View>
            ) : null}
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingHorizontal: 2 }}>
              {series.map((d, i) => {
                const today = i === series.length - 1;
                const show = days === 7 || i % 2 === 1 || today;
                return <T key={d.day} v="cap" w={today ? "bold" : "medium"} color={today ? "ink" : "muted"} style={{ width: 16, textAlign: "center", opacity: show ? 1 : 0 }}>{DAY[new Date(d.day).getDay()]}</T>;
              })}
            </View>
          </>
        ) : null}
      </View>
      <View style={{ marginHorizontal: -16, marginTop: 2 }}>
        <SlidingPills items={[{ key: "7", label: "7 days" }, { key: "14", label: "14 days" }]} value={range} onChange={setRange} />
      </View>
    </Card>
  );
}
