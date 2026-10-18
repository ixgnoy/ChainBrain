// The Brain map: the Brain tab's graph full screen, to explore. Pinch to zoom and drag to move (or the + / − / fit buttons,
// which also serve the web and VoiceOver). A pinch zooms the picture while the fingers move, then lays the graph out again
// at the new zoom, so nodes and names stay their own size and sharp instead of growing blurry. Every node is named and
// every busy edge shows how many payments crossed it once you zoom in; tap a node for what it is and what went through it.
import React, { useCallback, useMemo, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useApp } from "../store";
import { c } from "../tokens";
import { haptic } from "../haptics";
import { Press } from "../ui/kit";
import { T } from "../ui/Text";
import { Icon, type IconName } from "../ui/Icon";
import { useReduceMotion } from "../ui/motion";
import { cleanText } from "../lib/sanitize";
import { brainGraph, trafficOf } from "../lib/brainGraph";
import { FocusPanel, Graph } from "../components/BrainGraphView";
import { agentInfo } from "../../../shared/sim/agents";

const MIN = 0.8, MAX = 4, START = 1;
const clamp = (z: number) => Math.min(MAX, Math.max(MIN, z));

export default function BrainMap() {
  const { pockets, events, sellerName, setActive } = useApp();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const base = Math.min(width, height) - 24;
  const [zoom, setZoom] = useState(START);
  const size = Math.round(base * zoom);
  const [focus, setFocus] = useState<string | null>(null);

  const live = useMemo(() => pockets.filter((p) => !p.revoked), [pockets]);
  const name = useCallback((id?: string) => cleanText(sellerName(id), 20), [sellerName]);
  const agentName = useCallback((id?: string) => agentInfo(id ?? "chainbrain")?.name ?? "ChainBrain", []);
  const payN = useMemo(() => events.filter((e) => e.type === "payment").length, [events]);
  const memN = useMemo(() => events.filter((e) => e.type === "trace" && e.phase === "memory").length, [events]);
  const traffic = useMemo(() => trafficOf(events), [payN]); // eslint-disable-line react-hooks/exhaustive-deps
  const graph = useMemo(() => brainGraph({
    pockets: live.map((p) => ({ address: p.address, agentId: p.agentId, allowed: p.allowed, name: cleanText(p.name, 20), layout: p.app?.layout })),
    agentName, sellerName: name, memory: memN, traffic,
  }), [live, agentName, name, memN, traffic]);
  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);

  // the picture's offset from the centre of the screen, and the pinch's live scale until it is laid out again
  const tx = useSharedValue(0), ty = useSharedValue(0), sx = useSharedValue(0), sy = useSharedValue(0), s = useSharedValue(1);
  const relayout = useCallback((k: number) => {
    setZoom((z) => {
      const next = clamp(z * k), real = next / z;
      tx.value = tx.value * real; ty.value = ty.value * real; s.value = 1;
      return next;
    });
  }, [tx, ty, s]);
  const pinch = Gesture.Pinch()
    .onUpdate((e) => { s.value = Math.min(MAX / zoom, Math.max(MIN / zoom, e.scale)); })
    .onEnd(() => { scheduleOnRN(relayout, s.value); });
  const pan = Gesture.Pan().minDistance(4)
    .onStart(() => { sx.value = tx.value; sy.value = ty.value; })
    .onUpdate((e) => { tx.value = sx.value + e.translationX; ty.value = sy.value + e.translationY; });
  const twice = Gesture.Tap().numberOfTaps(2).onEnd(() => { scheduleOnRN(fit); });
  const gesture = Gesture.Simultaneous(pinch, pan, twice);
  const picture = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: s.value }] }));

  function fit() {
    setZoom(START);
    tx.value = reduce ? 0 : withTiming(0, { duration: 220 }); ty.value = reduce ? 0 : withTiming(0, { duration: 220 });
  }
  const step = (k: number) => { haptic.select(); relayout(k); };
  const open = (address: string) => { setActive(address); router.push("/pocket-brain"); };

  return (
    <View style={{ flex: 1, backgroundColor: c.ink }}>
      <GestureDetector gesture={gesture}>
        <View style={{ flex: 1, overflow: "hidden" }} accessible accessibilityLabel={`Brain map: ${graph.nodes.filter((n) => n.kind === "agent").length} agents, ${live.length} cards, ${graph.nodes.filter((n) => n.kind === "seller").length} sellers. Pinch or use the zoom buttons.`}>
          <Animated.View style={[{ position: "absolute", left: (width - size) / 2, top: (height - size) / 2, width: size, height: size }, picture]}>
            <Graph nodes={graph.nodes} edges={graph.edges} byId={byId} size={size} reduce={reduce} play pockets={pockets} focus={focus} all edgeLabels={zoom >= 1.4}
              onFocus={(id) => { haptic.select(); setFocus((f) => (f === id ? null : id)); }} />
          </Animated.View>
        </View>
      </GestureDetector>

      {/* top: close, title, what is on it */}
      <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, top: 0, paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(17,18,21,0.92)" }}>
        <Press kind="round" haptics="light" onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close the map"
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
          <Icon name="x" size={18} color={c.white} stroke={2.2} />
        </Press>
        <View style={{ flex: 1 }}>
          <T v="head" style={{ color: c.white }}>Brain map</T>
          <T v="cap" style={{ color: "rgba(255,255,255,0.6)" }} numberOfLines={1}>{`${live.length} cards · ${graph.nodes.filter((n) => n.kind === "seller").length} sellers · ${payN} payments`}</T>
        </View>
      </View>

      {/* zoom: buttons for the web and for VoiceOver, as well as the pinch */}
      {/* above the ask dock's pill (bottom right, ~70 pt) so neither covers the other */}
      <View style={{ position: "absolute", right: 16, bottom: insets.bottom + (focus ? 140 : 96), gap: 8, padding: 4, borderRadius: 26, backgroundColor: "rgba(17,18,21,0.85)" }}>
        <ZoomButton icon="plus" label="Zoom in" onPress={() => step(1.4)} />
        <ZoomButton icon="minus" label="Zoom out" onPress={() => step(1 / 1.4)} />
        <ZoomButton icon="target" label="Fit the map" onPress={() => { haptic.select(); fit(); }} />
      </View>

      {focus ? (
        <View style={{ position: "absolute", left: 12, right: 12, bottom: insets.bottom + 12, borderRadius: 20, backgroundColor: "#1B1C20", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
          <FocusPanel id={focus} byId={byId} edges={graph.edges} events={events} pockets={live} onOpen={open} onClose={() => setFocus(null)} />
        </View>
      ) : null}
    </View>
  );
}

function ZoomButton({ icon, label, onPress }: { icon: IconName; label: string; onPress(): void }) {
  return (
    <Press kind="round" haptics="none" onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
      <Icon name={icon} size={18} color={c.white} stroke={2.2} />
    </Press>
  );
}
