import { Hono } from "hono";
import { readFileSync } from "node:fs";
import { decodeEventLog, formatEther, hexToBigInt, hexToString, isAddress, isHash, toHex, type Abi, type Address, type Hex, type Log } from "viem";
import { pub, pocketAbi, factoryAbi, erc20Abi, factoryAddress } from "./wallet/chain";
import { cfg } from "./chains";
import { directory } from "./wallet/directory";
import { agentAccount } from "./wallet/pay";
import { toJson } from "./wallet/events";
import { formatAmount } from "./wallet/money";

/** Read-only block explorer for the local FISCO chain: no indexer, everything is read from the node on request. */
const tokenAbi = JSON.parse(readFileSync(new URL("../../contracts/out/MockEHKD.sol/MockEHKD.json", import.meta.url), "utf8")).abi as Abi;
const ABIS = [tokenAbi, factoryAbi as Abi, pocketAbi as Abi];
// ponytail: address activity scans the latest SCAN blocks; add an indexer (or Blockscout) if the chain grows past that.
const SCAN = 300;

const json = (c: any, v: unknown, status = 200) => c.body(toJson(v), status, { "content-type": "application/json" });

function decode(log: Log) {
  for (const abi of ABIS) {
    try {
      const d = decodeEventLog({ abi, data: log.data, topics: log.topics as any });
      return { address: log.address, event: d.eventName, args: d.args };
    } catch { /* not this ABI */ }
  }
  return { address: log.address, event: null, topics: log.topics, data: log.data };
}

async function labels(): Promise<Record<string, string>> {
  const l: Record<string, string> = { [cfg().token.toLowerCase()]: "Mock e-HKD token", [agentAccount().address.toLowerCase()]: "Agent key" };
  try { l[factoryAddress().toLowerCase()] = "Pocket factory"; } catch { /* no factory yet */ }
  for (const s of await directory().catch(() => [])) l[s.payTo.toLowerCase()] = `Seller: ${s.name}`;
  return l;
}

const blockSummary = (b: any) => ({ number: b.number, hash: b.hash, timestamp: b.timestamp, txs: b.transactions.length });
// FISCO's full tx objects carry fields (on console/precompiled txs) that overflow viem's formatter: read raw, keep what we show.
const rawTx = (t: any) => ({ hash: t.hash as Hex, from: t.from as Address, to: (t.to ?? null) as Address | null, nonce: t.nonce ? hexToBigInt(t.nonce) : null, input: t.input as Hex });
async function rawBlock(n: bigint) {
  const b: any = await pub().request({ method: "eth_getBlockByNumber", params: [toHex(n), true] } as any);
  return b && { number: hexToBigInt(b.number), hash: b.hash as Hex, parentHash: b.parentHash as Hex, timestamp: hexToBigInt(b.timestamp), transactions: (b.transactions ?? []).map(rawTx) };
}

