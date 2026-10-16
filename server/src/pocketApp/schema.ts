// The pocket-app spec in zod, built from the same fixed block catalogue the apps render (shared/sim/pocketApp.ts BLOCKS):
// every block a strict object with only its declared params, so a model can't add a style, a value or a link. The import-free
// validator in shared/sim (validateSpec) also runs on whatever this accepts: both must agree (test/pocket-app.test.ts runs the
// shared fixtures through both).
import { z } from "zod";
import { BLOCKS, BLOCK_TYPES, CATALOGUE_ID, LAYOUTS, PERIODS, cleanLabel } from "../../../shared/sim/pocketApp";

const usd = z.string().regex(/^\d{1,4}(?:\.\d{1,6})?$/).refine((s) => Number(s) > 0, "must be above zero");
const blockSchema = (t: (typeof BLOCK_TYPES)[number]) => {
  const params: Record<string, z.ZodType> = {};
  for (const [k, p] of Object.entries(BLOCKS[t].params as Record<string, { kind: string; values?: readonly string[]; min?: number; max?: number }>)) {
    params[k] = (p.kind === "enum" ? z.enum(p.values as [string, ...string[]]) : z.number().int().min(p.min!).max(p.max!)).nullable().optional();
  }
  return z.strictObject({ type: z.literal(t), ...params }).describe(BLOCKS[t].description);
};
export const Block = z.discriminatedUnion("type", BLOCK_TYPES.map(blockSchema) as unknown as [z.ZodObject<any>, ...z.ZodObject<any>[]]);

export const Cadence = z.strictObject({
  every: z.enum(["day", "weekday", "week", "month"]),
  weekday: z.number().int().min(1).max(7).nullable().optional(),
  dayOfMonth: z.number().int().min(1).max(28).nullable().optional(),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
});
export const Routine = z.strictObject({
  kind: z.enum(["schedule", "price-watch", "renewals"]),
  cadence: Cadence,
  items: z.array(z.strictObject({ sellerId: z.string().max(40), sku: z.string().max(60) })).min(1).max(4),
  allowance: z.strictObject({ amount: usd, period: z.enum(PERIODS as unknown as [string, ...string[]]) }),
  limitPrice: usd.nullable().optional(),
});
export const Spec = z.strictObject({
  v: z.literal(1),
  catalogue: z.literal(CATALOGUE_ID),
  layout: z.enum(LAYOUTS as unknown as [string, ...string[]]),
  title: z.string().min(1).max(28).refine((s) => cleanLabel(s) === s.replace(/\s+/g, " ").trim(), "plain words only: no links, addresses, amounts or markup"),
  blocks: z.array(Block).min(2).max(8),
  routine: Routine.nullable(),
});
export type SpecInput = z.infer<typeof Spec>;
