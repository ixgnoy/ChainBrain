// The Brain graph itself, shared by the Brain tab and the full-screen map (brain-map.tsx): the curved, weighted edges with
// their traffic, every node (the brain under its scan ring, agents, cards, sellers, memory lights), the pulse that travels a
// decision's path, and the panel a tapped node opens. Layout: shared/sim/brainGraph.ts.
import React, { useEffect, useMemo } from "react";
import { View } from "react-native";
import Animated, { Easing, FadeIn, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from "react-native-svg";
import { c } from "../tokens";
import { Press } from "../ui/kit";
import { T } from "../ui/Text";
import { Icon, type IconName } from "../ui/Icon";
import { AgentAvatar } from "../ui/AgentAvatar";
import { BrandMark } from "../ui/BrandMark";
import { SellerMark, hasSellerMark } from "../ui/SellerMark";
import { money } from "../lib/util";
import { initials } from "./ActivityRow";
import { faceOf, toneFor } from "./PocketFace";
import { RING, type GEdge, type GNode, type Pulse, type PulseTone } from "../lib/brainGraph";

/** How long a pulse takes per edge. */
export const HOP = 520;
const DIM = "rgba(255,255,255,0.55)";
export const TONE: Record<PulseTone, { color: string; icon: IconName; word: string }> = {
  paid: { color: c.white, icon: "check", word: "Paid" },
  refused: { color: c.vermillion, icon: "ban", word: "Refused" },
  guard: { color: c.vermillion, icon: "shieldCheck", word: "Ignored" },
  watched: { color: c.blue, icon: "eye", word: "Watched" },
  learned: { color: c.blue, icon: "sparkles", word: "Learned" },
};

/** A curve between two nodes: a quadratic bend to one side, so the graph swirls instead of crossing in straight lines. */
export const bend = (a: { x: number; y: number }, b: { x: number; y: number }) => { const k = 0.16; return { x: (a.x + b.x) / 2 - (b.y - a.y) * k, y: (a.y + b.y) / 2 + (b.x - a.x) * k }; };

/** A tapped node: what it is and what went through it, from the same events. */
export function FocusPanel({ id, byId, edges, events, pockets, onOpen, onClose }: {
  id: string; byId: Map<string, GNode>; edges: GEdge[]; events: { type: string; pocket?: string; sellerId?: string; at: number; [k: string]: any }[];
  pockets: { address: string; name: string; balance: bigint; agentId?: string }[]; onOpen(a: string): void; onClose(): void;
}) {
  const n = byId.get(id);
  if (!n) return null;
  const since = Date.now() - 14 * 86_400_000;
  const recent = events.filter((e) => e.at >= since);
  let title = n.label, sub = "", action: { label: string; go(): void } | undefined;
  if (n.kind === "pocket") {
    const p = pockets.find((x) => x.address === n.ref);
    const pays = recent.filter((e) => e.type === "payment" && e.pocket?.toLowerCase() === n.ref!.toLowerCase());
    const refused = recent.filter((e) => e.type === "refusal" && e.pocket?.toLowerCase() === n.ref!.toLowerCase()).length;
    sub = `${p ? `${money(p.balance)} left · ` : ""}${pays.length} paid · ${refused} refused in 14 days`;
    action = { label: "Its brain", go: () => onOpen(n.ref!) };
  } else if (n.kind === "seller") {
    const pays = recent.filter((e) => e.type === "payment" && e.sellerId === n.ref);
    const r = [...events].reverse().find((e) => e.type === "radar" && e.sellerId === n.ref);
    const from = edges.filter((e) => e.to === id).length;
    sub = `${pays.length} paid from your cards · ${from} ${from === 1 ? "card may" : "cards may"} pay it${r ? ` · Radar ${Number(r.score) || 0}/10` : ""}`;
  } else if (n.kind === "agent") {
    const held = edges.filter((e) => e.from === id).length;
    const mine = new Set(edges.filter((e) => e.from === id).map((e) => byId.get(e.to)?.ref?.toLowerCase()));
    const pays = recent.filter((e) => e.type === "payment" && mine.has(String(e.pocket).toLowerCase())).length;
    sub = `Holds ${held} ${held === 1 ? "card" : "cards"} · ${pays} payments in 14 days`;
  } else if (n.kind === "brain") {
    title = "ChainBrain"; sub = "Checks every payment against your rules, Radar and the Sentinel, then learns from it";
  } else { title = "Memory"; sub = "Something the brain remembers from your agents' work"; }
  return (
    <Animated.View entering={FadeIn.duration(200)} style={{ alignSelf: "stretch", minHeight: 64, flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 14, paddingRight: 4, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" }}
      accessibilityLiveRegion="polite">
      <View style={{ flex: 1 }}>
        <T v="row" w="bold" numberOfLines={1} style={{ color: c.white }}>{title}</T>
        <T v="cap" numberOfLines={2} style={{ color: DIM }}>{sub}</T>
      </View>
      {action ? (
        <Press haptics="select" onPress={action.go} accessibilityRole="button" accessibilityLabel={`${title}: open its brain`} style={{ height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: c.white, justifyContent: "center" }}>
          <T v="cap" w="bold">{action.label}</T>
        </Press>
      ) : null}
      <Press haptics="select" onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
        <Icon name="x" size={16} color={c.white} stroke={2.2} />
      </Press>
    </Animated.View>
  );
}

const NODE = { brain: 60, agent: 34, pocket: 18, seller: 28, memory: 7 };

export const Graph = React.memo(function Graph({ nodes, edges, byId, size, pulse, lit, reduce, play, pockets, focus, onFocus, all, edgeLabels }: {
  nodes: GNode[]; edges: GEdge[]; byId: Map<string, GNode>; size: number; pulse?: Pulse; lit?: string[]; reduce: boolean; play: boolean;
  pockets: Parameters<typeof toneFor>[0]; focus: string | null; onFocus(id: string): void;
  /** name every node (the full-screen map) */ all?: boolean; /** show each busy edge's payment count at its middle */ edgeLabels?: boolean;
}) {
  const path = focus ? [] : lit ?? pulse?.path ?? [];
  const on = new Set(path);
  const hot = (a: string, b: string) => { for (let k = 1; k < path.length; k++) if ((path[k - 1] === a && path[k] === b) || (path[k - 1] === b && path[k] === a)) return true; return false; };
  const tone = lit ? c.blue : pulse ? TONE[pulse.tone].color : c.white;
  // a focused node shows itself and its neighbours; the rest fades back
  const near = useMemo(() => {
    if (!focus) return null;
    const s = new Set([focus]);
    for (const e of edges) { if (e.from === focus) s.add(e.to); if (e.to === focus) s.add(e.from); }
    return s;
  }, [focus, edges]);
  const P = (n: GNode) => ({ x: n.x * size, y: n.y * size });
  const curve = (e: GEdge) => { const a = P(byId.get(e.from)!), b = P(byId.get(e.to)!), q = bend(a, b); return `M${a.x},${a.y} Q${q.x},${q.y} ${b.x},${b.y}`; };
  // the busiest pocket → seller edges carry their traffic as moving dots (at most 12)
  const flows = useMemo(() => edges.filter((e) => (e.traffic ?? 0) > 0).sort((a, b) => (b.traffic ?? 0) - (a.traffic ?? 0)).slice(0, 12), [edges]);
  const cx = size / 2;
  return (
    <>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Defs>
          <RadialGradient id="bg-core" cx={cx} cy={cx} r={cx} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={c.blue} stopOpacity="0.22" />
            <Stop offset="0.45" stopColor={c.blue} stopOpacity="0.05" />
            <Stop offset="1" stopColor={c.blue} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={cx} cy={cx} r={cx} fill="url(#bg-core)" />
        {[RING.memory, RING.agent, RING.pocket, RING.seller].map((r) => <Circle key={r} cx={cx} cy={cx} r={cx * r} stroke="rgba(255,255,255,0.07)" strokeWidth={1} strokeDasharray="2 5" fill="none" />)}
        {edges.map((e) => {
          const h = hot(e.from, e.to);
          const faded = near && !(near.has(e.from) && near.has(e.to));
          const w = 0.8 + Math.min(e.traffic ?? 0, 10) * 0.22;
          return <Path key={`${e.from}>${e.to}`} d={curve(e)} fill="none" stroke={h ? tone : "#FFFFFF"} strokeOpacity={h ? 0.9 : faded ? 0.04 : near ? 0.35 : 0.13 + Math.min(e.traffic ?? 0, 10) * 0.025} strokeWidth={h ? 2.2 : w} strokeLinecap="round" />;
        })}
        {/* the lit path's glow */}
        {edges.filter((e) => hot(e.from, e.to)).map((e) => <Path key={`g:${e.from}>${e.to}`} d={curve(e)} fill="none" stroke={tone} strokeOpacity={0.22} strokeWidth={8} strokeLinecap="round" />)}
      </Svg>
      {!reduce && play && !near ? flows.map((e, k) => <Flow key={`${e.from}>${e.to}`} a={P(byId.get(e.from)!)} b={P(byId.get(e.to)!)} traffic={e.traffic ?? 1} delay={k * 230} />) : null}
      {nodes.map((n) => <Node key={n.id} n={n} size={size} lit={on.has(n.id)} tone={tone} reduce={reduce} play={play} pockets={pockets} faded={!!near && !near.has(n.id)} focused={focus === n.id} shown={all || !!near?.has(n.id)} onFocus={onFocus} />)}
      {edgeLabels ? edges.filter((e) => (e.traffic ?? 0) > 0).map((e) => {
        // the middle of the curve: (a + 2q + b) / 4
        const a = P(byId.get(e.from)!), b = P(byId.get(e.to)!), q = bend(a, b);
        const x = (a.x + 2 * q.x + b.x) / 4, y = (a.y + 2 * q.y + b.y) / 4;
        const faded = !!near && !(near.has(e.from) && near.has(e.to));
        return (
          <View key={`l:${e.from}>${e.to}`} pointerEvents="none" style={{ position: "absolute", left: x - 22, top: y - 9, width: 44, alignItems: "center", opacity: faded ? 0.15 : 1 }}>
            <View style={{ paddingHorizontal: 6, height: 18, borderRadius: 9, backgroundColor: "rgba(17,18,21,0.9)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", justifyContent: "center" }}>
              <T v="tab" allowFontScaling={false} style={{ color: c.white, fontSize: 9, lineHeight: 11, textTransform: "none" }}>{`${e.traffic} paid`}</T>
            </View>
          </View>
        );
      }) : null}
      {pulse && !lit && !reduce && play && !near ? <Spark key={pulse.key} pts={pulse.path.map((id) => P(byId.get(id)!))} color={tone} /> : null}
    </>
  );
});

/** Traffic: a small dot that keeps running along a busy edge, faster the more payments crossed it in two weeks. */
function Flow({ a, b, traffic, delay }: { a: { x: number; y: number }; b: { x: number; y: number }; traffic: number; delay: number }) {
  const t = useSharedValue(0);
  const q = bend(a, b);
  useEffect(() => {
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: Math.max(2800 - Math.min(traffic, 10) * 160, 1200), easing: Easing.linear }), -1));
    return () => cancelAnimation(t);
  }, [delay, traffic, t]);
  const style = useAnimatedStyle(() => {
    const s = t.value, u = 1 - s;
    const x = u * u * a.x + 2 * u * s * q.x + s * s * b.x, y = u * u * a.y + 2 * u * s * q.y + s * s * b.y;
    return { opacity: s < 0.08 ? s / 0.08 : s > 0.9 ? (1 - s) / 0.1 : 1, transform: [{ translateX: x - 2 }, { translateY: y - 2 }] };
  });
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.75)" }, style]} />;
}

