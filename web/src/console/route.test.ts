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

import { parseExplorer, searchTarget, explorerHref } from "./route";
it("parses the explorer routes and falls back to home", () => {
  const A = "0x" + "c".repeat(40);
  expect(parseExplorer("explorer")).toEqual({ kind: "home" });
  expect(parseExplorer(`explorer/tx/${H}`)).toEqual({ kind: "tx", hash: H });
  expect(parseExplorer("explorer/block/42")).toEqual({ kind: "block", number: "42" });
  expect(parseExplorer(`explorer/address/${A}`)).toEqual({ kind: "address", address: A });
  expect(parseExplorer("explorer/tx/nope")).toEqual({ kind: "home" });
  expect(parseExplorer("chain")).toEqual({ kind: "home" });
  expect(searchTarget(` ${H} `)).toBe(explorerHref.tx(H));
  expect(searchTarget("17")).toBe("#explorer/block/17");
  expect(searchTarget("hello")).toBeUndefined();
});
