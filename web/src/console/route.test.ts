import { expect, it } from "vitest";
import { splitHash, withTx } from "./route";

const H = "0x" + "ab".repeat(32);
it("reads the page and the shared transaction", () => {
  expect(splitHash("#live")).toEqual({ path: "live", tx: undefined });
  expect(splitHash(`#judges/0x${"a".repeat(40)}?tx=${H}`)).toEqual({ path: `judges/0x${"a".repeat(40)}`, tx: H });
  expect(splitHash("#chain?tx=nope").tx).toBeUndefined();
  expect(splitHash("").path).toBe("");
});
it("adds and removes the transaction without touching the page", () => {
  expect(withTx("#live/0xabc", H)).toBe(`#live/0xabc?tx=${H}`);
  expect(withTx(`#live?tx=${H}`, H)).toBe(`#live?tx=${H}`);
  expect(withTx(`#chain?tx=${H}`)).toBe("#chain");
});
