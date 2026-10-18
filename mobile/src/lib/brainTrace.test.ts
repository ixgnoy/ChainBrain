import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorld, seedOwner } from "../../../shared/sim";
import { liveTraceOf, traceOf } from "./brainTrace";
import type { WalletEvent } from "./events";

const OWNER = "0x7c5e000000000000000000000000000000001d47" as const;
const st = (t: ReturnType<typeof traceOf>, k: string) => t!.stages.find((s) => s.key === k)!;

test("brain trace: a seeded payment, stage by stage, from its own events", async () => {
  const w = createWorld({ speed: 0, seed: 11 });
  await seedOwner(w, OWNER);
  const ev = w.events(0) as unknown as WalletEvent[];
  const pay = ev.find((e) => e.type === "payment" && !e.cosigned)!;
  const t = traceOf(ev, { pocket: pay.pocket!, tx: pay.tx, at: pay.at });
  assert.equal(t?.outcome, "paid");
  assert.equal(st(t, "rules").state, "ok");
  assert.match(st(t, "quote").value, /US\$0\.0/);
  assert.match(st(t, "radar").value, /^Risk \d+\/10/);
  assert.match(st(t, "preflight").value, /Predicted it pays · matched/);
  assert.ok(st(t, "settle").value.includes(String(pay.tx).slice(-4)), "settlement names its tx");
  assert.equal(t!.stages.filter((s) => s.state === "stop").length, 0);
});

test("brain trace: the test's refusal stops at the pocket's rules and moves nothing", async () => {
  const w = createWorld({ speed: 0, seed: 11 });
  const s = await seedOwner(w, OWNER);
  const rd = s.pockets.find((p) => p.name === "Research data")!;
  const since = w.now();
  await w.runTest(rd.address, "refuse");
  const ev = w.events(0) as unknown as WalletEvent[];
  const t = liveTraceOf(ev, rd.address, since);
  assert.equal(t?.outcome, "refused");
  assert.equal(st(t, "task").value, "Your test");
  assert.equal(st(t, "rules").state, "stop");
  assert.equal(st(t, "settle").value, "Refused · no money moved");
  assert.match(st(t, "preflight").value, /Predicted a refusal · matched/);
});

test("brain trace: a test in flight shows what has happened and waits for the rest", async () => {
  const w = createWorld({ speed: 0, seed: 11 });
  const s = await seedOwner(w, OWNER);
  const rd = s.pockets.find((p) => p.name === "Research data")!;
  const since = w.now();
  await w.runTest(rd.address, "pay");
  const all = w.events(0) as unknown as WalletEvent[];
  const cut = all.findIndex((e) => e.at >= since && e.type === "preflight");
  const t = liveTraceOf(all.slice(0, cut), rd.address, since);
  assert.equal(t?.outcome, "running");
  assert.equal(st(t, "quote").state, "ok");
  assert.equal(st(t, "settle").state, "wait");
});
