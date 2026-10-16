import React from "react";
import { View, type ViewStyle } from "react-native";
import { useApp } from "../store";
import { c, F } from "../tokens";
import { Press } from "../ui/kit";
import { AgentAvatar } from "../ui/AgentAvatar";
import { agentInfo } from "../../../shared/sim/agents";
import { Rise } from "../ui/Rise";
import { Figure, T } from "../ui/Text";
import { Icon, type IconName } from "../ui/Icon";
import { cleanText } from "../lib/sanitize";
import { describeRow } from "../lib/plain";
import { dayLabel, timeLabel } from "../lib/util";
import type { LedgerRow } from "../lib/events";

export type SquareTone = "fill" | "ink" | "blue" | "vermillion" | "green";
const SQ: Record<SquareTone, { bg: string; fg: string }> = {
  fill: { bg: c.fill, fg: c.ink },
  ink: { bg: c.ink, fg: c.white },
  blue: { bg: c.blueSoft, fg: c.blueInk },
  vermillion: { bg: c.vermillionSoft, fg: c.vermillionInk },
  green: { bg: c.greenSoft, fg: c.greenInk },
};

/** "TradeWire" -> "TW", "Harbour Wines" -> "HW", "ShadyFeed" -> "SF": the two letters on a seller's brand square. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
  const caps = (words[0] ?? "?").match(/[A-Z0-9]/g) ?? [];
  return (caps.length >= 2 ? caps.slice(0, 2).join("") : (words[0] ?? "?").slice(0, 2)).toUpperCase();
}

/** VaultBank's brand square: 44 px, radius 12, a seller's initials in Clash or a thin-line icon. */
export function BrandSquare({ label, icon, tone = "fill" }: { label?: string; icon?: IconName; tone?: SquareTone }) {
  const t = SQ[tone];
  return (
    <View style={{ width: 44, height: 44, borderRadius: 12, borderCurve: "continuous", backgroundColor: t.bg, alignItems: "center", justifyContent: "center" } as ViewStyle}>
      {icon ? <Icon name={icon} size={20} color={t.fg} stroke={1.75} /> : <T v="head" style={{ color: t.fg, fontSize: 15, lineHeight: 18, letterSpacing: 0.2 }}>{initials(label ?? "?")}</T>}
    </View>
  );
}

/** One row of VaultBank's transaction list: the brand square, the name in Clash over a small category line, the amount in
 *  Clash on the right with a small second line under it. Every Activity row (payments, attacks, Radar, Sentinel) uses it. */
export function TxRow({ square, title, sub, subLead, subTone = "muted", right, rightTone = "ink", rightSub, rightSubTone = "muted", strike, onPress, a11y, last, titleLines = 1 }: {
  square: React.ReactNode; title: string; sub?: string; /** before the small line (the acting agent's mark, beside its name) */ subLead?: React.ReactNode; subTone?: "muted" | "vermillionInk";
  right?: string; rightTone?: "ink" | "muted" | "greenInk"; rightSub?: string; rightSubTone?: "muted" | "blueInk" | "vermillionInk" | "greenInk" | "ink2";
  strike?: boolean; onPress?: () => void; a11y?: string; last?: boolean; titleLines?: number;
}) {
  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 68, paddingLeft: 16, paddingRight: 14, paddingVertical: 10 }}>
      {square}
      <View style={{ flex: 1, gap: 2 }}>
        <T v="head" numberOfLines={titleLines} style={{ fontSize: 16, lineHeight: 21, textDecorationLine: strike ? "line-through" : "none" }}>{title}</T>
        {sub ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            {subLead}
            <T v="sub" color={subTone} numberOfLines={1} style={{ flexShrink: 1, fontSize: 12.5, lineHeight: 17 }}>{sub}</T>
          </View>
        ) : null}
      </View>
      {right || rightSub ? (
        <View style={{ alignItems: "flex-end", gap: 2, maxWidth: "38%" }}>
          {right ? <Figure text={right} size={16} color={rightTone} strike={strike} accessible={false} /> : null}
          {rightSub ? <T v="cap" color={rightSubTone} numberOfLines={1} style={{ fontFamily: rightSubTone === "muted" ? F.medium : F.semi }}>{rightSub}</T> : null}
        </View>
      ) : null}
    </View>
  );
  return (
    <View>
      {onPress ? <Press kind="row" onPress={onPress} haptics="light" accessibilityRole="button" accessibilityLabel={a11y ?? title}>{body}</Press> : <View accessible accessibilityLabel={a11y ?? title}>{body}</View>}
      {last ? null : <View style={{ height: 1, backgroundColor: c.fill, marginLeft: 72, marginRight: 16 }} />}
    </View>
  );
}

/** A day group's header inside its white card (VaultBank: "Transactions" over "Thursday, July 22"). */
export function DayHead({ at }: { at: number }) {
  const label = dayLabel(at);
  const date = new Date(at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const named = label === "Today" || label === "Yesterday";
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4, gap: 2 }} accessibilityRole="header" accessible accessibilityLabel={named ? `${label}, ${date}` : date}>
      <T v="head">{named ? label : date.split(" ").slice(1).join(" ")}</T>
      <T v="cap" color="muted">{named ? date : date.split(" ")[0]}</T>
    </View>
  );
}

