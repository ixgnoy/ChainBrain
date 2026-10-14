import React from "react";
import { useApp } from "../store";
import { Avatar, ListRow } from "../ui/kit";
import { cleanText } from "../lib/sanitize";
import { describeRow } from "../lib/plain";
import { stamp } from "../lib/util";
import type { LedgerRow } from "../lib/events";

/** One activity item as a Ryt row: seller, "Research data · 14 Oct, 1:32 PM", amount, status under it. */
export function ActivityRow({ row, onPress, last, showPocket, timeOnly }: { row: LedgerRow; onPress?: () => void; last?: boolean; showPocket?: boolean; timeOnly?: boolean }) {
  const { sellerName, findPocket } = useApp();
  const seller = cleanText(sellerName(row.sellerId), 40);
  const pocket = showPocket ? findPocket(row.pocket) : undefined;
  const v = describeRow(row, seller, timeOnly ? new Date(row.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : stamp(row.at), pocket ? cleanText(pocket.name, 24) : undefined);
  return (
    <ListRow
      last={last} onPress={onPress} a11y={`${v.title}, ${v.rightSub ?? ""} ${v.right ?? ""}`}
      avatar={<Avatar label={v.avatar.label} icon={v.avatar.icon} tone={v.avatar.tone} />}
      title={v.title} sub={v.sub} right={v.right} rightTone={v.rightTone} rightSub={v.rightSub} rightSubTone={v.rightSubTone}
    />
  );
}
