/** Every refusal carries one of these, so the model can reason about it instead of seeing an error. */
export const REASONS = {
  SELLER_NOT_ALLOWED: "This seller is not in the pocket's allowlist",
  OVER_CAP: "Above the pocket's per-payment cap",
  OVER_BUDGET: "Not enough left in the pocket",
  POCKET_REVOKED: "The owner revoked this pocket",
  POCKET_EXPIRED: "The pocket has expired",
  PRICE_ABOVE_INTENT: "The price is above the intent's max per item",
  INTENT_TOTAL_REACHED: "This would exceed the intent's total",
  INTENT_ITEMS_REACHED: "The intent's item count is already reached",
  INTENT_EXPIRED: "The intent's deadline has passed",
  INTENT_NOT_CONFIRMED: "The owner has not confirmed an intent for this task",
  NEEDS_OWNER_APPROVAL: "Above the ask-me threshold: call ask_owner with this quote first",
  APPROVAL_EXPIRED: "The owner's approval window passed; ask again",
  OWNER_DECLINED: "The owner declined",
  QUOTE_MISMATCH: "The seller's payment request differs from the quote",
  QUOTE_ALREADY_PAID: "This quote is already paid",
  QUOTE_UNKNOWN: "No such quote",
  DISCLOSURE_REFUSED: "The seller asked for data beyond the purchase; refused and shown to the owner",
  SIGNATURE_TYPE_NOT_ALLOWED: "The wallet only signs in-rule USDC payments it built itself",
  SETTLEMENT_FAILED: "Settlement failed",
  NOT_THIS_AGENT: "This pocket belongs to a different agent key",
  COUNTERPARTY_HIGH_RISK: "Radar traced this seller's funds to a high-risk source (e.g. a drainer or sanctioned address); choose another seller",
  COUNTERPARTY_REVIEW: "Radar found risk in this seller's funds: call ask_owner with this quote first",
  POCKET_FROZEN: "The pocket is frozen (by the Sentinel or the owner); only the owner can unfreeze",
  SENTINEL_HOLD: "The Sentinel saw unusual behaviour: call ask_owner with this quote; the owner must co-sign the next payment",
} as const;

export type Reason = keyof typeof REASONS;
export const isReason = (s: string): s is Reason => s in REASONS;
