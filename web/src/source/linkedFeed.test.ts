import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createLinkedFeed, latestPocket } from "./linkedFeed";
import { sayOnPhone, NO_ANSWER } from "../console/play";
import { lookupTx, pocketLookups } from "../console/network";
import { worstCase } from "../console/worst";
import type { LocalFeed } from "./localFeed";

const A = "0x" + "a".repeat(40), B = "0x" + "b".repeat(40), C = "0x" + "c".repeat(40);
const OWNER = "0x" + "1".repeat(40), AGENT = "0x" + "2".repeat(40);
const wirePocket = (address: string, balance = "5000000") => ({ address, owner: OWNER, agent: AGENT, balance, cap: "2000000", askAbove: "1000000", expiresAt: 4_000_000_000, revoked: false, allowed: ["datalite"] });
const snap = (pockets: string[], names: Record<string, string> = {}, txs: object[] = []) => ({ pockets: pockets.map((a) => wirePocket(a)), names, txs });

class FakeES {
  static last: FakeES;
  url: string;
  onmessage: ((e: { data: string }) => void) | null = null; onerror: (() => void) | null = null;
  constructor(url: string) { this.url = url; FakeES.last = this; }
  close() {}
  push(m: object) { this.onmessage?.({ data: JSON.stringify(m) }); }
}

const localStub = (): LocalFeed => ({
  cfg: { sellers: [] } as never, scenes: [], world: {} as never,
  autopilot: { hold() {}, release() {} } as never,
  actions: { plant: vi.fn(), forceTransfer: vi.fn(), runScene: vi.fn() },
  snapshot: () => ({ events: [], pockets: [], txs: [], allTxs: [] }),
  subscribe: () => () => {}, start() {}, stop() {},
});

