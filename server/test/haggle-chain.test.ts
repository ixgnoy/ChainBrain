import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Address } from "viem";
import { startStack } from "./helpers/stack";
import { autoOwner } from "./helpers/owner";
import { $, atom } from "./helpers/amounts";

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
  pocket = await s.newPocket({ cap: $.cap, askAbove: $.ask, sellers: ["datalite", "datapro"], budget: $.budget });
  stopOwner = autoOwner({ api, sign: s.ownerSignTransfer });
});
afterAll(async () => { stopOwner?.(); await s?.stop(); });

describe("haggler on the chain: negotiate DataPro down, then the pocket settles exactly the agreed price over x402", () => {
  it(`${$.premium} → ${$.hag.o1} → ${$.hag.c1} → ${$.hag.o2} → final ${$.hag.c2}, accepted, co-signed, paid ${$.hag.c2} on-chain`, async () => {
    expect(await call("draft_intent", { request: "premium report", description: "Durian premium report with 2026 forecast", maxPricePerItem: $.perItem, maxTotal: $.perItem, maxItems: 1, deadline: tonight() })).toMatchObject({ ok: true });
    const q = await call("get_quote", { sellerId: "datapro", sku: "premium-report" });
    expect(q).toMatchObject({ ok: true, price: $.premium, negotiable: true });
    expect(await call("counter_offer", { quoteId: q.quoteId, price: $.hag.over })).toMatchObject({ ok: false, reason: "OFFER_NOT_LOWER" });
    expect(await call("counter_offer", { quoteId: q.quoteId, price: $.hag.o1 })).toMatchObject({ ok: true, deal: false, counter: $.hag.c1, final: false, roundsLeft: 2 });
    expect(await call("counter_offer", { quoteId: q.quoteId, price: $.hag.o2 })).toMatchObject({ ok: true, deal: false, counter: $.hag.c2, final: true });
    expect(await call("counter_offer", { quoteId: q.quoteId, price: $.hag.c2 })).toMatchObject({ ok: true, deal: true, price: $.hag.c2, saved: $.hag.saved, needsOwnerApproval: true });
    const before = await s.balance(pocket);
    expect(await call("ask_owner", { quoteId: q.quoteId, reason: `Negotiated from ${$.cur}${$.premium} to ${$.cur}${$.hag.c2}` })).toMatchObject({ ok: true, approved: true });
    const paid = await call("pay", { quoteId: q.quoteId });
    expect(paid).toMatchObject({ ok: true, preflight: { matched: true } });
    expect(before - (await s.balance(pocket))).toBe(atom($.hag.c2));
    const pay = bus.recent().find((e) => e.type === "payment" && e.tx === paid.tx)!;
    expect([pay.amount, pay.list, pay.cosigned]).toEqual([atom($.hag.c2), atom($.premium), true]);
  }, 120_000);
});
