import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorld, seedOwner } from "../../../shared/sim";
import { liveCards, nowLine } from "./live";
import type { WalletEvent } from "./events";

const OWNER = "0x7c5e000000000000000000000000000000001d47" as const;

test("live: the seeded week as decision cards, newest first, every card from an event", async () => {
  const w = createWorld({ speed: 0, seed: 11 });
  const s = await seedOwner(w, OWNER);
  const mine = new Set(s.pockets.map((p) => p.address.toLowerCase()));
  const ev = w.events(0).filter((e) => e.pocket && mine.has(String(e.pocket).toLowerCase())) as unknown as WalletEvent[];
  const agentOf = (p?: string) => s.pockets.find((x) => x.address.toLowerCase() === String(p).toLowerCase())?.agent ?? "chainbrain";
  const cards = liveCards(ev, { agentOf, sellerName: (id) => String(id), now: w.now(), days: 30 });
  assert.ok(cards.length > 5);
  for (let i = 1; i < cards.length; i++) assert.ok(cards[i - 1].at >= cards[i].at, "newest first");
  const kinds = new Set(cards.map((c) => c.kind));
  for (const k of ["paid", "refused", "watched"]) assert.ok(kinds.has(k as never), `has ${k}`);
  assert.equal(new Set(cards.map((c) => c.key)).size, cards.length, "keys are unique");
  const pays = ev.filter((e) => e.type === "payment" && e.at >= w.now() - 30 * 86_400_000).length;
  assert.equal(cards.filter((c) => c.kind === "paid" || c.kind === "cosigned").length, pays, "one card per payment, none invented");
});

test("live: the now line says who is doing what", () => {
  const name = (id?: string) => (id === "claude" ? "Claude" : "ChainBrain");
  assert.equal(nowLine({ asks: [{ agent: "claude", amount: "HK$0.40" }], busy: false, running: [], watching: 7, agentName: name }).text, "Claude is waiting for your co-signature · HK$0.40");
  assert.equal(nowLine({ asks: [], busy: false, running: [], watching: 7, next: { name: "Durian watch", when: "08:00" }, agentName: name }).text, "Watching 7 cards · next: Durian watch 08:00");
});
