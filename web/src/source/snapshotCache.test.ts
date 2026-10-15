import { expect, it } from "vitest";
import { createLocalFeed } from "./localFeed";
import { toBig } from "../console/chain";

it("a snapshot keeps the same events and transactions until something new arrives", async () => {
  const feed = createLocalFeed({ speed: 0, seed: 7, revokeWindowMs: 0, background: false });
  await feed.autopilot.ready();
  const a = feed.snapshot(), b = feed.snapshot();
  expect(b.events).toBe(a.events);
  expect(b.allTxs).toBe(a.allTxs);
  expect(b.txs).toBe(a.txs);
  const { pocket } = (await feed.actions.runScene!("6")) as { pocket: string };
  const c = feed.snapshot();
  expect(c.events).not.toBe(a.events);
  expect(c.events.length).toBeGreaterThan(a.events.length);
  expect(feed.snapshot().events).toBe(c.events);
  expect(pocket).toBeTruthy();
});

it("toBig never throws on an odd amount", () => {
  expect(toBig("50000000")).toBe(50_000_000n);
  expect(toBig(undefined)).toBe(0n);
  expect(toBig("abc")).toBe(0n);
  expect(toBig("1.5")).toBe(0n);
});
