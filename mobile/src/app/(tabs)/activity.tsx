import React, { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { useApp } from "../../store";
import { c } from "../../tokens";
import { Screen, PageTitle } from "../../ui/Screen";
import { Avatar, Chip, ListCard, ListRow } from "../../ui/kit";
import { T } from "../../ui/Text";
import { Icon } from "../../ui/Icon";
import { ActivityRow } from "../../components/ActivityRow";
import { cleanText } from "../../lib/sanitize";
import { describeRow, visibleRows } from "../../lib/plain";
import { dayLabel, money } from "../../lib/util";
import { paidTotal, type LedgerRow } from "../../lib/events";

type Filter = "all" | "paid" | "refused" | "needs";
const FILTERS: { key: Filter; label: string }[] = [{ key: "all", label: "All" }, { key: "paid", label: "Paid" }, { key: "refused", label: "Refused" }, { key: "needs", label: "Needs you" }];

export default function Activity() {
  const { ledger, pending, setReceipt, setApprovalOpen, setQuestionOpen, sellerName } = useApp();
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

  const paid = ledger.filter((r) => r.kind === "payment").length;
  const showNeeds = filter === "all" || filter === "needs";
  return (
    <Screen>
      <PageTitle title="Activity" sub={paid ? `${paid} paid · ${money(paidTotal(ledger))} spent by your agent` : "What your agent paid and was refused"} />
      {showNeeds && pending.length > 0 ? (
        <ListCard style={{ marginTop: 12 }}>
          {pending.map((a) => (
            <ListRow key={a.id} a11y={a.kind === "question" ? "Your agent has a question" : "Needs your OK"} onPress={() => (a.kind === "question" ? setQuestionOpen(true) : setApprovalOpen(true))}
              avatar={<Avatar icon="clock" tone="warning" />}
              title={a.kind === "question" ? "Your agent has a question" : a.kind === "payment" ? cleanText(sellerName(a.data?.sellerId), 30) : "Confirm a task"}
              sub={a.kind === "payment" ? "Waiting for your OK" : cleanText(a.text.split("\n")[0], 60)} right={a.kind === "payment" ? `US$${cleanText(a.data?.amount, 10)}` : undefined} rightSub="Needs you" rightSubTone="warning" />
          ))}
        </ListCard>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginTop: 16 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        {FILTERS.map((f) => <Chip key={f.key} label={f.label} on={filter === f.key} onPress={() => setFilter(f.key)} />)}
      </ScrollView>
      {groups.length === 0 ? (
        <View style={{ alignItems: "center", paddingTop: 56, gap: 8, paddingHorizontal: 40 }}>
          <Icon name="activity" size={28} color={c.faint} />
          <T v="row" color="ink2">Nothing here yet</T>
          <T v="sub" color="muted" style={{ textAlign: "center" }}>Payments, refusals and approvals from your agent show up here.</T>
        </View>
      ) : groups.map((g) => (
        <View key={g.day}>
          <T v="section" style={{ paddingHorizontal: 20, marginTop: 24, marginBottom: 12 }}>{g.day}</T>
          <ListCard>{g.rows.map((r) => <ActivityRow key={r.key} row={r} showPocket timeOnly onPress={() => setReceipt(r)} />)}</ListCard>
        </View>
      ))}
    </Screen>
  );
}
