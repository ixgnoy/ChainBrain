import { readFileSync } from "node:fs";
import { request } from "node:https";
import {
  createWalletClient, decodeErrorResult, http, publicActions, type Abi, type AbiEvent, type Address, type Hex, type Log, type TransactionReceipt,
} from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { cfg } from "./chains";
import { pub, pocketAbi, factoryAbi } from "./wallet/chain";

/**
 * Every transaction the server sends goes through here. FISCO BCOS 3.16.4 (see docs/07-log/realchain-loop.md, round 1):
 * - legacy transactions, gas price 0;
 * - nonces are a set, not a sequence: any nonce above the highest used is accepted, anything else is NonceCheckFail, and
 *   eth_getTransactionCount drifts after a burst. So one transaction per sender at a time, a local nonce, bump and retry;
 * - blocks seal only on a transaction and eth_call runs at the head block's time: freshHead() ticks before
 *   time-sensitive simulations, now() is max(head, wall clock);
 * - a reverted transaction is mined with status 0 and no revert data: revertOf() asks the node's native receipt when one
 *   is configured, else replays the call on latest state (eth_call ignores block tags);
 * - eth_getLogs is truncated to 10 blocks from fromBlock on some nodes, silently: scanLogs() walks in chunks.
 * Ideas from YINGLONG's LedgerContext (Apache-2.0, see THIRD_PARTY.md).
 */

const tokenAbi = JSON.parse(readFileSync(new URL("../../contracts/out/MockEHKD.sol/MockEHKD.json", import.meta.url), "utf8")).abi as Abi;
const STD_ERRORS = [
  { type: "error", name: "Error", inputs: [{ type: "string", name: "reason" }] },
  { type: "error", name: "Panic", inputs: [{ type: "uint256", name: "code" }] },
] as const;
const ERROR_ABI = [...STD_ERRORS, ...[pocketAbi, factoryAbi, tokenAbi].flatMap((a: Abi) => a.filter((x) => x.type === "error"))] as Abi;

export type DecodedRevert = { name: string; args: readonly unknown[]; message: string; raw: Hex };

/** A custom error, Error(string) or Panic from any of our contracts, decoded with their ABIs. */
export function decodeRevert(data: Hex | undefined): DecodedRevert {
  const raw = (data ?? "0x") as Hex;
  if (raw === "0x") return { name: "Unknown", args: [], message: "reverted without data", raw };
  try {
    const r = decodeErrorResult({ abi: ERROR_ABI, data: raw });
    const args = (r.args ?? []) as readonly unknown[];
    return { name: r.errorName, args, message: r.errorName === "Error" ? String(args[0]) : `${r.errorName}(${args.map(String).join(", ")})`, raw };
  } catch {
    return { name: "Unknown", args: [], message: `unknown revert ${raw.slice(0, 10)}`, raw };
  }
}

/** Revert data anywhere in a viem error chain (FISCO's eth_call puts it in error.data with code 16). */
export function revertDataOf(err: unknown): Hex | undefined {
  let e: any = err;
  for (let i = 0; i < 10 && e; i++) {
    for (const v of [e.data, e.data?.data, e.raw]) if (typeof v === "string" && /^0x[0-9a-fA-F]{8}/.test(v)) return v as Hex;
    e = e.cause;
  }
  return undefined;
}

export type RevertSource = "simulate" | "native" | "replay";
/** A transaction that would revert (source "simulate", nothing was sent) or did (a hash, reason from the native receipt or a replay). */
export class RevertError extends Error {
  constructor(readonly revert: DecodedRevert, readonly source: RevertSource, readonly hash?: Hex, readonly original?: unknown) {
    super(`${hash ? `reverted ${hash}` : "would revert"}: ${revert.message}`);
    this.name = "RevertError";
  }
}

// ---- time ----------------------------------------------------------------------------------------------------------

const sec = (ts: bigint) => (ts > 10n ** 12n ? ts / 1000n : ts); // FISCO's RPC reports seconds; guard against a ms build
const wallSec = () => BigInt(Math.floor(Date.now() / 1000));

/** Seconds: the later of the head block's time and the wall clock (a quiet chain's head can be an hour old). */
export async function now(): Promise<bigint> {
  const head = sec((await pub().getBlock()).timestamp);
  return head > wallSec() ? head : wallSec();
}

let ticking: Promise<Hex | null> | undefined;
const tickKey = () => (process.env.TICK_PK || process.env.FACILITATOR_PK) as Hex | undefined;

/**
 * If the head block is older than maxAgeSec, send a zero-value self-transfer (gas is free) so the next eth_call sees
 * the current time. Coalesced: concurrent callers share one tick. Returns the tick's hash, or null when none was needed.
 * Call it before entering a sender's queue, never from inside one (the tick may share the sender).
 */
