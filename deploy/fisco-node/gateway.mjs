// Public face of the FISCO node on Railway (no dependencies).
//   POST /             JSON-RPC, forwarded to the node's web3 RPC on 127.0.0.1:8545 (CORS open: wallets and apps call it)
//   GET  /health       200 when the node answers eth_blockNumber
//   POST /admin/fund   {addresses: [...]}, Bearer FUND_TOKEN: credit native balance (the web3 RPC refuses senders with 0)
import { createServer } from "node:http";
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
      const r = await rpc(await readBody(req));
      return send(res, r.status, await r.text());
    }
    send(res, 404, { error: "not found" });
  } catch (e) {
    send(res, 400, { error: String(e.message ?? e) });
  }
}).listen(PORT, "::", () => console.log(`gateway on [::]:${PORT} -> ${RPC}`));