/** One node: the brain breathes under a turning scan ring, memory lights twinkle, the nodes a pulse passes through light up. */
function Node({ n, size, lit, tone, reduce, play, pockets, faded, focused, shown, onFocus }: {
  n: GNode; size: number; lit: boolean; tone: string; reduce: boolean; play: boolean; pockets: Parameters<typeof toneFor>[0]; faded: boolean; focused: boolean; /** a neighbour of the tapped node */ shown: boolean; onFocus(id: string): void;
}) {
  const d = NODE[n.kind];
  const b = useSharedValue(1);
  const spin = useSharedValue(0);
  useEffect(() => {
    if (reduce || !play || (n.kind !== "brain" && n.kind !== "memory")) { cancelAnimation(b); cancelAnimation(spin); b.value = 1; return; }
    const slow = n.kind === "brain" ? 1400 : 900 + (n.id.length * 137) % 900;
    b.value = withRepeat(withSequence(withTiming(n.kind === "brain" ? 1.05 : 0.3, { duration: slow, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: slow, easing: Easing.inOut(Easing.quad) })), -1);
    if (n.kind === "brain") spin.value = withRepeat(withTiming(360, { duration: 9000, easing: Easing.linear }), -1);
    return () => { cancelAnimation(b); cancelAnimation(spin); };
  }, [reduce, play, n.kind, n.id, b, spin]);
  const style = useAnimatedStyle(() => (n.kind === "memory" ? { opacity: b.value } : { transform: [{ scale: b.value }] }));
  const ring = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  const x = n.x * size, y = n.y * size;
  const hit = Math.max(d, 44);
  // agents and sellers are always named; a pocket is named when a pulse or a tap is on it (seven names round a ring crowd it)
  const label = n.kind === "seller" || n.kind === "agent" || (n.kind === "pocket" && (lit || focused || shown)) ? n.label : "";
  const below = n.y >= 0.5;
  const body = n.kind === "brain" ? (
    <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: c.white, alignItems: "center", justifyContent: "center", borderWidth: lit ? 3 : 0, borderColor: tone === c.white ? c.blue : tone }}><BrandMark size={32} /></View>
  ) : n.kind === "agent" ? (
    <View style={{ borderRadius: d / 2 + 3, padding: 2, backgroundColor: lit ? tone : focused ? c.white : "rgba(255,255,255,0.4)" }}><AgentAvatar kind={n.ref ?? "chainbrain"} size={d - 4} /></View>
  ) : n.kind === "seller" ? (
    <View style={{ borderRadius: 9, padding: 1.5, backgroundColor: lit ? tone : focused ? c.white : "transparent" }}>
      {hasSellerMark(n.ref) ? <SellerMark id={n.ref!} size={d - 3} radius={8} /> : (
        <View style={{ width: d - 3, height: d - 3, borderRadius: 8, backgroundColor: "#2A2B30", alignItems: "center", justifyContent: "center" }}>
          <T v="tab" allowFontScaling={false} style={{ color: c.white, fontSize: 10, lineHeight: 12 }}>{initials(n.label)}</T>
        </View>
      )}
    </View>
  ) : n.kind === "pocket" ? (
    <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: faceOf(toneFor(pockets, n.ref ?? "")).face, borderWidth: lit || focused ? 2.5 : 1.5, borderColor: lit ? tone : focused ? c.white : "rgba(255,255,255,0.7)" }} />
  ) : <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: c.blue }} />;
  return (
    <View style={{ position: "absolute", left: x - hit / 2, top: y - hit / 2, width: hit, height: hit, alignItems: "center", justifyContent: "center", opacity: faded ? 0.2 : 1 }}>
      {n.kind === "brain" ? (
        <Animated.View pointerEvents="none" style={[{ position: "absolute", width: d + 22, height: d + 22, borderRadius: (d + 22) / 2, borderWidth: 1.5, borderColor: "rgba(157,202,255,0.55)", borderStyle: "dashed" }, ring]} />
      ) : null}
      {n.kind === "memory" ? <Animated.View pointerEvents="none" style={style}>{body}</Animated.View> : (
        <Press haptics="none" onPress={() => onFocus(n.id)} accessibilityRole="button" accessibilityLabel={`${n.kind === "brain" ? "ChainBrain" : n.label}, ${n.kind}. Shows what went through it`}
          style={{ width: hit, height: hit, alignItems: "center", justifyContent: "center" }}>
          <Animated.View style={n.kind === "brain" ? style : undefined}>{body}</Animated.View>
        </Press>
      )}
      {label ? (
        <View pointerEvents="none" style={{ position: "absolute", left: hit / 2 - 45, width: 90, alignItems: "center", ...(below ? { top: hit / 2 + d / 2 + 2 } : { bottom: hit / 2 + d / 2 + 2 }) }}>
          <T v="tab" allowFontScaling={false} numberOfLines={1} style={{ fontSize: 9, lineHeight: 11, letterSpacing: 0.2, textTransform: "none", color: lit || focused ? c.white : "rgba(255,255,255,0.5)" }}>{label}</T>
        </View>
      ) : null}
    </View>
  );
}

