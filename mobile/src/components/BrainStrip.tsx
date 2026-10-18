// Home's glance at the Brain: a slim dark strip under the wallet with a tiny graph (the brain and three pockets in their
// cards' colours, a dot travelling out along one edge), the latest real decision and how many pockets it watches. A tap
// opens the Brain tab, where the full graph is. Every word comes from the same events as the Brain tab (lib/brainGraph.ts).
import React, { useEffect, useMemo } from "react";
import { View } from "react-native";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import Svg, { Circle, Line } from "react-native-svg";
import { router, useIsFocused } from "expo-router";
import { useApp } from "../store";
import { c, deck } from "../tokens";
import { Press } from "../ui/kit";
import { T } from "../ui/Text";
import { Icon } from "../ui/Icon";
import { useReduceMotion } from "../ui/motion";
import { cleanText } from "../lib/sanitize";
import { pulsesOf } from "../lib/brainGraph";
import { agentInfo } from "../../../shared/sim/agents";

const ago = (at: number) => { const m = Math.round((Date.now() - at) / 60_000); return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };
/** The tiny graph: the brain at the centre, three pockets round it (daily, weekly, one-time faces). */
const W = 44, H = 30, CX = 22, CY = 15;
const SAT = [{ x: 6, y: 7, f: deck[2].face }, { x: 39, y: 8, f: deck[0].face }, { x: 33, y: 26, f: deck[1].face }];

export function BrainStrip() {
  const { events, pockets, findPocket, sellerName } = useApp();
  const reduce = useReduceMotion();
  const focused = useIsFocused();
  const live = pockets.filter((p) => !p.revoked).length;
  const n = useMemo(() => events.filter((e) => ["payment", "refusal", "forced", "routine", "attack", "quote", "sentinel", "trace"].includes(e.type)).length, [events]);
  const latest = useMemo(() => pulsesOf(events, {
    agentOf: (p) => findPocket(p ?? "")?.agentId ?? "chainbrain",
    sellerName: (id) => cleanText(sellerName(id), 20),
    agentName: (id) => agentInfo(id ?? "chainbrain")?.name ?? "ChainBrain",
  })[0], [n]); // eslint-disable-line react-hooks/exhaustive-deps

  // a dot travelling from the brain out along one edge, over and over
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce || !focused) { cancelAnimation(t); t.value = 0; return; }
    t.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1);
    return () => cancelAnimation(t);
  }, [reduce, focused, t]);
  const dot = useAnimatedStyle(() => ({
    opacity: t.value < 0.1 ? t.value * 10 : t.value > 0.85 ? (1 - t.value) / 0.15 : 1,
    transform: [{ translateX: CX + (SAT[1].x - CX) * t.value - 2 }, { translateY: CY + (SAT[1].y - CY) * t.value - 2 }],
  }));
  if (!live) return null;
  const tone = latest?.tone === "refused" || latest?.tone === "guard" ? c.vermillion : latest?.tone === "paid" ? c.white : c.blue;
  return (
    <Press kind="row" haptics="select" onPress={() => router.navigate("/brain")} accessibilityRole="button"
      accessibilityLabel={`Brain is watching ${live} pockets.${latest ? ` Latest: ${latest.text}, ${ago(latest.at)}.` : ""} Opens the Brain`}
      style={{ marginHorizontal: 16, marginTop: 12, minHeight: 56, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 18, backgroundColor: c.ink, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ width: W, height: H }}>
        <Svg width={W} height={H}>
          {SAT.map((s, k) => <Line key={k} x1={CX} y1={CY} x2={s.x} y2={s.y} stroke={k === 1 ? c.blue : "rgba(255,255,255,0.25)"} strokeWidth={k === 1 ? 1.5 : 1} />)}
          {SAT.map((s, k) => <Circle key={`n${k}`} cx={s.x} cy={s.y} r={3.2} fill={s.f} />)}
          <Circle cx={CX} cy={CY} r={5} fill={c.white} />
        </Svg>
        {!reduce ? <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: 4, height: 4, borderRadius: 2, backgroundColor: tone }, dot]} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <T v="row" w="semi" numberOfLines={1} style={{ color: c.white }}>{latest ? latest.text : "No decisions yet"}</T>
        <T v="cap" numberOfLines={1} style={{ color: "rgba(255,255,255,0.6)" }}>{`${latest ? `${ago(latest.at)} · ` : ""}Brain is watching ${live} ${live === 1 ? "pocket" : "pockets"}`}</T>
      </View>
      <Icon name="chevronRight" size={16} color="rgba(255,255,255,0.6)" stroke={2} />
    </Press>
  );
}
