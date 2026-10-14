/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeDemo } from "./demo";
import { ledgerFrom } from "./events";

test("demo data: two pockets and a ledger with paid, co-signed and refused rows", () => {
  const d = makeDemo(Date.UTC(2026, 9, 14, 12));
  assert.equal(d.pockets.length, 2);
  assert.equal(d.pockets[0].balance, 3_200_000n);
  assert.equal(d.pockets[1].balance, 200_000n);
  const rows = ledgerFrom(d.events);
  assert.ok(rows.length >= 6);
  assert.equal(rows.filter((r) => r.outcome === "paid").length, 3);
  assert.ok(rows.some((r) => r.cosigned && r.sellerId === "datapro"));
  assert.ok(rows.some((r) => r.outcome === "refused" && r.reasons[0] === "SELLER_NOT_ALLOWED" && r.sellerId === "harbour"));
  assert.ok(d.turns.every((t) => t.done && t.reply));
});