export async function freshHead(maxAgeSec = 30): Promise<Hex | null> {
  if (ticking) return ticking;
  ticking = (async () => {
    const head = sec((await pub().getBlock()).timestamp);
    if (wallSec() - head <= BigInt(maxAgeSec)) return null;
    const pk = tickKey();
    if (!pk) return null;
    const me = privateKeyToAccount(pk);
    return (await sendRaw(pk, { to: me.address, data: "0x", gas: 30_000n })).hash;
  })().finally(() => { ticking = undefined; });
  return ticking;
}

// ---- sending -------------------------------------------------------------------------------------------------------

const queues = new Map<string, Promise<unknown>>();
const nextNonce = new Map<string, number>();
const accounts = new Map<string, PrivateKeyAccount>();
const account = (pk: Hex) => accounts.get(pk) ?? accounts.set(pk, privateKeyToAccount(pk)).get(pk)!;
const walletFor = (a: PrivateKeyAccount) => createWalletClient({ account: a, chain: cfg().chain, transport: http(cfg().rpc) }).extend(publicActions);

/** Run fn with this sender's queue held: one transaction per sender at a time. */
function serial<T>(addr: Address, fn: () => Promise<T>): Promise<T> {
  const k = addr.toLowerCase();
  const job = (queues.get(k) ?? Promise.resolve()).catch(() => {}).then(fn);
  queues.set(k, job);
  return job;
}

export const isNonceRefusal = (e: unknown) => /NonceCheckFail|nonce too low|already known/i.test(String((e as any)?.details ?? "") + String((e as any)?.message ?? ""));

/**
 * Send with an explicit nonce: max(the node's count, the last one we used + 1). On NonceCheckFail move past it and
 * retry (the count can lag after a burst). `send` gets the nonce and returns the hash.
 */
export async function withNonce(addr: Address, send: (nonce: number) => Promise<Hex>, count: () => Promise<number>, tries = 6): Promise<Hex> {
  const k = addr.toLowerCase();
  let n = Math.max(await count(), nextNonce.get(k) ?? 0);
  for (let i = 0; ; i++) {
    try {
      const hash = await send(n);
      nextNonce.set(k, n + 1);
      return hash;
    } catch (e) {
      if (!isNonceRefusal(e) || i + 1 >= tries) throw e;
      n = Math.max(n + 1, await count());
    }
  }
}

export type Call = { address: Address; abi: Abi | readonly unknown[]; functionName: string; args?: readonly unknown[]; gas?: bigint };
export type Sent = { hash: Hex; receipt: TransactionReceipt };

/**
 * Simulate, send and wait. Throws RevertError("simulate") before sending when the call would revert, and
 * RevertError("native" | "replay", hash) if it was mined and reverted anyway. fresh: tick first when the head is stale
 * (expiry, validity windows).
 */
export async function write(pk: Hex, call: Call, opts: { fresh?: boolean; simulate?: boolean } = {}): Promise<Sent> {
  if (opts.fresh) await freshHead();
  const a = account(pk);
  const w = walletFor(a);
  return serial(a.address, async () => {
    if (opts.simulate !== false) {
      try {
        await pub().simulateContract({ ...(call as any), account: a });
      } catch (e) {
        const data = revertDataOf(e);
        if (data || /revert/i.test(String((e as any)?.message))) throw new RevertError(decodeRevert(data), "simulate", undefined, e);
        throw e;
      }
    }
    const hash = await withNonce(a.address,
      (nonce) => w.writeContract({ ...(call as any), account: a, chain: cfg().chain, type: "legacy", gasPrice: 0n, nonce, ...(call.gas ? { gas: call.gas } : {}) }),
      () => pub().getTransactionCount({ address: a.address }));
    const receipt = await pub().waitForTransactionReceipt({ hash, timeout: 60_000 });
    if (receipt.status !== "success") {
      const r = await revertOf(hash);
      throw new RevertError(r.revert, r.source, hash);
    }
    return { hash, receipt };
  });
}

/**
 * Send raw calldata without simulating and return what happened, revert included: the arena's "straight to the chain",
 * where the chain's own refusal is the proof. Never throws for a revert.
 */
export async function sendRaw(pk: Hex, tx: { to: Address; data: Hex; gas?: bigint }): Promise<Sent & { revert?: DecodedRevert; revertSource?: Exclude<RevertSource, "simulate"> }> {
  const a = account(pk);
  const w = walletFor(a);
  return serial(a.address, async () => {
    const hash = await withNonce(a.address,
      (nonce) => w.sendTransaction({ to: tx.to, data: tx.data, value: 0n, account: a, chain: cfg().chain, type: "legacy", gasPrice: 0n, nonce, gas: tx.gas ?? 1_500_000n } as any),
      () => pub().getTransactionCount({ address: a.address }));
    const receipt = await pub().waitForTransactionReceipt({ hash, timeout: 60_000 });
    if (receipt.status === "success") return { hash, receipt };
    const r = await revertOf(hash);
    return { hash, receipt, revert: r.revert, revertSource: r.source };
  });
}

