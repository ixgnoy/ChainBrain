// Probe the FISCO node's quirks that the server's ledger module depends on, and print one finding per line.
//   tsx scripts/probe-fisco.ts                      local node (http://127.0.0.1:8545), dev OWNER key
//   FISCO_RPC=https://… PROBE_PK=0x… tsx …           another node; the write probes need a sender with native balance
//   FISCO_NATIVE_RPC=https://127.0.0.1:20200 FISCO_SDK_DIR=../.fisco/nodes/127.0.0.1/sdk   also try the native receipt
// Read-only probes always run. Write probes deploy a throwaway Mock e-HKD from the sender.
import { readFileSync } from "node:fs";
import { request } from "node:https";
import { createPublicClient, createWalletClient, http, publicActions, encodeFunctionData, decodeErrorResult, type Hex, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { fiscoChain } from "../src/chains";

const RPC = process.env.FISCO_RPC ?? "http://127.0.0.1:8545";
const PK = (process.env.PROBE_PK ?? "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80") as Hex; // Foundry dev key 0
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const out: Record<string, unknown> = {};
const note = (k: string, v: unknown) => { out[k] = v; console.log(`${k.padEnd(28)} ${typeof v === "string" ? v : JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x))}`); };
const raw = async (method: string, params: unknown[]) => {
  const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  return (await r.json()) as { result?: any; error?: { code: number; message: string; data?: unknown } };
};

const pc = createPublicClient({ chain: fiscoChain, transport: http(RPC) });
note("node", (await raw("web3_clientVersion", [])).result);

// 1. Does a block seal without transactions?
const b0 = await pc.getBlockNumber(); await sleep(6000); const b1 = await pc.getBlockNumber();
note("idle sealing (6 s)", b1 > b0 ? `yes: ${b0} -> ${b1}` : `no: stayed at ${b0} (blocks seal only on a transaction)`);

// 2. Timestamp unit of the head block
const head = await pc.getBlock();
const ts = Number(head.timestamp), now = Date.now();
note("head timestamp", `${ts} (${ts > 1e12 ? "milliseconds" : "seconds"}; head age ${Math.round((now - (ts > 1e12 ? ts : ts * 1000)) / 1000)} s)`);

// 3. Unsupported methods worth knowing
for (const m of ["eth_feeHistory", "eth_maxPriorityFeePerGas", "eth_gasPrice", "eth_estimateGas"]) {
  const r = await raw(m, m === "eth_feeHistory" ? ["0x1", "latest", []] : m === "eth_estimateGas" ? [{ to: "0x0000000000000000000000000000000000000000", data: "0x" }] : []);
  note(`method ${m}`, r.error ? `error ${r.error.code}: ${r.error.message}` : `ok ${JSON.stringify(r.result).slice(0, 60)}`);
}

// Write probes
const me = privateKeyToAccount(PK);
if ((await pc.getBalance({ address: me.address })) === 0n) {
  note("write probes", `skipped: ${me.address} has no native balance (scripts/fisco/fund.sh ${me.address})`);
} else {
  const w = createWalletClient({ account: me, chain: fiscoChain, transport: http(RPC) }).extend(publicActions);
  const t = JSON.parse(readFileSync(new URL("../../contracts/out/MockEHKD.sol/MockEHKD.json", import.meta.url), "utf8"));
  const abi = t.abi;
  const deployHash = await w.deployContract({ abi, bytecode: t.bytecode.object, args: [me.address] } as any);
  const token = (await w.waitForTransactionReceipt({ hash: deployHash })).contractAddress as Address;
  note("nonce source", `eth_getTransactionCount ${await pc.getTransactionCount({ address: me.address })} after deploy`);

  // 4. getLogs range limits (FISCO refuses a filter without an address)
  const latest = await pc.getBlockNumber();
  for (const [label, from, to] of [["0..latest", 0n, latest], ["0..latest+100000", 0n, latest + 100_000n], ["latest-50000..latest", latest > 50_000n ? latest - 50_000n : 0n, latest]] as const) {
    const r = await raw("eth_getLogs", [{ address: token, topics: [], fromBlock: `0x${from.toString(16)}`, toBlock: `0x${to.toString(16)}` }]);
    note(`getLogs ${label}`, r.error ? `error ${r.error.code}: ${r.error.message}` : `${r.result.length} logs`);
  }
  const asList = await raw("eth_getLogs", [{ address: [token], topics: [], fromBlock: "0x0", toBlock: "latest" }]);
  note("getLogs address as list", asList.error ? `error ${asList.error.code}: ${asList.error.message}` : `${asList.result.length} logs`);
  const noAddr = await raw("eth_getLogs", [{ topics: [], fromBlock: "0x0", toBlock: "latest" }]);
  note("getLogs without address", noAddr.error ? `error ${noAddr.error.code}: ${noAddr.error.message}` : `${noAddr.result.length} logs`);

  // 5. Do eth_call block tags select historical state?
  const before = await pc.getBlockNumber();
  await w.waitForTransactionReceipt({ hash: await w.writeContract({ address: token, abi, functionName: "mint", args: [me.address, 5_000_000n] } as any) });
  const atBefore = await pc.readContract({ address: token, abi, functionName: "balanceOf", args: [me.address], blockNumber: before } as any);
  const atLatest = await pc.readContract({ address: token, abi, functionName: "balanceOf", args: [me.address] } as any);
  note("eth_call block tag", atBefore === atLatest ? `IGNORED: balance at block ${before} reads ${atBefore} = latest` : `honoured: ${atBefore} at ${before}, ${atLatest} at latest`);

  // 5b. getLogs after a mint: which topic shapes return the Transfer log?
  const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  for (const [label, topics] of [["topics []", []], ["topics [Transfer]", [TRANSFER]], ["topics [null]", [null]], ["topics omitted", undefined]] as const) {
    const r = await raw("eth_getLogs", [{ address: token, ...(topics ? { topics } : {}), fromBlock: `0x${before.toString(16)}`, toBlock: "latest" }]);
    note(`getLogs mint ${label}`, r.error ? `error ${r.error.code}: ${r.error.message}` : `${r.result.length} logs`);
  }
  const wide = await raw("eth_getLogs", [{ address: token, topics: [TRANSFER], fromBlock: "0x0", toBlock: `0x${(latest + 1_000_000n).toString(16)}` }]);
  const one = await raw("eth_getLogs", [{ address: token, topics: [TRANSFER], fromBlock: "0x1", toBlock: "latest" }]);
  note("getLogs 1..latest [Transfer]", one.error ? `error ${one.error.code}: ${one.error.message}` : `${one.result.length} logs`);
  const oneWide = await raw("eth_getLogs", [{ address: token, topics: [TRANSFER], fromBlock: "0x1", toBlock: `0x${(latest + 1_000_000n).toString(16)}` }]);
  note("getLogs 1..latest+1e6 [Transfer]", oneWide.error ? `error ${oneWide.error.code}: ${oneWide.error.message}` : `${oneWide.result.length} logs`);
  const earliest = await raw("eth_getLogs", [{ address: token, topics: [TRANSFER], fromBlock: "earliest", toBlock: "latest" }]);
  note("getLogs earliest..latest", earliest.error ? `error ${earliest.error.code}: ${earliest.error.message}` : `${earliest.result.length} logs`);
  note("getLogs 0..latest+1e6 [Transfer]", wide.error ? `error ${wide.error.code}: ${wide.error.message}` : `${wide.result.length} logs`);

  // 6. Revert data from eth_call
  const badData = encodeFunctionData({ abi, functionName: "transfer", args: ["0x000000000000000000000000000000000000dEaD", 10n ** 18n] });
  const call = await raw("eth_call", [{ from: me.address, to: token, data: badData }, "latest"]);
  let decoded = "";
  const data = (call.error as any)?.data as Hex | undefined;
  if (data && /^0x[0-9a-f]{8}/i.test(data)) try { const e = decodeErrorResult({ abi, data }); decoded = `${e.errorName}(${e.args?.join(", ")})`; } catch { decoded = "undecodable"; }
  note("eth_call revert", call.error ? `error ${call.error.code} "${call.error.message}" data=${data ?? "none"} ${decoded}` : `no error?! ${call.result}`);

  // 7. A reverting transaction: mined with status 0, or refused by the pool? Does the receipt carry revert data?
  let revertHash: Hex | undefined;
  try {
    revertHash = await w.sendTransaction({ to: token, data: badData, gas: 300_000n, gasPrice: 0n, type: "legacy" } as any);
    await w.waitForTransactionReceipt({ hash: revertHash }).catch(() => {});
    const rc = await raw("eth_getTransactionReceipt", [revertHash]);
    note("reverted tx", `mined: status ${rc.result?.status}, gasUsed ${rc.result?.gasUsed}, extra receipt keys: ${Object.keys(rc.result ?? {}).filter((k) => !["blockHash", "blockNumber", "contractAddress", "cumulativeGasUsed", "effectiveGasPrice", "from", "gasUsed", "logs", "logsBloom", "status", "to", "transactionHash", "transactionIndex", "type"].includes(k)).join(",") || "none"}`);
    note("reverted tx hash", revertHash);
    const tx = await raw("eth_getTransactionByHash", [revertHash]);
    note("tx transactionIndex", tx.result?.transactionIndex);
  } catch (e: any) {
    note("reverted tx", `refused at send: ${String(e.shortMessage ?? e.message).split("\n")[0]}`);
  }

  // 8. Native receipt (mutual TLS) carries the revert output?
  if (revertHash && process.env.FISCO_NATIVE_RPC) {
    const dir = process.env.FISCO_SDK_DIR ?? new URL("../../.fisco/nodes/127.0.0.1/sdk/", import.meta.url).pathname;
    const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTransactionReceipt", params: ["group0", "", revertHash, false] });
    const res = await new Promise<string>((ok, fail) => {
      const u = new URL(process.env.FISCO_NATIVE_RPC!);
      const req = request({ host: u.hostname, port: u.port, method: "POST", path: "/", headers: { "content-type": "application/json" },
        ca: readFileSync(`${dir}/ca.crt`), cert: readFileSync(`${dir}/sdk.crt`), key: readFileSync(`${dir}/sdk.key`), checkServerIdentity: () => undefined }, (r) => {
        let s = ""; r.on("data", (c) => (s += c)); r.on("end", () => ok(s));
      });
      req.on("error", fail); req.end(body);
    }).catch((e) => `error: ${e.message}`);
    try {
      const r = JSON.parse(res).result;
      let dec = "";
      try { const e = decodeErrorResult({ abi, data: r.output }); dec = `${e.errorName}(${e.args?.join(", ")})`; } catch {}
      note("native receipt", `status ${r.status}, output ${String(r.output).slice(0, 74)}… ${dec}`);
    } catch { note("native receipt", res.slice(0, 160)); }
  }

  // 8b. Which clock does eth_call see? A 9-byte contract that returns block.timestamp
  const clock = (await w.waitForTransactionReceipt({ hash: await w.sendTransaction({ data: "0x600980600b6000396000f34260005260206000f3", gas: 100_000n, gasPrice: 0n, type: "legacy" } as any) })).contractAddress as Address;
  const t1 = BigInt((await raw("eth_call", [{ to: clock, data: "0x" }, "latest"])).result); await sleep(3000);
  const t2 = BigInt((await raw("eth_call", [{ to: clock, data: "0x" }, "latest"])).result);
  const hb = await pc.getBlock();
  note("eth_call block.timestamp", `${t1} then ${t2} 3 s later (${t1 === t2 ? "frozen at the head block" : "moves"}; head ts ${hb.timestamp} s; wall ${Math.floor(Date.now() / 1000)} s; EVM unit ${t1 > 10n ** 12n ? "ms" : "s"})`);

  // 9. Same sender, three transactions in flight at once (sequential nonces, no waiting)
  const n0 = await pc.getTransactionCount({ address: me.address });
  const sends = await Promise.allSettled([0, 1, 2].map((i) =>
    w.sendTransaction({ to: token, data: encodeFunctionData({ abi, functionName: "mint", args: [me.address, 1n] }), gas: 200_000n, gasPrice: 0n, type: "legacy", nonce: n0 + i } as any)));
  const hashes = sends.filter((s) => s.status === "fulfilled").map((s) => (s as PromiseFulfilledResult<Hex>).value);
  const rcs = await Promise.allSettled(hashes.map((h) => w.waitForTransactionReceipt({ hash: h, timeout: 20_000 })));
  await sleep(1500);
  note("count after 3 in flight", `${await pc.getTransactionCount({ address: me.address })} (sent ${n0}..${n0 + 2}, so ${n0 + 3} is exact)`);
  note("3 in flight, one sender", `${hashes.length}/3 accepted, ${rcs.filter((r) => r.status === "fulfilled" && r.value.status === "success").length} mined ok; refusals: ${sends.filter((s) => s.status === "rejected").map((s) => String((s as any).reason.details ?? (s as any).reason.shortMessage)).join(" | ") || "none"}`);

  // 10. Nonce rules: an old nonce, then a gapped one
  await sleep(1500);
  const again = await w.sendTransaction({ to: token, data: encodeFunctionData({ abi, functionName: "mint", args: [me.address, 1n] }), gas: 200_000n, gasPrice: 0n, type: "legacy", nonce: n0 } as any).then(
    async (h) => `accepted ${(await w.waitForTransactionReceipt({ hash: h, timeout: 20_000 })).status}`, (e) => `refused: ${e.details ?? e.shortMessage}`);
  note("old nonce reused", again);
  const cnt = await pc.getTransactionCount({ address: me.address });
  const gap = await w.sendTransaction({ to: me.address, value: 0n, gas: 50_000n, gasPrice: 0n, type: "legacy", nonce: cnt + 500 } as any).then(
    async (h) => `accepted ${(await w.waitForTransactionReceipt({ hash: h, timeout: 20_000 })).status}; count now ${await pc.getTransactionCount({ address: me.address })}`, (e) => `refused: ${e.details ?? e.shortMessage}`);
  note("nonce count+500", gap);
  const below = await w.sendTransaction({ to: me.address, value: 0n, gas: 50_000n, gasPrice: 0n, type: "legacy", nonce: cnt + 10 } as any).then(() => "accepted", (e) => `refused: ${e.details ?? e.shortMessage}`);
  note("nonce below the max used", below);
}