/** The pulse: a bright head with a glow, travelling the path one curved edge at a time, then a ring opens on the last node. */
function Spark({ pts, color }: { pts: { x: number; y: number }[]; color: string }) {
  const t = useSharedValue(0);
  const ring = useSharedValue(0);
  const n = pts.length - 1;
  const ax = pts.slice(0, -1).map((p) => p.x), ay = pts.slice(0, -1).map((p) => p.y), bx = pts.slice(1).map((p) => p.x), by = pts.slice(1).map((p) => p.y);
  const qs = pts.slice(1).map((p, k) => bend(pts[k], p));
  const qx = qs.map((q) => q.x), qy = qs.map((q) => q.y);
  useEffect(() => {
    t.value = withTiming(n, { duration: n * HOP, easing: Easing.inOut(Easing.quad) });
    ring.value = withSequence(withTiming(0, { duration: n * HOP }), withTiming(1, { duration: 560, easing: Easing.out(Easing.quad) }));
    return () => { cancelAnimation(t); cancelAnimation(ring); };
  }, [n, t, ring]);
  const at = (lag: number) => {
    "worklet";
    const v = Math.max(t.value - lag, 0);
    const k = Math.min(Math.floor(v), n - 1), s = v - k, u = 1 - s;
    return { x: u * u * ax[k] + 2 * u * s * qx[k] + s * s * bx[k], y: u * u * ay[k] + 2 * u * s * qy[k] + s * s * by[k] };
  };
  const head = useAnimatedStyle(() => { const p = at(0); return { opacity: t.value >= n ? 0 : 1, transform: [{ translateX: p.x - 11 }, { translateY: p.y - 11 }] }; });
  const tail1 = useAnimatedStyle(() => { const p = at(0.12); return { opacity: t.value >= n ? 0 : 0.55, transform: [{ translateX: p.x - 3 }, { translateY: p.y - 3 }] }; });
  const tail2 = useAnimatedStyle(() => { const p = at(0.24); return { opacity: t.value >= n ? 0 : 0.3, transform: [{ translateX: p.x - 2 }, { translateY: p.y - 2 }] }; });
  const open = useAnimatedStyle(() => ({ opacity: ring.value > 0 ? 1 - ring.value : 0, transform: [{ translateX: bx[n - 1] - 22 }, { translateY: by[n - 1] - 22 }, { scale: 0.5 + ring.value * 1.6 }] }));
  return (
    <>
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: 4, height: 4, borderRadius: 2, backgroundColor: color }, tail2]} />
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: 6, height: 6, borderRadius: 3, backgroundColor: color }, tail1]} />
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: color === c.white ? "rgba(255,255,255,0.22)" : color === c.vermillion ? "rgba(240,78,35,0.3)" : "rgba(157,202,255,0.3)" }, head]}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: color }, open]} />
    </>
  );
}
