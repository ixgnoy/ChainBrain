// The seller's view of the wallet event trail: payments it received and the attempts a buyer's pocket refused.
import { buildLedger } from "../lib/ledger";
import type { WalletEvent } from "../lib/events";

export type SaleRow = {
  key: string;
  at: number;
  pocket: string;
  sku: string;
  amount?: bigint;
  outcome: "paid" | "refused";
  /** One plain sentence, written for the seller. */
  why?: string;
  reasons: string[];
  cosigned?: boolean;
  tx?: string;
};

/** Refusal reasons in the seller's words (the codes stay available under "Technical details"). */
export const SELLER_REASON: Record<string, string> = {
  SELLER_NOT_ALLOWED: "The buyer's pocket doesn't allow your shop",
  OVER_CAP: "Above the buyer's limit per payment",
  OVER_BUDGET: "The buyer's pocket didn't have enough left",
  POCKET_REVOKED: "The buyer stopped their agent",
  POCKET_EXPIRED: "The buyer's pocket had expired",
  PRICE_ABOVE_INTENT: "More than the buyer agreed to pay",
  INTENT_TOTAL_REACHED: "The buyer's task budget was used up",
  INTENT_ITEMS_REACHED: "The buyer already bought what they asked for",
  INTENT_EXPIRED: "The buyer's task had ended",
  INTENT_NOT_CONFIRMED: "The buyer hadn't confirmed the task",
  NEEDS_OWNER_APPROVAL: "Waiting for the buyer's OK",
  APPROVAL_EXPIRED: "The buyer didn't answer in time",
  OWNER_DECLINED: "The buyer said no",
  QUOTE_MISMATCH: "Your payment request didn't match your quote",
  QUOTE_ALREADY_PAID: "This order was already paid",
  QUOTE_UNKNOWN: "Unknown order",
  DISCLOSURE_REFUSED: "You asked for buyer data; the wallet refused",
  SIGNATURE_TYPE_NOT_ALLOWED: "You asked for a signature; the wallet refused",
  SETTLEMENT_FAILED: "The payment didn't go through",
  NOT_THIS_AGENT: "The buyer's agent key didn't match",
  COUNTERPARTY_HIGH_RISK: "Your wallet's funds trace to a high-risk source",
  COUNTERPARTY_REVIEW: "Your wallet's funds need the buyer's review",
  POCKET_FROZEN: "The buyer's pocket was frozen",
  SENTINEL_HOLD: "Waiting for the buyer's OK",
};
export const sellerReason = (codes: string[]) => (codes.length ? SELLER_REASON[codes[0]] ?? "Refused by the buyer's wallet" : "Refused by the buyer's wallet");

const sameId = (a: unknown, id: string) => typeof a === "string" && a.toLowerCase() === id.toLowerCase();

/** Everything that happened to one seller, newest first. Disclosure attempts count as refused sales. */
export function salesFor(events: WalletEvent[], sellerId: string): SaleRow[] {
  const rows: SaleRow[] = buildLedger(events)
    .filter((r) => sameId(r.sellerId, sellerId))
    .map((r) => ({ key: r.key, at: r.at, pocket: r.pocket, sku: r.sku, amount: r.amount, outcome: r.outcome, reasons: r.reasons, why: r.outcome === "refused" ? sellerReason(r.reasons) : undefined, cosigned: r.cosigned, tx: r.tx }));
  events.forEach((e, i) => {
    if (e.type !== "disclosure" || !sameId(e.sellerId, sellerId)) return;
    const reasons = Array.isArray(e.refused) ? e.refused.filter((c: unknown): c is string => typeof c === "string") : ["DISCLOSURE_REFUSED"];
    rows.push({ key: `d-${i}-${e.at}`, at: e.at, pocket: e.pocket ?? "", sku: typeof e.sku === "string" ? e.sku : "", outcome: "refused", reasons, why: sellerReason(reasons) });
  });
  return rows.sort((a, b) => b.at - a.at);
}

export type Summary = { earned: bigint; paid: number; refused: number; buyers: number; average: bigint };
export function summarise(rows: SaleRow[]): Summary {
  const paid = rows.filter((r) => r.outcome === "paid");
  const earned = paid.reduce((n, r) => n + (r.amount ?? 0n), 0n);
  return { earned, paid: paid.length, refused: rows.length - paid.length, buyers: new Set(paid.map((r) => r.pocket.toLowerCase())).size, average: paid.length ? earned / BigInt(paid.length) : 0n };
}

/** Buyers are agent pockets: shown by the last four characters of the pocket address. */
export const buyerTag = (pocket: string) => (pocket ? pocket.slice(-4).toUpperCase() : "----");