export function explorerRoutes() {
  const app = new Hono();
  const c0 = () => pub();

  app.get("/api/explorer/summary", async (c) => {
    const [latest, supply] = await Promise.all([
      c0().getBlockNumber(),
      c0().readContract({ address: cfg().token, abi: tokenAbi, functionName: "totalSupply" }).catch(() => null),
    ]);
    return json(c, { chain: cfg().key, chainId: cfg().chain.id, latest, token: cfg().token, tokenSupply: supply === null ? null : formatAmount(supply as bigint), labels: await labels() });
  });

  app.get("/api/explorer/blocks", async (c) => {
    const latest = await c0().getBlockNumber();
    const from = c.req.query("before") ? BigInt(c.req.query("before")!) - 1n : latest;
    const n = Math.min(Number(c.req.query("limit") ?? 15), 50);
    const nums = [...Array(n).keys()].map((i) => from - BigInt(i)).filter((x) => x >= 0n);
    return json(c, (await Promise.all(nums.map((blockNumber) => c0().getBlock({ blockNumber })))).map(blockSummary));
  });

  app.get("/api/explorer/block/:n", async (c) => {
    const n = c.req.param("n");
    if (!/^\d+$/.test(n)) return json(c, { error: "BAD_BLOCK" }, 400);
    const b = await rawBlock(BigInt(n)).catch(() => undefined);
    if (!b) return json(c, { error: "NOT_FOUND" }, 404);
    return json(c, { ...blockSummary(b), parentHash: b.parentHash, transactions: b.transactions.map(({ hash, from, to }: any) => ({ hash, from, to })) });
  });

  app.get("/api/explorer/tx/:hash", async (c) => {
    const hash = c.req.param("hash");
    if (!isHash(hash)) return json(c, { error: "BAD_HASH" }, 400);
    const [tx, rc] = await Promise.all([
      c0().request({ method: "eth_getTransactionByHash", params: [hash] } as any).then((t: any) => t && rawTx(t)).catch(() => undefined),
      c0().getTransactionReceipt({ hash: hash as Hex }).catch(() => undefined),
    ]);
    if (!tx || !rc) return json(c, { error: "NOT_FOUND" }, 404);
    const block = await c0().getBlock({ blockNumber: rc.blockNumber });
    return json(c, {
      hash, status: rc.status, blockNumber: rc.blockNumber, timestamp: block.timestamp, from: tx.from, to: tx.to, contractAddress: rc.contractAddress,
      nonce: tx.nonce, input: tx.input, gasUsed: rc.gasUsed, logs: rc.logs.map(decode),
    });
  });

  app.get("/api/explorer/address/:a", async (c) => {
    const a = c.req.param("a");
    if (!isAddress(a)) return json(c, { error: "BAD_ADDRESS" }, 400);
    const address = a as Address;
    const [native, token, code, nonce, latest] = await Promise.all([
      c0().getBalance({ address }), c0().readContract({ address: cfg().token, abi: erc20Abi, functionName: "balanceOf", args: [address] }).catch(() => 0n),
      c0().getCode({ address }), c0().getTransactionCount({ address }), c0().getBlockNumber(),
    ]);
    // FISCO reports accounts it tracks (balance, nonce) with pseudo-code "[PRECOMPILED],…,/usr/<addr>": not a contract
    const isContract = !!code && code.length > 2 && !hexToString(code).startsWith("[PRECOMPILED]");
    const pocket = isContract
      ? await Promise.all(["owner", "agent", "perPaymentCap", "askAbove", "expiresAt", "revoked"].map((functionName) => c0().readContract({ address, abi: pocketAbi, functionName } as any)))
          .then(([owner, agent, cap, askAbove, expiresAt, revoked]) => ({ owner, agent, cap: formatAmount(cap as bigint), askAbove: askAbove as bigint, expiresAt, revoked }))
          .catch(() => null)
      : null;
    const low = address.toLowerCase();
    const first = latest > BigInt(SCAN) ? latest - BigInt(SCAN) : 0n;
    const blocks = await Promise.all([...Array(Number(latest - first) + 1).keys()].map((i) => rawBlock(first + BigInt(i))));
    const txs = blocks.reverse().flatMap((b: any) => b.transactions.filter((t: any) => t.from?.toLowerCase() === low || t.to?.toLowerCase() === low)
      .map((t: any) => ({ hash: t.hash, block: b.number, timestamp: b.timestamp, from: t.from, to: t.to })));
    return json(c, {
      address, label: (await labels())[low] ?? null, native: formatEther(native), eHKD: formatAmount(token as bigint), isContract,
      nonce, pocket, scannedFrom: first, txs: txs.slice(0, 50),
    });
  });

  app.get("/explorer", (c) => c.html(PAGE));
  // MetaMask builds explorer links as <explorer>/tx/<hash> and <explorer>/address/<addr>
  app.get("/explorer/:kind{tx|address|block}/:id", (c) => c.redirect(`/explorer#/${c.req.param("kind")}/${encodeURIComponent(c.req.param("id"))}`));
  return app;
}

