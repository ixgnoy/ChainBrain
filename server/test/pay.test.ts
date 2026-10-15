import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { keccak256, toHex, type Address } from "viem";
import { startStack } from "./helpers/stack";
import { $, atom } from "./helpers/amounts";

let s: Awaited<ReturnType<typeof startStack>>;
let M: typeof import("../src/wallet/pay");
let pocket: Address;
const intentHash = keccak256(toHex("pay-test-intent"));

beforeAll(async () => {
  s = await startStack();
  M = await import("../src/wallet/pay");
  pocket = await s.newPocket({ cap: $.cap, askAbove: $.ask, sellers: ["datalite", "datapro"], budget: $.budget });
});
afterAll(() => s?.stop());

async function quote(sellerId: string, sku: string) {
  const q = await M.fetchQuote(sellerId, sku);
  if (q.kind !== "priced") throw new Error("expected a priced item");
  return M.track(pocket, q.quote);
}

describe(`settle (${process.env.CHAIN ?? "fisco"}: x402 facilitator code)`, () => {
  it("scene 2: pays DataLite with the agent key alone", async () => {
    const sellerBefore = await s.balance(s.payTo.datalite); // anvil dev addresses may hold real testnet USDC
    const r = await M.settle(pocket, await quote("datalite", "durian-report"), intentHash);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.tx).toMatch(/^0x[0-9a-f]{64}$/);
    // the apps' tx link: the wallet API re-reads the receipt from the chain
    const api = (await import("../src/index")).apiApp();
    const rc = await (await api.request(`/api/tx/${(r as any).tx}`)).json();
    expect(rc).toMatchObject({ chain: process.env.CHAIN, status: "success", hash: (r as any).tx });
    expect((await api.request("/api/tx/0x1234")).status).toBe(400);
    expect(await s.balance(pocket)).toBe(atom($.budget) - atom($.durian));
    expect(await s.balance(s.payTo.datalite)).toBe(sellerBefore + atom($.durian));
  });

  it("scene 3: the premium report needs the owner; with the owner's co-sign it settles", async () => {
    const rec = await quote("datapro", "premium-report");
    expect(await M.settle(pocket, rec, intentHash)).toMatchObject({ ok: false, reason: "NEEDS_OWNER_APPROVAL" });
    rec.ownerSig = await s.ownerSignTransfer(M.prepareApproval(pocket, rec, intentHash));
    expect(await M.settle(pocket, rec, intentHash)).toMatchObject({ ok: true });
    expect(await s.balance(pocket)).toBe(atom($.budget) - atom($.durian) - atom($.premium));
  });

  it("a co-sign by someone other than the owner is refused on-chain", async () => {
    const rec = await quote("datapro", "premium-report");
    const auth = M.prepareApproval(pocket, rec, intentHash);
    const { transferTypedData } = await import("../src/wallet/scheme");
    rec.ownerSig = await s.agent.signTypedData(transferTypedData(auth)); // agent pretending to be the owner
    expect(await M.settle(pocket, rec, intentHash)).toMatchObject({ ok: false, reason: "SETTLEMENT_FAILED" });
    expect(await s.balance(pocket)).toBe(atom($.budget) - atom($.durian) - atom($.premium));
  });

  it("two pays of one quote at once settle once", async () => {
    const rec = await quote("datalite", "fruit-trade-report");
    const [x, y] = await Promise.all([M.settle(pocket, rec, intentHash), M.settle(pocket, rec, intentHash)]);
    expect([x.ok, y.ok].sort()).toEqual([false, true]);
    expect([x, y].find((x) => !x.ok)).toMatchObject({ reason: "QUOTE_ALREADY_PAID" });
    expect(await s.balance(pocket)).toBe(atom($.budget) - atom($.durian) - atom($.premium) - atom($.fruit));
  });

  it("a 402 that changed since the quote is refused before signing", async () => {
    const rec = await quote("datalite", "durian-report");
    rec.amount -= 1n; // we were 'quoted' a different amount than the live 402 asks
    expect(await M.settle(pocket, rec, intentHash)).toMatchObject({ ok: false, reason: "QUOTE_MISMATCH" });
    expect(await s.balance(pocket)).toBe(atom($.budget) - atom($.durian) - atom($.premium) - atom($.fruit));
  });

  it("scene 4: a non-allowlisted seller is refused before signing", async () => {
    expect(await M.settle(pocket, await quote("harbour-wines", "fruit-wine-trade-report"), intentHash)).toMatchObject({ ok: false, reason: "SELLER_NOT_ALLOWED" });
  });

  it("an expired approval window is refused without sending", async () => {
    const rec = await quote("datapro", "premium-report");
    const auth = M.prepareApproval(pocket, rec, intentHash, 5); // 5-second window
    rec.ownerSig = await s.ownerSignTransfer(auth);
    expect(await M.settle(pocket, rec, intentHash)).toMatchObject({ ok: false, reason: "APPROVAL_EXPIRED" });
  });

  it("scene 7: after revoke the next payment is refused", async () => {
    await s.ownerWrite(pocket, "revoke");
    expect(await M.settle(pocket, await quote("datalite", "durian-report"), intentHash)).toMatchObject({ ok: false, reason: "POCKET_REVOKED" });
  });
});
