import React, { useMemo, useState } from "react";
import Animated from "react-native-reanimated";
import { RefreshControl, View } from "react-native";
import { useApp } from "../../store";
import { c } from "../../tokens";
import { Screen, PageTitle } from "../../ui/Screen";
import { router } from "expo-router";
import { Avatar, Button, ListCard, ListRow } from "../../ui/kit";
import { Rise, SHIFT, useStagger } from "../../ui/Rise";
import { SlidingPills } from "../../ui/SlidingPills";
import { haptic } from "../../haptics";
import { useReduceMotion } from "../../ui/motion";
import { T } from "../../ui/Text";
import { Icon } from "../../ui/Icon";
import { ActivityItem } from "../../components/ActivityRow";
import { AttackActivityRow, NoteRow, attackInfo, isAttackEvent } from "../../components/AttackCard";
import { RadarActivityRow } from "../../components/RadarCard";
import { cleanText } from "../../lib/sanitize";
import { describeRow, visibleRows } from "../../lib/plain";
import { dayLabel, money } from "../../lib/util";
import { paidTotal, radarAlerts, type LedgerRow, type RadarAlert, type WalletEvent } from "../../lib/events";

type Filter = "all" | "paid" | "refused" | "needs";
const FILTERS: { key: Filter; label: string }[] = [{ key: "all", label: "All" }, { key: "paid", label: "Paid" }, { key: "refused", label: "Refused" }, { key: "needs", label: "Needs you" }];

export default function Activity() {
  const { ledger, events, pockets, findPocket, setExplorerTx, pending, setReceipt, setApprovalOpen, setQuestionOpen, sellerName, refreshPockets } = useApp();
  const reduce = useReduceMotion();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  type Item = { key: string; at: number; row?: LedgerRow; atk?: WalletEvent; radar?: RadarAlert; note?: { title: string; sub: string } };
  const groups = useMemo(() => {
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
    const all = [...rows, ...atks, ...rad].sort((a, b) => b.at - a.at);
    const out: { day: string; rows: Item[] }[] = [];
    for (const r of all) {
      const d = dayLabel(r.at);
      if (out.at(-1)?.day === d) out.at(-1)!.rows.push(r); else out.push({ day: d, rows: [r] });
    }
    return out;
  }, [ledger, events, filter, pockets]);

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
      <PageTitle title="Activity" sub={paid ? `${paid} paid · ${money(paidTotal(ledger))} spent by your agent` : "What your agent paid and was refused"} />
      {showNeeds && pending.length > 0 ? (
        <Rise dy={10} exit layout style={{ marginTop: 12 }}><ListCard>
          {pending.map((a) => (
            <ListRow key={a.id} a11y={a.kind === "question" ? "Your agent has a question" : "Needs your OK"} onPress={() => (a.kind === "question" ? setQuestionOpen(true) : setApprovalOpen(true))}
              avatar={<Avatar icon="clock" tone="warning" />}
              title={a.kind === "question" ? "Your agent has a question" : a.kind === "payment" ? cleanText(sellerName(a.data?.sellerId), 30) : "Confirm a task"}
              sub={a.kind === "payment" ? "Waiting for your OK" : cleanText(a.text.split("\n")[0], 60)} right={a.kind === "payment" ? `US$${cleanText(a.data?.amount, 10)}` : undefined} rightSub="Needs you" rightSubTone="warning" />
          ))}
        </ListCard></Rise>
      ) : null}
      <Animated.View layout={reduce ? undefined : SHIFT} style={{ marginTop: 16 }}><SlidingPills items={FILTERS.map((f) => (f.key === "needs" && pending.length ? { ...f, label: `${f.label} · ${pending.length}` } : f))} value={filter} onChange={setFilter} /></Animated.View>
      {groups.length === 0 ? (
        <Rise dy={8} duration={240}>
          <View style={{ alignItems: "center", paddingTop: 56, gap: 8, paddingHorizontal: 40 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.fill, alignItems: "center", justifyContent: "center", marginBottom: 8 }}><Icon name="activity" size={28} color={c.ink2} /></View>
            <T v="section">No activity yet</T>
            <T v="sub" color="muted" style={{ textAlign: "center" }}>Your agent's purchases and your changes show up here.</T>
            <Button label="Ask agent" kind="outline" small onPress={() => router.navigate("/agent")} style={{ marginTop: 12 }} />
          </View>
        </Rise>
      ) : groups.map((g) => (
        <Animated.View key={g.day} layout={reduce ? undefined : SHIFT}>
          <T v="cap" w="semi" color="muted" accessibilityRole="header" style={{ paddingHorizontal: 20, marginTop: 24, marginBottom: 8 }}>{g.day}</T>
          <ListCard>{g.rows.map((r) => r.note ? <NoteRow key={r.key} delay={delays[r.key] ?? 0} title={r.note.title} sub={r.note.sub} right="Refused" /> : r.radar ? <RadarActivityRow key={r.key} delay={delays[r.key] ?? 0} a={r.radar} /> : r.atk ? <AttackActivityRow key={r.key} delay={delays[r.key] ?? 0} e={r.atk} onPress={() => { const t = attackInfo(r.atk!)?.tx; if (t) setExplorerTx(t); }} /> : <ActivityItem key={r.key} delay={delays[r.key] ?? 0} row={r.row!} showPocket timeOnly onPress={() => setReceipt(r.row!)} />)}</ListCard>
        </Animated.View>
      ))}
    </Screen>
  );
}
