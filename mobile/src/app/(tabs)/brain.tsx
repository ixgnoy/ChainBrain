// The Brain tab: ChainBrain at work, as a living graph. The brain in the middle, the agents round it, their pockets and the
// sellers those pockets may pay further out, and what it remembers as small lights round the centre (lib/brainGraph.ts).
// Each thing the agents did travels the graph as a pulse along the edges it touched, with its line underneath: a payment
// goes out to the seller, a refusal stops at the pocket, seller text that tried to give orders comes in and is dropped, a
// memory update flows back to the brain. Every node and every pulse is a real agent, pocket, seller, memory item or event.
// Below: what it watched and stopped, and what it has learned from you. Tap a pocket for its own brain (pocket-brain.tsx).
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import Animated, { Easing, FadeIn, FadeOut, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Circle, Line } from "react-native-svg";
import { router, useIsFocused } from "expo-router";
import { useApp } from "../../store";
import { c, radius } from "../../tokens";
import { haptic } from "../../haptics";
import { Screen, PageTitle } from "../../ui/Screen";
import { Press } from "../../ui/kit";
import { T } from "../../ui/Text";
import { Icon, type IconName } from "../../ui/Icon";
import { AgentAvatar } from "../../ui/AgentAvatar";
import { BrandMark } from "../../ui/BrandMark";
import { SellerMark, hasSellerMark } from "../../ui/SellerMark";
import { Rise } from "../../ui/Rise";
import { useReduceMotion } from "../../ui/motion";
import { cleanText } from "../../lib/sanitize";
import { initials } from "../../components/ActivityRow";
import { faceOf, toneFor } from "../../components/PocketFace";
import { RING, brainGraph, pulsesOf, type GNode, type Pulse, type PulseTone } from "../../lib/brainGraph";
import { MEMORY_KIND, type MemoryItem } from "../../lib/brain";
import * as api from "../../lib/api";
import { agentInfo } from "../../../../shared/sim/agents";

const TONE: Record<PulseTone, { color: string; icon: IconName; word: string }> = {
  paid: { color: c.white, icon: "check", word: "Paid" },
  refused: { color: c.vermillion, icon: "ban", word: "Refused" },
  guard: { color: c.vermillion, icon: "shieldCheck", word: "Ignored" },
  watched: { color: c.blue, icon: "eye", word: "Watched" },
  learned: { color: c.blue, icon: "sparkles", word: "Learned" },
};
const KIND_ICON: Record<MemoryItem["kind"], IconName> = { preference: "user", open_task: "clock", seller_note: "shield", fact: "sparkles" };
/** How long a pulse takes per edge, and the pause before the next. */
const HOP = 520, REST = 1100;
const ago = (at: number, now: number) => { const m = Math.round((now - at) / 60_000); return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };

