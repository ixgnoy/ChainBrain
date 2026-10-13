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
