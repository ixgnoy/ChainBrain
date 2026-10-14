import React from "react";
import { View } from "react-native";
import { useTheme } from "../theme";
import { useApp } from "../store";
import { Press } from "../ui/primitives";
import { T } from "../ui/Text";
import { Icon, type IconName } from "../ui/Icon";
import { cleanText } from "../lib/sanitize";
import { reasonText } from "../lib/shared";
import { usd, timeLabel, shortAddr } from "../lib/util";
import type { LedgerRow } from "../lib/events";
import { RowVerdict } from "./Verdict";

export const rowTitle = (row: LedgerRow, name: string) =>
  row.kind === "disclosure" ? `${name} asked for your data` : row.kind === "intent" ? "Task" : row.kind === "approval" ? `Approval for ${name}` : name;
const ICON: Record<LedgerRow["kind"], IconName> = { payment: "arrowUp", refusal: "ban", blocked: "shield", disclosure: "shieldAlert", approval: "shieldCheck", intent: "check" };

export function ActivityRow({ row, onPress, compact }: { row: LedgerRow; onPress?: () => void; compact?: boolean }) {
  const { c } = useTheme();
  const { sellerName, findPocket } = useApp();
  const name = cleanText(sellerName(row.sellerId), 50);
  const pocket = findPocket(row.pocket);
  const bad = row.outcome === "refused" || row.outcome === "declined";
  const note = row.kind === "intent" ? cleanText(row.text?.split("\n")[0], 80) : bad && row.reasons[0] ? reasonText(row.reasons[0]) : row.kind === "disclosure" ? (row.asked ?? []).join(", ") : row.sku ? cleanText(row.sku, 60) : undefined;
  return (
    <Press onPress={onPress} haptics="select" scale={0.985} style={{ flexDirection: "row", gap: 12, paddingVertical: 12, paddingHorizontal: 20, alignItems: "flex-start" }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: bad ? c.refusedBg : row.outcome === "pending" ? c.stepupBg : c.bgElev2, borderWidth: 1, borderColor: bad ? c.refusedBorder : row.outcome === "pending" ? c.stepupBorder : c.hairline, alignItems: "center", justifyContent: "center" }}>
        <Icon name={ICON[row.kind]} size={20} color={bad ? c.refused : row.outcome === "pending" ? c.stepup : row.outcome === "paid" ? c.ok : c.text2} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
          <T v="title" numberOfLines={1} style={{ flex: 1 }}>{rowTitle(row, name)}</T>
          {row.amount != null && row.kind !== "disclosure" && <T v="title" num color={bad ? "text3" : "text"} style={bad ? { textDecorationLine: "line-through" } : undefined}>{usd(row.amount)}</T>}
        </View>
        <T v="bodySm" color="text3" numberOfLines={1}>{[pocket ? cleanText(pocket.name, 24) : shortAddr(row.pocket), timeLabel(row.at)].join(" · ")}{!compact && note ? ` · ${note}` : ""}</T>
        <RowVerdict row={row} />
      </View>
    </Press>
  );
}
