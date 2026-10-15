import { expect, it } from "vitest";
import { attemptsFrom } from "@sim/checks";
import { collapsiblePrefix, gateWord, groupGates, headlineParts, idlePath, sequenceLength, tokenTone } from "./checksView";

const ev = [{ type: "forced", pocket: "0xp", at: 1, via: "agent", reverted: true, reason: "SELLER_NOT_ALLOWED", to: "0x000000000000000000000000000000000000ABC0", amount: "50000000", tx: "0xt" }];

it("walks a hijack: fooled agent, bypassed tools, the seller gate stops it", () => {
  const [a] = attemptsFrom(ev);
  expect(a.aiFooled).toBe(true);
  expect(sequenceLength(a.gates)).toBe(a.gates.findIndex((g) => g.state === "stop") + 1);
  expect(gateWord(a.gates.find((g) => g.id === "intent")!).word).toBe("Bypassed");
  expect(tokenTone(a.gates, a.gates.length)).toBe("stop");
  expect(tokenTone(a.gates, 1)).toBe("fooled");
  expect(headlineParts(a).main).toMatch(/^The AI was fooled\./);
  expect(headlineParts(a).sub).toBeTruthy();
});
it("groups the idle path into four layers with the contract in the middle", () => {
  const g = groupGates(idlePath());
  expect(g.map((x) => x.layer)).toEqual(["agent", "tools", "contract", "seller"]);
  expect(g[2].gates.length).toBe(6);
  expect(sequenceLength(idlePath())).toBe(0);
});

it("folds only the leading passes", () => {
  const [pay] = attemptsFrom([{ type: "payment", pocket: "0xp", at: 1, sellerId: "datalite", amount: "300000", tx: "0xt" }]);
  expect(collapsiblePrefix(pay.gates)).toBe(7);
  const [hij] = attemptsFrom(ev);
  expect(collapsiblePrefix(hij.gates)).toBe(0); // the first gate is already "fooled"
});
