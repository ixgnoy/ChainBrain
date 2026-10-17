/// <reference types="node" />
// Money shown during the balance count-up animation.
import { test } from "node:test";
import assert from "node:assert/strict";
import { sameView, hkdFrame } from "./util";

test("count-up frames show whole cents, never micro-eHKD", () => {
  assert.equal(hkdFrame(869_131, 5_000_000), "0.87");
  assert.equal(hkdFrame(4_999_999.4, 5_000_000), "5.00");
});

test("the landed value is exact, even below a cent", () => {
  assert.equal(hkdFrame(3_204_500, 3_204_500), "3.2045");
  assert.equal(hkdFrame(0, 0), "0.00");
});

test("a freeze alone counts as a change, so the phone shows it (and an unfreeze clears it)", () => {
  const v = { address: "0x1", owner: "0x2", agent: "0x3", cap: 1n, askAbove: 2n, expiresAt: 3n, revoked: false, balance: 4n, allowed: ["exa"], frozen: false } as const;
  assert.equal(sameView({ ...v, allowed: ["exa"] }, { ...v, allowed: ["exa"] }), true);
  assert.equal(sameView({ ...v, allowed: ["exa"] }, { ...v, allowed: ["exa"], frozen: true }), false);
  assert.equal(sameView({ ...v, allowed: ["exa"], frozen: true }, { ...v, allowed: ["exa"] }), false);
  assert.equal(sameView(undefined, { ...v, allowed: ["exa"] }), false);
});
