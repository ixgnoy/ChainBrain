// Plain-language wording for the owner UI. Reason codes, tool names and hashes stay out of the main screens (they live in "Details").
import type { LedgerRow } from "./events";
import { usd } from "./util";

export const PLAIN_REASONS: Record<string, string> = {
  SELLER_NOT_ALLOWED: "seller not on your list",
  OVER_CAP: "above the limit for one payment",
  OVER_BUDGET: "not enough left in the pocket",
  POCKET_REVOKED: "you turned this pocket off",
  POCKET_EXPIRED: "the pocket has expired",
  PRICE_ABOVE_INTENT: "above the price you set for this task",
  INTENT_TOTAL_REACHED: "over the total you set for this task",
  INTENT_ITEMS_REACHED: "already bought enough for this task",
  INTENT_EXPIRED: "the task deadline passed",
  INTENT_NOT_CONFIRMED: "you had not confirmed this task",
  NEEDS_OWNER_APPROVAL: "waiting for your OK",
  APPROVAL_EXPIRED: "your OK came too late",
  OWNER_DECLINED: "you declined",
  QUOTE_MISMATCH: "the seller's price changed",
  QUOTE_ALREADY_PAID: "already paid",
  QUOTE_UNKNOWN: "unknown price quote",
  DISCLOSURE_REFUSED: "the seller asked for more data than a purchase needs",
  SIGNATURE_TYPE_NOT_ALLOWED: "the seller asked for a signature that is not a payment",
  SETTLEMENT_FAILED: "the payment did not go through",
  NOT_THIS_AGENT: "this pocket belongs to a different agent",
};
export const plainReason = (code: string) => PLAIN_REASONS[code] ?? "not allowed by your rules";
const cap1 = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export type RowView = {
  title: string; sub: string; right?: string; rightSub?: string;
  rightTone: "ink" | "positive" | "muted" | "negative"; rightSubTone: "muted" | "negative" | "warning" | "positive";
  avatar: { label?: string; icon?: "ban" | "clock" | "check"; tone: "soft" | "warning" | "negative" | "fill" };
  filter: "paid" | "refused" | "needs" | "other";
};

/** What the owner sees for one ledger row. `where` is the pocket name and `when` the formatted date. */
export function describeRow(row: LedgerRow, seller: string, when: string, where?: string): RowView {
  const bad = row.outcome === "refused" || row.outcome === "declined";
  const tail = [where, when].filter(Boolean).join(" · ");
  const money = row.amount != null ? `US$${usd(row.amount)}` : undefined;
  if (row.kind === "intent") {
    const first = (row.text ?? "").split("\n")[0].replace(/^Buy:\s*/i, "");
    return { title: row.outcome === "approved" ? "Task confirmed" : "Task declined", sub: [first, when].filter(Boolean).join(" · "), rightTone: "ink", rightSubTone: bad ? "negative" : "muted", rightSub: bad ? "Declined" : undefined, avatar: { icon: bad ? "ban" : "check", tone: bad ? "negative" : "soft" }, filter: bad ? "refused" : "other" };
  }
  if (row.kind === "disclosure") {
    return { title: seller, sub: `Refused: ${plainReason("DISCLOSURE_REFUSED")}`, rightSub: "Refused", rightTone: "ink", rightSubTone: "negative", avatar: { icon: "ban", tone: "negative" }, filter: "refused" };
  }
  if (row.outcome === "pending") {
    return { title: seller, sub: `Waiting for your OK · ${when}`, right: money, rightSub: "Needs you", rightTone: "ink", rightSubTone: "warning", avatar: { icon: "clock", tone: "warning" }, filter: "needs" };
  }
  if (bad) {
    const why = row.reasons[0] ? `Refused: ${plainReason(row.reasons[0])}` : "Refused";
    return { title: seller, sub: why, right: money, rightSub: row.outcome === "declined" ? "Declined" : "Refused", rightTone: "muted", rightSubTone: "negative", avatar: { icon: "ban", tone: "negative" }, filter: "refused" };
  }
  return { title: seller, sub: tail, right: money, rightSub: row.cosigned ? "Co-signed" : row.outcome === "paid" ? "Paid" : cap1(row.outcome), rightTone: "ink", rightSubTone: "muted", avatar: { label: seller, tone: "soft" }, filter: row.outcome === "paid" ? "paid" : "other" };
}

/** Rows worth listing: an approved payment approval is already told by its payment row. */
export const visibleRows = (rows: LedgerRow[]) => rows.filter((r) => !(r.kind === "approval" && r.outcome === "approved"));
