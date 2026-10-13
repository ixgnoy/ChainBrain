import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { keccak256, toHex, type Address } from "viem";
import { startStack } from "./helpers/fork";

let s: Awaited<ReturnType<typeof startStack>>;
let M: typeof import("../src/wallet/pay");
let pocket: Address;
const intentHash = keccak256(toHex("pay-test-intent"));

beforeAll(async () => {
  s = await startStack();
  M = await import("../src/wallet/pay");
  pocket = await s.newPocket({ cap: "2", askAbove: "1", sellers: ["datalite", "datapro"], budget: "5" });
});
afterAll(() => s?.stop());

async function quote(sellerId: string, sku: string) {
  const q = await M.fetchQuote(sellerId, sku);
  if (q.kind !== "priced") throw new Error("expected a priced item");
  return M.track(pocket, q.quote);
}

describe("settle (fork: real USDC v2.2, x402 facilitator code)", () => {
  it("scene 2: pays DataLite 0.30 with the agent key alone", async () => {
    const sellerBefore = await s.usdcBalance(s.payTo.datalite); // anvil dev addresses may hold real testnet USDC
    const r = await M.settle(pocket, await quote("datalite", "durian-report"), intentHash);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.tx).toMatch(/^0x[0-9a-f]{64}$/);
    expect(await s.usdcBalance(pocket)).toBe(4_700_000n);
    expect(await s.usdcBalance(s.payTo.datalite)).toBe(sellerBefore + 300_000n);
  });

  it("scene 3: 1.50 needs the owner; with the owner's co-sign it settles", async () => {
    const rec = await quote("datapro", "premium-report");
    expect(await M.settle(pocket, rec, intentHash)).toMatchObject({ ok: false, reason: "NEEDS_OWNER_APPROVAL" });
    rec.ownerSig = await s.ownerSignTransfer(M.prepareApproval(pocket, rec, intentHash));
    expect(await M.settle(pocket, rec, intentHash)).toMatchObject({ ok: true });
    expect(await s.usdcBalance(pocket)).toBe(3_200_000n);
  });

  it("a co-sign by someone other than the owner is refused on-chain", async () => {
    const rec = await quote("datapro", "premium-report");
    const auth = M.prepareApproval(pocket, rec, intentHash);
    const { transferTypedData } = await import("../src/wallet/scheme");
    rec.ownerSig = await s.agent.signTypedData(transferTypedData(auth)); // agent pretending to be the owner
    expect(await M.settle(pocket, rec, intentHash)).toMatchObject({ ok: false, reason: "SETTLEMENT_FAILED" });
    expect(await s.usdcBalance(pocket)).toBe(3_200_000n);
  });

  it("two pays of one quote at once settle once", async () => {
    const rec = await quote("datalite", "fruit-trade-report");
    const [a, b] = await Promise.all([M.settle(pocket, rec, intentHash), M.settle(pocket, rec, intentHash)]);
    expect([a.ok, b.ok].sort()).toEqual([false, true]);
    expect([a, b].find((x) => !x.ok)).toMatchObject({ reason: "QUOTE_ALREADY_PAID" });
    expect(await s.usdcBalance(pocket)).toBe(2_850_000n);
  });

  it("a 402 that changed since the quote is refused before signing", async () => {
    const rec = await quote("datalite", "durian-report");
    rec.amount = 100_000n; // we were 'quoted' 0.10; the live 402 asks 0.30
    expect(await M.settle(pocket, rec, intentHash)).toMatchObject({ ok: false, reason: "QUOTE_MISMATCH" });
    expect(await s.usdcBalance(pocket)).toBe(2_850_000n);
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
