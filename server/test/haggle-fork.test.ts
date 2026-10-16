import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Address } from "viem";
import { startStack } from "./helpers/fork";
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

describe("haggler on the fork: negotiate DataPro down, then the pocket settles exactly the agreed price over x402", () => {
  it("1.50 → 0.90 → 1.20 → 1.05 → final 1.10, accepted, co-signed, paid 1.10 on-chain", async () => {
    expect(await call("draft_intent", { request: "premium report", description: "Durian premium report with 2026 forecast", maxPricePerItem: "2.00", maxTotal: "2.00", maxItems: 1, deadline: tonight() })).toMatchObject({ ok: true });
    const q = await call("get_quote", { sellerId: "datapro", sku: "premium-report" });
    expect(q).toMatchObject({ ok: true, price: "1.50", negotiable: true });
    expect(await call("counter_offer", { quoteId: q.quoteId, price: "1.60" })).toMatchObject({ ok: false, reason: "OFFER_NOT_LOWER" });
    expect(await call("counter_offer", { quoteId: q.quoteId, price: "0.90" })).toMatchObject({ ok: true, deal: false, counter: "1.20", final: false, roundsLeft: 2 });
    expect(await call("counter_offer", { quoteId: q.quoteId, price: "1.05" })).toMatchObject({ ok: true, deal: false, counter: "1.10", final: true });
    expect(await call("counter_offer", { quoteId: q.quoteId, price: "1.10" })).toMatchObject({ ok: true, deal: true, price: "1.10", saved: "0.40", needsOwnerApproval: true });
    const before = await s.usdcBalance(pocket);
    expect(await call("ask_owner", { quoteId: q.quoteId, reason: "Negotiated from US$1.50 to US$1.10" })).toMatchObject({ ok: true, approved: true });
    const paid = await call("pay", { quoteId: q.quoteId });
    expect(paid).toMatchObject({ ok: true, preflight: { matched: true } });
    expect(before - (await s.usdcBalance(pocket))).toBe(1_100_000n);
    const pay = bus.recent().find((e) => e.type === "payment" && e.tx === paid.tx)!;
    expect([pay.amount, pay.list, pay.cosigned]).toEqual([1_100_000n, 1_500_000n, true]);
  }, 120_000);
});
