import React from "react";
import { View } from "react-native";
import { useApp } from "../store";
import { c } from "../tokens";
import { Avatar, Press } from "../ui/kit";
import { Rise } from "../ui/Rise";
import { T } from "../ui/Text";
import { cleanText } from "../lib/sanitize";
import { describeRow } from "../lib/plain";
import { stamp } from "../lib/util";
import type { LedgerRow } from "../lib/events";

/** One activity item as a Ryt row (same layout as kit ListRow, pressed as a row: scale 0.985, light haptic): seller, "Research
 *  data · 14 Oct, 1:32 PM", amount, status under it. */
export function ActivityRow({ row, onPress, last, showPocket, timeOnly }: { row: LedgerRow; onPress?: () => void; last?: boolean; showPocket?: boolean; timeOnly?: boolean }) {
  const { sellerName, findPocket } = useApp();
  const seller = cleanText(sellerName(row.sellerId), 40);
  const pocket = showPocket ? findPocket(row.pocket) : undefined;
  const v = describeRow(row, seller, timeOnly ? new Date(row.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : stamp(row.at), pocket ? cleanText(pocket.name, 24) : undefined);
  // owner transactions are neutral grey; amounts carry a sign only when money moves: "-" paid out, "+" funding and returns
  const owner = row.kind === "owner" && row.ownerKind !== "revoke";
  const money = v.right && row.kind === "payment" ? `-${v.right}` : v.right && row.kind === "owner" && (row.ownerKind === "fund" || row.ownerKind === "return") ? `+${v.right}` : v.right;
  const taskCap = !v.right && row.kind === "intent" ? /Price:[^\n]*?(US\$\d+(?:\.\d+)?)/.exec(row.text ?? "")?.[1] : undefined;
  const right = money ?? taskCap;
  const rightTone = money?.startsWith("+") ? "positive" : taskCap ? "muted" : v.rightTone;
  // one line each: the plain sentence only (reason codes and hashes live in the receipt's Details)
  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 56, paddingHorizontal: 16 }}>
      <Avatar label={v.avatar.label} icon={v.avatar.icon} tone={owner ? "fill" : v.avatar.tone} size={40} />
      <View style={{ flex: 1, gap: 1, paddingVertical: 8 }}>
        <T v="row" numberOfLines={1}>{v.title}</T>
        {v.sub ? <T v="sub" color="muted" numberOfLines={1}>{v.sub}</T> : null}
      </View>
      {right || v.rightSub ? (
        <View style={{ alignItems: "flex-end", gap: 1 }}>
          {right ? <T v="row" w="semi" color={rightTone}>{right}</T> : null}
          {v.rightSub ? <T v="cap" w="medium" color={v.rightSubTone}>{v.rightSub}</T> : null}
        </View>
      ) : null}
    </View>
  );
  return (
    <View>
      {onPress ? <Press kind="row" onPress={onPress} haptics="light" accessibilityRole="button" accessibilityLabel={`${v.title}, ${v.rightSub ?? ""} ${right ?? ""}`}>{body}</Press> : body}
      {last ? null : <View style={{ height: 1, backgroundColor: c.line, marginLeft: 70 }} />}
    </View>
  );
}

/** An ActivityRow that enters (fade + rise) when it is new and lets its neighbours slide to their new place. `delay` -1: no entrance. */
export function ActivityItem({ delay = 0, ...p }: React.ComponentProps<typeof ActivityRow> & { delay?: number }) {
  return <Rise delay={Math.max(delay, 0)} instant={delay < 0} dy={10} layout><ActivityRow {...p} /></Rise>;
}
