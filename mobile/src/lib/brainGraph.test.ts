import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorld, seedOwner } from "../../../shared/sim";
import { brainGraph, pulsesOf } from "./brainGraph";
import type { WalletEvent } from "./events";

const OWNER = "0x7c5e000000000000000000000000000000001d47" as const;
/** The phone's pockets list their sellers by id; the seed names them in its events, so the test takes them from there. */
const pocketsOf = (s: Awaited<ReturnType<typeof seedOwner>>, ev: WalletEvent[]) => s.pockets.map((p) => ({ address: p.address, agentId: p.agent, name: p.name,
  allowed: [...new Set(ev.filter((e) => String(e.pocket).toLowerCase() === p.address.toLowerCase() && e.sellerId).map((e) => String(e.sellerId)))] }));
const eventsOf = (w: ReturnType<typeof createWorld>, s: Awaited<ReturnType<typeof seedOwner>>) => {
  const mine = new Set(s.pockets.map((p) => p.address.toLowerCase()));
  return w.events(0).filter((e) => e.pocket && mine.has(String(e.pocket).toLowerCase())) as unknown as WalletEvent[];
};

test("brain graph: every node is a real agent, pocket or seller, every edge joins two nodes", async () => {
  const w = createWorld({ speed: 0, seed: 11 });
  const s = await seedOwner(w, OWNER);
  const pockets = pocketsOf(s, eventsOf(w, s));
  assert.ok(pockets.some((p) => p.allowed.length));
  const g = brainGraph({ pockets, agentName: (id) => id, sellerName: (id) => id, memory: 3 });
  const ids = new Set(g.nodes.map((n) => n.id));
  assert.equal(ids.size, g.nodes.length, "ids are unique");
  assert.equal(g.nodes.filter((n) => n.kind === "pocket").length, pockets.length);
  assert.equal(g.nodes.filter((n) => n.kind === "agent").length, new Set(pockets.map((p) => p.agentId ?? "chainbrain")).size);
  assert.equal(g.nodes.filter((n) => n.kind === "seller").length, new Set(pockets.flatMap((p) => p.allowed)).size);
  assert.equal(g.nodes.filter((n) => n.kind === "memory").length, 3);
  for (const e of g.edges) assert.ok(ids.has(e.from) && ids.has(e.to), `${e.from} → ${e.to}`);
  for (const n of g.nodes) assert.ok(n.x >= 0 && n.x <= 1 && n.y >= 0 && n.y <= 1, `${n.id} inside`);
});

test("brain graph: one pulse per decision, each along nodes of the graph, newest first", async () => {
  const w = createWorld({ speed: 0, seed: 11 });
  const s = await seedOwner(w, OWNER);
  const ev = eventsOf(w, s);
  const agentOf = (p?: string) => s.pockets.find((x) => x.address.toLowerCase() === String(p).toLowerCase())?.agent ?? "chainbrain";
  const pockets = pocketsOf(s, ev);
  const ids = new Set(brainGraph({ pockets, agentName: String, sellerName: String, memory: 0 }).nodes.map((n) => n.id));
  const pulses = pulsesOf(ev, { agentOf, sellerName: (id) => String(id), agentName: (id) => String(id), now: w.now(), days: 30 });
  assert.ok(pulses.length > 5);
  for (let i = 1; i < pulses.length; i++) assert.ok(pulses[i - 1].at >= pulses[i].at, "newest first");
  const pays = ev.filter((e) => e.type === "payment" && e.at >= w.now() - 30 * 86_400_000).length;
  assert.equal(pulses.filter((p) => p.tone === "paid").length, pays, "one pulse per payment, none invented");
  for (const p of pulses) for (const n of p.path) assert.ok(ids.has(n), `${p.key}: ${n} is a node`);
});
