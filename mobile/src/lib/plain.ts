// Plain-language wording for the owner UI. Reason codes, tool names and hashes stay out of the main screens (they live in "Details").
import type { LedgerRow } from "./events";
import { usd, shortHex } from "./util";
import { cleanText } from "./sanitize";

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
  COUNTERPARTY_HIGH_RISK: "Radar traced the seller's money to a high-risk source",
  COUNTERPARTY_REVIEW: "the seller's money looks risky, so it needs your OK",
  POCKET_FROZEN: "the pocket is frozen until you unfreeze it",
  SENTINEL_HOLD: "the Sentinel saw something unusual, so it needs your OK",
  REVERTED: "the pocket refused it on-chain",
};
const ASK: Record<string, string> = {
  owner_full_name: "your full name", owner_email: "your email", owner_phone: "your phone number", wallet_history: "your wallet history",
  other_pockets: "your other pockets", owner_address: "your address", balance: "your balance", kyc: "your ID documents",
};
/** "your full name, your email and an approval signature": what a seller asked for, in words. */
export function plainAsks(asked: string[], sign: boolean): string {
  // seller-provided strings: cleaned and bounded before they reach a sentence
  const parts = asked.slice(0, 6).map((a) => ASK[a] ?? `your ${cleanText(String(a), 40).replace(/^owner_/, "").replace(/_/g, " ")}`);
  if (sign) parts.push("an approval signature");
  if (!parts.length) return "your data";
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

export const plainReason = (code: string) => PLAIN_REASONS[code] ?? "not allowed by your rules";
const cap1 = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export type RowView = {
  title: string; sub: string; right?: string; rightSub?: string;
  rightTone: "ink" | "positive" | "muted" | "negative"; rightSubTone: "muted" | "negative" | "warning" | "positive";
  avatar: { label?: string; icon?: "ban" | "clock" | "check" | "layers" | "plus" | "undo" | "lock" | "shield" | "settings"; tone: "soft" | "warning" | "negative" | "fill" };
  filter: "paid" | "refused" | "needs" | "other";
  /** Reason codes, shown as small pills next to the plain sentence (judges score them). */
  codes: string[];
  /** Short transaction hash, muted, under the row. */
  foot?: string;
};

/** What the owner sees for one ledger row. `where` is the pocket name and `when` the formatted date. */
export function describeRow(row: LedgerRow, seller: string, when: string, where?: string): RowView {
  const v = describeBase(row, seller, when, where);
  const codes = v.filter === "refused" ? row.reasons : [];
  return { ...v, codes, foot: row.tx ? `Tx ${shortHex(row.tx, 10, 6)}` : undefined };
}

const OWNER_ICON = { create: "layers", fund: "plus", return: "undo", revoke: "lock", seller: "shield", cap: "settings", ask: "settings" } as const;
function describeBase(row: LedgerRow, seller: string, when: string, where?: string): Omit<RowView, "codes" | "foot"> {
  const bad = row.outcome === "refused" || row.outcome === "declined";
  const tail = [where, when].filter(Boolean).join(" · ");
  const money = row.amount != null ? `US$${usd(row.amount)}` : undefined;
  if (row.kind === "owner") {
    const k = (row.ownerKind ?? "fund") as keyof typeof OWNER_ICON;
    const rev = k === "revoke";
    return { title: row.text ?? "Transaction", sub: [row.detail, where, when].filter(Boolean).join(" · "), right: money, rightTone: "ink", rightSubTone: "muted", avatar: { icon: OWNER_ICON[k] ?? "check", tone: rev ? "negative" : "soft" }, filter: "other" };
  }
  if (row.kind === "intent") {
    const first = (row.text ?? "").split("\n")[0].replace(/^Buy:\s*/i, "");
    return { title: row.outcome === "approved" ? "Task confirmed" : "Task declined", sub: [first, when].filter(Boolean).join(" · "), rightTone: "ink", rightSubTone: bad ? "negative" : "muted", rightSub: bad ? "Declined" : undefined, avatar: { icon: bad ? "ban" : "check", tone: bad ? "negative" : "soft" }, filter: bad ? "refused" : "other" };
  }
  if (row.kind === "forced") {
    return bad
      ? { title: "Blocked transfer", sub: `${money ?? "Money"} to an address you never allowed · ${when}`, right: money, rightSub: "Reverted", rightTone: "muted", rightSubTone: "negative", avatar: { icon: "shield", tone: "negative" }, filter: "refused" }
      : { title: "Transfer out", sub: tail, right: money, rightSub: "Sent", rightTone: "ink", rightSubTone: "negative", avatar: { icon: "ban", tone: "negative" }, filter: "other" };
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

/** The pitch line: if the agent is hijacked, the most it can lose is the pocket balance, and only to the allowed sellers. */
export function worstCase(balance: bigint, sellers: string[], dead = false): string {
  if (dead) return "This pocket is switched off. The agent can't spend anything from it.";
  if (balance === 0n) return "The pocket is empty, so a hijacked agent could not lose anything.";
  const to = sellers.length === 0 ? "to no one: no seller is allowed" : `only to ${sellers.length === 1 ? sellers[0] : `${sellers.slice(0, -1).join(", ")} and ${sellers.at(-1)}`}`;
  return `If the agent is hijacked, the most it can lose is US$${usd(balance)}, ${to}.`;
}
