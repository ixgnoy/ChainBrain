import React, { useMemo, useState } from "react";
import Animated from "react-native-reanimated";
import { RefreshControl, View } from "react-native";
import { useApp } from "../../store";
import { c } from "../../tokens";
import { Screen, PageTitle } from "../../ui/Screen";
import { Avatar, ListCard, ListRow } from "../../ui/kit";
import { Rise, SHIFT, useStagger } from "../../ui/Rise";
import { SlidingPills } from "../../ui/SlidingPills";
import { haptic } from "../../haptics";
import { useReduceMotion } from "../../ui/motion";
import { T } from "../../ui/Text";
import { Icon } from "../../ui/Icon";
import { ActivityItem } from "../../components/ActivityRow";
import { cleanText } from "../../lib/sanitize";
import { describeRow, visibleRows } from "../../lib/plain";
import { dayLabel, money } from "../../lib/util";
import { paidTotal, type LedgerRow } from "../../lib/events";

type Filter = "all" | "paid" | "refused" | "needs";
const FILTERS: { key: Filter; label: string }[] = [{ key: "all", label: "All" }, { key: "paid", label: "Paid" }, { key: "refused", label: "Refused" }, { key: "needs", label: "Needs you" }];

export default function Activity() {
  const { ledger, pending, setReceipt, setApprovalOpen, setQuestionOpen, sellerName, refreshPockets } = useApp();
  const reduce = useReduceMotion();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const groups = useMemo(() => {
    const rows = visibleRows([...ledger].reverse()).filter((r) => filter === "all" || describeRow(r, "", "").filter === filter);
    const out: { day: string; rows: LedgerRow[] }[] = [];
    for (const r of rows) {
      const d = dayLabel(r.at);
      if (out.at(-1)?.day === d) out.at(-1)!.rows.push(r); else out.push({ day: d, rows: [r] });
    }
    return out;
  }, [ledger, filter]);

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
      <Animated.View layout={reduce ? undefined : SHIFT} style={{ marginTop: 16 }}><SlidingPills items={FILTERS} value={filter} onChange={setFilter} /></Animated.View>
      {groups.length === 0 ? (
        <Rise dy={8} duration={240}>
          <View style={{ alignItems: "center", paddingTop: 56, gap: 8, paddingHorizontal: 40 }}>
            <Icon name="activity" size={28} color={c.faint} />
            <T v="row" color="ink2">Nothing here yet</T>
            <T v="sub" color="muted" style={{ textAlign: "center" }}>Payments, refusals and approvals from your agent show up here.</T>
          </View>
        </Rise>
      ) : groups.map((g) => (
        <Animated.View key={g.day} layout={reduce ? undefined : SHIFT}>
          <T v="section" style={{ paddingHorizontal: 20, marginTop: 24, marginBottom: 12 }}>{g.day}</T>
          <ListCard>{g.rows.map((r) => <ActivityItem key={r.key} delay={delays[r.key] ?? 0} row={r} showPocket timeOnly onPress={() => setReceipt(r)} />)}</ListCard>
        </Animated.View>
      ))}
    </Screen>
  );
}
