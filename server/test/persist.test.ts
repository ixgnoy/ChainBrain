import { it, expect, afterAll, vi } from "vitest";
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// State that must survive a server restart lives in DATA_DIR (the Railway volume): events, approvals, memory, visitors.
const dir = mkdtempSync(join(tmpdir(), "cb-data-"));
const was = process.env.DATA_DIR;
afterAll(() => { process.env.DATA_DIR = was; });
const settle = () => new Promise((r) => setTimeout(r, 350)); // writes are debounced (200 ms)

it("events, approvals, memory and visitors come back after a restart; a pending approval comes back timed out", async () => {
  process.env.DATA_DIR = dir;
  vi.resetModules();
  const { bus } = await import("../src/wallet/events");
  const { approvals } = await import("../src/wallet/approvals");
  const { memory } = await import("../src/brain/memory");
  bus.publish({ type: "payment", pocket: "0xabc", sellerId: "datalite", tx: "0x1" });
  const done = approvals.create({ pocket: "0xabc", kind: "intent", text: "Buy a report" });
  approvals.resolve(done.id, { approved: true });
  const open = approvals.create({ pocket: "0xabc", kind: "question", text: "Per report?" });
  const s = memory.get("0xabc");
  memory.set({ ...s, version: s.version + 1, items: [{ id: "m1", kind: "preference", text: "Prefers DataLite", source: "e:1" } as any], updatedAt: Date.now() }, [], []);
  await settle();
  expect(readdirSync(dir).sort()).toEqual(expect.arrayContaining(["approvals.json", "events.json", "memory.json"]));

  vi.resetModules(); // the restart
  const again = await import("../src/wallet/events");
  const a2 = await import("../src/wallet/approvals");
  const m2 = await import("../src/brain/memory");
  expect(again.bus.recent().some((e) => e.type === "payment" && e.tx === "0x1")).toBe(true);
  expect(a2.approvals.get(done.id)?.status).toBe("approved");
  expect(a2.approvals.get(open.id)?.status).toBe("timeout"); // the agent turn that waited for it is gone
  expect(a2.approvals.pending("0xabc")).toEqual([]);
  expect(m2.memory.get("0xabc").items.map((i) => i.text)).toEqual(["Prefers DataLite"]);
  expect(m2.memory.log("0xabc").length).toBe(1);
});
