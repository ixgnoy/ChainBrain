import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Address } from "viem";
import { startStack } from "./helpers/stack";
import { autoOwner } from "./helpers/owner";

let s: Awaited<ReturnType<typeof startStack>>;
let tools: typeof import("../src/wallet/tools").tools;
let bus: typeof import("../src/wallet/events").bus;
let pocket: Address;
let stopOwner: () => void;
const call = (name: string, args: object = {}) => tools[name].run({ pocket }, args) as Promise<any>;
const tonight = () => new Date(Date.now() + 6 * 3600_000).toISOString();

beforeAll(async () => {
  s = await startStack();
  process.env.APPROVAL_WAIT_MS = "20000";
  ({ tools } = await import("../src/wallet/tools"));
  ({ bus } = await import("../src/wallet/events"));
  const api = (await import("../src/index")).apiApp();
  pocket = await s.newPocket({ cap: "2", askAbove: "1", sellers: ["datalite", "datapro"], budget: "5" });
  stopOwner = autoOwner({ api, sign: s.ownerSignTransfer });
});
afterAll(async () => { stopOwner?.(); await s?.stop(); });

describe("pre-flight on the fork: predict each payment with eth_call, then check", () => {
  it("predicts pays / SELLER_NOT_ALLOWED / NEEDS_OWNER_APPROVAL / co-signed pays, and every prediction matches", async () => {
    expect(await call("draft_intent", { request: "reports", description: "Durian and wine reports", maxPricePerItem: "2.00", maxTotal: "4.00", maxItems: 4, deadline: tonight() })).toMatchObject({ ok: true });
    const pay = async (sellerId: string, sku: string) => call("pay", { quoteId: (await call("get_quote", { sellerId, sku })).quoteId });

    expect(await pay("datalite", "durian-report")).toMatchObject({ ok: true, preflight: { predicted: "pays", matched: true } });
    expect(await pay("harbour-wines", "fruit-wine-trade-report")).toMatchObject({ ok: false, reason: "SELLER_NOT_ALLOWED", preflight: { predicted: "refused", matched: true } });
    const q = await call("get_quote", { sellerId: "datapro", sku: "premium-report" });
    expect(await call("pay", { quoteId: q.quoteId })).toMatchObject({ ok: false, reason: "NEEDS_OWNER_APPROVAL", preflight: { predicted: "refused", matched: true } });
    expect(await call("ask_owner", { quoteId: q.quoteId, reason: "Forecast for US$1.50." })).toMatchObject({ approved: true });
    expect(await call("pay", { quoteId: q.quoteId })).toMatchObject({ ok: true, preflight: { predicted: "pays", matched: true } });

    const results = bus.recent().filter((e) => e.type === "preflight" && e.kind === "result" && e.pocket === pocket);
    expect(results.map((e) => [(e as any).predicted.outcome, (e as any).predicted.by, (e as any).matched])).toEqual([
      ["pays", "eth_call", true], ["refused", "eth_call", true], ["refused", "eth_call", true], ["pays", "eth_call", true],
    ]);
    expect((results[1] as any).predicted.reason).toBe("SELLER_NOT_ALLOWED");
    expect((results[0] as any).predicted.balanceAfter).toBe("4700000");
  });
});
