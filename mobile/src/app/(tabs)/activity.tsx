// Activity: two views of the same events. Live (the default) narrates what the agents are doing and deciding, now
// (components/LiveFeed.tsx); Ledger is the full record, day by day, with filters and receipts.
import React, { useEffect, useMemo, useState } from "react";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { RefreshControl, View } from "react-native";
import { useApp } from "../../store";
import { c, motion } from "../../tokens";
import { Screen, PageTitle } from "../../ui/Screen";
import { router } from "expo-router";
import { AgentAvatar } from "../../ui/AgentAvatar";
import { Button, ListCard, Press } from "../../ui/kit";
import { Rise, SHIFT, useStagger } from "../../ui/Rise";
import { SlidingPills } from "../../ui/SlidingPills";
import { haptic } from "../../haptics";
import { useReduceMotion } from "../../ui/motion";
import { T } from "../../ui/Text";
import { Icon } from "../../ui/Icon";
import { ActivityItem, BrandSquare, DayHead, TxRow } from "../../components/ActivityRow";
import { ActivityPulse } from "../../components/ActivityPulse";
import { LiveFeed } from "../../components/LiveFeed";
import { AttackActivityRow, NoteRow, attackInfo, isAttackEvent } from "../../components/AttackCard";
import { RadarActivityRow } from "../../components/RadarCard";
import { SentinelActivityRow, isSentinelAlert } from "../../components/SentinelCard";
import { cleanText } from "../../lib/sanitize";
import { describeRow, visibleRows } from "../../lib/plain";
import { dayLabel, money } from "../../lib/util";
import { paidTotal, radarAlerts, sentinelEvents, type LedgerRow, type RadarAlert, type SentinelView, type WalletEvent } from "../../lib/events";

type Filter = "all" | "paid" | "refused" | "needs";
const PAGE = 25;
const EMPTY: Record<Filter, { title: string; sub: string }> = {
  all: { title: "No activity yet", sub: "Your agent's purchases and your changes show up here." },
  paid: { title: "Nothing paid yet", sub: "Payments your agents make show up here." },
  refused: { title: "Nothing refused", sub: "Payments your pocket rules turn down show up here." },
  needs: { title: "Nothing needs you", sub: "When an agent asks for your OK, it waits here." },
};
type View_ = "live" | "ledger";
const VIEWS: { key: View_; label: string }[] = [{ key: "live", label: "Live" }, { key: "ledger", label: "Ledger" }];
const FILTERS: { key: Filter; label: string }[] = [{ key: "all", label: "All" }, { key: "paid", label: "Paid" }, { key: "refused", label: "Refused" }, { key: "needs", label: "Needs you" }];

/** Live or Ledger: a segmented control, with a live dot on Live (it is a different thing from the filters under it). */
function ViewSwitch({ value, onChange }: { value: View_; onChange(v: View_): void }) {
  const reduce = useReduceMotion();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => { x.value = reduce ? (value === "live" ? 0 : 1) : withTiming(value === "live" ? 0 : 1, { duration: motion.base }); }, [value, reduce, x]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * (w / 2) }] }));
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width - 8)} accessibilityRole="tablist"
      style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 8, padding: 4, height: 48, borderRadius: 24, backgroundColor: c.card }}>
      {w ? <Animated.View style={[{ position: "absolute", left: 4, top: 4, bottom: 4, width: w / 2, borderRadius: 20, backgroundColor: c.ink }, thumb]} /> : null}
      {VIEWS.map((v) => {
        const on = v.key === value;
        return (
          <Press key={v.key} haptics="select" onPress={() => onChange(v.key)} accessibilityRole="tab" accessibilityLabel={v.label} accessibilityState={{ selected: on }}
            style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }}>
            {v.key === "live" ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.green }} /> : <Icon name="receipt" size={14} color={on ? c.white : c.ink2} stroke={2.2} />}
            <T v="row" w="bold" style={{ color: on ? c.white : c.ink2 }}>{v.label}</T>
          </Press>
        );
      })}
    </View>
  );
}

