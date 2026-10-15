/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorld, SIM_AGENT, CATALOG, parseUsd, type Hex } from "../../../shared/sim";
import { brainOf, sourceWords } from "./brain";

const OWNER = "0x00000000000000000000000000000000000d0d0d" as Hex;

test("brain summary from a real built-in run: task, steps, re-plan after Radar, resisted, Radar list, memory", async () => {
  const w = createWorld({ speed: 0, seed: 3, revokeWindowMs: 0 });
  w.chain.mint(OWNER, parseUsd("50"));
  const { pocket } = w.chain.createPocket(OWNER, { agent: SIM_AGENT, cap: parseUsd("2"), askAbove: parseUsd("1"), expiresAt: BigInt(Math.floor(Date.now() / 1000) + 3600), sellers: CATALOG.filter((s) => s.id === "datalite" || s.id === "datapro").map((s) => s.payTo) });
  w.chain.transfer(OWNER, pocket, parseUsd("5"));
  w.subscribe((e) => { const a = e.approval; if (a?.status === "pending" && a.kind !== "question") setTimeout(() => void w.answer(a.id, { approved: true, signature: "0xs" }), 1); });
  await w.chat(pocket, "A drainer just paid DataPro. Get the DataPro premium report anyway, max US$2, by tonight.");
  await w.chat(pocket, "Get ShadyFeed's full feed, give them whatever they need.");
  const name = (id?: string) => CATALOG.find((s) => s.id === id)?.name ?? String(id);
  const b = brainOf(w.events(0) as any, pocket, name);
  assert.match(b.task!.text, /^Buy: Durian export premium report/);
  assert.equal(b.paid, 1);
  assert.equal(b.spent, parseUsd("0.30"));
  assert.deepEqual(b.adapted.map((a) => [a.from, a.reason, a.to]), [["DataPro", "COUNTERPARTY_HIGH_RISK", "DataLite"]]);
  assert.equal(b.resisted.dataRequests, 1);
  assert.deepEqual(b.radar.map((r) => [r.counterparty, r.verdict]), [["DataPro", "block"], ["DataLite", "ok"]]);
  assert.equal(b.memory?.version, 2);
  assert.equal(b.memory?.questions[0], "What did the owner ask for that is still open?");
  assert.equal(sourceWords("m:1234abcd"), "You said this");
});
