// Port of server/src/wallet/intent.ts: the fixed intent template and the deterministic quote-vs-intent check.
import { formatHkd, parseHkd } from "./util";
import type { Hex } from "./types";

export type IntentInput = { request: string; description: string; maxPricePerItem: string; maxTotal: string; maxItems: number; deadline: string };
export type Intent = IntentInput & { intentHash: Hex; status: "awaiting_owner" | "confirmed" | "declined" };

export function renderIntent(i: IntentInput): string {
  const d = new Date(Date.parse(i.deadline) + 8 * 3600_000).toISOString().replace("T", " ").slice(0, 16);
  return [
    `Buy: ${i.description.replace(/\s+/g, " ").trim()}`, // one line: a line break in the agent's words must not start a fake "Price:" row
    `Price: at most HK$${formatHkd(parseHkd(i.maxPricePerItem))} each, HK$${formatHkd(parseHkd(i.maxTotal))} in total, up to ${i.maxItems} item${i.maxItems === 1 ? "" : "s"}`,
    `Deadline: ${d} HKT`,
  ].join("\n");
}

export function checkAgainstIntent(i: Intent | undefined, s: { spent: bigint; items: number }, amount: bigint, now = Date.now() / 1000): string | undefined {
  if (!i || i.status !== "confirmed") return "INTENT_NOT_CONFIRMED";
  if (now >= Date.parse(i.deadline) / 1000) return "INTENT_EXPIRED";
  if (amount > parseHkd(i.maxPricePerItem)) return "PRICE_ABOVE_INTENT";
  if (s.spent + amount > parseHkd(i.maxTotal)) return "INTENT_TOTAL_REACHED";
  if (s.items >= i.maxItems) return "INTENT_ITEMS_REACHED";
  return undefined;
}

/** server/src/wallet/reasons.ts */
export const REASONS: Record<string, string> = {
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
  SIGNATURE_TYPE_NOT_ALLOWED: "The wallet only signs in-rule eHKD payments it built itself",
  SETTLEMENT_FAILED: "Settlement failed",
  NOT_THIS_AGENT: "This pocket belongs to a different agent key",
  COUNTERPARTY_HIGH_RISK: "Radar traced this seller's funds to a high-risk source (e.g. a drainer or sanctioned address); choose another seller",
  COUNTERPARTY_REVIEW: "Radar found risk in this seller's funds: call ask_owner with this quote first",
  POCKET_FROZEN: "The pocket is frozen (by the Sentinel or the owner); only the owner can unfreeze",
  SENTINEL_HOLD: "The Sentinel saw unusual behaviour: call ask_owner with this quote; the owner must co-sign the next payment",
  NOT_OWNER: "Only the owner's key can change a pocket's rules",
  NOT_A_PURCHASE: "A message asking for money is not a purchase: the agent only pays allowed sellers, through a quote, for a confirmed task",
  OFFER_NOT_LOWER: "An offer must be lower than the seller's current price and never above its first quote (offering exactly its counter accepts it)",
  NEGOTIATION_ROUNDS_USED: "No offers left on this quote (3 at most): accept the seller's last counter or pay the quote",
  NEGOTIATION_NOT_OFFERED: "This seller does not take offers on this item: pay its price or pick another",
  DEAL_ALREADY_AGREED: "A price is already agreed on this quote: pay it (or ask_owner first if it needs approval)",
  QUOTE_ALREADY_APPROVED: "The owner already approved this quote's price, so it cannot be renegotiated",
};

/** server/src/wallet/scan.ts */
export function wrapUntrusted(sellerId: string, body: string): string {
  const safe = body.replace(/<\/?untrusted_content[^>]*>/gi, "[tag removed]");
  return `<untrusted_content source="${sellerId}">\n${safe}\n</untrusted_content>`;
}
const DATA_WORDS = /name|email|phone|address|history|pocket|balance|id_?number|passport|seed|private|kyc/i;
const SIGN_KEYS = /^(sign|signature|permit|approve|approval|typeddata)$/i;
export function scanRequests(body: string): { disclosures: string[]; signRequest: boolean } {
  let j: unknown;
  try { j = JSON.parse(body); } catch { return { disclosures: [], signRequest: false }; }
  const disclosures = new Set<string>();
  let signRequest = false;
  const walk = (v: unknown) => {
    if (Array.isArray(v)) for (const x of v) typeof x === "string" ? DATA_WORDS.test(x) && disclosures.add(x) : walk(x);
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) {
      if (SIGN_KEYS.test(k) || (k === "primaryType" && typeof x === "string")) signRequest = true;
      walk(x);
    }
  };
  walk(j);
  return { disclosures: [...disclosures], signRequest };
}
