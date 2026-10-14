import React from "react";
import { View } from "react-native";
import { useApp } from "../store";
import { c } from "../tokens";
import { Avatar, CodePill, Press } from "../ui/kit";
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
  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16, minHeight: 72, paddingHorizontal: 16 }}>
      <Avatar label={v.avatar.label} icon={v.avatar.icon} tone={v.avatar.tone} />
      <View style={{ flex: 1, gap: 2, paddingVertical: 12 }}>
        <T v="row" numberOfLines={1}>{v.title}</T>
        {v.sub ? <T v="sub" color="muted" numberOfLines={2}>{v.sub}</T> : null}
        {v.codes?.length ? <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 2 }}>{v.codes.map((k) => <CodePill key={k} code={k} />)}</View> : null}
        {v.foot ? <T v="cap" numberOfLines={1} style={{ color: c.muted }}>{v.foot}</T> : null}
      </View>
      {v.right || v.rightSub ? (
        <View style={{ alignItems: "flex-end", gap: 2 }}>
          {v.right ? <T v="row" w="semi" color={v.rightTone}>{v.right}</T> : null}
          {v.rightSub ? <T v="sub" color={v.rightSubTone}>{v.rightSub}</T> : null}
        </View>
      ) : null}
    </View>
  );
  return (
    <View>
      {onPress ? <Press kind="row" onPress={onPress} haptics="light" accessibilityRole="button" accessibilityLabel={`${v.title}, ${v.rightSub ?? ""} ${v.right ?? ""}`}>{body}</Press> : body}
      {last ? null : <View style={{ height: 1, backgroundColor: c.line, marginLeft: 80 }} />}
    </View>
  );
}

/** An ActivityRow that enters (fade + rise) when it is new and lets its neighbours slide to their new place. `delay` -1: no entrance. */
export function ActivityItem({ delay = 0, ...p }: React.ComponentProps<typeof ActivityRow> & { delay?: number }) {
  return <Rise delay={Math.max(delay, 0)} instant={delay < 0} dy={10} layout><ActivityRow {...p} /></Rise>;
}
