// The Brain tab: ChainBrain at work, as a living graph. The brain in the middle, the agents round it, their pockets and the
// sellers those pockets may pay further out, and what it remembers as small lights round the centre (lib/brainGraph.ts).
// Edges curve and thicken with the payments that crossed them in the last two weeks, and that traffic flows along them.
// Each thing the agents did travels the graph as a pulse along the edges it touched, with its line underneath, and "How it
// decided" rebuilds that decision stage by stage from its own events (lib/brainTrace.ts): the quote, the pocket's on-chain
// rules, Radar, you, pre-flight, the settlement, the Sentinel, memory. (The judges' "Run a test" lives on the console.)
// Tap a node to see its neighbourhood. Every node, number and pulse is a real agent, pocket, seller, memory item or event.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, FadeOut, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { router, useIsFocused } from "expo-router";
import { useApp } from "../../store";
import { c, radius } from "../../tokens";
import { haptic } from "../../haptics";
import { Screen, PageTitle } from "../../ui/Screen";
import { Press } from "../../ui/kit";
import { T } from "../../ui/Text";
import { Icon, type IconName } from "../../ui/Icon";
import { AgentAvatar } from "../../ui/AgentAvatar";
import { SellerMark, hasSellerMark } from "../../ui/SellerMark";
import { Rise } from "../../ui/Rise";
import { useReduceMotion } from "../../ui/motion";
import { cleanText } from "../../lib/sanitize";
import { curSign } from "../../lib/runtime";
import { initials } from "../../components/ActivityRow";
import { faceOf, toneFor } from "../../components/PocketFace";
import { brainGraph, pulsesOf, trafficOf, type Pulse } from "../../lib/brainGraph";
import { FocusPanel, Graph, HOP, TONE } from "../../components/BrainGraphView";
import { traceOf, type Stage, type StageState, type Trace } from "../../lib/brainTrace";
import { MEMORY_KIND, type MemoryItem } from "../../lib/brain";
import * as api from "../../lib/api";
import { agentInfo } from "../../../../shared/sim/agents";

const KIND_ICON: Record<MemoryItem["kind"], IconName> = { preference: "target", open_task: "clock", seller_note: "shield", fact: "file" };
/** A remembered purchase (shared/sim/reflect.ts): Bought "<item>" from <seller> for <amount>[, co-signed by the owner]. */
const BOUGHT = /^Bought "(.+)" from (.+) for ((?:[A-Z]{2}\$)?[\d.]+)(, co-signed by the owner)?$/;
const STAGE_ICON: Record<Stage["key"], IconName> = { task: "file", quote: "receipt", rules: "lock", radar: "radar", owner: "faceId", preflight: "gauge", settle: "link", sentinel: "eye", memory: "brain" };
/** How long a pulse takes per edge, and the pause before the next. */
const REST = 1300;
const ago = (at: number, now: number) => { const m = Math.round((now - at) / 60_000); return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };
const DIM = "rgba(255,255,255,0.55)";
const cap1 = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);


