import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Address } from "viem";
import { bus } from "../src/wallet/events";
import { startSentinel, sentinel } from "../src/sentinel";
import { jev, jevLike, type Decide } from "../src/sentinel/decide";
import { gate, rules } from "../../shared/sim/sentinel";

const P = "0x00000000000000000000000000000000000000a1" as Address;
const refusal = (reason = "SELLER_NOT_ALLOWED") => bus.publish({ type: "refusal", pocket: P, sellerId: "harbour-wines", sku: "x", amount: 400000n, reason });
const sentinelEvents = () => bus.recent().filter((e) => e.type === "sentinel" && e.pocket === P);

const running: { stop(): void }[] = [];
const start = (d: Parameters<typeof startSentinel>[0]) => { const s = startSentinel({ isFrozen: async () => true, ...d }); running.push(s); return s; };
beforeEach(() => { bus.clear(); sentinel.reset(); });
afterEach(() => { for (const s of running.splice(0)) s.stop(); });

describe("Sentinel rules and gate (shared core)", () => {
  it("3 probes in a minute = freeze; 2 = watch; refusals that are not probes do not count", () => {
    const at = (s: number) => 1_000_000 + s * 1000;
    const ev = (s: number, reason: string) => ({ type: "refusal", reason, at: at(s) });
    expect(rules({ events: [ev(0, "SELLER_NOT_ALLOWED"), ev(10, "OVER_CAP"), ev(20, "SELLER_NOT_ALLOWED")], now: at(30) }).map((s) => s.id)).toEqual(["REFUSAL_BURST"]);
    expect(rules({ events: [ev(0, "SELLER_NOT_ALLOWED"), ev(10, "OVER_CAP")], now: at(30) }).map((s) => s.id)).toEqual(["PROBING"]);
    expect(rules({ events: [ev(0, "NEEDS_OWNER_APPROVAL"), ev(1, "OWNER_DECLINED"), ev(2, "POCKET_REVOKED")], now: at(30) })).toEqual([]);
    expect(rules({ events: [ev(0, "SELLER_NOT_ALLOWED"), ev(10, "OVER_CAP"), ev(20, "SELLER_NOT_ALLOWED")], now: at(90) })).toEqual([]); // older than a minute
    expect(rules({ events: [], now: 0, ghosts: [{ tx: "0x1", to: "0x2", amount: 1n }] })[0].severity).toBe("freeze");
  });

  it("the AI can raise the decision, never lower it; low confidence cannot freeze", () => {
    expect(gate("freeze", { hijack: 0, action: "ok", confidence: 1, by: "jev" })).toEqual({ action: "freeze" });
    expect(gate("watch", { hijack: 0.9, action: "freeze", confidence: 0.8, by: "jev" })).toEqual({ action: "freeze", raisedBy: "ai" });
    expect(gate("watch", { hijack: 0.5, action: "freeze", confidence: 0.5, by: "jev" })).toEqual({ action: "hold", raisedBy: "ai" });
    expect(gate("watch", null)).toEqual({ action: "watch" });
  });
});

describe("Sentinel service", () => {
  it("freezes on-chain after a refusal burst, with the AI's typed answer and a fixed-template state", async () => {
    const states: string[] = [];
    const frozen: string[] = [];
    const decide: Decide = async (s) => (states.push(s), { hijack: 0.9, action: "freeze", confidence: 0.9, by: "jev" });
    const s = start({ decide, freeze: async (p, reason) => (frozen.push(`${p}:${reason}`), "0xfeed" as `0x${string}`) });
    refusal(); refusal("OVER_CAP");
    await s.idle();
    expect(sentinelEvents().map((e) => e.kind)).toEqual(["freeze"]); // 2 probes = watch by rule, raised to freeze by a confident AI
    expect(sentinelEvents()[0]).toMatchObject({ raisedBy: "ai", tx: "0xfeed", ai: { by: "jev" } });
    expect(frozen).toEqual([`${P}:PROBING`]);
    expect(states[0]).toContain("Recent refusals by the wallet: SELLER_NOT_ALLOWED, OVER_CAP");
  });

  it("without the AI the rules decide alone; without a guardian key a freeze becomes a hold the tools enforce", async () => {
    const s = start({ decide: async () => null, freeze: async () => { throw new Error("SENTINEL_PK not set"); } });
    for (let k = 0; k < 3; k++) { refusal(); await s.idle(); }
    refusal(); await s.idle(); // a fourth probe does not repeat the hold
    expect(sentinelEvents().map((e) => e.kind)).toEqual(["watch", "hold"]);
    expect(sentinelEvents().at(-1)?.note).toMatch(/on-chain freeze failed/);
    expect(sentinel.isHeld(P)).toBe(true);
    sentinel.release(P);
    expect(sentinel.isHeld(P)).toBe(false);
    expect(sentinelEvents().at(-1)).toMatchObject({ kind: "clear", by: "cosign" });
  });
});

describe("AI layer adapters", () => {
  it("Jev: System One request shape and typed answer", async () => {
    process.env.TYPESAFE_API_KEY = "test-key";
    let body: any, headers: any;
    const fake = (async (_url: string, init: any) => { body = JSON.parse(init.body); headers = init.headers; return new Response(JSON.stringify({ model: "jev-1", answers: { hijack: { type: "noul", noul: 0.91 }, action: { type: "choice", choice: "freeze", probabilities: { freeze: 0.8 }, confidence: 0.8 } } })); }) as any;
    expect(await jev(fake)("state")).toEqual({ hijack: 0.91, action: "freeze", confidence: 0.8, by: "jev" });
    expect(body).toMatchObject({ model: "jev-latest", state: "state", questions: { hijack: { type: "noul" }, action: { type: "choice", criteria: { ok: expect.any(String), freeze: expect.any(String) } } } });
    expect(headers.authorization).toBe("Bearer test-key");
    delete process.env.TYPESAFE_API_KEY;
  });

  it("Claude stand-in: forced tool answer, normalised; nonsense answers are dropped", async () => {
    const ok = jevLike(async () => ({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "a", name: "answer", input: { hijack: 1.4, action: "hold", confidence: 0.6 } }] }) as any);
    expect(await ok("s")).toEqual({ hijack: 1, action: "hold", confidence: 0.6, by: "claude-haiku" });
    const bad = jevLike(async () => ({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "a", name: "answer", input: { hijack: 0.2, action: "approve" } }] }) as any);
    expect(await bad("s")).toBeNull();
  });
});