export default function BrainTab() {
  const { pockets, events, sellerName, findPocket, setActive } = useApp();
  const { width } = useWindowDimensions();
  const size = Math.min(width - 32, 520);
  const reduce = useReduceMotion();
  const focused = useIsFocused();
  const live = useMemo(() => pockets.filter((p) => !p.revoked), [pockets]);

  // what the brain remembers, across every pocket (the same snapshots each pocket's brain shows)
  const memN = useMemo(() => events.filter((e) => e.type === "trace" && e.phase === "memory").length, [events]);
  const [memory, setMemory] = useState<(MemoryItem & { pocket: string })[]>([]);
  useEffect(() => {
    if (!focused) return;
    let gone = false;
    void Promise.all(live.map((p) => api.fetchMemory(p.address).then((r) => (r?.snapshot.items ?? []).map((m) => ({ ...m, pocket: p.address }))).catch(() => [])))
      .then((all) => { if (!gone) setMemory(all.flat().sort((a, b) => b.updatedAt - a.updatedAt)); });
    return () => { gone = true; };
  }, [focused, memN, live]);

  const name = useCallback((id?: string) => cleanText(sellerName(id), 20), [sellerName]);
  const agentName = useCallback((id?: string) => agentInfo(id ?? "chainbrain")?.name ?? "ChainBrain", []);
  const graph = useMemo(() => brainGraph({
    pockets: live.map((p) => ({ address: p.address, agentId: p.agentId, allowed: p.allowed, name: cleanText(p.name, 20), layout: p.app?.layout })),
    agentName, sellerName: name, memory: memory.length,
  }), [live, agentName, name, memory.length]);
  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);

  const decisionN = useMemo(() => events.filter((e) => ["payment", "refusal", "forced", "routine", "attack", "quote", "sentinel", "trace"].includes(e.type)).length, [events]);
  const pulses = useMemo(() => pulsesOf(events, { agentOf: (p) => findPocket(p ?? "")?.agentId ?? "chainbrain", sellerName: name, agentName })
    .map((p) => ({ ...p, path: p.path.filter((n) => byId.has(n)) })).filter((p) => p.path.length >= 2), [decisionN, byId]); // eslint-disable-line react-hooks/exhaustive-deps

  // the pulse on show: the newest ones in turn, and anything new as it happens
  const recent = pulses.slice(0, 12);
  const [i, setI] = useState(0);
  const newest = useRef(pulses[0]?.key);
  useEffect(() => {
    if (pulses[0] && pulses[0].key !== newest.current) { newest.current = pulses[0].key; setI(0); haptic.light(); }
  }, [pulses]);
  const cur: Pulse | undefined = recent[i % Math.max(recent.length, 1)];
  useEffect(() => {
    if (!focused || recent.length < 2) return;
    const t = setTimeout(() => setI((n) => (n + 1) % recent.length), reduce ? 3600 : (cur?.path.length ?? 2) * HOP + REST);
    return () => clearTimeout(t);
  }, [i, focused, recent.length, reduce, cur?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const paid = pulses.filter((p) => p.tone === "paid").length;
  const stopped = pulses.filter((p) => p.tone === "refused" || p.tone === "guard").length;
  const watched = pulses.filter((p) => p.tone === "watched").length;
  const sellers = graph.nodes.filter((n) => n.kind === "seller").length;
  const agents = graph.nodes.filter((n) => n.kind === "agent").length;
  const open = (address: string) => { setActive(address); router.push("/pocket-brain"); };

  return (
    <Screen>
      <PageTitle title="Brain" sub="Watches every payment your agents make, and learns with you" />
      <Rise dy={10} style={{ marginHorizontal: 16, marginTop: 8 }}>
        <View style={{ borderRadius: radius.card, backgroundColor: c.ink, overflow: "hidden", alignItems: "center", paddingTop: 12 }}
          accessible accessibilityLabel={`ChainBrain's graph: ${agents} agents, ${live.length} pockets, ${sellers} sellers, ${memory.length} things remembered.${cur ? ` Latest: ${cur.text}, ${ago(cur.at, Date.now())}.` : ""}`}>
          <View style={{ width: size - 24, height: size - 24 }}>
            <Graph nodes={graph.nodes} edges={graph.edges} byId={byId} size={size - 24} pulse={cur} reduce={reduce} play={focused} pockets={pockets} onPocket={open} />
          </View>
          <Caption pulse={cur} />
        </View>
      </Rise>
      {/* what it did, in four numbers */}
      <Rise dy={10} delay={60} style={{ flexDirection: "row", gap: 8, marginHorizontal: 16, marginTop: 10 }}>
        <Stat icon="eye" n={paid + watched} label="Watched" a11y={`Watched ${paid} payments and ${watched} price checks`} />
        <Stat icon="shieldCheck" n={stopped} label="Stopped" a11y={`Stopped ${stopped} refused payments and ignored orders`} tone={stopped ? c.vermillion : undefined} />
        <Stat icon="sparkles" n={memory.length} label="Learned" a11y={`Remembers ${memory.length} things`} tone={memory.length ? c.blue : undefined} />
        <Stat icon="radar" n={sellers} label="Sellers" a11y={`Knows ${sellers} sellers`} />
      </Rise>
      {/* what it has learned from you */}
      <Rise dy={10} delay={120} style={{ marginHorizontal: 16, marginTop: 22 }}>
        <T v="section">Learned with you</T>
        <View style={{ marginTop: 10, gap: 8 }}>
          {memory.slice(0, 3).map((m) => {
            const p = findPocket(m.pocket);
            return (
              <Press key={`${m.pocket}:${m.id}`} kind="row" haptics="select" onPress={() => open(m.pocket)} accessibilityRole="button" accessibilityLabel={`${MEMORY_KIND[m.kind]}: ${m.text}. ${p ? cleanText(p.name, 24) : ""}. Opens this pocket's brain`}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.tile, backgroundColor: c.card }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.blueSoft, alignItems: "center", justifyContent: "center" }}><Icon name={KIND_ICON[m.kind]} size={16} color={c.blueInk} stroke={2.2} /></View>
                <View style={{ flex: 1 }}>
                  <T v="row" w="semi" numberOfLines={1}>{cleanText(m.text, 90)}</T>
                  <T v="cap" color="muted" numberOfLines={1}>{[p ? cleanText(p.name, 24) : undefined, m.uses ? `used ${m.uses}×` : undefined].filter(Boolean).join(" · ")}</T>
                </View>
                <Icon name="chevronRight" size={16} color={c.faint} />
              </Press>
            );
          })}
          {!memory.length ? <T v="sub" color="mutedOnCanvas">As your agents work, the brain keeps notes on what you prefer and which sellers to trust.</T> : null}
        </View>
      </Rise>
      {/* each pocket's own brain */}
      <Rise dy={10} delay={160} style={{ marginHorizontal: 16, marginTop: 22 }}>
        <T v="section">Each pocket</T>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {live.map((p) => {
            const f = faceOf(toneFor(pockets, p.address));
            return (
              <Press key={p.address} haptics="select" onPress={() => open(p.address)} accessibilityRole="button" accessibilityLabel={`${cleanText(p.name, 24)}: open its brain`}
                style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 6, paddingRight: 14, borderRadius: 22, backgroundColor: c.card }}>
                {p.agentId ? <AgentAvatar kind={p.agentId} size={28} /> : <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: f.face, borderWidth: 1, borderColor: c.line }} />}
                <T v="cap" w="semi" numberOfLines={1}>{cleanText(p.name, 20)}</T>
              </Press>
            );
          })}
        </View>
      </Rise>
    </Screen>
  );
}

