import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Address } from "viem";
import { startStack } from "./helpers/stack";
import { autoOwner } from "./helpers/owner";
import { $, atom, f } from "./helpers/amounts";

let s: Awaited<ReturnType<typeof startStack>>;
let tools: typeof import("../src/wallet/tools").tools;
let pocket: Address;
let stopOwner: () => void;
const call = (name: string, args: object = {}) => tools[name].run({ pocket }, args) as Promise<any>;
const tonight = () => new Date(Date.now() + 6 * 3600_000).toISOString();
const WEEKLY = "3.00"; // one durian report fits, a second does not

beforeAll(async () => {
  s = await startStack();
  process.env.APPROVAL_WAIT_MS = "20000";
  ({ tools } = await import("../src/wallet/tools"));
  const api = (await import("../src/index")).apiApp();
  pocket = await s.newPocket({ cap: $.cap, askAbove: "never", sellers: ["datalite", "datapro"], budget: $.budget });
  await s.ownerWrite(pocket, "setPeriodLimit", [2, atom(WEEKLY)]); // the owner's signed transaction: HK$3.00 a week
  stopOwner = autoOwner({ api, sign: s.ownerSignTransfer });
});
afterAll(async () => { stopOwner?.(); await s?.stop(); });

describe("the period allowance holds on the chain, not just in the server", () => {
  it("first report pays; the second is OVER_PERIOD for the agent alone; the owner's co-signature lets it through", async () => {
    expect(await call("draft_intent", { request: "durian reports", description: "Durian market reports", maxPricePerItem: $.one, maxTotal: $.two, maxItems: 2, deadline: tonight() })).toMatchObject({ ok: true });
    const q1 = await call("get_quote", { sellerId: "datalite", sku: "durian-report" });
    expect(await call("pay", { quoteId: q1.quoteId })).toMatchObject({ ok: true, paid: $.durian });

    const { pocket: P } = await import("../src/wallet/chain");
    expect((await P(pocket).info()).spent).toBe(atom($.durian));
    expect(await call("get_pocket")).toMatchObject({ allowance: { per: "week", limit: f(WEEKLY), spentThisPeriod: f($.durian) } });

    const q2 = await call("get_quote", { sellerId: "datalite", sku: "durian-report" });
    expect(q2).toMatchObject({ allowedByPocket: { reason: "OVER_PERIOD" }, needsOwnerApproval: true });
    expect(await call("pay", { quoteId: q2.quoteId })).toMatchObject({ ok: false, reason: "OVER_PERIOD" });
    expect(await s.balance(pocket)).toBe(atom($.budget) - atom($.durian)); // nothing moved

    expect(await call("ask_owner", { quoteId: q2.quoteId, reason: "Second durian report this week, over the allowance" })).toMatchObject({ ok: true, approved: true });
    expect(await call("pay", { quoteId: q2.quoteId })).toMatchObject({ ok: true, paid: $.durian });
    expect((await P(pocket).info()).spent).toBe(2n * atom($.durian));
  });

  it("a per-seller cap overrides the pocket cap for that seller only", async () => {
    await s.ownerWrite(pocket, "setPeriodLimit", [0, 0n]);
    await s.ownerWrite(pocket, "setSellerCap", [s.payTo.datalite, atom("1.00")]);
    const { pocket: P } = await import("../src/wallet/chain");
    expect(await P(pocket).canPay(s.payTo.datalite, atom($.durian))).toBe("OVER_CAP");
    expect(await P(pocket).canPay(s.payTo.datapro, atom($.premium))).toBe("OK"); // DataPro still has the pocket's cap
  });
});