const commands: Record<string, unknown>[] = [];
beforeEach(() => {
  commands.length = 0;
  vi.stubGlobal("EventSource", FakeES);
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/state")) return { ok: true, json: async () => ({ linked: true }) };
    if (url.endsWith("/command")) { commands.push(JSON.parse(String(init?.body))); return { ok: true, json: async () => ({ id: commands.length }) }; }
    return { ok: false, status: 404 };
  }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

async function link() {
  FakeES.last = undefined as never;
  const feed = createLinkedFeed(localStub(), "http://relay");
  feed.start();
  await vi.waitFor(() => expect(FakeES.last).toBeTruthy());
  return { feed, es: FakeES.last };
}

it("follows the phone's newest pocket as events arrive, even before a snapshot knows it", async () => {
  const { feed, es } = await link();
  es.push({ kind: "hello", linked: true, snapshot: snap([A], { [A.toLowerCase()]: "Research data" }), events: [{ type: "payment", pocket: A, at: 100 }], lastSeen: 1 });
  expect(feed.snapshot().follow).toBe(A);
  expect(feed.snapshot().linked).toBe(true);
  // a question carries its pocket only inside the approval card
  es.push({ kind: "events", events: [{ type: "question", at: 200, approval: { id: "q", pocket: B, kind: "question", text: "?", status: "pending" } }] });
  expect(feed.snapshot().follow).toBe(B);
  feed.stop();
});

it("names pockets with the phone's names and marks them as the phone's", async () => {
  const { feed, es } = await link();
  es.push({ kind: "hello", linked: true, snapshot: snap([A], { [A.toLowerCase()]: "Research data" }), events: [] });
  const s = feed.snapshot();
  const look = pocketLookups(s.pockets, s.phonePockets);
  expect(look.nameOf(A)).toBe("Research data");
  expect(look.nameOf(C)).toBe("Pocket CCCC");
  expect(look.isPhone(A)).toBe(true);
  expect(look.isPhone(C)).toBe(false);
  feed.stop();
});

it("drops the old phone's pockets when a new device resets the link, keeping its first events", async () => {
  const { feed, es } = await link();
  es.push({ kind: "hello", linked: true, snapshot: snap([A, B]), events: [{ type: "payment", pocket: A, at: 1 }] });
  expect(feed.snapshot().pockets.map((p) => p.address)).toEqual([A, B]);
  es.push({ kind: "reset", device: "new" });
  es.push({ kind: "events", events: [{ type: "payment", pocket: C, at: 5 }] });
  expect(feed.snapshot().pockets).toEqual([]);
  expect(feed.snapshot().follow).toBe(C);
  es.push({ kind: "snapshot", snapshot: snap([C]), lastSeen: 2 });
  expect(feed.snapshot().pockets.map((p) => p.address)).toEqual([C]);
  feed.stop();
});

it("Play on a linked phone sends a say command and returns the phone's answer", async () => {
  const { feed, es } = await link();
  es.push({ kind: "hello", linked: true, snapshot: snap([A]), events: [] });
  const p = feed.actions.say!("Buy the DataLite durian report.", "research");
  await vi.waitFor(() => expect(commands).toHaveLength(1));
  expect(commands[0]).toEqual({ type: "say", text: "Buy the DataLite durian report.", preset: "research" });
  await new Promise((r) => setTimeout(r, 0)); // the command's id has come back and its answer is awaited
  es.push({ kind: "result", id: 1, result: { ok: true, text: "Typed on the phone.", pocket: A } });
  expect(await p).toEqual({ ok: true, text: "Typed on the phone.", pocket: A });
  feed.stop();
});

it("a say that gets no answer ends with a message after 15 s instead of hanging", async () => {
  vi.useFakeTimers();
  const never = new Promise<never>(() => {});
  const r = sayOnPhone(() => never, "hi");
  await vi.advanceTimersByTimeAsync(15_000);
  expect(await r).toEqual({ ok: false, text: NO_ANSWER });
  expect(await sayOnPhone(async () => { throw new Error("The phone is not connected"); }, "hi")).toEqual({ ok: false, text: "The phone is not connected" });
});

it("picks the pocket with the newest event or transaction", () => {
  expect(latestPocket([{ type: "payment", pocket: A, at: 10 }, { type: "payment", pocket: B, at: 5 }], [], [])).toBe(A);
  expect(latestPocket([{ type: "payment", pocket: A, at: 10 }], [{ pocket: B, at: 20, kind: "create", hash: "0x1", block: 1n, logIndex: 0 } as never], [])).toBe(B);
});

it("worst case shrinks as money leaves and does not move for a refused attempt", () => {
  const p = { address: A, owner: OWNER, agent: AGENT, balance: 10_000_000n, cap: 2_000_000n, askAbove: 0n, expiresAt: 4_000_000_000, revoked: false, allowed: ["datalite"] } as never;
  const fund = [{ kind: "fund", pocket: A, amount: 10_000_000n }] as never;
  const name = (id: string) => (id === "datalite" ? "DataLite" : id);
  const full = worstCase(p, fund, name);
  expect(full.share).toBe(1);
  expect(full.to).toEqual(["DataLite"]);
  const paid = worstCase({ ...(p as object), balance: 7_000_000n } as never, fund, name);
  expect(paid.share).toBe(0.7);
  expect(worstCase({ ...(p as object), balance: 7_000_000n } as never, fund, name).share).toBe(paid.share); // refusal: same balance, same bar
  expect(worstCase({ ...(p as object), revoked: true } as never, fund, name).max).toBe(0n);
});

it("a hash a screen shows always resolves: chain tx, then the event that carried it, then Pending (never dashes)", () => {
  const h = "0x" + "9".repeat(64);
  const pay = { type: "payment", pocket: A, sellerId: "datalite", amount: "300000", tx: h, at: 7 };
  const d = lookupTx(h, [], [pay], [], () => C);
  expect(d).toMatchObject({ label: "Payment", status: "success", from: A, to: C, amount: 300000n });
  expect(lookupTx("0x" + "8".repeat(64), [], [], [], () => undefined).status).toBe("pending");
});

it("keeps the phone's events across a quiet spell and shows them again when it resumes", async () => {
  const { feed, es } = await link();
  es.push({ kind: "hello", linked: true, snapshot: snap([A]), events: [{ type: "payment", pocket: A, at: 1 }] });
  es.push({ kind: "beat", linked: false });
  expect(feed.snapshot().linked).toBeFalsy(); // quiet: the console is not driven by it
  es.push({ kind: "events", events: [{ type: "refusal", pocket: A, at: 2 }] });
  es.push({ kind: "snapshot", snapshot: snap([A]) });
  const s = feed.snapshot();
  expect(s.linked).toBe(true);
  expect(s.events.map((e) => e.type)).toEqual(["payment", "refusal"]);
  feed.stop();
});

it("a failed force on the phone is an error, never 'NOT refused'", async () => {
  const { feed, es } = await link();
  es.push({ kind: "hello", linked: true, snapshot: snap([A]), events: [] });
  const done = feed.actions.forceTransfer!(A);
  await vi.waitFor(() => expect(commands.length).toBe(1)); await new Promise((r) => setTimeout(r, 0));
  es.push({ kind: "result", id: 1, result: { ok: false, text: "not a pocket" } });
  expect(await done).toEqual({ ok: false, text: "not a pocket" });
  const done2 = feed.actions.forceTransfer!(A);
  await vi.waitFor(() => expect(commands.length).toBe(2)); await new Promise((r) => setTimeout(r, 0));
  es.push({ kind: "result", id: 2, result: { ok: false, reverted: false } });
  expect((await done2).text).toBe("The transfer was NOT refused.");
  feed.stop();
});
