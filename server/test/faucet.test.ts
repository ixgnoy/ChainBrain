import { it, expect, beforeAll, afterAll, describe } from "vitest";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { startStack } from "./helpers/stack";

let s: Awaited<ReturnType<typeof startStack>>;
let api: ReturnType<typeof import("../src/index").apiApp>;
beforeAll(async () => {
  if (process.env.CHAIN === "base-sepolia") return;
  s = await startStack();
  api = (await import("../src/index")).apiApp();
});
afterAll(() => s?.stop());

const claim = (address: string, ip = "198.51.100.7") =>
  api.request("/api/faucet", { method: "POST", headers: { "content-type": "application/json", "x-real-ip": ip }, body: JSON.stringify({ address }) });

describe.skipIf(process.env.CHAIN === "base-sepolia")("faucet (FISCO)", () => {
  it("credits native balance and mints HK$100 once per address per day", async () => {
    const who = privateKeyToAccount(generatePrivateKey()).address;
    const r = await claim(who);
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true, minted: "100.00", nativeFunded: true });
    expect(await s.balance(who)).toBe(100_000_000n);
    const { pub } = await import("../src/wallet/chain");
    expect(await pub().getBalance({ address: who })).toBeGreaterThan(0n);
    expect((await claim(who)).status).toBe(429);
    expect(await s.balance(who)).toBe(100_000_000n);
  });

  it("rejects a bad address", async () => {
    expect((await claim("0x1234")).status).toBe(400);
  });
});
