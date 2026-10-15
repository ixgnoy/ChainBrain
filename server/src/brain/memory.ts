import { z } from "zod";
import { createMemory, KINDS, type Reflection as R } from "../../../shared/sim/memory";

export { KINDS, empty, consolidate, render, type Kind, type Item, type Snapshot, type Applied, type Rejected } from "../../../shared/sim/memory";

/** The typed reflection a model must return (validated before consolidation). */
export const Op = z.object({
  op: z.enum(["add", "update", "delete", "keep"]),
  id: z.string().optional().describe("Existing item id (update, delete, keep)"),
  kind: z.enum(KINDS).optional(),
  text: z.string().max(400).optional(),
  source: z.string().optional().describe("Evidence id this item comes from, e.g. m:3f2a9c1d or e:1760500000000"),
  effect: z.enum(["narrow", "neutral", "loosen"]).optional().describe("Would this make the agent do more (loosen) or less (narrow)?"),
});
export const Reflection = z.object({
  questions: z.array(z.object({ q: z.string().max(200), a: z.string().max(400) })).max(5),
  ops: z.array(Op).max(40),
  summary: z.string().max(1200),
});
export type Reflection = R;

// ponytail: in-memory per process like wallet/state.ts; persist to disk if the demo needs restarts.
export const memory = createMemory();
