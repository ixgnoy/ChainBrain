// A pocket as a Ryt list row (avatar, name, "2 sellers · until 23:59", balance), plus helpers for the fact pills.
import React from "react";
import { View } from "react-native";
import { ListRow, Avatar } from "../ui/kit";
import { Money } from "../ui/Money";
import { T } from "../ui/Text";
import { c } from "../tokens";
import { cleanText } from "../lib/sanitize";
import { NEVER } from "../lib/shared";
import { hkd, money, dateLabel, shortAddr } from "../lib/util";
import { useApp } from "../store";
import type { Pocket } from "../store";
import { tokenSymbol } from "../lib/runtime";

export const isExpired = (p: { revoked: boolean; expiresAt: bigint | number }) => !p.revoked && Number(p.expiresAt) * 1000 < Date.now();

/** "until 23:59" today, "until 15 Oct" later. */
export function untilText(expiresAt: bigint | number, now = Date.now()) {
  const d = new Date(Number(expiresAt) * 1000), n = new Date(now);
  const sameDay = d.toDateString() === n.toDateString();
  // the year only when it is not this one: an ongoing pocket ends a year from today, which must not read as today
  return sameDay ? `until ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : `until ${d.getFullYear() === n.getFullYear() ? dateLabel(Number(expiresAt)).replace(/ \d{4}$/, "") : dateLabel(Number(expiresAt))}`;
}

/** "2 sellers · until 23:59" (the agent's address lives in the pocket's Details, not on every row). */
export function pocketLine(p: Pick<Pocket, "allowed" | "revoked" | "expiresAt" | "agent" | "frozen">) {
  if (p.revoked) return "Turned off";
  if (p.frozen) return "Frozen by the Sentinel";
  if (isExpired(p)) return "Ended";
  return `${p.allowed.length}\u00a0seller${p.allowed.length === 1 ? "" : "s"} · ${untilText(p.expiresAt)}`;
}

export type PocketState = "Active" | "Revoked" | "Expired" | "Waiting for you" | "Frozen";
export const pocketState = (p: Pick<Pocket, "revoked" | "expiresAt" | "frozen">, waiting = false): PocketState => (p.revoked ? "Revoked" : p.frozen ? "Frozen" : isExpired(p) ? "Expired" : waiting ? "Waiting for you" : "Active");
export const STATE_TONE = { Active: "positive", Revoked: "negative", Expired: "muted", "Waiting for you": "warning", Frozen: "warning" } as const;

/** Fact pills shown on a pocket page. */
export function factPills(p: Pick<Pocket, "cap" | "askAbove">): string[] {
  const out = [`Cap ${money(p.cap)}`];
  if (p.askAbove === NEVER || p.askAbove > p.cap) out.push("Never asks you");
  else if (p.askAbove === 0n) out.push("Asks every time");
  else out.push(`Ask above ${money(p.askAbove)}`);
  return out;
}

export function PocketRow({ pocket, onPress, last, lit }: { pocket: Pocket; onPress: () => void; last?: boolean; /** pressed by the auto-play */ lit?: boolean }) {
  const { pending, ledger } = useApp();
  const state = pocketState(pocket, pending.some((a) => a.pocket.toLowerCase() === pocket.address.toLowerCase()));
  // a thin bar under the subtitle: how much of this pocket's money the agent has used (only once it has spent something)
  const spent = React.useMemo(() => ledger.filter((r) => r.kind === "payment" && r.pocket.toLowerCase() === pocket.address.toLowerCase()).reduce((n, r) => n + (r.amount ?? 0n), 0n), [ledger, pocket.address]);
  const total = spent + pocket.balance;
  const share = total > 0n ? Math.min(1, Number((spent * 1000n) / total) / 1000) : 0;
  return (
    <ListRow
      last={last} onPress={onPress} lit={lit}
      a11y={`${cleanText(pocket.name, 30)} card, ${hkd(pocket.balance)} ${tokenSymbol()}`}
      avatar={<Avatar label={pocket.name} tone={pocket.revoked || isExpired(pocket) ? "fill" : "soft"} />}
      title={cleanText(pocket.name, 30)} sub={pocketLine(pocket)}
      extra={spent > 0n ? <View accessibilityLabel={`${hkd(spent)} of ${hkd(total)} used`} style={{ height: 4, borderRadius: 2, backgroundColor: c.fill, marginTop: 6, overflow: "hidden" }}><View style={{ width: `${share * 100}%`, height: 4, borderRadius: 2, backgroundColor: c.accent }} /></View> : undefined}
    >
      {/* the balance rolls when it changes while the row is on screen; the state shows only when it is not Active (noise otherwise) */}
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <Money value={hkd(pocket.balance)} v="row" decorative />
        {state !== "Active" ? <T v="sub" color={STATE_TONE[state]}>{state}</T> : null}
      </View>
    </ListRow>
  );
}
