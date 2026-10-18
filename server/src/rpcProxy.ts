import { Hono } from "hono";
import type { Hex } from "viem";
import { cfg } from "./chains";
import { ipOf, slidingWindow } from "./limits";
import { revertOf } from "./ledger";

/**
 * POST /rpc/fisco: a read-only JSON-RPC proxy to the chain, for anyone (wallets, judges, the apps when no public RPC is
 * set). Only read methods pass; writes (eth_sendRawTransaction, eth_sendTransaction) are refused. Batches are capped and
 * always answered as an array (FISCO 3.16.4 answers a one-element batch with a bare object); eth_getLogs needs an address
 * and a bounded block range; each IP has a per-minute budget. One local method: chainbrain_getRevertData(hash), the
 * decoded revert of a mined transaction (native receipt, else a labelled replay).
 */
const ALLOWED = new Set([
  "eth_chainId", "net_version", "web3_clientVersion", "eth_blockNumber", "eth_getBlockByNumber", "eth_getBlockByHash",
  "eth_getTransactionByHash", "eth_getTransactionReceipt", "eth_call", "eth_getLogs", "eth_getCode", "eth_getBalance",
  "eth_getStorageAt", "eth_getTransactionCount", "eth_estimateGas", "eth_gasPrice", "eth_maxPriorityFeePerGas",
]);
const num = (k: string, d: number) => Number(process.env[k] ?? d);
const perIp = slidingWindow(60_000, () => num("FISCO_PROXY_RATE_PER_MIN", 600));

type Req = { jsonrpc?: string; id?: unknown; method?: unknown; params?: unknown };
const err = (id: unknown, code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

async function head(): Promise<bigint> {
  const r = await fetch(cfg().rpc, { method: "POST", headers: { "content-type": "application/json" }, body: '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}' });
  return BigInt(((await r.json()) as any).result);
}
const block = async (tag: unknown, latest: () => Promise<bigint>) =>
  typeof tag === "string" && /^0x[0-9a-f]+$/i.test(tag) ? BigInt(tag) : tag === "earliest" ? 0n : await latest();

/** Checks one request; returns an error object, or null when it may be forwarded. */
async function refuse(m: Req, latest: () => Promise<bigint>): Promise<object | null> {
  if (typeof m?.method !== "string") return err(m?.id, -32600, "invalid request");
  if (m.method === "chainbrain_getRevertData") return null;
  if (!ALLOWED.has(m.method)) return err(m.id, -32601, "method not allowed by the read-only FISCO proxy");
  if (m.method === "eth_getLogs") {
    const f = (Array.isArray(m.params) ? m.params[0] : undefined) as Record<string, unknown> | undefined;
    if (!f || !f.address) return err(m.id, -32602, "eth_getLogs needs an address");
    if (f.blockHash) return err(m.id, -32602, "eth_getLogs by blockHash is not supported");
    const max = BigInt(num("FISCO_PROXY_MAX_BLOCK_RANGE", 5000));
    const from = await block(f.fromBlock ?? "latest", latest), to = await block(f.toBlock ?? "latest", latest);
    if (to - from > max) return err(m.id, -32602, `eth_getLogs range is at most ${max} blocks (some FISCO nodes return at most 10 blocks per call: scan in steps of 10)`);
  }
  return null;
}

async function answer(m: Req): Promise<object> {
  if (m.method === "chainbrain_getRevertData") {
    const hash = Array.isArray(m.params) ? m.params[0] : undefined;
    if (typeof hash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(hash)) return err(m.id, -32602, "params: [txHash]");
    const r = await revertOf(hash as Hex).catch((e) => ({ error: String((e as Error).message) }));
    return "error" in r ? err(m.id, -32000, r.error) : { jsonrpc: "2.0", id: m.id, result: { ...r.revert, args: r.revert.args.map(String), source: r.source } };
  }
  const res = await fetch(cfg().rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: m.id, method: m.method, params: m.params ?? [] }), signal: AbortSignal.timeout(20_000) });
  return (await res.json()) as object;
}

export function rpcProxyRoutes() {
  const app = new Hono();
  app.post("/rpc/fisco", async (c) => {
    if (!perIp.hit(ipOf(c))) return c.json(err(null, -32005, "rate limited"), 429);
    let body: Req | Req[];
    try { body = await c.req.json(); } catch { return c.json(err(null, -32700, "parse error"), 400); }
    const batch = Array.isArray(body);
    const list = (batch ? body : [body]) as Req[];
    if (!list.length) return c.json(err(null, -32600, "empty batch"), 400);
    if (list.length > num("FISCO_PROXY_MAX_BATCH", 20)) return c.json(err(null, -32600, `at most ${num("FISCO_PROXY_MAX_BATCH", 20)} requests per batch`), 400);
    let latest: Promise<bigint> | undefined;
    const lazyHead = () => (latest ??= head());
    try {
      const out = await Promise.all(list.map(async (m) => (await refuse(m, lazyHead)) ?? (await answer(m))));
      return c.json(batch ? out : out[0]);
    } catch {
      return c.json(err(null, -32010, "upstream unavailable"), 502);
    }
  });
  return app;
}
