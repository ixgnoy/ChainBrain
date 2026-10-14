import React, { useMemo, useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme";
import { useApp } from "../../store";
import { Ambient } from "../../ui/Screen";
import { Chip, DevBadge, Press } from "../../ui/primitives";
import { T } from "../../ui/Text";
import { Icon } from "../../ui/Icon";
import { useMinimizeOnScroll } from "../../ui/minimize";
import { TAB_SPACE } from "../../ui/TabBar";
import { ActivityRow } from "../../components/ActivityRow";
import { cleanText } from "../../lib/sanitize";
import { usd, dayLabel } from "../../lib/util";
import { paidTotal, type LedgerRow } from "../../lib/events";
import { radius } from "../../tokens";

type Filter = "all" | "paid" | "refused" | "needs";
const FILTERS: { key: Filter; label: string }[] = [{ key: "all", label: "All" }, { key: "paid", label: "Paid" }, { key: "refused", label: "Refused" }, { key: "needs", label: "Needs you" }];
type Item = { kind: "head"; key: string; label: string } | { kind: "row"; key: string; row: LedgerRow };

export default function Activity() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const onScroll = useMinimizeOnScroll();
  const { ledger, pending, dev, setReceipt, setApprovalOpen, setQuestionOpen, sellerName } = useApp();
  const [filter, setFilter] = useState<Filter>("all");
  const needs = pending;

  const items = useMemo<Item[]>(() => {
    const rows = [...ledger].reverse().filter((r) => {
      if (filter === "all") return true;
      if (filter === "paid") return r.outcome === "paid";
      if (filter === "refused") return r.outcome === "refused" || r.outcome === "declined";
      return r.outcome === "pending";
    });
    const out: Item[] = [];
    let day = "";
    for (const r of rows) {
      const d = dayLabel(r.at);
      if (d !== day) { day = d; out.push({ kind: "head", key: `h-${d}`, label: d }); }
      out.push({ kind: "row", key: r.key, row: r });
    }
    return out;
  }, [ledger, filter]);

  const paid = ledger.filter((r) => r.kind === "payment").length;
  const refused = ledger.filter((r) => r.outcome === "refused").length;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Ambient />
      <Animated.FlatList
        data={items}
        keyExtractor={(i: Item) => i.key}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: TAB_SPACE + 24 }}
        ListHeaderComponent={
          <View style={{ paddingBottom: 8 }}>
            <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, gap: 8 }}>
              <T v="headingLg">Activity</T>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                {dev && <DevBadge />}
                <T v="bodySm" color="text2">{paid} paid ({usd(paidTotal(ledger))} USDC), {refused} refused</T>
              </View>
            </View>
            {needs.map((a) => (
              <Press key={a.id} onPress={() => (a.kind === "question" ? setQuestionOpen(true) : setApprovalOpen(true))} style={{ marginHorizontal: 20, marginBottom: 10, padding: 14, borderRadius: radius.lg, backgroundColor: c.stepupBg, borderWidth: 1, borderColor: c.stepupBorder, gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Chip kind="stepup" label={a.kind === "question" ? "Agent asks" : "Needs you"} />
                  {a.kind === "payment" && <T v="title" num>US${cleanText(a.data?.amount, 10)}</T>}
                </View>
                <T v="bodySm" numberOfLines={2}>{cleanText(a.text.split("\n")[0], 120)}</T>
                {a.kind === "payment" && <T v="caption" color="text2">{cleanText(sellerName(a.data?.sellerId), 40)} · tap to review</T>}
              </Press>
            ))}
            <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingBottom: 8 }}>
              {FILTERS.map((f) => {
                const on = filter === f.key;
                return (
                  <Press key={f.key} haptics="select" onPress={() => setFilter(f.key)} scale={0.95} style={{ height: 34, paddingHorizontal: 14, borderRadius: radius.pill, justifyContent: "center", backgroundColor: on ? c.text : c.bgElev2, borderWidth: 1, borderColor: on ? c.text : c.hairline }}>
                    <T v="bodySm" weight="semi" style={{ color: on ? c.bg : c.text2 }}>{f.label}</T>
                  </Press>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: 60, gap: 8, paddingHorizontal: 40 }}>
            <Icon name="activity" size={32} color={c.text3} />
            <T v="title" color="text2">Nothing here yet</T>
            <T v="bodySm" color="text3" style={{ textAlign: "center" }}>Payments, refusals, data requests and approvals from your agent show up here as they happen.</T>
          </View>
        }
        renderItem={({ item }: { item: Item }) => item.kind === "head"
          ? <T v="caption" color="text3" style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4, letterSpacing: 0.4 }}>{item.label.toUpperCase()}</T>
          : <ActivityRow row={item.row} onPress={() => setReceipt(item.row)} />}
      />
    </View>
  );
}
