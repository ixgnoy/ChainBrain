import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorld } from "./world";
import { seedOwner } from "./seed";
import { LAYERS, PROTECT_HEADLINE, layerCounts, protectedLine } from "./protect";
import type { Hex } from "./types";

test("protect: four layers, a headline, and no loss wording anywhere", () => {
  assert.deepEqual(LAYERS.map((l) => l.key), ["radar", "preflight", "contract", "sentinel"]);
  for (const s of [PROTECT_HEADLINE, ...LAYERS.map((l) => l.line), protectedLine(["Exa"]), protectedLine([]), protectedLine(["Exa"], true)]) assert.doesNotMatch(s, /\blose\b|worst/i);
});

test("protect: each layer's line counts what it really did in the seeded world", async () => {
  const w = createWorld({ speed: 0, seed: 11 });
  await seedOwner(w, "0x7c5e000000000000000000000000000000001d47" as Hex);
  const ev = w.events(0) as never[];
  const c = layerCounts(ev);
  assert.match(c.radar, /^\d+ screens/);
  assert.match(c.preflight, /^(\d+) of \d+ predicted$/);
  assert.match(c.contract, /^\d+ attempts? refused$/);
  assert.equal(layerCounts([]).sentinel, "Watching");
});
