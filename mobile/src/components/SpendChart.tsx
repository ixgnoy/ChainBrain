// Agent spending on Home (VaultBank "Weekly Spending", made true): settled payments per day from the ledger, as a smooth 2 px ink
// curve over VaultBank's vertical-line underfill that draws in from the left. Today carries a vermillion stem tooltip ("+53%
// vs last week", only when the history really covers last week: lib/agents weekOverWeek) down to a ringed marker; the
// biggest day keeps a black value tag. Nothing here is typed in.
import React, { useMemo, useState } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import Svg, { Circle, Defs, Line, Path, Pattern } from "react-native-svg";
import { c, motion } from "../tokens";
import { Card } from "../ui/kit";
import { T } from "../ui/Text";
import { Money } from "../ui/Money";
import { SlidingPills } from "../ui/SlidingPills";
import { useDrawIn } from "../ui/Hatch";
import { dailySpend, weekOverWeek, type AgentId } from "../lib/agents";
import type { LedgerRow } from "../lib/events";
import { hkd } from "../lib/util";
import { curSign } from "../lib/runtime";

const H = 150, TOP = 46, BOTTOM = 6;
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

function SpendChartView({ ledger, agentOf, play = true, title, footer, fixed }: { ledger: LedgerRow[]; agentOf: (pocket: string) => AgentId | undefined; play?: boolean;
  /** Home's "This week": one title, and what the week bought under the curve; no 7 / 14 toggle */ title?: string; footer?: React.ReactNode; fixed?: boolean }) {
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
    const today = pts.length - 1;
    return { pts, line, area, peak, step, today };
  }, [w, series, max]);

  const up = wow.delta != null && wow.delta > 0;
  const pct = wow.delta != null && range === "7" ? `${up ? "+" : wow.delta < 0 ? "−" : ""}${Math.abs(Math.round(wow.delta * 100))}% vs last week` : null;
  const label = title ?? (range === "7" ? "Weekly spending by your agents" : "Spending by your agents, 14 days");
  // the stem tooltip on today: the week-over-week change, or today's own figure when there is no last week to compare
  const stem = plot ? (pct ?? `Today ${curSign()}${hkd(series[plot.today].total)}`) : null;
  const STEM_W = 168;
  // the peak's black tag only when it is not today and has room beside the stem
  const tag = plot && plot.peak >= 0 && plot.peak !== plot.today && Math.abs(plot.pts[plot.peak][0] - plot.pts[plot.today][0]) > STEM_W / 2 + 40;
  return (
    <Card pad={20} style={{ marginHorizontal: 16, gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <View style={{ gap: 2, flexShrink: 1 }}>
          {title ? <T v="head" accessibilityRole="header">{label}</T> : <T v="sub" color="ink2">{label}</T>}
          <Money v="section" value={hkd(total)} label={`${label} ${hkd(total)} Hong Kong dollars`} />
        </View>
      </View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: H + 28, marginTop: 8 }} accessible accessibilityLabel={series.map((d) => `${new Date(d.day).toLocaleDateString("en-GB", { weekday: "short" })} ${curSign()}${hkd(d.total)}`).join(", ")}>
        {plot ? (
          <>
            <Svg width={w} height={H}>
              <Defs>
                {/* VaultBank's underfill: fine vertical lines */}
                <Pattern id="spend-lines" patternUnits="userSpaceOnUse" width={5} height={8}>
                  <Line x1={2.5} x2={2.5} y1={0} y2={8} stroke={c.ink} strokeWidth={1.3} />
                </Pattern>
              </Defs>
              <Line x1={0} x2={w} y1={H - BOTTOM} y2={H - BOTTOM} stroke={c.line} strokeWidth={1} />
              <Path d={plot.area} fill="url(#spend-lines)" opacity={0.9} />
              <Path d={plot.line} stroke={c.ink} strokeWidth={2.2} fill="none" strokeLinecap="round" />
              {/* the stem from the tooltip down to today's point, and its ringed marker */}
              <Line x1={plot.pts[plot.today][0]} x2={plot.pts[plot.today][0]} y1={26} y2={plot.pts[plot.today][1] - 6} stroke={c.vermillion} strokeWidth={2} />
              <Circle cx={plot.pts[plot.today][0]} cy={plot.pts[plot.today][1]} r={6} fill={c.white} stroke={c.vermillion} strokeWidth={3} />
            </Svg>
            <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, right: 0, height: H, backgroundColor: c.card }, cover]} />
            {tag ? (
              <View pointerEvents="none" style={{ position: "absolute", top: Math.max(plot.pts[plot.peak][1] - 34, 0), left: Math.min(Math.max(plot.pts[plot.peak][0] - 34, 0), w - 68), width: 68, alignItems: "center" }}>
                <View style={{ backgroundColor: c.ink, borderRadius: 7, paddingHorizontal: 8, height: 24, justifyContent: "center", borderWidth: 1, borderColor: c.white }}>
                  <T v="cap" w="bold" style={{ color: c.white }}>{`${curSign()}${hkd(series[plot.peak].total)}`}</T>
                </View>
              </View>
            ) : null}
            {stem ? (
              <View pointerEvents="none" accessibilityLabel={stem} style={{ position: "absolute", top: 0, left: Math.min(Math.max(plot.pts[plot.today][0] - STEM_W / 2, 0), w - STEM_W), width: STEM_W, alignItems: plot.pts[plot.today][0] > w - STEM_W / 2 ? "flex-end" : "center" }}>
                <View style={{ backgroundColor: up || !pct ? c.vermillion : c.ink, borderRadius: 7, paddingHorizontal: 9, height: 26, justifyContent: "center" }}>
                  <T v="cap" w="bold" style={{ color: c.white }} numberOfLines={1}>{stem}</T>
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
      {fixed ? null : (
        <View style={{ marginHorizontal: -16, marginTop: 2 }}>
          <SlidingPills items={[{ key: "7", label: "7 days" }, { key: "14", label: "14 days" }]} value={range} onChange={setRange} />
        </View>
      )}
      {footer}
    </Card>
  );
}
/** Memoised: its props are stable store values, so a new event or ask elsewhere leaves it alone. */
export const SpendChart = React.memo(SpendChartView);
