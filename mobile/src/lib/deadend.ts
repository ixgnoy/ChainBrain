// Scene 8: the agent stopped because no seller was allowed. Reads the turn's events and lists each seller it tried and why
// it was refused (from the get_quote results and refusal events), with a one-tap fix. No React Native imports.
import { ledgerFrom, sameAddr, type WalletEvent } from "./events";
import { plainReason } from "./plain";

export type Tried = { sellerId: string; sku?: string; price?: bigint; reasons: string[] };
export type DeadEnd = {
  tried: Tried[];
  /** Raise the cap to `cap` (cheapest over-cap quote) and add `topUp` to the pocket when its balance is below that price. */
  fix?: { cap: bigint; topUp: bigint };
  /** Only sellers missing from the list: nothing to raise, the owner has to allow one. */
  needsSeller: boolean;
  /** Cheapest price seen: the next task needs a maximum of at least this. */
  minPrice?: bigint;
};

const HARD = new Set(["OVER_CAP", "OVER_BUDGET", "SELLER_NOT_ALLOWED", "PRICE_ABOVE_INTENT"]);

export function deadEndOf(events: WalletEvent[], pocket: { address: string; cap: bigint; balance: bigint }): DeadEnd | null {
  const mine = events.filter((e) => sameAddr(e.pocket, pocket.address));
  if (mine.some((e) => e.type === "payment")) return null;
  const rows = ledgerFrom(mine).filter((r) => (r.kind === "blocked" || r.kind === "refusal") && r.sellerId);
  // a frozen pocket is not a dead end the owner fixes by allowing a seller: the Sentinel's card offers Unfreeze instead
  if (rows.some((r) => r.reasons.includes("POCKET_FROZEN"))) return null;
  const tried: Tried[] = [];
  for (const r of rows) {
    const hit = tried.find((t) => t.sellerId === r.sellerId && t.sku === r.sku);
    if (hit) { hit.reasons = [...new Set([...hit.reasons, ...r.reasons])]; hit.price ??= r.amount; }
    else tried.push({ sellerId: r.sellerId!, sku: r.sku, price: r.amount, reasons: [...r.reasons] });
  }
  if (!tried.length || !tried.some((t) => t.reasons.some((x) => HARD.has(x)))) return null;
  const over = tried.filter((t) => t.price != null && t.reasons.some((x) => x === "OVER_CAP" || x === "OVER_BUDGET"));
  const cheapest = over.length ? over.reduce((a, b) => (b.price! < a.price! ? b : a)) : undefined;
  const fix = cheapest ? { cap: cheapest.price! > pocket.cap ? cheapest.price! : pocket.cap, topUp: cheapest.price! > pocket.balance ? cheapest.price! - pocket.balance : 0n } : undefined;
  const prices = tried.map((t) => t.price).filter((x): x is bigint => x != null);
  return { tried, fix, needsSeller: !fix && tried.some((t) => t.reasons.includes("SELLER_NOT_ALLOWED")), minPrice: prices.length ? prices.reduce((a, b) => (b < a ? b : a)) : undefined };
}

export const whyText = (t: Tried) => (t.reasons.length ? t.reasons.map(plainReason).join(", ") : "not allowed");

/** "Ask again" after the fix: the owner's own sentence with a maximum that now fits ("…max US$0.005…" becomes "…max
 *  US$0.007…"), so the agent that understood it the first time understands it again, on any network. */
export function retryText(task: string, max: string): string {
  const t = task.trim();
  const limit = /\b(max(?:imum)?|under|up to|at most)\s+US\$\s?\d+(?:\.\d+)?/i;
  if (limit.test(t)) return t.replace(limit, (_m, w: string) => `${w} US$${max}`);
  return `${t.replace(/[.\s]+$/, "")}. Max US$${max}, by tonight.`;
}
