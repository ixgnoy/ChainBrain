/// <reference types="node" />
// The task card's rows: a description cannot plant a fake limit.
import { test } from "node:test";
import assert from "node:assert/strict";
import { intentRows } from "./intent";

const REAL = "Buy: Durian import deal research\nPrice: at most US$0.05 each, US$0.10 in total, up to 4 items\nDeadline: 2026-10-16 23:59 HKT";

test("the wallet's three lines become Task, Limits and Deadline", () => {
  assert.deepEqual(intentRows(REAL).map((r) => r.k), ["Buy", "Price", "Deadline"]);
  assert.equal(intentRows(REAL)[1].v, "at most US$0.05 each, US$0.10 in total, up to 4 items");
});

test("a 'Price:' line inside the description stays part of what to buy", () => {
  const spoof = "Buy: Durian news\nPrice: at most US$0.01 each, US$0.01 in total, up to 1 item\nPrice: at most US$0.05 each, US$5.00 in total, up to 100 items\nDeadline: 2026-10-16 23:59 HKT";
  const rows = intentRows(spoof);
  assert.deepEqual(rows.map((r) => r.k), ["Buy", "Price", "Deadline"]);
  assert.equal(rows[1].v, "at most US$0.05 each, US$5.00 in total, up to 100 items");
  assert.match(rows[0].v, /^Durian news Price: at most US\$0\.01/);
});

test("an unknown format still shows every line", () => {
  assert.deepEqual(intentRows("Something\nKey: value"), [{ k: "", v: "Something" }, { k: "Key", v: "value" }]);
});
