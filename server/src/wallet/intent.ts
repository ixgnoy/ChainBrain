import { z } from "zod";
import type { Hex } from "viem";
import { parseAmount, formatAmount } from "./money";
import { cfg } from "../chains";
import type { Reason } from "./reasons";

export const IntentInput = z.object({
  request: z.string().describe("The owner's original words"),
  description: z.string().min(3).describe("What to buy, in plain words"),
  maxPricePerItem: z.string().describe('In the pocket currency, e.g. "2.00"'),
  maxTotal: z.string().describe('In the pocket currency, for the whole task, e.g. "2.00"'),
  maxItems: z.number().int().positive(),
  deadline: z.string().describe("ISO 8601 with offset, e.g. 2026-10-17T23:59:00+08:00"),
});
export type IntentInput = z.infer<typeof IntentInput>;
export type Intent = IntentInput & { intentHash: Hex; status: "awaiting_owner" | "confirmed" | "declined" };

/** Fixed template: the owner never confirms an AI paraphrase of an AI interpretation. */
export function renderIntent(i: IntentInput): string {
  // Owners are in Hong Kong: show the deadline in HKT (UTC+8), not the server's zone.
  const c = cfg().currency;
  const d = new Date(Date.parse(i.deadline) + 8 * 3600_000).toISOString().replace("T", " ").slice(0, 16);
  return [
    `Buy: ${i.description}`,
    `Price: at most ${c}${formatAmount(parseAmount(i.maxPricePerItem))} each, ${c}${formatAmount(parseAmount(i.maxTotal))} in total, up to ${i.maxItems} item${i.maxItems === 1 ? "" : "s"}`,
    `Deadline: ${d} HKT`,
  ].join("\n");
}

/** Deterministic quote-vs-intent check, run by the tool layer before any signature. */
export function checkAgainstIntent(i: Intent | undefined, s: { spent: bigint; items: number }, amount: bigint, now = Date.now() / 1000): Reason | undefined {
  if (!i || i.status !== "confirmed") return "INTENT_NOT_CONFIRMED";
  if (now >= Date.parse(i.deadline) / 1000) return "INTENT_EXPIRED";
  if (amount > parseAmount(i.maxPricePerItem)) return "PRICE_ABOVE_INTENT";
  if (s.spent + amount > parseAmount(i.maxTotal)) return "INTENT_TOTAL_REACHED";
  if (s.items >= i.maxItems) return "INTENT_ITEMS_REACHED";
  return undefined;
}
