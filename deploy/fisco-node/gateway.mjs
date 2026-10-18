// Public face of the FISCO node on Railway (no dependencies).
//   POST /             JSON-RPC, forwarded to the node's web3 RPC on 127.0.0.1:8545 (CORS open: wallets and apps call it).
//                      eth_feeHistory is answered here: FISCO lacks it, and wallets (MetaMask, ethers, forge) need it for
//                      EIP-1559 fees. The chain's base fee and gas price are 0, so the honest history is all zeros.
//                      transactionIndex is repaired in responses: FISCO returns the hex of the ASCII text ("0x307830" for
//                      "0x0"), which overflows client number parsers (viem) and confuses wallets.
//   GET  /health       200 when the node answers eth_blockNumber
//                      chainbrain_getRevertData(txHash) is answered here: the web3 receipt of a reverted transaction carries
//                      no revert data, the node's native receipt does (status 16, output = the ABI-encoded error). The native
//                      RPC needs mutual TLS with the chain's SDK certs, which live in this container next to the node.
//   POST /admin/fund   {addresses: [...]}, Bearer FUND_TOKEN: credit native balance (the web3 RPC refuses senders with 0)
import { createServer } from "node:http";
import { request as httpsRequest } from "node:https";
import { readFileSync } from "node:fs";
import { execFile } from "node:child_process";

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

// the node's native JSON-RPC (mutual TLS) for a receipt's revert output
const SDK = `${process.env.FISCO_HOME ?? "/data/fisco"}/nodes/127.0.0.1/sdk`;
const NATIVE_PORT = Number(process.env.FISCO_NATIVE_PORT ?? 20200);
function nativeReceipt(hash) {
  return new Promise((ok, fail) => {
    const req = httpsRequest({ host: "127.0.0.1", port: NATIVE_PORT, method: "POST", path: "/", headers: { "content-type": "application/json" }, timeout: 10_000,
      ca: readFileSync(`${SDK}/ca.crt`), cert: readFileSync(`${SDK}/sdk.crt`), key: readFileSync(`${SDK}/sdk.key`), checkServerIdentity: () => undefined },
    (res) => { let t = ""; res.on("data", (c) => (t += c)); res.on("end", () => { try { ok(JSON.parse(t).result); } catch (e) { fail(e); } }); });
    req.on("error", fail);
    req.on("timeout", () => req.destroy(new Error("native RPC timeout")));
    req.end(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTransactionReceipt", params: ["group0", "", hash, false] }));
  });
}
async function revertData(id, [hash] = []) {
  if (typeof hash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(hash)) return { jsonrpc: "2.0", id, error: { code: -32602, message: "params: [txHash]" } };
  try {
    const r = await nativeReceipt(hash);
    return { jsonrpc: "2.0", id, result: r?.output && r.output !== "0x" ? r.output : "0x" };
  } catch (e) { return { jsonrpc: "2.0", id, error: { code: -32000, message: `native receipt: ${e.message}` } }; }
}

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

async function forward(body) {
  let msg;
  try { msg = JSON.parse(body); } catch { return null; } // let the node answer malformed JSON itself
  const one = async (m) => (m?.method === "eth_feeHistory" ? feeHistory(m.id, m.params ?? []) : m?.method === "chainbrain_getRevertData" ? revertData(m.id, m.params ?? []) : null);
  if (Array.isArray(msg)) {
    if (!msg.some((m) => m?.method === "eth_feeHistory" || m?.method === "chainbrain_getRevertData")) return null;
    const out = await Promise.all(msg.map(async (m) => (await one(m)) ?? repair(await rpc(JSON.stringify(m)).then((r) => r.json()))));
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
      return send(res, r.status, repaired(await r.text()));
    }
    send(res, 404, { error: "not found" });
  } catch (e) {
    send(res, 400, { error: String(e.message ?? e) });
  }
}).listen(PORT, "::", () => console.log(`gateway on [::]:${PORT} -> ${RPC}`));
