/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorld, seedOwner, SIM_AGENT, CATALOG, parseUsd, SCENES, type Hex } from "../../../shared/sim";
import { ledgerFrom } from "./events";
import { describeRow, visibleRows, plainReason } from "./plain";

test("plain wording: refused rows read as sentences, approved approvals are hidden", async () => {
  const w = createWorld({ speed: 0 });
  await seedOwner(w, "0x00000000000000000000000000000000000d0d0d");
  const rows = visibleRows(ledgerFrom(w.events(0) as any));
  assert.ok(!rows.some((r) => r.kind === "approval" && r.outcome === "approved"));
  const refused = rows.find((r) => r.sellerId === "harbour-wines")!;
  const v = describeRow(refused, "Harbour Wines", "14 Oct, 1:32 PM");
  assert.equal(v.sub, "Refused: seller not on your list");
  assert.equal(v.rightSub, "Refused");
  const signed = rows.find((r) => r.cosigned)!;
  assert.equal(describeRow(signed, "Nansen", "x").rightSub, "Co-signed");
  assert.equal(describeRow(signed, "Nansen", "x").right, "US$0.05");
  assert.equal(plainReason("SOMETHING_NEW"), "not allowed by your rules");
});

import { worstCase } from "./plain";
import { deadEndOf, retryText } from "./deadend";
import { addOwnerTx, ownerRows } from "./ownerTxs";

test("worst case line names the balance and the allowed sellers", () => {
  assert.equal(worstCase(1_285_000n, ["Exa", "Nansen"]), "If the agent is hijacked, the most it can lose is US$1.285, only to Exa and Nansen.");
  assert.match(worstCase(5_000n, ["Exa"]), /only to Exa\.$/);
  assert.match(worstCase(0n, []), /empty/);
});

test("owner transactions become ledger rows with a hash", () => {
  const list = addOwnerTx(addOwnerTx([], { kind: "create", pocket: "0xa", hash: "0x1", at: 1 }), { kind: "fund", pocket: "0xa", hash: "0x2", at: 2, amount: "5000000" });
  assert.equal(addOwnerTx(list, { kind: "fund", pocket: "0xa", hash: "0x2", at: 3 }).length, 2);
  const rows = ownerRows(list);
  assert.equal(rows[1].tx, "0x2");
  const v = describeRow(rows[1], "", "now");
  assert.equal(v.title, "Money added");
  assert.equal(v.right, "US$5.00");
  assert.ok(v.foot?.startsWith("Tx 0x"));
});

test("dead end: lists sellers tried and the one-tap fix (scene 8)", () => {
  const P = "0xabc";
  const q = (sellerId: string, reason: string, price: string, at: number) => ({ type: "trace", pocket: P, at, phase: "tool_result", tool: "get_quote", result: { ok: true, sellerId, sku: "x", price, allowedByPocket: { reason }, intentCheck: "OK" } });
  const evs = [q("datalite", "OVER_CAP", "0.30", 1), q("datapro", "SELLER_NOT_ALLOWED", "1.50", 2)];
  const d = deadEndOf(evs, { address: P, cap: 200_000n, balance: 200_000n })!;
  assert.equal(d.tried.length, 2);
  assert.deepEqual(d.fix, { cap: 300_000n, topUp: 100_000n });
  assert.equal(deadEndOf([...evs, { type: "payment", pocket: P, at: 3 }], { address: P, cap: 1n, balance: 1n }), null);
});

test("dead end: Ask again re-sends the owner's sentence with the maximum that now fits", () => {
  assert.equal(retryText("Search the web for durian export news, max US$0.005, by tonight.", "0.007"), "Search the web for durian export news, max US$0.007, by tonight.");
  assert.equal(retryText("Buy a durian export report, max US$0.20, by tonight.", "0.30"), "Buy a durian export report, max US$0.30, by tonight.");
  assert.equal(retryText("Get a report on durian prices.", "0.30"), "Get a report on durian prices. Max US$0.30, by tonight.");
});

test("dead end on the built-in network: the re-sent sentence buys once the cap is raised (scene 8)", async () => {
  const OWNER = "0x00000000000000000000000000000000000d0d0d" as Hex;
  const w = createWorld({ speed: 0, seed: 5, revokeWindowMs: 0 });
  w.chain.mint(OWNER, parseUsd("5"));
  const exa = CATALOG.find((s) => s.id === "exa")!;
  const { pocket } = w.chain.createPocket(OWNER, { agent: SIM_AGENT, cap: parseUsd("0.005"), askAbove: 2n ** 256n - 1n, expiresAt: BigInt(Math.floor(Date.now() / 1000) + 3600), sellers: [exa.payTo] });
  w.chain.transfer(OWNER, pocket, parseUsd("0.005"));
  w.subscribe((e) => { const a = e.approval; if (a?.status === "pending" && a.kind === "intent") setTimeout(() => void w.answer(a.id, { approved: true }), 1); });
  const task = SCENES.find((s) => s.id === "8")!.text;
  await w.chat(pocket, task);
  const d = deadEndOf(w.events(0) as any, { address: pocket, cap: parseUsd("0.005"), balance: parseUsd("0.005") })!;
  assert.ok(d.fix && d.minPrice === parseUsd("0.007"));
  w.chain.setCap(OWNER, pocket, d.fix.cap);
  w.chain.transfer(OWNER, pocket, d.fix.topUp);
  await w.chat(pocket, retryText(task, "0.007"));
  assert.ok((w.events(0) as any[]).some((e) => e.type === "payment" && e.sellerId === "exa"));
});
