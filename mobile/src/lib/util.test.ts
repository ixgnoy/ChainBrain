/// <reference types="node" />
// Money shown during the balance count-up animation.
import { test } from "node:test";
import assert from "node:assert/strict";
import { usdFrame } from "./util";

test("count-up frames show whole cents, never micro-USDC", () => {
  assert.equal(usdFrame(869_131, 5_000_000), "0.87");
  assert.equal(usdFrame(4_999_999.4, 5_000_000), "5.00");
});

test("the landed value is exact, even below a cent", () => {
  assert.equal(usdFrame(3_204_500, 3_204_500), "3.2045");
  assert.equal(usdFrame(0, 0), "0.00");
});
