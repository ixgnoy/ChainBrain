import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Address } from "viem";
import { startStack } from "./helpers/stack";
import { autoOwner } from "./helpers/owner";
import { $, atom, f } from "./helpers/amounts";

let s: Awaited<ReturnType<typeof startStack>>;
let tools: typeof import("../src/wallet/tools").tools;
let bus: typeof import("../src/wallet/events").bus;
let api: ReturnType<typeof import("../src/index").apiApp>;
let research: Address;
let stopOwner: () => void;

const tonight = () => new Date(Date.now() + 6 * 3600_000).toISOString();
const intent = (o: object = {}) => ({ request: `a market report on durian exports, under ${$.cur}${$.perItem} per report, by tonight`, description: "Durian export market data", maxPricePerItem: $.perItem, maxTotal: $.total, maxItems: 4, deadline: tonight(), ...o });
const call = (name: string, args: object = {}, pocket = research) => tools[name].run({ pocket }, args) as Promise<any>;

beforeAll(async () => {
  s = await startStack();
  process.env.APPROVAL_WAIT_MS = "20000";
  ({ tools } = await import("../src/wallet/tools"));
  ({ bus } = await import("../src/wallet/events"));
  api = (await import("../src/index")).apiApp();
  research = await s.newPocket({ cap: $.cap, askAbove: $.ask, sellers: ["datalite", "datapro"], budget: $.budget });
  stopOwner = autoOwner({ api, sign: s.ownerSignTransfer });
});
afterAll(async () => { stopOwner?.(); await s?.stop(); });

