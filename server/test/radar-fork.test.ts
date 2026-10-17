import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createWalletClient, http, publicActions, type Address } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { startStack } from "./helpers/stack";
import { autoOwner } from "./helpers/owner";
import { $, atom } from "./helpers/amounts";

let s: Awaited<ReturnType<typeof startStack>>;
let tools: typeof import("../src/wallet/tools").tools;
let api: ReturnType<typeof import("../src/index").apiApp>;
let pocket: Address;
let stopOwner: () => void;

const tonight = () => new Date(Date.now() + 6 * 3600_000).toISOString();
const call = (name: string, args: object = {}) => tools[name].run({ pocket }, args) as Promise<any>;

beforeAll(async () => {
  s = await startStack();
  process.env.APPROVAL_WAIT_MS = "20000";
  process.env.RADAR_ADMIN = "1";
  ({ tools } = await import("../src/wallet/tools"));
  api = (await import("../src/index")).apiApp();
  pocket = await s.newPocket({ cap: $.cap, askAbove: "never", sellers: ["datalite", "datapro"], budget: $.budget });
  stopOwner = autoOwner({ api, sign: s.ownerSignTransfer });
});
afterAll(async () => { stopOwner?.(); await s?.stop(); });

describe("Radar on the fork: a real USDC transfer from a drainer to DataPro", () => {
  it("clean sellers pass; after a labelled drainer pays DataPro, paying DataPro is refused and an alert opens", async () => {
    expect(await call("draft_intent", { request: "durian report", description: "Durian export market data", maxPricePerItem: $.perItem, maxTotal: $.total, maxItems: 3, deadline: tonight() })).toMatchObject({ ok: true });

    const q1 = await call("get_quote", { sellerId: "datapro", sku: "premium-report" });
    expect(q1.counterpartyRisk).toMatchObject({ verdict: "ok" });

    // a drainer wallet sends 9 USDC to DataPro's payTo, on-chain
    const drainer = privateKeyToAccount(generatePrivateKey());
    const { cfg } = await import("../src/chains");
    const w = createWalletClient({ account: drainer, chain: cfg().chain, transport: http(s.rpc) }).extend(publicActions);
    await s.gas(drainer.address);
    await s.setUsdc(drainer.address, 9_000_000n);
    const { erc20Abi } = await import("../src/wallet/chain");
    const USDC = s.token;
    await w.waitForTransactionReceipt({ hash: await w.writeContract({ address: USDC, abi: erc20Abi, functionName: "transfer", args: [s.payTo.datapro, 9_000_000n] }) });

    const lab = await api.request("/api/radar/admin/labels", { method: "POST", body: JSON.stringify({ address: drainer.address, category: "drainer", name: "Demo drainer" }), headers: { "content-type": "application/json" } });
    expect(lab.status).toBe(200);

    const q2 = await call("get_quote", { sellerId: "datapro", sku: "premium-report" });
    expect(q2.counterpartyRisk).toMatchObject({ verdict: "block", score: 9 });
    const r = await call("pay", { quoteId: q2.quoteId });
    expect(r).toMatchObject({ ok: false, reason: "COUNTERPARTY_HIGH_RISK" });
    expect(r.radar).toContain("traces back to Demo drainer (drainer), directly");
    expect(await s.usdcBalance(pocket)).toBe(atom($.budget));

    const scr = await (await api.request("/api/radar/screen/datapro")).json();
    expect(scr).toMatchObject({ counterparty: "DataPro", verdict: "block" });
    const alerts = await (await api.request("/api/radar/alerts")).json();
    expect(alerts[0]).toMatchObject({ name: "DataPro", to: { verdict: "block" } });

    // DataLite is unaffected and still pays
    const q3 = await call("get_quote", { sellerId: "datalite", sku: "durian-report" });
    expect(q3.counterpartyRisk).toMatchObject({ verdict: "ok" });
    expect(await call("pay", { quoteId: q3.quoteId })).toMatchObject({ ok: true, paid: $.durian });
  });

  it("planting a benign label through the admin route is rejected (it could only loosen)", async () => {
    const r = await api.request("/api/radar/admin/labels", { method: "POST", body: JSON.stringify({ address: s.payTo.datalite, category: "exchange" }), headers: { "content-type": "application/json" } });
    expect(r.status).toBe(400);
  });
});
