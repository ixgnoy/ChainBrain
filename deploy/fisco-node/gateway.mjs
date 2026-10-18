// Public face of the FISCO node on Railway (no dependencies).
//   POST /             JSON-RPC, forwarded to the node's web3 RPC on 127.0.0.1:8545 (CORS open: wallets and apps call it).
//                      eth_feeHistory is answered here: FISCO lacks it, and wallets (MetaMask, ethers, forge) need it for
//                      EIP-1559 fees. The chain's base fee and gas price are 0, so the honest history is all zeros.
//                      transactionIndex is repaired in responses: FISCO returns the hex of the ASCII text ("0x307830" for
//                      "0x0"), which overflows client number parsers (viem) and confuses wallets. A one-element batch is
//                      answered as an array again (FISCO unwraps it, which breaks batching clients such as viem), and a
//                      batch over the node's limit of 8 calls is split.
//                      eth_getLogs is answered here too (logs.mjs): FISCO rejects a filter without toBlock, address or
//                      topics, and silently drops logs from wide block ranges; logs.mjs scans in small windows, with limits.
//   GET  /health       200 when the node answers eth_blockNumber
//   POST /admin/fund   {addresses: [...]}, Bearer FUND_TOKEN: credit native balance (the web3 RPC refuses senders with 0)
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { makeGetLogs, MAX_LOGS_PER_BATCH, batchLimitError, rewrapBatch, answerBatch } from "./logs.mjs";

const RPC = "http://127.0.0.1:8545";
const PORT = Number(process.env.PORT ?? 8080);
const TOKEN = process.env.FUND_TOKEN ?? "";
const MAX_BODY = 1_000_000;
if (TOKEN.length < 24) throw new Error("FUND_TOKEN must be set (24+ chars)");

const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type", "access-control-allow-methods": "POST, GET, OPTIONS" };
const send = (res, code, body, type = "application/json") => { res.writeHead(code, { ...cors, "content-type": type }); res.end(typeof body === "string" ? body : JSON.stringify(body)); };
const readBody = (req) => new Promise((ok, fail) => {
  let n = 0; const parts = [];
  req.on("data", (c) => { n += c.length; if (n > MAX_BODY) { fail(new Error("body too large")); req.destroy(); } else parts.push(c); });
  req.on("end", () => ok(Buffer.concat(parts).toString("utf8")));
  req.on("error", fail);
});
const rpc = (body) => fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body });

const hex = (n) => "0x" + n.toString(16);
async function feeHistory(id, [count, newest, percentiles = []]) {
  const n = Math.max(1, Math.min(Number(count), 1024));
  let last = newest;
  if (typeof newest !== "string" || !newest.startsWith("0x")) last = (await rpc('{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}').then((r) => r.json())).result;
  const newestN = BigInt(last);
  const oldest = newestN - BigInt(n) + 1n < 0n ? 0n : newestN - BigInt(n) + 1n;
  const k = Number(newestN - oldest) + 1;
  return { jsonrpc: "2.0", id, result: {
    oldestBlock: hex(oldest), baseFeePerGas: Array(k + 1).fill("0x0"), gasUsedRatio: Array(k).fill(0),
    ...(percentiles.length ? { reward: Array(k).fill(percentiles.map(() => "0x0")) } : {}),
  } };
}
// "0x307830" -> "0x0": a hex string that decodes to printable "0x…" text is the ASCII-encoded index
function fixIndex(v) {
  if (typeof v !== "string" || !/^0x(3078)([0-9a-f]{2})+$/i.test(v)) return v;
  const text = Buffer.from(v.slice(2), "hex").toString("latin1");
  return /^0x[0-9a-fA-F]+$/.test(text) ? text : v;
}
function repair(x) {
  if (Array.isArray(x)) return x.map(repair);
  if (x && typeof x === "object") {
    for (const k of Object.keys(x)) x[k] = k === "transactionIndex" ? fixIndex(x[k]) : repair(x[k]);
  }
  return x;
}
const repaired = (text) => (text.includes("transactionIndex") ? JSON.stringify(repair(JSON.parse(text))) : text);

const getLogs = makeGetLogs((m) => rpc(JSON.stringify(m)).then((r) => r.json()), repair);

async function forward(body) {
  let msg;
  try { msg = JSON.parse(body); } catch { return null; } // let the node answer malformed JSON itself
  const one = async (m) =>
    m?.method === "eth_feeHistory" ? feeHistory(m.id, m.params ?? []) : m?.method === "eth_getLogs" ? getLogs(m.id, m.params ?? []) : null;
  if (Array.isArray(msg)) {
    // answered here: fee history, getLogs (at most MAX_LOGS_PER_BATCH), and batches the node would refuse (over 8 calls)
    if (msg.length <= 8 && !msg.some((m) => m?.method === "eth_feeHistory" || m?.method === "eth_getLogs")) return null;
    let logs = 0;
    const special = (m) => (m?.method === "eth_getLogs" && ++logs > MAX_LOGS_PER_BATCH ? Promise.resolve(batchLimitError(m.id)) : one(m));
    const out = await answerBatch(msg, special, (arr) => rpc(JSON.stringify(arr)).then((r) => r.json()).then(repair));
    return JSON.stringify(out);
  }
  const r = await one(msg);
  return r && JSON.stringify(r);
}

// fund.sh drives the FISCO console (a JVM): one at a time
let queue = Promise.resolve();
const fund = (addresses) => (queue = queue.then(() => new Promise((ok) =>
  execFile("bash", ["/app/scripts/fisco/fund.sh", ...addresses], { timeout: 120_000 }, (err, stdout, stderr) => ok({ ok: !err, out: (stdout + stderr).trim() })))));

createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") return send(res, 204, "");
    if (req.method === "GET" && req.url === "/health") {
      const r = await rpc('{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}').then((x) => x.json()).catch(() => null);
      return r?.result ? send(res, 200, { ok: true, block: parseInt(r.result, 16) }) : send(res, 503, { ok: false });
    }
    if (req.method === "POST" && req.url === "/admin/fund") {
      if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(res, 401, { error: "unauthorized" });
      const { addresses } = JSON.parse(await readBody(req));
      if (!Array.isArray(addresses) || !addresses.length || addresses.length > 20 || !addresses.every((a) => /^0x[0-9a-fA-F]{40}$/.test(a)))
        return send(res, 400, { error: "addresses: 1-20 hex addresses" });
      const r = await fund(addresses);
      return send(res, r.ok ? 200 : 500, r);
    }
    if (req.method === "POST" && (req.url === "/" || req.url === "")) {
      const body = await readBody(req);
      const local = await forward(body);
      if (local) return send(res, 200, local);
      const r = await rpc(body);
      return send(res, r.status, rewrapBatch(body, repaired(await r.text())));
    }
    send(res, 404, { error: "not found" });
  } catch (e) {
    send(res, 400, { error: String(e.message ?? e) });
  }
}).listen(PORT, "::", () => console.log(`gateway on [::]:${PORT} -> ${RPC}`));
