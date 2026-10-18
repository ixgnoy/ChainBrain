import { it, expect, beforeAll, afterAll, describe } from "vitest";
import { existsSync } from "node:fs";
import { encodeFunctionData, parseAbiItem, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { startStack } from "./helpers/stack";
import { DEV_KEYS } from "./helpers/env";

// The ledger module on the local FISCO node: simulate → send → receipt, typed reverts, one sender's queue, the
// liveness tick and chunked log scans.
let s: Awaited<ReturnType<typeof startStack>>;
let L: typeof import("../src/ledger");
const mintAbi = [{ type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [] }] as const;
const transferAbi = [{ type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] }] as const;
const TRANSFER = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
const OWNER = DEV_KEYS.OWNER_PK as Hex;
const sdk = new URL("../../.fisco/nodes/127.0.0.1/sdk/ca.crt", import.meta.url).pathname;

beforeAll(async () => {
  s = await startStack();
  L = await import("../src/ledger");
});
afterAll(() => s?.stop());

describe("ledger", () => {
  it("simulates, sends and returns the receipt", async () => {
    const to = privateKeyToAccount(DEV_KEYS.SELLER_DATALITE_PK as Hex).address;
    const before = await s.balance(to);
    const { hash, receipt } = await L.write(OWNER, { address: s.token, abi: mintAbi, functionName: "mint", args: [to, 1_000_000n] });
    expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(receipt.status).toBe("success");
    expect(await s.balance(to)).toBe(before + 1_000_000n);
  });

  it("refuses a call that would revert before sending, with the decoded custom error", async () => {
    const owner = privateKeyToAccount(OWNER);
    const nonce = await (await import("../src/wallet/chain")).pub().getTransactionCount({ address: owner.address });
    const err = await L.write(OWNER, { address: s.token, abi: transferAbi, functionName: "transfer", args: ["0x000000000000000000000000000000000000dEaD", 10n ** 30n] }).catch((e) => e);
    expect(err).toBeInstanceOf(L.RevertError);
    expect(err.source).toBe("simulate");
    expect(err.hash).toBeUndefined();
    expect(err.revert.name).toBe("ERC20InsufficientBalance");
    expect(await (await import("../src/wallet/chain")).pub().getTransactionCount({ address: owner.address })).toBe(nonce); // nothing sent
  });

  it("sends a reverting transaction raw and reads the reason back (replay, then the native receipt)", async () => {
    const data = encodeFunctionData({ abi: transferAbi, functionName: "transfer", args: ["0x000000000000000000000000000000000000dEaD", 10n ** 30n] });
    delete process.env.FISCO_NATIVE_RPC;
    const r = await L.sendRaw(OWNER, { to: s.token, data, gas: 300_000n });
    expect(r.receipt.status).toBe("reverted");
    expect(r.revert?.name).toBe("ERC20InsufficientBalance");
    expect(r.revertSource).toBe("replay");
    if (existsSync(sdk)) {
      process.env.FISCO_NATIVE_RPC = "https://127.0.0.1:20200";
      try {
        const n = await L.revertOf(r.hash);
        expect(n.source).toBe("native");
        expect(n.revert.name).toBe("ERC20InsufficientBalance");
      } finally { delete process.env.FISCO_NATIVE_RPC; }
    }
  });

  it("queues one sender's transactions so a burst all lands", async () => {
    const to = privateKeyToAccount(DEV_KEYS.SELLER_DATAPRO_PK as Hex).address;
    const before = await s.balance(to);
    const sent = await Promise.all(Array.from({ length: 6 }, () => L.write(OWNER, { address: s.token, abi: mintAbi, functionName: "mint", args: [to, 1n] })));
    expect(new Set(sent.map((x) => x.hash)).size).toBe(6);
    expect(sent.every((x) => x.receipt.status === "success")).toBe(true);
    expect(await s.balance(to)).toBe(before + 6n);
  });

  it("moves past a nonce the node refuses (NonceCheckFail) instead of failing", async () => {
    const tried: number[] = [];
    const addr = "0x00000000000000000000000000000000000000aa" as Address;
    const hash = await L.withNonce(addr, async (n) => {
      tried.push(n);
      if (tried.length < 3) throw Object.assign(new Error("An internal error was received."), { details: "NonceCheckFail" });
      return "0xabc" as Hex;
    }, async () => 7);
    expect(hash).toBe("0xabc");
    expect(tried).toEqual([7, 8, 9]);
    // the next send from this address starts past the one that landed, even if the node's count lags
    const next: number[] = [];
    await L.withNonce(addr, async (n) => { next.push(n); return "0xdef" as Hex; }, async () => 7);
    expect(next).toEqual([10]);
    await expect(L.withNonce(addr, async () => { throw new Error("execution reverted"); }, async () => 0)).rejects.toThrow("execution reverted");
  });

  it("ticks the chain when the head is stale, and now() is never behind the wall clock", async () => {
    const { pub } = await import("../src/wallet/chain");
    await new Promise((r) => setTimeout(r, 2_100));
    const b0 = await pub().getBlockNumber({ cacheTime: 0 });
    const [a, b] = await Promise.all([L.freshHead(1), L.freshHead(1)]); // coalesced: one tick
    expect(a).toMatch(/^0x[0-9a-f]{64}$/);
    expect(b).toBe(a);
    expect(await pub().getBlockNumber({ cacheTime: 0 })).toBeGreaterThan(b0);
    expect(await L.freshHead(3600)).toBeNull();
    expect(Number(await L.now())).toBeGreaterThanOrEqual(Math.floor(Date.now() / 1000) - 1);
  });

  it("scans logs across more than 10 blocks without losing any", async () => {
    const { pub } = await import("../src/wallet/chain");
    const to = privateKeyToAccount(DEV_KEYS.SELLER_HARBOUR_WINES_PK as Hex).address;
    const from = (await pub().getBlockNumber({ cacheTime: 0 })) + 1n;
    for (let i = 0; i < 14; i++) await L.write(OWNER, { address: s.token, abi: mintAbi, functionName: "mint", args: [to, 1n] }); // one block each
    const logs = await L.scanLogs({ address: s.token, event: TRANSFER, args: { to }, fromBlock: from });
    expect(logs.length).toBe(14);
  });
});
