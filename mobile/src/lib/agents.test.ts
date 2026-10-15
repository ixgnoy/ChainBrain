import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorld, seedOwner } from "../../../shared/sim";
import { agentIdOf, agentSteps, agentViews, dailySpend, weekOverWeek, activityLine, DAY } from "./agents";
import { ledgerFrom, livePending, type WalletEvent } from "./events";

const OWNER = "0x00000000000000000000000000000000000d0d0d" as const;

async function seeded() {
  const w = createWorld({ speed: 0, seed: 11 });
  const s = await seedOwner(w, OWNER);
  const events = w.events(0) as WalletEvent[];
  const pockets = s.pockets.map((p) => ({ ...w.chain.view(p.address), address: p.address }));
  return { w, s, events, pockets, ledger: ledgerFrom(events) };
}

test("agentIdOf: the pocket's agent key names its agent; a server's own key is the built-in agent", async () => {
  const { pockets } = await seeded();
  assert.deepEqual(pockets.map((p) => agentIdOf(p)), ["chainbrain", "chainbrain", "claude", "chatgpt"]);
  assert.equal(agentIdOf({ agent: "0x1111111111111111111111111111111111111111" }, "0x1111111111111111111111111111111111111111"), "chainbrain");
  assert.equal(agentIdOf({ agent: "0x2222222222222222222222222222222222222222" }), undefined);
});

test("agentViews: numbers come from the pockets and the ledger", async () => {
  const { w, events, pockets, ledger } = await seeded();
  const views = agentViews({ pockets, events, ledger, pending: livePending(events), states: w.agents() });
  const claude = views.find((a) => a.id === "claude")!;
  assert.equal(claude.pockets.length, 1);
  assert.equal(claude.balance, 4_900_000n);
  assert.equal(claude.spent, 3_100_000n); // 0.30 + 0.35 + 1.50 + 0.30 + 0.35 + 0.30
  assert.equal(claude.payments, 6);
  assert.equal(claude.refusals, 1);
  assert.equal(claude.status, "connected");
  // a real server: only the built-in agent
  assert.deepEqual(agentViews({ pockets, events, ledger, pending: [] }).map((a) => a.id), ["chainbrain"]);
});

test("dailySpend and weekOverWeek: seven calendar days, and a delta only when last week is covered", async () => {
  const { ledger } = await seeded();
  const days = dailySpend(ledger, () => "chainbrain", 7);
  assert.equal(days.length, 7);
  const sum = days.reduce((n, d) => n + d.total, 0n);
  assert.equal(sum, weekOverWeek(ledger).thisWeek);
  assert.ok(weekOverWeek(ledger).delta !== null, "two weeks of history allow a comparison");
  // only today's payments: nothing to compare with
  const today = ledger.filter((r) => r.at > Date.now() - 6 * 3600_000);
  assert.equal(weekOverWeek(today).delta, null);
  assert.equal(dailySpend([], () => undefined, 14).length, 14);
  assert.ok(DAY === 86_400_000);
});

test("agentSteps: Claude's ledger in plain words, newest first, with its refusal", async () => {
  const { s, events } = await seeded();
  const news = s.pockets.find((p) => p.name === "Market news")!.address;
  const steps = agentSteps(events, [news], (id) => id ?? "?", (code) => `because ${code}`);
  assert.ok(steps.length > 10);
  for (let i = 1; i < steps.length; i++) assert.ok(steps[i - 1].at >= steps[i].at);
  assert.ok(steps.some((x) => x.kind === "paid" && x.status.label === "Paid" && x.tx));
  assert.ok(steps.some((x) => x.kind === "refused" && x.detail === "because SELLER_NOT_ALLOWED"));
  assert.ok(steps.some((x) => x.kind === "task" && x.status.label === "Confirmed"));
});

test("activityLine: waiting beats recent; disconnected says so", () => {
  const now = Date.now();
  assert.equal(activityLine({ status: "connected", lastAt: now - 3 * 60_000, pending: 0 }, now).text, "Active 3 min ago");
  assert.equal(activityLine({ status: "connected", lastAt: now, pending: 1 }, now).text, "Waiting for your OK");
  assert.equal(activityLine({ status: "disconnected", lastAt: now, pending: 0 }, now).tone, "off");
});
