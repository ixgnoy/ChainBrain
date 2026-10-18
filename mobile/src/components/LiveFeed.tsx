// Activity's Live view: what the agents are doing and deciding, now. A pinned line says who is doing what (or what comes next), the
// requests waiting for you sit on top, then one stream of decision cards, newest first: paid, refused by the contract, a
// seller's text that tried to give orders (quoted, struck through, ignored), a chat attack refused, the Sentinel freezing a
// pocket, a price watch that checked and waited. Filter by agent. Tap a card for the why: the rule, the quote, the
// transaction, and the way to its receipt. The Ledger view is the full record; this is the narrated slice of it (lib/live.ts).
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { router } from "expo-router";
import { useApp } from "../store";
import { c, radius } from "../tokens";
import { haptic } from "../haptics";
import { Press } from "../ui/kit";
import { T } from "../ui/Text";
import { Icon, type IconName } from "../ui/Icon";
import { AgentAvatar } from "../ui/AgentAvatar";
import { SellerMark, hasSellerMark } from "../ui/SellerMark";
import { useReduceMotion } from "../ui/motion";
import { cleanText } from "../lib/sanitize";
import { liveCards, nowLine, type LiveCard, type LiveKind } from "../lib/live";
import { agentInfo } from "../../../shared/sim/agents";
import * as api from "../lib/api";
import { curSign } from "../lib/runtime";