function Stat({ icon, n, label, a11y, tone }: { icon: IconName; n: number; label: string; a11y: string; tone?: string }) {
  return (
    <View accessible accessibilityLabel={a11y} style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 10, borderRadius: radius.tile, backgroundColor: c.card, gap: 4 }}>
      <Icon name={icon} size={16} color={tone ?? c.ink} stroke={2.2} />
      <T v="section" style={{ fontVariant: ["tabular-nums"] }}>{String(n)}</T>
      <T v="cap" color="muted">{label}</T>
    </View>
  );
}

/** The line under the graph: who did what, and when. */
function Caption({ pulse }: { pulse?: Pulse }) {
  const now = Date.now();
  return (
    <View style={{ alignSelf: "stretch", height: 64, justifyContent: "center", paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" }}>
      {pulse ? (
        <Animated.View key={pulse.key} entering={FadeIn.duration(240)} exiting={FadeOut.duration(160)} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <AgentAvatar kind={pulse.agent ?? "chainbrain"} size={30} />
          <View style={{ flex: 1 }}>
            <T v="row" w="semi" numberOfLines={1} style={{ color: c.white }}>{pulse.text}</T>
            <T v="cap" numberOfLines={1} style={{ color: "rgba(255,255,255,0.6)" }}>{ago(pulse.at, now)}</T>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.1)" }}>
            <Icon name={TONE[pulse.tone].icon} size={12} color={TONE[pulse.tone].color} stroke={2.4} />
            <T v="cap" w="bold" style={{ color: TONE[pulse.tone].color }}>{TONE[pulse.tone].word}</T>
          </View>
        </Animated.View>
      ) : <T v="cap" style={{ color: "rgba(255,255,255,0.6)", textAlign: "center" }}>Waiting for your agents' first move</T>}
    </View>
  );
}

const NODE = { brain: 64, agent: 34, pocket: 18, seller: 28, memory: 8 };

const Graph = React.memo(function Graph({ nodes, edges, byId, size, pulse, reduce, play, pockets, onPocket }: {
  nodes: GNode[]; edges: { from: string; to: string }[]; byId: Map<string, GNode>; size: number; pulse?: Pulse; reduce: boolean; play: boolean;
  pockets: Parameters<typeof toneFor>[0]; onPocket(address: string): void;
}) {
  const on = new Set(pulse?.path ?? []);
  const hot = (a: string, b: string) => { const p = pulse?.path ?? []; for (let k = 1; k < p.length; k++) if ((p[k - 1] === a && p[k] === b) || (p[k - 1] === b && p[k] === a)) return true; return false; };
  const tone = pulse ? TONE[pulse.tone].color : c.white;
  return (
    <>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        {[RING.memory, RING.agent, RING.pocket, RING.seller].map((r) => <Circle key={r} cx={size / 2} cy={size / 2} r={(size / 2) * r} stroke="rgba(255,255,255,0.05)" strokeWidth={1} fill="none" />)}
        {edges.map((e) => {
          const a = byId.get(e.from)!, b = byId.get(e.to)!;
          const h = hot(e.from, e.to);
          return <Line key={`${e.from}>${e.to}`} x1={a.x * size} y1={a.y * size} x2={b.x * size} y2={b.y * size} stroke={h ? tone : "rgba(255,255,255,0.13)"} strokeWidth={h ? 1.8 : 1} strokeOpacity={h ? 0.85 : 1} />;
        })}
      </Svg>
      {nodes.map((n) => <Node key={n.id} n={n} size={size} lit={on.has(n.id)} tone={tone} reduce={reduce} play={play} pockets={pockets} onPocket={onPocket} />)}
      {pulse && !reduce && play ? <Spark key={pulse.key} pts={pulse.path.map((id) => byId.get(id)!)} size={size} color={tone} /> : null}
    </>
  );
});

/** One node: the brain breathes, memory lights twinkle, the nodes a pulse passes through light up. */
function Node({ n, size, lit, tone, reduce, play, pockets, onPocket }: { n: GNode; size: number; lit: boolean; tone: string; reduce: boolean; play: boolean; pockets: Parameters<typeof toneFor>[0]; onPocket(a: string): void }) {
  const d = NODE[n.kind];
  const b = useSharedValue(1);
  useEffect(() => {
    if (reduce || !play || (n.kind !== "brain" && n.kind !== "memory")) { cancelAnimation(b); b.value = 1; return; }
    const slow = n.kind === "brain" ? 1400 : 900 + (n.id.length * 137) % 900;
    b.value = withRepeat(withSequence(withTiming(n.kind === "brain" ? 1.06 : 0.35, { duration: slow, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: slow, easing: Easing.inOut(Easing.quad) })), -1);
    return () => cancelAnimation(b);
  }, [reduce, play, n.kind, n.id, b]);
  const style = useAnimatedStyle(() => (n.kind === "memory" ? { opacity: b.value } : { transform: [{ scale: b.value }] }));
  const left = n.x * size - d / 2, top = n.y * size - d / 2;
  const ring = lit ? { borderWidth: 2, borderColor: tone } : null;
  if (n.kind === "pocket") {
    const f = faceOf(toneFor(pockets, n.ref ?? ""));
    return (
      <Press haptics="select" onPress={() => onPocket(n.ref!)} accessibilityRole="button" accessibilityLabel={`${n.label}: open its brain`}
        style={{ position: "absolute", left: left - 13, top: top - 13, width: d + 26, height: d + 26, alignItems: "center", justifyContent: "center" }}>
        <View style={[{ width: d, height: d, borderRadius: d / 2, backgroundColor: f.face, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.7)" }, ring]} />
      </Press>
    );
  }
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left, top, width: d, height: d, alignItems: "center", justifyContent: "center" }, style]}>
      {n.kind === "brain" ? (
        <View style={[{ width: d, height: d, borderRadius: d / 2, backgroundColor: c.white, alignItems: "center", justifyContent: "center" }, lit ? { borderWidth: 3, borderColor: tone === c.white ? c.blue : tone } : null]}><BrandMark size={34} /></View>
      ) : n.kind === "agent" ? (
        <View style={[{ borderRadius: d / 2 + 3, padding: 2, backgroundColor: lit ? tone : "rgba(255,255,255,0.4)" }]}><AgentAvatar kind={n.ref ?? "chainbrain"} size={d - 4} /></View>
      ) : n.kind === "seller" ? (
        <View style={[{ borderRadius: 9, padding: 1.5, backgroundColor: lit ? tone : "transparent" }]}>
          {hasSellerMark(n.ref) ? <SellerMark id={n.ref!} size={d - 3} radius={8} /> : (
            <View style={{ width: d - 3, height: d - 3, borderRadius: 8, backgroundColor: "#2A2B30", alignItems: "center", justifyContent: "center" }}>
              <T v="tab" allowFontScaling={false} style={{ color: c.white, fontSize: 10, lineHeight: 12 }}>{initials(n.label)}</T>
            </View>
          )}
        </View>
      ) : (
        <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: c.blue }} />
      )}
    </Animated.View>
  );
}

