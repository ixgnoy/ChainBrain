/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeDemo } from "./demo";
import { ledgerFrom } from "./events";
import { describeRow, visibleRows, plainReason } from "./plain";

test("plain wording: refused rows read as sentences, approved approvals are hidden", () => {
  const rows = visibleRows(ledgerFrom(makeDemo().events));
  assert.ok(!rows.some((r) => r.kind === "approval" && r.outcome === "approved"));
  const refused = rows.find((r) => r.sellerId === "harbour")!;
  const v = describeRow(refused, "Harbour Wines", "14 Oct, 1:32 PM");
  assert.equal(v.sub, "Refused: seller not on your list");
  assert.equal(v.rightSub, "Refused");
  const signed = rows.find((r) => r.cosigned)!;
  assert.equal(describeRow(signed, "DataPro", "x").rightSub, "Co-signed");
  assert.equal(describeRow(signed, "DataPro", "x").right, "US$1.50");
  assert.equal(plainReason("SOMETHING_NEW"), "not allowed by your rules");
});
