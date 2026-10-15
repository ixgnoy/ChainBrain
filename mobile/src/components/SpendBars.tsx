// A pocket's spending by day (vaultbank "Bars"): seven hatch bars, the busiest day solid and split by seller (vermillion, green,
// blue) under a black value tag. Bars rise in a stagger. Settled payments only, from the ledger.
import React, { useMemo } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { c } from "../tokens";
import { T } from "../ui/Text";
import { Hatch } from "../ui/Hatch";
import { EASE_OUT, useReduceMotion } from "../ui/motion";
import { startOfDay, DAY } from "../lib/agents";
import type { LedgerRow } from "../lib/events";
import { usd } from "../lib/util";

const H = 120;
const SEG = [c.vermillion, c.green, c.blue, c.ink];
const LETTER = ["S", "M", "T", "W", "T", "F", "S"];

export function SpendBars({ rows, name }: { rows: LedgerRow[]; name: (sellerId?: string) => string }) {
  const days = useMemo(() => {
    const today = startOfDay(Date.now());
    const out = Array.from({ length: 7 }, (_, i) => ({ day: today - (6 - i) * DAY, total: 0n, by: new Map<string, bigint>() }));
    for (const r of rows) {
      if (r.kind !== "payment" || !r.amount) continue;
      const d = out.find((x) => r.at >= x.day && r.at < x.day + DAY);
      if (!d) continue;
      d.total += r.amount;
      const k = r.sellerId ?? "?";
      d.by.set(k, (d.by.get(k) ?? 0n) + r.amount);
    }
    return out;
  }, [rows]);
  const max = days.reduce((m, d) => (d.total > m ? d.total : m), 0n);
  const peak = max > 0n ? days.findIndex((d) => d.total === max) : -1;
  const sellers = peak >= 0 ? [...days[peak].by.entries()].sort((a, b) => (b[1] > a[1] ? 1 : -1)) : [];
  return (
    <View style={{ gap: 12 }}>
      <View style={{ height: H + 30, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}
        accessible accessibilityLabel={days.map((d) => `${new Date(d.day).toLocaleDateString("en-GB", { weekday: "short" })} US$${usd(d.total)}`).join(", ")}>
        {days.map((d, i) => <Bar key={d.day} i={i} h={max > 0n ? Math.max(6, (Number(d.total) / Number(max)) * H) : 6} peak={i === peak} parts={i === peak ? sellers.map(([, v]) => Number(v) / Number(d.total)) : []} tag={i === peak ? `US$${usd(d.total)}` : undefined} />)}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {days.map((d, i) => <T key={d.day} v="cap" w={i === 6 ? "bold" : "medium"} color={i === 6 ? "ink" : "muted"} style={{ flex: 1, textAlign: "center" }}>{LETTER[new Date(d.day).getDay()]}</T>)}
      </View>
      {sellers.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {sellers.map(([id, v], k) => (
            <View key={id} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: SEG[k % SEG.length] }} />
              <T v="cap" color="ink2">{`${name(id)} US$${usd(v)}`}</T>
            </View>
          ))}
        </View>
      ) : <T v="cap" color="muted">No payments from this pocket in the last 7 days.</T>}
    </View>
  );
}

function Bar({ i, h, peak, parts, tag }: { i: number; h: number; peak: boolean; parts: number[]; tag?: string }) {
  const reduce = useReduceMotion();
  const p = useSharedValue(reduce ? 1 : 0);
  React.useEffect(() => { if (!reduce) p.value = withDelay(i * 60, withTiming(1, { duration: 520, easing: EASE_OUT })); }, [i, reduce, p]);
  const grow = useAnimatedStyle(() => ({ height: h * p.value }));
  const tagIn = useAnimatedStyle(() => ({ opacity: Math.max(0, (p.value - 0.7) / 0.3) }));
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
      {tag ? (
        <Animated.View style={[{ marginBottom: 6, backgroundColor: c.ink, borderRadius: 7, paddingHorizontal: 6, height: 22, justifyContent: "center", borderWidth: 1, borderColor: c.white }, tagIn]}>
          <T v="cap" w="bold" style={{ color: c.white, fontSize: 10.5 }}>{tag}</T>
        </Animated.View>
      ) : null}
      <Animated.View style={[{ width: "100%", borderRadius: 6, overflow: "hidden", backgroundColor: peak ? c.ink : c.fill, justifyContent: "flex-end" }, grow]}>
        {peak ? (
          <View style={{ flex: 1 }}>
            <View style={{ flex: 0.18, overflow: "hidden" }}><Hatch color={c.white} pitch={5} stroke={1.3} opacity={0.4} /></View>
            {parts.map((f, k) => <View key={k} style={{ flex: f * 0.82, backgroundColor: SEG[k % SEG.length] }} />)}
          </View>
        ) : <Hatch color={c.ink} pitch={6} stroke={1.4} opacity={0.75} />}
      </Animated.View>
    </View>
  );
}