const STATUS_TONE = { warning: "blueInk", positive: "greenInk", negative: "vermillionInk", muted: "muted" } as const;

/** One activity item: the seller's brand square, its name over its category (or what happened, for refusals and your own
 *  changes), the amount right with a small second line: the time for a plain payment, else the status ("Co-signed", "Refused").
 *  With more than one agent, the one that acted leads the small line: its mark (from shared/brand) beside its name. Pressed as a row (0.985). */
export function ActivityRow({ row, onPress, last, showPocket, timeOnly, showAgent = true }: { row: LedgerRow; onPress?: () => void; last?: boolean; showPocket?: boolean; timeOnly?: boolean; showAgent?: boolean }) {
  const { sellerName, findPocket, agents, cfg } = useApp();
  const agent = showAgent && row.kind !== "owner" && agents.length > 1 ? agentInfo(row.agent ?? findPocket(row.pocket)?.agentId ?? "") : undefined;
  const seller = cleanText(sellerName(row.sellerId), 40);
  const pocket = showPocket ? findPocket(row.pocket) : undefined;
  const where = pocket ? cleanText(pocket.name, 24) : undefined;
  const v = describeRow(row, seller, "", where);
  const when = timeOnly || dayLabel(row.at) === "Today" ? new Date(row.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : dayLabel(row.at);
  // owner transactions are neutral grey; amounts carry a sign only when money moves: "-" paid out, "+" funding and returns
  const owner = row.kind === "owner" && row.ownerKind !== "revoke";
  // a refusal is the guard doing its job: the amount is struck through, the reason sits under the name
  const guard = v.filter === "refused" && row.kind !== "owner" && row.outcome !== "paid";
  const money = v.right && row.kind === "payment" ? `-${v.right}` : v.right && row.kind === "owner" && (row.ownerKind === "fund" || row.ownerKind === "return") ? `+${v.right}` : v.right;
  const taskCap = !v.right && row.kind === "intent" ? /Price:[^\n]*?(US\$\d+(?:\.\d+)?)/.exec(row.text ?? "")?.[1] : undefined;
  const right = money ?? taskCap;
  const rightTone = money?.startsWith("+") ? "greenInk" : guard || taskCap ? "muted" : "ink";
  // a seller row reads like VaultBank's: the seller's category under its name ("Research data"), then the pocket
  const seller_ = row.kind === "payment" || row.kind === "refusal" || row.kind === "blocked" || row.kind === "approval" ? cfg?.sellers.find((s) => s.id === row.sellerId) : undefined;
  const plainPaid = !guard && row.outcome === "paid" && !row.cosigned && row.kind === "payment";
  // with more than one agent, the one that acted leads the line (its mark beside its name) and stands in for the pocket
  const lead = agent && !guard;
  const category = seller_ ? cleanText(seller_.category, 30) : undefined;
  const base = (guard || row.outcome === "pending" || !category ? v.sub : [category, !lead && where !== category ? where : undefined].filter(Boolean).join(" · ")).replace(/\s·\s*$/, "");
  const sub = lead ? [agent.name, category ?? base.replace(where ? ` · ${where}` : "", "")].filter(Boolean).join(" · ") : base;
  const rightSub = plainPaid ? when : v.rightSub;
  const strike = guard && row.kind !== "approval";
  const square = seller_ && !guard && row.outcome !== "pending" ? <BrandSquare label={seller} tone="fill" />
    : <BrandSquare icon={guard ? "ban" : (v.avatar.icon as IconName | undefined) ?? "check"} tone={owner ? "fill" : guard ? "vermillion" : v.avatar.tone === "warning" ? "blue" : v.avatar.tone === "negative" ? "vermillion" : "fill"} />;
  return (
    <TxRow square={square} title={v.title} subLead={lead ? <AgentAvatar kind={agent.id} size={15} /> : undefined} sub={sub} subTone={guard ? "vermillionInk" : "muted"} strike={strike}
      right={right} rightTone={rightTone} rightSub={rightSub} rightSubTone={plainPaid ? "muted" : guard ? "vermillionInk" : STATUS_TONE[v.rightSubTone as keyof typeof STATUS_TONE] ?? "muted"}
      onPress={onPress} last={last}
      a11y={`${v.title}${agent ? `, ${agent.name}` : ""}, ${v.rightSub ?? ""} ${right ?? ""}${plainPaid ? `, ${timeLabel(row.at)}` : ""}`} />
  );
}

/** An ActivityRow that enters (fade + rise) when it is new and lets its neighbours slide to their new place. `delay` -1: no entrance. */
export function ActivityItem({ delay = 0, ...p }: React.ComponentProps<typeof ActivityRow> & { delay?: number }) {
  return <Rise delay={Math.max(delay, 0)} instant={delay < 0} dy={10} layout><ActivityRow {...p} /></Rise>;
}
