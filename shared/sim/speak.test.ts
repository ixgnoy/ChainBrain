import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSentence, stricterDraft, proof, answer } from "./speak";
import { sellers } from "./catalog";

const S = sellers();

test("one sentence with every rule", () => {
  const c = parseSentence("US$1 for durian research from Exa, CoinGecko or Nansen, at most US$0.05 each, ask me above US$0.02, until tonight", S);
  assert.deepEqual(c.draft, { name: "Durian", sellers: ["exa", "coingecko", "nansen"], cap: "0.05", budget: "1.00", askAbove: "0.02", lifetime: "until-tonight" });
  assert.deepEqual(c.questions, []);
});

test("seller names match whole words only (\"Exa\" is not \"exactly\")", () => {
  const c = parseSentence("Exactly US$1 for CoinGecko prices, at most US$0.05 each, never ask, until tonight", S);
  assert.deepEqual(c.draft.sellers, ["coingecko"]);
  assert.deepEqual(c.questions, []);
});

test("an ambiguous amount becomes a question, and until answered the stricter reading holds", () => {
  const c = parseSentence("Buy durian news from Exa under US$2, never ask, one task", S);
  assert.equal(c.questions[0].question, "US$2.00 in total or per payment?");
  assert.deepEqual([c.draft.cap, c.draft.budget], ["2.00", "2.00"]);
  assert.deepEqual([answer(c.draft, "cap", "each:2.00").cap, answer(c.draft, "cap", "each:2.00").budget], ["2.00", "4.00"]);
  assert.equal(c.draft.askAbove, "never");
});

test("missing sellers, lifetime and ask-me become questions, never guesses", () => {
  const c = parseSentence("A pocket with US$3 in total", S);
  assert.deepEqual(c.questions.map((q) => q.field), ["sellers", "lifetime", "askAbove"]);
  assert.deepEqual(c.draft.sellers, []);
  assert.equal(c.draft.askAbove, "0"); // until answered: ask every time
});

test("two readings: disagreements take the stricter value", () => {
  const a = { sellers: ["exa", "nansen"], cap: "0.05", budget: "1.00", askAbove: "0.02", lifetime: "ongoing" as const };
  const b = { sellers: ["exa", "harbour-wines"], cap: "0.10", budget: "0.80", askAbove: "never", lifetime: "until-tonight" as const };
  const m = stricterDraft(a, b);
  assert.deepEqual(m.draft, { name: undefined, sellers: ["exa"], cap: "0.05", budget: "0.80", askAbove: "0.02", lifetime: "until-tonight" });
  assert.equal(m.disagreements.length, 5);
});

test("proof card: worst case is the budget; tests run the pocket's rule order", () => {
  const p = proof({ sellers: ["exa"], cap: "0.01", budget: "0.01", askAbove: "never", lifetime: "one-task" }, S);
  assert.equal(p.worstCase, "0.01");
  assert.deepEqual(p.neverPayable, ["CoinGecko", "Nansen", "TradeWire", "Harbour Wines", "ShadyFeed"]);
  assert.ok(p.tests.every((t) => t.ok), JSON.stringify(p.tests));
  assert.deepEqual(p.tests.map((t) => t.got), ["OK", "OVER_CAP", "SELLER_NOT_ALLOWED", "SELLER_NOT_ALLOWED", "POCKET_EXPIRED"]);
});