export default function BrainTab() {
  const { pockets, events, sellerName, findPocket, setActive, cfg } = useApp();
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


  // the pulse on show: the newest ones in turn, and anything new as it happens
  const recent = pulses.slice(0, 12);
  const [i, setI] = useState(0);
  const newest = useRef(pulses[0]?.key);
  useEffect(() => {
    if (pulses[0] && pulses[0].key !== newest.current) { newest.current = pulses[0].key; setI(0); haptic.light(); }
  }, [pulses]); // eslint-disable-line react-hooks/exhaustive-deps
  const [focus, setFocus] = useState<string | null>(null);
  const cur: Pulse | undefined = recent[i % Math.max(recent.length, 1)];
  useEffect(() => {
    if (!focused || recent.length < 2 || focus) return;
    const wait = reduce ? 3600 : (cur?.path.length ?? 2) * HOP + REST;
    const t = setTimeout(() => setI((n) => (n + 1) % recent.length), wait);
    return () => clearTimeout(t);
  }, [i, focused, recent.length, reduce, cur?.key, focus]); // eslint-disable-line react-hooks/exhaustive-deps

  // the decision behind what is on show, from the pulse's own events
  const trace: Trace | null = useMemo(() => {
    if (!cur?.pocket) return null;
    if (cur.kind === "memory") {
      // a memory update: the decision it learned from, the last payment or refusal in that pocket before it
      const d = [...events].reverse().find((e) => e.at <= cur.at && (e.type === "payment" || e.type === "refusal") && String(e.pocket).toLowerCase() === cur.pocket!.toLowerCase());
      return d ? traceOf(events, { pocket: cur.pocket, sellerId: d.sellerId, at: d.at, tx: d.type === "payment" ? d.tx : undefined }, name) : null;
    }
    if (cur.kind !== "paid" && cur.kind !== "cosigned" && cur.kind !== "refused") return null;
    return traceOf(events, { pocket: cur.pocket, sellerId: cur.sellerId, at: cur.at, tx: cur.tx }, name);
  }, [events, cur?.key]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <View style={{ borderRadius: radius.card, backgroundColor: c.ink, overflow: "hidden", alignItems: "center" }}>
          <Hud live={focused} agents={agents} pockets={live.length} sellers={sellers} reduce={reduce} onExpand={() => router.push("/brain-map")} />
          <View style={{ width: size, height: size }} accessible accessibilityLabel={`ChainBrain's graph: ${agents} agents, ${live.length} cards, ${sellers} sellers, ${memory.length} things remembered.${cur ? ` Latest: ${cur.text}, ${ago(cur.at, Date.now())}.` : ""}`}>
            <Graph nodes={graph.nodes} edges={graph.edges} byId={byId} size={size} pulse={cur} reduce={reduce} play={focused} pockets={pockets} focus={focus} onFocus={(id) => { haptic.select(); setFocus((f) => (f === id ? null : id)); }} />
          </View>
          {focus ? <FocusPanel id={focus} byId={byId} edges={graph.edges} events={events} pockets={live} onOpen={open} onClose={() => setFocus(null)} /> : <Caption pulse={cur} />}
        </View>
      </Rise>

      {/* how the decision on show was made, stage by stage */}
      {trace ? <Pipeline trace={trace} reduce={reduce} title="How it decided" /> : null}

      {/* what it did, in four numbers */}
      <Rise dy={10} delay={60} style={{ flexDirection: "row", gap: 8, marginHorizontal: 16, marginTop: 10 }}>
        <Stat icon="eye" n={paid + watched} label="Watched" a11y={`Watched ${paid} payments and ${watched} price checks`} />
        <Stat icon="shieldCheck" n={stopped} label="Stopped" a11y={`Stopped ${stopped} refused payments and ignored orders`} tone={stopped ? c.vermillion : undefined} />
        <Stat icon="brain" n={memory.length} label="Learned" a11y={`Remembers ${memory.length} things`} tone={memory.length ? c.blue : undefined} />
        <Stat icon="radar" n={sellers} label="Sellers" a11y={`Knows ${sellers} sellers`} />
      </Rise>
      {/* what it has learned from you */}
      <Rise dy={10} delay={120} style={{ marginHorizontal: 16, marginTop: 22 }}>
        <T v="section">Learned with you</T>
        <View style={{ marginTop: 10, gap: 8 }}>
          {memory.slice(0, 3).map((m) => {
            const p = findPocket(m.pocket);
            // a purchase reads as the seller's own logo, what was bought and the price; anything else as a plain icon for its kind
            const buy = BOUGHT.exec(m.text);
            const sellerId = buy ? cfg?.sellers.find((x) => x.name === buy[2])?.id : undefined;
            const title = buy ? buy[1] : cleanText(m.text, 90);
            const sub = [buy ? `${buy[2]} · ${buy[3].includes("$") ? buy[3] : `${curSign()}${buy[3]}`}` : MEMORY_KIND[m.kind], p ? cleanText(p.name, 24) : undefined].filter(Boolean).join(" · ");
            return (
              <Press key={`${m.pocket}:${m.id}`} kind="row" haptics="select" onPress={() => open(m.pocket)} accessibilityRole="button" accessibilityLabel={`${MEMORY_KIND[m.kind]}: ${m.text}. ${p ? cleanText(p.name, 24) : ""}. Opens this card's brain`}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.tile, backgroundColor: c.card }}>
                {sellerId && hasSellerMark(sellerId) ? <SellerMark id={sellerId} size={36} radius={10} />
                  : buy ? <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.fill, alignItems: "center", justifyContent: "center" }}><T v="cap" w="bold">{initials(buy[2])}</T></View>
                  : <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.fill, alignItems: "center", justifyContent: "center" }}><Icon name={KIND_ICON[m.kind]} size={16} color={c.ink2} stroke={2} /></View>}
                <View style={{ flex: 1 }}>
                  <T v="row" w="semi" numberOfLines={1}>{title}</T>
                  <T v="cap" color="muted" numberOfLines={1}>{sub}</T>
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
        <T v="section">Each card</T>
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

/** The graph's header strip: live, and what it is watching. */
function Hud({ live, agents, pockets, sellers, reduce, onExpand }: { live: boolean; agents: number; pockets: number; sellers: number; reduce: boolean; onExpand(): void }) {
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
        <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.green }, dot]} />
        <T v="tab" style={{ color: c.white, letterSpacing: 1.2, textTransform: "uppercase" }}>Live</T>
      </View>
      <T v="tab" style={{ color: DIM, letterSpacing: 1, textTransform: "uppercase", fontVariant: ["tabular-nums"], flexShrink: 1 }} numberOfLines={1}>{`${agents} agents · ${pockets} cards`}</T>
      <Press kind="round" haptics="select" onPress={onExpand} accessibilityRole="button" accessibilityLabel="Open the full Brain map" hitSlop={8}
        style={{ height: 30, paddingHorizontal: 10, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.12)", flexDirection: "row", alignItems: "center", gap: 5 }}>
        <T v="tab" w="bold" style={{ color: c.white, textTransform: "none", letterSpacing: 0.2 }}>Expand</T>
        <Icon name="arrowUpRight" size={12} color={c.white} stroke={2.4} />
      </Press>
    </View>
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
