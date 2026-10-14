// A pocket as a Ryt list row (avatar, name, "2 sellers · until 23:59", balance), plus helpers for the fact pills.
import React from "react";
import { ListRow, Avatar } from "../ui/kit";
import { cleanText } from "../lib/sanitize";
import { NEVER } from "../lib/shared";
import { usd, money, dateLabel } from "../lib/util";
import type { Pocket } from "../store";

export const isExpired = (p: { revoked: boolean; expiresAt: bigint | number }) => !p.revoked && Number(p.expiresAt) * 1000 < Date.now();

/** "until 23:59" today, "until 15 Oct" later. */
export function untilText(expiresAt: bigint | number, now = Date.now()) {
  const d = new Date(Number(expiresAt) * 1000), n = new Date(now);
  const sameDay = d.toDateString() === n.toDateString();
  return sameDay ? `until ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : `until ${dateLabel(Number(expiresAt)).replace(/ \d{4}$/, "")}`;
}

export function pocketLine(p: Pick<Pocket, "allowed" | "revoked" | "expiresAt">) {
  if (p.revoked) return "Turned off";
  if (isExpired(p)) return "Expired";
  return `${p.allowed.length} seller${p.allowed.length === 1 ? "" : "s"} · ${untilText(p.expiresAt)}`;
}

/** Fact pills shown on a pocket page. */
export function factPills(p: Pick<Pocket, "cap" | "askAbove">): string[] {
  const out = [`Cap ${money(p.cap)}`];
  if (p.askAbove === NEVER || p.askAbove > p.cap) out.push("Never asks you");
  else if (p.askAbove === 0n) out.push("Asks every time");
  else out.push(`Ask above ${money(p.askAbove)}`);
  return out;
}

export function PocketRow({ pocket, onPress, last }: { pocket: Pocket; onPress: () => void; last?: boolean }) {
  return (
    <ListRow
      last={last} onPress={onPress}
      a11y={`${cleanText(pocket.name, 30)} pocket, ${usd(pocket.balance)} USDC`}
      avatar={<Avatar label={pocket.name} tone={pocket.revoked || isExpired(pocket) ? "fill" : "soft"} />}
      title={cleanText(pocket.name, 30)} sub={pocketLine(pocket)}
      right={money(pocket.balance)}
    />
  );
}
