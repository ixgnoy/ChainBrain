// Compact live trace under an agent reply, rebuilt for the v2 trace phases (tool_call / tool_result; `tool` and repeated `thinking` ignored).
import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useTheme } from "../theme";
import { Press, ReasonChip } from "../ui/primitives";
import { T, Mono } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { useReduceMotion } from "../ui/motion";
import { cleanText } from "../lib/sanitize";
import { radius } from "../tokens";
import { traceLines, type TraceLine, type WalletEvent } from "../lib/events";

function Dot({ state }: { state: TraceLine["state"] }) {
  const { c } = useTheme();
  const reduce = useReduceMotion();
  const o = useSharedValue(1);
  useEffect(() => {
    if (!reduce && (state === "run" || state === "ask")) o.value = withRepeat(withTiming(0.3, { duration: 700, easing: Easing.inOut(Easing.quad) }), -1, true);
    else o.value = 1;
  }, [state, o, reduce]);
  const s = useAnimatedStyle(() => ({ opacity: o.value }));
  const col = state === "ok" ? c.ok : state === "refused" ? c.refused : state === "ask" ? c.stepup : c.accent;
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: col }, s]} />;
}

export function TraceBlock({ events, live }: { events: WalletEvent[]; live?: boolean }) {
  const { c } = useTheme();
  const reduce = useReduceMotion();
  const lines = useMemo(() => traceLines(events), [events]);
  const [open, setOpen] = useState<boolean | null>(null);
  const expanded = open ?? !!live;
  if (!lines.length) return null;
  const last = lines[lines.length - 1];
  const tools = lines.filter((l) => l.kind === "tool").length;
  const summary = live ? (last.kind === "tool" ? `Running ${last.tool}…` : "Thinking…") : `Checked the rules · ${tools} step${tools === 1 ? "" : "s"}`;
  return (
    <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.bgElev1, overflow: "hidden", alignSelf: "stretch" }}>
      <Press haptics="select" scale={0.99} onPress={() => setOpen(!expanded)} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, height: 44 }} accessibilityLabel="Toggle agent trace">
        <Dot state={live ? "run" : last.state === "run" ? "ok" : last.state} />
        <T v="caption" color="text2" style={{ flex: 1 }} numberOfLines={1}>{summary}</T>
        <View style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}><Icon name="chevronDown" size={14} color={c.text3} /></View>
      </Press>
      {expanded && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 10, gap: 8 }}>
          {lines.map((l) => (
            <Animated.View key={l.key} entering={reduce ? undefined : FadeInDown.duration(160)} style={{ gap: 3 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Dot state={l.state} />
                {l.kind === "tool" ? <Mono size={12} color="text">{l.tool}</Mono> : <T v="caption" color="text2" style={{ flex: 1 }}>{cleanText(l.text, 140)}</T>}
                {l.reasons.slice(0, 2).map((r) => <ReasonChip key={r} code={r} tone={l.state === "ask" ? "stepup" : "refused"} />)}
              </View>
              {l.summary ? <T v="caption" color="text3" style={{ paddingLeft: 15 }} numberOfLines={2}>{cleanText(l.summary, 120)}</T> : null}
            </Animated.View>
          ))}
        </View>
      )}
    </View>
  );
}