export default function Activity() {
  const { ledger, events, pockets, findPocket, setExplorerTx, pending, setReceipt, setApprovalOpen, setQuestionOpen, sellerName, refreshPockets, agents, openApproval } = useApp();
  const reduce = useReduceMotion();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<View_>("live");
  // the newest items first; older ones on request. Two weeks of history is ~60 rows, each with its own entrance and layout
  // spring, and building them all at once held the screen for most of a second
  const [limit, setLimit] = useState(PAGE);

  type Item = { key: string; at: number; row?: LedgerRow; atk?: WalletEvent; radar?: RadarAlert; sentinel?: SentinelView; note?: { title: string; sub: string } };
  const shownGroups = useMemo(() => {
    const shown = visibleRows([...ledger].reverse()).filter((r) => filter === "all" || describeRow(r, "", "").filter === filter);
    // a run of refusals because the pocket was off is one line: "3 refused after you stopped it"
    const off = (r: LedgerRow) => (r.kind === "refusal" || r.kind === "blocked") && r.reasons[0] === "POCKET_REVOKED";
    const rows: Item[] = [];
    for (let i = 0; i < shown.length; i++) {
      let j = i;
      while (off(shown[i]) && j + 1 < shown.length && off(shown[j + 1]) && shown[j + 1].pocket === shown[i].pocket) j++;
      if (j > i) {
        const name = findPocket(shown[i].pocket)?.name;
        rows.push({ key: `run:${shown[i].key}`, at: shown[i].at, note: { title: `${j - i + 1} refused after you stopped it`, sub: [name ? cleanText(name, 24) : undefined, "The pocket was off"].filter(Boolean).join(" · ") } });
        i = j;
      } else rows.push({ key: shown[i].key, at: shown[i].at, row: shown[i] });
    }
    // attacks the chat refused (privilege escalation, data extraction, "send money to…") are not payments: they join the list here
    const atks: Item[] = filter === "all" || filter === "refused" ? events.filter((e) => isAttackEvent(e) && e.type === "attack").map((e) => ({ key: `atk:${e.at}:${e.attack}`, at: e.at, atk: e })) : [];
    // Radar alerts: a seller one of your pockets paid became risky
    const rad: Item[] = filter === "all" || filter === "refused" ? pockets.flatMap((p) => radarAlerts(events, p.address)).map((a) => ({ key: a.key, at: a.at, radar: a })) : [];
    const sen: Item[] = filter === "all" || filter === "refused" ? sentinelEvents(events.filter((e) => pockets.some((p) => p.address.toLowerCase() === String(e.pocket ?? "").toLowerCase()))).filter(isSentinelAlert).map((v) => ({ key: v.key, at: v.at, sentinel: v })) : [];
    const all = [...rows, ...atks, ...rad, ...sen].sort((a, b) => b.at - a.at);
    const out: { day: string; rows: Item[] }[] = [];
    for (const r of all.slice(0, limit)) {
      const d = dayLabel(r.at);
      if (out.at(-1)?.day === d) out.at(-1)!.rows.push(r); else out.push({ day: d, rows: [r] });
    }
    return { days: out, more: Math.max(all.length - limit, 0) };
  }, [ledger, events, filter, pockets, limit]);
  const groups = shownGroups.days;

  const delays = useStagger(groups.flatMap((g) => g.rows.map((r) => r.key)), 50, 6);
  const onRefresh = async () => {
    haptic.medium();
    setRefreshing(true);
    await Promise.all([refreshPockets().catch(() => {}), new Promise((r) => setTimeout(r, 650))]);
    setRefreshing(false);
  };

  const paid = ledger.filter((r) => r.kind === "payment").length;
  const showNeeds = filter === "all" || filter === "needs";
  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} />}>
      <PageTitle title="Activity" sub={paid ? `All time: ${paid} paid · ${money(paidTotal(ledger))} spent by your ${agents.length > 1 ? "agents" : "agent"}` : "What your agents paid and were refused"} />
      <ViewSwitch value={view} onChange={setView} />
      {view === "live" ? <LiveFeed onLedger={() => setView("ledger")} /> : <>
      <ActivityPulse ledger={ledger} />
      {showNeeds && pending.length > 0 ? (
        <Rise dy={10} exit layout style={{ marginTop: 12 }}><ListCard>
          {pending.map((a) => (
            <TxRow key={a.id} a11y={a.kind === "question" ? "Your agent has a question" : "Needs your OK"} onPress={() => (a.kind === "question" ? setQuestionOpen(true) : openApproval(a.id))}
              square={a.agent && a.agent !== "chainbrain" ? <AgentAvatar kind={a.agent} size={44} /> : <BrandSquare icon="clock" tone="blue" />}
              title={a.kind === "question" ? "Your agent has a question" : a.kind === "payment" ? cleanText(sellerName(a.data?.sellerId), 30) : "Confirm a task"}
              sub={a.kind === "payment" ? "Waiting for your OK" : cleanText(a.text.split("\n")[0], 60)} right={a.kind === "payment" ? `US$${cleanText(a.data?.amount, 10)}` : undefined} rightSub="Needs you" rightSubTone="blueInk" />
          ))}
        </ListCard></Rise>
      ) : null}
      <Animated.View layout={reduce ? undefined : SHIFT} style={{ marginTop: 16 }}><SlidingPills items={FILTERS.map((f) => (f.key === "needs" && pending.length ? { ...f, label: `${f.label} · ${pending.length}` } : f))} value={filter} onChange={setFilter} /></Animated.View>
      {groups.length === 0 ? (filter === "needs" && pending.length ? null : (
        <Rise dy={8} duration={240}>
          <View style={{ alignItems: "center", paddingTop: 56, gap: 8, paddingHorizontal: 40 }}>
            <View style={{ width: 64, height: 64, borderRadius: 16, borderCurve: "continuous", backgroundColor: c.card, alignItems: "center", justifyContent: "center", marginBottom: 8 }}><Icon name="activity" size={28} color={c.ink2} /></View>
            {/* a filter with nothing in it is not "no activity": say what this filter would show */}
            <T v="section">{EMPTY[filter === "all" || ledger.length === 0 ? "all" : filter].title}</T>
            <T v="sub" color="muted" style={{ textAlign: "center" }}>{EMPTY[filter === "all" || ledger.length === 0 ? "all" : filter].sub}</T>
            {filter === "all" || ledger.length === 0 ? <Button label="Ask agent" kind="outline" small onPress={() => router.navigate("/agent")} style={{ marginTop: 12 }} /> : null}
          </View>
        </Rise>
      )) : groups.map((g) => (
        <Animated.View key={g.day} layout={reduce ? undefined : SHIFT}>
          <ListCard head={<DayHead at={g.rows[0].at} />} style={{ marginTop: 16 }}>{g.rows.map((r) => r.note ? <NoteRow key={r.key} delay={delays[r.key] ?? 0} title={r.note.title} sub={r.note.sub} right="Refused" /> : r.sentinel ? <SentinelActivityRow key={r.key} delay={delays[r.key] ?? 0} v={r.sentinel} /> : r.radar ? <RadarActivityRow key={r.key} delay={delays[r.key] ?? 0} a={r.radar} onPress={() => router.push({ pathname: "/radar", params: { name: r.radar!.name } })} /> : r.atk ? <AttackActivityRow key={r.key} delay={delays[r.key] ?? 0} e={r.atk} onPress={() => { const t = attackInfo(r.atk!)?.tx; if (t) setExplorerTx(t); }} /> : <ActivityItem key={r.key} delay={delays[r.key] ?? 0} row={r.row!} showPocket timeOnly onPress={() => setReceipt(r.row!)} />)}</ListCard>
        </Animated.View>
      ))}
      {shownGroups.more > 0 ? (
        <Button label={`Show earlier (${shownGroups.more})`} kind="text" small onPress={() => setLimit((n) => n + PAGE)} style={{ marginTop: 12, alignSelf: "center" }} />
      ) : null}
      </>}
    </Screen>
  );
}