/**
 * A facilitator signer whose writes go through this module's queue (x402's Exact EVM facilitator sends
 * transferWithAuthorization from FACILITATOR_PK; many visitors' payments share that one sender).
 */
export function queuedSigner(pk: Hex) {
  const a = account(pk);
  const w = walletFor(a);
  return {
    ...(w as any),
    address: a.address,
    writeContract: async (args: Call) => {
      const hash = await serial(a.address, () => withNonce(a.address,
        (nonce) => w.writeContract({ ...(args as any), account: a, chain: cfg().chain, type: "legacy", gasPrice: 0n, nonce, ...(args.gas ? { gas: args.gas } : {}) }),
        () => pub().getTransactionCount({ address: a.address })).then(async (h) => { await pub().waitForTransactionReceipt({ hash: h, timeout: 60_000 }); return h; }));
      return hash;
    },
    sendTransaction: async (args: { to: Address; data: Hex }) => (await sendRaw(pk, args)).hash,
  };
}

// ---- revert reasons ------------------------------------------------------------------------------------------------

/**
 * Why a mined transaction reverted. Native receipt first (exact, as executed) when FISCO_NATIVE_RPC (+ FISCO_SDK_DIR
 * certs) or FISCO_REVERT_RPC (a gateway answering chainbrain_getRevertData) is set; else replay the call with eth_call on
 * latest state, which can differ if state has moved since.
 */
export async function revertOf(hash: Hex): Promise<{ revert: DecodedRevert; source: Exclude<RevertSource, "simulate"> }> {
  const native = await nativeRevertData(hash).catch(() => undefined);
  if (native) return { revert: decodeRevert(native), source: "native" };
  const tx = await pub().getTransaction({ hash });
  try {
    await pub().call({ account: tx.from, to: tx.to!, data: tx.input, gas: tx.gas });
    return { revert: { name: "Unknown", args: [], message: "reverted, but the replay on latest state succeeds (state has moved)", raw: "0x" }, source: "replay" };
  } catch (e) {
    return { revert: decodeRevert(revertDataOf(e)), source: "replay" };
  }
}

async function nativeRevertData(hash: Hex): Promise<Hex | undefined> {
  if (process.env.FISCO_REVERT_RPC) {
    const r = await fetch(process.env.FISCO_REVERT_RPC, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "chainbrain_getRevertData", params: [hash] }), signal: AbortSignal.timeout(10_000) });
    const out = (await r.json()) as { result?: Hex };
    return out.result && out.result !== "0x" ? out.result : undefined;
  }
  const url = process.env.FISCO_NATIVE_RPC;
  if (!url) return undefined;
  const dir = process.env.FISCO_SDK_DIR ?? new URL("../../.fisco/nodes/127.0.0.1/sdk/", import.meta.url).pathname;
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTransactionReceipt", params: ["group0", "", hash, false] });
  const u = new URL(url);
  const text = await new Promise<string>((ok, fail) => {
    const req = request({ host: u.hostname, port: u.port, method: "POST", path: "/", headers: { "content-type": "application/json" }, timeout: 10_000,
      ca: readFileSync(`${dir}/ca.crt`), cert: readFileSync(`${dir}/sdk.crt`), key: readFileSync(`${dir}/sdk.key`),
      checkServerIdentity: () => undefined }, // the node's cert is issued for its node id, not a host name
    (res) => { let s = ""; res.on("data", (c) => (s += c)); res.on("end", () => ok(s)); });
    req.on("error", fail);
    req.on("timeout", () => req.destroy(new Error("native RPC timeout")));
    req.end(body);
  });
  const out = JSON.parse(text).result as { output?: Hex } | undefined;
  return out?.output && out.output !== "0x" ? out.output : undefined;
}

// ---- logs ----------------------------------------------------------------------------------------------------------

export const LOG_STEP = BigInt(process.env.FISCO_LOG_STEP ?? 10);

/** getLogs over any range in chunks of LOG_STEP blocks (some FISCO nodes silently drop logs past 10 blocks per call). The event
 * is required: FISCO refuses a filter without topics. */
export async function scanLogs(q: { address: Address | Address[]; event: AbiEvent; args?: any; fromBlock: bigint; toBlock?: bigint }): Promise<Log[]> {
  const to = q.toBlock ?? (await pub().getBlockNumber({ cacheTime: 0 }));
  const out: Log[] = [];
  const ranges: [bigint, bigint][] = [];
  for (let a = q.fromBlock; a <= to; a += LOG_STEP) ranges.push([a, a + LOG_STEP - 1n < to ? a + LOG_STEP - 1n : to]);
  for (let i = 0; i < ranges.length; i += 8) { // 8 calls in flight
    const batch = await Promise.all(ranges.slice(i, i + 8).map(([fromBlock, toBlock]) =>
      pub().getLogs({ address: q.address, event: q.event, args: q.args, fromBlock, toBlock } as any)));
    for (const ls of batch) out.push(...(ls as Log[]));
  }
  return out;
}
