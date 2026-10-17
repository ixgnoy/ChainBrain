// The pocket app's spec as the ordered list of decisions that produced it, in RFC 6902 JSON Patch form (the shape
// vercel-labs/json-render streams generated UI in, Apache-2.0; idea only, no code copied). New pocket app's live canvas
// replays exactly these, one by one, at a pace people can follow: every line it shows is a real field of the real spec
// (or the agent the sentence named), and every change on the canvas is one of these lines landing. Nothing is added.
// No imports beyond the shared sim files.
import { BLOCK_TYPES, CATALOGUE_ID, DEFAULT_BLOCKS, type Block, type PocketAppSpec } from "./pocketApp";

export type Beat = "catalogue" | "layout" | "title" | "agent" | "routine" | "block" | "move" | "validate";
export type PatchOp = { beat: Beat; op: "add" | "move" | "test"; path: string; value?: unknown; from?: string; /** the block's index, for block and move beats */ index?: number };

/** One line of the spec panel, compact JSON. */
export const opLine = (o: PatchOp) =>
  JSON.stringify(o.op === "move" ? { op: o.op, from: o.from, path: o.path } : { op: o.op, path: o.path, value: o.value });

const blockValue = (b: Block) => ({ type: b.type, ...(b.range ? { range: b.range } : {}), ...(b.limit ? { limit: b.limit } : {}) });

/** The decisions in the order the canvas shows them. When the spec's blocks are not in the layout's default order (Claude
 *  composed it), the blocks are placed in default order first and the real reorder is shown as `move` ops, so the final
 *  state is the spec exactly. */
export function specOps(spec: PocketAppSpec, agent: string): PatchOp[] {
  const ops: PatchOp[] = [
    { beat: "catalogue", op: "add", path: "/catalogue", value: CATALOGUE_ID },
    { beat: "layout", op: "add", path: "/layout", value: spec.layout },
    { beat: "title", op: "add", path: "/title", value: spec.title },
    { beat: "agent", op: "add", path: "/agent", value: agent },
  ];
  if (spec.routine) {
    const r = spec.routine;
    ops.push({ beat: "routine", op: "add", path: "/routine", value: { kind: r.kind, every: r.cadence.every, at: `${String(r.cadence.hour).padStart(2, "0")}:${String(r.cadence.minute).padStart(2, "0")}`, allowance: `${r.allowance.amount}/${r.allowance.period}`, ...(r.limitPrice ? { limit: r.limitPrice } : {}) } });
  }
  const order = placementOrder(spec);
  order.forEach((b, i) => ops.push({ beat: "block", op: "add", path: `/blocks/${i}`, value: blockValue(b), index: i }));
  for (const m of moves(order.map((b) => b.type), spec.blocks.map((b) => b.type))) ops.push({ beat: "move", op: "move", from: `/blocks/${m.from}`, path: `/blocks/${m.to}`, index: m.to });
  ops.push({ beat: "validate", op: "test", path: "/catalogue", value: `${spec.blocks.length} of ${BLOCK_TYPES.length} blocks · no seller text` });
  return ops;
}

/** The spec's blocks in the layout's default order (those it uses), then any others in the spec's order. */
export function placementOrder(spec: PocketAppSpec): Block[] {
  const def = DEFAULT_BLOCKS[spec.layout] as readonly string[];
  const known = def.map((t) => spec.blocks.find((b) => b.type === t)).filter((b): b is Block => !!b);
  return [...known, ...spec.blocks.filter((b) => !def.includes(b.type))];
}

/** The moves that turn `from` into `to` (both the same set of types), applied one after another. */
export function moves(from: string[], to: string[]): { from: number; to: number }[] {
  const cur = [...from];
  const out: { from: number; to: number }[] = [];
  to.forEach((t, i) => {
    const j = cur.indexOf(t);
    if (j !== i) { cur.splice(j, 1); cur.splice(i, 0, t); out.push({ from: j, to: i }); }
  });
  return out;
}

/** Apply the block ops up to `n` (placed blocks, in order, after any moves so far). */
export function blocksAfter(ops: PatchOp[], n: number): string[] {
  const cur: string[] = [];
  for (const o of ops.slice(0, n)) {
    if (o.beat === "block") cur.push((o.value as Block).type);
    if (o.beat === "move") { const f = Number(o.from!.split("/").pop()); const [t] = cur.splice(f, 1); cur.splice(o.index!, 0, t); }
  }
  return cur;
}
