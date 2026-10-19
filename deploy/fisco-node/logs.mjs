// eth_getLogs for FISCO BCOS 3.x, shared by the Railway gateway (gateway.mjs) and the dev stack's /dev/rpc proxy.
// The node rejects a filter without toBlock, address or topics, and silently returns only part of the logs for a range
// wider than a few blocks. This fills the defaults and scans in LOG_WINDOW-block windows, so clients get every log.
// Limits keep one public request from fanning out without bound: MAX_LOG_BLOCKS per request, MAX_LOGS_PER_BATCH
// eth_getLogs entries per batch, and at most MAX_INFLIGHT node calls at once across all requests.
export const LOG_WINDOW = 5n;
export const MAX_LOG_BLOCKS = 5_000n;
export const MAX_LOGS_PER_BATCH = 5;
const MAX_INFLIGHT = 16;

let inflight = 0;
const waiting = [];
async function withSlot(fn) {
  if (inflight >= MAX_INFLIGHT) await new Promise((r) => waiting.push(r));
  inflight++;
  try { return await fn(); } finally { inflight--; waiting.shift()?.(); }
}

const hex = (n) => "0x" + n.toString(16);
const err = (id, code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });
const TAGS = new Set(["latest", "pending", "safe", "finalized"]);

/**
 * `call(obj)` sends one JSON-RPC request object to the node and resolves to its parsed response.
 * Returns getLogs(id, params) -> a JSON-RPC response object (result or error), never throws.
 */
export function makeGetLogs(call, repair = (x) => x) {
  return async function getLogs(id, params = []) {
    try {
      const f = params[0] ?? {};
      const base = { address: f.address ?? [], topics: f.topics ?? [] };
      if (f.blockHash) return repair(await withSlot(() => call({ jsonrpc: "2.0", id, method: "eth_getLogs", params: [{ ...base, blockHash: f.blockHash }] })));
      const head = await withSlot(() => call({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }));
      if (head.error) return { ...head, id };
      const latest = BigInt(head.result);
      const num = (b, dflt) => (b === undefined || b === null || TAGS.has(b) ? dflt : b === "earliest" ? 0n : BigInt(b));
      const from = num(f.fromBlock, latest);
      const to = num(f.toBlock, latest) > latest ? latest : num(f.toBlock, latest);
      if (to - from + 1n > MAX_LOG_BLOCKS) return err(id, -32005, `block range too large: at most ${MAX_LOG_BLOCKS} blocks per request`);
      const windows = [];
      for (let a = from; a <= to; a += LOG_WINDOW) windows.push([a, a + LOG_WINDOW - 1n < to ? a + LOG_WINDOW - 1n : to]);
      const parts = await Promise.all(windows.map(([a, b]) =>
        withSlot(() => call({ jsonrpc: "2.0", id: 1, method: "eth_getLogs", params: [{ ...base, fromBlock: hex(a), toBlock: hex(b) }] }))));
      const bad = parts.find((p) => p.error);
      if (bad) return { ...bad, id };
      return { jsonrpc: "2.0", id, result: repair(parts.flatMap((p) => p.result ?? [])) };
    } catch (e) {
      return err(id, -32603, String(e?.message ?? e));
    }
  };
}

/** A batch may carry at most MAX_LOGS_PER_BATCH eth_getLogs entries; the rest get an error each. */
export const overBatchLimit = (msgs) => msgs.filter((m) => m?.method === "eth_getLogs").length > MAX_LOGS_PER_BATCH;
export const batchLimitError = (id) => err(id, -32005, `at most ${MAX_LOGS_PER_BATCH} eth_getLogs calls per batch`);

/** FISCO answers a one-element JSON-RPC batch ([{...}]) with a bare object; clients that batch (viem) need the array back. */
export const rewrapBatch = (requestText, responseText) =>
  requestText.trimStart().startsWith("[") && responseText.trimStart().startsWith("{") ? `[${responseText}]` : responseText;

/** FISCO refuses a JSON-RPC batch of more than this many calls ("The requested array size exceeds the limit size: 8"). */
export const NODE_BATCH_LIMIT = 8;

/**
 * Answers a batch: `special(m)` returns a response promise for calls answered here (or null), every other call goes to the
 * node via `sendBatch(arr)` in chunks of NODE_BATCH_LIMIT. Responses come back in request order, as an array.
 */
export async function answerBatch(msgs, special, sendBatch) {
  const out = new Array(msgs.length);
  const plain = [];
  await Promise.all(msgs.map(async (m, i) => {
    const r = special(m);
    if (r) out[i] = await r;
    else plain.push(i);
  }));
  for (let k = 0; k < plain.length; k += NODE_BATCH_LIMIT) {
    const idx = plain.slice(k, k + NODE_BATCH_LIMIT);
    const res = await sendBatch(idx.map((i) => msgs[i]));
    const arr = Array.isArray(res) ? res : [res];
    // the node answers in request order; a whole-chunk error (id null) is copied to each call with its own id
    idx.forEach((i, j) => (out[i] = arr.length === idx.length ? arr[j] : { jsonrpc: "2.0", id: msgs[i]?.id ?? null, error: arr[0]?.error ?? { code: -32603, message: "batch failed" } }));
  }
  return out;
}
