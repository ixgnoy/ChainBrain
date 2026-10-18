import { it, expect, beforeAll, afterAll, describe } from "vitest";
import { existsSync } from "node:fs";
import { encodeFunctionData, type Hex } from "viem";
import { startStack } from "./helpers/stack";
import { DEV_KEYS } from "./helpers/env";

// The explorer explains a transaction (decoded call, events, why it reverted) and /rpc/fisco is a read-only proxy.
let s: Awaited<ReturnType<typeof startStack>>;
let api: ReturnType<typeof import("../src/index").apiApp>;
let reverted: Hex;
const transferAbi = [{ type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ type: "address", name: "to" }, { type: "uint256", name: "value" }], outputs: [{ type: "bool" }] }] as const;
const sdk = new URL("../../.fisco/nodes/127.0.0.1/sdk/ca.crt", import.meta.url).pathname;

beforeAll(async () => {
  s = await startStack();
  api = (await import("../src/index")).apiApp();
  const { sendRaw } = await import("../src/ledger");
  delete process.env.FISCO_NATIVE_RPC;
  reverted = (await sendRaw(DEV_KEYS.OWNER_PK as Hex, { to: s.token, data: encodeFunctionData({ abi: transferAbi, functionName: "transfer", args: ["0x000000000000000000000000000000000000dEaD", 10n ** 30n] }), gas: 300_000n })).hash;
});
afterAll(() => s?.stop());

const rpc = (body: unknown, ip = "198.51.100.20") => api.request("/rpc/fisco", { method: "POST", headers: { "content-type": "application/json", "x-real-ip": ip }, body: JSON.stringify(body) });

describe("explorer", () => {
  it("decodes a reverted transaction's call and says why it reverted (replayed, and labelled so)", async () => {
    const t = await (await api.request(`/api/explorer/tx/${reverted}`)).json();
    expect(t.status).toBe("reverted");
    expect(t.call).toMatchObject({ contract: "Mock e-HKD", function: "transfer", args: { to: "0x000000000000000000000000000000000000dEaD" } });
    expect(t.revert).toMatchObject({ name: "ERC20InsufficientBalance" });
    expect(t.revertSource).toBe("replay");
    expect(t.note).toMatch(/latest state/);
    const short = await (await api.request(`/api/tx/${reverted}`)).json(); // the apps' link
    expect(short).toMatchObject({ status: "reverted", call: { function: "transfer" }, revert: { name: "ERC20InsufficientBalance" } });
  });

  it("reads the exact revert from the node's native receipt when it is configured", async () => {
    if (!existsSync(sdk)) return;
    process.env.FISCO_NATIVE_RPC = "https://127.0.0.1:20200";
    try {
      const t = await (await api.request(`/api/explorer/tx/${reverted}`)).json();
      expect([t.revertSource, t.revert.name, t.note]).toEqual(["native", "ERC20InsufficientBalance", undefined]);
    } finally { delete process.env.FISCO_NATIVE_RPC; }
  });

  it("asks a gateway for the native revert when FISCO_REVERT_RPC is set (the hosted node)", async () => {
    const { createServer } = await import("node:http");
    const { encodeErrorResult } = await import("viem");
    const data = encodeErrorResult({ abi: [{ type: "error", name: "ERC20InsufficientBalance", inputs: [{ type: "address" }, { type: "uint256" }, { type: "uint256" }] }], errorName: "ERC20InsufficientBalance", args: ["0x000000000000000000000000000000000000dEaD", 1n, 2n] });
    const seen: string[] = [];
    const gw = createServer((req, res) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => { const m = JSON.parse(b); seen.push(m.method); res.end(JSON.stringify({ jsonrpc: "2.0", id: m.id, result: data })); }); });
    await new Promise<void>((ok) => gw.listen(4599, "127.0.0.1", () => ok()));
    process.env.FISCO_REVERT_RPC = "http://127.0.0.1:4599";
    try {
      const t = await (await api.request(`/api/explorer/tx/${reverted}`)).json();
      expect([t.revertSource, t.revert.name]).toEqual(["native", "ERC20InsufficientBalance"]);
      expect(seen).toEqual(["chainbrain_getRevertData"]);
    } finally { delete process.env.FISCO_REVERT_RPC; gw.close(); }
  });

  it("decodes a card's creation call with named arguments", async () => {
    const { write } = await import("../src/ledger");
    const { factoryAbi } = await import("../src/wallet/chain");
    const { hash } = await write(DEV_KEYS.OWNER_PK as Hex, { address: s.factory, abi: factoryAbi, functionName: "create",
      args: [s.agent.address, 1_000_000n, 2n ** 256n - 1n, BigInt(Math.floor(Date.now() / 1000) + 3600), [s.payTo.datalite]] });
    const t = await (await api.request(`/api/explorer/tx/${hash}`)).json();
    expect(t.call).toMatchObject({ contract: "PocketFactory", function: "create", args: { agent: s.agent.address, cap: "1000000" } });
    expect(t.logs.some((l: any) => l.event === "PocketCreated")).toBe(true);
    expect(t.revert).toBeUndefined();
  });
});

describe("/rpc/fisco (read-only proxy)", () => {
  it("forwards reads, and answers a one-element batch as an array", async () => {
    const one = await (await rpc({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] })).json();
    expect(one.result).toMatch(/^0x[0-9a-f]+$/);
    const batch = await (await rpc([{ jsonrpc: "2.0", id: 7, method: "eth_chainId", params: [] }])).json();
    expect(Array.isArray(batch)).toBe(true);
    expect(batch[0]).toMatchObject({ id: 7, result: "0x4ee8" });
  });

  it("refuses writes, oversized batches and unbounded log scans", async () => {
    const w = await (await rpc({ jsonrpc: "2.0", id: 2, method: "eth_sendRawTransaction", params: ["0x00"] })).json();
    expect(w.error).toMatchObject({ code: -32601 });
    expect((await rpc(Array.from({ length: 21 }, (_, i) => ({ jsonrpc: "2.0", id: i, method: "eth_chainId" })))).status).toBe(400);
    const noAddr = await (await rpc({ jsonrpc: "2.0", id: 3, method: "eth_getLogs", params: [{ fromBlock: "0x0", toBlock: "latest", topics: [] }] })).json();
    expect(noAddr.error.message).toMatch(/needs an address/);
    const wide = await (await rpc({ jsonrpc: "2.0", id: 4, method: "eth_getLogs", params: [{ address: s.token, topics: [], fromBlock: "0x0", toBlock: "0x989680" }] })).json();
    expect(wide.error.message).toMatch(/at most 5000 blocks/);
  });

  it("explains a revert with chainbrain_getRevertData", async () => {
    const r = await (await rpc({ jsonrpc: "2.0", id: 5, method: "chainbrain_getRevertData", params: [reverted] })).json();
    expect(r.result).toMatchObject({ name: "ERC20InsufficientBalance", source: "replay" });
  });

  it("has a per-IP budget", async () => {
    process.env.FISCO_PROXY_RATE_PER_MIN = "2";
    try {
      const ip = "198.51.100.99";
      const codes = [];
      for (let i = 0; i < 3; i++) codes.push((await rpc({ jsonrpc: "2.0", id: i, method: "eth_chainId" }, ip)).status);
      expect(codes).toEqual([200, 200, 429]);
    } finally { delete process.env.FISCO_PROXY_RATE_PER_MIN; }
  });
});