describe("tools (local stack, scripted owner)", () => {
  it("pay before any confirmed intent → INTENT_NOT_CONFIRMED", async () => {
    const q = await call("get_quote", { sellerId: "datalite", sku: "durian-report" });
    expect(await call("pay", { quoteId: q.quoteId })).toMatchObject({ ok: false, reason: "INTENT_NOT_CONFIRMED" });
  });

  it("get_pocket and search_sellers show rules and allowlist, never the owner", async () => {
    const p = await call("get_pocket");
    expect(p).toMatchObject({ ok: true, balance: f($.budget), perPaymentCap: f($.cap), askMeAbove: f($.ask), revoked: false, allowedSellers: ["DataLite", "DataPro"] });
    const list = await call("search_sellers");
    expect(list.sellers.find((x: any) => x.id === "harbour-wines").allowedByPocket).toBe(false);
    expect(JSON.stringify([p, list]).toLowerCase()).not.toContain(s.owner.address.toLowerCase());
  });

  it("scenes 1–2: owner confirms the intent; DataLite paid with a tx; content is wrapped", async () => {
    expect(await call("draft_intent", intent())).toMatchObject({ ok: true, status: "confirmed" });
    const q = await call("get_quote", { sellerId: "datalite", sku: "durian-report" });
    expect(q).toMatchObject({ price: $.durian, allowedByPocket: "OK", needsOwnerApproval: false, intentCheck: "OK" });
    const r = await call("pay", { quoteId: q.quoteId });
    expect(r).toMatchObject({ ok: true, paid: $.durian });
    expect(r.tx).toMatch(/^0x[0-9a-f]{64}$/);
    expect(r.content.startsWith('<untrusted_content source="datalite">')).toBe(true);
  });

  it("scene 3: DataPro needs approval; ask_owner gets the owner's signature; pay settles co-signed", async () => {
    const q = await call("get_quote", { sellerId: "datapro", sku: "premium-report" });
    expect(q.needsOwnerApproval).toBe(true);
    expect(await call("pay", { quoteId: q.quoteId })).toMatchObject({ ok: false, reason: "NEEDS_OWNER_APPROVAL" });
    expect(await call("ask_owner", { quoteId: q.quoteId, reason: `Premium report adds the 2026 forecast for ${$.cur}${$.premium}.` })).toMatchObject({ ok: true, approved: true });
    const r = await call("pay", { quoteId: q.quoteId });
    expect(r).toMatchObject({ ok: true, paid: $.premium });
    expect(bus.recent().some((e) => e.type === "payment" && e.cosigned === true && e.tx === r.tx)).toBe(true);
  });

  it("an approval signed by a non-owner key is rejected by the API", async () => {
    stopOwner();
    try {
      const q = await call("get_quote", { sellerId: "datapro", sku: "premium-report" });
      const pending = call("ask_owner", { quoteId: q.quoteId, reason: "test" });
      await new Promise((r) => setTimeout(r, 300));
      const [a] = (await (await api.request(`/api/pending?pocket=${research}`)).json()) as any[];
      const { transferTypedData } = await import("../src/wallet/scheme");
      const forged = await s.agent.signTypedData(transferTypedData(a.data.auth));
      const res = await api.request(`/api/approvals/${a.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ approved: true, signature: forged }) });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "OWNER_SIGNATURE_INVALID" });
      await api.request(`/api/approvals/${a.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ approved: false }) });
      expect(await pending).toMatchObject({ ok: false, reason: "OWNER_DECLINED" });
    } finally {
      stopOwner = autoOwner({ api, sign: s.ownerSignTransfer });
    }
  });

  it("scene 4: Harbour Wines shows SELLER_NOT_ALLOWED and pay refuses; the allowed alternative works", async () => {
    const q = await call("get_quote", { sellerId: "harbour-wines", sku: "fruit-wine-trade-report" });
    expect(q.allowedByPocket.reason).toBe("SELLER_NOT_ALLOWED");
    expect(await call("pay", { quoteId: q.quoteId })).toMatchObject({ ok: false, reason: "SELLER_NOT_ALLOWED" });
    const alt = await call("get_quote", { sellerId: "datalite", sku: "fruit-trade-report" });
    expect(await call("pay", { quoteId: alt.quoteId })).toMatchObject({ ok: true, paid: $.fruit });
  });

  it("scenes 5–6: ShadyFeed preview is wrapped, and its data and signature asks are refused and shown", async () => {
    const r = await call("get_quote", { sellerId: "shadyfeed", sku: "preview" });
    expect(r).toMatchObject({ ok: true, free: true, refused: ["DISCLOSURE_REFUSED", "SIGNATURE_TYPE_NOT_ALLOWED"] });
    expect(r.content).toContain("<untrusted_content");
    const ev = bus.recent().findLast((e) => e.type === "disclosure");
    expect(ev).toMatchObject({ sellerId: "shadyfeed", signRequest: true });
    expect(ev!.asked).toContain("owner_full_name");
  });

  it("the intent's per-item max is enforced by the tool layer", async () => {
    expect(await call("draft_intent", intent({ maxPricePerItem: $.low }))).toMatchObject({ ok: true });
    const q = await call("get_quote", { sellerId: "datapro", sku: "premium-report" });
    expect(q.intentCheck.reason).toBe("PRICE_ABOVE_INTENT");
    expect(await call("pay", { quoteId: q.quoteId })).toMatchObject({ ok: false, reason: "PRICE_ABOVE_INTENT" });
    expect(await call("ask_owner", { quoteId: q.quoteId, reason: "x" })).toMatchObject({ ok: false, reason: "PRICE_ABOVE_INTENT" });
  });

  it("scene 8: one-purchase tight pocket is a dead end with reasons", async () => {
    const tight = await s.newPocket({ cap: $.tight, askAbove: "never", sellers: ["datalite"], budget: $.tight });
    expect(await call("draft_intent", intent({ maxPricePerItem: $.tight, maxTotal: $.tight, maxItems: 1 }), tight)).toMatchObject({ ok: true });
    const a = await call("get_quote", { sellerId: "datalite", sku: "durian-report" }, tight);
    const b = await call("get_quote", { sellerId: "datapro", sku: "premium-report" }, tight);
    expect(a.allowedByPocket.reason).toBe("OVER_CAP");
    expect(b.allowedByPocket.reason).toBe("SELLER_NOT_ALLOWED");
    expect(await call("pay", { quoteId: a.quoteId }, tight)).toMatchObject({ ok: false, reason: "PRICE_ABOVE_INTENT" });
    expect(await s.balance(tight)).toBe(atom($.tight));
  });

  it("scene 7: revoke mid-task stops the next payment; return funds empties the pocket", async () => {
    expect(await call("draft_intent", intent())).toMatchObject({ ok: true });
    await s.ownerWrite(research, "revoke");
    const q = await call("get_quote", { sellerId: "datalite", sku: "durian-report" });
    expect(q.allowedByPocket.reason).toBe("POCKET_REVOKED");
    expect(await call("pay", { quoteId: q.quoteId })).toMatchObject({ ok: false, reason: "POCKET_REVOKED" });
    await s.ownerWrite(research, "returnFunds");
    expect(await s.balance(research)).toBe(0n);
  });
});
