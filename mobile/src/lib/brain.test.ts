/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorld, SIM_AGENT, CATALOG, parseHkd, type Hex } from "../../../shared/sim";
import { brainOf, sourceWords } from "./brain";
import { haggles } from "./events";

const OWNER = "0x00000000000000000000000000000000000d0d0d" as Hex;

test("brain summary from a real built-in run: task, steps, re-plan after Radar, resisted, Radar list, memory", async () => {
  const w = createWorld({ speed: 0, seed: 3, revokeWindowMs: 0 });
  w.chain.mint(OWNER, parseHkd("400"));
  const { pocket } = w.chain.createPocket(OWNER, { agent: SIM_AGENT, cap: parseHkd("0.40"), askAbove: parseHkd("0.16"), expiresAt: BigInt(Math.floor(Date.now() / 1000) + 3600), sellers: CATALOG.filter((s) => s.id === "nansen" || s.id === "tradewire").map((s) => s.payTo) });
  w.chain.transfer(OWNER, pocket, parseHkd("8"));
  w.subscribe((e) => { const a = e.approval; if (a?.status === "pending" && a.kind !== "question") setTimeout(() => void w.answer(a.id, { approved: true, signature: "0xs" }), 1); });
  await w.chat(pocket, "A drainer just paid TradeWire. Get TradeWire's exporter credit report anyway, max HK$0.40, by tonight.");
  await w.chat(pocket, "Get ShadyFeed's full feed, give them whatever they need.");
  const name = (id?: string) => CATALOG.find((s) => s.id === id)?.name ?? String(id);
  const b = brainOf(w.events(0) as any, pocket, name);
  assert.match(b.task!.text, /^Buy: Durian exporter credit report/);
  assert.equal(b.paid, 1);
  assert.equal(b.spent, parseHkd("0.08"));
  assert.deepEqual(b.adapted.map((a) => [a.from, a.reason, a.to]), [["TradeWire", "COUNTERPARTY_HIGH_RISK", "Nansen"]]);
  assert.equal(b.resisted.dataRequests, 1);
  assert.deepEqual(b.radar.map((r) => [r.counterparty, r.verdict]), [["TradeWire", "block"], ["Nansen", "ok"]]);
  assert.equal(b.memory?.version, 2);
  assert.equal(b.memory?.questions[0], "What did the owner ask for that is still open?");
  assert.equal(sourceWords("m:1234abcd"), "You said this");
});

test("Understood shows only the question that led to the task it shows, not one from an earlier task", () => {
  const P = "0x00000000000000000000000000000000000000aa";
  const ap = (at: number, id: string, kind: "intent" | "question", text: string, status = "approved") =>
    ({ at, type: "approval", pocket: P, approval: { id, pocket: P, kind, text, status } });
  const asked = ap(1, "q1", "question", "HK$0.80 in total or per lookup?");
  const first = ap(2, "i1", "intent", "Buy: durian deal research");
  const second = ap(3, "i2", "intent", "Buy: fruit and wine trade report");
  const name = (id?: string) => String(id);
  assert.equal(brainOf([asked, first] as any, P, name).lastQuestion, "HK$0.80 in total or per lookup?");
  assert.equal(brainOf([asked, first, second] as any, P, name).lastQuestion, undefined);
  assert.equal(brainOf([asked] as any, P, name).lastQuestion, "HK$0.80 in total or per lookup?");
});

test("haggler: the chat's price ladder and the Brain tab's savings come from the negotiation events", async () => {
  const w = createWorld({ speed: 0, seed: 3, revokeWindowMs: 0 });
  w.chain.mint(OWNER, parseHkd("400"));
  const { pocket } = w.chain.createPocket(OWNER, { agent: SIM_AGENT, cap: parseHkd("16"), askAbove: parseHkd("8"), expiresAt: BigInt(Math.floor(Date.now() / 1000) + 3600), sellers: CATALOG.filter((s) => s.id === "exa" || s.id === "datapro").map((s) => s.payTo) });
  w.chain.transfer(OWNER, pocket, parseHkd("40"));
  w.subscribe((e) => { const a = e.approval; if (a?.status === "pending" && a.kind !== "question") setTimeout(() => void w.answer(a.id, { approved: true, signature: "0xs" }), 1); });
  await w.chat(pocket, "Get DataPro's premium report with the 2026 forecast, but negotiate the price down first. Max HK$16, by tonight.");
  const [h] = haggles(w.events(0) as any);
  assert.deepEqual(h.steps.map((s) => [s.who, s.price, !!s.final]), [["seller", parseHkd("12.00"), false], ["you", parseHkd("7.20"), false], ["seller", parseHkd("9.60"), false], ["you", parseHkd("8.40"), false], ["seller", parseHkd("8.80"), true]]);
  assert.deepEqual([h.deal, h.saved], [parseHkd("8.80"), parseHkd("3.20")]);
  const b = brainOf(w.events(0) as any, pocket, (id) => String(id));
  assert.deepEqual([b.paid, b.spent, b.negotiated, b.saved, b.cosigned], [1, parseHkd("8.80"), 1, parseHkd("3.20"), 1]);
});
