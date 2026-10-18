// The Brain tab: ChainBrain at work, as a living graph. The brain in the middle, the agents round it, their pockets and the
// sellers those pockets may pay further out, and what it remembers as small lights round the centre (lib/brainGraph.ts).
// Edges curve and thicken with the payments that crossed them in the last two weeks, and that traffic flows along them.
// Each thing the agents did travels the graph as a pulse along the edges it touched, with its line underneath, and "How it
// decided" rebuilds that decision stage by stage from its own events (lib/brainTrace.ts): the quote, the pocket's on-chain
// rules, Radar, you, pre-flight, the settlement, the Sentinel, memory. "Run a test" sends one real payment (or one the rules
// must refuse) through those same stages on the built-in network, and the graph and the stages light as it happens.
// Tap a node to see its neighbourhood. Every node, number and pulse is a real agent, pocket, seller, memory item or event.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, View, useWindowDimensions } from "react-native";
import Animated, { Easing, FadeIn, FadeOut, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from "react-native-svg";
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
import { usd } from "../../lib/util";
import { initials } from "../../components/ActivityRow";
import { faceOf, toneFor } from "../../components/PocketFace";
import { RING, brainGraph, pulsesOf, trafficOf, type GEdge, type GNode, type Pulse, type PulseTone } from "../../lib/brainGraph";
import { liveTraceOf, traceOf, type Stage, type StageState, type Trace } from "../../lib/brainTrace";
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
const STAGE_ICON: Record<Stage["key"], IconName> = { task: "file", quote: "receipt", rules: "lock", radar: "radar", owner: "faceId", preflight: "gauge", settle: "link", sentinel: "eye", memory: "brain" };
/** How long a pulse takes per edge, and the pause before the next. */
const HOP = 520, REST = 1300;
const ago = (at: number, now: number) => { const m = Math.round((now - at) / 60_000); return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };
const DIM = "rgba(255,255,255,0.55)";
const cap1 = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** A curve between two nodes: a quadratic bend to one side, so the graph swirls instead of crossing in straight lines. */
const bend = (a: { x: number; y: number }, b: { x: number; y: number }) => { const k = 0.16; return { x: (a.x + b.x) / 2 - (b.y - a.y) * k, y: (a.y + b.y) / 2 + (b.x - a.x) * k }; };

export default function BrainTab() {
  const { pockets, events, sellerName, findPocket, setActive } = useApp();
  const { width } = useWindowDimensions();
  const size = Math.min(width - 32, 520) - 16;
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
  const payN = useMemo(() => events.filter((e) => e.type === "payment").length, [events]);
  const traffic = useMemo(() => trafficOf(events), [payN]); // eslint-disable-line react-hooks/exhaustive-deps
  const graph = useMemo(() => brainGraph({
    pockets: live.map((p) => ({ address: p.address, agentId: p.agentId, allowed: p.allowed, name: cleanText(p.name, 20), layout: p.app?.layout })),
    agentName, sellerName: name, memory: memory.length, traffic,
  }), [live, agentName, name, memory.length, traffic]);
  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);

  const decisionN = useMemo(() => events.filter((e) => ["payment", "refusal", "forced", "routine", "attack", "quote", "sentinel", "trace"].includes(e.type)).length, [events]);
  const pulses = useMemo(() => pulsesOf(events, { agentOf: (p) => findPocket(p ?? "")?.agentId ?? "chainbrain", sellerName: name, agentName })
    .map((p) => ({ ...p, path: p.path.filter((n) => byId.has(n)) })).filter((p) => p.path.length >= 2), [decisionN, byId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- the test: one real payment (or a refusal) through every stage, watched live
  const testable = useMemo(() => live.filter((p) => api.testPlan(p.address, "pay") && api.testPlan(p.address, "refuse")), [live]);
  const [testPocket, setTestPocket] = useState<string>();
  const tp = testable.find((p) => p.address === testPocket) ?? testable[0];
  const [test, setTest] = useState<{ pocket: string; since: number; mode: api.TestMode; done?: boolean } | null>(null);
  const [holdUntil, setHoldUntil] = useState(0);
  const [focus, setFocus] = useState<string | null>(null);
  const run = async (mode: api.TestMode) => {
    if (!tp || (test && !test.done)) return;
    haptic.medium();
    setFocus(null);
    // the network's own clock: the test is everything after the last event so far
    const since = events.reduce((m, e) => Math.max(m, e.at), 0) + 1;
    setTest({ pocket: tp.address, since, mode });
    const r = await api.runTest(tp.address as `0x${string}`, mode).catch(() => ({ ok: false as const, reason: "ERROR" }));
    if (r.ok) haptic.success(); else haptic.warning();
    setTest({ pocket: tp.address, since, mode, done: true });
    setHoldUntil(Date.now() + 9000);
    setTimeout(() => setTest((t) => (t && t.since === since ? null : t)), 9000);
  };

  // the pulse on show: the newest ones in turn, anything new as it happens, held on a test's result for a while
  const recent = pulses.slice(0, 12);
  const [i, setI] = useState(0);
  const newest = useRef(pulses[0]?.key);
  useEffect(() => {
    if (pulses[0] && pulses[0].key !== newest.current) { newest.current = pulses[0].key; setI(0); if (!test) haptic.light(); }
  }, [pulses]); // eslint-disable-line react-hooks/exhaustive-deps
  const running = !!test && !test.done;
  const cur: Pulse | undefined = running ? undefined : recent[i % Math.max(recent.length, 1)];
  useEffect(() => {
    if (!focused || recent.length < 2 || focus || running) return;
    const wait = Math.max(holdUntil - Date.now(), reduce ? 3600 : (cur?.path.length ?? 2) * HOP + REST);
    const t = setTimeout(() => setI((n) => (n + 1) % recent.length), wait);
    return () => clearTimeout(t);
  }, [i, focused, recent.length, reduce, cur?.key, focus, running, holdUntil]); // eslint-disable-line react-hooks/exhaustive-deps

  // the decision behind what is on show: the live test, or the pulse's own events
  const trace: Trace | null = useMemo(() => {
    if (running && test) return liveTraceOf(events, test.pocket, test.since, name);
    if (!cur?.pocket) return null;
    if (cur.kind === "memory") {
      // a memory update: the decision it learned from, the last payment or refusal in that pocket before it
      const d = [...events].reverse().find((e) => e.at <= cur.at && (e.type === "payment" || e.type === "refusal") && String(e.pocket).toLowerCase() === cur.pocket!.toLowerCase());
      return d ? traceOf(events, { pocket: cur.pocket, sellerId: d.sellerId, at: d.at, tx: d.type === "payment" ? d.tx : undefined }, name) : null;
    }
    if (cur.kind !== "paid" && cur.kind !== "cosigned" && cur.kind !== "refused") return null;
    return traceOf(events, { pocket: cur.pocket, sellerId: cur.sellerId, at: cur.at, tx: cur.tx }, name);
  }, [running, test, events, cur?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  // while a test runs, its path lights as far as it has got
  const testPath = useMemo(() => {
    if (!running || !test) return undefined;
    const pk = `pocket:${test.pocket.toLowerCase()}`;
    const agent = `agent:${findPocket(test.pocket)?.agentId ?? "chainbrain"}`;
    return ["brain", agent, pk, ...(trace?.sellerId && byId.has(`seller:${trace.sellerId}`) ? [`seller:${trace.sellerId}`] : [])];
  }, [running, test, trace?.sellerId, byId, findPocket]);

  const paid = pulses.filter((p) => p.tone === "paid").length;
  const stopped = pulses.filter((p) => p.tone === "refused" || p.tone === "guard").length;
  const watched = pulses.filter((p) => p.tone === "watched").length;
  const sellers = graph.nodes.filter((n) => n.kind === "seller").length;
  const agents = graph.nodes.filter((n) => n.kind === "agent").length;
  const open = (address: string) => { setActive(address); router.push("/pocket-brain"); };
  const plan = tp ? { pay: api.testPlan(tp.address, "pay"), refuse: api.testPlan(tp.address, "refuse") } : null;

  return (
    <Screen>
      <PageTitle title="Brain" sub="Watches every payment your agents make, and learns with you" />
      <Rise dy={10} style={{ marginHorizontal: 16, marginTop: 8 }}>
        <View style={{ borderRadius: radius.card, backgroundColor: c.ink, overflow: "hidden", alignItems: "center" }}>
          <Hud live={focused} agents={agents} pockets={live.length} sellers={sellers} running={running} reduce={reduce} />
          <View style={{ width: size, height: size }} accessible accessibilityLabel={`ChainBrain's graph: ${agents} agents, ${live.length} pockets, ${sellers} sellers, ${memory.length} things remembered.${cur ? ` Latest: ${cur.text}, ${ago(cur.at, Date.now())}.` : ""}`}>
            <Graph nodes={graph.nodes} edges={graph.edges} byId={byId} size={size} pulse={cur} lit={testPath} reduce={reduce} play={focused} pockets={pockets} focus={focus} onFocus={(id) => { haptic.select(); setFocus((f) => (f === id ? null : id)); }} />
          </View>
          {focus ? <FocusPanel id={focus} byId={byId} edges={graph.edges} events={events} pockets={live} onOpen={open} onClose={() => setFocus(null)} /> : <Caption pulse={cur} running={running} trace={trace} />}
        </View>
      </Rise>

      {/* run a real test through every stage */}
      {plan?.pay && plan.refuse ? (
        <Rise dy={10} delay={40} style={{ marginHorizontal: 16, marginTop: 10, padding: 14, borderRadius: radius.card, backgroundColor: c.card, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <T v="row" w="bold">Run a test</T>
              <T v="cap" color="muted" numberOfLines={1}>Real, on the test network · watch every stage</T>
            </View>
            {testable.length > 1 ? (
              <Press haptics="select" disabled={running} onPress={() => { const k = testable.findIndex((p) => p.address === tp!.address); setTestPocket(testable[(k + 1) % testable.length].address); }}
                accessibilityRole="button" accessibilityLabel={`Test pocket: ${tp!.name}. Change`}
                style={{ minHeight: 36, flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 4, paddingRight: 10, borderRadius: 18, backgroundColor: c.fill }}>
                <AgentAvatar kind={tp!.agentId ?? "chainbrain"} size={26} />
                <T v="cap" w="semi" numberOfLines={1} style={{ maxWidth: 110 }}>{cleanText(tp!.name, 18)}</T>
                <Icon name="refresh" size={12} color={c.ink2} stroke={2.2} />
              </Press>
            ) : null}
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TestButton dark busy={running && test?.mode === "pay"} disabled={running} onPress={() => void run("pay")} title={`Pay ${plan.pay.seller}`} sub={`US$${plan.pay.price} · on its list`}
              a11y={`Test a payment: pay ${plan.pay.seller} US$${plan.pay.price} from ${tp!.name}, for real on the test network`} />
            <TestButton busy={running && test?.mode === "refuse"} disabled={running} onPress={() => void run("refuse")} title={`Try ${plan.refuse.seller}`} sub="Not on its list"
              a11y={`Test a refusal: try to pay ${plan.refuse.seller}, which is not on ${tp!.name}'s list. Its rules must refuse it`} />
          </View>
        </Rise>
      ) : null}

      {/* how the decision on show was made, stage by stage */}
      {trace ? <Pipeline trace={trace} reduce={reduce} title={running ? "Deciding now" : "How it decided"} /> : null}

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

/** The graph's header strip: live (or testing), and what it is watching. */
function Hud({ live, agents, pockets, sellers, running, reduce }: { live: boolean; agents: number; pockets: number; sellers: number; running: boolean; reduce: boolean }) {
  const o = useSharedValue(1);
  useEffect(() => {
    if (reduce || !live) { cancelAnimation(o); o.value = 1; return; }
    o.value = withRepeat(withSequence(withTiming(0.25, { duration: 700 }), withTiming(1, { duration: 700 })), -1);
    return () => cancelAnimation(o);
  }, [live, reduce, o]);
  const dot = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <View style={{ alignSelf: "stretch", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 2 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 24, paddingHorizontal: 9, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)" }}>
        <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: running ? c.blue : c.green }, dot]} />
        <T v="tab" style={{ color: c.white, letterSpacing: 1.2, textTransform: "uppercase" }}>{running ? "Testing" : "Live"}</T>
      </View>
      <T v="tab" style={{ color: DIM, letterSpacing: 1, textTransform: "uppercase", fontVariant: ["tabular-nums"], flexShrink: 1 }} numberOfLines={1}>{`${agents} agents · ${pockets} pockets · ${sellers} sellers`}</T>
    </View>
  );
}

function TestButton({ title, sub, onPress, busy, disabled, dark, a11y }: { title: string; sub: string; onPress(): void; busy?: boolean; disabled?: boolean; dark?: boolean; a11y: string }) {
  const fg = dark ? c.white : c.ink;
  return (
    <Press haptics="none" onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={a11y} accessibilityState={{ disabled, busy }}
      style={{ flex: 1, minHeight: 56, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.tile, backgroundColor: dark ? c.ink : c.card, borderWidth: dark ? 0 : 1.5, borderColor: c.vermillion, opacity: disabled && !busy ? 0.45 : 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
      {busy ? <ActivityIndicator size="small" color={fg} /> : <Icon name={dark ? "play" : "ban"} size={16} color={dark ? c.white : c.vermillion} stroke={2.4} />}
      <View style={{ flex: 1 }}>
        <T v="row" w="bold" numberOfLines={1} style={{ color: fg }}>{busy ? "Running…" : title}</T>
        <T v="cap" numberOfLines={1} style={{ color: dark ? DIM : c.muted }}>{sub}</T>
      </View>
    </Press>
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

/** The line under the graph: who did what, and when; while a test runs, the stage it is at. */
function Caption({ pulse, running, trace }: { pulse?: Pulse; running: boolean; trace: Trace | null }) {
  const now = Date.now();
  const at = trace?.stages.filter((s) => s.state !== "wait").at(-1);
  return (
    <View style={{ alignSelf: "stretch", height: 64, justifyContent: "center", paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" }}>
      {running ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <ActivityIndicator size="small" color={c.blue} />
          <T v="row" w="semi" numberOfLines={1} style={{ color: c.white, flex: 1 }}>{at ? `${at.label}: ${at.value}` : "Starting the test…"}</T>
        </View>
      ) : pulse ? (
        <Animated.View key={pulse.key} entering={FadeIn.duration(240)} exiting={FadeOut.duration(160)} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <AgentAvatar kind={pulse.agent ?? "chainbrain"} size={30} />
          <View style={{ flex: 1 }}>
            <T v="row" w="semi" numberOfLines={1} style={{ color: c.white }}>{pulse.text}</T>
            <T v="cap" numberOfLines={1} style={{ color: DIM }}>{ago(pulse.at, now)}</T>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.1)" }}>
            <Icon name={TONE[pulse.tone].icon} size={12} color={TONE[pulse.tone].color} stroke={2.4} />
            <T v="cap" w="bold" style={{ color: TONE[pulse.tone].color }}>{TONE[pulse.tone].word}</T>
          </View>
        </Animated.View>
      ) : <T v="cap" style={{ color: DIM, textAlign: "center" }}>Waiting for your agents' first move</T>}
    </View>
  );
}

/** A tapped node: what it is and what went through it, from the same events. */
function FocusPanel({ id, byId, edges, events, pockets, onOpen, onClose }: {
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
    sub = `${p ? `${usd(p.balance)} USDC left · ` : ""}${pays.length} paid · ${refused} refused in 14 days`;
    action = { label: "Its brain", go: () => onOpen(n.ref!) };
  } else if (n.kind === "seller") {
    const pays = recent.filter((e) => e.type === "payment" && e.sellerId === n.ref);
    const r = [...events].reverse().find((e) => e.type === "radar" && e.sellerId === n.ref);
    const from = edges.filter((e) => e.to === id).length;
    sub = `${pays.length} paid from your pockets · ${from} ${from === 1 ? "pocket may" : "pockets may"} pay it${r ? ` · Radar ${Number(r.score) || 0}/10` : ""}`;
  } else if (n.kind === "agent") {
    const held = edges.filter((e) => e.from === id).length;
    const mine = new Set(edges.filter((e) => e.from === id).map((e) => byId.get(e.to)?.ref?.toLowerCase()));
    const pays = recent.filter((e) => e.type === "payment" && mine.has(String(e.pocket).toLowerCase())).length;
    sub = `Holds ${held} ${held === 1 ? "pocket" : "pockets"} · ${pays} payments in 14 days`;
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

const STATE_LOOK: Record<StageState, { bg: string; fg: string; icon?: IconName; line: string }> = {
  ok: { bg: c.ink, fg: c.white, icon: "check", line: c.ink },
  stop: { bg: c.vermillion, fg: c.white, icon: "ban", line: c.line },
  info: { bg: c.blue, fg: c.ink, line: c.ink },
  skip: { bg: c.fill, fg: c.faint, line: c.line },
  wait: { bg: c.fill, fg: c.muted, line: c.line },
};

/** "How it decided": the stages as a pipeline, each lit by its own event; a stop says so, and what follows was never reached. */
function Pipeline({ trace, reduce, title }: { trace: Trace; reduce: boolean; title: string }) {
  const key = `${trace.pocket}:${trace.at}`;
  const outcome = trace.outcome === "paid" ? { text: "Paid", bg: c.ink, fg: c.white } : trace.outcome === "refused" ? { text: "Refused", bg: c.vermillionSoft, fg: c.vermillionInk } : { text: "Running", bg: c.blueSoft, fg: c.blueInk };
  return (
    <Rise dy={10} delay={60} style={{ marginHorizontal: 16, marginTop: 10, padding: 16, borderRadius: radius.card, backgroundColor: c.card }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <T v="head">{title}</T>
        <View style={{ height: 24, paddingHorizontal: 10, borderRadius: 12, backgroundColor: outcome.bg, justifyContent: "center" }}><T v="cap" w="bold" style={{ color: outcome.fg }}>{outcome.text}</T></View>
      </View>
      <View key={key}>
        {trace.stages.map((s, k) => {
          // every stage shows what its own event said: a refused payment still went through Radar and pre-flight before the
          // contract refused it at settlement. A stage with no event is "—".
          const look = STATE_LOOK[s.state];
          const last = k === trace.stages.length - 1;
          return (
            <Animated.View key={s.key} entering={reduce ? undefined : FadeIn.delay(k * 70).duration(200)} style={{ flexDirection: "row", gap: 12, minHeight: 40 }}
              accessible accessibilityLabel={`${s.label}: ${s.value}${s.state === "stop" ? ". Stopped here" : ""}`}>
              <View style={{ width: 26, alignItems: "center" }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: look.bg, alignItems: "center", justifyContent: "center" }}>
                  {s.state === "wait" ? <ActivityIndicator size="small" color={c.muted} style={{ transform: [{ scale: 0.6 }] }} /> : <Icon name={look.icon ?? STAGE_ICON[s.key]} size={12} color={look.fg} stroke={2.4} />}
                </View>
                {!last ? <View style={{ flex: 1, width: 2, marginVertical: 2, borderRadius: 1, backgroundColor: look.line }} /> : null}
              </View>
              <View style={{ flex: 1, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8, paddingTop: 3, paddingBottom: 8 }}>
                <T v="row" w="semi" style={{ color: s.state === "skip" ? c.muted : c.ink }}>{s.label}</T>
                <T v="cap" numberOfLines={2} style={{ flexShrink: 1, textAlign: "right", color: s.state === "stop" ? c.vermillionInk : s.state === "skip" || s.state === "wait" ? c.faint : c.ink2, fontWeight: s.state === "stop" ? "700" : "500" }}>{cap1(s.value)}</T>
              </View>
            </Animated.View>
          );
        })}
      </View>
    </Rise>
  );
}

const NODE = { brain: 60, agent: 34, pocket: 18, seller: 28, memory: 7 };

const Graph = React.memo(function Graph({ nodes, edges, byId, size, pulse, lit, reduce, play, pockets, focus, onFocus }: {
  nodes: GNode[]; edges: GEdge[]; byId: Map<string, GNode>; size: number; pulse?: Pulse; lit?: string[]; reduce: boolean; play: boolean;
  pockets: Parameters<typeof toneFor>[0]; focus: string | null; onFocus(id: string): void;
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
      {nodes.map((n) => <Node key={n.id} n={n} size={size} lit={on.has(n.id)} tone={tone} reduce={reduce} play={play} pockets={pockets} faded={!!near && !near.has(n.id)} focused={focus === n.id} shown={!!near?.has(n.id)} onFocus={onFocus} />)}
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
