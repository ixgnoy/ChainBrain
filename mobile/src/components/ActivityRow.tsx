import React from "react";
import { View } from "react-native";
import { useApp } from "../store";
import { c } from "../tokens";
import { Avatar, Press, StatusPill } from "../ui/kit";
import { AgentChip } from "../ui/AgentAvatar";
import { agentInfo } from "../../../shared/sim/agents";
import { Rise } from "../ui/Rise";
import { T } from "../ui/Text";
import { cleanText } from "../lib/sanitize";
import { describeRow } from "../lib/plain";
import { stamp } from "../lib/util";
import type { LedgerRow } from "../lib/events";

/** One activity item (DESIGN.md "Transaction Item"): 40 px squircle, seller in bold with the agent that acted (its mark),
 *  "Research data · 14 Oct, 1:32 PM" muted beneath, amount right with a status pill under it. Pressed as a row (0.985). */
export function ActivityRow({ row, onPress, last, showPocket, timeOnly, showAgent = true }: { row: LedgerRow; onPress?: () => void; last?: boolean; showPocket?: boolean; timeOnly?: boolean; showAgent?: boolean }) {
  const { sellerName, findPocket, agents } = useApp();
  const agent = showAgent && row.kind !== "owner" && agents.length > 1 ? agentInfo(row.agent ?? findPocket(row.pocket)?.agentId ?? "") : undefined;
  const seller = cleanText(sellerName(row.sellerId), 40);
  const pocket = showPocket ? findPocket(row.pocket) : undefined;
  const v = describeRow(row, seller, timeOnly ? new Date(row.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : stamp(row.at), pocket ? cleanText(pocket.name, 24) : undefined);
  // owner transactions are neutral grey; amounts carry a sign only when money moves: "-" paid out, "+" funding and returns
  const owner = row.kind === "owner" && row.ownerKind !== "revoke";
  // a refusal is the guard doing its job: neutral shield, not red (red stays for Revoke and money that moved)
  const guard = v.filter === "refused" && row.kind !== "owner" && row.outcome !== "paid";
  const money = v.right && row.kind === "payment" ? `-${v.right}` : v.right && row.kind === "owner" && (row.ownerKind === "fund" || row.ownerKind === "return") ? `+${v.right}` : v.right;
  const taskCap = !v.right && row.kind === "intent" ? /Price:[^\n]*?(US\$\d+(?:\.\d+)?)/.exec(row.text ?? "")?.[1] : undefined;
  const right = money ?? taskCap;
  const rightTone = money?.startsWith("+") ? "positive" : taskCap ? "muted" : v.rightTone;
  // one line each: the plain sentence only (reason codes and hashes live in the receipt's Details)
  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 56, paddingHorizontal: 16 }}>
      <Avatar label={v.avatar.label} icon={guard ? "ban" : v.avatar.icon} tone={owner ? "fill" : guard ? "negative" : v.avatar.tone === "soft" ? "blue" : v.avatar.tone} size={40} />
      <View style={{ flex: 1, gap: 2, paddingVertical: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <T v="row" w="bold" numberOfLines={1} style={{ flexShrink: 1, textDecorationLine: guard && row.kind !== "approval" ? "line-through" : "none" }}>{v.title}</T>
          {agent ? <AgentChip kind={agent.id} name={agent.name} /> : null}
        </View>
        {v.sub ? <T v="sub" color={guard ? "vermillionInk" : "muted"} numberOfLines={2}>{v.sub}</T> : null}
      </View>
      {right || v.rightSub ? (
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          {right ? <T v="row" w="bold" color={guard ? "muted" : rightTone} style={{ textDecorationLine: guard && row.kind !== "approval" ? "line-through" : "none" }}>{right}</T> : null}
          {v.rightSub ? <StatusPill label={v.rightSub} tone={guard ? "vermillion" : v.rightSubTone === "warning" ? "blue" : v.rightSubTone === "positive" ? "green" : v.rightSubTone === "negative" ? "vermillion" : "fill"} /> : null}
        </View>
      ) : null}
    </View>
  );
  return (
    <View>
      {onPress ? <Press kind="row" onPress={onPress} haptics="light" accessibilityRole="button" accessibilityLabel={`${v.title}${agent ? `, ${agent.name}` : ""}, ${v.rightSub ?? ""} ${right ?? ""}`}>{body}</Press> : body}
      {last ? null : <View style={{ height: 1, backgroundColor: c.fill, marginLeft: 70, marginRight: 16 }} />}
    </View>
  );
}

/** An ActivityRow that enters (fade + rise) when it is new and lets its neighbours slide to their new place. `delay` -1: no entrance. */
export function ActivityItem({ delay = 0, ...p }: React.ComponentProps<typeof ActivityRow> & { delay?: number }) {
  return <Rise delay={Math.max(delay, 0)} instant={delay < 0} dy={10} layout><ActivityRow {...p} /></Rise>;
}
