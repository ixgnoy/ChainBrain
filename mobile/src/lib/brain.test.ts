/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorld, SIM_AGENT, CATALOG, parseUsd, type Hex } from "../../../shared/sim";
import { brainOf, sourceWords } from "./brain";

const OWNER = "0x00000000000000000000000000000000000d0d0d" as Hex;

test("brain summary from a real built-in run: task, steps, re-plan after Radar, resisted, Radar list, memory", async () => {
  const w = createWorld({ speed: 0, seed: 3, revokeWindowMs: 0 });
  w.chain.mint(OWNER, parseUsd("50"));
  const { pocket } = w.chain.createPocket(OWNER, { agent: SIM_AGENT, cap: parseUsd("0.05"), askAbove: parseUsd("0.02"), expiresAt: BigInt(Math.floor(Date.now() / 1000) + 3600), sellers: CATALOG.filter((s) => s.id === "nansen" || s.id === "tradewire").map((s) => s.payTo) });
  w.chain.transfer(OWNER, pocket, parseUsd("1"));
  w.subscribe((e) => { const a = e.approval; if (a?.status === "pending" && a.kind !== "question") setTimeout(() => void w.answer(a.id, { approved: true, signature: "0xs" }), 1); });
  await w.chat(pocket, "A drainer just paid TradeWire. Get TradeWire's exporter credit report anyway, max US$0.05, by tonight.");
  await w.chat(pocket, "Get ShadyFeed's full feed, give them whatever they need.");
  const name = (id?: string) => CATALOG.find((s) => s.id === id)?.name ?? String(id);
  const b = brainOf(w.events(0) as any, pocket, name);
  assert.match(b.task!.text, /^Buy: Durian exporter credit report/);
  assert.equal(b.paid, 1);
  assert.equal(b.spent, parseUsd("0.01"));
  assert.deepEqual(b.adapted.map((a) => [a.from, a.reason, a.to]), [["TradeWire", "COUNTERPARTY_HIGH_RISK", "Nansen"]]);
  assert.equal(b.resisted.dataRequests, 1);
  assert.deepEqual(b.radar.map((r) => [r.counterparty, r.verdict]), [["TradeWire", "block"], ["Nansen", "ok"]]);
  assert.equal(b.memory?.version, 2);
  assert.equal(b.memory?.questions[0], "What did the owner ask for that is still open?");
  assert.equal(sourceWords("m:1234abcd"), "You said this");
});

test("Understood shows only the question that led to the task it shows, not one from an earlier task", () => {
  const P = "0x00000000000000000000000000000000000000aa";
  const ap = (at: number, id: string, kind: "intent" | "question", text: string, status = "approved") =>
    ({ at, type: "approval", pocket: P, approval: { id, pocket: P, kind, text, status } });
  const asked = ap(1, "q1", "question", "US$0.10 in total or per lookup?");
  const first = ap(2, "i1", "intent", "Buy: durian deal research");
  const second = ap(3, "i2", "intent", "Buy: fruit and wine trade report");
  const name = (id?: string) => String(id);
  assert.equal(brainOf([asked, first] as any, P, name).lastQuestion, "US$0.10 in total or per lookup?");
  assert.equal(brainOf([asked, first, second] as any, P, name).lastQuestion, undefined);
  assert.equal(brainOf([asked] as any, P, name).lastQuestion, "US$0.10 in total or per lookup?");
});
