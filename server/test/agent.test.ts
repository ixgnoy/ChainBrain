import { it, expect, beforeAll } from "vitest";
import { useDevKeys } from "./helpers/env";

let runTurn: typeof import("../src/agent/loop").runTurn;
beforeAll(async () => {
  useDevKeys();
  ({ runTurn } = await import("../src/agent/loop"));
});

const ctx = { pocket: "0x0000000000000000000000000000000000000001" as const };
let id = 0;
const use = (name: string, input: object = {}) => ({ type: "tool_use", id: `t${id++}`, name, input });
const msg = (content: any[], stop = "tool_use") => ({ role: "assistant", content, stop_reason: stop }) as any;
const fakeTools = (impl: Record<string, (a: any) => object>, calls: string[] = []) =>
  Object.fromEntries(Object.entries(impl).map(([k, f]) => [k, { description: k, input_schema: { type: "object" }, run: async (_c: unknown, a: any) => (calls.push(k), f(a)) }]));

it("runs tools until the model ends its turn, feeding results back", async () => {
  const seen: any[] = [];
  const script = [msg([use("get_pocket")]), msg([{ type: "text", text: "Done." }], "end_turn")];
  const out = await runTurn(ctx, [], "buy", {
    model: async (req) => (seen.push(structuredClone(req)), script.shift()!), // snapshot: the loop keeps appending to messages
    tools: fakeTools({ get_pocket: () => ({ ok: true, balance: "5.00" }) }),
  });
  expect(out.reply).toBe("Done.");
  expect(JSON.stringify(seen[1].messages.at(-1))).toContain("5.00");
  expect(seen[0]).not.toHaveProperty("temperature"); // rejected (400) on current models
  expect(seen[0]).toMatchObject({ model: "claude-opus-5-5", max_tokens: 16000, fallbacks: "default", betas: ["server-side-fallback-2026-07-01"] });
  expect(seen[0].tools[0].input_schema).not.toHaveProperty("$schema");
  expect(seen[0].tools.map((t: any) => t.name)).toEqual(["get_pocket"]);
});

it("LLM error mid-task stops without re-sending a payment, and reports it", async () => {
  const calls: string[] = [];
  let n = 0;
  const model = async () => { if (n++ === 0) return msg([use("pay", { quoteId: "q1" })]); throw new Error("overloaded"); };
  const out = await runTurn(ctx, [], "buy", { model, tools: fakeTools({ pay: () => ({ ok: true, tx: "0xabc" }) }, calls) });
  expect(out.stopped).toBe("llm_error");
  expect(calls).toEqual(["pay"]);
  expect(out.reply).toContain("0xabc");
});

it("stops at max steps and reports", async () => {
  const out = await runTurn(ctx, [], "loop", { model: async () => msg([use("get_pocket")]), tools: fakeTools({ get_pocket: () => ({}) }), maxSteps: 3 });
  expect(out.stopped).toBe("max_steps");
});

it("a tool that throws becomes an error result, not a crash", async () => {
  const script = [msg([use("pay", { quoteId: "x" })]), msg([{ type: "text", text: "ok" }], "end_turn")];
  const out = await runTurn(ctx, [], "buy", { model: async () => script.shift()!, tools: { pay: { description: "", input_schema: {}, run: async () => { throw new Error("boom"); } } } });
  expect(out.reply).toBe("ok");
  expect(JSON.stringify(out.history)).toContain("boom");
});

it("a refusal stops the turn and reports completed payments", async () => {
  const script = [msg([use("pay", { quoteId: "q1" })]), msg([], "refusal")];
  const out = await runTurn(ctx, [], "buy", { model: async () => script.shift()!, tools: fakeTools({ pay: () => ({ ok: true, tx: "0xdef" }) }) });
  expect(out.stopped).toBe("refusal");
  expect(out.reply).toContain("0xdef");
});

it("the real tool schemas are plain JSON Schema objects the API accepts", async () => {
  const { buildRequest } = await import("../src/agent/loop");
  const { tools } = await import("../src/wallet/tools");
  const req = buildRequest(tools, [{ role: "user", content: "hi" }]);
  expect(req.tools!.map((t: any) => t.name).sort()).toEqual(["ask_owner", "draft_intent", "get_pocket", "get_quote", "pay", "search_sellers"]);
  for (const t of req.tools as any[]) {
    expect(t.input_schema.type).toBe("object");
    expect(t.input_schema).not.toHaveProperty("$schema");
  }
  const intent = (req.tools as any[]).find((t) => t.name === "draft_intent").input_schema;
  expect(intent.required).toEqual(expect.arrayContaining(["request", "description", "maxPricePerItem", "maxTotal", "maxItems", "deadline"]));
});
