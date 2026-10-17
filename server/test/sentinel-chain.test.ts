import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Address } from "viem";
import { startStack } from "./helpers/stack";
import { autoOwner } from "./helpers/owner";
import { $, atom } from "./helpers/amounts";

let s: Awaited<ReturnType<typeof startStack>>;
let tools: typeof import("../src/wallet/tools").tools;
let bus: typeof import("../src/wallet/events").bus;
let sent: ReturnType<typeof import("../src/sentinel").startSentinel>;
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
  const { startSentinel } = await import("../src/sentinel");
  sent = startSentinel({ decide: async () => null }); // rules only here; the AI layer has its own tests
  pocket = await s.newPocket({ cap: $.cap, askAbove: "never", sellers: ["datalite", "datapro"], budget: $.budget });
  stopOwner = autoOwner({ api, sign: s.ownerSignTransfer });
});
afterAll(async () => { sent?.stop(); stopOwner?.(); await s?.stop(); });

describe("Sentinel on the chain: the guardian key freezes the pocket for real", () => {
  it("three payments outside the rules in a minute -> on-chain freeze; even DataLite is refused; owner unfreezes; DataLite pays", async () => {
    expect(await call("draft_intent", { request: "wine report", description: "Fruit and wine trade report", maxPricePerItem: $.one, maxTotal: $.two, maxItems: 2, deadline: tonight() })).toMatchObject({ ok: true });
    for (let k = 0; k < 3; k++) {
      const q = await call("get_quote", { sellerId: "harbour-wines", sku: "fruit-wine-trade-report" });
      expect(await call("pay", { quoteId: q.quoteId })).toMatchObject({ ok: false, reason: "SELLER_NOT_ALLOWED" });
      await sent.idle();
    }
    const ev = bus.recent().filter((e) => e.type === "sentinel" && e.pocket === pocket);
    expect(ev.map((e) => e.kind)).toEqual(["watch", "freeze"]);
    const freeze = ev.at(-1)!;
    expect(freeze.tx).toMatch(/^0x[0-9a-f]{64}$/);
    const { pocket: P } = await import("../src/wallet/chain");
    expect(await P(pocket).frozen()).toBe(true);
    expect(await P(pocket).canPay(s.payTo.datalite, atom($.durian))).toBe("POCKET_FROZEN");

    const q = await call("get_quote", { sellerId: "datalite", sku: "durian-report" });
    expect(q.allowedByPocket).toMatchObject({ reason: "POCKET_FROZEN" });
    expect(await call("pay", { quoteId: q.quoteId })).toMatchObject({ ok: false, reason: "POCKET_FROZEN" });
    expect(await s.balance(pocket)).toBe(atom($.budget));

    await s.ownerWrite(pocket, "unfreeze");
    const { sentinel } = await import("../src/sentinel");
    expect((await sentinel.status(pocket)).status).toBe("ok");
    expect(bus.recent().filter((e) => e.type === "sentinel" && e.pocket === pocket).at(-1)).toMatchObject({ kind: "clear", by: "unfreeze" });
    const q2 = await call("get_quote", { sellerId: "datalite", sku: "durian-report" });
    expect(await call("pay", { quoteId: q2.quoteId })).toMatchObject({ ok: true, paid: $.durian });
  });
});