/** The pulse: a bright dot travelling the path one edge at a time, then a ring that opens on the last node. */
function Spark({ pts, size, color }: { pts: GNode[]; size: number; color: string }) {
  const t = useSharedValue(0);
  const ring = useSharedValue(0);
  const xs = pts.map((p) => p.x * size), ys = pts.map((p) => p.y * size);
  const n = pts.length - 1;
  useEffect(() => {
    t.value = withTiming(n, { duration: n * HOP, easing: Easing.inOut(Easing.quad) });
    ring.value = withSequence(withTiming(0, { duration: n * HOP }), withTiming(1, { duration: 520, easing: Easing.out(Easing.quad) }));
    return () => { cancelAnimation(t); cancelAnimation(ring); };
  }, [n, t, ring]);
  const dot = useAnimatedStyle(() => {
    const k = Math.min(Math.floor(t.value), n - 1), f = t.value - k;
    return { opacity: t.value >= n ? 0 : 1, transform: [{ translateX: xs[k] + (xs[k + 1] - xs[k]) * f - 6 }, { translateY: ys[k] + (ys[k + 1] - ys[k]) * f - 6 }] };
  });
  const open = useAnimatedStyle(() => ({ opacity: ring.value > 0 ? 1 - ring.value : 0, transform: [{ translateX: xs[n] - 20 }, { translateY: ys[n] - 20 }, { scale: 0.6 + ring.value * 1.4 }] }));
  return (
    <>
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: color, shadowColor: color, shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } }, dot]} />
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: color }, open]} />
    </>
  );
}