const PAGE = /* html */ `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>ChainBrain Explorer</title>
<style>
:root{--bg:#f6f7f6;--card:#fff;--text:#111714;--muted:#5f6b65;--line:#e3e8e5;--accent:#0b7a55;--accent-soft:#e3f3ec;--danger:#b42318;--mono:ui-monospace,SFMono-Regular,Menlo,monospace}
@media (prefers-color-scheme:dark){:root{--bg:#0d110f;--card:#141a17;--text:#e8eeea;--muted:#93a29a;--line:#24302a;--accent:#3ccf91;--accent-soft:#16291f;--danger:#f97066}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
header{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;padding:16px;max-width:1100px;margin:0 auto}
h1{font-size:18px;margin:0}h1 span{color:var(--accent)}h2{font-size:16px;margin:0 0 12px}
form{display:flex;gap:8px;flex:1;max-width:560px}input{flex:1;min-width:0;padding:10px 14px;border-radius:999px;border:1px solid var(--line);background:var(--card);color:var(--text);font:inherit}
button{padding:10px 16px;border-radius:999px;border:0;background:var(--accent);color:#fff;font:inherit;font-weight:600;cursor:pointer}
main{max-width:1100px;margin:0 auto;padding:0 16px 32px;display:grid;gap:16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px;overflow-x:auto}
.note{color:var(--muted);font-size:13px}.mono{font-family:var(--mono);font-size:13px;word-break:break-all}
table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:8px 6px;border-top:1px solid var(--line);vertical-align:top}th{color:var(--muted);font-weight:500;font-size:13px}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
.badge{display:inline-block;padding:1px 10px;border-radius:999px;background:var(--accent-soft);color:var(--accent);font-size:12px;font-weight:600}.bad{background:transparent;color:var(--danger);border:1px solid var(--danger)}
dl{display:grid;grid-template-columns:max-content 1fr;gap:6px 16px;margin:0}dt{color:var(--muted)}dd{margin:0}
</style></head><body>
<header><h1>链AI脑 ChainBrain <span>Explorer</span></h1>
<form id="q"><input id="s" placeholder="Tx hash, address or block number" autocomplete="off" aria-label="Search"><button>Search</button></form></header>
<main id="m"><p class="note">Loading…</p></main>
<script>
const $=(s)=>document.querySelector(s), m=$("#m"); let L={};
const esc=(s)=>String(s??"").replace(/[&<>"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
const short=(h)=>h?esc(h.slice(0,10)+"…"+h.slice(-6)):"";
const addr=(a)=>a?'<a class="mono" href="#/address/'+esc(a)+'">'+(L[a.toLowerCase()]?esc(L[a.toLowerCase()])+" ":"")+short(a)+"</a>":'<span class="note">contract creation</span>';
const tx=(h)=>'<a class="mono" href="#/tx/'+esc(h)+'">'+short(h)+"</a>";
const blk=(n)=>'<a href="#/block/'+esc(n)+'">'+esc(n)+"</a>";
const time=(t)=>new Date(Number(t)*1000).toLocaleString();
const get=async(p)=>{const r=await fetch(p);const j=await r.json();if(!r.ok)throw new Error(j.error||r.status);return j;};
const amount=(k,v)=>/^(value|amount)$/i.test(k)&&/^\\d+$/.test(String(v))?"HK$"+(Number(v)/1e6).toFixed(2):null;
const args=(a)=>Object.entries(a||{}).map(([k,v])=>"<div><span class=note>"+esc(k)+"</span> "+(typeof v==="string"&&/^0x[0-9a-fA-F]{40}$/.test(v)?addr(v):'<span class=mono>'+esc(amount(k,v)??v)+"</span>")+"</div>").join("");
async function home(){
  const [s,b]=await Promise.all([get("/api/explorer/summary"),get("/api/explorer/blocks")]); L=s.labels;
  m.innerHTML='<section class=card><h2>FISCO BCOS (local), chain id '+esc(s.chainId)+'</h2><dl><dt>Latest block</dt><dd>'+blk(s.latest)+'</dd><dt>Mock e-HKD</dt><dd>'+addr(s.token)+'</dd><dt>eHKD supply</dt><dd>HK$'+esc(s.tokenSupply)+'</dd></dl><p class=note>Mock e-HKD is a demo token on a local chain. It is not the HKMA e-HKD and not money.</p></section>'+
  '<section class=card><h2>Latest blocks</h2><table><tr><th>Block</th><th>Time</th><th>Txs</th><th>Hash</th></tr>'+b.map((x)=>"<tr><td>"+blk(x.number)+"</td><td>"+time(x.timestamp)+"</td><td>"+esc(x.txs)+"</td><td class=mono>"+short(x.hash)+"</td></tr>").join("")+"</table></section>";
}
async function showTx(h){
  const t=await get("/api/explorer/tx/"+h);
  m.innerHTML='<section class=card><h2>Transaction</h2><dl><dt>Hash</dt><dd class=mono>'+esc(t.hash)+'</dd><dt>Status</dt><dd><span class="badge '+(t.status==="success"?"":"bad")+'">'+esc(t.status)+'</span></dd><dt>Block</dt><dd>'+blk(t.blockNumber)+" ("+time(t.timestamp)+')</dd><dt>From</dt><dd>'+addr(t.from)+'</dd><dt>To</dt><dd>'+addr(t.to)+'</dd>'+(t.contractAddress?'<dt>Created</dt><dd>'+addr(t.contractAddress)+"</dd>":"")+'<dt>Nonce</dt><dd>'+esc(t.nonce)+'</dd><dt>Gas used</dt><dd>'+esc(t.gasUsed)+' (gas is free on this chain)</dd></dl></section>'+
  '<section class=card><h2>Events ('+t.logs.length+')</h2><table><tr><th>Event</th><th>Emitted by</th><th>Arguments</th></tr>'+t.logs.map((l)=>"<tr><td>"+esc(l.event??"(unknown)")+"</td><td>"+addr(l.address)+"</td><td>"+(l.event?args(l.args):'<span class=mono>'+esc(JSON.stringify(l.topics))+"</span>")+"</td></tr>").join("")+"</table></section>";
}
async function showAddr(a){
  const x=await get("/api/explorer/address/"+a);
  m.innerHTML='<section class=card><h2>'+(x.label?esc(x.label):x.pocket?"Pocket":x.isContract?"Contract":"Account")+'</h2><dl><dt>Address</dt><dd class=mono>'+esc(x.address)+'</dd><dt>Mock e-HKD</dt><dd>HK$'+esc(x.eHKD)+'</dd><dt>Native balance</dt><dd>'+esc(x.native)+' (only needs to be above 0 to send; gas is free)</dd><dt>Nonce</dt><dd>'+esc(x.nonce)+"</dd>"+
  (x.pocket?'<dt>Owner</dt><dd>'+addr(x.pocket.owner)+'</dd><dt>Agent</dt><dd>'+addr(x.pocket.agent)+'</dd><dt>Per-payment cap</dt><dd>HK$'+esc(x.pocket.cap)+'</dd><dt>Expires</dt><dd>'+time(x.pocket.expiresAt)+'</dd>'+(x.pocket.allowance?'<dt>Allowance</dt><dd>HK$'+esc(x.pocket.allowance.limit)+' per '+esc(x.pocket.allowance.per)+' (HK$'+esc(x.pocket.allowance.spentThisPeriod)+' spent this '+esc(x.pocket.allowance.per)+')</dd>':'')+'<dt>Frozen</dt><dd>'+esc(x.pocket.frozen)+'</dd><dt>Revoked</dt><dd>'+esc(x.pocket.revoked)+"</dd>":"")+"</dl></section>"+
  '<section class=card><h2>Transactions</h2><p class=note>From the latest blocks only (since block '+esc(x.scannedFrom)+').</p><table><tr><th>Tx</th><th>Block</th><th>From</th><th>To</th></tr>'+x.txs.map((t)=>"<tr><td>"+tx(t.hash)+"</td><td>"+blk(t.block)+"</td><td>"+addr(t.from)+"</td><td>"+addr(t.to)+"</td></tr>").join("")+"</table></section>";
}
async function showBlock(n){
  const b=await get("/api/explorer/block/"+n);
  m.innerHTML='<section class=card><h2>Block '+esc(b.number)+'</h2><dl><dt>Time</dt><dd>'+time(b.timestamp)+'</dd><dt>Hash</dt><dd class=mono>'+esc(b.hash)+'</dd><dt>Parent</dt><dd class=mono>'+esc(b.parentHash)+'</dd></dl></section><section class=card><h2>Transactions ('+b.transactions.length+')</h2><table><tr><th>Tx</th><th>From</th><th>To</th></tr>'+b.transactions.map((t)=>"<tr><td>"+tx(t.hash)+"</td><td>"+addr(t.from)+"</td><td>"+addr(t.to)+"</td></tr>").join("")+"</table></section>";
}
async function route(){
  const [,kind,id]=location.hash.split("/");
  try{ if(!Object.keys(L).length) L=(await get("/api/explorer/summary")).labels;
    if(kind==="tx")await showTx(id);else if(kind==="address")await showAddr(id);else if(kind==="block")await showBlock(id);else await home();
  }catch(e){m.innerHTML='<section class=card><p style="color:var(--danger)">'+esc(e.message)+'</p><a href="#/">Back to latest blocks</a></section>';}
}
$("#q").onsubmit=(e)=>{e.preventDefault();const v=$("#s").value.trim();location.hash=/^0x[0-9a-fA-F]{64}$/.test(v)?"#/tx/"+v:/^0x[0-9a-fA-F]{40}$/.test(v)?"#/address/"+v:/^\\d+$/.test(v)?"#/block/"+v:"#/";};
addEventListener("hashchange",route); route();
</script></body></html>`;
