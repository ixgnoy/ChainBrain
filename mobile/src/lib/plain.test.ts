/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorld, seedOwner } from "../../../shared/sim";
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
  assert.equal(describeRow(signed, "DataPro", "x").rightSub, "Co-signed");
  assert.equal(describeRow(signed, "DataPro", "x").right, "US$1.50");
  assert.equal(plainReason("SOMETHING_NEW"), "not allowed by your rules");
});

import { worstCase } from "./plain";
import { deadEndOf } from "./deadend";
import { addOwnerTx, ownerRows } from "./ownerTxs";

test("worst case line names the balance and the allowed sellers", () => {
  assert.equal(worstCase(3_200_000n, ["DataLite", "DataPro"]), "If the agent is hijacked, the most it can lose is US$3.20, only to DataLite and DataPro.");
  assert.match(worstCase(300_000n, ["DataLite"]), /only to DataLite\.$/);
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