const LOOK: Record<LiveKind, { edge: string; icon: IconName; tone: string; bg: string; label: string }> = {
  paid: { edge: c.ink, icon: "check", tone: c.ink, bg: c.card, label: "Paid" },
  cosigned: { edge: c.blue, icon: "faceId", tone: c.blueInk, bg: c.card, label: "Co-signed" },
  refused: { edge: c.vermillion, icon: "ban", tone: c.vermillionInk, bg: c.card, label: "Refused" },
  ignored: { edge: c.vermillion, icon: "shieldCheck", tone: c.vermillionInk, bg: c.card, label: "Ignored" },
  attack: { edge: c.vermillion, icon: "shield", tone: c.vermillionInk, bg: c.card, label: "Refused" },
  freeze: { edge: c.ink, icon: "freeze", tone: c.white, bg: c.ink, label: "Frozen" },
  watched: { edge: c.line, icon: "eye", tone: c.ink2, bg: c.card, label: "Waited" },
  run: { edge: c.line, icon: "clock", tone: c.ink2, bg: c.card, label: "Ran" },
};
const ago = (at: number, now: number) => { const m = Math.round((now - at) / 60_000); return m < 1 ? "now" : m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`; };

export function LiveFeed({ onLedger }: { /** no ledger row for a card: show the Ledger view */ onLedger(): void }) {
  const { events, pockets, pending, sellerName, chatBusy, findPocket, ledger, setReceipt, openApproval } = useApp();
  const [agent, setAgent] = useState<string>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [more, setMore] = useState(12);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  const agentOf = (p?: string) => findPocket(p ?? "")?.agentId ?? "chainbrain";
  const decisionN = useMemo(() => events.filter((e) => ["payment", "refusal", "forced", "routine", "attack", "quote", "sentinel", "trace"].includes(e.type)).length, [events]);
  const cards = useMemo(() => liveCards(events, { agentOf, sellerName: (id) => cleanText(sellerName(id), 24), now }), [decisionN]); // eslint-disable-line react-hooks/exhaustive-deps
  const agents = useMemo(() => ["all", ...new Set(cards.map((x) => x.agent ?? "chainbrain"))], [cards]);
  const filtered = agent === "all" ? cards : cards.filter((x) => (x.agent ?? "chainbrain") === agent);
  const shown = filtered.slice(0, more);
  const asks = pending.filter((a) => a.kind !== "question");
  // the now line
  const routines = pockets.filter((p) => !p.revoked).map((p) => ({ p, rt: api.routineOf(p.address) })).filter((x) => x.rt && x.rt.status === "active");
  const next = routines.sort((a, b) => a.rt!.nextAt - b.rt!.nextAt)[0];
  const running = events.filter((e) => e.type === "routine" && (e.kind === "run-start" || e.kind === "run")).reduce((m, e) => m.set(String(e.pocket), e.kind), new Map<string, string>());
  const runningNow = [...running.entries()].filter(([, k]) => k === "run-start").map(([pk]) => ({ agent: agentOf(pk), pocket: cleanText(findPocket(pk)?.name ?? "a pocket", 24) }));
  const line = nowLine({
    asks: asks.map((a) => ({ agent: a.agent, amount: a.data?.amount ? `${curSign()}${cleanText(String(a.data.amount), 10)}` : undefined })),
    busy: chatBusy, running: runningNow, watching: pockets.filter((p) => !p.revoked).length,
    next: next ? { name: cleanText(next.p.name, 20), when: new Date(next.rt!.nextAt).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" }) } : undefined,
    agentName: (id) => agentInfo(id ?? "chainbrain")?.name ?? "ChainBrain",
  });
  // a refusal or an ignored order that arrives while you watch: one warning tick
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!seen.current) { seen.current = new Set(cards.map((x) => x.key)); return; }
    const fresh = cards.filter((x) => !seen.current!.has(x.key));
    if (fresh.some((x) => x.kind === "refused" || x.kind === "ignored" || x.kind === "attack" || x.kind === "freeze")) haptic.warning();
    else if (fresh.length) haptic.light();
    fresh.forEach((x) => seen.current!.add(x.key));
  }, [cards]);
  const receipt = (x: LiveCard) => {
    const row = ledger.find((r) => (x.tx && r.tx === x.tx) || (r.at === x.at && r.pocket?.toLowerCase() === x.pocket?.toLowerCase()));
    if (row) setReceipt(row); else onLedger();
  };
  return (
    <>
      <NowLine agent={line.agent} tone={line.tone} text={line.text} />
      {/* waiting for you, on top */}
      {asks.map((a) => (
        <Animated.View key={a.id} entering={FadeInDown.duration(220)} style={{ marginHorizontal: 16, marginTop: 10 }}>
          <Press kind="row" haptics="medium" onPress={() => openApproval(a.id)} accessibilityRole="button" accessibilityLabel={`${agentInfo(a.agent ?? "")?.name ?? "Your agent"} asks you to co-sign ${curSign()}${a.data?.amount ?? ""}. Opens the cheque`}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.card, backgroundColor: c.blue }}>
            <AgentAvatar kind={a.agent ?? "chainbrain"} size={36} badge={c.vermillion} />
            <View style={{ flex: 1 }}>
              <T v="row" w="bold" numberOfLines={1}>{`Needs you · ${curSign()}${cleanText(String(a.data?.amount ?? ""), 10)}`}</T>
              <T v="cap" color="ink2" numberOfLines={1}>{`To ${cleanText(sellerName(a.data?.sellerId), 24)} · above its limit`}</T>
            </View>
            <View style={{ height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: c.ink, justifyContent: "center" }}><T v="cap" w="bold" style={{ color: c.white }}>Review</T></View>
          </Press>
        </Animated.View>
      ))}
      {/* filter by agent */}
      {agents.length > 2 ? (
        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, marginTop: 16 }}>
          {agents.map((id) => (
            <Press key={id} haptics="select" onPress={() => setAgent(id)} accessibilityRole="button" accessibilityState={{ selected: agent === id }} accessibilityLabel={id === "all" ? "All agents" : agentInfo(id)?.name ?? id}
              style={{ height: 40, minWidth: 44, paddingHorizontal: id === "all" ? 14 : 6, borderRadius: 20, backgroundColor: agent === id ? c.ink : c.card, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}>
              {id === "all" ? <T v="cap" w="bold" style={{ color: agent === id ? c.white : c.ink }}>All</T> : <AgentAvatar kind={id} size={28} />}
            </Press>
          ))}
        </View>
      ) : null}
      {/* the stream */}
      <View style={{ marginTop: 14, gap: 8, paddingHorizontal: 16 }}>
        {shown.map((x) => <Card key={x.key} x={x} now={now} open={open === x.key} onToggle={() => setOpen(open === x.key ? null : x.key)} onReceipt={() => receipt(x)} pocketName={cleanText(findPocket(x.pocket ?? "")?.name ?? "", 24)} />)}
        {filtered.length > shown.length ? (
          <Press haptics="select" onPress={() => setMore((n) => n + 12)} accessibilityRole="button" accessibilityLabel="Show earlier decisions" style={{ alignSelf: "center", minHeight: 44, justifyContent: "center", paddingHorizontal: 16 }}>
            <T v="sub" w="semi" color="ink2">{`Earlier · ${filtered.length - shown.length}`}</T>
          </Press>
        ) : null}
        {!shown.length ? <T v="sub" color="mutedOnCanvas" style={{ textAlign: "center", paddingVertical: 32 }}>Nothing yet. When an agent pays, waits or is refused, it shows up here.</T> : null}
      </View>
    </>
  );
}

function NowLine({ agent, tone, text }: { agent: string; tone: "wait" | "live" | "idle"; text: string }) {
  const reduce = useReduceMotion();
  const p = useSharedValue(1);
  useEffect(() => { if (!reduce) p.value = withRepeat(withSequence(withTiming(1.35, { duration: 900 }), withTiming(1, { duration: 900 })), -1); }, [reduce, p]);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: p.value }], opacity: 2 - p.value * 1.2 }));
  const col = tone === "wait" ? c.blue : tone === "live" ? c.vermillion : c.green;
  return (
    <View accessible accessibilityLiveRegion="polite" accessibilityLabel={`Now: ${text}`}
      style={{ marginHorizontal: 16, marginTop: 4, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.card, backgroundColor: c.ink }}>
      <View style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={[{ position: "absolute", width: 40, height: 40, borderRadius: 13, borderWidth: 2, borderColor: col }, ring]} />
        <AgentAvatar kind={agent} size={32} />
      </View>
      <View style={{ flex: 1 }}>
        <T v="tab" style={{ color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: 0.8 }}>Now</T>
        <T v="row" w="semi" style={{ color: "#FFFFFF" }} numberOfLines={2}>{text}</T>
      </View>
    </View>
  );
}

function Card({ x, now, open, onToggle, onReceipt, pocketName }: { x: LiveCard; now: number; open: boolean; onToggle(): void; onReceipt(): void; pocketName: string }) {
  const L = LOOK[x.kind];
  const dark = x.kind === "freeze";
  const ink = dark ? c.white : c.ink;
  const sub = dark ? "rgba(255,255,255,0.6)" : c.muted;
  return (
    <Animated.View entering={FadeIn.duration(200)} style={{ borderRadius: radius.tile + 2, backgroundColor: L.bg, overflow: "hidden", borderWidth: dark ? 2 : 0, borderColor: c.vermillion }}>
      <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: L.edge }} />
      <Press kind="row" haptics="select" onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded: open }}
        accessibilityLabel={`${L.label}: ${x.title}${x.amount ? `, ${x.amount}` : ""}. ${x.why ?? ""}. ${pocketName}, ${ago(x.at, now)} ago`}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingLeft: 16, paddingRight: 14 }}>
          {/* the agent, with the seller on its corner */}
          <View>
            <AgentAvatar kind={x.agent ?? "chainbrain"} size={34} />
            {x.sellerId && hasSellerMark(x.sellerId) ? <View style={{ position: "absolute", right: -7, bottom: -7, borderRadius: 7, borderWidth: 2, borderColor: L.bg }}><SellerMark id={x.sellerId} size={18} radius={5} /></View> : null}
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Icon name={L.icon} size={13} color={L.tone === c.white ? c.vermillion : L.tone} stroke={2.4} />
              <T v="row" w="bold" numberOfLines={1} style={{ flexShrink: 1, color: ink }}>{x.title}</T>
            </View>
            <T v="cap" numberOfLines={open ? 3 : 1} style={{ color: sub }}>{x.kind === "paid" && pocketName ? pocketName : x.why}</T>
          </View>
          <View style={{ alignItems: "flex-end", gap: 2 }}>
            {x.amount ? <T v="row" w="bold" style={{ color: x.kind === "refused" || x.kind === "watched" ? sub : ink, fontVariant: ["tabular-nums"], textDecorationLine: x.kind === "refused" ? "line-through" : "none" }}>{x.amount}</T> : null}
            <T v="tab" style={{ color: sub }}>{ago(x.at, now)}</T>
          </View>
      </Press>
        {open ? (
          <View style={{ paddingLeft: 16, paddingRight: 14, paddingBottom: 14, gap: 10 }}>
            {x.quote ? (
              <View style={{ padding: 10, borderRadius: 10, backgroundColor: dark ? "rgba(255,255,255,0.08)" : c.vermillionSoft, gap: 4 }}>
                <T v="tab" w="bold" style={{ color: c.vermillionInk, letterSpacing: 0.4 }}>WHAT IT SAID · NOT OBEYED</T>
                <T v="cap" style={{ color: dark ? c.white : c.ink2, textDecorationLine: "line-through" }}>{`“${cleanText(x.quote, 140)}”`}</T>
              </View>
            ) : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {pocketName ? <Chip dark={dark} icon="card" text={pocketName} /> : null}
              {x.reason ? <Chip dark={dark} icon="lock" text={x.reason.replace(/_/g, " ").toLowerCase()} /> : null}
              {x.tx ? <Chip dark={dark} icon="link" text={`tx ${x.tx.slice(0, 6)}…${x.tx.slice(-4)}`} /> : null}
            </View>
            {x.kind === "paid" || x.kind === "cosigned" || x.kind === "refused" ? (
              <Press haptics="select" onPress={onReceipt} accessibilityRole="button" accessibilityLabel="Open its receipt" style={{ alignSelf: "flex-start", minHeight: 36, justifyContent: "center" }}>
                <T v="sub" w="semi" color="vermillionInk">Open its receipt</T>
              </Press>
            ) : null}
          </View>
        ) : null}
    </Animated.View>
  );
}

function Chip({ icon, text, dark }: { icon: IconName; text: string; dark?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, height: 26, paddingHorizontal: 9, borderRadius: 13, backgroundColor: dark ? "rgba(255,255,255,0.1)" : c.fill }}>
      <Icon name={icon} size={12} color={dark ? c.white : c.ink2} stroke={2.2} />
      <T v="cap" w="semi" style={{ color: dark ? c.white : c.ink2 }} numberOfLines={1}>{text}</T>
    </View>
  );
}
