import { it, expect, beforeAll } from "vitest";
import { useDevKeys } from "./helpers/env";

let api: ReturnType<typeof import("../src/index").apiApp>;
let bus: typeof import("../src/wallet/events").bus;
beforeAll(async () => {
  useDevKeys();
  process.env.FACTORY_ADDRESS = "0x0000000000000000000000000000000000000001";
  api = (await import("../src/index")).apiApp();
  ({ bus } = await import("../src/wallet/events"));
});

it("events.json returns one pocket's events after a timestamp, with bigints as strings (mobile polling)", async () => {
  bus.publish({ type: "payment", pocket: "0xAAA", amount: 300000n, tx: "0x1" });
  await new Promise((r) => setTimeout(r, 5));
  const cut = Date.now();
  await new Promise((r) => setTimeout(r, 5));
  bus.publish({ type: "payment", pocket: "0xaaa", amount: 1500000n, tx: "0x2" });
  bus.publish({ type: "payment", pocket: "0xBBB", amount: 1n, tx: "0x3" });
  const all = await (await api.request("/api/events.json?pocket=0xaaa")).json();
  expect(all.map((e: any) => e.tx)).toEqual(["0x1", "0x2"]);
  const later = await (await api.request(`/api/events.json?pocket=0xAAA&after=${cut}`)).json();
  expect(later).toEqual([expect.objectContaining({ tx: "0x2", amount: "1500000" })]);
});

it("approving an unknown or settled approval is a 404, not a crash", async () => {
  const r = await api.request("/api/approvals/nope", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  expect(r.status).toBe(404);
});

it("chat: trims history, reflects after the turn, next turn sees the new snapshot; owner can forget", async () => {
  const { apiApp } = await import("../src/index");
  const systems: string[] = [];
  const reply = (t: string) => ({ stop_reason: "end_turn", content: [{ type: "text", text: t }] }) as any;
  let n = 0;
  const app = apiApp({
    model: async (req: any) => (systems.push(req.system), reply(`r${n++}`)),
    memoryModel: async (req: any) => {
      const ev = JSON.parse(req.messages[0].content).evidence;
      return { stop_reason: "tool_use", content: [{ type: "tool_use", id: "w", name: "write_memory", input: { questions: [], ops: [{ op: "add", kind: "preference", text: "Prefers DataLite", source: ev[0].id }], summary: "Likes DataLite." } }] } as any;
    },
  });
  const post = (text: string) => app.request("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pocket: "0xmem", text }) });
  await post("I prefer DataLite");
  await post("buy a durian report");
  expect(systems[1]).toContain("Prefers DataLite");
  const m = await (await app.request("/api/memory?pocket=0xmem")).json();
  expect(m.snapshot).toMatchObject({ version: 2 });
  const id = m.snapshot.items[0].id;
  const f = await app.request("/api/memory/forget", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pocket: "0xmem", id }) });
  expect(f.status).toBe(200);
  expect((await (await app.request("/api/memory?pocket=0xmem")).json()).snapshot.items).toHaveLength(0);
});
