import { EventEmitter } from "node:events";
import { streamSSE } from "hono/streaming";
import type { Context } from "hono";

export type WalletEvent = {
  type: "trace" | "intent" | "approval" | "payment" | "refusal" | "disclosure" | "question" | "radar" | "sentinel" | "preflight" | "haggle" | "attack" | "forced";
  pocket?: string;
  at?: number;
  [k: string]: unknown;
};

const em = new EventEmitter();
em.setMaxListeners(100);
const recent: WalletEvent[] = [];
export const toJson = (e: unknown) => JSON.stringify(e, (_, v) => (typeof v === "bigint" ? v.toString() : v));

export const bus = {
  publish(e: WalletEvent) {
    const ev = { ...e, at: Date.now() };
    recent.push(ev);
    if (recent.length > 1000) recent.shift();
    em.emit("e", ev);
  },
  subscribe(fn: (e: WalletEvent) => void) {
    em.on("e", fn);
    return () => void em.off("e", fn);
  },
  recent: () => recent.slice(),
  clear: () => void (recent.length = 0),
};

/** GET /api/events?pocket=0x… : replays recent events, then streams. */
export const sse = (c: Context) =>
  streamSSE(c, async (s) => {
    const p = c.req.query("pocket")?.toLowerCase();
    const mine = (e: WalletEvent) => !p || e.pocket?.toLowerCase() === p;
    for (const e of bus.recent().filter(mine)) await s.writeSSE({ data: toJson(e) });
    const off = bus.subscribe((e) => void (mine(e) && s.writeSSE({ data: toJson(e) })));
    s.onAbort(off);
    while (!s.aborted) await s.sleep(15_000);
  });
